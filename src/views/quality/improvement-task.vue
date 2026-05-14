<script setup lang="ts">
/**
 * 持续改进任务台账
 *
 * 严格对齐后端 ImprovementTaskController：
 * - 字段：taskCode / taskTitle / problemSummary / proposedAction /
 *         ownerUserId / ownerRole / dueDate / status /
 *         progressRemark / rectificationEvidence / reviewDecision / reviewRemark / closedAt
 * - 状态机：OPEN → IN_PROGRESS → SUBMITTED → REVIEWED ↔ RETURNED → CLOSED
 *   - transit-status: targetStatus + progressRemark + rectificationEvidence(JSON)
 *   - close: reviewDecision + reviewRemark
 */
import type {
  ImprovementTaskQueryPayload,
  ImprovementTaskSavePayload,
  ImprovementTaskStatus,
  ImprovementTaskVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import {
  aiTaskApi,
  IMPROVEMENT_TASK_STATUS_COLOR,
  IMPROVEMENT_TASK_STATUS_LABEL,
  improvementTaskApi,
} from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'
import { promptModal } from './_helpers'

const qualityStore = useQualityStore()

const list = ref<ImprovementTaskVO[]>([])
const total = ref(0)
const loading = ref(false)

const query = reactive<ImprovementTaskQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  qualityCourseId: '',
  ownerUserId: '',
  status: undefined,
  keyword: '',
})

const statusOptions = Object.entries(IMPROVEMENT_TASK_STATUS_LABEL).map(([value, label]) => ({ value, label }))

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ImprovementTaskSavePayload>({
  taskCode: '',
  taskTitle: '',
  problemSummary: '',
  proposedAction: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
  ownerUserId: '',
  ownerRole: '',
  dueDate: '',
})
const editing = ref<ImprovementTaskVO | null>(null)
const editorSubmitting = ref(false)

const detailVisible = ref(false)
const detailRecord = ref<ImprovementTaskVO | null>(null)
const detailLoading = ref(false)

/**
 * 后端 ImprovementTaskServiceImpl 严格状态机：
 * - transit-status 仅允许：OPEN→IN_PROGRESS / IN_PROGRESS→SUBMITTED / RETURNED→IN_PROGRESS
 * - close 仅允许在 SUBMITTED：reviewDecision=APPROVED→CLOSED；REJECTED→RETURNED
 *
 * REVIEWED 状态 enum 存在但服务层不可达（后端未提供进入 REVIEWED 的路径），不提供流转按钮。
 */
