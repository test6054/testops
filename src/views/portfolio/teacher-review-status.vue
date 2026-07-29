<script setup lang="ts">
import type { PortfolioArchiveRecordStatusCode } from '@/apis/portfolio/enums'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import type { SignalMetric } from '@/types/workbench'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES,
  PORTFOLIO_ARCHIVE_RECORD_STATUS_OPTIONS,
  PortfolioArchiveRecordStatusDescription,
} from '@/apis/portfolio/enums'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import PortfolioTeacherReviewStatusTable from '@/components/portfolio/PortfolioTeacherReviewStatusTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { usePortfolioTeacherJourneyRail } from '@/composables/usePortfolioTeacherJourneyRail'
import { resolvePortfolioJourneyDefaultRoute } from '@/constants/portfolio-teacher-journey'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const activeJourneyKey: PortfolioTeacherJourneyKey = 'review'
const { journeyStages, loadFailed, lastSuccessAt } = usePortfolioTeacherJourneyRail(activeJourneyKey)
const reviewStatusTotal = ref(0)

interface TeacherReviewStatusFilterForm extends Record<string, unknown> {
  academicYear?: string
  recordStatus?: PortfolioArchiveRecordStatusCode
}

const filterForm = reactive<TeacherReviewStatusFilterForm>({})
const appliedFilters = reactive<TeacherReviewStatusFilterForm>({})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const recordStatusOptions = PORTFOLIO_ARCHIVE_RECORD_STATUS_OPTIONS.map((item) => ({
  value: item.value,
  label: strictEnumLabel(PortfolioArchiveRecordStatusDescription, item.value, '档案记录状态'),
}))

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'academicYear',
    type: 'input',
    label: '学年',
    allowClear: true,
    width: 140,
    placeholder: '如 2024-2025',
  },
  {
    key: 'recordStatus',
    type: 'select',
    label: '档案状态',
    allowClear: true,
    width: 160,
    options: recordStatusOptions,
  },
])

const highlightRecordId = computed(() =>
  typeof route.query.highlightRecordId === 'string' ? route.query.highlightRecordId : undefined,
)


/** 审核闭环 Signal：记录规模为主，强调待办队列而非报表墙。 */
const TeacherReviewStatusSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadFailed.value && reviewStatusTotal.value === 0) {
    return []
  }
  return applySpotlightEmphasis([
    {
      key: 'total',
      label: '审核队列',
      value: reviewStatusTotal.value,
      unit: '条',
      helper: filterForm.recordStatus
        ? `已筛选：${strictEnumLabel(PortfolioArchiveRecordStatusDescription, filterForm.recordStatus, '档案记录状态')}`
        : '当前筛选范围内档案审核记录',
      clickable: true,
    },
  ], { primaryKey: 'total', actionLabel: '定位列表' })
})

function onTeacherReviewStatusSignalClick(_key: string) {
  const el = document.querySelector('.teacher-review-status__filter')
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const reviewStatusSubtitle = computed(() => {
  if (loadFailed.value) {
    return '旅程快照失败'
  }
  if (reviewStatusTotal.value > 0) {
    return `审核队列 ${reviewStatusTotal.value} 条`
  }
  return lastSuccessAt.value ? '暂无待审/在审记录' : '审核闭环'
})

function goTeacherArchiveFromReview() {
  void router.push({
    name: 'PortfolioTeacherArchive',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goTeacherIntakeFromReview() {
  void router.push({
    name: 'PortfolioTeacherIntake',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function onReviewStatusTotalChange(total: number) {
  reviewStatusTotal.value = total
}

function readRecordStatusFromQuery(value: unknown): PortfolioArchiveRecordStatusCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES.find((code) => code === value)
}

function syncFiltersFromRoute() {
  const academicYear
    = typeof route.query.academicYear === 'string' ? route.query.academicYear.trim() : ''
  filterForm.academicYear = academicYear || undefined
  filterForm.recordStatus = readRecordStatusFromQuery(route.query.recordStatus)
}

function navigateJourney(journeyKey: PortfolioTeacherJourneyKey) {
  void router.push({
    ...resolvePortfolioJourneyDefaultRoute(journeyKey),
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function handleSearch() {
  appliedFilters.academicYear = filterForm.academicYear
  appliedFilters.recordStatus = filterForm.recordStatus
}

watch(
  () => [route.query.academicYear, route.query.recordStatus],
  () => {
    syncFiltersFromRoute()
    handleSearch()
  },
  { immediate: true },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="审核闭环" :subtitle="reviewStatusSubtitle">
        <template #actions>
          <UiButton size="sm" variant="outline" @click="goTeacherIntakeFromReview">材料采集</UiButton>
          <UiButton size="sm" variant="ghost" @click="goTeacherArchiveFromReview">我的档案</UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="TeacherReviewStatusSignalMetrics.length > 0" #signal>
      <SignalBand layout="spotlight" variant="inline" compact :metrics="TeacherReviewStatusSignalMetrics" @metric-click="onTeacherReviewStatusSignalClick" />
    </template>
    <template #rail>
      <PortfolioTeacherJourneyRail
        v-if="journeyStages.length > 0"
        :stages="journeyStages"
        :active-key="activeJourneyKey"
        @select="navigateJourney"
      />
    </template>

    <UiAlertStrip
      v-if="loadFailed"
      tone="error"
      title="旅程快照加载失败"
    />

    <UiFilterBar
      v-model="filterModel"
      class="teacher-review-status__filter"
      :fields="filterFields"
      @search="handleSearch"
    />

    <PortfolioTeacherReviewStatusTable
      v-if="targetTeacherId || !canPickTeachers"
      :teacher-id="targetTeacherId"
      :academic-year="appliedFilters.academicYear"
      :record-status="appliedFilters.recordStatus"
      :highlight-record-id="highlightRecordId"
      @total-change="onReviewStatusTotalChange"
    />
    <PortfolioTeacherPickGate v-else />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-review-status__filter {
  margin: var(--dp-space-block);
}
</style>
