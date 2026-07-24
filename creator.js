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
  const GOOGLE_DRIVE_TOKEN_KEY = 'travelog_google_drive_access_token';
  let pendingPublishPackage = null;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
    renderCoordinatesList();
    renderAudioList();
    renderVideoList();
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
      bg: 'assets/images/brand/travelog-ci-symbol.svg',
      badge: '오늘의 가이드',
      isWidget: true,
      createdAt,
      pinCount: pins.length
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
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error('DIRECTORY_PICKER_UNSUPPORTED');
    }

    const selectedHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const dataHandle = await getOrCreateLocalDirectory(selectedHandle, 'Travelog_user_data');
    const audioHandle = await getOrCreateLocalDirectory(dataHandle, 'Audio');
    const videoHandle = await getOrCreateLocalDirectory(dataHandle, 'Video');
    const textHandle = await getOrCreateLocalDirectory(dataHandle, 'Text');

    for (const file of packageData.audioFiles) {
      await writeBlobToLocalFile(audioHandle, file.fileName, file.blob);
    }

    for (const file of packageData.videoFiles) {
      await writeBlobToLocalFile(videoHandle, file.fileName, file.blob);
    }

    for (const file of packageData.textFiles) {
      await writeBlobToLocalFile(textHandle, file.fileName, file.blob);
    }

    for (const file of packageData.rootFiles) {
      await writeBlobToLocalFile(dataHandle, file.fileName, file.blob);
    }

    return {
      selectedFolderName: selectedHandle.name || t('선택한 저장 위치', 'Selected folder', '選択した保存先'),
      dataFolderName: 'Travelog_user_data'
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

    const confirmSave = window.confirm(t('출간 데이터를 저장할 위치를 선택할까요?', 'Choose where to save the publish data?', '公開データの保存先を選択しますか？'));
    if (!confirmSave) return;

    try {
      showPublishModalLoading(
        t('출간 데이터를 저장 중입니다...', 'Saving publish data...', '公開データを保存しています...'),
        t('저장 위치를 선택하면 Travelog_user_data 폴더와 Audio, Video, Text 폴더가 생성됩니다.', 'Select a folder; Travelog_user_data with Audio, Video, and Text subfolders will be created.', '保存先を選択すると、Travelog_user_data と Audio/Video/Text フォルダを作成します。')
      );

      const packageData = buildGuidePublishPackage();
      const localSaveInfo = await savePackageToLocalDevice(packageData);
      pendingPublishPackage = packageData;
      showPublishReadyModal(packageData, localSaveInfo);
      window.TravelogApp.showToast(t(`${tourName} 출간 데이터 저장 완료`, `${tourName} publish data saved`, `${tourName} の公開データを保存しました`));
    } catch (error) {
      console.error('[Travelog Publish] Local save failed:', error);
      closePublishModal();
      if (error && error.name === 'AbortError') {
        window.TravelogApp.showToast(t('저장 위치 선택이 취소되었습니다.', 'Folder selection canceled.', '保存先選択がキャンセルされました。'));
        return;
      }
      if (error && error.message === 'DIRECTORY_PICKER_UNSUPPORTED') {
        alert(t('현재 브라우저에서는 폴더 선택 저장 기능을 지원하지 않습니다. Chrome 또는 Edge에서 실행해 주세요.', 'This browser does not support folder saving. Please run it in Chrome or Edge.', 'このブラウザはフォルダ保存に対応していません。Chrome または Edge で実行してください。'));
        return;
      }
      alert(t('출간 데이터 저장 중 오류가 발생했습니다. 브라우저 권한과 저장 위치를 다시 확인해 주세요.', 'Could not save publish data. Please check browser permissions and the selected folder.', '公開データ保存中にエラーが発生しました。'));
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

  function getGoogleDriveAccessToken() {
    return localStorage.getItem(GOOGLE_DRIVE_TOKEN_KEY) || '';
  }

  function setGoogleDriveAccessToken(token) {
    if (token) {
      localStorage.setItem(GOOGLE_DRIVE_TOKEN_KEY, token);
    }
  }

  function clearGoogleDriveAccessToken() {
    localStorage.removeItem(GOOGLE_DRIVE_TOKEN_KEY);
  }

  async function requestGoogleDriveAccessToken() {
    let token = getGoogleDriveAccessToken();
    if (token) return token;

    token = window.prompt(t(
      'Google Drive 업로드용 OAuth Access Token을 입력해 주세요. 취소하면 구글 드라이브 폴더만 열립니다.',
      'Enter a Google Drive OAuth access token. Cancel will only open the Drive folder.',
      'Google Driveアップロード用OAuthアクセストークンを入力してください。キャンセルするとDriveフォルダだけ開きます。'
    ));

    if (!token || !token.trim()) {
      throw new Error('GOOGLE_DRIVE_TOKEN_REQUIRED');
    }

    token = token.trim();
    setGoogleDriveAccessToken(token);
    return token;
  }

  function driveHeaders(token, json = false) {
    const headers = { Authorization: `Bearer ${token}` };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function escapeDriveQuery(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  async function parseGoogleDriveError(response) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data?.error?.message || JSON.stringify(data);
    } catch (_) {
      detail = await response.text().catch(() => '');
    }
    return new Error(`Google Drive API ${response.status}: ${detail || response.statusText}`);
  }

  async function findDriveFileByName(token, parentId, name, mimeType) {
    const queryParts = [
      `'${parentId}' in parents`,
      `name='${escapeDriveQuery(name)}'`,
      'trashed=false'
    ];
    if (mimeType) queryParts.push(`mimeType='${mimeType}'`);

    const params = new URLSearchParams({
      q: queryParts.join(' and '),
      fields: 'files(id,name,mimeType)',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true'
    });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: driveHeaders(token)
    });

    if (!response.ok) throw await parseGoogleDriveError(response);
    const data = await response.json();
    return Array.isArray(data.files) && data.files.length ? data.files[0] : null;
  }

  async function createDriveFolder(token, parentId, name) {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: driveHeaders(token, true),
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      })
    });

    if (!response.ok) throw await parseGoogleDriveError(response);
    return response.json();
  }

  async function getOrCreateDriveFolder(token, parentId, name) {
    const existing = await findDriveFileByName(token, parentId, name, 'application/vnd.google-apps.folder');
    if (existing) return existing.id;
    const created = await createDriveFolder(token, parentId, name);
    return created.id;
  }

  async function uploadBlobToDrive(token, folderId, fileName, blob) {
    const boundary = `travelog_boundary_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    const body = new Blob([
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`
    ], { type: `multipart/related; boundary=${boundary}` });

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!response.ok) throw await parseGoogleDriveError(response);
    return response.json();
  }

  async function findUserStudioSpreadsheet(token) {
    return findDriveFileByName(token, DRIVE_PARENT_FOLDER_ID, 'User Studio Data', 'application/vnd.google-apps.spreadsheet');
  }

  async function appendRowsToUserStudioSheet(token, spreadsheetId, rows) {
    const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: driveHeaders(token)
    });
    if (!metadataResponse.ok) throw await parseGoogleDriveError(metadataResponse);
    const metadata = await metadataResponse.json();
    const firstSheetTitle = metadata?.sheets?.[0]?.properties?.title || 'Sheet1';
    const range = encodeURIComponent(`${firstSheetTitle}!A1`);

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: driveHeaders(token, true),
      body: JSON.stringify({ values: rows })
    });

    if (!response.ok) throw await parseGoogleDriveError(response);
    return response.json();
  }

  async function uploadPackageToGoogleDrive(packageData) {
    const token = await requestGoogleDriveAccessToken();
    const audioFolderId = await getOrCreateDriveFolder(token, DRIVE_PARENT_FOLDER_ID, 'Audio');
    const videoFolderId = await getOrCreateDriveFolder(token, DRIVE_PARENT_FOLDER_ID, 'Video');
    const textFolderId = await getOrCreateDriveFolder(token, DRIVE_PARENT_FOLDER_ID, 'Text');

    const uploaded = [];

    for (const file of packageData.audioFiles) {
      uploaded.push(await uploadBlobToDrive(token, audioFolderId, file.fileName, file.blob));
    }

    for (const file of packageData.videoFiles) {
      uploaded.push(await uploadBlobToDrive(token, videoFolderId, file.fileName, file.blob));
    }

    for (const file of packageData.textFiles) {
      uploaded.push(await uploadBlobToDrive(token, textFolderId, file.fileName, file.blob));
    }

    for (const file of packageData.rootFiles.filter(file => file.fileName !== 'User Studio Data.csv')) {
      uploaded.push(await uploadBlobToDrive(token, DRIVE_PARENT_FOLDER_ID, file.fileName, file.blob));
    }

    let spreadsheetUpdated = false;
    let spreadsheetFallbackUploaded = false;
    try {
      const spreadsheet = await findUserStudioSpreadsheet(token);
      if (spreadsheet && spreadsheet.id) {
        await appendRowsToUserStudioSheet(token, spreadsheet.id, packageData.studioRows);
        spreadsheetUpdated = true;
      } else {
        const csvFile = packageData.rootFiles.find(file => file.fileName === 'User Studio Data.csv');
        if (csvFile) {
          await uploadBlobToDrive(token, DRIVE_PARENT_FOLDER_ID, csvFile.fileName, csvFile.blob);
          spreadsheetFallbackUploaded = true;
        }
      }
    } catch (sheetError) {
      console.warn('[Travelog Publish] User Studio Data sheet append failed. Uploading CSV fallback.', sheetError);
      const csvFile = packageData.rootFiles.find(file => file.fileName === 'User Studio Data.csv');
      if (csvFile) {
        await uploadBlobToDrive(token, DRIVE_PARENT_FOLDER_ID, csvFile.fileName, csvFile.blob);
        spreadsheetFallbackUploaded = true;
      }
    }

    return {
      uploadedCount: uploaded.length,
      spreadsheetUpdated,
      spreadsheetFallbackUploaded
    };
  }

  function registerGuideOnHome(packageData) {
    if (window.TravelogApp && typeof window.TravelogApp.registerPublishedGuide === 'function') {
      window.TravelogApp.registerPublishedGuide(packageData.guideCard);
    }
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
        t('Audio, Video, Text 폴더와 User Studio Data 스프레드시트에 데이터를 반영하고 있습니다.', 'Uploading to Audio, Video, Text folders and updating User Studio Data.', 'Audio/Video/TextフォルダとUser Studio Dataに反映しています。')
      );

      const uploadResult = await uploadPackageToGoogleDrive(pendingPublishPackage);
      const statusTitle = document.getElementById('publish-status-title');
      const statusDesc = document.getElementById('publish-status-desc');
      const spinner = document.getElementById('publish-loading-spinner');
      const successIcon = document.getElementById('publish-success-icon');
      const summary = document.getElementById('publish-local-summary');
      const actions = document.getElementById('publish-ready-actions');

      registerGuideOnHome(pendingPublishPackage);

      if (statusTitle) statusTitle.textContent = t('출간이 완료되었습니다.', 'Publishing complete.', '公開が完了しました。');
      if (statusDesc) statusDesc.textContent = t('홈 화면의 오늘의 가이드에 등록되었습니다.', "Registered under Today's Guide on Home.", 'ホームの今日のガイドに登録されました。');
      if (spinner) spinner.style.display = 'none';
      if (successIcon) successIcon.style.display = 'block';
      if (summary) {
        summary.innerHTML = `
          Drive 업로드 파일: ${uploadResult.uploadedCount}개<br>
          User Studio Data: ${uploadResult.spreadsheetUpdated ? '스프레드시트 반영 완료' : 'CSV 백업 업로드 완료'}<br>
          오늘의 가이드 등록 완료
        `;
        summary.style.display = 'block';
      }
      if (actions) actions.style.display = 'none';

      window.TravelogApp.addPoints(150);
      window.TravelogApp.showToast(t(`가이드 [${pendingPublishPackage.tourName}] 출간 완료!`, `Guide [${pendingPublishPackage.tourName}] published!`, `ガイド［${pendingPublishPackage.tourName}］を公開しました！`));

      setTimeout(() => {
        closePublishModal();
        moveToHomeTab();
      }, 1500);
    } catch (error) {
      console.error('[Travelog Publish] Drive upload failed:', error);
      closePublishModal();
      if (error && error.message === 'GOOGLE_DRIVE_TOKEN_REQUIRED') {
        window.open(DRIVE_PARENT_FOLDER_URL, '_blank');
        alert(t('Google Drive 업로드 토큰이 없어 자동 업로드를 중단했습니다. 저장된 Travelog_user_data 파일을 열린 Drive 폴더에 직접 올릴 수 있습니다.', 'No Google Drive token was provided. You can manually upload Travelog_user_data to the opened Drive folder.', 'Google Driveトークンがないため自動アップロードを中断しました。'));
        return;
      }
      if (String(error.message || '').includes('401')) {
        clearGoogleDriveAccessToken();
        alert(t('Google Drive 토큰이 만료되었거나 권한이 없습니다. 새 토큰으로 다시 시도해 주세요.', 'The Google Drive token expired or lacks permission. Try again with a new token.', 'Google Driveトークンが期限切れ、または権限不足です。'));
        return;
      }
      alert(t('Google Drive 출간 중 오류가 발생했습니다. 폴더 권한, 토큰 권한, 네트워크를 확인해 주세요.', 'Google Drive publishing failed. Check folder access, token scopes, and network.', 'Google Drive公開中にエラーが発生しました。'));
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

  function updatePublishPanelCounts() {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const pinsCountEl = document.getElementById('publish-pins-count');
    const audiosCountEl = document.getElementById('publish-audios-count');
    const videosCountEl = document.getElementById('publish-videos-count');

    const linkedAudiosCount = recordedAudios.filter(a => a.stopIndex !== -1).length;
    const linkedVideosCount = recordedVideos.filter(v => v.stopIndex !== -1).length;

    if (pinsCountEl) pinsCountEl.textContent = `${customPins.length}개`;
    if (audiosCountEl) audiosCountEl.textContent = `${linkedAudiosCount}개 (총 ${recordedAudios.length}개)`;
    if (videosCountEl) videosCountEl.textContent = `${linkedVideosCount}개 (총 ${recordedVideos.length}개)`;

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

    recordedAudios.push({
      id: Date.now(),
      name: filename,
      blob: voiceMemoBlob || new Blob(['Travelog default simulated audio'], { type: 'text/plain' }),
      stopIndex: newStopIdx
    });

    window.TravelogApp.showToast(t("유저 폰의 생성 폴더 'Travelog/Audio/'에 음성 가이드가 가상 저장되었습니다!", "Voice memo successfully saved in 'Travelog/Audio/' folder!", 'ユーザー端末の「Travelog/Audio/」に保存されました！'));

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

    recordedVideos.push({
      id: Date.now(),
      name: filename,
      blob: videoMemoBlob || new Blob(['Travelog default simulated video'], { type: 'text/plain' }),
      stopIndex: newStopIdx
    });

    window.TravelogApp.showToast(t("유저 폰의 생성 폴더 'Travelog/Video/'에 영상 가이드가 가상 저장되었습니다!", "Video guide successfully saved in 'Travelog/Video/' folder!", 'ユーザー端末の「Travelog/Video/」に保存されました！'));

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

    window.TravelogApp.showToast(t("유저 폰의 생성 폴더 'Travelog/Memo/'에 가이드 대본이 저장되었습니다!", "Text script successfully saved in 'Travelog/Memo/' folder!", 'ユーザー端末の「Travelog/Memo/」に保存されました！'));

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
    deleteAudio: deleteAudio,
    deleteVideo: deleteVideo,
    renderCoordinatesList: renderCoordinatesList,
    getMediaCounts: () => {
      return {
        audios: recordedAudios.length,
        videos: recordedVideos.length
      };
    }
  };
})();

// Attach globally
window.TravelogCreatorModule = TravelogCreatorModule;
