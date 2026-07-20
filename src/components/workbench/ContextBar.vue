<script lang="ts" setup>
import { computed } from 'vue'

/**
 * 工作台上下文条：页标题 + #status 状态标签 + #toolbar 范围筛选 + #actions 操作。
 * workbench：标题左、筛选与操作右；整行垂直居中（筛选不得贴顶）。
 * 范围筛选禁止塞进 #status（status 在标题下竖排，配合 UiSelect 100% 宽会变成三层大下拉）。
 * 默认只展示 title；subtitle 仅用于动态范围摘要，禁止功能罗列说明。
 */
defineOptions({ name: 'ContextBar' })

const props = withDefaults(
  defineProps<{
    /** 显式开启标题；未传时若 title 非空也会展示 */
    showTitle?: boolean
    title?: string
    subtitle?: string
    /** stack：标题在上、操作在下；workbench：横向标题左 + 工具区右，垂直居中 */
    layout?: 'stack' | 'workbench'
  }>(),
  {
    showTitle: false,
    title: '',
    subtitle: '',
    layout: 'stack',
  },
)

const hasHeading = computed(() => Boolean(props.title?.trim()))
const showTitleBlock = computed(() => (props.showTitle || hasHeading.value) && hasHeading.value)
const isCompactToolbar = computed(
  () => props.layout === 'workbench' && !showTitleBlock.value && !props.subtitle?.trim(),
)
</script>

<template>
  <div
    class="context-bar"
    :class="[`context-bar--${layout}`, { 'context-bar--compact-toolbar': isCompactToolbar }]"
  >
    <div
      v-if="showTitleBlock || subtitle || $slots.status || $slots.info"
      class="context-bar__info"
    >
      <h2 v-if="showTitleBlock" class="context-bar__title">
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
    <div
      v-if="$slots.toolbar || $slots.actions"
      class="context-bar__end"
    >
      <div v-if="$slots.toolbar" class="context-bar__toolbar">
        <slot name="toolbar" />
      </div>
      <div v-if="$slots.actions" class="context-bar__actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.context-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-4);
  flex-wrap: wrap;

  &--workbench {
    width: 100%;
    align-items: center;
    flex-wrap: nowrap;
    margin-bottom: 0;
    min-height: var(--dp-control-height-md, 36px);
  }

  &--compact-toolbar {
    margin-bottom: 0;
    justify-content: flex-end;

    &:has(.context-bar__info) {
      justify-content: space-between;
    }
  }

  &__info {
    flex: 1;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-1);
  }

  &--workbench &__info {
    flex: 0 1 auto;
    min-width: 0;
    justify-content: center;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-type-h1-size);
    line-height: var(--dp-type-h1-line-height, var(--dp-type-h1-lh));
    font-weight: var(--dp-type-h1-weight);
    color: var(--dp-text-primary);
    letter-spacing: -0.02em;
  }

  &--workbench &__title {
    font-size: var(--dp-type-h1-size);
    line-height: var(--dp-type-h1-line-height);
    font-weight: var(--dp-type-h1-weight);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    line-height: var(--dp-type-hint-line-height);
    color: var(--dp-text-muted);
  }

  &__status {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    flex-wrap: wrap;
    margin-top: var(--dp-space-1);
  }

  &__info-extra {
    margin-top: var(--dp-space-1);
  }

  &__end {
    display: flex;
    align-items: center;
    gap: var(--dp-space-3);
    flex-wrap: wrap;
    flex-shrink: 0;
    min-width: 0;
  }

  &--workbench &__end {
    flex: 0 1 auto;
    margin-left: auto;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: nowrap;
    min-width: 0;
  }

  &__actions,
  &__toolbar {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    flex-wrap: wrap;
    flex-shrink: 0;
    min-width: 0;
  }

  &--workbench &__toolbar,
  &--workbench &__actions {
    align-items: center;
    flex-wrap: nowrap;
    min-width: 0;
  }
}

@media (max-width: #{bp.$ant-grid-lg - 1px}) {
  .context-bar--workbench {
    flex-wrap: wrap;
  }

  .context-bar--workbench .context-bar__end {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
}
</style>
