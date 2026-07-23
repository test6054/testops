<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts/core'
import type {
  PortfolioAnalysisSuggestionVO,
  PortfolioAnalysisTrainingRecommendVO,
  PortfolioAppointmentPeriodEvaluationVO,
  PortfolioPortraitCreditCurveVO,
} from '@/apis/portfolio/analysis'
import type { PortfolioPortraitDimensionCode } from '@/apis/portfolio/enums'
import type { PortfolioDevelopmentPlanCompletionVO } from '@/apis/portfolio/teacher-platform'
import type {
  PortfolioTeacherPortraitCohortCompareVO,
  PortfolioTeacherPortraitIndicatorDetailVO,
  PortfolioTeacherPortraitTrendVO,
  PortfolioTeacherPortraitVO,
} from '@/apis/portfolio/types'
import type { PortfolioSuggestionTypeCode } from '@/types/enums/portfolio-suggestion-type-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import {
  PortfolioArchiveRecordStatusDescription,
  PortfolioPortraitDimensionReadinessCode,
  PortfolioPortraitDimensionReadinessDescription,
  PortfolioPortraitIndicatorEvidenceTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import {
  PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
  PORTFOLIO_PORTRAIT_DIMENSION_READINESS_TONE,
} from '@/apis/portfolio/types'
import MarkChart from '@/components/chart/MarkChart.vue'
import MarkChartCard from '@/components/chart/MarkChartCard.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiAlert from '@/components/ui-guide/ui/Alert.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import {
  ALL_PORTFOLIO_PORTRAIT_COHORT_TYPE_CODES,
  PortfolioPortraitCohortTypeCode,
  PortfolioPortraitCohortTypeDescription,
} from '@/types/enums/portfolio-portrait-cohort-type-enum'
import { PortfolioPortraitStageDescription } from '@/types/enums/portfolio-portrait-stage-code-enum'
import { PortfolioSuggestionTypeDescription } from '@/types/enums/portfolio-suggestion-type-enum'
import {
  PortfolioTrainingRecommendStatusCode,
  PortfolioTrainingRecommendStatusDescription,
} from '@/types/enums/portfolio-training-recommend-status-enum'
import { ResultCode } from '@/types/enums/result-code'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import {
  buildPortraitCohortRangeChartOption,
  buildPortraitCompositeTrendChartOption,
  buildPortraitCreditCurveChartOption,
  buildPortraitRadarChartOption,
  resolveCohortHint,
} from '@/utils/portfolio-portrait-charts'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { archiveWriteForbidden, archiveWriteBlockMessage, reloadLifecycleState }
  = usePortfolioArchiveWriteGuard({ teacherId: targetTeacherId })
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()

function lifecycleTagTone(status?: string): 'green' | 'orange' | 'gray' | 'red' {
  if (status === 'ACTIVE') return 'green'
  if (status === 'TEMP_HOLD') return 'orange'
  if (status === 'SEALED' || status === 'TRANSFERRED') return 'red'
  return 'gray'
}

const loading = ref(false)
const detailLoading = ref(false)
const portrait = ref<PortfolioTeacherPortraitVO | null>(null)
const cohort = ref<PortfolioTeacherPortraitCohortCompareVO | null>(null)
const trend = ref<PortfolioTeacherPortraitTrendVO | null>(null)
const portraitAbsent = ref(false)
const detailOpen = ref(false)
const indicatorDetail = ref<PortfolioTeacherPortraitIndicatorDetailVO | null>(null)
const planCompletion = ref<PortfolioDevelopmentPlanCompletionVO | null>(null)
const suggestions = ref<PortfolioAnalysisSuggestionVO[]>([])
const trainingRecommendations = ref<PortfolioAnalysisTrainingRecommendVO[]>([])
const creditCurve = ref<PortfolioPortraitCreditCurveVO | null>(null)
const appointmentPeriodEval = ref<PortfolioAppointmentPeriodEvaluationVO | null>(null)
/** §8.66 学分曲线分类：ALL / DIGITAL_LITERACY / NATIONAL_TRAINING / CERTIFICATE / OTHER_TRAINING */
const creditCategory = ref('ALL')
const creditCurveLoading = ref(false)
const planYear = String(new Date().getFullYear())
const cohortType = ref<PortfolioPortraitCohortTypeCode>(PortfolioPortraitCohortTypeCode.DEPARTMENT)

const CREDIT_CATEGORY_LABELS: Record<string, string> = {
  ALL: '全部分类合计',
  DIGITAL_LITERACY: '数字素养',
  NATIONAL_TRAINING: '国培/国家级培训',
  CERTIFICATE: '证书/资格',
  OTHER_TRAINING: '其它正式培训',
}

const creditCategoryTabItems = computed(() => {
  const codes = creditCurve.value?.availableCategories?.length
    ? creditCurve.value.availableCategories
    : ['ALL']
  const unique = Array.from(new Set(codes.map((code) => String(code || '').trim()).filter(Boolean)))
  if (!unique.includes('ALL')) {
    unique.unshift('ALL')
  }
  return unique.map((code) => ({
    key: code,
    label: CREDIT_CATEGORY_LABELS[code] ?? code,
  }))
})
const portraitRequestToken = ref(0)
const cohortRequestToken = ref(0)
const detailRequestToken = ref(0)
const trainingRecommendationActionId = ref('')

const cohortTabItems = ALL_PORTFOLIO_PORTRAIT_COHORT_TYPE_CODES.map((code) => ({
  key: code,
  label: PortfolioPortraitCohortTypeDescription[code],
}))

const stageLabel = computed(() => {
  if (!portrait.value?.stageCode) {
    return ''
  }
  return strictEnumLabel(
    PortfolioPortraitStageDescription,
    portrait.value.stageCode,
    '教师职业阶段',
  )
})

const compositeItems = computed((): SignalMetric[] => {
  if (!portrait.value) {
    return []
  }
  const row = portrait.value
  return [
    {
      key: 'composite',
      label: '综合画像分',
      value: String(row.compositeScore),
      unit: '分',
      tone: 'blue',
    },
    { key: 'core', label: '核心素质', value: String(row.developmentCoreScore), unit: '分' },
    { key: 'teaching', label: '教学能力', value: String(row.teachingScore), unit: '分' },
    { key: 'research', label: '科研能力', value: String(row.researchScore), unit: '分' },
    { key: 'training', label: '培训发展', value: String(row.trainingScore), unit: '分' },
    { key: 'practice', label: '实践指导', value: String(row.practiceScore), unit: '分' },
  ]
})

const portraitDataInsufficient = computed(() => {
  if (!portrait.value) {
    return false
  }
  return portrait.value.dimensions.every(
    (item) => item.readiness === PortfolioPortraitDimensionReadinessCode.PENDING,
  )
})

