/**
 * VaultMusic - Multi-User Intelligence Logic
 * Version: 5.0 (Ecosystem Release)
 */

const APP_CONFIG = {
    API_BASE: window.location.origin,
    YOUTUBE_PROXY: 'https://pipedapi.kavin.rocks',
    SEARCH_DELAY: 700,
    DEFAULT_COVER: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
    STORAGE_KEYS: { LIKES: 'vm_likes_v5', HISTORY: 'vm_history_v5', USER: 'vm_user_v5' }
};

const audio = new Audio();
const state = {
    isPlaying: false,
    currentTrack: null,
    user: JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER)) || null,
    likedTracks: JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LIKES)) || [],
    searchHistory: JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.HISTORY)) || [],
    playbackHistory: [],
    stats: { played: 0, likes: 0, playlists: 0 },
    activeView: 'home-view'
};

const elements = {
    searchInput: document.getElementById('search-input'),
    homeView: document.getElementById('home-view'),
    searchView: document.getElementById('search-view'),
    likesView: document.getElementById('likes-view'),
    profileView: document.getElementById('profile-view'),
    featuredList: document.getElementById('featured-list'),
    trendingList: document.getElementById('trending-list'),
    likesList: document.getElementById('likes-results-list'),
    searchResults: document.getElementById('search-results-list'),
    searchFeedback: document.getElementById('search-feedback'),
    recentSearches: document.getElementById('recent-searches'),
    miniPlayer: document.getElementById('mini-player'),
    fullPlayer: document.getElementById('full-player'),
    miniTitle: document.getElementById('mini-title'),
    miniArtist: document.getElementById('mini-artist'),
    miniCover: document.getElementById('mini-cover'),
    miniProgress: document.getElementById('mini-progress-fill'),
    fullTitle: document.getElementById('full-title'),
    fullArtist: document.getElementById('full-artist'),
    fullCover: document.getElementById('full-cover'),
    progressSlider: document.getElementById('progress-slider'),
    currentTimeLabel: document.getElementById('current-time'),
    totalTimeLabel: document.getElementById('total-time'),
    playPauseBtn: document.getElementById('play-pause-btn'),
    miniPlayPauseBtn: document.getElementById('mini-play-btn'),
    likeBtn: document.getElementById('like-btn'),
    loadingOverlay: document.getElementById('loading-overlay'),
    bottomNav: document.getElementById('bottom-nav'),
    profAvatar: document.getElementById('prof-avatar'),
    profName: document.getElementById('prof-display-name'),
    profUsername: document.getElementById('prof-username'),
    statPlayed: document.getElementById('stat-played'),
    statLikes: document.getElementById('stat-likes'),
    statPlaylists: document.getElementById('stat-playlists'),
    nicknameInput: document.getElementById('nickname-input'),
    saveNicknameBtn: document.getElementById('save-nickname-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    emptyLikes: document.getElementById('empty-likes')
};

// --- CORE ---

async function init() {
    setupTelegram();
    setupListeners();
    renderHome();

    // Initial UI state from local
    if (state.user) updateProfileUI();
    renderLikedTracks();

    // Sync with backend
    await syncWithBackend();

    // Final UI refresh
    hideLoading();
    lucide.createIcons();

    audio.addEventListener('timeupdate', updateProgressUI);
    audio.addEventListener('ended', () => { state.isPlaying = false; updatePlayUI(); });
    audio.addEventListener('loadedmetadata', () => elements.totalTimeLabel.innerText = formatTime(audio.duration));
}

function setupTelegram() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
            state.user = {
                user_id: tgUser.id.toString(),
                username: tgUser.username || 'usuario',
                first_name: tgUser.first_name || 'Amigo',
                photo_url: tgUser.photo_url || ''
            };
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(state.user));
        }
    }
    // Fallback dev user
    if (!state.user) {
        state.user = { user_id: 'DEV_8810', username: 'Medina', first_name: 'Medina', photo_url: '' };
    }
}

