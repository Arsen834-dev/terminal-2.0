// ============ AUTH / АГЕНТЫ ============
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, REMOVED_ITEM_IDS, AVATAR_BUCKET, AVATAR_MAX_SIZE, AVATAR_DIMENSION, COVER_BUCKET } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let CA = null;
let inventory = [];
let activeItems = {
    color: 'c_red',
    frame: 'f_default',
    badge: 'b_none',
    font: 'fnt_default',
    style: '',
    sound: '',
    avatar_url: ''
};
let activeBooster = null;
let boosterEndTime = null;

// ==================== ХЕШИ ====================
export async function hash(p) {
    let e = new TextEncoder();
    let d = await crypto.subtle.digest('SHA-256', e.encode(p + 'syndicate_salt_2024'));
    return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function translit(s) {
    let map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
        'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
        'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
    };
    return s.split('').map(c => map[c] || c).join('');
}

// ==================== АВАТАРКИ / ОБЛОЖКИ ====================
export async function uploadAvatar(file) {
    if (!CA) return { success: false, error: 'Нет агента' };
    if (!file) return { success: false, error: 'Нет файла' };
    if (file.size > AVATAR_MAX_SIZE) return { success: false, error: 'Файл больше 2 МБ' };

    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = new Image();
            img.onload = async function() {
                let canvas = document.createElement('canvas');
                canvas.width = AVATAR_DIMENSION;
                canvas.height = AVATAR_DIMENSION;
                let ctx = canvas.getContext('2d');
                let size = Math.min(img.width, img.height);
                let sx = (img.width - size) / 2;
                let sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_DIMENSION, AVATAR_DIMENSION);

                canvas.toBlob(async (blob) => {
                    let fileName = 'avatar_' + CA.name + '_' + Date.now() + '.png';
                    let { error } = await supabase.storage
                        .from(AVATAR_BUCKET)
                        .upload(fileName, blob, { upsert: true, contentType: 'image/png' });

                    if (error) {
                        console.error('Upload error:', error);
                        resolve({ success: false, error: error.message });
                        return;
                    }

                    let { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);
                    let publicUrl = urlData.publicUrl;

                    CA.avatar_url = publicUrl;
                    activeItems.avatar_url = publicUrl;
                    await saveAgent();
                    resolve({ success: true, url: publicUrl });
                }, 'image/png');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

export async function uploadCover(file) {
    if (!CA) return { success: false, error: 'Нет агента' };
    if (!file) return { success: false, error: 'Нет файла' };
    if (file.size > 3 * 1024 * 1024) return { success: false, error: 'Файл больше 3 МБ' };

    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = new Image();
            img.onload = async function() {
                let canvas = document.createElement('canvas');
                canvas.width = 900;
                canvas.height = 300;
                let ctx = canvas.getContext('2d');
                // Обрезаем по центру с сохранением пропорций
                let ratio = Math.max(900 / img.width, 300 / img.height);
                let w = img.width * ratio, h = img.height * ratio;
                let sx = (w - 900) / 2 / ratio;
                let sy = (h - 300) / 2 / ratio;
                ctx.drawImage(img, sx, sy, 900 / ratio, 300 / ratio, 0, 0, 900, 300);

                canvas.toBlob(async (blob) => {
                    let fileName = 'cover_' + CA.name + '_' + Date.now() + '.png';
                    let { error } = await supabase.storage
                        .from(COVER_BUCKET)
                        .upload(fileName, blob, { upsert: true, contentType: 'image/png' });

                    if (error) {
                        resolve({ success: false, error: error.message });
                        return;
                    }

                    let { data: urlData } = supabase.storage.from(COVER_BUCKET).getPublicUrl(fileName);
                    let publicUrl = urlData.publicUrl;

                    CA.cover_url = publicUrl;
                    await saveAgent();
                    resolve({ success: true, url: publicUrl });
                }, 'image/png');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ==================== АГЕНТЫ ====================
export async function saveAgent() {
    if (!CA) return;
    try {
        let data = {
            name: CA.name,
            pass_hash: CA.passHash,
            rep: CA.rep || 0,
            crystals: CA.crystals || 0,
            achievements: CA.achievements || [],
            logins: CA.logins || 1,
            avatar_url: CA.avatar_url || '',
            cover_url: CA.cover_url || '',
            chat_count: CA.chatCount || 0,
            role: CA.role || 'agent',
            name_history: CA.nameHistory || [],
            guides_created: CA.guidesCreated || 0,
            clans_created: CA.clansCreated || 0,
            banned: CA.banned || false,
            muted: CA.muted || false,
            bio: CA.bio || '',
            status_text: CA.status_text || '',
            active_color: activeItems.color,
            active_frame: activeItems.frame,
            active_badge: activeItems.badge,
            active_font: activeItems.font,
            active_booster: activeBooster,
            booster_end_time: boosterEndTime,
            inventory: inventory,
            active_style: activeItems.style || '',
            active_sound: activeItems.sound || '',
            last_seen: new Date().toISOString()
        };
        let { error } = await supabase.from('agents').upsert(data, { onConflict: 'name' });
        if (error) console.log('Save agent error:', error);
    } catch (e) {
        console.log('Save agent exception:', e);
    }
}

export async function loadAgent(name) {
    try {
        let { data, error } = await supabase.from('agents').select('*').ilike('name', name);
        if (error || !data || data.length === 0) return null;
        return data[0];
    } catch (e) {
        return null;
    }
}

export async function getAgents() {
    try {
        let { data, error } = await supabase.from('agents').select('*');
        if (error) return {};
        let ag = {};
        if (data) data.forEach(a => ag[a.name] = a);
        return ag;
    } catch (e) {
        return {};
    }
}

// ==================== ГЕТТЕРЫ / СЕТТЕРЫ ====================
export function getCurrentAgent() { return CA; }
export function getInventory() { return inventory; }
export function getActiveItems() { return activeItems; }
export function getActiveBooster() { return activeBooster; }
export function getBoosterEndTime() { return boosterEndTime; }

export function setActiveItems(items) { activeItems = { ...activeItems, ...items }; }
export function setActiveBooster(b) { activeBooster = b; }
export function setBoosterEndTime(t) { boosterEndTime = t; }

// ВАЖНО: замена массива НА МЕСТЕ (чтобы live binding работал)
export function setInventory(newInv) {
    inventory.length = 0;
    if (Array.isArray(newInv)) {
        newInv.forEach(i => inventory.push(i));
    }
}

// ==================== ВХОД / РЕГИСТРАЦИЯ ====================
function showErr(m) {
    let e = document.getElementById('login-error');
    if (e) {
        e.textContent = m;
        setTimeout(() => e.textContent = '', 3000);
    }
}

export async function login() {
    let n = document.getElementById('agent-name')?.value?.trim();
    let p = document.getElementById('agent-pass')?.value;
    if (!n || !p) { showErr('ВСЕ ПОЛЯ'); return null; }

    let ph = await hash(p);
    let ag = await loadAgent(n);
    if (!ag || ag.pass_hash !== ph) { showErr('НЕВЕРНЫЕ ДАННЫЕ'); return null; }
    if (ag.banned) { showErr('⛔ ВЫ ЗАБАНЕНЫ'); return null; }

    let { data: maint } = await supabase.from('settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (maint && maint.value === 'true' && ag.role !== 'admin') {
        showErr('🛠 ТЕРМИНАЛ НА ОБСЛУЖИВАНИИ');
        return null;
    }

    CA = ag;
    setInventory((ag.inventory || []).filter(item => !REMOVED_ITEM_IDS.includes(item.id)));
    activeItems.color = (ag.active_color && !REMOVED_ITEM_IDS.includes(ag.active_color)) ? ag.active_color : 'c_red';
    activeItems.frame = (ag.active_frame && !REMOVED_ITEM_IDS.includes(ag.active_frame)) ? ag.active_frame : 'f_default';
    activeItems.badge = (ag.active_badge && !REMOVED_ITEM_IDS.includes(ag.active_badge)) ? ag.active_badge : 'b_none';
    activeItems.font = (ag.active_font && !REMOVED_ITEM_IDS.includes(ag.active_font)) ? ag.active_font : 'fnt_default';
    activeItems.style = ag.active_style || '';
    activeItems.sound = ag.active_sound || '';
    activeItems.avatar_url = ag.avatar_url || '';
    activeBooster = ag.active_booster || null;
    boosterEndTime = ag.booster_end_time || null;

    window.CA = CA;
    CA.passHash = ag.pass_hash;
    CA.rep = Math.min(100, CA.rep || 0);
    CA.chatCount = ag.chat_count || 0;
    CA.guidesCreated = ag.guides_created || 0;
    CA.clansCreated = ag.clans_created || 0;
    CA.crystals = CA.crystals || 0;
    CA.achievements = CA.achievements || [];
    CA.logins = (CA.logins || 0) + 1;
    CA.avatar_url = ag.avatar_url || '';
    CA.cover_url = ag.cover_url || '';
    CA.bio = ag.bio || '';
    CA.status_text = ag.status_text || '';
    CA.role = CA.role || 'agent';
    CA.nameHistory = CA.nameHistory || [];
    CA.banned = CA.banned || false;
    CA.muted = CA.muted || false;

    // Ежедневный бонус
    let today = new Date().toDateString();
    let lastBonus = localStorage.getItem('syndicate_daily_bonus_' + CA.name);
    if (lastBonus !== today) {
        CA.crystals = (CA.crystals || 0) + 200;
        localStorage.setItem('syndicate_daily_bonus_' + CA.name, today);
    }

    // Базовые предметы
    if (!inventory.find(i => i.id === 'c_red')) inventory.push({ category: 'color', id: 'c_red', name: 'Красный', price: 0 });
    if (!inventory.find(i => i.id === 'f_default')) inventory.push({ category: 'frame', id: 'f_default', name: 'Без рамки', price: 0 });
    if (!inventory.find(i => i.id === 'b_none')) inventory.push({ category: 'badge', id: 'b_none', name: 'Без бейджика', price: 0 });
    if (!inventory.find(i => i.id === 'fnt_default')) inventory.push({ category: 'font', id: 'fnt_default', name: 'Стандартный', price: 0 });

    await saveAgent();
    return { CA, inventory, activeItems, activeBooster, boosterEndTime };
}

export async function register() {
    let n = document.getElementById('agent-name')?.value?.trim();
    let p = document.getElementById('agent-pass')?.value;
    if (!n || !p) { showErr('ВСЕ ПОЛЯ'); return null; }
    if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(n)) {
        showErr('ЭМОДЗИ ЗАПРЕЩЕНЫ');
        return null;
    }
    if (n.length < 2 || n.length > 20) { showErr('ИМЯ ОТ 2 ДО 20 СИМВОЛОВ'); return null; }

    let ag = await loadAgent(n);
    if (ag) { showErr('АГЕНТ УЖЕ ЕСТЬ'); return null; }

    let ph = await hash(p);
    CA = {
        name: n, passHash: ph, rep: 0, crystals: 200, achievements: [],
        logins: 1, avatar_url: '', cover_url: '', chatCount: 0, role: 'agent',
        nameHistory: [], guidesCreated: 0, clansCreated: 0,
        banned: false, muted: false, bio: '', status_text: ''
    };

    setInventory([
        { category: 'color', id: 'c_red', name: 'Красный', price: 0 },
        { category: 'frame', id: 'f_default', name: 'Без рамки', price: 0 },
        { category: 'badge', id: 'b_none', name: 'Без бейджика', price: 0 },
        { category: 'font', id: 'fnt_default', name: 'Стандартный', price: 0 }
    ]);
    activeItems = { color: 'c_red', frame: 'f_default', badge: 'b_none', font: 'fnt_default', style: '', sound: '', avatar_url: '' };
    activeBooster = null;
    boosterEndTime = null;

    await saveAgent();
    return { CA, inventory, activeItems };
}

// ==================== ЭКСПОРТЫ ====================
export { supabase, CA, inventory, activeItems, activeBooster, boosterEndTime };