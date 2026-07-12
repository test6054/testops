<script setup lang="ts">
import type { CourseAchievementStatusCode } from '@/apis/mark/cross-exam-analysis'
import {
  COURSE_ACHIEVEMENT_STATUS_TONE,
  CourseAchievementStatusDescription,
} from '@/apis/mark/cross-exam-analysis'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { formatAnalysisRate } from '@/utils/ai-analysis-display'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'AiObjectiveProgressRow' })

const props = defineProps<{
  objective: string
  achievementRate?: number
  status?: CourseAchievementStatusCode
  targetRate?: number
}>()

function barWidth(rate?: number): string {
  if (rate == null || !Number.isFinite(rate)) {
    return '0%'
  }
  return `${Math.min(Math.max(rate * 100, 0), 100)}%`
}
</script>

<template>
  <div class="ai-objective-row">
    <span class="ai-objective-row__label">{{ objective }}</span>
    <div class="ai-objective-row__track">
      <div
        v-if="targetRate != null"
        class="ai-objective-row__target"
        :style="{ width: barWidth(targetRate) }"
      />
      <div
        class="ai-objective-row__actual"
        :class="`ai-objective-row__actual--${status ?? 'PARTIALLY'}`"
        :style="{ width: barWidth(achievementRate) }"
      />
    </div>
    <span class="ai-objective-row__rate">{{ formatAnalysisRate(achievementRate) }}</span>
    <UiTag v-if="status" :tone="COURSE_ACHIEVEMENT_STATUS_TONE[status]" size="sm">
      {{ strictEnumLabel(CourseAchievementStatusDescription, status, '课程目标达成状态') }}
    </UiTag>
  </div>
</template>
