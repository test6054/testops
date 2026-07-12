<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentPlanStatusCode } from '@/apis/portfolio/enums'
import type {
  PortfolioDeptOneTableSummaryVO,
  PortfolioDeptOneTableTeacherRowVO,
} from '@/apis/portfolio/teacher'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
  PortfolioDevelopmentPlanStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import MarkChart from '@/components/chart/MarkChart.vue'
import MarkChartCard from '@/components/chart/MarkChartCard.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const { loadTree, departmentOptions: loadDepartmentOptions } = usePortfolioOrgTree()
const departmentOptions = computed(() => loadDepartmentOptions())
const userStore = useUserStore()
const loading = ref(false)
const teacherLoading = ref(false)
const exporting = ref(false)
const summaryRequestToken = ref(0)
const teacherRequestToken = ref(0)
const summary = ref<PortfolioDeptOneTableSummaryVO | null>(null)
const teacherRows = ref<PortfolioDeptOneTableTeacherRowVO[]>([])
const teacherTotal = ref(0)
interface PortfolioDepartmentOneTableFilter {
  departmentId: string
  planYear: string
}

const filter = reactive<PortfolioDepartmentOneTableFilter>({
  departmentId: '',
  planYear: String(new Date().getFullYear()),
})
const teacherQuery = reactive({
  pageNum: 1,
  pageSize: 10,
})

const titleStructureRows: Array<{
  key:
    | 'titleSeniorCount'
    | 'titleAssociateCount'
    | 'titleMiddleCount'
    | 'titleJuniorCount'
    | 'titleUnclassifiedCount'
  label: string
}> = [
  { key: 'titleSeniorCount', label: '高级职称' },
  { key: 'titleAssociateCount', label: '副高级' },
  { key: 'titleMiddleCount', label: '中级' },
  { key: 'titleJuniorCount', label: '初级' },
  { key: 'titleUnclassifiedCount', label: '未分类' },
]

const titleStructureColumns: ColumnsType<(typeof titleStructureRows)[number]> = [
  { title: '职称层级', dataIndex: 'label', key: 'label' },
  { title: '人数', key: 'count', width: 88, align: 'right' },
]

const teacherColumns: ColumnsType = [
  { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 100 },
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 100 },
  { title: '职称', dataIndex: 'title', key: 'title', width: 100 },
  { title: '双师', key: 'dualTeacherApproved', width: 64 },
  { title: '骨干', key: 'keyTeacherActive', width: 64 },
  { title: '外聘', key: 'externalTeacher', width: 64 },
  { title: '成果', dataIndex: 'achievementCount', key: 'achievementCount', width: 64 },
  { title: '荣誉', dataIndex: 'honorCount', key: 'honorCount', width: 64 },
  { title: '规划状态', key: 'developmentPlanStatus', width: 88 },
  { title: '明细完成度', key: 'developmentPlanItemCompletionPercent', width: 96 },
]

const titleChartOption = computed(() => {
  if (!summary.value) {
    return {}
  }
  return {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        data: titleStructureRows
          .map((row) => ({
            name: row.label,
            value: summary.value?.[row.key] ?? 0,
          }))
          .filter((item) => item.value > 0),
      },
    ],
  }
})

async function loadSummary() {
  const currentToken = ++summaryRequestToken.value
  if (!filter.departmentId) {
    summary.value = null
    teacherRows.value = []
    teacherTotal.value = 0
    loading.value = false
    return
  }
  loading.value = true
  const request = {
    departmentId: filter.departmentId,
    planYear: filter.planYear.trim() || undefined,
  }
  try {
    const nextSummary = await portfolioTeacherApi.getDeptOneTableSummary(request)
    if (currentToken !== summaryRequestToken.value) {
      return
    }
    summary.value = nextSummary
  } catch (error) {
    if (currentToken !== summaryRequestToken.value) {
      return
    }
    showUserError(error)
  } finally {
    if (currentToken === summaryRequestToken.value) {
      loading.value = false
    }
  }
}

async function loadTeachers() {
  const currentToken = ++teacherRequestToken.value
  if (!filter.departmentId) {
    teacherRows.value = []
    teacherTotal.value = 0
    teacherLoading.value = false
    return
  }
  teacherLoading.value = true
  const request = {
    departmentId: filter.departmentId,
    planYear: filter.planYear.trim() || undefined,
    pageNum: teacherQuery.pageNum,
    pageSize: teacherQuery.pageSize,
  }
  try {
    const page = await portfolioTeacherApi.pageDeptOneTableTeachers(request)
    if (currentToken !== teacherRequestToken.value) {
      return
    }
    teacherRows.value = page.list
    teacherQuery.pageNum = page.pageNum
    teacherQuery.pageSize = page.pageSize
    teacherTotal.value = page.total
  } catch (error) {
    if (currentToken !== teacherRequestToken.value) {
      return
    }
    showUserError(error)
  } finally {
    if (currentToken === teacherRequestToken.value) {
      teacherLoading.value = false
    }
  }
}

async function reloadAll() {
  summaryRequestToken.value += 1
  teacherRequestToken.value += 1
  teacherQuery.pageNum = 1
  await Promise.all([loadSummary(), loadTeachers()])
}

