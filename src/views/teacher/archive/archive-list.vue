<template>
  <GiPageLayout>
    <div class="archive-list-page">
      <PageHeader
        title="考后归档"
        subtitle="按考试维度创建归档包，异步分片打包与销毁审批全流程闭环"
      >
        <template #tags>
          <UiTag tone="blue" size="md">{{ archives.length }} 个归档</UiTag>
          <UiTag v-if="filterForm.examId" tone="purple" size="md">
            考试 #{{ filterForm.examId }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadArchives">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" :disabled="!canCreate" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            新建归档
          </UiButton>
        </template>
      </PageHeader>

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

        <UiEmpty v-if="!loading && archives.length === 0" description="尚未创建任何归档包" />

        <a-table
          v-else
          :columns="columns"
          :data-source="archives"
          :loading="loading"
          :pagination="false"
          row-key="archiveId"
          size="middle"
          class="archive-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archiveNo'">
              <button type="button" class="link-cell" @click="goDetail(record.archiveId)">
                {{ record.archiveNo }}
              </button>
              <div class="link-cell__sub">{{ record.archiveTitle }}</div>
            </template>
            <template v-else-if="column.key === 'examId'"> 考试 #{{ record.examId }} </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="ARCHIVE_STATUS_TONE[asArchive(record).archiveStatus] || 'gray'" size="sm">
                {{ record.archiveStatusMessage || ARCHIVE_STATUS_LABEL[asArchive(record).archiveStatus] }}
              </UiTag>
              <div
                v-if="record.archiveStatus === 'PACKAGING' && record.packagingPhase"
                class="phase-line"
              >
                {{ ARCHIVE_PHASE_LABEL[record.packagingPhase as ArchivePackagingPhase] }} ·
                {{ record.packagingProgressPercent ?? 0 }}%
              </div>
            </template>
            <template v-else-if="column.key === 'retention'">
              <span v-if="record.permanentRetention">永久保管</span>
              <span v-else>
                {{ record.retentionYears ?? '-' }} 年
                <span v-if="record.retentionUntil" class="muted">
                  · 至 {{ record.retentionUntil }}
                </span>
              </span>
            </template>
            <template v-else-if="column.key === 'fileSize'">
              <span v-if="record.archiveFileSize">
                {{ formatBytes(Number(record.archiveFileSize)) }}
              </span>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'itemCount'">
              <span v-if="record.itemCount">{{ record.itemCount }}</span>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatTime(record.createTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton size="sm" variant="ghost" @click="goDetail(record.archiveId)">
                  详情
                </UiButton>
                <UiButton
                  v-if="
                    record.archiveStatus === 'DRAFT' || record.archiveStatus === 'PACKAGING_FAILED'
                  "
                  size="sm"
                  @click="confirmPackage(asArchive(record))"
                >
                  打包入队
                </UiButton>
              </a-space>
            </template>
          </template>
        </a-table>
      </UiCard>
    </div>

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
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type {ArchivePackageStatusCode, ArchivePackageVO, ArchivePackagingPhase} from '@/apis/mark/archive';
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import Modal from 'ant-design-vue/es/modal'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ARCHIVE_PHASE_LABEL,
  ARCHIVE_STATUS_LABEL,
  ARCHIVE_STATUS_TONE,
  createArchive,
  listArchives,
  packageArchive,
} from '@/apis/mark/archive'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherArchiveList' })

const route = useRoute()
const router = useRouter()

const archives = ref<ArchivePackageVO[]>([])
const loading = ref(false)
const creating = ref(false)
const createModalOpen = ref(false)

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

const statusOptions = (Object.keys(ARCHIVE_STATUS_LABEL) as ArchivePackageStatusCode[]).map(
  (code) => ({ label: ARCHIVE_STATUS_LABEL[code], value: code }),
)

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

async function loadArchives(): Promise<void> {
  loading.value = true
  try {
    const list = await listArchives({
      examId: filterForm.examId || undefined,
      archiveStatus: filterForm.archiveStatus,
    })
    archives.value = list ?? []
  } catch (error) {
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
  Modal.confirm({
    title: '确认入队打包？',
    content: `归档包 ${record.archiveNo} 将进入异步打包队列，过程可能需要数分钟。`,
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

/** 模板类型桥接：将 a-table slot 的 Record<string, any> 显式转为真实 VO */
function asArchive(record: Record<string, any>): ArchivePackageVO {
  return record as ArchivePackageVO
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
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
