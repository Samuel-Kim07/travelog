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
    avatarPresetId: 'sun',
    storagePermissionGranted: false,
    storageMode: 'none',
    storageFolderName: ''
  },
  // 사용자가 획득한 가이드 목록 및 위젯 노출 여부
  userGuides: [
    { id: 'guide-gyeongbok', name: '경복궁 역사/문화 가이드 투어', author: '민호 (로컬 가이드)', rating: '4.9', bg: 'assets/images/blogs/blog-seoul-history-food.svg', isWidget: false, isPurchased: false },
    { id: 'guide-kyoto', name: '교토 대나무숲 청정 힐링 걷기', author: '사쿠라 (로컬 가이드)', rating: '4.8', bg: 'assets/images/blogs/blog-kyoto-temple-bamboo.svg', isWidget: false, isPurchased: false },
    { id: 'guide-switzerland', name: '스위스 인터라켄 융프라우 코스', author: '한스 (스타 가이드)', rating: '5.0', bg: 'assets/images/blogs/blog-switzerland-interlaken.svg', isWidget: false },
    { id: 'guide-paris', name: '파리 센강 일몰 산책로', author: '소피 (스타 가이드)', rating: '4.9', bg: 'assets/images/explore/vlog-paris-seine-sunset.svg', isWidget: false }
  ],
  messages: [
    { id: 1, sender: '로컬 가이드 민호', date: '2026-07-21', body: '안녕하세요! 경복궁 가이드 투어에 참여해주셔서 감사합니다. 도움이 필요하시면 언제든 쪽지 주세요!', unread: true },
    { id: 2, sender: '여행고래 (스타 가이드)', date: '2026-07-20', body: '수원 화성 퀘스트 꿀팁 알려드립니다! 북문 근처 매점 뒤의 힌트를 찾아보세요.', unread: true },
    { id: 3, sender: '트레블로그 시스템', date: '2026-07-19', body: '신규 가입 환영! 무료 1,250 코인이 지급되었습니다.', unread: false }
  ],
  friends: [
    { id: 'friend-minji', name: '민지', memo: '여행 친구' },
    { id: 'friend-jun', name: '준호', memo: '맛집 탐험 친구' }
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
  home_widget_desc: { en: 'Only purchased guides are shown here. Add or remove purchased guide widgets.', ko: '내가 구매한 여행 가이드만 보관함에 표시됩니다. 구매한 가이드 위젯을 더하고 뺄 수 있습니다.', ja: '購入済みガイドだけを保管箱に表示します。購入済みガイドのウィジェットを設定できます。' },
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
  widget_config_desc: { en: 'Choose which purchased guides to show on Home dashboard.', ko: '홈 화면의 내 가이드 보관함에 노출할 구매 완료 가이드만 체크하세요.', ja: 'ホーム画面の保管箱に表示する購入済みガイドだけを選択してください。' },
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


function syncMobileVisualViewport() {
  const root = document.documentElement;
  const visualViewport = window.visualViewport;
  const viewportHeight = Math.round(visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
  const layoutHeight = Math.round(window.innerHeight || document.documentElement.clientHeight || viewportHeight || 0);
  const viewportTop = Math.round(visualViewport?.offsetTop || 0);
  const hiddenBottom = Math.max(0, layoutHeight - viewportHeight - viewportTop);

  if (viewportHeight > 0) {
    root.style.setProperty('--app-visual-height', `${viewportHeight}px`);
  }
  root.style.setProperty('--browser-ui-bottom-offset', `${hiddenBottom}px`);

  document.body?.classList.toggle('has-mobile-browser-ui', hiddenBottom > 0);
}

function initMobileViewportSafety() {
  syncMobileVisualViewport();
  window.addEventListener('resize', syncMobileVisualViewport, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(syncMobileVisualViewport, 250), { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncMobileVisualViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', syncMobileVisualViewport, { passive: true });
  }
}

// ==========================================
// Main Initialization & Event Binding
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initMobileViewportSafety();
  initNavigation();
  initLanguageToggle();
  loadHomePersistentState();
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
  loadPublishedGuides();
  initHomeTab();
  initSupabaseRuntime();
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

      if (targetTab === 'creator-tab' && window.TravelogCreatorModule) {
        if (typeof window.TravelogCreatorModule.renderCoordinatesList === 'function') {
          window.TravelogCreatorModule.renderCoordinatesList();
        }
      }

      if (targetTab === 'map-tab') {
        // If transitioning directly via bottom nav, reset map mode to explore
        const activeNav = item.classList.contains('highlight-nav') || item.querySelector('.fa-sliders');
        if (!activeNav && window.updateMapLayoutForMode) {
          window.updateMapLayoutForMode('explore');
        }
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


async function initSupabaseRuntime() {
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.fetchPublishedGuideCards !== 'function') return;
  try {
    window.TravelogSupabase.init?.();
    if (!TravelogState.userProfile?.isOnboarded && typeof window.TravelogSupabase.fetchCurrentProfile === 'function') {
      await restoreSupabaseProfileFromExistingSession();
    }

    if (TravelogState.userProfile?.isOnboarded && typeof window.TravelogSupabase.syncProfile === 'function') {
      window.TravelogSupabase.syncProfile(TravelogState.userProfile).catch(error => {
        console.warn('[Travelog Supabase] Profile sync skipped:', error);
      });
    }

    if (TravelogState.userProfile?.isOnboarded && typeof refreshSupabaseSocialData === 'function') {
      refreshSupabaseSocialData({ requireSession: false }).catch(error => {
        console.warn('[Travelog Supabase] Social sync skipped:', error);
      });
    }

    const remoteCards = await window.TravelogSupabase.fetchPublishedGuideCards();
    if (Array.isArray(remoteCards) && remoteCards.length > 0) {
      remoteCards.forEach(card => mergePublishedGuideIntoCollections(card));
      renderHomeTab();
      showToast(localizedText(`Supabase 가이드 ${remoteCards.length}개를 불러왔습니다.`, `Loaded ${remoteCards.length} Supabase guides.`, `Supabaseガイド${remoteCards.length}件を読み込みました。`));
    }
  } catch (error) {
    console.warn('[Travelog Supabase] Runtime init failed:', error);
  }
}


function sanitizePublishedGuideCard(guide) {
  const nowId = `published-${Date.now()}`;
  const stops = Array.isArray(guide?.stops) ? guide.stops.map(stop => ({ ...stop })) : [];
  const eventCoupons = Array.isArray(guide?.eventCoupons) ? guide.eventCoupons.map(coupon => ({ ...coupon })) : [];

  return {
    id: guide?.id || nowId,
    name: guide?.name || localizedText('나의 출간 가이드', 'My Published Guide', '公開したガイド'),
    author: guide?.author || `${TravelogState.userProfile.nickname || 'Travelog Creator'} (크리에이터)`,
    rating: guide?.rating || 'NEW',
    bg: guide?.bg || guide?.representativeImage || 'assets/images/brand/travelog-ci-symbol.svg',
    representativeImage: guide?.representativeImage || guide?.bg || '',
    guideIntroText: guide?.guideIntroText || guide?.introText || '',
    guideIntroAudio: guide?.guideIntroAudio || null,
    guideIntroVideo: guide?.guideIntroVideo || null,
    badge: guide?.badge || '오늘의 가이드',
    isPaid: guide?.isPaid === true || guide?.monetization?.isPaid === true || Number(guide?.coinPrice || guide?.priceCoins || guide?.monetization?.coinPrice || 0) > 0,
    coinPrice: Number(guide?.coinPrice || guide?.priceCoins || guide?.monetization?.coinPrice || 0) || 0,
    monetization: guide?.monetization || { isPaid: guide?.isPaid === true, coinPrice: Number(guide?.coinPrice || guide?.priceCoins || 0) || 0 },
    isPurchased: guide?.isPurchased === true,
    isWidget: guide?.isWidget !== false,
    isPublishedGuide: guide?.isPublishedGuide === true || stops.length > 0,
    isSupabaseGuide: guide?.isSupabaseGuide === true,
    supabaseGuideId: guide?.supabaseGuideId || guide?.id || '',
    offlineReady: guide?.offlineReady === true,
    offlineStatus: guide?.offlineStatus || (guide?.offlineReady === true ? 'downloaded' : 'not_downloaded'),
    totalBytes: Number(guide?.totalBytes || guide?.total_bytes || 0) || 0,
    version: guide?.version || 1,
    createdAt: guide?.createdAt || new Date().toISOString(),
    pinCount: Number(guide?.pinCount ?? stops.length ?? 0),
    memoCount: Number(guide?.memoCount ?? 0),
    couponCount: Number(guide?.couponCount ?? eventCoupons.length ?? 0),
    stops,
    eventCoupons
  };
}

function savePublishedGuides(publishedGuides) {
  try {
    localStorage.setItem(PUBLISHED_GUIDES_STORAGE_KEY, JSON.stringify(publishedGuides));
  } catch (error) {
    console.warn('Published guides could not be saved locally.', error);
  }
}


function getCreatorPublishedGuideRecords() {
  try {
    const raw = localStorage.getItem(CREATOR_PUBLISHED_GUIDES_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.warn('Creator published guide records could not be loaded.', error);
    return [];
  }
}

function findCreatorPublishedGuideRecord(guideId) {
  if (!guideId) return null;
  return getCreatorPublishedGuideRecords().find(record => record && record.id === guideId) || null;
}

function getPublishedGuideDescription(record, guideCard) {
  const author = record?.creator || guideCard?.author || TravelogState.userProfile.nickname || 'Travelog Creator';
  const pinCount = record?.pinCount ?? (Array.isArray(record?.pins) ? record.pins.length : guideCard?.pinCount || 0);
  const memoCount = record?.memoCount ?? guideCard?.memoCount ?? 0;
  const couponCount = record?.couponCount ?? guideCard?.couponCount ?? 0;
  return `${author}의 출간 가이드 · 코스 ${pinCount}개 · 메모 ${memoCount}개 · 쿠폰 ${couponCount}개`;
}

function getPublishedGuidePins(record, guideCard) {
  if (Array.isArray(record?.pins) && record.pins.length > 0) {
    return record.pins;
  }
  if (Array.isArray(record?.stops) && record.stops.length > 0) {
    return record.stops;
  }
  if (Array.isArray(guideCard?.stops) && guideCard.stops.length > 0) {
    return guideCard.stops;
  }
  return [];
}

function makeCreatorRecordFromGuideCard(guideCard) {
  if (!guideCard?.isPublishedGuide && !(Array.isArray(guideCard?.stops) && guideCard.stops.length > 0)) {
    return null;
  }

  return {
    id: guideCard.id,
    tourName: guideCard.name,
    creator: guideCard.author,
    createdAt: guideCard.createdAt,
    representativeImage: guideCard.representativeImage || guideCard.bg || '',
    guideIntroText: guideCard.guideIntroText || '',
    guideIntroAudio: guideCard.guideIntroAudio || null,
    guideIntroVideo: guideCard.guideIntroVideo || null,
    pinCount: guideCard.pinCount || (guideCard.stops || []).length,
    memoCount: guideCard.memoCount || 0,
    couponCount: guideCard.couponCount || (guideCard.eventCoupons || []).length || 0,
    isPaid: guideCard.isPaid === true,
    coinPrice: Number(guideCard.coinPrice || guideCard.priceCoins || 0) || 0,
    monetization: guideCard.monetization || { isPaid: guideCard.isPaid === true, coinPrice: Number(guideCard.coinPrice || 0) || 0 },
    pins: (guideCard.stops || []).map(stop => ({ ...stop })),
    eventCoupons: (guideCard.eventCoupons || []).map(coupon => ({ ...coupon })),
    guideCard: { ...guideCard }
  };
}

function createStopsFromCreatorPublishedGuide(record, guideCard = null) {
  const pins = getPublishedGuidePins(record, guideCard);
  return pins
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map((pin, index) => {
      const hasVideo = pin.type === 'video' || pin.memoType === 'video' || (Array.isArray(pin.linkedVideos) && pin.linkedVideos.length > 0) || (Array.isArray(pin.linkedVideoFiles) && pin.linkedVideoFiles.length > 0);
      const hasAudio = pin.type === 'audio' || pin.memoType === 'audio' || (Array.isArray(pin.linkedAudios) && pin.linkedAudios.length > 0) || (Array.isArray(pin.linkedAudioFiles) && pin.linkedAudioFiles.length > 0);
      const hasPhoto = pin.type === 'photo' || pin.memoType === 'photo' || (Array.isArray(pin.linkedPhotos) && pin.linkedPhotos.length > 0) || (Array.isArray(pin.linkedPhotoFiles) && pin.linkedPhotoFiles.length > 0);
      const rawType = pin.memoType && pin.memoType !== 'none' ? pin.memoType : pin.type;
      const type = rawType === 'video' || hasVideo ? 'video' : rawType === 'audio' || hasAudio ? 'audio' : rawType === 'photo' || hasPhoto ? 'photo' : rawType === 'coupon' ? 'coupon' : 'memo';
      const icon = pin.icon || (type === 'video' ? 'fa-solid fa-video' : type === 'audio' ? 'fa-solid fa-volume-high' : type === 'photo' ? 'fa-solid fa-image' : type === 'coupon' ? 'fa-solid fa-ticket' : 'fa-solid fa-note-sticky');
      const nameKo = pin.nameKo || pin.name || `메모핀 ${index + 1}`;
      const nameEn = pin.nameEn || pin.name || `Memo Pin ${index + 1}`;
      const nameJa = pin.nameJa || pin.name || `メモピン ${index + 1}`;
      const desc = pin.descKo || pin.desc || pin.description || pin.memoText || pin.triggerTextKo || '등록된 메모가 없습니다.';
      return {
        id: pin.id || `published-pin-${index + 1}`,
        order: index + 1,
        nameKo,
        nameEn,
        nameJa,
        descKo: desc,
        descEn: pin.descEn || desc,
        descJa: pin.descJa || desc,
        lat: Number(pin.lat) || 37.5750,
        lng: Number(pin.lng) || 126.9768,
        type,
        icon,
        color: pin.color || (hasVideo ? 'pin-video' : hasAudio ? 'pin-audio' : hasPhoto ? '#34a853' : type === 'coupon' ? 'pin-coupon' : 'pin-memo'),
        triggerRadius: Number(pin.triggerRadius) || 20,
        triggerTextKo: pin.triggerTextKo || desc,
        triggerTextEn: pin.triggerTextEn || pin.descEn || desc,
        triggerTextJa: pin.triggerTextJa || pin.descJa || desc,
        createdAt: pin.createdAt || null,
        memoType: pin.memoType || type,
        linkedAudios: Array.isArray(pin.linkedAudios) ? [...pin.linkedAudios] : [],
        linkedVideos: Array.isArray(pin.linkedVideos) ? [...pin.linkedVideos] : [],
        linkedPhotos: Array.isArray(pin.linkedPhotos) ? [...pin.linkedPhotos] : [],
        linkedAudioFiles: Array.isArray(pin.linkedAudioFiles) ? pin.linkedAudioFiles.map(file => ({ ...file })) : [],
        linkedVideoFiles: Array.isArray(pin.linkedVideoFiles) ? pin.linkedVideoFiles.map(file => ({ ...file })) : [],
        linkedPhotoFiles: Array.isArray(pin.linkedPhotoFiles) ? pin.linkedPhotoFiles.map(file => ({ ...file })) : [],
        sourcePin: { ...pin }
      };
    });
}

function mergePublishedGuideIntoCollections(guideCard) {
  const guide = sanitizePublishedGuideCard(guideCard);

  RECOMMEND_GUIDES_DATA.today = [
    { ...guide },
    ...RECOMMEND_GUIDES_DATA.today.filter(item => item.id !== guide.id)
  ];

  TravelogState.userGuides = [
    { ...guide, isWidget: guide.isWidget !== false },
    ...TravelogState.userGuides.filter(item => item.id !== guide.id)
  ];

  return guide;
}

function loadPublishedGuides() {
  try {
    const raw = localStorage.getItem(PUBLISHED_GUIDES_STORAGE_KEY);
    const savedGuides = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(savedGuides)) return;

    savedGuides.slice().reverse().forEach(guide => {
      mergePublishedGuideIntoCollections(guide);
    });
  } catch (error) {
    console.warn('Published guides could not be loaded locally.', error);
  }
}

function registerPublishedGuide(guideCard) {
  const guide = mergePublishedGuideIntoCollections(guideCard);
  const existingRaw = localStorage.getItem(PUBLISHED_GUIDES_STORAGE_KEY);
  let publishedGuides = [];

  try {
    publishedGuides = existingRaw ? JSON.parse(existingRaw) : [];
    if (!Array.isArray(publishedGuides)) publishedGuides = [];
  } catch (_) {
    publishedGuides = [];
  }

  publishedGuides = [
    guide,
    ...publishedGuides.filter(item => item.id !== guide.id)
  ].slice(0, 30);

  savePublishedGuides(publishedGuides);
  renderHomeTab();
  showToast(localizedText('오늘의 가이드에 등록되었습니다!', "Registered under Today's Guide!", '今日のガイドに登録されました！'));
  return guide;
}

function removePublishedGuide(guideId) {
  if (!guideId) return;

  RECOMMEND_GUIDES_DATA.today = RECOMMEND_GUIDES_DATA.today.filter(item => item.id !== guideId);
  TravelogState.userGuides = TravelogState.userGuides.filter(item => item.id !== guideId);

  try {
    const existingRaw = localStorage.getItem(PUBLISHED_GUIDES_STORAGE_KEY);
    const publishedGuides = existingRaw ? JSON.parse(existingRaw) : [];
    if (Array.isArray(publishedGuides)) {
      savePublishedGuides(publishedGuides.filter(item => item.id !== guideId));
    }
  } catch (error) {
    console.warn('Published guide could not be removed locally.', error);
  }

  renderHomeTab();
}

function saveHomePersistentState() {
  try {
    localStorage.setItem(HOME_COINS_STORAGE_KEY, String(TravelogState.coins));
    localStorage.setItem(HOME_FRIENDS_STORAGE_KEY, JSON.stringify(TravelogState.friends || []));
    localStorage.setItem(HOME_MESSAGES_STORAGE_KEY, JSON.stringify(TravelogState.messages || []));
  } catch (error) {
    console.warn('Home state could not be saved locally.', error);
  }
}

function loadHomePersistentState() {
  try {
    const savedCoins = localStorage.getItem(HOME_COINS_STORAGE_KEY);
    if (savedCoins !== null && Number.isFinite(Number(savedCoins))) {
      TravelogState.coins = Number(savedCoins);
    }
    const savedFriends = localStorage.getItem(HOME_FRIENDS_STORAGE_KEY);
    if (savedFriends) {
      const friends = JSON.parse(savedFriends);
      if (Array.isArray(friends)) TravelogState.friends = friends;
    }
    const savedMessages = localStorage.getItem(HOME_MESSAGES_STORAGE_KEY);
    if (savedMessages) {
      const messages = JSON.parse(savedMessages);
      if (Array.isArray(messages)) TravelogState.messages = messages;
    }
    loadPurchasedGuides();
  } catch (error) {
    console.warn('Home state could not be loaded locally.', error);
  }
}

function getPurchasedGuideCards() {
  try {
    const raw = localStorage.getItem(PURCHASED_GUIDES_STORAGE_KEY);
    const guides = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(guides)) return [];

    // 내 가이드 보관함은 결제를 완료했거나 무료 구매 버튼을 누른 가이드만 사용합니다.
    // 예전에 홈 위젯에 있던 기본/출간/추천 가이드가 섞여 저장된 경우를 방지합니다.
    return guides.filter(guide => guide && guide.isPurchased === true);
  } catch (_) {
    return [];
  }
}

function savePurchasedGuideCards(guides) {
  try {
    const purchasedOnly = Array.isArray(guides)
      ? guides.filter(guide => guide && guide.isPurchased === true)
      : [];
    localStorage.setItem(PURCHASED_GUIDES_STORAGE_KEY, JSON.stringify(purchasedOnly));
  } catch (error) {
    console.warn('Purchased guides could not be saved locally.', error);
  }
}

function loadPurchasedGuides() {
  const purchased = getPurchasedGuideCards();
  purchased.forEach(guide => {
    const existing = TravelogState.userGuides.find(item => item.id === guide.id);
    if (existing) {
      Object.assign(existing, { ...guide, isPurchased: true, isWidget: guide.isWidget !== false });
    } else {
      TravelogState.userGuides.unshift({ ...guide, isWidget: guide.isWidget !== false, isPurchased: true });
    }
  });
}

function getMyGuideChestGuides() {
  const purchasedMap = new Map();

  getPurchasedGuideCards().forEach(guide => {
    if (guide?.id) {
      purchasedMap.set(guide.id, { ...guide, isPurchased: true, isWidget: guide.isWidget !== false });
    }
  });

  TravelogState.userGuides
    .filter(guide => guide && guide.isPurchased === true)
    .forEach(guide => {
      const saved = purchasedMap.get(guide.id) || {};
      purchasedMap.set(guide.id, { ...guide, ...saved, isPurchased: true, isWidget: saved.isWidget ?? guide.isWidget ?? true });
    });

  return Array.from(purchasedMap.values());
}

function getGuideCoinPrice(guide) {
  const raw = guide?.coinPrice ?? guide?.priceCoins ?? guide?.monetization?.coinPrice;
  const price = Number(raw);
  return Number.isFinite(price) && price > 0 ? Math.floor(price) : 0;
}

function isGuidePaid(guide) {
  if (!guide) return false;
  if (guide.isPaid === true || guide.monetization?.isPaid === true) return getGuideCoinPrice(guide) > 0;
  return getGuideCoinPrice(guide) > 0;
}

function getGuidePriceLabel(guide) {
  return isGuidePaid(guide) ? `${getGuideCoinPrice(guide).toLocaleString()} COIN` : '무료';
}

function getGuideByIdFromCollections(guideId) {
  if (!guideId) return null;
  return getPurchasedGuideCards().find(guide => guide.id === guideId)
    || TravelogState.userGuides.find(guide => guide.id === guideId)
    || RECOMMEND_GUIDES_DATA.today.find(guide => guide.id === guideId)
    || RECOMMEND_GUIDES_DATA.recommended.find(guide => guide.id === guideId)
    || RECOMMEND_GUIDES_DATA.star.find(guide => guide.id === guideId)
    || RECOMMEND_GUIDES_DATA.event.find(guide => guide.id === guideId)
    || null;
}

function needsOfflineDownload(guide) {
  if (!guide || guide.isSupabaseGuide !== true) return false;
  if (guide.offlineReady === true || guide.offlineStatus === 'downloaded' || guide.offlineStatus === 'creator-local') return false;
  return guide.isPurchased === true || isGuidePurchased(guide.id);
}

async function downloadSupabaseGuideForOffline(guideId) {
  const currentGuide = getGuideByIdFromCollections(guideId);
  if (!currentGuide || currentGuide.isSupabaseGuide !== true) return currentGuide;
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.downloadGuideOffline !== 'function') {
    throw new Error('SUPABASE_OFFLINE_DOWNLOADER_NOT_READY');
  }

  showToast(localizedText('오프라인 가이드 패키지를 다운로드 중입니다...', 'Downloading the offline guide package...', 'オフラインガイドパッケージをダウンロード中です...'));
  const offlineCard = await window.TravelogSupabase.downloadGuideOffline(currentGuide.supabaseGuideId || currentGuide.id);
  const normalized = addGuideToMyChest({
    ...currentGuide,
    ...offlineCard,
    id: currentGuide.id,
    isSupabaseGuide: true,
    supabaseGuideId: currentGuide.supabaseGuideId || currentGuide.id,
    isPurchased: true,
    isWidget: true,
    offlineReady: true,
    offlineStatus: 'downloaded'
  });
  showToast(localizedText('오프라인 다운로드 완료. 이제 인터넷 없이 GPS로 실행할 수 있습니다.', 'Offline download complete. You can now run it with GPS without internet.', 'オフラインダウンロード完了。インターネットなしでGPS実行できます。'));
  return normalized;
}

function isGuidePurchased(guideId) {
  return getPurchasedGuideCards().some(guide => guide.id === guideId) || TravelogState.userGuides.some(guide => guide.id === guideId && guide.isPurchased);
}

function addGuideToMyChest(guideCard) {
  const normalized = sanitizePublishedGuideCard({ ...guideCard, isWidget: true, isPurchased: true });
  normalized.isPurchased = true;
  normalized.isWidget = true;

  const purchased = [normalized, ...getPurchasedGuideCards().filter(item => item.id !== normalized.id)].slice(0, 100);
  savePurchasedGuideCards(purchased);

  TravelogState.userGuides = [normalized, ...TravelogState.userGuides.filter(item => item.id !== normalized.id)];
  saveHomePersistentState();
  renderHomeTab();
  return normalized;
}

function updateCoins(delta) {
  TravelogState.coins = Math.max(0, Number(TravelogState.coins || 0) + Number(delta || 0));
  saveHomePersistentState();
  renderHomeTab();
}

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

  bindFriendUiEvents();

  // Start banner ad rotation
  startAdRolling();
  
  initHomeGuideIntroModals();

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

  renderFriendList();

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

  const activeWidgets = getMyGuideChestGuides().filter(g => g.isWidget !== false);

  if (activeWidgets.length === 0) {
    container.innerHTML = `
      <div class="widget-empty-state">
        <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block; color: var(--text-secondary);"></i>
        <span data-localize="empty_widgets">아직 구매한 가이드가 없습니다. 홈의 투어 소개 팝업에서 구매한 가이드만 이 보관함에 표시됩니다.</span>
      </div>`;
    return;
  }

  container.innerHTML = activeWidgets.map(guide => {
    return `
      <div class="widget-block" id="widget-${guide.id}" style="position:relative;">
        <div class="widget-block-bg" style="background-image: url('${guide.bg}')"></div>
        <span style="position:absolute; top:10px; right:10px; z-index:2; font-size:10px; font-weight:900; color:#fff; background:${isGuidePaid(guide) ? 'rgba(255,46,99,.92)' : 'rgba(52,168,83,.92)'}; border-radius:999px; padding:4px 8px; box-shadow:0 4px 10px rgba(0,0,0,.18);">${getGuidePriceLabel(guide)}</span>
        <div>
          <h4 class="widget-block-title">${escapeHtml(guide.name)}</h4>
          <span class="widget-block-meta"><i class="fa-solid fa-user"></i> ${escapeHtml(guide.author)} &middot; ★ ${guide.rating}</span>
        </div>
        <button class="widget-block-btn" onclick="window.startGuideFromHome('${guide.id}')">
          <i class="fa-solid ${needsOfflineDownload(guide) ? 'fa-cloud-arrow-down' : 'fa-circle-play'}"></i>
          <span>${needsOfflineDownload(guide) ? '다운로드 후 시작' : '가이드 시작'}</span>
        </button>
      </div>`;
  }).join('');
}

