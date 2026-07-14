// ============ CLANS / ОТРЯДЫ, ВОЙНЫ, РЕЙТИНГ ============
import { supabase, CA, getAgents, saveAgent } from './auth.js';
import { CLAN_EMOJIS } from './config.js';
import { addLog } from './admin.js';
import { notif } from './utils.js';

let clans = [];
let clanWars = [];
let clanJoinRequests = [];

// ==================== ЗАГРУЗКА ====================

export async function loadClans() {
    try {
        let { data } = await supabase.from('clans').select('*').order('rating', { ascending: false });
        if (data) clans = data;
    } catch (e) {}
}

export async function loadClanWars() {
    try {
        let { data } = await supabase.from('clan_wars').select('*');
        if (data) clanWars = data;
    } catch (e) {}
}

export async function loadClanJoinRequests() {
    try {
        let { data } = await supabase.from('clan_join_requests').select('*');
        if (data) clanJoinRequests = data;
    } catch (e) {}
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

export async function createClan(name, tag, emoji, description, joinType) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    if (clans.find(c => c.members?.find(m => m.name === CA.name))) {
        return { success: false, error: '⚠ ВЫ УЖЕ В ОТРЯДЕ' };
    }
    let cost = (CA.clansCreated || 0) > 0 ? 100 : 0;
    if (cost > 0 && (CA.crystals || 0) < cost) {
        return { success: false, error: '⛔ НЕДОСТАТОЧНО ТК' };
    }
    if (cost > 0) CA.crystals -= cost;
    CA.clansCreated = (CA.clansCreated || 0) + 1;
    await supabase.from('agents').update({ clans_created: CA.clansCreated }).eq('name', CA.name);
    
    try {
        await supabase.from('clans').insert({
            name,
            tag: tag.toUpperCase(),
            emoji,
            description,
            leader: CA.name,
            treasury: 0,
            rating: 0,
            rep: 0,
            members: [{ name: CA.name, role: 'leader' }],
            join_type: joinType || 'free'
        });
        await loadClans();
        await saveAgent();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка создания отряда' };
    }
}

export async function joinClan(clanId) {
    if (!CA) return { success: false, error: '⛔ Не авторизован' };
    let cl = clans.find(c => c.id == clanId);
    if (!cl) return { success: false, error: '⛔ Отряд не найден' };
    if (clans.some(c => c.members?.some(m => m.name === CA.name))) {
        return { success: false, error: '⚠ ВЫ УЖЕ В ОТРЯДЕ' };
    }
    if (cl.join_type === 'request') {
        try {
            await supabase.from('clan_join_requests').insert({ clan_id: clanId, requester: CA.name });
            return { success: true, message: '📩 ЗАЯВКА ОТПРАВЛЕНА' };
        } catch (e) {
            return { success: false, error: 'Ошибка отправки заявки' };
        }
    }
    if (!cl.members) cl.members = [];
    if (cl.members.find(m => m.name === CA.name)) {
        return { success: false, error: '⚠ ВЫ УЖЕ В ОТРЯДЕ' };
    }
    cl.members.push({ name: CA.name, role: 'member' });
    cl.rating = (cl.rating || 0) + 10;
    try {
        await supabase.from('clans').update({ members: cl.members, rating: cl.rating }).eq('id', clanId);
        await loadClans();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка вступления' };
    }
}

export async function leaveClan(clanId) {
    let cl = clans.find(c => c.id == clanId);
    if (!cl || !CA || cl.leader === CA.name) {
        return { success: false, error: '⛔ НЕЛЬЗЯ' };
    }
    cl.members = cl.members.filter(m => m.name !== CA.name);
    cl.rating = Math.max(0, (cl.rating || 0) - 10);
    try {
        await supabase.from('clans').update({ members: cl.members, rating: cl.rating }).eq('id', clanId);
        await loadClans();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка выхода' };
    }
}

