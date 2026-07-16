# 组件手审账 · Batch 14（Wave A · 摘要/树选/壳/高流量原语）

> 三 Skill · frontend-design-mark · 2026-07-16

## 142. `UiStatisticSummaryGrid.vue` — **REWORK + DEAD?**
refs=0；hex 含 `#2563eb/#6d28d9` 紫蓝。动作：删或改 SignalBand+dp token。禁装饰 KPI 墙。

## 143. `UiTemplateCard.vue` — **DEAD?**
refs=0；包 EntityCard。动作：无模板库则删。禁 uppercase 营销卡。

## 144. `UiTreeSelectionDialog.vue` — **TUNE + DEAD?**
refs=0；树选弹窗完整。动作：有组织树场景再接。禁第三套选人。

## 145. `UiTreeSelectionDrawer.vue` — **TUNE + DEAD?**
refs=0；与 Dialog 双轨。动作：与 Dialog 二选一。禁双维护。

## 146. `UiWarningList.vue` — **DEAD?**
refs=0。动作：接就绪/告警列表前保留。禁「未知」兜底。

## 147. `UiWorkbenchShell.vue` — **DEAD?**
refs=0；与 StageWorkbenchShell 竞争。动作：现网用 StageWorkbenchShell，本件归档。禁双工作台壳。

## 148. `UiWorkflowStatusBar.vue` — **TUNE + DEAD?**
refs=0；`#2563eb` 等。动作：token 化；或 WorkflowReadinessPanel。禁第二蓝。

## 149. `Card.vue`（UiCard）— **OK**
refs≈129。动作：保持；禁再叠 PageCard 壳。

## 150. `UiTableActions.vue` — **OK**
refs≈128。动作：保持行内动作密度。禁每行按钮墙。

## 151. `UiTextAction.vue` — **OK**
refs≈33。动作：保持。禁绕开写原生 a。

## 152. `Input.vue`（UiInput）— **OK**
refs≈21；FilterBar/登录。动作：保持 token。禁页内裸 a-input 皮肤分叉。

## 153. `Select.vue`（UiSelectCompat）— **SHELL**
纯转发 UiSelect。动作：删，改 UiSelect。禁 compat 别名。

## 154. `UiBadge.vue` — **REWORK（双轨）**
与 `Badge.vue` 同名 `UiBadge`。动作：合并唯一文件。禁双轨。

## 155. `UiPanelHeader.vue` — **OK**
refs≈19 kit。动作：eyebrow 禁英文 uppercase。禁营销 kicker。