function renderGuidesScrollList(containerId, listData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = listData.map(item => {
    return `
      <div class="guide-card" onclick="window.openGuideIntroFromHome('${item.id}')">
        <div class="guide-card-bg" style="background-image: url('${item.bg}')"></div>
        <div class="guide-card-content">
          <h5 class="guide-card-title">${escapeHtml(item.name)}</h5>
          <span class="guide-card-author"><i class="fa-solid fa-user-astronaut"></i> ${escapeHtml(item.author)}</span>
          <div class="guide-card-footer">
            <span class="guide-card-rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
            <span class="guide-card-badge">${item.badge}</span>
            <span style="background:${isGuidePaid(item) ? '#ff2e63' : '#34A853'}; color:white; border-radius:999px; padding:3px 7px; font-size:10px; font-weight:900;">${getGuidePriceLabel(item)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Friends Logic
let currentMessageFriendId = null;
let latestFriendSearchResults = [];
let supabaseFriendSyncInProgress = false;
let supabaseMessageSyncInProgress = false;

function isSupabaseFriendFeatureReady() {
  return !!(window.TravelogSupabase && typeof window.TravelogSupabase.fetchFriends === 'function');
}

function renderFriendSearchResults(results = [], message = '') {
  const container = document.getElementById('friend-search-results');
  if (!container) return;
  if (message) {
    container.style.display = 'flex';
    container.innerHTML = `<div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">${escapeHtml(message)}</div>`;
    return;
  }
  if (!Array.isArray(results) || results.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  container.style.display = 'flex';
  container.innerHTML = `
    <div style="font-size:12px; color:var(--text-secondary); font-weight:800; margin-bottom:2px;">검색 결과</div>
    ${results.map(profile => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:rgba(255,255,255,.72); border:1px solid var(--glass-border); border-radius:12px; padding:8px 10px;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div style="width:30px; height:30px; border-radius:50%; background:var(--grad-hero); display:flex; align-items:center; justify-content:center; color:white; font-weight:900; flex-shrink:0;">${escapeHtml((profile.name || '?').slice(0, 1))}</div>
          <div style="min-width:0;">
            <div style="font-size:13px; font-weight:900; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(profile.name || 'Travelog User')}</div>
            <div style="font-size:10px; color:var(--text-muted);">Supabase 유저</div>
          </div>
        </div>
        <button class="btn-rect" type="button" onclick="window.addSupabaseFriend('${escapeHtml(profile.supabaseProfileId || profile.id)}')" style="padding:6px 10px; font-size:11px; border-radius:999px;"><i class="fa-solid fa-user-plus"></i> 등록</button>
      </div>`).join('')}`;
}

async function syncSupabaseFriends(options = {}) {
  if (!isSupabaseFriendFeatureReady() || supabaseFriendSyncInProgress) return false;
  supabaseFriendSyncInProgress = true;
  try {
    const friends = await window.TravelogSupabase.fetchFriends({ requireSession: options.requireSession === true, interactiveLogin: options.interactiveLogin === true });
    if (Array.isArray(friends)) {
      TravelogState.friends = friends;
      saveHomePersistentState();
      renderFriendList();
      renderFriendEditList();
      return true;
    }
  } catch (error) {
    console.warn('[Travelog Supabase] Friend sync failed:', error);
    if (options.showError) showToast(localizedText('Supabase 친구 목록을 불러오지 못했습니다.', 'Could not load Supabase friends.', 'Supabase友だちリストを読み込めませんでした。'));
  } finally {
    supabaseFriendSyncInProgress = false;
  }
  return false;
}

async function syncSupabaseMessages(options = {}) {
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.fetchMessages !== 'function' || supabaseMessageSyncInProgress) return false;
  supabaseMessageSyncInProgress = true;
  try {
    const messages = await window.TravelogSupabase.fetchMessages({ requireSession: options.requireSession === true, interactiveLogin: options.interactiveLogin === true });
    if (Array.isArray(messages)) {
      const hidden = getHiddenMessageIdSet();
      TravelogState.messages = messages.filter(msg => msg && !hidden.has(String(msg.id)) && !hidden.has(String(msg.supabaseMessageId || '')));
      saveHomePersistentState();
      renderHomeTab();
      return true;
    }
  } catch (error) {
    console.warn('[Travelog Supabase] Message sync failed:', error);
    if (options.showError) showToast(localizedText('Supabase 쪽지함을 불러오지 못했습니다.', 'Could not load Supabase messages.', 'Supabaseメッセージを読み込めませんでした。'));
  } finally {
    supabaseMessageSyncInProgress = false;
  }
  return false;
}

async function refreshSupabaseSocialData(options = {}) {
  await syncSupabaseFriends(options);
  await syncSupabaseMessages(options);
}

function bindFriendUiEvents() {
  const editBtn = document.getElementById('friend-edit-btn');
  const editCloseBtn = document.getElementById('friend-edit-close-btn');
  const addBtn = document.getElementById('friend-add-btn');
  const friendInput = document.getElementById('friend-name-input');
  const messageCloseBtn = document.getElementById('friend-message-close-btn');
  const messageSendBtn = document.getElementById('friend-message-send-btn');

  if (editBtn && !editBtn.dataset.bound) {
    editBtn.dataset.bound = 'true';
    editBtn.addEventListener('click', openFriendEditModal);
  }
  if (editCloseBtn && !editCloseBtn.dataset.bound) {
    editCloseBtn.dataset.bound = 'true';
    editCloseBtn.addEventListener('click', closeFriendEditModal);
  }
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = 'true';
    addBtn.addEventListener('click', addFriendFromInput);
  }
  if (friendInput && !friendInput.dataset.bound) {
    friendInput.dataset.bound = 'true';
    friendInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') addFriendFromInput();
    });
  }
  if (messageCloseBtn && !messageCloseBtn.dataset.bound) {
    messageCloseBtn.dataset.bound = 'true';
    messageCloseBtn.addEventListener('click', closeFriendMessageModal);
  }
  if (messageSendBtn && !messageSendBtn.dataset.bound) {
    messageSendBtn.dataset.bound = 'true';
    messageSendBtn.addEventListener('click', sendFriendMessage);
  }
}

function renderFriendList() {
  const list = document.getElementById('home-friend-list');
  if (!list) return;
  const friends = Array.isArray(TravelogState.friends) ? TravelogState.friends : [];
  if (friends.length === 0) {
    list.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px 0; text-align:center;">아직 등록된 친구가 없습니다. 친구 편집에서 Supabase 닉네임으로 찾아보세요.</div>';
    return;
  }
  list.innerHTML = friends.slice(0, 4).map(friend => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:rgba(255,255,255,.62); border:1px solid var(--glass-border); border-radius:14px; padding:8px 10px;">
      <div style="display:flex; align-items:center; gap:8px; min-width:0;">
        <div style="width:30px; height:30px; border-radius:50%; background:var(--grad-hero); display:flex; align-items:center; justify-content:center; color:white; font-weight:900; flex-shrink:0;">${escapeHtml((friend.name || '?').slice(0, 1))}</div>
        <div style="min-width:0;">
          <div style="font-size:13px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(friend.name)}</div>
          <div style="font-size:10px; color:var(--text-muted);">${escapeHtml(friend.memo || (friend.isSupabaseFriend ? 'Supabase 친구' : '친구'))}</div>
        </div>
      </div>
      <button class="btn-rect secondary" type="button" onclick="window.openFriendMessageModal('${friend.id}')" style="padding:5px 10px; font-size:11px; border-radius:999px;"><i class="fa-solid fa-paper-plane"></i> 쪽지</button>
    </div>`).join('');
}

