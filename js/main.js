// ============================================================
// ТЕРМИНАЛ СИНДИКАТА v2.5.1 — MAIN
// ============================================================

console.log('[MAIN] Модуль начал загрузку');

import { supabase, CA, inventory, activeItems, activeBooster, boosterEndTime, login, register, saveAgent, loadAgent, getAgents, translit } from './auth.js';
import { loadDiscount, loadInventory, saveInventory, renderShop, renderShopItems, renderShopCategories, renderInventory, previewItem, buyItem, applyItem, resetItem, getItemDiscount, getDiscountedPrice, formatPrice, updateDiscountDisplay, generateNewDiscount, getActiveColorClass, getActiveColorClassForId, getActiveFrameClass, getActiveBadgeEmoji, getActiveFontClass, getBoosterTimeLeft, shopItems } from './shop.js';
import { loadChatMessages, sendMessage, renderChat, subscribeChat, switchChatTab, loadDMMessages, sendDM, renderDMList, renderDMMessages, subscribeDM, openDM, startDM, loadMoreChatMessages, addReaction, addDMReaction, addAdminReaction, addClanReaction, deleteMessage, deleteClanMessage, deleteAdminMessage, pinChatMessage, pinClanMessage, editMessage, editClanMessage, replyToMessage, replyToClanMessage, cancelReply, loadMentionAgents, showMentionSuggestions, hideMentionSuggestions, updateBadgeIcons, showReactionPickerUniversal, loadAdminMessages, sendAdminMessage, renderAdminChat, subscribeAdminChat, openClanChat, sendClanMessage, renderClanMessages, loadClanMessages, subscribeClanChat, chatMessages, currentClanId, currentDM, dmMessagesAll, unreadMentions, clanChats, isClanChatActive } from './chat.js';
import { loadClans, loadClanWars, createClan, joinClan, leaveClan, deleteClan, declareWar, donateToClan, acceptJoinRequest, checkCompletedWars, autoDistributeTreasury, renderClans, changeClanRole, kickClanMember, showDonateModal, openWarTargetModal, clans, clanWars } from './clans.js';
import { loadFriends, sendFriendRequest, acceptFriend, removeFriend, blockAgent, unblockAgent, getFriends, renderFriends } from './friends.js';
import { loadGuides, createGuide, deleteGuide, editGuide, loadMemes, createMeme, deleteMeme, likeMeme, userGuides, memes, renderGuides, saveEditedGuide, renderMemes, openGuideModal } from './guides.js';
import { loadAnnouncements, renderAnnounceApp, createAnnouncement } from './announcements.js';
import { showAgentInfo, createPost, changeCover } from './agents.js';
import { getAchievements, unlockAchievement, checkAchievements, renderAchievementsUI } from './achievements.js';
import { muteAgent, banAgent, deleteAgent, changeAgentRole, renderAdminPanel, renderLogs } from './admin.js';
import { changeName, changePassword, changeAvatar } from './settings.js';
import { playSound, startBgMusic, stopBgMusic, toggleSound, toggleMusic, getSoundEnabled, getMusicEnabled, nextBgTrack } from './sounds.js';
import { startLoading, recoverSystem } from './loader.js';
import { notif, closeModal, uploadFileAndInsert, glowIcon, stopGlowIcon } from './utils.js';
import { loadRpCharacters, createRpCharacter, updateRpCharacter, deleteRpCharacter, getRpCharacters, setCurrentRpChar, loadSavedRpChar, loadRpMessages, subscribeRpChat, sendRpMessage, loadRpScenes, createRpScene, editRpScene, deleteRpScene, renderRpScenes, rpCharacters, getCurrentRpChar, requireCharacter, addRpReaction, deleteRpMessage, editRpMessage, replyToRpMessage, cancelRpReply } from './rp.js';
import { openSceneChat, closeSceneChat, sendSceneMessage, addSceneReaction, deleteSceneMessage, editSceneMessage, replyToSceneMessage } from './rp.js';
import { renderPostCard as renderPostCardFeed, attachFeedHandlers } from './feed.js';
import { initWebGraph, destroyWebGraph } from './web.js';

console.log('[MAIN] Импорты загружены');

// ============================================================
// СОСТОЯНИЕ
// ============================================================
let currentFeedTab = 'all';
let currentFeedFilter = 'fresh';
let currentHashtag = null;
let sidebarCollapsed = localStorage.getItem('syndicate_sidebar_collapsed') === 'true';
let clockInterval = null;
let currentView = 'feed';
let feedAgentsCache = null;
let feedOriginalsCache = null;

// ============================================================
// УНИВЕРСАЛЬНАЯ МОДАЛКА ПОДТВЕРЖДЕНИЯ
// ============================================================
function confirmDialog(title, text, onConfirm) {
    let modal = document.getElementById('modal-confirm');
    if (!modal) { if (window.confirm(text)) onConfirm(); return; }
    document.getElementById('modal-confirm-title').textContent = title || 'ПОДТВЕРЖДЕНИЕ';
    document.getElementById('modal-confirm-text').textContent = text || '';
    let okBtn = document.getElementById('modal-confirm-ok');
    // Сбрасываем старый обработчик
    let newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    newOk.addEventListener('click', () => {
        closeModal('modal-confirm');
        if (typeof onConfirm === 'function') onConfirm();
    });
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}
window.confirmDialog = confirmDialog;

