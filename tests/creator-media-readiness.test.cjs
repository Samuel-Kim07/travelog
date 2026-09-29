const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(saveGeneratedFile) {
  const source = fs.readFileSync('creator.js', 'utf8').replace(/\r\n/g, '\n');
  const win = { TravelogDeviceStorage: { saveGeneratedFile }, TravelogApp: { showToast() {} } };
  const context = vm.createContext({ window: win, Blob, console, document: {
    getElementById() { return { value: 'Test tour' }; }, addEventListener() {}
  } });
  const position = source.indexOf('  return {\n    persistWorkingDraft,');
  assert.ok(position > 0);
  const hook = `
    renderAudioList = updatePublishPanelCounts = persistWorkingDraft = () => {};
    ensureRecordedMediaDataUrls = async () => { throw new Error('REACHED_PACKAGE_BUILD'); };
    recordedAudioChunks = [new Blob(['recording'], { type: 'audio/webm' })];
    window.testApi = { handleRecordedAudioReady, buildGuidePublishPackage,
      setRestore(p) { mediaRestorePromise = p; },
      switchGuide() { editorGeneration++; },
      audios() { return recordedAudios; }
    };
  `;
  vm.runInContext(source.slice(0, position) + hook + source.slice(position), context);
  return win.testApi;
}

test('guide recording persists real audio bytes and retains its storage reference', async () => {
  let saved;
  const api = harness(async (kind, fileName, blob) => {
    saved = { kind, fileName, blob };
    return { id: 'saved-audio', kind, fileName };
  });
  await api.handleRecordedAudioReady();
  assert.equal(saved.kind, 'Audio');
  assert.equal(await saved.blob.text(), 'recording');
  assert.equal(api.audios()[0].deviceStorageRef.id, 'saved-audio');
});

test('failed device save retains recording for retry', async () => {
  const api = harness(async () => { throw new Error('Storage unavailable'); });
  await api.handleRecordedAudioReady();
  assert.equal(await api.audios()[0].blob.text(), 'recording');
});

test('package building waits for draft media restoration', async () => {
  const api = harness();
  let release;
  api.setRestore(new Promise(resolve => { release = resolve; }));
  let settled = false;
  const result = api.buildGuidePublishPackage().catch(error => { settled = true; return error; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  release();
  assert.match((await result).message, /REACHED_PACKAGE_BUILD/);
});

test('changing guide while media restores cancels the pending save', async () => {
  const api = harness();
  let release;
  api.setRestore(new Promise(resolve => { release = resolve; }));
  const result = api.buildGuidePublishPackage();
  api.switchGuide();
  release();
  await assert.rejects(result, /EDITOR_CHANGED_DURING_MEDIA_RESTORE/);
});
