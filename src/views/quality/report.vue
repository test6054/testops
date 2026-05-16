<script setup lang="ts">
/**
 * 教学质量评价报告工作台
 *
 * 主链：
 * 1. AI 任务（COURSE_REPORT_GENERATE / PROGRAM_REPORT_GENERATE）生成草稿
 * 2. 编辑器人工修订 -> 提交 -> 审核确认 / 驳回 -> 归档
 * 3. SUBMITTED / CONFIRMED / ARCHIVED 状态可一键导出 Word / PDF / Excel 三格式
 */
import type {
  ReportExportStatus,
  ReportQueryPayload,
  ReportSavePayload,
  ReportStatus,
  ReportType,
  ReportVO,
} from '@/apis/quality'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  REPORT_EXPORT_STATUS_COLOR,
  REPORT_EXPORT_STATUS_LABEL,
  REPORT_STATUS_COLOR,
  REPORT_STATUS_LABEL,
  REPORT_TYPE_LABEL,
  reportApi,
} from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

const list = ref<ReportVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<ReportQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  reportType: undefined,
  qualityCourseId: '',
  schoolYear: '',
  semester: '',
  status: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ReportSavePayload>({
  reportType: 'COURSE_ACHIEVEMENT',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  title: '',
  schoolYear: '',
  semester: '',
  bodyMarkdown: '',
})
const submitting = ref(false)

const detailVisible = ref(false)
const detailRecord = ref<ReportVO | null>(null)
const detailLoading = ref(false)

