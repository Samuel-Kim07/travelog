// ==========================================
// Travelog Map Module
// ==========================================

const TravelogMapModule = (() => {
  function t(ko, en, ja) {
    return window.TravelogApp && typeof window.TravelogApp.t === 'function' ? window.TravelogApp.t(ko, en, ja) : ko;
  }

  function pick(source, baseKey) {
    return window.TravelogApp && typeof window.TravelogApp.pickLocalized === 'function' ? window.TravelogApp.pickLocalized(source, baseKey) : (source?.[`${baseKey}Ko`] || source?.[`${baseKey}En`] || source?.[`${baseKey}Ja`] || '');
  }

  let map;
  let markersLayer;
  let routePolyline;
  let userMarker;
  
  let isSimulating = false;
  let simIntervalId = null;
  let simPath = [];
  let simIndex = 0;
  
  // Track triggered places in this walk session
  const triggeredNodes = new Set();
  let didInit = false;

  // Custom marker icons using FontAwesome & CSS
  function createHtmlIcon(iconClass, colorClass) {
    return L.divIcon({
      html: `<div class="custom-pin ${colorClass}" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%;"><i class="${iconClass}"></i></div>`,
      className: 'custom-leaflet-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  // Predefined Tour Spots (Minho's Gyeongbokgung Tour)
  const getTourNodes = () => {
    return [
      {
        id: 'node-gwanghwamun',
        name: t('광화문 (소개 영상 지점)', 'Gwanghwamun Gate (Intro Video)', '光化門（紹介動画地点）'),
        desc: t('경복궁의 남쪽 정문으로 왕의 행차가 이루어지던 곳입니다.', 'The main and southern gate of Gyeongbokgung Palace.', '景福宮の南側の正門で、王の行幸が行われた場所です。'),
        lat: 37.5760,
        lng: 126.9768,
        type: 'video',
        icon: 'fa-solid fa-video',
        color: 'pin-video',
        triggerText: t('광화문 소개 영상이 자동 재생됩니다.', 'Gwanghwamun Intro Video is autoplaying.', '光化門の紹介動画が自動再生されます。')
      },
      {
        id: 'node-heungnyemun',
        name: t('흥례문 뜰 (가이드 인사)', 'Heungnyemun Court (Guide Greeting)', '興礼門の庭（ガイド挨拶）'),
        desc: t('두 번째 문인 흥례문 앞뜰로, 품계석과 넓은 조정이 펼쳐집니다.', 'The courtyard in front of the second gate, Heungnyemun.', '二番目の門・興礼門の前庭で、品階石と広い朝廷の庭が広がります。'),
        lat: 37.5772,
        lng: 126.9768,
        type: 'audio',
        icon: 'fa-solid fa-volume-high',
        color: 'pin-audio',
        triggerText: t('민호 가이드의 해설이 시작됩니다.', 'Guide Minho\'s commentary is playing.', 'ミンホガイドの解説が始まります。')
      },
      {
        id: 'node-geunjeongjeon',
        name: t('근정전 (할인 쿠폰 지점)', 'Geunjeongjeon Hall (Coupon Spot)', '勤政殿（割引クーポン地点）'),
        desc: t('경복궁의 으뜸 법전으로 왕의 즉위식이나 아침 조회가 행해졌습니다.', 'The main throne hall where coronation ceremonies were held.', '景福宮の中心となる正殿で、王の即位式や朝会が行われた場所です。'),
        lat: 37.5786,
        lng: 126.9772,
        type: 'coupon',
        icon: 'fa-solid fa-ticket',
        color: 'pin-coupon',
        triggerText: t('법전 비화 퀴즈를 풀고 할인 쿠폰을 받으세요!', 'Solve the throne history quiz and win a coupon!', '正殿の秘話クイズを解いて割引クーポンを受け取りましょう！')
      },
      {
        id: 'node-gyeonghoeru',
        name: t('경회루 (음성 해설)', 'Gyeonghoeru Pavilion (Audio Story)', '慶会楼（音声解説）'),
        desc: t('나라의 경사가 있을 때 연회를 베풀던 연못 위 누각입니다.', 'A majestic pavilion sitting over a pond, used for royal banquets.', '国の慶事の際に宴が開かれた、池の上に建つ楼閣です。'),
        lat: 37.5798,
        lng: 126.9760,
        type: 'audio',
        icon: 'fa-solid fa-microphone',
        color: 'pin-audio',
        triggerText: t('경회루 물안개 스토리 오디오가 재생됩니다.', 'Gyeonghoeru Water Fog Story audio is playing.', '慶会楼の水霧ストーリー音声が再生されます。')
      }
    ];
  };

  function getFallbackMapMarkup(reasonText) {
    const safeReason = reasonText || '지도 타일 또는 지도 라이브러리를 불러오지 못했습니다.';
    return `
      <div class="map-iframe-fallback-overlay">
        <iframe
          class="map-fallback-iframe"
          title="Travelog fallback map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=126.9700%2C37.5730%2C126.9835%2C37.5830&layer=mapnik&marker=37.5780%2C126.9768"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen>
        </iframe>
        <div class="map-fallback-notice glass-panel">
          <i class="fa-solid fa-map-location-dot"></i>
          <div>
            <strong>지도 대체 모드</strong>
            <p>${safeReason}</p>
            <a href="https://www.openstreetmap.org/?mlat=37.5780&mlon=126.9768#map=16/37.5780/126.9768" target="_blank" rel="noopener noreferrer">새 창에서 지도 열기</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderFallbackMap(reasonText, replaceContainer = false) {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    const existing = mapContainer.querySelector('.map-iframe-fallback-overlay');
    if (existing) return;

    if (replaceContainer) {
      mapContainer.innerHTML = getFallbackMapMarkup(reasonText);
    } else {
      mapContainer.insertAdjacentHTML('beforeend', getFallbackMapMarkup(reasonText));
    }
  }

  function init() {
    if (didInit) {
      return;
    }
    didInit = true;

    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
      console.error('[Travelog Map] #map-container not found.');
      return;
    }

    // Leaflet CDN이 차단되었거나 로드되지 않았을 때도 빈 화면 대신 OSM iframe 지도를 보여줍니다.
    if (typeof L === 'undefined') {
      renderFallbackMap('Leaflet 지도 라이브러리가 로드되지 않아 iframe 지도로 표시합니다.', true);
      console.error('[Travelog Map] Leaflet library is not loaded. Check Leaflet CSS/JS CDN in index.html.');
      return;
    }

    // 1. Leaflet initialization centered at Gyeongbokgung
    try {
      map = L.map('map-container', {
        zoomControl: false,
        preferCanvas: true
      }).setView([37.5780, 126.9768], 16);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    } catch (err) {
      console.error('[Travelog Map] Failed to initialize Leaflet map:', err);
      renderFallbackMap('지도 초기화 중 오류가 발생해 iframe 지도로 표시합니다.', true);
      return;
    }

    // 2. Add Map Tiles
    // CARTO 타일이 모바일/브라우저 환경에서 막히는 경우가 있어 OpenStreetMap 기본 타일을 1순위로 사용합니다.
    let loadedTileCount = 0;
    let tileErrorCount = 0;

    const openStreetMapTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      detectRetina: true,
      crossOrigin: true,
      referrerPolicy: 'strict-origin-when-cross-origin'
    });

    const cartoVoyagerTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
      detectRetina: true,
      crossOrigin: true,
      referrerPolicy: 'strict-origin-when-cross-origin'
    });

    openStreetMapTiles.addTo(map);

    const fallbackTimer = setTimeout(() => {
      if (loadedTileCount === 0) {
        console.warn('[Travelog Map] No map tiles loaded within timeout. Showing iframe fallback.');
        renderFallbackMap('지도 타일 서버 응답이 늦거나 차단되어 iframe 지도로 표시합니다.');
      }
    }, 6500);

    openStreetMapTiles.on('tileload', () => {
      loadedTileCount++;
      clearTimeout(fallbackTimer);
    });

    // 타일 로딩 에러가 반복되면 빈 화면 대신 iframe 지도를 보여줍니다.
    openStreetMapTiles.on('tileerror', (e) => {
      tileErrorCount++;
      console.warn('[Travelog Map] OpenStreetMap tile load error:', e);
      if (tileErrorCount >= 3 && loadedTileCount === 0) {
        renderFallbackMap('OpenStreetMap 타일이 현재 브라우저에서 차단되어 iframe 지도로 표시합니다.');
      }
    });
    cartoVoyagerTiles.on('tileerror', (e) => {
      console.warn('[Travelog Map] CARTO tile load error:', e);
    });

    // 모바일/탭 전환 시 지도 영역 크기 계산이 늦어지는 문제 보정
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 300);

    // 3. Add Layers
    markersLayer = L.layerGroup().addTo(map);
    
    // Create simulated user marker starting at Gwanghwamun Gate
    const playerIcon = L.divIcon({
      html: `<div class="pin-player" style="width:24px; height:24px; border-radius:50%;"></div>`,
      className: 'custom-player-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    userMarker = L.marker([37.5750, 126.9768], { icon: playerIcon }).addTo(map);

    // 4. Bind map click event for Creator Studio Node Placement
    map.on('click', (e) => {
      // Check if we are currently in Creator tab
      const creatorTab = document.getElementById('creator-tab');
      if (creatorTab && creatorTab.classList.contains('active')) {
        addNewCreatorPin(e.latlng.lat, e.latlng.lng);
      }
    });

    // 5. Setup Controls
    document.getElementById('zoom-to-user-btn').addEventListener('click', () => {
      map.setView(userMarker.getLatLng(), 16);
    });

    document.getElementById('gps-simulation-btn').addEventListener('click', toggleGPSSimulation);
    
    // Floating HUD Button actions
    document.getElementById('play-guide-intro-btn').addEventListener('click', () => {
      triggerVideoOverlay('Gwanghwamun Gate Intro', 'Minho (Seoul Local)');
    });
    document.getElementById('hear-greeting-btn').addEventListener('click', () => {
      triggerAudioOverlay('Greeting from Minho', 'Minho (Seoul Local)');
    });

    // Draw active tour markers and lines
    renderTour();
  }

  function renderTour() {
    markersLayer.clearLayers();
    if (routePolyline) {
      map.removeLayer(routePolyline);
    }

    const activeGuide = window.TravelogApp ? window.TravelogApp.getState().activeGuide : null;
    if (activeGuide) {
      const guideName = document.getElementById('guide-name');
      const guideDesc = document.getElementById('guide-desc');
      if (guideName) guideName.textContent = pick(activeGuide, 'name');
      if (guideDesc) guideDesc.textContent = pick(activeGuide, 'desc');
    }

    const nodes = getTourNodes();
    const routeCoords = [];

    // Draw Marker Pins
    nodes.forEach(node => {
      routeCoords.push([node.lat, node.lng]);

      const marker = L.marker([node.lat, node.lng], {
        icon: createHtmlIcon(node.icon, node.color)
      });

      // Bind Popups with dynamic content
      const popupContent = `
        <div style="color:var(--bg-primary); padding:4px;">
          <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700;">${node.name}</h4>
          <p style="margin:0; font-size:12px; line-height:1.4; color:#666;">${node.desc}</p>
        </div>
      `;
      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });

    // Draw Polyline route
    routePolyline = L.polyline(routeCoords, {
      color: '#70A2B7',
      weight: 5,
      opacity: 0.8,
      dashArray: '8, 8'
    }).addTo(map);

    // Render list in Tour Stops HUD
    const listEl = document.getElementById('tour-stops-list');
    listEl.innerHTML = '';
    nodes.forEach((node, index) => {
      const row = document.createElement('div');
      row.style.cssText = `
        padding: 6px 0;
        border-bottom: 1px solid rgba(112, 162, 183, 0.12);
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      row.innerHTML = `
        <span style="background:var(--bg-tertiary); border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;">${index+1}</span>
        <span style="flex:1;">${node.name}</span>
        <i class="${node.icon}" style="font-size:12px; color:var(--text-muted);"></i>
      `;
      listEl.appendChild(row);
    });
  }

  // ==========================================
  // GPS Path Simulator Logic
  // ==========================================
  function toggleGPSSimulation() {
    const btn = document.getElementById('gps-simulation-btn');
    const statusPill = document.getElementById('simulation-status-pill');
    
    if (isSimulating) {
      // Pause/Stop simulation
      clearInterval(simIntervalId);
      isSimulating = false;
      btn.innerHTML = `<i class="fa-solid fa-person-walking"></i>`;
      btn.style.background = '';
      statusPill.style.display = 'none';
      window.TravelogApp.showToast(t('시뮬레이션이 종료되었습니다.', 'Simulation stopped.', 'シミュレーションを終了しました。'));
    } else {
      // Start simulation
      isSimulating = true;
      btn.innerHTML = `<i class="fa-solid fa-circle-pause"></i>`;
      btn.style.background = 'var(--accent-pink)';
      statusPill.style.display = 'block';
      triggeredNodes.clear();
      
      generateSimulationPath();
      simIndex = 0;
      
      window.TravelogApp.showToast(t('GPS 이동 시뮬레이션을 시작합니다!', 'Starting GPS Walk Simulation!', 'GPS移動シミュレーションを開始します！'));
      
      simIntervalId = setInterval(runSimulationStep, 250); // Move user every 250ms
    }
  }

  // Generate intermediate coordinates along the route
  function generateSimulationPath() {
    simPath = [];
    const nodes = getTourNodes();
    
    // Start slightly south of Gwanghwamun
    let currentPt = { lat: 37.5750, lng: 126.9768 };
    
    nodes.forEach(node => {
      // Interpolate 12 steps between consecutive nodes
      const steps = 12;
      const dLat = (node.lat - currentPt.lat) / steps;
      const dLng = (node.lng - currentPt.lng) / steps;
      
      for (let i = 1; i <= steps; i++) {
        simPath.push({
          lat: currentPt.lat + dLat * i,
          lng: currentPt.lng + dLng * i
        });
      }
      currentPt = { lat: node.lat, lng: node.lng };
    });
  }

  function runSimulationStep() {
    if (simIndex >= simPath.length) {
      toggleGPSSimulation(); // Finished path
      return;
    }

    const nextCoord = simPath[simIndex];
    userMarker.setLatLng([nextCoord.lat, nextCoord.lng]);
    map.panTo([nextCoord.lat, nextCoord.lng]);
    
    // Verify distance to nodes
    checkProximityTrigger(nextCoord.lat, nextCoord.lng);
    
    // Forward distance updates to Adventure Mode if active
    if (window.TravelogAdventureModule && typeof window.TravelogAdventureModule.updateDistanceToClue === 'function') {
      window.TravelogAdventureModule.updateDistanceToClue(nextCoord.lat, nextCoord.lng);
    }

    simIndex++;
  }

  // Calculate distance & trigger coordinate events
  function checkProximityTrigger(lat, lng) {
    const nodes = getTourNodes();
    nodes.forEach(node => {
      if (triggeredNodes.has(node.id)) return;

      const dist = getDistanceInMeters(lat, lng, node.lat, node.lng);
      
      // Node trigger threshold (approx. 20-30 meters)
      if (dist <= 22) {
        triggeredNodes.add(node.id);
        triggerNodeEvent(node);
      }
    });
  }

  function triggerNodeEvent(node) {
    window.TravelogApp.showToast(`${node.name}: ${node.triggerText}`);

    if (node.type === 'video') {
      triggerVideoOverlay(node.name, 'Minho (Seoul Local)');
    } else if (node.type === 'audio') {
      triggerAudioOverlay(node.name, 'Minho (Seoul Local)');
    } else if (node.type === 'coupon') {
      // Give points to user & redirect/award coupon
      setTimeout(() => {
        window.TravelogApp.addPoints(100);
        window.TravelogApp.claimCoupon({
          id: 'coupon-geunjeong',
          tag: 'GEUNJEONG THRONES',
          value: '15% OFF',
          desc: 'Seochon Traditional Cafe Tea House'
        });
        window.TravelogApp.showToast(t('근정전 비화 보상: +100 포인트 & 카페 15% 할인 쿠폰 획득!', 'Geunjeong Hall Reward: +100 pts & 15% Cafe Coupon claimed!', '勤政殿の報酬：+100ポイント＆カフェ15%割引クーポン獲得！'));
      }, 1000);
    }
  }

  // Helper: Haversine formula to compute distance
  function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in meters
  }

  // ==========================================
  // Audio Overlay Controller
  // ==========================================
  let isAudioPlaying = false;
  let audioTimerInterval = null;

  function triggerAudioOverlay(title, speaker) {
    const overlay = document.getElementById('audio-overlay');
    document.getElementById('audio-title').textContent = title;
    document.getElementById('audio-speaker').textContent = `By ${speaker}`;
    overlay.classList.add('active');

    // Reset controls state
    isAudioPlaying = true;
    updateAudioPlayButtonIcon();
    startAudioWaveAnimation();
  }

  // Bind audio controls
  document.getElementById('close-audio-btn').addEventListener('click', () => {
    document.getElementById('audio-overlay').classList.remove('active');
    stopAudioWaveAnimation();
  });

  document.getElementById('play-audio-btn').addEventListener('click', () => {
    isAudioPlaying = !isAudioPlaying;
    updateAudioPlayButtonIcon();
    if (isAudioPlaying) {
      startAudioWaveAnimation();
    } else {
      stopAudioWaveAnimation();
    }
  });

  function updateAudioPlayButtonIcon() {
    const btn = document.getElementById('play-audio-btn');
    btn.innerHTML = isAudioPlaying ? `<i class="fa-solid fa-pause"></i>` : `<i class="fa-solid fa-play"></i>`;
  }

  function startAudioWaveAnimation() {
    const waveBars = document.querySelectorAll('#waveform-visualizer .wave-bar');
    waveBars.forEach((bar, index) => {
      bar.style.animation = `jump-wave ${0.4 + (index * 0.1)}s ease-in-out infinite alternate`;
    });
  }

  function stopAudioWaveAnimation() {
    const waveBars = document.querySelectorAll('#waveform-visualizer .wave-bar');
    waveBars.forEach(bar => {
      bar.style.animation = 'none';
      bar.style.height = '12px';
    });
  }

  // ==========================================
  // Video Overlay Controller (Vlogs)
  // ==========================================
  let videoPlayInterval = null;
  let videoSeconds = 0;

  function triggerVideoOverlay(title, author) {
    const modal = document.getElementById('video-overlay');
    document.getElementById('video-overlay-title').textContent = title;
    document.getElementById('video-overlay-author').textContent = author;
    modal.classList.add('active');

    // Simulate video playing timeline
    videoSeconds = 0;
    const timerText = document.getElementById('video-play-timer');
    timerText.textContent = `0:00 / 0:15`;

    clearInterval(videoPlayInterval);
    videoPlayInterval = setInterval(() => {
      videoSeconds++;
      if (videoSeconds > 15) {
        clearInterval(videoPlayInterval);
        closeVideoOverlay();
      } else {
        const displaySec = videoSeconds < 10 ? `0${videoSeconds}` : videoSeconds;
        timerText.textContent = `0:${displaySec} / 0:15`;
      }
    }, 1000);
  }

  function closeVideoOverlay() {
    clearInterval(videoPlayInterval);
    document.getElementById('video-overlay').classList.remove('active');
  }

  document.getElementById('close-video-modal-btn').addEventListener('click', closeVideoOverlay);

  // ==========================================
  // Creator Custom Pins Placement
  // ==========================================
  function addNewCreatorPin(lat, lng) {
    // Add coordinates to state
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const newIndex = customPins.length + 1;
    
    const newPin = {
      id: `custom-pin-${newIndex}`,
      nameEn: `Custom Pin #${newIndex}`,
      nameKo: `커스텀 핀 #${newIndex}`,
      nameJa: `カスタムピン #${newIndex}`,
      lat: lat,
      lng: lng
    };
    
    customPins.push(newPin);
    
    // Draw Pin on Map
    const marker = L.marker([lat, lng], {
      icon: createHtmlIcon('fa-solid fa-location-crosshairs', 'pin-quest')
    }).bindPopup(`<b>Custom Pin #${newIndex}</b><br>Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    
    markersLayer.addLayer(marker);
    
    // Notify Creator Studio
    if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.renderCoordinatesList === 'function') {
      window.TravelogCreatorModule.renderCoordinatesList();
    }
    
    window.TravelogApp.showToast(t(`새 핀 #${newIndex}이 추가되었습니다.`, `New pin #${newIndex} added.`, `新しいピン #${newIndex} を追加しました。`));
  }

  function clearCreatorPins() {
    window.TravelogApp.getState().customCreatedPins = [];
    renderTour(); // Redraw baseline tour
  }


  // app.js에서 init을 호출하지 못하는 상황을 대비해 map.js가 스스로도 지도를 시작합니다.
  // didInit 가드가 있어서 app.js가 다시 호출해도 중복 실행되지 않습니다.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 0);
      setTimeout(() => {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer && !mapContainer.querySelector('.leaflet-tile-loaded') && !mapContainer.querySelector('.map-iframe-fallback-overlay')) {
          renderFallbackMap('지도 타일이 표시되지 않아 iframe 지도로 전환했습니다.');
        }
      }, 8000);
    });
  } else {
    setTimeout(init, 0);
    setTimeout(() => {
      const mapContainer = document.getElementById('map-container');
      if (mapContainer && !mapContainer.querySelector('.leaflet-tile-loaded') && !mapContainer.querySelector('.map-iframe-fallback-overlay')) {
        renderFallbackMap('지도 타일이 표시되지 않아 iframe 지도로 전환했습니다.');
      }
    }, 8000);
  }

  return {
    init: init,
    invalidateSize: () => {
      if (map) {
        map.invalidateSize();
      }
    },
    onLanguageChange: (lang) => {
      if (map) {
        renderTour();
      }
    },
    clearCreatorPins: clearCreatorPins,
    teleportUser: (lat, lng) => {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
        map.panTo([lat, lng]);
        checkProximityTrigger(lat, lng);
        if (window.TravelogAdventureModule && typeof window.TravelogAdventureModule.updateDistanceToClue === 'function') {
          window.TravelogAdventureModule.updateDistanceToClue(lat, lng);
        }
      }
    },
    getDistanceInMeters: getDistanceInMeters,
    getUserLocation: () => {
      if (userMarker) {
        const loc = userMarker.getLatLng();
        return { lat: loc.lat, lng: loc.lng };
      }
      return { lat: 37.5750, lng: 126.9768 };
    },
    showFallbackMap: () => renderFallbackMap('수동으로 대체 지도를 표시했습니다.'),
    getDebugStatus: () => ({
      hasLeaflet: typeof L !== 'undefined',
      hasMapObject: !!map,
      hasUserMarker: !!userMarker,
      fallbackVisible: !!document.querySelector('.map-iframe-fallback-overlay')
    })
  };
})();
