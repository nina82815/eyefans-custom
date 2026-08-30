#!/usr/bin/env python3
"""Prepare eYeFANS right-45-degree simulator photo assets.

The active solid-colour sources share one camera registration.  This script
mirrors them, removes the photographed eYeFANS mark with colour-calibrated
brush reconstruction, and writes a common 1643x686 tagged-sRGB canvas.

The tortoiseshell source is normalized independently.  The final 22-colour
anti-blue-light set is resized onto the same registered canvas and clipped by
the photographed lens apertures, so switching lenses never changes the frame
or temple geometry.
"""

from __future__ import annotations

import argparse
from collections import deque
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageFont, ImageOps


CANVAS = (1643, 686)

# Public simulator names -> source filename and stable ASCII asset name.
SOLID_SOURCES = {
    "櫻花粉": ("圓框＿櫻花＿側2026.png", "sakura-pink.png"),
    "粉紫": ("圓框＿粉紫＿側2026.png", "powder-purple.png"),
    "暖黃": ("圓框＿暖黃＿側2026.png", "warm-yellow.png"),
    "豆綠": ("圓框＿豆綠＿側2026.png", "pea-green.png"),
    "深藍": ("圓框＿深藍＿側2026.png", "deep-blue.png"),
    "復刻粉": ("圓框＿復刻粉＿側2026.png", "retro-pink.png"),
    "芋頭紫": ("圓框＿芋頭＿側2026.png", "taro-purple.png"),
    "奶油黃": ("圓框＿奶油＿側2026.png", "butter-yellow.png"),
    "薄荷綠": ("圓框＿薄荷＿側2026.png", "mint-green.png"),
    "丹寧藍": ("圓框＿丹寧＿側2026.png", "denim-blue.png"),
    "梅子": ("圓框＿梅子＿側2026.png", "plum.png"),
    "奶茶": ("圓框＿奶茶＿側2026.png", "milk-tea.png"),
    "青釉綠": ("圓框＿青釉＿側2026.png", "celadon-green.png"),
    "天藍": ("圓框＿天藍＿側2026.png", "sky-blue.png"),
    "玫瑰": ("圓框＿玫瑰＿側2026.png", "rose.png"),
    "咖啡牛奶": ("圓框＿咖牛＿側2026.png", "coffee-milk.png"),
    "枯黃": ("圓框＿枯黃＿側2026.png", "withered-yellow.png"),
    "霧面黑": ("圓框＿黑＿側2026.png", "matte-black.png"),
    "灰色": ("圓框＿灰＿側2026.png", "gray.png"),
    "咖啡紅茶": ("圓框＿紅茶＿側2026.png", "coffee-black-tea.png"),
    "霧面白": ("圓框＿白＿側2026.png", "matte-white.png"),
}

BLUE_LIGHT_FINAL_FILES = {
    colour: output_name
    for colour, (_, output_name) in SOLID_SOURCES.items()
}
BLUE_LIGHT_FINAL_FILES["琥珀"] = "amber.png"

BLUE_LIGHT_SOURCES = {
    "霧面黑": ("抗藍光＿圓框＿黑＿側.png", "matte-black.png", "solid"),
    "咖啡牛奶": ("抗藍光＿圓框＿咖啡牛奶＿側2026.png", "coffee-milk.png", "solid"),
    "奶茶": ("抗藍光＿圓框＿奶茶＿側2026.png", "milk-tea.png", "solid"),
    "琥珀": ("抗藍光＿圓框＿琥珀＿側.png", "amber.png", "amber"),
}

# Ellipses are (cx, cy, rx, ry, clockwise degrees).  Source coordinates are
# measured after mirroring.  Target coordinates follow the final grey bases.
BLUE_SOURCE_LENSES = {
    "solid": {
        "near": (955.0, 357.0, 226.0, 282.0, -2.0),
        "far": (1450.0, 350.0, 112.0, 242.0, -1.0),
    },
    "amber": {
        "near": (936.0, 367.0, 225.0, 281.0, 2.0),
        "far": (1452.0, 353.0, 112.0, 235.0, 2.0),
    },
}

BLUE_TARGET_LENSES = {
    "solid": {
        "near": (928.0, 336.0, 224.0, 263.0, -2.5),
        "far": (1475.0, 342.0, 112.0, 222.0, -1.8),
    },
    "amber": {
        "near": (958.0, 326.0, 231.0, 265.0, 0.0),
        "far": (1460.0, 322.0, 110.0, 218.0, 1.5),
    },
}

# The standard cutouts all share this small transparent scar on the bridge.
# It is the exposed end of the other temple in the original photograph, not a
# product opening.  The production composite intentionally reconstructs the
# plastic surface so that changing the temple colour cannot reveal it.
STANDARD_BRIDGE_REPAIR = (1206, 196, 1297, 238)

