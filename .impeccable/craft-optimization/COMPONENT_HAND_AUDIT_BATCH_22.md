# 组件手审账 · Batch 22

> 方法：逐文件 Read 源码 + 路径限定引用核对（排除 `components.d.ts`）。  
> Skills：**Impeccable product** · **Finesse product** · **Taste audit-only**  
> Gate：**frontend-design-mark**（`#1677ff` · 浅色 · `--dp-*` · 禁营销壳）  
> 禁令：结论禁止由扫描脚本生成。  
> Date: 2026-07-16（深审重写 · 去掉机械套话）

## Design Read（本批）

Reading this as: **marking-org admin / quality indirect-eval / kiosk chrome / AI analysis tabs / auth login**, product workbench — login may use light atmosphere, not kit demos.

| Dial | Value |
|------|------:|
| Taste VARIANCE / MOTION / DENSITY | 3 / 2 / 8 |
| Finesse SPECTACLE / DENSITY | 2 / 8 |
| Impeccable register | product |

---

## 411. `ProgramEvaluationProfileSelector.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/quality/selectors/ProgramEvaluationProfileSelector.vue` |
| 行数 | 149 |
| 调用 | quality/selectors barrel |

**Impeccable：** 专业评价档案选择器，quality 域。  
**Finesse：** 选择器密度正常。  
**Taste：** 禁考试 ContextBar。  

**判定：OK**  
**动作：** 保持。  
**禁：** 与 portfolio 教师选择混壳。

---

## 412. `SchoolAutocomplete.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/SchoolAutocomplete.vue` |
| 行数 | 170 |
| 调用 | login student |

**Impeccable：** 登录/租户学校联想。  
**Finesse：** auth 表单密。  
**Taste：** 勿进工作台壳。  

**判定：OK**  
**动作：** 保持 auth 域。  
**禁：** 工作台再造平行学校选择器无合同。

---

## 413. `UiErrorBoundary.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/UiErrorBoundary.vue` |
| 行数 | 31 |
| 调用 | App.vue |
| 行为 | `onErrorCaptured` → `ErrorPage`；路由变化重置 |

**Impeccable：** 渲染错误边界，失败可见（非空壳透传）。  
**Finesse：** 最小实现。  
**Taste：** 好。  

**判定：OK**（纠正原 SHELL）  
**动作：** 保持挂 App。  
**禁：** catch 后静默吞错继续白屏。

---

## 414. `ExamSidebarExamSwitch.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/ExamSidebarExamSwitch.vue` |
| 行数 | 105 |
| 调用 | ExamSubSidebar |
| 行为 | 展示名/编号/状态点（非真正 switch 控件） |

**Impeccable：** 侧栏考试身份摘要；名含 Switch 但职责是展示。  
**Finesse：** 密。  
**Taste：** 状态点映射 tone，干净。  

**判定：OK**  
**动作：** 命名可后续改为 Summary（实现波次）。  
**禁：** 在此组件内嵌完整考试列表弹层再造双入口。

---

## 415. `GlobalConfirmDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `components/workbench/GlobalConfirmDialog.vue` |
| 行数 | 39 |
| 调用 | App.vue |
| 行为 | `confirmAsync` 宿主 → `UiConfirmDialog` |

**Impeccable：** 全局确认边界，注释明确禁页内直挂。  
**Finesse：** 薄宿主，有状态桥接语义。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 业务只走 `confirmAsync`。  
**禁：** 页内再挂第二套 Confirm。

---

## 416. `FormalSessionCreateDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/FormalSessionCreateDialog.vue` |
| 行数 | 198 |
| 调用 | formal-sessions |
| 结构 | 含 `SessionGroupCreateSummary` |

**Impeccable：** 正评场次创建。  
**Finesse：** 对话框密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持就绪摘要。  
**禁：** 未就绪可创建成功。

---

