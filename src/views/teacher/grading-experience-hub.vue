<template>
  <GiPageLayout>
    <div class="experience-page">
      <PageHeader title="批改经验库">
        <template #tags>
          <UiTag v-if="signatures.length > 0" tone="blue" size="md">
            签名 {{ signatures.length }}
          </UiTag>
          <UiTag v-if="experiences.length > 0" tone="green" size="md">
            经验案例 {{ experiences.length }}
          </UiTag>
        </template>
        <template #actions>
          <a-select
            v-model:value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examOptionsLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
        </template>
      </PageHeader>

      <UiEmpty v-if="!selectedExamId" description="请先选择一场考试" class="empty-block" />

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
                <UiButton
                  size="sm"
                  :loading="generatingSignatures"
                  @click="handleGenerateSignatures"
                >
                  <template #icon><ThunderboltOutlined /></template>
                  生成 / 重算签名
                </UiButton>
              </a-space>
            </template>

            <a-alert
              type="info"
              show-icon
              message="签名说明"
              description="签名基于题干 + 标准答案 + 题型 + 结构特征生成 SHA-256 + SimHash 双签。SimHash 用于跨考试相似题汉明距离检索（≤ 16 视为语义相近）。每次「生成 / 重算」会覆盖该考试的全部签名记录。"
              style="margin-bottom: 12px"
            />

            <a-table
              :columns="signatureColumns"
              :data-source="signatures"
              :loading="signaturesLoading"
              :pagination="{ pageSize: 20, showSizeChanger: false }"
              row-key="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'questionType'">
                  {{
                    record.questionType
                      ? (QUESTION_TYPE_LABEL[record.questionType as QuestionTypeCode]
                        ?? record.questionType)
                      : '-'
                  }}
                </template>
                <template v-else-if="column.key === 'questionDigest'">
                  <a-tooltip :title="record.questionDigest">
                    <span>{{ ellipsis(record.questionDigest, 60) }}</span>
                  </a-tooltip>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiButton size="xs" @click="openSimilarDrawer(record)">查找相似题</UiButton>
                </template>
              </template>
            </a-table>
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

            <a-alert
              type="info"
              show-icon
              message="AI 经验提取说明"
              description="基于教师确认后的批改结果（含主观题逐题打分、评注、最终成绩），调用本租户默认 AI 模型提取共性经验。同一题目允许多次生成，每次结果作为独立历史记录保留。"
              style="margin-bottom: 12px"
            />

            <a-table
              :columns="experienceColumns"
              :data-source="experiences"
              :loading="experienceLoading"
              :pagination="{ pageSize: 20, showSizeChanger: false }"
              row-key="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'questionType'">
                  {{
                    record.questionType
                      ? (QUESTION_TYPE_LABEL[record.questionType as QuestionTypeCode]
                        ?? record.questionType)
                      : '-'
                  }}
                </template>
                <template v-else-if="column.key === 'analysisStatus'">
                  <UiTag :tone="aiStatusTone(record.analysisStatus)" size="sm">
                    {{
                      AI_ANALYSIS_STATUS_LABEL[record.analysisStatus as AiAnalysisStatusCode]
                        ?? record.analysisStatus
                    }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'caseStatus'">
                  <UiTag :tone="caseStatusTone(record.caseStatus)" size="sm">
                    {{
                      EXPERIENCE_CASE_STATUS_LABEL[record.caseStatus as ExperienceCaseStatusCode]
                        ?? record.caseStatus
                    }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'experienceSummary'">
                  <a-tooltip :title="record.experienceSummary">
                    <span>{{ ellipsis(record.experienceSummary, 80) }}</span>
                  </a-tooltip>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiButton size="xs" variant="outline" @click="openExperienceDrawer(record)">
                    详情
                  </UiButton>
                </template>
              </template>
            </a-table>
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
                {{ AI_ANALYSIS_STATUS_LABEL[latestCluster.analysisStatus ?? 'PENDING'] }}
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

            <a-alert
              type="info"
              show-icon
              message="答案聚类说明"
              description="对同一题目下教师已批改的答案文本进行 AI 聚类分组，便于发现相似错答模式。每次「AI 聚类」覆盖最近一次结果，同一题目最新结果由「查询最新」获取。"
              style="margin-bottom: 12px"
            />

            <a-empty
              v-if="!latestCluster"
              description="尚无聚类结果，请先指定题目模板ID 并点击「AI 聚类」"
            />

            <template v-else>
              <a-descriptions :column="3" bordered size="small" style="margin-bottom: 12px">
                <a-descriptions-item label="分组数">
                  <b>{{ latestCluster.groupCount ?? 0 }}</b>
                </a-descriptions-item>
                <a-descriptions-item label="分析状态">
                  <UiTag :tone="aiStatusTone(latestCluster.analysisStatus ?? 'PENDING')" size="sm">
                    {{ AI_ANALYSIS_STATUS_LABEL[latestCluster.analysisStatus ?? 'PENDING'] }}
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
    </div>

    <!-- 相似题抽屉 -->
    <a-drawer
      v-model:open="similarDrawerOpen"
      :title="`相似题检索 - 题目 #${similarSourceQuestionId ?? ''}`"
      width="640"
      :destroy-on-close="true"
    >
      <a-spin :spinning="similarLoading">
        <a-empty
          v-if="!similarLoading && similarResults.length === 0"
          description="未检索到相似题"
        />
        <a-list v-else :data-source="similarResults" item-layout="vertical">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-space size="small">
                <UiTag tone="blue" size="sm">考试 #{{ item.examId }}</UiTag>
                <UiTag tone="cyan" size="sm">
                  {{
                    item.questionType
                      ? QUESTION_TYPE_LABEL[item.questionType as QuestionTypeCode]
                      : '-'
                  }}
                </UiTag>
                <UiTag tone="default" size="sm">题号 {{ item.questionNo ?? '-' }}</UiTag>
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
          {{
            detailExperience.sourceExamId
          }}
        </a-descriptions-item>
        <a-descriptions-item label="题目模板">
          {{
            detailExperience.questionTemplateId
          }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <UiTag :tone="caseStatusTone(detailExperience.caseStatus)" size="sm">
            {{
              EXPERIENCE_CASE_STATUS_LABEL[
                detailExperience.caseStatus as ExperienceCaseStatusCode
              ] ?? detailExperience.caseStatus
            }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="AI 状态">
          <UiTag :tone="aiStatusTone(detailExperience.analysisStatus)" size="sm">
            {{
              AI_ANALYSIS_STATUS_LABEL[detailExperience.analysisStatus as AiAnalysisStatusCode]
                ?? detailExperience.analysisStatus
            }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="AI Trace">
          {{
            detailExperience.aiTraceId ?? '-'
          }}
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
          {{
            detailExperience.applicableScope ?? '-'
          }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detailExperience.errorMessage" label="错误信息">
          <span class="error-text">{{ detailExperience.errorMessage }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import type {
  AiAnalysisStatusCode,
  AnswerClusterRecordVO,
  ExperienceCaseStatusCode,
  GradingExperienceCaseVO,
  QuestionSignatureVO,
  QuestionTypeCode,
} from '@/apis/mark/grading-experience'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import PartitionOutlined from '@ant-design/icons-vue/PartitionOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pageExams } from '@/apis/mark/exam'
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
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherGradingExperienceHub' })

const route = useRoute()
const router = useRouter()

const selectedExamId = ref<string | undefined>(
  route.query.examId ? String(route.query.examId) : undefined,
)
const examOptions = ref<Array<{ label: string, value: string }>>([])
const examOptionsLoading = ref(false)
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

async function loadSignatures(): Promise<void> {
  if (!selectedExamId.value) return
  signaturesLoading.value = true
  try {
    signatures.value = await listSignatures(selectedExamId.value)
  } catch (error) {
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

async function loadLatestCluster(): Promise<void> {
  if (!selectedExamId.value || !clusterQuestionId.value.trim()) return
  clusterLoading.value = true
  try {
    latestCluster.value = await getLatestAnswerCluster(
      selectedExamId.value,
      clusterQuestionId.value.trim(),
    )
  } catch (error) {
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

function aiStatusTone(status?: AiAnalysisStatusCode | string): string {
  if (!status) return 'gray'
  return AI_ANALYSIS_STATUS_COLOR[status as AiAnalysisStatusCode] ?? 'gray'
}

function caseStatusTone(status?: ExperienceCaseStatusCode | string): string {
  if (!status) return 'gray'
  return EXPERIENCE_CASE_STATUS_COLOR[status as ExperienceCaseStatusCode] ?? 'gray'
}

function ellipsis(text: string | undefined, len = 60): string {
  if (!text) return '-'
  return text.length > len ? `${text.slice(0, len)}…` : text
}

async function loadExamOptions(): Promise<void> {
  examOptionsLoading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    examOptions.value = (result.list ?? []).map((item: ExamSummaryVO) => ({
      label: `${item.examName}（${item.statusMessage}）`,
      value: item.examId,
    }))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载考试列表失败')
  } finally {
    examOptionsLoading.value = false
  }
}

function handleExamChange(value: unknown): void {
  selectedExamId.value = value != null ? String(value) : undefined
  void router.replace({ query: selectedExamId.value ? { examId: selectedExamId.value } : {} })
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

onMounted(async () => {
  await loadExamOptions()
  if (selectedExamId.value) {
    await reloadActiveTab()
  }
})
</script>

<style lang="scss" scoped>
.experience-page {
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
