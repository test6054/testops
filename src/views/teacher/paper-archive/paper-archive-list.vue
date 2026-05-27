<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="paper-archive-list-page__context">
        <div class="paper-archive-list-page__context-left">
          <UiTag tone="blue" size="sm">{{ pagination.total }} 个档案集</UiTag>
        </div>
        <div class="paper-archive-list-page__context-right">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadSets">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            新建档案集
          </UiButton>
        </div>
      </div>
    </template>

    <UiCard class="paper-archive-list-page__filter-card">
      <template #title>
        <SearchOutlined />
        <span>筛选条件</span>
      </template>

      <a-form layout="inline" :model="filterForm" @submit.prevent="handleSearch">
        <a-form-item label="档案编号">
          <a-input
            v-model:value="filterForm.archiveNoKeyword"
            placeholder="按编号关键词过滤"
            allow-clear
            style="width: 200px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="标题">
          <a-input
            v-model:value="filterForm.titleKeyword"
            placeholder="按标题关键词过滤"
            allow-clear
            style="width: 200px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="学年">
          <a-input
            v-model:value="filterForm.examYear"
            placeholder="如 2018-2019"
            allow-clear
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="学期">
          <a-input
            v-model:value="filterForm.examTerm"
            placeholder="如 第一学期"
            allow-clear
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="filterForm.archiveStatus"
            placeholder="全部状态"
            allow-clear
            style="width: 160px"
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

    <UiCard class="paper-archive-list-page__table-card">
      <template #title>
        <FileOutlined />
        <span>档案集列表</span>
        <UiBadge tone="blue">{{ pagination.total }} 条</UiBadge>
      </template>

      <UiEmpty v-if="!loading && sets.length === 0" description="尚未创建任何纸质试卷档案集" />

      <UiDataTable
        v-else
        :columns="columns"
        :data-source="sets"
        :loading="loading"
        :show-pagination="false"
        flat
        :total="sets.length"
        row-key="archiveSetId"
        size="middle"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'archiveNo'">
            <button type="button" class="link-cell" @click="goDetail(sets[index].archiveSetId)">
              {{ sets[index].archiveNo }}
            </button>
            <div class="link-cell__sub">{{ sets[index].archiveTitle }}</div>
          </template>
          <template v-else-if="column.key === 'examScope'">
            <span v-if="sets[index].examYear">{{ sets[index].examYear }}</span>
            <span v-if="sets[index].examTerm" class="muted"> · {{ sets[index].examTerm }}</span>
            <div v-if="sets[index].examRound" class="muted">
              {{ sets[index].examRound }}
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="setStatusTone(sets[index].archiveStatus)" size="sm">
              {{ sets[index].archiveStatusMessage }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'tags'">
            <UiTag
              v-for="tag in sets[index].tags ?? []"
              :key="tag"
              tone="purple"
              size="sm"
              class="tag-chip"
            >
              {{ tag }}
            </UiTag>
            <span v-if="!sets[index].tags?.length" class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'retention'">
            <span v-if="sets[index].permanentRetention">永久保管</span>
            <span v-else>
              {{ sets[index].retentionYears ?? '-' }} 年
              <span v-if="sets[index].retentionUntil" class="muted">
                · 至 {{ sets[index].retentionUntil }}
              </span>
            </span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(sets[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton
                v-if="sets[index].archiveStatus === 'DRAFT'"
                size="sm"
                variant="outline"
                @click="confirmActivate(sets[index])"
              >
                激活
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="goDetail(sets[index].archiveSetId)">
                详情
              </UiButton>
            </a-space>
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
    </UiCard>
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
      <a-form-item label="档案标题" required>
        <a-input
          v-model:value="createForm.archiveTitle"
          placeholder="如 2018-2019 高等数学(A)期末"
          :maxlength="255"
        />
      </a-form-item>
      <a-form-item label="业务编号（可选）">
        <a-input
          v-model:value="createForm.archiveNo"
          placeholder="不填由后端按规则生成"
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
            placeholder="如 第二学期"
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
      <a-form-item label="档案 tag">
        <a-select
          v-model:value="createForm.tags"
          mode="tags"
          placeholder="按回车添加 tag，最多 32 个"
          :max-tag-count="8"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { PaperArchiveSetStatusCode, PaperArchiveSetVO } from '@/apis/mark/paper-archive'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { FileOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  activatePaperArchiveSet,
  createPaperArchiveSet,
  pagePaperArchiveSets,
  PAPER_ARCHIVE_SET_STATUS_LABEL,
  PAPER_ARCHIVE_SET_STATUS_TONE,
} from '@/apis/mark/paper-archive'
import { UiBadge, UiButton, UiCard, UiDataTable, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { formatDateTime } from '@/utils/format'
import { strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherPaperArchiveList' })

const markStageStore = useMarkStageStore()
const examContextStore = useMarkExamContextStore()

const router = useRouter()

const sets = ref<PaperArchiveSetVO[]>([])
const loading = ref(false)
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

const createForm = reactive({
  archiveNo: '',
  archiveTitle: '',
  examYear: '',
  examTerm: '',
  examRound: '',
  retentionYears: 10,
  permanentRetention: false,
  tags: [] as string[],
})

const statusOptions = Object.entries(PAPER_ARCHIVE_SET_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const columns = [
  { title: '档案编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 240 },
  { title: '考期', key: 'examScope', width: 180 },
  { title: '试卷份数', key: 'paperCount', dataIndex: 'paperCount', width: 100 },
  { title: '状态', key: 'status', dataIndex: 'archiveStatus', width: 140 },
  { title: 'tag', key: 'tags', dataIndex: 'tags', width: 200 },
  { title: '保管期限', key: 'retention', dataIndex: 'retentionYears', width: 200 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 180, align: 'right' as const },
]

/**
 * 当用户当前已经选定考试上下文（来自 archive-list / score-publish 等页面跳转）时，
 * 将本页档案集列表的状态汇总写入该考试的 ARCHIVE 阶段。
 *
 * 注意：PaperArchiveSet 不持有 examId，只能基于 examContextStore.currentExamId 反映"用户视角"。
 * 无上下文时不写入，避免污染 markStageStore。
 *
 * 状态汇总规则：
 * - 任一 DESTROYED → completed（生命周期完结）
 * - 任一 ACTIVE / APPRAISAL_DECIDED / APPRAISAL_PENDING → active（保管 / 鉴定流程中）
 * - 任一 DRAFT → blocked（待激活）
 * - 列表为空 → 不写入（无可参考数据）
 */
function syncPaperArchiveStageToStore(): void {
  const examId = examContextStore.currentExamId
  if (!examId) return
  if (sets.value.length === 0) return
  const statuses = sets.value.map((s) => s.archiveStatus)
  const hasDestroyed = statuses.some(
    (s) => s === 'DESTROYED' || s === 'DESTRUCTION_APPROVED' || s === 'DESTRUCTION_PENDING',
  )
  const hasActive = statuses.some(
    (s) => s === 'ACTIVE' || s === 'APPRAISAL_PENDING' || s === 'APPRAISAL_DECIDED',
  )
  const hasDraft = statuses.includes('DRAFT')
  let status: 'pending' | 'active' | 'completed' | 'blocked' = 'pending'
  let hint = ''
  if (hasDestroyed) {
    status = 'completed'
    hint = `共 ${sets.value.length} 个档案集 · 含已销毁`
  } else if (hasActive) {
    status = 'active'
    const active = statuses.filter(
      (s) => s === 'ACTIVE' || s === 'APPRAISAL_PENDING' || s === 'APPRAISAL_DECIDED',
    ).length
    hint = `${active} 个档案集保管 / 鉴定中`
  } else if (hasDraft) {
    status = 'blocked'
    hint = `${statuses.filter((s) => s === 'DRAFT').length} 个档案集草稿待激活`
  }
  if (hint) {
    markStageStore.setStageStatus(examId, 'ARCHIVE', status, hint)
  }
}

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
    sets.value = result.list
    pagination.total = Number(result.total)
    syncPaperArchiveStageToStore()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '档案集列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.pageNum = 1
  void loadSets()
}

function handleReset(): void {
  filterForm.archiveNoKeyword = undefined
  filterForm.titleKeyword = undefined
  filterForm.examYear = undefined
  filterForm.examTerm = undefined
  filterForm.archiveStatus = undefined
  pagination.pageNum = 1
  void loadSets()
}

function openCreateModal(): void {
  createForm.archiveNo = ''
  createForm.archiveTitle = ''
  createForm.examYear = ''
  createForm.examTerm = ''
  createForm.examRound = ''
  createForm.retentionYears = 10
  createForm.permanentRetention = false
  createForm.tags = []
  createModalOpen.value = true
}

async function submitCreate(): Promise<void> {
  const title = createForm.archiveTitle.trim()
  if (!title) {
    message.warning('档案标题不能为空')
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
      retentionYears: createForm.permanentRetention ? undefined : createForm.retentionYears,
      permanentRetention: createForm.permanentRetention,
      tags: createForm.tags.length > 0 ? createForm.tags : undefined,
    })
    message.success('档案集已创建')
    createModalOpen.value = false
    pagination.pageNum = 1
    await loadSets()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建档案集失败')
  } finally {
    creating.value = false
  }
}

function confirmActivate(record: PaperArchiveSetVO): void {
  void confirmAsync({
    title: '激活档案集？',
    content: `档案集 ${record.archiveNo} 将从草稿推进到保管中，激活后即可正式接收新试卷上传。`,
    type: 'info',
    okText: '激活',
    cancelText: '取消',
    onOk: async () => {
      try {
        await activatePaperArchiveSet(record.archiveSetId)
        message.success('档案集已激活')
        await loadSets()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '激活档案集失败')
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


function setStatusTone(status?: PaperArchiveSetStatusCode): BadgeTone {
  if (!status) return 'gray'
  return strictEnumTone(PAPER_ARCHIVE_SET_STATUS_TONE, status, '试卷档案集状态')
}

onMounted(() => {
  void loadSets()
})
</script>

<style lang="scss" scoped>
.paper-archive-list-page {
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

.paper-archive-list-page__filter-card,
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
