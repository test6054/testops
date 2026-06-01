<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="paper-master-page__context">
        <div class="paper-master-page__context-left">
          <a-select
            :value="selectedExamId"
            class="paper-master-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag
            v-if="masterData"
            :tone="masterData.status === 'ACTIVE' ? 'green' : 'gray'"
            size="sm"
          >
            {{ masterData.status === 'ACTIVE' ? '已生效' : '草稿' }}
          </UiTag>
        </div>
        <div class="paper-master-page__context-right">
          <UiButton size="sm" :disabled="!selectedExamId" :loading="saving" @click="handleSave">
            <template #icon><SaveOutlined /></template>
            保存母版
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择需要维护母版的考试"
      class="paper-master-page__empty"
    />

    <!-- D-9 错误态：试卷母版加载遇到非“未配置”错误时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="masterLoadError"
      :error="masterLoadError"
      title="试卷母版加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="loadMasterData"
    />

    <a-spin v-else :spinning="loading">
      <!-- PDF 预览区 -->
      <UiCard v-if="pdfPreviewUrl || pdfPreviewLoading" class="preview-card">
        <template #title>
          <EyeOutlined />
          <span>母版 PDF 预览</span>
        </template>
        <template #extra>
          <a-button v-if="pdfPreviewUrl" type="link" size="small" @click="openPdfInNewTab">
            新窗口打开
          </a-button>
          <a-button type="link" size="small" @click="closePdfPreview">关闭预览</a-button>
        </template>
        <a-spin :spinning="pdfPreviewLoading">
          <iframe v-if="pdfPreviewUrl" :src="pdfPreviewUrl" class="pdf-iframe" />
          <div v-else class="pdf-placeholder">正在加载 PDF…</div>
        </a-spin>
      </UiCard>

      <!-- 基本信息 -->
      <UiCard class="info-card">
        <template #title>
          <FileTextOutlined />
          <span>母版基本信息</span>
        </template>
        <a-form layout="inline">
          <a-form-item label="母版名称" required>
            <a-input
              v-model:value="form.masterName"
              placeholder="例如：2026 春《工程制图》期末母版"
              :maxlength="100"
              style="width: 360px"
            />
          </a-form-item>
          <a-form-item label="母版 PDF">
            <a-upload :before-upload="handleBeforeUpload" :show-upload-list="false" accept=".pdf">
              <UiButton size="sm" :loading="uploading">
                <template #icon><UploadOutlined /></template>
                {{ form.masterFileId ? '重新上传' : '上传 PDF' }}
              </UiButton>
            </a-upload>
            <span v-if="uploadedFileName" class="uploaded-hint">{{ uploadedFileName }}</span>
            <UiButton
              v-if="form.masterFileId"
              size="sm"
              style="margin-left: 8px"
              @click="previewPdf"
            >
              <template #icon><EyeOutlined /></template>
              预览
            </UiButton>
          </a-form-item>
          <a-form-item label="防伪水印">
            <a-input
              v-model:value="form.watermarkText"
              placeholder="可选，印刷在每页的水印文字"
              :maxlength="200"
              style="width: 280px"
            />
          </a-form-item>
        </a-form>
      </UiCard>

      <!-- 身份填涂区 -->
      <UiCard class="area-card">
        <template #title>
          <ProfileOutlined />
          <span>身份填涂区（{{ identityAreas.length }}）</span>
        </template>
        <template #extra>
          <UiButton size="sm" @click="addIdentityArea">
            <template #icon><PlusOutlined /></template>
            新增
          </UiButton>
        </template>
        <UiDataTable
          :columns="identityColumns"
          :data-source="identityAreas"
          :show-pagination="false"
          flat
          :total="identityAreas.length"
          row-key="rowKey"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'areaType'">
              <a-select
                v-model:value="record.areaType"
                style="width: 140px"
                :options="identityAreaTypeOptions"
                placeholder="选择类型"
              />
            </template>
            <template v-else-if="column.key === 'pageNo'">
              <a-input-number
                v-model:value="record.pageNo"
                :min="1"
                :max="99"
                style="width: 80px"
              />
            </template>
            <template v-else-if="column.key === 'x'">
              <a-input-number v-model:value="record.x" :min="0" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'y'">
              <a-input-number v-model:value="record.y" :min="0" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'width'">
              <a-input-number v-model:value="record.width" :min="1" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'height'">
              <a-input-number v-model:value="record.height" :min="1" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'fillCellCount'">
              <a-input-number v-model:value="record.fillCellCount" :min="0" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" danger size="small" @click="removeIdentityArea(index)">
                删除
              </a-button>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <!-- 客观题填涂区 -->
      <UiCard class="area-card">
        <template #title>
          <ProfileOutlined />
          <span>客观题填涂区（{{ objectiveAreas.length }}）</span>
        </template>
        <template #extra>
          <UiButton size="sm" @click="addObjectiveArea">
            <template #icon><PlusOutlined /></template>
            新增
          </UiButton>
        </template>
        <UiDataTable
          :columns="objectiveColumns"
          :data-source="objectiveAreas"
          :show-pagination="false"
          flat
          :total="objectiveAreas.length"
          row-key="rowKey"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'questionTemplateId'">
              <a-select
                v-model:value="record.questionTemplateId"
                placeholder="选择题目"
                :options="questionOptions"
                :loading="questionsLoading"
                show-search
                option-filter-prop="label"
                style="width: 220px"
              />
            </template>
            <template v-else-if="column.key === 'pageNo'">
              <a-input-number
                v-model:value="record.pageNo"
                :min="1"
                :max="99"
                style="width: 80px"
              />
            </template>
            <template v-else-if="column.key === 'options'">
              <div class="objective-options">
                <div
                  v-for="option in record.options"
                  :key="option.sortNo"
                  class="objective-options__item"
                >
                  <a-input
                    v-model:value="option.optionLabel"
                    :maxlength="8"
                    size="small"
                    class="objective-options__input"
                  />
                  <a-button
                    type="link"
                    danger
                    size="small"
                    class="objective-options__remove"
                    @click="removeObjectiveOption(record, option.sortNo)"
                  >
                    删除
                  </a-button>
                </div>
                <a-button size="small" type="link" @click="addObjectiveOption(record)">
                  添加选项
                </a-button>
              </div>
            </template>
            <template v-else-if="column.key === 'x'">
              <a-input-number v-model:value="record.x" :min="0" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'y'">
              <a-input-number v-model:value="record.y" :min="0" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'boxWidth'">
              <a-input-number v-model:value="record.boxWidth" :min="1" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'boxHeight'">
              <a-input-number v-model:value="record.boxHeight" :min="1" style="width: 80px" />
            </template>
            <template v-else-if="column.key === 'optionsSummary'">
              <UiTag size="sm" tone="blue"> {{ record.options.length }} 项 </UiTag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" danger size="small" @click="removeObjectiveArea(index)">
                删除
              </a-button>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </a-spin>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam'
