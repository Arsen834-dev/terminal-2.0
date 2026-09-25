// ============================================================
// UI / MODALS — confirmDialog, closeModal, делегирование
// ============================================================

import { closeModal } from '../utils.js';

// ============================================================
// CONFIRM DIALOG
// ============================================================
export function confirmDialog(title, text, onConfirm) {
    let modal = document.getElementById('modal-confirm');
    if (!modal) {
        if (window.confirm(text)) onConfirm();
        return;
    }
    document.getElementById('modal-confirm-title').textContent = title || 'ПОДТВЕРЖДЕНИЕ';
    document.getElementById('modal-confirm-text').textContent = text || '';

    // Клонируем кнопку, чтобы снять старые обработчики
    let okBtn = document.getElementById('modal-confirm-ok');
    let newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    newOk.addEventListener('click', () => {
        closeModal('modal-confirm');
        if (typeof onConfirm === 'function') onConfirm();
    });

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

// ============================================================
// DELEGATION: [data-close-modal]
// ============================================================
export function initModalCloseHandlers() {
    document.addEventListener('click', (e) => {
        let closeBtn = e.target.closest('[data-close-modal]');
        if (!closeBtn) return;
        let id = closeBtn.dataset.closeModal;
        if (id) closeModal(id);
    });
}