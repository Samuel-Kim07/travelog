// ==========================================
// Travelog GitHub Media Storage Module
// Uploads playable, optimized media source files directly to GitHub folders.
// ZIP is intentionally NOT used so other users can open/listen/watch files directly.
// ==========================================

const TravelogMediaStorageModule = (() => {
  const STORAGE_KEY = 'travelog_github_media_storage_v2';
  const TOKEN_KEY = 'travelog_github_token_test_v1';
  const DEFAULT_CONFIG = {
    owner: 'Samuel-Kim07',
    repo: 'travelog',
    branch: 'main',
    audioDir: 'assets/icons/Audio',
    videoDir: 'assets/icons/Video'
  };

  let config = { ...DEFAULT_CONFIG };

  function t(ko, en, ja) {
    return window.TravelogApp && typeof window.TravelogApp.t === 'function' ? window.TravelogApp.t(ko, en, ja) : ko;
  }

  function init() {
    loadConfig();
    bindControls();
    renderConfig();
    log(t(
      'GitHub 미디어 저장소 준비 완료: ZIP이 아니라 재생 가능한 원본 미디어 파일로 직접 저장합니다.',
      'GitHub media storage is ready: files are uploaded directly as playable media, not ZIP packages.',
      'GitHubメディア保存先の準備ができました：ZIPではなく再生可能なメディアファイルとして直接保存します。'
    ));
  }

  function bindControls() {
    document.getElementById('github-token-save-btn')?.addEventListener('click', saveTokenFromInput);
    document.getElementById('github-token-clear-btn')?.addEventListener('click', clearToken);
    document.getElementById('github-connection-test-btn')?.addEventListener('click', testConnection);
    document.getElementById('upload-audio-file-btn')?.addEventListener('click', () => uploadSelectedFile('audio'));
    document.getElementById('upload-video-file-btn')?.addEventListener('click', () => uploadSelectedFile('video'));
  }

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      config = { ...DEFAULT_CONFIG, ...saved };
    } catch (error) {
      config = { ...DEFAULT_CONFIG };
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function saveTokenFromInput() {
    const input = document.getElementById('github-token-input');
    const token = input?.value?.trim() || '';
    if (!token) {
      log(t('토큰을 입력해 주세요.', 'Please enter a token.', 'トークンを入力してください。'), 'error');
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
    if (input) input.value = '';
    renderConfig();
    log(t(
      '테스트용 토큰을 이 브라우저에 저장했습니다. 실제 서비스에서는 서버 저장 방식이 필요합니다.',
      'Saved the test token in this browser. Production should use a server-side secret flow.',
      'テスト用トークンをこのブラウザに保存しました。本番ではサーバー側の秘密情報管理が必要です。'
    ), 'success');
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    renderConfig();
    log(t('저장된 GitHub 토큰을 삭제했습니다.', 'Removed the saved GitHub token.', '保存されたGitHubトークンを削除しました。'), 'success');
  }

  function renderConfig() {
    const tokenStatus = document.getElementById('github-token-status');
    const repoPath = document.getElementById('github-repo-path');
    const audioPath = document.getElementById('github-audio-path');
    const videoPath = document.getElementById('github-video-path');

    if (tokenStatus) {
      tokenStatus.textContent = getToken()
        ? t('토큰 저장됨', 'Token saved', 'トークン保存済み')
        : t('토큰 없음', 'No token', 'トークンなし');
      tokenStatus.className = getToken() ? 'storage-status-pill connected' : 'storage-status-pill';
    }
    if (repoPath) repoPath.textContent = `${config.owner}/${config.repo} · ${config.branch}`;
    if (audioPath) audioPath.textContent = config.audioDir;
    if (videoPath) videoPath.textContent = config.videoDir;
  }

  async function testConnection() {
    const token = getToken();
    if (!token) {
      log(t('먼저 GitHub 토큰을 저장해 주세요.', 'Save a GitHub token first.', '先にGitHubトークンを保存してください。'), 'error');
      return;
    }

    const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents`;
    try {
      const response = await fetch(endpoint, { headers: makeHeaders(token) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      log(t('GitHub 저장소 연결 확인 완료', 'GitHub repository connection confirmed.', 'GitHubリポジトリ接続を確認しました。'), 'success');
    } catch (error) {
      log(t(`연결 테스트 실패: ${error.message}`, `Connection test failed: ${error.message}`, `接続テスト失敗: ${error.message}`), 'error');
    }
  }

  function makeHeaders(token) {
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  async function uploadSelectedFile(kind) {
    const input = document.getElementById(kind === 'audio' ? 'media-audio-file' : 'media-video-file');
    const file = input?.files?.[0];
    if (!file) {
      log(kind === 'audio'
        ? t('업로드할 음성 파일을 선택해 주세요.', 'Please choose an audio file.', 'アップロードする音声ファイルを選択してください。')
        : t('업로드할 영상 파일을 선택해 주세요.', 'Please choose a video file.', 'アップロードする動画ファイルを選択してください。'), 'error');
      return;
    }

    const expectedPrefix = kind === 'audio' ? 'audio/' : 'video/';
    if (file.type && !file.type.startsWith(expectedPrefix)) {
      log(t(
        '선택한 파일 형식이 맞지 않을 수 있습니다. 그래도 직접 업로드를 시도합니다.',
        'The selected file type may not match. Trying direct upload anyway.',
        '選択したファイル形式が一致しない可能性があります。そのまま直接アップロードを試します。'
      ), 'error');
    }

    const metadata = {
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      source: 'manual-file-select',
      createdAt: new Date().toISOString()
    };

    if (kind === 'audio') {
      await autoUploadAudio(file, metadata);
    } else {
      await autoUploadVideo(file, metadata);
    }
  }

  async function autoUploadAudio(blob, metadata = {}) {
    return uploadPlayableMedia('audio', blob, metadata);
  }

  async function autoUploadVideo(blob, metadata = {}) {
    return uploadPlayableMedia('video', blob, metadata);
  }

  async function uploadPlayableMedia(kind, blob, metadata = {}) {
    const token = getToken();
    const dir = kind === 'audio' ? config.audioDir : config.videoDir;
    const ext = getExtension(metadata.originalName || metadata.extension || blob.type || '', kind);
    const stamp = makeDateStamp();
    const baseName = makeBaseFileName(kind, stamp, metadata.title || metadata.originalName || 'travelog-media');
    const remoteFileName = `${baseName}.${ext}`;
    const remotePath = `${dir}/${remoteFileName}`;
    const remoteMetaPath = `${dir}/${baseName}.json`;

    const mediaMetadata = {
      app: 'Travelog',
      kind,
      repository: `${config.owner}/${config.repo}`,
      targetDirectory: dir,
      mediaPath: remotePath,
      playableRawUrl: makeRawUrl(remotePath),
      createdAt: new Date().toISOString(),
      fileSizeBytes: blob.size,
      mimeType: blob.type || metadata.mimeType || '',
      ...metadata
    };

    if (!token) {
      downloadBlob(blob, remoteFileName);
      downloadBlob(new Blob([JSON.stringify(mediaMetadata, null, 2)], { type: 'application/json' }), `${baseName}.json`);
      log(t(
        'GitHub 토큰이 없어 재생 가능한 미디어 파일과 메타데이터 JSON을 기기에 다운로드했습니다.',
        'No GitHub token. Downloaded the playable media file and metadata JSON to this device.',
        'GitHubトークンがないため、再生可能なメディアファイルとメタデータJSONを端末にダウンロードしました。'
      ), 'error');
      return { uploaded: false, path: remotePath, rawUrl: makeRawUrl(remotePath) };
    }

    log(t(
      `${kind === 'audio' ? '음성' : '영상'} 파일 직접 업로드 중: ${remotePath}`,
      `Uploading ${kind} file directly: ${remotePath}`,
      `${kind === 'audio' ? '音声' : '動画'}ファイルを直接アップロード中：${remotePath}`
    ));

    try {
      const mediaResult = await uploadBlobToGitHub(blob, remotePath, `Add Travelog ${kind} media ${stamp}`);
      const metaBlob = new Blob([JSON.stringify(mediaMetadata, null, 2)], { type: 'application/json' });
      await uploadBlobToGitHub(metaBlob, remoteMetaPath, `Add Travelog ${kind} metadata ${stamp}`);
      const rawUrl = makeRawUrl(remotePath);
      log(t(`업로드 완료: ${remotePath}`, `Upload complete: ${remotePath}`, `アップロード完了：${remotePath}`), 'success');
      logMediaPreview(kind, rawUrl, remoteFileName);
      window.TravelogApp?.showToast?.(t('GitHub 저장소에 재생 가능한 파일로 저장 완료', 'Saved as a playable file in GitHub storage.', 'GitHub保存先に再生可能ファイルとして保存完了'));
      return { uploaded: true, path: remotePath, metadataPath: remoteMetaPath, rawUrl, result: mediaResult };
    } catch (error) {
      log(t(`GitHub 업로드 실패: ${error.message}`, `GitHub upload failed: ${error.message}`, `GitHubアップロード失敗：${error.message}`), 'error');
      downloadBlob(blob, remoteFileName);
      throw error;
    }
  }

  async function uploadBlobToGitHub(blob, path, message) {
    const token = getToken();
    const content = await blobToBase64(blob);
    const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: makeHeaders(token),
      body: JSON.stringify({
        message,
        content,
        branch: config.branch
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.message || `${response.status} ${response.statusText}`;
      throw new Error(detail);
    }
    return data;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result || '';
        resolve(String(dataUrl).split(',')[1] || '');
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  }

  function encodePath(path) {
    return path.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function getExtension(value, kind) {
    const raw = String(value || '').toLowerCase();
    if (raw.includes('.')) {
      const ext = raw.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (ext) return normalizeExtension(ext, kind);
    }
    if (raw.includes('audio/webm') || raw.includes('video/webm')) return 'webm';
    if (raw.includes('audio/ogg')) return 'ogg';
    if (raw.includes('audio/mp4')) return 'm4a';
    if (raw.includes('audio/mpeg') || raw.includes('audio/mp3')) return 'mp3';
    if (raw.includes('audio/wav') || raw.includes('audio/x-wav')) return 'wav';
    if (raw.includes('video/mp4')) return 'mp4';
    if (raw.includes('video/quicktime')) return 'mov';
    if (raw.includes('text/plain')) return 'txt';
    if (/^[a-z0-9]+$/i.test(raw)) return normalizeExtension(raw, kind);
    return kind === 'audio' ? 'webm' : 'mp4';
  }

  function normalizeExtension(ext, kind) {
    const normalized = ext.replace(/[^a-z0-9]/g, '').toLowerCase();
    if (!normalized) return kind === 'audio' ? 'webm' : 'mp4';
    if (normalized === 'mpeg') return 'mp3';
    if (normalized === 'mp4' && kind === 'audio') return 'm4a';
    return normalized;
  }

  function makeBaseFileName(kind, stamp, title) {
    const safeTitle = sanitizeSlug(title).slice(0, 28) || 'guide';
    return `travelog_${kind}_${stamp}_${safeTitle}_${randomId()}`;
  }

  function sanitizeSlug(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9가-힣ぁ-んァ-ン一-龥]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  function makeRawUrl(path) {
    return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  function makeDateStamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  function randomId() {
    return Math.random().toString(36).slice(2, 8);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function log(message, type = 'info') {
    const el = document.getElementById('github-upload-log');
    if (!el) return;
    const row = document.createElement('div');
    row.className = `upload-log-row ${type}`;
    row.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    el.prepend(row);
    while (el.children.length > 10) el.removeChild(el.lastChild);
  }

  function logMediaPreview(kind, rawUrl, filename) {
    const el = document.getElementById('github-upload-log');
    if (!el) return;
    const row = document.createElement('div');
    row.className = 'upload-log-row success media-preview-row';
    const label = t('바로 재생 확인', 'Preview playable file', '再生プレビュー');
    row.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px;">${filename}</div>
      ${kind === 'audio'
        ? `<audio controls preload="none" src="${rawUrl}" style="width:100%;"></audio>`
        : `<video controls preload="metadata" src="${rawUrl}" style="width:100%; max-height:180px; border-radius:12px;"></video>`}
      <a href="${rawUrl}" target="_blank" rel="noopener" style="display:inline-block; margin-top:6px; font-size:12px;">${label}</a>
    `;
    el.prepend(row);
    while (el.children.length > 10) el.removeChild(el.lastChild);
  }

  return {
    init,
    onLanguageChange: renderConfig,
    autoUploadAudio,
    autoUploadVideo,
    uploadSelectedFile,
    testConnection
  };
})();

window.TravelogMediaStorageModule = TravelogMediaStorageModule;
