// ============================================================
// RP / ТЕКСТОВО-РОЛЕВОЙ ЧАТ + СПЕКТАКЛИ
// v3.0.0: клик на сообщение → модалка персонажа
// ============================================================

import { supabase, CA, getAgents } from './auth.js';
import { notif, timeAgo, closeModal } from './utils.js';
import { playSound } from './sounds.js';
import { shopItems, getActiveColorClassForId } from './shop.js';
import { RP_RACES } from './config.js';

// ==================== СОСТОЯНИЕ ====================
let rpCharacters = [];
let rpMessages = [];
let rpChannel = null;
let currentRpChar = null;
let currentRpRoom = 'space-x';
let rpScenes = [];
let rpReplyTo = null;

let currentSceneId = null;
let sceneMessages = [];
let sceneChannel = null;
let sceneReplyTo = null;
let currentSceneData = null;
let sceneCoverTimer = null;

// ==================== ЭФФЕКТЫ ====================
function fx(name) {
    if (typeof window.__getAgentFx === 'function') return window.__getAgentFx(name);
    let colorCls = '';
    let frameCls = 'f-default';
    let roleBadge = '';
    return { colorCls, fontCls: '', frameCls, badgeHtml: '', roleBadge, avatar: '' };
}

function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==================== ПЕРСОНАЖИ ====================
export async function loadRpCharacters() {
    if (!CA) return;
    try {
        let { data } = await supabase.from('rp_characters')
            .select('*').eq('owner', CA.name)
            .order('created_at', { ascending: false });
        if (data) rpCharacters = data;
    } catch (e) {}
}

export async function createRpCharacter(charData) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    if (!charData.name || charData.name.length < 2 || charData.name.length > 30) {
        return { success: false, error: '⛔ Имя 2-30 символов' };
    }
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
        playSound('achieve');
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
    if (!currentRpChar) { notif('⚠ Сначала создай персонажа'); return false; }
    return true;
}

// ==================== МОДАЛКА ПЕРСОНАЖА ====================
export function showRpCharInfo(charName, charOwner) {
    if (!charName || !charOwner) return;

    // Удаляем старую модалку если есть
    let old = document.getElementById('modal-rp-char-view');
    if (old) old.remove();

    // Свой персонаж — берём из памяти
    let char = null;
    if (CA && charOwner === CA.name) {
        char = rpCharacters.find(c => c.name === charName);
    }
    if (char) {
        renderRpCharModal(char);
        return;
    }

    // Чужой — грузим из БД
    supabase.from('rp_characters').select('*').eq('name', charName).eq('owner', charOwner).maybeSingle().then(({ data }) => {
        if (data) renderRpCharModal(data);
        else notif('⛔ Персонаж не найден');
    });
}

function renderRpCharModal(char) {
    let raceObj = RP_RACES.find(r => r.id === char.race) || RP_RACES[0];
    let html = '<div class="modal-box" style="padding:0;overflow:hidden;max-width:500px;">' +
        '<button class="profile-close-top" id="rp-char-close-btn">✕</button>' +
        '<div style="padding:20px;">' +
        '<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px;">' +
        '<div class="chat-avatar-frame" style="width:80px;height:80px;border-radius:8px;">' +
        '<div class="inner" style="font-size:2rem;">' +
        (char.avatar_url ? '<img src="' + char.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">' : '🎭') +
        '</div></div>' +
        '<div>' +
        '<div style="font-size:1.4rem;font-weight:700;color:var(--accent);">' + escapeHtml(char.name) + '</div>' +
        '<div style="color:var(--text-3);font-size:0.85rem;margin-top:4px;">' + raceObj.icon + ' ' + raceObj.name + (char.age ? ' · ' + char.age + ' лет' : '') + (char.gender ? ' · ' + escapeHtml(char.gender) : '') + '</div>' +
        (char.role ? '<div style="color:var(--text-2);font-size:0.85rem;margin-top:4px;">' + escapeHtml(char.role) + '</div>' : '') +
        '</div></div>' +
        (char.character ? '<div style="margin-bottom:12px;"><div style="color:var(--accent);font-size:0.75rem;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">Характер</div><div style="color:var(--text-2);font-size:0.85rem;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(char.character) + '</div></div>' : '') +
        (char.biography ? '<div style="margin-bottom:12px;"><div style="color:var(--accent);font-size:0.75rem;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">Биография</div><div style="color:var(--text-2);font-size:0.85rem;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(char.biography) + '</div></div>' : '') +
        '<div style="color:var(--text-4);font-size:0.75rem;margin-top:8px;">Владелец: <span style="color:var(--accent);cursor:pointer;" id="rp-char-owner-link">' + escapeHtml(char.owner) + '</span></div>' +
        '</div></div>';

    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.id = 'modal-rp-char-view';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    // Закрытие
    document.getElementById('rp-char-close-btn').onclick = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 200);
    };
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 200);
        }
    });
    // Клик по владельцу → профиль
    document.getElementById('rp-char-owner-link').onclick = () => {
        modal.remove();
        if (typeof window.showAgentInfo === 'function') window.showAgentInfo(char.owner);
    };
}

