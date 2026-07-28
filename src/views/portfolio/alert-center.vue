<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioAnalysisAlertVO,
  PortfolioAnalysisComplianceAlertVO,
} from '@/apis/portfolio/analysis'
import type { PortfolioAlertTypeCode } from '@/types/enums/portfolio-alert-type-enum'
import type { PortfolioComplianceAlertTypeCode } from '@/types/enums/portfolio-compliance-alert-type-enum'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
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
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  ALL_PORTFOLIO_ALERT_STATUS_CODES,
  PortfolioAlertStatusCode,
  PortfolioAlertStatusDescription,
} from '@/types/enums/portfolio-alert-status-enum'
import {
  ALL_PORTFOLIO_ALERT_TYPE_CODES,
  PortfolioAlertTypeDescription,
} from '@/types/enums/portfolio-alert-type-enum'
import { PortfolioComplianceAlertTypeDescription } from '@/types/enums/portfolio-compliance-alert-type-enum'
import {
  PortfolioComplianceScopeTypeCode,
  PortfolioComplianceScopeTypeDescription,
} from '@/types/enums/portfolio-compliance-scope-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const activeTab = ref('portrait')
const tabItems = [
  { key: 'portrait', label: '画像预警' },
  { key: 'compliance', label: '结构合规' },
]

