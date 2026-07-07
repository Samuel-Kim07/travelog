// ==========================================
// Travelog Global Application Controller & State
// ==========================================

const TravelogState = {
  language: 'ko', // 'ko' or 'en'
  points: 550,
  ownedCoupons: [],
  activeGuide: {
    id: 'guide-minho',
    nameEn: 'Minho (Seoul Local)',
    nameKo: '민호 (서울 토박이)',
    descEn: 'Gyeongbokgung Historical Tour',
    descKo: '경복궁 역사/문화 가이드 투어',
    stops: [
      { nameEn: 'Gwanghwamun Gate', nameKo: '광화문', lat: 37.5760, lng: 126.9768, triggerRadius: 25 },
      { nameEn: 'Heungnyemun Court', nameKo: '흥례문 뜰', lat: 37.5772, lng: 126.9768, triggerRadius: 20 },
      { nameEn: 'Geongjeongjeon Main Hall', nameKo: '근정전', lat: 37.5786, lng: 126.9772, triggerRadius: 20 },
      { nameEn: 'Gyeonghoeru Pavilion', nameKo: '경회루', lat: 37.5798, lng: 126.9760, triggerRadius: 30 }
    ]
  },
  customCreatedPins: [],
  profile: {
    nickname: 'Traveler',
    avatarPreset: 'sun',
    avatarEmoji: '☀️',
    avatarImage: ''
  }
};

