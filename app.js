// ==========================================
// Travelog Global Application Controller & State
// ==========================================

const TravelogState = {
  language: 'ko', // 'ko', 'en', or 'ja'
  points: 550,
  coins: 1250, // 트레블 코인 기본값
  ownedCoupons: [],
  userProfile: {
    isOnboarded: false,
    authProvider: null,
    nickname: '',
    avatarType: 'emoji',
    avatarValue: '☀️',
    avatarPresetId: 'sun'
  },
  // 사용자가 획득한 가이드 목록 및 위젯 노출 여부
  userGuides: [
    { id: 'guide-gyeongbok', name: '경복궁 역사/문화 가이드 투어', author: '민호 (로컬 가이드)', rating: '4.9', bg: 'assets/images/blogs/blog-seoul-history-food.svg', isWidget: true },
    { id: 'guide-kyoto', name: '교토 대나무숲 청정 힐링 걷기', author: '사쿠라 (로컬 가이드)', rating: '4.8', bg: 'assets/images/blogs/blog-kyoto-temple-bamboo.svg', isWidget: true },
    { id: 'guide-switzerland', name: '스위스 인터라켄 융프라우 코스', author: '한스 (스타 가이드)', rating: '5.0', bg: 'assets/images/blogs/blog-switzerland-interlaken.svg', isWidget: false },
    { id: 'guide-paris', name: '파리 센강 일몰 산책로', author: '소피 (스타 가이드)', rating: '4.9', bg: 'assets/images/explore/vlog-paris-seine-sunset.svg', isWidget: false }
  ],
  messages: [
    { id: 1, sender: '로컬 가이드 민호', date: '2026-07-21', body: '안녕하세요! 경복궁 가이드 투어에 참여해주셔서 감사합니다. 도움이 필요하시면 언제든 쪽지 주세요!', unread: true },
    { id: 2, sender: '여행고래 (스타 가이드)', date: '2026-07-20', body: '수원 화성 퀘스트 꿀팁 알려드립니다! 북문 근처 매점 뒤의 힌트를 찾아보세요.', unread: true },
    { id: 3, sender: '트레블로그 시스템', date: '2026-07-19', body: '신규 가입 환영! 무료 1,250 코인이 지급되었습니다.', unread: false }
  ],
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
  customCreatedPins: [],
  mapMode: 'explore'
};

