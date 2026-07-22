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
  let memoMarkersLayer;
  let routePolyline;
  let userMarker;
  let userAccuracyCircle;
  
  let isSimulating = false;
  let simIntervalId = null;
  let simPath = [];
  let simIndex = 0;
  
  // Track triggered places in this walk session
  const triggeredNodes = new Set();
  let didInit = false;
  let hasRealGpsLocation = false;
  let latestGpsFix = null;
  let realtimeWatchId = null;
  let isRealtimeTracking = false;
  let lastTrackingToastAt = 0;
  let memoDraftLocation = null;
  let userMemoItems = [];
  const USER_MEMO_STORAGE_KEY = 'travelog_user_location_memos_v1';

  // Temporary Minho media sources hosted in the Travelog GitHub Pages asset folder.
  // Use relative paths, not github.com/blob URLs, so <audio>/<video> can play directly in the app.
  const GUIDE_MEDIA_SOURCES = {
    minho: {
      audio: 'assets/icons/Audio/Test_log.m4a',
      video: 'assets/icons/Video/t_log_video.mp4'
    }
  };

  function getMinhoMedia(kind) {
    return GUIDE_MEDIA_SOURCES.minho[kind];
  }


  // Custom marker icons using FontAwesome & CSS
  function createHtmlIcon(iconClass, colorClass) {
    return L.divIcon({
      html: `<div class="custom-pin ${colorClass}" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%;"><i class="${iconClass}"></i></div>`,
      className: 'custom-leaflet-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  function createCurrentLocationIcon() {
    return L.divIcon({
      html: `<div class="pin-current-location"></div>`,
      className: 'custom-player-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTime(timestamp) {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (err) {
      return '';
    }
  }

  function getCurrentLatLng() {
    if (latestGpsFix) {
      return { lat: latestGpsFix.lat, lng: latestGpsFix.lng, accuracy: latestGpsFix.accuracy || null };
    }
    if (userMarker) {
      const loc = userMarker.getLatLng();
      return { lat: loc.lat, lng: loc.lng, accuracy: null };
    }
    return { lat: 37.5750, lng: 126.9768, accuracy: null };
  }

  function updateMapText(id, text) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  }

  function setMapControlContent(button, iconText, labelText) {
    if (!button) return;
    button.innerHTML = `<span class="map-control-icon" aria-hidden="true">${iconText}</span><span>${labelText}</span>`;
  }

  function updateMapOverview() {
    const nodes = getTourNodes();
    updateMapText('map-stop-count', String(nodes.length));
    updateMapText('map-memo-count', String(userMemoItems.length));
    updateMapText('map-gps-mode', isRealtimeTracking ? 'ON' : (hasRealGpsLocation ? 'FIX' : 'OFF'));

    if (latestGpsFix) {
      updateMapText('map-current-coords', `${t('내 위치', 'My location', '現在地')}: ${latestGpsFix.lat.toFixed(6)}, ${latestGpsFix.lng.toFixed(6)}`);
      const accuracyText = latestGpsFix.accuracy
        ? `${t('정확도', 'Accuracy', '精度')}: ±${Math.round(latestGpsFix.accuracy)}m`
        : t('정확도 정보 없음', 'No accuracy data', '精度情報なし');
      updateMapText('map-accuracy-text', accuracyText);
    } else {
      updateMapText('map-current-coords', t('GPS를 켜면 좌표가 표시됩니다.', 'Turn on GPS to show your coordinates.', 'GPSをオンにすると座標が表示されます。'));
      updateMapText('map-accuracy-text', t('위치 정확도가 여기에 표시됩니다.', 'Location accuracy will appear here.', '位置精度がここに表示されます。'));
    }

    const realGpsBtn = document.getElementById('real-gps-btn');
    if (realGpsBtn) {
      setMapControlContent(
        realGpsBtn,
        isRealtimeTracking ? '➤' : '⌖',
        isRealtimeTracking ? t('추적 중', 'Tracking', '追跡中') : t('실시간 GPS', 'Live GPS', 'リアルGPS')
      );
    }

    const simBtn = document.getElementById('gps-simulation-btn');
    if (simBtn) {
      setMapControlContent(
        simBtn,
        isSimulating ? 'Ⅱ' : '↟',
        isSimulating ? t('테스트 중', 'Testing', 'テスト中') : t('걷기 테스트', 'Walk Test', '歩行テスト')
      );
    }
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


  // ==========================================
  // Collapsible Map HUD
  // ==========================================
  const HUD_COLLAPSE_STORAGE_KEY = 'travelog-map-hud-collapse-state';

  function readHudCollapseState() {
    try {
      return JSON.parse(localStorage.getItem(HUD_COLLAPSE_STORAGE_KEY) || '{}');
    } catch (err) {
      console.warn('[Travelog Map] Failed to read HUD collapse state:', err);
      return {};
    }
  }

  function saveHudCollapseState(state) {
    try {
      localStorage.setItem(HUD_COLLAPSE_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[Travelog Map] Failed to save HUD collapse state:', err);
    }
  }

  function setHudCollapsed(hudId, collapsed, persist = true) {
    const card = document.querySelector(`.collapsible-hud[data-hud-id="${hudId}"]`);
    const toggle = document.querySelector(`[data-hud-toggle="${hudId}"]`);
    if (!card || !toggle) return;

    const icon = toggle.querySelector('.hud-toggle-icon');
    card.classList.toggle('collapsed', collapsed);
    card.classList.toggle('expanded', !collapsed);
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.setAttribute('title', collapsed
      ? t('펼치기', 'Expand', '開く')
      : t('접기', 'Collapse', '閉じる')
    );

    if (icon) {
      icon.className = collapsed
        ? 'fa-solid fa-chevron-down hud-toggle-icon'
        : 'fa-solid fa-chevron-up hud-toggle-icon';
    }

    if (persist) {
      const state = readHudCollapseState();
      state[hudId] = collapsed;
      saveHudCollapseState(state);
    }

    // Leaflet은 UI 패널 변화 후 크기 재계산을 해주면 모바일에서 더 안정적입니다.
    if (map) {
      setTimeout(() => map.invalidateSize(), 280);
    }
  }

  function initMapHudCollapse() {
    const toggles = document.querySelectorAll('[data-hud-toggle]');
    if (!toggles.length) return;

    const savedState = readHudCollapseState();

    toggles.forEach(toggle => {
      const hudId = toggle.getAttribute('data-hud-toggle');
      if (!hudId) return;

      const initialCollapsed = Boolean(savedState[hudId]);
      setHudCollapsed(hudId, initialCollapsed, false);

      if (toggle.dataset.hudBound === 'true') return;
      toggle.dataset.hudBound = 'true';

      toggle.addEventListener('click', () => {
        const card = document.querySelector(`.collapsible-hud[data-hud-id="${hudId}"]`);
        const nextCollapsed = !(card && card.classList.contains('collapsed'));
        setHudCollapsed(hudId, nextCollapsed, true);
      });
    });
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

    initMapHudCollapse();

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
    memoMarkersLayer = L.layerGroup().addTo(map);
    
    // Create user marker. It starts near Gwanghwamun until the phone GPS updates it.
    userMarker = L.marker([37.5750, 126.9768], { icon: createCurrentLocationIcon() }).addTo(map);

    // 4. Bind map click event for Creator Studio Node Placement
    map.on('click', (e) => {
      // Check if we are currently in Creator tab
      const creatorTab = document.getElementById('creator-tab');
      if (creatorTab && creatorTab.classList.contains('active')) {
        addNewCreatorPin(e.latlng.lat, e.latlng.lng);
      }
    });

    // 5. Setup Controls
    const zoomToUserBtn = document.getElementById('zoom-to-user-btn');
    if (zoomToUserBtn) {
      zoomToUserBtn.addEventListener('click', () => {
        const loc = getCurrentLatLng();
        map.setView([loc.lat, loc.lng], 17);
      });
    }

    const realGpsBtn = document.getElementById('real-gps-btn');
    if (realGpsBtn) {
      setRealtimeTrackingButtonState(false);
      realGpsBtn.addEventListener('click', () => toggleRealtimeLocationTracking());
    }

    const memoBtn = document.getElementById('add-location-memo-btn');
    if (memoBtn) {
      memoBtn.addEventListener('click', handleMemoButtonClick);
    }

    const createPinBtn = document.getElementById('create-pin-at-gps-btn');
    if (createPinBtn) {
      createPinBtn.addEventListener('click', handleCreatePinAtGpsClick);
    }

    const gpsSimulationBtn = document.getElementById('gps-simulation-btn');
    if (gpsSimulationBtn) {
      gpsSimulationBtn.addEventListener('click', toggleGPSSimulation);
    }

    initMemoModalEvents();
    
    // Floating HUD Button actions
    const introBtn = document.getElementById('play-guide-intro-btn');
    if (introBtn) {
      introBtn.addEventListener('click', () => {
        triggerVideoOverlay('Gwanghwamun Gate Intro', 'Minho (Seoul Local)');
      });
    }

    const greetingBtn = document.getElementById('hear-greeting-btn');
    if (greetingBtn) {
      greetingBtn.addEventListener('click', () => {
        triggerAudioOverlay('Greeting from Minho', 'Minho (Seoul Local)');
      });
    }

    window.addEventListener('pagehide', () => stopRealtimeLocationTracking(false));

    // Draw active tour markers and lines
    renderTour();
    loadUserMemos();
    renderUserMemoMarkers();
    updateMapOverview();
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
    if (listEl) {
      listEl.innerHTML = '';
      nodes.forEach((node, index) => {
        const row = document.createElement('div');
        row.className = 'tour-stop-row';
        row.innerHTML = `
          <span class="tour-stop-index">${index + 1}</span>
          <span class="tour-stop-name">${node.name}</span>
          <i class="${node.icon}" aria-hidden="true"></i>
        `;
        listEl.appendChild(row);
      });
    }
    updateMapOverview();
  }

  // ==========================================
  // Real GPS & Text Memo Logic
  // ==========================================
  function updateGpsStatus(message, show = true) {
    const pill = document.getElementById('gps-location-pill');
    const text = document.getElementById('gps-location-text');
    if (!pill || !text) return;
    text.textContent = message;
    pill.style.display = show ? 'block' : 'none';
    updateMapOverview();
  }

  function setRealtimeTrackingButtonState(active) {
    const btn = document.getElementById('real-gps-btn');
    if (!btn) return;

    btn.classList.toggle('tracking-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.setAttribute('title', active
      ? t('실시간 위치 추적 중지', 'Stop live location tracking', 'リアルタイム位置追跡を停止')
      : t('실시간 내 위치 추적 시작', 'Start live location tracking', 'リアルタイム現在地追跡を開始')
    );
    setMapControlContent(
      btn,
      active ? '➤' : '⌖',
      active ? t('추적 중', 'Tracking', '追跡中') : t('실시간 GPS', 'Live GPS', 'リアルGPS')
    );
    updateMapOverview();
  }

  function updateRealtimeTrackingStatus() {
    if (!isRealtimeTracking) return;

    if (latestGpsFix) {
      const ageSeconds = Math.max(0, Math.round((Date.now() - latestGpsFix.updatedAt) / 1000));
      const accuracyText = latestGpsFix.accuracy ? ` · ±${Math.round(latestGpsFix.accuracy)}m` : '';
      updateGpsStatus(`${t('실시간 추적 중', 'Live tracking', 'リアルタイム追跡中')}: ${latestGpsFix.lat.toFixed(5)}, ${latestGpsFix.lng.toFixed(5)}${accuracyText} · ${ageSeconds}${t('초 전', 's ago', '秒前')}`);
    } else {
      updateGpsStatus(t('실시간 GPS 신호를 기다리는 중...', 'Waiting for live GPS signal...', 'リアルタイムGPS信号を待機中...'));
    }
  }

  function applyUserLocation(lat, lng, accuracy = null, shouldPan = true) {
    if (!map || !userMarker) return;

    latestGpsFix = { lat, lng, accuracy, updatedAt: Date.now() };
    hasRealGpsLocation = true;
    userMarker.setLatLng([lat, lng]);

    if (accuracy && accuracy > 0) {
      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: '#70A2B7',
          weight: 1,
          fillColor: '#70A2B7',
          fillOpacity: 0.12
        }).addTo(map);
      } else {
        userAccuracyCircle.setLatLng([lat, lng]);
        userAccuracyCircle.setRadius(accuracy);
      }
    }

    const accuracyText = accuracy ? ` ±${Math.round(accuracy)}m` : '';
    updateGpsStatus(`${t('내 위치', 'My location', '現在地')}: ${lat.toFixed(5)}, ${lng.toFixed(5)}${accuracyText}`);
    updateMapOverview();

    if (shouldPan) {
      map.setView([lat, lng], Math.max(map.getZoom(), 17));
    }

    checkProximityTrigger(lat, lng);
    if (window.TravelogAdventureModule && typeof window.TravelogAdventureModule.updateDistanceToClue === 'function') {
      window.TravelogAdventureModule.updateDistanceToClue(lat, lng);
    }
  }

  function getGeolocationErrorMessage(error) {
    if (!error) return t('위치를 가져오지 못했습니다.', 'Could not get your location.', '位置情報を取得できませんでした。');
    if (error.code === 1) return t('위치 권한이 거부되었습니다. 브라우저 위치 권한을 허용해 주세요.', 'Location permission was denied. Please allow location access in your browser.', '位置情報の許可が拒否されました。ブラウザで位置情報を許可してください。');
    if (error.code === 2) return t('현재 위치를 확인할 수 없습니다. GPS 또는 네트워크 상태를 확인해 주세요.', 'Your location is unavailable. Check GPS or network status.', '現在地を確認できません。GPSまたはネットワーク状態を確認してください。');
    if (error.code === 3) return t('위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.', 'Location request timed out. Please try again.', '位置情報の取得がタイムアウトしました。もう一度お試しください。');
    return t('위치를 가져오지 못했습니다.', 'Could not get your location.', '位置情報を取得できませんでした。');
  }

  function requestCurrentLocation(afterSuccess, shouldPan = true) {
    if (!navigator.geolocation) {
      const msg = t('이 브라우저는 GPS 위치 기능을 지원하지 않습니다.', 'This browser does not support GPS geolocation.', 'このブラウザはGPS位置情報に対応していません。');
      updateGpsStatus(msg);
      window.TravelogApp.showToast(msg);
      return;
    }

    updateGpsStatus(t('GPS 권한을 요청하고 있습니다...', 'Requesting GPS permission...', 'GPS権限をリクエスト中...'));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        applyUserLocation(latitude, longitude, accuracy, shouldPan);
        if (typeof afterSuccess === 'function') {
          afterSuccess({ lat: latitude, lng: longitude, accuracy });
        }
      },
      (error) => {
        const msg = getGeolocationErrorMessage(error);
        updateGpsStatus(msg);
        window.TravelogApp.showToast(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }

  function startRealtimeLocationTracking() {
    if (!navigator.geolocation) {
      const msg = t('이 브라우저는 GPS 위치 기능을 지원하지 않습니다.', 'This browser does not support GPS geolocation.', 'このブラウザはGPS位置情報に対応していません。');
      updateGpsStatus(msg);
      window.TravelogApp.showToast(msg);
      return;
    }

    if (isSimulating) {
      toggleGPSSimulation();
    }

    if (isRealtimeTracking) {
      updateRealtimeTrackingStatus();
      return;
    }

    isRealtimeTracking = true;
    setRealtimeTrackingButtonState(true);
    updateGpsStatus(t('실시간 GPS 추적을 시작합니다...', 'Starting live GPS tracking...', 'リアルタイムGPS追跡を開始します...'));
    window.TravelogApp.showToast(t('이제 이동하면 내 위치 마커가 계속 따라갑니다.', 'Your marker will now keep following your movement.', '移動すると現在地マーカーが継続して追従します。'));

    realtimeWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        applyUserLocation(latitude, longitude, accuracy, true);
        updateRealtimeTrackingStatus();

        // 너무 자주 토스트가 뜨지 않도록 첫 안정화 알림만 제한적으로 표시합니다.
        const now = Date.now();
        if (now - lastTrackingToastAt > 30000) {
          lastTrackingToastAt = now;
          if (!latestGpsFix || now - latestGpsFix.updatedAt < 3000) {
            // 상태 pill이 실시간 좌표를 계속 보여주므로 토스트는 최소화합니다.
          }
        }
      },
      (error) => {
        const msg = getGeolocationErrorMessage(error);
        updateGpsStatus(msg);
        window.TravelogApp.showToast(msg);
        stopRealtimeLocationTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000
      }
    );
  }

  function stopRealtimeLocationTracking(showToast = true) {
    if (realtimeWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(realtimeWatchId);
    }
    realtimeWatchId = null;
    isRealtimeTracking = false;
    setRealtimeTrackingButtonState(false);

    if (latestGpsFix) {
      const accuracyText = latestGpsFix.accuracy ? ` ±${Math.round(latestGpsFix.accuracy)}m` : '';
      updateGpsStatus(`${t('마지막 위치', 'Last location', '最後の位置')}: ${latestGpsFix.lat.toFixed(5)}, ${latestGpsFix.lng.toFixed(5)}${accuracyText}`);
    } else {
      updateGpsStatus(t('GPS 추적이 꺼졌습니다.', 'GPS tracking is off.', 'GPS追跡はオフです。'));
    }

    if (showToast) {
      window.TravelogApp.showToast(t('실시간 위치 추적을 중지했습니다.', 'Live location tracking stopped.', 'リアルタイム位置追跡を停止しました。'));
    }
  }

  function toggleRealtimeLocationTracking() {
    if (isRealtimeTracking) {
      stopRealtimeLocationTracking(true);
    } else {
      startRealtimeLocationTracking();
    }
  }

  function handleCreatePinAtGpsClick() {
    const loc = getCurrentLatLng();
    if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.openPinTypeSelectModal === 'function') {
      window.TravelogCreatorModule.openPinTypeSelectModal(loc.lat, loc.lng);
    } else {
      console.warn('TravelogCreatorModule or openPinTypeSelectModal not loaded.');
    }
  }

  function handleMemoButtonClick() {
    const loc = getCurrentLatLng();
    if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.openPinTypeSelectModal === 'function') {
      window.TravelogCreatorModule.openPinTypeSelectModal(loc.lat, loc.lng);
    } else {
      console.warn('TravelogCreatorModule or openPinTypeSelectModal not loaded.');
    }
  }

  function initMemoModalEvents() {
    const modal = document.getElementById('location-memo-modal');
    const closeBtn = document.getElementById('close-location-memo-modal-btn');
    const cancelBtn = document.getElementById('cancel-location-memo-btn');
    const saveBtn = document.getElementById('save-location-memo-btn');

    if (!modal || modal.dataset.memoBound === 'true') return;
    modal.dataset.memoBound = 'true';

    if (closeBtn) closeBtn.addEventListener('click', closeMemoModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeMemoModal);
    if (saveBtn) saveBtn.addEventListener('click', saveLocationMemo);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeMemoModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeMemoModal();
      }
    });
  }

  function openMemoModal(location) {
    const modal = document.getElementById('location-memo-modal');
    const textArea = document.getElementById('location-memo-text');
    const preview = document.getElementById('memo-location-preview');
    if (!modal || !textArea || !preview) return;

    memoDraftLocation = location || getCurrentLatLng();
    preview.textContent = `${t('좌표', 'Coords', '座標')}: ${memoDraftLocation.lat.toFixed(6)}, ${memoDraftLocation.lng.toFixed(6)}`;
    textArea.value = '';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => textArea.focus(), 80);
  }

  function closeMemoModal() {
    const modal = document.getElementById('location-memo-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    memoDraftLocation = null;
  }

  function loadUserMemos() {
    try {
      const raw = localStorage.getItem(USER_MEMO_STORAGE_KEY);
      userMemoItems = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(userMemoItems)) userMemoItems = [];
    } catch (err) {
      console.warn('[Travelog Map] Failed to load memos:', err);
      userMemoItems = [];
    }
  }

  function saveUserMemos() {
    try {
      localStorage.setItem(USER_MEMO_STORAGE_KEY, JSON.stringify(userMemoItems));
    } catch (err) {
      console.warn('[Travelog Map] Failed to save memos:', err);
      window.TravelogApp.showToast(t('메모 저장 공간이 부족합니다.', 'Not enough storage for memos.', 'メモの保存容量が不足しています。'));
    }
  }

  function saveLocationMemo() {
    const textArea = document.getElementById('location-memo-text');
    if (!textArea || !memoDraftLocation) return;

    const text = textArea.value.trim();
    if (!text) {
      window.TravelogApp.showToast(t('메모 내용을 입력해 주세요.', 'Please write a memo first.', 'メモ内容を入力してください。'));
      textArea.focus();
      return;
    }

    const memo = {
      id: `memo-${Date.now()}`,
      text,
      lat: memoDraftLocation.lat,
      lng: memoDraftLocation.lng,
      accuracy: memoDraftLocation.accuracy || null,
      createdAt: Date.now()
    };

    userMemoItems.unshift(memo);
    saveUserMemos();
    renderUserMemoMarkers();
    closeMemoModal();

    if (map) {
      map.setView([memo.lat, memo.lng], Math.max(map.getZoom(), 17));
    }
    window.TravelogApp.showToast(t('현재 위치에 메모를 저장했습니다.', 'Memo saved at your current location.', '現在地にメモを保存しました。'));
  }

  function renderUserMemoMarkers() {
    updateMapOverview();
    if (!memoMarkersLayer || typeof L === 'undefined') return;
    memoMarkersLayer.clearLayers();

    userMemoItems.forEach((memo) => {
      const memoIcon = createHtmlIcon('fa-solid fa-note-sticky', 'pin-memo');
      const marker = L.marker([memo.lat, memo.lng], { icon: memoIcon });
      const accuracyText = memo.accuracy ? ` · ±${Math.round(memo.accuracy)}m` : '';
      marker.bindPopup(`
        <div class="memo-popup">
          <h4>${t('내 위치 메모', 'My Location Memo', '現在地メモ')}</h4>
          <p>${escapeHtml(memo.text)}</p>
          <small>${memo.lat.toFixed(5)}, ${memo.lng.toFixed(5)}${accuracyText}<br>${formatDateTime(memo.createdAt)}</small>
          <button class="memo-delete-btn" onclick="TravelogMapModule.deleteMemo('${memo.id}')">${t('삭제', 'Delete', '削除')}</button>
        </div>
      `);
      memoMarkersLayer.addLayer(marker);
    });
  }

  function deleteMemo(id) {
    userMemoItems = userMemoItems.filter(memo => memo.id !== id);
    saveUserMemos();
    renderUserMemoMarkers();
    window.TravelogApp.showToast(t('메모를 삭제했습니다.', 'Memo deleted.', 'メモを削除しました。'));
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
      setMapControlContent(btn, '↟', t('걷기 테스트', 'Walk Test', '歩行テスト'));
      btn.style.background = '';
      statusPill.style.display = 'none';
      window.TravelogApp.showToast(t('시뮬레이션이 종료되었습니다.', 'Simulation stopped.', 'シミュレーションを終了しました。'));
    } else {
      // Start simulation
      if (isRealtimeTracking) {
        stopRealtimeLocationTracking(false);
      }
      isSimulating = true;
      setMapControlContent(btn, 'Ⅱ', t('테스트 중', 'Testing', 'テスト中'));
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

  function getGuideAudioElement() {
    return document.getElementById('guide-audio-element');
  }

  function triggerAudioOverlay(title, speaker, audioSrc = getMinhoMedia('audio')) {
    const overlay = document.getElementById('audio-overlay');
    const audioEl = getGuideAudioElement();
    document.getElementById('audio-title').textContent = title;
    document.getElementById('audio-speaker').textContent = `By ${speaker}`;
    overlay.classList.add('active');

    if (audioEl && audioSrc) {
      if (!audioEl.src || !audioEl.src.endsWith(audioSrc)) {
        audioEl.src = audioSrc;
        audioEl.load();
      }
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          isAudioPlaying = false;
          updateAudioPlayButtonIcon();
          stopAudioWaveAnimation();
          window.TravelogApp?.showToast(t('모바일 브라우저 정책상 재생 버튼을 눌러 음성을 시작해 주세요.', 'Tap play to start audio on mobile.', 'モバイルでは再生ボタンを押して音声を開始してください。'));
        });
      }
    }

    isAudioPlaying = true;
    updateAudioPlayButtonIcon();
    startAudioWaveAnimation();
  }

  // Bind audio controls
  document.getElementById('close-audio-btn').addEventListener('click', () => {
    const audioEl = getGuideAudioElement();
    if (audioEl) audioEl.pause();
    isAudioPlaying = false;
    document.getElementById('audio-overlay').classList.remove('active');
    updateAudioPlayButtonIcon();
    stopAudioWaveAnimation();
  });

  document.getElementById('play-audio-btn').addEventListener('click', () => {
    const audioEl = getGuideAudioElement();
    if (!audioEl) return;

    if (audioEl.paused) {
      audioEl.play().then(() => {
        isAudioPlaying = true;
        updateAudioPlayButtonIcon();
        startAudioWaveAnimation();
      }).catch(() => {
        window.TravelogApp?.showToast(t('음성 파일을 재생할 수 없습니다. 파일 경로를 확인해 주세요.', 'Audio could not be played. Check the file path.', '音声ファイルを再生できません。ファイルパスを確認してください。'));
      });
    } else {
      audioEl.pause();
      isAudioPlaying = false;
      updateAudioPlayButtonIcon();
      stopAudioWaveAnimation();
    }
  });

  const guideAudioElement = getGuideAudioElement();
  if (guideAudioElement) {
    guideAudioElement.addEventListener('play', () => {
      isAudioPlaying = true;
      updateAudioPlayButtonIcon();
      startAudioWaveAnimation();
    });
    guideAudioElement.addEventListener('pause', () => {
      isAudioPlaying = false;
      updateAudioPlayButtonIcon();
      stopAudioWaveAnimation();
    });
    guideAudioElement.addEventListener('ended', () => {
      isAudioPlaying = false;
      updateAudioPlayButtonIcon();
      stopAudioWaveAnimation();
    });
  }

  function updateAudioPlayButtonIcon() {
    const btn = document.getElementById('play-audio-btn');
    if (!btn) return;
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
  // Video Overlay Controller (Guide Video)
  // ==========================================
  function formatMediaTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function getGuideVideoElement() {
    return document.getElementById('guide-video-element');
  }

  function triggerVideoOverlay(title, author, videoSrc = getMinhoMedia('video')) {
    const modal = document.getElementById('video-overlay');
    const videoEl = getGuideVideoElement();
    const timerText = document.getElementById('video-play-timer');

    document.getElementById('video-overlay-title').textContent = title;
    document.getElementById('video-overlay-author').textContent = author;
    modal.classList.add('active');

    if (videoEl && videoSrc) {
      if (!videoEl.src || !videoEl.src.endsWith(videoSrc)) {
        videoEl.src = videoSrc;
        videoEl.load();
      }
      if (timerText) timerText.textContent = '0:00 / --:--';
      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          window.TravelogApp?.showToast(t('모바일에서는 영상의 재생 버튼을 눌러 시작해 주세요.', 'Tap the video play button to start on mobile.', 'モバイルでは動画の再生ボタンを押して開始してください。'));
        });
      }
    }
  }

  function closeVideoOverlay() {
    const videoEl = getGuideVideoElement();
    if (videoEl) videoEl.pause();
    document.getElementById('video-overlay').classList.remove('active');
  }

  document.getElementById('close-video-modal-btn').addEventListener('click', closeVideoOverlay);

  const guideVideoElement = getGuideVideoElement();
  if (guideVideoElement) {
    guideVideoElement.addEventListener('timeupdate', () => {
      const timerText = document.getElementById('video-play-timer');
      if (!timerText) return;
      timerText.textContent = `${formatMediaTime(guideVideoElement.currentTime)} / ${formatMediaTime(guideVideoElement.duration)}`;
    });
    guideVideoElement.addEventListener('loadedmetadata', () => {
      const timerText = document.getElementById('video-play-timer');
      if (!timerText) return;
      timerText.textContent = `0:00 / ${formatMediaTime(guideVideoElement.duration)}`;
    });
  }

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
    addNewCreatorPin: addNewCreatorPin,
    invalidateSize: () => {
      if (map) {
        map.invalidateSize();
      }
    },
    onLanguageChange: (lang) => {
      if (map) {
        renderTour();
        renderUserMemoMarkers();
        setRealtimeTrackingButtonState(isRealtimeTracking);
        if (isRealtimeTracking) {
          updateRealtimeTrackingStatus();
        } else if (latestGpsFix) {
          updateGpsStatus(`${t('내 위치', 'My location', '現在地')}: ${latestGpsFix.lat.toFixed(5)}, ${latestGpsFix.lng.toFixed(5)}${latestGpsFix.accuracy ? ` ±${Math.round(latestGpsFix.accuracy)}m` : ''}`);
        }
        updateMapOverview();
      }
    },
    clearCreatorPins: clearCreatorPins,
    requestCurrentLocation: requestCurrentLocation,
    startRealtimeLocationTracking: startRealtimeLocationTracking,
    stopRealtimeLocationTracking: stopRealtimeLocationTracking,
    toggleRealtimeLocationTracking: toggleRealtimeLocationTracking,
    deleteMemo: deleteMemo,
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
      const loc = getCurrentLatLng();
      return { lat: loc.lat, lng: loc.lng };
    },
    showFallbackMap: () => renderFallbackMap('수동으로 대체 지도를 표시했습니다.'),
    getDebugStatus: () => ({
      hasLeaflet: typeof L !== 'undefined',
      hasMapObject: !!map,
      hasUserMarker: !!userMarker,
      isRealtimeTracking: isRealtimeTracking,
      realtimeWatchId: realtimeWatchId,
      latestGpsFix: latestGpsFix,
      fallbackVisible: !!document.querySelector('.map-iframe-fallback-overlay')
    })
  };
})();
