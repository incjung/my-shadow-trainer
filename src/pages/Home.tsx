import React, { useRef, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useWaveSurfer } from '../hooks/player/useWaveSurfer';
import { useBookmarks } from '../hooks/player/useBookmarks';
import { useSessionStorage } from '../hooks/player/useSessionStorage';
import PlayerControls from '../components/player/PlayerControls';
import BookmarkList from '../components/player/BookmarkList';
import SessionHistoryList from '../components/player/SessionHistoryList';
import styles from './Home.module.css';

// 시간 포맷 함수 (MM:SS) - Helper
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function Home() {
    const containerRef = useRef<HTMLDivElement>(null);

    // Context
    const { file: contextFile, fileName: contextFileName, setAudioFile } = useAudio();
    const fileName = contextFileName;

    // Custom Hooks
    const {
        wavesurferRef,
        regionsRef,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        isReady,
        mainWaveformWidth,
        togglePlay,
        handleSpeedChange // Renamed to align with usage
    } = useWaveSurfer(containerRef);

    const {
        bookmarks,
        setBookmarks,
        addBookmark,
        removeBookmark,
        removeAllBookmarks
    } = useBookmarks(regionsRef, wavesurferRef);

    const {
        fileSessions,
        loadSessions,
        saveSession: saveToStorage,
        deleteSession
    } = useSessionStorage(fileName);

    // Effect to load audio when contextFile changes
    useEffect(() => {
        if (wavesurferRef.current && contextFile) {
            const url = URL.createObjectURL(contextFile);
            wavesurferRef.current.load(url);
            loadSessions(contextFile.name);

            // Reset state
            setBookmarks([]);
            if (regionsRef.current) regionsRef.current.clearRegions();
        }
    }, [contextFile, loadSessions, wavesurferRef, regionsRef, setBookmarks]);

    // Keyboard Shortcuts
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
    }, [isReady, addBookmark, wavesurferRef]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            e.target.value = '';
        }
    };

    const jumpToBookmark = (time: number) => {
        if (wavesurferRef.current && isReady) {
            wavesurferRef.current.setTime(time);
            wavesurferRef.current.play();
        }
    };

    const handleSaveSession = () => {
        if (wavesurferRef.current) {
            saveToStorage(bookmarks, duration, wavesurferRef.current);
        }
    };

    return (
        <div className={styles.playerContainer}>
            <div className={styles.uploadSection}>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className={styles.fileInput} />
                {fileName && <p className={styles.fileName}>Playing: <strong>{fileName}</strong></p>}
            </div>

            <PlayerControls
                isPlaying={isPlaying}
                isReady={isReady}
                playbackRate={playbackRate}
                onTogglePlay={togglePlay}
                onAddBookmark={addBookmark}
                onSaveSession={handleSaveSession}
                onSpeedChange={handleSpeedChange}
            />

            {/* Main Waveform */}
            <div className={styles.waveformWrapper} style={{ marginBottom: 0 }}>
                {fileName && !isReady && (
                    <div className={styles.loadingOverlay}>
                        <div className={styles.spinner}></div>
                        <p>음원 분석 중...</p>
                    </div>
                )}

                <div
                    id="waveform"
                    ref={containerRef}
                    className={`${styles.waveformContainer} ${isReady ? styles.visible : ''}`}
                />

                {isReady && (
                    <div className={styles.timeDisplayOverlay}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                )}

                <SessionHistoryList
                    sessions={fileSessions}
                    mainWaveformWidth={mainWaveformWidth}
                    onDelete={deleteSession}
                />
            </div>

            <BookmarkList
                bookmarks={bookmarks}
                onJumpTo={jumpToBookmark}
                onRemove={removeBookmark}
                onClearAll={removeAllBookmarks}
            />
        </div>
    );
}

export default Home;