const route = useRoute()
const userStore = useUserStore()
/** 院系路由或非租户管理员：合规仅本院系，隐藏全校范围筛选（PRD §7.4.11 / §7.30.2） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系预警中心' : '预警中心'))
const pageSubtitle = computed(() =>
  isDepartmentScoped.value
    ? '画像预警与结构合规预警 · 本院系范围'
    : '画像预警与结构合规预警 · 全校与院系范围',
)
const portraitLoading = ref(false)
const complianceLoading = ref(false)
const actionId = ref('')
const dispositionOpen = ref(false)
const dispositionSubmitting = ref(false)
const dispositionKind = ref<'portrait' | 'compliance'>('portrait')
const dispositionStatus = ref<PortfolioAlertStatusCode>(PortfolioAlertStatusCode.ACKNOWLEDGED)
const dispositionRemark = ref('')
const dispositionAssigneeUserId = ref('')
const dispositionEvidenceText = ref('')
const dispositionPortrait = ref<PortfolioAnalysisAlertVO | null>(null)
const dispositionCompliance = ref<PortfolioAnalysisComplianceAlertVO | null>(null)
const { teacherOptions: assigneeOptions, searchTeachers: searchAssignees } = usePortfolioTeacherSearch()
const portraitLoadFailed = ref(false)
const complianceLoadFailed = ref(false)
const portraitStale = ref(false)
const complianceStale = ref(false)
const portraitLastSuccessAt = ref('')
const complianceLastSuccessAt = ref('')
const portraitRequestToken = ref(0)
const complianceRequestToken = ref(0)
const portraitAlerts = ref<PortfolioAnalysisAlertVO[]>([])
const complianceAlerts = ref<PortfolioAnalysisComplianceAlertVO[]>([])
const portraitTotal = ref(0)
const complianceTotal = ref(0)
const loading = computed(
  () =>
    Boolean(actionId.value)
    || (activeTab.value === 'portrait' ? portraitLoading.value : complianceLoading.value),
)

const portraitFilter = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  alertType: undefined as PortfolioAlertTypeCode | undefined,
  alertStatus: PortfolioAlertStatusCode.OPEN as PortfolioAlertStatusCode | undefined,
})

const complianceFilter = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  // 院系侧默认 DEPARTMENT，避免误请求全校 scope
  scopeType: undefined as PortfolioComplianceScopeTypeCode | undefined,
  alertStatus: PortfolioAlertStatusCode.OPEN as PortfolioAlertStatusCode | undefined,
})

const alertTypeOptions = ALL_PORTFOLIO_ALERT_TYPE_CODES.map((code) => ({
  value: code,
  label: PortfolioAlertTypeDescription[code],
}))

const alertStatusOptions = ALL_PORTFOLIO_ALERT_STATUS_CODES.map((code) => ({
  value: code,
  label: PortfolioAlertStatusDescription[code],
}))

const scopeTypeOptions = [
  {
    value: PortfolioComplianceScopeTypeCode.SCHOOL,
    label: PortfolioComplianceScopeTypeDescription.SCHOOL,
  },
  {
    value: PortfolioComplianceScopeTypeCode.DEPARTMENT,
    label: PortfolioComplianceScopeTypeDescription.DEPARTMENT,
  },
]

const visibleScopeTypeOptions = computed(() =>
  isDepartmentScoped.value
    ? scopeTypeOptions.filter((item) => item.value === PortfolioComplianceScopeTypeCode.DEPARTMENT)
    : scopeTypeOptions,
)

const portraitEmptyDescription = computed(() => {
  if (portraitLoadFailed.value && portraitAlerts.value.length === 0) {
    return '画像预警加载失败'
  }
  return '暂无画像预警'
})

const complianceEmptyDescription = computed(() => {
  if (complianceLoadFailed.value && complianceAlerts.value.length === 0) {
    return '合规预警加载失败'
  }
  return '暂无合规预警'
})

const portraitColumns: ColumnsType = [
  { title: '教师', key: 'teacher', width: 220 },
  { title: '类型', key: 'alertType', width: 140 },
  { title: '标题', dataIndex: 'alertTitle', key: 'alertTitle' },
  { title: '摘要', dataIndex: 'alertSummary', key: 'alertSummary', ellipsis: true },
  { title: '状态', key: 'alertStatus', width: 100 },
  { title: '画像时间', dataIndex: 'portraitComputedTime', key: 'portraitComputedTime', width: 170 },
  { title: '操作', key: 'actions', width: 180 },
]

const complianceColumns: ColumnsType = [
  { title: '范围', key: 'scopeType', width: 90 },
  { title: '院系', key: 'department', width: 180 },
  { title: '类型', key: 'alertType', width: 120 },
  { title: '当前值', dataIndex: 'currentValue', key: 'currentValue', width: 90 },
  { title: '阈值', dataIndex: 'thresholdValue', key: 'thresholdValue', width: 90 },
  { title: '摘要', dataIndex: 'alertSummary', key: 'alertSummary', ellipsis: true },
  { title: '状态', key: 'alertStatus', width: 100 },
  { title: '计算时间', dataIndex: 'computedTime', key: 'computedTime', width: 170 },
  { title: '操作', key: 'actions', width: 180 },
]

function alertTypeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioAlertTypeDescription,
    code as PortfolioAlertTypeCode,
    '画像预警类型',
  )
}

function alertStatusLabel(code?: PortfolioAlertStatusCode): string {
  if (!code) return '—'
  return strictEnumLabel(PortfolioAlertStatusDescription, code, '预警状态')
}

function alertStatusTone(code: PortfolioAlertStatusCode): 'red' | 'orange' | 'green' | 'gray' {
  if (code === PortfolioAlertStatusCode.OPEN) {
    return 'red'
  }
  if (code === PortfolioAlertStatusCode.ACKNOWLEDGED) {
    return 'orange'
  }
  if (code === PortfolioAlertStatusCode.RESOLVED) {
    return 'green'
  }
  return 'gray'
}

function complianceTypeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioComplianceAlertTypeDescription,
    code as PortfolioComplianceAlertTypeCode,
    '结构合规预警类型',
  )
}

function scopeTypeLabel(code: string): string {
  return strictEnumLabel(
    PortfolioComplianceScopeTypeDescription,
    code as PortfolioComplianceScopeTypeCode,
    '合规预警范围',
  )
}

function markSuccessNow(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

async function loadPortraitAlerts(options?: { errorMessage?: string }): Promise<boolean> {
  const currentToken = ++portraitRequestToken.value
  const requestedPage = portraitFilter.pageNum
  const requestedSize = portraitFilter.pageSize
  const requestedType = portraitFilter.alertType
  const requestedStatus = portraitFilter.alertStatus
  portraitLoading.value = true
  portraitLoadFailed.value = false
  try {
    const result = await portfolioAnalysisApi.pageAlerts({
      pageNum: requestedPage,
      pageSize: requestedSize,
      alertType: requestedType,
      alertStatus: requestedStatus,
    })
    if (
      currentToken !== portraitRequestToken.value
      || portraitFilter.pageNum !== requestedPage
      || portraitFilter.pageSize !== requestedSize
      || portraitFilter.alertType !== requestedType
      || portraitFilter.alertStatus !== requestedStatus
    ) {
      return false
    }
    portraitAlerts.value = result.list
    portraitTotal.value = result.total
    portraitStale.value = false
    portraitLastSuccessAt.value = markSuccessNow()
    return true
  } catch (error) {
    if (currentToken !== portraitRequestToken.value) {
      return false
    }
    portraitLoadFailed.value = true
    if (portraitAlerts.value.length > 0) {
      portraitStale.value = true
    }
    showUserError(error, options?.errorMessage ?? '加载画像预警失败')
    return false
  } finally {
    if (currentToken === portraitRequestToken.value) {
      portraitLoading.value = false
    }
  }
}

async function loadComplianceAlerts(options?: { errorMessage?: string }): Promise<boolean> {
  const currentToken = ++complianceRequestToken.value
  const requestedPage = complianceFilter.pageNum
  const requestedSize = complianceFilter.pageSize
  const requestedScope = complianceFilter.scopeType
  const requestedStatus = complianceFilter.alertStatus
  complianceLoading.value = true
  complianceLoadFailed.value = false
  try {
    const scopeType = isDepartmentScoped.value
      ? PortfolioComplianceScopeTypeCode.DEPARTMENT
      : requestedScope
    const result = await portfolioAnalysisApi.pageComplianceAlerts({
      pageNum: requestedPage,
      pageSize: requestedSize,
      scopeType,
      alertStatus: requestedStatus,
    })
    if (
      currentToken !== complianceRequestToken.value
      || complianceFilter.pageNum !== requestedPage
      || complianceFilter.pageSize !== requestedSize
      || complianceFilter.scopeType !== requestedScope
      || complianceFilter.alertStatus !== requestedStatus
    ) {
      return false
    }
    complianceAlerts.value = result.list
    complianceTotal.value = result.total
    complianceStale.value = false
    complianceLastSuccessAt.value = markSuccessNow()
    return true
  } catch (error) {
    if (currentToken !== complianceRequestToken.value) {
      return false
    }
    complianceLoadFailed.value = true
    if (complianceAlerts.value.length > 0) {
      complianceStale.value = true
    }
    showUserError(error, options?.errorMessage ?? '加载合规预警失败')
    return false
  } finally {
    if (currentToken === complianceRequestToken.value) {
      complianceLoading.value = false
    }
  }
}

function reloadActiveTab() {
  if (activeTab.value === 'portrait') {
    void loadPortraitAlerts()
    return
  }
  void loadComplianceAlerts()
}

function onPortraitPageChange(page: { current: number, pageSize: number }) {
  portraitFilter.pageNum = page.current
  portraitFilter.pageSize = page.pageSize
  void loadPortraitAlerts()
}

function onCompliancePageChange(page: { current: number, pageSize: number }) {
  complianceFilter.pageNum = page.current
  complianceFilter.pageSize = page.pageSize
  void loadComplianceAlerts()
}

function resetPortraitFilter() {
  portraitFilter.pageNum = 1
  portraitFilter.alertType = undefined
  portraitFilter.alertStatus = PortfolioAlertStatusCode.OPEN
  void loadPortraitAlerts()
}

function resetComplianceFilter() {
  complianceFilter.pageNum = 1
  complianceFilter.scopeType = isDepartmentScoped.value
    ? PortfolioComplianceScopeTypeCode.DEPARTMENT
    : undefined
  complianceFilter.alertStatus = PortfolioAlertStatusCode.OPEN
  void loadComplianceAlerts()
}

function initDepartmentComplianceScope() {
  if (isDepartmentScoped.value) {
    complianceFilter.scopeType = PortfolioComplianceScopeTypeCode.DEPARTMENT
  }
}

async function resolvePortraitAlert(
  row: PortfolioAnalysisAlertVO,
  alertStatus: PortfolioAlertStatusCode,
) {
  if (actionId.value || dispositionOpen.value) {
    return
  }
  if (!row.updateTime) {
    showFormValidationMessage('预警缺少更新时间，无法处置；请刷新列表')
    return
  }
  dispositionKind.value = 'portrait'
  dispositionPortrait.value = row
  dispositionCompliance.value = null
  dispositionStatus.value = alertStatus
  dispositionRemark.value
    = alertStatus === PortfolioAlertStatusCode.ACKNOWLEDGED ? '管理端已知晓' : ''
  dispositionAssigneeUserId.value = ''
  dispositionEvidenceText.value = ''
  dispositionOpen.value = true
}

async function resolveComplianceAlert(
  row: PortfolioAnalysisComplianceAlertVO,
  alertStatus: PortfolioAlertStatusCode,
) {
  if (actionId.value || dispositionOpen.value) {
    return
  }
  if (!row.updateTime) {
    showFormValidationMessage('预警缺少更新时间，无法处置；请刷新列表')
    return
  }
  dispositionKind.value = 'compliance'
  dispositionCompliance.value = row
  dispositionPortrait.value = null
  dispositionStatus.value = alertStatus
  dispositionRemark.value
    = alertStatus === PortfolioAlertStatusCode.ACKNOWLEDGED ? '管理端已知晓' : ''
  dispositionAssigneeUserId.value = ''
  dispositionEvidenceText.value = ''
  dispositionOpen.value = true
}

const dispositionTitle = computed(() => {
  if (dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED) {
    return dispositionKind.value === 'portrait' ? '关闭画像预警' : '关闭合规预警'
  }
  return dispositionKind.value === 'portrait' ? '标记画像预警已知晓' : '标记合规预警已知晓'
})

const dispositionSummary = computed(() => {
  if (dispositionKind.value === 'portrait' && dispositionPortrait.value) {
    const row = dispositionPortrait.value
    return `${row.alertTitle} · ${row.alertSummary || '—'} · 计算时间 ${row.portraitComputedTime || '—'}`
  }
  if (dispositionKind.value === 'compliance' && dispositionCompliance.value) {
    const row = dispositionCompliance.value
    return `${row.alertSummary} · 当前值 ${row.currentValue ?? '—'} / 阈值 ${row.thresholdValue ?? '—'} · 计算时间 ${row.computedTime || '—'}`
  }
  return ''
})

async function submitDisposition() {
  if (dispositionSubmitting.value) {
    return
  }
  const remark = dispositionRemark.value.trim()
  const assigneeUserId = dispositionAssigneeUserId.value.trim()
  const resolveEvidenceText = dispositionEvidenceText.value.trim()
  if (dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED && !remark) {
    showFormValidationMessage('关闭预警须填写处置意见')
    return
  }
  if (dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED && !assigneeUserId) {
    showFormValidationMessage('关闭预警须指定处置责任人')
    return
  }
  if (dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED && !resolveEvidenceText) {
    showFormValidationMessage('关闭预警须填写修复证据或关联工单')
    return
  }
  if (dispositionKind.value === 'portrait') {
    const row = dispositionPortrait.value
    if (row?.statusVersion == null) {
      showFormValidationMessage('预警缺少状态版本，无法处置')
      return
    }
    dispositionSubmitting.value = true
    actionId.value = row.id
    try {
      await portfolioAnalysisApi.resolvePortraitAlert({
        alertId: row.id,
        alertStatus: dispositionStatus.value,
        expectedFromStatus: row.alertStatus,
        expectedStatusVersion: row.statusVersion,
        resolveRemark: remark || undefined,
        assigneeUserId:
          dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED
            ? assigneeUserId
            : undefined,
        resolveEvidenceText:
          dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED
            ? resolveEvidenceText
            : undefined,
      })
      void message.success('画像预警已处置')
      dispositionOpen.value = false
    } catch (error) {
      showUserError(error, '画像预警处置失败')
      return
    } finally {
      dispositionSubmitting.value = false
      if (actionId.value === row.id) {
        actionId.value = ''
      }
    }
    await loadPortraitAlerts({ errorMessage: '画像预警已处置，列表刷新失败' })
    return
  }
  const row = dispositionCompliance.value
  if (row?.statusVersion == null) {
    showFormValidationMessage('预警缺少状态版本，无法处置')
    return
  }
  dispositionSubmitting.value = true
  actionId.value = row.id
  try {
    await portfolioAnalysisApi.resolveComplianceAlert({
      alertId: row.id,
      alertStatus: dispositionStatus.value,
      expectedFromStatus: row.alertStatus,
      expectedStatusVersion: row.statusVersion,
      resolveRemark: remark || undefined,
      assigneeUserId:
        dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED ? assigneeUserId : undefined,
      resolveEvidenceText:
        dispositionStatus.value === PortfolioAlertStatusCode.RESOLVED
          ? resolveEvidenceText
          : undefined,
    })
    void message.success('合规预警已处置')
    dispositionOpen.value = false
  } catch (error) {
    showUserError(error, '合规预警处置失败')
    return
  } finally {
    dispositionSubmitting.value = false
    if (actionId.value === row.id) {
      actionId.value = ''
    }
  }
  await loadComplianceAlerts({ errorMessage: '合规预警已处置，列表刷新失败' })
}

onMounted(() => {
  initDepartmentComplianceScope()
  void loadPortraitAlerts()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="pageTitle"
        :subtitle="pageSubtitle"
      />
    </template>
    <UiSectionTabs v-model="activeTab" :items="tabItems" @update:model-value="reloadActiveTab" />
    <UiSpin :spinning="loading">
      <UiCard v-if="activeTab === 'portrait'" title="画像预警">
        <div class="alert-center__filters">
          <UiSelect
            v-model="portraitFilter.alertType"
            size="sm"
            allow-clear
            placeholder="预警类型"
            :options="alertTypeOptions"
            class="alert-center__field"
          />
          <UiSelect
            v-model="portraitFilter.alertStatus"
            size="sm"
            allow-clear
            placeholder="预警状态"
            :options="alertStatusOptions"
            class="alert-center__field"
          />
          <UiButton size="sm" variant="primary" @click="() => void loadPortraitAlerts()">查询</UiButton>
          <UiButton size="sm" variant="ghost" @click="resetPortraitFilter">重置</UiButton>
        </div>
        <UiAlertStrip
          v-if="portraitLoadFailed && portraitStale"
          tone="warning"
          class="alert-center__stale"
          title="画像预警同步失败"
        />
        <UiDataTable
          v-model:current="portraitFilter.pageNum"
          v-model:page-size="portraitFilter.pageSize"
          row-key="id"
          :columns="portraitColumns"
          :data-source="portraitAlerts"
          pagination-mode="server"
          :total="portraitTotal"
          :load-error="portraitLoadFailed && portraitAlerts.length === 0"
          @page-change="onPortraitPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'teacher'">
              <div class="alert-center__teacher">
                <strong>{{
                  formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber)
                }}</strong>
                <span v-if="record.departmentName" class="alert-center__sub">
                  {{ record.departmentName }}
                </span>
                <div
                  v-if="record.lifecycleStatus || record.ownerIdentityLayers?.length"
                  class="alert-center__identity"
                >
                  <UiTag
                    v-if="record.lifecycleStatus"
                    size="sm"
                    :tone="
                      portfolioLifecycleTagTone(record.lifecycleStatus)
                    "
                  >
                    {{ portfolioLifecycleStatusDisplay(record.lifecycleStatus) }}
                  </UiTag>
                  <UiTag v-if="record.evaluationHeld" size="sm" tone="orange">参评 hold</UiTag>
                  <PortfolioOwnerIdentityLayersCell
                    v-if="record.ownerIdentityLayers?.length"
                    :layers="record.ownerIdentityLayers"
                    :note="record.ownerMultiIdentityNote"
                    :row-key="record.id"
                  />
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'alertType'">
              {{ alertTypeLabel(record.alertType) }}
            </template>
            <template v-else-if="column.key === 'alertStatus'">
              <UiTag :tone="alertStatusTone(record.alertStatus)">
                {{ alertStatusLabel(record.alertStatus) }}
              </UiTag>
            </template>
            <template
              v-else-if="
                column.key === 'actions' && record.alertStatus === PortfolioAlertStatusCode.OPEN
              "
            >
              <UiButton
                size="sm"
                :loading="actionId === record.id"
                :disabled="Boolean(actionId)"
                @click="resolvePortraitAlert(record, PortfolioAlertStatusCode.ACKNOWLEDGED)"
              >
                已知晓
              </UiButton>
              <UiButton
                size="sm"
                :loading="actionId === record.id"
                :disabled="Boolean(actionId)"
                @click="resolvePortraitAlert(record, PortfolioAlertStatusCode.RESOLVED)"
              >
                关闭
              </UiButton>
            </template>
          </template>
          <template #emptyText>
            <UiEmpty
              size="sm"
              :description="portraitEmptyDescription"
            />
          </template>
        </UiDataTable>
      </UiCard>
      <UiCard v-else title="结构合规预警">
        <div class="alert-center__filters">
          <UiSelect
            v-if="!isDepartmentScoped"
            v-model="complianceFilter.scopeType"
            size="sm"
            allow-clear
            placeholder="范围类型"
            :options="visibleScopeTypeOptions"
            class="alert-center__field"
          />
          <UiSelect
            v-model="complianceFilter.alertStatus"
            size="sm"
            allow-clear
            placeholder="预警状态"
            :options="alertStatusOptions"
            class="alert-center__field"
          />
          <UiButton size="sm" variant="primary" @click="() => void loadComplianceAlerts()">查询</UiButton>
          <UiButton size="sm" variant="ghost" @click="resetComplianceFilter">重置</UiButton>
        </div>
        <UiAlertStrip
          v-if="complianceLoadFailed && complianceStale"
          tone="warning"
          class="alert-center__stale"
          title="合规预警同步失败"
        />
        <UiDataTable
          v-model:current="complianceFilter.pageNum"
          v-model:page-size="complianceFilter.pageSize"
          row-key="id"
          :columns="complianceColumns"
          :data-source="complianceAlerts"
          pagination-mode="server"
          :total="complianceTotal"
          :load-error="complianceLoadFailed && complianceAlerts.length === 0"
          @page-change="onCompliancePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'scopeType'">
              {{ scopeTypeLabel(record.scopeType) }}
            </template>
            <template v-else-if="column.key === 'department'">
              {{
                record.departmentName
                  || (record.departmentId ? `院系 ${record.departmentId}` : '全校')
              }}
            </template>
            <template v-else-if="column.key === 'alertType'">
              {{ complianceTypeLabel(record.alertType) }}
            </template>
            <template v-else-if="column.key === 'alertStatus'">
              <UiTag :tone="alertStatusTone(record.alertStatus)">
                {{ alertStatusLabel(record.alertStatus) }}
              </UiTag>
            </template>
            <template
              v-else-if="
                column.key === 'actions' && record.alertStatus === PortfolioAlertStatusCode.OPEN
              "
            >
              <UiButton
                size="sm"
                :loading="actionId === record.id"
                :disabled="Boolean(actionId)"
                @click="resolveComplianceAlert(record, PortfolioAlertStatusCode.ACKNOWLEDGED)"
              >
                已知晓
              </UiButton>
              <UiButton
                size="sm"
                :loading="actionId === record.id"
                :disabled="Boolean(actionId)"
                @click="resolveComplianceAlert(record, PortfolioAlertStatusCode.RESOLVED)"
              >
                关闭
              </UiButton>
            </template>
          </template>
          <template #emptyText>
            <UiEmpty
              size="sm"
              :description="complianceEmptyDescription"
            />
          </template>
        </UiDataTable>
      </UiCard>
    </UiSpin>
    <UiDialog
      v-model:open="dispositionOpen"
      :title="dispositionTitle"
      :confirm-loading="dispositionSubmitting"
      :closable="!dispositionSubmitting"
      :mask-closable="!dispositionSubmitting"
      @ok="submitDisposition"
    >
      <p class="alert-center__disposition-summary">{{ dispositionSummary }}</p>
      <UiSelect
        v-if="dispositionStatus === PortfolioAlertStatusCode.RESOLVED"
        v-model="dispositionAssigneeUserId"
        size="sm"
        allow-search
        allow-clear
        placeholder="处置责任人（姓名/工号）"
        style="width: 100%; margin-bottom: var(--dp-space-component-tight)"
        :filter-option="false"
        :options="assigneeOptions"
        :disabled="dispositionSubmitting"
        @search="searchAssignees"
      />
      <UiInput
        v-if="dispositionStatus === PortfolioAlertStatusCode.RESOLVED"
        v-model="dispositionEvidenceText"
        size="sm"
        placeholder="修复证据或关联工单"
        style="margin-bottom: var(--dp-space-component-tight)"
        :disabled="dispositionSubmitting"
      />
      <UiTextarea
        v-model="dispositionRemark"
        :rows="4"
        :placeholder="
          dispositionStatus === PortfolioAlertStatusCode.RESOLVED
            ? '请填写处置意见'
            : '可选：已知晓说明'
        "
        :disabled="dispositionSubmitting"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.alert-center__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
}

.alert-center__stale {
  margin-bottom: var(--dp-space-component);
}

.alert-center__field {
  width: 160px;
}

.alert-center__disposition-summary {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.alert-center__teacher {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-center__sub {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}

.alert-center__identity {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-xs);
  margin-top: 2px;
}
</style>