// ============================================================
// ЗВУК НА ВСЕ КНОПКИ
// ============================================================
document.addEventListener('click', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    let btn = e.target.closest('button, .btn, .modal-btn, .chat-icon-btn, .chat-send-btn, .app-close, .sidebar-item, .mobile-nav-btn, .feed-tab, .chat-tab, .card-action, .sidebar-profile, [data-app], .online-item, .top-clan-item, .announce-mini, .reaction-picker span, .emoji-cell, [data-emoji], .mention-item, .chat-reaction, [data-clan-emoji], [data-avatar], .hashtag-link, .cover-carousel-dot');
    if (!btn) return;
    if (btn.classList.contains('send-msg-btn') || btn.classList.contains('send-dm-btn')) return;
    if (btn.id === 'rp-send-btn') return;
    if (btn.id === 'rp-scene-send-btn') return;
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
    if (btn.id === 'error-btn') return;
    if (btn.classList.contains('hashtag-link')) return;
    if (btn.classList.contains('comment-send')) return;
    if (btn.dataset && (btn.dataset.commentSend || btn.dataset.repostBtn || btn.dataset.commentsToggle)) return;
    if (btn.id === 'modal-confirm-ok') return;
    playSound('click');
}, true);

// ============================================================
// data-close-modal
// ============================================================
document.addEventListener('click', (e) => {
    let closeBtn = e.target.closest('[data-close-modal]');
    if (!closeBtn) return;
    let id = closeBtn.dataset.closeModal;
    if (id) closeModal(id);
});

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
// ЗАСТАВКА → ЛОАДЕР → ЛОГИН (цепочка)
// ============================================================
const SKULL_TIME = 3500;    // 3.5 сек заставка
const EAT_TIME = 600;       // 0.6 сек анимация "поедания"

setTimeout(() => {
    const skull = document.getElementById('skull-ascii');
    if (skull) {
        skull.classList.add('eating');
        setTimeout(() => {
            let start = document.getElementById('start-screen');
            if (start) start.style.display = 'none';
            // NEW: запускаем лоадер
            startLoading();
            // Лоадер крутится ~7 сек, потом recoverSystem → логин
            setTimeout(() => {
                recoverSystem(() => {
                    let login = document.getElementById('login-screen');
                    if (login) login.style.display = 'flex';
                    console.log('[MAIN] Логин-экран показан после лоадера');
                });
            }, 7000);
        }, EAT_TIME);
    } else {
        // Фолбэк — сразу логин
        let login = document.getElementById('login-screen');
        if (login) login.style.display = 'flex';
    }
}, SKULL_TIME);

// ============================================================
// SIDEBAR
// ============================================================
const SIDEBAR_STRUCTURE = [
    { title: 'ОСНОВНОЕ', items: [
        // REMOVED: { id: 'feed', icon: '🏠', label: 'Лента' } — лента теперь на логотипе
        { id: 'chat', icon: '💬', label: 'Чат' },
        { id: 'dm', icon: '📁', label: 'Личка' },
        { id: 'rp', icon: '🎭', label: 'РП-Чат' }
    ]},
    { title: 'СООБЩЕСТВО', items: [
        { id: 'clans', icon: '⚔️', label: 'Отряды' },
        { id: 'friends', icon: '🤝', label: 'Друзья' },
        { id: 'contacts', icon: '🌐', label: 'Сеть' },
        { id: 'rp-community', icon: '🎬', label: 'Спектакли' }
    ]},
    { title: 'ЭКОНОМИКА', items: [
        { id: 'shop', icon: '🛒', label: 'Магазин' },
        { id: 'inventory', icon: '🎒', label: 'Инвентарь' }
    ]},
    { title: 'КОНТЕНТ', items: [
        { id: 'achievements', icon: '🏆', label: 'Достижения' },
        { id: 'guides', icon: '📚', label: 'Гайды' },
        { id: 'memes', icon: '😂', label: 'Мемы' }
    ]},
    { title: 'АДМИН', adminOnly: true, items: [
        { id: 'admin', icon: '👑', label: 'Админ' },
        { id: 'logs', icon: '📜', label: 'Логи' },
        { id: 'announce', icon: '📢', label: 'Объявления' }
    ]},
    { title: 'СИСТЕМА', items: [
        { id: 'settings', icon: '⚙️', label: 'Настройки' }
    ]}
];

function buildSidebar() {
    let nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    let isAdmin = CA && (CA.role === 'admin' || CA.role === 'moderator');

    let html = '';
    SIDEBAR_STRUCTURE.forEach(group => {
        if (group.adminOnly && !isAdmin) return;
        html += '<div class="sidebar-group">';
        html += '<div class="sidebar-group-title">' + group.title + '</div>';
        group.items.forEach(item => {
            let badge = '';
            if (item.id === 'chat' && (unreadMentions.chat + unreadMentions.clan) > 0) {
                badge = '<span class="sidebar-item-badge">' + (unreadMentions.chat + unreadMentions.clan) + '</span>';
            }
            if (item.id === 'dm' && unreadMentions.dm > 0) {
                badge = '<span class="sidebar-item-badge">' + unreadMentions.dm + '</span>';
            }
            let isActive = (item.id === currentView);
            html += '<div class="sidebar-item' + (isActive ? ' active' : '') + '" data-app="' + item.id + '">';
            html += '<span class="sidebar-item-icon">' + item.icon + '</span>';
            html += '<span class="sidebar-item-label">' + item.label + '</span>';
            html += badge;
            html += '</div>';
        });
        html += '</div>';
    });

    nav.innerHTML = html;
    updateSidebarProfile();

    nav.querySelectorAll('[data-app]').forEach(el => {
        el.addEventListener('click', () => {
            openApp(el.dataset.app);
        });
    });

    applySidebarState();
}

function updateSidebarProfile() {
    if (!CA) return;
    let cover = document.getElementById('sidebar-profile-cover');
    let avatar = document.getElementById('sidebar-profile-avatar');
    let name = document.getElementById('sidebar-profile-name');
    let role = document.getElementById('sidebar-profile-role');

    if (cover) cover.innerHTML = CA.cover_url ? '<img src="' + CA.cover_url + '">' : '';
    if (avatar) avatar.innerHTML = CA.avatar_url ? '<img src="' + CA.avatar_url + '">' : '🕶️';
    if (name) name.textContent = CA.name || '---';
    if (role) role.textContent = CA.role === 'admin' ? 'АДМИНИСТРАТОР' : CA.role === 'moderator' ? 'МОДЕРАТОР' : 'АГЕНТ';
}

