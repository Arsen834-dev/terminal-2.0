// ============================================================
// SHOP / МАГАЗИН И ИНВЕНТАРЬ
// v2.9.6: убраны руны/готика/western, ревизия цен, синхронизация CA
// ============================================================

import { supabase, CA, inventory, activeItems, activeBooster, boosterEndTime, saveAgent, setInventory } from './auth.js';
import { REMOVED_ITEM_IDS } from './config.js';
import { playSound } from './sounds.js';

export const shopItems = {
    colors: [
        { id: 'c_red', name: 'Красный', price: 0, color: '#ff1744' },
        { id: 'c_gray', name: 'Серый', price: 60, color: '#9e9e9e' },
        { id: 'c_blue', name: 'Синий', price: 80, color: '#448aff' },
        { id: 'c_green', name: 'Зелёный', price: 80, color: '#00ff41' },
        { id: 'c_yellow', name: 'Жёлтый', price: 80, color: '#ffd700' },
        { id: 'c_orange', name: 'Оранжевый', price: 80, color: '#ff9100' },
        { id: 'c_white', name: 'Белый', price: 120, color: '#ffffff' },
        { id: 'c_purple', name: 'Фиолетовый', price: 120, color: '#b388ff' },
        { id: 'c_cyan', name: 'Бирюзовый', price: 120, color: '#00e5ff' },
        { id: 'c_pink', name: 'Розовый', price: 150, color: '#ff80ab' },
        { id: 'c_dark_purple', name: 'Тёмный-фиолет', price: 450, color: '#7c4dff' },
        { id: 'c_silver', name: 'Серебряный', price: 500, color: '#cfd8dc' },
        { id: 'c_gold', name: 'Золотой', price: 700, color: '#c9a800' },
        { id: 'c_sapphire', name: 'Сапфировый', price: 850, color: '#1565c0' },
        { id: 'c_neon_green', name: 'Неон-зелёный', price: 900, color: '#76ff03' },
        { id: 'c_neon_blue', name: 'Неон-синий', price: 900, color: '#40c4ff' },
        { id: 'c_fire', name: 'Огненный', price: 1000, color: '#ff3d00' },
        { id: 'c_ice', name: 'Ледяной', price: 1000, color: '#80deea' },
        { id: 'c_blood', name: 'Кроваво-красный', price: 1200, color: '#d50000' },
        { id: 'c_matrix', name: 'Матрица', price: 1400, color: '#00ff41' },
        { id: 'c_void', name: 'Пустота', price: 2000, color: '#0a0a0a' },
        { id: 'c_rainbow', name: 'Переливающийся', price: 2200, color: 'rainbow' },
        { id: 'c_aurora', name: 'Северное сияние', price: 2500, color: '#00e676' }
    ],
    frames: [
        { id: 'f_default', name: 'Без рамки', price: 0, cssClass: 'f-default' },
        { id: 'f_silver', name: 'Серебряная', price: 250, cssClass: 'f-silver' },
        { id: 'f_gold', name: 'Золотая', price: 350, cssClass: 'f-gold' },
        { id: 'f_spike', name: 'Шипованная', price: 400, cssClass: 'f-spike' },
        { id: 'f_fire', name: 'Огненная', price: 450, cssClass: 'f-fire' },
        { id: 'f_ice', name: 'Ледяная', price: 450, cssClass: 'f-ice' },
        { id: 'f_organic', name: 'Органика', price: 500, cssClass: 'f-organic' },
        { id: 'f_techno', name: 'Техно', price: 500, cssClass: 'f-techno' },
        { id: 'f_neon', name: 'Неоновая', price: 550, cssClass: 'f-neon' },
        { id: 'f_blood', name: 'Кровавая', price: 600, cssClass: 'f-blood' },
        { id: 'f_glitch', name: 'Глючная', price: 650, cssClass: 'f-glitch' },
        { id: 'f_shadow', name: 'Теневая', price: 650, cssClass: 'f-shadow' },
        { id: 'f_skull', name: 'Черепная', price: 700, cssClass: 'f-skull' },
        { id: 'f_cyber', name: 'Кибер-рамка', price: 750, cssClass: 'f-cyber' },
        { id: 'f_crystal', name: 'Хрустальная', price: 800, cssClass: 'f-crystal' },
        { id: 'f_royal', name: 'Королевская', price: 900, cssClass: 'f-royal' },
        { id: 'f_demonic', name: 'Демоническая', price: 1100, cssClass: 'f-demonic' },
        { id: 'f_angelic', name: 'Ангельская', price: 1100, cssClass: 'f-angelic' },
        { id: 'f_iridescent', name: 'Переливающаяся', price: 1500, cssClass: 'f-iridescent' }
    ],
    badges: [
        { id: 'b_none', name: 'Без бейджика', price: 0, emoji: '', image: '' },
        { id: 'b_toolbox', name: 'Тулбокс', price: 250, emoji: '', image: 'https://wiki.adven.space/items/contraband/toolbox_yellow.png' },
        { id: 'b_gasmask', name: 'Противогаз', price: 250, emoji: '', image: 'https://wiki.adven.space/items/contraband/gasmask.png' },
        { id: 'b_holoclown', name: 'Голоклоун', price: 300, emoji: '', image: 'https://wiki.adven.space/items/contraband/holoclown.png' },
        { id: 'b_fireaxe', name: 'Огненный топор', price: 300, emoji: '', image: 'https://wiki.adven.space/items/contraband/fireaxeflaming.png' },
        { id: 'b_chain', name: 'Бензопила', price: 300, emoji: '', image: 'https://wiki.adven.space/items/contraband/chain.png' },
        { id: 'b_soap', name: 'Мыло Синдиката', price: 350, emoji: '', image: 'https://wiki.adven.space/items/contraband/syndie-soap.png' },
        { id: 'b_holygrenade', name: 'Святая граната', price: 350, emoji: '', image: 'https://wiki.adven.space/items/contraband/holygrenade.png' },
        { id: 'b_balloon', name: 'Воздушный шарик Синдиката', price: 400, emoji: '', image: 'https://wiki.adven.space/items/contraband/sballoon.png' },
        { id: 'b_syndiborg', name: 'Штурмовой Борг', price: 400, emoji: '', image: 'https://wiki.adven.space/items/contraband/syndiborg.png' },
        { id: 'b_medborg', name: 'Медицинский Борг', price: 400, emoji: '', image: 'https://wiki.adven.space/items/contraband/medicalborgsyndie.png' },
        { id: 'b_c4', name: 'C-4', price: 500, emoji: '', image: 'https://wiki.adven.space/items/contraband/c4.gif' },
        { id: 'b_idcard', name: 'ID карта Синдиката', price: 500, emoji: '', image: 'https://wiki.adven.space/items/contraband/id_card-syndie.png' },
        { id: 'b_dsword', name: 'Дабла', price: 500, emoji: '', image: 'https://wiki.adven.space/items/contraband/e_sword_double.png' },
        { id: 'b_esword', name: 'Энергомеч', price: 550, emoji: '', image: 'https://wiki.adven.space/items/contraband/e_sword.png' },
        { id: 'b_shield', name: 'Энергощит', price: 550, emoji: '', image: 'https://wiki.adven.space/items/contraband/e_shield.png' },
        { id: 'b_mask', name: 'Противогаз Синдиката', price: 550, emoji: '', image: 'https://wiki.adven.space/items/contraband/clothingmaskgassyndicate.png' },
        { id: 'b_sabotage', name: 'Саботажный Борг', price: 600, emoji: '', image: 'https://wiki.adven.space/items/contraband/sabotageborg.png' },
        { id: 'b_powersink', name: 'Поглотитель энергии', price: 700, emoji: '', image: 'https://wiki.adven.space/items/contraband/powersink.png' },
        { id: 'b_juggernaut', name: 'Костюм джаггернаута CyberSun', price: 800, emoji: '', image: 'https://wiki.adven.space/items/contraband/hardsuit-cybersun.png' },
        { id: 'b_ears', name: 'Кошачьи ушки', price: 900, emoji: '', image: 'https://wiki.adven.space/items/contraband/ears.png' }
    ],
    fonts: [
        { id: 'fnt_default', name: 'Стандартный', price: 0 },
        { id: 'fnt_comic', name: 'Комикс', price: 200 },
        { id: 'fnt_typewriter', name: 'Машинопись', price: 200 },
        { id: 'fnt_cyber', name: 'Кибер', price: 350 },
        { id: 'fnt_stencil', name: 'Трафарет', price: 400 },
        { id: 'fnt_medieval', name: 'Средневековье', price: 400 },
        { id: 'fnt_pixel', name: 'Пиксель', price: 500 },
        { id: 'fnt_neon', name: 'Неон', price: 700 },
        { id: 'fnt_glitch', name: 'Глитч', price: 1000 },
        { id: 'fnt_blood', name: 'Кровавый', price: 1500 }
    ],
    sounds: [
        { id: 'snd_custom', name: 'Свой звук', price: 500, url: 'custom' }
    ],
    boosters: [
        { id: 'b_tk_6h', name: 'x2 ТК 6ч', price: 80, effect: 'tk_x2', duration: 6 },
        { id: 'b_tk_24h', name: 'x2 ТК 24ч', price: 250, effect: 'tk_x2', duration: 24 },
        { id: 'b_rep_24h', name: 'x2 РЕП 24ч', price: 400, effect: 'rep_x2', duration: 24 },
        { id: 'b_tk_7d', name: 'x2 ТК неделя', price: 1000, effect: 'tk_x2', duration: 168 }
    ]
};

