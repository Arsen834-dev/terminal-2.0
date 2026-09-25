// ============================================================
// ТЕРМИНАЛ СИНДИКАТА v3.1.0 — MAIN
// v3.1.6: спектакли вынесены в features/rp-scenes.js
// ============================================================

console.log('[MAIN] Модуль начал загрузку');

import { supabase, CA, inventory, activeItems, activeBooster, boosterEndTime, login, register, saveAgent, loadAgent, getAgents, translit, setInventory } from './auth.js';
import { loadDiscount, loadInventory, saveInventory, renderShop, renderShopItems, renderShopCategories, renderInventory, previewItem, buyItem, applyItem, resetItem, getItemDiscount, getDiscountedPrice, formatPrice, updateDiscountDisplay, generateNewDiscount, getActiveColorClass, getActiveColorClassForId, getActiveFrameClass, getActiveBadgeEmoji, getActiveFontClass, getBoosterTimeLeft, shopItems } from './shop.js';

// ==================== CHAT ====================
import {
    loadChatMessages, sendMessage, renderChat, subscribeChat, switchChatTab,
    loadMoreChatMessages, addReaction, addAdminReaction, addClanReaction,
    deleteMessage, deleteClanMessage, deleteAdminMessage,
    pinChatMessage, pinClanMessage,
    editMessage, editClanMessage,
    replyToMessage, replyToClanMessage, cancelReply,
    loadMentionAgents, showMentionSuggestions, hideMentionSuggestions,
    updateBadgeIcons, showReactionPickerUniversal,
    loadAdminMessages, sendAdminMessage, renderAdminChat, subscribeAdminChat,
    openClanChat, sendClanMessage, renderClanMessages, loadClanMessages, subscribeClanChat,
    chatMessages, currentClanId, unreadMentions, clanChats,
    isClanChatActive, chatTabActive
} from './chat.js';

// ==================== DM ====================
import {
    loadDMMessages, sendDM, renderDMList, renderDMMessages, subscribeDM,
    openDM, startDM, addDMReaction, deleteDMMessage,
    replyToDMMessage, cancelDmReply
} from './features/dm.js';

// ==================== MEMES ====================
import {
    loadMemes, createMeme, deleteMeme, likeMeme, renderMemes, memes
} from './features/memes.js';

// ==================== RP SCENES ====================
import {
    loadRpScenes, createRpScene, editRpScene, deleteRpScene, renderRpScenes,
    openSceneChat as openSceneChatFn,
    closeSceneChat, sendSceneMessage, addSceneReaction, deleteSceneMessage,
    editSceneMessage, replyToSceneMessage,
    rpScenes
} from './features/rp-scenes.js';

// ==================== OTHER ====================
import { loadClans, loadClanWars, createClan, joinClan, leaveClan, deleteClan, declareWar, donateToClan, acceptJoinRequest, checkCompletedWars, autoDistributeTreasury, renderClans, changeClanRole, kickClanMember, showDonateModal, openWarTargetModal, clans, clanWars } from './clans.js';
import { loadFriends, sendFriendRequest, acceptFriend, removeFriend, blockAgent, unblockAgent, getFriends, renderFriends } from './friends.js';
import { loadGuides, createGuide, deleteGuide, editGuide, userGuides, renderGuides, saveEditedGuide, openGuideModal } from './guides.js';
import { loadAnnouncements, renderAnnounceApp, createAnnouncement, subscribeAnnouncements } from './announcements.js';
import { showAgentInfo, createPost, changeCover } from './agents.js';
import { getAchievements, unlockAchievement, checkAchievements, renderAchievementsUI } from './achievements.js';
import { muteAgent, banAgent, deleteAgent, changeAgentRole, renderAdminPanel, renderLogs } from './admin.js';
import { changeName, changePassword, changeAvatar } from './settings.js';
import { playSound, startBgMusic, stopBgMusic, toggleSound, toggleMusic, getSoundEnabled, getMusicEnabled, nextBgTrack } from './sounds.js';
import { notif, closeModal, uploadFileAndInsert, glowIcon, stopGlowIcon } from './utils.js';

// ==================== RP (персонажи + Space-X) ====================
import {
    loadRpCharacters, createRpCharacter, updateRpCharacter, deleteRpCharacter,
    getRpCharacters, setCurrentRpChar, loadSavedRpChar, loadRpMessages, subscribeRpChat,
    sendRpMessage, rpCharacters, getCurrentRpChar, requireCharacter,
    addRpReaction, deleteRpMessage, editRpMessage, replyToRpMessage, cancelRpReply, showRpCharInfo
} from './rp.js';

import { renderPostCard as renderPostCardFeed, attachFeedHandlers } from './feed.js';
import { initWebGraph, destroyWebGraph } from './web.js';
import { RP_RACES } from './config.js';
import { initCropper, setCropMode, getCroppedBlob, resetCropper, hasImage, getCropMode } from './cropper.js';
import { getAgentFx, FONT_MAP } from './ui/renderFx.js';
import {
    buildSidebar, updateSidebarBadges, updateSidebarProfile,
    applySidebarState, toggleSidebar, buildMobileNav, setSidebarHandlers
} from './ui/sidebar.js';
import { confirmDialog, initModalCloseHandlers } from './ui/modals.js';
import { getState, setState } from './ui/state.js';
import { renderRightPanel } from './ui/rightPanel.js';
import { openApp, closeApp, APP_SCREENS } from './routes.js';

console.log('[MAIN] Импорты загружены');

// ============================================================
// ЛОКАЛЬНОЕ СОСТОЯНИЕ (для ленты)
// ============================================================
let currentFeedTab = 'all';
let currentFeedFilter = 'fresh';
let currentHashtag = null;
let clockInterval = null;
let feedAgentsCache = null;
let feedOriginalsCache = null;
let feedChannel = null;
let agentsChannel = null;
let repTkInterval = null;

// ============================================================
// РЕРЕНДЕР ВСЕГО
// ============================================================
async function rerenderAll() {
    try {
        let st = getState();
        feedAgentsCache = await getAgents();

        if (st.currentView === 'feed') {
            await refreshFeedOnly();
        }

        let profileModal = document.getElementById('modal-agent-profile');
        if (profileModal && profileModal.classList.contains('show')) {
            let profileContent = document.getElementById('profile-content');
            if (profileContent && profileContent.dataset.agentName) {
                let openAgentName = profileContent.dataset.agentName;
                if (openAgentName && typeof showAgentInfo === 'function') {
                    showAgentInfo(openAgentName);
                }
            }
        }

        if (st.currentView === 'chat') {
            if (chatTabActive === 'general') renderChat();
            else if (chatTabActive === 'clan') renderClanMessages();
            else if (chatTabActive === 'admin') renderAdminChat();
        }

        if (st.currentView === 'dm') {
            renderDMList();
            renderDMMessages();
        }

        if (st.currentView === 'clans') {
            if (typeof renderClans === 'function') renderClans();
        }

        if (st.currentView === 'friends') {
            if (typeof renderFriends === 'function') renderFriends();
        }

        if (st.currentView === 'inventory') {
            if (typeof renderInventory === 'function') renderInventory();
        }

        if (st.currentView === 'shop') {
            if (typeof renderShopItems === 'function') renderShopItems();
        }

        if (st.currentView === 'rp') {
            if (typeof renderRpMessages === 'function') renderRpMessages();
        }

        if (st.currentView === 'rp-community') {
            if (typeof renderRpScenes === 'function') renderRpScenes();
        }

        renderRightPanel();

        if (typeof updateSidebarProfile === 'function') updateSidebarProfile();

        if (st.currentView === 'announce') renderAnnounceApp();
    } catch (e) { console.error('[rerenderAll]', e); }
}
window.__rerenderAll = rerenderAll;

// Прокидка confirmDialog в window
window.confirmDialog = confirmDialog;

// ============================================================
// ЗВУК НА КНОПКИ
// ============================================================
document.addEventListener('click', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    let btn = e.target.closest('button, .btn, .modal-btn, .chat-icon-btn, .chat-send-btn, .app-close, .sidebar-item, .mobile-nav-btn, .feed-tab, .chat-tab, .card-action, .sidebar-profile, [data-app], .online-item, .top-clan-item, .announce-mini, .reaction-picker span, .emoji-cell, [data-emoji], .mention-item, .chat-reaction, [data-clan-emoji], [data-avatar], .hashtag-link, .discord-cover-thumb');
    if (!btn) return;
    if (btn.classList.contains('send-msg-btn') || btn.classList.contains('send-dm-btn')) return;
    if (btn.id === 'rp-send-btn' || btn.id === 'rp-scene-send-btn') return;
    if (btn.dataset && (btn.dataset.buy || btn.dataset.apply || btn.dataset.invApply || btn.dataset.invReset)) return;
    if (btn.id === 'submit-post-btn' || btn.id === 'create-meme-submit-btn' || btn.id === 'create-guide-submit-btn') return;
    if (btn.id === 'create-announce-submit-btn' || btn.id === 'submit-scene-btn') return;
    if (btn.id === 'login-btn' || btn.id === 'register-link') return;
    if (btn.classList.contains('app-close') && btn.dataset.close) return;
    if (btn.id === 'rp-save-char-btn' || btn.id === 'rp-create-char-btn') return;
    if (btn.id === 'submit-create-clan') return;
    if (btn.classList.contains('chat-reaction')) return;
    if (btn.dataset && (btn.dataset.reaction || btn.dataset.reactionPicker)) return;
    if (btn.id === 'chat-emoji-btn' || btn.id === 'dm-emoji-btn' || btn.id === 'guide-emoji-btn') return;
    if (btn.id === 'chat-file-btn' || btn.id === 'dm-file-btn' || btn.id === 'guide-file-btn') return;
    if (btn.id === 'rp-emoji-btn' || btn.id === 'rp-file-btn' || btn.id === 'rp-scene-emoji-btn' || btn.id === 'rp-scene-file-btn') return;
    if (btn.id === 'announce-emoji-btn' || btn.id === 'announce-file-btn') return;
    if (btn.id === 'meme-emoji-btn' || btn.id === 'meme-file-btn' || btn.id === 'post-emoji-btn' || btn.id === 'post-file-btn') return;
    if (btn.classList.contains('hashtag-link')) return;
    if (btn.classList.contains('comment-send')) return;
    if (btn.dataset && (btn.dataset.commentSend || btn.dataset.repostBtn || btn.dataset.commentsToggle)) return;
    if (btn.id === 'modal-confirm-ok') return;
    if (btn.classList.contains('discord-cover-thumb')) return;
    if (btn.id === 'crop-save-btn' || btn.id === 'crop-mode-avatar' || btn.id === 'crop-mode-cover') return;
    if (btn.id === 'agents-toggle-btn' || btn.id === 'online-toggle-btn') return;
    playSound('click');
}, true);