export async function deleteClan(clanId) {
    let cl = clans.find(c => c.id == clanId);
    if (!cl || cl.leader !== CA.name) return { success: false, error: '⛔ НЕТ ПРАВ' };
    
    let wars = clanWars.filter(w => !w.resolved && (w.attacker_tag === cl.tag || w.defender_tag === cl.tag));
    for (let w of wars) {
        let attackerClan = clans.find(c => c.tag === w.attacker_tag);
        let defenderClan = clans.find(c => c.tag === w.defender_tag);
        if (attackerClan && attackerClan.tag !== cl.tag) {
            attackerClan.treasury = (attackerClan.treasury || 0) + 500;
            await supabase.from('clans').update({ treasury: attackerClan.treasury }).eq('id', attackerClan.id);
        }
        if (defenderClan && defenderClan.tag !== cl.tag) {
            defenderClan.treasury = (defenderClan.treasury || 0) + 500;
            await supabase.from('clans').update({ treasury: defenderClan.treasury }).eq('id', defenderClan.id);
        }
        await supabase.from('clan_wars').update({ resolved: true, winner: 'CANCELLED' }).eq('id', w.id);
    }
    
    try {
        await supabase.from('clans').delete().eq('id', clanId);
        await loadClans();
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка удаления' };
    }
}

// ==================== ВОЙНЫ ====================

export async function declareWar(attackerClanId, targetClanId) {
    let attacker = clans.find(c => c.id == attackerClanId);
    let defender = clans.find(c => c.id == targetClanId);
    if (!attacker || !defender) return { success: false, error: '⛔ Отряд не найден' };
    if (attacker.leader !== CA.name) return { success: false, error: '⛔ ТОЛЬКО ЛИДЕР' };
    if ((attacker.treasury || 0) < 500) return { success: false, error: '⚠ НЕТ 500 ТК В КАЗНЕ' };
    if ((defender.treasury || 0) < 500) return { success: false, error: '⚠ У ЦЕЛИ НЕТ 500 ТК' };
    
    let alreadyAtWar = clanWars.some(w => !w.resolved && 
        ((w.attacker_tag === attacker.tag && w.defender_tag === defender.tag) ||
         (w.attacker_tag === defender.tag && w.defender_tag === attacker.tag)));
    if (alreadyAtWar) return { success: false, error: '⚠ УЖЕ ВОЙНА' };
    
    attacker.treasury = (attacker.treasury || 0) - 500;
    defender.treasury = (defender.treasury || 0) - 500;
    
    let war = {
        attacker_tag: attacker.tag,
        defender_tag: defender.tag,
        end_time: new Date(Date.now() + 86400000).toISOString(),
        pot: 1000,
        resolved: false,
        stats: { attacker_score: 0, defender_score: 0, last_update: Date.now() }
    };
    
    try {
        await supabase.from('clan_wars').insert(war);
        await supabase.from('clans').update({ treasury: attacker.treasury }).eq('id', attacker.id);
        await supabase.from('clans').update({ treasury: defender.treasury }).eq('id', defender.id);
        await loadClanWars();
        addLog(CA.name, 'war_declare', attacker.tag + ' VS ' + defender.tag);
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Ошибка объявления войны' };
    }
}

