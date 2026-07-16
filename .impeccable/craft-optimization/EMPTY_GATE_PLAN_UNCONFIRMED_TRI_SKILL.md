# 门禁空态「尚未确认培养方案」三 Skill 审查

> 素材：`docs/plans/微信图片_20260715162500_231_219.jpg`  
> 现象：主内容区居中大插画 + 标题 + 说明 + 主按钮，笔记本可视高度被空态吃掉大半。  
> 纪律：**只审建议，未改业务代码**。  
> Skills：Impeccable · Finesse · Taste audit-only · 门禁 frontend-design-mark  

## Design Read

Reading this as: **OBE quality workbench gate (regulated HE)** — user already in 质量评价 · 达成度结果，blocked by training-plan confirmation; needs **one clear next action** with **minimal vertical cost** on 13–14" laptop, not a marketing empty-state hero.

## 1. 截图形态拆解

| 层级 | 截图表现 | 问题 |
|------|----------|------|
| 插画 | 居中大灰插画（类 Ant Empty 默认图） | 占高 ~180–240px，零信息增益 |
| 标题 | 「尚未确认培养方案」 | 必要，但字号/间距偏展示级 |
| 说明 | 「确认后可查看达成度结果」 | 与标题重复一半语义 |
| CTA | 「确认培养方案」 | 正确主动作，但被挤到视口中下 |
| 上下文 | 侧栏/顶栏/范围条之上仍有空间 | **门禁信息与 Scope 重复**，主区再画一整页 |

## 2. 现网代码对照（手读）

| 位置 | 现状 | 与截图关系 |
|------|------|------------|
| `QualityScopeChrome.vue` | 未确认时：`UiTag` 状态 + **「去确认方案」** sm 按钮 | **已是正确紧凑门禁**（craft 结论：禁全宽黄 Alert） |
| `achievement.vue` / `dashboard.vue` / `report.vue` | `UiEmpty`「请选择培养方案」仅覆盖 **未选方案** | 未选与未确认可能不同；若业务仍用大图 Empty 挡未确认，会与 Scope 双写 |
| `ui-guide/ui/Empty.vue` | 默认 `showIcon=false`、`size=sm`、padding 12–20 | **原语已克制**；浪费来自 **调用方式 + 外层 margin/居中撑满** |
| `quality-plan-guard.ts` | 文案：方案未确认则达成度/报告不可开放 | 业务门禁正确，不必为了省空间弱化规则 |

结论：**问题不是「要不要门禁」，而是门禁的视觉层级与占高。** 真源应在 Scope；主区只做薄残留/骨架，禁止第二套全屏 Empty 英雄区。

## 3. 三 Skill 判定

### Impeccable（状态 · 层级 · CTA）

| 项 | 判定 | 说明 |
|----|------|------|
| 门禁语义 | **OK** | 未确认不得看正式达成度，对认证链路正确 |
| 信息重复 | **REWORK** | Scope 已能表达「未确认 + 去确认」时，主区再大 Empty = 双重说明 |
| CTA 唯一 | **TUNE→目标 OK** | 主动作应只有一个：「去确认方案」；侧栏点入已被 guard 时同文案 |
| 空/错/权 | **TUNE** | 未选方案 vs 未确认方案 应两态区分，勿混成同一大图 |
| 可达性 | **OK** | 有明确按钮；插画应 `aria-hidden` 或不渲染 |

**Impeccable 处方**  
1. **门禁真源唯一**：`QualityScopeChrome`（Tag + sm CTA）。  
2. 主区若仍阻塞：用 **紧凑 `UiEmpty` sm / 或 `WorkflowPrerequisiteEmpty` 无大图**，title 一句 + 可选一行说明 + 同一 CTA。  
3. 禁止：全宽黄 Alert、粉横幅、Ant 默认大插画居中英雄区。

### Finesse（密度 · 可完成 · 笔记本）

| 项 | 判定 | 说明 |
|----|------|------|
| 垂直浪费 | **REWORK** | 14" 有效高度约 700–800px；大 Empty 可吞 40–60% 主列 |
| 完成路径 | **TUNE** | CTA 正确但位置偏下，视线路径长 |
| 壳层 | **TUNE** | StageWorkbench 仍可保留 ContextBar；主区不要再「垂直居中整屏」 |
| 与 Scope 叠高 | **REWORK** | Scope 行 ~40px 已足够；主区再 +200px 空态 = 密度失败 |

