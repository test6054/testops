# 质量评价 · 入口信息架构合同

> 2026-07-16 · 用户纠偏 · 手读 `router/routes/quality.ts` + DualDomainSideNav  
> 看板：`craft-board-hi-fi.html#quality-blueprint` · **未改业务码**

## 0. 裁决（硬）

| 错误模型（否决） | 正确模型（定案） |
|------------------|------------------|
| 换域 → QualityScope 学期任务链 | **侧栏不同菜单 → 不同主页面** |
| 治理（方案/认证/AI）= 另一条「治理旅程总壳」 | 方案/认证/AI **各自是菜单项/页面**，不是总壳阶段 |
| StageRail 当全质量唯一导航 | Stage/进度仅可出现在**单页内部**（若业务需要），不替代侧栏 |
| 一个「质量工作台」包办一切 | `dashboard` 只是菜单之一；达成/改进/报告/接入等各自有主页面 |

**现网已经是正确形态**：禁止再设计回「换域/任务链壳」。

## 1. 源码真源

| 项 | 位置 |
|----|------|
| 路由菜单 | `src/router/routes/quality.ts` |
| 侧栏一级 | `DualDomainSideNav` · `domain-quality` · 标题「质量评价」 |
| 页内范围条 | `QualityScopeChrome`（专业 / 培养方案 / 学期 / 课程） |
| 方案门禁 | quality store + plan guard；未确认不可正式达成度/报告 |
| 与档案袋 | 路径前缀 `/quality` vs `/portfolio`；无 teacherId |

### 1.1 菜单 → 主页面（摘自 quality.ts title）

| 菜单 title | 路径职责 |
|------------|----------|
| 评价工作台 | dashboard |
| 工程认证驾驶舱 | accreditation-cockpit |
| 考核合理性审核 | rationality-audit |
| 培养方案体系工作台 | training-plan-workbench |
| 培养方案院审 | training-plan-review |
| 课程支撑矩阵工作台 | quality-course-matrix |
| 数据接入 | ingest-hub（子页成绩/过程/间接等） |
| 达成度结果与审核 | achievement |
| 持续改进与审核闭环 | improvement-workbench |
| 质量评价报告 | report |
| 材料归档与专家包 | archive |
| AI 任务中心 | ai-task |
| 认证标准 / 专业算法模板 / 量表换算 / AI 模型配置… | 配置与台账类页面 |

每条：自己的列表/编辑面/驾驶舱，**不是**同一壳内的 Step 1..N。

## 2. QualityScopeChrome 边界

| 是 | 不是 |
|----|------|
| 页内「当前分析范围」选择 | 换域控件 |
| 方案未确认时的状态 + 去确认 CTA | 全站任务链导航 |
| 多页可复用同一范围 store | 替代侧栏菜单 |

门禁形态仍定案 **B 钉条 ≤48px**（与 EMPTY_GATE 一致）。

## 3. 与旧文档的 diff

| 旧表述 | 处理 |
|--------|------|
| DESIGN_BRIEF `F-FLOW-QUALITY`：学期任务链 + 治理旅程 | **作废** → 改为「菜单分页 + 页内 Scope/门禁」 |
| 质量蓝图 StageRail 1..7 总流程 | **不得当入口 IA** |
| 08 幕「质量工作台」单卡 | 改为「菜单分页」说明 |

## 4. 验收勾选

- [ ] 同意：质量入口 = 不同菜单不同主页面（现网）  
- [ ] 同意：否决「换域 / 学期任务链总壳 / 治理旅程总壳」  
- [ ] 同意：ScopeChrome 仅页内范围 + 门禁  
- [ ] 同意：与档案袋并列、无 teacherId、不借用 workShell 语言  

## 5. 改码

**无**。本文件只纠正设计表述；业务路由已符合定案。