// UI Localization Dictionary
const LocalizationDictionary = {
  pts: { en: 'pts', ko: '포인트', ja: 'ポイント' },
  nav_home: { en: 'Home', ko: '홈', ja: 'ホーム' },
  home_welcome: { en: 'Welcome!', ko: '반갑습니다!', ja: 'ようこそ！' },
  home_coin_balance: { en: 'Travel Coin Balance', ko: '보유 트레블 코인', ja: '保有トラベルコイン' },
  home_charge_ad: { en: 'Ad Charge (+50)', ko: '광고 충전 (+50)', ja: '広告チャージ (+50)' },
  home_charge_pay: { en: 'Store', ko: '유료 충전', ja: '有料チャージ' },
  home_widget_title: { en: 'My Guide Chest', ko: '내 가이드 보관함 (위젯)', ja: 'マイガイド保管箱 (ウィジェット)' },
  home_widget_edit: { en: 'Edit Widgets', ko: '위젯 편집', ja: 'ウィジェット編集' },
  home_widget_desc: { en: 'Add or remove quick launch widgets of purchased or event guides.', ko: '구매 또는 선물받은 여행 가이드 중 자주 보거나 보관하고 싶은 가이드 위젯을 더하고 뺄 수 있습니다.', ja: '購入または獲得したガイドのうち、ホーム에 배치할 위젯을 설정할 수 있습니다.' },
  home_rec_title: { en: 'Recommended Guides', ko: '추천 가이드', ja: 'おすすめのガイド' },
  home_today_title: { en: "Today's Logs", ko: '오늘의 가이드 (오늘의 로그)', ja: '今日のログ（おすすめガイド）' },
  home_today_info: { en: '30-Day selection block applied', ko: '오로 30일 룰 적용', ja: '30日ローテーション適用' },
  home_star_title: { en: 'Star Guides', ko: '스타 가이드', ja: 'スターガイド' },
  home_event_title: { en: 'Event & Quest Guides', ko: '이벤트 및 퀘스트 가이드', ja: 'イベント＆クエストガイド' },
  ad_promo_1: { en: 'Jeju Air Earlybird tickets open! 10% Extra Discount ✈️', ko: '제주항공 특별 공동구매 티켓 오픈! 즉시 10% 추가 할인 ✈️', ja: 'チェジュ航空アーリーバードオープン！10%追加割引 ✈️' },
  ad_promo_2: { en: 'Travelog Pass: Unlimited audio guides 👑', ko: '트레블로그 패스 구독 시 글로벌 도슨트 오디오 가이드 무제한 무료 👑', ja: 'Travelogパス購読でグローバル音声ガイドが完全無料 👑' },
  ad_promo_3: { en: 'Suwon Hwaseong Quest: Complete to get Starbucks Coupon 🎁', ko: '수원 화성 성곽 보물찾기 퀘스트 완료 시 즉시 편의점 5천원권 100% 지급 🎁', ja: '水原華城クエスト完了でコンビニ500円券プレゼント 🎁' },
  msg_badge: { en: 'Inbox', ko: '쪽지함', ja: 'メッセージ' },
  msg_title: { en: 'My Inbox', ko: '받은 쪽지함', ja: 'メッセージボックス' },
  msg_desc: { en: 'Messages from guides and system.', ko: '로컬 가이드와 시스템에서 보낸 소식입니다.', ja: 'ガイドやシステムからのメッセージです。' },
  confirm: { en: 'Confirm', ko: '확인', ja: '確認' },
  ad_sim_title: { en: 'Sponsor Ad Playing', ko: '스폰서 광고 재생 중', ja: 'スポンサー広告再生中' },
  ad_sim_desc: { en: 'Earn 50 coins after watching the full ad.', ko: '광고를 끝까지 시청하시면 50 트레블 코인이 지급됩니다.', ja: '最後まで視聴すると50コインがプレゼントされます。' },
  ad_skip: { en: 'Close', ko: '닫기', ja: '閉じる' },
  pay_badge: { en: 'Coin Shop', ko: '코인 숍', ja: 'コインショップ' },
  pay_title: { en: 'Buy Travel Coins', ko: '트레블 코인 유료 충전', ja: 'トラベルコイン有料チャージ' },
  pay_desc: { en: 'Spend on premium audio guides.', ko: '프리미엄 로컬 오디오 가이드 구입에 사용하세요.', ja: 'プレミアム音声ガイドの購入に使えます。' },
  widget_badge: { en: 'Home Widgets', ko: '홈 위젯 설정', ja: 'ホームウィジェット設定' },
  widget_config_title: { en: 'Edit Widgets', ko: '보관함 위젯 편집', ja: '保管箱ウィジェット編集' },
  widget_config_desc: { en: 'Choose which guides to show on Home dashboard.', ko: '홈 화면의 빠른 보관함에 노출할 가이드를 체크하세요.', ja: '홈 화면의 빠른 보관함에 노출할 가이드를 체크하세요.' },
  widget_limit_hint: { en: 'Max 4 recommended', ko: '최대 4개까지 노출 권장', ja: '最大4個までの表示を推奨' },
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
  gdrive_storage_title: { en: '<i class="fa-brands fa-google-drive"></i> Google Drive Storage', ko: '<i class="fa-brands fa-google-drive"></i> 구글 드라이브 오픈 저장소', ja: '<i class="fa-brands fa-google-drive"></i> Googleドライブオープン保存先' },
  gdrive_storage_desc: { en: 'Upload recorded guides, scripts, and video guides to your Google Drive open folder.', ko: '스튜디오에서 제작한 음성 가이드(오디오), 코스 설명(메모), 비디오 파일을 공유 드라이브 오픈 폴더로 즉시 업로드하세요.', ja: 'スタジオで制作した音声ガイド、コース説明、動画ファイルをGoogleドライブのオープンフォルダにアップロードします。' },
  gdrive_owner: { en: 'Storage Owner', ko: '저장소 소유자', ja: '保存先所有者' },
  gdrive_dest: { en: 'Target Folder', ko: '대상 폴더', ja: '対象フォルダ' },
  gdrive_open_btn: { en: 'Open Drive Folder', ko: '오픈 드라이브 폴더 열기', ja: 'Googleドライブフォルダを開く' },
  gdrive_download_data_label: { en: 'Download Creation Data', ko: '제작 데이터 다운로드', ja: '制作データのダウンロード' },
  gdrive_download_json: { en: 'Download Guide Data (.json)', ko: '가이드 데이터 (.json) 다운로드', ja: 'ガイドデータ (.json) 다운로드' },
  builder_title: { en: '<i class="fa-solid fa-route"></i> Map Tour Guide Builder', ko: '<i class="fa-solid fa-route"></i> 지도 투어 가이드 빌더', ja: '<i class="fa-solid fa-route"></i> 地図ツアーガイドビルダー' },
  builder_desc: { en: 'Create your own customized guide! Click points directly on the Map tab to log coordinates, then upload audio tracks or write guidance scripts here.', ko: '나만의 맞춤 가이드를 만드세요! 지도 탭을 클릭하여 핀을 생성한 뒤, 음성 파일을 녹음하거나 스크립트를 작성하여 가이드로 퍼블리싱해보세요.', ja: '自分だけのカスタムガイドを作りましょう！地図タブでピンを置き、音声や案内文を登録できます。' },
  builder_tour_name: { en: 'Tour Guide Name', ko: '투어 가이드 이름', ja: 'ツアーガイド名' },
  builder_select_coords: { en: 'Selected Map Pins', ko: '선택된 지도 핀 목록', ja: '選択した地図ピン' },
  no_pins_placeholder: { en: 'Go to Map Tab and click on the map to place pins!', ko: '지도 탭으로 이동하여 원하는 위치를 클릭해 핀을 배치하세요!', ja: '地図タブで好きな場所をクリックしてピンを配置してください！' },
  save_tour: { en: '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Guide', ko: '<i class="fa-solid fa-cloud-arrow-up"></i> 출간하기', ja: '<i class="fa-solid fa-cloud-arrow-up"></i> ガイドを公開' },
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

  // Map page UI
  map_top_badge: { en: 'Live Travel Map', ko: '실시간 여행 지도', ja: 'ライブ旅行マップ' },
  map_route_title: { en: 'Gyeongbokgung Local Tour', ko: '경복궁 로컬 투어', ja: '景福宮ローカルツアー' },
  map_route_desc: { en: 'View GPS, guide points, and personal memos in one place.', ko: 'GPS 위치, 가이드 포인트, 메모를 한 화면에서 확인하세요.', ja: 'GPS位置、ガイド地点、メモを一画面で確認できます。' },
  map_stat_stops: { en: 'Stops', ko: '코스', ja: '地点' },
  map_stat_memos: { en: 'Memos', ko: '메모', ja: 'メモ' },
  map_stat_gps: { en: 'GPS', ko: 'GPS', ja: 'GPS' },
  map_mini_guide: { en: 'Recommended Guide', ko: '추천 가이드', ja: 'おすすめガイド' },
  map_control_gps: { en: 'Live GPS', ko: '실시간 GPS', ja: 'リアルGPS' },
  map_control_gps_on: { en: 'Tracking', ko: '추적 중', ja: '追跡中' },
  map_control_memo: { en: 'Memo', ko: '메모', ja: 'メモ' },
  map_control_sim: { en: 'Walk Test', ko: '걷기 테스트', ja: '歩行テスト' },
  map_control_sim_on: { en: 'Testing', ko: '테스트 중', ja: 'テスト中' },
  map_control_recenter: { en: 'Center', ko: '내 위치', ja: '中央へ' },
  map_legend_current: { en: 'Me', ko: '나', ja: '自分' },
  map_legend_audio: { en: 'Audio', ko: '음성', ja: '音声' },
  map_legend_video: { en: 'Video', ko: '영상', ja: '動画' },
  map_legend_coupon: { en: 'Coupon', ko: '쿠폰', ja: 'クーポン' },
  map_legend_memo: { en: 'Memo', ko: '메모', ja: 'メモ' },
  map_current_status: { en: 'Current Map Status', ko: '현재 지도 상태', ja: '現在の地図状態' },
  map_coords_waiting: { en: 'Turn on GPS to show your coordinates.', ko: 'GPS를 켜면 좌표가 표시됩니다.', ja: 'GPSをオンにすると座標が表示されます。' },
  map_accuracy_waiting: { en: 'Location accuracy will appear here.', ko: '위치 정확도가 여기에 표시됩니다.', ja: '位置精度がここに表示されます。' },
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

  // Initialize Home Tab UI & Events
  initHomeTab();
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
      if (targetTab === 'home-tab') {
        renderHomeTab();
      }

      if (targetTab === 'map-tab' && window.TravelogMapModule) {
        window.TravelogMapModule.invalidateSize(); // Force Leaflet redraw
      }
      
      if (targetTab === 'rewards-tab' && window.TravelogRewardsModule) {
        window.TravelogRewardsModule.resizeScratchCanvas();
      }
    });
  });

  const goMapBtn = document.getElementById('go-to-map-builder-btn');
  if (goMapBtn) {
    goMapBtn.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      tabContents.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === 'map-tab') {
          tab.classList.add('active');
        }
      });
      if (window.updateMapLayoutForMode) {
        window.updateMapLayoutForMode('create');
      }
      if (window.TravelogMapModule) {
        window.TravelogMapModule.invalidateSize();
      }
      showToast(localizedText('지도 화면이 활성화되었습니다. 핀 생성 버튼을 눌러 미디어를 기록하세요!', 'Map activated. Click pin generation button to record media!', 'マップが有効になりました。'));
    });
  }
}