export async function updateWarScores() {
    for (let war of clanWars) {
        if (war.resolved) continue;
        let attackerClan = clans.find(c => c.tag === war.attacker_tag);
        let defenderClan = clans.find(c => c.tag === war.defender_tag);
        if (!attackerClan || !defenderClan) continue;
        
        let now = Date.now();
        if (!war.stats) war.stats = { attacker_score: 0, defender_score: 0, last_update: now };
        
        let agents = await getAgents();
        let attackerOnline = attackerClan.members ? attackerClan.members.filter(m => {
            let a = agents[m.name];
            return a && a.last_seen && (now - new Date(a.last_seen).getTime()) < 3600000;
        }).length : 0;
        let defenderOnline = defenderClan.members ? defenderClan.members.filter(m => {
            let a = agents[m.name];
            return a && a.last_seen && (now - new Date(a.last_seen).getTime()) < 3600000;
        }).length : 0;
        let attackerRep = (attackerClan.members || []).reduce((s, m) => {
            let a = agents[m.name];
            return s + (a ? Math.floor((a.rep || 0) / 10) : 0);
        }, 0);
        let defenderRep = (defenderClan.members || []).reduce((s, m) => {
            let a = agents[m.name];
            return s + (a ? Math.floor((a.rep || 0) / 10) : 0);
        }, 0);
        
        war.stats.attacker_score += attackerOnline + attackerRep + Math.floor(Math.random() * 3);
        war.stats.defender_score += defenderOnline + defenderRep + Math.floor(Math.random() * 3);
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
            let attackerWon = war.stats.attacker_score > war.stats.defender_score ||
                (war.stats.attacker_score === war.stats.defender_score && Math.random() < 0.6);
            let winner = attackerWon ? war.attacker_tag : war.defender_tag;
            let loser = attackerWon ? war.defender_tag : war.attacker_tag;
            let winnerClan = clans.find(c => c.tag === winner);
            let loserClan = clans.find(c => c.tag === loser);
            
            if (winnerClan) {
                winnerClan.rating = (winnerClan.rating || 0) + 50;
                winnerClan.treasury = (winnerClan.treasury || 0) + (war.pot || 1000);
                await supabase.from('clans').update({ 
                    rating: winnerClan.rating, 
                    treasury: winnerClan.treasury 
                }).eq('id', winnerClan.id);
            }
            if (loserClan) {
                loserClan.rating = Math.max(0, (loserClan.rating || 0) - 50);
                await supabase.from('clans').update({ rating: loserClan.rating }).eq('id', loserClan.id);
            }
            await supabase.from('clan_wars').update({ 
                resolved: true, 
                winner: winner 
            }).eq('id', war.id);
            
            addLog('СИСТЕМА', 'war_end', winner + ' победил ' + loser + 
                ' | счёт: ' + war.stats.attacker_score + ' - ' + war.stats.defender_score);
            
            if (winnerClan && winnerClan.members) {
                winnerClan.members.forEach(m => {
                    if (m.name === CA?.name) {
                        notif('🏆 Ваш отряд ' + winnerClan.name + ' одержал победу над ' + (loserClan ? loserClan.name : loser) + '! +' + (war.pot || 1000) + ' ТК в казну!');
                    }
                });
            }
            if (loserClan && loserClan.members) {
                loserClan.members.forEach(m => {
                    if (m.name === CA?.name) {
                        notif('💀 Ваш отряд ' + loserClan.name + ' проиграл отряду ' + (winnerClan ? winnerClan.name : winner) + '! -50 рейтинга!');
                    }
                });
            }
        }
    }
    clanWars = clanWars.filter(w => !w.resolved);
}

// ==================== КАЗНА ====================

export async function donateToClan(clanId, amount) {
    if (!CA || (CA.crystals || 0) < amount || amount < 1) {
        return { success: false, error: '⛔ НЕДОСТАТОЧНО ТК' };
    }
    let cl = clans.find(c => c.id == clanId);
    if (!cl) return { success: false, error: '⛔ Отряд не найден' };
    
    CA.crystals -= amount;
    cl.treasury = (cl.treasury || 0) + amount;
    
    try {
        await supabase.from('clans').update({ treasury: cl.treasury }).eq('id', clanId);
        await saveAgent();
        return { success: true, message: '💰 +' + amount + ' ТК В КАЗНУ' };
    } catch (e) {
        return { success: false, error: 'Ошибка пополнения' };
    }
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
                if (data) {
                    let newCrystals = (data.crystals || 0) + bonus;
                    await supabase.from('agents').update({ crystals: newCrystals }).eq('name', m.name);
                }
            } catch (e) {}
        }
        await supabase.from('clans').update({ treasury: cl.treasury }).eq('id', cl.id);
    }
}

