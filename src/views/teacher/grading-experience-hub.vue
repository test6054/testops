<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="experience-page__context">
        <div class="experience-page__context-left">
          <a-select
            :value="selectedExamId"
            class="experience-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag v-if="signatures.length > 0" tone="blue" size="sm">
            签名 {{ signatures.length }}
          </UiTag>
          <UiTag v-if="experiences.length > 0" tone="green" size="sm">
            经验案例 {{ experiences.length }}
          </UiTag>
        </div>
      </div>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请先选择一场考试" class="experience-page__empty" />

    <a-tabs v-else v-model:active-key="activeTab">
      <!-- ─── Tab 1: 题目签名与相似题 ─── -->
      <a-tab-pane key="signature">
        <template #tab>
          <span><FileSearchOutlined /> 题目签名 / 相似题</span>
        </template>

        <UiCard class="info-card">
          <template #title>
            <span>考试题目签名</span>
            <UiBadge tone="blue">{{ signatures.length }}</UiBadge>
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

          <!-- D-9 错误态：题目签名加载失败时提供重试 + 上报入口 -->
          <UiErrorRetryPanel
            v-if="signaturesLoadError"
            :error="signaturesLoadError"
            title="题目签名加载失败"
            compact
            @retry="loadSignatures"
          />
          <UiDataTable
            v-else
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
                <UiButton size="sm" @click="openSimilarDrawer(signatures[index])">
                  查找相似题
                </UiButton>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>

      <!-- ─── Tab 2: AI 经验案例 ─── -->
      <a-tab-pane key="experience">
        <template #tab>
          <span><BulbOutlined /> AI 批改经验</span>
        </template>

        <UiCard class="info-card">
          <template #title>
            <span>批改经验案例</span>
            <UiBadge tone="green">{{ experiences.length }}</UiBadge>
          </template>
          <template #extra>
            <a-space>
              <a-input-search
                v-model:value="experienceQuestionFilter"
                placeholder="按题目模板ID 过滤"
                style="width: 220px"
                allow-clear
                @search="loadExperiences"
              />
              <UiButton
                size="sm"
                variant="outline"
                :loading="experienceLoading"
                @click="loadExperiences"
              >
                <template #icon><ReloadOutlined /></template>
                刷新
              </UiButton>
              <UiButton
                size="sm"
                :disabled="!experienceQuestionFilter.trim()"
                :loading="extracting"
                @click="handleExtract"
              >
                <template #icon><ThunderboltOutlined /></template>
                AI 提取经验
              </UiButton>
            </a-space>
          </template>

          <!-- D-9 错误态：AI 批改经验案例加载失败时提供重试 + 上报入口 -->
          <UiErrorRetryPanel
            v-if="experiencesLoadError"
            :error="experiencesLoadError"
            title="批改经验案例加载失败"
            compact
            @retry="loadExperiences"
          />
          <UiDataTable
            v-else
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
                <UiButton
                  size="sm"
                  variant="outline"
                  @click="openExperienceDrawer(experiences[index])"
                >
                  详情
                </UiButton>
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
            <UiBadge
              v-if="latestCluster"
              :tone="aiStatusTone(latestCluster.analysisStatus ?? 'PENDING')"
            >
              {{ aiStatusLabel(latestCluster.analysisStatus ?? 'PENDING') }}
            </UiBadge>
          </template>
          <template #extra>
            <a-space>
              <a-input
                v-model:value="clusterQuestionId"
                placeholder="题目模板ID"
                style="width: 200px"
              />
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!clusterQuestionId.trim()"
                :loading="clusterLoading"
                @click="loadLatestCluster"
              >
                <template #icon><ReloadOutlined /></template>
                查询最新
              </UiButton>
              <UiButton
                size="sm"
                :disabled="!clusterQuestionId.trim()"
                :loading="clustering"
                @click="handleGenerateCluster"
              >
                <template #icon><ThunderboltOutlined /></template>
                AI 聚类
              </UiButton>
            </a-space>
          </template>

          <!-- D-9 错误态：AI 答案聚类加载失败时提供重试 + 上报入口 -->
          <UiErrorRetryPanel
            v-if="clusterLoadError"
            :error="clusterLoadError"
            title="AI 答案聚类加载失败"
            compact
            @retry="loadLatestCluster"
          />
          <a-empty
            v-else-if="!latestCluster"
            description="尚无聚类结果，请先指定题目模板ID 并点击「AI 聚类」"
          />

          <template v-else>
            <a-descriptions :column="3" bordered size="small" style="margin-bottom: 12px">
              <a-descriptions-item label="分组数">
                <b>{{ latestCluster.groupCount ?? 0 }}</b>
              </a-descriptions-item>
              <a-descriptions-item label="分析状态">
                <UiTag :tone="aiStatusTone(latestCluster.analysisStatus ?? 'PENDING')" size="sm">
                  {{ aiStatusLabel(latestCluster.analysisStatus ?? 'PENDING') }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="耗时">
                {{ latestCluster.latencyMs ? `${latestCluster.latencyMs} ms` : '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="AI Trace ID" :span="3">
                {{ latestCluster.aiTraceId ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item v-if="latestCluster.errorMessage" label="错误" :span="3">
                <span class="error-text">{{ latestCluster.errorMessage }}</span>
              </a-descriptions-item>
              <a-descriptions-item label="聚类总结" :span="3">
                <pre class="json-pre">{{ latestCluster.clusterSummary || '（无）' }}</pre>
              </a-descriptions-item>
              <a-descriptions-item label="分组明细 JSON" :span="3">
                <pre class="json-pre">{{ latestCluster.answerGroups || '（无）' }}</pre>
              </a-descriptions-item>
            </a-descriptions>
          </template>
        </UiCard>
      </a-tab-pane>
    </a-tabs>
  </StageWorkbenchShell>

  <!-- 相似题抽屉 -->
  <a-drawer
    v-model:open="similarDrawerOpen"
    :title="`相似题检索 - 题目 #${similarSourceQuestionId ?? ''}`"
    width="640"
    :destroy-on-close="true"
  >
    <a-spin :spinning="similarLoading">
      <a-empty v-if="!similarLoading && similarResults.length === 0" description="未检索到相似题" />
      <a-list v-else :data-source="similarResults" item-layout="vertical">
        <template #renderItem="{ item }: { item: QuestionSignatureVO }">
          <a-list-item>
            <a-space size="small">
              <UiTag tone="blue" size="sm">考试 #{{ item.examId }}</UiTag>
              <UiTag tone="blue" size="sm">
                {{ questionTypeLabel(item.questionType) }}
              </UiTag>
              <UiTag tone="gray" size="sm">题号 {{ item.questionNo ?? '-' }}</UiTag>
            </a-space>
            <p class="similar-digest">{{ item.questionDigest ?? '（无摘要）' }}</p>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>
  </a-drawer>

  <!-- 经验案例详情抽屉 -->
  <a-drawer
    v-model:open="experienceDrawerOpen"
    title="批改经验详情"
    width="720"
    :destroy-on-close="true"
  >
    <a-descriptions v-if="detailExperience" :column="1" bordered size="small">
      <a-descriptions-item label="ID">{{ detailExperience.id }}</a-descriptions-item>
      <a-descriptions-item label="来源考试">
        {{ detailExperience.sourceExamId }}
      </a-descriptions-item>
      <a-descriptions-item label="题目模板">
        {{ detailExperience.questionTemplateId }}
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
      <a-descriptions-item label="AI Trace">
        {{ detailExperience.aiTraceId ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="耗时">
        {{ detailExperience.latencyMs ? `${detailExperience.latencyMs} ms` : '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="经验总结">
        <pre class="json-pre">{{ detailExperience.experienceSummary || '（无）' }}</pre>
      </a-descriptions-item>
      <a-descriptions-item label="结构化条目 JSON">
        <pre class="json-pre">{{ detailExperience.experienceItems || '（无）' }}</pre>
      </a-descriptions-item>
      <a-descriptions-item label="风险标签">
        <pre class="json-pre">{{ detailExperience.riskTags || '（无）' }}</pre>
      </a-descriptions-item>
      <a-descriptions-item label="适用边界">
        {{ detailExperience.applicableScope ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item v-if="detailExperience.errorMessage" label="错误信息">
        <span class="error-text">{{ detailExperience.errorMessage }}</span>
      </a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  AiAnalysisStatusCode,
  AnswerClusterRecordVO,
  ExperienceCaseStatusCode,
  GradingExperienceCaseVO,
  QuestionSignatureVO,
  QuestionTypeCode,
} from '@/apis/mark/grading-experience'
import {
  AI_ANALYSIS_STATUS_COLOR,
  AI_ANALYSIS_STATUS_LABEL,
  EXPERIENCE_CASE_STATUS_COLOR,
  EXPERIENCE_CASE_STATUS_LABEL,
  extractExperience,
  generateAnswerCluster,
  generateSignatures,
  getLatestAnswerCluster,
  listExperiences,
  listExperiencesByQuestion,
  listSignatures,
  QUESTION_TYPE_LABEL,
  searchSimilar,
} from '@/apis/mark/grading-experience'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import PartitionOutlined from '@ant-design/icons-vue/PartitionOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { onMounted, ref, watch } from 'vue'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'TeacherGradingExperienceHub' })

// B-8 统一考试选择器
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const activeTab = ref<'signature' | 'experience' | 'cluster'>('signature')

// ─── 题目签名 ─────────────────────────────────

const signatures = ref<QuestionSignatureVO[]>([])
const signaturesLoading = ref(false)
const generatingSignatures = ref(false)

const signatureColumns: ColumnType<QuestionSignatureVO>[] = [
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 80 },
  { title: '题型', key: 'questionType', width: 100 },
  { title: '题目模板ID', key: 'questionTemplateId', dataIndex: 'questionTemplateId', width: 120 },
  { title: '题干摘要', key: 'questionDigest', width: 320 },
  { title: 'SimHash', key: 'signatureSimhash', dataIndex: 'signatureSimhash', width: 200 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

// D-9 错误态：三个标签页各自加载失败时由 UiErrorRetryPanel 重试 + 上报
const signaturesLoadError = ref<unknown>(null)
const experiencesLoadError = ref<unknown>(null)

async function loadSignatures(): Promise<void> {
  if (!selectedExamId.value) return
  signaturesLoading.value = true
  signaturesLoadError.value = null
  try {
    signatures.value = await listSignatures(selectedExamId.value)
  } catch (error) {
    signaturesLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载题目签名失败')
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
  } catch (error) {
    message.error(error instanceof Error ? error.message : '生成签名失败')
  } finally {
    generatingSignatures.value = false
  }
}

// ─── 相似题抽屉 ─────────────────────────────────

const similarDrawerOpen = ref(false)
const similarLoading = ref(false)
const similarResults = ref<QuestionSignatureVO[]>([])
const similarSourceQuestionId = ref<string | undefined>(undefined)

async function openSimilarDrawer(record: QuestionSignatureVO): Promise<void> {
  if (!selectedExamId.value) return
  similarSourceQuestionId.value = record.questionTemplateId
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
    message.error(error instanceof Error ? error.message : '检索相似题失败')
  } finally {
    similarLoading.value = false
  }
}

// ─── AI 经验提取 ─────────────────────────────────

const experiences = ref<GradingExperienceCaseVO[]>([])
const experienceLoading = ref(false)
const extracting = ref(false)
const experienceQuestionFilter = ref('')

const experienceColumns: ColumnType<GradingExperienceCaseVO>[] = [
  { title: 'ID', key: 'id', dataIndex: 'id', width: 100 },
  { title: '题目模板', key: 'questionTemplateId', dataIndex: 'questionTemplateId', width: 120 },
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
  experiencesLoadError.value = null
  try {
    if (experienceQuestionFilter.value.trim()) {
      experiences.value = await listExperiencesByQuestion(
        selectedExamId.value,
        experienceQuestionFilter.value.trim(),
      )
    } else {
      experiences.value = await listExperiences(selectedExamId.value)
    }
  } catch (error) {
    experiencesLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载经验案例失败')
  } finally {
    experienceLoading.value = false
  }
}

async function handleExtract(): Promise<void> {
  if (!selectedExamId.value || !experienceQuestionFilter.value.trim()) return
  extracting.value = true
  try {
    await extractExperience(selectedExamId.value, experienceQuestionFilter.value.trim())
    message.success('AI 经验已提取')
    await loadExperiences()
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'AI 提取经验失败')
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

// ─── AI 答案聚类 ─────────────────────────────────

const clusterQuestionId = ref('')
const latestCluster = ref<AnswerClusterRecordVO | null>(null)
const clusterLoading = ref(false)
const clustering = ref(false)
// D-9 错误态：AI 答案聚类加载失败时 UiErrorRetryPanel 重试 + 上报
const clusterLoadError = ref<unknown>(null)

async function loadLatestCluster(): Promise<void> {
  if (!selectedExamId.value || !clusterQuestionId.value.trim()) return
  clusterLoading.value = true
  clusterLoadError.value = null
  try {
    latestCluster.value = await getLatestAnswerCluster(
      selectedExamId.value,
      clusterQuestionId.value.trim(),
    )
  } catch (error) {
    clusterLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载聚类结果失败')
  } finally {
    clusterLoading.value = false
  }
}

async function handleGenerateCluster(): Promise<void> {
  if (!selectedExamId.value || !clusterQuestionId.value.trim()) return
  clustering.value = true
  try {
    latestCluster.value = await generateAnswerCluster(
      selectedExamId.value,
      clusterQuestionId.value.trim(),
    )
    message.success('AI 答案聚类已完成')
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'AI 答案聚类失败')
  } finally {
    clustering.value = false
  }
}

// ─── 共用 ─────────────────────────────────

// helper 严格只接受后端枚举类型，返回与 UiTag tone 一致的 BadgeTone，零 as 断言。
function aiStatusTone(status?: AiAnalysisStatusCode): BadgeTone {
  if (!status) return 'gray'
  return AI_ANALYSIS_STATUS_COLOR[status] ?? 'gray'
}

function caseStatusTone(status?: ExperienceCaseStatusCode): BadgeTone {
  if (!status) return 'gray'
  return EXPERIENCE_CASE_STATUS_COLOR[status] ?? 'gray'
}

function aiStatusLabel(status?: AiAnalysisStatusCode): string {
  if (!status) return '-'
  return AI_ANALYSIS_STATUS_LABEL[status] ?? status
}

function caseStatusLabel(status?: ExperienceCaseStatusCode): string {
  if (!status) return '-'
  return EXPERIENCE_CASE_STATUS_LABEL[status] ?? status
}

function questionTypeLabel(value?: QuestionTypeCode): string {
  if (!value) return '-'
  return QUESTION_TYPE_LABEL[value] ?? value
}

function ellipsis(text: string | undefined, len = 60): string {
  if (!text) return '-'
  return text.length > len ? `${text.slice(0, len)}…` : text
}

function handleExamChange(value: unknown, option: unknown): void {
  onExamChange(value as never, option as never)
  signatures.value = []
  experiences.value = []
  latestCluster.value = null
  if (selectedExamId.value) {
    void reloadActiveTab()
  }
}

async function reloadActiveTab(): Promise<void> {
  if (!selectedExamId.value) return
  if (activeTab.value === 'signature') await loadSignatures()
  else if (activeTab.value === 'experience') await loadExperiences()
}

watch(activeTab, () => {
  void reloadActiveTab()
})

// B-8: selectedExamId 由 useMarkExamSelector 与 URL 双向同步
watch(selectedExamId, (value) => {
  signatures.value = []
  experiences.value = []
  latestCluster.value = null
  if (value) {
    void reloadActiveTab()
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await reloadActiveTab()
  }
})
</script>

<style lang="scss" scoped>
.experience-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

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

.json-pre {
  background: rgba(0, 0, 0, 0.03);
  padding: 8px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
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
</style>
