// ============================================================
// FEED / ЛЕНТА — репосты, комментарии, хэштеги, эффекты
// v2.8.0: шрифт не применяется на свой ник, картинки на всю ширину
// ============================================================

import { supabase, CA, getAgents, saveAgent } from './auth.js';
import { notif } from './utils.js';
import { playSound } from './sounds.js';
import { shopItems, getActiveColorClassForId } from './shop.js';

// ============================================================
// ХЭШТЕГИ
// ============================================================
export function parseHashtags(text) {
    if (!text) return [];
    let regex = /(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu;
    let found = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
        let tag = m[1].toLowerCase().trim();
        if (tag && !found.includes(tag)) found.push(tag);
    }
    return found;
}

export function extractHashtags(items, textField = 'text') {
    let all = new Set();
    (items || []).forEach(item => {
        let tags = item.hashtags;
        if (Array.isArray(tags)) tags.forEach(t => all.add(String(t).toLowerCase()));
        else if (typeof tags === 'string' && tags) {
            try { let p = JSON.parse(tags); if (Array.isArray(p)) p.forEach(t => all.add(String(t).toLowerCase())); } catch (e) {}
        }
        if (!tags || (Array.isArray(tags) && tags.length === 0)) {
            parseHashtags(item[textField] || '').forEach(t => all.add(t));
        }
    });
    return Array.from(all).sort();
}

export function filterByHashtag(items, tag) {
    if (!tag) return items;
    let target = tag.toLowerCase();
    return (items || []).filter(item => {
        let tags = item.hashtags;
        let arr = [];
        if (Array.isArray(tags)) arr = tags;
        else if (typeof tags === 'string' && tags) {
            try { let p = JSON.parse(tags); if (Array.isArray(p)) arr = p; } catch (e) {}
        }
        if (arr.length > 0) return arr.map(t => String(t).toLowerCase()).includes(target);
        return parseHashtags(item.text || '').includes(target);
    });
}

export function linkifyHashtags(escapedText) {
    if (!escapedText) return '';
    return escapedText.replace(/(?:^|\s)#([\p{L}\p{N}_-]{1,32})/gu, (full, tag) => {
        let prefix = full.startsWith(' ') ? ' ' : '';
        return prefix + '<span class="hashtag-link" data-hashtag="' + tag.toLowerCase() + '">#' + tag + '</span>';
    });
}

// ============================================================
// ЭФФЕКТЫ
// ============================================================
function fx(name, agents) {
    if (typeof window.__getAgentFx === 'function') {
        return window.__getAgentFx(name, agents);
    }
    let a = (agents || {})[name] || {};
    let colorCls = a.active_color ? getActiveColorClassForId(a.active_color) : '';
    let fontCls = '';
    if (a.active_font && name !== CA?.name) {
        let map = {
            'fnt_cyber': 'font-cyber', 'fnt_glitch': 'font-glitch',
            'fnt_typewriter': 'font-typewriter', 'fnt_stencil': 'font-stencil',
            'fnt_pixel': 'font-pixel', 'fnt_neon': 'font-neon',
            'fnt_medieval': 'font-medieval', 'fnt_comic': 'font-comic',
            'fnt_blood': 'font-blood'
        };
        fontCls = map[a.active_font] || '';
    }    
    let frameCls = 'f-default';
    if (a.active_frame && shopItems.frames) {
        let f = shopItems.frames.find(x => x.id === a.active_frame);
        if (f) frameCls = f.cssClass || 'f-default';
    }
    let badgeHtml = '';
    if (a.active_badge && a.active_badge !== 'b_none' && shopItems.badges) {
        let b = shopItems.badges.find(x => x.id === a.active_badge);
        if (b && b.image) badgeHtml = '<img src="' + b.image + '" class="badge-img">';
        else if (b && b.emoji) badgeHtml = '<span style="font-size:1rem;">' + b.emoji + '</span>';
    }
    let roleBadge = '';
    if (a.role === 'admin') roleBadge = '<span class="role-badge admin">👑</span>';
    else if (a.role === 'moderator') roleBadge = '<span class="role-badge mod">🛡</span>';
    return { colorCls, fontCls, frameCls, badgeHtml, roleBadge, avatar: a.avatar_url || '' };
}

