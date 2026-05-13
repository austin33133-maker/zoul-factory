# Hermes 漏洞汇总与补丁对照

> 整理日期：2026-05-13
> 范围：所有公开命名为 "Hermes" 的活跃项目（JS 引擎 / 文档系统 / 邮件网关 / R 包 / AI Agent 等）

---

## 1. Facebook / Meta — Hermes JavaScript 引擎（React Native）

仓库：https://github.com/facebook/hermes

| CVE | 类型 | 受影响版本 | 修复版本 / 补丁 |
|---|---|---|---|
| CVE-2020-1896 | `Function.prototype.apply` 内栈溢出，可任意代码执行 | < 2020-08-04 提交前 | 2020-08-04 提交后的版本（Facebook 安全公告） |
| CVE-2020-1911 | 原型链解析中的类型混淆 | < 2020-08-04 | 同上 |
| CVE-2020-1912 | npm 包 `hermes-engine` 中的越界读 | < 0.5.0 | hermes-engine 0.5.0+ |
| CVE-2020-1915 | JS Interpreter 越界读，DoS / 内存破坏 | <= 2020-09 | 后续提交修复 |
| CVE-2021-24044 | hermes-engine DoS | 受影响 npm 包版本 | 升级到修复版本 |
| CVE-2022-40138 | 字节码生成阶段整数转换错误，可越界 / 任意代码执行 | <= 0.12.0 | 0.13.0 及其后 |
| CVE-2023-30470 | 字节码生成器在启用优化时存在 UAF，可 RCE（仅在执行不可信 JS 时） | <= 提交 49d1ee1 之前 | 上游提交 49d1ee1 / React Native 0.72+ |
| GHSA-mc36-3fhx-66vv | 整数溢出导致 write-what-where，可任意代码执行 | 历史版本 | 已合入主线 |

**注意**：CVE-2023-30470 等仅在 Hermes 用于执行不可信 JS 时可利用；React Native 应用通常只跑随包打入的字节码，因此默认不暴露此面。

---

## 2. HashiCorp — Hermes（文档协作平台）

仓库：https://github.com/hashicorp-forge/hermes

| CVE | 类型 | 受影响版本 | 修复版本 / 补丁 |
|---|---|---|---|
| **CVE-2025-1293**（HCSEC-2025-03） | AWS ALB 认证模式下 JWT 校验不严，可绕过认证（CVSS 8.2 High） | <= 0.4.0 | **0.5.0** |

**补丁要点**：

- 现在会校验 ALB 返回 JWT 头部中的 `signer` 字段
- 必须在 Hermes 配置文件中显式声明可信签发者，或通过环境变量 `HERMES_SERVER_OKTA_JWT_SIGNER` 提供
- 升级路径：直接升级到 0.5.0+ 并设置 signer

---

## 3. NousResearch — hermes-agent（AI Agent 框架）

仓库：https://github.com/NousResearch/hermes-agent

| CVE | 类型 | 受影响版本 | 修复版本 / 补丁 |
|---|---|---|---|
| **CVE-2026-7112** | `gateway/platforms/api_server.py` 的 `_check_auth` 中存在认证缺陷（CWE-287，Moderate） | 0.8.0 | 厂商尚未发布修复（PR 已提交但未合并） |
| **CVE-2026-7397** | `file_tools.py` 的 `_check_sensitive_path` 存在 symlink 绕过 | 0.8.0+ | 截至撰写时未修复 |

**当前状态**：两个 CVE 均处于 "已上报、未修复" 阶段，建议自行打补丁或暂停 expose API server 到互联网。

---

## 4. insightsengineering / hermes（R 包，Roche 出品）

仓库：https://github.com/insightsengineering/hermes

- 截至 2026-05 无公开 CVE
- 走 Roche 协调披露流程

---

## 5. deeztek / Hermes Secure Email Gateway（SEG）

仓库：https://github.com/deeztek/Hermes-Secure-Email-Gateway
官网：https://www.hermesseg.io/

- 自身无公开命名的 Hermes-SEG CVE
- 因为是 Ubuntu + Postfix/Amavis/SpamAssassin 集成发行版，实际风险跟随上游组件（Postfix、ClamAV、Dovecot 等）
- 漏洞跟踪应跟随上游组件的 CVE

---

## 6. 其它同名物（仅作消歧）

| 名字 | 说明 |
|---|---|
| Hermes Ransomware | 2017 年起出现的勒索软件家族，与 Lazarus 关联，**不是软件漏洞** |
| Project Hermes（Apple Private Relay 等内部代号） | 非开源项目 |
| HERMES（IBM 工作流） | CVE-2026-22798 信息泄露 |

---

## 与 Hermes 各官方团队的沟通渠道

### A. Meta / Facebook Hermes（JS 引擎）

