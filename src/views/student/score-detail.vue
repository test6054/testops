<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag v-if="detail?.finalScoreStatus" :tone="finalScoreStatusTone(detail)" size="sm">
            {{ finalScoreStatusLabel(detail) }}
          </UiTag>
          <UiTag v-else tone="gray" size="sm">未生成</UiTag>
          <UiTag v-if="detail?.reviewWindowStatus === 'ACTIVE'" tone="orange" size="sm">
            复核进行中
          </UiTag>
          <UiTag v-if="detail" tone="blue" size="sm">
            {{ detail.finalScoreStatus === 'PUBLISHED' ? formatPublishedTotalScore(detail) : '--' }}
            /
            {{ detail.finalScoreStatus === 'PUBLISHED' ? formatPublishedFullScore(detail) : '--' }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading" @click="loadDetail">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            v-if="detail && canSubmitReview(detail)"
            size="sm"
            @click="goAppeal(detail.examId)"
          >
            <template #icon><FormOutlined /></template>
            提交复核申请
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiErrorRetryPanel
      v-if="detailLoadError"
      :error="detailLoadError"
      title="成绩详情加载失败"
      :helper="detail?.examName ? `当前考试：${detail.examName}` : undefined"
      :show-report="false"
      @retry="loadDetail"
    />

    <UiEmpty
      v-else-if="!loading && !detail"
      description="未查询到该考试的成绩详情"
      class="score-detail__empty"
    />

    <template v-else-if="detail">
      <UiCard v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail__questions-card">
        <template #title>
          <BarChartOutlined />
          <span>题目得分明细</span>
          <UiBadge v-if="clusterLabelOptions.length > 0" tone="orange">
            错题聚类 {{ clusterLabelOptions.length }} 项
          </UiBadge>
        </template>
        <template #extra>
          <a-space>
            <a-select
              v-if="clusterLabelOptions.length > 0"
              v-model:value="selectedClusterLabel"
              class="score-detail__cluster-select"
              placeholder="按错题聚类筛选"
              :options="clusterLabelOptions"
              allow-clear
              size="middle"
            />
            <UiTag tone="green" size="sm">满分 {{ correctCount }} 题</UiTag>
            <UiTag tone="orange" size="sm">部分得分 {{ partialCount }} 题</UiTag>
            <UiTag tone="red" size="sm">零分 {{ zeroCount }} 题</UiTag>
          </a-space>
        </template>

        <UiEmpty v-if="detail.questions.length === 0" description="暂无题目得分明细" />
        <UiEmpty
          v-else-if="filteredQuestions.length === 0"
          :description="`当前错题聚类筛选下无题目：${selectedClusterLabel}`"
        />

        <a-table
          v-else
          :columns="questionColumns"
          :data-source="filteredQuestions"
          :pagination="false"
          row-key="questionTemplateId"
          size="middle"
          class="questions-table"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'questionNo'">
              <div class="question-no-cell">
                <UiTag tone="blue" size="sm">
                  {{ filteredQuestions[index].questionNo }}
                </UiTag>
                <UiTag
                  v-if="filteredQuestions[index].mistakeClusterLabel"
                  tone="orange"
                  size="sm"
                  class="question-no-cell__cluster"
                  @click.stop="setClusterFilter(filteredQuestions[index].mistakeClusterLabel)"
                >
                  {{ filteredQuestions[index].mistakeClusterLabel }}
                </UiTag>
              </div>
            </template>
            <template v-else-if="column.key === 'questionType'">
              <span>{{ filteredQuestions[index].questionType }}</span>
            </template>
            <template v-else-if="column.key === 'fullScore'">
              <span class="score-cell">
                {{ filteredQuestions[index].fullScore.toFixed(2) }}
              </span>
            </template>
            <template v-else-if="column.key === 'teacherReviewScore'">
              <span
                v-if="filteredQuestions[index].teacherReviewScore != null"
                class="score-cell score-cell--strong"
                :class="getScoreToneClass(filteredQuestions[index])"
              >
                {{ formatQuestionFinalScore(filteredQuestions[index]) }}
              </span>
              <span v-else class="score-detail__hint">-</span>
            </template>
            <template v-else-if="column.key === 'objectiveResult'">
              <UiTag
                v-if="filteredQuestions[index].objectiveResult"
                :tone="objectiveResultTone(filteredQuestions[index])"
                size="sm"
              >
                {{ objectiveResultLabel(filteredQuestions[index]) }}
              </UiTag>
              <span v-else class="score-detail__hint">-</span>
            </template>
            <template v-else-if="column.key === 'gradeStatus'">
              <UiTag :tone="getGradeStatusTone(filteredQuestions[index].gradeStatus)" size="sm">
                {{ formatGradeStatus(filteredQuestions[index].gradeStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <span
                  class="op-link"
                  role="button"
                  @click="openAnswerDrawer(filteredQuestions[index])"
                >
                  <ProfileOutlined />
                  查看答题
                </span>
                <span
                  v-if="canApplyReviewOnQuestion(filteredQuestions[index])"
                  class="op-link"
                  role="button"
                  @click="goAppealForQuestion(filteredQuestions[index])"
                >
                  申请复核
                </span>
              </div>
            </template>
          </template>
          <template #expandedRowRender="{ index }">
            <div v-if="filteredQuestions[index].improvementSuggestion" class="question-ai-tip">
              <UiTag tone="purple" size="sm">AI 学习内容</UiTag>
              <p class="question-ai-tip__text">
                {{ filteredQuestions[index].improvementSuggestion }}
              </p>
            </div>
            <UiEmpty v-else description="本题暂无 AI 学习内容" />
          </template>
        </a-table>
      </UiCard>

      <UiCard
        v-if="detail.finalScoreStatus === 'PUBLISHED'"
        class="score-detail__wrong-book-card"
      >
        <template #title>
          <ProfileOutlined />
          <span>错题本</span>
          <UiBadge tone="red">{{ wrongBookTotal }} 条</UiBadge>
        </template>
        <template #extra>
          <UiButton size="sm" variant="outline" :loading="wrongBookLoading" @click="loadWrongBook">
            刷新
          </UiButton>
        </template>
        <UiEmpty v-if="!wrongBookLoading && wrongBookRows.length === 0" description="暂无错题记录" />
        <a-table
          v-else
          :columns="wrongBookColumns"
          :data-source="wrongBookRows"
          :loading="wrongBookLoading"
          :pagination="wrongBookPagination"
          row-key="gradeResultId"
          size="middle"
          @change="handleWrongBookPageChange"
        >
          <template #bodyCell="{ column, record: item }">
            <template v-if="column.key === 'score'">
              {{ item.teacherReviewScore != null ? Number(item.teacherReviewScore).toFixed(2) : '--' }}
              / {{ Number(item.fullScore).toFixed(2) }}
            </template>
            <template v-else-if="column.key === 'gradeStatus'">
              <UiTag :tone="getGradeStatusTone(item.gradeStatus)" size="sm">
                {{ formatGradeStatus(item.gradeStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'objectiveResult'">
              <UiTag
                v-if="item.objectiveResult"
                :tone="strictEnumTone(OBJECTIVE_RESULT_TONE, item.objectiveResult, '客观判定')"
                size="sm"
              >
                {{ strictEnumLabel(OBJECTIVE_RESULT_LABEL, item.objectiveResult, '客观判定') }}
              </UiTag>
              <span v-else class="score-detail__hint">-</span>
            </template>
          </template>
        </a-table>
      </UiCard>

      <a-drawer
        v-model:open="drawerOpen"
        :title="drawerTitle"
        :width="640"
        placement="right"
        destroy-on-close
        @close="closeAnswerDrawer"
      >
        <a-spin :spinning="drawerLoading">
          <UiAlertStrip
            v-if="drawerError"
            tone="error"
            title="答题明细加载失败"
            :description="drawerError"
            dense
          />
          <UiEmpty v-else-if="!drawerLoading && !currentDetail" description="未加载到答题明细" />
          <div v-else-if="currentDetail" class="answer-drawer">
            <div class="answer-drawer__summary">
              <UiTag tone="blue" size="sm">第 {{ currentDetail.questionNo }} 题</UiTag>
              <UiTag tone="gray" size="sm">{{ currentDetail.questionType }}</UiTag>
              <UiTag tone="gray" size="sm">满分 {{ currentDetail.fullScore.toFixed(2) }}</UiTag>
              <UiTag :tone="getScoreTagTone(currentDetail)" size="sm">
                得分 {{ currentDetail.teacherReviewScore.toFixed(2) }}
              </UiTag>
              <UiTag
                v-if="currentDetail.objectiveResult"
                :tone="
                  strictEnumTone(OBJECTIVE_RESULT_TONE, currentDetail.objectiveResult, '客观判定')
                "
                size="sm"
              >
                {{
                  strictEnumLabel(OBJECTIVE_RESULT_LABEL, currentDetail.objectiveResult, '客观判定')
                }}
              </UiTag>
              <UiTag :tone="getGradeStatusTone(currentDetail.gradeStatus)" size="sm">
                {{ formatGradeStatus(currentDetail.gradeStatus) }}
              </UiTag>
            </div>

            <section class="answer-drawer__section">
              <header class="answer-drawer__section-title">
                <FileImageOutlined />
                <span>作答切片</span>
              </header>
              <UiEmpty
                v-if="!currentDetail.sliceFileId"
                description="该题暂无作答切片图（客观题或未生成切片）"
              />
              <div v-else class="answer-drawer__slice">
                <a-spin :spinning="sliceLoading" tip="加载切片中...">
                  <a-image
                    v-if="sliceImageUrl"
                    :src="sliceImageUrl"
                    :preview="{}"
                    class="answer-drawer__slice-img"
                  >
                    <template #previewMask>点击放大查看</template>
                  </a-image>
                  <UiEmpty v-else-if="!sliceLoading" description="切片加载失败" />
                </a-spin>
              </div>
            </section>

            <section class="answer-drawer__section">
              <header class="answer-drawer__section-title">
                <ProfileOutlined />
                <span>OCR 识别作答</span>
              </header>
              <UiEmpty v-if="!currentDetail.recognizedAnswer" description="本题未识别到作答文本" />
              <div v-else class="answer-drawer__text">{{ currentDetail.recognizedAnswer }}</div>
            </section>

            <section class="answer-drawer__section">
              <header class="answer-drawer__section-title">
                <FormOutlined />
                <span>教师评语</span>
              </header>
              <UiEmpty v-if="!currentDetail.commentText" description="教师未填写评语" />
              <div v-else class="answer-drawer__text">{{ currentDetail.commentText }}</div>
            </section>

            <section
              v-if="
                currentDetail.improvementSuggestion
                  || currentDetail.mistakeClusterLabel
                  || currentDetail.aiDiagnostic
              "
              class="answer-drawer__section"
            >
              <header class="answer-drawer__section-title">
                <BulbOutlined />
                <span>AI 学习内容</span>
              </header>
              <div class="answer-drawer__ai">
                <p v-if="currentDetail.improvementSuggestion" class="answer-drawer__ai-line">
                  <strong>改进内容：</strong>{{ currentDetail.improvementSuggestion }}
                </p>
                <p v-if="currentDetail.mistakeClusterLabel" class="answer-drawer__ai-line">
                  <strong>错题聚类：</strong>
                  <UiTag tone="orange" size="sm">{{ currentDetail.mistakeClusterLabel }}</UiTag>
                </p>
                <p v-if="currentDetail.aiDiagnostic" class="answer-drawer__ai-line">
                  <strong>AI 处理说明：</strong>{{ aiLearningDiagnosticText(currentDetail.aiDiagnostic) }}
                </p>
              </div>
            </section>
          </div>
        </a-spin>

        <template #footer>
          <div class="answer-drawer__footer">
            <UiButton size="md" variant="outline" @click="closeAnswerDrawer">关闭</UiButton>
            <UiButton
              v-if="currentDetailQuestion && canApplyReviewOnQuestion(currentDetailQuestion)"
              size="md"
              @click="goAppealForCurrentDetail"
            >
              <template #icon><FormOutlined /></template>
              对此题申请复核
            </UiButton>
          </div>
        </template>
      </a-drawer>

      <UiCard v-if="detail.finalScoreStatus === 'PUBLISHED'" class="score-detail__profile-card">
        <template #title>
          <BulbOutlined />
          <span>AI 学习报告</span>
          <UiBadge
            v-if="learningReport?.profileStatus"
            :tone="aiAnalysisStatusTone(learningReport.profileStatus)"
          >
            {{ aiAnalysisStatusLabel(learningReport.profileStatus) }}
          </UiBadge>
        </template>
        <template #extra>
          <UiButton
            size="sm"
            variant="outline"
            :loading="reportLoading"
            @click="loadLearningReport"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>

        <a-spin :spinning="reportLoading">
          <UiAlertStrip
            v-if="reportLoadError"
            tone="error"
            title="AI 学习报告加载失败"
            :description="reportLoadError"
            dense
          />
          <UiEmpty
            v-else-if="!reportLoading && !learningReport"
            description="尚未生成 AI 学习报告"
          />
          <UiAlertStrip
            v-else-if="learningReport && !learningReport.available"
            tone="warning"
            title="暂无可展示的 AI 学习内容"
            :description="unavailableLearningReportMessage(learningReport)"
            dense
          />
          <div v-else-if="learningReport" class="profile-block">
            <UiAlertStrip
              v-if="learningReport.profileMessage"
              tone="warning"
              title="个体学习内容提示"
              :description="learningReport.profileMessage"
              dense
            />
            <UiAlertStrip
              v-if="learningReport.clusterMessage"
              tone="warning"
              title="错题聚类提示"
              :description="learningReport.clusterMessage"
              dense
            />
            <p v-if="learningReport.overallSummary" class="profile-summary">
              <strong>整体表现：</strong>{{ learningReport.overallSummary }}
            </p>

            <div v-if="profileDiagnosisItems.length > 0" class="profile-section">
              <strong>知识掌握分析：</strong>
              <a-list size="small" :data-source="profileDiagnosisItems" bordered>
                <template #renderItem="{ item }">
                  <a-list-item>
                    <div class="diagnosis-item">
                      <div class="diagnosis-header">
                        <UiTag :tone="masteryTone(item.masteryLevel)" size="sm">
                          {{ masteryLabel(item.masteryLevel) }}
                        </UiTag>
                        <span class="diagnosis-type">{{ item.questionType }}</span>
                        <span class="diagnosis-rate">
                          得分率 {{ formatRate(item.scoreRate) }}
                        </span>
                      </div>
                      <div v-if="item.causeAnalysis" class="diagnosis-text">
                        <strong>原因分析：</strong>{{ item.causeAnalysis }}
                      </div>
                      <div v-if="item.suggestion" class="diagnosis-text">
                        <strong>改进内容：</strong>{{ item.suggestion }}
                      </div>
                      <div
                        v-if="item.lostQuestionNos && item.lostQuestionNos.length"
                        class="diagnosis-text"
                      >
                        <strong>失分题号：</strong>{{ item.lostQuestionNos.join(', ') }}
                      </div>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </div>

            <div v-if="profileSuggestions.length > 0" class="profile-section">
              <strong>个性化学习内容：</strong>
              <ol class="suggestion-list">
                <li v-for="(s, i) in profileSuggestions" :key="i">{{ s }}</li>
              </ol>
            </div>

            <div v-if="learningReport.errorClusterSummary" class="profile-section">
              <strong>错题聚类摘要：</strong>
              <p class="profile-summary">{{ learningReport.errorClusterSummary }}</p>
            </div>

            <div v-if="errorClusters.length > 0" class="profile-section">
              <strong>错题聚类：</strong>
              <a-list size="small" :data-source="errorClusters" bordered>
                <template #renderItem="{ item }">
                  <a-list-item>
                    <div class="diagnosis-item">
                      <div class="diagnosis-header">
                        <UiTag tone="orange" size="sm">{{ item.affectedCount }} 人次</UiTag>
                        <span class="diagnosis-type">{{ item.causeName }}</span>
                        <span class="diagnosis-rate">{{ item.questionType }}</span>
                      </div>
                      <div class="diagnosis-text">
                        <strong>错因说明：</strong>{{ item.causeDescription }}
                      </div>
                      <div class="diagnosis-text">
                        <strong>订正内容：</strong>{{ item.suggestion }}
                      </div>
                      <div v-if="item.typicalExamples.length" class="diagnosis-text">
                        <strong>典型表现：</strong>{{ item.typicalExamples.join('；') }}
                      </div>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </div>
        </a-spin>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type {
  StudentAiDiagnosisItemVO,
  StudentAiErrorClusterVO,
  StudentAiLearningReportVO,
  StudentQuestionAnswerDetailVO,
  StudentQuestionScoreVO,
  StudentScoreDetailVO,
} from '@/apis/mark/student-exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import {
  AI_ANALYSIS_STATUS_COLOR,
  AI_ANALYSIS_STATUS_LABEL,
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  getMyAiLearningReport,
  getMyQuestionAnswerDetail,
  getMyScoreDetail,
  GRADE_STATUS_LABEL,
  GRADE_STATUS_TONE,
  MASTERY_LEVEL_LABEL,
  MASTERY_LEVEL_TONE,
  OBJECTIVE_RESULT_LABEL,
  OBJECTIVE_RESULT_TONE,
} from '@/apis/mark/student-exam'
import type { StudentWrongBookItemVO } from '@/apis/mark/question-analysis'
import { pageStudentWrongBook } from '@/apis/mark/question-analysis'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { assertUserFacing } from '@/utils/contract-guard'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentScoreDetail' })

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detailLoadError = ref<Error | null>(null)
const detail = ref<StudentScoreDetailVO | null>(null)

const detailQuestions = computed<StudentQuestionScoreVO[]>(() => detail.value?.questions ?? [])

const wrongBookLoading = ref(false)
const wrongBookRows = ref<StudentWrongBookItemVO[]>([])
const wrongBookTotal = ref(0)
const wrongBookPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
})

const wrongBookColumns: ColumnType<StudentWrongBookItemVO>[] = [
  { title: '题目', dataIndex: 'questionTemplateId', key: 'questionTemplateId', width: 140 },
  { title: '得分', key: 'score', width: 120 },
  { title: '批改状态', key: 'gradeStatus', width: 110 },
  { title: '客观判定', key: 'objectiveResult', width: 110 },
  { title: '评语', dataIndex: 'commentText', key: 'commentText', ellipsis: true },
]

/** 当前选中的错题聚类标签，为 undefined 表示不过滤 */
const selectedClusterLabel = ref<string | undefined>(undefined)

/**
 * 从题目明细中提取所有出现过的 mistakeClusterLabel，供顶部下拉选择。
 * 学生可以按错题聚类快速查看同一类型的错题。
 */
const clusterLabelOptions = computed<Array<{ value: string, label: string }>>(() => {
  const labels = new Set<string>()
  for (const question of detailQuestions.value) {
    if (question.mistakeClusterLabel) {
      labels.add(question.mistakeClusterLabel)
    }
  }
  return Array.from(labels).map((label) => ({ value: label, label }))
})

/** 当前筛选后展示的题目集合，未选中聚类时返回全部 */
const filteredQuestions = computed<StudentQuestionScoreVO[]>(() => {
  if (!selectedClusterLabel.value) return detailQuestions.value
  return detailQuestions.value.filter(
    (question) => question.mistakeClusterLabel === selectedClusterLabel.value,
  )
})

/** 从题号单元格点击标签时完成筛选下钻，重复点击取消筛选 */
function setClusterFilter(label?: string): void {
  if (!label) return
  selectedClusterLabel.value = selectedClusterLabel.value === label ? undefined : label
}

const examId = computed<string | null>(() => {
  const value = route.params.examId
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return null
})

const questionColumns = computed(() => {
  const cols: ColumnType<StudentQuestionScoreVO>[] = [
    { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 100 },
    { title: '题型', key: 'questionType', dataIndex: 'questionType', width: 140 },
    {
      title: '满分',
      key: 'fullScore',
      dataIndex: 'fullScore',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '得分',
      key: 'teacherReviewScore',
      dataIndex: 'teacherReviewScore',
      width: 110,
      align: 'right' as const,
    },
    { title: '客观判定', key: 'objectiveResult', dataIndex: 'objectiveResult', width: 130 },
    { title: '批改状态', key: 'gradeStatus', dataIndex: 'gradeStatus' },
  ]
  if (detail.value?.finalScoreStatus === 'PUBLISHED') {
    cols.push({
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 200,
    })
  }
  return cols
})

const correctCount = computed(() => detailQuestions.value.filter(isFullMark).length)
const partialCount = computed(
  () => detailQuestions.value.filter((q) => isPartial(q) && !isFullMark(q) && !isZero(q)).length,
)
const zeroCount = computed(() => detailQuestions.value.filter(isZero).length)

function isFullMark(q: StudentQuestionScoreVO) {
  return q.teacherReviewScore != null && q.teacherReviewScore >= q.fullScore
}
function isZero(q: StudentQuestionScoreVO) {
  return q.teacherReviewScore != null && q.teacherReviewScore <= 0
}
function isPartial(q: StudentQuestionScoreVO) {
  return q.teacherReviewScore != null
}

function getScoreToneClass(record: StudentQuestionScoreVO): string {
  if (isFullMark(record)) return 'score-cell--full'
  if (isZero(record)) return 'score-cell--zero'
  return 'score-cell--partial'
}

function finalScoreStatusTone(item: StudentScoreDetailVO): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, item.finalScoreStatus, '最终成绩状态')
}

function finalScoreStatusLabel(item: StudentScoreDetailVO): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, item.finalScoreStatus, '最终成绩状态')
}