// UI Localization Dictionary
const LocalizationDictionary = {
  pts: { en: 'pts', ko: '포인트' },
  active_guide_title: { en: '<i class="fa-solid fa-user-astronaut"></i> Active Guide', ko: '<i class="fa-solid fa-user-astronaut"></i> 현재 가이드' },
  intro_video: { en: '<i class="fa-solid fa-circle-play"></i> Intro Video', ko: '<i class="fa-solid fa-circle-play"></i> 소개 영상' },
  greeting: { en: '<i class="fa-solid fa-volume-high"></i> Greeting', ko: '<i class="fa-solid fa-volume-high"></i> 인사말 듣기' },
  route_guide_list: { en: '<i class="fa-solid fa-map-location-dot"></i> Tour Locations', ko: '<i class="fa-solid fa-map-location-dot"></i> 투어 코스 목록' },
  walking: { en: '<i class="fa-solid fa-spinner fa-spin"></i> Walking...', ko: '<i class="fa-solid fa-spinner fa-spin"></i> 이동 중...' },
  audio_guide: { en: 'Audio Guide Triggered', ko: '음성 안내 시작' },
  vlog_playing: { en: 'Vlog Video Playing...', ko: '브이로그 영상 재생 중...' },
  blog_feed_title: { en: '<i class="fa-solid fa-book-open"></i> Travel Logs & Stories', ko: '<i class="fa-solid fa-book-open"></i> 여행 블로그 & 스토리' },
  filter_all: { en: 'All', ko: '전체' },
  filter_korea: { en: 'South Korea', ko: '대한민국' },
  filter_japan: { en: 'Japan', ko: '일본' },
  filter_europe: { en: 'Europe', ko: '유럽' },
  scratch_title: { en: '<i class="fa-solid fa-ticket"></i> Scratch Off Coupon', ko: '<i class="fa-solid fa-ticket"></i> 할인 쿠폰 스크래치' },
  scratch_desc: { en: 'Scratch the silver card to unlock your travel discount!', ko: '은색 표면을 손가락/마우스로 문질러 여행 할인 쿠폰을 획득하세요!' },
  scratch_reset: { en: '<i class="fa-solid fa-rotate-right"></i> Try New Scratch (Cost: 50 pts)', ko: '<i class="fa-solid fa-rotate-right"></i> 새 스크래치 도전 (50P 차감)' },
  spin_title: { en: '<i class="fa-solid fa-circle-notch"></i> Daily Travel Spin', ko: '<i class="fa-solid fa-circle-notch"></i> 일일 룰렛 이벤트' },
  spin_desc: { en: 'Spin the wheel to win coupons, travel points, or gifts!', ko: '룰렛을 돌려 할인 쿠폰, 여행 포인트 및 특별 경품을 받으세요!' },
  events_calendar_title: { en: '<i class="fa-solid fa-calendar-days"></i> Global Travel Events & Quests', ko: '<i class="fa-solid fa-calendar-days"></i> 글로벌 이벤트 & 오프라인 퀘스트' },
  my_coupons_title: { en: '<i class="fa-solid fa-box-archive"></i> My Coupon Wallet', ko: '<i class="fa-solid fa-box-archive"></i> 내 쿠폰 지갑' },
  empty_wallet: { en: 'No coupons claimed yet. Scratch cards or spin the wheel to win!', ko: '보유한 쿠폰이 없습니다. 스크래치와 룰렛에서 획득해 보세요!' },
  builder_title: { en: '<i class="fa-solid fa-route"></i> Map Tour Guide Builder', ko: '<i class="fa-solid fa-route"></i> 지도 투어 가이드 빌더' },
  builder_desc: { en: 'Create your own customized guide! Click points directly on the Map tab to log coordinates, then upload audio tracks or write guidance scripts here.', ko: '나만의 맞춤 가이드를 만드세요! 지도 탭을 클릭하여 핀을 생성한 뒤, 음성 파일을 녹음하거나 스크립트를 작성하여 가이드로 퍼블리싱해보세요.' },
  builder_tour_name: { en: 'Tour Guide Name', ko: '투어 가이드 이름' },
  builder_select_coords: { en: 'Selected Map Pins', ko: '선택된 지도 핀 목록' },
  no_pins_placeholder: { en: 'Go to Map Tab and click on the map to place pins!', ko: '지도 탭으로 이동하여 원하는 위치를 클릭해 핀을 배치하세요!' },
  save_tour: { en: '<i class="fa-solid fa-floppy-disk"></i> Publish Custom Guide', ko: '<i class="fa-solid fa-floppy-disk"></i> 가이드 정식 등록하기' },
  clear_pins: { en: '<i class="fa-solid fa-trash-can"></i> Reset Pins', ko: '<i class="fa-solid fa-trash-can"></i> 선택 핀 초기화' },
  recorder_title: { en: '<i class="fa-solid fa-microphone-lines"></i> Interactive Guide Voice Recorder', ko: '<i class="fa-solid fa-microphone-lines"></i> 가이드 음성 녹음 스튜디오' },
  recorder_desc: { en: 'Record detailed guidance audio matching your active pins. Follow templates to create quick alerts.', ko: '등록한 핀 위치에 도달했을 때 재생될 자세한 음성을 녹음하세요. 아래 템플릿 문구를 읽으시면 쉽습니다.' },
  recorder_ready: { en: 'Click Mic to Start Recording', ko: '마이크 버튼을 클릭하여 녹음 시작' },
  script_start: { en: '"Starting Tour!"', ko: '"자~ 출발!"' },
  script_turn: { en: '"Go Left Here..."', ko: '"이쪽으로 가세요."' },
  script_eat: { en: '"Best Bistro is here!"', ko: '"여기서 특별 할인을 받으세요!"' },
  script_morning: { en: '"Good Morning!"', ko: '"일어날 시간이에요~"' },
  market_title: { en: '<i class="fa-solid fa-cart-shopping"></i> Voice Sample Market', ko: '<i class="fa-solid fa-cart-shopping"></i> 가이드 보이스 마켓' },
  market_desc: { en: 'Don\'t want to record your own voice? Purchase high-quality synthesized voice packages to read your scripts automatically.', ko: '목소리 녹음이 어렵다면 마켓의 다국어 보이스 팩을 구매하여 가이드 북을 완성해보세요!' },
  quest_active: { en: 'Active Quest', ko: '진행 중인 퀘스트' },
  quest_steps_title: { en: '<i class="fa-solid fa-list-check"></i> Quest Milestones', ko: '<i class="fa-solid fa-list-check"></i> 퀘스트 미션 단계' },
  radar_title: { en: '<i class="fa-solid fa-satellite-dish"></i> GPS Proximity Radar', ko: '<i class="fa-solid fa-satellite-dish"></i> GPS 근접 레이더' },
  radar_desc: { en: 'Simulate walking on the Map tab to get closer to the coordinate clues. When inside 10m, clues unlock!', ko: '지도 탭에서 경로 이동 시뮬레이션을 시작하여 단서에 가까워지세요. 10m 내로 들어오면 봉인이 풀립니다!' },
  clue_unlocked_title: { en: '<i class="fa-solid fa-lock-open"></i> Clue Location Reached!', ko: '<i class="fa-solid fa-lock-open"></i> 단서 장소 도달 완료!' },
  solve: { en: 'Solve', ko: '정답 확인' },
  radar_clue_hint: { en: 'Proceed to the active map icon marked in Pink to trigger coordinates.', ko: '지도상의 분홍색 퀘스트 마커로 다가가 음성 단서 알림을 받으세요.' },
  teleport_btn: { en: '<i class="fa-solid fa-bolt"></i> Teleport to Clue GPS Spot', ko: '<i class="fa-solid fa-bolt"></i> 단서 위치로 바로 순간이동' },
  nav_map: { en: 'Map', ko: '지도' },
  nav_explore: { en: 'Explore', ko: '피드' },
  nav_rewards: { en: 'Rewards', ko: '쿠폰&이벤트' },
  nav_creator: { en: 'Creator', ko: '스튜디오' },

  // Onboarding / profile setup
  onboarding_subtitle: { en: 'The global companion for passionate travelers', ko: '여행자를 위한 글로벌 여행 동행 앱' },
  login_google: { en: 'Continue with Google', ko: 'Google로 계속하기' },
  login_naver: { en: 'Continue with Naver', ko: 'Naver로 계속하기' },
  login_email: { en: 'Continue with Email', ko: '이메일로 계속하기' },
  onboarding_profile_title: { en: 'Set Up Your Profile', ko: '프로필 설정' },
  onboarding_profile_subtitle: { en: 'Create your travel identity to start exploring', ko: '여행을 시작할 프로필을 만들어 주세요' },
  avatar_hint: { en: 'Choose preset or upload custom photo', ko: '기본 이미지를 선택하거나 내 사진을 올려주세요' },
  nickname_label: { en: 'Create Nickname', ko: '닉네임 만들기' },
  nickname_check: { en: 'Verify', ko: '확인' },
  start_exploring: { en: 'Start Exploring!', ko: '시작하기' },
  share: { en: 'Share', ko: '공유' },

  // Custom inputs placeholder localization
  search_placeholder: { en: 'Search logs...', ko: '여행기 검색...' },
  puzzle_placeholder: { en: 'Enter password/answer...', ko: '암호 또는 정답 입력...' }
};

