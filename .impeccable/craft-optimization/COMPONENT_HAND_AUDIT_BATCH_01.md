# 组件手审账 · Batch 01

> 方法：逐文件 Read 源码 + 路径限定引用核对。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*` · 禁营销壳）  
> 禁令：结论禁止由扫描脚本生成；脚本只可用于人工核对引用时的只读检索。  
> Date: 2026-07-16

## Design Read（本批）

Reading this as: **design-system primitives inside a regulated EduTech product workbench**, trust-first / high-density, not landing-page UI kit demos.

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Impeccable register | product |

## 状态口径（手审）

| 状态 | 含义 |
|------|------|
| OK | 合同清晰、调用合理、三 Skill 无阻断项 |
| TUNE | 可用，但有明确像素/文案/token 债 |
| REWORK | 职责或形态与工作台冲突，须改 |
| SHELL | 薄封装，应按门禁内联或删除 |
| DEAD? | 业务调用未找到；仅被 kit 内互引或类型声明 — 删除前再核动态导入 |

---

## 1. `UiFormSection.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/UiFormSection.vue` |
| 行数 | 68 |
| Props | `title` `subtitle` `divided` |
| Slots | `header` `default` |
| 调用 | `views/auth/change-password.vue`（两处分段：当前密码 / 新密码） |
| Token | `--dp-text-*` `--dp-border`；无硬编码 hex |

**Impeccable：** 表单分段容器职责清楚；空 title 时仍可只靠 slot header。  
**Finesse：** 间距 16px 符合工作台密度；divided 用顶边分割，无装饰卡。  
**Taste：** 无 eyebrow / 渐变 / 侧条。  

**判定：OK**  
**动作：** 保持合同。仅当出现第二处同类表单分段需求时再复用；不要为单页加皮肤。  
**禁：** 改成营销式大标题区；加图标墙。

---

## 2. `UiPageHeader.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/UiPageHeader.vue` |
| 行数 | 117 |
| Props | `title*` `subtitle` `showBack` `backText` `divided` |
| Emits | `back` |
| Slots | `badges` `meta` `actions` |
| 调用 | `views/auth/change-password.vue` |
| Token | `--dp-*`；标题 `28px / 800` |

**Impeccable：** 页头信息架构完整（回退 / 标题 / 副文 / 动作）。  
**Finesse：** 对**工作台内页**偏大（28px 显示级）；更适合 auth / 独立办理页，不宜替代 `ContextBar`。  
**Taste：** 无 AI 脚手架；需防止与 `ContextBar` 双标题。  

**判定：TUNE（使用边界）**  
**动作：** 文档化：仅用于无 StageWorkbench 壳的独立页（登录后改密等）。工作台页禁止叠用。标题尺度若进工作台须降到 18–20。  
**禁：** 在 exam/portfolio/quality 工作台再包一层 UiPageHeader。

---

## 3. `UiMessageThread.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/UiMessageThread.vue` |
| 行数 | 248 |
| Props | `messages` `loading` `emptyText` `maxHeight` |
| Slots | `footer` |
| 调用 | 仅 `UiConversationPanel.vue`（kit 内） |
| Token | 多为 `--dp-*`；气泡 `background: #fff`；附件 `rgba(255,255,255,0.72)` |

**Impeccable：** 消息角色 / 附件 / 空态 / loading 齐全；空文案默认「暂无消息」可接受。  
**Finesse：** 气泡与附件嵌套边框偏「聊天产品」，档案袋/质量主链暂无业务页直接使用。  
**Taste：** `#fff` 硬编码违反项目「禁纯白大面积」偏好；应用 `--dp-surface` / `--ant-color-bg-container`。  

**判定：TUNE**  
**动作：** ① 去掉 `#fff` 硬编码；② 若无业务页接入，标记为 kit 内部件，不进产品导航。  
**禁：** 当消息中心未立项时扩展为独立业务页。

---

## 4. `UiMultiSelect.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/UiMultiSelect.vue` |
| 行数 | 55 |
| 实现 | 仅包装 `UiSelect` 并固定 `mode="multiple"` |
| 调用 | `FilterBar.vue`（字段 type=multi-select） |

**Impeccable：** 无新增语义，属薄封装。  
**Finesse / 项目门禁：** 壳方法 — 调用方可直接 `UiSelect mode="multiple"`。  
**Taste：** 无视觉债，但增加无意义 API 面。  

**判定：SHELL**  
**动作：** 优先在 FilterBar 内联 `UiSelect mode="multiple"` 后删除本文件；或保留唯一入口但禁止再扩 props。  
**禁：** 再包一层 `UiTagMultiSelect` 之类别名。

---

