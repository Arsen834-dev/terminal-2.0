// ============ AGENTS / ПРОФИЛИ (соцсеть) ============
import { supabase, CA, loadAgent, getAgents, saveAgent } from './auth.js';
import { shopItems, getActiveColorClassForId } from './shop.js';
import { getFriends, sendFriendRequest, removeFriend, blockAgent } from './friends.js';
import { getAchievements } from './achievements.js';
import { clans } from './clans.js';
import { notif, closeModal, timeAgo } from './utils.js';

export async function showAgentInfo(name) {
    if (!name) return;
    const modal = document.getElementById('modal-agent-profile');
    if (!modal) return;

    try {
        const agent = await loadAgent(name);
        if (!agent) { notif('⛔ Агент не найден'); return; }

        let posts = [];
        try {
            let { data } = await supabase.from('profile_posts')
                .select('*').eq('author', name).order('created_at', { ascending: false }).limit(20);
            if (data) posts = data;
        } catch (e) {}

        let subscribersCount = 0, followingCount = 0, iAmSubscribed = false;
        try {
            let { data: subs } = await supabase.from('subscriptions').select('*').eq('target', name);
            let { data: mySubs } = await supabase.from('subscriptions').select('*').eq('subscriber', name);
            subscribersCount = subs ? subs.length : 0;
            followingCount = mySubs ? mySubs.length : 0;
            if (CA && subs) iAmSubscribed = subs.some(s => s.subscriber === CA.name);
        } catch (e) {}

        let coverUrl = agent.cover_url || '';
        let avatarHtml = agent.avatar_url
            ? '<img src="' + agent.avatar_url + '" style="width:100%;height:100%;object-fit:cover;">'
            : '🕶️';

        let colorClass = agent.active_color ? getActiveColorClassForId(agent.active_color) : '';

        let badgeHtml = '';
        if (agent.active_badge && agent.active_badge !== 'b_none') {
            let b = shopItems.badges.find(x => x.id === agent.active_badge);
            if (b && b.image) badgeHtml = '<img src="' + b.image + '" style="width:24px;height:24px;">';
            else if (b && b.emoji) badgeHtml = '<span style="font-size:1.2rem;">' + b.emoji + '</span>';
        }

        let now = Date.now();
        let isOnline = agent.name === CA?.name || (agent.last_seen && (now - new Date(agent.last_seen).getTime()) < 300000);
        let statusHtml = isOnline ? '<span style="color:var(--success);">● Онлайн</span>' : '<span style="color:var(--text-3);">● Оффлайн</span>';

        let roleMap = { admin: '👑 Админ', moderator: '🛡 Модер', agent: '🎯 Агент' };
        let roleText = roleMap[agent.role] || '🎯 Агент';

        let clanName = 'Нет';
        let memberClan = clans.find(c => c.members && c.members.some(m => m.name === agent.name));
        if (memberClan) clanName = memberClan.emoji + ' ' + memberClan.name;

        let isMe = agent.name === CA?.name;
        let html = '';

        // Обложка
        html += '<div style="position:relative;height:160px;background:' + (coverUrl ? 'url(' + coverUrl + ') center/cover' : 'linear-gradient(135deg,#1a0000,var(--accent-dark),#1a0000)') + ';">';
        if (isMe) html += '<button class="btn btn-secondary" style="position:absolute;top:12px;right:12px;font-size:0.8rem;padding:6px 12px;" onclick="window.changeCover()">📷 Обложка</button>';
        html += '</div>';

        // Аватар
        html += '<div style="padding:0 20px;">';
        html += '<div style="width:100px;height:100px;margin-top:-50px;border-radius:12px;background:var(--bg-3);border:3px solid var(--bg-2);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:2.5rem;position:relative;z-index:2;">' + avatarHtml + '</div>';
        html += '</div>';

        // Имя
        html += '<div style="padding:16px 20px;">';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<span class="' + colorClass + '" style="font-size:1.4rem;font-weight:700;">' + agent.name + '</span>';
        html += badgeHtml;
        html += '</div>';
        html += '<div style="color:var(--text-3);font-size:0.9rem;margin-top:4px;">' + roleText + ' · ' + statusHtml + '</div>';
        html += '<div style="color:var(--text-3);font-size:0.85rem;margin-top:6px;">⚔️ Отряд: ' + clanName + '</div>';
        html += '</div>';

        // Статистика
        html += '<div style="display:flex;gap:24px;padding:12px 20px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);">';
        html += '<div><div style="font-weight:700;color:var(--text);">' + subscribersCount + '</div><div style="color:var(--text-3);font-size:0.75rem;">подписчики</div></div>';
        html += '<div><div style="font-weight:700;color:var(--text);">' + followingCount + '</div><div style="color:var(--text-3);font-size:0.75rem;">подписки</div></div>';
        html += '<div><div style="font-weight:700;color:var(--accent);">' + (agent.crystals || 0) + '</div><div style="color:var(--text-3);font-size:0.75rem;">ТК</div></div>';
        html += '<div><div style="font-weight:700;color:var(--text);">' + (agent.rep || 0) + '</div><div style="color:var(--text-3);font-size:0.75rem;">репа</div></div>';
        html += '</div>';

        // Кнопки
        if (!isMe) {
            html += '<div style="display:flex;gap:8px;padding:16px 20px 8px;">';
            html += '<button class="btn btn-primary" id="profile-dm-btn" style="flex:1;">📩 Написать</button>';
            if (iAmSubscribed) html += '<button class="btn btn-secondary" id="profile-sub-btn" style="flex:1;">✓ Подписан</button>';
            else html += '<button class="btn btn-secondary" id="profile-sub-btn" style="flex:1;">➕ Подписаться</button>';
            html += '</div>';
            html += '<div style="display:flex;gap:8px;padding:0 20px 16px;">';
            html += '<button class="btn btn-secondary" id="profile-add-friend-btn" style="flex:1;">🤝 Добавить</button>';
            html += '<button class="btn btn-danger" id="profile-block-btn" style="flex:1;">🚫 Блок</button>';
            html += '</div>';
        } else {
            html += '<div style="padding:16px 20px;"><button class="btn btn-primary btn-full" onclick="window.showCreatePost()">✏️ Создать пост</button></div>';
        }

        // Стена
        html += '<div style="padding:0 20px 20px;">';
        html += '<div style="font-weight:700;margin-bottom:12px;">📝 Стена</div>';
        if (!posts || posts.length === 0) {
            html += '<div class="empty-state">Постов пока нет</div>';
        } else {
            posts.forEach(p => {
                let liked = p.liked_by && CA && p.liked_by.includes(CA.name);
                html += '<div class="card" style="padding:14px;margin-bottom:8px;">';
                html += '<div style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;">' + timeAgo(p.created_at) + '</div>';
                if (p.text) html += '<div style="color:var(--text-2);line-height:1.5;">' + p.text.replace(/\n/g, '<br>') + '</div>';
                if (p.image_url) html += '<img src="' + p.image_url + '" style="max-width:100%;border-radius:12px;margin-top:8px;">';
                html += '<div style="display:flex;gap:16px;margin-top:10px;">';
                html += '<button class="card-action' + (liked ? ' liked' : '') + '" data-post-like="' + p.id + '" style="color:' + (liked ? 'var(--accent)' : 'var(--text-3)') + ';background:none;border:none;cursor:pointer;font-size:0.9rem;">❤ ' + (p.likes || 0) + '</button>';
                if (isMe || (CA && CA.role === 'admin')) {
                    html += '<button data-post-del="' + p.id + '" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:0.9rem;">🗑</button>';
                }
                html += '</div></div>';
            });
        }
        html += '</div>';

        html += '<div style="padding:0 20px 20px;"><button class="btn btn-secondary btn-full" data-close-modal="modal-agent-profile">Закрыть</button></div>';

        let content = document.getElementById('profile-content');
        if (!content) {
            modal.querySelector('.modal-box').innerHTML = '<div id="profile-content"></div>';
            content = document.getElementById('profile-content');
        }
        content.innerHTML = html;

        let modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.padding = '0';
            modalBox.style.overflow = 'hidden';
            modalBox.style.maxWidth = '600px';
        }

        setTimeout(() => {
            document.getElementById('profile-dm-btn')?.addEventListener('click', function() {
                closeModal('modal-agent-profile');
                if (typeof window.startDM === 'function') window.startDM(agent.name);
            });

            document.getElementById('profile-sub-btn')?.addEventListener('click', async function() {
                if (iAmSubscribed) {
                    await supabase.from('subscriptions').delete().eq('subscriber', CA.name).eq('target', name);
                    notif('👋 Отписались');
                } else {
                    await supabase.from('subscriptions').insert({ subscriber: CA.name, target: name });
                    notif('➕ Подписались');
                }
                closeModal('modal-agent-profile');
                setTimeout(() => showAgentInfo(name), 300);
            });

            document.getElementById('profile-add-friend-btn')?.addEventListener('click', async function() {
                let friendsList = getFriends();
                let isFriend = friendsList.some(f => (f.agent === CA?.name && f.friend === agent.name && f.status === 'accepted') || (f.agent === agent.name && f.friend === CA?.name && f.status === 'accepted'));
                if (isFriend) {
                    let rec = friendsList.find(f => (f.agent === CA?.name && f.friend === agent.name) || (f.agent === agent.name && f.friend === CA?.name));
                    if (rec) await removeFriend(rec.id);
                    notif('🗑 Удалён из друзей');
                } else {
                    let r = await sendFriendRequest(agent.name);
                    if (r.success) notif(r.message || '🤝 Запрос отправлен');
                    else notif(r.error);
                }
                closeModal('modal-agent-profile');
                setTimeout(() => showAgentInfo(name), 300);
            });

            document.getElementById('profile-block-btn')?.addEventListener('click', async function() {
                await blockAgent(agent.name);
                notif('🚫 Заблокирован');
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
                closeModal('modal-agent-profile');
                setTimeout(() => showAgentInfo(name), 200);
            }));

            document.querySelectorAll('[data-post-del]').forEach(b => b.addEventListener('click', async function() {
                await supabase.from('profile_posts').delete().eq('id', parseInt(this.dataset.postDel));
                notif('🗑 Удалено');
                closeModal('modal-agent-profile');
                setTimeout(() => showAgentInfo(name), 200);
            }));
        }, 50);

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

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
        notif('⛔ Ошибка загрузки');
    }
}

export async function createPost(text, imageUrl) {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
        await supabase.from('profile_posts').insert({
            author: CA.name, text: text || '', image_url: imageUrl || '',
            avatar_url: CA.avatar_url || '', likes: 0, liked_by: []
        });
        notif('✅ Пост опубликован');
        if (typeof window.checkAchievements === 'function') window.checkAchievements();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function changeCover(file) {
    if (!CA || !file) return { success: false, error: 'Нет файла' };
    let { uploadCover } = await import('./auth.js');
    let r = await uploadCover(file);
    if (r.success) notif('✅ Обложка обновлена');
    else notif('⛔ ' + r.error);
    return r;
}