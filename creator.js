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
    document.getElementById('clear-pins-btn').addEventListener('click', clearPins);
    document.getElementById('save-tour-btn').addEventListener('click', saveTour);

    // Bind Final Publish Action
    const finalPublishBtn = document.getElementById('publish-final-tour-btn');
    if (finalPublishBtn) {
      finalPublishBtn.addEventListener('click', saveTour);
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
  function renderCoordinatesList() {
    const listEl = document.getElementById('creator-coordinates-list');
    const noPinsMsg = document.getElementById('no-pins-msg');
    
    const rows = listEl.querySelectorAll('.coordinate-row');
    rows.forEach(r => r.remove());

    // Sort by creation time (ascending)
    const customPins = [...window.TravelogApp.getState().customCreatedPins];
    customPins.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (customPins.length === 0) {
      noPinsMsg.style.display = 'block';
      return;
    }

    noPinsMsg.style.display = 'none';

    customPins.forEach((pin, index) => {
      const row = document.createElement('div');
      row.className = 'coordinate-row';
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding: 8px;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
      `;
      
      let timeStr = '';
      if (pin.createdAt) {
        const d = new Date(pin.createdAt);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const sec = String(d.getSeconds()).padStart(2, '0');
        timeStr = `${month}/${date} ${hour}:${min}:${sec}`;
      }

      row.innerHTML = `
        <span class="pin-number-label" style="font-weight:700; color:${pin.color || '#ff2e63'};">${index + 1}</span>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pick(pin, 'name')}</div>
          <div style="font-size:10px; color:var(--text-muted);">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} <span style="margin-left:5px; color:#aaa;">(${timeStr})</span></div>
        </div>
        
        <!-- Color Select -->
        <select class="pin-color-picker" style="font-size:11px; padding:3px; border-radius:4px; background:#fff; border:1px solid #ccc; color:#373737 !important; cursor:pointer;">
          <option value="#ff2e63" style="color:#ff2e63;" ${pin.color === '#ff2e63' ? 'selected' : ''}>🔴 Pink</option>
          <option value="#00adb5" style="color:#00adb5;" ${pin.color === '#00adb5' ? 'selected' : ''}>🔵 Blue</option>
          <option value="#34a853" style="color:#34a853;" ${pin.color === '#34a853' ? 'selected' : ''}>🟢 Green</option>
          <option value="#ffb703" style="color:#ffb703;" ${pin.color === '#ffb703' ? 'selected' : ''}>🟡 Gold</option>
          <option value="#8b5cf6" style="color:#8b5cf6;" ${pin.color === '#8b5cf6' ? 'selected' : ''}>🟣 Purple</option>
        </select>

        <input type="text" class="pin-description-input" value="${escapeHtml(pin.description || '')}" placeholder="${t('설명 입력...', 'Audio script...', '説明を入力...')}" style="width:120px; font-size:11px; padding:4px; border-radius:4px; background:#f8fafc; border:1px solid rgba(0,0,0,0.15); color:#373737 !important;">
        
        <button class="btn-circle" style="width:24px; height:24px; font-size:11px; background:rgba(255,50,50,0.1); border-color:rgba(255,50,50,0.2); color:var(--accent-pink);" onclick="TravelogCreatorModule.removeCoordinate('${pin.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      // Color select listener
      const colorSelect = row.querySelector('.pin-color-picker');
      if (colorSelect) {
        colorSelect.addEventListener('change', (e) => {
          const newColor = e.target.value;
          if (window.TravelogMapModule && typeof window.TravelogMapModule.updateCreatorPinColor === 'function') {
            window.TravelogMapModule.updateCreatorPinColor(pin.id, newColor);
          }
          const numSpan = row.querySelector('.pin-number-label');
          if (numSpan) numSpan.style.color = newColor;
        });
      }

      // Description input listener
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

    updatePublishPanelCounts();
    refreshMediaPinSelectors();
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

  function saveTour() {
    const storageGranted = window.TravelogApp ? window.TravelogApp.getState().userProfile.storagePermissionGranted : false;
    if (!storageGranted) {
      alert(t('기기 내 저장 권한이 수락되지 않아 가이드 출간이 불가능합니다. 처음 프로필 설정에서 권한을 수락해 주세요!', 'Storage permission is required to publish guides. Please allow access in profile settings.', '機器内の保存権限が許可されていないため、ガイドを公開できません。'));
      return;
    }

    const customPins = window.TravelogApp.getState().customCreatedPins;
    const tourName = document.getElementById('new-tour-name').value;

    if (customPins.length === 0) {
      window.TravelogApp.showToast(t('지도 탭에서 핀을 1개 이상 등록해 주세요!', 'Please place at least one pin on the Map tab first!', 'まず地図タブでピンを1つ以上登録してください！'));
      return;
    }

    const confirmPublish = window.confirm(t('정말 출간 하시겠습니까?', 'Are you sure you want to publish?', '本当に公開しますか？'));
    if (!confirmPublish) return;

    const loadingModal = document.getElementById('publish-loading-modal');
    const statusTitle = document.getElementById('publish-status-title');
    const statusDesc = document.getElementById('publish-status-desc');
    const spinner = document.getElementById('publish-loading-spinner');
    const successIcon = document.getElementById('publish-success-icon');

    if (loadingModal) {
      statusTitle.textContent = t('출간중입니다...', 'Publishing guide...', '公開中...');
      statusDesc.textContent = t('제작한 가이드 설정과 녹음 음성 및 비디오 데이터를 준비 중입니다.', 'Preparing guide configurations and recorded media assets.', '作成したガイド設定と録음・動画データを準備しています。');
      spinner.style.display = 'block';
      successIcon.style.display = 'none';
      loadingModal.classList.add('active');
    }

    setTimeout(() => {
      downloadCurrentGuideData();

      recordedAudios.forEach(audio => {
        const url = URL.createObjectURL(audio.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = audio.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      recordedVideos.forEach(video => {
        const url = URL.createObjectURL(video.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = video.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      if (loadingModal) {
        statusTitle.textContent = t('축하합니다. 출간 되었습니다', 'Congratulations. Published successfully', 'おめでとうございます。公開されました');
        statusDesc.textContent = t('가이드 데이터가 공유 폴더 연동 파일로 정상 빌드되었습니다.', 'Guide data files built and ready for cloud sync.', 'ガイドデータが正常にビルドされました。');
        spinner.style.display = 'none';
        successIcon.style.display = 'block';
      }

      setTimeout(() => {
        if (loadingModal) {
          loadingModal.classList.remove('active');
        }

        window.open('https://drive.google.com/drive/folders/15zekqgQLbqiUasOg7wUNO8MIIvo5ROY-?usp=sharing', '_blank');

        window.TravelogApp.addPoints(150);
        window.TravelogApp.showToast(t(`가이드 [${tourName}] 출간 완료! 크리에이터 보상 +150포인트!`, `Tour guide [${tourName}] published successfully! Creator reward +150 pts!`, `ガイド［${tourName}］を公開しました！クリエイター報酬 +150ポイント！`));

        recordedAudios = [];
        recordedVideos = [];
        clearPins();
        
        renderAudioList();
        renderVideoList();
        updatePublishPanelCounts();
      }, 2000);

    }, 2000);
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
    onLanguageChange: () => {
      renderCoordinatesList();
      renderAudioList();
      renderVideoList();
      updatePublishPanelCounts();
    },
    removeCoordinate: removeCoordinate,
    deleteAudio: deleteAudio,
    deleteVideo: deleteVideo,
    renderCoordinatesList: renderCoordinatesList
  };
})();

// Attach globally
window.TravelogCreatorModule = TravelogCreatorModule;