async function syncWithBackend() {
    if (!state.user) return;
    try {
        const res = await fetch(`${APP_CONFIG.API_BASE}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.user)
        });
        const json = await res.json();
        if (json.status === 'success') {
            const data = json.data;
            if (data.nickname) state.user.nickname = data.nickname;
            state.searchHistory = data.search_history || [];
            state.likedTracks = data.likes.map(l => JSON.parse(l));
            state.playbackHistory = data.playback_history.map(ph => JSON.parse(ph));
            state.stats = data.stats;

            saveLocal();
            updateProfileUI();
            renderHistory();
            renderLikedTracks();
            renderHome();
        }
    } catch (e) { console.warn("Sync failed, using offline data."); }
}

function saveLocal() {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LIKES, JSON.stringify(state.likedTracks));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(state.searchHistory));
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(state.user));
}

// --- VIEW ROUTING ---

function switchView(viewId) {
    if (state.activeView === viewId) return;

    const views = ['home-view', 'search-view', 'likes-view', 'profile-view'];
    views.forEach(vid => {
        const el = document.getElementById(vid);
        if (vid === viewId) el.classList.add('active');
        else el.classList.remove('active');
    });

    // Update nav status
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view === viewId) item.classList.add('active');
        else item.classList.remove('active');
    });

    state.activeView = viewId;
    lucide.createIcons();
}

// --- RENDERERS ---

function renderHome() {
    elements.featuredList.innerHTML = '';
    elements.trendingList.innerHTML = '';

    // Static local tracks for home
    const localTracks = [
        { id: 'l1', title: 'Cyber City Nights', artist: 'VaultMusic Pro', cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', type: 'local' },
        { id: 'l2', title: 'Neon Dreams', artist: 'Simulated', cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', type: 'local' }
    ];

    localTracks.forEach((t, i) => {
        const card = createCard(t);
        card.style.animationDelay = `${i * 0.1}s`;
        elements.featuredList.appendChild(card);
    });

    // Mirror for trending
    localTracks.concat(localTracks).forEach((t, i) => {
        const item = createListItem(t);
        item.style.animationDelay = `${(i + 4) * 0.05}s`;
        elements.trendingList.appendChild(item);
    });
}

function renderLikedTracks() {
    elements.likesList.innerHTML = '';
    if (state.likedTracks.length === 0) {
        elements.emptyLikes.classList.remove('hidden');
        elements.statLikes.innerText = '0';
        return;
    }
    elements.emptyLikes.classList.add('hidden');
    elements.statLikes.innerText = state.likedTracks.length;

    state.likedTracks.forEach((t, i) => {
        const item = createListItem(t);
        item.style.animationDelay = `${i * 0.05}s`;
        elements.likesList.appendChild(item);
    });
    lucide.createIcons();
}

function renderHistory() {
    elements.recentSearches.innerHTML = '';
    if (state.searchHistory.length === 0) {
        elements.recentSearches.innerHTML = '<p class="empty-text">No hay búsquedas recientes.</p>';
        return;
    }
    state.searchHistory.forEach(q => {
        const tag = document.createElement('div');
        tag.className = 'track-card-custom';
        tag.style.cssText = 'min-width:auto; padding:10px 20px; background:rgba(255,255,255,0.08); border-radius:100px; cursor:pointer;';
        tag.innerHTML = `<span style="font-size:0.85rem; font-weight:600;">${q}</span>`;
        tag.onclick = () => { elements.searchInput.value = q; handleSearch(q); };
        elements.recentSearches.appendChild(tag);
    });
}

function updateProfileUI() {
    if (!state.user) return;
    elements.profAvatar.src = state.user.photo_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop';
    elements.profName.innerText = state.user.nickname || state.user.first_name || 'Usuario';
    elements.profUsername.innerText = `@${state.user.username || 'vaultmusic'}`;
    elements.nicknameInput.value = state.user.nickname || '';

    elements.statPlayed.innerText = state.stats.played;
    elements.statLikes.innerText = state.stats.likes;
    elements.statPlaylists.innerText = state.stats.playlists;
}

function createCard(t) {
    const div = document.createElement('div');
    div.className = 'track-card-custom';
    div.innerHTML = `
        <div class="card-img-wrapper">
            <img src="${t.cover}" onerror="this.src='${APP_CONFIG.DEFAULT_COVER}'">
            <div class="card-overlay"><i data-lucide="play" style="fill:white"></i></div>
        </div>
        <div class="card-info">
            <span class="card-title truncate">${t.title}</span>
            <span class="card-artist truncate">${t.artist}</span>
        </div>
    `;
    div.onclick = () => selectTrack(t);
    return div;
}

function createListItem(t) {
    const isLiked = state.likedTracks.some(l => l.id === t.id);
    const div = document.createElement('div');
    div.className = 'track-item-custom';
    div.innerHTML = `
        <img src="${t.cover}" class="item-img" onerror="this.src='${APP_CONFIG.DEFAULT_COVER}'">
        <div class="item-info">
            <span class="item-title truncate">${t.title}</span>
            <span class="item-artist truncate">${t.artist}</span>
        </div>
        <div class="item-like-status ${isLiked ? 'active' : ''}">
            <i data-lucide="heart" style="${isLiked ? 'fill: var(--accent-primary);' : ''}"></i>
        </div>
    `;
    div.onclick = () => selectTrack(t);
    return div;
}

// --- LOGIC ---

async function handleSearch(q) {
    const query = q.trim();
    if (!query) { switchView('home-view'); return; }

    switchView('search-view');
    elements.searchFeedback.classList.remove('hidden');
    elements.searchResults.innerHTML = '';

    // History Logic
    if (state.user && !state.searchHistory.includes(query)) {
        state.searchHistory.unshift(query);
        state.searchHistory = state.searchHistory.slice(0, 10);
        saveLocal();
        renderHistory();
        fetch(`${APP_CONFIG.API_BASE}/api/history/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.user_id, query: query })
        });
    }

    try {
        const res = await fetch(`${APP_CONFIG.YOUTUBE_PROXY}/search?q=${encodeURIComponent(query)}&filter=videos`);
        const json = await res.json();
        const results = json.items.map(item => ({
            id: item.url.split('v=')[1],
            title: item.title,
            artist: item.uploaderName,
            cover: item.thumbnail,
            type: 'youtube'
        }));

        elements.searchFeedback.classList.add('hidden');
        if (results.length > 0) {
            results.forEach(t => elements.searchResults.appendChild(createListItem(t)));
            lucide.createIcons();
        }
    } catch (e) { elements.searchFeedback.classList.add('hidden'); }
}

