'use client';

const DATABASE_NAME = 'mearrow-visual-match';
const DATABASE_VERSION = 1;
const IMAGE_STORE_NAME = 'pending-images';
const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredVisualMatchImage {
  blob: Blob;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IMAGE_LOCAL_STORAGE_UNAVAILABLE'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        request.result.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IMAGE_LOCAL_STORAGE_OPEN_FAILED'));
  });
}

function storageError(fallback: string, error: unknown) {
  return error instanceof Error ? error : new Error(fallback);
}

function deleteExpiredImages(store: IDBObjectStore) {
  const cutoff = Date.now() - IMAGE_TTL_MS;
  const cursorRequest = store.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) return;

    const record = cursor.value as StoredVisualMatchImage;
    if (record.createdAt < cutoff) cursor.delete();
    cursor.continue();
  };
}

export async function saveVisualMatchImage(storageKey: string, file: Blob): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE_NAME);

      store.put({ blob: file, createdAt: Date.now() } satisfies StoredVisualMatchImage, storageKey);
      deleteExpiredImages(store);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(storageError('IMAGE_LOCAL_STORAGE_SAVE_FAILED', transaction.error));
      transaction.onabort = () => reject(storageError('IMAGE_LOCAL_STORAGE_SAVE_ABORTED', transaction.error));
    });
  } finally {
    database.close();
  }
}

export async function cleanupExpiredVisualMatchImages(): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, 'readwrite');
      deleteExpiredImages(transaction.objectStore(IMAGE_STORE_NAME));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(storageError('IMAGE_LOCAL_STORAGE_CLEANUP_FAILED', transaction.error));
      transaction.onabort = () => reject(storageError('IMAGE_LOCAL_STORAGE_CLEANUP_ABORTED', transaction.error));
    });
  } finally {
    database.close();
  }
}

export async function getVisualMatchImage(storageKey: string): Promise<Blob | null> {
  if (!storageKey) return null;

  const database = await openDatabase();

  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(IMAGE_STORE_NAME).get(storageKey);
      request.onsuccess = () => {
        const record = request.result as StoredVisualMatchImage | undefined;
        resolve(record?.blob ?? null);
      };
      request.onerror = () => reject(storageError('IMAGE_LOCAL_STORAGE_READ_FAILED', request.error));
    });
  } finally {
    database.close();
  }
}

export async function removeVisualMatchImage(storageKey: string): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE_NAME, 'readwrite');
      const request = transaction.objectStore(IMAGE_STORE_NAME).delete(storageKey);
      request.onerror = () => reject(storageError('IMAGE_LOCAL_STORAGE_DELETE_FAILED', request.error));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(storageError('IMAGE_LOCAL_STORAGE_DELETE_FAILED', transaction.error));
    });
  } finally {
    database.close();
  }
}
