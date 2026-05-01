import { useState, useEffect } from 'react';

export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(window.MOCK_OFFLINE !== undefined ? !window.MOCK_OFFLINE : navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            if (!window.MOCK_OFFLINE) setIsOnline(true);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Allow manual trigger via custom event
        const handleForceUpdate = () => setIsOnline(!window.MOCK_OFFLINE);
        window.addEventListener('mock-online-change', handleForceUpdate);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('mock-online-change', handleForceUpdate);
        };
    }, []);

    return isOnline;
};
