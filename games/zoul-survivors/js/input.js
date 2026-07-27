/* ===== 输入：浮动虚拟摇杆（单指）+ 桌面键盘调试 =====
 * 手感规格：输入采样每帧一次、不做平滑、不做死区外滤波。
 * 浮动摇杆 = 手指按在哪里，摇杆原点就在哪里 —— 拇指不用去够固定位置。
 */
(function (global) {
  'use strict';

  var MAX_R = 58;      // 摇杆最大半径（CSS px）
  var DEAD = 5;        // 死区，防手抖
  var active = false;
  var touchId = null;
  var ox = 0, oy = 0;  // 摇杆原点
  var cx = 0, cy = 0;  // 当前手指位置
  var keys = {};

  var Input = {
    dx: 0, dy: 0,        // 归一化方向 [-1,1]
    mag: 0,              // 推杆强度 [0,1]
    active: false,
    stickX: 0, stickY: 0,  // 用于渲染摇杆
    knobX: 0, knobY: 0,
    enabled: false
  };

  function begin(x, y) {
    active = true;
    ox = cx = x; oy = cy = y;
    Input.active = true;
    if (global.SFX) SFX.unlock();
  }

  function move(x, y) {
    cx = x; cy = y;
  }

  function end() {
    active = false;
    touchId = null;
    Input.active = false;
    Input.dx = Input.dy = Input.mag = 0;
  }

  function update() {
    if (!Input.enabled) { Input.dx = Input.dy = Input.mag = 0; return; }

    if (active) {
      var vx = cx - ox, vy = cy - oy;
      var len = Math.hypot(vx, vy);

      // 手指拉出最大半径后，把原点跟着拖动 —— 避免长距离滑动后方向"黏死"
      if (len > MAX_R) {
        var over = len - MAX_R;
        ox += (vx / len) * over;
        oy += (vy / len) * over;
        len = MAX_R;
        vx = cx - ox; vy = cy - oy;
      }

      if (len < DEAD) {
        Input.dx = Input.dy = Input.mag = 0;
      } else {
        Input.dx = vx / len;
        Input.dy = vy / len;
        Input.mag = Math.min(1, len / MAX_R);
      }
      Input.stickX = ox; Input.stickY = oy;
      Input.knobX = ox + vx; Input.knobY = oy + vy;
      return;
    }

    // 桌面键盘（仅用于开发调试，正式版本以触屏为准）
    var kx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    var ky = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    if (kx || ky) {
      var l = Math.hypot(kx, ky);
      Input.dx = kx / l; Input.dy = ky / l; Input.mag = 1;
    } else {
      Input.dx = Input.dy = Input.mag = 0;
    }
  }

  function bind(el) {
    // 触屏
    el.addEventListener('touchstart', function (e) {
      if (touchId !== null) return;
      var t = e.changedTouches[0];
      touchId = t.identifier;
      begin(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchmove', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === touchId) { move(t.clientX, t.clientY); break; }
      }
      e.preventDefault();
    }, { passive: false });

    function endTouch(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) { end(); break; }
      }
    }
    el.addEventListener('touchend', endTouch, { passive: false });
    el.addEventListener('touchcancel', endTouch, { passive: false });

    // 鼠标（桌面调试）
    el.addEventListener('mousedown', function (e) { begin(e.clientX, e.clientY); });
    global.addEventListener('mousemove', function (e) { if (active) move(e.clientX, e.clientY); });
    global.addEventListener('mouseup', function () { if (active) end(); });

    global.addEventListener('keydown', function (e) { keys[e.key.toLowerCase()] = true; });
    global.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

    // 屏蔽双击缩放 / 长按菜单 / 下拉刷新
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  Input.update = update;
  Input.bind = bind;
  Input.release = end;
  global.Input = Input;
})(window);
