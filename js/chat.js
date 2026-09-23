// ============================================================
// CHAT / СООБЩЕНИЯ
// v2.9.5: сброс высоты textarea, Shift+Enter — новый абзац
// ============================================================
import { supabase, CA, activeItems, saveAgent, loadAgent, getAgents } from './auth.js';
import { shopItems, getActiveColorClassForId } from './shop.js';
import { clans } from './clans.js';
import { notif, glowIcon, stopGlowIcon } from './utils.js';
import { playSound } from './sounds.js';

let chatMessages = [];
let chatChannel = null;
let chatTabActive = 'general';
let replyTo = null;
let dmReplyTo = null;
let chatPage = 0;
const CHAT_PAGE_SIZE = window.innerWidth > 768 ? 100 : 30;
let unreadMentions = { chat: 0, clan: 0, dm: 0, announce: 0 };
let adminMessages = [];
let adminChannel = null;
let dmMessagesAll = [];
let dmChannel = null;
let currentDM = null;
let clanChats = {};
let currentClanId = null;
let clanChannel = null;
let pinnedChatSubscription = null;
let mentionAgents = [];

// ============================================================
// ХЕЛПЕР: сброс высоты textarea после отправки
// ============================================================
function resetTextareaHeight(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = '36px';
}

// ==================== ПРОВЕРКА АКТИВНОГО КАНАЛА ====================
function isChatOpenAndGeneral() {
    if (!window.__currentView) return false;
    return window.__currentView === 'chat' && chatTabActive === 'general';
}
function isDmOpenFor(agent) {
    if (!window.__currentView) return false;
    return window.__currentView === 'dm' && currentDM === agent;
}
function isClanChatOpen(clanId) {
    if (!window.__currentView) return false;
    return window.__currentView === 'chat' && chatTabActive === 'clan' && currentClanId === clanId;
}
function isAdminChatOpen() {
    if (!window.__currentView) return false;
    return window.__currentView === 'chat' && chatTabActive === 'admin';
}

// ==================== ОБЩИЙ ЧАТ ====================
export async function loadChatMessages() {
    try {
        let { data } = await supabase.from('chat_messages')
            .select('*').order('id', { ascending: false }).limit(CHAT_PAGE_SIZE);
        if (data) {
            chatMessages = data.reverse();
            renderChat();
        }
    } catch (e) {}
}

export async function loadMoreChatMessages() {
    chatPage++;
    let oldestId = chatMessages.length > 0 ? chatMessages[0].id : null;
    if (!oldestId) { notif('📜 НЕТ СТАРЫХ'); chatPage--; return; }
    try {
        let { data } = await supabase.from('chat_messages')
            .select('*').lt('id', oldestId).order('id', { ascending: false }).limit(CHAT_PAGE_SIZE);
        if (data && data.length > 0) { chatMessages = [...data.reverse(), ...chatMessages]; renderChat(true); }
        else { notif('📜 БОЛЬШЕ НЕТ'); chatPage--; }
    } catch (e) { chatPage--; }
}

export function subscribeChat() {
    if (chatChannel) supabase.removeChannel(chatChannel);
    chatChannel = supabase.channel('chat-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
            let msg = payload.new;
            chatMessages.push(msg);
            if (chatMessages.length > 100) chatMessages.shift();
            if (msg.author !== CA?.name && isChatOpenAndGeneral()) {
                playSound('receive');
            }
            checkMentions(msg.text);
            if (chatTabActive === 'general' && window.__currentView === 'chat') {
                renderChat();
            } else {
                glowIcon('icon-chat');
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, payload => {
            let existing = chatMessages.find(m => m.id === payload.new.id);
            if (existing) Object.assign(existing, payload.new);
            else chatMessages.push(payload.new);
            renderChat();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
            chatMessages = chatMessages.filter(m => m.id !== payload.old.id);
            renderChat();
        })
        .subscribe();
    if (pinnedChatSubscription) supabase.removeChannel(pinnedChatSubscription);
    pinnedChatSubscription = supabase.channel('pinned-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, payload => {
            let existing = chatMessages.find(m => m.id === payload.new.id);
            if (existing) Object.assign(existing, payload.new);
            else chatMessages.push(payload.new);
            renderChat();
        })
        .subscribe();
}

export async function sendMessage() {
    let inp = document.getElementById('chat-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA) return;
    if (chatTabActive === 'admin') { sendAdminMessage(); return; }
    if (CA.muted) return notif('🔇 ВЫ ЗАМУЧЕНЫ');
    let mentions = msg.match(/@(\S+)/g);
    if (mentions) {
        for (let m of mentions) {
            let name = m.substring(1);
            if (name === 'all') continue;
            let ag = await loadAgent(name);
            if (!ag) notif('⛔ АГЕНТ ' + name + ' НЕ НАЙДЕН');
        }
    }
    let md = {
        author: CA.name, avatar_url: CA.avatar_url || '',
        role: CA.role || 'agent', text: msg,
        time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }),
        reactions: {},
        author_color: activeItems.color, author_frame: activeItems.frame,
        author_badge: activeItems.badge, author_font: activeItems.font
    };
    if (replyTo) { md.reply_to = replyTo.msgId; md.reply_author = replyTo.author; md.reply_text = replyTo.text; }
    try { await supabase.from('chat_messages').insert(md); } catch (e) {}
    playSound('send');
    CA.chatCount = (CA.chatCount || 0) + 1;
    CA.crystals = (CA.crystals || 0) + 15;
    inp.value = '';
    resetTextareaHeight(inp);
    replyTo = null;
    cancelReply();
    saveAgent();
    hideMentionSuggestions();
}

