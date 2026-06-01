<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="archive-list-page__context">
        <div class="archive-list-page__context-left">
          <UiTag tone="blue" size="sm">{{ archivePagination.total }} 个归档</UiTag>
          <UiTag v-if="selectedExam" tone="purple" size="sm">
            {{
              selectedExam.examNo
                ? `${selectedExam.examName} (${selectedExam.examNo})`
                : selectedExam.examName
            }}
          </UiTag>
        </div>
        <div class="archive-list-page__context-right">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadArchives">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" :disabled="!canCreate" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            新建归档
          </UiButton>
        </div>
      </div>
    </template>

    <UiAlertStrip
      v-if="archiveAlert"
      :tone="archiveAlert.tone"
      :title="archiveAlert.title"
      dense
      class="archive-list-page__alert"
    >
      {{ archiveAlert.description }}
      <template #actions>
        <UiButton size="sm" variant="outline" @click="archiveAlert!.action.handler">
          {{ archiveAlert.action.label }}
        </UiButton>
      </template>
    </UiAlertStrip>

    <UiCard class="archive-list-page__filter-card">
      <template #title>
        <SearchOutlined />
        <span>筛选条件</span>
      </template>

      <a-form layout="inline" :model="filterForm" @submit.prevent="handleSearch">
        <a-form-item label="当前考试">
          <a-select
            :value="selectedExamId"
            placeholder="选择考试"
            allow-clear
            show-search
            :loading="examLoading"
            :options="examOptions"
            option-filter-prop="label"
            style="width: 260px"
            @change="onExamChange"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="filterForm.archiveStatus"
            placeholder="全部状态"
            allow-clear
            style="width: 180px"
            :options="statusOptions"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <UiButton size="sm" @click="handleSearch">查询</UiButton>
            <UiButton size="sm" variant="outline" @click="handleReset">重置</UiButton>
          </a-space>
        </a-form-item>
      </a-form>
    </UiCard>

    <UiCard class="archive-list-page__table-card">
      <template #title>
        <FileOutlined />
        <span>归档列表</span>
        <UiBadge tone="blue">{{ archivePagination.total }} 条</UiBadge>
      </template>

      <UiErrorRetryPanel
        v-if="archiveLoadError"
        :error="archiveLoadError"
        title="归档列表加载失败"
        compact
        @retry="loadArchives"
      />
      <UiEmpty v-else-if="!loading && archives.length === 0" description="尚未创建任何归档包" />

      <UiDataTable
        v-else
        :columns="columns"
        :data-source="archives"
        :loading="loading"
        v-model:current="archivePagination.pageNum"
        v-model:page-size="archivePagination.pageSize"
        flat
        :total="archivePagination.total"
        row-key="archiveId"
        size="middle"
        class="archive-table"
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
            <a-space>
              <UiButton size="sm" variant="ghost" @click="goDetail(archives[index].archiveId)">
                详情
              </UiButton>
              <UiButton
                v-if="
                  archives[index].archiveStatus === 'DRAFT' ||
                  archives[index].archiveStatus === 'PACKAGING_FAILED'
                "
                size="sm"
                @click="confirmPackage(archives[index])"
              >
                打包入队
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>

  <a-modal
    v-model:open="createModalOpen"
    title="新建归档包"
    :confirm-loading="creating"
    :ok-button-props="{ disabled: !selectedExamId }"
    ok-text="创建草稿"
    cancel-text="取消"
    @ok="submitCreate"
  >
    <a-form layout="vertical" :model="createForm" class="archive-create-form">
      <a-alert v-if="!selectedExamId" type="warning" show-icon message="请先选择考试再新建归档" />
      <a-form-item label="当前考试">
        <a-input
          :value="
            selectedExam?.examNo
              ? `${selectedExam.examName} (${selectedExam.examNo})`
              : selectedExam?.examName
          "
          disabled
          placeholder="从筛选区当前考试带入"
        />
      </a-form-item>
      <a-form-item label="归档包名称">
        <a-input
          v-model:value="createForm.archiveTitle"
          placeholder="留空使用默认：考试名+考后归档包"
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
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchivePackageStatusCode,
  ArchivePackageVO,
  ArchivePackagingPhase,
} from '@/apis/mark/archive'
import {
  ARCHIVE_PACKAGE_STATUS_CODES,
  ARCHIVE_PHASE_LABEL,
  ARCHIVE_STATUS_LABEL,
  ARCHIVE_STATUS_TONE,
  createArchive,
  listArchives,
  packageArchive,
} from '@/apis/mark/archive'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveList' })

