export const fetchDeezerTrack = async (rawSong) => {
    const query = encodeURIComponent(`${rawSong.artist} ${rawSong.title}`);
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocal) {
        try {
            const response = await fetch(`/api/deezer/search?q=${query}`);
            if (!response.ok) throw new Error(`Local fetch failed: ${response.status}`);
            const data = await response.json();
            return processTrackData(data, rawSong.year);
        } catch (err) {
            console.error("Local Deezer Error:", err);
            throw err;
        }
    }

    // --- Production Fallback System ---
    const targetUrl = `https://api.deezer.com/search?q=${query}`;
    
    // Strategy 1: AllOrigins (via /get to avoid raw string issues)
    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
        if (response.ok) {
            const json = await response.json();
            if (json.contents) {
                const data = JSON.parse(json.contents);
                return processTrackData(data, rawSong.year);
            }
        }
    } catch (e) {
        console.warn("AllOrigins attempt failed, trying fallback...");
    }

    // Strategy 2: CorsProxy.io (as fallback)
    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
        if (response.ok) {
            const data = await response.json();
            return processTrackData(data, rawSong.year);
        }
    } catch (e) {
        console.warn("CorsProxy attempt failed.");
    }

    throw new Error("Impossible de récupérer les données musicales (Proxies HS)");
};

const processTrackData = (data, year) => {
    if (!data || !data.data || data.data.length === 0) throw new Error("No track found");
    const track = data.data[0];
    if (!track.preview) throw new Error("No preview available");
    
    return {
        title: track.title,
        artist: track.artist.name,
        year: year,
        cover: track.album.cover_xl || track.album.cover_medium,
        preview: track.preview
    };
};
