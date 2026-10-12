const {test} = require('node:test');
const assert = require('node:assert/strict');
const {harness, packageData, guideId} = require('./publish-harness.cjs');

function newGuide(h) {
  h.db.guides = []; h.db.guide_pins = []; h.db.guide_media = [];
  const p = packageData(); p.representativeImage = 'data:image/jpeg;base64,Y292ZXI=';
  return p;
}

test('owned draft is confirmed before cover/media uploads; only final RPC publishes', async () => {
  const h = harness(undefined, {upload: async () => {
    assert.equal(h.db.guides.length, 1);
    assert.equal(h.db.guides[0].id, guideId);
    assert.equal(h.db.guides[0].author_id, h.session.user.id);
    assert.equal(h.db.guides[0].status, 'draft');
    assert.equal(h.db.guide_pins.length, 0); assert.equal(h.db.guide_media.length, 0);
  }});
  const p = newGuide(h); await h.api.publishGuidePackage(p);
  assert.ok(h.events.indexOf('insert:guides') < h.events.indexOf('upload'));
  assert.equal(h.db.guides[0].status, 'published');
  assert.equal(h.db.guide_media.length, 6);
});

test('draft INSERT denial stops before upload and preserves local package', async () => {
  const h = harness(); const p = newGuide(h); const before = JSON.stringify(p);
  h.control.failDraftInsert = true;
  await assert.rejects(h.api.publishGuidePackage(p), e => e.publishDiagnostic.stage === 'guide-draft-create');
  assert.equal(h.control.uploadNumber, 0); assert.equal(h.db.guides.length, 0);
  assert.equal(JSON.stringify(p), before);
});

test('lost draft INSERT response is recovered by reading the same owned UUID', async () => {
  const h = harness(); const p = newGuide(h); h.control.loseDraftResponse = true;
  await h.api.publishGuidePackage(p);
  assert.equal(h.events.filter(e => e === 'insert:guides').length, 1);
  assert.equal(h.db.guides.length, 1); assert.equal(h.db.guides[0].status, 'published');
});

test('failed cover upload retains draft and retry reuses its ID without another INSERT', async () => {
  const h = harness(); const p = newGuide(h); h.control.httpStatus = 400;
  await assert.rejects(h.api.publishGuidePackage(p));
  assert.equal(h.db.guides[0].status, 'draft'); assert.equal(h.db.guide_media.length, 0);
  h.control.httpStatus = 0; await h.api.publishGuidePackage(p);
  assert.equal(h.events.filter(e => e === 'insert:guides').length, 1);
  assert.equal(h.db.guides[0].id, p.guideId); assert.equal(h.db.guides[0].status, 'published');
});

for (const foreign of [false, true]) test(`concurrent UUID creation rechecks owner (foreign=${foreign})`, async () => {
  const h = harness(); const p = newGuide(h);
  const publish = h.api.publishGuidePackage(p, {onProgress: progress => {
    if (progress.percent === 24) h.db.guides.push({id: p.guideId, author_id: foreign ? 'foreign' : h.session.user.id, status: 'draft'});
  }});
  if (foreign) {
    await assert.rejects(publish, /PUBLISH_GUIDE_NOT_OWNED/); assert.equal(h.control.uploadNumber, 0);
    assert.equal(h.db.guides[0].author_id, 'foreign');
  } else {
    await publish; assert.equal(h.db.guides.length, 1); assert.equal(h.db.guides[0].status, 'published');
  }
});

test('published guide stays unchanged while editing and after failed finalization', async () => {
  const h = harness(); const before = JSON.stringify(h.db); h.control.failFinalize = true;
  const p = packageData(); p.tourName = 'Changed';
  await assert.rejects(h.api.publishGuidePackage(p, {onProgress: () => assert.equal(JSON.stringify(h.db), before)}));
  assert.equal(JSON.stringify(h.db), before); assert.ok(!h.events.includes('insert:guides'));
});

test('missing Storage object after successful POST blocks finalization', async () => {
  const h = harness(); const p = newGuide(h);
  await assert.rejects(h.api.publishGuidePackage(p, {onProgress: progress => {
    if (progress.percent === 84) h.objects.clear();
  }}), e => e.publishDiagnostic.stage === 'storage-verify');
  assert.equal(h.db.guides[0].status, 'draft'); assert.ok(!h.events.some(e => e.startsWith('rpc:')));
});

test('draft status returned from finalizer is not reported as publish success', async () => {
  const h = harness(async (_, args) => ({data: {guide: {...args.p_guide, status: 'draft'}}}));
  const p = newGuide(h);
  await assert.rejects(h.api.publishGuidePackage(p), /PUBLISH_COMMIT_RESPONSE_INVALID/);
  assert.equal(h.db.guides[0].status, 'draft');
});

test('wrong guide ID in Storage path is rejected before uploading', async () => {
  const h = harness(); const path = `guides/other-guide/uploads/${h.session.user.id}/cover/a.jpg`;
  await assert.rejects(h.internal.uploadBlob('guide-public', path, new Blob(['x']), {userId: h.session.user.id, guideId}), /PUBLISH_PATH_GUIDE_MISMATCH/);
  assert.equal(h.control.uploadNumber, 0);
});

test('duplicate click creates one draft and executes one finalization', async () => {
  const h = harness(); const p = newGuide(h); const first = h.api.publishGuidePackage(p);
  await assert.rejects(h.api.publishGuidePackage(p), /PUBLISH_ALREADY_IN_PROGRESS/); await first;
  assert.equal(h.events.filter(e => e === 'insert:guides').length, 1);
  assert.equal(h.events.filter(e => e.startsWith('rpc:')).length, 1);
});