function formatGradeStatus(status: StudentQuestionScoreVO['gradeStatus']): string {
  return strictEnumLabel(GRADE_STATUS_LABEL, status, '题目批改状态')
}

function getGradeStatusTone(status: StudentQuestionScoreVO['gradeStatus']): BadgeTone {
  return strictEnumTone(GRADE_STATUS_TONE, status, '题目批改状态')
}

function formatQuestionFinalScore(question: StudentQuestionScoreVO): string {
  return question.teacherReviewScore.toFixed(2)
}

function objectiveResultLabel(question: StudentQuestionScoreVO): string {
  return strictEnumLabel(
    OBJECTIVE_RESULT_LABEL,
    question.objectiveResult as NonNullable<StudentQuestionScoreVO['objectiveResult']>,
    '客观判定',
  )
}

function objectiveResultTone(question: StudentQuestionScoreVO): BadgeTone {
  return strictEnumTone(
    OBJECTIVE_RESULT_TONE,
    question.objectiveResult as NonNullable<StudentQuestionScoreVO['objectiveResult']>,
    '客观判定',
  )
}

function aiAnalysisStatusLabel(
  status: NonNullable<Awaited<ReturnType<typeof getMyAiLearningReport>>['profileStatus']>,
): string {
  return strictEnumLabel(AI_ANALYSIS_STATUS_LABEL, status, 'AI 学习报告状态')
}

