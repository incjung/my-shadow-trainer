import { useState, useEffect, useMemo } from 'react';
import { storage, type SessionIndexItem } from '../lib/storage';
import WaveformMini from '../components/WaveformMini';
import styles from './Analytics.module.css';
// import { useAudio } from '../context/AudioContext';
// import { useNavigate } from 'react-router-dom';

const Analytics = () => {
    const [projects, setProjects] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [sessions, setSessions] = useState<SessionIndexItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    // const { setAudioFile } = useAudio(); // Unused
    // const navigate = useNavigate(); // Unused

    // Load project list on mount
    useEffect(() => {
        const loadProjects = async () => {
            const list = await storage.listAllAudioProjects();
            setProjects(list);
        };
        loadProjects();
    }, []);

    // Load sessions when a project is selected
    useEffect(() => {
        if (!selectedProject) {
            setSessions([]);
            return;
        }

        const loadSessions = async () => {
            setIsLoading(true);
            try {
                // storage.listSessions now returns the full index items (SessionIndexItem[])
                // No need to read each file individually!
                const loadedSessions = await storage.listSessions(selectedProject);
                setSessions(loadedSessions);
            } catch (e) {
                console.error("Failed to load sessions", e);
                setSessions([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadSessions();
    }, [selectedProject]);

    // Calculate Basic Stats
    const stats = useMemo(() => {
        if (sessions.length === 0) return null;
        const totalSessions = sessions.length;
        const totalBookmarks = sessions.reduce((acc, s) => acc + (s.count || 0), 0);
        const avgBookmarks = (totalBookmarks / totalSessions).toFixed(1);
        const lastPractice = sessions[0]?.date || '-';

        return { totalSessions, totalBookmarks, avgBookmarks, lastPractice };
    }, [sessions]);


    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h2>📊 학습 기록 분석 (Visual History)</h2>
                <p>과거의 학습 패턴을 파형으로 비교하고 분석합니다.</p>
            </header>

            <div className={styles.layout}>
                {/* Sidebar: Project List */}
                <div className={styles.sidebar}>
                    <h3 className={styles.sidebarTitle}>📁 프로젝트 선택</h3>
                    {projects.length === 0 ? (
                        <p className={styles.noProjects}>저장된 프로젝트가 없습니다.</p>
                    ) : (
                        <ul className={styles.projectList}>
                            {projects.map(p => (
                                <li key={p} className={styles.projectItem}>
                                    <button
                                        onClick={() => setSelectedProject(p)}
                                        className={`${styles.projectButton} ${selectedProject === p ? styles.active : ''}`}
                                    >
                                        🎵 {p}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Main Content: Stats & History */}
                <div className={styles.mainContent}>
                    {!selectedProject ? (
                        <div className={styles.emptySelection}>
                            👈 왼쪽에서 분석할 프로젝트를 선택해주세요.
                        </div>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            {stats && (
                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>총 연습 횟수</div>
                                        <div className={styles.statValue}>{stats.totalSessions}회</div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>평균 북마크</div>
                                        <div className={styles.statValue}>{stats.avgBookmarks}개</div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>총 북마크</div>
                                        <div className={styles.statValue}>{stats.totalBookmarks}개</div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>마지막 연습</div>
                                        <div className={styles.statValue} title={stats.lastPractice}>{stats.lastPractice.split(' ')[0]}</div>
                                    </div>
                                </div>
                            )}

                            {/* Visual History List */}
                            <div className={styles.historyContainer}>
                                <h3 className={styles.historyTitle}>📈 파형 기록 비교</h3>
                                {isLoading ? (
                                    <p className={styles.loader}>데이터를 불러오는 중...</p>
                                ) : sessions.length === 0 ? (
                                    <p className={styles.noSessions}>기록된 세션이 없습니다.</p>
                                ) : (
                                    <div className={styles.visualList}>
                                        {sessions.map((session) => (
                                            <div key={session.path} className={styles.historyItem}>
                                                <div className={styles.historyItemHeader}>
                                                    <span>📅 {session.date}</span>
                                                    <span>🔖 북마크 {session.count}개</span>
                                                </div>

                                                {/* Waveform Visualization */}
                                                <div className={styles.waveformWrapper}>
                                                    <WaveformMini
                                                        peaks={session.peaks || []}
                                                        bookmarks={session.bookmarks}
                                                        duration={session.duration}
                                                        width={800} // Fixed width for comparison or responsive? 
                                                    // Note: WaveformMini accepts width. In Home we synced it. Here, a fixed width is fine for comparison.
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
