# 组件手审账 · Batch 18

> 方法：逐文件 Read 源码 + 路径限定引用核对（排除 `components.d.ts`）。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*` · 禁营销壳）  
> 禁令：结论禁止由扫描脚本生成。  
> Date: 2026-07-16（深审重写 · 去掉机械套话）

## Design Read（本批）

Reading this as: **archive-volume / layout-designer / AI-analysis kit / kiosk stages / platform import primitives**, trust-first workbench — not marketing UI.

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Impeccable register | product |

---

## 251. `ArchiveVolumeMaterialOcrDetailContent.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailContent.vue` |
| 行数 | 163 |
| Props | `materialId` `initialPageNo` |
| 调用 | `ArchiveVolumeMaterialOcrDetailModal` · `archive-volume-search` |
| Token | `--nybc-text-secondary/#666` · `--nybc-danger/#cf1322` · `--nybc-bg-subtle/#fafafa`（非 `--dp-*`） |
| 行为 | `strictEnumLabel` 任务/页状态；失败 `showUserError`；`UiTag` + `UiSkeletonState` |

**Impeccable：** 归档卷 OCR 页级证据面板，合同字段清晰；失败可见。  
**Finesse：** tabs + pre 滚区密度合适；meta 行用旧 `--nybc-*` 回落色。  
**Taste：** 无营销壳；token 族与工作台 `--dp-*` 分叉。  

**判定：TUNE**  
**动作：** 样式改走 `--dp-text-*` / `--dp-danger` / `--dp-surface-muted`，去掉 `#666` 等回落。  
**禁：** 用名册 Excel 模态承接 OCR 材料登记。

---

## 252. `LayoutEntryGateway.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutEntryGateway.vue` |
| 行数 | 619 |
| Props | `document` `examId` `materialLayoutMode` `generating` `detecting` `readonly` |
| Emits | `generate-sheet` `auto-detect` `patch` |
| 调用 | `LayoutDesignSourcePhase` |
| 行为 | 空白答题卡生成 / 源 PDF 上传识别；`UiPlatformFileField` + `UiAlertStrip` + confirm |

**Impeccable：** 制卷入口网关，把「生成卡」与「源文件识别」收敛到单一阶段。  
**Finesse：** 题型快捷条信息密；tooltip 说明纸型，无装饰卡墙。  
**Taste：** 无渐变/eyebrow；场景枚举写死在组件内，改枚举须同步。  

**判定：OK**  
**动作：** 保持；题型字典变更走正式枚举源。  
**禁：** 拆成两套入口页导致合同分叉。

---

## 253. `LayoutDesignWorkflowRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignWorkflowRail.vue` |
| 行数 | ~185 |
| Props | `phase` `document` `examDetail` `layoutWritable` |
| 调用 | `exam-layout-designer` |
| 行为 | `buildLayoutDesignPhaseSteps` → 完成/锁定/当前；只读 `UiTag` |

**Impeccable：** 在线制卷四阶段真源导航（相对旧 `LayoutDesignPhaseRail`）。  
**Finesse：** 单行 track + 完成计数，spectacle 低。  
**Taste：** 无营销「旅程」文案；锁定态用 Lock 图标而非灰掉整页。  

**判定：OK**  
**动作：** 保持为制卷阶段唯一 rail。  
**禁：** 再叠一层 `LayoutDesignPhaseRail` 双轨。

---

## 254. `MarkingBatchScoreDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkingBatchScoreDrawer.vue` |
| 行数 | ~239 |
| Props | `open` `examId` `groupId` `layoutQuestionId` + 选中任务 |
| 调用 | `marking-task-pool` |
| 行为 | 预检 → confirm → 分块提交；`UiAlertStrip` 批注告警；进度条 |

**Impeccable：** 同题组批量给分闭环，失败/告警不吞。  
**Finesse：** 420 宽 drawer，表单竖排，操作密度合适。  
**Taste：** 无 KPI 装饰；主 CTA「预检并提交」语义清楚。  

**判定：OK**  
**动作：** 保持预检门槛。  
**禁：** 跳过预检直接批量写分。

---

## 255. `ScanDeviceCardGrid.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/ScanDeviceCardGrid.vue` |
| 行数 | 258 |
| Props | `devices` `loading` `selectedDeviceId` |
| 调用 | `scan-live-monitor` |
| Token | `--dp-*` + ant success/warning 背景；在线 pulse 动画 |
| 行为 | 严格枚举批次状态；空态「当前无扫描端」 |