function renderFriendEditList() {
  const list = document.getElementById('friend-edit-list');
  if (!list) return;
  const friends = Array.isArray(TravelogState.friends) ? TravelogState.friends : [];
  if (friends.length === 0) {
    list.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:18px 0;">친구를 검색해서 등록해 주세요.</div>';
    return;
  }
  list.innerHTML = friends.map(friend => `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; border:1px solid var(--glass-border); border-radius:14px; padding:9px 10px; background:rgba(255,255,255,.72);">
      <div style="min-width:0;">
        <div style="font-size:13px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(friend.name)}</div>
        <div style="font-size:10px; color:var(--text-muted);">${escapeHtml(friend.memo || (friend.isSupabaseFriend ? 'Supabase 친구' : '친구'))}</div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="btn-rect secondary" type="button" onclick="window.openFriendMessageModal('${friend.id}')" style="padding:5px 9px; font-size:11px; border-radius:10px;">쪽지</button>
        <button class="btn-rect secondary" type="button" onclick="window.deleteFriend('${friend.id}')" style="padding:5px 9px; font-size:11px; border-radius:10px; color:var(--accent-pink);">삭제</button>
      </div>
    </div>`).join('');
}

async function openFriendEditModal() {
  renderFriendSearchResults([]);
  renderFriendEditList();
  const modal = document.getElementById('friend-edit-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
  if (isSupabaseFriendFeatureReady()) {
    renderFriendSearchResults([], 'Supabase 친구 목록을 불러오는 중입니다...');
    const synced = await syncSupabaseFriends({ requireSession: true, interactiveLogin: true, showError: true });
    renderFriendSearchResults([], synced ? '' : '로그인 세션이 없으면 Supabase 친구 검색을 사용할 수 없습니다.');
  }
}

function closeFriendEditModal() {
  const modal = document.getElementById('friend-edit-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

async function addFriendFromInput() {
  const input = document.getElementById('friend-name-input');
  const name = input ? input.value.trim() : '';
  if (name.length < 2) {
    showToast(localizedText('친구 닉네임을 2글자 이상 입력해 주세요.', 'Enter at least 2 characters for the friend nickname.', '友だちのニックネームを2文字以上入力してください。'));
    return;
  }

  if (window.TravelogSupabase && typeof window.TravelogSupabase.searchProfiles === 'function') {
    try {
      renderFriendSearchResults([], 'Supabase에서 친구를 찾는 중입니다...');
      latestFriendSearchResults = await window.TravelogSupabase.searchProfiles(name, { requireSession: true, interactiveLogin: true });
      if (!latestFriendSearchResults.length) {
        renderFriendSearchResults([], '검색 결과가 없습니다. 상대방이 Supabase 로그인 후 프로필을 만든 상태인지 확인해 주세요.');
        return;
      }
      renderFriendSearchResults(latestFriendSearchResults);
      showToast(localizedText('검색 결과에서 등록할 친구를 선택하세요.', 'Choose a friend from the search results.', '検索結果から登録する友だちを選んでください。'));
      return;
    } catch (error) {
      console.warn('[Travelog Supabase] Friend search failed; using local fallback:', error);
      renderFriendSearchResults([], error?.detail || error?.message || 'Supabase 친구 검색에 실패했습니다.');
      return;
    }
  }

  const friend = { id: `friend-${Date.now()}`, name, memo: '로컬 친구' };
  TravelogState.friends = [friend, ...(TravelogState.friends || [])];
  if (input) input.value = '';
  saveHomePersistentState();
  renderFriendList();
  renderFriendEditList();
  showToast(localizedText('로컬 친구를 추가했습니다.', 'Local friend added.', 'ローカル友だちを追加しました。'));
}

window.addSupabaseFriend = async function(profileId) {
  if (!profileId || !window.TravelogSupabase || typeof window.TravelogSupabase.addFriend !== 'function') return;
  try {
    await window.TravelogSupabase.addFriend(profileId, { interactiveLogin: true });
    const input = document.getElementById('friend-name-input');
    if (input) input.value = '';
    latestFriendSearchResults = [];
    renderFriendSearchResults([]);
    await syncSupabaseFriends({ requireSession: true, interactiveLogin: true });
    showToast(localizedText('Supabase 친구로 등록했습니다.', 'Added as a Supabase friend.', 'Supabase友だちとして登録しました。'));
  } catch (error) {
    console.error('[Travelog Supabase] Friend add failed:', error);
    showToast(localizedText(`친구 등록에 실패했습니다: ${error.message || error}`, `Failed to add friend: ${error.message || error}`, `友だち登録に失敗しました: ${error.message || error}`));
  }
};

window.deleteFriend = async function(friendId) {
  const friend = (TravelogState.friends || []).find(item => item.id === friendId || item.supabaseProfileId === friendId);
  if (!friend) return;
  if (friend.isSupabaseFriend && window.TravelogSupabase && typeof window.TravelogSupabase.deleteFriend === 'function') {
    try {
      await window.TravelogSupabase.deleteFriend(friend.supabaseProfileId || friend.id, { interactiveLogin: true });
      await syncSupabaseFriends({ requireSession: true, interactiveLogin: true });
      showToast(localizedText('Supabase 친구를 삭제했습니다.', 'Supabase friend removed.', 'Supabase友だちを削除しました。'));
      return;
    } catch (error) {
      console.error('[Travelog Supabase] Friend delete failed:', error);
      showToast(localizedText('친구 삭제에 실패했습니다.', 'Failed to remove friend.', '友だち削除に失敗しました。'));
      return;
    }
  }
  TravelogState.friends = (TravelogState.friends || []).filter(item => item.id !== friendId);
  saveHomePersistentState();
  renderFriendList();
  renderFriendEditList();
};

window.openFriendMessageModal = function(friendId) {
  currentMessageFriendId = friendId;
  const friend = (TravelogState.friends || []).find(item => item.id === friendId || item.supabaseProfileId === friendId);
  const modal = document.getElementById('friend-message-modal');
  const target = document.getElementById('friend-message-target');
  const text = document.getElementById('friend-message-text');
  if (target) target.textContent = friend ? `${friend.name}에게 보내는 쪽지` : '친구에게 보내는 쪽지';
  if (text) text.value = '';
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
};

function closeFriendMessageModal() {
  const modal = document.getElementById('friend-message-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

async function sendFriendMessage() {
  const friend = (TravelogState.friends || []).find(item => item.id === currentMessageFriendId || item.supabaseProfileId === currentMessageFriendId);
  const textArea = document.getElementById('friend-message-text');
  const body = textArea ? textArea.value.trim() : '';
  if (!friend || !body) {
    showToast(localizedText('쪽지 내용을 입력해 주세요.', 'Please write a message.', 'メッセージを入力してください。'));
    return;
  }

  if (friend.isSupabaseFriend && window.TravelogSupabase && typeof window.TravelogSupabase.sendMessage === 'function') {
    try {
      await window.TravelogSupabase.sendMessage(friend.supabaseProfileId || friend.id, body, null, { interactiveLogin: true });
      closeFriendMessageModal();
      closeFriendEditModal();
      await syncSupabaseMessages({ requireSession: true, interactiveLogin: true });
      showToast(localizedText(`${friend.name}에게 Supabase 쪽지를 보냈습니다.`, `Supabase message sent to ${friend.name}.`, `${friend.name}にSupabaseメッセージを送りました。`));
      return;
    } catch (error) {
      console.error('[Travelog Supabase] Message send failed:', error);
      showToast(localizedText(`쪽지 전송에 실패했습니다: ${error.message || error}`, `Message send failed: ${error.message || error}`, `メッセージ送信に失敗しました: ${error.message || error}`));
      return;
    }
  }

  TravelogState.messages.unshift({
    id: Date.now(),
    sender: `나 → ${friend.name}`,
    date: new Date().toISOString().slice(0, 10),
    body,
    unread: false
  });
  saveHomePersistentState();
  closeFriendMessageModal();
  closeFriendEditModal();
  renderHomeTab();
  showToast(localizedText(`${friend.name}에게 로컬 쪽지를 보냈습니다.`, `Local message sent to ${friend.name}.`, `${friend.name}にローカルメッセージを送りました。`));
}


function getHiddenMessageIdSet() {
  try {
    const raw = localStorage.getItem(HIDDEN_MESSAGES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.map(id => String(id)) : []);
  } catch (_) {
    return new Set();
  }
}

function addHiddenMessageId(id) {
  if (!id) return;
  try {
    const hidden = getHiddenMessageIdSet();
    hidden.add(String(id));
    localStorage.setItem(HIDDEN_MESSAGES_STORAGE_KEY, JSON.stringify([...hidden]));
  } catch (error) {
    console.warn('Hidden message id could not be saved.', error);
  }
}

function getVisibleMessages() {
  const hidden = getHiddenMessageIdSet();
  return (Array.isArray(TravelogState.messages) ? TravelogState.messages : [])
    .filter(msg => msg && !hidden.has(String(msg.id)) && !hidden.has(String(msg.supabaseMessageId || '')));
}

function isMessageSenderRegisteredFriend(msg) {
  if (!msg || !msg.senderId) return true;
  const senderId = String(msg.senderId);
  return (Array.isArray(TravelogState.friends) ? TravelogState.friends : []).some(friend => {
    const friendProfileId = String(friend?.supabaseProfileId || friend?.id || '');
    return friendProfileId === senderId;
  });
}

function shouldShowMessageAddFriendButton(msg) {
  return !!(
    msg &&
    msg.isRemote &&
    !msg.isMine &&
    msg.senderId &&
    !isMessageSenderRegisteredFriend(msg) &&
    window.TravelogSupabase &&
    typeof window.TravelogSupabase.addFriend === 'function'
  );
}

function renderMessageBoxMessages(container) {
  if (!container) return;
  const messages = getVisibleMessages();
  if (messages.length === 0) {
    container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:18px 0; text-align:center;">받은 쪽지가 없습니다.</div>';
    return;
  }

  container.innerHTML = messages.map(msg => {
    const messageId = escapeHtml(String(msg.id));
    const showAddFriend = shouldShowMessageAddFriendButton(msg);
    return `
      <div class="msg-item ${msg.unread ? 'unread' : ''}" onclick="window.readMessage('${messageId}')">
        <div class="msg-item-header">
          <div class="msg-item-meta">
            <span class="msg-item-sender">${escapeHtml(msg.sender)}</span>
            <span class="msg-item-date">${escapeHtml(msg.date || '')}</span>
          </div>
          <div class="msg-action-group">
            ${showAddFriend ? `<button class="msg-add-friend-btn" type="button" onclick="event.stopPropagation(); window.registerMessageSenderAsFriend('${messageId}')" aria-label="보낸 사람을 친구로 등록">친구로등록</button>` : ''}
            <button class="msg-delete-btn" type="button" onclick="event.stopPropagation(); window.deleteMessageFromInbox('${messageId}')" aria-label="쪽지 삭제">삭제</button>
          </div>
        </div>
        <p class="msg-item-body">${escapeHtml(msg.body)}</p>
      </div>`;
  }).join('');
}

async function openMessageBox() {
  const modal = document.getElementById('msg-box-modal');
  const container = document.getElementById('msg-list-container');
  if (!modal || !container) return;

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  container.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:18px 0; text-align:center;">Supabase 쪽지함을 불러오는 중입니다...</div>';

  if (window.TravelogSupabase && typeof window.TravelogSupabase.fetchMessages === 'function') {
    await syncSupabaseMessages({ requireSession: true, interactiveLogin: true, showError: true });
  }

  renderMessageBoxMessages(container);
}

function closeMessageBox() {
  const modal = document.getElementById('msg-box-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  renderHomeTab();
}

window.readMessage = async function(id) {
  const msg = TravelogState.messages.find(m => String(m.id) === String(id));
  if (msg && msg.unread) {
    msg.unread = false;
    if (msg.isRemote && window.TravelogSupabase && typeof window.TravelogSupabase.markMessageRead === 'function') {
      window.TravelogSupabase.markMessageRead(msg.supabaseMessageId || msg.id).catch(error => {
        console.warn('[Travelog Supabase] Remote read update failed:', error);
      });
    }
    saveHomePersistentState();
    renderHomeTab();
    renderMessageBoxMessages(document.getElementById('msg-list-container'));
  }
};

window.registerMessageSenderAsFriend = async function(id) {
  const msg = TravelogState.messages.find(m => String(m.id) === String(id));
  if (!msg || !msg.senderId || msg.isMine) return;

  if (isMessageSenderRegisteredFriend(msg)) {
    showToast(localizedText('이미 친구로 등록되어 있습니다.', 'Already registered as a friend.', 'すでに友だち登録されています。'));
    renderMessageBoxMessages(document.getElementById('msg-list-container'));
    return;
  }

  if (!window.TravelogSupabase || typeof window.TravelogSupabase.addFriend !== 'function') {
    showToast(localizedText('Supabase 친구 등록 기능을 사용할 수 없습니다.', 'Supabase friend registration is not available.', 'Supabase友だち登録機能を使用できません。'));
    return;
  }

  try {
    await window.TravelogSupabase.addFriend(msg.senderId, { interactiveLogin: true });
    await syncSupabaseFriends({ requireSession: true, interactiveLogin: true });
    renderMessageBoxMessages(document.getElementById('msg-list-container'));
    showToast(localizedText(`${msg.sender}님을 친구로 등록했습니다.`, `Added ${msg.sender} as a friend.`, `${msg.sender}さんを友だち登録しました。`));
  } catch (error) {
    console.error('[Travelog Supabase] Message sender friend add failed:', error);
    showToast(localizedText(`친구 등록에 실패했습니다: ${error.message || error}`, `Failed to add friend: ${error.message || error}`, `友だち登録に失敗しました: ${error.message || error}`));
  }
};

window.deleteMessageFromInbox = async function(id) {
  const msg = TravelogState.messages.find(m => String(m.id) === String(id));
  if (!msg) return;
  const ok = window.confirm(localizedText('이 쪽지를 삭제할까요?', 'Delete this message?', 'このメッセージを削除しますか？'));
  if (!ok) return;

  const remoteId = msg.supabaseMessageId || msg.id;
  let remoteDeleted = false;
  if (msg.isRemote && window.TravelogSupabase && typeof window.TravelogSupabase.deleteMessage === 'function') {
    try {
      remoteDeleted = await window.TravelogSupabase.deleteMessage(remoteId);
    } catch (error) {
      console.warn('[Travelog Supabase] Remote message delete failed:', error);
    }
  }

  addHiddenMessageId(msg.id);
  if (remoteId) addHiddenMessageId(remoteId);
  TravelogState.messages = TravelogState.messages.filter(m => String(m.id) !== String(id) && String(m.supabaseMessageId || '') !== String(remoteId));
  saveHomePersistentState();
  renderHomeTab();
  renderMessageBoxMessages(document.getElementById('msg-list-container'));
  showToast(remoteDeleted
    ? localizedText('쪽지를 삭제했습니다.', 'Message deleted.', 'メッセージを削除しました。')
    : localizedText('이 기기의 쪽지함에서 삭제했습니다.', 'Removed from this device inbox.', 'この端末のメッセージ一覧から削除しました。'));
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
      saveHomePersistentState();
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
    saveHomePersistentState();
    showToast(localizedText(`${amount} 코인이 성공적으로 충전되었습니다!`, `Charged ${amount} Coins successfully!`, `${amount}コインがチャージされました！`));
    renderHomeTab();
  }, 1500);
}

// Home Widgets Configurator
function openWidgetConfig() {
  const modal = document.getElementById('widget-config-modal');
  const container = document.getElementById('widget-checkbox-list');
  if (!modal || !container) return;

  const purchasedGuides = getMyGuideChestGuides();

  if (purchasedGuides.length === 0) {
    container.innerHTML = `
      <div class="widget-empty-state" style="padding:16px; text-align:center;">
        <i class="fa-solid fa-cart-shopping" style="font-size:22px; margin-bottom:8px; display:block; color:var(--text-secondary);"></i>
        <span>아직 구매한 가이드가 없습니다. 홈의 투어 소개 팝업에서 구매한 가이드만 보관함에 담깁니다.</span>
      </div>`;
  } else {
    container.innerHTML = purchasedGuides.map(guide => {
      return `
        <label class="widget-checkbox-item">
          <input type="checkbox" id="chk-${guide.id}" ${guide.isWidget !== false ? 'checked' : ''}>
          <div class="widget-checkbox-label">
            <span class="widget-checkbox-name">${escapeHtml(guide.name)}</span>
            <span class="widget-checkbox-author">${escapeHtml(guide.author)}</span>
          </div>
        </label>`;
    }).join('');
  }

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
  const purchasedGuides = getMyGuideChestGuides();

  purchasedGuides.forEach(guide => {
    const chk = document.getElementById(`chk-${guide.id}`);
    const nextWidgetState = chk ? chk.checked : guide.isWidget !== false;

    const inRuntime = TravelogState.userGuides.find(item => item.id === guide.id);
    if (inRuntime) {
      inRuntime.isWidget = nextWidgetState;
      inRuntime.isPurchased = true;
    }
    guide.isWidget = nextWidgetState;
    guide.isPurchased = true;
  });

  savePurchasedGuideCards(purchasedGuides);
  closeWidgetConfig();
  showToast(localizedText('구매한 가이드 보관함 설정이 완료되었습니다!', 'Purchased guide chest settings saved!', '購入済みガイド保管箱の設定が完了しました！'));
  renderHomeTab();
}

// Launcher / Intro popup for Home guide cards
let currentIntroGuideId = null;
let homeGuidePreviewMap = null;
let homeGuidePreviewLayer = null;

function findHomeGuideInfo(guideId) {
  let selectedGuideInfo = null;
  const creatorPublishedRecord = findCreatorPublishedGuideRecord(guideId);

  const foundUser = TravelogState.userGuides.find(g => g.id === guideId);
  if (foundUser) {
    selectedGuideInfo = foundUser;
  } else {
    for (const cat in RECOMMEND_GUIDES_DATA) {
      const match = RECOMMEND_GUIDES_DATA[cat].find(g => g.id === guideId);
      if (match) {
        selectedGuideInfo = match;
        break;
      }
    }
  }

  const resolvedPublishedRecord = creatorPublishedRecord || makeCreatorRecordFromGuideCard(selectedGuideInfo);
  return { selectedGuideInfo, resolvedPublishedRecord };
}

function buildActiveGuideFromHomeGuide(guideId) {
  const { selectedGuideInfo, resolvedPublishedRecord } = findHomeGuideInfo(guideId);

  if (resolvedPublishedRecord) {
    const guideCard = resolvedPublishedRecord.guideCard || selectedGuideInfo || {};
    const stops = createStopsFromCreatorPublishedGuide(resolvedPublishedRecord, guideCard);
    const descKo = getPublishedGuideDescription(resolvedPublishedRecord, guideCard);
    const title = resolvedPublishedRecord.tourName || guideCard.name || '나의 출간 가이드';
    const representativeImage = resolvedPublishedRecord.representativeImage || guideCard.representativeImage || guideCard.bg || '';
    const eventCoupons = Array.isArray(resolvedPublishedRecord.eventCoupons)
      ? resolvedPublishedRecord.eventCoupons
      : Array.isArray(guideCard.eventCoupons) ? guideCard.eventCoupons : [];

    return {
      id: guideId,
      isPublishedGuide: true,
      nameKo: title,
      nameEn: title,
      nameJa: title,
      descKo,
      descEn: descKo,
      descJa: descKo,
      author: resolvedPublishedRecord.creator || guideCard.author || '',
      representativeImage,
      bg: representativeImage,
      badge: guideCard.badge || '오늘의 가이드',
      guideIntroText: resolvedPublishedRecord.guideIntroText || guideCard.guideIntroText || '',
      guideIntroAudio: resolvedPublishedRecord.guideIntroAudio || guideCard.guideIntroAudio || null,
      guideIntroVideo: resolvedPublishedRecord.guideIntroVideo || guideCard.guideIntroVideo || null,
      pinCount: resolvedPublishedRecord.pinCount || stops.length,
      memoCount: resolvedPublishedRecord.memoCount || guideCard.memoCount || stops.length,
      couponCount: resolvedPublishedRecord.couponCount || guideCard.couponCount || eventCoupons.length || 0,
      isPaid: resolvedPublishedRecord.isPaid === true || guideCard.isPaid === true,
      coinPrice: Number(resolvedPublishedRecord.coinPrice || guideCard.coinPrice || 0) || 0,
      monetization: resolvedPublishedRecord.monetization || guideCard.monetization || { isPaid: resolvedPublishedRecord.isPaid === true || guideCard.isPaid === true, coinPrice: Number(resolvedPublishedRecord.coinPrice || guideCard.coinPrice || 0) || 0 },
      isPurchased: isGuidePurchased(guideId),
      isSupabaseGuide: guideCard.isSupabaseGuide === true,
      supabaseGuideId: guideCard.supabaseGuideId || guideCard.id || guideId,
      offlineReady: guideCard.offlineReady === true,
      offlineStatus: guideCard.offlineStatus || (guideCard.offlineReady === true ? 'downloaded' : 'not_downloaded'),
      totalBytes: Number(guideCard.totalBytes || 0) || 0,
      version: guideCard.version || 1,
      eventCoupons,
      stops
    };
  }

  return {
    id: guideId,
    nameEn: selectedGuideInfo ? `${selectedGuideInfo.author} Tour` : 'Gyeongbokgung Historical Tour',
    nameKo: selectedGuideInfo ? selectedGuideInfo.name : '경복궁 역사/문화 가이드 투어',
    nameJa: selectedGuideInfo ? `${selectedGuideInfo.name} ツアー` : '景福宮 歴史・文化ツアー',
    descEn: 'Historical exploration tour guide.',
    descKo: selectedGuideInfo ? `${selectedGuideInfo.author}의 특별 가이드 코스` : '경복궁 역사와 가치에 얽힌 로컬 이야기',
    descJa: '歴史・文化解説付きガイドツアー。',
    representativeImage: selectedGuideInfo?.bg || '',
    bg: selectedGuideInfo?.bg || '',
    badge: selectedGuideInfo?.badge || '추천 가이드',
    guideIntroText: selectedGuideInfo ? `${selectedGuideInfo.name}에 대한 투어 소개가 아직 등록되지 않았습니다.` : '경복궁 대표 코스를 따라 걷는 기본 데모 가이드입니다.',
    guideIntroAudio: null,
    guideIntroVideo: null,
    eventCoupons: [],
    couponCount: 0,
    isPaid: false,
    coinPrice: 0,
    monetization: { isPaid: false, coinPrice: 0 },
    isPurchased: isGuidePurchased(guideId),
    stops: [
      { nameEn: "Gwanghwamun Gate", nameKo: "광화문", nameJa: "光化門", lat: 37.5760, lng: 126.9768, triggerRadius: 25, description: '경복궁의 남쪽 정문입니다.' },
      { nameEn: "Heungnyemun Court", nameKo: "흥례문 뜰", nameJa: "興礼門の庭", lat: 37.5772, lng: 126.9768, triggerRadius: 20, description: '넓은 조정과 품계석을 볼 수 있는 구간입니다.' },
      { nameEn: "Geongjeongjeon Main Hall", nameKo: "근정전", nameJa: "勤政殿", lat: 37.5786, lng: 126.9772, triggerRadius: 20, description: '왕의 즉위식과 국가 의례가 열리던 중심 전각입니다.' },
      { nameEn: "Gyeonghoeru Pavilion", nameKo: "경회루", nameJa: "慶会楼", lat: 37.5798, lng: 126.9760, triggerRadius: 30, description: '연못 위에 세워진 대표 누각입니다.' }
    ]
  };
}

function initHomeGuideIntroModals() {
  const introClose = document.getElementById('home-guide-intro-close-btn');
  const previewClose = document.getElementById('home-guide-preview-close-btn');
  const previewBtn = document.getElementById('home-guide-intro-preview-btn');
  const purchaseBtn = document.getElementById('home-guide-intro-purchase-btn');

  if (introClose && !introClose.dataset.bound) {
    introClose.dataset.bound = 'true';
    introClose.addEventListener('click', window.closeHomeGuideIntroModal);
  }
  if (previewClose && !previewClose.dataset.bound) {
    previewClose.dataset.bound = 'true';
    previewClose.addEventListener('click', window.closeHomeGuidePreviewModal);
  }
  if (previewBtn && !previewBtn.dataset.bound) {
    previewBtn.dataset.bound = 'true';
    previewBtn.addEventListener('click', () => {
      if (currentIntroGuideId) window.openHomeGuidePreviewModal(currentIntroGuideId);
    });
  }
  if (purchaseBtn && !purchaseBtn.dataset.bound) {
    purchaseBtn.dataset.bound = 'true';
    purchaseBtn.addEventListener('click', () => {
      if (currentIntroGuideId) purchaseCurrentIntroGuide();
    });
  }
}

function renderIntroMedia(activeGuide) {
  const mediaBox = document.getElementById('home-guide-intro-media');
  if (!mediaBox) return;
  const mediaItems = [];
  const video = activeGuide.guideIntroVideo;
  const audio = activeGuide.guideIntroAudio;

  if (video && video.dataUrl) {
    mediaItems.push(`
      <div style="border:1px solid var(--glass-border); border-radius:14px; padding:10px; background:rgba(0,0,0,.04);">
        <strong style="font-size:12px;"><i class="fa-solid fa-video"></i> 투어소개 영상</strong>
        <video controls playsinline preload="metadata" src="${video.dataUrl}" style="width:100%; max-height:220px; margin-top:8px; border-radius:12px; background:#000;"></video>
      </div>`);
  }
  if (audio && audio.dataUrl) {
    mediaItems.push(`
      <div style="border:1px solid var(--glass-border); border-radius:14px; padding:10px; background:rgba(112,162,183,.07);">
        <strong style="font-size:12px;"><i class="fa-solid fa-volume-high"></i> 투어소개 음성</strong>
        <audio controls preload="metadata" src="${audio.dataUrl}" style="width:100%; margin-top:8px;"></audio>
      </div>`);
  }

  mediaBox.innerHTML = mediaItems.length
    ? mediaItems.join('')
    : '<div style="font-size:12px; color:var(--text-muted); border:1px dashed var(--glass-border); border-radius:12px; padding:10px;">등록된 투어소개 영상/음성이 없습니다.</div>';
}

function updateIntroPurchaseButton(activeGuide) {
  const purchaseBtn = document.getElementById('home-guide-intro-purchase-btn');
  if (!purchaseBtn || !activeGuide) return;
  const price = getGuideCoinPrice(activeGuide);
  const purchased = isGuidePurchased(activeGuide.id);
  const statusGuide = { ...activeGuide, ...(getGuideByIdFromCollections(activeGuide.id) || {}) };
  if (purchased) {
    if (needsOfflineDownload(statusGuide)) {
      purchaseBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> 구매완료 · 다운로드 후 시작';
      purchaseBtn.style.background = 'var(--color-ocean)';
    } else {
      purchaseBtn.innerHTML = '<i class="fa-solid fa-circle-play"></i> 구매완료 · 가이드 시작';
      purchaseBtn.style.background = 'var(--grad-pink-purple)';
    }
  } else if (price > 0) {
    purchaseBtn.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> 구매 (${price.toLocaleString()} COIN)`;
    purchaseBtn.style.background = 'var(--color-ocean)';
  } else {
    purchaseBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> 무료 구매 (0 COIN)';
    purchaseBtn.style.background = 'var(--color-green, var(--color-leaf))';
  }
}

async function purchaseCurrentIntroGuide() {
  if (!currentIntroGuideId) return;
  const activeGuide = buildActiveGuideFromHomeGuide(currentIntroGuideId);
  const guideCard = {
    id: activeGuide.id,
    name: localizedField(activeGuide, 'name') || activeGuide.nameKo || 'Travelog Guide',
    author: activeGuide.author || 'Travelog Creator',
    rating: activeGuide.rating || 'NEW',
    bg: activeGuide.representativeImage || activeGuide.bg || 'assets/images/brand/travelog-ci-symbol.svg',
    representativeImage: activeGuide.representativeImage || activeGuide.bg || '',
    badge: activeGuide.badge || '구매한 가이드',
    isPublishedGuide: activeGuide.isPublishedGuide === true,
    pinCount: activeGuide.pinCount || (activeGuide.stops || []).length,
    memoCount: activeGuide.memoCount || (activeGuide.stops || []).length,
    couponCount: activeGuide.couponCount || (activeGuide.eventCoupons || []).length || 0,
    guideIntroText: activeGuide.guideIntroText || '',
    guideIntroAudio: activeGuide.guideIntroAudio || null,
    guideIntroVideo: activeGuide.guideIntroVideo || null,
    stops: (activeGuide.stops || []).map(stop => ({ ...stop })),
    eventCoupons: (activeGuide.eventCoupons || []).map(coupon => ({ ...coupon })),
    isPaid: isGuidePaid(activeGuide),
    coinPrice: getGuideCoinPrice(activeGuide),
    monetization: activeGuide.monetization || { isPaid: isGuidePaid(activeGuide), coinPrice: getGuideCoinPrice(activeGuide) },
    isPurchased: true,
    isWidget: true
  };

  if (isGuidePurchased(currentIntroGuideId)) {
    try {
      await window.startGuideFromHome(currentIntroGuideId);
    } catch (error) {
      console.error('[Travelog] Guide start/download failed:', error);
      showToast(localizedText('가이드 다운로드 또는 시작에 실패했습니다.', 'Guide download or start failed.', 'ガイドのダウンロードまたは開始に失敗しました。'));
    }
    return;
  }

  const price = getGuideCoinPrice(activeGuide);
  if (price > 0 && TravelogState.coins < price) {
    showToast(localizedText('코인이 부족합니다.', 'Not enough coins.', 'コインが不足しています。'));
    return;
  }
  if (price > 0) {
    TravelogState.coins -= price;
    showToast(localizedText(`${price.toLocaleString()}코인이 차감되었습니다.`, `${price.toLocaleString()} coins deducted.`, `${price.toLocaleString()}コインが差し引かれました。`));
  } else {
    showToast(localizedText('0코인이 차감되었습니다. 무료 가이드가 보관함에 담겼습니다.', '0 coins deducted. Free guide added to your chest.', '0コインが差し引かれました。無料ガイドを保管箱に追加しました。'));
  }

  if (activeGuide.isSupabaseGuide === true && window.TravelogSupabase && typeof window.TravelogSupabase.purchaseGuide === 'function') {
    try {
      await window.TravelogSupabase.purchaseGuide(activeGuide);
    } catch (error) {
      console.error('[Travelog Supabase] Purchase record failed:', error);
      showToast(localizedText('Supabase 구매 기록 저장에 실패했습니다. 로그인/Auth 설정을 확인해 주세요.', 'Failed to save the Supabase purchase record. Check login/Auth settings.', 'Supabase購入記録の保存に失敗しました。ログイン/Auth設定を確認してください。'));
      if (price > 0) {
        TravelogState.coins += price;
        saveHomePersistentState();
        renderHomeTab();
      }
      return;
    }
  }

  addGuideToMyChest({
    ...guideCard,
    isSupabaseGuide: activeGuide.isSupabaseGuide === true,
    supabaseGuideId: activeGuide.supabaseGuideId || activeGuide.id,
    offlineReady: activeGuide.isSupabaseGuide === true ? false : true,
    offlineStatus: activeGuide.isSupabaseGuide === true ? 'not_downloaded' : 'downloaded'
  });
  updateIntroPurchaseButton({ ...activeGuide, isPurchased: true, offlineReady: activeGuide.isSupabaseGuide !== true });
  showToast(activeGuide.isSupabaseGuide === true
    ? localizedText('내 가이드 보관함에 담았습니다. 다운로드 후 오프라인으로 시작할 수 있습니다.', 'Added to My Guide Chest. Download it to start offline.', 'マイガイド保管箱に追加しました。ダウンロード後にオフラインで開始できます。')
    : localizedText('내 가이드 보관함에 담았습니다.', 'Added to My Guide Chest.', 'マイガイド保管箱に追加しました。'));
}

window.openGuideIntroFromHome = function(guideId) {
  currentIntroGuideId = guideId;
  const activeGuide = buildActiveGuideFromHomeGuide(guideId);
  const stops = Array.isArray(activeGuide.stops) ? activeGuide.stops : [];
  const coupons = Array.isArray(activeGuide.eventCoupons) ? activeGuide.eventCoupons : [];
  const modal = document.getElementById('home-guide-intro-modal');
  if (!modal) {
    window.startGuideFromHome(guideId);
    return;
  }

  const title = localizedField(activeGuide, 'name') || activeGuide.nameKo || activeGuide.name || 'Travelog Guide';
  const description = activeGuide.guideIntroText || localizedField(activeGuide, 'desc') || '등록된 투어 소개글이 없습니다.';
  const cover = activeGuide.representativeImage || activeGuide.bg || '';

  const coverEl = document.getElementById('home-guide-intro-cover');
  if (coverEl) coverEl.style.backgroundImage = cover ? `url('${cover}')` : '';
  const badgeEl = document.getElementById('home-guide-intro-badge');
  if (badgeEl) badgeEl.textContent = activeGuide.badge || '오늘의 가이드';
  const titleEl = document.getElementById('home-guide-intro-title');
  if (titleEl) titleEl.textContent = title;
  const metaEl = document.getElementById('home-guide-intro-meta');
  if (metaEl) metaEl.textContent = `${activeGuide.author || 'Travelog Creator'} · 코스 ${stops.length}개 · 메모 ${activeGuide.memoCount || stops.length}개 · 쿠폰 ${coupons.length}개`;
  const descEl = document.getElementById('home-guide-intro-description');
  if (descEl) descEl.textContent = description;
  const priceBadge = document.getElementById('home-guide-intro-badge');
  if (priceBadge) priceBadge.textContent = `${activeGuide.badge || '오늘의 가이드'} · ${getGuidePriceLabel(activeGuide)}`;
  updateIntroPurchaseButton(activeGuide);

  renderIntroMedia(activeGuide);

  const pinList = document.getElementById('home-guide-intro-pin-list');
  if (pinList) {
    pinList.innerHTML = stops.length ? stops.map((pin, index) => {
      const pinTitle = pin.nameKo || pin.nameEn || pin.name || `코스핀 ${index + 1}`;
      const pinDesc = pin.description || pin.descKo || pin.desc || pin.triggerTextKo || '메모 없음';
      return `
        <div style="background:white; border:1px solid var(--glass-border); border-radius:12px; padding:9px 10px; font-size:12px;">
          <strong style="display:block; color:var(--text-primary); margin-bottom:4px;">${index + 1}. ${escapeHtml(pinTitle)}</strong>
          <span style="display:block; color:var(--text-secondary); line-height:1.45;">${escapeHtml(pinDesc)}</span>
          <small style="display:block; margin-top:5px; color:var(--text-muted);">${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}</small>
        </div>`;
    }).join('') : '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:14px 0;">등록된 핀이 없습니다.</div>';
  }

  const couponList = document.getElementById('home-guide-intro-coupon-list');
  if (couponList) {
    couponList.innerHTML = coupons.length ? coupons.map((coupon, index) => `
      <div style="background:white; border:1px solid var(--glass-border); border-radius:12px; padding:9px 10px; font-size:12px;">
        <strong style="display:block; color:var(--text-primary); margin-bottom:4px;">${index + 1}. ${escapeHtml(coupon.vendor || '업체')}</strong>
        <span style="color:var(--text-secondary);">${escapeHtml(coupon.offer || coupon.name || '쿠폰')}</span>
      </div>`).join('') : '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:14px 0;">포함된 쿠폰이 없습니다.</div>';
  }

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
};

window.closeHomeGuideIntroModal = function() {
  const modal = document.getElementById('home-guide-intro-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
};

window.openHomeGuidePreviewModal = function(guideId) {
  const activeGuide = buildActiveGuideFromHomeGuide(guideId);
  const stops = Array.isArray(activeGuide.stops) ? activeGuide.stops : [];
  const modal = document.getElementById('home-guide-preview-modal');
  if (!modal) return;

  const title = localizedField(activeGuide, 'name') || activeGuide.nameKo || '가이드 미리보기';
  const titleEl = document.getElementById('home-guide-preview-title');
  const metaEl = document.getElementById('home-guide-preview-meta');
  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = `연결된 코스핀 ${stops.length}개 · 지도 경로 미리보기`;

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  const summary = document.getElementById('home-guide-preview-pin-summary');
  if (summary) {
    summary.innerHTML = stops.length ? stops.map((pin, index) => `
      <div style="flex:0 0 auto; min-width:145px; border:1px solid var(--glass-border); border-radius:14px; background:white; padding:8px 10px; font-size:12px;">
        <strong>${index + 1}. ${escapeHtml(pin.nameKo || pin.nameEn || `핀 ${index + 1}`)}</strong><br>
        <span style="color:var(--text-muted);">${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}</span>
      </div>`).join('') : '<div style="color:var(--text-muted); font-size:12px; padding:8px;">표시할 핀이 없습니다.</div>';
  }

  window.setTimeout(() => renderHomeGuidePreviewMap(stops), 80);
};

function renderHomeGuidePreviewMap(stops) {
  const mapEl = document.getElementById('home-guide-preview-map');
  if (!mapEl || typeof L === 'undefined') return;

  if (!homeGuidePreviewMap) {
    homeGuidePreviewMap = L.map(mapEl, { zoomControl: false, attributionControl: false }).setView([37.5780, 126.9768], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(homeGuidePreviewMap);
    homeGuidePreviewLayer = L.layerGroup().addTo(homeGuidePreviewMap);
  }

  homeGuidePreviewLayer.clearLayers();
  const coords = stops
    .map(pin => [Number(pin.lat), Number(pin.lng), pin])
    .filter(item => Number.isFinite(item[0]) && Number.isFinite(item[1]));

  coords.forEach(([lat, lng, pin], index) => {
    const icon = L.divIcon({
      html: `<div style="width:32px;height:32px;border-radius:50%;background:#ff2e63;color:white;border:3px solid white;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 4px 14px rgba(0,0,0,.24);">${index + 1}</div>`,
      className: 'home-preview-pin-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    const marker = L.marker([lat, lng], { icon }).bindPopup(`<strong>${escapeHtml(pin.nameKo || pin.nameEn || `핀 ${index + 1}`)}</strong><br>${escapeHtml(pin.description || pin.descKo || '')}`);
    homeGuidePreviewLayer.addLayer(marker);
  });

  if (coords.length > 1) {
    const line = L.polyline(coords.map(([lat, lng]) => [lat, lng]), {
      color: '#ff2e63',
      weight: 5,
      opacity: 0.92,
      lineJoin: 'round',
      lineCap: 'round'
    });
    homeGuidePreviewLayer.addLayer(line);
    homeGuidePreviewMap.fitBounds(line.getBounds(), { padding: [24, 24] });
  } else if (coords.length === 1) {
    homeGuidePreviewMap.setView([coords[0][0], coords[0][1]], 16);
  }

  homeGuidePreviewMap.invalidateSize();
}

window.closeHomeGuidePreviewModal = function() {
  const modal = document.getElementById('home-guide-preview-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
};

window.startGuideFromHome = async function(guideId) {
  let selectedGuide = getGuideByIdFromCollections(guideId);
  if (needsOfflineDownload(selectedGuide)) {
    try {
      selectedGuide = await downloadSupabaseGuideForOffline(guideId);
    } catch (error) {
      console.error('[Travelog Supabase] Offline download failed:', error);
      showToast(localizedText('오프라인 다운로드에 실패했습니다. 인터넷/Auth 설정을 확인해 주세요.', 'Offline download failed. Check internet/Auth settings.', 'オフラインダウンロードに失敗しました。インターネット/Auth設定を確認してください。'));
      return;
    }
  }

  TravelogState.activeGuide = buildActiveGuideFromHomeGuide(guideId);

  // Perform programmatic tab switch to Map
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(n => n.classList.remove('active'));
  const mapNavItem = document.querySelector('.nav-item[data-tab="map-tab"]');
  if (mapNavItem) mapNavItem.classList.add('active');
  tabContents.forEach(tab => {
    tab.classList.remove('active');
    if (tab.id === 'map-tab') {
      tab.classList.add('active');
    }
  });

  if (window.updateMapLayoutForMode) {
    window.updateMapLayoutForMode('run');
  }

  window.closeHomeGuideIntroModal();
  window.closeHomeGuidePreviewModal();

  if (window.TravelogMapModule) {
    if (typeof window.TravelogMapModule.startGuideRun === 'function') {
      window.TravelogMapModule.startGuideRun(TravelogState.activeGuide);
    } else {
      window.TravelogMapModule.renderTour();
      window.TravelogMapModule.invalidateSize();
    }
    if (typeof window.TravelogMapModule.startRealtimeLocationTracking === 'function') {
      window.TravelogMapModule.startRealtimeLocationTracking();
    }
  }

  const guideStopCount = Array.isArray(TravelogState.activeGuide?.stops) ? TravelogState.activeGuide.stops.length : 0;
  showToast(localizedText(
    `가이드가 시작되었습니다. 지도에 연결된 코스핀 ${guideStopCount}개를 표시했습니다.`,
    `Guide started. ${guideStopCount} connected course pins are now visible on the map.`,
    `ガイドを開始しました。接続されたコースピン ${guideStopCount}個を地図に表示しました。`
  ));
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
const PUBLISHED_GUIDES_STORAGE_KEY = 'travelog_published_guides_v1';
const CREATOR_PUBLISHED_GUIDES_STORAGE_KEY = 'travelog_creator_published_guides_v1';
const PURCHASED_GUIDES_STORAGE_KEY = 'travelog_purchased_guides_v1';
const HOME_COINS_STORAGE_KEY = 'travelog_home_coins_v1';
const HOME_FRIENDS_STORAGE_KEY = 'travelog_home_friends_v1';
const HOME_MESSAGES_STORAGE_KEY = 'travelog_home_messages_v1';
const HIDDEN_MESSAGES_STORAGE_KEY = 'travelog_hidden_messages_v1';
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
let profileManagerNicknameEditEnabled = false;
let profileManagerOriginalNickname = '';
let profileManagerVerifiedNickname = '';
let onboardingAuthInProgress = false;

function initOnboarding() {
  loadSavedProfile();
  bindOnboardingEvents();
  renderUserProfileWidget();
  syncDeviceStorageStatus();

  if (TravelogState.userProfile.isOnboarded) {
    hideOnboardingOverlay(true);
  } else {
    showOnboardingScreen('login');
    restoreSupabaseProfileFromExistingSession().catch(error => {
      console.warn('[Travelog Supabase] Existing profile restore skipped:', error);
    });
  }
}


async function safelyGoToProfileStep(provider) {
  // Login choice: try Supabase Auth for server features, then continue locally even if Auth is unavailable.
  // The app enters only after nickname + device storage agreement are completed.
  const authProvider = provider || TravelogState.userProfile.authProvider || 'Guest';
  if (onboardingAuthInProgress) return;
  onboardingAuthInProgress = true;
  try {
  const defaultNicknames = {
    Google: '구글 여행자',
    Naver: '네이버 여행자',
    Email: '이메일 여행자',
    Guest: '여행자'
  };

  TravelogState.userProfile.authProvider = authProvider;
  if (window.TravelogSupabase && typeof window.TravelogSupabase.connectLoginProvider === 'function') {
    try {
      const authResult = await window.TravelogSupabase.connectLoginProvider(authProvider, TravelogState.userProfile);
      TravelogState.userProfile.supabaseAuthMode = authResult?.mode || 'local-only';
      TravelogState.userProfile.supabaseUserId = authResult?.user?.id || TravelogState.userProfile.supabaseUserId || '';

      if (authResult?.hasRemoteProfile && authResult?.profile) {
        await applySupabaseProfileToLocal(authResult.profile, {
          authProvider,
          authMode: authResult.mode || 'email',
          userId: authResult.user?.id || authResult.profile.id || ''
        });
        hideOnboardingOverlay(false);
        showToast(localizedText(
          `${TravelogState.userProfile.nickname}님의 기존 프로필을 불러왔습니다.`,
          `Loaded ${TravelogState.userProfile.nickname}'s saved profile.`,
          `${TravelogState.userProfile.nickname}さんの保存済みプロフィールを読み込みました。`
        ));
        return;
      }
    } catch (error) {
      console.warn('[Travelog Supabase] Onboarding auth failed; continuing locally.', error);
      TravelogState.userProfile.supabaseAuthMode = 'local-only';
    }
  }
  const input = document.getElementById('onboarding-nickname-input');
  const startBtn = document.getElementById('start-app-btn');
  const draftNickname = TravelogState.userProfile.nickname || defaultNicknames[authProvider] || '여행자';

  if (input) input.value = draftNickname;
  verifiedNickname = draftNickname;
  TravelogState.userProfile.nickname = draftNickname;
  updateOnboardingStartAvailability();
  showNicknameFeedback(localizedText('로그인 방식이 선택되었습니다. 내 디바이스에서 저장폴더를 지정하고 시작하세요.', 'Login method selected. Choose a device storage folder and start.', 'ログイン方法を選択しました。端末の保存フォルダを指定して開始してください。'), true);
  showOnboardingScreen('profile');
  syncDeviceStorageStatus();
  } finally {
    onboardingAuthInProgress = false;
  }
}