## 5. `UiSessionListPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/UiSessionListPanel.vue` |
| 行数 | 244 |
| Props | `title` `description` `eyebrow` `items` `currentId` `loading` `emptyText` `removable` `maxHeight` `compact` `divided` |
| Emits | `select` `remove` |
| 默认 | `eyebrow: 'Session List'`（英文） |
| 调用 | 仅 `UiConversationPanel.vue` |
| 硬编码 | `#fff` `#f8fafc` 未读点 `#2563eb`（≠ 品牌 `#1677ff`） |

**Impeccable：** 列表/选中/删除/空态完整；默认英文 eyebrow 对中文产品是合同污染。  
**Finesse：** 卡片+阴影+hover transform 对工作台偏重；未读点第二蓝。  
**Taste：** 英文 eyebrow = AI/demo 味；硬编码色必须收回 token。  

**判定：REWORK（文案+色） / 业务面 DEAD?**  
**动作：** ① 默认 `eyebrow` 改为空或中文；② `#2563eb`→`--dp-blue-500`；`#fff/#f8fafc`→surface token；③ 无业务调用则不进产品菜单。  
**禁：** 保留英文 Session List；用第二品牌蓝。

---

## 6. `UiSidebarNav.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/UiSidebarNav.vue` |
| 行数 | 149 |
| Props | `title` `items` `activeKey` |
| Emits | `select` |
| 调用 | `CreateFormPageShell.vue`（创建向导侧栏） |
| Token | `--dp-*`；无硬编码 hex |

**Impeccable：** 无障碍 `aria-current`、disabled 处理正确。  
**Finesse：** 适合创建流局部导航；**不得**替代 `DualDomainSideNav` / `ExamSubSidebar`。  
**Taste：** 干净。  

**判定：OK（边界清晰）**  
**动作：** 仅用于 CreateForm / 同类向导。禁止拉进三域主侧栏。  
**禁：** 在此组件上堆「更多」折叠菜单超市。

---

## 7. `UiSidePanelCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/UiSidePanelCard.vue` |
| 行数 | 188 |
| Props | `title` `description` `eyebrow` `count*` `compact` `divided` `bodyScrollable` `bodyMaxHeight` |
| Slots | `header` `icon` `meta` `actions` `default` `footer` |
| 调用 | `UiInboxPanel.vue`（kit 内） |

**Impeccable：** 侧栏卡片壳；count 徽章可行动性取决于调用方。  
**Finesse：** 有 `box-shadow: var(--dp-shadow-card)` — 列表密集区慎用。  
**Taste：** `eyebrow` 可选，调用方勿填英文装饰词。  

**判定：TUNE（使用纪律）**  
**动作：** 业务页优先 `WorkbenchSurfaceCard`；本组件限消息/助手侧栏。  
**禁：** 嵌套卡片；用 eyebrow 做每块 01/02 编号脚手架。

---

## 8. `YearPicker.vue`（组件名 `UiYearPicker`）

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/YearPicker.vue` |
| 行数 | 176 |
| Props | `placeholder` `allowClear` `disabled` `format` `valueFormat` `size` `status` |
| Model | `string` 年 |
| 调用 | `FilterBar.vue` → 多业务 FilterBar 页（成绩/归档/档案袋等） |
| Token | 控件态走 `--dp-*`；focus ring 正确 |

**Impeccable：** Ant DatePicker year 适配清晰；`valueFormat` 后 string 合同有注释。  
**Finesse：** 筛选条密度合适。  
**Taste：** 无问题。  

**判定：OK**  
**动作：** 保持为 FilterBar year 字段唯一入口。  
**禁：** 页面再包一层业务 YearSelect 壳。

---

## Batch 01 汇总

| 组件 | 判定 | 优先动作 |
|------|------|----------|
| UiFormSection | OK | 保持 |
| UiPageHeader | TUNE | 限定非工作台页 |
| UiMessageThread | TUNE | 去 `#fff`；确认业务接入 |
| UiMultiSelect | SHELL | 内联后删或冻结 |
| UiSessionListPanel | REWORK | 去英文 eyebrow + `#2563eb` |
| UiSidebarNav | OK | 仅向导 |
| UiSidePanelCard | TUNE | 限侧栏场景 |
| YearPicker | OK | 保持 |

## 下一批（手审顺序）

1. 范围壳：`PortfolioScopeHeader` `PortfolioLayoutContext` `QualityScopeChrome`  
2. 工作台：`StageWorkbenchShell` `ContextBar` `SignalBand` `DualDomainSideNav`  
3. 图表：`MarkChart` 族  
4. 其余 ui-guide：按引用从高到低，逐文件继续本账 Batch 02+
