// ============ GUIDES / ГАЙДЫ, МЕМЫ ============
import { supabase, CA, saveAgent } from './auth.js';
import { notif } from './utils.js';

let userGuides = [];
let memes = [];

// ==================== ГАЙДЫ ====================

export async function loadGuides() {
    try {
        let { data } = await supabase.from('guides').select('*').order('created_at', { ascending: false });
        if (data) userGuides = data;
    } catch (e) {}
}

export async function createGuide(title, text) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    try {
        await supabase.from('guides').insert({ title, text, author: CA.name });
        CA.guidesCreated = (CA.guidesCreated || 0) + 1;
        CA.crystals = (CA.crystals || 0) + 50;
        await saveAgent();
        await supabase.from('agents').update({ guides_created: CA.guidesCreated }).eq('name', CA.name);
        await loadGuides();
        notif('✅ ГАЙД ОПУБЛИКОВАН');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка создания' };
    }
}

export async function deleteGuide(id) {
    try {
        await supabase.from('guides').delete().eq('id', id);
        await loadGuides();
        notif('🗑 ГАЙД УДАЛЁН');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка удаления' };
    }
}

export async function editGuide(id, title, text) {
    try {
        await supabase.from('guides').update({ title, text }).eq('id', id);
        await loadGuides();
        notif('✅ ГАЙД ОБНОВЛЁН');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка редактирования' };
    }
}

export async function saveEditedGuide() {
    let id = document.getElementById('create-guide-submit-btn').dataset.editing;
    let title = document.getElementById('guide-title')?.value?.trim();
    let text = document.getElementById('guide-text')?.value?.trim();
    if (!title || !text) return notif('⛔ ЗАПОЛНИ');
    let result = await editGuide(id, title, text);
    if (result.success) {
        closeModal('modal-create');
        let btn = document.getElementById('create-guide-submit-btn');
        delete btn.dataset.editing;
        btn.textContent = 'ОПУБЛИКОВАТЬ';
        renderGuides();
    }
    return result;
}

// ==================== МЕМЫ ====================

export async function loadMemes() {
    try {
        let { data } = await supabase.from('memes').select('*').order('id', { ascending: false }).limit(50);
        if (data) memes = data;
    } catch (e) {}
}

export async function createMeme(title, text, imageUrl) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    try {
        await supabase.from('memes').insert({
            title: title || '',
            text: text || '',
            image_url: imageUrl || '',
            author: CA.name,
            likes: 0,
            liked_by: []
        });
        CA.crystals = (CA.crystals || 0) + 40;
        await saveAgent();
        await loadMemes();
        notif('✅ МЕМ ОПУБЛИКОВАН');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка создания' };
    }
}

export async function deleteMeme(id) {
    try {
        await supabase.from('memes').delete().eq('id', id);
        await loadMemes();
        notif('🗑 МЕМ УДАЛЁН');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка удаления' };
    }
}

export async function likeMeme(id) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    let meme = memes.find(m => m.id == id);
    if (!meme) return { success: false, error: '⛔ Мем не найден' };
    let likedBy = meme.liked_by || [];
    let idx = likedBy.indexOf(CA.name);
    if (idx === -1) {
        likedBy.push(CA.name);
        meme.likes = (meme.likes || 0) + 1;
    } else {
        likedBy.splice(idx, 1);
        meme.likes = Math.max(0, (meme.likes || 0) - 1);
    }
    meme.liked_by = likedBy;
    try {
        await supabase.from('memes').update({ likes: meme.likes, liked_by: likedBy }).eq('id', id);
        await loadMemes();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка' };
    }
}

// ==================== RENDER GUIDES (UI) ====================

export function renderGuides() {
    let list = document.getElementById('guides-list');
    if (!list) return;
    let pinnedGuides = [
        { id: 'faq', title: '❓ FAQ', text: 'ВОПРОС: Как получить ТК?\nОТВЕТ: +50 ТК каждые 30 минут. За сообщения: +3 ТК, за гайд: +5 ТК.\n\nВОПРОС: Как повысить репутацию?\nОТВЕТ: +1 каждые 30 минут. Максимум — 100.\n\nВОПРОС: Что это за терминал?\nОТВЕТ: Заброшенный узел связи Синдиката. Мы нашли, починили и открыли доступ.', author: 'СИСТЕМА', pinned: true },
        { id: 'chat_rules', title: '💬 ПРАВИЛА ЧАТА', text: '1. Без оскорблений и спама\n2. Не рекламировать стороннее\n3. Не выдавать себя за админов\n4. Соблюдать общую атмосферу\n\nНарушение = мут. Повтор = бан.', author: 'СИСТЕМА', pinned: true }
    ];
    let all = pinnedGuides.concat(userGuides.filter(g => !pinnedGuides.find(p => p.id === g.id)));
    list.innerHTML = '';
    all.forEach(g => {
        let div = document.createElement('div');
        div.className = 'guide-item ' + (g.pinned ? 'pinned' : '');
        div.style.cursor = 'pointer';
        div.innerHTML = '<div class="guide-title-row"><span>' + g.title + '</span><span class="guide-author">' + (g.author || '') + '</span></div>';
        div.addEventListener('click', () => {
            if (typeof openGuideModal === 'function') openGuideModal(g);
        });
        list.appendChild(div);
    });
}