// ============================================================
// РЕНДЕР ПОСТА
// ============================================================
export function renderPostCard(post, opts = {}) {
    let agents = opts.agents || {};
    let originalPost = opts.originalPost;
    let compact = opts.compact || false;

    let e = fx(post.author, agents);
    let avatarUrl = post.avatar_url || e.avatar;
    let avatarHtml = avatarUrl ? '<img src="' + avatarUrl + '">' : '🕶️';

    let imgHtml = post.image_url
        ? '<img src="' + post.image_url + '" class="post-image" onerror="this.style.display=\'none\'">'
        : '';

    let textHtml = post.text
        ? linkifyHashtags(escapeHtml(post.text)).replace(/\n/g, '<br>')
        : '';

    // ============ РЕПОСТ ============
    if (post.repost_of && originalPost) {
        let eo = fx(originalPost.author, agents);
        let oAvatarUrl = originalPost.avatar_url || eo.avatar;
        let origAvatar = oAvatarUrl ? '<img src="' + oAvatarUrl + '">' : '🕶️';
        let origText = originalPost.text
            ? linkifyHashtags(escapeHtml(originalPost.text)).replace(/\n/g, '<br>')
            : '';
        let origImg = originalPost.image_url
            ? '<img src="' + originalPost.image_url + '" class="post-image" onerror="this.style.display=\'none\'">'
            : '';

        return '<div class="card repost-wrapper" data-post-id="' + post.id + '">' +
            '<div class="repost-header">' +
            '<span>🔁</span>' +
            '<span class="repost-author name-with-badge ' + e.colorCls + ' ' + e.fontCls + '" data-show-agent="' + escapeHtml(post.author) + '">' + escapeHtml(post.author) + e.roleBadge + e.badgeHtml + '</span>' +
            '<span>репостнул от</span>' +
            '<span class="repost-author name-with-badge ' + eo.colorCls + ' ' + eo.fontCls + '" data-show-agent="' + escapeHtml(originalPost.author) + '">' + escapeHtml(originalPost.author) + eo.roleBadge + eo.badgeHtml + '</span>' +
            '<span style="margin-left:auto;">' + timeAgo(post.created_at) + '</span>' +
            '</div>' +
            '<div class="repost-original">' +
            '<div class="card-header" style="margin-bottom:6px;">' +
            '<div class="chat-avatar-frame card-avatar ' + eo.frameCls + '" data-show-agent="' + escapeHtml(originalPost.author) + '"><div class="inner">' + origAvatar + '</div></div>' +
            '<div class="card-author-block">' +
            '<div class="card-author name-with-badge ' + eo.colorCls + ' ' + eo.fontCls + '" data-open-post-author="' + escapeHtml(originalPost.author) + '">' + escapeHtml(originalPost.author) + eo.roleBadge + eo.badgeHtml + '</div>' +
            '<div class="card-meta"><span class="card-time">' + timeAgo(originalPost.created_at) + '</span></div>' +
            '</div></div>' +
            (origText ? '<div class="card-text ' + eo.fontCls + '">' + origText + '</div>' : '') +
            origImg +
            '</div>' +
            (post.text ? '<div class="card-text ' + e.fontCls + '" style="margin-top:8px;color:var(--text-3);font-style:italic;">' + textHtml + '</div>' : '') +
            renderPostActions(post, compact) +
            renderCommentsSection(post) +
            '</div>';
    }

    // ============ ОБЫЧНЫЙ ПОСТ ============
    return '<div class="card" data-post-id="' + post.id + '">' +
        '<div class="card-header">' +
        '<div class="chat-avatar-frame card-avatar ' + e.frameCls + '" data-show-agent="' + escapeHtml(post.author) + '"><div class="inner">' + avatarHtml + '</div></div>' +
        '<div class="card-author-block">' +
        '<div class="card-author name-with-badge ' + e.colorCls + ' ' + e.fontCls + '" data-open-post-author="' + escapeHtml(post.author) + '">' + escapeHtml(post.author) + e.roleBadge + e.badgeHtml + '</div>' +
        '<div class="card-meta"><span class="card-time">' + timeAgo(post.created_at) + '</span></div>' +
        '</div></div>' +
        (textHtml ? '<div class="card-text ' + e.fontCls + '">' + textHtml + '</div>' : '') +
        imgHtml +
        renderPostActions(post, compact) +
        renderCommentsSection(post) +
        '</div>';
}

