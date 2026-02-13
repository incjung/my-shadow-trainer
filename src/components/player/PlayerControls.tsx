import React from 'react';
import styles from './PlayerControls.module.css';

interface PlayerControlsProps {
    isPlaying: boolean;
    isReady: boolean;
    playbackRate: number;
    onTogglePlay: () => void;
    onAddBookmark: () => void;
    onSaveSession: () => void;
    onSpeedChange: (rate: number) => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
    isPlaying,
    isReady,
    playbackRate,
    onTogglePlay,
    onAddBookmark,
    onSaveSession,
    onSpeedChange
}) => {
    const speedOptions = [0.5, 1.0, 1.5, 2.0];

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <button onClick={onTogglePlay} className={styles.btnPrimary} disabled={!isReady}>
                    {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
                </button>
                <button onClick={onAddBookmark} className={styles.btnSecondary} disabled={!isReady}>
                    📍 북마크 추가
                </button>
                <button onClick={onSaveSession} className={styles.btnSave} disabled={!isReady}>
                    💾 기록 저장
                </button>
            </div>

            <div className={styles.speedControls}>
                <span className={styles.speedLabel}>재생 속도:</span>
                {speedOptions.map((rate) => (
                    <button
                        key={rate}
                        onClick={() => onSpeedChange(rate)}
                        className={`${styles.btnSpeed} ${playbackRate === rate ? styles.active : ''}`}
                        disabled={!isReady}
                    >
                        x{rate}
                    </button>
                ))}
            </div>

            <p className={styles.hintText}>
                💡 Tip: ←/→(5초 이동), Space(재생/멈춤), <strong>M(북마크), Home(처음으로)</strong>
            </p>
        </div>
    );
};

export default PlayerControls;
