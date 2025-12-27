/**
 * VaultMusic Infinity v6.0 - High Performance Engine
 */

const CONFIG = {
    PIPED_NODES: [
        'https://pipedapi.kavin.rocks',
        'https://api-piped.mha.fi',
        'https://piped-api.lunar.icu'
    ],
    LYRICS_API: 'https://lrclib.net/api/search',
    FALLBACK_COVER: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
    STORAGE_KEY: 'vm_infinity_state'
};

// --- AUDIO CONTEXT (VISUALIZER) ---
let audioCtx, analyser, source, dataArray;
function initVisualizer() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 64;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const bars = document.querySelectorAll('.bar');
    dataArray.forEach((v, i) => {
        if (bars[i]) {
            const h = (v / 255) * 45 + 5;
            bars[i].style.height = `${h}px`;
        }
    });
}

// --- STATE MANAGER ---
const State = {
    user: null,
    activeView: 'home-view',
    currentTrack: null,
    isPlaying: false,
    queue: [],
    history: [],
    likes: [],
    activeTab: 'track-info',
    accentColor: '#00f2ff',

    save() {
        const data = { likes: this.likes, history: this.history };
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    },
    load() {
        const local = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || {};
        this.likes = local.likes || [];
        this.history = local.history || [];
    }
};

const audio = new Audio();

// --- THE ENGINE (DATA FETCHING) ---
const Engine = {
    currentNodeIdx: 0,

    get node() { return CONFIG.PIPED_NODES[this.currentNodeIdx]; },

    nextReady() { this.currentNodeIdx = (this.currentNodeIdx + 1) % CONFIG.PIPED_NODES.length; },

    async search(query) {
        try {
            const res = await fetch(`${this.node}/search?q=${encodeURIComponent(query)}&filter=videos`);
            const json = await res.json();
            return json.items.map(i => this.mapTrack(i));
        } catch (e) {
            this.nextReady();
            return [];
        }
    },

    async getStream(id) {
        try {
            const res = await fetch(`${this.node}/streams/${id}`);
            const json = await res.json();
            const stream = json.audioStreams.sort((a, b) => b.bitrate - a.bitrate)[0];
            return stream.url;
        } catch (e) {
            this.nextReady();
            return null;
        }
    },

    async getLyrics(track) {
        try {
            const res = await fetch(`${CONFIG.LYRICS_API}?q=${encodeURIComponent(track.title + ' ' + track.artist)}`);
            const json = await res.json();
            return json[0]?.plainLyrics || "No se encontraron letras.";
        } catch (e) { return "Error al cargar letras."; }
    },

    mapTrack(raw) {
        let cover = raw.thumbnail;
        if (raw.title === 'After Hours') cover = 'https://i.ytimg.com/vi/jzmXAtAbnWg/hqdefault.jpg';

        return {
            id: raw.url ? raw.url.split('v=')[1] : (raw.id || ""),
            title: raw.title,
            artist: raw.uploaderName,
            cover: cover,
            duration: raw.duration,
            type: 'youtube'
        };
    }
};