export function renderChat(keepScroll = false) {
    if (chatTabActive !== 'general') return;
    let c = document.getElementById('chat-messages');
    if (!c) return;
    let osh = c.scrollHeight, ost = c.scrollTop;
    let msgs = chatMessages.slice(window.innerWidth > 768 ? -30 : -15);
    if (msgs.length === 0) { c.innerHTML = '<div style="text-align:center;color:#880000;padding:20px;">СООБЩЕНИЙ ПОКА НЕТ</div>'; return; }
    c.innerHTML = msgs.map((m, i) => {
        let ri = m.role === 'admin' ? ' 👑' : m.role === 'moderator' ? ' 🛡' : '';
        let canMod = CA && (CA.role === 'admin' || CA.role === 'moderator');
        let canDelete = canMod || m.author === CA?.name;
        let txt = (m.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        txt = txt.replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:200px;max-height:200px;border:1px solid rgba(255,255,255,0.1);margin:5px 0;border-radius:12px;" onerror="this.style.display=\'none\'">');
        txt = txt.replace(/@all/g, '<span class="mention" style="color:#E91E63;font-weight:bold;">@all</span>');
        txt = txt.replace(/@(\S+)/g, (_, name) => '<span class="mention" onclick="window.showAgentInfo(\'' + name + '\')">@' + name + '</span>');
        let cs = m.author_color ? (getActiveColorClassForId(m.author_color) === 'rainbow-text' ? 'rainbow-text' : getActiveColorClassForId(m.author_color)) : '';
        let fc = m.author_font ? { 'fnt_cyber': 'font-cyber', 'fnt_gothic': 'font-gothic', 'fnt_rune': 'font-rune', 'fnt_glitch': 'font-glitch', 'fnt_western': 'font-western', 'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil', 'fnt_pixel': 'font-pixel', 'fnt_blood': 'font-blood', 'fnt_neon': 'font-neon', 'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic' }[m.author_font] || '' : '';
        let frc = m.author_frame ? (shopItems.frames.find(f => f.id === m.author_frame)?.cssClass || 'f-default') : 'f-default';
        let bdg = shopItems.badges.find(b => b.id === m.author_badge);
        let be = bdg ? (bdg.image ? '<img src="' + bdg.image + '" class="badge-img">' : (bdg.emoji || '')) : '';
        let react = m.reactions || {}, rh = '';
        Object.keys(react).forEach(k => {
            if (k.endsWith('_by')) return;
            let ua = react[k + '_by'];
            let us = Array.isArray(ua) ? ua.join(', ') : '';
            let ia = Array.isArray(ua) && CA && ua.includes(CA.name);
            rh += '<span class="chat-reaction ' + (ia ? 'active' : '') + '" data-reaction="chat" data-msgid="' + m.id + '" data-emoji="' + k + '">' + k + ' ' + react[k] + '<span class="chat-reaction-tooltip">' + (us || '...') + '</span></span>';
        });
        let menu = '';
        if (m.id) {
            menu = '<span class="chat-menu-wrap"><button class="chat-menu-btn" data-menu-btn="chat' + m.id + '">⋯</button><div class="chat-menu-dropdown">';
            menu += '<div class="chat-menu-item" data-reply="' + m.id + '" data-reply-author="' + m.author + '">↩ ОТВЕТИТЬ</div>';
            if (canMod) {
                menu += '<div class="chat-menu-item" data-pin="' + m.id + '">' + (m.pinned ? '📌 ОТКРЕПИТЬ' : '📌 ЗАКРЕПИТЬ') + '</div>';
                if (m.author !== CA?.name) menu += '<div class="chat-menu-item" data-mute="' + m.author + '">🔇 МУТ</div>';
                if (CA && CA.role === 'admin' && m.author !== CA.name) menu += '<div class="chat-menu-item" data-ban="' + m.author + '">🚫 БАН</div>';
            }
            if (canDelete) menu += '<div class="chat-menu-item" data-delete-msg="' + m.id + '" data-chat-type="chat">🗑 УДАЛИТЬ</div>';
            if (m.author === CA?.name) menu += '<div class="chat-menu-item" data-edit-msg="' + m.id + '" data-chat-type="chat">✏️ РЕДАКТИРОВАТЬ</div>';
            menu += '</div></span>';
        }
        let avatarHtml = m.avatar_url ? '<img src="' + m.avatar_url + '" style="width:100%;height:100%;object-fit:cover;">' : (m.avatar || '🕶️');
        return '<div class="chat-msg' + (m.pinned ? ' pinned' : '') + '" data-msg-id="' + m.id + '">' +
            '<div class="chat-msg-left"><span class="chat-avatar-frame ' + frc + '"><span class="inner">' + avatarHtml + '</span></span></div>' +
            '<div class="chat-msg-right"><div class="chat-header-row">' +
            '<span class="chat-author name-with-badge ' + cs + '" onclick="window.showAgentInfo(\'' + m.author + '\')" style="cursor:pointer;position:relative;padding-right:6px;">' + (m.author || '???') + ri + '</span>' + be +
            '<span class="chat-time">' + (m.time || '') + '</span>' + menu + '</div>' +
            (m.pinned ? '<div class="chat-pin-info" style="color:var(--warning);font-size:0.75rem;">📌 Закреплено' + (m.pinned_by ? ' агентом ' + m.pinned_by : '') + '</div>' : '') +
            (m.reply_to ? '<div style="color:#880000;font-size:0.7rem;margin-bottom:2px;">↩ ' + (m.reply_author || '???') + ': ' + (m.reply_text || '...') + '</div>' : '') +
            '<div class="chat-text ' + fc + '">' + txt + '</div>' +
            '<div class="chat-reactions">' + rh + '<span class="chat-reaction" data-reaction-picker="chat" data-msgid="' + m.id + '">+</span></div>' +
            '</div></div>';
    }).join('');
    if (keepScroll) { let ns = c.scrollHeight; c.scrollTop = ost + (ns - osh); }
    else c.scrollTop = c.scrollHeight;
}

export function checkMentions(text) {
    if (!CA || !text) return;
    if (text.includes('@all')) { notif('📢 ОБЩИЙ ВЫЗОВ!'); unreadMentions.chat++; updateBadgeIcons(); return; }
    let mm = text.match(/@(\S+)/g);
    if (mm) mm.forEach(m => { if (m.substring(1) === CA.name) { notif('📢 ВАС УПОМЯНУЛИ'); unreadMentions.chat++; updateBadgeIcons(); } });
}