**Finesse 处方（目标占高）**

| 方案 | 主区占高 | 适用 |
|------|----------|------|
| **A. Scope-only（推荐）** | 0 | 已选方案但未确认：主区不画 Empty，只 Scope 高亮 + 禁用表内写操作 |
| **B. 紧凑条** | 40–48px | 主区顶一条 `inline gate`：文案 + 「去确认方案」 |
| **C. 紧凑 Empty sm** | ≤96px | 无插画、padding 12、title+CTA；禁止 md + 默认图 |
| ~~D. 截图现状~~ | ≥240px | **否决** |

笔记本目标：**门禁总垂直占用 ≤ 48px（Scope 内）或 ≤ 96px（主区薄条）**，其余高度留给表格/筛选骨架（可 disabled/半透明），避免「整页空白」。

### Taste（audit-only · 反 slop）

| 项 | 判定 | 说明 |
|----|------|------|
| 大插画 Empty | **驳回** | LLM/Ant 默认「空箱图」= 廉价 SaaS 空态，非 HE 工作台 |
| 居中英雄文案 | **驳回** | 像 onboarding landing，不像 OBE 办理 |
| 双 CTA / 装饰 | **驳回** | 不要「了解更多」「返回首页」抢主动作 |
| 品牌 | **保持** | CTA 用 `#1677ff` / UiButton；浅色；无暗色空态剧场 |

**Taste 处方**：信任优先、短句、单 CTA、无插画；视觉重量压在 **范围条状态 Tag**，不是主区插画。

## 4. 目标形态（远景 · 非改码）

### 形态 A — Scope 内门禁（首选）

```
[专业▾] [培养方案▾] [学年▾] [学期▾]  [方案码·名称] [待确认 Tag]  [去确认方案 ▸]
────────────────────────────────────────────────────────────────
筛选条（disabled 或只读）
表格骨架 / 半透明表头 + 一行说明：「方案确认后加载达成度结果」
```

- 主区 **无** 大 Empty  
- 表可 `pointer-events: none` + opacity，或只渲染列头  
- 单一 CTA 在 Scope 最右

### 形态 B — 主区顶条（Scope 不可见或跨页一致性）

```
┌─────────────────────────────────────────────────────────────┐
│ 方案待确认 · 确认后开放达成度计算与正式结果    [去确认方案] │  ← 40px
└─────────────────────────────────────────────────────────────┘
（下方同 A：骨架表，非大图）
```

### 文案收敛

| 角色 | 文案 | 禁 |
|------|------|-----|
| Tag | `待确认` / 枚举标签 | 长句 |
| Scope CTA | `去确认方案` | 「确认培养方案」过长可保留但 sm |
| 主区一行（若需要） | `确认方案后开放达成度结果` | 「尚未确认…」+「确认后可…」双段重复 |
| 未选方案 | `请选择培养方案` + `去培养方案工作台` | 与未确认混用同一大图 |

## 5. 页面级建议（质量域）

| 页面 | 建议 |
|------|------|
| 达成度结果 `achievement` | 未确认：优先 A；勿再 `margin-top:32px` 居中大空 |
| 质量看板 `dashboard` | 同上；看板更忌大 Empty（指标位应骨架） |
| 质量报告 `report` | 同上 |
| 侧栏点击 | 保持 guard + message 短句，**不要**再跳进页后画大 Empty 第二层 |

统一门控文案真源：`quality-plan-guard.ts`（可再收一句短标签给 Scope）。

## 6. 评分（截图形态）

| 维度 | 分 (0–10) | 说明 |
|------|----------:|------|
| Impeccable 状态清晰 | 7 | 语义对，层级重复扣分 |
| Impeccable CTA | 6 | 有按钮，位置差 |
| Finesse 密度 | **2** | 笔记本主列浪费严重 |
| Finesse 可完成 | 5 | 能点，但路径长 |
| Taste 反 slop | **3** | 大插画居中 = 模板空态 |
| 与 Scope 一致性 | 4 | 与已存在紧凑 Scope 门禁打架 |
| **综合** | **4/10** | 业务对、形态错 |

## 7. 实施优先级（待你批准再改码）

