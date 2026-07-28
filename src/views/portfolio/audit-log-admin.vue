<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioAuditLogVO } from '@/apis/portfolio/governance'
import type { PortfolioAuditActionTypeCode } from '@/types/enums/portfolio-audit-action-type-enum'
import type {
  PortfolioAuditOutcomeCode} from '@/types/enums/portfolio-audit-outcome-enum';
import type { PortfolioAuditResourceTypeCode } from '@/types/enums/portfolio-audit-resource-type-enum'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_AUDIT_ACTION_TYPE_CODES,
  PortfolioAuditActionTypeDescription,
} from '@/types/enums/portfolio-audit-action-type-enum'
import {
  PortfolioAuditOutcomeDescription,
} from '@/types/enums/portfolio-audit-outcome-enum'
import {
  ALL_PORTFOLIO_AUDIT_RESOURCE_TYPE_CODES,
  PortfolioAuditResourceTypeDescription,
} from '@/types/enums/portfolio-audit-resource-type-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const loadError = ref(false)
const requestToken = ref(0)
const rows = ref<PortfolioAuditLogVO[]>([])
const total = ref(0)
const detailOpen = ref(false)
const detailRow = ref<PortfolioAuditLogVO | null>(null)

const filterForm = reactive({
  actionType: undefined as PortfolioAuditActionTypeCode | undefined,
  resourceType: undefined as PortfolioAuditResourceTypeCode | undefined,
  resourceId: '',
  operatorUserId: '',
})

const filterModel = computed({
  get: () => filterForm,
  set: (v) => {
    Object.assign(filterForm, v)
  },
})

const filterFields = computed(() => [
  {
    key: 'actionType',
    type: 'select' as const,
    label: '动作类型',
    allowClear: true,
    width: 180,
    options: ALL_PORTFOLIO_AUDIT_ACTION_TYPE_CODES.map((c) => ({
      value: c,
      label: PortfolioAuditActionTypeDescription[c],
    })),
  },
  {
    key: 'resourceType',
    type: 'select' as const,
    label: '资源类型',
    allowClear: true,
    width: 180,
    options: ALL_PORTFOLIO_AUDIT_RESOURCE_TYPE_CODES.map((c) => ({
      value: c,
      label: PortfolioAuditResourceTypeDescription[c],
    })),
  },
  { key: 'resourceId', type: 'input' as const, label: '资源编号', width: 140 },
  { key: 'operatorUserId', type: 'input' as const, label: '操作人编号', width: 140 },
])

const query = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })

const columns: ColumnsType = [
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId', width: 100 },
  { title: '动作', key: 'actionType', width: 150 },
  { title: '资源类型', key: 'resourceType', width: 140 },
  { title: '资源编号', dataIndex: 'resourceId', key: 'resourceId', width: 120 },
  { title: '摘要', dataIndex: 'actionSummary', key: 'actionSummary', ellipsis: true },
  { title: '详情', key: 'actions', width: 88 },
]

function actionLabel(code: string) {
  return strictEnumLabel(
    PortfolioAuditActionTypeDescription,
    code as PortfolioAuditActionTypeCode,
    '审计动作',
  )
}

function resourceLabel(code: string) {
  return strictEnumLabel(
    PortfolioAuditResourceTypeDescription,
    code as PortfolioAuditResourceTypeCode,
    '审计资源',
  )
}

const DETAIL_FIELD_LABELS: Record<string, string> = {
  outcome: '结果',
  clientIp: '客户端 IP',
  userAgent: 'User-Agent',
  traceId: 'traceId',
  evaluationTaskId: '评价任务',
  expertUserId: '专家用户',
  subjectTeacherCount: '被评教师数',
  accessTokenHashPrefix: '令牌哈希前缀',
  message: '说明',
  assigneeUserId: '处置责任人',
  resolveEvidenceText: '修复证据/工单',
  exportType: '导出类型',
  exportPurpose: '导出用途',
  approvalResult: '审批结果',
  rejectReason: '驳回原因',
}

function detailFieldLabel(key: string): string {
  return DETAIL_FIELD_LABELS[key] ?? key
}

function formatDetailValue(key: string, value: unknown): string {
  if (key === 'outcome' && typeof value === 'string') {
    return strictEnumLabel(
      PortfolioAuditOutcomeDescription,
      value as PortfolioAuditOutcomeCode,
      '审计结果',
    )
  }
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

const detailEntries = computed(() => {
  const raw = detailRow.value?.detailJson
  if (!raw) {
    return [] as Array<{ key: string, label: string, value: string }>
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.entries(parsed)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        key,
        label: detailFieldLabel(key),
        value: formatDetailValue(key, value),
      }))
  } catch {
    return [{ key: 'detail', label: '详情', value: raw }]
  }
})

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    actionType: filterForm.actionType,
    resourceType: filterForm.resourceType,
    resourceId: filterForm.resourceId.trim() || undefined,
    operatorUserId: filterForm.operatorUserId.trim() || undefined,
  }
  loading.value = true
  loadError.value = false
  try {
    const result = await portfolioSecurityApi.pageAudit(request)
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    if (requestToken.value !== currentToken) return
    loadError.value = true
    showUserError(error, '加载审计日志失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function openDetail(row: PortfolioAuditLogVO) {
  detailRow.value = row
  detailOpen.value = true
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function onPageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="审计日志"
        subtitle="导出、政策、脱敏、专家授权与报送操作留痕"
      >
        <template #actions>
          <UiButton size="sm" :disabled="loading" @click="loadPage()">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch" />
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        pagination-mode="server"
        :total="total"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actionType'">
            {{ actionLabel(record.actionType) }}
          </template>
          <template v-else-if="column.key === 'resourceType'">
            {{ resourceLabel(record.resourceType) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton size="sm" variant="ghost" @click="openDetail(record)">
              查看
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="detailOpen"
      title="审计详情"
      hide-footer
    >
      <template v-if="detailRow">
        <dl class="audit-log-admin__detail">
          <div>
            <dt>时间</dt>
            <dd>{{ detailRow.createTime || '—' }}</dd>
          </div>
          <div>
            <dt>操作人</dt>
            <dd>{{ detailRow.operatorUserId || '—' }}</dd>
          </div>
          <div>
            <dt>动作</dt>
            <dd>{{ actionLabel(detailRow.actionType) }}</dd>
          </div>
          <div>
            <dt>资源</dt>
            <dd>
              {{ resourceLabel(detailRow.resourceType) }}
              · {{ detailRow.resourceId || '—' }}
            </dd>
          </div>
          <div>
            <dt>摘要</dt>
            <dd>{{ detailRow.actionSummary || '—' }}</dd>
          </div>
          <div v-for="entry in detailEntries" :key="entry.key">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>
      </template>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.audit-log-admin__detail {
  margin: 0;
  display: grid;
  gap: var(--dp-space-component-tight);
}
.audit-log-admin__detail > div {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
}
.audit-log-admin__detail dt {
  color: var(--dp-text-secondary);
}
.audit-log-admin__detail dd {
  margin: 0;
  word-break: break-word;
}
</style>
