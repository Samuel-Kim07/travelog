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
      { nameEn: "Gwanghwamun Gate", nameKo: "광화문", lat: 37.5760, lng: 126.9768, triggerRadius: 25 },
      { nameEn: "Heungnyemun Court", nameKo: "흥례문 뜰", lat: 37.5772, lng: 126.9768, triggerRadius: 20 },
      { nameEn: "Geongjeongjeon Main Hall", nameKo: "근정전", lat: 37.5786, lng: 126.9772, triggerRadius: 20 },
      { nameEn: "Gyeonghoeru Pavilion", nameKo: "경회루", lat: 37.5798, lng: 126.9760, triggerRadius: 30 }
    ]
  },
  customCreatedPins: [],
  currentUser: null,
  onboarding: {
    authProvider: null,
    nicknameChecked: false,
    avatarType: 'preset',
    avatarValue: '☀️',
    tutorialIndex: 0
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
  
  // Custom inputs placeholder localization
  search_placeholder: { en: 'Search logs...', ko: '여행기 검색...' },
  puzzle_placeholder: { en: 'Enter password/answer...', ko: '암호 또는 정답 입력...' },

  // Onboarding / Signup localization
  step_login: { en: '1. Login', ko: '1. 로그인' },
  step_profile: { en: '2. Account Setup', ko: '2. 개인계정 설정' },
  step_tutorial: { en: '3. Tutorial', ko: '3. 튜토리얼' },
  onboarding_login_title: { en: 'Start Travelog', ko: 'Travelog 시작하기' },
  onboarding_subtitle: { en: 'Use social login or email signup to begin your travel guide.', ko: '간편 로그인 또는 이메일 가입으로 여행 가이드를 시작하세요.' },
  login_google: { en: 'Continue with Google', ko: 'Google로 계속하기' },
  login_naver: { en: 'Continue with Naver', ko: 'Naver로 계속하기' },
  login_facebook: { en: 'Continue with Facebook', ko: 'Facebook으로 계속하기' },
  login_email: { en: 'Sign up with Email', ko: '이메일로 가입하기' },
  login_notice: { en: 'This build uses a prototype login flow. For public release, connect a real auth service such as Firebase, Auth0, or Supabase.', ko: '현재 버전은 테스트용 로그인 흐름입니다. 실제 배포 시 Firebase/Auth0/Supabase 같은 인증 서버 연결이 필요합니다.' },
  email_label: { en: 'Email address', ko: '이메일 주소' },
  password_label: { en: 'Password', ko: '비밀번호' },
  email_signup_submit: { en: 'Complete Email Signup', ko: '이메일 가입 완료' },
  email_invalid: { en: 'Please enter a valid email and password of 6+ characters.', ko: '올바른 이메일과 6자 이상의 비밀번호를 입력해 주세요.' },
  login_success: { en: 'Login complete. Please set up your profile.', ko: '로그인 완료. 프로필을 설정해 주세요.' },
  onboarding_profile_title: { en: 'Set Up Your Profile', ko: '프로필 설정' },
  onboarding_profile_subtitle: { en: 'Choose a nickname and profile image.', ko: '닉네임과 프로필 이미지를 설정해 주세요.' },
  avatar_hint: { en: 'Choose a preset or use a gallery/camera image from your phone.', ko: '기본 아이콘을 선택하거나 폰 갤러리/카메라 이미지를 사용할 수 있습니다.' },
  nickname_label: { en: 'Create Nickname', ko: '닉네임 만들기' },
  nickname_check: { en: 'Check', ko: '확인' },
  nickname_short: { en: 'Use at least 2 characters.', ko: '닉네임은 2자 이상 입력해 주세요.' },
  nickname_taken: { en: 'This nickname is already taken.', ko: '이미 사용 중인 닉네임입니다.' },
  nickname_available: { en: 'Nickname is available.', ko: '사용 가능한 닉네임입니다.' },
  back_btn: { en: 'Back', ko: '뒤로' },
  next_tutorial: { en: 'Go to Tutorial', ko: '튜토리얼로 이동' },
  tutorial_title: { en: 'How to Use Travelog', ko: 'Travelog 사용법' },
  tutorial_subtitle: { en: 'Check three core features before starting.', ko: '핵심 기능 3가지만 확인하면 바로 시작할 수 있습니다.' },
  tutorial_map_title: { en: 'Map-Based Guide', ko: '지도 위 가이드' },
  tutorial_map_desc: { en: 'Follow a selected guide route to unlock location-based videos, audio, and coupons.', ko: '선택한 가이드의 경로를 따라가면 위치에 맞춰 영상, 음성, 쿠폰이 자동으로 열립니다.' },
  tutorial_creator_title: { en: 'Create Your Own Guide', ko: '나만의 여행 가이드 만들기' },
  tutorial_creator_desc: { en: 'Place pins on the map, record your voice, or use voice-market samples to publish a tour.', ko: '지도에 핀을 찍고 직접 녹음하거나 보이스 마켓 샘플을 사용해 투어를 등록할 수 있습니다.' },
  tutorial_adventure_title: { en: 'Outdoor Adventure Quest', ko: '오프라인 모험 퀘스트' },
  tutorial_adventure_desc: { en: 'Reach certain places to unlock clues, solve answers, and receive points or coupons.', ko: '특정 장소에 도착하면 단서가 열리고, 정답을 맞히면 포인트와 쿠폰 보상을 받을 수 있습니다.' },
  prev_btn: { en: 'Previous', ko: '이전' },
  next_btn: { en: 'Next', ko: '다음' },
  skip_tutorial: { en: 'Skip', ko: '건너뛰기' },
  start_exploring: { en: 'Start', ko: '시작하기' },
  photo_permission_title: { en: 'Profile Image Permission', ko: '프로필 이미지 접근 권한' },
  photo_permission_desc: { en: 'To set a profile image, allow gallery or camera access in your device/browser permission popup.', ko: '프로필 이미지를 설정하려면 갤러리 또는 카메라 접근을 허용해야 합니다. 선택 후 브라우저/기기 권한 팝업에서 허용을 눌러주세요.' },
  choose_gallery: { en: 'Choose from Gallery', ko: '갤러리에서 선택' },
  choose_camera: { en: 'Take Photo', ko: '카메라로 촬영' },
  photo_loaded: { en: 'Profile image selected.', ko: '프로필 이미지가 선택되었습니다.' }
};

