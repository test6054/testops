<template>
  <div class="grading-immersion-chrome">
    <div class="grading-immersion-chrome__lead">
      <slot name="lead">
        <UiButton
          v-if="showBack"
          variant="ghost"
          size="sm"
          class="grading-immersion-chrome__back"
          @click="emit('back')"
        >
          <template #icon><ArrowLeftOutlined /></template>
          {{ backLabel }}
        </UiButton>
      </slot>
      <div v-if="title || subtitle" class="grading-immersion-chrome__titles">
        <div v-if="title" class="grading-immersion-chrome__title">{{ title }}</div>
        <div v-if="subtitle" class="grading-immersion-chrome__subtitle">{{ subtitle }}</div>
      </div>
    </div>
    <div class="grading-immersion-chrome__main">
      <slot name="status" />
    </div>
    <div v-if="$slots.actions" class="grading-immersion-chrome__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ArrowLeftOutlined from '@ant-design/icons-vue/ArrowLeftOutlined'
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'GradingImmersionChrome' })

withDefaults(
  defineProps<{
    /** 顶栏主标题，通常为考试名 */
    title?: string
    /** 顶栏副标题，如份次 / 题号 */
    subtitle?: string
    /** 是否展示返回按钮 */
    showBack?: boolean
    /** 返回按钮文案 */
    backLabel?: string
  }>(),
  {
    title: '',
    subtitle: '',
    showBack: false,
    backLabel: '返回任务池',
  },
)

const emit = defineEmits<{
  back: []
}>()
</script>

<style lang="scss" scoped>
.grading-immersion-chrome {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2) var(--dp-space-3);
  padding: var(--dp-space-3) var(--dp-space-4);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);

  &__lead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2) var(--dp-space-3);
    min-width: 0;
    flex: 1 1 200px;
  }

  &__back {
    flex-shrink: 0;
  }

  &__titles {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-1);
    min-width: 0;
  }

  &__title {
    font-size: var(--dp-font-size-sm);
    font-weight: var(--dp-font-weight-title);
    color: var(--dp-text-primary);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__subtitle {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-secondary);
    line-height: var(--dp-type-hint-line-height);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2);
    min-width: 0;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2);
    flex-shrink: 0;
  }
}
</style>