## 417. `FormalSessionDetailDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/FormalSessionDetailDrawer.vue` |
| 行数 | 146 |
| Token | `--dp-*` |
| 调用 | FormalSessionWorkbench |

**Impeccable：** 正评场次详情抽屉。  
**Finesse：** 146 行克制。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 详情堆营销 KPI。

---

## 418. `FormalSessionWorkbench.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/FormalSessionWorkbench.vue` |
| 行数 | 509 |
| 调用 | formal-sessions |
| 结构 | 含 `WorkflowPrerequisiteEmpty` |

**Impeccable：** 正评场次工作台，前置空态好样板复用。  
**Finesse：** 509 行可接受。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持前置 empty。  
**禁：** 换大粉黄 Alert 占满。

---

## 419. `MarkingOrgAssignmentTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgAssignmentTable.vue` |
| 行数 | 282 |
| 调用 | marking-organization/detail |

**Impeccable：** 分配明细表。  
**Finesse：** 表密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未知状态灰「未知」。

---

## 420. `MarkingOrgGroupProgressList.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgGroupProgressList.vue` |
| 行数 | 206 |
| 调用 | detail |

**Impeccable：** 题组进度列表。  
**Finesse：** 密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 进度假 100%。

---

## 421. `MarkingOrgReviewerRosterTable.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgReviewerRosterTable.vue` |
| 行数 | 237 |
| 调用 | detail |

**Impeccable：** 阅卷员名册表。  
**Finesse：** 表密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 与考试考生名册 Excel 模态混用无场景区分。

---

## 422. `MarkingOrgStrategySummaryCard.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/MarkingOrgStrategySummaryCard.vue` |
| 行数 | 177 |
| 调用 | detail |
| 结构 | dl 策略字段 + 说明 footer；匿名/回收策略可见 |

**Impeccable：** 分配策略摘要，非装饰 KPI。  
**Finesse：** 定义列表密度好。  
**Taste：** 好。  

**判定：OK**  
**动作：** 保持。  
**禁：** 改成四格同权统计卡。

---

## 423. `RecycledTaskReassignPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/RecycledTaskReassignPanel.vue` |
| 行数 | 196 |
| 调用 | detail |

**Impeccable：** 回收任务重分配。  
**Finesse：** 密。  
**Taste：** `--dp-*`。  

**判定：OK**  
**动作：** 保持确认流。  
**禁：** 无确认批量重派。

---

## 424. `TrialSessionCalibrateDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/TrialSessionCalibrateDrawer.vue` |
| 行数 | 124 |
| 调用 | TrialSessionWorkbench |

**Impeccable：** 试评定标抽屉。  
**Finesse：** 124 行克制。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 定标失败假完成。

---

## 425. `TrialSessionCreateDialog.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/TrialSessionCreateDialog.vue` |
| 行数 | 160 |
| 调用 | trial-sessions |

**Impeccable：** 试评场次创建。  
**Finesse：** 密。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持摘要门槛。  
**禁：** 与正评创建合同分叉无文档。

---

## 426. `TrialSessionWorkbench.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/admin/marking-organization/components/TrialSessionWorkbench.vue` |
| 行数 | 404 |
| 调用 | trial-sessions |

**Impeccable：** 试评工作台 + 前置 empty。  
**Finesse：** 404 行。  
**Taste：** 干净。  

**判定：OK**  
**动作：** 保持。  
**禁：** 大门禁色块。

---

## 427. `account/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/account/index.vue` |
| 行数 | 363 |
| 调用 | login/index |
| Token | 含 `rgba(37, 99, 235, 0.15)` 边框（非 `#1677ff`） |

**Impeccable：** 账号登录面板 + AjCaptcha。  
**Finesse：** 表单密。  
**Taste：** 边框蓝阶偏 Tailwind。  

**判定：TUNE**  
**动作：** 边框改 `color-mix(... var(--ant-color-primary) ...)`。  
**禁：** 登录页堆 KPI。

