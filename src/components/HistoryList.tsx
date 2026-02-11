import React from 'react';
import type { SessionRecord } from '../types';
import { Trash2 } from 'lucide-react'; // Using icons if installed, otherwise text

interface HistoryListProps {
    history: SessionRecord[];
    onDelete: (id: number) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onDelete }) => {
    if (history.length === 0) {
        return <p className="empty-state">아직 저장된 기록이 없습니다.</p>;
    }

    const formatDuration = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="history-list-container">
            <table className="history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>File Name</th>
                        <th>Duration</th>
                        <th>Bookmarks</th>
                        <th className="text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((record) => (
                        <tr key={record.id}>
                            <td className="text-sm text-sub">{record.date}</td>
                            <td className="font-bold">{record.fileName}</td>
                            <td className="text-sm">{formatDuration(record.duration)}</td>
                            <td>
                                <span className={`badge ${record.count === 0 ? 'success' : 'warning'}`}>
                                    {record.count}
                                </span>
                            </td>
                            <td className="text-right">
                                <button
                                    onClick={() => onDelete(record.id)}
                                    className="btn-icon-delete"
                                    title="삭제"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default HistoryList;
