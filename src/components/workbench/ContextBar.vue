<script lang="ts" setup>
import { computed } from 'vue'

/**
 * 工作台上下文条：页标题 + #status 状态标签 + #toolbar 范围筛选 + #actions 操作。
 *
 * workbench 合同（高校教务 1366 / 侧栏展开）：
 * - 标题左、筛选与操作右；空间不足时整行换行，禁止横向滚动藏筛选。
 * - #toolbar 仅放学期级范围（建议 ≤3 个 UiSelect）；院系/课程/关键词进表区 UiFilterBar。
 * - 范围筛选禁止塞进 #status（status 在标题下竖排，配合 UiSelect 100% 宽会变成三层大下拉）。
 * - subtitle 仅动态范围摘要，禁止功能罗列。
 */
defineOptions({ name: 'ContextBar' })

const props = withDefaults(
  defineProps<{
    /** 显式开启标题；未传时若 title 非空也会展示 */
    showTitle?: boolean
    title?: string
    subtitle?: string
    /** stack：标题在上、操作在下；workbench：横向标题左 + 工具区右，空间不足换行 */
    layout?: 'stack' | 'workbench'
    /**
     * 强调态：仅「需要行动」时使用橙色左竖条；
     * 默认无彩色强调，靠白底 + 边框 + 微阴影与灰画布分层。
     */
    attention?: boolean
  }>(),
  {
    showTitle: false,
    title: '',
    subtitle: '',
    layout: 'stack',
    attention: false,
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
    :class="[
      `context-bar--${layout}`,
      {
        'context-bar--compact-toolbar': isCompactToolbar,
        'context-bar--attention': attention,
      },
    ]"
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
  gap: var(--dp-space-block);
  flex-wrap: wrap;
  box-shadow: none;
  transition: box-shadow var(--dp-duration-normal) var(--dp-ease-default);

  /* 默认克制：无品牌色左竖条；attention 才加行动强调 */
  &--attention {
    box-shadow: var(--dp-shadow-xs),
      inset 3px 0 0 color-mix(in srgb, var(--dp-orange-500, var(--dp-warning)) 75%, transparent);
  }

  &--workbench {
    width: 100%;
    align-items: center;
    /* 允许换行：1366+侧栏时筛选不得被裁切或横向滚动隐藏 */
    flex-wrap: wrap;
    row-gap: var(--dp-space-component);
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
    gap: var(--dp-space-component-xs);
  }

  &--workbench &__info {
    flex: 1 1 12rem;
    min-width: 0;
    justify-content: center;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-type-h1-size);
    line-height: var(--dp-type-h1-line-height, var(--dp-line-height-tight));
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
    font-size: var(--dp-type-context-subtitle-size, 14px);
    line-height: var(--dp-type-context-subtitle-line-height, 20px);
    font-weight: var(--dp-type-context-subtitle-weight, 500);
    color: var(--dp-text-secondary);
  }

  &__status {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
    margin-top: var(--dp-space-component-xs);
  }

  &__info-extra {
    margin-top: var(--dp-space-component-xs);
  }

  &__end {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component);
    flex-wrap: wrap;
    flex-shrink: 0;
    min-width: 0;
  }

  &--workbench &__end {
    flex: 1 1 22rem;
    margin-left: auto;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    row-gap: var(--dp-space-component-tight);
    min-width: 0;
  }

  &__actions,
  &__toolbar {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
    flex-shrink: 0;
    min-width: 0;
  }

  &--workbench &__toolbar,
  &--workbench &__actions {
    align-items: center;
    flex-wrap: wrap;
    min-width: 0;
  }

  &--workbench &__actions {
    flex-shrink: 0;
  }
}

/* 窄屏：工具区独占一行，避免与标题抢宽 */
@media (max-width: #{bp.$shell-laptop-max}) {
  .context-bar--workbench .context-bar__end {
    flex-basis: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
}
</style>
