<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioMajorGroupPeriodCompareVO,
  PortfolioMajorGroupPortfolioSectionItemVO,
  PortfolioMajorGroupPortfolioVO,
} from '@/apis/portfolio/governance'
import type { PortfolioOrgTreeNodeVO } from '@/apis/portfolio/types'
import type { PortfolioComplianceAlertTypeCode } from '@/types/enums/portfolio-compliance-alert-type-enum'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { PortfolioOrgUnitTypeCode } from '@/apis/portfolio/enums'
import { portfolioMajorGroupApi } from '@/apis/portfolio/governance'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  PortfolioAlertStatusCode,
  PortfolioAlertStatusDescription,
} from '@/types/enums/portfolio-alert-status-enum'
import { PortfolioComplianceAlertTypeDescription } from '@/types/enums/portfolio-compliance-alert-type-enum'
import {
  ALL_PORTFOLIO_MAJOR_GROUP_SECTION_CODES,
  PortfolioMajorGroupSectionCode,
  PortfolioMajorGroupSectionDescription,
} from '@/types/enums/portfolio-major-group-section-code-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function flattenMajorGroupOptions(roots: PortfolioOrgTreeNodeVO[]) {
  const result: { value: string, label: string }[] = []
  function walk(nodes: PortfolioOrgTreeNodeVO[], prefix = '') {
    for (const node of nodes) {
      const label = prefix ? `${prefix} / ${node.name}` : node.name
      if (node.nodeType === PortfolioOrgUnitTypeCode.MAJOR_GROUP && node.portfolioOrgId) {
        result.push({ value: node.portfolioOrgId, label })
      }
      if (node.children?.length) {
        walk(node.children, label)
      }
    }
  }
  walk(roots)
  return result
}

const route = useRoute()
const { loadTree, treeRoots } = usePortfolioOrgTree()
const majorGroupOptions = computed(() => flattenMajorGroupOptions(treeRoots.value))

const portfolioOrgId = ref('')
const loading = ref(false)
const sectionLoading = ref(false)
const exportLoading = ref(false)
const portfolioRequestToken = ref(0)
const sectionRequestToken = ref(0)
const compareRequestToken = ref(0)
const exportRequestToken = ref(0)
const portfolio = ref<PortfolioMajorGroupPortfolioVO | null>(null)
const activeSection = ref<PortfolioMajorGroupSectionCode>(PortfolioMajorGroupSectionCode.ARCHIVE)
const sectionItems = ref<PortfolioMajorGroupPortfolioSectionItemVO[]>([])
const sectionTotal = ref(0)
const exportPurpose = ref('')
const exportModalOpen = ref(false)
const compareLoading = ref(false)
const periodCompare = ref<PortfolioMajorGroupPeriodCompareVO | null>(null)
const periodForm = reactive({
  baselinePeriodYear: String(new Date().getFullYear() - 1),
  comparePeriodYear: String(new Date().getFullYear()),
})

const sectionFilter = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const tabItems = computed(() =>
  ALL_PORTFOLIO_MAJOR_GROUP_SECTION_CODES.map((code) => ({
    key: code,
    label: PortfolioMajorGroupSectionDescription[code],
  })),
)

const summaryStats = computed(() => {
  if (!portfolio.value) {
    return []
  }
  const row = portfolio.value
  return [
    { label: '群内教师', value: String(row.teacherCount) },
    { label: '有画像教师', value: String(row.portraitTeacherCount) },
    { label: '平均综合分', value: row.avgCompositeScore },
    { label: '双师认定', value: String(row.dualTeacherCount) },
    { label: '正式档案', value: String(row.officialArchiveCount) },
    { label: '年度规划', value: String(row.developmentPlanCount) },
  ]
})

const openComplianceAlerts = computed(() =>
  (portfolio.value?.complianceAlerts ?? []).filter(
    (item) => item.alertStatus === PortfolioAlertStatusCode.OPEN,
  ),
)

const sectionColumns: ColumnsType = [
  { title: '教师编号', dataIndex: 'teacherId', key: 'teacherId', width: 120 },
  { title: '分类', dataIndex: 'categoryLabel', key: 'categoryLabel', width: 140 },
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '周期', dataIndex: 'periodLabel', key: 'periodLabel', width: 120 },
  { title: '状态', dataIndex: 'statusLabel', key: 'statusLabel', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
]