// ============================================================
// ЧАСЫ
// ============================================================
function startClock() {
    let el = document.getElementById('topbar-clock');
    if (!el) return;
    function tick() {
        let now = new Date();
        el.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
    }
    tick();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(tick, 1000);
}

// ============================================================
// УКРАШЕННЫЙ ТЕКСТ
// ============================================================
function buildDecoratedTitle() {
    let el = document.getElementById('start-subtitle');
    if (!el) return;
    el.textContent = 'ТЕРМИНАЛ СИНДИКАТА';
}
buildDecoratedTitle();

// ============================================================
// ЗАСТАВКА → ЛОГИН
// ============================================================
const FADE_IN_TIME  = 1000;
const HOLD_TIME     = 2500;
const EAT_TIME      = 800;
const FADE_OUT_TIME = 600;

document.body.classList.add('splash-active');

let startScreenEl = document.getElementById('start-screen');
let skullEl = document.getElementById('skull-ascii');
let subtitleEl = document.getElementById('start-subtitle');

if (startScreenEl) {
    startScreenEl.style.display = 'flex';
    requestAnimationFrame(() => startScreenEl.classList.add('visible'));
}

if (skullEl) skullEl.classList.add('visible');
if (subtitleEl) subtitleEl.classList.add('visible');

setTimeout(() => {
    if (skullEl) skullEl.classList.add('eating');

    setTimeout(() => {
        if (startScreenEl) startScreenEl.classList.add('fade-out');

        let login = document.getElementById('login-screen');
        if (login) {
            login.style.display = 'flex';
            requestAnimationFrame(() => login.classList.add('visible'));
        }

        setTimeout(() => {
            if (startScreenEl) startScreenEl.style.display = 'none';
            document.body.classList.remove('splash-active');
            console.log('[MAIN] Досье открыто');
        }, FADE_OUT_TIME);
    }, EAT_TIME);
}, FADE_IN_TIME + HOLD_TIME);

// ============================================================
// МОДАЛКА ПРОСМОТРА ОБЪЯВЛЕНИЯ
// ============================================================
function openAnnounceView(a) {
    let typeLabels = { news: '📰 НОВОСТЬ', event: '🎯 ИВЕНТ', auction: '💰 АУКЦИОН', update: '⚡ ОБНОВЛЕНИЕ', wanted: '🔍 РОЗЫСК' };
    let modal = document.getElementById('modal-announce-view');
    if (!modal) return;
    document.getElementById('modal-announce-view-title').textContent = a.title || '';
    document.getElementById('modal-announce-view-meta').textContent = (typeLabels[a.type] || '📰') + ' · ' + a.author + ' · ' + timeAgo(a.created_at);
    document.getElementById('modal-announce-view-text').innerHTML = linkifyHashtags(escapeHtml(a.text || ''));
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}
window.openAnnounceView = openAnnounceView;

function timeAgo(d) {
    if (!d) return '';
    let diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч';
    if (diff < 604800) return Math.floor(diff / 86400) + ' дн';
    return new Date(d).toLocaleDateString('ru-RU');
}