function aiAnalysisStatusTone(
  status: NonNullable<Awaited<ReturnType<typeof getMyAiLearningReport>>['profileStatus']>,
): BadgeTone {
  return strictEnumTone(AI_ANALYSIS_STATUS_COLOR, status, 'AI 学习报告状态')
}

function formatPublishedTotalScore(item: StudentScoreDetailVO): string {
  return (item.totalScore as number).toFixed(2)
}

function formatPublishedFullScore(item: StudentScoreDetailVO): string {
  return (item.fullScore as number).toFixed(2)
}

async function loadWrongBook(): Promise<void> {
  if (!examId.value || detail.value?.finalScoreStatus !== 'PUBLISHED') {
    wrongBookRows.value = []
    wrongBookTotal.value = 0
    return
  }
  wrongBookLoading.value = true
  try {
    const result = await pageStudentWrongBook({
      examId: examId.value,
      wrongOnly: true,
      pageNum: wrongBookPagination.current,
      pageSize: wrongBookPagination.pageSize,
    })
    wrongBookRows.value = readPageList(result, '错题本加载失败，请稍后重试')
    wrongBookTotal.value = readPageTotal(result, '错题本加载失败，请稍后重试')
    wrongBookPagination.total = wrongBookTotal.value
  } catch (error) {
    showUserError(error, '错题本加载失败')
  } finally {
    wrongBookLoading.value = false
  }
}

