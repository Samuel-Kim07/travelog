// ==========================================
// Travelog Global Application Controller & State
// ==========================================

const TravelogState = {
  language: 'ko', // 'ko', 'en', or 'ja'
  points: 550,
  ownedCoupons: [],
  userProfile: {
    isOnboarded: false,
    authProvider: null,
    nickname: '',
    avatarType: 'emoji',
    avatarValue: '☀️',
    avatarPresetId: 'sun'
  },
  activeGuide: {
    id: 'guide-minho',
    nameEn: 'Minho (Seoul Local)',
    nameKo: '민호 (서울 토박이)',
    nameJa: 'ミンホ（ソウル地元ガイド）',
    descEn: 'Gyeongbokgung Historical Tour',
    descKo: '경복궁 역사/문화 가이드 투어',
    descJa: '景福宮 歴史・文化ガイドツアー',
    stops: [
      { nameEn: "Gwanghwamun Gate", nameKo: "광화문", nameJa: "光化門", lat: 37.5760, lng: 126.9768, triggerRadius: 25 },
      { nameEn: "Heungnyemun Court", nameKo: "흥례문 뜰", nameJa: "興礼門の庭", lat: 37.5772, lng: 126.9768, triggerRadius: 20 },
      { nameEn: "Geongjeongjeon Main Hall", nameKo: "근정전", nameJa: "勤政殿", lat: 37.5786, lng: 126.9772, triggerRadius: 20 },
      { nameEn: "Gyeonghoeru Pavilion", nameKo: "경회루", nameJa: "慶会楼", lat: 37.5798, lng: 126.9760, triggerRadius: 30 }
    ]
  },
  customCreatedPins: []
};

