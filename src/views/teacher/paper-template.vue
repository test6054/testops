<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="paper-template-page__context">
        <div class="paper-template-page__context-left">
          <a-select
            :value="selectedExamId"
            class="paper-template-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag
            v-if="selectedExamId"
            :tone="pages.length === (form.totalPages ?? -1) ? 'green' : 'orange'"
            size="sm"
          >
            {{ pages.length }} / {{ form.totalPages ?? '-' }} 页
          </UiTag>
          <UiTag v-if="selectedExamId" tone="blue" size="sm">
            {{ questions.length }} 题 · 总分 {{ totalScore }}
          </UiTag>
        </div>
        <div class="paper-template-page__context-right">
          <UiButton size="sm" :disabled="!selectedExamId" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            保存
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择需要维护的考试"
      class="paper-template-page__empty"
    />

    <!-- D-9 错误态：题目模板加载遇到非“未配置”错误时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="templateLoadError"
      :error="templateLoadError"
      title="题目模板加载失败"
      :helper="`考试 ID：${selectedExamId}`"
      @retry="loadTemplate"
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
              style="width: 360px"
            />
          </a-form-item>
          <a-form-item label="总页数" required>
            <a-input-number
              v-model:value="form.totalPages"
              :min="1"
              :max="50"
              style="width: 120px"
            />
          </a-form-item>
        </a-form>
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <FileImageOutlined />
          <span>页面文件配置</span>
          <UiBadge :tone="pages.length === (form.totalPages ?? -1) ? 'green' : 'orange'">
            {{ pages.length }} / {{ form.totalPages ?? '-' }}
          </UiBadge>
        </template>
        <template #extra>
          <UiButton size="sm" variant="outline" @click="addPage">
            <template #icon>
              <PlusOutlined />
            </template>
            新增页面
          </UiButton>
        </template>

        <a-alert
          type="info"
          show-icon
          :closable="false"
          message="页面数必须等于「总页数」，且页号 1 ~ 总页数 全部覆盖、不可重复。每页必须上传模板文件并填写宽高（像素）。"
          style="margin-bottom: 12px"
        />

        <UiDataTable
          :columns="pageColumns"
          :data-source="pages"
          :show-pagination="false"
          flat
          :total="pages.length"
          row-key="rowKey"
          size="middle"
          bordered
          :scroll="{ x: 800 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'pageNo'">
              <a-input-number
                v-model:value="record.pageNo"
                :min="1"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'templateFile'">
              <a-space>
                <UiTag v-if="record.templateFileId" tone="green" size="sm">
                  {{ record.templateFileName || `节点 #${record.templateFileId}` }}
                </UiTag>
                <UiTag v-else tone="orange" size="sm">未上传</UiTag>
                <a-upload
                  :show-upload-list="false"
                  :before-upload="(file: File) => handleUploadPage(file, index)"
                  accept="image/*,application/pdf"
                >
                  <a-button size="small" :loading="record.uploading">
                    <template #icon>
                      <UploadOutlined />
                    </template>
                    {{ record.templateFileId ? '替换' : '上传' }}
                  </a-button>
                </a-upload>
              </a-space>
            </template>
            <template v-else-if="column.key === 'widthPx'">
              <a-input-number
                v-model:value="record.widthPx"
                :min="0"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'heightPx'">
              <a-input-number
                v-model:value="record.heightPx"
                :min="0"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'pageActions'">
              <a-button type="link" danger size="small" @click="removePage(index)"> 删除 </a-button>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <ProfileOutlined />
          <span>题目列表</span>
          <UiBadge tone="blue">{{ questions.length }} 题</UiBadge>
          <UiBadge tone="green">总分 {{ totalScore }}</UiBadge>
        </template>
        <template #extra>
          <UiButton size="sm" @click="addQuestion">
            <template #icon>
              <PlusOutlined />
            </template>
            新增题目
          </UiButton>
        </template>

        <a-alert
          type="info"
          show-icon
          :closable="false"
          message="题号、排序号必须唯一；满分必填且不可为负。题目区域坐标可在批阅前置任务中再细化。"
          style="margin-bottom: 12px"
        />

        <UiDataTable
          :columns="questionColumns"
          :data-source="questions"
          :show-pagination="false"
          flat
          :total="questions.length"
          row-key="rowKey"
          size="middle"
          bordered
          :scroll="{ x: 1280 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'questionNo'">
              <a-input v-model:value="record.questionNo" placeholder="如 1 / 1.1" size="small" />
            </template>
            <template v-else-if="column.key === 'questionType'">
              <a-select
                v-model:value="record.questionType"
                :options="questionTypeOptions"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'fullScore'">
              <a-input-number
                v-model:value="record.fullScore"
                :min="0"
                :step="0.5"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'pageNo'">
              <a-input-number
                v-model:value="record.pageNo"
                :min="1"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'x'">
              <a-input-number v-model:value="record.x" :min="0" size="small" style="width: 100%" />
            </template>
            <template v-else-if="column.key === 'y'">
              <a-input-number v-model:value="record.y" :min="0" size="small" style="width: 100%" />
            </template>
            <template v-else-if="column.key === 'width'">
              <a-input-number
                v-model:value="record.width"
                :min="0"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'height'">
              <a-input-number
                v-model:value="record.height"
                :min="0"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'sortNo'">
              <a-input-number
                v-model:value="record.sortNo"
                :min="1"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'serverStatus'">
              <UiTag v-if="record.questionTemplateId" tone="green" size="sm">已存在</UiTag>
              <UiTag v-else tone="orange" size="sm">未保存</UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <a-button type="link" size="small" @click="openStemModal(index)">
                  {{ questions[index].questionStem ? '编辑题干' : '录入题干' }}
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  :disabled="!questions[index].questionTemplateId"
                  @click="openAnswerModal(questions[index])"
                >
                  标准答案
                </a-button>
                <a-button type="link" danger size="small" @click="removeQuestion(index)">
                  删除
                </a-button>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </a-spin>
  </StageWorkbenchShell>

  <a-modal
    v-model:open="answerModalOpen"
    title="录入标准答案"
    :confirm-loading="answerSaving"
    :destroy-on-close="true"
    :mask-closable="false"
    width="640px"
    @ok="handleSaveAnswer"
  >
    <a-form ref="answerFormRef" :model="answerForm" layout="vertical" :rules="answerFormRules">
      <a-form-item label="题号">
        <a-input :value="answerContext.questionNo" disabled />
      </a-form-item>
      <a-form-item label="题型">
        <a-input :value="answerContextQuestionTypeLabel" disabled />
      </a-form-item>
      <a-form-item label="标准答案" name="standardAnswer">
        <a-textarea
          v-model:value="answerForm.standardAnswer"
          :rows="3"
          :maxlength="2000"
          :placeholder="standardAnswerPlaceholder"
          show-count
        />
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
          answerContext.questionType === 'OBJECTIVE' &&
          answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
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
          answerContext.questionType === 'OBJECTIVE' &&
          answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
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
          answerContext.questionType === 'OBJECTIVE' &&
          answerForm.comparePolicy === 'NUMERIC_TOLERANCE'
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
        v-if="answerContext.questionType === 'OBJECTIVE' && answerForm.comparePolicy === 'AI_GRADE'"
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
  </a-modal>

  <a-modal
    v-model:open="stemModalOpen"
    title="录入题干"
    :destroy-on-close="true"
    :mask-closable="false"
    width="640px"
    @ok="handleSaveStem"
  >
    <a-alert
      type="info"
      show-icon
      message="题干用于 AI 评分上下文圈定"
      description="教师在制卷阶段录入；保存后随顶部「保存模板」一同落库。AI 评分链路缺失题干时按 QUESTION_CONTEXT_MISSING 阻断。"
      style="margin-bottom: 12px"
    />
    <a-textarea
      v-model:value="stemDraft"
      :rows="8"
      :maxlength="4000"
      placeholder="请录入完整题干（含选项、图表说明等关键上下文）；多空题请保留空格占位以便 OCR 识别"
      show-count
    />
  </a-modal>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamPageTemplatePayload,
  ExamPaperPageTemplateVO,
  ExamQuestionTemplatePayload,
  ExamQuestionTemplateVO,
  ObjectiveComparePolicyCode,
} from '@/apis/mark/exam'
import {
  getExamTemplate,
  isPaperTemplateNotConfiguredError,
  OBJECTIVE_COMPARE_POLICY_OPTIONS,
  saveExamTemplate,
  saveStandardAnswer,
} from '@/apis/mark/exam'
import type { QuestionTypeCode } from '@/apis/mark/grading-experience'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/grading-experience'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
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
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherPaperTemplate' })

