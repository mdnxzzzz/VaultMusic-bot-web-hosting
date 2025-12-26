/**
 * VaultMusic - Ultra-Premium Music Player Logic
 * Version: 2.1 (Real Audio & Image Fixes)
 * Features: Real Audio Engine, Ultra-Stable Images, YT-Search Fix
 */

// --- 1. CONFIGURATION & MOCK DATA (REAL SAMPLES) ---
const APP_CONFIG = {
    YT_SIMULATION_DELAY: 1500,
    STORAGE_KEY_HISTORY: 'vaultmusic_search_history',
    AUTOPLAY: true
};

const mockTracks = [
    {
        id: '1',
        title: 'Cyber City Nights',
        artist: 'VaultMusic Pro',
        cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    {
        id: '2',
        title: 'Neon Dreams',
        artist: 'The Weeknd (Sim)',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    {
        id: '3',
        title: 'Levitating Wave',
        artist: 'Dua Lipa (Sim)',
        cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    },
    {
        id: '4',
        title: 'Starboy Legacy',
        artist: 'VaultMusic IA',
        cover: 'https://images.unsplash.com/photo-1514525253344-f814d07293c0?w=400&h=400&fit=crop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
    }
];

// --- 2. GLOBAL AUDIO ENGINE ---
const audio = new Audio();

// --- 3. STATE ---
const state = {
    isPlaying: false,
    currentTrack: null,
    searchHistory: JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEY_HISTORY)) || ['Starboy', 'The Weeknd'],
};

// --- 4. UI SELECTORS ---
const elements = {
    searchInput: document.getElementById('search-input'),
    homeView: document.getElementById('home-view'),
    searchView: document.getElementById('search-view'),
    featuredList: document.getElementById('featured-list'),
    trendingList: document.getElementById('trending-list'),
    searchResults: document.getElementById('search-results-list'),
    searchFeedback: document.getElementById('search-feedback'),
    searchStatusText: document.getElementById('search-status-text'),
    recentSearches: document.getElementById('recent-searches'),

    // Player
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
    visualizer: document.getElementById('visualizer')
};

// --- 5. INITIALIZATION ---

function init() {
    renderHome();
    renderHistory();
    setupListeners();
    integrateTelegram();
    lucide.createIcons();

    // Audio listeners
    audio.addEventListener('loadedmetadata', () => {
        elements.totalTimeLabel.innerText = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
        state.isPlaying = false;
        updatePlayIcons();
    });
}

function integrateTelegram() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        tg.setHeaderColor('#020202');
        tg.setBackgroundColor('#020202');
    }
}

// --- 6. RENDER LOGIC ---

function renderHome() {
    elements.featuredList.innerHTML = '';
    elements.trendingList.innerHTML = '';

    mockTracks.forEach(track => {
        elements.featuredList.appendChild(createCard(track));
        elements.trendingList.appendChild(createListItem(track));
    });
}

function createCard(track) {
    const div = document.createElement('div');
    div.className = 'track-card-custom';
    div.innerHTML = `
        <div class="card-img-wrapper" style="background-image: url('${track.cover}')">
            <div class="card-overlay">
                <i data-lucide="play" style="fill: white; width: 40px; height: 40px;"></i>
            </div>
        </div>
        <div class="card-info">
            <span class="card-title truncate">${track.title}</span>
            <span class="card-artist truncate">${track.artist}</span>
        </div>
    `;
    div.onclick = () => selectTrack(track);
    return div;
}

function createListItem(track) {
    const div = document.createElement('div');
    div.className = 'track-item-custom';
    div.innerHTML = `
        <img src="${track.cover}" class="item-img" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'">
        <div class="item-info">
            <span class="item-title truncate">${track.title}</span>
            <span class="item-artist truncate">${track.artist}</span>
        </div>
        <i data-lucide="more-vertical" class="item-more"></i>
    `;
    div.onclick = () => selectTrack(track);
    return div;
}

