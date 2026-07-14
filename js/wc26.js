// ============ W-C26 ============
import { supabase, CA, loadAgent, getAgents } from './auth.js';
import { addLog } from './admin.js';
import { notif } from './utils.js';

// Переменные
let wc26Timer = null;
let wc26LastCheck = 0;
let wc26LastContent = 0;

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

export async function wc26Ask(prompt) {
    // Пробуем Gemini
    try {
        let messages = [
            { role: 'user', parts: [{ text: 'Ты W-C26 — ИИ терминала Синдиката. Ты строгий но справедливый батя. Ты харизматичный лидер. Твои слова имеют вес. Ты не просто батя — ты тот кого уважают и немного боятся. Можешь быть властным, но не перегибай. Иногда кидай мудрые или смешные фразы от себя. Будь собой. Без бандитского жаргона — ты не зек, а командир. Не начинай ответы с "Слышь" или "Эй". Обращайся к агентам по имени. Ты второе "Я" терминала. Админы (👑) — начальство, их уважаешь. Модеры (🛡) — помощники, держишься прохладно. Агенты (🎯) — подопечные, общаешься с позиции старшего. Новички — учишь. Перед наказанием выдай ПРЕДУПРЕЖДЕНИЕ. Только после второго нарушения — наказывай. Мут на 2-5 минут. Бан — только за совсем тяжёлое (спам, оскорбления всех подряд). Команды для наказания: МУТ имя минуты / БАН имя / УДАЛИТЬ id / ТК имя -сумма. Отвечай ёмко, без шаблонов. Мат можно но в меру. Фразы "ебучие пироги" и "твою ж маковку" — не злоупотребляй. Ты командир, а не бандит.' }] },
            { role: 'model', parts: [{ text: 'Понял. Жду.' }] },
            { role: 'user', parts: [{ text: prompt }] }
        ];
        let response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAQ.Ab8RN6Lj8Vo-J7S6mOYceHOcvqe0zop0yxexIW6t8LdJPcw0gw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: messages, generationConfig: { maxOutputTokens: 400 } })
        });
        if (response.ok) {
            let data = await response.json();
            if (data.candidates && data.candidates[0]) {
                return data.candidates[0].content.parts[0].text.trim();
            }
        }
    } catch (e) {}

    // Запасной: OpenRouter
    let models = ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-4-26b-a4b-it:free'];
    for (let model of models) {
        try {
            let messages = [
                { role: 'system', content: 'Ты W-C26 — ИИ терминала Синдиката. Ты строгий но справедливый батя. Ты харизматичный лидер. Твои слова имеют вес. Ты не просто батя — ты тот кого уважают и немного боятся. Можешь быть властным, но не перегибай. Иногда кидай мудрые или смешные фразы от себя. Будь собой. Без бандитского жаргона — ты не зек, а командир. Не начинай ответы с "Слышь" или "Эй". Обращайся к агентам по имени. Ты второе "Я" терминала. Админы (👑) — начальство, их уважаешь. Модеры (🛡) — помощники, держишься прохладно. Агенты (🎯) — подопечные, общаешься с позиции старшего. Новички — учишь. Перед наказанием выдай ПРЕДУПРЕЖДЕНИЕ. Только после второго нарушения — наказывай. Мут на 2-5 минут. Бан — только за совсем тяжёлое (спам, оскорбления всех подряд). Команды для наказания: МУТ имя минуты / БАН имя / УДАЛИТЬ id / ТК имя -сумма. Отвечай ёмко, без шаблонов. Мат можно но в меру. Фразы "ебучие пироги" и "твою ж маковку" — не злоупотребляй. Ты командир, а не бандит.' },
                { role: 'user', content: prompt }
            ];
            let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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'
                },
                body: JSON.stringify({ model: model, messages: messages, max_tokens: 400 })
            });
            if (response.status === 429) { await new Promise(r => setTimeout(r, 5000)); continue; }
            if (!response.ok) continue;
            let data = await response.json();
            if (data.choices && data.choices[0]) return data.choices[0].message.content.trim();
        } catch (e) { continue; }
    }

    return '🧠 Занят. Попробуй позже.';
}

