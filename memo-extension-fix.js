(() => {
  'use strict';

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const COINS_PER_BLOCK = 500;
  let patched = false;

  function t(ko, en, ja) {
    if (window.TravelogApp && typeof window.TravelogApp.t === 'function') {
      return window.TravelogApp.t(ko, en, ja);
    }
    return ko;
  }

  function makeError(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function patchTravelogMemoExtension() {
    if (patched) return true;

    const mapModule = window.TravelogMapModule;
    const supabaseModule = window.TravelogSupabase;
    const app = window.TravelogApp;

    if (!mapModule || !supabaseModule || !app) return false;
    if (typeof mapModule.openMemoPinExtension !== 'function') return false;
    if (typeof supabaseModule.getClient !== 'function') return false;

    patched = true;

    /*
     * FIX 1
     * 기존 map.js는 '연장하기' 팝업을 여는 순간 Supabase profiles.coin_balance를
     * 다시 읽어 TravelogState.coins에 덮어씁니다.
     *
     * 현재 Travelog의 코인 충전/구매 잔액은 localStorage 기반 TravelogState.coins에
     * 저장되므로, 서버의 초기값 0이 로컬의 실제 보유 코인을 0으로 바꾸는 문제가 생깁니다.
     *
     * 연장 팝업을 열 때는 "조회"만 해야 하므로 코인 잔액을 덮어쓰지 않도록
     * 해당 호출에서만 profile의 coin 필드를 숨깁니다.
     */
    const originalOpenMemoPinExtension = mapModule.openMemoPinExtension.bind(mapModule);

    mapModule.openMemoPinExtension = async function fixedOpenMemoPinExtension(pinId) {
      const originalFetchCurrentProfile = supabaseModule.fetchCurrentProfile;

      if (typeof originalFetchCurrentProfile !== 'function') {
        return originalOpenMemoPinExtension(pinId);
      }

      supabaseModule.fetchCurrentProfile = async function profileWithoutCoinOverwrite(options = {}) {
        const profile = await originalFetchCurrentProfile.call(supabaseModule, options);
        if (!profile || typeof profile !== 'object') return profile;

        // 닉네임/프로필 정보는 그대로 두고 coin 필드만 이번 조회에서 제외합니다.
        const safeProfile = { ...profile };
        delete safeProfile.coinBalance;
        delete safeProfile.coin_balance;
        return safeProfile;
      };

      try {
        return await originalOpenMemoPinExtension(pinId);
      } finally {
        // 다른 기능은 원래 Supabase 프로필 조회를 그대로 사용해야 합니다.
        supabaseModule.fetchCurrentProfile = originalFetchCurrentProfile;
      }
    };

    /*
     * FIX 2
     * 현재 앱의 코인 시스템은 TravelogState.coins(localStorage) 기준인데
     * 기존 extend_memo_pin RPC는 Supabase profiles.coin_balance 기준이어서
     * 두 잔액이 서로 다르면 연장 시 코인이 0이 되거나 결제가 실패할 수 있습니다.
     *
     * 이 프로토타입에서는 연장 비용도 기존 앱과 동일한 로컬 코인을 기준으로 처리합니다.
     * 서버에는 본인 메모의 expires_at만 갱신하고,
     * 성공한 뒤 기존 map.js가 반환된 coin_balance 값을 setCoins()로 반영합니다.
     */
    supabaseModule.extendMemoPin = async function fixedExtendMemoPin(memoPinId, blocks) {
      const safeBlocks = Math.max(1, Math.min(52, Math.floor(Number(blocks) || 1)));
      const cost = safeBlocks * COINS_PER_BLOCK;

      const state = app.getState?.() || {};
      const currentBalance = Number(state.coins);

      if (!Number.isFinite(currentBalance) || currentBalance < cost) {
        throw makeError(
          'INSUFFICIENT_COINS',
          t('코인이 부족합니다.', 'Not enough coins.', 'コインが不足しています。')
        );
      }

      const supabase = supabaseModule.getClient();
      if (!supabase) {
        throw makeError('SUPABASE_SDK_NOT_READY', 'SUPABASE_SDK_NOT_READY');
      }

      let session = await supabaseModule.getSession?.();
      if (!session?.user?.id && typeof supabaseModule.ensureSession === 'function') {
        session = await supabaseModule.ensureSession({
          displayName: state?.userProfile?.nickname || 'Travelog User',
          interactiveLogin: true
        });
      }

      const userId = session?.user?.id || '';
      if (!userId) {
        throw makeError('SUPABASE_AUTH_REQUIRED', 'SUPABASE_AUTH_REQUIRED');
      }

      // 1) 반드시 본인이 소유한 메모인지 확인하고 현재 만료시각을 읽습니다.
      const { data: memoPin, error: readError } = await supabase
        .from('memo_pins')
        .select('id, owner_id, expires_at')
        .eq('id', memoPinId)
        .eq('owner_id', userId)
        .maybeSingle();

      if (readError) throw readError;
      if (!memoPin?.id) {
        throw makeError(
          'MEMO_PIN_NOT_FOUND_OR_NOT_OWNER',
          'MEMO_PIN_NOT_FOUND_OR_NOT_OWNER'
        );
      }

      // 이미 만료된 경우 현재 시간부터, 아직 유효하면 기존 만료시각부터 연장합니다.
      const now = Date.now();
      const previousExpiry = Date.parse(memoPin.expires_at || '');
      const baseTime = Number.isFinite(previousExpiry) && previousExpiry > now
        ? previousExpiry
        : now;
      const newExpiresAt = new Date(baseTime + safeBlocks * WEEK_MS).toISOString();

      // 2) 서버에서는 만료 기간만 갱신합니다.
      // owner_id 조건을 다시 걸어 타인의 메모를 수정할 수 없게 합니다.
      const { data: updated, error: updateError } = await supabase
        .from('memo_pins')
        .update({
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', memoPinId)
        .eq('owner_id', userId)
        .select('id, expires_at')
        .single();

      if (updateError) throw updateError;
      if (!updated?.id) {
        throw makeError(
          'MEMO_PIN_EXTENSION_UPDATE_FAILED',
          'MEMO_PIN_EXTENSION_UPDATE_FAILED'
        );
      }

      // 3) 기존 map.js가 이 값을 TravelogApp.setCoins()에 넣어 저장하게 됩니다.
      return {
        new_expires_at: updated.expires_at || newExpiresAt,
        coin_balance: Math.max(0, currentBalance - cost),
        charged_coins: cost,
        blocks: safeBlocks,
        source: 'travelog_local_coin_balance'
      };
    };

    console.info('[Travelog Memo Extension Fix] Local coin balance protection enabled.');
    return true;
  }

  function init() {
    if (patchTravelogMemoExtension()) return;

    // 스크립트 로딩 순서가 달라도 동작하도록 짧게 재시도합니다.
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (patchTravelogMemoExtension() || tries >= 40) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