// ==========================================
// Main Initialization & Event Binding
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initLanguageToggle();
  updatePointsDisplay();
  initOnboarding();
  
  // Trigger sub-module updates if they need state initial loading
  if (window.TravelogMapModule && typeof window.TravelogMapModule.init === 'function') {
    window.TravelogMapModule.init();
  }
  if (window.TravelogExploreModule && typeof window.TravelogExploreModule.init === 'function') {
    window.TravelogExploreModule.init();
  }
  if (window.TravelogRewardsModule && typeof window.TravelogRewardsModule.init === 'function') {
    window.TravelogRewardsModule.init();
  }
  if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.init === 'function') {
    window.TravelogCreatorModule.init();
  }
  if (window.TravelogAdventureModule && typeof window.TravelogAdventureModule.init === 'function') {
    window.TravelogAdventureModule.init();
  }

  // Set default language
  setLanguage('ko');
});


// ==========================================
// Onboarding Flow: Login → Profile → Tutorial → Start
// ==========================================
function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  const savedUser = loadSavedUser();
  if (savedUser) {
    TravelogState.currentUser = savedUser;
    applyUserProfileToHeader(savedUser);
    overlay.style.display = 'none';
    return;
  }

  bindLoginButtons();
  bindProfileSetup();
  bindTutorialControls();
  updateOnboardingStep('login');
}

function loadSavedUser() {
  try {
    const raw = localStorage.getItem('travelog_user_profile');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Unable to read saved user profile', err);
    return null;
  }
}