// UI Localization Dictionary
const LocalizationDictionary = {
  pts: { en: 'pts', ko: '포인트', ja: 'ポイント' },
  active_guide_title: { en: '<i class="fa-solid fa-user-astronaut"></i> Active Guide', ko: '<i class="fa-solid fa-user-astronaut"></i> 현재 가이드', ja: '<i class="fa-solid fa-user-astronaut"></i> 現在のガイド' },
  intro_video: { en: '<i class="fa-solid fa-circle-play"></i> Intro Video', ko: '<i class="fa-solid fa-circle-play"></i> 소개 영상', ja: '<i class="fa-solid fa-circle-play"></i> 紹介動画' },
  greeting: { en: '<i class="fa-solid fa-volume-high"></i> Greeting', ko: '<i class="fa-solid fa-volume-high"></i> 인사말 듣기', ja: '<i class="fa-solid fa-volume-high"></i> あいさつ' },
  route_guide_list: { en: '<i class="fa-solid fa-map-location-dot"></i> Tour Locations', ko: '<i class="fa-solid fa-map-location-dot"></i> 투어 코스 목록', ja: '<i class="fa-solid fa-map-location-dot"></i> ツアー地点一覧' },
  walking: { en: '<i class="fa-solid fa-spinner fa-spin"></i> Walking...', ko: '<i class="fa-solid fa-spinner fa-spin"></i> 이동 중...', ja: '<i class="fa-solid fa-spinner fa-spin"></i> 移動中...' },
  audio_guide: { en: 'Audio Guide Triggered', ko: '음성 안내 시작', ja: '音声ガイド開始' },
  vlog_playing: { en: 'Vlog Video Playing...', ko: '브이로그 영상 재생 중...', ja: 'Vlog動画を再生中...' },
  blog_feed_title: { en: '<i class="fa-solid fa-book-open"></i> Travel Logs & Stories', ko: '<i class="fa-solid fa-book-open"></i> 여행 블로그 & 스토리', ja: '<i class="fa-solid fa-book-open"></i> 旅ログ＆ストーリー' },
  filter_all: { en: 'All', ko: '전체', ja: 'すべて' },
  filter_korea: { en: 'South Korea', ko: '대한민국', ja: '韓国' },
  filter_japan: { en: 'Japan', ko: '일본', ja: '日本' },
  filter_europe: { en: 'Europe', ko: '유럽', ja: 'ヨーロッパ' },
  scratch_title: { en: '<i class="fa-solid fa-ticket"></i> Scratch Off Coupon', ko: '<i class="fa-solid fa-ticket"></i> 할인 쿠폰 스크래치', ja: '<i class="fa-solid fa-ticket"></i> スクラッチクーポン' },
  scratch_desc: { en: 'Scratch the silver card to unlock your travel discount!', ko: '은색 표면을 손가락/마우스로 문질러 여행 할인 쿠폰을 획득하세요!', ja: '銀色の面をこすって旅行割引クーポンを獲得しましょう！' },
  scratch_reset: { en: '<i class="fa-solid fa-rotate-right"></i> Try New Scratch (Cost: 50 pts)', ko: '<i class="fa-solid fa-rotate-right"></i> 새 스크래치 도전 (50P 차감)', ja: '<i class="fa-solid fa-rotate-right"></i> 新しいスクラッチに挑戦（50P）' },
  spin_title: { en: '<i class="fa-solid fa-circle-notch"></i> Daily Travel Spin', ko: '<i class="fa-solid fa-circle-notch"></i> 일일 룰렛 이벤트', ja: '<i class="fa-solid fa-circle-notch"></i> デイリートラベルルーレット' },
  spin_desc: { en: 'Spin the wheel to win coupons, travel points, or gifts!', ko: '룰렛을 돌려 할인 쿠폰, 여행 포인트 및 특별 경품을 받으세요!', ja: 'ルーレットを回してクーポン、旅ポイント、特別ギフトを獲得しましょう！' },
  events_calendar_title: { en: '<i class="fa-solid fa-calendar-days"></i> Global Travel Events & Quests', ko: '<i class="fa-solid fa-calendar-days"></i> 글로벌 이벤트 & 오프라인 퀘스트', ja: '<i class="fa-solid fa-calendar-days"></i> グローバルイベント＆オフラインクエスト' },
  my_coupons_title: { en: '<i class="fa-solid fa-box-archive"></i> My Coupon Wallet', ko: '<i class="fa-solid fa-box-archive"></i> 내 쿠폰 지갑', ja: '<i class="fa-solid fa-box-archive"></i> マイクーポンウォレット' },
  empty_wallet: { en: 'No coupons claimed yet. Scratch cards or spin the wheel to win!', ko: '보유한 쿠폰이 없습니다. 스크래치와 룰렛에서 획득해 보세요!', ja: 'まだクーポンがありません。スクラッチやルーレットで獲得しましょう！' },
  builder_title: { en: '<i class="fa-solid fa-route"></i> Map Tour Guide Builder', ko: '<i class="fa-solid fa-route"></i> 지도 투어 가이드 빌더', ja: '<i class="fa-solid fa-route"></i> 地図ツアーガイドビルダー' },
  builder_desc: { en: 'Create your own customized guide! Click points directly on the Map tab to log coordinates, then upload audio tracks or write guidance scripts here.', ko: '나만의 맞춤 가이드를 만드세요! 지도 탭을 클릭하여 핀을 생성한 뒤, 음성 파일을 녹음하거나 스크립트를 작성하여 가이드로 퍼블리싱해보세요.', ja: '自分だけのカスタムガイドを作りましょう！地図タブでピンを置き、音声や案内文を登録できます。' },
  builder_tour_name: { en: 'Tour Guide Name', ko: '투어 가이드 이름', ja: 'ツアーガイド名' },
  builder_select_coords: { en: 'Selected Map Pins', ko: '선택된 지도 핀 목록', ja: '選択した地図ピン' },
  no_pins_placeholder: { en: 'Go to Map Tab and click on the map to place pins!', ko: '지도 탭으로 이동하여 원하는 위치를 클릭해 핀을 배치하세요!', ja: '地図タブで好きな場所をクリックしてピンを配置してください！' },
  save_tour: { en: '<i class="fa-solid fa-floppy-disk"></i> Publish Custom Guide', ko: '<i class="fa-solid fa-floppy-disk"></i> 가이드 정식 등록하기', ja: '<i class="fa-solid fa-floppy-disk"></i> カスタムガイドを公開' },
  clear_pins: { en: '<i class="fa-solid fa-trash-can"></i> Reset Pins', ko: '<i class="fa-solid fa-trash-can"></i> 선택 핀 초기화', ja: '<i class="fa-solid fa-trash-can"></i> ピンをリセット' },
  recorder_title: { en: '<i class="fa-solid fa-microphone-lines"></i> Interactive Guide Voice Recorder', ko: '<i class="fa-solid fa-microphone-lines"></i> 가이드 음성 녹음 스튜디오', ja: '<i class="fa-solid fa-microphone-lines"></i> ガイド音声録音スタジオ' },
  recorder_desc: { en: 'Record detailed guidance audio matching your active pins. Follow templates to create quick alerts.', ko: '등록한 핀 위치에 도달했을 때 재생될 자세한 음성을 녹음하세요. 아래 템플릿 문구를 읽으시면 쉽습니다.', ja: '登録したピンの場所で再生される案内音声を録音できます。下のテンプレートを読むだけでも作れます。' },
  recorder_ready: { en: 'Click Mic to Start Recording', ko: '마이크 버튼을 클릭하여 녹음 시작', ja: 'マイクをクリックして録音開始' },
  script_start: { en: '"Starting Tour!"', ko: '"자~ 출발!"', ja: '"さあ、出発！"' },
  script_turn: { en: '"Go Left Here..."', ko: '"이쪽으로 가세요."', ja: '"ここを左へ進んでください。"' },
  script_eat: { en: '"Best Bistro is here!"', ko: '"여기서 특별 할인을 받으세요!"', ja: '"ここで特別割引を受けられます！"' },
  script_morning: { en: '"Good Morning!"', ko: '"일어날 시간이에요~"', ja: '"おはようございます！"' },
  market_title: { en: '<i class="fa-solid fa-cart-shopping"></i> Voice Sample Market', ko: '<i class="fa-solid fa-cart-shopping"></i> 가이드 보이스 마켓', ja: '<i class="fa-solid fa-cart-shopping"></i> ガイドボイスマーケット' },
  market_desc: { en: 'Don\'t want to record your own voice? Purchase high-quality synthesized voice packages to read your scripts automatically.', ko: '목소리 녹음이 어렵다면 마켓의 다국어 보이스 팩을 구매하여 가이드 북을 완성해보세요!', ja: '自分の声を録音しにくい場合は、多言語ボイスパックでガイドを完成できます。' },
  media_storage_title: { en: '<i class="fa-brands fa-github"></i> GitHub Media Storage', ko: '<i class="fa-brands fa-github"></i> GitHub 미디어 저장소', ja: '<i class="fa-brands fa-github"></i> GitHubメディア保存先' },
  media_storage_desc: { en: 'Save generated audio/video as playable compressed media files directly in the Travelog GitHub repository.', ko: '생성된 음성/영상 소스를 ZIP이 아닌 재생 가능한 압축 미디어 파일로 GitHub 저장소에 직접 저장합니다.', ja: '生成された音声・動画ソースをZIPではなく、再生可能な圧縮メディアファイルとしてGitHubに直接保存します。' },
  media_storage_repo: { en: 'Repository', ko: '저장소', ja: 'リポジトリ' },
  media_storage_audio_path: { en: 'Audio path', ko: '음성 저장 경로', ja: '音声保存先' },
  media_storage_video_path: { en: 'Video path', ko: '영상 저장 경로', ja: '動画保存先' },
  media_storage_token_status: { en: 'Token status', ko: '토큰 상태', ja: 'トークン状態' },
  media_storage_token_label: { en: 'GitHub token for test upload', ko: '테스트 업로드용 GitHub 토큰', ja: 'テストアップロード用GitHubトークン' },
  media_storage_warning: { en: 'For prototype testing only. Do not commit your token into GitHub files.', ko: '프로토타입 테스트용입니다. 토큰을 GitHub 파일에 직접 올리면 안 됩니다.', ja: 'プロトタイプテスト用です。トークンをGitHubファイルに直接コミットしないでください。' },
  media_storage_save_token: { en: 'Save Token', ko: '토큰 저장', ja: 'トークン保存' },
  media_storage_clear_token: { en: 'Clear', ko: '삭제', ja: '削除' },
  media_storage_test: { en: 'Test', ko: '연결 테스트', ja: '接続テスト' },
  media_storage_audio_file: { en: 'Audio file test', ko: '음성 파일 테스트', ja: '音声ファイルテスト' },
  media_storage_video_file: { en: 'Video file test', ko: '영상 파일 테스트', ja: '動画ファイルテスト' },
  media_storage_upload_audio: { en: 'Upload Audio Source', ko: '음성 소스 직접 업로드', ja: '音声ソース直接アップロード' },
  media_storage_upload_video: { en: 'Upload Video Source', ko: '영상 소스 직접 업로드', ja: '動画ソース直接アップロード' },
  quest_active: { en: 'Active Quest', ko: '진행 중인 퀘스트', ja: '進行中のクエスト' },
  quest_steps_title: { en: '<i class="fa-solid fa-list-check"></i> Quest Milestones', ko: '<i class="fa-solid fa-list-check"></i> 퀘스트 미션 단계', ja: '<i class="fa-solid fa-list-check"></i> クエスト進行ステップ' },
  radar_title: { en: '<i class="fa-solid fa-satellite-dish"></i> GPS Proximity Radar', ko: '<i class="fa-solid fa-satellite-dish"></i> GPS 근접 레이더', ja: '<i class="fa-solid fa-satellite-dish"></i> GPS近接レーダー' },
  radar_desc: { en: 'Simulate walking on the Map tab to get closer to the coordinate clues. When inside 10m, clues unlock!', ko: '지도 탭에서 경로 이동 시뮬레이션을 시작하여 단서에 가까워지세요. 10m 내로 들어오면 봉인이 풀립니다!', ja: '地図タブで移動シミュレーションを行い、手がかりの座標に近づきましょう。10m以内で解除されます！' },
  clue_unlocked_title: { en: '<i class="fa-solid fa-lock-open"></i> Clue Location Reached!', ko: '<i class="fa-solid fa-lock-open"></i> 단서 장소 도달 완료!', ja: '<i class="fa-solid fa-lock-open"></i> 手がかり地点に到着！' },
  solve: { en: 'Solve', ko: '정답 확인', ja: '回答' },
  radar_clue_hint: { en: 'Proceed to the active map icon marked in Pink to trigger coordinates.', ko: '지도상의 분홍색 퀘스트 마커로 다가가 음성 단서 알림을 받으세요.', ja: '地図上のピンク色のクエストマーカーに近づくと、音声の手がかりが表示されます。' },
  teleport_btn: { en: '<i class="fa-solid fa-bolt"></i> Teleport to Clue GPS Spot', ko: '<i class="fa-solid fa-bolt"></i> 단서 위치로 바로 순간이동', ja: '<i class="fa-solid fa-bolt"></i> 手がかり地点へ移動' },

  // Onboarding & profile setup
  onboarding_step_login: { en: 'Step 1 of 2 · Sign in', ko: '1/2단계 · 시작하기', ja: '1/2ステップ · はじめる' },
  onboarding_step_profile: { en: 'Step 2 of 2 · Profile', ko: '2/2단계 · 프로필 만들기', ja: '2/2ステップ · プロフィール作成' },
  onboarding_title: { en: 'Welcome to Travelog', ko: 'Travelog에 오신 걸 환영해요', ja: 'Travelogへようこそ' },
  onboarding_subtitle: { en: 'Follow local guides, unlock map-based stories, and collect travel rewards.', ko: '지도 위 가이드, 여행 이야기, 쿠폰 보상을 한 번에 연결해요.', ja: 'ローカルガイド、地図上のストーリー、旅の特典をひとつにつなげます。' },
  login_google: { en: 'Continue with Google', ko: 'Google로 계속하기', ja: 'Googleで続ける' },
  login_naver: { en: 'Continue with Naver', ko: '네이버로 계속하기', ja: 'NAVERで続ける' },
  login_email: { en: 'Continue with Email', ko: '이메일로 계속하기', ja: 'メールで続ける' },
  login_guest: { en: 'Try as Guest', ko: '게스트로 먼저 둘러보기', ja: 'ゲストとして見る' },
  onboarding_privacy_hint: { en: 'This prototype does not send login data. It only moves to the next setup step.', ko: '현재 프로토타입에서는 실제 로그인 정보를 전송하지 않고 다음 설정 단계로 이동합니다.', ja: 'このプロトタイプではログイン情報を送信せず、次の設定ステップへ進むだけです。' },
  onboarding_feature_guide: { en: 'GPS audio guide', ko: 'GPS 음성 가이드', ja: 'GPS音声ガイド' },
  onboarding_feature_reward: { en: 'Coupons & quests', ko: '쿠폰과 퀘스트', ja: 'クーポン＆クエスト' },
  onboarding_feature_creator: { en: 'Creator studio', ko: '가이드 제작 스튜디오', ja: 'ガイド制作スタジオ' },
  onboarding_profile_title: { en: 'Set Up Your Profile', ko: '프로필을 만들어주세요', ja: 'プロフィールを設定' },
  onboarding_profile_subtitle: { en: 'Choose a nickname and avatar before exploring.', ko: '여행 기록에 사용할 닉네임과 아바타를 정해주세요.', ja: '旅ログで使うニックネームとアバターを選びましょう。' },
  avatar_hint: { en: 'Choose preset or upload custom photo', ko: '기본 아이콘을 고르거나 사진을 올릴 수 있어요', ja: 'アイコンを選ぶか写真をアップロードできます' },
  nickname_label: { en: 'Create Nickname', ko: '닉네임 만들기', ja: 'ニックネームを作成' },
  nickname_placeholder: { en: 'e.g. wanderer', ko: '예: 여행고래', ja: '例：旅くじら' },
  nickname_check: { en: 'Verify', ko: '확인', ja: '確認' },
  start_exploring: { en: 'Start Exploring!', ko: 'Travelog 시작하기', ja: 'Travelogを始める' },
  back_to_login: { en: 'Back', ko: '이전', ja: '戻る' },
  profile_manage_badge: { en: 'Profile Manager', ko: '프로필 관리', ja: 'プロフィール管理' },
  profile_manage_title: { en: 'Manage My Profile', ko: '내 프로필 관리', ja: 'マイプロフィール管理' },
  profile_manage_desc: { en: 'Change your nickname, personal photo, uploaded image, or sample avatar anytime.', ko: '닉네임과 내 사진, 이미지, 임시 아바타를 언제든지 바꿀 수 있어요.', ja: 'ニックネーム、写真、画像、サンプルアバターをいつでも変更できます。' },
  profile_use_my_photo: { en: 'Choose My Photo / Image', ko: '내 사진/이미지 선택', ja: '自分の写真・画像を選択' },
  profile_image_note: { en: 'For this prototype, the image is saved only in this browser.', ko: '사진은 이 브라우저에만 저장되는 프로토타입용 데이터입니다.', ja: 'このプロトタイプでは画像はこのブラウザ内にのみ保存されます。' },
  profile_nickname_label: { en: 'Nickname', ko: '닉네임', ja: 'ニックネーム' },
  profile_temp_image_title: { en: 'Choose a Sample Avatar', ko: '임시 이미지 선택', ja: 'サンプル画像を選択' },
  profile_emoji_title: { en: 'Choose a Simple Icon', ko: '간단 아이콘 선택', ja: 'シンプルアイコンを選択' },
  profile_reset_onboarding: { en: 'Restart Setup', ko: '처음 설정 다시하기', ja: '初期設定をやり直す' },
  profile_cancel: { en: 'Cancel', ko: '취소', ja: 'キャンセル' },
  profile_save: { en: 'Save Profile', ko: '저장하기', ja: '保存する' },
  profile_saved_toast: { en: 'Profile updated!', ko: '프로필이 저장되었습니다!', ja: 'プロフィールを保存しました！' },
  profile_open_toast: { en: 'Opening profile manager...', ko: '프로필 관리 화면을 엽니다.', ja: 'プロフィール管理を開きます。' },

  // Real GPS & location memo
  gps_waiting: { en: 'Waiting for GPS...', ko: 'GPS 대기 중...', ja: 'GPS待機中...' },
  gps_locating: { en: 'Finding my location...', ko: '내 위치를 찾는 중...', ja: '現在地を取得中...' },
  gps_my_location: { en: 'My current location', ko: '내 현재 위치', ja: '現在地' },
  memo_modal_title: { en: 'Leave a Memo Here', ko: '이 위치에 메모 남기기', ja: 'この場所にメモを残す' },
  memo_modal_desc: { en: 'Save a short note at your current GPS location.', ko: '현재 GPS 위치에 짧은 텍스트 메모를 저장합니다.', ja: '現在のGPS位置に短いテキストメモを保存します。' },
  memo_text_placeholder: { en: 'Write a memo for this place...', ko: '이 장소에 남길 메모를 적어주세요...', ja: 'この場所に残すメモを書いてください...' },
  memo_cancel: { en: 'Cancel', ko: '취소', ja: 'キャンセル' },
  memo_save: { en: 'Save Memo', ko: '메모 저장', ja: 'メモを保存' },
  nav_map: { en: 'Map', ko: '지도', ja: '地図' },
  nav_explore: { en: 'Explore', ko: '피드', ja: 'フィード' },
  nav_rewards: { en: 'Rewards', ko: '쿠폰&이벤트', ja: '特典＆イベント' },
  nav_creator: { en: 'Creator', ko: '스튜디오', ja: 'スタジオ' },
  share: { en: 'Share', ko: '공유', ja: '共有' },
  search_placeholder: { en: 'Search logs...', ko: '여행기 검색...', ja: '旅ログを検索...' },
  puzzle_placeholder: { en: 'Enter password/answer...', ko: '암호 또는 정답 입력...', ja: '暗号または答えを入力...' }
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
  if (window.TravelogMediaStorageModule && typeof window.TravelogMediaStorageModule.init === 'function') {
    window.TravelogMediaStorageModule.init();
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
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'];
const NEXT_LANGUAGE_LABELS = { ko: 'English', en: '日本語', ja: '한국어' };

function normalizeLanguage(lang) {
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'ko';
}

function getNextLanguage(lang) {
  const currentIndex = SUPPORTED_LANGUAGES.indexOf(normalizeLanguage(lang));
  return SUPPORTED_LANGUAGES[(currentIndex + 1) % SUPPORTED_LANGUAGES.length];
}

function localizedText(ko, en, ja) {
  const lang = normalizeLanguage(TravelogState.language);
  if (lang === 'ja') return ja || en || ko;
  if (lang === 'en') return en || ko || ja;
  return ko || en || ja;
}

function localizedField(source, baseKey) {
  const suffix = normalizeLanguage(TravelogState.language) === 'ja' ? 'Ja' : normalizeLanguage(TravelogState.language) === 'en' ? 'En' : 'Ko';
  return source?.[`${baseKey}${suffix}`] || source?.[`${baseKey}En`] || source?.[`${baseKey}Ko`] || source?.[`${baseKey}Ja`] || '';
}

function initLanguageToggle() {
  const langBtn = document.getElementById('lang-toggle-btn');
  if (!langBtn) return;

  langBtn.addEventListener('click', () => {
    setLanguage(getNextLanguage(TravelogState.language));
  });
}

function setLanguage(lang) {
  const nextLanguage = normalizeLanguage(lang);
  TravelogState.language = nextLanguage;
  document.documentElement.lang = nextLanguage;
  
  // Update header text: button shows the next language users can switch to
  const currentLangText = document.getElementById('current-lang');
  if (currentLangText) {
    currentLangText.textContent = NEXT_LANGUAGE_LABELS[nextLanguage];
  }
  
  // Update HTML elements with data-localize
  document.querySelectorAll('[data-localize]').forEach(el => {
    const key = el.getAttribute('data-localize');
    if (LocalizationDictionary[key]) {
      el.innerHTML = LocalizationDictionary[key][nextLanguage] || LocalizationDictionary[key].en || LocalizationDictionary[key].ko || '';
    }
  });

  // Update input placeholders
  document.querySelectorAll('[data-localize-placeholder]').forEach(el => {
    const key = el.getAttribute('data-localize-placeholder');
    if (LocalizationDictionary[key]) {
      el.placeholder = LocalizationDictionary[key][nextLanguage] || LocalizationDictionary[key].en || LocalizationDictionary[key].ko || '';
    }
  });

  renderProfileSampleAvatars();
  renderUserProfileWidget();

  // Notify modules of language change
  triggerModuleLanguageUpdate();
}

function triggerModuleLanguageUpdate() {
  const modules = [
    window.TravelogMapModule,
    window.TravelogExploreModule,
    window.TravelogRewardsModule,
    window.TravelogMediaStorageModule,
    window.TravelogCreatorModule,
    window.TravelogAdventureModule
  ];

  modules.forEach(mod => {
    if (mod && typeof mod.onLanguageChange === 'function') {
      mod.onLanguageChange(TravelogState.language);
    }
  });
}


// ==========================================
// Onboarding & Profile Flow
// ==========================================
const ONBOARDING_STORAGE_KEY = 'travelog_user_profile_v1';
const RESERVED_NICKNAMES = ['admin', 'travelog', 'guide', 'manager', 'test', '운영자', '관리자'];
const AVATAR_PRESETS = {
  sun: '☀️',
  wave: '🌊',
  leaf: '🍃',
  camera: '📷',
  compass: '🧭',
  mountain: '⛰️'
};

const PROFILE_SAMPLE_AVATARS = [
  { id: 'hanok', icon: '🏯', bg1: '#E28743', bg2: '#F2E58A', labelKo: '한옥', labelEn: 'Hanok', labelJa: '韓屋' },
  { id: 'compass', icon: '🧭', bg1: '#002855', bg2: '#70A2B7', labelKo: '나침반', labelEn: 'Compass', labelJa: 'コンパス' },
  { id: 'camera', icon: '📷', bg1: '#E91E63', bg2: '#E8B4B8', labelKo: '카메라', labelEn: 'Camera', labelJa: 'カメラ' },
  { id: 'mountain', icon: '⛰️', bg1: '#4A7F4D', bg2: '#AFD499', labelKo: '산길', labelEn: 'Mountain', labelJa: '山道' },
  { id: 'ocean', icon: '🌊', bg1: '#70A2B7', bg2: '#A8DFEC', labelKo: '바다', labelEn: 'Ocean', labelJa: '海' },
  { id: 'cafe', icon: '☕', bg1: '#9B6A45', bg2: '#F1D7B0', labelKo: '카페', labelEn: 'Cafe', labelJa: 'カフェ' },
  { id: 'train', icon: '🚆', bg1: '#002855', bg2: '#E28743', labelKo: '기차', labelEn: 'Train', labelJa: '電車' },
  { id: 'night', icon: '🌙', bg1: '#1A2340', bg2: '#8EA8C3', labelKo: '야경', labelEn: 'Night', labelJa: '夜景' }
];

let verifiedNickname = '';
let profileManagerDraft = null;

function initOnboarding() {
  loadSavedProfile();
  bindOnboardingEvents();
  renderUserProfileWidget();

  if (TravelogState.userProfile.isOnboarded) {
    hideOnboardingOverlay(true);
  } else {
    showOnboardingScreen('login');
  }
}

function bindOnboardingEvents() {
  const loginButtons = [
    { id: 'login-google-btn', provider: 'Google' },
    { id: 'login-naver-btn', provider: 'Naver' },
    { id: 'login-email-btn', provider: 'Email' },
    { id: 'login-guest-btn', provider: 'Guest' }
  ];

  loginButtons.forEach(({ id, provider }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      TravelogState.userProfile.authProvider = provider;
      showOnboardingScreen('profile');
      focusNicknameInput();
    });
  });

  const backBtn = document.getElementById('onboarding-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => showOnboardingScreen('login'));
  }

  const nicknameInput = document.getElementById('onboarding-nickname-input');
  const nicknameCheckBtn = document.getElementById('nickname-check-btn');
  const startBtn = document.getElementById('start-app-btn');

  if (nicknameInput) {
    nicknameInput.addEventListener('input', () => {
      verifiedNickname = '';
      startBtn.disabled = true;
      hideNicknameFeedback();
    });

    nicknameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyNickname();
      }
    });
  }

  if (nicknameCheckBtn) {
    nicknameCheckBtn.addEventListener('click', verifyNickname);
  }

  if (startBtn) {
    startBtn.addEventListener('click', completeOnboarding);
  }

  document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      selectAvatarPreset(preset);
    });
  });

  const fileInput = document.getElementById('onboarding-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleAvatarUpload);
  }

  bindProfileManagerEvents();
  renderProfileSampleAvatars();
}