const reportTypeOptions = Object.entries(REPORT_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const statusOptions = Object.entries(REPORT_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const transitMap: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED'],
  RETURNED: ['SUBMITTED'],
  ARCHIVED: [],
}

async function loadList() {
  loading.value = true
  try {
    const page = await reportApi.page({
      ...query,
      trainingPlanId: qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: query.qualityCourseId || undefined,
      schoolYear: query.schoolYear || undefined,
      semester: query.semester || undefined,
      reportType: query.reportType || undefined,
      status: query.status || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  Object.assign(query, {
    reportType: undefined,
    qualityCourseId: '',
    schoolYear: '',
    semester: '',
    status: undefined,
    keyword: '',
  })
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    reportType: 'COURSE_ACHIEVEMENT',
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    title: '',
    schoolYear: qualityStore.currentSchoolYear || '',
    semester: qualityStore.currentSemester || '',
    bodyMarkdown: '',
  })
  editorVisible.value = true
}

async function openEdit(record: ReportVO) {
  editorMode.value = 'edit'
  detailLoading.value = true
  try {
    const detail = await reportApi.detail(record.id)
    Object.assign(editor, {
      id: detail.id,
      reportType: detail.reportType,
      programId: detail.programId || '',
      trainingPlanId: detail.trainingPlanId || '',
      qualityCourseId: detail.qualityCourseId || '',
      achievementResultId: detail.achievementResultId || '',
      title: detail.title,
      schoolYear: detail.schoolYear || '',
      semester: detail.semester || '',
      bodyMarkdown: detail.bodyMarkdown || '',
      wordFileId: detail.wordFileId,
      pdfFileId: detail.pdfFileId,
      excelFileId: detail.excelFileId,
    })
    editorVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

async function submitEditor() {
  if (!editor.title.trim()) {
    message.error('请填写报告标题')
    return
  }
  if (!editor.programId) {
    message.error('请填写专业 ID')
    return
  }
  if (!editor.schoolYear || !editor.semester) {
    message.error('请填写学年与学期')
    return
  }
  submitting.value = true
  try {
    const payload: ReportSavePayload = {
      ...editor,
      title: editor.title.trim(),
      trainingPlanId: editor.trainingPlanId || undefined,
      qualityCourseId: editor.qualityCourseId || undefined,
      achievementResultId: editor.achievementResultId || undefined,
    }
    if (editorMode.value === 'create') {
      await reportApi.create(payload)
      message.success('已创建报告草稿')
    } else {
      await reportApi.update(payload)
      message.success('已保存修改')
    }
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

function nextStatuses(status: ReportStatus) {
  return transitMap[status] || []
}

/**
 * 后端 ReportStatusTransitRequest 仅接受 id + targetStatus，不接受备注。
 * 如需记录驳回原因，请使用外层 ImprovementTask / AuditTrail 能力。
 */
async function handleTransit(record: ReportVO, to: ReportStatus) {
  if (to === 'RETURNED') {
    const ok = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: `${REPORT_STATUS_LABEL[record.status]} → ${REPORT_STATUS_LABEL[to]}`,
        content: '驳回后报告会重新进入修订状态，驳回原因请在外层改进任务中记录。',
        okType: 'danger',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!ok) return
  }
  await reportApi.transitStatus({ id: record.id, targetStatus: to })
  message.success('流转成功')
  await loadList()
}

/** 正在轮询导出状态的报告 ID 集合，用于禁用重复点击与表格展示加载动画。 */
const pollingExportIds = ref<Set<string>>(new Set())

const EXPORT_POLL_INTERVAL_MS = 5000
/** 最大轮询时长 30 分钟：超出后停止轮询但不影响后端实际执行，用户可手工刷新列表。 */
const EXPORT_POLL_MAX_ATTEMPTS = 360

/**
 * 轮询异步导出状态：调用 detail 拿最新 exportStatus，直到到达终态 COMPLETED / FAILED，
 * 或达到最大尝试次数（30 分钟）。非终态（IDLE / PENDING / PROCESSING）持续轮询。
 */
async function pollExportStatus(id: string) {
  pollingExportIds.value.add(id)
  try {
    for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, EXPORT_POLL_INTERVAL_MS))
      const detail = await reportApi.detail(id)
      const idx = list.value.findIndex((item) => item.id === id)
      if (idx >= 0) list.value[idx] = detail
      const exportStatus = detail.exportStatus
      if (exportStatus === 'COMPLETED') {
        message.success(`报告 #${id} 三格式导出完成`)
        return
      }
      if (exportStatus === 'FAILED') {
        Modal.error({
          title: `报告 #${id} 导出失败`,
          content:
            detail.exportErrorMessage || '后端未返回失败原因，请运维基于 Skywalking 链路排查。',
          width: 640,
        })
        return
      }
    }
    message.warning(
      `报告 #${id} 导出已超过 ${(EXPORT_POLL_INTERVAL_MS * EXPORT_POLL_MAX_ATTEMPTS) / 60_000} 分钟未完成，已停止轮询；请稍后手工刷新列表查看最新状态。`,
    )
  } finally {
    pollingExportIds.value.delete(id)
  }
}

async function handleExport(record: ReportVO) {
  const currentExport = record.exportStatus ?? 'IDLE'
  if (currentExport === 'PENDING' || currentExport === 'PROCESSING') {
    message.info(
      `报告 #${record.id} 当前处于「${REPORT_EXPORT_STATUS_LABEL[currentExport]}」，请等待完成`,
    )
    if (!pollingExportIds.value.has(record.id)) void pollExportStatus(record.id)
    return
  }
  Modal.confirm({
    title: `导出 ${record.title}？`,
    content:
      '后端会异步生成 Word / PDF / Excel 三格式并上传 edu-storage；前端每 5 秒轮询一次状态，附件列会在完成后自动更新。',
    onOk: async () => {
      await reportApi.export(record.id)
      message.success('已触发异步导出，后台生成中')
      // 立即把本行标为 PENDING，UI 先展示「待导出」徽标，避免等 5s 才感知
      const idx = list.value.findIndex((item) => item.id === record.id)
      if (idx >= 0) {
        list.value[idx] = {
          ...list.value[idx],
          exportStatus: 'PENDING',
          exportErrorMessage: undefined,
        }
}
      void pollExportStatus(record.id)
    },
  })
}

function isExportInFlight(status: ReportExportStatus | undefined) {
  return status === 'PENDING' || status === 'PROCESSING'
}

async function handleDelete(record: ReportVO) {
  if (record.status !== 'DRAFT') {
    message.warning('只能删除 DRAFT 状态的报告')
    return
  }
  Modal.confirm({
    title: `删除报告 ${record.title}？`,
    okType: 'danger',
    onOk: async () => {
      await reportApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

async function openDetail(record: ReportVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await reportApi.detail(record.id)
  } finally {
    detailLoading.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <div class="page">
    <a-card title="质量评价报告" :bordered="false">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="query.reportType"
            placeholder="类型"
            style="width: 120px"
            allow-clear
          >
            <a-select-option
              v-for="item in reportTypeOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
          <a-input
            v-model:value="query.qualityCourseId"
            placeholder="课程 ID"
            style="width: 120px"
          />
          <a-input v-model:value="query.schoolYear" placeholder="学年" style="width: 110px" />
          <a-input v-model:value="query.semester" placeholder="学期" style="width: 70px" />
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            style="width: 110px"
            allow-clear
            :options="statusOptions"
          />
          <a-input
            v-model:value="query.keyword"
            placeholder="关键字"
            style="width: 160px"
            @press-enter="loadList"
          />
          <a-button type="primary" @click="loadList"> 查询 </a-button>
          <a-button @click="resetQuery"> 重置 </a-button>
          <a-button type="primary" @click="openCreate"> 新建报告 </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
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
        <a-table-column title="报告 ID" data-index="id" width="140" />
        <a-table-column title="标题" data-index="title" />
        <a-table-column title="类型" data-index="reportType" width="90">
          <template #default="{ text }">
            {{ REPORT_TYPE_LABEL[text as ReportType] }}
          </template>
        </a-table-column>
        <a-table-column title="课程 ID" data-index="qualityCourseId" width="120">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="达成度 ID" data-index="achievementResultId" width="120">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="学年/学期" width="120">
          <template #default="{ record }">
            {{ record.schoolYear || '-' }} / {{ record.semester || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" width="100">
          <template #default="{ text }">
            <a-tag :color="REPORT_STATUS_COLOR[text as ReportStatus]">
              {{ REPORT_STATUS_LABEL[text as ReportStatus] }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="附件" width="260">
          <template #default="{ record }">
            <a-space size="small" wrap>
              <a-tag v-if="record.wordFileId" color="blue"> Word </a-tag>
              <a-tag v-if="record.pdfFileId" color="orange"> PDF </a-tag>
              <a-tag v-if="record.excelFileId" color="green"> Excel </a-tag>
              <a-tag
                v-if="record.exportStatus && record.exportStatus !== 'COMPLETED'"
                :color="REPORT_EXPORT_STATUS_COLOR[record.exportStatus as ReportExportStatus]"
              >
                <template v-if="isExportInFlight(record.exportStatus)" #icon>
                  <LoadingOutlined />
                </template>
                {{ REPORT_EXPORT_STATUS_LABEL[record.exportStatus as ReportExportStatus] }}
              </a-tag>
              <a-tooltip
                v-if="record.exportStatus === 'FAILED' && record.exportErrorMessage"
                :title="record.exportErrorMessage"
              >
                <a-tag color="red"> 错误详情 </a-tag>
              </a-tooltip>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="320" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openDetail(record)"> 详情 </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="record.status === 'ARCHIVED'"
                @click="openEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                v-for="to in nextStatuses(record.status)"
                :key="to"
                type="link"
                size="small"
                :danger="to === 'RETURNED'"
                @click="handleTransit(record, to)"
              >
                → {{ REPORT_STATUS_LABEL[to] }}
              </a-button>
              <a-button
                v-if="
                  record.status === 'SUBMITTED'
                    || record.status === 'CONFIRMED'
                    || record.status === 'ARCHIVED'
                "
                type="link"
                size="small"
                @click="handleExport(record)"
              >
                导出三格式
              </a-button>
              <a-button
                v-if="record.status === 'DRAFT'"
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
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建质量评价报告' : '编辑质量评价报告'"
      :confirm-loading="submitting"
      width="800px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="16">
            <a-form-item label="标题" required>
              <a-input
                v-model:value="editor.title"
                placeholder="例：2024-2025 学年第 1 学期《程序设计基础》课程评价报告"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="类型" required>
              <a-select v-model:value="editor.reportType">
                <a-select-option
                  v-for="item in reportTypeOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="专业 ID" required>
              <a-input v-model:value="editor.programId" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="培养方案 ID">
              <a-input v-model:value="editor.trainingPlanId" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="课程 ID">
              <a-input v-model:value="editor.qualityCourseId" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="达成度结果 ID">
              <a-input v-model:value="editor.achievementResultId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="学年" required>
              <a-input v-model:value="editor.schoolYear" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="学期" required>
              <a-input v-model:value="editor.semester" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="正文 (Markdown)">
          <a-textarea
            v-model:value="editor.bodyMarkdown"
            :rows="12"
            placeholder="支持 Markdown；AI 任务生成后会自动回填"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="detailVisible" title="报告详情" width="720" :loading="detailLoading">
      <a-descriptions v-if="detailRecord" :column="2" size="small" bordered>
        <a-descriptions-item label="报告 ID">
          {{ detailRecord.id }}
        </a-descriptions-item>
        <a-descriptions-item label="类型">
          {{ REPORT_TYPE_LABEL[detailRecord.reportType as ReportType] }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="REPORT_STATUS_COLOR[detailRecord.status as ReportStatus]">
            {{ REPORT_STATUS_LABEL[detailRecord.status as ReportStatus] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="达成度结果 ID">
          {{ detailRecord.achievementResultId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="专业 ID">
          {{ detailRecord.programId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="培养方案 ID">
          {{ detailRecord.trainingPlanId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="课程 ID">
          {{ detailRecord.qualityCourseId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="学年 / 学期">
          {{ detailRecord.schoolYear || '-' }} / {{ detailRecord.semester || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="Word 文件">
          {{ detailRecord.wordFileId ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="PDF 文件">
          {{ detailRecord.pdfFileId ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="Excel 文件">
          {{ detailRecord.excelFileId ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="导出状态">
          <a-tag :color="REPORT_EXPORT_STATUS_COLOR[detailRecord.exportStatus]">
            {{ REPORT_EXPORT_STATUS_LABEL[detailRecord.exportStatus] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item v-if="detailRecord.exportStartedAt" label="导出开始">
          {{ detailRecord.exportStartedAt }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detailRecord.exportFinishedAt" label="导出结束">
          {{ detailRecord.exportFinishedAt }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detailRecord.exportErrorMessage" label="导出错误">
          <pre style="white-space: pre-wrap; word-break: break-word; color: #ff4d4f; margin: 0">{{
            detailRecord.exportErrorMessage
          }}</pre>
        </a-descriptions-item>
        <a-descriptions-item v-if="detailRecord.confirmedAt" label="确认时间">
          {{ detailRecord.confirmedAt }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detailRecord.archivedAt" label="归档时间">
          {{ detailRecord.archivedAt }}
        </a-descriptions-item>
        <a-descriptions-item label="标题" :span="2">
          {{ detailRecord.title }}
        </a-descriptions-item>
      </a-descriptions>
      <a-divider>正文预览</a-divider>
      <pre v-if="detailRecord?.bodyMarkdown" class="md-preview">{{
        detailRecord.bodyMarkdown
      }}</pre>
      <a-empty v-else description="尚无正文" />
    </a-drawer>
  </div>
</template>

<style scoped lang="scss">
.page {
  padding: 16px;
}
.md-preview {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e1e4e8;
  font-size: 13px;
  max-height: 520px;
  overflow: auto;
}
</style>
