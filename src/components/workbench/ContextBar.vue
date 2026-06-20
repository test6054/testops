<script lang="ts" setup>
/**
 * 工作台上下文条
 *
 * 用途：统一各业务页面 StageWorkbenchShell #context 槽内的双栏头部布局，
 * 替代各页面手写的 `__context-info` + `__context-actions` 重复结构。
 *
 * 结构：
 *   左侧：title + 可选 subtitle + 可选 status 槽（业务状态标签 / 上下文徽章）
 *   右侧：actions 槽（刷新、新建、导出等业务操作按钮）
 *
 * 不引入业务语义，仅约束视觉节奏与 BEM 命名。
 */
defineOptions({ name: 'ContextBar' })

withDefaults(defineProps<{
  /** 默认不展示：路由面包屑已表达页面名 */
  showTitle?: boolean
  title?: string
  subtitle?: string
}>(), {
  showTitle: false,
  title: '',
  subtitle: '',
})
</script>

<template>
  <div class="context-bar">
    <div class="context-bar__info">
      <h2 v-if="showTitle && title" class="context-bar__title">
        {{ title }}
      </h2>
      <p v-if="subtitle" class="context-bar__subtitle">
        {{ subtitle }}
      </p>
      <div v-if="$slots.status" class="context-bar__status">
        <slot name="status" />
      </div>
      <div v-if="$slots.info" class="context-bar__info-extra">
        <slot name="info" />
      </div>
    </div>
    <div v-if="$slots.actions" class="context-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.context-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  &__info {
    flex: 1;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-type-h1-size, 18px);
    line-height: var(--dp-type-h1-line-height, 26px);
    font-weight: var(--dp-type-h1-weight, 600);
    color: var(--dp-text-primary, #0f172a);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--dp-type-context-size, 13px);
    line-height: var(--dp-type-context-line-height, 18px);
    color: var(--dp-text-muted, #64748b);
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  &__info-extra {
    margin-top: 4px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
}
</style>
