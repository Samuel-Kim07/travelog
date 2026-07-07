// ==========================================
// Travelog Rewards & Events Module
// ==========================================

const TravelogRewardsModule = (() => {
  // Scratch Card State
  let scratchCanvas, scratchCtx;
  let isScratching = false;
  let scratchPercent = 0;
  let scratchClaimed = false;
  let currentScratchPrize = null;

  // Spin Wheel State
  let wheelCanvas, wheelCtx;
  let isSpinning = false;
  let wheelRotation = 0;
  
  // Mock Scratch Card Prizes
  const scratchPrizes = [
    { id: 'sc-1', tag: 'SEOUL PALACES', value: '50% OFF', descEn: 'Traditional Hanok Dining Experience', descKo: '전통 한옥 한정식 맛집 50% 식사권' },
    { id: 'sc-2', tag: 'NAMSAN SECTOR', value: 'FREE PASS', descEn: 'Namsan N Seoul Tower Cable Car Ticket', descKo: '남산 N서울타워 왕복 케이블카 탑승권' },
    { id: 'sc-3', tag: 'CITY BUS TOUR', value: '30% OFF', descEn: 'Seoul Double-Decker Hop-On Hop-Off Bus', descKo: '서울 도심 순환 2층 버스 30% 할인권' },
    { id: 'sc-4', tag: 'LOCAL MARKET', value: '10,000 KRW', descEn: 'Gwangjang Market Food Alley Voucher', descKo: '광장시장 먹거리 골목 1만원 모바일 상품권' }
  ];

  // Spin Wheel Segments
  const wheelSegments = [
    { labelEn: "100 pts", labelKo: "100 P", type: "points", value: 100, color: "#70A2B7" },
    { labelEn: "Coffee", labelKo: "커피 쿠폰", type: "coupon", value: "Cafe Americano Coupon", color: "#AFD499" },
    { labelEn: "50 pts", labelKo: "50 P", type: "points", value: 50, color: "#F2E58A" },
    { labelEn: "Hotel 10%", labelKo: "호텔 10%", type: "coupon", value: "10% Hotel Stay Coupon", color: "#A8DFEC" },
    { labelEn: "200 pts", labelKo: "200 P", type: "points", value: 200, color: "#70A2B7" },
    { labelEn: "Free Guide", labelKo: "성우 가이드", type: "coupon", value: "Free Voice Guide Voucher", color: "#AFD499" },
    { labelEn: "10 pts", labelKo: "10 P", type: "points", value: 10, color: "#F2E58A" },
    { labelEn: "Jackpot!", labelKo: "대박 쿠폰!", type: "coupon", value: "Seoul Palaces Free All-Pass", color: "#A8DFEC" }
  ];

  // Mock Events Calendar Data
  const calendarEvents = [
    {
      id: 'event-gyeongbok',
      titleEn: "Gyeongbokgung Starlight Palace Tour",
      titleKo: "경복궁 별빛야행 야간 특별 관람",
      descEn: "Walk through illuminated chambers, eat royal food, and solve riddles inside the palace under the stars.",
      descKo: "은은한 불빛 아래 경복궁의 궁궐 전각들을 돌아보고, 외소주방에서 국악 공연과 왕실 수라상을 체험해보세요.",
      dateMonth: "MAY",
      dateDay: "28",
      locationEn: "Gyeongbokgung Palace, Seoul",
      locationKo: "서울 경복궁 일대",
      pointsReward: 300,
      activeQuest: true
    },
    {
      id: 'event-cherry',
      titleEn: "Kyoto Temple Walk & Stamp Quest",
      titleKo: "교토 철학의 길 밤벚꽃 스탬프 투어",
      descEn: "Find 5 hidden stamps along the stream to unlock special traditional tea coupons and voices.",
      descKo: "흐드러지게 핀 밤벚꽃 길을 산책하며 숨겨진 5개의 스탬프를 찍으면 특산 맛차 아이스크림 쿠폰을 증정합니다.",
      dateMonth: "JUN",
      dateDay: "05",
      locationEn: "Philosopher's Path, Kyoto",
      locationKo: "일본 교토 철학의 길",
      pointsReward: 250,
      activeQuest: false
    },
    {
      id: 'event-river',
      titleEn: "Seine Cruise Dinner Sparkle Hunt",
      titleKo: "파리 센강 바토무슈 불꽃 탐정 게임",
      descEn: "Solve offline riddles on the cruise boat at 9 PM to unlock coordinates for a hidden cafe voucher.",
      descKo: "매시 정각 에펠탑 불빛 쇼가 진행되는 동안 바토무슈에 탐승하여 암호를 맞추는 센강 추리 어드벤처.",
      dateMonth: "JUL",
      dateDay: "14",
      locationEn: "Bateaux Mouches Cruise, Paris",
      locationKo: "프랑스 파리 센강 크루즈",
      pointsReward: 500,
      activeQuest: false
    }
  ];

  function init() {
    // 1. Scratch card initialization
    scratchCanvas = document.getElementById('scratch-canvas');
    scratchCtx = scratchCanvas.getContext('2d');
    
    // Choose initial prize
    selectNewScratchPrize();

    // Event bindings for scratching
    scratchCanvas.addEventListener('mousedown', startScratch);
    scratchCanvas.addEventListener('mousemove', scratch);
    window.addEventListener('mouseup', stopScratch);

    scratchCanvas.addEventListener('touchstart', (e) => {
      startScratch(e.touches[0]);
    });
    scratchCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      scratch(e.touches[0]);
    });
    window.addEventListener('touchend', stopScratch);

    document.getElementById('reset-scratch-btn').addEventListener('click', buyNewScratchCard);

    // 2. Spin Wheel initialization
    wheelCanvas = document.getElementById('wheel-canvas');
    wheelCtx = wheelCanvas.getContext('2d');
    drawWheel();

    document.getElementById('spin-btn').addEventListener('click', spinWheel);

    // 3. Render initial list
    renderEvents();
    renderCouponWallet();
  }

  // ==========================================
  // Scratch Card Canvas Drawing & Math
  // ==========================================
  function selectNewScratchPrize() {
    const randomIndex = Math.floor(Math.random() * scratchPrizes.length);
    currentScratchPrize = scratchPrizes[randomIndex];

    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    
    document.getElementById('scratch-coupon-tag').textContent = currentScratchPrize.tag;
    document.getElementById('scratch-coupon-value').textContent = currentScratchPrize.value;
    document.getElementById('scratch-coupon-desc').textContent = lang === 'ko' ? currentScratchPrize.descKo : currentScratchPrize.descEn;
    
    resetScratchCanvas();
  }

  function resizeScratchCanvas() {
    if (!scratchCanvas) return;
    const rect = scratchCanvas.getBoundingClientRect();
    scratchCanvas.width = rect.width || 300;
    scratchCanvas.height = rect.height || 180;
    
    if (!scratchClaimed) {
      drawScratchOverlay();
    }
  }

  function resetScratchCanvas() {
    scratchClaimed = false;
    scratchPercent = 0;
    resizeScratchCanvas();
  }

  function drawScratchOverlay() {
    scratchCtx.fillStyle = '#CBEFF5'; // Warm pastel cloud sky blue
    scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    
    // Draw pattern details on pastel layer
    scratchCtx.fillStyle = '#70A2B7'; // Ocean blue micro dots!
    for (let x = 0; x < scratchCanvas.width; x += 12) {
      for (let y = 0; y < scratchCanvas.height; y += 12) {
        if ((x + y) % 24 === 0) {
          scratchCtx.beginPath();
          scratchCtx.arc(x, y, 2, 0, Math.PI * 2);
          scratchCtx.fill();
        }
      }
    }

    // Add Logo text to silver cover
    scratchCtx.font = 'bold 20px Outfit, Noto Sans KR';
    scratchCtx.fillStyle = 'rgba(112, 162, 183, 0.7)';
    scratchCtx.textAlign = 'center';
    scratchCtx.fillText('SCRATCH ME!', scratchCanvas.width / 2, scratchCanvas.height / 2 + 6);
  }

  function startScratch(e) {
    if (scratchClaimed) return;
    isScratching = true;
    scratch(e);
  }

  function scratch(e) {
    if (!isScratching || scratchClaimed) return;

    const rect = scratchCanvas.getBoundingClientRect();
    // Support mouse coordinate offset
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.beginPath();
    scratchCtx.arc(x, y, 22, 0, Math.PI * 2);
    scratchCtx.fill();

    // Debounce the percentage check to avoid performance lags
    if (!isScratchingPercentChecking) {
      isScratchingPercentChecking = true;
      setTimeout(checkScratchPercentage, 200);
    }
  }

  let isScratchingPercentChecking = false;
  
  function checkScratchPercentage() {
    isScratchingPercentChecking = false;
    if (scratchClaimed) return;

    const imgData = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height);
    const pixels = imgData.data;
    let transparent = 0;
    
    // Check every 8th pixel to speed up calculation
    for (let i = 3; i < pixels.length; i += 32) {
      if (pixels[i] === 0) {
        transparent++;
      }
    }
    
    const percentage = (transparent / (pixels.length / 32)) * 100;
    
    if (percentage > 45) {
      // Complete reveal
      scratchClaimed = true;
      scratchCtx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
      claimScratchPrize();
    }
  }

  function stopScratch() {
    isScratching = false;
  }

  function claimScratchPrize() {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    
    window.TravelogApp.claimCoupon({
      id: currentScratchPrize.id + '-' + Date.now(),
      tag: currentScratchPrize.tag,
      value: currentScratchPrize.value,
      desc: lang === 'ko' ? currentScratchPrize.descKo : currentScratchPrize.descEn
    });
    
    window.TravelogApp.showToast(lang === 'ko' ? '축하합니다! 쿠폰이 내 지갑에 저장되었습니다.' : 'Congrats! Coupon saved in your wallet.');
  }

  function buyNewScratchCard() {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    
    // Costs 50 points
    if (window.TravelogApp.deductPoints(50)) {
      selectNewScratchPrize();
      window.TravelogApp.showToast(lang === 'ko' ? '새 스크래치 카드가 제공되었습니다! (-50P)' : 'New scratch card loaded! (-50 pts)');
    }
  }

  // ==========================================
  // Spin Wheel Canvas Drawing & Physics
  // ==========================================
  function drawWheel() {
    const size = wheelCanvas.width;
    const center = size / 2;
    const radius = center - 8;
    const sliceAngle = (Math.PI * 2) / wheelSegments.length;
    
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    wheelCtx.clearRect(0, 0, size, size);

    wheelSegments.forEach((seg, index) => {
      const startAng = sliceAngle * index + wheelRotation;
      const endAng = startAng + sliceAngle;

      // Slice sector
      wheelCtx.beginPath();
      wheelCtx.moveTo(center, center);
      wheelCtx.arc(center, center, radius, startAng, endAng);
      wheelCtx.closePath();
      wheelCtx.fillStyle = seg.color;
      wheelCtx.fill();

      // Thin separation lines
      wheelCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      wheelCtx.lineWidth = 1.5;
      wheelCtx.stroke();

      // Segment text labels
      wheelCtx.save();
      wheelCtx.translate(center, center);
      wheelCtx.rotate(startAng + sliceAngle / 2);
      wheelCtx.textAlign = "right";
      wheelCtx.fillStyle = "#2B3A42";
      wheelCtx.font = "bold 13px Outfit, Noto Sans KR";
      
      const label = lang === 'ko' ? seg.labelKo : seg.labelEn;
      wheelCtx.fillText(label, radius - 15, 5);
      wheelCtx.restore();
    });
  }

  function spinWheel() {
    if (isSpinning) return;
    
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    // Deduct 30 points per spin
    if (!window.TravelogApp.deductPoints(30)) {
      return;
    }

    isSpinning = true;
    
    // Choose random winner index
    const winnerIndex = Math.floor(Math.random() * wheelSegments.length);
    const sliceAngle = (Math.PI * 2) / wheelSegments.length;
    
    // Target rotation: multiple turns + target angle to land the winner at the 12 o'clock pointer (-90 deg offset)
    const targetOffsetRad = (Math.PI * 1.5) - (sliceAngle * winnerIndex) - (sliceAngle / 2);
    const fullTurns = 6 + Math.floor(Math.random() * 4); // 6 to 9 full spins
    const targetRotation = (Math.PI * 2 * fullTurns) + targetOffsetRad;
    
    const startRotation = wheelRotation % (Math.PI * 2);
    const deltaRotation = targetRotation - startRotation;
    
    let spinStart = null;
    const duration = 4000; // 4 seconds animation

    function animateSpin(timestamp) {
      if (!spinStart) spinStart = timestamp;
      const elapsed = timestamp - spinStart;
      const t = Math.min(elapsed / duration, 1);
      
      // Deceleration Easing (quintic ease out)
      const easeOut = 1 - Math.pow(1 - t, 5);
      
      wheelRotation = startRotation + deltaRotation * easeOut;
      drawWheel();

      if (t < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        isSpinning = false;
        triggerWheelWin(winnerIndex);
      }
    }

    requestAnimationFrame(animateSpin);
  }

  function triggerWheelWin(index) {
    const winner = wheelSegments[index];
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    if (winner.type === "points") {
      window.TravelogApp.addPoints(winner.value);
    } else if (winner.type === "coupon") {
      window.TravelogApp.claimCoupon({
        id: 'spin-' + Date.now(),
        tag: 'WHEEL SPIN',
        value: lang === 'ko' ? '당첨 경품' : 'Lucky Reward',
        desc: winner.value
      });
      window.TravelogApp.showToast(lang === 'ko' ? `축하합니다! ${winner.labelKo} 획득!` : `Congrats! Won ${winner.labelEn}!`);
    }
  }

  // ==========================================
  // Calendar Events & Coupon List Renderers
  // ==========================================
  function renderEvents() {
    const container = document.getElementById('events-list-container');
    container.innerHTML = '';
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    calendarEvents.forEach(evt => {
      const item = document.createElement('div');
      item.className = 'event-list-item glass-panel glass-panel-hover';
      
      const title = lang === 'ko' ? evt.titleKo : evt.titleEn;
      const desc = lang === 'ko' ? evt.descKo : evt.descEn;
      const location = lang === 'ko' ? evt.locationKo : evt.locationEn;
      const startBtnText = lang === 'ko' ? '퀘스트 도전' : 'Start Quest';

      item.innerHTML = `
        <div class="event-date-box">
          <span>${evt.dateMonth}</span>
          <span>${evt.dateDay}</span>
        </div>
        <div class="event-details">
          <h4>${title}</h4>
          <p>${desc}</p>
          <div class="event-meta">
            <span><i class="fa-solid fa-location-dot"></i> ${location}</span>
            <span><i class="fa-solid fa-coins" style="color:var(--accent-orange);"></i> +${evt.pointsReward} pts</span>
          </div>
          ${evt.activeQuest ? `
            <button class="btn-rect" style="align-self: flex-start; margin-top: 8px; padding: 4px 12px; font-size:12px; background:var(--grad-pink-purple);" onclick="TravelogRewardsModule.startEventQuest('${evt.id}')">
              <i class="fa-solid fa-gamepad"></i> ${startBtnText}
            </button>
          ` : ''}
        </div>
      `;
      container.appendChild(item);
    });
  }

  function startEventQuest(id) {
    // Navigate user directly to Adventure Mode tab
    const adventureNavBtn = document.querySelector('.nav-item[data-tab="adventure-tab"]');
    if (adventureNavBtn) {
      adventureNavBtn.click();
    }
  }

  function renderCouponWallet() {
    const walletEl = document.getElementById('coupon-wallet');
    const emptyMsg = document.getElementById('empty-wallet-msg');
    
    // Clear out custom entries, preserving empty msg reference
    const entries = walletEl.querySelectorAll('.coupon-wallet-item');
    entries.forEach(e => e.remove());

    const coupons = window.TravelogApp.getState().ownedCoupons;
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    if (coupons.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    coupons.forEach(coupon => {
      const item = document.createElement('div');
      item.className = 'coupon-wallet-item glass-panel';
      item.style.cssText = `
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-left: 4px solid var(--accent-pink);
        margin-bottom: 8px;
      `;
      
      item.innerHTML = `
        <div style="flex:1;">
          <div style="font-size:11px; font-weight:700; color:var(--accent-orange); letter-spacing:1px;">${coupon.tag}</div>
          <div style="font-size:18px; font-weight:800; margin:2px 0;">${coupon.value}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${coupon.desc}</div>
        </div>
        <button class="btn-rect secondary" style="padding: 6px 12px; font-size:12px;" onclick="TravelogRewardsModule.useCoupon('${coupon.id}')">
          ${lang === 'ko' ? '사용하기' : 'Redeem'}
        </button>
      `;
      walletEl.appendChild(item);
    });
  }

  function useCoupon(id) {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    
    // Open a visual QR-code alert
    const qrContainer = document.createElement('div');
    qrContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.85);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    qrContainer.innerHTML = `
      <div class="glass-panel" style="padding:32px; text-align:center; max-width:320px; width:90%; position:relative; background-color: var(--bg-secondary);">
        <button class="btn-circle" style="position:absolute; top:12px; right:12px; width:28px; height:28px; font-size:12px;" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
        <h4 style="margin-bottom:12px; font-size:16px;">${lang === 'ko' ? '쿠폰 바코드 스캔' : 'Scan Coupon QR Code'}</h4>
        <div style="background:white; padding:16px; border-radius:var(--radius-md); display:inline-block; margin-bottom:16px;">
          <!-- Simple dynamic simulated QR representation -->
          <i class="fa-solid fa-qrcode" style="font-size: 140px; color:black; display:block;"></i>
        </div>
        <p style="font-size:12px; color:var(--text-secondary);">${lang === 'ko' ? '해당 업장의 직원에게 스캔용 바코드를 제시해 주세요.' : 'Present this QR code to the cashier at the counter.'}</p>
      </div>
    `;
    
    document.body.appendChild(qrContainer);
  }

  return {
    init: init,
    resizeScratchCanvas: resizeScratchCanvas,
    onLanguageChange: () => {
      drawWheel();
      renderEvents();
      renderCouponWallet();
      
      // Update scratch card texts (if not scratched yet)
      if (!scratchClaimed && currentScratchPrize) {
        const lang = window.TravelogApp.getLanguage();
        document.getElementById('scratch-coupon-desc').textContent = lang === 'ko' ? currentScratchPrize.descKo : currentScratchPrize.descEn;
      }
    },
    startEventQuest: startEventQuest,
    renderCouponWallet: renderCouponWallet,
    useCoupon: useCoupon
  };
})();

// Attach to window for dynamic HTML clicks
window.TravelogRewardsModule = TravelogRewardsModule;
