import React from 'react';
import WaveformMini from '../WaveformMini';
import type { SessionRecord } from '../../types';
import styles from './SessionHistoryList.module.css';

interface SessionHistoryListProps {
    sessions: (SessionRecord & { path: string })[];
    mainWaveformWidth: number;
    onDelete: (path: string) => void;
}

const SessionHistoryList: React.FC<SessionHistoryListProps> = ({
    sessions,
    mainWaveformWidth,
    onDelete
}) => {
    if (sessions.length === 0) return null;

    return (
        <div className={styles.section}>
            <div className={styles.list}>
                {sessions.map((session) => (
                    <div key={session.path} className={styles.item} style={{
                        width: mainWaveformWidth
                    }}>
                        <div className={styles.infoContainer}>
                            <span className={styles.dateBadge}>
                                {session.date} ({session.count}개)
                            </span>
                        </div>

                        <div className={styles.actionsContainer}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(session.path);
                                }}
                                className={styles.btnDelete}
                                title="Delete"
                            >
                                ×
                            </button>
                        </div>

                        <WaveformMini
                            peaks={session.peaks || []}
                            bookmarks={session.bookmarks}
                            duration={session.duration}
                            width={mainWaveformWidth}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SessionHistoryList;
