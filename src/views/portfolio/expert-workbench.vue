<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExpertAssignmentVO } from '@/apis/portfolio/expert-assignment'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioExpertAssignmentApi } from '@/apis/portfolio/expert-assignment'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  PortfolioExpertAssignmentStatusCode,
  PortfolioExpertAssignmentStatusDescription,
} from '@/types/enums/portfolio-expert-assignment-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

/**
 * 外部专家工作台：仅列出本人有效授权，进入脱敏审阅与评价填报（US-E-01 / J8）。
 */
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const requestToken = ref(0)
const rows = ref<PortfolioExpertAssignmentVO[]>([])
const total = ref(0)
const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const columns: ColumnsType = [
  { title: '评价任务', dataIndex: 'evaluationTaskName', key: 'evaluationTaskName', ellipsis: true },
  { title: '任务 ID', dataIndex: 'evaluationTaskId', key: 'evaluationTaskId', width: 140 },
  { title: '状态', key: 'assignmentStatus', width: 100 },
  { title: '过期时间', dataIndex: 'expireTime', key: 'expireTime', width: 180 },
  { title: '脱敏', key: 'maskRequired', width: 90 },
  { title: '操作', key: 'actions', width: 220 },
]

function statusLabel(code?: string): string {
  return strictEnumLabel(PortfolioExpertAssignmentStatusDescription, code as PortfolioExpertAssignmentStatusCode)
}

function statusTone(code?: string): 'green' | 'gray' | 'orange' {
  if (code === PortfolioExpertAssignmentStatusCode.ACTIVE) return 'green'
  if (code === PortfolioExpertAssignmentStatusCode.EXPIRED) return 'orange'
  return 'gray'
}

async function loadAssignments() {
  const expertUserId = userStore.userInfo.userId
  if (!expertUserId) {
    rows.value = []
    total.value = 0
    failLoad()
    showUserError(new Error('当前会话缺少用户身份，无法加载专家授权'), '加载失败')
    return
  }
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  beginLoad()
  loading.value = true
  try {
    const result = await portfolioExpertAssignmentApi.page({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      expertUserId: String(expertUserId),
      assignmentStatus: PortfolioExpertAssignmentStatusCode.ACTIVE,
    })
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) return
    rows.value = []
    total.value = 0
    failLoad()
    showUserError(error, '加载专家授权失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function onPageChange(page: { current: number, pageSize: number }) {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  void loadAssignments()
}

function goReview(row: PortfolioExpertAssignmentVO) {
  void router.push({
    path: '/portfolio/expert/review',
    query: { assignmentId: row.id },
  })
}

function goFill(row: PortfolioExpertAssignmentVO) {
  void router.push({
    path: '/portfolio/expert/evaluation-fill',
    query: { evaluationTaskId: row.evaluationTaskId },
  })
}

onMounted(() => {
  void loadAssignments()
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar
      title="专家评审工作台"
      subtitle="仅展示本人有效授权范围内的评审任务；不可访问无关档案与敏感字段"
    />
    <UiCard :loading="loading">
      <UiDataTable
        :load-error="loadError"
        :columns="columns"
        :data-source="rows"
        :total="total"
        :current="pagination.current"
        :page-size="pagination.pageSize"
        row-key="id"
        flat
        empty-kind="first-run"
        empty-description="暂无有效外部专家授权。请等待学校管理员分派评审任务，或使用免登审阅链接。"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'assignmentStatus'">
            <UiTag :tone="statusTone(record.assignmentStatus)">
              {{ statusLabel(record.assignmentStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'maskRequired'">
            <UiTag :tone="record.maskRequired ? 'green' : 'gray'">
              {{ record.maskRequired ? '已脱敏' : '未脱敏' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton size="sm" variant="soft" @click="goReview(record)">脱敏审阅</UiButton>
            <UiButton size="sm" variant="primary" class="expert-workbench__fill" @click="goFill(record)">
              评价填报
            </UiButton>
          </template>
        </template>
        <template #emptyText>
          <UiEmpty size="sm" title="暂无有效授权" description="当前账号没有 ACTIVE 且未过期的外部专家授权。" />
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.expert-workbench__fill {
  margin-left: 8px;
}
</style>
