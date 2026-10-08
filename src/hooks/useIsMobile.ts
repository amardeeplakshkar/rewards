'use client'
import { useState, useEffect } from 'react';

const useIsMobile = (breakpoint: number = 768): boolean => {
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= breakpoint;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery: MediaQueryList = window.matchMedia(`(max-width: ${breakpoint}px)`);

        const update = (matches: boolean) => setIsMobile(matches);
        update(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            update(e.matches);
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, [breakpoint]);

    return isMobile;
};

export default useIsMobile;