function showOnboardingScreen(screenName) {
  const loginScreen = document.getElementById('onboarding-screen-login');
  const profileScreen = document.getElementById('onboarding-screen-profile');
  if (!loginScreen || !profileScreen) return;

  loginScreen.classList.toggle('active', screenName === 'login');
  profileScreen.classList.toggle('active', screenName === 'profile');
}

function focusNicknameInput() {
  window.setTimeout(() => {
    const input = document.getElementById('onboarding-nickname-input');
    if (input) input.focus();
  }, 120);
}

function createSampleAvatarDataUri(sample) {
  const safeIcon = escapeHtml(sample.icon);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${sample.bg1}"/>
          <stop offset="100%" stop-color="${sample.bg2}"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="rgba(0,0,0,0.22)"/>
        </filter>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#g)"/>
      <circle cx="116" cy="34" r="34" fill="rgba(255,255,255,0.24)"/>
      <circle cx="42" cy="122" r="42" fill="rgba(255,255,255,0.14)"/>
      <text x="80" y="96" text-anchor="middle" font-size="58" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" filter="url(#shadow)">${safeIcon}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\'': '&#39;',
    '"': '&quot;'
  }[char]));
}

function getSampleAvatarById(id) {
  return PROFILE_SAMPLE_AVATARS.find(item => item.id === id) || PROFILE_SAMPLE_AVATARS[0];
}

