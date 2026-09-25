// ============================================================
// ROUTES — реестр экранов и переходы
// v3.1.2: спектакли вынесены в features/rp-scenes.js
// ============================================================

import { CA, saveAgent } from './auth.js';
import { playSound } from './sounds.js';
import { glowIcon, stopGlowIcon } from './utils.js';
import { getState } from './ui/state.js';
import { updateSidebarBadges } from './ui/sidebar.js';
import { unreadMentions, updateBadgeIcons, switchChatTab, loadChatMessages } from './chat.js';
import { loadDMMessages } from './features/dm.js';
import { loadMemes, renderMemes } from './features/memes.js';
import {
    loadRpScenes, renderRpScenes, closeSceneChat
} from './features/rp-scenes.js';
import { loadClans, loadClanWars, renderClans } from './clans.js';
import { loadFriends, renderFriends } from './friends.js';
import { loadGuides, renderGuides } from './guides.js';
import { loadAnnouncements, renderAnnounceApp } from './announcements.js';
import { renderAchievementsUI } from './achievements.js';
import { renderAdminPanel, renderLogs } from './admin.js';
import { renderShop, renderInventory } from './shop.js';
import {
    loadSavedRpChar, loadRpCharacters, loadRpMessages, subscribeRpChat,
    getCurrentRpChar
} from './rp.js';
import { initWebGraph, destroyWebGraph } from './web.js';

// ============================================================
// РЕЕСТР ЭКРАНОВ
// ============================================================
export const APP_SCREENS = {
    chat: 'app-chat',
    dm: 'app-dm',
    shop: 'app-shop',
    inventory: 'app-inventory',
    clans: 'app-clans',
    friends: 'app-friends',
    achievements: 'app-achievements',
    guides: 'app-guides',
    memes: 'app-memes',
    contacts: 'app-contacts',
    admin: 'app-admin',
    logs: 'app-logs',
    announce: 'app-announce',
    settings: 'app-settings',
    rp: 'app-rp',
    'rp-community': 'app-rp-community',
    'rp-scene': 'app-rp-scene'
};

// ============================================================
// ХУКИ НА ОТКРЫТИЕ
// ============================================================
const OPEN_HOOKS = {
    chat() {
        unreadMentions.chat = 0;
        unreadMentions.clan = 0;
        updateBadgeIcons();
        updateSidebarBadges();
        switchChatTab('general');
        stopGlowIcon('icon-chat');
        loadChatMessages();
    },
    dm() {
        unreadMentions.dm = 0;
        updateBadgeIcons();
        updateSidebarBadges();
        loadDMMessages();
    },
    contacts() {
        if (typeof initWebGraph === 'function') initWebGraph();
    },
    achievements() {
        renderAchievementsUI();
    },
    guides() {
        loadGuides().then(() => renderGuides());
    },
    memes() {
        loadMemes().then(() => renderMemes());
    },
    admin() {
        renderAdminPanel();
    },
    logs() {
        renderLogs();
    },
    shop() {
        renderShop();
    },
    inventory() {
        renderInventory();
    },
    clans() {
        loadClans().then(() => loadClanWars().then(() => renderClans()));
    },
    friends() {
        loadFriends().then(() => renderFriends());
    },
    announce() {
        loadAnnouncements().then(() => renderAnnounceApp());
    },
    rp() {
        loadSavedRpChar();
        loadRpCharacters().then(() => {
            updateRpCurrentChar();
            loadRpMessages('space-x');
            subscribeRpChat('space-x');
        });
    },
    'rp-community'() {
        loadRpScenes().then(() => renderRpScenes());
    }
};

// ============================================================
// ХУКИ НА ЗАКРЫТИЕ
// ============================================================
const CLOSE_HOOKS = {
    contacts() {
        if (typeof destroyWebGraph === 'function') destroyWebGraph();
    },
    'rp-scene'() {
        if (typeof closeSceneChat === 'function') closeSceneChat();
    }
};

// ============================================================
// АКТИВНЫЙ ПУНКТ САЙДБАРА
// ============================================================
function setActiveNavItem(id) {
    document.querySelectorAll('.sidebar-item').forEach(x => x.classList.remove('active'));
    let navItem = document.querySelector('.sidebar-item[data-app="' + id + '"]');
    if (navItem) navItem.classList.add('active');
}

// ============================================================
// ТЕКУЩИЙ ПЕРСОНАЖ
// ============================================================
function updateRpCurrentChar() {
    let el = document.getElementById('rp-current-char');
    let ch = getCurrentRpChar();
    if (el) el.textContent = ch ? '🎭 ' + ch.name : '⚠ НЕ ВЫБРАН';
}

// ============================================================
// OPEN APP
// ============================================================
export function openApp(id) {
    let st = getState();
    window.__currentView = id;
    st.currentView = id;

    playSound('open');

    if (st.newContentFlags[id]) {
        st.newContentFlags[id] = false;
        updateSidebarBadges();
    }

    let el = document.getElementById(APP_SCREENS[id]);
    if (!el) return;

    document.getElementById('center-content').style.display = 'none';
    el.style.display = 'flex';
    setTimeout(() => el.classList.add('show'), 10);

    setActiveNavItem(id);

    if (OPEN_HOOKS[id]) {
        try { OPEN_HOOKS[id](); }
        catch (e) { console.error('[openApp] hook error for', id, e); }
    }

    if (CA) {
        CA.crystals = (CA.crystals || 0) + 2;
        if (typeof window.updateStatusBar === 'function') window.updateStatusBar();
        saveAgent();
    }
}

// ============================================================
// CLOSE APP
// ============================================================
export function closeApp(id) {
    playSound('close');

    let el = document.getElementById(APP_SCREENS[id]);
    if (!el) return;

    if (CLOSE_HOOKS[id]) {
        try { CLOSE_HOOKS[id](); }
        catch (e) { console.error('[closeApp] hook error for', id, e); }
    }

    el.classList.remove('show');
    setTimeout(() => {
        el.style.display = 'none';
        document.getElementById('center-content').style.display = '';
    }, 150);
}

// ============================================================
// ПРОКИДКА В WINDOW
// ============================================================
window.openApp = openApp;
window.closeApp = closeApp;