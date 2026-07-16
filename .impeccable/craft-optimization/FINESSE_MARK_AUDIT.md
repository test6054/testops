# Finesse Product Audit · edu-practice-mark-vue

> 只读审查。register=product · SPECTACLE=2 · DENSITY=8 · hero=none  
> 真源契约仍属 frontend-design-mark（浅色 / 半径≤8 / 壳层 / Live DTO）。本审计吸收 finesse product 工艺层。

## Design Read

`高校阅卷/质量/档案袋 · trust-first 运营台 · register=product · SPECTACLE=2 · DENSITY=8 · hero-engine=none`

第二阶默认：Ant 默认青蓝 SaaS（#1677ff + #fff/#f5f5f5 + #d9d9d9）。要打的是这层 substrate，不是「再随便换一个蓝 hex」。

## 文件穷举

- 全量路径：**1752** 个（`FRONTEND_FILE_INVENTORY.txt` / `inventory.json`）
- 扩展名：.vue=732, .ts=977, .scss=38, .css=5
- views vue：admin:24, auth:3, common:1, error:3, login:8, portfolio:95, public:4, quality:32, scanner-kiosk:32, student:4, teacher:145, user:3

## P0

1. 幽灵 token（`--dp-primary` / `--dp-border-light` / `--dp-surface-sunken` 等未在 ui-tokens 声明）贯穿 grading/archive/shell
2. 纯净 Ant 中性：page=#f5f5f5 surface=#fff border=#d9d9d9
3. Main/侧栏/顶栏同为白底，page≠card 塌陷（`layout/components/Main.vue` 等）
4. Kiosk 第二蓝 `#1f5fff` vs 教师台 `#1677ff`

## P1

1. WorkbenchSurfaceCard 默认 soft 阴影包表
2. `--dp-shadow-card` 进统计卡
3. UiStatisticSummaryGrid 硬编码 #2563eb 与 weight 800
4. portfolio/quality Signal 紫 tone 装饰
5. OngoingExamCardGrid hover 蓝光晕
6. App.vue THEME_CONFIG 未显式 colorPrimary
7. 硬边框策略非 hairline

## P2

- 等多列 cockpit 格
- AuthLayout 紫 tag
- scanner-center 叙事与路由漂移
- 三域白轨无 substrate 差异

## 画廊选型说明

打开 `gallery-full.html`：可切换 **表面类型**（总览 / 表页 / 沉浸 chrome / 档案袋）× **完整工艺主题**（含 finesse 套装翻译）。每个主题都按 product token contract 填齐 page/bg/panel/border/ink/accent/shadow，而不是只换按钮色。

## Highest leverage

1. 先落地 **S0 substrate1677**（锁壳+锁浅色）验证工艺
2. 再在 S1/S2/S4/S5/S7/S12 中定品牌色相
3. 同步幽灵 token 与 Kiosk 主色家族
