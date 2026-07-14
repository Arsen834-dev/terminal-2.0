// ============ AGENTS / ПАУТИНА, ПРОФИЛИ ============
import { supabase, CA, loadAgent, getAgents, saveAgent } from './auth.js';
import { shopItems, getActiveColorClassForId, getActiveFrameClass } from './shop.js';
import { getFriends } from './friends.js';
import { getAchievements } from './achievements.js';
import { clans } from './clans.js';
import { notif } from './utils.js';
import { startDM } from './chat.js';

export async function showAgentInfo(name) {
    if (!name) return;
    const modal = document.getElementById('modal-agent-profile');
    if (!modal) return;
    
    try {
        const agent = await loadAgent(name);
        if (!agent) {
            notif('⛔ АГЕНТ НЕ НАЙДЕН');
            return;
        }
        
        document.getElementById('profile-title').textContent = '📋 ДОСЬЕ: ' + agent.name;
        document.getElementById('profile-avatar').textContent = agent.avatar || '🕶️';
        document.getElementById('profile-name').textContent = agent.name;
        
        const frame = document.getElementById('profile-avatar-frame');
        frame.className = 'status-avatar-frame';
        const frameData = shopItems.frames.find(f => f.id === agent.active_frame);
        frame.classList.add(frameData?.cssClass || 'f-default');
        
        const badgeContainer = document.getElementById('profile-badge');
        if (agent.active_badge && agent.active_badge !== 'b_none') {
            const badgeData = shopItems.badges.find(b => b.id === agent.active_badge);
            if (badgeData?.image) {
                badgeContainer.innerHTML = '<img src="' + badgeData.image + '" style="width:32px;height:32px;vertical-align:middle;">';
            } else if (badgeData?.emoji) {
                badgeContainer.innerHTML = '<span style="font-size:2rem;">' + badgeData.emoji + '</span>';
            } else {
                badgeContainer.innerHTML = '';
            }
        } else {
            badgeContainer.innerHTML = '';
        }
        
        const nameEl = document.getElementById('profile-name');
        if (agent.active_color) {
            const colClass = getActiveColorClassForId(agent.active_color);
            nameEl.className = 'dossier-value';
            if (colClass) nameEl.classList.add(colClass);
        } else {
            nameEl.className = 'dossier-value';
        }
        
        const now = Date.now();
        const isOnline = agent.name === CA?.name || (agent.last_seen && (now - new Date(agent.last_seen).getTime()) < 300000);
        const statusEl = document.getElementById('profile-status');
        if (agent.name === CA?.name) {
            statusEl.textContent = '🟢 ЭТО ВЫ';
            statusEl.style.color = '#00ff41';
        } else if (isOnline) {
            statusEl.textContent = '🟢 ОНЛАЙН';
            statusEl.style.color = '#00ff41';
        } else {
            statusEl.textContent = '🔴 ОФФЛАЙН';
            statusEl.style.color = '#cc0000';
        }
        
        const roleMap = { admin: '👑 АДМИНИСТРАТОР', moderator: '🛡 МОДЕРАТОР', agent: '🎯 АГЕНТ' };
        let roleText = roleMap[agent.role] || '🎯 АГЕНТ';
        if (agent.banned) roleText += ' 🚫 ЗАБАНЕН';
        if (agent.muted) roleText += ' 🔇 ЗАМУЧЕН';
        document.getElementById('profile-role').textContent = roleText;
        
        document.getElementById('profile-rep').textContent = (agent.rep || 0) + '/100';
        document.getElementById('profile-crystals').textContent = agent.crystals || 0;
        document.getElementById('profile-messages').textContent = agent.chat_count || agent.chatCount || 0;
        document.getElementById('profile-guides').textContent = agent.guides_created || agent.guidesCreated || 0;
        document.getElementById('profile-clans').textContent = agent.clans_created || agent.clansCreated || 0;
        
        let clanName = 'НЕТ';
        const memberClan = clans.find(c => c.members && c.members.some(m => m.name === agent.name));
        if (memberClan) {
            clanName = memberClan.emoji + ' ' + memberClan.name + ' [' + memberClan.tag + ']';
        }
        document.getElementById('profile-clan').textContent = clanName;
        
        if (agent.last_seen) {
            const lastSeen = new Date(agent.last_seen);
            const diff = Math.floor((now - lastSeen.getTime()) / 1000);
            let timeAgo;
            if (diff < 60) timeAgo = 'ТОЛЬКО ЧТО';
            else if (diff < 3600) timeAgo = Math.floor(diff / 60) + ' МИН. НАЗАД';
            else if (diff < 86400) timeAgo = Math.floor(diff / 3600) + ' Ч. НАЗАД';
            else if (diff < 604800) timeAgo = Math.floor(diff / 86400) + ' ДН. НАЗАД';
            else timeAgo = lastSeen.toLocaleDateString('ru-RU');
            document.getElementById('profile-last-active').textContent = timeAgo;
            document.getElementById('profile-last-seen').textContent = lastSeen.toLocaleString('ru-RU');
        } else {
            document.getElementById('profile-last-active').textContent = 'НЕТ ДАННЫХ';
            document.getElementById('profile-last-seen').textContent = 'НЕТ ДАННЫХ';
        }
        
        const achievements = getAchievements();
        document.getElementById('profile-achievements').textContent = '🏆 ' + (agent.achievements ? agent.achievements.length : 0) + '/' + achievements.length;
        
        const dmBtn = document.getElementById('profile-dm-btn');
        const addFriendBtn = document.getElementById('profile-add-friend-btn');
        const blockBtn = document.getElementById('profile-block-btn');
        
        if (agent.name === CA?.name) {
            dmBtn.style.display = 'none';
            addFriendBtn.style.display = 'none';
            blockBtn.style.display = 'none';
        } else {
            dmBtn.style.display = 'inline-block';
            addFriendBtn.style.display = 'inline-block';
            blockBtn.style.display = 'inline-block';
            dmBtn.onclick = function() { 
                closeModal('modal-agent-profile'); 
                startDM(agent.name); 
            };
            const friends = getFriends();
            const isFriend = friends.some(f => (f.agent === CA?.name && f.friend === agent.name && f.status === 'accepted') || 
                (f.agent === agent.name && f.friend === CA?.name && f.status === 'accepted'));
            if (isFriend) {
                addFriendBtn.textContent = '🤝 УДАЛИТЬ ИЗ ДРУЗЕЙ';
                addFriendBtn.style.borderColor = '#ff9100';
                addFriendBtn.style.color = '#ff9100';
                addFriendBtn.onclick = async function() {
                    const friendRecord = friends.find(f => (f.agent === CA?.name && f.friend === agent.name) || 
                        (f.agent === agent.name && f.friend === CA?.name));
                    if (friendRecord) { 
                        await removeFriend(friendRecord.id); 
                    }
                    showAgentInfo(agent.name);
                };
            } else {
                addFriendBtn.textContent = '🤝 ДОБАВИТЬ В ДРУЗЬЯ';
                addFriendBtn.style.borderColor = '#ff1744';
                addFriendBtn.style.color = '#ff1744';
                addFriendBtn.onclick = async function() { 
                    await sendFriendRequest(agent.name); 
                    showAgentInfo(agent.name); 
                };
            }
            blockBtn.onclick = async function() { 
                await blockAgent(agent.name); 
                closeModal('modal-agent-profile'); 
            };
        }
        
        let modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.className = 'modal-box';
            if (agent.active_style) {
                const styleData = shopItems.styles.find(s => s.id === agent.active_style);
                if (styleData) modalBox.classList.add(styleData.cssClass);
            }
        }
        if (agent.active_sound && agent.active_sound !== 'snd_default' && agent.active_sound !== 'snd_custom') {
            try {
                let audio = new Audio(agent.active_sound);
                audio.volume = 0.2;
                audio.play().catch(() => {});
                setTimeout(() => { audio.pause(); audio = null; }, 12000);
            } catch (e) {}
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        notif('⛔ ОШИБКА ЗАГРУЗКИ ПРОФИЛЯ');
    }
}

export async function renderAgentNetwork() {
    let list = document.getElementById('agents-list');
    if (!list) return;
    let agents = await getAgents();
    // ... (рендеринг паутины — будет в index.html)
}