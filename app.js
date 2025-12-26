/**
 * VaultMusic - Ultra-Premium Music Player Logic
 * Version: 2.0 (Massive Overhaul)
 * Features: YT-Simulation, IA Discovery, Persistent History, Glassmorphism++
 */

// --- 1. CONFIGURATION & MOCK EXTENSION ---
const APP_CONFIG = {
    YT_SIMULATION_DELAY: 1800,
    IA_DISCOVERY_DELAY: 1200,
    STORAGE_KEY_HISTORY: 'vaultmusic_search_history',
    STORAGE_KEY_FAVORITES: 'vaultmusic_favorites'
};

const mockTracks = [
    { id: '1', title: 'Starboy', artist: 'The Weeknd', cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop', duration: 230 },
    { id: '2', title: 'Blinding Lights', artist: 'The Weeknd', cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop', duration: 200 },
    { id: '3', title: 'Levitating', artist: 'Dua Lipa', cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop', duration: 203 },
    { id: '4', title: 'Midnight City', artist: 'M83', cover: 'https://images.unsplash.com/photo-1514525253344-f814d07293c0?w=400&h=400&fit=crop', duration: 243 },
    { id: '5', title: 'Die For You', artist: 'The Weeknd', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop', duration: 232 },
    { id: '6', title: 'As It Was', artist: 'Harry Styles', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop', duration: 167 },
    { id: '7', title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', cover: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?w=400&h=400&fit=crop', duration: 141 },
    { id: '8', title: 'Save Your Tears', artist: 'The Weeknd', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop', duration: 215 },
    { id: 'yt_1', title: 'Sicko Mode (YT Edit)', artist: 'Travis Scott', cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop', duration: 312, source: 'youtube' },
    { id: 'yt_2', title: 'Gods Plan (YT Library)', artist: 'Drake', cover: 'https://images.unsplash.com/photo-1514525253344-f814d07293c0?w=400&h=400&fit=crop', duration: 198, source: 'youtube' }
];

// --- 2. STATE ---
const state = {
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    searchHistory: JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEY_HISTORY)) || ['The Weeknd', 'Travis Scott', 'Phonk'],
    isSearching: false
};

// --- 3. UI SELECTORS ---
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

// --- 4. CORE ENGINE ---

function init() {
    renderHome();
    renderHistory();
    setupListeners();
    integrateTelegram();
    lucide.createIcons();
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

// --- 5. RENDER LOGIC ---

function renderHome() {
    elements.featuredList.innerHTML = '';
    elements.trendingList.innerHTML = '';

    // Simulate smart recommended ordering
    const recommended = [...mockTracks].sort(() => 0.5 - Math.random());

    recommended.slice(0, 5).forEach(track => {
        elements.featuredList.appendChild(createCard(track));
    });

    mockTracks.forEach(track => {
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
        <img src="${track.cover}" class="item-img">
        <div class="item-info">
            <span class="item-title truncate">${track.title}</span>
            <span class="item-artist truncate">${track.artist} ${track.source === 'youtube' ? '• YT' : ''}</span>
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

// --- 6. PLAYER CONTROLLER ---

function selectTrack(track) {
    state.currentTrack = track;
    state.isPlaying = true;
    state.currentTime = 0;

    // Update UI
    elements.miniTitle.innerText = track.title;
    elements.miniArtist.innerText = track.artist;
    elements.miniCover.src = track.cover;

    elements.fullTitle.innerText = track.title;
    elements.fullArtist.innerText = track.artist;
    elements.fullCover.src = track.cover;
    elements.totalTimeLabel.innerText = formatTime(track.duration);

    elements.miniPlayer.classList.remove('hidden');
    updatePlayIcons();
    startSimulation();
}

function togglePlay() {
    if (!state.currentTrack) return;
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

let ticker;
function startSimulation() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(() => {
        if (state.isPlaying && state.currentTrack) {
            state.currentTime++;
            if (state.currentTime >= state.currentTrack.duration) {
                state.currentTime = 0; // Loop simulation
            }
            updateProgress();
        }
    }, 1000);
}

function updateProgress() {
    const pct = (state.currentTime / state.currentTrack.duration) * 100;
    elements.miniProgress.style.width = `${pct}%`;
    elements.progressSlider.value = pct;
    elements.currentTimeLabel.innerText = formatTime(state.currentTime);
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
}

// --- 7. SMART SEARCH & YT SIMULATION ---

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

    // YT Simulation Stages
    const stages = ["Conectando con YouTube Library...", "Extrayendo metadatos...", "IA: Filtrando por calidad...", "Listo!"];
    let step = 0;

    const statusInterval = setInterval(() => {
        elements.searchStatusText.innerText = stages[Math.min(step, stages.length - 1)];
        step++;
    }, 400);

    setTimeout(() => {
        clearInterval(statusInterval);
        elements.searchFeedback.classList.add('hidden');

        // Save to history
        if (!state.searchHistory.includes(query)) {
            state.searchHistory.unshift(query);
            state.searchHistory = state.searchHistory.slice(0, 8);
            localStorage.setItem(APP_CONFIG.STORAGE_KEY_HISTORY, JSON.stringify(state.searchHistory));
            renderHistory();
        }

        performMockSearch(query);
    }, APP_CONFIG.YT_SIMULATION_DELAY);
}

function performMockSearch(query) {
    const q = query.toLowerCase();
    const results = mockTracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));

    if (results.length > 0) {
        results.forEach(t => elements.searchResults.appendChild(createListItem(t)));
    } else {
        // IA Fallback
        elements.searchResults.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <p style="color: var(--text-secondary); margin-bottom: 20px;">No hay resultados exactos, pero la IA ha encontrado esto en vivo:</p>
            </div>
        `;
        mockTracks.slice(0, 3).forEach(t => elements.searchResults.appendChild(createListItem(t)));
    }
    lucide.createIcons();
}

// --- 8. EVENT BINDING ---

function setupListeners() {
    // Navigation
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(window.searchDebounce);
        window.searchDebounce = setTimeout(() => handleSearch(e.target.value), 500);
    });

    // Player Toggle
    const toggleFull = () => elements.fullPlayer.classList.toggle('active');
    elements.miniPlayer.addEventListener('click', (e) => {
        if (!e.target.closest('.mini-btn')) toggleFull();
    });
    document.getElementById('close-player').onclick = toggleFull;

    // Controls
    elements.playPauseBtn.onclick = togglePlay;
    elements.miniPlayPauseBtn.onclick = togglePlay;

    elements.progressSlider.oninput = (e) => {
        if (state.currentTrack) {
            state.currentTime = (e.target.value / 100) * state.currentTrack.duration;
            updateProgress();
        }
    };

    document.getElementById('next-btn').onclick = () => selectTrack(mockTracks[Math.floor(Math.random() * mockTracks.length)]);
    document.getElementById('prev-btn').onclick = () => selectTrack(mockTracks[Math.floor(Math.random() * mockTracks.length)]);
}

// FIRE!
init();
