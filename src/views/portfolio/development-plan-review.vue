<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentPlanVO } from '@/apis/portfolio/teacher-platform'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_OPTIONS,
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
  PortfolioDevelopmentPlanStatusCode,
  PortfolioDevelopmentPlanStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

interface ReviewFilterModel extends Record<string, unknown> {
  portfolioOrgId?: string
  planStatus?: PortfolioDevelopmentPlanStatusCode
  planYear?: string
}

function planStatusLabel(status: PortfolioDevelopmentPlanStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentPlanStatusDescription, status, '发展规划状态')
}

function planStatusTone(status: PortfolioDevelopmentPlanStatusCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE, status, '发展规划状态')
}

const { loadTree, portfolioOrgOptions } = usePortfolioOrgTree()
const { canPickTeachers } = usePortfolioTeacherAccess()
const route = useRoute()

const filterForm = reactive<ReviewFilterModel>({
  planStatus: PortfolioDevelopmentPlanStatusCode.DEPARTMENT_PENDING,
  planYear: String(new Date().getFullYear()),
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'planYear',
    type: 'input',
    label: '年度',
    width: 100,
    placeholder: '如 2026',
  },
  {
    key: 'portfolioOrgId',
    type: 'select',
    label: '归属科室',
    allowClear: true,
    width: 220,
    options: portfolioOrgOptions(),
  },
  {
    key: 'planStatus',
    type: 'select',
    label: '规划状态',
    allowClear: true,
    width: 160,
    options: PORTFOLIO_DEVELOPMENT_PLAN_STATUS_OPTIONS.map((item) => ({
      value: item.value,
      label: planStatusLabel(item.value),
    })),
  },
])

const loading = ref(false)
const exporting = ref(false)
const exportConfirmOpen = ref(false)
const exportPurpose = ref('')
const rows = ref<PortfolioDevelopmentPlanVO[]>([])
const pageNum = ref(1)
const pageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const pageTotal = ref(0)
const reviewRequestToken = ref(0)
const pendingLocatePlanId = ref('')
const reviewModalOpen = ref(false)
const reviewTargetId = ref('')
const reviewAction = ref<'approve' | 'return'>('approve')
const auditOpinion = ref('')
const reviewOwnerTeacherId = ref<string | undefined>(undefined)
const reviewOperationToken = ref(0)
const reviewPreparing = ref(false)
const reviewSubmitting = ref(false)
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: reviewOwnerTeacherId })

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 88 },
  { title: '科室编号', dataIndex: 'portfolioOrgId', key: 'portfolioOrgId', width: 120 },
  { title: '状态', key: 'planStatus', width: 120 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '操作', key: 'actions', width: 120 },
]

async function loadPage() {
  const currentToken = ++reviewRequestToken.value
  loading.value = true
  try {
    const page = await portfolioDevelopmentPlanApi.page({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      planYear: filterForm.planYear,
      planStatus: filterForm.planStatus,
      portfolioOrgId: filterForm.portfolioOrgId,
      locatePlanId: pendingLocatePlanId.value || undefined,
    })
    if (currentToken !== reviewRequestToken.value) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
    pageNum.value = page.pageNum ?? pageNum.value
    pageSize.value = page.pageSize ?? pageSize.value
    pendingLocatePlanId.value = ''
  } catch (error) {
    if (currentToken !== reviewRequestToken.value) {
      return
    }
    showUserError(error, '加载发展规划列表失败')
  } finally {
    if (currentToken === reviewRequestToken.value) {
      loading.value = false
    }
  }
}

/** 深链规划或筛选范围变化时必须失效旧审核目标，避免上一条规划弹窗残留到当前上下文。 */
function resetReviewContext() {
  reviewOperationToken.value += 1
  reviewPreparing.value = false
  reviewSubmitting.value = false
  reviewModalOpen.value = false
  reviewTargetId.value = ''
  reviewOwnerTeacherId.value = undefined
  auditOpinion.value = ''
}

/** 关闭审核弹窗时作废尚未写入的预检上下文。 */
function handleReviewModalOpenChange(open: boolean): void {
  if (!open && !reviewSubmitting.value) {
    resetReviewContext()
  }
}