function getSampleAvatarData(id) {
  const sample = getSampleAvatarById(id);
  return createSampleAvatarDataUri(sample);
}

function getLocalizedSampleLabel(sample) {
  return localizedField(sample, 'label') || sample.labelEn || sample.id;
}

function cloneProfile(profile) {
  return JSON.parse(JSON.stringify(profile || TravelogState.userProfile));
}

function applyAvatarToElements(profile, avatarEl, emojiEl) {
  if (!avatarEl) return;

  const currentProfile = profile || TravelogState.userProfile;
  const avatarType = currentProfile.avatarType || 'emoji';
  const avatarValue = currentProfile.avatarValue || '☀️';

  if (avatarType === 'image' || avatarType === 'presetImage') {
    avatarEl.style.backgroundImage = `url(${avatarValue})`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    if (emojiEl) {
      emojiEl.style.display = 'none';
      emojiEl.textContent = '';
    } else {
      avatarEl.innerHTML = '';
    }
    return;
  }

  avatarEl.style.backgroundImage = 'none';
  if (emojiEl) {
    emojiEl.style.display = 'block';
    emojiEl.textContent = avatarValue;
  } else {
    avatarEl.innerHTML = `<span>${avatarValue}</span>`;
  }
}

function setActiveAvatarControls(profile) {
  const currentProfile = profile || TravelogState.userProfile;
  const activePresetId = currentProfile.avatarPresetId || '';

  document.querySelectorAll('.sample-avatar-option').forEach(btn => {
    btn.classList.toggle('active', currentProfile.avatarType === 'presetImage' && btn.getAttribute('data-avatar-id') === activePresetId);
  });

  document.querySelectorAll('.profile-preset-btn').forEach(btn => {
    btn.classList.toggle('active', currentProfile.avatarType === 'emoji' && btn.getAttribute('data-profile-preset') === activePresetId);
  });
}