async function selectTrack(t) {
    if (state.currentTrack?.id === t.id && state.isPlaying) return;

    state.currentTrack = t;
    elements.fullTitle.innerText = "Preparando...";
    elements.fullArtist.innerText = "VaultMusic Engine";
    elements.miniTitle.innerText = t.title;
    elements.miniArtist.innerText = t.artist;
    elements.miniCover.src = t.cover;
    elements.fullCover.src = t.cover;
    elements.miniPlayer.classList.remove('hidden');
    updatePlayUI();
    updateLikeUI();

    let streamUrl = t.url;
    if (t.type === 'youtube') {
        try {
            const res = await fetch(`${APP_CONFIG.YOUTUBE_PROXY}/streams/${t.id}`);
            const json = await res.json();
            const stream = json.audioStreams.sort((a, b) => b.bitrate - a.bitrate)[0];
            streamUrl = stream.url;
        } catch (e) { streamUrl = null; }
    }

    if (streamUrl) {
        audio.src = streamUrl;
        audio.play().catch(() => { });
        state.isPlaying = true;
        elements.fullTitle.innerText = t.title;
        elements.fullArtist.innerText = t.artist;

        // Track History
        state.stats.played++;
        updateProfileUI();
        fetch(`${APP_CONFIG.API_BASE}/api/history/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.user_id, track: t })
        });
    }
}

async function toggleLike() {
    if (!state.currentTrack || !state.user) return;
    const track = state.currentTrack;

    try {
        const res = await fetch(`${APP_CONFIG.API_BASE}/api/like/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.user_id, track: track })
        });
        const json = await res.json();
        if (json.status === 'success') {
            if (json.liked) {
                state.likedTracks.unshift(track);
                state.stats.likes++;
            } else {
                state.likedTracks = state.likedTracks.filter(l => l.id !== track.id);
                state.stats.likes--;
            }
            saveLocal();
            updateLikeUI();
            updateProfileUI();
            renderLikedTracks();
            renderHome();
        }
    } catch (e) { }
}

