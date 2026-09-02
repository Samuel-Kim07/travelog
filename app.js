// ==========================================
// Travelog Global Application Controller & State
// ==========================================

const TravelogState = {
  language: 'ko', // ko, en, ja, zh, th, vi, fr, es
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
  guideRunActive: false,
  locationGuideStarted: false,
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
  coin_charge_badge: { en: 'Travel Coin', ko: '트레블 코인', ja: 'トラベルコイン' },
  coin_charge_title: { en: 'Charge Coins', ko: '코인 충전', ja: 'コインチャージ' },
  coin_charge_desc: { en: 'Choose how you want to charge coins.', ko: '원하는 충전 방법을 선택하세요.', ja: 'チャージ方法を選択してください。' },
  coin_charge_ad_hint: { en: 'Watch an ad and earn coins', ko: '광고 시청 후 코인을 받아요', ja: '広告を見てコインを受け取ります' },
  coin_charge_pay_hint: { en: 'Buy the amount of coins you need', ko: '필요한 만큼 코인을 구매해요', ja: '必要な分だけコインを購入します' },
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
  msg_badge: { en: 'Messages', ko: '쪽지함', ja: 'メッセージ' },
  msg_title: { en: 'Messages', ko: '쪽지함', ja: 'メッセージ' },
  msg_desc: { en: 'View received and sent messages separately.', ko: '받은 쪽지와 보낸 쪽지를 나눠서 확인합니다.', ja: '受信メッセージと送信メッセージを分けて確認します。' },
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
  blog_feed_title: { en: 'Travel Logs & Stories', ko: '여행 블로그 & 스토리', ja: '旅ログ＆ストーリー' },
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
  builder_title: { en: 'Map Tour Guide Builder', ko: '지도 투어 가이드 빌더', ja: '地図ツアーガイドビルダー' },
  builder_desc: { en: 'Create your own customized guide! Click points directly on the Map tab to log coordinates, then upload audio tracks or write guidance scripts here.', ko: '나만의 맞춤 가이드를 만드세요! 지도 탭을 클릭하여 핀을 생성한 뒤, 음성 파일을 녹음하거나 스크립트를 작성하여 가이드로 퍼블리싱해보세요.', ja: '自分だけのカスタムガイドを作りましょう！地図タブでピンを置き、音声や案内文を登録できます。' },
  builder_tour_name: { en: 'Tour Guide Name', ko: '투어 가이드 이름', ja: 'ツアーガイド名' },
  builder_select_coords: { en: 'Selected Map Pins', ko: '선택된 지도 핀 목록', ja: '選択した地図ピン' },
  no_pins_placeholder: { en: 'Go to Map Tab and click on the map to place pins!', ko: '지도 탭으로 이동하여 원하는 위치를 클릭해 핀을 배치하세요!', ja: '地図タブで好きな場所をクリックしてピンを配置してください！' },
  save_tour: { en: '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Guide', ko: '<i class="fa-solid fa-cloud-arrow-up"></i> 출간하기', ja: '<i class="fa-solid fa-cloud-arrow-up"></i> ガイドを公開' },
  clear_pins: { en: '<i class="fa-solid fa-trash-can"></i> Reset Pins', ko: '<i class="fa-solid fa-trash-can"></i> 선택 핀 초기화', ja: '<i class="fa-solid fa-trash-can"></i> ピンをリセット' },
  recorder_title: { en: 'Interactive Guide Voice Recorder', ko: '가이드 음성 녹음 스튜디오', ja: 'ガイド音声録音スタジオ' },
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
  onboarding_privacy_hint: { en: 'Email credentials are used only for Supabase authentication and are not stored by the app.', ko: '이메일 로그인 정보는 Supabase 인증에만 사용되며 앱에 저장되지 않습니다.', ja: 'メールログイン情報はSupabase認証にのみ使用され、アプリには保存されません。' },
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
  location_guide_preview: { en: 'Preview', ko: '미리보기', ja: 'プレビュー' },
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
  nav_location: { en: 'My Location', ko: '내위치', ja: '現在地' },
  nav_explore: { en: 'Explore', ko: '피드', ja: 'フィード' },
  nav_rewards: { en: 'Rewards', ko: '쿠폰&이벤트', ja: '特典＆イベント' },
  nav_creator: { en: 'Creator', ko: '스튜디오', ja: 'スタジオ' },
  location_running_guide: { en: 'Active Guide', ko: '진행 중인 가이드', ja: '進行中のガイド' },
  location_guide_ready: { en: 'Ready', ko: '대기', ja: '待機' },
  location_guide_running: { en: 'Running', ko: '진행 중', ja: '進行中' },
  location_guide_start: { en: 'Start', ko: '시작', ja: '開始' },
  location_guide_stop: { en: 'Quit', ko: '그만두기', ja: '終了' },
  coupon_event_quest_title: { en: 'Coupon & Event Quests', ko: '쿠폰&이벤트 퀘스트', ja: 'クーポン＆イベントクエスト' },
  coupon_event_quest_desc: { en: 'Find coupon events and location missions together.', ko: '쿠폰 이벤트와 위치 기반 미션을 한 화면에서 확인하세요.', ja: 'クーポンイベントと位置ミッションを一画面で確認できます。' },
  share: { en: 'Share', ko: '공유', ja: '共有' },
  search_placeholder: { en: 'Search logs...', ko: '여행기 검색...', ja: '旅ログを検索...' },
  puzzle_placeholder: { en: 'Enter password/answer...', ko: '암호 또는 정답 입력...', ja: '暗号または答えを入力...' }
};

// Add the extended language pack loaded from languages.js.
if (window.TravelogLanguagePack) {
  Object.entries(window.TravelogLanguagePack).forEach(([key, translations]) => {
    if (!LocalizationDictionary[key]) return;
    const iconPrefix = String(LocalizationDictionary[key].en || '').match(/^<i[^>]*><\/i>\s*/)?.[0] || '';
    const prepared = Object.fromEntries(Object.entries(translations).map(([lang, value]) => [
      lang,
      iconPrefix && !String(value).startsWith('<i') ? `${iconPrefix}${value}` : value
    ]));
    Object.assign(LocalizationDictionary[key], prepared);
  });
}


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
  const passwordRecoveryRedirectDetected = initPasswordRecoveryFlow();
  initOnboarding({ forcePasswordRecovery: passwordRecoveryRedirectDetected });
  
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

  // Restore the user's last selected language.
  setLanguage(loadSavedLanguage());

  // Initialize Home Tab UI & Events
  loadPublishedGuides();
  initHomeTab();
  initSupabaseRuntime();
});

// Tab Navigation logic
function initNavigation() {
  const questMount = document.getElementById('integrated-quest-mount');
  const adventureLayout = document.querySelector('#adventure-tab .adventure-layout');
  if (questMount && adventureLayout && adventureLayout.parentElement !== questMount) {
    questMount.appendChild(adventureLayout);
  }

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
        if (typeof refreshSupabaseSocialData === 'function') {
          refreshSupabaseSocialData({ requireSession: false }).catch(error => {
            console.warn('[Travelog Supabase] Home social refresh skipped:', error);
          });
        }
      }

      if (targetTab === 'map-tab' && window.TravelogMapModule) {
        if (item.dataset.locationNav === 'true') {
          window.updateMapLayoutForMode?.('location');
          window.renderLocationGuidePanel?.();
          window.TravelogMapModule.requestCurrentLocation?.(null, true);
        }
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
        // Creator entry keeps create mode; the center button always opens My Location mode.
        const isLocationNav = item.dataset.locationNav === 'true';
        if (!isLocationNav && window.updateMapLayoutForMode) {
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
    { id: 'rec-1', name: '서울 북촌한옥마을 반나절 도보 투어', author: '지민 (로컬 가이드)', rating: '4.9', bg: 'assets/images/recommended-guides/han.png', badge: '인기' },
    { id: 'rec-2', name: '부산 해운대 해변 열차 낭만 여행', author: '준호 (로컬 가이드)', rating: '4.8', bg: 'assets/images/recommended-guides/hae.png', badge: '강추' },
    { id: 'rec-3', name: '제주 우도 전기자전거 환상 투어', author: '수진 (로컬 가이드)', rating: '4.7', bg: 'assets/images/recommended-guides/jeju.png', badge: '신규' }
  ],
  today: [
    { id: 'today-1', name: '경복궁 역사/문화 가이드 투어', author: '민호 (서울 토박이)', rating: '4.9', bg: 'assets/images/blogs/blog-seoul-history-food.svg', badge: '오늘의 로그' },
    { id: 'today-2', name: '경주 첨성대 달빛 야경 산책', author: '혜진 (로컬 가이드)', rating: '4.7', bg: 'assets/images/profile/profile-night.svg', badge: '오로 선정' }
  ],
  star: [
    { id: 'star-1', name: 'JYP의 단내투어', author: 'JYP (스타 가이드)', rating: '5.0', bg: 'assets/images/star-guides/jyp.png', badge: 'STAR' },
    { id: 'star-2', name: '추아저씨의 오키나와 그냥 따라와 투어', author: '추아저씨 (스타 가이드)', rating: '4.9', bg: 'assets/images/star-guides/choo.png', badge: 'STAR' }
  ],
  event: [
    { id: 'event-1', name: '수원 화성 성곽 보물찾기 퀘스트', author: '트레블로그 이벤트', rating: '4.8', bg: 'assets/images/event-guides/suwon.png', badge: '선물 증정' },
    { id: 'event-2', name: '인천 송도 미래도시 야경 퀘스트', author: '송도 관광공사', rating: '4.6', bg: 'assets/images/event-guides/inch.png', badge: '포인트 2배' }
  ]
};