// ==========================================
// TAB 0: HOME TAB BUSINESS LOGIC
// ==========================================
let adRollingIntervalId = null;

const RECOMMEND_GUIDES_DATA = {
  recommended: [
    { id: 'rec-1', name: '서울 북촌한옥마을 반나절 도보 투어', author: '지민 (로컬 가이드)', rating: '4.9', bg: 'assets/images/blogs/blog-seoul-history-food.svg', badge: '인기' },
    { id: 'rec-2', name: '부산 해운대 해변 열차 낭만 여행', author: '준호 (로컬 가이드)', rating: '4.8', bg: 'assets/images/profile/profile-ocean.svg', badge: '강추' },
    { id: 'rec-3', name: '제주 우도 전기자전거 환상 투어', author: '수진 (로컬 가이드)', rating: '4.7', bg: 'assets/images/profile/profile-compass.svg', badge: '신규' }
  ],
  today: [
    { id: 'today-1', name: '경복궁 역사/문화 가이드 투어', author: '민호 (서울 토박이)', rating: '4.9', bg: 'assets/images/blogs/blog-seoul-history-food.svg', badge: '오늘의 로그' },
    { id: 'today-2', name: '경주 첨성대 달빛 야경 산책', author: '혜진 (로컬 가이드)', rating: '4.7', bg: 'assets/images/profile/profile-night.svg', badge: '오로 선정' }
  ],
  star: [
    { id: 'star-1', name: '제주도 서귀포 감성 카페 투어', author: '로하 (스타 크리에이터)', rating: '5.0', bg: 'assets/images/profile/profile-cafe.svg', badge: 'STAR' },
    { id: 'star-2', name: '강릉 안목해변 커피거리 도보 투어', author: '커피러버 (스타 크리에이터)', rating: '4.9', bg: 'assets/images/profile/profile-cafe.svg', badge: 'STAR' }
  ],
  event: [
    { id: 'event-1', name: '수원 화성 성곽 보물찾기 퀘스트', author: '트레블로그 이벤트', rating: '4.8', bg: 'assets/images/adventure/quest-seoul-palace-mystery.svg', badge: '선물 증정' },
    { id: 'event-2', name: '인천 송도 미래도시 야경 퀘스트', author: '송도 관광공사', rating: '4.6', bg: 'assets/images/profile/profile-night.svg', badge: '포인트 2배' }
  ]
};

