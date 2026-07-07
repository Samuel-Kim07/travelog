// ==========================================
// Travelog Explore (Vlogs & Blogs) Module
// ==========================================

const TravelogExploreModule = (() => {
  let activeVlogIndex = 0;
  let currentCategory = 'all';

  // Mock Vlog Feed Data
  const vlogData = [
    {
      id: 'vlog-seoul',
      titleEn: "Secret Hanok Tea Cafe in Seoul",
      titleKo: "서울 서촌의 숨겨진 한옥 전통 찻집",
      descEn: "Tucked away in the alleys of Seochon. Cozy fireplace, wooden beams, and hot ginger tea.",
      descKo: "서촌 좁은 골목길에 숨은 아늑한 한옥 카페. 따뜻한 생강차와 고즈넉한 인테리어의 조합.",
      locationEn: "Seochon, Seoul",
      locationKo: "서울 서촌",
      creator: "Yuna_Travels",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
      likes: 1240,
      comments: 420,
      soundEn: "Acoustic Afternoon - Yuna",
      soundKo: "어쿠스틱 오후 - 유나의 여행송",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=500",
      liked: false
    },
    {
      id: 'vlog-shibuya',
      titleEn: "Midnight Shibuya Crossing walk!",
      titleKo: "도쿄 시부야 크로싱 밤샘 산책!",
      descEn: "Tokyo never sleeps. Navigating neon lights, underground ramen shops, and crowds.",
      descKo: "잠들지 않는 화려한 네온사인 도시 도쿄. 숨겨진 정통 라멘집과 시부야 골목길 탐방.",
      locationEn: "Shibuya, Tokyo",
      locationKo: "도쿄 시부야",
      creator: "Hiro_Gamer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
      likes: 4520,
      comments: 980,
      soundEn: "Synthwave Tokyo Beats",
      soundKo: "도쿄 시부야 신스웨이브 로파이",
      image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=500",
      liked: false
    },
    {
      id: 'vlog-seine',
      titleEn: "Sunset over Paris Seine River",
      titleKo: "파리 센강의 낭만적인 노을 라이브",
      descEn: "Catching the golden hour in Paris. Crepes in hand and music in the background.",
      descKo: "센강변에 앉아 즐기는 파리의 황금빛 노을. 길거리 아코디언 연주 소리가 너무 낭만적이에요.",
      locationEn: "Seine River, Paris",
      locationKo: "파리 센강",
      creator: "Chloe_Parisienne",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100",
      likes: 2890,
      comments: 650,
      soundEn: "La Vie En Rose (Accordion Cover)",
      soundKo: "라비앙로즈 아코디언 클래식 커버",
      image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=500",
      liked: false
    }
  ];

  // Mock Blog Feed Data
  const blogData = [
    {
      id: 'blog-seoul',
      titleEn: "3-Day History & Food Itinerary in Seoul",
      titleKo: "서울 역사 & 맛집 3일 완성 여행 코스",
      descEn: "Discover Gyeongbokgung, try spicy rice cakes, and visit traditional tea houses in Insadong. Absolute perfect weekend guide.",
      descKo: "경복궁 야간 개장부터 인사동 전통 찻집 투어, 광장시장 먹거리 코스까지 완벽 정리해드립니다.",
      category: "korea",
      tagEn: "Itinerary",
      tagKo: "추천코스",
      author: "Minho",
      authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
      image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=400"
    },
    {
      id: 'blog-kyoto',
      titleEn: "Kyoto Temple Walk and Bamboo Forest Guide",
      titleKo: "교토의 오래된 사찰과 대나무 숲길 힐링 도보 여행",
      descEn: "Explore Arashiyama, Kiyomizudera, and learn how to avoid crowds in peak season using early morning paths.",
      descKo: "아라시야마 대나무 숲과 청수사(키요미즈데라) 전경을 감상하며 힐링하는 아침 산책 코스 가이드.",
      category: "japan",
      tagEn: "Healing",
      tagKo: "힐링여행",
      author: "Yuki",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=400"
    },
    {
      id: 'blog-swiss',
      titleEn: "Backpacking across Switzerland Interlaken",
      titleKo: "스위스 인터라켄 배낭여행 가성비 꿀팁 총정리",
      descEn: "Train routes, budget paragliding bookings, and the most scenic hiking paths overlooking the high peaks.",
      descKo: "인터라켄 호수 열차 패스 사용 방법과 최적의 하이킹 스팟, 그리고 액티비티 할인 예약 팁.",
      category: "europe",
      tagEn: "Backpacking",
      tagKo: "배낭여행",
      author: "Stefan",
      authorAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=100",
      image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=400"
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
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';

    vlogData.forEach((vlog, index) => {
      const card = document.createElement('div');
      card.className = `vlog-card ${index === activeVlogIndex ? 'active' : ''}`;
      
      const title = lang === 'ko' ? vlog.titleKo : vlog.titleEn;
      const desc = lang === 'ko' ? vlog.descKo : vlog.descEn;
      const location = lang === 'ko' ? vlog.locationKo : vlog.locationEn;
      const sound = lang === 'ko' ? vlog.soundKo : vlog.soundEn;
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
                <span data-localize="share">${lang === 'ko' ? '공유' : 'Share'}</span>
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
    window.TravelogApp.showToast(lang === 'ko' ? '공유 링크 복사 완료!' : 'Vlog link copied to clipboard!');
  }

  // ==========================================
  // Blog Feed Logic
  // ==========================================
  function renderBlogs() {
    const container = document.getElementById('blog-grid-container');
    container.innerHTML = '';
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    const searchQuery = document.getElementById('blog-search').value.toLowerCase();

    const filteredBlogs = blogData.filter(blog => {
      // 1. Category check
      if (currentCategory !== 'all' && blog.category !== currentCategory) {
        return false;
      }
      
      // 2. Search check
      const title = lang === 'ko' ? blog.titleKo.toLowerCase() : blog.titleEn.toLowerCase();
      const desc = lang === 'ko' ? blog.descKo.toLowerCase() : blog.descEn.toLowerCase();
      const author = blog.author.toLowerCase();
      
      return title.includes(searchQuery) || desc.includes(searchQuery) || author.includes(searchQuery);
    });

    if (filteredBlogs.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 32px; margin-bottom: 12px;"></i>
          <p>${lang === 'ko' ? '검색 결과가 없습니다.' : 'No matching stories found.'}</p>
        </div>
      `;
      return;
    }

    filteredBlogs.forEach(blog => {
      const card = document.createElement('div');
      card.className = 'blog-card-item glass-panel glass-panel-hover';
      
      const title = lang === 'ko' ? blog.titleKo : blog.titleEn;
      const desc = lang === 'ko' ? blog.descKo : blog.descEn;
      const tag = lang === 'ko' ? blog.tagKo : blog.tagEn;

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
              ${lang === 'ko' ? '자세히 보기 <i class="fa-solid fa-arrow-right"></i>' : 'Read <i class="fa-solid fa-arrow-right"></i>'}
            </span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function readBlogPost(id) {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    window.TravelogApp.showToast(lang === 'ko' ? '블로그 상세 내용을 로드합니다...' : 'Loading full blog log...');
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