async function initSupabaseRuntime() {
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.fetchPublishedGuideCards !== 'function') return;
  try {
    window.TravelogSupabase.init?.();
    if (!passwordRecoveryActive && !TravelogState.userProfile?.isOnboarded && typeof window.TravelogSupabase.fetchCurrentProfile === 'function') {
      await restoreSupabaseProfileFromExistingSession();
    }

    if (!passwordRecoveryActive && TravelogState.userProfile?.isOnboarded && typeof window.TravelogSupabase.syncProfile === 'function') {
      window.TravelogSupabase.syncProfile(TravelogState.userProfile).catch(error => {
        console.warn('[Travelog Supabase] Profile sync skipped:', error);
      });
    }

    if (!passwordRecoveryActive && TravelogState.userProfile?.isOnboarded && typeof refreshSupabaseSocialData === 'function') {
      refreshSupabaseSocialData({ requireSession: false }).catch(error => {
        console.warn('[Travelog Supabase] Social sync skipped:', error);
      });
      startSupabaseSocialRefresh();
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
    likeCount: Math.max(0, Number(guide?.likeCount || 0)),
    likedByCurrentUser: guide?.likedByCurrentUser === true,
    publishedAt: guide?.publishedAt || '',
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
  sortTodayGuidesByLikes();

  TravelogState.userGuides = [
    { ...guide, isWidget: guide.isWidget !== false },
    ...TravelogState.userGuides.filter(item => item.id !== guide.id)
  ];

  return guide;
}

function sortTodayGuidesByLikes() {
  RECOMMEND_GUIDES_DATA.today = RECOMMEND_GUIDES_DATA.today
    .map((guide, index) => ({ guide, index }))
    .sort((a, b) => {
      const likeDifference = Number(b.guide.likeCount || 0) - Number(a.guide.likeCount || 0);
      if (likeDifference !== 0) return likeDifference;
      const publishedDifference = Date.parse(b.guide.publishedAt || b.guide.createdAt || 0) - Date.parse(a.guide.publishedAt || a.guide.createdAt || 0);
      if (Number.isFinite(publishedDifference) && publishedDifference !== 0) return publishedDifference;
      return a.index - b.index;
    })
    .map(item => item.guide);
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
    TravelogState.friends = dedupeFriendCollection(TravelogState.friends);
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
      if (Array.isArray(friends)) TravelogState.friends = dedupeFriendCollection(friends);
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

  document.querySelectorAll('[data-msg-tab]').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tab = tabBtn.dataset.msgTab === 'sent' ? 'sent' : 'received';
      switchMessageBoxTab(tab);
    });
  });

  // Bind Coins Actions
  const coinChargeOpenBtn = document.getElementById('coin-charge-open-btn');
  const coinChargeCloseBtn = document.getElementById('coin-charge-close-btn');
  if (coinChargeOpenBtn) coinChargeOpenBtn.addEventListener('click', openCoinChargeModal);
  if (coinChargeCloseBtn) coinChargeCloseBtn.addEventListener('click', closeCoinChargeModal);

  const adBtn = document.getElementById('charge-ad-btn');
  if (adBtn) adBtn.addEventListener('click', () => {
    closeCoinChargeModal();
    startAdChargeSimulation();
  });

  const payBtn = document.getElementById('charge-pay-btn');
  if (payBtn) payBtn.addEventListener('click', () => {
    closeCoinChargeModal();
    openCoinShop();
  });

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
  renderFriendRequestsAndFeedback();

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
          <span class="widget-block-meta" style="color:#c9f1d5 !important;">
            <svg class="widget-block-meta-icon" aria-hidden="true" viewBox="0 0 50 50" focusable="false">
              <path d="M 8.00 36.00 L 8.00 49.00 L 41.00 49.00 L 41.00 36.00 L 40.00 35.00 L 40.00 34.00 L 37.00 31.00 L 36.00 31.00 L 35.00 30.00 L 14.00 30.00 L 13.00 31.00 L 12.00 31.00 L 9.00 34.00 L 9.00 35.00 Z M 20.00 2.00 L 19.00 3.00 L 18.00 3.00 L 13.00 8.00 L 13.00 9.00 L 12.00 10.00 L 12.00 19.00 L 13.00 20.00 L 13.00 21.00 L 18.00 26.00 L 19.00 26.00 L 20.00 27.00 L 29.00 27.00 L 30.00 26.00 L 31.00 26.00 L 36.00 21.00 L 36.00 20.00 L 37.00 19.00 L 37.00 10.00 L 36.00 9.00 L 36.00 8.00 L 31.00 3.00 L 30.00 3.00 L 29.00 2.00 Z" fill="currentColor" fill-rule="evenodd"></path>
            </svg>
            <span>${escapeHtml(guide.author)} &middot; ★ ${guide.rating}</span>
          </span>
        </div>
        <button class="widget-block-btn" onclick="window.startGuideFromHome('${guide.id}')">
          <img class="widget-block-start-icon" src="assets/icons/ui/myguid_start_001.svg?v=2" alt="" aria-hidden="true">
          <span>${needsOfflineDownload(guide) ? '다운로드 후 시작' : '가이드 시작'}</span>
        </button>
      </div>`;
  }).join('');
}

function renderGuidesScrollList(containerId, listData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = listData.map(item => {
    const displayedRating = item.isSupabaseGuide ? Number(item.likeCount || 0) : item.rating;
    const ratingMarkup = String(displayedRating).toUpperCase() === 'NEW'
      ? '<span class="guide-card-rating-text">NEW</span>'
      : `<img class="guide-card-rating-icon" src="assets/icons/ui/like_icon.svg" alt="" aria-hidden="true"> <span>${escapeHtml(String(displayedRating))}</span>`;
    const priceMarkup = isGuidePaid(item)
      ? `<span class="guide-card-price guide-card-price-paid"><img class="guide-card-price-icon" src="assets/icons/ui/tc_small.svg" alt="트레블 코인"> <span>${getGuideCoinPrice(item).toLocaleString()}</span></span>`
      : '<span class="guide-card-price guide-card-price-free">무료</span>';

    return `
      <div class="guide-card" onclick="window.openGuideIntroFromHome('${item.id}')">
        <div class="guide-card-bg" style="background-image: url('${item.bg}')"></div>
        <div class="guide-card-content">
          <h5 class="guide-card-title">${escapeHtml(item.name)}</h5>
          <span class="guide-card-author"><img class="guide-card-author-icon" src="assets/icons/ui/guid.svg" alt="" aria-hidden="true"> ${escapeHtml(item.author)}</span>
          <div class="guide-card-footer">
            <span class="guide-card-rating">${ratingMarkup}</span>
            <span class="guide-card-badge">${item.badge}</span>
            ${priceMarkup}
          </div>
        </div>
      </div>`;
  }).join('');
}

// Friends Logic
let currentMessageFriendId = null;
let latestFriendSearchResults = [];
let latestFriendRequests = [];
let latestFriendFeedback = [];
let friendGroups = [];
let friendGroupAssignments = new Map();
let supabaseFriendSyncInProgress = false;
let supabaseMessageSyncInProgress = false;
let currentMessageBoxTab = 'received';
let supabaseSocialRefreshIntervalId = null;

function isSupabaseFriendFeatureReady() {
  return !!(window.TravelogSupabase && typeof window.TravelogSupabase.fetchFriends === 'function');
}

function getFriendIdentityKey(friend) {
  if (!friend || typeof friend !== 'object') return '';
  return String(friend.supabaseProfileId || friend.id || '').trim();
}

function dedupeFriendCollection(friends = []) {
  const uniqueFriends = new Map();
  (Array.isArray(friends) ? friends : []).forEach(friend => {
    const identityKey = getFriendIdentityKey(friend);
    if (!identityKey) return;
    const existing = uniqueFriends.get(identityKey);
    if (!existing || (!existing.isSupabaseFriend && friend.isSupabaseFriend)) {
      uniqueFriends.set(identityKey, friend);
    }
  });
  return [...uniqueFriends.values()];
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
  const actionButton = profile => {
    const relationship = profile.relationship || null;
    if (relationship?.status === 'accepted') {
      return '<button class="btn-rect secondary" type="button" disabled style="padding:6px 10px; font-size:11px; border-radius:999px; opacity:.7;">친구</button>';
    }
    if (relationship?.status === 'pending' && relationship.direction === 'outgoing') {
      return '<button class="btn-rect secondary" type="button" disabled style="padding:6px 10px; font-size:11px; border-radius:999px; opacity:.7;">요청 중</button>';
    }
    if (relationship?.status === 'pending' && relationship.direction === 'incoming') {
      return '<button class="btn-rect secondary" type="button" onclick="window.focusFriendRequests()" style="padding:6px 10px; font-size:11px; border-radius:999px;">받은 요청</button>';
    }
    return `<button class="btn-rect friend-request-search-btn" type="button" onclick="window.requestSupabaseFriend('${escapeHtml(profile.supabaseProfileId || profile.id)}')" style="padding:6px 10px; font-size:11px; border-radius:999px;"><i class="fa-solid fa-user-plus"></i> 친구신청</button>`;
  };
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
        ${actionButton(profile)}
      </div>`).join('')}`;
}

async function syncSupabaseFriends(options = {}) {
  if (!isSupabaseFriendFeatureReady() || supabaseFriendSyncInProgress) return false;
  supabaseFriendSyncInProgress = true;
  try {
    const requestOptions = { requireSession: options.requireSession === true, interactiveLogin: options.interactiveLogin === true };
    const [friends, requests, feedback] = await Promise.all([
      window.TravelogSupabase.fetchFriends(requestOptions),
      typeof window.TravelogSupabase.fetchFriendRequests === 'function' ? window.TravelogSupabase.fetchFriendRequests(requestOptions) : Promise.resolve([]),
      typeof window.TravelogSupabase.fetchFriendFeedback === 'function' ? window.TravelogSupabase.fetchFriendFeedback(requestOptions) : Promise.resolve([])
    ]);
    if (Array.isArray(friends)) {
      TravelogState.friends = dedupeFriendCollection(friends);
      latestFriendRequests = Array.isArray(requests) ? requests : [];
      latestFriendFeedback = Array.isArray(feedback) ? feedback : [];
      saveHomePersistentState();
      renderFriendList();
      renderFriendRequestsAndFeedback();
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

async function syncSupabaseFriendGroups(options = {}) {
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.fetchFriendGroups !== 'function') return false;
  try {
    const result = await window.TravelogSupabase.fetchFriendGroups({
      requireSession: options.requireSession === true,
      interactiveLogin: options.interactiveLogin === true
    });
    friendGroups = Array.isArray(result?.groups) ? result.groups : [];
    friendGroupAssignments = new Map(
      (Array.isArray(result?.assignments) ? result.assignments : [])
        .filter(item => item?.friendId && item?.groupId)
        .map(item => [String(item.friendId), String(item.groupId)])
    );
    renderFriendGroups();
    renderFriendList();
    renderFriendEditList();
    return true;
  } catch (error) {
    console.warn('[Travelog Supabase] Friend group sync failed:', error);
    if (options.showError) {
      showToast(localizedText('친구 그룹을 불러오지 못했습니다. SQL 마이그레이션 적용 여부를 확인해 주세요.', 'Could not load friend groups. Check the SQL migration.', '友だちグループを読み込めませんでした。'));
    }
    return false;
  }
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
  await syncSupabaseFriendGroups(options);
  await syncSupabaseMessages(options);
}

function startSupabaseSocialRefresh() {
  if (supabaseSocialRefreshIntervalId) return;
  supabaseSocialRefreshIntervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshSupabaseSocialData({ requireSession: false }).catch(error => {
        console.warn('[Travelog Supabase] Scheduled social refresh skipped:', error);
      });
    }
  }, 20000);
  if (!document.documentElement.dataset.friendRequestVisibilityBound) {
    document.documentElement.dataset.friendRequestVisibilityBound = 'true';
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshSupabaseSocialData({ requireSession: false }).catch(error => {
          console.warn('[Travelog Supabase] Visibility social refresh skipped:', error);
        });
      }
    });
  }
}

function bindFriendUiEvents() {
  const editBtn = document.getElementById('friend-edit-btn');
  const editCloseBtn = document.getElementById('friend-edit-close-btn');
  const addBtn = document.getElementById('friend-add-btn');
  const friendInput = document.getElementById('friend-name-input');
  const groupCreateBtn = document.getElementById('friend-group-create-btn');
  const groupNameInput = document.getElementById('friend-group-name-input');
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
  if (groupCreateBtn && !groupCreateBtn.dataset.bound) {
    groupCreateBtn.dataset.bound = 'true';
    groupCreateBtn.addEventListener('click', createFriendGroupFromInput);
  }
  if (groupNameInput && !groupNameInput.dataset.bound) {
    groupNameInput.dataset.bound = 'true';
    groupNameInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') createFriendGroupFromInput();
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
  const friends = dedupeFriendCollection(TravelogState.friends);
  if (friends.length === 0) {
    list.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px 0; text-align:center;">아직 등록된 친구가 없습니다. 친구 편집에서 Supabase 닉네임으로 찾아보세요.</div>';
    return;
  }
  list.innerHTML = friends.map(friend => {
    const friendId = String(friend.supabaseProfileId || friend.id || '');
    const groupId = friendGroupAssignments.get(friendId) || '';
    const group = friendGroups.find(item => String(item.id) === String(groupId));
    const subLabel = group?.name || friend.memo || (friend.isSupabaseFriend ? 'Supabase 친구' : '친구');
    return `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:rgba(255,255,255,.62); border:1px solid var(--glass-border); border-radius:14px; padding:8px 10px;">
      <div style="display:flex; align-items:center; gap:8px; min-width:0;">
        <div style="width:30px; height:30px; border-radius:50%; background:var(--grad-hero); display:flex; align-items:center; justify-content:center; color:white; font-weight:900; flex-shrink:0;">${escapeHtml((friend.name || '?').slice(0, 1))}</div>
        <div style="min-width:0;">
          <div style="font-size:13px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(friend.name)}</div>
          <div style="font-size:10px; color:var(--text-muted);">${escapeHtml(subLabel)}</div>
        </div>
      </div>
      <button class="btn-rect secondary home-friend-message-btn" type="button" onclick="window.openFriendMessageModal('${friend.id}')" aria-label="${escapeHtml(friend.name)}에게 쪽지 보내기" title="${escapeHtml(friend.name)}에게 쪽지 보내기">
        <img src="assets/icons/ui/send_post.svg" alt="" aria-hidden="true">
      </button>
    </div>`;
  }).join('');
}

function renderFriendRequestsAndFeedback() {
  const summary = document.getElementById('friend-request-summary');
  const requestList = document.getElementById('home-friend-request-list');
  const feedbackList = document.getElementById('home-friend-feedback-list');
  const requests = Array.isArray(latestFriendRequests) ? latestFriendRequests : [];
  const feedback = Array.isArray(latestFriendFeedback) ? latestFriendFeedback : [];

  if (summary) {
    summary.textContent = `친구요청 ${requests.length}건이 있습니다.`;
    summary.classList.toggle('has-requests', requests.length > 0);
  }
  if (requestList) {
    requestList.style.display = requests.length > 0 ? 'flex' : 'none';
    requestList.innerHTML = requests.map(request => `
      <div class="friend-request-card">
        <div class="friend-request-person">
          <div class="friend-request-avatar">${escapeHtml((request.name || '?').slice(0, 1))}</div>
          <div>
            <div class="friend-request-name">${escapeHtml(request.name || 'Travelog User')}</div>
            <div class="friend-request-label">친구 요청을 보냈습니다.</div>
          </div>
        </div>
        <div class="friend-request-actions">
          <button class="btn-rect friend-request-accept-btn" type="button" onclick="window.respondToFriendRequest('${escapeHtml(request.requestId || request.id)}', 'accept')">수락</button>
          <button class="btn-rect secondary friend-request-reject-btn" type="button" onclick="window.respondToFriendRequest('${escapeHtml(request.requestId || request.id)}', 'reject')">거절</button>
        </div>
      </div>`).join('');
  }
  if (feedbackList) {
    feedbackList.style.display = feedback.length > 0 ? 'flex' : 'none';
    feedbackList.innerHTML = feedback.map(item => `
      <div class="friend-feedback-card" role="status">
        <div><strong>${escapeHtml(item.name || '상대방')}</strong>님이 친구 수락을 거절했습니다.</div>
        <button class="btn-rect secondary" type="button" onclick="window.dismissFriendFeedback('${escapeHtml(item.requestId || item.id)}')">확인</button>
      </div>`).join('');
  }
}

function renderFriendGroups() {
  const list = document.getElementById('friend-group-list');
  if (!list) return;
  if (friendGroups.length === 0) {
    list.innerHTML = '<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:6px 0;">아직 만든 그룹이 없습니다.</div>';
    return;
  }
  list.innerHTML = friendGroups.map(group => {
    const memberCount = [...friendGroupAssignments.values()].filter(groupId => String(groupId) === String(group.id)).length;
    return `
      <div class="friend-group-card">
        <div class="friend-group-card-name">${escapeHtml(group.name)}<span class="friend-group-card-count">${memberCount}명</span></div>
        <div class="friend-group-card-actions">
          <button class="btn-rect secondary" type="button" onclick="window.renameFriendGroup('${group.id}')">이름 변경</button>
          <button class="btn-rect secondary" type="button" onclick="window.deleteFriendGroup('${group.id}')" style="color:var(--accent-pink);">삭제</button>
        </div>
      </div>`;
  }).join('');
}

function renderFriendEditList() {
  const list = document.getElementById('friend-edit-list');
  if (!list) return;
  const friends = dedupeFriendCollection(TravelogState.friends);
  if (friends.length === 0) {
    list.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:18px 0;">사용자를 검색해 친구신청을 보내 주세요. 상대방이 수락하면 여기에 표시됩니다.</div>';
    return;
  }
  list.innerHTML = friends.map(friend => {
    const friendId = String(friend.supabaseProfileId || friend.id || '');
    const selectedGroupId = friendGroupAssignments.get(friendId) || '';
    const groupOptions = friendGroups.map(group =>
      `<option value="${group.id}"${String(group.id) === String(selectedGroupId) ? ' selected' : ''}>${escapeHtml(group.name)}</option>`
    ).join('');
    const groupSelect = friend.isSupabaseFriend
      ? `<select class="friend-group-select" aria-label="${escapeHtml(friend.name)}의 친구 그룹" onchange="window.moveFriendToGroup('${friendId}', this.value)">
          <option value="">그룹 없음</option>${groupOptions}
        </select>`
      : '<select class="friend-group-select" disabled aria-label="Supabase 친구만 그룹 지정 가능"><option>로그인 친구만</option></select>';
    return `
    <div class="friend-edit-card">
      <div class="friend-edit-card-main">
        <div style="font-size:13px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(friend.name)}</div>
        <div style="font-size:10px; color:var(--text-muted);">${escapeHtml(friend.memo || (friend.isSupabaseFriend ? 'Supabase 친구' : '친구'))}</div>
      </div>
      <div class="friend-edit-card-actions">
        ${groupSelect}
        <button class="btn-rect secondary" type="button" onclick="window.openFriendMessageModal('${friend.id}')" style="padding:5px 9px; font-size:11px; border-radius:10px;">쪽지</button>
        <button class="btn-rect secondary" type="button" onclick="window.deleteFriend('${friend.id}')" style="padding:5px 9px; font-size:11px; border-radius:10px; color:var(--accent-pink);">삭제</button>
      </div>
    </div>`;
  }).join('');
}

async function openFriendEditModal() {
  renderFriendSearchResults([]);
  renderFriendGroups();
  renderFriendEditList();
  const modal = document.getElementById('friend-edit-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
  if (isSupabaseFriendFeatureReady()) {
    renderFriendSearchResults([], 'Supabase 친구 목록을 불러오는 중입니다...');
    const synced = await syncSupabaseFriends({ requireSession: true, interactiveLogin: true, showError: true });
    await syncSupabaseFriendGroups({ requireSession: true, interactiveLogin: true, showError: true });
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

async function createFriendGroupFromInput() {
  const input = document.getElementById('friend-group-name-input');
  const name = String(input?.value || '').trim();
  if (!name) {
    showToast(localizedText('그룹 이름을 입력해 주세요.', 'Enter a group name.', 'グループ名を入力してください。'));
    input?.focus();
    return;
  }
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.createFriendGroup !== 'function') return;
  try {
    await window.TravelogSupabase.createFriendGroup(name, { interactiveLogin: true });
    if (input) input.value = '';
    await syncSupabaseFriendGroups({ requireSession: true, interactiveLogin: true });
    showToast(localizedText('친구 그룹을 만들었습니다.', 'Friend group created.', '友だちグループを作成しました。'));
  } catch (error) {
    console.error('[Travelog Supabase] Friend group create failed:', error);
    const duplicate = error?.code === '23505';
    showToast(duplicate
      ? localizedText('같은 이름의 그룹이 이미 있습니다.', 'A group with that name already exists.', '同じ名前のグループがあります。')
      : localizedText('친구 그룹을 만들지 못했습니다.', 'Could not create the friend group.', '友だちグループを作成できませんでした。'));
  }
}

window.renameFriendGroup = async function(groupId) {
  const group = friendGroups.find(item => String(item.id) === String(groupId));
  if (!group || !window.TravelogSupabase || typeof window.TravelogSupabase.renameFriendGroup !== 'function') return;
  const nextName = window.prompt('새 그룹 이름을 입력해 주세요.', group.name);
  if (nextName === null) return;
  const cleanName = nextName.trim();
  if (!cleanName || cleanName === group.name) return;
  try {
    await window.TravelogSupabase.renameFriendGroup(groupId, cleanName, { interactiveLogin: true });
    await syncSupabaseFriendGroups({ requireSession: true, interactiveLogin: true });
    showToast(localizedText('그룹 이름을 변경했습니다.', 'Group renamed.', 'グループ名を変更しました。'));
  } catch (error) {
    console.error('[Travelog Supabase] Friend group rename failed:', error);
    showToast(error?.code === '23505'
      ? localizedText('같은 이름의 그룹이 이미 있습니다.', 'A group with that name already exists.', '同じ名前のグループがあります。')
      : localizedText('그룹 이름을 변경하지 못했습니다.', 'Could not rename the group.', 'グループ名を変更できませんでした。'));
  }
};

window.deleteFriendGroup = async function(groupId) {
  const group = friendGroups.find(item => String(item.id) === String(groupId));
  if (!group || !window.TravelogSupabase || typeof window.TravelogSupabase.deleteFriendGroup !== 'function') return;
  if (!window.confirm(`‘${group.name}’ 그룹을 삭제할까요? 그룹에 속한 친구는 삭제되지 않습니다.`)) return;
  try {
    await window.TravelogSupabase.deleteFriendGroup(groupId, { interactiveLogin: true });
    await syncSupabaseFriendGroups({ requireSession: true, interactiveLogin: true });
    showToast(localizedText('그룹만 삭제했습니다. 친구 목록은 유지됩니다.', 'Group deleted. Friends were kept.', 'グループのみ削除し、友だちは維持されます。'));
  } catch (error) {
    console.error('[Travelog Supabase] Friend group delete failed:', error);
    showToast(localizedText('친구 그룹을 삭제하지 못했습니다.', 'Could not delete the friend group.', '友だちグループを削除できませんでした。'));
  }
};

window.moveFriendToGroup = async function(friendId, groupId) {
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.moveFriendToGroup !== 'function') return;
  try {
    await window.TravelogSupabase.moveFriendToGroup(friendId, groupId, { interactiveLogin: true });
    if (groupId) friendGroupAssignments.set(String(friendId), String(groupId));
    else friendGroupAssignments.delete(String(friendId));
    renderFriendGroups();
    renderFriendList();
    renderFriendEditList();
    showToast(localizedText('친구 그룹을 변경했습니다.', 'Friend group updated.', '友だちグループを変更しました。'));
  } catch (error) {
    console.error('[Travelog Supabase] Friend group move failed:', error);
    await syncSupabaseFriendGroups({ requireSession: true, interactiveLogin: true });
    showToast(localizedText('친구 그룹을 변경하지 못했습니다.', 'Could not update the friend group.', '友だちグループを変更できませんでした。'));
  }
};

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

  renderFriendSearchResults([], '로그인 연결 후 친구신청 기능을 사용할 수 있습니다.');
  showToast(localizedText('친구신청은 Supabase 로그인 연결이 필요합니다.', 'Friend requests require a Supabase login.', '友だち申請にはSupabaseログインが必要です。'));
}

window.requestSupabaseFriend = async function(profileId) {
  if (!profileId || !window.TravelogSupabase || typeof window.TravelogSupabase.requestFriend !== 'function') return;
  try {
    await window.TravelogSupabase.requestFriend(profileId, { interactiveLogin: true });
    const input = document.getElementById('friend-name-input');
    if (input) input.value = '';
    latestFriendSearchResults = latestFriendSearchResults.map(profile => {
      if (String(profile.supabaseProfileId || profile.id) !== String(profileId)) return profile;
      return { ...profile, relationship: { status: 'pending', direction: 'outgoing' } };
    });
    renderFriendSearchResults(latestFriendSearchResults);
    await syncSupabaseFriends({ requireSession: true, interactiveLogin: true });
    showToast(localizedText('친구신청을 보냈습니다.', 'Friend request sent.', '友だち申請を送信しました。'));
  } catch (error) {
    console.error('[Travelog Supabase] Friend request failed:', error);
    const code = error?.code || error?.message || '';
    if (code === 'ALREADY_FRIENDS') {
      showToast(localizedText('이미 친구로 등록되어 있습니다.', 'You are already friends.', 'すでに友だちです。'));
    } else if (code === 'INCOMING_FRIEND_REQUEST_EXISTS') {
      showToast(localizedText('상대방이 보낸 친구요청이 있습니다. 홈에서 수락 또는 거절해 주세요.', 'You have a request from this user. Respond from Home.', '相手からの友だち申請があります。ホームで確認してください。'));
    } else {
      showToast(localizedText(`친구신청에 실패했습니다: ${error.message || error}`, `Friend request failed: ${error.message || error}`, `友だち申請に失敗しました: ${error.message || error}`));
    }
  }
};
window.addSupabaseFriend = window.requestSupabaseFriend;

window.focusFriendRequests = function() {
  closeFriendEditModal();
  const section = document.getElementById('home-friend-section');
  section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.respondToFriendRequest = async function(requestId, action) {
  if (!requestId || !window.TravelogSupabase || typeof window.TravelogSupabase.respondToFriendRequest !== 'function') return;
  try {
    await window.TravelogSupabase.respondToFriendRequest(requestId, action, { interactiveLogin: true });
    await syncSupabaseFriends({ requireSession: true, interactiveLogin: true });
    showToast(action === 'accept'
      ? localizedText('친구요청을 수락했습니다. 친구 목록에 추가되었습니다.', 'Friend request accepted.', '友だち申請を承認しました。')
      : localizedText('친구요청을 거절했습니다. 신청자에게 결과가 전달됩니다.', 'Friend request declined. The requester will be notified.', '友だち申請を拒否しました。'));
  } catch (error) {
    console.error('[Travelog Supabase] Friend request response failed:', error);
    showToast(localizedText('친구요청 처리에 실패했습니다.', 'Could not process the friend request.', '友だち申請を処理できませんでした。'));
  }
};

window.dismissFriendFeedback = async function(requestId) {
  if (!requestId || !window.TravelogSupabase || typeof window.TravelogSupabase.dismissFriendFeedback !== 'function') return;
  try {
    await window.TravelogSupabase.dismissFriendFeedback(requestId, { interactiveLogin: true });
    latestFriendFeedback = latestFriendFeedback.filter(item => String(item.requestId || item.id) !== String(requestId));
    renderFriendRequestsAndFeedback();
  } catch (error) {
    console.error('[Travelog Supabase] Friend feedback dismiss failed:', error);
    showToast(localizedText('알림 확인 처리에 실패했습니다.', 'Could not dismiss the notification.', '通知を確認できませんでした。'));
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
    unread: false,
    isMine: true
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

function isSentMessage(msg) {
  if (!msg) return false;
  return msg.isMine === true || String(msg.sender || '').trim().startsWith('나 →');
}

function getMessagesForCurrentTab() {
  const messages = getVisibleMessages();
  if (currentMessageBoxTab === 'sent') {
    return messages.filter(isSentMessage);
  }
  return messages.filter(msg => !isSentMessage(msg));
}

function updateMessageBoxTabs() {
  document.querySelectorAll('[data-msg-tab]').forEach(tabBtn => {
    const isActive = tabBtn.dataset.msgTab === currentMessageBoxTab;
    tabBtn.classList.toggle('active', isActive);
    tabBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function switchMessageBoxTab(tab) {
  currentMessageBoxTab = tab === 'sent' ? 'sent' : 'received';
  updateMessageBoxTabs();
  renderMessageBoxMessages(document.getElementById('msg-list-container'));
}

function getEmptyMessageText() {
  if (currentMessageBoxTab === 'sent') {
    return localizedText('보낸 쪽지가 없습니다.', 'No sent messages.', '送信メッセージがありません。');
  }
  return localizedText('받은 쪽지가 없습니다.', 'No received messages.', '受信メッセージがありません。');
}

function renderMessageBoxMessages(container) {
  if (!container) return;
  updateMessageBoxTabs();
  const messages = getMessagesForCurrentTab();
  if (messages.length === 0) {
    container.innerHTML = `<div style="font-size:12px; color:var(--text-muted); padding:18px 0; text-align:center;">${escapeHtml(getEmptyMessageText())}</div>`;
    return;
  }

  container.innerHTML = messages.map(msg => {
    const messageId = escapeHtml(String(msg.id));
    const sent = isSentMessage(msg);
    const showAddFriend = !sent && shouldShowMessageAddFriendButton(msg);
    const senderLabel = sent ? (msg.sender || '').replace(/^나\s*→\s*/, '받는 사람: ') : msg.sender;
    return `
      <div class="msg-item ${msg.unread ? 'unread' : ''} ${sent ? 'sent' : 'received'}" onclick="window.readMessage('${messageId}')">
        <div class="msg-item-header">
          <div class="msg-item-meta">
            <span class="msg-direction-pill ${sent ? 'sent' : 'received'}">${sent ? '보낸쪽지' : '받은쪽지'}</span>
            <span class="msg-item-sender">${escapeHtml(senderLabel || (sent ? '보낸 쪽지' : 'Travelog User'))}</span>
            <span class="msg-item-date">${escapeHtml(msg.date || '')}</span>
          </div>
          <div class="msg-action-group">
            ${showAddFriend ? `<button class="msg-add-friend-btn" type="button" onclick="event.stopPropagation(); window.registerMessageSenderAsFriend('${messageId}')" aria-label="보낸 사람에게 친구신청">친구신청</button>` : ''}
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

  currentMessageBoxTab = 'received';
  updateMessageBoxTabs();
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

  if (!window.TravelogSupabase || typeof window.TravelogSupabase.requestFriend !== 'function') {
    showToast(localizedText('Supabase 친구신청 기능을 사용할 수 없습니다.', 'Supabase friend requests are not available.', 'Supabase友だち申請機能を使用できません。'));
    return;
  }

  try {
    await window.TravelogSupabase.requestFriend(msg.senderId, { interactiveLogin: true });
    await syncSupabaseFriends({ requireSession: true, interactiveLogin: true });
    renderMessageBoxMessages(document.getElementById('msg-list-container'));
    showToast(localizedText(`${msg.sender}님에게 친구신청을 보냈습니다.`, `Friend request sent to ${msg.sender}.`, `${msg.sender}さんに友だち申請を送りました。`));
  } catch (error) {
    console.error('[Travelog Supabase] Message sender friend request failed:', error);
    showToast(localizedText(`친구신청에 실패했습니다: ${error.message || error}`, `Friend request failed: ${error.message || error}`, `友だち申請に失敗しました: ${error.message || error}`));
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

function openCoinChargeModal() {
  const modal = document.getElementById('coin-charge-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeCoinChargeModal() {
  const modal = document.getElementById('coin-charge-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

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
      isSupabaseGuide: selectedGuideInfo?.isSupabaseGuide === true || guideCard.isSupabaseGuide === true,
      supabaseGuideId: selectedGuideInfo?.supabaseGuideId || guideCard.supabaseGuideId || guideCard.id || guideId,
      likeCount: Math.max(0, Number(selectedGuideInfo?.likeCount ?? guideCard.likeCount ?? 0)),
      likedByCurrentUser: typeof selectedGuideInfo?.likedByCurrentUser === 'boolean'
        ? selectedGuideInfo.likedByCurrentUser
        : guideCard.likedByCurrentUser === true,
      publishedAt: selectedGuideInfo?.publishedAt || guideCard.publishedAt || resolvedPublishedRecord.publishedAt || '',
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
  const likeBtn = document.getElementById('home-guide-intro-like-btn');
  const pinListOpenBtn = document.getElementById('home-guide-pin-list-open-btn');
  const pinListCloseBtn = document.getElementById('home-guide-pin-list-close-btn');
  const pinListModal = document.getElementById('home-guide-pin-list-modal');

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
  if (likeBtn && !likeBtn.dataset.bound) {
    likeBtn.dataset.bound = 'true';
    likeBtn.addEventListener('click', toggleCurrentIntroGuideLike);
  }
  if (pinListOpenBtn && !pinListOpenBtn.dataset.bound) {
    pinListOpenBtn.dataset.bound = 'true';
    pinListOpenBtn.addEventListener('click', window.openHomeGuidePinListModal);
  }
  if (pinListCloseBtn && !pinListCloseBtn.dataset.bound) {
    pinListCloseBtn.dataset.bound = 'true';
    pinListCloseBtn.addEventListener('click', window.closeHomeGuidePinListModal);
  }
  if (pinListModal && !pinListModal.dataset.bound) {
    pinListModal.dataset.bound = 'true';
    pinListModal.addEventListener('click', (event) => {
      if (event.target === pinListModal) window.closeHomeGuidePinListModal();
    });
  }
}

function updateGuideLikeState(guideId, likeCount, liked) {
  const safeCount = Math.max(0, Number(likeCount || 0));
  Object.values(RECOMMEND_GUIDES_DATA).forEach(list => {
    const guide = list.find(item => String(item.id) === String(guideId));
    if (guide) {
      guide.likeCount = safeCount;
      guide.likedByCurrentUser = liked === true;
    }
  });
  TravelogState.userGuides.forEach(guide => {
    if (String(guide.id) === String(guideId)) {
      guide.likeCount = safeCount;
      guide.likedByCurrentUser = liked === true;
    }
  });
  sortTodayGuidesByLikes();
}

function renderIntroGuideLike(activeGuide) {
  const button = document.getElementById('home-guide-intro-like-btn');
  const count = document.getElementById('home-guide-intro-like-count');
  if (!button || !count) return;
  const available = activeGuide?.isSupabaseGuide === true && activeGuide?.isPublishedGuide === true;
  document.querySelector('#home-guide-intro-modal .tour-intro-hero')?.classList.toggle('has-like', available);
  button.hidden = !available;
  button.disabled = false;
  const liked = activeGuide?.likedByCurrentUser === true;
  button.classList.toggle('is-liked', liked);
  button.setAttribute('aria-pressed', liked ? 'true' : 'false');
  button.setAttribute('aria-label', liked ? '가이드 좋아요 취소' : '가이드 좋아요');
  count.textContent = Math.max(0, Number(activeGuide?.likeCount || 0)).toLocaleString();
}

async function refreshCurrentIntroGuideLike(guideId) {
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.fetchPublishedGuideLikeSummaries !== 'function') return;
  const summaries = await window.TravelogSupabase.fetchPublishedGuideLikeSummaries();
  if (currentIntroGuideId !== guideId) return;
  const summary = summaries.find(item => String(item.guideId) === String(guideId));
  if (!summary) return;
  updateGuideLikeState(guideId, summary.likeCount, summary.liked);
  renderIntroGuideLike(buildActiveGuideFromHomeGuide(guideId));
  renderHomeTab();
}

async function toggleCurrentIntroGuideLike() {
  if (!currentIntroGuideId) return;
  const guideId = currentIntroGuideId;
  const activeGuide = buildActiveGuideFromHomeGuide(guideId);
  const button = document.getElementById('home-guide-intro-like-btn');
  if (!button || button.disabled || activeGuide.isSupabaseGuide !== true) return;
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.togglePublishedGuideLike !== 'function') {
    showToast(localizedText('좋아요 기능을 불러오지 못했습니다.', 'Likes are not available.', 'いいね機能を読み込めませんでした。'));
    return;
  }

  const previousLiked = activeGuide.likedByCurrentUser === true;
  const previousCount = Math.max(0, Number(activeGuide.likeCount || 0));
  updateGuideLikeState(guideId, previousLiked ? previousCount - 1 : previousCount + 1, !previousLiked);
  renderIntroGuideLike(buildActiveGuideFromHomeGuide(guideId));
  button.disabled = true;

  try {
    const result = await window.TravelogSupabase.togglePublishedGuideLike(activeGuide.supabaseGuideId || guideId);
    updateGuideLikeState(guideId, result.likeCount, result.liked);
    renderHomeTab();
    if (currentIntroGuideId === guideId) renderIntroGuideLike(buildActiveGuideFromHomeGuide(guideId));
  } catch (error) {
    console.warn('[Travelog Guide Likes] Toggle failed:', error);
    updateGuideLikeState(guideId, previousCount, previousLiked);
    if (currentIntroGuideId === guideId) renderIntroGuideLike(buildActiveGuideFromHomeGuide(guideId));
    showToast(localizedText('좋아요를 저장하지 못했습니다. 로그인 상태와 네트워크를 확인해 주세요.', 'Could not save the like. Check your sign-in and network.', 'いいねを保存できませんでした。ログイン状態とネットワークを確認してください。'));
  } finally {
    if (currentIntroGuideId === guideId) button.disabled = false;
  }
}

window.openHomeGuidePinListModal = function() {
  const modal = document.getElementById('home-guide-pin-list-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('home-guide-pin-list-close-btn')?.focus();
};

window.closeHomeGuidePinListModal = function() {
  const modal = document.getElementById('home-guide-pin-list-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
};

function renderIntroMedia(activeGuide) {
  const mediaBox = document.getElementById('home-guide-intro-media');
  if (!mediaBox) return;
  const mediaItems = [];
  const video = activeGuide.guideIntroVideo;
  const audio = activeGuide.guideIntroAudio;

  if (video && video.dataUrl) {
    mediaItems.push(`
      <div style="border:1px solid var(--glass-border); border-radius:14px; padding:10px; background:rgba(0,0,0,.04);">
        <strong class="tour-intro-media-title"><img src="assets/icons/guide-intro/intro-video.svg" alt="" aria-hidden="true"> 투어소개 영상</strong>
        <video controls playsinline preload="metadata" src="${video.dataUrl}" style="width:100%; max-height:220px; margin-top:8px; border-radius:12px; background:#000;"></video>
      </div>`);
  }
  if (audio && audio.dataUrl) {
    mediaItems.push(`
      <div style="border:1px solid var(--glass-border); border-radius:14px; padding:10px; background:rgba(112,162,183,.07);">
        <strong class="tour-intro-media-title"><img src="assets/icons/guide-intro/intro-audio.svg" alt="" aria-hidden="true"> 투어소개 음성</strong>
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
  const purchased = isGuidePurchased(activeGuide.id);
  const statusGuide = { ...activeGuide, ...(getGuideByIdFromCollections(activeGuide.id) || {}) };
  purchaseBtn.classList.toggle('is-purchased', purchased);
  if (purchased) {
    if (needsOfflineDownload(statusGuide)) {
      purchaseBtn.textContent = '다운로드 후 시작';
    } else {
      purchaseBtn.textContent = '가이드 시작';
    }
  } else {
    purchaseBtn.textContent = '구매하기';
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
  if (badgeEl) badgeEl.textContent = isGuidePaid(activeGuide) ? 'Paid' : 'Free';
  const titleEl = document.getElementById('home-guide-intro-title');
  if (titleEl) titleEl.textContent = title;
  const metaEl = document.getElementById('home-guide-intro-meta');
  if (metaEl) metaEl.textContent = `${activeGuide.author || 'Travelog Creator'} · 코스 ${stops.length}개 · 메모 ${activeGuide.memoCount || stops.length}개 · 쿠폰 ${coupons.length}개`;
  const descEl = document.getElementById('home-guide-intro-description');
  if (descEl) descEl.textContent = description;
  const priceValue = document.getElementById('home-guide-intro-price-value');
  if (priceValue) priceValue.textContent = getGuideCoinPrice(activeGuide).toLocaleString();
  updateIntroPurchaseButton(activeGuide);
  renderIntroGuideLike(activeGuide);
  if (activeGuide.isSupabaseGuide === true) {
    refreshCurrentIntroGuideLike(guideId).catch(error => {
      console.warn('[Travelog Guide Likes] Refresh failed:', error);
    });
  }

  renderIntroMedia(activeGuide);

  const pinListCount = document.getElementById('home-guide-pin-list-count');
  if (pinListCount) pinListCount.textContent = stops.length.toLocaleString();
  const pinListMeta = document.getElementById('home-guide-pin-list-meta');
  if (pinListMeta) pinListMeta.textContent = `등록된 핀 ${stops.length.toLocaleString()}개`;

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
  window.closeHomeGuidePinListModal?.();
  const modal = document.getElementById('home-guide-intro-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  currentIntroGuideId = null;
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
  TravelogState.guideRunActive = true;
  TravelogState.locationGuideStarted = false;

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

  if (window.updateMapLayoutForMode) {
    window.updateMapLayoutForMode('location');
  }
  window.renderLocationGuidePanel?.();

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
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh', 'th', 'vi', 'fr', 'es'];
const LANGUAGE_STORAGE_KEY = 'travelog_language_v2';
const LANGUAGE_LABELS = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '简体中文',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  fr: 'Français',
  es: 'Español'
};

function normalizeLanguage(lang) {
  const normalized = String(lang || '').toLowerCase();
  if (normalized.startsWith('zh')) return 'zh';
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : 'ko';
}

function loadSavedLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'ko');
  } catch (error) {
    return 'ko';
  }
}

function getNextLanguage(lang) {
  const currentIndex = SUPPORTED_LANGUAGES.indexOf(normalizeLanguage(lang));
  return SUPPORTED_LANGUAGES[(currentIndex + 1) % SUPPORTED_LANGUAGES.length];
}

function localizedText(ko, en, ja) {
  const lang = normalizeLanguage(TravelogState.language);
  if (lang === 'ja') return ja || en || ko;
  if (lang === 'en') return en || ko || ja;
  if (['zh', 'th', 'vi', 'fr', 'es'].includes(lang)) return en || ko || ja;
  return ko || en || ja;
}

function localizedField(source, baseKey) {
  const suffixMap = { ko: 'Ko', en: 'En', ja: 'Ja', zh: 'Zh', th: 'Th', vi: 'Vi', fr: 'Fr', es: 'Es' };
  const suffix = suffixMap[normalizeLanguage(TravelogState.language)] || 'Ko';
  return source?.[`${baseKey}${suffix}`] || source?.[`${baseKey}En`] || source?.[`${baseKey}Ko`] || source?.[`${baseKey}Ja`] || '';
}

function initLanguageToggle() {
  const langBtn = document.getElementById('lang-toggle-btn');
  const menu = document.getElementById('language-menu');
  if (!langBtn || !menu) return;

  const closeMenu = () => {
    menu.hidden = true;
    langBtn.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    menu.hidden = false;
    langBtn.setAttribute('aria-expanded', 'true');
    const selected = menu.querySelector('.language-option.is-selected') || menu.querySelector('.language-option');
    selected?.focus();
  };

  langBtn.addEventListener('click', event => {
    event.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  menu.querySelectorAll('.language-option').forEach(option => {
    option.addEventListener('click', () => {
      setLanguage(option.dataset.lang);
      closeMenu();
      langBtn.focus();
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.language-selector')) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      langBtn.focus();
    }
  });
}

function setLanguage(lang) {
  const nextLanguage = normalizeLanguage(lang);
  TravelogState.language = nextLanguage;
  document.documentElement.lang = nextLanguage;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  } catch (error) {
    // Language switching still works when browser storage is unavailable.
  }
  
  // Update header text and selected menu item.
  const currentLangText = document.getElementById('current-lang');
  if (currentLangText) {
    currentLangText.textContent = LANGUAGE_LABELS[nextLanguage];
  }
  document.querySelectorAll('.language-option').forEach(option => {
    const selected = option.dataset.lang === nextLanguage;
    option.classList.toggle('is-selected', selected);
    option.setAttribute('aria-selected', String(selected));
  });
  
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
  window.renderLocationGuidePanel?.();

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
const ACCOUNT_PROFILE_STORAGE_KEY = 'travelog_account_profiles_v1';
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
let passwordRecoveryActive = false;
let passwordRecoverySessionReady = false;
let passwordRecoverySubmitting = false;
let passwordRecoverySubscription = null;
const ACCESS_REGION_PREFS_KEY = 'travelog_access_region_preferences_v1';
const ACCESS_REGION_PROMPT_RETRY_DAYS = 7;
let accessRegionRecordBusy = false;
let accessRegionPromptTimer = 0;

function readAccessRegionPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCESS_REGION_PREFS_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch (_) {
    return {};
  }
}

function getAccessRegionUserId() {
  return String(TravelogState.userProfile?.supabaseUserId || '').trim();
}

function getAccessRegionPreference() {
  const userId = getAccessRegionUserId();
  return userId ? readAccessRegionPreferences()[userId] || null : null;
}

function saveAccessRegionPreference(patch = {}) {
  const userId = getAccessRegionUserId();
  if (!userId) return null;
  const all = readAccessRegionPreferences();
  all[userId] = { ...(all[userId] || {}), ...patch, userId };
  try { localStorage.setItem(ACCESS_REGION_PREFS_KEY, JSON.stringify(all)); } catch (_) {}
  updateAccessRegionSettingUi();
  return all[userId];
}

function setAccessRegionFeedback(message, type = 'info') {
  const feedback = document.getElementById('access-region-consent-feedback');
  if (!feedback) return;
  feedback.textContent = String(message || '');
  feedback.classList.remove('success', 'error', 'info');
  feedback.classList.add(type === 'success' ? 'success' : type === 'error' ? 'error' : 'info');
  feedback.style.display = message ? 'block' : 'none';
}

function updateAccessRegionSettingUi() {
  const preference = getAccessRegionPreference();
  const enabled = preference?.status === 'granted';
  const checkbox = document.getElementById('profile-access-region-toggle');
  const status = document.getElementById('profile-access-region-status');
  if (checkbox) checkbox.checked = enabled;
  if (status) {
    status.textContent = enabled
      ? localizedText('기록 중 · 하루 한 번, 약 1km 단위', 'Enabled · once daily, approximately 1 km precision', '記録中・1日1回、約1km単位')
      : localizedText('기록하지 않음', 'Not recording', '記録しない');
  }
}

function closeAccessRegionConsentModal(options = {}) {
  const modal = document.getElementById('access-region-consent-modal');
  modal?.classList.remove('active');
  modal?.setAttribute('aria-hidden', 'true');
  setAccessRegionFeedback('', 'info');
  if (options.dismissed === true) {
    saveAccessRegionPreference({ status: 'dismissed', dismissedAt: new Date().toISOString() });
  }
}

function showAccessRegionConsentModal() {
  const modal = document.getElementById('access-region-consent-modal');
  if (!modal || !getAccessRegionUserId()) return;
  setAccessRegionFeedback('', 'info');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function getAccessRegionErrorMessage(error) {
  const code = String(error?.code || error?.name || '').toUpperCase();
  const message = String(error?.message || error || '').toUpperCase();
  if (code === '1' || code === 'PERMISSION_DENIED') {
    return localizedText('위치 권한이 거부되었습니다. 브라우저 사이트 권한에서 위치를 허용한 뒤 다시 시도해 주세요.', 'Location permission was denied. Allow location in the browser site settings and try again.', '位置情報の権限が拒否されました。ブラウザのサイト設定で許可して再試行してください。');
  }
  if (code === '2' || code === 'POSITION_UNAVAILABLE') {
    return localizedText('현재 위치를 확인할 수 없습니다. GPS 또는 네트워크 상태를 확인해 주세요.', 'Your location is unavailable. Check GPS or network status.', '現在地を確認できません。GPSまたはネットワークを確認してください。');
  }
  if (code === '3' || code === 'TIMEOUT') {
    return localizedText('위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.', 'Location lookup timed out. Please try again.', '位置情報の取得がタイムアウトしました。再試行してください。');
  }
  if (message.includes('USER_ACCESS_REGIONS') || message.includes('PGRST205') || message.includes('SCHEMA CACHE')) {
    return localizedText('접속 지역 저장용 Supabase SQL을 먼저 실행해 주세요.', 'Run the Supabase access-region setup SQL first.', '接続地域保存用のSupabase SQLを先に実行してください。');
  }
  return localizedText('접속 지역을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not save the access region. Try again shortly.', '接続地域を保存できませんでした。しばらくしてから再試行してください。');
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error('GEOLOCATION_NOT_SUPPORTED');
      error.code = 'GEOLOCATION_NOT_SUPPORTED';
      reject(error);
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000
    });
  });
}

async function recordConsentedAccessRegion(options = {}) {
  if (accessRegionRecordBusy || !getAccessRegionUserId()) return false;
  if (!window.TravelogSupabase?.recordAccessRegion) return false;
  accessRegionRecordBusy = true;
  const allowButton = document.getElementById('access-region-consent-allow');
  if (allowButton) allowButton.disabled = true;
  if (!options.silent) {
    setAccessRegionFeedback(localizedText('현재 접속 지역을 확인하고 있습니다...', 'Checking your current access region...', '現在の接続地域を確認しています...'), 'info');
  }
  try {
    const position = await getBrowserPosition();
    saveAccessRegionPreference({ status: 'granted', grantedAt: new Date().toISOString() });
    await window.TravelogSupabase.recordAccessRegion({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language
    });
    saveAccessRegionPreference({
      status: 'granted',
      lastRecordedDate: new Date().toISOString().slice(0, 10),
      lastRecordedAt: new Date().toISOString()
    });
    if (!options.silent) {
      setAccessRegionFeedback(localizedText('접속 지역을 안전하게 기록했습니다.', 'Your access region was recorded.', '接続地域を安全に記録しました。'), 'success');
      window.setTimeout(() => closeAccessRegionConsentModal(), 650);
    }
    return true;
  } catch (error) {
    console.warn('[Travelog Access Region] Record failed:', error);
    if (String(error?.code || '') === '1') {
      saveAccessRegionPreference({ status: 'denied', deniedAt: new Date().toISOString() });
    }
    if (!options.silent) setAccessRegionFeedback(getAccessRegionErrorMessage(error), 'error');
    return false;
  } finally {
    accessRegionRecordBusy = false;
    if (allowButton) allowButton.disabled = false;
    updateAccessRegionSettingUi();
  }
}

function maybePromptAccessRegionConsent() {
  if (!TravelogState.userProfile?.isOnboarded || !getAccessRegionUserId()) return;
  const preference = getAccessRegionPreference();
  const today = new Date().toISOString().slice(0, 10);
  if (preference?.status === 'granted') {
    if (preference.lastRecordedDate !== today) recordConsentedAccessRegion({ silent: true });
    return;
  }
  if (preference?.status === 'denied' || preference?.status === 'revoked') return;
  if (preference?.status === 'dismissed' && preference.dismissedAt) {
    const retryAt = new Date(preference.dismissedAt).getTime() + ACCESS_REGION_PROMPT_RETRY_DAYS * 86400000;
    if (Date.now() < retryAt) return;
  }
  showAccessRegionConsentModal();
}

function scheduleAccessRegionConsentCheck(delay = 700) {
  if (accessRegionPromptTimer) window.clearTimeout(accessRegionPromptTimer);
  accessRegionPromptTimer = window.setTimeout(() => {
    accessRegionPromptTimer = 0;
    maybePromptAccessRegionConsent();
  }, delay);
}

function bindAccessRegionControls() {
  const modal = document.getElementById('access-region-consent-modal');
  const allowButton = document.getElementById('access-region-consent-allow');
  const laterButton = document.getElementById('access-region-consent-later');
  const closeButton = document.getElementById('access-region-consent-close');
  const toggle = document.getElementById('profile-access-region-toggle');
  allowButton?.addEventListener('click', () => recordConsentedAccessRegion({ silent: false }));
  laterButton?.addEventListener('click', () => closeAccessRegionConsentModal({ dismissed: true }));
  closeButton?.addEventListener('click', () => closeAccessRegionConsentModal({ dismissed: true }));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeAccessRegionConsentModal({ dismissed: true });
  });
  toggle?.addEventListener('change', () => {
    if (toggle.checked) {
      showAccessRegionConsentModal();
    } else {
      saveAccessRegionPreference({ status: 'revoked', revokedAt: new Date().toISOString() });
      closeAccessRegionConsentModal();
    }
  });
  updateAccessRegionSettingUi();
}

function setPasswordRecoveryFeedback(message, type = 'info') {
  const feedback = document.getElementById('password-recovery-feedback');
  if (!feedback) return;
  feedback.textContent = String(message || '');
  feedback.classList.remove('success', 'error', 'info');
  feedback.classList.add(type === 'success' ? 'success' : type === 'error' ? 'error' : 'info');
  feedback.style.display = message ? 'block' : 'none';
}

function setPasswordRecoveryBusy(isBusy) {
  passwordRecoverySubmitting = !!isBusy;
  const submitButton = document.getElementById('password-recovery-submit-btn');
  const newPasswordInput = document.getElementById('password-recovery-new');
  const confirmPasswordInput = document.getElementById('password-recovery-confirm');
  if (submitButton) {
    submitButton.disabled = !!isBusy || !passwordRecoverySessionReady;
    submitButton.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }
  if (newPasswordInput) newPasswordInput.disabled = !!isBusy || !passwordRecoverySessionReady;
  if (confirmPasswordInput) confirmPasswordInput.disabled = !!isBusy || !passwordRecoverySessionReady;
}

function showPasswordRecoveryScreen(options = {}) {
  passwordRecoveryActive = true;
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('closing');
  }
  showOnboardingScreen('password-recovery');

  if (options.ready === true) {
    passwordRecoverySessionReady = true;
    setPasswordRecoveryFeedback(localizedText(
      '복구 링크가 확인되었습니다. 새 비밀번호를 두 번 입력해 주세요.',
      'Recovery link verified. Enter your new password twice.',
      '復旧リンクを確認しました。新しいパスワードを2回入力してください。'
    ), 'success');
    setPasswordRecoveryBusy(false);
    window.setTimeout(() => document.getElementById('password-recovery-new')?.focus(), 120);
    return;
  }

  passwordRecoverySessionReady = false;
  setPasswordRecoveryBusy(false);
  if (options.invalid === true) {
    setPasswordRecoveryFeedback(localizedText(
      '복구 링크가 만료되었거나 이미 사용되었습니다. Supabase에서 비밀번호 재설정 메일을 다시 보내 주세요.',
      'This recovery link has expired or was already used. Send a new password recovery email from Supabase.',
      '復旧リンクの有効期限が切れているか、すでに使用されています。Supabaseから再設定メールをもう一度送信してください。'
    ), 'error');
  } else {
    setPasswordRecoveryFeedback(localizedText(
      '복구 링크를 확인하고 있습니다...',
      'Verifying the recovery link...',
      '復旧リンクを確認しています...'
    ), 'info');
  }
}

async function checkPasswordRecoverySession(attempt = 0) {
  if (!passwordRecoveryActive || passwordRecoverySessionReady) return;
  const recoveryError = window.TravelogSupabase?.getPasswordRecoveryRedirectError?.();
  if (recoveryError) {
    showPasswordRecoveryScreen({ invalid: true });
    return;
  }

  try {
    const session = await window.TravelogSupabase?.getSession?.();
    if (session?.user) {
      showPasswordRecoveryScreen({ ready: true });
      return;
    }
  } catch (error) {
    console.warn('[Travelog Supabase] Password recovery session check failed:', error);
  }

  if (attempt < 4) {
    window.setTimeout(() => checkPasswordRecoverySession(attempt + 1), 350 * (attempt + 1));
  } else {
    showPasswordRecoveryScreen({ invalid: true });
  }
}

function initPasswordRecoveryFlow() {
  if (!window.TravelogSupabase) return false;
  window.TravelogSupabase.init?.();

  const redirectDetected = window.TravelogSupabase.isPasswordRecoveryRedirect?.() === true;
  if (redirectDetected) passwordRecoveryActive = true;

  if (!passwordRecoverySubscription && typeof window.TravelogSupabase.onAuthStateChange === 'function') {
    passwordRecoverySubscription = window.TravelogSupabase.onAuthStateChange((event, session) => {
      // Supabase auth 콜백 안에서는 추가 인증 요청을 await하지 않고 UI 상태만 갱신합니다.
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryActive = true;
        passwordRecoverySessionReady = !!session?.user;
        window.setTimeout(() => {
          showPasswordRecoveryScreen(passwordRecoverySessionReady ? { ready: true } : {});
          if (!passwordRecoverySessionReady) checkPasswordRecoverySession(0);
        }, 0);
      }
    });
  }

  if (redirectDetected) {
    window.setTimeout(() => checkPasswordRecoverySession(0), 180);
  }
  return redirectDetected;
}

function clearLocalProfileForRequiredLogin() {
  saveAccountScopedProfile(TravelogState.userProfile);
  try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch (_) {}
  try { localStorage.removeItem(HOME_FRIENDS_STORAGE_KEY); } catch (_) {}
  try { localStorage.removeItem(HOME_MESSAGES_STORAGE_KEY); } catch (_) {}
  TravelogState.userProfile = buildDefaultUserProfile();
  TravelogState.friends = [];
  latestFriendRequests = [];
  latestFriendFeedback = [];
  friendGroups = [];
  friendGroupAssignments = new Map();
  TravelogState.messages = [];
  latestFriendSearchResults = [];
  verifiedNickname = '';
  renderFriendSearchResults([]);
  renderUserProfileWidget();
  renderHomeTab();
}

async function finishPasswordRecoveryAndShowLogin(message, type = 'info') {
  passwordRecoveryActive = false;
  passwordRecoverySessionReady = false;
  setPasswordRecoveryBusy(false);
  document.getElementById('password-recovery-form')?.reset();
  window.TravelogSupabase?.clearPasswordRecoveryUrl?.();

  try {
    await window.TravelogSupabase?.signOut?.();
  } catch (error) {
    console.warn('[Travelog Supabase] Recovery sign-out failed, continuing to login screen:', error);
  }

  clearLocalProfileForRequiredLogin();
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('closing');
  }
  showOnboardingScreen('login');
  showOnboardingLoginFeedback(message, type);
}

function getPasswordRecoveryErrorMessage(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  if (code === 'PASSWORD_RECOVERY_SESSION_MISSING') {
    return localizedText('복구 세션이 만료되었습니다. 새 재설정 메일을 요청해 주세요.', 'The recovery session has expired. Request a new reset email.', '復旧セッションの有効期限が切れました。新しい再設定メールを要求してください。');
  }
  if (message.includes('different from the old password') || message.includes('same password')) {
    return localizedText('기존 비밀번호와 다른 새 비밀번호를 입력해 주세요.', 'Enter a password different from your old password.', '以前のパスワードとは異なる新しいパスワードを入力してください。');
  }
  if (message.includes('weak') || message.includes('password')) {
    return localizedText('Supabase 비밀번호 정책을 충족하지 못했습니다. 더 길고 복잡한 비밀번호로 다시 시도해 주세요.', 'The password does not meet the Supabase password policy. Try a longer, stronger password.', 'Supabaseのパスワードポリシーを満たしていません。より長く複雑なパスワードで再試行してください。');
  }
  return localizedText('비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not change the password. Try again shortly.', 'パスワードを変更できませんでした。しばらくしてから再試行してください。');
}

async function submitPasswordRecovery(event) {
  event?.preventDefault();
  if (passwordRecoverySubmitting) return;
  const newPassword = document.getElementById('password-recovery-new')?.value || '';
  const confirmPassword = document.getElementById('password-recovery-confirm')?.value || '';

  if (!passwordRecoverySessionReady) {
    setPasswordRecoveryFeedback(localizedText('복구 링크가 유효하지 않습니다. 새 재설정 메일을 요청해 주세요.', 'The recovery link is not valid. Request a new reset email.', '復旧リンクが無効です。新しい再設定メールを要求してください。'), 'error');
    return;
  }
  if (newPassword.length < 8) {
    setPasswordRecoveryFeedback(localizedText('새 비밀번호는 8자 이상 입력해 주세요.', 'Enter a new password with at least 8 characters.', '新しいパスワードは8文字以上で入力してください。'), 'error');
    document.getElementById('password-recovery-new')?.focus();
    return;
  }
  if (newPassword !== confirmPassword) {
    setPasswordRecoveryFeedback(localizedText('두 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.', 'The two passwords do not match. Check them and try again.', '2つのパスワードが一致しません。もう一度確認してください。'), 'error');
    document.getElementById('password-recovery-confirm')?.focus();
    return;
  }

  setPasswordRecoveryBusy(true);
  setPasswordRecoveryFeedback(localizedText('새 비밀번호를 안전하게 저장하고 있습니다...', 'Saving your new password securely...', '新しいパスワードを安全に保存しています...'), 'info');
  try {
    await window.TravelogSupabase.updatePassword(newPassword);
    await finishPasswordRecoveryAndShowLogin(localizedText(
      '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.',
      'Your password was changed. Sign in with your new password.',
      'パスワードを変更しました。新しいパスワードでログインしてください。'
    ), 'success');
  } catch (error) {
    console.warn('[Travelog Supabase] Password update failed:', error);
    setPasswordRecoveryBusy(false);
    setPasswordRecoveryFeedback(getPasswordRecoveryErrorMessage(error), 'error');
  }
}

function showOnboardingLoginFeedback(message, type = 'error') {
  const feedback = document.getElementById('onboarding-login-feedback');
  if (!feedback) return;
  feedback.textContent = String(message || '');
  feedback.classList.remove('success', 'error', 'info');
  feedback.classList.add(type === 'info' ? 'info' : type === 'success' ? 'success' : 'error');
  feedback.style.display = message ? 'block' : 'none';
}

function clearOnboardingLoginFeedback() {
  showOnboardingLoginFeedback('', 'info');
}

function setOnboardingLoginBusy(isBusy) {
  document.querySelectorAll('#onboarding-screen-login .login-button-container button').forEach(button => {
    button.disabled = !!isBusy;
    button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  });
}

function getOnboardingLoginErrorMessage(error) {
  const code = String(error?.code || error?.name || '').toUpperCase();
  const rawMessage = String(error?.detail || error?.message || error || '');
  const normalizedMessage = rawMessage.toLowerCase();

  if (code === 'EMAIL_REQUIRED') {
    return localizedText('메일 주소를 입력해 주세요.', 'Enter your email address.', 'メールアドレスを入力してください。');
  }
  if (code === 'PASSWORD_REQUIRED') {
    return localizedText('비밀번호를 입력해 주세요.', 'Enter your password.', 'パスワードを入力してください。');
  }
  if (code === 'INVALID_LOGIN_CREDENTIALS' || normalizedMessage.includes('invalid login credentials') || normalizedMessage.includes('invalid_credentials')) {
    return localizedText('메일 주소 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.', 'The email address or password is incorrect. Check them and try again.', 'メールアドレスまたはパスワードが正しくありません。もう一度確認してください。');
  }
  if (code === 'EMAIL_NOT_CONFIRMED' || normalizedMessage.includes('email not confirmed')) {
    return localizedText('이메일 인증이 완료되지 않은 계정입니다. 인증 상태를 확인해 주세요.', 'This account has not completed email confirmation.', 'メール認証が完了していないアカウントです。');
  }
  if (code === 'SUPABASE_EMAIL_SESSION_REQUIRED') {
    return localizedText('로그인은 처리됐지만 세션을 만들지 못했습니다. Supabase에서 이메일 확인 상태를 확인해 주세요.', 'Sign-in was accepted, but a session could not be created. Check email confirmation in Supabase.', 'ログインは処理されましたが、セッションを作成できませんでした。');
  }
  return localizedText('로그인에 실패했습니다. 메일 주소와 비밀번호를 확인한 뒤 다시 시도해 주세요.', 'Sign-in failed. Check your email address and password, then try again.', 'ログインに失敗しました。メールアドレスとパスワードを確認して再試行してください。');
}

function initOnboarding(options = {}) {
  loadSavedProfile();
  bindOnboardingEvents();
  renderUserProfileWidget();
  syncDeviceStorageStatus();

  if (options.forcePasswordRecovery || passwordRecoveryActive) {
    showPasswordRecoveryScreen();
  } else if (TravelogState.userProfile.isOnboarded) {
    hideOnboardingOverlay(true);
    scheduleAccessRegionConsentCheck(700);
  } else {
    clearOnboardingLoginFeedback();
    showOnboardingScreen('login');
    restoreSupabaseProfileFromExistingSession().catch(error => {
      console.warn('[Travelog Supabase] Existing profile restore skipped:', error);
    });
  }
}


async function safelyGoToProfileStep(provider) {
  const authProvider = provider || TravelogState.userProfile.authProvider || 'Guest';
  if (onboardingAuthInProgress) return;
  onboardingAuthInProgress = true;
  const isEmailLogin = authProvider === 'Email';
  if (isEmailLogin) {
    showOnboardingScreen('login');
    showOnboardingLoginFeedback(localizedText('Supabase 계정으로 로그인하고 있습니다...', 'Signing in to your Supabase account...', 'Supabaseアカウントにログインしています...'), 'info');
    setOnboardingLoginBusy(true);
  }

  try {
    const defaultNicknames = {
      Google: '구글 여행자',
      Naver: '네이버 여행자',
      Email: '이메일 여행자',
      Guest: '여행자'
    };

    TravelogState.userProfile.authProvider = authProvider;
    if (window.TravelogSupabase && typeof window.TravelogSupabase.connectLoginProvider === 'function') {
      const authResult = await window.TravelogSupabase.connectLoginProvider(authProvider, TravelogState.userProfile);

      if (isEmailLogin && authResult?.cancelled) {
        showOnboardingScreen('login');
        showOnboardingLoginFeedback(localizedText('이메일 로그인이 취소되었습니다. 로그인 화면에서 다시 시도할 수 있습니다.', 'Email sign-in was cancelled. You can try again from this screen.', 'メールログインがキャンセルされました。この画面から再試行できます。'), 'info');
        return;
      }

      if (isEmailLogin && (!authResult?.user || authResult?.mode !== 'email')) {
        const authError = new Error('SUPABASE_EMAIL_LOGIN_FAILED');
        authError.code = 'SUPABASE_EMAIL_LOGIN_FAILED';
        throw authError;
      }

      TravelogState.userProfile.supabaseAuthMode = authResult?.mode || 'local-only';
      TravelogState.userProfile.supabaseUserId = authResult?.user?.id || TravelogState.userProfile.supabaseUserId || '';

      const accountProfile = getAccountScopedProfile(TravelogState.userProfile.supabaseUserId);
      if (accountProfile) {
        TravelogState.userProfile = {
          ...buildDefaultUserProfile(),
          ...accountProfile,
          authProvider,
          supabaseAuthMode: authResult?.mode || accountProfile.supabaseAuthMode || 'email',
          supabaseUserId: authResult?.user?.id || accountProfile.supabaseUserId || ''
        };
      }

      const remoteNickname = getSupabaseProfileName(authResult?.profile);
      const accountNickname = String(accountProfile?.nickname || '').trim();
      const shouldPreferAccountProfile = !!accountNickname
        && !isTemporarySupabaseProfileName(accountNickname)
        && (!authResult?.hasRemoteProfile || isTemporarySupabaseProfileName(remoteNickname, authResult?.user));

      // 비밀번호 재설정 뒤 서버에 이메일 앞부분 등의 임시명이 남아 있어도,
      // 같은 Supabase user id로 보관된 실제 닉네임을 우선 복원하고 서버에도 다시 동기화합니다.
      if (isEmailLogin && shouldPreferAccountProfile) {
        await applySupabaseProfileToLocal({
          id: authResult.user?.id || accountProfile.supabaseUserId || '',
          display_name: accountNickname,
          avatar_url: accountProfile.avatarType === 'image' || accountProfile.avatarType === 'presetImage' ? accountProfile.avatarValue || '' : ''
        }, {
          authProvider,
          authMode: 'email',
          userId: authResult.user?.id || accountProfile.supabaseUserId || ''
        });
        hideOnboardingOverlay(false);
        showToast(localizedText(
          `${TravelogState.userProfile.nickname}님의 기존 닉네임과 프로필을 복원했습니다.`,
          `Restored ${TravelogState.userProfile.nickname}'s existing nickname and profile.`,
          `${TravelogState.userProfile.nickname}さんの既存のニックネームとプロフィールを復元しました。`
        ));
        return;
      }

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

      if (isEmailLogin && accountProfile?.nickname) {
        await applySupabaseProfileToLocal({
          id: authResult.user?.id || accountProfile.supabaseUserId || '',
          display_name: accountProfile.nickname,
          avatar_url: accountProfile.avatarType === 'image' || accountProfile.avatarType === 'presetImage' ? accountProfile.avatarValue || '' : ''
        }, {
          authProvider,
          authMode: 'email',
          userId: authResult.user?.id || accountProfile.supabaseUserId || ''
        });
        hideOnboardingOverlay(false);
        showToast(localizedText(
          `${TravelogState.userProfile.nickname}님의 기기 저장 프로필을 복원했습니다.`,
          `Restored ${TravelogState.userProfile.nickname}'s saved device profile.`,
          `${TravelogState.userProfile.nickname}さんの端末保存プロフィールを復元しました。`
        ));
        return;
      }
    }

    const input = document.getElementById('onboarding-nickname-input');
    const draftNickname = TravelogState.userProfile.nickname || defaultNicknames[authProvider] || '여행자';

    if (input) input.value = draftNickname;
    verifiedNickname = draftNickname;
    TravelogState.userProfile.nickname = draftNickname;
    updateOnboardingStartAvailability();
    showNicknameFeedback(localizedText('처음 사용하는 계정입니다. 닉네임과 기기 저장폴더를 설정해 주세요.', 'This is a new account. Set a nickname and device storage folder.', '初めて使用するアカウントです。ニックネームと保存フォルダを設定してください。'), true);
    showOnboardingScreen('profile');
    syncDeviceStorageStatus();
  } catch (error) {
    if (isEmailLogin) {
      console.warn('[Travelog Supabase] Email onboarding login failed:', error);
      TravelogState.userProfile.supabaseAuthMode = 'signed-out';
      TravelogState.userProfile.supabaseUserId = '';
      showOnboardingScreen('login');
      showOnboardingLoginFeedback(getOnboardingLoginErrorMessage(error), 'error');
      return;
    }
    console.warn('[Travelog Supabase] Onboarding auth failed; continuing locally.', error);
    TravelogState.userProfile.supabaseAuthMode = 'local-only';
  } finally {
    onboardingAuthInProgress = false;
    if (isEmailLogin) setOnboardingLoginBusy(false);
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
  element.addEventListener('click', (event) => {
    event.preventDefault();
    handler(event);
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

  const recoveryForm = document.getElementById('password-recovery-form');
  if (recoveryForm && recoveryForm.dataset.bound !== 'true') {
    recoveryForm.dataset.bound = 'true';
    recoveryForm.addEventListener('submit', submitPasswordRecovery);
  }

  const recoveryCancelButton = document.getElementById('password-recovery-cancel-btn');
  if (recoveryCancelButton) {
    attachActivationHandler(recoveryCancelButton, () => {
      finishPasswordRecoveryAndShowLogin(localizedText(
        '비밀번호 변경을 취소했습니다. 필요하면 새 복구 메일을 요청해 주세요.',
        'Password change cancelled. Request a new recovery email if needed.',
        'パスワード変更をキャンセルしました。必要な場合は新しい復旧メールを要求してください。'
      ), 'info');
    });
  }

  const backBtn = document.getElementById('onboarding-back-btn');
  if (backBtn) {
    attachActivationHandler(backBtn, () => {
      clearOnboardingLoginFeedback();
      showOnboardingScreen('login');
    });
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
  const recoveryScreen = document.getElementById('onboarding-screen-password-recovery');
  if (!loginScreen || !profileScreen || !recoveryScreen) return;

  const isLogin = screenName === 'login';
  const isProfile = screenName === 'profile';
  const isRecovery = screenName === 'password-recovery';
  loginScreen.classList.toggle('active', isLogin);
  profileScreen.classList.toggle('active', isProfile);
  recoveryScreen.classList.toggle('active', isRecovery);
  loginScreen.setAttribute('aria-hidden', isLogin ? 'false' : 'true');
  profileScreen.setAttribute('aria-hidden', isProfile ? 'false' : 'true');
  recoveryScreen.setAttribute('aria-hidden', isRecovery ? 'false' : 'true');

  // 모바일 브라우저에서 class 전환이 늦게 반영되거나 이전 스타일이 남는 경우를 막기 위한 하드 보정입니다.
  loginScreen.style.display = isLogin ? 'flex' : 'none';
  loginScreen.style.pointerEvents = isLogin ? 'auto' : 'none';
  profileScreen.style.display = isProfile ? 'flex' : 'none';
  profileScreen.style.pointerEvents = isProfile ? 'auto' : 'none';
  recoveryScreen.style.display = isRecovery ? 'flex' : 'none';
  recoveryScreen.style.pointerEvents = isRecovery ? 'auto' : 'none';

  document.querySelectorAll('#onboarding-overlay .step-dots span').forEach((dot, index) => {
    const shouldActivate = !isRecovery && (isLogin ? index === 0 : index === 1);
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
      if (loginButton.dataset.travelogActivationBound === 'true') return;
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
      if (backButton.dataset.travelogActivationBound === 'true') return;
      showOnboardingScreen('login');
      return;
    }

    const checkButton = event.target.closest('#nickname-check-btn');
    if (checkButton) {
      if (checkButton.dataset.travelogActivationBound === 'true') return;
      verifyNickname();
      return;
    }

    const startButton = event.target.closest('#start-app-btn');
    if (startButton && !startButton.disabled) {
      if (startButton.dataset.travelogActivationBound === 'true') return;
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
  bindAccessRegionControls();
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
  updateAccessRegionSettingUi();
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

function isTemporarySupabaseProfileName(nickname, user = null) {
  const cleanName = String(nickname || '').trim();
  if (!cleanName) return true;
  const normalizedName = cleanName.toLocaleLowerCase();
  const temporaryNames = new Set([
    'travelog user',
    'traveler',
    '이메일 여행자',
    '여행자',
    'email traveler'
  ]);
  if (temporaryNames.has(normalizedName)) return true;

  const emailLocalPart = String(user?.email || '').split('@')[0].trim().toLocaleLowerCase();
  return !!emailLocalPart && normalizedName === emailLocalPart;
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
  const memoPinRefresh = window.TravelogMapModule?.loadMemoPins?.({ requireSession: false });
  if (memoPinRefresh && typeof memoPinRefresh.catch === 'function') {
    memoPinRefresh.catch(error => {
      console.warn('[Travelog Memo Pin] Refresh after profile restore skipped:', error);
    });
  }

  if (typeof refreshSupabaseSocialData === 'function') {
    refreshSupabaseSocialData({ requireSession: false }).catch(error => {
      console.warn('[Travelog Supabase] Social data refresh after profile restore skipped:', error);
    });
  }

  scheduleAccessRegionConsentCheck(700);

  return true;
}

async function restoreSupabaseProfileFromExistingSession() {
  if (TravelogState.userProfile?.isOnboarded) return false;
  if (!window.TravelogSupabase || typeof window.TravelogSupabase.fetchCurrentProfile !== 'function') return false;

  window.TravelogSupabase.init?.();
  const existingSession = await window.TravelogSupabase.getSession?.();
  const existingUser = existingSession?.user || null;
  const remoteProfile = await window.TravelogSupabase.fetchCurrentProfile({ requireSession: false });
  const userId = remoteProfile?.id || remoteProfile?.supabaseProfileId || existingUser?.id || '';
  const accountProfile = getAccountScopedProfile(userId);
  const remoteNickname = getSupabaseProfileName(remoteProfile);
  const accountNickname = String(accountProfile?.nickname || '').trim();
  const shouldUseAccountProfile = !!accountNickname
    && !isTemporarySupabaseProfileName(accountNickname)
    && isTemporarySupabaseProfileName(remoteNickname, existingUser);

  if (!remoteNickname && !shouldUseAccountProfile) return false;
  if (isTemporarySupabaseProfileName(remoteNickname, existingUser) && !shouldUseAccountProfile) return false;

  const profileToRestore = shouldUseAccountProfile ? {
    id: userId,
    display_name: accountNickname,
    avatar_url: accountProfile.avatarType === 'image' || accountProfile.avatarType === 'presetImage' ? accountProfile.avatarValue || '' : ''
  } : remoteProfile;

  const restored = await applySupabaseProfileToLocal(profileToRestore, {
    authProvider: TravelogState.userProfile.authProvider || 'Email',
    authMode: TravelogState.userProfile.supabaseAuthMode || 'email',
    userId
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

  // 로그아웃 전에 계정별 프로필과 저장폴더 정보를 보존해 같은 계정 재로그인 때 복원합니다.
  saveAccountScopedProfile(TravelogState.userProfile);

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
  latestFriendRequests = [];
  latestFriendFeedback = [];
  friendGroups = [];
  friendGroupAssignments = new Map();
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
    clearOnboardingLoginFeedback();
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
  scheduleAccessRegionConsentCheck(700);

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

function readAccountScopedProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNT_PROFILE_STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch (_) {
    return {};
  }
}

function getAccountScopedProfile(userId) {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) return null;
  const profile = readAccountScopedProfiles()[cleanUserId];
  return profile && typeof profile === 'object' ? profile : null;
}

function saveAccountScopedProfile(profile = TravelogState.userProfile) {
  const userId = String(profile?.supabaseUserId || '').trim();
  if (!userId || !profile?.nickname) return false;
  try {
    const profiles = readAccountScopedProfiles();
    profiles[userId] = {
      ...profile,
      supabaseUserId: userId,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(ACCOUNT_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
    return true;
  } catch (error) {
    console.warn('Account-scoped profile could not be saved locally.', error);
    return false;
  }
}

function saveProfile() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(TravelogState.userProfile));
  } catch (error) {
    console.warn('Travelog profile could not be saved locally.', error);
  }

  saveAccountScopedProfile(TravelogState.userProfile);

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
      window.TravelogMapModule.renderTour?.();
      setTimeout(() => {
        window.TravelogMapModule.centerToUser();
      }, 100);
    }
  } else if (mode === 'location') {
    if (activeGuideCard) activeGuideCard.style.display = 'none';
    if (tourLocationsCard) tourLocationsCard.style.display = 'none';
    if (legendPanel) legendPanel.style.display = 'none';

    if (routeTitleEl) {
      routeTitleEl.removeAttribute('data-localize');
      routeTitleEl.textContent = localizedText('내 위치', 'My Location', '現在地');
    }
    if (routeDescEl) {
      routeDescEl.removeAttribute('data-localize');
      routeDescEl.textContent = TravelogState.guideRunActive && TravelogState.activeGuide
        ? localizedText('현재 위치와 진행 중인 가이드 경로를 함께 표시합니다.', 'Showing your location and active guide route.', '現在地と進行中のガイドルートを表示します。')
        : localizedText('현재 위치를 중심으로 지도를 표시합니다.', 'Map centered on your current location.', '現在地を中心に地図を表示します。');
    }

    window.renderLocationGuidePanel?.();
    window.TravelogMapModule?.renderTour?.();
    window.setTimeout(() => {
      window.TravelogMapModule?.requestCurrentLocation?.(null, true);
      window.TravelogMapModule?.invalidateSize?.();
    }, 100);
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

window.renderLocationGuidePanel = function() {
  const panel = document.getElementById('location-active-guide-panel');
  if (!panel) return;

  const guide = TravelogState.guideRunActive ? TravelogState.activeGuide : null;
  if (!guide) {
    panel.hidden = true;
    panel.classList.remove('is-running');
    return;
  }

  panel.hidden = false;
  panel.classList.toggle('is-running', TravelogState.guideRunActive === true);

  const title = document.getElementById('location-guide-title');
  if (title) title.textContent = localizedField(guide, 'name') || guide.name || localizedText('진행 중인 가이드', 'Active Guide', '進行中のガイド');

  const status = document.getElementById('location-guide-status');
  if (status) {
    status.removeAttribute('data-localize');
    status.textContent = localizedText('진행 중', 'Running', '進行中');
  }

  const list = document.getElementById('location-guide-stop-list');
  if (list) {
    const stops = Array.isArray(guide.stops) ? guide.stops : [];
    list.innerHTML = stops.map((stop, index) => {
      const name = localizedField(stop, 'name') || stop.name || `${localizedText('코스', 'Stop', '地点')} ${index + 1}`;
      return `<li><span>${index + 1}</span><strong>${escapeHtml(name)}</strong></li>`;
    }).join('');
  }

  const startButton = document.getElementById('location-guide-start-btn');
  if (startButton) startButton.hidden = TravelogState.locationGuideStarted === true;

  const stopButton = document.getElementById('location-guide-stop-btn');
  if (stopButton) stopButton.hidden = false;
};

window.startCurrentGuideTracking = function() {
  if (!TravelogState.activeGuide) return;
  TravelogState.guideRunActive = true;
  TravelogState.locationGuideStarted = true;
  window.TravelogMapModule?.startRealtimeLocationTracking?.();
  window.renderLocationGuidePanel?.();
  showToast(localizedText('현재 위치 기반 가이드를 시작합니다.', 'Starting the guide from your current location.', '現在地からガイドを開始します。'));
};

window.stopCurrentGuide = function() {
  window.TravelogMapModule?.stopActiveGuidePreview?.({ silent: true, resumeTracking: false });
  TravelogState.guideRunActive = false;
  TravelogState.locationGuideStarted = false;
  TravelogState.activeGuide = null;
  window.TravelogMapModule?.stopRealtimeLocationTracking?.(false);
  window.TravelogMapModule?.renderTour?.();
  window.renderLocationGuidePanel?.();
  showToast(localizedText('진행 중인 가이드를 멈췄습니다.', 'The active guide has stopped.', '進行中のガイドを停止しました。'));
};

window.setLocationGuidePanelCollapsed = function(collapsed) {
  const panel = document.getElementById('location-active-guide-panel');
  const button = document.getElementById('location-guide-collapse-btn');
  if (!panel || !button) return;

  panel.classList.toggle('is-collapsed', Boolean(collapsed));
  button.setAttribute('aria-expanded', String(!collapsed));
  button.setAttribute('aria-label', localizedText(
    collapsed ? '진행 중인 가이드 펼치기' : '진행 중인 가이드 접기',
    collapsed ? 'Expand active guide' : 'Collapse active guide',
    collapsed ? '進行中のガイドを開く' : '進行中のガイドを閉じる'
  ));

  button.classList.toggle('is-collapsed', collapsed);
};

window.toggleLocationGuidePanel = function() {
  const panel = document.getElementById('location-active-guide-panel');
  if (!panel) return;
  window.setLocationGuidePanelCollapsed(!panel.classList.contains('is-collapsed'));
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('location-guide-start-btn')?.addEventListener('click', window.startCurrentGuideTracking);
  document.getElementById('location-guide-stop-btn')?.addEventListener('click', window.stopCurrentGuide);
  document.getElementById('location-guide-preview-btn')?.addEventListener('click', () => window.TravelogMapModule?.startActiveGuidePreview?.());
  document.getElementById('location-guide-collapse-btn')?.addEventListener('click', window.toggleLocationGuidePanel);
  window.renderLocationGuidePanel?.();
});

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
  setCoins: (amount) => {
    const nextBalance = Number(amount);
    if (!Number.isFinite(nextBalance)) return false;
    TravelogState.coins = Math.max(0, nextBalance);
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
