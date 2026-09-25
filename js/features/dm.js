// ============================================================
// FEATURES / DM — личные сообщения
// ============================================================
// Всё, что связано с ЛС: список диалогов, отправка, реакции,
// удаление, ответы.

import { supabase, CA, activeItems, loadAgent } from '../auth.js';
import { shopItems, getActiveColorClassForId } from '../shop.js';
import { notif, glowIcon } from '../utils.js';
import { playSound } from '../sounds.js';
import { FONT_MAP, getAgentFx } from '../ui/renderFx.js';
import { showChannelDot, hideChannelDot, bumpUnread, isDmOpenFor } from '../chat.js';

// ============================================================
// СОСТОЯНИЕ
// ============================================================
let dmMessagesAll = [];
let dmChannel = null;
let currentDM = null;
let dmReplyTo = null;

// ============================================================
// ЗАГРУЗКА
// ============================================================
export async function loadDMMessages() {
    if (!CA) return;
    try {
        let { data } = await supabase.from('dm_messages')
            .select('*')
            .or('from_agent.eq.' + CA.name + ',to_agent.eq.' + CA.name)
            .order('id', { ascending: true });
        if (data) {
            dmMessagesAll = data;
            renderDMList();
        }
    } catch (e) {}
}

// ============================================================
// REALTIME
// ============================================================
export function subscribeDM() {
    if (dmChannel) supabase.removeChannel(dmChannel);
    dmChannel = supabase.channel('dm-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, payload => {
            let msg = payload.new;
            if (msg.to_agent !== CA?.name && msg.from_agent !== CA?.name) return;

            dmMessagesAll.push(msg);

            if (msg.from_agent !== CA?.name && isDmOpenFor(msg.from_agent)) {
                playSound('receive');
            }

            if (msg.text && msg.text.includes('@' + CA.name)) {
                notif('📩 ВАС УПОМЯНУЛИ В ЛИЧКЕ');
                bumpUnread('dm');
            }

            glowIcon('icon-dm');

            if (msg.from_agent !== CA?.name && currentDM !== msg.from_agent) {
                showChannelDot('dm');
            }

            renderDMList();
            if (currentDM === msg.from_agent || currentDM === msg.to_agent) {
                renderDMMessages();
            }
        })
        .subscribe();
}

// ============================================================
// ОТКРЫТИЕ ДИАЛОГА
// ============================================================
export function openDM(agent) {
    currentDM = agent;
    window.__currentDM = agent;
    hideChannelDot('dm');
    renderDMList();
    renderDMMessages();
}

export function startDM(agent) {
    if (window.innerWidth <= 768) {
        let ab = document.getElementById('announce-toggle-btn');
        if (ab) ab.style.display = 'none';
    }
    let wall = document.getElementById('announcements-wall');
    if (wall) wall.style.display = 'none';
    currentDM = agent;
    window.__currentDM = agent;
    hideChannelDot('dm');
    if (typeof window.openApp === 'function') window.openApp('dm');
}