let onboardingVerified = false;
let appBooted = false;

// Expose a stable app API before DOMContentLoaded module initialization.
window.TravelogApp = {
  getState: () => TravelogState,
  addPoints,
  deductPoints,
  showToast,
  getLanguage: () => TravelogState.language,
  claimCoupon: (coupon) => {
    TravelogState.ownedCoupons.push(coupon);
    if (window.TravelogRewardsModule && typeof window.TravelogRewardsModule.renderCouponWallet === 'function') {
      window.TravelogRewardsModule.renderCouponWallet();
    }
  },
  refreshMap: requestMapRefresh,
  getProfile: () => TravelogState.profile
};

// ==========================================
// Main Initialization & Event Binding
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  bootstrapApp();
});

function bootstrapApp() {
  if (appBooted) return;
  appBooted = true;

  initNavigation();
  initLanguageToggle();
  updatePointsDisplay();
  setLanguage(TravelogState.language, false);
  updateActiveGuideHeader();

  initOnboarding();
  initModulesSafely();

  // Leaflet often needs one redraw after the browser calculates layout.
  requestMapRefresh();
}

function initModulesSafely() {
  const modules = [
    ['TravelogMapModule', '지도'],
    ['TravelogExploreModule', '피드'],
    ['TravelogRewardsModule', '쿠폰/이벤트'],
    ['TravelogCreatorModule', '스튜디오'],
    ['TravelogAdventureModule', '어드벤처']
  ];

  modules.forEach(([globalName, label]) => {
    const mod = window[globalName];
    if (!mod || typeof mod.init !== 'function') return;

    try {
      mod.init();
    } catch (error) {
      console.error(`[Travelog] ${label} 초기화 실패`, error);
      showToast(`${label} 기능을 불러오지 못했습니다. 다른 기능은 계속 사용할 수 있습니다.`);
    }
  });

  triggerModuleLanguageUpdate();
}

// ==========================================
// Tab Navigation logic
// ==========================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      if (!targetTab) return;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      tabContents.forEach(tab => {
        tab.classList.toggle('active', tab.id === targetTab);
      });

      if (targetTab === 'map-tab') {
        requestMapRefresh();
      }

      if (targetTab === 'rewards-tab' && window.TravelogRewardsModule) {
        window.TravelogRewardsModule.resizeScratchCanvas?.();
      }
    });
  });
}

function requestMapRefresh() {
  const refresh = () => {
    if (window.TravelogMapModule && typeof window.TravelogMapModule.invalidateSize === 'function') {
      window.TravelogMapModule.invalidateSize();
    }
  };

  requestAnimationFrame(refresh);
  setTimeout(refresh, 120);
  setTimeout(refresh, 420);
}

// ==========================================
// Language logic
// ==========================================
function initLanguageToggle() {
  const langBtn = document.getElementById('lang-toggle-btn');
  if (!langBtn) return;

  langBtn.addEventListener('click', () => {
    const nextLang = TravelogState.language === 'ko' ? 'en' : 'ko';
    setLanguage(nextLang);
  });
}

