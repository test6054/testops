<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentPlanStatusCode } from '@/apis/portfolio/enums'
import type {
  PortfolioDeptOneTableSummaryVO,
  PortfolioDeptOneTableTeacherRowVO,
  PortfolioDeptTeacherSegmentItemVO,
} from '@/apis/portfolio/teacher'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
  PortfolioCompletenessLevelCode,
  PortfolioCompletenessLevelDescription,
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
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { useUserStore } from '@/stores/modules/user'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const { loadTree, departmentOptions: loadDepartmentOptions } = usePortfolioOrgTree()
const route = useRoute()
const router = useRouter()
const departmentOptions = computed(() => loadDepartmentOptions())
const userStore = useUserStore()
const loading = ref(false)
const teacherLoading = ref(false)
const exporting = ref(false)
const summaryRequestToken = ref(0)
const teacherRequestToken = ref(0)
const summary = ref<PortfolioDeptOneTableSummaryVO | null>(null)
const teacherSegments = ref<PortfolioDeptTeacherSegmentItemVO[]>([])
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
const completenessLevelFilter = ref<PortfolioCompletenessLevelCode | ''>('')

const completenessDistributionRows: Array<{
  key: PortfolioCompletenessLevelCode
  label: string
  summaryKey:
    | 'completenessCompleteCount'
    | 'completenessBasicCount'
    | 'completenessPendingCount'
    | 'completenessSevereCount'
}> = [
  {
    key: PortfolioCompletenessLevelCode.COMPLETE,
    label: '完整',
    summaryKey: 'completenessCompleteCount',
  },
  {
    key: PortfolioCompletenessLevelCode.BASIC,
    label: '基本完整',
    summaryKey: 'completenessBasicCount',
  },
  {
    key: PortfolioCompletenessLevelCode.PENDING,
    label: '待补充',
    summaryKey: 'completenessPendingCount',
  },
  {
    key: PortfolioCompletenessLevelCode.SEVERE,
    label: '严重缺失',
    summaryKey: 'completenessSevereCount',
  },
]

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readCompletenessLevelParam(value: unknown): PortfolioCompletenessLevelCode | '' {
  const raw = readRouteStringParam(value)
  if (!raw) {
    return ''
  }
  if (completenessDistributionRows.some((row) => row.key === raw)) {
    return raw as PortfolioCompletenessLevelCode
  }
  return ''
}

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
  { title: '完整度', key: 'completenessPercent', width: 88 },
  { title: '五框架', key: 'courseArchiveFramework', width: 96 },
  { title: '双师', key: 'dualTeacherApproved', width: 64 },
  { title: '骨干', key: 'keyTeacherActive', width: 64 },
  { title: '外聘', key: 'externalTeacher', width: 64 },
  { title: '成果', dataIndex: 'achievementCount', key: 'achievementCount', width: 64 },
  { title: '荣誉', dataIndex: 'honorCount', key: 'honorCount', width: 64 },
  { title: '规划状态', key: 'developmentPlanStatus', width: 88 },
  { title: '明细完成度', key: 'developmentPlanItemCompletionPercent', width: 96 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
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
    teacherSegments.value = []
    teacherRows.value = []
    teacherTotal.value = 0
    loading.value = false
    return
  }
  loading.value = true
  const request = {
    departmentId: filter.departmentId,
    planYear: filter.planYear.trim() || undefined,
    completenessLevel: completenessLevelFilter.value || undefined,
  }
  try {
    const nextSummary = await portfolioTeacherApi.getDeptOneTableSummary(request)
    if (currentToken !== summaryRequestToken.value) {
      return
    }
    summary.value = nextSummary
    try {
      const segmentSummary = await portfolioTeacherApi.getDeptTeacherSegments({
        departmentId: filter.departmentId,
      })
      if (currentToken === summaryRequestToken.value) {
        teacherSegments.value = segmentSummary.segments ?? []
      }
    } catch (error) {
      if (currentToken === summaryRequestToken.value) {
        teacherSegments.value = []
        showUserError(error, '教师完备度分段加载失败')
      }
    }
  } catch (error) {
    if (currentToken !== summaryRequestToken.value) {
      return
    }
    summary.value = null
    teacherSegments.value = []
    showUserError(error, '加载院系一张表汇总失败')
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
    completenessLevel: completenessLevelFilter.value || undefined,
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
    teacherRows.value = []
    teacherTotal.value = 0
    showUserError(error, '加载部门一张表教师列表失败')
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

function applyCompletenessFilter(level: PortfolioCompletenessLevelCode | '') {
  if (exporting.value) {
    return
  }
  completenessLevelFilter.value = level
  teacherQuery.pageNum = 1
  const query: Record<string, string> = {}
  if (filter.departmentId) {
    query.departmentId = filter.departmentId
  }
  if (filter.planYear.trim()) {
    query.planYear = filter.planYear.trim()
  }
  if (level) {
    query.completenessLevel = level
  }
  void router.replace({ path: route.path, query })
  void reloadAll()
}

function completenessFilterLabel(level: PortfolioCompletenessLevelCode): string {
  return strictEnumLabel(PortfolioCompletenessLevelDescription, level, '档案完整度分级')
}

function distributionCount(
  key: (typeof completenessDistributionRows)[number]['summaryKey'],
): number {
  return summary.value?.[key] ?? 0
}

async function exportDeptOneTable() {
  if (!filter.departmentId) {
    showFormValidationMessage('请先选择院系')
    return
  }
  if (exporting.value) {
    return
  }
  const departmentId = filter.departmentId
  const planYear = filter.planYear.trim() || undefined
  const completenessLevel = completenessLevelFilter.value || undefined
  exporting.value = true
  try {
    const result = await portfolioTeacherApi.exportDeptOneTable({
      departmentId,
      planYear,
      completenessLevel,
    })
    if (
      filter.departmentId !== departmentId
      || (filter.planYear.trim() || undefined) !== planYear
      || (completenessLevelFilter.value || undefined) !== completenessLevel
    ) {
      return
    }
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 行`)
  } catch (error) {
    showUserError(error, '导出部门一张表失败')
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

function completenessLabel(record: PortfolioDeptOneTableTeacherRowVO): string {
  if (record.completenessPercent == null) {
    return '—'
  }
  const level = record.completenessLevel
    ? strictEnumLabel(
        PortfolioCompletenessLevelDescription,
        record.completenessLevel,
        '档案完整度分级',
      )
    : ''
  return level ? `${record.completenessPercent}% · ${level}` : `${record.completenessPercent}%`
}

function courseArchiveLabel(record: PortfolioDeptOneTableTeacherRowVO): string {
  if ((record.courseArchiveFrameworkSlotTotal ?? 0) <= 0) {
    return '—'
  }
  const slot = `${record.courseArchiveFrameworkSlotDone ?? 0}/${record.courseArchiveFrameworkSlotTotal ?? 0}`
  const complete = record.courseArchiveFullyCompleteCount ?? 0
  return `${slot} · 齐备 ${complete} 门`
}

function goTeacherHome(teacherUserId: string) {
  void router.push({ path: '/portfolio/teacher/home', query: { teacherId: teacherUserId } })
}

function goTeacherOneTable(teacherUserId: string) {
  void router.push({ path: '/portfolio/teacher/one-table', query: { teacherId: teacherUserId } })
}

function goCourseArchive(teacherUserId: string) {
  void router.push({
    path: '/portfolio/teacher/course-archive',
    query: { teacherId: teacherUserId },
  })
}

onMounted(async () => {
  await loadTree()
  const queryDepartmentId = readRouteStringParam(route.query.departmentId)
  if (
    queryDepartmentId
    && departmentOptions.value.some((option) => option.value === queryDepartmentId)
  ) {
    filter.departmentId = queryDepartmentId
  }
  const queryPlanYear = readRouteStringParam(route.query.planYear)
  if (queryPlanYear) {
    filter.planYear = queryPlanYear
  }
  completenessLevelFilter.value = readCompletenessLevelParam(route.query.completenessLevel)
  if (filter.departmentId) {
    return
  }
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

watch(
  () => route.query.completenessLevel,
  (value) => {
    const nextLevel = readCompletenessLevelParam(value)
    if (nextLevel !== completenessLevelFilter.value) {
      completenessLevelFilter.value = nextLevel
      teacherQuery.pageNum = 1
      void loadTeachers()
    }
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
          :disabled="exporting"
        />
        <a-input
          v-model:value="filter.planYear"
          :disabled="exporting"
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
            <template v-if="summary.currentAcademicYear">
              <a-descriptions-item label="统计学年">
                {{ summary.currentAcademicYear }}
              </a-descriptions-item>
              <a-descriptions-item label="完整度分布">
                <span class="completeness-distribution">
                  <button
                    v-for="item in completenessDistributionRows"
                    :key="item.key"
                    type="button"
                    class="completeness-chip"
                    :class="{ 'completeness-chip--active': completenessLevelFilter === item.key }"
                    @click="
                      applyCompletenessFilter(completenessLevelFilter === item.key ? '' : item.key)
                    "
                  >
                    {{ item.label }} {{ distributionCount(item.summaryKey) }}
                  </button>
                </span>
              </a-descriptions-item>
              <a-descriptions-item
                v-if="(summary.courseArchiveFrameworkSlotTotal ?? 0) > 0"
                label="五框架槽位"
              >
                {{ summary.courseArchiveFrameworkSlotDone ?? 0 }}/{{
                  summary.courseArchiveFrameworkSlotTotal ?? 0
                }}
                · 齐备 {{ summary.courseArchiveFullyCompleteCount ?? 0 }} 门
              </a-descriptions-item>
            </template>
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
          <div v-if="teacherSegments.length" class="teacher-segments" aria-label="教师行动分层">
            <section v-for="segment in teacherSegments" :key="segment.segmentCode">
              <div>
                <span>{{ segment.segmentLabel }}</span>
                <strong>{{ segment.teacherCount }}</strong>
              </div>
              <div v-if="segment.sampleTeacherUserIds.length" class="teacher-segments__samples">
                <button
                  v-for="teacherId in segment.sampleTeacherUserIds"
                  :key="teacherId"
                  type="button"
                  @click="goTeacherHome(teacherId)"
                >
                  {{ teacherId }}
                </button>
              </div>
              <span v-else>暂无命中教师</span>
            </section>
          </div>
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
            <p v-if="completenessLevelFilter" class="teacher-filter-hint">
              当前筛选：{{ completenessFilterLabel(completenessLevelFilter) }}
              <a class="op-link" @click="applyCompletenessFilter('')">清除筛选</a>
            </p>
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
                <template v-if="column.key === 'completenessPercent'">
                  {{ completenessLabel(record) }}
                </template>
                <template v-else-if="column.key === 'courseArchiveFramework'">
                  {{ courseArchiveLabel(record) }}
                </template>
                <template v-else-if="column.key === 'dualTeacherApproved'">
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
                <template v-else-if="column.key === 'actions'">
                  <UiTableActions
                    :items="[
                      { key: 'home', label: '档案首页' },
                      { key: 'one-table', label: '一张表' },
                      { key: 'course-archive', label: '课程档案' },
                    ]"
                    @action="
                      (key) => {
                        if (key === 'home') goTeacherHome(record.teacherUserId)
                        else if (key === 'one-table') goTeacherOneTable(record.teacherUserId)
                        else goCourseArchive(record.teacherUserId)
                      }
                    "
                  />
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
.teacher-segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.teacher-segments section {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--dp-border, #e8e8e8);
  border-radius: 6px;
}
.teacher-segments section > div:first-child {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.teacher-segments strong {
  font-size: 20px;
}
.teacher-segments__samples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.teacher-segments__samples button {
  padding: 0;
  border: 0;
  color: var(--ant-color-primary);
  background: transparent;
  cursor: pointer;
}
.completeness-distribution {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}
.completeness-chip {
  padding: 2px 8px;
  border: 1px solid var(--dp-border, #e8e8e8);
  border-radius: 4px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
}
.completeness-chip--active {
  border-color: var(--ant-color-primary);
  color: var(--ant-color-primary);
  background: var(--ant-color-primary-bg);
}
.teacher-filter-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
@media (max-width: 960px) {
  .detail-grid,
  .teacher-segments {
    grid-template-columns: 1fr;
  }
}
</style>