function renderProfileSampleAvatars() {
  const grid = document.getElementById('profile-sample-avatar-grid');
  if (!grid) return;

  const activePresetId = profileManagerDraft?.avatarPresetId || TravelogState.userProfile.avatarPresetId || '';
  const activeType = profileManagerDraft?.avatarType || TravelogState.userProfile.avatarType;

  grid.innerHTML = PROFILE_SAMPLE_AVATARS.map(sample => {
    const imageData = createSampleAvatarDataUri(sample);
    const label = getLocalizedSampleLabel(sample);
    const isActive = activeType === 'presetImage' && activePresetId === sample.id;
    return `
      <button class="sample-avatar-option ${isActive ? 'active' : ''}" type="button" data-avatar-id="${sample.id}">
        <span class="sample-avatar-thumb" style="background-image:url('${imageData}')"></span>
        <span>${label}</span>
      </button>`;
  }).join('');
}

function updateProfileManagerPreview() {
  if (!profileManagerDraft) return;
  applyAvatarToElements(
    profileManagerDraft,
    document.getElementById('profile-manager-avatar-preview'),
    document.getElementById('profile-manager-avatar-emoji')
  );
  setActiveAvatarControls(profileManagerDraft);
}

function selectAvatarPreset(preset) {
  const emoji = AVATAR_PRESETS[preset] || AVATAR_PRESETS.sun;
  TravelogState.userProfile.avatarType = 'emoji';
  TravelogState.userProfile.avatarValue = emoji;
  TravelogState.userProfile.avatarPresetId = preset;

  document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-preset') === preset);
  });

  applyAvatarToElements(
    TravelogState.userProfile,
    document.getElementById('avatar-preview-circle'),
    document.getElementById('avatar-preview-emoji')
  );
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleAvatarUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showNicknameFeedback(localizedText('이미지 파일만 올릴 수 있어요.', 'Please upload an image file.', '画像ファイルのみアップロードできます。'), false);
    return;
  }

  readImageFileAsDataUrl(file)
    .then((imageData) => {
      TravelogState.userProfile.avatarType = 'image';
      TravelogState.userProfile.avatarValue = imageData;
      TravelogState.userProfile.avatarPresetId = null;

      document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => btn.classList.remove('active'));

      applyAvatarToElements(
        TravelogState.userProfile,
        document.getElementById('avatar-preview-circle'),
        document.getElementById('avatar-preview-emoji')
      );
    })
    .catch(() => {
      showNicknameFeedback(localizedText('이미지를 불러오지 못했어요.', 'Could not load the image.', '画像を読み込めませんでした。'), false);
    });
}

