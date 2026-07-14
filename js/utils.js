// ============ UTILS / ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

export function notif(msg) {
    let n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a0000;border:2px solid #ff1744;padding:15px 30px;z-index:1000;font-family:VT323;color:#ff1744;font-size:1.3rem;';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

export function closeModal(id) {
    let el = document.getElementById(id);
    if (el) {
        el.classList.remove('show');
        setTimeout(() => el.style.display = 'none', 200);
    }
}

export function uploadFileAndInsert(event, inputId) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function() {
        let inp = document.getElementById(inputId);
        if (inp) inp.value += '[img]' + reader.result + '[/img] ';
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}