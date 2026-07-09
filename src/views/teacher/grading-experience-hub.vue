<template>
  <StageWorkbenchShell class="experience-page">
    <template v-if="selectedExamId" #signal>
      <SignalBand variant="tiles" compact :metrics="experienceSignalMetrics" />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" class="experience-page__empty" />

    <UiEmpty
      v-else-if="loadFailed"
      description="阅卷经验库加载失败"
      action-label="重试"
      class="experience-page__empty"
      @action="reloadActiveTab"
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
              <UiButton size="sm" :loading="generatingSignatures" @click="handleGenerateSignatures">
                <template #icon><ThunderboltOutlined /></template>
                生成 / 重算签名
              </UiButton>
            </div>
          </div>

          <UiDataTable
            pagination-mode="client"
            class="student-detail-table__data-table"
            :columns="signatureColumns"
            :data-source="signatures"
            :loading="signaturesLoading"
            flat
            :total="signatures.length"
            :page-size="20"
            row-key="layoutQuestionId"
            size="small"
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
                  experienceCountForQuestion(signatures[index].layoutQuestionId)
                }}</span>
              </template>
              <template v-else-if="column.key === 'questionDigest'">
                <a-tooltip :title="signatures[index].questionDigest">
                  <span>{{ ellipsis(signatures[index].questionDigest, 60) }}</span>
                </a-tooltip>
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
                size="sm"
                :disabled="!experienceFilterForm.layoutQuestionId"
                :loading="extracting"
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
            @search="loadExperiences"
            @reset="handleExperienceFilterReset"
          />

          <UiDataTable
            pagination-mode="client"
            class="student-detail-table__data-table"
            :columns="experienceColumns"
            :data-source="experiences"
            :loading="experienceLoading"
            flat
            :total="experiences.length"
            :page-size="20"
            row-key="id"
            size="small"
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
                  v-else-if="experiences[index].caseStatus === 'CONFIRMED'"
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
                <a-tooltip :title="experiences[index].experienceSummary">
                  <span>{{ ellipsis(experiences[index].experienceSummary, 80) }}</span>
                </a-tooltip>
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
                size="sm"
                :disabled="!clusterFilterForm.layoutQuestionId"
                :loading="clustering"
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

          <UiEmpty
            v-if="!clusterLoading && !latestCluster"
            description="请选择题目并查询最新聚类结果"
          />

          <UiSkeletonState v-else-if="clusterLoading" variant="card" compact />

          <template v-else-if="latestCluster">
            <a-descriptions :column="3" bordered size="small" class="experience-page__cluster-meta">
              <a-descriptions-item label="分组数">
                <b>{{ clusterGroupCountText(latestCluster) }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="分析状态">
                <UiTag :tone="aiStatusTone(latestCluster.analysisStatus)" size="sm">
                  {{ aiStatusLabel(latestCluster.analysisStatus) }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="耗时">
                {{ clusterLatencyText(latestCluster) }}
              </a-descriptions-item>
              <a-descriptions-item label="AI 处理追踪编号" :span="3">
                {{ clusterTraceText(latestCluster) }}
              </a-descriptions-item>
              <a-descriptions-item v-if="latestCluster.errorMessage" label="AI 处理说明" :span="3">
                <span class="error-text">
                  {{ aiClusterFailureMessage(latestCluster.errorMessage) }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="聚类总结" :span="3">
                <span>{{ clusterSummaryText(latestCluster) }}</span>
              </a-descriptions-item>
            </a-descriptions>
            <a-list
              v-if="latestCluster.answerGroups?.length"
              class="answer-groups"
              :data-source="latestCluster.answerGroups"
              item-layout="vertical"
              bordered
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <div class="analysis-item__header">
                    <div>
                      <b>{{ item.groupLabel }}</b>
                      <span v-if="item.groupDescription" class="analysis-item__muted">
                        {{ item.groupDescription }}
                      </span>
                    </div>
                    <a-space size="small">
                      <UiTag v-if="item.answerCount != null" tone="blue" size="sm">
                        {{ item.answerCount }} 份
                      </UiTag>
                      <UiTag v-if="item.avgScore != null" tone="green" size="sm">
                        均分 {{ item.avgScore }}
                      </UiTag>
                    </a-space>
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
                  <a-typography-paragraph v-if="item.suggestedAction" class="analysis-item__text">
                    <strong>处理措施：</strong>{{ item.suggestedAction }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.controversyNote" class="analysis-item__text">
                    <strong>争议说明：</strong>{{ item.controversyNote }}
                  </a-typography-paragraph>
                </a-list-item>
              </template>
            </a-list>
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
    <UiEmpty v-else-if="similarResults.length === 0" description="暂无相似题" />
    <a-list v-else :data-source="similarResults" item-layout="vertical">
      <template #renderItem="{ item }: { item: QuestionSignatureResponse }">
        <a-list-item>
          <a-space size="small">
            <UiTag tone="blue" size="sm">{{ item.examName }} · {{ item.examNo }}</UiTag>
            <UiTag tone="blue" size="sm">
              {{ questionTypeLabel(item.questionType) }}
            </UiTag>
            <UiTag tone="gray" size="sm">题号 {{ item.questionNo }}</UiTag>
          </a-space>
          <p v-if="item.questionDigest" class="similar-digest">{{ item.questionDigest }}</p>
        </a-list-item>
      </template>
    </a-list>
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
    <a-descriptions v-if="detailExperience" :column="1" bordered size="small">
      <a-descriptions-item label="来源考试">
        {{ detailExperience.sourceExamName }} · {{ detailExperience.sourceExamNo }}
      </a-descriptions-item>
      <a-descriptions-item label="题目">
        题号 {{ detailExperience.questionNo }}
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        <UiTag :tone="caseStatusTone(detailExperience.caseStatus)" size="sm">
          {{ caseStatusLabel(detailExperience.caseStatus) }}
        </UiTag>
      </a-descriptions-item>
      <a-descriptions-item label="AI 状态">
        <UiTag :tone="aiStatusTone(detailExperience.analysisStatus)" size="sm">
          {{ aiStatusLabel(detailExperience.analysisStatus) }}
        </UiTag>
      </a-descriptions-item>
      <a-descriptions-item label="AI 处理追踪编号">
        {{ experienceTraceText(detailExperience) }}
      </a-descriptions-item>
      <a-descriptions-item label="耗时">
        {{ experienceLatencyText(detailExperience) }}
      </a-descriptions-item>
      <a-descriptions-item label="经验总结">
        <span>{{ experienceSummaryText(detailExperience) }}</span>
      </a-descriptions-item>
      <a-descriptions-item label="适用边界">
        {{ experienceApplicableScopeText(detailExperience) }}
      </a-descriptions-item>
      <a-descriptions-item v-if="detailExperience.riskTags?.length" label="风险标签">
        <a-space wrap>
          <UiTag v-for="tag in detailExperience.riskTags" :key="tag" tone="orange" size="sm">
            {{ tag }}
          </UiTag>
        </a-space>
      </a-descriptions-item>
      <a-descriptions-item v-if="detailExperience.errorMessage" label="分析处理说明">
        <span class="error-text">
          {{ gradingExperienceFailureMessage(detailExperience.errorMessage) }}
        </span>
      </a-descriptions-item>
    </a-descriptions>

    <a-list
      v-if="detailExperience?.experienceItems?.length"
      class="experience-items"
      :data-source="detailExperience.experienceItems"
      item-layout="vertical"
      bordered
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <div class="analysis-item__header">
            <b>{{ item.experienceType || '经验条目' }}</b>
            <UiTag v-if="item.frequency != null" tone="blue" size="sm">
              出现 {{ item.frequency }} 次
            </UiTag>
          </div>
          <a-typography-paragraph v-if="item.description" class="analysis-item__text">
            {{ item.description }}
          </a-typography-paragraph>
          <a-typography-paragraph v-if="item.scoringPattern" class="analysis-item__text">
            <strong>评分模式：</strong>{{ item.scoringPattern }}
          </a-typography-paragraph>
          <a-typography-paragraph v-if="item.applicableScenario" class="analysis-item__text">
            <strong>适用场景：</strong>{{ item.applicableScenario }}
          </a-typography-paragraph>
          <a-typography-paragraph v-if="item.riskNote" class="analysis-item__text">
            <strong>注意事项：</strong>{{ item.riskNote }}
          </a-typography-paragraph>
        </a-list-item>
      </template>
    </a-list>
    <template #footer>
      <a-space v-if="canConfirmExperience || canDeprecateExperience">
        <UiButton
          v-if="canConfirmExperience"
          :loading="confirmingExperience"
          @click="handleConfirmExperience"
        >
          确认沉淀
        </UiButton>
        <UiButton
          v-if="canDeprecateExperience"
          variant="outline"
          status="danger"
          :loading="deprecatingExperience"
          @click="handleDeprecateExperience"
        >
          废弃案例
        </UiButton>
      </a-space>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import type {
  AnswerClusterRecordResponse,
  ExperienceCaseStatusCode,
  GradingExperienceCaseResponse,
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
import Modal from 'ant-design-vue/es/modal'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import {
  AI_ANALYSIS_FLOW_HINT,
  AI_ANALYSIS_STATUS_TONE,
  AiAnalysisStatusDescription,
} from '@/apis/mark/ai-analysis-status'
import {
  confirmExperienceCase,
  deprecateExperienceCase,
  EXPERIENCE_ASSIST_CALIBRATION_HINT,
  EXPERIENCE_CASE_FLOW_HINT,
  EXPERIENCE_CASE_STATUS_TONE,
  ExperienceCaseStatusDescription,
  extractExperience,
  generateAnswerCluster,
  generateSignatures,
  getLatestAnswerCluster,
  listExperiences,
  listExperiencesByQuestion,
  listSignatures,
  searchSimilar,
} from '@/apis/mark/grading-experience'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
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

const signatures = ref<QuestionSignatureResponse[]>([])
const signaturesLoading = ref(false)
const generatingSignatures = ref(false)

const signatureColumns: ColumnType<QuestionSignatureResponse>[] = [
  { title: '题号', key: 'questionNo', width: 80 },
  { title: '题型', key: 'questionType', width: 100 },
  { title: '经验案例', key: 'experienceCount', width: 88, align: 'right' },
  { title: '题干摘要', key: 'questionDigest', width: 320 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const questionOptions = computed(() =>
  signatures.value.map((item) => ({
    label: `题号 ${item.questionNo} · ${questionTypeLabel(item.questionType)}`,
    value: item.layoutQuestionId,
  })),
)

const experienceFilterForm = reactive<{ layoutQuestionId?: string }>({})

function syncExperienceFilterForm(next: Record<string, unknown>): void {
  Object.assign(experienceFilterForm, next)
}

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

async function loadSignatures(): Promise<void> {
  if (!selectedExamId.value) return
  signaturesLoading.value = true
  loadFailed.value = false
  try {
    signatures.value = await listSignatures(selectedExamId.value)
  } catch (error) {
    signatures.value = []
    loadFailed.value = true
    showUserError(error, '题目特征加载失败')
  } finally {
    signaturesLoading.value = false
  }
}

async function handleGenerateSignatures(): Promise<void> {
  if (!selectedExamId.value) return
  generatingSignatures.value = true
  try {
    const result = await generateSignatures(selectedExamId.value)
    signatures.value = result
    message.success(`已生成 ${result.length} 条题目签名`)
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

const experiences = ref<GradingExperienceCaseResponse[]>([])
const experienceLoading = ref(false)
const extracting = ref(false)

const experienceSignalMetrics = computed((): SignalMetric[] => {
  const confirmedCount = experiences.value.filter((item) => item.caseStatus === 'CONFIRMED').length
  const pendingAnalysisCount = experiences.value.filter(
    (item) => item.analysisStatus === 'PENDING',
  ).length
  return [
    {
      key: 'signatures',
      label: '题目签名',
      value: signatures.value.length,
      unit: '条',
      tone: signatures.value.length > 0 ? 'blue' : 'gray',
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
      value: experiences.value.filter((item) => item.assistEligible).length,
      unit: '条',
      tone: experiences.value.some((item) => item.assistEligible) ? 'green' : 'gray',
    },
    {
      key: 'experiences',
      label: '经验案例',
      value: experiences.value.length,
      unit: '条',
      tone: experiences.value.length > 0 ? 'purple' : 'gray',
    },
  ]
})

const experienceColumns: ColumnType<GradingExperienceCaseResponse>[] = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 100 },
  { title: '题型', key: 'questionType', width: 100 },
  { title: 'AI 状态', key: 'analysisStatus', width: 100 },
  { title: '案例状态', key: 'caseStatus', width: 100 },
  { title: '定标', key: 'assistEligible', width: 88 },
  { title: '引用', key: 'reuseCount', width: 72, align: 'right' },
  { title: '经验总结', key: 'experienceSummary', width: 300 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 90, fixed: 'right' },
]

async function loadExperiences(): Promise<void> {
  if (!selectedExamId.value) return
  experienceLoading.value = true
  try {
    if (experienceFilterForm.layoutQuestionId) {
      experiences.value = await listExperiencesByQuestion({
        examId: selectedExamId.value,
        layoutQuestionId: experienceFilterForm.layoutQuestionId,
      })
    } else {
      experiences.value = await listExperiences(selectedExamId.value)
    }
  } catch (error) {
    experiences.value = []
    showUserError(error, '评分经验加载失败')
  } finally {
    experienceLoading.value = false
  }
}

async function handleExtract(): Promise<void> {
  if (!selectedExamId.value || !experienceFilterForm.layoutQuestionId) return
  extracting.value = true
  try {
    await extractExperience({
      examId: selectedExamId.value,
      layoutQuestionId: experienceFilterForm.layoutQuestionId,
    })
    message.success('AI 经验已提取')
    await loadExperiences()
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
    detailExperience.value?.caseStatus === 'DRAFT'
    && detailExperience.value?.analysisStatus === 'SUCCESS'
    && Boolean(detailExperience.value?.id),
)

const canDeprecateExperience = computed(
  () =>
    detailExperience.value?.caseStatus === 'CONFIRMED'
    && detailExperience.value?.analysisStatus === 'SUCCESS'
    && Boolean(detailExperience.value?.id),
)

async function handleConfirmExperience(): Promise<void> {
  const caseId = detailExperience.value?.id
  if (!caseId) return
  confirmingExperience.value = true
  try {
    detailExperience.value = await confirmExperienceCase(caseId)
    message.success('经验案例已确认，可用于有效性评估')
    await loadExperiences()
  } catch (error) {
    showUserError(error, '经验案例确认失败')
  } finally {
    confirmingExperience.value = false
  }
}

function handleDeprecateExperience(): void {
  const caseId = detailExperience.value?.id
  if (!caseId) return
  Modal.confirm({
    title: '确认废弃经验案例',
    content: '废弃后不可再用于有效性评估，历史评估记录仍保留。确认废弃？',
    okText: '废弃',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      deprecatingExperience.value = true
      try {
        detailExperience.value = await deprecateExperienceCase(caseId)
        message.success('经验案例已废弃')
        await loadExperiences()
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
  void loadExperiences()
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
  if (!selectedExamId.value || !clusterFilterForm.layoutQuestionId) return
  clustering.value = true
  try {
    latestCluster.value = await generateAnswerCluster({
      examId: selectedExamId.value,
      layoutQuestionId: clusterFilterForm.layoutQuestionId,
    })
    message.success('AI 答案聚类已完成')
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

function experienceCountForQuestion(layoutQuestionId: string): number {
  return experiences.value.filter((item) => item.layoutQuestionId === layoutQuestionId).length
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
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成耗时'
  if (item.analysisStatus === 'SUCCESS' && item.latencyMs != null) return `${item.latencyMs} ms`
  return '处理失败，未生成耗时'
}

function clusterTraceText(item: AnswerClusterRecordResponse): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成追踪编号'
  if (item.analysisStatus === 'SUCCESS') return item.aiTraceId ?? '—'
  return '处理失败，未生成追踪编号'
}

function clusterSummaryText(item: AnswerClusterRecordResponse): string {
  if (item.analysisStatus === 'PENDING') return 'AI 答案聚类待分析，完成后展示聚类总结'
  if (item.analysisStatus === 'SUCCESS') return item.clusterSummary ?? '—'
  return aiClusterFailureMessage(item.errorMessage)
}

function clusterGroupCountText(item: AnswerClusterRecordResponse): string {
  if (item.analysisStatus === 'PENDING') return '待分析'
  if (item.analysisStatus === 'SUCCESS' && item.groupCount != null) return String(item.groupCount)
  return '处理失败'
}

function experienceTraceText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成追踪编号'
  if (item.analysisStatus === 'SUCCESS') return item.aiTraceId ?? '—'
  return '处理失败，未生成追踪编号'
}

function experienceLatencyText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成耗时'
  if (item.analysisStatus === 'SUCCESS' && item.latencyMs != null) return `${item.latencyMs} ms`
  return '处理失败，未生成耗时'
}

function experienceSummaryText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === 'PENDING') return 'AI 阅卷经验提炼待分析，完成后展示经验总结'
  if (item.analysisStatus === 'SUCCESS') return item.experienceSummary ?? '—'
  return gradingExperienceFailureMessage(item.errorMessage)
}

function experienceApplicableScopeText(item: GradingExperienceCaseResponse): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成适用边界'
  if (item.analysisStatus === 'SUCCESS') return item.applicableScope ?? '—'
  return '处理失败，未生成适用边界'
}

function aiClusterFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, 'AI 答案聚类未完成，请稍后重新生成')
}

function gradingExperienceFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(errorMessage, '阅卷经验提取未完成，请稍后重新提取')
}

async function loadPageSummary(): Promise<void> {
  if (!selectedExamId.value) return
  await Promise.all([loadSignatures(), loadExperiences()])
}

async function reloadActiveTab(): Promise<void> {
  if (!selectedExamId.value) return
  loadFailed.value = false
  if (activeTab.value === 'signature') {
    await loadPageSummary()
  } else if (activeTab.value === 'experience') {
    if (signatures.value.length === 0) {
      await loadSignatures()
    }
    await loadExperiences()
  } else if (activeTab.value === 'cluster') {
    if (signatures.value.length === 0) {
      await loadSignatures()
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
    signatures.value = []
    experiences.value = []
    latestCluster.value = null
    experienceFilterForm.layoutQuestionId = undefined
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
    padding: 60px 0;
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
    font-size: 12px;
    color: var(--c-text-4);
    white-space: nowrap;
  }

  &__cluster-meta {
    margin-bottom: 12px;
  }
}

.empty-block {
  margin-top: 80px;
}

.error-text {
  color: #d4380d;
  font-size: 12px;
}

.similar-digest {
  margin: 6px 0 0;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
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
    color: rgba(0, 0, 0, 0.55);
    font-size: 12px;
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
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}
</style>
