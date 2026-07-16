# Critique · panorama-ai-analysis-full.html

- **对象**：`craft-optimization/panorama-ai-analysis-full.html`
- **对照真源**：`ai-analysis-center.vue` + `ai-analysis/*` + `AiAnalysisScopeFilterBar.vue` + `ai-analysis-cluster-signals.ts`
- **前提**：产品 Vue 未改；本稿评的是「对照页是否真还原」与「A-FLOW CRAFT 是否可确认」

## 总判

| 维 | 分 ( /10) | 一句话 |
|---|---|---|
| NOW 还原忠实度 | 7.5 | 四 Tab + 双范围 + 聚类双 Signal/Readiness/Collapse 骨架对；细节与考试内锁考入口偏薄 |
| CRAFT 方向（纠偏后） | 8 | 禁主发现 CTA / 禁阶段闸门，正确；同页直出立得住 |
| CRAFT 完整性 | 5 | **缺总壳**：四个内容域在整站如何并存仍未画；教学 CRAFT 与 NOW 几乎同形，真正痛点（互斥 Tab）未解 |
| 可确认性（能否勾 A-FLOW） | 4 | 不建议整包确认；需先补「中心总壳」一屏再确认 |

**结论：** 页已够用来审查「现网有多乱」和「不要再做 wizard」；**还不够**用来拍板整包 A-FLOW 实现，因为最大 IA（四个互斥 Tab 是否保留）仍悬空。

---

## 1. NOW 还原审计（与源码对照）

### 已对齐（可信任）

- 壳：`StageWorkbenchShell` + ContextBar「AI 分析中心」+ SignalBand tiles（范围内考试 / 涉及课程 / 选定考试 / **当前视图**）
- Tab：`教学分析 | 趋势分析 | 错因聚类 | 校级质量` + `route.query.tab`
- 范围 A = exam（学年/学期/课程/考试）；范围 B = org-term（学年/学期/院系/课程/班级）
- 教学四卡：改进建议 / 班级薄弱 / 学情画像 / 整卷测量学
- 趋势三卡：跨考试趋势 / 学期成长 / 课程目标达成
- 聚类：6 项 Signal + WorkflowReadiness + 错因 + 题目质量 + Collapse(映射|重判)
- 校级两卡：校级质量 + 经验有效性
- 卡内二次 FilterBar / 黄条高亮「筛选爆炸」——教学信号对

### 缺口 / 失真（应补进对照页）

| 严重 | 缺口 | 真源 |
|---|---|---|
| P0 | **考试工作台锁考模式几乎未画**：`examLocked` 时 ExamScope 过滤条**隐藏**，ContextBar 换 JourneySubNav；顶栏「选定考试」语义变化 | `AiAnalysisExamScopePanel` `v-if="!examLocked"`；`exam-workspace-ai-analysis.vue` |
| P1 | 跨考试趋势卡内能力远多于「卡内考试」：课程/班级维度 radio、历史选择、共有班级、多选考试、生成分析 | `CrossExamTrendCard.vue` |
| P1 | 整卷测量学指标名写错（「信度等/难度…」）；真源为 Cronbach α / 平均区分度 / 平均难度 | `PaperQualityCard` + `buildPaperQualitySignalMetrics` |
| P2 | 图下正文块大量缺失（改进建议列表、薄弱行、学情诊断文、趋势摘要、错因 tile、证据表）——看起来像「只有假柱状图」 | 各 card template |
| P2 | 生成中态 / 失败空态 / HistorySelect 未表现 | `AiAnalysisCardBody` / 各卡 |
| P3 | `ScoreDistributionCard` 不在分析中心（在 `statistics.vue`）——清单未误收，正确；可在清单脚注标明边界 | — |

---

## 2. CRAFT 方向审计（纠偏后）

### 已正确（应保留进 A-FLOW）

