"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.join(__dirname, "..");
const htmlSource = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");

function declaration(name) {
  const match = appSource.match(new RegExp(`(?:const|let) ${name} = [\\s\\S]*?;\\n`));
  assert.ok(match, `${name} must remain declared`);
  return match[0];
}

function implementation(name) {
  const match = appSource.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `${name} must remain implemented`);
  return match[0];
}

const copyContext = {};
vm.createContext(copyContext);
vm.runInContext(`${declaration("CUSTOMIZATION_MODES")}this.result = CUSTOMIZATION_MODES;`, copyContext);
assert.deepEqual(
  JSON.parse(JSON.stringify(copyContext.result)),
  {
    color: {
      label: "框腳配色",
      shortLabel: "純配色",
      headerDescription: "自由配色・即時預覽"
    },
    engraving: {
      label: "框腳配色＋雷雕",
      shortLabel: "白色雷雕",
      headerDescription: "自由配色・英文雷雕預覽"
    },
    uv: {
      label: "框腳配色＋UV 彩印",
      shortLabel: "UV 彩印",
      headerDescription: "自由配色・UV 彩印預覽"
    }
  }
);
assert.match(htmlSource, /<p id="mode-description">自由配色・UV 彩印預覽<\/p>/);
assert.match(
  appSource,
  /document\.getElementById\("mode-description"\)\.textContent = config\.headerDescription;/
);
assert.match(htmlSource, /<script src="app\.js\?v=20260902a" defer><\/script>/);

const resizeRuntime = [
  "MESSAGE_SCHEMA_VERSION",
  "FRAME_RESIZE_MESSAGE_TYPE",
  "FRAME_RESIZE_REQUEST_TYPE",
  "STOREFRONT_ORIGIN"
].map(declaration).concat([
  "frameResizeObserver",
  "frameResizeAnimationFrame",
  "lastPostedFrameHeight"
].map(declaration), [
  "parentMessageOrigin",
  "measuredFrameContentHeight",
  "postFrameResize",
  "scheduleFrameResize",
  "handleFrameResizeRequest",
  "initializeFrameResize"
].map(implementation)).join("\n");

function resizeEnvironment({ embedded = true, initialHeight = 1200.2 } = {}) {
  let height = initialHeight;
  let observerCallback = null;
  const listeners = {};
  const messages = [];
  const animationFrames = [];
  const parent = {
    postMessage(message, targetOrigin) {
      messages.push({ message: JSON.parse(JSON.stringify(message)), targetOrigin });
    }
  };
  const window = {
    location: {
      origin: "https://nina82815.github.io",
      protocol: "https:"
    },
    parent,
    addEventListener(name, listener) {
      listeners[name] = listener;
    },
    requestAnimationFrame(callback) {
      animationFrames.push(callback);
      return animationFrames.length;
    }
  };
  if (!embedded) window.parent = window;

  class FakeResizeObserver {
    constructor(callback) {
      observerCallback = callback;
    }
    observe(target) {
      assert.equal(target, document.body);
    }
  }

  const document = {
    referrer: embedded
      ? "https://www.eyefans.com.tw/products/cls-cus-mix-uv-sun-rd"
      : "",
    body: {
      getBoundingClientRect() {
        return { height };
      }
    }
  };
  const context = { URL, Number, window, document, ResizeObserver: FakeResizeObserver };
  vm.createContext(context);
  vm.runInContext(resizeRuntime, context);

  return {
    context,
    document,
    listeners,
    messages,
    parent,
    setHeight(nextHeight) { height = nextHeight; },
    resize() { observerCallback?.(); },
    flushAnimationFrame() {
      const callback = animationFrames.shift();
      assert.ok(callback, "a resize animation frame must be scheduled");
      callback();
    }
  };
}

const embedded = resizeEnvironment();
embedded.context.initializeFrameResize();
embedded.flushAnimationFrame();
assert.deepEqual(embedded.messages, [{
  message: {
    type: "eyefans-customizer-resize",
    schemaVersion: 1,
    height: 1201
  },
  targetOrigin: "https://www.eyefans.com.tw"
}]);

embedded.resize();
embedded.flushAnimationFrame();
assert.equal(embedded.messages.length, 1, "an unchanged height must be deduplicated");

embedded.setHeight(2460.1);
embedded.resize();
embedded.flushAnimationFrame();
assert.equal(embedded.messages.at(-1).message.height, 2461, "the frame must report growth");

embedded.setHeight(980.4);
embedded.resize();
embedded.flushAnimationFrame();
assert.equal(embedded.messages.at(-1).message.height, 981, "the frame must report shrinkage");

const beforeInvalidRequests = embedded.messages.length;
embedded.listeners.message({
  source: embedded.parent,
  origin: "https://evil.example",
  data: { type: "eyefans-customizer-resize-request", schemaVersion: 1 }
});
assert.equal(embedded.messages.length, beforeInvalidRequests);

embedded.listeners.message({
  source: embedded.parent,
  origin: "https://www.eyefans.com.tw",
  data: { type: "eyefans-customizer-resize-request", schemaVersion: 1 }
});
embedded.flushAnimationFrame();
assert.equal(embedded.messages.length, beforeInvalidRequests + 1,
  "a trusted parent may request the current height after a late listener or iframe reload");

const standalone = resizeEnvironment({ embedded: false });
standalone.context.initializeFrameResize();
assert.deepEqual(standalone.messages, []);
assert.deepEqual(standalone.listeners, {});

console.log("customizer mode copy + trusted auto-height messaging contract passed");