// ==================== РП-ЧАТ (SPACE-X) ====================
export async function loadRpMessages(room = 'space-x') {
    try {
        let { data } = await supabase.from('rp_messages')
            .select('*').eq('room', 'space-x')
            .order('id', { ascending: false }).limit(100);
        if (data) { rpMessages = data.reverse(); renderRpMessages(); }
    } catch (e) {}
}

export function subscribeRpChat(room = 'space-x') {
    if (rpChannel) supabase.removeChannel(rpChannel);
    rpChannel = supabase.channel('rp-space-x')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rp_messages', filter: 'room=eq.space-x' }, payload => {
            rpMessages.push(payload.new);
            if (payload.new.owner !== CA?.name) playSound('receive');
            renderRpMessages();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rp_messages', filter: 'room=eq.space-x' }, payload => {
            let idx = rpMessages.findIndex(m => m.id === payload.new.id);
            if (idx !== -1) rpMessages[idx] = payload.new;
            renderRpMessages();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rp_messages' }, payload => {
            rpMessages = rpMessages.filter(m => m.id !== payload.old.id);
            renderRpMessages();
        })
        .subscribe();
}

export async function sendRpMessage() {
    let inp = document.getElementById('rp-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA || !currentRpChar) {
        if (!currentRpChar) notif('⚠ Выбери персонажа');
        return;
    }
    let md = {
        room: 'space-x',
        owner: CA.name,
        char_name: currentRpChar.name,
        char_avatar_url: currentRpChar.avatar_url || '',
        char_race: currentRpChar.race || '',
        text: msg,
        time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }),
        reactions: {}
    };
    if (rpReplyTo) {
        md.reply_to = rpReplyTo.msgId;
        md.reply_char_name = rpReplyTo.char_name;
        md.reply_text = rpReplyTo.text;
    }
    try { await supabase.from('rp_messages').insert(md); } catch (e) {}
    playSound('send');
    inp.value = '';
    rpReplyTo = null;
    cancelRpReply();
}

