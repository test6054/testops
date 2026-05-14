<script setup lang="ts">
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
/**
 * 成绩 Excel 异步导入工作台
 *
 * 主链（严格对齐后端 ScoreBatchController）：
 * 1. 选择 质量评价课程 + 考核环节 + 学年 / 学期 -> 填批次编码 / 名称 -> 上传 Excel
 *    上传后调用 edu-storage 得到 sourceFileId，再调用 /api/quality/score-batches/create 注册批次
 * 2. POST /enqueue-parse 触发异步解析，状态机：PENDING -> PARSING -> PREVIEW_READY / FAILED
 * 3. PREVIEW_READY 后 POST /preview 拿到 ScoreImportPreviewVO（含 diagnostics），人工核对
 * 4. POST /validate 进入 VALIDATED，POST /confirm 进入 CONFIRMED，进入达成度计算可用来源
 * 5. 任意阶段可 POST /update-status?status=CANCELLED 取消
 */
import type {
  AssessmentItemVO,
  QualityCourseVO,
  ScoreBatchQueryPayload,
  ScoreBatchSavePayload,
  ScoreBatchStatus,
  ScoreBatchVO,
  ScoreImportRowDiagnostic,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import {
  assessmentItemApi,
  qualityCourseApi,
  SCORE_BATCH_STATUS_COLOR,
  SCORE_BATCH_STATUS_LABEL,
  scoreBatchApi,
} from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

const batches = ref<ScoreBatchVO[]>([])
const total = ref(0)
const loading = ref(false)
const uploading = ref(false)

const previewVisible = ref(false)
const previewLoading = ref(false)
const diagnostics = ref<ScoreImportRowDiagnostic[]>([])
const previewBatch = ref<ScoreBatchVO | null>(null)
const previewSummary = reactive({
  totalRows: 0,
  successRows: 0,
  errorRows: 0,
  errorSummary: '' as string | undefined,
})

const courseOptions = ref<QualityCourseVO[]>([])
/** 上传表单下拉选择器用的考核环节列表（随 uploadForm.qualityCourseId 切换） */
const uploadAssessmentItems = ref<AssessmentItemVO[]>([])
const uploadAssessmentLoading = ref(false)
/** 查询表单下拉选择器用的考核环节列表（随 query.qualityCourseId 切换） */
const queryAssessmentItems = ref<AssessmentItemVO[]>([])
const queryAssessmentLoading = ref(false)

const query = reactive<ScoreBatchQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  qualityCourseId: '',
  assessmentItemId: '',
  status: undefined,
  sourceMode: undefined,
  keyword: '',
})

const SOURCE_MODE_OPTIONS = [
  { value: 'EXCEL_IMPORT', label: 'Excel 异步导入' },
  { value: 'EXTERNAL_AI_CONNECTOR', label: '外部 AI 解析草稿' },
  { value: 'READ_ONLY_DATABASE_PULL', label: '只读数据库主动拔取' },
  { value: 'MANUAL_CONFIRMATION', label: '人工录入与确认' },
]

const uploadForm = reactive<ScoreBatchSavePayload & { fileName?: string }>({
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: 'EXCEL_IMPORT',
  schoolYear: qualityStore.currentSchoolYear || '2024-2025',
  semester: qualityStore.currentSemester || '1',
  fileName: '',
})

const statusOptions = Object.entries(SCORE_BATCH_STATUS_LABEL).map(([value, label]) => ({ value, label }))

const courseSelectOptions = computed(() =>
  courseOptions.value.map(item => ({
    value: item.id,
    label: `${item.courseCode} · ${item.courseName}`,
  })),
)

