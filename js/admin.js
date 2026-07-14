// ============ ADMIN / АДМИН-ПАНЕЛЬ, ЛОГИ ============
import { supabase, CA, getAgents, saveAgent } from './auth.js';
import { notif } from './utils.js';
import { getShopLogs } from './shop.js';

let actionLogs = [];

export async function loadLogs() {
    try {
        let { data } = await supabase.from('action_logs')
            .select('*')
            .order('id', { ascending: false })
            .limit(200);
        if (data) actionLogs = data;
    } catch (e) {}
}

export async function addLog(who, action, target) {
    let time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    try {
        await supabase.from('action_logs').insert({ who, action, target, time });
    } catch (e) {}
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
        return { success: false, error: '⛔ Агент не найден' };
    } catch (e) {
        return { success: false, error: 'Ошибка' };
    }
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
            if (name === CA.name) { logout(); }
            return { success: true, banned: newBanned };
        }
        return { success: false, error: '⛔ Агент не найден' };
    } catch (e) {
        return { success: false, error: 'Ошибка' };
    }
}

export async function deleteAgent(name) {
    if (!CA || CA.role !== 'admin' || name === 'admin') {
        return { success: false, error: '⛔ НЕТ ПРАВ' };
    }
    try {
        await supabase.from('agents').delete().eq('name', name);
        addLog(CA.name, 'delete', name);
        notif('🗑 ' + name + ' УДАЛЁН');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка удаления' };
    }
}

export async function changeAgentRole(name, newRole) {
    if (!CA || CA.role !== 'admin') return { success: false, error: '⛔ ТОЛЬКО АДМИН' };
    try {
        await supabase.from('agents').update({ role: newRole }).eq('name', name);
        addLog(CA.name, 'role_change', name + ' → ' + newRole);
        notif('👑 ' + name + ' теперь ' + newRole);
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка' };
    }
}

// ==================== RENDER ADMIN PANEL (UI) ====================

export async function renderAdminPanel() {
    let content = document.getElementById('admin-content');
    if (!content) return;
    let agents = await getAgents();
    
    content.innerHTML = '<div class="admin-legend">👑 Админ | <span class="mod-icon">🛡</span> Модер | 👤 Агент | 🚫 Забанен | 🔇 Замучен | 🗑 Удаление</div><div style="font-size:1.3rem;margin-bottom:15px;">УПРАВЛЕНИЕ</div>';
    
    Object.entries(agents).forEach(([name, data]) => {
        let roleBtns = '';
        if (CA.role === 'admin' && name !== 'admin') {
            if (data.role === 'agent') {
                roleBtns += '<button data-role-mod="' + name + '" style="background:transparent;border:1px solid #b388ff;color:#b388ff;padding:5px 10px;cursor:pointer;font-family:VT323;">🛡</button>';
                roleBtns += '<button data-role-admin="' + name + '" style="background:transparent;border:1px solid #ffd700;color:#ffd700;padding:5px 10px;cursor:pointer;font-family:VT323;">👑</button>';
            } else if (data.role === 'moderator') {
                roleBtns += '<button data-role-agent="' + name + '" style="background:transparent;border:1px solid #fff;color:#fff;padding:5px 10px;cursor:pointer;font-family:VT323;">⬇</button>';
                roleBtns += '<button data-role-admin2="' + name + '" style="background:transparent;border:1px solid #ffd700;color:#ffd700;padding:5px 10px;cursor:pointer;font-family:VT323;">👑</button>';
            }
        }
        content.innerHTML += '<div class="admin-row"><span>' + name + ' (' + (data.role === 'admin' ? '👑' : data.role === 'moderator' ? '<span class="mod-icon">🛡</span>' : '') + ' ' + (data.role || 'agent') + ')' + (data.banned ? ' 🚫' : '') + (data.muted ? ' 🔇' : '') + '</span><span>' + roleBtns +
            ((CA.role === 'admin' || CA.role === 'moderator') && name !== CA.name ? 
                '<button data-mute="' + name + '" style="background:transparent;border:1px solid ' + (data.muted ? '#0f0' : '#ff0') + ';color:' + (data.muted ? '#0f0' : '#ff0') + ';padding:5px 10px;cursor:pointer;font-family:VT323;">' + (data.muted ? '🔊' : '🔇') + '</button>' : '') +
            (CA.role === 'admin' && name !== CA.name ? 
                '<button data-ban="' + name + '" style="background:transparent;border:1px solid ' + (data.banned ? '#0f0' : '#f00') + ';color:' + (data.banned ? '#0f0' : '#f00') + ';padding:5px 10px;cursor:pointer;font-family:VT323;">' + (data.banned ? '✅' : '🚫') + '</button>' : '') +
            (CA.role === 'admin' && name !== 'admin' ? 
                '<button data-delete="' + name + '" style="background:transparent;border:1px solid #f00;color:#f00;padding:5px 10px;cursor:pointer;font-family:VT323;">🗑</button>' : '') +
        '</span></div>';
    });
    
    setTimeout(() => {
        document.querySelectorAll('[data-role-mod]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleMod, 'moderator'); }));
        document.querySelectorAll('[data-role-admin]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleAdmin, 'admin'); }));
        document.querySelectorAll('[data-role-agent]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleAgent, 'agent'); }));
        document.querySelectorAll('[data-role-admin2]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); changeAgentRole(this.dataset.roleAdmin2, 'admin'); }));
        document.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); muteAgent(this.dataset.mute); }));
        document.querySelectorAll('[data-ban]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); banAgent(this.dataset.ban); }));
        document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); deleteAgent(this.dataset.delete); }));
    }, 10);
}

