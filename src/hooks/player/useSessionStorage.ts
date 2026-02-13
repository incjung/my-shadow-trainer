import { useState, useCallback, useRef, useEffect } from 'react';
import { storage, type SessionIndexItem } from '../../lib/storage';
import type { SessionRecord, Bookmark } from '../../types';
import PeakWorker from '../../workers/peak-generation.worker?worker';

export const useSessionStorage = (fileName: string) => {
    const [fileSessions, setFileSessions] = useState<SessionIndexItem[]>([]);
    const [currentPeaks, setCurrentPeaks] = useState<number[]>([]);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new PeakWorker();
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const loadSessions = useCallback(async (name: string) => {
        if (!name) {
            setFileSessions([]);
            return;
        }
        try {
            // storage.listSessions now returns the Index (fast)
            // The Index contains everything we need for the list (peaks, bookmarks, date, etc)
            const sessions = await storage.listSessions(name);
            setFileSessions(sessions);
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }, []);

    const generatePeaks = (wavesurfer: any, length: number = 300): Promise<number[]> => {
        return new Promise((resolve) => {
            if (!wavesurfer || !workerRef.current) {
                resolve([]);
                return;
            }

            const decodedData = wavesurfer.getDecodedData();
            if (!decodedData) {
                resolve([]);
                return;
            }

            const channelData = decodedData.getChannelData(0);

            // Post message to worker
            workerRef.current.onmessage = (e) => {
                resolve(e.data);
            };

            workerRef.current.postMessage({
                channelData,
                length
            });
        });
    };

    const saveSession = async (bookmarks: Bookmark[], duration: number, wavesurfer: any) => {
        if (!fileName) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const dateStr = year + '-' + month + '-' + day + ' ' + hour + ':' + minute;

        // Generate peaks using Worker
        let peaks = currentPeaks;
        if (peaks.length === 0) {
            peaks = await generatePeaks(wavesurfer);
            setCurrentPeaks(peaks); // Cache them
        }

        const newRecord: SessionRecord = {
            id: Date.now(),
            date: dateStr,
            fileName: fileName,
            count: bookmarks.length,
            bookmarks: [...bookmarks],
            duration: duration,
            peaks: peaks
        };

        await storage.saveSessionFile(fileName, newRecord);
        await loadSessions(fileName);
        console.log("Session saved to OPFS with Worker-generated peaks");
    };

    const deleteSession = async (path: string) => {
        console.log("Deleting session:", path);
        await storage.deleteSessionFile(path);
        // Optimistic UI update
        setFileSessions(prev => prev.filter(s => s.path !== path));
    };

    return {
        fileSessions,
        currentPeaks,
        setCurrentPeaks,
        loadSessions,
        saveSession,
        deleteSession,
        generatePeaks
    };
};
