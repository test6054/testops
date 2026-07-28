<template>
  <section
    v-if="showPanel"
    class="score-confirm-readiness"
    :class="panelClass"
    aria-label="成绩确认就绪度"
  >
    <header class="score-confirm-readiness__head">
      <div class="score-confirm-readiness__title-wrap">
        <h3 class="score-confirm-readiness__title">
          成绩确认
          <template v-if="examTitle"> · {{ examTitle }}</template>
          <template v-if="candidateCount > 0">（{{ candidateCount }} 人）</template>
        </h3>
        <UiTag :tone="statusTone" size="sm">{{ statusLabel }}</UiTag>
      </div>
      <p v-if="viewModel.problemClassCount > 0" class="score-confirm-readiness__summary">
        发现 {{ viewModel.problemClassCount }} 类问题需要处理
        <span v-if="viewModel.mustFixCount > 0">
          · 必须修复 {{ viewModel.mustFixCount }}
        </span>
        <span v-if="viewModel.advisoryCount > 0">
          · 建议检查 {{ viewModel.advisoryCount }}
        </span>
      </p>
      <p v-else class="score-confirm-readiness__summary score-confirm-readiness__summary--ok">
        场级硬阻断已清除；可对无问题答卷批量确认或提交发布复核。
      </p>
    </header>

    <div v-if="viewModel.bands.length > 0" class="score-confirm-readiness__bands">
      <section
        v-for="band in viewModel.bands"
        :key="band.band"
        class="score-confirm-readiness__band"
        :class="`score-confirm-readiness__band--${band.band}`"
      >
        <h4 class="score-confirm-readiness__band-title">
          <span class="score-confirm-readiness__band-mark" aria-hidden="true">
            {{ bandMark(band.band) }}
          </span>
          {{ band.label }}
        </h4>
        <p class="score-confirm-readiness__band-desc">{{ band.description }}</p>

        <ol class="score-confirm-readiness__list">
          <li
            v-for="(item, index) in band.items"
            :key="item.code"
            class="score-confirm-readiness__item"
          >
            <div class="score-confirm-readiness__item-index" aria-hidden="true">
              {{ globalIndex(band.band, index) }}
            </div>
            <div class="score-confirm-readiness__item-main">
              <div class="score-confirm-readiness__item-title-row">
                <span class="score-confirm-readiness__item-title">
                  <template v-if="item.count > 0">{{ item.count }} · </template>{{ item.title }}
                </span>
                <UiTag :tone="severityTone(item.severity)" size="sm">
                  {{ severityLabel(item.severity) }}
                </UiTag>
              </div>
              <p class="score-confirm-readiness__item-desc">{{ item.description }}</p>
              <p
                v-if="item.sampleLabels?.length"
                class="score-confirm-readiness__item-samples"
              >
                {{ item.sampleLabels.join('、') }}
                <span v-if="item.count > item.sampleLabels.length"> 等</span>
              </p>
              <div v-if="item.actionCode !== 'NONE'" class="score-confirm-readiness__item-actions">
                <UiButton
                  :variant="band.band === 'must_fix' ? 'primary' : 'outline'"
                  size="sm"
                  :loading="actionLoadingCode === item.actionCode"
                  @click="emitAction(item)"
                >
                  {{ actionLabel(item.actionCode) }}
                </UiButton>
              </div>
            </div>
          </li>
        </ol>
      </section>
    </div>

    <footer class="score-confirm-readiness__footer">
      <UiButton
        variant="primary"
        size="sm"
        :disabled="!canBulkPublish || viewModel.publishBlocked || viewModel.mustFixCount > 0"
        :loading="bulkPublishing"
        @click="emit('bulk-publish')"
      >
        {{
          viewModel.mustFixCount > 0 || viewModel.publishBlocked
            ? '全部修复后提交复核'
            : '全场提交发布复核'
        }}
      </UiButton>
      <UiButton
        v-if="safeConfirmableCount > 0 || canBatchConfirmSafe"
        variant="outline"
        size="sm"
        :disabled="!canBatchConfirmSafe || viewModel.confirmBlocked"
        :loading="batchConfirming"
        @click="emit('safe-confirm')"
      >
        仅确认无风险成绩
        <template v-if="safeConfirmableCount > 0">（{{ safeConfirmableCount }} 人）</template>
      </UiButton>
    </footer>
  </section>
</template>

<script setup lang="ts">
import type {
  FinalScoreReadinessActionCode,
  FinalScoreReadinessItemResponse,
  FinalScoreReadinessSeverityCode,
  FinalScoreRiskOverviewResponse,
} from '@/apis/mark/exam-score'
import type {ScoreConfirmPriorityBand} from '@/utils/score-confirm-readiness';
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import {
  buildScoreConfirmReadinessViewModel,
  formatReadinessActionLabel
  
} from '@/utils/score-confirm-readiness'

defineOptions({ name: 'ScoreConfirmReadinessPanel' })