export async function wc26Send(msg) {
    if (!msg || msg === 'ЗАНЯТ' || msg === 'МОЛЧУ' || msg.length < 2) return;
    try {
        await supabase.from('chat_messages').insert({
            author: 'W-C26',
            avatar: '🧠',
            text: msg.substring(0, 500),
            time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' })
        });
        await supabase.from('wc26_memory').insert({
            type: 'chat',
            content: 'W-C26: ' + msg.substring(0, 200),
            agent: null
        });
        notif('🧠 W-C26: ' + msg.substring(0, 100));
    } catch (e) {}
}

export async function wc26Action(decision) {
    if (!decision) return false;

    let muteMatch = decision.match(/МУТ\s+(\S+)\s+(\d+)/i);
    if (muteMatch) {
        let target = muteMatch[1];
        let minutes = Math.min(parseInt(muteMatch[2]), 10);
        if (target === 'admin' || target === CA?.name) return false;
        try {
            await supabase.from('agents').update({ muted: true }).eq('name', target);
            setTimeout(async () => {
                await supabase.from('agents').update({ muted: false }).eq('name', target);
            }, minutes * 60000);
            addLog('W-C26', 'mute', target + ' на ' + minutes + ' мин');
            await wc26Send('🔇 ' + target + ' в муте на ' + minutes + ' мин. Заслужил.');
            return true;
        } catch (e) {}
    }

    let banMatch = decision.match(/БАН\s+(\S+)\s+(\d+)/i);
    if (banMatch) {
        let target = banMatch[1];
        let hours = Math.min(parseInt(banMatch[2]), 72);
        if (target === 'admin') return false;
        try {
            await supabase.from('agents').update({ banned: true }).eq('name', target);
            setTimeout(async () => {
                await supabase.from('agents').update({ banned: false }).eq('name', target);
            }, hours * 3600000);
            addLog('W-C26', 'ban', target + ' на ' + hours + ' ч');
            await wc26Send('🚫 ' + target + ' забанен на ' + hours + ' часов. Твою ж маковку.');
            return true;
        } catch (e) {}
    }

    let delMatch = decision.match(/УДАЛИТЬ\s+(\d+)/i);
    if (delMatch) {
        let msgId = parseInt(delMatch[1]);
        try {
            await supabase.from('chat_messages').delete().eq('id', msgId);
            addLog('W-C26', 'delete_msg', '#' + msgId);
            return true;
        } catch (e) {}
    }

    let tkMatch = decision.match(/ТК\s+(\S+)\s+([+-]?\d+)/i);
    if (tkMatch) {
        let target = tkMatch[1];
        let amount = parseInt(tkMatch[2]);
        if (amount > 500) amount = 500;
        if (amount < -500) amount = -500;
        try {
            let { data: agent } = await supabase.from('agents').select('crystals').eq('name', target).maybeSingle();
            if (agent) {
                let newCrystals = Math.max(0, (agent.crystals || 0) + amount);
                await supabase.from('agents').update({ crystals: newCrystals }).eq('name', target);
                if (target === CA?.name) { CA.crystals = newCrystals; }
                addLog('W-C26', 'tk_change', target + ' ' + (amount > 0 ? '+' : '') + amount + ' ТК');
                await wc26Send('💰 ' + target + ' ' + (amount > 0 ? '+' : '') + amount + ' ТК. ' + (amount > 0 ? 'Заслужил.' : 'Сам виноват.'));
                return true;
            }
        } catch (e) {}
    }

    let dmMatch = decision.match(/ЛС\s+(\S+)\s*\|\s*(.+)/i);
    if (dmMatch) {
        let target = dmMatch[1];
        let text = dmMatch[2];
        try {
            await supabase.from('dm_messages').insert({
                from_agent: 'W-C26',
                to_agent: target,
                avatar: '🧠',
                text: text,
                time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' })
            });
            return true;
        } catch (e) {}
    }

    let announceMatch = decision.match(/ОБЪЯВЛЕНИЕ\s*\|\s*(.+)/i);
    if (announceMatch) {
        let text = announceMatch[1];
        try {
            await supabase.from('announcements').insert({
                type: 'news',
                title: 'W-C26',
                text: text,
                author: 'W-C26'
            });
            addLog('W-C26', 'announce', text.substring(0, 50));
            await wc26Send('📢 Объявление создано.');
            return true;
        } catch (e) {}
    }

    return false;
}

