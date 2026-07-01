<template>
  <div v-if="selectedExamId" class="paper-template-page__toolbar">
    <div class="paper-template-page__toolbar-status">
      <UiTag :tone="pageCountMatched ? 'green' : 'orange'" size="sm">
        {{ pages.length }} / {{ totalPagesLabel }} 页
      </UiTag>
      <UiTag tone="blue" size="sm">
        {{ questions.length }} 题 · 总分 {{ totalScore }}
      </UiTag>
    </div>
    <UiButton
      size="sm"
      :loading="saving"
      :disabled="templateWriteLocked"
      :title="templateWriteLockReason || undefined"
      @click="handleSave"
    >
      <template #icon><SaveOutlined /></template>
      保存
    </UiButton>
    <UiConfirmPopover
      v-if="examDetail?.masterConfigured && !examDetail.layoutModeLocked"
      title="撤销试卷母版？"
      description="撤销后可重新编辑题目与标准答案；已同步页模板文件需自行核对。"
      danger
      @confirm="handleRevokeMaster"
    >
      <UiButton size="sm" variant="outline" :loading="revokingMaster">撤销母版</UiButton>
    </UiConfirmPopover>
    <UiButton
      v-else-if="examDetail?.masterConfigured && examDetail.layoutModeLocked"
      size="sm"
      variant="outline"
      disabled
      title="考试已生成印刷包或已开始扫描，无法撤销母版"
    >
      撤销母版
    </UiButton>
  </div>

  <UiEmpty
    v-if="!selectedExamId"
    description="请选择需要维护的考试"
    class="paper-template-page__empty"
  />



  <a-spin v-else :spinning="loading">
    <UiCard class="info-card">
      <template #title>
        <FileTextOutlined />
        <span>模板基本信息</span>
      </template>
      <a-form layout="inline">
        <a-form-item label="模板名称" required>
          <a-input
            v-model:value="form.templateName"
            placeholder="例如：2026 春《工程制图》期末 v1"
            :maxlength="100"
            :disabled="templateWriteLocked"
            style="width: 360px"
          />
        </a-form-item>
        <a-form-item label="总页数" required>
          <a-input-number
            v-model:value="form.totalPages"
            :min="1"
            :max="50"
            :disabled="templateWriteLocked"
            style="width: 120px"
          />
        </a-form-item>
      </a-form>
    </UiCard>

    <UiCard v-if="!isFullPaperLayout" class="info-card">
      <template #title>
        <FileImageOutlined />
        <span>页面文件配置</span>
        <UiBadge :tone="pageCountMatched ? 'green' : 'orange'">
          {{ pages.length }} / {{ totalPagesLabel }}
        </UiBadge>
      </template>
      <template #extra>
        <UiButton size="sm" variant="outline" :disabled="templateWriteLocked" @click="addPage">
          <template #icon>
            <PlusOutlined />
          </template>
          新增页面
        </UiButton>
      </template>

      <ExamTemplatePageTable
        ref="pageTableRef"
        v-model:pages="pages"
        :read-only="templateWriteLocked"
        @remove="removePage"
      />
    </UiCard>

    <UiCard class="info-card">
      <template #title>
        <ProfileOutlined />
        <span class="section-title">题目与标准答案</span>
      </template>
      <template #extra>
        <span class="paper-template__total-score">总分 {{ totalScore }}</span>
        <UiButton size="sm" :disabled="templateWriteLocked" @click="addQuestion">
          <template #icon>
            <PlusOutlined />
          </template>
          新增题目
        </UiButton>
      </template>

      <UiDataTable
        pagination-mode="none"
        class="student-detail-table__data-table"
        :columns="questionColumns"
        :data-source="questions"
        :show-pagination="false"
        flat
        :total="questions.length"
        row-key="rowKey"
        size="middle"
        bordered
        :scroll="{ x: 1100 }"
        v-model:expanded-row-keys="expandedQuestionRowKeys"
        @expand="handleQuestionExpand"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'questionNo'">
            <span class="question-cell__primary">{{ record.questionNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'questionType'">
            {{ questionTypeLabel(record.questionType) }}
          </template>
          <template v-else-if="column.key === 'fullScore'">
            {{ formatScore(record.fullScore) }}
          </template>
          <template v-else-if="column.key === 'questionStem'">
            <span v-if="record.questionStem" class="question-cell__stem">{{
              record.questionStem
            }}</span>
            <span v-else class="question-cell__muted">未录入</span>
          </template>
          <template v-else-if="column.key === 'region'">
            {{ formatQuestionRegion(record) }}
          </template>
          <template v-else-if="column.key === 'sortNo'">
            {{ record.sortNo ?? '—' }}
          </template>
          <template v-else-if="column.key === 'serverStatus'">
            <UiTag v-if="record.questionTemplateId" tone="green" size="sm">已存在</UiTag>
            <UiTag v-else tone="orange" size="sm">未保存</UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction :disabled="templateWriteLocked" @click="openQuestionEdit(index)">
                编辑
              </UiTextAction>
              <UiConfirmPopover
                v-if="record.questionTemplateId && !templateWriteLocked"
                title="确认删除该题目？"
                description="删除后需重新配置区域坐标与标准答案。"
                danger
                @confirm="removeQuestion(index)"
              >
                <UiTextAction tone="danger">删除</UiTextAction>
              </UiConfirmPopover>
              <UiTextAction
                v-else-if="!templateWriteLocked"
                tone="danger"
                @click="removeQuestion(index)"
              >
                删除
              </UiTextAction>
            </div>
          </template>
        </template>
        <template #expandedRowRender="{ record }">
          <div class="question-expand">
            <div class="question-expand__layout">
              <section class="question-expand__panel">
                <header class="question-expand__head">
                  <span class="question-expand__title">区域坐标</span>
                </header>
                <div v-if="hasQuestionRegion(record)" class="question-expand__meta">
                  <UiTag v-if="record.pageNo" tone="gray" size="sm">P{{ record.pageNo }}</UiTag>
                  <UiTag v-if="record.x != null && record.y != null" tone="gray" size="sm">
                    {{ record.x }}, {{ record.y }}
                  </UiTag>
                  <UiTag
                    v-if="record.width != null && record.height != null"
                    tone="gray"
                    size="sm"
                  >
                    {{ record.width }}×{{ record.height }}
                  </UiTag>
                </div>
                <span v-else class="question-cell__muted">未配置</span>
              </section>
              <section class="question-expand__panel question-expand__panel--answer">
                <header class="question-expand__head">
                  <span class="question-expand__title">标准答案</span>
                  <UiTextAction
                    v-if="record.questionTemplateId && !templateWriteLocked"
                    @click="openAnswerModal(record)"
                  >
                    编辑
                  </UiTextAction>
                  <span
                    v-else-if="record.questionTemplateId && templateWriteLocked"
                    class="question-cell__muted"
                  >
                    已锁定
                  </span>
                </header>
                <a-spin v-if="isAnswerPreviewLoading(record)" size="small" />
                <span v-else-if="!record.questionTemplateId" class="question-cell__muted">
                  保存模板后可配置
                </span>
                <div
                  v-else-if="getAnswerPreview(record)?.data"
                  class="question-expand__answer-body"
                >
                  <UiTag
                    v-if="getAnswerPreview(record)?.effectiveConfig?.effectiveStatus === 'ACTIVE'"
                    tone="green"
                    size="sm"
                  >
                    批改生效中
                  </UiTag>
                  <UiTag
                    v-else-if="getAnswerPreview(record)?.data?.effectiveStatus === 'DRAFT'"
                    tone="gray"
                    size="sm"
                  >
                    草稿未生效
                  </UiTag>
                  <UiTag
                    v-if="getAnswerPreview(record)?.data?.comparePolicy"
                    tone="blue"
                    size="sm"
                  >
                    {{ formatComparePolicy(getAnswerPreview(record)!.data!.comparePolicy!) }}
                  </UiTag>
                  <div
                    v-if="formatAnswerText(record, getAnswerPreview(record)!.data!)"
                    class="question-expand__answer-value"
                  >
                    {{ formatAnswerText(record, getAnswerPreview(record)!.data!) }}
                  </div>
                  <p
                    v-if="getAnswerPreview(record)?.data?.answerExplain"
                    class="question-expand__explain"
                  >
                    {{ getAnswerPreview(record)!.data!.answerExplain }}
                  </p>
                  <p v-if="getAnswerPreview(record)?.data?.aiHint" class="question-expand__hint">
                    {{ getAnswerPreview(record)!.data!.aiHint }}
                  </p>
                </div>
                <span v-else class="question-cell__muted">未配置标准答案</span>
              </section>
            </div>
          </div>
        </template>
      </UiDataTable>
    </UiCard>
  </a-spin>

  <a-modal
    v-model:open="answerModalOpen"
    title="录入标准答案"
    :confirm-loading="answerSaving || answerLoading"
    :destroy-on-close="true"
    :mask-closable="false"
    width="640px"
    @ok="handleSaveAnswer"
  >
    <a-spin :spinning="answerLoading">
      <a-form ref="answerFormRef" :model="answerForm" layout="vertical" :rules="answerFormRules">
        <a-form-item label="题号">
          <a-input :value="answerContext.questionNo" disabled />
        </a-form-item>
        <a-form-item label="题型">
          <a-input :value="answerContextQuestionTypeLabel" disabled />
        </a-form-item>
        <a-form-item
          v-if="answerContext.questionType === 'OBJECTIVE'"
          label="比较策略"
          name="comparePolicy"
        >
          <a-select
            v-model:value="answerForm.comparePolicy"
            :options="OBJECTIVE_COMPARE_POLICY_OPTIONS"
            placeholder="选择客观题评分策略（必选）"
            allow-clear
          />
        </a-form-item>
        <a-form-item
          v-if="
            answerContext.questionType === 'OBJECTIVE' && answerForm.comparePolicy === 'CHOICE_SET'
          "
          label="正确选项"
          name="choiceAnswers"
        >
          <a-checkbox-group
            v-if="answerChoiceOptions.length > 0"
            v-model:value="answerForm.choiceAnswers"
            :options="answerChoiceOptions"
            class="answer-choice-grid"
          />
        </a-form-item>
        <a-form-item
          v-if="
            answerContext.questionType === 'SUBJECTIVE'
              || answerForm.comparePolicy === 'EXACT_NORMALIZED'
              || answerForm.comparePolicy === 'REGEX'
          "
          :label="answerTextLabel"
          name="standardAnswer"
        >
          <a-textarea
            v-model:value="answerForm.standardAnswer"
            :rows="3"
            :maxlength="2000"
            :placeholder="answerTextPlaceholder"
            show-count
          />
        </a-form-item>
        <a-form-item label="答案解析">
          <a-textarea
            v-model:value="answerForm.answerExplain"
            :rows="3"
            :maxlength="1000"
            placeholder="供学生查看的解析说明（可选）"
          />
        </a-form-item>
        <a-form-item label="AI 评分提示">
          <a-textarea
            v-model:value="answerForm.aiHint"
            :rows="2"
            :maxlength="1000"
            placeholder="主观题给 AI 的额外评分提示（可选）"
          />
        </a-form-item>
        <a-form-item
          v-if="
            answerContext.questionType === 'OBJECTIVE'
              && answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          "
          label="标准值"
          name="numericExpectedValue"
        >
          <a-input
            v-model:value="answerForm.numericExpectedValue"
            :maxlength="100"
            placeholder="请输入数值题标准值"
          />
        </a-form-item>
        <a-form-item
          v-if="
            answerContext.questionType === 'OBJECTIVE'
              && answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          "
          label="容差"
          name="numericTolerance"
        >
          <a-input
            v-model:value="answerForm.numericTolerance"
            :maxlength="100"
            placeholder="请输入允许误差范围"
          />
        </a-form-item>
        <a-form-item
          v-if="
            answerContext.questionType === 'OBJECTIVE'
              && answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          "
          label="单位"
        >
          <a-input
            v-model:value="answerForm.numericUnit"
            :maxlength="100"
            placeholder="请输入单位，可留空"
          />
        </a-form-item>
        <a-form-item
          v-if="
            answerContext.questionType === 'OBJECTIVE' && answerForm.comparePolicy === 'AI_GRADE'
          "
          label="AI 评分细则"
          name="gradingRubric"
        >
          <a-textarea
            v-model:value="answerForm.gradingRubric"
            :rows="4"
            :maxlength="2000"
            placeholder="请录入 AI 评分细则，明确给分点、扣分点和判分边界"
            show-count
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="answerForm.effectiveNow">
            立即生效（取消勾选则保存为草稿状态）
          </a-checkbox>
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>

  <a-modal
    v-model:open="questionEditOpen"
    :title="questionEditIndex === null ? '新增题目' : '编辑题目'"
    :destroy-on-close="true"
    :mask-closable="false"
    width="640px"
    @ok="handleSaveQuestionEdit"
  >
    <a-form layout="vertical">
      <a-form-item label="题号" required>
        <a-input
          v-model:value="questionDraft.questionNo"
          placeholder="如 Q1 / 1.1"
          :maxlength="32"
        />
      </a-form-item>
      <a-form-item label="题型" required>
        <a-select v-model:value="questionDraft.questionType" :options="questionTypeOptions" />
      </a-form-item>
      <a-form-item label="满分" required>
        <a-input-number
          v-model:value="questionDraft.fullScore"
          :min="0"
          :step="0.5"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="题干">
        <a-textarea
          v-model:value="questionDraft.questionStem"
          :rows="4"
          :maxlength="4000"
          placeholder="完整题干（含选项、图表说明等）；保存模板后落库"
          show-count
        />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="页号">
            <a-input-number v-model:value="questionDraft.pageNo" :min="1" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="排序">
            <a-input-number v-model:value="questionDraft.sortNo" :min="1" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="X">
            <a-input-number v-model:value="questionDraft.x" :min="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Y">
            <a-input-number v-model:value="questionDraft.y" :min="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="宽">
            <a-input-number v-model:value="questionDraft.width" :min="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="高">
            <a-input-number v-model:value="questionDraft.height" :min="0" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamDetailVO,
  ExamMaterialLayoutModeCode,
} from '@/apis/mark/exam'
import type {
  ExamQuestionDeclaredOptionRequest,
  ExamQuestionStandardAnswerOptionRequest,
  ExamStandardAnswerVO,
  ObjectiveComparePolicyCode,
} from '@/apis/mark/exam-standard-answer'
import type {
  ExamPageTemplateRequest,
  ExamPaperPageTemplateVO,
  ExamQuestionTemplateRequest,
  ExamQuestionTemplateVO,
} from '@/apis/mark/exam-template'
import type { ExamAnswerEffectiveConfigVO } from '@/apis/mark/question-analysis'
import type { QuestionTypeCode } from '@/apis/mark/question-type'
import type { ExamTemplatePageRow } from '@/components/mark/ExamTemplatePageTable.vue'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  getExamDetail,
} from '@/apis/mark/exam'
import {
  getStandardAnswer,
  OBJECTIVE_COMPARE_POLICY_OPTIONS,
  saveStandardAnswer,
} from '@/apis/mark/exam-standard-answer'
import {
  getExamTemplate,
  saveExamTemplate,
} from '@/apis/mark/exam-template'
import { revokePaperMaster } from '@/apis/mark/paper-master'
import { confirmAnswerEffective, getEffectiveAnswerConfig } from '@/apis/mark/question-analysis'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/question-type'
import ExamTemplatePageTable from '@/components/mark/ExamTemplatePageTable.vue'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiConfirmPopover from '@/components/ui-guide/ui/UiConfirmPopover.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { hydrateTemplatePageFileNames } from '@/utils/mark-storage-file'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherPaperTemplate' })

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const pageTableRef = ref<InstanceType<typeof ExamTemplatePageTable> | null>(null)