**Impeccable：** 本考试扫描端选择网格，心跳/待上传/Agent 版本可读。  
**Finesse：** 3 列卡略偏「状态墙」；在线绿底 + pulse 动效偏吵（MOTION>2）。  
**Taste：** 无英文 eyebrow；选中双描边可接受。  

**判定：TUNE**  
**动作：** 去掉无限 pulse，或仅选中项轻提示；在线态用左边条/Tag，勿整卡染色。  
**禁：** 把 kiosk 暗色皮肤抄进 Web 监控页。

---

## 256. `DrilldownBreadcrumb.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/admin/DrilldownBreadcrumb.vue` |
| 行数 | 95 |
| Props | `levels: {key,label}[]` |
| Emits | `navigate(index)` |
| 调用 | **ZERO**（仅 `components.d.ts`） |
| 行为 | 校→院→专业→班回退，不绑 router path |

**Impeccable：** 管理端学情钻取面包屑合同完整，但无挂载点。  
**Finesse：** 行内按钮链，密度对。  
**Taste：** 干净；死代码风险。  

**判定：DEAD?**  
**动作：** 挂到真实钻取页或删除；删除前再核动态 import。  
**禁：** 未接线前当「已交付钻取 IA」写文档。

---

## 257. `ArchiveEvaluationExportProgressDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveEvaluationExportProgressDialog.vue` |
| 行数 | ~173 |
| Props | `open` `taskId` `volumeCount?` |
| 调用 | **ZERO** |
| 行为 | 轮询 `getEvaluationExportProgress`；完成自动 `downloadFile`；活跃态关窗二次确认 |

**Impeccable：** 评建导出进度合同完整，却无页面引用。  
**Finesse：** Modal+Progress 克制。  
**Taste：** 无营销。  

**判定：DEAD?**  
**动作：** 接到评建导出入口，或删除并改走通用导出任务页。  
**禁：** 并行再造第二套导出进度弹窗。

---

## 258. `ArchivePackageEventTimeline.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchivePackageEventTimeline.vue` |
| 行数 | ~117 |
| Props | `events: ArchiveVolumeExamArchivePackageEventVO[]` |
| 调用 | **ZERO** |
| 对照 | 现网用 `ArchivePackageTimeline`（steps VO）于 `archive-volume-exam-progress` |

**Impeccable：** 事件流时间线与现网 `ArchivePackageTimeline`（步骤轨）合同不同，属分叉遗留。  
**Finesse：** 点线时间线清晰。  
**Taste：** OK，但双实现。  

**判定：DEAD?**  
**动作：** 确认后端是否仍返回 event 列表；否则删本文件，只留 Timeline steps。  
**禁：** 同页叠两套归档时间线。

---

## 259. `ArchiveRelatedLinksCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/archive-volume/ArchiveRelatedLinksCard.vue` |
| 行数 | 72 |
| Emits | `exports` |
| 调用 | **ZERO** |
| 结构 | `WorkbenchSurfaceCard` + 单条「导出任务」说明 |

**Impeccable：** 归档相关能力导览卡，信息量薄且未挂载。  
**Finesse：** 单卡单动作，spectacle 低。  
**Taste：** 文案偏说明书。  

**判定：DEAD?**  
**动作：** 并入考试进度页侧栏或删。  
**禁：** 再加多条「相关能力」营销列表。

---

## 260. `StatusBadge.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/common/StatusBadge.vue` |
| 行数 | 48 |
| Props | `label` `variant`（`STATUS_VARIANT_STYLES` inline color） |
| 调用 | **ZERO** |
| 对照 | 工作台真源为 `UiTag` + tone map |

**Impeccable：** 旁路状态徽标，与 `UiTag`/strict-enum 双轨。  
**Finesse：** pill + radius-full。  
**Taste：** inline style 色表，易漂出 `--dp-*`。  

**判定：DEAD?**  
**动作：** 删除；状态一律 `UiTag` + 枚举 tone。  
**禁：** 新业务再引 `StatusBadge`。

---

## 261. `AiAnalysisConfigCollapse.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisConfigCollapse.vue` |
| 行数 | ~32 |
| Props | `title` `defaultExpanded` |
| 调用 | **ZERO** |
| 对照 | 现网卡片用 `AiAnalysisMetaCollapse` |

**Impeccable：** 纯展开壳，无分析语义。  
**Finesse：** 无增量。  
**Taste：** —  

