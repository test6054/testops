<template>
  <StageWorkbenchShell class="sync-page">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="isJourneyChrome ? contextBarTitle : '教务同步'"
        :subtitle="isJourneyChrome ? contextBarSubtitle : '考后归档'"
      >
        <template #status>
          <UiTag
            v-if="isJourneyChrome && chromeExamStatusLabel"
            :tone="chromeExamStatusTone"
            size="sm"
          >
            {{ chromeExamStatusLabel }}
          </UiTag>
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
        </template>
        <template #actions>
          <UiButton
            v-if="canManageOwnerTeachingAffairsWrites"
            variant="primary"
            size="sm"
            :disabled="!selectedExamId"
            @click="openCreateModal"
          >
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

    <template v-if="selectedExamId" #signal>
      <SignalBand compact variant="panel" :metrics="syncSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" class="sync-page__empty" />

    <UiEmpty
      size="sm"
      v-else-if="loadFailed"
      description="教务同步数据加载失败"
      class="sync-page__empty"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav v-if="isExamWorkspaceRoute" />

      <WorkbenchSurfaceCard flush class="sync-page__section">
        <template #head>
          <div class="sync-page__card-head">
            <span class="sync-page__flow-hint">{{ SYNC_TASK_FLOW_HINT }}</span>
            <span class="sync-page__card-title">
              <SyncOutlined />
              同步任务
            </span>
          </div>
        </template>
        <template #toolbar>
          <UiFilterBar
            v-model="syncFilterForm"
            :fields="syncFilterFields"
            variant="plain"
            search-text="查询"
            @search="reloadSyncTasksFromFirstPage"
            @reset="handleSyncFilterReset"
          />
        </template>

        <UiDataTable
          v-model:current="syncPagination.pageNum"
          v-model:page-size="syncPagination.pageSize"
          pagination-mode="server"
          :columns="syncColumns"
          :data-source="syncTasks"
          :loading="syncLoading"
          :total="syncTaskTotal"
          flat
          row-key="id"
          size="middle"
          @page-change="handleSyncPageChange"
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
              <UiTooltip
                v-if="syncTasks[index].lastErrorMessage"
                :title="syncTasks[index].lastErrorMessage"
                popup-mount="body"
              >
                <span class="error-text">{{
                  ellipsis(syncTasks[index].lastErrorMessage, 40)
                }}</span>
              </UiTooltip>
              <span v-else class="hint-text">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildSyncTaskActions(syncTasks[index])"
                split
                @action="(key) => handleSyncTaskAction(key, syncTasks[index])"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard flush class="sync-page__section">
        <template #head>
          <div class="sync-page__card-head">
            <span>
              <FileSyncOutlined />
              回写记录
            </span>
          </div>
        </template>
        <template #toolbar>
          <UiFilterBar
            v-model="passbackFilterForm"
            :fields="passbackFilterFields"
            variant="plain"
            search-text="查询"
            @search="reloadPassbackRecordsFromFirstPage"
            @reset="handlePassbackFilterReset"
          />
        </template>

        <UiDataTable
          v-model:current="passbackPagination.pageNum"
          v-model:page-size="passbackPagination.pageSize"
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
              <UiTooltip
                v-if="passbackRecords[index].errorMessage"
                :title="passbackRecords[index].errorMessage"
                popup-mount="body"
              >
                <span class="error-text">{{
                  ellipsis(passbackRecords[index].errorMessage, 40)
                }}</span>
              </UiTooltip>
              <span v-else class="hint-text">-</span>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>

  <!-- 创建任务 Modal -->
  <UiDialog
    v-model:open="createModalOpen"
    title="新建同步任务"
    :width="640"
    :confirm-loading="creating"
    ok-text="创建"
    @ok="handleCreate"
  >
    <template #footer>
      <UiButton size="sm" variant="outline" @click="createModalOpen = false">取消</UiButton>
      <UiButton
        variant="primary"
        size="sm"
        :loading="creating"
        :disabled="!createValid"
        @click="handleCreate"
      >
        创建
      </UiButton>
    </template>
    <UiForm layout="vertical">
      <UiFormItem label="外部系统类型" required>
        <UiRadioGroup
          v-model="createForm.externalSystemType"
          size="sm"
          :options="EXTERNAL_SYSTEM_TYPE_OPTIONS"
        />
      </UiFormItem>
      <UiFormItem label="同步类型" required>
        <UiRadioGroup
          v-model="createForm.syncType"
          size="sm"
          :options="CREATABLE_SYNC_TYPE_OPTIONS"
        />
        <div class="hint-text" style="margin-top: var(--dp-space-component-xs)">
          当前仅开放成绩回写；名单导入、成绩更正与撤销将在后端能力开放后启用。
          {{ GRADE_EXPORT_PASSBACK_PRECONDITION_HINT }}
        </div>
      </UiFormItem>
      <UiFormItem label="外部课程编号">
        <UiInput
          size="sm"
          v-model="createForm.externalCourseId"
          placeholder="如教务系统中的课程编号"
        />
      </UiFormItem>
      <UiFormItem label="外部成绩项编号">
        <UiInput
          size="sm"
          v-model="createForm.externalLineItemId"
          placeholder="如成绩册中的成绩项编号"
        />
      </UiFormItem>
    </UiForm>
  </UiDialog>

  <!-- 任务详情抽屉 -->
  <UiDrawer v-model:open="taskDetailOpen" title="同步任务详情" :width="540" hide-footer>
    <!-- 回写进度面板：聚合 PENDING / SENT / SUCCESS / FAILED / WITHDRAWN 五种状态计数 -->
    <WorkbenchSurfaceCard v-if="detailTask" class="progress-card">
      <template #head>
        <div class="progress-card__head">
          <span class="progress-card__title">
            <FileSyncOutlined />
            回写进度
          </span>
          <UiButton
            size="sm"
            variant="outline"
            :loading="progressLoading"
            @click="handleRefreshProgress"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </template>

      <template v-if="detailProgress">
        <UiProgressBar
          :percent="detailProgressPercent"
          :color="detailProgressFailed > 0 ? 'var(--dp-error)' : 'var(--dp-color-primary)'"
        />
        <div class="progress-counts">
          <UiTag tone="gray" size="sm">总数 {{ detailProgress.totalCount }}</UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE[PassbackStatusCode.PENDING]" size="sm">
            {{ strictEnumLabel(PassbackStatusDescription, PassbackStatusCode.PENDING, '回写状态') }}
            {{ detailProgress.pendingCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE[PassbackStatusCode.SENT]" size="sm">
            {{ strictEnumLabel(PassbackStatusDescription, PassbackStatusCode.SENT, '回写状态') }}
            {{ detailProgress.sentCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE[PassbackStatusCode.SUCCESS]" size="sm">
            {{ strictEnumLabel(PassbackStatusDescription, PassbackStatusCode.SUCCESS, '回写状态') }}
            {{ detailProgress.successCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE[PassbackStatusCode.FAILED]" size="sm">
            {{ strictEnumLabel(PassbackStatusDescription, PassbackStatusCode.FAILED, '回写状态') }}
            {{ detailProgress.failedCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_TONE[PassbackStatusCode.WITHDRAWN]" size="sm">
            {{
              strictEnumLabel(PassbackStatusDescription, PassbackStatusCode.WITHDRAWN, '回写状态')
            }}
            {{ detailProgress.withdrawnCount }}
          </UiTag>
        </div>
        <div v-if="detailProgress.totalCount === 0" class="hint-text" style="margin-top: var(--dp-space-component-tight)">
          该任务尚未生成回写记录，可能仍在等待执行。
        </div>
      </template>
      <UiSkeletonState v-else-if="progressLoading" variant="card" compact />
    </WorkbenchSurfaceCard>

    <UiDescriptions v-if="detailTask" :column="1" bordered size="small">
      <UiDescriptionsItem label="同步任务编号">{{ detailTask.id }}</UiDescriptionsItem>
      <UiDescriptionsItem label="当前考试">{{ selectedExamLabel }}</UiDescriptionsItem>
      <UiDescriptionsItem label="外部系统">
        {{ externalSystemTypeLabel(detailTask.externalSystemType) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="同步类型">
        {{ syncTypeLabel(detailTask.syncType) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="状态">
        <UiTag :tone="syncStatusTone(detailTask.taskStatus)" size="sm">
          {{ syncTaskStatusLabel(detailTask.taskStatus) }}
        </UiTag>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="重试">
        {{ detailTask.retryCount }} / {{ detailTask.maxRetryCount }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="外部课程编号">
        {{ detailTask.externalCourseId ?? '未绑定外部课程编号' }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="外部成绩项编号">
        {{ detailTask.externalLineItemId ?? '未绑定外部成绩项编号' }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="同步目标">
        {{ buildSyncTargetSummary(detailTask) }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="最后同步时间">
        {{ detailTask.lastSyncTime ?? '尚未执行同步' }}
      </UiDescriptionsItem>
      <UiDescriptionsItem v-if="detailTask.lastErrorMessage" label="最近处理说明">
        <span class="error-text">{{ detailTask.lastErrorMessage }}</span>
      </UiDescriptionsItem>
      <UiDescriptionsItem label="操作" :span="1">
        <div class="dp-space" style="--dp-space-component: 8px">
          <UiButton
            v-if="detailTask.id && canManageOwnerTeachingAffairsWrites"
            size="sm"
            variant="outline"
            :loading="reconciling"
            @click="handleReconcile(detailTask)"
          >
            <template #icon><AuditOutlined /></template>
            对账
          </UiButton>
        </div>
      </UiDescriptionsItem>
    </UiDescriptions>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamTeachingAffairsSyncTask,
  PassbackProgressResponse,
  PassbackRecordResponse,
  ReconcileStatusCode,
} from '@/apis/mark/teaching-affairs-sync'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
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
  CREATABLE_SYNC_TYPE_OPTIONS,
  createSyncTask,
  executeGradePassback,
  EXTERNAL_SYSTEM_TYPE_OPTIONS,
  ExternalSystemTypeCode,
  ExternalSystemTypeDescription,
  getPassbackProgress,
  GRADE_EXPORT_PASSBACK_PRECONDITION_HINT,
  listPassbackRecords,
  pageSyncTasks,
  PASSBACK_STATUS_OPTIONS,
  PASSBACK_STATUS_TONE,
  PassbackStatusCode,
  PassbackStatusDescription,
  RECONCILE_STATUS_TONE,
  reconcilePassback,
  ReconcileStatusDescription,
  retrySyncTask,
  SYNC_TASK_FLOW_HINT,
  SYNC_TASK_STATUS_OPTIONS,
  SYNC_TASK_STATUS_TONE,
  SyncTaskStatusCode,
  SyncTaskStatusDescription,
  TeachingAffairsSyncTypeCode,
  TeachingAffairsSyncTypeDescription,
} from '@/apis/mark/teaching-affairs-sync'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useOptionalExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminTeachingAffairsSync' })

const route = useRoute()
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')

const {
  isJourneyChrome,
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel: chromeExamStatusLabel,
  examStatusTone: chromeExamStatusTone,
} = useOptionalExamJourneyContextBar('教务同步')

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
// MVR-326：仅认 BE page.canManageOwnerTeachingAffairsWrites===true；禁止 createUser 本地回退
const canManageOwnerTeachingAffairsWrites = ref(false)
const loading = ref(false)
const loadFailed = ref(false)

// ─── 同步任务 ─────────────────────────────────

const syncTasks = ref<ExamTeachingAffairsSyncTask[]>([])
const syncLoading = ref(false)
const syncTaskTotal = ref(0)
const syncingTaskTotal = ref(0)
const syncPagination = reactive({
  pageNum: 1,
  pageSize: 20,
})

const syncFilterForm = reactive<{ status?: SyncTaskStatusCode }>({})

const syncFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    placeholder: '状态过滤',
    allowClear: true,
    width: 160,
    options: SYNC_TASK_STATUS_OPTIONS,
  },
]

const actionLoadingId = ref<string | undefined>(undefined)

const syncColumns: ColumnType<ExamTeachingAffairsSyncTask>[] = [
  { title: '同步任务编号', key: 'id', dataIndex: 'id', width: 120, fixed: 'left' },
  { title: '外部系统', key: 'externalSystemType', width: 140 },
  { title: '同步类型', key: 'syncType', width: 120 },
  { title: '状态', key: 'taskStatus', width: 110 },
  { title: '重试', key: 'retry', width: 80 },
  { title: '外部课程', key: 'externalCourseId', dataIndex: 'externalCourseId', width: 140 },
  { title: '最后同步', key: 'lastSyncTime', dataIndex: 'lastSyncTime', width: 160 },
  { title: '处理说明', key: 'lastError', width: 120 },
  { title: '操作', key: 'actions', width: 280 },
]

async function loadSyncTasks(options?: { quiet?: boolean }): Promise<void> {
  if (!selectedExamId.value) {
    canManageOwnerTeachingAffairsWrites.value = false
    return
  }
  if (!options?.quiet) {
    syncLoading.value = true
    loadFailed.value = false
  }
  try {
    const quietConfig = options?.quiet ? { showErrorMessage: false as const } : undefined
    const page = await pageSyncTasks(
      {
        examId: selectedExamId.value,
        taskStatus: syncFilterForm.status,
        pageNum: syncPagination.pageNum,
        pageSize: syncPagination.pageSize,
      },
      quietConfig,
    )
    syncTasks.value = page.list
    syncTaskTotal.value = page.total
    syncPagination.pageNum = page.pageNum ?? syncPagination.pageNum
    syncPagination.pageSize = page.pageSize ?? syncPagination.pageSize
    canManageOwnerTeachingAffairsWrites.value = page.canManageOwnerTeachingAffairsWrites === true
    const syncingPage = await pageSyncTasks(
      {
        examId: selectedExamId.value,
        taskStatus: SyncTaskStatusCode.SYNCING,
        pageNum: 1,
        pageSize: 1,
      },
      quietConfig,
    )
    syncingTaskTotal.value = syncingPage.total
  } catch (error) {
    if (!options?.quiet) {
      syncTasks.value = []
      syncTaskTotal.value = 0
      syncingTaskTotal.value = 0
      canManageOwnerTeachingAffairsWrites.value = false
      loadFailed.value = true
      showUserError(error, '教务同步任务加载失败')
    }
  } finally {
    if (!options?.quiet) {
      syncLoading.value = false
    }
    syncSyncPolling()
  }
}

function reloadSyncTasksFromFirstPage(): void {
  syncPagination.pageNum = 1
  void loadSyncTasks()
}

function handleSyncFilterReset(): void {
  syncFilterForm.status = undefined
  reloadSyncTasksFromFirstPage()
}

function handleSyncPageChange(pageInfo: { current: number, pageSize: number }): void {
  syncPagination.pageNum = pageInfo.current
  syncPagination.pageSize = pageInfo.pageSize
  void loadSyncTasks()
}

let syncPollTimer: ReturnType<typeof setInterval> | null = null

function syncSyncPolling(): void {
  const syncingTask = syncingTaskTotal.value > 0
  const pendingPassback = passbackRecords.value.some(
    (record) =>
      record.passbackStatus === PassbackStatusCode.PENDING
      || record.passbackStatus === PassbackStatusCode.SENT,
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
    await Promise.all([loadSyncTasks({ quiet: true }), loadPassbackRecords({ quiet: true })])
    if (taskDetailOpen.value && detailTask.value?.id) {
      await loadProgress(detailTask.value.id)
    }
  } catch {
    // 轮询刷新失败时不打断当前页面操作
  }
}

function canExecute(record: ExamTeachingAffairsSyncTask): boolean {
  // 首次 PENDING 且从未重试：生成回写记录；MVR-206 重试走 reset FAILED→PENDING 并回 SYNCING，不再二次 execute
  return record.taskStatus === SyncTaskStatusCode.PENDING && record.retryCount === 0
}

/** MVR-206：FAILED/PARTIAL 可重试；后端重置 FAILED 回写并推进 SYNCING */
function canRetry(status: SyncTaskStatusCode): boolean {
  return status === SyncTaskStatusCode.FAILED || status === SyncTaskStatusCode.PARTIAL_SUCCESS
}

function canCancel(status: SyncTaskStatusCode): boolean {
  return status === SyncTaskStatusCode.PENDING || status === SyncTaskStatusCode.SYNCING
}

function buildSyncTaskActions(record: ExamTeachingAffairsSyncTask): UiTableRowActionItem[] {
  const loading = actionLoadingId.value === record.id
  const canWrite = canManageOwnerTeachingAffairsWrites.value
  return [
    {
      key: 'execute',
      label: '执行回写',
      tone: 'primary',
      hidden: !canWrite || !canExecute(record),
      disabled: loading,
    },
    {
      key: 'retry',
      label: '重试',
      hidden: !canWrite || !canRetry(record.taskStatus),
      disabled: loading,
    },
    {
      key: 'cancel',
      label: '取消',
      tone: 'danger',
      hidden: !canWrite || !canCancel(record.taskStatus),
      disabled: loading,
    },
    { key: 'detail', label: '详情' },
  ]
}

function handleSyncTaskAction(key: string, record: ExamTeachingAffairsSyncTask): void {
  switch (key) {
    case 'execute':
      handleExecute(record)
      break
    case 'retry':
      handleRetry(record)
      break
    case 'cancel':
      handleCancel(record)
      break
    case 'detail':
      openTaskDetail(record)
      break
  }
}

async function withTaskAction(
  record: ExamTeachingAffairsSyncTask,
  action: () => Promise<void>,
  hint: string,
): Promise<void> {
  if (!canManageOwnerTeachingAffairsWrites.value) {
    return
  }
  if (!record.id) return
  if (actionLoadingId.value) return
  actionLoadingId.value = record.id
  try {
    await action()
    void message.success(hint)
    await loadAll()
  } catch (error) {
    showUserError(error, `${hint}失败`)
  } finally {
    actionLoadingId.value = undefined
  }
}

function handleExecute(record: ExamTeachingAffairsSyncTask): void {
  // MVR-420：与 canExecute / 行内 disabled 同源二次闸（PENDING 且未重试）
  if (!canExecute(record)) {
    void message.warning('仅未执行的待处理任务可触发回写')
    return
  }
  void withTaskAction(record, () => executeGradePassback(record.id!), '已触发执行回写')
}

function handleRetry(record: ExamTeachingAffairsSyncTask): void {
  // MVR-420：与 canRetry / 行内 disabled 同源二次闸
  if (!canRetry(record.taskStatus)) {
    void message.warning('仅失败或部分成功的任务可重试')
    return
  }
  void withTaskAction(record, () => retrySyncTask(record.id!), '已重试')
}

function handleCancel(record: ExamTeachingAffairsSyncTask): void {
  // MVR-420：与 canCancel / 行内 disabled 同源二次闸
  if (!canCancel(record.taskStatus)) {
    void message.warning('当前任务状态不可取消')
    return
  }
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
  externalSystemType: ExternalSystemTypeCode.SIS,
  syncType: TeachingAffairsSyncTypeCode.GRADE_EXPORT,
  externalCourseId: '',
  externalLineItemId: '',
})

const createValid = computed(() =>
  Boolean(selectedExamId.value && createForm.externalSystemType && createForm.syncType),
)

function openCreateModal(): void {
  if (!canManageOwnerTeachingAffairsWrites.value) {
    return
  }
  createForm.externalSystemType = ExternalSystemTypeCode.SIS
  createForm.syncType = TeachingAffairsSyncTypeCode.GRADE_EXPORT
  createForm.externalCourseId = ''
  createForm.externalLineItemId = ''
  createModalOpen.value = true
}

async function handleCreate(): Promise<void> {
  if (!canManageOwnerTeachingAffairsWrites.value) {
    return
  }
  if (!selectedExamId.value || !createValid.value) return
  if (creating.value) return
  creating.value = true
  try {
    await createSyncTask({
      examId: selectedExamId.value,
      externalSystemType: createForm.externalSystemType,
      syncType: createForm.syncType,
      externalCourseId: createForm.externalCourseId.trim() || undefined,
      externalLineItemId: createForm.externalLineItemId.trim() || undefined,
    })
    void message.success('已创建同步任务')
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
const detailTask = ref<ExamTeachingAffairsSyncTask | null>(null)
const reconciling = ref(false)

// 同步任务详情抽屉中的回写进度面板：通过 GET /passback/progress 拉取该任务下
// PENDING / SENT / SUCCESS / FAILED / WITHDRAWN 各状态的回写记录计数。
const detailProgress = ref<PassbackProgressResponse | null>(null)
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

function openTaskDetail(record: ExamTeachingAffairsSyncTask): void {
  detailTask.value = record
  taskDetailOpen.value = true
  detailProgress.value = null
  if (record.id) {
    void loadProgress(record.id)
  }
}

function buildSyncTargetSummary(task: ExamTeachingAffairsSyncTask): string {
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

async function handleReconcile(record: ExamTeachingAffairsSyncTask): Promise<void> {
  if (!canManageOwnerTeachingAffairsWrites.value) {
    return
  }
  if (!record.id) return
  reconciling.value = true
  try {
    await reconcilePassback(record.id)
    void message.success('已执行对账')
    await loadAll()
  } catch (error) {
    showUserError(error, '教务回写对账失败')
  } finally {
    reconciling.value = false
  }
}

// ─── 回写记录 ─────────────────────────────────

const passbackRecords = ref<PassbackRecordResponse[]>([])
const passbackLoading = ref(false)

const passbackFilterForm = reactive<{ syncTaskId?: string, passbackStatus?: PassbackStatusCode }>(
  {},
)

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
    options: PASSBACK_STATUS_OPTIONS,
  },
]

const passbackPagination = reactive({
  pageNum: 1,
  pageSize: 50,
  total: 0,
})

const syncSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'tasks',
    label: '同步任务',
    value: syncTaskTotal.value,
    unit: '条',
    tone: syncTaskTotal.value > 0 ? 'blue' : 'gray',
  },
  {
    key: 'passback',
    label: '回写记录',
    value: passbackPagination.total,
    unit: '条',
    tone: passbackPagination.total > 0 ? 'green' : 'gray',
  },
])

const passbackColumns: ColumnType<PassbackRecordResponse>[] = [
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
    const page = await listPassbackRecords(
      {
        examId: selectedExamId.value,
        syncTaskId: passbackFilterForm.syncTaskId?.trim() || undefined,
        passbackStatus: passbackFilterForm.passbackStatus,
        pageNum: passbackPagination.pageNum,
        pageSize: passbackPagination.pageSize,
      },
      options?.quiet ? { showErrorMessage: false } : undefined,
    )
    passbackRecords.value = page.list
    passbackPagination.pageNum = page.pageNum
    passbackPagination.pageSize = page.pageSize
    passbackPagination.total = page.total
  } catch (error) {
    if (!options?.quiet) {
      passbackRecords.value = []
      passbackPagination.total = 0
      loadFailed.value = true
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
  return strictEnumLabel(ExternalSystemTypeDescription, code, '外部系统类型')
}

function syncTypeLabel(code: TeachingAffairsSyncTypeCode): string {
  return strictEnumLabel(TeachingAffairsSyncTypeDescription, code, '同步类型')
}

function syncTaskStatusLabel(status: SyncTaskStatusCode): string {
  return strictEnumLabel(SyncTaskStatusDescription, status, '同步任务状态')
}

function syncStatusTone(status: SyncTaskStatusCode): BadgeTone {
  return strictEnumTone(SYNC_TASK_STATUS_TONE, status, '同步任务状态')
}

function passbackStatusLabel(status: PassbackStatusCode): string {
  return strictEnumLabel(PassbackStatusDescription, status, '回写状态')
}

function passbackStatusTone(status: PassbackStatusCode): BadgeTone {
  return strictEnumTone(PASSBACK_STATUS_TONE, status, '回写状态')
}

function reconcileStatusLabel(status: ReconcileStatusCode): string {
  return strictEnumLabel(ReconcileStatusDescription, status, '对账状态')
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
  loadFailed.value = false
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
watch(
  selectedExamId,
  (value) => {
    syncTasks.value = []
    syncTaskTotal.value = 0
    syncingTaskTotal.value = 0
    syncPagination.pageNum = 1
    passbackRecords.value = []
    passbackPagination.pageNum = 1
    passbackPagination.total = 0
    if (value) {
      void loadAll()
    }
  },
  { immediate: true },
)

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
    padding: var(--dp-space-component) 0;
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--dp-space-component);
    width: 100%;
  }

  &__flow-hint {
    margin-right: auto;
    font-size: var(--dp-font-size-xs);
    color: var(--c-text-4);
    white-space: nowrap;
  }

  &__card-title {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__section + &__section {
    margin-top: 0;
  }
}

.empty-block {
  margin-top: var(--dp-space-component);
}

.error-text {
  color: var(--dp-error);
  font-size: var(--dp-font-size-xs);
}

.hint-text {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}

.progress-card {
  margin-bottom: var(--dp-space-component);
}

.progress-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  width: 100%;
}

.progress-card__title {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-lg);
  font-weight: var(--dp-font-weight-title);
}

.progress-counts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component);
}
</style>
