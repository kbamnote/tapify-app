/**
 * autotrack — records EVERY button the customer presses, without touching the
 * 40-odd screens that contain them.
 *
 * WHY IT IS DONE THIS WAY
 * Customer Managers were seeing "Never" against features the customer had
 * clearly been using. Screens told them where a customer went, and the server
 * saw saves and deletes, but everything in between — the button they tapped
 * that opened nothing and saved nothing — was invisible. Hand-adding a tracking
 * call to every onPress in the app would be hundreds of edits and would rot the
 * first time somebody adds a screen, so the press is captured where every
 * button in React Native ends up: the touchable components themselves.
 *
 * HOW: the functions that BUILD elements are wrapped once, at import. When the
 * element being created is one of RN's touchables AND it has an onPress, the
 * handler is replaced by one that records the press and then calls the
 * original. Anything else is passed straight through untouched, so the cost on
 * a normal element is one Set lookup.
 *
 * Both element factories are patched, and both are needed. Babel's automatic
 * JSX runtime — what this app is compiled with — emits jsx()/jsxs() from
 * react/jsx-runtime and never touches React.createElement, so patching
 * createElement alone would have recorded precisely nothing in production.
 * createElement is still patched for any code written against the classic
 * runtime, and there the children arrive as ARGUMENTS rather than in props,
 * which is why the caption is read from both places.
 *
 * The label is read at PRESS time, not render time: the text inside the button
 * ("Save", "Download QR"), else accessibilityLabel, else testID. That means a
 * button whose caption changes ("Follow"/"Following") reports what it actually
 * said when it was pressed.
 *
 * Rules this file must keep:
 *   - it may never throw into a press. A tracking bug must not cost the
 *     customer their tap, so the original handler runs inside its own try and
 *     is called even if recording fails;
 *   - it must not change what the app does. Nothing is swallowed, no return
 *     value is altered, and disabled buttons (whose onPress RN never calls) are
 *     never recorded;
 *   - it must stay cheap. No walking the tree at render time — the children are
 *     only inspected when a press actually happens.
 */
import React from 'react';
import {
  Pressable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import ActivityTracker from './ActivityTracker';

// Identity comparison, so only RN's own touchables match. A custom button is
// still caught: it renders one of these inside itself.
const TOUCHABLES = new Set(
  [
    TouchableOpacity,
    TouchableHighlight,
    TouchableWithoutFeedback,
    TouchableNativeFeedback,
    Pressable,
  ].filter(Boolean)
);

const MAX_DEPTH = 4;      // deep enough for <Text><Text>…, shallow enough to stay cheap
const MAX_PARTS = 3;      // "Download  QR  code" — more than this is a paragraph, not a label

/**
 * The words visible inside the button. React children are walked rather than
 * read off a single child, because a button is usually an icon plus a <Text>,
 * and the caption can be one level further down inside a <View>.
 */
function textOf(node, out, depth) {
  if (node === null || node === undefined || node === false || out.length >= MAX_PARTS) return;
  if (typeof node === 'string' || typeof node === 'number') {
    const s = String(node).trim();
    if (s) out.push(s);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out, depth);
    return;
  }
  if (depth >= MAX_DEPTH) return;
  const kids = node && node.props ? node.props.children : null;
  if (kids !== null && kids !== undefined) textOf(kids, out, depth + 1);
}

/**
 * What to call this button on the Customer Manager's timeline.
 *
 * `children` is passed separately because the classic runtime hands them to
 * createElement as arguments, and props.children is undefined until React
 * assembles the element.
 */
function labelFor(props, children) {
  if (!props) return null;

  const parts = [];
  try {
    textOf(props.children !== undefined ? props.children : children, parts, 0);
  } catch (_) { /* a caption is never worth a crash */ }
  if (parts.length) return parts.join(' ');

  // Icon-only buttons have no text. accessibilityLabel is the caption for a
  // screen reader, which is exactly the caption we want here too.
  if (typeof props.accessibilityLabel === 'string' && props.accessibilityLabel.trim()) {
    return props.accessibilityLabel.trim();
  }
  if (typeof props.testID === 'string' && props.testID.trim()) {
    return props.testID.trim();
  }
  return null;
}

/**
 * Props with the press handler replaced, or the props untouched when this
 * element isn't a button. Returning the ORIGINAL object in that case matters:
 * copying every element's props would allocate on every render of every screen.
 */
function trackedProps(type, props, children) {
  if (!props || typeof props.onPress !== 'function' || !TOUCHABLES.has(type)) {
    return props;
  }
  const onPress = props.onPress;
  return {
    ...props,
    onPress(...args) {
      try {
        const label = labelFor(props, children);
        if (label) ActivityTracker.tap(label);
      } catch (_) { /* never cost the customer their tap */ }
      return onPress.apply(this, args);
    },
  };
}

const undo = [];
let installed = false;

/** Replace `host[key]` with a version that wraps the element's onPress. */
function patch(host, key) {
  const original = host && host[key];
  if (typeof original !== 'function') return;
  const wrapper = function (type, props, ...rest) {
    return original.call(this, type, trackedProps(type, props), ...rest);
  };
  try {
    host[key] = wrapper;
    undo.push(() => { host[key] = original; });
  } catch (_) {
    // A frozen module export: skip it rather than break rendering.
  }
}

export function install() {
  if (installed) return;
  installed = true;

  // The automatic runtime — what every screen in this app actually compiles to.
  try {
    const runtime = require('react/jsx-runtime');
    patch(runtime, 'jsx');
    patch(runtime, 'jsxs');
  } catch (_) { /* older React: createElement below covers it */ }
  try {
    const devRuntime = require('react/jsx-dev-runtime');
    patch(devRuntime, 'jsxDEV');
  } catch (_) { /* production bundles have no dev runtime */ }

  // The classic runtime. Children arrive as arguments here, so they are read
  // out of the argument list rather than props.
  const createElement = React.createElement;
  React.createElement = function (type, props, ...children) {
    return createElement.call(
      React,
      type,
      trackedProps(type, props, children.length === 1 ? children[0] : children),
      ...children
    );
  };
  undo.push(() => { React.createElement = createElement; });
}

/** Only for tests — puts the element factories back the way they were. */
export function uninstall() {
  while (undo.length) undo.pop()();
  installed = false;
}

install();

export default { install, uninstall, labelFor };
