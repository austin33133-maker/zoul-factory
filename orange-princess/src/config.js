export const CONFIG = {
  CANVAS_W: 720,
  CANVAS_H: 1280,

  COLS: 9,
  ROWS: 9,

  HUD_H: 200,           // 顶部 HUD 高度
  FOOTER_H: 220,        // 底部公主/道具区高度
  BOARD_PAD: 24,

  COLORS: [
    { id: 'orange', hex: '#ff8b3d', label: '🍊' },
    { id: 'red',    hex: '#ff5470', label: '🍓' },
    { id: 'yellow', hex: '#ffd84d', label: '🍋' },
    { id: 'green',  hex: '#7be36b', label: '🍏' },
    { id: 'blue',   hex: '#5bc6ff', label: '🫐' },
    { id: 'purple', hex: '#b06bff', label: '🍇' }
  ],

  LIFE_MAX: 5,
  LIFE_REGEN_MS: 30 * 60 * 1000, // 30 分钟回 1 生命（演示）
  COIN_INIT: 500,

  STORAGE_KEY: 'orange-princess-save:v1',
  AUDIO_ENABLED_KEY: 'orange-princess-audio'
};

export const COLOR_IDS = CONFIG.COLORS.map(c => c.id);

export function colorByIndex(i) { return CONFIG.COLORS[i % CONFIG.COLORS.length]; }
export function colorIndexById(id) { return COLOR_IDS.indexOf(id); }