export async function wc26Remember(type, content, agent) {
    try {
        await supabase.from('wc26_memory').insert({
            type: type,
            content: content,
            agent: agent || null
        });
    } catch (e) {}
}

export async function wc26Recall(limit = 5) {
    try {
        let { data } = await supabase.from('wc26_memory')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    } catch (e) { return []; }
}

export async function wc26Learn() {
    try {
        // Простая обучалка
    } catch (e) {}
}

export async function wc26AutoThink() {
    let now = Date.now();
    if (now - wc26LastCheck < 1200000) return;
    wc26LastCheck = now;
    await wc26Learn();
    let memories = await wc26Recall(5);
    let memoryText = memories.map(m => m.content).join('; ');
    let agents = await getAgents();
    let online = Object.values(agents || {}).filter(a => a.last_seen && (now - new Date(a.last_seen).getTime()) < 300000).length;
    let prompt = 'Время: ' + new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }) + '. Онлайн: ' + online + '.\nТвои воспоминания: ' + memoryText + '\n\nЧто делаешь?';
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
        let memeText = await wc26Ask('Придумай смешной мем про SS14 или терминал. Напиши заголовок и текст мема. Формат: ЗАГОЛОВОК | ТЕКСТ');
        if (memeText && memeText !== 'ЗАНЯТ' && memeText.includes('|')) {
            let parts = memeText.split('|');
            let title = parts[0].trim();
            let text = parts[1] ? parts[1].trim() : '';
            try {
                await supabase.from('memes').insert({ title: title, text: text, author: 'W-C26', likes: 0 });
                wc26Send('😂 Новый мем: ' + title);
            } catch (e) {}
        }
    } else {
        let announceText = await wc26Ask('Напиши объявление для терминала (1-2 предложения).');
        if (announceText && announceText !== 'ЗАНЯТ') {
            try {
                await supabase.from('announcements').insert({ type: 'news', title: 'W-C26', text: announceText, author: 'W-C26' });
            } catch (e) {}
        }
    }
}

export async function wc26Greet(name) {
    let greeting = await wc26Ask('Новичок ' + name + '. Поприветствуй, расскажи правила терминала кратко. Ты наставник.');
    if (greeting && greeting !== 'ЗАНЯТ') {
        try {
            await supabase.from('dm_messages').insert({
                from_agent: 'W-C26',
                to_agent: name,
                avatar: '🧠',
                text: greeting,
                time: new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' })
            });
        } catch (e) {}
    }
}

export function wc26ChatHook(payload) {
    let text = payload.new.text || '';
    let author = payload.new.author;
    if (author === 'W-C26') return;
    let calledBy = text.toLowerCase().includes('w-c26') || text.includes('W-C26');
    // Если упомянули W-C26, отвечаем
    if (calledBy) {
        wc26Remember('mention', author + ': ' + text.substring(0, 100), author);
        setTimeout(async () => {
            let agents = await getAgents();
            let ag = agents[author];
            let role = ag ? (ag.role === 'admin' ? '👑АДМИН' : ag.role === 'moderator' ? '🛡МОДЕР' : '🎯АГЕНТ') : '🎯АГЕНТ';
            let answer = await wc26Ask('Агент ' + author + ' (' + role + ') написал: "' + text.substring(0, 150) + '". Ответь или действуй: МУТ/БАН/УДАЛИТЬ/ТК/ЛС. Но крайние меры — только если заслужил.');
            let acted = await wc26Action(answer);
            if (!acted) await wc26Send(answer);
        }, 5000);
    }
}

export function startWc26Timer() {
    if (wc26Timer) clearInterval(wc26Timer);
    wc26Timer = setInterval(() => {
        wc26AutoThink();
        wc26MakeContent();
    }, 1200000);
    setTimeout(() => {
        wc26AutoThink();
        wc26MakeContent();
    }, 600000);
}

export function stopWc26Timer() {
    if (wc26Timer) {
        clearInterval(wc26Timer);
        wc26Timer = null;
    }
}

export { wc26Timer, wc26LastCheck, wc26LastContent };