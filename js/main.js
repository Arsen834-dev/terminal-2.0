// ============ MAIN / ИНИЦИАЛИЗАЦИЯ, РОУТИНГ ============
import { supabase, CA, inventory, activeItems, activeBooster, boosterEndTime,
         login, register, logout, saveAgent, getAgents, loadAgent } from './auth.js';
import { loadDiscount, loadInventory, saveInventory, renderShop, renderInventory } from './shop.js';
import { loadChatMessages, subscribeChat, loadDMMessages, subscribeDM, loadMentionAgents } from './chat.js';
import { loadClans, loadClanWars, autoDistributeTreasury, checkCompletedWars } from './clans.js';
import { loadGuides } from './guides.js';
import { loadAnnouncements } from './announcements.js';
import { loadMemes } from './guides.js';
import { loadFriends } from './friends.js';
import { loadLogs } from './admin.js';
import { startWc26Timer, stopWc26Timer } from './wc26.js';
import { startBgMusic, stopBgMusic } from './sound.js';
import { initTicker } from './ticker.js';
import { checkAchievements } from './achievements.js';
import { notif } from './utils.js';

// Глобальные переменные для таймеров
let repInterval = null;
let tkInterval = null;
let chatChannel = null;
let dmChannel = null;
let clanChannel = null;
let adminChannel = null;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

export async function initApp() {
    await loadClans();
    await loadClanWars();
    await loadGuides();
    await loadAnnouncements();
    await loadMemes();
    await loadFriends();
    await loadLogs();
    await loadDiscount();
    
    startWc26Timer();
    startBgMusic();
    initTicker();
    startRepTimer();
    startTKTimer();
    
    setInterval(() => {
        checkCompletedWars();
        autoDistributeTreasury();
    }, 300000);
    
    if (typeof loadLastVisit === 'function') loadLastVisit();
    if (typeof checkNewContent === 'function') checkNewContent();
}

export function openApp(id) {
    switch(id) {
        case 'chat':
            loadChatMessages();
            break;
        case 'dm':
            loadDMMessages();
            break;
        case 'shop':
            renderShop();
            break;
        case 'inventory':
            renderInventory();
            break;
        case 'contacts':
            if (typeof renderAgentList === 'function') renderAgentList();
            break;
        case 'achievements':
            if (typeof renderAchievementsUI === 'function') renderAchievementsUI();
            break;
        case 'guides':
            if (typeof renderGuides === 'function') renderGuides();
            break;
        case 'memes':
            if (typeof renderMemes === 'function') renderMemes();
            break;
        case 'clans':
            if (typeof renderClans === 'function') renderClans();
            break;
        case 'friends':
            if (typeof renderFriends === 'function') renderFriends();
            break;
        case 'admin':
            if (typeof renderAdmin === 'function') renderAdmin();
            break;
        case 'logs':
            if (typeof renderLogs === 'function') renderLogs();
            break;
        case 'announce':
            if (typeof renderAnnounceApp === 'function') renderAnnounceApp();
            break;
        case 'pong':
            if (typeof initPong === 'function') initPong();
            break;
        case 'settings':
            break;
    }
}

export function closeApp(id) {
    // Логика закрытия в index.html
}

export function logoutUser() {
    logout();
    if (repInterval) clearInterval(repInterval);
    if (tkInterval) clearInterval(tkInterval);
    if (chatChannel) supabase.removeChannel(chatChannel);
    if (dmChannel) supabase.removeChannel(dmChannel);
    if (clanChannel) supabase.removeChannel(clanChannel);
    if (adminChannel) supabase.removeChannel(adminChannel);
    stopWc26Timer();
    stopBgMusic();
}

function startRepTimer() {
    if (repInterval) clearInterval(repInterval);
    repInterval = setInterval(() => {
        if (CA && CA.rep < 100 && document.visibilityState === 'visible') {
            CA.rep = Math.min(100, (CA.rep || 0) + 1);
            if (typeof updateStatusBar === 'function') updateStatusBar();
            saveAgent();
        }
    }, 1800000);
}

function startTKTimer() {
    if (tkInterval) clearInterval(tkInterval);
    tkInterval = setInterval(() => {
        if (CA) {
            let online = document.visibilityState === 'visible';
            if (online) {
                let rate = CA.role === 'admin' ? 100 : CA.role === 'moderator' ? 70 : 50;
                CA.crystals = (CA.crystals || 0) + rate;
            }
            if (typeof updateStatusBar === 'function') updateStatusBar();
            saveAgent();
        }
    }, 1800000);
}

// ==================== ЭКСПОРТЫ ====================

export { supabase, CA, inventory, activeItems, activeBooster, boosterEndTime };