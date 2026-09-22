// ============================================================
// ANNOUNCEMENTS / ОБЪЯВЛЕНИЯ
// v2.7.0: раскрытие объявления по клику
// ============================================================

import { supabase, CA } from './auth.js';
import { addLog } from './admin.js';
import { notif } from './utils.js';
import { shopItems, getActiveColorClassForId } from './shop.js';

let announcements = [];
let announceFilter = 'all';
let announcePage = 0;
let announceTotal = 0;
const PAGE_SIZE = 10;
let announceChannel = null;

export const announceTypes = {
    news:    { label: '📰 Новость',     icon: '📰', color: '#448aff' },
    event:   { label: '🎯 Ивент',       icon: '🎯', color: '#ff9100' },
    auction: { label: '💰 Аукцион',     icon: '💰', color: '#ffd700' },
    update:  { label: '⚡ Обновление',  icon: '⚡', color: '#00ff41' },
    wanted:  { label: '🔍 Розыск',      icon: '🔍', color: '#ff1744' }
};

function fx(name) {
    if (typeof window.__getAgentFx === 'function') return window.__getAgentFx(name);
    let colorCls = '';
    let frameCls = 'f-default';
    let roleBadge = '';
    let badgeHtml = '';
    return { colorCls, fontCls: '', frameCls, badgeHtml, roleBadge, avatar: '' };
}

export async function loadAnnouncements() {
    try {
        let { data, count } = await supabase.from('announcements')
            .select('*', { count: 'exact' })
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false });
        if (data) {
            announcements = data;
            announceTotal = count || data.length;
            window.announcements = announcements;
        }
    } catch (e) {}
}

export function subscribeAnnouncements(onUpdate) {
    if (announceChannel) supabase.removeChannel(announceChannel);
    announceChannel = supabase.channel('announcements-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
            loadAnnouncements().then(() => {
                if (typeof onUpdate === 'function') onUpdate();
                let mini = document.getElementById('announce-mini');
                if (mini && typeof window.__renderAnnounceMini === 'function') {
                    window.__renderAnnounceMini();
                }
            });
        })
        .subscribe();
}

