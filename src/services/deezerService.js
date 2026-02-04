export const fetchDeezerTrack = async (rawSong) => {
    const query = encodeURIComponent(`${rawSong.artist} ${rawSong.title}`);
    
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let data;

    try {
        if (isLocal) {
            // Local dev: Target the Vite proxy at the root
            const response = await fetch(`/api/deezer/search?q=${query}`);
            data = await response.json();
        } else {
            // Production: Use allorigins raw proxy (more permissive for Deezer)
            const targetUrl = `https://api.deezer.com/search?q=${query}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            const response = await fetch(proxyUrl);
            data = await response.json();
        }

        if (!data || !data.data || data.data.length === 0) throw new Error("No track");
        
        const track = data.data[0];
        if (!track.preview) throw new Error("No preview available");
        
        return {
            title: track.title,
            artist: track.artist.name,
            year: rawSong.year,
            cover: track.album.cover_xl || track.album.cover_medium,
            preview: track.preview
        };
    } catch (err) {
        console.error("Deezer Service Error:", err);
        throw err;
    }
};