# Search regions used only to recover the photographed inner lens contours.
# Ellipses remain useful as a safe search fence and texture coordinate system;
# the final visible edge is always the raster mask extracted from the photo.
LENS_MASK_SEARCH = {
    "standard": {
        "near": (928.0, 346.0, 236.0, 290.0, -2.5),
        "far": (1475.0, 353.0, 126.0, 252.0, -1.8),
    },
    "amber": {
        "near": (955.0, 343.0, 238.0, 291.0, 0.0),
        "far": (1473.0, 350.0, 123.0, 252.0, 1.5),
    },
}


def srgb_profile() -> bytes:
    return ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


def rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def mirrored(path: Path) -> Image.Image:
    return ImageOps.mirror(rgba(path))


def feature_matrix(rgb: np.ndarray) -> np.ndarray:
    values = rgb.astype(np.float64) / 255.0
    r, g, b = values[:, 0], values[:, 1], values[:, 2]
    return np.column_stack((
        np.ones(len(values)), r, g, b,
        r * r, g * g, b * b, r * g, r * b, g * b,
    ))


def build_logo_mask(
    clean_pink: Image.Image,
    source_pink: Image.Image,
    clean_black: Image.Image,
    source_black: Image.Image,
) -> np.ndarray:
    """Recover the union of all pixels changed by the printed logo."""
    cp = np.asarray(clean_pink, dtype=np.int16)
    sp = np.asarray(source_pink, dtype=np.int16)
    cb = np.asarray(clean_black, dtype=np.int16)
    sb = np.asarray(source_black, dtype=np.int16)
    changed = (
        (np.max(np.abs(cp[:, :, :3] - sp[:, :, :3]), axis=2) > 2)
        | (np.max(np.abs(cb[:, :, :3] - sb[:, :, :3]), axis=2) > 2)
        | (np.abs(cp[:, :, 3] - sp[:, :, 3]) > 2)
        | (np.abs(cb[:, :, 3] - sb[:, :, 3]) > 2)
    )
    roi = np.zeros(changed.shape, dtype=bool)
    roi[105:301, 130:491] = True
    changed &= roi

    # A small dilation catches antialiased outline pixels without touching the
    # frame hinge.  Closing joins the letters into one brush region.
    mask_image = Image.fromarray((changed * 255).astype(np.uint8), "L")
    mask_image = mask_image.filter(ImageFilter.MaxFilter(5))
    mask_image = mask_image.filter(ImageFilter.MaxFilter(3))
    return np.asarray(mask_image) > 0


def fit_colour_map(reference: np.ndarray, target: np.ndarray, logo_mask: np.ndarray):
    h, w, _ = reference.shape
    train = np.zeros((h, w), dtype=bool)
    train[40:361, :620] = True
    train &= ~logo_mask
    train &= reference[:, :, 3] > 250
    train &= target[:, :, 3] > 250
    yy, xx = np.where(train)
    # A deterministic stride is enough for the smooth plastic colour mapping.
    yy, xx = yy[::4], xx[::4]
    x = feature_matrix(reference[yy, xx, :3])
    y = target[yy, xx, :3].astype(np.float64)
    coefficients, *_ = np.linalg.lstsq(x, y, rcond=None)
    predicted = np.clip(x @ coefficients, 0, 255)
    mae = float(np.mean(np.abs(predicted - y)))
    return coefficients, mae


def repair_solid_logo(
    source: Image.Image,
    clean_references: list[Image.Image],
    logo_mask: np.ndarray,
) -> tuple[Image.Image, dict]:
    source_array = np.asarray(source).copy()
    candidates = []
    for reference in clean_references:
        reference_array = np.asarray(reference)
        coefficients, mae = fit_colour_map(reference_array, source_array, logo_mask)
        candidates.append((mae, reference_array, coefficients))
    mae, reference_array, coefficients = min(candidates, key=lambda item: item[0])
    yy, xx = np.where(logo_mask & (source_array[:, :, 3] > 0))
    mapped = np.clip(
        feature_matrix(reference_array[yy, xx, :3]) @ coefficients,
        0,
        255,
    ).round().astype(np.uint8)
    source_array[yy, xx, :3] = mapped
    # Keep the source alpha byte-for-byte.  This is important at the temple edge.
    return Image.fromarray(source_array, "RGBA"), {
        "colourMapMae": round(mae, 4),
        "reference": "black" if np.mean(reference_array[:, :, :3]) < 70 else "pink",
    }