function renderPostActions(post, compact) {
    if (compact) return '';
    let liked = post.liked_by && CA && (Array.isArray(post.liked_by) ? post.liked_by : []).includes(CA.name);
    let commentsCount = post.comments_count || 0;
    let repostsCount = post.reposts_count || 0;
    return '<div class="card-actions">' +
        '<button class="card-action' + (liked ? ' liked' : '') + '" data-like-post="' + post.id + '">❤ ' + (post.likes || 0) + '</button>' +
        '<button class="card-action" data-comments-toggle="' + post.id + '">💬 ' + commentsCount + '</button>' +
        '<button class="card-action" data-repost-btn="' + post.id + '">🔁 ' + repostsCount + '</button>' +
        '</div>';
}

function renderCommentsSection(post) {
    return '<div class="comments-section" data-comments-for="' + post.id + '">' +
        '<div class="comments-list" data-comments-list="' + post.id + '">' +
        '<div style="color:var(--text-3);font-size:0.75rem;padding:6px 0;">Загрузка...</div>' +
        '</div>' +
        '<div class="comment-input-row">' +
        '<input type="text" class="comment-input" data-comment-input="' + post.id + '" placeholder="Комментарий..." maxlength="500">' +
        '<button class="comment-send" data-comment-send="' + post.id + '">▶</button>' +
        '</div></div>';
}

// ============================================================
// КОММЕНТАРИИ
// ============================================================
export function renderComment(comment, agents) {
    let e = fx(comment.author, agents);
    let avatarUrl = comment.avatar_url || e.avatar;
    let avatarHtml = avatarUrl ? '<img src="' + avatarUrl + '">' : '🕶️';
    let liked = comment.liked_by && CA && (Array.isArray(comment.liked_by) ? comment.liked_by : []).includes(CA.name);
    let text = linkifyHashtags(escapeHtml(comment.text || '')).replace(/\n/g, '<br>');
    let canDel = CA && (CA.role === 'admin' || CA.role === 'moderator' || comment.author === CA.name);

    return '<div class="comment-item" data-comment-id="' + comment.id + '">' +
        '<div class="chat-avatar-frame comment-avatar ' + e.frameCls + '" data-show-agent="' + escapeHtml(comment.author) + '"><div class="inner">' + avatarHtml + '</div></div>' +
        '<div class="comment-body">' +
        '<div class="comment-author name-with-badge ' + e.colorCls + ' ' + e.fontCls + '" data-show-agent="' + escapeHtml(comment.author) + '">' + escapeHtml(comment.author) + e.roleBadge + e.badgeHtml + '</div>' +
        '<div class="comment-text ' + e.fontCls + '">' + text + '</div>' +
        '<div class="comment-meta">' +
        '<span data-comment-like="' + comment.id + '" style="' + (liked ? 'color:var(--accent);' : '') + '">❤ ' + (comment.likes || 0) + '</span>' +
        '<span>' + timeAgo(comment.created_at) + '</span>' +
        (canDel ? '<span data-comment-del="' + comment.id + '" style="color:var(--danger);">🗑</span>' : '') +
        '</div></div></div>';
}

export async function loadComments(postId) {
    try {
        let { data } = await supabase.from('profile_comments')
            .select('*').eq('post_id', postId)
            .order('created_at', { ascending: true }).limit(100);
        return data || [];
    } catch (e) { return []; }
}

