// ==========================================
// Travelog Device Storage Module
// - First-run device storage setup
// - Saves generated Audio / Video / Text data to the approved place when supported
// - Falls back to the browser's app-internal storage on mobile browsers that cannot open a writable folder picker
// ==========================================

const TravelogDeviceStorage = (() => {
  const DB_NAME = 'travelog_device_storage_v1';
  const DB_VERSION = 1;
  const HANDLE_STORE = 'handles';
  const FILE_STORE = 'files';
  const ROOT_HANDLE_KEY = 'rootDirectoryHandle';
  const STATUS_KEY = 'travelog_device_storage_status_v1';
  const DATA_FOLDER_NAME = 'Travelog_user_data';
  const FOLDER_NAMES = {
    Audio: 'Audio',
    Video: 'Video',
    Text: 'Text'
  };

  let rootHandle = null;
  let dataHandle = null;
  let folderHandles = { Audio: null, Video: null, Text: null };
  let currentStatus = loadStatus();

  function t(ko, en, ja) {
    return window.TravelogApp && typeof window.TravelogApp.t === 'function' ? window.TravelogApp.t(ko, en, ja) : ko;
  }

  function loadStatus() {
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      return raw ? JSON.parse(raw) : { configured: false, mode: 'none' };
    } catch (error) {
      return { configured: false, mode: 'none' };
    }
  }

  function saveStatus(status) {
    currentStatus = {
      ...currentStatus,
      ...status,
      dataFolderName: DATA_FOLDER_NAME,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(STATUS_KEY, JSON.stringify(currentStatus));
    } catch (error) {
      console.warn('[Travelog Device Storage] Status could not be saved.', error);
    }
    renderStatusUI();
    return currentStatus;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('INDEXEDDB_UNSUPPORTED'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(HANDLE_STORE)) {
          db.createObjectStore(HANDLE_STORE);
        }
        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    });
  }

  async function idbGet(storeName, key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB get failed'));
      tx.oncomplete = () => db.close();
    });
  }

  async function idbPut(storeName, value, key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = key === undefined ? store.put(value) : store.put(value, key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB put failed'));
      tx.oncomplete = () => db.close();
    });
  }

  async function verifyPermission(handle, readWrite = true, ask = false) {
    if (!handle || typeof handle.queryPermission !== 'function') return true;
    const options = readWrite ? { mode: 'readwrite' } : { mode: 'read' };
    const query = await handle.queryPermission(options);
    if (query === 'granted') return true;
    if (!ask || typeof handle.requestPermission !== 'function') return false;
    const request = await handle.requestPermission(options);
    return request === 'granted';
  }

  async function getOrCreateDirectory(parent, name) {
    return parent.getDirectoryHandle(name, { create: true });
  }

  async function ensureFolderStructure(baseHandle) {
    dataHandle = await getOrCreateDirectory(baseHandle, DATA_FOLDER_NAME);
    folderHandles.Audio = await getOrCreateDirectory(dataHandle, FOLDER_NAMES.Audio);
    folderHandles.Video = await getOrCreateDirectory(dataHandle, FOLDER_NAMES.Video);
    folderHandles.Text = await getOrCreateDirectory(dataHandle, FOLDER_NAMES.Text);
    return { dataHandle, folderHandles };
  }

  async function writeBlobToHandle(directoryHandle, fileName, blob) {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  function getKindFolder(kind) {
    if (kind === 'audio' || kind === 'Audio') return 'Audio';
    if (kind === 'video' || kind === 'Video') return 'Video';
    if (kind === 'text' || kind === 'Text') return 'Text';
    return 'Root';
  }

  async function loadPersistedDirectoryHandle(askPermission = false) {
    try {
      const handle = await idbGet(HANDLE_STORE, ROOT_HANDLE_KEY);
      if (!handle) return false;
      const ok = await verifyPermission(handle, true, askPermission);
      if (!ok) return false;
      rootHandle = handle;
      await ensureFolderStructure(rootHandle);
      saveStatus({
        configured: true,
        mode: 'directory',
        selectedFolderName: rootHandle.name || t('선택한 저장 위치', 'Selected folder', '選択した保存先')
      });
      return true;
    } catch (error) {
      console.warn('[Travelog Device Storage] Could not restore folder handle.', error);
      return false;
    }
  }

  async function setupOpfsFallback(reason = '') {
    if (!navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
      saveStatus({
        configured: true,
        mode: 'indexeddb',
        selectedFolderName: t('브라우저 내부 저장소', 'Browser internal storage', 'ブラウザ内部保存先'),
        fallbackReason: reason || 'OPFS_UNSUPPORTED'
      });
      return currentStatus;
    }

    const opfsRoot = await navigator.storage.getDirectory();
    rootHandle = opfsRoot;
    await ensureFolderStructure(rootHandle);
    saveStatus({
      configured: true,
      mode: 'opfs',
      selectedFolderName: t('앱 내부 기기 저장소', 'App device storage', 'アプリ内部端末保存先'),
      fallbackReason: reason || 'DIRECTORY_PICKER_UNSUPPORTED'
    });
    return currentStatus;
  }

  async function useInternalStorage(reason = 'USER_SELECTED_INTERNAL_STORAGE') {
    return setupOpfsFallback(reason);
  }

  async function configureFromUserGesture() {
    if (typeof window.showDirectoryPicker === 'function') {
      const selectedHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        id: 'travelog-user-data',
        startIn: 'documents'
      });
      const ok = await verifyPermission(selectedHandle, true, true);
      if (!ok) throw new Error('DIRECTORY_PERMISSION_DENIED');

      rootHandle = selectedHandle;
      await ensureFolderStructure(rootHandle);
      await writeBlobToHandle(dataHandle, 'storage_ready.txt', new Blob([
        'Travelog device storage is ready.\n',
        `createdAt=${new Date().toISOString()}\n`,
        'folders=Audio,Video,Text\n'
      ], { type: 'text/plain;charset=utf-8' }));

      try {
        await idbPut(HANDLE_STORE, rootHandle, ROOT_HANDLE_KEY);
      } catch (error) {
        console.warn('[Travelog Device Storage] Folder handle could not be persisted.', error);
      }

      saveStatus({
        configured: true,
        mode: 'directory',
        selectedFolderName: selectedHandle.name || t('선택한 저장 위치', 'Selected folder', '選択した保存先'),
        fallbackReason: ''
      });
      return currentStatus;
    }

    // Mobile browsers often cannot expose a user-chosen writable folder.
    // In that case, save to app-internal device storage so publish can still upload directly to Drive.
    return setupOpfsFallback('DIRECTORY_PICKER_UNSUPPORTED');
  }

  async function init() {
    const restored = await loadPersistedDirectoryHandle(false);
    if (!restored && currentStatus?.configured && currentStatus.mode === 'opfs') {
      try {
        await setupOpfsFallback('RESTORED_OPFS');
      } catch (error) {
        console.warn('[Travelog Device Storage] OPFS restore failed.', error);
      }
    }
    renderStatusUI();
    return currentStatus;
  }

  async function ensureReady() {
    if (currentStatus?.configured) {
      if (currentStatus.mode === 'directory' && (!rootHandle || !dataHandle)) {
        const restored = await loadPersistedDirectoryHandle(true);
        if (restored) return currentStatus;
      }
      if (currentStatus.mode === 'opfs' && (!rootHandle || !dataHandle)) {
        return setupOpfsFallback('RESTORED_OPFS');
      }
      return currentStatus;
    }
    return setupOpfsFallback('AUTO_INTERNAL_STORAGE');
  }

  async function persistInIndexedDb(kind, fileName, blob, metadata = {}) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}-${fileName}`;
    await idbPut(FILE_STORE, {
      id,
      kind,
      fileName,
      blob,
      metadata,
      createdAt: new Date().toISOString()
    });
    return { id, mode: 'indexeddb', fileName, kind };
  }

  async function saveGeneratedFile(kind, fileName, blob, metadata = {}) {
    const folderKind = getKindFolder(kind);
    const safeBlob = blob instanceof Blob ? blob : new Blob([String(blob || '')], { type: 'text/plain;charset=utf-8' });
    await ensureReady();

    try {
      if ((currentStatus.mode === 'directory' || currentStatus.mode === 'opfs') && dataHandle) {
        const targetHandle = folderKind === 'Root' ? dataHandle : folderHandles[folderKind];
        if (!targetHandle) throw new Error('TARGET_FOLDER_NOT_READY');
        await writeBlobToHandle(targetHandle, fileName, safeBlob);
        return { mode: currentStatus.mode, folder: folderKind, fileName };
      }
    } catch (error) {
      console.warn('[Travelog Device Storage] Direct write failed. Falling back to IndexedDB.', error);
      saveStatus({
        configured: true,
        mode: 'indexeddb',
        selectedFolderName: t('브라우저 내부 저장소', 'Browser internal storage', 'ブラウザ内部保存先'),
        fallbackReason: error.message || 'WRITE_FAILED'
      });
    }

    return persistInIndexedDb(folderKind, fileName, safeBlob, metadata);
  }

  async function savePublishPackage(packageData) {
    await ensureReady();

    for (const file of packageData.audioFiles || []) {
      await saveGeneratedFile('Audio', file.fileName, file.blob, file);
    }
    for (const file of packageData.videoFiles || []) {
      await saveGeneratedFile('Video', file.fileName, file.blob, file);
    }
    for (const file of packageData.textFiles || []) {
      await saveGeneratedFile('Text', file.fileName, file.blob, file);
    }
    for (const file of packageData.rootFiles || []) {
      await saveGeneratedFile('Root', file.fileName, file.blob, { source: 'publish-package' });
    }

    return {
      selectedFolderName: currentStatus.selectedFolderName || t('기기 저장소', 'Device storage', '端末保存先'),
      dataFolderName: DATA_FOLDER_NAME,
      mode: currentStatus.mode || 'indexeddb'
    };
  }

  function getStatus() {
    return { ...currentStatus };
  }

  function getStatusLabel() {
    if (!currentStatus?.configured) {
      return t('아직 저장 위치가 지정되지 않았습니다.', 'Storage location is not set yet.', '保存先が未設定です。');
    }
    if (currentStatus.mode === 'directory') {
      return t(
        `${currentStatus.selectedFolderName} / ${DATA_FOLDER_NAME} 사용 중`,
        `Using ${currentStatus.selectedFolderName} / ${DATA_FOLDER_NAME}`,
        `${currentStatus.selectedFolderName} / ${DATA_FOLDER_NAME} 使用中`
      );
    }
    if (currentStatus.mode === 'opfs') {
      return t('모바일 제한으로 앱 내부 기기 저장소에 저장 중입니다.', 'Using app-internal device storage because this mobile browser limits folder selection.', 'モバイル制限のためアプリ内部保存先を使用中です。');
    }
    return t('브라우저 내부 저장소에 저장 중입니다.', 'Using browser internal storage.', 'ブラウザ内部保存先を使用中です。');
  }

  function renderStatusUI() {
    const statusEl = document.getElementById('device-storage-status');
    const publishStatusEl = document.getElementById('publish-device-storage-status');
    const selectBtn = document.getElementById('device-storage-select-btn');
    const label = getStatusLabel();

    if (statusEl) {
      statusEl.textContent = label;
      statusEl.style.color = currentStatus?.configured ? '#557E3F' : '#A34E54';
    }
    if (publishStatusEl) {
      publishStatusEl.textContent = label;
    }
    if (selectBtn) {
      selectBtn.innerHTML = currentStatus?.configured
        ? '<i class="fa-solid fa-folder-open"></i> 저장 위치 다시 지정'
        : '<i class="fa-solid fa-folder-plus"></i> 저장 위치 지정하기';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    init();
  });

  return {
    init,
    configureFromUserGesture,
    useInternalStorage,
    saveGeneratedFile,
    savePublishPackage,
    getStatus,
    renderStatusUI,
    isUserDirectorySupported: () => typeof window.showDirectoryPicker === 'function'
  };
})();

window.TravelogDeviceStorage = TravelogDeviceStorage;