let shopCategory = 'colors';
let invCategory = 'color';
let discountedItems = {};
let discountEndTime = 0;
let shopLogs = JSON.parse(localStorage.getItem('syndicate_shop_logs') || '[]');

export function getActiveColorClass() {
    return getActiveColorClassForId(activeItems.color);
}

export function getActiveColorClassForId(id) {
    let map = {
        'c_red': 'color-red', 'c_blue': 'color-blue', 'c_green': 'color-green',
        'c_yellow': 'color-yellow', 'c_white': 'color-white', 'c_orange': 'color-orange',
        'c_purple': 'color-purple', 'c_pink': 'color-pink', 'c_cyan': 'color-cyan',
        'c_gray': 'color-gray', 'c_gold': 'color-gold', 'c_neon_green': 'color-neon-green',
        'c_neon_blue': 'color-neon-blue', 'c_fire': 'color-fire', 'c_ice': 'color-ice',
        'c_dark_purple': 'color-dark-purple', 'c_blood': 'color-blood',
        'c_silver': 'color-silver', 'c_rainbow': 'rainbow-text',
        'c_sapphire': 'color-sapphire', 'c_void': 'color-void',
        'c_aurora': 'color-aurora', 'c_matrix': 'color-matrix'
    };
    return map[id] || '';
}

