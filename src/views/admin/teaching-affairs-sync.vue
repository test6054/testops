<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="sync-page__context">
        <div class="sync-page__context-left">
          <a-select
            :value="selectedExamId"
            class="sync-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag v-if="syncTasks.length > 0" tone="blue" size="sm">
            同步任务 {{ syncTasks.length }}
          </UiTag>
          <UiTag v-if="passbackPagination.total > 0" tone="green" size="sm">
            回写记录 {{ passbackPagination.total }}
          </UiTag>
        </div>
        <div class="sync-page__context-right">
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
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请先选择一场已发布成绩的考试"
      class="sync-page__empty"
    />

    <template v-else>
      <!-- D-9 错误态：同步任务加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="syncTasksLoadError"
        :error="syncTasksLoadError"
        title="同步任务加载失败"
        :helper="`考试 ID：${selectedExamId}`"
        compact
        @retry="loadSyncTasks"
      />
      <UiCard v-else class="info-card">
        <template #title>
          <SyncOutlined />
          <span>同步任务</span>
          <UiBadge tone="blue">{{ syncTasks.length }}</UiBadge>
        </template>
        <template #extra>
          <a-select
            v-model:value="syncStatusFilter"
            placeholder="状态过滤"
            style="width: 160px"
            allow-clear
            @change="loadSyncTasks"
          >
            <a-select-option
              v-for="(label, code) in SYNC_TASK_STATUS_LABEL"
              :key="code"
              :value="code"
            >
              {{ label }}
            </a-select-option>
          </a-select>
        </template>

        <UiDataTable
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
                  requireLastErrorCode(syncTasks[index].lastErrorCode)
                }}</span>
              </a-tooltip>
              <span v-else class="hint-text">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton
                  v-if="canExecute(syncTasks[index].taskStatus)"
                  size="sm"
                  :loading="actionLoadingId === syncTasks[index].id"
                  @click="handleExecute(syncTasks[index])"
                >
                  执行回写
                </UiButton>
                <UiButton
                  v-if="canRetry(syncTasks[index].taskStatus)"
                  size="sm"
                  variant="outline"
                  :loading="actionLoadingId === syncTasks[index].id"
                  @click="handleRetry(syncTasks[index])"
                >
                  重试
                </UiButton>
                <UiButton
                  v-if="canCancel(syncTasks[index].taskStatus)"
                  size="sm"
                  variant="outline"
                  :loading="actionLoadingId === syncTasks[index].id"
                  @click="handleCancel(syncTasks[index])"
                >
                  取消
                </UiButton>
                <UiButton size="sm" variant="outline" @click="openTaskDetail(syncTasks[index])">
                  详情
                </UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <!-- D-9 错误态：回写记录加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="passbackLoadError"
        :error="passbackLoadError"
        title="回写记录加载失败"
        :helper="`考试 ID：${selectedExamId}`"
        compact
        @retry="loadPassbackRecords"
      />
      <UiCard v-else class="info-card">
        <template #title>
          <FileSyncOutlined />
          <span>回写记录</span>
          <UiBadge tone="blue">{{ passbackPagination.total }}</UiBadge>
        </template>
        <template #extra>
          <a-space>
            <a-input
              v-model:value="passbackTaskFilter"
              placeholder="任务ID过滤"
              style="width: 160px"
              allow-clear
              @press-enter="reloadPassbackRecordsFromFirstPage"
            />
            <a-select
              v-model:value="passbackStatusFilter"
              placeholder="回写状态"
              style="width: 160px"
              allow-clear
              @change="reloadPassbackRecordsFromFirstPage"
            >
              <a-select-option
                v-for="(label, code) in PASSBACK_STATUS_LABEL"
                :key="code"
                :value="code"
              >
                {{ label }}
              </a-select-option>
            </a-select>
            <UiButton
              size="sm"
              variant="outline"
              :loading="passbackLoading"
              @click="loadPassbackRecords"
            >
              <template #icon><ReloadOutlined /></template>
              刷新
            </UiButton>
          </a-space>
        </template>

        <UiDataTable
          :columns="passbackColumns"
          :data-source="passbackRecords"
          :loading="passbackLoading"
          v-model:current="passbackPagination.pageNum"
          v-model:page-size="passbackPagination.pageSize"
          :total="passbackPagination.total"
          @page-change="handlePassbackPageChange"
          flat
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'passbackStatus'">
              <UiTag :tone="passbackStatusTone(passbackRecords[index].passbackStatus)" size="sm">
                {{
                  passbackRecords[index].passbackStatus
                    ? passbackStatusLabel(passbackRecords[index].passbackStatus!)
                    : '-'
                }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'reconcileStatus'">
              <UiTag
                v-if="passbackRecords[index].reconcileStatus"
                :tone="reconcileStatusTone(passbackRecords[index].reconcileStatus)"
                size="sm"
              >
                {{ reconcileStatusLabel(passbackRecords[index].reconcileStatus!) }}
              </UiTag>
              <span v-else class="hint-text">-</span>
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
          <a-radio-button v-for="(label, code) in SYNC_TYPE_LABEL" :key="code" :value="code">
            {{ label }}
          </a-radio-button>
        </a-radio-group>
        <div class="hint-text" style="margin-top: 4px">
          后端当前仅闭合 GRADE_EXPORT 路径；其他类型为预留映射。
        </div>
      </a-form-item>
      <a-form-item label="外部课程ID">
        <a-input v-model:value="createForm.externalCourseId" placeholder="如教务系统中的课程编号" />
      </a-form-item>
      <a-form-item label="外部成绩项ID">
        <a-input
          v-model:value="createForm.externalLineItemId"
          placeholder="如成绩册中的成绩项 GUID"
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
      <UiErrorRetryPanel
        v-if="progressLoadError"
        :error="progressLoadError"
        title="回写进度加载失败"
        compact
        @retry="handleRefreshProgress"
      />
      <template v-else-if="detailProgress">
        <a-progress
          :percent="detailProgressPercent"
          :status="detailProgressStatus"
          :stroke-color="detailProgressFailed > 0 ? '#d4380d' : undefined"
        />
        <div class="progress-counts">
          <UiTag tone="gray" size="sm">总数 {{ detailProgress.totalCount }}</UiTag>
          <UiTag :tone="PASSBACK_STATUS_COLOR.PENDING" size="sm">
            {{ PASSBACK_STATUS_LABEL.PENDING }} {{ detailProgress.pendingCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_COLOR.SENT" size="sm">
            {{ PASSBACK_STATUS_LABEL.SENT }} {{ detailProgress.sentCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_COLOR.SUCCESS" size="sm">
            {{ PASSBACK_STATUS_LABEL.SUCCESS }} {{ detailProgress.successCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_COLOR.FAILED" size="sm">
            {{ PASSBACK_STATUS_LABEL.FAILED }} {{ detailProgress.failedCount }}
          </UiTag>
          <UiTag :tone="PASSBACK_STATUS_COLOR.WITHDRAWN" size="sm">
            {{ PASSBACK_STATUS_LABEL.WITHDRAWN }} {{ detailProgress.withdrawnCount }}
          </UiTag>
        </div>
        <div v-if="detailProgress.totalCount === 0" class="hint-text" style="margin-top: 8px">
          该任务尚未生成回写记录，可能仍在 PENDING 状态等待执行回写。
        </div>
      </template>
      <a-skeleton v-else active :paragraph="{ rows: 1 }" />
    </UiCard>

    <a-descriptions v-if="detailTask" :column="1" bordered size="small">
      <a-descriptions-item label="任务ID">{{ detailTask.id }}</a-descriptions-item>
      <a-descriptions-item label="考试ID">{{ detailTask.examId }}</a-descriptions-item>
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
      <a-descriptions-item label="外部课程ID">
        {{ detailTask.externalCourseId ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="外部成绩项ID">
        {{ detailTask.externalLineItemId ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item label="同步目标">
        {{ buildSyncTargetSummary(detailTask) }}
      </a-descriptions-item>
      <a-descriptions-item label="最后同步时间">
        {{ detailTask.lastSyncTime ?? '-' }}
      </a-descriptions-item>
      <a-descriptions-item v-if="detailTask.lastErrorMessage" label="最后错误">
        <span class="error-text"
          >[{{ requireLastErrorCode(detailTask.lastErrorCode) }}]
          {{ detailTask.lastErrorMessage }}</span
        >
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
import {
  cancelSyncTask,
  createSyncTask,
  executeGradePassback,
  EXTERNAL_SYSTEM_TYPE_LABEL,
  getPassbackProgress,
  listPassbackRecords,
  listSyncTasks,
  PASSBACK_STATUS_COLOR,
  PASSBACK_STATUS_LABEL,
  RECONCILE_STATUS_COLOR,
  RECONCILE_STATUS_LABEL,
  reconcilePassback,
  retrySyncTask,
  SYNC_TASK_STATUS_COLOR,
  SYNC_TASK_STATUS_LABEL,
  SYNC_TYPE_LABEL,
} from '@/apis/mark/teaching-affairs-sync'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import AuditOutlined from '@ant-design/icons-vue/AuditOutlined'
import FileSyncOutlined from '@ant-design/icons-vue/FileSyncOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminTeachingAffairsSync' })

// B-8 统一考试选择器
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()
const loading = ref(false)

// ─── 同步任务 ─────────────────────────────────

const syncTasks = ref<SyncTaskVO[]>([])
const syncLoading = ref(false)
const syncStatusFilter = ref<SyncTaskStatusCode | undefined>(undefined)
const actionLoadingId = ref<string | undefined>(undefined)

const syncColumns: ColumnType<SyncTaskVO>[] = [
  { title: '任务ID', key: 'id', dataIndex: 'id', width: 120 },
  { title: '外部系统', key: 'externalSystemType', width: 140 },
  { title: '同步类型', key: 'syncType', width: 120 },
  { title: '状态', key: 'taskStatus', width: 110 },
  { title: '重试', key: 'retry', width: 80 },
  { title: '外部课程', key: 'externalCourseId', dataIndex: 'externalCourseId', width: 140 },
  { title: '最后同步', key: 'lastSyncTime', dataIndex: 'lastSyncTime', width: 160 },
  { title: '错误', key: 'lastError', width: 120 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' },
]

// D-9 错误态：同步任务 / 回写记录加载失败时 UiErrorRetryPanel 重试 + 上报
const syncTasksLoadError = ref<unknown>(null)
const passbackLoadError = ref<unknown>(null)

async function loadSyncTasks(): Promise<void> {
  if (!selectedExamId.value) return
  syncLoading.value = true
  syncTasksLoadError.value = null
  try {
    syncTasks.value = await listSyncTasks(selectedExamId.value, syncStatusFilter.value)
  } catch (error) {
    syncTasksLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载同步任务失败')
  } finally {
    syncLoading.value = false
  }
}

function canExecute(status?: SyncTaskStatusCode): boolean {
  return status === 'PENDING'
}

function canRetry(status?: SyncTaskStatusCode): boolean {
  return status === 'FAILED' || status === 'PARTIAL_SUCCESS'
}

function canCancel(status?: SyncTaskStatusCode): boolean {
  return status === 'PENDING' || status === 'SYNCING'
}

function requireLastErrorCode(code?: string): string {
  if (!code) {
    throw new Error('教务同步错误编码不符合前后端契约')
  }
  return code
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
    message.error(error instanceof Error ? error.message : `${hint}失败`)
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
    await loadSyncTasks()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建同步任务失败')
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
const progressLoadError = ref<unknown>(null)

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
  progressLoadError.value = null
  try {
    detailProgress.value = await getPassbackProgress(syncTaskId)
  } catch (error) {
    progressLoadError.value = error
    detailProgress.value = null
  } finally {
    progressLoading.value = false
  }
}

function openTaskDetail(record: SyncTaskVO): void {
  detailTask.value = record
  taskDetailOpen.value = true
  detailProgress.value = null
  progressLoadError.value = null
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
    message.error(error instanceof Error ? error.message : '对账失败')
  } finally {
    reconciling.value = false
  }
}

// ─── 回写记录 ─────────────────────────────────

const passbackRecords = ref<PassbackRecordVO[]>([])
const passbackLoading = ref(false)
const passbackTaskFilter = ref('')
const passbackStatusFilter = ref<PassbackStatusCode | undefined>(undefined)
const passbackPagination = reactive({
  pageNum: 1,
  pageSize: 50,
  total: 0,
})

const passbackColumns: ColumnType<PassbackRecordVO>[] = [
  { title: '记录ID', key: 'id', dataIndex: 'id', width: 110 },
  { title: '同步任务', key: 'syncTaskId', dataIndex: 'syncTaskId', width: 100 },
  { title: '学生用户', key: 'studentUserId', dataIndex: 'studentUserId', width: 110 },
  { title: '本地分', key: 'localScore', dataIndex: 'localScore', width: 80 },
  { title: '外部分', key: 'externalScore', dataIndex: 'externalScore', width: 80 },
  { title: '回写状态', key: 'passbackStatus', width: 110 },
  { title: '对账状态', key: 'reconcileStatus', width: 100 },
  { title: '回写时间', key: 'passbackTime', dataIndex: 'passbackTime', width: 160 },
  { title: '错误', key: 'errorMessage', width: 220 },
]

async function loadPassbackRecords(): Promise<void> {
  if (!selectedExamId.value) return
  passbackLoading.value = true
  passbackLoadError.value = null
  try {
    const page = await listPassbackRecords({
      examId: selectedExamId.value,
      syncTaskId: passbackTaskFilter.value.trim() || undefined,
      passbackStatus: passbackStatusFilter.value,
      pageNum: passbackPagination.pageNum,
      pageSize: passbackPagination.pageSize,
    })
    passbackRecords.value = page.list
    passbackPagination.pageNum = page.pageNum
    passbackPagination.pageSize = page.pageSize
    passbackPagination.total = page.total
  } catch (error) {
    passbackLoadError.value = error
    message.error(error instanceof Error ? error.message : '加载回写记录失败')
  } finally {
    passbackLoading.value = false
  }
}

function reloadPassbackRecordsFromFirstPage(): void {
  passbackPagination.pageNum = 1
  void loadPassbackRecords()
}

function handlePassbackPageChange(payload: { current: number; pageSize: number }): void {
  passbackPagination.pageNum = payload.current
  passbackPagination.pageSize = payload.pageSize
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
  return strictEnumTone(SYNC_TASK_STATUS_COLOR, status, '同步任务状态')
}

function passbackStatusLabel(status: PassbackStatusCode): string {
  return strictEnumLabel(PASSBACK_STATUS_LABEL, status, '回写状态')
}

function passbackStatusTone(status?: PassbackStatusCode): BadgeTone {
  if (!status) return 'gray'
  return strictEnumTone(PASSBACK_STATUS_COLOR, status, '回写状态')
}

function reconcileStatusLabel(status: ReconcileStatusCode): string {
  return strictEnumLabel(RECONCILE_STATUS_LABEL, status, '对账状态')
}

function reconcileStatusTone(status?: ReconcileStatusCode): BadgeTone {
  if (!status) return 'gray'
  return strictEnumTone(RECONCILE_STATUS_COLOR, status, '对账状态')
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

function handleExamChange(value: unknown): void {
  onExamChange(value as string | number | undefined, [])
  syncTasks.value = []
  passbackRecords.value = []
  passbackPagination.pageNum = 1
  passbackPagination.total = 0
  if (selectedExamId.value) {
    void loadAll()
  }
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
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadAll()
  }
})
</script>

<style lang="scss" scoped>
.sync-page {
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
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

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
  color: #d4380d;
  font-size: 12px;
}

.hint-text {
  color: rgba(0, 0, 0, 0.45);
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