export async function addReaction(msgId, emoji) {
    let msg = chatMessages.find(m => m.id == msgId);
    if (!msg || !CA) return;
    if (!msg.reactions) msg.reactions = {};
    let key = emoji + '_by';
    if (!msg.reactions[key]) msg.reactions[key] = [];
    let ui = msg.reactions[key].indexOf(CA.name);
    if (ui !== -1) {
        msg.reactions[key].splice(ui, 1);
        msg.reactions[emoji] = Math.max(0, (msg.reactions[emoji] || 1) - 1);
        if (msg.reactions[emoji] === 0) { delete msg.reactions[emoji]; delete msg.reactions[key]; }
    } else {
        msg.reactions[key].push(CA.name);
        msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    }
    chatMessages = chatMessages.map(m => m.id == msgId ? { ...m, reactions: msg.reactions } : m);
    renderChat();
    await supabase.from('chat_messages').update({ reactions: msg.reactions }).eq('id', parseInt(msgId));
}

export async function deleteMessage(msgId) {
    chatMessages = chatMessages.filter(m => m.id != msgId);
    renderChat();
    await supabase.from('chat_messages').delete().eq('id', msgId);
}

export async function pinChatMessage(msgId) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return notif('⛔ НЕТ ПРАВ');
    let msg = chatMessages.find(m => m.id == msgId);
    if (!msg) return;
    let np = !msg.pinned;
    await supabase.from('chat_messages').update({ pinned: np, pinned_by: np ? CA.name : null }).eq('id', parseInt(msgId));
    chatMessages = chatMessages.map(m => m.id == msgId ? { ...m, pinned: np, pinned_by: np ? CA.name : null } : m);
    notif(np ? '📌 ЗАКРЕПЛЕНО' : '📌 ОТКРЕПЛЕНО'); renderChat();
}

export function replyToMessage(msgId, author) {
    let msg = chatMessages.find(m => m.id == msgId);
    if (!msg) return;
    replyTo = { msgId, author, text: msg.text.substring(0, 50) };
    let inp = document.getElementById('chat-input');
    if (inp) { inp.value = '@' + author + ' '; inp.focus(); }
    let ri = document.getElementById('reply-indicator');
    ri.innerHTML = '<span>↩ Ответ для <b>' + author + '</b>: ' + msg.text.substring(0, 50) + '...</span><span style="cursor:pointer;" id="cancel-reply-btn">✕</span>';
    ri.style.display = 'flex';
    setTimeout(() => document.getElementById('cancel-reply-btn')?.addEventListener('click', cancelReply), 10);
}

export function cancelReply() { replyTo = null; let ri = document.getElementById('reply-indicator'); if (ri) ri.style.display = 'none'; }

export function switchChatTab(tab) {
    chatTabActive = tab;
    document.querySelectorAll('.chat-tab[data-tab]').forEach(t => t.classList.remove('active'));
    document.querySelector('.chat-tab[data-tab="' + tab + '"]')?.classList.add('active');
    let cm = document.getElementById('chat-messages');
    let cir = document.getElementById('chat-input-row');
    if (tab === 'general') {
        cm.style.display = 'block'; cir.style.display = 'flex'; currentClanId = null;
        renderChat();
    } else if (tab === 'clan') {
        cm.style.display = 'block'; cir.style.display = 'flex';
        renderClanList();
    } else if (tab === 'admin') {
        if (CA.role !== 'admin' && CA.role !== 'moderator') { cm.style.display = 'none'; cir.style.display = 'none'; notif('⛔ ТОЛЬКО ДЛЯ АДМИНОВ'); return; }
        cm.style.display = 'block'; cir.style.display = 'flex'; currentClanId = null;
        loadAdminMessages().then(() => renderAdminChat());
    }
}

// ==================== АДМИН-ЧАТ ====================
export async function loadAdminMessages() {
    try { let { data } = await supabase.from('admin_messages').select('*').order('id', { ascending: false }).limit(50); if (data) adminMessages = data.reverse(); } catch (e) {}
}

export function subscribeAdminChat() {
    if (adminChannel) supabase.removeChannel(adminChannel);
    adminChannel = supabase.channel('admin-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages' }, payload => {
            adminMessages.push(payload.new);
            if (payload.new.author !== CA?.name && isAdminChatOpen()) playSound('receive');
            if (chatTabActive === 'admin') renderAdminChat();
        }).subscribe();
}

export async function sendAdminMessage() {
    let inp = document.getElementById('chat-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return;
    let md = { author: CA.name, avatar_url: CA.avatar_url || '', text: msg, time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }), reactions: {} };
    try { await supabase.from('admin_messages').insert(md); } catch (e) {}
    playSound('send');
    inp.value = '';
    resetTextareaHeight(inp);
}