// B-8 统一考试选择器
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

interface PageRow {
  rowKey: string
  pageNo?: number
  templateFileId?: string
  templateFileName?: string
  widthPx?: number
  heightPx?: number
  uploading?: boolean
}

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

const questionTypeOptions = [
  { label: '客观题', value: 'OBJECTIVE' as const },
  { label: '主观题', value: 'SUBJECTIVE' as const },
]

function requireQuestionType(value: string): QuestionTypeCode {
  if (value !== 'OBJECTIVE' && value !== 'SUBJECTIVE') {
    throw new Error(`题型存在未定义枚举值：${value}`)
  }
  return value
}

let rowSeq = 0
function nextRowKey(prefix: string): string {
  rowSeq += 1
  return `${prefix}-${rowSeq}-${Date.now()}`
}

const form = reactive<{ templateName: string; totalPages?: number }>({
  templateName: '',
  totalPages: undefined,
})
const pages = reactive<PageRow[]>([])
const questions = reactive<QuestionRow[]>([])

const loading = ref(false)
const saving = ref(false)
// D-9 错误态：仅当后端返回非“未配置”类错误时才上报（“未配置模板”是合法空态）
const templateLoadError = ref<unknown>(null)

const totalScore = computed(() =>
  questions.reduce((sum, row) => sum + (Number(row.fullScore) || 0), 0).toFixed(2),
)

