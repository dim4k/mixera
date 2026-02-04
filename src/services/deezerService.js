export const fetchDeezerTrack = async (rawSong) => {
    const query = encodeURIComponent(`${rawSong.artist} ${rawSong.title}`);
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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

    // --- Production Multi-Proxy Strategy ---
    const targetUrl = `https://api.deezer.com/search?q=${query}`;
    
    // Strategy A: AllOrigins JSON Wrapper (Stable but sometimes 408)
    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
        if (response.ok) {
            const json = await response.json();
            if (json.contents) {
                const data = JSON.parse(json.contents);
                if (data && data.data) return processTrackData(data, rawSong.year);
            }
        }
    } catch (e) { console.warn("Proxy A (AllOrigins JSON) failed."); }

    // Strategy B: Codetabs (Direct RAW proxy, usually very fast)
    try {
        const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${targetUrl}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.data) return processTrackData(data, rawSong.year);
        }
    } catch (e) { console.warn("Proxy B (Codetabs) failed."); }

    // Strategy C: AllOrigins RAW (Last resort fallback)
    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.data) return processTrackData(data, rawSong.year);
        }
    } catch (e) { console.warn("Proxy C (AllOrigins RAW) failed."); }

    throw new Error("Toutes les tentatives de connexion au serveur musical ont échoué. Veuillez réessayer dans quelques instants.");
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