// ============================================================
// СПИСОК ДИАЛОГОВ
// ============================================================
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
            list.innerHTML += '<div class="dm-list-item ' + (currentDM === a ? 'active' : '') + '">' +
                '<span>' + a + '</span>' +
                '<span class="chat-menu-wrap"><button class="chat-menu-btn" data-dm-delete-btn="' + a + '">⋯</button></span>' +
                '</div>';
        });
    }

    setTimeout(() => {
        document.querySelectorAll('[data-dm-delete-btn]').forEach(b => {
            b.addEventListener('click', async function(e) {
                e.stopPropagation();
                let agent = this.dataset.dmDeleteBtn;
                document.getElementById('delete-dm-name').textContent = 'Диалог с агентом: ' + agent;
                let modal = document.getElementById('modal-delete-dm');
                modal.style.display = 'flex';
                modal.classList.add('show');

                document.getElementById('confirm-delete-dm-btn').onclick = async function() {
                    await supabase.from('dm_messages').delete().or(
                        'and(from_agent.eq.' + CA.name + ',to_agent.eq.' + agent + '),' +
                        'and(from_agent.eq.' + agent + ',to_agent.eq.' + CA.name + ')'
                    );
                    dmMessagesAll = dmMessagesAll.filter(m =>
                        !(m.from_agent === CA.name && m.to_agent === agent) &&
                        !(m.from_agent === agent && m.to_agent === CA.name)
                    );
                    if (currentDM === agent) { currentDM = null; window.__currentDM = null; }
                    renderDMList();
                    renderDMMessages();
                    notif('🗑 Диалог удалён');
                    window.closeModal('modal-delete-dm');
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

// ============================================================
// СООБЩЕНИЯ ДИАЛОГА
// ============================================================
export function renderDMMessages() {
    let c = document.getElementById('dm-messages');
    if (!currentDM || !CA) {
        if (c) c.innerHTML = '<div style="text-align:center;color:#880000;">ВЫБЕРИТЕ ДИАЛОГ</div>';
        return;
    }

    let msgs = dmMessagesAll.filter(m =>
        (m.from_agent === CA.name && m.to_agent === currentDM) ||
        (m.from_agent === currentDM && m.to_agent === CA.name)
    );

    if (msgs.length === 0) {
        c.innerHTML = '<div style="text-align:center;color:#880000;">НЕТ СООБЩЕНИЙ</div>';
        return;
    }

    c.innerHTML = msgs.map(m => {
        let cs = m.author_color ? getActiveColorClassForId(m.author_color) : '';
        let fc = m.author_font ? (FONT_MAP[m.author_font] || '') : '';
        let frc = m.author_frame
            ? (shopItems.frames.find(f => f.id === m.author_frame)?.cssClass || 'f-default')
            : 'f-default';
        let replyText = (m.text || '').substring(0, 50).replace(/'/g, "\\'");

        let react = m.reactions || {}, rh = '';
        Object.keys(react).forEach(k => {
            if (k.endsWith('_by')) return;
            let ua = react[k + '_by'];
            let us = Array.isArray(ua) ? ua.join(', ') : '';
            let ia = Array.isArray(ua) && CA && ua.includes(CA.name);
            rh += '<span class="chat-reaction ' + (ia ? 'active' : '') +
                '" data-reaction="dm" data-msgid="' + m.id + '" data-emoji="' + k + '">' +
                k + ' ' + react[k] +
                '<span class="chat-reaction-tooltip">' + (us || '...') + '</span></span>';
        });

        let menu = '<span class="chat-menu-wrap">' +
            '<button class="chat-menu-btn" data-menu-btn="dm' + m.id + '">⋯</button>' +
            '<div class="chat-menu-dropdown">' +
            '<div class="chat-menu-item" data-reply-dm="' + m.id + '" data-reply-author="' + m.from_agent + '" data-reply-text="' + replyText + '">↩ ОТВЕТИТЬ</div>' +
            (m.from_agent === CA?.name ? '<div class="chat-menu-item" data-delete-dm-msg="' + m.id + '">🗑 УДАЛИТЬ</div>' : '') +
            '</div></span>';

        let txt = (m.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
        txt = txt.replace(/\[img\](.*?)\[\/img\]/g,
            '<img src="$1" style="max-width:200px;max-height:200px;border:1px solid rgba(255,255,255,0.1);margin:5px 0;border-radius:12px;" onerror="this.style.display=\'none\'">');
        txt = txt.replace(/@(\S+)/g, (_, name) =>
            '<span class="mention" onclick="window.showAgentInfo(\'' + name + '\')">@' + name + '</span>');

        let replyHtml = m.reply_to
            ? '<div style="color:#880000;font-size:0.7rem;margin-bottom:2px;">↩ ' + (m.reply_author || '???') + ': ' + (m.reply_text || '...') + '</div>'
            : '';

        let avatarHtml = m.avatar_url
            ? '<img src="' + m.avatar_url + '" style="width:100%;height:100%;object-fit:cover;">'
            : '🕶️';

        return '<div class="chat-msg">' +
            '<div class="chat-msg-left">' +
            '<span class="chat-avatar-frame ' + frc + '">' +
            '<span class="inner">' + avatarHtml + '</span></span></div>' +
            '<div class="chat-msg-right">' + replyHtml +
            '<div class="chat-header-row">' +
            '<span class="chat-author ' + cs + '" onclick="window.showAgentInfo(\'' + m.from_agent + '\')" style="cursor:pointer;">' + m.from_agent + '</span>' +
            '<span class="chat-time">' + m.time + '</span>' + menu +
            '</div>' +
            '<div class="chat-text ' + fc + '">' + txt + '</div>' +
            '<div class="chat-reactions">' + rh +
            '<span class="chat-reaction" data-reaction-picker="dm" data-msgid="' + m.id + '">+</span>' +
            '</div></div></div>';
    }).join('');

    c.scrollTop = c.scrollHeight;
}

// ============================================================
// ОТПРАВКА
// ============================================================
export async function sendDM() {
    let inp = document.getElementById('dm-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA || !currentDM) return;
    if (CA.muted) return notif('🔇 ВЫ ЗАМУЧЕНЫ');

    let mentions = msg.match(/@(\S+)/g);
    if (mentions) {
        for (let m of mentions) {
            let name = m.substring(1);
            let ag = await loadAgent(name);
            if (!ag) notif('⛔ АГЕНТ ' + name + ' НЕ НАЙДЕН');
        }
    }

    let md = {
        from_agent: CA.name,
        to_agent: currentDM,
        avatar_url: CA.avatar_url || '',
        text: msg,
        time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }),
        author_color: activeItems.color,
        author_frame: activeItems.frame,
        author_badge: activeItems.badge,
        author_font: activeItems.font,
        reactions: {}
    };

    if (dmReplyTo) {
        md.reply_to = dmReplyTo.msgId;
        md.reply_author = dmReplyTo.author;
        md.reply_text = dmReplyTo.text;
    }

    try { await supabase.from('dm_messages').insert(md); } catch (e) {}

    playSound('send');
    inp.value = '';
    if (inp.tagName === 'TEXTAREA') inp.style.height = '36px';
    dmReplyTo = null;
    cancelDmReply();
}

// ============================================================
// РЕАКЦИИ
// ============================================================
export async function addDMReaction(msgId, emoji) {
    let msg = dmMessagesAll.find(m => m.id == msgId);
    if (!msg || !CA) return;
    if (!msg.reactions) msg.reactions = {};

    let key = emoji + '_by';
    if (!msg.reactions[key]) msg.reactions[key] = [];

    let ui = msg.reactions[key].indexOf(CA.name);
    if (ui !== -1) {
        msg.reactions[key].splice(ui, 1);
        msg.reactions[emoji] = Math.max(0, (msg.reactions[emoji] || 1) - 1);
    } else {
        msg.reactions[key].push(CA.name);
        msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    }

    dmMessagesAll = dmMessagesAll.map(m => m.id == msgId ? { ...m, reactions: msg.reactions } : m);
    renderDMMessages();
    await supabase.from('dm_messages').update({ reactions: msg.reactions }).eq('id', parseInt(msgId));
}

// ============================================================
// УДАЛЕНИЕ
// ============================================================
export async function deleteDMMessage(msgId) {
    await supabase.from('dm_messages').delete().eq('id', parseInt(msgId));
    dmMessagesAll = dmMessagesAll.filter(m => String(m.id) !== String(msgId));
    renderDMMessages();
    notif('🗑 Удалено');
}

// ============================================================
// ОТВЕТЫ
// ============================================================
export function replyToDMMessage(msgId, author, text) {
    let msg = dmMessagesAll.find(m => String(m.id) === String(msgId));
    if (msg) text = msg.text.substring(0, 50);

    dmReplyTo = { msgId, author, text };

    let inp = document.getElementById('dm-input');
    if (inp) { inp.value = '@' + author + ' '; inp.focus(); }

    let ri = document.getElementById('dm-reply-indicator');
    if (!ri) {
        ri = document.createElement('div');
        ri.id = 'dm-reply-indicator';
        ri.className = 'reply-indicator';
        ri.style.display = 'none';
        let dmMessages = document.getElementById('dm-messages');
        if (dmMessages) dmMessages.parentNode.insertBefore(ri, dmMessages.nextSibling);
    }
    ri.innerHTML = '<span>↩ Ответ для <b>' + author + '</b>: ' + text + '...</span>' +
        '<span style="cursor:pointer;" id="cancel-dm-reply-btn">✕</span>';
    ri.style.display = 'flex';

    setTimeout(() => {
        document.getElementById('cancel-dm-reply-btn')?.addEventListener('click', cancelDmReply);
    }, 10);
}

export function cancelDmReply() {
    dmReplyTo = null;
    let ri = document.getElementById('dm-reply-indicator');
    if (ri) ri.style.display = 'none';
}

// ============================================================
// ПРОКИДКА В WINDOW
// ============================================================
window.replyToDMMessage = replyToDMMessage;
window.cancelDmReply = cancelDmReply;

// ============================================================
// ЭКСПОРТЫ
// ============================================================
export {
    dmMessagesAll,
    dmChannel,
    currentDM,
    dmReplyTo
};