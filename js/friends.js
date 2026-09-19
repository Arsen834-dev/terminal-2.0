// ============ FRIENDS / ДРУЗЬЯ ============
import { supabase, CA, loadAgent } from './auth.js';
import { notif, glowIcon } from './utils.js';

let friends = [];

export async function loadFriends() {
    if (!CA) return;
    try {
        let { data } = await supabase.from('friends').select('*').or('agent.eq.' + CA.name + ',friend.eq.' + CA.name);
        if (data) friends = data;
    } catch (e) {}
}

export async function sendFriendRequest(name) {
    if (!CA || name === CA.name) return { success: false, error: '⛔ Нельзя себя' };
    if (friends.find(f => (f.agent === CA.name && f.friend === name) || (f.agent === name && f.friend === CA.name))) {
        return { success: false, error: '⚠ Уже есть' };
    }
    let agent = await loadAgent(name);
    if (!agent) return { success: false, error: '⛔ Агент не найден' };
    try {
        await supabase.from('friends').insert({ agent: CA.name, friend: name, status: 'pending' });
        await loadFriends();
        return { success: true, message: '🤝 Запрос отправлен' };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function acceptFriend(id) {
    try {
        await supabase.from('friends').update({ status: 'accepted' }).eq('id', id);
        await loadFriends();
        notif('✅ Друг добавлен');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function removeFriend(id) {
    try {
        await supabase.from('friends').delete().eq('id', id);
        await loadFriends();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function blockAgent(name) {
    if (!CA || name === CA.name) return { success: false, error: '⛔ Нельзя' };
    try {
        await supabase.from('friends').upsert({ agent: CA.name, friend: name, status: 'blocked' });
        await loadFriends();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function unblockAgent(id) {
    try {
        await supabase.from('friends').delete().eq('id', id);
        await loadFriends();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export function getFriends() { return friends; }
export function getPendingRequests() { return friends.filter(f => f.status === 'pending' && f.friend === CA?.name); }
export function getAcceptedFriends() { return friends.filter(f => f.status === 'accepted'); }

export function renderFriends() {
    loadFriends().then(() => {
        let c = document.getElementById('friends-content');
        if (!CA || !c) return;
        let accepted = friends.filter(f => f.status === 'accepted');
        let pending = friends.filter(f => f.status === 'pending');
        let blocked = friends.filter(f => f.status === 'blocked');
        let myReq = pending.filter(f => f.agent === CA.name);
        let theirReq = pending.filter(f => f.friend === CA.name);

        if (theirReq.length > 0) glowIcon('icon-friends');

        let html = '<div style="font-size:1.1rem;font-weight:700;margin-bottom:16px;">🤝 Друзья</div>';

        if (accepted.length === 0) html += '<div class="empty-state">Нет друзей</div>';
        else accepted.forEach(f => {
            let n = f.agent === CA.name ? f.friend : f.agent;
            html += '<div class="card" style="padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><span>🤝 ' + n + '</span><div><button class="btn btn-secondary" style="padding:6px 12px;font-size:0.8rem;" data-dm-friend="' + n + '">📁</button> <button class="btn btn-danger" style="padding:6px 12px;font-size:0.8rem;" data-remove-friend="' + f.id + '">🗑</button></div></div>';
        });

        if (myReq.length > 0) {
            html += '<div style="margin-top:16px;color:var(--accent);font-weight:600;">📤 Отправленные</div>';
            myReq.forEach(f => {
                html += '<div class="card" style="padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><span>📤 ' + f.friend + '</span><button class="btn btn-danger" style="padding:6px 12px;font-size:0.8rem;" data-remove-friend="' + f.id + '">🗑</button></div>';
            });
        }

        if (theirReq.length > 0) {
            html += '<div style="margin-top:16px;color:var(--success);font-weight:600;">📥 Входящие</div>';
            theirReq.forEach(f => {
                html += '<div class="card" style="padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><span>📩 ' + f.agent + '</span><div><button class="btn btn-primary" style="padding:6px 12px;font-size:0.8rem;" data-accept-friend="' + f.id + '">✅</button> <button class="btn btn-danger" style="padding:6px 12px;font-size:0.8rem;" data-remove-friend="' + f.id + '">✕</button></div></div>';
            });
        }

        html += '<div style="margin-top:16px;font-weight:600;">Заблокированы</div>';
        if (blocked.length === 0) html += '<div style="color:var(--text-3);">Нет</div>';
        else blocked.forEach(f => {
            html += '<div class="card" style="padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><span>🚫 ' + f.friend + '</span><button class="btn btn-secondary" style="padding:6px 12px;font-size:0.8rem;" data-unblock="' + f.id + '">✅</button></div>';
        });

        html += '<div style="margin-top:16px;display:flex;gap:8px;"><input type="text" class="modal-input" id="friend-name" placeholder="Имя агента" style="flex:1;margin:0;"><button class="btn btn-primary" id="add-friend-btn">Добавить</button></div>';

        c.innerHTML = html;

        setTimeout(() => {
            document.getElementById('add-friend-btn')?.addEventListener('click', async function() {
                let n = document.getElementById('friend-name').value.trim();
                if (!n) return;
                let r = await sendFriendRequest(n);
                if (r.success) { notif(r.message || '🤝 Отправлено'); renderFriends(); }
                else notif(r.error);
            });
            document.querySelectorAll('[data-remove-friend]').forEach(b => b.addEventListener('click', async function() {
                await removeFriend(parseInt(this.dataset.removeFriend));
                notif('🗑 Удалено'); renderFriends();
            }));
            document.querySelectorAll('[data-accept-friend]').forEach(b => b.addEventListener('click', async function() {
                await acceptFriend(parseInt(this.dataset.acceptFriend));
                renderFriends();
            }));
            document.querySelectorAll('[data-unblock]').forEach(b => b.addEventListener('click', async function() {
                await unblockAgent(parseInt(this.dataset.unblock));
                notif('✅ Разблокирован'); renderFriends();
            }));
            document.querySelectorAll('[data-dm-friend]').forEach(b => b.addEventListener('click', function() {
                if (typeof window.startDM === 'function') window.startDM(this.dataset.dmFriend);
            }));
        }, 10);
    });
}

export { friends };