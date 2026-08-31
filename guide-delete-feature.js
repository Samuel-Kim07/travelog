(() => {
  'use strict';

  const SAVED_GUIDES_KEY = 'travelog_creator_saved_guides_v1';
  const PUBLISHED_CREATOR_KEY = 'travelog_creator_published_guides_v1';
  const HOME_PUBLISHED_KEY = 'travelog_published_guides_v1';
  const PURCHASED_GUIDES_KEY = 'travelog_purchased_guides_v1';
  const OFFLINE_STATUS_KEY = 'travelog_offline_guide_status_v1';

  const OFFLINE_DB_NAME = 'travelog_offline_guides_v1';
  const OFFLINE_STORE = 'guides';

  const MODAL_ID = 'travelog-guide-delete-confirm-modal';

  let pendingGuideId = '';
  let pendingRecord = null;
  let originalDeleteSavedGuide = null;
  let originalDeletePublishedGuide = null;
  let installed = false;

  function t(ko, en, ja) {
    if (window.TravelogApp && typeof window.TravelogApp.t === 'function') {
      return window.TravelogApp.t(ko, en, ja);
    }
    return ko;
  }

  function safeParseArray(raw) {
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function getSavedRecord(guideId) {
    const id = String(guideId || '');
    const saved = safeParseArray(localStorage.getItem(SAVED_GUIDES_KEY));
    const published = safeParseArray(localStorage.getItem(PUBLISHED_CREATOR_KEY));
    return saved.find(item => String(item?.id) === id)
      || published.find(item => String(item?.id) === id)
      || null;
  }

  function isPublishedRecord(record, guideId) {
    if (record?.status === 'published') return true;
    const id = String(guideId || '');
    const published = safeParseArray(localStorage.getItem(PUBLISHED_CREATOR_KEY));
    return published.some(item => String(item?.id) === id);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message) {
    if (window.TravelogApp?.showToast) {
      window.TravelogApp.showToast(message);
    } else {
      console.log('[Travelog Guide Delete]', message);
    }
  }

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'travelog-guide-delete-modal';
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="travelog-guide-delete-card" role="dialog" aria-modal="true" aria-labelledby="travelog-guide-delete-title">
        <button type="button" class="travelog-guide-delete-close" id="travelog-guide-delete-close" aria-label="삭제 확인 팝업 닫기">✕</button>

        <div class="travelog-guide-delete-icon" aria-hidden="true">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <div class="travelog-guide-delete-copy">
          <span class="travelog-guide-delete-badge">${t('가이드 삭제', 'Delete guide', 'ガイド削除')}</span>
          <h2 id="travelog-guide-delete-title">${t('정말 삭제하시겠습니까?', 'Delete this guide?', '本当に削除しますか？')}</h2>
          <p class="travelog-guide-delete-guide-name" id="travelog-guide-delete-guide-name"></p>
          <p class="travelog-guide-delete-lead" id="travelog-guide-delete-lead"></p>

          <div class="travelog-guide-delete-warning-box" id="travelog-guide-delete-warning-box"></div>

          <strong class="travelog-guide-delete-final-warning">
            ${t('삭제 후에는 복구할 수 없습니다.', 'This cannot be undone.', '削除後は元に戻せません。')}
          </strong>

          <p class="travelog-guide-delete-error" id="travelog-guide-delete-error" aria-live="polite"></p>
        </div>

        <div class="travelog-guide-delete-actions">
          <button type="button" class="travelog-guide-delete-cancel" id="travelog-guide-delete-cancel">
            ${t('취소', 'Cancel', 'キャンセル')}
          </button>
          <button type="button" class="travelog-guide-delete-confirm" id="travelog-guide-delete-confirm">
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
            <span>${t('삭제', 'Delete', '削除')}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#travelog-guide-delete-close')?.addEventListener('click', closeModal);
    modal.querySelector('#travelog-guide-delete-cancel')?.addEventListener('click', closeModal);
    modal.querySelector('#travelog-guide-delete-confirm')?.addEventListener('click', confirmDelete);

    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    return modal;
  }

  function setBusy(busy) {
    const modal = ensureModal();
    const close = modal.querySelector('#travelog-guide-delete-close');
    const cancel = modal.querySelector('#travelog-guide-delete-cancel');
    const confirm = modal.querySelector('#travelog-guide-delete-confirm');

    modal.dataset.busy = busy ? 'true' : 'false';
    if (close) close.disabled = busy;
    if (cancel) cancel.disabled = busy;
    if (confirm) {
      confirm.disabled = busy;
      const label = confirm.querySelector('span');
      if (label) label.textContent = busy
        ? t('삭제 중...', 'Deleting...', '削除中...')
        : t('삭제', 'Delete', '削除');
    }
  }

  function setError(message = '') {
    const el = document.getElementById('travelog-guide-delete-error');
    if (el) el.textContent = message;
  }

  function openModal(guideId, mode = 'saved') {
    const record = getSavedRecord(guideId);
    const published = isPublishedRecord(record, guideId);

    pendingGuideId = String(guideId || '');
    pendingRecord = record || { id: pendingGuideId, status: published ? 'published' : 'unpublished' };

    const modal = ensureModal();
    const name = modal.querySelector('#travelog-guide-delete-guide-name');
    const lead = modal.querySelector('#travelog-guide-delete-lead');
    const warningBox = modal.querySelector('#travelog-guide-delete-warning-box');

    const title = record?.tourName || record?.guideCard?.name || t('나의 가이드', 'My guide', 'マイガイド');
    if (name) name.textContent = `“${title}”`;

    if (published) {
      if (lead) {
        lead.textContent = t(
          '이 가이드는 출간된 가이드입니다. 최종 삭제하면 아래 데이터가 함께 삭제됩니다.',
          'This guide is published. Final deletion removes the following data.',
          'このガイドは公開済みです。削除すると以下のデータも削除されます。'
        );
      }
      if (warningBox) {
        warningBox.innerHTML = `
          <div><i class="fa-solid fa-circle-check"></i><span>${t('스튜디오의 ‘나의 가이드’ 목록에서 삭제', 'Removed from My Guides in Studio', 'スタジオのマイガイドから削除')}</span></div>
          <div><i class="fa-solid fa-circle-check"></i><span>${t('홈 ‘오늘의 가이드 (오늘의 로그)’ 목록에서 즉시 삭제', "Immediately removed from Today's Guide", 'ホームの今日のガイドから即時削除')}</span></div>
          <div><i class="fa-solid fa-circle-check"></i><span>${t('Supabase의 출간 가이드·핀·미디어 기록 삭제', 'Published guide, pins and media records removed from Supabase', 'Supabaseの公開ガイド・ピン・メディア記録を削除')}</span></div>
          <div><i class="fa-solid fa-circle-check"></i><span>${t('서버의 대표 이미지·음성·영상·사진 파일 삭제', 'Cover, audio, video and photo files removed from server storage', 'サーバーの画像・音声・動画ファイルを削除')}</span></div>
          <div><i class="fa-solid fa-circle-check"></i><span>${t('구매·오프라인 다운로드 연결 기록 삭제', 'Purchase and offline-download links removed', '購入・オフラインダウンロード関連記録を削除')}</span></div>
        `;
      }
    } else {
      if (lead) {
        lead.textContent = t(
          '이 가이드는 아직 출간되지 않았습니다. 스튜디오에 저장된 제작 기록을 삭제합니다.',
          'This guide has not been published. Its saved Studio record will be removed.',
          'このガイドは未公開です。スタジオの保存データを削除します。'
        );
      }
      if (warningBox) {
        warningBox.innerHTML = `
          <div><i class="fa-solid fa-circle-check"></i><span>${t('스튜디오의 ‘나의 가이드’ 목록에서 삭제', 'Removed from My Guides in Studio', 'スタジオのマイガイドから削除')}</span></div>
          <div><i class="fa-solid fa-circle-info"></i><span>${t('미출간 가이드는 홈 ‘오늘의 가이드’에는 등록되어 있지 않습니다.', "Unpublished guides are not listed in Today's Guide.", '未公開ガイドは今日のガイドには表示されません。')}</span></div>
        `;
      }
    }

    setBusy(false);
    setError('');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('travelog-guide-delete-open');
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.busy === 'true') return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('travelog-guide-delete-open');
    pendingGuideId = '';
    pendingRecord = null;
    setError('');
  }

  async function prepareServerDeletion(guideId) {
    const api = window.TravelogSupabase;
    if (!api?.getClient || !api?.ensureSession) {
      throw new Error('SUPABASE_DELETE_API_NOT_READY');
    }

    const state = window.TravelogApp?.getState?.() || {};
    const session = await api.ensureSession({
      displayName: state?.userProfile?.nickname || 'Travelog User',
      interactiveLogin: true
    });
    if (!session?.user?.id) throw new Error('SUPABASE_AUTH_REQUIRED');

    const supabase = api.getClient();
    const { data, error } = await supabase.rpc('prepare_owned_guide_delete_v1', {
      p_guide_id: guideId
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function removeServerStorageFiles(mediaRows) {
    if (!Array.isArray(mediaRows) || mediaRows.length === 0) return;

    const api = window.TravelogSupabase;
    const supabase = api?.getClient?.();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');

    const byBucket = new Map();

    mediaRows.forEach(row => {
      const bucket = String(row?.bucket_name || '').trim();
      const path = String(row?.storage_path || '').trim();
      if (!bucket || !path) return;
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket).push(path);
    });

    for (const [bucket, paths] of byBucket.entries()) {
      const uniquePaths = [...new Set(paths)];
      if (!uniquePaths.length) continue;

      const { error } = await supabase.storage.from(bucket).remove(uniquePaths);
      if (error) {
        const wrapped = new Error(`STORAGE_DELETE_FAILED: ${error.message || error}`);
        wrapped.code = error.code || 'STORAGE_DELETE_FAILED';
        throw wrapped;
      }
    }
  }

  async function deleteServerDatabaseRows(guideId) {
    const api = window.TravelogSupabase;
    const supabase = api?.getClient?.();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');

    const { data, error } = await supabase.rpc('delete_owned_guide_v1', {
      p_guide_id: guideId
    });

    if (error) throw error;
    return data;
  }

  function removeGuideFromArrayStorage(key, guideId) {
    try {
      const list = safeParseArray(localStorage.getItem(key));
      localStorage.setItem(
        key,
        JSON.stringify(list.filter(item =>
          String(item?.id || item?.guideId || item?.supabaseGuideId || '') !== String(guideId)
        ))
      );
    } catch (error) {
      console.warn('[Travelog Guide Delete] Local storage cleanup skipped:', key, error);
    }
  }

  function cleanupOfflineStatus(guideId) {
    try {
      const raw = localStorage.getItem(OFFLINE_STATUS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      if (data && typeof data === 'object') {
        delete data[guideId];
        localStorage.setItem(OFFLINE_STATUS_KEY, JSON.stringify(data));
      }
    } catch (_) {}
  }

  function cleanupOfflineIndexedDb(guideId) {
    return new Promise(resolve => {
      try {
        if (!window.indexedDB) {
          resolve();
          return;
        }
        const request = indexedDB.open(OFFLINE_DB_NAME, 1);
        request.onerror = () => resolve();
        request.onupgradeneeded = () => resolve();
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(OFFLINE_STORE, 'readwrite');
          tx.objectStore(OFFLINE_STORE).delete(guideId);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        };
      } catch (_) {
        resolve();
      }
    });
  }

  async function cleanupLocalExtraCopies(guideId) {
    removeGuideFromArrayStorage(PUBLISHED_CREATOR_KEY, guideId);
    removeGuideFromArrayStorage(HOME_PUBLISHED_KEY, guideId);
    removeGuideFromArrayStorage(PURCHASED_GUIDES_KEY, guideId);
    cleanupOfflineStatus(guideId);
    await cleanupOfflineIndexedDb(guideId);
  }

  function readableDeleteError(error) {
    const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toUpperCase();

    if (
      raw.includes('PGRST202')
      || raw.includes('PREPARE_OWNED_GUIDE_DELETE_V1')
      || raw.includes('DELETE_OWNED_GUIDE_V1')
      || raw.includes('FUNCTION') && raw.includes('DOES NOT EXIST')
    ) {
      return t(
        'Supabase 삭제 함수가 아직 없습니다. 함께 제공된 TRAVELOG_GUIDE_DELETE_SETUP.sql을 SQL Editor에서 한 번 실행해 주세요.',
        'The Supabase delete functions are not installed. Run TRAVELOG_GUIDE_DELETE_SETUP.sql once.',
        'Supabaseの削除関数がありません。TRAVELOG_GUIDE_DELETE_SETUP.sqlを一度実行してください。'
      );
    }

    if (
      raw.includes('42501')
      || raw.includes('ROW LEVEL SECURITY')
      || raw.includes('RLS')
      || raw.includes('PERMISSION DENIED')
      || raw.includes('STORAGE_DELETE_FAILED')
    ) {
      return t(
        '서버 파일 삭제 권한이 없습니다. TRAVELOG_GUIDE_DELETE_SETUP.sql을 Supabase SQL Editor에서 다시 실행해 주세요.',
        'Server storage delete permission is missing. Run TRAVELOG_GUIDE_DELETE_SETUP.sql again.',
        'サーバーファイル削除権限がありません。SQLを再実行してください。'
      );
    }

    if (raw.includes('NOT_OWNER')) {
      return t(
        '본인이 출간한 가이드만 삭제할 수 있습니다.',
        'You can delete only guides you published.',
        '自分が公開したガイドのみ削除できます。'
      );
    }

    return t(
      `삭제하지 못했습니다. ${error?.message || '잠시 후 다시 시도해 주세요.'}`,
      `Could not delete the guide. ${error?.message || 'Please try again.'}`,
      `ガイドを削除できませんでした。${error?.message || 'もう一度お試しください。'}`
    );
  }

  async function confirmDelete() {
    if (!pendingGuideId) return;

    const guideId = pendingGuideId;
    const record = pendingRecord || getSavedRecord(guideId);
    const published = isPublishedRecord(record, guideId);

    setBusy(true);
    setError('');

    try {
      if (published) {
        // 1) Owner check + media manifest
        const mediaRows = await prepareServerDeletion(guideId);

        // 2) Remove actual Storage objects while the guide owner row still exists.
        await removeServerStorageFiles(mediaRows);

        // 3) Remove guide DB relations + guide row atomically on server.
        await deleteServerDatabaseRows(guideId);
      }

      // 4) Use the existing Creator delete flow so Studio + Today's Guide update immediately.
      if (typeof originalDeleteSavedGuide === 'function') {
        originalDeleteSavedGuide(guideId);
      } else {
        removeGuideFromArrayStorage(SAVED_GUIDES_KEY, guideId);
        if (window.TravelogApp?.removePublishedGuide) {
          window.TravelogApp.removePublishedGuide(guideId);
        }
        window.TravelogCreatorModule?.renderSavedGuidesList?.();
      }

      // 5) Clean extra current-device copies.
      await cleanupLocalExtraCopies(guideId);

      // Force Home rerender so Today's Guide visibly disappears without refresh.
      window.TravelogApp?.removePublishedGuide?.(guideId);
      window.TravelogApp?.renderHomeTab?.();
      window.TravelogCreatorModule?.renderSavedGuidesList?.();

      const modal = document.getElementById(MODAL_ID);
      if (modal) {
        modal.dataset.busy = 'false';
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('travelog-guide-delete-open');

      pendingGuideId = '';
      pendingRecord = null;

      showToast(
        published
          ? t(
              '가이드와 관련 데이터가 삭제되었으며 오늘의 가이드에서도 제거되었습니다.',
              "The guide and related data were deleted and removed from Today's Guide.",
              'ガイドと関連データを削除し、今日のガイドからも削除しました。'
            )
          : t(
              '저장된 가이드를 삭제했습니다.',
              'Saved guide deleted.',
              '保存済みガイドを削除しました。'
            )
      );
    } catch (error) {
      console.error('[Travelog Guide Delete] Final delete failed:', error);
      setBusy(false);
      setError(readableDeleteError(error));
    }
  }

  function install() {
    if (installed) return true;

    const creator = window.TravelogCreatorModule;
    if (!creator || typeof creator.deleteSavedGuide !== 'function') return false;

    installed = true;
    originalDeleteSavedGuide = creator.deleteSavedGuide.bind(creator);
    originalDeletePublishedGuide = typeof creator.deletePublishedGuide === 'function'
      ? creator.deletePublishedGuide.bind(creator)
      : null;

    creator.deleteSavedGuide = function patchedDeleteSavedGuide(guideId) {
      openModal(guideId, 'saved');
    };

    // If the separate Published Guide list is used later, give it the same safety dialog.
    if (originalDeletePublishedGuide) {
      creator.deletePublishedGuide = function patchedDeletePublishedGuide(guideId) {
        openModal(guideId, 'published');
      };
    }

    console.info('[Travelog Guide Delete] Confirmation + server cascade delete enabled.');
    return true;
  }

  function init() {
    ensureModal();
    if (install()) return;

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries >= 60) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