function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function linkifyHashtags(escapedText) {
    if (!escapedText) return '';
    return escapedText.replace(/(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu, (full, tag) => {
        let prefix = full.startsWith(' ') ? ' ' : '';
        return prefix + '<span class="hashtag-link" data-hashtag="' + tag.toLowerCase() + '">#' + tag + '</span>';
    });
}

// ============================================================
// ЛЕНТА
// ============================================================
async function renderFeed() {
    let view = document.getElementById('center-view');
    if (!view || !CA) return;
    let profileBlock = renderFeedProfileBlock();
    let header = '<div class="feed-header">' +
        '<div class="feed-header-title">▸ ЛЕНТА</div>' +
        '<div class="feed-search-row">' +
        '<input type="text" class="feed-search-input" id="feed-search-input" placeholder="🔍 ПОИСК ПО ХЭШТЕГУ..." autocomplete="off">' +
        '<button class="feed-search-clear" id="feed-search-clear" style="display:none;">✕ СБРОС</button>' +
        '</div>' +
        (currentHashtag ? '<div class="hashtag-chip">🏷 #' + escapeHtml(currentHashtag) + ' <span data-remove-hashtag>✕</span></div>' : '') +
        '<div class="feed-header-tabs" style="margin-top:10px;">' +
        '<button class="feed-tab' + (currentFeedTab === 'all' ? ' active' : '') + '" data-feed-tab="all">ВСЁ</button>' +
        '<button class="feed-tab' + (currentFeedTab === 'posts' ? ' active' : '') + '" data-feed-tab="posts">ПОСТЫ</button>' +
        '<button class="feed-tab' + (currentFeedTab === 'memes' ? ' active' : '') + '" data-feed-tab="memes">МЕМЫ</button>' +
        '<button class="feed-tab' + (currentFeedTab === 'activity' ? ' active' : '') + '" data-feed-tab="activity">АКТИВНОСТЬ</button>' +
        '</div>' +
        '<div class="feed-filters">' +
        '<span class="feed-filter' + (currentFeedFilter === 'fresh' ? ' active' : '') + '" data-feed-filter="fresh">🔥 СВЕЖИЕ</span>' +
        '<span class="feed-filter' + (currentFeedFilter === 'popular' ? ' active' : '') + '" data-feed-filter="popular">⭐ ПОПУЛЯРНЫЕ</span>' +
        '<span class="feed-filter' + (currentFeedFilter === 'mine' ? ' active' : '') + '" data-feed-filter="mine">👤 МОИ</span>' +
        '</div></div>';
    let feedItems = await loadFeedItems();
    let feedHtml = '<div class="feed" id="feed">' +
        (feedItems.length === 0 ? '<div class="feed-empty">ПУСТО</div>' : feedItems.map(renderFeedCard).join('')) +
        '</div>';
    view.innerHTML = profileBlock + header + feedHtml;

    if (window.__pendingHashtag) {
        let tag = window.__pendingHashtag;
        window.__pendingHashtag = null;
        currentHashtag = tag;
        let si = document.getElementById('feed-search-input');
        if (si) si.value = '#' + tag;
        let sc = document.getElementById('feed-search-clear');
        if (sc) sc.style.display = 'inline-block';
        await refreshFeedOnly();
    }

    let searchInput = document.getElementById('feed-search-input');
    if (searchInput && currentHashtag) {
        searchInput.value = '#' + currentHashtag;
        let clearBtn = document.getElementById('feed-search-clear');
        if (clearBtn) clearBtn.style.display = 'inline-block';
    }

    setTimeout(() => {
        document.querySelectorAll('[data-feed-tab]').forEach(b => {
            b.addEventListener('click', () => { currentFeedTab = b.dataset.feedTab; renderFeed(); });
        });
        document.querySelectorAll('[data-feed-filter]').forEach(b => {
            b.addEventListener('click', () => { currentFeedFilter = b.dataset.feedFilter; renderFeed(); });
        });
        document.querySelector('[data-remove-hashtag]')?.addEventListener('click', () => {
            currentHashtag = null; renderFeed();
        });
        let si = document.getElementById('feed-search-input');
        let sc = document.getElementById('feed-search-clear');
        if (si) {
            si.addEventListener('input', () => {
                let v = si.value.trim().replace(/^#/, '').toLowerCase();
                currentHashtag = v || null;
                if (sc) sc.style.display = v ? 'inline-block' : 'none';
                refreshFeedOnly();
            });
        }
        if (sc) {
            sc.addEventListener('click', () => {
                currentHashtag = null;
                if (si) si.value = '';
                sc.style.display = 'none';
                renderFeed();
            });
        }
        let feedEl = document.getElementById('feed');
        if (feedEl && typeof attachFeedHandlers === 'function') {
            attachFeedHandlers(feedEl, {
                onHashtag: (tag) => { currentHashtag = tag; renderFeed(); },
                onReposted: () => { renderFeed(); }
            });
        }
    }, 10);
}

async function refreshFeedOnly() {
    let feedEl = document.getElementById('feed');
    if (!feedEl) { renderFeed(); return; }
    let items = await loadFeedItems();
    feedEl.innerHTML = items.length === 0
        ? '<div class="feed-empty">ПУСТО</div>'
        : items.map(renderFeedCard).join('');
}

function renderFeedProfileBlock() {
    if (!CA) return '';
    let fx = getAgentFx(CA.name);
    let avatarHtml = CA.avatar_url
        ? '<div class="inner"><img src="' + CA.avatar_url + '"></div>'
        : '<div class="inner">🕶️</div>';
    let coverHtml = CA.cover_url ? '<img src="' + CA.cover_url + '">' : '';
    let clanName = '';
    let myClan = clans.find(c => c.members && c.members.some(m => m.name === CA.name));
    if (myClan) clanName = ' · ' + myClan.emoji + ' ' + myClan.name;
    let roleMap = { admin: '👑 АДМИНИСТРАТОР', moderator: '🛡 МОДЕРАТОР', agent: '🎯 АГЕНТ' };
    let roleText = roleMap[CA.role] || '🎯 АГЕНТ';

    return '<div class="feed-profile-block">' +
        '<div class="feed-profile-cover">' + coverHtml + '</div>' +
        '<div class="feed-profile-main">' +
        '<div class="chat-avatar-frame feed-profile-avatar ' + fx.frameCls + '">' + avatarHtml + '</div>' +
        '<div class="feed-profile-info">' +
        '<div class="feed-profile-name"><span class="name-with-badge ' + fx.colorCls + ' ' + fx.fontCls + '">' + CA.name + fx.roleBadge + fx.badgeHtml + '</span></div>' +
        '<div class="feed-profile-status">' + roleText + clanName + ' · <span class="online">● ОНЛАЙН</span></div>' +
        '<div class="feed-profile-stats">' +
        '<div class="feed-profile-stat"><span class="feed-profile-stat-value">' + (CA.crystals || 0) + '</span><span class="feed-profile-stat-label">ТК</span></div>' +
        '<div class="feed-profile-stat"><span class="feed-profile-stat-value">' + (CA.rep || 0) + '</span><span class="feed-profile-stat-label">РЕПА</span></div>' +
        '<div class="feed-profile-stat"><span class="feed-profile-stat-value">' + (CA.achievements?.length || 0) + '</span><span class="feed-profile-stat-label">АЧИВКИ</span></div>' +
        '</div>' +
        '<div class="feed-profile-actions" id="feed-profile-actions">' +
        '<button class="btn" data-action="post">▸ НОВЫЙ ПОСТ</button>' +
        '<button class="btn secondary" data-action="profile">👤 ПРОФИЛЬ</button>' +
        '<button class="btn secondary" data-action="settings">⚙️</button>' +
        '</div></div></div></div>';
}

async function loadFeedItems() {
    let all = [];
    try {
        if (currentFeedTab === 'all' || currentFeedTab === 'posts') {
            let q = supabase.from('profile_posts').select('*').order('created_at', { ascending: false }).limit(50);
            if (currentFeedFilter === 'mine' && CA) q = q.eq('author', CA.name);
            let { data: posts } = await q;
            if (posts && CA) {
                let visibleNames = new Set([CA.name]);
                try {
                    let friends = getFriends();
                    friends.forEach(f => {
                        if (f.status === 'accepted') {
                            if (f.agent === CA.name) visibleNames.add(f.friend);
                            if (f.friend === CA.name) visibleNames.add(f.agent);
                        }
                    });
                } catch (e) {}
                try {
                    let { data: subs } = await supabase.from('subscriptions').select('target').eq('subscriber', CA.name);
                    (subs || []).forEach(s => visibleNames.add(s.target));
                } catch (e) {}

                posts.forEach(p => {
                    if (p.repost_of && !visibleNames.has(p.author)) return;
                    all.push({ type: 'post', data: p, time: p.created_at, likes: p.likes || 0 });
                });
            }
        }
        if (currentFeedTab === 'all' || currentFeedTab === 'activity') {
            let { data: ann } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20);
            if (ann) ann.forEach(a => all.push({ type: 'announce', data: a, time: a.created_at }));
        }
        if (currentFeedTab === 'all' || currentFeedTab === 'memes') {
            let { data: memesD } = await supabase.from('memes').select('*').order('created_at', { ascending: false }).limit(20);
            if (memesD) memesD.forEach(m => all.push({ type: 'meme', data: m, time: m.created_at, likes: m.likes || 0 }));
        }
    } catch (e) { console.error(e); }

    if (currentHashtag) {
        let tag = currentHashtag.toLowerCase();
        all = all.filter(item => {
            let tags = item.data.hashtags;
            let arr = [];
            if (Array.isArray(tags)) arr = tags;
            else if (typeof tags === 'string' && tags) {
                try { let p = JSON.parse(tags); if (Array.isArray(p)) arr = p; } catch (e) {}
            }
            if (arr.length > 0) return arr.map(t => String(t).toLowerCase()).includes(tag);
            let txt = (item.data.text || '') + ' ' + (item.data.title || '');
            return new RegExp('#(' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?:\\s|$)', 'i').test(txt);
        });
    }
    if (currentFeedFilter === 'popular') all.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else all.sort((a, b) => new Date(b.time) - new Date(a.time));
    return all;
}

function renderFeedCard(item) {
    if (item.type === 'post') return renderFeedPost(item.data);
    if (item.type === 'announce') return renderAnnounceCard(item.data);
    if (item.type === 'meme') return renderMemeCard(item.data);
    return '';
}

function renderFeedPost(post) {
    if (!feedAgentsCache) feedAgentsCache = {};
    if (!feedOriginalsCache) feedOriginalsCache = new Map();
    let originalPost = null;
    if (post.repost_of && feedOriginalsCache.has(post.repost_of)) {
        originalPost = feedOriginalsCache.get(post.repost_of);
    }
    let html = renderPostCardFeed(post, { agents: feedAgentsCache, originalPost: originalPost });
    if (post.repost_of && !originalPost) {
        supabase.from('profile_posts').select('*').eq('id', post.repost_of).maybeSingle().then(({ data }) => {
            if (data) {
                feedOriginalsCache.set(post.repost_of, data);
                let card = document.querySelector('[data-post-id="' + post.id + '"]');
                if (card) {
                    let newHtml = renderPostCardFeed(post, { agents: feedAgentsCache, originalPost: data });
                    let tmp = document.createElement('div');
                    tmp.innerHTML = newHtml;
                    card.replaceWith(tmp.firstElementChild);
                }
            }
        });
    }
    return html;
}

function renderAnnounceCard(a) {
    let typeLabels = { news: '📰 НОВОСТЬ', event: '🎯 ИВЕНТ', auction: '💰 АУКЦИОН', update: '⚡ ОБНОВЛЕНИЕ', wanted: '🔍 РОЗЫСК' };
    let titleHtml = a.title ? linkifyHashtags(escapeHtml(a.title)) : '';
    let textHtml = a.text ? linkifyHashtags(escapeHtml(a.text)).replace(/\n/g, '<br>') : '';
    return '<div class="card" style="border-left-color:var(--accent);">' +
        '<div class="card-header">' +
        '<div class="card-avatar"><div class="inner" style="background:var(--accent-dim);color:var(--accent);">📢</div></div>' +
        '<div class="card-author-block">' +
        '<div class="card-author">' + escapeHtml(a.author) + '</div>' +
        '<div class="card-meta"><span class="role">' + (typeLabels[a.type] || '📰') + '</span><span class="card-time">' + timeAgo(a.created_at) + '</span></div>' +
        '</div></div>' +
        (titleHtml ? '<div class="card-title">' + titleHtml + '</div>' : '') +
        (textHtml ? '<div class="card-text">' + textHtml + '</div>' : '') +
        '</div>';
}

function renderMemeCard(m) {
    let fx = getAgentFx(m.author);
    let avatarHtml = fx.avatar ? '<div class="inner"><img src="' + fx.avatar + '"></div>' : '<div class="inner">😂</div>';
    let imgHtml = m.image_url ? '<img src="' + m.image_url + '" class="post-image" onerror="this.style.display=\'none\'">' : '';
    let titleHtml = m.title ? linkifyHashtags(escapeHtml(m.title)) : '';
    let textHtml = m.text ? linkifyHashtags(escapeHtml(m.text)).replace(/\n/g, '<br>') : '';
    return '<div class="card">' +
        '<div class="card-header">' +
        '<div class="chat-avatar-frame card-avatar ' + fx.frameCls + '" data-show-agent="' + escapeHtml(m.author) + '">' + avatarHtml + '</div>' +
        '<div class="card-author-block">' +
        '<div class="card-author name-with-badge ' + fx.colorCls + ' ' + fx.fontCls + '" data-open-post-author="' + escapeHtml(m.author) + '">' + escapeHtml(m.author) + fx.roleBadge + fx.badgeHtml + '</div>' +
        '<div class="card-meta"><span class="role">😂 МЕМ</span><span class="card-time">' + timeAgo(m.created_at) + '</span></div>' +
        '</div></div>' +
        (titleHtml ? '<div class="card-title">' + titleHtml + '</div>' : '') +
        (textHtml ? '<div class="card-text">' + textHtml + '</div>' : '') +
        imgHtml +
        '<div class="card-actions"><span class="card-action">❤ ' + (m.likes || 0) + '</span></div></div>';
}

function openFeed() {
    let st = getState();
    window.__currentView = 'feed';
    st.currentView = 'feed';
    document.querySelectorAll('.app-screen').forEach(a => { a.classList.remove('show'); setTimeout(() => a.style.display = 'none', 150); });
    document.getElementById('center-content').style.display = '';
    document.querySelectorAll('[data-app]').forEach(el => el.classList.remove('active'));
    feedAgentsCache = null;
    feedOriginalsCache = null;
    getAgents().then(a => { feedAgentsCache = a; });
    renderFeed();
}

function openOwnProfile() { if (CA) showAgentInfo(CA.name); }

// ============================================================
// REALTIME ПОДПИСКИ
// ============================================================
function subscribeFeedRealtime() {
    if (feedChannel) supabase.removeChannel(feedChannel);
    feedChannel = supabase.channel('feed-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_posts' }, () => {
            if (getState().currentView === 'feed') refreshFeedOnly();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_comments' }, () => {
            if (getState().currentView === 'feed') {
                clearTimeout(window.__feedCommentDebounce);
                window.__feedCommentDebounce = setTimeout(() => refreshFeedOnly(), 300);
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
            if (getState().currentView === 'feed') refreshFeedOnly();
            renderRightPanel();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memes' }, () => {
            if (getState().currentView === 'feed') refreshFeedOnly();
        })
        .subscribe();
}

function subscribeAgentsRealtime() {
    if (agentsChannel) supabase.removeChannel(agentsChannel);
    agentsChannel = supabase.channel('agents-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
            renderRightPanel();
        })
        .subscribe();
}

