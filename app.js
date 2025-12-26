/**
 * VaultMusic - Ultra-Premium Music Player Logic
 * Version: 3.1 (History & Reliability Fix)
 */

window.onerror = function () { return true; };

const APP_CONFIG = {
    API_BASE: window.location.origin,
    SEARCH_DELAY: 400,
    DEFAULT_COVER: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'
};

const mockTracks = [
    { id: '1', title: 'Cyber City Nights', artist: 'VaultMusic Pro', cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: '2', title: 'Neon Dreams', artist: 'The Weeknd (Sim)', cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: '3', title: 'Levitating Wave', artist: 'Dua Lipa (Sim)', cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: '4', title: 'Starboy Legacy', artist: 'VaultMusic IA', cover: 'https://images.unsplash.com/photo-1514525253344-f814d07293c0?w=400&h=400&fit=crop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' }
];

const audio = new Audio();
const state = {
    isPlaying: false,
    currentTrack: null,
    user: null,
    likedTracks: [],
    searchHistory: [], // String queries
};

const elements = {
    searchInput: document.getElementById('search-input'),
    homeView: document.getElementById('home-view'),
    searchView: document.getElementById('search-view'),
    featuredList: document.getElementById('featured-list'),
    trendingList: document.getElementById('trending-list'),
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
    visualizer: document.getElementById('visualizer'),
    likeBtn: document.getElementById('like-btn')
};

async function init() {
    setupTelegram();
    await syncWithBackend();
    renderHome();
    renderHistory();
    setupListeners();
    lucide.createIcons();

    audio.addEventListener('loadedmetadata', () => elements.totalTimeLabel.innerText = formatTime(audio.duration));
    audio.addEventListener('timeupdate', updateProgressUI);
    audio.addEventListener('ended', () => { state.isPlaying = false; updatePlayUI(); });
}

function setupTelegram() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();

        const user = tg.initDataUnsafe?.user;
        if (user) {
            state.user = {
                user_id: user.id.toString(),
                username: user.username || 'Anonymous',
                first_name: user.first_name || 'User'
            };
        } else {
            state.user = { user_id: 'DEV_USER', username: 'Guest', first_name: 'Medina' };
        }
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
            state.searchHistory = json.data.search_history || [];
            state.likedTracks = json.data.likes || [];
        }
    } catch (e) { console.error("Sync Error:", e); }
}

function renderHome() {
    elements.featuredList.innerHTML = '';
    elements.trendingList.innerHTML = '';
    mockTracks.forEach((t, i) => {
        const card = createCard(t);
        card.style.animationDelay = `${i * 0.1}s`;
        elements.featuredList.appendChild(card);
        const item = createListItem(t);
        item.style.animationDelay = `${(i + 4) * 0.05}s`;
        elements.trendingList.appendChild(item);
    });
}

function createCard(t) {
    const div = document.createElement('div');
    div.className = 'track-card-custom';
    div.innerHTML = `<div class="card-img-wrapper" style="background-image: url('${t.cover}')"><div class="card-overlay"><i data-lucide="play" style="fill:white"></i></div></div><div class="card-info"><span class="card-title truncate">${t.title}</span><span class="card-artist truncate">${t.artist}</span></div>`;
    div.onclick = () => selectTrack(t);
    return div;
}

function createListItem(t) {
    const isLiked = state.likedTracks.includes(t.id);
    const div = document.createElement('div');
    div.className = 'track-item-custom';
    div.innerHTML = `
        <img src="${t.cover}" class="item-img" onerror="this.src='${APP_CONFIG.DEFAULT_COVER}'; this.onerror=null;">
        <div class="item-info">
            <span class="item-title truncate">${t.title}</span>
            <span class="item-artist truncate">${t.artist}</span>
        </div>
        <div class="item-like-status ${isLiked ? 'active' : ''}">
            <i data-lucide="heart" style="${isLiked ? 'fill: var(--accent-primary); stroke: var(--accent-primary);' : ''}"></i>
        </div>
    `;
    div.onclick = () => selectTrack(t);
    return div;
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
        tag.style.cssText = 'min-width:auto; padding:8px 16px; background:rgba(255,255,255,0.08); border-radius:100px; margin-bottom:0;';
        tag.innerHTML = `<span style="font-size:0.8rem; font-weight:600;">${q}</span>`;
        tag.onclick = () => { elements.searchInput.value = q; handleSearch(q); };
        elements.recentSearches.appendChild(tag);
    });
}

