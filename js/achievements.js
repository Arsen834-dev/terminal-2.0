// ============ ACHIEVEMENTS / ДОСТИЖЕНИЯ ============
import { CA, saveAgent } from './auth.js';
import { ACHIEVEMENTS } from './config.js';
import { notif } from './utils.js';
import { playSound } from './sounds.js';

export function getAchievements() { return ACHIEVEMENTS; }
export function getUnlockedAchievements() { return CA?.achievements || []; }

export function unlockAchievement(id) {
    if (!CA) return false;
    if (!CA.achievements) CA.achievements = [];
    if (CA.achievements.includes(id)) return false;
    CA.achievements.push(id);
    let a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) notif('🏆 ' + a.icon + ' ' + a.name);
    playSound('achieve');
    saveAgent();
    return true;
}

export function isAchievementUnlocked(id) { return CA?.achievements?.includes(id) || false; }

export function getAchievementProgress() {
    return { unlocked: CA?.achievements?.length || 0, total: ACHIEVEMENTS.length };
}

export function checkAchievements() {
    if (!CA) return;
    if (!CA.achievements) CA.achievements = [];
    if (!CA.achievements.includes('first_login')) unlockAchievement('first_login');
    if ((CA.guidesCreated || 0) >= 1 && !CA.achievements.includes('guide_master')) unlockAchievement('guide_master');
    if ((CA.chatCount || 0) >= 10 && !CA.achievements.includes('socializer')) unlockAchievement('socializer');
    if ((CA.crystals || 0) >= 1000 && !CA.achievements.includes('rich')) unlockAchievement('rich');
    if ((CA.rep || 0) >= 100 && !CA.achievements.includes('reputation')) unlockAchievement('reputation');
    if ((CA.clansCreated || 0) >= 1 && !CA.achievements.includes('clan_creator')) unlockAchievement('clan_creator');
}

export function renderAchievementsUI() {
    if (!CA) return;
    let list = document.getElementById('achievements-list');
    if (!list) return;
    list.innerHTML = ACHIEVEMENTS.map(a => {
        let unlocked = CA.achievements?.includes(a.id);
        return '<div class="card" style="' + (unlocked ? '' : 'opacity:0.4;') + 'padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div style="display:flex;gap:12px;align-items:center;"><span style="font-size:1.8rem;">' + a.icon + '</span>' +
            '<div><div style="font-weight:600;">' + a.name + '</div>' +
            '<div style="color:var(--text-3);font-size:0.85rem;">' + a.desc + '</div></div></div>' +
            '<div style="font-size:1.3rem;">' + (unlocked ? '✓' : '🔒') + '</div></div>';
    }).join('');
}