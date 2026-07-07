// ==========================================
// Travelog Adventure (Outdoor Detective Game) Module
// ==========================================

const TravelogAdventureModule = (() => {
  let currentStepIndex = 0;
  
  // Quest Step Configurations
  const questSteps = [
    {
      id: 'step-1',
      titleEn: "The Stone Bridge Guardians",
      titleKo: "영제교의 상상속 수호신",
      targetLat: 37.5772,
      targetLng: 126.9768,
      riddleEn: "What mythical hornless dragon guards the stone bridge canal? (Hint: haetae)",
      riddleKo: "영제교 다리 아래에서 천하의 물길을 지키는 상상의 동물 이름은? (힌트: 해태)",
      answers: ["해태", "haetae", "천록", "cheonrok"],
      status: 'active' // 'active', 'completed', 'locked'
    },
    {
      id: 'step-2',
      titleEn: "Main Throne Court Rank Stones",
      titleKo: "근정전 조정 품계석의 비밀",
      targetLat: 37.5786,
      targetLng: 126.9772,
      riddleEn: "How many total rank stone pillars stand in the courtyard? (Answer in numbers: e.g., 18)",
      riddleKo: "근정전 앞뜰 품계석의 개수는 총 몇 개일까요? (숫자로 입력: 예, 18)",
      answers: ["18", "십팔", "열여덟"],
      status: 'locked'
    },
    {
      id: 'step-3',
      titleEn: "Gyeonghoeru Floating Columns",
      titleKo: "경회루 누각을 받치는 기둥",
      targetLat: 37.5798,
      targetLng: 126.9760,
      riddleEn: "How many total stone columns support the floor of Gyeonghoeru? (Answer in numbers: e.g., 48)",
      riddleKo: "연못 위에 둥둥 떠 있는 경회루 누각을 떠받치는 돌기둥의 총 개수는? (숫자로 입력: 예, 48)",
      answers: ["48", "마흔여덟", "마흔여덟개"],
      status: 'locked'
    }
  ];

  function init() {
    renderQuestSteps();
    
    // Bind solve & teleport actions
    document.getElementById('solve-puzzle-btn').addEventListener('click', solvePuzzle);
    document.getElementById('sim-teleport-clue-btn').addEventListener('click', teleportToActiveClue);

    // Run first distance check
    updateDistanceToClue(37.5750, 126.9768);
  }

  function renderQuestSteps() {
    const listEl = document.getElementById('quest-steps-list');
    listEl.innerHTML = '';
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    questSteps.forEach((step, index) => {
      const item = document.createElement('div');
      item.className = `quest-step-item glass-panel ${step.status}`;
      
      const title = lang === 'ko' ? step.titleKo : step.titleEn;
      let statusIcon = '<i class="fa-solid fa-lock"></i>';
      let statusDesc = lang === 'ko' ? '잠김' : 'Locked';

      if (step.status === 'active') {
        statusIcon = '<i class="fa-solid fa-location-arrow fa-fade"></i>';
        statusDesc = lang === 'ko' ? '진행 중 (위치 탐색)' : 'Active (Navigate)';
      } else if (step.status === 'completed') {
        statusIcon = '<i class="fa-solid fa-circle-check"></i>';
        statusDesc = lang === 'ko' ? '완료됨' : 'Completed';
      }

      item.innerHTML = `
        <div class="step-num">${index + 1}</div>
        <div style="flex:1;">
          <h4 style="font-size:14px; font-weight:600;">${title}</h4>
          <span style="font-size:11px; color:var(--text-muted); display:block; margin-top:2px;">${statusDesc}</span>
        </div>
        <div style="font-size:14px; color:var(--accent-blue);">${statusIcon}</div>
      `;
      listEl.appendChild(item);
    });
  }

  // ==========================================
  // GPS Radar Distance calculations
  // ==========================================
  function updateDistanceToClue(userLat, userLng) {
    if (currentStepIndex >= questSteps.length) {
      document.getElementById('radar-distance-value').textContent = "Clear";
      document.getElementById('clue-locked-box').style.display = 'none';
      document.getElementById('clue-unlock-box').style.display = 'none';
      return;
    }

    const currentStep = questSteps[currentStepIndex];
    
    // Use distance helper from map module or fallback
    let distance = 999;
    if (window.TravelogMapModule) {
      distance = window.TravelogMapModule.getDistanceInMeters(
        userLat, userLng, 
        currentStep.targetLat, currentStep.targetLng
      );
    }

    const radarVal = document.getElementById('radar-distance-value');
    radarVal.textContent = `${Math.round(distance)}m`;

    const unlockBox = document.getElementById('clue-unlock-box');
    const lockedBox = document.getElementById('clue-locked-box');
    const clueText = document.getElementById('clue-text-display');
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    // If within 15 meters, unlock the riddle console
    if (distance <= 15) {
      unlockBox.style.display = 'block';
      lockedBox.style.display = 'none';
      clueText.textContent = lang === 'ko' ? currentStep.riddleKo : currentStep.riddleEn;
    } else {
      unlockBox.style.display = 'none';
      lockedBox.style.display = 'block';
    }
  }

  function teleportToActiveClue() {
    if (currentStepIndex >= questSteps.length) return;
    const currentStep = questSteps[currentStepIndex];
    
    if (window.TravelogMapModule) {
      // Teleport user pin directly to the clue target
      window.TravelogMapModule.teleportUser(currentStep.targetLat, currentStep.targetLng);
      window.TravelogApp.showToast(window.TravelogApp.getLanguage() === 'ko' ? '단서 장소로 이동하였습니다!' : 'Teleported to clue site!');
    }
  }

  // ==========================================
  // Riddle Validator
  // ==========================================
  function solvePuzzle() {
    if (currentStepIndex >= questSteps.length) return;

    const currentStep = questSteps[currentStepIndex];
    const solutionInput = document.getElementById('puzzle-solution-input');
    const userAnswer = solutionInput.value.trim().toLowerCase();
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    const isCorrect = currentStep.answers.some(ans => userAnswer.includes(ans.toLowerCase()));

    if (isCorrect) {
      // Mark step completed
      currentStep.status = 'completed';
      window.TravelogApp.addPoints(150);
      
      currentStepIndex++;
      
      // Clear input
      solutionInput.value = '';

      if (currentStepIndex < questSteps.length) {
        // Unlock next step
        questSteps[currentStepIndex].status = 'active';
        window.TravelogApp.showToast(lang === 'ko' ? '정답입니다! +150 포인트 획득. 다음 단서로 이동하세요!' : 'Correct! +150 pts. Move to next clue!');
        
        // Relocate radar target
        const userLoc = window.TravelogMapModule ? window.TravelogMapModule.getUserLocation() : { lat: 37.5750, lng: 126.9768 };
        updateDistanceToClue(userLoc.lat, userLoc.lng);
      } else {
        // Grand Final Victory
        triggerGrandVictory();
      }
      
      renderQuestSteps();
    } else {
      window.TravelogApp.showToast(lang === 'ko' ? '틀렸습니다! 주변을 다시 둘러보고 입력해 보세요.' : 'Wrong answer! Look around and try again.');
    }
  }

  function triggerGrandVictory() {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    
    // Add Grand Prize
    window.TravelogApp.addPoints(300);
    window.TravelogApp.claimCoupon({
      id: 'quest-treasure-coupon',
      tag: 'GRAND MYSTERY',
      value: 'ALL-PASS FREE',
      desc: lang === 'ko' ? '경복궁 왕실 문화관 무료 종일 입장권' : 'Gyeongbokgung Royal Palace Culture Center Full-day Pass'
    });

    const victoryModal = document.createElement('div');
    victoryModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.9);
      z-index: 200000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const titleText = lang === 'ko' ? '경복궁 역사 탐정단 완주!' : 'Seoul Palaces Mystery Cleared!';
    const bodyText = lang === 'ko' ? '모든 단서를 해독하고 경복궁 밑에 잠든 역사의 비밀을 풀었습니다! 궁궐의 기운을 받아 새로운 혜택을 획득하였습니다.' : 'You have deciphered all clues and unlocked the lost royal secrets of Gyeongbokgung! You earned royal treasures.';
    const prizeText = lang === 'ko' ? '최종 보상: +300 포인트 & 궁궐 올패스 프리 쿠폰' : 'Final Reward: +300 pts & Royal All-Pass Free Coupon';
    const closeBtnText = lang === 'ko' ? '보상 지갑으로 가기' : 'View Coupon Wallet';

    victoryModal.innerHTML = `
      <div class="glass-panel" style="padding: 40px; text-align: center; max-width: 440px; width: 90%; background-image: radial-gradient(circle at 10% 20%, rgb(91, 28, 120) 0%, rgb(40, 10, 80) 90%); border: 2px solid var(--accent-pink); box-shadow: var(--shadow-neon-pink);">
        <i class="fa-solid fa-trophy" style="font-size: 64px; color: var(--accent-orange); margin-bottom: 24px; animation: pulse-pin 1.5s infinite;"></i>
        <h2 style="font-size: 24px; margin-bottom: 12px; font-weight:800; color:white;">${titleText}</h2>
        <p style="font-size: 14px; color: var(--text-secondary); line-height:1.6; margin-bottom: 20px;">${bodyText}</p>
        <div style="background: rgba(255,255,255,0.05); border: 1px dashed var(--accent-blue); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 24px; font-weight:700; color:var(--accent-blue); font-size:14px;">
          ${prizeText}
        </div>
        <button class="btn-rect" style="width: 100%; justify-content:center; background: var(--grad-pink-purple);" onclick="this.parentElement.parentElement.remove(); document.querySelector('.nav-item[data-tab=\\'rewards-tab\\']').click();">
          ${closeBtnText}
        </button>
      </div>
    `;
    
    document.body.appendChild(victoryModal);
  }

  return {
    init: init,
    onLanguageChange: () => {
      renderQuestSteps();
      
      // Update puzzle card questions if unlocked
      const lang = window.TravelogApp.getLanguage();
      if (currentStepIndex < questSteps.length) {
        const currentStep = questSteps[currentStepIndex];
        const clueText = document.getElementById('clue-text-display');
        clueText.textContent = lang === 'ko' ? currentStep.riddleKo : currentStep.riddleEn;
      }
    },
    updateDistanceToClue: updateDistanceToClue,
    teleportToActiveClue: teleportToActiveClue,
    solvePuzzle: solvePuzzle
  };
})();

// Attach globally
window.TravelogAdventureModule = TravelogAdventureModule;
