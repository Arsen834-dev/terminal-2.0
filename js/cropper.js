// ============================================================
// CROPPER / Редактор изображений (drag, zoom, rotate)
// v1.0.0
// ============================================================

let cropState = {
    img: null,
    canvas: null,
    ctx: null,
    zoom: 1,
    rotate: 0,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    mode: 'avatar',  // 'avatar' | 'cover'
    width: 0,
    height: 0
};

let listenersAttached = false;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
export function initCropper() {
    if (listenersAttached) return;
    listenersAttached = true;

    let fileInput = document.getElementById('image-choice-file');
    let zoomInput = document.getElementById('crop-zoom');
    let rotateInput = document.getElementById('crop-rotate');
    let canvas = document.getElementById('crop-canvas');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            let file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                alert('Файл больше 5 МБ');
                return;
            }
            let reader = new FileReader();
            reader.onload = (ev) => {
                let img = new Image();
                img.onload = () => {
                    cropState.img = img;
                    cropState.zoom = 1;
                    cropState.rotate = 0;
                    cropState.offsetX = 0;
                    cropState.offsetY = 0;
                    document.getElementById('crop-preview').style.display = 'block';
                    document.getElementById('crop-controls').style.display = 'block';
                    if (zoomInput) zoomInput.value = 1;
                    if (rotateInput) rotateInput.value = 0;
                    cropState.canvas = canvas;
                    cropState.ctx = canvas.getContext('2d');
                    resizeCropCanvas();
                    drawCrop();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (zoomInput) {
        zoomInput.addEventListener('input', () => {
            cropState.zoom = parseFloat(zoomInput.value);
            drawCrop();
        });
    }

    if (rotateInput) {
        rotateInput.addEventListener('input', () => {
            cropState.rotate = parseInt(rotateInput.value);
            drawCrop();
        });
    }

    if (canvas) {
        // Mouse
        canvas.addEventListener('mousedown', (e) => {
            if (!cropState.img) return;
            cropState.dragging = true;
            cropState.dragStartX = e.clientX - cropState.offsetX;
            cropState.dragStartY = e.clientY - cropState.offsetY;
            canvas.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', (e) => {
            if (!cropState.dragging) return;
            cropState.offsetX = e.clientX - cropState.dragStartX;
            cropState.offsetY = e.clientY - cropState.dragStartY;
            drawCrop();
        });
        document.addEventListener('mouseup', () => {
            if (cropState.dragging) {
                cropState.dragging = false;
                if (cropState.canvas) cropState.canvas.style.cursor = 'grab';
            }
        });

        // Touch (мобилки)
        canvas.addEventListener('touchstart', (e) => {
            if (!cropState.img) return;
            if (e.touches.length === 1) {
                cropState.dragging = true;
                cropState.dragStartX = e.touches[0].clientX - cropState.offsetX;
                cropState.dragStartY = e.touches[0].clientY - cropState.offsetY;
            }
        }, { passive: true });
        canvas.addEventListener('touchmove', (e) => {
            if (!cropState.dragging || e.touches.length !== 1) return;
            e.preventDefault();
            cropState.offsetX = e.touches[0].clientX - cropState.dragStartX;
            cropState.offsetY = e.touches[0].clientY - cropState.dragStartY;
            drawCrop();
        }, { passive: false });
        canvas.addEventListener('touchend', () => {
            cropState.dragging = false;
        });

        canvas.style.cursor = 'grab';
    }

    window.addEventListener('resize', () => {
        if (cropState.img && cropState.canvas) {
            resizeCropCanvas();
            drawCrop();
        }
    });
}

// ============================================================
// РЕЖИМ
// ============================================================
export function setCropMode(mode) {
    cropState.mode = mode;
    cropState.offsetX = 0;
    cropState.offsetY = 0;
    cropState.zoom = 1;
    cropState.rotate = 0;
    let zi = document.getElementById('crop-zoom');
    let ri = document.getElementById('crop-rotate');
    if (zi) zi.value = 1;
    if (ri) ri.value = 0;

    // Меняем подсказку
    let ratio = mode === 'avatar' ? '1:1' : '3:1';
    let hint = document.getElementById('crop-hint');
    if (hint) hint.textContent = 'Формат ' + ratio + ' · перетаскивай мышью, крути зум и поворот';

    if (cropState.img && cropState.canvas) {
        resizeCropCanvas();
        drawCrop();
    }
}

// ============================================================
// CANVAS
// ============================================================
function resizeCropCanvas() {
    let wrap = document.getElementById('crop-preview');
    let canvas = cropState.canvas;
    if (!wrap || !canvas) return;

    // Меняем высоту превью в зависимости от режима
    if (cropState.mode === 'avatar') {
        wrap.style.height = '320px';
    } else {
        wrap.style.height = '220px';
    }

    let rect = wrap.getBoundingClientRect();
    let dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    cropState.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cropState.width = rect.width;
    cropState.height = rect.height;
}

function getCropRect() {
    let w = cropState.width;
    let h = cropState.height;
    let cropW, cropH;

    if (cropState.mode === 'avatar') {
        cropH = h * 0.85;
        cropW = cropH;
        // Ограничим если ширина больше
        if (cropW > w * 0.9) {
            cropW = w * 0.9;
            cropH = cropW;
        }
    } else {
        cropW = w * 0.95;
        cropH = cropW / 3;
        if (cropH > h * 0.85) {
            cropH = h * 0.85;
            cropW = cropH * 3;
        }
    }

    let cropX = (w - cropW) / 2;
    let cropY = (h - cropH) / 2;
    return { x: cropX, y: cropY, w: cropW, h: cropH };
}

function drawCrop() {
    let ctx = cropState.ctx;
    let img = cropState.img;
    let canvas = cropState.canvas;
    if (!ctx || !img || !canvas) return;

    let w = cropState.width;
    let h = cropState.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#06060a';
    ctx.fillRect(0, 0, w, h);

    let crop = getCropRect();

    // Масштаб картинки под crop
    let imgAspect = img.width / img.height;
    let cropAspect = crop.w / crop.h;
    let baseScale;
    if (imgAspect > cropAspect) {
        baseScale = crop.h / img.height;
    } else {
        baseScale = crop.w / img.width;
    }
    let scale = baseScale * cropState.zoom;

    // Рисуем картинку с обрезкой
    ctx.save();
    ctx.beginPath();
    ctx.rect(crop.x, crop.y, crop.w, crop.h);
    ctx.clip();

    let cx = crop.x + crop.w / 2 + cropState.offsetX;
    let cy = crop.y + crop.h / 2 + cropState.offsetY;

    ctx.translate(cx, cy);
    ctx.rotate(cropState.rotate * Math.PI / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Затемнение вне кропа
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, crop.y);
    ctx.fillRect(0, crop.y + crop.h, w, h - crop.y - crop.h);
    ctx.fillRect(0, crop.y, crop.x, crop.h);
    ctx.fillRect(crop.x + crop.w, crop.y, w - crop.x - crop.w, crop.h);

    // Рамка кропа
    ctx.strokeStyle = 'rgba(255,23,68,0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

    // Уголки
    let cornerLen = 20;
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 3;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(crop.x, crop.y + cornerLen);
    ctx.lineTo(crop.x, crop.y);
    ctx.lineTo(crop.x + cornerLen, crop.y);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w - cornerLen, crop.y);
    ctx.lineTo(crop.x + crop.w, crop.y);
    ctx.lineTo(crop.x + crop.w, crop.y + cornerLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(crop.x, crop.y + crop.h - cornerLen);
    ctx.lineTo(crop.x, crop.y + crop.h);
    ctx.lineTo(crop.x + cornerLen, crop.y + crop.h);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w - cornerLen, crop.y + crop.h);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h - cornerLen);
    ctx.stroke();
}