| 用途 | 渠道 |
|---|---|
| 漏洞报告（强烈推荐） | Meta Bug Bounty：https://www.facebook.com/whitehat/ — 选 "Hermes / React Native" |
| 安全联系邮箱 | security@fb.com（备用，BBP 优先） |
| GitHub 私下报告 | https://github.com/facebook/hermes/security/advisories/new |
| 一般技术讨论 | GitHub Issues：https://github.com/facebook/hermes/issues（**勿在此提未公开漏洞**） |
| Discord / 社区 | React Native Community Discord |

**披露规范**：Meta BBP 走 90 天协调披露，提交时附最小可复现样例（PoC JS / HBC 字节码）+ 受影响版本号 + 触发崩溃栈即可。

### B. HashiCorp Hermes

| 用途 | 渠道 |
|---|---|
| 漏洞报告 | security@hashicorp.com（PGP 见 https://www.hashicorp.com/security） |
| 私下 GitHub Advisory | https://github.com/hashicorp-forge/hermes/security/advisories/new |
| 一般 Issue | https://github.com/hashicorp-forge/hermes/issues |
| 公开公告 | https://discuss.hashicorp.com/c/security/52 |

**披露规范**：HashiCorp 会分配 HCSEC-YYYY-NN 编号，请在提交时注明影响 Hermes 0.x 版本范围、复现步骤、是否需要 ALB / Okta / Google 任一认证模式。

### C. NousResearch hermes-agent

| 用途 | 渠道 |
|---|---|
| 私下 GitHub Advisory（推荐） | https://github.com/NousResearch/hermes-agent/security/advisories/new |
| GitHub Issue（非敏感） | https://github.com/NousResearch/hermes-agent/issues |
| 联系 Nous Research | contact@nousresearch.com / X (Twitter) @NousResearch |

**披露规范**：项目较新，没有正式 PSIRT；走 GitHub 私有 Advisory + 邮件双通道更稳，CVE-2026-7112 / 7397 即是这种走法。

### D. insightsengineering / hermes（Roche）

| 用途 | 渠道 |
|---|---|
| 漏洞专用邮箱 | vulnerability.management@roche.com |
| GitHub Advisory | https://github.com/insightsengineering/hermes/security/advisories/new |

### E. Hermes Secure Email Gateway

| 用途 | 渠道 |
|---|---|
| 邮件 | 见 hermesseg.io 网站底部 "Contact" |
| GitHub Issue | https://github.com/deeztek/Hermes-Secure-Email-Gateway/issues |

---

## 推荐的统一报送模板

```
Subject: [Security] <Project Name> <版本> — <漏洞类型概述>

Affected component : <文件 / 模块 / 函数>
Affected versions  : <git rev / tag 范围>
Severity (self)    : <CVSS v3.1 vector + score>
PoC                : <最小可复现样例 / 输入>
Impact             : <RCE / Auth Bypass / DoS / Info Leak ...>
Suggested fix      : <补丁 patch 或思路>
Disclosure timeline: 计划 90 天协调披露，发现日期 <YYYY-MM-DD>
Reporter           : <name / email / handle>
PGP                : <若需要，附公钥指纹>
```

---

## 参考来源

- [CVE-2020-1915 — GHSA-x4cf-6jr3-3qvp](https://github.com/advisories/GHSA-x4cf-6jr3-3qvp)
- [CVE-2020-1911 — GHSA-f5x2-xv93-4p23](https://github.com/advisories/GHSA-f5x2-xv93-4p23)
- [CVE-2020-1896 — Facebook 安全公告](https://www.facebook.com/security/advisories/cve-2020-1896)
- [CVE-2020-1912 hermes-engine](https://www.acunetix.com/vulnerabilities/sca/cve-2020-1912-vulnerability-in-npm-package-hermes-engine/)
- [CVE-2021-24044 hermes-engine — Snyk](https://security.snyk.io/vuln/SNYK-JS-HERMESENGINE-2342071)
- [CVE-2022-40138 — cve.news](https://www.cve.news/cve-2022-40138/)
- [CVE-2023-30470 — Snyk](https://security.snyk.io/vuln/SNYK-UNMANAGED-FACEBOOKHERMES-5563738)
- [CVE-2025-1293 — GHSA-vxm9-8mfw-vc6g](https://github.com/advisories/GHSA-vxm9-8mfw-vc6g)
- [HCSEC-2025-03 — HashiCorp Discuss](https://discuss.hashicorp.com/t/hcsec-2025-03-hashicorp-hermes-improperly-validates-aws-alb-jwts-which-may-lead-to-authentication-bypass/73371)
- [CVE-2026-7112 — GHSA-r7hr-pvjh-r4p3](https://github.com/advisories/GHSA-r7hr-pvjh-r4p3)
- [CVE-2026-7397 — vuldb](https://vuldb.com/vuln/360121)
- [insightsengineering/hermes Security](https://github.com/insightsengineering/hermes/security)
