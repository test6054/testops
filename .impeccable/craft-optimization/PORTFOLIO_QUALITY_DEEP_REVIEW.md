# 档案袋 × 质量 · 业务交互深审

> Skills: Impeccable product · Finesse product · Taste audit-only  
> Gate: frontend-design-mark · 2026-07-16 晚间刷新  
> 可视化：`craft-board-hi-fi.html` → `#design-read` `#proxy-interaction` `#component-vision` `#pq-file-packs`

## Design Read

Reading this as: **regulated university teaching-portfolio + OBE quality product workbench** for Chinese HE faculty / department reviewers / tenant admins, with **trust-first / evidence-chain / high-density** language, leaning toward **Finesse product substrate under mark shells** — not brand landing.

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Color | Restrained · `#1677ff` ≤10% · 永久浅色 |

## 用户需求核对

| 需求 | 源码结论 |
|------|----------|
| 每个老师看到自己的 | **已实现**：`resolveDefaultTeacherId` → 本人；`PortfolioScopeHeader` UiTag；URL 他人 id 被 `bootstrapFromRoute` / watch 打回 |
| 管理员可选择其他人 | **已实现**：`canPickTeachers`（租户管理员/超管）→ a-select；`portfolioStore` + `?teacherId=`；Layout 级 `PortfolioLayoutContext` 全局挂载 |
| 院审看多人 | **部分**：`canReviewPortfolio` / `reviewAccess` 可跟 query；应是队列过滤，不应等同代办身份 |

## 真正的产品债

1. **PQ-01** 管理员默认 teacherId 为空 → 空态与写保护不足（页面仍可能请求/渲染）  
2. **PQ-02** 代办模式视觉弱（无「代办」标 / 「回本人」；对比 UCLA 顶栏 Exit Emulation）  
3. **PQ-03** 院审 `reviewAccess` 与管理员选人分责不清（队列过滤 vs 代办办理）  
4. **PQ-04** 菜单功能超市 + 五步旅程双真源  
5. **PQ-05** 空态禁语：`teacher-home` / `teacher-archive` / `teacher-portrait` / `teacher-review-status` 写「URL 携带 teacherId」  
6. **PQ-06** 质量域执行/治理未拆壳；与档案袋 teacherId 硬隔离需持续守住  

## 联网竞品差分（2026-07-16 晚间）

| 来源 | 吸收 | 拒绝 / 反超 |
|------|------|-------------|
| Interfolio FAR Emulate（OSU） | 明确进入 / 退出；教师仍负最终责任 | **反超**：OSU 写明无操作日志 → nybc 强制审计 |
| UCLA Opus Emulate | 顶栏红框显示被模拟人 + Exit Emulation | 红条本地化为 warn 色，非营销大红 |
| Watermark Faculty Success Proxy | Proxy 角色；逐人 Audit Log Excel | 不抄通用 HR 绩效壳；隐藏/只读字段不可代改 |
| Watermark Self-Study | 结果→证据→行动项闭环 | 不抄营销首页 |
| 国内档案袋 / OBE（易扉、迅科等） | 自填+督办+补采+达成报告分责 | 拒绝零代码「千人千面」无合同配置 |
| PebblePad / Anthology | 策展与跨周期检索 | 拒绝学生作品集营销旅程 |

## 落地包（见 craft `#pq-file-packs`）

- **PQ-SCOPE**：`PortfolioScopeHeader` 代办标 + 回本人 + 未选门禁；`usePortfolioPageScope.scopeReady`  
- **F-FLOW-TEACHER**：home/archive/portrait/materials/privacy 去 URL 文案、首屏三问  
- **F-FLOW-REVIEW**：department-* 队列 ≠ 代办  
- **F-FLOW-AI**：四助手任务轨；草稿须本人确认  
- **F-FLOW-ADMIN**：`*-admin` 配置台账  
- **F-FLOW-QUALITY**：`QualityScopeChrome` 门禁 + dashboard/achievement/improvement/accreditation  

## 硬边界

档案袋 = 人维度（teacherId）；质量 = 方案/课程维度；禁止混 scope。  
AI 只出草稿；正式确认与隐私同意仅本人（代办不可替签）。  
跨域仅允许显式芯片（如 `MarkQualitySyncChip`），禁止隐式带 teacherId 进质量页。

## Vue / 组件覆盖

- 731 Vue 文件逐项表：`craft-board-hi-fi.html` `#files`  
- 档案袋/质量优先包：`#pq-file-packs`（96 档案袋页 + 34 质量页）  
- 509 组件手审：`#hand-audit`（OK 337 / TUNE 62 / REWORK 23 / SHELL 37 / DEAD? 50）  
- 关键组件像素远景：`#component-vision`（含 ScopeHeader / QualityScopeChrome / ContextBar / SignalBand / 证据 / AI）
