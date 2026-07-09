<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts/core'
import type { PortfolioPortraitDimensionCode } from '@/apis/portfolio/enums'
import type { PortfolioDevelopmentPlanCompletionVO } from '@/apis/portfolio/teacher-platform'
import type {
  PortfolioTeacherPortraitCohortCompareVO,
  PortfolioTeacherPortraitIndicatorDetailVO,
  PortfolioTeacherPortraitTrendVO,
  PortfolioTeacherPortraitVO,
} from '@/apis/portfolio/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import {
  PortfolioArchiveRecordStatusDescription,
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
import UiAlert from '@/components/ui-guide/ui/Alert.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { ResultCode } from '@/types/enums/result-code'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import {
  buildPortraitCohortRangeChartOption,
  buildPortraitCompositeTrendChartOption,
  buildPortraitRadarChartOption,
  resolveCohortHint,
} from '@/utils/portfolio-portrait-charts'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const detailLoading = ref(false)
const portrait = ref<PortfolioTeacherPortraitVO | null>(null)
const cohort = ref<PortfolioTeacherPortraitCohortCompareVO | null>(null)
const trend = ref<PortfolioTeacherPortraitTrendVO | null>(null)
const portraitAbsent = ref(false)
const detailOpen = ref(false)
const indicatorDetail = ref<PortfolioTeacherPortraitIndicatorDetailVO | null>(null)
const planCompletion = ref<PortfolioDevelopmentPlanCompletionVO | null>(null)
const planYear = String(new Date().getFullYear())

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
    { key: 'core', label: '发展核心', value: String(row.developmentCoreScore), unit: '分' },
    { key: 'teaching', label: '教学能力', value: String(row.teachingScore), unit: '分' },
    { key: 'research', label: '科研教研', value: String(row.researchScore), unit: '分' },
    { key: 'training', label: '培训发展', value: String(row.trainingScore), unit: '分' },
    { key: 'practice', label: '企业实践', value: String(row.practiceScore), unit: '分' },
  ]
})

const portraitDataInsufficient = computed(() => {
  if (!portrait.value) {
    return false
  }
  return portrait.value.dimensions.every((item) => item.readiness === 'PENDING')
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

function buildPortraitRequest() {
  return targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
}

async function loadPlanCompletion() {
  try {
    planCompletion.value = await portfolioDevelopmentPlanApi.completionAnalysis({ planYear })
  } catch {
    planCompletion.value = null
  }
}

async function loadSecondaryPortraitData() {
  if (!portrait.value) {
    return
  }
  const request = buildPortraitRequest()
  const [cohortSettled, trendSettled] = await Promise.allSettled([
    portfolioAnalysisApi.getPortraitCohortCompare(request),
    portfolioAnalysisApi.getPortraitTrend({ ...request, limit: 12 }),
    loadPlanCompletion(),
  ])
  if (cohortSettled.status === 'fulfilled') {
    cohort.value = cohortSettled.value
  } else {
    cohort.value = null
    showUserError(cohortSettled.reason, '加载同群体对比失败')
  }
  if (trendSettled.status === 'fulfilled') {
    trend.value = trendSettled.value
  } else {
    trend.value = null
    showUserError(trendSettled.reason, '加载历史趋势失败')
  }
}

async function loadPortraitBundle() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    portraitAbsent.value = true
    portrait.value = null
    cohort.value = null
    trend.value = null
    planCompletion.value = null
    return
  }
  loading.value = true
  portraitAbsent.value = false
  portrait.value = null
  cohort.value = null
  trend.value = null
  planCompletion.value = null
  try {
    const request = buildPortraitRequest()
    portrait.value = await portfolioAnalysisApi.getPortrait(request)
    await loadSecondaryPortraitData()
  } catch (error) {
    if (readBusinessResultCode(error) === ResultCode.DATA_NOT_FOUND) {
      portraitAbsent.value = true
    } else {
      showUserError(error, '加载教师画像失败')
    }
  } finally {
    loading.value = false
  }
}

async function openIndicatorDetail(dimensionCode: PortfolioPortraitDimensionCode) {
  detailOpen.value = true
  indicatorDetail.value = null
  detailLoading.value = true
  try {
    indicatorDetail.value = await portfolioAnalysisApi.getPortraitIndicatorDetail({
      ...buildPortraitRequest(),
      dimensionCode,
    })
  } catch (error) {
    showUserError(error, '加载指标明细失败')
    detailOpen.value = false
  } finally {
    detailLoading.value = false
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
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教师画像">
        <template #actions>
          <UiButton :loading="loading" @click="loadPortraitBundle"> 刷新 </UiButton>
        </template>
      </ContextBar>
    </template>
    <div v-if="canPickTeachers && !targetTeacherId" class="teacher-portrait__hint">
      <UiEmpty description="请从教师名册选择目标教师，或在 URL 携带 teacherId 参数" />
    </div>

    <template v-else>
      <a-spin :spinning="loading">
        <UiCard v-if="portrait" title="综合画像">
          <SignalBand :metrics="compositeItems" compact />
          <p class="teacher-portrait__meta">加权：核心 30% · 教学 25% · 科研/培训/实践各 15%</p>
          <p class="teacher-portrait__meta">
            正式档案记录 {{ portrait.officialRecordCount }} 条
            <template v-if="portrait.computedTime">
              · 最近重算 {{ portrait.computedTime }}
            </template>
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

        <UiEmpty v-else-if="portraitAbsent && !loading" description="尚未生成画像快照" />
      </a-spin>

      <div v-if="portrait" class="teacher-portrait__charts">
        <MarkChartCard title="能力雷达" :loading="loading" chart-min-height="320">
          <MarkChart :option="radarOption" height="320px" aria-label="教师画像能力雷达图" />
        </MarkChartCard>

        <MarkChartCard title="同群体对比" :loading="loading" chart-min-height="320">
          <UiAlert
            v-if="cohort?.displayMode === 'INSUFFICIENT'"
            type="warning"
            class="teacher-portrait__cohort-alert"
          >
            {{ cohortHint }}
          </UiAlert>
          <UiAlert
            v-else-if="cohort?.displayMode === 'LIMITED'"
            type="warning"
            class="teacher-portrait__cohort-alert"
          >
            {{ cohortHint }}
          </UiAlert>
          <MarkChart
            v-else
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
      <a-spin :spinning="detailLoading">
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
      </a-spin>
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

.teacher-portrait__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-4);
}

.teacher-portrait__trend {
  margin-top: var(--dp-space-4);
}

.teacher-portrait__cohort-alert {
  margin: 0 var(--dp-space-4) var(--dp-space-3);
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
    background: var(--ant-color-fill-quaternary);
  }
}

.teacher-portrait__action {
  color: var(--ant-color-primary);
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
  padding: var(--dp-space-6) 0;
}

@media (max-width: 960px) {
  .teacher-portrait__charts {
    grid-template-columns: 1fr;
  }

  .teacher-portrait__detail-meta {
    grid-template-columns: 1fr;
  }
}
</style>
