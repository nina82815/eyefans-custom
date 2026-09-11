# Checkout analytics compatibility — 2026-09-11

## Scope

The existing v4.6 custom-cart loader initializes a missing `gtag` only after its custom-cart gate. Ordinary CLASSIC carts without custom state never receive that fallback. CYBERBIZ's `globalAnalysis-c962495e2f.js` invokes checkout-step analytics from a scroll-step event without catching an absent `gtag` in that handler. A thrown exception during checkout UI updates can remove the checkout content.

`cyberbiz-checkout-analytics-compat-20260911.js` provides the standard dataLayer queue on exact storefront cart paths, independently of the custom loader. It preserves existing `gtag` implementations and pending queue entries. It does not load analytics, configure tracking, change consent, access custom storage, intercept checkout, send requests, change cart contents or modify order notes.

## Installation

On the published CYBERBIZ theme **133170**, named **2026.9.14上線**, the source is installed inline immediately after the opening head tag in `theme.liquid`, wrapped in a script element with ID `eyefans-checkout-analytics-compat-20260911`.

Keep it synchronous and before checkout/analytics scripts, so protection does not depend on another network request. Preserve the existing custom loader v4.6 and live-test wrapper v7 unchanged, including their integrity attributes.

Do not include literal HTML head/script/body tags in the JavaScript comments. CYBERBIZ's head-tag rewriting also processes tag-like text inside comments. The initial installation exposed part of a comment/script because of this behavior; the comment was corrected immediately, and the final complete inline script and clean rendered page were verified.

The original theme was 301,003 characters. Editor clipboard readback verified that removing only the inserted block yielded the exact original string. No unrelated theme contents were changed. Theme full-source backup remained in the active browser session; CYBERBIZ also provides previous versions.

## Verification

- Node regression tests cover ordinary checkout, missing analytics, existing tracking, queued events, idempotency, later analytics loading, exact origin/path restrictions, no custom-cart/storage/DOM access, and the platform tag-rewriting hazard.
- Existing v4.6 cart/variant/note safety tests remain unchanged.
- The fresh live checkout contains the complete inline code before the checkout bundle.
- Ordinary cart: one CLASSIC item, NT$590 + shipping NT$65 = NT$655, unchanged; no custom guard panel.
- Desktop Chrome responsive viewports 390×844 and 390×760: repeated scrolling through member/payment sections and to the bottom retains the cart and checkout button. Temporary viewport overrides were reset.
- After the final corrected page load, the only observed console error was the pre-existing chat-widget initialization failure. Earlier log entries from the initial malformed script must not be mistaken for errors from the corrected load.
- Actual phone browser confirmation remains a separate user check. Desktop responsive emulation is not an iPhone browser test. No orders were submitted.

## Rollback

In the same published theme, remove only the script element with ID `eyefans-checkout-analytics-compat-20260911`, then save and verify a fresh page. Do not revert the entire theme, replace custom loaders, remove design records or undo unrelated theme edits.

## Mobile CVS-return follow-up (same day, afternoon)

The user confirmed the morning scroll-only phone test passed, then reported another failure after selecting a 7-Eleven store on the phone; desktop checkout was unaffected. The second recording shows successful external store selection followed by the checkout disappearing on return.

The platform checkout application's `setupApplaction` first receives `/carts/:token/redirect_cvs`, then uses history replacement to normalize it to `/carts/:token`. The early head bootstrap must therefore accept the initial CVS-return path, not just the later canonical cart path. The original narrow path check skipped the mobile return.

- Added only the exact optional `/redirect_cvs` suffix to the existing cart-token route. Other subpaths remain excluded.
- Added a regression that fails against the morning version and passes after the fix, checking initialization before the platform URL normalization and successful analytics calls afterward.
- Updated only the existing inline script block in published theme 133170. The surrounding theme source was preserved exactly (102 characters added inside the block).
- Final live inline source was verified to match the edited source; no exposed code text.
- Full test run: 44 passed, 0 failed.
- The previously open desktop cart token became unavailable during testing and the standard cart entrance returned to the homepage with a zero-item count. Its cause was not established; no item/order mutation was performed by this diagnostic. This is not evidence that the phone return path passed or failed.
- Actual phone store-selection round-trip confirmation is pending separately; do not claim a completed phone checkout test until the user confirms it.

To roll back only this follow-up, revert the optional CVS-return suffix and its explanatory comments within the same inline block, retaining the morning ordinary-cart protection.