function setLanguage(lang, notifyModules = true) {
  TravelogState.language = lang;

  const currentLangText = document.getElementById('current-lang');
  if (currentLangText) {
    currentLangText.textContent = lang === 'ko' ? 'English' : '한국어';
  }

  document.querySelectorAll('[data-localize]').forEach(el => {
    const key = el.getAttribute('data-localize');
    if (LocalizationDictionary[key]) {
      el.innerHTML = LocalizationDictionary[key][lang];
    }
  });

  document.querySelectorAll('[data-localize-placeholder]').forEach(el => {
    const key = el.getAttribute('data-localize-placeholder');
    if (LocalizationDictionary[key]) {
      el.placeholder = LocalizationDictionary[key][lang];
    }
  });

  updateActiveGuideHeader();
  if (notifyModules) triggerModuleLanguageUpdate();
}

function triggerModuleLanguageUpdate() {
  const modules = [
    window.TravelogMapModule,
    window.TravelogExploreModule,
    window.TravelogRewardsModule,
    window.TravelogCreatorModule,
    window.TravelogAdventureModule
  ];

  modules.forEach(mod => {
    if (mod && typeof mod.onLanguageChange === 'function') {
      try {
        mod.onLanguageChange(TravelogState.language);
      } catch (error) {
        console.error('[Travelog] language update failed', error);
      }
    }
  });
}

function updateActiveGuideHeader() {
  const lang = TravelogState.language;
  const guideName = document.getElementById('guide-name');
  const guideDesc = document.getElementById('guide-desc');

  if (guideName) guideName.textContent = lang === 'ko' ? TravelogState.activeGuide.nameKo : TravelogState.activeGuide.nameEn;
  if (guideDesc) guideDesc.textContent = lang === 'ko' ? TravelogState.activeGuide.descKo : TravelogState.activeGuide.descEn;
}

// ==========================================
// Onboarding & Profile Setup
// ==========================================
function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  const savedProfile = loadSavedProfile();
  if (savedProfile) {
    TravelogState.profile = { ...TravelogState.profile, ...savedProfile };
    applyHeaderProfile();
    hideOnboarding(true);
    return;
  }

  showOnboardingScreen('login');
  bindOnboardingButtons();
  applyAvatarPreview();
}

function bindOnboardingButtons() {
  document.getElementById('login-google-btn')?.addEventListener('click', () => moveToProfileStep('google'));
  document.getElementById('login-naver-btn')?.addEventListener('click', () => moveToProfileStep('naver'));
  document.getElementById('login-email-btn')?.addEventListener('click', () => moveToProfileStep('email'));

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(preset => preset.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.getAttribute('data-preset') || 'sun';
      const emojiMap = { sun: '☀️', wave: '🌊', leaf: '🍃' };
      TravelogState.profile.avatarPreset = preset;
      TravelogState.profile.avatarEmoji = emojiMap[preset] || '☀️';
      TravelogState.profile.avatarImage = '';
      applyAvatarPreview();
    });
  });

  const fileInput = document.getElementById('onboarding-file-input');
  fileInput?.addEventListener('change', handleAvatarUpload);

  const nicknameInput = document.getElementById('onboarding-nickname-input');
  nicknameInput?.addEventListener('input', () => {
    onboardingVerified = false;
    setNicknameFeedback('', '');
    updateStartButton();
  });
  nicknameInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') verifyNickname();
  });

  document.getElementById('nickname-check-btn')?.addEventListener('click', verifyNickname);
  document.getElementById('start-app-btn')?.addEventListener('click', finishOnboarding);
}

function moveToProfileStep(provider) {
  TravelogState.profile.provider = provider;
  showOnboardingScreen('profile');
}

function showOnboardingScreen(screenName) {
  const loginScreen = document.getElementById('onboarding-screen-login');
  const profileScreen = document.getElementById('onboarding-screen-profile');

  loginScreen?.classList.toggle('active', screenName === 'login');
  profileScreen?.classList.toggle('active', screenName === 'profile');
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setNicknameFeedback(TravelogState.language === 'ko' ? '이미지 파일만 사용할 수 있어요.' : 'Please choose an image file.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    TravelogState.profile.avatarImage = String(reader.result || '');
    document.querySelectorAll('.preset-btn').forEach(preset => preset.classList.remove('active'));
    applyAvatarPreview();
  };
  reader.readAsDataURL(file);
}