// ============================================================
// РЕПА/ТК ТАЙМЕР
// ============================================================
function startRepTkTimer() {
    if (repTkInterval) clearInterval(repTkInterval);
    repTkInterval = setInterval(() => {
        if (!CA) return;
        let now = Date.now();
        let lastRepTk = parseInt(localStorage.getItem('syndicate_last_rep_tk_' + CA.name) || '0');
        if (now - lastRepTk >= 1800000) {
            CA.rep = Math.min(100, (CA.rep || 0) + 1);
            CA.crystals = (CA.crystals || 0) + 50;
            localStorage.setItem('syndicate_last_rep_tk_' + CA.name, now);
            saveAgent();
            updateTopbar();
            notif('📈 +1 репа, +50 ТК');
        }
    }, 60000);
    let now = Date.now();
    let lastRepTk = parseInt(localStorage.getItem('syndicate_last_rep_tk_' + CA.name) || '0');
    if (now - lastRepTk >= 1800000) {
        CA.rep = Math.min(100, (CA.rep || 0) + 1);
        CA.crystals = (CA.crystals || 0) + 50;
        localStorage.setItem('syndicate_last_rep_tk_' + CA.name, now);
        saveAgent();
        updateTopbar();
    }
}

// ============================================================
// СИНХРОНИЗАЦИЯ ИНВЕНТАРЯ
// ============================================================
async function syncAgentWithServer() {
    if (!CA) return;
    try {
        let { data } = await supabase.from('agents')
            .select('inventory, crystals, active_color, active_frame, active_badge, active_font, active_booster, booster_end_time, last_seen')
            .eq('name', CA.name)
            .maybeSingle();

        if (data) {
            let serverInv = data.inventory || [];
            let localInv = inventory || [];
            if (serverInv.length > localInv.length) {
                setInventory(serverInv);
                CA.inventory = serverInv;
                console.log('[SYNC] Инвентарь обновлён с сервера:', serverInv.length);
            } else if (localInv.length > serverInv.length) {
                CA.inventory = localInv;
            }

            if ((data.crystals || 0) > (CA.crystals || 0)) {
                CA.crystals = data.crystals;
            }

            if (data.active_color && activeItems.color === 'c_red' && data.active_color !== 'c_red') {
                activeItems.color = data.active_color;
                CA.active_color = data.active_color;
            }
            if (data.active_frame && activeItems.frame === 'f_default' && data.active_frame !== 'f_default') {
                activeItems.frame = data.active_frame;
                CA.active_frame = data.active_frame;
            }
            if (data.active_badge && activeItems.badge === 'b_none' && data.active_badge !== 'b_none') {
                activeItems.badge = data.active_badge;
                CA.active_badge = data.active_badge;
            }
            if (data.active_font && activeItems.font === 'fnt_default' && data.active_font !== 'fnt_default') {
                activeItems.font = data.active_font;
                CA.active_font = data.active_font;
            }
        }
    } catch (e) { console.warn('[SYNC] Ошибка:', e); }
}

// ============================================================
// РП ПЕРСОНАЖИ
// ============================================================
function updateRpCurrentChar() {
    let el = document.getElementById('rp-current-char');
    let ch = getCurrentRpChar();
    if (el) el.textContent = ch ? '🎭 ' + ch.name : '⚠ НЕ ВЫБРАН';
}

function renderRpCharsList() {
    let list = document.getElementById('rp-chars-list');
    if (!list) return;
    let chars = getRpCharacters();
    if (chars.length === 0) { list.innerHTML = '<div class="empty-state">НЕТ ПЕРСОНАЖЕЙ</div>'; return; }
    list.innerHTML = chars.map(c => {
        let av = c.avatar_url ? '<img src="' + c.avatar_url + '">' : '🎭';
        let raceObj = RP_RACES.find(r => r.id === c.race) || RP_RACES[0];
        let raceLine = raceObj.icon + ' ' + escapeHtml(raceObj.name) + (c.role ? ' · ' + escapeHtml(c.role) : '');
        return '<div class="card" style="padding:10px;margin-bottom:6px;cursor:pointer;" data-char-pick="' + c.id + '">' +
            '<div style="display:flex;gap:10px;align-items:center;">' +
            '<div class="chat-avatar-frame card-avatar"><div class="inner">' + av + '</div></div>' +
            '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(c.name) + '</div>' +
            '<div class="card-meta">' + raceLine + '</div></div>' +
            '<button class="btn secondary" data-char-edit="' + c.id + '" style="padding:4px 8px;font-size:0.7rem;">✏</button>' +
            '<button class="btn danger" data-char-del="' + c.id + '" style="padding:4px 8px;font-size:0.7rem;">✕</button>' +
            '</div></div>';
    }).join('');
    setTimeout(() => {
        document.querySelectorAll('[data-char-pick]').forEach(b => b.addEventListener('click', function(e) {
            if (e.target.closest('[data-char-edit]') || e.target.closest('[data-char-del]')) return;
            let id = parseInt(this.dataset.charPick);
            let ch = chars.find(x => x.id === id);
            if (ch) { setCurrentRpChar(ch); updateRpCurrentChar(); closeModal('modal-rp-chars'); notif('🎭 ' + ch.name); }
        }));
        document.querySelectorAll('[data-char-edit]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); openCharCreateModal(parseInt(this.dataset.charEdit)); }));
        document.querySelectorAll('[data-char-del]').forEach(b => b.addEventListener('click', function(e) {
            e.stopPropagation();
            let id = parseInt(this.dataset.charDel);
            let ch = chars.find(x => x.id === id);
            confirmDialog('УДАЛИТЬ ПЕРСОНАЖА', 'Удалить персонажа «' + (ch ? ch.name : '?') + '»?', async () => {
                await deleteRpCharacter(id);
                renderRpCharsList();
            });
        }));
    }, 10);
}
function openCharCreateModal(id) {
    let title = document.getElementById('rp-char-modal-title');
    let idInput = document.getElementById('rp-char-id');
    let chars = getRpCharacters();
    if (id) {
        let c = chars.find(x => x.id === id);
        if (!c) return;
        title.textContent = '✏️ РЕДАКТИРОВАТЬ';
        idInput.value = id;
        document.getElementById('rp-char-name').value = c.name || '';
        document.getElementById('rp-char-race').value = c.race || 'human';
        document.getElementById('rp-char-age').value = c.age || '';
        document.getElementById('rp-char-gender').value = c.gender || '';
        document.getElementById('rp-char-role').value = c.role || '';
        document.getElementById('rp-char-character').value = c.character || '';
        document.getElementById('rp-char-bio').value = c.biography || '';
    } else {
        title.textContent = '🎭 НОВЫЙ ПЕРСОНАЖ';
        idInput.value = '';
        ['rp-char-name','rp-char-age','rp-char-gender','rp-char-role','rp-char-character','rp-char-bio'].forEach(i => document.getElementById(i).value = '');
        document.getElementById('rp-char-race').value = 'human';
        document.getElementById('rp-char-avatar').value = '';
    }
    closeModal('modal-rp-chars');
    let el = document.getElementById('modal-rp-char-create');
    el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
}

async function saveRpChar() {
    if (!CA) return notif('⛔ Не авторизован');
    let id = document.getElementById('rp-char-id').value;
    let name = document.getElementById('rp-char-name').value.trim();
    if (!name) return notif('⛔ ВВЕДИ ИМЯ');
    if (name.length < 2 || name.length > 30) return notif('⛔ ИМЯ 2-30 СИМВОЛОВ');

    let charData = {
        name,
        race: document.getElementById('rp-char-race').value,
        age: parseInt(document.getElementById('rp-char-age').value) || 0,
        gender: document.getElementById('rp-char-gender').value.trim(),
        role: document.getElementById('rp-char-role').value.trim(),
        character: document.getElementById('rp-char-character').value.trim(),
        biography: document.getElementById('rp-char-bio').value.trim(),
        avatar_url: id ? (getRpCharacters().find(x => x.id == id)?.avatar_url || '') : ''
    };

    let file = document.getElementById('rp-char-avatar').files[0];
    if (file) {
        charData.avatar_url = await new Promise(r => {
            let reader = new FileReader();
            reader.onload = e => {
                let img = new Image();
                img.onload = () => {
                    let canvas = document.createElement('canvas');
                    canvas.width = 256; canvas.height = 256;
                    let ctx = canvas.getContext('2d');
                    let size = Math.min(img.width, img.height);
                    ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 256, 256);
                    canvas.toBlob(async blob => {
                        let safeName = translit(CA.name).replace(/[^a-zA-Z0-9_-]/g, '_');
                        let fn = 'rp_' + safeName + '_' + Date.now() + '.png';
                        let { error } = await supabase.storage.from('avatars').upload(fn, blob, { upsert: true, contentType: 'image/png' });
                        if (error) { r(''); return; }
                        let { data } = await supabase.storage.from('avatars').getPublicUrl(fn);
                        r(data.publicUrl);
                    }, 'image/png');
                };
                img.onerror = () => r('');
                img.src = e.target.result;
            };
            reader.onerror = () => r('');
            reader.readAsDataURL(file);
        });
    }

    let res;
    if (id) res = await updateRpCharacter(parseInt(id), charData);
    else res = await createRpCharacter(charData);

    if (res.success) {
        closeModal('modal-rp-char-create');
        if (!id && res.character) { setCurrentRpChar(res.character); updateRpCurrentChar(); }
        await loadRpCharacters();
        renderRpCharsList();
        unlockAchievement('rp_actor');
    } else notif('⛔ ' + res.error);
}