**判定：DEAD?**  
**动作：** 删；配置区直接用表单段或现有 Meta 折叠。  
**禁：** 为「看起来成组」再包一层空 collapse。

---

## 262. `AiAnalysisRangeForm.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisRangeForm.vue` |
| 行数 | ~20 |
| Props | `hint?` |
| 调用 | **ZERO** |
| 结构 | slot + 底部 hint 段落 |

**Impeccable：** 无字段合同的 slot 壳。  
**Finesse：** 零结构增量。  
**Taste：** —  

**判定：DEAD?**  
**动作：** 删；范围筛选直接落在卡片/页内。  
**禁：** 用空壳假装「分析范围」产品块。

---

## 263. `AnalysisNextSteps.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AnalysisNextSteps.vue` |
| 行数 | ~50 |
| 调用 | **ZERO** |
| 行为 | 硬编码三跳：考试列表 / 批改审计 / 阅卷总览 |

**Impeccable：** 「下一步」导航与当前分析上下文无关，且未挂载。  
**Finesse：** 三格按钮墙，偏营销导流。  
**Taste：** VARIANCE 偏高。  

**判定：DEAD?**  
**动作：** 删；需要导流时用页内真实 CTA（回考试工作台等）。  
**禁：** AI 分析页底部固定「下一步行动」营销栅格。

---

## 264. `AnalysisOrgScopeBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/AnalysisOrgScopeBar.vue` |
| 行数 | ~152 |
| Models | `departmentId` `courseId` `classId` |
| 调用 | **ZERO** |
| 行为 | 复用 quality `Department/Course/ClassSelector`；`requireOrgScope` 禁「全部」 |

**Impeccable：** 学情组织范围条合同完整，但无消费者；AI 分析现用其它 scope。  
**Finesse：** 三选平行，密度对。  
**Taste：** 勿与 `PortfolioScopeHeader` / `QualityScopeChrome` 混壳。  

**判定：DEAD?**  
**动作：** 接到管理端学情钻取再启用，否则删以免与 quality 选择器双入口。  
**禁：** mark AI 页误用 portfolio/quality Scope 壳。

---

## 265. `LayoutIdentitySetupStrip.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/LayoutIdentitySetupStrip.vue` |
| 行数 | ~67 |
| Props | `document` `detecting` `readonly` |
| 调用 | **ZERO** |
| 行为 | 源文件模式且无身份块 → dense `UiAlertStrip` + 添加学号填涂区 |

**Impeccable：** 身份填涂门禁文案正确，却未挂到制卷工作台。  
**Finesse：** dense strip + 双按钮，符合紧凑门禁偏好。  
**Taste：** 无大色块 Alert。  

**判定：DEAD?**  
**动作：** 挂到 `LayoutDesignSourcePhase` / 校验阶段，或确认逻辑已内联后删除。  
**禁：** 用全宽粉黄大门禁替换此 dense 模式。

---

## 266. `LayoutDesignPhaseRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/layout-designer/workbench/LayoutDesignPhaseRail.vue` |
| 行数 | ~116 |
| Props | `phase` `isPhaseAccessible` `phaseLockReason` `embedded` `showTitle` |
| 调用 | **ZERO** |
| 对照 | 现网 `LayoutDesignWorkflowRail` |

**Impeccable：** 旧阶段按钮轨，已被 WorkflowRail 取代。  
**Finesse：** 标题块「在线制卷 · …」略说明书。  
**Taste：** 双轨风险。  

**判定：DEAD?**  
**动作：** 删除，只保留 WorkflowRail。  
**禁：** 两轨并存。

---

## 267. `MarkExamStageRail.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/MarkExamStageRail.vue` |
| 行数 | 41 |
| 调用 | **ZERO** |
| 行为 | 薄包 `StageRail` + `navigateToMarkStage`；读 `markStage` store |

**Impeccable：** 考试阶段轨壳；现网多用 `ExamJourneyRail` / Context 旅程，本组件无挂载。  
**Finesse：** 无增量（壳）。  
**Taste：** —  

**判定：DEAD?**  
**动作：** 确认旅程 IA 真源后删除或并入唯一 StageRail 入口。  
**禁：** 再加第三套考试阶段条。

---

## 268. `PortfolioArchiveVersionComparePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/portfolio/PortfolioArchiveVersionComparePanel.vue` |
| 行数 | 263 |
| Props | `versions` `defaultLeftId` `defaultRightId` · `v-model:open` |
| 调用 | `portfolio/archive-category-edit` |
| Token | `--dp-*` 带 `#d9d9d9/#666/#999` 回落；原生 `<select>` |
| 行为 | `compareVersions` API；strict-enum 状态/变更类型；失败 `showUserError` |

