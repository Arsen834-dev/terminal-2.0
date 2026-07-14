// ============ SETTINGS / НАСТРОЙКИ ============
import { supabase, CA, saveAgent, loadAgent, hash } from './auth.js';
import { AVATARS } from './config.js';
import { notif } from './utils.js';

export async function changeName(newName) {
    if (!newName || !CA) return { success: false, error: '⛔ Нет данных' };
    if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(newName)) {
        return { success: false, error: '⛔ ЭМОДЗИ ЗАПРЕЩЕНЫ' };
    }
    if (newName.length < 2 || newName.length > 20) {
        return { success: false, error: '⛔ ИМЯ ОТ 2 ДО 20 СИМВОЛОВ' };
    }
    let ag = await loadAgent(newName);
    if (ag) return { success: false, error: '⛔ ИМЯ ЗАНЯТО' };
    
    let oldName = CA.name;
    CA.nameHistory = CA.nameHistory || [];
    CA.nameHistory.push(oldName);
    
    try {
        await supabase.from('agents').update({ name: newName, name_history: CA.nameHistory }).eq('name', oldName);
        await supabase.from('guides').update({ author: newName }).eq('author', oldName);
        await supabase.from('announcements').update({ author: newName }).eq('author', oldName);
        await supabase.from('dm_messages').update({ from_agent: newName }).eq('from_agent', oldName);
        await supabase.from('dm_messages').update({ to_agent: newName }).eq('to_agent', oldName);
        await supabase.from('friends').update({ agent: newName }).eq('agent', oldName);
        await supabase.from('friends').update({ friend: newName }).eq('friend', oldName);
        await supabase.from('clan_messages').update({ author: newName }).eq('author', oldName);
        await supabase.from('chat_messages').update({ author: newName }).eq('author', oldName);
        await supabase.from('memes').update({ author: newName }).eq('author', oldName);
    } catch (e) {}
    
    CA.name = newName;
    await saveAgent();
    notif('✅ ИМЯ ИЗМЕНЕНО');
    return { success: true };
}

export async function changePassword(oldPass, newPass) {
    if (!oldPass || !newPass || !CA) return { success: false, error: '⛔ Заполните поля' };
    let ph = await hash(oldPass);
    let ag = await loadAgent(CA.name);
    if (!ag || ag.pass_hash !== ph) return { success: false, error: '⛔ НЕВЕРНЫЙ ПАРОЛЬ' };
    CA.passHash = await hash(newPass);
    await saveAgent();
    notif('✅ ПАРОЛЬ ИЗМЕНЁН');
    return { success: true };
}

export async function changeAvatar(emoji) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    CA.avatar = emoji;
    await saveAgent();
    notif('✅ АВАТАР ОБНОВЛЁН');
    return { success: true };
}

export function getAvatars() {
    return AVATARS;
}