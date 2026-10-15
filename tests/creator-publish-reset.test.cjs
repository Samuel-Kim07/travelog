const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('creator.js', 'utf8');
const publish = source.slice(source.indexOf('  async function publishPreparedGuideOnline()'), source.indexOf('  // ==========================================\n  // Audio Recorder', source.indexOf('  async function publishPreparedGuideOnline()'))).split('  async function toggleRecording()')[0];

function harness({ existing = false, fail = false } = {}) {
  const calls = [];
  let finishNotice;
  let resolvePublish;
  const pending = new Promise(resolve => { resolvePublish = resolve; });
  const ctx = vm.createContext({
    console: { error() {} }, alert() { calls.push('error'); },
    setTimeout(fn) { finishNotice = fn; },
    document: { getElementById() { return null; } },
    window: {
      TravelogApp: { addPoints() {}, showToast() {} },
      TravelogSupabase: { async publishGuidePackage() {
        calls.push('publish'); await pending;
        if (fail) throw new Error('upload failed');
        return { guideId: 'guide-1' };
      } }
    },
    getPublishReadiness: () => ({ ready: true }),
    isActiveEditPublished: () => existing,
    t: s => s,
    showPublishModalLoading() {}, updatePublishProgress() {},
    storePublishedGuideRecord(p) { calls.push(['published', p.guideId]); },
    markSavedGuideAsPublished() { calls.push('list'); }, registerGuideOnHome() {},
    persistWorkingDraft() { calls.push('persist'); },
    closePublishModal() { calls.push('close'); },
    moveToHomeTab() { calls.push('home'); },
    resetCreatorStudioForNewGuide() { calls.push('reset'); }
  });
  vm.runInContext(`let publishOnlineInProgress = false; let editorGeneration = 0;
    let pendingPublishPackage = {guideId:'guide-1',tourName:'Tour'};\n${publish}`, ctx);
  return { ctx, calls, resolvePublish, finish: () => finishNotice(), run: () => ctx.publishPreparedGuideOnline() };
}

test('new publication resets only after server success and success notice; blocks duplicate clicks', async () => {
  const h = harness(); const running = h.run();
  await h.run(); assert.deepEqual(h.calls, ['publish']);
  h.resolvePublish(); await new Promise(setImmediate);
  assert.ok(h.calls.includes('list')); assert.ok(!h.calls.includes('reset'));
  h.finish(); await running;
  assert.equal(h.calls.filter(x => x === 'reset').length, 1);
  assert.equal(h.calls.at(-1), 'persist');
  assert.ok(!h.calls.includes('home'));
});

test('failed upload preserves editor and releases retry lock', async () => {
  const h = harness({ fail: true }); const running = h.run();
  h.resolvePublish(); await running; await h.run();
  assert.equal(h.calls.filter(x => x === 'publish').length, 2);
  assert.ok(!h.calls.includes('reset')); assert.ok(!h.calls.includes('list'));
});

test('existing published guide retains prior completion flow', async () => {
  const h = harness({ existing: true }); const running = h.run();
  h.resolvePublish(); await new Promise(setImmediate); h.finish(); await running;
  assert.ok(!h.calls.includes('reset')); assert.ok(h.calls.includes('home'));
});

test('switching to another editor during publication does not clear that editor', async () => {
  const h = harness(); const running = h.run();
  h.resolvePublish(); await new Promise(setImmediate);
  vm.runInContext('editorGeneration++', h.ctx);
  h.finish(); await running;
  assert.ok(!h.calls.includes('reset')); assert.ok(!h.calls.includes('home'));
});