---

## 428. `background/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/background/index.vue` |
| 行数 | 51 |
| 调用 | pwdExpired 等 |
| 行为 | 三枚 primary color-mix 光斑，pointer-events none |

**Impeccable：** auth 氛围底，未进工作台。  
**Finesse：** spectacle 低。  
**Taste：** 用品牌主色 mix，可接受于登录。  

**判定：OK**  
**动作：** 勿复制到 exam/portfolio/quality 工作台。  
**禁：** 工作台背景 orb。

---

## 429. `modifyPassword/index.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/login/components/modifyPassword/index.vue` |
| 行数 | 146 |
| Token | `--dp-*` |
| 调用 | pwdExpired |

**Impeccable：** 改密子面板。  
**Finesse：** 表单密。  
**Taste：** auth 域。  

**判定：OK**  
**动作：** 保持。  
**禁：** 工作台套 AuthLayout 大页头叠 ContextBar。

---

## 430. `ImportResponseDocumentModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/ImportResponseDocumentModal.vue` |
| 行数 | 476 |
| 调用 | IndirectResponseReviewPanel |
| Token | `--dp-*` |

**Impeccable：** 间接评价答卷文档导入（非名册 Excel 唯一入口；另有 Platform Excel）。  
**Finesse：** 476 行。  
**Taste：** quality 域。  

**判定：OK**  
**动作：** 保持与 Excel 导入分场景。  
**禁：** 归档材料登记冒充本模态。

---

## 431. `IndirectResponseReviewPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/indirect-evaluation/IndirectResponseReviewPanel.vue` |
| 行数 | 1143 |
| 调用 | indirect-evaluation |
| 结构 | `detail-table-card` 类名；Excel+文档导入；转换审计 |

**Impeccable：** 答卷审核/转换主面板，失败与有效性标志齐全。  
**Finesse：** **1143 行过重**，宜拆列表/编辑/审计。  
**Taste：** 去遗留 `detail-table-card` 皮肤类。  

**判定：TUNE**  
**动作：** 拆分子面板；统一 surface class。  
**禁：** 转换失败假「已得分」。

---

## 432. `IndirectSurveyTemplatePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/indirect-evaluation/IndirectSurveyTemplatePanel.vue` |
| 行数 | 1654 |
| 调用 | indirect-evaluation |

**Impeccable：** 问卷模板+题目编辑，合同集中但体积失控。  
**Finesse：** **1654 行**，实现波次必拆 form/item。  
**Taste：** 双 UiCard 可接受，禁营销。  

**判定：TUNE**  
**动作：** 拆 Form 列表与 Item 编辑器。  
**禁：** 再往单文件堆第三职责。

---

## 433. `IndirectTaskDispatchPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/quality/components/indirect-evaluation/IndirectTaskDispatchPanel.vue` |
| 行数 | 766 |
| Token | `--dp-surface-muted, #fafafa` |
| 调用 | indirect-evaluation |

**Impeccable：** 任务派发与流程洞察。  
**Finesse：** 766 行偏重。  
**Taste：** hex 回落可去。  

**判定：TUNE**  
**动作：** 拆洞察卡；去掉 `#fafafa` 回落。  
**禁：** 派发失败假成功。

---

## 434. `CognitiveConfirmModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/CognitiveConfirmModal.vue` |
| 行数 | 242 |
| 调用 | KioskDispatchLanding |

**Impeccable：** 一体机认知确认（防误触）。  
**Finesse：** 触控确认密。  
**Taste：** kiosk 域，Web 勿抄。  

**判定：OK**  
**动作：** 保持。  
**禁：** Web 工作台套用同暗色确认。

---

## 435. `KioskActivationGate.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskActivationGate.vue` |
| 行数 | 56 |
| 调用 | KioskLayout |
| 结构 | 组合 `KioskDeviceActivationPanel` |

