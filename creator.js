// ==========================================
// Travelog Creator Studio Module
// ==========================================

const TravelogCreatorModule = (() => {
  function t(ko, en, ja) {
    return window.TravelogApp && typeof window.TravelogApp.t === 'function' ? window.TravelogApp.t(ko, en, ja) : ko;
  }

  function pick(source, baseKey) {
    return window.TravelogApp && typeof window.TravelogApp.pickLocalized === 'function' ? window.TravelogApp.pickLocalized(source, baseKey) : (source?.[`${baseKey}Ko`] || source?.[`${baseKey}En`] || source?.[`${baseKey}Ja`] || '');
  }

  // Voice & Video state variables
  let isRecording = false;
  let recordInterval = null;
  let recordSeconds = 0;
  let mediaRecorder = null;
  let recordedAudioChunks = [];
  let recordingStream = null;
  let selectedScriptText = '';
  let currentRecordingMimeType = '';
  let recordingMode = 'simulated';

  let recordedAudios = [];

  let isVideoRecording = false;
  let videoRecordInterval = null;
  let videoRecordSeconds = 0;
  let videoMediaRecorder = null;
  let recordedVideoChunks = [];
  let videoStream = null;
  let recordedVideos = [];

  // Temporary coordinate caching for field captures
  let tempPinLat = 0;
  let tempPinLng = 0;

  const DRIVE_PARENT_FOLDER_ID = '15zekqgQLbqiUasOg7wUNO8MIIvo5ROY-';
  const DRIVE_PARENT_FOLDER_URL = 'https://drive.google.com/drive/folders/15zekqgQLbqiUasOg7wUNO8MIIvo5ROY-?usp=drive_link';
  const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwXJ0Bk3FljLvY274QfQrKNnl_Cc_b9-O3vqBnektWX2rOVmlNIYvGSHu5iNW6Zdr0slg/exec';
  const APPS_SCRIPT_PUBLISH_KEY_STORAGE_KEY = 'travelog_apps_script_publish_key';
  const DEFAULT_APPS_SCRIPT_PUBLISH_KEY = ''; // Apps Script에서 PUBLISH_KEY를 비워두었다면 그대로 사용
  const GUIDE_COVER_STORAGE_KEY = 'travelog_creator_guide_cover_v1';
  const GUIDE_INTRO_TEXT_STORAGE_KEY = 'travelog_creator_guide_intro_text_v1';
  const CREATOR_PUBLISHED_GUIDES_KEY = 'travelog_creator_published_guides_v1';
  const REGISTERED_COUPONS_STORAGE_KEY = 'travelog_creator_registered_coupons_v1';
  const EVENT_COUPON_CATALOG = {
    '황궁쟁반짜장': ['짜장세트 30%할인권'],
    '천종원 우삼겹 식당': ['우삼겹1인분무료쿠폰', '2인정식세트30%할인권'],
    '나이키 서초점': ['전품목40%할인권']
  };
  let pendingPublishPackage = null;
  let guideCoverDataUrl = '';
  let guideIntroAudio = null;
  let guideIntroVideo = null;
  let registeredCoupons = [];
  let editingPublishedGuideId = null;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeParseArray(raw, fallback = []) {
    try {
      const parsed = raw ? JSON.parse(raw) : fallback;
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function getGuideCoverDataUrl() {
    return guideCoverDataUrl || localStorage.getItem(GUIDE_COVER_STORAGE_KEY) || '';
  }

  function setGuideCoverPreview(dataUrl) {
    guideCoverDataUrl = dataUrl || '';
    const preview = document.getElementById('guide-cover-preview');
    const empty = document.getElementById('guide-cover-empty');
    if (!preview) return;

    if (guideCoverDataUrl) {
      preview.style.backgroundImage = `url('${guideCoverDataUrl}')`;
      if (empty) empty.style.display = 'none';
    } else {
      preview.style.backgroundImage = '';
      if (empty) empty.style.display = 'block';
    }
  }

  function initGuideCoverUploader() {
    setGuideCoverPreview(localStorage.getItem(GUIDE_COVER_STORAGE_KEY) || '');

    const input = document.getElementById('guide-cover-input');
    const selectBtn = document.getElementById('guide-cover-select-btn');
    const clearBtn = document.getElementById('guide-cover-clear-btn');

    if (selectBtn && input) {
      selectBtn.addEventListener('click', () => input.click());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        localStorage.removeItem(GUIDE_COVER_STORAGE_KEY);
        setGuideCoverPreview('');
        window.TravelogApp.showToast(t('대표 이미지를 삭제했습니다.', 'Guide cover removed.', '代表画像を削除しました。'));
      });
    }

    if (input) {
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          window.TravelogApp.showToast(t('이미지 파일을 선택해 주세요.', 'Please choose an image file.', '画像ファイルを選択してください。'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          try {
            localStorage.setItem(GUIDE_COVER_STORAGE_KEY, dataUrl);
          } catch (error) {
            console.warn('[Travelog Creator] Guide cover could not be persisted:', error);
          }
          setGuideCoverPreview(dataUrl);
          window.TravelogApp.showToast(t('가이드 대표 이미지가 적용되었습니다.', 'Guide cover image applied.', '代表画像を適用しました。'));
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function getGuideIntroText() {
    return (document.getElementById('guide-intro-text')?.value || localStorage.getItem(GUIDE_INTRO_TEXT_STORAGE_KEY) || '').trim();
  }

  function setGuideIntroMediaStatus(kind, fileName) {
    const el = document.getElementById(kind === 'audio' ? 'guide-intro-audio-status' : 'guide-intro-video-status');
    if (el) el.textContent = fileName || (kind === 'audio' ? '선택된 음성 없음' : '선택된 영상 없음');
  }

  function makeIntroMediaFromFile(file, kind) {
    if (!file) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        type: kind,
        fileName: file.name,
        mimeType: file.type || (kind === 'video' ? 'video/webm' : 'audio/webm'),
        size: file.size || 0,
        dataUrl: String(reader.result || ''),
        createdAt: new Date().toISOString()
      });
      reader.onerror = () => reject(reader.error || new Error('INTRO_MEDIA_READ_FAILED'));
      reader.readAsDataURL(file);
    });
  }

  function initGuideIntroBuilder() {
    const textArea = document.getElementById('guide-intro-text');
    if (textArea) {
      textArea.value = localStorage.getItem(GUIDE_INTRO_TEXT_STORAGE_KEY) || '';
      textArea.addEventListener('input', () => {
        try { localStorage.setItem(GUIDE_INTRO_TEXT_STORAGE_KEY, textArea.value || ''); } catch (_) {}
      });
    }

    const audioInput = document.getElementById('guide-intro-audio-input');
    const audioSelectBtn = document.getElementById('guide-intro-audio-select-btn');
    const audioClearBtn = document.getElementById('guide-intro-audio-clear-btn');
    const videoInput = document.getElementById('guide-intro-video-input');
    const videoSelectBtn = document.getElementById('guide-intro-video-select-btn');
    const videoClearBtn = document.getElementById('guide-intro-video-clear-btn');

    if (audioSelectBtn && audioInput) audioSelectBtn.addEventListener('click', () => audioInput.click());
    if (videoSelectBtn && videoInput) videoSelectBtn.addEventListener('click', () => videoInput.click());

    if (audioClearBtn) audioClearBtn.addEventListener('click', () => {
      guideIntroAudio = null;
      if (audioInput) audioInput.value = '';
      setGuideIntroMediaStatus('audio', '');
      window.TravelogApp?.showToast(t('투어소개 음성을 삭제했습니다.', 'Intro audio removed.', '紹介音声を削除しました。'));
    });

    if (videoClearBtn) videoClearBtn.addEventListener('click', () => {
      guideIntroVideo = null;
      if (videoInput) videoInput.value = '';
      setGuideIntroMediaStatus('video', '');
      window.TravelogApp?.showToast(t('투어소개 영상을 삭제했습니다.', 'Intro video removed.', '紹介動画を削除しました。'));
    });

    if (audioInput) audioInput.addEventListener('change', async () => {
      const file = audioInput.files && audioInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        window.TravelogApp?.showToast(t('오디오 파일을 선택해 주세요.', 'Please choose an audio file.', 'オーディオファイルを選択してください。'));
        return;
      }
      guideIntroAudio = await makeIntroMediaFromFile(file, 'audio');
      setGuideIntroMediaStatus('audio', file.name);
      window.TravelogApp?.showToast(t('투어소개 음성이 등록되었습니다.', 'Intro audio added.', '紹介音声を登録しました。'));
    });

    if (videoInput) videoInput.addEventListener('change', async () => {
      const file = videoInput.files && videoInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('video/')) {
        window.TravelogApp?.showToast(t('비디오 파일을 선택해 주세요.', 'Please choose a video file.', 'ビデオファイルを選択してください。'));
        return;
      }
      guideIntroVideo = await makeIntroMediaFromFile(file, 'video');
      setGuideIntroMediaStatus('video', file.name);
      window.TravelogApp?.showToast(t('투어소개 영상이 등록되었습니다.', 'Intro video added.', '紹介動画を登録しました。'));
    });
  }

  // Field Voice Memo States
  let voiceMemoChunks = [];
  let voiceMemoRecorder = null;
  let voiceMemoStream = null;
  let voiceMemoBlob = null;
  let voiceMemoSeconds = 0;
  let voiceMemoInterval = null;

  // Field Video Memo States
  let videoMemoChunks = [];
  let videoMemoRecorder = null;
  let videoMemoStream = null;
  let videoMemoBlob = null;
  let videoMemoSeconds = 0;
  let videoMemoInterval = null;

  function init() {
    loadRegisteredCoupons();
    initGuideCoverUploader();
    initGuideIntroBuilder();
    bindCouponControlPanel();
    bindGuideEditModal();
    renderCoordinatesList();
    renderAudioList();
    renderVideoList();
    renderRegisteredCouponList();
    renderPublishedGuidesList();
    updatePublishPanelCounts();

    // Bind Planner actions
    const clearPinsBtn = document.getElementById('clear-pins-btn');
    if (clearPinsBtn) {
      clearPinsBtn.addEventListener('click', clearPins);
    }
    const saveTourBtn = document.getElementById('save-tour-btn');
    if (saveTourBtn) {
      saveTourBtn.addEventListener('click', saveTour);
    }

    const connectPinsBtn = document.getElementById('connect-pins-btn');
    if (connectPinsBtn) {
      connectPinsBtn.addEventListener('click', connectPinsOnMap);
    }

    const previewGuideBtn = document.getElementById('preview-current-guide-btn');
    if (previewGuideBtn) {
      previewGuideBtn.addEventListener('click', previewCurrentGuide);
    }

    // Bind Final Publish Action
    const finalPublishBtn = document.getElementById('publish-final-tour-btn');
    if (finalPublishBtn) {
      finalPublishBtn.addEventListener('click', saveTour);
    }

    const publishDriveUploadBtn = document.getElementById('publish-drive-upload-btn');
    if (publishDriveUploadBtn) {
      publishDriveUploadBtn.addEventListener('click', publishPreparedGuideToDrive);
    }

    const publishReadyCloseBtn = document.getElementById('publish-ready-close-btn');
    if (publishReadyCloseBtn) {
      publishReadyCloseBtn.addEventListener('click', closePublishModal);
    }

    // Recording actions
    document.getElementById('record-audio-btn').addEventListener('click', toggleRecording);
    document.getElementById('record-video-btn').addEventListener('click', toggleVideoRecording);

    // Script template clicks
    const scriptBtns = document.querySelectorAll('[data-script]');
    scriptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedScriptText = btn.textContent.trim();
        window.TravelogApp.showToast(t('스크립트 템플릿 로드 완료', 'Script template loaded', 'スクリプトテンプレートを読み込みました'));
        const statusText = document.getElementById('record-status-text');
        statusText.textContent = t(`읽어주세요: ${btn.textContent}`, `Read aloud: ${btn.textContent}`, `読み上げてください：${btn.textContent}`);
      });
    });

    // 1) 핀 미디어 타입 선택 모달 바인딩
    const typeSelectModal = document.getElementById('pin-type-select-modal');
    if (typeSelectModal) {
      document.getElementById('btn-select-audio-memo').addEventListener('click', () => {
        typeSelectModal.classList.remove('active');
        openVoiceMemoModal();
      });
      document.getElementById('btn-select-video-memo').addEventListener('click', () => {
        typeSelectModal.classList.remove('active');
        openVideoMemoModal();
      });
      document.getElementById('btn-select-text-memo').addEventListener('click', () => {
        typeSelectModal.classList.remove('active');
        openTextMemoModal();
      });
      document.getElementById('btn-close-type-select').addEventListener('click', () => {
        typeSelectModal.classList.remove('active');
      });
    }

    // 2) 음성 메모 모달 레코딩 바인딩
    const voiceComplete = document.getElementById('voice-memo-complete');
    if (voiceComplete) {
      document.getElementById('voice-memo-record').addEventListener('click', startVoiceMemoRecording);
      document.getElementById('voice-memo-stop').addEventListener('click', stopVoiceMemoRecording);
      document.getElementById('voice-memo-play').addEventListener('click', playVoiceMemoRecording);
      document.getElementById('voice-memo-reset').addEventListener('click', resetVoiceMemoRecording);
      voiceComplete.addEventListener('click', completeVoiceMemoRecording);
    }

    // 3) 영상 메모 모달 레코딩 바인딩
    const videoComplete = document.getElementById('video-memo-complete');
    if (videoComplete) {
      document.getElementById('video-memo-record').addEventListener('click', startVideoMemoRecording);
      document.getElementById('video-memo-stop').addEventListener('click', stopVideoMemoRecording);
      document.getElementById('video-memo-play').addEventListener('click', playVideoMemoRecording);
      document.getElementById('video-memo-reset').addEventListener('click', resetVideoMemoRecording);
      videoComplete.addEventListener('click', completeVideoMemoRecording);
    }

    // 4) 텍스트 메모 모달 바인딩
    const textComplete = document.getElementById('text-memo-complete');
    if (textComplete) {
      document.getElementById('text-memo-cancel').addEventListener('click', () => {
        document.getElementById('text-memo-modal').classList.remove('active');
      });
      textComplete.addEventListener('click', completeTextMemoRecording);
    }
  }

  // ==========================================
  // Custom Map Pins Planner
  // ==========================================
  function getOrderedCustomPins() {
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : null;
    const pins = state && Array.isArray(state.customCreatedPins) ? state.customCreatedPins : [];

    pins.forEach((pin, index) => {
      if (typeof pin.sortOrder !== 'number') {
        pin.sortOrder = index;
      }
    });

    return [...pins].sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
  }

  function normalizeCustomPinOrder(orderedPins) {
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : null;
    const pins = state && Array.isArray(state.customCreatedPins) ? state.customCreatedPins : [];
    const ordered = orderedPins || getOrderedCustomPins();
    const orderMap = new Map();

    ordered.forEach((pin, index) => {
      pin.sortOrder = index;
      pin.nameEn = `Custom Pin #${index + 1}`;
      pin.nameKo = `커스텀 핀 #${index + 1}`;
      pin.nameJa = `カスタムピン #${index + 1}`;
      orderMap.set(pin.id, index);
    });

    pins.forEach((pin, index) => {
      if (!orderMap.has(pin.id)) {
        pin.sortOrder = ordered.length + index;
      }
    });

    pins.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  function loadRegisteredCoupons() {
    registeredCoupons = safeParseArray(localStorage.getItem(REGISTERED_COUPONS_STORAGE_KEY), []);
  }

  function saveRegisteredCoupons() {
    try {
      localStorage.setItem(REGISTERED_COUPONS_STORAGE_KEY, JSON.stringify(registeredCoupons));
    } catch (error) {
      console.warn('[Travelog Creator] Coupons could not be saved:', error);
    }
  }

  function bindCouponControlPanel() {
    const vendorInput = document.getElementById('coupon-vendor-input');
    const registerBtn = document.getElementById('register-coupon-btn');

    if (vendorInput) {
      vendorInput.addEventListener('input', updateCouponOfferOptions);
      vendorInput.addEventListener('change', updateCouponOfferOptions);
      updateCouponOfferOptions();
    }

    if (registerBtn) {
      registerBtn.addEventListener('click', registerSelectedCoupon);
    }
  }

  function updateCouponOfferOptions() {
    const vendorInput = document.getElementById('coupon-vendor-input');
    const offerSelect = document.getElementById('coupon-offer-select');
    if (!vendorInput || !offerSelect) return;

    const vendor = vendorInput.value.trim();
    const offers = EVENT_COUPON_CATALOG[vendor] || [];

    if (offers.length === 0) {
      offerSelect.innerHTML = '<option value="">업체를 먼저 선택하세요</option>';
      return;
    }

    offerSelect.innerHTML = offers.map(offer => `<option value="${escapeHtml(offer)}">${escapeHtml(offer)}</option>`).join('');
  }

  function registerSelectedCoupon() {
    const vendorInput = document.getElementById('coupon-vendor-input');
    const offerSelect = document.getElementById('coupon-offer-select');
    if (!vendorInput || !offerSelect) return;

    const vendor = vendorInput.value.trim();
    const offer = offerSelect.value.trim();

    if (!vendor || !EVENT_COUPON_CATALOG[vendor]) {
      window.TravelogApp.showToast(t('등록할 업체를 선택해 주세요.', 'Choose a vendor first.', '店舗を選択してください。'));
      return;
    }
    if (!offer) {
      window.TravelogApp.showToast(t('하위 쿠폰을 선택해 주세요.', 'Choose a coupon offer.', 'クーポンを選択してください。'));
      return;
    }

    const coupon = {
      id: `coupon-${Date.now()}`,
      vendor,
      offer,
      createdAt: new Date().toISOString()
    };
    registeredCoupons.push(coupon);
    saveRegisteredCoupons();
    renderRegisteredCouponList();
    updatePublishPanelCounts();
    window.TravelogApp.showToast(t('이벤트 쿠폰이 등록되었습니다.', 'Event coupon registered.', 'イベントクーポンを登録しました。'));
  }

  function removeRegisteredCoupon(id) {
    registeredCoupons = registeredCoupons.filter(coupon => coupon.id !== id);
    saveRegisteredCoupons();
    renderRegisteredCouponList();
    updatePublishPanelCounts();
  }

  function renderRegisteredCouponList() {
    const container = document.getElementById('registered-coupon-list');
    if (!container) return;

    if (registeredCoupons.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 12px 0; font-size: 12px;">등록된 이벤트 쿠폰이 없습니다.</div>';
      return;
    }

    container.innerHTML = registeredCoupons.map((coupon, index) => `
      <div class="registered-coupon-item" style="display: flex; justify-content: space-between; gap: 8px; align-items: center; background: rgba(255,255,255,0.55); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 9px 10px;">
        <div style="min-width: 0;">
          <div style="font-size: 12px; font-weight: 800; color: var(--text-primary);">${index + 1}. ${escapeHtml(coupon.vendor)}</div>
          <div style="font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(coupon.offer)}</div>
        </div>
        <button type="button" class="btn-circle" onclick="TravelogCreatorModule.removeRegisteredCoupon('${coupon.id}')" style="width: 26px; height: 26px; font-size: 11px; color: var(--accent-pink); background: rgba(255,50,50,0.08);"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `).join('');
  }

  function connectPinsOnMap() {
    const orderedPins = getOrderedCustomPins();
    if (orderedPins.length < 2) {
      window.TravelogApp.showToast(t('핀을 2개 이상 만든 뒤 연결해 주세요.', 'Create at least two pins before connecting them.', 'ピンを2つ以上作成してから接続してください。'));
      return;
    }

    normalizeCustomPinOrder(orderedPins);
    goToMapCreateMode();
    setTimeout(() => {
      if (window.TravelogMapModule && typeof window.TravelogMapModule.connectCreatorPins === 'function') {
        window.TravelogMapModule.connectCreatorPins(orderedPins);
      }
    }, 120);
    window.TravelogApp.showToast(t('핀 이동순서 경로를 지도에 실선으로 연결했습니다.', 'Pins are connected on the map with a solid route.', 'ピンの順路を地図上に実線で接続しました。'));
  }

  function goToMapCreateMode() {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const mapNav = document.querySelector('.nav-item[data-tab="map-tab"]');
    if (mapNav) mapNav.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.toggle('active', tab.id === 'map-tab');
    });
    if (window.updateMapLayoutForMode) window.updateMapLayoutForMode('create');
    if (window.TravelogMapModule && typeof window.TravelogMapModule.invalidateSize === 'function') {
      setTimeout(() => window.TravelogMapModule.invalidateSize(), 80);
    }
  }

  function previewCurrentGuide() {
    const orderedPins = getOrderedCustomPins();
    if (orderedPins.length === 0) {
      window.TravelogApp.showToast(t('미리보기할 핀이 없습니다. 지도에서 코스핀을 먼저 추가해 주세요.', 'There are no pins to preview.', 'プレビューするピンがありません。'));
      return;
    }

    const packageData = buildGuidePublishPackage();
    goToMapCreateMode();
    if (window.TravelogMapModule && typeof window.TravelogMapModule.startCreatorGuidePreview === 'function') {
      window.TravelogMapModule.startCreatorGuidePreview(packageData);
    }
  }

  function renderCoordinatesList() {
    const listEl = document.getElementById('creator-coordinates-list');
    const noPinsMsg = document.getElementById('no-pins-msg');
    if (!listEl || !noPinsMsg) return;

    const rows = listEl.querySelectorAll('.coordinate-row');
    rows.forEach(r => r.remove());

    const customPins = getOrderedCustomPins();
    normalizeCustomPinOrder(customPins);

    if (customPins.length === 0) {
      noPinsMsg.style.display = 'block';
      refreshMediaPinSelectors();
      updatePublishPanelCounts();
      return;
    }

    noPinsMsg.style.display = 'none';

    customPins.forEach((pin, index) => {
      const row = document.createElement('div');
      row.className = 'coordinate-row';
      row.dataset.pinId = pin.id;
      row.draggable = true;
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding: 8px;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        cursor: grab;
      `;

      let timeStr = '';
      if (pin.createdAt) {
        const d = new Date(pin.createdAt);
        if (!Number.isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const date = String(d.getDate()).padStart(2, '0');
          const hour = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          timeStr = `${year}.${month}.${date} ${hour}:${min}`;
        }
      }

      row.innerHTML = `
        <span class="pin-number-label" style="min-width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:800; color:white; background:${pin.color || '#ff2e63'}; font-size:12px;">${index + 1}</span>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pick(pin, 'name')}</div>
          <div style="font-size:11px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(pin.description || t('메모 없음', 'No memo', 'メモなし'))}</div>
          <div style="font-size:10px; color:var(--text-muted);">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
        </div>

        <div style="min-width:88px; text-align:right; font-size:10px; color:var(--text-muted); line-height:1.3;">${timeStr || '-'}</div>

        <div style="display:flex; flex-direction:column; gap:3px;">
          <button type="button" class="btn-circle pin-order-btn" ${index === 0 ? 'disabled' : ''} title="위로 이동" onclick="TravelogCreatorModule.moveCoordinate('${pin.id}', -1)" style="width:24px; height:22px; font-size:10px; opacity:${index === 0 ? '0.35' : '1'};"><i class="fa-solid fa-chevron-up"></i></button>
          <button type="button" class="btn-circle pin-order-btn" ${index === customPins.length - 1 ? 'disabled' : ''} title="아래로 이동" onclick="TravelogCreatorModule.moveCoordinate('${pin.id}', 1)" style="width:24px; height:22px; font-size:10px; opacity:${index === customPins.length - 1 ? '0.35' : '1'};"><i class="fa-solid fa-chevron-down"></i></button>
        </div>

        <select class="pin-color-picker" title="핀 색상" style="font-size:11px; padding:3px; border-radius:4px; background:#fff; border:1px solid #ccc; color:#373737 !important; cursor:pointer;">
          <option value="#ff2e63" style="color:#ff2e63;" ${pin.color === '#ff2e63' ? 'selected' : ''}>🔴</option>
          <option value="#00adb5" style="color:#00adb5;" ${pin.color === '#00adb5' ? 'selected' : ''}>🔵</option>
          <option value="#34a853" style="color:#34a853;" ${pin.color === '#34a853' ? 'selected' : ''}>🟢</option>
          <option value="#ffb703" style="color:#ffb703;" ${pin.color === '#ffb703' ? 'selected' : ''}>🟡</option>
          <option value="#8b5cf6" style="color:#8b5cf6;" ${pin.color === '#8b5cf6' ? 'selected' : ''}>🟣</option>
        </select>

        <input type="text" class="pin-description-input" value="${escapeHtml(pin.description || '')}" placeholder="${t('메모 수정...', 'Edit memo...', 'メモ編集...')}" style="width:118px; font-size:11px; padding:4px; border-radius:4px; background:#f8fafc; border:1px solid rgba(0,0,0,0.15); color:#373737 !important;">

        <button type="button" class="btn-circle" style="width:24px; height:24px; font-size:11px; background:rgba(255,50,50,0.1); border-color:rgba(255,50,50,0.2); color:var(--accent-pink);" onclick="TravelogCreatorModule.removeCoordinate('${pin.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      row.addEventListener('dragstart', (event) => {
        row.style.opacity = '0.55';
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', pin.id);
      });
      row.addEventListener('dragend', () => {
        row.style.opacity = '1';
      });
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        row.style.borderColor = 'var(--accent-blue)';
      });
      row.addEventListener('dragleave', () => {
        row.style.borderColor = 'var(--glass-border)';
      });
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.style.borderColor = 'var(--glass-border)';
        const draggedId = event.dataTransfer.getData('text/plain');
        moveCoordinateTo(draggedId, pin.id);
      });

      const colorSelect = row.querySelector('.pin-color-picker');
      if (colorSelect) {
        colorSelect.addEventListener('change', (e) => {
          const newColor = e.target.value;
          if (window.TravelogMapModule && typeof window.TravelogMapModule.updateCreatorPinColor === 'function') {
            window.TravelogMapModule.updateCreatorPinColor(pin.id, newColor);
          }
          const numSpan = row.querySelector('.pin-number-label');
          if (numSpan) numSpan.style.background = newColor;
        });
      }

      const descInput = row.querySelector('.pin-description-input');
      if (descInput) {
        descInput.addEventListener('input', (e) => {
          pin.description = e.target.value;
          const origPin = window.TravelogApp.getState().customCreatedPins.find(p => p.id === pin.id);
          if (origPin) {
            origPin.description = e.target.value;
          }
        });
      }

      listEl.appendChild(row);
    });

    refreshMediaPinSelectors();
    updatePublishPanelCounts();
  }

  function moveCoordinate(pinId, direction) {
    const ordered = getOrderedCustomPins();
    const currentIndex = ordered.findIndex(pin => pin.id === pinId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;

    const temp = ordered[currentIndex];
    ordered[currentIndex] = ordered[nextIndex];
    ordered[nextIndex] = temp;
    normalizeCustomPinOrder(ordered);
    renderCoordinatesList();
  }

  function moveCoordinateTo(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;

    const ordered = getOrderedCustomPins();
    const fromIndex = ordered.findIndex(pin => pin.id === draggedId);
    const toIndex = ordered.findIndex(pin => pin.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [draggedPin] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, draggedPin);
    normalizeCustomPinOrder(ordered);
    renderCoordinatesList();
  }

  function removeCoordinate(pinId) {
    if (window.TravelogMapModule && typeof window.TravelogMapModule.removeCreatorPin === 'function') {
      window.TravelogMapModule.removeCreatorPin(pinId);
    }
  }

  function clearPins() {
    if (window.TravelogMapModule) {
      window.TravelogMapModule.clearCreatorPins();
    }
    renderCoordinatesList();
    window.TravelogApp.showToast(t('등록된 핀들이 초기화되었습니다.', 'All custom pins reset.', '登録されたピンをリセットしました。'));
  }

  function safeFileName(value, fallback = 'travelog') {
    const raw = String(value || fallback).trim() || fallback;
    return raw.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 80);
  }

  function formatTimestampForFile(dateValue = Date.now()) {
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}${second}`;
  }

  function getBlobExtension(blob, fallback = 'dat') {
    const mime = blob && blob.type ? blob.type.toLowerCase() : '';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('mpeg')) return 'mp3';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('text')) return 'txt';
    if (mime.includes('json')) return 'json';
    if (mime.includes('csv')) return 'csv';
    return fallback;
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function buildUserStudioCsvRows(packageData) {
    const rows = [
      [
        'guide_id', 'tour_name', 'creator', 'created_at', 'item_type', 'pin_order', 'pin_id',
        'memo_type', 'file_folder', 'file_name', 'memo_text', 'lat', 'lng', 'linked_audio', 'linked_video'
      ]
    ];

    packageData.pins.forEach(pin => {
      rows.push([
        packageData.guideId,
        packageData.tourName,
        packageData.creator,
        packageData.createdAt,
        'pin',
        pin.order,
        pin.id,
        pin.memoType,
        pin.textFileName ? 'Text' : '',
        pin.textFileName || '',
        pin.description || '',
        pin.lat,
        pin.lng,
        pin.linkedAudios.join('; '),
        pin.linkedVideos.join('; ')
      ]);
    });

    packageData.audioFiles.forEach(file => {
      rows.push([
        packageData.guideId,
        packageData.tourName,
        packageData.creator,
        packageData.createdAt,
        'audio',
        file.stopIndex + 1,
        file.pinId || '',
        'audio',
        'Audio',
        file.fileName,
        file.memoText || '',
        file.lat || '',
        file.lng || '',
        file.fileName,
        ''
      ]);
    });

    packageData.videoFiles.forEach(file => {
      rows.push([
        packageData.guideId,
        packageData.tourName,
        packageData.creator,
        packageData.createdAt,
        'video',
        file.stopIndex + 1,
        file.pinId || '',
        'video',
        'Video',
        file.fileName,
        file.memoText || '',
        file.lat || '',
        file.lng || '',
        '',
        file.fileName
      ]);
    });

    (packageData.eventCoupons || []).forEach((coupon, index) => {
      rows.push([
        packageData.guideId,
        packageData.tourName,
        packageData.creator,
        packageData.createdAt,
        'coupon',
        index + 1,
        '',
        'event_coupon',
        'Coupon',
        coupon.vendor || '',
        coupon.offer || '',
        '',
        '',
        '',
        ''
      ]);
    });

    return rows;
  }

  function rowsToCsv(rows) {
    return rows.map(row => row.map(csvCell).join(',')).join('\n');
  }

  function buildGuidePublishPackage() {
    const orderedPins = getOrderedCustomPins();
    normalizeCustomPinOrder(orderedPins);

    const tourName = document.getElementById('new-tour-name')?.value?.trim() || 'My Walking Tour';
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : {};
    const creator = state.userProfile?.nickname || 'Travelog Creator';
    const createdAt = new Date().toISOString();
    const guideId = `published-${Date.now()}`;
    const tourSlug = safeFileName(tourName, 'travelog_guide');
    const representativeImage = getGuideCoverDataUrl();
    const guideIntroText = getGuideIntroText();
    const guideIntroAudioInfo = guideIntroAudio ? { ...guideIntroAudio } : null;
    const guideIntroVideoInfo = guideIntroVideo ? { ...guideIntroVideo } : null;
    const eventCoupons = registeredCoupons.map(coupon => ({ ...coupon }));

    const pins = orderedPins.map((pin, index) => {
      const linkedAudios = recordedAudios.filter(a => Number(a.stopIndex) === index).map(a => a.name);
      const linkedVideos = recordedVideos.filter(v => Number(v.stopIndex) === index).map(v => v.name);
      const description = pin.description || '';
      const textFileName = description ? `text_memo_${String(index + 1).padStart(2, '0')}_${safeFileName(pin.nameKo || pin.nameEn || pin.id, 'pin')}.txt` : '';
      return {
        id: pin.id,
        order: index + 1,
        nameKo: pin.nameKo,
        nameEn: pin.nameEn,
        nameJa: pin.nameJa,
        lat: pin.lat,
        lng: pin.lng,
        color: pin.color || '#ff2e63',
        createdAt: pin.createdAt || null,
        description,
        memoType: description ? 'text' : 'none',
        textFileName,
        linkedAudios,
        linkedVideos
      };
    });

    const pinByIndex = new Map(pins.map((pin, index) => [index, pin]));

    const audioFiles = recordedAudios.map((audio, index) => {
      const pin = pinByIndex.get(Number(audio.stopIndex));
      const blob = audio.blob || new Blob(['Travelog simulated audio memo'], { type: 'text/plain' });
      const extension = audio.name && audio.name.includes('.') ? audio.name.split('.').pop() : getBlobExtension(blob, 'webm');
      const fileName = audio.name || `audio_memo_${String(index + 1).padStart(2, '0')}_${tourSlug}.${extension}`;
      return {
        fileName,
        blob,
        stopIndex: Number(audio.stopIndex || 0),
        pinId: pin?.id || '',
        memoText: pin?.description || '',
        lat: pin?.lat || '',
        lng: pin?.lng || ''
      };
    });

    const videoFiles = recordedVideos.map((video, index) => {
      const pin = pinByIndex.get(Number(video.stopIndex));
      const blob = video.blob || new Blob(['Travelog simulated video memo'], { type: 'text/plain' });
      const extension = video.name && video.name.includes('.') ? video.name.split('.').pop() : getBlobExtension(blob, 'webm');
      const fileName = video.name || `video_memo_${String(index + 1).padStart(2, '0')}_${tourSlug}.${extension}`;
      return {
        fileName,
        blob,
        stopIndex: Number(video.stopIndex || 0),
        pinId: pin?.id || '',
        memoText: pin?.description || '',
        lat: pin?.lat || '',
        lng: pin?.lng || ''
      };
    });

    const textFiles = pins
      .filter(pin => pin.description)
      .map(pin => ({
        fileName: pin.textFileName,
        blob: new Blob([pin.description], { type: 'text/plain;charset=utf-8' }),
        pinId: pin.id,
        stopIndex: pin.order - 1,
        memoText: pin.description,
        lat: pin.lat,
        lng: pin.lng
      }));

    const packageData = {
      guideId,
      tourName,
      tourSlug,
      creator,
      createdAt,
      driveFolderId: DRIVE_PARENT_FOLDER_ID,
      representativeImage,
      guideIntroText,
      guideIntroAudio: guideIntroAudioInfo,
      guideIntroVideo: guideIntroVideoInfo,
      eventCoupons,
      pins,
      audioFiles,
      videoFiles,
      textFiles
    };

    packageData.studioRows = buildUserStudioCsvRows(packageData);
    packageData.studioCsv = rowsToCsv(packageData.studioRows);
    packageData.guideJson = JSON.stringify({
      guideId,
      tourName,
      creator,
      createdAt,
      driveFolderId: DRIVE_PARENT_FOLDER_ID,
      folders: { audio: 'Audio', video: 'Video', text: 'Text' },
      representativeImage,
      guideIntroText,
      guideIntroAudio: guideIntroAudioInfo ? { ...guideIntroAudioInfo } : null,
      guideIntroVideo: guideIntroVideoInfo ? { ...guideIntroVideoInfo } : null,
      eventCoupons,
      pins: pins.map(pin => ({ ...pin })),
      audioFiles: audioFiles.map(file => ({ ...file, blob: undefined })),
      videoFiles: videoFiles.map(file => ({ ...file, blob: undefined })),
      textFiles: textFiles.map(file => ({ ...file, blob: undefined }))
    }, null, 2);

    packageData.rootFiles = [
      {
        fileName: `${tourSlug}_guide_data.json`,
        blob: new Blob([packageData.guideJson], { type: 'application/json;charset=utf-8' })
      },
      {
        fileName: 'User Studio Data.csv',
        blob: new Blob([packageData.studioCsv], { type: 'text/csv;charset=utf-8' })
      }
    ];

    packageData.guideCard = {
      id: guideId,
      name: tourName,
      author: `${creator} (크리에이터)`,
      rating: 'NEW',
      bg: representativeImage || 'assets/images/brand/travelog-ci-symbol.svg',
      representativeImage,
      guideIntroText,
      guideIntroAudio: guideIntroAudioInfo ? { ...guideIntroAudioInfo } : null,
      guideIntroVideo: guideIntroVideoInfo ? { ...guideIntroVideoInfo } : null,
      badge: '오늘의 가이드',
      isWidget: true,
      isPublishedGuide: true,
      createdAt,
      pinCount: pins.length,
      memoCount: audioFiles.length + videoFiles.length + textFiles.length,
      couponCount: eventCoupons.length,
      eventCoupons: eventCoupons.map(coupon => ({ ...coupon })),
      stops: pins.map(pin => ({
        id: pin.id,
        order: pin.order,
        nameKo: pin.nameKo,
        nameEn: pin.nameEn,
        nameJa: pin.nameJa,
        lat: pin.lat,
        lng: pin.lng,
        color: pin.color,
        createdAt: pin.createdAt,
        description: pin.description,
        memoType: pin.memoType,
        linkedAudios: [...(pin.linkedAudios || [])],
        linkedVideos: [...(pin.linkedVideos || [])]
      }))
    };

    return packageData;
  }

  async function getOrCreateLocalDirectory(parentHandle, name) {
    return parentHandle.getDirectoryHandle(name, { create: true });
  }

  async function writeBlobToLocalFile(directoryHandle, fileName, blob) {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async function savePackageToLocalDevice(packageData) {
    // Final publishing should not ask for a folder again.
    // The app uses the device storage location approved at onboarding, or a mobile-safe internal fallback.
    if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.savePublishPackage === 'function') {
      return window.TravelogDeviceStorage.savePublishPackage(packageData);
    }

    return {
      selectedFolderName: t('브라우저 내부 저장소', 'Browser internal storage', 'ブラウザ内部保存先'),
      dataFolderName: 'Travelog_user_data',
      mode: 'browser'
    };
  }


  function showPublishModalLoading(title, desc) {
    const loadingModal = document.getElementById('publish-loading-modal');
    const statusTitle = document.getElementById('publish-status-title');
    const statusDesc = document.getElementById('publish-status-desc');
    const spinner = document.getElementById('publish-loading-spinner');
    const successIcon = document.getElementById('publish-success-icon');
    const summary = document.getElementById('publish-local-summary');
    const actions = document.getElementById('publish-ready-actions');

    if (!loadingModal) return;
    if (statusTitle) statusTitle.textContent = title;
    if (statusDesc) statusDesc.textContent = desc;
    if (spinner) spinner.style.display = 'block';
    if (successIcon) successIcon.style.display = 'none';
    if (summary) summary.style.display = 'none';
    if (actions) actions.style.display = 'none';
    loadingModal.classList.add('active');
    loadingModal.setAttribute('aria-hidden', 'false');
  }

  function showPublishReadyModal(packageData, localSaveInfo) {
    const loadingModal = document.getElementById('publish-loading-modal');
    const statusTitle = document.getElementById('publish-status-title');
    const statusDesc = document.getElementById('publish-status-desc');
    const spinner = document.getElementById('publish-loading-spinner');
    const successIcon = document.getElementById('publish-success-icon');
    const summary = document.getElementById('publish-local-summary');
    const actions = document.getElementById('publish-ready-actions');

    if (!loadingModal) return;
    if (statusTitle) statusTitle.textContent = t('저장이 완료되었습니다.', 'Saved successfully.', '保存が完了しました。');
    if (statusDesc) statusDesc.textContent = t('이제 출간 준비가 완료 되었어요.', 'Your guide is now ready to publish.', '公開準備が完了しました。');
    if (spinner) spinner.style.display = 'none';
    if (successIcon) successIcon.style.display = 'block';
    if (summary) {
      summary.innerHTML = `
        <strong>${escapeHtml(localSaveInfo.selectedFolderName)} / ${escapeHtml(localSaveInfo.dataFolderName)}</strong><br>
        Audio: ${packageData.audioFiles.length}개 저장<br>
        Video: ${packageData.videoFiles.length}개 저장<br>
        Text: ${packageData.textFiles.length}개 저장<br>
        User Studio Data.csv 저장 완료
      `;
      summary.style.display = 'block';
    }
    if (actions) actions.style.display = 'flex';
    loadingModal.classList.add('active');
    loadingModal.setAttribute('aria-hidden', 'false');
  }

  function closePublishModal() {
    const loadingModal = document.getElementById('publish-loading-modal');
    if (!loadingModal) return;
    loadingModal.classList.remove('active');
    loadingModal.setAttribute('aria-hidden', 'true');
  }

  async function saveTour() {
    const customPins = getOrderedCustomPins();
    const tourName = document.getElementById('new-tour-name')?.value?.trim() || 'My Walking Tour';

    if (customPins.length === 0) {
      window.TravelogApp.showToast(t('지도 탭에서 핀을 1개 이상 등록해 주세요!', 'Please place at least one pin on the Map tab first!', 'まず地図タブでピンを1つ以上登録してください！'));
      return;
    }

    try {
      showPublishModalLoading(
        t('출간 데이터를 준비 중입니다...', 'Preparing publish data...', '公開データを準備しています...'),
        t('기기 저장소에 데이터를 저장한 뒤 Apps Script 중계 서버로 출간합니다.', 'Saving to device storage, then publishing through the Apps Script relay.', '端末保存後、Apps Script経由で公開します。')
      );

      const packageData = buildGuidePublishPackage();
      const localSaveInfo = await savePackageToLocalDevice(packageData);
      pendingPublishPackage = packageData;

      const summary = document.getElementById('publish-local-summary');
      if (summary) {
        summary.innerHTML = `
          기기 저장: ${escapeHtml(localSaveInfo.selectedFolderName)} / ${escapeHtml(localSaveInfo.dataFolderName)}<br>
          Audio: ${packageData.audioFiles.length}개 · Video: ${packageData.videoFiles.length}개 · Text: ${packageData.textFiles.length}개<br>
          이제 구글 드라이브로 바로 출간합니다.
        `;
        summary.style.display = 'block';
      }

      await publishPreparedGuideToDrive();
    } catch (error) {
      console.error('[Travelog Publish] Publish preparation failed:', error);
      closePublishModal();
      alert(t('출간 준비 중 오류가 발생했습니다. 저장 권한과 네트워크를 확인해 주세요.', 'Publish preparation failed. Check storage permission and network.', '公開準備中にエラーが発生しました。'));
    }
  }


  function downloadCurrentGuideData() {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const tourName = document.getElementById('new-tour-name')?.value || 'My Walking Tour';

    if (customPins.length === 0) {
      return;
    }

    const data = {
      tourName: tourName,
      created_at: new Date().toISOString(),
      creator: window.TravelogApp.getState().userProfile.nickname || 'Travelog Creator',
      pins: customPins.map((pin, index) => {
        const inputRows = document.querySelectorAll('.coordinate-row');
        const inputRow = inputRows ? inputRows[index] : null;
        const scriptInput = inputRow ? inputRow.querySelector('input') : null;

        const linkedAudios = recordedAudios.filter(a => parseInt(a.stopIndex, 10) === index).map(a => a.name);
        const linkedVideos = recordedVideos.filter(v => parseInt(v.stopIndex, 10) === index).map(v => v.name);

        return {
          id: pin.id,
          nameKo: pin.nameKo,
          nameEn: pin.nameEn,
          nameJa: pin.nameJa,
          lat: pin.lat,
          lng: pin.lng,
          script: scriptInput ? scriptInput.value.trim() : '',
          audios: linkedAudios,
          videos: linkedVideos
        };
      })
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tourName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_guide_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getAppsScriptPublishKey() {
    return localStorage.getItem(APPS_SCRIPT_PUBLISH_KEY_STORAGE_KEY) || DEFAULT_APPS_SCRIPT_PUBLISH_KEY || '';
  }

  function setAppsScriptPublishKey(key) {
    localStorage.setItem(APPS_SCRIPT_PUBLISH_KEY_STORAGE_KEY, String(key || ''));
  }

  function ensureAppsScriptPublishKey() {
    const savedKey = getAppsScriptPublishKey();
    if (savedKey) return savedKey;

    const input = window.prompt(t(
      'Apps Script 임시 출간 비밀번호(publishKey)를 입력해 주세요. Apps Script에서 비밀번호를 비워두었다면 빈칸으로 확인하세요.',
      'Enter the Apps Script publishKey. If your Apps Script publish key is empty, press OK with this field empty.',
      'Apps ScriptのpublishKeyを入力してください。未設定なら空欄のままOKしてください。'
    ), DEFAULT_APPS_SCRIPT_PUBLISH_KEY || '');

    if (input === null) {
      // 취소해도 Apps Script 쪽 PUBLISH_KEY가 비어 있을 수 있으므로 빈 값으로 전송한다.
      return DEFAULT_APPS_SCRIPT_PUBLISH_KEY || '';
    }

    const key = String(input || '').trim();
    setAppsScriptPublishKey(key);
    return key;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('BLOB_READ_FAILED'));
      reader.readAsDataURL(blob);
    });
  }

  async function convertFileEntryToMemo(file, type, fallbackText = '') {
    const blob = file.blob instanceof Blob ? file.blob : new Blob([fallbackText || ''], { type: 'text/plain;charset=utf-8' });
    const memo = {
      type,
      fileName: file.fileName || `${type}_memo_${Date.now()}`,
      pinId: file.pinId || '',
      stopIndex: typeof file.stopIndex === 'number' ? file.stopIndex : Number(file.stopIndex || 0),
      lat: file.lat || '',
      lng: file.lng || '',
      text: file.memoText || fallbackText || '',
      memo: file.memoText || fallbackText || '',
      createdAt: new Date().toISOString(),
      mimeType: blob.type || (type === 'video' ? 'video/webm' : type === 'audio' ? 'audio/webm' : 'text/plain')
    };

    if (type === 'audio' || type === 'video') {
      memo.base64 = await blobToDataUrl(blob);
    }

    return memo;
  }

  async function buildAppsScriptPayload(packageData) {
    const publishKey = ensureAppsScriptPublishKey();
    const memos = [];

    for (const file of packageData.audioFiles || []) {
      memos.push(await convertFileEntryToMemo(file, 'audio', 'Travelog audio memo'));
    }

    for (const file of packageData.videoFiles || []) {
      memos.push(await convertFileEntryToMemo(file, 'video', 'Travelog video memo'));
    }

    for (const file of packageData.textFiles || []) {
      let text = file.memoText || '';
      try {
        if (!text && file.blob instanceof Blob) {
          text = await file.blob.text();
        }
      } catch (_) {}
      memos.push(await convertFileEntryToMemo(file, 'text', text));
    }

    return {
      publishKey,
      guide: {
        id: packageData.guideId,
        title: packageData.tourName,
        slug: packageData.tourSlug,
        author: packageData.creator,
        createdAt: packageData.createdAt,
        driveFolderId: DRIVE_PARENT_FOLDER_ID,
        pinCount: (packageData.pins || []).length,
        audioCount: (packageData.audioFiles || []).length,
        videoCount: (packageData.videoFiles || []).length,
        textCount: (packageData.textFiles || []).length,
        couponCount: (packageData.eventCoupons || []).length,
        representativeImage: packageData.representativeImage || '',
        guideIntroText: packageData.guideIntroText || '',
        guideIntroAudio: packageData.guideIntroAudio ? { fileName: packageData.guideIntroAudio.fileName, mimeType: packageData.guideIntroAudio.mimeType, dataUrl: packageData.guideIntroAudio.dataUrl } : null,
        guideIntroVideo: packageData.guideIntroVideo ? { fileName: packageData.guideIntroVideo.fileName, mimeType: packageData.guideIntroVideo.mimeType, dataUrl: packageData.guideIntroVideo.dataUrl } : null
      },
      eventCoupons: packageData.eventCoupons || [],
      pins: packageData.pins || [],
      memos,
      studioRows: packageData.studioRows || [],
      studioCsv: packageData.studioCsv || '',
      guideJson: packageData.guideJson || ''
    };
  }

  async function postPayloadToAppsScript(payload) {
    if (!APPS_SCRIPT_WEB_APP_URL) {
      throw new Error('APPS_SCRIPT_URL_MISSING');
    }

    const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    // Apps Script Web App은 브라우저 CORS 정책 때문에 응답 본문을 읽을 수 없는 경우가 많다.
    // no-cors 전송이 네트워크 예외 없이 끝나면 서버로 전송된 것으로 처리한다.
    return response;
  }

  async function uploadPackageToGoogleDrive(packageData) {
    const payload = await buildAppsScriptPayload(packageData);
    await postPayloadToAppsScript(payload);

    return {
      uploadedCount: payload.memos.length + 1,
      spreadsheetUpdated: true,
      spreadsheetFallbackUploaded: false,
      responseVerified: false
    };
  }

  function registerGuideOnHome(packageData) {
    if (window.TravelogApp && typeof window.TravelogApp.registerPublishedGuide === 'function') {
      window.TravelogApp.registerPublishedGuide(packageData.guideCard);
    }
  }

  function getPublishedGuideRecords() {
    return safeParseArray(localStorage.getItem(CREATOR_PUBLISHED_GUIDES_KEY), []);
  }

  function savePublishedGuideRecords(records) {
    try {
      localStorage.setItem(CREATOR_PUBLISHED_GUIDES_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn('[Travelog Creator] Published guide records could not be saved:', error);
    }
  }

  function makePublishedGuideRecord(packageData) {
    return {
      id: packageData.guideId,
      tourName: packageData.tourName,
      creator: packageData.creator,
      createdAt: packageData.createdAt,
      representativeImage: packageData.representativeImage || '',
      guideIntroText: packageData.guideIntroText || '',
      guideIntroAudio: packageData.guideIntroAudio ? { ...packageData.guideIntroAudio } : null,
      guideIntroVideo: packageData.guideIntroVideo ? { ...packageData.guideIntroVideo } : null,
      pinCount: (packageData.pins || []).length,
      memoCount: (packageData.audioFiles || []).length + (packageData.videoFiles || []).length + (packageData.textFiles || []).length,
      couponCount: (packageData.eventCoupons || []).length,
      pins: (packageData.pins || []).map(pin => ({ ...pin })),
      eventCoupons: (packageData.eventCoupons || []).map(coupon => ({ ...coupon })),
      guideCard: { ...packageData.guideCard }
    };
  }

  function storePublishedGuideRecord(packageData) {
    const record = makePublishedGuideRecord(packageData);
    const records = getPublishedGuideRecords();
    const nextRecords = [
      record,
      ...records.filter(item => item.id !== record.id)
    ].slice(0, 50);
    savePublishedGuideRecords(nextRecords);
    renderPublishedGuidesList();
    return record;
  }

  function renderPublishedGuidesList() {
    const container = document.getElementById('published-guide-list');
    if (!container) return;
    const records = getPublishedGuideRecords();

    if (records.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 18px 0; font-size: 12px;">아직 출간된 가이드가 없습니다.</div>';
      return;
    }

    container.innerHTML = records.map(record => {
      const date = record.createdAt ? new Date(record.createdAt) : null;
      const dateText = date && !Number.isNaN(date.getTime())
        ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        : '-';
      const imageStyle = record.representativeImage ? `background-image:url('${record.representativeImage}')` : '';
      return `
        <div class="published-guide-row" style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.58); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 10px;">
          <div style="width: 54px; height: 42px; flex-shrink: 0; border-radius: 10px; background: linear-gradient(135deg, rgba(112,162,183,0.22), rgba(175,212,153,0.22)); background-size: cover; background-position: center; ${imageStyle}"></div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(record.tourName)}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">핀 ${record.pinCount || 0} · 메모 ${record.memoCount || 0} · 쿠폰 ${record.couponCount || 0}</div>
            <div style="font-size: 10px; color: var(--text-muted);">${dateText}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.openPublishedGuideEditor('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px;">수정</button>
            <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.deletePublishedGuide('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px; color: var(--accent-pink);">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function deletePublishedGuide(id) {
    const records = getPublishedGuideRecords().filter(record => record.id !== id);
    savePublishedGuideRecords(records);
    if (window.TravelogApp && typeof window.TravelogApp.removePublishedGuide === 'function') {
      window.TravelogApp.removePublishedGuide(id);
    }
    renderPublishedGuidesList();
    window.TravelogApp.showToast(t('출간된 가이드를 삭제했습니다.', 'Published guide deleted.', '公開済みガイドを削除しました。'));
  }

  function bindGuideEditModal() {
    const closeBtn = document.getElementById('guide-edit-close-btn');
    const cancelBtn = document.getElementById('guide-edit-cancel-btn');
    const completeBtn = document.getElementById('guide-edit-complete-btn');
    if (closeBtn) closeBtn.addEventListener('click', closePublishedGuideEditor);
    if (cancelBtn) cancelBtn.addEventListener('click', closePublishedGuideEditor);
    if (completeBtn) completeBtn.addEventListener('click', completePublishedGuideEdit);
  }

  function openPublishedGuideEditor(id) {
    const record = getPublishedGuideRecords().find(item => item.id === id);
    if (!record) return;
    editingPublishedGuideId = id;

    const modal = document.getElementById('guide-edit-page-modal');
    const titleInput = document.getElementById('guide-edit-title-input');
    const coverPreview = document.getElementById('guide-edit-cover-preview');
    const summary = document.getElementById('guide-edit-summary');
    const pinList = document.getElementById('guide-edit-pin-list');
    const couponList = document.getElementById('guide-edit-coupon-list');

    if (titleInput) titleInput.value = record.tourName || '';
    if (coverPreview) {
      coverPreview.style.backgroundImage = record.representativeImage ? `url('${record.representativeImage}')` : '';
      coverPreview.textContent = record.representativeImage ? '' : '대표 이미지 없음';
    }
    if (summary) {
      summary.innerHTML = `핀 ${record.pinCount || 0}개 · 메모 ${record.memoCount || 0}개 · 쿠폰 ${record.couponCount || 0}개<br>소개글: ${record.guideIntroText ? '등록됨' : '없음'} · 소개미디어: ${record.guideIntroVideo ? '영상' : record.guideIntroAudio ? '음성' : '없음'}<br>출간자: ${escapeHtml(record.creator || '')}`;
    }
    if (pinList) {
      const pins = Array.isArray(record.pins) ? record.pins : [];
      pinList.innerHTML = pins.length ? pins.map(pin => `
        <div style="background: white; border: 1px solid var(--glass-border); border-radius: 10px; padding: 8px; font-size: 12px;">
          <strong>${pin.order}. ${escapeHtml(pin.nameKo || pin.nameEn || pin.id)}</strong><br>
          <span style="color: var(--text-secondary);">${escapeHtml(pin.description || '메모 없음')}</span><br>
          <small style="color: var(--text-muted);">${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}</small>
        </div>
      `).join('') : '<div style="color: var(--text-muted); font-size: 12px; text-align:center; padding: 12px;">핀 정보가 없습니다.</div>';
    }
    if (couponList) {
      const coupons = Array.isArray(record.eventCoupons) ? record.eventCoupons : [];
      couponList.innerHTML = coupons.length ? coupons.map((coupon, index) => `
        <div style="background: white; border: 1px solid var(--glass-border); border-radius: 10px; padding: 8px; font-size: 12px;">
          <strong>${index + 1}. ${escapeHtml(coupon.vendor)}</strong><br>
          <span style="color: var(--text-secondary);">${escapeHtml(coupon.offer)}</span>
        </div>
      `).join('') : '<div style="color: var(--text-muted); font-size: 12px; text-align:center; padding: 12px;">등록된 쿠폰이 없습니다.</div>';
    }

    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closePublishedGuideEditor() {
    const modal = document.getElementById('guide-edit-page-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    editingPublishedGuideId = null;
  }

  function completePublishedGuideEdit() {
    if (!editingPublishedGuideId) return;
    const titleInput = document.getElementById('guide-edit-title-input');
    const nextTitle = (titleInput?.value || '').trim() || '나의 출간 가이드';

    const records = getPublishedGuideRecords();
    const record = records.find(item => item.id === editingPublishedGuideId);
    if (!record) return;

    record.tourName = nextTitle;
    if (record.guideCard) {
      record.guideCard.name = nextTitle;
    }
    savePublishedGuideRecords(records);

    showPublishModalLoading('수정 중', '가이드 정보를 업데이트하고 있습니다.');

    setTimeout(() => {
      const title = document.getElementById('publish-status-title');
      const desc = document.getElementById('publish-status-desc');
      const spinner = document.getElementById('publish-loading-spinner');
      const success = document.getElementById('publish-success-icon');
      if (title) title.textContent = '수정완료';
      if (desc) desc.textContent = '가이드 수정이 완료되었습니다.';
      if (spinner) spinner.style.display = 'none';
      if (success) success.style.display = 'block';
      if (window.TravelogApp && typeof window.TravelogApp.registerPublishedGuide === 'function') {
        window.TravelogApp.registerPublishedGuide(record.guideCard || { id: record.id, name: record.tourName, bg: record.representativeImage, pinCount: record.pinCount });
      }
      renderPublishedGuidesList();
      closePublishedGuideEditor();
      setTimeout(() => {
        closePublishModal();
      }, 900);
    }, 800);
  }

  function moveToHomeTab() {
    const homeNav = document.querySelector('.nav-item[data-tab="home-tab"]');
    if (homeNav) {
      homeNav.click();
    }
  }

  async function publishPreparedGuideToDrive() {
    if (!pendingPublishPackage) {
      window.TravelogApp.showToast(t('먼저 출간 데이터를 저장해 주세요.', 'Save the publish data first.', '先に公開データを保存してください。'));
      return;
    }

    try {
      showPublishModalLoading(
        t('구글 드라이브로 출간 중입니다...', 'Publishing to Google Drive...', 'Google Driveに公開しています...'),
        t('Apps Script를 통해 Audio, Video, Text 폴더와 User Studio Data에 반영하고 있습니다.', 'Sending through Apps Script to update Audio, Video, Text folders and User Studio Data.', 'Apps Script経由でAudio/Video/TextとUser Studio Dataに反映しています。')
      );

      const uploadResult = await uploadPackageToGoogleDrive(pendingPublishPackage);
      const statusTitle = document.getElementById('publish-status-title');
      const statusDesc = document.getElementById('publish-status-desc');
      const spinner = document.getElementById('publish-loading-spinner');
      const successIcon = document.getElementById('publish-success-icon');
      const summary = document.getElementById('publish-local-summary');
      const actions = document.getElementById('publish-ready-actions');

      const completedPackage = pendingPublishPackage;
      const completedTourName = completedPackage.tourName;

      // 먼저 전체 출간 기록을 저장한 뒤 홈 카드에 등록한다.
      // 그래야 홈에서 카드를 눌렀을 때 임시 경복궁/민호 코스가 아니라 해당 가이드의 핀 목록을 바로 찾을 수 있다.
      storePublishedGuideRecord(completedPackage);
      registerGuideOnHome(completedPackage);

      if (statusTitle) statusTitle.textContent = t('출간이 완료되었습니다.', 'Publishing complete.', '公開が完了しました。');
      if (statusDesc) statusDesc.textContent = t('홈 화면의 오늘의 가이드에 등록되었습니다.', "Registered under Today's Guide on Home.", 'ホームの今日のガイドに登録されました。');
      if (spinner) spinner.style.display = 'none';
      if (successIcon) successIcon.style.display = 'block';
      if (summary) {
        summary.innerHTML = `
          Apps Script 전송 항목: ${uploadResult.uploadedCount}개<br>
          User Studio Data: 스프레드시트 반영 요청 완료<br>
          오늘의 가이드 등록 완료
        `;
        summary.style.display = 'block';
      }
      if (actions) actions.style.display = 'none';

      window.TravelogApp.addPoints(150);
      window.TravelogApp.showToast(t(`가이드 [${completedTourName}] 출간 완료! 새 가이드 제작 화면을 정리했습니다.`, `Guide [${completedTourName}] published! Studio is ready for a new guide.`, `ガイド［${completedTourName}］を公開しました！新規制作のためスタジオを整理しました。`));

      resetCreatorStudioForNewGuide();

      setTimeout(() => {
        closePublishModal();
        moveToHomeTab();
      }, 1500);
    } catch (error) {
      console.error('[Travelog Publish] Drive upload failed:', error);
      closePublishModal();
      if (String(error.message || '').includes('APPS_SCRIPT_URL_MISSING')) {
        alert(t('Apps Script 웹앱 URL이 설정되지 않았습니다.', 'Apps Script Web App URL is not set.', 'Apps Script URLが設定されていません。'));
        return;
      }
      alert(t('구글 드라이브 출간 전송 중 오류가 발생했습니다. Apps Script 배포 URL, publishKey, 네트워크를 확인해 주세요.', 'Publishing failed. Check the Apps Script deployment URL, publishKey, and network.', '公開送信中にエラーが発生しました。Apps Script URL、publishKey、ネットワークを確認してください。'));
    }
  }

  // ==========================================
  // Audio Recorder & List
  // ==========================================
  async function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  function getSupportedAudioMimeType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
  }

  async function startRecording() {
    const btn = document.getElementById('record-audio-btn');
    const statusText = document.getElementById('record-status-text');
    const timerText = document.getElementById('record-timer');

    isRecording = true;
    recordedAudioChunks = [];
    recordingMode = 'simulated';
    btn.classList.add('recording');
    btn.innerHTML = `<i class="fa-solid fa-square"></i>`;
    statusText.textContent = t('음성 가이드를 녹음 중입니다... 말씀해 주세요.', 'Recording audio guide... Speak now!', '音声ガイドを録音中です... 話してください。');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentRecordingMimeType = getSupportedAudioMimeType();
        mediaRecorder = new MediaRecorder(recordingStream, currentRecordingMimeType ? { mimeType: currentRecordingMimeType } : undefined);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) recordedAudioChunks.push(event.data);
        };
        mediaRecorder.onstop = handleRecordedAudioReady;
        mediaRecorder.start();
        recordingMode = 'real';
      } else {
        statusText.textContent = t('이 브라우저는 실제 녹음을 지원하지 않아 테스트 소스 파일로 저장됩니다.', 'This browser does not support real recording, so a test source file will be saved.', 'このブラウザは実録音に未対応のため、テストソースファイルとして保存されます。');
      }
    } catch (error) {
      console.warn('Microphone recording unavailable. Falling back to simulated audio package.', error);
      statusText.textContent = t('마이크 권한을 사용할 수 없어 테스트 음성 소스 파일로 저장됩니다.', 'Microphone permission unavailable. A test audio source file will be saved.', 'マイク権限を使用できないため、テスト音声ソースファイルとして保存します。');
    }

    recordSeconds = 0;
    timerText.textContent = "00:00";
    clearInterval(recordInterval);
    recordInterval = setInterval(() => {
      recordSeconds++;
      const minutes = Math.floor(recordSeconds / 60);
      const secs = recordSeconds % 60;
      const displayMin = minutes < 10 ? `0${minutes}` : minutes;
      const displaySec = secs < 10 ? `0${secs}` : secs;
      timerText.textContent = `${displayMin}:${displaySec}`;
    }, 1000);
  }

  function stopRecording() {
    const btn = document.getElementById('record-audio-btn');
    const statusText = document.getElementById('record-status-text');
    const timerText = document.getElementById('record-timer');

    clearInterval(recordInterval);
    isRecording = false;
    btn.classList.remove('recording');
    btn.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
    statusText.textContent = t('녹음 처리 중입니다...', 'Processing recording...', '録音を処理しています...');

    if (recordingMode === 'real' && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else {
      handleRecordedAudioReady();
    }

    setTimeout(() => {
      timerText.textContent = "00:00";
      statusText.textContent = t('마이크 버튼을 클릭하여 녹음 시작', 'Click Mic to Start Recording', '마이크를 클릭하여 녹음 시작');
    }, 3000);
  }

  async function handleRecordedAudioReady() {
    const mimeType = currentRecordingMimeType || 'audio/webm';
    const extension = mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('ogg') ? 'ogg' : 'webm');
    let audioBlob;

    if (recordedAudioChunks.length > 0) {
      audioBlob = new Blob(recordedAudioChunks, { type: mimeType });
    } else {
      const simulatedText = [
        'Travelog simulated audio source',
        `duration_seconds=${recordSeconds}`,
        `script=${selectedScriptText || 'custom guide audio'}`,
        `created_at=${new Date().toISOString()}`
      ].join('\n');
      audioBlob = new Blob([simulatedText], { type: 'text/plain' });
    }

    const finalExtension = audioBlob.type.includes('text/plain') ? 'txt' : extension;

    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      recordingStream = null;
    }
    mediaRecorder = null;

    const tourName = document.getElementById('new-tour-name')?.value || 'My_Walking_Tour';
    const cleanTourName = tourName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const filename = `guide_audio_${cleanTourName}_${Date.now()}.${finalExtension}`;

    recordedAudios.push({
      id: Date.now(),
      name: filename,
      blob: audioBlob,
      stopIndex: -1
    });

    window.TravelogApp.showToast(t('음성 녹음 완료! 리스트에 추가되었습니다.', 'Audio recording finished and added to list!', '音声録音完了！リストに追加されました。'));
    
    renderAudioList();
    updatePublishPanelCounts();
  }

  function renderAudioList() {
    const container = document.getElementById('creator-audio-list');
    if (!container) return;
    container.innerHTML = '';

    if (recordedAudios.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 12px;">${t('아직 녹음된 음성이 없습니다. 위에서 녹음을 시작해 보세요!', 'No recorded audios yet. Click Mic above to start!', 'まだ録音された音声がありません。')}</div>`;
      return;
    }

    recordedAudios.forEach((audio, idx) => {
      const itemEl = document.createElement('div');
      itemEl.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 12px; gap: 8px;';
      
      const selectHtml = getStopSelectHtml(audio.stopIndex);

      itemEl.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--accent-pink);">${idx + 1}. ${audio.name}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${selectHtml}
          <button class="btn-circle" style="width: 24px; height: 24px; font-size: 10px; background: rgba(255,50,50,0.1); border-color: rgba(255,50,50,0.15); color: var(--accent-pink);" onclick="TravelogCreatorModule.deleteAudio(${audio.id})">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      const select = itemEl.querySelector('select');
      if (select) {
        select.addEventListener('change', (e) => {
          audio.stopIndex = e.target.value === 'none' ? -1 : parseInt(e.target.value, 10);
          updatePublishPanelCounts();
        });
      }

      container.appendChild(itemEl);
    });
  }

  function deleteAudio(id) {
    recordedAudios = recordedAudios.filter(a => a.id !== id);
    renderAudioList();
    updatePublishPanelCounts();
  }

  // ==========================================
  // Video Recorder & List
  // ==========================================
  async function toggleVideoRecording() {
    if (isVideoRecording) {
      stopVideoRecording();
    } else {
      await startVideoRecording();
    }
  }

  async function startVideoRecording() {
    const btn = document.getElementById('record-video-btn');
    const statusText = document.getElementById('video-record-status-text');
    const timerText = document.getElementById('video-record-timer');
    const videoEl = document.getElementById('webcam-video');
    const placeholder = document.getElementById('camera-placeholder');

    isVideoRecording = true;
    recordedVideoChunks = [];
    recordingMode = 'simulated';
    btn.classList.add('recording');
    btn.innerHTML = `<i class="fa-solid fa-square"></i>`;
    statusText.textContent = t('가이드 영상을 녹화 중입니다...', 'Recording video...', 'ビデオガイドを録画中です...');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoEl) {
          videoEl.srcObject = videoStream;
          videoEl.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';

        videoMediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });
        videoMediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) recordedVideoChunks.push(event.data);
        };
        videoMediaRecorder.onstop = handleRecordedVideoReady;
        videoMediaRecorder.start();
        recordingMode = 'real';
      } else {
        statusText.textContent = t('브라우저 카메라 미지원 (테스트 비디오로 저장)', 'Webcam unsupported (Test video will be saved)', 'カメラ非対応（テストビデオを保存）');
      }
    } catch (error) {
      console.warn('Camera userMedia unavailable. Falling back to simulated video.', error);
      statusText.textContent = t('카메라 미작동 (테스트 비디오로 저장)', 'Camera unavailable (Test video will be saved)', 'カメラを使用できないため、テストビデオとして保存します。');
    }

    videoRecordSeconds = 0;
    timerText.textContent = "00:00";
    clearInterval(videoRecordInterval);
    videoRecordInterval = setInterval(() => {
      videoRecordSeconds++;
      const minutes = Math.floor(videoRecordSeconds / 60);
      const secs = videoRecordSeconds % 60;
      const displayMin = minutes < 10 ? `0${minutes}` : minutes;
      const displaySec = secs < 10 ? `0${secs}` : secs;
      timerText.textContent = `${displayMin}:${displaySec}`;
    }, 1000);
  }

  function stopVideoRecording() {
    const btn = document.getElementById('record-video-btn');
    const statusText = document.getElementById('video-record-status-text');
    const timerText = document.getElementById('video-record-timer');
    const videoEl = document.getElementById('webcam-video');
    const placeholder = document.getElementById('camera-placeholder');

    clearInterval(videoRecordInterval);
    isVideoRecording = false;
    btn.classList.remove('recording');
    btn.innerHTML = `<i class="fa-solid fa-video"></i>`;
    statusText.textContent = t('녹화 완료 처리 중...', 'Processing video recording...', '録画を処理しています...');

    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';

    if (recordingMode === 'real' && videoMediaRecorder && videoMediaRecorder.state !== 'inactive') {
      videoMediaRecorder.stop();
    } else {
      handleRecordedVideoReady();
    }

    setTimeout(() => {
      timerText.textContent = "00:00";
      statusText.textContent = t('녹화 버튼 클릭', 'Click record button', '録画ボタンをクリック');
    }, 3000);
  }

  async function handleRecordedVideoReady() {
    let videoBlob;
    if (recordedVideoChunks.length > 0) {
      videoBlob = new Blob(recordedVideoChunks, { type: 'video/webm' });
    } else {
      const simulatedText = [
        'Travelog simulated video guide source',
        `duration_seconds=${videoRecordSeconds}`,
        `created_at=${new Date().toISOString()}`
      ].join('\n');
      videoBlob = new Blob([simulatedText], { type: 'text/plain' });
    }

    const ext = videoBlob.type.includes('text/plain') ? 'txt' : 'webm';
    const tourName = document.getElementById('new-tour-name')?.value || 'My_Walking_Tour';
    const cleanTourName = tourName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const filename = `guide_video_${cleanTourName}_${Date.now()}.${ext}`;

    recordedVideos.push({
      id: Date.now(),
      name: filename,
      blob: videoBlob,
      stopIndex: -1
    });

    window.TravelogApp.showToast(t('영상 녹화 완료! 리스트에 추가되었습니다.', 'Video recording finished and added to list!', '動画録画完了！リストに追加されました。'));
    
    renderVideoList();
    updatePublishPanelCounts();
  }

  function renderVideoList() {
    const container = document.getElementById('creator-video-list');
    if (!container) return;
    container.innerHTML = '';

    if (recordedVideos.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 12px;">${t('아직 녹화된 영상이 없습니다.', 'No recorded videos yet.', 'まだ録画された動画がありません。')}</div>`;
      return;
    }

    recordedVideos.forEach((video, idx) => {
      const itemEl = document.createElement('div');
      itemEl.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 12px; gap: 8px;';
      
      const selectHtml = getStopSelectHtml(video.stopIndex);

      itemEl.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--accent-blue);">${idx + 1}. ${video.name}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${selectHtml}
          <button class="btn-circle" style="width: 24px; height: 24px; font-size: 10px; background: rgba(255,50,50,0.1); border-color: rgba(255,50,50,0.15); color: var(--accent-pink);" onclick="TravelogCreatorModule.deleteVideo(${video.id})">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      const select = itemEl.querySelector('select');
      if (select) {
        select.addEventListener('change', (e) => {
          video.stopIndex = e.target.value === 'none' ? -1 : parseInt(e.target.value, 10);
          updatePublishPanelCounts();
        });
      }

      container.appendChild(itemEl);
    });
  }

  function deleteVideo(id) {
    recordedVideos = recordedVideos.filter(v => v.id !== id);
    renderVideoList();
    updatePublishPanelCounts();
  }

  // ==========================================
  // Helper UI Utilities
  // ==========================================
  function getStopSelectHtml(stopIndexValue) {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    let optionsHtml = `<option value="none">${t('핀 미연동', 'No link', '未連携')}</option>`;
    
    customPins.forEach((pin, index) => {
      const isSelected = stopIndexValue === index ? 'selected' : '';
      optionsHtml += `<option value="${index}" ${isSelected}>Stop #${index + 1}</option>`;
    });

    return `
      <select style="background: var(--bg-tertiary); border: 1px solid var(--glass-border); color: #373737 !important; padding: 4px; border-radius: 4px; font-size: 11px; outline: none; cursor: pointer;">
        ${optionsHtml}
      </select>
    `;
  }

  function refreshMediaPinSelectors() {
    const audioSelects = document.querySelectorAll('#creator-audio-list select');
    audioSelects.forEach((select, idx) => {
      const currentVal = recordedAudios[idx] ? recordedAudios[idx].stopIndex : -1;
      select.outerHTML = getStopSelectHtml(currentVal);
    });

    const videoSelects = document.querySelectorAll('#creator-video-list select');
    videoSelects.forEach((select, idx) => {
      const currentVal = recordedVideos[idx] ? recordedVideos[idx].stopIndex : -1;
      select.outerHTML = getStopSelectHtml(currentVal);
    });

    const audioItems = document.querySelectorAll('#creator-audio-list > div');
    audioItems.forEach((item, idx) => {
      const select = item.querySelector('select');
      if (select && recordedAudios[idx]) {
        select.addEventListener('change', (e) => {
          recordedAudios[idx].stopIndex = e.target.value === 'none' ? -1 : parseInt(e.target.value, 10);
          updatePublishPanelCounts();
        });
      }
    });

    const videoItems = document.querySelectorAll('#creator-video-list > div');
    videoItems.forEach((item, idx) => {
      const select = item.querySelector('select');
      if (select && recordedVideos[idx]) {
        select.addEventListener('change', (e) => {
          recordedVideos[idx].stopIndex = e.target.value === 'none' ? -1 : parseInt(e.target.value, 10);
          updatePublishPanelCounts();
        });
      }
    });
  }


  function resetFieldCaptureModals() {
    const modalIds = [
      'pin-type-select-modal',
      'voice-memo-modal',
      'video-memo-modal',
      'text-memo-modal',
      'publish-loading-modal'
    ];
    modalIds.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }
    });

    const textMemoInput = document.getElementById('text-memo-input');
    if (textMemoInput) textMemoInput.value = '';
  }

  function resetRecordingStateForNewGuide() {
    if (isRecording) {
      clearInterval(recordInterval);
      isRecording = false;
    }
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      recordingStream = null;
    }
    mediaRecorder = null;
    recordedAudioChunks = [];
    recordSeconds = 0;
    selectedScriptText = '';
    currentRecordingMimeType = '';

    if (isVideoRecording) {
      clearInterval(videoRecordInterval);
      isVideoRecording = false;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    videoMediaRecorder = null;
    recordedVideoChunks = [];
    videoRecordSeconds = 0;

    if (voiceMemoInterval) clearInterval(voiceMemoInterval);
    if (voiceMemoStream) {
      voiceMemoStream.getTracks().forEach(track => track.stop());
      voiceMemoStream = null;
    }
    voiceMemoRecorder = null;
    voiceMemoChunks = [];
    voiceMemoBlob = null;
    voiceMemoSeconds = 0;

    if (videoMemoInterval) clearInterval(videoMemoInterval);
    if (videoMemoStream) {
      videoMemoStream.getTracks().forEach(track => track.stop());
      videoMemoStream = null;
    }
    videoMemoRecorder = null;
    videoMemoChunks = [];
    videoMemoBlob = null;
    videoMemoSeconds = 0;

    const recordBtn = document.getElementById('record-audio-btn');
    if (recordBtn) {
      recordBtn.classList.remove('recording');
      recordBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    }
    const recordStatus = document.getElementById('record-status-text');
    if (recordStatus) recordStatus.textContent = t('마이크 버튼을 클릭하여 녹음 시작', 'Click Mic to Start Recording', 'マイクボタンをクリックして録音開始');
    const recordTimer = document.getElementById('record-timer');
    if (recordTimer) recordTimer.textContent = '00:00';

    const videoBtn = document.getElementById('record-video-btn');
    if (videoBtn) videoBtn.classList.remove('recording');
    const videoStatus = document.getElementById('video-record-status-text');
    if (videoStatus) videoStatus.textContent = t('녹화 버튼 클릭', 'Click video record', '録画ボタンをクリック');
    const videoTimer = document.getElementById('video-record-timer');
    if (videoTimer) videoTimer.textContent = '00:00';

    const voiceMemoStatus = document.getElementById('voice-memo-status');
    if (voiceMemoStatus) voiceMemoStatus.textContent = t('마이크 버튼을 눌러 녹음 시작', 'Press Record to start audio guide', '録音ボタンを押して録音開始');
    const voiceMemoTimer = document.getElementById('voice-memo-timer');
    if (voiceMemoTimer) voiceMemoTimer.textContent = '00:00';
    const videoMemoStatus = document.getElementById('video-memo-status');
    if (videoMemoStatus) videoMemoStatus.textContent = t('녹화 버튼을 눌러 카메라 촬영 시작', 'Press Record to start video guide', '録画ボタンを押して撮影開始');
    const videoMemoTimer = document.getElementById('video-memo-timer');
    if (videoMemoTimer) videoMemoTimer.textContent = '00:00';
  }

  function resetCreatorStudioForNewGuide() {
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : null;
    if (state) {
      state.customCreatedPins = [];
    }

    recordedAudios = [];
    recordedVideos = [];
    registeredCoupons = [];
    saveRegisteredCoupons();

    pendingPublishPackage = null;
    guideCoverDataUrl = '';
    guideIntroAudio = null;
    guideIntroVideo = null;
    localStorage.removeItem(GUIDE_COVER_STORAGE_KEY);
    localStorage.removeItem(GUIDE_INTRO_TEXT_STORAGE_KEY);
    setGuideCoverPreview('');

    const tourNameInput = document.getElementById('new-tour-name');
    if (tourNameInput) tourNameInput.value = t('새 여행 가이드', 'New Travel Guide', '新しい旅行ガイド');

    const guideCoverInput = document.getElementById('guide-cover-input');
    if (guideCoverInput) guideCoverInput.value = '';
    const guideIntroTextInput = document.getElementById('guide-intro-text');
    if (guideIntroTextInput) guideIntroTextInput.value = '';
    const guideIntroAudioInput = document.getElementById('guide-intro-audio-input');
    if (guideIntroAudioInput) guideIntroAudioInput.value = '';
    const guideIntroVideoInput = document.getElementById('guide-intro-video-input');
    if (guideIntroVideoInput) guideIntroVideoInput.value = '';
    setGuideIntroMediaStatus('audio', '');
    setGuideIntroMediaStatus('video', '');

    const vendorInput = document.getElementById('coupon-vendor-input');
    if (vendorInput) vendorInput.value = '';
    updateCouponOfferOptions();

    resetRecordingStateForNewGuide();
    resetFieldCaptureModals();

    if (window.TravelogMapModule && typeof window.TravelogMapModule.clearCreatorPins === 'function') {
      window.TravelogMapModule.clearCreatorPins();
    }

    renderCoordinatesList();
    renderAudioList();
    renderVideoList();
    renderRegisteredCouponList();
    renderPublishedGuidesList();
    updatePublishPanelCounts();
  }

  function updatePublishPanelCounts() {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const pinsCountEl = document.getElementById('publish-pins-count');
    const audiosCountEl = document.getElementById('publish-audios-count');
    const videosCountEl = document.getElementById('publish-videos-count');
    const couponsCountEl = document.getElementById('publish-coupons-count');

    const linkedAudiosCount = recordedAudios.filter(a => a.stopIndex !== -1).length;
    const linkedVideosCount = recordedVideos.filter(v => v.stopIndex !== -1).length;

    if (pinsCountEl) pinsCountEl.textContent = `${customPins.length}개`;
    if (audiosCountEl) audiosCountEl.textContent = `${linkedAudiosCount}개 (총 ${recordedAudios.length}개)`;
    if (videosCountEl) videosCountEl.textContent = `${linkedVideosCount}개 (총 ${recordedVideos.length}개)`;
    if (couponsCountEl) couponsCountEl.textContent = `${registeredCoupons.length}개`;

    // Refresh Map Top HUD dynamically if Map tab is currently active
    const mapTab = document.getElementById('map-tab');
    if (mapTab && mapTab.classList.contains('active') && window.updateMapLayoutForMode) {
      window.updateMapLayoutForMode('create');
    }
  }

  // ==========================================
  // Field Capture Modals Logic
  // ==========================================
  function openPinTypeSelectModal(lat, lng) {
    tempPinLat = lat;
    tempPinLng = lng;
    const modal = document.getElementById('pin-type-select-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function openTextMemoAtLocation(lat, lng) {
    tempPinLat = lat;
    tempPinLng = lng;
    openTextMemoModal();
  }

  // 1) Audio Field Capture
  function openVoiceMemoModal() {
    const modal = document.getElementById('voice-memo-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    voiceMemoChunks = [];
    voiceMemoBlob = null;
    voiceMemoSeconds = 0;
    document.getElementById('voice-memo-timer').textContent = "00:00";
    document.getElementById('voice-memo-status').textContent = t('마이크 버튼을 눌러 녹음 시작', 'Press Record to start audio guide', '録音ボタンを押して録音開始');
    
    document.getElementById('voice-memo-record').disabled = false;
    document.getElementById('voice-memo-stop').disabled = true;
    document.getElementById('voice-memo-play').disabled = true;
    document.getElementById('voice-memo-reset').disabled = true;
    document.getElementById('voice-memo-complete').disabled = true;

    document.getElementById('tape-wheel-left').style.animation = 'none';
    document.getElementById('tape-wheel-right').style.animation = 'none';
  }

  async function startVoiceMemoRecording() {
    document.getElementById('voice-memo-record').disabled = true;
    document.getElementById('voice-memo-stop').disabled = false;
    document.getElementById('voice-memo-status').textContent = t('음성을 녹음 중입니다...', 'Recording audio...', '録音中...');
    
    document.getElementById('tape-wheel-left').style.animation = 'spin 2s linear infinite';
    document.getElementById('tape-wheel-right').style.animation = 'spin 2s linear infinite';

    voiceMemoChunks = [];
    voiceMemoSeconds = 0;
    clearInterval(voiceMemoInterval);
    voiceMemoInterval = setInterval(() => {
      voiceMemoSeconds++;
      const min = Math.floor(voiceMemoSeconds / 60);
      const sec = voiceMemoSeconds % 60;
      document.getElementById('voice-memo-timer').textContent = `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;
    }, 1000);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
        voiceMemoStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceMemoRecorder = new MediaRecorder(voiceMemoStream);
        voiceMemoRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) voiceMemoChunks.push(e.data);
        };
        voiceMemoRecorder.start();
      }
    } catch (err) {
      console.warn('Microphone access denied or unsupported.', err);
    }
  }

  function stopVoiceMemoRecording() {
    document.getElementById('voice-memo-stop').disabled = true;
    document.getElementById('voice-memo-play').disabled = false;
    document.getElementById('voice-memo-reset').disabled = false;
    document.getElementById('voice-memo-complete').disabled = false;
    document.getElementById('voice-memo-status').textContent = t('녹음 완료! 플레이 버튼으로 확인해 보세요.', 'Recording finished! Press Play to listen.', '録음 완료!');

    document.getElementById('tape-wheel-left').style.animation = 'none';
    document.getElementById('tape-wheel-right').style.animation = 'none';
    clearInterval(voiceMemoInterval);

    if (voiceMemoRecorder && voiceMemoRecorder.state !== 'inactive') {
      voiceMemoRecorder.stop();
      if (voiceMemoStream) {
        voiceMemoStream.getTracks().forEach(track => track.stop());
      }
    }

    setTimeout(() => {
      if (voiceMemoChunks.length > 0) {
        voiceMemoBlob = new Blob(voiceMemoChunks, { type: 'audio/webm' });
      } else {
        voiceMemoBlob = new Blob(['Travelog field audio memo data'], { type: 'text/plain' });
      }
    }, 200);
  }

  function playVoiceMemoRecording() {
    if (!voiceMemoBlob) return;
    const url = URL.createObjectURL(voiceMemoBlob);
    const audio = new Audio(url);
    audio.play();
    window.TravelogApp.showToast(t('녹음된 가이드 음성을 재생합니다...', 'Playing guide audio...', '録音されたガイド音声を再生します...'));
  }

  function resetVoiceMemoRecording() {
    openVoiceMemoModal();
  }

  function completeVoiceMemoRecording() {
    document.getElementById('voice-memo-modal').classList.remove('active');

    const cleanTourName = (document.getElementById('new-tour-name')?.value || 'Tour').replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const filename = `voice_memo_${cleanTourName}_${Date.now()}.${voiceMemoBlob && voiceMemoBlob.type.includes('text') ? 'txt' : 'webm'}`;

    if (window.TravelogMapModule && typeof window.TravelogMapModule.addNewCreatorPin === 'function') {
      window.TravelogMapModule.addNewCreatorPin(tempPinLat, tempPinLng, filename);
    }

    const customPins = window.TravelogApp.getState().customCreatedPins;
    const newStopIdx = customPins.length - 1;

    const audioBlobToSave = voiceMemoBlob || new Blob(['Travelog default simulated audio'], { type: 'text/plain' });
    recordedAudios.push({
      id: Date.now(),
      name: filename,
      blob: audioBlobToSave,
      stopIndex: newStopIdx
    });

    if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.saveGeneratedFile === 'function') {
      window.TravelogDeviceStorage.saveGeneratedFile('Audio', filename, audioBlobToSave, {
        source: 'field-audio-memo',
        stopIndex: newStopIdx,
        lat: tempPinLat,
        lng: tempPinLng
      }).then(() => {
        window.TravelogApp.showToast(t("Audio 폴더에 음성 메모가 저장되었습니다.", "Audio memo saved to the Audio folder.", 'Audioフォルダに音声メモを保存しました。'));
      }).catch((error) => {
        console.warn('[Travelog Device Storage] Audio memo save failed:', error);
        window.TravelogApp.showToast(t('음성 메모는 앱에 보관되었지만 기기 저장소 쓰기에 실패했습니다.', 'Audio memo is kept in the app, but device write failed.', '音声メモはアプリに保持されましたが端末保存に失敗しました。'));
      });
    } else {
      window.TravelogApp.showToast(t("음성 메모가 앱에 저장되었습니다.", "Voice memo saved in the app.", '音声メモをアプリに保存しました。'));
    }

    renderCoordinatesList();
    renderAudioList();
    updatePublishPanelCounts();
  }

  // 2) Video Field Capture
  function openVideoMemoModal() {
    const modal = document.getElementById('video-memo-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    videoMemoChunks = [];
    videoMemoBlob = null;
    videoMemoSeconds = 0;
    document.getElementById('video-memo-timer').style.display = 'none';
    document.getElementById('video-memo-timer').textContent = "00:00 REC";
    document.getElementById('video-memo-status').textContent = t('녹화 버튼을 눌러 카메라 촬영 시작', 'Press Record to start video guide', '録画ボタンを押して撮影開始');
    
    document.getElementById('video-memo-record').disabled = false;
    document.getElementById('video-memo-stop').disabled = true;
    document.getElementById('video-memo-play').disabled = true;
    document.getElementById('video-memo-reset').disabled = true;
    document.getElementById('video-memo-complete').disabled = true;

    document.getElementById('video-memo-webcam').style.display = 'none';
    document.getElementById('video-memo-placeholder').style.display = 'block';
  }

  async function startVideoMemoRecording() {
    document.getElementById('video-memo-record').disabled = true;
    document.getElementById('video-memo-stop').disabled = false;
    document.getElementById('video-memo-status').textContent = t('카메라 가이드 영상을 촬영 중입니다...', 'Recording video...', '動画撮影中...');
    
    const webcamEl = document.getElementById('video-memo-webcam');
    const placeholder = document.getElementById('video-memo-placeholder');
    const timer = document.getElementById('video-memo-timer');

    if (timer) timer.style.display = 'block';

    videoMemoChunks = [];
    videoMemoSeconds = 0;
    clearInterval(videoMemoInterval);
    videoMemoInterval = setInterval(() => {
      videoMemoSeconds++;
      const min = Math.floor(videoMemoSeconds / 60);
      const sec = videoMemoSeconds % 60;
      if (timer) timer.textContent = `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec} REC`;
    }, 1000);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
        videoMemoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (webcamEl) {
          webcamEl.srcObject = videoMemoStream;
          webcamEl.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';

        videoMemoRecorder = new MediaRecorder(videoMemoStream);
        videoMemoRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) videoMemoChunks.push(e.data);
        };
        videoMemoRecorder.start();
      }
    } catch (err) {
      console.warn('Camera access denied or unsupported.', err);
    }
  }

  function stopVideoMemoRecording() {
    document.getElementById('video-memo-stop').disabled = true;
    document.getElementById('video-memo-play').disabled = false;
    document.getElementById('video-memo-reset').disabled = false;
    document.getElementById('video-memo-complete').disabled = false;
    document.getElementById('video-memo-status').textContent = t('촬영 완료! 저장 혹은 다시 녹화를 선택하세요.', 'Recording finished! Ready to save.', '録画完了！');

    document.getElementById('video-memo-timer').style.display = 'none';
    clearInterval(videoMemoInterval);

    const webcamEl = document.getElementById('video-memo-webcam');
    if (webcamEl) {
      webcamEl.srcObject = null;
      webcamEl.style.display = 'none';
    }
    document.getElementById('video-memo-placeholder').style.display = 'block';

    if (videoMemoRecorder && videoMemoRecorder.state !== 'inactive') {
      videoMemoRecorder.stop();
      if (videoMemoStream) {
        videoMemoStream.getTracks().forEach(track => track.stop());
      }
    }

    setTimeout(() => {
      if (videoMemoChunks.length > 0) {
        videoMemoBlob = new Blob(videoMemoChunks, { type: 'video/webm' });
      } else {
        videoMemoBlob = new Blob(['Travelog field video guide data'], { type: 'text/plain' });
      }
    }, 200);
  }

  function playVideoMemoRecording() {
    if (!videoMemoBlob) return;
    window.TravelogApp.showToast(t('촬영된 가이드 비디오를 재생 확인 중...', 'Playing recorded video guide...', '録画されたガイド動画を再生中...'));
  }

  function resetVideoMemoRecording() {
    openVideoMemoModal();
  }

  function completeVideoMemoRecording() {
    document.getElementById('video-memo-modal').classList.remove('active');

    const cleanTourName = (document.getElementById('new-tour-name')?.value || 'Tour').replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const filename = `video_memo_${cleanTourName}_${Date.now()}.${videoMemoBlob && videoMemoBlob.type.includes('text') ? 'txt' : 'webm'}`;

    if (window.TravelogMapModule && typeof window.TravelogMapModule.addNewCreatorPin === 'function') {
      window.TravelogMapModule.addNewCreatorPin(tempPinLat, tempPinLng, filename);
    }

    const customPins = window.TravelogApp.getState().customCreatedPins;
    const newStopIdx = customPins.length - 1;

    const videoBlobToSave = videoMemoBlob || new Blob(['Travelog default simulated video'], { type: 'text/plain' });
    recordedVideos.push({
      id: Date.now(),
      name: filename,
      blob: videoBlobToSave,
      stopIndex: newStopIdx
    });

    if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.saveGeneratedFile === 'function') {
      window.TravelogDeviceStorage.saveGeneratedFile('Video', filename, videoBlobToSave, {
        source: 'field-video-memo',
        stopIndex: newStopIdx,
        lat: tempPinLat,
        lng: tempPinLng
      }).then(() => {
        window.TravelogApp.showToast(t("Video 폴더에 영상 메모가 저장되었습니다.", "Video memo saved to the Video folder.", 'Videoフォルダに動画メモを保存しました。'));
      }).catch((error) => {
        console.warn('[Travelog Device Storage] Video memo save failed:', error);
        window.TravelogApp.showToast(t('영상 메모는 앱에 보관되었지만 기기 저장소 쓰기에 실패했습니다.', 'Video memo is kept in the app, but device write failed.', '動画メモはアプリに保持されましたが端末保存に失敗しました。'));
      });
    } else {
      window.TravelogApp.showToast(t("영상 메모가 앱에 저장되었습니다.", "Video memo saved in the app.", '動画メモをアプリに保存しました。'));
    }

    renderCoordinatesList();
    renderVideoList();
    updatePublishPanelCounts();
  }

  // 3) Text Field Capture
  function openTextMemoModal() {
    const modal = document.getElementById('text-memo-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    document.getElementById('text-memo-input').value = '';
  }

  function completeTextMemoRecording() {
    const memoVal = document.getElementById('text-memo-input').value.trim();
    if (!memoVal) {
      window.TravelogApp.showToast(t('메모 내용을 입력해 주세요!', 'Please enter some text description!', '메모 내용을 입력해주세요!'));
      return;
    }

    document.getElementById('text-memo-modal').classList.remove('active');

    if (window.TravelogMapModule && typeof window.TravelogMapModule.addNewCreatorPin === 'function') {
      window.TravelogMapModule.addNewCreatorPin(tempPinLat, tempPinLng, memoVal);
    }

    const cleanTourName = (document.getElementById('new-tour-name')?.value || 'Tour').replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const filename = `text_memo_${cleanTourName}_${Date.now()}.txt`;
    const textBlobToSave = new Blob([memoVal], { type: 'text/plain;charset=utf-8' });

    if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.saveGeneratedFile === 'function') {
      window.TravelogDeviceStorage.saveGeneratedFile('Text', filename, textBlobToSave, {
        source: 'field-text-memo',
        lat: tempPinLat,
        lng: tempPinLng
      }).then(() => {
        window.TravelogApp.showToast(t("Text 폴더에 텍스트 메모가 저장되었습니다.", "Text memo saved to the Text folder.", 'Textフォルダにテキストメモを保存しました。'));
      }).catch((error) => {
        console.warn('[Travelog Device Storage] Text memo save failed:', error);
        window.TravelogApp.showToast(t('텍스트 메모는 앱에 보관되었지만 기기 저장소 쓰기에 실패했습니다.', 'Text memo is kept in the app, but device write failed.', 'テキストメモはアプリに保持されましたが端末保存に失敗しました。'));
      });
    } else {
      window.TravelogApp.showToast(t("텍스트 메모가 앱에 저장되었습니다.", "Text memo saved in the app.", 'テキストメモをアプリに保存しました。'));
    }

    renderCoordinatesList();
    updatePublishPanelCounts();
  }

  return {
    init: init,
    openPinTypeSelectModal: openPinTypeSelectModal,
    openTextMemoAtLocation: openTextMemoAtLocation,
    onLanguageChange: () => {
      renderCoordinatesList();
      renderAudioList();
      renderVideoList();
      updatePublishPanelCounts();
    },
    removeCoordinate: removeCoordinate,
    moveCoordinate: moveCoordinate,
    moveCoordinateTo: moveCoordinateTo,
    removeRegisteredCoupon: removeRegisteredCoupon,
    openPublishedGuideEditor: openPublishedGuideEditor,
    deletePublishedGuide: deletePublishedGuide,
    connectPinsOnMap: connectPinsOnMap,
    previewCurrentGuide: previewCurrentGuide,
    resetCreatorStudioForNewGuide: resetCreatorStudioForNewGuide,
    deleteAudio: deleteAudio,
    deleteVideo: deleteVideo,
    renderCoordinatesList: renderCoordinatesList,
    getMediaCounts: () => {
      return {
        audios: recordedAudios.length,
        videos: recordedVideos.length,
        coupons: registeredCoupons.length
      };
    }
  };
})();

// Attach globally
window.TravelogCreatorModule = TravelogCreatorModule;