**Impeccable：** 档案袋版本 diff 抽屉，API 合同与证据引用齐全。  
**Finesse：** 880 宽 + 表密度好；工具条原生 select 与 Ui 控件不齐。  
**Taste：** 双空态文案「暂无内容」过宽；非假成功。  

**判定：TUNE**  
**动作：** 原生 select → Ui 选择器；去掉 hex 回落；空态区分「未对比 / 无差异」。  
**禁：** 与 mark 归档卷版本语义混名。

---

## 269. `AccreditationWorkflowHints.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/accreditation/AccreditationWorkflowHints.vue` |
| 行数 | 144 |
| Props | `cycle` `supportConfirmed` `annualPlanCount` `evidenceCount` |
| 调用 | **ZERO** |
| 行为 | 按认证周期状态推下一步 + `go-tab` 动作 |

**Impeccable：** 认证工作台下一步提示逻辑完整，未挂载。  
**Finesse：** 列表+按钮，可做紧凑条。  
**Taste：** 勿做成 KPI 墙。  

**判定：DEAD?**  
**动作：** 挂到认证工作台顶栏，或逻辑内联后删文件。  
**禁：** quality 页误用考试 `ContextBar`。

---

## 270. `TableBody.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableBody.vue` |
| 行数 | 10 |
| 调用 | **ZERO**（列表真源 `UiDataTable`） |
| 结构 | `<tbody>` + slot |

**Impeccable：** 原生表碎片，未被组合。  
**Finesse：** —  
**Taste：** —  

**判定：DEAD?**  
**动作：** 与 Table* 族一并清理，或证明有原生表组装页。  
**禁：** 新列表绕开 `UiDataTable`。

---

## 271. `TableCell.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableCell.vue` |
| 行数 | 10 |
| 调用 | **ZERO** |
| 结构 | `<td>` + slot |

**Impeccable：** 同上。  
**Finesse：** —  
**Taste：** —  

**判定：DEAD?**  
**动作：** 同 Table 族清理。  
**禁：** 新造原生 Table 碎片轨。

---

## 272. `TableHeader.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableHeader.vue` |
| 行数 | 10 |
| 调用 | **ZERO** |
| 结构 | `<thead>` + slot |

**Impeccable：** 同上。  
**Finesse：** —  
**Taste：** —  

**判定：DEAD?**  
**动作：** 同 Table 族清理。  
**禁：** 与 `UiDataTable` 并行维护表头碎片。

---

## 273. `TableRow.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/ui-guide/ui/TableRow.vue` |
| 行数 | 10 |
| 调用 | **ZERO**（注册名 `UiTableRow`） |
| 结构 | `<tr class="ui-table__row">` + `$attrs` + slot |

**Impeccable：** 纯透传壳，无行态语义。  
**Finesse：** —  
**Taste：** —  

**判定：SHELL**  
**动作：** 删除；需要原生 tr 时直接写。  
**禁：** 为「分层」保留无语义 Table 碎片。

---

## 274. `KioskLayout.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/KioskLayout.vue` |
| 行数 | 250 |
| 调用 | kiosk 路由父级 |
| 行为 | 提供 workflow/mutex/stage；AppBar/StageBar/闸门/抽屉 |

**Impeccable：** 一体机持久壳，考试绑定闸门与阶段机齐全。  
**Finesse：** 操作台密度优先，允许 kiosk 专用视觉。  
**Taste：** **勿把暗色/大触控抄回 Web mark 工作台。**  

**判定：OK**  
**动作：** 保持 Agent/考试绑定合同。  
**禁：** Web `StageWorkbenchShell` 套用 kiosk 暗色。

---

## 275. `BindStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/BindStage.vue` |
| 行数 | 199 |
| 行为 | 考试绑定阶段 UI |

**Impeccable：** 一体机绑定入口，阶段职责清楚。  
**Finesse：** 触控优先密度。  
**Taste：** Web 勿抄。  

**判定：OK**  
**动作：** 保持。  
**禁：** 绑定失败静默当成功。

---

## 276. `HistoryStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/HistoryStage.vue` |
| 行数 | 1177 |
| 行为 | 批次历史/台账阶段（大体量） |

