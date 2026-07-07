// ==========================================
// Travelog Explore (Vlogs & Blogs) Module
// ==========================================

const TravelogExploreModule = (() => {
  function t(ko, en, ja) {
    return window.TravelogApp && typeof window.TravelogApp.t === 'function' ? window.TravelogApp.t(ko, en, ja) : ko;
  }

  function pick(source, baseKey) {
    return window.TravelogApp && typeof window.TravelogApp.pickLocalized === 'function' ? window.TravelogApp.pickLocalized(source, baseKey) : (source?.[`${baseKey}Ko`] || source?.[`${baseKey}En`] || source?.[`${baseKey}Ja`] || '');
  }

  let activeVlogIndex = 0;
  let currentCategory = 'all';

  // Mock Vlog Feed Data
  const vlogData = [
    {
      id: 'vlog-seoul',
      titleEn: "Secret Hanok Tea Cafe in Seoul",
      titleKo: "서울 서촌의 숨겨진 한옥 전통 찻집",
      titleJa: "ソウル西村の隠れ家韓屋ティーカフェ",
      descEn: "Tucked away in the alleys of Seochon. Cozy fireplace, wooden beams, and hot ginger tea.",
      descKo: "서촌 좁은 골목길에 숨은 아늑한 한옥 카페. 따뜻한 생강차와 고즈넉한 인테리어의 조합.",
      descJa: "西村の細い路地に隠れた落ち着いた韓屋カフェ。温かい生姜茶と静かな空間が魅力です。",
      locationEn: "Seochon, Seoul",
      locationKo: "서울 서촌",
      locationJa: "ソウル西村",
      creator: "Yuna_Travels",
      avatar: "assets/images/avatars/yuna-travels.jpg",
      likes: 1240,
      comments: 420,
      soundEn: "Acoustic Afternoon - Yuna",
      soundKo: "어쿠스틱 오후 - 유나의 여행송",
      soundJa: "アコースティック午後 - ユナの旅ソング",
      image: "assets/images/vlogs/seoul-hanok-tea-cafe.jpg",
      liked: false
    },
    {
      id: 'vlog-shibuya',
      titleEn: "Midnight Shibuya Crossing walk!",
      titleKo: "도쿄 시부야 크로싱 밤샘 산책!",
      titleJa: "真夜中の渋谷スクランブル散歩！",
      descEn: "Tokyo never sleeps. Navigating neon lights, underground ramen shops, and crowds.",
      descKo: "잠들지 않는 화려한 네온사인 도시 도쿄. 숨겨진 정통 라멘집과 시부야 골목길 탐방.",
      descJa: "眠らないネオンの街・東京。隠れた本格ラーメン店と渋谷の路地を巡ります。",
      locationEn: "Shibuya, Tokyo",
      locationKo: "도쿄 시부야",
      locationJa: "東京・渋谷",
      creator: "Hiro_Gamer",
      avatar: "assets/images/avatars/hiro-gamer.jpg",
      likes: 4520,
      comments: 980,
      soundEn: "Synthwave Tokyo Beats",
      soundKo: "도쿄 시부야 신스웨이브 로파이",
      soundJa: "東京渋谷シンセウェーブ・ローファイ",
      image: "assets/images/vlogs/shibuya-night-walk.jpg",
      liked: false
    },
    {
      id: 'vlog-seine',
      titleEn: "Sunset over Paris Seine River",
      titleKo: "파리 센강의 낭만적인 노을 라이브",
      titleJa: "パリ・セーヌ川のロマンチックな夕焼けライブ",
      descEn: "Catching the golden hour in Paris. Crepes in hand and music in the background.",
      descKo: "센강변에 앉아 즐기는 파리의 황금빛 노을. 길거리 아코디언 연주 소리가 너무 낭만적이에요.",
      descJa: "セーヌ川沿いで楽しむパリの黄金色の夕焼け。街角のアコーディオンがとてもロマンチックです。",
      locationEn: "Seine River, Paris",
      locationKo: "파리 센강",
      locationJa: "パリ・セーヌ川",
      creator: "Chloe_Parisienne",
      avatar: "assets/images/avatars/chloe-parisienne.jpg",
      likes: 2890,
      comments: 650,
      soundEn: "La Vie En Rose (Accordion Cover)",
      soundKo: "라비앙로즈 아코디언 클래식 커버",
      soundJa: "ラ・ヴィ・アン・ローズ アコーディオンカバー",
      image: "assets/images/vlogs/paris-seine-sunset.jpg",
      liked: false
    }
  ];

  // Mock Blog Feed Data
  const blogData = [
    {
      id: 'blog-seoul',
      titleEn: "3-Day History & Food Itinerary in Seoul",
      titleKo: "서울 역사 & 맛집 3일 완성 여행 코스",
      titleJa: "ソウル歴史＆グルメ3日間モデルコース",
      descEn: "Discover Gyeongbokgung, try spicy rice cakes, and visit traditional tea houses in Insadong. Absolute perfect weekend guide.",
      descKo: "경복궁 야간 개장부터 인사동 전통 찻집 투어, 광장시장 먹거리 코스까지 완벽 정리해드립니다.",
      descJa: "景福宮の夜間観覧から仁寺洞の伝統茶屋、広蔵市場のグルメコースまでわかりやすく紹介します。",
      category: "korea",
      tagEn: "Itinerary",
      tagKo: "추천코스",
      tagJa: "おすすめコース",
      author: "Minho",
      authorAvatar: "assets/images/avatars/minho-guide.jpg",
      image: "assets/images/blogs/seoul-history-food.jpg"
    },
    {
      id: 'blog-kyoto',
      titleEn: "Kyoto Temple Walk and Bamboo Forest Guide",
      titleKo: "교토의 오래된 사찰과 대나무 숲길 힐링 도보 여행",
      titleJa: "京都の古寺と竹林を歩く癒やし旅",
      descEn: "Explore Arashiyama, Kiyomizudera, and learn how to avoid crowds in peak season using early morning paths.",
      descKo: "아라시야마 대나무 숲과 청수사(키요미즈데라) 전경을 감상하며 힐링하는 아침 산책 코스 가이드.",
      descJa: "嵐山の竹林と清水寺の景色を楽しむ、朝の癒やし散歩コースガイドです。",
      category: "japan",
      tagEn: "Healing",
      tagKo: "힐링여행",
      tagJa: "癒やし旅",
      author: "Yuki",
      authorAvatar: "assets/images/avatars/yuki-guide.jpg",
      image: "assets/images/blogs/kyoto-temple-bamboo.jpg"
    },
    {
      id: 'blog-swiss',
      titleEn: "Backpacking across Switzerland Interlaken",
      titleKo: "스위스 인터라켄 배낭여행 가성비 꿀팁 총정리",
      titleJa: "スイス・インターラーケン節約バックパック旅のコツ",
      descEn: "Train routes, budget paragliding bookings, and the most scenic hiking paths overlooking the high peaks.",
      descKo: "인터라켄 호수 열차 패스 사용 방법과 최적의 하이킹 스팟, 그리고 액티비티 할인 예약 팁.",
      descJa: "インターラーケンの湖畔列車パス、絶景ハイキングスポット、アクティビティ割引予約のコツをまとめました。",
      category: "europe",
      tagEn: "Backpacking",
      tagKo: "배낭여행",
      tagJa: "バックパック旅",
      author: "Stefan",
      authorAvatar: "assets/images/avatars/stefan-guide.jpg",
      image: "assets/images/blogs/switzerland-interlaken.jpg"
    }
  ];

  function init() {
    renderVlogs();
    renderBlogs();

    // Vlog buttons
    document.getElementById('prev-vlog-btn').addEventListener('click', prevVlog);
    document.getElementById('next-vlog-btn').addEventListener('click', nextVlog);

    // Blog Category Filters
    const filterButtons = document.querySelectorAll('#blog-filters button');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => {
          b.classList.add('secondary');
          b.style.background = '';
        });
        btn.classList.remove('secondary');
        
        currentCategory = btn.getAttribute('data-filter');
        renderBlogs();
      });
    });

    // Real-time Blog Search
    document.getElementById('blog-search').addEventListener('input', renderBlogs);
  }

  // ==========================================
  // Vlog Swiper Logic
  // ==========================================
  function renderVlogs() {
    const container = document.getElementById('vlog-swiper-container');
    container.innerHTML = '';

    vlogData.forEach((vlog, index) => {
      const card = document.createElement('div');
      card.className = `vlog-card ${index === activeVlogIndex ? 'active' : ''}`;
      
      const title = pick(vlog, 'title');
      const desc = pick(vlog, 'desc');
      const location = pick(vlog, 'location');
      const sound = pick(vlog, 'sound');
      const likeClass = vlog.liked ? 'liked' : '';

      card.innerHTML = `
        <div class="simulated-video-container">
          <img src="${vlog.image}" alt="Vlog Cover">
          
          <div class="simulated-video-overlay">
            <!-- Top bar -->
            <div class="vlog-top">
              <div class="location-tag">
                <i class="fa-solid fa-location-dot" style="color:var(--accent-pink);"></i>
                <span>${location}</span>
              </div>
              <i class="fa-solid fa-volume-xmark" style="font-size:16px; cursor:pointer;" title="Mute/Unmute"></i>
            </div>
            
            <!-- Floating Right Actions -->
            <div class="vlog-right-actions">
              <div class="vlog-creator-avatar">
                <img src="${vlog.avatar}" alt="Creator">
              </div>
              
              <div class="action-btn-vertical ${likeClass}" onclick="TravelogExploreModule.toggleVlogLike(${index})">
                <i class="fa-solid fa-heart"></i>
                <span>${vlog.likes}</span>
              </div>
              
              <div class="action-btn-vertical">
                <i class="fa-solid fa-comment-dots"></i>
                <span>${vlog.comments}</span>
              </div>
              
              <div class="action-btn-vertical" onclick="TravelogExploreModule.shareVlog('${vlog.id}')">
                <i class="fa-solid fa-paper-plane"></i>
                <span data-localize="share">${t('공유', 'Share', '共有')}</span>
              </div>
            </div>
            
            <!-- Details Bottom -->
            <div class="vlog-bottom-details">
              <h4>@${vlog.creator}</h4>
              <p style="font-weight: 500;">${title}</p>
              <p style="font-size: 13px; opacity:0.8;">${desc}</p>
              <div class="vlog-soundtrack" style="margin-top:4px;">
                <i class="fa-solid fa-music"></i>
                <span>${sound}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function nextVlog() {
    activeVlogIndex = (activeVlogIndex + 1) % vlogData.length;
    renderVlogs();
  }

  function prevVlog() {
    activeVlogIndex = (activeVlogIndex - 1 + vlogData.length) % vlogData.length;
    renderVlogs();
  }

  function toggleVlogLike(index) {
    vlogData[index].liked = !vlogData[index].liked;
    if (vlogData[index].liked) {
      vlogData[index].likes++;
      window.TravelogApp.addPoints(10); // Reward active scrolling & liking
    } else {
      vlogData[index].likes--;
    }
    renderVlogs();
  }

  function shareVlog(id) {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    window.TravelogApp.showToast(t('공유 링크 복사 완료!', 'Vlog link copied to clipboard!', '共有リンクをコピーしました！'));
  }

  // ==========================================
  // Blog Feed Logic
  // ==========================================
  function renderBlogs() {
    const container = document.getElementById('blog-grid-container');
    container.innerHTML = '';
    const searchQuery = document.getElementById('blog-search').value.toLowerCase();

    const filteredBlogs = blogData.filter(blog => {
      // 1. Category check
      if (currentCategory !== 'all' && blog.category !== currentCategory) {
        return false;
      }
      
      // 2. Search check
      const title = pick(blog, 'title').toLowerCase();
      const desc = pick(blog, 'desc').toLowerCase();
      const author = blog.author.toLowerCase();
      
      return title.includes(searchQuery) || desc.includes(searchQuery) || author.includes(searchQuery);
    });

    if (filteredBlogs.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 32px; margin-bottom: 12px;"></i>
          <p>${t('검색 결과가 없습니다.', 'No matching stories found.', '一致するストーリーがありません。')}</p>
        </div>
      `;
      return;
    }

    filteredBlogs.forEach(blog => {
      const card = document.createElement('div');
      card.className = 'blog-card-item glass-panel glass-panel-hover';
      
      const title = pick(blog, 'title');
      const desc = pick(blog, 'desc');
      const tag = pick(blog, 'tag');

      card.innerHTML = `
        <div class="blog-card-img">
          <img src="${blog.image}" alt="Blog Image">
          <span class="blog-card-tag">${tag}</span>
        </div>
        <div class="blog-card-content">
          <h3>${title}</h3>
          <p>${desc}</p>
          <div class="blog-card-footer">
            <div class="blog-card-author">
              <img src="${blog.authorAvatar}" alt="Author Avatar">
              <span style="font-weight:600;">${blog.author}</span>
            </div>
            <span style="color:var(--accent-purple); font-weight:600; cursor:pointer;" onclick="TravelogExploreModule.readBlogPost('${blog.id}')">
              ${t('자세히 보기 <i class="fa-solid fa-arrow-right"></i>', 'Read <i class="fa-solid fa-arrow-right"></i>', '詳しく見る <i class="fa-solid fa-arrow-right"></i>')}
            </span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function readBlogPost(id) {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    window.TravelogApp.showToast(t('블로그 상세 내용을 로드합니다...', 'Loading full blog log...', 'ブログの詳細を読み込み中です...'));
  }

  return {
    init: init,
    onLanguageChange: () => {
      renderVlogs();
      renderBlogs();
    },
    toggleVlogLike: toggleVlogLike,
    shareVlog: shareVlog,
    readBlogPost: readBlogPost
  };
})();

// Attach to window for dynamic HTML button calls
window.TravelogExploreModule = TravelogExploreModule;
