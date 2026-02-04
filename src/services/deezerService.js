export const fetchDeezerTrack = async (rawSong) => {
     const query = encodeURIComponent(`${rawSong.artist} ${rawSong.title}`);
     const response = await fetch(`/api/deezer/search?q=${query}`);
     const data = await response.json();
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