**Impeccable：** 历史台账阶段承载扫描回溯。  
**Finesse：** 文件偏大，后续实现时按操作簇拆，而非营销分区。  
**Taste：** kiosk 专用。  

**判定：OK**  
**动作：** 保持合同；体积债记实现波次。  
**禁：** 把历史表搬进 Web 却保留 kiosk 暗色 token。

---

## 277. `ReviewStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/ReviewStage.vue` |
| 行数 | 1067 |
| Token | 含短 hex 片段（信号扫描见 `#defa`） |

**Impeccable：** 复核/确认阶段。  
**Finesse：** 大体量操作面。  
**Taste：** 核对硬编码色是否偏离 kiosk 设计令牌。  

**判定：OK**  
**动作：** 实现波次再收 hex；本轮只审。  
**禁：** Web 批阅壳复用本阶段样式。

---

## 278. `ScanningStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/ScanningStage.vue` |
| 行数 | 1169 |
| 行为 | 扫描进行中主操作面 |

**Impeccable：** 扫描主阶段，与 Agent 页流对齐。  
**Finesse：** 高密度操作优先。  
**Taste：** kiosk 域。  

**判定：OK**  
**动作：** 保持。  
**禁：** 扫描失败假成功。

---

## 279. `SetupStage.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/stages/SetupStage.vue` |
| 行数 | 1077 |
| 行为 | 设备/考试准备阶段 |

**Impeccable：** 开机准备阶段。  
**Finesse：** 大体量可接受于 kiosk。  
**Taste：** Web 勿抄。  

**判定：OK**  
**动作：** 保持。  
**禁：** Setup 与 Bind 职责混页导致闸门失效。

---

## 280. `UiPlatformFileField.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/platform/UiPlatformFileField.vue` |
| 行数 | 142 |
| Props | `sceneKey` `accept` `buttonText` `tip` `disabled` `removable` |
| 调用 | **21+**（archive/portfolio/quality） |
| Token | `--dp-*` |

**Impeccable：** 平台文件字段真源，按 sceneKey 上传。  
**Finesse：** 单行控件密度对。  
**Taste：** 无装饰。  

**判定：OK**  
**动作：** 保持为跨域上传入口。  
**禁：** 页内再造平行 Upload 而不走 sceneKey。

---

## 281. `AiEditor/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/AiEditor/index.vue` |
| 行数 | 159 |
| Props | `editable` `placeholder` `options` |
| 调用 | `NoticePopup` · `config/aieditor` |

**Impeccable：** 富文本编辑壳，消息等场景复用。  
**Finesse：** 编辑器本体 spectacle 由库决定，外壳克制。  
**Taste：** 勿当营销落地编辑器展示。  

**判定：OK**  
**动作：** 保持。  
**禁：** 在批阅主链用 AI 编辑器冒充评分合同。

---

## 282. `AjCaptcha/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/AjCaptcha/index.vue` |
| 行数 | 637 |
| Props | `captchaType` |
| 调用 | login `account` / `student` |

**Impeccable：** 登录验证码，边界组件。  
**Finesse：** 体积大但属第三方交互。  
**Taste：** 勿进工作台壳。  

**判定：OK**  
**动作：** 保持登录域。  
**禁：** 工作台内嵌验证码皮肤。

---

## 283. `AuthLayout/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/AuthLayout/index.vue` |
| 行数 | 335 |
| Props | `showFooter` `wide` |
| 调用 | `forgot-password` · `cas-first-login-completion` |

**Impeccable：** 认证页布局壳，与 StageWorkbench 分离正确。  
**Finesse：** 独立办理页尺度可大于工作台。  
**Taste：** 防与 ContextBar 双标题（同 Batch01 UiPageHeader 边界）。  

**判定：OK**  
**动作：** 仅 auth 流使用。  
**禁：** portfolio/quality/exam 工作台套 AuthLayout。

---

## 284. `Breadcrumb/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/Breadcrumb/index.vue` |
| 行数 | 139 |
| 调用 | `layout/components/Header` |
| 行为 | 路由面包屑；home 优先 teacher dashboard/exam-list |

**Impeccable：** 顶栏路径导航，与学情 `DrilldownBreadcrumb` 职责不同。  
**Finesse：** transition-group 轻微，可接受。  
**Taste：** 无营销。  

**判定：OK**  
**动作：** 保持。  
**禁：** 用路由面包屑冒充学情钻取层级。

---

## 285. `CellCopy/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/CellCopy/index.vue` |
| 行数 | 26 |
| Props | `content` |
| 调用 | **ZERO** |
| 结构 | `a-typography-paragraph` copyable 薄包 |

