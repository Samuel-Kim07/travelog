const {test} = require('node:test');
const assert = require('node:assert/strict');
const {harness, packageData, guideId} = require('./publish-harness.cjs');

test('verified identity mismatch aborts before Storage or DB requests', async () => {
  const h = harness(); h.control.verifiedUserId = '33333333-3333-4333-8333-333333333333';
  await assert.rejects(h.api.publishGuidePackage(packageData()), /PUBLISH_AUTH_USER_MISMATCH/);
  assert.equal(h.events.length, 0);
});

test('invalid server-verified session aborts and asks for login', async () => {
  const h = harness(); h.control.authError = {status: 401, code: 'bad_jwt', message: 'Invalid JWT'};
  await assert.rejects(h.api.publishGuidePackage(packageData()), e => e.publishDiagnostic.stage === 'auth-verify' && /다시 로그인/.test(e.detail));
  assert.equal(h.control.uploadNumber, 0);
});

test('upload path owner is the fourth segment; foreign owner is rejected before POST', async () => {
  const h = harness(); const blob = new Blob(['cover'], {type: 'image/jpeg'});
  const path = await h.internal.makeStoragePath({guideId, userId: 'foreign', folder: 'cover', role: 'cover', blob});
  await assert.rejects(h.internal.uploadBlob('guide-public', path, blob), e => e.publishDiagnostic.pathOwnerMatchesAuth === false);
  assert.equal(h.control.uploadNumber, 0);
});

for (const status of [400, 403]) test(`RLS HTTP ${status} never retries or mutates working/published data`, async () => {
  const h = harness(); const p = packageData(); p.representativeImage = 'data:image/jpeg;base64,Y292ZXI=';
  h.control.httpStatus = status; h.control.httpMessage = 'new row violates row-level security policy'; h.control.httpCode = 'AccessDenied';
  const before = JSON.stringify(h.db), draft = JSON.stringify(p);
  await assert.rejects(h.api.publishGuidePackage(p), e => {
    assert.equal(e.publishDiagnostic.bucket, 'guide-public');
    assert.equal(e.publishDiagnostic.pathOwnerMatchesAuth, true);
    assert.equal(e.publishDiagnostic.api, 'POST storage/v1/object');
    assert.equal(e.publishDiagnostic.code, 'AccessDenied');
    assert.match(e.detail, /Storage INSERT/); return true;
  });
  assert.equal(h.control.uploadNumber, 1);
  assert.equal(JSON.stringify(h.db), before); assert.equal(JSON.stringify(p), draft);
  assert.doesNotMatch(JSON.stringify(h.logs), /test-token|Bearer|sb_publishable/);
});

test('one transient network error is retried automatically', async () => {
  const h = harness(); h.control.failAt = 1; h.control.failCount = 1;
  await h.api.publishGuidePackage(packageData());
  assert.equal(h.control.uploadNumber, 6); assert.equal(h.objects.size, 5);
});

test('persistent HTTP 503 stops after three attempts without committing', async () => {
  const h = harness(); h.control.httpStatus = 503;
  await assert.rejects(h.api.publishGuidePackage(packageData()));
  assert.equal(h.control.uploadNumber, 3); assert.ok(!h.events.some(e => e.startsWith('rpc:')));
});

test('account switch after upload prevents the database commit', async () => {
  const h = harness(); const p = packageData(); p.videoFiles = [p.videoFiles[0]];
  await assert.rejects(h.api.publishGuidePackage(p, {onProgress: progress => {
    if (progress.percent === 91) h.control.verifiedUserId = '33333333-3333-4333-8333-333333333333';
  }}), /PUBLISH_AUTH_USER_MISMATCH/);
  assert.ok(!h.events.some(e => e.startsWith('rpc:')));
});

for (const kind of ['cover', 'none', 'photo', 'audio', 'video', 'mixed']) {
  test(`new guide ${kind}: all media uploaded before commit; repeat publish reuses objects`, async () => {
    const h = harness(); h.db.guides = []; h.db.guide_pins = []; h.db.guide_media = [];
    const p = packageData(); p.videoFiles = [];
    if (['cover', 'mixed'].includes(kind)) p.representativeImage = 'data:image/jpeg;base64,Y292ZXI=';
    for (const [type, mime] of [['photo', 'image/png'], ['audio', 'audio/webm'], ['video', 'video/mp4']]) {
      if ([type, 'mixed'].includes(kind)) p[type + 'Files'] = [{fileName: type, blob: new Blob([type], {type: mime}), pinId: 'local-pin', stopIndex: 0}];
    }
    await h.api.publishGuidePackage(p);
    assert.equal(h.db.guides[0].status, 'published');
    assert.equal(h.events.at(-1), 'rpc:publish_guide_atomic_v1');
    const count = h.control.uploadNumber;
    assert.equal(count, kind === 'none' ? 0 : kind === 'mixed' ? 4 : 1);
    p.tourName = 'Edited guide'; await h.api.publishGuidePackage(p);
    assert.equal(h.control.uploadNumber, count); assert.equal(h.db.guides[0].title, 'Edited guide');
  });
}
