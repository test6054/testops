<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="迎评就绪度矩阵" subtitle="历史归档">
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand :metrics="signalMetrics" variant="panel" />
    </template>

    <WorkbenchSurfaceCard flush class="archive-readiness-matrix">
      <template #toolbar>
        <div class="archive-readiness-matrix__filters">
          <UiSelect
            size="sm"
            v-model="filterForm.academicYearStartYear"
            :options="academicYearStartOptions"
            placeholder="起始年"
            style="width: 140px"
          />
          <UiInput
            size="sm"
            :value="filterForm.academicYearEndYear"
            disabled
            style="width: 100px"
            placeholder="结束年"
          />
          <UiSelect
            size="sm"
            v-model="filterForm.semester"
            :options="SemesterOptions"
            placeholder="学期"
            style="width: 120px"
          />
          <UiSelect
            size="sm"
            v-model="filterForm.termCount"
            :options="termCountOptions"
            style="width: 120px"
          />
          <UiSelect
            size="sm"
            v-model="filterForm.campaignId"
            :loading="campaignOptionLoading"
            :options="campaignOptions"
            allow-clear
            placeholder="迎评批次（可选）"
            style="width: 280px"
          />
          <UiButton size="sm" variant="primary" @click="handleSearch">查询</UiButton>
        </div>
      </template>

      <UiSkeletonState v-if="loading && !matrixMeta" variant="card" compact />
      <UiAlertStrip
        v-else-if="!matrixMeta"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
      >
        <template #default>
          <span style="display:inline-flex;align-items:center;gap:8px">
            <UiTag tone="blue" size="sm">未选择范围</UiTag>
            <span>请选择截止学年与学期后查询就绪矩阵</span>
          </span>
        </template>
      </UiAlertStrip>
      <UiDataTable
        v-else
        v-model:current="pagination.pageNum"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :columns="tableColumns"
        :data-source="tableRows"
        :loading="loading"
        :total="pagination.total"
        flat
        row-key="rowKey"
        size="small"
        class="archive-readiness-matrix__table"
        :scroll="{ x: tableScrollX }"
        :sticky-header="false"
        @page-change="loadMatrixPage"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key?.startsWith('term-')">
            <div class="archive-readiness-matrix__cell">
              <span :class="readinessRateCellClass(termCell(record, column.key)?.storedRate ?? 0)">
                {{ formatReadinessRate(termCell(record, column.key)?.storedRate) }}
              </span>
              <div class="archive-readiness-matrix__cell-sub">
                入库 {{ termCell(record, column.key)?.storedCount ?? 0 }}/{{
                  termCell(record, column.key)?.totalVolumeCount ?? 0
                }}
              </div>
              <div class="archive-readiness-matrix__cell-sub">
                完整性通过率
                {{
                  formatReadinessRate(
                    invertReadinessRate(termCell(record, column.key)?.integrityFailedRate),
                  )
                }}
              </div>
              <div class="archive-readiness-matrix__cell-sub">
                四性通过率
                {{ formatReadinessRate(termCell(record, column.key)?.fourPropertyPassedRate) }}
              </div>
            </div>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignResponse,
  ArchiveReadinessCellVO,
  ArchiveReadinessMatrixMetaResponse,
  ArchiveReadinessMatrixRowVO,
  ArchiveReadinessTermColumnVO,
} from '@/apis/mark/archive-volume'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getSupervisionReadinessMatrixMeta,
  pageSupervisionCampaigns,
  pageSupervisionReadinessMatrix,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE, EXPORT_PAGE_SIZE } from '@/constants/pagination'
import { formatAcademicYearSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { generateAcademicYearStartOptions } from '@/utils/academic-year'
import {
  applyAcademicYearStartYearChange,
  createAcademicYearSemesterTripleDefaults,
  ensureTriplePeriodPair,
  resolveAcademicYearFromTriple,
} from '@/utils/academic-year-semester-triple-filter'
import {
  formatReadinessRate,
  invertReadinessRate,
  readinessRateCellClass,
} from '@/utils/archive-readiness-matrix-ui'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ArchiveVolumeReadinessMatrix' })

const router = useRouter()
const loading = ref(false)
const campaignOptionLoading = ref(false)
const campaignSelectOptions = ref<ArchiveEvaluationCampaignResponse[]>([])
const matrixMeta = ref<ArchiveReadinessMatrixMetaResponse | null>(null)
const matrixRows = ref<ArchiveReadinessMatrixRowVO[]>([])
const pagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

const academicYearStartOptions = generateAcademicYearStartOptions().map((year) => ({
  label: `${year} 年`,
  value: year,
}))

const filterForm = reactive<{
  academicYearStartYear: number | undefined
  academicYearEndYear: number | undefined
  semester: SemesterCode | undefined
  termCount: number
  campaignId: string | undefined
}>({
  ...createAcademicYearSemesterTripleDefaults(true),
  termCount: 4,
  campaignId: undefined,
})

const campaignOptions = computed(() =>
  campaignSelectOptions.value.map((campaign) => ({
    value: campaign.campaignId,
    label: campaign.campaignName,
  })),
)

const termCountOptions = [
  { value: 4, label: '近 4 学期' },
  { value: 6, label: '近 6 学期' },
  { value: 8, label: '近 8 学期' },
]

interface ReadinessTableRow {
  rowKey: string
  departmentName: string
  courseName: string
  [termKey: string]: string | ArchiveReadinessCellVO | undefined
}

function termColumnKey(term: ArchiveReadinessTermColumnVO) {
  return `${term.academicYear}_${term.semester}`
}

const tableColumns = computed<ColumnsType<ReadinessTableRow>>(() => {
  const columns: ColumnsType<ReadinessTableRow> = [
    {
      title: '院系',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 140,
      fixed: 'left',
    },
    { title: '课程', dataIndex: 'courseName', key: 'courseName', width: 180 },
  ]
  for (const term of matrixMeta.value?.termColumns ?? []) {
    columns.push({
      title: formatTermColumnTitle(term),
      key: termKey(termColumnKey(term)),
      width: 132,
    })
  }
  return columns
})

const tableRows = computed<ReadinessTableRow[]>(() => {
  return matrixRows.value.map((row) => {
    const tableRow: ReadinessTableRow = {
      rowKey: `${row.departmentId ?? 'none'}-${row.courseId ?? 'none'}`,
      departmentName: row.departmentName ?? '—',
      courseName: row.courseName ?? '—',
    }
    for (const cell of row.cells) {
      tableRow[termKey(termColumnKey(cell))] = cell
    }
    return tableRow
  })
})

const signalMetrics = computed<SignalMetric[]>(() => {
  if (!matrixMeta.value) return []
  return [
    { key: 'rows', label: '院系课程', value: matrixMeta.value.rowCount },
    { key: 'terms', label: '学期列', value: matrixMeta.value.termColumnCount },
  ]
})

const tableScrollX = computed(() => 320 + (matrixMeta.value?.termColumns.length ?? 0) * 132)

function termKey(columnKey: string) {
  return `term-${columnKey}`
}

function isArchiveReadinessCell(value: unknown): value is ArchiveReadinessCellVO {
  return (
    typeof value === 'object'
    && value !== null
    && 'storedCount' in value
    && 'totalVolumeCount' in value
  )
}

function termCell(record: ReadinessTableRow, key: unknown): ArchiveReadinessCellVO | undefined {
  if (typeof key !== 'string') {
    return undefined
  }
  const value = record[key]
  return isArchiveReadinessCell(value) ? value : undefined
}

function formatTermColumnTitle(term: ArchiveReadinessTermColumnVO) {
  return formatAcademicYearSemester(term.academicYear, term.semester)
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList', query: { tab: 'supervision' } })
}

function buildMatrixRequest() {
  if (!ensureTriplePeriodPair(filterForm)) {
    return null
  }
  const endAcademicYear = resolveAcademicYearFromTriple(filterForm)
  if (!endAcademicYear || !filterForm.semester) {
    return null
  }
  return {
    endAcademicYear,
    endSemester: filterForm.semester,
    termCount: filterForm.termCount,
    campaignId: filterForm.campaignId,
  }
}

async function loadMatrixPage() {
  const baseRequest = buildMatrixRequest()
  if (!baseRequest) {
    return
  }
  loading.value = true
  try {
    const page = await pageSupervisionReadinessMatrix({
      ...baseRequest,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    matrixRows.value = page.list
    pagination.total = page.total
    pagination.pageNum = page.pageNum
    pagination.pageSize = page.pageSize
  } catch (error) {
    matrixRows.value = []
    pagination.total = 0
    showUserError(error, '加载就绪度矩阵失败')
  } finally {
    loading.value = false
  }
}

async function loadMatrix() {
  const baseRequest = buildMatrixRequest()
  if (!baseRequest) {
    matrixMeta.value = null
    matrixRows.value = []
    pagination.total = 0
    return
  }
  loading.value = true
  try {
    matrixMeta.value = await getSupervisionReadinessMatrixMeta(baseRequest)
    pagination.pageNum = 1
    pagination.total = matrixMeta.value.rowCount
    const page = await pageSupervisionReadinessMatrix({
      ...baseRequest,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    matrixRows.value = page.list
    pagination.total = page.total
    pagination.pageNum = page.pageNum
    pagination.pageSize = page.pageSize
  } catch (error) {
    matrixMeta.value = null
    matrixRows.value = []
    pagination.total = 0
    showUserError(error, '加载就绪度矩阵失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  void loadMatrix()
}

watch(
  () => filterForm.academicYearStartYear,
  (startYear) => {
    applyAcademicYearStartYearChange(filterForm, startYear)
  },
)

onMounted(() => {
  void loadCampaignOptions()
  void loadMatrix()
})

async function loadCampaignOptions(): Promise<void> {
  campaignOptionLoading.value = true
  try {
    const all: ArchiveEvaluationCampaignResponse[] = []
    let pageNum = 1
    while (true) {
      const page = await pageSupervisionCampaigns({ pageNum, pageSize: EXPORT_PAGE_SIZE })
      all.push(...page.list)
      if (all.length >= page.total) {
        break
      }
      pageNum += 1
    }
    campaignSelectOptions.value = all
  } catch (error) {
    campaignSelectOptions.value = []
    showUserError(error, '迎评批次选项加载失败')
  } finally {
    campaignOptionLoading.value = false
  }
}
</script>

<style scoped>
.archive-readiness-matrix__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}

.archive-readiness-matrix__table {
  margin-top: 8px;
}

.archive-readiness-matrix__cell {
  line-height: 1.4;
}

.archive-readiness-matrix__cell-sub {
  color: var(--dp-text-muted);
  font-size: 12px;
}
</style>
