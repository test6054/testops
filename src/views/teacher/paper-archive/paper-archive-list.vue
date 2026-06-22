<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">{{ pagination.total }} 个纸质试卷档案集</UiTag>
        </template>
      </ContextBar>
    </template>

    <a-card :bordered="false" class="detail-table-card paper-archive-list-page__table-card">
      <template #title>
        <FileOutlined />
        <span>纸质试卷档案集</span>
      </template>
      <template #extra>
        <UiButton size="sm" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新建纸质试卷档案集
        </UiButton>
      </template>

      <UiFilterBar
        v-model="filterForm"
        :fields="paperArchiveFilterFields"
        search-text="查询"
        @search="handleSearch"
        @reset="handleReset"
      />



      <UiDataTable
        pagination-mode="none"
        class="student-detail-table__data-table"
        :columns="columns"
        :data-source="sets"
        :loading="loading"
        :show-pagination="false"
        flat
        :total="sets.length"
        row-key="archiveSetId"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'archiveNo'">
            <button type="button" class="link-cell" @click="goDetail(record.archiveSetId)">
              {{ record.archiveNo }}
            </button>
            <div class="link-cell__sub">{{ record.archiveTitle }}</div>
          </template>
          <template v-else-if="column.key === 'examScope'">
            <span v-if="record.examYear">{{ record.examYear }}</span>
            <span v-if="record.examTerm" class="muted"> · {{ record.examTerm }}</span>
            <div v-if="record.examRound" class="muted">
              {{ record.examRound }}
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="setStatusTone(record.archiveStatus)" size="sm">
              {{ record.archiveStatusMessage }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'tags'">
            <UiTag
              v-for="tag in record.tags ?? []"
              :key="tag"
              tone="purple"
              size="sm"
              class="tag-chip"
            >
              {{ tag }}
            </UiTag>
            <span v-if="!record.tags?.length" class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'retention'">
            <span v-if="record.permanentRetention">永久保管</span>
            <span v-else>
              {{ record.retentionYears }} 年
              <span v-if="record.retentionUntil" class="muted">
                · 至 {{ record.retentionUntil }}
              </span>
            </span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="goDetail(record.archiveSetId)">
                详情
              </UiTextAction>
              <UiTextAction
                v-if="record.archiveStatus === 'DRAFT'"
                tone="primary"
                @click="confirmActivate(record)"
              >
                激活
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>

      <div class="paper-archive-list-page__pagination">
        <a-pagination
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="true"
          :show-total="(total: number) => `共 ${total} 条`"
          @change="loadSets"
          @show-size-change="loadSets"
        />
      </div>
    </a-card>
  </StageWorkbenchShell>

  <a-modal
    v-model:open="createModalOpen"
    title="新建纸质试卷档案集"
    :confirm-loading="creating"
    :ok-button-props="{ disabled: !createForm.archiveTitle.trim() }"
    ok-text="创建"
    cancel-text="取消"
    @ok="submitCreate"
  >
    <a-form layout="vertical" :model="createForm" class="paper-archive-create-form">
      <a-form-item label="纸质试卷档案集标题" required>
        <a-input
          v-model:value="createForm.archiveTitle"
          placeholder="如 2018-2019 高等数学(A)期末"
          :maxlength="255"
        />
      </a-form-item>
      <a-form-item label="业务编号（可选）">
        <a-input
          v-model:value="createForm.archiveNo"
          placeholder="不填则由系统按规则生成"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item label="学年 / 学期 / 考期">
        <a-space>
          <a-input
            v-model:value="createForm.examYear"
            placeholder="如 2018-2019"
            style="width: 160px"
          />
          <a-input
            v-model:value="createForm.examTerm"
            placeholder="如 春季学期"
            style="width: 140px"
          />
          <a-input
            v-model:value="createForm.examRound"
            placeholder="如 期末/补考"
            style="width: 160px"
          />
        </a-space>
      </a-form-item>
      <a-form-item label="保管年限">
        <a-space>
          <a-input-number
            v-model:value="createForm.retentionYears"
            :min="1"
            :max="100"
            :disabled="createForm.permanentRetention"
            style="width: 140px"
          />
          <a-checkbox v-model:checked="createForm.permanentRetention">永久保管</a-checkbox>
        </a-space>
      </a-form-item>
      <a-form-item label="纸质试卷档案集标签">
        <a-select
          v-model:value="createForm.tags"
          mode="tags"
          placeholder="按回车添加标签，最多 32 个"
          :max-tag-count="8"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PaperArchiveSetStatusCode, PaperArchiveSetVO } from '@/apis/mark/paper-archive'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import { FileOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  activatePaperArchiveSet,
  createPaperArchiveSet,
  pagePaperArchiveSets,
  PAPER_ARCHIVE_SET_STATUS_OPTIONS,
  PAPER_ARCHIVE_SET_STATUS_TONE,
} from '@/apis/mark/paper-archive'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherPaperArchiveList' })

const examContextStore = useMarkExamContextStore()

const router = useRouter()

const sets = ref<PaperArchiveSetVO[]>([])
const loading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const creating = ref(false)
const createModalOpen = ref(false)

const pagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})

const filterForm = reactive<{
  archiveNoKeyword?: string
  titleKeyword?: string
  examYear?: string
  examTerm?: string
  archiveStatus?: PaperArchiveSetStatusCode
}>({
  archiveNoKeyword: undefined,
  titleKeyword: undefined,
  examYear: undefined,
  examTerm: undefined,
  archiveStatus: undefined,
})

interface PaperArchiveSetCreateForm {
  archiveNo: string
  archiveTitle: string
  examYear: string
  examTerm: string
  examRound: string
  retentionYears: number | undefined
  permanentRetention: boolean
  tags: string[]
}