interface QuestionRow {
  rowKey: string
  questionTemplateId?: string
  questionNo: string
  questionType: QuestionTypeCode
  fullScore?: number
  pageNo?: number
  x?: number
  y?: number
  width?: number
  height?: number
  sortNo?: number
  /** 题干文本：AI 评分上下文圈定。 */
  questionStem?: string
}

interface AnswerPreviewState {
  loading: boolean
  data: ExamStandardAnswerVO | null
  effectiveConfig: ExamAnswerEffectiveConfigVO | null
}

const questionTypeOptions = [
  { label: '客观题', value: 'OBJECTIVE' as const },
  { label: '主观题', value: 'SUBJECTIVE' as const },
]

function resolveQuestionType(value: string): QuestionTypeCode | null {
  if (value !== 'OBJECTIVE' && value !== 'SUBJECTIVE') {
    message.error('试卷题型数据异常，请刷新后重试')
    return null
  }
  return value
}

let rowSeq = 0
function nextRowKey(prefix: string): string {
  rowSeq += 1
  return `${prefix}-${rowSeq}-${Date.now()}`
}

const form = reactive<{ templateName: string, totalPages?: number }>({
  templateName: '',
  totalPages: undefined,
})
const pages = ref<ExamTemplatePageRow[]>([])
const questions = reactive<QuestionRow[]>([])
const expandedQuestionRowKeys = ref<string[]>([])
const answerPreviewMap = reactive(new Map<string, AnswerPreviewState>())

