window.artistPage = 1;
window.artistPerPage = 5;

(() => {
  let allFiles = [];
  let folders = [];
  let currentFolderIndex = 0;
  const audio = document.getElementById('audio');

function ArtistAlbumCover(folder, subfolder = null, isSetlist = false) {
  let coverPath;

  if (isSetlist) {
    coverPath = `/Vinyl Setlist/${encodeURIComponent(folder)}.jpg`;
  } else if (subfolder === null) {
    coverPath = `/Vinyl Setlist/${encodeURIComponent(folder)}/${encodeURIComponent(folder)}.jpg`;
  } else {
    coverPath = `/Vinyl Setlist/${encodeURIComponent(folder)}/${encodeURIComponent(subfolder)}/${encodeURIComponent(subfolder)}.jpg`;
  }

  const img = new Image();

  return new Promise(resolve => {
    img.onload = () => resolve(coverPath);

    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      const r1 = Math.floor(Math.random() * 255);
      const g1 = Math.floor(Math.random() * 255);
      const b1 = Math.floor(Math.random() * 255);

      const r2 = Math.floor(Math.random() * 255);
      const g2 = Math.floor(Math.random() * 255);
      const b2 = Math.floor(Math.random() * 255);

      const gradient = ctx.createLinearGradient(0, 0, 600, 600);
      gradient.addColorStop(0, `rgb(${r1},${g1},${b1})`);
      gradient.addColorStop(1, `rgb(${r2},${g2},${b2})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 600);

      resolve(canvas.toDataURL('image/png'));
    };

    img.src = coverPath;
  });
}

window.ArtistAlbumCover = ArtistAlbumCover;


  // ---------- Render artist (folder) ----------
  function renderFolderBox(folder) {
  const box = document.createElement('div');
  box.className = 'folderBox';

  const img = document.createElement('img');
  ArtistAlbumCover(folder).then(src => img.src = src);
  img.alt = folder;

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = folder;

  box.appendChild(img);
  box.appendChild(label);

  box.addEventListener('click', () => loadSubFolders(folder));
  return box;
}

  // ---------- Render album (subfolder) ----------
  function renderSubFolderBox(folder, subfolder) {
  const box = document.createElement('div');
  box.className = 'folderBox';

  const img = document.createElement('img');
  ArtistAlbumCover(folder, subfolder).then(src => img.src = src);
  img.alt = subfolder;

  img.onload = () => {
    if (window.currentAlbumContext) {
      window.currentAlbumContext.albumsLoaded = true;
      if (typeof window.updateShuffleUI === 'function') {
        window.updateShuffleUI();
      }
    }
  };

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = subfolder;

  box.appendChild(img);
  box.appendChild(label);

  box.addEventListener('click', () => {
    if (typeof window.stopDeck === 'function') window.stopDeck();
    const subPath = `${folder}/${subfolder}`;
    loadAlbum(subPath);
  });

  return box;
}

function renderArtistPagination() {
  const pagination = document.getElementById('artistPagination');
  if (!pagination) return;

  const totalPages = Math.ceil(folders.length / window.artistPerPage);

  pagination.innerHTML = `
    <button id="artistPrevBtn" ${window.artistPage > 1 ? '' : 'disabled'}>&lt;</button>
    <span class="artistPageNumber">${window.artistPage}</span>
    <button id="artistNextBtn" ${window.artistPage < totalPages ? '' : 'disabled'}>&gt;</button>
  `;

  document.getElementById('artistPrevBtn').onclick = () => {
    if (window.artistPage > 1) {
      window.artistPage--;
      renderPaginatedArtists();
    }
  };

  document.getElementById('artistNextBtn').onclick = () => {
    if (window.artistPage < totalPages) {
      window.artistPage++;
      renderPaginatedArtists();
    }
  };
}

function renderPaginatedArtists() {
  const carousel = document.getElementById('folderCarousel');
  if (!carousel) return;

  carousel.innerHTML = '';

  const start = (window.artistPage - 1) * window.artistPerPage;
  const end = start + window.artistPerPage;

  const pageFolders = folders.slice(start, end);

  pageFolders.forEach(folder => {
    carousel.appendChild(renderFolderBox(folder));
  });

  renderArtistPagination();
}

function renderCurrentFolder() {
  renderPaginatedArtists();
}


  // ---------- Load artist (subfolders) ----------
  async function loadSubFolders(folder) {
    try {
      const artistFolder = folder;
      window.currentMode = "album";
      window.currentSetlistFile = null;

      window.currentSetlistShuffle = {
        artistId: artistFolder,
        coverUrl: `/Vinyl Setlist/${encodeURIComponent(artistFolder)}/${encodeURIComponent(artistFolder)}.jpg`,
        ready: false
      };

      const res = await fetch(`/subfolders/${encodeURIComponent(artistFolder)}`);
      const subfolders = await res.json();

      window.currentSetlistShuffle.ready = true;

      if (typeof window.updateShuffleUI === 'function') {
        window.updateShuffleUI();
      }

      const carousel = document.getElementById('folderCarousel');
      carousel.innerHTML = '';
      subfolders.forEach(sub => {
        carousel.appendChild(renderSubFolderBox(artistFolder, sub));
      });

    } catch (err) {
      console.error('Error loading subfolders', err);
      window.currentSetlistShuffle = null;
      if (typeof window.updateShuffleUI === 'function') {
        window.updateShuffleUI();
      }
    }
  }

  function normalizeSrc(src) {
    try {
      const u = new URL(src, window.location.origin);
      return decodeURIComponent(u.pathname);
    } catch {
      return decodeURIComponent(src);
    }
  }

  function prepareTrack(index) {
    if (index >= 0 && index < window.playlist.length) {
      window.currentIndex = index;
      const relSrc = '/Vinyl Setlist/' + window.playlist[window.currentIndex];
      audio.src = relSrc;

      if (typeof updateTitle === 'function') updateTitle();

      if (window.isLrcMode && typeof window.loadLrcForCurrentTrack === 'function') {
        window.loadLrcForCurrentTrack(audio);
      } else if (typeof loadLyrics === 'function') {
        loadLyrics(normalizeSrc(relSrc));
      }
    }
  }

  function loadAlbum(subfolder) {
    const audioExtensions = ['mp3','wav','wma','aac','flac','ogg','m4a','mid','midi','aiff','au'];
    window.playlist = allFiles.filter(f =>
      f.startsWith(subfolder + '/') &&
      audioExtensions.some(ext => f.toLowerCase().endsWith('.' + ext))
    ).sort((a, b) => {
      const ax = a.split('/').pop();
      const bx = b.split('/').pop();
      const na = parseInt(ax, 10);
      const nb = parseInt(bx, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return ax.localeCompare(bx, undefined, { sensitivity: 'base' });
    });

    window.currentIndex = 0;
    window.trackDurations = new Array(window.playlist.length).fill(0);
    window.albumDuration = 0;

    if (window.playlist.length > 0) {
      updateCover(subfolder);
      if (typeof updateTitle === 'function') updateTitle();

      let i = 0;
      const loadNextDuration = () => {
        if (i >= window.playlist.length) {
          window.albumDuration = window.trackDurations.reduce((a, b) => a + b, 0);
          prepareTrack(window.currentIndex);
          if (window.isLrcMode && typeof window.loadLrcForCurrentTrack === 'function') {
            window.loadLrcForCurrentTrack(audio);
          }
          return;
        }

        const url = '/Vinyl Setlist/' + window.playlist[i];
        const probe = new Audio();
        probe.src = url;
        probe.preload = 'metadata';
        probe.addEventListener('loadedmetadata', () => {
          window.trackDurations[i] = probe.duration || 0;
          i++;
          loadNextDuration();
        });
        probe.addEventListener('error', () => {
          window.trackDurations[i] = 0;
          i++;
          loadNextDuration();
        });
      };
      loadNextDuration();
    } else {
      document.getElementById('currentTrack').textContent = 'No track files found in album';
    }
  }

function updateCover(subfolder) {
  const parts = subfolder.split('/');
  const artist = parts[0];
  const album = parts[1];

  const coverEl = document.getElementById('cover');
  if (!coverEl) return;

  ArtistAlbumCover(artist, album).then(src => {
    coverEl.src = src;
    coverEl.style.display = 'block';
  });
}

function updateVinylCover(artistFolder) {
  const deckImg = document.getElementById('vinylCover');
  if (!deckImg) return;

  ArtistAlbumCover(artistFolder).then(src => {
    deckImg.src = src;
  });
}


  document.getElementById('swingLeft').addEventListener('click', () => {
    window.currentMode = "album";
    window.currentSetlistFile = null;
    currentFolderIndex = (currentFolderIndex - 1 + folders.length) % folders.length;
    renderCurrentFolder();
    if (typeof window.updateSetlistUI === 'function') {
      window.updateSetlistUI();
    }
  });

  document.getElementById('swingRight').addEventListener('click', () => {
    window.currentMode = "album";
    window.currentSetlistFile = null;
    currentFolderIndex = (currentFolderIndex + 1) % folders.length;
    renderCurrentFolder();
    if (typeof window.updateSetlistUI === 'function') {
      window.updateSetlistUI();
    }
  });

  if (audio) {
    audio.addEventListener('ended', () => {
      if (window.currentIndex < window.playlist.length - 1) {
        window.currentIndex += 1;
        const relSrc = '/Vinyl Setlist/' + window.playlist[window.currentIndex];
        audio.src = relSrc;
        if (typeof updateTitle === 'function') updateTitle();
        if (window.isLrcMode && typeof window.loadLrcForCurrentTrack === 'function') {
          window.loadLrcForCurrentTrack(audio);
        } else if (typeof loadLyrics === 'function') {
          loadLyrics(normalizeSrc(relSrc));
        }
        audio.play().catch(err => console.warn('Auto‑play failed:', err));
        if (typeof window.startDeckPlayback === 'function') {
          window.startDeckPlayback();
        }
      } else {
        if (typeof window.stopDeck === 'function') {
          window.stopDeck();
        }
        window.albumFinished = true;
      }
    });
  }

document.getElementById('startStopBtn').addEventListener('click', () => {
  if (window.albumFinished) {
    window.albumFinished = false;
    window.currentIndex = 0;
    prepareTrack(window.currentIndex);
    audio.play().catch(err => console.warn('Restart play failed:', err));
    if (typeof window.startDeckPlayback === 'function') {
      window.startDeckPlayback();
    }
  }
});

// ---------- Fetch setlist and folders ----------
async function fetchSetlist() {
  try {
    const resFiles = await fetch('/setlist');
    allFiles = await resFiles.json();

    const resFolders = await fetch('/folders');
    folders = (await resFolders.json()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    renderCurrentFolder();
  } catch (err) {
    console.error('Failed to fetch setlist or folders:', err);
  }
}

document.addEventListener('DOMContentLoaded', fetchSetlist);

// ---------- Global exposure for shuffle + UI modules ----------
window.loadAlbum = loadAlbum;
window.prepareTrack = prepareTrack;
window.updateCover = updateCover;
window.updateVinylCover = updateVinylCover;
window.loadSubFolders = loadSubFolders;
})();