// ============================================================
// TOPBAR
// ============================================================
function updateTopbar() {
    if (!CA) return;
    let c = document.getElementById('topbar-crystals');
    let r = document.getElementById('topbar-rep');
    if (c) c.textContent = CA.crystals || 0;
    if (r) r.textContent = CA.rep || 0;
    let ps = document.querySelectorAll('.feed-profile-stat-value');
    if (ps.length >= 2) {
        ps[0].textContent = CA.crystals || 0;
        ps[1].textContent = CA.rep || 0;
        if (ps[2]) ps[2].textContent = CA.achievements?.length || 0;
    }
}
window.updateStatusBar = updateTopbar;

// ============================================================
// WINDOW ПРОБРОС
// ============================================================
window.showAgentInfo = showAgentInfo;
window.showRpCharInfo = showRpCharInfo;
window.buyItem = buyItem;
window.applyItem = applyItem;
window.resetItem = resetItem;
window.previewItem = previewItem;
window.deleteMeme = deleteMeme;
window.deleteGuide = deleteGuide;
window.closeModal = closeModal;
window.notif = notif;
window.startDM = startDM;
window.checkAchievements = checkAchievements;
window.renderClans = renderClans;
window.openGuideModal = openGuideModal;

window.changeCover = async function() {
    let input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async e => {
        let f = e.target.files[0];
        if (f) { let r = await changeCover(f); if (r.success) { updateSidebarProfile(); renderFeed(); } }
    };
    input.click();
};

window.showCreatePost = function() {
    document.getElementById('post-text').value = '';
    document.getElementById('post-file').value = '';
    let el = document.getElementById('modal-create-post');
    el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
};

window.showCreateClan = function() {
    document.getElementById('clan-name').value = '';
    document.getElementById('clan-tag').value = '';
    document.getElementById('clan-desc').value = '';
    let emojis = ['⚔️','🛡','👑','💀','🔥','⚡','🌟','💎','🐺','🦅','🐉','🦊','🐍','🦎','🦇','👻','🤖','🎯','🏴','💣','🔱','⚜','🀄','🎲','🔮'];
    let grid = document.getElementById('clan-emoji-grid');
    grid.innerHTML = emojis.map(e => '<span class="emoji-pick" data-clan-emoji="' + e + '" style="font-size:1.4rem;padding:6px;text-align:center;cursor:pointer;border:1px solid transparent;' + (e === '⚔️' ? 'border-color:var(--accent);' : '') + '">' + e + '</span>').join('');
    setTimeout(() => {
        document.querySelectorAll('[data-clan-emoji]').forEach(c => c.onclick = function() {
            document.getElementById('clan-emoji').value = this.dataset.clanEmoji;
            document.querySelectorAll('#clan-emoji-grid [data-clan-emoji]').forEach(x => x.style.borderColor = 'transparent');
            this.style.borderColor = 'var(--accent)';
        });
    }, 10);
    let el = document.getElementById('modal-create-clan');
    el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
};

window.showClanInfo = function(clanId) {
    let cl = clans.find(c => c.id == clanId);
    if (!cl) return;

    let old = document.getElementById('modal-auto-clan');
    if (old) old.remove();

    let popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.style.display = 'flex';
    popup.id = 'modal-auto-clan';
    popup.innerHTML = '<div class="modal-box">' +
        '<div class="modal-title">' + cl.emoji + ' ' + escapeHtml(cl.name) + ' [' + cl.tag + ']</div>' +
        '<div style="color:var(--text-2);margin-bottom:12px;font-size:0.85rem;">' + escapeHtml(cl.description || '') + '</div>' +
        '<div style="color:var(--text-3);font-size:0.8rem;">👑 ' + escapeHtml(cl.leader) + ' · 💰 ' + (cl.treasury || 0) + ' ТК · ⭐ ' + (cl.rating || 0) + '</div>' +
        '<div style="margin-top:12px;font-size:0.8rem;">Участники: ' + (cl.members || []).map(m => escapeHtml(m.name)).join(', ') + '</div>' +
        (cl.members && !cl.members.find(m => m.name === CA?.name) && !clans.some(c => c.members?.some(m => m.name === CA?.name)) ? '<button class="btn full mt-16" id="join-clan-btn-' + cl.id + '">' + (cl.join_type === 'request' ? '📩 ОТПРАВИТЬ ЗАЯВКУ' : '✅ ВСТУПИТЬ') + '</button>' : '') +
        '<div style="margin-top:16px;text-align:right;"><button class="modal-btn secondary" id="close-auto-clan-btn">ЗАКРЫТЬ</button></div>' +
        '</div>';
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 10);

    document.getElementById('close-auto-clan-btn').onclick = function() {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 200);
    };
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 200);
        }
    });

    setTimeout(() => {
        document.getElementById('join-clan-btn-' + cl.id)?.addEventListener('click', () => {
            joinClan(cl.id).then(r => {
                if (r.success) { popup.remove(); renderClans(); notif('✅ Вступили'); } else notif(r.error);
            });
        });
    }, 10);
};

window.showCreateAnnouncement = function() {
    document.getElementById('new-announce-title').value = '';
    document.getElementById('new-announce-text').value = '';
    let el = document.getElementById('modal-announce');
    el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
};

window.showDonateModal = showDonateModal;
window.openWarTargetModal = openWarTargetModal;

window.openSceneChat = function(sceneId) {
    openApp('rp-scene');
    setTimeout(() => { openSceneChatFn(sceneId); }, 100);
};

window.openEditSceneModal = async function(sceneId) {
    let scene = rpScenes.find(s => s.id === sceneId);
    if (!scene) {
        let { data } = await supabase.from('rp_scenes').select('*').eq('id', sceneId).maybeSingle();
        scene = data;
    }
    if (!scene) return notif('⛔ Спектакль не найден');

    document.getElementById('scene-modal-title').textContent = '✏️ РЕДАКТИРОВАТЬ СПЕКТАКЛЬ';
    document.getElementById('scene-title').value = scene.title || '';
    document.getElementById('scene-desc').value = scene.description || '';

    let covers = [];
    try {
        let { data: imgs } = await supabase.from('rp_scene_images')
            .select('*').eq('scene_id', sceneId).order('position', { ascending: true });
        covers = (imgs || []).map(i => ({ url: i.image_url, preview: i.image_url, isNew: false }));
    } catch (e) {}
    window.__sceneCovers = covers;
    renderDiscordCovers();

    let btn = document.getElementById('submit-scene-btn');
    btn.dataset.editingScene = sceneId;
    btn.textContent = 'СОХРАНИТЬ';

    let el = document.getElementById('modal-scene-create');
    el.style.display = 'flex';
    setTimeout(() => el.classList.add('show'), 10);
};