const loading = ref(false)
const saving = ref(false)
const revokingMaster = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const examDetail = ref<ExamDetailVO | null>(null)
const layoutMode = ref<ExamMaterialLayoutModeCode | undefined>()
const isFullPaperLayout = computed(() => layoutMode.value === 'FULL_PAPER')

/** 与后端 requireExamNotPrintedOrScanned 对齐，禁止前端继续编辑。 */
const templateWriteLocked = computed(() => {
  const detail = examDetail.value
  if (!detail) return false
  if (detail.status === 'CLOSED') return true
  return detail.layoutModeLocked === true
})

const templateWriteLockReason = computed(() => {
  const detail = examDetail.value
  if (!detail) return ''
  if (detail.status === 'CLOSED') return '考试已关闭，模板与标准答案不可再修改'
  if (detail.layoutModeLocked === true) {
    return '考试已开印或已开始扫描，模板与标准答案已锁定'
  }
  return ''
})

const totalScore = computed(() =>
  questions.reduce((sum, row) => sum + (Number(row.fullScore) || 0), 0).toFixed(2),
)
const totalPagesLabel = computed(() =>
  typeof form.totalPages === 'number' ? String(form.totalPages) : '未填写总页数',
)
const pageCountMatched = computed(
  () => typeof form.totalPages === 'number' && pages.value.length === form.totalPages,
)

