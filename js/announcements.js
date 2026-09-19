// ============ ACHIEVEMENTS / ДОСТИЖЕНИЯ ============
import { CA, saveAgent } from './auth.js';
import { ACHIEVEMENTS } from './config.js';
import { notif } from './utils.js';

export function getAchievements() { return ACHIEVEMENTS; }
export function getUnlockedAchievements() { return CA?.achievements || []; }

export function unlockAchievement(id) {
    if (!CA) return false;
    if (!CA.achievements) CA.achievements = [];
    if (CA.achievements.includes(id)) return false;
    CA.achievements.push(id);
    let a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) notif('🏆 ' + a.icon + ' ' + a.name);
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
    if ((CA.guidesCreated || 0) >= 1) unlockAchievement('guide_master');
    if ((CA.chatCount || 0) >= 10) unlockAchievement('socializer');
    if ((CA.crystals || 0) >= 1000) unlockAchievement('rich');
    if ((CA.rep || 0) >= 100) unlockAchievement('reputation');
    if ((CA.clansCreated || 0) >= 1) unlockAchievement('clan_creator');
}

export function renderAchievementsUI() {
    if (!CA) return;
    let list = document.getElementById('achievements-list');
    if (!list) return;
    list.innerHTML = ACHIEVEMENTS.map(a => {
        let unlocked = CA.achievements?.includes(a.id);
        return '<div class="achievement-card ' + (unlocked ? '' : 'locked') + '">' +
            '<div><span style="font-size:1.5rem;">' + a.icon + '</span> <strong>' + a.name + '</strong>' +
            '<br><small style="color:#cc0000;">' + a.desc + '</small></div>' +
            '<div>' + (unlocked ? '✓' : '🔒') + '</div></div>';
    }).join('');
}