// ============================================================
// ЭМОДЗИ
// ============================================================
function toggleChatEmoji(targetId) {
    let grid = document.getElementById('chat-emoji-grid');
    if (!grid) return;
    let emojis = ['😀','😂','🤣','😎','🤩','🥳','😇','🤠','👻','💀','🤡','👽','🤖','👾','👑','🔥','⚡','💣','🗝️','🔑','💉','🧬','🧪','🛡️','⚔️','🗡️','🏹','🔫','🧨','🪓','🔧','🔨','⛏️','🦊','🐺','🐉','🐲','🦅','🦉','🦇','🐍','🦎','🐙','🦑','🦈','🦂','🕷️','🌑','🌕','🌙','✨','💫','☄️','🌌','🪐','🔮','🧿','🕯️','☠️','👁️','🧠','🦾','🦿','🩸','💊','⚙️','⛓️','📡','🖥️','🎲','🎯','🎰','♠️','♦️','♣️','🃏','🀄','🎴','🪙','🏆','🥇','👍','❤','💯'];
    grid.innerHTML = emojis.map(e => '<span style="font-size:1.4rem;padding:5px;text-align:center;cursor:pointer;border:1px solid transparent;transition:all 0.15s;" data-emoji="' + e + '">' + e + '</span>').join('');

    let target = targetId;
    if (!target) {
        let active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
            target = active.id;
        } else {
            target = 'chat-input';
        }
    }
    let targetEl = document.getElementById(target);
    if (!targetEl || (targetEl.tagName !== 'TEXTAREA' && targetEl.tagName !== 'INPUT')) {
        target = 'chat-input';
    }

    setTimeout(() => {
        document.querySelectorAll('#chat-emoji-grid [data-emoji]').forEach(c => {
            c.onmouseenter = () => c.style.borderColor = 'var(--accent)';
            c.onmouseleave = () => c.style.borderColor = 'transparent';
            c.onclick = function() {
                let inp = document.getElementById(target);
                if (inp) {
                    inp.value += this.dataset.emoji;
                    if (inp.tagName === 'TEXTAREA') {
                        inp.style.height = 'auto';
                        inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
                    }
                }
                playSound('send');
            };
        });
    }, 10);

    let el = document.getElementById('modal-chat-emoji');
    el.style.display = 'flex';
    setTimeout(() => el.classList.add('show'), 10);
}

window.cancelReply = cancelReply;
window.addRpReaction = addRpReaction;
window.deleteRpMessage = deleteRpMessage;
window.editRpMessage = editRpMessage;
window.replyToRpMessage = replyToRpMessage;
window.cancelRpReply = cancelRpReply;
window.pinClanMessage = pinClanMessage;
window.editClanMessage = editClanMessage;
window.addAdminReaction = addAdminReaction;
window.deleteAdminMessage = deleteAdminMessage;
window.addSceneReaction = addSceneReaction;
window.deleteSceneMessage = deleteSceneMessage;
window.editSceneMessage = editSceneMessage;
window.replyToSceneMessage = replyToSceneMessage;
window.closeSceneChat = closeSceneChat;

// ============================================================
// DISCORD-STYLE ОБЛОЖКИ
// ============================================================
function renderDiscordCovers() {
    let main = document.getElementById('discord-covers-main');
    let grid = document.getElementById('discord-covers-grid');
    if (!main || !grid) return;
    let covers = window.__sceneCovers || [];

    let activeIdx = covers.findIndex(c => c.active);
    if (activeIdx === -1 && covers.length > 0) { activeIdx = 0; covers[0].active = true; }

    if (covers.length === 0) {
        main.innerHTML = '<span>НЕТ ОБЛОЖЕК</span>';
    } else {
        let url = covers[activeIdx].preview || covers[activeIdx].url;
        main.innerHTML = '<img src="' + url + '">';
    }

    grid.innerHTML = '';
    covers.forEach((c, i) => {
        let url = c.preview || c.url;
        grid.innerHTML += '<div class="discord-cover-thumb' + (i === activeIdx ? ' active' : '') + '" data-cover-idx="' + i + '">' +
            '<img src="' + url + '">' +
            '<span class="remove" data-cover-remove="' + i + '">✕</span>' +
            '</div>';
    });
    if (covers.length < 5) {
        grid.innerHTML += '<div class="discord-cover-add" id="discord-cover-add" title="Добавить">+</div>';
    }

    grid.querySelectorAll('[data-cover-idx]').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('[data-cover-remove]')) return;
            let idx = parseInt(el.dataset.coverIdx);
            covers.forEach((c, i) => c.active = (i === idx));
            renderDiscordCovers();
        });
    });
    grid.querySelectorAll('[data-cover-remove]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            let idx = parseInt(el.dataset.coverRemove);
            covers.splice(idx, 1);
            renderDiscordCovers();
        });
    });

    let addBtn = document.getElementById('discord-cover-add');
    if (addBtn) addBtn.addEventListener('click', () => document.getElementById('scene-covers').click());
}
window.__renderDiscordCovers = renderDiscordCovers;