const questionColumns: ColumnType<QuestionRow>[] = [
  { title: '题号', key: 'questionNo', width: 88, ellipsis: true },
  { title: '题型', key: 'questionType', width: 88 },
  { title: '满分', key: 'fullScore', width: 72 },
  { title: '题干', key: 'questionStem', ellipsis: true },
  { title: '区域', key: 'region', width: 120, ellipsis: true },
  { title: '排序', key: 'sortNo', width: 64 },
  { title: '状态', key: 'serverStatus', width: 88 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

function questionTypeLabel(type: QuestionTypeCode): string {
  return strictEnumLabel(QUESTION_TYPE_LABEL, type, '题型')
}

function formatScore(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(1).replace(/\.0$/, '')
}

function formatQuestionRegion(record: QuestionRow): string {
  const parts: string[] = []
  if (record.pageNo) parts.push(`P${record.pageNo}`)
  if (record.x != null && record.y != null) parts.push(`${record.x},${record.y}`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

function hasQuestionRegion(record: QuestionRow): boolean {
  return Boolean(
    record.pageNo
    || record.x != null
    || record.y != null
    || record.width != null
    || record.height != null,
  )
}

function formatComparePolicy(code: ObjectiveComparePolicyCode): string {
  const matched = OBJECTIVE_COMPARE_POLICY_OPTIONS.find((item) => item.value === code)
  return matched?.label ?? code
}

function formatAnswerText(record: QuestionRow, answer: ExamStandardAnswerVO): string {
  if (answer.comparePolicy === 'CHOICE_SET') {
    const labels = answer.choiceOptions.map((item) => item.optionLabel)
    return labels.length > 0 ? labels.join('、') : '—'
  }
  if (answer.comparePolicy === 'NUMERIC_TOLERANCE') {
    const parts = [answer.numericExpectedValue, answer.numericTolerance, answer.numericUnit].filter(
      (item) => item !== undefined && item !== null && String(item).trim() !== '',
    )
    return parts.length > 0 ? parts.join(' / ') : '—'
  }
  if (answer.comparePolicy === 'AI_GRADE') {
    return answer.gradingRubric?.trim() || 'AI 评分细则'
  }
  if (record.questionType === 'SUBJECTIVE') {
    return answer.standardAnswer?.trim() || '—'
  }
  return answer.standardAnswer?.trim() || '—'
}

function getAnswerPreview(record: QuestionRow): AnswerPreviewState | undefined {
  if (!record.questionTemplateId) return undefined
  return answerPreviewMap.get(record.questionTemplateId)
}

function isAnswerPreviewLoading(record: QuestionRow): boolean {
  return getAnswerPreview(record)?.loading === true
}

async function loadAnswerPreview(questionTemplateId: string): Promise<void> {
  if (!selectedExamId.value) return
  const cached = answerPreviewMap.get(questionTemplateId)
  if (cached && !cached.loading) return
  answerPreviewMap.set(questionTemplateId, { loading: true, data: null, effectiveConfig: null })
  try {
    const [data, effectiveConfig] = await Promise.all([
      getStandardAnswer({
        examId: selectedExamId.value,
        questionTemplateId,
      }),
      getEffectiveAnswerConfig({
        examId: selectedExamId.value,
        questionTemplateId,
      }),
    ])
    answerPreviewMap.set(questionTemplateId, { loading: false, data, effectiveConfig })
  } catch (error) {
    answerPreviewMap.set(questionTemplateId, { loading: false, data: null, effectiveConfig: null })
    showUserError(error, '标准答案加载失败')
  }
}

function handleQuestionExpand(expanded: boolean, record: QuestionRow): void {
  if (expanded) {
    if (!expandedQuestionRowKeys.value.includes(record.rowKey)) {
      expandedQuestionRowKeys.value = [...expandedQuestionRowKeys.value, record.rowKey]
    }
    if (record.questionTemplateId) {
      void loadAnswerPreview(record.questionTemplateId)
    }
    return
  }
  expandedQuestionRowKeys.value = expandedQuestionRowKeys.value.filter(
    (key) => key !== record.rowKey,
  )
}

function clearAnswerPreviewCache(): void {
  answerPreviewMap.clear()
  expandedQuestionRowKeys.value = []
}

function clearTemplate(): void {
  examDetail.value = null
  form.templateName = ''
  form.totalPages = undefined
  pages.value = []
  questions.splice(0, questions.length)
  clearAnswerPreviewCache()
}

async function applyTemplate(
  templateName: string,
  totalPages: number | undefined,
  pageList: ExamPaperPageTemplateVO[],
  questionList: ExamQuestionTemplateVO[],
): Promise<void> {
  form.templateName = templateName
  form.totalPages = totalPages
  pages.value = pageList.map((p) => ({
    rowKey: nextRowKey('p'),
    pageNo: p.pageNo,
    templateFileId: p.templateFileId,
    widthPx: p.widthPx,
    heightPx: p.heightPx,
  }))
  await hydrateTemplatePageFileNames(pages.value)
  questions.splice(0, questions.length)
  questionList.forEach((q) => {
    const questionType = resolveQuestionType(q.questionType)
    if (!questionType) return
    questions.push({
      rowKey: nextRowKey('q'),
      questionTemplateId: q.questionTemplateId,
      questionNo: q.questionNo,
      questionType,
      fullScore: typeof q.fullScore === 'number' ? q.fullScore : Number(q.fullScore),
      pageNo: q.pageNo,
      x: q.x,
      y: q.y,
      width: q.width,
      height: q.height,
      sortNo: q.sortNo,
      questionStem: q.questionStem,
    })
  })
}

function resetTemplateForm(): void {
  form.templateName = ''
  form.totalPages = undefined
  pages.value = []
  questions.splice(0, questions.length)
  clearAnswerPreviewCache()
}

async function loadTemplate(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  clearAnswerPreviewCache()
  try {
    const detail = await getExamDetail(selectedExamId.value)
    examDetail.value = detail
    layoutMode.value = detail.materialLayoutMode
    const tpl = await getExamTemplate(selectedExamId.value)
    if (!tpl.configured) {
      resetTemplateForm()
      return
    }
    await applyTemplate(
      tpl.templateName ?? '',
      tpl.totalPages,
      tpl.pages,
      tpl.questions,
    )
  } catch (error) {
    resetTemplateForm()
    showUserError(error, '试卷模板加载失败')
  } finally {
    loading.value = false
  }
}

function addPage(): void {
  if (templateWriteLocked.value) return
  const row: ExamTemplatePageRow = {
    rowKey: nextRowKey('p'),
    pageNo: pages.value.length + 1,
  }
  pages.value = [...pages.value, row]
  pageTableRef.value?.openEditForNew(row)
}

function removePage(index: number): void {
  if (templateWriteLocked.value) return
  pages.value = pages.value.filter((_, i) => i !== index)
}

function addQuestion(): void {
  if (templateWriteLocked.value) return
  questions.push({
    rowKey: nextRowKey('q'),
    questionNo: String(questions.length + 1),
    questionType: 'OBJECTIVE',
    fullScore: undefined,
    pageNo: undefined,
    sortNo: questions.length + 1,
    questionStem: undefined,
  })
  openQuestionEdit(questions.length - 1)
}

function removeQuestion(index: number): void {
  if (templateWriteLocked.value) return
  const row = questions[index]
  if (row?.questionTemplateId) {
    answerPreviewMap.delete(row.questionTemplateId)
  }
  expandedQuestionRowKeys.value = expandedQuestionRowKeys.value.filter((key) => key !== row?.rowKey)
  questions.splice(index, 1)
}

const questionEditOpen = ref(false)
const questionEditIndex = ref<number | null>(null)
const questionDraft = reactive<QuestionRow>({
  rowKey: '',
  questionNo: '',
  questionType: 'OBJECTIVE',
})

function resetQuestionDraft(row?: QuestionRow): void {
  questionDraft.rowKey = row?.rowKey ?? nextRowKey('q')
  questionDraft.questionTemplateId = row?.questionTemplateId
  questionDraft.questionNo = row?.questionNo ?? ''
  questionDraft.questionType = row?.questionType ?? 'OBJECTIVE'
  questionDraft.fullScore = row?.fullScore
  questionDraft.pageNo = row?.pageNo
  questionDraft.x = row?.x
  questionDraft.y = row?.y
  questionDraft.width = row?.width
  questionDraft.height = row?.height
  questionDraft.sortNo = row?.sortNo
  questionDraft.questionStem = row?.questionStem
}

function openQuestionEdit(index: number): void {
  if (templateWriteLocked.value) return
  if (index < 0 || index >= questions.length) return
  questionEditIndex.value = index
  resetQuestionDraft(questions[index])
  questionEditOpen.value = true
}

function validateQuestionDraft(): boolean {
  const no = questionDraft.questionNo.trim()
  if (!no) {
    message.error('题号必填')
    return false
  }
  const duplicate = questions.some(
    (row, idx) => idx !== questionEditIndex.value && row.questionNo.trim() === no,
  )
  if (duplicate) {
    message.error(`题号 ${no} 重复`)
    return false
  }
  if (questionDraft.fullScore === undefined || questionDraft.fullScore === null) {
    message.error('满分必填')
    return false
  }
  if (Number(questionDraft.fullScore) < 0) {
    message.error('满分不能为负')
    return false
  }
  if (!questionDraft.sortNo || questionDraft.sortNo <= 0) {
    message.error('排序号必填且大于 0')
    return false
  }
  const sortDuplicate = questions.some(
    (row, idx) => idx !== questionEditIndex.value && row.sortNo === questionDraft.sortNo,
  )
  if (sortDuplicate) {
    message.error(`排序号 ${questionDraft.sortNo} 重复`)
    return false
  }
  const stem = questionDraft.questionStem?.trim()
  if (stem && stem.length > 4000) {
    message.error('题干最多 4000 个字符')
    return false
  }
  return true
}

function handleSaveQuestionEdit(): void {
  const idx = questionEditIndex.value
  if (idx == null || idx < 0 || idx >= questions.length) {
    questionEditOpen.value = false
    return
  }
  if (!validateQuestionDraft()) return
  const stem = questionDraft.questionStem?.trim()
  Object.assign(questions[idx], {
    questionNo: questionDraft.questionNo.trim(),
    questionType: questionDraft.questionType,
    fullScore: questionDraft.fullScore,
    pageNo: questionDraft.pageNo,
    x: questionDraft.x,
    y: questionDraft.y,
    width: questionDraft.width,
    height: questionDraft.height,
    sortNo: questionDraft.sortNo,
    questionStem: stem || undefined,
  })
  questionEditOpen.value = false
  questionEditIndex.value = null
}

function buildPagesRequest(): ExamPageTemplateRequest[] | null {
  const total = form.totalPages
  if (typeof total !== 'number' || total <= 0) {
    message.error('请填写总页数')
    return null
  }
  if (pages.value.length !== total) {
    message.error(`页面数量必须等于总页数（当前 ${pages.value.length} / ${total}）`)
    return null
  }
  const seenPageNo = new Set<number>()
  const seenFileId = new Set<string>()
  const request: ExamPageTemplateRequest[] = []
  for (let i = 0; i < pages.value.length; i += 1) {
    const row = pages.value[i]
    if (!row.pageNo || row.pageNo <= 0) {
      message.error(`第 ${i + 1} 行：页号必填且大于 0`)
      return null
    }
    if (row.pageNo > total) {
      message.error(`第 ${i + 1} 行：页号不能超过总页数`)
      return null
    }
    if (seenPageNo.has(row.pageNo)) {
      message.error(`第 ${i + 1} 行：页号 ${row.pageNo} 重复`)
      return null
    }
    seenPageNo.add(row.pageNo)
    if (!row.templateFileId || !row.templateFileName?.trim()) {
      message.error(`第 ${i + 1} 行：请上传模板文件`)
      return null
    }
    if (seenFileId.has(row.templateFileId)) {
      message.error(`第 ${i + 1} 行：模板文件不可重复使用`)
      return null
    }
    seenFileId.add(row.templateFileId)
    if (!row.widthPx || row.widthPx <= 0) {
      message.error(`第 ${i + 1} 行：宽度像素必填且大于 0`)
      return null
    }
    if (!row.heightPx || row.heightPx <= 0) {
      message.error(`第 ${i + 1} 行：高度像素必填且大于 0`)
      return null
    }
    request.push({
      pageNo: row.pageNo,
      templateFileId: row.templateFileId,
      widthPx: row.widthPx,
      heightPx: row.heightPx,
    })
  }
  return request
}

function buildQuestionsRequest(): ExamQuestionTemplateRequest[] | null {
  if (questions.length === 0) {
    message.error('题目列表不能为空')
    return null
  }
  const seenNo = new Set<string>()
  const seenSort = new Set<number>()
  const request: ExamQuestionTemplateRequest[] = []
  for (let i = 0; i < questions.length; i += 1) {
    const row = questions[i]
    const no = row.questionNo.trim()
    if (!no) {
      message.error(`题目第 ${i + 1} 行：题号必填`)
      return null
    }
    if (seenNo.has(no)) {
      message.error(`题目第 ${i + 1} 行：题号 ${no} 重复`)
      return null
    }
    seenNo.add(no)
    if (row.fullScore === undefined || row.fullScore === null || Number.isNaN(row.fullScore)) {
      message.error(`题目第 ${i + 1} 行：满分必填`)
      return null
    }
    if (row.fullScore < 0) {
      message.error(`题目第 ${i + 1} 行：满分不能为负`)
      return null
    }
    if (!row.sortNo || row.sortNo <= 0) {
      message.error(`题目第 ${i + 1} 行：排序号必填且大于 0`)
      return null
    }
    if (seenSort.has(row.sortNo)) {
      message.error(`题目第 ${i + 1} 行：排序号 ${row.sortNo} 重复`)
      return null
    }
    seenSort.add(row.sortNo)
    request.push({
      questionNo: no,
      questionType: row.questionType,
      fullScore: row.fullScore,
      pageNo: row.pageNo ?? undefined,
      x: row.x ?? undefined,
      y: row.y ?? undefined,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      sortNo: row.sortNo,
      questionStem: row.questionStem?.trim() || undefined,
    })
  }
  return request
}

async function handleSave(): Promise<void> {
  if (!selectedExamId.value) return
  if (templateWriteLocked.value) {
    message.warning(templateWriteLockReason.value || '当前考试模板不可修改')
    return
  }
  const name = form.templateName.trim()
  if (!name) {
    message.error('模板名称必填')
    return
  }
  if (!form.totalPages || form.totalPages <= 0) {
    message.error('总页数必填且大于 0')
    return
  }
  const pagesRequest = buildPagesRequest()
  if (pagesRequest === null) return
  const questionsRequest = buildQuestionsRequest()
  if (questionsRequest === null) return

  saving.value = true
  try {
    await saveExamTemplate({
      examId: selectedExamId.value,
      templateName: name,
      totalPages: form.totalPages,
      pages: pagesRequest,
      questions: questionsRequest,
      subjectiveAnonymityMode: 'ANONYMOUS',
    })
    message.success('试卷模板已保存')
    await loadTemplate()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '试卷模板保存失败')
  } finally {
    saving.value = false
  }
}

interface AnswerContext {
  questionTemplateId?: string
  questionNo: string
  questionType: QuestionTypeCode | ''
}

const answerModalOpen = ref(false)
const answerSaving = ref(false)
const answerLoading = ref(false)
const answerFormRef = ref<FormInstance>()
const answerContext = reactive<AnswerContext>({
  questionTemplateId: undefined,
  questionNo: '',
  questionType: '',
})
const answerContextQuestionTypeLabel = computed(() => {
  if (!answerContext.questionType) return ''
  return strictEnumLabel(QUESTION_TYPE_LABEL, answerContext.questionType, '题型')
})
const answerForm = reactive<{
  standardAnswer: string
  choiceAnswers: string[]
  comparePolicy?: ObjectiveComparePolicyCode
  answerExplain?: string
  numericExpectedValue?: string
  numericTolerance?: string
  numericUnit?: string
  gradingRubric?: string
  aiHint?: string
  effectiveNow: boolean
}>({
  standardAnswer: '',
  choiceAnswers: [],
  comparePolicy: undefined,
  answerExplain: '',
  numericExpectedValue: '',
  numericTolerance: '',
  numericUnit: '',
  gradingRubric: '',
  aiHint: '',
  effectiveNow: true,
})

/**
 * 当前题目的正式声明选项空间，选择题集合策略必须从这里点选，避免标准答案与自动判分口径分叉。
 */
const answerChoiceOptions = computed(() => {
  if (!answerContext.questionTemplateId) return []
  const previewState = answerPreviewMap.get(answerContext.questionTemplateId)
  const declaredOptions = previewState?.data?.declaredOptions ?? []
  return declaredOptions
    .slice()
    .sort((left, right) => left.sortNo - right.sortNo)
    .map((option) => ({
      label: option.optionLabel,
      value: option.optionLabel,
    }))
})

const answerTextLabel = computed(() => {
  if (answerContext.questionType === 'SUBJECTIVE') return '参考答案要点'
  if (answerForm.comparePolicy === 'REGEX') return '答案匹配规则'
  return '规范答案文本'
})

const answerTextPlaceholder = computed(() => {
  if (answerContext.questionType === 'SUBJECTIVE') {
    return '录入老师给学生查看的参考答案要点，可按自然语言分行说明'
  }
  if (answerForm.comparePolicy === 'REGEX') {
    return '录入正则表达式，仅用于需要模式匹配的客观题'
  }
  return '录入可直接规范化比较的答案文本，例如填空题的标准词句'
})

const answerFormRules: Record<string, Rule[]> = {
  standardAnswer: [
    {
      validator: async (_rule: Rule, value: string) => {
        const trimmed = (value ?? '').trim()
        if (
          answerContext.questionType === 'OBJECTIVE'
          && (answerForm.comparePolicy === 'EXACT_NORMALIZED'
            || answerForm.comparePolicy === 'REGEX')
          && !trimmed
        ) {
          return Promise.reject(new Error('当前评分策略必须填写答案文本'))
        }
        if (trimmed.length > 2000) {
          return Promise.reject(new Error('标准答案最多 2000 个字符'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  choiceAnswers: [
    {
      validator: async (_rule: Rule, value: string[]) => {
        if (
          answerContext.questionType === 'OBJECTIVE'
          && answerForm.comparePolicy === 'CHOICE_SET'
          && (!Array.isArray(value) || value.length === 0)
        ) {
          return Promise.reject(new Error('请选择至少一个正确选项'))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  comparePolicy: [
    {
      validator: async (_rule: Rule, value: string) => {
        if (answerContext.questionType === 'OBJECTIVE' && !value) {
          return Promise.reject(new Error('请选择客观题比较策略'))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  numericExpectedValue: [
    {
      validator: async (_rule: Rule, value: string) => {
        if (
          answerContext.questionType === 'OBJECTIVE'
          && answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          && !(value ?? '').trim()
        ) {
          return Promise.reject(new Error('数值容差策略必须填写标准值'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  numericTolerance: [
    {
      validator: async (_rule: Rule, value: string) => {
        if (
          answerContext.questionType === 'OBJECTIVE'
          && answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          && !(value ?? '').trim()
        ) {
          return Promise.reject(new Error('数值容差策略必须填写容差'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  gradingRubric: [
    {
      validator: async (_rule: Rule, value: string) => {
        if (
          answerContext.questionType === 'OBJECTIVE'
          && answerForm.comparePolicy === 'AI_GRADE'
          && !(value ?? '').trim()
        ) {
          return Promise.reject(new Error('AI 评分策略必须填写评分细则'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
}

async function openAnswerModal(row: QuestionRow): Promise<void> {
  if (templateWriteLocked.value) {
    message.warning(templateWriteLockReason.value || '当前考试标准答案不可修改')
    return
  }
  if (!row.questionTemplateId) {
    message.warning('请先保存模板，题目编号生成后再录入标准答案')
    return
  }
  answerContext.questionTemplateId = row.questionTemplateId
  answerContext.questionNo = row.questionNo
  answerContext.questionType = row.questionType
  answerForm.standardAnswer = ''
  answerForm.choiceAnswers = []
  answerForm.comparePolicy = undefined
  answerForm.answerExplain = ''
  answerForm.numericExpectedValue = ''
  answerForm.numericTolerance = ''
  answerForm.numericUnit = ''
  answerForm.gradingRubric = ''
  answerForm.aiHint = ''
  answerForm.effectiveNow = true
  answerModalOpen.value = true
  if (!selectedExamId.value) return
  answerLoading.value = true
  try {
    const currentAnswer: ExamStandardAnswerVO | null = await getStandardAnswer({
      examId: selectedExamId.value,
      questionTemplateId: row.questionTemplateId,
    })
    const effectiveConfig = await getEffectiveAnswerConfig({
      examId: selectedExamId.value,
      questionTemplateId: row.questionTemplateId,
    })
    if (currentAnswer == null) {
      answerForm.effectiveNow = effectiveConfig?.effectiveStatus === 'ACTIVE'
      return
    }
    answerForm.standardAnswer = currentAnswer.standardAnswer ?? ''
    answerForm.comparePolicy = currentAnswer.comparePolicy
    answerForm.answerExplain = currentAnswer.answerExplain ?? ''
    answerForm.numericExpectedValue = String(currentAnswer.numericExpectedValue ?? '')
    answerForm.numericTolerance = String(currentAnswer.numericTolerance ?? '')
    answerForm.numericUnit = currentAnswer.numericUnit ?? ''
    answerForm.gradingRubric = currentAnswer.gradingRubric ?? ''
    answerForm.aiHint = currentAnswer.aiHint ?? ''
    answerForm.effectiveNow = effectiveConfig?.effectiveStatus === 'ACTIVE'
      || currentAnswer.effectiveStatus === 'ACTIVE'
    if (currentAnswer.comparePolicy === 'CHOICE_SET') {
      answerForm.standardAnswer = ''
      const declaredLabels = new Set(
        currentAnswer.declaredOptions.map((option) => option.optionLabel),
      )
      const answerLabels = currentAnswer.choiceOptions.map((option) => option.optionLabel)
      const invalidLabel = answerLabels.find((optionLabel) => !declaredLabels.has(optionLabel))
      if (invalidLabel) {
        showUserError(
          new Error(
            `标准答案选项“${invalidLabel}”超出题目正式声明选项空间，请先修正题目选项配置`,
          ),
          '标准答案加载失败',
        )
        return
      }
      answerForm.choiceAnswers = answerLabels
    }
  } catch (error) {
    answerModalOpen.value = false
    showUserError(error, '标准答案加载失败')
  } finally {
    answerLoading.value = false
  }
}

async function handleSaveAnswer(): Promise<void> {
  if (templateWriteLocked.value) {
    message.warning(templateWriteLockReason.value || '当前考试标准答案不可修改')
    return
  }
  if (!selectedExamId.value || !answerContext.questionTemplateId) return
  if (!answerFormRef.value) return
  try {
    await answerFormRef.value.validate()
  } catch {
    return
  }
  answerSaving.value = true
  try {
    let standardAnswer: string | undefined
    let declaredOptions: ExamQuestionDeclaredOptionRequest[] | undefined
    let choiceOptions: ExamQuestionStandardAnswerOptionRequest[] | undefined
    if (answerContext.questionType === 'OBJECTIVE' && answerForm.comparePolicy === 'CHOICE_SET') {
      declaredOptions = answerChoiceOptions.value.map((option, index) => ({
        optionLabel: option.value,
        sortNo: index + 1,
      }))
      if (declaredOptions.length === 0) {
        showUserError(new Error('当前题目尚未配置正式声明选项空间'), '标准答案保存失败')
        return
      }
      const selectedLabels = new Set(answerForm.choiceAnswers)
      choiceOptions = declaredOptions
        .filter((option) => selectedLabels.has(option.optionLabel))
        .map((option, index) => ({
          optionLabel: option.optionLabel,
          sortNo: index + 1,
        }))
      if (!choiceOptions || choiceOptions.length !== answerForm.choiceAnswers.length) {
        showUserError(null, '标准答案保存失败')
        return
      }
    } else if (
      answerContext.questionType === 'SUBJECTIVE'
      || answerForm.comparePolicy === 'EXACT_NORMALIZED'
      || answerForm.comparePolicy === 'REGEX'
    ) {
      standardAnswer = answerForm.standardAnswer.trim() || undefined
    }
    const standardAnswerId = await saveStandardAnswer({
      examId: selectedExamId.value,
      questionTemplateId: answerContext.questionTemplateId,
      standardAnswer,
      declaredOptions,
      choiceOptions,
      comparePolicy: answerForm.comparePolicy,
      answerExplain: answerForm.answerExplain?.trim() || undefined,
      numericExpectedValue:
        answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          ? answerForm.numericExpectedValue?.trim() || undefined
          : undefined,
      numericTolerance:
        answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          ? answerForm.numericTolerance?.trim() || undefined
          : undefined,
      numericUnit:
        answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
          ? answerForm.numericUnit?.trim() || undefined
          : undefined,
      gradingRubric:
        answerForm.comparePolicy === 'AI_GRADE'
          ? answerForm.gradingRubric?.trim() || undefined
          : undefined,
      aiHint: answerForm.aiHint?.trim() || undefined,
      effectiveNow: answerForm.effectiveNow,
    })
    if (answerForm.effectiveNow) {
      await confirmAnswerEffective({
        examId: selectedExamId.value,
        questionTemplateId: answerContext.questionTemplateId,
        standardAnswerId,
        comparePolicy: answerForm.comparePolicy,
      })
    }
    answerPreviewMap.delete(answerContext.questionTemplateId)
    await loadAnswerPreview(answerContext.questionTemplateId)
    message.success(answerForm.effectiveNow ? '标准答案已保存并确认生效' : '标准答案已保存为草稿')
    answerModalOpen.value = false
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '标准答案保存失败')
  } finally {
    answerSaving.value = false
  }
}

async function handleRevokeMaster(): Promise<void> {
  if (!selectedExamId.value) return
  revokingMaster.value = true
  try {
    await revokePaperMaster(selectedExamId.value)
    message.success('试卷母版已撤销，可继续编辑模板与标准答案')
    await loadTemplate()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '撤销试卷母版失败')
  } finally {
    revokingMaster.value = false
  }
}

// B-8: selectedExamId 由 useMarkExamSelector 与 URL 双向同步，业务层只需 watch 一次
watch(selectedExamId, (value) => {
  if (value) {
    void loadTemplate()
  } else {
    clearTemplate()
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.paper-template-page {
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__toolbar-status {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.empty-block {
  padding: 60px 0;
}

.question-cell {
  &__primary {
    font-weight: 500;
    color: var(--dp-text-primary, #0f172a);
  }

  &__stem {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary, #475569);
  }

  &__muted {
    font-size: 13px;
    color: var(--dp-text-muted, #94a3b8);
  }
}

.question-expand {
  padding: 12px 16px 12px 48px;
  background: var(--ant-color-fill-quaternary);

  &__layout {
    display: grid;
    grid-template-columns: minmax(168px, 220px) 1fr;
    gap: 12px;
    align-items: start;
  }

  &__panel {
    padding: 12px;
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e5e7eb);
    border-radius: var(--dp-radius-panel);

    &--answer {
      min-width: 0;
    }
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__title {
    font-size: var(--dp-font-size-xs, 12px);
    font-weight: 600;
    color: var(--dp-text-secondary, #64748b);
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__answer-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__answer-value {
    padding: 8px 12px;
    font-size: var(--dp-font-size-lg, 16px);
    font-weight: 600;
    line-height: 1.5;
    color: var(--dp-text-primary, #0f172a);
    background: var(--dp-surface-subtle, #f8fafc);
    border: 1px solid var(--dp-border, #e5e7eb);
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__explain {
    margin: 0;
    padding-left: 10px;
    font-size: var(--dp-font-size-sm, 13px);
    line-height: 1.6;
    color: var(--dp-text-secondary, #475569);
    border-left: 2px solid var(--dp-border, #e5e7eb);
  }

  &__hint {
    margin: 0;
    font-size: var(--dp-font-size-xs, 12px);
    line-height: 1.5;
    color: var(--dp-text-muted, #94a3b8);
  }
}

@media (max-width: 767px) {
  .question-expand__layout {
    grid-template-columns: 1fr;
  }
}
</style>
