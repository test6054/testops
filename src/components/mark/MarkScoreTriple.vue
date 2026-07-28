<template>
  <div class="mark-score-triple" :class="{ 'mark-score-triple--compact': compact }">
    <div class="mark-score-triple__cell mark-score-triple__cell--ai">
      <span class="mark-score-triple__label">AI 建议分</span>
      <span class="mark-score-triple__value">
        <template v-if="aiScore != null">{{ aiScore }}</template>
        <template v-else>—</template>
      </span>
      <UiTag tone="blue" size="sm">仅供参考</UiTag>
    </div>
    <div class="mark-score-triple__cell mark-score-triple__cell--teacher">
      <span class="mark-score-triple__label">教师复核分</span>
      <span class="mark-score-triple__value mark-score-triple__value--primary">
        <template v-if="teacherReviewScore != null">{{ teacherReviewScore }}</template>
        <template v-else>—</template>
      </span>
      <UiTag v-if="gradeStatus" :tone="statusTone" size="sm">{{ statusLabel }}</UiTag>
    </div>
    <div class="mark-score-triple__cell mark-score-triple__cell--full">
      <span class="mark-score-triple__label">满分</span>
      <span class="mark-score-triple__value">
        <template v-if="fullScore != null">{{ fullScore }}</template>
        <template v-else>—</template>
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { GradeStatusCode } from '@/types/enums/grade-status-enum'
import { computed } from 'vue'
import { GRADE_STATUS_TONE, GradeStatusDescription } from '@/apis/mark/grade-status'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkScoreTriple' })

const props = withDefaults(
  defineProps<{
    aiScore?: number | null
    teacherReviewScore?: number | null
    fullScore?: number | null
    gradeStatus?: GradeStatusCode | null
    compact?: boolean
  }>(),
  {
    aiScore: null,
    teacherReviewScore: null,
    fullScore: null,
    gradeStatus: null,
    compact: true,
  },
)

const statusLabel = computed(() => {
  if (!props.gradeStatus) {
    return ''
  }
  return strictEnumLabel(GradeStatusDescription, props.gradeStatus, 'gradeStatus')
})

const statusTone = computed((): BadgeTone => {
  if (!props.gradeStatus) {
    return 'gray'
  }
  return strictEnumTone(GRADE_STATUS_TONE, props.gradeStatus, 'gradeStatus')
})
</script>

<style lang="scss" scoped>
.mark-score-triple {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface);
}

.mark-score-triple--compact {
  padding: var(--dp-space-component-tight);
  gap: var(--dp-space-component-tight);
}

.mark-score-triple__cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mark-score-triple__label {
  font-size: var(--dp-font-size-xs);
  line-height: 16px;
  color: var(--dp-text-muted);
}

.mark-score-triple__value {
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
  line-height: 22px;
  color: var(--dp-text-primary);
  font-variant-numeric: tabular-nums;
}

.mark-score-triple__value--primary {
  color: var(--dp-color-primary);
}

.mark-score-triple__cell--ai .mark-score-triple__value {
  color: var(--dp-text-secondary);
  font-weight: 500;
}
</style>