// ============================================================
// AUTO-RESIZE TEXTAREA
// ============================================================
function autoResizeTextarea(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ============================================================
// ОТКРЫТИЕ РАБОЧЕГО СТОЛА
// ============================================================
function openDesktop() {
    document.getElementById('desktop').style.display = 'flex';

    setSidebarHandlers({
        onOpen: openApp,
        onOpenProfile: openOwnProfile
    });

    buildSidebar();
    buildMobileNav();
    startClock();
    updateTopbar();
    openFeed();
    renderRightPanel();
    checkCompletedWars();
    autoDistributeTreasury();
    startRepTkTimer();
    console.log('[MAIN] Рабочий стол открыт');
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[MAIN] DOMContentLoaded сработал');

    initCropper();
    initModalCloseHandlers();

    document.addEventListener('click', (e) => {
        let t = e.target.closest('[data-action]');
        if (!t) return;
        let a = t.dataset.action;
        if (a === 'post') { if (typeof window.showCreatePost === 'function') window.showCreatePost(); }
        else if (a === 'profile') { openOwnProfile(); }
        else if (a === 'settings') { openApp('settings'); }
        else if (a === 'dm') { openApp('dm'); }
        else if (a === 'feed') { openFeed(); }
    });

    document.addEventListener('click', (e) => {
        let rpMsg = e.target.closest('.chat-msg[data-rp-char]');
        if (!rpMsg) return;
        if (e.target.closest('[data-menu-btn]') ||
            e.target.closest('.chat-author') ||
            e.target.closest('.mention') ||
            e.target.closest('[data-reaction]') ||
            e.target.closest('[data-reaction-picker]') ||
            e.target.closest('[data-reply-rp]') ||
            e.target.closest('[data-reply-scene]') ||
            e.target.closest('[data-delete-rp-msg]') ||
            e.target.closest('[data-delete-scene-msg]') ||
            e.target.closest('[data-edit-rp-msg]') ||
            e.target.closest('[data-edit-scene-msg]') ||
            e.target.closest('img')) return;

        let charName = rpMsg.dataset.rpChar;
        let owner = rpMsg.dataset.rpOwner;
        if (charName && owner && typeof window.showRpCharInfo === 'function') {
            window.showRpCharInfo(charName, owner);
        }
    }, true);

    document.getElementById('change-image-btn')?.addEventListener('click', () => {
        document.getElementById('image-choice-file').value = '';
        resetCropper();
        setCropMode('avatar');
        let el = document.getElementById('modal-image-choice');
        el.style.display = 'flex';
        setTimeout(() => el.classList.add('show'), 10);
    });

    document.addEventListener('click', (e) => {
        let modeBtn = e.target.closest('[data-crop-mode]');
        if (!modeBtn) return;
        let mode = modeBtn.dataset.cropMode;
        setCropMode(mode);
    });

    document.getElementById('crop-save-btn')?.addEventListener('click', async () => {
        let file = document.getElementById('image-choice-file')?.files[0];
        if (!file) return notif('⛔ ВЫБЕРИ ФАЙЛ');
        if (!hasImage()) return notif('⚠ ПОДОЖДИ ЗАГРУЗКИ');

        let mode = getCropMode();
        let blob = await getCroppedBlob();
        if (!blob) return notif('⛔ ОШИБКА ОБРАБОТКИ');

        let croppedFile = new File([blob], 'cropped.png', { type: 'image/png' });

        if (mode === 'avatar') {
            let r = await changeAvatar(croppedFile);
            if (r.success) {
                closeModal('modal-image-choice');
                resetCropper();
                updateSidebarProfile();
                renderFeed();
            } else notif(r.error || 'ОШИБКА');
        } else {
            let r = await changeCover(croppedFile);
            if (r.success) {
                closeModal('modal-image-choice');
                resetCropper();
                updateSidebarProfile();
                renderFeed();
            } else notif(r.error || 'ОШИБКА');
        }
    });

    document.getElementById('login-btn')?.addEventListener('click', async () => {
        try {
            let r = await login();
            if (r && r.CA) {
                let login = document.getElementById('login-screen');
                login.classList.remove('visible');
                setTimeout(() => login.style.display = 'none', 400);
                setTimeout(() => {
                    openDesktop();
                    startBgMusic();
                    subscribeChat(); subscribeDM(); subscribeAdminChat();
                    subscribeFeedRealtime();
                    subscribeAgentsRealtime();
                    subscribeAnnouncements(() => {
                        if (getState().currentView === 'announce') renderAnnounceApp();
                        renderRightPanel();
                    });
                    loadChatMessages(); loadDMMessages();
                    loadGuides(); loadMemes(); loadAnnouncements();
                    loadClans(); loadClanWars(); loadFriends();
                    loadMentionAgents(); checkAchievements();
                    if (CA.role === 'admin' || CA.role === 'moderator') {
                        let ab = document.getElementById('admin-tab-btn');
                        if (ab) ab.classList.remove('hidden');
                    }
                    renderRightPanel();
                }, 420);
            }
        } catch (e) { console.error('[LOGIN] Ошибка:', e); notif('⛔ Ошибка: ' + e.message); }
    });
    document.getElementById('agent-pass')?.addEventListener('keypress', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });

    document.getElementById('register-link')?.addEventListener('click', async () => {
        try {
            let r = await register();
            if (r && r.CA) {
                let login = document.getElementById('login-screen');
                login.classList.remove('visible');
                setTimeout(() => login.style.display = 'none', 400);
                setTimeout(() => {
                    openDesktop();
                    startBgMusic();
                    subscribeChat(); subscribeDM(); subscribeFeedRealtime();
                    subscribeAgentsRealtime();
                    subscribeAnnouncements(() => {
                        if (getState().currentView === 'announce') renderAnnounceApp();
                        renderRightPanel();
                    });
                    loadChatMessages(); loadDMMessages();
                    loadAnnouncements(); loadClans(); loadClanWars();
                    loadFriends(); loadMentionAgents(); checkAchievements();
                    renderRightPanel();
                }, 420);
            }
        } catch (e) { console.error('[REGISTER] Ошибка:', e); }
    });

    document.getElementById('toggle-sidebar-btn')?.addEventListener('click', toggleSidebar);
    document.getElementById('topbar-logo')?.addEventListener('click', openFeed);
    document.getElementById('sidebar-profile')?.addEventListener('click', openOwnProfile);

    document.getElementById('change-name-btn')?.addEventListener('click', () => { document.getElementById('new-name').value = CA?.name || ''; let el = document.getElementById('modal-name'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('change-pass-btn')?.addEventListener('click', () => { document.getElementById('old-pass').value = ''; document.getElementById('new-pass').value = ''; let el = document.getElementById('modal-password'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('toggle-sound-btn')?.addEventListener('click', () => { toggleSound(); notif(getSoundEnabled() ? '🔊 ВКЛ' : '🔇 ВЫКЛ'); });
    document.getElementById('toggle-music-btn')?.addEventListener('click', () => { let on = toggleMusic(); notif(on ? '🎵 ВКЛ' : '🎵 ВЫКЛ'); });
    document.getElementById('next-track-btn')?.addEventListener('click', () => { nextBgTrack(); notif('⏭ СЛЕДУЮЩИЙ ТРЕК'); });
    document.getElementById('save-name-btn')?.addEventListener('click', async () => {
        let nn = document.getElementById('new-name').value.trim();
        if (!nn) return;
        let r = await changeName(nn);
        if (r.success) {
            closeModal('modal-name');
            buildSidebar();
            feedAgentsCache = null;
            getAgents().then(a => { feedAgentsCache = a; });
            renderFeed();
            updateSidebarProfile();
        } else notif(r.error);
    });
    document.getElementById('save-pass-btn')?.addEventListener('click', async () => {
        let r = await changePassword(document.getElementById('old-pass').value, document.getElementById('new-pass').value);
        if (r.success) closeModal('modal-password');
        else notif(r.error);
    });

    document.querySelector('.send-msg-btn')?.addEventListener('click', e => { e.stopPropagation(); if (isClanChatActive()) sendClanMessage(); else sendMessage(); });
    document.querySelector('.send-dm-btn')?.addEventListener('click', e => { e.stopPropagation(); sendDM(); });
    document.getElementById('rp-send-btn')?.addEventListener('click', sendRpMessage);
    document.getElementById('rp-scene-send-btn')?.addEventListener('click', sendSceneMessage);
    document.querySelectorAll('.chat-tab[data-tab]').forEach(tab => tab.addEventListener('click', function() { switchChatTab(this.dataset.tab); }));

    document.getElementById('chat-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('chat-input'); });
    document.getElementById('dm-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('dm-input'); });
    document.getElementById('guide-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('guide-text'); });
    document.getElementById('rp-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('rp-input'); });
    document.getElementById('rp-scene-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('rp-scene-input'); });
    document.getElementById('announce-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('new-announce-text'); });
    document.getElementById('meme-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('meme-text'); });
    document.getElementById('post-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji('post-text'); });

    document.getElementById('chat-file-btn')?.addEventListener('click', () => { document.getElementById('chat-file-input').click(); });
    document.getElementById('dm-file-btn')?.addEventListener('click', () => { document.getElementById('dm-file-input').click(); });
    document.getElementById('guide-file-btn')?.addEventListener('click', () => { document.getElementById('guide-file-input').click(); });
    document.getElementById('rp-file-btn')?.addEventListener('click', () => { document.getElementById('rp-file-input').click(); });
    document.getElementById('rp-scene-file-btn')?.addEventListener('click', () => { document.getElementById('rp-scene-file-input').click(); });
    document.getElementById('announce-file-btn')?.addEventListener('click', () => { document.getElementById('announce-file-input').click(); });
    document.getElementById('meme-file-btn')?.addEventListener('click', () => { document.getElementById('meme-file').click(); });
    document.getElementById('post-file-btn')?.addEventListener('click', () => { document.getElementById('post-file').click(); });

    document.getElementById('chat-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'chat-input'));
    document.getElementById('dm-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'dm-input'));
    document.getElementById('guide-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'guide-text'));
    document.getElementById('rp-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'rp-input'));
    document.getElementById('rp-scene-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'rp-scene-input'));
    document.getElementById('announce-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'new-announce-text'));

    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (document.activeElement === document.getElementById('chat-input')) { e.preventDefault(); if (isClanChatActive()) sendClanMessage(); else sendMessage(); }
            if (document.activeElement === document.getElementById('dm-input')) { e.preventDefault(); sendDM(); }
            if (document.activeElement === document.getElementById('rp-input')) { e.preventDefault(); sendRpMessage(); }
            if (document.activeElement === document.getElementById('rp-scene-input')) { e.preventDefault(); sendSceneMessage(); }
        }
    });

    document.addEventListener('input', e => {
        if (e.target.tagName === 'TEXTAREA' && e.target.classList.contains('chat-input')) {
            autoResizeTextarea(e.target);
        }
        if (e.target.id === 'chat-input') showMentionSuggestions('chat-input');
        if (e.target.id === 'dm-input') showMentionSuggestions('dm-input');
    });

    document.getElementById('create-guide-btn')?.addEventListener('click', () => { let el = document.getElementById('modal-rules'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('accept-rules-btn')?.addEventListener('click', () => {
        closeModal('modal-rules');
        document.getElementById('guide-title').value = '';
        document.getElementById('guide-text').value = '';
        let btn = document.getElementById('create-guide-submit-btn');
        delete btn.dataset.editing;
        btn.textContent = 'ОПУБЛИКОВАТЬ';
        document.getElementById('modal-create-title').textContent = 'НОВЫЙ ГАЙД';
        let el = document.getElementById('modal-create');
        el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
    });
    document.getElementById('create-guide-submit-btn')?.addEventListener('click', async function() {
        if (this.dataset.editing) { await saveEditedGuide(); }
        else {
            let t = document.getElementById('guide-title').value.trim(), x = document.getElementById('guide-text').value.trim();
            if (!t || !x) return notif('⛔ ЗАПОЛНИ');
            let r = await createGuide(t, x);
            if (r.success) { playSound('send'); closeModal('modal-create'); loadGuides().then(renderGuides); checkAchievements(); }
        }
    });

    document.getElementById('create-meme-btn')?.addEventListener('click', () => {
        document.getElementById('meme-title').value = '';
        document.getElementById('meme-text').value = '';
        document.getElementById('meme-file').value = '';
        let el = document.getElementById('modal-meme-create');
        el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
    });
    document.getElementById('create-meme-submit-btn')?.addEventListener('click', async () => {
        let t = document.getElementById('meme-title').value.trim(), x = document.getElementById('meme-text').value.trim();
        let f = document.getElementById('meme-file').files[0];
        if (!t && !x && !f) return notif('⛔ ПУСТО');
        let url = '';
        if (f) { let r = new FileReader(); r.readAsDataURL(f); url = await new Promise(res => r.onload = () => res(r.result)); }
        let re = await createMeme(t, x, url);
        if (re.success) { playSound('send'); closeModal('modal-meme-create'); loadMemes().then(renderMemes); }
    });

    document.getElementById('create-announce-submit-btn')?.addEventListener('click', async () => {
        let t = document.getElementById('new-announce-title').value.trim(), x = document.getElementById('new-announce-text').value.trim(), ty = document.getElementById('new-announce-type').value;
        if (!t || !x) return notif('⛔ ЗАПОЛНИ');
        let r = await createAnnouncement(t, x, ty);
        if (r.success) { playSound('send'); closeModal('modal-announce'); loadAnnouncements().then(renderAnnounceApp); }
    });

    document.getElementById('submit-post-btn')?.addEventListener('click', async () => {
        let t = document.getElementById('post-text').value.trim();
        let f = document.getElementById('post-file').files[0];
        let url = '';
        if (f) { let r = new FileReader(); r.readAsDataURL(f); url = await new Promise(res => r.onload = () => res(r.result)); }
        if (!t && !url) return notif('⛔ ПУСТО');
        let r = await createPost(t, url);
        if (r.success) {
            playSound('send');
            closeModal('modal-create-post');
            feedAgentsCache = null; feedOriginalsCache = null;
            getAgents().then(a => { feedAgentsCache = a; });
            renderFeed();
            checkAchievements();
        }
    });

    document.getElementById('submit-create-clan')?.addEventListener('click', async () => {
        let name = document.getElementById('clan-name').value.trim(), tag = document.getElementById('clan-tag').value.trim();
        if (!name || !tag) return notif('⛔ ЗАПОЛНИ');
        let r = await createClan(name, tag, document.getElementById('clan-emoji').value, document.getElementById('clan-desc').value.trim(), document.getElementById('clan-join-type').value);
        if (r.success) { playSound('send'); closeModal('modal-create-clan'); loadClans().then(renderClans); checkAchievements(); unlockAchievement('clan_creator'); }
        else notif(r.error);
    });

    document.getElementById('rp-choose-char-btn')?.addEventListener('click', () => { renderRpCharsList(); let el = document.getElementById('modal-rp-chars'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('rp-create-char-btn')?.addEventListener('click', () => openCharCreateModal());
    document.getElementById('rp-save-char-btn')?.addEventListener('click', saveRpChar);

    document.getElementById('create-scene-btn')?.addEventListener('click', () => {
        if (!requireCharacter()) return;
        document.getElementById('scene-modal-title').textContent = 'НОВЫЙ СПЕКТАКЛЬ';
        document.getElementById('scene-title').value = '';
        document.getElementById('scene-desc').value = '';
        window.__sceneCovers = [];
        renderDiscordCovers();
        let btn = document.getElementById('submit-scene-btn');
        delete btn.dataset.editingScene;
        btn.textContent = 'СОЗДАТЬ';
        let el = document.getElementById('modal-scene-create');
        el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
    });

    document.getElementById('discord-cover-add')?.addEventListener('click', () => {
        document.getElementById('scene-covers').click();
    });
    document.getElementById('scene-covers')?.addEventListener('change', function() {
        let files = Array.from(this.files || []);
        if (!window.__sceneCovers) window.__sceneCovers = [];
        let remaining = 5 - window.__sceneCovers.length;
        files.slice(0, remaining).forEach(f => {
            let reader = new FileReader();
            reader.onload = e => {
                window.__sceneCovers.push({ file: f, preview: e.target.result, isNew: true });
                renderDiscordCovers();
            };
            reader.readAsDataURL(f);
        });
        this.value = '';
    });

    document.getElementById('submit-scene-btn')?.addEventListener('click', async function() {
        let t = document.getElementById('scene-title').value.trim(), d = document.getElementById('scene-desc').value.trim();
        if (!t) return notif('⛔ ВВЕДИ НАЗВАНИЕ');
        let editId = this.dataset.editingScene;
        let covers = window.__sceneCovers || [];
        let newFiles = covers.filter(c => c.isNew).map(c => c.file);
        let r;
        if (editId) r = await editRpScene(parseInt(editId), t, d, newFiles);
        else r = await createRpScene(t, d, newFiles);
        if (r.success) {
            playSound('send');
            closeModal('modal-scene-create');
            window.__sceneCovers = [];
            loadRpScenes().then(renderRpScenes);
        } else notif('⛔ ' + r.error);
    });

    document.querySelectorAll('.app-close[data-close]').forEach(btn => btn.addEventListener('click', function() { closeApp(this.dataset.close); }));

    document.addEventListener('click', e => {
        let reactBtn = e.target.closest('[data-reaction]');
        if (reactBtn) {
            let t = reactBtn.dataset.reaction, id = reactBtn.dataset.msgid, em = reactBtn.dataset.emoji;
            if (t === 'chat') addReaction(id, em);
            else if (t === 'clan') addClanReaction(id, em);
            else if (t === 'dm') addDMReaction(id, em);
            else if (t === 'admin') addAdminReaction(id, em);
            else if (t === 'rp') addRpReaction(id, em);
            else if (t === 'scene') addSceneReaction(id, em);
            return;
        }
        let pickerBtn = e.target.closest('[data-reaction-picker]');
        if (pickerBtn) {
            let t = pickerBtn.dataset.reactionPicker, id = pickerBtn.dataset.msgid;
            if (t === 'chat') showReactionPickerUniversal(id, pickerBtn, addReaction);
            else if (t === 'clan') showReactionPickerUniversal(id, pickerBtn, addClanReaction);
            else if (t === 'dm') showReactionPickerUniversal(id, pickerBtn, addDMReaction);
            else if (t === 'admin') showReactionPickerUniversal(id, pickerBtn, addAdminReaction);
            else if (t === 'rp') showReactionPickerUniversal(id, pickerBtn, addRpReaction);
            else if (t === 'scene') showReactionPickerUniversal(id, pickerBtn, addSceneReaction);
            return;
        }
        let mb = e.target.closest('[data-menu-btn]');
        if (mb) { let dd = mb.parentElement.querySelector('.chat-menu-dropdown'); if (dd) dd.classList.toggle('open'); return; }
        let rb = e.target.closest('[data-reply]');
        if (rb) { replyToMessage(rb.dataset.reply, rb.dataset.replyAuthor); return; }
        let rcb = e.target.closest('[data-reply-clan]');
        if (rcb) { replyToClanMessage(rcb.dataset.replyClan, rcb.dataset.replyAuthor); return; }
        let rdb = e.target.closest('[data-reply-dm]');
        if (rdb) { replyToDMMessage(parseInt(rdb.dataset.replyDm), rdb.dataset.replyAuthor, rdb.dataset.replyText); return; }
        let rrp = e.target.closest('[data-reply-rp]');
        if (rrp) { replyToRpMessage(parseInt(rrp.dataset.replyRp), rrp.dataset.replyCharName, rrp.dataset.replyText); return; }
        let rsc = e.target.closest('[data-reply-scene]');
        if (rsc) { replyToSceneMessage(parseInt(rsc.dataset.replyScene), rsc.dataset.replyCharName, rsc.dataset.replyText); return; }
        let rad = e.target.closest('[data-reply-admin]');
        if (rad) { let inp = document.getElementById('chat-input'); if (inp) { inp.value = '@' + rad.dataset.replyAuthor + ' '; inp.focus(); } notif('↩ ОТВЕТ ДЛЯ ' + rad.dataset.replyAuthor); return; }

        let editScene = e.target.closest('[data-edit-scene]');
        if (editScene) {
            e.stopPropagation();
            if (typeof window.openEditSceneModal === 'function') window.openEditSceneModal(parseInt(editScene.dataset.editScene));
            return;
        }
        let delScene = e.target.closest('[data-delete-scene]');
        if (delScene) {
            e.stopPropagation();
            let id = parseInt(delScene.dataset.deleteScene);
            let scene = rpScenes.find(s => s.id === id);
            confirmDialog('УДАЛИТЬ СПЕКТАКЛЬ', 'Удалить «' + (scene ? scene.title : '?') + '»?', async () => {
                let r = await deleteRpScene(id);
                if (r.success) { notif('🗑 Удалено'); loadRpScenes().then(renderRpScenes); }
                else notif('⛔ ' + r.error);
            });
            return;
        }

        let dmb = e.target.closest('[data-delete-dm-msg]');
        if (dmb) { deleteDMMessage(parseInt(dmb.dataset.deleteDmMsg)); return; }
        let dcl = e.target.closest('[data-delete-clan-msg]');
        if (dcl) { deleteClanMessage(dcl.dataset.deleteClanMsg); return; }
        let dad = e.target.closest('[data-delete-admin-msg]');
        if (dad) { deleteAdminMessage(dad.dataset.deleteAdminMsg); return; }
        let drp = e.target.closest('[data-delete-rp-msg]');
        if (drp) { deleteRpMessage(drp.dataset.deleteRpMsg); return; }
        let dsc = e.target.closest('[data-delete-scene-msg]');
        if (dsc) { deleteSceneMessage(dsc.dataset.deleteSceneMsg); return; }
        let dl = e.target.closest('[data-delete-msg]');
        if (dl) { let ct = dl.dataset.chatType; if (ct === 'clan') deleteClanMessage(dl.dataset.deleteMsg); else deleteMessage(dl.dataset.deleteMsg); return; }

        let ecl = e.target.closest('[data-edit-clan-msg]');
        if (ecl) { editClanMessage(ecl.dataset.editClanMsg); return; }
        let erp = e.target.closest('[data-edit-rp-msg]');
        if (erp) { editRpMessage(erp.dataset.editRpMsg); return; }
        let esc = e.target.closest('[data-edit-scene-msg]');
        if (esc) { editSceneMessage(esc.dataset.editSceneMsg); return; }
        let ed = e.target.closest('[data-edit-msg]');
        if (ed) { editMessage(ed.dataset.editMsg); return; }

        let pcl = e.target.closest('[data-pin-clan]');
        if (pcl) { pinClanMessage(pcl.dataset.pinClan); return; }
        let pn = e.target.closest('[data-pin]');
        if (pn) { pinChatMessage(pn.dataset.pin); return; }

        let muteBtn = e.target.closest('[data-mute]');
        if (muteBtn) { muteAgent(muteBtn.dataset.mute); return; }
        let banBtn = e.target.closest('[data-ban]');
        if (banBtn) { banAgent(banBtn.dataset.ban); return; }

        if (!e.target.closest('#mention-suggestions') && !e.target.closest('.chat-input')) hideMentionSuggestions();
        if (!e.target.closest('.chat-menu-wrap')) document.querySelectorAll('.chat-menu-dropdown.open').forEach(d => d.classList.remove('open'));
    });

    setInterval(async () => {
        if (!CA) return;
        await syncAgentWithServer();
        saveAgent();
        updateTopbar();
    }, 60000);

    setInterval(() => { if (CA && document.visibilityState === 'visible') supabase.from('agents').update({ last_seen: new Date().toISOString() }).eq('name', CA.name); }, 30000);
    setInterval(updateDiscountDisplay, 60000);
    setInterval(() => { if (CA && getState().currentView === 'feed') renderRightPanel(); }, 60000);

    console.log('✅ ТЕРМИНАЛ 3.1.0 ЗАГРУЖЕН');
});