/** OVERVIEW：同人多身份并列（US-MI-01 / §8.50） */
const overviewIdentityColumns: ColumnsType = [
  { title: '教师编号', dataIndex: 'teacherId', key: 'teacherId', width: 120 },
  { title: '身份', dataIndex: 'identityTypeLabel', key: 'identityTypeLabel', width: 120 },
  { title: '外部身份', key: 'externalIdentity', width: 100 },
  { title: '身份切片分', dataIndex: 'identityCompositeScore', key: 'identityCompositeScore', width: 110 },
  { title: '教学学时', dataIndex: 'workloadHours', key: 'workloadHours', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
  { title: '说明', dataIndex: 'contributionNote', key: 'contributionNote' },
]

const activeSectionColumns = computed(() =>
  activeSection.value === PortfolioMajorGroupSectionCode.OVERVIEW
    ? overviewIdentityColumns
    : sectionColumns,
)

function sectionLabel(code: PortfolioMajorGroupSectionCode): string {
  return PortfolioMajorGroupSectionDescription[code]
}

function complianceTypeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioComplianceAlertTypeDescription,
    code as PortfolioComplianceAlertTypeCode,
    '结构合规预警类型',
  )
}

function alertStatusLabel(code: string): string {
  return strictEnumLabel(
    PortfolioAlertStatusDescription,
    code as PortfolioAlertStatusCode,
    '预警状态',
  )
}

async function loadPortfolio() {
  const currentToken = ++portfolioRequestToken.value
  if (!portfolioOrgId.value) {
    loading.value = false
    portfolio.value = null
    sectionItems.value = []
    sectionTotal.value = 0
    return
  }
  loading.value = true
  try {
    const nextPortfolio = await portfolioMajorGroupApi.getPortfolio({
      portfolioOrgId: portfolioOrgId.value,
    })
    if (currentToken !== portfolioRequestToken.value) {
      return
    }
    portfolio.value = nextPortfolio
  } catch (error) {
    if (currentToken !== portfolioRequestToken.value) {
      return
    }
    portfolio.value = null
    showUserError(error, '加载专业群档案袋失败')
  } finally {
    if (currentToken === portfolioRequestToken.value) {
      loading.value = false
    }
  }
}

async function loadSection() {
  const currentToken = ++sectionRequestToken.value
  if (!portfolioOrgId.value) {
    sectionLoading.value = false
    sectionItems.value = []
    sectionTotal.value = 0
    return
  }
  sectionLoading.value = true
  try {
    const result = await portfolioMajorGroupApi.pageSection({
      portfolioOrgId: portfolioOrgId.value,
      sectionCode: activeSection.value,
      pageNum: sectionFilter.pageNum,
      pageSize: sectionFilter.pageSize,
    })
    if (currentToken !== sectionRequestToken.value) {
      return
    }
    sectionItems.value = result.list ?? []
    sectionTotal.value = result.total ?? 0
  } catch (error) {
    if (currentToken !== sectionRequestToken.value) {
      return
    }
    sectionItems.value = []
    sectionTotal.value = 0
    showUserError(error, '加载分区块明细失败')
  } finally {
    if (currentToken === sectionRequestToken.value) {
      sectionLoading.value = false
    }
  }
}

function openExportModal() {
  exportPurpose.value = ''
  exportModalOpen.value = true
}

async function submitExport() {
  if (!portfolioOrgId.value) {
    return
  }
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return
  }
  if (exportLoading.value) {
    return
  }
  const orgId = portfolioOrgId.value
  const currentToken = exportRequestToken.value + 1
  exportRequestToken.value = currentToken
  exportLoading.value = true
  try {
    await portfolioMajorGroupApi.exportPortfolio({
      portfolioOrgId: orgId,
      exportPurpose: purpose,
    })
    if (exportRequestToken.value !== currentToken || portfolioOrgId.value !== orgId) {
      return
    }
    message.success('导出审批申请已提交')
    exportModalOpen.value = false
  } catch (error) {
    if (exportRequestToken.value !== currentToken || portfolioOrgId.value !== orgId) {
      return
    }
    showUserError(error, '提交导出审批失败')
  } finally {
    if (exportRequestToken.value === currentToken && portfolioOrgId.value === orgId) {
      exportLoading.value = false
    }
  }
}

