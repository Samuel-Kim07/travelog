const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { harness, packageData } = require('./publish-harness.cjs');

function storageHarness(type, mode = 'opfs') {
  let version = 0;
  let bytes = new Blob(['original-media'], { type });
  const handle = {
    async getFile() {
      const snapshot = bytes;
      const current = version;
      const file = new Blob([snapshot], { type });
      file.slice = (...args) => ({ arrayBuffer: async () => {
        if (current !== version) throw new DOMException('Backing file changed', 'NotReadableError');
        return snapshot.slice(...args).arrayBuffer();
      } });
      return file;
    },
    async createWritable() {
      return { async write(blob) { bytes = blob; }, async close() { version++; } };
    }
  };
  const folder = { async getFileHandle() { return handle; } };
  const win = { addEventListener() {} };
  const context = vm.createContext({ window: win, Blob, console,
    localStorage: { getItem() { return null; } },
    folder, mode, record: null });
  const source = fs.readFileSync('deviceStorage.js', 'utf8');
  const hook = `
    ensureReady = async () => {};
    currentStatus = { mode };
    dataHandle = folder;
    folderHandles = { Audio: folder, Video: folder, Photo: folder };
    idbGet = async () => record;
    findPersistedFile = async () => record;
  `;
  const position = source.lastIndexOf('  return {');
  vm.runInContext(source.slice(0, position) + hook + source.slice(position), context);
  return { api: win.TravelogDeviceStorage, handle, context };
}

for (const [kind, type, list] of [['Photo', 'image/png', 'photoFiles'], ['Video', 'video/mp4', 'videoFiles'], ['Audio', 'audio/webm', 'audioFiles']]) {
  test(`${kind}: restore, overwrite same local file, then publish keeps readable bytes`, async () => {
    const s = storageHarness(type);
    const stale = await s.handle.getFile();
    const blob = await s.api.loadGeneratedFile({ mode: 'opfs', kind, fileName: 'memo' });
    await s.api.saveGeneratedFile(kind, 'memo', blob);
    await assert.rejects(stale.slice(0).arrayBuffer(), { name: 'NotReadableError' });
    assert.equal(await blob.text(), 'original-media');
    assert.equal(blob.type, type);
    const p = packageData();
    p.videoFiles = [];
    p[list] = [{ fileName: 'memo', blob, pinId: 'local-pin', stopIndex: 0 }];
    const publisher = harness();
    await publisher.api.publishGuidePackage(p);
    assert.equal(publisher.control.uploadNumber, 1);
  });
}

test('IndexedDB media is detached from its backing file too', async () => {
  const s = storageHarness('image/png', 'indexeddb');
  s.context.record = { blob: await s.handle.getFile() };
  const blob = await s.api.loadGeneratedFile({ kind: 'Photo', fileName: 'memo' });
  await (await s.handle.createWritable()).close();
  assert.equal(await blob.slice(0).text(), 'original-media');
});

test('unreadable directory snapshot falls back to readable IndexedDB copy', async () => {
  const s = storageHarness('image/png');
  s.handle.getFile = async () => { throw new DOMException('Unavailable', 'NotReadableError'); };
  s.context.record = { blob: new Blob(['backup'], { type: 'image/png' }) };
  const blob = await s.api.loadGeneratedFile({ kind: 'Photo', fileName: 'memo' });
  assert.equal(await blob.text(), 'backup');
});