export function getActiveFrameClass() {
    let f = shopItems.frames.find(i => i.id === activeItems.frame);
    return f ? f.cssClass : 'f-default';
}

export function getActiveFontClass() {
    let m = {
        'fnt_cyber': 'font-cyber', 'fnt_glitch': 'font-glitch',
        'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil',
        'fnt_pixel': 'font-pixel', 'fnt_blood': 'font-blood', 'fnt_neon': 'font-neon',
        'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic'
    };
    return m[activeItems.font] || '';
}

export function getActiveBadgeEmoji() {
    let b = shopItems.badges.find(i => i.id === activeItems.badge);
    return b && b.image ? '<img src="' + b.image + '" style="width:24px;height:24px;vertical-align:middle;">' :
           (b && b.emoji ? b.emoji : '');
}

export function loadDiscount() {
    let saved = JSON.parse(localStorage.getItem('syndicate_discount') || 'null');
    if (saved && Date.now() < saved.endTime) {
        discountedItems = saved.items || {};
        discountEndTime = saved.endTime;
    } else {
        generateNewDiscount();
    }
}

function getAllShopItems() {
    let all = [];
    shopItems.colors.forEach(item => { if (item.price > 0) all.push({ ...item, category: 'color', catKey: 'colors' }); });
    shopItems.frames.forEach(item => { if (item.price > 0) all.push({ ...item, category: 'frame', catKey: 'frames' }); });
    shopItems.badges.forEach(item => { if (item.price > 0) all.push({ ...item, category: 'badge', catKey: 'badges' }); });
    shopItems.fonts.forEach(item => { if (item.price > 0) all.push({ ...item, category: 'font', catKey: 'fonts' }); });
    shopItems.boosters.forEach(item => { if (item.price > 0) all.push({ ...item, category: 'booster', catKey: 'boosters' }); });
    return all;
}

export function generateNewDiscount() {
    if (Date.now() < discountEndTime + 3600000 && Object.keys(discountedItems).length > 0) {
        updateDiscountDisplay();
        return;
    }
    let allItems = getAllShopItems();
    discountedItems = {};
    let count = 3 + Math.floor(Math.random() * 4);
    let shuffled = [...allItems].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        let item = shuffled[i];
        let discounts = [15, 20, 25, 30, 35, 40, 45, 50];
        let discount = discounts[Math.floor(Math.random() * discounts.length)];
        discountedItems[item.id] = {
            discount, name: item.name,
            category: item.category, originalPrice: item.price
        };
    }
    let duration = (2 + Math.floor(Math.random() * 5)) * 3600000;
    discountEndTime = Date.now() + duration;
    localStorage.setItem('syndicate_discount', JSON.stringify({ items: discountedItems, endTime: discountEndTime }));
    updateDiscountDisplay();
}

export function getItemDiscount(itemId) {
    if (discountedItems[itemId] && Date.now() < discountEndTime) return discountedItems[itemId].discount;
    return 0;
}

