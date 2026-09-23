// ============================================================
// AGENTS / ПРОФИЛИ АГЕНТОВ
// v2.9.6: обновлённые шрифты, эффекты применяются сразу
// ============================================================

import { supabase, CA, loadAgent, getAgents, saveAgent } from './auth.js';
import { shopItems, getActiveColorClassForId } from './shop.js';
import { getFriends, sendFriendRequest, removeFriend, blockAgent } from './friends.js';
import { getAchievements } from './achievements.js';
import { clans } from './clans.js';
import { notif, closeModal, timeAgo } from './utils.js';
import { renderPostCard as renderPostCardFeed, attachFeedHandlers } from './feed.js';

let wallPosts = [];
let wallPage = 0;
let wallTotal = 0;
let wallAgentName = null;
let wallLoaded = false;
const WALL_PAGE_SIZE = 10;

function fx(name, agents) {
    if (typeof window.__getAgentFx === 'function') return window.__getAgentFx(name, agents);
    let a = (agents || {})[name] || {};
    let colorCls = a.active_color ? getActiveColorClassForId(a.active_color) : '';
    let frameCls = 'f-default';
    if (a.active_frame && shopItems.frames) {
        let f = shopItems.frames.find(x => x.id === a.active_frame);
        if (f) frameCls = f.cssClass || 'f-default';
    }
    let roleBadge = '';
    if (a.role === 'admin') roleBadge = '<span class="role-badge admin">👑</span>';
    else if (a.role === 'moderator') roleBadge = '<span class="role-badge mod">🛡</span>';
    let badgeHtml = '';
    if (a.active_badge && a.active_badge !== 'b_none' && shopItems.badges) {
        let b = shopItems.badges.find(x => x.id === a.active_badge);
        if (b && b.image) badgeHtml = '<img src="' + b.image + '" class="badge-img">';
        else if (b && b.emoji) badgeHtml = '<span style="font-size:1rem;">' + b.emoji + '</span>';
    }
    return { colorCls, fontCls: '', frameCls, badgeHtml, roleBadge, avatar: a.avatar_url || '' };
}

