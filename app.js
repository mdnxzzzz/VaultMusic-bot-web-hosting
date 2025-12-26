/**
 * VaultMusic - Premium Player Logic
 * Handles SPA navigation, audio simulation, and UI state
 */

// --- STATE MANAGEMENT ---
const state = {
    isPlaying: false,
    currentTrack: null,
    progress: 0,
    duration: 225, // Mock duration in seconds
    queue: [],
    history: []
};

// --- MOCK DATA ---
const mockTracks = [
    {
        id: '1',
        title: 'Starboy',
        artist: 'The Weeknd',
        cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
    },
    {
        id: '2',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=400&h=400&fit=crop',
    },
    {
        id: '3',
        title: 'Levitating',
        artist: 'Dua Lipa',
        cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop',
    },
    {
        id: '4',
        title: 'Midnight City',
        artist: 'M83',
        cover: 'https://images.unsplash.com/photo-1514525253344-f814d07293c0?w=400&h=400&fit=crop',
    },
    {
        id: '5',
        title: 'Die For You',
        artist: 'The Weeknd',
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
    },
    {
        id: '6',
        title: 'As It Was',
        artist: 'Harry Styles',
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop',
    },
    {
        id: '7',
        title: 'Stay',
        artist: 'The Kid LAROI & Justin Bieber',
        cover: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?w=400&h=400&fit=crop',
    },
    {
        id: '8',
        title: 'Save Your Tears',
        artist: 'The Weeknd',
        cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop',
    }
];

// --- UI ELEMENTS ---
const elements = {
    app: document.getElementById('app-container'),
    homeView: document.getElementById('home-view'),
    searchView: document.getElementById('search-view'),
    fullPlayer: document.getElementById('full-player'),
    miniPlayer: document.getElementById('mini-player'),

    // Controls
    playPauseBtn: document.getElementById('play-pause-btn'),
    miniPlayPauseBtn: document.getElementById('mini-play-btn'),
    progressSlider: document.getElementById('progress-slider'),
    miniProgressFill: document.getElementById('mini-progress-fill'),

    // Text elements
    fullTitle: document.getElementById('full-title'),
    fullArtist: document.getElementById('full-artist'),
    miniTitle: document.getElementById('mini-title'),
    miniArtist: document.getElementById('mini-artist'),
    currentTimeLabel: document.getElementById('current-time'),
    totalTimeLabel: document.getElementById('total-time'),

    // Lists
    featuredList: document.getElementById('featured-list'),
    trendingList: document.getElementById('trending-list'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results-list')
};

// --- INITIALIZATION ---
function init() {
    renderHome();
    setupEventListeners();

    // Telegram WebApp specific
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        // Set header color to match dark theme
        tg.setHeaderColor('#050505');
        tg.setBackgroundColor('#050505');
    }
}

// --- RENDER FUNCTIONS ---
function renderHome() {
    // Clear skeletons after small timeout to simulate loading
    setTimeout(() => {
        elements.featuredList.innerHTML = '';
        elements.trendingList.innerHTML = '';

        mockTracks.forEach(track => {
            const card = createTrackCard(track);
            elements.featuredList.appendChild(card);

            const item = createTrackItem(track);
            elements.trendingList.appendChild(item);
        });
    }, 1200);
}

function createTrackCard(track) {
    const div = document.createElement('div');
    div.className = 'track-card-custom';
    div.innerHTML = `
        <div class="card-img-wrapper" style="background-image: url('${track.cover}')">
            <div class="card-overlay">
                <i data-lucide="play" class="play-icon-overlay"></i>
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

function createTrackItem(track) {
    const div = document.createElement('div');
    div.className = 'track-item-custom';
    div.innerHTML = `
        <img src="${track.cover}" class="item-img">
        <div class="item-info">
            <span class="item-title truncate">${track.title}</span>
            <span class="item-artist truncate">${track.artist}</span>
        </div>
        <i data-lucide="more-vertical" class="item-more"></i>
    `;
    div.onclick = () => selectTrack(track);
    return div;
}

// CSS needed for custom JS elements (adding here for simplicity in this demo)
const style = document.createElement('style');
style.innerHTML = `
    .track-card-custom {
        min-width: 140px;
        background: var(--surface-color);
        padding: 12px;
        border-radius: 16px;
        transition: transform 0.2s;
    }
    .track-card-custom:active { transform: scale(0.95); }
    .card-img-wrapper {
        width: 100%;
        aspect-ratio: 1/1;
        background-size: cover;
        border-radius: 12px;
        margin-bottom: 8px;
        position: relative;
    }
    .card-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;
    }
    .track-card-custom:hover .card-overlay { opacity: 1; }
    .play-icon-overlay { width: 30px; height: 30px; color: white; fill: white; }
    .card-title { display: block; font-weight: 600; font-size: 0.9rem; }
    .card-artist { display: block; font-size: 0.8rem; color: var(--text-secondary); }

    .track-item-custom {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px;
        border-radius: 12px;
        margin-bottom: 8px;
    }
    .track-item-custom:active { background: var(--surface-hover); }
    .item-img { width: 50px; height: 50px; border-radius: 8px; }
    .item-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .item-title { font-weight: 600; font-size: 0.95rem; }
    .item-artist { font-size: 0.85rem; color: var(--text-secondary); }
    .item-more { color: var(--text-secondary); width: 20px; }