export function getDiscountedPrice(itemId, originalPrice) {
    if (originalPrice === 0) return 0;
    let discount = getItemDiscount(itemId);
    return discount > 0 ? Math.floor(originalPrice * (1 - discount / 100)) : originalPrice;
}

export function formatPrice(itemId, price) {
    if (price === 0) return '0 ТК';
    let discount = getItemDiscount(itemId);
    let discounted = getDiscountedPrice(itemId, price);
    if (discount > 0) {
        return '<span style="text-decoration:line-through;color:var(--text-3);font-size:0.8rem;">' + price +
               '</span> <span style="color:var(--accent);font-weight:700;">' + discounted +
               ' ТК</span> <span style="color:var(--warning);font-size:0.75rem;">-' + discount + '%</span>';
    }
    return '<span style="color:var(--accent);font-weight:600;">' + price + ' ТК</span>';
}

export function updateDiscountDisplay() {
    let container = document.getElementById('discount-container');
    if (!container) return;
    if (Object.keys(discountedItems).length > 0 && Date.now() < discountEndTime) {
        let left = Math.max(0, discountEndTime - Date.now());
        let h = Math.floor(left / 3600000);
        let m = Math.floor((left % 3600000) / 60000);
        let html = '<div class="card" style="border-color:var(--accent);margin-bottom:16px;">';
        html += '<div style="color:var(--accent);font-size:1.05rem;font-weight:700;">🔥 Скидки</div>';
        html += '<div style="color:var(--text-3);font-size:0.8rem;margin:4px 0;">⏳ Осталось: ' + h + 'ч ' + m + 'м</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">';
        Object.values(discountedItems).forEach(item => {
            let discounted = Math.floor(item.originalPrice * (1 - item.discount / 100));
            html += '<span style="background:rgba(255,23,68,0.1);border:1px solid var(--accent);padding:4px 10px;font-size:0.75rem;color:var(--accent);border-radius:999px;">' + item.name + ' -' + item.discount + '% (' + discounted + ' ТК)</span>';
        });
        html += '</div></div>';
        container.innerHTML = html;
        container.style.display = 'block';
    } else {
        container.innerHTML = '';
        container.style.display = 'none';
    }
}

export function getBoosterTimeLeft() {
    if (!boosterEndTime) return '';
    let n = Date.now(), e = new Date(boosterEndTime).getTime();
    if (n >= e) return '';
    let d = e - n, h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000);
    return h + 'ч ' + m + 'м';
}

export async function saveInventory() {
    if (!CA) return;
    localStorage.setItem('syndicate_inventory_' + CA.name, JSON.stringify(inventory));
    try {
        await supabase.from('agents').update({
            inventory: inventory,
            active_color: activeItems.color,
            active_frame: activeItems.frame,
            active_badge: activeItems.badge,
            active_font: activeItems.font,
            active_style: activeItems.style || '',
            active_sound: activeItems.sound || '',
            active_booster: activeBooster,
            booster_end_time: boosterEndTime
        }).eq('name', CA.name);
    } catch (e) { console.error("Ошибка сохранения инвентаря:", e); }
}

export async function loadInventory() {
    if (!CA) return;
    let cloudInventory = (CA.inventory || []).filter(item => !REMOVED_ITEM_IDS.includes(item.id));
    setInventory(cloudInventory);

    activeItems.color = (CA.active_color && !REMOVED_ITEM_IDS.includes(CA.active_color)) ? CA.active_color : 'c_red';
    activeItems.frame = (CA.active_frame && !REMOVED_ITEM_IDS.includes(CA.active_frame)) ? CA.active_frame : 'f_default';
    activeItems.badge = (CA.active_badge && !REMOVED_ITEM_IDS.includes(CA.active_badge)) ? CA.active_badge : 'b_none';
    activeItems.font = (CA.active_font && !REMOVED_ITEM_IDS.includes(CA.active_font)) ? CA.active_font : 'fnt_default';
    activeItems.style = '';
    activeItems.sound = CA.active_sound || '';
    activeItems.avatar_url = CA.avatar_url || '';
}