def repair_transparent_bridge(image: Image.Image) -> Image.Image:
    """Reconstruct the bridge where the opposite temple leaked through."""
    values = np.asarray(image).copy()
    x0, y0, x1, y1 = STANDARD_BRIDGE_REPAIR
    gap = np.zeros(values.shape[:2], dtype=bool)
    gap[y0:y1, x0:x1] = values[y0:y1, x0:x1, 3] < 250
    if not gap.any():
        return image

    # Fit a smooth quadratic plastic surface from the surrounding bridge.  A
    # two-dimensional fit avoids the vertical striping produced by per-column
    # interpolation while retaining each colour's actual photographed light.
    padding = 18
    sx0, sy0 = x0 - padding, y0 - padding
    sx1, sy1 = x1 + padding, y1 + padding
    sample = values[sy0:sy1, sx0:sx1]
    sample_y, sample_x = np.mgrid[sy0:sy1, sx0:sx1]
    valid = sample[:, :, 3] >= 250
    valid &= ~gap[sy0:sy1, sx0:sx1]
    nx = (sample_x - ((x0 + x1) / 2.0)) / max(1.0, x1 - x0)
    ny = (sample_y - ((y0 + y1) / 2.0)) / max(1.0, y1 - y0)
    features = np.stack((
        np.ones_like(nx), nx, ny, nx * nx, ny * ny, nx * ny,
    ), axis=-1)
    coefficients, *_ = np.linalg.lstsq(features[valid], sample[:, :, :3][valid], rcond=None)
    gap_y, gap_x = np.where(gap)
    gx = (gap_x - ((x0 + x1) / 2.0)) / max(1.0, x1 - x0)
    gy = (gap_y - ((y0 + y1) / 2.0)) / max(1.0, y1 - y0)
    gap_features = np.column_stack((
        np.ones(len(gap_x)), gx, gy, gx * gx, gy * gy, gx * gy,
    ))
    values[gap_y, gap_x, :3] = np.clip(gap_features @ coefficients, 0, 255).round().astype(np.uint8)
    values[gap_y, gap_x, 3] = 255
    return Image.fromarray(values, "RGBA")


def component_from_seed(candidate: np.ndarray, seed: tuple[int, int]) -> np.ndarray:
    """Return the eight-connected component that contains ``seed``."""
    height, width = candidate.shape
    sy, sx = seed
    if not candidate[sy, sx]:
        y0, y1 = max(0, sy - 32), min(height, sy + 33)
        x0, x1 = max(0, sx - 32), min(width, sx + 33)
        nearby_y, nearby_x = np.where(candidate[y0:y1, x0:x1])
        if not len(nearby_x):
            raise ValueError(f"No lens pixels near seed {seed}")
        distances = (nearby_y + y0 - sy) ** 2 + (nearby_x + x0 - sx) ** 2
        nearest = int(np.argmin(distances))
        sy, sx = int(nearby_y[nearest] + y0), int(nearby_x[nearest] + x0)

    result = np.zeros_like(candidate, dtype=bool)
    visited = np.zeros_like(candidate, dtype=bool)
    queue = deque([(sy, sx)])
    visited[sy, sx] = True
    neighbours = ((1, 0), (-1, 0), (0, 1), (0, -1),
                  (1, 1), (1, -1), (-1, 1), (-1, -1))
    while queue:
        y, x = queue.popleft()
        if not candidate[y, x]:
            continue
        result[y, x] = True
        for dy, dx in neighbours:
            yy, xx = y + dy, x + dx
            if 0 <= yy < height and 0 <= xx < width and not visited[yy, xx]:
                visited[yy, xx] = True
                if candidate[yy, xx]:
                    queue.append((yy, xx))
    return result


def fill_horizontal_spans(component: np.ndarray) -> np.ndarray:
    """Lens apertures are convex; fill small reflection/pattern notches by row."""
    filled = component.copy()
    for y in np.flatnonzero(component.any(axis=1)):
        xs = np.flatnonzero(component[y])
        if len(xs):
            filled[y, xs.min():xs.max() + 1] = True
    return filled


def make_lens_mask(image: Image.Image, profile: str) -> Image.Image:
    """Extract the two true photographed lens apertures as an L8 raster mask."""
    values = np.asarray(image)
    rgb = values[:, :, :3].astype(np.float64)
    alpha = values[:, :, 3]
    luminance = (rgb[:, :, 0] * 0.2126) + (rgb[:, :, 1] * 0.7152) + (rgb[:, :, 2] * 0.0722)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    yy, xx = np.mgrid[:values.shape[0], :values.shape[1]]
    combined = np.zeros(values.shape[:2], dtype=bool)

    for geometry in LENS_MASK_SEARCH[profile].values():
        cx, cy, rx, ry, angle = geometry
        theta = math.radians(angle)
        dx, dy = xx - cx, yy - cy
        u = ((math.cos(theta) * dx) + (math.sin(theta) * dy)) / rx
        v = ((-math.sin(theta) * dx) + (math.cos(theta) * dy)) / ry
        search_fence = ((u * u) + (v * v)) < (1.12 if profile == "standard" else 1.08)
        if profile == "standard":
            candidate = (luminance < 150) & (alpha > 220) & search_fence
        else:
            # Amber contains dark tortoiseshell marks.  Low chroma separates the
            # neutral lens from the warm frame before connectivity is applied.
            candidate = (luminance < 145) & (chroma < 32) & (alpha > 180) & search_fence
        component = component_from_seed(candidate, (int(round(cy)), int(round(cx))))
        combined |= fill_horizontal_spans(component)

    # One pixel of expansion covers the photographed pressure ring; the tiny
    # blur retains antialiasing without creating the old fuzzy colour boundary.
    mask = Image.fromarray((combined * 255).astype(np.uint8), "L")
    expansion = 3 if profile == "standard" else 5
    return mask.filter(ImageFilter.MaxFilter(expansion)).filter(ImageFilter.GaussianBlur(0.6))