// ==================== ЗАЯВКИ ====================

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
    } catch (e) {
        return { success: false, error: 'Ошибка принятия' };
    }
}

// ==================== RENDER CLANS (UI) ====================

export async function renderClans() {
    await loadClans();
    await loadClanWars();
    let c = document.getElementById('clans-content');
    if (!CA || !c) return;
    let myClan = clans.find(cl => cl.members && cl.members.find(m => m.name === CA.name));
    let html = '';
    if (myClan) {
        let { data: joinReqs } = await supabase.from('clan_join_requests').select('*').eq('clan_id', myClan.id);
        if (joinReqs) joinReqs.forEach(r => {
            if (!clanJoinRequests.some(j => j.clanId === r.clan_id && j.requester === r.requester)) {
                clanJoinRequests.push({ clanId: r.clan_id, requester: r.requester });
            }
        });
        let activeWars = clanWars.filter(w => (w.attacker_tag === myClan.tag || w.defender_tag === myClan.tag) && !w.resolved);
        html += '<div class="clan-info-block"><div style="font-size:1.5rem;">' + myClan.emoji + ' ' + myClan.name + ' <span style="color:#cc0000;">[' + myClan.tag + ']</span></div><div style="color:#cc0000;">' + (myClan.description || '') + '</div><div>👑 ' + myClan.leader + ' | 💰 ' + (myClan.treasury || 0) + ' ТК | ⭐ ' + (myClan.rating || 0) + ' | РЕП: ' + (myClan.rep || 0) + ' | 👥 ' + (myClan.members?.length || 0) + ' | 💎 +' + (Math.floor((myClan.treasury || 0) * 0.1)) + ' ТК/ч</div>';
        if (activeWars.length > 0) {
            html += '<div style="margin-top:10px;"><b>⚔️ АКТИВНЫЕ ВОЙНЫ:</b></div>';
            activeWars.forEach(w => {
                let timeLeft = Math.max(0, Math.ceil((new Date(w.end_time).getTime() - Date.now()) / 3600000));
                let totalHours = 24;
                let elapsed = totalHours - timeLeft;
                let progress = Math.min(100, Math.floor((elapsed / totalHours) * 100));
                let barColor = progress > 80 ? '#ff0000' : progress > 50 ? '#ff9100' : '#ffd700';
                let attScore = w.stats ? w.stats.attacker_score || 0 : 0;
                let defScore = w.stats ? w.stats.defender_score || 0 : 0;
                let timeStr = timeLeft > 0 ? timeLeft + 'ч' : '⏰ ЗАВЕРШЕНА';
                html += '<div class="clan-war-card"><div style="display:flex;justify-content:space-between;"><span>' + w.attacker_tag + ' VS ' + w.defender_tag + '</span><span>🏆 ' + (w.pot || 1000) + ' ТК</span></div><div style="display:flex;justify-content:space-between;font-size:0.8rem;margin:5px 0;"><span>⚔️ ' + attScore + ' очков</span><span>🛡 ' + defScore + ' очков</span></div><div style="margin:8px 0;background:#1a0000;height:12px;border:1px solid #ff1744;"><div style="width:' + progress + '%;height:100%;background:' + barColor + ';transition:width 0.5s;"></div></div><div style="display:flex;justify-content:space-between;font-size:0.8rem;"><span>' + elapsed + 'ч прошло</span><span>' + timeStr + '</span></div></div>';
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
            html += '<button class="modal-btn" data-delclan="' + myClan.id + '" style="color:#ff0000;border-color:#ff0000;">🗑 УДАЛИТЬ ОТРЯД</button>';
        }
        html += '<button class="modal-btn" data-leave="' + myClan.id + '">🚪 ПОКИНУТЬ</button></div>';
        let requests = clanJoinRequests.filter(r => r.clanId === myClan.id);
        if (requests.length > 0 && myClan.leader === CA.name) {
            html += '<div style="margin-top:10px;padding:10px;border:2px solid #ffd700;"><b>📩 ЗАЯВКИ НА ВСТУПЛЕНИЕ (' + requests.length + '):</b>';
            requests.forEach(r => {
                html += '<div class="clan-member-row"><span>' + r.requester + '</span><span><button class="modal-btn" style="font-size:0.8rem;" data-accept-join="' + myClan.id + '" data-accept-name="' + r.requester + '">✅ ПРИНЯТЬ</button></span></div>';
            });
            html += '</div>';
        }
    } else {
        html += '<div style="color:#cc0000;margin-bottom:15px;">ВЫ НЕ В ОТРЯДЕ</div><button class="settings-btn" id="create-clan-btn"><span>⚔️</span> СОЗДАТЬ ОТРЯД (' + ((CA.clansCreated || 0) > 0 ? '100 ТК' : 'БЕСПЛАТНО') + ')</button>';
    }
    html += '<div style="margin-top:20px;"><b>РЕЙТИНГ ОТРЯДОВ:</b></div>';
    if (clans.length === 0) {
        html += '<div style="color:#cc0000;">НЕТ ОТРЯДОВ</div>';
    } else {
        html += '<div class="agent-table-header"><div>ОТРЯД</div><div>⭐ РЕЙТ</div><div>💰 ТК</div><div>👥</div></div>';
        clans.sort((a, b) => (b.rating || 0) - (a.rating || 0)).forEach(cl => {
            html += '<div class="agent-row" data-clan-info="' + cl.id + '"><div>' + cl.emoji + ' ' + cl.name + ' [' + cl.tag + ']</div><div>' + (cl.rating || 0) + '</div><div>' + (cl.treasury || 0) + '</div><div>' + (cl.members?.length || 0) + '</div></div>';
        });
    }
    c.innerHTML = html;
    setTimeout(() => {
        document.getElementById('create-clan-btn')?.addEventListener('click', () => {
            if (typeof showCreateClan === 'function') showCreateClan();
        });
        document.querySelectorAll('[data-clan-info]').forEach(b => b.addEventListener('click', function() {
            if (typeof showClanInfo === 'function') showClanInfo(parseInt(this.dataset.clanInfo));
        }));
        document.querySelectorAll('[data-cr]').forEach(b => b.addEventListener('click', function() {
            changeClanRole(parseInt(this.dataset.cr), this.dataset.crn, this.dataset.crr);
        }));
        document.querySelectorAll('[data-kick]').forEach(b => b.addEventListener('click', function() {
            kickClanMember(parseInt(this.dataset.kick), this.dataset.kickn);
        }));
        document.querySelectorAll('[data-donate]').forEach(b => b.addEventListener('click', function() {
            donateToClan(parseInt(this.dataset.donate));
        }));
        document.querySelectorAll('[data-war]').forEach(b => b.addEventListener('click', function() {
            if (typeof openWarTargetModal === 'function') openWarTargetModal(parseInt(this.dataset.war));
        }));
        document.querySelectorAll('[data-delclan]').forEach(b => b.addEventListener('click', function() {
            deleteClan(parseInt(this.dataset.delclan));
        }));
        document.querySelectorAll('[data-leave]').forEach(b => b.addEventListener('click', function() {
            leaveClan(parseInt(this.dataset.leave));
        }));
        document.querySelectorAll('[data-accept-join]').forEach(b => b.addEventListener('click', function() {
            acceptJoinRequest(parseInt(this.dataset.acceptJoin), this.dataset.acceptName);
        }));
    }, 10);
}

// ==================== ЭКСПОРТЫ ====================

export { clans, clanWars, clanJoinRequests };