const props = withDefaults(
  defineProps<{
    overview: FinalScoreRiskOverviewResponse | null
    actionLoadingCode?: FinalScoreReadinessActionCode | null
    examTitle?: string
    candidateCount?: number
    canBulkPublish?: boolean
    canBatchConfirmSafe?: boolean
    batchConfirming?: boolean
    bulkPublishing?: boolean
  }>(),
  {
    actionLoadingCode: null,
    examTitle: '',
    candidateCount: 0,
    canBulkPublish: false,
    canBatchConfirmSafe: false,
    batchConfirming: false,
    bulkPublishing: false,
  },
)

const emit = defineEmits<{
  "action": [item: FinalScoreReadinessItemResponse]
  'bulk-publish': []
  'safe-confirm': []
}>()

const viewModel = computed(() => buildScoreConfirmReadinessViewModel(props.overview))

const showPanel = computed(
  () => !viewModel.value.allClear || viewModel.value.items.length > 0 || props.canBulkPublish,
)

/** 人数唯一真源为 overview.safeConfirmableCount，不从 readinessItems 反推 */
const safeConfirmableCount = computed(() => props.overview?.safeConfirmableCount ?? 0)

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
  if (viewModel.value.advisoryCount > 0 || viewModel.value.actionRequiredCount > 0) return 'orange' as const
  return 'green' as const
})

const statusLabel = computed(() => {
  if (viewModel.value.mustFixCount > 0 || viewModel.value.hardBlockCount > 0) return '须先修复'
  if (viewModel.value.advisoryCount > 0 || viewModel.value.actionRequiredCount > 0) return '建议检查'
  return '可推进'
})

const bandStartIndex = computed(() => {
  const map: Record<ScoreConfirmPriorityBand, number> = {
    must_fix: 1,
    advisory: 1,
    opportunity: 1,
  }
  let cursor = 1
  for (const band of viewModel.value.bands) {
    map[band.band] = cursor
    cursor += band.items.length
  }
  return map
})

function globalIndex(band: ScoreConfirmPriorityBand, index: number): number {
  return (bandStartIndex.value[band] ?? 1) + index
}

function bandMark(band: ScoreConfirmPriorityBand): string {
  if (band === 'must_fix') return '●'
  if (band === 'advisory') return '●'
  return '○'
}

function severityTone(severity: FinalScoreReadinessSeverityCode): 'red' | 'orange' | 'blue' | 'green' {
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
  return formatReadinessActionLabel(code) || '处理 →'
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
  margin-bottom: var(--dp-space-block);
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);

  &--blocked {
    border-color: color-mix(in srgb, var(--dp-error) 35%, var(--dp-border-subtle));
    background: color-mix(in srgb, var(--dp-error) 4%, var(--dp-surface));
  }

  &--action {
    border-color: color-mix(in srgb, var(--dp-warning) 35%, var(--dp-border-subtle));
    background: color-mix(in srgb, var(--dp-warning) 4%, var(--dp-surface));
  }

  &--ok {
    border-color: color-mix(in srgb, var(--dp-success) 28%, var(--dp-border-subtle));
  }

  &__head {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-xs);
    margin-bottom: var(--dp-space-component);
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__summary {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);

    &--ok {
      color: var(--dp-text-muted);
    }
  }

  &__bands {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__band {
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface);

    &--must_fix {
      border-color: color-mix(in srgb, var(--dp-error) 28%, var(--dp-border-subtle));
      background: color-mix(in srgb, var(--dp-error) 3%, var(--dp-surface));
    }

    &--advisory {
      border-color: color-mix(in srgb, var(--dp-warning) 28%, var(--dp-border-subtle));
      background: color-mix(in srgb, var(--dp-warning) 3%, var(--dp-surface));
    }

    &--opportunity {
      border-color: color-mix(in srgb, var(--dp-color-primary) 22%, var(--dp-border-subtle));
    }
  }

  &__band-title {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    margin: 0;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__band-mark {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__band--must_fix &__band-mark {
    color: var(--dp-error);
  }

  &__band--advisory &__band-mark {
    color: var(--dp-warning);
  }

  &__band--opportunity &__band-mark {
    color: var(--dp-color-primary);
  }

  &__band-desc {
    margin: var(--dp-space-component-xs) 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__item {
    display: flex;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface);
  }

  &__item-index {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--dp-radius-full, 999px);
    background: var(--dp-surface-subtle);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
  }

  &__item-main {
    min-width: 0;
    flex: 1;
  }

  &__item-title-row {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__item-title {
    font-size: var(--dp-font-size-sm);
    font-weight: 500;
    color: var(--dp-text-primary);
  }

  &__item-desc {
    margin: var(--dp-space-component-xs) 0 0;
    font-size: var(--dp-font-size-xs);
    line-height: 1.5;
    color: var(--dp-text-muted);
  }

  &__item-actions {
    display: flex;
    gap: var(--dp-space-component-tight);
    margin-top: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
    margin-top: var(--dp-space-component);
    padding-top: var(--dp-space-component);
    border-top: 1px solid var(--dp-border-subtle);
  }
}
</style>
