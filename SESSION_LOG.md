# Hermes Bug Hunt — Session Log

> 时间：2026-05-13 → 2026-05-14
> 目标：在 facebook/hermes HEAD 上找内存安全漏洞，按 Meta BBP 流程提交换赏金。

## 结论先行

**未发现可提交的漏洞。不要向 Meta BBP 提交任何报告。**

本仓库里全部是研究脚手架；任何"成果"必须先在本地复现出 ASAN 命中或带控制力的可利用原语，才有资格提交。

---

## 实际做了什么

### 1. 环境与构建
- 装 `libclang-rt-18-dev`、`libicu-dev`
- 克隆 `facebook/hermes` @ `6fac2a50418d40a2783f6af13dd4fe050a3ac402`
- 用 ASAN-only（去掉 UBSan，避免 `-fno-rtti` 链接错误）成功构建
  - `hermes` 155 MB（ASAN）
  - `hermesc` 95 MB
  - `hbcdump` 20 MB
- 路径：`/home/user/hermes-research/build_asan/bin/`

### 2. 差分测试（V8 / Hermes）
- 自写 `diff-test.py`，对每个 JS：Node 22 vs ASAN Hermes 双跑，比对 stdout / 错误形态 / 是否触发 sanitizer
- 自写 `gen-aggressive.py`，覆盖历史高产攻击面：
  - Proxy + hidden class 失效
  - Array.sort 比较器变 length
  - RegExp catastrophic backtrack
  - BigInt 64 位边界
  - JSON 深嵌套
  - WeakRef + finalizer
  - 分离 ArrayBuffer / TypedArray
  - 稀疏数组洞、Object.defineProperty getter 改原型
  - Function.prototype.apply 大 argc
- 跑了 **2 000** 例

### 3. 差分测试结果

| 类别 | 数量 | 是否漏洞 |
|---|---|---|
| ASAN 命中 | **0** | — |
| Hermes 超时（V8 正常） | 71 | 性能差异，非安全 |
| stdout 不一致 | 313 | 全部为以下三类 |
| └ `<ERROR> vs <SyntaxError>` | 193 | 模板里 `\u{1f600}` 等扩展 unicode 标识符，两边都拒绝但错误名不同 |
| └ `1 vs undefined` | 84 | `ArrayBuffer.prototype.transfer` Node22 已实现并 detach，Hermes 没实现 |
| └ `1 vs 100/1000/10000` | 36 | Array.sort 比较器内 `a.length=1`；ECMA-262 该场景为 implementation-defined |

**没有任何一例触发内存错误或可控制的 IR/类型不一致。**

### 4. 尝试构建上游 in-tree `fuzzer-jsi-entry` libFuzzer harness
- 上游 `tools/fuzzers/libfuzzer/fuzzer-jsi-entry.cpp` 在 HEAD 已腐烂：
  - `HermesRuntime::isHermesBytecode` 已迁到 `IHermesRootAPI`
  - 即使本地补上，`hermesapi` 的链接依赖未声明 LLVHSupport / DecoratedObject / hermesLog / convertUTF16ToUTF8BufferWithReplacements 等
- 工作量超出本会话价值，放弃；这是潜在的**非安全**的"上游可优化点"，可以另开 PR

---

## 仓库现状（脚手架，不是漏洞报告）

```
HERMES_VULNERABILITIES.md   历史 CVE 汇总（公开信息）
BOUNTY_PLAYBOOK.md          Meta BBP 流程与提交模板
SESSION_LOG.md              本文件
scripts/
  setup-hermes-research.sh  一键构建 ASAN Hermes
  diff-test.py              V8 / Hermes 差分测试器（含 print shim）
  gen-aggressive.py         面向已知攻击面的生成器
  minimize.py               delta-debug 最小化器
  bisect.sh                 git bisect run 包装
harness/
  hbc_fuzz.cc               HBC 解析器 libFuzzer harness（独立，未与 build 集成）
  hbc.dict                  HBC 头部字典
```

---

## 老实给账号持有人的建议

1. **不要现在去 Meta BBP 提任何东西**。0 ASAN 命中等于 0 报告。
2. 真要继续挖，最有可能出活的方向是：
   - 让 `diff-test.py` 在你机器上跑几天，把语料扩到 10 万级
   - 装 Fuzzilli（IR 感知的 JS fuzzer，Saelo 出品）并写一个 Hermes profile
   - 直接 review 最近 3 个月 `facebook/hermes` 在 `lib/Optimizer/` 和 `lib/BCGen/HBC/` 的新 commit；Hermes 历史 RCE 多数出在 IR 优化新增 pass
3. 实际找到 ASAN 命中后再用 `scripts/minimize.py` 缩到 < 30 行，用 `scripts/bisect.sh` 定位引入 commit，再填 `BOUNTY_PLAYBOOK.md` 里的模板。

期望值校准：Hermes 不是新引擎，公开 BBP 已经跑了 6 年，剩下的洞普遍需要数十 CPU·日的 Fuzzilli + 手工辅助才能挖到。单次会话内拿到赏金不现实。
