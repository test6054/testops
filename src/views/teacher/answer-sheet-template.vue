<template>
  <div v-if="selectedExamId" class="sheet-page__toolbar">
    <div class="sheet-page__toolbar-status">
      <UiTag v-if="hasQuestions" tone="blue" size="sm">
        {{ questionCount }} 道题目
      </UiTag>
      <UiTag tone="gray" size="sm">
        {{ pages.length }} / {{ totalPagesLabel }} 页
      </UiTag>
    </div>
    <a-space>
      <UiButton size="sm" variant="primary" :disabled="!hasQuestions" :loading="sheetGenerating" @click="openSheetGenerateModal">
        <template #icon><ThunderboltOutlined /></template>
        生成标准答题卡
      </UiButton>
      <UiButton size="sm" :loading="saving" @click="handleSave">
        <template #icon><SaveOutlined /></template>
        保存
      </UiButton>
    </a-space>
  </div>

  <UiEmpty v-if="!selectedExamId" description="请选择需要维护的考试" class="sheet-page__empty" />



  <a-spin v-else :spinning="loading">
    <UiAlertStrip
      v-if="!hasQuestions"
      tone="warning"
      title="题目结构尚未配置"
      description="暂无数据"
      dense
      class="sheet-page__alert"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="goPaperTemplate">前往试卷模板</UiButton>
      </template>
    </UiAlertStrip>

    <UiCard class="info-card">
      <template #title>
        <InfoCircleOutlined />
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
        <a-form-item v-if="hasQuestions">
          <UiTag tone="blue" size="sm"> 题目结构由试卷模板维护：{{ questionCount }} 道 </UiTag>
        </a-form-item>
      </a-form>
    </UiCard>

    <UiCard class="info-card">
      <template #title>
        <FileImageOutlined />
        <span>页面文件配置</span>
        <UiBadge :tone="pageCountMatched ? 'green' : 'orange'">
          {{ pages.length }} / {{ totalPagesLabel }}
        </UiBadge>
      </template>
      <template #extra>
        <UiButton size="sm" variant="outline" @click="addPage">
          <template #icon><PlusOutlined /></template>
          新增页面
        </UiButton>
      </template>

      <ExamTemplatePageTable ref="pageTableRef" v-model:pages="pages" @remove="removePage" />
    </UiCard>
  </a-spin>

  <!-- 生成标准答题卡配置弹窗 -->
  <a-modal
    v-model:open="sheetGenerateModalOpen"
    title="生成标准答题卡 PDF"
    width="520px"
    :confirm-loading="sheetGenerating"
    ok-text="生成并预览"
    @ok="handleSheetGenerate"
  >
    <a-form layout="vertical">
      <a-form-item label="选择题数量">
        <a-input-number v-model:value="sheetGenForm.choiceCount" :min="0" :max="200" style="width:100%" />
      </a-form-item>
      <a-form-item label="判断题数量">
        <a-input-number v-model:value="sheetGenForm.trueFalseCount" :min="0" :max="100" style="width:100%" />
      </a-form-item>
      <a-form-item label="主观题名称（一行一个）">
        <a-textarea v-model:value="sheetGenForm.subjectNamesText" :rows="4" placeholder="三、简答题&#10;四、计算题&#10;五、论述题" />
      </a-form-item>
      <a-form-item label="每题预留行数（逗号分隔）">
        <a-input v-model:value="sheetGenForm.subjectLinesText" placeholder="5,8,10" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type {
  ExamAnswerSheetTemplateSaveRequest,
  ExamPageTemplateRequest,
  ExamPaperPageTemplateVO,
  ExamQuestionTemplateVO,
} from '@/apis/mark/exam-template'
import type { ExamTemplatePageRow } from '@/components/mark/ExamTemplatePageTable.vue'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getExamTemplate,
  isPaperTemplateNotConfiguredError,
  saveAnswerSheetTemplate,
} from '@/apis/mark/exam-template'
import { generateStandardAnswerSheet } from '@/apis/mark/paper-master'
import ExamTemplatePageTable from '@/components/mark/ExamTemplatePageTable.vue'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { hydrateTemplatePageFileNames } from '@/utils/mark-storage-file'

defineOptions({ name: 'TeacherAnswerSheetTemplate' })

const router = useRouter()
const pageTableRef = ref<InstanceType<typeof ExamTemplatePageTable> | null>(null)

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

let rowSeq = 0
function nextRowKey(): string {
  rowSeq += 1
  return `p-${rowSeq}-${Date.now()}`
}

const form = reactive<{ templateName: string, totalPages?: number }>({
  templateName: '',
  totalPages: undefined,
})
const pages = ref<ExamTemplatePageRow[]>([])

const questionTemplates = ref<ExamQuestionTemplateVO[]>([])
const questionCount = ref(0)
const hasQuestions = computed(() => questionCount.value > 0)
const totalPagesLabel = computed(() =>
  typeof form.totalPages === 'number' ? String(form.totalPages) : '未填写总页数',
)
const pageCountMatched = computed(
  () => typeof form.totalPages === 'number' && pages.value.length === form.totalPages,
)
const loading = ref(false)
const saving = ref(false)

