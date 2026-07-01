(() => {
  const qs = (sel) => document.querySelector(sel);

  // ---------- Inject Shuffle Buttons into existing Layer 1 Context Menu ----------
  const loadMenu = qs('#layer1Ctx');
  if (loadMenu) {

    // Setlist Shuffle (shuffle ALL albums)
    if (!qs('#shuffleSetlistBtn')) {
      const shuffleSetlistBtn = document.createElement('button');
      shuffleSetlistBtn.id = 'shuffleSetlistBtn';
      shuffleSetlistBtn.textContent = 'Setlist shuffle';
      shuffleSetlistBtn.style.display = 'none';
      loadMenu.appendChild(shuffleSetlistBtn);

      shuffleSetlistBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        loadMenu.style.display = 'none';

        if (window.currentSetlistShuffle?.artistId && window.currentSetlistShuffle.ready) {
          try {
            await generateSetlistShuffle(); // shuffle ALL albums
          } catch (err) {
            console.error('Shuffle failed:', err);
            alert('Shuffle failed.');
          }
        }
      });
    }

    // Album Shuffle (shuffle ONE album)
    if (!qs('#shuffleAlbumBtn')) {
      const shuffleAlbumBtn = document.createElement('button');
      shuffleAlbumBtn.id = 'shuffleAlbumBtn';
      shuffleAlbumBtn.textContent = 'Shuffle';
      shuffleAlbumBtn.style.display = 'none';
      loadMenu.appendChild(shuffleAlbumBtn);

      shuffleAlbumBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        loadMenu.style.display = 'none';

        const albumId = e.target.dataset.album;
        if (!albumId) return;

        try {
          const parts = albumId.split('/');
          const artistId = parts[0];
          const albumName = parts[1];
          const coverUrl = `/Vinyl Setlist/${encodeURIComponent(artistId)}/${encodeURIComponent(albumName)}/${encodeURIComponent(albumName)}.jpg`;

          const res = await fetch(`/api/albums/${encodeURIComponent(albumId)}/tracks`);
          const tracks = await res.json();
          if (!Array.isArray(tracks) || tracks.length === 0) {
            alert('No tracks found in album.');
            return;
          }

          const relPaths = tracks.map(t => t.filePath || t);
          const shuffled = relPaths.sort(() => Math.random() - 0.5);
          const textPayload = shuffled.join('\n');

          await fetch(`/api/artists/${encodeURIComponent(artistId)}/setlist-shuffle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textPayload })
          });

          if (typeof window.stopDeck === 'function') window.stopDeck();

          // ⭐ FIX: Album shuffle must NOT be treated as a setlist
          window.currentMode = 'album-shuffle';
          window.currentSetlistFile = null;
          window.currentSetlistCover = coverUrl;
          window.currentSetlistText = textPayload;
          window.currentSetlistShuffle = { artistId, albumName, coverUrl, ready: true };

          window.playlist = shuffled;
          window.currentIndex = 0;

          await preloadDurations(shuffled);
          if (!Array.isArray(window.trackDurations)) window.trackDurations = [];
          window.albumDuration = window.trackDurations.reduce((a, b) => a + (b || 0), 0);

          const coverImg = document.getElementById('cover');
if (coverImg) {
  ArtistAlbumCover(artistId, albumName).then(src => {
    coverImg.src = src;
  });
}


          const audio = document.getElementById('audio');
          if (audio) {
            try { audio.pause(); } catch (_) {}
            audio.onended = null;
            audio.onplay = null;
            audio.onloadedmetadata = null;
            audio.ontimeupdate = null;
            audio.replaceWith(audio);

            audio.addEventListener('ended', handleEnded);

            if (shuffled.length) {
              audio.src = '/Vinyl Setlist/' + shuffled[0];
              audio.load();
            }

            bindControls(audio);

            if (typeof window.updateTitle === 'function') window.updateTitle();

            if (window.isLrcMode && typeof window.loadLrcForCurrentTrack === 'function') {
              window.loadLrcForCurrentTrack(audio);
            } else if (typeof window.loadLyrics === 'function' && audio.src) {
              window.loadLyrics(audio.src);
            }
          }

          // ⭐ FIX: Do NOT show Setlist button for album shuffle
          if (typeof window.updateSetlistUI === 'function') {
            window.updateSetlistUI();
          }

          const layer1 = document.getElementById('layer1');
          if (layer1) {
            layer1.innerHTML = '';

            const node = document.createElement('div');
            node.className = 'album';
            node.setAttribute('data-album-id', albumId);
            node.setAttribute('data-album-name', albumName);

            const img = document.createElement('img');

            ArtistAlbumCover(artistId, albumName).then(src => {
            img.src = src;
            });

            img.alt = albumName;
            node.appendChild(img);


            const title = document.createElement('div');
            title.className = 'album-title';
            title.textContent = albumName;
            node.appendChild(title);

            layer1.appendChild(node);
          }

          console.log('Album shuffled and loaded.');
        } catch (err) {
          console.error('Album shuffle failed:', err);
          alert('Failed to shuffle album.');
        }
      });
    }
  }

  // ---------- Global Album Shuffle ----------
  window.generateAlbumShuffle = async function(albumId) {
    try {
      if (typeof window.stopDeck === 'function') {
        window.stopDeck();
      }

      const [artistId, albumName] = albumId.split('/');
      const coverUrl = `/Vinyl Setlist/${encodeURIComponent(artistId)}/${encodeURIComponent(albumName)}/${encodeURIComponent(albumName)}.jpg`;

      const res = await fetch(`/api/albums/${encodeURIComponent(albumId)}/tracks`);
      const tracks = await res.json();
      if (!Array.isArray(tracks) || tracks.length === 0) {
        alert('No tracks found in album.');
        return;
      }

      const shuffled = tracks.map(t => t.filePath || t).sort(() => Math.random() - 0.5);
      const textPayload = shuffled.join('\n');

      await fetch(`/api/albums/${encodeURIComponent(artistId)}/${encodeURIComponent(albumName)}/setlist-shuffle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textPayload })
      });

      // ⭐ FIX: Album shuffle mode
      window.currentMode = 'album-shuffle';
      window.currentSetlistFile = null;
      window.currentSetlistCover = coverUrl;
      window.currentSetlistText = textPayload;
      window.currentSetlistShuffle = { artistId, albumName, coverUrl, ready: true };

      window.playlist = shuffled;
      window.currentIndex = 0;

      await preloadDurations(shuffled);
      if (!Array.isArray(window.trackDurations)) window.trackDurations = [];
      window.albumDuration = window.trackDurations.reduce((a, b) => a + (b || 0), 0);

      const coverImg = document.getElementById('cover');
if (coverImg) {
  ArtistAlbumCover(artistId, albumName).then(src => {
    coverImg.src = src;
  });
}


      const audio = document.getElementById('audio');
      if (audio && shuffled.length) {
        audio.src = '/Vinyl Setlist/' + shuffled[0];
        audio.load();
      }

      if (typeof window.updateTitle === 'function') {
        const justName = shuffled[0].split(/[/\\]/).pop().replace(/\.(mp3|wav|flac)$/i, '');
        window.updateTitle(justName + ' (Album Shuffle)');
      }

      if (typeof window.updateSetlistUI === 'function') {
        window.updateSetlistUI();
      }

    } catch (err) {
      console.error('Failed to shuffle album:', err);
      alert('Failed to shuffle album.');
    }
  };

  window.generateSetlistShuffle = typeof generateSetlistShuffle === 'function'
    ? generateSetlistShuffle
    : () => console.warn('generateSetlistShuffle not defined yet.');

})();
