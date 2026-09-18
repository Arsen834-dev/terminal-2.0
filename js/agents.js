// ============ AGENTS / ПРОФИЛИ (соцсеть) ============
import { supabase, CA, loadAgent, getAgents, saveAgent } from './auth.js';
import { shopItems, getActiveColorClassForId } from './shop.js';
import { getFriends, sendFriendRequest, removeFriend, blockAgent } from './friends.js';
import { getAchievements } from './achievements.js';
import { clans } from './clans.js';
import { notif, closeModal, timeAgo } from './utils.js';
import { glowIcon } from './utils.js';

// Открыть профиль агента (паблик-стиль)
export async function showAgentInfo(name) {
    if (!name) return;
    const modal = document.getElementById('modal-agent-profile');
    if (!modal) return;
    
    try {
        const agent = await loadAgent(name);
        if (!agent) { notif('⛔ АГЕНТ НЕ НАЙДЕН'); return; }
        
        // Загружаем посты со стены
        let { data: posts } = await supabase.from('profile_posts')
            .select('*').eq('author', name).order('created_at', { ascending: false }).limit(20);
        
        // Загружаем подписки
        let { data: subs } = await supabase.from('subscriptions').select('*').eq('target', name);
        let { data: mySubs } = await supabase.from('subscriptions').select('*').eq('subscriber', name);
        
        let subscribersCount = subs ? subs.length : 0;
        let followingCount = mySubs ? mySubs.length : 0;
        let iAmSubscribed = false;
        if (CA && subs) iAmSubscribed = subs.some(s => s.subscriber === CA.name);
        
        // Обложка
        let coverUrl = agent.cover_url || '';
        
        // Аватар
        let avatarHtml = agent.avatar_url
            ? '<img src="' + agent.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
            : '🕶️';
        
        // Рамка
        let frameClass = 'f-default';
        if (agent.active_frame) {
            let f = shopItems.frames.find(x => x.id === agent.active_frame);
            if (f && f.cssClass) frameClass = f.cssClass;
        }
        
        // Цвет имени
        let colorClass = agent.active_color ? getActiveColorClassForId(agent.active_color) : '';
        
        // Бейджик
        let badgeHtml = '';
        if (agent.active_badge && agent.active_badge !== 'b_none') {
            let b = shopItems.badges.find(x => x.id === agent.active_badge);
            if (b && b.image) badgeHtml = '<img src="' + b.image + '" style="width:24px;height:24px;">';
        }
        
        // Статус онлайн
        let now = Date.now();
        let isOnline = agent.name === CA?.name || (agent.last_seen && (now - new Date(agent.last_seen).getTime()) < 300000);
        let statusHtml = isOnline ? '<span style="color:#00ff41;">● ОНЛАЙН</span>' : '<span style="color:#cc0000;">● ОФФЛАЙН</span>';
        
        // Роль
        let roleMap = { admin: '👑 АДМИН', moderator: '🛡 МОДЕР', agent: '🎯 АГЕНТ' };
        let roleText = roleMap[agent.role] || '🎯 АГЕНТ';
        
        // Отряд
        let clanName = 'НЕТ';
        let memberClan = clans.find(c => c.members && c.members.some(m => m.name === agent.name));
        if (memberClan) clanName = memberClan.emoji + ' ' + memberClan.name;
        
        // Стиль профиля
        let styleClass = '';
        if (agent.active_style) {
            let s = shopItems.styles.find(x => x.id === agent.active_style);
            if (s && s.cssClass) styleClass = s.cssClass;
        }
        
        // Формируем HTML профиля
        let isMe = agent.name === CA?.name;
        
        let html = '';
        
        // Шапка (обложка + аватар)
        html += '<div class="profile-cover" style="position:relative;height:140px;background:' + (coverUrl ? 'url(' + coverUrl + ') center/cover' : 'linear-gradient(135deg,#1a0000,#4a0000,#1a0000') + ';border:2px solid #ff1744;border-radius:12px 12px 0 0;">';
        if (isMe) {
            html += '<button class="modal-btn" style="position:absolute;top:10px;right:10px;font-size:0.8rem;padding:5px 10px;" onclick="window.changeCover()">📷 ОБЛОЖКА</button>';
        }
        html += '</div>';
        
        // Аватар (наезжает на обложку)
        html += '<div style="position:relative;margin-top:-60px;margin-left:20px;display:flex;align-items:flex-end;gap:15px;">';
        html += '<span class="status-avatar-frame ' + frameClass + '" style="width:120px;height:120px;background:#000;display:flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;">';
        html += '<span style="font-size:3rem;">' + avatarHtml + '</span>';
        html += '</span>';
        html += '</div>';
        
        // Имя и статус
        html += '<div style="padding:15px 20px;">';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<span class="' + colorClass + '" style="font-size:1.6rem;font-weight:bold;">' + agent.name + '</span>';
        html += badgeHtml;
        html += '</div>';
        html += '<div style="color:#cc0000;font-size:0.9rem;margin-top:3px;">' + roleText + ' | ' + statusHtml + '</div>';
        if (agent.status_text) html += '<div style="color:#ff1744;margin-top:5px;">' + agent.status_text + '</div>';
        if (agent.bio) html += '<div style="color:#880000;font-size:0.9rem;margin-top:5px;">' + agent.bio + '</div>';
        html += '</div>';
        
        // Статистика (подписчики, подписки, ТК, репа)
        html += '<div style="display:flex;gap:20px;padding:10px 20px;border-top:1px solid #2a0000;border-bottom:1px solid #2a0000;">';
        html += '<div style="text-align:center;"><div style="color:#ff1744;font-size:1.2rem;font-weight:bold;">' + subscribersCount + '</div><div style="color:#880000;font-size:0.7rem;">ПОДПИСЧИКИ</div></div>';
        html += '<div style="text-align:center;"><div style="color:#ff1744;font-size:1.2rem;font-weight:bold;">' + followingCount + '</div><div style="color:#880000;font-size:0.7rem;">ПОДПИСКИ</div></div>';
        html += '<div style="text-align:center;"><div style="color:#ffd700;font-size:1.2rem;font-weight:bold;">' + (agent.crystals || 0) + '</div><div style="color:#880000;font-size:0.7rem;">ТК</div></div>';
        html += '<div style="text-align:center;"><div style="color:#ff1744;font-size:1.2rem;font-weight:bold;">' + (agent.rep || 0) + '</div><div style="color:#880000;font-size:0.7rem;">РЕПА</div></div>';
        html += '</div>';
        
        // Кнопки действий
        if (!isMe) {
            html += '<div style="display:flex;gap:10px;padding:15px;">';
            html += '<button class="modal-btn" id="profile-dm-btn" style="flex:1;font-size:1rem;">📩 НАПИСАТЬ</button>';
            if (iAmSubscribed) {
                html += '<button class="modal-btn" id="profile-sub-btn" style="flex:1;font-size:1rem;color:#ff9100;border-color:#ff9100;">✓ ПОДПИСАН</button>';
            } else {
                html += '<button class="modal-btn" id="profile-sub-btn" style="flex:1;font-size:1rem;color:#00ff41;border-color:#00ff41;">➕ ПОДПИСАТЬСЯ</button>';
            }
            html += '</div>';
            html += '<div style="display:flex;gap:10px;padding:0 15px 15px;">';
            html += '<button class="modal-btn" id="profile-add-friend-btn" style="flex:1;font-size:0.9rem;">🤝 ДОБАВИТЬ</button>';
            html += '<button class="modal-btn" id="profile-block-btn" style="flex:1;font-size:0.9rem;color:#ff0000;border-color:#ff0000;">🚫 БЛОК</button>';
            html += '</div>';
        } else {
            html += '<div style="padding:15px;">';
            html += '<button class="modal-btn" style="width:100%;font-size:1rem;" onclick="window.showCreatePost()">✏️ СОЗДАТЬ ПОСТ</button>';
            html += '</div>';
        }
        
        // Стена
        html += '<div style="padding:15px;border-top:1px solid #2a0000;">';
        html += '<div style="color:#ff1744;font-size:1.2rem;margin-bottom:10px;">📝 СТЕНА</div>';
        if (!posts || posts.length === 0) {
            html += '<div style="color:#880000;text-align:center;padding:20px;">ПОСТОВ ПОКА НЕТ</div>';
        } else {
            posts.forEach(p => {
                let liked = p.liked_by && CA && p.liked_by.includes(CA.name);
                html += '<div class="profile-post" style="border:1px solid #2a0000;padding:12px;margin-bottom:10px;border-radius:8px;background:rgba(0,0,0,0.4);">';
                html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
                html += '<span style="font-size:1.2rem;">' + (p.avatar_url ? '<img src="' + p.avatar_url + '" style="width:32px;height:32px;border-radius:50%;">' : '🕶️') + '</span>';
                html += '<span style="color:#ff1744;font-weight:bold;">' + agent.name + '</span>';
                html += '<span style="color:#880000;font-size:0.75rem;margin-left:auto;">' + timeAgo(p.created_at) + '</span>';
                html += '</div>';
                if (p.text) html += '<div style="color:#cc0000;margin-bottom:8px;">' + p.text.replace(/\n/g, '<br>') + '</div>';
                if (p.image_url) html += '<img src="' + p.image_url + '" style="max-width:100%;max-height:300px;border:1px solid #ff1744;border-radius:8px;">';
                html += '<div style="display:flex;gap:15px;margin-top:10px;">';
                html += '<button class="post-like-btn' + (liked ? ' liked' : '') + '" data-post-like="' + p.id + '" style="background:transparent;border:none;color:' + (liked ? '#ff1744' : '#880000') + ';cursor:pointer;font-family:VT323;font-size:1rem;">❤ ' + (p.likes || 0) + '</button>';
                if (isMe || (CA && CA.role === 'admin')) {
                    html += '<button data-post-del="' + p.id + '" style="background:transparent;border:none;color:#ff0000;cursor:pointer;font-family:VT323;font-size:1rem;">🗑</button>';
                }
                html += '</div>';
                html += '</div>';
            });
        }
        html += '</div>';
        
        // Кнопка закрыть
        html += '<div style="padding:15px;"><button class="modal-btn" style="width:100%;" data-close-modal="modal-agent-profile">ЗАКРЫТЬ</button></div>';
        
        // Применяем стиль профиля
        let modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.className = 'modal-box';
            modalBox.style.maxWidth = '650px';
            modalBox.style.padding = '0';
            modalBox.style.overflow = 'hidden';
            if (styleClass) modalBox.classList.add(styleClass);
        }
        
        // Находим контейнер для контента
        let content = document.getElementById('profile-content');
        if (!content) {
            // Если нет — создаём
            modal.querySelector('.modal-box').innerHTML = '<div id="profile-content"></div>';
            content = document.getElementById('profile-content');
        }
        content.innerHTML = html;
        
        // Обработчики
        setTimeout(() => {
            document.getElementById('profile-dm-btn')?.addEventListener('click', function() {
                closeModal('modal-agent-profile');
                startDM(agent.name);
            });
            
            document.getElementById('profile-sub-btn')?.addEventListener('click', async function() {
                if (iAmSubscribed) {
                    await supabase.from('subscriptions').delete().eq('subscriber', CA.name).eq('target', name);
                    notif('👋 ОТПИСАЛИСЬ');
                } else {
                    await supabase.from('subscriptions').insert({ subscriber: CA.name, target: name });
                    notif('➕ ПОДПИСАЛИСЬ');
                }
                showAgentInfo(name);
            });
            
            document.getElementById('profile-add-friend-btn')?.addEventListener('click', async function() {
                let friends = getFriends();
                let isFriend = friends.some(f => (f.agent === CA?.name && f.friend === agent.name && f.status === 'accepted') || (f.agent === agent.name && f.friend === CA?.name && f.status === 'accepted'));
                if (isFriend) {
                    let rec = friends.find(f => (f.agent === CA?.name && f.friend === agent.name) || (f.agent === agent.name && f.friend === CA?.name));
                    if (rec) await removeFriend(rec.id);
                } else {
                    await sendFriendRequest(agent.name);
                }
                showAgentInfo(name);
            });
            
            document.getElementById('profile-block-btn')?.addEventListener('click', async function() {
                await blockAgent(agent.name);
                closeModal('modal-agent-profile');
            });
            
            document.querySelectorAll('[data-post-like]').forEach(b => b.addEventListener('click', async function() {
                let postId = parseInt(this.dataset.postLike);
                let { data: post } = await supabase.from('profile_posts').select('*').eq('id', postId).maybeSingle();
                if (!post) return;
                let likedBy = post.liked_by || [];
                let idx = likedBy.indexOf(CA.name);
                if (idx === -1) { likedBy.push(CA.name); post.likes = (post.likes || 0) + 1; }
                else { likedBy.splice(idx, 1); post.likes = Math.max(0, (post.likes || 0) - 1); }
                await supabase.from('profile_posts').update({ likes: post.likes, liked_by: likedBy }).eq('id', postId);
                showAgentInfo(name);
            }));
            
            document.querySelectorAll('[data-post-del]').forEach(b => b.addEventListener('click', async function() {
                await supabase.from('profile_posts').delete().eq('id', parseInt(this.dataset.postDel));
                notif('🗑 УДАЛЕНО');
                showAgentInfo(name);
            }));
        }, 50);
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Звук профиля
        if (agent.active_sound && agent.active_sound !== 'snd_default' && agent.active_sound !== 'snd_custom') {
            try {
                let audio = new Audio(agent.active_sound);
                audio.volume = 0.2;
                audio.play().catch(() => {});
                setTimeout(() => { audio.pause(); audio = null; }, 12000);
            } catch (e) {}
        }
    } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        notif('⛔ ОШИБКА ЗАГРУЗКИ');
    }
}