async function comparePeriods() {
  const currentToken = ++compareRequestToken.value
  if (!portfolioOrgId.value) {
    compareLoading.value = false
    return
  }
  compareLoading.value = true
  try {
    const compareResult = await portfolioMajorGroupApi.comparePeriods({
      portfolioOrgId: portfolioOrgId.value,
      baselinePeriodYear: periodForm.baselinePeriodYear,
      comparePeriodYear: periodForm.comparePeriodYear,
    })
    if (currentToken !== compareRequestToken.value) {
      return
    }
    periodCompare.value = compareResult
  } catch (error) {
    if (currentToken !== compareRequestToken.value) {
      return
    }
    periodCompare.value = null
    showUserError(error, '建设周期对比失败')
  } finally {
    if (currentToken === compareRequestToken.value) {
      compareLoading.value = false
    }
  }
}

function onSectionPageChange(page: { current: number, pageSize: number }) {
  sectionFilter.pageNum = page.current
  sectionFilter.pageSize = page.pageSize
}

/** 路由深链必须驱动当前专业群上下文，避免同页切换后仍停留在旧专业群。 */
function syncPortfolioOrgFromRoute() {
  const queryOrgId = readRouteStringParam(route.query.portfolioOrgId)
  if (queryOrgId && majorGroupOptions.value.some((option) => option.value === queryOrgId)) {
    portfolioOrgId.value = queryOrgId
  }
}

watch(portfolioOrgId, () => {
  portfolioRequestToken.value += 1
  sectionRequestToken.value += 1
  compareRequestToken.value += 1
  exportRequestToken.value += 1
  loading.value = false
  sectionLoading.value = false
  compareLoading.value = false
  exportLoading.value = false
  portfolio.value = null
  sectionItems.value = []
  sectionTotal.value = 0
  const sectionAlreadyFirstPage = sectionFilter.pageNum === 1
  sectionFilter.pageNum = 1
  periodCompare.value = null
  void loadPortfolio()
  if (sectionAlreadyFirstPage) {
    void loadSection()
  }
})

watch(activeSection, () => {
  sectionRequestToken.value += 1
  if (sectionFilter.pageNum === 1) {
    void loadSection()
  } else {
    sectionFilter.pageNum = 1
  }
})

watch(
  () => [periodForm.baselinePeriodYear, periodForm.comparePeriodYear],
  () => {
    compareRequestToken.value += 1
    compareLoading.value = false
    periodCompare.value = null
  },
)

watch(
  () => [sectionFilter.pageNum, sectionFilter.pageSize],
  () => {
    void loadSection()
  },
)

onMounted(async () => {
  await loadTree()
  syncPortfolioOrgFromRoute()
})

