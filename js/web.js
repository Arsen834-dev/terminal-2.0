// ============================================================
// WEB / ПАУТИНА — граф связей агентов на canvas
// v1.0.1: безопасная инициализация canvas
// ============================================================

import { supabase, CA, getAgents } from './auth.js';
import { clans } from './clans.js';
import { getFriends } from './friends.js';

let canvas = null;
let ctx = null;
let nodes = [];
let edges = [];
let animationId = null;
let hoveredNode = null;
let dpr = 1;

const COLORS = {
    bg: '#06060a',
    accent: '#ff1744',
    accentDim: 'rgba(255, 23, 68, 0.4)',
    accentFaint: 'rgba(255, 23, 68, 0.08)',
    text: '#e8e8ee',
    textDim: '#6a6a78',
    online: '#00ff41',
    offline: '#4a4a55',
    me: '#ff1744'
};

const NODE_RADIUS = 14;
const ME_RADIUS = 20;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

export async function initWebGraph() {
    canvas = document.getElementById('web-canvas');
    if (!canvas) return;

    let wrap = document.getElementById('web-canvas-wrap');
    if (!wrap) return;

    if (window.innerWidth < 600) {
        renderFallbackList();
        return;
    }

    ctx = canvas.getContext('2d');

    // Ждём пересчёта layout после display:flex
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    resizeCanvas();

    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        setTimeout(() => {
            resizeCanvas();
            buildGraph().then(startAnimation);
        }, 100);
    } else {
        await buildGraph();
        startAnimation();
    }

    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mouseleave', () => { hoveredNode = null; });
}

export function destroyWebGraph() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    window.removeEventListener('resize', resizeCanvas);
    if (canvas) {
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('click', onClick);
    }
    canvas = null;
    ctx = null;
    nodes = [];
    edges = [];
}

function resizeCanvas() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    let rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
}

// ============================================================
// ПОСТРОЕНИЕ ГРАФА
// ============================================================

async function buildGraph() {
    let agents = await getAgents();
    let friends = getFriends();

    let names = Object.keys(agents).filter(n => n !== 'W-C26');
    let now = Date.now();

    let w = canvas.clientWidth || 800;
    let h = canvas.clientHeight || 600;
    let cx = w / 2;
    let cy = h / 2;

    let me = CA?.name;
    if (!me) return;

    let myClan = clans.find(c => c.members && c.members.some(m => m.name === me));
    let friendNames = new Set();
    friends.forEach(f => {
        if (f.status === 'accepted') {
            if (f.agent === me) friendNames.add(f.friend);
            if (f.friend === me) friendNames.add(f.agent);
        }
    });
    let clanNames = new Set();
    if (myClan && myClan.members) {
        myClan.members.forEach(m => { if (m.name !== me) clanNames.add(m.name); });
    }

    let radius = Math.min(w, h) * 0.38;
    let otherNames = names.filter(n => n !== me);

    nodes = [{
        id: me,
        name: me,
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        isMe: true,
        isFriend: false,
        isClan: false,
        online: true,
        radius: ME_RADIUS
    }];

    let friendArr = otherNames.filter(n => friendNames.has(n));
    let clanArr = otherNames.filter(n => !friendNames.has(n) && clanNames.has(n));
    let otherArr = otherNames.filter(n => !friendNames.has(n) && !clanNames.has(n));

    let allOther = [...friendArr, ...clanArr, ...otherArr];

    allOther.forEach((name, i) => {
        let angle = (i / allOther.length) * Math.PI * 2 - Math.PI / 2;
        let r = friendNames.has(name) ? radius * 0.6
              : clanNames.has(name)   ? radius * 0.8
              : radius;
        let agent = agents[name] || {};
        let online = agent.last_seen && (now - new Date(agent.last_seen).getTime()) < 300000;

        nodes.push({
            id: name,
            name: name,
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
            vx: 0,
            vy: 0,
            isMe: false,
            isFriend: friendNames.has(name),
            isClan: clanNames.has(name),
            online: !!online,
            radius: NODE_RADIUS
        });
    });

    edges = [];
    nodes.forEach(n => {
        if (n.isMe) return;
        if (n.isFriend || n.isClan) {
            edges.push({ from: me, to: n.id, type: n.isFriend ? 'friend' : 'clan' });
        }
    });

    let friendList = Array.from(friendNames);
    for (let i = 0; i < friendList.length; i++) {
        for (let j = i + 1; j < friendList.length; j++) {
            let a = friendList[i], b = friendList[j];
            let isFriends = friends.some(f =>
                f.status === 'accepted' &&
                ((f.agent === a && f.friend === b) || (f.agent === b && f.friend === a))
            );
            if (isFriends) {
                edges.push({ from: a, to: b, type: 'friend' });
            }
        }
    }
}

// ============================================================
// АНИМАЦИЯ
// ============================================================

function startAnimation() {
    function loop() {
        updatePhysics();
        draw();
        animationId = requestAnimationFrame(loop);
    }
    loop();
}

