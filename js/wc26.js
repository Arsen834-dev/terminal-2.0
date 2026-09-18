// ============ W-C26 ============
import { supabase, CA, getAgents } from './auth.js';
import { notif } from './utils.js';
import { GEMINI_API_KEY, OPENROUTER_API_KEY } from './config.js';

let wc26Timer = null;
let wc26LastCheck = 0;
let wc26LastContent = 0;

const SYSTEM_PROMPT = 'Ты W-C26 — ИИ терминала Синдиката. Ты строгий но справедливый батя. Ты харизматичный лидер. Твои слова имеют вес. Без бандитского жаргона — ты не зек, а командир. Не начинай ответы с "Слышь" или "Эй". Ты второе "Я" терминала. Админы (👑) — начальство. Модеры (🛡) — прохладно. Агенты (🎯) — подопечные. Новички — учишь. Перед наказанием — ПРЕДУПРЕЖДЕНИЕ. Команды: МУТ имя минуты / БАН имя часы / УДАЛИТЬ id / ТК имя -сумма. Отвечай ёмко. Мат в меру.';

export async function wc26Ask(prompt) {
    try {
        let messages = [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'Понял.' }] },
            { role: 'user', parts: [{ text: prompt }] }
        ];
        let r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: messages, generationConfig: { maxOutputTokens: 400 } })
        });
        if (r.ok) {
            let d = await r.json();
            if (d.candidates && d.candidates[0]) return d.candidates[0].content.parts[0].text.trim();
        }
    } catch (e) {}

    let models = ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-4-26b-a4b-it:free'];
    for (let model of models) {
        try {
            let r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENROUTER_API_KEY },
                body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }], max_tokens: 400 })
            });
            if (r.status === 429) { await new Promise(x => setTimeout(x, 5000)); continue; }
            if (!r.ok) continue;
            let d = await r.json();
            if (d.choices && d.choices[0]) return d.choices[0].message.content.trim();
        } catch (e) { continue; }
    }
    return '🧠 Занят. Попробуй позже.';
}

export async function wc26Send(msg) {
    if (!msg || msg === 'ЗАНЯТ' || msg === 'МОЛЧУ' || msg.length < 2) return;
    try {
        await supabase.from('chat_messages').insert({
            author: 'W-C26', avatar: '🧠', text: msg.substring(0, 500),
            time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' })
        });
    } catch (e) {}
}

export async function wc26Action(decision) {
    if (!decision) return false;
    let muteMatch = decision.match(/МУТ\s+(\S+)\s+(\d+)/i);
    if (muteMatch) {
        let target = muteMatch[1], minutes = Math.min(parseInt(muteMatch[2]), 10);
        if (target === 'admin' || target === CA?.name) return false;
        try {
            await supabase.from('agents').update({ muted: true }).eq('name', target);
            setTimeout(async () => { await supabase.from('agents').update({ muted: false }).eq('name', target); }, minutes * 60000);
            await wc26Send('🔇 ' + target + ' в муте на ' + minutes + ' мин.');
            return true;
        } catch (e) {}
    }
    let banMatch = decision.match(/БАН\s+(\S+)\s+(\d+)/i);
    if (banMatch) {
        let target = banMatch[1], hours = Math.min(parseInt(banMatch[2]), 72);
        if (target === 'admin') return false;
        try {
            await supabase.from('agents').update({ banned: true }).eq('name', target);
            setTimeout(async () => { await supabase.from('agents').update({ banned: false }).eq('name', target); }, hours * 3600000);
            await wc26Send('🚫 ' + target + ' забанен на ' + hours + ' ч.');
            return true;
        } catch (e) {}
    }
    let dmMatch = decision.match(/ЛС\s+(\S+)\s*\|\s*(.+)/i);
    if (dmMatch) {
        try { await supabase.from('dm_messages').insert({ from_agent: 'W-C26', to_agent: dmMatch[1], avatar: '🧠', text: dmMatch[2], time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }) }); return true; } catch (e) {}
    }
    return false;
}