const transitMap: Record<ImprovementTaskStatus, ImprovementTaskStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['CLOSED', 'RETURNED'],
  REVIEWED: [],
  RETURNED: ['IN_PROGRESS'],
  CLOSED: [],
}

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) return
  loading.value = true
  try {
    const page = await improvementTaskApi.page({
      ...query,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: query.qualityCourseId || undefined,
      ownerUserId: query.ownerUserId || undefined,
      status: query.status || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  }
  finally {
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
  query.qualityCourseId = ''
  query.ownerUserId = ''
  query.status = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  editing.value = null
  Object.assign(editor, {
    id: undefined,
    taskCode: '',
    taskTitle: '',
    problemSummary: '',
    proposedAction: '',
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    reportId: '',
    ownerUserId: '',
    ownerRole: '',
    dueDate: '',
  })
  editorVisible.value = true
}

function openEdit(record: ImprovementTaskVO) {
  editorMode.value = 'edit'
  editing.value = record
  Object.assign(editor, {
    id: record.id,
    taskCode: record.taskCode,
    taskTitle: record.taskTitle,
    problemSummary: record.problemSummary || '',
    proposedAction: record.proposedAction || '',
    programId: record.programId || '',
    trainingPlanId: record.trainingPlanId || '',
    qualityCourseId: record.qualityCourseId || '',
    achievementResultId: record.achievementResultId || '',
    reportId: record.reportId || '',
    ownerUserId: record.ownerUserId || '',
    ownerRole: record.ownerRole || '',
    dueDate: record.dueDate || '',
  })
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.taskCode.trim() || !editor.taskTitle.trim()) {
    message.error('请填写任务编码与标题')
    return
  }
  editorSubmitting.value = true
  try {
    const payload: ImprovementTaskSavePayload = {
      ...editor,
      trainingPlanId: editor.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      taskCode: editor.taskCode.trim(),
      taskTitle: editor.taskTitle.trim(),
      qualityCourseId: editor.qualityCourseId || undefined,
      achievementResultId: editor.achievementResultId || undefined,
      reportId: editor.reportId || undefined,
      ownerUserId: editor.ownerUserId || undefined,
      ownerRole: editor.ownerRole || undefined,
      dueDate: editor.dueDate || undefined,
    }
    if (editorMode.value === 'create') {
      await improvementTaskApi.create(payload)
      message.success('改进任务已创建')
    }
    else {
      await improvementTaskApi.update(payload)
      message.success('已保存修改')
    }
    editorVisible.value = false
    await loadList()
  }
  finally {
    editorSubmitting.value = false
  }
}

function nextStatuses(status: ImprovementTaskStatus) {
  return transitMap[status] || []
}

async function handleTransit(record: ImprovementTaskVO, to: ImprovementTaskStatus) {
  // SUBMITTED → CLOSED 走 close(APPROVED)；SUBMITTED → RETURNED 走 close(REJECTED)
  // 后端 close 接口强校验当前状态必须 = SUBMITTED
  if (record.status === 'SUBMITTED' && (to === 'CLOSED' || to === 'RETURNED')) {
    const reviewRemark = await promptModal({
      title: to === 'CLOSED' ? '复评通过并闭环' : '复评退回任务',
      placeholder: to === 'RETURNED' ? '退回原因（必填）' : '复评意见（可选）',
      required: to === 'RETURNED',
      okType: to === 'RETURNED' ? 'danger' : 'primary',
      emptyErrorMessage: '请填写退回原因',
    })
    if (reviewRemark === null) return
    if (to === 'RETURNED' && !reviewRemark) return
    await improvementTaskApi.close({
      id: record.id,
      reviewDecision: to === 'CLOSED' ? 'APPROVED' : 'REJECTED',
      reviewRemark: reviewRemark || undefined,
    })
    message.success(to === 'CLOSED' ? '已闭环' : '已退回，请责任人重新整改')
    await loadList()
    return
  }
  // OPEN→IN_PROGRESS / IN_PROGRESS→SUBMITTED / RETURNED→IN_PROGRESS 走 transit-status
  const remark = await promptModal({
    title: `${IMPROVEMENT_TASK_STATUS_LABEL[record.status]} → ${IMPROVEMENT_TASK_STATUS_LABEL[to]}`,
    placeholder: to === 'SUBMITTED' ? '整改进度说明（建议必填）' : '进度备注（可选）',
    required: false,
    okType: 'primary',
  })
  if (remark === null) return
  // SUBMITTED 状态可以附加整改证据 JSON（后端仅在 target=SUBMITTED 时接受 rectificationEvidence）
  let rectificationEvidence: string | undefined
  if (to === 'SUBMITTED') {
    const evidenceText = await promptModal({
      title: '填写整改证据（JSON，可选）',
      placeholder: '例如：{"docs":["file_id_1"], "actions":["调整考核权重"]}',
      required: false,
      okType: 'primary',
    })
    if (evidenceText === null) return
    rectificationEvidence = evidenceText || undefined
  }
  await improvementTaskApi.transitStatus({
    id: record.id,
    targetStatus: to,
    progressRemark: remark || undefined,
    rectificationEvidence,
  })
  message.success('流转成功')
  await loadList()
}

async function handleAiSuggestion(record: ImprovementTaskVO) {
  Modal.confirm({
    title: '为该改进任务生成 AI 建议草稿？',
    content: '将提交一个 IMPROVEMENT_SUGGESTION_GENERATE AI 任务，完成后可在 AI 任务中心查看结果',
    onOk: async () => {
      const res = await aiTaskApi.submit({
        taskType: 'IMPROVEMENT_SUGGESTION_GENERATE',
        businessType: 'improvement-task',
        businessId: record.id,
        trainingPlanId: record.trainingPlanId,
        programId: record.programId,
        qualityCourseId: record.qualityCourseId,
        achievementResultId: record.achievementResultId,
      })
      message.success(`已提交 AI 任务 ${res.aiTaskId}`)
    },
  })
}

async function handleDelete(record: ImprovementTaskVO) {
  Modal.confirm({
    title: `删除改进任务 ${record.taskCode}？`,
    okType: 'danger',
    content: '该操作不可恢复',
    onOk: async () => {
      await improvementTaskApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

async function openDetail(record: ImprovementTaskVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await improvementTaskApi.detail(record.id)
  }
  finally {
    detailLoading.value = false
  }
}

watch(() => qualityStore.currentTrainingPlanId, () => loadList())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await loadList()
})
</script>

<template>
  <div class="improvement-task-page">
    <a-card title="持续改进任务台账" :bordered="false">
      <template #extra>
        <a-space>
          <a-input v-model:value="query.qualityCourseId" placeholder="课程 ID" style="width: 130px" />
          <a-input v-model:value="query.ownerUserId" placeholder="负责人 ID" style="width: 130px" />
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            style="width: 130px"
            allow-clear
            :options="statusOptions"
          />
          <a-input v-model:value="query.keyword" placeholder="关键字" style="width: 160px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
          <a-button type="primary" @click="openCreate">
            新建任务
          </a-button>
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
        <a-table-column title="编号" data-index="taskCode" width="180" />
        <a-table-column title="标题" data-index="taskTitle" />
        <a-table-column title="课程 ID" data-index="qualityCourseId" width="120">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="负责人 ID" data-index="ownerUserId" width="120">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="责任角色" data-index="ownerRole" width="110">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="截止" data-index="dueDate" width="110">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" width="120">
          <template #default="{ text }">
            <a-tag :color="IMPROVEMENT_TASK_STATUS_COLOR[text as ImprovementTaskStatus]">
              {{ IMPROVEMENT_TASK_STATUS_LABEL[text as ImprovementTaskStatus] }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="复评" data-index="reviewDecision" width="100">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="操作" width="340" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openDetail(record)">
                详情
              </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="record.status === 'CLOSED'"
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
                → {{ IMPROVEMENT_TASK_STATUS_LABEL[to] }}
              </a-button>
              <a-button type="link" size="small" @click="handleAiSuggestion(record)">
                AI 建议
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建改进任务' : '编辑改进任务'"
      width="720px"
      :confirm-loading="editorSubmitting"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="任务编码" required>
              <a-input v-model:value="editor.taskCode" placeholder="task_code" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="任务标题" required>
              <a-input v-model:value="editor.taskTitle" placeholder="例：PROG-CG2 复杂工程问题达成度提升" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="负责人 user_id">
              <a-input v-model:value="editor.ownerUserId" placeholder="负责人 user_id" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="责任角色">
              <a-input v-model:value="editor.ownerRole" placeholder="责任角色编码" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="关联专业 ID">
              <a-input v-model:value="editor.programId" placeholder="program_id" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联课程 ID">
              <a-input v-model:value="editor.qualityCourseId" placeholder="quality_course_id" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联达成度结果 ID">
              <a-input v-model:value="editor.achievementResultId" placeholder="achievement_result_id" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="关联报告 ID">
              <a-input v-model:value="editor.reportId" placeholder="report_id（可选）" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="截止日期">
              <a-input v-model:value="editor.dueDate" placeholder="yyyy-MM-dd" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="问题概述">
          <a-textarea v-model:value="editor.problemSummary" :rows="3" placeholder="为什么达成度低于阈值 / 暴露了什么问题" />
        </a-form-item>
        <a-form-item label="改进措施">
          <a-textarea v-model:value="editor.proposedAction" :rows="3" placeholder="具体改进动作" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailVisible"
      title="改进任务详情"
      width="600"
      :loading="detailLoading"
    >
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="编号">
          {{ detailRecord.taskCode }}
        </a-descriptions-item>
        <a-descriptions-item label="标题">
          {{ detailRecord.taskTitle }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="IMPROVEMENT_TASK_STATUS_COLOR[detailRecord.status as ImprovementTaskStatus]">
            {{ IMPROVEMENT_TASK_STATUS_LABEL[detailRecord.status as ImprovementTaskStatus] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="负责人 ID">
          {{ detailRecord.ownerUserId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="责任角色">
          {{ detailRecord.ownerRole || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="截止日期">
          {{ detailRecord.dueDate || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="问题概述">
          {{ detailRecord.problemSummary || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="改进措施">
          {{ detailRecord.proposedAction || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="进度备注">
          {{ detailRecord.progressRemark || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="整改证据">
          <pre v-if="detailRecord.rectificationEvidence" class="evidence-pre">{{ detailRecord.rectificationEvidence }}</pre>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="复评结论">
          {{ detailRecord.reviewDecision || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="复评意见">
          {{ detailRecord.reviewRemark || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="闭环时间">
          {{ detailRecord.closedAt || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </div>
</template>

<style scoped lang="scss">
.improvement-task-page {
  padding: 16px;
}
.evidence-pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  background: #f6f8fa;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 240px;
  overflow: auto;
}
</style>
