const CATEGORIES = [
  { id: 'c1', name: '服饰', icon: 'https://picsum.photos/seed/cat1/120' },
  { id: 'c2', name: '美妆', icon: 'https://picsum.photos/seed/cat2/120' },
  { id: 'c3', name: '数码', icon: 'https://picsum.photos/seed/cat3/120' },
  { id: 'c4', name: '家居', icon: 'https://picsum.photos/seed/cat4/120' },
  { id: 'c5', name: '食品', icon: 'https://picsum.photos/seed/cat5/120' },
  { id: 'c6', name: '母婴', icon: 'https://picsum.photos/seed/cat6/120' },
  { id: 'c7', name: '运动', icon: 'https://picsum.photos/seed/cat7/120' },
  { id: 'c8', name: '图书', icon: 'https://picsum.photos/seed/cat8/120' }
];

const SUB_CATEGORIES = {
  c1: [{ id: 'c1-1', name: '上衣' }, { id: 'c1-2', name: '裤装' }, { id: 'c1-3', name: '鞋靴' }],
  c2: [{ id: 'c2-1', name: '面部护肤' }, { id: 'c2-2', name: '彩妆' }, { id: 'c2-3', name: '香水' }],
  c3: [{ id: 'c3-1', name: '手机' }, { id: 'c3-2', name: '耳机' }, { id: 'c3-3', name: '电脑' }],
  c4: [{ id: 'c4-1', name: '床品' }, { id: 'c4-2', name: '厨具' }, { id: 'c4-3', name: '收纳' }],
  c5: [{ id: 'c5-1', name: '零食' }, { id: 'c5-2', name: '茶饮' }, { id: 'c5-3', name: '生鲜' }],
  c6: [{ id: 'c6-1', name: '奶粉' }, { id: 'c6-2', name: '玩具' }, { id: 'c6-3', name: '童装' }],
  c7: [{ id: 'c7-1', name: '健身' }, { id: 'c7-2', name: '户外' }, { id: 'c7-3', name: '球类' }],
  c8: [{ id: 'c8-1', name: '小说' }, { id: 'c8-2', name: '童书' }, { id: 'c8-3', name: '工具书' }]
};

const NAME_DICT = {
  c1: ['纯棉宽松T恤', '休闲牛仔裤', '运动鞋', '羊毛针织衫', '亚麻直筒裤', '帆布板鞋', '连帽卫衣', '阔腿西装裤', '复古马丁靴'],
  c2: ['烟酰胺精华液', '保湿面霜', '哑光口红', '眼影盘', '香薰淡香水', '气垫BB霜', '修护面膜', '隔离防晒'],
  c3: ['智能旗舰手机', '降噪蓝牙耳机', '轻薄笔记本', '机械键盘', '电竞鼠标', '快充充电宝', '无线音箱', '智能手表'],
  c4: ['四件套纯棉床品', '不粘锅炒锅', '收纳整理箱', '羽绒被被芯', '陶瓷餐具套装', '香薰蜡烛', '北欧台灯'],
  c5: ['每日坚果礼盒', '冷萃挂耳咖啡', '海盐饼干', '冻干水果', '阿萨姆红茶', '巧克力曲奇', '燕麦能量棒'],
  c6: ['婴幼儿配方奶粉', '原木积木玩具', '纯棉婴儿连体衣', '安全座椅', '硅胶辅食碗', '儿童学步鞋'],
  c7: ['瑜伽垫', '跑步运动鞋', '骑行头盔', '哑铃套装', '篮球', '弹力带', '徒步登山包'],
  c8: ['热门科幻小说', '儿童绘本', '极简主义入门', '商业经典书系', '诗歌选集', '编程入门指南']
};

const TAGS = ['新品', '热销', '满199-30', '包邮', '7天无理由', '会员价', '限时秒杀'];

function pick(arr, i) { return arr[i % arr.length]; }

function genGoods() {
  const list = [];
  let idx = 0;
  CATEGORIES.forEach((cat) => {
    const subs = SUB_CATEGORIES[cat.id];
    const names = NAME_DICT[cat.id] || ['好物'];
    subs.forEach(sub => {
      for (let i = 0; i < 4; i++) {
        idx += 1;
        const id = 'g' + (100 + idx);
        const baseName = pick(names, idx);
        const price = (Math.floor(Math.random() * 30000) + 1000); // fen
        const original = price + Math.floor(Math.random() * 5000) + 1000;
        list.push({
          id,
          title: `${baseName} ${sub.name}款`,
          subtitle: `${cat.name} · ${sub.name}`,
          cover: `https://picsum.photos/seed/${id}/600`,
          images: [
            `https://picsum.photos/seed/${id}a/800`,
            `https://picsum.photos/seed/${id}b/800`,
            `https://picsum.photos/seed/${id}c/800`
          ],
          price,
          originalPrice: original,
          sales: Math.floor(Math.random() * 5000) + 100,
          stock: Math.floor(Math.random() * 200) + 10,
          tags: [pick(TAGS, idx), pick(TAGS, idx + 3)],
          categoryId: cat.id,
          subCategoryId: sub.id,
          rating: (4 + Math.random()).toFixed(1),
          description: `${baseName}，精选材质，匠心工艺，提供优质 ${cat.name} 体验。本商品支持 7 天无理由退换货，部分地区包邮。`,
          specs: [
            { name: '颜色', values: ['黑色', '白色', '米色'] },
            { name: '规格', values: ['标准款', '加大款'] }
          ],
          skus: buildSkus(id, price)
        });
      }
    });
  });
  return list;
}

function buildSkus(goodsId, basePrice) {
  const colors = ['黑色', '白色', '米色'];
  const sizes = ['标准款', '加大款'];
  const skus = [];
  colors.forEach((c, ci) => {
    sizes.forEach((s, si) => {
      skus.push({
        id: `${goodsId}-${ci}${si}`,
        specs: { 颜色: c, 规格: s },
        specText: `${c} / ${s}`,
        price: basePrice + si * 1000,
        stock: 30 + ci * 10
      });
    });
  });
  return skus;
}

const GOODS = genGoods();

module.exports = {
  CATEGORIES,
  SUB_CATEGORIES,
  GOODS,
  recommend: () => GOODS.slice(0, 12),
  list: ({ categoryId, subCategoryId, keyword, sort, page = 1, pageSize = 20 } = {}) => {
    let arr = GOODS.slice();
    if (categoryId) arr = arr.filter(g => g.categoryId === categoryId);
    if (subCategoryId) arr = arr.filter(g => g.subCategoryId === subCategoryId);
    if (keyword) {
      const k = String(keyword).toLowerCase();
      arr = arr.filter(g => g.title.toLowerCase().includes(k) || g.subtitle.toLowerCase().includes(k));
    }
    if (sort === 'price-asc') arr.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') arr.sort((a, b) => b.price - a.price);
    else if (sort === 'sales') arr.sort((a, b) => b.sales - a.sales);
    const start = (page - 1) * pageSize;
    return { list: arr.slice(start, start + pageSize), total: arr.length, page, pageSize };
  },
  detail: id => GOODS.find(g => g.id === id) || null
};
