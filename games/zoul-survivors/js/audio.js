/* ===== 音效：WebAudio 实时合成，零音频资源 =====
 * 手感规格要求"命中音按材质分层、开火音与命中音频段错开"。
 * 这里用合成器实现：包体 0KB，离线可用，音高可随机化避免重复听感疲劳。
 */
(function (global) {
  'use strict';

  var ctx = null;
  var master = null;
  var comp = null;
  var ready = false;

  // 每帧限制同时发声数，防止密集战斗爆音 + 掉帧
  var budget = 0;
  var BUDGET_PER_FRAME = 6;

  function init() {
    if (ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;

    master = ctx.createGain();
    master.gain.value = 0.55;

    master.connect(comp);
    comp.connect(ctx.destination);
    ready = true;
  }

  // iOS 要求在用户手势中恢复 AudioContext
  function unlock() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function on() {
    return ready && global.Save && Save.setting('sfx');
  }

  function now() { return ctx.currentTime; }

  function env(gainNode, t, peak, attack, decay) {
    var g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function tone(opts) {
    var t = now() + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.f0, t);
    if (opts.f1 != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(opts.f1, 1), t + opts.dur);
    }
    var node = g;
    if (opts.lp) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(opts.lp, t);
      if (opts.lp1) f.frequency.exponentialRampToValueAtTime(Math.max(opts.lp1, 40), t + opts.dur);
      g.connect(f); f.connect(master);
    } else {
      g.connect(master);
    }
    osc.connect(g);
    env(g, t, opts.vol || 0.3, opts.atk || 0.004, opts.dur);
    osc.start(t);
    osc.stop(t + opts.dur + (opts.atk || 0.004) + 0.02);
    return node;
  }

  // 噪声缓冲复用（生成一次）
  var noiseBuf = null;
  function getNoise() {
    if (noiseBuf) return noiseBuf;
    var len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function noise(opts) {
    var t = now() + (opts.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.playbackRate.value = opts.rate || 1;

    var f = ctx.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.frequency.setValueAtTime(opts.f0, t);
    if (opts.f1 != null) f.frequency.exponentialRampToValueAtTime(Math.max(opts.f1, 40), t + opts.dur);
    f.Q.value = opts.q || 1;

    var g = ctx.createGain();
    env(g, t, opts.vol || 0.25, opts.atk || 0.002, opts.dur);

    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
    src.stop(t + opts.dur + 0.05);
  }

  function spend() {
    if (budget >= BUDGET_PER_FRAME) return false;
    budget++;
    return true;
  }

  var SFX = {
    // 主武器开火：低频顿挫 + 高频"啪"，短促
    shoot: function () {
      if (!on() || !spend()) return;
      var d = 1 + (Math.random() - 0.5) * 0.12;
      tone({ type: 'square', f0: 320 * d, f1: 90, dur: 0.055, vol: 0.16, lp: 2600, lp1: 700 });
      noise({ f0: 2600 * d, f1: 900, dur: 0.04, vol: 0.09, q: 0.9 });
    },

    // 命中：肉体（闷），与开火音频段错开
    hit: function () {
      if (!on() || !spend()) return;
      noise({ f0: 900 + Math.random() * 300, f1: 260, dur: 0.05, vol: 0.13, q: 1.4 });
    },

    // 暴击 / 弱点：金属脆响，必须与普通命中可分辨
    crit: function () {
      if (!on() || !spend()) return;
      noise({ f0: 4200, f1: 1600, dur: 0.06, vol: 0.16, q: 2.2 });
      tone({ type: 'triangle', f0: 1400, f1: 700, dur: 0.07, vol: 0.1 });
    },

    // 击杀：低频 punch，给"实感"
    kill: function () {
      if (!on() || !spend()) return;
      tone({ type: 'sine', f0: 150, f1: 55, dur: 0.13, vol: 0.2, lp: 900 });
      noise({ f0: 1200, f1: 200, dur: 0.09, vol: 0.1, q: 0.8 });
    },

    explode: function () {
      if (!on() || !spend()) return;
      noise({ filter: 'lowpass', f0: 1600, f1: 90, dur: 0.35, vol: 0.3, q: 0.6, rate: 0.7 });
      tone({ type: 'sine', f0: 110, f1: 32, dur: 0.32, vol: 0.24, lp: 500 });
    },

    pickup: function () {
      if (!on() || !spend()) return;
      tone({ type: 'sine', f0: 720 + Math.random() * 120, f1: 1300, dur: 0.05, vol: 0.07 });
    },

    hurt: function () {
      if (!on()) return;
      tone({ type: 'sawtooth', f0: 230, f1: 70, dur: 0.2, vol: 0.24, lp: 1100, lp1: 300 });
      noise({ f0: 500, f1: 140, dur: 0.16, vol: 0.14 });
    },

    levelup: function () {
      if (!on()) return;
      [0, 0.07, 0.14, 0.23].forEach(function (dl, i) {
        tone({ type: 'triangle', f0: [523, 659, 784, 1047][i], dur: 0.16, vol: 0.16, delay: dl });
      });
    },

    ui: function () {
      if (!on()) return;
      tone({ type: 'square', f0: 620, f1: 880, dur: 0.04, vol: 0.08, lp: 3000 });
    },

    boss: function () {
      if (!on()) return;
      tone({ type: 'sawtooth', f0: 90, f1: 42, dur: 1.1, vol: 0.3, lp: 420, lp1: 150 });
      noise({ filter: 'lowpass', f0: 700, f1: 80, dur: 1.0, vol: 0.18, rate: 0.5 });
    },

    win: function () {
      if (!on()) return;
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        tone({ type: 'triangle', f0: f, dur: 0.22, vol: 0.16, delay: i * 0.09 });
      });
    },

    die: function () {
      if (!on()) return;
      tone({ type: 'sawtooth', f0: 300, f1: 40, dur: 0.9, vol: 0.28, lp: 1200, lp1: 160 });
    },

    tickFrame: function () { budget = 0; },
    unlock: unlock
  };

  global.SFX = SFX;
})(window);