export function renderAdminChat() {
    let c = document.getElementById('chat-messages');
    c.style.display = 'block';
    let msgs = adminMessages.slice(-30);
    if (msgs.length === 0) { c.innerHTML = '<div style="text-align:center;color:#880000;padding:20px;">СООБЩЕНИЙ ПОКА НЕТ</div>'; return; }
    c.innerHTML = msgs.map(m => {
        let txt = (m.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
        let avatarHtml = m.avatar_url ? '<img src="' + m.avatar_url + '" style="width:100%;height:100%;object-fit:cover;">' : '🕶️';
        let react = m.reactions || {}, rh = '';
        Object.keys(react).forEach(k => {
            if (k.endsWith('_by')) return;
            let ua = react[k + '_by'];
            let us = Array.isArray(ua) ? ua.join(', ') : '';
            let ia = Array.isArray(ua) && CA && ua.includes(CA.name);
            rh += '<span class="chat-reaction ' + (ia ? 'active' : '') + '" data-reaction="admin" data-msgid="' + m.id + '" data-emoji="' + k + '">' + k + ' ' + react[k] + '<span class="chat-reaction-tooltip">' + (us || '...') + '</span></span>';
        });
        let menu = '';
        if (m.id) {
            menu = '<span class="chat-menu-wrap"><button class="chat-menu-btn" data-menu-btn="admin' + m.id + '">⋯</button><div class="chat-menu-dropdown">';
            menu += '<div class="chat-menu-item" data-reply-admin="' + m.id + '" data-reply-author="' + m.author + '">↩ ОТВЕТИТЬ</div>';
            if (m.author === CA?.name) menu += '<div class="chat-menu-item" data-delete-admin-msg="' + m.id + '">🗑 УДАЛИТЬ</div>';
            menu += '</div></span>';
        }
        return '<div class="chat-msg"><div class="chat-msg-left"><span class="chat-avatar-frame f-default"><span class="inner">' + avatarHtml + '</span></span></div><div class="chat-msg-right"><div class="chat-header-row"><span class="chat-author">' + m.author + '</span><span class="chat-time">' + m.time + '</span>' + menu + '</div><div class="chat-text">' + txt + '</div><div class="chat-reactions">' + rh + '<span class="chat-reaction" data-reaction-picker="admin" data-msgid="' + m.id + '">+</span></div></div></div>';
    }).join('');
    c.scrollTop = c.scrollHeight;
}

export async function addAdminReaction(msgId, emoji) {
    let msg = adminMessages.find(m => m.id == msgId);
    if (!msg || !CA) return;
    if (!msg.reactions) msg.reactions = {};
    let key = emoji + '_by';
    if (!msg.reactions[key]) msg.reactions[key] = [];
    let ui = msg.reactions[key].indexOf(CA.name);
    if (ui !== -1) { msg.reactions[key].splice(ui, 1); msg.reactions[emoji] = Math.max(0, (msg.reactions[emoji] || 1) - 1); }
    else { msg.reactions[key].push(CA.name); msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1; }
    await supabase.from('admin_messages').update({ reactions: msg.reactions }).eq('id', parseInt(msgId));
    renderAdminChat();
}

export async function deleteAdminMessage(msgId) {
    if (!CA || (CA.role !== 'admin' && CA.role !== 'moderator')) return;
    await supabase.from('admin_messages').delete().eq('id', parseInt(msgId));
    adminMessages = adminMessages.filter(m => String(m.id) !== String(msgId));
    renderAdminChat();
    notif('🗑 УДАЛЕНО');
}

// ==================== ЛС ====================
export async function loadDMMessages() {
    if (!CA) return;
    try {
        let { data } = await supabase.from('dm_messages').select('*').or('from_agent.eq.' + CA.name + ',to_agent.eq.' + CA.name).order('id', { ascending: true });
        if (data) { dmMessagesAll = data; renderDMList(); }
    } catch (e) {}
}

export function subscribeDM() {
    if (dmChannel) supabase.removeChannel(dmChannel);
    dmChannel = supabase.channel('dm-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, payload => {
            let msg = payload.new;
            if (msg.to_agent === CA?.name || msg.from_agent === CA?.name) {
                dmMessagesAll.push(msg);
                if (msg.from_agent !== CA?.name && isDmOpenFor(msg.from_agent)) {
                    playSound('receive');
                }
                if (msg.text && msg.text.includes('@' + CA.name)) { notif('📩 ВАС УПОМЯНУЛИ В ЛИЧКЕ'); unreadMentions.dm++; updateBadgeIcons(); }
                glowIcon('icon-dm');
                renderDMList();
                if (currentDM === msg.from_agent || currentDM === msg.to_agent) renderDMMessages();
            }
        }).subscribe();
}

export function openDM(agent) { currentDM = agent; renderDMList(); renderDMMessages(); }

export function startDM(agent) {
    if (window.innerWidth <= 768) { let ab = document.getElementById('announce-toggle-btn'); if (ab) ab.style.display = 'none'; }
    let wall = document.getElementById('announcements-wall'); if (wall) wall.style.display = 'none';
    currentDM = agent;
    if (typeof window.openApp === 'function') window.openApp('dm');
}

export function renderDMList() {
    let list = document.getElementById('dm-list');
    if (!CA || !list) return;
    let agents = new Set();
    dmMessagesAll.forEach(m => {
        if (m.from_agent === CA.name) agents.add(m.to_agent);
        if (m.to_agent === CA.name) agents.add(m.from_agent);
    });
    agents.delete('W-C26');
    list.innerHTML = '<div style="color:#E91E63;margin-bottom:10px;font-weight:600;">ДИАЛОГИ</div>';
    if (agents.size === 0) {
        list.innerHTML += '<div style="color:#880000;">НЕТ ДИАЛОГОВ</div>';
    } else {
        agents.forEach(a => {
            list.innerHTML += '<div class="dm-list-item ' + (currentDM === a ? 'active' : '') + '"><span>' + a + '</span><span class="chat-menu-wrap"><button class="chat-menu-btn" data-dm-delete-btn="' + a + '">⋯</button></span></div>';
        });
    }
    setTimeout(() => {
        document.querySelectorAll('[data-dm-delete-btn]').forEach(b => {
            b.addEventListener('click', async function(e) {
                e.stopPropagation();
                let agent = this.dataset.dmDeleteBtn;
                document.getElementById('delete-dm-name').textContent = 'Диалог с агентом: ' + agent;
                let modal = document.getElementById('modal-delete-dm');
                modal.style.display = 'flex'; modal.classList.add('show');
                document.getElementById('confirm-delete-dm-btn').onclick = async function() {
                    await supabase.from('dm_messages').delete().or('and(from_agent.eq.' + CA.name + ',to_agent.eq.' + agent + '),and(from_agent.eq.' + agent + ',to_agent.eq.' + CA.name + ')');
                    dmMessagesAll = dmMessagesAll.filter(m => !(m.from_agent === CA.name && m.to_agent === agent) && !(m.from_agent === agent && m.to_agent === CA.name));
                    if (currentDM === agent) currentDM = null;
                    renderDMList(); renderDMMessages(); notif('🗑 Диалог удалён'); window.closeModal('modal-delete-dm');
                };
            });
        });
        document.querySelectorAll('.dm-list-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.chat-menu-btn')) return;
                let span = item.querySelector('span:first-child');
                if (span) openDM(span.textContent);
            });
        });
    }, 10);
}