def subtract_mask(full_mask: Image.Image, lens_mask: Image.Image) -> Image.Image:
    full = np.asarray(full_mask, dtype=np.float64) / 255.0
    lenses = np.asarray(lens_mask, dtype=np.float64) / 255.0
    return Image.fromarray(np.clip(full * (1.0 - lenses) * 255.0, 0, 255).round().astype(np.uint8), "L")


def ellipse_sample(
    source: np.ndarray,
    output: np.ndarray,
    source_ellipse: tuple[float, float, float, float, float],
    target_ellipse: tuple[float, float, float, float, float],
    target_mask: np.ndarray,
) -> None:
    scx, scy, srx, sry, sangle = source_ellipse
    tcx, tcy, trx, try_, tangle = target_ellipse
    xmin = max(0, int(math.floor(tcx - trx - 5)))
    xmax = min(output.shape[1], int(math.ceil(tcx + trx + 5)))
    ymin = max(0, int(math.floor(tcy - try_ - 5)))
    ymax = min(output.shape[0], int(math.ceil(tcy + try_ + 5)))
    yy, xx = np.mgrid[ymin:ymax, xmin:xmax]

    target_theta = math.radians(tangle)
    tx = xx - tcx
    ty = yy - tcy
    u = ((math.cos(target_theta) * tx) + (math.sin(target_theta) * ty)) / trx
    v = ((-math.sin(target_theta) * tx) + (math.cos(target_theta) * ty)) / try_
    radius2 = (u * u) + (v * v)
    visible_mask = target_mask[ymin:ymax, xmin:xmax].astype(np.float64) / 255.0
    inside = visible_mask > 0.0

    # The visible raster mask can extend slightly past the best-fit ellipse.
    # Clamp sampling to the inner 90% of the real source lens so the black
    # source frame and the opposite temple can never leak around the edge.
    radius = np.sqrt(np.maximum(radius2, 1e-8))
    radial_scale = np.minimum(1.0, 0.90 / radius)
    u *= radial_scale
    v *= radial_scale

    source_theta = math.radians(sangle)
    sx = scx + (math.cos(source_theta) * u * srx) - (math.sin(source_theta) * v * sry)
    sy = scy + (math.sin(source_theta) * u * srx) + (math.cos(source_theta) * v * sry)
    sx = np.clip(sx, 0, source.shape[1] - 1.001)
    sy = np.clip(sy, 0, source.shape[0] - 1.001)
    x0 = np.floor(sx).astype(np.int32)
    y0 = np.floor(sy).astype(np.int32)
    x1 = np.minimum(x0 + 1, source.shape[1] - 1)
    y1 = np.minimum(y0 + 1, source.shape[0] - 1)
    wx = (sx - x0)[..., None]
    wy = (sy - y0)[..., None]
    sample = (
        source[y0, x0, :3] * (1 - wx) * (1 - wy)
        + source[y0, x1, :3] * wx * (1 - wy)
        + source[y1, x0, :3] * (1 - wx) * wy
        + source[y1, x1, :3] * wx * wy
    )

    # The reference shoot used a warm tabletop light.  Retain the photographed
    # blue/purple chroma while strongly suppressing luminance bands caused by
    # the opposite temple.  This keeps the coating real without reproducing a
    # second solid temple inside the clear lens.
    core = inside & (radius2 < 0.72)
    median = np.median(sample[core], axis=0)
    neutral = np.array([211.0, 214.0, 222.0])
    gain = np.clip(neutral / np.maximum(median, 1.0), 0.72, 1.45)
    sample = np.clip(sample * gain, 0, 255)
    sample_luminance = (
        (sample[:, :, 0] * 0.2126)
        + (sample[:, :, 1] * 0.7152)
        + (sample[:, :, 2] * 0.0722)
    )
    chroma = sample - sample_luminance[:, :, None]
    chroma_image = Image.fromarray(np.clip(chroma + 128.0, 0, 255).astype(np.uint8), "RGB")
    smooth_chroma = (
        np.asarray(chroma_image.filter(ImageFilter.GaussianBlur(28)), dtype=np.float64) - 128.0
    )
    sample = neutral + (smooth_chroma * 0.72)
    sample = np.clip(sample, 0, 255)

    weight = visible_mask[:, :, None]
    target = output[ymin:ymax, xmin:xmax, :3].astype(np.float64)
    output[ymin:ymax, xmin:xmax, :3] = np.clip((sample * weight) + (target * (1.0 - weight)), 0, 255)
    output[ymin:ymax, xmin:xmax, 3] = np.maximum(
        output[ymin:ymax, xmin:xmax, 3],
        np.clip(visible_mask * 255.0, 0, 255),
    )


