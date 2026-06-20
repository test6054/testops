<template>
  <div class="archive-list-page">
    <div class="archive-list-page__toolbar">
      <UiTag tone="blue" size="sm">{{ archivePagination.total }} 个电子归档包</UiTag>
      <UiTag v-if="selectedExamLabel" tone="purple" size="sm">{{ selectedExamLabel }}</UiTag>
    </div>

    <UiAlertStrip
      v-if="archiveAlert"
      :tone="archiveAlert.tone"
      :title="archiveAlert.title"
      dense
      class="archive-list-page__alert"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="archiveAlert!.action.handler">
          {{ archiveAlert.action.label }}
        </UiButton>
      </template>
    </UiAlertStrip>

    <a-card :bordered="false" class="detail-table-card archive-list-page__table-card">
      <template #title>
        <FileOutlined />
        <span>考试电子归档包</span>
      </template>
      <template #extra>
        <UiButton size="sm" :disabled="!canCreate" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新建电子归档包
        </UiButton>
      </template>

      <UiFilterBar
        v-model="filterForm"
        :fields="archiveFilterFields"
        search-text="查询"
        @search="handleSearch"
        @reset="handleReset"
      />

      <UiDataTable
        :columns="columns"
        :data-source="archives"
        :loading="loading"
        v-model:current="archivePagination.pageNum"
        v-model:page-size="archivePagination.pageSize"
        flat
        :total="archivePagination.total"
        row-key="archiveId"
        size="middle"
        class="archive-table student-detail-table__data-table"
        @page-change="handleArchivePageChange"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'archiveNo'">
            <button type="button" class="link-cell" @click="goDetail(archives[index].archiveId)">
              {{ archives[index].archiveNo }}
            </button>
            <div class="link-cell__sub">{{ archives[index].archiveTitle }}</div>
          </template>
          <template v-else-if="column.key === 'exam'">
            {{ archives[index].examName }}
            <div v-if="archives[index].examNo" class="muted">{{ archives[index].examNo }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="archiveStatusTone(archives[index].archiveStatus)" size="sm">
              {{ archiveStatusLabel(archives[index].archiveStatus) }}
            </UiTag>
            <div
              v-if="archives[index].archiveStatus === 'PACKAGING' && archives[index].packagingPhase"
              class="phase-line"
            >
              {{ archivePhaseLabel(archives[index].packagingPhase) }} ·
              {{ archives[index].packagingProgressPercent }}%
            </div>
          </template>
          <template v-else-if="column.key === 'retention'">
            <span v-if="archives[index].permanentRetention">永久保管</span>
            <span v-else>
              {{ archives[index].retentionYears }} 年
              <span v-if="archives[index].retentionUntil" class="muted">
                · 至 {{ archives[index].retentionUntil }}
              </span>
            </span>
          </template>
          <template v-else-if="column.key === 'fileSize'">
            <span v-if="archives[index].archiveFileSize">
              {{ formatBytes(Number(archives[index].archiveFileSize)) }}
            </span>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            <span v-if="typeof archives[index].itemCount === 'number'">
              {{ archives[index].itemCount }}
            </span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(archives[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="goDetail(archives[index].archiveId)">详情</UiTextAction>
              <UiTextAction
                v-if="
                  archives[index].archiveStatus === 'DRAFT'
                    || archives[index].archiveStatus === 'PACKAGING_FAILED'
                "
                tone="primary"
                @click="confirmPackage(archives[index])"
              >
                打包入队
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </a-card>

  <a-modal
    v-model:open="createModalOpen"
    title="新建电子归档包"
    :confirm-loading="creating"
    :ok-button-props="{ disabled: !selectedExamId }"
    ok-text="创建草稿"
    cancel-text="取消"
    @ok="submitCreate"
  >
    <a-form layout="vertical" :model="createForm" class="archive-create-form">
      <a-alert
        v-if="!selectedExamId"
        type="warning"
        show-icon
        message="请先选择考试再新建电子归档包"
      />
      <a-form-item label="当前考试">
        <a-input
          :value="selectedExamLabel"
          disabled
          placeholder="从考试工作台带入"
        />
      </a-form-item>
      <a-form-item label="电子归档包名称">
        <a-input
          v-model:value="createForm.archiveTitle"
          placeholder="留空使用默认：考试名 + 考后电子归档包"
          :maxlength="120"
        />
      </a-form-item>
      <a-form-item label="保管年限">
        <a-space>
          <a-input-number
            v-model:value="createForm.retentionYears"
            :min="1"
            :max="100"
            style="width: 120px"
            :disabled="createForm.permanentRetention"
          />
          <a-checkbox v-model:checked="createForm.permanentRetention">永久保管</a-checkbox>
        </a-space>
      </a-form-item>
      <a-form-item label="归档内容">
        <a-space direction="vertical">
          <a-checkbox v-model:checked="createForm.includeOriginalScans">
            扫描影像文件（按学生分目录）
          </a-checkbox>
          <a-checkbox v-model:checked="createForm.includeMarkedSlices">
            批改切片 + 批注 + 评分流水
          </a-checkbox>
          <a-checkbox v-model:checked="createForm.includeAnswerBooklet">
            标准答案册 + 评分细则册
          </a-checkbox>
        </a-space>
      </a-form-item>
    </a-form>
  </a-modal>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchivePackageStatusCode,
  ArchivePackageVO,
  ArchivePackagingPhase,
} from '@/apis/mark/archive'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_PACKAGE_STATUS_CODES,
  ARCHIVE_PHASE_LABEL,
  ARCHIVE_STATUS_LABEL,
  ARCHIVE_STATUS_TONE,
  createArchive,
  listArchives,
  packageArchive,
} from '@/apis/mark/archive'
import {
  UiAlertStrip,
  UiButton,
  UiDataTable,
  UiEmpty,
  UiFilterBar,
  UiTag,
  UiTextAction,
} from '@/components/ui-guide/ui'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveList' })

const router = useRouter()
const { selectedExamId, selectedExamLabel } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const archives = ref<ArchivePackageVO[]>([])
const loading = ref(false)
const creating = ref(false)
const createModalOpen = ref(false)
const archiveLoadError = ref<Error | null>(null)
const archivePagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})

