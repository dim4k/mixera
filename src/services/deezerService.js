import { Capacitor } from '@capacitor/core';

export const fetchDeezerTrack = async (rawSong) => {
    const query = encodeURIComponent(`${rawSong.artist} ${rawSong.title}`);
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isNative = Capacitor.isNativePlatform();

    // 1. Native App (Android/iOS) - Direct Call via CapacitorHttp
    if (isNative) {
        try {
            const response = await fetch(`https://api.deezer.com/search?q=${query}`);
            if (!response.ok) throw new Error(`Deezer API Error: ${response.status}`);
            const data = await response.json();
            return processTrackData(data, rawSong.year);
        } catch (err) {
            console.error("Native Deezer Error:", err);
            throw err;
        }
    }

    // 2. Local Development - Vite Proxy
    if (isLocal) {
        try {
            const response = await fetch(`/api/deezer/search?q=${query}`);
            if (!response.ok) throw new Error(`Vite Proxy failed: ${response.status}`);
            const data = await response.json();
            return processTrackData(data, rawSong.year);
        } catch (err) {
            console.error("Local Deezer Error:", err);
            throw err;
        }
    }

    // 3. Web Production (GitHub Pages) - No Proxy anymore (User decision)
    // If we land here on web, standard CORS will likely block us.
    throw new Error("Cette version web ne supporte plus la recherche musicale. Veuillez utiliser l'application Android.");
};

const processTrackData = (data, year) => {
    if (!data || !data.data || data.data.length === 0) throw new Error("Aucun morceau trouvé.");
    const track = data.data[0];
    if (!track.preview) throw new Error("Aperçu non disponible.");
    
    return {
        title: track.title,
        artist: track.artist.name,
        year: year,
        cover: track.album.cover_xl || track.album.cover_medium || "",
        preview: track.preview
    };
};