const cohortHint = computed(() => {
  if (!cohort.value) {
    return ''
  }
  return resolveCohortHint(
    cohort.value.displayMode,
    cohort.value.sampleSize,
    cohort.value.cohortLabel,
  )
})

const radarOption = computed((): EChartsCoreOption => {
  if (!portrait.value) {
    return {}
  }
  return buildPortraitRadarChartOption(portrait.value, cohort.value)
})

const cohortRangeOption = computed((): EChartsCoreOption => {
  if (!cohort.value) {
    return {}
  }
  return buildPortraitCohortRangeChartOption(cohort.value)
})

const trendOption = computed((): EChartsCoreOption => {
  return buildPortraitCompositeTrendChartOption(trend.value?.points ?? [])
})

const creditCurveOption = computed((): EChartsCoreOption => {
  return buildPortraitCreditCurveChartOption(creditCurve.value?.points ?? [])
})

/** 教师范围变化后必须清空旧指标明细抽屉，避免继续展示上一位教师的画像证据。 */
function resetIndicatorDetailContext() {
  detailRequestToken.value += 1
  detailLoading.value = false
  detailOpen.value = false
  indicatorDetail.value = null
}

function resetPortraitBundleContext() {
  portraitRequestToken.value += 1
  cohortRequestToken.value += 1
  loading.value = false
  trainingRecommendationActionId.value = ''
  resetIndicatorDetailContext()
  portraitAbsent.value = false
  portrait.value = null
  cohort.value = null
  trend.value = null
  planCompletion.value = null
  suggestions.value = []
  trainingRecommendations.value = []
  creditCurve.value = null
  appointmentPeriodEval.value = null
}

function buildPortraitRequest() {
  return targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
}

function buildCohortRequest() {
  return {
    ...buildPortraitRequest(),
    cohortType: cohortType.value,
  }
}

/** 教师本人登记培训后才将推荐置为已采纳，管理视图不能替教师执行该动作。 */
function registerRecommendedTraining(item: PortfolioAnalysisTrainingRecommendVO) {
  void router.push({
    name: 'PortfolioTeacherExtensionActivity',
    query: {
      teacherId: targetTeacherId.value,
      recommendationId: item.id,
      activityName: item.recommendTitle,
    },
  })
}

async function dismissTrainingRecommendation(item: PortfolioAnalysisTrainingRecommendVO) {
  if (!(await confirmProxyWrite('忽略培训推荐'))) {
    return
  }

  const recommendationId = item.id
  const requestToken = portraitRequestToken.value
  trainingRecommendationActionId.value = recommendationId
  try {
    await portfolioAnalysisApi.dismissTrainingRecommendation({ recommendationId })
    if (portraitRequestToken.value !== requestToken) {
      return
    }
    const currentItem = trainingRecommendations.value.find((row) => row.id === recommendationId)
    if (!currentItem) {
      return
    }
    currentItem.recommendStatus = PortfolioTrainingRecommendStatusCode.DISMISSED
    void message.success('已忽略培训推荐')
  } catch (error) {
    if (portraitRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '忽略培训推荐失败')
  } finally {
    if (
      portraitRequestToken.value === requestToken
      && trainingRecommendationActionId.value === recommendationId
    ) {
      trainingRecommendationActionId.value = ''
    }
  }
}

async function loadCohortCompare() {
  if (!portrait.value) {
    return
  }
  const requestToken = portraitRequestToken.value
  const cohortToken = cohortRequestToken.value + 1
  cohortRequestToken.value = cohortToken
  const request = buildCohortRequest()
  try {
    const nextCohort = await portfolioAnalysisApi.getPortraitCohortCompare(request)
    if (portraitRequestToken.value !== requestToken || cohortRequestToken.value !== cohortToken) {
      return
    }
    cohort.value = nextCohort
  } catch (error) {
    if (portraitRequestToken.value !== requestToken || cohortRequestToken.value !== cohortToken) {
      return
    }
    cohort.value = null
    showUserError(error, '加载同群体对比失败')
  }
}

async function loadPlanCompletion() {
  if (!targetTeacherId.value) {
    planCompletion.value = null
    return
  }
  const requestToken = portraitRequestToken.value
  try {
    const nextPlanCompletion = await portfolioDevelopmentPlanApi.completionAnalysis({
      planYear,
      teacherId: targetTeacherId.value,
    })
    if (portraitRequestToken.value !== requestToken) {
      return
    }
    planCompletion.value = nextPlanCompletion
  } catch (error) {
    if (portraitRequestToken.value !== requestToken) {
      return
    }
    planCompletion.value = null
    showUserError(error, '加载发展规划完成度失败')
  }
}

function defaultAppointmentPeriodRange(): { periodStart: string, periodEnd: string } {
  const end = new Date()
  const start = new Date(end.getFullYear() - 2, 0, 1)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { periodStart: fmt(start), periodEnd: fmt(end) }
}

async function loadSecondaryPortraitData() {
  if (!portrait.value) {
    return
  }
  const requestToken = portraitRequestToken.value
  const cohortToken = cohortRequestToken.value + 1
  cohortRequestToken.value = cohortToken
  const request = buildPortraitRequest()
  const teacherId = targetTeacherId.value
  const appointmentRange = defaultAppointmentPeriodRange()
  const settled = await Promise.allSettled([
    portfolioAnalysisApi.getPortraitCohortCompare(buildCohortRequest()),
    portfolioAnalysisApi.getPortraitTrend({ ...request, limit: 12 }),
    loadPlanCompletion(),
    teacherId ? portfolioAnalysisApi.listSuggestions({ teacherId }) : Promise.resolve([]),
    teacherId
      ? portfolioAnalysisApi.listTrainingRecommendations({ teacherId })
      : Promise.resolve([]),
    teacherId
      ? portfolioAnalysisApi.getCreditCurve({ teacherId, creditCategory: creditCategory.value })
      : Promise.resolve(null),
    teacherId
      ? portfolioAnalysisApi.getAppointmentPeriodEvaluation({
          teacherId,
          periodStart: appointmentRange.periodStart,
          periodEnd: appointmentRange.periodEnd,
          cycleSceneCode: 'APPOINTMENT',
        })
      : Promise.resolve(null),
  ])
  const [
    cohortSettled,
    trendSettled,,    
    suggestionSettled,
    trainingSettled,
    creditSettled,
    appointmentSettled,
  ] = settled
  if (portraitRequestToken.value !== requestToken) {
    return
  }
  if (cohortRequestToken.value === cohortToken) {
    if (cohortSettled.status === 'fulfilled') {
      cohort.value = cohortSettled.value
    } else {
      cohort.value = null
      showUserError(cohortSettled.reason, '加载同群体对比失败')
    }
  }
  if (trendSettled.status === 'fulfilled') {
    trend.value = trendSettled.value
  } else {
    trend.value = null
    showUserError(trendSettled.reason, '加载历史趋势失败')
  }
  if (suggestionSettled.status === 'fulfilled') {
    suggestions.value = suggestionSettled.value
  } else {
    suggestions.value = []
    showUserError(suggestionSettled.reason, '加载发展建议失败')
  }
  if (trainingSettled.status === 'fulfilled') {
    trainingRecommendations.value = trainingSettled.value
  } else {
    trainingRecommendations.value = []
    showUserError(trainingSettled.reason, '加载培训推荐失败')
  }
  if (creditSettled.status === 'fulfilled') {
    creditCurve.value = creditSettled.value
  } else {
    creditCurve.value = null
    showUserError(creditSettled.reason, '加载学分曲线失败')
  }
  if (appointmentSettled.status === 'fulfilled') {
    appointmentPeriodEval.value = appointmentSettled.value
  } else {
    appointmentPeriodEval.value = null
    showUserError(appointmentSettled.reason, '加载聘期滚动评价失败')
  }
}