function bindLoginButtons() {
  const providerButtons = document.querySelectorAll('[data-provider]');
  const emailPanel = document.getElementById('email-signup-panel');
  const emailForm = document.getElementById('email-signup-panel');

  providerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.getAttribute('data-provider');
      if (provider === 'email') {
        emailPanel.style.display = emailPanel.style.display === 'none' ? 'flex' : 'none';
        return;
      }
      completeLogin(provider);
    });
  });

  if (emailForm) {
    emailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('signup-email-input').value.trim();
      const password = document.getElementById('signup-password-input').value.trim();
      const feedback = document.getElementById('email-signup-feedback');
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6;

      if (!valid) {
        showFeedback(feedback, LocalizationDictionary.email_invalid[TravelogState.language], 'error');
        return;
      }
      completeLogin('email', email);
    });
  }
}

function completeLogin(provider, email = '') {
  TravelogState.onboarding.authProvider = provider;
  TravelogState.onboarding.email = email;
  showToast(LocalizationDictionary.login_success[TravelogState.language]);
  updateOnboardingStep('profile');
}

function bindProfileSetup() {
  const presetButtons = document.querySelectorAll('.preset-btn');
  const nicknameInput = document.getElementById('onboarding-nickname-input');
  const nicknameCheckBtn = document.getElementById('nickname-check-btn');
  const profileNextBtn = document.getElementById('profile-next-btn');
  const profileBackBtn = document.getElementById('profile-back-btn');
  const openPhotoBtn = document.getElementById('open-photo-options-btn');
  const closePhotoBtn = document.getElementById('close-photo-permission-btn');
  const galleryBtn = document.getElementById('choose-gallery-btn');
  const cameraBtn = document.getElementById('choose-camera-btn');
  const galleryInput = document.getElementById('onboarding-gallery-input');
  const cameraInput = document.getElementById('onboarding-camera-input');

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setAvatarPreset(btn.textContent.trim());
    });
  });

  if (nicknameInput) {
    nicknameInput.addEventListener('input', () => {
      TravelogState.onboarding.nicknameChecked = false;
      profileNextBtn.disabled = true;
      const feedback = document.getElementById('nickname-feedback');
      feedback.style.display = 'none';
    });
  }

  if (nicknameCheckBtn) nicknameCheckBtn.addEventListener('click', validateNickname);

  if (profileNextBtn) {
    profileNextBtn.addEventListener('click', () => {
      if (!TravelogState.onboarding.nicknameChecked) {
        validateNickname();
        return;
      }
      updateOnboardingStep('tutorial');
      updateTutorialSlide(0);
    });
  }

  if (profileBackBtn) profileBackBtn.addEventListener('click', () => updateOnboardingStep('login'));
  if (openPhotoBtn) openPhotoBtn.addEventListener('click', openPhotoPermissionModal);
  if (closePhotoBtn) closePhotoBtn.addEventListener('click', closePhotoPermissionModal);
  if (galleryBtn) galleryBtn.addEventListener('click', () => { closePhotoPermissionModal(); galleryInput.click(); });
  if (cameraBtn) cameraBtn.addEventListener('click', () => { closePhotoPermissionModal(); cameraInput.click(); });
  if (galleryInput) galleryInput.addEventListener('change', handleAvatarFileSelect);
  if (cameraInput) cameraInput.addEventListener('change', handleAvatarFileSelect);
}

function setAvatarPreset(emoji) {
  const avatarCircle = document.getElementById('avatar-preview-circle');
  const avatarEmoji = document.getElementById('avatar-preview-emoji');
  avatarCircle.style.backgroundImage = '';
  avatarEmoji.style.display = 'inline';
  avatarEmoji.textContent = emoji;
  TravelogState.onboarding.avatarType = 'preset';
  TravelogState.onboarding.avatarValue = emoji;
}

function openPhotoPermissionModal() {
  const modal = document.getElementById('photo-permission-modal');
  if (modal) modal.style.display = 'flex';
}

function closePhotoPermissionModal() {
  const modal = document.getElementById('photo-permission-modal');
  if (modal) modal.style.display = 'none';
}

function handleAvatarFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const avatarCircle = document.getElementById('avatar-preview-circle');
    const avatarEmoji = document.getElementById('avatar-preview-emoji');
    avatarCircle.style.backgroundImage = `url('${dataUrl}')`;
    avatarEmoji.style.display = 'none';
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    TravelogState.onboarding.avatarType = 'image';
    TravelogState.onboarding.avatarValue = dataUrl;
    showToast(LocalizationDictionary.photo_loaded[TravelogState.language]);
  };
  reader.readAsDataURL(file);
}

function validateNickname() {
  const input = document.getElementById('onboarding-nickname-input');
  const feedback = document.getElementById('nickname-feedback');
  const profileNextBtn = document.getElementById('profile-next-btn');
  const value = input.value.trim();
  const blocked = ['admin', 'travelog', 'guide', 'test'];

  if (value.length < 2) {
    TravelogState.onboarding.nicknameChecked = false;
    profileNextBtn.disabled = true;
    showFeedback(feedback, LocalizationDictionary.nickname_short[TravelogState.language], 'error');
    return false;
  }

  if (blocked.includes(value.toLowerCase())) {
    TravelogState.onboarding.nicknameChecked = false;
    profileNextBtn.disabled = true;
    showFeedback(feedback, LocalizationDictionary.nickname_taken[TravelogState.language], 'error');
    return false;
  }

  TravelogState.onboarding.nicknameChecked = true;
  TravelogState.onboarding.nickname = value;
  profileNextBtn.disabled = false;
  showFeedback(feedback, LocalizationDictionary.nickname_available[TravelogState.language], 'success');
  return true;
}

function showFeedback(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = `feedback-badge ${type}`;
  el.style.display = 'inline-block';
}

function bindTutorialControls() {
  const prevBtn = document.getElementById('tutorial-prev-btn');
  const nextBtn = document.getElementById('tutorial-next-btn');
  const skipBtn = document.getElementById('tutorial-skip-btn');
  const startBtn = document.getElementById('start-app-btn');
  const dots = document.querySelectorAll('.tutorial-dot');

  if (prevBtn) prevBtn.addEventListener('click', () => updateTutorialSlide(Math.max(0, TravelogState.onboarding.tutorialIndex - 1)));
  if (nextBtn) nextBtn.addEventListener('click', () => updateTutorialSlide(Math.min(2, TravelogState.onboarding.tutorialIndex + 1)));
  if (skipBtn) skipBtn.addEventListener('click', finishOnboarding);
  if (startBtn) startBtn.addEventListener('click', finishOnboarding);

  dots.forEach(dot => {
    dot.addEventListener('click', () => updateTutorialSlide(Number(dot.getAttribute('data-slide-target'))));
  });
}

function updateTutorialSlide(index) {
  TravelogState.onboarding.tutorialIndex = index;
  document.querySelectorAll('.tutorial-slide').forEach(slide => {
    slide.classList.toggle('active', Number(slide.getAttribute('data-tutorial-slide')) === index);
  });
  document.querySelectorAll('.tutorial-dot').forEach(dot => {
    dot.classList.toggle('active', Number(dot.getAttribute('data-slide-target')) === index);
  });

  const prevBtn = document.getElementById('tutorial-prev-btn');
  const nextBtn = document.getElementById('tutorial-next-btn');
  const startBtn = document.getElementById('start-app-btn');
  if (prevBtn) prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.style.display = index === 2 ? 'none' : 'flex';
  if (startBtn) startBtn.style.display = index === 2 ? 'flex' : 'none';
}

function updateOnboardingStep(step) {
  document.querySelectorAll('[data-onboarding-screen]').forEach(screen => {
    screen.classList.toggle('active', screen.getAttribute('data-onboarding-screen') === step);
  });

  const order = ['login', 'profile', 'tutorial'];
  const currentIndex = order.indexOf(step);
  document.querySelectorAll('[data-step-dot]').forEach(dot => {
    const dotIndex = order.indexOf(dot.getAttribute('data-step-dot'));
    dot.classList.toggle('active', dotIndex === currentIndex);
    dot.classList.toggle('completed', dotIndex < currentIndex);
  });
}

