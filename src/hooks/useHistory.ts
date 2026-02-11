import { useState, useEffect, useCallback } from 'react';
import type { SessionRecord } from '../types';

export const useHistory = () => {
    const [history, setHistory] = useState<SessionRecord[]>([]);

    useEffect(() => {
        const savedHistory = localStorage.getItem('audio-study-history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                // Migration: Ensure 'duration' exists.
                // If old records don't have duration, default to 0.
                const migrated = parsed.map((record: any) => ({
                    ...record,
                    duration: record.duration ?? 0,
                }));
                setHistory(migrated);
            } catch (e) {
                console.error("Failed to parse history", e);
                setHistory([]);
            }
        }
    }, []);

    const saveToLocalStorage = (newHistory: SessionRecord[]) => {
        localStorage.setItem('audio-study-history', JSON.stringify(newHistory));
    };

    const addRecord = useCallback((record: SessionRecord) => {
        setHistory((prev) => {
            const updated = [record, ...prev];
            saveToLocalStorage(updated);
            return updated;
        });
    }, []);

    const deleteRecord = useCallback((id: number) => {
        setHistory((prev) => {
            const updated = prev.filter((item) => item.id !== id);
            saveToLocalStorage(updated);
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem('audio-study-history');
    }, []);

    return { history, addRecord, deleteRecord, clearHistory };
};