watch(
  () => route.query.portfolioOrgId,
  () => {
    syncPortfolioOrgFromRoute()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="专业群档案袋"
        :subtitle="portfolio?.majorGroupName"
      />
    </template>
    <UiCard title="专业群范围">
      <div class="major-group-portfolio__toolbar">
        <UiSelect
          size="sm"
          v-model="portfolioOrgId"
          class="major-group-portfolio__field"
          placeholder="选择专业群"
          :options="majorGroupOptions"
          :disabled="exportLoading"
        />
        <UiButton size="sm" variant="primary" v-if="portfolioOrgId" :loading="exportLoading" @click="openExportModal">
          申请导出
        </UiButton>
      </div>
    </UiCard>
    <UiSpin :spinning="loading">
      <UiAlertStrip
        v-if="!loading && !portfolioOrgId"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
      >
        <template #default>
          <span class="major-group-portfolio__gate-row">
            <UiTag tone="blue" size="sm">未选择专业群</UiTag>
            <span>请在上方选择专业群后查看群像</span>
          </span>
        </template>
      </UiAlertStrip>
      <UiEmpty size="sm" v-else-if="!loading && !portfolio" description="当前专业群暂无档案袋数据" />
      <template v-else-if="portfolio">
        <UiStatPanel title="群像指标" :items="summaryStats" compact />
        <UiCard title="建设周期对比" class="major-group-portfolio__compare">
          <div class="major-group-portfolio__compare-bar">
            <UiInput
              size="sm"
              v-model="periodForm.baselinePeriodYear"
              placeholder="基线年度"
              class="major-group-portfolio__year"
            />
            <span>对比</span>
            <UiInput
              size="sm"
              v-model="periodForm.comparePeriodYear"
              placeholder="对比年度"
              class="major-group-portfolio__year"
            />
            <UiButton size="sm" :loading="compareLoading" @click="comparePeriods">对比</UiButton>
          </div>
          <dl v-if="periodCompare" class="major-group-portfolio__compare-result">
            <div>
              <dt>正式档案</dt>
              <dd>
                {{ periodCompare.baselineOfficialArchiveCount }} →
                {{ periodCompare.compareOfficialArchiveCount }}（{{
                  periodCompare.officialArchiveCountDelta >= 0 ? '+' : ''
                }}{{ periodCompare.officialArchiveCountDelta }}）
              </dd>
            </div>
            <div>
              <dt>发展规划</dt>
              <dd>
                {{ periodCompare.baselineDevelopmentPlanCount }} →
                {{ periodCompare.compareDevelopmentPlanCount }}（{{
                  periodCompare.developmentPlanCountDelta >= 0 ? '+' : ''
                }}{{ periodCompare.developmentPlanCountDelta }}）
              </dd>
            </div>
          </dl>
        </UiCard>
        <UiCard
          v-if="openComplianceAlerts.length"
          title="结构合规预警"
          class="major-group-portfolio__compliance"
        >
          <ul class="major-group-portfolio__alert-list">
            <li
              v-for="item in openComplianceAlerts"
              :key="item.id"
              class="major-group-portfolio__alert-item"
            >
              <div class="major-group-portfolio__alert-head">
                <strong>{{ complianceTypeLabel(item.alertType) }}</strong>
                <UiTag tone="red">
                  {{ alertStatusLabel(item.alertStatus) }}
                </UiTag>
              </div>
              <p>{{ item.alertSummary }}</p>
            </li>
          </ul>
        </UiCard>
        <UiCard title="分区块">
          <UiSectionTabs v-model="activeSection" :items="tabItems" />
          <template v-if="activeSection === PortfolioMajorGroupSectionCode.OVERVIEW">
            <ul class="major-group-portfolio__section-summary">
              <li v-for="item in portfolio.sections" :key="item.sectionCode">
                <strong>{{
                  sectionLabel(item.sectionCode as PortfolioMajorGroupSectionCode)
                }}</strong>
                <span>{{ item.itemCount }} 条</span>
              </li>
            </ul>
            <p class="major-group-portfolio__overview-hint">
              同人多身份并列：一人多身份不合并为单一角色，外部身份单独切片展示（§8.50 / US-MI-01）；生命周期/参评 hold/档案写禁仅标注，台账不默认过滤封存
            </p>
          </template>
          <UiDataTable
            v-model:current="sectionFilter.pageNum"
            v-model:page-size="sectionFilter.pageSize"
            row-key="businessId"
            :columns="activeSectionColumns"
            :data-source="sectionItems"
            :loading="sectionLoading"
            pagination-mode="server"
            :total="sectionTotal"
            @page-change="onSectionPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'externalIdentity'">
                <UiTag :tone="record.externalIdentity ? 'orange' : 'blue'">
                  {{ record.externalIdentity ? '外部' : '校内' }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'lifecycleStatus'">
                <UiTag
                  v-if="record.lifecycleStatus"
                  :tone="record.lifecycleStatus === 'ACTIVE' ? 'green' : 'orange'"
                >
                  {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
                </UiTag>
                <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
                <UiTag v-if="record.archiveWriteForbidden" tone="red" class="ml-1">档案写禁</UiTag>
                <UiTag
                  v-if="record.countsInCurrentFacultyStructure === false"
                  tone="neutral"
                  class="ml-1"
                >
                  不计入在岗结构
                </UiTag>
                <span v-else-if="!record.lifecycleStatus">—</span>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </template>
    </UiSpin>
    <UiDialog
      v-model:open="exportModalOpen"
      title="专业群档案袋导出审批"
      :confirm-loading="exportLoading"
      @ok="submitExport"
    >
      <UiTextarea
        size="sm"
        v-model="exportPurpose"
        placeholder="请说明导出用途，提交后由租户管理员审批"
        :rows="4"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.major-group-portfolio__toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.major-group-portfolio__field {
  min-width: 280px;
}
.major-group-portfolio__compliance {
  margin-top: 16px;
}
.major-group-portfolio__compare {
  margin-top: 16px;
}
.major-group-portfolio__compare-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.major-group-portfolio__year {
  width: 120px;
}
.major-group-portfolio__compare-result {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0 0;
}
.major-group-portfolio__compare-result dt {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.major-group-portfolio__compare-result dd {
  margin: 4px 0 0;
}
.major-group-portfolio__alert-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.major-group-portfolio__alert-item + .major-group-portfolio__alert-item {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--dp-border-subtle);
}
.major-group-portfolio__alert-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}
.major-group-portfolio__section-summary {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.major-group-portfolio__section-summary li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--dp-border-subtle);
}

.major-group-portfolio__overview-hint {
  margin: 12px 0 8px;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.major-group-portfolio__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
</style>