function finishOnboarding() {
  const nickname = TravelogState.onboarding.nickname || document.getElementById('onboarding-nickname-input').value.trim() || 'Traveler';
  const user = {
    nickname: nickname,
    authProvider: TravelogState.onboarding.authProvider || 'guest',
    email: TravelogState.onboarding.email || '',
    avatarType: TravelogState.onboarding.avatarType,
    avatarValue: TravelogState.onboarding.avatarValue,
    createdAt: new Date().toISOString()
  };

  TravelogState.currentUser = user;
  try {
    localStorage.setItem('travelog_user_profile', JSON.stringify(user));
  } catch (err) {
    console.warn('Unable to save user profile', err);
  }

  applyUserProfileToHeader(user);
  const overlay = document.getElementById('onboarding-overlay');
  overlay.classList.add('is-closing');
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('is-closing');
    if (window.TravelogMapModule) window.TravelogMapModule.invalidateSize();
  }, 450);
}

function applyUserProfileToHeader(user) {
  const widget = document.getElementById('user-profile-widget');
  const avatar = document.getElementById('header-avatar-container');
  const nickname = document.getElementById('header-nickname');
  if (!widget || !avatar || !nickname) return;

  widget.style.display = 'flex';
  nickname.textContent = user.nickname || 'Traveler';
  avatar.style.backgroundImage = '';
  avatar.innerHTML = '';

  if (user.avatarType === 'image' && user.avatarValue) {
    avatar.style.backgroundImage = `url('${user.avatarValue}')`;
  } else {
    avatar.innerHTML = `<span>${user.avatarValue || '☀️'}</span>`;
  }
}

// Tab Navigation logic
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      
      // Update Navbar selection UI
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      // Update Tab panel visibility
      tabContents.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === targetTab) {
          tab.classList.add('active');
        }
      });

      // Special Tab-Specific Handlers
      if (targetTab === 'map-tab' && window.TravelogMapModule) {
        window.TravelogMapModule.invalidateSize(); // Force Leaflet redraw
      }
      
      if (targetTab === 'rewards-tab' && window.TravelogRewardsModule) {
        window.TravelogRewardsModule.resizeScratchCanvas();
      }
    });
  });
}

// Language logic
function initLanguageToggle() {
  const langBtn = document.getElementById('lang-toggle-btn');
  const currentLangText = document.getElementById('current-lang');

  langBtn.addEventListener('click', () => {
    const nextLang = TravelogState.language === 'ko' ? 'en' : 'ko';
    setLanguage(nextLang);
  });
}

function setLanguage(lang) {
  TravelogState.language = lang;
  
  // Update header text
  const currentLangText = document.getElementById('current-lang');
  currentLangText.textContent = lang === 'ko' ? 'English' : '한국어';
  
  // Update HTML elements with data-localize
  document.querySelectorAll('[data-localize]').forEach(el => {
    const key = el.getAttribute('data-localize');
    if (LocalizationDictionary[key]) {
      el.innerHTML = LocalizationDictionary[key][lang];
    }
  });

  // Update input placeholders
  document.querySelectorAll('[data-localize-placeholder]').forEach(el => {
    const key = el.getAttribute('data-localize-placeholder');
    if (LocalizationDictionary[key]) {
      el.placeholder = LocalizationDictionary[key][lang];
    }
  });

  // Notify modules of language change
  triggerModuleLanguageUpdate();
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
      mod.onLanguageChange(TravelogState.language);
    }
  });
}

// Global points management
function updatePointsDisplay() {
  document.getElementById('user-points').textContent = TravelogState.points;
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
      position: absolute;
      top: 90px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: var(--grad-pink-purple);
      color: white;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      z-index: 250000;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: var(--shadow-neon-pink);
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 2500);
}

// Share functions globally on window object
window.TravelogApp = {
  getState: () => TravelogState,
  addPoints: addPoints,
  deductPoints: deductPoints,
  showToast: showToast,
  getLanguage: () => TravelogState.language,
  claimCoupon: (coupon) => {
    TravelogState.ownedCoupons.push(coupon);
    if (window.TravelogRewardsModule && typeof window.TravelogRewardsModule.renderCouponWallet === 'function') {
      window.TravelogRewardsModule.renderCouponWallet();
    }
  }
};
