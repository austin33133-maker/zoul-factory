/* ===== 变现层：广告 / 内购的统一接口 =====
 *
 * 现在跑的是"模拟实现"（3 秒假广告），游戏逻辑已经把三个激励视频位接好了。
 * 上架时只需要把 ADAPTERS.stub 换成 ADAPTERS.admob（Capacitor 套壳后）——
 * 游戏代码一行都不用改。
 *
 * 三个激励视频位（按收益价值排序）：
 *   revive  — 死亡复活。转化率最高，玩家动机最强。
 *   double  — 结算金币翻倍。低打扰，几乎人人点。
 *   reroll  — 升级三选一刷新。频次高，但要限次，否则破坏构筑赌博感。
 */
(function (global) {
  'use strict';

  var LIMITS = {
    revive: 1,   // 每局 1 次（第 2 次以后不再提供，避免无限续命毁掉难度）
    double: 1,   // 每局 1 次
    reroll: 3    // 每局 3 次
  };

  var used = { revive: 0, double: 0, reroll: 0 };

  /* ---------- 适配器：模拟实现 ---------- */
  var stub = {
    name: 'stub',
    isReady: function () { return true; },
    showRewarded: function (placement, onReward, onSkip) {
      var el = document.getElementById('adOverlay');
      var cnt = document.getElementById('adCount');
      var left = 3;
      el.classList.remove('hidden');
      cnt.textContent = left;
      var timer = setInterval(function () {
        left--;
        cnt.textContent = Math.max(left, 0);
        if (left <= 0) {
          clearInterval(timer);
          el.classList.add('hidden');
          onReward && onReward();
        }
      }, 1000);
    }
  };

  /* ---------- 适配器：AdMob（Capacitor 套壳后启用） ----------
   * npm i @capacitor-community/admob
   * 依赖全局 AdMob 对象；未安装时自动回退到 stub。
   */
  var admob = {
    name: 'admob',
    _loaded: false,
    _unitId: {
      // 上架前替换为真实广告位 ID
      android: 'ca-app-pub-XXXXXXXX/XXXXXXXX',
      ios: 'ca-app-pub-XXXXXXXX/XXXXXXXX'
    },
    isReady: function () { return this._loaded; },
    preload: function () {
      var self = this;
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      global.AdMob.prepareRewardVideoAd({
        adId: isIOS ? this._unitId.ios : this._unitId.android
      }).then(function () { self._loaded = true; })
        .catch(function () { self._loaded = false; });
    },
    showRewarded: function (placement, onReward, onSkip) {
      var self = this;
      global.AdMob.showRewardVideoAd()
        .then(function (r) {
          self._loaded = false;
          self.preload();
          if (r && r.type) onReward(); else onSkip && onSkip();
        })
        .catch(function () { onSkip && onSkip(); });
    }
  };

  var adapter = (global.AdMob && global.Capacitor) ? admob : stub;
  if (adapter === admob) adapter.preload();

  global.Monetize = {
    adapterName: adapter.name,

    resetRun: function () { used = { revive: 0, double: 0, reroll: 0 }; },

    left: function (placement) {
      return Math.max(0, LIMITS[placement] - used[placement]);
    },

    /** 该广告位当前是否可用（次数没用完、已购去广告的玩家直接给奖励） */
    canShow: function (placement) {
      return this.left(placement) > 0;
    },

    /**
     * 播放激励视频并发放奖励。
     * 已购买"去广告"的玩家跳过播放直接拿奖励——这是内购的核心价值，
     * 不能让付费玩家反而少拿东西。
     */
    reward: function (placement, onReward, onSkip) {
      if (!this.canShow(placement)) { onSkip && onSkip(); return; }
      used[placement]++;

      if (Save.data.noAds) { onReward(); return; }
      if (!adapter.isReady()) { onReward(); return; } // 广告没加载出来也给奖励，绝不惩罚玩家

      adapter.showRewarded(placement, onReward, onSkip);
    },

    /* ---------- 内购（占位，接 RevenueCat / 平台内购） ---------- */
    IAP: {
      products: [
        { id: 'no_ads',      price: '¥12', title: '去广告', desc: '所有激励奖励直接领取，无需观看' },
        { id: 'starter',     price: '¥18', title: '新手礼包', desc: '2000 金币 + 永久攻击 +10%' },
        { id: 'gold_small',  price: '¥6',  title: '金币小包', desc: '1200 金币' },
        { id: 'gold_large',  price: '¥30', title: '金币大包', desc: '8000 金币' }
      ],
      buy: function (id, onDone) {
        // TODO: 接入平台内购。现在只做本地生效，方便调试奖励逻辑。
        if (id === 'no_ads') { Save.data.noAds = true; Save.save(); }
        if (id === 'gold_small') Save.addGold(1200);
        if (id === 'gold_large') Save.addGold(8000);
        if (id === 'starter') Save.addGold(2000);
        onDone && onDone(true);
      }
    }
  };
})(window);
