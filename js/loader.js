// ============ LOADER / ЭКРАН ЗАГРУЗКИ ============
const MODULES = [
    'ВЗЛОМ ПАРОЛЯ', 'ОБХОД ФАЕРВОЛА', 'ДЕШИФРОВКА AES', 'ПОДМЕНА MAC',
    'ПРОКСИ-ЦЕПЬ', 'СКАН ПОРТОВ', 'ИНЪЕКЦИЯ КОДА', 'ПЕРЕХВАТ ТРАФИКА',
    'КЛОНИРОВАНИЕ КЛЮЧА', 'БРУТФОРС PIN', 'АНАЛИЗ УЯЗВИМОСТЕЙ',
    'ПОДБОР СЕРТИФИКАТА', 'СПУФИНГ DNS', 'ОБХОД 2FA', 'ДАМП ПАМЯТИ',
    'ИЗВЛЕЧЕНИЕ ХЭШЕЙ', 'ВНЕДРЕНИЕ БЭКДОРА', 'ОЧИСТКА ЛОГОВ',
    'МАСКИРОВКА IP', 'ШИФРОВАНИЕ КАНАЛА', 'ЗАКРЕПЛЕНИЕ ДОСТУПА',
    'ПОДДЕЛКА ТОКЕНА', 'ЭКСПЛОИТ ЯДРА', 'ЗАРАЖЕНИЕ ЦЕЛИ',
    'ПОДМЕНА ФАЙЛОВ', 'КРАЖА КУКИ', 'ЭСКАЛАЦИЯ ПРИВИЛЕГИЙ',
    'ОТКЛЮЧЕНИЕ ЗАЩИТЫ', 'КОПИРОВАНИЕ БАЗЫ', 'УНИЧТОЖЕНИЕ СЛЕДОВ'
];

let loadProgress = 0;
let loadingInterval = null;

function buildGrid() {
    let g = document.getElementById('loader-grid');
    if (!g) return;
    g.innerHTML = MODULES.map((n, i) => {
        let sm = ['ИНИЦИАЛИЗАЦИЯ', 'ПОДКЛЮЧЕНИЕ', 'СКАНИРОВАНИЕ', 'ЗАГРУЗКА', 'ПРОВЕРКА', 'ДЕКОДИРОВАНИЕ'];
        return '<div class="loader-cell" id="cell-' + n.replace(/\s/g, '_') + '">' +
            '<div class="cell-header"><span class="cell-title">' + n + '</span>' +
            '<span class="cell-status">' + sm[i % sm.length] + '</span></div>' +
            '<div class="cell-data">[████░░░░░░] ' + Math.floor(Math.random() * 40 + 10) + '%</div>' +
            '<div class="mini-bar"><div class="mini-bar-fill"></div></div></div>';
    }).join('');
}

function updateMain() {
    let pct = document.getElementById('big-percent');
    loadingInterval = setInterval(() => {
        if (loadProgress < 99.9) {
            loadProgress += Math.random() * 3;
            if (loadProgress > 99.9) loadProgress = 99.9;
            if (pct) pct.textContent = loadProgress.toFixed(1) + '%';
        } else {
            clearInterval(loadingInterval);
            triggerErrorStorm();
        }
    }, 25);
}

function triggerErrorStorm() {
    let pct = document.getElementById('big-percent');
    if (pct) pct.style.color = '#ff0000';
    document.querySelectorAll('.loader-cell').forEach((c, i) => {
        setTimeout(() => c.classList.add('error'), i * 30);
    });
    try {
        let audio = new Audio('glitchcomp.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {}
    setTimeout(() => {
        let eo = document.getElementById('error-overlay');
        let em = document.getElementById('error-message');
        if (eo) eo.style.display = 'block';
        if (em) em.style.display = 'block';
    }, 1000);
}

export function startLoading() {
    buildGrid();
    let ls = document.getElementById('loader-screen');
    if (ls) ls.style.display = 'block';
    MODULES.forEach((n, i) => setTimeout(() => {
        document.getElementById('cell-' + n.replace(/\s/g, '_'))?.classList.add('active');
    }, i * 40));
    loadProgress = 0;
    if (loadingInterval) clearInterval(loadingInterval);
    updateMain();
}

export function recoverSystem(onComplete) {
    if (loadingInterval) clearInterval(loadingInterval);
    document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; });
    let eo = document.getElementById('error-overlay');
    let em = document.getElementById('error-message');
    if (eo) eo.style.display = 'none';
    if (em) em.style.display = 'none';
    let pct = document.getElementById('big-percent');
    if (pct) { pct.style.color = '#ff1744'; pct.textContent = '100%'; }
    loadProgress = 100;
    document.querySelectorAll('.loader-cell.error').forEach((c, i) => {
        setTimeout(() => {
            c.classList.remove('error');
            c.classList.add('success');
            let st = c.querySelector('.cell-status');
            if (st) st.textContent = 'OK';
        }, i * 20);
    });
    setTimeout(() => {
        let ls = document.getElementById('loader-screen');
        if (ls) ls.style.display = 'none';
        if (typeof onComplete === 'function') onComplete();
    }, 1500);
}