function handleWrongBookPageChange(pagination: TablePaginationConfig): void {
  wrongBookPagination.current = pagination.current ?? 1
  wrongBookPagination.pageSize = pagination.pageSize ?? 10
  void loadWrongBook()
}

async function loadDetail() {
  if (!examId.value) {
    message.warning('考试信息缺失，无法加载成绩详情')
    return
  }
  loading.value = true
  detailLoadError.value = null
  try {
    const loadedDetail = await getMyScoreDetail(examId.value)
    validateScoreDetailContract(loadedDetail)
    detail.value = loadedDetail
    if (loadedDetail.finalScoreStatus === 'PUBLISHED') {
      wrongBookPagination.current = 1
      await loadWrongBook()
    }
  } catch (error) {
    detailLoadError.value = toUserError(error, '成绩详情加载失败')
    showUserError(error, '成绩详情加载失败')
    detail.value = null
  } finally {
    loading.value = false
  }
}

/** 校验已发布成绩详情的必需字段，避免题目表格渲染时整页崩溃。 */
function validateScoreDetailContract(item: StudentScoreDetailVO): void {
  if (item.finalScoreStatus !== 'PUBLISHED') return
  const dataError = '成绩详情数据异常，请刷新后重试'
  assertUserFacing(item.totalScore != null, dataError)
  assertUserFacing(item.fullScore != null, dataError)
  for (const question of item.questions) {
    assertUserFacing(question.teacherReviewScore != null, dataError)
  }
}