function applySidebarState() {
    let layout = document.getElementById('main-layout');
    let sidebar = document.getElementById('left-sidebar');
    let btn = document.getElementById('toggle-sidebar-btn');
    if (!layout || !sidebar) return;
    if (sidebarCollapsed) {
        layout.classList.add('sidebar-collapsed');
        sidebar.classList.add('sidebar-collapsed');
        if (btn) btn.textContent = '[ ► РАЗВЕРНУТЬ ]';
    } else {
        layout.classList.remove('sidebar-collapsed');
        sidebar.classList.remove('sidebar-collapsed');
        if (btn) btn.textContent = '[ ◄ СВЕРНУТЬ ]';
    }
}

function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('syndicate_sidebar_collapsed', sidebarCollapsed);
    applySidebarState();
}

// ============================================================
// МОБИЛЬНАЯ НАВИГАЦИЯ
// ============================================================
function buildMobileNav() {
    let nav = document.getElementById('mobile-nav-inner');
    if (!nav) return;
    let items = [
        { id: 'chat', icon: '💬', label: 'ЧАТ' },
        { id: 'contacts', icon: '🌐', label: 'СЕТЬ' },
        { id: 'profile', icon: '👤', label: 'ПРОФИЛЬ' },
        { id: 'shop', icon: '🛒', label: 'МАГАЗИН' },
        { id: 'settings', icon: '⚙️', label: 'НАСТРОЙКИ' }
    ];
    nav.innerHTML = items.map(i => {
        let badge = '';
        if (i.id === 'chat' && (unreadMentions.chat + unreadMentions.clan) > 0) {
            badge = '<span class="mobile-nav-badge">' + (unreadMentions.chat + unreadMentions.clan) + '</span>';
        }
        return '<button class="mobile-nav-btn" data-app="' + i.id + '">' + badge + '<span class="mobile-nav-icon">' + i.icon + '</span><span>' + i.label + '</span></button>';
    }).join('');
    nav.querySelectorAll('[data-app]').forEach(el => {
        el.addEventListener('click', () => {
            let id = el.dataset.app;
            nav.querySelectorAll('[data-app]').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            if (id === 'profile') { openOwnProfile(); return; }
            openApp(id);
        });
    });
}

