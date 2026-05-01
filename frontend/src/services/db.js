import { openDB } from 'idb';

const getDBName = () => {
    const user = sessionStorage.getItem('currentUser');
    if (user) {
        try {
            return `OfflinePayDB_${JSON.parse(user).phone}`;
        } catch(e) {}
    }
    return 'OfflinePayDB';
};

const DB_VERSION = 4;

export const STORES = {
    PENDING: 'pendingTransactions',
    WALLET: 'wallet',
    NOTIFICATIONS: 'notifications',
    HISTORY: 'transactions',
    USED_TOKENS: 'usedTokens',
    USERS: 'users',
    SECURITY: 'security_settings',
    SECURITY_LOGS: 'security_logs',
    BILLS: 'bills'
};

export const initDB = async () => {
    return openDB(getDBName(), DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORES.PENDING)) {
                db.createObjectStore(STORES.PENDING, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.WALLET)) {
                db.createObjectStore(STORES.WALLET, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
                db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.HISTORY)) {
                db.createObjectStore(STORES.HISTORY, { keyPath: 'txnId' });
            }
            if (!db.objectStoreNames.contains(STORES.USED_TOKENS)) {
                db.createObjectStore(STORES.USED_TOKENS, { keyPath: 'txnId' });
            }
            if (!db.objectStoreNames.contains(STORES.USERS)) {
                db.createObjectStore(STORES.USERS, { keyPath: 'phone' });
            }
            if (!db.objectStoreNames.contains(STORES.SECURITY)) {
                db.createObjectStore(STORES.SECURITY, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(STORES.SECURITY_LOGS)) {
                db.createObjectStore(STORES.SECURITY_LOGS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.BILLS)) {
                db.createObjectStore(STORES.BILLS, { keyPath: 'id', autoIncrement: true });
            }
        },
    });
};

// Generic CRUD operations
export const putData = async (storeName, data) => {
    const db = await initDB();
    return db.put(storeName, data);
};

export const getData = async (storeName, key) => {
    const db = await initDB();
    return db.get(storeName, key);
};

export const getAllData = async (storeName) => {
    const db = await initDB();
    return db.getAll(storeName);
};

export const deleteData = async (storeName, key) => {
    const db = await initDB();
    return db.delete(storeName, key);
};

// Specialized helpers
export const savePendingTransaction = (txn) => putData(STORES.PENDING, txn);
export const getPendingTransactions = () => getAllData(STORES.PENDING);
export const clearPendingTransactions = async (ids) => {
    const db = await initDB();
    const tx = db.transaction(STORES.PENDING, 'readwrite');
    for (const id of ids) {
        tx.store.delete(id);
    }
    await tx.done;
};

export const clearStore = async (storeName) => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    await tx.done;
};
