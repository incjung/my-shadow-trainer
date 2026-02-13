import React from 'react';
import type { Bookmark } from '../../types';
import styles from './BookmarkList.module.css';

interface BookmarkListProps {
    bookmarks: Bookmark[];
    onJumpTo: (time: number) => void;
    onRemove: (id: number, e?: React.MouseEvent) => void;
    onClearAll: () => void;
}

const BookmarkList: React.FC<BookmarkListProps> = ({
    bookmarks,
    onJumpTo,
    onRemove,
    onClearAll
}) => {
    return (
        <div className={styles.section}>
            <div className={styles.header}>
                <h3>현재 북마크 ({bookmarks.length})</h3>

                {bookmarks.length > 0 && (
                    <button onClick={onClearAll} className={styles.btnClearAll}>
                        🗑️ 전체 삭제
                    </button>
                )}
            </div>

            {bookmarks.length === 0 ? (
                <p className={styles.emptyState}>북마크가 없습니다. M 키를 눌러 추가해보세요!</p>
            ) : (
                <ul className={styles.list}>
                    {bookmarks.map((bm) => (
                        <li key={bm.id} className={styles.item}>
                            <span onClick={() => onJumpTo(bm.time)} className={styles.itemTime}>
                                ⏱ {bm.label}
                            </span>
                            <button onClick={(e) => onRemove(bm.id, e)} className={styles.btnDelete}>×</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default BookmarkList;