**Impeccable：** 设备激活闸门边界。  
**Finesse：** 薄组合，有闸门语义。  
**Taste：** kiosk。  

**判定：OK**  
**动作：** 保持。  
**禁：** 未激活可扫。

---

## 436. `KioskAppBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskAppBar.vue` |
| 行数 | 255 |
| 调用 | KioskLayout |
| 行为 | 考试 pill / SSE LED / 设置；切换阻断理由可见 |

**Impeccable：** 一体机顶栏真源。  
**Finesse：** 操作密度优先。  
**Taste：** Web 勿抄。  

**判定：OK**  
**动作：** 保持阻断提示。  
**禁：** 阻断时仍切换考试。

---

## 437. `KioskArchivePickPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskArchivePickPanel.vue` |
| 行数 | 241 |
| Token | `--dp-*` |
| 调用 | TaskKindHub |

**Impeccable：** 归档卷派单选卷（kiosk）。  
**Finesse：** 触控列表。  
**Taste：** 与 Web 归档列表分形态。  

**判定：OK**  
**动作：** 保持。  
**禁：** Web 归档列表抄磁贴墙。

---

## 438. `KioskBottomBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskBottomBar.vue` |
| 行数 | 408 |
| 调用 | KioskLayout |

**Impeccable：** 底栏主操作。  
**Finesse：** 大按钮密度。  
**Taste：** kiosk。  

**判定：OK**  
**动作：** 保持。  
**禁：** Web 批阅底栏抄同款。

---

## 439. `KioskExamSwitchGate.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskExamSwitchGate.vue` |
| 行数 | 124 |
| 调用 | KioskLayout |
| 结构 | 用 `KioskExamPickPanel` |

**Impeccable：** 切换考试闸门。  
**Finesse：** 密。  
**Taste：** 选中环债见 Batch19 TUNE。  

**判定：OK**  
**动作：** 保持闸门；PickPanel 色随 Batch19。  
**禁：** 无闸门直接切考。

---

## 440. `KioskHistoryLedgerDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskHistoryLedgerDrawer.vue` |
| 行数 | 519 |
| 调用 | KioskLayout |

**Impeccable：** 历史台账抽屉。  
**Finesse：** 519 行。  
**Taste：** kiosk。  

**判定：OK**  
**动作：** 保持。  
**禁：** Web 抄暗色抽屉。

---

## 441. `KioskNoticeBand.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskNoticeBand.vue` |
| 行数 | 113 |
| 调用 | KioskLayout |

**Impeccable：** 一体机通知条。  
**Finesse：** 条带密。  
**Taste：** 对齐 dense，勿大门禁。  

**判定：OK**  
**动作：** 保持。  
**禁：** 通知条改全屏营销。

---

## 442. `KioskPortfolioGapPickPanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskPortfolioGapPickPanel.vue` |
| 行数 | 221 |
| Token | `--dp-*` |
| 调用 | TaskKindHub |

**Impeccable：** 档案袋缺口采集选任务（kiosk）。  
**Finesse：** 触控列表。  
**Taste：** portfolio 任务，非 mark 归档卷。  

**判定：OK**  
**动作：** 保持分域。  
**禁：** 与归档选卷面板混合同一列表合同。

---

## 443. `KioskScanProfilePanel.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskScanProfilePanel.vue` |
| 行数 | 168 |
| 调用 | SetupStage |

**Impeccable：** 扫描配置档切换。  
**Finesse：** 密。  
**Taste：** kiosk。  

**判定：OK**  
**动作：** 保持。  
**禁：** 配置失败假成功。

---

## 444. `KioskSettingsDrawer.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskSettingsDrawer.vue` |
| 行数 | 796 |
| 调用 | KioskLayout |

**Impeccable：** 设备设置抽屉。  
**Finesse：** 796 行偏重。  
**Taste：** kiosk。  

**判定：OK**  
**动作：** 体积债记实现波次。  
**禁：** Web 设置页抄暗色。