export function renderDMMessages() {
    let c = document.getElementById('dm-messages');
    if (!currentDM || !CA) { if (c) c.innerHTML = '<div style="text-align:center;color:#880000;">ВЫБЕРИТЕ ДИАЛОГ</div>'; return; }
    let msgs = dmMessagesAll.filter(m => (m.from_agent === CA.name && m.to_agent === currentDM) || (m.from_agent === currentDM && m.to_agent === CA.name));
    if (msgs.length === 0) { c.innerHTML = '<div style="text-align:center;color:#880000;">НЕТ СООБЩЕНИЙ</div>'; return; }
    c.innerHTML = msgs.map(m => {
        let cs = m.author_color ? getActiveColorClassForId(m.author_color) : '';
        let fc = m.author_font ? { 'fnt_cyber': 'font-cyber', 'fnt_gothic': 'font-gothic', 'fnt_rune': 'font-rune', 'fnt_glitch': 'font-glitch', 'fnt_western': 'font-western', 'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil', 'fnt_pixel': 'font-pixel', 'fnt_blood': 'font-blood', 'fnt_neon': 'font-neon', 'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic' }[m.author_font] || '' : '';
        let frc = m.author_frame ? (shopItems.frames.find(f => f.id === m.author_frame)?.cssClass || 'f-default') : 'f-default';
        let replyText = (m.text || '').substring(0, 50).replace(/'/g, "\\'");
        let react = m.reactions || {}, rh = '';
        Object.keys(react).forEach(k => {
            if (k.endsWith('_by')) return;
            let ua = react[k + '_by'];
            let us = Array.isArray(ua) ? ua.join(', ') : '';
            let ia = Array.isArray(ua) && CA && ua.includes(CA.name);
            rh += '<span class="chat-reaction ' + (ia ? 'active' : '') + '" data-reaction="dm" data-msgid="' + m.id + '" data-emoji="' + k + '">' + k + ' ' + react[k] + '<span class="chat-reaction-tooltip">' + (us || '...') + '</span></span>';
        });
        let menu = '<span class="chat-menu-wrap"><button class="chat-menu-btn" data-menu-btn="dm' + m.id + '">⋯</button><div class="chat-menu-dropdown"><div class="chat-menu-item" data-reply-dm="' + m.id + '" data-reply-author="' + m.from_agent + '" data-reply-text="' + replyText + '">↩ ОТВЕТИТЬ</div>' + (m.from_agent === CA?.name ? '<div class="chat-menu-item" data-delete-dm-msg="' + m.id + '">🗑 УДАЛИТЬ</div>' : '') + '</div></span>';
        let txt = (m.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
        txt = txt.replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:200px;max-height:200px;border:1px solid rgba(255,255,255,0.1);margin:5px 0;border-radius:12px;" onerror="this.style.display=\'none\'">');
        txt = txt.replace(/@(\S+)/g, (_, name) => '<span class="mention" onclick="window.showAgentInfo(\'' + name + '\')">@' + name + '</span>');
        let replyHtml = m.reply_to ? '<div style="color:#880000;font-size:0.7rem;margin-bottom:2px;">↩ ' + (m.reply_author || '???') + ': ' + (m.reply_text || '...') + '</div>' : '';
        let avatarHtml = m.avatar_url ? '<img src="' + m.avatar_url + '" style="width:100%;height:100%;object-fit:cover;">' : '🕶️';
        return '<div class="chat-msg"><div class="chat-msg-left"><span class="chat-avatar-frame ' + frc + '"><span class="inner">' + avatarHtml + '</span></span></div><div class="chat-msg-right">' + replyHtml + '<div class="chat-header-row"><span class="chat-author ' + cs + '" onclick="window.showAgentInfo(\'' + m.from_agent + '\')" style="cursor:pointer;">' + m.from_agent + '</span><span class="chat-time">' + m.time + '</span>' + menu + '</div><div class="chat-text ' + fc + '">' + txt + '</div><div class="chat-reactions">' + rh + '<span class="chat-reaction" data-reaction-picker="dm" data-msgid="' + m.id + '">+</span></div></div></div>';
    }).join('');
    c.scrollTop = c.scrollHeight;
}

export async function sendDM() {
    let inp = document.getElementById('dm-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA || !currentDM) return;
    if (CA.muted) return notif('🔇 ВЫ ЗАМУЧЕНЫ');
    let mentions = msg.match(/@(\S+)/g);
    if (mentions) { for (let m of mentions) { let name = m.substring(1); let ag = await loadAgent(name); if (!ag) notif('⛔ АГЕНТ ' + name + ' НЕ НАЙДЕН'); } }
    let md = { from_agent: CA.name, to_agent: currentDM, avatar_url: CA.avatar_url || '', text: msg, time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }), author_color: activeItems.color, author_frame: activeItems.frame, author_badge: activeItems.badge, author_font: activeItems.font, reactions: {} };
    if (dmReplyTo) { md.reply_to = dmReplyTo.msgId; md.reply_author = dmReplyTo.author; md.reply_text = dmReplyTo.text; }
    try { await supabase.from('dm_messages').insert(md); } catch (e) {}
    playSound('send');
    inp.value = '';
    resetTextareaHeight(inp);
    dmReplyTo = null;
    cancelDmReply();
    hideMentionSuggestions();
}

export async function addDMReaction(msgId, emoji) {
    let msg = dmMessagesAll.find(m => m.id == msgId);
    if (!msg || !CA) return;
    if (!msg.reactions) msg.reactions = {};
    let key = emoji + '_by';
    if (!msg.reactions[key]) msg.reactions[key] = [];
    let ui = msg.reactions[key].indexOf(CA.name);
    if (ui !== -1) { msg.reactions[key].splice(ui, 1); msg.reactions[emoji] = Math.max(0, (msg.reactions[emoji] || 1) - 1); }
    else { msg.reactions[key].push(CA.name); msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1; }
    dmMessagesAll = dmMessagesAll.map(m => m.id == msgId ? { ...m, reactions: msg.reactions } : m);
    renderDMMessages();
    await supabase.from('dm_messages').update({ reactions: msg.reactions }).eq('id', parseInt(msgId));
}

