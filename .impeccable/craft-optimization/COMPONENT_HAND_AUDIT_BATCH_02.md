# 组件手审账 · Batch 02（范围壳 / 工作台原语）

> 逐文件 Read · Impeccable product · Finesse product · Taste audit-only · frontend-design-mark  
> 禁脚本生成结论 · 2026-07-16

## 9. `PortfolioScopeHeader.vue`

| 项 | 事实 |
|----|------|
| 行数 | ~336 |
| 职责注释 | 写入 portfolioStore 并同步 URL query |
| 能力 | 工作壳 segmented；`canPickTeachers`→a-select；否则 UiTag 本人 |
| 缺口 | 选人后无「代办」标、无「回本人」；管理员空选时无全局写门禁 |

**Impeccable：** 本人锁定与 URL 打回正确；代办态状态不完整（缺显性身份）。  
**Finesse：** 单行范围条密度好；未选教师时下游页仍可能拉数——操作流未闭合。  
**Taste：** 无大黄条，好；勿再加说明卡。  

**判定：REWORK（代办显性）**  
**动作：** 代办标 + 回本人 + 未选时阻断写路径；页面去重复「请选择教师」。  
**禁：** 黄条说明书、第二组 KPI。

---

## 10. `PortfolioLayoutContext.vue`

| 项 | 事实 |
|----|------|
| 行数 | 29 |
| 实现 | `isPortfolioRoute` 时渲染 PortfolioScopeHeader |
| 样式 | container 底 + secondary 底边 |

**Impeccable：** 唯一挂载点正确。  
**Finesse：** 薄但有边界（域可见性）——允许保留。  
**Taste：** OK。  

**判定：OK**  
**动作：** 保持单行；禁止扩成 KPI/身份卡。  
**禁：** 黄提示带、重复标题。

---

## 11. `QualityScopeChrome.vue`

| 项 | 事实 |
|----|------|
| 已读 | 全文件（约 300 行） |
| 行为 | Program/Plan/Period/Course；未确认时 UiTag +「去确认方案」小号按钮 |
| 门禁 | `needsPlanConfirmation` → `goConfirmPlan` |

**Impeccable：** 紧凑门禁形态正确（优于全宽 Alert）。  
**Finesse：** 操作可完成；须保证下游页不叠第二大框。  
**Taste：** 无大框。  

**判定：OK（形态） / TUNE（调用方纪律）**  
**动作：** 下游达成页只用空态，禁止再 Alert。  
**禁：** 教师代办条、OBE 长说明。

---

## 12. `ContextBar.vue`

| 项 | 事实 |
|----|------|
| 注释 | 禁止功能罗列说明；subtitle 仅动态范围 |
| Slots | status / info / toolbar / actions |
| layout | stack \| workbench |

**Impeccable：** 合同自述清晰。  
**Finesse：** workbench 横向适合高密度。  
**Taste：** 调用方常堆按钮——债在调用方。  

**判定：OK（原语） / TUNE（调用纪律）**  
**动作：** 审查高频调用页，限制 1 主动作 + ≤2 次动作。  
**禁：** 身份/阶段/KPI 堆进 ContextBar。

---

## 13. `SignalBand.vue`

| 项 | 事实 |
|----|------|
| variant | inline \| panel \| tiles |
| tiles | 彩点 `signal-band__dot` |
| 默认 | panel |

**Impeccable：** clickable 下钻正确。  
**Finesse：** panel 适合工作台；tiles 易变装饰 KPI。  
**Taste：** tiles 彩点阵列命中 anti-slop。  

**判定：TUNE**  
**动作：** 产品默认强制 panel；tiles 仅允许已确认概览且指标均可下钻。  
**禁：** 无 click 的装饰 tiles；粗侧条。

---

## Batch 02 汇总

| 组件 | 判定 |
|------|------|
| PortfolioScopeHeader | REWORK |
| PortfolioLayoutContext | OK |
| QualityScopeChrome | OK + 调用纪律 TUNE |
| ContextBar | OK + 调用纪律 TUNE |
| SignalBand | TUNE（禁滥用 tiles） |

## 下一批

`StageWorkbenchShell` · `DualDomainSideNav` · `Main.vue` · `MarkingScorePanel` · `MarkChart` 族 · `PortfolioProgressCockpitBand`
