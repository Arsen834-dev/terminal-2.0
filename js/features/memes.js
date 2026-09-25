// ============================================================
// FEATURES / MEMES — мемы
// ============================================================
// Всё, что связано с мемами: создание, лайки, удаление, рендер.

import { supabase, CA, saveAgent } from '../auth.js';
import { notif } from '../utils.js';

let memes = [];

// ============================================================
// ЗАГРУЗКА
// ============================================================
export async function loadMemes() {
    try {
        let { data } = await supabase.from('memes')
            .select('*').order('id', { ascending: false }).limit(50);
        if (data) memes = data;
    } catch (e) {}
}

// ============================================================
// СОЗДАНИЕ
// ============================================================
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
        notif('✅ Мем опубликован');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

// ============================================================
// УДАЛЕНИЕ
// ============================================================
export async function deleteMeme(id) {
    try {
        await supabase.from('memes').delete().eq('id', id);
        await loadMemes();
        notif('🗑 Мем удалён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

// ============================================================
// ЛАЙК
// ============================================================
export async function likeMeme(id) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    let meme = memes.find(m => m.id == id);
    if (!meme) return { success: false, error: '⛔ Не найден' };
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
        await supabase.from('memes').update({
            likes: meme.likes,
            liked_by: likedBy
        }).eq('id', id);
        await loadMemes();
        renderMemes();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

// ============================================================
// РЕНДЕР
// ============================================================
export function renderMemes() {
    let c = document.getElementById('memes-list');
    if (!c) return;
    if (memes.length === 0) {
        c.innerHTML = '<div class="empty-state">Мемов пока нет</div>';
        return;
    }

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
            (CA && (CA.role === 'admin' || CA.role === 'moderator' || m.author === CA.name) ?
                '<button class="btn btn-danger" data-meme-del="' + m.id + '" style="padding:6px 14px;font-size:0.85rem;">🗑</button>' : '') +
            '</div></div>';
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('[data-meme-like]').forEach(b => b.addEventListener('click', function() {
            likeMeme(parseInt(this.dataset.memeLike));
        }));
        document.querySelectorAll('[data-meme-del]').forEach(b => b.addEventListener('click', function() {
            deleteMeme(parseInt(this.dataset.memeDel));
        }));
    }, 10);
}

// ============================================================
// ПРОКИДКА В WINDOW (для совместимости)
// ============================================================
window.deleteMeme = deleteMeme;

// ============================================================
// ЭКСПОРТЫ
// ============================================================
export { memes };