function goAppeal(id: string) {
  router.push({ name: 'StudentAppeal', query: { examId: id } })
}

function canApplyReviewOnQuestion(q: StudentQuestionScoreVO): boolean {
  if (!detail.value || !canSubmitReview(detail.value)) return false
  return q.teacherReviewScore < q.fullScore
}

function goAppealForQuestion(q: StudentQuestionScoreVO): void {
  if (!detail.value?.examId || !q.questionTemplateId) return
  router.push({
    name: 'StudentAppeal',
    query: {
      examId: detail.value.examId,
      questionId: q.questionTemplateId,
    },
  })
}

const learningReport = ref<Awaited<ReturnType<typeof getMyAiLearningReport>> | null>(null)
const reportLoading = ref(false)
const reportLoadError = ref('')

const profileDiagnosisItems = computed<StudentAiDiagnosisItemVO[]>(
  () => learningReport.value?.diagnosisItems ?? [],
)
const profileSuggestions = computed<string[]>(
  () => learningReport.value?.improvementSuggestions ?? [],
)
const errorClusters = computed<StudentAiErrorClusterVO[]>(
  () => learningReport.value?.errorClusters ?? [],
)

async function loadLearningReport(): Promise<void> {
  if (!detail.value || detail.value.finalScoreStatus !== 'PUBLISHED') {
    learningReport.value = null
    reportLoadError.value = ''
    return
  }
  if (!detail.value.examId) {
    learningReport.value = null
    reportLoadError.value = '成绩信息不完整，暂无法加载学习报告。'
    return
  }
  reportLoading.value = true
  reportLoadError.value = ''
  try {
    const report = await getMyAiLearningReport(detail.value.examId)
    validateLearningReportContract(report)
    learningReport.value = report
  } catch (error) {
    reportLoadError.value = getUserErrorMessage(error, 'AI 学习报告加载失败')
    learningReport.value = null
  } finally {
    reportLoading.value = false
  }
}

