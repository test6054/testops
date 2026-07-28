<template>
  <UiSpin :spinning="loading">
    <div v-if="gate" class="archive-exam-score-gate-panel">
      <div v-for="row in gateRows" :key="row.key" class="archive-exam-score-gate-panel__row">
        <span
          class="archive-exam-score-gate-panel__check"
          :class="`archive-exam-score-gate-panel__check--${row.state}`"
          aria-hidden="true"
        >
          <CheckOutlined v-if="row.state === 'pass'" />
          <ClockCircleOutlined v-else-if="row.state === 'pending'" />
          <CloseOutlined v-else />
        </span>
        <div class="archive-exam-score-gate-panel__body">
          <div class="archive-exam-score-gate-panel__title-row">
            <span class="archive-exam-score-gate-panel__title">{{ row.title }}</span>
            <UiTag v-if="row.state === 'pass'" tone="green" size="sm">已完成</UiTag>
            <UiTag v-else-if="row.state === 'pending'" tone="orange" size="sm">待处理</UiTag>
            <UiTag v-else tone="red" size="sm">异常</UiTag>
          </div>
          <p class="archive-exam-score-gate-panel__hint">{{ row.hint }}</p>
        </div>
      </div>

      <div
        v-if="showStats && hasGradablePapers"
        class="archive-exam-score-gate-panel__stats"
        role="group"
        aria-label="成绩门禁人数"
      >
        <span class="archive-exam-score-gate-panel__stat">
          <span class="archive-exam-score-gate-panel__stat-label">考生</span>
          <span class="archive-exam-score-gate-panel__stat-val">{{
            gate.gradablePaperCount ?? 0
          }}</span>
        </span>
        <span class="archive-exam-score-gate-panel__stat">
          <span class="archive-exam-score-gate-panel__stat-label">已录入</span>
          <span
            class="archive-exam-score-gate-panel__stat-val archive-exam-score-gate-panel__stat-val--ok"
          >{{ gate.publishedScoreCount ?? 0 }}</span>
        </span>
        <span class="archive-exam-score-gate-panel__stat">
          <span class="archive-exam-score-gate-panel__stat-label">缺失</span>
          <span
            class="archive-exam-score-gate-panel__stat-val"
            :class="
              missingStudents > 0
                ? 'archive-exam-score-gate-panel__stat-val--danger'
                : 'archive-exam-score-gate-panel__stat-val--ok'
            "
          >{{ missingStudents }}</span>
        </span>
      </div>
      <p v-else-if="showStats" class="archive-exam-score-gate-panel__empty-papers">
        本场考试无可评阅试卷，成绩门禁已按零卷口径满足；完成关考后即可进入建卷。
      </p>
    </div>
  </UiSpin>
</template>

<script setup lang="ts">
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import CloseOutlined from '@ant-design/icons-vue/CloseOutlined'
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import {
  buildExamClosedGateHint,
  buildScoresPublishedGateHint,
} from '@/composables/useExamArchiveGateHint'

defineOptions({ name: 'ArchiveExamScoreGatePanel' })

const props = withDefaults(
  defineProps<{
    gate: ArchiveVolumeExamGateResponse | null
    loading?: boolean
    showStats?: boolean
  }>(),
  {
    loading: false,
    showStats: true,
  },
)

type GateCheckState = 'pass' | 'pending' | 'fail'

const gateAnomaly = computed(
  () => props.gate?.examClosed === true && props.gate?.allScoresPublished !== true,
)

const hasGradablePapers = computed(() => (props.gate?.gradablePaperCount ?? 0) > 0)

const examClosedHint = computed(() => (props.gate ? buildExamClosedGateHint(props.gate) : ''))

const scoresPublishedHint = computed(() =>
  props.gate ? buildScoresPublishedGateHint(props.gate) : '',
)

const missingStudents = computed(() => {
  const total = props.gate?.gradablePaperCount ?? 0
  const published = props.gate?.publishedScoreCount ?? 0
  return Math.max(total - published, 0)
})

/** 双门禁单项：已满足为 pass，流程中待办为 pending，状态矛盾为 fail。 */
function resolveExamClosedState(gate: ArchiveVolumeExamGateResponse): GateCheckState {
  if (gate.examClosed === true) {
    return gate.allScoresPublished === true ? 'pass' : 'fail'
  }
  return 'pending'
}

function resolveScoresPublishedState(gate: ArchiveVolumeExamGateResponse): GateCheckState {
  if (gate.allScoresPublished === true) {
    return 'pass'
  }
  if (gate.examClosed === true) {
    return 'fail'
  }
  return 'pending'
}

const gateRows = computed(() => {
  const gate = props.gate
  if (!gate) {
    return []
  }
  return [
    {
      key: 'exam-closed',
      state: resolveExamClosedState(gate),
      title: '考试已关闭',
      hint: examClosedHint.value,
    },
    {
      key: 'scores-published',
      state: resolveScoresPublishedState(gate),
      title: '成绩已发布',
      hint: scoresPublishedHint.value,
    },
  ]
})

defineExpose({
  gateAnomaly,
})
</script>

<style scoped lang="scss">
.archive-exam-score-gate-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.archive-exam-score-gate-panel__row {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component);
  border-radius: var(--dp-radius-control);
  background: var(--dp-bg-muted);
}

.archive-exam-score-gate-panel__check {
  width: 22px;
  height: 22px;
  border-radius: var(--dp-radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: var(--dp-font-size-xs);

  &--pass {
    color: var(--dp-text-inverse);
    background: var(--dp-green-600);
  }

  &--pending {
    color: var(--dp-orange-700);
    background: var(--dp-orange-50);
    border: 1.5px solid var(--dp-orange-200);
  }

  &--fail {
    color: var(--dp-red-700);
    background: var(--dp-red-50);
    border: 1.5px solid var(--dp-red-200);
  }
}

.archive-exam-score-gate-panel__body {
  flex: 1;
  min-width: 0;
}

.archive-exam-score-gate-panel__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.archive-exam-score-gate-panel__title {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-exam-score-gate-panel__hint {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-font-size-xs);
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.archive-exam-score-gate-panel__stats {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component);
  margin-top: var(--dp-space-component-xs);
  padding: var(--dp-space-component-xs) var(--dp-space-component);
  min-height: 32px;
  max-width: 100%;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control, 4px);
  background: var(--dp-surface-subtle, var(--dp-surface));
}

.archive-exam-score-gate-panel__stat {
  display: inline-flex;
  align-items: baseline;
  gap: var(--dp-space-component-tight);
  min-width: 0;
}

.archive-exam-score-gate-panel__stat-val {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-primary);

  &--ok {
    color: var(--dp-green-700);
  }

  &--danger {
    color: var(--dp-red-700);
  }
}

.archive-exam-score-gate-panel__stat-label {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}

.archive-exam-score-gate-panel__empty-papers {
  margin: 0;
  padding: var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-secondary);
  border-radius: var(--dp-radius-control);
  background: var(--dp-bg-muted);
}
</style>