export async function createAnnouncement(title, text, type) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ НЕТ ПРАВ' };
    try {
        let hashtags = [];
        if (text) {
            let regex = /(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu;
            let m;
            while ((m = regex.exec(text)) !== null) {
                let tag = m[1].toLowerCase().trim();
                if (tag && !hashtags.includes(tag)) hashtags.push(tag);
            }
        }
        await supabase.from('announcements').insert({
            type: type || 'news',
            title, text,
            author: CA.name,
            hashtags: hashtags
        });
        await loadAnnouncements();
        notif('📢 ОПУБЛИКОВАНО');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteAnnouncement(id) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ НЕТ ПРАВ' };
    try {
        await supabase.from('announcements').delete().eq('id', id);
        await loadAnnouncements();
        notif('🗑 УДАЛЕНО');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function pinAnnouncement(id) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ НЕТ ПРАВ' };
    let a = announcements.find(x => x.id == id);
    if (!a) return { success: false, error: '⛔ Не найдено' };
    let np = !a.pinned;
    try {
        await supabase.from('announcements').update({ pinned: np, pinned_by: np ? CA.name : null }).eq('id', id);
        announcements.forEach(x => { if (x.id == id) { x.pinned = np; x.pinned_by = np ? CA.name : null; } });
        addLog(CA.name, np ? 'pin_announce' : 'unpin_announce', '#' + id);
        notif(np ? '📌 ЗАКРЕПЛЕНО' : '📌 ОТКРЕПЛЕНО');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

function getFiltered() {
    let sorted = [...announcements].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.created_at || '').localeCompare(a.created_at || '');
    });
    if (announceFilter === 'all') return sorted;
    return sorted.filter(a => a.type === announceFilter);
}

function getPage(page) {
    let filtered = getFiltered();
    let start = page * PAGE_SIZE;
    return {
        items: filtered.slice(start, start + PAGE_SIZE),
        total: filtered.length,
        hasMore: start + PAGE_SIZE < filtered.length
    };
}

export function setAnnounceFilter(filter) { announceFilter = filter; announcePage = 0; }
export function setAnnouncePage(page) { announcePage = page; }

export function renderAnnounceApp() {
    let c = document.getElementById('announce-content');
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator') || !c) return;

    let filters = [
        { id: 'all', label: 'ВСЕ', icon: '▣' },
        { id: 'news', label: 'НОВОСТИ', icon: '📰' },
        { id: 'event', label: 'ИВЕНТЫ', icon: '🎯' },
        { id: 'auction', label: 'АУКЦИОНЫ', icon: '💰' },
        { id: 'update', label: 'ОБНОВЛЕНИЯ', icon: '⚡' },
        { id: 'wanted', label: 'РОЗЫСК', icon: '🔍' }
    ];

    let filtersHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">' +
        filters.map(f =>
            '<button class="feed-tab' + (announceFilter === f.id ? ' active' : '') + '" data-ann-filter="' + f.id + '">' + f.icon + ' ' + f.label + '</button>'
        ).join('') +
        '</div>';

    let createBtn = '<button class="btn full" id="show-create-announce-btn" style="margin-bottom:16px;">➕ СОЗДАТЬ ОБЪЯВЛЕНИЕ</button>';

    let { items, total, hasMore } = getPage(announcePage);

    let listHtml = '<div id="announce-list">';
    if (items.length === 0) {
        listHtml += '<div class="empty-state">ОБЪЯВЛЕНИЙ НЕТ</div>';
    } else {
        items.forEach(a => { listHtml += renderAnnounceCard(a); });
    }
    listHtml += '</div>';

    let moreHtml = '';
    if (hasMore) {
        let remaining = total - (announcePage + 1) * PAGE_SIZE;
        moreHtml = '<div style="margin-top:16px;text-align:center;">' +
            '<button class="btn secondary" id="announce-load-more">▼ ЗАГРУЗИТЬ ЕЩЁ (' + remaining + ')</button>' +
            '</div>';
    } else if (total > PAGE_SIZE) {
        moreHtml = '<div style="margin-top:16px;text-align:center;color:var(--text-3);font-size:0.7rem;text-transform:uppercase;letter-spacing:2px;">— КОНЕЦ —</div>';
    }

    let countHtml = '<div style="color:var(--text-3);font-size:0.75rem;margin-bottom:12px;font-family:var(--font-digit);letter-spacing:1px;">ВСЕГО: ' + total + '</div>';

    c.innerHTML = createBtn + filtersHtml + countHtml + listHtml + moreHtml;

    setTimeout(() => {
        document.getElementById('show-create-announce-btn')?.addEventListener('click', () => {
            if (typeof window.showCreateAnnouncement === 'function') window.showCreateAnnouncement();
        });
        document.querySelectorAll('[data-ann-filter]').forEach(b => {
            b.addEventListener('click', () => {
                announceFilter = b.dataset.annFilter;
                announcePage = 0;
                renderAnnounceApp();
            });
        });
        document.getElementById('announce-load-more')?.addEventListener('click', () => {
            announcePage++;
            renderAnnounceApp();
        });
        document.querySelectorAll('[data-pin-ann]').forEach(b => b.addEventListener('click', async function(e) {
            e.stopPropagation();
            await pinAnnouncement(parseInt(this.dataset.pinAnn));
            renderAnnounceApp();
        }));
        document.querySelectorAll('[data-del-ann]').forEach(b => b.addEventListener('click', async function(e) {
            e.stopPropagation();
            let id = parseInt(this.dataset.delAnn);
            let a = announcements.find(x => x.id === id);
            if (typeof window.confirmDialog === 'function') {
                window.confirmDialog('УДАЛИТЬ ОБЪЯВЛЕНИЕ', 'Удалить «' + (a ? a.title : '?') + '»?', async () => {
                    await deleteAnnouncement(id);
                    renderAnnounceApp();
                });
            } else {
                await deleteAnnouncement(id);
                renderAnnounceApp();
            }
        }));
        // Клик по карточке объявления → раскрыть
        document.querySelectorAll('[data-ann-open]').forEach(b => b.addEventListener('click', function(e) {
            e.stopPropagation();
            let id = parseInt(this.dataset.annOpen);
            let a = announcements.find(x => x.id === id);
            if (a && typeof window.openAnnounceView === 'function') window.openAnnounceView(a);
        }));
    }, 10);
}

function renderAnnounceCard(a) {
    let t = announceTypes[a.type] || announceTypes.news;
    let e = fx(a.author);
    let titleHtml = a.title ? linkifyHashtags(escapeHtml(a.title)) : '';
    let textHtml = a.text ? linkifyHashtags(escapeHtml(a.text)).replace(/\n/g, '<br>') : '';
    let isPinned = a.pinned;
    let pinnedBy = a.pinned_by ? ' · закрепил ' + escapeHtml(a.pinned_by) : '';

    return '<div class="card" style="border-left-color:' + t.color + ';margin-bottom:10px;cursor:pointer;' + (isPinned ? 'border-color:var(--accent);' : '') + '" data-ann-open="' + a.id + '">' +
        '<div class="card-header" style="margin-bottom:8px;">' +
        '<div class="chat-avatar-frame card-avatar" style="border-color:' + t.color + '55;">' +
        '<div class="inner" style="background:' + t.color + '22;color:' + t.color + ';font-size:1.3rem;">' + t.icon + '</div>' +
        '</div>' +
        '<div class="card-author-block">' +
        '<div class="card-author name-with-badge ' + e.colorCls + ' ' + e.fontCls + '" data-show-agent="' + escapeHtml(a.author) + '" style="cursor:pointer;position:relative;padding-right:6px;">' + escapeHtml(a.author) + e.roleBadge + e.badgeHtml + '</div>' +
        '<div class="card-meta">' +
        '<span class="role" style="color:' + t.color + ';">' + t.label.toUpperCase() + '</span>' +
        (isPinned ? '<span style="color:var(--accent);">📌 ЗАКРЕПЛЕНО' + pinnedBy + '</span>' : '') +
        '<span class="card-time">' + timeAgo(a.created_at) + '</span>' +
        '</div></div>' +
        '<div style="display:flex;gap:4px;margin-left:auto;" onclick="event.stopPropagation();">' +
        '<button class="btn secondary" data-pin-ann="' + a.id + '" style="padding:4px 8px;font-size:0.7rem;">' + (isPinned ? '📌' : '📍') + '</button>' +
        '<button class="btn danger" data-del-ann="' + a.id + '" style="padding:4px 8px;font-size:0.7rem;">🗑</button>' +
        '</div>' +
        '</div>' +
        (titleHtml ? '<div class="card-title">' + titleHtml + '</div>' : '') +
        (textHtml ? '<div class="card-text">' + textHtml + '</div>' : '') +
        '</div>';
}

function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function linkifyHashtags(text) {
    if (!text) return '';
    return text.replace(/(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu, (full, tag) => {
        let prefix = full.startsWith(' ') ? ' ' : '';
        return prefix + '<span class="hashtag-link" data-hashtag="' + tag.toLowerCase() + '">#' + tag + '</span>';
    });
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

export { announcements, announceFilter, announcePage };