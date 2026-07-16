<script setup lang="ts">
import type { PortfolioArchiveRecordStatusCode } from '@/apis/portfolio/enums'
import {
  ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES,
  PORTFOLIO_ARCHIVE_RECORD_STATUS_OPTIONS,
  PortfolioArchiveRecordStatusDescription,
} from '@/apis/portfolio/enums'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import {
  PORTFOLIO_TEACHER_JOURNEY_STEPS,
  resolvePortfolioJourneyDefaultRoute,
} from '@/constants/portfolio-teacher-journey'
import type { WorkbenchStage } from '@/types/workbench'
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import PortfolioTeacherReviewStatusTable from '@/components/portfolio/PortfolioTeacherReviewStatusTable.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { strictEnumLabel } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

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

const journeyStages = computed((): WorkbenchStage[] =>
  PORTFOLIO_TEACHER_JOURNEY_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    status: step.key === 'review' ? 'active' : 'pending',
  })),
)

function readRecordStatusFromQuery(value: unknown): PortfolioArchiveRecordStatusCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return ALL_PORTFOLIO_ARCHIVE_RECORD_STATUS_CODES.find((code) => code === value)
}

function syncFiltersFromRoute() {
  const academicYear =
    typeof route.query.academicYear === 'string' ? route.query.academicYear.trim() : ''
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
      <ContextBar show-title layout="workbench" title="审核进度" />
    </template>
    <template #rail>
      <PortfolioTeacherJourneyRail
        :stages="journeyStages"
        active-key="review"
        @select="navigateJourney"
      />
    </template>

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
    />
    <UiEmpty
      v-else
      class="teacher-review-status__empty"
      description="请从教师名册选择目标教师，或在 URL 携带 teacherId 参数"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-review-status__filter {
  margin: var(--dp-space-4);
}

.teacher-review-status__empty {
  margin: var(--dp-space-8) var(--dp-space-4);
}
</style>
