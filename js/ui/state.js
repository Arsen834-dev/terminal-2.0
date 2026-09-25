// ============================================================
// UI / STATE — единое состояние приложения
// ============================================================
// Один источник правды. Все UI-модули читают отсюда.

export const state = {
    currentView: 'feed',
    sidebarCollapsed: localStorage.getItem('syndicate_sidebar_collapsed') === 'true',
    newContentFlags: {
        chat: false,
        dm: false,
        friends: false,
        achievements: false,
        guides: false,
        memes: false,
        announce: false,
        'rp-community': false,
        rp: false
    },
    agentsListExpanded: localStorage.getItem('syndicate_agents_expanded') === 'true',
    onlineListExpanded: localStorage.getItem('syndicate_online_expanded') === 'true'
};

export function setState(patch) {
    Object.assign(state, patch);
}

export function getState() {
    return state;
}

// Прокидка в window для отладки
window.__state = state;