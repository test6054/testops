<template>
  <StageWorkbenchShell class="experience-page">
    <template v-if="selectedExamId" #context>
      <ContextBar layout="workbench" show-title title="阅卷经验库" />
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand compact variant="panel" :metrics="experienceSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" class="experience-page__empty" />

    <UiEmpty
      size="sm"
      v-else-if="loadFailed"
      title="加载失败"
      description="阅卷经验库加载失败"
      class="experience-page__empty"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard flush class="experience-page__tabs-card">
        <template #head>
          <UiSectionTabs v-model="activeTab" :items="tabItems" compact divided />
        </template>

        <div v-if="activeTab === 'signature'" class="experience-page__tab-panel">
          <div class="experience-page__panel-head">
            <span class="experience-page__panel-title">考试题目签名</span>
            <div class="experience-page__panel-actions">
              <span class="experience-page__flow-hint">{{
                EXPERIENCE_ASSIST_CALIBRATION_HINT
              }}</span>
              <span class="experience-page__flow-hint">{{ EXPERIENCE_CASE_FLOW_HINT }}</span>
              <UiButton
                v-if="canManageReviewerWrites === true"
                size="sm"
                variant="primary"
                :loading="generatingSignatures === true"
                @click="handleGenerateSignatures"
              >
                <template #icon><ThunderboltOutlined /></template>
                生成 / 重算签名
              </UiButton>
            </div>
          </div>

          <UiDataTable
            v-model:current="signaturePageNum"
            v-model:page-size="signaturePageSize"
            pagination-mode="server"
            :columns="signatureColumns"
            :data-source="signatures"
            :loading="signaturesLoading"
            :load-error="signaturesLoadError"
            flat
            :total="signaturePageTotal"
            row-key="layoutQuestionId"
            size="small"
            @page-change="handleSignaturePageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'questionNo'">
                <span class="score-summary-table__mono">{{ signatures[index].questionNo }}</span>
              </template>
              <template v-else-if="column.key === 'questionType'">
                {{ questionTypeLabel(signatures[index].questionType) }}
              </template>
              <template v-else-if="column.key === 'experienceCount'">
                <span class="score-summary-table__mono">{{
                  signatures[index].experienceCount ?? 0
                }}</span>
              </template>
              <template v-else-if="column.key === 'questionDigest'">
                <UiTooltip :title="signatures[index].questionDigest" popup-mount="body">
                  <span>{{ ellipsis(signatures[index].questionDigest, 60) }}</span>
                </UiTooltip>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildSignatureRowActions(signatures[index])"
                  split
                  @action="(key) => handleSignatureRowAction(key, signatures[index])"
                />
              </template>
            </template>
          </UiDataTable>
        </div>

        <div v-else-if="activeTab === 'experience'" class="experience-page__tab-panel">
          <div class="experience-page__panel-head">
            <span class="experience-page__panel-title">阅卷经验案例</span>
            <div class="experience-page__panel-actions">
              <span class="experience-page__flow-hint">{{
                EXPERIENCE_ASSIST_CALIBRATION_HINT
              }}</span>
              <span class="experience-page__flow-hint">{{ EXPERIENCE_CASE_FLOW_HINT }}</span>
              <UiButton
                v-if="canManageReviewerWrites === true"
                size="sm"
                variant="primary"
                :disabled="!experienceFilterForm.layoutQuestionId"
                :loading="extracting === true"
                @click="handleExtract"
              >
                <template #icon><ThunderboltOutlined /></template>
                AI 提炼经验
              </UiButton>
            </div>
          </div>

          <UiFilterBar
            :model-value="experienceFilterForm"
            :fields="experienceFilterFields"
            variant="plain"
            show-labels
            search-text="查询"
            @update:model-value="syncExperienceFilterForm"
            @search="handleExperienceFilterSearch"
            @reset="handleExperienceFilterReset"
          />

          <UiDataTable
            v-model:current="experiencePageNum"
            v-model:page-size="experiencePageSize"
            pagination-mode="server"
            :columns="experienceColumns"
            :data-source="experiences"
            :loading="experienceLoading"
            :load-error="experiencesLoadError"
            flat
            :total="experiencePageTotal"
            row-key="id"
            size="small"
            @page-change="handleExperiencePageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'questionNo'">
                <span class="score-summary-table__mono">{{ experiences[index].questionNo }}</span>
              </template>
              <template v-else-if="column.key === 'questionType'">
                {{ questionTypeLabel(experiences[index].questionType) }}
              </template>
              <template v-else-if="column.key === 'analysisStatus'">
                <UiTag :tone="aiStatusTone(experiences[index].analysisStatus)" size="sm">
                  {{ aiStatusLabel(experiences[index].analysisStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'caseStatus'">
                <UiTag :tone="caseStatusTone(experiences[index].caseStatus)" size="sm">
                  {{ caseStatusLabel(experiences[index].caseStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'assistEligible'">
                <UiTag v-if="experiences[index].assistEligible" tone="green" size="sm">
                  可定标
                </UiTag>
                <UiTag
                  v-else-if="experiences[index].caseStatus === ExperienceCaseStatusCode.CONFIRMED"
                  tone="orange"
                  size="sm"
                >
                  待评估
                </UiTag>
                <span v-else>—</span>
              </template>
              <template v-else-if="column.key === 'reuseCount'">
                {{ experiences[index].reuseCount ?? 0 }}
              </template>
              <template v-else-if="column.key === 'experienceSummary'">
                <UiTooltip :title="experiences[index].experienceSummary" popup-mount="body">
                  <span>{{ ellipsis(experiences[index].experienceSummary, 80) }}</span>
                </UiTooltip>
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ formatDateTime(experiences[index].createTime) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildExperienceRowActions(experiences[index])"
                  split
                  @action="(key) => handleExperienceRowAction(key, experiences[index])"
                />
              </template>
            </template>
          </UiDataTable>
        </div>

        <div v-else class="experience-page__tab-panel">
          <div class="experience-page__panel-head">
            <span class="experience-page__panel-title">
              答案聚类
              <UiTag
                v-if="latestCluster"
                :tone="aiStatusTone(latestCluster.analysisStatus)"
                size="sm"
              >
                {{ aiStatusLabel(latestCluster.analysisStatus) }}
              </UiTag>
            </span>
            <div class="experience-page__panel-actions">
              <span class="experience-page__flow-hint">{{ AI_ANALYSIS_FLOW_HINT }}</span>
              <UiButton
                v-if="canManageReviewerWrites === true"
                size="sm"
                variant="primary"
                :disabled="!clusterFilterForm.layoutQuestionId"
                :loading="clustering === true"
                @click="handleGenerateCluster"
              >
                <template #icon><ThunderboltOutlined /></template>
                AI 聚类
              </UiButton>
            </div>
          </div>

          <UiFilterBar
            :model-value="clusterFilterForm"
            :fields="clusterFilterFields"
            variant="plain"
            show-labels
            search-text="查询最新"
            @update:model-value="syncClusterFilterForm"
            @search="loadLatestCluster"
            @reset="handleClusterFilterReset"
          />

          <UiAlertStrip
            v-if="!clusterLoading && !latestCluster"
            tone="info"
            size="sm"
            dense
            inline
            :show-icon="false"
          >
            <template #default>
              <span style="display: inline-flex; align-items: center; gap: 8px">
                <UiTag tone="blue" size="sm">待查询</UiTag>
                <span>请选择题目并查询最新聚类结果</span>
              </span>
            </template>
          </UiAlertStrip>

          <UiSkeletonState v-else-if="clusterLoading" variant="card" compact />

          <template v-else-if="latestCluster">
            <UiDescriptions :column="3" bordered size="small" class="experience-page__cluster-meta">
              <UiDescriptionsItem label="分组数">
                <b>{{ clusterGroupCountText(latestCluster) }}</b>
              </UiDescriptionsItem>
              <UiDescriptionsItem label="分析状态">
                <UiTag :tone="aiStatusTone(latestCluster.analysisStatus)" size="sm">
                  {{ aiStatusLabel(latestCluster.analysisStatus) }}
                </UiTag>
              </UiDescriptionsItem>
              <UiDescriptionsItem label="耗时">
                {{ clusterLatencyText(latestCluster) }}
              </UiDescriptionsItem>
              <UiDescriptionsItem label="AI 处理追踪编号" :span="3">
                {{ clusterTraceText(latestCluster) }}
              </UiDescriptionsItem>
              <UiDescriptionsItem v-if="latestCluster.errorMessage" label="AI 处理说明" :span="3">
                <span class="error-text">
                  {{ aiClusterFailureMessage(latestCluster.errorMessage) }}
                </span>
              </UiDescriptionsItem>
              <UiDescriptionsItem label="聚类总结" :span="3">
                <span>{{ clusterSummaryText(latestCluster) }}</span>
              </UiDescriptionsItem>
            </UiDescriptions>
            <UiList
              v-if="latestCluster.answerGroups?.length"
              class="answer-groups"
              :data-source="latestCluster.answerGroups"
              item-layout="vertical"
              bordered
            >
              <template #renderItem="{ item }">
                <UiListItem>
                  <div class="analysis-item__header">
                    <div>
                      <b>{{ item.groupLabel }}</b>
                      <span v-if="item.groupDescription" class="analysis-item__muted">
                        {{ item.groupDescription }}
                      </span>
                    </div>
                    <div class="dp-space" style="--dp-space-gap: 8px">
                      <UiTag v-if="item.answerCount != null" tone="blue" size="sm">
                        {{ item.answerCount }} 份
                      </UiTag>
                      <UiTag v-if="item.avgScore != null" tone="green" size="sm">
                        均分 {{ item.avgScore }}
                      </UiTag>
                    </div>
                  </div>
                  <div v-if="item.representativeAnswers?.length" class="answer-samples">
                    <div
                      v-for="(answer, answerIndex) in item.representativeAnswers"
                      :key="`${item.groupNo}-${answerIndex}`"
                      class="answer-sample"
                    >
                      {{ answer }}
                    </div>
                  </div>
                  <UiTypographyParagraph v-if="item.suggestedAction" class="analysis-item__text">
                    <strong>处理措施：</strong>{{ item.suggestedAction }}
                  </UiTypographyParagraph>
                  <UiTypographyParagraph v-if="item.controversyNote" class="analysis-item__text">
                    <strong>争议说明：</strong>{{ item.controversyNote }}
                  </UiTypographyParagraph>
                </UiListItem>
              </template>
            </UiList>
          </template>
        </div>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>

  <!-- 相似题抽屉 -->
  <UiDrawer
    :open="similarDrawerOpen"
    :title="`相似题检索 - ${similarSourceQuestionNo ? `题号 ${similarSourceQuestionNo}` : ''}`"
    :width="640"
    hide-footer
    @update:open="(v: boolean) => (similarDrawerOpen = v)"
    @close="similarDrawerOpen = false"
  >
    <UiSkeletonState v-if="similarLoading" variant="card" compact />
    <UiEmpty size="sm" v-else-if="similarResults.length === 0" description="暂无相似题" />
    <UiList v-else :data-source="similarResults" item-layout="vertical">
      <template #renderItem="{ item }: { item: QuestionSignatureResponse }">
        <UiListItem>
          <div class="dp-space" style="--dp-space-gap: 8px">
            <UiTag tone="blue" size="sm">{{ item.examName }} · {{ item.examNo }}</UiTag>
            <UiTag tone="blue" size="sm">
              {{ questionTypeLabel(item.questionType) }}
            </UiTag>
            <UiTag tone="gray" size="sm">题号 {{ item.questionNo }}</UiTag>
          </div>
          <p v-if="item.questionDigest" class="similar-digest">{{ item.questionDigest }}</p>
        </UiListItem>
      </template>
    </UiList>
  </UiDrawer>

  <!-- 经验案例详情抽屉 -->
  <UiDrawer
    :open="experienceDrawerOpen"
    title="阅卷经验详情"
    :width="720"
    hide-footer
    @update:open="(v: boolean) => (experienceDrawerOpen = v)"
    @close="experienceDrawerOpen = false"
  >
    <UiDescriptions v-if="detailExperience" :column="1" bordered size="small">
      <UiDescriptionsItem label="来源考试">
        {{ detailExperience.sourceExamName }} · {{ detailExperience.sourceExamNo }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="题目"> 题号 {{ detailExperience.questionNo }} </UiDescriptionsItem>
      <UiDescriptionsItem label="状态">
        <UiTag :tone="caseStatusTone(detailExperience.caseStatus)" size="sm">
          {{ caseStatusLabel(detailExperience.caseStatus) }}
        </UiTag>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="AI 状态">
        <UiTag :tone="aiStatusTone(detailExperience.analysisStatus)" size="sm">
          {{ aiStatusLabel(detailExperience.analysisStatus) }}
        </UiTag>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="AI 处理追踪编号">
        {{ experienceTraceText(detailExperience) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="耗时">
        {{ experienceLatencyText(detailExperience) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="经验总结">
        <span>{{ experienceSummaryText(detailExperience) }}</span>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="适用边界">
        {{ experienceApplicableScopeText(detailExperience) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem v-if="detailExperience.riskTags?.length" label="风险标签">
        <div class="dp-space dp-space--wrap" style="--dp-space-gap: 8px">
          <UiTag v-for="tag in detailExperience.riskTags" :key="tag" tone="orange" size="sm">
            {{ tag }}
          </UiTag>
        </div>
      </UiDescriptionsItem>
      <UiDescriptionsItem v-if="detailExperience.errorMessage" label="分析处理说明">
        <span class="error-text">
          {{ gradingExperienceFailureMessage(detailExperience.errorMessage) }}
        </span>
      </UiDescriptionsItem>
    </UiDescriptions>

    <UiList
      v-if="detailExperience?.experienceItems?.length"
      class="experience-items"
      :data-source="detailExperience.experienceItems"
      item-layout="vertical"
      bordered
    >
      <template #renderItem="{ item }">
        <UiListItem>
          <div class="analysis-item__header">
            <b>{{ item.experienceType || '经验条目' }}</b>
            <UiTag v-if="item.frequency != null" tone="blue" size="sm">
              出现 {{ item.frequency }} 次
            </UiTag>
          </div>
          <UiTypographyParagraph v-if="item.description" class="analysis-item__text">
            {{ item.description }}
          </UiTypographyParagraph>
          <UiTypographyParagraph v-if="item.scoringPattern" class="analysis-item__text">
            <strong>评分模式：</strong>{{ item.scoringPattern }}
          </UiTypographyParagraph>
          <UiTypographyParagraph v-if="item.applicableScenario" class="analysis-item__text">
            <strong>适用场景：</strong>{{ item.applicableScenario }}
          </UiTypographyParagraph>
          <UiTypographyParagraph v-if="item.riskNote" class="analysis-item__text">
            <strong>注意事项：</strong>{{ item.riskNote }}
          </UiTypographyParagraph>
        </UiListItem>
      </template>
    </UiList>
    <template #footer>
      <div
        class="dp-space"
        v-if="canConfirmExperience === true || canDeprecateExperience === true"
        style="--dp-space-gap: 8px"
      >
        <UiButton
          variant="primary"
          size="sm"
          v-if="canConfirmExperience === true"
          :loading="confirmingExperience === true"
          @click="handleConfirmExperience"
        >
          确认沉淀
        </UiButton>
        <UiButton
          size="sm"
          v-if="canDeprecateExperience === true"
          variant="outline"
          status="danger"
          :loading="deprecatingExperience === true"
          @click="handleDeprecateExperience"
        >
          废弃案例
        </UiButton>
      </div>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  AnswerClusterRecordResponse,
  GradingExperienceCaseResponse,
  GradingExperienceStatsResponse,
  QuestionSignatureResponse,
} from '@/apis/mark/grading-experience'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
import type {
  BadgeTone,
  FilterField,
  UiSectionTabItem,
  UiTableRowActionItem,
} from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import {
  AI_ANALYSIS_FLOW_HINT,
  AI_ANALYSIS_STATUS_TONE,
  AiAnalysisStatusCode,
  AiAnalysisStatusDescription,
} from '@/apis/mark/ai-analysis-status'
import {
  confirmExperienceCase,
  deprecateExperienceCase,
  EXPERIENCE_ASSIST_CALIBRATION_HINT,
  EXPERIENCE_CASE_FLOW_HINT,
  EXPERIENCE_CASE_STATUS_TONE,
  ExperienceCaseStatusCode,
  ExperienceCaseStatusDescription,
  extractExperience,
  generateAnswerCluster,
  generateSignatures,
  getExperienceStats,
  getLatestAnswerCluster,
  pageExperiences,
  pageSignatures,
  searchSimilar,
} from '@/apis/mark/grading-experience'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiListItem from '@/components/ui-guide/ui/UiListItem.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useQueryTable } from '@/composables/useQueryTable'
import { EXPORT_PAGE_SIZE } from '@/constants/pagination'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { buildEmptyPageResult } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherGradingExperienceHub' })

// 考试工作台内由 useMarkExamContext 注入当前考试
const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const activeTab = ref<'signature' | 'experience' | 'cluster'>('signature')
const loadFailed = ref(false)

const tabItems: UiSectionTabItem[] = [
  { key: 'signature', label: '题目签名 / 相似题' },
  { key: 'experience', label: 'AI 阅卷经验' },
  { key: 'cluster', label: 'AI 答案聚类' },
]

// ─── 题目签名 ─────────────────────────────────

const generatingSignatures = ref(false)
const experienceStats = ref<GradingExperienceStatsResponse | null>(null)
/** MVR-284/355：默认拒绝假可写；仅 stats.canManageReviewerWrites 为 true 时开放 ACTIVE 写入口 */
const canManageReviewerWrites = computed(
  () => experienceStats.value?.canManageReviewerWrites === true,
)

/**
 * MVR-364：确认/废弃不叠 ACTIVE；仅认 stats.canManageExperienceCaseLifecycle===true。
 * 与 BE requireExamReviewerPermission（无 requireActiveExam）同源。
 */
const canManageExperienceCaseLifecycle = computed(
  () => experienceStats.value?.canManageExperienceCaseLifecycle === true,
)
const questionOptionRows = ref<QuestionSignatureResponse[]>([])

const {
  loading: signaturesLoading,
  rows: signatures,
  pageNum: signaturePageNum,
  pageSize: signaturePageSize,
  pageTotal: signaturePageTotal,
  loadError: signaturesLoadError,
  handlePageChange: handleSignaturePageChange,
  search: searchSignatures,
  loadPage: loadSignaturePage,
} = useQueryTable<QuestionSignatureResponse, Record<string, never>>(
  (params) => {
    if (!selectedExamId.value) {
      return Promise.resolve(
        buildEmptyPageResult<QuestionSignatureResponse>(params.pageNum, params.pageSize),
      )
    }
    return pageSignatures({ examId: selectedExamId.value, ...params })
  },
  { immediate: false, errorMessage: '题目特征加载失败' },
)

const signatureColumns: ColumnType<QuestionSignatureResponse>[] = [
  { title: '题号', key: 'questionNo', width: 80, fixed: 'left' },
  { title: '题型', key: 'questionType', width: 100 },
  { title: '经验案例', key: 'experienceCount', width: 88, align: 'right' },
  { title: '题干摘要', key: 'questionDigest', width: 320 },
  { title: '操作', key: 'actions', width: 120 },
]

const questionOptions = computed(() =>
  questionOptionRows.value.map((item) => ({
    label: `题号 ${item.questionNo} · ${questionTypeLabel(item.questionType)}`,
    value: item.layoutQuestionId,
  })),
)

const experienceFilterForm = reactive<{ layoutQuestionId?: string }>({})

function syncExperienceFilterForm(next: Record<string, unknown>): void {
  Object.assign(experienceFilterForm, next)
}

const {
  loading: experienceLoading,
  rows: experiences,
  pageNum: experiencePageNum,
  pageSize: experiencePageSize,
  pageTotal: experiencePageTotal,
  filters: experienceFilters,
  loadError: experiencesLoadError,
  handlePageChange: handleExperiencePageChange,
  search: searchExperienceTable,
  loadPage: loadExperiencePage,
} = useQueryTable<GradingExperienceCaseResponse, { layoutQuestionId?: string }>(
  (params) => {
    if (!selectedExamId.value) {
      return Promise.resolve(
        buildEmptyPageResult<GradingExperienceCaseResponse>(params.pageNum, params.pageSize),
      )
    }
    const { layoutQuestionId, ...pageParams } = params
    return pageExperiences({
      examId: selectedExamId.value,
      layoutQuestionId: layoutQuestionId || undefined,
      ...pageParams,
    })
  },
  { immediate: false, errorMessage: '评分经验加载失败' },
)

const experienceFilterFields = computed<FilterField[]>(() => [
  {
    key: 'layoutQuestionId',
    type: 'select',
    placeholder: '选择题目',
    width: 220,
    allowClear: true,
    allowSearch: true,
    options: questionOptions.value,
  },
])

const clusterFilterForm = reactive<{ layoutQuestionId?: string }>({})

function syncClusterFilterForm(next: Record<string, unknown>): void {
  Object.assign(clusterFilterForm, next)
}

const clusterFilterFields = computed<FilterField[]>(() => [
  {
    key: 'layoutQuestionId',
    type: 'select',
    placeholder: '选择题目',
    width: 220,
    allowClear: true,
    allowSearch: true,
    options: questionOptions.value,
  },
])

async function loadExperienceStats(): Promise<void> {
  if (!selectedExamId.value) {
    experienceStats.value = null
    return
  }
  try {
    experienceStats.value = await getExperienceStats({ examId: selectedExamId.value })
  } catch (error) {
    experienceStats.value = null
    showUserError(error, '阅卷经验统计加载失败')
  }
}

async function loadQuestionOptions(): Promise<void> {
  if (!selectedExamId.value) {
    questionOptionRows.value = []
    return
  }
  try {
    const result = await pageSignatures({
      examId: selectedExamId.value,
      pageNum: 1,
      pageSize: EXPORT_PAGE_SIZE,
    })
    questionOptionRows.value = result.list
  } catch (error) {
    questionOptionRows.value = []
    showUserError(error, '题目选项加载失败')
  }
}

async function loadSignatures(): Promise<void> {
  if (!selectedExamId.value) return
  loadFailed.value = false
  try {
    await loadSignaturePage()
  } catch (error) {
    loadFailed.value = true
    showUserError(error, '题目签名列表加载失败')
  }
}

async function handleGenerateSignatures(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无阅卷写权限')
    return
  }
  if (!selectedExamId.value || generatingSignatures.value === true) return
  generatingSignatures.value = true
  try {
    const result = await generateSignatures(selectedExamId.value)
    if (result.length <= 0) {
      void message.warning('本场无可签名的主观题，未写入题目签名')
    } else {
      void message.success(`已生成 ${result.length} 条题目签名`)
    }
    await Promise.all([searchSignatures(), loadQuestionOptions(), loadExperienceStats()])
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '题目签名生成失败')
  } finally {
    generatingSignatures.value = false
  }
}

// ─── 相似题抽屉 ─────────────────────────────────

const similarDrawerOpen = ref(false)
const similarLoading = ref(false)
const similarResults = ref<QuestionSignatureResponse[]>([])
const similarSourceQuestionNo = ref<string | undefined>(undefined)

function buildSignatureRowActions(_record: QuestionSignatureResponse): UiTableRowActionItem[] {
  return [{ key: 'similar', label: '查找相似题' }]
}

function handleSignatureRowAction(key: string, record: QuestionSignatureResponse): void {
  if (key === 'similar') {
    void openSimilarDrawer(record)
  }
}

function buildExperienceRowActions(_record: GradingExperienceCaseResponse): UiTableRowActionItem[] {
  return [{ key: 'detail', label: '详情' }]
}

function handleExperienceRowAction(key: string, record: GradingExperienceCaseResponse): void {
  if (key === 'detail') {
    openExperienceDrawer(record)
  }
}

async function openSimilarDrawer(record: QuestionSignatureResponse): Promise<void> {
  if (!selectedExamId.value) return
  similarSourceQuestionNo.value = record.questionNo
  similarDrawerOpen.value = true
  similarLoading.value = true
  similarResults.value = []
  try {
    similarResults.value = await searchSimilar({
      examId: selectedExamId.value,
      layoutQuestionId: record.layoutQuestionId,
      limit: 20,
    })
  } catch (error) {
    showUserError(error, '题目相似关系检索失败')
  } finally {
    similarLoading.value = false
  }
}

// ─── AI 经验提取 ─────────────────────────────────

const extracting = ref(false)

const experienceSignalMetrics = computed((): SignalMetric[] => {
  const stats = experienceStats.value
  const signatureCount = stats?.signatureCount ?? 0
  const confirmedCount = stats?.confirmedCount ?? 0
  const pendingAnalysisCount = stats?.pendingAnalysisCount ?? 0
  const assistReadyCount = stats?.assistReadyCount ?? 0
  const experienceCount = stats?.experienceCount ?? 0
  return [
    {
      key: 'signatures',
      label: '题目签名',
      value: signatureCount,
      unit: '条',
      tone: signatureCount > 0 ? 'blue' : 'gray',
    },
    {
      key: 'confirmed',
      label: '已确认案例',
      value: confirmedCount,
      unit: '条',
      tone: confirmedCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'pending-analysis',
      label: '待分析',
      value: pendingAnalysisCount,
      unit: '条',
      tone: pendingAnalysisCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'assist-ready',
      label: '可定标',
      value: assistReadyCount,
      unit: '条',
      tone: assistReadyCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'experiences',
      label: '经验案例',
      value: experienceCount,
      unit: '条',
      tone: experienceCount > 0 ? 'purple' : 'gray',
    },
  ]
})

const experienceColumns: ColumnType<GradingExperienceCaseResponse>[] = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 100, fixed: 'left' },
  { title: '题型', key: 'questionType', width: 100 },
  { title: 'AI 状态', key: 'analysisStatus', width: 100 },
  { title: '案例状态', key: 'caseStatus', width: 100 },
  { title: '定标', key: 'assistEligible', width: 88 },
  { title: '引用', key: 'reuseCount', width: 72, align: 'right' },
  { title: '经验总结', key: 'experienceSummary', width: 300 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 90 },
]

async function loadExperiences(): Promise<void> {
  if (!selectedExamId.value) return
  await loadExperiencePage()
}

function handleExperienceFilterSearch(): void {
  experienceFilters.value = {
    layoutQuestionId: experienceFilterForm.layoutQuestionId,
  }
  searchExperienceTable()
}

async function handleExtract(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无阅卷写权限')
    return
  }
  if (!selectedExamId.value || !experienceFilterForm.layoutQuestionId || extracting.value) return
  extracting.value = true
  try {
    await extractExperience({
      examId: selectedExamId.value,
      layoutQuestionId: experienceFilterForm.layoutQuestionId,
    })
    void message.success('智能经验已提取')
    await Promise.all([loadExperiences(), loadExperienceStats()])
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷经验提取失败')
  } finally {
    extracting.value = false
  }
}

// ─── 经验详情抽屉 ─────────────────────────────────

const experienceDrawerOpen = ref(false)
const detailExperience = ref<GradingExperienceCaseResponse | null>(null)
const confirmingExperience = ref(false)
const deprecatingExperience = ref(false)

const canConfirmExperience = computed(
  () =>
    canManageExperienceCaseLifecycle.value === true
    && detailExperience.value?.caseStatus === ExperienceCaseStatusCode.DRAFT
    && detailExperience.value?.analysisStatus === AiAnalysisStatusCode.SUCCESS
    && Boolean(detailExperience.value?.id),
)

const canDeprecateExperience = computed(
  () =>
    canManageExperienceCaseLifecycle.value === true
    && detailExperience.value?.caseStatus === ExperienceCaseStatusCode.CONFIRMED
    && detailExperience.value?.analysisStatus === AiAnalysisStatusCode.SUCCESS
    && Boolean(detailExperience.value?.id),
)

async function handleConfirmExperience(): Promise<void> {
  // MVR-422：与 canConfirmExperience 同源二次闸（治理权∧DRAFT∧分析成功）
  if (canConfirmExperience.value !== true) {
    void message.warning(
      canManageExperienceCaseLifecycle.value === true
        ? '当前经验案例不可确认（须草稿且分析成功）'
        : '当前账号无经验案例治理权限',
    )
    return
  }
  const caseId = detailExperience.value?.id
  if (!caseId || confirmingExperience.value) return
  confirmingExperience.value = true
  try {
    detailExperience.value = await confirmExperienceCase(caseId)
    void message.success('经验案例已确认，可用于有效性评估')
    await Promise.all([loadExperiences(), loadExperienceStats()])
  } catch (error) {
    showUserError(error, '经验案例确认失败')
  } finally {
    confirmingExperience.value = false
  }
}

function handleDeprecateExperience(): void {
  // MVR-422：与 canDeprecateExperience 同源二次闸（治理权∧CONFIRMED∧分析成功）
  if (canDeprecateExperience.value !== true) {
    void message.warning(
      canManageExperienceCaseLifecycle.value === true
        ? '当前经验案例不可废弃（须已确认且分析成功）'
        : '当前账号无经验案例治理权限',
    )
    return
  }
  const caseId = detailExperience.value?.id
  if (!caseId) return
  void confirmAsync({
    title: '确认废弃经验案例',
    content: '废弃后不可再用于有效性评估，历史评估记录仍保留。确认废弃？',
    okText: '废弃',
    cancelText: '取消',
    type: 'error',
    onOk: async () => {
      // MVR-938：onOk 再认 canDeprecateExperience，防确认等待期间案例态/治理权漂移
      if (canDeprecateExperience.value !== true) {
        void message.warning(
          canManageExperienceCaseLifecycle.value === true
            ? '当前经验案例不可废弃（须已确认且分析成功）'
            : '当前账号无经验案例治理权限',
        )
        return
      }
      if (deprecatingExperience.value === true) return
      deprecatingExperience.value = true
      try {
        detailExperience.value = await deprecateExperienceCase(caseId)
        void message.success('经验案例已废弃')
        await Promise.all([loadExperiences(), loadExperienceStats()])
      } catch (error) {
        showUserError(error, '经验案例废弃失败')
      } finally {
        deprecatingExperience.value = false
      }
    },
  })
}

function openExperienceDrawer(record: GradingExperienceCaseResponse): void {
  detailExperience.value = record
  experienceDrawerOpen.value = true
}

function handleExperienceFilterReset(): void {
  experienceFilterForm.layoutQuestionId = undefined
  experienceFilters.value = {}
  searchExperienceTable()
}

// ─── AI 答案聚类 ─────────────────────────────────

const latestCluster = ref<AnswerClusterRecordResponse | null>(null)
const clusterLoading = ref(false)
const clustering = ref(false)

async function loadLatestCluster(): Promise<void> {
  if (!selectedExamId.value || !clusterFilterForm.layoutQuestionId) return
  clusterLoading.value = true
  try {
    latestCluster.value = await getLatestAnswerCluster({
      examId: selectedExamId.value,
      layoutQuestionId: clusterFilterForm.layoutQuestionId,
    })
  } catch (error) {
    latestCluster.value = null
    showUserError(error, '错误簇加载失败')
  } finally {
    clusterLoading.value = false
  }
}

async function handleGenerateCluster(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无阅卷写权限')
    return
  }
  if (!selectedExamId.value || !clusterFilterForm.layoutQuestionId || clustering.value) return
  clustering.value = true
  try {
    latestCluster.value = await generateAnswerCluster({
      examId: selectedExamId.value,
      layoutQuestionId: clusterFilterForm.layoutQuestionId,
    })
    void message.success('智能答案聚类已完成')
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '答案聚类分析生成失败')
  } finally {
    clustering.value = false
  }
}

function handleClusterFilterReset(): void {
  clusterFilterForm.layoutQuestionId = undefined
  latestCluster.value = null
}

// ─── 共用 ─────────────────────────────────

// helper 严格只接受后端枚举类型，返回与 UiTag tone 一致的 BadgeTone，零 as 断言。
function aiStatusTone(status: AiAnalysisStatusCode): BadgeTone {
  return strictEnumTone(AI_ANALYSIS_STATUS_TONE, status, 'AI 分析状态')
}

function caseStatusTone(status: ExperienceCaseStatusCode): BadgeTone {
  return strictEnumTone(EXPERIENCE_CASE_STATUS_TONE, status, '经验案例状态')
}

function aiStatusLabel(status: AiAnalysisStatusCode): string {
  return strictEnumLabel(AiAnalysisStatusDescription, status, 'AI 分析状态')
}

function caseStatusLabel(status: ExperienceCaseStatusCode): string {
  return strictEnumLabel(ExperienceCaseStatusDescription, status, '经验案例状态')
}

function questionTypeLabel(value: QuestionTypeCode): string {
  return strictEnumLabel(QuestionTypeDescription, value, '题型')
}

function ellipsis(
  text:
    | QuestionSignatureResponse['questionDigest']
    | GradingExperienceCaseResponse['experienceSummary'],
  len = 60,
): string {
  if (!text) return '—'
  return text.length > len ? `${text.slice(0, len)}…` : text
}

function clusterLatencyText(item: AnswerClusterRecordResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析，尚未生成耗时'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS && item.latencyMs != null)
    return `${item.latencyMs} ms`
  return '处理失败，未生成耗时'
}

function clusterTraceText(item: AnswerClusterRecordResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析，尚未生成追踪编号'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS) return item.aiTraceId ?? '—'
  return '处理失败，未生成追踪编号'
}

function clusterSummaryText(item: AnswerClusterRecordResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING)
    return 'AI 答案聚类待分析，完成后展示聚类总结'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS) return item.clusterSummary ?? '—'
  return aiClusterFailureMessage(item.errorMessage)
}

function clusterGroupCountText(item: AnswerClusterRecordResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS && item.groupCount != null)
    return String(item.groupCount)
  return '处理失败'
}

function experienceTraceText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析，尚未生成追踪编号'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS) return item.aiTraceId ?? '—'
  return '处理失败，未生成追踪编号'
}

function experienceLatencyText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析，尚未生成耗时'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS && item.latencyMs != null)
    return `${item.latencyMs} ms`
  return '处理失败，未生成耗时'
}

