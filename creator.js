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

  // Voice recording state
  let isRecording = false;
  let recordInterval = null;
  let recordSeconds = 0;
  let mediaRecorder = null;
  let recordedAudioChunks = [];
  let recordingStream = null;
  let selectedScriptText = '';
  let currentRecordingMimeType = '';
  let recordingMode = 'simulated';

  // Audio list storage
  let recordedAudios = [];

  // Video recording state & list storage
  let isVideoRecording = false;
  let videoRecordInterval = null;
  let videoRecordSeconds = 0;
  let videoMediaRecorder = null;
  let recordedVideoChunks = [];
  let videoStream = null;
  let recordedVideos = [];

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
        const text = btn.getAttribute('data-script');
        selectedScriptText = btn.textContent.trim();
        
        // Feed text into simulator
        window.TravelogApp.showToast(t('스크립트 템플릿 로드 완료', 'Script template loaded', 'スクリプトテンプレートを読み込みました'));
        
        // Change recording label to guide user
        const statusText = document.getElementById('record-status-text');
        statusText.textContent = t(`읽어주세요: ${btn.textContent}`, `Read aloud: ${btn.textContent}`, `読み上げてください：${btn.textContent}`);
      });
    });
  }

  // ==========================================
  // Custom Map Pins Planner
  // ==========================================
  function renderCoordinatesList() {
    const listEl = document.getElementById('creator-coordinates-list');
    const noPinsMsg = document.getElementById('no-pins-msg');
    
    // Clear custom items
    const rows = listEl.querySelectorAll('.coordinate-row');
    rows.forEach(r => r.remove());

    const customPins = window.TravelogApp.getState().customCreatedPins;

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
      
      row.innerHTML = `
        <span style="font-weight:700; color:var(--accent-blue);">${index + 1}</span>
        <div style="flex:1;">
          <div style="font-weight:600; font-size:13px;">${pick(pin, 'name')}</div>
          <div style="font-size:11px; color:var(--text-muted);">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
        </div>
        <input type="text" placeholder="${t('설명 입력...', 'Audio script...', '説明を入力...')}" style="width:120px; font-size:11px; padding:4px; border-radius:4px; background:var(--bg-tertiary); border:1px solid var(--glass-border); color:white;">
        <button class="btn-circle" style="width:24px; height:24px; font-size:11px; background:rgba(255,50,50,0.1); border-color:rgba(255,50,50,0.2); color:var(--accent-pink);" onclick="TravelogCreatorModule.removeCoordinate(${index})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;
      listEl.appendChild(row);
    });

    updatePublishPanelCounts();
    refreshMediaPinSelectors();
  }

  function removeCoordinate(index) {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    customPins.splice(index, 1);
    
    // Remap titles
    customPins.forEach((pin, idx) => {
      pin.nameEn = `Custom Pin #${idx + 1}`;
      pin.nameKo = `커스텀 핀 #${idx + 1}`;
      pin.nameJa = `カスタムピン #${idx + 1}`;
    });

    renderCoordinatesList();
  }

  function clearPins() {
    if (window.TravelogMapModule) {
      window.TravelogMapModule.clearCreatorPins();
    }
    renderCoordinatesList();
    window.TravelogApp.showToast(t('등록된 핀들이 초기화되었습니다.', 'All custom pins reset.', '登録されたピンをリセットしました。'));
  }

  function saveTour() {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const tourName = document.getElementById('new-tour-name').value;

    if (customPins.length === 0) {
      window.TravelogApp.showToast(t('지도 탭에서 핀을 1개 이상 등록해 주세요!', 'Please place at least one pin on the Map tab first!', 'まず地図タブでピンを1つ以上登録してください！'));
      return;
    }

    // 출간 재확인 팝업
    const confirmPublish = window.confirm(t('정말 출간 하시겠습니까?', 'Are you sure you want to publish?', '本当に公開しますか？'));
    if (!confirmPublish) return;

    // 로딩 모달 띄우기
    const loadingModal = document.getElementById('publish-loading-modal');
    const statusTitle = document.getElementById('publish-status-title');
    const statusDesc = document.getElementById('publish-status-desc');
    const spinner = document.getElementById('publish-loading-spinner');
    const successIcon = document.getElementById('publish-success-icon');

    if (loadingModal) {
      statusTitle.textContent = t('출간중입니다...', 'Publishing guide...', '公開中...');
      statusDesc.textContent = t('제작한 가이드 설정과 녹음 음성 및 비디오 데이터를 준비 중입니다.', 'Preparing guide configurations and recorded media assets.', '作成したガイド設定と録音・動画データを準備しています。');
      spinner.style.display = 'block';
      successIcon.style.display = 'none';
      loadingModal.classList.add('active');
    }

    // 2초 로딩 시뮬레이션
    setTimeout(() => {
      // 1) 가이드 설정 JSON 다운로드
      downloadCurrentGuideData();

      // 2) 녹음된 음성 파일들 다운로드
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

      // 3) 녹화된 비디오 파일들 다운로드
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

      // 출간 성공 상태로 모달 업데이트
      if (loadingModal) {
        statusTitle.textContent = t('축하합니다. 출간 되었습니다', 'Congratulations. Published successfully', 'おめでとうございます。公開されました');
        statusDesc.textContent = t('가이드 데이터가 공유 폴더 연동 파일로 정상 빌드되었습니다.', 'Guide data files built and ready for cloud sync.', 'ガイドデータが正常にビルド되었습니다.');
        spinner.style.display = 'none';
        successIcon.style.display = 'block';
      }

      // 2초 대기 후 팝업 닫고 마무리
      setTimeout(() => {
        if (loadingModal) {
          loadingModal.classList.remove('active');
        }

        // Open Google Drive Folder
        window.open('https://drive.google.com/drive/folders/15zekqgQLbqiUasOg7wUNO8MIIvo5ROY-?usp=sharing', '_blank');

        // Award rewards
        window.TravelogApp.addPoints(150);
        window.TravelogApp.showToast(t(`가이드 [${tourName}] 출간 완료! 크리에이터 보상 +150포인트!`, `Tour guide [${tourName}] published successfully! Creator reward +150 pts!`, `ガイド［${tourName}］を公開しました！クリエイター報酬 +150ポイント！`));

        // Reset all states
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

        // Collect media mapped to this specific stop index
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
      statusText.textContent = t('마이크 버튼을 클릭하여 녹음 시작', 'Click Mic to Start Recording', 'マイクをクリックして録音開始');
    }, 3000);
  }

  async function handleRecordedAudioReady() {
    const statusText = document.getElementById('record-status-text');
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

    // Add to recordedAudios list
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

      // Bind select change
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
    statusText.textContent = t('가이드 영상을 녹화 중입니다...', 'Recording video guide...', 'ビデオガイドを録画中です...');

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

      // Bind select change
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
      <select style="background: var(--bg-tertiary); border: 1px solid var(--glass-border); color: white; padding: 4px; border-radius: 4px; font-size: 11px; outline: none; cursor: pointer;">
        ${optionsHtml}
      </select>
    `;
  }

  function refreshMediaPinSelectors() {
    // Refresh all select boxes inside audio and video lists without re-rendering everything
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

    // Re-bind listeners after outerHTML replacement
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

  return {
    init: init,
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
