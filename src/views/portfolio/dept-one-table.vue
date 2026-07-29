<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentPlanStatusCode } from '@/apis/portfolio/enums'
import type {
  PortfolioDeptOneTableSummaryVO,
  PortfolioDeptOneTableTeacherRowVO,
  PortfolioDeptTeacherSegmentItemVO,
} from '@/apis/portfolio/teacher'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, defineAsyncComponent, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
  PortfolioCompletenessLevelCode,
  PortfolioCompletenessLevelDescription,
  PortfolioDevelopmentPlanStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import MarkChartCard from '@/components/chart/MarkChartCard.vue'

const MarkChart = defineAsyncComponent(() => import('@/components/chart/MarkChart.vue'))
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioDeptTeacherSegmentDescription } from '@/types/enums/portfolio-dept-teacher-segment-code-enum'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioMetricRecomputeStatusLabel } from '@/utils/portfolio-hr-band'
import {
  formatPortfolioNullableCount,
  formatPortfolioNullableCountPair,
  formatPortfolioNullablePercent,
} from '@/utils/portfolio-nullable-count'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioHrMetricDistributionSection from '@/views/portfolio/components/PortfolioHrMetricDistributionSection.vue'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { loadTree, departmentOptions: loadDepartmentOptions } = usePortfolioOrgTree()
const route = useRoute()
const router = useRouter()
const departmentOptions = computed(() => loadDepartmentOptions())
const userStore = useUserStore()
const loading = ref(false)
const teacherLoading = ref(false)
const exporting = ref(false)
const exportApplyOpen = ref(false)
const exportPurpose = ref('')
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
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '成果', dataIndex: 'achievementCount', key: 'achievementCount', width: 64 },
  { title: '荣誉', dataIndex: 'honorCount', key: 'honorCount', width: 64 },
  { title: '规划状态', key: 'developmentPlanStatus', width: 88 },
  { title: '明细完成度', key: 'developmentPlanItemCompletionPercent', width: 96 },
  { title: '主行动', key: 'actions', width: 200, fixed: 'right' },
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
): string {
  return formatPortfolioNullableCount(summary.value?.[key])
}

function openExportApply() {
  if (!filter.departmentId) {
    showFormValidationMessage('请先选择院系')
    return
  }
  if (exporting.value) {
    return
  }
  exportPurpose.value = ''
  exportApplyOpen.value = true
}

async function submitExportApply() {
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  if (!filter.departmentId) {
    showFormValidationMessage('请先选择院系')
    return Promise.reject(new Error('缺少院系'))
  }
  if (exporting.value) {
    return Promise.reject(new Error('导出申请进行中'))
  }
  exporting.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.DEPT_ONE_TABLE,
      businessRef: {
        departmentId: filter.departmentId,
        planYear: filter.planYear.trim() || undefined,
        completenessLevel: completenessLevelFilter.value || undefined,
      },
      exportPurpose: purpose,
    })
    exportApplyOpen.value = false
    void message.success('已提交部门一张表导出审批')
    await router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交部门一张表导出审批失败')
    return Promise.reject(error)
  } finally {
    exporting.value = false
  }
}

