<template>
  <a-spin :spinning="loading">
    <div v-if="gate" class="archive-exam-score-gate-panel">
      <div class="score-gate">
        <span
          class="score-gate__check"
          :class="gate.examClosed ? 'score-gate__check--pass' : 'score-gate__check--fail'"
        >
          {{ gate.examClosed ? '✓' : '✗' }}
        </span>
        <div>
          <div class="score-gate__title">考试已关闭</div>
          <div class="score-gate__hint">POST /api/mark/exams/close</div>
        </div>
      </div>
      <div class="score-gate">
        <span
          class="score-gate__check"
          :class="gate.allScoresPublished ? 'score-gate__check--pass' : 'score-gate__check--fail'"
        >
          {{ gate.allScoresPublished ? '✓' : '✗' }}
        </span>
        <div>
          <div class="score-gate__title">成绩已发布</div>
          <div class="score-gate__hint">POST /api/mark/exams/final-scores/publish</div>
        </div>
      </div>
      <div v-if="showStats" class="archive-exam-score-gate-panel__stats">
        <div class="stat-card">
          <div class="stat-card__val">{{ gate.gradablePaperCount ?? 0 }}</div>
          <div class="stat-card__label">考生总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__val stat-card__val--ok">{{ gate.publishedScoreCount ?? 0 }}</div>
          <div class="stat-card__label">成绩已录入</div>
        </div>
        <div class="stat-card">
          <div
            class="stat-card__val"
            :class="missingStudents > 0 ? 'stat-card__val--danger' : 'stat-card__val--ok'"
          >
            {{ missingStudents }}
          </div>
          <div class="stat-card__label">缺失考生</div>
        </div>
      </div>
    </div>
  </a-spin>
</template>

<script setup lang="ts">
import type { ArchiveVolumeExamGateVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'

defineOptions({ name: 'ArchiveExamScoreGatePanel' })

const props = withDefaults(
  defineProps<{
    gate: ArchiveVolumeExamGateVO | null
    loading?: boolean
    showStats?: boolean
  }>(),
  {
    loading: false,
    showStats: true,
  },
)

const missingStudents = computed(() => {
  const total = props.gate?.gradablePaperCount ?? 0
  const published = props.gate?.publishedScoreCount ?? 0
  return Math.max(total - published, 0)
})
</script>

<style scoped>
.archive-exam-score-gate-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}

.archive-exam-score-gate-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-3, 12px);
}
</style>