// ============================================================
// ПРАВЫЙ SIDEBAR (с эффектами из кэша)
// ============================================================
async function renderRightPanel() {
    let online = document.getElementById('online-list');
    if (online) {
        let agents = await getAgents();
        let now = Date.now();
        let onlineAgents = Object.entries(agents)
            .filter(([n, d]) => n !== 'W-C26' && d.last_seen && (now - new Date(d.last_seen).getTime()) < 300000)
            .slice(0, 12);
        if (onlineAgents.length === 0) {
            online.innerHTML = '<div style="color:var(--text-3);font-size:0.75rem;padding:6px;">НЕТ АГЕНТОВ</div>';
        } else {
            online.innerHTML = onlineAgents.map(([name, d]) => {
                let av = d.avatar_url ? '<img src="' + d.avatar_url + '">' : '🕶️';
                // NEW: эффекты
                let colorCls = d.active_color ? getActiveColorClassForId(d.active_color) : '';
                let frameCls = 'f-default';
                if (d.active_frame && shopItems.frames) {
                    let f = shopItems.frames.find(x => x.id === d.active_frame);
                    if (f) frameCls = f.cssClass || 'f-default';
                }
                let badgeHtml = '';
                if (d.active_badge && d.active_badge !== 'b_none' && shopItems.badges) {
                    let b = shopItems.badges.find(x => x.id === d.active_badge);
                    if (b && b.image) badgeHtml = '<img src="' + b.image + '" style="width:14px;height:14px;vertical-align:middle;">';
                    else if (b && b.emoji) badgeHtml = '<span style="font-size:0.85rem;">' + b.emoji + '</span>';
                }
                return '<div class="online-item" data-show-agent="' + name + '">' +
                    '<div class="online-avatar ' + frameCls + '">' + av + '</div>' +
                    '<div class="online-name ' + colorCls + '">' + name + '</div>' + badgeHtml +
                    '<div class="online-dot"></div></div>';
            }).join('');
            online.querySelectorAll('[data-show-agent]').forEach(el => {
                el.addEventListener('click', () => showAgentInfo(el.dataset.showAgent));
            });
        }
    }

    let topClans = document.getElementById('top-clans');
    if (topClans) {
        await loadClans();
        let sorted = [...clans].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
        if (sorted.length === 0) {
            topClans.innerHTML = '<div style="color:var(--text-3);font-size:0.75rem;padding:6px;">НЕТ ОТРЯДОВ</div>';
        } else {
            topClans.innerHTML = sorted.map((cl, i) =>
                '<div class="top-clan-item">' +
                '<span class="top-clan-rank">#' + (i + 1) + '</span>' +
                '<span class="top-clan-name">' + cl.emoji + ' ' + cl.name + '</span>' +
                '<span class="top-clan-rating">' + (cl.rating || 0) + '</span></div>'
            ).join('');
        }
    }

    let announceMini = document.getElementById('announce-mini');
    if (announceMini) {
        let { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(4);
        if (!data || data.length === 0) {
            announceMini.innerHTML = '<div style="color:var(--text-3);font-size:0.75rem;padding:6px;">НЕТ ОБЪЯВЛЕНИЙ</div>';
        } else {
            announceMini.innerHTML = data.map(a =>
                '<div class="announce-mini" data-announce-id="' + a.id + '">' +
                '<div>' + (a.title || '').substring(0, 60) + '</div>' +
                '<div class="announce-mini-time">' + timeAgo(a.created_at) + '</div></div>'
            ).join('');
        }
    }
}

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

    // Хэштег из профиля
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

    let fbtn = document.getElementById('floating-create-post');
    if (fbtn) { fbtn.style.display = 'block'; fbtn.onclick = () => window.showCreatePost(); }
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
    let avatarHtml = CA.avatar_url ? '<img src="' + CA.avatar_url + '">' : '🕶️';
    let coverHtml = CA.cover_url ? '<img src="' + CA.cover_url + '">' : '';
    let clanName = '';
    let myClan = clans.find(c => c.members && c.members.some(m => m.name === CA.name));
    if (myClan) clanName = ' · ' + myClan.emoji + ' ' + myClan.name;

    let roleMap = { admin: '👑 АДМИНИСТРАТОР', moderator: '🛡 МОДЕРАТОР', agent: '🎯 АГЕНТ' };
    let roleText = roleMap[CA.role] || '🎯 АГЕНТ';
    let nameClass = CA.active_color ? getActiveColorClassForId(CA.active_color) : '';
    let badgeHtml = getActiveBadgeEmoji();

    return '<div class="feed-profile-block">' +   // REMOVED matrix-bg
        '<div class="feed-profile-cover">' + coverHtml + '</div>' +
        '<div class="feed-profile-main">' +
        '<div class="feed-profile-avatar">' + avatarHtml + '</div>' +
        '<div class="feed-profile-info">' +
        '<div class="feed-profile-name"><span class="' + nameClass + '">' + CA.name + '</span>' + badgeHtml + '</div>' +
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
            let q = supabase.from('profile_posts').select('*').order('created_at', { ascending: false }).limit(30);
            if (currentFeedFilter === 'mine' && CA) q = q.eq('author', CA.name);
            let { data: posts } = await q;
            if (posts) posts.forEach(p => all.push({ type: 'post', data: p, time: p.created_at, likes: p.likes || 0 }));
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

getAgents().then(a => { feedAgentsCache = a; });

function renderAnnounceCard(a) {
    let typeLabels = { news: '📰 НОВОСТЬ', event: '🎯 ИВЕНТ', auction: '💰 АУКЦИОН', update: '⚡ ОБНОВЛЕНИЕ', wanted: '🔍 РОЗЫСК' };
    let titleHtml = a.title ? linkifyHashtags(escapeHtml(a.title)) : '';
    let textHtml = a.text ? linkifyHashtags(escapeHtml(a.text)).replace(/\n/g, '<br>') : '';
    return '<div class="card" style="border-left-color:var(--accent);">' +
        '<div class="card-header">' +
        '<div class="card-avatar" style="background:var(--accent-dim);color:var(--accent);">📢</div>' +
        '<div class="card-author-block">' +
        '<div class="card-author">' + escapeHtml(a.author) + '</div>' +
        '<div class="card-meta"><span class="role">' + (typeLabels[a.type] || '📰') + '</span><span class="card-time">' + timeAgo(a.created_at) + '</span></div>' +
        '</div></div>' +
        (titleHtml ? '<div class="card-title">' + titleHtml + '</div>' : '') +
        (textHtml ? '<div class="card-text">' + textHtml + '</div>' : '') +
        '</div>';
}

function renderMemeCard(m) {
    let avatarHtml = m.avatar_url ? '<img src="' + m.avatar_url + '">' : '😂';
    let imgHtml = m.image_url ? '<img src="' + m.image_url + '" style="max-width:100%;max-height:400px;border:1px solid var(--border-2);margin-top:8px;display:block;" onerror="this.style.display=\'none\'">' : '';
    let titleHtml = m.title ? linkifyHashtags(escapeHtml(m.title)) : '';
    let textHtml = m.text ? linkifyHashtags(escapeHtml(m.text)).replace(/\n/g, '<br>') : '';
    return '<div class="card">' +
        '<div class="card-header">' +
        '<div class="card-avatar" data-show-agent="' + escapeHtml(m.author) + '">' + avatarHtml + '</div>' +
        '<div class="card-author-block">' +
        '<div class="card-author" data-open-post-author="' + escapeHtml(m.author) + '">' + escapeHtml(m.author) + '</div>' +
        '<div class="card-meta"><span class="role">😂 МЕМ</span><span class="card-time">' + timeAgo(m.created_at) + '</span></div>' +
        '</div></div>' +
        (titleHtml ? '<div class="card-title">' + titleHtml + '</div>' : '') +
        (textHtml ? '<div class="card-text">' + textHtml + '</div>' : '') +
        imgHtml +
        '<div class="card-actions"><span class="card-action">❤ ' + (m.likes || 0) + '</span></div></div>';
}

function openFeed() {
    currentView = 'feed';
    document.querySelectorAll('.app-screen').forEach(a => { a.classList.remove('show'); setTimeout(() => a.style.display = 'none', 150); });
    document.getElementById('center-content').style.display = '';
    document.getElementById('floating-create-post').style.display = 'block';
    document.querySelectorAll('[data-app]').forEach(el => el.classList.remove('active'));
    feedAgentsCache = null;
    feedOriginalsCache = null;
    getAgents().then(a => { feedAgentsCache = a; });
    renderFeed();
}

function openOwnProfile() { if (CA) showAgentInfo(CA.name); }

// ============================================================
// ОТКРЫТИЕ ПРИЛОЖЕНИЙ
// ============================================================
function openApp(id) {
    playSound('open');
    currentView = id;
    let map = {
        chat: 'app-chat', dm: 'app-dm', shop: 'app-shop', inventory: 'app-inventory',
        clans: 'app-clans', friends: 'app-friends', achievements: 'app-achievements',
        guides: 'app-guides', memes: 'app-memes', contacts: 'app-contacts',
        admin: 'app-admin', logs: 'app-logs', announce: 'app-announce',
        settings: 'app-settings', rp: 'app-rp', 'rp-community': 'app-rp-community',
        'rp-scene': 'app-rp-scene'
    };
    let el = document.getElementById(map[id]);
    if (!el) return;
    document.getElementById('center-content').style.display = 'none';
    document.getElementById('floating-create-post').style.display = 'none';
    el.style.display = 'flex';
    setTimeout(() => el.classList.add('show'), 10);

    document.querySelectorAll('.sidebar-item').forEach(x => x.classList.remove('active'));
    let navItem = document.querySelector('.sidebar-item[data-app="' + id + '"]');
    if (navItem) navItem.classList.add('active');

    if (id === 'chat') {
        unreadMentions.chat = 0; unreadMentions.clan = 0;
        updateBadgeIcons(); buildSidebar(); switchChatTab('general');
        stopGlowIcon('icon-chat'); loadChatMessages();
    }
    if (id === 'dm') { unreadMentions.dm = 0; updateBadgeIcons(); buildSidebar(); loadDMMessages(); }
    if (id === 'contacts') { if (typeof initWebGraph === 'function') initWebGraph(); }
    if (id === 'achievements') renderAchievementsUI();
    if (id === 'guides') { loadGuides().then(() => renderGuides()); }
    if (id === 'memes') { loadMemes().then(() => renderMemes()); }
    if (id === 'admin') renderAdminPanel();
    if (id === 'logs') renderLogs();
    if (id === 'shop') renderShop();
    if (id === 'inventory') renderInventory();
    if (id === 'clans') { loadClans().then(() => loadClanWars().then(() => renderClans())); }
    if (id === 'friends') { loadFriends().then(() => renderFriends()); }
    if (id === 'announce') { loadAnnouncements().then(() => renderAnnounceApp()); }
    if (id === 'rp') {
        loadSavedRpChar();
        loadRpCharacters().then(() => {
            updateRpCurrentChar();
            loadRpMessages('space-x');
            subscribeRpChat('space-x');
        });
    }
    if (id === 'rp-community') loadRpScenes().then(() => renderRpScenes());
    if (id === 'rp-scene') { /* логика в openSceneChat */ }

    if (CA) { CA.crystals = (CA.crystals || 0) + 2; updateTopbar(); saveAgent(); }
}
window.openApp = openApp;

function closeApp(id) {
    playSound('close');
    let map = {
        chat: 'app-chat', dm: 'app-dm', shop: 'app-shop', inventory: 'app-inventory',
        clans: 'app-clans', friends: 'app-friends', achievements: 'app-achievements',
        guides: 'app-guides', memes: 'app-memes', contacts: 'app-contacts',
        admin: 'app-admin', logs: 'app-logs', announce: 'app-announce',
        settings: 'app-settings', rp: 'app-rp', 'rp-community': 'app-rp-community',
        'rp-scene': 'app-rp-scene'
    };
    let el = document.getElementById(map[id]);
    if (el) {
        if (id === 'contacts' && typeof destroyWebGraph === 'function') destroyWebGraph();
        if (id === 'rp-scene' && typeof closeSceneChat === 'function') closeSceneChat();
        el.classList.remove('show');
        setTimeout(() => {
            el.style.display = 'none';
            document.getElementById('center-content').style.display = '';
            document.getElementById('floating-create-post').style.display = 'block';
        }, 150);
    }
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
        return '<div class="card" style="padding:10px;margin-bottom:6px;cursor:pointer;" data-char-pick="' + c.id + '">' +
            '<div style="display:flex;gap:10px;align-items:center;">' +
            '<div class="card-avatar">' + av + '</div>' +
            '<div style="flex:1;"><div style="font-weight:600;">' + escapeHtml(c.name) + '</div>' +
            '<div class="card-meta">' + escapeHtml(c.role || '') + '</div></div>' +
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
            // NEW: персональная модалка
            confirmDialog('УДАЛИТЬ ПЕРСОНАЖА', 'Удалить персонажа «' + (ch ? ch.name : '?') + '»? Это действие нельзя отменить.', async () => {
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
    let id = document.getElementById('rp-char-id').value;
    let name = document.getElementById('rp-char-name').value.trim();
    if (!name) return notif('⛔ ВВЕДИ ИМЯ');
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
                    ctx.drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, 256, 256);
                    canvas.toBlob(async blob => {
                        let safeName = translit(CA.name).replace(/[^a-zA-Z0-9_-]/g, '_');
                        let fn = 'rp_' + safeName + '_' + Date.now() + '.png';
                        let { error } = await supabase.storage.from('avatars').upload(fn, blob, { upsert: true, contentType: 'image/png' });
                        if (error) { r(''); return; }
                        let { data } = await supabase.storage.from('avatars').getPublicUrl(fn);
                        r(data.publicUrl);
                    }, 'image/png');
                };
                img.src = e.target.result;
            };
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
    let popup = document.createElement('div');
    popup.className = 'modal-overlay show';
    popup.style.display = 'flex';
    popup.id = 'modal-auto-clan';
    popup.innerHTML = '<div class="modal-box">' +
        '<div class="modal-title">' + cl.emoji + ' ' + escapeHtml(cl.name) + ' [' + cl.tag + ']</div>' +
        '<div style="color:var(--text-2);margin-bottom:12px;font-size:0.85rem;">' + escapeHtml(cl.description || '') + '</div>' +
        '<div style="color:var(--text-3);font-size:0.8rem;">👑 ' + escapeHtml(cl.leader) + ' · 💰 ' + (cl.treasury || 0) + ' ТК · ⭐ ' + (cl.rating || 0) + '</div>' +
        '<div style="margin-top:12px;font-size:0.8rem;">Участники: ' + (cl.members || []).map(m => escapeHtml(m.name)).join(', ') + '</div>' +
        (cl.members && !cl.members.find(m => m.name === CA?.name) && !clans.some(c => c.members?.some(m => m.name === CA?.name)) ? '<button class="btn full mt-16" id="join-clan-btn-' + cl.id + '">' + (cl.join_type === 'request' ? '📩 ОТПРАВИТЬ ЗАЯВКУ' : '✅ ВСТУПИТЬ') + '</button>' : '') +
        '<div style="margin-top:16px;text-align:right;"><button class="modal-btn secondary" data-close-modal="modal-auto-clan">ЗАКРЫТЬ</button></div>' +
        '</div>';
    document.body.appendChild(popup);
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
    setTimeout(() => { if (typeof openSceneChat === 'function') openSceneChat(sceneId); }, 100);
};

