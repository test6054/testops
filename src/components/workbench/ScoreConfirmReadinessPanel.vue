<template>
  <section
    v-if="showPanel"
    class="score-confirm-readiness"
    :class="panelClass"
    aria-label="成绩确认就绪度"
  >
    <header class="score-confirm-readiness__head">
      <div class="score-confirm-readiness__status">
        <div class="score-confirm-readiness__status-copy">
          <h3 class="score-confirm-readiness__title">{{ statusTitle }}</h3>
          <p v-if="primaryItem" class="score-confirm-readiness__summary">
            <span class="score-confirm-readiness__primary-title">
              <template v-if="primaryItem.count > 0">{{ primaryItem.count }} 份</template>
              {{ primaryItem.title }}
            </span>
            <span class="score-confirm-readiness__summary-separator">：</span>
            {{ primaryItem.description }}
          </p>
          <p v-else class="score-confirm-readiness__summary">{{ statusSummary }}</p>
        </div>
        <UiTag :tone="statusTone" size="sm">{{ statusLabel }}</UiTag>
      </div>

      <div class="score-confirm-readiness__actions">
        <UiButton
          v-if="primaryActionItem"
          variant="primary"
          size="sm"
          :loading="actionLoadingCode === primaryActionItem.actionCode"
          @click="emitAction(primaryActionItem)"
        >
          {{ actionLabel(primaryActionItem.actionCode) }}
        </UiButton>
        <UiButton
          v-if="showSafeConfirmAction"
          variant="outline"
          size="sm"
          :loading="batchConfirming"
          @click="emit('safe-confirm')"
        >
          确认无风险成绩（{{ safeConfirmableCount }} 人）
        </UiButton>
      </div>
    </header>

    <UiCollapse
      v-if="supplementalItemCount > 0"
      class="score-confirm-readiness__more"
      :bordered="false"
      ghost
    >
      <UiCollapsePanel key="more" :header="`查看其余 ${supplementalItemCount} 项`">
        <div class="score-confirm-readiness__more-bands">
          <section
            v-for="band in supplementalBands"
            :key="band.band"
            class="score-confirm-readiness__band"
          >
            <h4 class="score-confirm-readiness__band-title">{{ band.label }}</h4>
            <ul class="score-confirm-readiness__list">
              <li v-for="item in band.items" :key="item.code" class="score-confirm-readiness__item">
                <div class="score-confirm-readiness__item-copy">
                  <div class="score-confirm-readiness__item-title-row">
                    <span class="score-confirm-readiness__item-title">
                      <template v-if="item.count > 0">{{ item.count }} 份</template>
                      {{ item.title }}
                    </span>
                    <UiTag :tone="severityTone(item.severity)" size="sm">
                      {{ severityLabel(item.severity) }}
                    </UiTag>
                  </div>
                  <p class="score-confirm-readiness__item-desc">{{ item.description }}</p>
                  <p v-if="item.sampleLabels?.length" class="score-confirm-readiness__item-samples">
                    {{ item.sampleLabels.join('、') }}
                    <span v-if="item.count > item.sampleLabels.length">等</span>
                  </p>
                </div>
                <UiButton
                  v-if="item.actionCode !== 'NONE'"
                  variant="outline"
                  size="sm"
                  :loading="actionLoadingCode === item.actionCode"
                  @click="emitAction(item)"
                >
                  {{ actionLabel(item.actionCode) }}
                </UiButton>
              </li>
            </ul>
          </section>
        </div>
      </UiCollapsePanel>
    </UiCollapse>
  </section>
</template>

<script setup lang="ts">
import type {
  FinalScoreReadinessActionCode,
  FinalScoreReadinessItemResponse,
  FinalScoreReadinessSeverityCode,
  FinalScoreRiskOverviewResponse,
} from '@/apis/mark/exam-score'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCollapse from '@/components/ui-guide/ui/UiCollapse.vue'
import UiCollapsePanel from '@/components/ui-guide/ui/UiCollapsePanel.vue'
import {
  buildScoreConfirmReadinessViewModel,
  formatReadinessActionLabel,
} from '@/utils/score-confirm-readiness'

defineOptions({ name: 'ScoreConfirmReadinessPanel' })

const props = withDefaults(
  defineProps<{
    overview: FinalScoreRiskOverviewResponse | null
    actionLoadingCode?: FinalScoreReadinessActionCode | null
    canBatchConfirmSafe?: boolean
    batchConfirming?: boolean
  }>(),
  {
    actionLoadingCode: null,
    canBatchConfirmSafe: false,
    batchConfirming: false,
  },
)

const emit = defineEmits<{
  action: [item: FinalScoreReadinessItemResponse]
  'safe-confirm': []
}>()

const viewModel = computed(() => buildScoreConfirmReadinessViewModel(props.overview))
const primaryItem = computed(() =>
  viewModel.value.allClear ? null : (viewModel.value.items[0] ?? null),
)
const primaryActionItem = computed(() =>
  primaryItem.value?.actionCode === 'NONE' ? null : primaryItem.value,
)
const supplementalBands = computed(() => {
  const primaryCode = primaryItem.value?.code
  return viewModel.value.bands
    .map((band) => ({
      ...band,
      items: band.items.filter((item) => item.code !== primaryCode),
    }))
    .filter((band) => band.items.length > 0)
})
const supplementalItemCount = computed(() =>
  supplementalBands.value.reduce((total, band) => total + band.items.length, 0),
)

/** 人数唯一真源为 overview.safeConfirmableCount，不从 readinessItems 反推。 */
const safeConfirmableCount = computed(() => props.overview?.safeConfirmableCount ?? 0)
const showSafeConfirmAction = computed(
  () => props.canBatchConfirmSafe && safeConfirmableCount.value > 0,
)
const showPanel = computed(() => primaryItem.value != null || showSafeConfirmAction.value)