// ==================== RENDER MEMES (UI) ====================

export function renderMemes() {
    let c = document.getElementById('memes-list');
    if (!c) return;
    if (memes.length === 0) {
        c.innerHTML = '<div style="color:#cc0000;padding:20px;text-align:center;">МЕМОВ ПОКА НЕТ</div>';
        return;
    }
    c.innerHTML = memes.map(m => {
        let likes = m.likes || 0;
        let likedBy = m.liked_by || [];
        let iliked = CA && likedBy.includes(CA.name);
        return '<div class="meme-card"><div class="meme-text"><b>' + m.title + '</b></div>' +
            (m.text ? '<div class="meme-text">' + (m.text || '').replace(/\n/g, '<br>') + '</div>' : '') +
            (m.image_url ? '<img class="meme-image" src="' + m.image_url + '" onerror="this.style.display=\'none\'">' : '') +
            '<div class="meme-author" onclick="window.showAgentInfo(\'' + m.author + '\')" style="cursor:pointer;">— ' + m.author + '</div>' +
            '<div class="meme-actions"><button class="meme-like-btn' + (iliked ? ' liked' : '') + '" data-meme-like="' + m.id + '">👍 ' + likes + '</button>' +
            (CA && (CA.role === 'admin' || CA.role === 'moderator' || m.author === CA.name) ?
                '<button class="meme-like-btn" onclick="window.deleteMeme(' + m.id + ')" style="color:#ff0000;border-color:#ff0000;">🗑</button>' : '') +
            '</div></div>';
    }).join('');
    setTimeout(() => {
        document.querySelectorAll('[data-meme-like]').forEach(b => b.addEventListener('click', function() {
            likeMeme(parseInt(this.dataset.memeLike));
        }));
    }, 10);
}

// ==================== OPEN GUIDE MODAL (UI) ====================

export function openGuideModal(guide) {
    document.getElementById('modal-guide-title').textContent = guide.title;
    document.getElementById('modal-guide-author').textContent = 'Автор: ' + (guide.author || '???');
    let textEl = document.getElementById('modal-guide-text');
    textEl.innerHTML = (guide.text || '').replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:100%;max-height:300px;border:1px solid #ff1744;margin:5px 0;">').replace(/\n/g, '<br>');
    textEl.style.maxHeight = '50vh';
    textEl.style.overflowY = 'auto';
    let ad = document.getElementById('modal-guide-actions');
    ad.innerHTML = '';
    if (guide.pinned) {
        document.getElementById('modal-guide-view').style.display = 'flex';
        document.getElementById('modal-guide-view').classList.add('show');
        return;
    }
    if (CA && (CA.role === 'admin' || CA.role === 'moderator' || guide.author === CA.name)) {
        if (guide.author === CA.name) ad.innerHTML += '<button class="modal-btn" style="font-size:1rem;" data-edit-guide="' + guide.id + '">✏️ РЕДАКТИРОВАТЬ</button>';
        ad.innerHTML += '<button class="modal-btn" style="font-size:1rem;" data-del-guide="' + guide.id + '">🗑 УДАЛИТЬ</button>';
    }
    document.getElementById('modal-guide-view').style.display = 'flex';
    document.getElementById('modal-guide-view').classList.add('show');
    setTimeout(() => {
        document.querySelector('[data-edit-guide="' + guide.id + '"]')?.addEventListener('click', () => {
            if (typeof editGuide === 'function') editGuide(guide.id);
        });
        document.querySelector('[data-del-guide="' + guide.id + '"]')?.addEventListener('click', () => {
            if (typeof deleteGuide === 'function') deleteGuide(guide.id);
        });
    }, 10);
}

export { userGuides, memes };