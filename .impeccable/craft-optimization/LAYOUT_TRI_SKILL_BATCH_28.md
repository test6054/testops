# Layout 18 件三 Skill 全表 · BATCH_28

> **范围**：`edu-practice-mark-vue/src/layout/**/*.vue` 共 **18** 件（2026-07-16 手读）  
> **Skills**：Impeccable（product 工作台）· Finesse（DENSITY 8 / SPECTACLE 2）· Taste（audit-only 3/2/8）  
> **门禁**：frontend-design-mark — `#1677ff`、永久浅色、`--dp-*`、三域侧栏不拆  
> **纪律**：**只审不改代码**（未获批准禁止改 Vue）  
> **方法**：逐文件 Read + 职责/引用核验；非脚本模板句  

## Design Read

Reading this as: **mark-vue 应用壳（侧栏 + 顶栏 + 主滚动面 + 移动 Tab）** for Chinese HE faculty/admin daylight work — **trust-first / high-density navigation shell**, not marketing chrome or dark ops theater.

## 分布

| 判定 | 数量 |
|------|-----:|
| **OK** | 10 |
| **TUNE** | 5 |
| **REWORK** | 1 |
| **SHELL** | 2 |
| **合计** | 18 |

## 全表

| # | 判定 | path | Impeccable | Finesse | Taste (audit-only) |
|--:|------|------|------------|---------|-------------------|
| 1 | **SHELL** | `layout/index.vue` | 仅渲染 `LayoutDefault`，无状态/权限增量 | 入口壳可保留作路由边界 | 无视觉；勿再叠皮肤 |
| 2 | **OK** | `layout/LayoutDefault.vue` | skip-link 跳转主内容；桌面 Asider / 移动 TabBar 分叉正确；挂载 `PortfolioLayoutContext`（档案袋范围真源层） | 主列 flex 滚动结构清晰；公告延迟 1s 可接受 | token 化 skip-link；无营销顶栏；**GiFooter 已移除** |
| 3 | **SHELL** | `layout/CreatePageLayout.vue` | 仅 `router-view` + 全高列 | 创建流布局边界薄但合法 | `bg-container` 白底符合工作面；禁再加 hero |
| 4 | **TUNE** | `layout/components/Main.vue` | `role="main"`；质量/档案袋 domain class；keep-alive 路由 key 有特殊课 ID 规则 | 主滚动面可承载工作台 | **背景现为 `bg-container` 白**；滚动衬底宜 `--ant-color-bg-layout`（工作面仍白），避免整页糊成一张卡 |
| 5 | **OK** | `layout/components/Logo.vue` | 租户 Logo 优先；点击按角色 `getDefaultRoute` 回首页 | 折叠藏标题；56px 高对齐 | 无英文 eyebrow；禁换成营销大字标 |
| 6 | **TUNE** | `layout/components/MenuFoldBtn.vue` | 桌面折叠 / 移动抽屉二态正确 | 触控目标够用 | 仍绑 `menuDark` / `themeCSSVar` 分支 — 与「永久浅色」产品锁并存的历史暗色菜单路径，**审查建议冻结/不扩**，勿当新主题能力 |
| 7 | **OK** | `layout/components/AiTaskRunningBar.vue` | 仅 running>0 显示；轮询 silent；失败保留上次条数 | 「查看 AI 任务」单一 CTA；不抢主内容 | primary-bg 条带克制；非 KPI 墙；属质量域挂载 |
| 8 | **TUNE** | `layout/components/Asider/index.vue` | 桌面侧栏：Logo+Menu+底折叠 | 230↔80 折叠；滚动与底栏分层正确 | 同 MenuFoldBtn：`menuDark` 分支残留；默认浅色容器 token 正确 |
| 9 | **OK** | `layout/components/Header/index.vue` | 顶栏 56/48 高；面包屑 + 右侧用户区 | 移动端隐藏 fold（走 TabBar） | 白底+底边线工作台头，无装饰 |
| 10 | **OK** | `layout/components/HeaderRightBar/index.vue` | 租户名/类型、消息、用户菜单、退出确认；`default`/`workbench` 变体 | 消息 Popover 可关；退出 loading | 工作台 chip 克制；禁再加主题切换/营销入口 |
| 11 | **OK** | `layout/components/HeaderRightBar/Message.vue` | 未读列表/已读态；关闭回传 | 通知密度可扫 | 未读点用状态色即可；禁红点动画秀 |
| 12 | **OK** | `layout/components/Breadcrumb/index.vue` | meta.title + hideInBreadcrumb；末级不可点 | 上级可导航 | 系统导航非装饰；与 `components/Breadcrumb` 分路径勿混删 |
| 13 | **TUNE** | `layout/components/TabBar/index.vue` | 仅移动端；按角色滤三项域入口 | 三域+学生入口清晰 | 角色菜单写死在组件内，后续权限变更易漂移 — 宜与路由 meta 同源（非本轮改码） |
| 14 | **REWORK** | `layout/components/Menu/DualDomainSideNav.vue` | 三域 submenu + 平台组；选中/展开有域互斥逻辑 | **「更多入口（N）」收 secondary** 降低首屏长度，但形成「菜单超市 + 记忆负担」 | 无营销；浅色 menu 正确。**产品债**：按 access-scope / 工作壳投影主任务，配置进配置壳，避免「更多」藏主路径 |
| 15 | **TUNE** | `layout/components/Menu/index.vue` | 双轨：教师/质量/档案袋走 DualDomain；其它角色走分组 MenuItem；质量方案门禁跳转有 message | 525 行编排偏重但仍单入口 | 质量未确认方案拦截正确；禁前端猜角色拼菜单 |
| 16 | **OK** | `layout/components/Menu/MenuItem.vue` | hideInMenu / onlyOneChild 展平规则 | 折叠 tooltip 包装正确 | 无独立皮肤 |
| 17 | **TUNE** | `layout/components/Menu/MenuIcon.vue` | 字符串 icon → 组件映射 | 映射表过长（~250 行）维护成本高 | 图标库本身中性；勿引入彩色品牌 icon 墙 |
| 18 | **OK** | `layout/components/Menu/MenuCollapsedTooltip.vue` | 折叠时右侧 title | 40px 命中区 | 无装饰 |

