// ============ КОНФИГУРАЦИЯ ============

export const SUPABASE_URL = 'https://qblnleuunawrkyvwekvg.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFibG5sZXV1bmF3cmt5dndla3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDY3NDYsImV4cCI6MjA5NjY4Mjc0Nn0.3UaltpiiLT7pZyZVegGIUUEq5qDdKf2VOdLkCLmqr0k';

// ============ W-C26 (ОТКЛЮЧЁН) ============
export const WC26_ENABLED = false;
export const GEMINI_API_KEY = '';
export const OPENROUTER_API_KEY = '';

// Чат
export const CHAT_PAGE_SIZE = window.innerWidth > 768 ? 100 : 30;
export const ANNOUNCE_PER_PAGE = 5;

// Таймеры
export const REP_INTERVAL = 1800000;
export const TK_INTERVAL = 1800000;

// Аватарки
export const AVATAR_MAX_SIZE = 2 * 1024 * 1024;
export const AVATAR_DIMENSION = 256;
export const AVATAR_BUCKET = 'avatars';
export const COVER_BUCKET = 'avatars';

// Реакции
export const REACTION_EMOJIS = ['👍', '❤', '😂', '🔥', '💀', '😡', '🎯', '👏', '🫡', '💯', '🤝', '⚡', '💎', '🎪', '🌑'];

// Достижения
export const ACHIEVEMENTS = [
    { id: 'first_login', name: 'ПЕРВЫЙ ВХОД', desc: 'Войти в терминал', icon: '🔓' },
    { id: 'guide_master', name: 'МАСТЕР ГАЙДОВ', desc: 'Создать 1 гайд', icon: '📚' },
    { id: 'socializer', name: 'СОЦИАЛИЗАТОР', desc: '10 сообщений в чате', icon: '💬' },
    { id: 'rich', name: 'БОГАЧ', desc: 'Накопить 1000 ТК', icon: '💰' },
    { id: 'reputation', name: 'УВАЖАЕМЫЙ', desc: '100 очков репутации', icon: '⭐' },
    { id: 'clan_creator', name: 'ОСНОВАТЕЛЬ', desc: 'Создать отряд', icon: '⚔️' },
    { id: 'rp_actor', name: 'АКТЁР', desc: 'Создать РП-персонажа', icon: '🎭' },
    { id: 'blogger', name: 'БЛОГЕР', desc: 'Создать пост на стене', icon: '📝' }
];

// Эмодзи отрядов
export const CLAN_EMOJIS = ['⚔️','🛡','👑','💀','🔥','⚡','🌟','💎','🐺','🦅','🐉','🦊','🐍','🦎','🦇','👻','🤖','🎯','🏴','💣','🔱','⚜','🀄','🎲','🔮'];

// Расы для РП
export const RP_RACES = [
    { id: 'human', name: 'Человек', icon: '👤' },
    { id: 'unathi', name: 'Унатх', icon: '🦎' },
    { id: 'tajaran', name: 'Таяран', icon: '🐱' },
    { id: 'diona', name: 'Диона', icon: '🌿' },
    { id: 'vox', name: 'Вокс', icon: '🦜' },
    { id: 'slime', name: 'Слайм', icon: '🟢' },
    { id: 'vulpkanin', name: 'Вульпканин', icon: '🦊' },
    { id: 'skrell', name: 'Скрелл', icon: '🐸' },
    { id: 'ipc', name: 'Киборг', icon: '🤖' },
    { id: 'arcana', name: 'Аркан', icon: '🔮' }
];

// Тикер
export const TICKER_TEXTS = [
    "Слухи: найдена карта старой канализации в квадрате 105 планеты 436",
    "Внимание: патрули усилены в квадрате 7, обход через квадрат 12 на станции Flant-NT405",
    "Торговля: в терминале появилась партия броне-пластин",
    "Совет: не доверяйте контрактам NT без лицензии Синдиката",
    "Новости: отряд «Красные Крылья» взял под контроль насосную станцию",
    "Вакансия: требуются курьеры для доставки контрабанды в глубокие сектора",
    "Предупреждение: замечены зомби в секторах 39, 289, 546, 124, 98, 71",
    "Экономика: курс ТК к штурмовым боргам синдиката вырос на 12% за последние 4 месяца",
    "Техника: найдены рабочие терминалы довоенной эпохи, идёт восстановление",
    "Секретно: ходят слухи о заброшенной исследовательской станции в секторе 23",
    "Медицина: партия антирадиационных препаратов прибыла в терминал",
    "Безопасность: меняйте пароль каждые 30 суток",
    "Развлечения: в баре «Убежище» в секторе 193 сегодня вечером бои без правил",
    "Строительство: новый блок убежища открыт для заселения на планете 483",
    "Транспорт: космический поезд с сектора 17 до сектора 5 восстановлен на 70%",
    "Охота: за голову главаря банды «Ржавые» объявлена награда 5000 ТК",
    "Исследования: учёные Интердайн ищут образцы мутировавшей флоры",
    "Связь: связь с секторами 46 и 5 снова работает",
    "Ресурсы: залежи золота найдены в промышленной зоне сектора 61",
    "Дипломатия: Синдикат ведёт переговоры с Конфедерации магов",
    "Обучение: открыты курсы взлома терминалов для новичков",
    "Тайны: что скрывает закрытый сектор 0?",
    "Снаряжение: новые противогазы Синдиката поступили в продажу",
    "Карты: обновлена схема безопасных проходов через службу проверки NT",
    "Артефакты: найден заброшенный компьютер NT с ценной информацией",
    "Связь: Движение Фонариков желает вам удачи!"
];

// Удалённые ID предметов (включая старые шрифты)
export const REMOVED_ITEM_IDS = [
    'c_inverted', 'c_hellfire', 'c_obsidian', 'c_hexagon', 'c_emerald', 'c_ruby',
    'b_pais', 'b_mauler', 'b_gygax',
    'fnt_rune', 'fnt_gothic', 'fnt_western'
];