1. **禁止**阶段条 +「主发现」+ CTA 跳转（系统替用户挑先看什么）
2. **同域同页**堆叠直出（教学四卡 / 趋势三卡 / 聚类诊断+任务 / 校级两块）
3. 砍 SignalBand「当前视图」元 KPI
4. 页头唯一范围；卡内不重复学年学期
5. 聚类不要第二层六格 Signal 重复页头（收成任务相关 KPI）
6. 图色走品牌蓝阶（P-CHART）

### 致命不完整：总壳 IA 未画

左列仍是**互斥四 Tab**。右列每个 section 各自画「AI 分析中心 · 趋势 / 校级…」——读起来仍像四个入口。

同时：

- **教学 Tab 现网已经是同页四卡竖堆**。右侧教学 CRAFT 与左侧几乎同构，读者会觉得「没改什么」。
- 真正的「多余点击」在现网是：看完教学还要再点「趋势 / 聚类 / 校级」才能看见其他域能力。
- 若坚持「不替用户判断展示哪些」+「不要多余点击」，逻辑终点只能是其一：
  - **A1**：中心一页 TOC 锚点，四域内容默认可滚（重页，需 TOC）
  - **A2**：保留互斥 Tab，但接受「切 Tab = 用户主动切换内容域」（不是系统预判；代价是点击）
  - **A3**：按入口切开（考试内只给教学+聚类；独立中心才给趋势+校级），减少互斥维度

当前全文 **没有一张「整中心 CRAFT 总壳」** 明示选 A1/A2/A3。这是确认阻塞项。

### 其它 CRAFT 空洞

- 趋势：砍重复学年学期后，**多选考试 / 课程·班级维度**落点未定（页头？卡工具条？）
- 校级：「有权限才进」只有文案，无入口（顶栏身份 / 独立路由 / Tab 隐藏）草图
- 长页：同页直出需要 **页内目录**；未画
- 锁考模式 CRAFT：考试内到底露出教学+聚类，还是整中心复制，未写
- CRAFT 教学编造 Cronbach `0.82` 等数，应用「示意」标注，避免当契约

---

## 3. UX / 认知负荷（对照页自身）

- 左右对照好用；但每帧 `max-height:740px` 内滚，等于小页套小页，**校级用户截到的正是「像分页」的错觉来源**之一（虽然那是旧 wizard；现在同页后仍需强调整页滚而非框内滚——可选改全景帧高）
- 黄条 nested filter 教学强，应保留
- 死样式 `.stage` / `.hero` 仍在 CSS，易误导后续再抄，建议删

---

## 4. 对 DESIGN_BRIEF A-FLOW 的建议改写

现写：

> 四 Tab 是现网对照域，不是再拆四个站点页

建议补硬句（确认前必须二选一）：

> **顶层互斥 Tab 处理**：确认 A2（保留四 Tab 作内容域切换，域内同页直出、禁主发现 CTA）或 A1（单页 TOC）。在未选前不得整包勾选 A-FLOW。

并修 brief 行内破损反引号：  
`panorama-ops-real-vs-craft.html；**AI 完整：** \`panorama-ai-analysis-full.html\``

---

## 5. 建议下一步（仍不改产品 Vue）

1. 在全景页顶部新增 **「总壳 · 三案」** 一屏（A1/A2/A3 线框），请用户点名其一  
2. 补 **锁考模式** NOW/CRAFT 一对帧  
3. 加厚跨考试趋势 NOW（维度 + 多选考试 + 生成）  
4. 修正整卷测量学指标文案  
5. 删死 CSS；趋势卡内钻取控件落点写进 CRAFT  

在 1 完成前：**不要**勾选 A-FLOW 整包。

---

## 续：审查稿已补进全景页（同日）

已落地：总壳 A1/A2/A3、锁考 NOW/CRAFT、趋势卡加厚、整卷 Cronbach 文案、去帧内限高。请从「总壳三案」审起。
