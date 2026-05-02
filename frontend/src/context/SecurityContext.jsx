import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { putData, getData, STORES } from '../services/db';
import toast from 'react-hot-toast';

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
    const { user, login } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState(null);
    const lastInteractionRef = useRef(Date.now());

    // Check support
    useEffect(() => {
        if (window.PublicKeyCredential) {
            setBiometricSupported(true);
        }
    }, []);

    // Load settings when user changes
    useEffect(() => {
        const loadSecurity = async () => {
            if (user) {
                const settings = await getData(STORES.SECURITY, 'biometric');
                setBiometricEnabled(!!settings?.enabled);
            }
        };
        loadSecurity();
    }, [user]);

    // Inactivity Timer (5 minutes)
    useEffect(() => {
        if (!user || isLocked) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastInteractionRef.current > 5 * 60 * 1000) {
                setIsLocked(true);
                toast('App locked due to inactivity', { icon: '🔒' });
            }
        }, 30000);

        const updateInteraction = () => {
            lastInteractionRef.current = Date.now();
        };

        window.addEventListener('mousemove', updateInteraction);
        window.addEventListener('touchstart', updateInteraction);
        window.addEventListener('keydown', updateInteraction);

        return () => {
            clearInterval(interval);
            window.removeEventListener('mousemove', updateInteraction);
            window.removeEventListener('touchstart', updateInteraction);
            window.removeEventListener('keydown', updateInteraction);
        };
    }, [user, isLocked]);

    // Visibility Change Lock
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                sessionStorage.setItem('lastHiddenAt', Date.now().toString());
            } else {
                const hiddenAt = sessionStorage.getItem('lastHiddenAt');
                if (hiddenAt && Date.now() - parseInt(hiddenAt) > 2 * 60 * 1000) {
                    setIsLocked(true);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    const registerBiometric = async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const options = {
                publicKey: {
                    challenge,
                    rp: { name: "OfflinePay", id: window.location.hostname },
                    user: {
                        id: Uint8Array.from(user.phone, c => c.charCodeAt(0)),
                        name: user.upiId,
                        displayName: user.name
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: { userVerification: "required" },
                    timeout: 60000
                }
            };

            const credential = await navigator.credentials.create(options);
            if (credential) {
                await putData(STORES.SECURITY, { 
                    key: 'biometric', 
                    enabled: true, 
                    credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))) 
                });
                setBiometricEnabled(true);
                toast.success('Biometric Access Granted');
                return true;
            }
        } catch (err) {
            console.error(err);
            toast.error('Biometric Enrollment Failed');
        }
        return false;
    };

    const verifyBiometric = async () => {
        try {
            const settings = await getData(STORES.SECURITY, 'biometric');
            if (!settings || !settings.credentialId) return false;

            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const options = {
                publicKey: {
                    challenge,
                    timeout: 60000,
                    userVerification: "required",
                    allowCredentials: [{
                        id: Uint8Array.from(atob(settings.credentialId), c => c.charCodeAt(0)),
                        type: 'public-key'
                    }]
                }
            };

            const assertion = await navigator.credentials.get(options);
            if (assertion) {
                setIsLocked(false);
                setFailedAttempts(0);
                return true;
            }
        } catch (err) {
            console.error(err);
            toast.error('Biometric Verification Failed');
        }
        return false;
    };

    const unlockWithPin = async (pin) => {
        console.log('[Security] Unlocking with PIN for user:', user?.phone);
        if (lockoutUntil && Date.now() < lockoutUntil) {
            toast.error(`Device locked. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000)}s`);
            return false;
        }

        if (!user?.phone) {
            console.error('[Security] No user found for unlocking');
            return false;
        }

        const res = await login(user.phone, pin);
        if (res.success) {
            setIsLocked(false);
            setFailedAttempts(0);
            setLockoutUntil(null);
            return true;
        } else {
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);
            
            let delay = 0;
            if (newAttempts === 2) delay = 5000;
            else if (newAttempts === 3) delay = 15000;
            else if (newAttempts === 4) delay = 30000;
            else if (newAttempts >= 5) delay = 10 * 60 * 1000;

            if (delay > 0) {
                setLockoutUntil(Date.now() + delay);
                toast.error(`Incorrect PIN. Locked for ${delay/1000}s`);
            } else {
                toast.error('Invalid Security PIN');
            }
            return false;
        }
    };

    return (
        <SecurityContext.Provider value={{ 
            isLocked, 
            setIsLocked,
            biometricSupported, 
            biometricEnabled, 
            registerBiometric, 
            verifyBiometric,
            unlockWithPin,
            failedAttempts,
            lockoutUntil
        }}>
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => useContext(SecurityContext);
