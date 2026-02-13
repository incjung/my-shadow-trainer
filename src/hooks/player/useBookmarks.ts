import { useState, useCallback } from 'react';
import type { Bookmark } from '../../types';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

export const useBookmarks = (regionsRef: React.MutableRefObject<RegionsPlugin | null>, wavesurferRef: React.MutableRefObject<any | null>) => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const addBookmark = useCallback(() => {
        if (!wavesurferRef.current || !regionsRef.current) return;

        const time = Math.max(0, wavesurferRef.current.getCurrentTime() - 5);

        const region = regionsRef.current.addRegion({
            start: time,
            color: 'rgba(255, 0, 0, 1)',
            drag: false,
            resize: false,
        });

        if (region.element) region.element.style.zIndex = '100';

        const newBookmark: Bookmark = {
            id: Date.now(),
            time,
            label: formatTime(time),
            regionId: region.id
        };

        setBookmarks((prev) => [...prev, newBookmark].sort((a, b) => a.time - b.time));
    }, [regionsRef, wavesurferRef]);

    const removeBookmark = useCallback((id: number) => {
        const target = bookmarks.find(b => b.id === id);
        if (target && regionsRef.current) {
            const region = regionsRef.current.getRegions().find(r => r.id === target.regionId);
            if (region) region.remove();
        }
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
    }, [bookmarks, regionsRef]);

    const removeAllBookmarks = useCallback(() => {
        setBookmarks([]);
        if (regionsRef.current) {
            regionsRef.current.clearRegions();
        }
    }, [regionsRef]);

    return {
        bookmarks,
        setBookmarks, // Exported to allow resetting from parent
        addBookmark,
        removeBookmark,
        removeAllBookmarks,
        formatTime
    };
};
