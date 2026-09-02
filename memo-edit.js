(() => {
  'use strict';

  const LOCAL_MEMO_KEY = 'travelog_user_location_memos_v1';
  const MODAL_ID = 'travelog-memo-edit-modal';

  let currentTarget = null;
  let replacementFile = null;
  let visibilityFriends = [];
  let selectedViewerIds = new Set();

  function lang() {
    return String(window.TravelogApp?.getState?.()?.language || 'ko').toLowerCase();
  }

  function t(ko, en, ja) {
    const value = lang();
    if (value.startsWith('en')) return en;
    if (value.startsWith('ja')) return ja;
    return ko;
  }

  function toast(message) {
    if (window.TravelogApp?.showToast) {
      window.TravelogApp.showToast(message);
    } else {
      console.log('[Travelog Memo Edit]', message);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'travelog-memo-edit-modal';
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="travelog-memo-edit-card" role="dialog" aria-modal="true" aria-labelledby="travelog-memo-edit-title">
        <button type="button" class="travelog-memo-edit-close" id="travelog-memo-edit-close" aria-label="메모 수정 닫기">
          <span aria-hidden="true">✕</span>
        </button>

        <div class="travelog-memo-edit-head">
          <span class="travelog-memo-edit-badge">MEMO EDIT</span>
          <h2 id="travelog-memo-edit-title">${t('메모 수정하기', 'Edit memo', 'メモを編集')}</h2>
          <p id="travelog-memo-edit-subtitle">${t('내가 작성한 메모의 제목과 내용을 수정할 수 있습니다.', 'Edit the title and content of your memo.', '自分のメモのタイトルと内容を編集できます。')}</p>
        </div>

        <div class="travelog-memo-edit-grid">
          <label class="travelog-memo-edit-field" id="travelog-memo-edit-title-wrap">
            <span>${t('메모 제목', 'Memo title', 'メモタイトル')}</span>
            <input id="travelog-memo-edit-title-input" type="text" maxlength="60" autocomplete="off">
          </label>

          <label class="travelog-memo-edit-field">
            <span>${t('메모 내용', 'Memo content', 'メモ内容')}</span>
            <textarea id="travelog-memo-edit-content-input" maxlength="2000" rows="5"></textarea>
          </label>

          <div class="travelog-memo-edit-coords" id="travelog-memo-edit-coords"></div>

          <section class="travelog-memo-edit-visibility" id="travelog-memo-edit-visibility" hidden>
            <strong>${t('공개 범위', 'Visibility', '公開範囲')}</strong>
            <div class="travelog-memo-edit-visibility-options" role="radiogroup" aria-label="메모 공개 범위">
              <label><input type="radio" name="travelog-memo-edit-visibility" value="public"><span>${t('전체 공개', 'Public', '全体公開')}</span></label>
              <label><input type="radio" name="travelog-memo-edit-visibility" value="friends"><span>${t('친구에게만 공개', 'Selected friends', '友達限定')}</span></label>
              <label><input type="radio" name="travelog-memo-edit-visibility" value="private"><span>${t('비공개', 'Private', '非公開')}</span></label>
            </div>
            <div id="travelog-memo-edit-friend-panel" class="travelog-memo-edit-friend-panel" hidden>
              <div class="travelog-memo-edit-friend-actions">
                <span>${t('공개할 친구', 'Friends who can view', '公開する友達')}</span>
                <span><button id="travelog-memo-edit-select-all" type="button">${t('모두 선택', 'Select all', 'すべて選択')}</button><button id="travelog-memo-edit-clear-all" type="button">${t('모두 해제', 'Clear all', 'すべて解除')}</button></span>
              </div>
              <div id="travelog-memo-edit-friend-list" class="travelog-memo-edit-friend-list"></div>
            </div>
          </section>

          <section class="travelog-memo-edit-media-section" id="travelog-memo-edit-media-section" hidden>
            <div class="travelog-memo-edit-section-title">
              <strong>${t('사진·영상·음성', 'Photo / video / audio', '写真・動画・音声')}</strong>
              <small>${t('기존 파일을 유지하거나 새 파일로 교체할 수 있습니다.', 'Keep the current file or replace it.', '現在のファイルを維持するか、新しいファイルに置き換えられます。')}</small>
            </div>

            <div class="travelog-memo-edit-media-preview" id="travelog-memo-edit-media-preview"></div>

            <input id="travelog-memo-edit-file-input" type="file" hidden>
            <div class="travelog-memo-edit-file-row">
              <button type="button" class="travelog-memo-edit-secondary" id="travelog-memo-edit-file-select">
                <i class="fa-solid fa-arrow-rotate-right" aria-hidden="true"></i>
                <span>${t('새 파일로 교체', 'Replace file', '新しいファイルに置換')}</span>
              </button>
              <button type="button" class="travelog-memo-edit-secondary" id="travelog-memo-edit-file-clear" hidden>
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                <span>${t('교체 취소', 'Cancel replacement', '置換をキャンセル')}</span>
              </button>
            </div>
            <p class="travelog-memo-edit-file-name" id="travelog-memo-edit-file-name">${t('기존 미디어 유지', 'Keep current media', '現在のメディアを維持')}</p>
          </section>

          <p class="travelog-memo-edit-feedback" id="travelog-memo-edit-feedback" aria-live="polite"></p>
        </div>

        <div class="travelog-memo-edit-actions">
          <button type="button" class="travelog-memo-edit-cancel" id="travelog-memo-edit-cancel">${t('취소', 'Cancel', 'キャンセル')}</button>
          <button type="button" class="travelog-memo-edit-save" id="travelog-memo-edit-save">
            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
            <span>${t('수정 완료', 'Save changes', '変更を保存')}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#travelog-memo-edit-close')?.addEventListener('click', closeEditor);
    modal.querySelector('#travelog-memo-edit-cancel')?.addEventListener('click', closeEditor);
    modal.querySelector('#travelog-memo-edit-save')?.addEventListener('click', saveChanges);
    modal.querySelector('#travelog-memo-edit-file-select')?.addEventListener('click', () => {
      modal.querySelector('#travelog-memo-edit-file-input')?.click();
    });
    modal.querySelector('#travelog-memo-edit-file-clear')?.addEventListener('click', clearReplacementFile);
    modal.querySelector('#travelog-memo-edit-file-input')?.addEventListener('change', handleReplacementFile);
    modal.querySelectorAll('input[name="travelog-memo-edit-visibility"]').forEach(input => input.addEventListener('change', syncVisibilityEditor));
    modal.querySelector('#travelog-memo-edit-select-all')?.addEventListener('click', () => {
      selectedViewerIds = new Set(visibilityFriends.map(friend => friend.id));
      renderVisibilityFriends();
    });
    modal.querySelector('#travelog-memo-edit-clear-all')?.addEventListener('click', () => {
      selectedViewerIds.clear();
      renderVisibilityFriends();
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeEditor();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeEditor();
      }
    });

    return modal;
  }

  function setFeedback(message, type = '') {
    const el = document.getElementById('travelog-memo-edit-feedback');
    if (!el) return;
    el.textContent = message || '';
    el.className = `travelog-memo-edit-feedback${type ? ` ${type}` : ''}`;
  }

  function setBusy(busy) {
    const modal = ensureModal();
    const save = modal.querySelector('#travelog-memo-edit-save');
    const cancel = modal.querySelector('#travelog-memo-edit-cancel');
    const close = modal.querySelector('#travelog-memo-edit-close');
    const select = modal.querySelector('#travelog-memo-edit-file-select');
    if (save) {
      save.disabled = busy;
      const label = save.querySelector('span');
      if (label) label.textContent = busy
        ? t('저장 중...', 'Saving...', '保存中...')
        : t('수정 완료', 'Save changes', '変更を保存');
    }
    if (cancel) cancel.disabled = busy;
    if (close) close.disabled = busy;
    if (select) select.disabled = busy;
  }

  function closeEditor() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.dataset.busy === 'true') return;

    const preview = modal.querySelector('#travelog-memo-edit-media-preview');
    if (preview) {
      preview.querySelectorAll('audio,video').forEach((media) => {
        try { media.pause(); } catch (_) {}
      });
      preview.innerHTML = '';
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('travelog-memo-edit-open');
    currentTarget = null;
    replacementFile = null;
    setFeedback('');
  }

  function mediaAcceptForType(type) {
    if (type === 'photo') return 'image/*';
    if (type === 'video') return 'video/*';
    if (type === 'audio') return 'audio/*';
    return '';
  }

  function buildMediaPreview(type, url, title = '') {
    if (!url) {
      return `<div class="travelog-memo-edit-media-empty">${t('현재 미디어 미리보기가 없습니다.', 'No media preview is available.', '現在プレビューできるメディアがありません。')}</div>`;
    }
    const safeUrl = escapeHtml(url);
    const safeTitle = escapeHtml(title || '');
    if (type === 'photo') {
      return `<img src="${safeUrl}" alt="${safeTitle || 'photo memo'}">`;
    }
    if (type === 'video') {
      return `<video src="${safeUrl}" controls playsinline preload="metadata"></video>`;
    }
    if (type === 'audio') {
      return `<audio src="${safeUrl}" controls preload="metadata"></audio>`;
    }
    return '';
  }

  function currentVisibility() {
    return ensureModal().querySelector('input[name="travelog-memo-edit-visibility"]:checked')?.value || 'public';
  }

  function renderVisibilityFriends() {
    const list = ensureModal().querySelector('#travelog-memo-edit-friend-list');
    if (!list) return;
    if (visibilityFriends.length === 0) {
      list.innerHTML = `<p>${t('수락된 친구가 없습니다.', 'No accepted friends.', '承認済みの友達がいません。')}</p>`;
      return;
    }
    list.innerHTML = visibilityFriends.map(friend => `
      <label><input type="checkbox" value="${escapeHtml(friend.id)}" ${selectedViewerIds.has(friend.id) ? 'checked' : ''}><span>${escapeHtml(friend.name || t('친구', 'Friend', '友達'))}</span></label>`).join('');
    list.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener('change', () => {
      if (input.checked) selectedViewerIds.add(input.value);
      else selectedViewerIds.delete(input.value);
      setFeedback('');
    }));
  }

  function syncVisibilityEditor() {
    const panel = ensureModal().querySelector('#travelog-memo-edit-friend-panel');
    if (panel) panel.hidden = currentVisibility() !== 'friends';
    if (currentVisibility() === 'friends') renderVisibilityFriends();
  }

  async function loadVisibilityFriends() {
    const list = ensureModal().querySelector('#travelog-memo-edit-friend-list');
    if (list) list.innerHTML = `<p>${t('친구 목록을 불러오는 중...', 'Loading friends...', '友達を読み込んでいます...')}</p>`;
    try {
      visibilityFriends = await window.TravelogSupabase?.fetchFriends?.({ requireSession: true, interactiveLogin: true }) || [];
      const acceptedIds = new Set(visibilityFriends.map(friend => friend.id));
      selectedViewerIds = new Set([...selectedViewerIds].filter(id => acceptedIds.has(id)));
    } catch (error) {
      console.warn('[Travelog Memo Edit] Could not load friends:', error);
      visibilityFriends = [];
    }
    renderVisibilityFriends();
  }

  function showEditor(target) {
    const modal = ensureModal();
    currentTarget = target;
    replacementFile = null;
    modal.dataset.busy = 'false';

    const titleWrap = modal.querySelector('#travelog-memo-edit-title-wrap');
    const titleInput = modal.querySelector('#travelog-memo-edit-title-input');
    const contentInput = modal.querySelector('#travelog-memo-edit-content-input');
    const coords = modal.querySelector('#travelog-memo-edit-coords');
    const mediaSection = modal.querySelector('#travelog-memo-edit-media-section');
    const preview = modal.querySelector('#travelog-memo-edit-media-preview');
    const fileInput = modal.querySelector('#travelog-memo-edit-file-input');
    const fileClear = modal.querySelector('#travelog-memo-edit-file-clear');
    const fileName = modal.querySelector('#travelog-memo-edit-file-name');
    const subtitle = modal.querySelector('#travelog-memo-edit-subtitle');
    const visibilitySection = modal.querySelector('#travelog-memo-edit-visibility');

    const isLocal = target.kind === 'local';
    if (visibilitySection) visibilitySection.hidden = isLocal;
    selectedViewerIds = new Set(target.selectedFriendIds || []);
    if (!isLocal) {
      const visibilityRadio = modal.querySelector(`input[name="travelog-memo-edit-visibility"][value="${target.visibility || 'public'}"]`);
      if (visibilityRadio) visibilityRadio.checked = true;
      syncVisibilityEditor();
      loadVisibilityFriends();
    }
    if (titleWrap) titleWrap.hidden = isLocal;
    if (titleInput) titleInput.value = target.title || '';
    if (contentInput) contentInput.value = target.content || '';
    if (coords) {
      const lat = Number(target.lat);
      const lng = Number(target.lng);
      coords.textContent = Number.isFinite(lat) && Number.isFinite(lng)
        ? `${t('위치', 'Location', '位置')}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        : '';
    }
    if (subtitle) {
      subtitle.textContent = isLocal
        ? t('내 위치 텍스트 메모의 내용을 수정합니다.', 'Edit your local text memo.', '現在地のテキストメモを編集します。')
        : `${t('메모 종류', 'Memo type', 'メモ種類')}: ${memoTypeLabel(target.memoType)}`;
    }

    const hasMediaType = ['photo', 'video', 'audio'].includes(target.memoType);
    if (mediaSection) mediaSection.hidden = !hasMediaType;
    if (preview) preview.innerHTML = hasMediaType
      ? buildMediaPreview(target.memoType, target.mediaUrl || '', target.title)
      : '';
    if (fileInput) {
      fileInput.value = '';
      fileInput.accept = mediaAcceptForType(target.memoType);
    }
    if (fileClear) fileClear.hidden = true;
    if (fileName) fileName.textContent = t('기존 미디어 유지', 'Keep current media', '現在のメディアを維持');

    setFeedback('');
    setBusy(false)
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('travelog-memo-edit-open');

    setTimeout(() => {
      (isLocal ? contentInput : titleInput)?.focus();
    }, 70);
  }

  function memoTypeLabel(type) {
    if (type === 'photo') return t('사진 메모', 'Photo memo', '写真メモ');
    if (type === 'video') return t('영상 메모', 'Video memo', '動画メモ');
    if (type === 'audio') return t('음성 메모', 'Audio memo', '音声メモ');
    return t('텍스트 메모', 'Text memo', 'テキストメモ');
  }

  async function getRemoteMemo(pinId) {
    const supabase = window.TravelogSupabase?.getClient?.();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');

    const session = await window.TravelogSupabase?.getSession?.();
    const userId = session?.user?.id || '';
    if (!userId) throw new Error('SUPABASE_AUTH_REQUIRED');

    const { data, error } = await supabase
      .from('memo_pins')
      .select('id, owner_id, title, memo_type, content, latitude, longitude, media_bucket, media_path, media_mime_type, media_size_bytes, visibility, metadata, created_at, updated_at, expires_at')
      .eq('id', pinId)
      .single();

    if (error) throw error;
    if (!data || data.owner_id !== userId) throw new Error('MEMO_EDIT_NOT_OWNER');

    let mediaUrl = '';
    if (data.media_bucket && data.media_path) {
      const signed = await supabase.storage
        .from(data.media_bucket)
        .createSignedUrl(data.media_path, 3600);
      if (!signed.error) mediaUrl = signed.data?.signedUrl || '';
    }

    const selectedFriendIds = data.visibility === 'friends'
      ? await window.TravelogSupabase?.fetchMemoPinViewerIds?.(data.id, { requireSession: true }) || []
      : [];

    return {
      kind: 'remote',
      id: data.id,
      ownerId: data.owner_id,
      title: data.title || '',
      memoType: data.memo_type || 'text',
      content: data.content || '',
      lat: Number(data.latitude),
      lng: Number(data.longitude),
      mediaBucket: data.media_bucket || '',
      mediaPath: data.media_path || '',
      mediaMimeType: data.media_mime_type || '',
      mediaSizeBytes: Number(data.media_size_bytes || 0),
      mediaUrl,
      visibility: ['public', 'friends', 'private'].includes(data.visibility) ? data.visibility : 'public',
      selectedFriendIds,
      metadata: data.metadata || {}
    };
  }

  function getLocalMemo(memoId) {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(LOCAL_MEMO_KEY) || '[]');
    } catch (_) {
      items = [];
    }
    const memo = Array.isArray(items) ? items.find(item => String(item.id) === String(memoId)) : null;
    if (!memo) throw new Error('LOCAL_MEMO_NOT_FOUND');
    return {
      kind: 'local',
      id: memo.id,
      memoType: 'text',
      title: '',
      content: memo.text || '',
      lat: Number(memo.lat),
      lng: Number(memo.lng),
      source: memo
    };
  }

  async function openRemote(pinId) {
    try {
      setGlobalActionBusy(true);
      const target = await getRemoteMemo(pinId);
      showEditor(target);
    } catch (error) {
      console.warn('[Travelog Memo Edit] Could not open remote memo:', error);
      const code = String(error?.message || error?.code || '');
      if (code.includes('NOT_OWNER')) {
        toast(t('내가 작성한 메모만 수정할 수 있습니다.', 'You can edit only your own memo.', '自分のメモだけ編集できます。'));
      } else {
        toast(t('메모 정보를 불러오지 못했습니다.', 'Could not load the memo.', 'メモ情報を読み込めませんでした。'));
      }
    } finally {
      setGlobalActionBusy(false);
    }
  }

  function openLocal(memoId) {
    try {
      showEditor(getLocalMemo(memoId));
    } catch (error) {
      console.warn('[Travelog Memo Edit] Could not open local memo:', error);
      toast(t('메모 정보를 불러오지 못했습니다.', 'Could not load the memo.', 'メモ情報を読み込めませんでした。'));
    }
  }

  function handleReplacementFile(event) {
    const file = event.target.files?.[0] || null;
    if (!file || !currentTarget) return;

    const expected = currentTarget.memoType;
    const valid =
      (expected === 'photo' && file.type.startsWith('image/')) ||
      (expected === 'video' && file.type.startsWith('video/')) ||
      (expected === 'audio' && file.type.startsWith('audio/'));

    if (!valid) {
      event.target.value = '';
      replacementFile = null;
      setFeedback(t('메모 종류에 맞는 파일을 선택해 주세요.', 'Choose a file matching the memo type.', 'メモの種類に合ったファイルを選択してください。'), 'error');
      return;
    }

    const maxBytes = expected === 'photo'
      ? 15 * 1024 * 1024
      : expected === 'audio'
        ? 80 * 1024 * 1024
        : 250 * 1024 * 1024;

    if (file.size > maxBytes) {
      event.target.value = '';
      replacementFile = null;
      setFeedback(
        expected === 'photo'
          ? t('사진은 15MB 이하 파일을 선택해 주세요.', 'Photo must be 15MB or smaller.', '写真は15MB以下にしてください。')
          : expected === 'audio'
            ? t('음성은 80MB 이하 파일을 선택해 주세요.', 'Audio must be 80MB or smaller.', '音声は80MB以下にしてください。')
            : t('영상은 250MB 이하 파일을 선택해 주세요.', 'Video must be 250MB or smaller.', '動画は250MB以下にしてください。'),
        'error'
      );
      return;
    }

    replacementFile = file;
    const modal = ensureModal();
    const preview = modal.querySelector('#travelog-memo-edit-media-preview');
    const fileName = modal.querySelector('#travelog-memo-edit-file-name');
    const clear = modal.querySelector('#travelog-memo-edit-file-clear');

    if (preview) {
      const objectUrl = URL.createObjectURL(file);
      preview.innerHTML = buildMediaPreview(expected, objectUrl, file.name);
      preview.dataset.objectUrl = objectUrl;
    }
    if (fileName) fileName.textContent = `${t('교체 예정', 'Replacement selected', '置換予定')}: ${file.name}`;
    if (clear) clear.hidden = false;
    setFeedback(t('새 파일이 선택되었습니다. 수정 완료를 누르면 교체됩니다.', 'A new file is selected. Save changes to replace it.', '新しいファイルを選択しました。保存すると置き換えられます。'), 'info');
  }

  function clearReplacementFile() {
    replacementFile = null;
    const modal = ensureModal();
    const input = modal.querySelector('#travelog-memo-edit-file-input');
    const preview = modal.querySelector('#travelog-memo-edit-media-preview');
    const fileName = modal.querySelector('#travelog-memo-edit-file-name');
    const clear = modal.querySelector('#travelog-memo-edit-file-clear');

    if (input) input.value = '';
    if (preview) {
      if (preview.dataset.objectUrl) {
        try { URL.revokeObjectURL(preview.dataset.objectUrl); } catch (_) {}
        delete preview.dataset.objectUrl;
      }
      preview.innerHTML = buildMediaPreview(currentTarget?.memoType, currentTarget?.mediaUrl || '', currentTarget?.title || '');
    }
    if (fileName) fileName.textContent = t('기존 미디어 유지', 'Keep current media', '現在のメディアを維持');
    if (clear) clear.hidden = true;
    setFeedback('');
  }

  function fileExtension(file, type) {
    const name = String(file?.name || '');
    const extMatch = name.match(/\.([a-zA-Z0-9]{1,8})$/);
    if (extMatch) return extMatch[1].toLowerCase();

    const mime = String(file?.type || '').toLowerCase();
    if (mime.includes('jpeg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('quicktime')) return 'mov';
    if (mime.includes('mpeg')) return type === 'audio' ? 'mp3' : 'mpeg';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('m4a') || mime.includes('mp4')) return type === 'audio' ? 'm4a' : 'mp4';
    return type === 'photo' ? 'jpg' : type === 'audio' ? 'webm' : 'webm';
  }

  async function saveRemote(target, title, content, visibility, viewerIds) {
    const supabase = window.TravelogSupabase?.getClient?.();
    if (!supabase) throw new Error('SUPABASE_SDK_NOT_READY');

    let session = await window.TravelogSupabase?.getSession?.();
    if (!session?.user?.id && typeof window.TravelogSupabase?.ensureSession === 'function') {
      session = await window.TravelogSupabase.ensureSession({
        displayName: window.TravelogApp?.getState?.()?.userProfile?.nickname || 'Travelog User',
        interactiveLogin: true
      });
    }
    const userId = session?.user?.id || '';
    if (!userId || userId !== target.ownerId) throw new Error('MEMO_EDIT_NOT_OWNER');

    if (typeof window.TravelogSupabase?.setMemoPinVisibility !== 'function') throw new Error('MEMO_VISIBILITY_CLIENT_NOT_READY');
    await window.TravelogSupabase.setMemoPinVisibility(
      target.id,
      visibility,
      viewerIds,
      { requireSession: true, interactiveLogin: true }
    );

    const patch = {
      title: title.slice(0, 60),
      content: content.slice(0, 2000),
      updated_at: new Date().toISOString(),
      metadata: {
        ...(target.metadata && typeof target.metadata === 'object' ? target.metadata : {}),
        last_edited_at: new Date().toISOString()
      }
    };

    let uploaded = null;

    if (replacementFile) {
      const bucket = target.mediaBucket || window.TravelogSupabase?.constants?.MEMO_PIN_MEDIA_BUCKET;
      if (!bucket) throw new Error('MEMO_MEDIA_BUCKET_NOT_READY');

      const ext = fileExtension(replacementFile, target.memoType);
      const newPath = `${userId}/${target.id}/${target.memoType}_${Date.now()}_edit.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(newPath, replacementFile, {
          contentType: replacementFile.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadError) throw uploadError;

      uploaded = { bucket, path: newPath };

      patch.media_bucket = bucket;
      patch.media_path = newPath;
      patch.media_mime_type = replacementFile.type || null;
      patch.media_size_bytes = replacementFile.size || null;
    }

    const { data, error } = await supabase
      .from('memo_pins')
      .update(patch)
      .eq('id', target.id)
      .eq('owner_id', userId)
      .select('id')
      .single();

    if (error) {
      if (uploaded) {
        try {
          await supabase.storage.from(uploaded.bucket).remove([uploaded.path]);
        } catch (_) {}
      }
      throw error;
    }

    if (!data?.id) throw new Error('MEMO_EDIT_UPDATE_EMPTY');

    if (uploaded && target.mediaBucket && target.mediaPath && target.mediaPath !== uploaded.path) {
      try {
        await supabase.storage.from(target.mediaBucket).remove([target.mediaPath]);
      } catch (error) {
        console.warn('[Travelog Memo Edit] Old media cleanup skipped:', error);
      }
    }

    if (window.TravelogMapModule?.loadMemoPins) {
      await window.TravelogMapModule.loadMemoPins({ requireSession: true });
    }
  }

  function saveLocal(target, content) {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(LOCAL_MEMO_KEY) || '[]');
    } catch (_) {
      items = [];
    }

    if (!Array.isArray(items)) items = [];
    const index = items.findIndex(item => String(item.id) === String(target.id));
    if (index < 0) throw new Error('LOCAL_MEMO_NOT_FOUND');

    items[index] = {
      ...items[index],
      text: content.slice(0, 220),
      updatedAt: Date.now()
    };

    localStorage.setItem(LOCAL_MEMO_KEY, JSON.stringify(items));

    // map.js 내부 renderUserMemoMarkers를 간접적으로 다시 호출합니다.
    if (window.TravelogMapModule?.onLanguageChange) {
      window.TravelogMapModule.onLanguageChange(window.TravelogApp?.getState?.()?.language || 'ko');
    }
  }

  async function saveChanges() {
    if (!currentTarget) return;

    const modal = ensureModal();
    const titleInput = modal.querySelector('#travelog-memo-edit-title-input');
    const contentInput = modal.querySelector('#travelog-memo-edit-content-input');
    const title = String(titleInput?.value || '').trim();
    const content = String(contentInput?.value || '').trim();
    const visibility = currentTarget.kind === 'remote' ? currentVisibility() : 'public';
    const viewerIds = [...selectedViewerIds];

    if (currentTarget.kind === 'remote' && !title) {
      setFeedback(t('메모 제목을 입력해 주세요.', 'Enter a memo title.', 'メモタイトルを入力してください。'), 'error');
      titleInput?.focus();
      return;
    }

    if (currentTarget.memoType === 'text' && !content) {
      setFeedback(t('메모 내용을 입력해 주세요.', 'Enter memo content.', 'メモ内容を入力してください。'), 'error');
      contentInput?.focus();
      return;
    }

    if (currentTarget.kind === 'local' && content.length > 220) {
      setFeedback(t('내 위치 메모는 220자 이하로 입력해 주세요.', 'Local memo must be 220 characters or fewer.', '現在地メモは220文字以内で入力してください。'), 'error');
      return;
    }

    if (currentTarget.kind === 'remote' && visibility === 'friends' && viewerIds.length === 0) {
      setFeedback(t('공개할 친구를 한 명 이상 선택해 주세요.', 'Select at least one friend.', '公開する友達を1人以上選択してください。'), 'error');
      return;
    }

    modal.dataset.busy = 'true';
    setBusy(true);
    setFeedback(t('수정 내용을 저장하고 있습니다...', 'Saving your changes...', '変更を保存しています...'), 'info');

    try {
      if (currentTarget.kind === 'remote') {
        await saveRemote(currentTarget, title, content, visibility, viewerIds);
      } else {
        saveLocal(currentTarget, content);
      }

      modal.dataset.busy = 'false';
      setBusy(false);
      closeEditor();

      const detailOverlay = document.getElementById('memo-pin-detail-overlay');
      if (detailOverlay) {
        detailOverlay.classList.remove('active');
        detailOverlay.setAttribute('aria-hidden', 'true');
      }

      toast(t('메모 수정이 완료되었습니다.', 'Memo updated.', 'メモを更新しました。'));
    } catch (error) {
      console.warn('[Travelog Memo Edit] Save failed:', error);
      modal.dataset.busy = 'false';
      setBusy(false);

      const message = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toUpperCase();

      if (message.includes('ROW LEVEL SECURITY') || message.includes('42501') || message.includes('RLS')) {
        setFeedback(
          t(
            'Supabase 수정 권한(RLS)이 없습니다. TRAVELOG_MEMO_PERMISSION_FIX_V2.sql을 Supabase SQL Editor에서 한 번 실행해 주세요.',
            'Supabase update permission (RLS) is missing. Run the included SQL once.',
            'Supabaseの更新権限(RLS)がありません。同梱SQLを一度実行してください。'
          ),
          'error'
        );
      } else if (message.includes('NOT_OWNER')) {
        setFeedback(t('내가 작성한 메모만 수정할 수 있습니다.', 'You can edit only your own memo.', '自分のメモだけ編集できます。'), 'error');
      } else if (message.includes('MEMO_VIEWER')) {
        setFeedback(t('친구 공개 메모는 수락된 친구를 한 명 이상 선택해야 합니다.', 'Select at least one accepted friend.', '承認済みの友達を1人以上選択してください。'), 'error');
      } else {
        setFeedback(
          t(
            `수정하지 못했습니다. ${error?.message || '잠시 후 다시 시도해 주세요.'}`,
            `Could not save changes. ${error?.message || 'Please try again.'}`,
            `変更を保存できませんでした。${error?.message || 'もう一度お試しください。'}`
          ),
          'error'
        );
      }
    }
  }

  function parseRemoteIdFromActionContainer(container) {
    const action = Array.from(container.querySelectorAll('button')).find(button => {
      const onclick = button.getAttribute('onclick') || '';
      return onclick.includes('deleteRemoteMemoPin') || onclick.includes('openMemoPinExtension');
    });
    if (!action) return '';
    const onclick = action.getAttribute('onclick') || '';
    const match = onclick.match(/(?:deleteRemoteMemoPin|openMemoPinExtension)\(['"]([^'"]+)['"]\)/);
    return match?.[1] || '';
  }

  function parseLocalIdFromDeleteButton(button) {
    const onclick = button.getAttribute('onclick') || '';
    const match = onclick.match(/TravelogMapModule\.deleteMemo\(['"]([^'"]+)['"]\)/);
    return match?.[1] || '';
  }

  function decorateRemoteActions(root = document) {
    const containers = root.querySelectorAll?.('.memo-pin-popup-actions') || [];
    containers.forEach(container => {
      if (container.querySelector('[data-travelog-memo-edit-remote]')) return;

      const pinId = parseRemoteIdFromActionContainer(container);
      if (!pinId) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.travelogMemoEditRemote = 'true';
      button.className = 'travelog-memo-edit-inline-btn';
      button.innerHTML = `<i class="fa-solid fa-pen" aria-hidden="true"></i> ${t('수정하기', 'Edit', '編集')}`;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openRemote(pinId);
      });

      const deleteButton = Array.from(container.querySelectorAll('button')).find(btn => (btn.getAttribute('onclick') || '').includes('deleteRemoteMemoPin'));
      if (deleteButton) container.insertBefore(button, deleteButton);
      else container.appendChild(button);
    });
  }

  function decorateLocalActions(root = document) {
    const deleteButtons = root.querySelectorAll?.('.memo-delete-btn') || [];
    deleteButtons.forEach(deleteButton => {
      const parent = deleteButton.parentElement;
      if (!parent || parent.querySelector('[data-travelog-memo-edit-local]')) return;

      const memoId = parseLocalIdFromDeleteButton(deleteButton);
      if (!memoId) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.travelogMemoEditLocal = 'true';
      button.className = 'travelog-memo-edit-local-btn';
      button.innerHTML = `<i class="fa-solid fa-pen" aria-hidden="true"></i> ${t('수정', 'Edit', '編集')}`;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openLocal(memoId);
      });

      parent.insertBefore(button, deleteButton);
    });
  }

  function scan(root = document) {
    if (!root?.querySelectorAll) return;
    decorateRemoteActions(root);
    decorateLocalActions(root);

    if (root.matches?.('.memo-pin-popup-actions')) decorateRemoteActions(root.parentElement || document);
    if (root.matches?.('.memo-delete-btn')) decorateLocalActions(root.parentElement || document);
  }

  function setGlobalActionBusy(busy) {
    document.querySelectorAll('.travelog-memo-edit-inline-btn, .travelog-memo-edit-local-btn').forEach(button => {
      button.disabled = busy;
    });
  }

  function init() {
    ensureModal();
    scan(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) scan(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.TravelogMemoEdit = {
      openRemote,
      openLocal,
      close: closeEditor
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
