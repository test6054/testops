<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        title="教务同步"
      >
        <template #status>
          <MarkExamSelect
            v-if="!isExamWorkspaceRoute"
            :selected-exam-id="selectedExamId"
            :exam-options="examOptions"
            :loading="examLoading"
            :searching="searching"
            :resolving-pinned="resolvingPinned"
            select-class="sync-page__exam-select"
            placeholder="选择考试"
            @change="handleExamChange"
            @search="onExamSearch"
          />
          <UiTag v-if="syncTasks.length > 0" tone="blue" size="sm">
            同步任务 {{ syncTasks.length }}
          </UiTag>
          <UiTag v-if="passbackPagination.total > 0" tone="green" size="sm">
            回写记录 {{ passbackPagination.total }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" :disabled="!selectedExamId" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            新建同步任务
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择考试"
      class="sync-page__empty"
    />

    <template v-else>
      <UiCard class="info-card">
        <template #title>
          <SyncOutlined />
          <span>同步任务</span>
        </template>

        <UiFilterBar
          v-model="syncFilterForm"
          :fields="syncFilterFields"
          variant="plain"
          search-text="查询"
          @search="loadSyncTasks"
          @reset="handleSyncFilterReset"
        />

        <UiDataTable
          pagination-mode="client"
          class="student-detail-table__data-table"
          :columns="syncColumns"
          :data-source="syncTasks"
          :loading="syncLoading"
          :page-size="20"
          :total="syncTasks.length"
          flat
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'externalSystemType'">
              {{ externalSystemTypeLabel(syncTasks[index].externalSystemType) }}
            </template>
            <template v-else-if="column.key === 'syncType'">
              {{ syncTypeLabel(syncTasks[index].syncType) }}
            </template>
            <template v-else-if="column.key === 'taskStatus'">
              <UiTag :tone="syncStatusTone(syncTasks[index].taskStatus)" size="sm">
                {{ syncTaskStatusLabel(syncTasks[index].taskStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'retry'">
              {{ syncTasks[index].retryCount }} / {{ syncTasks[index].maxRetryCount }}
            </template>
            <template v-else-if="column.key === 'lastError'">
              <a-tooltip
                v-if="syncTasks[index].lastErrorMessage"
                :title="syncTasks[index].lastErrorMessage"
              >
                <span class="error-text">{{
                  ellipsis(syncTasks[index].lastErrorMessage, 40)
                }}</span>
              </a-tooltip>
              <span v-else class="hint-text">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <UiTextAction
                  v-if="canExecute(syncTasks[index])"
                  tone="primary"
                  :disabled="actionLoadingId === syncTasks[index].id"
                  @click="handleExecute(syncTasks[index])"
                >
                  执行回写
                </UiTextAction>
                <UiTextAction
                  v-if="canRetry(syncTasks[index].taskStatus)"
                  tone="primary"
                  :disabled="actionLoadingId === syncTasks[index].id"
                  @click="handleRetry(syncTasks[index])"
                >
                  重试
                </UiTextAction>
                <UiTextAction
                  v-if="canCancel(syncTasks[index].taskStatus)"
                  tone="danger"
                  :disabled="actionLoadingId === syncTasks[index].id"
                  @click="handleCancel(syncTasks[index])"
                >
                  取消
                </UiTextAction>
                <UiTextAction @click="openTaskDetail(syncTasks[index])">
                  详情
                </UiTextAction>
              </div>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <FileSyncOutlined />
          <span>回写记录</span>
        </template>

        <UiFilterBar
          v-model="passbackFilterForm"
          :fields="passbackFilterFields"
          variant="plain"
          search-text="查询"
          @search="reloadPassbackRecordsFromFirstPage"
          @reset="handlePassbackFilterReset"
        />

        <UiDataTable
          v-model:current="passbackPagination.pageNum"
          v-model:page-size="passbackPagination.pageSize"
          class="student-detail-table__data-table"
          :columns="passbackColumns"
          :data-source="passbackRecords"
          :loading="passbackLoading"
          :total="passbackPagination.total"
          @page-change="handlePassbackPageChange"
          flat
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'passbackStatus'">
              <UiTag :tone="passbackStatusTone(passbackRecords[index].passbackStatus)" size="sm">
                {{ passbackStatusLabel(passbackRecords[index].passbackStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'reconcileStatus'">
              <UiTag :tone="reconcileStatusTone(passbackRecords[index].reconcileStatus)" size="sm">
                {{ reconcileStatusLabel(passbackRecords[index].reconcileStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'errorMessage'">
              <a-tooltip
                v-if="passbackRecords[index].errorMessage"
                :title="passbackRecords[index].errorMessage"
              >
                <span class="error-text">{{
                  ellipsis(passbackRecords[index].errorMessage, 40)
                }}</span>
              </a-tooltip>
              <span v-else class="hint-text">-</span>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>

  <!-- 创建任务 Modal -->
  <a-modal
    v-model:open="createModalOpen"
    title="新建同步任务"
    :destroy-on-close="true"
    :confirm-loading="creating"
    :ok-button-props="{ disabled: !createValid }"
    ok-text="创建"
    width="640px"
    @ok="handleCreate"
  >
    <a-form layout="vertical">
      <a-form-item label="外部系统类型" required>
        <a-radio-group v-model:value="createForm.externalSystemType">
          <a-radio-button
            v-for="(label, code) in EXTERNAL_SYSTEM_TYPE_LABEL"
            :key="code"
            :value="code"
          >
            {{ label }}
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="同步类型" required>
        <a-radio-group v-model:value="createForm.syncType">
          <a-radio-button
            v-for="(label, code) in CREATABLE_SYNC_TYPE_LABEL"
            :key="code"
            :value="code"
          >
            {{ label }}
          </a-radio-button>
        </a-radio-group>
        <div class="hint-text" style="margin-top: 4px">
          当前仅开放成绩回写；名单导入、成绩更正与撤销将在后端能力开放后启用。
        </div>
      </a-form-item>
      <a-form-item label="外部课程编号">
        <a-input v-model:value="createForm.externalCourseId" placeholder="如教务系统中的课程编号" />
      </a-form-item>
      <a-form-item label="外部成绩项编号">
        <a-input
          v-model:value="createForm.externalLineItemId"
          placeholder="如成绩册中的成绩项编号"
        />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- 任务详情抽屉 -->
  <a-drawer v-model:open="taskDetailOpen" title="同步任务详情" width="540" :destroy-on-close="true">
    <!-- 回写进度面板：聚合 PENDING / SENT / SUCCESS / FAILED / WITHDRAWN 五种状态计数 -->
    <UiCard v-if="detailTask" class="progress-card" size="small">
      <template #title>
        <FileSyncOutlined />
        <span>回写进度</span>
      </template>
      <template #extra>
        <UiButton
          size="sm"
          variant="outline"
          :loading="progressLoading"
          @click="handleRefreshProgress"
        >
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
      </template>

      <template v-if="detailProgress">
        <a-progress
          :percent="detailProgressPercent"
          :status="detailProgressStatus"
          :stroke-color="detailProgressFailed > 0 ? 'var(--ant-color-error)' : undefined"
        />
        <div class="progress-counts">
          <UiTag tone="gray" size="sm">总数 {{ detailProgress.totalCount }}</UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE.PENDING" size="sm">
            {{ PASSBACK_STATUS_LABEL.PENDING }} {{ detailProgress.pendingCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE.SENT" size="sm">
            {{ PASSBACK_STATUS_LABEL.SENT }} {{ detailProgress.sentCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE.SUCCESS" size="sm">
            {{ PASSBACK_STATUS_LABEL.SUCCESS }} {{ detailProgress.successCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE.FAILED" size="sm">
            {{ PASSBACK_STATUS_LABEL.FAILED }} {{ detailProgress.failedCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE.WITHDRAWN" size="sm">
            {{ PASSBACK_STATUS_LABEL.WITHDRAWN }} {{ detailProgress.withdrawnCount }}
          </UiTag>
        </div>
        <div v-if="detailProgress.totalCount === 0" class="hint-text" style="margin-top: 8px">
          该任务尚未生成回写记录，可能仍在等待执行。
        </div>
      </template>
      <a-skeleton v-else-if="progressLoading" active :paragraph="{ rows: 1 }" />
    </UiCard>

    <a-descriptions v-if="detailTask" :column="1" bordered size="small">
      <a-descriptions-item label="同步任务编号">{{ detailTask.id }}</a-descriptions-item>
      <a-descriptions-item label="当前考试">{{ selectedExamLabel }}</a-descriptions-item>
      <a-descriptions-item label="外部系统">
        {{ externalSystemTypeLabel(detailTask.externalSystemType) }}
      </a-descriptions-item>
      <a-descriptions-item label="同步类型">
        {{ syncTypeLabel(detailTask.syncType) }}
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        <UiTag :tone="syncStatusTone(detailTask.taskStatus)" size="sm">
          {{ syncTaskStatusLabel(detailTask.taskStatus) }}
        </UiTag>
      </a-descriptions-item>
      <a-descriptions-item label="重试">
        {{ detailTask.retryCount }} / {{ detailTask.maxRetryCount }}
      </a-descriptions-item>
      <a-descriptions-item label="外部课程编号">
        {{ detailTask.externalCourseId ?? '未绑定外部课程编号' }}
      </a-descriptions-item>
      <a-descriptions-item label="外部成绩项编号">
        {{ detailTask.externalLineItemId ?? '未绑定外部成绩项编号' }}
      </a-descriptions-item>
      <a-descriptions-item label="同步目标">
        {{ buildSyncTargetSummary(detailTask) }}
      </a-descriptions-item>
      <a-descriptions-item label="最后同步时间">
        {{ detailTask.lastSyncTime ?? '尚未执行同步' }}
      </a-descriptions-item>
      <a-descriptions-item v-if="detailTask.lastErrorMessage" label="最近处理说明">
        <span class="error-text">{{ detailTask.lastErrorMessage }}</span>
      </a-descriptions-item>
      <a-descriptions-item label="操作" :span="1">
        <a-space>
          <UiButton
            v-if="detailTask.id"
            size="sm"
            variant="outline"
            :loading="reconciling"
            @click="handleReconcile(detailTask)"
          >
            <template #icon><AuditOutlined /></template>
            对账
          </UiButton>
        </a-space>
      </a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExternalSystemTypeCode,
  PassbackProgressVO,
  PassbackRecordVO,
  PassbackStatusCode,
  ReconcileStatusCode,
  SyncTaskStatusCode,
  SyncTaskVO,
  TeachingAffairsSyncTypeCode,
} from '@/apis/mark/teaching-affairs-sync'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import AuditOutlined from '@ant-design/icons-vue/AuditOutlined'
import FileSyncOutlined from '@ant-design/icons-vue/FileSyncOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  cancelSyncTask,
  CREATABLE_SYNC_TYPE_LABEL,
  createSyncTask,
  executeGradePassback,
  EXTERNAL_SYSTEM_TYPE_LABEL,
  getPassbackProgress,
  listPassbackRecords,
  listSyncTasks,
  PASSBACK_STATUS_LABEL,
  PASSBACK_STATUS_TONE,
  RECONCILE_STATUS_LABEL,
  RECONCILE_STATUS_TONE,
  reconcilePassback,
  retrySyncTask,
  SYNC_TASK_STATUS_LABEL,
  SYNC_TASK_STATUS_TONE,
  SYNC_TYPE_LABEL,
} from '@/apis/mark/teaching-affairs-sync'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminTeachingAffairsSync' })

const route = useRoute()
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  onExamSearch,
  searching,
  resolvingPinned,
  init: initExamSelector,
} = useMarkExamContext()
const loading = ref(false)

// ─── 同步任务 ─────────────────────────────────

const syncTasks = ref<SyncTaskVO[]>([])
const syncLoading = ref(false)

const syncFilterForm = reactive<{ status?: SyncTaskStatusCode }>({})

const syncFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    placeholder: '状态过滤',
    allowClear: true,
    width: 160,
    options: Object.entries(SYNC_TASK_STATUS_LABEL).map(([value, label]) => ({
      value,
      label,
    })),
  },
]

const actionLoadingId = ref<string | undefined>(undefined)

const syncColumns: ColumnType<SyncTaskVO>[] = [
  { title: '同步任务编号', key: 'id', dataIndex: 'id', width: 120 },
  { title: '外部系统', key: 'externalSystemType', width: 140 },
  { title: '同步类型', key: 'syncType', width: 120 },
  { title: '状态', key: 'taskStatus', width: 110 },
  { title: '重试', key: 'retry', width: 80 },
  { title: '外部课程', key: 'externalCourseId', dataIndex: 'externalCourseId', width: 140 },
  { title: '最后同步', key: 'lastSyncTime', dataIndex: 'lastSyncTime', width: 160 },
  { title: '处理说明', key: 'lastError', width: 120 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' },
]


async function loadSyncTasks(options?: { quiet?: boolean }): Promise<void> {
  if (!selectedExamId.value) return
  if (!options?.quiet) {
    syncLoading.value = true
  }
  try {
    syncTasks.value = await listSyncTasks(selectedExamId.value, syncFilterForm.status)
  } catch (error) {
    if (!options?.quiet) {
      syncTasks.value = []
      showUserError(error, '教务同步任务加载失败')
    }
  } finally {
    if (!options?.quiet) {
      syncLoading.value = false
    }
    syncSyncPolling()
  }
}

let syncPollTimer: ReturnType<typeof setInterval> | null = null

function syncSyncPolling(): void {
  const syncingTask = syncTasks.value.some((task) => task.taskStatus === 'SYNCING')
  const pendingPassback = passbackRecords.value.some(
    (record) => record.passbackStatus === 'PENDING' || record.passbackStatus === 'SENT',
  )
  const shouldPoll = syncingTask || pendingPassback
  if (shouldPoll && !syncPollTimer) {
    syncPollTimer = setInterval(() => {
      void loadAllQuietly()
    }, 3000)
  } else if (!shouldPoll && syncPollTimer) {
    clearInterval(syncPollTimer)
    syncPollTimer = null
  }
}

async function loadAllQuietly(): Promise<void> {
  if (!selectedExamId.value || loading.value) {
    return
  }
  try {
    await Promise.all([
      loadSyncTasks({ quiet: true }),
      loadPassbackRecords({ quiet: true }),
    ])
    if (taskDetailOpen.value && detailTask.value?.id) {
      await loadProgress(detailTask.value.id)
    }
  } catch {
    // 轮询刷新失败时不打断当前页面操作
  }
}

function handleSyncFilterReset(): void {
  syncFilterForm.status = undefined
  void loadSyncTasks()
}

function canExecute(record: SyncTaskVO): boolean {
  // 后端 executeGradePassback 仅允许首次 PENDING 且无回写记录；重试后任务虽回到 PENDING 但记录已存在
  return record.taskStatus === 'PENDING' && record.retryCount === 0
}

function canRetry(status: SyncTaskStatusCode): boolean {
  return status === 'FAILED' || status === 'PARTIAL_SUCCESS'
}

function canCancel(status: SyncTaskStatusCode): boolean {
  return status === 'PENDING' || status === 'SYNCING'
}

async function withTaskAction(
  record: SyncTaskVO,
  action: () => Promise<void>,
  hint: string,
): Promise<void> {
  if (!record.id) return
  actionLoadingId.value = record.id
  try {
    await action()
    message.success(hint)
    await loadAll()
  } catch (error) {
    showUserError(error, `${hint}失败`)
  } finally {
    actionLoadingId.value = undefined
  }
}

function handleExecute(record: SyncTaskVO): void {
  void withTaskAction(record, () => executeGradePassback(record.id!), '已触发执行回写')
}

function handleRetry(record: SyncTaskVO): void {
  void withTaskAction(record, () => retrySyncTask(record.id!), '已重试')
}

function handleCancel(record: SyncTaskVO): void {
  void withTaskAction(record, () => cancelSyncTask(record.id!), '已取消')
}

// ─── 创建任务 Modal ─────────────────────────────

const createModalOpen = ref(false)
const creating = ref(false)
const createForm = reactive<{
  externalSystemType: ExternalSystemTypeCode
  syncType: TeachingAffairsSyncTypeCode
  externalCourseId: string
  externalLineItemId: string
}>({
  externalSystemType: 'SIS',
  syncType: 'GRADE_EXPORT',
  externalCourseId: '',
  externalLineItemId: '',
})

const createValid = computed(() =>
  Boolean(selectedExamId.value && createForm.externalSystemType && createForm.syncType),
)

function openCreateModal(): void {
  createForm.externalSystemType = 'SIS'
  createForm.syncType = 'GRADE_EXPORT'
  createForm.externalCourseId = ''
  createForm.externalLineItemId = ''
  createModalOpen.value = true
}

async function handleCreate(): Promise<void> {
  if (!selectedExamId.value || !createValid.value) return
  creating.value = true
  try {
    await createSyncTask({
      examId: selectedExamId.value,
      externalSystemType: createForm.externalSystemType,
      syncType: createForm.syncType,
      externalCourseId: createForm.externalCourseId.trim() || undefined,
      externalLineItemId: createForm.externalLineItemId.trim() || undefined,
    })
    message.success('已创建同步任务')
    createModalOpen.value = false
    await loadAll()
  } catch (error) {
    showUserError(error, '教务同步任务创建失败')
  } finally {
    creating.value = false
  }
}

// ─── 详情抽屉 + 对账 ─────────────────────────────

const taskDetailOpen = ref(false)
const detailTask = ref<SyncTaskVO | null>(null)
const reconciling = ref(false)

// 同步任务详情抽屉中的回写进度面板：通过 GET /passback/progress 拉取该任务下
// PENDING / SENT / SUCCESS / FAILED / WITHDRAWN 各状态的回写记录计数。
const detailProgress = ref<PassbackProgressVO | null>(null)
const progressLoading = ref(false)

const detailProgressPercent = computed<number>(() => {
  const p = detailProgress.value
  if (!p || !p.totalCount) return 0
  return Math.round(((p.successCount + p.withdrawnCount) / p.totalCount) * 100)
})

const detailProgressFailed = computed<number>(() => detailProgress.value?.failedCount ?? 0)

const detailProgressStatus = computed<'success' | 'exception' | 'active' | 'normal'>(() => {
  const p = detailProgress.value
  if (!p) return 'normal'
  if (p.failedCount > 0) return 'exception'
  if (p.totalCount > 0 && p.successCount + p.withdrawnCount === p.totalCount) return 'success'
  if (p.sentCount + p.pendingCount > 0) return 'active'
  return 'normal'
})

async function loadProgress(syncTaskId: string): Promise<void> {
  progressLoading.value = true
  try {
    detailProgress.value = await getPassbackProgress(syncTaskId)
  } catch (error) {
    showUserError(error, '教务回写进度加载失败')
    detailProgress.value = null
  } finally {
    progressLoading.value = false
  }
}

function openTaskDetail(record: SyncTaskVO): void {
  detailTask.value = record
  taskDetailOpen.value = true
  detailProgress.value = null
  if (record.id) {
    void loadProgress(record.id)
  }
}

function buildSyncTargetSummary(task: SyncTaskVO): string {
  const segments = [
    externalSystemTypeLabel(task.externalSystemType),
    syncTypeLabel(task.syncType),
    task.externalCourseId ? `课程 ${task.externalCourseId}` : '',
    task.externalLineItemId ? `成绩项 ${task.externalLineItemId}` : '',
  ].filter(Boolean)
  return segments.length > 0 ? segments.join(' / ') : '未配置同步目标'
}

async function handleRefreshProgress(): Promise<void> {
  if (detailTask.value?.id) {
    await loadProgress(detailTask.value.id)
  }
}

async function handleReconcile(record: SyncTaskVO): Promise<void> {
  if (!record.id) return
  reconciling.value = true
  try {
    await reconcilePassback(record.id)
    message.success('已执行对账')
    await loadAll()
  } catch (error) {
    showUserError(error, '教务回写对账失败')
  } finally {
    reconciling.value = false
  }
}

// ─── 回写记录 ─────────────────────────────────

const passbackRecords = ref<PassbackRecordVO[]>([])
const passbackLoading = ref(false)

const passbackFilterForm = reactive<{ syncTaskId?: string, passbackStatus?: PassbackStatusCode }>({})

const passbackFilterFields: FilterField[] = [
  {
    key: 'syncTaskId',
    type: 'input',
    placeholder: '按同步任务编号过滤',
    allowClear: true,
    width: 160,
    triggerSearchOnChange: false,
  },
  {
    key: 'passbackStatus',
    type: 'select',
    placeholder: '回写状态',
    allowClear: true,
    width: 160,
    options: Object.entries(PASSBACK_STATUS_LABEL).map(([value, label]) => ({
      value,
      label,
    })),
  },
]

const passbackPagination = reactive({
  pageNum: 1,
  pageSize: 50,
  total: 0,
})

const passbackColumns: ColumnType<PassbackRecordVO>[] = [
  { title: '回写记录编号', key: 'id', dataIndex: 'id', width: 110 },
  { title: '同步任务', key: 'syncTaskId', dataIndex: 'syncTaskId', width: 100 },
  { title: '学生', key: 'studentName', dataIndex: 'studentName', width: 140 },
  { title: '学号', key: 'studentNo', dataIndex: 'studentNo', width: 120 },
  { title: '本地分', key: 'localScore', dataIndex: 'localScore', width: 80 },
  { title: '外部分', key: 'externalScore', dataIndex: 'externalScore', width: 80 },
  { title: '回写状态', key: 'passbackStatus', width: 110 },
  { title: '对账状态', key: 'reconcileStatus', width: 100 },
  { title: '回写时间', key: 'passbackTime', dataIndex: 'passbackTime', width: 160 },
  { title: '处理说明', key: 'errorMessage', width: 220 },
]

async function loadPassbackRecords(options?: { quiet?: boolean }): Promise<void> {
  if (!selectedExamId.value) return
  if (!options?.quiet) {
    passbackLoading.value = true
  }
  try {
    const page = await listPassbackRecords({
      examId: selectedExamId.value,
      syncTaskId: passbackFilterForm.syncTaskId?.trim() || undefined,
      passbackStatus: passbackFilterForm.passbackStatus,
      pageNum: passbackPagination.pageNum,
      pageSize: passbackPagination.pageSize,
    })
    passbackRecords.value = readPageList(page, '教务回写记录加载失败，请稍后重试')
    passbackPagination.pageNum = page.pageNum
    passbackPagination.pageSize = page.pageSize
    passbackPagination.total = readPageTotal(page, '教务回写记录加载失败，请稍后重试')
  } catch (error) {
    if (!options?.quiet) {
      passbackRecords.value = []
      passbackPagination.total = 0
      showUserError(error, '教务回写记录加载失败')
    }
  } finally {
    if (!options?.quiet) {
      passbackLoading.value = false
    }
    syncSyncPolling()
  }
}

function reloadPassbackRecordsFromFirstPage(): void {
  passbackPagination.pageNum = 1
  void loadPassbackRecords()
}

function handlePassbackFilterReset(): void {
  passbackFilterForm.syncTaskId = undefined
  passbackFilterForm.passbackStatus = undefined
  reloadPassbackRecordsFromFirstPage()
}

function handlePassbackPageChange(pageInfo: { current: number, pageSize: number }): void {
  passbackPagination.pageNum = pageInfo.current
  passbackPagination.pageSize = pageInfo.pageSize
  void loadPassbackRecords()
}

// ─── 共用 ─────────────────────────────────

function externalSystemTypeLabel(code: ExternalSystemTypeCode): string {
  return strictEnumLabel(EXTERNAL_SYSTEM_TYPE_LABEL, code, '外部系统类型')
}

function syncTypeLabel(code: TeachingAffairsSyncTypeCode): string {
  return strictEnumLabel(SYNC_TYPE_LABEL, code, '同步类型')
}

function syncTaskStatusLabel(status: SyncTaskStatusCode): string {
  return strictEnumLabel(SYNC_TASK_STATUS_LABEL, status, '同步任务状态')
}

function syncStatusTone(status: SyncTaskStatusCode): BadgeTone {
  return strictEnumTone(SYNC_TASK_STATUS_TONE, status, '同步任务状态')
}

function passbackStatusLabel(status: PassbackStatusCode): string {
  return strictEnumLabel(PASSBACK_STATUS_LABEL, status, '回写状态')
}

function passbackStatusTone(status: PassbackStatusCode): BadgeTone {
  return strictEnumTone(PASSBACK_STATUS_TONE, status, '回写状态')
}

function reconcileStatusLabel(status: ReconcileStatusCode): string {
  return strictEnumLabel(RECONCILE_STATUS_LABEL, status, '对账状态')
}

function reconcileStatusTone(status: ReconcileStatusCode): BadgeTone {
  return strictEnumTone(RECONCILE_STATUS_TONE, status, '对账状态')
}

function ellipsis(text: string | undefined, len = 40): string {
  if (!text) return '-'
  return text.length > len ? `${text.slice(0, len)}…` : text
}

async function loadAll(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    await Promise.all([loadSyncTasks(), loadPassbackRecords()])
  } finally {
    loading.value = false
  }
}

function handleExamChange(value: SelectValue): void {
  onExamChange(value)
}

// B-8: selectedExamId 由 useMarkExamSelector 与 URL 双向同步
watch(selectedExamId, (value) => {
  syncTasks.value = []
  passbackRecords.value = []
  passbackPagination.pageNum = 1
  passbackPagination.total = 0
  if (value) {
    void loadAll()
  }
}, { immediate: true })

onMounted(async () => {
  await initExamSelector()
})

onActivated(() => {
  if (selectedExamId.value) {
    void loadAll()
  }
})

onBeforeUnmount(() => {
  if (syncPollTimer) {
    clearInterval(syncPollTimer)
    syncPollTimer = null
  }
})
</script>

<style lang="scss" scoped>
.sync-page {
  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.empty-block {
  margin-top: 80px;
}

.error-text {
  color: var(--ant-color-error);
  font-size: 12px;
}

.hint-text {
  color: var(--ant-color-text-tertiary);
  font-size: 12px;
}

.progress-card {
  margin-bottom: 12px;
}

.progress-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
</style>