const createForm = reactive<PaperArchiveSetCreateForm>({
  archiveNo: '',
  archiveTitle: '',
  examYear: '',
  examTerm: '',
  examRound: '',
  retentionYears: undefined,
  permanentRetention: false,
  tags: [],
})
const paperArchiveFilterFields: FilterField[] = [
  {
    key: 'archiveNoKeyword',
    type: 'input',
    placeholder: '按编号关键词过滤',
    allowClear: true,
    width: 200,
    triggerSearchOnChange: false,
  },
  {
    key: 'titleKeyword',
    type: 'input',
    placeholder: '按标题关键词过滤',
    allowClear: true,
    width: 200,
    triggerSearchOnChange: false,
  },
  {
    key: 'examYear',
    type: 'input',
    placeholder: '如 2018-2019',
    allowClear: true,
    width: 140,
    triggerSearchOnChange: false,
  },
  {
    key: 'examTerm',
    type: 'input',
    placeholder: '如 秋季学期',
    allowClear: true,
    width: 140,
    triggerSearchOnChange: false,
  },
  {
    key: 'archiveStatus',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: PAPER_ARCHIVE_SET_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
  },
]

const columns: ColumnsType<PaperArchiveSetVO> = [
  { title: '纸质试卷档案编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 240 },
  { title: '考期', key: 'examScope', width: 180 },
  { title: '试卷份数', key: 'paperCount', dataIndex: 'paperCount', width: 100 },
  { title: '状态', key: 'status', dataIndex: 'archiveStatus', width: 140 },
  { title: '纸质试卷档案集标签', key: 'tags', dataIndex: 'tags', width: 200 },
  { title: '保管期限', key: 'retention', dataIndex: 'retentionYears', width: 200 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 180, align: 'right' },
]

async function loadSets(): Promise<void> {
  loading.value = true
  try {
    const result = await pagePaperArchiveSets({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      archiveNoKeyword: filterForm.archiveNoKeyword?.trim() || undefined,
      titleKeyword: filterForm.titleKeyword?.trim() || undefined,
      examYear: filterForm.examYear?.trim() || undefined,
      examTerm: filterForm.examTerm?.trim() || undefined,
      archiveStatus: filterForm.archiveStatus,
    })
    sets.value = readPageList(result, '纸质试卷档案集加载失败，请稍后重试')
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
    pagination.total = readPageTotal(result, '纸质试卷档案集加载失败，请稍后重试')
  } catch (error) {
    sets.value = []
    pagination.total = 0
    showUserError(error, '纸质试卷档案集列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.pageNum = 1
  void loadSets()
}

function handleReset(): void {
  pagination.pageNum = 1
  void loadSets()
}

function openCreateModal(): void {
  createForm.archiveNo = ''
  createForm.archiveTitle = ''
  createForm.examYear = ''
  createForm.examTerm = ''
  createForm.examRound = ''
  createForm.retentionYears = undefined
  createForm.permanentRetention = false
  createForm.tags = []
  createModalOpen.value = true
}

async function submitCreate(): Promise<void> {
  const title = createForm.archiveTitle.trim()
  if (!title) {
    message.warning('纸质试卷档案集标题不能为空')
    return
  }
  if (!createForm.permanentRetention
    && (createForm.retentionYears == null || createForm.retentionYears < 1 || createForm.retentionYears > 100)
  ) {
    message.warning('非永久纸质试卷档案集必须填写 1-100 年保管年限')
    return
  }
  creating.value = true
  try {
    await createPaperArchiveSet({
      archiveNo: createForm.archiveNo.trim() || undefined,
      archiveTitle: title,
      examYear: createForm.examYear.trim() || undefined,
      examTerm: createForm.examTerm.trim() || undefined,
      examRound: createForm.examRound.trim() || undefined,
      retentionYears: createForm.permanentRetention ? undefined : createForm.retentionYears!,
      permanentRetention: createForm.permanentRetention,
      tags: createForm.tags.length > 0 ? createForm.tags : undefined,
    })
    message.success('纸质试卷档案集已创建')
    createModalOpen.value = false
    pagination.pageNum = 1
    await loadSets()
  } catch (error) {
    showUserError(error, '纸质试卷档案集创建失败')
  } finally {
    creating.value = false
  }
}

function confirmActivate(record: PaperArchiveSetVO): void {
  void confirmAsync({
    title: '激活纸质试卷档案集？',
    content: `纸质试卷档案集 ${record.archiveNo} 将从草稿推进到保管中，激活后即可正式接收新试卷上传。`,
    type: 'info',
    okText: '激活',
    cancelText: '取消',
    onOk: async () => {
      try {
        await activatePaperArchiveSet(record.archiveSetId)
        message.success('纸质试卷档案集已激活')
        await loadSets()
      } catch (error) {
        showUserError(error, '纸质试卷档案集激活失败')
      }
    },
  })
}

function goDetail(archiveSetId: string): void {
  void router.push({
    name: 'TeacherPaperArchiveDetail',
    params: { archiveSetId },
  })
}

function setStatusTone(status: PaperArchiveSetStatusCode): BadgeTone {
  return strictEnumTone(PAPER_ARCHIVE_SET_STATUS_TONE, status, '纸质试卷档案集状态')
}

onMounted(() => {
  void loadSets()
})

onActivated(() => {
  void loadSets()
})
</script>

<style lang="scss" scoped>
.paper-archive-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paper-archive-list-page__alert {
  margin-bottom: 0;
}

.paper-archive-list-page__table-card {
  width: 100%;
}

.paper-archive-list-page__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
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

.tag-chip {
  margin-right: 4px;
  margin-bottom: 2px;
}

.paper-archive-create-form {
  padding: 8px 0;
}
</style>