**Impeccable：** 无业务增量的复制单元格壳。  
**Finesse：** —  
**Taste：** —  

**判定：DEAD?**  
**动作：** 删；需要时直接用 Typography copyable（如 MetaCollapse 已做）。  
**禁：** 为表格再引一层 CellCopy。

---

## 286. `GiFooter/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/GiFooter/index.vue` |
| 行数 | 29 |
| 调用 | `LayoutDefault` |
| 行为 | `appStore` 版权/备案文案 |

**Impeccable：** 平台页脚，有配置语义（非纯透传）。  
**Finesse：** 40px 单行。  
**Taste：** 中性。  

**判定：OK**  
**动作：** 保持。  
**禁：** 工作台内容区再叠第二页脚。

---

## 287. `GiPageLayout/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/GiPageLayout/index.vue` |
| 行数 | 246 |
| 调用 | **ZERO** |
| 结构 | 左树右表 split + 折叠；与 `StageWorkbenchShell` 平行的旧布局 |

**Impeccable：** 历史 Gi 布局，现网工作台未用。  
**Finesse：** 响应式 split 完整但属遗留 IA。  
**Taste：** 勿与三域 Scope 壳混用。  

**判定：DEAD?**  
**动作：** 确认无动态挂载后删除，统一 Stage/Scope 壳。  
**禁：** 新页再引 GiPageLayout。

---

## 288. `UiPlatformExcelImportModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/platform/UiPlatformExcelImportModal.vue` |
| 行数 | 660 |
| Props | `open` `sceneKey` `entityLabel` `context` `requirements` … |
| 调用 | **14+**（portfolio/quality/archive 外部导入等） |

**Impeccable：** Excel 批量导入真源（错误表/预览/部分提交合同）。  
**Finesse：** 模态密度高，符合导入任务。  
**Taste：** **归档材料登记不得冒充本模态**（名册≠归档材料）。  

**判定：OK**  
**动作：** 保持名册/指标等导入；归档材料走专用登记。  
**禁：** archive-volume 材料入库复用本模态冒充。

---

## 289. `student/index.vue`（登录）

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/student/index.vue` |
| 行数 | 356 |
| Props | `subdomainMode` `subdomainTenant` `prefillData` |
| 行为 | 学生登录表单 + AjCaptcha |

**Impeccable：** 登录子面板，非阅卷工作台。  
**Finesse：** 表单密度正常。  
**Taste：** auth 域，勿套工作台壳。  

**判定：OK**  
**动作：** 保持。  
**禁：** 登录页堆 KPI/营销卡。

---

## 290. `AiAnalysisMetaCollapse.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/mark/analysis/AiAnalysisMetaCollapse.vue` |
| 行数 | ~70 |
| Props | `record` `failureFallback` `extraItems?` |
| 调用 | **9** AI 分析卡片 |
| 行为 | 状态 Tag + 展开诊断（耗时/trace/error）；失败文案可见 |

**Impeccable：** 分析记录诊断折叠真源，替代空 ConfigCollapse。  
**Finesse：** 默认收起，展开后 denselist。  
**Taste：** 无假达成；错误段落保留。  

**判定：OK**  
**动作：** 保持为卡片统一诊断入口。  
**禁：** 失败时折叠藏错或改写成「暂无数据」假空。

---

## Batch 18 小结

| 判定 | # | 路径要点 |
|------|---:|----------|
| OK | 18 | 制卷入口/WorkflowRail、批量给分、kiosk 壳与阶段、平台文件/Excel、登录/Auth、MetaCollapse、GiFooter、Breadcrumb、AiEditor、AjCaptcha |
| TUNE | 3 | OCR detail token、ScanDeviceCardGrid 动效染色、Portfolio 版本对比原生 select |
| SHELL | 1 | `TableRow` |
| DEAD? | 18 | 钻取面包屑、评建导出进度、EventTimeline、RelatedLinks、StatusBadge、AI 空壳族、旧 PhaseRail/IdentityStrip/MarkExamStageRail、认证 Hints、TableBody/Cell/Header、CellCopy、GiPageLayout |

**相对上一版：** 纠正 `GiFooter` 为在用 OK；`CellCopy`/`GiPageLayout` 改为 DEAD?；明确 `ArchivePackageEventTimeline` 与现网 `ArchivePackageTimeline` 分叉；`LayoutDesignWorkflowRail` 为制卷阶段真源。
