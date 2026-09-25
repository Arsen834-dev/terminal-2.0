// ============================================================
// UI / RENDER FX — единый источник эффектов агентов
// ============================================================
// Здесь живут ВСЕ функции рендера визуальных эффектов:
// цвета, рамки, бейджи, шрифты, роли.
//
// Меняется редко — только когда добавляешь новые типы эффектов.

import { CA } from '../auth.js';
import { shopItems, getActiveColorClassForId } from '../shop.js';

// ============================================================
// КАРТА ШРИФТОВ
// ============================================================
export const FONT_MAP = {
    'fnt_cyber': 'font-cyber',
    'fnt_glitch': 'font-glitch',
    'fnt_typewriter': 'font-typewriter',
    'fnt_pixel': 'font-pixel',
    'fnt_blood': 'font-blood',
    'fnt_neon': 'font-neon',
    'fnt_medieval': 'font-medieval',
    'fnt_comic': 'font-comic'
};

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ: getAgentFx
// ============================================================
// Возвращает объект со всеми CSS-классами и HTML для одного агента.
//
// Параметры:
//   name   — имя агента
//   agents — словарь всех агентов (опционально)
//
// Возвращает:
//   {
//     colorCls,   // CSS-класс цвета (color-red и т.д.)
//     fontCls,    // CSS-класс шрифта (font-cyber и т.д.)
//     frameCls,   // CSS-класс рамки (f-gold и т.д.)
//     badgeHtml,  // HTML для бейджика
//     roleBadge,  // HTML для роли (👑/🛡)
//     avatar      // URL аватара
//   }
// ============================================================
export function getAgentFx(name, agents) {
    let a = (agents || {})[name] || {};

    // Для СВОЕГО ника — всегда берём актуальные данные из CA
    if (CA && name === CA.name) {
        a = {
            active_color: CA.active_color,
            active_frame: CA.active_frame,
            active_badge: CA.active_badge,
            active_font: CA.active_font,
            avatar_url: CA.avatar_url || '',
            role: CA.role || 'agent'
        };
    }

    let colorCls = a.active_color ? getActiveColorClassForId(a.active_color) : '';
    let fontCls = '';

    // Шрифт применяется только к другим агентам (не к себе)
    if (a.active_font && name !== CA?.name) {
        fontCls = FONT_MAP[a.active_font] || '';
    }

    let frameCls = 'f-default';
    if (a.active_frame && shopItems.frames) {
        let f = shopItems.frames.find(x => x.id === a.active_frame);
        if (f) frameCls = f.cssClass || 'f-default';
    }

    let badgeHtml = '';
    if (a.active_badge && a.active_badge !== 'b_none' && shopItems.badges) {
        let b = shopItems.badges.find(x => x.id === a.active_badge);
        if (b && b.image) badgeHtml = '<img src="' + b.image + '" class="badge-img" alt="">';
        else if (b && b.emoji) badgeHtml = '<span style="font-size:1rem;">' + b.emoji + '</span>';
    }

    let roleBadge = '';
    if (a.role === 'admin') roleBadge = '<span class="role-badge admin" title="Администратор">👑</span>';
    else if (a.role === 'moderator') roleBadge = '<span class="role-badge mod" title="Модератор">🛡</span>';

    return {
        colorCls,
        fontCls,
        frameCls,
        badgeHtml,
        roleBadge,
        avatar: a.avatar_url || ''
    };
}

// ============================================================
// УПРОЩЁННАЯ ВЕРСИЯ (без agents)
// ============================================================
// Для случаев, когда нужно только имя без словаря.
export function getAgentFxSimple(name) {
    return getAgentFx(name, null);
}

// ============================================================
// ПРОКИДКА В WINDOW (для совместимости со старым кодом)
// ============================================================
// Некоторые модули (rp.js, announcements.js) используют
// window.__getAgentFx. Оставляем для плавной миграции.
window.__getAgentFx = (name, agents) => getAgentFx(name, agents);