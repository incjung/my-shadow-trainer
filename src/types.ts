export interface Bookmark {
    id: number;
    time: number;
    label: string;
    regionId: string;
}

export interface SessionRecord {
    id: number;
    date: string;
    fileName: string;
    count: number;
    bookmarks: Bookmark[];
    duration: number; // Added for analytics
}
