<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="archive-list-page__context">
        <div class="archive-list-page__context-left">
          <UiTag tone="blue" size="sm">{{ archives.length }} 个归档</UiTag>
          <UiTag v-if="filterForm.examId" tone="purple" size="sm">
            考试 #{{ filterForm.examId }}
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
        <a-form-item label="考试ID">
          <a-input
            v-model:value="filterForm.examId"
            placeholder="按考试ID过滤"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
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
        <UiBadge tone="blue">{{ archives.length }} 条</UiBadge>
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
        :show-pagination="false"
        flat
        :total="archives.length"
        row-key="archiveId"
        size="middle"
        class="archive-table"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'archiveNo'">
            <button type="button" class="link-cell" @click="goDetail(archives[index].archiveId)">
              {{ archives[index].archiveNo }}
            </button>
            <div class="link-cell__sub">{{ archives[index].archiveTitle }}</div>
          </template>
          <template v-else-if="column.key === 'examId'">
            考试 #{{ archives[index].examId }}
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="archiveStatusTone(archives[index].archiveStatus)" size="sm">
              {{
                archives[index].archiveStatusMessage ||
                archiveStatusLabel(archives[index].archiveStatus)
              }}
            </UiTag>
            <div
              v-if="archives[index].archiveStatus === 'PACKAGING' && archives[index].packagingPhase"
              class="phase-line"
            >
              {{ archivePhaseLabel(archives[index].packagingPhase) }} ·
              {{ archives[index].packagingProgressPercent ?? 0 }}%
            </div>
          </template>
          <template v-else-if="column.key === 'retention'">
            <span v-if="archives[index].permanentRetention">永久保管</span>
            <span v-else>
              {{ archives[index].retentionYears ?? '-' }} 年
              <span v-if="archives[index].retentionUntil" class="muted">
                · 至 {{ archives[index].retentionUntil }}
              </span>
            </span>
          </template>
          <template v-else-if="column.key === 'fileSize'">
            <span v-if="archives[index].archiveFileSize">
              {{ formatBytes(Number(archives[index].archiveFileSize)) }}
            </span>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            <span v-if="archives[index].itemCount">{{ archives[index].itemCount }}</span>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatTime(archives[index].createTime) }}
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
    :ok-button-props="{ disabled: !filterForm.examId }"
    ok-text="创建草稿"
    cancel-text="取消"
    @ok="submitCreate"
  >
    <a-form layout="vertical" :model="createForm" class="archive-create-form">
      <a-alert
        v-if="!filterForm.examId"
        type="warning"
        show-icon
        message="请先在筛选区填入考试ID再新建归档"
      />
      <a-form-item label="考试ID">
        <a-input :value="filterForm.examId" disabled placeholder="从筛选区考试ID带入" />
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
            原始扫描件（按学生分目录）
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
import type {
  ArchivePackageStatusCode,
  ArchivePackageVO,
  ArchivePackagingPhase,
} from '@/apis/mark/archive'
import {
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
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useMarkStageStore } from '@/stores/modules/markStage'

defineOptions({ name: 'TeacherArchiveList' })

const route = useRoute()
const router = useRouter()
const markStageStore = useMarkStageStore()
const examContextStore = useMarkExamContextStore()

const archives = ref<ArchivePackageVO[]>([])
const loading = ref(false)
const creating = ref(false)
const createModalOpen = ref(false)
const archiveLoadError = ref<unknown>(null)