// ==================== RENDER LOGS (UI) ====================

export function renderLogs() {
    let c = document.getElementById('logs-content');
    if (!CA || !c) return;
    loadLogs().then(() => {
        let shopLogs = getShopLogs();
        c.innerHTML = '<div style="font-size:1.3rem;margin-bottom:10px;">📜 ЛОГИ</div><div class="log-search"><input type="text" id="log-search-input" placeholder="ПОИСК ПО АГЕНТУ..."><button class="modal-btn" style="font-size:0.9rem;padding:6px 12px;" id="clear-log-search">✕</button></div><div class="logs-split"><div class="logs-column"><h3>ДЕЙСТВИЯ</h3><div id="action-logs-list">' +
            (actionLogs.length === 0 ? '<div style="color:#cc0000;">ПУСТО</div>' :
            actionLogs.map(l => '<div class="log-entry"><span style="color:#ffd700;">' + l.who + '</span> → ' + l.action + ' → <span style="color:#ff4444;">' + l.target + '</span> <span style="color:#cc0000;font-size:0.8rem;">' + l.time + '</span></div>').join('')) +
            '</div></div><div class="logs-column"><h3>🛒 ПОКУПКИ</h3><div id="shop-logs-list">' +
            (shopLogs.length === 0 ? '<div style="color:#cc0000;">ПУСТО</div>' :
            shopLogs.map(l => '<div class="log-entry"><span style="color:#ffd700;">' + l.who + '</span> → ' + l.action + ' <span style="color:#ffd700;">' + l.item + '</span> (' + l.price + ' ТК) <span style="color:#cc0000;font-size:0.8rem;">' + l.time + '</span></div>').join('')) +
            '</div></div></div>';
        setTimeout(() => {
            document.getElementById('log-search-input')?.addEventListener('input', function() {
                let q = this.value.trim().toLowerCase();
                let al = document.getElementById('action-logs-list');
                let sl = document.getElementById('shop-logs-list');
                let fa = q ? actionLogs.filter(l => l.who.toLowerCase().includes(q) || l.target.toLowerCase().includes(q)) : actionLogs;
                let fs = q ? shopLogs.filter(l => l.who.toLowerCase().includes(q) || l.item.toLowerCase().includes(q)) : shopLogs;
                if (al) al.innerHTML = fa.length === 0 ? '<div style="color:#cc0000;">ПУСТО</div>' : fa.map(l => '<div class="log-entry"><span style="color:#ffd700;">' + l.who + '</span> → ' + l.action + ' → <span style="color:#ff4444;">' + l.target + '</span> <span style="color:#cc0000;font-size:0.8rem;">' + l.time + '</span></div>').join('');
                if (sl) sl.innerHTML = fs.length === 0 ? '<div style="color:#cc0000;">ПУСТО</div>' : fs.map(l => '<div class="log-entry"><span style="color:#ffd700;">' + l.who + '</span> → ' + l.action + ' <span style="color:#ffd700;">' + l.item + '</span> (' + l.price + ' ТК) <span style="color:#cc0000;font-size:0.8rem;">' + l.time + '</span></div>').join('');
            });
            document.getElementById('clear-log-search')?.addEventListener('click', function() {
                document.getElementById('log-search-input').value = '';
                document.getElementById('log-search-input').dispatchEvent(new Event('input'));
            });
        }, 10);
    });
}

export { actionLogs };