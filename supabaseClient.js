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
  const MEMO_PIN_MEDIA_BUCKET = 'memo-pin-media';
  const OFFLINE_DB_NAME = 'travelog_offline_guides_v1';
  const OFFLINE_DB_VERSION = 1;
  const OFFLINE_STORE = 'guides';
  const OFFLINE_STATUS_KEY = 'travelog_offline_guide_status_v1';
  const AUTO_GUEST_CREDENTIAL_KEY = 'travelog_supabase_auto_guest_v1';
  const DELETED_MESSAGE_BODY = '__TRAVELOG_MESSAGE_DELETED__';

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

  function isPasswordRecoveryRedirect() {
    try {
      const query = new URLSearchParams(window.location.search || '');
      const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      return query.get('type') === 'recovery'
        || hash.get('type') === 'recovery'
        || query.has('code')
        || query.has('token_hash') && query.get('type') === 'recovery'
        || hash.has('access_token') && hash.get('type') === 'recovery'
        || query.get('error_code') === 'otp_expired'
        || hash.get('error_code') === 'otp_expired';
    } catch (_) {
      return false;
    }
  }

  function getPasswordRecoveryRedirectError() {
    try {
      const query = new URLSearchParams(window.location.search || '');
      const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      const code = query.get('error_code') || hash.get('error_code') || '';
      const description = query.get('error_description') || hash.get('error_description') || '';
      return code || description ? { code, description } : null;
    } catch (_) {
      return null;
    }
  }

  function onAuthStateChange(callback) {
    const supabase = getClient();
    if (!supabase || typeof callback !== 'function') return null;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data?.subscription || null;
  }

  async function updatePassword(newPassword) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const cleanPassword = String(newPassword || '');
    if (cleanPassword.length < 8) {
      const error = new Error('PASSWORD_TOO_SHORT');
      error.code = 'PASSWORD_TOO_SHORT';
      throw error;
    }

    const session = await getSession();
    if (!session?.user) {
      const error = new Error('PASSWORD_RECOVERY_SESSION_MISSING');
      error.code = 'PASSWORD_RECOVERY_SESSION_MISSING';
      throw error;
    }

    const { data, error } = await supabase.auth.updateUser({ password: cleanPassword });
    if (error) throw error;
    return data?.user || null;
  }

  function clearPasswordRecoveryUrl() {
    try {
      const url = new URL(window.location.href);
      ['code', 'type', 'token', 'token_hash', 'access_token', 'refresh_token', 'expires_at', 'expires_in', 'error', 'error_code', 'error_description'].forEach(key => {
        url.searchParams.delete(key);
      });
      url.hash = '';
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
    } catch (_) {}
  }

  function randomToken() {
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(12);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getOrCreateAutoGuestCredentials(displayName = 'Travelog User') {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTO_GUEST_CREDENTIAL_KEY) || 'null');
      if (saved?.email && saved?.password) {
        return {
          email: saved.email,
          password: saved.password,
          displayName: saved.displayName || displayName
        };
      }
    } catch (_) {}

    const token = randomToken();
    const credentials = {
      email: `travelog_guest_${token}@example.com`,
      password: `Travelog-${token}-2026!`,
      displayName: displayName || 'Travelog User',
      createdAt: new Date().toISOString()
    };
    try { localStorage.setItem(AUTO_GUEST_CREDENTIAL_KEY, JSON.stringify(credentials)); } catch (_) {}
    return credentials;
  }

  async function ensureEmailSession(email, password, displayName = 'Travelog User', options = {}) {
    const signedIn = await signInOrSignUpWithEmail(email, password, displayName, options);
    const session = await getSession();
    if (session?.user) return session;
    if (signedIn?.session?.user) return signedIn.session;

    const err = new Error('SUPABASE_EMAIL_SESSION_REQUIRED');
    err.detail = t(
      '이메일 인증 확인이 켜져 있으면 세션을 만들 수 없습니다. Supabase Auth > Users에서 테스트 유저를 Auto Confirm으로 만들고 다시 로그인해 주세요.',
      'If email confirmation is enabled, a session cannot be created. Create an Auto Confirmed test user in Supabase Auth > Users and sign in again.',
      'メール認証が有効な場合、セッションを作成できません。Supabase Auth > UsersでAuto Confirm済みのテストユーザーを作成して再ログインしてください。'
    );
    throw err;
  }

  async function promptExistingEmailSession(displayName = 'Travelog User') {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');

    const email = window.prompt(t(
      'Supabase 출간에는 서버 로그인 세션이 필요합니다.\n\n이메일 rate limit 방지를 위해 자동 이메일 가입은 중단했습니다.\nSupabase Dashboard > Authentication > Users > Add user에서 만든 테스트 계정 이메일을 입력해 주세요.',
      'Publishing to Supabase requires a server login session.\n\nAutomatic email signup has been disabled to avoid email rate limits.\nEnter the test account email you created in Supabase Dashboard > Authentication > Users > Add user.',
      'Supabase公開にはサーバーログインセッションが必要です。\n\nメールrate limit回避のため自動メール登録は停止しました。\nSupabase Dashboard > Authentication > Users > Add userで作成したテストアカウントのメールを入力してください。'
    ));
    if (!email) {
      const err = new Error('SUPABASE_LOGIN_CANCELLED');
      err.detail = t('Supabase 로그인 입력이 취소되어 출간을 중단했습니다.', 'Supabase login was cancelled, so publishing was stopped.', 'Supabaseログインがキャンセルされたため公開を停止しました。');
      throw err;
    }

    const password = window.prompt(t(
      'Supabase 테스트 계정 비밀번호를 입력해 주세요.',
      'Enter the Supabase test account password.',
      'Supabaseテストアカウントのパスワードを入力してください。'
    ));
    if (!password) {
      const err = new Error('SUPABASE_LOGIN_CANCELLED');
      err.detail = t('Supabase 비밀번호 입력이 취소되어 출간을 중단했습니다.', 'Supabase password entry was cancelled, so publishing was stopped.', 'Supabaseパスワード入力がキャンセルされたため公開を停止しました。');
      throw err;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password).trim()
    });
    if (error) {
      const err = new Error('SUPABASE_EMAIL_LOGIN_FAILED');
      err.detail = t(
        `Supabase 테스트 계정 로그인에 실패했습니다: ${error.message}\n\n자동 가입은 email rate limit 때문에 실행하지 않습니다. Auth > Users에서 테스트 계정을 Auto Confirm으로 만든 뒤 다시 시도해 주세요.`,
        `Supabase test account sign-in failed: ${error.message}\n\nAutomatic signup is not run because of email rate limits. Create an Auto Confirmed test account in Auth > Users and try again.`,
        `Supabaseテストアカウントのログインに失敗しました: ${error.message}\n\nemail rate limit回避のため自動登録は実行しません。Auth > UsersでAuto Confirm済みテストアカウントを作成して再試行してください。`
      );
      throw err;
    }

    const session = data?.session || await getSession();
    if (!session?.user) {
      const err = new Error('SUPABASE_EMAIL_SESSION_REQUIRED');
      err.detail = t('로그인은 처리됐지만 세션이 만들어지지 않았습니다. 테스트 유저가 이메일 확인 완료 상태인지 확인해 주세요.', 'Sign-in was accepted but no session was created. Check that the test user is email-confirmed.', 'ログインは処理されましたがセッションが作成されませんでした。テストユーザーがメール確認済みか確認してください。');
      throw err;
    }

    const remoteProfile = await fetchCurrentProfile({ requireSession: false });
    if (!hasSavedRemoteProfile(remoteProfile)) {
      await syncProfile({ nickname: displayName });
    }
    toast(t('Supabase 테스트 계정으로 로그인했습니다. 다시 출간을 진행합니다.', 'Signed in with the Supabase test account. Continuing publishing.', 'Supabaseテストアカウントでログインしました。公開を続行します。'));
    return session;
  }

  async function ensureSession(options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');

    const existing = await getSession();
    if (existing?.user) return existing;

    if (options.email && options.password) {
      return ensureEmailSession(options.email, options.password, options.displayName || 'Travelog User', options);
    }

    // 1순위: Supabase Anonymous Auth. 켜져 있으면 게스트를 서버 유저로 만듭니다.
    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data?.session?.user) {
      return data.session;
    }
    if (!error && data?.user) {
      const session = await getSession();
      if (session?.user) return session;
    }

    // 중요: 이전 버전의 자동 이메일 가입 fallback은 모바일에서 email rate limit exceeded를 만들 수 있어 제거했습니다.
    // 출간/구매/다운로드처럼 서버 쓰기 작업은 사용자가 만든 기존 테스트 계정으로 로그인하게 합니다.
    try { localStorage.removeItem(AUTO_GUEST_CREDENTIAL_KEY); } catch (_) {}

    if (options.interactiveLogin === true) {
      return promptExistingEmailSession(options.displayName || 'Travelog User');
    }

    const err = error || new Error('SUPABASE_AUTH_REQUIRED');
    err.detail = t(
      'Supabase 로그인 세션이 없습니다. Anonymous Auth가 꺼져 있거나 사용할 수 없습니다. email rate limit 방지를 위해 자동 이메일 가입은 하지 않습니다. 출간할 때 Supabase Auth > Users에서 만든 테스트 계정으로 로그인해 주세요.',
      'No Supabase login session is available. Anonymous Auth is disabled or unavailable. Automatic email signup is not used to avoid email rate limits. Sign in with a test account created in Supabase Auth > Users when publishing.',
      'Supabaseログインセッションがありません。Anonymous Authが無効または利用できません。email rate limit回避のため自動メール登録は行いません。公開時にSupabase Auth > Usersで作成したテストアカウントでログインしてください。'
    );
    throw err;
  }

  async function signInOrSignUpWithEmail(email, password, displayName = 'Travelog User', options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '').trim();
    if (!cleanEmail || !cleanPassword) throw new Error('EMAIL_AND_PASSWORD_REQUIRED');

    let result = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
    if (!result.error && result.data?.user) return result.data;

    if (options.allowSignUp === false) {
      throw result.error || new Error('SUPABASE_EMAIL_LOGIN_FAILED');
    }

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
      const email = window.prompt(t('Supabase 테스트 계정 이메일을 입력해 주세요. 새 계정 자동 가입은 email rate limit 방지를 위해 하지 않습니다.', 'Enter your Supabase test account email. Automatic signup is disabled to avoid email rate limits.', 'Supabaseテストアカウントのメールを入力してください。email rate limit回避のため自動登録は行いません。'));
      if (email === null) return { mode: 'email', user: null, cancelled: true, cancelledAt: 'email' };
      if (!String(email).trim()) {
        const error = new Error('EMAIL_REQUIRED');
        error.code = 'EMAIL_REQUIRED';
        throw error;
      }
      const password = window.prompt(t('Supabase 테스트 계정 비밀번호를 입력해 주세요.', 'Enter the Supabase test account password.', 'Supabaseテストアカウントのパスワードを入力してください。'));
      if (password === null) return { mode: 'email', user: null, cancelled: true, cancelledAt: 'password' };
      if (!String(password).trim()) {
        const error = new Error('PASSWORD_REQUIRED');
        error.code = 'PASSWORD_REQUIRED';
        throw error;
      }

      let session;
      try {
        session = await ensureEmailSession(String(email).trim(), String(password).trim(), displayName, { allowSignUp: false });
      } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
          error.code = 'INVALID_LOGIN_CREDENTIALS';
        } else if (message.includes('email not confirmed')) {
          error.code = 'EMAIL_NOT_CONFIRMED';
        }
        throw error;
      }

      const remoteProfile = await fetchCurrentProfile({ requireSession: false });
      if (hasSavedRemoteProfile(remoteProfile)) {
        return { mode: 'email', user: session?.user || null, profile: remoteProfile, hasRemoteProfile: true };
      }
      return { mode: 'email', user: session?.user || null, profile: null, hasRemoteProfile: false };
    }

    try {
      const session = await ensureSession({ displayName, interactiveLogin: false });
      const remoteProfile = await fetchCurrentProfile({ requireSession: false });
      if (hasSavedRemoteProfile(remoteProfile)) {
        return { mode: 'anonymous', user: session?.user || null, profile: remoteProfile, hasRemoteProfile: true };
      }
      const syncedProfile = await syncProfile({ ...profile, nickname: displayName });
      return { mode: 'anonymous', user: session?.user || null, profile: syncedProfile, hasRemoteProfile: false };
    } catch (error) {
      console.warn('[Travelog Supabase] Provider login fallback to local-only:', error);
      return { mode: 'local-only', user: null, error };
    }
  }

  function normalizeProfileRow(row) {
    if (!row) return null;
    const displayName = row.display_name || row.displayName || row.name || 'Travelog User';
    return {
      id: row.id,
      supabaseProfileId: row.id,
      display_name: displayName,
      displayName,
      name: displayName,
      avatar_url: row.avatar_url || row.avatarUrl || '',
      avatarUrl: row.avatar_url || row.avatarUrl || '',
      coin_balance: typeof row.coin_balance === 'number' ? row.coin_balance : row.coinBalance,
      coinBalance: typeof row.coin_balance === 'number' ? row.coin_balance : row.coinBalance,
      created_at: row.created_at || row.createdAt || '',
      updated_at: row.updated_at || row.updatedAt || '',
      isFallbackProfile: row.isFallbackProfile === true
    };
  }

  function hasSavedRemoteProfile(row) {
    const profile = normalizeProfileRow(row);
    const name = String(profile?.displayName || '').trim();
    return !!name && profile?.isFallbackProfile !== true;
  }

  async function fetchCurrentProfile(options = {}) {
    const supabase = getClient();
    if (!supabase) return null;

    let session = await getSession();
    if (!session?.user && options.requireSession === true) {
      session = await ensureSession(options);
    }
    const user = session?.user;
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, coin_balance, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;

    if (data) return normalizeProfileRow(data);

    return normalizeProfileRow({
      id: user.id,
      display_name: user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Travelog User',
      avatar_url: user.user_metadata?.avatar_url || '',
      isFallbackProfile: true
    });
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

    const stableDisplayName = String(profile.nickname || profile.displayName || '').trim()
      || user.email?.split('@')[0]
      || 'Travelog User';
    const profileRow = {
      id: user.id,
      display_name: stableDisplayName,
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

    const metadataDisplayName = String(user.user_metadata?.display_name || '').trim();
    if (stableDisplayName && metadataDisplayName !== stableDisplayName) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { display_name: stableDisplayName }
      });
      if (metadataError) {
        console.warn('[Travelog Supabase] Auth nickname metadata sync failed:', metadataError);
      }
    }
    return normalizeProfileRow(data);
  }

  async function checkNicknameAvailability(nickname, options = {}) {
    const supabase = getClient();
    const cleanNickname = String(nickname || '').trim();
    if (!cleanNickname) return { available: false, reason: 'EMPTY_NICKNAME' };
    if (!supabase) return { available: true, reason: 'SUPABASE_UNAVAILABLE' };

    let session = await getSession();
    if (!session?.user && options.requireSession === true) {
      session = await ensureSession(options);
    }
    const currentUserId = session?.user?.id || '';
    const safeNickname = cleanNickname.replace(/[\%_]/g, '\\$&');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', safeNickname)
      .limit(10);
    if (error) throw error;

    const conflicts = (data || []).filter(row => {
      const sameUser = currentUserId && row.id === currentUserId;
      const sameName = String(row.display_name || '').trim().toLocaleLowerCase() === cleanNickname.toLocaleLowerCase();
      return !sameUser && sameName;
    });

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map(normalizeProfileRow)
    };
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

  function safeStorageSegment(value, fallback = 'travelog_file') {
    const raw = String(value || fallback).trim() || fallback;
    const dotIndex = raw.lastIndexOf('.');
    const hasExt = dotIndex > 0 && dotIndex < raw.length - 1;
    const rawBase = hasExt ? raw.slice(0, dotIndex) : raw;
    const rawExt = hasExt ? raw.slice(dotIndex + 1) : '';
    const cleanBase = rawBase
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 64) || fallback;
    const cleanExt = rawExt
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9]+/g, '')
      .slice(0, 12);
    return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase;
  }

  function makeStoragePath({ guideId, folder, index = 0, originalName = '', role = 'file', blob = null }) {
    const ext = originalName && originalName.includes('.')
      ? originalName.split('.').pop()
      : guessExtension(blob?.type || '', role.includes('video') ? 'webm' : role.includes('photo') ? 'png' : role.includes('audio') ? 'webm' : 'dat');
    const baseName = `${role}_${String(index + 1).padStart(2, '0')}_${Date.now()}.${ext}`;
    const safeFileName = safeStorageSegment(baseName, `${role}_${String(index + 1).padStart(2, '0')}.${ext}`);
    return `guides/${guideId}/${safeStorageSegment(folder, 'media')}/${safeFileName}`;
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

  function assertValidMediaBlob(blob, kind, label) {
    const expectedPrefix = kind === 'photo' ? 'image/' : `${kind}/`;
    if (!(blob instanceof Blob) || blob.size <= 0 || !String(blob.type || '').startsWith(expectedPrefix)) {
      const error = new Error('INVALID_MEDIA_FILE');
      error.detail = t(
        `${label}의 실제 원본 파일이 없거나 형식이 올바르지 않아 출간을 중단했습니다. 파일을 다시 등록해 주세요.`,
        `${label} is missing or invalid. Publishing was stopped; add the original file again.`,
        `${label}の元ファイルがないか形式が不正なため公開を中止しました。ファイルを再登録してください。`
      );
      throw error;
    }
    return blob;
  }

  function validatePublishMedia(packageData) {
    if (packageData.guideIntroAudio) assertValidMediaBlob(getPackageIntroBlob(packageData, 'guideIntroAudio'), 'audio', t('투어소개 음성', 'Intro audio', '紹介音声'));
    if (packageData.guideIntroVideo) assertValidMediaBlob(getPackageIntroBlob(packageData, 'guideIntroVideo'), 'video', t('투어소개 영상', 'Intro video', '紹介動画'));
    (packageData.audioFiles || []).forEach((file, index) => assertValidMediaBlob(file?.blob instanceof Blob ? file.blob : dataUrlToBlob(file?.dataUrl || ''), 'audio', `${index + 1}번 음성 메모`));
    (packageData.videoFiles || []).forEach((file, index) => assertValidMediaBlob(file?.blob instanceof Blob ? file.blob : dataUrlToBlob(file?.dataUrl || ''), 'video', `${index + 1}번 영상 메모`));
    (packageData.photoFiles || []).forEach((file, index) => assertValidMediaBlob(file?.blob instanceof Blob ? file.blob : dataUrlToBlob(file?.dataUrl || ''), 'photo', `${index + 1}번 사진 메모`));
  }

  async function publishGuidePackage(packageData, options = {}) {
    if (!packageData) throw new Error('PACKAGE_REQUIRED');
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    const totalMediaItems = Math.max(1,
      (packageData.representativeImage ? 1 : 0)
      + (packageData.guideIntroAudio ? 1 : 0)
      + (packageData.guideIntroVideo ? 1 : 0)
      + (packageData.audioFiles || []).length
      + (packageData.videoFiles || []).length
      + (packageData.photoFiles || []).length
    );
    let completedMediaItems = 0;
    const reportProgress = (percent, label, detail) => onProgress({ percent, label, detail });
    const reportMediaUploaded = label => {
      completedMediaItems += 1;
      reportProgress(
        30 + Math.round((completedMediaItems / totalMediaItems) * 50),
        t('미디어 업로드 중', 'Uploading media', 'メディアをアップロード中'),
        `${label} · ${completedMediaItems}/${totalMediaItems}`
      );
    };

    reportProgress(5, t('파일 검사 중', 'Checking files', 'ファイル確認中'), t('음성·영상·사진 원본을 검사하고 있습니다.', 'Checking original audio, video, and photo files.', '音声・動画・写真の元ファイルを確認しています。'));
    // Validate every real media source before deleting an existing published package.
    validatePublishMedia(packageData);
    reportProgress(10, t('서버 연결 중', 'Connecting to server', 'サーバー接続中'), t('사용자 인증을 확인하고 있습니다.', 'Checking the user session.', 'ユーザー認証を確認しています。'));
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const session = await ensureSession({ displayName: packageData.creator || 'Travelog Creator', interactiveLogin: true });
    const userId = session?.user?.id;
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');
    reportProgress(16, t('가이드 준비 중', 'Preparing guide', 'ガイド準備中'), t('기존 가이드 정보를 확인하고 있습니다.', 'Checking existing guide data.', '既存ガイド情報を確認しています。'));

    const guideId = packageData.guideId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(guideId || ''))) {
      throw new Error('GUIDE_ID_MUST_BE_UUID');
    }

    const pinCount = (packageData.pins || []).length;
    const memoCount = (packageData.audioFiles || []).length + (packageData.videoFiles || []).length + (packageData.photoFiles || []).length + (packageData.textFiles || []).length;
    const couponCount = (packageData.eventCoupons || []).length;
    let totalBytes = 0;

    const guideDraftRow = {
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
    };

    // Upload into temporary rows first. Existing published data stays intact until
    // every media file has passed upload verification.
    const { data: existingGuide } = await supabase
      .from('guides')
      .select('*')
      .eq('id', guideId)
      .maybeSingle();

    let guide = existingGuide;
    if (!existingGuide) {
      const { data: insertedGuide, error: guideError } = await supabase
        .from('guides')
        .insert(guideDraftRow)
        .select()
        .single();
      if (guideError) throw guideError;
      guide = insertedGuide;
    }

    const { data: oldMediaRows, error: oldMediaError } = await supabase
      .from('guide_media')
      .select('*')
      .eq('guide_id', guideId);
    if (oldMediaError) throw oldMediaError;
    const { data: oldPinRows, error: oldPinError } = await supabase
      .from('guide_pins')
      .select('*')
      .eq('guide_id', guideId);
    if (oldPinError) throw oldPinError;
    reportProgress(24, t('핀 정보 저장 중', 'Saving pins', 'ピン情報を保存中'), `${(packageData.pins || []).length}개 핀을 준비하고 있습니다.`);

    let coverPath = '';
    const coverBlob = dataUrlToBlob(packageData.representativeImage || '');
    if (coverBlob) {
      const coverExt = guessExtension(coverBlob.type, 'jpg');
      coverPath = `guides/${guideId}/cover.${coverExt}`;
      await uploadBlob(PUBLIC_BUCKET, coverPath, coverBlob);
      totalBytes += coverBlob.size || 0;
      await createGuideMediaRow({ guideId, mediaRole: 'cover', bucketName: PUBLIC_BUCKET, storagePath: coverPath, blob: coverBlob });
      reportMediaUploaded(t('대표 이미지', 'Cover image', '代表画像'));
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
      const kind = role === 'pin_video' ? 'video' : role === 'pin_photo' ? 'photo' : 'audio';
      assertValidMediaBlob(blob, kind, file.fileName || role);
      const index = Number(file.stopIndex || 0);
      const pinRow = insertedPinsByLocalId.get(String(file.pinId || '')) || insertedPinsByIndex.get(index) || null;
      const storagePath = makeStoragePath({
        guideId,
        folder,
        index,
        originalName: file.fileName || '',
        role,
        blob
      });
      await uploadBlob(bucket, storagePath, blob);
      totalBytes += blob.size || 0;
      const mediaRow = await createGuideMediaRow({ guideId, pinId: pinRow?.id || null, mediaRole: role, bucketName: bucket, storagePath, blob, durationSeconds: file.durationSeconds || null });
      reportMediaUploaded(file.fileName || role);
      return mediaRow;
    };

    const introAudioBlob = getPackageIntroBlob(packageData, 'guideIntroAudio');
    if (introAudioBlob) {
      const ext = guessExtension(introAudioBlob.type, 'webm');
      const path = `guides/${guideId}/intro/intro-audio.${ext}`;
      await uploadBlob(PUBLIC_BUCKET, path, introAudioBlob);
      totalBytes += introAudioBlob.size || 0;
      await createGuideMediaRow({ guideId, mediaRole: 'intro_audio', bucketName: PUBLIC_BUCKET, storagePath: path, blob: introAudioBlob });
      reportMediaUploaded(t('투어소개 음성', 'Intro audio', '紹介音声'));
    }

    const introVideoBlob = getPackageIntroBlob(packageData, 'guideIntroVideo');
    if (introVideoBlob) {
      const ext = guessExtension(introVideoBlob.type, 'webm');
      const path = `guides/${guideId}/intro/intro-video.${ext}`;
      await uploadBlob(PUBLIC_BUCKET, path, introVideoBlob);
      totalBytes += introVideoBlob.size || 0;
      await createGuideMediaRow({ guideId, mediaRole: 'intro_video', bucketName: PUBLIC_BUCKET, storagePath: path, blob: introVideoBlob });
      reportMediaUploaded(t('투어소개 영상', 'Intro video', '紹介動画'));
    }

    for (const file of packageData.audioFiles || []) await uploadMediaFile(file, 'pin_audio', 'audio');
    for (const file of packageData.videoFiles || []) await uploadMediaFile(file, 'pin_video', 'video');
    for (const file of packageData.photoFiles || []) await uploadMediaFile(file, 'pin_photo', 'photo');

    reportProgress(84, t('업로드 검사 중', 'Verifying uploads', 'アップロード確認中'), t('저장된 파일의 크기와 형식을 확인합니다.', 'Checking uploaded file sizes and formats.', '保存されたファイルのサイズと形式を確認しています。'));

    const expectedMediaCount = (coverBlob ? 1 : 0)
      + (introAudioBlob ? 1 : 0)
      + (introVideoBlob ? 1 : 0)
      + (packageData.audioFiles || []).length
      + (packageData.videoFiles || []).length
      + (packageData.photoFiles || []).length;
    const { data: allMediaAfterUpload, error: mediaCheckError } = await supabase
      .from('guide_media')
      .select('*')
      .eq('guide_id', guideId);
    if (mediaCheckError) throw mediaCheckError;
    const oldMediaIds = new Set((oldMediaRows || []).map(row => row.id));
    const uploadedMedia = (allMediaAfterUpload || []).filter(row => !oldMediaIds.has(row.id));
    const invalidUploadedMedia = uploadedMedia.some(row => Number(row.file_size || 0) <= 0 || ['pin_audio', 'intro_audio'].includes(row.media_role) && !String(row.mime_type || '').startsWith('audio/') || ['pin_video', 'intro_video'].includes(row.media_role) && !String(row.mime_type || '').startsWith('video/') || row.media_role === 'pin_photo' && !String(row.mime_type || '').startsWith('image/'));
    if (uploadedMedia.length !== expectedMediaCount || invalidUploadedMedia) {
      const error = new Error('MEDIA_UPLOAD_VERIFICATION_FAILED');
      error.detail = t('미디어 업로드 결과가 원본과 일치하지 않아 출간을 완료하지 않았습니다.', 'Media upload verification did not match the originals, so publishing was not completed.', 'メディアのアップロード結果が元データと一致しないため公開を完了しませんでした。');
      throw error;
    }

    if ((oldMediaRows || []).length > 0) {
      const { error: deleteOldMediaError } = await supabase
        .from('guide_media')
        .delete()
        .in('id', oldMediaRows.map(row => row.id));
      if (deleteOldMediaError) throw deleteOldMediaError;
    }
    if ((oldPinRows || []).length > 0) {
      const { error: deleteOldPinsError } = await supabase
        .from('guide_pins')
        .delete()
        .in('id', oldPinRows.map(row => row.id));
      if (deleteOldPinsError) throw deleteOldPinsError;
    }
    reportProgress(91, t('가이드 등록 중', 'Registering guide', 'ガイド登録中'), t('최종 가이드 정보로 교체하고 있습니다.', 'Finalizing the guide information.', '最終ガイド情報に更新しています。'));

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
    reportProgress(97, t('마무리 중', 'Finishing', '仕上げ中'), t('홈 화면용 가이드 정보를 만들고 있습니다.', 'Preparing the guide card for Home.', 'ホーム画面用のガイド情報を準備しています。'));

    const guideCard = buildGuideCardFromSupabase(finalGuide || guide, orderedPins, uploadedMedia || [], {
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
    reportProgress(100, t('출간 완료', 'Published', '公開完了'), t('가이드와 미디어 업로드가 완료되었습니다.', 'Guide and media upload complete.', 'ガイドとメディアのアップロードが完了しました。'));

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
    const introAudio = (media || []).find(item => item.media_role === 'intro_audio');
    const introVideo = (media || []).find(item => item.media_role === 'intro_video');
    const makeIntroInfo = item => item ? {
      fileName: String(item.storage_path || '').split('/').pop(),
      mimeType: item.mime_type || '',
      fileSize: Number(item.file_size || 0) || 0,
      bucketName: item.bucket_name,
      storagePath: item.storage_path,
      dataUrl: item.bucket_name === PUBLIC_BUCKET ? getPublicUrl(item.bucket_name, item.storage_path) : ''
    } : null;
    card.guideIntroAudio = makeIntroInfo(introAudio) || options.fallbackCard?.guideIntroAudio || null;
    card.guideIntroVideo = makeIntroInfo(introVideo) || options.fallbackCard?.guideIntroVideo || null;
    return card;
  }

  async function fetchPublishedGuideCards() {
    const supabase = getClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('guides')
      .select('*, guide_pins(*), guide_media(*)')
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
    const session = await ensureSession({ displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User', interactiveLogin: true });
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
    await ensureSession({ displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User', interactiveLogin: true });
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


  async function getCurrentUserId(options = {}) {
    const session = options.requireSession
      ? await ensureSession({ displayName: options.displayName || window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User', interactiveLogin: options.interactiveLogin === true })
      : await getSession();
    return session?.user?.id || '';
  }

  function normalizeFriendProfile(profile, friendship = null) {
    if (!profile?.id) return null;
    return {
      id: profile.id,
      supabaseProfileId: profile.id,
      friendshipId: friendship?.id || '',
      name: profile.display_name || 'Travelog User',
      memo: 'Supabase 친구',
      avatarUrl: profile.avatar_url || '',
      isSupabaseFriend: true,
      createdAt: friendship?.created_at || profile.created_at || new Date().toISOString()
    };
  }

  async function fetchFriends(options = {}) {
    const supabase = getClient();
    if (!supabase) return [];
    const userId = await getCurrentUserId(options);
    if (!userId) return [];

    const { data: rows, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const friendIds = [...new Set((rows || []).map(row => row.user_id === userId ? row.friend_id : row.user_id).filter(Boolean))];
    if (friendIds.length === 0) return [];

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .in('id', friendIds);
    if (profileError) throw profileError;

    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
    const friendshipByProfileId = new Map();
    (rows || []).forEach(row => {
      const profileId = row.user_id === userId ? row.friend_id : row.user_id;
      if (profileId && !friendshipByProfileId.has(profileId)) {
        friendshipByProfileId.set(profileId, row);
      }
    });
    return friendIds
      .map(profileId => normalizeFriendProfile(profileMap.get(profileId), friendshipByProfileId.get(profileId)))
      .filter(Boolean);
  }

  async function fetchFriendRequests(options = {}) {
    const supabase = getClient();
    if (!supabase) return [];
    const userId = await getCurrentUserId(options);
    if (!userId) return [];

    const { data: rows, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const requesterIds = [...new Set((rows || []).map(row => row.user_id).filter(Boolean))];
    if (requesterIds.length === 0) return [];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .in('id', requesterIds);
    if (profileError) throw profileError;
    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));

    return (rows || []).map(row => {
      const profile = profileMap.get(row.user_id) || {};
      return {
        id: row.id,
        requestId: row.id,
        requesterId: row.user_id,
        name: profile.display_name || 'Travelog User',
        avatarUrl: profile.avatar_url || '',
        createdAt: row.created_at || ''
      };
    });
  }

  async function fetchFriendFeedback(options = {}) {
    const supabase = getClient();
    if (!supabase) return [];
    const userId = await getCurrentUserId(options);
    if (!userId) return [];

    const { data: rows, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const recipientIds = [...new Set((rows || []).map(row => row.friend_id).filter(Boolean))];
    if (recipientIds.length === 0) return [];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', recipientIds);
    if (profileError) throw profileError;
    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));

    return (rows || []).map(row => ({
      id: row.id,
      requestId: row.id,
      recipientId: row.friend_id,
      name: profileMap.get(row.friend_id)?.display_name || 'Travelog User',
      createdAt: row.created_at || ''
    }));
  }

  async function searchProfiles(query, options = {}) {
    const supabase = getClient();
    if (!supabase) return [];
    const userId = await getCurrentUserId(options);
    if (!userId) return [];
    const cleanQuery = String(query || '').trim();
    if (cleanQuery.length < 2) return [];
    const safeQuery = cleanQuery.replace(/[\\%_]/g, '\\$&');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .ilike('display_name', `%${safeQuery}%`)
      .neq('id', userId)
      .limit(10);
    if (error) throw error;

    const { data: relationships, error: relationshipError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (relationshipError) throw relationshipError;

    const relationshipMap = new Map();
    (relationships || []).forEach(row => {
      const otherId = row.user_id === userId ? row.friend_id : row.user_id;
      if (!otherId || relationshipMap.has(otherId)) return;
      relationshipMap.set(otherId, {
        id: row.id,
        status: row.status,
        direction: row.user_id === userId ? 'outgoing' : 'incoming'
      });
    });
    return (data || [])
      .map(profile => ({
        id: profile.id,
        supabaseProfileId: profile.id,
        name: profile.display_name || 'Travelog User',
        avatarUrl: profile.avatar_url || '',
        memo: 'Supabase 유저',
        createdAt: profile.created_at || '',
        relationship: relationshipMap.get(profile.id) || null
      }));
  }

  async function requestFriend(profileId, options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const userId = await getCurrentUserId({ ...options, requireSession: true, interactiveLogin: options.interactiveLogin !== false });
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');
    if (!profileId || profileId === userId) throw new Error('INVALID_FRIEND_ID');

    const { data: existingRows, error: existingError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`and(user_id.eq.${userId},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${userId})`)
      .order('created_at', { ascending: false });
    if (existingError) throw existingError;

    const accepted = (existingRows || []).find(row => row.status === 'accepted');
    if (accepted) {
      const error = new Error('ALREADY_FRIENDS');
      error.code = 'ALREADY_FRIENDS';
      throw error;
    }
    const incomingPending = (existingRows || []).find(row => row.status === 'pending' && row.friend_id === userId);
    if (incomingPending) {
      const error = new Error('INCOMING_FRIEND_REQUEST_EXISTS');
      error.code = 'INCOMING_FRIEND_REQUEST_EXISTS';
      throw error;
    }
    const outgoingPending = (existingRows || []).find(row => row.status === 'pending' && row.user_id === userId);
    if (outgoingPending) return outgoingPending;

    const reverseRejectedIds = (existingRows || [])
      .filter(row => row.status === 'rejected' && row.user_id === profileId)
      .map(row => row.id);
    if (reverseRejectedIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from('friendships')
        .delete()
        .in('id', reverseRejectedIds);
      if (cleanupError) throw cleanupError;
    }

    const { data, error } = await supabase
      .from('friendships')
      .upsert({
        user_id: userId,
        friend_id: profileId,
        status: 'pending'
      }, { onConflict: 'user_id,friend_id' })
      .select('id, user_id, friend_id, status, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function respondToFriendRequest(requestId, action, options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const userId = await getCurrentUserId({ ...options, requireSession: true, interactiveLogin: options.interactiveLogin !== false });
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');
    const nextStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : '';
    if (!requestId || !nextStatus) throw new Error('INVALID_FRIEND_REQUEST_ACTION');

    const { data, error } = await supabase
      .from('friendships')
      .update({ status: nextStatus })
      .eq('id', requestId)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .select('id, user_id, friend_id, status, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function dismissFriendFeedback(requestId, options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const userId = await getCurrentUserId({ ...options, requireSession: true, interactiveLogin: options.interactiveLogin !== false });
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'rejected');
    if (error) throw error;
    return true;
  }

  const addFriend = requestFriend;

  async function deleteFriend(profileId, options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const userId = await getCurrentUserId({ ...options, requireSession: true, interactiveLogin: options.interactiveLogin !== false });
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${userId})`)
      .eq('status', 'accepted');
    if (error) throw error;
    return true;
  }

  async function sendMessage(receiverId, body, guideId = null, options = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const userId = await getCurrentUserId({ ...options, requireSession: true, interactiveLogin: options.interactiveLogin !== false });
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');
    const cleanBody = String(body || '').trim();
    if (!receiverId || !cleanBody) throw new Error('MESSAGE_TARGET_AND_BODY_REQUIRED');

    const payload = {
      sender_id: userId,
      receiver_id: receiverId,
      body: cleanBody
    };
    if (guideId) payload.guide_id = guideId;

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function fetchMessages(options = {}) {
    const supabase = getClient();
    if (!supabase) return [];
    const userId = await getCurrentUserId(options);
    if (!userId) return [];

    const { data: rows, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, guide_id, body, is_read, created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) throw error;

    const profileIds = [...new Set((rows || []).flatMap(row => [row.sender_id, row.receiver_id]).filter(Boolean))];
    let profileMap = new Map();
    if (profileIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);
      if (profileError) throw profileError;
      profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
    }

    return (rows || []).filter(row => row.body !== DELETED_MESSAGE_BODY).map(row => {
      const isMine = row.sender_id === userId;
      const senderProfile = profileMap.get(row.sender_id);
      const receiverProfile = profileMap.get(row.receiver_id);
      const senderName = senderProfile?.display_name || 'Travelog User';
      const receiverName = receiverProfile?.display_name || 'Travelog User';
      return {
        id: row.id,
        supabaseMessageId: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        sender: isMine ? `나 → ${receiverName}` : senderName,
        date: String(row.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
        body: row.body || '',
        unread: !isMine && row.is_read !== true,
        isMine,
        isRemote: true,
        guideId: row.guide_id || null
      };
    });
  }

  async function markMessageRead(messageId) {
    const supabase = getClient();
    if (!supabase || !messageId) return false;
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
    if (error) {
      console.warn('[Travelog Supabase] markMessageRead failed:', error);
      return false;
    }
    return true;
  }

  async function deleteMessage(messageId) {
    const supabase = getClient();
    if (!supabase || !messageId) return false;
    // 현재 RLS는 receiver_id = auth.uid()인 쪽지에 update를 허용하므로,
    // 실제 행 삭제 대신 삭제 표시값으로 soft-delete 처리하고 fetch 단계에서 숨깁니다.
    const { error } = await supabase
      .from('messages')
      .update({ body: DELETED_MESSAGE_BODY, is_read: true })
      .eq('id', messageId);
    if (error) {
      console.warn('[Travelog Supabase] deleteMessage failed:', error);
      return false;
    }
    return true;
  }

  function normalizeMemoPinRow(row, currentUserId = '') {
    if (!row) return null;
    const profile = row.profiles || row.owner_profile || null;
    const isOwner = !!currentUserId && row.owner_id === currentUserId;
    const currentNickname = isOwner
      ? String(window.TravelogApp?.getState?.()?.userProfile?.nickname || '').trim()
      : '';
    return {
      id: row.id,
      ownerId: row.owner_id,
      ownerName: String(profile?.display_name || row.metadata?.owner_nickname || currentNickname || '').trim(),
      title: row.title || t('메모 핀', 'Memo Pin', 'メモピン'),
      memoType: row.memo_type || 'text',
      content: row.content || '',
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      mediaBucket: row.media_bucket || '',
      mediaPath: row.media_path || '',
      mediaMimeType: row.media_mime_type || '',
      mediaSizeBytes: Number(row.media_size_bytes || 0),
      mediaUrl: row.media_url || '',
      metadata: row.metadata || {},
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      expiresAt: row.expires_at || '',
      isOwner,
      isRemote: true
    };
  }

  async function attachMemoPinSignedUrl(row, currentUserId = '') {
    const normalized = normalizeMemoPinRow(row, currentUserId);
    if (!normalized?.mediaBucket || !normalized.mediaPath) return normalized;
    const supabase = getClient();
    const { data, error } = await supabase.storage
      .from(normalized.mediaBucket)
      .createSignedUrl(normalized.mediaPath, 3600);
    if (!error) normalized.mediaUrl = data?.signedUrl || '';
    return normalized;
  }

  async function fetchActiveMemoPins(options = {}) {
    const supabase = getClient();
    if (!supabase) return [];
    let session = await getSession();
    if (!session?.user && options.requireSession === true) {
      session = await ensureSession({
        displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User',
        interactiveLogin: options.interactiveLogin === true
      });
    }
    const userId = session?.user?.id || '';
    if (!userId) return [];

    const { data, error } = await supabase
      .from('memo_pins')
      .select('id, owner_id, title, memo_type, content, latitude, longitude, media_bucket, media_path, media_mime_type, media_size_bytes, metadata, created_at, updated_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return Promise.all((data || []).map(row => attachMemoPinSignedUrl(row, userId)));
  }

  function makeMemoPinId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4000-8000-${Math.random().toString(16).slice(2, 14)}`;
  }

  async function createMemoPin(payload = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const session = await ensureSession({
      displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User',
      interactiveLogin: true
    });
    const userId = session?.user?.id;
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');

    const pinId = makeMemoPinId();
    const memoType = ['audio', 'video', 'photo', 'text'].includes(payload.memoType) ? payload.memoType : 'text';
    const title = String(payload.title || '').trim().slice(0, 60) || t('메모 핀', 'Memo Pin', 'メモピン');
    const content = String(payload.content || '').trim().slice(0, 2000);
    const blob = payload.blob instanceof Blob ? payload.blob : null;
    let mediaPath = '';

    if (blob) {
      const extension = guessExtension(blob.type, memoType === 'photo' ? 'png' : memoType === 'video' ? 'webm' : 'webm');
      const fileName = safeStorageSegment(`${memoType}_${Date.now()}.${extension}`, `${memoType}.${extension}`);
      mediaPath = `${userId}/${pinId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(MEMO_PIN_MEDIA_BUCKET)
        .upload(mediaPath, blob, { contentType: blob.type || 'application/octet-stream', upsert: false });
      if (uploadError) throw uploadError;
    }

    const row = {
      id: pinId,
      owner_id: userId,
      title,
      memo_type: memoType,
      content,
      latitude: Number(payload.lat),
      longitude: Number(payload.lng),
      media_bucket: mediaPath ? MEMO_PIN_MEDIA_BUCKET : null,
      media_path: mediaPath || null,
      media_mime_type: blob?.type || null,
      media_size_bytes: blob?.size || null,
      metadata: {
        ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
        owner_nickname: String(window.TravelogApp?.getState?.()?.userProfile?.nickname || '').trim()
      }
    };

    const { data, error } = await supabase.from('memo_pins').insert(row).select().single();
    if (error) {
      if (mediaPath) {
        try { await supabase.storage.from(MEMO_PIN_MEDIA_BUCKET).remove([mediaPath]); } catch (_) {}
      }
      throw error;
    }
    return attachMemoPinSignedUrl(data, userId);
  }

  async function extendMemoPin(memoPinId, blocks) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const session = await ensureSession({
      displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User',
      interactiveLogin: true
    });
    if (!session?.user?.id) throw new Error('SUPABASE_AUTH_REQUIRED');
    const safeBlocks = Math.max(1, Math.min(52, Math.floor(Number(blocks) || 1)));
    const { data, error } = await supabase.rpc('extend_memo_pin', {
      p_memo_pin_id: memoPinId,
      p_blocks: safeBlocks
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function deleteMemoPin(memoPin) {
    const supabase = getClient();
    if (!supabase || !memoPin?.id) return false;
    const { error } = await supabase.from('memo_pins').delete().eq('id', memoPin.id);
    if (error) throw error;
    if (memoPin.mediaBucket && memoPin.mediaPath) {
      await supabase.storage.from(memoPin.mediaBucket).remove([memoPin.mediaPath]).catch(() => {});
    }
    return true;
  }

  async function recordAccessRegion(payload = {}) {
    const supabase = getClient();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');
    const session = await getSession();
    const userId = session?.user?.id || '';
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');

    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error('INVALID_ACCESS_REGION_COORDINATES');
    }

    const accuracy = Math.max(0, Number(payload.accuracy) || 0);
    const row = {
      user_id: userId,
      access_date: new Date().toISOString().slice(0, 10),
      latitude_rounded: Math.round(latitude * 100) / 100,
      longitude_rounded: Math.round(longitude * 100) / 100,
      accuracy_bucket_m: Math.min(50000, Math.ceil(accuracy / 100) * 100),
      timezone: String(payload.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC').slice(0, 80),
      locale: String(payload.locale || navigator.language || 'unknown').slice(0, 35),
      consent_version: 'travelog-access-region-v1',
      captured_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_access_regions')
      .upsert(row, { onConflict: 'user_id,access_date' })
      .select('id, user_id, access_date, latitude_rounded, longitude_rounded, accuracy_bucket_m, timezone, locale, captured_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const supabase = getClient();
    if (!supabase) return true;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  }

  return {
    init,
    getClient,
    getSession,
    isPasswordRecoveryRedirect,
    getPasswordRecoveryRedirectError,
    onAuthStateChange,
    updatePassword,
    clearPasswordRecoveryUrl,
    ensureSession,
    connectLoginProvider,
    syncProfile,
    checkNicknameAvailability,
    fetchCurrentProfile,
    signOut,
    searchProfiles,
    fetchFriends,
    fetchFriendRequests,
    fetchFriendFeedback,
    requestFriend,
    respondToFriendRequest,
    dismissFriendFeedback,
    addFriend,
    deleteFriend,
    sendMessage,
    fetchMessages,
    markMessageRead,
    deleteMessage,
    fetchActiveMemoPins,
    createMemoPin,
    extendMemoPin,
    deleteMemoPin,
    recordAccessRegion,
    publishGuidePackage,
    fetchPublishedGuideCards,
    purchaseGuide,
    downloadGuideOffline,
    getOfflineGuideCard,
    getOfflineStatus,
    constants: {
      SUPABASE_URL,
      PUBLIC_BUCKET,
      MEDIA_BUCKET,
      MEMO_PIN_MEDIA_BUCKET
    }
  };
})();

window.TravelogSupabase = TravelogSupabase;
