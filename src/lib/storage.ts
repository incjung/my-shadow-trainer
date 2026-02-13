
export interface FileSystemEntry {
    name: string;
    kind: 'file' | 'directory';
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

        return `${audioFileName}/${fileName}`;
    },

    async listSessions(audioFileName: string): Promise<string[]> {
        try {
            const dir = await this.getDirectory(audioFileName);
            const files: string[] = [];

            // @ts-ignore
            for await (const [name, handle] of dir.entries()) {
                if (handle.kind === 'file' && name.endsWith('.json') && name !== '_order.json') {
                    files.push(`${audioFileName}/${name}`);
                }
            }

            // Apply custom order if exists
            const order = await this.getSessionOrder(audioFileName);
            if (order.length > 0) {
                // Return files in the saved order, with any new files at the top
                const orderedSet = new Set(order);
                const newFiles = files.filter(f => !orderedSet.has(f)).sort().reverse();
                // Filter out files that might have been deleted but are still in order list
                const validOrderedFiles = order.filter(f => files.includes(f));

                return [...newFiles, ...validOrderedFiles];
            }

            return files.sort().reverse(); // Default: Newest first
        } catch (e) {
            return [];
        }
    },

    async saveSessionOrder(audioFileName: string, order: string[]): Promise<void> {
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
            // @ts-ignore
            for await (const [name, handle] of root.entries()) {
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

            // @ts-ignore
            for await (const [name, handle] of root.entries()) {
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
