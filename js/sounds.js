// ============ SOUND / ЗВУКИ, МУЗЫКА ============

let soundEnabled = localStorage.getItem('syndicate_sound') !== 'false';
let musicEnabled = localStorage.getItem('syndicate_music') !== 'false';
let bgMusic = null;
let bgPlaylist = [];
let bgTrackIndex = 0;
const sounds = {};

const SOUND_PATH = 'assets/sounds/';

export function preloadSound(name, file) {
    try {
        sounds[name] = new Audio(SOUND_PATH + file);
        sounds[name].volume = 0.3;
    } catch (e) {}
}

preloadSound('click', 'click.mp3');
preloadSound('open', 'open.mp3');
preloadSound('close', 'close.mp3');
preloadSound('success', 'achieve.mp3');
preloadSound('login', 'open.mp3');
preloadSound('buy', 'buy.mp3');
preloadSound('alarm', 'war_declared.mp3');
preloadSound('war', 'war_declared.mp3');
preloadSound('achieve', 'achieve.mp3');
preloadSound('send', 'send.mp3');
preloadSound('receive', 'receive.mp3');
preloadSound('glitch', 'glitchcomp.mp3');

export function playSound(name) {
    if (!soundEnabled || !sounds[name]) return;
    try {
        let s = sounds[name].cloneNode();
        s.volume = 0.3;
        s.play().catch(() => {});
    } catch (e) {}
}

// ==================== ФОНОВАЯ МУЗЫКА ====================
export function startBgMusic() {
    if (!soundEnabled || !musicEnabled) return;
    if (window.innerWidth <= 768) return;

    if (bgPlaylist.length === 0) {
        let names = ['bg_music_1.mp3', 'bg_music_2.mp3', 'bg_music_3.mp3', 'bg_music_4.mp3', 'bg_music_5.mp3', 'bg_music_6.mp3'];
        bgPlaylist = names.map(n => {
            let a = new Audio(SOUND_PATH + n);
            a.volume = 0.08;
            return a;
        });
    }
    playNextBgTrack();
    document.body.addEventListener('click', tryPlayBg, { once: false });
}

function tryPlayBg() {
    if (!soundEnabled || !musicEnabled || !bgMusic || !bgMusic.paused) return;
    bgMusic.play().then(() => {
        document.body.removeEventListener('click', tryPlayBg);
    }).catch(() => {});
}

function playNextBgTrack() {
    if (!soundEnabled || !musicEnabled || bgPlaylist.length === 0) return;
    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
    bgMusic = bgPlaylist[bgTrackIndex];
    if (!bgMusic) return;
    bgMusic.currentTime = 0;
    bgMusic.onended = function() {
        bgTrackIndex = (bgTrackIndex + 1) % bgPlaylist.length;
        playNextBgTrack();
    };
    tryPlayBg();
}

export function stopBgMusic() {
    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
    bgPlaylist = [];
    document.body.removeEventListener('click', tryPlayBg);
}

export function nextBgTrack() {
    if (bgPlaylist.length === 0) return;
    bgTrackIndex = (bgTrackIndex + 1) % bgPlaylist.length;
    playNextBgTrack();
}

export function setMusicVolume(v) {
    if (bgMusic) bgMusic.volume = Math.max(0, Math.min(1, v));
    bgPlaylist.forEach(a => a.volume = Math.max(0, Math.min(1, v)));
    localStorage.setItem('syndicate_music_volume', v);
}

export function getMusicVolume() {
    let v = parseFloat(localStorage.getItem('syndicate_music_volume'));
    return isNaN(v) ? 0.08 : v;
}

// ==================== ТОГГЛЫ ====================
export function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('syndicate_sound', String(soundEnabled));
    if (soundEnabled) startBgMusic();
    else stopBgMusic();
    return soundEnabled;
}

export function toggleMusic() {
    musicEnabled = !musicEnabled;
    localStorage.setItem('syndicate_music', String(musicEnabled));
    if (musicEnabled && soundEnabled) startBgMusic();
    else stopBgMusic();
    return musicEnabled;
}

export function getSoundEnabled() {
    let saved = localStorage.getItem('syndicate_sound');
    soundEnabled = saved !== 'false';
    return soundEnabled;
}

export function getMusicEnabled() {
    let saved = localStorage.getItem('syndicate_music');
    musicEnabled = saved !== 'false';
    return musicEnabled;
}

export function setSoundEnabled(value) {
    soundEnabled = value;
    localStorage.setItem('syndicate_sound', String(soundEnabled));
}

export function setMusicEnabled(value) {
    musicEnabled = value;
    localStorage.setItem('syndicate_music', String(musicEnabled));
}