// --- UI ENGINE ---
const UI = {
    els: {
        loading: document.getElementById('loading-overlay'),
        views: document.querySelectorAll('.view'),
        navItems: document.querySelectorAll('.nav-item'),
        searchBar: document.getElementById('search-input'),
        player: document.getElementById('full-player'),
        mini: document.getElementById('mini-player'),
        lyricsText: document.getElementById('lyrics-text'),
        queueList: document.getElementById('queue-list')
    },

    init() {
        this.setupNav();
        this.setupPlayerTabs();
        this.setupSearch();
        this.renderHome();
        this.renderLikedTracks();
        this.hideLoading();
    },

    hideLoading() {
        this.els.loading.style.opacity = '0';
        setTimeout(() => this.els.loading.classList.add('hidden'), 800);
    },

    switchView(viewId) {
        this.els.views.forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        this.els.navItems.forEach(n => {
            if (n.dataset.view === viewId) n.classList.add('active');
            else n.classList.remove('active');
        });
        State.activeView = viewId;
        lucide.createIcons();
    },

    setupNav() {
        this.els.navItems.forEach(item => {
            item.onclick = () => this.switchView(item.dataset.view);
        });
    },

    setupPlayerTabs() {
        document.querySelectorAll('.player-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.player-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
                if (tab.dataset.tab === 'up-next') this.renderQueue();
                if (tab.dataset.tab === 'lyrics' && !State.lyricsLoaded) this.loadLyrics();
            };
        });
    },

    setupSearch() {
        let timer;
        this.els.searchBar.oninput = (e) => {
            clearTimeout(timer);
            const q = e.target.value.trim();
            if (!q) { this.switchView('home-view'); return; }
            timer = setTimeout(() => this.execSearch(q), 700);
        };

        // Mood Chips
        document.querySelectorAll('.mood-chip').forEach(chip => {
            chip.onclick = () => this.execSearch(chip.dataset.mood);
        });
    },

    async execSearch(q) {
        this.switchView('search-view');
        document.getElementById('search-feedback').classList.remove('hidden');
        document.getElementById('search-results-list').innerHTML = '';

        const results = await Engine.search(q);
        document.getElementById('search-feedback').classList.add('hidden');

        results.forEach(t => {
            const item = this.createTrackItem(t);
            document.getElementById('search-results-list').appendChild(item);
        });
        lucide.createIcons();
    },

    createTrackItem(t) {
        const div = document.createElement('div');
        div.className = 'track-item-infinity';
        div.innerHTML = `
            <img src="${t.cover}" class="item-art" onerror="this.src='${CONFIG.FALLBACK_COVER}'">
            <div class="item-info">
                <span class="title truncate">${t.title}</span>
                <span class="artist truncate">${t.artist}</span>
            </div>
            <i data-lucide="more-vertical" style="opacity:0.5; width:18px;"></i>
        `;
        div.onclick = () => Player.play(t);
        return div;
    },

    renderHome() {
        const featured = document.getElementById('featured-list');
        const trending = document.getElementById('trending-list');
        featured.innerHTML = ''; trending.innerHTML = '';

        const mock = [
            { id: 'jzD_yyEcp0M', title: 'Starboy', artist: 'The Weeknd', cover: 'https://i.ytimg.com/vi/jzD_yyEcp0M/maxresdefault.jpg' },
            { id: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd', cover: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/maxresdefault.jpg' },
            { id: 'fRh_vgS2dFE', title: 'Sorry', artist: 'Justin Bieber', cover: 'https://i.ytimg.com/vi/fRh_vgS2dFE/maxresdefault.jpg' }
        ];

        mock.forEach(t => {
            const card = document.createElement('div');
            card.className = 'track-card-infinity';
            card.innerHTML = `
                <div class="card-artwork"><img src="${t.cover}"></div>
                <span class="title truncate">${t.title}</span>
                <span class="artist truncate">${t.artist}</span>
            `;
            card.onclick = () => Player.play(t);
            featured.appendChild(card);
        });

        // Use history or mocks for trending
        [...mock].reverse().forEach(t => trending.appendChild(this.createTrackItem(t)));
    },

    renderLikedTracks() {
        const list = document.getElementById('likes-rail-list');
        const mainList = document.getElementById('library-list');
        list.innerHTML = ''; mainList.innerHTML = '';

        if (State.likes.length > 0) {
            document.getElementById('favorites-rail').classList.remove('hidden');
            State.likes.forEach(t => {
                const card = document.createElement('div');
                card.className = 'track-card-infinity';
                card.innerHTML = `<div class="card-artwork"><img src="${t.cover}"></div><span class="title truncate">${t.title}</span>`;
                card.onclick = () => Player.play(t);
                list.appendChild(card);
                mainList.appendChild(this.createTrackItem(t));
            });
        } else {
            document.getElementById('favorites-rail').classList.add('hidden');
        }
    },

    renderHistory() {
        const recent = document.getElementById('recent-searches');
        if (!recent) return;
        recent.innerHTML = '';
        State.history.forEach(q => {
            const tag = document.createElement('div');
            tag.className = 'mood-chip';
            tag.innerText = q;
            tag.onclick = () => { document.getElementById('search-input').value = q; this.execSearch(q); };
            recent.appendChild(tag);
        });
    },

    renderQueue() {
        this.els.queueList.innerHTML = '';
        State.queue.forEach(t => {
            this.els.queueList.appendChild(this.createTrackItem(t));
        });
    },

    async loadLyrics() {
        if (!State.currentTrack) return;
        this.els.lyricsText.innerText = "Buscando letras...";
        const lyrics = await Engine.getLyrics(State.currentTrack);
        this.els.lyricsText.innerText = lyrics;
        State.lyricsLoaded = true;
    }
};