function getOnboardingWantsDeviceStorage() {
  const permissionChk = document.getElementById('onboarding-permission-chk');
  return permissionChk ? permissionChk.checked : true;
}

function getDeviceStorageStatusSnapshot() {
  return window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.getStatus === 'function'
    ? window.TravelogDeviceStorage.getStatus()
    : null;
}

function updateOnboardingStartAvailability() {
  const input = document.getElementById('onboarding-nickname-input');
  const startBtn = document.getElementById('start-app-btn');
  const hint = document.getElementById('device-storage-required-hint');
  if (!startBtn) return;

  const nickname = input ? input.value.trim() : '';
  const nicknameReady = nickname.length >= 2 && verifiedNickname === nickname;
  const wantsStorage = getOnboardingWantsDeviceStorage();
  const status = getDeviceStorageStatusSnapshot();
  const storageReady = !wantsStorage || !!(status && status.configured);

  startBtn.disabled = !(nicknameReady && storageReady);

  if (hint) {
    hint.classList.toggle('storage-ready', storageReady);
    if (!wantsStorage) {
      hint.textContent = localizedText('기기 저장을 사용하지 않고 시작합니다.', 'Starting without device folder storage.', '端末保存を使わずに開始します。');
    } else if (storageReady) {
      const folderName = status.selectedFolderName || status.dataFolderName || 'travelog_data';
      hint.textContent = localizedText(`저장 위치 설정 완료: ${folderName}`, `Storage location ready: ${folderName}`, `保存先設定完了: ${folderName}`);
    } else {
      hint.textContent = localizedText('시작 전 내 디바이스에서 저장폴더를 먼저 지정해 주세요.', 'Choose a device storage folder on your device before starting.', '開始前に端末の保存フォルダを指定してください。');
    }
  }
}