// Создать пост на своей стене
export async function createPost(text, imageUrl) {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
        await supabase.from('profile_posts').insert({
            author: CA.name, text: text || '', image_url: imageUrl || '',
            avatar_url: CA.avatar_url || '', likes: 0, liked_by: []
        });
        notif('✅ ПОСТ ОПУБЛИКОВАН');
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

// Смена обложки
export async function changeCover(file) {
    if (!CA || !file) return { success: false, error: 'Нет файла' };
    if (file.size > 3 * 1024 * 1024) return { success: false, error: 'Файл больше 3 МБ' };
    let reader = new FileReader();
    reader.onload = function(e) {
        let img = new Image();
        img.onload = async function() {
            let canvas = document.createElement('canvas');
            canvas.width = 900;
            canvas.height = 300;
            let ctx = canvas.getContext('2d');
            // Обрезаем по центру
            let ratio = Math.max(900 / img.width, 300 / img.height);
            let w = img.width * ratio, h = img.height * ratio;
            let sx = (w - 900) / 2 / ratio, sy = (h - 300) / 2 / ratio;
            ctx.drawImage(img, sx, sy, 900 / ratio, 300 / ratio, 0, 0, 900, 300);
            canvas.toBlob(async (blob) => {
                let fileName = 'cover_' + CA.name + '_' + Date.now() + '.png';
                let { error } = await supabase.storage.from('avatars').upload(fileName, blob, { upsert: true });
                if (error) return;
                let { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                CA.cover_url = data.publicUrl;
                await saveAgent();
                notif('✅ ОБЛОЖКА ОБНОВЛЕНА');
            }, 'image/png');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    return { success: true };
}