function experienceSummaryText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING)
    return 'AI 阅卷经验提炼待分析，完成后展示经验总结'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS) return item.experienceSummary ?? '—'
  return gradingExperienceFailureMessage(item.errorMessage)
}

function experienceApplicableScopeText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === AiAnalysisStatusCode.PENDING) return '待分析，尚未生成适用边界'
  if (item.analysisStatus === AiAnalysisStatusCode.SUCCESS) return item.applicableScope ?? '—'
  return '处理失败，未生成适用边界'
}

function aiClusterFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 答案聚类未完成，请重新生成')
}

function gradingExperienceFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, '阅卷经验提取未完成，请重新提取')
}

async function loadPageSummary(): Promise<void> {
  if (!selectedExamId.value) return
  await Promise.all([
    loadExperienceStats(),
    loadQuestionOptions(),
    loadSignatures(),
    loadExperiences(),
  ])
}

async function reloadActiveTab(): Promise<void> {
  if (!selectedExamId.value) return
  loadFailed.value = false
  if (activeTab.value === 'signature') {
    await loadPageSummary()
  } else if (activeTab.value === 'experience') {
    if (questionOptionRows.value.length === 0) {
      await loadQuestionOptions()
    }
    await Promise.all([loadExperienceStats(), loadExperiences()])
  } else if (activeTab.value === 'cluster') {
    if (questionOptionRows.value.length === 0) {
      await loadQuestionOptions()
    }
    if (clusterFilterForm.layoutQuestionId) {
      await loadLatestCluster()
    }
  }
}