def make_blue_light_asset(source_path: Path, geometry: str, lens_mask: Image.Image) -> Image.Image:
    source = np.asarray(mirrored(source_path), dtype=np.float64)
    output = np.zeros((CANVAS[1], CANVAS[0], 4), dtype=np.float64)
    mask_array = np.asarray(lens_mask)
    for lens in ("near", "far"):
        ellipse_sample(
            source,
            output,
            BLUE_SOURCE_LENSES[geometry][lens],
            BLUE_TARGET_LENSES[geometry][lens],
            mask_array,
        )
    # The texture mapper only visits the two bounding ellipses; make the
    # authoritative raster aperture the final alpha so no edge pixel is lost.
    output[:, :, 3] = mask_array
    return Image.fromarray(np.clip(output, 0, 255).round().astype(np.uint8), "RGBA")


def normalized_blur(
    values: np.ndarray,
    support_mask: Image.Image,
    radius: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Blur values without allowing pixels outside support to bleed inward."""
    support = np.asarray(support_mask, dtype=np.float64) / 255.0
    numerator = Image.fromarray(
        np.clip(values * support, 0, 255).round().astype(np.uint8),
        "L",
    ).filter(ImageFilter.GaussianBlur(radius))
    denominator = support_mask.filter(ImageFilter.GaussianBlur(radius))
    denominator_array = np.asarray(denominator, dtype=np.float64) / 255.0
    return (
        np.asarray(numerator, dtype=np.float64) / np.maximum(denominator_array, 0.015),
        denominator_array,
    )


def make_final_blue_light_asset(
    source_path: Path,
    lens_mask: Image.Image,
    gray_base_path: Path,
) -> Image.Image:
    """Register a supplied colour-matched blue-light photo as lens-only RGBA.

    The supplied files have baked white, black, or checkerboard backgrounds.
    Only pixels inside the authoritative photographed apertures are retained;
    the surrounding frame and background can therefore never leak into mixed
    frame/temple combinations in the simulator.
    """
    source_image = Image.open(source_path).convert("RGB").resize(
        CANVAS,
        Image.Resampling.LANCZOS,
    )
    source = np.asarray(source_image, dtype=np.float64)
    gray_base = np.asarray(Image.open(gray_base_path).convert("RGB"), dtype=np.float64)

    # The supplied edit exports are RGB files: 21 contain a baked grey/white
    # checker and milk-tea contains a baked black background.  Sampling from a
    # mask eroded by ten pixels prevents either background (and any small
    # registration drift) from entering the authoritative lens apertures.
    support_mask = lens_mask.filter(ImageFilter.MinFilter(21))
    support = np.asarray(support_mask, dtype=np.float64) / 255.0

    source_luma = (
        (source[:, :, 0] * 0.2126)
        + (source[:, :, 1] * 0.7152)
        + (source[:, :, 2] * 0.0722)
    )
    smooth_luma, luma_weight = normalized_blur(source_luma, support_mask, 18)

    # Preserve the photographed champagne/reflection colour only at low
    # frequency.  The checker pattern is about 20 px per cell on the canonical
    # canvas, so a wider chroma blur removes it without changing the broad
    # coating band or the colour cast.
    smooth_chroma = []
    for channel in range(3):
        chroma = np.clip(source[:, :, channel] - source_luma + 128.0, 0, 255)
        channel_blur, _ = normalized_blur(chroma, support_mask, 24)
        smooth_chroma.append(channel_blur - 128.0)

    # Bring back restrained, colour-independent surface detail from the
    # matching canonical grey-lens photograph.  This avoids a plastic-looking
    # blur while never reintroducing the checker or black source background.
    gray_luma = (
        (gray_base[:, :, 0] * 0.2126)
        + (gray_base[:, :, 1] * 0.7152)
        + (gray_base[:, :, 2] * 0.0722)
    )
    gray_local, _ = normalized_blur(gray_luma, support_mask, 4)
    gray_detail = np.clip(gray_luma - gray_local, -18.0, 18.0)
    gray_detail = np.where(support > 0.98, gray_detail * 0.32, 0.0)

    clean_luma = smooth_luma + gray_detail
    output_rgb = np.stack(
        [clean_luma + smooth_chroma[channel] for channel in range(3)],
        axis=-1,
    )

    # Very weak normalized-blur weights occur only at the outside edge of the
    # eroded support.  Fill them with the median interior lens colour so that a
    # misregistered frame edge can never become a dark halo.
    interior = support > 0.98
    neutral = np.median(output_rgb[interior], axis=0)
    output_rgb[luma_weight < 0.035] = neutral

    output = np.zeros((CANVAS[1], CANVAS[0], 4), dtype=np.uint8)
    output[:, :, :3] = np.clip(output_rgb, 0, 255).round().astype(np.uint8)
    output[:, :, 3] = np.asarray(lens_mask, dtype=np.uint8)
    return Image.fromarray(output, "RGBA")


def save_png(image: Image.Image, destination: Path, *, dpi=(264, 264)) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(
        destination,
        format="PNG",
        optimize=True,
        dpi=dpi,
        icc_profile=srgb_profile(),
    )


def make_contact_sheet(entries: list[tuple[str, Path]], destination: Path) -> None:
    thumb_w, thumb_h = 410, 172
    label_h = 24
    columns = 4
    rows = math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (thumb_w * columns, (thumb_h + label_h) * rows), "#efede7")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, path) in enumerate(entries):
        image = rgba(path)
        preview = Image.new("RGBA", image.size, "white")
        preview.alpha_composite(image)
        preview.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = (index % columns) * thumb_w
        y = (index // columns) * (thumb_h + label_h)
        sheet.paste(preview.convert("RGB"), (x, y))
        draw.text((x + 8, y + thumb_h + 4), label, fill="#163c34", font=font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, quality=92, subsampling=0)


def make_blue_light_contact_sheet(
    entries: list[tuple[str, Path, Path, str]],
    masks: dict[str, dict[str, Image.Image]],
    destination: Path,
) -> None:
    """Render the same layer order the simulator uses for visual QA."""
    thumb_w, thumb_h = 410, 172
    label_h = 24
    columns = 4
    rows = math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (thumb_w * columns, (thumb_h + label_h) * rows), "#efede7")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, gray_path, blue_path, profile) in enumerate(entries):
        composite = Image.new("RGBA", CANVAS, "#f6f2ea")
        gray = rgba(gray_path)
        temple = gray.copy()
        temple.putalpha(masks[profile]["temple"])
        frame = gray.copy()
        frame.putalpha(masks[profile]["frame-shell"])
        composite.alpha_composite(temple)
        composite.alpha_composite(rgba(blue_path))
        composite.alpha_composite(frame)
        composite.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = (index % columns) * thumb_w
        y = (index // columns) * (thumb_h + label_h)
        sheet.paste(composite.convert("RGB"), (x, y))
        draw.text((x + 8, y + thumb_h + 4), label, fill="#163c34", font=font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, quality=94, subsampling=0)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=Path.home() / "Downloads")
    parser.add_argument("--clean-dir", type=Path, default=Path.home() / "Desktop")
    parser.add_argument(
        "--amber-patch",
        type=Path,
        default=Path("/private/tmp/amber-gen-patch.png"),
        help="Mirrored, logo-repaired tortoiseshell RGBA source.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets/photos/right-a45/normalized",
    )
    parser.add_argument(
        "--blue-light-dir",
        type=Path,
        default=(
            Path(__file__).resolve().parents[1]
            / "deliverables/eyefans-right-45-blue-light-22colors"
        ),
        help="Folder containing the final 22 colour-matched blue-light PNG files.",
    )
    parser.add_argument(
        "--qa-dir",
        type=Path,
        default=Path("/private/tmp/eyefans-right-a45-normalized"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    gray_dir = args.output_dir / "gray"
    blue_dir = args.output_dir / "blue-light"
    mask_dir = args.output_dir / "masks"
    args.qa_dir.mkdir(parents=True, exist_ok=True)

    clean_pink = rgba(args.clean_dir / "圓框＿櫻花＿側2026.png")
    clean_black = rgba(args.clean_dir / "圓框＿黑＿側2026.png")
    if clean_pink.size != CANVAS or clean_black.size != CANVAS:
        raise ValueError("Clean reference canvases must be 1643x686")

    # The supplied separated pink layers are the authoritative, pixel-aligned
    # standard frame/temple masks.  The temple layer contains both the outer
    # temple and the shorter inner temple visible behind the frame.
    frame_layer = rgba(args.clean_dir / "圓框＿櫻花＿側框2026.png")
    temple_layer = rgba(args.clean_dir / "圓框＿櫻花＿側腳2026.png")
    if frame_layer.size != CANVAS or temple_layer.size != CANVAS:
        raise ValueError("Separated frame/temple layers must be 1643x686")
    mask_dir.mkdir(parents=True, exist_ok=True)

    source_pink = mirrored(args.source_dir / SOLID_SOURCES["櫻花粉"][0])
    source_black = mirrored(args.source_dir / SOLID_SOURCES["霧面黑"][0])
    logo_mask = build_logo_mask(clean_pink, source_pink, clean_black, source_black)
    mask_y, mask_x = np.where(logo_mask)

    report = {
        "canvas": list(CANVAS),
        "orientation": "right-45 (temple on left, frame on right)",
        "colourSpace": "sRGB IEC61966-2.1 (embedded ICC)",
        "logoBrush": {
            "pixels": int(logo_mask.sum()),
            "bbox": [int(mask_x.min()), int(mask_y.min()), int(mask_x.max() + 1), int(mask_y.max() + 1)],
        },
        "masks": {
            "frame": "masks/frame.png",
            "temple": "masks/temple.png",
        },
        "gray": {},
        "blueLight": {},
    }
    contact_entries: list[tuple[str, Path]] = []
    blue_composite_entries: list[tuple[str, Path, Path, str]] = []

    clean_refs = [clean_pink, clean_black]
    for colour, (source_name, output_name) in SOLID_SOURCES.items():
        source = mirrored(args.source_dir / source_name)
        if source.size != CANVAS:
            raise ValueError(f"Unexpected source size for {colour}: {source.size}")
        repaired, metrics = repair_solid_logo(source, clean_refs, logo_mask)
        repaired = repair_transparent_bridge(repaired)
        output_path = gray_dir / output_name
        save_png(repaired, output_path)
        report["gray"][colour] = {
            "file": str(output_path.relative_to(args.output_dir)),
            "source": source_name,
            "normalization": "pixel-registered mirror; geometry unchanged",
            "maskProfile": "standard",
            **metrics,
        }
        contact_entries.append((f"gray / {output_name}", output_path))

    if not args.amber_patch.exists():
        raise FileNotFoundError(f"Missing repaired amber patch: {args.amber_patch}")
    amber = rgba(args.amber_patch).resize(CANVAS, Image.Resampling.LANCZOS)
    amber_path = gray_dir / "amber.png"
    save_png(amber, amber_path, dpi=(300, 300))
    report["gray"]["琥珀"] = {
        "file": "gray/amber.png",
        "source": "圓框＿琥珀＿側2026.png",
        "normalization": "independent tortoiseshell repair; resized to canonical canvas",
        "note": "Separate original crop; lens texture and frame remain photographic.",
        "maskProfile": "amber",
    }
    contact_entries.append(("gray / amber.png", amber_path))

    # Build production raster profiles only after the canonical images exist.
    # Standard colours share the same lens apertures; tortoiseshell retains its
    # separately photographed inner contours.
    standard_lens_mask = make_lens_mask(rgba(gray_dir / "sakura-pink.png"), "standard")
    amber_lens_mask = make_lens_mask(amber, "amber")

    standard_frame_full = np.asarray(frame_layer.getchannel("A")).copy()
    x0, y0, x1, y1 = STANDARD_BRIDGE_REPAIR
    standard_frame_full[y0:y1, x0:x1] = 255
    standard_frame_full_image = Image.fromarray(standard_frame_full, "L")

    standard_temple_alpha = np.asarray(temple_layer.getchannel("A")).copy()
    standard_temple_candidate = standard_temple_alpha > 16
    standard_outer_temple = component_from_seed(
        standard_temple_candidate,
        (180, 300),
    )
    standard_inner_temple = component_from_seed(
        standard_temple_candidate,
        (500, 570),
    )
    standard_temple = np.where(
        standard_outer_temple | standard_inner_temple,
        standard_temple_alpha,
        0,
    ).astype(np.uint8)
    standard_temple_image = Image.fromarray(standard_temple, "L")

    amber_alpha = np.asarray(amber.getchannel("A")).copy()
    # Amber comes from one flattened cutout, so frame and temples must share
    # one ownership boundary.  The previous y=400 horizontal crop removed the
    # lower-left frame rim (x626..720) and left a conspicuous white rectangle.
    # Follow the photographed hinge/inner-temple edge instead: the upper hinge
    # joins at x520, then the visible inner temple hands over to the lower frame
    # along a short diagonal from x640 to x650.
    amber_frame_left = np.full(amber_alpha.shape[0], 650, dtype=np.int32)
    amber_frame_left[:410] = 520
    amber_frame_left[410:500] = np.rint(
        np.linspace(640, 650, 90, endpoint=False)
    ).astype(np.int32)
    amber_x = np.arange(amber_alpha.shape[1])[None, :]
    amber_frame_owner = amber_x >= amber_frame_left[:, None]
    amber_frame_full = np.where(
        amber_frame_owner,
        amber_alpha,
        0,
    ).astype(np.uint8)
    amber_temple = np.where(
        ~amber_frame_owner,
        amber_alpha,
        0,
    ).astype(np.uint8)

    # Amber and solid-colour photos have slightly different hinge silhouettes.
    # Extending the general amber frame mask would cover the chosen temple with
    # tortoiseshell pixels.  Instead, create a pair-specific temple bridge that
    # is selected only for amber-frame + solid-temple combinations.
    joint_roi = np.zeros_like(standard_frame_full, dtype=bool)
    joint_roi[63:225, 495:520] = True
    joint_roi[410:515, 619:650] = True
    temple_bridge_to_amber = np.where(
        joint_roi,
        np.minimum(standard_frame_full, amber_temple),
        0,
    ).astype(np.uint8)
    standard_temple_to_amber = np.maximum(
        standard_temple,
        temple_bridge_to_amber,
    )

    amber_frame_full_image = Image.fromarray(amber_frame_full, "L")
    amber_temple_image = Image.fromarray(amber_temple, "L")

    mask_profiles = {
        "standard": {
            "frame-full": standard_frame_full_image,
            "frame-shell": subtract_mask(standard_frame_full_image, standard_lens_mask),
            "temple": standard_temple_image,
            "lens": standard_lens_mask,
        },
        "amber": {
            "frame-full": amber_frame_full_image,
            "frame-shell": subtract_mask(amber_frame_full_image, amber_lens_mask),
            "temple": amber_temple_image,
            "lens": amber_lens_mask,
        },
    }
    for profile, masks in mask_profiles.items():
        for mask_name, mask_image in masks.items():
            destination = mask_dir / profile / f"{mask_name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            mask_image.save(destination, optimize=True)

    pair_temple_path = (
        mask_dir / "pairs" / "amber-frame-standard-temple" / "temple.png"
    )
    pair_temple_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(standard_temple_to_amber, "L").save(
        pair_temple_path,
        optimize=True,
    )

    # Compatibility copies remain for older embeds while the app itself uses
    # the named standard/amber mask profiles.
    standard_frame_full_image.save(mask_dir / "frame.png", optimize=True)
    standard_temple_image.save(mask_dir / "temple.png", optimize=True)

    gray_outputs = {
        colour: gray_dir / output_name
        for colour, (_, output_name) in SOLID_SOURCES.items()
    }
    gray_outputs["琥珀"] = amber_path
    missing_blue = [
        file_name
        for file_name in BLUE_LIGHT_FINAL_FILES.values()
        if not (args.blue_light_dir / file_name).is_file()
    ]
    if missing_blue:
        raise FileNotFoundError(
            f"Missing final blue-light files in {args.blue_light_dir}: {', '.join(missing_blue)}"
        )

    for colour, output_name in BLUE_LIGHT_FINAL_FILES.items():
        source_path = args.blue_light_dir / output_name
        profile = "amber" if colour == "琥珀" else "standard"
        lens_mask = mask_profiles[profile]["lens"]
        blue = make_final_blue_light_asset(
            source_path,
            lens_mask,
            gray_outputs[colour],
        )
        output_path = blue_dir / output_name
        save_png(blue, output_path, dpi=(300, 300))
        alpha_equal = bool(np.array_equal(np.asarray(blue)[:, :, 3], np.asarray(lens_mask)))
        report["blueLight"][colour] = {
            "file": str(output_path.relative_to(args.output_dir)),
            "source": output_name,
            "normalization": "colour-matched blue-light photo de-screened with low-frequency chroma, canonical gray-lens surface detail, and the true raster lens apertures",
            "baseGeometry": str(gray_outputs[colour].relative_to(args.output_dir)),
            "maskProfile": profile,
            "lensOnly": True,
            "alphaMatchesLensMask": alpha_equal,
        }
        contact_entries.append((f"blue / {output_name}", output_path))
        blue_composite_entries.append(
            (output_name, gray_outputs[colour], output_path, profile)
        )

    report["masks"] = {
        profile: {
            mask_name: str((mask_dir / profile / f"{mask_name}.png").relative_to(args.output_dir))
            for mask_name in masks
        }
        for profile, masks in mask_profiles.items()
    }
    report["masks"]["pairs"] = {
        "amber-frame-standard-temple": {
            "temple": str(pair_temple_path.relative_to(args.output_dir)),
        },
    }

    mask_path = args.qa_dir / "solid-logo-brush-mask.png"
    Image.fromarray((logo_mask * 255).astype(np.uint8), "L").save(mask_path)
    report_path = args.output_dir / "manifest.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    make_contact_sheet(contact_entries, args.qa_dir / "contact-sheet.jpg")
    make_blue_light_contact_sheet(
        blue_composite_entries,
        mask_profiles,
        args.qa_dir / "blue-light-contact-sheet.jpg",
    )
    print(f"Prepared {len(report['gray'])} gray and {len(report['blueLight'])} blue-light assets")
    print(f"Output: {args.output_dir}")
    print(f"QA contact sheet: {args.qa_dir / 'contact-sheet.jpg'}")
    print(f"Logo brush bbox: {report['logoBrush']['bbox']} ({report['logoBrush']['pixels']} px)")


if __name__ == "__main__":
    main()
