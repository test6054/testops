# 组件手审账 · Batch 05（控件 / 抽屉确认 / 工作面 / 看片 / 归档侧栏 / 矩阵）

> 逐文件 Read · Impeccable · Finesse · Taste · frontend-design-mark  
> 禁脚本生成结论 · 2026-07-16

## 36–37. `Button.vue` 与 `UiButton.vue`

| 项 | 事实 |
|----|------|
| 两者 | `defineOptions({ name: 'UiButton' })`，模板结构几乎相同（`dp-btn`） |
| 路径 | `ui-guide/ui/Button.vue` · `ui-guide/ui/UiButton.vue` |

**Impeccable：** 双文件同名原语 → 维护分叉与 import 漂移风险。  
**Finesse：** 无语义增量的重复。  
**Taste：** 无视觉差问题，是合同卫生问题。  

**判定：REWORK（合并）**  
**动作：** 保留唯一实现文件，另一路径删除并改全部 import；禁止继续双轨。  
**禁：** 再增第三份 Button 别名。

---

## 38. `UiTag`（`Tag.vue`）

| 项 | 事实 |
|----|------|
| Props | tone / empty / size / variant soft\|outline |
| Token | `--dp-*-50/200/700` 色阶 |

**判定：OK**  
**动作：** 状态展示必须配 strict-enum tone map。  
**禁：** 页内硬编码色 Tag。

---

## 39. `UiDrawer.vue`

| 项 | 事实 |
|----|------|
| 默认 | `hideFooter: true`；宽 640；自定义 header/body/footer |
| Emits | ok 与 confirm 双发 |

**Impeccable：** 核验/详情抽屉合适；双 emit 需调用方只订一个。  
**Finesse：** 右抽屉符合工作台。  
**Taste：** 关闭用「×」字符，可接受。  

**判定：OK / emit TUNE**  
**动作：** 文档约定只监听 `ok` 或只 `confirm`。  
**禁：** 用 Drawer 做整页向导（应用独立页）。

---

## 40. `UiConfirmDialog.vue`

| 项 | 事实 |
|----|------|
| 基于 | `UiDialog` + type 图标；error → destructive 主按钮 |
| 默认 title | 「提示」偏泛 |

**Impeccable：** 危险操作用 type=error 正确。  
**Finesse：** 宽度 440 合适。  
**Taste：** 默认「提示」应被调用方覆盖为业务句。  

**判定：OK**  
**动作：** 跨身份写操作必须带目标教师姓名；禁默认「提示」。  
**禁：** 用 message.confirm 绕过本组件做危险写。

---

## 41. `UiBatchActionBar.vue`

| 项 | 事实 |
|----|------|
| Props | selectedCount / selectionLabel / description / muted |
| 样式 | `background: #fff` 硬编码 |

**Impeccable：** 选择态摘要清楚。  
**Finesse：** 跟随表格选择的正确原语。  
**Taste：** `#fff` → `--dp-surface`。  

**判定：TUNE**  
**动作：** 去硬编码白；无选择时调用方应隐藏本条。  
**禁：** 无选中仍常驻批量条。

---

## 42. `WorkbenchSurfaceCard.vue`

| 项 | 事实 |
|----|------|
| 槽 | head / toolbar / body；flush 贴边 |
| Token | surface + border + shadow-sm |

**Impeccable：** L0/扫描中心推荐壳。  
**Finesse：** 轻阴影，工作台可接受。  
**Taste：** OK。  

**判定：OK**  
**动作：** 表格区用 flush。  
**禁：** 嵌套 WorkbenchSurfaceCard。

---

## 43. `ScanImageStage.vue`

| 项 | 事实 |
|----|------|
| 注释 | 浅色看片台；对齐 kiosk 但不深色化 Web |
| 能力 | 缩放/旋转/灰度/平移；ROI；涉密水印与禁右键 |

**Impeccable：** 空 src 空态；水印合同完整。  
**Finesse：** 影像优先，工具压缩。  
**Taste：** 明确拒绝深色看片——符合主题锁。  

**判定：OK**  
**动作：** 保持浅色；URL 仍由父级 blob。  
**禁：** Web 端改暗色监控画布。

---

## 44. `ArchiveVolumeSubSidebar.vue`

| 项 | 事实 |
|----|------|
| 结构 | 返回列表 → 卷标题/状态点 → 归档阶段导航 → 卷状态 meta |
| warn | chainStatus=warn 导航项 |

**Impeccable：** 与 Portfolio 侧栏分离正确（mark 归档卷）。  
**Finesse：** 阶段导航 + 状态 meta 密度合适。  
**Taste：** OK。  

**判定：OK**  
**动作：** 勿混用 PortfolioScope / QualityScope。  
**禁：** 材料登记用名册 Excel 模态冒充归档登记。

---

## 45. `MatrixWorkbench.vue`

| 项 | 事实 |
|----|------|
| 能力 | 行列矩阵、loading/empty、行/格点击、warning 行、summary 列 |
| 场景 | 质量 OBE 支撑矩阵等 |

**Impeccable：** 空行列有 UiEmpty；warning 可见。  
**Finesse：** 横向滚动矩阵是 operate 正确形态。  
**Taste：** 无装饰 KPI。  

**判定：OK**  
**动作：** 单元格色仅表达业务态（达成/缺口），禁彩虹装饰。  
**禁：** 矩阵外再叠同权三列 KPI。

---

## Batch 05 汇总

| 组件 | 判定 |
|------|------|
| Button.vue + UiButton.vue | **REWORK** 合并双轨 |
| UiTag | OK |
| UiDrawer | OK |
| UiConfirmDialog | OK |
| UiBatchActionBar | TUNE（#fff） |
| WorkbenchSurfaceCard | OK |
| ScanImageStage | OK |
| ArchiveVolumeSubSidebar | OK |
| MatrixWorkbench | OK |

累计手审约 **45**。

## 下一批

`StageRail` / `ExamJourneyRail` / `WorkflowReadinessPanel` · `UiStateBlock` · `UiPagination` · `PortfolioTeacherJourneyRail` · `QualityObeJourneyStrip` · scanner-ops 面板族
