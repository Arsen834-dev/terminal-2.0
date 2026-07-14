// ============ TICKER / БЕГУЩАЯ СТРОКА ============
import { TICKER_TEXTS } from './config.js';

let currentTickerIndex = 0;

export function initTicker() {
    updateTicker();
    let ticker = document.getElementById('header-ticker');
    if (ticker) {
        ticker.addEventListener('animationiteration', function() {
            currentTickerIndex = (currentTickerIndex + 1) % TICKER_TEXTS.length;
            updateTicker();
        });
    }
}

export function updateTicker() {
    if (window.innerWidth <= 768) return;
    let ticker = document.getElementById('header-ticker');
    if (ticker) {
        ticker.textContent = TICKER_TEXTS[currentTickerIndex % TICKER_TEXTS.length];
    }
    let statusTicker = document.getElementById('ticker-text');
    if (statusTicker) {
        let allText = TICKER_TEXTS.join(' ⬡ ');
        statusTicker.textContent = allText + ' ⬡ ' + allText + ' ⬡ ' + allText;
        statusTicker.style.animation = 'none';
        setTimeout(() => {
            statusTicker.style.animation = 'ticker 50s linear infinite';
        }, 10);
    }
}

export function getTickerTexts() {
    return TICKER_TEXTS;
}