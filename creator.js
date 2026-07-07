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

  // Voice Market items
  const voiceMarketItems = [
    {
      id: 'voice-minho',
      nameEn: "Minho (Seoul Local)",
      nameKo: "민호 (서울 토박이)",
      nameJa: "ミンホ（ソウル地元ガイド）",
      typeEn: "Friendly & Historic",
      typeKo: "친근한 역사 가이드",
      typeJa: "親しみやすい歴史ガイド",
      cost: 0,
      owned: true,
      avatar: "M",
      audioName: "minho_intro"
    },
    {
      id: 'voice-watson',
      nameEn: "Detective Watson",
      nameKo: "셜록 왓슨",
      nameJa: "探偵ワトソン",
      typeEn: "Mysterious & Clever",
      typeKo: "미스터리 추리 성우",
      typeJa: "ミステリー推理ボイス",
      cost: 150,
      owned: false,
      avatar: "W",
      audioName: "watson_riddle"
    },
    {
      id: 'voice-chloe',
      nameEn: "Excited Chloe",
      nameKo: "발랄한 클로이",
      nameJa: "元気なクロエ",
      typeEn: "Energetic & Foodie",
      typeKo: "에너제틱 맛집 가이드",
      typeJa: "元気なグルメガイド",
      cost: 200,
      owned: false,
      avatar: "C",
      audioName: "chloe_food"
    }
  ];

  function init() {
    renderCoordinatesList();
    renderVoiceMarket();

    // Bind Planner actions
    document.getElementById('clear-pins-btn').addEventListener('click', clearPins);
    document.getElementById('save-tour-btn').addEventListener('click', saveTour);

    // Recording actions
    document.getElementById('record-audio-btn').addEventListener('click', toggleRecording);

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
    // Redraw map Baseline
    if (window.TravelogMapModule) {
      window.TravelogMapModule.clearCreatorPins();
      customPins.forEach(p => {
        // Redraw remaining pins
        // In this mockup, clearing maps redraws baseline. Custom pins redraw by creator.js coordination
      });
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
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const tourName = document.getElementById('new-tour-name').value;

    if (customPins.length === 0) {
      window.TravelogApp.showToast(t('지도 탭에서 핀을 1개 이상 등록해 주세요!', 'Please place at least one pin on the Map tab first!', 'まず地図タブでピンを1つ以上登録してください！'));
      return;
    }

    // Award rewards
    window.TravelogApp.addPoints(150);
    window.TravelogApp.showToast(t(`가이드 [${tourName}] 등록 성공! 크리에이터 보상 +150포인트!`, `Tour guide [${tourName}] published successfully! Creator reward +150 pts!`, `ガイド［${tourName}］を公開しました！クリエイター報酬 +150ポイント！`));
    
    // Reset pins
    clearPins();
  }

  // ==========================================
  // Audio Recorder Simulation
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
    statusText.textContent = t('녹음 처리 중입니다. GitHub 저장소 업로드를 준비합니다...', 'Processing recording and preparing GitHub upload...', '録音を処理し、GitHub保存の準備をしています...');

    if (recordingMode === 'real' && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else {
      handleRecordedAudioReady();
    }

    setTimeout(() => {
      timerText.textContent = "00:00";
      statusText.textContent = t('마이크 버튼을 클릭하여 녹음 시작', 'Click Mic to Start Recording', 'マイクをクリックして録音開始');
    }, 5000);
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

    const metadata = {
      title: selectedScriptText || 'Travelog guide audio',
      durationSeconds: recordSeconds,
      source: recordingMode,
      extension: finalExtension,
      mimeType: audioBlob.type,
      createdAt: new Date().toISOString(),
      guideName: document.getElementById('new-tour-name')?.value || ''
    };

    window.TravelogApp.showToast(t('오디오 녹음본이 생성되었습니다.', 'Audio clip saved successfully.', '音声クリップを保存しました。'));
    statusText.textContent = t('녹음 완료! GitHub 저장소로 업로드를 시도합니다.', 'Recording complete! Trying to upload to GitHub storage.', '録音完了！GitHub保存先へアップロードします。');

    if (window.TravelogMediaStorageModule && typeof window.TravelogMediaStorageModule.autoUploadAudio === 'function') {
      try {
        await window.TravelogMediaStorageModule.autoUploadAudio(audioBlob, metadata);
      } catch (error) {
        console.warn('Automatic GitHub audio upload failed.', error);
      }
    }
  }

  // ==========================================
  // Voice Market Store
  // ==========================================
  function renderVoiceMarket() {
    const container = document.getElementById('voice-market-container');
    container.innerHTML = '';

    voiceMarketItems.forEach((voice, index) => {
      const card = document.createElement('div');
      card.className = 'voice-card glass-panel';
      
      const name = pick(voice, 'name');
      const type = pick(voice, 'type');
      const buyText = voice.owned ? t('보유함', 'Owned', '所有中') : `${voice.cost} pts`;
      const btnClass = voice.owned ? 'owned' : '';

      card.innerHTML = `
        <div class="voice-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="voice-avatar">${voice.avatar}</div>
            <div class="voice-details">
              <h4>${name}</h4>
              <span>${type}</span>
            </div>
          </div>
          <div class="voice-player" onclick="TravelogCreatorModule.previewVoice(${index})">
            <i class="fa-solid fa-volume-high"></i>
            <span>${t('미리듣기', 'Listen', '試聴')}</span>
          </div>
        </div>
        
        <button class="voice-buy-btn ${btnClass}" onclick="TravelogCreatorModule.buyVoice(${index})">
          <i class="fa-solid fa-coins"></i>
          <span>${buyText}</span>
        </button>
      `;
      container.appendChild(card);
    });
  }

  function previewVoice(index) {
    const voice = voiceMarketItems[index];
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    
    // Trigger simulated text-to-speech warning
    const ttsTexts = {
      'voice-minho': {
        ko: "반갑습니다! 오늘 저와 함께 서울 종로 한바퀴 어떠신가요?",
        en: "Welcome! Ready to walk around Jongno, Seoul with me today?",
        ja: "こんにちは！今日は私と一緒にソウル鍾路を歩いてみませんか？"
      },
      'voice-watson': {
        ko: "단서는 바로 당신 발밑에 있군요. 침착하게 암호를 대어 보시죠.",
        en: "The clue is right beneath your feet. Stay calm and solve the riddle.",
        ja: "手がかりはあなたの足元にあります。落ち着いて謎を解いてみましょう。"
      },
      'voice-chloe': {
        ko: "와 대박! 여기 맛집은 진짜 꼭 먹어봐야 해요! 바로 입장해볼까요?!",
        en: "Oh my gosh! This cafe is absolutely incredible! Shall we check it out?!",
        ja: "わあ、すごい！ここは絶対に食べてみるべきお店です！入ってみましょうか？"
      }
    };

    const textToSpeak = ttsTexts[voice.id][window.TravelogApp.getLanguage()] || ttsTexts[voice.id].en;
    window.TravelogApp.showToast(`[${voice.nameEn} TTS] "${textToSpeak}"`);
  }

  function buyVoice(index) {
    const voice = voiceMarketItems[index];

    if (voice.owned) return;

    // Deduct points
    if (window.TravelogApp.deductPoints(voice.cost)) {
      voice.owned = true;
      renderVoiceMarket();
      window.TravelogApp.showToast(t(`[${voice.nameKo}] 보이스 팩을 구매하였습니다!`, `Purchased [${voice.nameEn}] voice pack!`, `［${voice.nameJa}］ボイスパックを購入しました！`));
    }
  }

  return {
    init: init,
    onLanguageChange: () => {
      renderCoordinatesList();
      renderVoiceMarket();
    },
    removeCoordinate: removeCoordinate,
    previewVoice: previewVoice,
    buyVoice: buyVoice,
    renderCoordinatesList: renderCoordinatesList
  };
})();

// Attach globally
window.TravelogCreatorModule = TravelogCreatorModule;
