# 组件手审账 · Batch 09（Wave A · Form / Tabs / Steps 族）

> 逐文件 Read · 三 Skill · frontend-design-mark · 2026-07-16

## 80. `UiFormItem.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0（仅 auto-import 声明） |
| 形态 | `a-form-item` + label deep 样式 |

**判定：SHELL**  
**动作：** 统一替换裸 AFormItem 或移出 auto-import。  
**禁：** 再叠 compat 转发。

---

## 81. `UiFormActions.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0 |
| 债 | `sticky` prop 未实现 |

**判定：DEAD?**  
**动作：** 删 sticky 或兑现；无调用方则归档。  
**禁：** 空 prop 保留。

---

## 82. `UiSearchForm.vue`

| 项 | 事实 |
|----|------|
| 引用 | 2（SelectionModal/SearchTableDialog，链顶近 0 页） |
| 结构 | Card+FilterBar |

**判定：TUNE**  
**动作：** 确认上线路线；现网列表直用 FilterBar。  
**禁：** 第三层 Card+Filter 私壳。

---

## 83. `UiSectionTabs.vue`

| 项 | 事实 |
|----|------|
| 引用 | 25+ 三域 |
| 债 | count tone 部分 hex |

**判定：OK**  
**动作：** count tone→`--dp-*`。  
**禁：** 页内第二套 tab。

---

## 84. `UiTabsPill.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0 |
| 债 | 无 a11y；`dp-tabs-pill` 命名分裂 |

**判定：DEAD?**  
**动作：** 与 SectionTabs compact 二选一。  
**禁：** 第三套 pill tab。

---

## 85. `UiSteps.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0 |
| 违例 | `#3b82f6/#2563eb`；magic number 布局 |

**判定：REWORK**  
**动作：** token 化或 demo-only 归档。  
**禁：** 页内 fork 第六套 steps。

---

## 86. `UiProgressSteps.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0；Tailwind 蓝 |

**判定：DEAD?**  
**动作：** 与 MilestoneProgress 合并选型。  
**禁：** 混用 a-steps 异色。

---

## 87. `UiProgressStepList.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0；纵向时间线最贴近工作台 |

**判定：TUNE**  
**动作：** 色/文案抽 token；作纵向进度候选保留。  
**禁：** 页内再写 timeline；「未知」兜底。

---

## 88. `UiSegmentSteps.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0；gradient + pulse 动画 |

**判定：REWORK**  
**动作：** 去装饰 gradient 或删除。  
**禁：** 装饰性 gradient / scaleY。

---

## 89. `UiPillSteps.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0；圆角 20px |

**判定：DEAD?**  
**动作：** 圆角收敛或归档。  
**禁：** 大圆角营销 pill。

---

## 90. `UiCardSteps.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0；硬编码「进行中」 |

**判定：TUNE**  
**动作：** badge→prop；色 token。  
**禁：** 模板写死业务状态词。

---

## 91. `UiMilestoneProgress.vue`

| 项 | 事实 |
|----|------|
| 引用 | 0；交互最完整；`#2563eb` |

**判定：TUNE**  
**动作：** 主色→`--dp-blue-500`；补 focus ring；Steps 系保留候选。  
**禁：** 页内自建横向 milestone。

---

## Batch 09 汇总

现网真源：**UiSectionTabs=OK**。Steps 七变体多数 DEAD?/REWORK，收敛候选：MilestoneProgress + ProgressStepList。
