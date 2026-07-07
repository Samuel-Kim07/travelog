// ==========================================
// Travelog Creator Studio Module
// ==========================================

const TravelogCreatorModule = (() => {
  // Voice recording state
  let isRecording = false;
  let recordInterval = null;
  let recordSeconds = 0;

  // Voice Market items
  const voiceMarketItems = [
    {
      id: 'voice-minho',
      nameEn: "Minho (Seoul Local)",
      nameKo: "민호 (서울 토박이)",
      typeEn: "Friendly & Historic",
      typeKo: "친근한 역사 가이드",
      cost: 0,
      owned: true,
      avatar: "M",
      audioName: "minho_intro"
    },
    {
      id: 'voice-watson',
      nameEn: "Detective Watson",
      nameKo: "셜록 왓슨",
      typeEn: "Mysterious & Clever",
      typeKo: "미스터리 추리 성우",
      cost: 150,
      owned: false,
      avatar: "W",
      audioName: "watson_riddle"
    },
    {
      id: 'voice-chloe',
      nameEn: "Excited Chloe",
      nameKo: "발랄한 클로이",
      typeEn: "Energetic & Foodie",
      typeKo: "에너제틱 맛집 가이드",
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
        const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
        
        // Feed text into simulator
        window.TravelogApp.showToast(lang === 'ko' ? `스크립트 템플릿 로드 완료` : `Script template loaded`);
        
        // Change recording label to guide user
        const statusText = document.getElementById('record-status-text');
        statusText.textContent = lang === 'ko' ? `읽어주세요: ${btn.textContent}` : `Read aloud: ${btn.textContent}`;
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
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

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
          <div style="font-weight:600; font-size:13px;">${lang === 'ko' ? pin.nameKo : pin.nameEn}</div>
          <div style="font-size:11px; color:var(--text-muted);">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
        </div>
        <input type="text" placeholder="${lang === 'ko' ? '설명 입력...' : 'Audio script...'}" style="width:120px; font-size:11px; padding:4px; border-radius:4px; background:var(--bg-tertiary); border:1px solid var(--glass-border); color:white;">
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
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    
    if (window.TravelogMapModule) {
      window.TravelogMapModule.clearCreatorPins();
    }
    renderCoordinatesList();
    
    window.TravelogApp.showToast(lang === 'ko' ? '등록된 핀들이 초기화되었습니다.' : 'All custom pins reset.');
  }

  function saveTour() {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const tourName = document.getElementById('new-tour-name').value;
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    if (customPins.length === 0) {
      window.TravelogApp.showToast(lang === 'ko' ? '지도 탭에서 핀을 1개 이상 등록해 주세요!' : 'Please place at least one pin on the Map tab first!');
      return;
    }

    // Award rewards
    window.TravelogApp.addPoints(150);
    window.TravelogApp.showToast(lang === 'ko' ? `가이드 [${tourName}] 등록 성공! 크리에이터 보상 +150포인트!` : `Tour guide [${tourName}] published successfully! Creator reward +150 pts!`);
    
    // Reset pins
    clearPins();
  }

  // ==========================================
  // Audio Recorder Simulation
  // ==========================================
  function toggleRecording() {
    const btn = document.getElementById('record-audio-btn');
    const statusText = document.getElementById('record-status-text');
    const timerText = document.getElementById('record-timer');
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    if (isRecording) {
      // Stop recording
      clearInterval(recordInterval);
      isRecording = false;
      btn.classList.remove('recording');
      btn.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
      
      statusText.textContent = lang === 'ko' ? `녹음 완료! 오디오 가이드가 핀 #1에 연결되었습니다.` : `Recording saved! Audio guide linked to Pin #1.`;
      window.TravelogApp.showToast(lang === 'ko' ? '오디오 녹음본이 생성되었습니다.' : 'Audio clip saved successfully.');
      
      // Reset timer
      setTimeout(() => {
        timerText.textContent = "00:00";
        statusText.textContent = lang === 'ko' ? '마이크 버튼을 클릭하여 녹음 시작' : 'Click Mic to Start Recording';
      }, 3000);

    } else {
      // Start recording
      isRecording = true;
      btn.classList.add('recording');
      btn.innerHTML = `<i class="fa-solid fa-square"></i>`;
      statusText.textContent = lang === 'ko' ? '음성 가이드를 녹음 중입니다... 말씀해 주세요.' : 'Recording audio guide... Speak now!';
      
      recordSeconds = 0;
      timerText.textContent = "00:00";

      recordInterval = setInterval(() => {
        recordSeconds++;
        const minutes = Math.floor(recordSeconds / 60);
        const secs = recordSeconds % 60;
        const displayMin = minutes < 10 ? `0${minutes}` : minutes;
        const displaySec = secs < 10 ? `0${secs}` : secs;
        timerText.textContent = `${displayMin}:${displaySec}`;
      }, 1000);
    }
  }

  // ==========================================
  // Voice Market Store
  // ==========================================
  function renderVoiceMarket() {
    const container = document.getElementById('voice-market-container');
    container.innerHTML = '';
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    voiceMarketItems.forEach((voice, index) => {
      const card = document.createElement('div');
      card.className = 'voice-card glass-panel';
      
      const name = lang === 'ko' ? voice.nameKo : voice.nameEn;
      const type = lang === 'ko' ? voice.typeKo : voice.typeEn;
      const buyText = voice.owned ? (lang === 'ko' ? '보유함' : 'Owned') : `${voice.cost} pts`;
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
            <span>${lang === 'ko' ? '미리듣기' : 'Listen'}</span>
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
        en: "Welcome! Ready to walk around Jongno, Seoul with me today?"
      },
      'voice-watson': {
        ko: "단서는 바로 당신 발밑에 있군요. 침착하게 암호를 대어 보시죠.",
        en: "The clue is right beneath your feet. Stay calm and solve the riddle."
      },
      'voice-chloe': {
        ko: "와 대박! 여기 맛집은 진짜 꼭 먹어봐야 해요! 바로 입장해볼까요?!",
        en: "Oh my gosh! This cafe is absolutely incredible! Shall we check it out?!"
      }
    };

    const textToSpeak = ttsTexts[voice.id][lang];
    window.TravelogApp.showToast(`[${voice.nameEn} TTS] "${textToSpeak}"`);
  }

  function buyVoice(index) {
    const voice = voiceMarketItems[index];
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    if (voice.owned) return;

    // Deduct points
    if (window.TravelogApp.deductPoints(voice.cost)) {
      voice.owned = true;
      renderVoiceMarket();
      window.TravelogApp.showToast(lang === 'ko' ? `[${voice.nameKo}] 보이스 팩을 구매하였습니다!` : `Purchased [${voice.nameEn}] voice pack!`);
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