/** 校验 AI 学习报告不可用态必须返回原因，合同缺失进入报告错误态。 */
function validateLearningReportContract(report: StudentAiLearningReportVO): void {
  if (!report.available && !report.profileMessage && !report.clusterMessage) {
    assertUserFacing(false, 'AI 学习报告暂不可用，请稍后重试')
  }
}

function unavailableLearningReportMessage(report: StudentAiLearningReportVO): string {
  return (report.profileMessage || report.clusterMessage) as string
}

/** 将 AI 明细诊断转为学生侧学习提示，不暴露模型或接口内部细节。 */
function aiLearningDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    'AI 学习内容暂未形成可展示说明，请以教师评语和题目得分为准',
  )
}

function formatRate(rate: string): string {
  const value = Number(rate)
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

function masteryLabel(level: StudentAiDiagnosisItemVO['masteryLevel']): string {
  return strictEnumLabel(MASTERY_LEVEL_LABEL, level, '知识掌握等级')
}

function masteryTone(level: StudentAiDiagnosisItemVO['masteryLevel']): BadgeTone {
  return strictEnumTone(MASTERY_LEVEL_TONE, level, '知识掌握等级')
}

/**
 * 答题明细抽屉 — 学生在题目得分明细中点击"查看答题"后展示。
 *
 * 守门：
 * - 调用前要求 detail.value.finalScoreStatus === 'PUBLISHED'，否则后端 CONFLICT。
 * - 切片图通过 getImageBlobUrl 拉 blob URL，关闭抽屉或组件卸载时必须 URL.revokeObjectURL 释放。
 */
const drawerOpen = ref(false)
const drawerLoading = ref(false)
const drawerError = ref<string | null>(null)
const currentDetail = ref<StudentQuestionAnswerDetailVO | null>(null)
const currentDetailQuestion = ref<StudentQuestionScoreVO | null>(null)
const sliceImageUrl = ref<string | null>(null)
const sliceLoading = ref(false)

const drawerTitle = computed<string>(() => {
  const q = currentDetailQuestion.value
  if (!q) return '查看答题'
  return `第 ${q.questionNo} 题（${q.questionType}）— 满分 ${q.fullScore.toFixed(2)}`
})

async function openAnswerDrawer(question: StudentQuestionScoreVO): Promise<void> {
  if (!detail.value || detail.value.finalScoreStatus !== 'PUBLISHED') {
    message.warning('成绩尚未发布，暂不能查看答题明细')
    return
  }
  if (!detail.value.examId) {
    drawerError.value = '已发布成绩详情缺少考试信息。'
    return
  }
  drawerOpen.value = true
  drawerLoading.value = true
  drawerError.value = null
  currentDetail.value = null
  currentDetailQuestion.value = question
  releaseSliceImage()

  try {
    const result = await getMyQuestionAnswerDetail(detail.value.examId, question.questionTemplateId)
    currentDetail.value = result
    if (result.sliceFileId) {
      void loadSliceImage(result.sliceFileId)
    }
  } catch (error) {
    drawerError.value = getUserErrorMessage(error, '答题明细加载失败')
  } finally {
    drawerLoading.value = false
  }
}

function closeAnswerDrawer(): void {
  drawerOpen.value = false
  drawerLoading.value = false
  drawerError.value = null
  currentDetail.value = null
  currentDetailQuestion.value = null
  releaseSliceImage()
}

async function loadSliceImage(fileId: string): Promise<void> {
  releaseSliceImage()
  sliceLoading.value = true
  try {
    sliceImageUrl.value = await getImageBlobUrl(fileId)
  } catch (error) {
    showUserError(error, '答题切片加载失败')
  } finally {
    sliceLoading.value = false
  }
}

function releaseSliceImage(): void {
  if (sliceImageUrl.value) {
    URL.revokeObjectURL(sliceImageUrl.value)
    sliceImageUrl.value = null
  }
}

function goAppealForCurrentDetail(): void {
  if (!currentDetailQuestion.value) return
  goAppealForQuestion(currentDetailQuestion.value)
  closeAnswerDrawer()
}

/** 抽屉内得分标签的着色：满分绿，零分红，部分得分橙 */
function getScoreTagTone(answer: StudentQuestionAnswerDetailVO): BadgeTone {
  if (answer.teacherReviewScore >= answer.fullScore) return 'green'
  if (answer.teacherReviewScore <= 0) return 'red'
  return 'orange'
}

watch(examId, () => loadDetail())
watch(detail, () => {
  void loadLearningReport()
})
onMounted(loadDetail)
onBeforeUnmount(() => {
  releaseSliceImage()
})
</script>

<style lang="scss" scoped>
.score-detail {
  &__questions-card {
    margin-top: 8px;
  }

  &__empty {
    padding: 48px 0;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
  }
}

.questions-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--dp-surface-soft, #f8fafc);
    font-weight: 600;
  }
}