const uploadAssessmentItemOptions = computed(() =>
  uploadAssessmentItems.value.map(item => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

const queryAssessmentItemOptions = computed(() =>
  queryAssessmentItems.value.map(item => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

async function loadCourses() {
  if (!qualityStore.currentTrainingPlanId) {
    courseOptions.value = []
    return
  }
  const page = await qualityCourseApi.page({
    pageNum: 1,
    pageSize: 100,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    enabled: true,
  })
  courseOptions.value = page.list
}

async function loadUploadAssessmentItems(qualityCourseId: string | undefined) {
  if (!qualityCourseId) {
    uploadAssessmentItems.value = []
    return
  }
  uploadAssessmentLoading.value = true
  try {
    uploadAssessmentItems.value = await assessmentItemApi.listByCourse(qualityCourseId)
  }
  catch (e) {
    console.error('[score-batch] 加载上传表单考核环节列表失败', e)
    uploadAssessmentItems.value = []
    message.error('加载考核环节列表失败')
  }
  finally {
    uploadAssessmentLoading.value = false
  }
}

async function loadQueryAssessmentItems(qualityCourseId: string | undefined) {
  if (!qualityCourseId) {
    queryAssessmentItems.value = []
    return
  }
  queryAssessmentLoading.value = true
  try {
    queryAssessmentItems.value = await assessmentItemApi.listByCourse(qualityCourseId)
  }
  catch (e) {
    console.error('[score-batch] 加载查询表单考核环节列表失败', e)
    queryAssessmentItems.value = []
  }
  finally {
    queryAssessmentLoading.value = false
  }
}

async function loadBatches() {
  loading.value = true
  try {
    const page = await scoreBatchApi.page({
      ...query,
      qualityCourseId: query.qualityCourseId || undefined,
      assessmentItemId: query.assessmentItemId || undefined,
      status: query.status || undefined,
      sourceMode: query.sourceMode || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    batches.value = page.list
    total.value = page.total
  }
  finally {
    loading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  loadBatches()
}

function resetQuery() {
  query.pageNum = 1
  query.qualityCourseId = ''
  query.assessmentItemId = ''
  query.status = undefined
  query.sourceMode = undefined
  query.keyword = ''
  loadBatches()
}

async function handleUpload(options: UploadRequestOption) {
  if (!uploadForm.qualityCourseId) {
    message.warning('请先选择质量评价课程')
    options.onError?.(new Error('课程未选择'))
    return
  }
  if (!uploadForm.assessmentItemId) {
    message.warning('请填写考核环节 ID（后端必填）')
    options.onError?.(new Error('考核环节未填写'))
    return
  }
  if (!uploadForm.batchCode.trim() || !uploadForm.batchName.trim()) {
    message.warning('请填写批次编码与名称')
    options.onError?.(new Error('批次编码 / 名称未填写'))
    return
  }
  uploading.value = true
  try {
    const file = options.file as File
    // 步骤 1：上传 Excel 到 edu-storage 拿 sourceFileId
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_SCORE_IMPORT' })
    const sourceFileId = String(uploaded.id)
    // 步骤 2：注册成绩批次
    const batchId = await scoreBatchApi.create({
      qualityCourseId: uploadForm.qualityCourseId,
      assessmentItemId: uploadForm.assessmentItemId,
      batchCode: uploadForm.batchCode.trim(),
      batchName: uploadForm.batchName.trim(),
      sourceMode: uploadForm.sourceMode || 'EXCEL_IMPORT',
      sourceFileId,
      schoolYear: uploadForm.schoolYear || undefined,
      semester: uploadForm.semester || undefined,
    })
    // 步骤 3：触发解析
    await scoreBatchApi.enqueueParse(batchId)
    message.success(`已提交导入 batchId=${batchId}，解析完成后可预览并确认`)
    options.onSuccess?.({}, file)
    await loadBatches()
  }
  catch (err) {
    options.onError?.(err as Error)
  }
  finally {
    uploading.value = false
  }
}

async function openPreview(record: ScoreBatchVO) {
  previewBatch.value = record
  previewVisible.value = true
  previewLoading.value = true
  try {
    const preview = await scoreBatchApi.preview(record.id)
    diagnostics.value = preview.diagnostics || []
    previewSummary.totalRows = preview.totalRows ?? 0
    previewSummary.successRows = preview.successRows ?? 0
    previewSummary.errorRows = preview.errorRows ?? 0
    previewSummary.errorSummary = preview.errorSummary
  }
  finally {
    previewLoading.value = false
  }
}

async function handleValidate(record: ScoreBatchVO) {
  Modal.confirm({
    title: '校验该批次？',
    content: `批次 ${record.id} 校验通过后将进入 VALIDATED 状态，是否继续？`,
    onOk: async () => {
      await scoreBatchApi.validate(record.id)
      message.success('批次已校验')
      await loadBatches()
    },
  })
}

async function handleConfirm(record: ScoreBatchVO) {
  Modal.confirm({
    title: '确认该批次？',
    content: `批次 ${record.id} 确认后将参与达成度计算，是否继续？`,
    onOk: async () => {
      await scoreBatchApi.confirm(record.id)
      message.success('批次已确认')
      await loadBatches()
    },
  })
}

async function handleCancel(record: ScoreBatchVO) {
  Modal.confirm({
    title: '取消该批次？',
    content: `批次 ${record.id} 取消后不再参与达成度计算`,
    okType: 'danger',
    onOk: async () => {
      await scoreBatchApi.updateStatus({
        id: record.id,
        status: 'CANCELLED',
      })
      message.success('批次已取消')
      await loadBatches()
    },
  })
}

async function handleReParse(record: ScoreBatchVO) {
  Modal.confirm({
    title: '重新解析该批次？',
    content: `仅 PENDING / FAILED 状态可触发；当前状态：${SCORE_BATCH_STATUS_LABEL[record.status]}`,
    onOk: async () => {
      await scoreBatchApi.enqueueParse(record.id)
      message.success('已重新触发解析')
      await loadBatches()
    },
  })
}

/* ========== 编辑 / 删除批次 ========== */

const editorVisible = ref(false)
const editorSubmitting = ref(false)
const editor = reactive<ScoreBatchSavePayload>({
  id: undefined,
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: 'EXCEL_IMPORT',
  sourceFileId: undefined,
  externalPullTaskId: undefined,
  schoolYear: '',
  semester: '',
})
const editorAssessmentItems = ref<AssessmentItemVO[]>([])

const editorAssessmentItemOptions = computed(() =>
  editorAssessmentItems.value.map(item => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

async function openEdit(record: ScoreBatchVO) {
  editor.id = record.id
  editor.qualityCourseId = record.qualityCourseId
  editor.assessmentItemId = record.assessmentItemId || ''
  editor.batchCode = record.batchCode
  editor.batchName = record.batchName
  editor.sourceMode = record.sourceMode
  editor.sourceFileId = record.sourceFileId
  editor.externalPullTaskId = record.externalPullTaskId
  editor.schoolYear = record.schoolYear || ''
  editor.semester = record.semester || ''
  try {
    editorAssessmentItems.value = await assessmentItemApi.listByCourse(record.qualityCourseId)
  }
  catch {
    editorAssessmentItems.value = []
  }
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.batchCode.trim() || !editor.batchName.trim()) {
    message.error('请填写批次编码与名称')
    return
  }
  if (!editor.qualityCourseId || !editor.assessmentItemId) {
    message.error('课程与考核环节不能为空')
    return
  }
  editorSubmitting.value = true
  try {
    await scoreBatchApi.update({
      ...editor,
      batchCode: editor.batchCode.trim(),
      batchName: editor.batchName.trim(),
      schoolYear: editor.schoolYear?.trim() || undefined,
      semester: editor.semester?.trim() || undefined,
    })
    message.success('批次已更新')
    editorVisible.value = false
    await loadBatches()
  }
  finally {
    editorSubmitting.value = false
  }
}

function canEdit(status: ScoreBatchStatus) {
  // CONFIRMED 被后端锁住，其余状态允许修改元数据
  return status !== 'CONFIRMED'
}

function canDelete(status: ScoreBatchStatus) {
  // 仅安全状态允许物理删除；已 CONFIRMED 禁止删除以保护达成度计算血缘
  return status === 'PENDING' || status === 'FAILED' || status === 'CANCELLED'
}

async function handleDelete(record: ScoreBatchVO) {
  Modal.confirm({
    title: `删除批次 ${record.batchCode}？`,
    content: '删除后批次及关联成绩明细会被清除，该操作不可恢复，请谨慎操作。',
    okType: 'danger',
    onOk: async () => {
      await scoreBatchApi.delete(record.id)
      message.success('已删除')
      await loadBatches()
    },
  })
}

function canValidate(status: ScoreBatchStatus) {
  return status === 'PREVIEW_READY'
}
function canConfirm(status: ScoreBatchStatus) {
  return status === 'VALIDATED'
}
/**
 * 后端 ScoreBatchServiceImpl.updateStatus 状态机：
 * - 仅检查：当前状态 != CONFIRMED（CONFIRMED 状态上锁）且 target != CONFIRMED（CONFIRMED 走 /confirm）
 * - 未限制源状态，因此 PENDING / PARSING / PREVIEW_READY / VALIDATED / FAILED 均可 → CANCELLED
 */
function canCancel(status: ScoreBatchStatus) {
  return status !== 'CONFIRMED' && status !== 'CANCELLED'
}
function canReParse(status: ScoreBatchStatus) {
  return status === 'PENDING' || status === 'FAILED'
}

watch(() => qualityStore.currentTrainingPlanId, async () => {
  await loadCourses()
  // 切换培养方案后课程 / 考核环节列表均失效，应重置选中项
  uploadForm.qualityCourseId = ''
  uploadForm.assessmentItemId = ''
  uploadAssessmentItems.value = []
  query.qualityCourseId = ''
  query.assessmentItemId = ''
  queryAssessmentItems.value = []
})

watch(() => uploadForm.qualityCourseId, async (courseId) => {
  uploadForm.assessmentItemId = ''
  await loadUploadAssessmentItems(courseId || undefined)
})

watch(() => query.qualityCourseId, async (courseId) => {
  query.assessmentItemId = ''
  await loadQueryAssessmentItems(courseId || undefined)
})

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await loadCourses()
  await loadBatches()
})
</script>

<template>
  <div class="score-batch-page">
    <a-card title="Excel 成绩导入" :bordered="false" class="upload-card">
      <a-form layout="inline" :model="uploadForm">
        <a-form-item label="课程" required>
          <a-select
            v-model:value="uploadForm.qualityCourseId"
            placeholder="选择质量评价课程"
            style="min-width: 240px"
            :options="courseSelectOptions"
          />
        </a-form-item>
        <a-form-item label="考核环节" required>
          <a-select
            v-model:value="uploadForm.assessmentItemId"
            placeholder="选择考核环节"
            style="min-width: 220px"
            :options="uploadAssessmentItemOptions"
            :loading="uploadAssessmentLoading"
            :disabled="!uploadForm.qualityCourseId"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="批次编码" required>
          <a-input v-model:value="uploadForm.batchCode" placeholder="batch_code" style="width: 160px" />
        </a-form-item>
        <a-form-item label="批次名称" required>
          <a-input v-model:value="uploadForm.batchName" placeholder="batch_name" style="width: 200px" />
        </a-form-item>
        <a-form-item label="接入模式">
          <a-select
            v-model:value="uploadForm.sourceMode"
            style="width: 200px"
            :options="SOURCE_MODE_OPTIONS"
          />
        </a-form-item>
        <a-form-item label="学年">
          <a-input v-model:value="uploadForm.schoolYear" placeholder="例：2024-2025" style="width: 160px" />
        </a-form-item>
        <a-form-item label="学期">
          <a-select v-model:value="uploadForm.semester" style="width: 100px">
            <a-select-option value="1">
              1
            </a-select-option>
            <a-select-option value="2">
              2
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-upload
            name="file"
            accept=".xlsx,.xls"
            :show-upload-list="false"
            :custom-request="handleUpload"
            :disabled="uploading"
          >
            <a-button type="primary" :loading="uploading">
              <template #icon>
                <span class="anticon"><svg width="14" height="14" viewBox="0 0 1024 1024" fill="currentColor"><path d="M512 64L128 448h128v448h512V448h128L512 64z" /></svg></span>
              </template>
              上传 Excel
            </a-button>
          </a-upload>
        </a-form-item>
      </a-form>
      <a-alert
        type="info"
        show-icon
        style="margin-top: 12px"
        message="Excel 表头按后端 ScoreImportExcelParser 约定：学生学号 / 姓名 / 班级 / 最终成绩。上传后进入 PENDING → PARSING → PREVIEW_READY 状态机，解析完成后通过 校验 → 确认 闭环。"
      />
    </a-card>

    <a-card title="成绩批次" :bordered="false" class="list-card">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="query.qualityCourseId"
            placeholder="按课程筛选"
            style="min-width: 200px"
            allow-clear
            :options="courseSelectOptions"
          />
          <a-select
            v-model:value="query.assessmentItemId"
            placeholder="考核环节"
            style="min-width: 200px"
            :options="queryAssessmentItemOptions"
            :loading="queryAssessmentLoading"
            :disabled="!query.qualityCourseId"
            allow-clear
          />
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            style="width: 160px"
            allow-clear
            :options="statusOptions"
          />
          <a-select
            v-model:value="query.sourceMode"
            placeholder="接入模式"
            style="width: 200px"
            allow-clear
            :options="SOURCE_MODE_OPTIONS"
          />
          <a-input
            v-model:value="query.keyword"
            placeholder="关键字"
            style="width: 160px"
            @press-enter="loadBatches"
          />
          <a-button type="primary" @click="loadBatches">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="batches"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handlePageChange,
        }"
      >
        <a-table-column title="批次 ID" data-index="id" width="120" />
        <a-table-column title="编码" data-index="batchCode" width="140" />
        <a-table-column title="名称" data-index="batchName" />
        <a-table-column title="课程" width="220">
          <template #default="{ record }">
            <div>{{ record.qualityCourseName }}</div>
            <div style="color: #999; font-size: 12px">{{ record.qualityCourseCode }}</div>
          </template>
        </a-table-column>
        <a-table-column title="考核环节" width="200">
          <template #default="{ record }">
            <div>{{ record.assessmentItemName }}</div>
            <div style="color: #999; font-size: 12px">{{ record.assessmentItemCode }}</div>
          </template>
        </a-table-column>
        <a-table-column title="学年" data-index="schoolYear" width="110" />
        <a-table-column title="学期" data-index="semester" width="70" />
        <a-table-column title="接入模式" data-index="sourceMode" width="160">
          <template #default="{ text }">
            {{ SOURCE_MODE_OPTIONS.find(o => o.value === text)?.label || text }}
          </template>
        </a-table-column>
        <a-table-column title="行数 (成功/错误/总)" width="160">
          <template #default="{ record }">
            <span style="color: #52c41a">{{ record.successRows ?? 0 }}</span>
            /
            <span :style="{ color: record.errorRows ? '#ff4d4f' : 'inherit' }">{{ record.errorRows ?? 0 }}</span>
            /
            {{ record.totalRows ?? 0 }}
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" width="120">
          <template #default="{ text }">
            <a-tag :color="SCORE_BATCH_STATUS_COLOR[text as ScoreBatchStatus]">
              {{ SCORE_BATCH_STATUS_LABEL[text as ScoreBatchStatus] }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="提交时间" data-index="createTime" width="170" />
        <a-table-column title="操作" width="320" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openPreview(record)">
                预览
              </a-button>
              <a-button
                v-if="canValidate(record.status)"
                type="link"
                size="small"
                @click="handleValidate(record)"
              >
                校验
              </a-button>
              <a-button
                v-if="canConfirm(record.status)"
                type="link"
                size="small"
                @click="handleConfirm(record)"
              >
                确认
              </a-button>
              <a-button
                v-if="canReParse(record.status)"
                type="link"
                size="small"
                @click="handleReParse(record)"
              >
                重新解析
              </a-button>
              <a-button
                v-if="canCancel(record.status)"
                type="link"
                danger
                size="small"
                @click="handleCancel(record)"
              >
                取消
              </a-button>
              <a-button
                v-if="canEdit(record.status)"
                type="link"
                size="small"
                @click="openEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-if="canDelete(record.status)"
                type="link"
                size="small"
                danger
                @click="handleDelete(record)"
              >
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="previewVisible"
      title="批次明细预览"
      width="960px"
      :footer="null"
    >
      <a-descriptions v-if="previewBatch" :column="3" size="small" bordered style="margin-bottom: 12px">
        <a-descriptions-item label="批次 ID">{{ previewBatch.id }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="SCORE_BATCH_STATUS_COLOR[previewBatch.status]">
            {{ SCORE_BATCH_STATUS_LABEL[previewBatch.status] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="行数">
          <span style="color: #52c41a">{{ previewSummary.successRows }}</span>
          /
          <span :style="{ color: previewSummary.errorRows ? '#ff4d4f' : 'inherit' }">{{ previewSummary.errorRows }}</span>
          /
          {{ previewSummary.totalRows }}
        </a-descriptions-item>
      </a-descriptions>
      <a-alert
        v-if="previewSummary.errorSummary"
        type="error"
        show-icon
        :message="previewSummary.errorSummary"
        style="margin-bottom: 12px"
      />
      <a-table
        :data-source="diagnostics"
        :loading="previewLoading"
        row-key="rowIndex"
        size="small"
        :pagination="false"
        :scroll="{ y: 420 }"
      >
        <a-table-column title="Excel 行号" data-index="rowIndex" width="80" />
        <a-table-column title="学号" data-index="studentNumber" />
        <a-table-column title="姓名" data-index="studentName" />
        <a-table-column title="班级" data-index="className" />
        <a-table-column title="原始得分" data-index="rawScore">
          <template #default="{ text }">{{ text ?? '-' }}</template>
        </a-table-column>
        <a-table-column title="是否通过" data-index="valid" width="90">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'red'">{{ text ? '通过' : '失败' }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="错误码 / 说明">
          <template #default="{ record }">
            <a-space direction="vertical" size="small" style="width: 100%">
              <a-space v-if="record.errorCodes?.length" wrap size="small">
                <a-tag
                  v-for="code in record.errorCodes"
                  :key="code"
                  color="orange"
                >
                  {{ code }}
                </a-tag>
              </a-space>
              <div
                v-for="(msg, idx) in record.errorMessages || []"
                :key="`${record.rowIndex}-${idx}`"
                style="color: #ff4d4f"
              >
                {{ msg }}
              </div>
              <span v-if="!record.errorCodes?.length && !record.errorMessages?.length" style="color: #999">-</span>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-modal>

    <a-modal
      v-model:open="editorVisible"
      :title="`编辑批次 ${editor.batchCode}`"
      :confirm-loading="editorSubmitting"
      width="720px"
      @ok="submitEditor"
    >
      <a-alert
        type="info"
        show-icon
        message="批次元数据编辑"
        description="可修改批次名称 / 编码 / 考核环节 / 学年学期；课程一经建立不建议变更。若批次已 CONFIRMED，请先取消后再编辑。"
        style="margin-bottom: 12px"
      />
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="批次编码" required>
              <a-input v-model:value="editor.batchCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="批次名称" required>
              <a-input v-model:value="editor.batchName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="考核环节" required>
              <a-select
                v-model:value="editor.assessmentItemId"
                :options="editorAssessmentItemOptions"
                placeholder="考核环节"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="接入模式">
              <a-select v-model:value="editor.sourceMode" :options="SOURCE_MODE_OPTIONS" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学年">
              <a-input v-model:value="editor.schoolYear" placeholder="例：2024-2025" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学期">
              <a-select v-model:value="editor.semester">
                <a-select-option value="1">1</a-select-option>
                <a-select-option value="2">2</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.score-batch-page {
  padding: 16px;

  .upload-card,
  .list-card {
    margin-bottom: 16px;
  }
}
</style>