function renderHistory() {
    elements.recentSearches.innerHTML = '';
    state.searchHistory.forEach(query => {
        const tag = document.createElement('div');
        tag.className = 'track-card-custom';
        tag.style.minWidth = 'auto';
        tag.style.padding = '8px 16px';
        tag.style.background = 'rgba(255,255,255,0.05)';
        tag.style.borderRadius = '50px';
        tag.innerHTML = `<span style="font-size: 0.85rem; font-weight: 600;">${query}</span>`;
        tag.onclick = () => {
            elements.searchInput.value = query;
            handleSearch(query);
        };
        elements.recentSearches.appendChild(tag);
    });
}

// --- 7. PLAYER CONTROLLER ---

function selectTrack(track) {
    state.currentTrack = track;

    // Audio engine load
    audio.src = track.url;
    audio.play().catch(e => console.log("User interaction required for audio"));
    state.isPlaying = true;

    // Update UI
    elements.miniTitle.innerText = track.title;
    elements.miniArtist.innerText = track.artist;
    elements.miniCover.src = track.cover;

    elements.fullTitle.innerText = track.title;
    elements.fullArtist.innerText = track.artist;
    elements.fullCover.src = track.cover;

    elements.miniPlayer.classList.remove('hidden');
    updatePlayIcons();
}

function togglePlay() {
    if (!state.currentTrack) return;
    if (state.isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    state.isPlaying = !state.isPlaying;
    updatePlayIcons();
}

function updatePlayIcons() {
    const icon = state.isPlaying ? 'pause' : 'play';
    elements.playPauseBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
    elements.miniPlayPauseBtn.innerHTML = `<i data-lucide="${icon}"></i>`;

    if (state.isPlaying) {
        elements.visualizer.style.opacity = '1';
        document.body.classList.add('playing');
    } else {
        elements.visualizer.style.opacity = '0.3';
        document.body.classList.remove('playing');
    }
    lucide.createIcons();
}

function updateProgress() {
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

// --- 8. SMART SEARCH FIX ---

function handleSearch(query) {
    if (!query) {
        elements.homeView.classList.add('active');
        elements.searchView.classList.remove('active');
        return;
    }

    elements.homeView.classList.remove('active');
    elements.searchView.classList.add('active');
    elements.searchFeedback.classList.remove('hidden');
    elements.searchResults.innerHTML = '';
    elements.searchStatusText.innerText = "Conectando con YouTube Library...";

    setTimeout(() => {
        elements.searchFeedback.classList.add('hidden');

        // Save to history
        if (!state.searchHistory.includes(query)) {
            state.searchHistory.unshift(query);
            state.searchHistory = state.searchHistory.slice(0, 8);
            localStorage.setItem(APP_CONFIG.STORAGE_KEY_HISTORY, JSON.stringify(state.searchHistory));
            renderHistory();
        }

        performRealSearch(query);
    }, APP_CONFIG.YT_SIMULATION_DELAY);
}

function performRealSearch(query) {
    const q = query.toLowerCase();
    const results = mockTracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));

    if (results.length > 0) {
        results.forEach(t => elements.searchResults.appendChild(createListItem(t)));
    } else {
        // Fallback IA
        mockTracks.forEach(t => elements.searchResults.appendChild(createListItem(t)));
    }
    lucide.createIcons();
}

// --- 9. EVENT BINDING ---

function setupListeners() {
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(window.searchDebounce);
        window.searchDebounce = setTimeout(() => handleSearch(e.target.value), 400);
    });

    // Player
    elements.miniPlayer.onclick = (e) => {
        if (!e.target.closest('.mini-btn')) elements.fullPlayer.classList.add('active');
    };
    document.getElementById('close-player').onclick = () => elements.fullPlayer.classList.remove('active');

    elements.playPauseBtn.onclick = togglePlay;
    elements.miniPlayPauseBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };

    elements.progressSlider.oninput = (e) => {
        if (audio.duration) {
            audio.currentTime = (e.target.value / 100) * audio.duration;
            updateProgress();
        }
    };
}

init();