async function exportDeptOneTable() {
  if (!filter.departmentId) {
    message.warning('请先选择院系')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioTeacherApi.exportDeptOneTable({
      departmentId: filter.departmentId,
      planYear: filter.planYear.trim() || undefined,
    })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 行`)
  } catch (error) {
    showUserError(error)
  } finally {
    exporting.value = false
  }
}

function structureCount(key: (typeof titleStructureRows)[number]['key']) {
  return summary.value?.[key] ?? 0
}

function handleTeacherPageChange(page: { current: number, pageSize: number }) {
  teacherQuery.pageNum = page.current
  teacherQuery.pageSize = page.pageSize
  void loadTeachers()
}

function boolLabel(value?: boolean) {
  return value ? '是' : '—'
}

function planStatusLabel(status?: PortfolioDevelopmentPlanStatusCode): string {
  if (!status) {
    return '—'
  }
  return strictEnumLabel(PortfolioDevelopmentPlanStatusDescription, status, '教师发展规划状态')
}

function planStatusTone(status?: PortfolioDevelopmentPlanStatusCode): BadgeTone {
  if (!status) {
    return 'gray'
  }
  return PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE[status]
}

onMounted(async () => {
  await loadTree()
  const currentUserId = userStore.userInfo.userId
  if (!currentUserId) {
    showUserError(new Error('当前登录用户缺失'), '定位当前用户所属院系失败')
    return
  }
  try {
    const teacher = await portfolioTeacherApi.get(currentUserId)
    if (!teacher.departmentId) {
      showUserError(new Error('当前教师未关联院系'), '定位当前用户所属院系失败')
      return
    }
    filter.departmentId = teacher.departmentId
  } catch (error) {
    showUserError(error, '定位当前用户所属院系失败')
  }
})

watch(
  () => [filter.departmentId, filter.planYear],
  () => {
    void reloadAll()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="部门一张表" subtitle="院系师资结构 · 教师明细 · 职称分布">
      <template #actions>
        <UiButton :loading="exporting" :disabled="!filter.departmentId" @click="exportDeptOneTable">
          导出部门一张表
        </UiButton>
      </template>
    </ContextBar>
    <UiCard>
      <div class="filter-row">
        <a-select
          v-model:value="filter.departmentId"
          placeholder="选择院系"
          style="width: 240px"
          :options="departmentOptions"
          allow-clear
        />
        <a-input
          v-model:value="filter.planYear"
          placeholder="规划年度（可选）"
          style="width: 140px"
        />
      </div>
      <a-spin :spinning="loading">
        <UiEmpty v-if="!filter.departmentId" description="请选择院系查看部门一张表" />
        <UiEmpty v-else-if="!loading && !summary" description="暂无该院系汇总数据" />
        <template v-else-if="summary">
          <a-descriptions :column="3" size="small" bordered style="margin-top: 16px">
            <a-descriptions-item label="院系">
              {{ summary.departmentName ?? '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="教师人数">
              {{ summary.teacherCount }}
            </a-descriptions-item>
            <a-descriptions-item label="双师通过">
              {{ summary.dualTeacherCount }}
            </a-descriptions-item>
            <a-descriptions-item label="外部师资">
              {{ summary.externalTeacherCount }}
            </a-descriptions-item>
            <a-descriptions-item label="骨干/带头人">
              {{ summary.keyTeacherCount }}
            </a-descriptions-item>
            <a-descriptions-item label="成果总数">
              {{ summary.achievementTotalCount ?? 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="荣誉总数">
              {{ summary.honorTotalCount ?? 0 }}
            </a-descriptions-item>
            <template v-if="summary.planYear">
              <a-descriptions-item label="规划年度">
                {{ summary.planYear }}
              </a-descriptions-item>
              <a-descriptions-item label="年度规划">
                {{ summary.developmentPlanApprovedCount ?? 0 }} /
                {{ summary.developmentPlanTotalCount ?? 0 }}
              </a-descriptions-item>
              <a-descriptions-item label="规划完成率">
                {{ summary.developmentPlanCompletionRatePercent ?? 0 }}%
              </a-descriptions-item>
            </template>
          </a-descriptions>
          <div class="detail-grid">
            <UiCard title="职称结构">
              <UiDataTable
                :columns="titleStructureColumns"
                :data-source="titleStructureRows"
                row-key="key"
                size="small"
                flat
                pagination-mode="none"
                :show-pagination="false"
                :sticky-header="false"
                :total="titleStructureRows.length"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'count'">
                    {{ structureCount(record.key) }}
                  </template>
                </template>
              </UiDataTable>
            </UiCard>
            <MarkChartCard title="职称分布" subtitle="该院系教师职称结构">
              <MarkChart :option="titleChartOption" height="240px" aria-label="职称结构饼图" />
            </MarkChartCard>
          </div>
          <UiCard title="教师明细" style="margin-top: 16px">
            <UiDataTable
              v-model:current="teacherQuery.pageNum"
              v-model:page-size="teacherQuery.pageSize"
              pagination-mode="server"
              :columns="teacherColumns"
              :data-source="teacherRows"
              :loading="teacherLoading"
              row-key="teacherUserId"
              :total="teacherTotal"
              @page-change="handleTeacherPageChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'dualTeacherApproved'">
                  {{ boolLabel(record.dualTeacherApproved) }}
                </template>
                <template v-else-if="column.key === 'keyTeacherActive'">
                  {{ boolLabel(record.keyTeacherActive) }}
                </template>
                <template v-else-if="column.key === 'externalTeacher'">
                  {{ boolLabel(record.externalTeacher) }}
                </template>
                <template v-else-if="column.key === 'developmentPlanStatus'">
                  <UiTag
                    v-if="record.developmentPlanStatus"
                    :tone="planStatusTone(record.developmentPlanStatus)"
                    size="sm"
                  >
                    {{ planStatusLabel(record.developmentPlanStatus) }}
                  </UiTag>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'developmentPlanItemCompletionPercent'">
                  {{
                    record.developmentPlanItemCompletionPercent != null
                      ? `${record.developmentPlanItemCompletionPercent}%`
                      : '—'
                  }}
                </template>
              </template>
            </UiDataTable>
          </UiCard>
        </template>
      </a-spin>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