function initHomeTab() {
  // Bind Dashboard actions
  const profileTrigger = document.getElementById('home-profile-trigger');
  if (profileTrigger) {
    profileTrigger.addEventListener('click', () => {
      openProfileManagerModal();
    });
  }

  const msgTrigger = document.getElementById('msg-box-trigger');
  if (msgTrigger) {
    msgTrigger.addEventListener('click', openMessageBox);
  }

  const msgCloseBtn = document.getElementById('msg-box-close-btn');
  const msgConfirmBtn = document.getElementById('msg-box-confirm-btn');
  if (msgCloseBtn) msgCloseBtn.addEventListener('click', closeMessageBox);
  if (msgConfirmBtn) msgConfirmBtn.addEventListener('click', closeMessageBox);

  // Bind Coins Actions
  const adBtn = document.getElementById('charge-ad-btn');
  if (adBtn) adBtn.addEventListener('click', startAdChargeSimulation);

  const payBtn = document.getElementById('charge-pay-btn');
  if (payBtn) payBtn.addEventListener('click', openCoinShop);

  const shopCloseBtn = document.getElementById('pay-charge-close-btn');
  const shopCancelBtn = document.getElementById('pay-charge-cancel-btn');
  if (shopCloseBtn) shopCloseBtn.addEventListener('click', closeCoinShop);
  if (shopCancelBtn) shopCancelBtn.addEventListener('click', closeCoinShop);

  document.querySelectorAll('.coin-package-item').forEach(item => {
    item.addEventListener('click', () => {
      const amount = parseInt(item.getAttribute('data-amount'), 10);
      buyCoinPackage(amount);
    });
  });

  // Bind Widget Configuration Dialog Actions
  const widgetEditBtn = document.getElementById('widget-edit-btn');
  if (widgetEditBtn) widgetEditBtn.addEventListener('click', openWidgetConfig);

  const widgetCloseBtn = document.getElementById('widget-config-close-btn');
  const widgetSaveBtn = document.getElementById('widget-config-save-btn');
  if (widgetCloseBtn) widgetCloseBtn.addEventListener('click', closeWidgetConfig);
  if (widgetSaveBtn) widgetSaveBtn.addEventListener('click', saveWidgetConfig);

  // Start banner ad rotation
  startAdRolling();
  
  // Initial rendering
  renderHomeTab();
}

function renderHomeTab() {
  // 1. Sync User Profile details
  const nicknameEl = document.getElementById('home-user-nickname');
  const avatarEl = document.getElementById('home-user-avatar');
  const emojiEl = document.getElementById('home-user-emoji');
  
  if (nicknameEl) {
    nicknameEl.textContent = TravelogState.userProfile.nickname || TravelogState.userProfile.authProvider || 'Traveler';
  }
  if (avatarEl) {
    applyAvatarToElements(TravelogState.userProfile, avatarEl, emojiEl);
  }

  // 2. Sync Coin amount & message badge
  const coinValEl = document.getElementById('home-coin-value');
  if (coinValEl) {
    coinValEl.textContent = Number(TravelogState.coins).toLocaleString();
  }
  
  const unreadMsgCount = TravelogState.messages.filter(m => m.unread).length;
  const badgeEl = document.getElementById('home-msg-badge');
  if (badgeEl) {
    badgeEl.textContent = unreadMsgCount;
    badgeEl.style.display = unreadMsgCount > 0 ? 'block' : 'none';
  }

  // 3. Render Widget Guides blocks
  renderGuideWidgets();

  // 4. Render recommendation lists
  renderGuidesScrollList('rec-guides-list', RECOMMEND_GUIDES_DATA.recommended);
  renderGuidesScrollList('today-guides-list', RECOMMEND_GUIDES_DATA.today);
  renderGuidesScrollList('star-guides-list', RECOMMEND_GUIDES_DATA.star);
  renderGuidesScrollList('event-guides-list', RECOMMEND_GUIDES_DATA.event);
}

