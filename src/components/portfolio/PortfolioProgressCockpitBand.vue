<template>
  <SignalBand
    v-if="metrics.length"
    :metrics="metrics"
    layout="spotlight"
    variant="panel"
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

const props = withDefaults(
  defineProps<{
    teacherId?: string
    /** 为 true 时 teacherId 变化自动拉取；首页由父级 reload 编排时应保持 false */
    autoLoad?: boolean
  }>(),
  { autoLoad: false },
)

const emit = defineEmits<{
  (e: 'metric-click', key: string, context?: { academicYear?: string }): void
}>()

const loading = ref(false)
const cockpit = ref<PortfolioTeacherProgressCockpitVO | null>(null)
const requestToken = ref(0)

function optionalCount(value: number | undefined | null): string {
  return value == null ? '—' : String(value)
}

const metrics = computed((): SignalMetric[] => {
  if (!cockpit.value) {
    return []
  }
  const row = cockpit.value

  // 档案袋任务心智：缺口/退回/待审优先为主卡；否则完整度主卡
  const gapPrimary: SignalMetric = {
    key: 'openGap',
    label: '补采待办',
    value: row.openGapCount,
    unit: '项',
    tone: row.openGapCount > 0 ? 'orange' : 'green',
    emphasis: 'primary',
    actionLabel: row.openGapCount > 0 ? '去补齐' : undefined,
    helper: row.openGapCount > 0 ? '优先关闭材料缺口' : '暂无补采待办',
    clickable: true,
  }
  const returnedPrimary: SignalMetric = {
    key: 'returned',
    label: '退回待改',
    value: row.returnedCount,
    unit: '条',
    tone: row.returnedCount > 0 ? 'orange' : 'green',
    emphasis: 'primary',
    actionLabel: row.returnedCount > 0 ? '处理退回' : undefined,
    helper: row.returnedCount > 0 ? '退回材料待修订' : '暂无退回',
    clickable: true,
  }
  const reviewPrimary: SignalMetric = {
    key: 'pendingReview',
    label: '待审档案',
    value: row.pendingReviewCount,
    unit: '条',
    tone: row.pendingReviewCount > 0 ? 'blue' : 'green',
    emphasis: 'primary',
    actionLabel: row.pendingReviewCount > 0 ? '去审核' : undefined,
    helper: row.pendingReviewCount > 0 ? '档案待审队列' : '暂无待审',
    clickable: true,
  }
  const completenessPrimary: SignalMetric = {
    key: 'completeness',
    label: `${row.currentAcademicYear} 完整度`,
    value: row.completenessPercent,
    unit: '%',
    tone: row.completenessPercent >= 80 ? 'green' : 'orange',
    emphasis: 'primary',
    actionLabel: '查看完整度',
    helper: '本学年档案完整度',
    clickable: true,
    showProgress: true,
    progress: row.completenessPercent,
  }

  const primary
    = row.openGapCount > 0
      ? gapPrimary
      : row.returnedCount > 0
        ? returnedPrimary
        : row.pendingReviewCount > 0
          ? reviewPrimary
          : completenessPrimary

  const secondaryPool: SignalMetric[] = [
    {
      key: 'completeness',
      label: `${row.currentAcademicYear} 完整度`,
      value: row.completenessPercent,
      unit: '%',
      tone: row.completenessPercent >= 80 ? 'green' : 'orange',
      emphasis: 'secondary',
      clickable: true,
      showProgress: true,
      progress: row.completenessPercent,
    },
    {
      key: 'pendingReview',
      label: '待审档案',
      value: row.pendingReviewCount,
      unit: '条',
      tone: row.pendingReviewCount > 0 ? 'blue' : 'green',
      emphasis: 'secondary',
      clickable: true,
    },
    {
      key: 'returned',
      label: '退回待改',
      value: row.returnedCount,
      unit: '条',
      tone: row.returnedCount > 0 ? 'orange' : 'green',
      emphasis: 'secondary',
      clickable: true,
    },
    {
      key: 'openGap',
      label: '补采待办',
      value: row.openGapCount,
      unit: '项',
      tone: row.openGapCount > 0 ? 'orange' : 'green',
      emphasis: 'secondary',
      clickable: true,
    },
  ]

  if (row.courseArchiveTaughtCourseCount != null && row.courseArchiveTaughtCourseCount > 0) {
    const done = row.courseArchiveFrameworkSlotDone
    const total = row.courseArchiveFrameworkSlotTotal
    secondaryPool.push({
      key: 'courseArchive',
      label: '课程五框架',
      value: optionalCount(done),
      unit: total == null ? '' : `/${total}`,
      tone: done != null && total != null && done >= total ? 'green' : 'orange',
      emphasis: 'secondary',
      clickable: true,
    })
  }
  if (row.completenessDeltaVsPreviousYear !== undefined) {
    secondaryPool.push({
      key: 'delta',
      label: '较上学年',
      value: `${row.completenessDeltaVsPreviousYear >= 0 ? '+' : ''}${row.completenessDeltaVsPreviousYear}`,
      unit: '%',
      tone: row.completenessDeltaVsPreviousYear >= 0 ? 'green' : 'orange',
      emphasis: 'secondary',
      trend: row.completenessDeltaVsPreviousYear,
      trendPolarity: 'positive',
      clickable: true,
    })
  }

  return [
    primary,
    ...secondaryPool.filter((item) => item.key !== primary.key).slice(0, 3),
  ]
})

async function loadCockpit() {
  const currentToken = ++requestToken.value
  if (!props.teacherId) {
    cockpit.value = null
    loading.value = false
    return
  }
  loading.value = true
  try {
    const nextCockpit = await portfolioAnalysisApi.getProgressCockpit({
      teacherId: props.teacherId,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    cockpit.value = nextCockpit
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    cockpit.value = null
    showUserError(error, '加载进度驾驶舱失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

watch(
  () => props.teacherId,
  (teacherId) => {
    requestToken.value += 1
    if (!teacherId) {
      cockpit.value = null
      loading.value = false
      return
    }
    if (props.autoLoad) {
      void loadCockpit()
    }
  },
  { immediate: true },
)

defineExpose({ reload: loadCockpit, loading, cockpit })
</script>
