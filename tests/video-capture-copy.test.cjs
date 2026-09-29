const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('creator.js', 'utf8');
const start = source.indexOf('  async function copyCapturedVideo(');
const end = source.indexOf('  async function addVideoMemoCapture(', start);
const copyCapturedVideo = vm.runInNewContext(`${source.slice(start, end)}; copyCapturedVideo`, { Blob });

test('camera video remains readable after provider revokes the original, across chunk boundaries', async () => {
  const bytes = new Uint8Array(6 * 1024 * 1024 + 17).fill(123);
  const original = new Blob([bytes], { type: 'video/mp4' });
  const slice = original.slice.bind(original);
  let revoked = false;
  original.slice = (...args) => {
    if (revoked) throw new DOMException('Camera permission expired', 'NotReadableError');
    return slice(...args);
  };
  const saved = await copyCapturedVideo(original);
  revoked = true;
  assert.throws(() => original.slice(0, 1), { name: 'NotReadableError' });
  assert.equal(saved.type, 'video/mp4');
  assert.deepEqual(new Uint8Array(await saved.arrayBuffer()), bytes);
});

test('unreadable and empty captures are rejected instead of retaining an unusable file', async () => {
  const original = new Blob(['video']);
  original.slice = () => ({ arrayBuffer: async () => { throw new DOMException('Lost file', 'NotReadableError'); } });
  await assert.rejects(copyCapturedVideo(original), { name: 'NotReadableError' });
  await assert.rejects(copyCapturedVideo(new Blob([])), /VIDEO_CAPTURE_COPY_FAILED/);
});