async function requestDeviceStorageSetupFromUser() {
  const wantsStorage = getOnboardingWantsDeviceStorage();

  if (!wantsStorage) {
    TravelogState.userProfile.storagePermissionGranted = false;
    TravelogState.userProfile.storageMode = 'none';
    TravelogState.userProfile.storageFolderName = '';
    syncDeviceStorageStatus();
    return true;
  }

  if (!window.TravelogDeviceStorage || typeof window.TravelogDeviceStorage.configureFromUserGesture !== 'function') {
    TravelogState.userProfile.storagePermissionGranted = true;
    TravelogState.userProfile.storageMode = 'browser';
    TravelogState.userProfile.storageFolderName = localizedText('브라우저 내부 저장소', 'Browser internal storage', 'ブラウザ内部保存先');
    syncDeviceStorageStatus();
    return true;
  }

  try {
    const status = await window.TravelogDeviceStorage.configureFromUserGesture();
    TravelogState.userProfile.storagePermissionGranted = true;
    TravelogState.userProfile.storageMode = status.mode || 'browser';
    TravelogState.userProfile.storageFolderName = status.selectedFolderName || 'travelog_data';
    syncDeviceStorageStatus();
    return true;
  } catch (error) {
    console.warn('[Travelog] Device storage setup failed:', error);
    if (error && error.name === 'AbortError') {
      showToast(localizedText('저장 위치 선택이 취소되었습니다. 다시 버튼을 눌러 원하는 위치를 선택해 주세요.', 'Folder selection was canceled. Press the button again and choose a location.', '保存先選択がキャンセルされました。もう一度ボタンを押して保存先を選択してください。'));
      TravelogState.userProfile.storagePermissionGranted = false;
      TravelogState.userProfile.storageMode = 'none';
      TravelogState.userProfile.storageFolderName = '';
      syncDeviceStorageStatus();
      return false;
    }

    // Samsung/Android browsers can show a native folder permission dialog and still fail
    // writable-folder setup afterwards. Keep onboarding usable by switching to app-internal
    // device storage instead of repeating the same blocking alert forever.
    if (typeof window.TravelogDeviceStorage.useInternalStorage === 'function') {
      try {
        const fallbackStatus = await window.TravelogDeviceStorage.useInternalStorage('DIRECTORY_SETUP_FAILED_USE_INTERNAL');
        TravelogState.userProfile.storagePermissionGranted = true;
        TravelogState.userProfile.storageMode = fallbackStatus.mode || 'browser';
        TravelogState.userProfile.storageFolderName = fallbackStatus.selectedFolderName || 'travelog_data';
        syncDeviceStorageStatus();
        showToast(localizedText(
          '선택 폴더 쓰기가 제한되어 앱 내부 기기 저장소의 travelog_data로 저장합니다.',
          'Folder writing is limited, so Travelog will use app-internal travelog_data storage.',
          'フォルダ書き込みが制限されたため、アプリ内部のtravelog_dataに保存します。'
        ));
        return true;
      } catch (fallbackError) {
        console.warn('[Travelog] Internal storage fallback failed:', fallbackError);
      }
    }

    alert(localizedText('저장 위치를 설정하지 못했습니다. 이 브라우저의 폴더 쓰기 권한 상태를 확인한 뒤 다시 시도해 주세요.', "Could not set the storage location. Check this browser\'s folder writing permission and try again.", '保存先を設定できませんでした。このブラウザのフォルダ書き込み権限を確認して再試行してください。'));
    syncDeviceStorageStatus();
    return false;
  }
}

