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
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <WorkbenchSurfaceCard flush class="archive-readiness-matrix">
      <template #toolbar>
        <AnalysisSemesterSelect
          v-model:academic-year="filterModel.endAcademicYear"
          v-model:semester="filterModel.endSemester"
          :allow-clear="false"
          :default-recent-semester-count="4"
        />
        <a-select
          v-model:value="filterModel.termCount"
          :options="termCountOptions"
          style="width: 120px"
        />
        <UiButton size="sm" @click="loadMatrix">查询</UiButton>
      </template>

      <UiSkeletonState v-if="loading" variant="card" compact />
      <UiEmpty v-else-if="!matrix" description="请选择截止学年与学期后查询" />
      <UiDataTable
        v-else-if="matrix"
        pagination-mode="none"
        :columns="tableColumns"
        :data-source="tableRows"
        :show-pagination="false"
        flat
        row-key="rowKey"
        size="small"
        class="archive-readiness-matrix__table"
        :scroll="{ x: tableScrollX }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key?.startsWith('term-')">
            <div class="archive-readiness-matrix__cell">
              <span :class="readinessRateCellClass(termCell(record, column.key)?.storedRate ?? 0)">
                {{ formatReadinessRate(termCell(record, column.key)?.storedRate) }}
              </span>
              <div class="archive-readiness-matrix__cell-sub">
                入库 {{ termCell(record, column.key)?.storedCount ?? 0 }}/{{ termCell(record, column.key)?.totalVolumeCount ?? 0 }}
              </div>
              <div class="archive-readiness-matrix__cell-sub">
                完整性通过率 {{ formatReadinessRate(invertReadinessRate(termCell(record, column.key)?.integrityFailedRate)) }}
              </div>
              <div class="archive-readiness-matrix__cell-sub">
                四性通过率 {{ formatReadinessRate(termCell(record, column.key)?.fourPropertyPassedRate) }}
              </div>
            </div>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <ArchiveVolumeListNextStepsPanel variant="readiness-matrix" />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveReadinessCellVO,
  ArchiveReadinessMatrixResponse,
  ArchiveReadinessTermColumnVO,
} from '@/apis/mark/archive-volume'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSupervisionReadinessMatrix } from '@/apis/mark/archive-volume'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { formatAcademicYearSemester } from '@/types/enums/semester-enum'
import { buildRequiredAcademicYearSemesterQuery } from '@/utils/academic-year-semester-query'
import {
  formatReadinessRate,
  invertReadinessRate,
  readinessRateCellClass,
} from '@/utils/archive-readiness-matrix-ui'
import { showUserError } from '@/utils/error-handler'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'

defineOptions({ name: 'ArchiveVolumeReadinessMatrix' })

const router = useRouter()
const loading = ref(false)
const matrix = ref<ArchiveReadinessMatrixResponse | null>(null)

const filterModel = reactive<{
  endAcademicYear: string | undefined
  endSemester: SemesterCode | undefined
  termCount: number
}>({
  endAcademicYear: undefined,
  endSemester: undefined,
  termCount: 4,
})

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
    { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 140, fixed: 'left' },
    { title: '课程', dataIndex: 'courseName', key: 'courseName', width: 180, fixed: 'left' },
  ]
  for (const term of matrix.value?.termColumns ?? []) {
    columns.push({
      title: formatTermColumnTitle(term),
      key: termKey(termColumnKey(term)),
      width: 132,
    })
  }
  return columns
})

const tableRows = computed<ReadinessTableRow[]>(() => {
  if (!matrix.value) return []
  return matrix.value.rows.map((row) => {
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
  if (!matrix.value) return []
  return [
    { key: 'rows', label: '院系课程', value: tableRows.value.length },
    { key: 'terms', label: '学期列', value: matrix.value.termColumns.length },
  ]
})

const tableScrollX = computed(() => 320 + (matrix.value?.termColumns.length ?? 0) * 132)

function termKey(columnKey: string) {
  return `term-${columnKey}`
}

function isArchiveReadinessCell(value: unknown): value is ArchiveReadinessCellVO {
  return typeof value === 'object'
    && value !== null
    && 'storedCount' in value
    && 'totalVolumeCount' in value
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

async function loadMatrix() {
  const termQuery = buildRequiredAcademicYearSemesterQuery(
    filterModel.endAcademicYear,
    filterModel.endSemester,
  )
  if (!termQuery) {
    matrix.value = null
    return
  }
  loading.value = true
  try {
    matrix.value = await getSupervisionReadinessMatrix({
      endAcademicYear: termQuery.academicYear,
      endSemester: termQuery.semester,
      termCount: filterModel.termCount,
    })
  }
  catch (error) {
    matrix.value = null
    showUserError(error, '加载就绪度矩阵失败')
  }
  finally {
    loading.value = false
  }
}
</script>

<style scoped>
.archive-readiness-matrix__table {
  margin-top: 8px;
}

.archive-readiness-matrix__cell {
  line-height: 1.4;
}

.archive-readiness-matrix__cell-sub {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}
</style>
