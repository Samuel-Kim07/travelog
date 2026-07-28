// ==========================================
// Travelog Supabase Connector
// - Supabase as the online source of truth for published guides
// - Device/IndexedDB as the offline execution package store
// ==========================================

const TravelogSupabase = (() => {
  const SUPABASE_URL = 'https://jjpbdtkrvczibrvxcdzq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jvbxOVx6-qeeftz04og9vA_RUHGylCZ';
  const PUBLIC_BUCKET = 'guide-public';
  const MEDIA_BUCKET = 'guide-media';
  const OFFLINE_DB_NAME = 'travelog_offline_guides_v1';
  const OFFLINE_DB_VERSION = 1;
  const OFFLINE_STORE = 'guides';
  const OFFLINE_STATUS_KEY = 'travelog_offline_guide_status_v1';

  let client = null;
  let authWarningShown = false;

  function t(ko, en, ja) {
    return window.TravelogApp && typeof window.TravelogApp.t === 'function'
      ? window.TravelogApp.t(ko, en, ja)
      : ko;
  }

  function toast(message) {
    if (window.TravelogApp && typeof window.TravelogApp.showToast === 'function') {
      window.TravelogApp.showToast(message);
    }
  }

  function init() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('[Travelog Supabase] Supabase JS SDK is not loaded.');
      return null;
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  function getClient() {
    return client || init();
  }

  async function getSession() {
    const supabase = getClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Travelog Supabase] getSession failed:', error);
      return null;
    }
    return data?.session || null;
  }

  async function ensureSession(options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');

    const existing = await getSession();
    if (existing?.user) return existing;

    if (options.email && options.password) {
      const signedIn = await signInOrSignUpWithEmail(options.email, options.password, options.displayName || 'Travelog User');
      if (signedIn?.user || signedIn?.session?.user) {
        const session = await getSession();
        return session || signedIn.session || { user: signedIn.user };
      }
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data?.user) {
      return data.session || await getSession() || { user: data.user };
    }

    if (!authWarningShown) {
      authWarningShown = true;
      console.warn('[Travelog Supabase] Anonymous sign-in failed. Enable Anonymous Sign-Ins or use Email login.', error);
      toast(t(
        'Supabase 익명 로그인이 꺼져 있을 수 있습니다. 출간/구매/다운로드는 이메일 로그인 또는 Anonymous 설정 후 사용할 수 있습니다.',
        'Supabase anonymous login may be disabled. Publishing/purchase/download need Email login or Anonymous Auth.',
        'Supabase匿名ログインが無効の可能性があります。公開・購入・ダウンロードにはメールログインまたはAnonymous設定が必要です。'
      ));
    }

    throw error || new Error('SUPABASE_AUTH_REQUIRED');
  }

  async function signInOrSignUpWithEmail(email, password, displayName = 'Travelog User') {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '').trim();
    if (!cleanEmail || !cleanPassword) throw new Error('EMAIL_AND_PASSWORD_REQUIRED');

    let result = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
    if (!result.error && result.data?.user) return result.data;

    result = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          display_name: displayName || cleanEmail.split('@')[0]
        }
      }
    });
    if (result.error) throw result.error;
    return result.data;
  }

  async function connectLoginProvider(provider = 'Guest', profile = {}) {
    const displayName = profile?.nickname || profile?.displayName || 'Travelog User';
    if (provider === 'Email') {
      const email = window.prompt(t('Supabase 테스트 로그인 이메일을 입력해 주세요.', 'Enter a Supabase test login email.', 'Supabaseテストログインのメールを入力してください。'));
      if (!email) return { mode: 'local-only', user: null };
      const password = window.prompt(t('비밀번호를 입력해 주세요. 새 이메일이면 자동 가입을 시도합니다.', 'Enter a password. New emails will be signed up automatically.', 'パスワードを入力してください。新しいメールなら自動登録を試します。'));
      if (!password) return { mode: 'local-only', user: null };
      const data = await signInOrSignUpWithEmail(email, password, displayName);
      await syncProfile({ ...profile, nickname: displayName });
      return { mode: 'email', user: data?.user || data?.session?.user || null };
    }

    try {
      const session = await ensureSession({ displayName });
      await syncProfile({ ...profile, nickname: displayName });
      return { mode: 'anonymous', user: session?.user || null };
    } catch (error) {
      console.warn('[Travelog Supabase] Provider login fallback to local-only:', error);
      return { mode: 'local-only', user: null, error };
    }
  }

  async function syncProfile(profile = {}) {
    const supabase = getClient();
    if (!supabase) return null;
    let session = await getSession();
    if (!session?.user) {
      try { session = await ensureSession({ displayName: profile.nickname || 'Travelog User' }); }
      catch (error) { return null; }
    }
    const user = session?.user;
    if (!user?.id) return null;

    const profileRow = {
      id: user.id,
      display_name: profile.nickname || profile.displayName || user.email?.split('@')[0] || 'Travelog User',
      avatar_url: profile.avatarType === 'image' || profile.avatarType === 'presetImage' ? profile.avatarValue || null : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileRow, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      console.warn('[Travelog Supabase] Profile sync failed:', error);
      return null;
    }
    return data;
  }

  function readOfflineStatusMap() {
    try {
      const raw = localStorage.getItem(OFFLINE_STATUS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeOfflineStatus(guideId, patch) {
    if (!guideId) return null;
    const map = readOfflineStatusMap();
    map[guideId] = {
      ...(map[guideId] || {}),
      ...patch,
      guideId,
      updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem(OFFLINE_STATUS_KEY, JSON.stringify(map)); } catch (_) {}
    return map[guideId];
  }

  function getOfflineStatus(guideId) {
    return readOfflineStatusMap()[guideId] || { guideId, status: 'not_downloaded', offlineReady: false };
  }

  function openOfflineDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('INDEXEDDB_UNSUPPORTED'));
        return;
      }
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
          db.createObjectStore(OFFLINE_STORE, { keyPath: 'guideId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('OFFLINE_DB_OPEN_FAILED'));
    });
  }

  async function offlineDbPut(value) {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const req = tx.objectStore(OFFLINE_STORE).put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('OFFLINE_DB_PUT_FAILED'));
      tx.oncomplete = () => db.close();
    });
  }

  async function offlineDbGet(guideId) {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readonly');
      const req = tx.objectStore(OFFLINE_STORE).get(guideId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('OFFLINE_DB_GET_FAILED'));
      tx.oncomplete = () => db.close();
    });
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
    const [meta, body] = dataUrl.split(',');
    if (!meta || body === undefined) return null;
    const mimeMatch = meta.match(/^data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('BLOB_TO_DATA_URL_FAILED'));
      reader.readAsDataURL(blob);
    });
  }

  function safeName(value, fallback = 'travelog') {
    return String(value || fallback)
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 90) || fallback;
  }

  function guessExtension(mimeType = '', fallback = 'dat') {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('mpeg')) return 'mp3';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('json')) return 'json';
    if (mime.includes('text')) return 'txt';
    return fallback;
  }

  function stripBlobFields(item) {
    if (!item || typeof item !== 'object') return item;
    const { blob, objectUrl, ...rest } = item;
    return { ...rest };
  }

  function getPublicUrl(bucketName, path) {
    const supabase = getClient();
    if (!supabase || !bucketName || !path) return '';
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data?.publicUrl || '';
  }

  async function uploadBlob(bucketName, path, blob, options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    if (!(blob instanceof Blob)) throw new Error('INVALID_UPLOAD_BLOB');
    const { data, error } = await supabase.storage.from(bucketName).upload(path, blob, {
      contentType: blob.type || options.contentType || 'application/octet-stream',
      upsert: true
    });
    if (error) throw error;
    return data;
  }

  async function createGuideMediaRow({ guideId, pinId = null, mediaRole, bucketName, storagePath, blob, durationSeconds = null }) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('guide_media')
      .insert({
        guide_id: guideId,
        pin_id: pinId,
        media_role: mediaRole,
        bucket_name: bucketName,
        storage_path: storagePath,
        mime_type: blob?.type || 'application/octet-stream',
        file_size: blob?.size || 0,
        duration_seconds: durationSeconds
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  function getPackageIntroBlob(packageData, key) {
    const item = packageData?.[key];
    if (!item) return null;
    if (item.blob instanceof Blob) return item.blob;
    return dataUrlToBlob(item.dataUrl || item.url || '');
  }

  async function publishGuidePackage(packageData) {
    if (!packageData) throw new Error('PACKAGE_REQUIRED');
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const session = await ensureSession({ displayName: packageData.creator || 'Travelog Creator' });
    const userId = session?.user?.id;
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');

    const guideId = packageData.guideId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(guideId || ''))) {
      throw new Error('GUIDE_ID_MUST_BE_UUID');
    }

    await syncProfile({ nickname: packageData.creator || 'Travelog Creator' });

    const pinCount = (packageData.pins || []).length;
    const memoCount = (packageData.audioFiles || []).length + (packageData.videoFiles || []).length + (packageData.photoFiles || []).length + (packageData.textFiles || []).length;
    const couponCount = (packageData.eventCoupons || []).length;
    let totalBytes = 0;

    const { data: guide, error: guideError } = await supabase
      .from('guides')
      .upsert({
        id: guideId,
        author_id: userId,
        title: packageData.tourName || 'Travelog Guide',
        description: packageData.guideIntroText || '',
        intro_text: packageData.guideIntroText || '',
        status: 'draft',
        price_coins: Number(packageData.coinPrice || 0) || 0,
        version: 1,
        total_bytes: 0,
        pin_count: pinCount,
        memo_count: memoCount,
        coupon_count: couponCount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();
    if (guideError) throw guideError;

    // Re-publishing the same prepared package should not fail because of old draft rows.
    await supabase.from('guide_media').delete().eq('guide_id', guideId);
    await supabase.from('guide_pins').delete().eq('guide_id', guideId);

    let coverPath = '';
    const coverBlob = dataUrlToBlob(packageData.representativeImage || '');
    if (coverBlob) {
      const coverExt = guessExtension(coverBlob.type, 'jpg');
      coverPath = `guides/${guideId}/cover.${coverExt}`;
      await uploadBlob(PUBLIC_BUCKET, coverPath, coverBlob);
      totalBytes += coverBlob.size || 0;
      await createGuideMediaRow({ guideId, mediaRole: 'cover', bucketName: PUBLIC_BUCKET, storagePath: coverPath, blob: coverBlob });
    }

    const insertedPinsByLocalId = new Map();
    const insertedPinsByIndex = new Map();
    const orderedPins = (packageData.pins || []).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    for (const pin of orderedPins) {
      const { data: insertedPin, error: pinError } = await supabase
        .from('guide_pins')
        .insert({
          guide_id: guideId,
          pin_order: Number(pin.order || orderedPins.indexOf(pin) + 1),
          title: pin.nameKo || pin.name || pin.nameEn || `메모핀 ${pin.order || orderedPins.indexOf(pin) + 1}`,
          description: pin.description || pin.memoText || '',
          lat: Number(pin.lat),
          lng: Number(pin.lng),
          memo_type: ['text', 'audio', 'video', 'photo'].includes(pin.memoType) ? pin.memoType : (pin.type === 'video' || pin.type === 'audio' || pin.type === 'photo' ? pin.type : 'text'),
          memo_title: pin.memoTitle || pin.nameKo || pin.name || '',
          memo_text: pin.description || pin.memoText || '',
          trigger_radius_m: Number(pin.triggerRadius || 30) || 30
        })
        .select()
        .single();
      if (pinError) throw pinError;
      insertedPinsByLocalId.set(String(pin.id), insertedPin);
      insertedPinsByIndex.set(Number(pin.order || orderedPins.indexOf(pin) + 1) - 1, insertedPin);
    }

    const uploadMediaFile = async (file, role, folder, bucket = MEDIA_BUCKET) => {
      if (!file) return null;
      const blob = file.blob instanceof Blob ? file.blob : dataUrlToBlob(file.dataUrl || '');
      if (!blob) return null;
      const index = Number(file.stopIndex || 0);
      const pinRow = insertedPinsByLocalId.get(String(file.pinId || '')) || insertedPinsByIndex.get(index) || null;
      const ext = file.fileName && file.fileName.includes('.') ? file.fileName.split('.').pop() : guessExtension(blob.type, role.includes('video') ? 'webm' : role.includes('photo') ? 'png' : 'webm');
      const cleanFileName = safeName(file.fileName || `${role}_${index + 1}.${ext}`);
      const storagePath = `guides/${guideId}/${folder}/${String(index + 1).padStart(2, '0')}_${cleanFileName}`;
      await uploadBlob(bucket, storagePath, blob);
      totalBytes += blob.size || 0;
      return createGuideMediaRow({ guideId, pinId: pinRow?.id || null, mediaRole: role, bucketName: bucket, storagePath, blob, durationSeconds: file.durationSeconds || null });
    };

    const introAudioBlob = getPackageIntroBlob(packageData, 'guideIntroAudio');
    if (introAudioBlob) {
      const ext = guessExtension(introAudioBlob.type, 'webm');
      const path = `guides/${guideId}/intro/intro-audio.${ext}`;
      await uploadBlob(MEDIA_BUCKET, path, introAudioBlob);
      totalBytes += introAudioBlob.size || 0;
      await createGuideMediaRow({ guideId, mediaRole: 'intro_audio', bucketName: MEDIA_BUCKET, storagePath: path, blob: introAudioBlob });
    }

    const introVideoBlob = getPackageIntroBlob(packageData, 'guideIntroVideo');
    if (introVideoBlob) {
      const ext = guessExtension(introVideoBlob.type, 'webm');
      const path = `guides/${guideId}/intro/intro-video.${ext}`;
      await uploadBlob(MEDIA_BUCKET, path, introVideoBlob);
      totalBytes += introVideoBlob.size || 0;
      await createGuideMediaRow({ guideId, mediaRole: 'intro_video', bucketName: MEDIA_BUCKET, storagePath: path, blob: introVideoBlob });
    }

    for (const file of packageData.audioFiles || []) await uploadMediaFile(file, 'pin_audio', 'audio');
    for (const file of packageData.videoFiles || []) await uploadMediaFile(file, 'pin_video', 'video');
    for (const file of packageData.photoFiles || []) await uploadMediaFile(file, 'pin_photo', 'photo');

    const { data: finalGuide, error: updateError } = await supabase
      .from('guides')
      .update({
        cover_path: coverPath || null,
        status: 'published',
        total_bytes: totalBytes,
        pin_count: pinCount,
        memo_count: memoCount,
        coupon_count: couponCount,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', guideId)
      .select()
      .single();
    if (updateError) throw updateError;

    const guideCard = buildGuideCardFromSupabase(finalGuide || guide, orderedPins, [], {
      creatorName: packageData.creator,
      representativeImage: coverPath ? getPublicUrl(PUBLIC_BUCKET, coverPath) : packageData.representativeImage,
      fallbackCard: packageData.guideCard,
      isPurchased: false,
      offlineReady: false
    });

    // 작성자 화면에서는 방금 녹음/녹화한 로컬 DataURL도 유지해 즉시 미리보기/실행이 됩니다.
    guideCard.stops = (packageData.guideCard?.stops || guideCard.stops || []).map(stop => ({ ...stop }));
    guideCard.guideIntroAudio = packageData.guideIntroAudio ? stripBlobFields(packageData.guideIntroAudio) : null;
    guideCard.guideIntroVideo = packageData.guideIntroVideo ? stripBlobFields(packageData.guideIntroVideo) : null;

    return {
      guideId,
      guide: finalGuide,
      guideCard,
      totalBytes
    };
  }

  function normalizeSupabaseGuideRows(rawGuide) {
    const guide = rawGuide || {};
    const pins = Array.isArray(guide.guide_pins) ? guide.guide_pins : [];
    const media = Array.isArray(guide.guide_media) ? guide.guide_media : [];
    return { guide, pins, media };
  }

  function buildGuideCardFromSupabase(rawGuide, rawPins = null, rawMedia = null, options = {}) {
    const { guide, pins, media } = rawPins === null && rawMedia === null
      ? normalizeSupabaseGuideRows(rawGuide)
      : { guide: rawGuide || {}, pins: rawPins || [], media: rawMedia || [] };
    const guideId = guide.id || options.guideId;
    const coverUrl = options.representativeImage || (guide.cover_path ? getPublicUrl(PUBLIC_BUCKET, guide.cover_path) : '') || options.fallbackCard?.representativeImage || options.fallbackCard?.bg || '';
    const offlineStatus = getOfflineStatus(guideId);
    const pinMediaMap = new Map();

    (media || []).forEach(item => {
      if (!item?.pin_id) return;
      if (!pinMediaMap.has(item.pin_id)) pinMediaMap.set(item.pin_id, []);
      pinMediaMap.get(item.pin_id).push(item);
    });

    const stops = (pins || [])
      .slice()
      .sort((a, b) => Number(a.pin_order || 0) - Number(b.pin_order || 0))
      .map((pin, index) => {
        const mediaForPin = pinMediaMap.get(pin.id) || [];
        const audioItems = mediaForPin.filter(item => item.media_role === 'pin_audio');
        const videoItems = mediaForPin.filter(item => item.media_role === 'pin_video');
        const photoItems = mediaForPin.filter(item => item.media_role === 'pin_photo');
        const memoType = pin.memo_type || (videoItems.length ? 'video' : audioItems.length ? 'audio' : photoItems.length ? 'photo' : 'text');
        const makeRemoteInfo = item => ({
          title: pin.memo_title || pin.title || '',
          displayTitle: pin.memo_title || pin.title || '',
          memoTitle: pin.memo_title || pin.title || '',
          fileName: String(item.storage_path || '').split('/').pop(),
          storagePath: item.storage_path,
          bucketName: item.bucket_name,
          mimeType: item.mime_type || '',
          fileSize: Number(item.file_size || 0) || 0
        });
        return {
          id: pin.id || `pin-${index + 1}`,
          order: Number(pin.pin_order || index + 1),
          name: pin.title || `메모핀 ${index + 1}`,
          nameKo: pin.title || `메모핀 ${index + 1}`,
          nameEn: pin.title || `Memo Pin ${index + 1}`,
          nameJa: pin.title || `メモピン ${index + 1}`,
          lat: Number(pin.lat),
          lng: Number(pin.lng),
          description: pin.description || pin.memo_text || '',
          memoText: pin.memo_text || pin.description || '',
          memoTitle: pin.memo_title || pin.title || '',
          memoType,
          type: memoType,
          triggerRadius: Number(pin.trigger_radius_m || 30) || 30,
          linkedAudioFiles: audioItems.map(makeRemoteInfo),
          linkedVideoFiles: videoItems.map(makeRemoteInfo),
          linkedPhotoFiles: photoItems.map(makeRemoteInfo),
          linkedAudios: audioItems.map(item => String(item.storage_path || '').split('/').pop()),
          linkedVideos: videoItems.map(item => String(item.storage_path || '').split('/').pop()),
          linkedPhotos: photoItems.map(item => String(item.storage_path || '').split('/').pop())
        };
      });

    const card = {
      ...(options.fallbackCard || {}),
      id: guideId,
      name: guide.title || options.fallbackCard?.name || 'Travelog Guide',
      author: options.creatorName || options.fallbackCard?.author || 'Travelog Creator',
      rating: options.fallbackCard?.rating || 'NEW',
      bg: coverUrl || 'assets/images/brand/travelog-ci-symbol.svg',
      representativeImage: coverUrl,
      guideIntroText: guide.intro_text || guide.description || options.fallbackCard?.guideIntroText || '',
      badge: Number(guide.price_coins || 0) > 0 ? `${Number(guide.price_coins || 0).toLocaleString()} COIN` : 'Supabase · 무료',
      isPaid: Number(guide.price_coins || 0) > 0,
      coinPrice: Number(guide.price_coins || 0) || 0,
      monetization: { isPaid: Number(guide.price_coins || 0) > 0, coinPrice: Number(guide.price_coins || 0) || 0 },
      isPurchased: options.isPurchased === true || options.fallbackCard?.isPurchased === true,
      isWidget: options.fallbackCard?.isWidget !== false,
      isPublishedGuide: true,
      isSupabaseGuide: true,
      supabaseGuideId: guideId,
      version: guide.version || 1,
      totalBytes: Number(guide.total_bytes || 0) || 0,
      offlineReady: options.offlineReady === true || offlineStatus.offlineReady === true,
      offlineStatus: options.offlineReady === true || offlineStatus.offlineReady === true ? 'downloaded' : (offlineStatus.status || 'not_downloaded'),
      createdAt: guide.created_at || options.fallbackCard?.createdAt || new Date().toISOString(),
      pinCount: Number(guide.pin_count ?? stops.length ?? 0),
      memoCount: Number(guide.memo_count ?? 0),
      couponCount: Number(guide.coupon_count ?? 0),
      stops,
      eventCoupons: options.fallbackCard?.eventCoupons || []
    };
    return card;
  }

  async function fetchPublishedGuideCards() {
    const supabase = getClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('guides')
      .select('*, guide_pins(*)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) {
      console.warn('[Travelog Supabase] Published guide fetch failed:', error);
      return [];
    }
    return (data || []).map(guide => buildGuideCardFromSupabase(guide));
  }

  async function purchaseGuide(guideCard) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const session = await ensureSession({ displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User' });
    const userId = session?.user?.id;
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');
    const guideId = guideCard?.supabaseGuideId || guideCard?.id;
    const price = Number(guideCard?.coinPrice || guideCard?.priceCoins || guideCard?.monetization?.coinPrice || 0) || 0;

    const { data, error } = await supabase
      .from('guide_purchases')
      .upsert({
        guide_id: guideId,
        buyer_id: userId,
        price_paid: price
      }, { onConflict: 'guide_id,buyer_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function fetchCompleteGuide(guideId) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('guides')
      .select('*, guide_pins(*), guide_media(*)')
      .eq('id', guideId)
      .single();
    if (error) throw error;
    return data;
  }

  async function downloadMediaBlob(mediaRow) {
    const supabase = getClient();
    const { data, error } = await supabase.storage.from(mediaRow.bucket_name).download(mediaRow.storage_path);
    if (error) throw error;
    return data;
  }

  async function saveOfflineGuidePackage(guideId, guideRow, mediaBlobs) {
    const packageRecord = {
      guideId,
      guideRow,
      mediaBlobs,
      savedAt: new Date().toISOString(),
      version: guideRow.version || 1
    };
    await offlineDbPut(packageRecord);
    writeOfflineStatus(guideId, {
      status: 'downloaded',
      offlineReady: true,
      version: guideRow.version || 1,
      totalBytes: Number(guideRow.total_bytes || 0) || 0,
      downloadedAt: packageRecord.savedAt
    });
    return packageRecord;
  }

  async function buildOfflineCardFromPackage(packageRecord) {
    const rawGuide = packageRecord?.guideRow;
    if (!rawGuide) return null;
    const { guide, pins, media } = normalizeSupabaseGuideRows(rawGuide);
    const blobMap = new Map((packageRecord.mediaBlobs || []).map(item => [item.mediaId, item]));
    const card = buildGuideCardFromSupabase(guide, pins, media, { isPurchased: true, offlineReady: true });

    const cover = media.find(item => item.media_role === 'cover');
    if (cover && blobMap.get(cover.id)?.blob) {
      const coverBlob = blobMap.get(cover.id).blob;
      const coverUrl = URL.createObjectURL(coverBlob);
      card.representativeImage = coverUrl;
      card.bg = coverUrl;
    }

    const introAudio = media.find(item => item.media_role === 'intro_audio');
    const introVideo = media.find(item => item.media_role === 'intro_video');
    if (introAudio && blobMap.get(introAudio.id)?.blob) {
      const blob = blobMap.get(introAudio.id).blob;
      card.guideIntroAudio = {
        fileName: String(introAudio.storage_path || '').split('/').pop(),
        mimeType: introAudio.mime_type || blob.type || 'audio/webm',
        dataUrl: await blobToDataUrl(blob),
        objectUrl: URL.createObjectURL(blob)
      };
    }
    if (introVideo && blobMap.get(introVideo.id)?.blob) {
      const blob = blobMap.get(introVideo.id).blob;
      card.guideIntroVideo = {
        fileName: String(introVideo.storage_path || '').split('/').pop(),
        mimeType: introVideo.mime_type || blob.type || 'video/webm',
        dataUrl: await blobToDataUrl(blob),
        objectUrl: URL.createObjectURL(blob)
      };
    }

    const mediaByPin = new Map();
    media.forEach(row => {
      if (!row.pin_id) return;
      if (!mediaByPin.has(row.pin_id)) mediaByPin.set(row.pin_id, []);
      mediaByPin.get(row.pin_id).push(row);
    });

    card.stops = card.stops.map(stop => {
      const rows = mediaByPin.get(stop.id) || [];
      const attachLocalInfo = row => {
        const hit = blobMap.get(row.id);
        const blob = hit?.blob;
        const url = blob ? URL.createObjectURL(blob) : '';
        return {
          title: stop.memoTitle || stop.name || '',
          displayTitle: stop.memoTitle || stop.name || '',
          memoTitle: stop.memoTitle || stop.name || '',
          fileName: String(row.storage_path || '').split('/').pop(),
          storagePath: row.storage_path,
          bucketName: row.bucket_name,
          mimeType: row.mime_type || blob?.type || '',
          fileSize: Number(row.file_size || blob?.size || 0) || 0,
          url,
          objectUrl: url
        };
      };
      return {
        ...stop,
        linkedAudioFiles: rows.filter(row => row.media_role === 'pin_audio').map(attachLocalInfo),
        linkedVideoFiles: rows.filter(row => row.media_role === 'pin_video').map(attachLocalInfo),
        linkedPhotoFiles: rows.filter(row => row.media_role === 'pin_photo').map(attachLocalInfo)
      };
    });

    card.offlineReady = true;
    card.offlineStatus = 'downloaded';
    card.isPurchased = true;
    card.isWidget = true;
    return card;
  }

  async function getOfflineGuideCard(guideId) {
    const record = await offlineDbGet(guideId);
    if (!record) return null;
    return buildOfflineCardFromPackage(record);
  }

  async function downloadGuideOffline(guideId) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    await ensureSession({ displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User' });
    writeOfflineStatus(guideId, { status: 'downloading', offlineReady: false });

    const fullGuide = await fetchCompleteGuide(guideId);
    const mediaRows = Array.isArray(fullGuide.guide_media) ? fullGuide.guide_media : [];
    const mediaBlobs = [];

    for (const row of mediaRows) {
      if (!row) continue;
      const blob = await downloadMediaBlob(row);
      mediaBlobs.push({
        mediaId: row.id,
        role: row.media_role,
        pinId: row.pin_id,
        storagePath: row.storage_path,
        bucketName: row.bucket_name,
        mimeType: row.mime_type || blob.type || '',
        blob
      });
    }

    const packageRecord = await saveOfflineGuidePackage(guideId, fullGuide, mediaBlobs);

    try {
      await supabase
        .from('offline_downloads')
        .upsert({
          user_id: (await getSession())?.user?.id,
          guide_id: guideId,
          guide_version: fullGuide.version || 1,
          status: 'downloaded',
          total_bytes: Number(fullGuide.total_bytes || 0) || 0,
          downloaded_bytes: Number(fullGuide.total_bytes || 0) || 0,
          manifest_json: {
            guideId,
            version: fullGuide.version || 1,
            mediaFiles: mediaRows.map(row => ({ role: row.media_role, path: row.storage_path, size: row.file_size }))
          },
          offline_ready: true,
          downloaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,guide_id' });
    } catch (error) {
      console.warn('[Travelog Supabase] offline_downloads upsert failed:', error);
    }

    return buildOfflineCardFromPackage(packageRecord);
  }

  return {
    init,
    getClient,
    getSession,
    ensureSession,
    connectLoginProvider,
    syncProfile,
    publishGuidePackage,
    fetchPublishedGuideCards,
    purchaseGuide,
    downloadGuideOffline,
    getOfflineGuideCard,
    getOfflineStatus,
    constants: {
      SUPABASE_URL,
      PUBLIC_BUCKET,
      MEDIA_BUCKET
    }
  };
})();

window.TravelogSupabase = TravelogSupabase;
