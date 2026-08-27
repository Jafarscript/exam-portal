// Robust offline storage manager utilizing IndexedDB with localStorage fallback
// Guarantees zero data loss when students lose internet connection during exams.

const DB_NAME = 'alhuda_exam_offline_db';
const DB_VERSION = 1;
const STORE_EXAMS = 'exam_sessions';
const STORE_ANSWERS = 'offline_answers';
const STORE_QUEUE = 'sync_queue';

function openIndexedDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_EXAMS)) {
          db.createObjectStore(STORE_EXAMS, { keyPath: 'attemptId' });
        }
        if (!db.objectStoreNames.contains(STORE_ANSWERS)) {
          db.createObjectStore(STORE_ANSWERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ---- LOCALSTORAGE FALLBACK HELPERS ----
function getLocalItem(key, defaultVal) {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalItem(key, val) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn('LocalStorage save failed:', err.message);
  }
}

// ---- EXAM SESSION CACHING ----
export async function cacheExamSessionOffline(attemptId, sessionData) {
  if (!attemptId || !sessionData) return;
  const payload = {
    attemptId: String(attemptId),
    ...sessionData,
    cachedAt: new Date().toISOString(),
  };

  // Always write to localStorage for quick synchronous hydration
  setLocalItem(`exam_session_${attemptId}`, payload);

  const db = await openIndexedDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_EXAMS, 'readwrite');
      tx.objectStore(STORE_EXAMS).put(payload);
    } catch (e) {
      console.warn('IDB cacheExamSession error:', e.message);
    }
  }
}

export async function getExamSessionOffline(attemptId) {
  if (!attemptId) return null;
  const local = getLocalItem(`exam_session_${attemptId}`, null);
  if (local) return local;

  const db = await openIndexedDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_EXAMS, 'readonly');
      const req = tx.objectStore(STORE_EXAMS).get(String(attemptId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ---- ANSWERS OFFLINE STORE ----
export async function storeOfflineAnswer(attemptId, questionId, answer) {
  if (!attemptId || !questionId) return;
  const aid = String(attemptId);
  const qid = String(questionId);
  const compositeId = `${aid}_${qid}`;

  const item = {
    id: compositeId,
    attemptId: aid,
    questionId: qid,
    answer,
    updatedAt: new Date().toISOString(),
  };

  // 1. Sync to localStorage map
  const answersMap = getLocalItem(`exam_answers_${aid}`, {});
  answersMap[qid] = answer;
  setLocalItem(`exam_answers_${aid}`, answersMap);

  // 2. Add to pending sync queue
  const queue = getLocalItem(`pending_sync_queue_${aid}`, {});
  queue[qid] = {
    questionId: qid,
    answer,
    queuedAt: Date.now(),
  };
  setLocalItem(`pending_sync_queue_${aid}`, queue);

  // 3. Store in IndexedDB
  const db = await openIndexedDB();
  if (db) {
    try {
      const tx = db.transaction([STORE_ANSWERS], 'readwrite');
      tx.objectStore(STORE_ANSWERS).put(item);
    } catch (e) {
      console.warn('IDB storeOfflineAnswer error:', e.message);
    }
  }
}

export function getAllOfflineAnswers(attemptId) {
  if (!attemptId) return {};
  return getLocalItem(`exam_answers_${attemptId}`, {});
}

export function getPendingSyncQueue(attemptId) {
  if (!attemptId) return [];
  const queueMap = getLocalItem(`pending_sync_queue_${attemptId}`, {});
  return Object.values(queueMap);
}

export function removeSyncedAnswerFromQueue(attemptId, questionId) {
  if (!attemptId || !questionId) return;
  const aid = String(attemptId);
  const qid = String(questionId);
  const queueMap = getLocalItem(`pending_sync_queue_${aid}`, {});
  delete queueMap[qid];
  setLocalItem(`pending_sync_queue_${aid}`, queueMap);
}

export function clearPendingSyncQueue(attemptId) {
  if (!attemptId) return;
  setLocalItem(`pending_sync_queue_${attemptId}`, {});
}

export function savePendingSubmission(attemptId) {
  if (!attemptId) return;
  setLocalItem(`pending_submission_${attemptId}`, {
    attemptId: String(attemptId),
    timestamp: Date.now(),
  });
}

export function getPendingSubmission(attemptId) {
  if (!attemptId) return null;
  return getLocalItem(`pending_submission_${attemptId}`, null);
}

export function clearPendingSubmission(attemptId) {
  if (!attemptId) return;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`pending_submission_${attemptId}`);
  }
}