## 结构关系（审查用）

```
layout/index.vue (SHELL)
  └─ LayoutDefault.vue (OK)
        ├─ Asider (TUNE) ─ Logo + Menu + MenuFoldBtn
        │                    └─ Menu/index (TUNE)
        │                         ├─ DualDomainSideNav (REWORK) ← 三域主路径
        │                         └─ MenuItem / MenuIcon / Tooltip
        ├─ Header (OK) ─ Breadcrumb + HeaderRightBar (+ Message)
        ├─ PortfolioLayoutContext (组件域 · 非 layout 文件)
        ├─ Main (TUNE) ─ router-view + keep-alive
        └─ TabBar (TUNE) ─ 移动三域
CreatePageLayout.vue (SHELL) ─ 创建流独立全高
AiTaskRunningBar.vue (OK) ─ 质量布局挂载，非 LayoutDefault 直接子树
```

## P0 / 建议优先级（仅审查结论，未改码）

| 优先级 | 项 | 预期效果（若将来改） |
|--------|----|----------------------|
| **P0** | DualDomainSideNav「更多入口」IA | 主任务一级可见；配置/低频进配置壳；「更多」不再藏刚需 |
| **P1** | Main 滚动衬底 token | 滚动面 layout 灰、工作面白，减少「整页一张大卡」 |
| **P1** | menuDark 残留 | 与永久浅色门禁对齐：冻结暗色菜单分支、不扩能力 |
| **P2** | TabBar 角色表 vs 路由 meta 同源 | 权限变更不漏入口 |
| **P2** | MenuIcon 映射收敛 | 按实际用到的 icon 收表 |

## 与 components 252 表关系

| 集合 | 文件 | 关系 |
|------|------|------|
| BATCH_27 | `src/components` 252 | 业务/Ui 组件 |
| **BATCH_28** | **`src/layout` 18** | **应用壳** |
| 交叉 | `PortfolioLayoutContext` | 在 components，由 LayoutDefault 挂载 |
| 交叉 | DualDomainSideNav REWORK | 与 BATCH_27/FORCE 侧栏债一致 |

## 审查勾选（给你）

- [ ] DualDomainSideNav 的「更多入口」是否接受为现状 / 是否要进改造排期  
- [ ] Main 白底滚动是否视为问题（TUNE）  
- [ ] menuDark 分支是否标记为历史死枝  
- [ ] 18 件分布（OK10 / TUNE5 / REWORK1 / SHELL2）是否认可  

## 不做清单

- 不改任何 `.vue`  
- 不复活 GiFooter  
- 不引入暗色主题产品能力  
- 不把 layout 与 components 混删  
