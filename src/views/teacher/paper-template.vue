<template>
  <GiPageLayout>
    <div class="paper-template-page">
      <PageHeader title="试卷模板">
        <template #tags>
          <UiTag
            v-if="selectedExamId"
            :tone="pages.length === (form.totalPages ?? -1) ? 'green' : 'orange'"
            size="md"
          >
            {{ pages.length }} / {{ form.totalPages ?? '-' }} 页
          </UiTag>
          <UiTag v-if="selectedExamId" tone="blue" size="md">
            {{ questions.length }} 题 · 总分 {{ totalScore }}
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
          <UiButton size="sm" :disabled="!selectedExamId" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            保存
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty v-if="!selectedExamId" description="请选择需要维护的考试" class="empty-block" />

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

          <a-table
            :columns="pageColumns"
            :data-source="pages"
            :pagination="false"
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
                <a-button type="link" danger size="small" @click="removePage(index)">
                  删除
                </a-button>
              </template>
            </template>
          </a-table>
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

          <a-table
            :columns="questionColumns"
            :data-source="questions"
            :pagination="false"
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
                <a-input-number
                  v-model:value="record.x"
                  :min="0"
                  size="small"
                  style="width: 100%"
                />
              </template>
              <template v-else-if="column.key === 'y'">
                <a-input-number
                  v-model:value="record.y"
                  :min="0"
                  size="small"
                  style="width: 100%"
                />
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
                  <a-button
                    type="link"
                    size="small"
                    :disabled="!record.questionTemplateId"
                    @click="openAnswerModal(record)"
                  >
                    标准答案
                  </a-button>
                  <a-button type="link" danger size="small" @click="removeQuestion(index)">
                    删除
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </UiCard>
      </a-spin>
    </div>

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
          <a-input :value="QUESTION_TYPE_LABEL[answerContext.questionType] || ''" disabled />
        </a-form-item>
        <a-form-item label="标准答案" name="standardAnswer">
          <a-textarea
            v-model:value="answerForm.standardAnswer"
            :rows="3"
            :maxlength="2000"
            placeholder="客观题填写选项（如 A / AB / 1 / 0），主观题填写参考答案要点"
            show-count
          />
        </a-form-item>
        <a-form-item v-if="answerContext.questionType === 'OBJECTIVE'" label="比较策略">
          <a-input
            v-model:value="answerForm.comparePolicy"
            placeholder="如 EQUALS / IGNORE_ORDER / NUMERIC_TOLERANCE，留空使用默认"
            :maxlength="64"
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
        <a-form-item label="结构化答案 JSON">
          <a-textarea
            v-model:value="answerForm.answerPayload"
            :rows="3"
            :maxlength="4000"
            placeholder="结构化答案配置（如数值容差），JSON 字符串，可选"
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="answerForm.effectiveNow">
            立即生效（取消勾选则保存为草稿状态）
          </a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamPageTemplatePayload,
  ExamPaperPageTemplateVO,
  ExamQuestionTemplatePayload,
  ExamQuestionTemplateVO,
  ExamSummaryVO,
} from '@/apis/mark/exam'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadFile } from '@/apis/edu/file-management'
import { getExamTemplate, pageExams, saveExamTemplate, saveStandardAnswer } from '@/apis/mark/exam'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherPaperTemplate' })

const route = useRoute()
const router = useRouter()

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
  questionType: 'OBJECTIVE' | 'SUBJECTIVE'
  fullScore?: number
  pageNo?: number
  x?: number
  y?: number
  width?: number
  height?: number
  sortNo?: number
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  OBJECTIVE: '客观题',
  SUBJECTIVE: '主观题',
}

const questionTypeOptions = [
  { label: '客观题', value: 'OBJECTIVE' as const },
  { label: '主观题', value: 'SUBJECTIVE' as const },
]

let rowSeq = 0
function nextRowKey(prefix: string): string {
  rowSeq += 1
  return `${prefix}-${rowSeq}-${Date.now()}`
}

const selectedExamId = ref<string | undefined>(
  route.query.examId ? String(route.query.examId) : undefined,
)
const examOptions = ref<Array<{ label: string, value: string }>>([])
const examOptionsLoading = ref(false)

const form = reactive<{ templateName: string, totalPages?: number }>({
  templateName: '',
  totalPages: undefined,
})
const pages = reactive<PageRow[]>([])
const questions = reactive<QuestionRow[]>([])

