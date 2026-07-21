<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentPlanVO } from '@/apis/portfolio/teacher-platform'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
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
  reviewModalOpen.value = false
  reviewTargetId.value = ''
  auditOpinion.value = ''
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

function handlePageChange(event: { current: number; pageSize: number }) {
  pageNum.value = event.current
  pageSize.value = event.pageSize
  resetReviewContext()
  void loadPage()
}

async function openReview(id: string, action: 'approve' | 'return') {
  reviewTargetId.value = id
  reviewAction.value = action
  auditOpinion.value = ''
  const plan = rows.value.find((item) => item.id === id)
  reviewOwnerTeacherId.value = plan?.ownerUserId ? String(plan.ownerUserId) : undefined
  if (reviewOwnerTeacherId.value) {
    await reloadLifecycleState()
  }
  reviewModalOpen.value = true
}

function handlePlanReviewRowAction(key: string, planId: string) {
  if (key === 'approve') void openReview(planId, 'approve')
  else if (key === 'return') void openReview(planId, 'return')
}

async function confirmReview() {
  if (!reviewTargetId.value) {
    return
  }
  if (reviewAction.value === 'return' && !auditOpinion.value.trim()) {
    showFormValidationMessage('请填写退回意见')
    return
  }
  if (reviewOwnerTeacherId.value) {
    await reloadLifecycleState()
    const actionLabel = reviewAction.value === 'approve' ? '发展规划院系通过' : '发展规划院系退回'
    if (!assertArchiveWritable(actionLabel)) {
      return
    }
  }
  try {
    if (reviewAction.value === 'approve') {
      await portfolioDevelopmentPlanApi.departmentApprove({
        id: reviewTargetId.value,
        auditOpinion: auditOpinion.value.trim() || undefined,
      })
      void message.success('已通过')
    } else {
      await portfolioDevelopmentPlanApi.departmentReturn({
        id: reviewTargetId.value,
        auditOpinion: auditOpinion.value.trim() || undefined,
      })
      void message.success('已退回')
    }
    reviewModalOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '审核发展规划失败')
  }
}

async function exportPlans() {
  if (exporting.value) {
    return
  }
  if (!filterForm.planYear) {
    showFormValidationMessage('请填写年度')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDevelopmentPlanApi.exportExcel({
      planYear: filterForm.planYear,
    })
    await downloadPortfolioExcelExport(result)
    void message.success('规划已导出')
  } catch (error) {
    showUserError(error, '导出发展规划失败')
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
            @click="exportPlans"
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
        <UiButton size="sm" variant="outline" @click="reviewModalOpen = false">取消</UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :disabled="Boolean(reviewOwnerTeacherId && archiveWriteForbidden)"
          @click="confirmReview"
        >
          {{ reviewAction === 'approve' ? '确认通过' : '确认退回' }}
        </UiButton>
      </template>
    </UiDialog>
  </StageWorkbenchShell>
</template>
