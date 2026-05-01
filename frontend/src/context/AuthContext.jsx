import React, { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { putData, getData, STORES } from '../services/db';

const AuthContext = createContext();

export const DEMO_ACCOUNTS = [
    { name: "Saurabh Tripathi", phone: "9876543210", upiId: "saurabh@offlinepay", pinHash: CryptoJS.SHA256("123456").toString(), theme: 'cyan' },
    { name: "Merchant Shop", phone: "merchant", upiId: "merchant@offlinepay", pinHash: CryptoJS.SHA256("123456").toString(), theme: 'purple' },
    { name: "Rashi Singh", phone: "rashi", upiId: "rashi@offlinepay", pinHash: CryptoJS.SHA256("123456").toString(), theme: 'orange' }
];

export const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'purple') {
        root.style.setProperty('--color-cyan', '168 85 247'); // tailwind purple-500
    } else if (theme === 'orange') {
        root.style.setProperty('--color-cyan', '249 115 22'); // tailwind orange-500
    } else {
        root.style.setProperty('--color-cyan', '0 245 255'); // default cyan
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isMerchant, setIsMerchant] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for deep-link account switch (for Split Demo iframes)
        const params = new URLSearchParams(window.location.search);
        const urlUserPhone = params.get('user');
        
        if (urlUserPhone) {
            const account = DEMO_ACCOUNTS.find(a => a.phone === urlUserPhone);
            if (account) {
                sessionStorage.setItem('currentUser', JSON.stringify(account));
                sessionStorage.setItem('sessionToken', 'demo-token');
                setUser(account);
                applyTheme(account.theme);
                setLoading(false);
                return;
            }
        }

        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setIsMerchant(!!parsed.isMerchant);
                if (parsed.theme) applyTheme(parsed.theme);
                else if (parsed.isMerchant) applyTheme('purple');
            } catch (e) {
                console.error('Invalid session data', e);
                sessionStorage.removeItem('currentUser');
            }
        }
        setLoading(false);
    }, []);

    const login = async (phone, pin) => {
        try {
            const userData = await getData(STORES.USERS, phone);
            if (!userData) {
                return { success: false, message: 'User not found' };
            }

            const hash = CryptoJS.SHA256(pin).toString();
            if (userData.pinHash !== hash) {
                return { success: false, message: 'Wrong PIN' };
            }

            const sessionToken = CryptoJS.SHA256(Date.now().toString()).toString();
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
            sessionStorage.setItem('sessionToken', sessionToken);
            setUser(userData);
            return { success: true };
        } catch (error) {
            return { success: false, message: 'Login failed' };
        }
    };

    const register = async (name, phone, upiId, pin) => {
        try {
            const existingUser = await getData(STORES.USERS, phone);
            if (existingUser) {
                return { success: false, message: 'Phone number already registered' };
            }

            const uid = `USER_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const pinHash = CryptoJS.SHA256(pin).toString();
            
            const newUser = {
                uid,
                name,
                phone,
                upiId,
                pinHash,
                balance: 10000,
                createdAt: new Date().toISOString()
            };

            await putData(STORES.USERS, newUser);
            
            // Auto login after registration
            const sessionToken = CryptoJS.SHA256(Date.now().toString()).toString();
            sessionStorage.setItem('currentUser', JSON.stringify(newUser));
            sessionStorage.setItem('sessionToken', sessionToken);
            setUser(newUser);
            
            return { success: true };
        } catch (error) {
            return { success: false, message: 'Registration failed' };
        }
    };

    const logout = () => {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('sessionToken');
        setUser(null);
        setIsMerchant(false);
        applyTheme('cyan');
    };

    const toggleMerchantMode = async () => {
        const newMode = !isMerchant;
        const updatedUser = { ...user, isMerchant: newMode };
        
        // Persist to session
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        // Persist to IndexedDB if real user
        if (user && user.phone && user.phone !== 'merchant') {
            await putData(STORES.USERS, updatedUser);
        }

        setUser(updatedUser);
        setIsMerchant(newMode);
        applyTheme(newMode ? 'purple' : (updatedUser.theme || 'cyan'));
    };

    const switchAccount = (accountPhone) => {
        const account = DEMO_ACCOUNTS.find(a => a.phone === accountPhone);
        if (account) {
            sessionStorage.setItem('currentUser', JSON.stringify(account));
            sessionStorage.setItem('sessionToken', 'demo-token');
            applyTheme(account.theme);
            window.location.reload(); // Hard reload to reset IndexedDB instance and WalletContext
        }
    };

    return (
        <AuthContext.Provider value={{ user, isMerchant, login, register, logout, toggleMerchantMode, switchAccount, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