/**
 * PF-P0-288：审核页消费 planId 深链；同步筛选年度到目标规划，避免默认当年过滤致弹窗打不开。
 */
function openPlanFromQuery() {
  const planId = typeof route.query.planId === 'string' ? route.query.planId : ''
  if (!planId) {
    resetReviewContext()
    return
  }
  const target = rows.value.find((item) => item.id === planId)
  if (!target) {
    resetReviewContext()
    return
  }
  if (target.planYear && target.planYear !== filterForm.planYear) {
    filterForm.planYear = target.planYear
  }
  if (target?.planStatus === PortfolioDevelopmentPlanStatusCode.DEPARTMENT_PENDING) {
    void openReview(planId, 'approve')
    return
  }
  resetReviewContext()
}

function handleSearch() {
  pageNum.value = 1
  resetReviewContext()
  void loadPage()
}

function handlePageChange(event: { current: number, pageSize: number }) {
  pageNum.value = event.current
  pageSize.value = event.pageSize
  resetReviewContext()
  void loadPage()
}

/** 冻结规划、教师与动作后执行生命周期预检。 */
async function openReview(id: string, action: 'approve' | 'return'): Promise<void> {
  if (reviewPreparing.value || reviewSubmitting.value || reviewModalOpen.value) {
    showFormValidationMessage('请先完成当前规划审核')
    return
  }
  const plan = rows.value.find((item) => item.id === id)
  if (!plan) {
    showFormValidationMessage('规划已不在当前列表，请刷新后重试')
    return
  }
  const ownerTeacherId = plan.ownerUserId ? String(plan.ownerUserId) : undefined
  const operationToken = reviewOperationToken.value + 1
  reviewOperationToken.value = operationToken
  reviewPreparing.value = true
  reviewTargetId.value = id
  reviewAction.value = action
  auditOpinion.value = ''
  reviewOwnerTeacherId.value = ownerTeacherId
  try {
    if (ownerTeacherId) {
      await reloadLifecycleState()
    }
    if (
      reviewOperationToken.value !== operationToken
      || reviewTargetId.value !== id
      || reviewOwnerTeacherId.value !== ownerTeacherId
    ) {
      return
    }
    reviewModalOpen.value = true
  } finally {
    if (reviewOperationToken.value === operationToken) {
      reviewPreparing.value = false
    }
  }
}

function handlePlanReviewRowAction(key: string, planId: string) {
  if (key === 'approve') void openReview(planId, 'approve')
  else if (key === 'return') void openReview(planId, 'return')
}

/** 复检冻结的规划审核上下文并提交，禁止预检与写目标错配。 */
async function confirmReview(): Promise<void> {
  if (!reviewTargetId.value) {
    return
  }
  if (reviewAction.value === 'return' && !auditOpinion.value.trim()) {
    showFormValidationMessage('请填写退回意见')
    return
  }
  if (reviewSubmitting.value) {
    return
  }
  const context = {
    operationToken: reviewOperationToken.value,
    planId: reviewTargetId.value,
    ownerTeacherId: reviewOwnerTeacherId.value,
    action: reviewAction.value,
    auditOpinion: auditOpinion.value.trim() || undefined,
  }
  reviewSubmitting.value = true
  try {
    if (context.ownerTeacherId) {
      await reloadLifecycleState()
    }
    if (
      reviewOperationToken.value !== context.operationToken
      || reviewTargetId.value !== context.planId
      || reviewOwnerTeacherId.value !== context.ownerTeacherId
      || reviewAction.value !== context.action
    ) {
      return
    }
    const actionLabel = context.action === 'approve' ? '发展规划院系通过' : '发展规划院系退回'
    if (context.ownerTeacherId && !assertArchiveWritable(actionLabel)) {
      return
    }
    if (context.action === 'approve') {
      await portfolioDevelopmentPlanApi.departmentApprove({
        id: context.planId,
        auditOpinion: context.auditOpinion,
      })
      void message.success('已通过')
    } else {
      await portfolioDevelopmentPlanApi.departmentReturn({
        id: context.planId,
        auditOpinion: context.auditOpinion,
      })
      void message.success('已退回')
    }
    if (reviewOperationToken.value !== context.operationToken) {
      return
    }
    reviewSubmitting.value = false
    resetReviewContext()
    await loadPage()
  } catch (error) {
    if (reviewOperationToken.value !== context.operationToken) {
      return
    }
    showUserError(error, '审核发展规划失败')
  } finally {
    if (reviewOperationToken.value === context.operationToken) {
      reviewSubmitting.value = false
    }
  }
}