function validateNicknameValue(nickname) {
  if (nickname.length < 2 || nickname.length > 16) {
    return {
      ok: false,
      message: localizedText('닉네임은 2~16자로 입력해주세요.', 'Nickname must be 2–16 characters.', 'ニックネームは2〜16文字で入力してください。')
    };
  }

  if (!/^[a-zA-Z0-9가-힣ぁ-んァ-ン一-龥ー_\s-]+$/.test(nickname)) {
    return {
      ok: false,
      message: localizedText('한글, 영문, 일본어, 숫자, 공백, -, _만 사용할 수 있어요.', 'Use Korean, English, Japanese, numbers, spaces, -, or _ only.', '韓国語・英字・日本語・数字・スペース・-・_のみ使用できます。')
    };
  }

  if (RESERVED_NICKNAMES.includes(nickname.toLowerCase())) {
    return {
      ok: false,
      message: localizedText('이미 사용 중인 닉네임이에요.', 'This nickname is already taken.', 'このニックネームはすでに使用されています。')
    };
  }

  return {
    ok: true,
    message: localizedText('사용 가능한 닉네임입니다!', 'Nickname is available!', '使用できるニックネームです！')
  };
}

function verifyNickname() {
  const input = document.getElementById('onboarding-nickname-input');
  const startBtn = document.getElementById('start-app-btn');
  if (!input || !startBtn) return false;

  const nickname = input.value.trim();
  const validation = validateNicknameValue(nickname);

  if (!validation.ok) {
    showNicknameFeedback(validation.message, false);
    startBtn.disabled = true;
    return false;
  }

  verifiedNickname = nickname;
  TravelogState.userProfile.nickname = nickname;
  startBtn.disabled = false;
  showNicknameFeedback(validation.message, true);
  return true;
}