watch(activeTab, () => {
  void reloadActiveTab()
})

watch(
  selectedExamId,
  (value) => {
    questionOptionRows.value = []
    experienceStats.value = null
    latestCluster.value = null
    experienceFilterForm.layoutQuestionId = undefined
    experienceFilters.value = {}
    clusterFilterForm.layoutQuestionId = undefined
    if (value) {
      void reloadActiveTab()
    }
  },
  { immediate: true },
)

const skipNextActivatedReload = ref(true)

onActivated(() => {
  if (skipNextActivatedReload.value) {
    skipNextActivatedReload.value = false
    return
  }
  void reloadActiveTab()
})
</script>

<style lang="scss" scoped>
.experience-page {
  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  &__tabs-card {
    min-width: 0;
  }

  &__tab-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 0 16px 16px;
  }

  &__panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
    min-width: 0;
  }

  &__panel-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  &__flow-hint {
    font-size: var(--dp-font-size-xs);
    color: var(--c-text-4);
    white-space: nowrap;
  }

  &__cluster-meta {
    margin-bottom: 12px;
  }
}

.empty-block {
  margin-top: var(--dp-space-3, 12px);
}

.error-text {
  color: var(--dp-error);
  font-size: var(--dp-font-size-xs);
}

.similar-digest {
  margin: 6px 0 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.experience-items,
.answer-groups {
  margin-top: 12px;
}

.analysis-item {
  &__header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  &__muted {
    margin-left: 8px;
    color: var(--dp-text-tertiary);
    font-size: var(--dp-font-size-xs);
  }

  &__text {
    margin-bottom: 6px;
  }
}

.answer-samples {
  display: grid;
  gap: 8px;
  margin: 8px 0;
}

.answer-sample {
  padding: 8px 10px;
  background: var(--dp-gray-50);
  border: 1px solid var(--dp-border-subtle);
  border-radius: 6px;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
}
</style>
