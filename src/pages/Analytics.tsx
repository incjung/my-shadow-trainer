import React, { useState, useEffect, useMemo } from 'react';
import { storage } from '../lib/storage';
import WaveformMini from '../components/WaveformMini';
import { useAudio } from '../context/AudioContext';
// import { useNavigate } from 'react-router-dom';

const Analytics = () => {
    const [projects, setProjects] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
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
            const paths = await storage.listSessions(selectedProject);
            const loadedSessions = await Promise.all(
                paths.map(path => storage.readSessionFile(path).then(data => ({ ...data, path })))
            );
            setSessions(loadedSessions);
            setIsLoading(false);
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
        <div className="analytics-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h2>📊 학습 기록 분석 (Visual History)</h2>
                <p style={{ color: '#666' }}>과거의 학습 패턴을 파형으로 비교하고 분석합니다.</p>
            </header>

            <div className="layout" style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                {/* Sidebar: Project List */}
                <div className="sidebar" style={{ flex: '0 0 250px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>📁 프로젝트 선택</h3>
                    {projects.length === 0 ? (
                        <p style={{ color: '#999', fontSize: '0.9rem' }}>저장된 프로젝트가 없습니다.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {projects.map(p => (
                                <li key={p} style={{ marginBottom: '8px' }}>
                                    <button
                                        onClick={() => setSelectedProject(p)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '10px 15px',
                                            borderRadius: '8px',
                                            border: selectedProject === p ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                            background: selectedProject === p ? '#eef2ff' : 'white',
                                            color: selectedProject === p ? '#4338ca' : '#374151',
                                            cursor: 'pointer',
                                            fontWeight: selectedProject === p ? 600 : 400,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        🎵 {p}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Main Content: Stats & History */}
                <div className="main-content" style={{ flex: 1 }}>
                    {!selectedProject ? (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999', background: 'white', borderRadius: '12px' }}>
                            👈 왼쪽에서 분석할 프로젝트를 선택해주세요.
                        </div>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            {stats && (
                                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                                    <div className="stat-card" style={statCardStyle}>
                                        <div style={statLabelStyle}>총 연습 횟수</div>
                                        <div style={statValueStyle}>{stats.totalSessions}회</div>
                                    </div>
                                    <div className="stat-card" style={statCardStyle}>
                                        <div style={statLabelStyle}>평균 북마크</div>
                                        <div style={statValueStyle}>{stats.avgBookmarks}개</div>
                                    </div>
                                    <div className="stat-card" style={statCardStyle}>
                                        <div style={statLabelStyle}>총 북마크</div>
                                        <div style={statValueStyle}>{stats.totalBookmarks}개</div>
                                    </div>
                                    <div className="stat-card" style={statCardStyle}>
                                        <div style={statLabelStyle}>마지막 연습</div>
                                        <div style={statValueStyle} title={stats.lastPractice}>{stats.lastPractice.split(' ')[0]}</div>
                                    </div>
                                </div>
                            )}

                            {/* Visual History List */}
                            <div className="history-list-container" style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ marginBottom: '20px' }}>📈 파형 기록 비교</h3>
                                {isLoading ? (
                                    <p>데이터를 불러오는 중...</p>
                                ) : sessions.length === 0 ? (
                                    <p style={{ color: '#999' }}>기록된 세션이 없습니다.</p>
                                ) : (
                                    <div className="visual-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {sessions.map((session) => (
                                            <div key={session.path} className="history-item" style={{ position: 'relative', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.85rem', color: '#666' }}>
                                                    <span>📅 {session.date}</span>
                                                    <span>🔖 북마크 {session.count}개</span>
                                                </div>

                                                {/* Waveform Visualization */}
                                                <div style={{ background: '#f9fafb', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
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

// Styles
const statCardStyle = {
    background: 'white',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center' as const
};

const statLabelStyle = {
    fontSize: '0.85rem',
    color: '#6b7280',
    marginBottom: '5px'
};

const statValueStyle = {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#1f2937'
};

export default Analytics;