export function previewItem(cat, id) {
    let cats = { color: 'colors', frame: 'frames', badge: 'badges', font: 'fonts', sound: 'sounds', booster: 'boosters' };
    let item = shopItems[cats[cat]] ? shopItems[cats[cat]].find(i => i.id === id) : null;
    if (!item) return;
    let t = item.name, c = '';

    if (cat === 'color') {
        let colClass = getActiveColorClassForId(id);
        c = '<div style="font-size:2.2rem;padding:20px;display:inline-block;" class="' + colClass + '">АГЕНТ</div>';
    } else if (cat === 'frame') {
        c = '<div style="display:inline-flex;align-items:center;justify-content:center;width:100px;height:100px;border-radius:12px;position:relative;" class="chat-avatar-frame ' + (item.cssClass || 'f-default') + '">' +
            '<div class="inner" style="font-size:2.5rem;">🕶️</div></div>';
    } else if (cat === 'badge') {
        c = item.image
            ? '<img src="' + item.image + '" style="max-width:120px;max-height:120px;">'
            : '<div style="font-size:2.5rem;">🏅</div>';
        c += '<div style="margin-top:8px;color:var(--text-2);font-size:0.85rem;">' + item.name + '</div>';
    } else if (cat === 'font') {
        let fc = {
            'fnt_cyber': 'font-cyber', 'fnt_glitch': 'font-glitch',
            'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil',
            'fnt_pixel': 'font-pixel', 'fnt_blood': 'font-blood', 'fnt_neon': 'font-neon',
            'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic'
        }[item.id] || '';        
        c = '<div style="font-size:2rem;padding:20px;" class="' + fc + '">Пример текста</div>';
    } else if (cat === 'sound') {
        c = '<div style="font-size:2rem;padding:10px;">🎵 ' + item.name + '</div>';
    } else if (cat === 'booster') {
        c = '<div style="font-size:2rem;padding:10px;">⚡ ' + item.name + '</div><div style="color:var(--text-3);">Длительность: ' + item.duration + 'ч</div>';
    }

    document.getElementById('modal-preview-title').textContent = t;
    document.getElementById('modal-preview-content').innerHTML = c;
    let el = document.getElementById('modal-preview');
    el.style.display = 'flex';
    el.classList.add('show');
}

export function renderShop() {
    let c = document.getElementById('shop-content');
    if (!CA || !c) return;
    updateDiscountDisplay();
    let discountContainer = document.getElementById('discount-container');
    let existingHtml = discountContainer ? discountContainer.innerHTML : '';
    c.innerHTML = '<div id="discount-container" style="display:none;">' + existingHtml + '</div>' +
        '<div style="font-size:1.05rem;margin-bottom:16px;font-weight:700;">💰 Баланс: <span style="color:var(--accent);">' + CA.crystals + ' ТК</span></div>' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
        '<div id="shop-cats" style="flex:0 0 200px;display:flex;flex-direction:column;gap:6px;"></div>' +
        '<div id="shop-items" style="flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;min-width:250px;"></div>' +
        '</div>';
    updateDiscountDisplay();
    renderShopCategories();
    renderShopItems();
}

export function renderShopCategories() {
    shopCategory = window.shopCategory || 'colors';
    let cats = document.getElementById('shop-cats');
    if (!cats) return;
    let names = { colors: '🎨 Цвета', frames: '🖼 Рамки', badges: '🏅 Бейджики', fonts: '🔤 Шрифты', sounds: '🎵 Звуки', boosters: '⚡ Ускорители' };
    cats.innerHTML = Object.keys(names).map(k => '<button class="btn ' + (shopCategory === k ? '' : 'secondary') + '" data-shop-cat="' + k + '" style="justify-content:flex-start;">' + names[k] + '</button>').join('');
    setTimeout(() => {
        document.querySelectorAll('[data-shop-cat]').forEach(b => {
            b.addEventListener('click', function() {
                window.shopCategory = this.dataset.shopCat;
                renderShopCategories();
                renderShopItems();
            });
        });
    }, 10);
}