export function renderRpMessages() {
    let c = document.getElementById('rp-messages');
    if (!c) return;
    if (rpMessages.length === 0) {
        c.innerHTML = '<div class="empty-state">Сообщений пока нет</div>';
        return;
    }
    c.innerHTML = rpMessages.map(m => {
        let e = fx(m.owner);
        let avatarHtml = m.char_avatar_url
            ? '<img src="' + m.char_avatar_url + '" style="width:100%;height:100%;object-fit:cover;">'
            : '🎭';
        let txt = (m.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
        txt = txt.replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:200px;max-height:200px;border:1px solid rgba(255,255,255,0.1);margin:6px 0;border-radius:12px;" onerror="this.style.display=\'none\'">');
        txt = txt.replace(/@(\S+)/g, (_, name) => '<span class="mention" onclick="event.stopPropagation();window.showAgentInfo(\'' + name + '\')">@' + name + '</span>');

        let react = m.reactions || {}, rh = '';
        Object.keys(react).forEach(k => {
            if (k.endsWith('_by')) return;
            let ua = react[k + '_by'];
            let us = Array.isArray(ua) ? ua.join(', ') : '';
            let ia = Array.isArray(ua) && CA && ua.includes(CA.name);
            rh += '<span class="chat-reaction ' + (ia ? 'active' : '') + '" data-reaction="rp" data-msgid="' + m.id + '" data-emoji="' + k + '">' + k + ' ' + react[k] + '<span class="chat-reaction-tooltip">' + (us || '...') + '</span></span>';
        });

        let isOwn = m.owner === CA?.name;
        let canMod = CA && (CA.role === 'admin' || CA.role === 'moderator');
        let canDelete = isOwn || canMod;
        let menu = '';
        if (m.id) {
            menu = '<span class="chat-menu-wrap"><button class="chat-menu-btn" data-menu-btn="rp' + m.id + '">⋯</button><div class="chat-menu-dropdown">';
            menu += '<div class="chat-menu-item" data-reply-rp="' + m.id + '" data-reply-char-name="' + (m.char_name || '') + '" data-reply-text="' + ((m.text || '').substring(0, 50).replace(/'/g, "\\'")) + '">↩ ОТВЕТИТЬ</div>';
            if (canDelete) menu += '<div class="chat-menu-item" data-delete-rp-msg="' + m.id + '">🗑 УДАЛИТЬ</div>';
            if (isOwn) menu += '<div class="chat-menu-item" data-edit-rp-msg="' + m.id + '">✏️ РЕДАКТИРОВАТЬ</div>';
            menu += '</div></span>';
        }

        let replyHtml = m.reply_to
            ? '<div style="color:#880000;font-size:0.7rem;margin-bottom:2px;">↩ ' + (m.reply_char_name || '???') + ': ' + (m.reply_text || '...') + '</div>'
            : '';

        return '<div class="chat-msg" data-msg-id="' + m.id + '" data-rp-char="' + escapeHtml(m.char_name || '') + '" data-rp-owner="' + escapeHtml(m.owner || '') + '" style="cursor:pointer;">' +
            '<div class="chat-msg-left"><div class="chat-avatar-frame f-default"><div class="inner">' + avatarHtml + '</div></div></div>' +
            '<div class="chat-msg-right">' + replyHtml +
            '<div class="chat-header-row">' +
            '<span class="chat-author name-with-badge rp-message-author ' + e.colorCls + ' ' + e.fontCls + '" style="color:var(--accent);" onclick="event.stopPropagation();window.showAgentInfo(\'' + m.owner + '\')">' + m.char_name + e.roleBadge + e.badgeHtml + '</span>' +
            '<span style="color:var(--text-3);font-size:0.7rem;">(' + m.owner + ')</span>' +
            '<span class="chat-time">' + m.time + '</span>' + menu +
            '</div>' +
            '<div class="chat-text ' + e.fontCls + '" style="font-style:italic;">' + txt + '</div>' +
            '<div class="chat-reactions">' + rh + '<span class="chat-reaction" data-reaction-picker="rp" data-msgid="' + m.id + '">+</span></div>' +
            '</div></div>';
    }).join('');
    c.scrollTop = c.scrollHeight;
}

export async function addRpReaction(msgId, emoji) {
    let msg = rpMessages.find(m => m.id == msgId);
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
    await supabase.from('rp_messages').update({ reactions: msg.reactions }).eq('id', parseInt(msgId));
    rpMessages = rpMessages.map(m => m.id == msgId ? { ...m, reactions: msg.reactions } : m);
    renderRpMessages();
}

export async function deleteRpMessage(msgId) {
    let msg = rpMessages.find(m => m.id == msgId);
    if (!msg) return;
    let canMod = CA && (CA.role === 'admin' || CA.role === 'moderator');
    if (msg.owner !== CA?.name && !canMod) return notif('⛔ Нет прав');
    rpMessages = rpMessages.filter(m => String(m.id) !== String(msgId));
    renderRpMessages();
    await supabase.from('rp_messages').delete().eq('id', parseInt(msgId));
    notif('🗑 Удалено');
}

export async function editRpMessage(msgId) {
    let msg = rpMessages.find(m => m.id == msgId);
    if (!msg || msg.owner !== CA?.name) return;
    let inp = document.getElementById('rp-input');
    inp.value = msg.text;
    inp.focus();
    rpReplyTo = null;
    cancelRpReply();
    rpMessages = rpMessages.filter(m => String(m.id) !== String(msgId));
    renderRpMessages();
    await supabase.from('rp_messages').delete().eq('id', parseInt(msgId));
}

export function replyToRpMessage(msgId, charName, text) {
    rpReplyTo = { msgId, char_name: charName, text };
    let inp = document.getElementById('rp-input');
    if (inp) { inp.value = ''; inp.focus(); }
    let ri = document.getElementById('rp-reply-indicator');
    if (!ri) {
        ri = document.createElement('div');
        ri.id = 'rp-reply-indicator';
        ri.className = 'reply-indicator';
        ri.style.display = 'none';
        let rpMessagesEl = document.getElementById('rp-messages');
        if (rpMessagesEl) rpMessagesEl.parentNode.insertBefore(ri, rpMessagesEl.nextSibling);
    }
    ri.innerHTML = '<span>↩ Ответ для <b>' + charName + '</b>: ' + text + '...</span><span style="cursor:pointer;" id="cancel-rp-reply-btn">✕</span>';
    ri.style.display = 'flex';
    setTimeout(() => document.getElementById('cancel-rp-reply-btn')?.addEventListener('click', cancelRpReply), 10);
}

export function cancelRpReply() {
    rpReplyTo = null;
    let ri = document.getElementById('rp-reply-indicator');
    if (ri) ri.style.display = 'none';
}

export function switchRpRoom(room) {
    currentRpRoom = 'space-x';
    loadRpMessages('space-x');
    subscribeRpChat('space-x');
}

// ==================== СПЕКТАКЛИ ====================
export async function loadRpScenes() {
    try {
        let { data } = await supabase.from('rp_scenes')
            .select('*').order('created_at', { ascending: false });
        if (data) {
            rpScenes = data;
            window.__rpScenes = data;
        }
    } catch (e) {}
}

export async function loadSceneCovers(sceneId) {
    try {
        let { data } = await supabase.from('rp_scene_images')
            .select('*').eq('scene_id', sceneId)
            .order('position', { ascending: true });
        return data || [];
    } catch (e) { return []; }
}

export async function loadFirstCovers() {
    if (rpScenes.length === 0) return {};
    let result = {};
    try {
        let ids = rpScenes.map(s => s.id);
        let { data } = await supabase.from('rp_scene_images')
            .select('scene_id, image_url, position')
            .in('scene_id', ids)
            .order('position', { ascending: true });
        (data || []).forEach(c => {
            if (!result[c.scene_id]) result[c.scene_id] = c.image_url;
        });
    } catch (e) {}
    window.__sceneFirstCovers = result;
    return result;
}

export async function createRpScene(title, description, coverFiles) {
    if (!CA || !currentRpChar) return { success: false, error: '⚠ Нужен персонаж' };
    try {
        let { data: scene, error } = await supabase.from('rp_scenes').insert({
            title,
            description,
            author: CA.name,
            char_name: currentRpChar.name,
            char_avatar_url: currentRpChar.avatar_url || '',
            players: []
        }).select().single();
        if (error) return { success: false, error: error.message };

        if (coverFiles && coverFiles.length > 0) {
            for (let i = 0; i < Math.min(coverFiles.length, 5); i++) {
                let url = await uploadSceneCover(scene.id, coverFiles[i], i);
                if (url) {
                    await supabase.from('rp_scene_images').insert({
                        scene_id: scene.id, image_url: url, position: i
                    });
                }
            }
        }

        await loadRpScenes();
        notif('✅ Спектакль создан');
        playSound('achieve');
        return { success: true, scene };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function editRpScene(sceneId, title, description, coverFiles) {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
        let { data: scene } = await supabase.from('rp_scenes').select('*').eq('id', sceneId).maybeSingle();
        if (!scene) return { success: false, error: 'Спектакль не найден' };
        let canEdit = scene.author === CA.name || CA.role === 'admin' || CA.role === 'moderator';
        if (!canEdit) return { success: false, error: 'Нет прав' };

        await supabase.from('rp_scenes').update({ title, description }).eq('id', sceneId);

        let covers = window.__sceneCovers || [];
        let keptUrls = covers.filter(c => !c.isNew).map(c => c.url);
        let newFiles = covers.filter(c => c.isNew).map(c => c.file);

        await supabase.from('rp_scene_images').delete().eq('scene_id', sceneId);

        for (let i = 0; i < keptUrls.length; i++) {
            await supabase.from('rp_scene_images').insert({
                scene_id: sceneId, image_url: keptUrls[i], position: i
            });
        }

        let offset = keptUrls.length;
        for (let i = 0; i < newFiles.length; i++) {
            if (offset + i >= 5) break;
            let url = await uploadSceneCover(sceneId, newFiles[i], offset + i);
            if (url) {
                await supabase.from('rp_scene_images').insert({
                    scene_id: sceneId, image_url: url, position: offset + i
                });
            }
        }

        await loadRpScenes();
        notif('✅ Спектакль обновлён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteRpScene(sceneId) {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
        let { data: scene } = await supabase.from('rp_scenes').select('*').eq('id', sceneId).maybeSingle();
        if (!scene) return { success: false, error: 'Спектакль не найден' };
        let canDel = scene.author === CA.name || CA.role === 'admin' || CA.role === 'moderator';
        if (!canDel) return { success: false, error: 'Нет прав' };

        await supabase.from('rp_scene_images').delete().eq('scene_id', sceneId);
        await supabase.from('rp_scene_messages').delete().eq('scene_id', sceneId);
        await supabase.from('rp_scenes').delete().eq('id', sceneId);

        await loadRpScenes();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

async function uploadSceneCover(sceneId, file, position) {
    if (!file || file.size > 2 * 1024 * 1024) return null;
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = (e) => {
            let img = new Image();
            img.onload = async () => {
                let canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 400;
                let ctx = canvas.getContext('2d');
                let ratio = Math.max(800 / img.width, 400 / img.height);
                let w = img.width * ratio, h = img.height * ratio;
                let sx = (w - 800) / 2 / ratio;
                let sy = (h - 400) / 2 / ratio;
                ctx.drawImage(img, sx, sy, 800 / ratio, 400 / ratio, 0, 0, 800, 400);

                canvas.toBlob(async (blob) => {
                    let fn = 'scene_' + sceneId + '_' + position + '_' + Date.now() + '.png';
                    let { error } = await supabase.storage.from('avatars')
                        .upload(fn, blob, { upsert: true, contentType: 'image/png' });
                    if (error) { resolve(null); return; }
                    let { data } = supabase.storage.from('avatars').getPublicUrl(fn);
                    resolve(data.publicUrl);
                }, 'image/png');
            };
            img.onerror = () => resolve(null);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

export async function renderRpScenes() {
    let c = document.getElementById('rp-scenes-list');
    if (!c) return;

    await loadFirstCovers();
    let covers = window.__sceneFirstCovers || {};

    if (rpScenes.length === 0) {
        c.innerHTML = '<div class="empty-state">Спектаклей пока нет</div>';
        return;
    }

    c.innerHTML = rpScenes.map(s => {
        let cover = covers[s.id];
        let coverHtml = cover
            ? '<div class="scene-card-cover"><img src="' + cover + '" onerror="this.style.display=\'none\'"></div>'
            : '<div class="scene-card-cover" style="display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:1.5rem;">🎬</div>';

        let isMine = CA && (s.author === CA.name);
        let canMod = CA && (CA.role === 'admin' || CA.role === 'moderator');
        let canEdit = isMine || canMod;
        let e = fx(s.author);

        let actions = '';
        if (canEdit) {
            actions = '<div style="display:flex;gap:4px;margin-left:auto;" onclick="event.stopPropagation();">' +
                '<button class="btn secondary" data-edit-scene="' + s.id + '" style="padding:4px 8px;font-size:0.7rem;">✏</button>' +
                '<button class="btn danger" data-delete-scene="' + s.id + '" style="padding:4px 8px;font-size:0.7rem;">🗑</button>' +
                '</div>';
        }

        return '<div class="card" style="padding:14px;margin-bottom:8px;cursor:pointer;display:flex;gap:12px;align-items:flex-start;" data-open-scene="' + s.id + '">' +
            coverHtml +
            '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:700;display:flex;align-items:center;gap:6px;">' + escapeHtml(s.title) + (canEdit ? '' : '<span style="color:var(--accent);font-size:1.2rem;margin-left:auto;">▸</span>') + '</div>' +
            '<div style="color:var(--text-3);font-size:0.75rem;margin-top:2px;display:flex;gap:6px;align-items:center;">' +
            '<span class="name-with-badge ' + e.colorCls + '" onclick="event.stopPropagation();window.showAgentInfo(\'' + escapeHtml(s.author) + '\')" style="cursor:pointer;">' + escapeHtml(s.char_name || s.author) + e.roleBadge + '</span>' +
            '<span>· ' + timeAgo(s.created_at) + '</span>' +
            '</div>' +
            (s.description ? '<div style="color:var(--text-2);margin-top:6px;line-height:1.4;font-size:0.8rem;">' + escapeHtml(s.description).substring(0, 120) + (s.description.length > 120 ? '...' : '') + '</div>' : '') +
            '</div>' +
            actions +
            '</div>';
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('[data-open-scene]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('[data-edit-scene]') || e.target.closest('[data-delete-scene]')) return;
                let id = parseInt(el.dataset.openScene);
                if (typeof window.openSceneChat === 'function') window.openSceneChat(id);
            });
        });
    }, 10);
}

// ==================== ЧАТ СПЕКТАКЛЯ ====================
export async function openSceneChat(sceneId) {
    currentSceneId = sceneId;
    sceneReplyTo = null;

    let scene = rpScenes.find(s => s.id === sceneId);
    if (!scene) {
        let { data } = await supabase.from('rp_scenes').select('*').eq('id', sceneId).maybeSingle();
        scene = data;
    }
    currentSceneData = scene;

    let titleEl = document.getElementById('rp-scene-title');
    if (titleEl && scene) titleEl.textContent = '🎬 ' + scene.title;

    let descEl = document.getElementById('rp-scene-desc');
    if (descEl && scene) {
        descEl.innerHTML = '<b style="color:var(--accent);">Автор:</b> ' + escapeHtml(scene.char_name || scene.author) +
            (scene.description ? '<br>' + escapeHtml(scene.description).replace(/\n/g, '<br>') : '');
    }

    await renderSceneCovers(sceneId);
    await loadSceneMessages(sceneId);
    subscribeSceneChat(sceneId);
    renderSceneMessages();
}

export function closeSceneChat() {
    if (sceneChannel) { supabase.removeChannel(sceneChannel); sceneChannel = null; }
    if (sceneCoverTimer) { clearInterval(sceneCoverTimer); sceneCoverTimer = null; }
    currentSceneId = null;
    sceneMessages = [];
    sceneReplyTo = null;
    currentSceneData = null;
}

async function renderSceneCovers(sceneId) {
    let wrap = document.getElementById('rp-scene-covers');
    if (!wrap) return;
    if (sceneCoverTimer) { clearInterval(sceneCoverTimer); sceneCoverTimer = null; }

    let covers = await loadSceneCovers(sceneId);
    if (covers.length === 0) { wrap.innerHTML = ''; return; }

    let mainUrl = covers[0].image_url;
    let thumbs = covers.map((c, i) =>
        '<div class="scene-cover-thumb-sm' + (i === 0 ? ' active' : '') + '" data-scene-cover-idx="' + i + '">' +
        '<img src="' + c.image_url + '">' +
        '</div>'
    ).join('');

    wrap.innerHTML = '<div class="scene-covers-view">' +
        '<div class="scene-covers-view-main" id="scene-cover-main"><img src="' + mainUrl + '"></div>' +
        (covers.length > 1 ? '<div class="scene-covers-view-thumbs">' + thumbs + '</div>' : '') +
        '</div>';

    wrap.querySelectorAll('[data-scene-cover-idx]').forEach(thumb => {
        thumb.addEventListener('click', () => {
            let idx = parseInt(thumb.dataset.sceneCoverIdx);
            let main = document.getElementById('scene-cover-main');
            if (main && covers[idx]) main.innerHTML = '<img src="' + covers[idx].image_url + '">';
            wrap.querySelectorAll('[data-scene-cover-idx]').forEach((t, i) => t.classList.toggle('active', i === idx));
        });
    });
}

export async function loadSceneMessages(sceneId) {
    try {
        let { data } = await supabase.from('rp_scene_messages')
            .select('*').eq('scene_id', sceneId)
            .order('id', { ascending: true }).limit(200);
        if (data) sceneMessages = data;
    } catch (e) {}
}

export function subscribeSceneChat(sceneId) {
    if (sceneChannel) supabase.removeChannel(sceneChannel);
    sceneChannel = supabase.channel('scene-' + sceneId)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'rp_scene_messages',
            filter: 'scene_id=eq.' + sceneId
        }, payload => {
            sceneMessages.push(payload.new);
            if (payload.new.owner !== CA?.name) playSound('receive');
            if (currentSceneId === sceneId) renderSceneMessages();
        })
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'rp_scene_messages',
            filter: 'scene_id=eq.' + sceneId
        }, payload => {
            let idx = sceneMessages.findIndex(m => m.id === payload.new.id);
            if (idx !== -1) sceneMessages[idx] = payload.new;
            if (currentSceneId === sceneId) renderSceneMessages();
        })
        .on('postgres_changes', {
            event: 'DELETE', schema: 'public', table: 'rp_scene_messages'
        }, payload => {
            sceneMessages = sceneMessages.filter(m => m.id !== payload.old.id);
            if (currentSceneId === sceneId) renderSceneMessages();
        })
        .subscribe();
}

export async function sendSceneMessage() {
    let inp = document.getElementById('rp-scene-input');
    let msg = inp?.value?.trim();
    if (!msg || !CA || !currentRpChar || !currentSceneId) {
        if (!currentRpChar) notif('⚠ Выбери персонажа');
        return;
    }
    let md = {
        scene_id: currentSceneId,
        owner: CA.name,
        char_name: currentRpChar.name,
        char_avatar_url: currentRpChar.avatar_url || '',
        text: msg,
        time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }),
        reactions: {}
    };
    if (sceneReplyTo) {
        md.reply_to = sceneReplyTo.msgId;
        md.reply_char_name = sceneReplyTo.char_name;
        md.reply_text = sceneReplyTo.text;
    }
    try { await supabase.from('rp_scene_messages').insert(md); } catch (e) {}
    playSound('send');
    inp.value = '';
    sceneReplyTo = null;
    cancelSceneReply();
}