function renderGuideWidgets() {
  const container = document.getElementById('home-widget-grid');
  if (!container) return;

  const activeWidgets = TravelogState.userGuides.filter(g => g.isWidget);

  if (activeWidgets.length === 0) {
    container.innerHTML = `
      <div class="widget-empty-state">
        <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block; color: var(--text-secondary);"></i>
        <span data-localize="empty_widgets">등록된 위젯 가이드가 없습니다. 우측 상단 편집을 눌러 보관함을 추가하세요.</span>
      </div>`;
    return;
  }

  container.innerHTML = activeWidgets.map(guide => {
    return `
      <div class="widget-block" id="widget-${guide.id}">
        <div class="widget-block-bg" style="background-image: url('${guide.bg}')"></div>
        <div>
          <h4 class="widget-block-title">${escapeHtml(guide.name)}</h4>
          <span class="widget-block-meta"><i class="fa-solid fa-user"></i> ${escapeHtml(guide.author)} &middot; ★ ${guide.rating}</span>
        </div>
        <button class="widget-block-btn" onclick="window.startGuideFromHome('${guide.id}')">
          <i class="fa-solid fa-circle-play"></i> <span data-localize="start_guide">가이드 시작</span>
        </button>
      </div>`;
  }).join('');
}

function renderGuidesScrollList(containerId, listData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = listData.map(item => {
    return `
      <div class="guide-card" onclick="window.startGuideFromHome('${item.id}')">
        <div class="guide-card-bg" style="background-image: url('${item.bg}')"></div>
        <div class="guide-card-content">
          <h5 class="guide-card-title">${escapeHtml(item.name)}</h5>
          <span class="guide-card-author"><i class="fa-solid fa-user-astronaut"></i> ${escapeHtml(item.author)}</span>
          <div class="guide-card-footer">
            <span class="guide-card-rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
            <span class="guide-card-badge">${item.badge}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// MessageBox Logic
function openMessageBox() {
  const modal = document.getElementById('msg-box-modal');
  const container = document.getElementById('msg-list-container');
  if (!modal || !container) return;

  container.innerHTML = TravelogState.messages.map(msg => {
    return `
      <div class="msg-item ${msg.unread ? 'unread' : ''}" onclick="window.readMessage(${msg.id})">
        <div class="msg-item-header">
          <span class="msg-item-sender">${escapeHtml(msg.sender)}</span>
          <span class="msg-item-date">${msg.date}</span>
        </div>
        <p class="msg-item-body">${escapeHtml(msg.body)}</p>
      </div>`;
  }).join('');

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeMessageBox() {
  const modal = document.getElementById('msg-box-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  renderHomeTab();
}

window.readMessage = function(id) {
  const msg = TravelogState.messages.find(m => m.id === id);
  if (msg && msg.unread) {
    msg.unread = false;
    openMessageBox(); // Re-render to clear unread highlight
  }
};

// Ad Reward Coin Simulation
function startAdChargeSimulation() {
  const modal = document.getElementById('ad-charge-modal');
  const progressBar = document.getElementById('ad-progress-bar');
  const timerText = document.getElementById('ad-timer-text');
  const skipBtn = document.getElementById('ad-skip-btn');
  if (!modal || !progressBar || !timerText || !skipBtn) return;

  progressBar.style.width = '0%';
  timerText.textContent = '10s';
  skipBtn.style.display = 'none';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  let duration = 10;
  const interval = setInterval(() => {
    duration--;
    timerText.textContent = `${duration}s`;
    progressBar.style.width = `${((10 - duration) / 10) * 100}%`;

    if (duration <= 0) {
      clearInterval(interval);
      timerText.innerHTML = '<span style="color:#4caf50;"><i class="fa-solid fa-circle-check"></i> 충전 완료! (+50 COIN)</span>';
      TravelogState.coins += 50;
      updatePointsDisplay(); // Update pts if linked
      
      // Reveal skip close btn
      skipBtn.style.display = 'block';
      skipBtn.disabled = false;
      skipBtn.textContent = localizedText('닫기', 'Close', '閉じる');
      skipBtn.onclick = () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        renderHomeTab();
      };
      
      showToast(localizedText('50 트레블 코인이 충전되었습니다!', 'Earned 50 Travel Coins!', '50トラベルコインを獲得しました！'));
    }
  }, 1000);
}

// Paid Coin Shop Logic
function openCoinShop() {
  const modal = document.getElementById('pay-charge-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeCoinShop() {
  const modal = document.getElementById('pay-charge-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

function buyCoinPackage(amount) {
  closeCoinShop();
  showToast(localizedText('결제를 진행하고 있습니다...', 'Processing payment...', '決済を進行中です...'));
  
  setTimeout(() => {
    TravelogState.coins += amount;
    showToast(localizedText(`${amount} 코인이 성공적으로 충전되었습니다!`, `Charged ${amount} Coins successfully!`, `${amount}コインがチャージされました！`));
    renderHomeTab();
  }, 1500);
}

// Home Widgets Configurator
function openWidgetConfig() {
  const modal = document.getElementById('widget-config-modal');
  const container = document.getElementById('widget-checkbox-list');
  if (!modal || !container) return;

  container.innerHTML = TravelogState.userGuides.map(guide => {
    return `
      <label class="widget-checkbox-item">
        <input type="checkbox" id="chk-${guide.id}" ${guide.isWidget ? 'checked' : ''}>
        <div class="widget-checkbox-label">
          <span class="widget-checkbox-name">${escapeHtml(guide.name)}</span>
          <span class="widget-checkbox-author">${escapeHtml(guide.author)}</span>
        </div>
      </label>`;
  }).join('');

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeWidgetConfig() {
  const modal = document.getElementById('widget-config-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

function saveWidgetConfig() {
  TravelogState.userGuides.forEach(guide => {
    const chk = document.getElementById(`chk-${guide.id}`);
    if (chk) {
      guide.isWidget = chk.checked;
    }
  });

  closeWidgetConfig();
  showToast(localizedText('위젯 보관함 설정이 완료되었습니다!', 'Widgets configuration saved!', 'ウィジェットの保管箱の設定が完了しました！'));
  renderHomeTab();
}

// Launcher to Guide Map Tab
window.startGuideFromHome = function(guideId) {
  // Check if we have that guide in lists or default fallback Gyeongbokgung
  let selectedGuideInfo = null;

  // Search userGuides
  const foundUser = TravelogState.userGuides.find(g => g.id === guideId);
  if (foundUser) {
    selectedGuideInfo = foundUser;
  } else {
    // Search recommeded lists
    for (const cat in RECOMMEND_GUIDES_DATA) {
      const match = RECOMMEND_GUIDES_DATA[cat].find(g => g.id === guideId);
      if (match) {
        selectedGuideInfo = match;
        break;
      }
    }
  }

  // Switch to Gyeongbokgung stops for this prototype demo guide triggers
  TravelogState.activeGuide = {
    id: guideId,
    nameEn: selectedGuideInfo ? selectedGuideInfo.author + ' Tour' : 'Gyeongbokgung Historical Tour',
    nameKo: selectedGuideInfo ? selectedGuideInfo.name : '경복궁 역사/문화 가이드 투어',
    nameJa: selectedGuideInfo ? selectedGuideInfo.name + ' ツアー' : '景福宮 歴史・文化ツアー',
    descEn: 'Historical exploration tour guide.',
    descKo: selectedGuideInfo ? selectedGuideInfo.author + '의 특별 가이드 코스' : '경복궁 역사와 가치에 얽힌 로컬 이야기',
    descJa: '歴史・文化解説付きガイドツアー。',
    stops: [
      { nameEn: "Gwanghwamun Gate", nameKo: "광화문", nameJa: "光化門", lat: 37.5760, lng: 126.9768, triggerRadius: 25 },
      { nameEn: "Heungnyemun Court", nameKo: "흥례문 뜰", nameJa: "興礼門の庭", lat: 37.5772, lng: 126.9768, triggerRadius: 20 },
      { nameEn: "Geongjeongjeon Main Hall", nameKo: "근정전", nameJa: "勤政殿", lat: 37.5786, lng: 126.9772, triggerRadius: 20 },
      { nameEn: "Gyeonghoeru Pavilion", nameKo: "경회루", nameJa: "慶会楼", lat: 37.5798, lng: 126.9760, triggerRadius: 30 }
    ]
  };

  // Perform programmatic tab switch to Map
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(n => n.classList.remove('active'));
  tabContents.forEach(tab => {
    tab.classList.remove('active');
    if (tab.id === 'map-tab') {
      tab.classList.add('active');
    }
  });

  if (window.updateMapLayoutForMode) {
    window.updateMapLayoutForMode('run');
  }

  // Redraw Map layer, load stops, and trigger walk simulation
  if (window.TravelogMapModule) {
    window.TravelogMapModule.renderTour();
    window.TravelogMapModule.invalidateSize();
    
    // Automatically trigger GPS Simulation Walk Test to start the tour immediately!
    window.setTimeout(() => {
      const simBtn = document.getElementById('gps-simulation-btn');
      if (simBtn) {
        const isSimulating = simBtn.classList.contains('active') || (document.getElementById('simulation-status-pill') && document.getElementById('simulation-status-pill').style.display === 'block');
        if (!isSimulating) {
          simBtn.click();
        }
      }
    }, 600);

    showToast(localizedText('가이드 지도를 로드하고 투어 걷기 테스트를 시작합니다!', 'Guide map loaded and walk test started!', 'ガイドマップを読み込み、歩行テストを開始します！'));
  }
};

// Rolling Ad timer
function startAdRolling() {
  if (adRollingIntervalId) clearInterval(adRollingIntervalId);

  adRollingIntervalId = setInterval(() => {
    const rollingBanner = document.getElementById('home-ad-rolling');
    if (!rollingBanner) return;

    const slides = rollingBanner.querySelectorAll('.ad-slide');
    if (slides.length <= 1) return;

    let activeIndex = -1;
    slides.forEach((slide, i) => {
      if (slide.classList.contains('active')) activeIndex = i;
    });

    if (activeIndex !== -1) {
      slides[activeIndex].classList.remove('active');
      const nextIndex = (activeIndex + 1) % slides.length;
      slides[nextIndex].classList.add('active');
    }
  }, 4000);
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
  { id: 'hanok', icon: '🏯', bg1: '#E28743', bg2: '#F2E58A', labelKo: '한옥', labelEn: 'Hanok', labelJa: '韓屋', imagePath: 'assets/images/profile/profile-hanok.svg' },
  { id: 'compass', icon: '🧭', bg1: '#002855', bg2: '#70A2B7', labelKo: '나침반', labelEn: 'Compass', labelJa: 'コンパス', imagePath: 'assets/images/profile/profile-compass.svg' },
  { id: 'camera', icon: '📷', bg1: '#E91E63', bg2: '#E8B4B8', labelKo: '카메라', labelEn: 'Camera', labelJa: 'カメラ', imagePath: 'assets/images/profile/profile-camera.svg' },
  { id: 'mountain', icon: '⛰️', bg1: '#4A7F4D', bg2: '#AFD499', labelKo: '산길', labelEn: 'Mountain', labelJa: '山道', imagePath: 'assets/images/profile/profile-mountain.svg' },
  { id: 'ocean', icon: '🌊', bg1: '#70A2B7', bg2: '#A8DFEC', labelKo: '바다', labelEn: 'Ocean', labelJa: '海', imagePath: 'assets/images/profile/profile-ocean.svg' },
  { id: 'cafe', icon: '☕', bg1: '#9B6A45', bg2: '#F1D7B0', labelKo: '카페', labelEn: 'Cafe', labelJa: 'カフェ', imagePath: 'assets/images/profile/profile-cafe.svg' },
  { id: 'train', icon: '🚆', bg1: '#002855', bg2: '#E28743', labelKo: '기차', labelEn: 'Train', labelJa: '電車', imagePath: 'assets/images/profile/profile-train.svg' },
  { id: 'night', icon: '🌙', bg1: '#1A2340', bg2: '#8EA8C3', labelKo: '야경', labelEn: 'Night', labelJa: '夜景', imagePath: 'assets/images/profile/profile-night.svg' }
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


function safelyGoToProfileStep(provider) {
  TravelogState.userProfile.authProvider = provider || TravelogState.userProfile.authProvider || 'Guest';
  showOnboardingScreen('profile');
  focusNicknameInput();
}

function attachActivationHandler(element, handler) {
  if (!element || element.dataset.travelogActivationBound === 'true') return;
  element.dataset.travelogActivationBound = 'true';
  ['click', 'pointerup', 'touchend'].forEach(eventName => {
    element.addEventListener(eventName, (event) => {
      if (eventName !== 'click') {
        event.preventDefault();
      }
      handler(event);
    }, { passive: false });
  });
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
    attachActivationHandler(btn, () => safelyGoToProfileStep(provider));
  });

  const backBtn = document.getElementById('onboarding-back-btn');
  if (backBtn) {
    attachActivationHandler(backBtn, () => showOnboardingScreen('login'));
  }

  const nicknameInput = document.getElementById('onboarding-nickname-input');
  const nicknameCheckBtn = document.getElementById('nickname-check-btn');
  const startBtn = document.getElementById('start-app-btn');

  if (nicknameInput) {
    nicknameInput.addEventListener('input', () => {
      verifiedNickname = '';
      const draftNickname = nicknameInput.value.trim();
      startBtn.disabled = draftNickname.length < 2;
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
    attachActivationHandler(nicknameCheckBtn, verifyNickname);
  }

  if (startBtn) {
    attachActivationHandler(startBtn, completeOnboarding);
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
  installOnboardingSafetyNet();
}

function showOnboardingScreen(screenName) {
  const loginScreen = document.getElementById('onboarding-screen-login');
  const profileScreen = document.getElementById('onboarding-screen-profile');
  if (!loginScreen || !profileScreen) return;

  const isLogin = screenName === 'login';
  loginScreen.classList.toggle('active', isLogin);
  profileScreen.classList.toggle('active', !isLogin);

  // 모바일 브라우저에서 class 전환이 늦게 반영되거나 이전 스타일이 남는 경우를 막기 위한 하드 보정입니다.
  loginScreen.style.display = isLogin ? 'flex' : 'none';
  loginScreen.style.pointerEvents = isLogin ? 'auto' : 'none';
  profileScreen.style.display = isLogin ? 'none' : 'flex';
  profileScreen.style.pointerEvents = isLogin ? 'none' : 'auto';

  document.querySelectorAll('.step-dots span').forEach((dot, index) => {
    const shouldActivate = isLogin ? index === 0 : index === 1;
    dot.classList.toggle('active', shouldActivate);
  });
}

function focusNicknameInput() {
  window.setTimeout(() => {
    const input = document.getElementById('onboarding-nickname-input');
    if (input) input.focus();
  }, 120);
}


function installOnboardingSafetyNet() {
  if (window.__travelogOnboardingSafetyNetInstalled) return;
  window.__travelogOnboardingSafetyNetInstalled = true;

  document.addEventListener('click', (event) => {
    const loginButton = event.target.closest('#login-google-btn, #login-naver-btn, #login-email-btn, #login-guest-btn');
    if (loginButton) {
      const providerMap = {
        'login-google-btn': 'Google',
        'login-naver-btn': 'Naver',
        'login-email-btn': 'Email',
        'login-guest-btn': 'Guest'
      };
      safelyGoToProfileStep(providerMap[loginButton.id] || 'Guest');
      return;
    }

    const backButton = event.target.closest('#onboarding-back-btn');
    if (backButton) {
      showOnboardingScreen('login');
      return;
    }

    const checkButton = event.target.closest('#nickname-check-btn');
    if (checkButton) {
      verifyNickname();
      return;
    }

    const startButton = event.target.closest('#start-app-btn');
    if (startButton && !startButton.disabled) {
      completeOnboarding();
    }
  }, true);
}

window.TravelogGoOnboardingProfile = safelyGoToProfileStep;
window.TravelogShowOnboardingScreen = showOnboardingScreen;
window.TravelogVerifyNickname = verifyNickname;
window.TravelogCompleteOnboarding = completeOnboarding;

function createSampleAvatarDataUri(sample) {
  return sample.imagePath || '';
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
  return sample.imagePath || createSampleAvatarDataUri(sample);
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
  
  // Update Home Tab display immediately
  renderHomeTab();

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

  const permissionChk = document.getElementById('onboarding-permission-chk');
  TravelogState.userProfile.storagePermissionGranted = permissionChk ? permissionChk.checked : false;

  TravelogState.userProfile.nickname = verifiedNickname || nickname;
  TravelogState.userProfile.isOnboarded = true;
  saveProfile();
  renderUserProfileWidget();
  renderHomeTab();
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

window.updateMapLayoutForMode = function(mode) {
  const activeGuideCard = document.querySelector('[data-hud-id="active-guide"]');
  const tourLocationsCard = document.querySelector('[data-hud-id="tour-stops"]');
  const bottomSheet = document.querySelector('.map-bottom-sheet');
  const legendPanel = document.querySelector('.map-legend-panel');
  const routeTitleEl = document.getElementById('map-route-title');
  const routeDescEl = document.getElementById('map-route-description');

  TravelogState.mapMode = mode;

  if (bottomSheet) {
    bottomSheet.style.display = 'none';
  }

  if (mode === 'create') {
    if (activeGuideCard) activeGuideCard.style.display = 'none';
    if (tourLocationsCard) tourLocationsCard.style.display = 'none';
    if (legendPanel) legendPanel.style.display = 'none';

    // Remove data-localize attributes to prevent default language override
    if (routeTitleEl) routeTitleEl.removeAttribute('data-localize');
    if (routeDescEl) routeDescEl.removeAttribute('data-localize');

    // 1. Update Title and Status HUD for Creator mode
    const rawTourName = document.getElementById('new-tour-name')?.value || '';
    const tourName = rawTourName.trim() || localizedText('나의 제작 가이드', 'My Creative Guide', 'マイ作成ガイド');
    
    const customPins = TravelogState.customCreatedPins || [];
    let audioCount = 0;
    let videoCount = 0;
    if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.getMediaCounts === 'function') {
      const counts = window.TravelogCreatorModule.getMediaCounts();
      audioCount = counts.audios;
      videoCount = counts.videos;
    }

    if (routeTitleEl) {
      routeTitleEl.textContent = tourName;
    }
    if (routeDescEl) {
      routeDescEl.textContent = localizedText(
        `제작 중 (핀 ${customPins.length}개 / 음성 ${audioCount}개 / 영상 ${videoCount}개)`,
        `In Development (Pins: ${customPins.length} / Audio: ${audioCount} / Video: ${videoCount})`,
        `作成中（ピン ${customPins.length}個 / 音声 ${audioCount}個 / 動画 ${videoCount}個）`
      );
    }

    // 2. Focus on User's Current Location
    if (window.TravelogMapModule && typeof window.TravelogMapModule.centerToUser === 'function') {
      setTimeout(() => {
        window.TravelogMapModule.centerToUser();
      }, 100);
    }
  } else {
    if (activeGuideCard) activeGuideCard.style.display = 'block';
    if (tourLocationsCard) tourLocationsCard.style.display = 'block';
    if (legendPanel) legendPanel.style.display = 'flex';

    // Restore data-localize attributes for Explore mode
    if (routeTitleEl) routeTitleEl.setAttribute('data-localize', 'map_route_title');
    if (routeDescEl) routeDescEl.setAttribute('data-localize', 'map_route_desc');

    // Restore default Gyeongbokgung text & localized translation for Explore mode
    if (routeTitleEl) {
      routeTitleEl.textContent = localizedText('경복궁 로컬 투어', 'Gyeongbokgung Local Tour', '景福宮ローカルツアー');
    }
    if (routeDescEl) {
      routeDescEl.textContent = localizedText(
        'GPS 위치, 가이드 포인트, 메모를 한 화면에서 확인하세요.',
        'View GPS, guide points, and personal memos in one place.',
        'GPS位置、ガイド地点、メモを一画面で確認できます。'
      );
    }
  }
};

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
