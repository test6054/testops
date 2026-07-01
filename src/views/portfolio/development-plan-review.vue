<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentPlanStatus } from '@/apis/portfolio/enums'
import {
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_LABEL,
  PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE,
} from '@/apis/portfolio/enums'
import type { PortfolioDevelopmentPlanVO } from '@/apis/portfolio/teacher-platform'
import { portfolioDevelopmentPlanApi } from '@/apis/portfolio/teacher-platform'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

interface ReviewFilterModel {
  portfolioOrgId?: string
  planStatus?: PortfolioDevelopmentPlanStatus
  planYear?: string
}

function planStatusLabel(status: PortfolioDevelopmentPlanStatus): string {
  return strictEnumLabel(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_LABEL, status, '发展规划状态')
}

function planStatusTone(status: PortfolioDevelopmentPlanStatus): BadgeTone {
  return strictEnumTone(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE, status, '发展规划状态')
}

const { loadTree, portfolioOrgOptions } = usePortfolioOrgTree()
const { canPickTeachers } = usePortfolioTeacherAccess()
const route = useRoute()

const filterForm = reactive<ReviewFilterModel>({
  planStatus: 'DEPARTMENT_PENDING',
  planYear: String(new Date().getFullYear()),
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
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
    options: (
      Object.keys(PORTFOLIO_DEVELOPMENT_PLAN_STATUS_LABEL) as PortfolioDevelopmentPlanStatus[]
    ).map((value) => ({ value, label: planStatusLabel(value) })),
  },
])

const loading = ref(false)
const rows = ref<PortfolioDevelopmentPlanVO[]>([])
const pageNum = ref(1)
const pageTotal = ref(0)
const reviewModalOpen = ref(false)
const reviewTargetId = ref('')
const reviewAction = ref<'approve' | 'return'>('approve')
const auditOpinion = ref('')

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 88 },
  { title: '科室 ID', dataIndex: 'portfolioOrgId', key: 'portfolioOrgId', width: 120 },
  { title: '状态', key: 'planStatus', width: 120 },
  { title: '操作', key: 'actions', width: 120 },
]

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioDevelopmentPlanApi.page({
      pageNum: pageNum.value,
      pageSize: 20,
      planYear: filterForm.planYear,
      planStatus: filterForm.planStatus,
      portfolioOrgId: filterForm.portfolioOrgId,
    })
    rows.value = readPageList(page, '加载待审规划失败')
    pageTotal.value = readPageTotal(page)
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

function openPlanFromQuery() {
  const planId = typeof route.query.planId === 'string' ? route.query.planId : ''
  if (!planId) {
    return
  }
  const target = rows.value.find((item) => item.id === planId)
  if (target?.planStatus === 'DEPARTMENT_PENDING') {
    openReview(planId, 'approve')
  }
}

function handleSearch() {
  pageNum.value = 1
  void loadPage()
}

function openReview(id: string, action: 'approve' | 'return') {
  reviewTargetId.value = id
  reviewAction.value = action
  auditOpinion.value = ''
  reviewModalOpen.value = true
}

async function confirmReview() {
  if (!reviewTargetId.value) {
    return
  }
  try {
    if (reviewAction.value === 'approve') {
      await portfolioDevelopmentPlanApi.departmentApprove({
        id: reviewTargetId.value,
        auditOpinion: auditOpinion.value.trim() || undefined,
      })
      message.success('已通过')
    } else {
      await portfolioDevelopmentPlanApi.departmentReturn({
        id: reviewTargetId.value,
        auditOpinion: auditOpinion.value.trim() || undefined,
      })
      message.success('已退回')
    }
    reviewModalOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function exportPlans() {
  if (!filterForm.planYear) {
    message.warning('请填写年度')
    return
  }
  try {
    const result = await portfolioDevelopmentPlanApi.exportExcel({ planYear: filterForm.planYear })
    await downloadPortfolioExcelExport(result)
    message.success('规划已导出')
  } catch (error) {
    showUserError(error)
  }
}

onMounted(async () => {
  await loadTree()
  await loadPage()
  openPlanFromQuery()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="年度规划审核">
        <template v-if="canPickTeachers" #actions>
          <UiButton @click="exportPlans"> 导出 Excel </UiButton>
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
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无待审规划" />
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'planStatus'">
            <UiTag :tone="planStatusTone(record.planStatus)">
              {{ planStatusLabel(record.planStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <template v-if="record.planStatus === 'DEPARTMENT_PENDING'">
              <UiButton size="sm" @click="openReview(record.id, 'approve')"> 通过 </UiButton>
              <UiButton size="sm" style="margin-left: 8px" @click="openReview(record.id, 'return')">
                退回
              </UiButton>
            </template>
          </template>
        </template>
      </UiDataTable>
      <a-pagination
        v-model:current="pageNum"
        :total="pageTotal"
        :page-size="20"
        style="margin-top: 12px"
        @change="loadPage"
      />
    </UiCard>
    <a-modal
      v-model:open="reviewModalOpen"
      :title="reviewAction === 'approve' ? '科室审核通过' : '科室审核退回'"
      ok-text="确认"
      cancel-text="取消"
      @ok="confirmReview"
    >
      <a-textarea v-model:value="auditOpinion" placeholder="审核意见（可选）" :rows="3" />
    </a-modal>
  </StageWorkbenchShell>
</template>
