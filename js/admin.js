// ============ ADMIN / АДМИН-ПАНЕЛЬ, ЛОГИ ============
import { supabase, CA, getAgents } from './auth.js';
import { notif } from './utils.js';

let actionLogs = [];

export async function loadLogs() {
    try {
        let { data } = await supabase.from('action_logs').select('*').order('id', { ascending: false }).limit(200);
        if (data) actionLogs = data;
    } catch (e) {}
}

export async function addLog(who, action, target) {
    let time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    try { await supabase.from('action_logs').insert({ who, action, target, time }); } catch (e) {}
}

export async function muteAgent(name) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ Нет прав' };
    if (name === CA.name) return { success: false, error: '⛔ Нельзя себя' };
    try {
        let { data } = await supabase.from('agents').select('muted').eq('name', name).maybeSingle();
        if (data) {
            let newMuted = !data.muted;
            await supabase.from('agents').update({ muted: newMuted }).eq('name', name);
            addLog(CA.name, newMuted ? 'mute' : 'unmute', name);
            notif(newMuted ? '🔇 ' + name + ' замучен' : '🔊 ' + name + ' размучен');
            return { success: true, muted: newMuted };
        }
        return { success: false, error: '⛔ Не найден' };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function banAgent(name) {
    if (!CA || CA.role !== 'admin') return { success: false, error: '⛔ Только админ' };
    if (name === CA.name) return { success: false, error: '⛔ Нельзя себя' };
    try {
        let { data } = await supabase.from('agents').select('banned').eq('name', name).maybeSingle();
        if (data) {
            let newBanned = !data.banned;
            await supabase.from('agents').update({ banned: newBanned }).eq('name', name);
            addLog(CA.name, newBanned ? 'ban' : 'unban', name);
            notif(newBanned ? '🚫 ' + name + ' забанен' : '✅ ' + name + ' разбанен');
            return { success: true, banned: newBanned };
        }
        return { success: false, error: '⛔ Не найден' };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteAgent(name) {
    if (!CA || CA.role !== 'admin' || name === 'admin' || name === CA.name) return { success: false, error: '⛔ Нет прав' };
    try {
        await supabase.from('agents').delete().eq('name', name);
        addLog(CA.name, 'delete', name);
        notif('🗑 ' + name + ' удалён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function changeAgentRole(name, newRole) {
    if (!CA || CA.role !== 'admin') return { success: false, error: '⛔ Только админ' };
    if (name === 'admin') return { success: false, error: '⛔ Нельзя трогать главного' };
    try {
        await supabase.from('agents').update({ role: newRole }).eq('name', name);
        addLog(CA.name, 'role_change', name + ' → ' + newRole);
        notif('👑 ' + name + ' теперь ' + newRole);
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function renderAdminPanel() {
    let content = document.getElementById('admin-content');
    if (!content || !CA) return;
    let agents = await getAgents();
    let isAdmin = CA.role === 'admin';
    let isMod = isAdmin || CA.role === 'moderator';

    let total = Object.keys(agents).length;
    let now = Date.now();
    let online = Object.values(agents).filter(a => a.last_seen && (now - new Date(a.last_seen).getTime()) < 300000).length;
    let banned = Object.values(agents).filter(a => a.banned).length;
    let muted = Object.values(agents).filter(a => a.muted).length;

    let html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">';
    html += '<div class="card" style="padding:12px;text-align:center;"><div style="font-size:1.6rem;color:var(--accent);font-weight:700;">' + total + '</div><div style="color:var(--text-3);font-size:0.8rem;">Всего</div></div>';
    html += '<div class="card" style="padding:12px;text-align:center;"><div style="font-size:1.6rem;color:var(--success);font-weight:700;">' + online + '</div><div style="color:var(--text-3);font-size:0.8rem;">Онлайн</div></div>';
    html += '<div class="card" style="padding:12px;text-align:center;"><div style="font-size:1.6rem;color:var(--danger);font-weight:700;">' + banned + '</div><div style="color:var(--text-3);font-size:0.8rem;">Бан</div></div>';
    html += '<div class="card" style="padding:12px;text-align:center;"><div style="font-size:1.6rem;color:var(--warning);font-weight:700;">' + muted + '</div><div style="color:var(--text-3);font-size:0.8rem;">Мут</div></div>';
    html += '</div>';

    html += '<div style="font-weight:700;margin-bottom:12px;">Управление агентами</div>';
    Object.entries(agents).forEach(([name, data]) => {
        let roleBtns = '';
        if (isAdmin && name !== 'admin' && name !== CA.name) {
            if (data.role === 'agent') {
                roleBtns += '<button class="btn btn-secondary" data-role-mod="' + name + '" style="padding:4px 10px;font-size:0.8rem;">🛡</button> ';
                roleBtns += '<button class="btn btn-secondary" data-role-admin="' + name + '" style="padding:4px 10px;font-size:0.8rem;">👑</button> ';
            } else if (data.role === 'moderator') {
                roleBtns += '<button class="btn btn-secondary" data-role-agent="' + name + '" style="padding:4px 10px;font-size:0.8rem;">⬇</button> ';
                roleBtns += '<button class="btn btn-secondary" data-role-admin2="' + name + '" style="padding:4px 10px;font-size:0.8rem;">👑</button> ';
            } else if (data.role === 'admin') {
                roleBtns += '<button class="btn btn-secondary" data-role-agent2="' + name + '" style="padding:4px 10px;font-size:0.8rem;">⬇</button> ';
            }
        }
        let avatarHtml = data.avatar_url ? '<img src="' + data.avatar_url + '" style="width:32px;height:32px;border-radius:8px;vertical-align:middle;margin-right:8px;object-fit:cover;">' : '';

        html += '<div class="card" style="padding:12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">';
        html += '<div>' + avatarHtml + '<span style="font-weight:600;">' + name + '</span> <span style="color:var(--text-3);font-size:0.8rem;">(' + (data.role === 'admin' ? '👑' : data.role === 'moderator' ? '🛡' : '🎯') + ' ' + (data.role || 'agent') + ')' + (data.banned ? ' 🚫' : '') + (data.muted ? ' 🔇' : '') + '</span></div>';
        html += '<div>' + roleBtns;
        if (isMod && name !== CA.name) {
            html += '<button class="btn ' + (data.muted ? 'btn-secondary' : 'btn-secondary') + '" data-mute="' + name + '" style="padding:4px 10px;font-size:0.8rem;">' + (data.muted ? '🔊' : '🔇') + '</button> ';
        }
        if (isAdmin && name !== CA.name) {
            html += '<button class="btn btn-secondary" data-ban="' + name + '" style="padding:4px 10px;font-size:0.8rem;">' + (data.banned ? '✅' : '🚫') + '</button> ';
        }
        if (isAdmin && name !== 'admin' && name !== CA.name) {
            html += '<button class="btn btn-danger" data-delete="' + name + '" style="padding:4px 10px;font-size:0.8rem;">🗑</button>';
        }
        html += '</div></div>';
    });

    content.innerHTML = html;

    setTimeout(() => {
        document.querySelectorAll('[data-role-mod]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await changeAgentRole(this.dataset.roleMod, 'moderator'); renderAdminPanel(); }));
        document.querySelectorAll('[data-role-admin]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await changeAgentRole(this.dataset.roleAdmin, 'admin'); renderAdminPanel(); }));
        document.querySelectorAll('[data-role-agent]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await changeAgentRole(this.dataset.roleAgent, 'agent'); renderAdminPanel(); }));
        document.querySelectorAll('[data-role-agent2]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await changeAgentRole(this.dataset.roleAgent2, 'agent'); renderAdminPanel(); }));
        document.querySelectorAll('[data-role-admin2]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await changeAgentRole(this.dataset.roleAdmin2, 'admin'); renderAdminPanel(); }));
        document.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await muteAgent(this.dataset.mute); renderAdminPanel(); }));
        document.querySelectorAll('[data-ban]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await banAgent(this.dataset.ban); renderAdminPanel(); }));
        document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async function(e) { e.stopPropagation(); await deleteAgent(this.dataset.delete); renderAdminPanel(); }));
    }, 10);
}

export async function renderLogs() {
    let c = document.getElementById('logs-content');
    if (!CA || !c) return;
    await loadLogs();
    c.innerHTML = '<div style="font-weight:700;margin-bottom:16px;">📜 Логи действий</div>' +
        '<input type="text" class="modal-input" id="log-search-input" placeholder="Поиск..." style="margin-bottom:12px;">' +
        '<div id="action-logs-list">' +
        (actionLogs.length === 0 ? '<div class="empty-state">Пусто</div>' :
        actionLogs.map(l => '<div class="card" style="padding:10px;margin-bottom:4px;font-size:0.85rem;"><span style="color:var(--accent);font-weight:600;">' + l.who + '</span> → ' + l.action + ' → <span style="color:var(--danger);">' + l.target + '</span> <span style="color:var(--text-3);font-size:0.75rem;">' + l.time + '</span></div>').join('')) +
        '</div>';
    setTimeout(() => {
        document.getElementById('log-search-input')?.addEventListener('input', function() {
            let q = this.value.trim().toLowerCase();
            let list = document.getElementById('action-logs-list');
            let filtered = q ? actionLogs.filter(l => (l.who || '').toLowerCase().includes(q) || (l.target || '').toLowerCase().includes(q)) : actionLogs;
            list.innerHTML = filtered.length === 0 ? '<div class="empty-state">Пусто</div>' :
                filtered.map(l => '<div class="card" style="padding:10px;margin-bottom:4px;font-size:0.85rem;"><span style="color:var(--accent);font-weight:600;">' + l.who + '</span> → ' + l.action + ' → <span style="color:var(--danger);">' + l.target + '</span> <span style="color:var(--text-3);font-size:0.75rem;">' + l.time + '</span></div>').join('');
        });
    }, 10);
}

export { actionLogs };