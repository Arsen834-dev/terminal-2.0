// ============================================================
// UI / RIGHT PANEL — правый сайдбар
// ============================================================
// Агенты, топ-отрядов, объявления.
// Меняется иногда — когда добавляешь новые блоки.

import { supabase, getAgents } from '../auth.js';
import { loadClans, clans } from '../clans.js';
import { getAgentFx } from './renderFx.js';
import { getState } from './state.js';
import { escapeHtml, timeAgo } from '../utils.js';

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================
export async function renderRightPanel() {
    await renderAgentsBlock();
    await renderTopClansBlock();
    await renderAnnounceBlock();
}

// ============================================================
// БЛОК АГЕНТОВ
// ============================================================
async function renderAgentsBlock() {
    let online = document.getElementById('online-list');
    if (!online) return;

    let st = getState();
    let agents = await getAgents();
    let now = Date.now();
    let allAgents = Object.entries(agents).filter(([n]) => n !== 'W-C26');

    let sorted = allAgents
        .map(([name, d]) => {
            let isOnline = d.last_seen && (now - new Date(d.last_seen).getTime()) < 300000;
            return { name, data: d, isOnline };
        })
        .sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return a.name.localeCompare(b.name);
        });

    let LIMIT = 10;
    let total = sorted.length;
    let visible = st.agentsListExpanded ? sorted : sorted.slice(0, LIMIT);
    let hasMore = total > LIMIT;

    if (visible.length === 0) {
        online.innerHTML = '<div style="color:var(--text-3);font-size:0.75rem;padding:6px;">НЕТ АГЕНТОВ</div>';
        return;
    }

    let html = visible.map(({ name, data, isOnline }) => {
        let fx = getAgentFx(name, agents);
        let avatarHtml = fx.avatar
            ? '<div class="inner"><img src="' + fx.avatar + '"></div>'
            : '<div class="inner">🕶️</div>';
        let roleIcon = data.role === 'admin' ? '👑' : data.role === 'moderator' ? '🛡' : '🎯';
        let roleLabel = data.role === 'admin' ? 'Админ' : data.role === 'moderator' ? 'Модер' : 'Агент';
        let roleBadgeHtml = '';
        if (data.role === 'admin') roleBadgeHtml = '<span class="online-role-badge admin" title="Администратор">👑</span>';
        else if (data.role === 'moderator') roleBadgeHtml = '<span class="online-role-badge mod" title="Модератор">🛡</span>';

        return '<div class="online-item ' + (isOnline ? '' : 'offline') + '" data-show-agent="' + name + '">' +
            '<div class="chat-avatar-frame online-avatar ' + fx.frameCls + '">' + avatarHtml + '</div>' +
            '<div class="online-name-wrap">' +
            '<div class="online-name-row">' +
            '<span class="online-name ' + fx.colorCls + ' ' + fx.fontCls + '">' + name + '</span>' +
            fx.badgeHtml +
            '</div>' +
            '<div class="online-role-row">' + roleIcon + ' ' + roleLabel + roleBadgeHtml + '</div>' +
            '</div>' +
            '<div class="online-dot"></div>' +
            '</div>';
    }).join('');

    if (hasMore) {
        let remaining = total - LIMIT;
        if (st.agentsListExpanded) {
            html += '<button class="btn secondary full" id="agents-toggle-btn" style="margin-top:8px;padding:6px;font-size:0.7rem;">▲ СВЕРНУТЬ</button>';
        } else {
            html += '<button class="btn secondary full" id="agents-toggle-btn" style="margin-top:8px;padding:6px;font-size:0.7rem;">▼ ЕЩЁ (' + remaining + ')</button>';
        }
    }

    online.innerHTML = html;

    online.querySelectorAll('[data-show-agent]').forEach(el => {
        el.addEventListener('click', () => {
            if (typeof window.showAgentInfo === 'function') window.showAgentInfo(el.dataset.showAgent);
        });
    });

    document.getElementById('agents-toggle-btn')?.addEventListener('click', () => {
        st.agentsListExpanded = !st.agentsListExpanded;
        localStorage.setItem('syndicate_agents_expanded', st.agentsListExpanded);
        renderRightPanel();
    });
}

// ============================================================
// БЛОК ТОП-ОТРЯДОВ
// ============================================================
async function renderTopClansBlock() {
    let topClans = document.getElementById('top-clans');
    if (!topClans) return;

    await loadClans();
    let sorted = [...clans].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);

    if (sorted.length === 0) {
        topClans.innerHTML = '<div style="color:var(--text-3);font-size:0.75rem;padding:6px;">НЕТ ОТРЯДОВ</div>';
        return;
    }

    topClans.innerHTML = sorted.map((cl, i) =>
        '<div class="top-clan-item">' +
        '<span class="top-clan-rank">#' + (i + 1) + '</span>' +
        '<span class="top-clan-name">' + cl.emoji + ' ' + cl.name + '</span>' +
        '<span class="top-clan-rating">' + (cl.rating || 0) + '</span></div>'
    ).join('');
}

// ============================================================
// БЛОК ОБЪЯВЛЕНИЙ
// ============================================================
async function renderAnnounceBlock() {
    let announceMini = document.getElementById('announce-mini');
    if (!announceMini) return;

    let { data } = await supabase.from('announcements')
        .select('*').order('created_at', { ascending: false }).limit(4);

    if (!data || data.length === 0) {
        announceMini.innerHTML = '<div style="color:var(--text-3);font-size:0.75rem;padding:6px;">НЕТ ОБЪЯВЛЕНИЙ</div>';
        return;
    }

    announceMini.innerHTML = data.map(a =>
        '<div class="announce-mini" data-announce-id="' + a.id + '">' +
        '<div>' + escapeHtml((a.title || '').substring(0, 60)) + '</div>' +
        '<div class="announce-mini-time">' + timeAgo(a.created_at) + '</div></div>'
    ).join('');

    announceMini.querySelectorAll('[data-announce-id]').forEach(el => {
        el.addEventListener('click', async () => {
            let id = parseInt(el.dataset.announceId);
            let { data: full } = await supabase.from('announcements').select('*').eq('id', id).maybeSingle();
            if (full && typeof window.openAnnounceView === 'function') window.openAnnounceView(full);
        });
    });
}