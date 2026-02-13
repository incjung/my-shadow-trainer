import type { Bookmark } from '../types';

export interface FileSystemEntry {
    name: string;
    kind: 'file' | 'directory';
}

export interface SessionIndexItem {
    id: number;
    date: string;
    fileName: string;
    count: number;
    duration: number;
    path: string;
    peaks?: number[];
    bookmarks: Bookmark[]; // Added bookmarks
}

// Helper to fix missing TS type for async iterator
interface AsyncIterableDirectoryHandle extends FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

export const storage = {
    async getRoot(): Promise<FileSystemDirectoryHandle> {
        return await navigator.storage.getDirectory();
    },

    async getDirectory(dirName: string, create = false): Promise<FileSystemDirectoryHandle> {
        const root = await this.getRoot();
        return await root.getDirectoryHandle(dirName, { create });
    },

    async saveSessionFile(audioFileName: string, data: any): Promise<string> {
        const dir = await this.getDirectory(audioFileName, true);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${timestamp}.json`;

        const fileHandle = await dir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data));
        await writable.close();

        const path = `${audioFileName}/${fileName}`;

        // Update Index
        await this.addToIndex(audioFileName, {
            id: data.id,
            date: data.date,
            fileName: data.fileName,
            count: data.count,
            duration: data.duration,
            path: path,
            peaks: data.peaks,
            bookmarks: data.bookmarks
        });

        return path;
    },

    async listSessions(audioFileName: string): Promise<SessionIndexItem[]> {
        try {
            // Try reading from index first
            const index = await this.readIndex(audioFileName);
            if (index && index.length > 0) {
                return index.sort((a, b) => b.id - a.id); // Default: Newest first (by ID/Timestamp)
            }

            // If no index, fall back to scanning (and maybe rebuild?)
            // For now, let's trigger a rebuild transparently if index is missing but files exist
            const scanResult = await this.scanAndRebuildIndex(audioFileName);
            return scanResult.sort((a, b) => b.id - a.id);

        } catch (e) {
            return [];
        }
    },

    // --- Index Management ---

    async getIndexFileHandle(audioFileName: string, create = false) {
        try {
            const dir = await this.getDirectory(audioFileName, create);
            return await dir.getFileHandle('_index.json', { create });
        } catch (e) {
            return null;
        }
    },

    async readIndex(audioFileName: string): Promise<SessionIndexItem[]> {
        try {
            const fileHandle = await this.getIndexFileHandle(audioFileName);
            if (!fileHandle) return [];
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch (e) {
            return [];
        }
    },

    async writeIndex(audioFileName: string, index: SessionIndexItem[]) {
        const dir = await this.getDirectory(audioFileName, true);
        const fileHandle = await dir.getFileHandle('_index.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(index));
        await writable.close();
    },

    async addToIndex(audioFileName: string, item: SessionIndexItem) {
        const index = await this.readIndex(audioFileName);
        // Remove existing if overwriting (unlikely with timestamps but safe)
        const newIndex = index.filter(i => i.path !== item.path);
        newIndex.push(item);
        await this.writeIndex(audioFileName, newIndex);
    },

    async removeFromIndex(audioFileName: string, path: string) {
        const index = await this.readIndex(audioFileName);
        const newIndex = index.filter(i => i.path !== path);
        await this.writeIndex(audioFileName, newIndex);
    },

    async scanAndRebuildIndex(audioFileName: string): Promise<SessionIndexItem[]> {
        try {
            const dir = await this.getDirectory(audioFileName);
            const index: SessionIndexItem[] = [];

            const dirHandle = dir as unknown as AsyncIterableDirectoryHandle;
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind === 'file' && name.endsWith('.json') && !name.startsWith('_')) {
                    const fileHandle = handle as FileSystemFileHandle;
                    const file = await fileHandle.getFile();
                    const text = await file.text();
                    try {
                        const data = JSON.parse(text);
                        index.push({
                            id: data.id,
                            date: data.date,
                            fileName: data.fileName,
                            count: data.count,
                            duration: data.duration,
                            path: `${audioFileName}/${name}`,
                            peaks: data.peaks,
                            bookmarks: data.bookmarks
                        });
                    } catch (err) {
                        console.warn(`Skipping corrupt file: ${name}`, err);
                    }
                }
            }

            await this.writeIndex(audioFileName, index);
            return index;
        } catch (e) {
            return [];
        }
    },

    // --- End Index Management ---

    async saveSessionOrder(audioFileName: string, order: string[]): Promise<void> {
        // Deprecated/Legacy support or we can just ignore custom order for now in favor of Index sorting?
        // Let's keep it but ideally we integrate it into the Index or allow Index to be sorted.
        // For simplicity in this optimization phase, we rely on standard sorting (Date/ID).
        // If strict manual ordering is needed, we'd add an 'order' field to the index or keep this.
        // Let's keep this file separately for now to avoid breaking existing logic if we revert.
        const dir = await this.getDirectory(audioFileName, true);
        const fileHandle = await dir.getFileHandle('_order.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(order));
        await writable.close();
    },

    async getSessionOrder(audioFileName: string): Promise<string[]> {
        try {
            const dir = await this.getDirectory(audioFileName);
            const fileHandle = await dir.getFileHandle('_order.json');
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch (e) {
            return [];
        }
    },

    async readSessionFile(path: string): Promise<any> {
        const [dirName, fileName] = path.split('/');
        const dir = await this.getDirectory(dirName);
        const fileHandle = await dir.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    },

    async deleteSessionFile(path: string): Promise<boolean> {
        const [dirName, fileName] = path.split('/');
        try {
            const dir = await this.getDirectory(dirName);
            await dir.removeEntry(fileName);
            console.info(`[Storage] Deleted file: ${path}`);

            // Update Index
            await this.removeFromIndex(dirName, path);

            return true;
        } catch (e) {
            console.error("[Storage] Failed to delete file", path, e);
            return false;
        }
    },

    // --- New Data Management Functions ---

    async listAllAudioProjects(): Promise<string[]> {
        try {
            const root = await this.getRoot();
            const projects: string[] = [];

            const rootHandle = root as unknown as AsyncIterableDirectoryHandle;
            for await (const [name, handle] of rootHandle.entries()) {
                if (handle.kind === 'directory') {
                    projects.push(name);
                }
            }
            return projects;
        } catch (e) {
            console.error("[Storage] Failed to list projects", e);
            return [];
        }
    },

    async deleteAudioProject(projectName: string): Promise<boolean> {
        try {
            const root = await this.getRoot();
            await root.removeEntry(projectName, { recursive: true });
            console.info(`[Storage] Deleted project: ${projectName}`);
            return true;
        } catch (e) {
            console.error("[Storage] Failed to delete project", projectName, e);
            return false;
        }
    },

    async deleteAllData(): Promise<boolean> {
        try {
            const root = await this.getRoot();
            const entriesToDelete: string[] = [];

            const rootHandle = root as unknown as AsyncIterableDirectoryHandle;
            for await (const [name] of rootHandle.entries()) {
                entriesToDelete.push(name);
            }

            console.info(`[Storage] Found ${entriesToDelete.length} items to delete.`);

            for (const name of entriesToDelete) {
                try {
                    await root.removeEntry(name, { recursive: true });
                    console.info(`[Storage] Deleted: ${name}`);
                } catch (delErr) {
                    console.error(`[Storage] Failed to delete ${name}`, delErr);
                }
            }

            console.info(`[Storage] All data deletion attempt finished.`);
            return true;
        } catch (e) {
            console.error("[Storage] Failed to clear all data", e);
            return false;
        }
    }
};
