<template>
  <GiPageLayout>
    <div class="sheet-page">
      <PageHeader title="答题卡模板">
        <template #tags>
          <UiTag v-if="selectedExamId && hasQuestions" tone="blue" size="md">
            {{ serverQuestions.length }} 道题目
          </UiTag>
          <UiTag v-if="selectedExamId" tone="gray" size="md"
            >{{ pages.length }} / {{ form.totalPages ?? '-' }} 页</UiTag
          >
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
        <a-alert
          v-if="!hasQuestions"
          type="warning"
          show-icon
          message="题目结构尚未配置"
          description="保存模板要求题目列表非空。请先前往「试卷模板」页面新增题目，或在那里一次性完成完整配置。"
          style="margin-bottom: 16px"
        >
          <template #action>
            <UiButton size="sm" variant="outline" @click="goPaperTemplate">前往试卷模板</UiButton>
          </template>
        </a-alert>

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
              <UiTag tone="blue" size="sm">
                现有题目 {{ serverQuestions.length }} 道（保存时保留）
              </UiTag>
            </a-form-item>
          </a-form>
        </UiCard>

        <UiCard class="info-card">
          <template #title>
            <FileImageOutlined />
            <span>页面文件配置</span>
            <UiBadge tone="blue"> {{ pages.length }} / {{ form.totalPages ?? '-' }} </UiBadge>
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
            class="sheet-table"
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
                    <UiButton size="sm" variant="outline" :loading="record.uploading">
                      <template #icon>
                        <UploadOutlined />
                      </template>
                      {{ record.templateFileId ? '替换' : '上传' }}
                    </UiButton>
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
                <UiButton size="sm" variant="ghost" @click="removePage(index)"> 删除 </UiButton>
              </template>
            </template>
          </a-table>
        </UiCard>
      </a-spin>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamPageTemplatePayload,
  ExamPaperPageTemplateVO,
  ExamQuestionTemplatePayload,
  ExamQuestionTemplateVO,
  ExamSummaryVO,
} from '@/apis/mark/exam'
import { getExamTemplate, pageExams, saveExamTemplate } from '@/apis/mark/exam'
import FileImageOutlined from '@ant-design/icons-vue/FileImageOutlined'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadFile } from '@/apis/edu/file-management'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherAnswerSheetTemplate' })

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

let rowSeq = 0
function nextRowKey(): string {
  rowSeq += 1
  return `p-${rowSeq}-${Date.now()}`
}

const selectedExamId = ref<string | undefined>(
  route.query.examId ? String(route.query.examId) : undefined,
)
const examOptions = ref<Array<{ label: string; value: string }>>([])
const examOptionsLoading = ref(false)

const form = reactive<{ templateName: string; totalPages?: number }>({
  templateName: '',
  totalPages: undefined,
})
const pages = reactive<PageRow[]>([])

/** 服务器端已有题目，保存时原样带回，避免被全量替换为空 */
const serverQuestions = ref<ExamQuestionTemplateVO[]>([])
const hasQuestions = computed(() => serverQuestions.value.length > 0)
const uploadedCount = computed(() => pages.filter((p) => !!p.templateFileId).length)

const loading = ref(false)
const saving = ref(false)

const pageColumns: ColumnType<PageRow>[] = [
  { title: '页号', key: 'pageNo', width: 100 },
  { title: '模板文件', key: 'templateFile', width: 320 },
  { title: '宽度（px）', key: 'widthPx', width: 130 },
  { title: '高度（px）', key: 'heightPx', width: 130 },
  { title: '操作', key: 'pageActions', width: 90, fixed: 'right' },
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
  serverQuestions.value = []
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
      rowKey: nextRowKey(),
      pageNo: p.pageNo,
      templateFileId: p.templateFileId,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
    })
  })
  serverQuestions.value = questionList
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
      errMsg &&
      !errMsg.includes('未找到') &&
      !errMsg.includes('不存在') &&
      !errMsg.includes('当前模板')
    ) {
      message.warning(`当前考试尚未配置完整模板：${errMsg}`)
    }
  } finally {
    loading.value = false
  }
}

function handleExamChange(value: string | undefined): void {
  selectedExamId.value = value
  void router.replace({ query: value ? { examId: value } : {} })
  if (value) {
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
  pages.push({
    rowKey: nextRowKey(),
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
  return false
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

function buildQuestionsPayload(): ExamQuestionTemplatePayload[] {
  return serverQuestions.value.map((q) => ({
    questionNo: q.questionNo,
    questionType: q.questionType,
    fullScore: typeof q.fullScore === 'number' ? q.fullScore : Number(q.fullScore),
    pageNo: q.pageNo,
    x: q.x,
    y: q.y,
    width: q.width,
    height: q.height,
    sortNo: q.sortNo,
    knowledgeId: q.knowledgeId,
  }))
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
  const pagesPayload = buildPagesPayload()
  if (pagesPayload === null) return

  saving.value = true
  try {
    await saveExamTemplate({
      examId: selectedExamId.value,
      templateName: name,
      totalPages: form.totalPages,
      pages: pagesPayload,
      questions: buildQuestionsPayload(),
    })
    message.success('页面配置已保存（题目结构保持不变）')
    await loadTemplate()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '保存失败'
    message.error(errMsg)
  } finally {
    saving.value = false
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
.sheet-page {
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

.sheet-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.empty-block {
  padding: 60px 0;
}
</style>