function updatePhysics() {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            let a = nodes[i], b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distSq = dx * dx + dy * dy;
            let minDist = 80;
            if (distSq < minDist * minDist && distSq > 0.01) {
                let dist = Math.sqrt(distSq);
                let force = (minDist - dist) / minDist * 0.3;
                let fx = (dx / dist) * force;
                let fy = (dy / dist) * force;
                if (!a.isMe) { a.vx -= fx; a.vy -= fy; }
                if (!b.isMe) { b.vx += fx; b.vy += fy; }
            }
        }
    }

    let w = canvas.clientWidth || 800;
    let h = canvas.clientHeight || 600;
    let cx = w / 2, cy = h / 2;

    nodes.forEach(n => {
        if (n.isMe) {
            n.x = cx;
            n.y = cy;
            n.vx = 0;
            n.vy = 0;
            return;
        }
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.x += n.vx;
        n.y += n.vy;
    });
}

function draw() {
    if (!ctx || !canvas) return;
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = COLORS.accentFaint;
    ctx.lineWidth = 1;
    let grid = 30;
    for (let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    edges.forEach(e => {
        let a = nodes.find(n => n.id === e.from);
        let b = nodes.find(n => n.id === e.to);
        if (!a || !b) return;

        let isHighlighted = hoveredNode && (hoveredNode.id === a.id || hoveredNode.id === b.id);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (e.type === 'friend') {
            ctx.strokeStyle = isHighlighted ? COLORS.accent : COLORS.accentDim;
            ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
        } else {
            ctx.strokeStyle = isHighlighted ? COLORS.accent : COLORS.accentFaint;
            ctx.lineWidth = isHighlighted ? 2 : 1;
            ctx.setLineDash([4, 4]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    });

    nodes.forEach(n => {
        let isHovered = hoveredNode && hoveredNode.id === n.id;

        if (n.isMe || n.online) {
            let glowColor = n.isMe ? COLORS.accent : COLORS.online;
            let grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 3);
            grad.addColorStop(0, hexToRgba(glowColor, 0.4));
            grad.addColorStop(1, hexToRgba(glowColor, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (isHovered ? 3 : 0), 0, Math.PI * 2);
        if (n.isMe) {
            ctx.fillStyle = COLORS.accent;
        } else if (n.isFriend) {
            ctx.fillStyle = '#b3123f';
        } else if (n.isClan) {
            ctx.fillStyle = '#7c1c2c';
        } else {
            ctx.fillStyle = '#1a1a22';
        }
        ctx.fill();

        ctx.strokeStyle = n.online ? COLORS.online : COLORS.offline;
        ctx.lineWidth = n.isMe ? 3 : 2;
        ctx.stroke();

        ctx.fillStyle = isHovered ? COLORS.accent : (n.isMe ? COLORS.accent : COLORS.text);
        ctx.font = (n.isMe ? 'bold 13px' : '11px') + ' JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(n.name, n.x, n.y + n.radius + 6);
    });
}

function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// ============================================================
// СОБЫТИЯ
// ============================================================

function onMouseMove(e) {
    if (!canvas) return;
    let rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;
    hoveredNode = null;
    for (let n of nodes) {
        let dx = mx - n.x;
        let dy = my - n.y;
        if (dx * dx + dy * dy < n.radius * n.radius * 1.8) {
            hoveredNode = n;
            break;
        }
    }
    canvas.style.cursor = hoveredNode ? 'pointer' : 'crosshair';
}

function onClick(e) {
    if (!hoveredNode) return;
    if (typeof window.showAgentInfo === 'function') window.showAgentInfo(hoveredNode.name);
}

// ============================================================
// ФОЛБЭК ДЛЯ МОБИЛЬНЫХ
// ============================================================

async function renderFallbackList() {
    let list = document.getElementById('web-fallback-list');
    if (!list) return;
    let agents = await getAgents();
    let arr = Object.entries(agents).filter(([n]) => n !== 'W-C26');
    if (arr.length === 0) {
        list.innerHTML = '<div class="empty-state">НЕТ АГЕНТОВ</div>';
        return;
    }
    list.innerHTML = arr.map(([name, d]) => {
        let av = d.avatar_url ? '<img src="' + d.avatar_url + '">' : '🕶️';
        let online = d.last_seen && (Date.now() - new Date(d.last_seen).getTime()) < 300000;
        let roleIcon = d.role === 'admin' ? '👑' : d.role === 'moderator' ? '🛡' : '🎯';
        return '<div class="card" style="cursor:pointer;margin-bottom:8px;" data-show-agent="' + name + '">' +
            '<div style="display:flex;gap:12px;align-items:center;">' +
            '<div class="card-avatar">' + av + '</div>' +
            '<div><div class="card-author">' + name + ' ' + (online ? '<span style="color:var(--success);">●</span>' : '') + '</div>' +
            '<div class="card-meta">' + roleIcon + ' ' + (d.role || 'agent').toUpperCase() + '</div></div></div></div>';
    }).join('');
    list.querySelectorAll('[data-show-agent]').forEach(el => {
        el.addEventListener('click', () => {
            if (typeof window.showAgentInfo === 'function') window.showAgentInfo(el.dataset.showAgent);
        });
    });
}