function hideNicknameFeedback() {
  const feedback = document.getElementById('nickname-feedback');
  if (!feedback) return;
  feedback.style.display = 'none';
  feedback.classList.remove('success', 'error');
}

function showNicknameFeedback(message, isSuccess) {
  const feedback = document.getElementById('nickname-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.style.display = 'inline-block';
  feedback.classList.toggle('success', isSuccess);
  feedback.classList.toggle('error', !isSuccess);
}

function showProfileManagerFeedback(message, isSuccess) {
  const feedback = document.getElementById('profile-manager-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.style.display = 'inline-block';
  feedback.classList.toggle('success', isSuccess);
  feedback.classList.toggle('error', !isSuccess);
}

function hideProfileManagerFeedback() {
  const feedback = document.getElementById('profile-manager-feedback');
  if (!feedback) return;
  feedback.style.display = 'none';
  feedback.classList.remove('success', 'error');
}

function bindProfileManagerEvents() {
  const widget = document.getElementById('user-profile-widget');
  if (widget) {
    widget.addEventListener('click', openProfileManagerModal);
    widget.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProfileManagerModal();
      }
    });
  }

  const closeBtn = document.getElementById('profile-manager-close-btn');
  const cancelBtn = document.getElementById('profile-manager-cancel-btn');
  const modal = document.getElementById('profile-manager-modal');
  const uploadBtn = document.getElementById('profile-manager-upload-btn');
  const fileInput = document.getElementById('profile-manager-file-input');
  const saveBtn = document.getElementById('profile-manager-save-btn');
  const resetBtn = document.getElementById('profile-manager-reset-btn');
  const nicknameInput = document.getElementById('profile-manager-nickname-input');

  if (closeBtn) closeBtn.addEventListener('click', closeProfileManagerModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeProfileManagerModal);
  if (uploadBtn && fileInput) uploadBtn.addEventListener('click', () => fileInput.click());
  if (fileInput) fileInput.addEventListener('change', handleProfileManagerUpload);
  if (saveBtn) saveBtn.addEventListener('click', saveProfileManagerChanges);
  if (resetBtn) resetBtn.addEventListener('click', resetProfileSetup);

  if (nicknameInput) {
    nicknameInput.addEventListener('input', hideProfileManagerFeedback);
    nicknameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveProfileManagerChanges();
      }
    });
  }

  document.querySelectorAll('.profile-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-profile-preset');
      if (!profileManagerDraft || !preset) return;
      profileManagerDraft.avatarType = 'emoji';
      profileManagerDraft.avatarValue = AVATAR_PRESETS[preset] || AVATAR_PRESETS.sun;
      profileManagerDraft.avatarPresetId = preset;
      updateProfileManagerPreview();
      renderProfileSampleAvatars();
    });
  });

  const sampleGrid = document.getElementById('profile-sample-avatar-grid');
  if (sampleGrid) {
    sampleGrid.addEventListener('click', (e) => {
      const option = e.target.closest('.sample-avatar-option');
      if (!option || !profileManagerDraft) return;
      const sampleId = option.getAttribute('data-avatar-id');
      profileManagerDraft.avatarType = 'presetImage';
      profileManagerDraft.avatarValue = getSampleAvatarData(sampleId);
      profileManagerDraft.avatarPresetId = sampleId;
      updateProfileManagerPreview();
      renderProfileSampleAvatars();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProfileManagerModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeProfileManagerModal();
    }
  });
}

function openProfileManagerModal() {
  if (!TravelogState.userProfile.isOnboarded) return;
  const modal = document.getElementById('profile-manager-modal');
  const nicknameInput = document.getElementById('profile-manager-nickname-input');
  if (!modal) return;

  profileManagerDraft = cloneProfile(TravelogState.userProfile);
  if (!profileManagerDraft.avatarPresetId && profileManagerDraft.avatarType === 'emoji') {
    const presetMatch = Object.entries(AVATAR_PRESETS).find(([, emoji]) => emoji === profileManagerDraft.avatarValue);
    profileManagerDraft.avatarPresetId = presetMatch ? presetMatch[0] : 'sun';
  }

  if (nicknameInput) {
    nicknameInput.value = profileManagerDraft.nickname || '';
  }

  hideProfileManagerFeedback();
  renderProfileSampleAvatars();
  updateProfileManagerPreview();
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  window.setTimeout(() => {
    if (nicknameInput) nicknameInput.focus();
  }, 100);
}

