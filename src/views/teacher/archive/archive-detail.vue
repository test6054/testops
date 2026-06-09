<template>
  <StageWorkbenchShell v-if="archive">
    <template #context>
      <ContextBar>
        <template #status>
          <span class="archive-detail-page__title">{{ archive.archiveTitle }}</span>
          <UiTag :tone="archiveStatusTone(archive.archiveStatus)" size="sm">
            {{ archiveStatusLabel(archive.archiveStatus) }}
          </UiTag>
          <UiTag v-if="archive.permanentRetention" tone="purple" size="sm">永久保管</UiTag>
          <UiTag v-else tone="gray" size="sm">保管 {{ archive.retentionYears }} 年</UiTag>
          <UiTag v-if="archive.archiveFileSize" tone="blue" size="sm">
            ZIP {{ formatBytes(Number(archive.archiveFileSize)) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadDetail">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="goBack">返回电子归档包列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiCard v-if="showProgressCard" class="archive-detail-page__progress-card">
      <template #title>
        <ClockCircleOutlined />
        <span>异步打包进度</span>
      </template>
      <a-progress :percent="archive.packagingProgressPercent" :status="progressStatus" />
      <div class="progress-message">
        {{ archive.packagingProgressMessage }}
      </div>
      <div v-if="archive.packagingUploadId" class="progress-upload-id">
        电子归档包打包任务编号：<span class="archive-inline-value">{{ archive.packagingUploadId }}</span>
      </div>
      <div v-if="archive.packagingDiagnostic" class="progress-diagnostic">
        <a-alert
          type="error"
          show-icon
          :message="archivePackagingDiagnosticText(archive.packagingDiagnostic)"
        />
      </div>
    </UiCard>

    <UiCard class="archive-detail-page__info-card">
      <template #title>
        <FileOutlined />
        <span>电子归档包信息</span>
      </template>
      <a-descriptions :column="{ xs: 1, sm: 2, md: 3 }" size="small" bordered>
        <a-descriptions-item label="状态">
          <UiTag :tone="archiveStatusTone(archive.archiveStatus)" size="sm">
            {{ archiveStatusLabel(archive.archiveStatus) }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="所属考试">
          {{ archive.examName }}
          <span v-if="archive.examNo" class="muted">· {{ archive.examNo }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="保管期限">
          <span v-if="archive.permanentRetention">永久保管</span>
          <span v-else>
            {{ archive.retentionYears }} 年
            <span v-if="archive.retentionUntil" class="muted">
              · 至 {{ archive.retentionUntil }}
            </span>
          </span>
        </a-descriptions-item>
        <a-descriptions-item label="扫描影像">
          {{ archive.originalScanCount }}
        </a-descriptions-item>
        <a-descriptions-item label="批改切片">
          {{ archive.markedSliceCount }}
        </a-descriptions-item>
        <a-descriptions-item label="答案细则">
          {{ archive.answerBookletCount }}
        </a-descriptions-item>
        <a-descriptions-item label="清单数">{{ archive.itemCount }}</a-descriptions-item>
        <a-descriptions-item label="电子归档包大小">
          <span v-if="archive.archiveFileSize">
            {{ formatBytes(Number(archive.archiveFileSize)) }}
          </span>
        </a-descriptions-item>
        <a-descriptions-item label="归档校验码">
          <span v-if="archive.archiveChecksum">
            <span class="archive-inline-value">{{ archive.archiveChecksum.substring(0, 16) }}…</span>
          </span>
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ formatDateTimeWithSeconds(archive.createTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="打包开始">
          {{ formatDateTimeWithSeconds(archive.packagingStartedTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="打包完成">
          {{ formatDateTimeWithSeconds(archive.packagingCompletedTime) }}
        </a-descriptions-item>
      </a-descriptions>
    </UiCard>

    <UiCard class="archive-detail-page__action-card">
      <template #title>
        <ThunderboltOutlined />
        <span>可执行操作</span>
      </template>
      <a-space wrap>
        <UiButton v-if="canPackage" size="sm" @click="confirmPackage">
          <template #icon><CloudUploadOutlined /></template>
          {{ archive.archiveStatus === 'PACKAGING_FAILED' ? '重试打包' : '入队打包' }}
        </UiButton>
        <UiButton
          v-if="archive.archiveStatus === 'ACTIVE'"
          size="sm"
          @click="confirmRequestAppraisal"
        >
          申请鉴定
        </UiButton>
        <UiButton
          v-if="archive.archiveStatus === 'APPRAISAL_PENDING'"
          size="sm"
          @click="openAppraiseModal"
        >
          提交鉴定决议
        </UiButton>
        <UiButton
          v-if="canRequestDestruction"
          size="sm"
          variant="outline"
          @click="openDestructionRequestModal"
        >
          申请销毁
        </UiButton>
        <UiButton
          v-if="archive.archiveStatus === 'DESTRUCTION_PENDING'"
          size="sm"
          @click="openApproveDestructionModal"
        >
          审批销毁
        </UiButton>
        <UiButton
          v-if="archive.archiveStatus === 'DESTRUCTION_APPROVED'"
          size="sm"
          variant="outline"
          @click="confirmExecuteDestruction"
        >
          执行物理销毁
        </UiButton>
        <span v-if="!hasAnyAction" class="muted">当前状态没有可执行的下一步操作</span>
      </a-space>
    </UiCard>

    <UiCard class="archive-detail-page__tabs-card">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="items" :tab="`清单项 (${items.length})`">
          <UiEmpty v-if="items.length === 0" description="暂无清单项" />
          <UiDataTable class="student-detail-table__data-table"
            v-else
            :columns="itemColumns"
            :data-source="items"
            :page-size="20"
            :total="items.length"
            flat
            row-key="itemId"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'category'">
                <UiTag tone="blue" size="sm">
                  {{ record.itemCategoryMessage }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'student'">
                <span v-if="record.studentNo">
                  {{ record.studentNo }}
                  <span v-if="record.studentName" class="muted">· {{ record.studentName }}</span>
                </span>
              </template>
              <template v-else-if="column.key === 'questionNo'">
                <span v-if="record.questionNo">{{ record.questionNo }}</span>
              </template>
              <template v-else-if="column.key === 'fileSize'">
                <span v-if="record.fileSize">{{ formatBytes(Number(record.fileSize)) }}</span>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="events" :tab="`事件流水 (${events.length})`">
          <UiEmpty v-if="events.length === 0" description="暂无事件" />
          <a-timeline v-else mode="left">
            <a-timeline-item
              v-for="event in events"
              :key="event.eventId"
              :color="resolveEventColor(event.eventType)"
            >
              <div class="event-line">
                <strong>{{ event.eventTypeMessage }}</strong>
                <span class="muted">· {{ formatDateTimeWithSeconds(event.eventTime) }}</span>
              </div>
              <div v-if="event.reason" class="event-reason">{{ event.reason }}</div>
            </a-timeline-item>
          </a-timeline>
        </a-tab-pane>
      </a-tabs>
    </UiCard>
  </StageWorkbenchShell>

  <UiErrorRetryPanel
    v-else-if="detailLoadError"
    :error="detailLoadError"
    title="电子归档包详情加载失败"
    :show-report="false"
    @retry="loadDetail"
  />

  <UiEmpty v-else-if="!loading" description="电子归档包不存在或已被删除" />

  <a-modal
    v-model:open="appraiseModalOpen"
    title="提交鉴定决议"
    ok-text="提交"
    cancel-text="取消"
    :confirm-loading="actionLoading"
    @ok="submitAppraisal"
  >
    <a-form layout="vertical" :model="appraiseForm">
      <a-form-item label="鉴定决议">
        <a-radio-group v-model:value="appraiseForm.decision">
          <a-radio value="RETAIN">{{ ARCHIVE_APPRAISAL_LABEL.RETAIN }}（延长保管）</a-radio>
          <a-radio value="DESTROY">
            {{ ARCHIVE_APPRAISAL_LABEL.DESTROY }}（进入销毁审批流）
          </a-radio>
        </a-radio-group>
      </a-form-item>
      <template v-if="appraiseForm.decision === 'RETAIN'">
        <a-form-item label="保管处理">
          <a-checkbox v-model:checked="appraiseForm.permanentRetention"> 改为永久保管 </a-checkbox>
        </a-form-item>
        <a-form-item v-if="!appraiseForm.permanentRetention" label="延长年限">
          <a-input-number
            v-model:value="appraiseForm.retentionExtensionYears"
            :min="1"
            :max="100"
            style="width: 140px"
          />
          <span class="muted ml-2">不填则按原年限重新起算</span>
        </a-form-item>
      </template>
      <a-form-item label="备注">
        <a-textarea v-model:value="appraiseForm.remark" :rows="3" placeholder="可填写鉴定意见" />
      </a-form-item>
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="destructionRequestModalOpen"
    title="申请销毁"
    ok-text="提交申请"
    cancel-text="取消"
    :confirm-loading="actionLoading"
    :ok-button-props="{ disabled: !destructionRequestForm.reason.trim() }"
    @ok="submitDestructionRequest"
  >
    <a-form layout="vertical" :model="destructionRequestForm">
      <a-form-item label="销毁原因" required>
        <a-textarea
          v-model:value="destructionRequestForm.reason"
          :rows="4"
          placeholder="请填写销毁理由，便于审批人评估"
        />
      </a-form-item>
      <a-alert
        type="warning"
        show-icon
        message="申请人无法审批自己提交的销毁申请，请由其他角色审批"
      />
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="approveDestructionModalOpen"
    title="审批销毁"
    ok-text="提交审批"
    cancel-text="取消"
    :confirm-loading="actionLoading"
    @ok="submitApproveDestruction"
  >
    <a-form layout="vertical" :model="approveDestructionForm">
      <a-form-item label="审批决议">
        <a-radio-group v-model:value="approveDestructionForm.decision">
          <a-radio value="APPROVED">{{ ARCHIVE_DESTRUCTION_LABEL.APPROVED }}</a-radio>
          <a-radio value="REJECTED">{{ ARCHIVE_DESTRUCTION_LABEL.REJECTED }}</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea
          v-model:value="approveDestructionForm.remark"
          :rows="3"
          placeholder="可填写审批意见"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type {
  ArchiveAppraisalDecisionCode,
  ArchiveDestructionDecisionCode,
  ArchiveEventTypeCode,
  ArchiveEventVO,
  ArchiveItemVO,
  ArchivePackageStatusCode,
  ArchivePackageVO,
  ArchivePackagingPhase,
} from '@/apis/mark/archive'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import CloudUploadOutlined from '@ant-design/icons-vue/CloudUploadOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  appraiseArchive,
  approveDestruction,
  ARCHIVE_APPRAISAL_LABEL,
  ARCHIVE_DESTRUCTION_LABEL,
  ARCHIVE_EVENT_TONE,
  ARCHIVE_PHASE_LABEL,
  ARCHIVE_STATUS_LABEL,
  ARCHIVE_STATUS_TONE,
  executeDestruction,
  getArchiveDetail,
  packageArchive,
  requestAppraisal,
  requestDestruction,
} from '@/apis/mark/archive'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { getUserProcessFailureMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveDetail' })

const markStageStore = useMarkStageStore()
const examContextStore = useMarkExamContextStore()

const route = useRoute()
const router = useRouter()

function archiveStatusTone(status: ArchivePackageStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_STATUS_TONE, status, '归档状态')
}

function archiveStatusLabel(status: ArchivePackageStatusCode): string {
  return strictEnumLabel(ARCHIVE_STATUS_LABEL, status, '归档状态')
}

/** 将归档打包诊断转为教师可理解的归档处置提示，避免暴露底层存储或接口细节。 */
function archivePackagingDiagnosticText(diagnostic?: string): string {
  return getUserProcessFailureMessage(
    diagnostic,
    '归档打包未完成，请检查扫描材料是否完整后重新发起打包',
  )
}
function archivePhaseLabel(phase: ArchivePackagingPhase): string {
  return strictEnumLabel(ARCHIVE_PHASE_LABEL, phase, '归档打包阶段')
}
const archiveId = String(route.params.archiveId ?? '')

const archive = ref<ArchivePackageVO | null>(null)
const items = ref<ArchiveItemVO[]>([])
const events = ref<ArchiveEventVO[]>([])
const loading = ref(false)
const detailLoadError = ref<Error | null>(null)
const actionLoading = ref(false)
const activeTab = ref<'items' | 'events'>('items')

const appraiseModalOpen = ref(false)
const destructionRequestModalOpen = ref(false)
const approveDestructionModalOpen = ref(false)

interface AppraiseForm {
  decision: ArchiveAppraisalDecisionCode
  permanentRetention: boolean
  retentionExtensionYears: number | undefined
  remark: string
}
const appraiseForm = reactive<AppraiseForm>({
  decision: 'RETAIN',
  permanentRetention: false,
  retentionExtensionYears: undefined,
  remark: '',
})

const destructionRequestForm = reactive({
  reason: '',
})

interface ApproveDestructionForm {
  decision: ArchiveDestructionDecisionCode
  remark: string
}
const approveDestructionForm = reactive<ApproveDestructionForm>({
  decision: 'APPROVED',
  remark: '',
})

let pollTimer: ReturnType<typeof setInterval> | null = null

const itemColumns = [
  { title: '类别', key: 'category', dataIndex: 'itemCategory', width: 160 },
  { title: '相对路径', key: 'relativePath', dataIndex: 'relativePath' },
  { title: '学生', key: 'student', dataIndex: 'studentNo', width: 200 },
  { title: '题号', key: 'questionNo', dataIndex: 'questionNo', width: 100 },
  { title: '大小', key: 'fileSize', dataIndex: 'fileSize', width: 110 },
]

const showProgressCard = computed(() => {
  if (!archive.value) return false
  return (
    archive.value.archiveStatus === 'PACKAGING'
    || archive.value.archiveStatus === 'PACKAGING_FAILED'
  )
})

const progressPackagingPhase = computed<ArchivePackagingPhase>(() => {
  return archive.value?.packagingPhase ?? 'QUEUED'
})

const progressStatus = computed<'normal' | 'success' | 'exception' | 'active'>(() => {
  if (!archive.value) return 'normal'
  if (archive.value.archiveStatus === 'PACKAGING_FAILED') return 'exception'
  if (archive.value.packagingPhase === 'COMPLETED') return 'success'
  if (archive.value.archiveStatus === 'PACKAGING') return 'active'
  return 'normal'
})

const canPackage = computed(() => {
  if (!archive.value) return false
  return (
    archive.value.archiveStatus === 'DRAFT' || archive.value.archiveStatus === 'PACKAGING_FAILED'
  )
})

const canRequestDestruction = computed(() => {
  if (!archive.value) return false
  return (
    archive.value.archiveStatus === 'APPRAISAL_DECIDED'
    && archive.value.appraisalDecision === 'DESTROY'
  )
})

const hasAnyAction = computed(() => {
  if (!archive.value) return false
  return (
    canPackage.value
    || archive.value.archiveStatus === 'ACTIVE'
    || archive.value.archiveStatus === 'APPRAISAL_PENDING'
    || canRequestDestruction.value
    || archive.value.archiveStatus === 'DESTRUCTION_PENDING'
    || archive.value.archiveStatus === 'DESTRUCTION_APPROVED'
  )
})

/**
 * 将归档包状态映射为 ARCHIVE 阶段状态。与 archive-list 采用同一语义。
 * 该页面仅针对单个归档包，其状态索引着其 examId 的 ARCHIVE 阶段。
 */
function syncArchiveDetailStageToStore(pkg: ArchivePackageVO): void {
  const examId = pkg.examId
  if (!examId) return
  examContextStore.currentExamId = examId
  markStageStore.observeExam(examId)
  let status: 'pending' | 'active' | 'completed' | 'blocked' = 'pending'
  let hint = ''
  switch (pkg.archiveStatus) {
    case 'DRAFT':
      status = 'blocked'
      hint = '草稿待打包'
      break
    case 'PACKAGING_FAILED':
    case 'DESTRUCTION_FAILED':
      status = 'blocked'
      hint
        = pkg.archiveStatus === 'PACKAGING_FAILED'
          ? archivePackagingDiagnosticText(pkg.packagingDiagnostic)
          : archiveStatusLabel(pkg.archiveStatus)
      break
    case 'PACKAGING':
      status = 'active'
      hint = pkg.packagingProgressMessage
        ? `打包中 · ${pkg.packagingProgressPercent}% · ${pkg.packagingProgressMessage}`
        : `打包中 · ${pkg.packagingProgressPercent}%`
      break
    case 'ACTIVE':
      status = 'active'
      hint = '保管中，可申请鉴定'
      break
    case 'APPRAISAL_PENDING':
      status = 'active'
      hint = '鉴定待办'
      break
    case 'APPRAISAL_DECIDED':
    case 'DESTROYED':
      status = 'completed'
      hint = archiveStatusLabel(pkg.archiveStatus)
      break
    case 'DESTRUCTION_PENDING':
      status = 'active'
      hint = archiveStatusLabel(pkg.archiveStatus)
      break
    case 'DESTRUCTION_APPROVED':
      status = 'active'
      hint = archiveStatusLabel(pkg.archiveStatus)
      break
    case 'DESTRUCTION_EXECUTING':
      status = 'active'
      hint = archiveStatusLabel(pkg.archiveStatus)
      break
  }
  markStageStore.setStageStatus(examId, 'ARCHIVE', status, hint)
  markStageStore.setCurrentStage(examId, 'ARCHIVE')
}

async function loadDetail(): Promise<void> {
  if (!archiveId) {
    message.error('未找到要查看的电子归档包')
    return
  }
  loading.value = true
  detailLoadError.value = null
  try {
    const detail = await getArchiveDetail(archiveId)
    archive.value = detail.archive
    items.value = detail.items
    events.value = detail.events
    syncArchiveDetailStageToStore(detail.archive)
    syncPolling()
  } catch (error) {
    detailLoadError.value = toUserError(error, '考试电子归档包详情加载失败')
    archive.value = null
    items.value = []
    events.value = []
    showUserError(error, '考试电子归档包详情加载失败')
  } finally {
    loading.value = false
  }
}

function syncPolling(): void {
  const shouldPoll
    = archive.value?.archiveStatus === 'PACKAGING'
      || archive.value?.archiveStatus === 'DESTRUCTION_EXECUTING'
  if (shouldPoll && !pollTimer) {
    pollTimer = setInterval(() => {
      void loadDetail()
    }, 3000)
  } else if (!shouldPoll && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function confirmPackage(): void {
  if (!archive.value) return
  void confirmAsync({
    title: '确认入队打包？',
    content: `考试电子归档包 ${archive.value.archiveNo} 将进入异步打包队列，过程可能需要数分钟。`,
    type: 'info',
    okText: '入队打包',
    cancelText: '取消',
    onOk: async () => {
      try {
        await packageArchive(archiveId)
        message.success('考试电子归档包已入队，正在异步打包')
        await loadDetail()
      } catch (error) {
        showUserError(error, '考试电子归档包打包提交失败')
      }
    },
  })
}

function confirmRequestAppraisal(): void {
  void confirmAsync({
    title: '申请档案鉴定？',
    content: '提交后归档进入鉴定待办状态，由鉴定人决定保留或销毁。',
    type: 'info',
    okText: '申请鉴定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await requestAppraisal(archiveId)
        message.success('已申请档案鉴定')
        await loadDetail()
      } catch (error) {
        showUserError(error, '档案鉴定申请失败')
      }
    },
  })
}

function openAppraiseModal(): void {
  appraiseForm.decision = 'RETAIN'
  appraiseForm.permanentRetention = false
  appraiseForm.retentionExtensionYears = undefined
  appraiseForm.remark = ''
  appraiseModalOpen.value = true
}

async function submitAppraisal(): Promise<void> {
  actionLoading.value = true
  try {
    await appraiseArchive({
      archiveId,
      decision: appraiseForm.decision,
      remark: appraiseForm.remark?.trim() || undefined,
      permanentRetention:
        appraiseForm.decision === 'RETAIN' ? appraiseForm.permanentRetention : undefined,
      retentionExtensionYears:
        appraiseForm.decision === 'RETAIN' && !appraiseForm.permanentRetention
          ? appraiseForm.retentionExtensionYears
          : undefined,
    })
    message.success('鉴定决议已提交')
    appraiseModalOpen.value = false
    await loadDetail()
  } catch (error) {
    showUserError(error, '档案鉴定决议提交失败')
  } finally {
    actionLoading.value = false
  }
}

function openDestructionRequestModal(): void {
  destructionRequestForm.reason = ''
  destructionRequestModalOpen.value = true
}

async function submitDestructionRequest(): Promise<void> {
  if (!destructionRequestForm.reason.trim()) {
    message.warning('请填写销毁原因')
    return
  }
  actionLoading.value = true
  try {
    await requestDestruction({
      archiveId,
      reason: destructionRequestForm.reason.trim(),
    })
    message.success('销毁申请已提交，等待审批')
    destructionRequestModalOpen.value = false
    await loadDetail()
  } catch (error) {
    showUserError(error, '档案销毁申请失败')
  } finally {
    actionLoading.value = false
  }
}

function openApproveDestructionModal(): void {
  approveDestructionForm.decision = 'APPROVED'
  approveDestructionForm.remark = ''
  approveDestructionModalOpen.value = true
}

async function submitApproveDestruction(): Promise<void> {
  actionLoading.value = true
  try {
    await approveDestruction({
      archiveId,
      decision: approveDestructionForm.decision,
      remark: approveDestructionForm.remark?.trim() || undefined,
    })
    message.success('销毁审批已提交')
    approveDestructionModalOpen.value = false
    await loadDetail()
  } catch (error) {
    showUserError(error, '档案销毁审批失败')
  } finally {
    actionLoading.value = false
  }
}

function confirmExecuteDestruction(): void {
  void confirmAsync({
    title: '确认执行物理销毁？',
    content: '执行后归档文件将被销毁，仅保留销毁前记录，操作不可恢复。',
    type: 'error',
    okText: '执行销毁',
    cancelText: '取消',
    onOk: async () => {
      try {
        await executeDestruction(archiveId)
        message.success('考试电子归档包已物理销毁')
        await loadDetail()
      } catch (error) {
        showUserError(error, '考试电子归档包销毁执行失败')
      }
    },
  })
}

function goBack(): void {
  void router.push({ name: 'TeacherArchiveList' })
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '—'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i += 1
  }
  return `${size.toFixed(size >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

function resolveEventColor(eventType: ArchiveEventTypeCode): string {
  return strictEnumTone(ARCHIVE_EVENT_TONE, eventType, '归档事件类型')
}

onMounted(() => {
  void loadDetail()
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style lang="scss" scoped>
.archive-detail-page {
  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
}

.progress-message {
  margin-top: 12px;
  color: var(--ant-color-text-secondary);
}

.progress-upload-id {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.archive-inline-value {
  word-break: break-all;
}

.progress-diagnostic {
  margin-top: 10px;
}

.muted {
  color: var(--ant-color-text-quaternary);
}

.ml-2 {
  margin-left: 8px;
}

.event-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-reason {
  margin-top: 4px;
  color: var(--ant-color-text);
}
</style>
