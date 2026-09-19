// ============ GUIDES / ГАЙДЫ, МЕМЫ ============
import { supabase, CA, saveAgent } from './auth.js';
import { notif, closeModal } from './utils.js';

let userGuides = [];
let memes = [];

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
        notif('✅ Гайд опубликован');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteGuide(id) {
    try {
        await supabase.from('guides').delete().eq('id', id);
        await loadGuides();
        notif('🗑 Гайд удалён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function editGuide(id) {
    let g = userGuides.find(x => x.id == id);
    if (!g) return;
    let btn = document.getElementById('create-guide-submit-btn');
    if (btn) btn.dataset.editing = id;
    document.getElementById('guide-title').value = g.title || '';
    document.getElementById('guide-text').value = g.text || '';
    document.getElementById('modal-create-title').textContent = '✏️ Редактировать гайд';
    if (btn) btn.textContent = 'Сохранить';
    let modal = document.getElementById('modal-create');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

export async function saveEditedGuide() {
    let btn = document.getElementById('create-guide-submit-btn');
    let id = btn?.dataset.editing;
    let title = document.getElementById('guide-title')?.value?.trim();
    let text = document.getElementById('guide-text')?.value?.trim();
    if (!title || !text) return notif('⛔ Заполни');
    if (!id) return;
    try {
        await supabase.from('guides').update({ title, text }).eq('id', id);
        await loadGuides();
        notif('✅ Гайд обновлён');
        closeModal('modal-create');
        delete btn.dataset.editing;
        btn.textContent = 'Опубликовать';
        document.getElementById('modal-create-title').textContent = '✏️ Новый гайд';
        renderGuides();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function loadMemes() {
    try {
        let { data } = await supabase.from('memes').select('*').order('id', { ascending: false }).limit(50);
        if (data) memes = data;
    } catch (e) {}
}

export async function createMeme(title, text, imageUrl) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    try {
        await supabase.from('memes').insert({ title: title || '', text: text || '', image_url: imageUrl || '', author: CA.name, likes: 0, liked_by: [] });
        CA.crystals = (CA.crystals || 0) + 40;
        await saveAgent();
        await loadMemes();
        notif('✅ Мем опубликован');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteMeme(id) {
    try {
        await supabase.from('memes').delete().eq('id', id);
        await loadMemes();
        notif('🗑 Мем удалён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function likeMeme(id) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    let meme = memes.find(m => m.id == id);
    if (!meme) return { success: false, error: '⛔ Не найден' };
    let likedBy = meme.liked_by || [];
    let idx = likedBy.indexOf(CA.name);
    if (idx === -1) { likedBy.push(CA.name); meme.likes = (meme.likes || 0) + 1; }
    else { likedBy.splice(idx, 1); meme.likes = Math.max(0, (meme.likes || 0) - 1); }
    meme.liked_by = likedBy;
    try {
        await supabase.from('memes').update({ likes: meme.likes, liked_by: likedBy }).eq('id', id);
        await loadMemes();
        renderMemes();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export function renderGuides() {
    let list = document.getElementById('guides-list');
    if (!list) return;
    let pinned = [
        { id: 'faq', title: '❓ FAQ', text: 'Как получить ТК?\n+50 ТК каждые 30 минут.\n\nКак повысить репутацию?\n+1 каждые 30 минут.', author: 'СИСТЕМА', pinned: true },
        { id: 'chat_rules', title: '💬 Правила', text: '1. Без оскорблений\n2. Без спама\n3. Без рекламы\n\nНарушение = мут.', author: 'СИСТЕМА', pinned: true }
    ];
    let all = pinned.concat(userGuides.filter(g => !pinned.find(p => p.id === g.id)));
    list.innerHTML = '';
    all.forEach(g => {
        let div = document.createElement('div');
        div.className = 'card';
        div.style.cssText = 'padding:14px;margin-bottom:8px;cursor:pointer;' + (g.pinned ? 'border-color:var(--accent);' : '');
        div.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;">' + g.title + '</span><span style="color:var(--text-3);font-size:0.85rem;">' + (g.author || '') + '</span></div>';
        div.addEventListener('click', () => openGuideModal(g));
        list.appendChild(div);
    });
}

export function renderMemes() {
    let c = document.getElementById('memes-list');
    if (!c) return;
    if (memes.length === 0) { c.innerHTML = '<div class="empty-state">Мемов пока нет</div>'; return; }
    c.innerHTML = memes.map(m => {
        let likes = m.likes || 0;
        let likedBy = m.liked_by || [];
        let iliked = CA && likedBy.includes(CA.name);
        return '<div class="card" style="margin-bottom:12px;">' +
            '<div style="font-weight:700;font-size:1.05rem;margin-bottom:6px;">' + (m.title || '') + '</div>' +
            (m.text ? '<div style="color:var(--text-2);line-height:1.6;">' + (m.text || '').replace(/\n/g, '<br>') + '</div>' : '') +
            (m.image_url ? '<img src="' + m.image_url + '" style="max-width:100%;border-radius:12px;margin-top:12px;" onerror="this.style.display=\'none\'">' : '') +
            '<div style="color:var(--text-3);font-size:0.85rem;margin-top:8px;">— ' + m.author + '</div>' +
            '<div style="display:flex;gap:12px;margin-top:10px;">' +
            '<button class="btn ' + (iliked ? 'btn-primary' : 'btn-secondary') + '" data-meme-like="' + m.id + '" style="padding:6px 14px;font-size:0.85rem;">❤ ' + likes + '</button>' +
            (CA && (CA.role === 'admin' || CA.role === 'moderator' || m.author === CA.name) ? '<button class="btn btn-danger" data-meme-del="' + m.id + '" style="padding:6px 14px;font-size:0.85rem;">🗑</button>' : '') +
            '</div></div>';
    }).join('');
    setTimeout(() => {
        document.querySelectorAll('[data-meme-like]').forEach(b => b.addEventListener('click', function() { likeMeme(parseInt(this.dataset.memeLike)); }));
        document.querySelectorAll('[data-meme-del]').forEach(b => b.addEventListener('click', function() { deleteMeme(parseInt(this.dataset.memeDel)); }));
    }, 10);
}

export function openGuideModal(guide) {
    document.getElementById('modal-guide-title').textContent = guide.title;
    document.getElementById('modal-guide-author').textContent = 'Автор: ' + (guide.author || '???');
    let textEl = document.getElementById('modal-guide-text');
    textEl.innerHTML = (guide.text || '').replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:100%;max-height:300px;border-radius:12px;margin:8px 0;">').replace(/\n/g, '<br>');
    let ad = document.getElementById('modal-guide-actions');
    ad.innerHTML = '';
    if (guide.pinned) {
        document.getElementById('modal-guide-view').style.display = 'flex';
        document.getElementById('modal-guide-view').classList.add('show');
        return;
    }
    if (CA && (CA.role === 'admin' || CA.role === 'moderator' || guide.author === CA.name)) {
        if (guide.author === CA.name) ad.innerHTML += '<button class="btn btn-secondary" data-edit-guide="' + guide.id + '">✏️ Редактировать</button>';
        ad.innerHTML += '<button class="btn btn-danger" data-del-guide="' + guide.id + '">🗑 Удалить</button>';
    }
    document.getElementById('modal-guide-view').style.display = 'flex';
    document.getElementById('modal-guide-view').classList.add('show');
    setTimeout(() => {
        document.querySelector('[data-edit-guide="' + guide.id + '"]')?.addEventListener('click', () => { closeModal('modal-guide-view'); editGuide(guide.id); });
        document.querySelector('[data-del-guide="' + guide.id + '"]')?.addEventListener('click', () => { deleteGuide(guide.id); closeModal('modal-guide-view'); });
    }, 10);
}

export { userGuides, memes };