// ============================================================
// ЭКСПОРТ ИЗОБРАЖЕНИЯ
// ============================================================
export function getCroppedBlob() {
    return new Promise((resolve) => {
        let img = cropState.img;
        if (!img) { resolve(null); return; }

        let isAvatar = cropState.mode === 'avatar';
        let outW = isAvatar ? 256 : 1200;
        let outH = isAvatar ? 256 : 400;

        let canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        let ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';

        let crop = getCropRect();

        let imgAspect = img.width / img.height;
        let cropAspect = crop.w / crop.h;
        let baseScale;
        if (imgAspect > cropAspect) {
            baseScale = crop.h / img.height;
        } else {
            baseScale = crop.w / img.width;
        }
        let scale = baseScale * cropState.zoom;

        // Коэффициент перевода из canvas-координат в выходные
        let k = outW / crop.w;

        ctx.save();
        ctx.translate(outW / 2 + cropState.offsetX * k, outH / 2 + cropState.offsetY * k);
        ctx.rotate(cropState.rotate * Math.PI / 180);
        ctx.scale(scale * k, scale * k);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
    });
}

// ============================================================
// СБРОС
// ============================================================
export function resetCropper() {
    cropState.img = null;
    cropState.zoom = 1;
    cropState.rotate = 0;
    cropState.offsetX = 0;
    cropState.offsetY = 0;
    cropState.mode = 'avatar';
    let preview = document.getElementById('crop-preview');
    if (preview) preview.style.display = 'none';
    let controls = document.getElementById('crop-controls');
    if (controls) controls.style.display = 'none';
    let zi = document.getElementById('crop-zoom');
    let ri = document.getElementById('crop-rotate');
    if (zi) zi.value = 1;
    if (ri) ri.value = 0;
    let hint = document.getElementById('crop-hint');
    if (hint) hint.textContent = 'Формат 1:1 · перетаскивай мышью, крути зум и поворот';
}

export function hasImage() {
    return !!cropState.img;
}