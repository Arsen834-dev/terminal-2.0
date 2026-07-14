// ============ FRIENDS / ДРУЗЬЯ, БЛОКИРОВКА ============
import { supabase, CA, loadAgent } from './auth.js';
import { notif } from './utils.js';
import { startDM, glowIcon } from './chat.js';

let friends = [];

export async function loadFriends() {
    if (!CA) return;
    try {
        let { data } = await supabase.from('friends')
            .select('*')
            .or('agent.eq.' + CA.name + ',friend.eq.' + CA.name);
        if (data) friends = data;
    } catch (e) {}
}

export async function sendFriendRequest(name) {
    if (!CA || name === CA.name) return { success: false, error: '⛔ НЕЛЬЗЯ ДОБАВИТЬ СЕБЯ' };
    if (friends.find(f => (f.agent === CA.name && f.friend === name) || (f.agent === name && f.friend === CA.name))) {
        return { success: false, error: '⚠ УЖЕ ЕСТЬ' };
    }
    let agent = await loadAgent(name);
    if (!agent) return { success: false, error: '⛔ АГЕНТ НЕ НАЙДЕН' };
    try {
        await supabase.from('friends').insert({ agent: CA.name, friend: name, status: 'pending' });
        await loadFriends();
        return { success: true, message: '🤝 ЗАПРОС ОТПРАВЛЕН' };
    } catch (e) {
        return { success: false, error: 'Ошибка отправки' };
    }
}

export async function acceptFriend(id) {
    try {
        await supabase.from('friends').update({ status: 'accepted' }).eq('id', id);
        await loadFriends();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка принятия' };
    }
}

export async function removeFriend(id) {
    try {
        await supabase.from('friends').delete().eq('id', id);
        await loadFriends();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка удаления' };
    }
}

export async function blockAgent(name) {
    if (!CA || name === CA.name) return { success: false, error: '⛔ НЕЛЬЗЯ' };
    try {
        await supabase.from('friends').upsert({ agent: CA.name, friend: name, status: 'blocked' });
        await loadFriends();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка блокировки' };
    }
}

export async function unblockAgent(id) {
    try {
        await supabase.from('friends').delete().eq('id', id);
        await loadFriends();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка разблокировки' };
    }
}

export function getFriends() { return friends; }
export function getPendingRequests() { return friends.filter(f => f.status === 'pending' && f.friend === CA?.name); }
export function getAcceptedFriends() { return friends.filter(f => f.status === 'accepted'); }

// ==================== RENDER FRIENDS (UI) ====================

export function renderFriends() {
    loadFriends().then(() => {
        let c = document.getElementById('friends-content');
        if (!CA || !c) return;
        let accepted = friends.filter(f => f.status === 'accepted');
        let pending = friends.filter(f => f.status === 'pending');
        let blocked = friends.filter(f => f.status === 'blocked');
        let myRequests = pending.filter(f => f.agent === CA.name);
        let theirRequests = pending.filter(f => f.friend === CA.name);
        if (theirRequests.length > 0) glowIcon('icon-friends');
        
        c.innerHTML = '<div style="font-size:1.3rem;margin-bottom:10px;">🤝 ДРУЗЬЯ</div>';
        if (accepted.length === 0) c.innerHTML += '<div style="color:#cc0000;">НЕТ ДРУЗЕЙ</div>';
        else accepted.forEach(f => {
            let name = f.agent === CA.name ? f.friend : f.agent;
            c.innerHTML += '<div class="admin-row"><span>🤝 ' + name + '</span><div><button class="modal-btn" style="font-size:0.8rem;" data-dm-friend="' + name + '">📁</button><button class="modal-btn" style="font-size:0.8rem;" data-remove-friend="' + f.id + '">🗑</button></div></div>';
        });
        if (myRequests.length > 0) {
            c.innerHTML += '<div style="margin-top:15px;color:#ffd700;">📤 ОТПРАВЛЕННЫЕ ЗАЯВКИ:</div>';
            myRequests.forEach(f => {
                c.innerHTML += '<div class="admin-row"><span>📤 ' + f.friend + ' <span class="status-pending">(ОЖИДАЕТ ОТВЕТА)</span></span><button class="modal-btn" style="font-size:0.8rem;" data-remove-friend="' + f.id + '">🗑</button></div>';
            });
        }
        if (theirRequests.length > 0) {
            c.innerHTML += '<div style="margin-top:15px;color:#00ff41;">📥 ВХОДЯЩИЕ ЗАПРОСЫ:</div>';
            theirRequests.forEach(f => {
                c.innerHTML += '<div class="admin-row"><span>📩 ' + f.agent + '</span><button class="modal-btn" style="font-size:0.8rem;" data-accept-friend="' + f.id + '">✅</button></div>';
            });
        }
        c.innerHTML += '<div style="margin-top:15px;"><b>ЗАБЛОКИРОВАНЫ:</b></div>';
        if (blocked.length === 0) c.innerHTML += '<div style="color:#cc0000;">НЕТ</div>';
        else blocked.forEach(f => {
            c.innerHTML += '<div class="admin-row"><span>🚫 ' + f.friend + '</span><button class="modal-btn" style="font-size:0.8rem;" data-unblock="' + f.id + '">✅</button></div>';
        });
        c.innerHTML += '<div style="margin-top:15px;"><input type="text" class="chat-input" id="friend-name" placeholder="ИМЯ АГЕНТА"><button class="modal-btn" id="add-friend-btn">🤝 ДОБАВИТЬ</button></div>';
        setTimeout(() => {
            document.getElementById('add-friend-btn')?.addEventListener('click', function() {
                let n = document.getElementById('friend-name').value.trim();
                if (n) sendFriendRequest(n);
            });
            document.querySelectorAll('[data-remove-friend]').forEach(b => b.addEventListener('click', function() {
                removeFriend(parseInt(this.dataset.removeFriend));
            }));
            document.querySelectorAll('[data-accept-friend]').forEach(b => b.addEventListener('click', function() {
                acceptFriend(parseInt(this.dataset.acceptFriend));
            }));
            document.querySelectorAll('[data-unblock]').forEach(b => b.addEventListener('click', function() {
                unblockAgent(parseInt(this.dataset.unblock));
            }));
            document.querySelectorAll('[data-dm-friend]').forEach(b => b.addEventListener('click', function() {
                startDM(this.dataset.dmFriend);
            }));
        }, 10);
    });
}

export { friends };