async function loadPortraitBundle() {
  const requestToken = portraitRequestToken.value + 1
  portraitRequestToken.value = requestToken
  if (!targetTeacherId.value && canPickTeachers.value) {
    resetPortraitBundleContext()
    portraitAbsent.value = true
    return
  }
  loading.value = true
  resetIndicatorDetailContext()
  portraitAbsent.value = false
  portrait.value = null
  cohort.value = null
  trend.value = null
  planCompletion.value = null
  suggestions.value = []
  trainingRecommendations.value = []
  creditCurve.value = null
  appointmentPeriodEval.value = null
  creditCategory.value = 'ALL'
  try {
    const request = buildPortraitRequest()
    const nextPortrait = await portfolioAnalysisApi.getPortrait(request)
    if (portraitRequestToken.value !== requestToken) {
      return
    }
    portrait.value = nextPortrait
    void reloadLifecycleState()
    await loadSecondaryPortraitData()
  } catch (error) {
    if (portraitRequestToken.value !== requestToken) {
      return
    }
    if (readBusinessResultCode(error) === ResultCode.DATA_NOT_FOUND) {
      portraitAbsent.value = true
    } else {
      showUserError(error, '加载教师画像失败')
    }
  } finally {
    if (portraitRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function openIndicatorDetail(dimensionCode: PortfolioPortraitDimensionCode) {
  const requestToken = portraitRequestToken.value
  const detailToken = detailRequestToken.value + 1
  detailRequestToken.value = detailToken
  detailOpen.value = true
  indicatorDetail.value = null
  detailLoading.value = true
  try {
    const nextIndicatorDetail = await portfolioAnalysisApi.getPortraitIndicatorDetail({
      ...buildPortraitRequest(),
      dimensionCode,
    })
    if (portraitRequestToken.value !== requestToken || detailRequestToken.value !== detailToken) {
      return
    }
    indicatorDetail.value = nextIndicatorDetail
  } catch (error) {
    if (portraitRequestToken.value !== requestToken || detailRequestToken.value !== detailToken) {
      return
    }
    showUserError(error, '加载指标明细失败')
    detailOpen.value = false
  } finally {
    if (portraitRequestToken.value === requestToken && detailRequestToken.value === detailToken) {
      detailLoading.value = false
    }
  }
}

function openArchiveRecord(archiveRecordId?: string) {
  if (!archiveRecordId) {
    return
  }
  void router.push({
    path: '/portfolio/teacher/archive',
    query: {
      teacherId: targetTeacherId.value,
      recordId: archiveRecordId,
    },
  })
}

usePortfolioScopedLoader(
  () => {
    void loadPortraitBundle()
  },
  () => targetTeacherId.value,
)

watch(cohortType, () => {
  void loadCohortCompare()
})

async function reloadCreditCurveByCategory() {
  const teacherId = targetTeacherId.value
  if (!teacherId || !portrait.value) {
    return
  }
  creditCurveLoading.value = true
  try {
    creditCurve.value = await portfolioAnalysisApi.getCreditCurve({
      teacherId,
      creditCategory: creditCategory.value,
    })
  } catch (error) {
    showUserError(error, '切换学分分类失败')
  } finally {
    creditCurveLoading.value = false
  }
}

watch(creditCategory, (next, prev) => {
  if (next === prev) {
    return
  }
  void reloadCreditCurveByCategory()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教师画像">
        <template #actions>
          <UiButton
            size="sm"
            :loading="loading"
            :disabled="canPickTeachers && !targetTeacherId"
            @click="loadPortraitBundle"
          >
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <template v-else>
      <UiSpin :spinning="loading">
        <UiCard v-if="portrait" title="综合画像">
          <SignalBand :metrics="compositeItems" variant="panel" compact />
          <p class="teacher-portrait__meta">加权：核心 30% · 教学 25% · 科研/培训/实践各 15%</p>
          <div
            v-if="portrait.lifecycleStatus || archiveWriteForbidden"
            class="teacher-portrait__lifecycle"
          >
            <template v-if="portrait.lifecycleStatus">
              生命周期：
              <UiTag :tone="lifecycleTagTone(portrait.lifecycleStatus)">
                {{ portrait.lifecycleStatusLabel || portrait.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="portrait.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-if="portrait.countsInCurrentFacultyStructure === false">
                （不计入当前在岗结构）
              </span>
            </template>
            <span
              v-if="archiveWriteForbidden || portrait.archiveWriteForbidden"
              class="teacher-portrait__write-ban"
            >
              档案写禁：{{ archiveWriteBlockMessage || '封存/迁出后禁止档案写入' }}
            </span>
          </div>
          <p class="teacher-portrait__meta">
            正式档案记录 {{ portrait.officialRecordCount }} 条
            <template v-if="portrait.computedTime">
              · 最近重算 {{ portrait.computedTime }}
            </template>
            <template v-if="portrait.ruleSnapshotId">
              · 规则快照 {{ portrait.ruleSnapshotId }}
            </template>
            <template v-if="stageLabel"> · 职业阶段 {{ stageLabel }} </template>
            <template v-if="portrait.dataSource"> · {{ portrait.dataSource }} </template>
            <template v-if="portrait.lastArchiveRecordId">
              · 触发档案 {{ portrait.lastArchiveRecordId }}
            </template>
          </p>
          <p v-if="portraitDataInsufficient" class="teacher-portrait__hint-text">
            画像数据不足，请先完成建档
          </p>
        </UiCard>

        <UiCard v-if="planCompletion" title="年度规划完成度" style="margin-top: 16px">
          <UiStatPanel
            :items="[
              { key: 'year', label: '统计年度', value: planCompletion.planYear },
              { key: 'total', label: '规划总数', value: String(planCompletion.totalPlanCount) },
              {
                key: 'approved',
                label: '已通过',
                value: String(planCompletion.approvedPlanCount),
                tone: 'green',
              },
              {
                key: 'pending',
                label: '待审',
                value: String(planCompletion.pendingPlanCount),
                tone: 'blue',
              },
              {
                key: 'returned',
                label: '退回',
                value: String(planCompletion.returnedPlanCount),
                tone: 'orange',
              },
              {
                key: 'rate',
                label: '审批完成率',
                value: planCompletion.completionRatePercent,
                unit: '%',
                tone: 'blue',
              },
              {
                key: 'itemTotal',
                label: '明细项总数',
                value: String(planCompletion.totalPlanItemCount),
              },
              {
                key: 'itemDone',
                label: '已完成明细',
                value: String(planCompletion.completedPlanItemCount),
                tone: 'green',
              },
              {
                key: 'itemRate',
                label: '明细完成率',
                value: planCompletion.planItemCompletionRatePercent,
                unit: '%',
                tone: 'blue',
              },
              {
                key: 'itemAvg',
                label: '平均完成度',
                value: planCompletion.averageItemCompletionPercent,
                unit: '%',
              },
            ]"
            :columns="3"
            variant="grid"
            compact
          />
        </UiCard>

        <UiEmpty size="sm" v-else-if="portraitAbsent && !loading" description="尚未生成画像快照" />
      </UiSpin>

      <div v-if="portrait" class="teacher-portrait__charts">
        <MarkChartCard title="能力雷达" :loading="loading" chart-min-height="320">
          <MarkChart :option="radarOption" height="320px" aria-label="教师画像能力雷达图" />
        </MarkChartCard>

        <MarkChartCard title="同群体对比" :loading="loading" chart-min-height="320">
          <UiSectionTabs
            v-model="cohortType"
            :items="cohortTabItems"
            class="teacher-portrait__cohort-tabs"
          />
          <UiAlert
            v-if="cohort?.displayMode === 'INSUFFICIENT' || cohort?.displayMode === 'LIMITED'"
            type="warning"
            class="teacher-portrait__cohort-alert"
          >
            {{ cohortHint }}
          </UiAlert>
          <MarkChart
            v-if="cohort?.displayMode !== 'INSUFFICIENT'"
            :option="cohortRangeOption"
            height="320px"
            aria-label="教师画像同群体区间对比图"
          />
        </MarkChartCard>
      </div>

      <MarkChartCard
        v-if="portrait"
        title="历史趋势"
        :loading="loading"
        chart-min-height="280"
        class="teacher-portrait__trend"
      >
        <MarkChart :option="trendOption" height="280px" aria-label="教师画像综合分历史趋势图" />
      </MarkChartCard>

      <MarkChartCard
        v-if="portrait && creditCurve"
        title="培训学分曲线"
        :loading="loading || creditCurveLoading"
        chart-min-height="280"
        class="teacher-portrait__credit"
      >
        <UiSectionTabs
          v-model="creditCategory"
          :items="creditCategoryTabItems"
          aria-label="学分曲线分类切换"
          class="teacher-portrait__credit-tabs"
        />
        <p class="teacher-portrait__meta">
          数据来源：{{ creditCurve.dataSource }} · 累计 {{ creditCurve.totalCredits }} 学分
          <template v-if="creditCurve.creditCategory">
            · 当前分类
            {{ CREDIT_CATEGORY_LABELS[creditCurve.creditCategory] || creditCurve.creditCategory }}
          </template>
          <template v-if="creditCurve.officialFactCount != null">
            · 事实 {{ creditCurve.officialFactCount }} 条
          </template>
          <template v-if="creditCurve.dedupDroppedCount">
            · 去重 {{ creditCurve.dedupDroppedCount }} 条
          </template>
        </p>
        <p v-if="creditCurve.trendNote" class="teacher-portrait__meta teacher-portrait__meta--warn">
          {{ creditCurve.trendNote }}
        </p>
        <UiEmpty
          size="sm"
          v-if="!creditCurve.points.length"
          description="暂无正式培训学分记录，完成培训档案审核后将在此展示"
        />
        <MarkChart
          v-else
          :option="creditCurveOption"
          height="280px"
          aria-label="教师培训学分累积曲线"
        />
      </MarkChartCard>

      <div v-if="portrait" class="teacher-portrait__insight">
        <UiCard title="发展建议" class="teacher-portrait__suggestions">
          <UiEmpty
            size="sm"
            v-if="!suggestions.length"
            description="暂无发展建议，画像重算后将自动生成"
          />
          <ul v-else class="teacher-portrait__insight-list">
            <li v-for="item in suggestions" :key="item.id" class="teacher-portrait__insight-item">
              <div class="teacher-portrait__insight-head">
                <strong>{{ item.suggestionTitle }}</strong>
                <UiTag tone="blue">
                  {{
                    strictEnumLabel(
                      PortfolioSuggestionTypeDescription,
                      item.suggestionType as PortfolioSuggestionTypeCode,
                      '发展建议类型',
                    )
                  }}
                </UiTag>
              </div>
              <p>{{ item.suggestionContent }}</p>
            </li>
          </ul>
        </UiCard>
        <UiCard title="培训推荐" class="teacher-portrait__training">
          <UiEmpty size="sm" v-if="!trainingRecommendations.length" description="暂无培训推荐" />
          <ul v-else class="teacher-portrait__insight-list">
            <li
              v-for="item in trainingRecommendations"
              :key="item.id"
              class="teacher-portrait__insight-item"
            >
              <div class="teacher-portrait__insight-head">
                <strong>{{ item.recommendTitle }}</strong>
                <UiTag tone="gray">
                  {{
                    strictEnumLabel(
                      PortfolioTrainingRecommendStatusDescription,
                      item.recommendStatus as PortfolioTrainingRecommendStatusCode,
                      '培训推荐状态',
                    )
                  }}
                </UiTag>
              </div>
              <p>{{ item.recommendReason }}</p>
              <div
                v-if="
                  item.recommendStatus === PortfolioTrainingRecommendStatusCode.PENDING
                    && !canPickTeachers
                "
                class="teacher-portrait__insight-actions"
              >
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="Boolean(trainingRecommendationActionId)"
                  @click="registerRecommendedTraining(item)"
                >
                  登记培训
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :loading="trainingRecommendationActionId === item.id"
                  :disabled="Boolean(trainingRecommendationActionId)"
                  @click="dismissTrainingRecommendation(item)"
                >
                  忽略
                </UiButton>
              </div>
            </li>
          </ul>
        </UiCard>
      </div>

      <UiCard
        v-if="portrait && (portrait.identityLayers?.length ?? 0) > 0"
        title="多身份贡献分层"
        class="teacher-portrait__identity-layers"
      >
        <p class="teacher-portrait__hint-text">
          同一人员不同身份分层统计；参评合并引用仍使用上方综合分。外部身份不含校内职称核心。
        </p>
        <table class="teacher-portrait__table">
          <thead>
            <tr>
              <th>身份</th>
              <th>范围</th>
              <th>综合分</th>
              <th>教学</th>
              <th>科研</th>
              <th>培训</th>
              <th>实践</th>
              <th>§8.42 贡献度</th>
              <th>工作量学时</th>
              <th>已计分/不适用</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="layer in portrait.identityLayers"
              :key="layer.identityId ?? layer.identityType"
            >
              <td>
                <div>{{ layer.identityTypeLabel || layer.identityType }}</div>
                <div
                  v-if="layer.displayName || layer.appointmentNo || layer.enterpriseName"
                  class="teacher-portrait__hint-text"
                >
                  {{
                    [layer.displayName, layer.appointmentNo, layer.enterpriseName]
                      .filter(Boolean)
                      .join(' · ')
                  }}
                </div>
              </td>
              <td>
                <UiTag :tone="layer.externalIdentity ? 'orange' : 'blue'">
                  {{ layer.externalIdentity ? '外部师资' : '校内身份' }}
                </UiTag>
              </td>
              <td>{{ layer.compositeScore ?? '—' }}</td>
              <td>{{ layer.teachingScore ?? '—' }}</td>
              <td>{{ layer.researchScore ?? '—' }}</td>
              <td>{{ layer.trainingScore ?? '—' }}</td>
              <td>{{ layer.practiceScore ?? '—' }}</td>
              <td>{{ layer.industryMentorContribution?.contributionScore ?? '—' }}</td>
              <td>{{ layer.workloadHours ?? '—' }}</td>
              <td>{{ layer.scoredIndicatorCount }}/{{ layer.notApplicableIndicatorCount }}</td>
            </tr>
          </tbody>
        </table>
      </UiCard>

      <UiCard
        v-if="portrait?.digitalLiteracy"
        title="§8.43 数字素养达成度"
        class="teacher-portrait__digital-literacy"
      >
        <p class="teacher-portrait__hint-text">
          综合 {{ portrait.digitalLiteracy.achievementScore }} · 学年
          {{ portrait.digitalLiteracy.academicYear || '—' }} ·
          {{ portrait.digitalLiteracy.shortboard ? '存在短板，请关注培训推荐' : '暂无明显短板' }}
        </p>
        <p class="teacher-portrait__hint-text">{{ portrait.digitalLiteracy.formulaLabel }}</p>
        <PortfolioOwnerIdentityLayersCell
          :layers="portrait.digitalLiteracy.ownerIdentityLayers"
          :note="portrait.digitalLiteracy.ownerMultiIdentityNote"
          show-note
        />
        <table class="teacher-portrait__table">
          <thead>
            <tr>
              <th>数字教学应用</th>
              <th>数字资源建设</th>
              <th>数据治理合规</th>
              <th>AI规范使用</th>
              <th>数字培训发展</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ portrait.digitalLiteracy.digitalTeachingScore }}</td>
              <td>{{ portrait.digitalLiteracy.digitalResourceScore }}</td>
              <td>{{ portrait.digitalLiteracy.dataGovernanceScore }}</td>
              <td>{{ portrait.digitalLiteracy.aiComplianceScore }}</td>
              <td>{{ portrait.digitalLiteracy.digitalTrainingScore }}</td>
            </tr>
          </tbody>
        </table>
        <ul
          v-if="portrait.digitalLiteracy.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li v-for="(note, idx) in portrait.digitalLiteracy.evidenceNotes" :key="idx">
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="portrait?.guidanceContribution"
        title="§8.44 指导贡献度"
        class="teacher-portrait__guidance"
      >
        <p class="teacher-portrait__hint-text">
          综合 {{ portrait.guidanceContribution.contributionScore }} · 任务
          {{ portrait.guidanceContribution.taskCount }} · 最高单项
          {{ portrait.guidanceContribution.topItemScore }}
        </p>
        <p class="teacher-portrait__hint-text">{{ portrait.guidanceContribution.formulaLabel }}</p>
        <PortfolioOwnerIdentityLayersCell
          :layers="portrait.guidanceContribution.ownerIdentityLayers"
          :note="portrait.guidanceContribution.ownerMultiIdentityNote"
          show-note
        />
        <table v-if="portrait.guidanceContribution.items?.length" class="teacher-portrait__table">
          <thead>
            <tr>
              <th>类型</th>
              <th>任务</th>
              <th>基础分</th>
              <th>角色</th>
              <th>过程</th>
              <th>成效</th>
              <th>审核</th>
              <th>得分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in portrait.guidanceContribution.items"
              :key="`${item.sourceType}-${item.sourceId ?? item.taskName}`"
            >
              <td>{{ item.guidanceTypeLabel }}</td>
              <td>{{ item.taskName || '—' }}</td>
              <td>{{ item.baseScore }}</td>
              <td>{{ item.roleFactor }}</td>
              <td>{{ item.processFactor }}</td>
              <td>{{ item.outcomeFactor }}</td>
              <td>{{ item.auditFactor }}</td>
              <td>{{ item.itemScore }}</td>
            </tr>
          </tbody>
        </table>
        <ul
          v-if="portrait.guidanceContribution.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li v-for="(note, idx) in portrait.guidanceContribution.evidenceNotes" :key="idx">
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="portrait?.industryPackSceneScore"
        title="§8.57 行业包场景合并计分"
        class="teacher-portrait__industry-pack"
      >
        <p class="teacher-portrait__hint-text">
          场景分 {{ portrait.industryPackSceneScore.sceneScore }} · 通用
          {{ portrait.industryPackSceneScore.generalScore }} · 行业包
          {{ portrait.industryPackSceneScore.industryPackScore }} · 权重
          {{ portrait.industryPackSceneScore.packWeight }}
        </p>
        <p class="teacher-portrait__hint-text">
          {{
            portrait.industryPackSceneScore.packBound
              ? portrait.industryPackSceneScore.packName || portrait.industryPackSceneScore.packCode
              : '未挂载行业包'
          }}
          · 硬性达标 {{ portrait.industryPackSceneScore.hardRequirementsMet ? '是' : '否' }}
        </p>
        <p class="teacher-portrait__hint-text">
          {{ portrait.industryPackSceneScore.formulaLabel }}
        </p>
        <PortfolioOwnerIdentityLayersCell
          :layers="portrait.industryPackSceneScore.ownerIdentityLayers"
          :note="portrait.industryPackSceneScore.ownerMultiIdentityNote"
          show-note
        />
        <table
          v-if="portrait.industryPackSceneScore.dimensionScores?.length"
          class="teacher-portrait__table"
        >
          <thead>
            <tr>
              <th>维度</th>
              <th>权重</th>
              <th>得分</th>
              <th>证据</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in portrait.industryPackSceneScore.dimensionScores"
              :key="item.dimensionCode"
            >
              <td>{{ item.dimensionLabel }}</td>
              <td>{{ item.weight }}</td>
              <td>{{ item.score }}</td>
              <td>{{ item.evidenceNote || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="portrait.industryPackSceneScore.hardGaps?.length"
          class="teacher-portrait__hint-text"
        >
          <p>行业达标缺口清单：</p>
          <ul>
            <li v-for="(gap, idx) in portrait.industryPackSceneScore.hardGaps" :key="`gap-${idx}`">
              [{{ gap.gapType }}] {{ gap.gapTitle }}
              <span v-if="gap.remediationHint"> — {{ gap.remediationHint }}</span>
            </li>
          </ul>
        </div>
        <ul
          v-if="portrait.industryPackSceneScore.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li v-for="(note, idx) in portrait.industryPackSceneScore.evidenceNotes" :key="idx">
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="appointmentPeriodEval"
        title="§8.48 聘期滚动评价"
        class="teacher-portrait__appointment-period"
      >
        <p class="teacher-portrait__hint-text">
          综合 {{ appointmentPeriodEval.compositeScore }} · 年度加权
          {{ appointmentPeriodEval.weightedAnnualScore }} · 关键成果 +{{
            appointmentPeriodEval.keyAchievementBonus
          }}
          · 风险 -{{ appointmentPeriodEval.riskDeduction }} · 周期
          {{ appointmentPeriodEval.periodStart }} ~ {{ appointmentPeriodEval.periodEnd }} ·
          {{ appointmentPeriodEval.cycleSceneLabel || appointmentPeriodEval.cycleSceneCode }}
        </p>
        <p class="teacher-portrait__hint-text">{{ appointmentPeriodEval.formulaLabel }}</p>
        <PortfolioOwnerIdentityLayersCell
          :layers="appointmentPeriodEval.ownerIdentityLayers"
          :note="appointmentPeriodEval.ownerMultiIdentityNote"
          show-note
        />
        <p class="teacher-portrait__hint-text">
          年度来源场景 {{ appointmentPeriodEval.annualSourceSceneCode }}（与查询周期隔离）
        </p>
        <table v-if="appointmentPeriodEval.yearScores?.length" class="teacher-portrait__table">
          <thead>
            <tr>
              <th>年度</th>
              <th>表现分</th>
              <th>权重</th>
              <th>加权贡献</th>
              <th>引用任务</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in appointmentPeriodEval.yearScores" :key="`year-${row.year}`">
              <td>{{ row.year }}</td>
              <td>{{ row.annualScore }}</td>
              <td>{{ row.weight }}</td>
              <td>{{ row.weightedContribution }}</td>
              <td>
                {{
                  row.referencedTaskNames?.join('、') || row.referencedTaskIds?.join('、') || '—'
                }}
              </td>
            </tr>
          </tbody>
        </table>
        <ul v-if="appointmentPeriodEval.evidenceNotes?.length" class="teacher-portrait__hint-text">
          <li v-for="(note, idx) in appointmentPeriodEval.evidenceNotes" :key="`ap-note-${idx}`">
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="portrait?.educatingOutcomeContribution"
        title="§8.58 育人成果贡献度"
        class="teacher-portrait__educating-outcome"
      >
        <p class="teacher-portrait__hint-text">
          综合 {{ portrait.educatingOutcomeContribution.contributionScore }} · 计入
          {{ portrait.educatingOutcomeContribution.itemCount }} · 去重剔除
          {{ portrait.educatingOutcomeContribution.dedupDroppedCount ?? 0 }} · 最高单项
          {{ portrait.educatingOutcomeContribution.topItemScore }}
        </p>
        <p class="teacher-portrait__hint-text">
          {{ portrait.educatingOutcomeContribution.formulaLabel }}
        </p>
        <PortfolioOwnerIdentityLayersCell
          :layers="portrait.educatingOutcomeContribution.ownerIdentityLayers"
          :note="portrait.educatingOutcomeContribution.ownerMultiIdentityNote"
          show-note
        />
        <table
          v-if="portrait.educatingOutcomeContribution.items?.length"
          class="teacher-portrait__table"
        >
          <thead>
            <tr>
              <th>类型</th>
              <th>成果</th>
              <th>基础分</th>
              <th>角色</th>
              <th>过程</th>
              <th>学生成效</th>
              <th>得分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in portrait.educatingOutcomeContribution.items"
              :key="`${item.sourceType}-${item.sourceId ?? item.taskName}`"
            >
              <td>{{ item.outcomeTypeLabel }}</td>
              <td>{{ item.taskName || '—' }}</td>
              <td>{{ item.baseScore }}</td>
              <td>{{ item.roleFactor }}</td>
              <td>{{ item.processFactor }}</td>
              <td>{{ item.studentOutcomeFactor }}</td>
              <td>{{ item.itemScore }}</td>
            </tr>
          </tbody>
        </table>
        <ul
          v-if="portrait.educatingOutcomeContribution.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li v-for="(note, idx) in portrait.educatingOutcomeContribution.evidenceNotes" :key="idx">
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="portrait?.textbookContribution"
        title="§8.45 职教教材贡献度"
        class="teacher-portrait__textbook"
      >
        <p class="teacher-portrait__hint-text">
          综合 {{ portrait.textbookContribution.contributionScore }} · 教材
          {{ portrait.textbookContribution.textbookCount }} · 最高单本
          {{ portrait.textbookContribution.topItemScore }}
        </p>
        <p class="teacher-portrait__hint-text">{{ portrait.textbookContribution.formulaLabel }}</p>
        <PortfolioOwnerIdentityLayersCell
          :layers="portrait.textbookContribution.ownerIdentityLayers"
          :note="portrait.textbookContribution.ownerMultiIdentityNote"
          show-note
        />
        <table v-if="portrait.textbookContribution.items?.length" class="teacher-portrait__table">
          <thead>
            <tr>
              <th>类型</th>
              <th>名称</th>
              <th>类型分</th>
              <th>级别</th>
              <th>角色</th>
              <th>应用</th>
              <th>验收</th>
              <th>得分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in portrait.textbookContribution.items"
              :key="item.sourceId ?? item.textbookName"
            >
              <td>{{ item.textbookTypeLabel }}</td>
              <td>{{ item.textbookName || '—' }}</td>
              <td>{{ item.typeScore }}</td>
              <td>{{ item.levelFactor }}</td>
              <td>{{ item.roleFactor }}</td>
              <td>{{ item.applicationFactor }}</td>
              <td>{{ item.acceptanceFactor }}</td>
              <td>{{ item.itemScore }}</td>
            </tr>
          </tbody>
        </table>
        <ul
          v-if="portrait.textbookContribution.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li v-for="(note, idx) in portrait.textbookContribution.evidenceNotes" :key="idx">
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="portrait?.virtualTeachingRoomContribution"
        title="§8.41 产教虚拟教研室贡献度"
        class="teacher-portrait__vtr"
      >
        <p class="teacher-portrait__hint-text">
          综合 {{ portrait.virtualTeachingRoomContribution.contributionScore }} · 活动
          {{ portrait.virtualTeachingRoomContribution.activityCount }} · 最高单项
          {{ portrait.virtualTeachingRoomContribution.topItemScore }}
        </p>
        <p class="teacher-portrait__hint-text">
          {{ portrait.virtualTeachingRoomContribution.formulaLabel }}
        </p>
        <PortfolioOwnerIdentityLayersCell
          :layers="portrait.virtualTeachingRoomContribution.ownerIdentityLayers"
          :note="portrait.virtualTeachingRoomContribution.ownerMultiIdentityNote"
          show-note
        />
        <table
          v-if="portrait.virtualTeachingRoomContribution.items?.length"
          class="teacher-portrait__table"
        >
          <thead>
            <tr>
              <th>类型</th>
              <th>名称</th>
              <th>基础分</th>
              <th>角色</th>
              <th>成果</th>
              <th>应用</th>
              <th>审核</th>
              <th>得分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in portrait.virtualTeachingRoomContribution.items"
              :key="item.sourceId ?? item.activityName"
            >
              <td>{{ item.activityTypeLabel }}</td>
              <td>{{ item.activityName || '—' }}</td>
              <td>{{ item.baseScore }}</td>
              <td>{{ item.roleFactor }}</td>
              <td>{{ item.outcomeFactor }}</td>
              <td>{{ item.applicationFactor }}</td>
              <td>{{ item.auditFactor }}</td>
              <td>{{ item.itemScore }}</td>
            </tr>
          </tbody>
        </table>
        <ul
          v-if="portrait.virtualTeachingRoomContribution.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li
            v-for="(note, idx) in portrait.virtualTeachingRoomContribution.evidenceNotes"
            :key="idx"
          >
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="portrait?.industryEducationProjectContribution"
        title="§8.46 产教项目贡献度"
        class="teacher-portrait__iep"
      >
        <p class="teacher-portrait__hint-text">
          综合 {{ portrait.industryEducationProjectContribution.contributionScore }} · 项目
          {{ portrait.industryEducationProjectContribution.projectCount }} · 最高单项目
          {{ portrait.industryEducationProjectContribution.topItemScore }}
        </p>
        <p class="teacher-portrait__hint-text">
          {{ portrait.industryEducationProjectContribution.formulaLabel }}
        </p>
        <PortfolioOwnerIdentityLayersCell
          :layers="portrait.industryEducationProjectContribution.ownerIdentityLayers"
          :note="portrait.industryEducationProjectContribution.ownerMultiIdentityNote"
          show-note
        />
        <table
          v-if="portrait.industryEducationProjectContribution.items?.length"
          class="teacher-portrait__table"
        >
          <thead>
            <tr>
              <th>类型</th>
              <th>名称</th>
              <th>基础分</th>
              <th>角色</th>
              <th>阶段</th>
              <th>人才成效</th>
              <th>企业参与</th>
              <th>得分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in portrait.industryEducationProjectContribution.items"
              :key="item.sourceId ?? item.projectName"
            >
              <td>{{ item.projectTypeLabel }}</td>
              <td>{{ item.projectName || '—' }}</td>
              <td>{{ item.baseScore }}</td>
              <td>{{ item.roleFactor }}</td>
              <td>{{ item.stageFactor }}</td>
              <td>{{ item.talentOutcomeFactor }}</td>
              <td>{{ item.enterpriseFactor }}</td>
              <td>{{ item.itemScore }}</td>
            </tr>
          </tbody>
        </table>
        <ul
          v-if="portrait.industryEducationProjectContribution.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li
            v-for="(note, idx) in portrait.industryEducationProjectContribution.evidenceNotes"
            :key="idx"
          >
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard
        v-if="portrait?.teachingWorkloadByIdentity"
        title="§8.50 教学工作量按身份"
        class="teacher-portrait__workload"
      >
        <p class="teacher-portrait__hint-text">
          课程覆盖 {{ portrait.teachingWorkloadByIdentity.coveredCourseCount }} 门 · 校内学时
          {{ portrait.teachingWorkloadByIdentity.campusWorkloadHours }} · 外部学时
          {{ portrait.teachingWorkloadByIdentity.externalWorkloadHours }}
        </p>
        <p class="teacher-portrait__hint-text">
          {{ portrait.teachingWorkloadByIdentity.formulaLabel }}
        </p>
        <table
          v-if="portrait.teachingWorkloadByIdentity.identityItems?.length"
          class="teacher-portrait__table"
        >
          <thead>
            <tr>
              <th>身份</th>
              <th>外部</th>
              <th>学时</th>
              <th>课程门数</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in portrait.teachingWorkloadByIdentity.identityItems"
              :key="item.identityId ?? item.identityType"
            >
              <td>{{ item.identityTypeLabel }}</td>
              <td>{{ item.externalIdentity ? '是' : '否' }}</td>
              <td>{{ item.workloadHours }}</td>
              <td>{{ item.taughtCourseCount }}</td>
              <td>{{ item.evidenceNote || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <ul
          v-if="portrait.teachingWorkloadByIdentity.evidenceNotes?.length"
          class="teacher-portrait__hint-text"
        >
          <li v-for="(note, idx) in portrait.teachingWorkloadByIdentity.evidenceNotes" :key="idx">
            {{ note }}
          </li>
        </ul>
      </UiCard>

      <UiCard v-if="portrait" title="维度明细" class="teacher-portrait__dimensions">
        <p class="teacher-portrait__hint-text">点击维度行查看得分依据与关联档案</p>
        <table class="teacher-portrait__table">
          <thead>
            <tr>
              <th>维度</th>
              <th>得分</th>
              <th>权重</th>
              <th>数据来源</th>
              <th>状态</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in portrait.dimensions"
              :key="row.dimensionCode"
              class="teacher-portrait__row"
              tabindex="0"
              @click="openIndicatorDetail(row.dimensionCode)"
              @keydown.enter="openIndicatorDetail(row.dimensionCode)"
            >
              <td>{{ row.dimensionLabel }}</td>
              <td>{{ row.score }}</td>
              <td>{{ row.weightPercent }}%</td>
              <td>{{ row.dataSource }}</td>
              <td>
                <UiTag
                  :tone="
                    strictEnumTone(
                      PORTFOLIO_PORTRAIT_DIMENSION_READINESS_TONE,
                      row.readiness,
                      '画像维度就绪状态',
                    )
                  "
                >
                  {{
                    strictEnumLabel(
                      PortfolioPortraitDimensionReadinessDescription,
                      row.readiness,
                      '画像维度就绪状态',
                    )
                  }}
                </UiTag>
              </td>
              <td class="teacher-portrait__action">下钻</td>
            </tr>
          </tbody>
        </table>
      </UiCard>

      <UiCard
        v-if="portrait && portrait.strengthTags.length"
        title="优势标签"
        class="teacher-portrait__tags"
      >
        <div class="teacher-portrait__tag-list">
          <UiTag v-for="tag in portrait.strengthTags" :key="tag.tagCode" tone="green">
            {{ tag.tagLabel }} · {{ tag.score }} 分
          </UiTag>
        </div>
      </UiCard>

      <UiCard
        v-if="portrait && portrait.gapItems.length"
        title="短板清单"
        class="teacher-portrait__gaps"
      >
        <table class="teacher-portrait__table">
          <thead>
            <tr>
              <th>指标</th>
              <th>维度</th>
              <th>得分</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in portrait.gapItems" :key="item.indicatorCode">
              <td>{{ item.indicatorName }}</td>
              <td>{{ item.dimensionL1Name || '—' }}</td>
              <td>{{ item.calcScore ?? '—' }}</td>
              <td>{{ item.gapReason }}</td>
            </tr>
          </tbody>
        </table>
      </UiCard>
    </template>

    <UiDrawer
      v-model:open="detailOpen"
      :title="
        indicatorDetail?.dimensionLabel
          ? `${indicatorDetail.dimensionLabel} · 指标下钻`
          : '指标下钻'
      "
      width="640"
      hide-footer
    >
      <UiSpin :spinning="detailLoading">
        <template v-if="indicatorDetail">
          <dl class="teacher-portrait__detail-meta">
            <div>
              <dt>当前得分</dt>
              <dd>{{ indicatorDetail.dimensionScore }}</dd>
            </div>
            <div>
              <dt>数据来源</dt>
              <dd>{{ indicatorDetail.dataSource }}</dd>
            </div>
            <div v-if="indicatorDetail.computedTime">
              <dt>最近重算</dt>
              <dd>{{ indicatorDetail.computedTime }}</dd>
            </div>
          </dl>

          <UiEmpty
            size="sm"
            v-if="indicatorDetail.evidences.length === 0"
            description="该维度暂无得分依据材料"
          />

          <table v-else class="teacher-portrait__table teacher-portrait__evidence-table">
            <thead>
              <tr>
                <th>依据类型</th>
                <th>摘要</th>
                <th>分类</th>
                <th>贡献分</th>
                <th>状态</th>
                <th>更新时间</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in indicatorDetail.evidences"
                :key="`${item.evidenceType}-${index}`"
              >
                <td>
                  {{
                    strictEnumLabel(
                      PortfolioPortraitIndicatorEvidenceTypeDescription,
                      item.evidenceType,
                      '画像指标依据类型',
                    )
                  }}
                </td>
                <td>{{ item.summary || '—' }}</td>
                <td>{{ item.categoryName || '—' }}</td>
                <td>{{ item.scoreContribution ?? '—' }}</td>
                <td>
                  <UiTag
                    v-if="item.recordStatus"
                    :tone="
                      strictEnumTone(
                        PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
                        item.recordStatus,
                        '档案记录状态',
                      )
                    "
                  >
                    {{
                      strictEnumLabel(
                        PortfolioArchiveRecordStatusDescription,
                        item.recordStatus,
                        '档案记录状态',
                      )
                    }}
                  </UiTag>
                  <span v-else>—</span>
                </td>
                <td>{{ item.updateTime || '—' }}</td>
                <td>
                  <UiButton
                    size="sm"
                    v-if="item.archiveRecordId"
                    variant="ghost"
                    @click="openArchiveRecord(item.archiveRecordId)"
                  >
                    查看档案
                  </UiButton>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </UiSpin>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-portrait__meta {
  margin: var(--dp-space-4) 0 0;
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.teacher-portrait__hint-text {
  margin: 0 0 var(--dp-space-3);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.teacher-portrait__insight-actions {
  display: flex;
  gap: var(--dp-space-2);
}

.teacher-portrait__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-4);
}

.teacher-portrait__trend {
  margin-top: var(--dp-space-4);
}

.teacher-portrait__credit {
  margin-top: var(--dp-space-4);
}

.teacher-portrait__insight {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-4);
}

.teacher-portrait__insight-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-portrait__insight-item + .teacher-portrait__insight-item {
  margin-top: var(--dp-space-3);
  padding-top: var(--dp-space-3);
  border-top: 1px solid var(--dp-border);
}

.teacher-portrait__insight-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-1);
}

.teacher-portrait__cohort-alert {
  margin: 0 var(--dp-space-4) var(--dp-space-3);
}

.teacher-portrait__cohort-tabs {
  margin: 0 var(--dp-space-4) var(--dp-space-3);
}

.teacher-portrait__tags,
.teacher-portrait__gaps {
  margin-top: var(--dp-space-4);
}

.teacher-portrait__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.teacher-portrait__dimensions {
  margin-top: var(--dp-space-4);
}

.teacher-portrait__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    padding: var(--dp-space-2) var(--dp-space-3);
    border-bottom: 1px solid var(--dp-border);
    text-align: left;
  }

  th {
    color: var(--dp-text-secondary);
    font-weight: 600;
  }
}

.teacher-portrait__row {
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: var(--dp-fill-quaternary);
  }
}

.teacher-portrait__action {
  color: var(--dp-color-primary);
  white-space: nowrap;
}

.teacher-portrait__detail-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dp-space-4);
  margin: 0 0 var(--dp-space-4);

  dt {
    margin: 0;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  dd {
    margin: var(--dp-space-1) 0 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}

.teacher-portrait__evidence-table {
  margin-top: var(--dp-space-2);
}

.teacher-portrait__hint {
  padding: var(--dp-space-3, 12px) 0;
}

@media (max-width: 960px) {
  .teacher-portrait__charts {
    grid-template-columns: 1fr;
  }

  .teacher-portrait__insight {
    grid-template-columns: 1fr;
  }

  .teacher-portrait__detail-meta {
    grid-template-columns: 1fr;
  }
}
</style>
