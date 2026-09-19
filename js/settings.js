// ============ SETTINGS / НАСТРОЙКИ ============
import { supabase, CA, saveAgent, loadAgent, hash, uploadAvatar } from './auth.js';
import { notif } from './utils.js';

export async function changeName(newName) {
    if (!newName || !CA) return { success: false, error: '⛔ Нет данных' };
    if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(newName)) return { success: false, error: '⛔ Эмодзи запрещены' };
    if (newName.length < 2 || newName.length > 20) return { success: false, error: '⛔ 2-20 символов' };
    let ag = await loadAgent(newName);
    if (ag) return { success: false, error: '⛔ Занято' };

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
        await supabase.from('profile_posts').update({ author: newName }).eq('author', oldName);
    } catch (e) {}

    CA.name = newName;
    await saveAgent();
    notif('✅ Имя изменено');
    return { success: true };
}

export async function changePassword(oldPass, newPass) {
    if (!oldPass || !newPass || !CA) return { success: false, error: '⛔ Заполните' };
    let ph = await hash(oldPass);
    let ag = await loadAgent(CA.name);
    if (!ag || ag.pass_hash !== ph) return { success: false, error: '⛔ Неверный пароль' };
    CA.passHash = await hash(newPass);
    await saveAgent();
    notif('✅ Пароль изменён');
    return { success: true };
}

export async function changeAvatar(file) {
    if (!CA || !file) return { success: false, error: '⛔ Нет файла' };
    let result = await uploadAvatar(file);
    if (result.success) {
        notif('✅ Аватар обновлён');
    } else {
        notif('⛔ ' + result.error);
    }
    return result;
}