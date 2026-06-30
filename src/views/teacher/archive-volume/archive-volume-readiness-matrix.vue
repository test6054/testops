<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title title="迎评就绪度矩阵">
        <template #status>
          <UiTag tone="blue" size="sm">四学期全景</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiLoadFailure
      v-if="loadError"
      title="加载就绪度矩阵失败"
      :description="loadError"
    />

    <section v-else class="archive-readiness-matrix">
      <div class="archive-readiness-matrix__toolbar">
        <AnalysisSemesterSelect
          v-model="filterModel.endAcademicYearSemester"
          placeholder="请选择截止学期"
          :allow-clear="false"
          :default-recent-semester-count="4"
          style="width: 220px"
        />
        <a-select
          v-model:value="filterModel.termCount"
          :options="termCountOptions"
          style="width: 120px"
        />
        <UiButton size="sm" @click="loadMatrix">查询</UiButton>
      </div>

      <a-spin :spinning="loading">
        <UiEmpty v-if="!loading && !matrix" description="请选择截止学期后查询" />
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
                <div>{{ formatRate(record[column.key as string]?.storedRate) }}</div>
                <div class="archive-readiness-matrix__cell-sub">
                  入库 {{ record[column.key as string]?.storedCount ?? 0 }}/{{ record[column.key as string]?.totalVolumeCount ?? 0 }}
                </div>
                <div class="archive-readiness-matrix__cell-sub">
                  完整性通过率 {{ formatRate(invertRate(record[column.key as string]?.integrityFailedRate)) }}
                </div>
                <div class="archive-readiness-matrix__cell-sub">
                  四性通过率 {{ formatRate(record[column.key as string]?.fourPropertyPassedRate) }}
                </div>
              </div>
            </template>
          </template>
        </UiDataTable>
      </a-spin>
    </section>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveReadinessCellVO,
  ArchiveReadinessMatrixVO,
  ArchiveReadinessTermColumnVO,
} from '@/apis/mark/archive-volume'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSupervisionReadinessMatrix } from '@/apis/mark/archive-volume'
import AnalysisSemesterSelect from '@/components/mark/AnalysisSemesterSelect.vue'
import ContextBar from '@/components/mark/ContextBar.vue'
import StageWorkbenchShell from '@/components/mark/StageWorkbenchShell.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiDataTable from '@/components/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiLoadFailure from '@/components/ui/UiLoadFailure.vue'
import UiTag from '@/components/ui/UiTag.vue'
import { formatAcademicTermCode } from '@/types/enums/semester-enum'
import { parseAcademicYearSemesterValue } from '@/utils/academic-year'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ArchiveVolumeReadinessMatrix' })

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const matrix = ref<ArchiveReadinessMatrixVO | null>(null)

const filterModel = reactive({
  endAcademicYearSemester: '',
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

const tableScrollX = computed(() => 320 + (matrix.value?.termColumns.length ?? 0) * 132)

function termKey(columnKey: string) {
  return `term-${columnKey}`
}

function formatTermColumnTitle(term: ArchiveReadinessTermColumnVO) {
  return formatAcademicTermCode(`${term.academicYear}_${term.semester}`)
}

function formatRate(value?: number) {
  if (value === undefined || value === null) return '—'
  return `${Math.round(value * 1000) / 10}%`
}

function invertRate(value?: number) {
  if (value === undefined || value === null) return undefined
  return 1 - value
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList', query: { tab: 'supervision' } })
}

async function loadMatrix() {
  if (!filterModel.endAcademicYearSemester) {
    matrix.value = null
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const { academicYear, semester } = parseAcademicYearSemesterValue(filterModel.endAcademicYearSemester)
    matrix.value = await getSupervisionReadinessMatrix({
      endAcademicYear: academicYear,
      endSemester: semester,
      termCount: filterModel.termCount,
    })
  }
  catch (error) {
    matrix.value = null
    loadError.value = getUserErrorMessage(error, '加载就绪度矩阵失败')
    showUserError(error, '加载就绪度矩阵失败')
  }
  finally {
    loading.value = false
  }
}
</script>

<style scoped>
.archive-readiness-matrix__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

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
