import React, { useRef, useState, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useHistory } from '../hooks/useHistory';
import HistoryList from '../components/HistoryList';
import type { Bookmark, SessionRecord } from '../types';

// 시간 포맷 함수 (MM:SS)
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function Home() {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);

    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [currentTime, setCurrentTime] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    const { history, addRecord, deleteRecord } = useHistory();

    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#d1d5db',
            progressColor: '#d1d5db',
            cursorColor: '#333',
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            height: 120,
            normalize: true,
        });

        const wsRegions = ws.registerPlugin(RegionsPlugin.create({
            dragSelection: false,
        } as any));

        regionsRef.current = wsRegions;
        wavesurferRef.current = ws;

        ws.on('ready', () => {
            setIsReady(true);
            setDuration(ws.getDuration());
            ws.setPlaybackRate(playbackRate);
        });

        ws.on('decode', (duration) => {
            setDuration(duration);
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('timeupdate', (time) => setCurrentTime(time));

        wsRegions.on('region-clicked', (region, e) => {
            e.stopPropagation();
            region.play();
            setIsPlaying(true);
        });

        return () => {
            ws.destroy();
        };
    }, []);

    useEffect(() => {
        if (wavesurferRef.current && isReady) {
            wavesurferRef.current.setPlaybackRate(playbackRate);
        }
    }, [playbackRate, isReady]);

    const addBookmark = useCallback(() => {
        if (!wavesurferRef.current || !regionsRef.current || !isReady) return;

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
    }, [isReady]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!wavesurferRef.current || !isReady) return;

            if (e.code === 'ArrowLeft') {
                wavesurferRef.current.skip(-5);
            } else if (e.code === 'ArrowRight') {
                wavesurferRef.current.skip(5);
            } else if (e.code === 'Space') {
                e.preventDefault();
                wavesurferRef.current.playPause();
            } else if (e.code === 'KeyM') {
                addBookmark();
            } else if (e.code === 'Home') {
                e.preventDefault();
                wavesurferRef.current.setTime(0);
                wavesurferRef.current.play();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isReady, addBookmark]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && wavesurferRef.current && regionsRef.current) {
            setIsReady(false);
            setIsPlaying(false);
            setBookmarks([]);
            regionsRef.current.clearRegions();
            setFileName(file.name);
            setDuration(0);

            const url = URL.createObjectURL(file);
            wavesurferRef.current.load(url);
        }
    };

    const togglePlay = () => {
        wavesurferRef.current?.playPause();
    };

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
    };

    const jumpToBookmark = (time: number) => {
        if (wavesurferRef.current && isReady) {
            wavesurferRef.current.setTime(time);
            wavesurferRef.current.play();
        }
    };

    const removeBookmark = (id: number) => {
        const target = bookmarks.find(b => b.id === id);
        if (target && regionsRef.current) {
            const region = regionsRef.current.getRegions().find(r => r.id === target.regionId);
            if (region) region.remove();
        }
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
    };

    const removeAllBookmarks = () => {
        if (bookmarks.length === 0) return;

        // Immediate deletion without confirmation as per user preference
        setBookmarks([]);
        if (regionsRef.current) {
            regionsRef.current.clearRegions();
        }
    };

    const saveSession = () => {
        if (!fileName) return;

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const newRecord: SessionRecord = {
            id: Date.now(),
            date: dateStr,
            fileName: fileName,
            count: bookmarks.length,
            bookmarks: [...bookmarks],
            duration: duration // Save duration for analytics
        };

        addRecord(newRecord); // Silent save using hook

        // Optional: Visual feedback (could be a toast, currently just a console log or simple alert if needed, but requested silent)
        // User requested "immediately save without asking", implying no confirm dialog. 
        // They might still want to know it happened, but I'll stick to strictly "no confirmation".
        console.log("Session saved silently");
    };

    const speedOptions = [0.5, 1.0, 1.5, 2.0];

    return (
        <div className="player-container">
            {/* <h1>🎵 Bun Audio Study</h1> --> Title moved to App Layout */}

            <div className="upload-section">
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="file-input" />
                {fileName && <p className="file-name">Playing: <strong>{fileName}</strong></p>}
            </div>

            <div className="waveform-wrapper">
                {fileName && !isReady && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>음원 분석 중...</p>
                    </div>
                )}

                <div
                    id="waveform"
                    ref={containerRef}
                    className={`waveform-container ${isReady ? 'visible' : 'hidden'}`}
                />

                {isReady && (
                    <div className="time-display-overlay">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                )}
            </div>

            <div className="controls">
                <button onClick={togglePlay} className="btn-primary" disabled={!isReady}>
                    {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
                </button>
                <button onClick={addBookmark} className="btn-secondary" disabled={!isReady}>
                    📍 북마크 추가
                </button>
                <button onClick={saveSession} className="btn-save" disabled={!isReady}>
                    💾 기록 저장
                </button>
            </div>

            <div className="speed-controls">
                <span className="speed-label">재생 속도:</span>
                {speedOptions.map((rate) => (
                    <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`btn-speed ${playbackRate === rate ? 'active' : ''}`}
                        disabled={!isReady}
                    >
                        x{rate}
                    </button>
                ))}
            </div>

            <p className="hint-text">
                💡 Tip: ←/→(5초 이동), Space(재생/멈춤), <strong>M(북마크), Home(처음으로)</strong>
            </p>

            <div className="bookmarks-section">
                <div className="bookmarks-header">
                    <h3>현재 북마크 ({bookmarks.length})</h3>

                    {bookmarks.length > 0 && (
                        <button onClick={removeAllBookmarks} className="btn-clear-all">
                            🗑️ 전체 삭제
                        </button>
                    )}
                </div>

                {bookmarks.length === 0 ? (
                    <p className="empty-state">북마크가 없습니다. M 키를 눌러 추가해보세요!</p>
                ) : (
                    <ul className="bookmark-list">
                        {bookmarks.map((bm) => (
                            <li key={bm.id} className="bookmark-item">
                                <span onClick={() => jumpToBookmark(bm.time)} className="bookmark-time">
                                    ⏱ {bm.label}
                                </span>
                                <button onClick={() => removeBookmark(bm.id)} className="btn-delete">×</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="history-section">
                <h2>📚 학습 기록 (History)</h2>
                <HistoryList history={history} onDelete={deleteRecord} />
            </div>

        </div>
    );
}

export default Home;
