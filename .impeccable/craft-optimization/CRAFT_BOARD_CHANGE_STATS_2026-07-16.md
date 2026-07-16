# Craft 看板变更统计 · 2026-07-16（审查中 · 未改业务 Vue）

> 用途：用户续审时的变更台账。**业务代码改动 = 0。**

## 1. 触及文件

| 文件 | 角色 | 约体积 |
|------|------|--------|
| `craft-board-hi-fi.html` | 高保真审查板（主） | ~1.3 MB |
| `EMPTY_GATE_PLAN_UNCONFIRMED_TRI_SKILL.md` | 门禁/空态/大卡定案 | ~11 KB |
| `CRAFT_BOARD_CHANGE_STATS_2026-07-16.md` | 本统计 | 本文件 |

## 2. 定案项（用户已拍板或截图否决）

| # | 定案 | 看板锚点 | 状态 |
|---|------|----------|------|
| 1 | 空态/门禁 **形态 B 钉条**（≤48px · 唯一 CTA） | `#north-star` | 定案 |
| 2 | 否决 **大插画 Empty** / 全宽黄粉 Alert | `#north-star` · `#component-vision` | 定案 |
| 3 | 档案袋身份 **单行 Scope**（本人/代办 Tag + 回本人） | `#proxy-interaction` · `#component-vision` | 定案 |
| 4 | 否决并 **移除** 粉红「未选择目标教师」大卡、「代办办理中」标题行动卡 | `#proxy-interaction` | 定案（看板） |
| 5 | 门禁真源：质量 = `QualityScopeChrome`；档案袋 = `PortfolioScopeHeader` | 决策表 | 定案 |
| 6 | 业务门禁不放宽（未确认方案不可正式达成度/报告） | EMPTY_GATE | 定案 |
| 7 | AI 四助手 IA | `#assistants` | **SHIP · 用户确认**（本人办理 + 代办/未选） |

## 3. 看板 mock 改动计数（约）

| 类型 | 数量/说明 |
|------|-----------|
| 新增/强化 B 钉条 mock | gate-row ×8 处量级 |
| 轻占位 empty-lite | ×8 |
| 否决角标 / SHIP 角标 | veto + ok-badge |
| `.gate` 样式 | 标「否决大卡」角标，仅反例 |
| Portfolio 远景六格 state-contract | 已从推荐远景移除 |
| 决策表新增「否决并移除大卡」行 | 1 |
| 审查清单新增勾选项 | 钉条 + 代办禁大卡 + 页大 Empty 待批 |
| section 开闭 | 23 / 23 平衡 |

## 4. 文档同步

| 文档章节 | 内容 |
|----------|------|
| EMPTY_GATE §9–10 | B 钉条定案勾选 |
| EMPTY_GATE §11 | 档案袋大卡截图否决 + 待清页线索 |
| 本文件 | 统计 + AI 助手 HOLD |

## 5. 业务 Vue（明确 0 改动）

- **未**改 `edu-practice-mark-vue/src/**`
- **未**删组件、**未** regen `components.d.ts`
- 待批清退线索（仅记录）：  
  - quality：achievement / dashboard / report 大 Empty  
  - portfolio：`ai-four-assistants`、`teacher-portrait`、`correction`、`archive-category-edit`、`teacher-evaluation` 等未选教师大 Empty/双写

## 6. 续审队列（用户进行中）

- [x] 空态 B 钉条 / 否决大插画  
- [x] 代办壳禁大卡  
- [x] **AI 四助手 IA** — 用户确认两 mock SHIP（本人办理 + 代办/未选）  
- [ ] 其它组件远景逐页审查  
- [ ] 批准后再改业务码  

## 7. 打开入口

- 总板：`edu-practice-mark-vue/.impeccable/craft-optimization/craft-board-hi-fi.html`
- 空态：`#north-star`
- 代办：`#proxy-interaction`
- AI 助手 HOLD：`#assistants`
- 审查勾选：`#review-confirm`

## 8. AI 四助手重画说明（2026-07-16 晚）

- **否决**：左任务轨 + 中编辑器 + 右历史（IDE/邮件隐喻）。
- **推荐 mock**：保留「理念/总结/画像/材料」四 Tab；单栏草稿；顶条状态+唯一主 CTA；底栏版本 chips；未选/代办与全局 B 钉条同构。
- **状态**：**SHIP（用户确认）**；业务 Vue 仍 0 改动，落地另批。

## 9. AI 四助手用户确认（2026-07-16）

| mock | 结论 |
|------|------|
| 重画 · 本人办理 | **确认 SHIP** |
| 重画 · 管理员代办 / 未选 | **确认 SHIP** |
| IDE 三栏 | 仍否决 |
| 业务改码 | 未批；确认的是看板远景 |