export function renderShopItems() {
    shopCategory = window.shopCategory || shopCategory;
    let items = document.getElementById('shop-items');
    if (!items) return;
    let list = shopItems[shopCategory] || [];
    let cs = shopCategory.replace(/s$/, '');

    items.innerHTML = list.map(item => {
        let owned = inventory.find(i => i.id === item.id);
        let active = activeItems[cs] === item.id;
        let itemDiscount = getItemDiscount(item.id);
        let borderColor = 'var(--border-2)';
        if (active) borderColor = 'var(--success)';
        else if (owned) borderColor = 'var(--warning)';
        if (itemDiscount > 0) borderColor = 'var(--accent)';

        let prev = '';
        if (shopCategory === 'colors') {
            prev = '<span class="' + getActiveColorClassForId(item.id) + '" style="font-size:1.1rem;padding:8px;display:inline-block;">АГЕНТ</span>';
        } else if (shopCategory === 'frames') {
            prev = '<div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:9px;position:relative;" class="chat-avatar-frame ' + (item.cssClass || 'f-default') + '">' +
                '<span class="inner" style="font-size:1.8rem;">🕶️</span></div>';
        } else if (shopCategory === 'badges') {
            prev = item.image
                ? '<img src="' + item.image + '" style="max-width:64px;max-height:64px;">'
                : '<div style="font-size:2.2rem;">🏅</div>';
        } else if (shopCategory === 'fonts') {
        let ff = {
            'fnt_cyber': 'font-cyber', 'fnt_glitch': 'font-glitch',
            'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil',
            'fnt_pixel': 'font-pixel', 'fnt_blood': 'font-blood', 'fnt_neon': 'font-neon',
            'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic'
        }[item.id] || '';
            prev = '<div style="padding:8px;font-size:1.1rem;" class="' + ff + '">АБВГД</div>';
        } else if (shopCategory === 'sounds') {
            prev = '<div style="font-size:1.6rem;padding:10px;">🔔</div>';
        } else {
            prev = '<div style="font-size:1.8rem;padding:10px;">⚡</div>';
        }

        let discountBadge = itemDiscount > 0 ? '<div style="color:var(--accent);font-size:0.7rem;font-weight:600;">🔥 -' + itemDiscount + '%</div>' : '';

        let btns = '';
        if (shopCategory === 'boosters') {
            if (activeBooster && activeBooster.id === item.id) {
                btns = '<div style="color:var(--accent);font-size:0.75rem;text-align:center;">⏳ ' + getBoosterTimeLeft() + '</div>';
            } else if (owned) {
                btns = '<button class="btn full" data-apply="' + cs + '" data-id="' + item.id + '" style="padding:8px;font-size:0.8rem;">Активировать</button>';
            } else {
                btns = '<button class="btn full" data-buy="' + cs + '" data-id="' + item.id + '" style="padding:8px;font-size:0.8rem;">Купить</button>';
            }
        } else {
            if (active) {
                btns = '<div style="color:var(--success);font-size:0.75rem;text-align:center;">✓ Активно</div><button class="btn secondary full" data-reset="' + cs + '" style="padding:6px;font-size:0.7rem;margin-top:4px;">Сброс</button>';
            } else if (owned) {
                btns = '<button class="btn full" data-apply="' + cs + '" data-id="' + item.id + '" style="padding:8px;font-size:0.8rem;">Применить</button>';
            } else {
                btns = '<button class="btn full" data-buy="' + cs + '" data-id="' + item.id + '" style="padding:8px;font-size:0.8rem;">Купить</button>';
            }
        }

        return '<div class="card" style="border-color:' + borderColor + ';cursor:pointer;padding:14px;overflow:visible;" onclick="window.previewItem(\'' + cs + '\',\'' + item.id + '\')">' +
            '<div style="text-align:center;padding:10px;min-height:80px;display:flex;align-items:center;justify-content:center;overflow:visible;">' + prev + '</div>' +
            '<div style="font-weight:600;margin:8px 0;text-align:center;font-size:0.85rem;">' + item.name + '</div>' + discountBadge +
            '<div style="text-align:center;font-size:0.8rem;">' + formatPrice(item.id, item.price || 0) + '</div>' +
            '<div style="margin-top:8px;">' + btns + '</div>' +
            '</div>';
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); buyItem(this.dataset.buy, this.dataset.id); }));
        document.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); applyItem(this.dataset.apply, this.dataset.id); }));
        document.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); resetItem(this.dataset.reset); }));
    }, 10);
}

export function buyItem(cat, id) {
    if (!CA) return;
    let cats = { color: 'colors', frame: 'frames', badge: 'badges', font: 'fonts', sound: 'sounds', booster: 'boosters' };
    let item = shopItems[cats[cat]] ? shopItems[cats[cat]].find(i => i.id === id) : null;
    if (!item) return;
    if (id === 'c_red' || id === 'f_default' || id === 'b_none' || id === 'fnt_default' || id === 'snd_default') return;
    let actualPrice = getDiscountedPrice(id, item.price);
    if (CA.crystals < actualPrice) return window.notif('⛔ Недостаточно ТК');
    if (inventory.find(i => i.id === id)) return window.notif('⚠ Уже куплено');

    CA.crystals -= actualPrice;
    inventory.push({ category: cat, id, name: item.name, price: actualPrice });
    saveInventory();
    saveAgent();
    supabase.from('agents').update({ inventory: inventory, crystals: CA.crystals }).eq('name', CA.name);

    renderShopItems();
    if (typeof window.updateStatusBar === 'function') window.updateStatusBar();

    let discount = getItemDiscount(id);
    addShopLog(CA.name, 'buy', item.name + (discount > 0 ? ' (скидка ' + discount + '%)' : ''), actualPrice);
    window.notif('✅ Куплено: ' + item.name);
    playSound('buy');
}