function structureCount(key: (typeof titleStructureRows)[number]['key']): string {
  return formatPortfolioNullableCount(summary.value?.[key])
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
  if (record.courseArchiveFrameworkSlotTotal == null) {
    return '—'
  }
  if (record.courseArchiveFrameworkSlotTotal <= 0) {
    return '未配置'
  }
  const slot = formatPortfolioNullableCountPair(
    record.courseArchiveFrameworkSlotDone,
    record.courseArchiveFrameworkSlotTotal,
    '/',
  )
  const complete = formatPortfolioNullableCount(record.courseArchiveFullyCompleteCount)
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

const DeptOneTableSignalMetrics = computed<SignalMetric[]>(() => {
  return applySpotlightEmphasis([
    {
      key: 'teachers',
      label: '部门教师',
      value: teacherTotal.value,
      clickable: true,
    },
  ], { primaryKey: 'teachers', actionLabel: '刷新' })
})

function onDeptOneTableSignalClick(_key: string) {
  void loadTeachers()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="部门一张表"
        :subtitle="teacherTotal > 0 ? `${teacherTotal} 名教师` : undefined"
      >
        <template #actions>
          <UiButton
            size="sm"
            variant="primary"
            :loading="exporting"
            :disabled="!filter.departmentId"
            @click="openExportApply"
          >
            申请导出
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="DeptOneTableSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="DeptOneTableSignalMetrics"
        @metric-click="onDeptOneTableSignalClick"
      />
    </template>

    <UiCard>
      <div class="filter-row">
        <UiSelect
          size="sm"
          v-model="filter.departmentId"
          placeholder="选择院系"
          style="width: 240px"
          :options="departmentOptions"
          allow-clear
          :disabled="exporting"
        />
        <UiInput
          size="sm"
          v-model="filter.planYear"
          :disabled="exporting"
          placeholder="规划年度（可选）"
          style="width: 140px"
        />
      </div>
      <UiSpin :spinning="loading">
        <UiAlertStrip
          v-if="!filter.departmentId"
          tone="info"
          size="sm"
          dense
          inline
          :show-icon="false"
        >
          <template #default>
            <span class="dept-one-table__gate-row">
              <UiTag tone="blue" size="sm">未选择院系</UiTag>
              <span>请选择院系后查看部门一张表</span>
            </span>
          </template>
        </UiAlertStrip>
        <UiEmpty size="sm" v-else-if="!loading && !summary" description="暂无该院系汇总数据" />
        <template v-else-if="summary">
          <UiDescriptions :column="3" size="small" bordered style="margin-top: var(--dp-space-block)">
            <UiDescriptionsItem label="院系">
              {{ summary.departmentName ?? '—' }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="教师人数">
              {{ summary.teacherCount }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="双师通过">
              {{ summary.dualTeacherCount }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="外部师资">
              {{ summary.externalTeacherCount }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="骨干/带头人">
              {{ summary.keyTeacherCount }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="成果总数">
              {{ formatPortfolioNullableCount(summary.achievementTotalCount) }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="荣誉总数">
              {{ formatPortfolioNullableCount(summary.honorTotalCount) }}
            </UiDescriptionsItem>
            <template v-if="summary.currentAcademicYear">
              <UiDescriptionsItem label="统计学年">
                {{ summary.currentAcademicYear }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="完整度分布">
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
              </UiDescriptionsItem>
              <UiDescriptionsItem
                v-if="summary.courseArchiveFrameworkSlotTotal != null && summary.courseArchiveFrameworkSlotTotal > 0"
                label="五框架槽位"
              >
                {{
                  formatPortfolioNullableCountPair(
                    summary.courseArchiveFrameworkSlotDone,
                    summary.courseArchiveFrameworkSlotTotal,
                    '/',
                  )
                }}
                · 齐备 {{ formatPortfolioNullableCount(summary.courseArchiveFullyCompleteCount) }} 门
              </UiDescriptionsItem>
            </template>
            <template v-if="summary.planYear">
              <UiDescriptionsItem label="规划年度">
                {{ summary.planYear }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="年度规划">
                {{
                  formatPortfolioNullableCountPair(
                    summary.developmentPlanApprovedCount,
                    summary.developmentPlanTotalCount,
                  )
                }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="规划完成率">
                {{ formatPortfolioNullablePercent(summary.developmentPlanCompletionRatePercent) }}
              </UiDescriptionsItem>
            </template>
            <UiDescriptionsItem label="培训达标">
              {{
                formatPortfolioNullableCountPair(
                  summary.trainingCompletedTeacherCount,
                  summary.trainingRequiredTeacherCount,
                )
              }}
              · {{ formatPortfolioNullablePercent(summary.trainingCompletionRatePercent) }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="开放补采">
              {{ formatPortfolioNullableCount(summary.gapTaskOpenCount) }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="审核积压">
              {{ formatPortfolioNullableCount(summary.reviewTaskBacklogCount) }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="指标快照">
              {{
                summary.metricRecomputeStatus
                  ? portfolioMetricRecomputeStatusLabel(summary.metricRecomputeStatus)
                  : '—'
              }}
              <template v-if="summary.metricComputedTime">
                · {{ summary.metricComputedTime }}
              </template>
            </UiDescriptionsItem>
            <UiDescriptionsItem
              v-if="summary.teachingWorkloadAvgCoursesPerTeacher != null"
              label="人均讲授门次"
            >
              {{ summary.teachingWorkloadAvgCoursesPerTeacher }}
            </UiDescriptionsItem>
          </UiDescriptions>
          <div v-if="teacherSegments.length" class="teacher-segments" aria-label="教师行动分层">
            <section v-for="segment in teacherSegments" :key="segment.segmentCode">
              <div>
                <span>{{
                  strictEnumLabel(
                    PortfolioDeptTeacherSegmentDescription,
                    segment.segmentCode,
                    '部门教师分段',
                  )
                }}</span>
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
          <PortfolioHrMetricDistributionSection
            class="hr-metric-section"
            :political-affiliation-distribution="summary.politicalAffiliationDistribution"
            :education-degree-distribution="summary.educationDegreeDistribution"
            :age-band-distribution="summary.ageBandDistribution"
            :tenure-band-distribution="summary.tenureBandDistribution"
            :retirement-window-distribution="summary.retirementWindowDistribution"
            :post-category-distribution="summary.postCategoryDistribution"
          />
          <UiCard title="教师明细" style="margin-top: var(--dp-space-block)">
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
                <template v-else-if="column.key === 'identityLayers'">
                  <PortfolioOwnerIdentityLayersCell
                    :layers="record.ownerIdentityLayers"
                    :note="record.ownerMultiIdentityNote"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTableActions
                    :max-visible="2"
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
      </UiSpin>
    </UiCard>
    <UiDialog
      v-model:open="exportApplyOpen"
      title="申请导出部门一张表"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="exporting"
      @ok="submitExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportPurpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批记录）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-space-component);
  margin-top: var(--dp-space-component);
}
.hr-metric-section {
  margin-top: var(--dp-space-block);
}
.teacher-segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-component);
  margin-top: var(--dp-space-block);
}
.teacher-segments section {
  min-width: 0;
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: 6px;
}
.teacher-segments section > div:first-child {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
}
.teacher-segments strong {
  font-size: var(--dp-font-size-2xl);
}
.teacher-segments__samples {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component-tight);
}
.teacher-segments__samples button {
  padding: 0;
  border: 0;
  color: var(--dp-color-primary);
  background: transparent;
  cursor: pointer;
}
.completeness-distribution {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}
.completeness-chip {
  padding: 2px var(--dp-space-component-tight);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
  background: transparent;
  font-size: var(--dp-font-size-sm);
  cursor: pointer;
}
.completeness-chip--active {
  border-color: var(--dp-color-primary);
  color: var(--dp-color-primary);
  background: var(--dp-color-primary-bg);
}
.teacher-filter-hint {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.dept-one-table__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
@media (max-width: 960px) {
  .detail-grid,
  .teacher-segments {
    grid-template-columns: 1fr;
  }
}
</style>
