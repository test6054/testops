<template>
  <section
    class="ui-intent-card"
    :class="`ui-intent-card--${props.status}`"
    v-bind="$attrs"
  >
    <header class="ui-intent-card__header">
      <div class="ui-intent-card__header-main">
        <button
          v-if="props.collapsible"
          type="button"
          class="ui-intent-card__toggle"
          @click="open = !open"
        >
          <DownOutlined v-if="open" />
          <RightOutlined v-else />
        </button>

        <div class="ui-intent-card__title-wrap">
          <div class="ui-intent-card__title-row">
            <h3 class="ui-intent-card__title">{{ props.title }}</h3>
            <UiTag
              v-if="props.typeLabel"
              :tone="props.typeTone"
              size="sm"
              variant="outline"
            >
              {{ props.typeLabel }}
            </UiTag>
            <UiBadge
              :tone="statusTone"
              variant="soft"
              size="sm"
            >
              {{ statusLabel }}
            </UiBadge>
          </div>
          <p v-if="props.description" class="ui-intent-card__description">{{ props.description }}</p>
        </div>
      </div>

      <div v-if="$slots.actions" class="ui-intent-card__actions">
        <slot name="actions" />
      </div>
    </header>

    <div v-if="props.status === 'running'" class="ui-intent-card__progress">
      <div class="ui-intent-card__progress-head">
        <span>{{ props.progressText || '执行中...' }}</span>
        <span>{{ normalizedPercent }}%</span>
      </div>
      <UiProgressBar
        :percent="normalizedPercent"
        size="small"
        :show-text="false"
        color="#2563eb"
      />
    </div>

    <div v-if="props.status === 'failed' && props.errorMessage" class="ui-intent-card__error">
      {{ props.errorMessage }}
    </div>

    <div v-show="open" class="ui-intent-card__body">
      <slot>
        <div v-if="props.fields.length" class="ui-intent-card__fields">
          <article
            v-for="item in props.fields"
            :key="item.key || item.label"
            class="ui-intent-card__field"
          >
            <div class="ui-intent-card__field-label">{{ item.label }}</div>
            <div class="ui-intent-card__field-value">{{ item.value }}</div>
            <div v-if="item.helper" class="ui-intent-card__field-helper">{{ item.helper }}</div>
          </article>
        </div>
      </slot>
    </div>

    <footer v-if="$slots.footer" class="ui-intent-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiIntentField } from './types'
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'
import UiBadge from './Badge.vue'
import UiProgressBar from './ProgressBar.vue'
import UiTag from './Tag.vue'

defineOptions({
  name: 'UiIntentCard',
  inheritAttrs: false,
})

const open = defineModel<boolean>('open', { default: true })

const props = withDefaults(defineProps<{
  title: string
  description?: string
  typeLabel?: string
  typeTone?: BadgeTone
  status?: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  progressText?: string
  errorMessage?: string
  fields?: UiIntentField[]
  collapsible?: boolean
}>(), {
  description: '',
  typeLabel: '',
  typeTone: 'purple',
  status: 'pending',
  progress: 0,
  progressText: '',
  errorMessage: '',
  fields: () => [],
  collapsible: true,
})

const normalizedPercent = computed(() => {
  return Math.max(0, Math.min(100, Math.round(props.progress || 0)))
})

const statusTone = computed<BadgeTone>(() => {
  switch (props.status) {
    case 'running':
      return 'blue'
    case 'completed':
      return 'green'
    case 'failed':
      return 'red'
    case 'pending':
    default:
      return 'gray'
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'running':
      return '运行中'
    case 'completed':
      return '已完成'
    case 'failed':
      return '失败'
    case 'pending':
    default:
      return '待确认'
  }
})
</script>

<style scoped>
.ui-intent-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
}

.ui-intent-card--running {
  border-color: #bfdbfe;
}

.ui-intent-card--completed {
  border-color: #bbf7d0;
}

.ui-intent-card--failed {
  border-color: #fecdd3;
}

.ui-intent-card__header,
.ui-intent-card__header-main,
.ui-intent-card__title-row,
.ui-intent-card__actions,
.ui-intent-card__progress-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ui-intent-card__header {
  justify-content: space-between;
}

.ui-intent-card__header-main {
  min-width: 0;
  flex: 1;
  align-items: flex-start;
}

.ui-intent-card__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--dp-radius-panel, 4px);
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
}

.ui-intent-card__title-wrap {
  min-width: 0;
  flex: 1;
}

.ui-intent-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-intent-card__description,
.ui-intent-card__error,
.ui-intent-card__field-helper {
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary, #475569);
}

.ui-intent-card__description {
  margin: 8px 0 0;
}

.ui-intent-card__progress,
.ui-intent-card__fields {
  display: grid;
  gap: 10px;
}

.ui-intent-card__progress-head {
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-intent-card__error {
  padding: 12px 14px;
  border-radius: var(--dp-radius-panel, 4px);
  background: #fef2f2;
  color: #b91c1c;
}

.ui-intent-card__field {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
  border: 1px solid var(--dp-border, #e5e7eb);
}

.ui-intent-card__field-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-intent-card__field-value {
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-intent-card__footer {
  padding-top: 12px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

@media (max-width: 767px) {
  .ui-intent-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