export function applyItem(cat, id) {
    if (!CA) return;

    if (cat === 'sound') {
        if (id === 'snd_custom') {
            let input = document.createElement('input');
            input.type = 'file'; input.accept = 'audio/mp3';
            input.onchange = function(e) {
                let file = e.target.files[0];
                if (!file || file.size > 500000) return window.notif('⛔ Файл до 500КБ');
                let reader = new FileReader();
                reader.onload = function() {
                    activeItems.sound = reader.result;
                    saveAgent();
                    window.notif('✅ Звук загружен');
                    setTimeout(() => {
                        if (typeof window.__rerenderAll === 'function') window.__rerenderAll();
                    }, 50);
                };
                reader.readAsDataURL(file);
            };
            input.click();
        } else {
            activeItems.sound = id;
        }
        saveInventory(); saveAgent();
        renderShopItems(); renderInventory();
        if (typeof window.updateStatusBar === 'function') window.updateStatusBar();
        setTimeout(() => {
            if (typeof window.__rerenderAll === 'function') window.__rerenderAll();
        }, 50);
        return;
    }

    if (cat === 'booster') {
        let item = shopItems.boosters.find(i => i.id === id);
        if (!item) return;
        activeBooster = { id, effect: item.effect, duration: item.duration, name: item.name };
        boosterEndTime = new Date(Date.now() + item.duration * 3600000).toISOString();
        let idx = inventory.findIndex(i => i.id === id);
        if (idx !== -1) inventory.splice(idx, 1);
        saveInventory(); saveAgent();
        renderShopItems(); renderInventory();
        if (typeof window.updateStatusBar === 'function') window.updateStatusBar();
        setTimeout(() => {
            if (typeof window.__rerenderAll === 'function') window.__rerenderAll();
        }, 50);
        window.notif('⚡ Активирован: ' + item.name);
        playSound('buy');
        return;
    }

    // Обычный эффект — цвет / рамка / бейджик / шрифт
    activeItems[cat] = id;

    // Синхронизируем CA, чтобы эффект применился мгновенно
    if (cat === 'color') CA.active_color = id;
    if (cat === 'frame') CA.active_frame = id;
    if (cat === 'badge') CA.active_badge = id;
    if (cat === 'font') CA.active_font = id;

    saveInventory(); saveAgent();
    renderShopItems(); renderInventory();
    if (typeof window.updateStatusBar === 'function') window.updateStatusBar();

    setTimeout(() => {
        if (typeof window.__rerenderAll === 'function') window.__rerenderAll();
        if (typeof window.updateSidebarProfile === 'function') window.updateSidebarProfile();
    }, 50);
    window.notif('✅ Применено');
}

export function resetItem(cat) {
    if (!CA) return;
    if (cat === 'sound') {
        activeItems.sound = '';
        saveInventory(); saveAgent();
        renderShopItems(); renderInventory();
        setTimeout(() => {
            if (typeof window.__rerenderAll === 'function') window.__rerenderAll();
        }, 50);
        window.notif('🔇 Звук сброшен');
        return;
    }
    if (cat === 'booster') return;
    let d = { color: 'c_red', frame: 'f_default', badge: 'b_none', font: 'fnt_default' };
    activeItems[cat] = d[cat] || '';

    // Синхронизируем CA
    if (cat === 'color') CA.active_color = d.color;
    if (cat === 'frame') CA.active_frame = d.frame;
    if (cat === 'badge') CA.active_badge = d.badge;
    if (cat === 'font') CA.active_font = d.font;

    saveInventory(); saveAgent();
    renderShopItems(); renderInventory();
    if (typeof window.updateStatusBar === 'function') window.updateStatusBar();
    setTimeout(() => {
        if (typeof window.__rerenderAll === 'function') window.__rerenderAll();
        if (typeof window.updateSidebarProfile === 'function') window.updateSidebarProfile();
    }, 50);
    window.notif('🔄 Сброшено');
}

