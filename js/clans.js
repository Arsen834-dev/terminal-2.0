// ============ CLANS / ОТРЯДЫ, ВОЙНЫ ============
import { supabase, CA, getAgents, saveAgent } from './auth.js';
import { addLog } from './admin.js';
import { notif, closeModal } from './utils.js';

let clans = [];
let clanWars = [];
let clanJoinRequests = [];

export async function loadClans() {
    try { let { data } = await supabase.from('clans').select('*').order('rating', { ascending: false }); if (data) clans = data; } catch (e) {}
}

export async function loadClanWars() {
    try { let { data } = await supabase.from('clan_wars').select('*'); if (data) clanWars = data; } catch (e) {}
}

export async function loadClanJoinRequests() {
    try { let { data } = await supabase.from('clan_join_requests').select('*'); if (data) clanJoinRequests = data; } catch (e) {}
}

export async function createClan(name, tag, emoji, description, joinType) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    if (clans.find(c => c.members?.find(m => m.name === CA.name))) return { success: false, error: '⚠ ВЫ УЖЕ В ОТРЯДЕ' };
    let cost = (CA.clansCreated || 0) > 0 ? 100 : 0;
    if (cost > 0 && (CA.crystals || 0) < cost) return { success: false, error: '⛔ НЕДОСТАТОЧНО ТК' };
    if (cost > 0) CA.crystals -= cost;
    CA.clansCreated = (CA.clansCreated || 0) + 1;
    await supabase.from('agents').update({ clans_created: CA.clansCreated }).eq('name', CA.name);
    try {
        await supabase.from('clans').insert({
            name, tag: tag.toUpperCase(), emoji, description,
            leader: CA.name, treasury: 0, rating: 0, rep: 0,
            members: [{ name: CA.name, role: 'leader' }],
            join_type: joinType || 'free'
        });
        await loadClans();
        await saveAgent();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка создания' };
    }
}

export async function joinClan(clanId) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    let cl = clans.find(c => c.id == clanId);
    if (!cl) return { success: false, error: '⛔ Отряд не найден' };
    if (clans.some(c => c.members?.some(m => m.name === CA.name))) return { success: false, error: '⚠ ВЫ УЖЕ В ОТРЯДЕ' };
    if (cl.join_type === 'request') {
        try { await supabase.from('clan_join_requests').insert({ clan_id: clanId, requester: CA.name }); return { success: true, message: '📩 ЗАЯВКА ОТПРАВЛЕНА' }; }
        catch (e) { return { success: false, error: 'Ошибка заявки' }; }
    }
    if (!cl.members) cl.members = [];
    if (cl.members.find(m => m.name === CA.name)) return { success: false, error: '⚠ ВЫ УЖЕ В ОТРЯДЕ' };
    cl.members.push({ name: CA.name, role: 'member' });
    cl.rating = (cl.rating || 0) + 10;
    try {
        await supabase.from('clans').update({ members: cl.members, rating: cl.rating }).eq('id', clanId);
        await loadClans();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка вступления' }; }
}

