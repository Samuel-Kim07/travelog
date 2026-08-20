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
  let recordedPhotos = [];

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
  const CREATOR_SAVED_GUIDES_KEY = 'travelog_creator_saved_guides_v1';
  const CREATOR_PUBLISHED_GUIDES_KEY = 'travelog_creator_published_guides_v1';
  const REGISTERED_COUPONS_STORAGE_KEY = 'travelog_creator_registered_coupons_v1';
  const EVENT_COUPON_CATALOG = {
    '황궁쟁반짜장': ['짜장세트 30%할인권'],
    '천종원 우삼겹 식당': ['우삼겹1인분무료쿠폰', '2인정식세트30%할인권'],
    '나이키 서초점': ['전품목40%할인권']
  };
  let pendingPublishPackage = null;
  let lastSavedPublishSignature = '';
  let guideCoverDataUrl = '';
  let guideIntroAudio = null;
  let guideIntroVideo = null;
  let registeredCoupons = [];
  let editingPublishedGuideId = null;
  let savedGuideRecordsRuntime = null;
  let activeStudioEditGuideId = null;
  let activeStudioEditStatus = 'new';
  let activeStudioEditTitle = '';
  let activeStudioEditCreatedAt = '';

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

  function initGuidePricingControls() {
    const freeRadio = document.getElementById('guide-price-free');
    const paidRadio = document.getElementById('guide-price-paid');
    const priceInput = document.getElementById('guide-price-coin-input');
    const sync = () => {
      if (priceInput) priceInput.disabled = !(paidRadio && paidRadio.checked);
      updateFinalPublishButtonState();
    };
    if (freeRadio && !freeRadio.dataset.bound) {
      freeRadio.dataset.bound = 'true';
      freeRadio.addEventListener('change', sync);
    }
    if (paidRadio && !paidRadio.dataset.bound) {
      paidRadio.dataset.bound = 'true';
      paidRadio.addEventListener('change', sync);
    }
    if (priceInput && !priceInput.dataset.bound) {
      priceInput.dataset.bound = 'true';
      priceInput.addEventListener('input', () => {
        const value = Math.max(0, Math.floor(Number(priceInput.value) || 0));
        priceInput.value = String(value);
        updateFinalPublishButtonState();
      });
    }
    sync();
  }

  function getGuidePricing() {
    const paidRadio = document.getElementById('guide-price-paid');
    const priceInput = document.getElementById('guide-price-coin-input');
    const isPaid = !!(paidRadio && paidRadio.checked);
    const coinPrice = isPaid ? Math.max(0, Math.floor(Number(priceInput?.value || 0))) : 0;
    return {
      isPaid: isPaid && coinPrice > 0,
      coinPrice: isPaid ? coinPrice : 0,
      label: isPaid && coinPrice > 0 ? `${coinPrice.toLocaleString()} COIN` : '무료'
    };
  }


  function compactDataUrlToken(dataUrl) {
    const value = String(dataUrl || '');
    if (!value) return '';
    return `${value.length}:${value.slice(0, 80)}:${value.slice(-80)}`;
  }

  function getPublishContentSignature() {
    const tourName = document.getElementById('new-tour-name')?.value?.trim() || 'My Walking Tour';
    const pricing = getGuidePricing();
    const pins = getOrderedCustomPins().map((pin, index) => ({
      id: pin.id,
      order: index + 1,
      nameKo: pin.nameKo || '',
      nameEn: pin.nameEn || '',
      nameJa: pin.nameJa || '',
      lat: Number(pin.lat || 0),
      lng: Number(pin.lng || 0),
      description: pin.description || '',
      color: pin.color || ''
    }));

    return JSON.stringify({
      tourName,
      pricing,
      guideCover: compactDataUrlToken(getGuideCoverDataUrl()),
      guideIntroText: getGuideIntroText(),
      guideIntroAudio: guideIntroAudio ? { fileName: guideIntroAudio.fileName, size: guideIntroAudio.size, mimeType: guideIntroAudio.mimeType } : null,
      guideIntroVideo: guideIntroVideo ? { fileName: guideIntroVideo.fileName, size: guideIntroVideo.size, mimeType: guideIntroVideo.mimeType } : null,
      pins,
      audios: recordedAudios.map(a => ({ name: a.name, title: getMediaDisplayTitle(a), stopIndex: Number(a.stopIndex), size: a.blob?.size || a.size || 0 })),
      videos: recordedVideos.map(v => ({ name: v.name, title: getMediaDisplayTitle(v), stopIndex: Number(v.stopIndex), size: v.blob?.size || v.size || 0 })),
      coupons: registeredCoupons.map(c => ({ vendor: c.vendor || '', offer: c.offer || '' }))
    });
  }

  function getPublishReadiness() {
    const pinCount = getOrderedCustomPins().length;
    const hasPins = pinCount > 0;

    if (isStudioEditMode()) {
      return {
        ready: hasPins,
        reason: hasPins
          ? t('수정 완료를 누르면 기존 가이드 데이터를 덮어씁니다.', 'Tap Complete Edit to overwrite the existing guide.', '修正完了で既存ガイドを上書きします。')
          : t('핀을 1개 이상 추가해야 수정 완료할 수 있습니다.', 'Add at least one pin before completing the edit.', 'ピンを1つ以上追加してから修正完了してください。')
      };
    }

    const currentSignature = getPublishContentSignature();
    const hasSavedPackage = !!pendingPublishPackage && !!lastSavedPublishSignature;
    const isDirtyAfterSave = hasSavedPackage && currentSignature !== lastSavedPublishSignature;

    if (!hasPins) {
      return {
        ready: false,
        reason: t('핀을 1개 이상 추가한 뒤 저장하기를 눌러야 출간할 수 있습니다.', 'Add at least one pin, then save before publishing.', 'ピンを1つ以上追加して保存してから公開してください。')
      };
    }

    if (!hasSavedPackage) {
      return {
        ready: false,
        reason: t('먼저 저장하기를 눌러 디바이스에 출간 데이터를 저장해 주세요.', 'Save the guide to this device before publishing.', '先に保存して端末に公開データを保存してください。')
      };
    }

    if (isDirtyAfterSave) {
      return {
        ready: false,
        reason: t('가이드 내용이 저장 후 변경되었습니다. 다시 저장하면 출간할 수 있습니다.', 'The guide changed after saving. Save again before publishing.', '保存後にガイド内容が変更されました。再保存後に公開できます。')
      };
    }

    return {
      ready: true,
      reason: t('출간 조건이 충족되었습니다. 최종 출간하기를 누를 수 있습니다.', 'Ready to publish.', '公開条件が揃いました。')
    };
  }

  function updateFinalPublishButtonState() {
    updateStudioModeUi();
    const finalPublishBtn = document.getElementById('publish-final-tour-btn');
    const hint = document.getElementById('publish-ready-hint');
    const readiness = getPublishReadiness();

    if (finalPublishBtn) {
      finalPublishBtn.setAttribute('aria-disabled', readiness.ready ? 'false' : 'true');
      finalPublishBtn.style.background = readiness.ready ? 'var(--grad-pink-purple)' : '#b8b8b8';
      finalPublishBtn.style.opacity = readiness.ready ? '1' : '.78';
      finalPublishBtn.style.cursor = readiness.ready ? 'pointer' : 'not-allowed';
      finalPublishBtn.style.boxShadow = readiness.ready ? '' : 'none';
    }

    if (hint) {
      hint.textContent = readiness.reason;
      hint.style.color = readiness.ready ? 'var(--accent-green)' : 'var(--text-muted)';
    }
  }

  function markPublishDraftDirty() {
    updateFinalPublishButtonState();
  }

  function isStudioEditMode() {
    return !!activeStudioEditGuideId;
  }

  function isActiveEditPublished() {
    if (!activeStudioEditGuideId) return false;
    if (activeStudioEditStatus === 'published') return true;
    return getPublishedGuideRecords().some(record => String(record.id) === String(activeStudioEditGuideId));
  }

  function updateStudioModeUi() {
    const banner = document.getElementById('creator-mode-banner');
    const label = document.getElementById('creator-mode-label');
    const title = document.getElementById('creator-mode-title');
    const desc = document.getElementById('creator-mode-desc');
    const publishBtn = document.getElementById('publish-final-tour-btn');
    const publishBtnText = publishBtn?.querySelector('span');
    const publishBtnIcon = publishBtn?.querySelector('img');
    const saveBtnText = document.querySelector('#save-current-guide-btn span');

    if (isStudioEditMode()) {
      banner?.classList.add('editing');
      if (label) label.innerHTML = '<img class="studio-svg-icon studio-svg-icon-small" src="assets/icons/studio/studio-create.svg" alt="" aria-hidden="true"> 가이드 수정중';
      if (title) title.textContent = document.getElementById('new-tour-name')?.value?.trim() || activeStudioEditTitle || '수정 중인 가이드';
      if (desc) desc.textContent = isActiveEditPublished()
        ? '출간된 가이드를 수정 중입니다. 수정 완료 시 기존 Supabase 데이터와 저장 기록을 덮어씁니다.'
        : '저장된 가이드를 수정 중입니다. 수정 완료 시 기존 저장 데이터를 덮어씁니다.';
      if (publishBtnText) publishBtnText.textContent = '수정 완료';
      if (publishBtnIcon) publishBtnIcon.src = 'assets/icons/studio/studio-check-white.svg';
      if (saveBtnText) saveBtnText.textContent = '수정 저장';
      return;
    }

    banner?.classList.remove('editing');
    if (label) label.innerHTML = '<img class="studio-svg-icon studio-svg-icon-small" src="assets/icons/studio/studio-create.svg" alt="" aria-hidden="true"> 가이드 제작중';
    if (title) title.textContent = '새 가이드 제작';
    if (desc) desc.textContent = '새로운 가이드 출간을 준비하고 있습니다.';
    if (publishBtnText) publishBtnText.textContent = '최종 출간하기';
    if (publishBtnIcon) publishBtnIcon.src = 'assets/icons/studio/studio-publish-white.svg';
    if (saveBtnText) saveBtnText.textContent = '저장하기';
  }

  function setStudioEditMode(record, status = 'unpublished') {
    activeStudioEditGuideId = record?.id || null;
    activeStudioEditStatus = status || record?.status || 'unpublished';
    activeStudioEditTitle = record?.tourName || '';
    activeStudioEditCreatedAt = record?.createdAt || '';
    updateStudioModeUi();
  }

  function clearStudioEditMode() {
    activeStudioEditGuideId = null;
    activeStudioEditStatus = 'new';
    activeStudioEditTitle = '';
    activeStudioEditCreatedAt = '';
    updateStudioModeUi();
  }

  function bindPublishReadinessWatchers() {
    ['new-tour-name', 'guide-intro-text', 'guide-price-coin-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.publishReadyWatcher) {
        el.dataset.publishReadyWatcher = 'true';
        el.addEventListener('input', markPublishDraftDirty);
        el.addEventListener('change', markPublishDraftDirty);
      }
    });

    ['guide-price-free', 'guide-price-paid'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.publishReadyWatcher) {
        el.dataset.publishReadyWatcher = 'true';
        el.addEventListener('change', markPublishDraftDirty);
      }
    });
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
        markPublishDraftDirty();
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
          markPublishDraftDirty();
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
        blob: file,
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
        markPublishDraftDirty();
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
      markPublishDraftDirty();
      window.TravelogApp?.showToast(t('투어소개 음성을 삭제했습니다.', 'Intro audio removed.', '紹介音声を削除しました。'));
    });

    if (videoClearBtn) videoClearBtn.addEventListener('click', () => {
      guideIntroVideo = null;
      if (videoInput) videoInput.value = '';
      setGuideIntroMediaStatus('video', '');
      markPublishDraftDirty();
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
      markPublishDraftDirty();
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
      markPublishDraftDirty();
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
  let voiceMemoPlaybackAudio = null;
  let voiceMemoPlaybackUrl = '';
  let voiceMemoPlaybackInterval = null;

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
    initGuidePricingControls();
    bindPublishReadinessWatchers();
    renderCoordinatesList();
    renderAudioList();
    renderVideoList();
    renderRegisteredCouponList();
    renderSavedGuidesList();
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

    const saveCurrentGuideBtn = document.getElementById('save-current-guide-btn');
    if (saveCurrentGuideBtn) {
      saveCurrentGuideBtn.addEventListener('click', saveTour);
    }

    const previewGuideBtn = document.getElementById('preview-current-guide-btn');
    if (previewGuideBtn) {
      previewGuideBtn.addEventListener('click', previewCurrentGuide);
    }

    // Bind Final Publish Action
    const finalPublishBtn = document.getElementById('publish-final-tour-btn');
    if (finalPublishBtn) {
      finalPublishBtn.addEventListener('click', handleFinalPublishClick);
    }

    const publishDriveUploadBtn = document.getElementById('publish-drive-upload-btn');
    if (publishDriveUploadBtn) {
      publishDriveUploadBtn.addEventListener('click', handleFinalPublishClick);
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
      const photoMemoTypeBtn = document.getElementById('btn-select-photo-memo');
      if (photoMemoTypeBtn) {
        photoMemoTypeBtn.addEventListener('click', () => {
          typeSelectModal.classList.remove('active');
          openPhotoMemoModal();
        });
      }
      document.getElementById('btn-select-text-memo').addEventListener('click', () => {
        typeSelectModal.classList.remove('active');
        openTextMemoModal();
      });
      document.getElementById('btn-close-type-select').addEventListener('click', closePinTypeSelectModal);
      const pinTypeCloseX = document.getElementById('btn-close-pin-type-select-x');
      if (pinTypeCloseX) pinTypeCloseX.addEventListener('click', closePinTypeSelectModal);
    }

    // 2) 음성 메모 모달 레코딩 바인딩
    const voiceComplete = document.getElementById('voice-memo-complete');
    if (voiceComplete) {
      document.getElementById('voice-memo-record').addEventListener('click', startVoiceMemoRecording);
      document.getElementById('voice-memo-stop').addEventListener('click', stopVoiceMemoRecording);
      document.getElementById('voice-memo-play').addEventListener('click', playVoiceMemoRecording);
      document.getElementById('voice-memo-reset').addEventListener('click', resetVoiceMemoRecording);
      const voiceCloseBtn = document.getElementById('voice-memo-close-btn');
      if (voiceCloseBtn) voiceCloseBtn.addEventListener('click', closeVoiceMemoModal);
      voiceComplete.addEventListener('click', completeVoiceMemoRecording);
    }

    // 3) 영상 메모 모달 레코딩 바인딩
    const videoComplete = document.getElementById('video-memo-complete');
    if (videoComplete) {
      document.getElementById('video-memo-record').addEventListener('click', startVideoMemoRecording);
      document.getElementById('video-memo-stop').addEventListener('click', stopVideoMemoRecording);
      document.getElementById('video-memo-play').addEventListener('click', playVideoMemoRecording);
      document.getElementById('video-memo-reset').addEventListener('click', resetVideoMemoRecording);
      const videoCloseBtn = document.getElementById('video-memo-close-btn');
      if (videoCloseBtn) videoCloseBtn.addEventListener('click', closeVideoMemoModal);
      videoComplete.addEventListener('click', completeVideoMemoRecording);
    }

    // 4) 텍스트 메모 모달 바인딩
    const textComplete = document.getElementById('text-memo-complete');
    if (textComplete) {
      document.getElementById('text-memo-cancel').addEventListener('click', closeTextMemoModal);
      const textCloseBtn = document.getElementById('text-memo-close-btn');
      if (textCloseBtn) textCloseBtn.addEventListener('click', closeTextMemoModal);
      textComplete.addEventListener('click', completeTextMemoRecording);
    }

    // 5) 사진 메모 모달 바인딩
    const photoComplete = document.getElementById('photo-memo-complete');
    if (photoComplete) {
      bindPhotoMemoModalControls();
      photoComplete.addEventListener('click', completePhotoMemoRecording);
    }
  }

  // ==========================================
  // Custom Map Pins Planner
  // ==========================================

  function updateCreatorPinName(pinId, nextName) {
    const cleanName = String(nextName || '').trim();
    const fallbackName = t('이름 없는 핀', 'Untitled Pin', '無題ピン');
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : null;
    const pin = state && Array.isArray(state.customCreatedPins)
      ? state.customCreatedPins.find(item => String(item.id) === String(pinId))
      : null;

    if (!pin) return;

    const finalName = cleanName || fallbackName;
    pin.nameKo = finalName;
    pin.nameEn = finalName;
    pin.nameJa = finalName;
    pin.name = finalName;

    if (window.TravelogMapModule && typeof window.TravelogMapModule.updateCreatorPinName === 'function') {
      window.TravelogMapModule.updateCreatorPinName(pin.id, finalName);
    }

    markPublishDraftDirty();
  }


  function getMemoTitleInputValue(inputId, fallbackTitle) {
    const input = document.getElementById(inputId);
    const value = String(input?.value || '').trim();
    return value || fallbackTitle || '';
  }

  function getMediaDisplayTitle(file, fallback = '') {
    return String(file?.displayTitle || file?.title || file?.memoTitle || fallback || file?.fileName || file?.name || '').trim();
  }

  function makePlayableMediaInfo(file, type) {
    if (!file) return null;
    const blob = file.blob instanceof Blob ? file.blob : null;
    const mimeType = blob?.type || file.mimeType || (type === 'video' ? 'video/webm' : type === 'photo' ? 'image/png' : 'audio/webm');
    const info = {
      type,
      fileName: file.fileName || file.name || `${type}_memo_${Date.now()}`,
      title: getMediaDisplayTitle(file, file.fileName || file.name || ''),
      displayTitle: getMediaDisplayTitle(file, file.fileName || file.name || ''),
      memoTitle: getMediaDisplayTitle(file, file.fileName || file.name || ''),
      mimeType,
      stopIndex: typeof file.stopIndex === 'number' ? file.stopIndex : Number(file.stopIndex || 0),
      pinId: file.pinId || '',
      text: file.memoText || file.text || '',
      deviceStorageRef: file.deviceStorageRef ? { ...file.deviceStorageRef } : null
    };

    if (file.dataUrl) info.dataUrl = file.dataUrl;
    if (file.objectUrl) info.objectUrl = file.objectUrl;
    if (blob) {
      try {
        info.objectUrl = info.objectUrl || URL.createObjectURL(blob);
      } catch (_) {}
      if (!file.dataUrl && typeof blobToDataUrl === 'function') {
        blobToDataUrl(blob).then((dataUrl) => {
          file.dataUrl = dataUrl;
          info.dataUrl = dataUrl;
        }).catch(() => {});
      }
    }
    return info;
  }

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
      const existingName = pin.name || pin.nameKo || pin.nameEn || pin.nameJa || '';
      if (!existingName) {
        pin.nameEn = `Custom Pin #${index + 1}`;
        pin.nameKo = `커스텀 핀 #${index + 1}`;
        pin.nameJa = `カスタムピン #${index + 1}`;
      } else {
        pin.name = existingName;
        pin.nameKo = pin.nameKo || existingName;
        pin.nameEn = pin.nameEn || existingName;
        pin.nameJa = pin.nameJa || existingName;
      }
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

  async function previewCurrentGuide() {
    const orderedPins = getOrderedCustomPins();
    if (orderedPins.length === 0) {
      window.TravelogApp.showToast(t('미리보기할 핀이 없습니다. 지도에서 코스핀을 먼저 추가해 주세요.', 'There are no pins to preview.', 'プレビューするピンがありません。'));
      return;
    }

    const packageData = await buildGuidePublishPackage();
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
          <input type="text" class="pin-name-input" value="${escapeHtml(pick(pin, 'name') || pin.nameKo || '')}" placeholder="${t('핀 이름', 'Pin name', 'ピン名')}" title="핀 이름 변경" style="width:100%; font-weight:800; font-size:13px; padding:4px 6px; border-radius:6px; background:#fff; border:1px solid rgba(0,0,0,0.14); color:#373737 !important;">
          <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
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

      const nameInput = row.querySelector('.pin-name-input');
      if (nameInput) {
        nameInput.addEventListener('input', (e) => {
          updateCreatorPinName(pin.id, e.target.value);
        });
        nameInput.addEventListener('blur', (e) => {
          const fallback = t(`메모핀 ${index + 1}`, `Memo Pin ${index + 1}`, `メモピン ${index + 1}`);
          if (!String(e.target.value || '').trim()) {
            e.target.value = fallback;
            updateCreatorPinName(pin.id, fallback);
          }
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
          markPublishDraftDirty();
          if (window.TravelogMapModule && typeof window.TravelogMapModule.refreshCreatorPinPopup === 'function') {
            window.TravelogMapModule.refreshCreatorPinPopup(pin.id);
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

  function createTravelogGuideId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const random = Math.random() * 16 | 0;
      const value = char === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
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
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('image')) return 'png';
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
        'memo_type', 'file_folder', 'file_name', 'memo_text', 'lat', 'lng', 'linked_audio', 'linked_video', 'linked_photo'
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
        pin.linkedVideos.join('; '),
        (pin.linkedPhotos || []).join('; ')
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
        '',
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
        file.fileName,
        ''
      ]);
    });

    (packageData.photoFiles || []).forEach(file => {
      rows.push([
        packageData.guideId,
        packageData.tourName,
        packageData.creator,
        packageData.createdAt,
        'photo',
        file.stopIndex + 1,
        file.pinId || '',
        'photo',
        'Photo',
        file.fileName,
        file.memoText || '',
        file.lat || '',
        file.lng || '',
        '',
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
        '',
        ''
      ]);
    });

    return rows;
  }

  function rowsToCsv(rows) {
    return rows.map(row => row.map(csvCell).join(',')).join('\n');
  }

  async function ensureRecordedMediaDataUrls() {
    const allMedia = [
      ...recordedAudios.map(item => ({ item, type: 'audio' })),
      ...recordedVideos.map(item => ({ item, type: 'video' })),
      ...recordedPhotos.map(item => ({ item, type: 'photo' }))
    ];

    for (const entry of allMedia) {
      const item = entry.item;
      if (!item) continue;
      const blob = item.blob instanceof Blob ? item.blob : null;
      if (blob) {
        item.mimeType = item.mimeType || blob.type || (entry.type === 'video' ? 'video/webm' : entry.type === 'photo' ? 'image/png' : 'audio/webm');
        if (!item.objectUrl) {
          try { item.objectUrl = URL.createObjectURL(blob); } catch (_) {}
        }
        if (!item.dataUrl) {
          try { item.dataUrl = await blobToDataUrl(blob); } catch (error) { console.warn('[Travelog Creator] Media DataURL conversion failed:', error); }
        }
      }
    }
  }

  function dataUrlToMediaBlob(dataUrl) {
    const value = String(dataUrl || '');
    const match = value.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/);
    if (!match) return null;
    try {
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return new Blob([bytes], { type: match[1] || 'application/octet-stream' });
    } catch (_) {
      return null;
    }
  }

  function getRealMediaBlob(item) {
    if (item?.blob instanceof Blob) return item.blob;
    return dataUrlToMediaBlob(item?.dataUrl || item?.url || '');
  }

  function requireRealMediaBlob(item, kind, label) {
    const blob = getRealMediaBlob(item);
    const expectedPrefix = kind === 'photo' ? 'image/' : `${kind}/`;
    if (!(blob instanceof Blob) || blob.size <= 0 || !String(blob.type || '').startsWith(expectedPrefix)) {
      const error = new Error('MEDIA_SOURCE_MISSING');
      error.detail = t(
        `${label}의 실제 원본 파일이 없습니다. 해당 음성·영상·사진 파일을 다시 등록한 뒤 저장해 주세요.`,
        `The original file for ${label} is missing. Add the audio, video, or photo again before saving.`,
        `${label}の元ファイルがありません。音声・動画・写真を再登録してから保存してください。`
      );
      throw error;
    }
    return blob;
  }

  function isMediaSourceError(error) {
    return error?.message === 'MEDIA_SOURCE_MISSING' || error?.message === 'INVALID_MEDIA_FILE';
  }

  async function buildGuidePublishPackage() {
    await ensureRecordedMediaDataUrls();
    const orderedPins = getOrderedCustomPins();
    normalizeCustomPinOrder(orderedPins);

    const tourName = document.getElementById('new-tour-name')?.value?.trim() || 'My Walking Tour';
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : {};
    const creator = state.userProfile?.nickname || 'Travelog Creator';
    const createdAt = activeStudioEditCreatedAt || new Date().toISOString();
    const guideId = activeStudioEditGuideId || createTravelogGuideId();
    const tourSlug = safeFileName(tourName, 'travelog_guide');
    const representativeImage = getGuideCoverDataUrl();
    const guideIntroText = getGuideIntroText();
    const guideIntroAudioInfo = guideIntroAudio ? { ...guideIntroAudio } : null;
    const guideIntroVideoInfo = guideIntroVideo ? { ...guideIntroVideo } : null;
    if (guideIntroAudioInfo) guideIntroAudioInfo.blob = requireRealMediaBlob(guideIntroAudioInfo, 'audio', t('투어소개 음성', 'intro audio', '紹介音声'));
    if (guideIntroVideoInfo) guideIntroVideoInfo.blob = requireRealMediaBlob(guideIntroVideoInfo, 'video', t('투어소개 영상', 'intro video', '紹介動画'));
    const eventCoupons = registeredCoupons.map(coupon => ({ ...coupon }));
    const monetization = getGuidePricing();

    const pins = orderedPins.map((pin, index) => {
      const linkedAudioItems = recordedAudios.filter(a => Number(a.stopIndex) === index);
      const linkedVideoItems = recordedVideos.filter(v => Number(v.stopIndex) === index);
      const linkedPhotoItems = recordedPhotos.filter(p => Number(p.stopIndex) === index);
      const linkedAudios = linkedAudioItems.map(a => a.name || a.fileName || 'audio_memo.webm');
      const linkedVideos = linkedVideoItems.map(v => v.name || v.fileName || 'video_memo.webm');
      const linkedPhotos = linkedPhotoItems.map(p => p.name || p.fileName || 'photo_memo.png');
      const linkedAudioFiles = linkedAudioItems.map(item => makePlayableMediaInfo(item, 'audio')).filter(Boolean);
      const linkedVideoFiles = linkedVideoItems.map(item => makePlayableMediaInfo(item, 'video')).filter(Boolean);
      const linkedPhotoFiles = linkedPhotoItems.map(item => makePlayableMediaInfo(item, 'photo')).filter(Boolean);
      const linkedAudioTitles = linkedAudioItems.map(item => getMediaDisplayTitle(item, item.name || item.fileName || '')).filter(Boolean);
      const linkedVideoTitles = linkedVideoItems.map(item => getMediaDisplayTitle(item, item.name || item.fileName || '')).filter(Boolean);
      const linkedPhotoTitles = linkedPhotoItems.map(item => getMediaDisplayTitle(item, item.name || item.fileName || '')).filter(Boolean);
      const description = pin.description || '';
      const hasAudio = linkedAudioFiles.length > 0 || linkedAudios.length > 0;
      const hasVideo = linkedVideoFiles.length > 0 || linkedVideos.length > 0;
      const hasPhoto = linkedPhotoFiles.length > 0 || linkedPhotos.length > 0;
      const memoType = hasVideo ? 'video' : hasAudio ? 'audio' : hasPhoto ? 'photo' : description ? 'text' : 'none';
      const textFileName = description ? `text_memo_${String(index + 1).padStart(2, '0')}_${safeFileName(pin.nameKo || pin.nameEn || pin.id, 'pin')}.txt` : '';
      return {
        id: pin.id,
        order: index + 1,
        name: pin.name || pin.nameKo || pin.nameEn || `메모핀 ${index + 1}`,
        nameKo: pin.nameKo || pin.name || `메모핀 ${index + 1}`,
        nameEn: pin.nameEn || pin.name || `Memo Pin ${index + 1}`,
        nameJa: pin.nameJa || pin.name || `メモピン ${index + 1}`,
        lat: pin.lat,
        lng: pin.lng,
        color: pin.color || '#ff2e63',
        createdAt: pin.createdAt || null,
        description,
        memoType,
        type: memoType === 'none' ? 'memo' : memoType,
        textFileName,
        linkedAudios,
        linkedVideos,
        linkedPhotos,
        linkedAudioTitles,
        linkedVideoTitles,
        linkedPhotoTitles,
        memoTitle: linkedVideoTitles[0] || linkedAudioTitles[0] || linkedPhotoTitles[0] || '',
        linkedAudioFiles,
        linkedVideoFiles,
        linkedPhotoFiles
      };
    });

    const pinByIndex = new Map(pins.map((pin, index) => [index, pin]));

    const audioFiles = recordedAudios.map((audio, index) => {
      const pin = pinByIndex.get(Number(audio.stopIndex));
      const blob = requireRealMediaBlob(audio, 'audio', `${Number(audio.stopIndex || 0) + 1}번 핀 음성`);
      const extension = audio.name && audio.name.includes('.') ? audio.name.split('.').pop() : getBlobExtension(blob, 'webm');
      const fileName = audio.name || `audio_memo_${String(index + 1).padStart(2, '0')}_${tourSlug}.${extension}`;
      return {
        fileName,
        title: getMediaDisplayTitle(audio, fileName),
        displayTitle: getMediaDisplayTitle(audio, fileName),
        memoTitle: getMediaDisplayTitle(audio, fileName),
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
      const blob = requireRealMediaBlob(video, 'video', `${Number(video.stopIndex || 0) + 1}번 핀 영상`);
      const extension = video.name && video.name.includes('.') ? video.name.split('.').pop() : getBlobExtension(blob, 'webm');
      const fileName = video.name || `video_memo_${String(index + 1).padStart(2, '0')}_${tourSlug}.${extension}`;
      return {
        fileName,
        title: getMediaDisplayTitle(video, fileName),
        displayTitle: getMediaDisplayTitle(video, fileName),
        memoTitle: getMediaDisplayTitle(video, fileName),
        blob,
        stopIndex: Number(video.stopIndex || 0),
        pinId: pin?.id || '',
        memoText: pin?.description || '',
        lat: pin?.lat || '',
        lng: pin?.lng || ''
      };
    });

    const photoFiles = recordedPhotos.map((photo, index) => {
      const pin = pinByIndex.get(Number(photo.stopIndex));
      const blob = requireRealMediaBlob(photo, 'photo', `${Number(photo.stopIndex || 0) + 1}번 핀 사진`);
      const extension = photo.name && photo.name.includes('.') ? photo.name.split('.').pop() : getBlobExtension(blob, 'png');
      const fileName = photo.name || `photo_memo_${String(index + 1).padStart(2, '0')}_${tourSlug}.${extension}`;
      return {
        fileName,
        title: getMediaDisplayTitle(photo, fileName),
        displayTitle: getMediaDisplayTitle(photo, fileName),
        memoTitle: getMediaDisplayTitle(photo, fileName),
        blob,
        dataUrl: photo.dataUrl || '',
        objectUrl: photo.objectUrl || '',
        mimeType: photo.mimeType || blob.type || 'image/png',
        stopIndex: Number(photo.stopIndex || 0),
        pinId: pin?.id || '',
        memoText: photo.memoText || pin?.description || '',
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
      monetization: { ...monetization },
      isPaid: monetization.isPaid,
      coinPrice: monetization.coinPrice,
      priceLabel: monetization.label,
      eventCoupons,
      pins,
      audioFiles,
      videoFiles,
      photoFiles,
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
      folders: { audio: 'Audio', video: 'Video', photo: 'Photo', text: 'Text' },
      representativeImage,
      guideIntroText,
      guideIntroAudio: guideIntroAudioInfo ? { ...guideIntroAudioInfo } : null,
      guideIntroVideo: guideIntroVideoInfo ? { ...guideIntroVideoInfo } : null,
      monetization: { ...monetization },
      isPaid: monetization.isPaid,
      coinPrice: monetization.coinPrice,
      priceLabel: monetization.label,
      eventCoupons,
      pins: pins.map(pin => ({ ...pin })),
      audioFiles: audioFiles.map(file => ({ ...file, blob: undefined })),
      videoFiles: videoFiles.map(file => ({ ...file, blob: undefined })),
      photoFiles: photoFiles.map(file => ({ ...file, blob: undefined })),
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
      badge: monetization.isPaid ? `${monetization.coinPrice.toLocaleString()} COIN` : '무료',
      isPaid: monetization.isPaid,
      coinPrice: monetization.coinPrice,
      priceLabel: monetization.label,
      monetization: { ...monetization },
      isPurchased: false,
      isWidget: true,
      isPublishedGuide: true,
      createdAt,
      pinCount: pins.length,
      memoCount: audioFiles.length + videoFiles.length + photoFiles.length + textFiles.length,
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
        type: pin.type || pin.memoType,
        linkedAudios: [...(pin.linkedAudios || [])],
        linkedVideos: [...(pin.linkedVideos || [])],
        linkedPhotos: [...(pin.linkedPhotos || [])],
        linkedAudioFiles: (pin.linkedAudioFiles || []).map(file => ({ ...file })),
        linkedVideoFiles: (pin.linkedVideoFiles || []).map(file => ({ ...file })),
        linkedPhotoFiles: (pin.linkedPhotoFiles || []).map(file => ({ ...file }))
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
      dataFolderName: 'travelog_data',
      mode: 'browser'
    };
  }


  let publishProgressStartedAt = 0;
  let publishProgressValue = 0;
  let publishProgressTimer = null;
  let publishProgressLastState = null;

  function formatPublishEta(seconds) {
    const safeSeconds = Math.max(1, Math.round(Number(seconds) || 0));
    if (safeSeconds < 60) return t(`약 ${safeSeconds}초 남음`, `About ${safeSeconds}s left`, `約${safeSeconds}秒`);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return t(`약 ${minutes}분 ${rest}초 남음`, `About ${minutes}m ${rest}s left`, `約${minutes}分${rest}秒`);
  }

  function updatePublishProgress(progress = {}) {
    const container = document.getElementById('publish-loading-spinner');
    const fill = document.getElementById('publish-progress-fill');
    const percentEl = document.getElementById('publish-progress-percent');
    const labelEl = document.getElementById('publish-progress-label');
    const detailEl = document.getElementById('publish-progress-detail');
    const etaEl = document.getElementById('publish-progress-eta');
    if (!container) return;

    const nextPercent = Math.max(publishProgressValue, Math.min(100, Math.round(Number(progress.percent) || 0)));
    publishProgressValue = nextPercent;
    publishProgressLastState = { ...progress, percent: nextPercent };
    container.style.display = 'block';
    container.setAttribute('aria-valuenow', String(nextPercent));
    if (fill) fill.style.width = `${nextPercent}%`;
    if (percentEl) percentEl.textContent = `${nextPercent}%`;
    if (labelEl && progress.label) labelEl.textContent = progress.label;
    if (detailEl && progress.detail) detailEl.textContent = progress.detail;

    if (etaEl) {
      const elapsedSeconds = publishProgressStartedAt ? (Date.now() - publishProgressStartedAt) / 1000 : 0;
      if (nextPercent >= 100) {
        etaEl.textContent = t('완료', 'Complete', '完了');
      } else if (nextPercent >= 8 && elapsedSeconds >= 1.5) {
        etaEl.textContent = formatPublishEta(elapsedSeconds * (100 - nextPercent) / nextPercent);
      } else {
        etaEl.textContent = t('예상 시간 계산 중...', 'Estimating time...', '残り時間を計算中...');
      }
    }
  }

  function resetPublishProgress() {
    if (publishProgressTimer) clearInterval(publishProgressTimer);
    publishProgressStartedAt = Date.now();
    publishProgressValue = 0;
    const fill = document.getElementById('publish-progress-fill');
    if (fill) fill.style.width = '0%';
    updatePublishProgress({
      percent: 2,
      label: t('출간 준비 중', 'Preparing', '公開準備中'),
      detail: t('업로드할 데이터를 확인하고 있습니다.', 'Checking files to upload.', 'アップロードデータを確認しています。')
    });
    publishProgressTimer = setInterval(() => {
      if (!publishProgressLastState || publishProgressValue >= 100) return;
      updatePublishProgress(publishProgressLastState);
    }, 1000);
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
    resetPublishProgress();
  }

  function showPublishReadyModal(packageData, localSaveInfo) {
    const loadingModal = document.getElementById('publish-loading-modal');
    const statusTitle = document.getElementById('publish-status-title');
    const statusDesc = document.getElementById('publish-status-desc');
    const spinner = document.getElementById('publish-loading-spinner');
    const successIcon = document.getElementById('publish-success-icon');
    const summary = document.getElementById('publish-local-summary');
    const actions = document.getElementById('publish-ready-actions');
    const uploadButton = document.getElementById('publish-drive-upload-btn');
    const closeButton = document.getElementById('publish-ready-close-btn');

    if (!loadingModal) return;
    updatePublishProgress({
      percent: 100,
      label: t('저장 완료', 'Saved', '保存完了'),
      detail: t('기기 저장이 완료되었습니다.', 'Device save complete.', '端末保存が完了しました。')
    });
    if (statusTitle) statusTitle.textContent = t('저장이 완료되었습니다.', 'Saved successfully.', '保存が完了しました。');
    if (statusDesc) statusDesc.textContent = t('이제 출간 준비가 완료 되었어요.', 'Your guide is now ready to publish.', '公開準備が完了しました。');
    if (spinner) spinner.style.display = 'none';
    if (successIcon) successIcon.style.display = 'block';
    if (summary) {
      summary.innerHTML = `
        <strong>${escapeHtml(localSaveInfo.selectedFolderName)} / ${escapeHtml(localSaveInfo.dataFolderName)}</strong><br>
        Audio: ${packageData.audioFiles.length}개 저장<br>
        Video: ${packageData.videoFiles.length}개 저장<br>
        Photo: ${(packageData.photoFiles || []).length}개 저장<br>
        Text: ${packageData.textFiles.length}개 저장<br>
        User Studio Data.csv 저장 완료
      `;
      summary.style.display = 'block';
    }
    if (uploadButton) uploadButton.style.display = 'none';
    if (closeButton) closeButton.style.flex = '1';
    if (actions) actions.style.display = 'flex';
    loadingModal.classList.add('active');
    loadingModal.setAttribute('aria-hidden', 'false');
  }

  function closePublishModal() {
    const loadingModal = document.getElementById('publish-loading-modal');
    if (!loadingModal) return;
    loadingModal.classList.remove('active');
    loadingModal.setAttribute('aria-hidden', 'true');
    if (publishProgressTimer) clearInterval(publishProgressTimer);
    publishProgressTimer = null;
  }

  function completeLocalGuideSave(packageData, localSaveInfo) {
    pendingPublishPackage = packageData;
    lastSavedPublishSignature = getPublishContentSignature();
    storeSavedGuideRecord(packageData, localSaveInfo, 'unpublished');
    showPublishReadyModal(packageData, localSaveInfo);
    updateFinalPublishButtonState();
    window.TravelogApp.showToast(t('디바이스 저장이 완료되었습니다. 나의 가이드에 등록되었고 이제 최종 출간하기를 누를 수 있습니다.', 'Saved to device and added to My Guides. You can now publish.', '端末保存が完了し、マイガイドに登録されました。公開できます。'));
  }

  function ensureDeviceStorageRetryModal() {
    let modal = document.getElementById('device-storage-retry-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'device-storage-retry-modal';
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 460px; text-align: left;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px;">
          <div>
            <h3 style="margin:0 0 6px 0; color: var(--text-primary);">저장 위치 설정이 필요합니다</h3>
            <p style="margin:0; color: var(--text-secondary); font-size:13px; line-height:1.5;">
              저장 권한이 끊겼거나 기기 저장소가 준비되지 않았습니다. 확인을 누르면 저장 위치를 다시 지정한 뒤 현재 가이드를 바로 저장합니다.
            </p>
          </div>
          <button id="device-storage-retry-close-btn" type="button" aria-label="저장 위치 안내 닫기" style="border:0; background:transparent; width:32px; height:32px; padding:7px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><img class="popup-close-icon" src="assets/icons/ui/closed.svg" alt="" aria-hidden="true"></button>
        </div>
        <div id="device-storage-retry-feedback" style="display:none; margin:10px 0; padding:10px 12px; border-radius:12px; background:rgba(35,143,107,0.08); color:var(--text-secondary); font-size:12px; line-height:1.45;"></div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
          <button class="btn-rect secondary" id="device-storage-retry-internal-btn" type="button">내부 저장소로 저장</button>
          <button class="btn-rect" id="device-storage-retry-confirm-btn" type="button">확인</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function hideDeviceStorageRetryModal() {
    const modal = document.getElementById('device-storage-retry-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function retrySavePackageWithStorageRepair(packageData, useInternalOnly = false) {
    const feedback = document.getElementById('device-storage-retry-feedback');
    const confirmBtn = document.getElementById('device-storage-retry-confirm-btn');
    const internalBtn = document.getElementById('device-storage-retry-internal-btn');
    const setBusy = (busy) => {
      if (confirmBtn) confirmBtn.disabled = busy;
      if (internalBtn) internalBtn.disabled = busy;
    };

    try {
      setBusy(true);
      if (feedback) {
        feedback.style.display = 'block';
        feedback.textContent = useInternalOnly
          ? t('브라우저 내부 저장소를 준비하는 중입니다...', 'Preparing browser internal storage...', 'ブラウザ内部保存先を準備中です...')
          : t('저장 위치 설정창을 여는 중입니다...', 'Opening storage location setup...', '保存先設定を開いています...');
      }

      if (window.TravelogDeviceStorage) {
        if (useInternalOnly && typeof window.TravelogDeviceStorage.useInternalStorage === 'function') {
          await window.TravelogDeviceStorage.useInternalStorage('USER_SELECTED_INTERNAL_AFTER_SAVE_ERROR');
        } else if (typeof window.TravelogDeviceStorage.configureFromUserGesture === 'function') {
          await window.TravelogDeviceStorage.configureFromUserGesture();
        }
      }

      showPublishModalLoading(
        t('디바이스에 다시 저장 중입니다...', 'Saving to this device again...', '端末に再保存しています...'),
        t('새로 설정한 저장 위치에 Audio / Video / Text와 User Studio Data를 저장합니다.', 'Saving Audio / Video / Text and User Studio Data to the newly selected storage.', '新しく設定した保存先へAudio / Video / TextとUser Studio Dataを保存します。')
      );
      const localSaveInfo = await savePackageToLocalDevice(packageData);
      hideDeviceStorageRetryModal();
      completeLocalGuideSave(packageData, localSaveInfo);
    } catch (error) {
      console.error('[Travelog Publish] Storage repair retry failed:', error);
      if (!useInternalOnly && window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.useInternalStorage === 'function') {
        try {
          if (feedback) feedback.textContent = t('저장 위치 지정이 취소되었거나 실패했습니다. 브라우저 내부 저장소로 다시 저장합니다...', 'Folder setup failed or was canceled. Saving to browser internal storage...', '保存先設定が失敗またはキャンセルされました。ブラウザ内部保存先へ保存します...');
          await window.TravelogDeviceStorage.useInternalStorage('DIRECTORY_RETRY_FAILED_USE_INTERNAL');
          const localSaveInfo = await savePackageToLocalDevice(packageData);
          hideDeviceStorageRetryModal();
          completeLocalGuideSave(packageData, localSaveInfo);
          return;
        } catch (fallbackError) {
          console.error('[Travelog Publish] Internal storage retry failed:', fallbackError);
        }
      }
      closePublishModal();
      pendingPublishPackage = null;
      lastSavedPublishSignature = '';
      updateFinalPublishButtonState();
      if (feedback) {
        feedback.style.display = 'block';
        feedback.textContent = t('저장에 실패했습니다. 브라우저 저장 공간이 부족한지 확인한 뒤 다시 시도해 주세요.', 'Save failed. Check browser storage space and try again.', '保存に失敗しました。ブラウザ保存容量を確認して再試行してください。');
      } else {
        alert(t('저장에 실패했습니다. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.', 'Save failed. Check browser storage space and try again.', '保存に失敗しました。'));
      }
    } finally {
      setBusy(false);
    }
  }

  function showDeviceStorageRepairDialog(packageData) {
    const modal = ensureDeviceStorageRetryModal();
    const confirmBtn = document.getElementById('device-storage-retry-confirm-btn');
    const internalBtn = document.getElementById('device-storage-retry-internal-btn');
    const closeBtn = document.getElementById('device-storage-retry-close-btn');
    const feedback = document.getElementById('device-storage-retry-feedback');

    if (feedback) {
      feedback.style.display = 'none';
      feedback.textContent = '';
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.onclick = () => retrySavePackageWithStorageRepair(packageData, false);
    }
    if (internalBtn) {
      internalBtn.disabled = false;
      internalBtn.onclick = () => retrySavePackageWithStorageRepair(packageData, true);
    }
    if (closeBtn) closeBtn.onclick = hideDeviceStorageRetryModal;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }

  async function saveTour() {
    const customPins = getOrderedCustomPins();

    if (customPins.length === 0) {
      window.TravelogApp.showToast(t('지도 탭에서 핀을 1개 이상 등록해 주세요!', 'Please place at least one pin on the Map tab first!', 'まず地図タブでピンを1つ以上登録してください！'));
      updateFinalPublishButtonState();
      return;
    }

    let packageData = null;

    try {
      showPublishModalLoading(
        t('디바이스에 저장 중입니다...', 'Saving to this device...', '端末に保存しています...'),
        t('Audio / Video / Text와 User Studio Data를 지정된 기기 저장소에 먼저 저장합니다.', 'Saving Audio / Video / Text and User Studio Data to the selected device storage first.', 'Audio / Video / TextとUser Studio Dataを先に端末へ保存します。')
      );

      packageData = await buildGuidePublishPackage();
      const localSaveInfo = await savePackageToLocalDevice(packageData);
      completeLocalGuideSave(packageData, localSaveInfo);
    } catch (error) {
      console.error('[Travelog Publish] Device save failed:', error);
      closePublishModal();
      pendingPublishPackage = null;
      lastSavedPublishSignature = '';
      updateFinalPublishButtonState();
      if (isMediaSourceError(error)) {
        alert(error.detail || t('실제 미디어 원본이 없어 저장을 중단했습니다. 파일을 다시 등록해 주세요.', 'Saving stopped because the original media is missing. Add the file again.', '元メディアがないため保存を中止しました。ファイルを再登録してください。'));
        return;
      }
      try {
        showDeviceStorageRepairDialog(packageData || await buildGuidePublishPackage());
      } catch (_) {
        if (packageData) showDeviceStorageRepairDialog(packageData);
      }
    }
  }

  async function completeStudioGuideEdit() {
    const readiness = getPublishReadiness();
    updateFinalPublishButtonState();

    if (!readiness.ready) {
      window.TravelogApp.showToast(readiness.reason);
      return;
    }

    const editGuideId = activeStudioEditGuideId;
    const shouldRepublishOnline = isActiveEditPublished();
    let packageData = null;

    try {
      showPublishModalLoading(
        shouldRepublishOnline ? t('출간 가이드 수정 반영 중입니다...', 'Updating published guide...', '公開ガイドを更新しています...') : t('저장 가이드 수정 반영 중입니다...', 'Updating saved guide...', '保存ガイドを更新しています...'),
        shouldRepublishOnline ? t('기존 Supabase 가이드 데이터와 디바이스 저장 데이터를 덮어씁니다.', 'Overwriting the existing Supabase guide and device save.', '既存Supabaseガイドと端末保存データを上書きします。') : t('기존 저장 데이터를 같은 가이드 ID로 덮어씁니다.', 'Overwriting the saved guide with the same guide ID.', '同じガイドIDで保存データを上書きします。')
      );

      packageData = await buildGuidePublishPackage();
      const localSaveInfo = await savePackageToLocalDevice(packageData);
      pendingPublishPackage = packageData;
      lastSavedPublishSignature = getPublishContentSignature();
      storeSavedGuideRecord(packageData, localSaveInfo, shouldRepublishOnline ? 'published' : 'unpublished');

      if (shouldRepublishOnline && window.TravelogSupabase && typeof window.TravelogSupabase.publishGuidePackage === 'function') {
        const publishResult = await window.TravelogSupabase.publishGuidePackage(packageData, { onProgress: updatePublishProgress });
        packageData = {
          ...packageData,
          guideId: publishResult.guideId || packageData.guideId,
          supabaseGuideId: publishResult.guideId || packageData.guideId,
          publishedAt: new Date().toISOString(),
          guideCard: {
            ...(publishResult.guideCard || packageData.guideCard || {}),
            isSupabaseGuide: true,
            supabaseGuideId: publishResult.guideId || packageData.guideId,
            offlineReady: true,
            offlineStatus: 'creator-local'
          }
        };
        storePublishedGuideRecord(packageData);
        markSavedGuideAsPublished(packageData);
        registerGuideOnHome(packageData);
      }

      const statusTitle = document.getElementById('publish-status-title');
      const statusDesc = document.getElementById('publish-status-desc');
      const spinner = document.getElementById('publish-loading-spinner');
      const successIcon = document.getElementById('publish-success-icon');
      const summary = document.getElementById('publish-local-summary');
      const actions = document.getElementById('publish-ready-actions');

      if (statusTitle) statusTitle.textContent = t('수정 완료', 'Edit complete', '修正完了');
      if (statusDesc) statusDesc.textContent = shouldRepublishOnline
        ? t('출간된 가이드와 저장된 제작 데이터가 덮어쓰기 완료되었습니다.', 'The published guide and saved working data were overwritten.', '公開ガイドと保存制作データを上書きしました。')
        : t('저장된 제작 가이드가 덮어쓰기 완료되었습니다.', 'The saved guide was overwritten.', '保存済み制作ガイドを上書きしました。');
      if (spinner) spinner.style.display = 'none';
      if (successIcon) successIcon.style.display = 'block';
      if (summary) {
        summary.innerHTML = `
          Guide ID: ${escapeHtml(editGuideId || packageData.guideId)}<br>
          저장 위치: ${escapeHtml(localSaveInfo.selectedFolderName || '')} / ${escapeHtml(localSaveInfo.dataFolderName || 'travelog_data')}<br>
          ${shouldRepublishOnline ? 'Supabase 덮어쓰기 완료' : '디바이스 저장 데이터 덮어쓰기 완료'}
        `;
        summary.style.display = 'block';
      }
      if (actions) actions.style.display = 'none';
      updatePublishProgress({
        percent: 100,
        label: t('수정 완료', 'Edit complete', '修正完了'),
        detail: t('가이드 수정사항이 모두 반영되었습니다.', 'All guide changes have been applied.', 'ガイドの修正内容が反映されました。')
      });

      window.TravelogApp.showToast(shouldRepublishOnline
        ? t('출간된 가이드 수정이 완료되었습니다. 새 가이드 제작 화면으로 초기화합니다.', 'Published guide edit complete. Studio reset for a new guide.', '公開ガイドの修正が完了しました。新規制作画面に初期化します。')
        : t('저장된 가이드 수정이 완료되었습니다. 새 가이드 제작 화면으로 초기화합니다.', 'Saved guide edit complete. Studio reset for a new guide.', '保存ガイドの修正が完了しました。新規制作画面に初期化します。')
      );

      resetCreatorStudioForNewGuide();
      setTimeout(() => {
        closePublishModal();
      }, 1200);
    } catch (error) {
      console.error('[Travelog Creator] Edit completion failed:', error);
      closePublishModal();
      const detailMessage = error?.detail || error?.message || '';
      alert(`${t('가이드 수정 완료 중 오류가 발생했습니다.', 'Completing the guide edit failed.', 'ガイド修正完了中にエラーが発生しました。')}${detailMessage ? `\n\n상세 오류: ${detailMessage}` : ''}`);
    }
  }

  function handleFinalPublishClick() {
    const readiness = getPublishReadiness();
    updateFinalPublishButtonState();

    if (!readiness.ready) {
      window.TravelogApp.showToast(readiness.reason);
      return;
    }

    if (isStudioEditMode()) {
      completeStudioGuideEdit();
      return;
    }

    publishPreparedGuideOnline();
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

    if (type === 'audio' || type === 'video' || type === 'photo') {
      memo.base64 = await blobToDataUrl(blob);
      memo.dataUrl = memo.base64;
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

    for (const file of packageData.photoFiles || []) {
      memos.push(await convertFileEntryToMemo(file, 'photo', file.memoText || 'Travelog photo memo'));
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
        photoCount: (packageData.photoFiles || []).length,
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


  function stripLargeMediaForLocalRecord(value) {
    if (Array.isArray(value)) return value.map(stripLargeMediaForLocalRecord);
    if (!value || typeof value !== 'object') return value;

    const next = {};
    Object.keys(value).forEach(key => {
      if (key === 'blob' || key === 'objectUrl') return;
      // Keep playable data in memory, but avoid localStorage quota failure.
      // The actual media file is already written by deviceStorage; this list only needs stable metadata.
      if (key === 'dataUrl' || key === 'mediaUrl' || key === 'rawUrl' || key.endsWith('DataUrl') || key.endsWith('ObjectUrl')) {
        if (String(value[key] || '').length > 2048) return;
      }
      next[key] = stripLargeMediaForLocalRecord(value[key]);
    });
    return next;
  }

  function getSavedGuideRecords() {
    if (Array.isArray(savedGuideRecordsRuntime)) return savedGuideRecordsRuntime;
    const records = safeParseArray(localStorage.getItem(CREATOR_SAVED_GUIDES_KEY), []);
    savedGuideRecordsRuntime = records;
    return records;
  }

  function saveSavedGuideRecords(records) {
    savedGuideRecordsRuntime = Array.isArray(records) ? records : [];
    try {
      const lightweightRecords = stripLargeMediaForLocalRecord(savedGuideRecordsRuntime);
      localStorage.setItem(CREATOR_SAVED_GUIDES_KEY, JSON.stringify(lightweightRecords));
    } catch (error) {
      console.warn('[Travelog Creator] Saved guide records could not be saved:', error);
      try {
        const listOnly = savedGuideRecordsRuntime.map(record => ({
          id: record.id,
          tourName: record.tourName,
          creator: record.creator,
          createdAt: record.createdAt,
          savedAt: record.savedAt,
          status: record.status,
          publishedAt: record.publishedAt,
          representativeImage: String(record.representativeImage || '').length > 2048 ? '' : record.representativeImage || '',
          pinCount: record.pinCount || 0,
          memoCount: record.memoCount || 0,
          couponCount: record.couponCount || 0,
          isPaid: record.isPaid === true,
          coinPrice: Number(record.coinPrice || 0) || 0,
          priceLabel: record.priceLabel || '',
          localSaveInfo: record.localSaveInfo || null,
          pins: (record.pins || []).map(pin => ({
            id: pin.id, name: pin.name, nameKo: pin.nameKo, order: pin.order, lat: pin.lat, lng: pin.lng, color: pin.color, createdAt: pin.createdAt, description: pin.description, memoType: pin.memoType, type: pin.type
          })),
          eventCoupons: record.eventCoupons || []
        }));
        localStorage.setItem(CREATOR_SAVED_GUIDES_KEY, JSON.stringify(listOnly));
      } catch (fallbackError) {
        console.warn('[Travelog Creator] Saved guide fallback record could not be saved:', fallbackError);
      }
    }
  }

  function getSavedGuideById(id) {
    return getSavedGuideRecords().find(record => String(record.id) === String(id));
  }

  function buildGuideRecordSnapshot(packageData, localSaveInfo = null, status = 'unpublished') {
    const pinCount = (packageData.pins || []).length;
    const memoCount = (packageData.audioFiles || []).length + (packageData.videoFiles || []).length + (packageData.photoFiles || []).length + (packageData.textFiles || []).length;
    const couponCount = (packageData.eventCoupons || []).length;
    const priceLabel = packageData.priceLabel || (packageData.isPaid ? `${Number(packageData.coinPrice || 0).toLocaleString()} COIN` : '무료');
    const savedAt = new Date().toISOString();

    return {
      id: packageData.guideId,
      tourName: packageData.tourName,
      creator: packageData.creator,
      createdAt: packageData.createdAt,
      savedAt,
      status: status === 'published' ? 'published' : 'unpublished',
      publishedAt: status === 'published' ? savedAt : packageData.publishedAt || '',
      representativeImage: packageData.representativeImage || '',
      guideIntroText: packageData.guideIntroText || '',
      guideIntroAudio: packageData.guideIntroAudio ? { ...packageData.guideIntroAudio } : null,
      guideIntroVideo: packageData.guideIntroVideo ? { ...packageData.guideIntroVideo } : null,
      pinCount,
      memoCount,
      couponCount,
      isPaid: packageData.isPaid === true,
      coinPrice: Number(packageData.coinPrice || 0) || 0,
      priceLabel,
      monetization: packageData.monetization || { isPaid: packageData.isPaid === true, coinPrice: Number(packageData.coinPrice || 0) || 0, label: priceLabel },
      pins: (packageData.pins || []).map(pin => ({ ...pin })),
      eventCoupons: (packageData.eventCoupons || []).map(coupon => ({ ...coupon })),
      guideCard: packageData.guideCard ? { ...packageData.guideCard } : null,
      localSaveInfo: localSaveInfo ? {
        selectedFolderName: localSaveInfo.selectedFolderName || '',
        dataFolderName: localSaveInfo.dataFolderName || '',
        mode: localSaveInfo.mode || ''
      } : null
    };
  }

  function storeSavedGuideRecord(packageData, localSaveInfo = null, status = 'unpublished') {
    const publishedRecord = getPublishedGuideRecords().find(item => String(item.id) === String(packageData.guideId));
    const finalStatus = publishedRecord ? 'published' : status;
    const record = buildGuideRecordSnapshot(packageData, localSaveInfo, finalStatus);
    const records = getSavedGuideRecords();
    const nextRecords = [record, ...records.filter(item => String(item.id) !== String(record.id))].slice(0, 80);
    saveSavedGuideRecords(nextRecords);
    renderSavedGuidesList();
    return record;
  }

  function markSavedGuideAsPublished(packageData) {
    const records = getSavedGuideRecords();
    const now = new Date().toISOString();
    const existing = records.find(item => String(item.id) === String(packageData.guideId));

    if (existing) {
      existing.status = 'published';
      existing.publishedAt = now;
      existing.tourName = packageData.tourName || existing.tourName;
      existing.representativeImage = packageData.representativeImage || existing.representativeImage || '';
      existing.guideCard = packageData.guideCard ? { ...packageData.guideCard } : existing.guideCard;
      saveSavedGuideRecords(records);
      renderSavedGuidesList();
      return existing;
    }

    return storeSavedGuideRecord({ ...packageData, publishedAt: now }, null, 'published');
  }

  function renderSavedGuidesList() {
    const container = document.getElementById('saved-guide-list');
    if (!container) return;
    const records = getSavedGuideRecords();

    if (records.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 18px 0; font-size: 12px;">아직 등록된 가이드가 없습니다.</div>';
      return;
    }

    container.innerHTML = records.map(record => {
      const date = record.savedAt || record.createdAt ? new Date(record.savedAt || record.createdAt) : null;
      const dateText = date && !Number.isNaN(date.getTime())
        ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        : '-';
      const imageStyle = record.representativeImage ? `background-image:url('${record.representativeImage}')` : '';
      const statusKo = record.status === 'published' ? '출간' : '미출간';
      const statusColor = record.status === 'published' ? 'var(--accent-green)' : 'var(--accent-orange)';
      const priceText = record.isPaid ? `${Number(record.coinPrice || 0).toLocaleString()} COIN` : '무료';
      const storageText = record.localSaveInfo?.mode === 'internal'
        ? '내부 저장소'
        : (record.localSaveInfo?.selectedFolderName || '디바이스 저장');
      const shareButton = record.status === 'published'
        ? `<button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.openPublishedGuideShare('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px; color: var(--color-ocean);"><i class="fa-solid fa-share-nodes"></i> 공유</button>`
        : '';
      return `
        <div class="saved-guide-row" style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.58); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 10px;">
          <div style="width: 54px; height: 42px; flex-shrink: 0; border-radius: 10px; background: linear-gradient(135deg, rgba(112,162,183,0.22), rgba(175,212,153,0.22)); background-size: cover; background-position: center; ${imageStyle}"></div>
          <div style="flex: 1; min-width: 0;">
            <div style="display:flex; align-items:center; gap:6px; min-width:0;">
              <span style="font-size: 13px; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(record.tourName || '나의 가이드')}</span>
              <span style="flex-shrink:0; font-size:10px; font-weight:800; color:#fff; background:${statusColor}; border-radius:999px; padding:2px 7px;">${statusKo}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary);">핀 ${record.pinCount || 0} · 메모 ${record.memoCount || 0} · 쿠폰 ${record.couponCount || 0} · ${priceText}</div>
            <div style="font-size: 10px; color: var(--text-muted);">${dateText} · ${escapeHtml(storageText)}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.openSavedGuideEditor('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px;">수정</button>
            ${shareButton}
            <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.deleteSavedGuide('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px; color: var(--accent-pink);">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function restoreMediaEntriesFromSavedPins(record, mediaType) {
    const pins = Array.isArray(record.pins) ? record.pins : [];
    const key = mediaType === 'video' ? 'linkedVideoFiles' : mediaType === 'photo' ? 'linkedPhotoFiles' : 'linkedAudioFiles';
    const fallbackKey = mediaType === 'video' ? 'linkedVideos' : mediaType === 'photo' ? 'linkedPhotos' : 'linkedAudios';
    const fallbackMime = mediaType === 'video' ? 'video/webm' : mediaType === 'photo' ? 'image/png' : 'audio/webm';

    return pins.flatMap((pin, pinIndex) => {
      const richFiles = Array.isArray(pin[key]) ? pin[key] : [];
      const fileNames = Array.isArray(pin[fallbackKey]) ? pin[fallbackKey] : [];
      const files = richFiles.length ? richFiles : fileNames.map(fileName => ({ fileName }));
      return files.map((file, mediaIndex) => ({
        id: `${record.id}-${mediaType}-${pinIndex}-${mediaIndex}`,
        name: file.fileName || file.name || `${mediaType}_memo_${pinIndex + 1}_${mediaIndex + 1}.${mediaType === 'photo' ? 'png' : 'webm'}`,
        fileName: file.fileName || file.name || `${mediaType}_memo_${pinIndex + 1}_${mediaIndex + 1}.${mediaType === 'photo' ? 'png' : 'webm'}`,
        title: file.title || file.displayTitle || file.memoTitle || '',
        displayTitle: file.displayTitle || file.title || file.memoTitle || '',
        memoTitle: file.memoTitle || file.title || file.displayTitle || '',
        dataUrl: file.dataUrl || file.url || file.mediaUrl || '',
        objectUrl: file.objectUrl || '',
        mimeType: file.mimeType || fallbackMime,
        deviceStorageRef: file.deviceStorageRef || null,
        stopIndex: pinIndex,
        pinId: pin.id || ''
      }));
    });
  }

  async function restoreMediaItemFromDeviceStorage(item, kind) {
    if (!item) return false;
    let blob = getRealMediaBlob(item);
    if (!blob && window.TravelogDeviceStorage?.loadGeneratedFile) {
      const fallbackKind = kind === 'photo' ? 'Photo' : kind === 'video' ? 'Video' : 'Audio';
      blob = await window.TravelogDeviceStorage.loadGeneratedFile(item.deviceStorageRef || {
        fileName: item.fileName || item.name,
        folder: fallbackKind,
        kind: fallbackKind
      });
    }
    if (!(blob instanceof Blob) || blob.size <= 0) return false;
    const expectedPrefix = kind === 'photo' ? 'image/' : `${kind}/`;
    if (!String(blob.type || '').startsWith(expectedPrefix)) return false;
    item.blob = blob;
    item.size = blob.size;
    item.mimeType = blob.type;
    if (!item.dataUrl) item.dataUrl = await blobToDataUrl(blob);
    if (!item.objectUrl) item.objectUrl = URL.createObjectURL(blob);
    return true;
  }

  async function openSavedGuideEditor(id) {
    const record = getSavedGuideById(id);
    if (!record) return;
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : null;

    const tourNameInput = document.getElementById('new-tour-name');
    if (tourNameInput) tourNameInput.value = record.tourName || t('저장된 여행 가이드', 'Saved Travel Guide', '保存済み旅行ガイド');

    guideCoverDataUrl = record.representativeImage || '';
    setGuideCoverPreview(guideCoverDataUrl);
    try {
      if (guideCoverDataUrl) localStorage.setItem(GUIDE_COVER_STORAGE_KEY, guideCoverDataUrl);
      else localStorage.removeItem(GUIDE_COVER_STORAGE_KEY);
    } catch (_) {}

    const guideIntroTextInput = document.getElementById('guide-intro-text');
    if (guideIntroTextInput) guideIntroTextInput.value = record.guideIntroText || '';
    try { localStorage.setItem(GUIDE_INTRO_TEXT_STORAGE_KEY, record.guideIntroText || ''); } catch (_) {}

    guideIntroAudio = record.guideIntroAudio ? { ...record.guideIntroAudio } : null;
    guideIntroVideo = record.guideIntroVideo ? { ...record.guideIntroVideo } : null;
    setGuideIntroMediaStatus('audio', guideIntroAudio ? (guideIntroAudio.fileName || '소개 음성 등록됨') : '');
    setGuideIntroMediaStatus('video', guideIntroVideo ? (guideIntroVideo.fileName || '소개 영상 등록됨') : '');

    const freeRadio = document.getElementById('guide-price-free');
    const paidRadio = document.getElementById('guide-price-paid');
    const priceInput = document.getElementById('guide-price-coin-input');
    const isPaid = record.isPaid === true || Number(record.coinPrice || 0) > 0;
    if (freeRadio) freeRadio.checked = !isPaid;
    if (paidRadio) paidRadio.checked = isPaid;
    if (priceInput) {
      priceInput.value = String(Number(record.coinPrice || 0) || 100);
      priceInput.disabled = !isPaid;
    }

    registeredCoupons = Array.isArray(record.eventCoupons) ? record.eventCoupons.map(coupon => ({ ...coupon })) : [];
    saveRegisteredCoupons();

    const restoredPins = Array.isArray(record.pins) ? record.pins.map((pin, index) => ({
      id: pin.id || `saved-pin-${Date.now()}-${index}`,
      name: pin.name || pin.nameKo || pin.nameEn || `메모핀 ${index + 1}`,
      nameKo: pin.nameKo || pin.name || `메모핀 ${index + 1}`,
      nameEn: pin.nameEn || pin.name || `Memo Pin ${index + 1}`,
      nameJa: pin.nameJa || pin.name || `メモピン ${index + 1}`,
      lat: Number(pin.lat || 0),
      lng: Number(pin.lng || 0),
      color: pin.color || '#ff2e63',
      createdAt: pin.createdAt || record.createdAt || new Date().toISOString(),
      timestamp: Date.now() + index,
      sortOrder: typeof pin.sortOrder === 'number' ? pin.sortOrder : index,
      description: pin.description || ''
    })) : [];

    if (state) state.customCreatedPins = restoredPins;
    recordedAudios = restoreMediaEntriesFromSavedPins(record, 'audio');
    recordedVideos = restoreMediaEntriesFromSavedPins(record, 'video');
    recordedPhotos = restoreMediaEntriesFromSavedPins(record, 'photo');

    const restoredResults = await Promise.all([
      ...recordedAudios.map(item => restoreMediaItemFromDeviceStorage(item, 'audio')),
      ...recordedVideos.map(item => restoreMediaItemFromDeviceStorage(item, 'video')),
      ...recordedPhotos.map(item => restoreMediaItemFromDeviceStorage(item, 'photo')),
      guideIntroAudio ? restoreMediaItemFromDeviceStorage(guideIntroAudio, 'audio') : Promise.resolve(true),
      guideIntroVideo ? restoreMediaItemFromDeviceStorage(guideIntroVideo, 'video') : Promise.resolve(true)
    ]);
    const missingMediaCount = restoredResults.filter(result => result === false).length;
    pendingPublishPackage = null;
    lastSavedPublishSignature = '';

    renderCoordinatesList();
    renderAudioList();
    renderVideoList();
    renderRegisteredCouponList();
    setStudioEditMode(record, record.status === 'published' ? 'published' : 'unpublished');
    updatePublishPanelCounts();
    updateFinalPublishButtonState();

    window.TravelogApp?.showToast?.(missingMediaCount > 0
      ? t(`가이드를 불러왔지만 원본 미디어 ${missingMediaCount}개를 찾지 못했습니다. 해당 파일을 다시 등록해야 저장·출간할 수 있습니다.`, `Guide loaded, but ${missingMediaCount} original media files are missing. Add them again before saving or publishing.`, `ガイドを読み込みましたが元メディア${missingMediaCount}件が見つかりません。再登録後に保存・公開してください。`)
      : t('저장된 가이드와 미디어 원본을 스튜디오로 불러왔습니다.', 'The saved guide and original media were loaded into Studio.', '保存済みガイドと元メディアをスタジオに読み込みました。'));
  }

  function deleteSavedGuide(id) {
    const targetRecord = getSavedGuideById(id);
    const records = getSavedGuideRecords().filter(record => String(record.id) !== String(id));
    saveSavedGuideRecords(records);

    if (targetRecord?.status === 'published') {
      const publishedRecords = getPublishedGuideRecords().filter(record => String(record.id) !== String(id));
      savePublishedGuideRecords(publishedRecords);
      if (window.TravelogApp && typeof window.TravelogApp.removePublishedGuide === 'function') {
        window.TravelogApp.removePublishedGuide(id);
      }
      renderPublishedGuidesList();
    }

    renderSavedGuidesList();
    window.TravelogApp?.showToast?.(targetRecord?.status === 'published'
      ? t('출간된 가이드를 나의 가이드에서 삭제했습니다.', 'Published guide deleted from My Guides.', '公開済みガイドをマイガイドから削除しました。')
      : t('나의 가이드를 삭제했습니다.', 'My guide deleted.', 'マイガイドを削除しました。'));
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
      memoCount: (packageData.audioFiles || []).length + (packageData.videoFiles || []).length + (packageData.photoFiles || []).length + (packageData.textFiles || []).length,
      couponCount: (packageData.eventCoupons || []).length,
      isPaid: packageData.isPaid === true,
      coinPrice: Number(packageData.coinPrice || 0) || 0,
      priceLabel: packageData.priceLabel || (packageData.isPaid ? `${Number(packageData.coinPrice || 0).toLocaleString()} COIN` : '무료'),
      monetization: packageData.monetization || { isPaid: packageData.isPaid === true, coinPrice: Number(packageData.coinPrice || 0) || 0 },
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
      const priceText = record.isPaid ? `${Number(record.coinPrice || 0).toLocaleString()} COIN` : '무료';
      return `
        <div class="published-guide-row" style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.58); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 10px;">
          <div style="width: 54px; height: 42px; flex-shrink: 0; border-radius: 10px; background: linear-gradient(135deg, rgba(112,162,183,0.22), rgba(175,212,153,0.22)); background-size: cover; background-position: center; ${imageStyle}"></div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(record.tourName)}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">핀 ${record.pinCount || 0} · 메모 ${record.memoCount || 0} · 쿠폰 ${record.couponCount || 0} · ${priceText}</div>
            <div style="font-size: 10px; color: var(--text-muted);">${dateText}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.openPublishedGuideEditor('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px;">수정</button>
            <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.openPublishedGuideShare('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px; color: var(--color-ocean);"><i class="fa-solid fa-share-nodes"></i> 공유</button>
            <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.deletePublishedGuide('${record.id}')" style="padding: 5px 10px; font-size: 11px; border-radius: 10px; color: var(--accent-pink);">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  let sharingPublishedGuideId = null;

  function getPublishedGuideById(id) {
    return getPublishedGuideRecords().find(record => String(record.id) === String(id));
  }

  function buildPublishedGuideShareUrl(record) {
    const baseUrl = `${window.location.origin || ''}${window.location.pathname || ''}`;
    const cleanBase = baseUrl && baseUrl !== 'null' ? baseUrl : 'travelog://guide';
    return `${cleanBase}#travelog-guide=${encodeURIComponent(record.id || '')}`;
  }

  function buildPublishedGuideShareText(record) {
    const pinCount = Number(record.pinCount || (record.pins || []).length || 0);
    const memoCount = Number(record.memoCount || 0);
    const couponCount = Number(record.couponCount || (record.eventCoupons || []).length || 0);
    const priceText = record.isPaid ? `${Number(record.coinPrice || 0).toLocaleString()} COIN` : '무료';
    return `${record.tourName || 'Travelog 가이드'}\n코스 ${pinCount}개 · 메모 ${memoCount}개 · 쿠폰 ${couponCount}개 · ${priceText}\nTravelog에서 함께 여행해요!`;
  }

  function ensurePublishedGuideShareModal() {
    let modal = document.getElementById('published-guide-share-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'published-guide-share-modal';
    modal.className = 'onboarding-backdrop';
    modal.setAttribute('aria-hidden', 'true');
    modal.style.cssText = 'display:none; z-index: 220000; padding: 18px;';
    modal.innerHTML = `
      <div class="glass-panel arch-card" style="width:min(94vw, 460px); max-height:86vh; overflow-y:auto; background:rgba(255,255,255,0.96); padding:22px; position:relative;">
        <button type="button" class="btn-circle" id="published-guide-share-close-btn" aria-label="가이드 공유 닫기" style="position:absolute; top:12px; right:12px; width:34px; height:34px; font-size:14px;"><img class="popup-close-icon" src="assets/icons/ui/closed.svg" alt="" aria-hidden="true"></button>
        <div style="display:flex; gap:12px; align-items:center; padding-right:36px; margin-bottom:14px;">
          <div id="published-guide-share-image" style="width:68px; height:54px; flex-shrink:0; border-radius:14px; background:linear-gradient(135deg, rgba(112,162,183,0.22), rgba(175,212,153,0.22)); background-size:cover; background-position:center;"></div>
          <div style="min-width:0;">
            <div style="font-size:11px; font-weight:900; color:var(--color-ocean); letter-spacing:.04em;">GUIDE SHARE</div>
            <h3 id="published-guide-share-title" style="font-size:18px; margin:2px 0 4px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">가이드 공유</h3>
            <p id="published-guide-share-summary" style="font-size:12px; color:var(--text-secondary); margin:0;"></p>
          </div>
        </div>

        <div style="background:rgba(112,162,183,0.08); border:1px solid var(--glass-border); border-radius:14px; padding:12px; margin-bottom:14px;">
          <div style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">플랫폼 친구목록으로 공유</div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
            <button type="button" class="btn-rect" id="share-kakao-btn" style="justify-content:center; padding:10px 8px; font-size:12px; background:#FEE500; color:#3C1E1E;"><i class="fa-solid fa-comment"></i> 카카오톡</button>
            <button type="button" class="btn-rect" id="share-facebook-btn" style="justify-content:center; padding:10px 8px; font-size:12px; background:#1877F2;"><i class="fa-brands fa-facebook-f"></i> 페이스북</button>
            <button type="button" class="btn-rect" id="share-instagram-btn" style="justify-content:center; padding:10px 8px; font-size:12px; background:linear-gradient(135deg,#833AB4,#FD1D1D,#FCAF45);"><i class="fa-brands fa-instagram"></i> 인스타</button>
          </div>
          <p style="font-size:10px; color:var(--text-muted); margin:8px 0 0 0; line-height:1.45;">모바일에서는 공유창에서 각 앱의 친구목록을 선택할 수 있습니다. 앱이 없거나 브라우저가 막으면 링크가 복사됩니다.</p>
        </div>

        <div style="background:rgba(255,255,255,0.72); border:1px solid var(--glass-border); border-radius:14px; padding:12px; margin-bottom:14px;">
          <label style="display:block; font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">공유 링크</label>
          <div style="display:flex; gap:8px;">
            <input id="published-guide-share-link" readonly style="flex:1; min-width:0; background:var(--bg-tertiary); border:1px solid var(--glass-border); color:#373737 !important; padding:9px 10px; border-radius:10px; font-size:12px;">
            <button type="button" class="btn-rect secondary" id="copy-published-guide-share-link-btn" style="padding:9px 12px; font-size:12px; border-radius:10px; white-space:nowrap;"><i class="fa-solid fa-copy"></i> 링크 복사</button>
          </div>
        </div>

        <div style="background:rgba(175,212,153,0.10); border:1px solid rgba(175,212,153,0.35); border-radius:14px; padding:12px;">
          <div style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">Travelog 친구에게 쪽지로 공유</div>
          <div id="published-guide-share-friend-list" style="display:flex; flex-direction:column; gap:8px; max-height:150px; overflow-y:auto;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#published-guide-share-close-btn')?.addEventListener('click', closePublishedGuideShare);
    modal.querySelector('#share-kakao-btn')?.addEventListener('click', () => sharePublishedGuideToPlatform('kakao'));
    modal.querySelector('#share-facebook-btn')?.addEventListener('click', () => sharePublishedGuideToPlatform('facebook'));
    modal.querySelector('#share-instagram-btn')?.addEventListener('click', () => sharePublishedGuideToPlatform('instagram'));
    modal.querySelector('#copy-published-guide-share-link-btn')?.addEventListener('click', copyPublishedGuideShareLink);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closePublishedGuideShare();
    });
    return modal;
  }

  function openPublishedGuideShare(id) {
    const record = getPublishedGuideById(id);
    if (!record) {
      window.TravelogApp?.showToast?.(t('공유할 가이드를 찾지 못했습니다.', 'Guide not found.', '共有するガイドが見つかりません。'));
      return;
    }

    sharingPublishedGuideId = id;
    const modal = ensurePublishedGuideShareModal();
    const url = buildPublishedGuideShareUrl(record);
    const summary = `핀 ${record.pinCount || 0} · 메모 ${record.memoCount || 0} · 쿠폰 ${record.couponCount || 0} · ${record.isPaid ? `${Number(record.coinPrice || 0).toLocaleString()} COIN` : '무료'}`;

    const imageEl = modal.querySelector('#published-guide-share-image');
    if (imageEl) imageEl.style.backgroundImage = record.representativeImage ? `url('${record.representativeImage}')` : '';
    const titleEl = modal.querySelector('#published-guide-share-title');
    if (titleEl) titleEl.textContent = record.tourName || 'Travelog 가이드';
    const summaryEl = modal.querySelector('#published-guide-share-summary');
    if (summaryEl) summaryEl.textContent = summary;
    const linkEl = modal.querySelector('#published-guide-share-link');
    if (linkEl) linkEl.value = url;

    renderPublishedGuideShareFriends(record, url);
    modal.style.display = 'flex';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closePublishedGuideShare() {
    const modal = document.getElementById('published-guide-share-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
  }

  function getCurrentSharingGuide() {
    return getPublishedGuideById(sharingPublishedGuideId);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  }

  async function copyPublishedGuideShareLink() {
    const record = getCurrentSharingGuide();
    if (!record) return;
    const url = buildPublishedGuideShareUrl(record);
    try {
      await copyTextToClipboard(url);
      window.TravelogApp?.showToast?.(t('공유 링크가 복사되었습니다.', 'Share link copied.', '共有リンクをコピーしました。'));
    } catch (error) {
      console.warn('[Travelog Share] link copy failed:', error);
      window.TravelogApp?.showToast?.(t('링크 복사에 실패했습니다. 입력창에서 직접 복사해 주세요.', 'Copy failed. Please copy the field manually.', 'コピーに失敗しました。入力欄から直接コピーしてください。'));
    }
  }

  async function sharePublishedGuideToPlatform(platform) {
    const record = getCurrentSharingGuide();
    if (!record) return;
    const url = buildPublishedGuideShareUrl(record);
    const text = buildPublishedGuideShareText(record);
    const title = record.tourName || 'Travelog Guide';

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        window.TravelogApp?.showToast?.(t('공유창을 열었습니다.', 'Share sheet opened.', '共有画面を開きました。'));
        return;
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      console.warn('[Travelog Share] native share failed:', error);
    }

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer,width=640,height=640');
      return;
    }

    try {
      await copyTextToClipboard(`${text}\n${url}`);
    } catch (error) {
      console.warn('[Travelog Share] fallback copy failed:', error);
    }

    if (platform === 'kakao') {
      window.location.href = `kakaotalk://sendurl?msg=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      setTimeout(() => window.TravelogApp?.showToast?.(t('카카오톡 앱이 열리지 않으면 링크가 복사되어 있습니다.', 'If KakaoTalk did not open, the link has been copied.', 'KakaoTalkが開かない場合、リンクはコピーされています。')), 500);
    } else if (platform === 'instagram') {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
      window.TravelogApp?.showToast?.(t('인스타그램에 붙여넣을 공유 문구와 링크를 복사했습니다.', 'Copied the share text and link for Instagram.', 'Instagram用の共有文とリンクをコピーしました。'));
    }
  }

  function renderPublishedGuideShareFriends(record, url) {
    const container = document.getElementById('published-guide-share-friend-list');
    if (!container) return;
    const friends = window.TravelogApp?.getState?.().friends || [];
    if (!Array.isArray(friends) || friends.length === 0) {
      container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:12px 0;">등록된 친구가 없습니다.</div>';
      return;
    }
    container.innerHTML = friends.map(friend => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:white; border:1px solid var(--glass-border); border-radius:12px; padding:8px 10px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div style="width:28px; height:28px; border-radius:50%; background:var(--grad-hero); color:white; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${escapeHtml((friend.name || '?').slice(0, 1))}</div>
          <div style="min-width:0;">
            <div style="font-size:12px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(friend.name || '친구')}</div>
            <div style="font-size:10px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(friend.memo || '친구')}</div>
          </div>
        </div>
        <button type="button" class="btn-rect secondary" onclick="TravelogCreatorModule.sharePublishedGuideToFriend('${escapeHtml(friend.id)}')" style="padding:5px 10px; font-size:11px; border-radius:999px;"><i class="fa-solid fa-paper-plane"></i> 쪽지</button>
      </div>
    `).join('');
  }

  function sharePublishedGuideToFriend(friendId) {
    const record = getCurrentSharingGuide();
    const appState = window.TravelogApp?.getState?.();
    const friend = (appState?.friends || []).find(item => String(item.id) === String(friendId));
    if (!record || !friend || !appState) return;

    const url = buildPublishedGuideShareUrl(record);
    const messageBody = `${buildPublishedGuideShareText(record)}\n${url}`;
    if (!Array.isArray(appState.messages)) appState.messages = [];
    appState.messages.unshift({
      id: Date.now(),
      sender: `나 → ${friend.name}`,
      date: new Date().toISOString().slice(0, 10),
      body: messageBody,
      unread: false
    });
    try {
      localStorage.setItem('travelog_home_messages_v1', JSON.stringify(appState.messages));
    } catch (error) {
      console.warn('[Travelog Share] message save failed:', error);
    }
    if (window.TravelogApp && typeof window.TravelogApp.renderHomeTab === 'function') {
      window.TravelogApp.renderHomeTab();
    }
    window.TravelogApp?.showToast?.(t(`${friend.name}에게 가이드 공유 쪽지를 보냈습니다.`, `Guide shared with ${friend.name}.`, `${friend.name}にガイドを共有しました。`));
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
    const record = getPublishedGuideRecords().find(item => String(item.id) === String(id));
    if (!record) return;

    const savedRecords = getSavedGuideRecords();
    const mergedRecord = { ...record, status: 'published' };
    saveSavedGuideRecords([
      mergedRecord,
      ...savedRecords.filter(item => String(item.id) !== String(id))
    ].slice(0, 80));
    renderSavedGuidesList();
    openSavedGuideEditor(id);
    window.TravelogApp?.showToast?.(t('출간된 가이드를 스튜디오로 불러왔습니다. 수정 완료를 누르면 기존 Supabase 출간 데이터를 덮어씁니다.', 'Published guide loaded into Studio. Complete Edit overwrites the existing Supabase guide.', '公開済みガイドをスタジオに読み込みました。修正完了で既存Supabase公開データを上書きします。'));
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

  async function publishPreparedGuideOnline() {
    const readiness = getPublishReadiness();
    if (!readiness.ready) {
      updateFinalPublishButtonState();
      window.TravelogApp.showToast(readiness.reason);
      return;
    }

    if (!window.TravelogSupabase || typeof window.TravelogSupabase.publishGuidePackage !== 'function') {
      console.warn('[Travelog Publish] Supabase connector is not ready. Falling back to Google Drive publisher.');
      publishPreparedGuideToDrive();
      return;
    }

    try {
      showPublishModalLoading(
        t('Supabase 서버로 출간 중입니다...', 'Publishing to Supabase...', 'Supabaseサーバーに公開しています...'),
        t('가이드 정보는 Database에, 대표 이미지/음성/영상/사진은 Storage에 업로드합니다.', 'Saving guide data to Database and media to Storage.', 'ガイド情報をDatabaseへ、メディアをStorageへ保存します。')
      );

      const publishResult = await window.TravelogSupabase.publishGuidePackage(pendingPublishPackage, { onProgress: updatePublishProgress });
      const completedPackage = {
        ...pendingPublishPackage,
        guideId: publishResult.guideId || pendingPublishPackage.guideId,
        publishedAt: new Date().toISOString(),
        supabaseGuideId: publishResult.guideId || pendingPublishPackage.guideId,
        guideCard: {
          ...(publishResult.guideCard || pendingPublishPackage.guideCard || {}),
          isSupabaseGuide: true,
          supabaseGuideId: publishResult.guideId || pendingPublishPackage.guideId,
          offlineReady: true,
          offlineStatus: 'creator-local'
        }
      };

      storePublishedGuideRecord(completedPackage);
      markSavedGuideAsPublished(completedPackage);
      registerGuideOnHome(completedPackage);

      const statusTitle = document.getElementById('publish-status-title');
      const statusDesc = document.getElementById('publish-status-desc');
      const spinner = document.getElementById('publish-loading-spinner');
      const successIcon = document.getElementById('publish-success-icon');
      const summary = document.getElementById('publish-local-summary');
      const actions = document.getElementById('publish-ready-actions');

      if (statusTitle) statusTitle.textContent = t('Supabase 출간이 완료되었습니다.', 'Supabase publishing complete.', 'Supabase公開が完了しました。');
      if (statusDesc) statusDesc.textContent = t('홈 화면의 오늘의 가이드에 등록되었고, 다른 유저는 구매 후 오프라인 다운로드할 수 있습니다.', 'Registered on Home. Other users can purchase and download it for offline use.', 'ホームに登録され、他のユーザーは購入後オフライン用にダウンロードできます。');
      if (spinner) spinner.style.display = 'none';
      if (successIcon) successIcon.style.display = 'block';
      if (summary) {
        summary.innerHTML = `
          Supabase Guide ID: ${completedPackage.supabaseGuideId}<br>
          업로드 용량: ${Number(publishResult.totalBytes || 0).toLocaleString()} bytes<br>
          오프라인 다운로드 원본 서버 등록 완료
        `;
        summary.style.display = 'block';
      }
      if (actions) actions.style.display = 'none';
      updatePublishProgress({
        percent: 100,
        label: t('출간 완료', 'Published', '公開完了'),
        detail: t('서버 등록과 미디어 검사가 완료되었습니다.', 'Server registration and media verification complete.', 'サーバー登録とメディア確認が完了しました。')
      });

      window.TravelogApp.addPoints(150);
      window.TravelogApp.showToast(t(`가이드 [${completedPackage.tourName}] Supabase 출간 완료!`, `Guide [${completedPackage.tourName}] published to Supabase!`, `ガイド［${completedPackage.tourName}］をSupabaseに公開しました！`));

      resetCreatorStudioForNewGuide();

      setTimeout(() => {
        closePublishModal();
        moveToHomeTab();
      }, 1500);
    } catch (error) {
      console.error('[Travelog Publish] Supabase publish failed:', error);
      closePublishModal();
      const detailMessage = error?.detail || error?.message || '';
      alert(`${t(
        'Supabase 출간 중 오류가 발생했습니다. 기존 Google Drive 출간은 실행하지 않았습니다.',
        'Supabase publishing failed. Google Drive publishing was not run.',
        'Supabase公開中にエラーが発生しました。Google Drive公開は実行していません。'
      )}${detailMessage ? `\n\n상세 오류: ${detailMessage}` : ''}`);
    }
  }

  async function publishPreparedGuideToDrive() {
    const readiness = getPublishReadiness();
    if (!readiness.ready) {
      updateFinalPublishButtonState();
      window.TravelogApp.showToast(readiness.reason);
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
      markSavedGuideAsPublished(completedPackage);
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
    btn.innerHTML = '<img class="studio-record-icon" src="assets/icons/studio/studio-stop-white.svg" alt="" aria-hidden="true">';
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
    btn.innerHTML = '<img class="studio-record-icon" src="assets/icons/studio/studio-microphone-white.svg" alt="" aria-hidden="true">';
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
          <div style="font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--accent-pink);">${idx + 1}. ${escapeHtml(getMediaDisplayTitle(audio, audio.name))}</div>
          <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(audio.name || audio.fileName || '')}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${selectHtml}
          <button class="btn-circle" style="width: 24px; height: 24px; font-size: 10px; background: rgba(255,50,50,0.1); border-color: rgba(255,50,50,0.15); color: var(--accent-pink);" onclick="TravelogCreatorModule.deleteAudio(${audio.id})">
            <img class="studio-svg-icon" src="assets/icons/studio/studio-delete.svg" alt="" aria-hidden="true">
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
    btn.innerHTML = '<img class="studio-record-icon" src="assets/icons/studio/studio-stop-white.svg" alt="" aria-hidden="true">';
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
    btn.innerHTML = '<img class="studio-record-icon" src="assets/icons/studio/studio-video-white.svg" alt="" aria-hidden="true">';
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
          <div style="font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--accent-blue);">${idx + 1}. ${escapeHtml(getMediaDisplayTitle(video, video.name))}</div>
          <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(video.name || video.fileName || '')}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${selectHtml}
          <button class="btn-circle" style="width: 24px; height: 24px; font-size: 10px; background: rgba(255,50,50,0.1); border-color: rgba(255,50,50,0.15); color: var(--accent-pink);" onclick="TravelogCreatorModule.deleteVideo(${video.id})">
            <img class="studio-svg-icon" src="assets/icons/studio/studio-delete.svg" alt="" aria-hidden="true">
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
      // Media list links by the pin's leading order number, not by duplicated pin names.
      optionsHtml += `<option value="${index}" ${isSelected}>핀 ${index + 1}번</option>`;
    });

    return `
      <select title="연동할 핀 순서 번호" style="background: var(--bg-tertiary); border: 1px solid var(--glass-border); color: #373737 !important; padding: 4px; border-radius: 4px; font-size: 11px; outline: none; cursor: pointer;">
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
      'photo-memo-modal',
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
    const voiceMemoTitleInput = document.getElementById('voice-memo-title-input');
    if (voiceMemoTitleInput) voiceMemoTitleInput.value = '';
    const videoMemoTitleInput = document.getElementById('video-memo-title-input');
    if (videoMemoTitleInput) videoMemoTitleInput.value = '';
    const photoMemoTitleInput = document.getElementById('photo-memo-title-input');
    if (photoMemoTitleInput) photoMemoTitleInput.value = '';
    const photoMemoTextInput = document.getElementById('photo-memo-text-input');
    if (photoMemoTextInput) photoMemoTextInput.value = '';
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
    disposeVoiceMemoPlayback(true);
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
      recordBtn.innerHTML = '<img class="studio-record-icon" src="assets/icons/studio/studio-microphone-white.svg" alt="" aria-hidden="true">';
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
    const voiceMemoTitleInput = document.getElementById('voice-memo-title-input');
    if (voiceMemoTitleInput) voiceMemoTitleInput.value = '';
    const videoMemoTitleInput = document.getElementById('video-memo-title-input');
    if (videoMemoTitleInput) videoMemoTitleInput.value = '';
  }

  function resetCreatorStudioForNewGuide() {
    clearStudioEditMode();
    const state = window.TravelogApp && window.TravelogApp.getState ? window.TravelogApp.getState() : null;
    if (state) {
      state.customCreatedPins = [];
    }

    recordedAudios = [];
    recordedVideos = [];
    recordedPhotos = [];
    registeredCoupons = [];
    saveRegisteredCoupons();

    pendingPublishPackage = null;
    lastSavedPublishSignature = '';
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

    const freeRadio = document.getElementById('guide-price-free');
    const paidRadio = document.getElementById('guide-price-paid');
    const priceInput = document.getElementById('guide-price-coin-input');
    if (freeRadio) freeRadio.checked = true;
    if (paidRadio) paidRadio.checked = false;
    if (priceInput) {
      priceInput.value = '100';
      priceInput.disabled = true;
    }

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
    renderSavedGuidesList();
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
    const linkedPhotosCount = recordedPhotos.filter(p => p.stopIndex !== -1).length;

    if (pinsCountEl) pinsCountEl.textContent = `${customPins.length}개`;
    if (audiosCountEl) audiosCountEl.textContent = `${linkedAudiosCount}개 (총 ${recordedAudios.length}개)`;
    if (videosCountEl) videosCountEl.textContent = `${linkedVideosCount}개 + 사진 ${linkedPhotosCount}개`;
    if (couponsCountEl) couponsCountEl.textContent = `${registeredCoupons.length}개`;

    updateFinalPublishButtonState();

    // Refresh Map Top HUD dynamically if Map tab is currently active
    const mapTab = document.getElementById('map-tab');
    if (mapTab && mapTab.classList.contains('active') && window.updateMapLayoutForMode) {
      window.updateMapLayoutForMode('create');
    }
  }

  // ==========================================
  // Field Capture Modals Logic
  // ==========================================
  function setModalHidden(modalId, hidden = true) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.toggle('active', !hidden);
    modal.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function closePinTypeSelectModal() {
    setModalHidden('pin-type-select-modal', true);
  }

  function closeVoiceMemoModal() {
    clearInterval(voiceMemoInterval);
    disposeVoiceMemoPlayback(true);
    if (voiceMemoRecorder && voiceMemoRecorder.state !== 'inactive') {
      try { voiceMemoRecorder.stop(); } catch (_) {}
    }
    if (voiceMemoStream) {
      voiceMemoStream.getTracks().forEach(track => track.stop());
      voiceMemoStream = null;
    }
    voiceMemoRecorder = null;
    voiceMemoChunks = [];
    voiceMemoBlob = null;
    voiceMemoSeconds = 0;
    const leftWheel = document.getElementById('tape-wheel-left');
    const rightWheel = document.getElementById('tape-wheel-right');
    if (leftWheel) leftWheel.style.animation = 'none';
    if (rightWheel) rightWheel.style.animation = 'none';
    const voiceStatus = document.getElementById('voice-memo-status');
    if (voiceStatus) voiceStatus.textContent = t('마이크 버튼을 눌러 녹음 시작', 'Press Record to start audio guide', '録音ボタンを押して録音開始');
    const voiceTimer = document.getElementById('voice-memo-timer');
    if (voiceTimer) voiceTimer.textContent = '00:00';
    setModalHidden('voice-memo-modal', true);
  }

  function closeVideoMemoModal() {
    clearInterval(videoMemoInterval);
    if (videoMemoRecorder && videoMemoRecorder.state !== 'inactive') {
      try { videoMemoRecorder.stop(); } catch (_) {}
    }
    if (videoMemoStream) {
      videoMemoStream.getTracks().forEach(track => track.stop());
      videoMemoStream = null;
    }
    videoMemoRecorder = null;
    videoMemoChunks = [];
    videoMemoBlob = null;
    videoMemoSeconds = 0;
    const webcamEl = document.getElementById('video-memo-webcam');
    if (webcamEl) {
      webcamEl.pause?.();
      webcamEl.srcObject = null;
      webcamEl.style.display = 'none';
    }
    const placeholder = document.getElementById('video-memo-placeholder');
    if (placeholder) placeholder.style.display = 'block';
    const timer = document.getElementById('video-memo-timer');
    if (timer) {
      timer.style.display = 'none';
      timer.textContent = '00:00 REC';
    }
    const videoStatus = document.getElementById('video-memo-status');
    if (videoStatus) videoStatus.textContent = t('녹화 버튼을 눌러 카메라 촬영 시작', 'Press Record to start video guide', '録画ボタンを押して撮影開始');
    setModalHidden('video-memo-modal', true);
  }

  function closeTextMemoModal() {
    const input = document.getElementById('text-memo-input');
    if (input) input.value = '';
    setModalHidden('text-memo-modal', true);
  }

  function waitForFieldMemoBlob(kind) {
    const getter = () => kind === 'video' ? videoMemoBlob : voiceMemoBlob;
    const chunksGetter = () => kind === 'video' ? videoMemoChunks : voiceMemoChunks;
    const fallbackType = kind === 'video' ? 'video/webm' : 'audio/webm';
    const fallbackText = kind === 'video' ? 'Travelog field video guide data' : 'Travelog field audio memo data';

    return new Promise((resolve) => {
      const existing = getter();
      if (existing instanceof Blob) {
        resolve(existing);
        return;
      }

      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        const ready = getter();
        if (ready instanceof Blob) {
          window.clearInterval(timer);
          resolve(ready);
          return;
        }

        const chunks = chunksGetter();
        if (Array.isArray(chunks) && chunks.length > 0) {
          const blob = new Blob(chunks, { type: fallbackType });
          if (kind === 'video') videoMemoBlob = blob;
          else voiceMemoBlob = blob;
          window.clearInterval(timer);
          resolve(blob);
          return;
        }

        if (attempts >= 12) {
          window.clearInterval(timer);
          resolve(new Blob([fallbackText], { type: 'text/plain' }));
        }
      }, 100);
    });
  }

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
    disposeVoiceMemoPlayback(true);
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
    const voiceTitleInput = document.getElementById('voice-memo-title-input');
    if (voiceTitleInput) voiceTitleInput.value = '';
    
    document.getElementById('voice-memo-record').disabled = false;
    document.getElementById('voice-memo-stop').disabled = true;
    document.getElementById('voice-memo-play').disabled = true;
    document.getElementById('voice-memo-reset').disabled = true;
    document.getElementById('voice-memo-complete').disabled = true;

    document.getElementById('tape-wheel-left').style.animation = 'none';
    document.getElementById('tape-wheel-right').style.animation = 'none';
  }

  async function startVoiceMemoRecording() {
    disposeVoiceMemoPlayback(true);
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
      voiceMemoRecorder.onstop = () => {
        voiceMemoBlob = voiceMemoChunks.length > 0
          ? new Blob(voiceMemoChunks, { type: 'audio/webm' })
          : new Blob(['Travelog field audio memo data'], { type: 'text/plain' });
      };
      voiceMemoRecorder.stop();
      if (voiceMemoStream) {
        voiceMemoStream.getTracks().forEach(track => track.stop());
      }
    } else {
      voiceMemoBlob = voiceMemoChunks.length > 0
        ? new Blob(voiceMemoChunks, { type: 'audio/webm' })
        : new Blob(['Travelog field audio memo data'], { type: 'text/plain' });
    }
  }

  function formatVoiceMemoClock(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const min = Math.floor(safeSeconds / 60);
    const sec = safeSeconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function setVoiceMemoPlaybackVisualState(isPlaying) {
    const screen = document.querySelector('#voice-memo-modal .voice-memo-cassette-screen');
    const playBtn = document.getElementById('voice-memo-play');
    const playIcon = playBtn?.querySelector('.voice-memo-control-icon');
    const leftWheel = document.getElementById('tape-wheel-left');
    const rightWheel = document.getElementById('tape-wheel-right');

    screen?.classList.toggle('is-playing', isPlaying);
    playBtn?.classList.toggle('is-playing', isPlaying);
    playBtn?.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    playBtn?.setAttribute('aria-label', isPlaying ? t('재생 일시정지', 'Pause playback', '再生を一時停止') : t('녹음 재생', 'Play recording', '録音を再生'));
    if (playIcon) {
      playIcon.src = isPlaying
        ? 'assets/icons/voice-memo/voice-pause.svg'
        : 'assets/icons/voice-memo/voice-play.svg';
    }
    if (leftWheel) leftWheel.style.animation = isPlaying ? 'spin 1.15s linear infinite' : 'none';
    if (rightWheel) rightWheel.style.animation = isPlaying ? 'spin 1.15s linear infinite reverse' : 'none';
  }

  function updateVoiceMemoPlaybackTimer() {
    const timer = document.getElementById('voice-memo-timer');
    if (!timer || !voiceMemoPlaybackAudio) return;
    const current = voiceMemoPlaybackAudio.currentTime || 0;
    const duration = Number.isFinite(voiceMemoPlaybackAudio.duration) && voiceMemoPlaybackAudio.duration > 0
      ? voiceMemoPlaybackAudio.duration
      : voiceMemoSeconds;
    timer.textContent = `${formatVoiceMemoClock(current)} / ${formatVoiceMemoClock(duration)}`;
  }

  function clearVoiceMemoPlaybackTicker() {
    if (voiceMemoPlaybackInterval) {
      clearInterval(voiceMemoPlaybackInterval);
      voiceMemoPlaybackInterval = null;
    }
  }

  function startVoiceMemoPlaybackTicker() {
    clearVoiceMemoPlaybackTicker();
    updateVoiceMemoPlaybackTimer();
    voiceMemoPlaybackInterval = setInterval(updateVoiceMemoPlaybackTimer, 200);
  }

  function disposeVoiceMemoPlayback(resetTimer = false) {
    clearVoiceMemoPlaybackTicker();
    if (voiceMemoPlaybackAudio) {
      voiceMemoPlaybackAudio.pause();
      voiceMemoPlaybackAudio.removeAttribute('src');
      voiceMemoPlaybackAudio.load();
      voiceMemoPlaybackAudio = null;
    }
    if (voiceMemoPlaybackUrl) {
      URL.revokeObjectURL(voiceMemoPlaybackUrl);
      voiceMemoPlaybackUrl = '';
    }
    setVoiceMemoPlaybackVisualState(false);
    if (resetTimer) {
      const timer = document.getElementById('voice-memo-timer');
      if (timer) timer.textContent = '00:00';
    }
  }

  async function playVoiceMemoRecording() {
    const status = document.getElementById('voice-memo-status');

    if (voiceMemoPlaybackAudio && !voiceMemoPlaybackAudio.paused) {
      voiceMemoPlaybackAudio.pause();
      clearVoiceMemoPlaybackTicker();
      setVoiceMemoPlaybackVisualState(false);
      if (status) status.textContent = t('재생이 일시정지되었습니다. 플레이 버튼을 누르면 이어서 재생합니다.', 'Playback paused. Press Play to resume.', '再生を一時停止しました。再生ボタンで続けます。');
      return;
    }

    if (voiceMemoPlaybackAudio && voiceMemoPlaybackAudio.paused && !voiceMemoPlaybackAudio.ended && voiceMemoPlaybackAudio.currentTime > 0) {
      try {
        await voiceMemoPlaybackAudio.play();
        setVoiceMemoPlaybackVisualState(true);
        startVoiceMemoPlaybackTicker();
        if (status) status.textContent = t('녹음된 가이드 음성을 재생 중입니다...', 'Playing guide audio...', '録音したガイド音声を再生中です...');
      } catch (error) {
        console.warn('Voice memo playback resume failed.', error);
        setVoiceMemoPlaybackVisualState(false);
      }
      return;
    }

    const playableBlob = voiceMemoBlob instanceof Blob ? voiceMemoBlob : await waitForFieldMemoBlob('audio');
    if (!(playableBlob instanceof Blob) || !String(playableBlob.type || '').startsWith('audio/')) {
      if (status) status.textContent = t('재생할 수 있는 음성 데이터가 없습니다.', 'No playable audio data is available.', '再生できる音声データがありません。');
      return;
    }

    disposeVoiceMemoPlayback(false);
    voiceMemoPlaybackUrl = URL.createObjectURL(playableBlob);
    const playbackAudio = new Audio(voiceMemoPlaybackUrl);
    voiceMemoPlaybackAudio = playbackAudio;
    playbackAudio.preload = 'metadata';
    playbackAudio.addEventListener('loadedmetadata', () => {
      if (voiceMemoPlaybackAudio === playbackAudio) updateVoiceMemoPlaybackTimer();
    });
    playbackAudio.addEventListener('timeupdate', () => {
      if (voiceMemoPlaybackAudio === playbackAudio) updateVoiceMemoPlaybackTimer();
    });
    playbackAudio.addEventListener('play', () => {
      if (voiceMemoPlaybackAudio !== playbackAudio) return;
      setVoiceMemoPlaybackVisualState(true);
      startVoiceMemoPlaybackTicker();
    });
    playbackAudio.addEventListener('pause', () => {
      if (voiceMemoPlaybackAudio === playbackAudio && !playbackAudio.ended) {
        clearVoiceMemoPlaybackTicker();
        setVoiceMemoPlaybackVisualState(false);
      }
    });
    playbackAudio.addEventListener('ended', () => {
      if (voiceMemoPlaybackAudio !== playbackAudio) return;
      clearVoiceMemoPlaybackTicker();
      updateVoiceMemoPlaybackTimer();
      setVoiceMemoPlaybackVisualState(false);
      const screen = document.querySelector('#voice-memo-modal .voice-memo-cassette-screen');
      screen?.classList.add('playback-finished');
      window.setTimeout(() => screen?.classList.remove('playback-finished'), 650);
      if (status) status.textContent = t('재생이 완료되었습니다.', 'Playback finished.', '再生が完了しました。');
    });
    playbackAudio.addEventListener('error', () => {
      if (voiceMemoPlaybackAudio !== playbackAudio) return;
      clearVoiceMemoPlaybackTicker();
      setVoiceMemoPlaybackVisualState(false);
      if (status) status.textContent = t('음성을 재생하지 못했습니다. 다시 녹음해 주세요.', 'Could not play the audio. Please record again.', '音声を再生できませんでした。録音し直してください。');
    });

    try {
      await playbackAudio.play();
      if (status) status.textContent = t('녹음된 가이드 음성을 재생 중입니다...', 'Playing guide audio...', '録音したガイド音声を再生中です...');
      window.TravelogApp.showToast(t('녹음된 가이드 음성을 재생합니다...', 'Playing guide audio...', '録音されたガイド音声を再生します...'));
    } catch (error) {
      console.warn('Voice memo playback failed.', error);
      setVoiceMemoPlaybackVisualState(false);
      if (status) status.textContent = t('재생을 시작하지 못했습니다. 플레이 버튼을 다시 눌러 주세요.', 'Playback could not start. Press Play again.', '再生を開始できませんでした。もう一度再生ボタンを押してください。');
    }
  }

  function resetVoiceMemoRecording() {
    openVoiceMemoModal();
  }

  async function completeVoiceMemoRecording() {
    disposeVoiceMemoPlayback(false);
    const completeBtn = document.getElementById('voice-memo-complete');
    if (completeBtn) completeBtn.disabled = true;
    const audioBlobToSave = await waitForFieldMemoBlob('audio');
    document.getElementById('voice-memo-modal').classList.remove('active');

    const cleanTourName = (document.getElementById('new-tour-name')?.value || 'Tour').replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const memoTitle = getMemoTitleInputValue('voice-memo-title-input', t('음성 메모', 'Audio Memo', '音声メモ'));
    const memoFileBase = safeFileName(memoTitle, `voice_memo_${cleanTourName}`);
    const filename = `voice_memo_${memoFileBase}_${Date.now()}.${audioBlobToSave && audioBlobToSave.type.includes('text') ? 'txt' : 'webm'}`;

    if (window.TravelogMapModule && typeof window.TravelogMapModule.addNewCreatorPin === 'function') {
      window.TravelogMapModule.addNewCreatorPin(tempPinLat, tempPinLng, memoTitle, '');
    }

    const customPins = window.TravelogApp.getState().customCreatedPins;
    const newStopIdx = customPins.length - 1;

    const audioMemoEntry = {
      id: Date.now(),
      name: filename,
      fileName: filename,
      title: memoTitle,
      displayTitle: memoTitle,
      memoTitle: memoTitle,
      blob: audioBlobToSave,
      mimeType: audioBlobToSave.type || 'audio/webm',
      stopIndex: newStopIdx,
      pinId: customPins[newStopIdx]?.id || ''
    };
    try { audioMemoEntry.objectUrl = URL.createObjectURL(audioBlobToSave); } catch (_) {}
    recordedAudios.push(audioMemoEntry);
    blobToDataUrl(audioBlobToSave).then((dataUrl) => {
      audioMemoEntry.dataUrl = dataUrl;
    }).catch(() => {});

    if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.saveGeneratedFile === 'function') {
      window.TravelogDeviceStorage.saveGeneratedFile('Audio', filename, audioBlobToSave, {
        source: 'field-audio-memo',
        title: memoTitle,
        memoTitle: memoTitle,
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

    markPublishDraftDirty();
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
    const videoTitleInput = document.getElementById('video-memo-title-input');
    if (videoTitleInput) videoTitleInput.value = '';
    
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
      videoMemoRecorder.onstop = () => {
        videoMemoBlob = videoMemoChunks.length > 0
          ? new Blob(videoMemoChunks, { type: 'video/webm' })
          : new Blob(['Travelog field video guide data'], { type: 'text/plain' });
      };
      videoMemoRecorder.stop();
      if (videoMemoStream) {
        videoMemoStream.getTracks().forEach(track => track.stop());
      }
    } else {
      videoMemoBlob = videoMemoChunks.length > 0
        ? new Blob(videoMemoChunks, { type: 'video/webm' })
        : new Blob(['Travelog field video guide data'], { type: 'text/plain' });
    }
  }

  function playVideoMemoRecording() {
    if (!videoMemoBlob) return;
    const url = URL.createObjectURL(videoMemoBlob);
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.src = url;
    video.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3600;width:min(92vw,520px);max-height:70vh;background:#000;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);';
    video.addEventListener('ended', () => { try { URL.revokeObjectURL(url); } catch (_) {} video.remove(); });
    video.addEventListener('click', () => { try { video.pause(); URL.revokeObjectURL(url); } catch (_) {} video.remove(); });
    document.body.appendChild(video);
    video.play().catch(() => window.TravelogApp.showToast(t('재생 버튼을 눌러 영상을 확인해 주세요.', 'Tap play to preview the video.', '再生ボタンを押して動画を確認してください。')));
  }

  function resetVideoMemoRecording() {
    openVideoMemoModal();
  }

  async function completeVideoMemoRecording() {
    const completeBtn = document.getElementById('video-memo-complete');
    if (completeBtn) completeBtn.disabled = true;
    const videoBlobToSave = await waitForFieldMemoBlob('video');
    document.getElementById('video-memo-modal').classList.remove('active');

    const cleanTourName = (document.getElementById('new-tour-name')?.value || 'Tour').replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const memoTitle = getMemoTitleInputValue('video-memo-title-input', t('영상 메모', 'Video Memo', '動画メモ'));
    const memoFileBase = safeFileName(memoTitle, `video_memo_${cleanTourName}`);
    const filename = `video_memo_${memoFileBase}_${Date.now()}.${videoBlobToSave && videoBlobToSave.type.includes('text') ? 'txt' : 'webm'}`;

    if (window.TravelogMapModule && typeof window.TravelogMapModule.addNewCreatorPin === 'function') {
      window.TravelogMapModule.addNewCreatorPin(tempPinLat, tempPinLng, memoTitle, '');
    }

    const customPins = window.TravelogApp.getState().customCreatedPins;
    const newStopIdx = customPins.length - 1;

    const videoMemoEntry = {
      id: Date.now(),
      name: filename,
      fileName: filename,
      title: memoTitle,
      displayTitle: memoTitle,
      memoTitle: memoTitle,
      blob: videoBlobToSave,
      mimeType: videoBlobToSave.type || 'video/webm',
      stopIndex: newStopIdx,
      pinId: customPins[newStopIdx]?.id || ''
    };
    try { videoMemoEntry.objectUrl = URL.createObjectURL(videoBlobToSave); } catch (_) {}
    recordedVideos.push(videoMemoEntry);
    blobToDataUrl(videoBlobToSave).then((dataUrl) => {
      videoMemoEntry.dataUrl = dataUrl;
    }).catch(() => {});

    if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.saveGeneratedFile === 'function') {
      window.TravelogDeviceStorage.saveGeneratedFile('Video', filename, videoBlobToSave, {
        source: 'field-video-memo',
        title: memoTitle,
        memoTitle: memoTitle,
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

    markPublishDraftDirty();
    renderCoordinatesList();
    renderVideoList();
    updatePublishPanelCounts();
  }


  // 3) Photo Field Capture
  let photoMemoMode = 'draw';
  let photoMemoColor = '#ff2e63';
  let photoMemoWidth = 5;
  let photoMemoUndoStack = [];
  let photoMemoDrawing = false;
  let photoMemoCanvasReady = false;

  function getPhotoMemoCanvas() {
    return document.getElementById('photo-memo-canvas');
  }

  function getPhotoMemoContext() {
    const canvas = getPhotoMemoCanvas();
    return canvas ? canvas.getContext('2d') : null;
  }

  function resetPhotoMemoCanvas() {
    const canvas = getPhotoMemoCanvas();
    const ctx = getPhotoMemoContext();
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    photoMemoUndoStack = [];
    photoMemoCanvasReady = false;
    const completeBtn = document.getElementById('photo-memo-complete');
    if (completeBtn) completeBtn.disabled = true;
  }

  function pushPhotoMemoUndoState() {
    const canvas = getPhotoMemoCanvas();
    if (!canvas) return;
    try {
      photoMemoUndoStack.push(canvas.toDataURL('image/png'));
      if (photoMemoUndoStack.length > 20) photoMemoUndoStack.shift();
    } catch (_) {}
  }

  function restorePhotoMemoDataUrl(dataUrl) {
    const canvas = getPhotoMemoCanvas();
    const ctx = getPhotoMemoContext();
    if (!canvas || !ctx || !dataUrl) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      photoMemoCanvasReady = true;
      const completeBtn = document.getElementById('photo-memo-complete');
      if (completeBtn) completeBtn.disabled = false;
    };
    img.src = dataUrl;
  }

  function undoPhotoMemoEdit() {
    const prev = photoMemoUndoStack.pop();
    if (prev) restorePhotoMemoDataUrl(prev);
  }

  function getCanvasPoint(event) {
    const canvas = getPhotoMemoCanvas();
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const pointer = event.touches && event.touches[0] ? event.touches[0] : event;
    return {
      x: ((pointer.clientX - rect.left) / rect.width) * canvas.width,
      y: ((pointer.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function beginPhotoDraw(event) {
    const ctx = getPhotoMemoContext();
    if (!ctx || !photoMemoCanvasReady) return;
    event.preventDefault();
    pushPhotoMemoUndoState();
    photoMemoDrawing = true;
    const point = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function movePhotoDraw(event) {
    const ctx = getPhotoMemoContext();
    if (!ctx || !photoMemoDrawing || !photoMemoCanvasReady) return;
    event.preventDefault();
    const point = getCanvasPoint(event);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = photoMemoWidth;
    if (photoMemoMode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = photoMemoColor;
    }
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function endPhotoDraw() {
    const ctx = getPhotoMemoContext();
    if (ctx) ctx.globalCompositeOperation = 'source-over';
    photoMemoDrawing = false;
  }

  function loadPhotoMemoFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      window.TravelogApp.showToast(t('이미지 파일을 선택해 주세요.', 'Please select an image file.', '画像ファイルを選択してください。'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = getPhotoMemoCanvas();
        const ctx = getPhotoMemoContext();
        if (!canvas || !ctx) return;
        resetPhotoMemoCanvas();
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = (canvas.width - drawW) / 2;
        const dy = (canvas.height - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        photoMemoCanvasReady = true;
        const completeBtn = document.getElementById('photo-memo-complete');
        if (completeBtn) completeBtn.disabled = false;
        const status = document.getElementById('photo-memo-status');
        if (status) status.textContent = t('사진이 추가되었습니다. 그리기/지우개로 편집할 수 있습니다.', 'Photo added. You can edit it with draw/eraser tools.', '写真を追加しました。描画/消しゴムで編集できます。');
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  function renderPhotoColorPalette() {
    const palette = document.getElementById('photo-memo-color-palette');
    if (!palette || palette.dataset.bound === 'true') return;
    const colors = ['#000000','#373737','#ffffff','#ff2e63','#ff5c8a','#e63946','#ff7a00','#ffb703','#ffd166','#34a853','#2dd4bf','#00adb5','#0096c7','#3a86ff','#4361ee','#8338ec','#8b5cf6','#c77dff','#ff00a8','#b5179e','#795548','#9e9e9e','#607d8b','#f8fafc'];
    palette.innerHTML = colors.map((color, index) => `<button type="button" data-photo-color="${color}" title="색상 ${index + 1}" style="height:22px;border-radius:7px;border:2px solid ${index === 3 ? '#373737' : 'rgba(0,0,0,0.12)'};background:${color};cursor:pointer;"></button>`).join('');
    palette.querySelectorAll('[data-photo-color]').forEach(button => {
      button.addEventListener('click', () => {
        photoMemoColor = button.getAttribute('data-photo-color') || '#ff2e63';
        photoMemoMode = 'draw';
        palette.querySelectorAll('[data-photo-color]').forEach(btn => btn.style.borderColor = 'rgba(0,0,0,0.12)');
        button.style.borderColor = '#373737';
      });
    });
    palette.dataset.bound = 'true';
  }

  function bindPhotoMemoModalControls() {
    renderPhotoColorPalette();
    const canvas = getPhotoMemoCanvas();
    if (canvas && canvas.dataset.bound !== 'true') {
      canvas.addEventListener('mousedown', beginPhotoDraw);
      canvas.addEventListener('mousemove', movePhotoDraw);
      window.addEventListener('mouseup', endPhotoDraw);
      canvas.addEventListener('touchstart', beginPhotoDraw, { passive: false });
      canvas.addEventListener('touchmove', movePhotoDraw, { passive: false });
      window.addEventListener('touchend', endPhotoDraw);
      canvas.dataset.bound = 'true';
    }
    const cameraInput = document.getElementById('photo-memo-camera-input');
    const galleryInput = document.getElementById('photo-memo-gallery-input');
    const cameraBtn = document.getElementById('photo-memo-camera-btn');
    const galleryBtn = document.getElementById('photo-memo-gallery-btn');
    const closeBtn = document.getElementById('photo-memo-close-btn');
    const cancelBtn = document.getElementById('photo-memo-cancel');
    const drawBtn = document.getElementById('photo-memo-draw-btn');
    const eraseBtn = document.getElementById('photo-memo-erase-btn');
    const undoBtn = document.getElementById('photo-memo-undo-btn');
    const widthSelect = document.getElementById('photo-memo-pen-width');

    if (cameraBtn && cameraBtn.dataset.bound !== 'true') {
      cameraBtn.addEventListener('click', () => cameraInput?.click());
      cameraBtn.dataset.bound = 'true';
    }
    if (galleryBtn && galleryBtn.dataset.bound !== 'true') {
      galleryBtn.addEventListener('click', () => galleryInput?.click());
      galleryBtn.dataset.bound = 'true';
    }
    [cameraInput, galleryInput].forEach(input => {
      if (input && input.dataset.bound !== 'true') {
        input.addEventListener('change', () => loadPhotoMemoFile(input.files && input.files[0]));
        input.dataset.bound = 'true';
      }
    });
    if (closeBtn && closeBtn.dataset.bound !== 'true') { closeBtn.addEventListener('click', closePhotoMemoModal); closeBtn.dataset.bound = 'true'; }
    if (cancelBtn && cancelBtn.dataset.bound !== 'true') { cancelBtn.addEventListener('click', closePhotoMemoModal); cancelBtn.dataset.bound = 'true'; }
    if (drawBtn && drawBtn.dataset.bound !== 'true') { drawBtn.addEventListener('click', () => { photoMemoMode = 'draw'; }); drawBtn.dataset.bound = 'true'; }
    if (eraseBtn && eraseBtn.dataset.bound !== 'true') { eraseBtn.addEventListener('click', () => { photoMemoMode = 'erase'; }); eraseBtn.dataset.bound = 'true'; }
    if (undoBtn && undoBtn.dataset.bound !== 'true') { undoBtn.addEventListener('click', undoPhotoMemoEdit); undoBtn.dataset.bound = 'true'; }
    if (widthSelect && widthSelect.dataset.bound !== 'true') {
      widthSelect.addEventListener('change', () => { photoMemoWidth = Number(widthSelect.value || 5); });
      widthSelect.dataset.bound = 'true';
    }
  }

  function openPhotoMemoModal() {
    bindPhotoMemoModalControls();
    const modal = document.getElementById('photo-memo-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    const titleInput = document.getElementById('photo-memo-title-input');
    const textInput = document.getElementById('photo-memo-text-input');
    const cameraInput = document.getElementById('photo-memo-camera-input');
    const galleryInput = document.getElementById('photo-memo-gallery-input');
    if (titleInput) titleInput.value = '';
    if (textInput) textInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (galleryInput) galleryInput.value = '';
    const status = document.getElementById('photo-memo-status');
    if (status) status.textContent = t('카메라 촬영 또는 사진추가로 이미지를 넣고 간단히 편집하세요.', 'Take a camera photo or add an image, then edit it.', 'カメラ撮影または写真追加で画像を入れて編集してください。');
    photoMemoMode = 'draw';
    photoMemoColor = '#ff2e63';
    photoMemoWidth = 5;
    resetPhotoMemoCanvas();
  }

  function closePhotoMemoModal() {
    const titleInput = document.getElementById('photo-memo-title-input');
    const textInput = document.getElementById('photo-memo-text-input');
    if (titleInput) titleInput.value = '';
    if (textInput) textInput.value = '';
    setModalHidden('photo-memo-modal', true);
  }

  function canvasToBlob(canvas, mimeType = 'image/png', quality = 0.92) {
    return new Promise((resolve) => {
      if (!canvas) {
        resolve(new Blob([''], { type: mimeType }));
        return;
      }
      canvas.toBlob(blob => resolve(blob || new Blob([''], { type: mimeType })), mimeType, quality);
    });
  }

  async function completePhotoMemoRecording() {
    if (!photoMemoCanvasReady) {
      window.TravelogApp.showToast(t('사진을 먼저 추가해 주세요.', 'Add a photo first.', '先に写真を追加してください。'));
      return;
    }
    const canvas = getPhotoMemoCanvas();
    const photoBlob = await canvasToBlob(canvas, 'image/png');
    const dataUrl = canvas ? canvas.toDataURL('image/png') : '';
    const memoTitle = getMemoTitleInputValue('photo-memo-title-input', t('사진 메모', 'Photo Memo', '写真メモ'));
    const memoText = String(document.getElementById('photo-memo-text-input')?.value || '').trim();
    const memoFileBase = safeFileName(memoTitle, 'photo_memo');
    const filename = `photo_memo_${memoFileBase}_${Date.now()}.png`;

    document.getElementById('photo-memo-modal')?.classList.remove('active');

    if (window.TravelogMapModule && typeof window.TravelogMapModule.addNewCreatorPin === 'function') {
      window.TravelogMapModule.addNewCreatorPin(tempPinLat, tempPinLng, memoTitle, memoText);
    }

    const customPins = window.TravelogApp.getState().customCreatedPins;
    const newStopIdx = customPins.length - 1;
    if (customPins[newStopIdx]) {
      customPins[newStopIdx].memoType = 'photo';
      customPins[newStopIdx].type = 'photo';
      customPins[newStopIdx].description = memoText;
    }

    const photoMemoEntry = {
      id: Date.now(),
      name: filename,
      fileName: filename,
      title: memoTitle,
      displayTitle: memoTitle,
      memoTitle,
      memoText,
      blob: photoBlob,
      dataUrl,
      mimeType: 'image/png',
      stopIndex: newStopIdx,
      pinId: customPins[newStopIdx]?.id || ''
    };
    recordedPhotos.push(photoMemoEntry);

    if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.saveGeneratedFile === 'function') {
      window.TravelogDeviceStorage.saveGeneratedFile('Photo', filename, photoBlob, {
        source: 'field-photo-memo',
        title: memoTitle,
        memoTitle,
        memoText,
        stopIndex: newStopIdx,
        lat: tempPinLat,
        lng: tempPinLng
      }).then(() => {
        window.TravelogApp.showToast(t('Photo 폴더에 사진 메모가 저장되었습니다.', 'Photo memo saved to the Photo folder.', 'Photoフォルダに写真メモを保存しました。'));
      }).catch((error) => {
        console.warn('[Travelog Device Storage] Photo memo save failed:', error);
        window.TravelogApp.showToast(t('사진 메모는 앱에 보관되었지만 기기 저장소 쓰기에 실패했습니다.', 'Photo memo is kept in the app, but device write failed.', '写真メモはアプリに保持されましたが端末保存に失敗しました。'));
      });
    } else {
      window.TravelogApp.showToast(t('사진 메모가 앱에 저장되었습니다.', 'Photo memo saved in the app.', '写真メモをアプリに保存しました。'));
    }

    markPublishDraftDirty();
    renderCoordinatesList();
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
      const textPinName = memoVal.length > 18 ? `${memoVal.slice(0, 18)}...` : memoVal;
      window.TravelogMapModule.addNewCreatorPin(tempPinLat, tempPinLng, textPinName, memoVal);
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
      renderSavedGuidesList();
      updatePublishPanelCounts();
    },
    removeCoordinate: removeCoordinate,
    moveCoordinate: moveCoordinate,
    moveCoordinateTo: moveCoordinateTo,
    updateCreatorPinName: updateCreatorPinName,
    removeRegisteredCoupon: removeRegisteredCoupon,
    openSavedGuideEditor: openSavedGuideEditor,
    deleteSavedGuide: deleteSavedGuide,
    renderSavedGuidesList: renderSavedGuidesList,
    openPublishedGuideEditor: openPublishedGuideEditor,
    openPublishedGuideShare: openPublishedGuideShare,
    closePublishedGuideShare: closePublishedGuideShare,
    copyPublishedGuideShareLink: copyPublishedGuideShareLink,
    sharePublishedGuideToPlatform: sharePublishedGuideToPlatform,
    sharePublishedGuideToFriend: sharePublishedGuideToFriend,
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