const router = useRouter()
const markStageStore = useMarkStageStore()
const examContextStore = useMarkExamContextStore()
const {
  selectedExamId,
  selectedExam,
  examOptions,
  loading: examLoading,
  onExamChange,
  init,
} = useMarkExamSelector()

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

const columns: ColumnsType = [
  { title: '归档编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 220 },
  { title: '所属考试', key: 'exam', dataIndex: 'examName', width: 220 },
  { title: '状态', key: 'status', dataIndex: 'archiveStatus', width: 200 },
  { title: '保管期限', key: 'retention', dataIndex: 'retentionYears', width: 200 },
  { title: '归档包大小', key: 'fileSize', dataIndex: 'archiveFileSize', width: 110 },
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
  description: string
  action: { label: string; handler: () => void }
}

const archiveAlert = computed<ArchiveAlert | null>(() => {
  const examId = selectedExamId.value
  if (!examId) return null
  if (loading.value) return null
  if (archiveLoadError.value) return null
  // 1) 已选考试但归档列表为空：可能是「成绩已发布但归档未启动」
  if (archives.value.length === 0) {
    return {
      tone: 'error',
      title: '该考试尚未创建归档包',
      description:
        '按档案合规要求，成绩发布后应及时归档扫描影像、批改流水与评分细则。点击立即创建归档草稿，再触发打包。',
      action: { label: '立即创建归档', handler: openCreateModal },
    }
  }
  // 2) 已有归档但仍处于 DRAFT 或 PACKAGING_FAILED：未入队/失败
  const pendingArchives = archives.value.filter(
    (a) => a.archiveStatus === 'DRAFT' || a.archiveStatus === 'PACKAGING_FAILED',
  )
  if (pendingArchives.length > 0) {
    const first = pendingArchives[0]
    return {
      tone: 'warning',
      title: `${pendingArchives.length} 个归档草稿待打包入队`,
      description: '草稿状态的归档包尚未生成最终 ZIP，请尽快入队打包以完成档案保管。',
      action: {
        label: '打包首个草稿',
        handler: () => confirmPackage(first),
      },
    }
  }
  return null
})

/**
 * 归档阶段状态映射：将归档包状态转换为 ARCHIVE 阶段状态。
 *
 * 设计原则：归档阶段是阅卷主链的末端，存在即推进，状态仅表达当前推进中/阅迫度。
 * - DRAFT / PACKAGING_FAILED / DESTRUCTION_FAILED → blocked（需人工推进）
 * - PACKAGING / ACTIVE / APPRAISAL_PENDING / DESTRUCTION_* 进行态 → active
 * - APPRAISAL_DECIDED / DESTROYED → completed（鉴定留存或销毁完成）
 * - 列表为空且有 examId → blocked（尚未创建归档）
 */
function syncArchiveStageToStore(): void {
  const examId = selectedExamId.value
  if (!examId) return
  if (archives.value.length === 0) {
    markStageStore.setStageStatus(examId, 'ARCHIVE', 'blocked', '尚未创建归档包')
    markStageStore.setCurrentStage(examId, 'ARCHIVE')
    return
  }
  const statuses = archives.value.map((a) => a.archiveStatus)
  const hasBlocked = statuses.some(
    (s) => s === 'DRAFT' || s === 'PACKAGING_FAILED' || s === 'DESTRUCTION_FAILED',
  )
  const hasActive = statuses.some(
    (s) =>
      s === 'PACKAGING' ||
      s === 'ACTIVE' ||
      s === 'APPRAISAL_PENDING' ||
      s === 'DESTRUCTION_PENDING' ||
      s === 'DESTRUCTION_APPROVED' ||
      s === 'DESTRUCTION_EXECUTING',
  )
  const hasCompleted = statuses.some((s) => s === 'APPRAISAL_DECIDED' || s === 'DESTROYED')
  let status: 'pending' | 'active' | 'completed' | 'blocked' = 'pending'
  let hint = ''
  if (hasBlocked) {
    status = 'blocked'
    const draftOrFailed = statuses.filter((s) => s === 'DRAFT' || s === 'PACKAGING_FAILED').length
    const destructionFailed = statuses.filter((s) => s === 'DESTRUCTION_FAILED').length
    hint =
      destructionFailed > 0
        ? `${destructionFailed} 个销毁失败需人工处理`
        : `${draftOrFailed} 个草稿 / 打包失败待人工处理`
  } else if (hasActive) {
    status = 'active'
    const packaging = statuses.filter((s) => s === 'PACKAGING').length
    const archived = statuses.filter(
      (s) =>
        s === 'ACTIVE' ||
        s === 'APPRAISAL_PENDING' ||
        s === 'DESTRUCTION_PENDING' ||
        s === 'DESTRUCTION_APPROVED' ||
        s === 'DESTRUCTION_EXECUTING',
    ).length
    hint =
      packaging > 0
        ? `${packaging} 个打包中 / ${archived} 个归档处理中`
        : `${archived} 个归档处理中`
  } else if (hasCompleted) {
    status = 'completed'
    hint = `已完成 ${
      statuses.filter((s) => s === 'APPRAISAL_DECIDED' || s === 'DESTROYED').length
    } / ${archives.value.length}`
  }
  markStageStore.setStageStatus(examId, 'ARCHIVE', status, hint)
  markStageStore.observeExam(examId)
}

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
    archives.value = page.list
    archivePagination.pageNum = page.pageNum
    archivePagination.pageSize = page.pageSize
    archivePagination.total = Number(page.total)
    syncArchiveStageToStore()
    if (selectedExamId.value) examContextStore.currentExamId = selectedExamId.value
  } catch (error) {
    archiveLoadError.value = toUserError(error, '归档列表加载失败')
    showUserError(error, '考试归档列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  archivePagination.pageNum = 1
  void loadArchives()
}

function handleReset(): void {
  onExamChange(undefined)
  filterForm.archiveStatus = undefined
  archivePagination.pageNum = 1
  void loadArchives()
}

function handleArchivePageChange(pageInfo: { current: number; pageSize: number }): void {
  archivePagination.pageNum = pageInfo.current
  archivePagination.pageSize = pageInfo.pageSize
  void loadArchives()
}

function openCreateModal(): void {
  if (!selectedExamId.value) {
    message.warning('请先选择考试')
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
    message.warning('请先选择考试')
    return
  }
  if (
    !createForm.includeOriginalScans &&
    !createForm.includeMarkedSlices &&
    !createForm.includeAnswerBooklet
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
    message.success('归档草稿已创建')
    createModalOpen.value = false
    await loadArchives()
  } catch (error) {
    showUserError(error, '考试归档草稿创建失败')
  } finally {
    creating.value = false
  }
}

function confirmPackage(record: ArchivePackageVO): void {
  void confirmAsync({
    title: '确认入队打包？',
    content: `归档包 ${record.archiveNo} 将进入异步打包队列，过程可能需要数分钟。`,
    type: 'info',
    okText: '入队打包',
    cancelText: '取消',
    onOk: async () => {
      try {
        await packageArchive(record.archiveId)
        message.success('归档已入队，正在异步打包')
        await loadArchives()
      } catch (error) {
        showUserError(error, '考试归档打包提交失败')
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
    throw new Error(`归档文件大小非法：${bytes}`)
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

onMounted(async () => {
  await init()
  await loadArchives()
})
</script>

<style lang="scss" scoped>
.archive-list-page {
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
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.archive-list-page__alert {
  margin-bottom: 4px;
}

.archive-list-page__filter-card,
.archive-list-page__table-card {
  width: 100%;
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
