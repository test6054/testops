# 组件手审账 · Batch 24

> 方法：逐文件 Read 源码 + 路径限定引用核对（排除 `components.d.ts`）。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*`）  
> 范围：**仅 INDEX `batch=BATCH_24` 的 27 路径**（不含 BATCH_18 标 SHELL 的 layout 壳）。  
> Date: 2026-07-16（深审重写 · 去掉机械套话）

## Design Read（本批）

Reading this as: **归档详情收尾面板 · 考试创建向导步 · 影像账本 · 全局 layout 小组件**，密态工作台 — `SubmitProgressBand` 承担主进度，禁与 `ArchiveFlowContextBar` 双管道。

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |

---

## 491. `ArchiveVolumePhysicalLocationPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumePhysicalLocationPanel.vue` |
| 行数 | 360 |
| 调用 | `archive-volume-detail.vue` |
| Token | `var(--nybc-text-secondary, #8c8c8c)` 只读/空文案 |
| 结构 | 结构化库位表单 · 历史时间线 · `canEdit` 门控 |

**Impeccable：** 实体库位登记+变更历史，失败与 historyLoadFailed 可见。  
**Finesse：** 360 行表单+时间线偏重；filled 字段高亮有用。  
**Taste：** 遗留 `#8c8c8c`/`--nybc-*` 应迁 `--dp-text-secondary`。  

**判定：TUNE**  
**动作：** token 清理；历史加载错误态保持内联重试。  
**禁：** 无库位时展示假「已上架」文案。

---

## 492. `ArchiveVolumeScoresPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeScoresPanel.vue` |
| 行数 | 359 |
| 调用 | `archive-volume-detail.vue` |
| Props | `canConfirmScoreCompletion` |

**Impeccable：** 成绩事实表+确认完成链，枚举 Tag 严格。  
**Finesse：** 359 行单面板可接受。  
**Taste：** 无装饰分数 KPI 墙。  

**判定：OK**  
**动作：** 保持权限门控确认按钮。  
**禁：** 未确认时绿勾假完成。

---

## 493. `ArchiveVolumeSelfCheckList.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSelfCheckList.vue` |
| 行数 | 202 |
| 调用 | `ArchiveVolumeIntegrityPanel.vue`（嵌入） |
| Props | `embedded` `readonly` `selfCheckStatus` |

**Impeccable：** 自检清单子件，可嵌入完整性面板。  
**Finesse：** 202 行 checklist 密排。  
**Taste：** dense Alert/Tag，非大卡片墙。  

**判定：OK**  
**动作：** 保持 embedded 模式。  
**禁：** 升独立 Tab 与完整性双轨。

---

## 494. `ArchiveVolumeSubmitChecklistModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitChecklistModal.vue` |
| 行数 | 215 |
| 调用 | `archive-volume-detail.vue` |
| Props | `open` `volumeId` |

**Impeccable：** 提交前清单模态，blocking 项可导航。  
**Finesse：** 215 行模态适中。  
**Taste：** 提示条非全屏墙。  

**判定：OK**  
**动作：** destroy-on-close。  
**禁：** 未通过项静默允许提交。

---

## 495. `ArchiveVolumeSubmitProgressBand.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitProgressBand.vue` |
| 行数 | 123 |
| 调用 | `archive-volume-detail.vue` |
| 结构 | `WorkbenchSurfaceCard` · 阶段 Tag · 可展开 `ArchiveVolumeSubmitTaskList` |
| 行为 | `blockingItems` 有待办自动 `expanded` |

**Impeccable：** **收材期主进度带**（与 `ArchiveFlowContextBar.showPipeline=false` 对标注释一致）。  
**Finesse：** 123 行轻量 band，展开待办用 `UiTextAction`。  
**Taste：** **好样板** — 单条进度+可收起待办，非 Step 墙。  

**判定：OK**  
**动作：** 保持与 Flow 管道互斥展示策略。  
**禁：** 与顶栏 pipeline 双主进度同时全展。

---

## 496. `ArchiveVolumeTransferPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeTransferPanel.vue` |
| 行数 | 320 |
| 调用 | `archive-volume-detail.vue` |
| Props | `canReviewTransfer` `canRejectTransfer` |

**Impeccable：** 移交审核面板，空态+失败 toast。  
**Finesse：** 320 行。  
**Taste：** 审批 Tag 严格枚举。  

**判定：OK**  
**动作：** 保持双权限 props。  
**禁：** 无权限展示通过/驳回。

---

## 497. `DepartmentReviewPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/DepartmentReviewPanel.vue` |
| 行数 | 279 |
| 调用 | `archive-volume-detail.vue` |

**Impeccable：** 院系审核记录面板（详情内），与列表抽屉分工。  
**Finesse：** 279 行。  
**Taste：** 空态明确。  

**判定：OK**  
**动作：** 保持详情内只读/操作边界。  
**禁：** 与 `DepartmentReviewListDrawer` 重复主链无差异。

---

## 498. `DigitalMaterialConfirmPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/DigitalMaterialConfirmPanel.vue` |
| 行数 | 173 |
| 调用 | `archive-volume-detail.vue` |

**Impeccable：** 数字化材料确认，历史数字化路径配套。  
**Finesse：** 173 行轻面板。  
**Taste：** 无假确认勾选。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未核验材料默认可提交。

---

## 499. `TaskSettingsDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/TaskSettingsDrawer.vue` |
| 行数 | 282 |
| 调用 | `archive-volume-detail.vue` |
| Props | `canManageCollaborators` `canUpdateArchiveDueTime` |

**Impeccable：** 任务级协作/截止设置抽屉，权限分项。  
**Finesse：** 282 行。  
**Taste：** UiDrawer 域一致。  

**判定：OK**  
**动作：** destroy-on-close 防脏表单。  
**禁：** 列表页 Banner 再引租户 settings 页。

---

## 500. `ScanDispatchDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/ScanDispatchDialog.vue` |
| 行数 | 142 |
| 调用 | `ArchiveVolumeMaterialTablePanel.vue` |
| Token | `#595959` `#8c8c8c` 说明文案 |
| Props | `catalogCode` `materialType` `archiveBatchMode` |

**Impeccable：** 归档扫描派单弹窗，材料上下文 props 齐全。  
**Finesse：** 142 行小模态。  
**Taste：** hex 文案应迁 `--dp-text-secondary`。  

**判定：OK**  
**动作：** 实现波次 token 清理。  
**禁：** 无 catalog 上下文仍派单。

---

## 501. `ExamListExamWindowCell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/components/ExamListExamWindowCell.vue` |
| 行数 | 54 |
| 调用 | `exam-list.vue` |
| 行为 | 紧凑区间 + 相对阶段 modifier + `title` 完整时间 |

**Impeccable：** 列表考试时间窗单元格，util 格式化无宽化类型。  
**Finesse：** 54 行纯展示，恰当。  
**Taste：** 未设置显示 `muted`「未设置」。  

**判定：OK**  
**动作：** 保持 hover title 全文。  
**禁：** 英文 phase 直出。

---

## 502. `BasicSettingsStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/BasicSettingsStep.vue` |
| 行数 | 365 |
| 调用 | `exam-create.vue` |
| Props | `basicRules` |

**Impeccable：** 考试创建基本信息步，校验外置。  
**Finesse：** 365 行单步可接受。  
**Taste：** 向导分段非 hero 营销。  

**判定：OK**  
**动作：** 保持。  
**禁：** 假默认考试名。

---

## 503. `CandidateScopeStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/CandidateScopeStep.vue` |
| 行数 | 448 |
| 调用 | `exam-create.vue` |
| Props | `rosterRules` |

**Impeccable：** 考生范围+名册表，空态与导入链。  
**Finesse：** 448 行偏重但单步职责。  
**Taste：** 表格密排。  

**判定：OK**  
**动作：** 保持 roster 失败可见。  
**禁：** 空名册假「已导入」。

---

## 504. `ConfirmStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/ConfirmStep.vue` |
| 行数 | 174 |
| 调用 | `exam-create.vue` |

**Impeccable：** 创建确认只读摘要。  
**Finesse：** 174 行薄确认。  
**Taste：** 枚举展示严格。  

**判定：OK**  
**动作：** 保持。  
**禁：** 确认页隐藏关键限制条件。

---

## 505. `MarkingTeamStep.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/exam-create/MarkingTeamStep.vue` |
| 行数 | 131 |
| 调用 | `exam-create.vue` |
| Props | `markingTeamRules` |

**Impeccable：** 阅卷组配置步，规则 props 外置。  
**Finesse：** 131 行。  
**Taste：** 无装饰团队 KPI。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未配组默认可发布。

---

## 506. `DuplicateResolutionCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/image-ledger/DuplicateResolutionCard.vue` |
| 行数 | 153 |
| 调用 | `image-ledger.vue` |
| Props | `pendingDuplicateCount` |

**Impeccable：** 重复页待处理表，挂账本分页。  
**Finesse：** 153 行卡片。  
**Taste：** Tag 枚举严格。  

**判定：OK**  
**动作：** 保持与 ResolveModal 分工。  
**禁：** 0 待处理仍红墙提示。

---

## 507. `DuplicateResolveModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/image-ledger/DuplicateResolveModal.vue` |
| 行数 | 114 |
| 调用 | `image-ledger.vue` |

**Impeccable：** 单条重复解析模态，destroy-on-close。  
**Finesse：** 114 行。  
**Taste：** 模态非暗色抽屉。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未选决议可提交。

---

## 508. `LedgerSummaryCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/image-ledger/LedgerSummaryCard.vue` |
| 行数 | 328 |
| 调用 | `image-ledger.vue` |
| 结构 | `MarkGaugeBlock` · 三组 `SignalBand`（收录/绑定/偏差）· 对账 CTA |

**Impeccable：** 影像账本摘要，诊断文案来自 API diagnostic。  
**Finesse：** KPI 分组有业务语义，非装饰墙。  
**Taste：** 空 ledger 用 `UiEmpty` 说明后续动作。  

**判定：OK**  
**动作：** 保持 gauge+SignalBand 组合。  
**禁：** 无 ledger 画满进度环。

---

## 509. `NoticePopup.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/user/message/components/NoticePopup.vue` |
| 行数 | 349 |
| 调用 | `LayoutDefault.vue`（`ref.open()` 延迟 1s） |

**Impeccable：** 登录后未读公告弹层，token 门控。  
**Finesse：** 349 行公告 UI 可接受。  
**Taste：** 非营销全屏 overlay。  

**判定：OK**  
**动作：** 保持 Layout 统一挂载。  
**禁：** 页内第二套公告弹窗。

---

## 510. `Logo.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Logo.vue` |
| 行数 | 88 |
| 调用 | `Asider` · `MenuFoldBtn` |

**Impeccable：** 侧栏品牌标，折叠态适配。  
**Finesse：** 88 行轻量。  
**Taste：** 浅色品牌，无渐变 hero。  

**判定：OK**  
**动作：** 保持。  
**禁：** 工作台内容区重复 Logo 条。

---

## 511. `MenuCollapsedTooltip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Menu/MenuCollapsedTooltip.vue` |
| 行数 | 41 |
| 调用 | `Menu/index` · `DualDomainSideNav` |

**Impeccable：** 侧栏折叠 tooltip 包装，有 collapsed/label props。  
**Finesse：** 41 行微组件有明确职责。  
**Taste：** 非 SHELL — 折叠可达性需要。  

**判定：OK**  
**动作：** 保持。  
**禁：** 删除后折叠菜单无 label。

---

## 512. `MenuIcon.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Menu/MenuIcon.vue` |
| 行数 | 251 |
| 调用 | `Menu/index` · `DualDomainSideNav` |

**Impeccable：** 菜单图标映射表（路由/域图标合同）。  
**Finesse：** 251 行为映射数据+渲染，非空壳。  
**Taste：** 图标尺寸一致。  

**判定：OK**  
**动作：** 新路由须登记映射。  
**禁：** 未知路由空白图标无告警。

---

## 513. `MenuFoldBtn.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/MenuFoldBtn.vue` |
| 行数 | 92 |
| 调用 | `Asider` · `Header` |

**Impeccable：** 侧栏折叠按钮，Header/Asider 双挂载点。  
**Finesse：** 92 行。  
**Taste：** ghost 控件。  

**判定：OK**  
**动作：** 保持单一折叠状态源。  
**禁：** 页面内第三折叠钮。

---

## 514. `AiTaskRunningBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/AiTaskRunningBar.vue` |
| 行数 | 107 |
| 调用 | `quality-workspace-layout.vue`（**quality 域专用**） |
| 行为 | 15s 轮询 `qualityTaskStore`；`role="status"`；跳转 QualityAiTask |

**Impeccable：** 质量域 AI 任务条，in-flight 计数真实。  
**Finesse：** 细条 `ant-color-primary-bg`，非 banner 墙。  
**Taste：** 注释明确域边界，勿挂 mark 工作台。  

**判定：OK**  
**动作：** 保持仅 quality layout 挂载。  
**禁：** mark/teacher 壳复制此条。

---

## 515. `Message.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/HeaderRightBar/Message.vue` |
| 行数 | 523 |
| 调用 | `HeaderRightBar/index.vue` |
| Props | `variant` |

**Impeccable：** 顶栏站内信下拉，列表+已读+失败 toast。  
**Finesse：** 523 行偏重，属 Header 核心入口。  
**Taste：** 下拉密表非全屏消息中心。  

**判定：OK**  
**动作：** 保持 variant 分考试/质量顶栏。  
**禁：** 页面内再造第二消息铃铛。

---

## 516. `MenuItem.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/components/Menu/MenuItem.vue` |
| 行数 | 135 |
| 调用 | `Menu/index.vue` |

**Impeccable：** 递归菜单项，active/children 渲染。  
**Finesse：** 135 行 Menu 子件，非 SHELL（对比 BATCH_18 `Menu/index` 整体壳）。  
**Taste：** 浅色侧栏选中态。  

**判定：OK**  
**动作：** 保持与 `MenuIcon` 联动。  
**禁：** 页内平行侧栏项组件。

---

## 517. `LayoutDefault.vue`

| 项 | 事实 |
|----|------|
| 路径 | `layout/LayoutDefault.vue` |
| 行数 | 119 |
| 调用 | `layout/index.vue` |
| 结构 | skip-link · Asider/Header/Main/TabBar · `PortfolioLayoutContext` · `NoticePopup` |

**Impeccable：** 默认应用壳编排，移动端 TabBar 分叉清楚。  
**Finesse：** 119 行薄编排（Main/Menu 等重件在 BATCH_18）。  
**Taste：** skip-link a11y；`--dp-*` 圆角 token。  

**判定：OK**  
**动作：** 保持 Notice 延迟挂载策略。  
**禁：** 暗色全局 layout 切换。

---

## Batch 24 小结

| 判定 | 数量 | 代表 |
|------|-----:|------|
| OK | 26 | `ArchiveVolumeSubmitProgressBand` 主进度带 · `LedgerSummaryCard` 业务 KPI · `AiTaskRunningBar` quality 域 |
| TUNE | 1 | `ArchiveVolumePhysicalLocationPanel` 遗留 `#8c8c8c`/`--nybc-*` |
| REWORK | 0 | — |
| SHELL | 0 | —（`layout/index`、`Menu/index` 等见 **BATCH_18**） |
| DEAD? | 0 | — |

**索引注：** 本批 **不含** INDEX 标 `BATCH_18 · SHELL` 的 `layout/index`、`HeaderRightBar/index`、`Menu/index`、`Asider/index` 等；那些已在 Batch 18 深审。
