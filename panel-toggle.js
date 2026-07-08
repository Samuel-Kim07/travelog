// ==========================================
// Travelog Panel Toggle Module
// - Generic "collapse / expand" behavior for card-style
//   panels across the Rewards / Creator / Adventure tabs.
// - Skip (close) button for the onboarding overlay.
// This file is self-contained and does not depend on app.js,
// so it can be dropped in alongside the existing scripts.
// ==========================================

const TravelogPanelToggleModule = (() => {
  function t(ko, en, ja) {
    return window.TravelogApp && typeof window.TravelogApp.t === 'function' ? window.TravelogApp.t(ko, en, ja) : ko;
  }

  const CARD_COLLAPSE_STORAGE_KEY = 'travelog-card-collapse-state';

  function readCardCollapseState() {
    try {
      return JSON.parse(localStorage.getItem(CARD_COLLAPSE_STORAGE_KEY) || '{}');
    } catch (err) {
      console.warn('[Travelog Panel Toggle] Failed to read card collapse state:', err);
      return {};
    }
  }

  function saveCardCollapseState(state) {
    try {
      localStorage.setItem(CARD_COLLAPSE_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[Travelog Panel Toggle] Failed to save card collapse state:', err);
    }
  }

  function setCardCollapsed(cardId, collapsed, persist = true) {
    const card = document.querySelector(`.collapsible-card[data-card-id="${cardId}"]`);
    const toggleBtn = document.querySelector(`[data-card-toggle="${cardId}"]`);
    if (!card || !toggleBtn) return;

    card.classList.toggle('collapsed', collapsed);
    card.classList.toggle('expanded', !collapsed);
    toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggleBtn.setAttribute('aria-label', collapsed
      ? t('펼치기', 'Expand panel', '開く')
      : t('접기', 'Collapse panel', '閉じる')
    );

    const icon = toggleBtn.querySelector('.card-toggle-icon');
    if (icon) {
      icon.className = collapsed
        ? 'fa-solid fa-chevron-down card-toggle-icon'
        : 'fa-solid fa-chevron-up card-toggle-icon';
    }

    if (persist) {
      const state = readCardCollapseState();
      state[cardId] = collapsed;
      saveCardCollapseState(state);
    }
  }

  function initCollapsibleCards() {
    const toggles = document.querySelectorAll('[data-card-toggle]');
    if (!toggles.length) return;

    const savedState = readCardCollapseState();

    toggles.forEach(toggleBtn => {
      const cardId = toggleBtn.getAttribute('data-card-toggle');
      if (!cardId) return;

      const initialCollapsed = Boolean(savedState[cardId]);
      setCardCollapsed(cardId, initialCollapsed, false);

      if (toggleBtn.dataset.cardToggleBound === 'true') return;
      toggleBtn.dataset.cardToggleBound = 'true';

      toggleBtn.addEventListener('click', () => {
        const card = document.querySelector(`.collapsible-card[data-card-id="${cardId}"]`);
        const nextCollapsed = !(card && card.classList.contains('collapsed'));
        setCardCollapsed(cardId, nextCollapsed, true);
      });
    });
  }

  // ==========================================
  // Onboarding Skip / Close Button
  // - Properly integrates with app.js's real onboarding
  //   flow (TravelogVerifyNickname / TravelogCompleteOnboarding)
  //   instead of just hiding the overlay, so isOnboarded state,
  //   nickname, and localStorage all stay in sync with the app.
  // ==========================================
  function generateGuestNickname() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `Guest${num}`;
  }

  function fallbackCloseOverlay() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 480);
  }

  function skipOnboarding() {
    const input = document.getElementById('onboarding-nickname-input');
    const hasVerifyFn = typeof window.TravelogVerifyNickname === 'function';
    const hasCompleteFn = typeof window.TravelogCompleteOnboarding === 'function';

    if (!hasCompleteFn) {
      // app.js isn't available for some reason — just dismiss the overlay.
      fallbackCloseOverlay();
      return;
    }

    // If the field is empty or too short, auto-fill a guest nickname so the
    // real validation in app.js has something valid to work with.
    if (input && input.value.trim().length < 2) {
      input.value = generateGuestNickname();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (hasVerifyFn) {
      window.TravelogVerifyNickname();
    }

    window.TravelogCompleteOnboarding();
  }

  function initOnboardingSkip() {
    const skipBtn = document.getElementById('onboarding-skip-btn');
    if (!skipBtn || skipBtn.dataset.skipBound === 'true') return;
    skipBtn.dataset.skipBound = 'true';

    skipBtn.addEventListener('click', () => {
      skipOnboarding();
    });
  }

  function init() {
    initCollapsibleCards();
    initOnboardingSkip();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init: init,
    setCardCollapsed: setCardCollapsed,
    skipOnboarding: skipOnboarding
  };
})();

window.TravelogPanelToggleModule = TravelogPanelToggleModule;