export async function showAgentInfo(name) {
    if (!name) return;
    const modal = document.getElementById('modal-agent-profile');
    if (!modal) return;

    let profileContentEl = document.getElementById('profile-content');
    if (profileContentEl) profileContentEl.dataset.agentName = name;

    try {
        const agent = await loadAgent(name);
        if (!agent) { notif('⛔ Агент не найден'); return; }

        wallPosts = [];
        wallPage = 0;
        wallTotal = 0;
        wallAgentName = name;
        wallLoaded = false;

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

        let e = fx(name);

        let now = Date.now();
        let isOnline = agent.name === CA?.name || (agent.last_seen && (now - new Date(agent.last_seen).getTime()) < 300000);
        let statusHtml = isOnline ? '<span style="color:var(--success);">● Онлайн</span>' : '<span style="color:var(--text-3);">● Оффлайн</span>';

        let roleMap = { admin: '👑 Админ', moderator: '🛡 Модер', agent: '🎯 Агент' };
        let roleText = roleMap[agent.role] || '🎯 Агент';

        let clanName = 'Нет';
        let memberClan = clans.find(c => c.members && c.members.some(m => m.name === agent.name));
        if (memberClan) clanName = memberClan.emoji + ' ' + memberClan.name;

        let isMe = agent.name === CA?.name;

        let friendsList = getFriends();
        let isFriend = friendsList.some(f =>
            (f.agent === CA?.name && f.friend === agent.name && f.status === 'accepted') ||
            (f.agent === agent.name && f.friend === CA?.name && f.status === 'accepted')
        );
        let hasPendingRequest = friendsList.some(f =>
            (f.agent === CA?.name && f.friend === agent.name && f.status === 'pending')
        );

        let html = '';

        html += '<button class="profile-close-top" onclick="window.closeModal(\'modal-agent-profile\')" title="Закрыть">✕</button>';

        html += '<div style="position:relative;height:160px;background:' + (coverUrl ? 'url(' + coverUrl + ') center/cover' : 'linear-gradient(135deg,#1a0000,var(--accent-dark),#1a0000)') + ';flex-shrink:0;">';
        if (isMe) html += '<button class="btn btn-secondary" style="position:absolute;top:12px;right:56px;font-size:0.75rem;padding:6px 12px;z-index:3;" onclick="window.changeCover()">📷 Обложка</button>';
        html += '</div>';

        html += '<div style="padding:0 20px;">';
        html += '<div class="chat-avatar-frame ' + e.frameCls + '" style="width:100px;height:100px;margin-top:-50px;border-radius:12px;background:var(--bg-3);border:3px solid var(--bg-2);position:relative;z-index:2;">';
        html += '<div class="inner" style="font-size:2.5rem;border-radius:9px;">' + avatarHtml + '</div>';
        html += '</div></div>';

        html += '<div style="padding:16px 20px;">';
        html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
        html += '<span class="name-with-badge ' + e.colorCls + '" style="font-size:1.4rem;font-weight:700;position:relative;padding-right:12px;">' + agent.name + e.roleBadge + e.badgeHtml + '</span>';
        html += '</div>';
        html += '<div style="color:var(--text-3);font-size:0.85rem;margin-top:4px;">' + roleText + ' · ' + statusHtml + '</div>';
        if (agent.status_text) html += '<div style="color:var(--text-2);font-size:0.8rem;margin-top:6px;font-style:italic;">«' + agent.status_text + '»</div>';
        if (agent.bio) html += '<div style="color:var(--text-2);font-size:0.8rem;margin-top:6px;">' + agent.bio + '</div>';
        html += '<div style="color:var(--text-3);font-size:0.8rem;margin-top:6px;">⚔️ Отряд: ' + clanName + '</div>';
        html += '</div>';

        html += '<div style="display:flex;gap:24px;padding:12px 20px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);flex-wrap:wrap;">';
        html += '<div><div style="font-weight:700;color:var(--text);">' + subscribersCount + '</div><div style="color:var(--text-3);font-size:0.7rem;">подписчики</div></div>';
        html += '<div><div style="font-weight:700;color:var(--text);">' + followingCount + '</div><div style="color:var(--text-3);font-size:0.7rem;">подписки</div></div>';
        html += '<div><div style="font-weight:700;color:var(--accent);">' + (agent.crystals || 0) + '</div><div style="color:var(--text-3);font-size:0.7rem;">ТК</div></div>';
        html += '<div><div style="font-weight:700;color:var(--text);">' + (agent.rep || 0) + '</div><div style="color:var(--text-3);font-size:0.7rem;">репа</div></div>';
        html += '</div>';

        if (!isMe) {
            html += '<div style="display:flex;gap:8px;padding:16px 20px 8px;">';
            html += '<button class="btn" id="profile-dm-btn" style="flex:1;">📩 Написать</button>';
            if (iAmSubscribed) html += '<button class="btn secondary" id="profile-sub-btn" style="flex:1;">✓ Подписан</button>';
            else html += '<button class="btn secondary" id="profile-sub-btn" style="flex:1;">➕ Подписаться</button>';
            html += '</div>';
            html += '<div style="display:flex;gap:8px;padding:0 20px 16px;">';

            if (isFriend) {
                html += '<button class="btn in-friends" id="profile-add-friend-btn" style="flex:1;">✓ В ДРУЗЬЯХ</button>';
            } else if (hasPendingRequest) {
                html += '<button class="btn secondary" id="profile-add-friend-btn" style="flex:1;">⏳ ЗАПРОС ОТПРАВЛЕН</button>';
            } else {
                html += '<button class="btn secondary" id="profile-add-friend-btn" style="flex:1;">🤝 ДОБАВИТЬ</button>';
            }

            html += '<button class="btn danger" id="profile-block-btn" style="flex:1;">🚫 БЛОК</button>';
            html += '</div>';
        } else {
            html += '<div style="padding:16px 20px;"><button class="btn full" id="profile-create-post-btn">✏️ СОЗДАТЬ ПОСТ</button></div>';
        }

        html += '<div style="padding:0 20px 20px;">';
        html += '<div style="font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>📝 Стена</span>';
        html += '<span id="wall-count-label" style="color:var(--text-3);font-size:0.75rem;">... записей</span>';
        html += '</div>';
        html += '<div id="profile-wall">';
        html += '<div style="color:var(--text-3);font-size:0.75rem;padding:10px 0;">Загрузка...</div>';
        html += '</div>';
        html += '<div id="profile-wall-more" style="margin-top:12px;text-align:center;"></div>';
        html += '</div>';

        let content = document.getElementById('profile-content');
        if (!content) {
            modal.querySelector('.modal-box').innerHTML = '<div id="profile-content"></div>';
            content = document.getElementById('profile-content');
        }
        content.innerHTML = html;
        content.dataset.agentName = name;

        let modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.padding = '0';
            modalBox.style.overflow = 'hidden';
            modalBox.style.maxWidth = '600px';
            modalBox.style.maxHeight = '85vh';
            modalBox.style.display = 'flex';
            modalBox.style.flexDirection = 'column';
            modalBox.style.position = 'relative';
        }
        content.style.overflowY = 'auto';
        content.style.flex = '1';
        content.style.minHeight = '0';

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

            document.getElementById('profile-block-btn')?.addEventListener('click', async function() {
                await blockAgent(agent.name);
                notif('🚫 Заблокирован');
                closeModal('modal-agent-profile');
            });

            document.getElementById('profile-create-post-btn')?.addEventListener('click', function() {
                closeModal('modal-agent-profile');
                if (typeof window.showCreatePost === 'function') window.showCreatePost();
            });

            loadWallPage(0);

            let wall = document.getElementById('profile-wall');
            if (wall) {
                attachFeedHandlers(wall, {
                    onHashtag: (tag) => {
                        closeModal('modal-agent-profile');
                        window.__pendingHashtag = tag;
                        if (typeof window.openApp === 'function') window.openApp('feed');
                        setTimeout(() => {
                            let inp = document.getElementById('feed-search-input');
                            if (inp) { inp.value = '#' + tag; inp.dispatchEvent(new Event('input', { bubbles: true })); }
                        }, 250);
                    },
                    onReposted: () => {
                        notif('🔁 Репостнут');
                        wallPosts = []; wallPage = 0; wallLoaded = false;
                        document.getElementById('profile-wall').innerHTML = '';
                        loadWallPage(0);
                    }
                });
            }

            window.__reloadProfileWall = function() {
                wallPosts = [];
                wallPage = 0;
                wallLoaded = false;
                let w = document.getElementById('profile-wall');
                if (w) w.innerHTML = '';
                loadWallPage(0);
            };
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

async function loadWallPage(page) {
    if (!wallAgentName) return;
    let wall = document.getElementById('profile-wall');
    let moreWrap = document.getElementById('profile-wall-more');
    let countLabel = document.getElementById('wall-count-label');
    if (!wall) return;

    if (wallTotal === 0) {
        try {
            let { count } = await supabase.from('profile_posts')
                .select('*', { count: 'exact', head: true })
                .eq('author', wallAgentName);
            wallTotal = count || 0;
            if (countLabel) countLabel.textContent = wallTotal + ' записей';
        } catch (e) {}
    }

    let from = page * WALL_PAGE_SIZE;
    let to = from + WALL_PAGE_SIZE - 1;
    let { data: posts } = await supabase.from('profile_posts')
        .select('*').eq('author', wallAgentName)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (!posts || posts.length === 0) {
        if (page === 0) {
            wall.innerHTML = '<div class="empty-state">Постов пока нет</div>';
        }
        if (moreWrap) moreWrap.innerHTML = '';
        return;
    }

    let agentsCache = await getAgents();
    let originals = new Map();
    let repostIds = posts.filter(p => p.repost_of).map(p => p.repost_of);
    if (repostIds.length > 0) {
        try {
            let { data } = await supabase.from('profile_posts').select('*').in('id', repostIds);
            (data || []).forEach(p => originals.set(p.id, p));
        } catch (e) {}
    }

    if (page === 0) wall.innerHTML = '';

    posts.forEach(p => {
        wall.insertAdjacentHTML('beforeend', renderPostCardFeed(p, {
            agents: agentsCache,
            originalPost: originals.get(p.repost_of) || null
        }));
        wallPosts.push(p);
    });

    wallLoaded = true;
    wallPage = page;

    let loadedCount = (page + 1) * WALL_PAGE_SIZE;
    if (moreWrap) {
        if (loadedCount < wallTotal) {
            moreWrap.innerHTML = '<button class="btn secondary" id="wall-load-more-btn">▼ ЗАГРУЗИТЬ ЕЩЁ (' + (wallTotal - loadedCount) + ')</button>';
            document.getElementById('wall-load-more-btn')?.addEventListener('click', () => {
                moreWrap.innerHTML = '<span style="color:var(--text-3);font-size:0.75rem;">Загрузка...</span>';
                loadWallPage(page + 1);
            });
        } else {
            moreWrap.innerHTML = wallTotal > WALL_PAGE_SIZE
                ? '<span style="color:var(--text-3);font-size:0.7rem;text-transform:uppercase;letter-spacing:2px;">— КОНЕЦ —</span>'
                : '';
        }
    }
}

export async function createPost(text, imageUrl) {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
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