.score-cell {
  font-variant-numeric: tabular-nums;

  &--strong {
    font-weight: 700;
  }

  &--full {
    color: var(--ant-color-success, #16a34a);
  }

  &--partial {
    color: var(--ant-color-warning, #ea580c);
  }

  &--zero {
    color: var(--ant-color-error, #dc2626);
  }
}

.score-detail__cluster-select {
  min-width: 200px;
}

.question-no-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.question-no-cell__cluster {
  cursor: pointer;
}

.question-ai-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 4px;
}

.question-ai-tip__text {
  margin: 0;
  line-height: 1.7;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}

.score-detail__profile-card {
  margin-top: 16px;
}

.profile-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-summary {
  margin: 0;
  line-height: 1.7;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diagnosis-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.diagnosis-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagnosis-type {
  font-weight: 600;
}

.diagnosis-rate {
  margin-left: auto;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
}

.diagnosis-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.75));
}

.suggestion-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.7;
}

.answer-drawer {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px 20px 24px;

  &__summary {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px dashed var(--ant-color-border-secondary, #e5e7eb);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  }

  &__slice {
    border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
    border-radius: 6px;
    padding: 8px;
    background: var(--dp-surface-soft, #f8fafc);
    text-align: center;
    min-height: 120px;
  }

  &__slice-img {
    max-width: 100%;
    max-height: 480px;
    object-fit: contain;
  }

  &__text {
    margin: 0;
    padding: 12px;
    background: var(--dp-surface-soft, #f8fafc);
    border-radius: 6px;
    border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    line-height: 1.7;
    font-size: 13px;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  }

  &__ai {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: var(--dp-surface-soft, #f8fafc);
    border-radius: 6px;
    border: 1px solid var(--ant-color-border-secondary, #e5e7eb);
  }

  &__ai-line {
    margin: 0;
    line-height: 1.7;
    font-size: 13px;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
