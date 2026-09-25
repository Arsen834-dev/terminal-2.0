// ============================================================
// GUIDES / ГАЙДЫ
// v3.0.1: мемы вынесены в features/memes.js
// ============================================================
import { supabase, CA, saveAgent } from './auth.js';
import { notif, closeModal } from './utils.js';

let userGuides = [];

// ============================================================
// ЗАГРУЗКА
// ============================================================
export async function loadGuides() {
    try {
        let { data } = await supabase.from('guides')
            .select('*').order('created_at', { ascending: false });
        if (data) userGuides = data;
    } catch (e) {}
}

// ============================================================
// СОЗДАНИЕ
// ============================================================
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

// ============================================================
// УДАЛЕНИЕ
// ============================================================
export async function deleteGuide(id) {
    try {
        await supabase.from('guides').delete().eq('id', id);
        await loadGuides();
        notif('🗑 Гайд удалён');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

// ============================================================
// РЕДАКТИРОВАНИЕ
// ============================================================
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

// ============================================================
// РЕНДЕР СПИСКА
// ============================================================
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
        div.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="font-weight:600;">' + g.title + '</span>' +
            '<span style="color:var(--text-3);font-size:0.85rem;">' + (g.author || '') + '</span>' +
            '</div>';
        div.addEventListener('click', () => openGuideModal(g));
        list.appendChild(div);
    });
}

// ============================================================
// МОДАЛКА ПРОСМОТРА ГАЙДА
// ============================================================
export function openGuideModal(guide) {
    document.getElementById('modal-guide-title').textContent = guide.title;
    document.getElementById('modal-guide-author').textContent = 'Автор: ' + (guide.author || '???');

    let textEl = document.getElementById('modal-guide-text');
    textEl.innerHTML = (guide.text || '')
        .replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" style="max-width:100%;max-height:300px;border-radius:12px;margin:8px 0;">')
        .replace(/\n/g, '<br>');

    let ad = document.getElementById('modal-guide-actions');
    ad.innerHTML = '';

    if (guide.pinned) {
        document.getElementById('modal-guide-view').style.display = 'flex';
        document.getElementById('modal-guide-view').classList.add('show');
        return;
    }

    if (CA && (CA.role === 'admin' || CA.role === 'moderator' || guide.author === CA.name)) {
        if (guide.author === CA.name) {
            ad.innerHTML += '<button class="btn btn-secondary" data-edit-guide="' + guide.id + '">✏️ Редактировать</button>';
        }
        ad.innerHTML += '<button class="btn btn-danger" data-del-guide="' + guide.id + '">🗑 Удалить</button>';
    }

    document.getElementById('modal-guide-view').style.display = 'flex';
    document.getElementById('modal-guide-view').classList.add('show');

    setTimeout(() => {
        document.querySelector('[data-edit-guide="' + guide.id + '"]')?.addEventListener('click', () => {
            closeModal('modal-guide-view');
            editGuide(guide.id);
        });
        document.querySelector('[data-del-guide="' + guide.id + '"]')?.addEventListener('click', () => {
            deleteGuide(guide.id);
            closeModal('modal-guide-view');
        });
    }, 10);
}

// ============================================================
// ПРОКИДКА В WINDOW (для совместимости)
// ============================================================
window.deleteGuide = deleteGuide;
window.openGuideModal = openGuideModal;

// ============================================================
// ЭКСПОРТЫ
// ============================================================
export { userGuides };