export async function leaveClan(clanId) {
    let cl = clans.find(c => c.id == clanId);
    if (!cl || !CA || cl.leader === CA.name) return { success: false, error: '⛔ НЕЛЬЗЯ' };
    cl.members = cl.members.filter(m => m.name !== CA.name);
    cl.rating = Math.max(0, (cl.rating || 0) - 10);
    try {
        await supabase.from('clans').update({ members: cl.members, rating: cl.rating }).eq('id', clanId);
        await loadClans();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка выхода' }; }
}

export async function deleteClan(clanId) {
    let cl = clans.find(c => c.id == clanId);
    if (!cl || cl.leader !== CA.name) return { success: false, error: '⛔ НЕТ ПРАВ' };
    let wars = clanWars.filter(w => !w.resolved && (w.attacker_tag === cl.tag || w.defender_tag === cl.tag));
    for (let w of wars) {
        let a = clans.find(c => c.tag === w.attacker_tag);
        let d = clans.find(c => c.tag === w.defender_tag);
        if (a && a.tag !== cl.tag) { a.treasury = (a.treasury || 0) + 500; await supabase.from('clans').update({ treasury: a.treasury }).eq('id', a.id); }
        if (d && d.tag !== cl.tag) { d.treasury = (d.treasury || 0) + 500; await supabase.from('clans').update({ treasury: d.treasury }).eq('id', d.id); }
        await supabase.from('clan_wars').update({ resolved: true, winner: 'CANCELLED' }).eq('id', w.id);
    }
    try { await supabase.from('clans').delete().eq('id', clanId); await loadClans(); return { success: true }; }
    catch (e) { return { success: false, error: 'Ошибка удаления' }; }
}

export async function declareWar(attackerClanId, targetClanId) {
    let a = clans.find(c => c.id == attackerClanId);
    let d = clans.find(c => c.id == targetClanId);
    if (!a || !d) return { success: false, error: '⛔ Отряд не найден' };
    if (a.leader !== CA.name) return { success: false, error: '⛔ ТОЛЬКО ЛИДЕР' };
    if ((a.treasury || 0) < 500) return { success: false, error: '⚠ НЕТ 500 ТК' };
    if ((d.treasury || 0) < 500) return { success: false, error: '⚠ У ЦЕЛИ НЕТ 500 ТК' };
    let already = clanWars.some(w => !w.resolved && ((w.attacker_tag === a.tag && w.defender_tag === d.tag) || (w.attacker_tag === d.tag && w.defender_tag === a.tag)));
    if (already) return { success: false, error: '⚠ УЖЕ ВОЙНА' };
    a.treasury -= 500; d.treasury -= 500;
    let war = { attacker_tag: a.tag, defender_tag: d.tag, end_time: new Date(Date.now() + 86400000).toISOString(), pot: 1000, resolved: false, stats: { attacker_score: 0, defender_score: 0, last_update: Date.now() } };
    try {
        await supabase.from('clan_wars').insert(war);
        await supabase.from('clans').update({ treasury: a.treasury }).eq('id', a.id);
        await supabase.from('clans').update({ treasury: d.treasury }).eq('id', d.id);
        await loadClanWars();
        addLog(CA.name, 'war_declare', a.tag + ' VS ' + d.tag);
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка войны' }; }
}

export async function updateWarScores() {
    for (let war of clanWars) {
        if (war.resolved) continue;
        let a = clans.find(c => c.tag === war.attacker_tag);
        let d = clans.find(c => c.tag === war.defender_tag);
        if (!a || !d) continue;
        let now = Date.now();
        if (!war.stats) war.stats = { attacker_score: 0, defender_score: 0, last_update: now };
        let agents = await getAgents();
        let aOn = a.members ? a.members.filter(m => { let x = agents[m.name]; return x && x.last_seen && (now - new Date(x.last_seen).getTime()) < 3600000; }).length : 0;
        let dOn = d.members ? d.members.filter(m => { let x = agents[m.name]; return x && x.last_seen && (now - new Date(x.last_seen).getTime()) < 3600000; }).length : 0;
        let aRep = (a.members || []).reduce((s, m) => { let x = agents[m.name]; return s + (x ? Math.floor((x.rep || 0) / 10) : 0); }, 0);
        let dRep = (d.members || []).reduce((s, m) => { let x = agents[m.name]; return s + (x ? Math.floor((x.rep || 0) / 10) : 0); }, 0);
        war.stats.attacker_score += aOn + aRep + Math.floor(Math.random() * 3);
        war.stats.defender_score += dOn + dRep + Math.floor(Math.random() * 3);
        war.stats.last_update = now;
        await supabase.from('clan_wars').update({ stats: war.stats }).eq('id', war.id);
    }
}

export async function checkCompletedWars() {
    await loadClanWars();
    let now = Date.now();
    for (let war of clanWars) {
        let endTime = new Date(war.end_time).getTime();
        if (now >= endTime && !war.resolved) {
            let aWon = war.stats.attacker_score > war.stats.defender_score || (war.stats.attacker_score === war.stats.defender_score && Math.random() < 0.6);
            let winner = aWon ? war.attacker_tag : war.defender_tag;
            let loser = aWon ? war.defender_tag : war.attacker_tag;
            let wc = clans.find(c => c.tag === winner);
            let lc = clans.find(c => c.tag === loser);
            if (wc) {
                wc.rating = (wc.rating || 0) + 50;
                wc.treasury = (wc.treasury || 0) + (war.pot || 1000);
                await supabase.from('clans').update({ rating: wc.rating, treasury: wc.treasury }).eq('id', wc.id);
            }
            if (lc) {
                lc.rating = Math.max(0, (lc.rating || 0) - 50);
                await supabase.from('clans').update({ rating: lc.rating }).eq('id', lc.id);
            }
            await supabase.from('clan_wars').update({ resolved: true, winner }).eq('id', war.id);
            addLog('СИСТЕМА', 'war_end', winner + ' победил ' + loser);
        }
    }
    clanWars = clanWars.filter(w => !w.resolved);
}

export async function donateToClan(clanId, amount) {
    if (!CA || (CA.crystals || 0) < amount || amount < 1) return { success: false, error: '⛔ НЕДОСТАТОЧНО ТК' };
    let cl = clans.find(c => c.id == clanId);
    if (!cl) return { success: false, error: '⛔ Отряд не найден' };
    CA.crystals -= amount;
    cl.treasury = (cl.treasury || 0) + amount;
    try {
        await supabase.from('clans').update({ treasury: cl.treasury }).eq('id', clanId);
        await saveAgent();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

// МОДАЛКА ПОПОЛНЕНИЯ КАЗНЫ
export function showDonateModal(clanId) {
    let existing = document.getElementById('modal-donate-clan');
    if (existing) existing.remove();
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-donate-clan';
    modal.style.display = 'flex';
    modal.classList.add('show');
    modal.innerHTML = '<div class="modal-box"><div class="modal-title">💰 ПОПОЛНИТЬ КАЗНУ</div>' +
        '<div style="color:#cc0000;">Ваш баланс: ' + (CA?.crystals || 0) + ' ТК</div>' +
        '<input type="number" class="modal-input" id="donate-amount" placeholder="СУММА" min="1" max="' + (CA?.crystals || 0) + '">' +
        '<button class="modal-btn" id="donate-confirm-btn" style="width:100%;">ПОПОЛНИТЬ</button>' +
        '<button class="modal-btn" onclick="this.closest(\'.modal-overlay\').remove()" style="width:100%;">ОТМЕНА</button></div>';
    document.body.appendChild(modal);
    setTimeout(() => {
        document.getElementById('donate-confirm-btn').addEventListener('click', async function() {
            let amt = parseInt(document.getElementById('donate-amount').value);
            if (!amt || amt < 1) return notif('⛔ НЕВЕРНАЯ СУММА');
            let r = await donateToClan(clanId, amt);
            if (r.success) {
                notif('💰 +' + amt + ' ТК В КАЗНУ');
                modal.remove();
                if (typeof window.updateStatusBar === 'function') window.updateStatusBar();
                renderClans();
            } else {
                notif(r.error);
            }
        });
    }, 10);
}

// МОДАЛКА ВЫБОРА ЦЕЛИ ДЛЯ ВОЙНЫ
export function openWarTargetModal(clanId) {
    let myClan = clans.find(c => c.id == clanId);
    if (!myClan || myClan.leader !== CA.name) return;
    if ((myClan.treasury || 0) < 500) return notif('⚠ У ВАШЕГО ОТРЯДА НЕТ 500 ТК В КАЗНЕ!');
    let alreadyAtWar = clanWars.some(w => !w.resolved && (w.attacker_tag === myClan.tag || w.defender_tag === myClan.tag));
    if (alreadyAtWar) return notif('⚠ ВЫ УЖЕ ВЕДЁТЕ ВОЙНУ!');

    let targets = clans.filter(c =>
        c.id !== clanId &&
        Math.abs((c.members?.length || 0) - (myClan.members?.length || 0)) <= 2 &&
        (c.treasury || 0) >= 500 &&
        !clanWars.some(w => !w.resolved && ((w.attacker_tag === myClan.tag && w.defender_tag === c.tag) || (w.attacker_tag === c.tag && w.defender_tag === myClan.tag)))
    );

    let modal = document.getElementById('modal-war-target');
    let listDiv = document.getElementById('war-target-list');
    if (!modal || !listDiv) return;

    listDiv.innerHTML = '<div style="color:#ffd700;margin-bottom:15px;padding:10px;border:1px solid #ffd700;font-size:0.9rem;">⚔️ <b>ПРАВИЛА ВОЙНЫ:</b><br>• Война длится 24 часа<br>• Каждый час начисляются очки за онлайн участников и их репутацию<br>• Победитель получает банк 1000 ТК и +50 рейтинга<br>• Проигравший теряет -50 рейтинга<br>• С каждой стороны списывается 500 ТК в банк</div>';

    if (targets.length === 0) {
        listDiv.innerHTML += '<div style="color:#cc0000;padding:20px;text-align:center;">⚠ НЕТ ДОСТУПНЫХ ЦЕЛЕЙ<br><small>Разница ≤2 участников, казна ≥500 ТК, нет активной войны</small></div>';
    } else {
        listDiv.innerHTML += targets.map(c => '<div class="admin-row"><span>' + c.emoji + ' ' + c.name + ' [' + c.tag + '] (' + c.members?.length + ' уч., ' + c.treasury + ' ТК)</span><button class="modal-btn" data-attack-target="' + c.id + '">⚔️ НАПАСТЬ</button></div>').join('');
        setTimeout(() => {
            document.querySelectorAll('[data-attack-target]').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    let targetClanId = parseInt(this.dataset.attackTarget);
                    let r = await declareWar(clanId, targetClanId);
                    if (r.success) {
                        notif('⚔️ ВОЙНА ОБЪЯВЛЕНА!');
                        closeModal('modal-war-target');
                        await loadClans();
                        await loadClanWars();
                        renderClans();
                    } else {
                        notif(r.error);
                    }
                });
            });
        }, 10);
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

export async function autoDistributeTreasury() {
    let now = Date.now();
    let lastDist = parseInt(localStorage.getItem('syndicate_last_clan_distribute') || '0');
    if (now - lastDist < 3600000) return;
    localStorage.setItem('syndicate_last_clan_distribute', now);
    await loadClans();
    for (let cl of clans) {
        if (!cl.members || cl.members.length <= 1 || (cl.treasury || 0) <= 0) continue;
        let total = cl.treasury || 0;
        let bonus = Math.floor(total * 0.1);
        if (bonus <= 0) continue;
        let totalBonus = bonus * cl.members.length;
        if (totalBonus > total) continue;
        cl.treasury -= totalBonus;
        for (let m of cl.members) {
            try {
                let { data } = await supabase.from('agents').select('crystals').eq('name', m.name).maybeSingle();
                if (data) { let nc = (data.crystals || 0) + bonus; await supabase.from('agents').update({ crystals: nc }).eq('name', m.name); }
            } catch (e) {}
        }
        await supabase.from('clans').update({ treasury: cl.treasury }).eq('id', cl.id);
    }
}

export async function acceptJoinRequest(clanId, name) {
    let cl = clans.find(c => c.id === clanId);
    if (!cl || cl.leader !== CA.name) return { success: false, error: '⛔ НЕТ ПРАВ' };
    if (!cl.members) cl.members = [];
    if (cl.members.find(m => m.name === name)) return { success: false, error: '⛔ УЖЕ В ОТРЯДЕ' };
    cl.members.push({ name, role: 'member' });
    cl.rating = (cl.rating || 0) + 10;
    try {
        await supabase.from('clans').update({ members: cl.members, rating: cl.rating }).eq('id', clanId);
        await supabase.from('clan_join_requests').delete().eq('clan_id', clanId).eq('requester', name);
        await loadClans();
        return { success: true };
    } catch (e) { return { success: false, error: 'Ошибка' }; }
}

export async function renderClans() {
    await loadClans();
    await loadClanWars();
    let c = document.getElementById('clans-content');
    if (!CA || !c) return;
    let myClan = clans.find(cl => cl.members && cl.members.find(m => m.name === CA.name));
    let html = '';
    if (myClan) {
        let { data: reqs } = await supabase.from('clan_join_requests').select('*').eq('clan_id', myClan.id);
        if (reqs) {
            reqs.forEach(r => {
                if (!clanJoinRequests.some(j => j.clanId === r.clan_id && j.requester === r.requester)) {
                    clanJoinRequests.push({ clanId: r.clan_id, requester: r.requester });
                }
            });
        }
        let activeWars = clanWars.filter(w => (w.attacker_tag === myClan.tag || w.defender_tag === myClan.tag) && !w.resolved);
        html += '<div class="clan-info-block"><div style="font-size:1.5rem;">' + myClan.emoji + ' ' + myClan.name + ' <span style="color:#cc0000;">[' + myClan.tag + ']</span></div><div style="color:#cc0000;">' + (myClan.description || '') + '</div><div>👑 ' + myClan.leader + ' | 💰 ' + (myClan.treasury || 0) + ' ТК | ⭐ ' + (myClan.rating || 0) + ' | 👥 ' + (myClan.members?.length || 0) + '</div>';
        if (activeWars.length > 0) {
            html += '<div style="margin-top:10px;"><b>⚔️ АКТИВНЫЕ ВОЙНЫ:</b></div>';
            activeWars.forEach(w => {
                let timeLeft = Math.max(0, Math.ceil((new Date(w.end_time).getTime() - Date.now()) / 3600000));
                let att = w.stats?.attacker_score || 0;
                let def = w.stats?.defender_score || 0;
                html += '<div class="clan-war-card"><div style="display:flex;justify-content:space-between;"><span>' + w.attacker_tag + ' VS ' + w.defender_tag + '</span><span>🏆 ' + (w.pot || 1000) + ' ТК</span></div><div style="display:flex;justify-content:space-between;font-size:0.8rem;"><span>⚔️ ' + att + '</span><span>🛡 ' + def + '</span></div><div style="font-size:0.8rem;">⏳ ' + timeLeft + 'ч</div></div>';
            });
        }
        html += '<div style="margin-top:10px;"><b>Участники:</b></div>';
        myClan.members.forEach(m => {
            html += '<div class="clan-member-row"><span>' + m.name + ' ' + (m.role === 'leader' ? '👑' : m.role === 'officer' ? '🛡' : '') + '</span><span>';
            if (myClan.leader === CA.name && m.name !== CA.name) {
                html += '<button class="modal-btn" style="font-size:0.7rem;padding:2px 6px;" data-cr="' + myClan.id + '" data-crn="' + m.name + '" data-crr="' + (m.role === 'officer' ? 'member' : 'officer') + '">' + (m.role === 'officer' ? '⬇' : '⬆') + '</button>';
                html += '<button class="modal-btn" style="font-size:0.7rem;padding:2px 6px;color:#ff0000;border-color:#ff0000;" data-kick="' + myClan.id + '" data-kickn="' + m.name + '">✕</button>';
            }
            html += '</span></div>';
        });
        html += '<button class="modal-btn" data-donate="' + myClan.id + '">💰 ПОПОЛНИТЬ КАЗНУ</button>';
        if (myClan.leader === CA.name) {
            html += '<button class="modal-btn" data-war="' + myClan.id + '">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>';
            html += '<button class="modal-btn" data-delclan="' + myClan.id + '" style="color:#ff0000;border-color:#ff0000;">🗑 УДАЛИТЬ</button>';
        }
        html += '<button class="modal-btn" data-leave="' + myClan.id + '">🚪 ПОКИНУТЬ</button></div>';
        let requests = clanJoinRequests.filter(r => r.clanId === myClan.id);
        if (requests.length > 0 && myClan.leader === CA.name) {
            html += '<div style="margin-top:10px;padding:10px;border:2px solid #ffd700;"><b>📩 ЗАЯВКИ:</b>';
            requests.forEach(r => { html += '<div class="clan-member-row"><span>' + r.requester + '</span><button class="modal-btn" style="font-size:0.8rem;" data-accept-join="' + myClan.id + '" data-accept-name="' + r.requester + '">✅ ПРИНЯТЬ</button></div>'; });
            html += '</div>';
        }
    } else {
        html += '<div style="color:#cc0000;margin-bottom:15px;">ВЫ НЕ В ОТРЯДЕ</div><button class="settings-btn" id="create-clan-btn"><span>⚔️</span> СОЗДАТЬ ОТРЯД (' + ((CA.clansCreated || 0) > 0 ? '100 ТК' : 'БЕСПЛАТНО') + ')</button>';
    }
    html += '<div style="margin-top:20px;"><b>РЕЙТИНГ ОТРЯДОВ:</b></div>';
    if (clans.length === 0) html += '<div style="color:#cc0000;">НЕТ ОТРЯДОВ</div>';
    else {
        html += '<div class="agent-table-header"><div>ОТРЯД</div><div>⭐</div><div>💰</div><div>👥</div></div>';
        clans.sort((a, b) => (b.rating || 0) - (a.rating || 0)).forEach(cl => {
            html += '<div class="agent-row" data-clan-info="' + cl.id + '"><div>' + cl.emoji + ' ' + cl.name + ' [' + cl.tag + ']</div><div>' + (cl.rating || 0) + '</div><div>' + (cl.treasury || 0) + '</div><div>' + (cl.members?.length || 0) + '</div></div>';
        });
    }
    c.innerHTML = html;
    setTimeout(() => {
        document.getElementById('create-clan-btn')?.addEventListener('click', () => { if (typeof window.showCreateClan === 'function') window.showCreateClan(); });
        document.querySelectorAll('[data-clan-info]').forEach(b => b.addEventListener('click', function() { if (typeof window.showClanInfo === 'function') window.showClanInfo(parseInt(this.dataset.clanInfo)); }));
        document.querySelectorAll('[data-cr]').forEach(b => b.addEventListener('click', function() { changeClanRole(parseInt(this.dataset.cr), this.dataset.crn, this.dataset.crr); }));
        document.querySelectorAll('[data-kick]').forEach(b => b.addEventListener('click', function() { kickClanMember(parseInt(this.dataset.kick), this.dataset.kickn); }));
        document.querySelectorAll('[data-donate]').forEach(b => b.addEventListener('click', function() { showDonateModal(parseInt(this.dataset.donate)); }));
        document.querySelectorAll('[data-war]').forEach(b => b.addEventListener('click', function() { openWarTargetModal(parseInt(this.dataset.war)); }));
        document.querySelectorAll('[data-delclan]').forEach(b => b.addEventListener('click', function() { deleteClan(parseInt(this.dataset.delclan)).then(() => renderClans()); }));
        document.querySelectorAll('[data-leave]').forEach(b => b.addEventListener('click', function() { leaveClan(parseInt(this.dataset.leave)).then(() => renderClans()); }));
        document.querySelectorAll('[data-accept-join]').forEach(b => b.addEventListener('click', function() { acceptJoinRequest(parseInt(this.dataset.acceptJoin), this.dataset.acceptName).then(() => renderClans()); }));
    }, 10);
}

export async function changeClanRole(clanId, name, role) {
    let cl = clans.find(c => c.id == clanId);
    if (!cl || cl.leader !== CA.name) return;
    let m = cl.members.find(x => x.name === name);
    if (!m) return;
    m.role = role;
    await supabase.from('clans').update({ members: cl.members }).eq('id', clanId);
    await loadClans();
    renderClans();
}

export async function kickClanMember(clanId, name) {
    let cl = clans.find(c => c.id == clanId);
    if (!cl || cl.leader !== CA.name) return;
    cl.members = cl.members.filter(m => m.name !== name);
    cl.rating = Math.max(0, (cl.rating || 0) - 10);
    await supabase.from('clans').update({ members: cl.members, rating: cl.rating }).eq('id', clanId);
    await loadClans();
    renderClans();
    notif('👢 ИСКЛЮЧЁН');
}

export { clans, clanWars, clanJoinRequests };