export function renderInventory() {
    invCategory = window.invCategory || invCategory;
    let c = document.getElementById('inventory-content');
    if (!CA || !c) return;
    if (inventory.length === 0) { c.innerHTML = '<div class="empty-state">Инвентарь пуст</div>'; return; }

    let catNames = { color: '🎨 Цвета', frame: '🖼 Рамки', badge: '🏅 Бейджики', font: '🔤 Шрифты', sound: '🎵 Звуки', booster: '⚡ Ускорители' };
    let catItems = {};
    inventory.forEach(item => {
        if (!catItems[item.category]) catItems[item.category] = [];
        catItems[item.category].push(item);
    });
    let cats = Object.keys(catItems);
    if (cats.length === 0) { c.innerHTML = '<div class="empty-state">Инвентарь пуст</div>'; return; }
    if (!invCategory || !catItems[invCategory]) invCategory = cats[0];

    c.innerHTML = '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
        '<div style="flex:0 0 200px;display:flex;flex-direction:column;gap:6px;">' +
        cats.map(cat => '<button class="btn ' + (invCategory === cat ? '' : 'secondary') + '" data-inv-cat="' + cat + '" style="justify-content:flex-start;">' + catNames[cat] + ' (' + catItems[cat].length + ')</button>').join('') +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;min-width:250px;">' +
        catItems[invCategory].map(item => {
            let active = activeItems[item.category] === item.id;
            let ba = activeBooster && activeBooster.id === item.id;
            let prev = '';
            if (item.category === 'color') prev = '<span class="' + getActiveColorClassForId(item.id) + '" style="font-size:1rem;padding:6px;display:inline-block;">АГЕНТ</span>';
            else if (item.category === 'frame') {
                let fi = shopItems.frames.find(i => i.id === item.id);
                prev = '<div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:8px;position:relative;" class="chat-avatar-frame ' + (fi ? fi.cssClass : 'f-default') + '"><span class="inner" style="font-size:1.5rem;">🕶️</span></div>';
            }
            else if (item.category === 'badge') {
                let bi = shopItems.badges.find(i => i.id === item.id);
                prev = bi && bi.image ? '<img src="' + bi.image + '" style="max-width:56px;max-height:56px;">' : '<div style="font-size:1.8rem;padding:8px;">' + (bi ? bi.emoji : '🏅') + '</div>';
            }
            else if (item.category === 'font') {
                let ff = {
                    'fnt_cyber': 'font-cyber', 'fnt_glitch': 'font-glitch',
                    'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil',
                    'fnt_pixel': 'font-pixel', 'fnt_blood': 'font-blood', 'fnt_neon': 'font-neon',
                    'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic'
                }[item.id] || '';
                prev = '<div style="padding:8px;font-size:0.9rem;" class="' + ff + '">АБВГД</div>';
            }
            else if (item.category === 'sound') {
                prev = '<div style="font-size:1.5rem;padding:8px;">🎵</div>';
                active = activeItems.sound && activeItems.sound !== '' && activeItems.sound !== 'snd_default';
            }
            else prev = '<div style="font-size:1.5rem;padding:8px;">⚡</div>';

            let btn = '';
            if (item.category === 'booster') {
                if (ba) btn = '<div style="color:var(--accent);font-size:0.75rem;text-align:center;">⏳ ' + getBoosterTimeLeft() + '</div>';
                else btn = '<button class="btn full" data-inv-apply="' + item.category + '" data-id="' + item.id + '" style="padding:8px;font-size:0.8rem;">Активировать</button>';
            } else {
                btn = active
                    ? '<button class="btn secondary full" data-inv-reset="' + item.category + '" style="padding:6px;font-size:0.75rem;">Сброс</button>'
                    : '<button class="btn full" data-inv-apply="' + item.category + '" data-id="' + item.id + '" style="padding:8px;font-size:0.8rem;">Применить</button>';
            }

            return '<div class="card" style="border-color:' + (active || ba ? 'var(--success)' : 'var(--border-2)') + ';padding:14px;text-align:center;overflow:visible;">' +
                '<div style="min-height:70px;display:flex;align-items:center;justify-content:center;overflow:visible;" onclick="window.previewItem(\'' + item.category + '\',\'' + item.id + '\')">' + prev + '</div>' +
                '<div style="font-weight:600;margin:6px 0;font-size:0.8rem;">' + item.name + '</div>' +
                btn + '</div>';
        }).join('') +
        '</div></div>';

    setTimeout(() => {
        document.querySelectorAll('[data-inv-cat]').forEach(b => b.addEventListener('click', function() { window.invCategory = this.dataset.invCat; renderInventory(); }));
        document.querySelectorAll('[data-inv-apply]').forEach(b => b.addEventListener('click', function() { applyItem(this.dataset.invApply, this.dataset.id); }));
        document.querySelectorAll('[data-inv-reset]').forEach(b => b.addEventListener('click', function() { resetItem(this.dataset.invReset); }));
    }, 10);
    window.invCategory = invCategory;
}

export function addShopLog(who, action, item, price) {
    let time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    shopLogs.unshift({ who, action, item, price, time });
    if (shopLogs.length > 200) shopLogs.pop();
    localStorage.setItem('syndicate_shop_logs', JSON.stringify(shopLogs));
}

export function getShopLogs() { return shopLogs; }

export { shopCategory, invCategory, discountedItems, discountEndTime };