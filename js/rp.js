// ============ RP / ТЕКСТОВО-РОЛЕВОЙ ЧАТ ============
import { supabase, CA, getAgents } from './auth.js';
import { notif, timeAgo } from './utils.js';

let rpCharacters = [];
let rpMessages = [];
let rpChannel = null;
let currentRpChar = null;
let currentRpRoom = 'general';
let rpScenes = [];

// ==================== ПЕРСОНАЖИ ====================
export async function loadRpCharacters() {
    if (!CA) return;
    try {
        let { data } = await supabase.from('rp_characters').select('*').eq('owner', CA.name).order('created_at', { ascending: false });
        if (data) rpCharacters = data;
    } catch (e) {}
}

export async function createRpCharacter(charData) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    if (!charData.name || charData.name.length < 2 || charData.name.length > 30) return { success: false, error: '⛔ Имя 2-30 символов' };
    try {
        let { data, error } = await supabase.from('rp_characters').insert({
            owner: CA.name,
            name: charData.name,
            race: charData.race || 'human',
            age: charData.age || 0,
            gender: charData.gender || '',
            role: charData.role || '',
            character: charData.character || '',
            biography: charData.biography || '',
            avatar_url: charData.avatar_url || ''
        }).select().single();
        if (error) return { success: false, error: error.message };
        await loadRpCharacters();
        notif('✅ Персонаж создан');
        return { success: true, character: data };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function updateRpCharacter(id, charData) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    try {
        await supabase.from('rp_characters').update({
            name: charData.name,
            race: charData.race,
            age: charData.age,
            gender: charData.gender,
            role: charData.role,
            character: charData.character,
            biography: charData.biography,
            avatar_url: charData.avatar_url
        }).eq('id', id).eq('owner', CA.name);
        await loadRpCharacters();
        notif('✅ Персонаж обновлён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteRpCharacter(id) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    try {
        await supabase.from('rp_characters').delete().eq('id', id).eq('owner', CA.name);
        await loadRpCharacters();
        if (currentRpChar && currentRpChar.id === id) {
            currentRpChar = null;
            localStorage.removeItem('syndicate_rp_char');
        }
        notif('🗑 Персонаж удалён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export function getRpCharacters() { return rpCharacters; }
export function getCurrentRpChar() { return currentRpChar; }
export function setCurrentRpChar(char) {
    currentRpChar = char;
    if (char) localStorage.setItem('syndicate_rp_char', JSON.stringify(char));
    else localStorage.removeItem('syndicate_rp_char');
}

export function loadSavedRpChar() {
    try {
        let saved = localStorage.getItem('syndicate_rp_char');
        if (saved) currentRpChar = JSON.parse(saved);
    } catch (e) {}
}

export function requireCharacter() {
    if (!currentRpChar) {
        notif('⚠ Сначала создай персонажа');
        return false;
    }
    return true;
}

// ==================== СООБЩЕНИЯ ====================
export async function loadRpMessages(room = 'general') {
    try {
        let { data } = await supabase.from('rp_messages')
            .select('*').eq('room', room)
            .order('id', { ascending: false }).limit(100);
        if (data) { rpMessages = data.reverse(); renderRpMessages(); }
    } catch (e) {}
}

export function subscribeRpChat(room = 'general') {
    if (rpChannel) supabase.removeChannel(rpChannel);
    rpChannel = supabase.channel('rp-' + room)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rp_messages', filter: 'room=eq.' + room }, payload => {
            rpMessages.push(payload.new);
            if (currentRpRoom === room) renderRpMessages();
        }).subscribe();
}

export async function sendRpMessage() {
    let inp = document.getElementById('rp-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA || !currentRpChar) {
        if (!currentRpChar) notif('⚠ Выбери персонажа');
        return;
    }
    let md = {
        room: currentRpRoom,
        owner: CA.name,
        char_name: currentRpChar.name,
        char_avatar_url: currentRpChar.avatar_url || '',
        char_race: currentRpChar.race || '',
        text: msg,
        time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' })
    };
    try { await supabase.from('rp_messages').insert(md); } catch (e) {}
    inp.value = '';
}

export function renderRpMessages() {
    let c = document.getElementById('rp-messages');
    if (!c) return;
    if (rpMessages.length === 0) {
        c.innerHTML = '<div class="empty-state">Сообщений пока нет</div>';
        return;
    }
    c.innerHTML = rpMessages.map(m => {
        let avatarHtml = m.char_avatar_url
            ? '<img src="' + m.char_avatar_url + '" style="width:100%;height:100%;object-fit:cover;">'
            : '🎭';
        let txt = (m.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
        txt = txt.replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:200px;border-radius:12px;margin:6px 0;" onerror="this.style.display=\'none\'">');
        return '<div class="chat-msg">' +
            '<div class="chat-msg-left"><span class="chat-avatar-frame f-default"><span class="chat-avatar">' + avatarHtml + '</span></span></div>' +
            '<div class="chat-msg-right">' +
            '<div class="chat-header-row">' +
            '<span class="chat-author" style="color:var(--accent);">' + m.char_name + '</span>' +
            '<span style="color:var(--text-3);font-size:0.75rem;">(' + m.owner + ')</span>' +
            '<span class="chat-time">' + m.time + '</span>' +
            '</div>' +
            '<div class="chat-text" style="font-style:italic;">' + txt + '</div>' +
            '</div></div>';
    }).join('');
    c.scrollTop = c.scrollHeight;
}

export function switchRpRoom(room) {
    currentRpRoom = room;
    loadRpMessages(room);
    subscribeRpChat(room);
}

// ==================== СПЕКТАКЛИ ====================
export async function loadRpScenes() {
    try {
        let { data } = await supabase.from('rp_scenes').select('*').order('created_at', { ascending: false });
        if (data) rpScenes = data;
    } catch (e) {}
}

export async function createRpScene(title, description) {
    if (!CA || !currentRpChar) return { success: false, error: '⚠ Нужен персонаж' };
    try {
        await supabase.from('rp_scenes').insert({
            title, description, author: CA.name,
            char_name: currentRpChar.name,
            char_avatar_url: currentRpChar.avatar_url || '',
            players: []
        });
        await loadRpScenes();
        notif('✅ Спектакль создан');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export function renderRpScenes() {
    let c = document.getElementById('rp-scenes-list');
    if (!c) return;
    if (rpScenes.length === 0) {
        c.innerHTML = '<div class="empty-state">Спектаклей пока нет</div>';
        return;
    }
    c.innerHTML = rpScenes.map(s => {
        let av = s.char_avatar_url ? '<img src="' + s.char_avatar_url + '" style="width:44px;height:44px;border-radius:12px;object-fit:cover;">' : '🎭';
        return '<div class="card" style="padding:14px;margin-bottom:8px;"><div style="display:flex;gap:12px;align-items:center;"><div>' + av + '</div><div style="flex:1;"><div style="font-weight:700;">' + s.title + '</div><div style="color:var(--text-3);font-size:0.8rem;">' + s.char_name + ' (' + s.author + ') · ' + timeAgo(s.created_at) + '</div></div></div><div style="color:var(--text-2);margin-top:8px;line-height:1.5;">' + (s.description || '') + '</div></div>';
    }).join('');
}

export { rpCharacters, rpMessages, rpScenes, currentRpRoom };