export function renderSceneMessages() {
    let c = document.getElementById('rp-scene-messages');
    if (!c) return;
    if (sceneMessages.length === 0) {
        c.innerHTML = '<div class="empty-state">Сообщений пока нет</div>';
        return;
    }
    c.innerHTML = sceneMessages.map(m => {
        let e = fx(m.owner);
        let avatarHtml = m.char_avatar_url
            ? '<img src="' + m.char_avatar_url + '" style="width:100%;height:100%;object-fit:cover;">'
            : '🎭';
        let txt = (m.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
        txt = txt.replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:200px;max-height:200px;border:1px solid rgba(255,255,255,0.1);margin:6px 0;border-radius:12px;" onerror="this.style.display=\'none\'">');
        txt = txt.replace(/@(\S+)/g, (_, name) => '<span class="mention" onclick="event.stopPropagation();window.showAgentInfo(\'' + name + '\')">@' + name + '</span>');

        let react = m.reactions || {}, rh = '';
        Object.keys(react).forEach(k => {
            if (k.endsWith('_by')) return;
            let ua = react[k + '_by'];
            let us = Array.isArray(ua) ? ua.join(', ') : '';
            let ia = Array.isArray(ua) && CA && ua.includes(CA.name);
            rh += '<span class="chat-reaction ' + (ia ? 'active' : '') + '" data-reaction="scene" data-msgid="' + m.id + '" data-emoji="' + k + '">' + k + ' ' + react[k] + '<span class="chat-reaction-tooltip">' + (us || '...') + '</span></span>';
        });

        let isOwn = m.owner === CA?.name;
        let canMod = CA && (CA.role === 'admin' || CA.role === 'moderator');
        let canDelete = isOwn || canMod;
        let menu = '';
        if (m.id) {
            menu = '<span class="chat-menu-wrap"><button class="chat-menu-btn" data-menu-btn="scene' + m.id + '">⋯</button><div class="chat-menu-dropdown">';
            menu += '<div class="chat-menu-item" data-reply-scene="' + m.id + '" data-reply-char-name="' + (m.char_name || '') + '" data-reply-text="' + ((m.text || '').substring(0, 50).replace(/'/g, "\\'")) + '">↩ ОТВЕТИТЬ</div>';
            if (canDelete) menu += '<div class="chat-menu-item" data-delete-scene-msg="' + m.id + '">🗑 УДАЛИТЬ</div>';
            if (isOwn) menu += '<div class="chat-menu-item" data-edit-scene-msg="' + m.id + '">✏️ РЕДАКТИРОВАТЬ</div>';
            menu += '</div></span>';
        }

        let replyHtml = m.reply_to
            ? '<div style="color:#880000;font-size:0.7rem;margin-bottom:2px;">↩ ' + (m.reply_char_name || '???') + ': ' + (m.reply_text || '...') + '</div>'
            : '';

        return '<div class="chat-msg" data-msg-id="' + m.id + '" data-rp-char="' + escapeHtml(m.char_name || '') + '" data-rp-owner="' + escapeHtml(m.owner || '') + '" style="cursor:pointer;">' +
            '<div class="chat-msg-left"><div class="chat-avatar-frame f-default"><div class="inner">' + avatarHtml + '</div></div></div>' +
            '<div class="chat-msg-right">' + replyHtml +
            '<div class="chat-header-row">' +
            '<span class="chat-author name-with-badge rp-message-author ' + e.colorCls + ' ' + e.fontCls + '" style="color:var(--accent);" onclick="event.stopPropagation();window.showAgentInfo(\'' + m.owner + '\')">' + m.char_name + e.roleBadge + e.badgeHtml + '</span>' +
            '<span style="color:var(--text-3);font-size:0.7rem;">(' + m.owner + ')</span>' +
            '<span class="chat-time">' + m.time + '</span>' + menu +
            '</div>' +
            '<div class="chat-text ' + e.fontCls + '" style="font-style:italic;">' + txt + '</div>' +
            '<div class="chat-reactions">' + rh + '<span class="chat-reaction" data-reaction-picker="scene" data-msgid="' + m.id + '">+</span></div>' +
            '</div></div>';
    }).join('');
    c.scrollTop = c.scrollHeight;
}

export async function addSceneReaction(msgId, emoji) {
    let msg = sceneMessages.find(m => m.id == msgId);
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
    sceneMessages = sceneMessages.map(m => m.id == msgId ? { ...m, reactions: msg.reactions } : m);
    renderSceneMessages();
    await supabase.from('rp_scene_messages').update({ reactions: msg.reactions }).eq('id', parseInt(msgId));
}

export async function deleteSceneMessage(msgId) {
    let msg = sceneMessages.find(m => m.id == msgId);
    if (!msg) return;
    let canMod = CA && (CA.role === 'admin' || CA.role === 'moderator');
    if (msg.owner !== CA?.name && !canMod) return notif('⛔ Нет прав');
    sceneMessages = sceneMessages.filter(m => String(m.id) !== String(msgId));
    renderSceneMessages();
    await supabase.from('rp_scene_messages').delete().eq('id', parseInt(msgId));
    notif('🗑 Удалено');
}

export async function editSceneMessage(msgId) {
    let msg = sceneMessages.find(m => m.id == msgId);
    if (!msg || msg.owner !== CA?.name) return;
    let inp = document.getElementById('rp-scene-input');
    if (!inp) return;
    inp.value = msg.text;
    inp.focus();
    sceneReplyTo = null;
    cancelSceneReply();
    sceneMessages = sceneMessages.filter(m => String(m.id) !== String(msgId));
    renderSceneMessages();
    await supabase.from('rp_scene_messages').delete().eq('id', parseInt(msgId));
}

export function replyToSceneMessage(msgId, charName, text) {
    sceneReplyTo = { msgId, char_name: charName, text };
    let inp = document.getElementById('rp-scene-input');
    if (inp) { inp.value = ''; inp.focus(); }
    let ri = document.getElementById('scene-reply-indicator');
    if (!ri) {
        ri = document.createElement('div');
        ri.id = 'scene-reply-indicator';
        ri.className = 'reply-indicator';
        ri.style.display = 'none';
        let msgsEl = document.getElementById('rp-scene-messages');
        if (msgsEl) msgsEl.parentNode.insertBefore(ri, msgsEl.nextSibling);
    }
    ri.innerHTML = '<span>↩ Ответ для <b>' + charName + '</b>: ' + text + '...</span><span style="cursor:pointer;" id="cancel-scene-reply-btn">✕</span>';
    ri.style.display = 'flex';
    setTimeout(() => document.getElementById('cancel-scene-reply-btn')?.addEventListener('click', cancelSceneReply), 10);
}

export function cancelSceneReply() {
    sceneReplyTo = null;
    let ri = document.getElementById('scene-reply-indicator');
    if (ri) ri.style.display = 'none';
}

// ==================== ЭКСПОРТЫ ====================
export {
    rpCharacters,
    rpMessages,
    rpScenes,
    currentRpRoom,
    rpReplyTo,
    currentSceneId,
    sceneMessages
};