const loading = ref(false)
const saving = ref(false)

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

async function loadExamOptions(): Promise<void> {
  examOptionsLoading.value = true
  try {
    const result = await pageExams({ pageNum: 1, pageSize: 200 })
    examOptions.value = (result.list ?? [])
      .filter((item: ExamSummaryVO) => item.status === 'ACTIVE')
      .map((item: ExamSummaryVO) => ({
        label: `${item.examName}（${item.statusMessage}）`,
        value: item.examId,
      }))
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '加载考试列表失败'
    message.error(errMsg)
  } finally {
    examOptionsLoading.value = false
  }
}

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
      questionType: (q.questionType as 'OBJECTIVE' | 'SUBJECTIVE') ?? 'OBJECTIVE',
      fullScore: typeof q.fullScore === 'number' ? q.fullScore : Number(q.fullScore),
      pageNo: q.pageNo,
      x: q.x,
      y: q.y,
      width: q.width,
      height: q.height,
      sortNo: q.sortNo,
    })
  })
}

async function loadTemplate(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const tpl = await getExamTemplate(selectedExamId.value)
    applyTemplate(tpl.templateName, tpl.totalPages, tpl.pages ?? [], tpl.questions ?? [])
  } catch (error) {
    clearTemplate()
    const errMsg = error instanceof Error ? error.message : ''
    if (
      errMsg
      && !errMsg.includes('未找到')
      && !errMsg.includes('不存在')
      && !errMsg.includes('当前模板')
    ) {
      message.warning(`当前考试尚未配置完整模板：${errMsg}`)
    }
  } finally {
    loading.value = false
  }
}

function handleExamChange(
  value: SelectValue,
  _option: DefaultOptionType | DefaultOptionType[],
): void {
  const next = value != null ? String(value) : undefined
  selectedExamId.value = next
  void router.replace({ query: next ? { examId: next } : {} })
  if (next) {
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
  questionType: 'OBJECTIVE' | 'SUBJECTIVE' | ''
}

const answerModalOpen = ref(false)
const answerSaving = ref(false)
const answerFormRef = ref<FormInstance>()
const answerContext = reactive<AnswerContext>({
  questionTemplateId: undefined,
  questionNo: '',
  questionType: '',
})
const answerForm = reactive<{
  standardAnswer: string
  comparePolicy?: string
  answerExplain?: string
  aiHint?: string
  answerPayload?: string
  effectiveNow: boolean
}>({
  standardAnswer: '',
  comparePolicy: '',
  answerExplain: '',
  aiHint: '',
  answerPayload: '',
  effectiveNow: true,
})
const answerFormRules: Record<string, Rule[]> = {
  standardAnswer: [
    { required: true, message: '请填写标准答案', trigger: 'blur' },
    { max: 2000, message: '标准答案最多 2000 个字符', trigger: 'blur' },
  ],
}

function openAnswerModal(row: ExamQuestionTemplateVO): void {
  if (!row.questionTemplateId) {
    message.warning('请先保存模板，待题目获得 ID 后再录入标准答案')
    return
  }
  answerContext.questionTemplateId = row.questionTemplateId
  answerContext.questionNo = row.questionNo
  answerContext.questionType = row.questionType
  answerForm.standardAnswer = ''
  answerForm.comparePolicy = ''
  answerForm.answerExplain = ''
  answerForm.aiHint = ''
  answerForm.answerPayload = ''
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
    await saveStandardAnswer({
      examId: selectedExamId.value,
      questionTemplateId: answerContext.questionTemplateId,
      standardAnswer: answerForm.standardAnswer.trim(),
      comparePolicy: answerForm.comparePolicy?.trim() || undefined,
      answerExplain: answerForm.answerExplain?.trim() || undefined,
      aiHint: answerForm.aiHint?.trim() || undefined,
      answerPayload: answerForm.answerPayload?.trim() || undefined,
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

watch(
  () => route.query.examId,
  (value) => {
    const next = value ? String(value) : undefined
    if (next !== selectedExamId.value) {
      selectedExamId.value = next
      if (next) {
        void loadTemplate()
      }
    }
  },
)

onMounted(async () => {
  await loadExamOptions()
  if (selectedExamId.value) {
    await loadTemplate()
  }
})
</script>

<style lang="scss" scoped>
.paper-template-page {
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
