const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../map.js'), 'utf8');
const controller = source.slice(source.indexOf('  let memoPlaybackCleanup = null;'), source.indexOf('  function closePublishedGuideMemoPopup()'));

function setup() {
  let now = 0;
  let id = 0;
  let closed = 0;
  let played = 0;
  let fullscreenClosed = 0;
  const timers = new Map();
  const window = {
    setTimeout(fn, delay) { timers.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(key) { timers.delete(key); },
    TravelogMemoFullscreen: { closeForMedia() { fullscreenClosed++; } }
  };
  const context = vm.createContext({ window, playMemoModalMedia() { played++; } });
  vm.runInContext(controller, context);
  const modal = { classList: { contains() { return true; } } };
  const media = () => {
    const el = new EventTarget();
    el.ended = false;
    el.error = null;
    el.pause = () => el.dispatchEvent(new Event('pause'));
    el.fire = (event) => el.dispatchEvent(new Event(event));
    el.finish = () => { el.ended = true; el.fire('ended'); };
    return el;
  };
  return {
    media, timers, context,
    bind(el, autoplay = false) { context.bindMemoPlayback(modal, el, () => { closed++; context.clearMemoPlayback(); }, autoplay); },
    tick(ms) {
      const target = now + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
      }
      now = target;
    },
    get closed() { return closed; },
    get played() { return played; },
    get fullscreenClosed() { return fullscreenClosed; }
  };
}

for (const [kind, seconds] of [['audio', 4], ['video', 10]]) {
  test(`${kind}: actual ended then exactly 3 seconds`, () => {
    const h = setup(); const el = h.media(); h.bind(el);
    h.tick(seconds * 1000); assert.equal(h.closed, 0);
    el.finish(); h.tick(2999); assert.equal(h.closed, 0);
    h.tick(1); assert.equal(h.closed, 1);
    assert.equal(h.fullscreenClosed, 1);
  });
}

for (const event of ['play', 'playing', 'pause', 'seeking', 'waiting', 'stalled', 'error', 'emptied', 'loadstart']) {
  test(`${event} cancels pending close; playback without ended never closes`, () => {
    const h = setup(); const el = h.media(); h.bind(el);
    el.fire(event); h.tick(20000); assert.equal(h.closed, 0);
    el.finish(); h.tick(1000); el.fire(event); h.tick(5000);
    assert.equal(h.closed, 0);
  });
}

test('replay schedules a fresh delay only after the next ended', () => {
  const h = setup(); const el = h.media(); h.bind(el);
  el.finish(); h.tick(2000); el.ended = false; el.fire('play');
  h.tick(10000); assert.equal(h.closed, 0);
  el.finish(); h.tick(3000); assert.equal(h.closed, 1);
});

test('switching memos invalidates even an already queued old callback', () => {
  const h = setup(); const old = h.media(); h.bind(old); old.finish();
  const stale = [...h.timers.values()][0].fn;
  const next = h.media(); h.bind(next);
  stale(); old.finish(); h.tick(5000); assert.equal(h.closed, 0);
  next.finish(); h.tick(3000); assert.equal(h.closed, 1);
});

test('manual cleanup cancels close, delayed autoplay and removes handlers', () => {
  const h = setup(); const el = h.media(); h.bind(el, true); el.finish();
  h.context.clearMemoPlayback(); el.finish(); h.tick(20000);
  assert.equal(h.closed, 0); assert.equal(h.played, 0); assert.equal(h.timers.size, 0);
});

test('photo/text with no media cancel the preceding timer and never auto-close', () => {
  const h = setup(); const el = h.media(); h.bind(el); el.finish();
  h.bind(null); h.tick(20000); assert.equal(h.closed, 0);
});

test('repeated binding and ended events leave only one timer', () => {
  const h = setup(); const el = h.media(); h.bind(el); h.bind(el);
  el.finish(); el.finish(); assert.equal(h.timers.size, 1);
  h.tick(3000); assert.equal(h.closed, 1);
});

test('error or an incomplete ended event never counts as completion', () => {
  const h = setup(); const el = h.media(); h.bind(el);
  el.fire('ended'); h.tick(5000); assert.equal(h.closed, 0);
  el.error = {}; el.finish(); h.tick(5000); assert.equal(h.closed, 0);
});
