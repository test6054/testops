<template>
  <SignalBand
    v-if="metrics.length"
    :metrics="metrics"
    variant="inline"
    compact
    @metric-click="
      (key) => emit('metric-click', key, { academicYear: cockpit?.currentAcademicYear })
    "
  />
</template>

<script lang="ts" setup>
import type { PortfolioTeacherProgressCockpitVO } from '@/apis/portfolio/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'PortfolioProgressCockpitBand' })

const props = defineProps<{
  teacherId?: string
}>()

const emit = defineEmits<{
  (e: 'metric-click', key: string, context?: { academicYear?: string }): void
}>()

const loading = ref(false)
const cockpit = ref<PortfolioTeacherProgressCockpitVO | null>(null)

const metrics = computed((): SignalMetric[] => {
  if (!cockpit.value) {
    return []
  }
  const row = cockpit.value
  const items: SignalMetric[] = [
    {
      key: 'completeness',
      label: `${row.currentAcademicYear} 完整度`,
      value: String(row.completenessPercent),
      unit: '%',
      tone: row.completenessPercent >= 80 ? 'green' : 'orange',
      clickable: true,
    },
    {
      key: 'pendingReview',
      label: '待审档案',
      value: String(row.pendingReviewCount),
      unit: '条',
      tone: row.pendingReviewCount > 0 ? 'blue' : 'green',
      clickable: true,
    },
    {
      key: 'returned',
      label: '退回待改',
      value: String(row.returnedCount),
      unit: '条',
      tone: row.returnedCount > 0 ? 'orange' : 'green',
      clickable: true,
    },
    {
      key: 'openGap',
      label: '补采待办',
      value: String(row.openGapCount),
      unit: '项',
      tone: row.openGapCount > 0 ? 'orange' : 'green',
      clickable: true,
    },
  ]
  if (row.completenessDeltaVsPreviousYear !== undefined) {
    items.push({
      key: 'delta',
      label: '较上学年',
      value: `${row.completenessDeltaVsPreviousYear >= 0 ? '+' : ''}${row.completenessDeltaVsPreviousYear}`,
      unit: '%',
      tone: row.completenessDeltaVsPreviousYear >= 0 ? 'green' : 'orange',
      trend: row.completenessDeltaVsPreviousYear,
      trendPolarity: 'positive',
      clickable: true,
    })
  }
  return items.filter(
    (item) => item.key !== 'delta' || row.completenessDeltaVsPreviousYear !== undefined,
  )
})

async function loadCockpit() {
  if (!props.teacherId) {
    cockpit.value = null
    return
  }
  loading.value = true
  try {
    cockpit.value = await portfolioAnalysisApi.getProgressCockpit({ teacherId: props.teacherId })
  } catch (error) {
    cockpit.value = null
    showUserError(error, '加载进度驾驶舱失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.teacherId,
  () => {
    void loadCockpit()
  },
  { immediate: true },
)

defineExpose({ reload: loadCockpit, loading, cockpit })
</script>