// --- PLAYER ENGINE (LOGIC) ---
const Player = {
    async play(track) {
        State.currentTrack = track;
        State.lyricsLoaded = false;

        // Prepare UI
        this.updateUI(track);
        UI.els.mini.classList.remove('hidden');

        // Fetch stream
        const url = await Engine.getStream(track.id);
        if (url) {
            initVisualizer();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            audio.src = url;
            audio.play().catch(e => console.warn("Interacción requerida"));
            State.isPlaying = true;
            this.updatePlayState();
            this.fetchRelated(track);
        } else {
            alert("Error al cargar stream. Intentando otro nodo...");
        }

        // Color Sync (Simplified)
        this.syncColor(track.cover);
    },

    async fetchRelated(track) {
        const results = await Engine.search(track.artist);
        State.queue = results.filter(r => r.id !== track.id);
        if (State.activeTab === 'up-next') UI.renderQueue();
    },

    toggleLike() {
        if (!State.currentTrack) return;
        const track = State.currentTrack;
        const idx = State.likes.findIndex(l => l.id === track.id);
        if (idx > -1) State.likes.splice(idx, 1);
        else State.likes.unshift(track);

        State.save();
        this.updateLikeUI();
        UI.renderLikedTracks();

        // Backend Sync (Fire and forget)
        if (State.user && State.user.user_id !== 'LOCAL_GUEST') {
            fetch(`${CONFIG.PIPED_NODES[0]}/api/like/toggle`, { // Note: Should be APP_CONFIG.API_BASE in prod
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: State.user.user_id, track: track })
            }).catch(() => { });
        }
    },

    updateLikeUI() {
        if (!State.currentTrack) return;
        const isLiked = State.likes.some(l => l.id === State.currentTrack.id);
        const btn = document.getElementById('like-btn');
        btn.style.color = isLiked ? 'var(--dynamic-accent)' : '#fff';
        btn.innerHTML = `<i data-lucide="heart" style="${isLiked ? 'fill: var(--dynamic-accent);' : ''}"></i>`;
        lucide.createIcons();
    },

    updateUI(t) {
        document.getElementById('mini-title').innerText = t.title;
        document.getElementById('mini-artist').innerText = t.artist;
        document.getElementById('mini-cover').src = t.cover;

        document.getElementById('full-title').innerText = t.title;
        document.getElementById('full-artist').innerText = t.artist;
        document.getElementById('full-cover').src = t.cover;
    },

    updatePlayState() {
        const icons = document.querySelectorAll('[data-lucide]');
        const playBtn = document.getElementById('play-pause-btn');
        const miniBtn = document.getElementById('mini-play-btn');

        const iconName = State.isPlaying ? 'pause' : 'play';
        playBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        miniBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        lucide.createIcons();
    },

    syncColor(imgUrl) {
        // En un caso real usaríamos Vibrant.js, aquí simulamos con un glow suave
        document.getElementById('player-bg-glow').style.background = `radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15) 0%, transparent 70%)`;
    }
};

// --- BOOT ---
function boot() {
    State.load();
    UI.init();

    // Telegram Integration
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user) {
            document.getElementById('user-name').innerText = user.first_name;
            if (user.photo_url) document.getElementById('user-avatar').src = user.photo_url;
        }
    }

    // Event Listeners for Player
    document.getElementById('mini-player').onclick = (e) => {
        if (!e.target.closest('.mini-btn')) {
            UI.els.player.classList.add('active');
            document.body.classList.add('player-open');
        }
    };
    document.getElementById('close-player').onclick = () => {
        UI.els.player.classList.remove('active');
        document.body.classList.remove('player-open');
    };

    document.getElementById('play-pause-btn').onclick = () => {
        State.isPlaying ? audio.pause() : audio.play();
        State.isPlaying = !State.isPlaying;
        Player.updatePlayState();
    };

    document.getElementById('like-btn').onclick = () => Player.toggleLike();

    document.getElementById('mini-play-btn').onclick = (e) => {
        e.stopPropagation();
        State.isPlaying ? audio.pause() : audio.play();
        State.isPlaying = !State.isPlaying;
        Player.updatePlayState();
    };

    document.getElementById('mini-next-btn').onclick = (e) => {
        e.stopPropagation();
        if (State.queue.length > 0) Player.play(State.queue[0]);
    };

    audio.ontimeupdate = () => {
        const pct = (audio.currentTime / audio.duration) * 100;
        document.getElementById('mini-progress-fill').style.width = `${pct}%`;
        document.getElementById('progress-slider').value = pct;
        document.getElementById('current-time').innerText = formatTime(audio.currentTime);
        if (audio.duration) document.getElementById('total-time').innerText = formatTime(audio.duration);
    };

    document.getElementById('progress-slider').oninput = (e) => {
        audio.currentTime = (e.target.value / 100) * audio.duration;
    };
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    return `${m}:${rs.toString().padStart(2, '0')}`;
}

boot();
