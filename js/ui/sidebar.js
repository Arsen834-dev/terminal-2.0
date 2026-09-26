// ============================================================
// UI / SIDEBAR + MOBILE NAV + DRAWER
// v2.0.0: добавлен мобильный drawer
// ============================================================

import { CA } from '../auth.js';
import { unreadMentions } from '../chat.js';
import { getState } from './state.js';

export const SIDEBAR_STRUCTURE = [
    { title: 'ОСНОВНОЕ', items: [
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

export const MOBILE_NAV_ITEMS = [
    { id: 'chat', icon: '💬', label: 'ЧАТ' },
    { id: 'clans', icon: '⚔️', label: 'ОТРЯДЫ' },
    { id: '__menu__', icon: '☰', label: 'МЕНЮ' },
    { id: 'shop', icon: '🛒', label: 'МАГАЗИН' },
    { id: 'rp', icon: '🎭', label: 'РП' }
];

let onOpenApp = null;
let onOpenProfile = null;

export function setSidebarHandlers(handlers) {
    if (handlers.onOpen) onOpenApp = handlers.onOpen;
    if (handlers.onOpenProfile) onOpenProfile = handlers.onOpenProfile;
}

// ============================================================
// BUILD SIDEBAR
// ============================================================
export function buildSidebar() {
    let nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    let st = getState();
    let isAdmin = CA && (CA.role === 'admin' || CA.role === 'moderator');

    if (nav.dataset.built === '1' && nav.dataset.role === (isAdmin ? 'admin' : 'user')) {
        updateSidebarBadges();
        return;
    }

    let html = '';
    SIDEBAR_STRUCTURE.forEach(group => {
        if (group.adminOnly && !isAdmin) return;
        html += '<div class="sidebar-group">';
        html += '<div class="sidebar-group-title">' + group.title + '</div>';
        group.items.forEach(item => {
            let isActive = (item.id === st.currentView);
            html += '<div class="sidebar-item' + (isActive ? ' active' : '') + '" data-app="' + item.id + '">';
            html += '<span class="sidebar-item-icon">' + item.icon + '</span>';
            html += '<span class="sidebar-item-label">' + item.label + '</span>';
            html += '<span class="sidebar-item-badge" data-badge-for="' + item.id + '" style="display:none;"></span>';
            html += '<span class="sidebar-item-new-dot" data-dot-for="' + item.id + '" style="display:none;"></span>';
            html += '</div>';
        });
        html += '</div>';
    });
    nav.innerHTML = html;
    nav.dataset.built = '1';
    nav.dataset.role = isAdmin ? 'admin' : 'user';

    updateSidebarProfile();

    nav.querySelectorAll('[data-app]').forEach(el => {
        el.addEventListener('click', () => { if (onOpenApp) onOpenApp(el.dataset.app); });
    });

    updateSidebarBadges();
    applySidebarState();
}

export function updateSidebarBadges() {
    let nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    let st = getState();

    nav.querySelectorAll('[data-badge-for]').forEach(el => {
        let id = el.dataset.badgeFor;
        let count = 0;
        if (id === 'chat') count = (unreadMentions.chat || 0) + (unreadMentions.clan || 0);
        if (id === 'dm') count = unreadMentions.dm || 0;
        if (count > 0) {
            el.textContent = count;
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    nav.querySelectorAll('[data-dot-for]').forEach(el => {
        let id = el.dataset.dotFor;
        el.style.display = st.newContentFlags[id] ? '' : 'none';
    });

    nav.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.toggle('active', el.dataset.app === st.currentView);
    });
}

export function updateSidebarProfile() {
    if (!CA) return;
    let cover = document.getElementById('sidebar-profile-cover');
    let avatar = document.getElementById('sidebar-profile-avatar');
    let name = document.getElementById('sidebar-profile-name');
    let role = document.getElementById('sidebar-profile-role');
    if (cover) cover.innerHTML = CA.cover_url ? '<img src="' + CA.cover_url + '">' : '';
    if (avatar) avatar.innerHTML = CA.avatar_url ? '<img src="' + CA.avatar_url + '">' : '🕶️';
    if (name) name.textContent = CA.name || '---';
    if (role) role.textContent = CA.role === 'admin' ? 'АДМИНИСТРАТОР'
                              : CA.role === 'moderator' ? 'МОДЕРАТОР' : 'АГЕНТ';
}

export function applySidebarState() {
    let st = getState();
    let layout = document.getElementById('main-layout');
    let sidebar = document.getElementById('left-sidebar');
    let btn = document.getElementById('toggle-sidebar-btn');
    if (!layout || !sidebar) return;
    if (st.sidebarCollapsed) {
        layout.classList.add('sidebar-collapsed');
        sidebar.classList.add('sidebar-collapsed');
        if (btn) btn.textContent = '[ ► РАЗВЕРНУТЬ ]';
    } else {
        layout.classList.remove('sidebar-collapsed');
        sidebar.classList.remove('sidebar-collapsed');
        if (btn) btn.textContent = '[ ◄ СВЕРНУТЬ ]';
    }
}

export function toggleSidebar() {
    let st = getState();
    st.sidebarCollapsed = !st.sidebarCollapsed;
    localStorage.setItem('syndicate_sidebar_collapsed', st.sidebarCollapsed);
    applySidebarState();
}

// ============================================================
// MOBILE NAV
// ============================================================
export function buildMobileNav() {
    let nav = document.getElementById('mobile-nav-inner');
    if (!nav) return;

    nav.innerHTML = MOBILE_NAV_ITEMS.map(i => {
        let badge = '';
        if (i.id === 'chat' && ((unreadMentions.chat || 0) + (unreadMentions.clan || 0)) > 0) {
            badge = '<span class="mobile-nav-badge">' + ((unreadMentions.chat || 0) + (unreadMentions.clan || 0)) + '</span>';
        }
        let isMenu = i.id === '__menu__';
        let extraStyle = isMenu ? 'background:var(--accent-dim);color:var(--accent);' : '';
        return '<button class="mobile-nav-btn" data-app="' + i.id + '" style="' + extraStyle + '">' + badge +
            '<span class="mobile-nav-icon">' + i.icon + '</span>' +
            '<span>' + i.label + '</span></button>';
    }).join('');

    nav.querySelectorAll('[data-app]').forEach(el => {
        el.addEventListener('click', () => {
            let id = el.dataset.app;
            if (id === '__menu__') {
                openMobileDrawer();
                return;
            }
            nav.querySelectorAll('[data-app]').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            if (id === 'profile') { if (onOpenProfile) onOpenProfile(); return; }
            if (onOpenApp) onOpenApp(id);
        });
    });
}

// ============================================================
// MOBILE DRAWER
// ============================================================
export function buildMobileDrawer() {
    let nav = document.getElementById('mobile-sidebar-nav');
    if (!nav) return;
    let st = getState();
    let isAdmin = CA && (CA.role === 'admin' || CA.role === 'moderator');

    let html = '';
    SIDEBAR_STRUCTURE.forEach(group => {
        if (group.adminOnly && !isAdmin) return;
        html += '<div class="sidebar-group">';
        html += '<div class="sidebar-group-title">' + group.title + '</div>';
        group.items.forEach(item => {
            let isActive = (item.id === st.currentView);
            html += '<div class="sidebar-item' + (isActive ? ' active' : '') + '" data-mobile-app="' + item.id + '">';
            html += '<span class="sidebar-item-icon">' + item.icon + '</span>';
            html += '<span class="sidebar-item-label">' + item.label + '</span>';
            html += '</div>';
        });
        html += '</div>';
    });
    nav.innerHTML = html;

    nav.querySelectorAll('[data-mobile-app]').forEach(el => {
        el.addEventListener('click', () => {
            closeMobileDrawer();
            setTimeout(() => {
                if (onOpenApp) onOpenApp(el.dataset.mobileApp);
            }, 150);
        });
    });
}

export function openMobileDrawer() {
    buildMobileDrawer();
    let drawer = document.getElementById('mobile-drawer');
    if (drawer) {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

export function closeMobileDrawer() {
    let drawer = document.getElementById('mobile-drawer');
    if (drawer) {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

export function initMobileDrawer() {
    document.getElementById('mobile-drawer-close')?.addEventListener('click', closeMobileDrawer);
    document.getElementById('mobile-drawer-overlay')?.addEventListener('click', closeMobileDrawer);
}