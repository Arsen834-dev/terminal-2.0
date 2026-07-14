// ============ SOUND / ЗВУКИ, МУЗЫКА ============

let soundEnabled = true;
let bgMusic = null;
let bgPlaylist = [];
let bgTrackIndex = 0;
const sounds = {};

export function preloadSound(name, file) {
    sounds[name] = new Audio(file);
    sounds[name].volume = 0.3;
}

export function playSound(name) {
    if (!soundEnabled || !sounds[name]) return;
    let s = sounds[name].cloneNode();
    s.volume = 0.3;
    s.play().catch(() => {});
}

export function startBgMusic() {
    if (!soundEnabled || window.innerWidth <= 768) return;
    if (bgPlaylist.length === 0) {
        bgPlaylist = [
            new Audio('bg_music_1.mp3'),
            new Audio('bg_music_2.mp3'),
            new Audio('bg_music_3.mp3'),
            new Audio('bg_music_4.mp3'),
            new Audio('bg_music_5.mp3'),
            new Audio('bg_music_6.mp3')
        ];
        bgPlaylist.forEach(a => { a.volume = 0.03; });
    }
    playNextBgTrack();
    document.body.addEventListener('click', tryPlayBg, { once: false });
}

function tryPlayBg() {
    if (!soundEnabled || !bgMusic || !bgMusic.paused) return;
    bgMusic.play().then(() => {
        document.body.removeEventListener('click', tryPlayBg);
    }).catch(() => {});
}

function playNextBgTrack() {
    if (!soundEnabled || bgPlaylist.length === 0) return;
    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
    bgMusic = bgPlaylist[bgTrackIndex];
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

export function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
        startBgMusic();
    } else {
        stopBgMusic();
    }
    localStorage.setItem('syndicate_sound', soundEnabled);
    return soundEnabled;
}

export function getSoundEnabled() {
    return soundEnabled;
}

export function setSoundEnabled(value) {
    soundEnabled = value;
    localStorage.setItem('syndicate_sound', soundEnabled);
}