const pageColumns: ColumnType<PageRow>[] = [
  { title: '页号', key: 'pageNo', width: 100 },
  { title: '模板文件', key: 'templateFile', width: 320 },
  { title: '宽度（px）', key: 'widthPx', width: 130 },
  { title: '高度（px）', key: 'heightPx', width: 130 },
  { title: '操作', key: 'pageActions', width: 90, fixed: 'right' },
]

const questionColumns: ColumnType<QuestionRow>[] = [
  { title: '题号', key: 'questionNo', width: 120 },
  { title: '题型', key: 'questionType', width: 110 },
  { title: '满分', key: 'fullScore', width: 90 },
  { title: '页号', key: 'pageNo', width: 80 },
  { title: 'X', key: 'x', width: 80 },
  { title: 'Y', key: 'y', width: 80 },
  { title: '宽', key: 'width', width: 80 },
  { title: '高', key: 'height', width: 80 },
  { title: '排序', key: 'sortNo', width: 80 },
  { title: '状态', key: 'serverStatus', width: 100 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

function clearTemplate(): void {
  form.templateName = ''
  form.totalPages = undefined
  pages.splice(0, pages.length)
  questions.splice(0, questions.length)
}

function applyTemplate(
  templateName: string,
  totalPages: number | undefined,
  pageList: ExamPaperPageTemplateVO[],
  questionList: ExamQuestionTemplateVO[],
): void {
  form.templateName = templateName
  form.totalPages = totalPages
  pages.splice(0, pages.length)
  pageList.forEach((p) => {
    pages.push({
      rowKey: nextRowKey('p'),
      pageNo: p.pageNo,
      templateFileId: p.templateFileId,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
    })
  })
  questions.splice(0, questions.length)
  questionList.forEach((q) => {
    questions.push({
      rowKey: nextRowKey('q'),
      questionTemplateId: q.questionTemplateId,
      questionNo: q.questionNo,
      questionType: requireQuestionType(q.questionType),
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

async function loadTemplate(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  templateLoadError.value = null
  try {
    const tpl = await getExamTemplate(selectedExamId.value)
    applyTemplate(tpl.templateName, tpl.totalPages, tpl.pages, tpl.questions)
  } catch (error) {
    clearTemplate()
    if (!isPaperTemplateNotConfiguredError(error)) {
      // 真实加载失败：D-9 错误态 + 警告提示
      templateLoadError.value = error
      const errMsg = error instanceof Error ? error.message : '未知错误'
      message.warning(`当前考试尚未配置完整模板：${errMsg}`)
    }
  } finally {
    loading.value = false
  }
}

function handleExamChange(value: unknown): void {
  onExamChange(value as string | number | undefined)
  if (selectedExamId.value) {
    void loadTemplate()
  } else {
    clearTemplate()
  }
}

function addPage(): void {
  pages.push({
    rowKey: nextRowKey('p'),
    pageNo: pages.length + 1,
  })
}

function removePage(index: number): void {
  pages.splice(index, 1)
}

async function handleUploadPage(file: File, index: number): Promise<boolean> {
  const row = pages[index]
  if (!row) return false
  row.uploading = true
  try {
    const result = await uploadFile(file, { businessType: 'mark-exam-template' })
    row.templateFileId = result.id
    row.templateFileName = result.nodeName || file.name
    message.success(`第 ${row.pageNo ?? index + 1} 页文件已上传`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '上传失败'
    message.error(errMsg)
  } finally {
    row.uploading = false
  }
  // 阻止 a-upload 默认行为
  return false
}

function addQuestion(): void {
  questions.push({
    rowKey: nextRowKey('q'),
    questionNo: String(questions.length + 1),
    questionType: 'OBJECTIVE',
    fullScore: undefined,
    pageNo: undefined,
    sortNo: questions.length + 1,
  })
}

function removeQuestion(index: number): void {
  questions.splice(index, 1)
}

function buildPagesPayload(): ExamPageTemplatePayload[] | null {
  const total = form.totalPages ?? 0
  if (total <= 0) {
    message.error('请填写总页数')
    return null
  }
  if (pages.length !== total) {
    message.error(`页面数量必须等于总页数（当前 ${pages.length} / ${total}）`)
    return null
  }
  const seenPageNo = new Set<number>()
  const seenFileId = new Set<string>()
  const payload: ExamPageTemplatePayload[] = []
  for (let i = 0; i < pages.length; i += 1) {
    const row = pages[i]
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
    if (!row.templateFileId) {
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
    payload.push({
      pageNo: row.pageNo,
      templateFileId: row.templateFileId,
      widthPx: row.widthPx,
      heightPx: row.heightPx,
    })
  }
  return payload
}

function buildQuestionsPayload(): ExamQuestionTemplatePayload[] | null {
  if (questions.length === 0) {
    message.error('题目列表不能为空')
    return null
  }
  const seenNo = new Set<string>()
  const seenSort = new Set<number>()
  const payload: ExamQuestionTemplatePayload[] = []
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
    payload.push({
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
  return payload
}

async function handleSave(): Promise<void> {
  if (!selectedExamId.value) return
  const name = form.templateName.trim()
  if (!name) {
    message.error('模板名称必填')
    return
  }
  if (!form.totalPages || form.totalPages <= 0) {
    message.error('总页数必填且大于 0')
    return
  }
  const pagesPayload = buildPagesPayload()
  if (pagesPayload === null) return
  const questionsPayload = buildQuestionsPayload()
  if (questionsPayload === null) return

  saving.value = true
  try {
    await saveExamTemplate({
      examId: selectedExamId.value,
      templateName: name,
      totalPages: form.totalPages,
      pages: pagesPayload,
      questions: questionsPayload,
    })
    message.success('试卷模板已保存')
    await loadTemplate()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '保存模板失败'
    message.error(errMsg)
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
 * 标答输入框的占位提示。客观题 AI_GRADE 策略下允许不填标答，由 AI 评分给出建议得分后老师审核。
 */
const standardAnswerPlaceholder = computed(() => {
  if (answerContext.questionType === 'OBJECTIVE' && answerForm.comparePolicy === 'AI_GRADE') {
    return '客观题 AI 评分策略下可不填标答；AI 会依据考试上下文给出建议得分，老师审核后生效'
  }
  return '客观题填写选项（如 A / AB / 1 / 0），主观题填写参考答案要点'
})

const answerFormRules: Record<string, Rule[]> = {
  standardAnswer: [
    {
      validator: async (_rule: Rule, value: string) => {
        const trimmed = (value ?? '').trim()
        if (
          answerContext.questionType === 'OBJECTIVE' &&
          answerForm.comparePolicy !== 'AI_GRADE' &&
          !trimmed
        ) {
          return Promise.reject(new Error('客观题需填写标准答案（选 AI 评分策略可留空）'))
        }
        if (trimmed.length > 2000) {
          return Promise.reject(new Error('标准答案最多 2000 个字符'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
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
          answerContext.questionType === 'OBJECTIVE' &&
          answerForm.comparePolicy === 'NUMERIC_TOLERANCE' &&
          !(value ?? '').trim()
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
          answerContext.questionType === 'OBJECTIVE' &&
          answerForm.comparePolicy === 'NUMERIC_TOLERANCE' &&
          !(value ?? '').trim()
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
          answerContext.questionType === 'OBJECTIVE' &&
          answerForm.comparePolicy === 'AI_GRADE' &&
          !(value ?? '').trim()
        ) {
          return Promise.reject(new Error('AI 评分策略必须填写评分细则'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
}

/**
 * 题干编辑 modal 状态。题干在制卷阶段录入后随试卷模板一同保存，所以本 modal 只写内存，
 * 不调用独立 API；老师保存后需点顶部“保存模板”全量落库。
 */
const stemModalOpen = ref(false)
const stemEditingIndex = ref<number | null>(null)
const stemDraft = ref('')

function openStemModal(index: number): void {
  if (index < 0 || index >= questions.length) return
  stemEditingIndex.value = index
  stemDraft.value = questions[index].questionStem ?? ''
  stemModalOpen.value = true
}

function handleSaveStem(): void {
  const idx = stemEditingIndex.value
  if (idx == null) {
    stemModalOpen.value = false
    return
  }
  const trimmed = stemDraft.value.trim()
  if (trimmed.length > 4000) {
    message.error('题干最多 4000 个字符')
    return
  }
  questions[idx].questionStem = trimmed || undefined
  stemModalOpen.value = false
  stemEditingIndex.value = null
  message.success('题干已暂存，请点顶部“保存模板”提交落库')
}

// 入参就是表格 data-source（QuestionRow[]）中的真实视图模型，不是后端 ExamQuestionTemplateVO。
function openAnswerModal(row: QuestionRow): void {
  if (!row.questionTemplateId) {
    message.warning('请先保存模板，待题目获得 ID 后再录入标准答案')
    return
  }
  answerContext.questionTemplateId = row.questionTemplateId
  answerContext.questionNo = row.questionNo
  answerContext.questionType = row.questionType
  answerForm.standardAnswer = ''
  answerForm.comparePolicy = undefined
  answerForm.answerExplain = ''
  answerForm.numericExpectedValue = ''
  answerForm.numericTolerance = ''
  answerForm.numericUnit = ''
  answerForm.gradingRubric = ''
  answerForm.aiHint = ''
  answerForm.effectiveNow = true
  answerModalOpen.value = true
}

async function handleSaveAnswer(): Promise<void> {
  if (!selectedExamId.value || !answerContext.questionTemplateId) return
  if (!answerFormRef.value) return
  try {
    await answerFormRef.value.validate()
  } catch {
    return
  }
  answerSaving.value = true
  try {
    const trimmedAnswer = answerForm.standardAnswer.trim()
    await saveStandardAnswer({
      examId: selectedExamId.value,
      questionTemplateId: answerContext.questionTemplateId,
      standardAnswer: trimmedAnswer || undefined,
      comparePolicy: answerForm.comparePolicy,
      answerExplain: answerForm.answerExplain?.trim() || undefined,
      numericExpectedValue: answerForm.numericExpectedValue?.trim() || undefined,
      numericTolerance: answerForm.numericTolerance?.trim() || undefined,
      numericUnit: answerForm.numericUnit?.trim() || undefined,
      gradingRubric: answerForm.gradingRubric?.trim() || undefined,
      aiHint: answerForm.aiHint?.trim() || undefined,
      effectiveNow: answerForm.effectiveNow,
    })
    message.success('标准答案已保存')
    answerModalOpen.value = false
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '保存标准答案失败'
    message.error(errMsg)
  } finally {
    answerSaving.value = false
  }
}

// B-8: selectedExamId 由 useMarkExamSelector 与 URL 双向同步，业务层只需 watch 一次
watch(selectedExamId, (value) => {
  if (value) {
    void loadTemplate()
  } else {
    clearTemplate()
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadTemplate()
  }
})
</script>

<style lang="scss" scoped>
.paper-template-page {
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

  &__context-right {
    flex-shrink: 0;
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
  padding: 8px 10px;
  min-height: 100vh;
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
</style>
