// ============ UTILS / ВСПОМОГАТЕЛЬНЫЕ ============

export function notif(msg) {
    let n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a0000;border:2px solid #ff1744;padding:15px 30px;z-index:10000;font-family:VT323;color:#ff1744;font-size:1.3rem;border-radius:8px;box-shadow:0 0 20px rgba(255,23,68,0.5);';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.opacity = '0';
        n.style.transition = 'opacity 0.3s';
        setTimeout(() => n.remove(), 300);
    }, 2500);
}

export function closeModal(id) {
    let el = document.getElementById(id);
    if (el) {
        el.classList.remove('show');
        setTimeout(() => el.style.display = 'none', 200);
    }
}

export function uploadFileAndInsert(event, inputId) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function() {
        let inp = document.getElementById(inputId);
        if (inp) inp.value += '[img]' + reader.result + '[/img] ';
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

export function escapeHtml(text) {
    return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function formatTime(date) {
    return new Date(date).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' });
}

export function formatDate(date) {
    return new Date(date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
}

export function timeAgo(dateStr) {
    if (!dateStr) return 'НЕИЗВЕСТНО';
    let diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'ТОЛЬКО ЧТО';
    if (diff < 3600) return Math.floor(diff / 60) + ' МИН. НАЗАД';
    if (diff < 86400) return Math.floor(diff / 3600) + ' Ч. НАЗАД';
    if (diff < 604800) return Math.floor(diff / 86400) + ' ДН. НАЗАД';
    return new Date(dateStr).toLocaleDateString('ru-RU');
}

export function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function glowIcon(id) {
    let el = document.getElementById(id);
    if (el) el.classList.add('new-badge-glow');
}

export function stopGlowIcon(id) {
    let el = document.getElementById(id);
    if (el) el.classList.remove('new-badge-glow');
}