function openExportConfirm() {
  if (exporting.value) return
  exportPurpose.value = ''
  exportConfirmOpen.value = true
}

async function exportPlans() {
  if (exporting.value) return
  if (!filterForm.planYear) {
    showFormValidationMessage('请填写年度')
    return
  }
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDevelopmentPlanApi.exportExcel({
      planYear: filterForm.planYear,
      exportPurpose: purpose,
    })
    await downloadPortfolioExcelExport(result)
    exportConfirmOpen.value = false
    void message.success('规划已导出')
  } catch (error) {
    showUserError(error, '导出规划失败')
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await loadTree()
  pendingLocatePlanId.value = typeof route.query.planId === 'string' ? route.query.planId : ''
  await loadPage()
  openPlanFromQuery()
})

watch(
  () => route.query.planId,
  async (planId, previousPlanId) => {
    if (planId === previousPlanId) {
      return
    }
    pageNum.value = 1
    resetReviewContext()
    pendingLocatePlanId.value = typeof planId === 'string' ? planId : ''
    await loadPage()
    openPlanFromQuery()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="年度规划审核">
        <template v-if="canPickTeachers" #actions>
          <UiButton
            size="sm"
            variant="primary"
            :loading="exporting"
            :disabled="exporting"
            @click="openExportConfirm"
          >
            导出表格文件
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiFilterBar
      variant="plain"
      v-model="filterModel"
      :fields="filterFields"
      @search="handleSearch"
    />
    <UiCard>
      <UiEmpty size="sm" v-if="!loading && rows.length === 0" description="当前筛选无待审规划" />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'planStatus'">
            <UiTag :tone="planStatusTone(record.planStatus)">
              {{ planStatusLabel(record.planStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id || record.teacherId || record.teacherUserId || record.userId"
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                {
                  key: 'approve',
                  label: '通过',
                  hidden:
                    record.planStatus !== PortfolioDevelopmentPlanStatusCode.DEPARTMENT_PENDING,
                },
                {
                  key: 'return',
                  label: '退回',
                  hidden:
                    record.planStatus !== PortfolioDevelopmentPlanStatusCode.DEPARTMENT_PENDING,
                },
              ]"
              split
              @action="(key) => handlePlanReviewRowAction(key, record.id)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="reviewModalOpen"
      :title="reviewAction === 'approve' ? '科室审核通过' : '科室审核退回'"
      @update:open="handleReviewModalOpenChange"
    >
      <UiAlertStrip
        v-if="reviewOwnerTeacherId && archiveWriteForbidden"
        tone="warning"
        :message="archiveWriteBlockMessage || '该教师档案当前禁止审核跃迁'"
        class="mb-3"
      />
      <UiTextarea
        size="sm"
        v-model="auditOpinion"
        :placeholder="reviewAction === 'return' ? '请填写退回意见' : '审核意见（可选）'"
        :rows="3"
      />
      <template #footer>
        <UiButton
          size="sm"
          variant="outline"
          :disabled="reviewSubmitting"
          @click="resetReviewContext"
        >
          取消
        </UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="reviewSubmitting"
          :disabled="Boolean(reviewOwnerTeacherId && archiveWriteForbidden)"
          @click="confirmReview"
        >
          {{ reviewAction === 'approve' ? '确认通过' : '确认退回' }}
        </UiButton>
      </template>
    </UiDialog>

    <UiDialog
      v-model:open="exportConfirmOpen"
      title="导出"
      ok-text="确认导出"
      cancel-text="取消"
      :confirm-loading="exporting"
      @ok="exportPlans"
    >
      <label class="export-purpose__label">导出用途（必填）</label>
      <UiTextarea
        v-model="exportPurpose"
        size="sm"
        :rows="3"
        placeholder="请填写本次导出用途（写入审计）"
        :disabled="exporting"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.export-purpose__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}
</style>
