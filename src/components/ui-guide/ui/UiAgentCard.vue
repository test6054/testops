<template>
  <UiEntityCard
    :title="props.title"
    :description="props.description"
    :eyebrow="props.eyebrow"
    :tone="props.tone"
    :clickable="props.clickable"
    :selected="props.selected"
    :compact="props.compact"
    @click="emit('click', $event)"
  >
    <template #cover>
      <div class="ui-agent-card__cover">
        <div class="ui-agent-card__identity">
          <div class="ui-agent-card__avatar">{{ props.avatarText }}</div>
          <div class="ui-agent-card__intro">
            <div class="ui-agent-card__name">{{ props.title }}</div>
            <div v-if="props.helper" class="ui-agent-card__helper">{{ props.helper }}</div>
          </div>
        </div>

        <UiBadge v-if="props.statusLabel" :tone="props.statusTone" variant="soft" size="sm">
          {{ props.statusLabel }}
        </UiBadge>
      </div>
    </template>

    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>

    <template v-if="props.capabilities.length || $slots.tags" #tags>
      <slot name="tags">
        <UiTag
          v-for="item in props.capabilities"
          :key="item"
          :tone="props.tone"
          size="sm"
          variant="outline"
        >
          {{ item }}
        </UiTag>
      </slot>
    </template>

    <template v-if="props.metrics.length || $slots.meta" #meta>
      <slot name="meta">
        <div class="ui-agent-card__metrics">
          <article
            v-for="item in props.metrics"
            :key="item.key || item.label"
            class="ui-agent-card__metric"
          >
            <div class="ui-agent-card__metric-label">{{ item.label }}</div>
            <div class="ui-agent-card__metric-value">{{ item.value }}</div>
            <div v-if="item.helper" class="ui-agent-card__metric-helper">{{ item.helper }}</div>
          </article>
        </div>
      </slot>
    </template>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UiEntityCard>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiAgentMetricItem } from './types'
import UiBadge from './Badge.vue'
import UiTag from './Tag.vue'
import UiEntityCard from './UiEntityCard.vue'

defineOptions({
  name: 'UiAgentCard',
})

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    eyebrow?: string
    avatarText?: string
    helper?: string
    statusLabel?: string
    statusTone?: BadgeTone
    tone?: BadgeTone
    capabilities?: string[]
    metrics?: UiAgentMetricItem[]
    clickable?: boolean
    selected?: boolean
    compact?: boolean
  }>(),
  {
    description: '',
    eyebrow: '智能体',
    avatarText: 'AI',
    helper: '',
    statusLabel: '',
    statusTone: 'blue',
    tone: 'purple',
    capabilities: () => [],
    metrics: () => [],
    clickable: true,
    selected: false,
    compact: false,
  },
)

const emit = defineEmits<{
  (e: 'click', evt: MouseEvent): void
}>()
</script>

<style scoped>
.ui-agent-card__cover {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ui-agent-card__identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.ui-agent-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: var(--dp-radius-panel, 4px);
  background: rgba(255, 255, 255, 0.9);
  color: #7c3aed;
  font-size: 16px;
  font-weight: 800;
  border: 1px solid rgba(255, 255, 255, 0.82);
}

.ui-agent-card__intro {
  min-width: 0;
}

.ui-agent-card__name {
  font-size: 18px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-agent-card__helper,
.ui-agent-card__metric-helper {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dp-text-secondary, #475569);
}

.ui-agent-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ui-agent-card__metric {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
  border: 1px solid var(--dp-border, #e5e7eb);
}

.ui-agent-card__metric-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-agent-card__metric-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

@media (max-width: 900px) {
  .ui-agent-card__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