---

## 445. `KioskStageBar.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskStageBar.vue` |
| 行数 | 134 |
| 调用 | KioskLayout |

**Impeccable：** 一体机阶段条。  
**Finesse：** 密。  
**Taste：** 勿与 Web ExamJourneyRail 混用。  

**判定：OK**  
**动作：** 保持 kiosk 阶段机。  
**禁：** Web 工作台挂本 StageBar。

---

## 446. `KioskSupplementLaunchModal.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskSupplementLaunchModal.vue` |
| 行数 | 440 |
| 调用 | SetupStage |

**Impeccable：** 补扫启动模态。  
**Finesse：** 440 行。  
**Taste：** kiosk。  

**判定：OK**  
**动作：** 保持。  
**禁：** 与 Web ManualSupplement 字段合同无文档分叉。

---

## 447. `KioskWorkbenchTabs.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/scanner-kiosk/components/KioskWorkbenchTabs.vue` |
| 行数 | 93 |
| 调用 | KioskLayout |

**Impeccable：** 一体机工作台 Tab。  
**Finesse：** 93 行克制。  
**Taste：** kiosk。  

**判定：OK**  
**动作：** 保持。  
**禁：** Web 抄同触控 Tab。

---

## 448. `AiAnalysisClusterTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisClusterTab.vue` |
| 行数 | 42 |
| 调用 | ai-analysis-center |
| 结构 | ScopePanel(壳) + ClusterWorkbench；透传 exam/class |

**Impeccable：** 聚类 Tab 编排边界，有 scope→workbench 接线。  
**Finesse：** 薄但非零语义。  
**Taste：** 干净。  

**判定：OK**（纠正原 SHELL）  
**动作：** Scope 内联 FilterBar 后本 Tab 可更薄。  
**禁：** Tab 内再包第三层壳。

---

## 449. `AiAnalysisClusterWorkbench.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisClusterWorkbench.vue` |
| 行数 | 133 |
| 调用 | ClusterTab |
| 结构 | SignalBand + WorkflowReadinessPanel + 多分析卡 |

**Impeccable：** 聚类工作台编排；就绪步骤 pending 才展示面板。  
**Finesse：** 133 行克制，好。  
**Taste：** SignalBand 非装饰 KPI 墙。  

**判定：OK**  
**动作：** 保持就绪门禁。  
**禁：** 无 exam 仍渲染假信号。

---

## 450. `AiAnalysisSchoolTab.vue`

| 项 | 事实 |
|----|------|
| 路径 | `views/teacher/ai-analysis/AiAnalysisSchoolTab.vue` |
| 行数 | 41 |
| 调用 | ai-analysis-center |
| 结构 | OrgTermScope + SchoolQuality + ExperienceEffectiveness |

**Impeccable：** 校级 Tab 编排，scope 字段下传卡片。  
**Finesse：** 薄编排。  
**Taste：** 干净。  

**判定：OK**（纠正原 SHELL）  
**动作：** 去 OrgTermScope 壳后直挂 FilterBar。  
**禁：** 混 PortfolioScopeHeader。

---

## Batch 22 小结

| 判定 | # | 要点 |
|------|---:|------|
| OK | 36 | 阅卷组织策略摘要、场次工作台、kiosk 壳族、ClusterWorkbench、ErrorBoundary/Confirm 宿主、登录 background |
| TUNE | 4 | 登录 account `rgba(37,99,235)`；间接评价三面板体积（1654/1143/766）+ 遗留 class/hex |
| 纠正 | 3 | `UiErrorBoundary`、`AiAnalysisClusterTab`、`AiAnalysisSchoolTab` 非 SHELL（有边界/编排语义） |

**对照：** 间接评价实现波次优先拆 `IndirectSurveyTemplatePanel`；AI Tab 去 Batch19 Scope 壳后直挂 FilterBar。