function syncDeviceStorageStatus() {
  if (window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.renderStatusUI === 'function') {
    window.TravelogDeviceStorage.renderStatusUI();
    const status = window.TravelogDeviceStorage.getStatus ? window.TravelogDeviceStorage.getStatus() : null;
    if (status && status.configured) {
      TravelogState.userProfile.storagePermissionGranted = true;
      TravelogState.userProfile.storageMode = status.mode || TravelogState.userProfile.storageMode || 'browser';
      TravelogState.userProfile.storageFolderName = status.selectedFolderName || TravelogState.userProfile.storageFolderName || '';
    }
  }
  updateOnboardingStartAvailability();
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
      startBtn.disabled = true;
      updateOnboardingStartAvailability();
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

  const storageSelectBtn = document.getElementById('device-storage-select-btn');
  if (storageSelectBtn) {
    attachActivationHandler(storageSelectBtn, async () => {
      const ok = await requestDeviceStorageSetupFromUser();
      updateOnboardingStartAvailability();
      if (ok) {
        saveProfile();
        const status = getDeviceStorageStatusSnapshot();
        const isDirectoryMode = status && status.mode === 'directory';
        showToast(isDirectoryMode
          ? localizedText('선택한 위치에 travelog_data 저장폴더를 만들었습니다.', 'Created the travelog_data storage folder in the selected location.', '選択した場所にtravelog_data保存フォルダを作成しました。')
          : localizedText('모바일 제한으로 앱 내부 기기 저장소의 travelog_data를 사용합니다.', 'Using app-internal travelog_data storage because this mobile browser limits folder writing.', 'モバイル制限のためアプリ内部のtravelog_dataを使用します。')
        );
      }
    });
  }

  const permissionChk = document.getElementById('onboarding-permission-chk');
  if (permissionChk && !permissionChk.dataset.bound) {
    permissionChk.dataset.bound = 'true';
    permissionChk.addEventListener('change', updateOnboardingStartAvailability);
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
  updateOnboardingStartAvailability();
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

function setProfileNicknameEditMode(enabled, options = {}) {
  const nicknameInput = document.getElementById('profile-manager-nickname-input');
  const editBtn = document.getElementById('profile-nickname-edit-btn');
  const checkBtn = document.getElementById('profile-nickname-check-btn');

  profileManagerNicknameEditEnabled = !!enabled;

  if (nicknameInput) {
    nicknameInput.readOnly = !profileManagerNicknameEditEnabled;
    nicknameInput.setAttribute('aria-readonly', profileManagerNicknameEditEnabled ? 'false' : 'true');
    nicknameInput.classList.toggle('is-editing', profileManagerNicknameEditEnabled);
    if (!profileManagerNicknameEditEnabled && options.restoreOriginal !== false) {
      nicknameInput.value = profileManagerOriginalNickname || TravelogState.userProfile.nickname || '';
    }
  }

  if (checkBtn) {
    checkBtn.style.display = profileManagerNicknameEditEnabled ? 'inline-flex' : 'none';
  }

  if (editBtn) {
    const icon = editBtn.querySelector('i');
    const label = editBtn.querySelector('span') || editBtn;
    if (profileManagerNicknameEditEnabled) {
      if (icon) icon.className = 'fa-solid fa-rotate-left';
      label.textContent = localizedText('변경취소', 'Cancel change', '変更取消');
      editBtn.setAttribute('aria-label', localizedText('닉네임 변경 취소', 'Cancel nickname change', 'ニックネーム変更を取り消す'));
    } else {
      if (icon) icon.className = 'fa-solid fa-pen';
      label.textContent = localizedText('닉네임변경', 'Change nickname', 'ニックネーム変更');
      editBtn.setAttribute('aria-label', localizedText('닉네임변경', 'Change nickname', 'ニックネーム変更'));
    }
  }
}

function handleProfileNicknameEditButton() {
  const nicknameInput = document.getElementById('profile-manager-nickname-input');

  if (!profileManagerNicknameEditEnabled) {
    profileManagerOriginalNickname = TravelogState.userProfile.nickname || '';
    profileManagerVerifiedNickname = '';
    setProfileNicknameEditMode(true, { restoreOriginal: false });
    showProfileManagerFeedback(localizedText('닉네임을 수정한 뒤 중복확인을 눌러주세요.', 'Edit the nickname, then check availability.', 'ニックネームを編集してから重複確認を押してください。'), true);
    window.setTimeout(() => {
      if (nicknameInput) {
        nicknameInput.focus();
        nicknameInput.select?.();
      }
    }, 80);
    return;
  }

  profileManagerVerifiedNickname = profileManagerOriginalNickname || '';
  setProfileNicknameEditMode(false);
  showProfileManagerFeedback(localizedText('닉네임 변경을 취소했습니다.', 'Nickname change cancelled.', 'ニックネーム変更を取り消しました。'), true);
}

async function verifyProfileManagerNicknameChange() {
  const nicknameInput = document.getElementById('profile-manager-nickname-input');
  if (!nicknameInput) return false;

  if (!profileManagerNicknameEditEnabled) {
    showProfileManagerFeedback(localizedText('닉네임변경 버튼을 먼저 눌러주세요.', 'Press Change nickname first.', '先にニックネーム変更を押してください。'), false);
    return false;
  }

  const nickname = nicknameInput.value.trim();
  const validation = validateNicknameValue(nickname);
  if (!validation.ok) {
    profileManagerVerifiedNickname = '';
    showProfileManagerFeedback(validation.message, false);
    return false;
  }

  if (nickname === profileManagerOriginalNickname) {
    profileManagerVerifiedNickname = nickname;
    showProfileManagerFeedback(localizedText('현재 사용 중인 닉네임입니다.', 'This is your current nickname.', '現在使用中のニックネームです。'), true);
    return true;
  }

  if (window.TravelogSupabase && typeof window.TravelogSupabase.checkNicknameAvailability === 'function') {
    try {
      const result = await window.TravelogSupabase.checkNicknameAvailability(nickname, { requireSession: false });
      if (result && result.available === false) {
        profileManagerVerifiedNickname = '';
        showProfileManagerFeedback(localizedText('이미 다른 유저가 사용 중인 닉네임입니다.', 'Another user is already using this nickname.', '他のユーザーがすでに使用しているニックネームです。'), false);
        return false;
      }
    } catch (error) {
      console.warn('[Travelog Supabase] Nickname availability check failed:', error);
      showProfileManagerFeedback(localizedText('서버 중복확인에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'Server nickname check failed. Please try again shortly.', 'サーバー重複確認に失敗しました。少し後でもう一度お試しください。'), false);
      return false;
    }
  }

  profileManagerVerifiedNickname = nickname;
  showProfileManagerFeedback(localizedText('사용 가능한 닉네임입니다. 저장하기를 누르면 변경됩니다.', 'Nickname is available. Press Save to apply it.', '使用できるニックネームです。保存すると変更されます。'), true);
  return true;
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
  const logoutBtn = document.getElementById('profile-manager-logout-btn');
  const nicknameInput = document.getElementById('profile-manager-nickname-input');
  const nicknameEditBtn = document.getElementById('profile-nickname-edit-btn');
  const nicknameCheckBtn = document.getElementById('profile-nickname-check-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeProfileManagerModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeProfileManagerModal);
  if (uploadBtn && fileInput) uploadBtn.addEventListener('click', () => fileInput.click());
  if (fileInput) fileInput.addEventListener('change', handleProfileManagerUpload);
  if (saveBtn) saveBtn.addEventListener('click', saveProfileManagerChanges);
  if (resetBtn) resetBtn.addEventListener('click', resetProfileSetup);
  if (logoutBtn) logoutBtn.addEventListener('click', logoutCurrentProfile);
  if (nicknameEditBtn) nicknameEditBtn.addEventListener('click', handleProfileNicknameEditButton);
  if (nicknameCheckBtn) nicknameCheckBtn.addEventListener('click', verifyProfileManagerNicknameChange);

  if (nicknameInput) {
    nicknameInput.addEventListener('input', () => {
      profileManagerVerifiedNickname = '';
      hideProfileManagerFeedback();
    });
    nicknameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifyProfileManagerNicknameChange();
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

  profileManagerOriginalNickname = profileManagerDraft.nickname || '';
  profileManagerVerifiedNickname = profileManagerOriginalNickname;

  if (nicknameInput) {
    nicknameInput.value = profileManagerOriginalNickname;
  }

  hideProfileManagerFeedback();
  renderProfileSampleAvatars();
  updateProfileManagerPreview();
  setProfileNicknameEditMode(false, { restoreOriginal: false });
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeProfileManagerModal() {
  const modal = document.getElementById('profile-manager-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  profileManagerDraft = null;
  profileManagerNicknameEditEnabled = false;
  profileManagerOriginalNickname = '';
  profileManagerVerifiedNickname = '';
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

async function saveProfileManagerChanges() {
  if (!profileManagerDraft) return;
  const nicknameInput = document.getElementById('profile-manager-nickname-input');
  const nickname = nicknameInput ? nicknameInput.value.trim() : TravelogState.userProfile.nickname || '';
  const originalNickname = profileManagerOriginalNickname || TravelogState.userProfile.nickname || '';
  const nicknameChanged = nickname !== originalNickname;

  if (profileManagerNicknameEditEnabled || nicknameChanged) {
    const validation = validateNicknameValue(nickname);
    if (!validation.ok) {
      showProfileManagerFeedback(validation.message, false);
      return;
    }

    if (profileManagerVerifiedNickname !== nickname) {
      showProfileManagerFeedback(localizedText('닉네임 변경은 중복확인을 먼저 완료해야 저장됩니다.', 'Check nickname availability before saving a nickname change.', 'ニックネーム変更は重複確認後に保存できます。'), false);
      return;
    }
  }

  TravelogState.userProfile = {
    ...TravelogState.userProfile,
    ...profileManagerDraft,
    nickname: nicknameChanged ? nickname : originalNickname,
    isOnboarded: true
  };
  verifiedNickname = TravelogState.userProfile.nickname;
  saveProfile();
  renderUserProfileWidget();
  
  // Update Home Tab display immediately
  renderHomeTab();

  closeProfileManagerModal();
  showToast(LocalizationDictionary.profile_saved_toast[TravelogState.language] || LocalizationDictionary.profile_saved_toast.ko);
}


function buildDefaultUserProfile() {
  return {
    isOnboarded: false,
    authProvider: null,
    nickname: '',
    avatarType: 'emoji',
    avatarValue: '☀️',
    avatarPresetId: 'sun',
    storagePermissionGranted: false,
    storageMode: 'none',
    storageFolderName: '',
    supabaseAuthMode: 'signed-out',
    supabaseUserId: ''
  };
}

function getSupabaseProfileName(remoteProfile) {
  return String(
    remoteProfile?.display_name ||
    remoteProfile?.displayName ||
    remoteProfile?.name ||
    ''
  ).trim();
}

async function applySupabaseProfileToLocal(remoteProfile, options = {}) {
  const nickname = getSupabaseProfileName(remoteProfile);
  if (!nickname) return false;

  const storageStatus = getDeviceStorageStatusSnapshot();
  const avatarUrl = remoteProfile?.avatar_url || remoteProfile?.avatarUrl || '';

  TravelogState.userProfile = {
    ...buildDefaultUserProfile(),
    ...TravelogState.userProfile,
    isOnboarded: true,
    authProvider: options.authProvider || TravelogState.userProfile.authProvider || 'Email',
    nickname,
    avatarType: avatarUrl ? 'image' : (TravelogState.userProfile.avatarType || 'emoji'),
    avatarValue: avatarUrl || TravelogState.userProfile.avatarValue || '☀️',
    avatarPresetId: avatarUrl ? null : (TravelogState.userProfile.avatarPresetId || 'sun'),
    storagePermissionGranted: storageStatus?.configured ? true : !!TravelogState.userProfile.storagePermissionGranted,
    storageMode: storageStatus?.mode || TravelogState.userProfile.storageMode || 'browser',
    storageFolderName: storageStatus?.selectedFolderName || storageStatus?.dataFolderName || TravelogState.userProfile.storageFolderName || '',
    supabaseAuthMode: options.authMode || TravelogState.userProfile.supabaseAuthMode || 'email',
    supabaseUserId: options.userId || remoteProfile?.id || remoteProfile?.supabaseProfileId || TravelogState.userProfile.supabaseUserId || ''
  };

  if (typeof remoteProfile?.coinBalance === 'number') {
    TravelogState.coins = remoteProfile.coinBalance;
  } else if (typeof remoteProfile?.coin_balance === 'number') {
    TravelogState.coins = remoteProfile.coin_balance;
  }

  verifiedNickname = nickname;
  saveProfile();
  saveHomePersistentState();
  renderUserProfileWidget();
  renderHomeTab();
  updatePointsDisplay();

  if (typeof refreshSupabaseSocialData === 'function') {
    refreshSupabaseSocialData({ requireSession: false }).catch(error => {
      console.warn('[Travelog Supabase] Social data refresh after profile restore skipped:', error);
    });
  }

  return true;
}

async function restoreSupabaseProfileFromExistingSession() {
  if (TravelogState.userProfile?.isOnboarded) return false;
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.fetchCurrentProfile !== 'function') return false;

  window.TravelogSupabase.init?.();
  const remoteProfile = await window.TravelogSupabase.fetchCurrentProfile({ requireSession: false });
  if (!getSupabaseProfileName(remoteProfile)) return false;

  const restored = await applySupabaseProfileToLocal(remoteProfile, {
    authProvider: TravelogState.userProfile.authProvider || 'Email',
    authMode: TravelogState.userProfile.supabaseAuthMode || 'email',
    userId: remoteProfile.id || remoteProfile.supabaseProfileId || ''
  });
  if (restored) {
    hideOnboardingOverlay(false);
    showToast(localizedText(
      `${TravelogState.userProfile.nickname}님의 기존 프로필로 자동 로그인했습니다.`,
      `Signed in with ${TravelogState.userProfile.nickname}'s saved profile.`,
      `${TravelogState.userProfile.nickname}さんの保存済みプロフィールでログインしました。`
    ));
  }
  return restored;
}

async function logoutCurrentProfile() {
  const confirmMessage = localizedText(
    '현재 Supabase 계정에서 로그아웃하고 로그인 화면으로 돌아갈까요?\n\n친구 목록과 쪽지 캐시는 이 기기에서 지워집니다. 제작/구매/다운로드 데이터는 별도로 삭제하지 않습니다.',
    'Sign out of the current Supabase account and return to the login screen?\n\nFriend and message caches on this device will be cleared. Created, purchased, and downloaded guide data will not be deleted.',
    '現在のSupabaseアカウントからログアウトしてログイン画面に戻りますか？\n\nこの端末の友だち・メッセージキャッシュは削除されます。制作・購入・ダウンロードデータは削除しません。'
  );
  if (!window.confirm(confirmMessage)) return;

  try {
    if (window.TravelogSupabase && typeof window.TravelogSupabase.signOut === 'function') {
      await window.TravelogSupabase.signOut();
    }
  } catch (error) {
    console.warn('[Travelog Supabase] Logout failed, clearing local session anyway:', error);
  }

  try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch (_) {}
  try { localStorage.removeItem(HOME_FRIENDS_STORAGE_KEY); } catch (_) {}
  try { localStorage.removeItem(HOME_MESSAGES_STORAGE_KEY); } catch (_) {}

  TravelogState.userProfile = buildDefaultUserProfile();
  TravelogState.friends = [];
  TravelogState.messages = [];
  verifiedNickname = '';
  latestFriendSearchResults = [];
  renderFriendSearchResults([]);
  closeProfileManagerModal();
  renderUserProfileWidget();
  renderHomeTab();

  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('closing');
    showOnboardingScreen('login');
  }

  showToast(localizedText('로그아웃되었습니다. 다른 계정으로 다시 로그인할 수 있습니다.', 'Signed out. You can sign in with another account.', 'ログアウトしました。別のアカウントで再ログインできます。'));
}

function resetProfileSetup() {
  const confirmMessage = localizedText(
    '저장된 프로필을 지우고 처음 설정 화면으로 돌아갈까요?',
    'Remove the saved profile and return to the first setup screen?',
    '保存されたプロフィールを削除して初期設定画面に戻りますか？'
  );

  if (!window.confirm(confirmMessage)) return;

  try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch (error) {}
  TravelogState.userProfile = buildDefaultUserProfile();
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

async function completeOnboarding() {
  const input = document.getElementById('onboarding-nickname-input');
  const nickname = input ? input.value.trim() : '';

  if (!verifiedNickname || verifiedNickname !== nickname) {
    if (!verifyNickname()) return;
  }

  const wantsStorage = getOnboardingWantsDeviceStorage();
  if (wantsStorage) {
    const existingStatus = window.TravelogDeviceStorage && typeof window.TravelogDeviceStorage.getStatus === 'function'
      ? window.TravelogDeviceStorage.getStatus()
      : null;
    if (!existingStatus || !existingStatus.configured) {
      const storageReady = await requestDeviceStorageSetupFromUser();
      if (!storageReady) return;
    } else {
      TravelogState.userProfile.storagePermissionGranted = true;
      TravelogState.userProfile.storageMode = existingStatus.mode || 'browser';
      TravelogState.userProfile.storageFolderName = existingStatus.selectedFolderName || '';
    }
  } else {
    TravelogState.userProfile.storagePermissionGranted = false;
    TravelogState.userProfile.storageMode = 'none';
    TravelogState.userProfile.storageFolderName = '';
  }

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

  if (window.TravelogSupabase && typeof window.TravelogSupabase.syncProfile === 'function') {
    window.TravelogSupabase.syncProfile(TravelogState.userProfile).catch(error => {
      console.warn('[Travelog Supabase] Profile sync failed after local save:', error);
    });
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
    if (legendPanel) legendPanel.style.display = 'none';

    const activeGuide = TravelogState.activeGuide;
    const activePublished = activeGuide && activeGuide.isPublishedGuide === true;

    if (activePublished) {
      if (routeTitleEl) {
        routeTitleEl.removeAttribute('data-localize');
        routeTitleEl.textContent = localizedField(activeGuide, 'name') || activeGuide.name || 'Travelog Guide';
      }
      if (routeDescEl) {
        routeDescEl.removeAttribute('data-localize');
        routeDescEl.textContent = localizedField(activeGuide, 'desc') || activeGuide.desc || localizedText(
          `코스 ${activeGuide.pinCount || (activeGuide.stops || []).length || 0}개 · 메모 ${activeGuide.memoCount || 0}개 · 쿠폰 ${activeGuide.couponCount || 0}개`,
          `Stops ${activeGuide.pinCount || (activeGuide.stops || []).length || 0} · Memos ${activeGuide.memoCount || 0} · Coupons ${activeGuide.couponCount || 0}`,
          `コース ${activeGuide.pinCount || (activeGuide.stops || []).length || 0}個 · メモ ${activeGuide.memoCount || 0}個 · クーポン ${activeGuide.couponCount || 0}個`
        );
      }
    } else {
      // Restore data-localize attributes for built-in demo guide mode
      if (routeTitleEl) routeTitleEl.setAttribute('data-localize', 'map_route_title');
      if (routeDescEl) routeDescEl.setAttribute('data-localize', 'map_route_desc');

      // Restore default Gyeongbokgung text & localized translation for built-in/demo guides
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
  registerPublishedGuide: registerPublishedGuide,
  removePublishedGuide: removePublishedGuide,
  renderHomeTab: renderHomeTab,
  addGuideToMyChest: addGuideToMyChest,
  isGuidePurchased: isGuidePurchased,
  deductCoins: (amount) => {
    const price = Number(amount) || 0;
    if (TravelogState.coins < price) return false;
    TravelogState.coins -= price;
    saveHomePersistentState();
    renderHomeTab();
    return true;
  },
  claimCoupon: (coupon) => {
    TravelogState.ownedCoupons.push(coupon);
    if (window.TravelogRewardsModule && typeof window.TravelogRewardsModule.renderCouponWallet === 'function') {
      window.TravelogRewardsModule.renderCouponWallet();
    }
  }
};
