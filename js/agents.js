// ============================================================
// AGENTS / ПРОФИЛИ АГЕНТОВ
// v2.5.0: матричный фон, репосты, комментарии
// ============================================================

import { supabase, CA, loadAgent, getAgents, saveAgent } from './auth.js';
import { shopItems, getActiveColorClassForId } from './shop.js';
import { getFriends, sendFriendRequest, removeFriend, blockAgent } from './friends.js';
import { getAchievements } from './achievements.js';
import { clans } from './clans.js';
import { notif, closeModal, timeAgo } from './utils.js';
// NEW: лента — рендер постов/комментариев
import { renderPostCard as renderPostCardFeed, attachFeedHandlers } from './feed.js';

// ============================================================
// ПОКАЗ ПРОФИЛЯ
// ============================================================
export async function showAgentInfo(name) {
    if (!name) return;
    const modal = document.getElementById('modal-agent-profile');
    if (!modal) return;

    try {
        const agent = await loadAgent(name);
        if (!agent) { notif('⛔ Агент не найден'); return; }

        // ============ Данные агента ============
        let posts = [];
        try {
            let { data } = await supabase.from('profile_posts')
                .select('*').eq('author', name)
                .order('created_at', { ascending: false }).limit(20);
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

        // ============ Аватар / обложка / бейджи ============
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

        // ============ Статус ============
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

        // ============ Обложка с матричным фоном ============
        html += '<div style="position:relative;height:160px;background:' + (coverUrl ? 'url(' + coverUrl + ') center/cover' : 'linear-gradient(135deg,#1a0000,var(--accent-dark),#1a0000)') + ';">';
        // NEW: матричный оверлей
        html += '<div class="matrix-bg" style="position:absolute;inset:0;pointer-events:none;"></div>';
        if (isMe) html += '<button class="btn btn-secondary" style="position:absolute;top:12px;right:12px;font-size:0.8rem;padding:6px 12px;z-index:3;" onclick="window.changeCover()">📷 Обложка</button>';
        html += '</div>';

        // ============ Аватар ============
        html += '<div style="padding:0 20px;">';
        html += '<div style="width:100px;height:100px;margin-top:-50px;border-radius:12px;background:var(--bg-3);border:3px solid var(--bg-2);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:2.5rem;position:relative;z-index:2;">' + avatarHtml + '</div>';
        html += '</div>';

        // ============ Имя / роль / клан ============
        html += '<div style="padding:16px 20px;">';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
        html += '<span class="' + colorClass + '" style="font-size:1.4rem;font-weight:700;">' + agent.name + '</span>';
        html += badgeHtml;
        html += '</div>';
        html += '<div style="color:var(--text-3);font-size:0.9rem;margin-top:4px;">' + roleText + ' · ' + statusHtml + '</div>';
        if (agent.status_text) html += '<div style="color:var(--text-2);font-size:0.85rem;margin-top:6px;font-style:italic;">«' + agent.status_text + '»</div>';
        if (agent.bio) html += '<div style="color:var(--text-2);font-size:0.85rem;margin-top:6px;">' + agent.bio + '</div>';
        html += '<div style="color:var(--text-3);font-size:0.85rem;margin-top:6px;">⚔️ Отряд: ' + clanName + '</div>';
        html += '</div>';

        // ============ Статистика ============
        html += '<div style="display:flex;gap:24px;padding:12px 20px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);flex-wrap:wrap;">';
        html += '<div><div style="font-weight:700;color:var(--text);">' + subscribersCount + '</div><div style="color:var(--text-3);font-size:0.75rem;">подписчики</div></div>';
        html += '<div><div style="font-weight:700;color:var(--text);">' + followingCount + '</div><div style="color:var(--text-3);font-size:0.75rem;">подписки</div></div>';
        html += '<div><div style="font-weight:700;color:var(--accent);">' + (agent.crystals || 0) + '</div><div style="color:var(--text-3);font-size:0.75rem;">ТК</div></div>';
        html += '<div><div style="font-weight:700;color:var(--text);">' + (agent.rep || 0) + '</div><div style="color:var(--text-3);font-size:0.75rem;">репа</div></div>';
        html += '</div>';

        // ============ Кнопки ============
        if (!isMe) {
            html += '<div style="display:flex;gap:8px;padding:16px 20px 8px;">';
            html += '<button class="btn" id="profile-dm-btn" style="flex:1;">📩 Написать</button>';
            if (iAmSubscribed) html += '<button class="btn secondary" id="profile-sub-btn" style="flex:1;">✓ Подписан</button>';
            else html += '<button class="btn secondary" id="profile-sub-btn" style="flex:1;">➕ Подписаться</button>';
            html += '</div>';
            html += '<div style="display:flex;gap:8px;padding:0 20px 16px;">';
            html += '<button class="btn secondary" id="profile-add-friend-btn" style="flex:1;">🤝 Добавить</button>';
            html += '<button class="btn danger" id="profile-block-btn" style="flex:1;">🚫 Блок</button>';
            html += '</div>';
        } else {
            html += '<div style="padding:16px 20px;"><button class="btn full" id="profile-create-post-btn">✏️ Создать пост</button></div>';
        }

        // ============ Стена ============
        html += '<div style="padding:0 20px 20px;">';
        html += '<div style="font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>📝 Стена</span>';
        html += '<span style="color:var(--text-3);font-size:0.8rem;">' + posts.length + ' записей</span>';
        html += '</div>';
        html += '<div id="profile-wall">';
        if (!posts || posts.length === 0) {
            html += '<div class="empty-state">Постов пока нет</div>';
        } else {
            // Рендерим через feed.js
            let agentsCache = await getAgents();
            let originals = new Map();
            let repostIds = posts.filter(p => p.repost_of).map(p => p.repost_of);
            if (repostIds.length > 0) {
                try {
                    let { data } = await supabase.from('profile_posts').select('*').in('id', repostIds);
                    (data || []).forEach(p => originals.set(p.id, p));
                } catch (e) {}
            }
            posts.forEach(p => {
                html += renderPostCardFeed(p, {
                    agents: agentsCache,
                    originalPost: originals.get(p.repost_of) || null
                });
            });
        }
        html += '</div></div>';

        // ============ Кнопка закрытия ============
        html += '<div style="padding:0 20px 20px;"><button class="btn secondary full" data-close-modal="modal-agent-profile">Закрыть</button></div>';

        // ============ Рендер ============
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

        // ============ Обработчики ============
        setTimeout(() => {
            // Личка
            document.getElementById('profile-dm-btn')?.addEventListener('click', function() {
                closeModal('modal-agent-profile');
                if (typeof window.startDM === 'function') window.startDM(agent.name);
            });

            // Подписка
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

            // Друзья
            document.getElementById('profile-add-friend-btn')?.addEventListener('click', async function() {
                let friendsList = getFriends();
                let isFriend = friendsList.some(f =>
                    (f.agent === CA?.name && f.friend === agent.name && f.status === 'accepted') ||
                    (f.agent === agent.name && f.friend === CA?.name && f.status === 'accepted')
                );
                if (isFriend) {
                    let rec = friendsList.find(f =>
                        (f.agent === CA?.name && f.friend === agent.name) ||
                        (f.agent === agent.name && f.friend === CA?.name)
                    );
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

            // Блокировка
            document.getElementById('profile-block-btn')?.addEventListener('click', async function() {
                await blockAgent(agent.name);
                notif('🚫 Заблокирован');
                closeModal('modal-agent-profile');
            });

            // Создать пост (свой профиль)
            document.getElementById('profile-create-post-btn')?.addEventListener('click', function() {
                closeModal('modal-agent-profile');
                if (typeof window.showCreatePost === 'function') window.showCreatePost();
            });

            // ============ Стена: делегированные обработчики ============
            let wall = document.getElementById('profile-wall');
            if (wall) {
                attachFeedHandlers(wall, {
                    onHashtag: (tag) => {
                        closeModal('modal-agent-profile');
                        // Прокидываем хэштег в ленту
                        if (typeof window.openApp === 'function') window.openApp('feed');
                        // main.js ловит через window.__pendingHashtag
                        window.__pendingHashtag = tag;
                        setTimeout(() => {
                            let inp = document.getElementById('feed-search-input');
                            if (inp) {
                                inp.value = '#' + tag;
                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }, 200);
                    },
                    onReposted: () => {
                        notif('🔁 Репостнут');
                    }
                });
            }
        }, 50);

        // ============ Показ модалки ============
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

        // ============ Звук профиля ============
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

// ============================================================
// СОЗДАНИЕ ПОСТА
// ============================================================
export async function createPost(text, imageUrl) {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
        // NEW: парсим хэштеги
        let hashtags = [];
        if (text) {
            let regex = /(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu;
            let m;
            while ((m = regex.exec(text)) !== null) {
                let tag = m[1].toLowerCase().trim();
                if (tag && !hashtags.includes(tag)) hashtags.push(tag);
            }
        }

        await supabase.from('profile_posts').insert({
            author: CA.name,
            text: text || '',
            image_url: imageUrl || '',
            avatar_url: CA.avatar_url || '',
            likes: 0,
            liked_by: [],
            repost_of: null,
            reposts_count: 0,
            comments_count: 0,
            hashtags: hashtags
        });
        notif('✅ Пост опубликован');
        if (typeof window.checkAchievements === 'function') window.checkAchievements();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка' };
    }
}

// ============================================================
// СМЕНА ОБЛОЖКИ
// ============================================================
export async function changeCover(file) {
    if (!CA || !file) return { success: false, error: 'Нет файла' };
    let { uploadCover } = await import('./auth.js');
    let r = await uploadCover(file);
    if (r.success) notif('✅ Обложка обновлена');
    else notif('⛔ ' + r.error);
    return r;
}