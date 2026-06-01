<template>
  <section class="ui-insight-panel" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
    >
      <template v-if="showMeta" #meta>
        <UiBadge v-if="props.level" :tone="props.scoreTone" variant="soft" size="sm">
          {{ props.level }}
        </UiBadge>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <a-spin :spinning="props.loading" style="width: 100%">
      <div v-if="hasContent" class="ui-insight-panel__content">
        <section v-if="showSummary" class="ui-insight-panel__summary-card">
          <slot name="summary">
            <div
              v-if="props.score !== undefined && props.score !== null && props.score !== ''"
              class="ui-insight-panel__score"
              :class="`ui-insight-panel__score--${props.scoreTone}`"
            >
              <div class="ui-insight-panel__score-value">
                {{ props.score }}
                <span v-if="props.scoreUnit" class="ui-insight-panel__score-unit">
                  {{ props.scoreUnit }}
                </span>
              </div>
              <div class="ui-insight-panel__score-label">{{ props.scoreLabel }}</div>
            </div>

            <div class="ui-insight-panel__summary-main">
              <div v-if="props.level || props.summaryTitle" class="ui-insight-panel__summary-head">
                <h4 class="ui-insight-panel__summary-title">
                  {{ props.summaryTitle }}
                </h4>
                <UiTag v-if="props.level" :tone="props.scoreTone" size="sm" variant="outline">
                  {{ props.level }}
                </UiTag>
              </div>

              <p v-if="props.summary" class="ui-insight-panel__summary-text">
                {{ props.summary }}
              </p>
            </div>
          </slot>
        </section>

        <div class="ui-insight-panel__grid">
          <section v-if="showIssues" class="ui-insight-panel__section">
            <div class="ui-insight-panel__section-head">
              <h4 class="ui-insight-panel__section-title">{{ props.issueTitle }}</h4>
              <UiBadge tone="orange" variant="soft" size="sm">
                {{ props.issues.length }} 项
              </UiBadge>
            </div>

            <slot name="issues">
              <div class="ui-insight-panel__issue-list">
                <article
                  v-for="(item, index) in props.issues"
                  :key="item.key || item.title || index"
                  class="ui-insight-panel__issue"
                >
                  <div class="ui-insight-panel__issue-head">
                    <UiTag :tone="item.tone || 'orange'" size="sm">
                      {{ item.tag || `问题 ${index + 1}` }}
                    </UiTag>
                    <h5 class="ui-insight-panel__issue-title">{{ item.title }}</h5>
                  </div>

                  <p v-if="item.description" class="ui-insight-panel__issue-desc">
                    {{ item.description }}
                  </p>
                </article>
              </div>
            </slot>
          </section>

          <section v-if="showSuggestions" class="ui-insight-panel__section">
            <div class="ui-insight-panel__section-head">
              <h4 class="ui-insight-panel__section-title">{{ props.suggestionTitle }}</h4>
              <UiBadge tone="blue" variant="soft" size="sm">
                {{ props.suggestions.length }} 条
              </UiBadge>
            </div>

            <slot name="suggestions">
              <div class="ui-insight-panel__suggestion-list">
                <article
                  v-for="(item, index) in props.suggestions"
                  :key="`${item}-${index}`"
                  class="ui-insight-panel__suggestion"
                >
                  <span class="ui-insight-panel__suggestion-index">{{ index + 1 }}</span>
                  <p class="ui-insight-panel__suggestion-text">{{ item }}</p>
                </article>
              </div>
            </slot>
          </section>
        </div>

        <section v-if="showMetrics" class="ui-insight-panel__metrics">
          <div class="ui-insight-panel__section-head">
            <h4 class="ui-insight-panel__section-title">{{ props.metricTitle }}</h4>
            <UiTag tone="gray" variant="outline" size="sm"> 趋势与辅助指标 </UiTag>
          </div>

          <slot name="metrics">
            <div class="ui-insight-panel__metric-grid">
              <article
                v-for="(item, index) in props.metrics"
                :key="item.key || item.label || index"
                class="ui-insight-panel__metric"
              >
                <div class="ui-insight-panel__metric-head">
                  <div class="ui-insight-panel__metric-label">{{ item.label }}</div>
                  <div
                    v-if="item.trend"
                    class="ui-insight-panel__metric-trend"
                    :class="`ui-insight-panel__metric-trend--${item.trend}`"
                  >
                    {{ getTrendLabel(item.trend) }}
                  </div>
                </div>

                <div class="ui-insight-panel__metric-value-row">
                  <span class="ui-insight-panel__metric-value">{{ item.value }}</span>
                  <UiTag :tone="item.tone || 'gray'" size="sm" variant="outline">
                    {{ getToneLabel(item.tone) }}
                  </UiTag>
                </div>

                <p v-if="item.helper" class="ui-insight-panel__metric-helper">{{ item.helper }}</p>
              </article>
            </div>
          </slot>
        </section>
      </div>

      <UiEmpty v-else size="sm" title="暂无洞察内容" :description="props.emptyText" />
    </a-spin>

    <footer v-if="$slots.footer" class="ui-insight-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiInsightItem, UiInsightMetric } from './types'