const filterForm = reactive<{
  examId?: string
  archiveStatus?: ArchivePackageStatusCode
}>({
  examId: typeof route.query.examId === 'string' ? route.query.examId : undefined,
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

// 从后端枚举 LABEL 对象直接派生 select options。
const statusOptions = Object.entries(ARCHIVE_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns = [
  { title: '归档编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 220 },
  { title: '所属考试', key: 'examId', dataIndex: 'examId', width: 110 },
  { title: '状态', key: 'status', dataIndex: 'archiveStatus', width: 200 },
  { title: '保管期限', key: 'retention', dataIndex: 'retentionYears', width: 200 },
  { title: 'ZIP 大小', key: 'fileSize', dataIndex: 'archiveFileSize', width: 110 },
  { title: '清单数', key: 'itemCount', dataIndex: 'itemCount', width: 90 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 200, align: 'right' as const },
]

const canCreate = computed(() => Boolean(filterForm.examId))

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
  const examId = filterForm.examId
  if (!examId) return null
  if (loading.value) return null
  if (archiveLoadError.value) return null
  // 1) 已选考试但归档列表为空：可能是「成绩已发布但归档未启动」
  if (archives.value.length === 0) {
    return {
      tone: 'error',
      title: '该考试尚未创建归档包',
      description:
        '按档案合规要求，成绩发布后应及时归档原始扫描件、批改流水与评分细则。点击立即创建归档草稿，再触发打包。',
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
 * - 创建后未打包 (DRAFT) 或打包失败 (PACKAGING_FAILED)  → blocked（需人工推进）
 * - 打包中 (PACKAGING)                                          → active（在进行）
 * - 保管中 (ACTIVE) / 鉴定待办 (APPRAISAL_PENDING)             → active（入库但未鉴定）
 * - 鉴定完成 (APPRAISAL_DECIDED) 及之后状态                  → completed（生命周期完整）
 * - 列表为空且有 examId                                       → blocked（尚未创建归档）
 */
function syncArchiveStageToStore(): void {
  const examId = filterForm.examId
  if (!examId) return
  if (archives.value.length === 0) {
    markStageStore.setStageStatus(examId, 'ARCHIVE', 'blocked', '尚未创建归档包')
    markStageStore.setCurrentStage(examId, 'ARCHIVE')
    return
  }
  const statuses = archives.value.map((a) => a.archiveStatus)
  const hasCompleted = statuses.some(
    (s) =>
      s === 'APPRAISAL_DECIDED' ||
      s === 'DESTRUCTION_PENDING' ||
      s === 'DESTRUCTION_APPROVED' ||
      s === 'DESTRUCTION_REJECTED' ||
      s === 'DESTROYED',
  )
  const hasActive = statuses.some(
    (s) => s === 'PACKAGING' || s === 'ACTIVE' || s === 'APPRAISAL_PENDING',
  )
  const hasBlocked = statuses.some((s) => s === 'DRAFT' || s === 'PACKAGING_FAILED')
  let status: 'pending' | 'active' | 'completed' | 'blocked' = 'pending'
  let hint = ''
  if (hasCompleted) {
    status = 'completed'
    hint = `已鉴定存档 ${
      statuses.filter(
        (s) =>
          s === 'APPRAISAL_DECIDED' ||
          s === 'DESTRUCTION_PENDING' ||
          s === 'DESTRUCTION_APPROVED' ||
          s === 'DESTRUCTION_REJECTED' ||
          s === 'DESTROYED',
      ).length
    } / ${archives.value.length}`
  } else if (hasActive) {
    status = 'active'
    const packaging = statuses.filter((s) => s === 'PACKAGING').length
    const archived = statuses.filter((s) => s === 'ACTIVE' || s === 'APPRAISAL_PENDING').length
    hint = packaging > 0 ? `${packaging} 个打包中 / ${archived} 个保管中` : `${archived} 个保管中`
  } else if (hasBlocked) {
    status = 'blocked'
    hint = `${statuses.filter((s) => s === 'DRAFT' || s === 'PACKAGING_FAILED').length} 个草稿 / 打包失败待人工处理`
  }
  markStageStore.setStageStatus(examId, 'ARCHIVE', status, hint)
  markStageStore.observeExam(examId)
}

async function loadArchives(): Promise<void> {
  loading.value = true
  archiveLoadError.value = null
  try {
    const list = await listArchives({
      examId: filterForm.examId || undefined,
      archiveStatus: filterForm.archiveStatus,
    })
    if (!Array.isArray(list)) {
      throw new Error('归档列表接口返回格式错误')
    }
    archives.value = list
    syncArchiveStageToStore()
    if (filterForm.examId) examContextStore.currentExamId = filterForm.examId
  } catch (error) {
    archiveLoadError.value = error
    message.error(error instanceof Error ? error.message : '归档列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  void loadArchives()
}

function handleReset(): void {
  filterForm.examId = undefined
  filterForm.archiveStatus = undefined
  void loadArchives()
}

function openCreateModal(): void {
  if (!filterForm.examId) {
    message.warning('请先在筛选区填入考试ID')
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
  if (!filterForm.examId) {
    message.warning('请先在筛选区填入考试ID')
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
      examId: filterForm.examId,
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
    message.error(error instanceof Error ? error.message : '创建归档草稿失败')
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
        message.error(error instanceof Error ? error.message : '触发打包失败')
      }
    },
  })
}

function goDetail(archiveId: string): void {
  void router.push({ name: 'TeacherArchiveDetail', params: { archiveId } })
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

// 严格 typed helper：模板侧的 archives[index] 字段都是后端 VO 字面联合，避免 slot record:any。
function archiveStatusTone(status?: ArchivePackageStatusCode): BadgeTone {
  if (!status) return 'gray'
  return ARCHIVE_STATUS_TONE[status] ?? 'gray'
}

function archiveStatusLabel(status?: ArchivePackageStatusCode): string {
  if (!status) return '-'
  return ARCHIVE_STATUS_LABEL[status] ?? status
}

function archivePhaseLabel(phase?: ArchivePackagingPhase): string {
  if (!phase) return ''
  return ARCHIVE_PHASE_LABEL[phase] ?? phase
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i += 1
  }
  return `${size.toFixed(size >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

watch(
  () => route.query.examId,
  (next) => {
    if (typeof next === 'string') {
      filterForm.examId = next
    }
  },
)

onMounted(() => {
  void loadArchives()
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