export function cancelDmReply() { dmReplyTo = null; let ri = document.getElementById('dm-reply-indicator'); if (ri) ri.style.display = 'none'; }

export function replyToDMMessage(msgId, author, text) {
    let msg = dmMessagesAll.find(m => String(m.id) === String(msgId));
    if (msg) text = msg.text.substring(0, 50);
    dmReplyTo = { msgId, author, text };
    let inp = document.getElementById('dm-input'); if (inp) { inp.value = '@' + author + ' '; inp.focus(); }
    let ri = document.getElementById('dm-reply-indicator');
    if (!ri) {
        ri = document.createElement('div'); ri.id = 'dm-reply-indicator'; ri.className = 'reply-indicator'; ri.style.display = 'none';
        let dmMessages = document.getElementById('dm-messages');
        if (dmMessages) dmMessages.parentNode.insertBefore(ri, dmMessages.nextSibling);
    }
    ri.innerHTML = '<span>↩ Ответ для <b>' + author + '</b>: ' + text + '...</span><span style="cursor:pointer;" onclick="window.cancelDmReply()">✕</span>';
    ri.style.display = 'flex';
}

// ==================== ОТРЯДНОЙ ЧАТ ====================
export async function openClanChat(clanId) {
    currentClanId = clanId;
    await loadClanMessages(clanId);
    subscribeClanChat(clanId);
    renderClanMessages();
    document.getElementById('chat-input-row').style.display = 'flex';
}

export async function loadClanMessages(clanId) {
    try { let { data } = await supabase.from('clan_messages').select('*').eq('clan_id', clanId).order('id', { ascending: true }).limit(50); if (data) clanChats[clanId] = data; } catch (e) {}
}

export function subscribeClanChat(clanId) {
    if (clanChannel) supabase.removeChannel(clanChannel);
    clanChannel = supabase.channel('clan-' + clanId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clan_messages', filter: 'clan_id=eq.' + clanId }, payload => {
            if (!clanChats[clanId]) clanChats[clanId] = [];
            clanChats[clanId].push(payload.new);
            if (payload.new.author !== CA?.name && isClanChatOpen(clanId)) playSound('receive');
            if (payload.new.text && payload.new.text.includes('@' + CA?.name) && payload.new.author !== CA?.name) { unreadMentions.clan++; updateBadgeIcons(); notif('📢 УПОМЯНУЛИ В ОТРЯДЕ'); }
            if (currentClanId == clanId && chatTabActive === 'clan') renderClanMessages();
        }).subscribe();
}

export async function sendClanMessage() {
    let inp = document.getElementById('chat-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA || !currentClanId) return;
    if (CA.muted) return notif('🔇 ВЫ ЗАМУЧЕНЫ');
    let md = { clan_id: currentClanId, author: CA.name, avatar_url: CA.avatar_url || '', text: msg, time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }), author_color: activeItems.color, author_frame: activeItems.frame, author_badge: activeItems.badge, author_font: activeItems.font, reactions: {} };
    if (replyTo) { md.reply_to = replyTo.msgId; md.reply_author = replyTo.author; md.reply_text = replyTo.text; }
    try { await supabase.from('clan_messages').insert(md); } catch (e) {}
    playSound('send');
    CA.chatCount = (CA.chatCount || 0) + 1;
    CA.crystals = (CA.crystals || 0) + 15;
    inp.value = '';
    resetTextareaHeight(inp);
    replyTo = null;
    cancelReply();
    saveAgent();
    hideMentionSuggestions();
}