const filterForm = reactive<{
  archiveStatus?: ArchivePackageStatusCode
}>({
  archiveStatus: undefined,
})

const createForm = reactive({
  archiveTitle: '',
  retentionYears: 6,
  permanentRetention: false,
  includeOriginalScans: true,
  includeMarkedSlices: true,
  includeAnswerBooklet: true,
})

const statusOptions = ARCHIVE_PACKAGE_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ARCHIVE_STATUS_LABEL, value, '归档状态'),
}))

const archiveFilterFields: FilterField[] = [
  {
    key: 'archiveStatus',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 180,
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
]

const columns: ColumnsType = [
  { title: '归档编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 220 },
  { title: '所属考试', key: 'exam', dataIndex: 'examName', width: 220 },
  { title: '状态', key: 'status', dataIndex: 'archiveStatus', width: 200 },
  { title: '保管期限', key: 'retention', dataIndex: 'retentionYears', width: 200 },
  { title: '电子归档包大小', key: 'fileSize', dataIndex: 'archiveFileSize', width: 110 },
  { title: '清单数', key: 'itemCount', dataIndex: 'itemCount', width: 90 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 200, align: 'right' },
]

const canCreate = computed(() => Boolean(selectedExamId.value))

// ─── B-10 「已发布未归档」提醒 ─────────────────────────
// 教师从 examId 进入归档列表后，如果尚未创建归档草稿，按档案合规要求需要尽快推进；
// 如果已有草稿但未入队打包，引导教师一键触发打包。
interface ArchiveAlert {
  tone: 'error' | 'warning'
  title: string
  action: { label: string, handler: () => void }
}

const archiveAlert = computed<ArchiveAlert | null>(() => {
  const examId = selectedExamId.value
  if (!examId) return null
  if (loading.value) return null
  if (archiveLoadError.value) return null
  if (archives.value.length === 0) {
    return {
      tone: 'error',
      title: '该考试尚未创建电子归档包',
      action: { label: '立即创建电子归档包', handler: openCreateModal },
    }
  }
  const pendingArchives = archives.value.filter(
    (a) => a.archiveStatus === 'DRAFT' || a.archiveStatus === 'PACKAGING_FAILED',
  )
  if (pendingArchives.length > 0) {
    const first = pendingArchives[0]
    return {
      tone: 'warning',
      title: `${pendingArchives.length} 个电子归档包草稿待打包入队`,
      action: {
        label: '打包首个电子归档包草稿',
        handler: () => confirmPackage(first),
      },
    }
  }
  return null
})

async function loadArchives(): Promise<void> {
  loading.value = true
  archiveLoadError.value = null
  try {
    const page = await listArchives({
      examId: selectedExamId.value || undefined,
      archiveStatus: filterForm.archiveStatus,
      pageNum: archivePagination.pageNum,
      pageSize: archivePagination.pageSize,
    })
    archives.value = readPageList(page, '电子归档包列表加载失败，请稍后重试')
    archivePagination.pageNum = page.pageNum
    archivePagination.pageSize = page.pageSize
    archivePagination.total = readPageTotal(page, '电子归档包列表加载失败，请稍后重试')
  } catch (error) {
    archiveLoadError.value = toUserError(error, '电子归档包列表加载失败')
    showUserError(error, '考试电子归档包加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  archivePagination.pageNum = 1
  void loadArchives()
}

function handleReset(): void {
  filterForm.archiveStatus = undefined
  archivePagination.pageNum = 1
  void loadArchives()
}

function handleArchivePageChange(pageInfo: { current: number, pageSize: number }): void {
  archivePagination.pageNum = pageInfo.current
  archivePagination.pageSize = pageInfo.pageSize
  void loadArchives()
}

function openCreateModal(): void {
  if (!selectedExamId.value) {
    message.warning('请先选择考试后再创建电子归档包')
    return
  }
  createForm.archiveTitle = ''
  createForm.retentionYears = 6
  createForm.permanentRetention = false
  createForm.includeOriginalScans = true
  createForm.includeMarkedSlices = true
  createForm.includeAnswerBooklet = true
  createModalOpen.value = true
}

async function submitCreate(): Promise<void> {
  if (!selectedExamId.value) {
    message.warning('请先选择考试后再创建电子归档包')
    return
  }
  if (
    !createForm.includeOriginalScans
    && !createForm.includeMarkedSlices
    && !createForm.includeAnswerBooklet
  ) {
    message.warning('归档内容至少包含一类材料')
    return
  }
  creating.value = true
  try {
    await createArchive({
      examId: selectedExamId.value,
      archiveTitle: createForm.archiveTitle?.trim() || undefined,
      retentionYears: createForm.permanentRetention ? undefined : createForm.retentionYears,
      permanentRetention: createForm.permanentRetention,
      includeOriginalScans: createForm.includeOriginalScans,
      includeMarkedSlices: createForm.includeMarkedSlices,
      includeAnswerBooklet: createForm.includeAnswerBooklet,
    })
    message.success('考试电子归档包草稿已创建')
    createModalOpen.value = false
    await loadArchives()
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '考试电子归档包草稿创建失败')
  } finally {
    creating.value = false
  }
}

function confirmPackage(record: ArchivePackageVO): void {
  void confirmAsync({
    title: '确认入队打包？',
    content: `考试电子归档包 ${record.archiveNo} 将进入异步打包队列，过程可能需要数分钟。`,
    type: 'info',
    okText: '入队打包',
    cancelText: '取消',
    onOk: async () => {
      try {
        await packageArchive(record.archiveId)
        message.success('考试电子归档包已入队，正在异步打包')
        await loadArchives()
        try {
          await refreshSnapshot()
        } catch {
          // 非工作台上下文时忽略
        }
      } catch (error) {
        showUserError(error, '考试电子归档包打包提交失败')
      }
    },
  })
}

function goDetail(archiveId: string): void {
  void router.push({ name: 'TeacherArchiveDetail', params: { archiveId } })
}

function archiveStatusTone(status: ArchivePackageStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_STATUS_TONE, status, '归档状态')
}

function archiveStatusLabel(status: ArchivePackageStatusCode): string {
  return strictEnumLabel(ARCHIVE_STATUS_LABEL, status, '归档状态')
}

function archivePhaseLabel(phase: ArchivePackagingPhase): string {
  return strictEnumLabel(ARCHIVE_PHASE_LABEL, phase, '归档打包阶段')
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

watch(selectedExamId, (value) => {
  archivePagination.pageNum = 1
  if (value) {
    void loadArchives()
  } else {
    archives.value = []
    archivePagination.total = 0
  }
})

onMounted(async () => {
  await loadArchives()
})
</script>

<style lang="scss" scoped>
.archive-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
}

.archive-list-page__alert {
  margin-bottom: 4px;
}

.archive-list-page__table-card {
  width: 100%;
}

.archive-list-page__exam-select {
  min-width: 260px;
}

.archive-table {
  width: 100%;
}

.link-cell {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--ant-color-primary);
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }

  &__sub {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
    margin-top: 2px;
  }
}

.muted {
  color: var(--ant-color-text-quaternary);
}

.phase-line {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.archive-create-form {
  padding: 8px 0;
}
</style>
