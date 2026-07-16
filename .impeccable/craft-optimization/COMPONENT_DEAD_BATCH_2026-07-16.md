# DEAD 批次 · 2026-07-16（真零引用 3）

方法：手读 + `rg` 路径/名称交叉核验（禁止脚本模板判定）。不复活历史 GONE。

## 删除（累计 `COMPONENT_ZERO_REF_DELETED` = 105）

| 路径 | 判定 | 证据 |
|------|------|------|
| `components/ui-guide/ui/UiBadge.vue` | **DEAD** 孤儿孪生 | 全库 0 路径 import；全部用法 `import UiBadge from '.../Badge.vue'`。`Badge.vue` 多 purple tone，为唯一真源。 |
| `components/ui-guide/ui/UiPagination.vue` | **DEAD** 字节级孪生 | 与 `Pagination.vue` `diff` 空；全部用法 `import UiPagination from '.../Pagination.vue'`。 |
| `components/GiFooter/index.vue` | **DEAD** | 仅 `LayoutDefault.vue` 注释引用；已去掉注释残骸。 |

## 保留（勿删）

- `Badge.vue` / `Pagination.vue` — 在用真源  
- `ScoreAnalyticsStatusFlow.vue` — 成绩分析业务已挂 `score-finalize` / `score-publish`  
- 质量 selectors、`UiRadio`/`UiActionLink` 等 — 相对 import 或 barrel，PATH0 扫描假阳性  

## d.ts

- 策略：从现有 `src/types/components.d.ts` **剥离**已删路径；**禁止**冷启动 Vite 全量 regen（会丢 `A*`）。  
- 已移除 `UiBadge` / `UiPagination` / `GiFooter` 声明；保留 `Badge` / `Pagination` / `AButton` / `AInputNumber` / `ScoreAnalyticsStatusFlow`。  
- `missing paths` 校验：0。

## 三 Skill 一句话

- **Impeccable**：删孤儿孪生降低双真源风险（自动导入 `UiBadge` 曾指向旧文件）。  
- **Finesse**：不扩组件面，收敛 ui-guide 密度。  
- **Taste (audit-only)**：无营销/暗色处方；保持 `--dp-*` 浅色工作台。