async function saveNickname() {
    const nick = elements.nicknameInput.value.trim();
    if (!nick || !state.user) return;

    state.user.nickname = nick;
    saveLocal();
    updateProfileUI();

    await fetch(`${APP_CONFIG.API_BASE}/api/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: state.user.user_id, nickname: nick })
    });
}

async function clearUserHistory() {
    if (!confirm("¿Seguro que quieres borrar todo tu historial?")) return;
    state.searchHistory = [];
    state.playbackHistory = [];
    state.stats.played = 0;
    saveLocal();
    updateProfileUI();
    renderHistory();
    await fetch(`${APP_CONFIG.API_BASE}/api/history/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: state.user.user_id })
    });
}

// --- UI UPDATES ---

function updatePlayUI() {
    const icon = state.isPlaying ? 'pause' : 'play';
    elements.playPauseBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
    elements.miniPlayPauseBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
    document.body.classList.toggle('playing', state.isPlaying);
    lucide.createIcons();
}

function updateLikeUI() {
    if (!state.currentTrack) return;
    const isLiked = state.likedTracks.some(l => l.id === state.currentTrack.id);
    elements.likeBtn.style.color = isLiked ? 'var(--accent-primary)' : '#fff';
    elements.likeBtn.innerHTML = `<i data-lucide="heart" style="${isLiked ? 'fill: var(--accent-primary);' : ''}"></i>`;
    lucide.createIcons();
}

function updateProgressUI() {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    elements.miniProgress.style.width = `${pct}%`;
    elements.progressSlider.value = pct;
    elements.currentTimeLabel.innerText = formatTime(audio.currentTime);
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    return `${m}:${rs.toString().padStart(2, '0')}`;
}

function hideLoading() {
    elements.loadingOverlay.style.opacity = '0';
    setTimeout(() => elements.loadingOverlay.classList.add('hidden'), 500);
}

function setupListeners() {
    elements.searchInput.onkeypress = (e) => { if (e.key === 'Enter') handleSearch(e.target.value); };

    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => switchView(item.dataset.view);
    });

    elements.miniPlayer.onclick = (e) => {
        if (!e.target.closest('.mini-btn')) {
            elements.fullPlayer.classList.add('active');
            document.body.classList.add('player-open');
        }
    };

    document.getElementById('close-player').onclick = () => {
        elements.fullPlayer.classList.remove('active');
        document.body.classList.remove('player-open');
    };

    elements.playPauseBtn.onclick = () => { if (!state.currentTrack) return; state.isPlaying ? audio.pause() : audio.play(); state.isPlaying = !state.isPlaying; updatePlayUI(); };
    elements.miniPlayPauseBtn.onclick = (e) => { e.stopPropagation(); if (!state.currentTrack) return; state.isPlaying ? audio.pause() : audio.play(); state.isPlaying = !state.isPlaying; updatePlayUI(); };
    elements.progressSlider.oninput = (e) => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; };
    elements.likeBtn.onclick = toggleLike;
    elements.saveNicknameBtn.onclick = saveNickname;
    elements.clearHistoryBtn.onclick = clearUserHistory;
}

init();
