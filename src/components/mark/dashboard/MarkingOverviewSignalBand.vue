<template>
  <SignalBand :metrics="metrics" compact />
</template>

<script lang="ts" setup>
import type { SignalMetric } from '@/types/workbench'
import type {
  MarkTeacherDashboardFilterContextVO,
  MarkTeacherDashboardSignalMetricsVO,
} from '@/apis/mark/teacher-dashboard'
import { computed } from 'vue'
import SignalBand from '@/components/workbench/SignalBand.vue'

defineOptions({ name: 'MarkingOverviewSignalBand' })

const props = withDefaults(defineProps<{
  filterContext?: MarkTeacherDashboardFilterContextVO
  signalMetrics?: MarkTeacherDashboardSignalMetricsVO
  placeholder?: boolean
}>(), {
  placeholder: false,
})

const metrics = computed<SignalMetric[]>(() => {
  const dash = props.placeholder ? '—' : 0
  const m = props.signalMetrics
  const filtered = props.filterContext?.filteredExamCount
  return [
    {
      key: 'filtered',
      label: '筛选命中',
      value: filtered ?? dash,
      unit: filtered != null ? '场' : undefined,
      tone: 'blue',
    },
    {
      key: 'active',
      label: '进行中',
      value: m?.activeExamCount ?? dash,
      unit: m ? '场' : undefined,
      tone: 'green',
    },
    {
      key: 'unpublished',
      label: '待发布成绩',
      value: m?.confirmedUnpublishedScoreCount ?? dash,
      unit: m ? '份' : undefined,
      tone: (m?.confirmedUnpublishedScoreCount ?? 0) > 0 ? 'orange' : 'gray',
    },
    {
      key: 'recent',
      label: '近 30 天新建',
      value: m?.recentCreatedExamCount ?? dash,
      unit: m ? '场' : undefined,
      tone: 'blue',
    },
    {
      key: 'candidates',
      label: '考生人数',
      value: m?.candidateCount ?? dash,
      unit: m ? '人' : undefined,
      tone: 'gray',
    },
    {
      key: 'blocking',
      label: '阻断待办',
      value: m?.blockingTodoCount ?? dash,
      unit: m ? '项' : undefined,
      tone: (m?.blockingTodoCount ?? 0) > 0 ? 'red' : 'gray',
    },
  ]
})
</script>
