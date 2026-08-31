(() => {
  'use strict';

  const OVERLAY_ID = 'travelog-media-fullscreen';
  const MEDIA_SELECTOR = [
    '#published-guide-memo-media img',
    '#published-guide-memo-media video',
    '#published-guide-memo-media iframe',
    '#memo-pin-detail-content img.memo-pin-popup-media',
    '#memo-pin-detail-content video.memo-pin-popup-media',
    '#memo-pin-detail-content iframe',
    '.memo-popup img.memo-pin-popup-media',
    '.memo-popup video.memo-pin-popup-media',
    '.memo-popup iframe'
  ].join(',');

  let restoreState = null;

  function isFullscreenSupported(el) {
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }

  function requestFullscreen(el) {
    try {
      if (el.requestFullscreen) {
        const result = el.requestFullscreen();
        if (result && typeof result.catch === 'function') result.catch(() => {});
        return true;
      }
      if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function exitFullscreen() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        const result = document.exitFullscreen();
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch (_) {}
  }

  function ensureOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'travelog-media-fullscreen';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="travelog-media-fullscreen__topbar">
        <div class="travelog-media-fullscreen__label">전체보기</div>
        <button type="button"
                class="travelog-media-fullscreen__close"
                aria-label="전체보기 닫기"
                title="닫기">✕</button>
      </div>
      <div class="travelog-media-fullscreen__stage"></div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.travelog-media-fullscreen__close')
      ?.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.classList.contains('travelog-media-fullscreen__stage')) {
        closeOverlay();
      }
    });

    return overlay;
  }

  function closeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;

    if (restoreState?.original && restoreState?.placeholder) {
      try {
        restoreState.placeholder.replaceWith(restoreState.original);
      } catch (_) {}
    }

    restoreState = null;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('travelog-media-fullscreen-open');
    exitFullscreen();

    const stage = overlay.querySelector('.travelog-media-fullscreen__stage');
    if (stage) stage.innerHTML = '';
  }

  function openImage(image) {
    const overlay = ensureOverlay();
    const stage = overlay.querySelector('.travelog-media-fullscreen__stage');
    if (!stage) return;

    stage.innerHTML = '';

    const fullImage = document.createElement('img');
    fullImage.className = 'travelog-media-fullscreen__image';
    fullImage.src = image.currentSrc || image.src;
    fullImage.alt = image.alt || '사진 메모';
    fullImage.draggable = false;

    stage.appendChild(fullImage);
    overlay.querySelector('.travelog-media-fullscreen__label').textContent = '사진 전체보기';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('travelog-media-fullscreen-open');

    // 지원 브라우저에서는 주소창 영역까지 포함한 진짜 전체화면을 시도합니다.
    requestFullscreen(overlay);
  }

  function openVideo(video) {
    // iPhone/iPad Safari는 video 전용 네이티브 전체화면이 가장 안정적입니다.
    try {
      if (typeof video.webkitEnterFullscreen === 'function') {
        video.webkitEnterFullscreen();
        return;
      }
    } catch (_) {}

    // 표준 Fullscreen API가 가능하면 원본 비디오 자체를 전체화면으로 엽니다.
    if (isFullscreenSupported(video) && requestFullscreen(video)) {
      return;
    }

    // Fullscreen API 미지원 환경: 원본 비디오를 전체화면 오버레이로 이동합니다.
    const overlay = ensureOverlay();
    const stage = overlay.querySelector('.travelog-media-fullscreen__stage');
    if (!stage) return;

    stage.innerHTML = '';
    const placeholder = document.createComment('travelog-video-placeholder');
    video.replaceWith(placeholder);
    stage.appendChild(video);
    video.classList.add('travelog-media-fullscreen__video');

    restoreState = { original: video, placeholder };

    overlay.querySelector('.travelog-media-fullscreen__label').textContent = '영상 전체보기';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('travelog-media-fullscreen-open');

    try {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  function openIframe(iframe) {
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('webkitallowfullscreen', '');

    if (isFullscreenSupported(iframe) && requestFullscreen(iframe)) {
      return;
    }

    const overlay = ensureOverlay();
    const stage = overlay.querySelector('.travelog-media-fullscreen__stage');
    if (!stage) return;

    stage.innerHTML = '';

    const fullFrame = iframe.cloneNode(true);
    fullFrame.className = 'travelog-media-fullscreen__iframe';
    fullFrame.setAttribute('allowfullscreen', '');
    fullFrame.setAttribute('webkitallowfullscreen', '');
    stage.appendChild(fullFrame);

    overlay.querySelector('.travelog-media-fullscreen__label').textContent = '영상 전체보기';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('travelog-media-fullscreen-open');

    requestFullscreen(overlay);
  }

  function openMedia(media) {
    const tag = media.tagName?.toLowerCase();
    if (tag === 'img') openImage(media);
    else if (tag === 'video') openVideo(media);
    else if (tag === 'iframe') openIframe(media);
  }

  function createExpandButton(media) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'travelog-media-expand-btn';
    button.setAttribute('aria-label', '전체보기');
    button.title = '전체보기';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
              fill="none" stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMedia(media);
    });
    return button;
  }

  function decorateMedia(media) {
    if (!media || media.dataset.travelogFullscreenReady === '1') return;
    media.dataset.travelogFullscreenReady = '1';

    if (media.tagName?.toLowerCase() === 'iframe') {
      media.setAttribute('allowfullscreen', '');
      media.setAttribute('webkitallowfullscreen', '');
    }

    const parent = media.parentElement;
    if (!parent) return;

    // 이미 stage가 있으면 버튼만 보강
    if (parent.classList.contains('travelog-memo-media-stage')) {
      if (!parent.querySelector('.travelog-media-expand-btn')) {
        parent.appendChild(createExpandButton(media));
      }
      return;
    }

    const stage = document.createElement('div');
    stage.className = 'travelog-memo-media-stage';

    parent.insertBefore(stage, media);
    stage.appendChild(media);
    stage.appendChild(createExpandButton(media));

    // 사진은 이미지 자체를 눌러도 전체보기
    if (media.tagName?.toLowerCase() === 'img') {
      media.classList.add('travelog-memo-media-clickable');
      media.setAttribute('role', 'button');
      media.setAttribute('tabindex', '0');
      media.setAttribute('aria-label', `${media.alt || '사진 메모'} 전체보기`);

      media.addEventListener('click', () => openImage(media));
      media.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openImage(media);
        }
      });
    }
  }

  function scan(root = document) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(MEDIA_SELECTOR).forEach(decorateMedia);

    // root 자신이 동적으로 추가된 미디어일 수 있음
    if (root.matches?.(MEDIA_SELECTOR)) decorateMedia(root);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) scan(node);
      });
    });
  });

  function init() {
    ensureOverlay();
    scan(document);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeOverlay();
    });

    document.addEventListener('fullscreenchange', () => {
      const overlay = document.getElementById(OVERLAY_ID);
      if (!document.fullscreenElement && overlay?.classList.contains('is-open')) {
        // 사진 오버레이의 시스템 전체화면만 해제된 경우에는 오버레이도 닫아 UX를 단순화
        closeOverlay();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
