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
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return { success: false, error: '⛔ НЕТ ПРАВ' };
    try {
        let { data } = await supabase.from('agents').select('muted').eq('name', name).maybeSingle();
        if (data) {
            let newMuted = !data.muted;
            await supabase.from('agents').update({ muted: newMuted }).eq('name', name);
            addLog(CA.name, newMuted ? 'mute' : 'unmute', name);
            if (name === CA.name) CA.muted = newMuted;
            notif(newMuted ? '🔇 ' + name + ' ЗАМУЧЕН' : '🔊 ' + name + ' РАЗМУЧЕН');
            return { success: true, muted: newMuted };
        }
        return { success: false, error: '⛔ Не найден' };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function banAgent(name) {
    if (!CA || CA.role !== 'admin') return { success: false, error: '⛔ ТОЛЬКО АДМИН' };
    try {
        let { data } = await supabase.from('agents').select('banned').eq('name', name).maybeSingle();
        if (data) {
            let newBanned = !data.banned;
            await supabase.from('agents').update({ banned: newBanned }).eq('name', name);
            addLog(CA.name, newBanned ? 'ban' : 'unban', name);
            notif(newBanned ? '🚫 ' + name + ' ЗАБАНЕН' : '✅ ' + name + ' РАЗБАНЕН');
            return { success: true, banned: newBanned };
        }
        return { success: false, error: '⛔ Не найден' };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteAgent(name) {
    if (!CA || CA.role !== 'admin' || name === 'admin') return { success: false, error: '⛔ НЕТ ПРАВ' };
    try {
        await supabase.from('agents').delete().eq('name', name);
        addLog(CA.name, 'delete', name);
        notif('🗑 ' + name + ' УДАЛЁН');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function changeAgentRole(name, newRole) {
    if (!CA || CA.role !== 'admin') return { success: false, error: '⛔ ТОЛЬКО АДМИН' };
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
    
    // Статистика
    let total = Object.keys(agents).length;
    let now = Date.now();
    let online = Object.values(agents).filter(a => a.last_seen && (now - new Date(a.last_seen).getTime()) < 300000).length;
    let banned = Object.values(agents).filter(a => a.banned).length;
    let muted = Object.values(agents).filter(a => a.muted).length;
    
    let html = '<div class="admin-legend">👑 Админ | 🛡 Модер | 🎯 Агент | 🚫 Бан | 🔇 Мут</div>';
    
    // Дашборд
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">';
    html += '<div style="border:2px solid #ff1744;padding:12px;text-align:center;"><div style="font-size:1.8rem;color:#ff1744;font-weight:bold;">' + total + '</div><div style="color:#880000;font-size:0.8rem;">ВСЕГО</div></div>';
    html += '<div style="border:2px solid #00ff41;padding:12px;text-align:center;"><div style="font-size:1.8rem;color:#00ff41;font-weight:bold;">' + online + '</div><div style="color:#880000;font-size:0.8rem;">ОНЛАЙН</div></div>';
    html += '<div style="border:2px solid #ff0000;padding:12px;text-align:center;"><div style="font-size:1.8rem;color:#ff0000;font-weight:bold;">' + banned + '</div><div style="color:#880000;font-size:0.8rem;">БАН</div></div>';
    html += '<div style="border:2px solid #ffd700;padding:12px;text-align:center;"><div style="font-size:1.8rem;color:#ffd700;font-weight:bold;">' + muted + '</div><div style="color:#880000;font-size:0.8rem;">МУТ</div></div>';
    html += '</div>';
    
    // Таблица
    html += '<div class="admin-legend">УПРАВЛЕНИЕ АГЕНТАМИ</div>';
    Object.entries(agents).forEach(([name, data]) => {
        let roleBtns = '';
        if (isAdmin && name !== 'admin') {
            if (data.role === 'agent') {
                roleBtns += '<button data-role-mod="' + name + '" style="background:transparent;border:1px solid #b388ff;color:#b388ff;padding:5px 10px;cursor:pointer;font-family:VT323;">🛡</button>';
                roleBtns += '<button data-role-admin="' + name + '" style="background:transparent;border:1px solid #ffd700;color:#ffd700;padding:5px 10px;cursor:pointer;font-family:VT323;">👑</button>';
            } else if (data.role === 'moderator') {
                roleBtns += '<button data-role-agent="' + name + '" style="background:transparent;border:1px solid #fff;color:#fff;padding:5px 10px;cursor:pointer;font-family:VT323;">⬇</button>';
                roleBtns += '<button data-role-admin2="' + name + '" style="background:transparent;border:1px solid #ffd700;color:#ffd700;padding:5px 10px;cursor:pointer;font-family:VT323;">👑</button>';
            } else if (data.role === 'admin' && name !== 'admin') {
                roleBtns += '<button data-role-agent2="' + name + '" style="background:transparent;border:1px solid #fff;color:#fff;padding:5px 10px;cursor:pointer;font-family:VT323;">⬇</button>';
            }
        }
        let avatarHtml = data.avatar_url ? '<img src="' + data.avatar_url + '" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:6px;">' : '';
        html += '<div class="admin-row"><span>' + avatarHtml + name + ' (' + (data.role === 'admin' ? '👑' : data.role === 'moderator' ? '🛡' : '') + ' ' + (data.role || 'agent') + ')' + (data.banned ? ' 🚫' : '') + (data.muted ? ' 🔇' : '') + '</span><span>' + roleBtns;
        if (isMod && name !== CA.name) {
            html += '<button data-mute="' + name + '" style="background:transparent;border:1px solid ' + (data.muted ? '#0f0' : '#ff0') + ';color:' + (data.muted ? '#0f0' : '#ff0') + ';padding:5px 10px;cursor:pointer;font-family:VT323;">' + (data.muted ? '🔊' : '🔇') + '</button>';
        }
        if (isAdmin && name !== CA.name) {
            html += '<button data-ban="' + name + '" style="background:transparent;border:1px solid ' + (data.banned ? '#0f0' : '#f00') + ';color:' + (data.banned ? '#0f0' : '#f00') + ';padding:5px 10px;cursor:pointer;font-family:VT323;">' + (data.banned ? '✅' : '🚫') + '</button>';
        }
        if (isAdmin && name !== 'admin') {
            html += '<button data-delete="' + name + '" style="background:transparent;border:1px solid #f00;color:#f00;padding:5px 10px;cursor:pointer;font-family:VT323;">🗑</button>';
        }
        html += '</span></div>';
    });
    
    content.innerHTML = html;
    
    setTimeout(() => {
        document.querySelectorAll('[data-role-mod]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleMod, 'moderator').then(() => renderAdminPanel()); }));
        document.querySelectorAll('[data-role-admin]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleAdmin, 'admin').then(() => renderAdminPanel()); }));
        document.querySelectorAll('[data-role-agent]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleAgent, 'agent').then(() => renderAdminPanel()); }));
        document.querySelectorAll('[data-role-agent2]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleAgent2, 'agent').then(() => renderAdminPanel()); }));
        document.querySelectorAll('[data-role-admin2]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleAdmin2, 'admin').then(() => renderAdminPanel()); }));
        document.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); muteAgent(this.dataset.mute).then(() => renderAdminPanel()); }));
        document.querySelectorAll('[data-ban]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); banAgent(this.dataset.ban).then(() => renderAdminPanel()); }));
        document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); deleteAgent(this.dataset.delete).then(() => renderAdminPanel()); }));
    }, 10);
}

export async function renderLogs() {
    let c = document.getElementById('logs-content');
    if (!CA || !c) return;
    await loadLogs();
    c.innerHTML = '<div style="font-size:1.3rem;margin-bottom:10px;">📜 ЛОГИ ДЕЙСТВИЙ</div>' +
        '<div class="log-search"><input type="text" id="log-search-input" placeholder="ПОИСК..."></div>' +
        '<div id="action-logs-list">' +
        (actionLogs.length === 0 ? '<div style="color:#cc0000;">ПУСТО</div>' :
        actionLogs.map(l => '<div class="log-entry"><span style="color:#ffd700;">' + l.who + '</span> → ' + l.action + ' → <span style="color:#ff4444;">' + l.target + '</span> <span style="color:#cc0000;font-size:0.8rem;">' + l.time + '</span></div>').join('')) +
        '</div>';
    setTimeout(() => {
        document.getElementById('log-search-input')?.addEventListener('input', function() {
            let q = this.value.trim().toLowerCase();
            let list = document.getElementById('action-logs-list');
            let filtered = q ? actionLogs.filter(l => (l.who || '').toLowerCase().includes(q) || (l.target || '').toLowerCase().includes(q)) : actionLogs;
            list.innerHTML = filtered.length === 0 ? '<div style="color:#cc0000;">ПУСТО</div>' :
                filtered.map(l => '<div class="log-entry"><span style="color:#ffd700;">' + l.who + '</span> → ' + l.action + ' → <span style="color:#ff4444;">' + l.target + '</span> <span style="color:#cc0000;font-size:0.8rem;">' + l.time + '</span></div>').join('');
        });
    }, 10);
}

export { actionLogs };