| 优先级 | 动作 | 风险 |
|--------|------|------|
| **P0** | 约定：未确认 **禁止** Ant 默认大图 Empty；主区改 A 或 B | 低 |
| **P0** | 盘点 quality 各页 `UiEmpty`/`a-empty` 门控用法，未确认与未选方案拆态 | 低 |
| **P1** | `achievement__empty` 去掉大 margin 居中撑满；统一 sm | 低 |
| **P1** | Scope 未确认 Tag 高对比（已有 tone）+ CTA 固定最右 | 低 |
| **P2** | 可选：主区保留 1 行 disabled 表头示意「确认后有数」 | 中（勿造假数据） |

## 8. 明确否决

- 全宽黄/粉 Alert 再占一行  
- 暗色空态、插画升级、Lottie  
- 为省空间 **放开** 未确认即可算达成度（业务红线）  
- 页内再写一遍「为何要确认」长说明  

## 9. 审查勾选

- [x] 同意门禁真源在 QualityScopeChrome  
- [x] 同意主区形态 **B（≤48px 钉条）**（A 为可选降级）  
- [x] 同意否决截图式大插画 Empty  
- [ ] 批准后再改 quality 各页（本文件不触发改码）  

## 10. 用户定案（2026-07-16）· 只改看板、未改业务码

| 项 | 定案 |
|----|------|
| 形态 | **B 钉条**（主区顶 ≤48px：Tag + 一句 + 唯一 CTA「去确认方案」） |
| 否决 | Ant 默认大插画 Empty、全宽黄/粉 Alert、六格 state-contract 当 UI、假 KPI |
| Scope | 挂「待确认」状态；现网已有 sm CTA 时钉条不得第二按钮（或降 A） |
| 档案袋身份 | 单行 Scope：本人 / 代办 + 回本人；禁止第二组身份 KPI |
| 看板 | `craft-board-hi-fi.html#north-star` · `#component-vision` 已重画对比 mock |
| 改码 | **未批准** — achievement / dashboard / report 大 Empty 调用待批 |

### 三 Skill 一句话（定案后）

| Skill | 结论 |
|-------|------|
| Impeccable | 门禁语义 OK；展示层 REWORK→B；唯一 CTA |
| Finesse | 大 Empty 密度失败→钉条 ≤48px |
| Taste audit-only | 驳回大插画居中英雄；保持 #1677ff 浅色 |

### 竞品 / SaaS 吸收

- Dense admin / 表内前置条件：inline / compact empty，非 first-use 大插画。  
- Ghost / 结构预览优于 centered illustration。  
- 教育 SaaS：代办进入/退出可见 + 审计；空活动区不堆营销插画。

## 11. 档案袋大卡门禁（用户 2026-07-16 截图否决）

截图：`#proxy-interaction`「管理员 · 远景代办壳」红框内仍出现：

1. **「代办办理中」标题行动大卡**（说明 + 协助采集/整理材料）
2. **粉红「未选择目标教师」大卡**（说明 + 选择教师）

### 定案

| 项 | 结论 |
|----|------|
| 形态 | **移除**上述大卡；只保留 Scope **Tag**（本人/代办）+ **回本人**；未选时 **B 钉条** 唯一 CTA「选择教师」 |
| 禁止 | 页内再叠第二套大 Empty / 全宽 Alert 解释选人 |
| 组件 | 不是单独死组件名，而是 **大卡片门禁模式**（craft `.gate` + 页内英雄 Empty/Alert 双写）。远景中标注 **REMOVE**；业务页清退待批 |
| 改码 | **未批** — 先审看板；批后再改 `PortfolioScopeHeader` + portfolio 各页未选 Empty |

### 待清退引用线索（手扫，非脚本删）

- `ai-four-assistants.vue`：`title="尚未选择教师"` 大 Empty  
- `teacher-portrait.vue` / `correction.vue` / `archive-category-edit.vue` / `teacher-evaluation.vue` 等：`请从…选择目标教师` UiEmpty  
- 看板旧推荐：`代办办理中` mock-title + `.gate` 粉卡 → **已改 B 钉条**

## 12. AI 四助手 IA 定案（2026-07-16 用户确认）

| mock | 结论 |
|------|------|
| 本人办理 | **SHIP** — 四 Tab + 单栏草稿 + 版本 chips +「确认写入档案」 |
| 管理员代办 / 未选 | **SHIP** — 代办 Tag +「提交教师确认」；未选 B 钉条「选择教师」 |
| IDE 三栏任务轨 | **否决** |

业务 Vue 落地另批；与档案袋大卡/空态 B 钉条同构。
