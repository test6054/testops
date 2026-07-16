# 组件手审账 · Batch 15（Wave A · 表单控件收尾 · Wave A 完成）

> 三 Skill · 2026-07-16

## 156. `DatePicker.vue` — **OK**
refs≈8；FilterBar/portfolio。动作：保持。禁裸 a-date-picker 散落。

## 157. `UiForm.vue` — **OK**
refs=1 archive-volume-settings。动作：保持。禁再叠 FormSection 外无关壳。

## 158. `UiStatPanel.vue` — **TUNE**
refs≈7 portfolio 驾驶舱；内用 MetricCard（#2563eb 债）。动作：MetricCard token 修后保持。禁同页四卡同权装饰。

## 159. `Textarea.vue` — **OK**
refs≈6。动作：保持。

## 160. `UiProgressBar.vue` — **TUNE**
hex `#3b82f6`。动作：→`--dp-blue-500`。禁 Tailwind 蓝。

## 161. `ConfirmModal.vue` — **SHELL**
纯转发 UiConfirmDialog。动作：删，统一 ConfirmDialog。禁第三确认名。

## 162. `InputNumber.vue` — **OK**
refs≈5 portfolio。动作：保持。

## 163. `ProgressBar.vue` — **SHELL / 双轨?**
与 UiProgressBar 并存。动作：合并唯一路径。禁双文件。

## 164. `SearchBox.vue` — **OK**
refs≈5。动作：保持。

## 165. `UiCheckbox.vue` — **OK**
refs≈4。动作：保持。

## 166. `Checkbox.vue`（CheckboxLegacy）— **SHELL**
转发 UiCheckbox。动作：删。禁 Legacy 别名。

## 167. `UiFormField.vue` — **OK**
refs≈5 登录/认证。动作：保持。

## 168. `UiRadioGroup.vue` — **OK**
refs≈4。动作：保持。

## 169. `InfoGridItem.vue` — **OK**
refs≈3 阅卷组织。动作：保持。

## 170. `PasswordInput.vue` — **OK**
refs≈3 登录。动作：保持；禁假强度条营销。

## 171. `RadioGroup.vue`（RadioGroupLegacy）— **SHELL**
转发。动作：删。

## 172. `UiPopoverPanel.vue` — **OK**
refs≈3 MarkingTaskToolbar。动作：保持。

## 173. `UiTooltip.vue` — **TUNE**
`#f8fafc`。动作：改 `--dp-*`。禁暗色 tooltip（同 EllipsisText）。

## 174. `InfoGrid.vue` — **OK**
refs≈2。动作：保持。

## 175. `UiCheckboxGroup.vue` — **OK**
refs≈2。动作：保持。

## 176. `UiEditorCard.vue` — **TUNE + DEAD?**
仅 kit 互引；`#fff`。动作：→surface；无业务则归档。

## 177. `UiRadio.vue` — **OK**
动作：保持。

## 178. `Alert.vue`（UiAlert）— **OK**
refs≈11；与 UiAlertStrip 分工（块级 vs dense）。动作：工作台优先 AlertStrip dense。禁大框门禁。

## 179. `CheckboxGroup.vue`（Legacy）— **SHELL**
动作：删。

## 180. `Radio.vue`（Legacy）— **SHELL**
动作：删。

## 181. `Switch.vue` — **TUNE**
hex `#94a3b8`。动作：token。refs=1。

## 182. `UiChatShell.vue` — **DEAD?**
仅 ConversationPanel。动作：未立项归档。禁假聊天中心。

## 183. `UiDropdownAction.vue` — **OK**
被 TableActions 用。动作：保持。

## 184. `Pagination.vue` — **REWORK（双轨）**
与 `UiPagination.vue` 同名同构。动作：合并唯一文件。禁双轨。

## 185. `Button.vue` / `UiButton.vue` — **REWORK（已记 Batch 05）**
交叉确认：双轨仍在。

---

## Wave A 收口

ui-guide 手审完成。高信号债：双轨（Button/Badge/Pagination/Empty/ProgressBar）、Steps/Hero/Insight 营销件、大量 DEAD? kit 预备件、ArrowTimeline/StatisticChartCard 色与空态。