const panelClass = computed(() => {
  if (viewModel.value.mustFixCount > 0 || viewModel.value.hardBlockCount > 0) {
    return 'score-confirm-readiness--blocked'
  }
  if (viewModel.value.advisoryCount > 0 || viewModel.value.actionRequiredCount > 0) {
    return 'score-confirm-readiness--action'
  }
  return 'score-confirm-readiness--ok'
})

const statusTone = computed(() => {
  if (viewModel.value.mustFixCount > 0 || viewModel.value.hardBlockCount > 0) return 'red' as const
  if (viewModel.value.advisoryCount > 0 || viewModel.value.actionRequiredCount > 0)
    return 'orange' as const
  return 'green' as const
})

const statusTitle = computed(() => {
  if (viewModel.value.mustFixCount > 0 || viewModel.value.hardBlockCount > 0) return '发布前需处理'
  if (viewModel.value.advisoryCount > 0 || viewModel.value.actionRequiredCount > 0)
    return '建议先检查'
  return '成绩确认可继续推进'
})

const statusLabel = computed(() => {
  if (viewModel.value.mustFixCount > 0 || viewModel.value.hardBlockCount > 0) return '发布被阻断'
  if (viewModel.value.advisoryCount > 0 || viewModel.value.actionRequiredCount > 0) return '待检查'
  return '可确认'
})

const statusSummary = computed(() => {
  if (viewModel.value.mustFixCount > 0)
    return `必须修复 ${viewModel.value.mustFixCount} 项后才能发布`
  if (viewModel.value.advisoryCount > 0)
    return `有 ${viewModel.value.advisoryCount} 项建议检查，不阻断当前处理`
  return '可直接确认后端判定为无风险的成绩'
})

function severityTone(
  severity: FinalScoreReadinessSeverityCode,
): 'red' | 'orange' | 'blue' | 'green' {
  if (severity === 'HARD_BLOCK') return 'red'
  if (severity === 'ACTION_REQUIRED') return 'orange'
  return 'blue'
}

function severityLabel(severity: FinalScoreReadinessSeverityCode): string {
  if (severity === 'HARD_BLOCK') return '硬阻断'
  if (severity === 'ACTION_REQUIRED') return '须处置'
  return '提示'
}

function actionLabel(code: FinalScoreReadinessActionCode): string {
  return formatReadinessActionLabel(code) || '处理'
}

function emitAction(item: FinalScoreReadinessItemResponse): void {
  emit('action', item)
}

defineExpose({
  viewModel,
})
</script>

<style scoped lang="scss">
.score-confirm-readiness {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-block);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);

  &--blocked {
    border-color: var(--dp-error-border);
    background: color-mix(in srgb, var(--dp-error-bg) 58%, var(--dp-surface));
  }

  &--action {
    border-color: var(--dp-warning-border);
    background: color-mix(in srgb, var(--dp-warning-bg) 58%, var(--dp-surface));
  }

  &--ok {
    border-color: var(--dp-success-border);
  }

  &__head,
  &__status,
  &__actions,
  &__item-title-row,
  &__item {
    display: flex;
    align-items: center;
  }

  &__head {
    justify-content: space-between;
    gap: var(--dp-space-component);
  }

  &__status,
  &__actions,
  &__item-title-row {
    gap: var(--dp-space-component-tight);
  }

  &__status {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__status-copy {
    min-width: 0;
  }

  &__actions {
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-type-panel-title-size);
    font-weight: var(--dp-type-panel-title-weight);
    line-height: var(--dp-type-panel-title-line-height);
    color: var(--dp-text-primary);
  }

  &__summary,
  &__item-desc,
  &__item-samples {
    margin: 0;
    color: var(--dp-text-secondary);
  }

  &__summary {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-sm);
    line-height: var(--dp-line-height-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__primary-title {
    font-weight: var(--dp-font-weight-emphasis);
    color: var(--dp-text-primary);
  }

  &__summary-separator {
    color: var(--dp-text-muted);
  }

  &__item-copy {
    min-width: 0;
    flex: 1;
  }

  &__item-title-row {
    flex-wrap: wrap;
  }

  &__item-title {
    font-size: var(--dp-font-size-sm);
    font-weight: var(--dp-font-weight-emphasis);
    color: var(--dp-text-primary);
  }

  &__item-desc {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    line-height: var(--dp-line-height-normal);
  }

  &__item-samples {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    line-height: var(--dp-line-height-normal);
  }

  &__more {
    border-top: 1px solid var(--dp-border-subtle);
  }

  &__more :deep(.ant-collapse-header) {
    padding-right: 0 !important;
    padding-left: 0 !important;
  }

  &__more :deep(.ant-collapse-content-box) {
    padding: var(--dp-space-component) 0 0 !important;
  }

  &__more-bands,
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__band {
    min-width: 0;
  }

  &__band-title {
    margin: 0;
    font-size: var(--dp-font-size-xs);
    font-weight: var(--dp-font-weight-emphasis);
    color: var(--dp-text-secondary);
  }

  &__list {
    margin: var(--dp-space-component-tight) 0 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    justify-content: space-between;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) 0;
  }

  &__item + &__item {
    border-top: 1px solid var(--dp-border-subtle);
  }
}

@media (max-width: 768px) {
  .score-confirm-readiness {
    &__head,
    &__status,
    &__item {
      align-items: stretch;
      flex-direction: column;
    }

    &__actions {
      justify-content: flex-start;
    }

    &__actions :deep(.ui-button),
    &__item :deep(.ui-button) {
      width: 100%;
    }

    &__summary {
      white-space: normal;
    }
  }
}
</style>
