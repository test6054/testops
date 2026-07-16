# PAGE_HAND_AUDIT_BATCH_P28 · 档案袋 teacher* 优先 30 页

> 三 Skill 手审 · frontend-design-mark · 2026-07-16

| 判定 | 数 |
|------|---:|
| REWORK | 4 |
| TUNE | 5 |
| OK | 21 |
| HOLD | 0 |

## 逐页

| 判定 | 页面 | 源码事实 | 三 Skill 动作 |
|------|------|----------|---------------|
| **OK** | `views/portfolio/dual-teacher-admin.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/dual-teacher-analytics.vue` | 失败分流 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/dual-teacher-apply.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/external-teacher-admin.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/key-teacher-admin.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **TUNE** | `views/portfolio/teacher-analytics-dashboard.vue` | 失败分流; hex:#e8e8e8 | token 化硬编码色 / 收敛体积 / 保持 AI·隐私边界 |
| **REWORK** | `views/portfolio/teacher-archive.vue` | URL空态; 名册空态; pick逻辑 | 空态改指顶部 Scope；scopeReady 门禁；禁 URL 文案 |
| **TUNE** | `views/portfolio/teacher-course-archive.vue` | pick逻辑; 失败分流; hex:#595959 | token 化硬编码色 / 收敛体积 / 保持 AI·隐私边界 |
| **OK** | `views/portfolio/teacher-directory.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-evaluation.vue` | 顶部范围空态OK; pick逻辑 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-extension-activity.vue` | pick逻辑; 失败分流 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-gap.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **REWORK** | `views/portfolio/teacher-home.vue` | URL空态; 名册空态; pick逻辑 | 空态改指顶部 Scope；scopeReady 门禁；禁 URL 文案 |
| **OK** | `views/portfolio/teacher-honor.vue` | pick逻辑; 失败分流 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-indicator.vue` | 顶部范围空态OK; pick逻辑 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-intake.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-library-admin.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-materials.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-onboarding.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-one-table.vue` | 顶部范围空态OK; pick逻辑; 失败分流 | 保持；继承 PortfolioScopeHeader |
| **TUNE** | `views/portfolio/teacher-pk-analytics.vue` | hex:#f0f0f0 | token 化硬编码色 / 收敛体积 / 保持 AI·隐私边界 |
| **REWORK** | `views/portfolio/teacher-portrait.vue` | URL空态; 名册空态; pick逻辑 | 空态改指顶部 Scope；scopeReady 门禁；禁 URL 文案 |
| **TUNE** | `views/portfolio/teacher-privacy-consent.vue` | hex:#ad6800 | token 化硬编码色 / 收敛体积 / 保持 AI·隐私边界 |
| **OK** | `views/portfolio/teacher-profile.vue` | pick逻辑; 失败分流 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-recommendation-admin.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-report-admin.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **REWORK** | `views/portfolio/teacher-review-status.vue` | URL空态; 名册空态; pick逻辑 | 空态改指顶部 Scope；scopeReady 门禁；禁 URL 文案 |
| **OK** | `views/portfolio/teacher-salary-admin.vue` | 工作台壳+业务表 | 保持；继承 PortfolioScopeHeader |
| **OK** | `views/portfolio/teacher-teaching-philosophy.vue` | pick逻辑; 失败分流 | 保持；继承 PortfolioScopeHeader |
| **TUNE** | `views/portfolio/development-plan-admin.vue` | pick逻辑 | token 化硬编码色 / 收敛体积 / 保持 AI·隐私边界 |

## P0 汇总（本批）

- `teacher-home` / `teacher-archive` / `teacher-portrait` / `teacher-review-status`：**URL 携带 teacherId** 空态必须改。
- 已对齐顶部范围的页（evaluation/indicator/one-table）作样板。
- `teacher-privacy-consent`：代办禁签（业务规则）；hex `#ad6800` → warning token。
- `development-plan-admin` L1554：配置台账过大，后续拆表/筛。