`;
document.head.appendChild(style);

// --- PLAYER LOGIC ---
function selectTrack(track) {
    state.currentTrack = track;
    state.isPlaying = true;
    state.progress = 0;

    updateUIForTrack(track);
    startPlaybackSimulation();

    // Show mini player
    elements.miniPlayer.classList.remove('hidden');
    elements.miniPlayer.style.display = 'flex';

    // Trigger icons refresh
    lucide.createIcons();
}

function updateUIForTrack(track) {
    // Full player
    elements.fullTitle.innerText = track.title;
    elements.fullArtist.innerText = track.artist;
    document.getElementById('full-cover').src = track.cover;

    // Mini player
    elements.miniTitle.innerText = track.title;
    elements.miniArtist.innerText = track.artist;
    document.getElementById('mini-cover').src = track.cover;

    // Play buttons
    updatePlayPauseIcons();
}

function updatePlayPauseIcons() {
    const iconName = state.isPlaying ? 'pause' : 'play';
    elements.playPauseBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
    elements.miniPlayPauseBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;

    // Visualizer state
    const visualizer = document.getElementById('visualizer');
    if (state.isPlaying) {
        visualizer.classList.remove('paused');
    } else {
        visualizer.classList.add('paused');
    }

    lucide.createIcons();
}

let playbackInterval;
function startPlaybackSimulation() {
    if (playbackInterval) clearInterval(playbackInterval);

    playbackInterval = setInterval(() => {
        if (state.isPlaying) {
            state.progress += 1;
            if (state.progress >= state.duration) {
                state.progress = 0; // Loop or next logic
            }
            updateProgressUI();
        }
    }, 1000);
}

function updateProgressUI() {
    const percent = (state.progress / state.duration) * 100;
    elements.progressSlider.value = percent;
    elements.miniProgressFill.style.width = percent + '%';

    elements.currentTimeLabel.innerText = formatTime(state.progress);
    elements.totalTimeLabel.innerText = formatTime(state.duration);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    elements.playPauseBtn.onclick = togglePlay;
    elements.miniPlayPauseBtn.onclick = (e) => {
        e.stopPropagation();
        togglePlay();
    };

    // Full player opening
    document.getElementById('show-full-player').onclick = openFullPlayer;
    elements.miniPlayer.onclick = openFullPlayer;

    document.getElementById('close-player').onclick = closeFullPlayer;

    // Progress slider
    elements.progressSlider.oninput = (e) => {
        state.progress = (e.target.value / 100) * state.duration;
        updateProgressUI();
    };

    // Search logic
    elements.searchInput.oninput = (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length > 0) {
            elements.homeView.classList.remove('active');
            elements.searchView.classList.add('active');

            // Simular carga de "IA/Internet"
            elements.searchResults.innerHTML = `
                <div class="searching-state">
                    <div class="spinner"></div>
                    <p>Buscando en VaultMusic IA...</p>
                </div>
            `;

            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 600);
        } else {
            elements.homeView.classList.add('active');
            elements.searchView.classList.remove('active');
        }
    };
}

function togglePlay() {
    state.isPlaying = !state.isPlaying;
    updatePlayPauseIcons();
}

function openFullPlayer() {
    elements.fullPlayer.classList.add('active');
    elements.fullPlayer.classList.remove('hidden');
    // Hide mini player when full is open for cleaner look
    elements.miniPlayer.style.opacity = '0';
}

function closeFullPlayer() {
    elements.fullPlayer.classList.remove('active');
    elements.miniPlayer.style.opacity = '1';
    setTimeout(() => {
        elements.fullPlayer.classList.add('hidden');
    }, 500);
}

function performSearch(query) {
    elements.searchResults.innerHTML = '';

    if (!query) {
        elements.homeView.classList.add('active');
        elements.searchView.classList.remove('active');
        return;
    }

    // Filtro real
    const results = mockTracks.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query)
    );

    if (results.length > 0) {
        results.forEach(track => {
            elements.searchResults.appendChild(createTrackItem(track));
        });
    } else {
        // IA/Discovery fallback: Si no hay nada, mostramos recomendaciones
        elements.searchResults.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p style="color: var(--text-secondary); margin-bottom: 15px;">No hay resultados exactos para "${query}"</p>
                <p style="font-weight: 600; margin-bottom: 15px;">Te recomendamos esto:</p>
            </div>
        `;
        mockTracks.slice(0, 4).forEach(track => {
            elements.searchResults.appendChild(createTrackItem(track));
        });
    }
    lucide.createIcons();
}

// Start app
init();
