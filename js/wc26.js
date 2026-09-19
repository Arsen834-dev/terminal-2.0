// ============ W-C26 (ОТКЛЮЧЁН) ============
import { WC26_ENABLED } from './config.js';

let wc26Timer = null;

// Все функции — заглушки, чтобы не ломать импорты

export async function wc26Ask(prompt) {
    if (!WC26_ENABLED) return '';
    return '';
}

export async function wc26Send(msg) {
    if (!WC26_ENABLED) return;
}

export async function wc26Action(decision) {
    if (!WC26_ENABLED) return false;
    return false;
}

export async function wc26Remember(type, content, agent) {
    if (!WC26_ENABLED) return;
}

export async function wc26Recall(limit = 5) {
    if (!WC26_ENABLED) return [];
    return [];
}

export async function wc26AutoThink() {
    if (!WC26_ENABLED) return;
}

export async function wc26MakeContent() {
    if (!WC26_ENABLED) return;
}

export async function wc26Greet(name) {
    if (!WC26_ENABLED) return;
}

export function wc26ChatHook(payload) {
    if (!WC26_ENABLED) return;
}

export function startWc26Timer() {
    if (!WC26_ENABLED) return;
    if (wc26Timer) clearInterval(wc26Timer);
    // Отключено — пустой таймер
}

export function stopWc26Timer() {
    if (wc26Timer) { clearInterval(wc26Timer); wc26Timer = null; }
}