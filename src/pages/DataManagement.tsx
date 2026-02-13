import React, { useEffect, useState } from 'react';
import { storage } from '../lib/storage';

const DataManagement: React.FC = () => {
    const [projects, setProjects] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadProjects = async () => {
        setIsLoading(true);
        const list = await storage.listAllAudioProjects();
        setProjects(list);
        setIsLoading(false);
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleDeleteProject = async (name: string) => {
        console.log("Deleting project:", name);
        const success = await storage.deleteAudioProject(name);
        if (success) {
            await loadProjects(); // Reload list after deletion
        } else {
            alert("삭제 실패: 로그를 확인하세요.");
        }
    };

    const handleDeleteAll = async () => {
        console.log("Deleting all data...");
        const success = await storage.deleteAllData();
        if (success) {
            await loadProjects(); // Reload list
        } else {
            alert("전체 삭제 실패: 로그를 확인하세요.");
        }
    };

    return (
        <div className="analytics-container">
            <header className="page-header" style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h2>💾 데이터 관리 (Data Management)</h2>
                <p style={{ color: '#666' }}>브라우저에 저장된 학습 기록(OPFS)을 관리합니다.</p>
            </header>

            <div className="card" style={{ padding: '30px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>저장된 오디오 프로젝트 ({projects.length})</h3>
                    {projects.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            style={{
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            🗑️ 전체 데이터 삭제
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <p>데이터 로딩 중...</p>
                ) : projects.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>저장된 데이터가 없습니다.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {projects.map((project) => (
                            <li key={project} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '15px 0',
                                borderBottom: '1px solid #f1f5f9'
                            }}>
                                <div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>🎵 {project}</span>
                                </div>
                                <button
                                    onClick={() => handleDeleteProject(project)}
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                        transition: 'all 0.2s'
                                    }}
                                    className="btn-item-delete"
                                >
                                    삭제
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
                <p>⚠️ 주의: 이곳에서 삭제한 데이터는 복구할 수 없습니다.</p>
            </div>

            <style>{`
                .btn-item-delete:hover {
                    background-color: #fee2e2 !important;
                    color: #ef4444 !important;
                    border-color: #fca5a5 !important;
                }
            `}</style>
        </div>
    );
};

export default DataManagement;
