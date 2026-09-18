// ============ ANNOUNCEMENTS / ОБЪЯВЛЕНИЯ ============
import { supabase, CA } from './auth.js';
import { ANNOUNCE_PER_PAGE } from './config.js';
import { addLog } from './admin.js';
import { notif } from './utils.js';

let announcements = [];
let announceFilter = 'all';
let announcePage = 1;

export const announceTypes = {
    news: '📰 Новость',
    event: '🎯 Ивент',
    auction: '💰 Аукцион',
    update: '⚡ Обновление',
    wanted: '🔍 Розыск'
};

export async function loadAnnouncements() {
    try {
        let { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (data) { announcements = data; window.announcements = announcements; }
    } catch (e) {}
}

export async function createAnnouncement(title, text, type) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ НЕТ ПРАВ' };
    try {
        await supabase.from('announcements').insert({ type: type || 'news', title, text, author: CA.name });
        await loadAnnouncements();
        notif('📢 ОПУБЛИКОВАНО');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteAnnouncement(id) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ НЕТ ПРАВ' };
    try { await supabase.from('announcements').delete().eq('id', id); await loadAnnouncements(); notif('🗑 УДАЛЕНО'); return { success: true }; }
    catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function pinAnnouncement(id) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ НЕТ ПРАВ' };
    let a = announcements.find(x => x.id == id);
    if (!a) return { success: false, error: '⛔ Не найдено' };
    let np = !a.pinned;
    try {
        await supabase.from('announcements').update({ pinned: np, pinned_by: np ? CA.name : null }).eq('id', id);
        announcements = announcements.map(x => x.id == id ? { ...x, pinned: np, pinned_by: np ? CA.name : null } : x);
        addLog(CA.name, np ? 'pin_announce' : 'unpin_announce', '#' + id);
        notif(np ? '📌 ЗАКРЕПЛЕНО' : '📌 ОТКРЕПЛЕНО');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export function getFilteredAnnouncements() {
    let sorted = [...announcements].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.created_at || '').localeCompare(a.created_at || '');
    });
    if (announceFilter === 'all') return sorted;
    return sorted.filter(a => a.type === announceFilter);
}

export function getPaginatedAnnouncements() {
    let filtered = getFilteredAnnouncements();
    let totalPages = Math.ceil(filtered.length / ANNOUNCE_PER_PAGE);
    if (announcePage > totalPages) announcePage = totalPages || 1;
    let start = (announcePage - 1) * ANNOUNCE_PER_PAGE;
    return { items: filtered.slice(start, start + ANNOUNCE_PER_PAGE), totalPages, currentPage: announcePage, total: filtered.length };
}

export function setAnnounceFilter(filter) { announceFilter = filter; announcePage = 1; }
export function setAnnouncePage(page) { announcePage = page; }

export function renderAnnounceApp() {
    let c = document.getElementById('announce-content');
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator') || !c) return;
    let sorted = [...announcements].sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return 0; });
    c.innerHTML = '<button class="settings-btn" id="show-create-announce-btn"><span>📢</span> СОЗДАТЬ ОБЪЯВЛЕНИЕ</button><div id="announce-list">' +
        (sorted.length === 0 ? '<div style="color:#cc0000;">НЕТ</div>' :
        sorted.map(a => '<div class="announce-card' + (a.pinned ? ' pinned' : '') + '"><div class="announce-type-badge">' + (announceTypes[a.type] || '📰') + (a.pinned ? ' 📌' : '') + '</div><div class="announce-title-text">' + a.title + '</div><div class="announce-text-body">' + (a.text || '').replace(/\n/g, '<br>').replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:200px;max-height:200px;border:1px solid #ff1744;margin:5px 0;">') + '</div><div style="display:flex;justify-content:space-between;align-items:center;"><div class="announce-author">— ' + a.author + '</div><div style="display:flex;gap:5px;"><button class="modal-btn" style="font-size:0.9rem;" data-pin-ann="' + a.id + '">' + (a.pinned ? '📌 ОТКРЕПИТЬ' : '📌 ЗАКРЕПИТЬ') + '</button><button class="modal-btn" style="font-size:0.9rem;" data-del-ann="' + a.id + '">🗑 УДАЛИТЬ</button></div></div></div>').join('')) +
        '</div>';
    setTimeout(() => {
        document.getElementById('show-create-announce-btn')?.addEventListener('click', () => { if (typeof showCreateAnnouncement === 'function') showCreateAnnouncement(); });
        document.querySelectorAll('[data-pin-ann]').forEach(b => b.addEventListener('click', function() { pinAnnouncement(parseInt(this.dataset.pinAnn)); }));
        document.querySelectorAll('[data-del-ann]').forEach(b => b.addEventListener('click', function() { deleteAnnouncement(parseInt(this.dataset.delAnn)); }));
    }, 10);
}

export { announcements, announceFilter, announcePage };