// ─── 生成标准答题卡 ────────────────────────────────────────────

const sheetGenerateModalOpen = ref(false)
const sheetGenerating = ref(false)
const sheetGenForm = reactive({
  choiceCount: 0,
  trueFalseCount: 0,
  subjectNamesText: '',
  subjectLinesText: '',
})

function openSheetGenerateModal() {
  if (questionTemplates.value.length > 0) {
    const objectiveQuestions = questionTemplates.value.filter((q) => q.questionType === 'OBJECTIVE')
    const subjectiveQuestions = questionTemplates.value.filter((q) => q.questionType === 'SUBJECTIVE')
    sheetGenForm.choiceCount = objectiveQuestions.length
    sheetGenForm.trueFalseCount = 0
    sheetGenForm.subjectNamesText = subjectiveQuestions.length > 0
      ? subjectiveQuestions.map((q) => `第${q.questionNo}题`).join('\n')
      : ''
    sheetGenForm.subjectLinesText = subjectiveQuestions.length > 0
      ? subjectiveQuestions.map(() => '5').join(',')
      : ''
  }
  sheetGenerateModalOpen.value = true
}

async function handleSheetGenerate() {
  if (!selectedExamId.value) return
  sheetGenerating.value = true
  try {
    const names = sheetGenForm.subjectNamesText.trim()
      ? sheetGenForm.subjectNamesText.trim().split('\n').filter(Boolean)
: []
    const lines = sheetGenForm.subjectLinesText.trim()
      ? sheetGenForm.subjectLinesText.trim().split(',').map(Number).filter(n => !Number.isNaN(n))
: []
    const fileId = await generateStandardAnswerSheet({
      examId: selectedExamId.value,
      choiceCount: sheetGenForm.choiceCount,
      trueFalseCount: sheetGenForm.trueFalseCount,
      subjectNames: names.length > 0 ? names : undefined,
      subjectLines: lines.length > 0 ? lines : undefined,
    })
    const token = localStorage.getItem('token')
    if (token) {
      const url = new URL('/api/storage/filesystem/download', window.location.origin)
      url.searchParams.set('nodeId', fileId)
      const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      if (resp.ok) {
        const blob = await resp.blob()
        window.open(URL.createObjectURL(blob), '_blank')
      }
    }
    message.success('标准答题卡已生成，新窗口预览中')
    sheetGenerateModalOpen.value = false
  } catch (error) {
    showUserError(error, '生成标准答题卡失败')
  } finally { sheetGenerating.value = false }
}

function clearTemplate(): void {
  form.templateName = ''
  form.totalPages = undefined
  pages.value = []
  questionTemplates.value = []
  questionCount.value = 0
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
    rowKey: nextRowKey(),
    pageNo: p.pageNo,
    templateFileId: p.templateFileId,
    widthPx: p.widthPx,
    heightPx: p.heightPx,
  }))
  await hydrateTemplatePageFileNames(pages.value)
  questionTemplates.value = questionList
  questionCount.value = questionList.length
}

async function loadTemplate(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const tpl = await getExamTemplate(selectedExamId.value)
    await applyTemplate(tpl.templateName, tpl.totalPages, tpl.pages, tpl.questions)
  } catch (error) {
    clearTemplate()
    if (!(error instanceof Error && isPaperTemplateNotConfiguredError(error))) {
    showUserError(error, '答卷页模板加载失败')
      message.warning(getUserErrorMessage(error, '答卷页模板加载失败，请稍后重试'))
    }
  } finally {
    loading.value = false
  }
}

function goPaperTemplate(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspacePaperTemplate',
    params: { examId: selectedExamId.value },
  })
}

function addPage(): void {
  const row: ExamTemplatePageRow = {
    rowKey: nextRowKey(),
    pageNo: pages.value.length + 1,
  }
  pages.value = [...pages.value, row]
  pageTableRef.value?.openEditForNew(row)
}

function removePage(index: number): void {
  pages.value = pages.value.filter((_, i) => i !== index)
}

interface AnswerSheetPagesBuildResult {
  pages: ExamPageTemplateRequest[]
  totalPages: ExamAnswerSheetTemplateSaveRequest['totalPages']
}

function buildPagesRequest(): AnswerSheetPagesBuildResult | null {
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
  return { pages: request, totalPages: total }
}

async function handleSave(): Promise<void> {
  if (!selectedExamId.value) return
  const name = form.templateName.trim()
  if (!name) {
    message.error('模板名称必填')
    return
  }
  if (!hasQuestions.value) {
    message.error('当前考试尚未配置题目，请先到「试卷模板」页面录入题目结构。')
    return
  }
  const builtPages = buildPagesRequest()
  if (builtPages === null) return

  saving.value = true
  try {
    await saveAnswerSheetTemplate({
      examId: selectedExamId.value,
      templateName: name,
      totalPages: builtPages.totalPages,
      pages: builtPages.pages,
    })
    message.success('答卷页页面配置已保存')
    await loadTemplate()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '答卷页模板保存失败')
  } finally {
    saving.value = false
  }
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadTemplate()
  } else {
    clearTemplate()
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.sheet-page {
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

  &__alert {
    margin-bottom: 16px;
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
</style>
