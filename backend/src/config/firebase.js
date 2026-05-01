const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let db;

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            })
        });
    }
    db = admin.firestore();
    console.log('Firebase Admin Initialized');
} catch (error) {
    console.warn('Firebase Initialization Error. Initializing Mock DB for Demo...');
    // Simple In-Memory Mock for Demo Run
    const mockStore = {};
    db = {
        collection: (name) => ({
            doc: (id) => ({
                id,
                get: async () => ({
                    exists: !!(mockStore[name]?.[id]),
                    data: () => mockStore[name]?.[id]
                }),
                set: async (data) => {
                    if (!mockStore[name]) mockStore[name] = {};
                    mockStore[name][id] = data;
                },
                update: async (data) => {
                    Object.assign(mockStore[name][id], data);
                }
            }),
            add: async (data) => {
                if (!mockStore[name]) mockStore[name] = [];
                mockStore[name].push(data);
                return { id: Math.random().toString() };
            },
            where: () => ({
                orderBy: () => ({
                    limit: () => ({
                        get: async () => ({ docs: [] })
                    })
                })
            })
        }),
        runTransaction: async (fn) => {
            // Mock transaction (not fully atomic but works for demo)
            return fn({
                get: async (ref) => ref.get(),
                update: (ref, data) => {
                    if (!mockStore['users']) mockStore['users'] = {};
                    if (!mockStore['users'][ref.id]) mockStore['users'][ref.id] = { balance: 0 };
                    
                    // increment simulation
                    if (data.balance && data.balance.operand) {
                        const current = mockStore['users'][ref.id].balance || 0;
                        mockStore['users'][ref.id].balance = current + data.balance.operand;
                    } else {
                        Object.assign(mockStore['users'][ref.id], data);
                    }
                },
                set: (ref, data) => ref.set(data)
            });
        }
    };
    // Mock increment
    admin.firestore = { FieldValue: { increment: (v) => ({ operand: v }) } };
}

module.exports = { admin, db };