export async function addComment(postId, text) {
    if (!CA || !text || !text.trim()) return { success: false, error: 'Пусто' };
    try {
        let { data, error } = await supabase.from('profile_comments').insert({
            post_id: postId,
            author: CA.name,
            text: text.trim(),
            hashtags: parseHashtags(text),
            likes: 0,
            liked_by: []
        }).select().single();
        if (error) return { success: false, error: error.message };
        await incrementCommentsCount(postId, 1);
        CA.crystals = (CA.crystals || 0) + 2;
        saveAgent();
        playSound('send');
        return { success: true, comment: data };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function deleteComment(commentId) {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
        let { data: c } = await supabase.from('profile_comments').select('post_id, author').eq('id', commentId).maybeSingle();
        if (!c) return { success: false, error: 'Не найден' };
        if (c.author !== CA.name && CA.role !== 'admin' && CA.role !== 'moderator') return { success: false, error: 'Нет прав' };
        await supabase.from('profile_comments').delete().eq('id', commentId);
        await incrementCommentsCount(c.post_id, -1);
        return { success: true, postId: c.post_id };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function likeComment(commentId) {
    if (!CA) return { success: false };
    try {
        let { data: c } = await supabase.from('profile_comments').select('*').eq('id', commentId).maybeSingle();
        if (!c) return { success: false };
        let likedBy = Array.isArray(c.liked_by) ? c.liked_by : [];
        let idx = likedBy.indexOf(CA.name);
        if (idx === -1) { likedBy.push(CA.name); c.likes = (c.likes || 0) + 1; }
        else { likedBy.splice(idx, 1); c.likes = Math.max(0, (c.likes || 0) - 1); }
        await supabase.from('profile_comments').update({ likes: c.likes, liked_by: likedBy }).eq('id', commentId);
        return { success: true, likes: c.likes, likedBy };
    } catch (e) { return { success: false }; }
}

async function incrementCommentsCount(postId, delta) {
    try {
        let { data: p } = await supabase.from('profile_posts').select('comments_count').eq('id', postId).maybeSingle();
        if (p) {
            let nc = Math.max(0, (p.comments_count || 0) + delta);
            await supabase.from('profile_posts').update({ comments_count: nc }).eq('id', postId);
        }
    } catch (e) {}
}

// ============================================================
// РЕПОСТЫ
// ============================================================
export async function createRepost(originalPostId, commentText = '') {
    if (!CA) return { success: false, error: 'Не авторизован' };
    try {
        let { data: orig } = await supabase.from('profile_posts').select('*').eq('id', originalPostId).maybeSingle();
        if (!orig) return { success: false, error: 'Пост не найден' };
        if (orig.author === CA.name) return { success: false, error: 'Нельзя репостить себя' };

        let { data: existing } = await supabase.from('profile_posts')
            .select('id').eq('author', CA.name).eq('repost_of', originalPostId).maybeSingle();
        if (existing) return { success: false, error: 'Уже репостнуто' };

        let { data, error } = await supabase.from('profile_posts').insert({
            author: CA.name,
            text: commentText || '',
            image_url: '',
            avatar_url: CA.avatar_url || '',
            likes: 0,
            liked_by: [],
            repost_of: originalPostId,
            hashtags: parseHashtags(commentText || '')
        }).select().single();
        if (error) return { success: false, error: error.message };

        await incrementRepostsCount(originalPostId, 1);
        CA.crystals = (CA.crystals || 0) + 3;
        saveAgent();
        playSound('send');
        return { success: true, post: data };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

async function incrementRepostsCount(postId, delta) {
    try {
        let { data: p } = await supabase.from('profile_posts').select('reposts_count').eq('id', postId).maybeSingle();
        if (p) {
            let nc = Math.max(0, (p.reposts_count || 0) + delta);
            await supabase.from('profile_posts').update({ reposts_count: nc }).eq('id', postId);
        }
    } catch (e) {}
}

// ============================================================
// ЛАЙК
// ============================================================
export async function likePost(postId, buttonEl) {
    if (!CA) return;
    try {
        let { data: post } = await supabase.from('profile_posts').select('*').eq('id', postId).maybeSingle();
        if (!post) return;
        let likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
        let idx = likedBy.indexOf(CA.name);
        let nowLiked;
        if (idx === -1) { likedBy.push(CA.name); post.likes = (post.likes || 0) + 1; nowLiked = true; }
        else { likedBy.splice(idx, 1); post.likes = Math.max(0, (post.likes || 0) - 1); nowLiked = false; }
        await supabase.from('profile_posts').update({ likes: post.likes, liked_by: likedBy }).eq('id', postId);
        if (buttonEl) {
            buttonEl.classList.add('pop');
            if (nowLiked) buttonEl.classList.add('liked'); else buttonEl.classList.remove('liked');
            buttonEl.textContent = '❤ ' + post.likes;
            setTimeout(() => buttonEl.classList.remove('pop'), 450);
        }
        return { likes: post.likes, liked: nowLiked };
    } catch (e) {}
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(d) {
    if (!d) return '';
    let diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч';
    if (diff < 604800) return Math.floor(diff / 86400) + ' дн';
    return new Date(d).toLocaleDateString('ru-RU');
}

// ============================================================
// ДЕЛЕГИРОВАННЫЕ ОБРАБОТЧИКИ
// ============================================================
export function attachFeedHandlers(container, callbacks = {}) {
    if (!container || container.dataset.feedAttached === '1') return;
    container.dataset.feedAttached = '1';

    container.addEventListener('click', async (e) => {
        let ht = e.target.closest('[data-hashtag]');
        if (ht) { e.stopPropagation(); if (callbacks.onHashtag) callbacks.onHashtag(ht.dataset.hashtag); return; }

        let sa = e.target.closest('[data-show-agent]');
        if (sa) { e.stopPropagation(); if (typeof window.showAgentInfo === 'function') window.showAgentInfo(sa.dataset.showAgent); return; }

        let oa = e.target.closest('[data-open-post-author]');
        if (oa) { e.stopPropagation(); if (typeof window.showAgentInfo === 'function') window.showAgentInfo(oa.dataset.openPostAuthor); return; }

        let like = e.target.closest('[data-like-post]');
        if (like) { e.stopPropagation(); let r = await likePost(parseInt(like.dataset.likePost), like); if (r) playSound('click'); return; }

        let rp = e.target.closest('[data-repost-btn]');
        if (rp) {
            e.stopPropagation();
            let pid = parseInt(rp.dataset.repostBtn);
            let r = await createRepost(pid, '');
            if (r.success) { notif('🔁 Репостнут'); if (callbacks.onReposted) callbacks.onReposted(); }
            else notif('⛔ ' + r.error);
            return;
        }

        let ct = e.target.closest('[data-comments-toggle]');
        if (ct) {
            e.stopPropagation();
            let pid = parseInt(ct.dataset.commentsToggle);
            let section = container.querySelector('[data-comments-for="' + pid + '"]');
            if (!section) return;
            let isOpen = section.classList.toggle('open');
            if (isOpen && !section.dataset.loaded) {
                section.dataset.loaded = '1';
                let agents = await getAgents();
                let comments = await loadComments(pid);
                let list = section.querySelector('[data-comments-list="' + pid + '"]');
                if (list) {
                    list.innerHTML = comments.length === 0
                        ? '<div style="color:var(--text-3);font-size:0.75rem;padding:6px 0;">Комментариев нет</div>'
                        : comments.map(c => renderComment(c, agents)).join('');
                }
            }
            return;
        }

        let cs = e.target.closest('[data-comment-send]');
        if (cs) {
            e.stopPropagation();
            let pid = parseInt(cs.dataset.commentSend);
            let inp = container.querySelector('[data-comment-input="' + pid + '"]');
            if (!inp || !inp.value.trim()) return;
            let r = await addComment(pid, inp.value);
            if (r.success) {
                inp.value = '';
                let agents = await getAgents();
                let list = container.querySelector('[data-comments-list="' + pid + '"]');
                if (list) {
                    if (list.querySelector('.comment-item')) list.insertAdjacentHTML('beforeend', renderComment(r.comment, agents));
                    else list.innerHTML = renderComment(r.comment, agents);
                }
                let btn = container.querySelector('[data-comments-toggle="' + pid + '"]');
                if (btn) {
                    let n = (parseInt(btn.textContent.replace(/[^\d]/g, '')) || 0) + 1;
                    btn.textContent = '💬 ' + n;
                }
            } else notif('⛔ ' + r.error);
            return;
        }

        let cl = e.target.closest('[data-comment-like]');
        if (cl) {
            e.stopPropagation();
            let r = await likeComment(parseInt(cl.dataset.commentLike));
            if (r.success) {
                cl.textContent = '❤ ' + r.likes;
                cl.style.color = r.likedBy.includes(CA.name) ? 'var(--accent)' : '';
            }
            return;
        }

        let cd = e.target.closest('[data-comment-del]');
        if (cd) {
            e.stopPropagation();
            let r = await deleteComment(parseInt(cd.dataset.commentDel));
            if (r.success) {
                let item = cd.closest('.comment-item');
                if (item) item.remove();
                notif('🗑 Удалено');
            } else notif('⛔ ' + r.error);
            return;
        }
    });

    container.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        let inp = e.target.closest('[data-comment-input]');
        if (!inp) return;
        e.preventDefault();
        let pid = parseInt(inp.dataset.commentInput);
        let btn = container.querySelector('[data-comment-send="' + pid + '"]');
        if (btn) btn.click();
    });
}

export async function prepareFeedData(posts) {
    let agents = await getAgents();
    let originals = new Map();
    let repostIds = posts.filter(p => p.repost_of).map(p => p.repost_of);
    if (repostIds.length > 0) {
        try {
            let { data } = await supabase.from('profile_posts').select('*').in('id', repostIds);
            (data || []).forEach(p => originals.set(p.id, p));
        } catch (e) {}
    }
    return { originals, agents };
}