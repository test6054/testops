# 档案袋 × 质量 · 业务交互深审

> Skills: Impeccable product · Finesse product · Taste audit-only  
> Gate: frontend-design-mark · 2026-07-16 刷新  
> 可视化：`craft-board-hi-fi.html` → `#design-read` `#proxy-interaction` `#component-vision`

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
| 每个老师看到自己的 | **已实现**：`resolveDefaultTeacherId` → 本人；`PortfolioScopeHeader` UiTag；URL 他人 id 被打回 |
| 管理员可选择其他人 | **已实现**：`canPickTeachers`（租户管理员/超管）→ a-select；store + `?teacherId=` |

## 真正的产品债

1. **PQ-01** 管理员默认 teacherId 为空 → 空态与写保护不足  
2. **PQ-02** 代办模式视觉弱（无「代办」标 / 「回本人」）  
3. **PQ-03** 院审 `reviewAccess` 与管理员选人分责不清（队列过滤 vs 代办办理）  
4. **PQ-04** 菜单功能超市 + 五步旅程双真源  
5. **PQ-06** 质量域执行/治理未拆壳  

## 联网竞品差分（2026-07-16）

| 来源 | 吸收 | 拒绝 / 反超 |
|------|------|-------------|
| Interfolio FAR Emulate（OSU） | 明确进入 / Exit Emulation | **反超**：Interfolio 文档承认代填无操作日志；nybc 必须强制审计 |
| Watermark Faculty Success Proxy | Proxy 角色 + Audit Log | 不抄通用 HR 绩效壳 |
| Watermark Self-Study | 结果→证据→行动项闭环 | 不抄营销首页 |
| 国内档案袋 / OBE（易扉、迅科等） | 自填+督办+补采+达成报告分责 | 拒绝零代码「千人千面」无合同配置 |
| PebblePad / Anthology | 策展与跨周期检索 | 拒绝学生作品集营销旅程 |

## 落地包

- **PQ-SCOPE**：`PortfolioScopeHeader` 代办标 + 回本人 + 未选门禁；页面去重复选人文案  
- **F-FLOW-TEACHER** / **F-FLOW-SHELL** / **F-FLOW-QUALITY** / **F-DOMAIN-FOCUS**  
- 共享 O1a（Main bg-layout）+ P-KPI（SignalBand panel）

## 硬边界

档案袋 = 人维度（teacherId）；质量 = 方案/课程维度；禁止混 scope。  
AI 只出草稿；正式确认与隐私同意仅本人（代办不可替签）。

## Vue / 组件覆盖

- 731 Vue 文件逐项表：`craft-board-hi-fi.html` `#files`  
- 509 组件：`#components`（REWORK 16 / TUNE 66 / DEAD 93 / OK 257 / HOLD 77）  
- 关键组件像素远景：`#component-vision`