import { computed, useSlots } from 'vue'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiInsightPanel',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    score?: string | number
    scoreUnit?: string
    scoreLabel?: string
    scoreTone?: BadgeTone
    level?: string
    summaryTitle?: string
    summary?: string
    issueTitle?: string
    suggestionTitle?: string
    metricTitle?: string
    issues?: UiInsightItem[]
    suggestions?: string[]
    metrics?: UiInsightMetric[]
    loading?: boolean
    emptyText?: string
    divided?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    score: undefined,
    scoreUnit: '分',
    scoreLabel: '综合评分',
    scoreTone: 'blue',
    level: '',
    summaryTitle: '整体评估',
    summary: '',
    issueTitle: '问题清单',
    suggestionTitle: '改进措施',
    metricTitle: '数据洞察',
    issues: () => [],
    suggestions: () => [],
    metrics: () => [],
    loading: false,
    emptyText: '请通过 props 或插槽传入洞察内容',
    divided: true,
  },
)

const slots = useSlots()

const hasHeader = computed(() => {
  return (
    !!props.title ||
    !!props.description ||
    !!props.eyebrow ||
    !!props.level ||
    !!slots.meta ||
    !!slots.actions
  )
})

const showMeta = computed(() => {
  return !!props.level || !!slots.meta
})

const showSummary = computed(() => {
  return !!slots.summary || !!props.summary || props.score !== undefined || !!props.level
})

const showIssues = computed(() => {
  return !!slots.issues || props.issues.length > 0
})

const showSuggestions = computed(() => {
  return !!slots.suggestions || props.suggestions.length > 0
})

const showMetrics = computed(() => {
  return !!slots.metrics || props.metrics.length > 0
})

const hasContent = computed(() => {
  return showSummary.value || showIssues.value || showSuggestions.value || showMetrics.value
})

const getTrendLabel = (trend: UiInsightMetric['trend']) => {
  switch (trend) {
    case 'up':
      return '上升'
    case 'down':
      return '下降'
    case 'flat':
    default:
      return '平稳'
  }
}

const getToneLabel = (tone?: BadgeTone) => {
  switch (tone) {
    case 'green':
      return '良好'
    case 'orange':
      return '关注'
    case 'red':
      return '风险'
    case 'purple':
      return 'AI'
    case 'blue':
      return '正常'
    default:
      return '中性'
  }
}
</script>

<style scoped>
.ui-insight-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
}

.ui-insight-panel__content {
  display: grid;
  gap: 16px;
}

.ui-insight-panel__summary-card {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
}

.ui-insight-panel__score {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  padding: 16px;
  border-radius: var(--dp-radius-panel, 4px);
}

.ui-insight-panel__score--gray {
  background: #f8fafc;
  color: #475569;
}

.ui-insight-panel__score--blue {
  background: #eff6ff;
  color: #1d4ed8;
}

.ui-insight-panel__score--green {
  background: #ecfdf3;
  color: #15803d;
}

.ui-insight-panel__score--orange {
  background: #fff7ed;
  color: #c2410c;
}

.ui-insight-panel__score--red {
  background: #fef2f2;
  color: #b91c1c;
}

.ui-insight-panel__score--yellow {
  background: #fefce8;
  color: #a16207;
}

.ui-insight-panel__score--purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.ui-insight-panel__score-value {
  font-size: 34px;
  line-height: 1;
  font-weight: 800;
}

.ui-insight-panel__score-unit,
.ui-insight-panel__score-label {
  font-size: 13px;
  font-weight: 700;
}

.ui-insight-panel__summary-main {
  display: grid;
  align-content: center;
  gap: 10px;
  min-width: 0;
}

.ui-insight-panel__summary-head,
.ui-insight-panel__section-head,
.ui-insight-panel__metric-head,
.ui-insight-panel__issue-head,
.ui-insight-panel__metric-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ui-insight-panel__summary-title,
.ui-insight-panel__section-title,
.ui-insight-panel__issue-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-insight-panel__summary-text,
.ui-insight-panel__issue-desc,
.ui-insight-panel__metric-helper,
.ui-insight-panel__suggestion-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary, #475569);
}

.ui-insight-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.ui-insight-panel__section,
.ui-insight-panel__metrics {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
}

.ui-insight-panel__issue-list,
.ui-insight-panel__suggestion-list,
.ui-insight-panel__metric-grid {
  display: grid;
  gap: 10px;
}

.ui-insight-panel__issue,
.ui-insight-panel__suggestion,
.ui-insight-panel__metric {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.ui-insight-panel__suggestion {
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: flex-start;
}

.ui-insight-panel__suggestion-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--dp-radius-panel, 4px);
  font-size: 12px;
  font-weight: 800;
  color: #1d4ed8;
  background: #eff6ff;
}

.ui-insight-panel__metric-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ui-insight-panel__metric-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary, #475569);
}

.ui-insight-panel__metric-value {
  font-size: 24px;
  line-height: 1.1;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-insight-panel__metric-trend {
  font-size: 12px;
  font-weight: 700;
}

.ui-insight-panel__metric-trend--up {
  color: #15803d;
}

.ui-insight-panel__metric-trend--down {
  color: #b91c1c;
}

.ui-insight-panel__metric-trend--flat {
  color: #475569;
}

.ui-insight-panel__footer {
  padding-top: 14px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

@media (max-width: 1080px) {
  .ui-insight-panel__grid,
  .ui-insight-panel__metric-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .ui-insight-panel__summary-card {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
