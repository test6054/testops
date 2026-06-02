<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="sheet-page__context">
        <div class="sheet-page__context-left">
          <a-select
            :value="selectedExamId"
            class="sheet-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag v-if="selectedExamId && hasQuestions" tone="blue" size="sm">
            {{ questionCount }} 道题目
          </UiTag>
          <UiTag v-if="selectedExamId" tone="gray" size="sm">
            {{ pages.length }} / {{ totalPagesLabel }} 页
          </UiTag>
        </div>
        <div class="sheet-page__context-right">
          <UiButton size="sm" :disabled="!selectedExamId" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            保存
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择需要维护的考试" class="sheet-page__empty" />

    <UiErrorRetryPanel
      v-else-if="templateLoadError"
      :error="templateLoadError"
      title="答卷页模板加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="loadTemplate"
    />

    <a-spin v-else :spinning="loading">
      <UiAlertStrip
        v-if="!hasQuestions"
        tone="warning"
        title="题目结构尚未配置"
        description="保存模板要求题目列表非空。请先前往「试卷模板」页面新增题目，或在那里一次性完成完整配置。"
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
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ExamTemplatePageRow } from '@/components/mark/ExamTemplatePageTable.vue'
import ExamTemplatePageTable from '@/components/mark/ExamTemplatePageTable.vue'
import type {
  ExamAnswerSheetTemplateSaveRequest,
  ExamPageTemplateRequest,
  ExamPaperPageTemplateVO,
  ExamQuestionTemplateVO,
} from '@/apis/mark/exam'
import {
  getExamTemplate,
  isPaperTemplateNotConfiguredError,
  saveAnswerSheetTemplate,
} from '@/apis/mark/exam'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { hydrateTemplatePageFileNames } from '@/utils/mark-storage-file'

defineOptions({ name: 'TeacherAnswerSheetTemplate' })

const router = useRouter()
const pageTableRef = ref<InstanceType<typeof ExamTemplatePageTable> | null>(null)

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

let rowSeq = 0
function nextRowKey(): string {
  rowSeq += 1
  return `p-${rowSeq}-${Date.now()}`
}

const form = reactive<{ templateName: string; totalPages?: number }>({
  templateName: '',
  totalPages: undefined,
})
const pages = ref<ExamTemplatePageRow[]>([])

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
const templateLoadError = ref<Error | null>(null)

function clearTemplate(): void {
  form.templateName = ''
  form.totalPages = undefined
  pages.value = []
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
  questionCount.value = questionList.length
}

async function loadTemplate(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  templateLoadError.value = null
  try {
    const tpl = await getExamTemplate(selectedExamId.value)
    await applyTemplate(tpl.templateName, tpl.totalPages, tpl.pages, tpl.questions)
  } catch (error) {
    clearTemplate()
    if (!(error instanceof Error && isPaperTemplateNotConfiguredError(error))) {
      templateLoadError.value = toUserError(error, '答卷页模板加载失败')
      message.warning(getUserErrorMessage(error, '答卷页模板加载失败，请稍后重试'))
    }
  } finally {
    loading.value = false
  }
}

function handleExamChange(
  value: SelectValue,
  option: DefaultOptionType | DefaultOptionType[],
): void {
  onExamChange(value, option)
  if (selectedExamId.value) {
    void loadTemplate()
  } else {
    clearTemplate()
  }
}

function goPaperTemplate(): void {
  void router.push({
    name: 'TeacherPaperTemplate',
    query: selectedExamId.value ? { examId: selectedExamId.value } : {},
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
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadTemplate()
  }
})
</script>

<style lang="scss" scoped>
.sheet-page {
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

  &__alert {
    margin-bottom: 16px;
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
</style>