function closeProfileManagerModal() {
  const modal = document.getElementById('profile-manager-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  profileManagerDraft = null;
}

function handleProfileManagerUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !profileManagerDraft) return;

  if (!file.type.startsWith('image/')) {
    showProfileManagerFeedback(localizedText('이미지 파일만 올릴 수 있어요.', 'Please upload an image file.', '画像ファイルのみアップロードできます。'), false);
    return;
  }

  readImageFileAsDataUrl(file)
    .then((imageData) => {
      profileManagerDraft.avatarType = 'image';
      profileManagerDraft.avatarValue = imageData;
      profileManagerDraft.avatarPresetId = null;
      updateProfileManagerPreview();
      renderProfileSampleAvatars();
      showProfileManagerFeedback(localizedText('이미지가 적용되었습니다. 저장을 눌러 완료하세요.', 'Image applied. Press Save to finish.', '画像を適用しました。保存を押して完了してください。'), true);
      event.target.value = '';
    })
    .catch(() => {
      showProfileManagerFeedback(localizedText('이미지를 불러오지 못했어요.', 'Could not load the image.', '画像を読み込めませんでした。'), false);
    });
}

function saveProfileManagerChanges() {
  if (!profileManagerDraft) return;
  const nicknameInput = document.getElementById('profile-manager-nickname-input');
  const nickname = nicknameInput ? nicknameInput.value.trim() : '';
  const validation = validateNicknameValue(nickname);

  if (!validation.ok) {
    showProfileManagerFeedback(validation.message, false);
    return;
  }

  TravelogState.userProfile = {
    ...TravelogState.userProfile,
    ...profileManagerDraft,
    nickname,
    isOnboarded: true
  };
  verifiedNickname = nickname;
  saveProfile();
  renderUserProfileWidget();
  closeProfileManagerModal();
  showToast(LocalizationDictionary.profile_saved_toast[TravelogState.language] || LocalizationDictionary.profile_saved_toast.ko);
}

function resetProfileSetup() {
  const confirmMessage = localizedText(
    '저장된 프로필을 지우고 처음 설정 화면으로 돌아갈까요?',
    'Remove the saved profile and return to the first setup screen?',
    '保存されたプロフィールを削除して初期設定画面に戻りますか？'
  );

  if (!window.confirm(confirmMessage)) return;

  try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch (error) {}
  TravelogState.userProfile = {
    isOnboarded: false,
    authProvider: null,
    nickname: '',
    avatarType: 'emoji',
    avatarValue: '☀️',
    avatarPresetId: 'sun'
  };
  verifiedNickname = '';
  closeProfileManagerModal();

  const widget = document.getElementById('user-profile-widget');
  if (widget) widget.style.display = 'none';

  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('closing');
    showOnboardingScreen('login');
  }
}

function completeOnboarding() {
  const input = document.getElementById('onboarding-nickname-input');
  const nickname = input ? input.value.trim() : '';

  if (!verifiedNickname || verifiedNickname !== nickname) {
    if (!verifyNickname()) return;
  }

  TravelogState.userProfile.nickname = verifiedNickname || nickname;
  TravelogState.userProfile.isOnboarded = true;
  saveProfile();
  renderUserProfileWidget();
  hideOnboardingOverlay(false);

  window.setTimeout(() => {
    if (window.TravelogMapModule && typeof window.TravelogMapModule.invalidateSize === 'function') {
      window.TravelogMapModule.invalidateSize();
    }
    showToast(localizedText(`${TravelogState.userProfile.nickname}님, 즐거운 여행을 시작해볼까요?`, `Welcome, ${TravelogState.userProfile.nickname}!`, `${TravelogState.userProfile.nickname}さん、楽しい旅を始めましょう！`));
  }, 500);
}

function hideOnboardingOverlay(skipAnimation) {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  if (skipAnimation) {
    overlay.style.display = 'none';
    return;
  }

  overlay.classList.add('closing');
  window.setTimeout(() => {
    overlay.style.display = 'none';
  }, 450);
}

function renderUserProfileWidget() {
  const widget = document.getElementById('user-profile-widget');
  const avatar = document.getElementById('header-avatar-container');
  const nickname = document.getElementById('header-nickname');
  const profile = TravelogState.userProfile;

  if (!widget || !avatar || !nickname) return;

  if (!profile.isOnboarded) {
    widget.style.display = 'none';
    return;
  }

  widget.style.display = 'flex';
  widget.title = localizedText('프로필 관리', 'Manage profile', 'プロフィール管理');
  nickname.textContent = profile.nickname || 'Traveler';
  applyAvatarToElements(profile, avatar, null);
}

function saveProfile() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(TravelogState.userProfile));
  } catch (error) {
    console.warn('Travelog profile could not be saved locally.', error);
  }
}

function loadSavedProfile() {
  try {
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!saved) return;

    const parsedProfile = JSON.parse(saved);
    TravelogState.userProfile = {
      ...TravelogState.userProfile,
      ...parsedProfile
    };

    if (!TravelogState.userProfile.avatarPresetId && TravelogState.userProfile.avatarType === 'emoji') {
      const presetMatch = Object.entries(AVATAR_PRESETS).find(([, emoji]) => emoji === TravelogState.userProfile.avatarValue);
      TravelogState.userProfile.avatarPresetId = presetMatch ? presetMatch[0] : 'sun';
    }
  } catch (error) {
    console.warn('Travelog profile could not be loaded locally.', error);
  }
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
  showToast(localizedText('포인트가 부족합니다!', 'Not enough points!', 'ポイントが足りません！'));
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
      z-index: 10000;
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
  resetOnboarding: () => {
    resetProfileSetup();
  },
  addPoints: addPoints,
  deductPoints: deductPoints,
  showToast: showToast,
  getLanguage: () => TravelogState.language,
  t: (ko, en, ja) => localizedText(ko, en, ja),
  pickLocalized: (source, baseKey) => localizedField(source, baseKey),
  claimCoupon: (coupon) => {
    TravelogState.ownedCoupons.push(coupon);
    if (window.TravelogRewardsModule && typeof window.TravelogRewardsModule.renderCouponWallet === 'function') {
      window.TravelogRewardsModule.renderCouponWallet();
    }
  }
};
