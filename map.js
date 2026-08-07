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
  let customCreatedMarkers = {};
  let creatorRouteConnected = false;
  let creatorPreviewPackage = null;
  let creatorPreviewIndex = -1;
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


  function getFilterForColorDirect(colorHex) {
    if (!colorHex) return 'none';
    colorHex = colorHex.toLowerCase();
    switch (colorHex) {
      case '#ff2e63': // Neon Pink
        return 'hue-rotate(330deg) saturate(2)';
      case '#00adb5': // Neon Blue
        return 'hue-rotate(180deg) saturate(2)';
      case '#34a853': // Green
        return 'hue-rotate(90deg) saturate(2)';
      case '#ffb703': // Gold
        return 'hue-rotate(35deg) saturate(2)';
      case '#8b5cf6': // Purple
        return 'hue-rotate(240deg) saturate(2)';
      default:
        return 'none';
    }
  }

  function applyColorFilterToMarker(marker, colorClassOrHex) {
    if (!marker) return;
    const apply = () => {
      if (marker._icon) {
        let filterVal = 'none';
        if (colorClassOrHex && colorClassOrHex.startsWith('#')) {
          filterVal = getFilterForColorDirect(colorClassOrHex);
        } else if (colorClassOrHex) {
          if (colorClassOrHex.includes('pink') || colorClassOrHex.includes('quest')) filterVal = getFilterForColorDirect('#ff2e63');
          else if (colorClassOrHex.includes('blue') || colorClassOrHex.includes('audio')) filterVal = getFilterForColorDirect('#00adb5');
          else if (colorClassOrHex.includes('green') || colorClassOrHex.includes('coupon')) filterVal = getFilterForColorDirect('#34a853');
          else if (colorClassOrHex.includes('purple')) filterVal = getFilterForColorDirect('#8b5cf6');
          else if (colorClassOrHex.includes('memo')) filterVal = getFilterForColorDirect('#ffb703');
        }
        marker._icon.style.filter = filterVal;
      }
    };
    if (marker._icon) {
      apply();
    } else {
      marker.on('add', () => {
        setTimeout(apply, 10);
      });
    }
  }

  // Bulletproof Custom marker icons using Leaflet's native L.icon image loader
  function createHtmlIcon(iconClass, colorClassOrHex) {
    return L.icon({
      iconUrl: 'assets/icons/ui/pin_red.png',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32]
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

  function getMemoTypeLabel(type) {
    if (type === 'video') return t('영상 메모', 'Video memo', '動画メモ');
    if (type === 'audio') return t('음성 메모', 'Audio memo', '音声メモ');
    if (type === 'photo') return t('사진 메모', 'Photo memo', '写真メモ');
    if (type === 'coupon') return t('쿠폰', 'Coupon', 'クーポン');
    return t('텍스트 메모', 'Text memo', 'テキストメモ');
  }

  function looksLikeMemoFileName(value) {
    return /\.(webm|mp4|m4a|mp3|wav|ogg|mov|png|jpe?g|webp|gif|txt)$/i.test(String(value || '').trim());
  }

  function createCountIcon(count, colorClassOrHex) {
    const filter = colorClassOrHex && colorClassOrHex.startsWith('#')
      ? getFilterForColorDirect(colorClassOrHex)
      : getFilterForColorDirect('#ff2e63');
    return L.divIcon({
      html: `
        <div style="position:relative;width:42px;height:46px;">
          <img src="assets/icons/ui/pin_red.png" alt="" style="width:36px;height:36px;position:absolute;left:3px;bottom:0;filter:${filter};">
          <span style="position:absolute;right:0;top:0;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ff2e63;color:#fff;border:2px solid #fff;font-size:11px;font-weight:900;line-height:18px;text-align:center;box-shadow:0 6px 16px rgba(0,0,0,.22);">${Number(count) || 0}</span>
        </div>
      `,
      className: 'travelog-memo-count-pin',
      iconSize: [42, 46],
      iconAnchor: [21, 44],
      popupAnchor: [0, -42]
    });
  }

  function getNodeLocationKey(node) {
    const lat = Number(node?.lat);
    const lng = Number(node?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return `invalid-${node?.id || Math.random()}`;
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }

  function groupNodesByLocation(nodes) {
    const mapByLocation = new Map();
    (nodes || []).forEach((node) => {
      const key = getNodeLocationKey(node);
      if (!mapByLocation.has(key)) {
        mapByLocation.set(key, {
          id: `memo-group-${key.replace(/[^0-9a-zA-Z_-]/g, '-')}`,
          key,
          lat: Number(node.lat),
          lng: Number(node.lng),
          nodes: []
        });
      }
      mapByLocation.get(key).nodes.push(node);
    });

    return Array.from(mapByLocation.values()).map(group => {
      group.nodes.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      group.primary = group.nodes[0];
      group.count = group.nodes.length;
      group.triggerRadius = Math.max(...group.nodes.map(node => Number(node.triggerRadius) || 22));
      return group;
    });
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
    const activeGuide = window.TravelogApp ? window.TravelogApp.getState().activeGuide : null;
    const memoCount = activeGuide?.isPublishedGuide
      ? Number(activeGuide.memoCount || nodes.filter(node => node.type === 'memo' || node.desc).length || 0)
      : userMemoItems.length;
    updateMapText('map-stop-count', String(nodes.length));
    updateMapText('map-memo-count', String(memoCount));
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

  function getLocalizedGuideValue(source, baseKey, fallback = '') {
    return pick(source, baseKey) || source?.[baseKey] || fallback;
  }

  function normalizeActiveGuideStop(stop, index) {
    const hasVideo = stop?.type === 'video' || stop?.memoType === 'video' || (Array.isArray(stop?.linkedVideos) && stop.linkedVideos.length > 0) || (Array.isArray(stop?.linkedVideoFiles) && stop.linkedVideoFiles.length > 0);
    const hasAudio = stop?.type === 'audio' || stop?.memoType === 'audio' || (Array.isArray(stop?.linkedAudios) && stop.linkedAudios.length > 0) || (Array.isArray(stop?.linkedAudioFiles) && stop.linkedAudioFiles.length > 0);
    const hasPhoto = stop?.type === 'photo' || stop?.memoType === 'photo' || (Array.isArray(stop?.linkedPhotos) && stop.linkedPhotos.length > 0) || (Array.isArray(stop?.linkedPhotoFiles) && stop.linkedPhotoFiles.length > 0);
    const rawType = stop?.memoType && stop.memoType !== 'none' ? stop.memoType : stop?.type;
    const type = rawType === 'video' || hasVideo ? 'video' : rawType === 'audio' || hasAudio ? 'audio' : rawType === 'photo' || hasPhoto ? 'photo' : rawType === 'coupon' ? 'coupon' : 'memo';
    const icon = stop?.icon || (type === 'video'
      ? 'fa-solid fa-video'
      : type === 'audio'
        ? 'fa-solid fa-volume-high'
        : type === 'photo'
          ? 'fa-solid fa-image'
          : type === 'coupon'
            ? 'fa-solid fa-ticket'
            : 'fa-solid fa-note-sticky');
    const color = stop?.color || (type === 'video'
      ? 'pin-video'
      : type === 'audio'
        ? 'pin-audio'
        : type === 'photo'
          ? '#34a853'
          : type === 'coupon'
            ? 'pin-coupon'
            : 'pin-memo');
    const nameFallback = t(`메모핀 ${index + 1}`, `Memo Pin ${index + 1}`, `メモピン ${index + 1}`);
    const descFallback = stop?.description || stop?.memoText || '';

    return {
      id: stop?.id || `active-guide-pin-${index + 1}`,
      order: stop?.order || index + 1,
      name: getLocalizedGuideValue(stop, 'name', nameFallback),
      desc: getLocalizedGuideValue(stop, 'desc', descFallback),
      lat: Number(stop?.lat) || 37.5750,
      lng: Number(stop?.lng) || 126.9768,
      type,
      icon,
      color,
      triggerRadius: Number(stop?.triggerRadius) || 20,
      triggerText: getLocalizedGuideValue(stop, 'triggerText', descFallback || nameFallback),
      createdAt: stop?.createdAt || null,
      sourceStop: stop
    };
  }

  function getActivePublishedGuideNodes() {
    const activeGuide = window.TravelogApp ? window.TravelogApp.getState().activeGuide : null;
    if (!activeGuide?.isPublishedGuide || !Array.isArray(activeGuide.stops) || activeGuide.stops.length === 0) {
      return null;
    }
    return activeGuide.stops
      .slice()
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
      .map(normalizeActiveGuideStop);
  }

  function updateActiveGuideHud(activeGuide, nodes) {
    if (!activeGuide) return;
    const guideName = document.getElementById('guide-name');
    const guideDesc = document.getElementById('guide-desc');
    const guideBadge = document.querySelector('.map-guide-badge');
    const guideAvatar = document.getElementById('guide-avatar-img');
    const routeTitle = document.getElementById('map-route-title');
    const routeDesc = document.getElementById('map-route-description');

    const title = pick(activeGuide, 'name') || activeGuide.name || 'Travelog Guide';
    const desc = pick(activeGuide, 'desc') || activeGuide.desc || '';
    const image = activeGuide.representativeImage || activeGuide.bg || '';

    if (guideName) guideName.textContent = title;
    if (guideDesc) guideDesc.textContent = desc;
    if (guideBadge) guideBadge.textContent = activeGuide.badge || (activeGuide.isPublishedGuide ? '오늘의 가이드' : t('추천 가이드', 'Recommended Guide', 'おすすめガイド'));
    if (routeTitle) {
      routeTitle.removeAttribute('data-localize');
      routeTitle.textContent = title;
    }
    if (routeDesc) {
      routeDesc.removeAttribute('data-localize');
      routeDesc.textContent = desc || t(`코스 ${nodes.length}개`, `${nodes.length} stops`, `${nodes.length}コース`);
    }
    if (guideAvatar) {
      if (image) {
        guideAvatar.innerHTML = `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">`;
      } else {
        guideAvatar.innerHTML = '<i class="fa-solid fa-user-astronaut"></i>';
      }
    }
  }

  // Predefined Tour Spots (Minho's Gyeongbokgung Tour)
  const getTourNodes = () => {
    const activePublishedNodes = getActivePublishedGuideNodes();
    if (activePublishedNodes) return activePublishedNodes;

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

    // 1. Leaflet initialization centered dynamically at user's current GPS location
    try {
      const defaultLatLng = [37.5780, 126.9768]; // Gyeongbokgung fallback
      map = L.map('map-container', {
        zoomControl: false,
        preferCanvas: true
      }).setView(defaultLatLng, 16);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Request initial GPS position immediately
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            latestGpsFix = { lat: latitude, lng: longitude, accuracy, updatedAt: Date.now() };
            hasRealGpsLocation = true;
            if (map) {
              map.setView([latitude, longitude], 17);
            }
            if (userMarker) {
              userMarker.setLatLng([latitude, longitude]);
            }
            updateGpsStatus(`${t('내 위치', 'My location', '現在地')}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            updateMapOverview();
          },
          (err) => {
            console.warn('[Travelog Map] Could not get initial GPS location, using Gyeongbokgung:', err);
          },
          { enableHighAccuracy: true, timeout: 3500, maximumAge: 10000 }
        );
      }
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

    // 4. Map click behavior is disabled for custom pin creation. Pins are created only via UI buttons.

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

  function getOrderedCreatorPins() {
    const customPins = window.TravelogApp ? (window.TravelogApp.getState().customCreatedPins || []) : [];
    return [...customPins].sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
  }

  function fitCreatorRoute(pins) {
    if (!map || !pins || pins.length === 0 || typeof L === 'undefined') return;
    const coords = pins.map(pin => [pin.lat, pin.lng]);
    if (coords.length === 1) {
      map.setView(coords[0], Math.max(map.getZoom(), 17));
      return;
    }
    map.fitBounds(L.latLngBounds(coords), { padding: [44, 128], maxZoom: 17 });
  }

  function connectCreatorPins(pins) {
    const orderedPins = pins && pins.length ? pins : getOrderedCreatorPins();
    if (orderedPins.length < 2) return false;
    creatorRouteConnected = true;
    renderTour();
    fitCreatorRoute(orderedPins);
    return true;
  }

  function ensureCreatorPreviewOverlay() {
    const mapTab = document.getElementById('map-tab');
    if (!mapTab) return null;

    let overlay = document.getElementById('creator-guide-preview-ui');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'creator-guide-preview-ui';
    overlay.style.cssText = 'display:none; pointer-events:none;';
    overlay.innerHTML = `
      <div id="creator-preview-top-card" class="glass-panel" style="position:absolute; top:14px; left:50%; transform:translateX(-50%); z-index:1700; width:min(92vw, 560px); pointer-events:auto; padding:12px 14px; display:flex; align-items:center; gap:12px; border-radius:20px; background:rgba(255,255,255,0.92);">
        <div id="creator-preview-cover" style="width:64px; height:50px; border-radius:14px; flex-shrink:0; background:linear-gradient(135deg, rgba(112,162,183,.25), rgba(175,212,153,.25)); background-size:cover; background-position:center; border:1px solid var(--glass-border);"></div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
            <h3 id="creator-preview-title" style="font-size:15px; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">가이드 미리보기</h3>
            <button id="creator-preview-close" class="btn-circle" type="button" aria-label="가이드 미리보기 닫기" style="width:28px; height:28px; font-size:12px; flex-shrink:0;"><img class="popup-close-icon" src="assets/icons/ui/closed.svg" alt="" aria-hidden="true"></button>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; font-size:11px; color:var(--text-secondary);">
            <span>코스 <strong id="creator-preview-course-count">0</strong></span>
            <span>메모 <strong id="creator-preview-memo-count">0</strong></span>
            <span>쿠폰 <strong id="creator-preview-coupon-count">0</strong></span>
          </div>
        </div>
      </div>
      <div id="creator-preview-bottom-card" class="glass-panel" style="position:absolute; left:50%; bottom:108px; transform:translateX(-50%); z-index:1700; width:min(92vw, 420px); pointer-events:auto; padding:12px; border-radius:24px; display:flex; align-items:center; gap:10px; justify-content:space-between; background:rgba(255,255,255,0.92);">
        <div style="min-width:0; flex:1;">
          <div id="creator-preview-pin-title" style="font-size:13px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">플레이 버튼을 눌러 코스를 확인하세요</div>
          <div id="creator-preview-pin-desc" style="font-size:11px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">한 번 누를 때마다 다음 핀으로 이동합니다.</div>
        </div>
        <button id="creator-preview-next-btn" class="btn-rect" type="button" style="justify-content:center; background:var(--grad-pink-purple); border-radius:18px; padding:10px 14px; flex-shrink:0;"><i class="fa-solid fa-play"></i> 플레이</button>
      </div>
    `;
    mapTab.appendChild(overlay);

    const closeBtn = overlay.querySelector('#creator-preview-close');
    const nextBtn = overlay.querySelector('#creator-preview-next-btn');
    if (closeBtn) closeBtn.addEventListener('click', stopCreatorGuidePreview);
    if (nextBtn) nextBtn.addEventListener('click', advanceCreatorGuidePreview);
    return overlay;
  }

  function updateCreatorPreviewOverlay() {
    const overlay = ensureCreatorPreviewOverlay();
    if (!overlay || !creatorPreviewPackage) return;
    const pins = creatorPreviewPackage.pins || [];
    const cover = overlay.querySelector('#creator-preview-cover');
    const title = overlay.querySelector('#creator-preview-title');
    const courseCount = overlay.querySelector('#creator-preview-course-count');
    const memoCount = overlay.querySelector('#creator-preview-memo-count');
    const couponCount = overlay.querySelector('#creator-preview-coupon-count');
    const pinTitle = overlay.querySelector('#creator-preview-pin-title');
    const pinDesc = overlay.querySelector('#creator-preview-pin-desc');
    const nextBtn = overlay.querySelector('#creator-preview-next-btn');

    if (cover) cover.style.backgroundImage = creatorPreviewPackage.representativeImage ? `url('${creatorPreviewPackage.representativeImage}')` : '';
    if (title) title.textContent = creatorPreviewPackage.tourName || '가이드 미리보기';
    if (courseCount) courseCount.textContent = String(pins.length);
    if (memoCount) memoCount.textContent = String((creatorPreviewPackage.audioFiles || []).length + (creatorPreviewPackage.videoFiles || []).length + (creatorPreviewPackage.photoFiles || []).length + (creatorPreviewPackage.textFiles || []).length);
    if (couponCount) couponCount.textContent = String((creatorPreviewPackage.eventCoupons || []).length);

    const currentPin = pins[creatorPreviewIndex];
    if (pinTitle) {
      pinTitle.textContent = currentPin ? `${currentPin.order}. ${currentPin.nameKo || currentPin.nameEn || '코스 핀'}` : '플레이 버튼을 눌러 코스를 확인하세요';
    }
    if (pinDesc) {
      pinDesc.textContent = currentPin ? (currentPin.description || '메모 없음') : '한 번 누를 때마다 다음 핀으로 이동합니다.';
    }
    if (nextBtn) {
      nextBtn.innerHTML = creatorPreviewIndex < 0 ? '<i class="fa-solid fa-play"></i> 플레이' : '<i class="fa-solid fa-forward-step"></i> 다음 핀';
    }
  }

  function startCreatorGuidePreview(packageData) {
    creatorPreviewPackage = packageData || null;
    creatorPreviewIndex = -1;
    creatorRouteConnected = true;
    const overlay = ensureCreatorPreviewOverlay();
    if (overlay) overlay.style.display = 'block';
    renderTour();
    fitCreatorRoute(getOrderedCreatorPins());
    updateCreatorPreviewOverlay();
    window.TravelogApp?.showToast(t('가이드 미리보기를 시작합니다.', 'Starting guide preview.', 'ガイドプレビューを開始します。'));
  }

  function stopCreatorGuidePreview() {
    const overlay = document.getElementById('creator-guide-preview-ui');
    if (overlay) overlay.style.display = 'none';
    creatorPreviewPackage = null;
    creatorPreviewIndex = -1;
  }

  function advanceCreatorGuidePreview() {
    if (!creatorPreviewPackage || !Array.isArray(creatorPreviewPackage.pins) || creatorPreviewPackage.pins.length === 0) return;
    const pins = creatorPreviewPackage.pins;
    creatorPreviewIndex = (creatorPreviewIndex + 1) % pins.length;
    const pin = pins[creatorPreviewIndex];
    if (userMarker && map) {
      userMarker.setLatLng([pin.lat, pin.lng]);
      map.panTo([pin.lat, pin.lng]);
    }
    const marker = customCreatedMarkers[pin.id];
    if (marker && marker.openPopup) marker.openPopup();

    // Preview must behave like an actual tour: open/play the memo linked to this pin.
    const previewNode = normalizeActiveGuideStop(pin, creatorPreviewIndex);
    if (previewNode) {
      openPublishedGuideMemoPopup(previewNode);
    }
    updateCreatorPreviewOverlay();
  }

  function renderTour(options = {}) {
    markersLayer.clearLayers();
    customCreatedMarkers = {};
    if (routePolyline) {
      map.removeLayer(routePolyline);
    }

    const mapMode = window.TravelogApp ? window.TravelogApp.getState().mapMode : 'explore';
    const isCreatorMode = (mapMode === 'create');

    if (isCreatorMode) {
      // 1. Draw ONLY Custom Created Pins on the map
      const customPins = getOrderedCreatorPins();
      const routeCoords = [];

      customPins.forEach((pin, index) => {
        routeCoords.push([pin.lat, pin.lng]);

        const marker = L.marker([pin.lat, pin.lng], {
          icon: createHtmlIcon('fa-solid fa-location-crosshairs', pin.color)
        });

        const displayName = pick(pin, 'name') || pin.name || `Custom Pin #${index + 1}`;
        const popupContent = `
          <div style="color:var(--bg-primary); padding:4px;">
            <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color: #373737 !important;">${escapeHtml(displayName)}</h4>
            <p style="margin:0; font-size:12px; line-height:1.4; color:#666;">${escapeHtml(pin.description || '')}</p>
          </div>
        `;
        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
        customCreatedMarkers[pin.id] = marker; // Sync reference
        applyColorFilterToMarker(marker, pin.color); // Color rotation
      });

      // Draw customized creator route polyline only after the user connects pins.
      if (creatorRouteConnected && routeCoords.length > 1) {
        routePolyline = L.polyline(routeCoords, {
          color: '#ff2e63',
          weight: 5,
          opacity: 0.92,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
      }
    } else {
      // 2. Normal Tour Mode: Draw baseline Gyeongbokgung Tour nodes
      const appState = window.TravelogApp ? window.TravelogApp.getState() : null;
      const activeGuide = appState?.activeGuide || null;
      if (mapMode === 'location' && (!activeGuide || appState?.guideRunActive !== true)) {
        const listEl = document.getElementById('tour-stops-list');
        if (listEl) listEl.innerHTML = '';
        updateMapOverview();
        return;
      }
      const nodes = getTourNodes();
      if (activeGuide) {
        updateActiveGuideHud(activeGuide, nodes);
      }
      const routeCoords = nodes.map(node => [node.lat, node.lng]);

      if (activeGuide?.isPublishedGuide) {
        const locationGroups = groupNodesByLocation(nodes);
        locationGroups.forEach(group => {
          const primary = group.primary;
          const marker = L.marker([group.lat, group.lng], {
            icon: group.count > 1
              ? createCountIcon(group.count, primary.color)
              : createHtmlIcon(primary.icon, primary.color)
          });

          if (group.count > 1) {
            marker.bindPopup(buildPublishedGuideMemoListPopupContent(group.nodes));
            marker.on('popupopen', () => bindPublishedGuideMemoListButtons(marker, group.nodes));
          } else {
            marker.bindPopup(`
              <div style="color:var(--bg-primary); padding:4px; min-width:190px;">
                <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color:#373737 !important;">${escapeHtml(primary.name)}</h4>
                <p style="margin:0 0 8px 0; font-size:12px; line-height:1.4; color:#666;">${escapeHtml(primary.desc || primary.triggerText || '')}</p>
                <button type="button" class="btn-rect" data-single-guide-memo="true" style="width:100%;justify-content:center;padding:7px 10px;border-radius:10px;font-size:12px;">${t('메모 열기', 'Open memo', 'メモを開く')}</button>
              </div>
            `);
            marker.on('popupopen', () => {
              const popupEl = marker.getPopup()?.getElement();
              const btn = popupEl?.querySelector('[data-single-guide-memo]');
              if (btn) btn.addEventListener('click', () => openPublishedGuideMemoPopup(primary), { once: true });
            });
          }

          markersLayer.addLayer(marker);
          if (group.count === 1) applyColorFilterToMarker(marker, primary.color);
        });
      } else {
        nodes.forEach(node => {
          const marker = L.marker([node.lat, node.lng], {
            icon: createHtmlIcon(node.icon, node.color)
          });

          const popupContent = `
            <div style="color:var(--bg-primary); padding:4px;">
              <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color: #373737 !important;">${node.name}</h4>
              <p style="margin:0; font-size:12px; line-height:1.4; color:#666;">${node.desc}</p>
            </div>
          `;
          marker.bindPopup(popupContent);
          markersLayer.addLayer(marker);
          applyColorFilterToMarker(marker, node.color); // Color rotation
        });
      }

      // Draw Polyline route
      routePolyline = L.polyline(routeCoords, {
        color: activeGuide?.isPublishedGuide ? '#ff2e63' : '#70A2B7',
        weight: 5,
        opacity: activeGuide?.isPublishedGuide ? 0.92 : 0.8,
        dashArray: activeGuide?.isPublishedGuide ? null : '8, 8',
        lineJoin: 'round',
        lineCap: 'round'
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
      if (options && options.fitToGuide === true && activeGuide?.isPublishedGuide && routeCoords.length > 0) {
        focusGuideRoute(routeCoords);
      }
    }
    updateMapOverview();
  }

  function focusGuideRoute(routeCoords) {
    if (!map || !Array.isArray(routeCoords) || routeCoords.length === 0) return;
    const validCoords = routeCoords
      .map(coord => [Number(coord[0]), Number(coord[1])])
      .filter(coord => Number.isFinite(coord[0]) && Number.isFinite(coord[1]));

    if (!validCoords.length) return;

    window.setTimeout(() => {
      if (validCoords.length === 1) {
        map.setView(validCoords[0], 17);
        return;
      }
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, {
        padding: [52, 52],
        maxZoom: 17
      });
    }, 80);
  }

  function startGuideRun(activeGuide = null) {
    if (window.TravelogApp && activeGuide) {
      window.TravelogApp.getState().activeGuide = activeGuide;
    }
    if (window.TravelogApp) {
      window.TravelogApp.getState().mapMode = 'run';
    }
    triggeredNodes.clear();
    renderTour({ fitToGuide: true });
    renderUserMemoMarkers();
    invalidateMapSoon();
  }

  function invalidateMapSoon() {
    if (!map) return;
    window.setTimeout(() => map.invalidateSize(), 60);
    window.setTimeout(() => map.invalidateSize(), 240);
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
        <div class="memo-popup" style="padding:4px;">
          <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color: #373737 !important;">${t('내 위치 메모', 'My Location Memo', '現在地メモ')}</h4>
          <p style="margin:0 0 6px 0; font-size:12px; line-height:1.4; color:#666;">${escapeHtml(memo.text)}</p>
          <small style="font-size:10px; color:#aaa; display:block; margin-bottom:8px;">${memo.lat.toFixed(5)}, ${memo.lng.toFixed(5)}${accuracyText}<br>${formatDateTime(memo.createdAt)}</small>
          <button class="memo-delete-btn" style="padding:4px 8px; font-size:11px; background:rgba(255,50,50,0.1); border:1px solid rgba(255,50,50,0.2); border-radius:4px; color:var(--accent-pink); cursor:pointer;" onclick="TravelogMapModule.deleteMemo('${memo.id}')">${t('삭제', 'Delete', '削除')}</button>
        </div>
      `);
      memoMarkersLayer.addLayer(marker);
      applyColorFilterToMarker(marker, 'pin-memo');
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
    const activeGuide = window.TravelogApp ? window.TravelogApp.getState().activeGuide : null;

    if (activeGuide?.isPublishedGuide) {
      groupNodesByLocation(nodes).forEach(group => {
        if (triggeredNodes.has(group.id)) return;
        const dist = getDistanceInMeters(lat, lng, group.lat, group.lng);
        if (dist <= group.triggerRadius) {
          triggeredNodes.add(group.id);
          if (group.count > 1) {
            window.TravelogApp.showToast(t(`이 위치에 메모 ${group.count}개가 있습니다.`, `There are ${group.count} memos here.`, `この位置にメモが${group.count}件あります。`));
            openPublishedGuideMemoListPopup(group.nodes);
          } else {
            triggerNodeEvent(group.primary);
          }
        }
      });
      return;
    }

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

  function getNodeMemoText(node) {
    const source = node?.sourcePin || node?.sourceStop || {};
    const raw = source.memoText || source.text || source.description || source.descKo || node.desc || node.triggerText || '';
    if ((node?.type === 'video' || node?.type === 'audio') && looksLikeMemoFileName(raw)) {
      return '';
    }
    return raw;
  }

  function getNodeMediaInfo(node, type) {
    const source = node?.sourcePin || node?.sourceStop || {};
    const listKey = type === 'video' ? 'linkedVideoFiles' : type === 'photo' ? 'linkedPhotoFiles' : 'linkedAudioFiles';
    const fallbackListKey = type === 'video' ? 'linkedVideos' : type === 'photo' ? 'linkedPhotos' : 'linkedAudios';
    const urlKey = type === 'video' ? 'videoUrl' : type === 'photo' ? 'photoUrl' : 'audioUrl';
    const dataKey = type === 'video' ? 'videoDataUrl' : type === 'photo' ? 'photoDataUrl' : 'audioDataUrl';
    const objectKey = type === 'video' ? 'videoObjectUrl' : type === 'photo' ? 'photoObjectUrl' : 'audioObjectUrl';
    const fallbackMimeType = type === 'video' ? 'video/webm' : type === 'photo' ? 'image/png' : 'audio/webm';

    const sourcePool = [node || {}, source || {}];

    function normalizeCandidateUrl(rawValue, mimeType = fallbackMimeType) {
      if (!rawValue) return '';
      const raw = String(rawValue);
      if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http') || raw.startsWith('assets/')) return raw;
      if (raw.includes('/') && /\.(webm|mp4|m4a|mp3|wav|ogg|mov|png|jpe?g|webp|gif)$/i.test(raw)) return raw;
      if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 80) return `data:${mimeType};base64,${raw.replace(/\s+/g, '')}`;
      return '';
    }

    function makeInfo(rawValue, owner = {}, mimeType = fallbackMimeType) {
      const url = normalizeCandidateUrl(rawValue, mimeType || fallbackMimeType);
      if (!url) return null;
      return {
        url,
        mimeType: mimeType || owner.mimeType || fallbackMimeType,
        fileName: owner.fileName || owner.name || '',
        title: owner.title || owner.displayTitle || owner.memoTitle || ''
      };
    }

    for (const owner of sourcePool) {
      const mimeType = owner.mimeType || fallbackMimeType;
      const directBase64 = owner.base64 || owner.data || '';
      const direct = owner[dataKey] || owner[objectKey] || owner[urlKey] || owner.mediaUrl || owner.dataUrl || owner.objectUrl || owner.url || '';
      const info = makeInfo(direct || directBase64, owner, mimeType);
      if (info) return info;
    }

    const mediaList = [];
    sourcePool.forEach(owner => {
      if (Array.isArray(owner[listKey])) mediaList.push(...owner[listKey]);
      if (Array.isArray(owner.mediaFiles)) mediaList.push(...owner.mediaFiles.filter(item => !item?.type || item.type === type));
    });

    for (const item of mediaList) {
      if (!item) continue;
      const itemMimeType = item.mimeType || fallbackMimeType;
      let itemUrl = item.dataUrl || item[`${type}DataUrl`] || item.objectUrl || item[`${type}ObjectUrl`] || item.url || item.mediaUrl || item.rawUrl || '';
      if (!itemUrl && item.blob instanceof Blob) {
        try { itemUrl = URL.createObjectURL(item.blob); } catch (_) {}
      }
      if (!itemUrl && (item.base64 || item.data)) itemUrl = item.base64 || item.data;
      const info = makeInfo(itemUrl, item, itemMimeType);
      if (info) return info;
    }

    // If only file names exist, keep them as metadata but do not pretend they are playable URLs.
    for (const owner of sourcePool) {
      const names = Array.isArray(owner[fallbackListKey]) ? owner[fallbackListKey] : [];
      if (names.length > 0) {
        return {
          url: '',
          mimeType: fallbackMimeType,
          fileName: names[0] || '',
          title: owner.memoTitle || owner.title || ''
        };
      }
    }

    return null;
  }

  function renderPublishedGuideMemoMedia(node, mediaEl) {
    if (!mediaEl) return;
    mediaEl.innerHTML = '';

    if (node.type === 'photo') {
      const media = getNodeMediaInfo(node, 'photo');
      if (media && media.url) {
        mediaEl.innerHTML = `
          <img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.title || '사진 메모')}" style="width:100%; max-height:320px; object-fit:contain; border-radius:14px; background:#f5f5f5; margin:4px 0 10px 0;" data-travelog-memo-media="photo">
        `;
        return;
      }
      mediaEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);border:1px dashed var(--glass-border);border-radius:12px;padding:10px;margin:4px 0 10px 0;">${t('사진 메모 데이터가 아직 앱에 없습니다. 저장/출간 전에 편집한 사진 데이터가 보존되어야 표시됩니다.', 'Photo memo data is not available in the app yet. The edited photo data must be preserved before saving/publishing.', '写真メモのデータがまだアプリ内にありません。保存・公開前に編集済み写真データを保持する必要があります。')}</div>`;
      return;
    }

    if (node.type === 'video') {
      const media = getNodeMediaInfo(node, 'video');
      if (media && media.url && !String(media.mimeType || '').includes('text/plain')) {
        mediaEl.innerHTML = `
          <video controls autoplay playsinline preload="auto" style="width:100%; max-height:280px; border-radius:14px; background:#000; margin:4px 0 10px 0;" data-travelog-memo-media="video">
            <source src="${escapeHtml(media.url)}" type="${escapeHtml(media.mimeType || 'video/webm')}">
          </video>
        `;
        return;
      }
      mediaEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);border:1px dashed var(--glass-border);border-radius:12px;padding:10px;margin:4px 0 10px 0;">${t('영상 메모 파일 데이터가 아직 앱에 없습니다. 저장/출간 전에 녹화한 원본 영상 데이터가 보존되어야 재생됩니다.', 'Video memo media data is not available in the app yet. The original recorded video data must be preserved before saving/publishing.', '動画メモのデータがまだアプリ内にありません。保存・公開前に録画データを保持する必要があります。')}</div>`;
      return;
    }

    if (node.type === 'audio') {
      const media = getNodeMediaInfo(node, 'audio');
      if (media && media.url && !String(media.mimeType || '').includes('text/plain')) {
        mediaEl.innerHTML = `
          <audio controls autoplay preload="auto" style="width:100%; margin:4px 0 10px 0;" data-travelog-memo-media="audio">
            <source src="${escapeHtml(media.url)}" type="${escapeHtml(media.mimeType || 'audio/webm')}">
          </audio>
        `;
        return;
      }
      mediaEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);border:1px dashed var(--glass-border);border-radius:12px;padding:10px;margin:4px 0 10px 0;">${t('음성 메모 파일 데이터가 아직 앱에 없습니다. 저장/출간 전에 녹음한 원본 음성 데이터가 보존되어야 재생됩니다.', 'Audio memo media data is not available in the app yet. The original recorded audio data must be preserved before saving/publishing.', '音声メモのデータがまだアプリ内にありません。保存・公開前に録音データを保持する必要があります。')}</div>`;
      return;
    }
  }

  function getNodeMediaTitle(node) {
    const source = node?.sourcePin || node?.sourceStop || {};
    const preferredType = node?.type === 'video' ? 'video' : node?.type === 'audio' ? 'audio' : node?.type === 'photo' ? 'photo' : '';
    const keys = preferredType === 'video'
      ? ['linkedVideoFiles', 'linkedAudioFiles', 'linkedPhotoFiles']
      : preferredType === 'audio'
        ? ['linkedAudioFiles', 'linkedVideoFiles', 'linkedPhotoFiles']
        : preferredType === 'photo'
          ? ['linkedPhotoFiles', 'linkedVideoFiles', 'linkedAudioFiles']
          : ['linkedVideoFiles', 'linkedAudioFiles', 'linkedPhotoFiles'];
    for (const key of keys) {
      const list = Array.isArray(source[key]) ? source[key] : [];
      const item = list.find(entry => entry && (entry.title || entry.displayTitle || entry.memoTitle));
      if (item) return String(item.title || item.displayTitle || item.memoTitle || '').trim();
    }
    return String(source.memoTitle || source.title || source.displayTitle || '').trim();
  }

  function getNodeDisplayMemoTitle(node, index = 0) {
    return getNodeMediaTitle(node) || node?.name || `메모 ${index + 1}`;
  }

  function buildPublishedGuideMemoListPopupContent(nodes) {
    const safeNodes = Array.isArray(nodes) ? nodes : [];
    return `
      <div style="color:var(--bg-primary); padding:6px; min-width:220px;">
        <h4 style="margin:0 0 8px 0; font-size:14px; font-weight:800; color:#373737 !important;">${t('이 위치의 메모 목록', 'Memos at this location', 'この位置のメモ一覧')}</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${safeNodes.map((node, index) => `
            <button type="button" data-guide-memo-index="${index}" style="width:100%; text-align:left; border:1px solid var(--glass-border); background:white; border-radius:10px; padding:8px 9px; cursor:pointer; color:#373737;">
              <strong style="display:block; font-size:12px;">${escapeHtml(node.order || index + 1)}. ${escapeHtml(getNodeDisplayMemoTitle(node, index))}</strong>
              <span style="display:block; margin-top:3px; font-size:11px; color:#666;">${escapeHtml(getMemoTypeLabel(node.type))}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function bindPublishedGuideMemoListButtons(marker, nodes) {
    const popupEl = marker?.getPopup?.()?.getElement?.();
    if (!popupEl) return;
    popupEl.querySelectorAll('[data-guide-memo-index]').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-guide-memo-index'));
        const node = nodes[index];
        if (node) {
          marker.closePopup();
          openPublishedGuideMemoPopup(node);
        }
      });
    });
  }

  function openPublishedGuideMemoListPopup(nodes) {
    const safeNodes = Array.isArray(nodes) ? nodes : [];
    let modal = document.getElementById('published-guide-memo-list-popup');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'published-guide-memo-list-popup';
      modal.className = 'profile-manager-modal active';
      modal.style.zIndex = '3350';
      modal.innerHTML = `
        <div class="profile-manager-card glass-panel" style="max-width:480px;width:92%;padding:24px;position:relative;">
          <button class="btn-circle" id="published-guide-memo-list-close-btn" type="button" aria-label="가이드 메모 목록 닫기" style="position:absolute;top:12px;right:12px;width:34px;height:34px;font-size:14px;"><img class="popup-close-icon" src="assets/icons/ui/closed.svg" alt="" aria-hidden="true"></button>
          <div style="padding-right:42px;">
            <span style="display:inline-block;font-size:11px;font-weight:900;color:white;background:var(--color-ocean);border-radius:999px;padding:4px 9px;margin-bottom:8px;">MEMO LIST</span>
            <h2 class="gradient-text" style="font-size:20px;margin:0 0 8px 0;">${t('이 위치의 메모 목록', 'Memos at this location', 'この位置のメモ一覧')}</h2>
            <p style="font-size:12px;color:var(--text-secondary);margin:0 0 12px 0;">${t('열고 싶은 메모를 선택하세요.', 'Choose a memo to open.', '開きたいメモを選んでください。')}</p>
            <div id="published-guide-memo-list-items" style="display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto;"></div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#published-guide-memo-list-close-btn').addEventListener('click', () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
    }

    const itemsEl = modal.querySelector('#published-guide-memo-list-items');
    if (itemsEl) {
      itemsEl.innerHTML = safeNodes.map((node, index) => `
        <button type="button" data-guide-memo-modal-index="${index}" style="width:100%;text-align:left;background:white;border:1px solid var(--glass-border);border-radius:14px;padding:10px 12px;cursor:pointer;">
          <strong style="display:block;color:#373737;font-size:13px;">${escapeHtml(node.order || index + 1)}. ${escapeHtml(getNodeDisplayMemoTitle(node, index))}</strong>
          <span style="display:block;margin-top:4px;color:var(--text-secondary);font-size:11px;">${escapeHtml(getMemoTypeLabel(node.type))}</span>
        </button>
      `).join('');
      itemsEl.querySelectorAll('[data-guide-memo-modal-index]').forEach(button => {
        button.addEventListener('click', () => {
          const index = Number(button.getAttribute('data-guide-memo-modal-index'));
          const node = safeNodes[index];
          if (!node) return;
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
          openPublishedGuideMemoPopup(node);
        });
      });
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function pauseMemoModalMedia(modal) {
    if (!modal) return;
    modal.querySelectorAll('video, audio').forEach(media => {
      try { media.pause(); } catch (_) {}
    });
  }

  function playMemoModalMedia(modal) {
    if (!modal) return;
    const media = modal.querySelector('video, audio');
    if (!media) return;
    try { media.currentTime = 0; } catch (_) {}
    const playPromise = media.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        window.TravelogApp?.showToast(t('브라우저 정책상 재생 버튼을 눌러 메모를 시작해 주세요.', 'Tap play to start the memo.', '再生ボタンを押してメモを開始してください。'));
      });
    }
  }

  function openPublishedGuideMemoPopup(node) {
    let modal = document.getElementById('published-guide-memo-popup');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'published-guide-memo-popup';
      modal.className = 'profile-manager-modal active';
      modal.style.zIndex = '3400';
      modal.innerHTML = `
        <div class="profile-manager-card glass-panel" style="max-width:520px;width:92%;padding:24px;position:relative;">
          <button class="btn-circle" id="published-guide-memo-close-btn" type="button" aria-label="가이드 메모 닫기" style="position:absolute;top:12px;right:12px;width:34px;height:34px;font-size:14px;"><img class="popup-close-icon" src="assets/icons/ui/closed.svg" alt="" aria-hidden="true"></button>
          <div style="padding-right:42px;">
            <span id="published-guide-memo-type" style="display:inline-block;font-size:11px;font-weight:900;color:white;background:var(--color-ocean);border-radius:999px;padding:4px 9px;margin-bottom:8px;">GUIDE MEMO</span>
            <h2 id="published-guide-memo-title" class="gradient-text" style="font-size:20px;margin:0 0 8px 0;">메모핀</h2>
            <div id="published-guide-memo-media"></div>
            <p id="published-guide-memo-body" style="font-size:13px;color:var(--text-secondary);white-space:pre-line;line-height:1.65;margin:0 0 12px 0;"></p>
            <small id="published-guide-memo-coords" style="display:block;color:var(--text-muted);font-size:11px;"></small>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#published-guide-memo-close-btn').addEventListener('click', () => {
        pauseMemoModalMedia(modal);
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
    }
    const titleEl = modal.querySelector('#published-guide-memo-title');
    const mediaEl = modal.querySelector('#published-guide-memo-media');
    const bodyEl = modal.querySelector('#published-guide-memo-body');
    const coordsEl = modal.querySelector('#published-guide-memo-coords');
    const typeEl = modal.querySelector('#published-guide-memo-type');
    if (titleEl) titleEl.textContent = getNodeDisplayMemoTitle(node, 0) || '메모핀';
    renderPublishedGuideMemoMedia(node, mediaEl);
    if (bodyEl) {
      const memoText = getNodeMemoText(node);
      bodyEl.textContent = memoText || (node.type === 'video'
        ? t('영상 메모를 재생합니다.', 'Playing video memo.', '動画メモを再生します。')
        : node.type === 'audio'
          ? t('음성 메모를 재생합니다.', 'Playing audio memo.', '音声メモを再生します。')
          : node.type === 'photo'
            ? t('사진 메모를 표시합니다.', 'Showing photo memo.', '写真メモを表示します。')
            : t('등록된 메모 내용이 없습니다.', 'No memo content is registered.', '登録されたメモ内容がありません。'));
    }
    if (coordsEl) coordsEl.textContent = `${Number(node.lat).toFixed(5)}, ${Number(node.lng).toFixed(5)}`;
    if (typeEl) typeEl.textContent = node.type === 'audio' ? '음성 메모' : node.type === 'video' ? '영상 메모' : node.type === 'photo' ? '사진 메모' : node.type === 'coupon' ? '쿠폰 메모' : '텍스트 메모';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => playMemoModalMedia(modal), 80);
  }

  function triggerNodeEvent(node) {
    window.TravelogApp.showToast(`${node.name}: ${node.triggerText}`);
    const activeGuide = window.TravelogApp ? window.TravelogApp.getState().activeGuide : null;
    if (activeGuide?.isPublishedGuide) {
      openPublishedGuideMemoPopup(node);
      return;
    }

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
  function addNewCreatorPin(lat, lng, pinName = '', description = '') {
    // Add coordinates to state. The pin name must come from the creation popup,
    // not from the temporary "Custom Pin #n" fallback.
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const newIndex = customPins.length + 1;
    const pinId = `custom-pin-${Date.now()}`;
    const fallbackName = t(`메모핀 ${newIndex}`, `Memo Pin ${newIndex}`, `メモピン ${newIndex}`);
    const cleanName = String(pinName || '').trim() || fallbackName;
    const cleanDescription = String(description || '').trim();
    
    const newPin = {
      id: pinId,
      name: cleanName,
      nameEn: cleanName,
      nameKo: cleanName,
      nameJa: cleanName,
      lat: lat,
      lng: lng,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      sortOrder: customPins.length,
      color: '#ff2e63',
      description: cleanDescription
    };
    
    customPins.push(newPin);
    
    // Draw Pin on Map
    const marker = L.marker([lat, lng], {
      icon: createHtmlIcon('fa-solid fa-location-crosshairs', newPin.color)
    }).bindPopup(`<b>${escapeHtml(cleanName)}</b><br>${escapeHtml(cleanDescription || '')}<br>Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    
    markersLayer.addLayer(marker);
    customCreatedMarkers[pinId] = marker;
    applyColorFilterToMarker(marker, newPin.color);
    
    // Notify Creator Studio
    if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.renderCoordinatesList === 'function') {
      window.TravelogCreatorModule.renderCoordinatesList();
    }
    renderTour();
    
    window.TravelogApp.showToast(t(`새 핀 [${cleanName}]이 추가되었습니다.`, `New pin [${cleanName}] added.`, `新しいピン［${cleanName}］を追加しました。`));
  }

  function clearCreatorPins() {
    window.TravelogApp.getState().customCreatedPins = [];
    creatorRouteConnected = false;
    stopCreatorGuidePreview();
    for (const pinId in customCreatedMarkers) {
      if (customCreatedMarkers[pinId]) {
        markersLayer.removeLayer(customCreatedMarkers[pinId]);
      }
    }
    customCreatedMarkers = {};
    renderTour(); // Redraw baseline tour
  }

  function updateCreatorPinColor(pinId, newColor) {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    const pin = customPins.find(p => p.id === pinId);
    if (pin) {
      pin.color = newColor;
    }
    const marker = customCreatedMarkers[pinId];
    if (marker) {
      marker.setIcon(createHtmlIcon('fa-solid fa-location-crosshairs', newColor));
      applyColorFilterToMarker(marker, newColor);
    }
  }

  function refreshCreatorPinPopup(pinId) {
    const customPins = window.TravelogApp?.getState?.().customCreatedPins || [];
    const pin = customPins.find(p => String(p.id) === String(pinId));
    const marker = customCreatedMarkers[pinId];
    if (!pin || !marker) return;
    const name = pick(pin, 'name') || pin.name || pin.nameKo || 'Custom Pin';
    marker.bindPopup(`
      <div style="color:var(--bg-primary); padding:4px;">
        <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color:#373737 !important;">${escapeHtml(name)}</h4>
        <p style="margin:0; font-size:12px; line-height:1.4; color:#666;">${escapeHtml(pin.description || '')}</p>
        <small style="font-size:10px;color:#888;">${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}</small>
      </div>
    `);
  }

  function updateCreatorPinName(pinId, nextName) {
    const customPins = window.TravelogApp?.getState?.().customCreatedPins || [];
    const pin = customPins.find(p => String(p.id) === String(pinId));
    if (pin) {
      const name = String(nextName || '').trim() || 'Custom Pin';
      pin.name = name;
      pin.nameKo = name;
      pin.nameEn = name;
      pin.nameJa = name;
    }
    refreshCreatorPinPopup(pinId);
  }

  function removeCreatorPin(pinId) {
    const customPins = window.TravelogApp.getState().customCreatedPins;
    window.TravelogApp.getState().customCreatedPins = customPins.filter(p => p.id !== pinId);
    
    const marker = customCreatedMarkers[pinId];
    if (marker) {
      markersLayer.removeLayer(marker);
      delete customCreatedMarkers[pinId];
    }
    
    // Keep user-edited pin names; only fill missing names after deletion.
    window.TravelogApp.getState().customCreatedPins.forEach((pin, idx) => {
      if (!pin.nameKo && !pin.nameEn && !pin.nameJa && !pin.name) {
        pin.nameEn = `Custom Pin #${idx + 1}`;
        pin.nameKo = `커스텀 핀 #${idx + 1}`;
        pin.nameJa = `カスタムピン #${idx + 1}`;
      }
    });

    if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.renderCoordinatesList === 'function') {
      window.TravelogCreatorModule.renderCoordinatesList();
    }
    renderTour();
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
    renderTour: renderTour,
    startGuideRun: startGuideRun,
    addNewCreatorPin: addNewCreatorPin,
    clearCreatorPins: clearCreatorPins,
    updateCreatorPinColor: updateCreatorPinColor,
    updateCreatorPinName: updateCreatorPinName,
    refreshCreatorPinPopup: refreshCreatorPinPopup,
    removeCreatorPin: removeCreatorPin,
    connectCreatorPins: connectCreatorPins,
    startCreatorGuidePreview: startCreatorGuidePreview,
    stopCreatorGuidePreview: stopCreatorGuidePreview,
    openPublishedGuideMemoPopup: openPublishedGuideMemoPopup,
    openPublishedGuideMemoListPopup: openPublishedGuideMemoListPopup,
    centerToUser: () => {
      if (map) {
        const loc = getCurrentLatLng();
        map.setView([loc.lat, loc.lng], 17);
      }
    },
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

// Attach globally so app.js, creator.js, and inline map controls can use the map module.
window.TravelogMapModule = TravelogMapModule;