export function renderClanMessages() {
    let c = document.getElementById('chat-messages');
    if (!c || !currentClanId) return;
    c.style.display = 'block';
    let msgs = clanChats[currentClanId] || [];
    if (msgs.length === 0) { c.innerHTML = '<div style="text-align:center;color:#880000;padding:20px;">НЕТ СООБЩЕНИЙ</div>'; return; }
    let myClan = clans.find(cl => cl.id == currentClanId);
    let isLeader = myClan && myClan.leader === CA?.name;
    let isOfficer = myClan && myClan.members && myClan.members.find(m => m.name === CA?.name && m.role === 'officer');
    let canMod = CA && (CA.role === 'admin' || CA.role === 'moderator');
    let canPin = isLeader || isOfficer || canMod;
    let canDeleteOther = isLeader || canMod;

    c.innerHTML = msgs.map(m => {
        let cs = m.author_color ? getActiveColorClassForId(m.author_color) : '';
        let fc = m.author_font ? { 'fnt_cyber': 'font-cyber', 'fnt_gothic': 'font-gothic', 'fnt_rune': 'font-rune', 'fnt_glitch': 'font-glitch', 'fnt_western': 'font-western', 'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil', 'fnt_pixel': 'font-pixel', 'fnt_blood': 'font-blood', 'fnt_neon': 'font-neon', 'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic' }[m.author_font] || '' : '';
        let frc = m.author_frame ? (shopItems.frames.find(f => f.id === m.author_frame)?.cssClass || 'f-default') : 'f-default';
        let txt = (m.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
        txt = txt.replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:200px;max-height:200px;border:1px solid rgba(255,255,255,0.1);margin:5px 0;border-radius:12px;" onerror="this.style.display=\'none\'">');
        txt = txt.replace(/@all/g, '<span class="mention" style="color:#E91E63;font-weight:bold;">@all</span>');
        txt = txt.replace(/@(\S+)/g, (_, name) => '<span class="mention" onclick="window.showAgentInfo(\'' + name + '\')">@' + name + '</span>');
        let react = m.reactions || {}, rh = '';
        Object.keys(react).forEach(k => {
            if (k.endsWith('_by')) return;
            let ua = react[k + '_by'];
            let us = Array.isArray(ua) ? ua.join(', ') : '';
            let ia = Array.isArray(ua) && CA && ua.includes(CA.name);
            rh += '<span class="chat-reaction ' + (ia ? 'active' : '') + '" data-reaction="clan" data-msgid="' + m.id + '" data-emoji="' + k + '">' + k + ' ' + react[k] + '<span class="chat-reaction-tooltip">' + (us || '...') + '</span></span>';
        });
        let isOwn = m.author === CA?.name;
        let menu = '';
        if (m.id) {
            menu = '<span class="chat-menu-wrap"><button class="chat-menu-btn" data-menu-btn="clan' + m.id + '">⋯</button><div class="chat-menu-dropdown">';
            menu += '<div class="chat-menu-item" data-reply-clan="' + m.id + '" data-reply-author="' + m.author + '">↩ ОТВЕТИТЬ</div>';
            if (canPin) menu += '<div class="chat-menu-item" data-pin-clan="' + m.id + '">' + (m.pinned ? '📌 ОТКРЕПИТЬ' : '📌 ЗАКРЕПИТЬ') + '</div>';
            if (canDeleteOther && !isOwn) menu += '<div class="chat-menu-item" data-delete-clan-msg="' + m.id + '">🗑 УДАЛИТЬ</div>';
            if (isOwn) menu += '<div class="chat-menu-item" data-edit-clan-msg="' + m.id + '">✏️ РЕДАКТИРОВАТЬ</div>';
            if (isOwn) menu += '<div class="chat-menu-item" data-delete-clan-msg="' + m.id + '">🗑 УДАЛИТЬ</div>';
            menu += '</div></span>';
        }
        let avatarHtml = m.avatar_url ? '<img src="' + m.avatar_url + '" style="width:100%;height:100%;object-fit:cover;">' : '🕶️';
        return '<div class="chat-msg' + (m.pinned ? ' pinned' : '') + '" data-msg-id="' + m.id + '"><div class="chat-msg-left"><span class="chat-avatar-frame ' + frc + '"><span class="inner">' + avatarHtml + '</span></span></div><div class="chat-msg-right"><div class="chat-header-row"><span class="chat-author ' + cs + '" onclick="window.showAgentInfo(\'' + m.author + '\')" style="cursor:pointer;">' + (m.author || '???') + '</span><span class="chat-time">' + (m.time || '') + '</span>' + menu + '</div>' + (m.pinned ? '<div style="color:var(--warning);font-size:0.75rem;">📌 Закреплено</div>' : '') + '<div class="chat-text ' + fc + '">' + txt + '</div><div class="chat-reactions">' + rh + '<span class="chat-reaction" data-reaction-picker="clan" data-msgid="' + m.id + '">+</span></div></div></div>';
    }).join('');
    c.scrollTop = c.scrollHeight;
}

export async function deleteClanMessage(msgId) {
    if (!currentClanId) return;
    await supabase.from('clan_messages').delete().eq('id', parseInt(msgId));
    if (clanChats[currentClanId]) clanChats[currentClanId] = clanChats[currentClanId].filter(m => String(m.id) !== String(msgId));
    renderClanMessages(); notif('🗑 УДАЛЕНО');
}

export async function pinClanMessage(msgId) {
    if (!currentClanId) return;
    let msgs = clanChats[currentClanId] || [];
    let msg = msgs.find(m => String(m.id) === String(msgId));
    if (!msg) return;
    let np = !msg.pinned;
    await supabase.from('clan_messages').update({ pinned: np }).eq('id', parseInt(msgId));
    clanChats[currentClanId] = msgs.map(m => String(m.id) === String(msgId) ? { ...m, pinned: np } : m);
    renderClanMessages();
    notif(np ? '📌 ЗАКРЕПЛЕНО' : '📌 ОТКРЕПЛЕНО');
}

export async function editClanMessage(msgId) {
    let msgs = clanChats[currentClanId] || [];
    let msg = msgs.find(m => String(m.id) === String(msgId));
    if (!msg || msg.author !== CA?.name) return;
    let inp = document.getElementById('chat-input');
    inp.value = msg.text; inp.focus();
    replyTo = null; cancelReply();
    await supabase.from('clan_messages').delete().eq('id', parseInt(msgId));
    clanChats[currentClanId] = clanChats[currentClanId].filter(m => String(m.id) !== String(msgId));
    renderClanMessages();
}

export async function addClanReaction(msgId, emoji) {
    if (!currentClanId) return;
    let msgs = clanChats[currentClanId] || [];
    let msg = msgs.find(m => String(m.id) === String(msgId));
    if (!msg || !CA) return;
    if (!msg.reactions) msg.reactions = {};
    let key = emoji + '_by';
    if (!msg.reactions[key]) msg.reactions[key] = [];
    let ui = msg.reactions[key].indexOf(CA.name);
    if (ui !== -1) { msg.reactions[key].splice(ui, 1); msg.reactions[emoji] = Math.max(0, (msg.reactions[emoji] || 1) - 1); }
    else { msg.reactions[key].push(CA.name); msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1; }
    clanChats[currentClanId] = msgs.map(m => String(m.id) === String(msgId) ? { ...m, reactions: { ...msg.reactions } } : m);
    renderClanMessages();
    await supabase.from('clan_messages').update({ reactions: msg.reactions }).eq('id', parseInt(msgId));
}

function renderClanList() {
    let c = document.getElementById('chat-messages');
    c.style.display = 'block';
    c.innerHTML = '<div style="color:#E91E63;margin-bottom:10px;padding:10px;font-weight:600;">⚔️ ОТРЯД</div>';
    let myClan = clans.find(cl => cl.members && cl.members.find(m => m.name === CA?.name));
    if (myClan) c.innerHTML += '<div class="dm-list-item ' + (currentClanId === myClan.id ? 'active' : '') + '" data-open-clan="' + myClan.id + '"><span>' + myClan.emoji + ' ' + myClan.name + '</span></div>';
    else c.innerHTML += '<div style="color:#880000;padding:10px;">ВЫ НЕ В ОТРЯДЕ</div>';
    setTimeout(() => {
        document.querySelectorAll('[data-open-clan]').forEach(b => b.addEventListener('click', function() { openClanChat(parseInt(this.dataset.openClan)); }));
    }, 10);
}