import type {
  PaperMasterIdentityAreaRequest,
  PaperMasterObjectiveAreaRequest,
  PaperMasterVO,
} from '@/apis/mark/paper-master'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import FileTextOutlined from '@ant-design/icons-vue/FileTextOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { getFileArrayBuffer, uploadFile } from '@/apis/edu/file-management'
import { getExamTemplate } from '@/apis/mark/exam'
import {
  getPaperMaster,
  isPaperMasterNotConfiguredError,
  savePaperMaster,
} from '@/apis/mark/paper-master'
import {
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { showUserError, toUserError } from '@/utils/error-handler'

defineOptions({ name: 'TeacherPaperMaster' })

// ─── B-8 统一考试选择器：复用 useMarkExamSelector，支持 URL/全局上下文同步 ─────
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 母版表单 ────────────────────────────────────────────────────────

const loading = ref(false)
const saving = ref(false)
// D-9 错误态：仅当后端返回非“未配置”类错误时才上报
const masterLoadError = ref<Error | null>(null)
const uploading = ref(false)
const uploadedFileName = ref('')
const masterData = ref<PaperMasterVO | null>(null)

const form = reactive({
  masterName: '',
  masterFileId: '',
  watermarkText: '',
})

// ─── 身份填涂区 ──────────────────────────────────────────────────────

interface IdentityAreaRow extends PaperMasterIdentityAreaRequest {
  rowKey: string
}

const identityAreas = ref<IdentityAreaRow[]>([])
let identitySeq = 0

const identityAreaTypeOptions = [
  { label: '学号', value: 'STUDENT_NO' },
  { label: '姓名', value: 'NAME' },
  { label: '准考证号', value: 'ADMISSION_NO' },
  { label: '条形码', value: 'BARCODE' },
  { label: '二维码', value: 'QRCODE' },
]

function addIdentityArea() {
  identitySeq++
  identityAreas.value.push({
    rowKey: `id-${identitySeq}`,
    areaType: 'STUDENT_NO',
    pageNo: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    fillCellCount: undefined,
  })
}

function removeIdentityArea(index: number) {
  identityAreas.value.splice(index, 1)
}

const identityColumns: ColumnType[] = [
  { title: '区域类型', key: 'areaType', width: 160 },
  { title: '页号', key: 'pageNo', width: 90 },
  { title: 'X', key: 'x', width: 90 },
  { title: 'Y', key: 'y', width: 90 },
  { title: '宽', key: 'width', width: 90 },
  { title: '高', key: 'height', width: 90 },
  { title: '填涂格数', key: 'fillCellCount', width: 100 },
  { title: '操作', key: 'action', width: 80 },
]

// ─── 客观题填涂区 ────────────────────────────────────────────────────

interface ObjectiveAreaRow extends PaperMasterObjectiveAreaRequest {
  rowKey: string
}

const objectiveAreas = ref<ObjectiveAreaRow[]>([])
const questionsLoading = ref(false)
const questions = ref<ExamQuestionTemplateVO[]>([])
const questionOptions = computed(() =>
  questions.value.map((item) => {
    const parts = [`第 ${item.questionNo} 题`, item.questionType, `${item.fullScore} 分`]
    if (item.questionStem) {
      parts.push(item.questionStem)
    }
    return {
      label: parts.join(' · '),
      value: item.questionTemplateId,
    }
  }),
)
let objectiveSeq = 0
const DEFAULT_OBJECTIVE_OPTIONS = ['A', 'B', 'C', 'D']

function createObjectiveOptions(labels: string[] = DEFAULT_OBJECTIVE_OPTIONS) {
  return labels.map((optionLabel, index) => ({
    optionLabel,
    sortNo: index + 1,
  }))
}

function addObjectiveArea() {
  objectiveSeq++
  objectiveAreas.value.push({
    rowKey: `obj-${objectiveSeq}`,
    questionTemplateId: '',
    pageNo: 1,
    options: createObjectiveOptions(),
    x: 0,
    y: 0,
    boxWidth: 20,
    boxHeight: 10,
  })
}

function removeObjectiveArea(index: number) {
  objectiveAreas.value.splice(index, 1)
}

function addObjectiveOption(row: ObjectiveAreaRow) {
  row.options.push({
    optionLabel: String.fromCharCode(65 + row.options.length),
    sortNo: row.options.length + 1,
  })
}

function removeObjectiveOption(row: ObjectiveAreaRow, sortNo: number) {
  row.options = row.options
    .filter((option) => option.sortNo !== sortNo)
    .map((option, index) => ({
      optionLabel: option.optionLabel,
      sortNo: index + 1,
    }))
}

const objectiveColumns: ColumnType[] = [
  { title: '题目', key: 'questionTemplateId', width: 240 },
  { title: '页号', key: 'pageNo', width: 90 },
  { title: '选项', key: 'options', width: 180 },
  { title: 'X', key: 'x', width: 90 },
  { title: 'Y', key: 'y', width: 90 },
  { title: '框宽', key: 'boxWidth', width: 90 },
  { title: '框高', key: 'boxHeight', width: 90 },
  { title: '选项数', key: 'optionsSummary', width: 100 },
  { title: '操作', key: 'action', width: 80 },
]

// ─── 数据加载 ────────────────────────────────────────────────────────

async function loadQuestions() {
  if (!selectedExamId.value) return
  questionsLoading.value = true
  try {
    const template = await getExamTemplate(selectedExamId.value)
    questions.value = template.questions
  } catch (error) {
    questions.value = []
    showUserError(error, '题目列表加载失败')
    throw error
  } finally {
    questionsLoading.value = false
  }
}

async function loadMasterData() {
  if (!selectedExamId.value) return
  loading.value = true
  masterLoadError.value = null
  try {
    await loadQuestions()
    const res = await getPaperMaster(selectedExamId.value)
    masterData.value = res
    if (res) {
      form.masterName = res.masterName ?? ''
      form.masterFileId = res.masterFileId ?? ''
      form.watermarkText = res.watermarkText ?? ''
      uploadedFileName.value = ''

      identityAreas.value = res.identityAreas.map((a, i) => ({
        rowKey: `id-loaded-${i}`,
        areaType: a.areaType,
        pageNo: a.pageNo,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        fillCellCount: a.fillCellCount,
      }))
      identitySeq = identityAreas.value.length

      const invalidObjectiveArea = res.objectiveAreas.find(
        (a) =>
          !questions.value.some((question) => question.questionTemplateId === a.questionTemplateId),
      )
      if (invalidObjectiveArea) {
        objectiveAreas.value = []
        masterLoadError.value = new Error(
          '试卷母版引用的题目已不在当前考试模板中，请先完成数据治理',
        )
        return
      }

      objectiveAreas.value = res.objectiveAreas.map((a, i) => ({
        rowKey: `obj-loaded-${i}`,
        questionTemplateId: a.questionTemplateId,
        pageNo: a.pageNo,
        options: a.options.map((option) => ({
          optionLabel: option.optionLabel,
          sortNo: option.sortNo,
        })),
        x: a.x,
        y: a.y,
        boxWidth: a.boxWidth,
        boxHeight: a.boxHeight,
      }))
      objectiveSeq = objectiveAreas.value.length
    }
  } catch (error) {
    masterData.value = null
    if (!(error instanceof Error)) {
      throw error
    }
    if (!isPaperMasterNotConfiguredError(error)) {
      // 真实加载失败：D-9 错误态 + 警告提示
      masterLoadError.value = toUserError(error, '试卷主数据加载失败')
    }
  } finally {
    loading.value = false
  }
}

function clearForm() {
  form.masterName = ''
  form.masterFileId = ''
  form.watermarkText = ''
  uploadedFileName.value = ''
  identityAreas.value = []
  objectiveAreas.value = []
  questions.value = []
  identitySeq = 0
  objectiveSeq = 0
  masterData.value = null
}

function handleExamChange(value: SelectValue): void {
  // 委托给 useMarkExamSelector 完成 URL/Store 同步，再驱动业务侧加载/清空
  onExamChange(value)
  if (selectedExamId.value) {
    void loadMasterData()
  } else {
    clearForm()
  }
}

// ─── 文件上传 ────────────────────────────────────────────────────────

async function handleBeforeUpload(file: File) {
  if (file.type !== 'application/pdf') {
    message.error('只能上传 PDF 文件')
    return false
  }
  uploading.value = true
  try {
    const res = await uploadFile(file, { businessType: 'EXAM_PAPER_MASTER' })
    form.masterFileId = res.id
    uploadedFileName.value = file.name
    message.success('上传成功')
  } catch (error) {
    showUserError(error, '母版 PDF 上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
  return false
}

// ─── 保存 ────────────────────────────────────────────────────────────

async function handleSave() {
  if (!selectedExamId.value) return
  if (!form.masterName.trim()) {
    message.warning('请填写母版名称')
    return
  }
  if (!form.masterFileId) {
    message.warning('请上传母版 PDF 文件')
    return
  }
  for (let i = 0; i < objectiveAreas.value.length; i += 1) {
    const row = objectiveAreas.value[i]
    if (!row.questionTemplateId) {
      message.warning(`客观题填涂区第 ${i + 1} 行：请选择题目`)
      return
    }
    if (row.options.length < 2) {
      message.warning(`客观题填涂区第 ${i + 1} 行：至少需要 2 个选项`)
      return
    }
    const labels = new Set<string>()
    for (let j = 0; j < row.options.length; j += 1) {
      const label = row.options[j].optionLabel.trim()
      if (!label) {
        message.warning(`客观题填涂区第 ${i + 1} 行：第 ${j + 1} 个选项不能为空`)
        return
      }
      if (labels.has(label)) {
        message.warning(`客观题填涂区第 ${i + 1} 行：选项「${label}」重复`)
        return
      }
      labels.add(label)
    }
  }

  saving.value = true
  try {
    await savePaperMaster({
      examId: selectedExamId.value,
      masterName: form.masterName.trim(),
      masterFileId: form.masterFileId,
      watermarkText: form.watermarkText?.trim() || undefined,
      identityAreas: identityAreas.value.map((a) => ({
        areaType: a.areaType,
        pageNo: a.pageNo,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        fillCellCount: a.fillCellCount,
      })),
      objectiveAreas: objectiveAreas.value.map((a) => ({
        questionTemplateId: a.questionTemplateId,
        pageNo: a.pageNo,
        options: a.options.map((option) => ({
          optionLabel: option.optionLabel.trim(),
          sortNo: option.sortNo,
        })),
        x: a.x,
        y: a.y,
        boxWidth: a.boxWidth,
        boxHeight: a.boxHeight,
      })),
    })
    message.success('母版保存成功')
    await loadMasterData()
  } catch (error) {
    showUserError(error, '试卷母版保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// ─── PDF 预览 ────────────────────────────────────────────────────────

const pdfPreviewUrl = ref<string | null>(null)
const pdfPreviewLoading = ref(false)

async function previewPdf() {
  if (!form.masterFileId) {
    message.warning('暂无母版 PDF 文件')
    return
  }
  closePdfPreview()
  pdfPreviewLoading.value = true
  try {
    const buffer = await getFileArrayBuffer({ nodeId: form.masterFileId })
    const blob = new Blob([buffer], { type: 'application/pdf' })
    pdfPreviewUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    showUserError(error, '母版 PDF 预览加载失败，请稍后重试')
  } finally {
    pdfPreviewLoading.value = false
  }
}

function openPdfInNewTab() {
  if (pdfPreviewUrl.value) {
    window.open(pdfPreviewUrl.value, '_blank', 'noopener,noreferrer')
  }
}

function closePdfPreview() {
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value)
    pdfPreviewUrl.value = null
  }
}

onBeforeUnmount(() => {
  closePdfPreview()
})

// ─── 初始化 ──────────────────────────────────────────────────────────

onMounted(async () => {
  await initExamSelector()
  // URL → 组件初次加载时若有 examId，watch(selectedExamId) 会自动触发 loadMasterData
})

watch(
  selectedExamId,
  (val) => {
    if (val) {
      loadMasterData()
    }
  },
  { immediate: false },
)
</script>

<style lang="scss" scoped>
.paper-master-page {
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
    margin-top: 80px;
  }

  .empty-block {
    margin-top: 80px;
  }

  .preview-card {
    margin-bottom: 16px;

    .pdf-iframe {
      width: 100%;
      height: 600px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
    }

    .pdf-placeholder {
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-3);
      font-size: 13px;
    }
  }

  .info-card {
    margin-bottom: 16px;
  }

  .area-card {
    margin-bottom: 16px;
  }

  .uploaded-hint {
    margin-left: 8px;
    color: var(--color-text-3);
    font-size: 13px;
  }

  .objective-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 148px;
  }

  .objective-options__item {
    display: grid;
    grid-template-columns: minmax(56px, 1fr) 42px;
    align-items: center;
    column-gap: 6px;
  }

  .objective-options__input {
    width: 100%;
  }

  .objective-options__remove {
    padding: 0;
  }
}
</style>