// ============================================================
// ЭМОДЗИ
// ============================================================
function toggleChatEmoji() {
    let grid = document.getElementById('chat-emoji-grid');
    if (!grid) return;
    let emojis = ['😀','😂','🤣','😎','🤩','🥳','😇','🤠','👻','💀','🤡','👽','🤖','👾','👑','🔥','⚡','💣','🗝️','🔑','💉','🧬','🧪','🛡️','⚔️','🗡️','🏹','🔫','🧨','🪓','🔧','🔨','⛏️','🦊','🐺','🐉','🐲','🦅','🦉','🦇','🐍','🦎','🐙','🦑','🦈','🦂','🕷️','🌑','🌕','🌙','✨','💫','☄️','🌌','🪐','🔮','🧿','🕯️','☠️','👁️','🧠','🦾','🦿','🩸','💊','⚙️','⛓️','📡','🖥️','🎲','🎯','🎰','♠️','♦️','♣️','🃏','🀄','🎴','🪙','🏆','🥇','👍','❤','💯'];
    grid.innerHTML = emojis.map(e => '<span style="font-size:1.4rem;padding:5px;text-align:center;cursor:pointer;border:1px solid transparent;transition:all 0.15s;" data-emoji="' + e + '">' + e + '</span>').join('');
    setTimeout(() => {
        document.querySelectorAll('#chat-emoji-grid [data-emoji]').forEach(c => {
            c.onmouseenter = () => c.style.borderColor = 'var(--accent)';
            c.onmouseleave = () => c.style.borderColor = 'transparent';
            c.onclick = function() {
                let targetId = document.activeElement?.id || 'chat-input';
                let inp = document.getElementById(targetId);
                if (inp) inp.value += this.dataset.emoji;
                playSound('send');
            };
        });
    }, 10);
    let el = document.getElementById('modal-chat-emoji');
    el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
}