function applyAvatarPreview() {
  const preview = document.getElementById('avatar-preview-circle');
  const emoji = document.getElementById('avatar-preview-emoji');
  if (!preview) return;

  if (TravelogState.profile.avatarImage) {
    preview.style.backgroundImage = `url('${TravelogState.profile.avatarImage}')`;
    if (emoji) emoji.style.display = 'none';
  } else {
    preview.style.backgroundImage = '';
    if (emoji) {
      emoji.style.display = 'block';
      emoji.textContent = TravelogState.profile.avatarEmoji || '☀️';
    }
  }
}

function verifyNickname() {
  const input = document.getElementById('onboarding-nickname-input');
  const value = input?.value.trim() || '';
  const lang = TravelogState.language;
  const unavailable = ['admin', 'travelog', 'guide', 'test'];

  if (value.length < 2) {
    onboardingVerified = false;
    setNicknameFeedback(lang === 'ko' ? '닉네임은 2글자 이상 입력해 주세요.' : 'Nickname must be at least 2 characters.', 'error');
    updateStartButton();
    return;
  }

  if (unavailable.includes(value.toLowerCase())) {
    onboardingVerified = false;
    setNicknameFeedback(lang === 'ko' ? '이미 사용 중인 닉네임입니다.' : 'This nickname is already taken.', 'error');
    updateStartButton();
    return;
  }

  TravelogState.profile.nickname = value;
  onboardingVerified = true;
  setNicknameFeedback(lang === 'ko' ? '사용 가능한 닉네임입니다.' : 'Nickname is available.', 'success');
  updateStartButton();
}

function setNicknameFeedback(message, type) {
  const feedback = document.getElementById('nickname-feedback');
  if (!feedback) return;

  if (!message) {
    feedback.textContent = '';
    feedback.style.display = 'none';
    feedback.className = 'feedback-badge';
    return;
  }

  feedback.textContent = message;
  feedback.style.display = 'inline-block';
  feedback.className = `feedback-badge ${type}`;
}

function updateStartButton() {
  const btn = document.getElementById('start-app-btn');
  if (!btn) return;
  btn.disabled = !onboardingVerified;
}

function finishOnboarding() {
  if (!onboardingVerified) {
    verifyNickname();
    if (!onboardingVerified) return;
  }

  applyHeaderProfile();
  saveProfile();
  hideOnboarding(false);
  showToast(TravelogState.language === 'ko' ? 'Travelog에 오신 것을 환영합니다!' : 'Welcome to Travelog!');
  requestMapRefresh();
}

function hideOnboarding(immediate = false) {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  if (immediate) {
    overlay.style.display = 'none';
    requestMapRefresh();
    return;
  }

  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  setTimeout(() => {
    overlay.style.display = 'none';
    requestMapRefresh();
  }, 320);
}

function applyHeaderProfile() {
  const widget = document.getElementById('user-profile-widget');
  const avatar = document.getElementById('header-avatar-container');
  const nickname = document.getElementById('header-nickname');

  if (widget) widget.style.display = 'flex';
  if (nickname) nickname.textContent = TravelogState.profile.nickname || 'Traveler';

  if (!avatar) return;
  avatar.innerHTML = '';
  if (TravelogState.profile.avatarImage) {
    avatar.style.backgroundImage = `url('${TravelogState.profile.avatarImage}')`;
  } else {
    avatar.style.backgroundImage = '';
    const span = document.createElement('span');
    span.textContent = TravelogState.profile.avatarEmoji || '☀️';
    avatar.appendChild(span);
  }
}

function saveProfile() {
  try {
    localStorage.setItem('travelogProfile', JSON.stringify(TravelogState.profile));
  } catch (error) {
    console.warn('[Travelog] 프로필 저장 실패', error);
  }
}

function loadSavedProfile() {
  try {
    const raw = localStorage.getItem('travelogProfile');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[Travelog] 프로필 불러오기 실패', error);
    return null;
  }
}

// ==========================================
// Global points management
// ==========================================
function updatePointsDisplay() {
  const pointEl = document.getElementById('user-points');
  if (pointEl) pointEl.textContent = TravelogState.points;
}

function addPoints(amount) {
  TravelogState.points += amount;
  updatePointsDisplay();
  showToast(`+${amount} points!`);
}

function deductPoints(amount) {
  if (TravelogState.points >= amount) {
    TravelogState.points -= amount;
    updatePointsDisplay();
    return true;
  }
  showToast(TravelogState.language === 'ko' ? '포인트가 부족합니다!' : 'Not enough points!');
  return false;
}

// Toast notification helper
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: var(--grad-pink-purple);
      color: white;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      z-index: 200000;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: var(--shadow-neon-pink);
      max-width: min(90vw, 520px);
      text-align: center;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(toast._travelogTimer);
  toast._travelogTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 2500);
}
