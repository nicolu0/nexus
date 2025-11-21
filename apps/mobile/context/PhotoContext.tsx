import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PhotoContextType {
    photos: string[];
    addPhoto: (uri: string) => void;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function PhotoProvider({ children }: { children: ReactNode }) {
    const [photos, setPhotos] = useState<string[]>([]);

    const addPhoto = (uri: string) => {
        setPhotos((prev) => [uri, ...prev]);
    };

    return (
        <PhotoContext.Provider value={{ photos, addPhoto }}>
            {children}
        </PhotoContext.Provider>
    );
}

export function usePhotos() {
    const context = useContext(PhotoContext);
    if (context === undefined) {
        throw new Error('usePhotos must be used within a PhotoProvider');
    }
    return context;
}
