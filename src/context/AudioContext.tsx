import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AudioContextType {
    file: File | null;
    fileName: string;
    setAudioFile: (file: File) => void;
    clearAudioFile: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>("");

    const setAudioFile = (file: File) => {
        setFile(file);
        setFileName(file.name);
    };

    const clearAudioFile = () => {
        setFile(null);
        setFileName("");
    };

    return (
        <AudioContext.Provider value={{ file, fileName, setAudioFile, clearAudioFile }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};
