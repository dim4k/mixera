export const fetchDeezerTrack = async (rawSong) => {
     const query = encodeURIComponent(`${rawSong.artist} ${rawSong.title}`);
     
     // Vite proxy /api/deezer/ only works in dev mode.
     // For GitHub Pages (Static site), we call the API directly via a CORS proxy.
     const targetUrl = `https://api.deezer.com/search?q=${query}`;
     const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
     
     const response = await fetch(proxyUrl);
     const result = await response.json();
     
     // AllOrigins returns the stringified response in a 'contents' field
     const data = JSON.parse(result.contents);
     
     if (!data.data || data.data.length === 0) throw new Error("No track");
     const track = data.data[0];
     if (!track.preview) throw new Error("No preview");
     
     return {
        title: track.title,
        artist: track.artist.name,
        year: rawSong.year,
        cover: track.album.cover_xl || track.album.cover_medium,
        preview: track.preview
    };
};
