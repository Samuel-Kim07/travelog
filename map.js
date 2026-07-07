// ==========================================
// Travelog Map Module
// ==========================================

const TravelogMapModule = (() => {
  let map;
  let markersLayer;
  let creatorPinsLayer;
  let routePolyline;
  let userMarker;
  let currentUserLocation = { lat: 37.5750, lng: 126.9768 };
  let controlsBound = false;
  let fallbackMode = false;

  let isSimulating = false;
  let simIntervalId = null;
  let simPath = [];
  let simIndex = 0;

  // Track triggered places in this walk session
  const triggeredNodes = new Set();

  // Custom marker icons using FontAwesome & CSS
  function createHtmlIcon(iconClass, colorClass) {
    if (!window.L) return null;

    return L.divIcon({
      html: `<div class="custom-pin ${colorClass}" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%;"><i class="${iconClass}"></i></div>`,
      className: 'custom-leaflet-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  // Predefined Tour Spots (Minho's Gyeongbokgung Tour)
  const getTourNodes = () => {
    const lang = window.TravelogApp ? window.TravelogApp.getLanguage() : 'ko';
    return [
      {
        id: 'node-gwanghwamun',
        name: lang === 'ko' ? '광화문 (소개 영상 지점)' : 'Gwanghwamun Gate (Intro Video)',
        desc: lang === 'ko' ? '경복궁의 남쪽 정문으로 왕의 행차가 이루어지던 곳입니다.' : 'The main and southern gate of Gyeongbokgung Palace.',
        lat: 37.5760,
        lng: 126.9768,
        type: 'video',
        icon: 'fa-solid fa-video',
        color: 'pin-video',
        triggerText: lang === 'ko' ? '광화문 소개 영상이 자동 재생됩니다.' : 'Gwanghwamun Intro Video is autoplaying.'
      },
      {
        id: 'node-heungnyemun',
        name: lang === 'ko' ? '흥례문 뜰 (가이드 인사)' : 'Heungnyemun Court (Guide Greeting)',
        desc: lang === 'ko' ? '두 번째 문인 흥례문 앞뜰로, 품계석과 넓은 조정이 펼쳐집니다.' : 'The courtyard in front of the second gate, Heungnyemun.',
        lat: 37.5772,
        lng: 126.9768,
        type: 'audio',
        icon: 'fa-solid fa-volume-high',
        color: 'pin-audio',
        triggerText: lang === 'ko' ? '민호 가이드의 해설이 시작됩니다.' : 'Guide Minho\'s commentary is playing.'
      },
      {
        id: 'node-geunjeongjeon',
        name: lang === 'ko' ? '근정전 (할인 쿠폰 지점)' : 'Geunjeongjeon Hall (Coupon Spot)',
        desc: lang === 'ko' ? '경복궁의 으뜸 법전으로 왕의 즉위식이나 아침 조회가 행해졌습니다.' : 'The main throne hall where coronation ceremonies were held.',
        lat: 37.5786,
        lng: 126.9772,
        type: 'coupon',
        icon: 'fa-solid fa-ticket',
        color: 'pin-coupon',
        triggerText: lang === 'ko' ? '법전 비화 퀴즈를 풀고 할인 쿠폰을 받으세요!' : 'Solve the throne history quiz and win a coupon!'
      },
      {
        id: 'node-gyeonghoeru',
        name: lang === 'ko' ? '경회루 (음성 해설)' : 'Gyeonghoeru Pavilion (Audio Story)',
        desc: lang === 'ko' ? '나라의 경사가 있을 때 연회를 베풀던 연못 위 누각입니다.' : 'A majestic pavilion sitting over a pond, used for royal banquets.',
        lat: 37.5798,
        lng: 126.9760,
        type: 'audio',
        icon: 'fa-solid fa-microphone',
        color: 'pin-audio',
        triggerText: lang === 'ko' ? '경회루 물안개 스토리 오디오가 재생됩니다.' : 'Gyeonghoeru Water Fog Story audio is playing.'
      }
    ];
  };

  function init() {
    const container = document.getElementById('map-container');
    if (!container) return;

    bindControlsOnce();

    // Do not create Leaflet map twice. Leaflet throws "Map container is already initialized".
    if (map || fallbackMode) {
      invalidateSize();
      return;
    }

    if (!window.L) {
      renderFallbackMap();
      window.TravelogApp?.showToast?.('지도 라이브러리를 불러오지 못해 간이 지도로 표시합니다.');
      return;
    }

    fallbackMode = false;
    container.innerHTML = '';

    // 1. Leaflet initialization centered at Gyeongbokgung
    map = L.map('map-container', {
      zoomControl: false
    }).setView([37.5780, 126.9768], 16);

    // 2. Add Stylized Voyager Maps Tile
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    // 3. Add Layers
    markersLayer = L.layerGroup().addTo(map);
    creatorPinsLayer = L.layerGroup().addTo(map);

    // Create simulated user marker starting at Gwanghwamun Gate
    const playerIcon = L.divIcon({
      html: '<div class="pin-player" style="width:24px; height:24px; border-radius:50%;"></div>',
      className: 'custom-player-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    userMarker = L.marker([37.5750, 126.9768], { icon: playerIcon }).addTo(map);

    // 4. Map click event for Creator Studio Node Placement
    map.on('click', (e) => {
      addNewCreatorPin(e.latlng.lat, e.latlng.lng);
    });

    // Draw active tour markers and lines
    renderTour();
    redrawCreatorPins();
    invalidateSize();
  }

  function bindControlsOnce() {
    if (controlsBound) return;
    controlsBound = true;

    document.getElementById('zoom-to-user-btn')?.addEventListener('click', () => {
      if (map && userMarker) {
        map.setView(userMarker.getLatLng(), 16);
      }
    });

    document.getElementById('gps-simulation-btn')?.addEventListener('click', toggleGPSSimulation);

    document.getElementById('play-guide-intro-btn')?.addEventListener('click', () => {
      triggerVideoOverlay('Gwanghwamun Gate Intro', 'Minho (Seoul Local)');
    });
    document.getElementById('hear-greeting-btn')?.addEventListener('click', () => {
      triggerAudioOverlay('Greeting from Minho', 'Minho (Seoul Local)');
    });

    document.getElementById('close-audio-btn')?.addEventListener('click', () => {
      document.getElementById('audio-overlay')?.classList.remove('active');
      stopAudioWaveAnimation();
    });

    document.getElementById('play-audio-btn')?.addEventListener('click', () => {
      isAudioPlaying = !isAudioPlaying;
      updateAudioPlayButtonIcon();
      if (isAudioPlaying) {
        startAudioWaveAnimation();
      } else {
        stopAudioWaveAnimation();
      }
    });

    document.getElementById('close-video-modal-btn')?.addEventListener('click', closeVideoOverlay);
  }

  function renderTour() {
    if (fallbackMode) {
      renderFallbackMap();
      renderTourList();
      return;
    }

    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (routePolyline) {
      map.removeLayer(routePolyline);
      routePolyline = null;
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
        <div style="color:#2B3A42; padding:4px;">
          <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700; color:#2B3A42;">${node.name}</h4>
          <p style="margin:0; font-size:12px; line-height:1.4; color:#4F626C;">${node.desc}</p>
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

    renderTourList();
  }

  function renderTourList() {
    const listEl = document.getElementById('tour-stops-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    getTourNodes().forEach((node, index) => {
      const row = document.createElement('div');
      row.style.cssText = `
        padding: 6px 0;
        border-bottom: 1px solid rgba(112, 162, 183, 0.12);
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      row.innerHTML = `
        <span style="background:var(--bg-tertiary); border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;">${index + 1}</span>
        <span style="flex:1;">${node.name}</span>
        <i class="${node.icon}" style="font-size:12px; color:var(--text-muted);"></i>
      `;
      listEl.appendChild(row);
    });
  }

  function redrawCreatorPins() {
    if (fallbackMode) {
      renderFallbackMap();
      return;
    }

    if (!map || !creatorPinsLayer) return;

    creatorPinsLayer.clearLayers();
    const customPins = window.TravelogApp?.getState?.().customCreatedPins || [];
    customPins.forEach((pin, index) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: createHtmlIcon('fa-solid fa-location-crosshairs', 'pin-quest')
      }).bindPopup(`<b>${pin.nameKo || `커스텀 핀 #${index + 1}`}</b><br>Coords: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`);

      creatorPinsLayer.addLayer(marker);
    });
  }

  // ==========================================
  // Fallback schematic map when Leaflet is unavailable
  // ==========================================
  function renderFallbackMap() {
    fallbackMode = true;
    const container = document.getElementById('map-container');
    if (!container) return;

    const nodes = getTourNodes();
    const customPins = window.TravelogApp?.getState?.().customCreatedPins || [];
    const allPoints = [...nodes, ...customPins, { lat: 37.5750, lng: 126.9768 }];
    const minLat = Math.min(...allPoints.map(p => p.lat));
    const maxLat = Math.max(...allPoints.map(p => p.lat));
    const minLng = Math.min(...allPoints.map(p => p.lng));
    const maxLng = Math.max(...allPoints.map(p => p.lng));

    const toPos = (lat, lng) => {
      const x = 12 + ((lng - minLng) / Math.max(maxLng - minLng, 0.0001)) * 76;
      const y = 88 - ((lat - minLat) / Math.max(maxLat - minLat, 0.0001)) * 76;
      return { x, y };
    };

    const routePoints = nodes.map(node => {
      const pos = toPos(node.lat, node.lng);
      return `${pos.x},${pos.y}`;
    }).join(' ');

    const nodeHtml = nodes.map((node, index) => {
      const pos = toPos(node.lat, node.lng);
      return `
        <button type="button" class="custom-pin ${node.color}" title="${node.name}" style="position:absolute; left:${pos.x}%; top:${pos.y}%; transform:translate(-50%, -50%); width:36px; height:36px; z-index:4;">
          <i class="${node.icon}"></i>
          <span style="position:absolute; left:26px; top:-6px; background:white; color:#2B3A42; border-radius:10px; padding:1px 6px; font-size:11px; box-shadow:0 2px 8px rgba(0,0,0,0.12);">${index + 1}</span>
        </button>
      `;
    }).join('');

    const customPinHtml = customPins.map((pin, index) => {
      const pos = toPos(pin.lat, pin.lng);
      return `
        <div class="custom-pin pin-quest" title="${pin.nameKo}" style="position:absolute; left:${pos.x}%; top:${pos.y}%; transform:translate(-50%, -50%); width:30px; height:30px; z-index:5;">
          <i class="fa-solid fa-location-crosshairs"></i>
          <span style="position:absolute; left:22px; top:-6px; background:white; color:#2B3A42; border-radius:10px; padding:1px 6px; font-size:10px; box-shadow:0 2px 8px rgba(0,0,0,0.12);">C${index + 1}</span>
        </div>
      `;
    }).join('');

    const userPos = toPos(getUserLocation().lat, getUserLocation().lng);

    container.innerHTML = `
      <div id="fallback-map-surface" style="position:relative; width:100%; height:100%; overflow:hidden; background:linear-gradient(135deg,#EAF2F4,#F7FAF8); cursor:crosshair;">
        <div style="position:absolute; inset:0; background-image:linear-gradient(rgba(112,162,183,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(112,162,183,0.12) 1px, transparent 1px); background-size:48px 48px;"></div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; z-index:2;">
          <polyline points="${routePoints}" fill="none" stroke="#70A2B7" stroke-width="1.8" stroke-dasharray="3 3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        ${nodeHtml}
        ${customPinHtml}
        <div class="pin-player" style="position:absolute; left:${userPos.x}%; top:${userPos.y}%; transform:translate(-50%, -50%); width:24px; height:24px; border-radius:50%; z-index:6;"></div>
        <div class="glass-panel" style="position:absolute; left:20px; bottom:110px; padding:10px 14px; font-size:12px; z-index:7; max-width:260px;">
          ${window.L ? '지도 로딩 중입니다.' : 'Leaflet CDN 연결이 안 될 때 표시되는 간이 지도입니다.'}<br>
          <span style="color:var(--text-muted);">지도 위를 클릭하면 커스텀 핀이 추가됩니다.</span>
        </div>
      </div>
    `;

    document.getElementById('fallback-map-surface')?.addEventListener('click', event => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const lat = maxLat - y * (maxLat - minLat || 0.0048);
      const lng = minLng + x * (maxLng - minLng || 0.002);
      addNewCreatorPin(lat, lng);
    });

    renderTourList();
  }

  // ==========================================
  // GPS Path Simulator Logic
  // ==========================================
  function toggleGPSSimulation() {
    const btn = document.getElementById('gps-simulation-btn');
    const statusPill = document.getElementById('simulation-status-pill');

    if (isSimulating) {
      clearInterval(simIntervalId);
      isSimulating = false;
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-person-walking"></i>';
        btn.style.background = '';
      }
      if (statusPill) statusPill.style.display = 'none';
      window.TravelogApp?.showToast?.(window.TravelogApp.getLanguage() === 'ko' ? '시뮬레이션이 종료되었습니다.' : 'Simulation stopped.');
    } else {
      isSimulating = true;
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-pause"></i>';
        btn.style.background = 'var(--accent-pink)';
      }
      if (statusPill) statusPill.style.display = 'block';
      triggeredNodes.clear();

      generateSimulationPath();
      simIndex = 0;

      window.TravelogApp?.showToast?.(window.TravelogApp.getLanguage() === 'ko' ? 'GPS 이동 시뮬레이션을 시작합니다!' : 'Starting GPS Walk Simulation!');
      simIntervalId = setInterval(runSimulationStep, 250);
    }
  }

  // Generate intermediate coordinates along the route
  function generateSimulationPath() {
    simPath = [];
    const nodes = getTourNodes();
    let currentPt = { lat: 37.5750, lng: 126.9768 };

    nodes.forEach(node => {
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
      toggleGPSSimulation();
      return;
    }

    const nextCoord = simPath[simIndex];
    moveUserMarker(nextCoord.lat, nextCoord.lng, true);
    checkProximityTrigger(nextCoord.lat, nextCoord.lng);

    if (window.TravelogAdventureModule && typeof window.TravelogAdventureModule.updateDistanceToClue === 'function') {
      window.TravelogAdventureModule.updateDistanceToClue(nextCoord.lat, nextCoord.lng);
    }

    simIndex++;
  }

  function moveUserMarker(lat, lng, pan = false) {
    currentUserLocation = { lat, lng };

    if (userMarker && map) {
      userMarker.setLatLng([lat, lng]);
      if (pan) map.panTo([lat, lng]);
    }

    if (fallbackMode) {
      // Keep fallback marker visually updated.
      renderFallbackMap();
    }
  }

  // Calculate distance & trigger coordinate events
  function checkProximityTrigger(lat, lng) {
    getTourNodes().forEach(node => {
      if (triggeredNodes.has(node.id)) return;

      const dist = getDistanceInMeters(lat, lng, node.lat, node.lng);
      if (dist <= 22) {
        triggeredNodes.add(node.id);
        triggerNodeEvent(node);
      }
    });
  }

  function triggerNodeEvent(node) {
    window.TravelogApp?.showToast?.(`${node.name}: ${node.triggerText}`);

    if (node.type === 'video') {
      triggerVideoOverlay(node.name, 'Minho (Seoul Local)');
    } else if (node.type === 'audio') {
      triggerAudioOverlay(node.name, 'Minho (Seoul Local)');
    } else if (node.type === 'coupon') {
      setTimeout(() => {
        window.TravelogApp?.addPoints?.(100);
        window.TravelogApp?.claimCoupon?.({
          id: 'coupon-geunjeong',
          tag: 'GEUNJEONG THRONES',
          value: '15% OFF',
          desc: 'Seochon Traditional Cafe Tea House'
        });
        window.TravelogApp?.showToast?.(window.TravelogApp.getLanguage() === 'ko' ? '근정전 비화 보상: +100 포인트 & 카페 15% 할인 쿠폰 획득!' : 'Geunjeong Hall Reward: +100 pts & 15% Cafe Coupon claimed!');
      }, 1000);
    }
  }

  // Helper: Haversine formula to compute distance
  function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // ==========================================
  // Audio Overlay Controller
  // ==========================================
  let isAudioPlaying = false;

  function triggerAudioOverlay(title, speaker) {
    const overlay = document.getElementById('audio-overlay');
    const titleEl = document.getElementById('audio-title');
    const speakerEl = document.getElementById('audio-speaker');
    if (!overlay || !titleEl || !speakerEl) return;

    titleEl.textContent = title;
    speakerEl.textContent = `By ${speaker}`;
    overlay.classList.add('active');

    isAudioPlaying = true;
    updateAudioPlayButtonIcon();
    startAudioWaveAnimation();
  }

  function updateAudioPlayButtonIcon() {
    const btn = document.getElementById('play-audio-btn');
    if (!btn) return;
    btn.innerHTML = isAudioPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
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
    const titleEl = document.getElementById('video-overlay-title');
    const authorEl = document.getElementById('video-overlay-author');
    const timerText = document.getElementById('video-play-timer');
    if (!modal || !titleEl || !authorEl || !timerText) return;

    titleEl.textContent = title;
    authorEl.textContent = author;
    modal.classList.add('active');

    videoSeconds = 0;
    timerText.textContent = '0:00 / 0:15';

    clearInterval(videoPlayInterval);
    videoPlayInterval = setInterval(() => {
      videoSeconds++;
      if (videoSeconds > 15) {
        closeVideoOverlay();
      } else {
        const displaySec = videoSeconds < 10 ? `0${videoSeconds}` : videoSeconds;
        timerText.textContent = `0:${displaySec} / 0:15`;
      }
    }, 1000);
  }

  function closeVideoOverlay() {
    clearInterval(videoPlayInterval);
    document.getElementById('video-overlay')?.classList.remove('active');
  }

  // ==========================================
  // Creator Custom Pins Placement
  // ==========================================
  function addNewCreatorPin(lat, lng) {
    const customPins = window.TravelogApp?.getState?.().customCreatedPins;
    if (!customPins) return;

    const newIndex = customPins.length + 1;
    const newPin = {
      id: `custom-pin-${Date.now()}-${newIndex}`,
      nameEn: `Custom Pin #${newIndex}`,
      nameKo: `커스텀 핀 #${newIndex}`,
      lat,
      lng
    };

    customPins.push(newPin);
    redrawCreatorPins();

    if (window.TravelogCreatorModule && typeof window.TravelogCreatorModule.renderCoordinatesList === 'function') {
      window.TravelogCreatorModule.renderCoordinatesList();
    }

    window.TravelogApp?.showToast?.(window.TravelogApp.getLanguage() === 'ko' ? `새 핀 #${newIndex}이 추가되었습니다.` : `New pin #${newIndex} added.`);
  }

  function clearCreatorPins() {
    const state = window.TravelogApp?.getState?.();
    if (state) state.customCreatedPins = [];

    if (creatorPinsLayer) creatorPinsLayer.clearLayers();
    if (fallbackMode) renderFallbackMap();
    renderTour();
  }

  function invalidateSize() {
    if (map) {
      map.invalidateSize({ pan: false });
    }
    if (fallbackMode) {
      renderFallbackMap();
    }
  }

  function getUserLocation() {
    if (userMarker) {
      const loc = userMarker.getLatLng();
      currentUserLocation = { lat: loc.lat, lng: loc.lng };
      return currentUserLocation;
    }
    return currentUserLocation;
  }

  return {
    init,
    invalidateSize,
    onLanguageChange: () => {
      renderTour();
      redrawCreatorPins();
    },
    clearCreatorPins,
    teleportUser: (lat, lng) => {
      moveUserMarker(lat, lng, true);
      checkProximityTrigger(lat, lng);
      if (window.TravelogAdventureModule && typeof window.TravelogAdventureModule.updateDistanceToClue === 'function') {
        window.TravelogAdventureModule.updateDistanceToClue(lat, lng);
      }
    },
    getDistanceInMeters,
    getUserLocation
  };
})();

// Attach globally
window.TravelogMapModule = TravelogMapModule;