export function replyToClanMessage(msgId, author) {
    let msgs = clanChats[currentClanId] || [];
    let msg = msgs.find(m => String(m.id) === String(msgId));
    if (!msg) return;
    replyTo = { msgId, author, text: msg.text.substring(0, 50) };
    let inp = document.getElementById('chat-input'); if (inp) { inp.value = '@' + author + ' '; inp.focus(); }
    let ri = document.getElementById('reply-indicator');
    ri.innerHTML = '<span>↩ Ответ для <b>' + author + '</b>: ' + msg.text.substring(0, 50) + '...</span><span style="cursor:pointer;" id="cancel-reply-btn">✕</span>';
    ri.style.display = 'flex';
    setTimeout(() => document.getElementById('cancel-reply-btn')?.addEventListener('click', cancelReply), 10);
}

// ==================== УПОМИНАНИЯ ====================
export async function loadMentionAgents() {
    let ag = await getAgents();
    mentionAgents = Object.keys(ag).filter(n => n !== CA?.name && n !== 'W-C26');
}

export function showMentionSuggestions(inputId) {
    let inp = document.getElementById(inputId);
    if (!inp) return;
    let val = inp.value;
    let atIdx = val.lastIndexOf('@');
    if (atIdx === -1) { hideMentionSuggestions(); return; }
    let query = val.substring(atIdx + 1).toLowerCase();
    if (query === '') { hideMentionSuggestions(); return; }
    let filtered = mentionAgents.filter(n => n.toLowerCase().includes(query));
    if (filtered.length === 0 || query === 'all') { hideMentionSuggestions(); return; }
    let sug = document.getElementById('mention-suggestions');
    sug.innerHTML = filtered.map(n => '<div class="mention-item" data-mention-name="' + n + '" data-mention-input="' + inputId + '">@' + n + '</div>').join('');
    let rect = inp.getBoundingClientRect();
    sug.style.left = rect.left + 'px';
    sug.style.top = (rect.top - 200) + 'px';
    if (rect.top < 200) sug.style.top = (rect.bottom + 5) + 'px';
    sug.style.display = 'block';
    sug.style.width = Math.max(rect.width, 150) + 'px';
    setTimeout(() => {
        document.querySelectorAll('[data-mention-name]').forEach(item => {
            item.onclick = function() {
                let name = this.dataset.mentionName;
                let targetInput = document.getElementById(this.dataset.mentionInput);
                let val = targetInput.value;
                let atIdx = val.lastIndexOf('@');
                targetInput.value = val.substring(0, atIdx) + '@' + name + ' ';
                hideMentionSuggestions(); targetInput.focus();
            };
        });
    }, 10);
}

export function hideMentionSuggestions() {
    let el = document.getElementById('mention-suggestions');
    if (el) el.style.display = 'none';
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ====================
export function updateBadgeIcons() {
    let chatIcon = document.getElementById('icon-chat');
    if (chatIcon) {
        let b = chatIcon.querySelector('.icon-badge');
        let total = unreadMentions.chat + unreadMentions.clan;
        if (total > 0) { if (!b) { b = document.createElement('span'); b.className = 'icon-badge'; chatIcon.appendChild(b); } b.textContent = total; }
        else if (b) b.remove();
    }
    let dmIcon = document.getElementById('icon-dm');
    if (dmIcon) {
        let b = dmIcon.querySelector('.icon-badge');
        if (unreadMentions.dm > 0) { if (!b) { b = document.createElement('span'); b.className = 'icon-badge'; dmIcon.appendChild(b); } b.textContent = unreadMentions.dm; }
        else if (b) b.remove();
    }
}

export function showReactionPickerUniversal(msgId, el, fn) {
    document.querySelectorAll('.reaction-picker').forEach(p => p.remove());
    let p = document.createElement('div');
    p.className = 'reaction-picker';
    const EMOJIS = ['👍', '❤', '😂', '🔥', '💀', '😡', '🎯', '👏', '🫡', '💯', '🤝', '⚡', '💎', '🎪', '🌑'];
    EMOJIS.forEach(e => {
        let s = document.createElement('span');
        s.style.cssText = 'cursor:pointer;font-size:1.5rem;padding:4px 6px;';
        s.textContent = e;
        s.onclick = function(ev) { ev.stopPropagation(); fn(msgId, e); p.remove(); };
        p.appendChild(s);
    });
    document.body.appendChild(p);
    let r = el.getBoundingClientRect();
    let l = r.left, t = r.top - p.offsetHeight - 5;
    if (t < 0) t = r.bottom + 5;
    if (l + 300 > innerWidth) l = innerWidth - 310;
    p.style.left = l + 'px';
    p.style.top = t + 'px';
    setTimeout(() => {
        document.addEventListener('click', function cp(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', cp); } });
    }, 100);
}

export async function editMessage(msgId) {
    let msg = chatMessages.find(m => m.id == msgId);
    if (!msg || msg.author !== CA?.name) return;
    let inp = document.getElementById('chat-input');
    inp.value = msg.text; inp.focus();
    replyTo = null; cancelReply();
    await supabase.from('chat_messages').delete().eq('id', msgId);
    chatMessages = chatMessages.filter(m => m.id != msgId);
    renderChat();
}

export function isClanChatActive() { return chatTabActive === 'clan' && currentClanId !== null; }

export {
    chatMessages, chatChannel, chatTabActive, replyTo, dmReplyTo,
    chatPage, unreadMentions, adminMessages, adminChannel,
    dmMessagesAll, dmChannel, currentDM, clanChats,
    currentClanId, clanChannel, pinnedChatSubscription, mentionAgents
};