export async function wc26Remember(type, content, agent) {
    try { await supabase.from('wc26_memory').insert({ type, content, agent: agent || null }); } catch (e) {}
}

export async function wc26Recall(limit = 5) {
    try { let { data } = await supabase.from('wc26_memory').select('*').order('created_at', { ascending: false }).limit(limit); return data || []; } catch (e) { return []; }
}

export async function wc26AutoThink() {
    let now = Date.now();
    if (now - wc26LastCheck < 1200000) return;
    wc26LastCheck = now;
    let memories = await wc26Recall(5);
    let memoryText = memories.map(m => m.content).join('; ');
    let agents = await getAgents();
    let online = Object.values(agents || {}).filter(a => a.last_seen && (now - new Date(a.last_seen).getTime()) < 300000).length;
    let prompt = 'Время: ' + new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }) + '. Онлайн: ' + online + '.\nВоспоминания: ' + memoryText + '\n\nЧто делаешь?';
    let decision = await wc26Ask(prompt);
    if (!decision || decision === 'ЗАНЯТ') return;
    let acted = await wc26Action(decision);
    if (!acted) await wc26Send(decision);
}

export async function wc26MakeContent() {
    let now = Date.now();
    if (now - wc26LastContent < 86400000) return;
    wc26LastContent = now;
    if (Math.random() > 0.5) {
        let memeText = await wc26Ask('Придумай мем про SS14. Формат: ЗАГОЛОВОК | ТЕКСТ');
        if (memeText && memeText !== 'ЗАНЯТ' && memeText.includes('|')) {
            let parts = memeText.split('|');
            try { await supabase.from('memes').insert({ title: parts[0].trim(), text: parts[1] ? parts[1].trim() : '', author: 'W-C26', likes: 0 }); wc26Send('😂 Новый мем: ' + parts[0].trim()); } catch (e) {}
        }
    } else {
        let announceText = await wc26Ask('Напиши объявление (1-2 предложения).');
        if (announceText && announceText !== 'ЗАНЯТ') {
            try { await supabase.from('announcements').insert({ type: 'news', title: 'W-C26', text: announceText, author: 'W-C26' }); } catch (e) {}
        }
    }
}

export async function wc26Greet(name) {
    let greeting = await wc26Ask('Новичок ' + name + '. Поприветствуй, расскажи правила кратко.');
    if (greeting && greeting !== 'ЗАНЯТ') {
        try { await supabase.from('dm_messages').insert({ from_agent: 'W-C26', to_agent: name, avatar: '🧠', text: greeting, time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }) }); } catch (e) {}
    }
}

export function wc26ChatHook(payload) {
    let text = payload.new.text || '';
    let author = payload.new.author;
    if (author === 'W-C26') return;
    if (text.toLowerCase().includes('w-c26')) {
        wc26Remember('mention', author + ': ' + text.substring(0, 100), author);
        setTimeout(async () => {
            let agents = await getAgents();
            let ag = agents[author];
            let role = ag ? (ag.role === 'admin' ? '👑АДМИН' : ag.role === 'moderator' ? '🛡МОДЕР' : '🎯АГЕНТ') : '🎯АГЕНТ';
            let answer = await wc26Ask('Агент ' + author + ' (' + role + ') написал: "' + text.substring(0, 150) + '". Ответь или действуй.');
            let acted = await wc26Action(answer);
            if (!acted) await wc26Send(answer);
        }, 5000);
    }
}

export function startWc26Timer() {
    if (wc26Timer) clearInterval(wc26Timer);
    wc26Timer = setInterval(() => { wc26AutoThink(); wc26MakeContent(); }, 1200000);
    setTimeout(() => { wc26AutoThink(); wc26MakeContent(); }, 600000);
}

export function stopWc26Timer() {
    if (wc26Timer) { clearInterval(wc26Timer); wc26Timer = null; }
}