function selectTrack(t) {
    if (state.currentTrack?.id === t.id && state.isPlaying) return;
    state.currentTrack = t;
    audio.src = t.url;
    audio.play().catch(() => { });
    state.isPlaying = true;

    elements.miniTitle.innerText = t.title;
    elements.miniArtist.innerText = t.artist;
    elements.miniCover.src = t.cover;
    elements.fullTitle.innerText = t.title;
    elements.fullArtist.innerText = t.artist;
    elements.fullCover.src = t.cover;
    elements.miniPlayer.classList.remove('hidden');

    updatePlayUI();
    updateLikeUI();

    if (state.user) {
        fetch(`${APP_CONFIG.API_BASE}/api/history/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.user_id, track_id: t.id })
        });
    }
}

async function handleSearch(q) {
    if (!q) {
        elements.homeView.classList.add('active');
        elements.searchView.classList.remove('active');
        return;
    }

    elements.homeView.classList.remove('active');
    elements.searchView.classList.add('active');
    elements.searchFeedback.classList.remove('hidden');
    elements.searchResults.innerHTML = '';

    // Persist search query
    if (state.user) {
        fetch(`${APP_CONFIG.API_BASE}/api/search/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.user.user_id, query: q })
        });
        if (!state.searchHistory.includes(q)) {
            state.searchHistory.unshift(q);
            state.searchHistory = state.searchHistory.slice(0, 10);
            renderHistory();
        }
    }

    setTimeout(() => {
        elements.searchFeedback.classList.add('hidden');
        const results = mockTracks.filter(t => t.title.toLowerCase().includes(q.toLowerCase()) || t.artist.toLowerCase().includes(q.toLowerCase()));

        if (results.length > 0) {
            results.forEach(t => elements.searchResults.appendChild(createListItem(t)));
        } else {
            // IA Simulation
            mockTracks.forEach(t => elements.searchResults.appendChild(createListItem(t)));
        }
        lucide.createIcons();
    }, APP_CONFIG.SEARCH_DELAY);
}

function toggleLike() {
    if (!state.currentTrack || !state.user) return;
    fetch(`${APP_CONFIG.API_BASE}/api/like/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: state.user.user_id, track_id: state.currentTrack.id })
    })
        .then(r => r.json())
        .then(json => {
            if (json.status === 'success') {
                if (json.liked) state.likedTracks.push(state.currentTrack.id);
                else state.likedTracks = state.likedTracks.filter(id => id !== state.currentTrack.id);
                updateLikeUI();
                renderHome();
            }
        });
}

function updateLikeUI() {
    if (!state.currentTrack) return;
    const isLiked = state.likedTracks.includes(state.currentTrack.id);
    if (elements.likeBtn) {
        elements.likeBtn.style.color = isLiked ? 'var(--accent-primary)' : 'var(--text-secondary)';
        elements.likeBtn.innerHTML = `<i data-lucide="heart" style="${isLiked ? 'fill: var(--accent-primary); stroke: var(--accent-primary);' : ''}"></i>`;
        lucide.createIcons();
    }
}

function togglePlay() {
    if (!state.currentTrack) return;
    state.isPlaying ? audio.pause() : audio.play();
    state.isPlaying = !state.isPlaying;
    updatePlayUI();
}

function updatePlayUI() {
    const icon = state.isPlaying ? 'pause' : 'play';
    elements.playPauseBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
    elements.miniPlayPauseBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
    document.body.classList.toggle('playing', state.isPlaying);
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

function setupListeners() {
    elements.searchInput.oninput = (e) => {
        clearTimeout(window.sd);
        window.sd = setTimeout(() => handleSearch(e.target.value), 600);
    };

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

    elements.playPauseBtn.onclick = togglePlay;
    elements.miniPlayPauseBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
    elements.progressSlider.oninput = (e) => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; };
    if (elements.likeBtn) elements.likeBtn.onclick = toggleLike;

    // Robust image recovery
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            e.target.src = APP_CONFIG.DEFAULT_COVER;
            e.target.onerror = null; // Prevent infinite loops
        }
    }, true);
}

init();
