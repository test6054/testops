# shadcn-vue 在 mark-vue 中的安装说明

## 状态

已安装 **shadcn-vue（Vue 版 shadcn）**，不是 React 版 `shadcn/ui`。

- CLI：`pnpm exec shadcn-vue`
- 配置：`components.json`（style: `reka-nova`）
- 工具：`src/lib/utils.ts`（`cn`）
- 组件目录：`src/components/ui/*`（已加 `button` / `card` / `badge` 样例）
- 依赖：`reka-ui`、`class-variance-authority`、`clsx`、`tailwind-merge`、`@lucide/vue`、`tw-animate-css`

## 与现有体系的关系（硬约束）

| 层级 | 真源 |
|------|------|
| 业务页 / 壳 / 工作台 | **Ant Design Vue 4 + `Ui*` + `--dp-*` + `frontend-design-mark`** |
| shadcn-vue | **可选补充**，用于原型探索、局部新交互；**不得**批量替换 `Ui*` / 业务页 |

1. 主色已映射：`--primary` → `var(--dp-color-primary, #2b67ff)`
2. 已关闭 shadcn 默认的全局 `body`/`*` base 样式，避免盖掉教务壳
3. Tailwind 仍保留 `tw:` 前缀 utilities；另有 **无前缀 utilities** 供 shadcn 组件类名

## 常用命令

```bash
pnpm exec shadcn-vue add dialog table dropdown-menu
pnpm exec shadcn-vue info
```

## 使用示例（仅局部）

```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<template>
  <div class="shadcn-surface">
    <Button>仅作局部试验</Button>
  </div>
</template>
```

业务列表 / 批阅 / 质量 / 档案袋页面请继续用 `UiButton`、`StageWorkbenchShell` 等。