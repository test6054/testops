<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag v-if="signatures.length > 0" tone="blue" size="sm">
            签名 {{ signatures.length }}
          </UiTag>
          <UiTag v-if="experiences.length > 0" tone="green" size="sm">
            经验案例 {{ experiences.length }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" class="experience-page__empty" />

    <a-tabs v-else v-model:active-key="activeTab">
      <!-- ─── Tab 1: 题目签名与相似题 ─── -->
      <a-tab-pane key="signature">
        <template #tab>
          <span><FileSearchOutlined /> 题目签名 / 相似题</span>
        </template>

        <UiCard class="info-card">
          <template #title>
            <span>考试题目签名</span>
          </template>
          <template #extra>
            <a-space>
              <UiButton
                size="sm"
                variant="outline"
                :loading="signaturesLoading"
                @click="loadSignatures"
              >
                <template #icon><ReloadOutlined /></template>
                刷新
              </UiButton>
              <UiButton size="sm" :loading="generatingSignatures" @click="handleGenerateSignatures">
                <template #icon><ThunderboltOutlined /></template>
                生成 / 重算签名
              </UiButton>
            </a-space>
          </template>



          <UiDataTable
            pagination-mode="client"
            class="student-detail-table__data-table"
            :columns="signatureColumns"
            :data-source="signatures"
            :loading="signaturesLoading"
            flat
            :total="signatures.length"
            :page-size="20"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'questionType'">
                {{ questionTypeLabel(signatures[index].questionType) }}
              </template>
              <template v-else-if="column.key === 'questionDigest'">
                <a-tooltip :title="signatures[index].questionDigest">
                  <span>{{ ellipsis(signatures[index].questionDigest, 60) }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction @click="openSimilarDrawer(signatures[index])">
                    查找相似题
                  </UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>

      <!-- ─── Tab 2: AI 经验案例 ─── -->
      <a-tab-pane key="experience">
        <template #tab>
          <span><BulbOutlined /> AI 阅卷经验</span>
        </template>

        <UiCard class="info-card">
          <template #title>
            <span class="section-title">阅卷经验案例</span>
          </template>
          <template #extra>
            <UiButton
              size="sm"
              :disabled="!experienceFilterForm.questionTemplateId"
              :loading="extracting"
              @click="handleExtract"
            >
              <template #icon><ThunderboltOutlined /></template>
              AI 提炼经验
            </UiButton>
          </template>

          <UiFilterBar
            :model-value="experienceFilterForm"
            :fields="experienceFilterFields"
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
            size="middle"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'questionType'">
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
              <template v-else-if="column.key === 'experienceSummary'">
                <a-tooltip :title="experiences[index].experienceSummary">
                  <span>{{ ellipsis(experiences[index].experienceSummary, 80) }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction @click="openExperienceDrawer(experiences[index])">详情</UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>

      <!-- ─── Tab 3: AI 答案聚类 ─── -->
      <a-tab-pane key="cluster">
        <template #tab>
          <span><PartitionOutlined /> AI 答案聚类</span>
        </template>

        <UiCard class="info-card">
          <template #title>
            <span>答案聚类</span>
            <UiBadge v-if="latestCluster" :tone="aiStatusTone(latestCluster.analysisStatus)">
              {{ aiStatusLabel(latestCluster.analysisStatus) }}
            </UiBadge>
          </template>
          <template #extra>
            <UiButton
              size="sm"
              :disabled="!clusterFilterForm.questionTemplateId"
              :loading="clustering"
              @click="handleGenerateCluster"
            >
              <template #icon><ThunderboltOutlined /></template>
              AI 聚类
            </UiButton>
          </template>

          <UiFilterBar
            :model-value="clusterFilterForm"
            :fields="clusterFilterFields"
            search-text="查询最新"
            @update:model-value="syncClusterFilterForm"
            @search="loadLatestCluster"
            @reset="handleClusterFilterReset"
          />



          <UiEmpty
            v-if="!clusterLoading && !latestCluster"
            description="暂无数据"
          />

          <template v-else-if="latestCluster">
            <a-descriptions :column="3" bordered size="small" style="margin-bottom: 12px">
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
        </UiCard>
      </a-tab-pane>
    </a-tabs>
  </StageWorkbenchShell>

  <!-- 相似题抽屉 -->
  <a-drawer
    v-model:open="similarDrawerOpen"
    :title="`相似题检索 - ${similarSourceQuestionNo ? `题号 ${similarSourceQuestionNo}` : ''}`"
    width="640"
    :destroy-on-close="true"
  >
    <a-spin :spinning="similarLoading">
      <UiEmpty v-if="!similarLoading && similarResults.length === 0" description="暂无数据" />
      <a-list v-else :data-source="similarResults" item-layout="vertical">
        <template #renderItem="{ item }: { item: QuestionSignatureVO }">
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
    </a-spin>
  </a-drawer>

  <!-- 经验案例详情抽屉 -->
  <a-drawer
    v-model:open="experienceDrawerOpen"
    title="阅卷经验详情"
    width="720"
    :destroy-on-close="true"
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
  </a-drawer>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { AiAnalysisStatusCode } from '@/apis/mark/ai-analysis-status'
import type {
  AnswerClusterRecordVO,
  ExperienceCaseStatusCode,
  GradingExperienceCaseVO,
  QuestionSignatureVO,
} from '@/apis/mark/grading-experience'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import PartitionOutlined from '@ant-design/icons-vue/PartitionOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { AI_ANALYSIS_STATUS_LABEL, AI_ANALYSIS_STATUS_TONE } from '@/apis/mark/ai-analysis-status'
import {
  EXPERIENCE_CASE_STATUS_LABEL,
  EXPERIENCE_CASE_STATUS_TONE,
  extractExperience,
  generateAnswerCluster,
  generateSignatures,
  getLatestAnswerCluster,
  listExperiences,
  listExperiencesByQuestion,
  listSignatures,
  searchSimilar,
} from '@/apis/mark/grading-experience'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/question-type'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherGradingExperienceHub' })

// 考试工作台内由 useMarkExamContext 注入当前考试
const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const activeTab = ref<'signature' | 'experience' | 'cluster'>('signature')

// ─── 题目签名 ─────────────────────────────────

const signatures = ref<QuestionSignatureVO[]>([])
const signaturesLoading = ref(false)
const generatingSignatures = ref(false)

const signatureColumns: ColumnType<QuestionSignatureVO>[] = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 80 },
  { title: '题型', key: 'questionType', width: 100 },
  { title: '题干摘要', key: 'questionDigest', width: 320 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const questionOptions = computed(() =>
  signatures.value.map((item) => ({
    label: `题号 ${item.questionNo} · ${questionTypeLabel(item.questionType)}`,
    value: item.questionTemplateId,
  })),
)

const experienceFilterForm = reactive<{ questionTemplateId?: string }>({})

function syncExperienceFilterForm(next: Record<string, unknown>): void {
  Object.assign(experienceFilterForm, next)
}

const experienceFilterFields = computed<FilterField[]>(() => [
  {
    key: 'questionTemplateId',
    type: 'select',
    placeholder: '选择题目',
    width: 220,
    allowClear: true,
    allowSearch: true,
    options: questionOptions.value,
  },
])

const clusterFilterForm = reactive<{ questionTemplateId?: string }>({})

function syncClusterFilterForm(next: Record<string, unknown>): void {
  Object.assign(clusterFilterForm, next)
}

const clusterFilterFields = computed<FilterField[]>(() => [
  {
    key: 'questionTemplateId',
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
  try {
    signatures.value = await listSignatures(selectedExamId.value)
  } catch (error) {
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
const similarResults = ref<QuestionSignatureVO[]>([])
const similarSourceQuestionNo = ref<string | undefined>(undefined)

async function openSimilarDrawer(record: QuestionSignatureVO): Promise<void> {
  if (!selectedExamId.value) return
  similarSourceQuestionNo.value = record.questionNo
  similarDrawerOpen.value = true
  similarLoading.value = true
  similarResults.value = []
  try {
    similarResults.value = await searchSimilar({
      examId: selectedExamId.value,
      questionTemplateId: record.questionTemplateId,
      limit: 20,
    })
  } catch (error) {
    showUserError(error, '题目相似关系检索失败')
  } finally {
    similarLoading.value = false
  }
}

// ─── AI 经验提取 ─────────────────────────────────

const experiences = ref<GradingExperienceCaseVO[]>([])
const experienceLoading = ref(false)
const extracting = ref(false)

const experienceColumns: ColumnType<GradingExperienceCaseVO>[] = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 100 },
  { title: '题型', key: 'questionType', width: 100 },
  { title: 'AI 状态', key: 'analysisStatus', width: 100 },
  { title: '案例状态', key: 'caseStatus', width: 100 },
  { title: '经验总结', key: 'experienceSummary', width: 360 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 90, fixed: 'right' },
]

async function loadExperiences(): Promise<void> {
  if (!selectedExamId.value) return
  experienceLoading.value = true
  try {
    if (experienceFilterForm.questionTemplateId) {
      experiences.value = await listExperiencesByQuestion(
        selectedExamId.value,
        experienceFilterForm.questionTemplateId,
      )
    } else {
      experiences.value = await listExperiences(selectedExamId.value)
    }
  } catch (error) {
    showUserError(error, '评分经验加载失败')
  } finally {
    experienceLoading.value = false
  }
}

async function handleExtract(): Promise<void> {
  if (!selectedExamId.value || !experienceFilterForm.questionTemplateId) return
  extracting.value = true
  try {
    await extractExperience(selectedExamId.value, experienceFilterForm.questionTemplateId)
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
const detailExperience = ref<GradingExperienceCaseVO | null>(null)

function openExperienceDrawer(record: GradingExperienceCaseVO): void {
  detailExperience.value = record
  experienceDrawerOpen.value = true
}

function handleExperienceFilterReset(): void {
  experienceFilterForm.questionTemplateId = undefined
  void loadExperiences()
}

// ─── AI 答案聚类 ─────────────────────────────────

const latestCluster = ref<AnswerClusterRecordVO | null>(null)
const clusterLoading = ref(false)
const clustering = ref(false)

async function loadLatestCluster(): Promise<void> {
  if (!selectedExamId.value || !clusterFilterForm.questionTemplateId) return
  clusterLoading.value = true
  try {
    latestCluster.value = await getLatestAnswerCluster(
      selectedExamId.value,
      clusterFilterForm.questionTemplateId,
    )
  } catch (error) {
    showUserError(error, '错误簇加载失败')
  } finally {
    clusterLoading.value = false
  }
}

async function handleGenerateCluster(): Promise<void> {
  if (!selectedExamId.value || !clusterFilterForm.questionTemplateId) return
  clustering.value = true
  try {
    latestCluster.value = await generateAnswerCluster(
      selectedExamId.value,
      clusterFilterForm.questionTemplateId,
    )
    message.success('AI 答案聚类已完成')
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '答案聚类分析生成失败')
  } finally {
    clustering.value = false
  }
}

function handleClusterFilterReset(): void {
  clusterFilterForm.questionTemplateId = undefined
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
  return strictEnumLabel(AI_ANALYSIS_STATUS_LABEL, status, 'AI 分析状态')
}

function caseStatusLabel(status: ExperienceCaseStatusCode): string {
  return strictEnumLabel(EXPERIENCE_CASE_STATUS_LABEL, status, '经验案例状态')
}

function questionTypeLabel(value: QuestionTypeCode): string {
  return strictEnumLabel(QUESTION_TYPE_LABEL, value, '题型')
}

function ellipsis(
  text: QuestionSignatureVO['questionDigest'] | GradingExperienceCaseVO['experienceSummary'],
  len = 60,
): string {
  if (!text) return '-'
  return text.length > len ? `${text.slice(0, len)}…` : text
}

function clusterLatencyText(item: AnswerClusterRecordVO): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成耗时'
  if (item.analysisStatus === 'SUCCESS' && item.latencyMs != null) return `${item.latencyMs} ms`
  return '处理失败，未生成耗时'
}

function clusterTraceText(item: AnswerClusterRecordVO): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成追踪编号'
  if (item.analysisStatus === 'SUCCESS') return item.aiTraceId ?? '—'
  return '处理失败，未生成追踪编号'
}

function clusterSummaryText(item: AnswerClusterRecordVO): string {
  if (item.analysisStatus === 'PENDING') return 'AI 答案聚类待分析，完成后展示聚类总结'
  if (item.analysisStatus === 'SUCCESS') return item.clusterSummary ?? '—'
  return aiClusterFailureMessage(item.errorMessage)
}

function clusterGroupCountText(item: AnswerClusterRecordVO): string {
  if (item.analysisStatus === 'PENDING') return '待分析'
  if (item.analysisStatus === 'SUCCESS' && item.groupCount != null) return String(item.groupCount)
  return '处理失败'
}

function experienceTraceText(item: GradingExperienceCaseVO): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成追踪编号'
  if (item.analysisStatus === 'SUCCESS') return item.aiTraceId ?? '—'
  return '处理失败，未生成追踪编号'
}

function experienceLatencyText(item: GradingExperienceCaseVO): string {
  if (item.analysisStatus === 'PENDING') return '待分析，尚未生成耗时'
  if (item.analysisStatus === 'SUCCESS' && item.latencyMs != null) return `${item.latencyMs} ms`
  return '处理失败，未生成耗时'
}

function experienceSummaryText(item: GradingExperienceCaseVO): string {
  if (item.analysisStatus === 'PENDING') return 'AI 阅卷经验提炼待分析，完成后展示经验总结'
  if (item.analysisStatus === 'SUCCESS') return item.experienceSummary ?? '—'
  return gradingExperienceFailureMessage(item.errorMessage)
}

function experienceApplicableScopeText(item: GradingExperienceCaseVO): string {
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

async function reloadActiveTab(): Promise<void> {
  if (!selectedExamId.value) return
  if (activeTab.value === 'signature') {
    await loadSignatures()
  } else if (activeTab.value === 'experience') {
    if (signatures.value.length === 0) {
      await loadSignatures()
    }
    await loadExperiences()
  } else if (activeTab.value === 'cluster' && signatures.value.length === 0) {
    await loadSignatures()
  }
}

watch(activeTab, () => {
  void reloadActiveTab()
})

watch(selectedExamId, (value) => {
  signatures.value = []
  experiences.value = []
  latestCluster.value = null
  experienceFilterForm.questionTemplateId = undefined
  clusterFilterForm.questionTemplateId = undefined
  if (value) {
    void reloadActiveTab()
  }
}, { immediate: true })

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

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
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
