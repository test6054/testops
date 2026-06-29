<script lang="ts" setup>
import { computed } from 'vue'
/**
 * 工作台上下文条：页标题 + #status 标签 + 操作/筛选区。
 * 默认只展示 title；subtitle 仅用于少量动态范围（学年学期、当前考试名等），禁止功能罗列说明。
 */
defineOptions({ name: 'ContextBar' })

const props = withDefaults(defineProps<{
  /** 显式开启标题；未传时若 title 非空也会展示 */
  showTitle?: boolean
  title?: string
  subtitle?: string
  /** stack：标题在上、操作在下；workbench：原型横向标题 + 工具区 */
  layout?: 'stack' | 'workbench'
}>(), {
  showTitle: false,
  title: '',
  subtitle: '',
  layout: 'stack',
})

const displayTitle = computed(() => props.showTitle || Boolean(props.title))
</script>

<template>
  <div class="context-bar" :class="`context-bar--${layout}`">
    <div class="context-bar__info">
      <h2 v-if="displayTitle && title" class="context-bar__title">
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
    <div v-if="$slots.toolbar" class="context-bar__toolbar">
      <slot name="toolbar" />
    </div>
    <div v-else-if="$slots.actions" class="context-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.context-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-4, 16px);
  flex-wrap: wrap;

  &--workbench {
    align-items: center;
    flex-wrap: nowrap;
    margin-bottom: var(--dp-space-5, 20px);
  }

  &__info {
    flex: 1;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &--workbench &__info {
    flex: 0 1 auto;
    min-width: 200px;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-type-h1-size, 18px);
    line-height: var(--dp-type-h1-lh, 26px);
    font-weight: var(--dp-type-h1-weight, 600);
    color: var(--dp-text-primary, rgba(0, 0, 0, 0.88));
    letter-spacing: -0.01em;
  }

  &__subtitle {
    margin: 0;
    font-size: 13px;
    line-height: 18px;
    color: var(--dp-text-muted, rgba(0, 0, 0, 0.45));
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

  &__actions,
  &__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  &--workbench &__toolbar {
    flex: 1 1 auto;
    justify-content: flex-end;
    min-width: 0;
  }
}

@media (max-width: 960px) {
  .context-bar--workbench {
    flex-wrap: wrap;
  }

  .context-bar--workbench .context-bar__toolbar {
    width: 100%;
    justify-content: stretch;
  }
}
</style>
