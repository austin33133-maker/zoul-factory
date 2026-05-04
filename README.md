# 周尔工厂 (zoul-factory) · 微信小程序商城

一个使用微信原生小程序框架（WXML/WXSS/JS）从零搭建的功能完整的商城 Demo。
**前端 only**，所有数据走本地 mock 层，并预留了无缝对接真实后端的请求封装。

## 功能清单

| 模块 | 页面 | 说明 |
|---|---|---|
| 首页 | `pages/home` | 轮播 / 8 大分类 / 推荐流 |
| 分类 | `pages/category` | 左右联动二级分类 |
| 搜索 | `pages/search` | 搜索历史 / 热搜 |
| 商品列表 | `pages/goods/list` | 综合 / 销量 / 价格排序 + 上拉加载 |
| 商品详情 | `pages/goods/detail` | 图集 / SKU 选择 / 收藏 / 加购 / 直购 |
| 购物车 | `pages/cart` | 多选 / 数量增减 / 删除 / 结算 |
| 下单 | `pages/order/confirm` | 地址选择 / 优惠券 / 运费 / 备注 |
| 支付 | `pages/pay` | 模拟微信支付（成功/失败二选） |
| 订单 | `pages/order/list` `pages/order/detail` | 5 个状态 tab / 取消 / 确认收货 |
| 地址 | `pages/address/list` `pages/address/edit` | 增删改查 / 设默认 |
| 个人中心 | `pages/user` | 信息卡 / 订单入口 / 工具区 |
| 登录 | `pages/login` | 模拟微信一键登录 |
| 优惠券 | `pages/coupon` | 券列表 |
| 收藏 | `pages/favorite` | 收藏的商品 |

## 目录结构

```
miniprogram/
├── app.{js,json,wxss}        # 入口
├── pages/                    # 16 个页面
├── components/               # 通用组件 (price/goods-card/counter/sku-popup/empty/loading)
├── api/                      # 接口封装：request / goods / cart / order / user / address
├── mock/                     # 本地 mock 数据 + 路由分发
├── store/                    # 简易状态管理 (cart / user)
├── utils/                    # storage / format / toast / auth
└── config/index.js           # USE_MOCK 开关 + baseURL + storage keys
```

## 运行

1. 用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)打开本目录
2. 启动时若无 AppID，选择"测试号"即可
3. 工具默认会在 `miniprogram/` 子目录加载小程序（已在 `project.config.json` 中配置）
4. 编译后即可使用，**无需任何后端**

## 切换到真实后端

1. 把 `miniprogram/config/index.js` 中的 `USE_MOCK` 改为 `false`
2. 修改 `BASE_URL` 为后端真实地址
3. 后端按 `miniprogram/api/*.js` 中声明的路径与字段实现接口
4. 接口应返回统一格式 `{ code: 0, data: ..., message: '' }`，错误时 `code !== 0`

页面层只调用 `api/*.js`，不直接 `wx.request`，因此**不需要修改任何页面代码**。

## 端到端核心流程验证

> 在微信开发者工具中操作，每一步对应代码路径：

1. **浏览** —— 首页选商品 (`pages/home`) 或分类入口 (`pages/category`)
2. **加购** —— 商品详情选规格加入购物车 (`pages/goods/detail` + `components/sku-popup`)
3. **结算** —— 购物车选中商品点结算 (`pages/cart`)
4. **登录拦截** —— 未登录会被路由守卫拦截到 `pages/login`
5. **下单** —— 新增地址、选优惠券、提交订单 (`pages/order/confirm`)
6. **支付** —— 模拟支付成功 (`pages/pay`)
7. **查单** —— 订单列表"待发货" tab 看到该订单 (`pages/order/list`)

杀掉小程序重进，购物车、登录态、地址列表保留（持久化于 `wx.storage`）。

## 已知局限（演示项目）

- 不接入真实微信支付与登录（无商户号 / 正式 AppID）
- 部分图标用 Emoji 占位，未配 tabBar 图标
- 未集成单测 / E2E
- 未做拼团 / 秒杀 / 直播等高级营销玩法

## 开发约定

- 货币单位统一为**分**（fen）；展示时用 `utils/format.js#fenToYuan`
- 所有需要登录的入口先调 `utils/auth.js#requireLogin()`
- 状态变更走 store 的 action（如 `cartStore.add`），订阅者自动更新
