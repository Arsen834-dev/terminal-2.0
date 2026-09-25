// ============ UTILS / ВСПОМОГАТЕЛЬНЫЕ ============

export function notif(msg) {
    let n = document.createElement('div');
    n.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-10px);
        background: var(--bg-2);
        border: 1px solid var(--accent);
        padding: 14px 24px;
        z-index: 10000;
        font-family: var(--font-mono);
        color: var(--text);
        font-size: 0.85rem;
        font-weight: 500;
        border-radius: var(--radius);
        box-shadow: 0 0 30px rgba(255, 23, 68, 0.25), 0 8px 24px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
        max-width: 90vw;
        text-align: center;
        letter-spacing: 1px;
    `;
    n.textContent = msg;
    document.body.appendChild(n);
    requestAnimationFrame(() => {
        n.style.opacity = '1';
        n.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        n.style.opacity = '0';
        n.style.transform = 'translateX(-50%) translateY(-10px)';
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
    if (file.size > 2 * 1024 * 1024) {
        notif('⛔ Файл больше 2 МБ');
        event.target.value = '';
        return;
    }
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
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatTime(date) {
    return new Date(date).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' });
}

export function formatDate(date) {
    return new Date(date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
}

export function timeAgo(dateStr) {
    if (!dateStr) return 'неизвестно';
    let diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    if (diff < 604800) return Math.floor(diff / 86400) + ' дн назад';
    return new Date(dateStr).toLocaleDateString('ru-RU');
}

export function parseHashtags(text) {
    if (!text) return [];
    let regex = /(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu;
    let found = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
        let tag = m[1].toLowerCase().trim();
        if (tag && !found.includes(tag)) found.push(tag);
    }
    return found;
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

export function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => notif('📋 Скопировано'));
    } else {
        let ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        notif('📋 Скопировано');
    }
}