window.replyToDMMessage = function(msgId, author, text) {
    let inp = document.getElementById('dm-input');
    if (inp) { inp.value = '@' + author + ' '; inp.focus(); }
    notif('↩ ОТВЕТ ДЛЯ ' + author);
};
window.cancelDmReply = function() { let ri = document.getElementById('dm-reply-indicator'); if (ri) ri.style.display = 'none'; };
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
// ДОСЬЕ / ОТКРЫТИЕ РАБОЧЕГО СТОЛА
// ============================================================
function openDesktop() {
    document.getElementById('desktop').style.display = 'flex';
    buildSidebar();
    buildMobileNav();
    startClock();
    updateTopbar();
    openFeed();
    renderRightPanel();
    checkCompletedWars();
    autoDistributeTreasury();
    console.log('[MAIN] Рабочий стол открыт');
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[MAIN] DOMContentLoaded сработал');

    document.getElementById('login-btn')?.addEventListener('click', async () => {
        try {
            let r = await login();
            if (r && r.CA) {
                document.getElementById('login-screen').style.display = 'none';
                openDesktop();
                startBgMusic();
                subscribeChat(); subscribeDM(); subscribeAdminChat();
                loadChatMessages(); loadDMMessages();
                loadGuides(); loadMemes(); loadAnnouncements();
                loadClans(); loadClanWars(); loadFriends();
                loadMentionAgents(); checkAchievements();
                if (CA.role === 'admin' || CA.role === 'moderator') {
                    let ab = document.getElementById('admin-tab-btn');
                    if (ab) ab.classList.remove('hidden');
                }
                renderRightPanel();
            }
        } catch (e) { console.error('[LOGIN] Ошибка:', e); notif('⛔ Ошибка: ' + e.message); }
    });
    document.getElementById('agent-pass')?.addEventListener('keypress', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });

    document.getElementById('register-link')?.addEventListener('click', async () => {
        try {
            let r = await register();
            if (r && r.CA) {
                document.getElementById('login-screen').style.display = 'none';
                openDesktop();
                startBgMusic();
                subscribeChat(); subscribeDM();
                loadChatMessages(); loadDMMessages();
                loadAnnouncements(); loadClans(); loadClanWars();
                loadFriends(); loadMentionAgents(); checkAchievements();
                renderRightPanel();
            }
        } catch (e) { console.error('[REGISTER] Ошибка:', e); }
    });

    document.getElementById('error-btn')?.addEventListener('click', () => recoverSystem(() => { document.getElementById('login-screen').style.display = 'flex'; }));

    document.getElementById('toggle-sidebar-btn')?.addEventListener('click', toggleSidebar);
    document.getElementById('topbar-logo')?.addEventListener('click', openFeed);
    document.getElementById('sidebar-profile')?.addEventListener('click', openOwnProfile);

    // Настройки
    document.getElementById('change-name-btn')?.addEventListener('click', () => { document.getElementById('new-name').value = CA?.name || ''; let el = document.getElementById('modal-name'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('change-pass-btn')?.addEventListener('click', () => { document.getElementById('old-pass').value = ''; document.getElementById('new-pass').value = ''; let el = document.getElementById('modal-password'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('change-avatar-btn')?.addEventListener('click', () => { document.getElementById('avatar-file-input').value = ''; let el = document.getElementById('modal-avatar'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('change-cover-btn')?.addEventListener('click', () => window.changeCover());
    document.getElementById('toggle-sound-btn')?.addEventListener('click', () => { toggleSound(); notif(getSoundEnabled() ? '🔊 ВКЛ' : '🔇 ВЫКЛ'); });
    document.getElementById('toggle-music-btn')?.addEventListener('click', () => { let on = toggleMusic(); notif(on ? '🎵 ВКЛ' : '🎵 ВЫКЛ'); });
    document.getElementById('next-track-btn')?.addEventListener('click', () => { nextBgTrack(); notif('⏭ СЛЕДУЮЩИЙ ТРЕК'); });
    document.getElementById('save-name-btn')?.addEventListener('click', async () => { let nn = document.getElementById('new-name').value.trim(); if (!nn) return; let r = await changeName(nn); if (r.success) { closeModal('modal-name'); buildSidebar(); renderFeed(); updateSidebarProfile(); } else notif(r.error); });
    document.getElementById('save-pass-btn')?.addEventListener('click', async () => { let r = await changePassword(document.getElementById('old-pass').value, document.getElementById('new-pass').value); if (r.success) closeModal('modal-password'); else notif(r.error); });
    document.getElementById('upload-avatar-btn')?.addEventListener('click', async () => { let f = document.getElementById('avatar-file-input')?.files[0]; if (!f) return notif('⛔ ВЫБЕРИ ФАЙЛ'); let r = await changeAvatar(f); if (r.success) { closeModal('modal-avatar'); updateSidebarProfile(); renderFeed(); } else notif(r.error || 'ОШИБКА'); });

    // Чаты
    document.querySelector('.send-msg-btn')?.addEventListener('click', e => { e.stopPropagation(); if (isClanChatActive()) sendClanMessage(); else sendMessage(); });
    document.querySelector('.send-dm-btn')?.addEventListener('click', e => { e.stopPropagation(); sendDM(); });
    document.getElementById('rp-send-btn')?.addEventListener('click', sendRpMessage);
    document.getElementById('rp-scene-send-btn')?.addEventListener('click', sendSceneMessage);
    document.querySelectorAll('.chat-tab[data-tab]').forEach(tab => tab.addEventListener('click', function() { switchChatTab(this.dataset.tab); }));
    document.getElementById('chat-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji(); });
    document.getElementById('dm-emoji-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleChatEmoji(); });
    document.getElementById('guide-emoji-btn')?.addEventListener('click', toggleChatEmoji);
    document.getElementById('chat-file-btn')?.addEventListener('click', () => { document.getElementById('chat-file-input').click(); });
    document.getElementById('dm-file-btn')?.addEventListener('click', () => { document.getElementById('dm-file-input').click(); });
    document.getElementById('guide-file-btn')?.addEventListener('click', () => { document.getElementById('guide-file-input').click(); });
    document.getElementById('chat-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'chat-input'));
    document.getElementById('dm-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'dm-input'));
    document.getElementById('guide-file-input')?.addEventListener('change', e => uploadFileAndInsert(e, 'guide-text'));

    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (document.activeElement === document.getElementById('chat-input')) { e.preventDefault(); if (isClanChatActive()) sendClanMessage(); else sendMessage(); }
            if (document.activeElement === document.getElementById('dm-input')) { e.preventDefault(); sendDM(); }
            if (document.activeElement === document.getElementById('rp-input')) { e.preventDefault(); sendRpMessage(); }
            if (document.activeElement === document.getElementById('rp-scene-input')) { e.preventDefault(); sendSceneMessage(); }
        }
    });
    document.addEventListener('input', e => {
        if (e.target.id === 'chat-input') showMentionSuggestions('chat-input');
        if (e.target.id === 'dm-input') showMentionSuggestions('dm-input');
    });

    // Гайды
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

    // Мемы
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

    // Объявления
    document.getElementById('create-announce-submit-btn')?.addEventListener('click', async () => {
        let t = document.getElementById('new-announce-title').value.trim(), x = document.getElementById('new-announce-text').value.trim(), ty = document.getElementById('new-announce-type').value;
        if (!t || !x) return notif('⛔ ЗАПОЛНИ');
        let r = await createAnnouncement(t, x, ty);
        if (r.success) { playSound('send'); closeModal('modal-announce'); loadAnnouncements().then(renderAnnounceApp); }
    });

    // Посты
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

    // Отряды
    document.getElementById('submit-create-clan')?.addEventListener('click', async () => {
        let name = document.getElementById('clan-name').value.trim(), tag = document.getElementById('clan-tag').value.trim();
        if (!name || !tag) return notif('⛔ ЗАПОЛНИ');
        let r = await createClan(name, tag, document.getElementById('clan-emoji').value, document.getElementById('clan-desc').value.trim(), document.getElementById('clan-join-type').value);
        if (r.success) { playSound('send'); closeModal('modal-create-clan'); loadClans().then(renderClans); checkAchievements(); unlockAchievement('clan_creator'); }
        else notif(r.error);
    });

    // РП
    document.getElementById('rp-choose-char-btn')?.addEventListener('click', () => { renderRpCharsList(); let el = document.getElementById('modal-rp-chars'); el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10); });
    document.getElementById('rp-create-char-btn')?.addEventListener('click', () => openCharCreateModal());
    document.getElementById('rp-save-char-btn')?.addEventListener('click', saveRpChar);
    document.getElementById('create-scene-btn')?.addEventListener('click', () => {
        if (!requireCharacter()) return;
        document.getElementById('scene-modal-title').textContent = 'НОВЫЙ СПЕКТАКЛЬ';
        document.getElementById('scene-title').value = '';
        document.getElementById('scene-desc').value = '';
        document.getElementById('scene-covers').value = '';
        document.getElementById('scene-covers-preview').innerHTML = '';
        let btn = document.getElementById('submit-scene-btn');
        delete btn.dataset.editingScene;
        btn.textContent = 'СОЗДАТЬ';
        let el = document.getElementById('modal-scene-create');
        el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
    });
    document.getElementById('scene-covers')?.addEventListener('change', function() {
        let files = Array.from(this.files || []).slice(0, 5);
        let preview = document.getElementById('scene-covers-preview');
        if (!preview) return;
        preview.innerHTML = '';
        files.forEach(f => {
            let r = new FileReader();
            r.onload = e => {
                let img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width:60px;height:40px;object-fit:cover;border:1px solid var(--accent-dark);border-radius:3px;';
                preview.appendChild(img);
            };
            r.readAsDataURL(f);
        });
    });
    document.getElementById('submit-scene-btn')?.addEventListener('click', async function() {
        let t = document.getElementById('scene-title').value.trim(), d = document.getElementById('scene-desc').value.trim();
        if (!t) return notif('⛔ ВВЕДИ НАЗВАНИЕ');
        let coverFiles = Array.from(document.getElementById('scene-covers')?.files || []);
        let editId = this.dataset.editingScene;
        let r;
        if (editId) r = await editRpScene(parseInt(editId), t, d, coverFiles);
        else r = await createRpScene(t, d, coverFiles);
        if (r.success) {
            playSound('send');
            closeModal('modal-scene-create');
            loadRpScenes().then(renderRpScenes);
        } else notif('⛔ ' + r.error);
    });

    // Закрытие приложений
    document.querySelectorAll('.app-close[data-close]').forEach(btn => btn.addEventListener('click', function() { closeApp(this.dataset.close); }));

    // ДЕЛЕГИРОВАНИЕ
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
        if (rdb) { let fn = window.replyToDMMessage; if (typeof fn === 'function') fn(rdb.dataset.replyDm, rdb.dataset.replyAuthor, rdb.dataset.replyText); return; }
        let rrp = e.target.closest('[data-reply-rp]');
        if (rrp) { replyToRpMessage(parseInt(rrp.dataset.replyRp), rrp.dataset.replyCharName, rrp.dataset.replyText); return; }
        let rsc = e.target.closest('[data-reply-scene]');
        if (rsc) { replyToSceneMessage(parseInt(rsc.dataset.replyScene), rsc.dataset.replyCharName, rsc.dataset.replyText); return; }
        let rad = e.target.closest('[data-reply-admin]');
        if (rad) { let inp = document.getElementById('chat-input'); if (inp) { inp.value = '@' + rad.dataset.replyAuthor + ' '; inp.focus(); } notif('↩ ОТВЕТ ДЛЯ ' + rad.dataset.replyAuthor); return; }

        let dmb = e.target.closest('[data-delete-dm-msg]');
        if (dmb) { supabase.from('dm_messages').delete().eq('id', parseInt(dmb.dataset.deleteDmMsg)).then(() => loadDMMessages()); return; }
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

        // NEW: спектакли — редактирование/удаление
        let editSceneBtn = e.target.closest('[data-edit-scene]');
        if (editSceneBtn) {
            let id = parseInt(editSceneBtn.dataset.editScene);
            let scene = (window.__rpScenes || []).find(s => s.id === id);
            if (!scene) return;
            (async () => {
                let { loadSceneCovers } = await import('./rp.js');
                let covers = await loadSceneCovers(id);
                document.getElementById('scene-modal-title').textContent = '✏️ РЕДАКТИРОВАТЬ СПЕКТАКЛЬ';
                document.getElementById('scene-title').value = scene.title || '';
                document.getElementById('scene-desc').value = scene.description || '';
                document.getElementById('scene-covers').value = '';
                let preview = document.getElementById('scene-covers-preview');
                preview.innerHTML = '';
                if (covers.length > 0) {
                    covers.forEach(c => {
                        let img = document.createElement('img');
                        img.src = c.image_url;
                        img.style.cssText = 'width:60px;height:40px;object-fit:cover;border:1px solid var(--accent-dark);border-radius:3px;';
                        preview.appendChild(img);
                    });
                }
                let btn = document.getElementById('submit-scene-btn');
                btn.dataset.editingScene = id;
                btn.textContent = 'СОХРАНИТЬ';
                let el = document.getElementById('modal-scene-create');
                el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
            })();
            return;
        }
        let delSceneBtn = e.target.closest('[data-delete-scene]');
        if (delSceneBtn) {
            let id = parseInt(delSceneBtn.dataset.deleteScene);
            let scene = (window.__rpScenes || []).find(s => s.id === id);
            confirmDialog('УДАЛИТЬ СПЕКТАКЛЬ', 'Удалить «' + (scene ? scene.title : '?') + '»? Все сообщения и обложки будут удалены.', async () => {
                let r = await deleteRpScene(id);
                if (r.success) { notif('🗑 Спектакль удалён'); loadRpScenes().then(renderRpScenes); }
                else notif('⛔ ' + r.error);
            });
            return;
        }

        if (!e.target.closest('#mention-suggestions') && !e.target.closest('.chat-input')) hideMentionSuggestions();
        if (!e.target.closest('.chat-menu-wrap')) document.querySelectorAll('.chat-menu-dropdown.open').forEach(d => d.classList.remove('open'));
    });

    setInterval(() => { if (CA) { saveAgent(); updateTopbar(); } }, 60000);
    setInterval(() => { if (CA && document.visibilityState === 'visible') supabase.from('agents').update({ last_seen: new Date().toISOString() }).eq('name', CA.name); }, 30000);
    setInterval(updateDiscountDisplay, 60000);
    setInterval(() => { if (CA && currentView === 'feed') renderRightPanel(); }, 60000);

    console.log('✅ ТЕРМИНАЛ 2.5.1 ЗАГРУЖЕН');
});