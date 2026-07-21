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
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
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
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const activeTab = ref('portrait')
const tabItems = [
  { key: 'portrait', label: '画像预警' },
  { key: 'compliance', label: '结构合规' },
]

const portraitLoading = ref(false)
const complianceLoading = ref(false)
const actionId = ref('')
const portraitLoadFailed = ref(false)
const complianceLoadFailed = ref(false)
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

function alertStatusLabel(code: string): string {
  return strictEnumLabel(
    PortfolioAlertStatusDescription,
    code as PortfolioAlertStatusCode,
    '预警状态',
  )
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

function alertStatusTone(code: string): 'red' | 'orange' | 'green' | 'gray' {
  if (code === PortfolioAlertStatusCode.OPEN) {
    return 'red'
  }
  if (code === PortfolioAlertStatusCode.ACKNOWLEDGED) {
    return 'orange'
  }
  return 'green'
}

async function loadPortraitAlerts() {
  const currentToken = ++portraitRequestToken.value
  portraitLoading.value = true
  portraitLoadFailed.value = false
  portraitAlerts.value = []
  portraitTotal.value = 0
  try {
    const result = await portfolioAnalysisApi.pageAlerts({
      pageNum: portraitFilter.pageNum,
      pageSize: portraitFilter.pageSize,
      alertType: portraitFilter.alertType,
      alertStatus: portraitFilter.alertStatus,
    })
    if (currentToken !== portraitRequestToken.value) {
      return
    }
    portraitAlerts.value = result.list
    portraitTotal.value = result.total
  } catch (error) {
    if (currentToken !== portraitRequestToken.value) {
      return
    }
    portraitAlerts.value = []
    portraitTotal.value = 0
    portraitLoadFailed.value = true
    showUserError(error, '加载画像预警失败')
  } finally {
    if (currentToken === portraitRequestToken.value) {
      portraitLoading.value = false
    }
  }
}

async function loadComplianceAlerts() {
  const currentToken = ++complianceRequestToken.value
  complianceLoading.value = true
  complianceLoadFailed.value = false
  complianceAlerts.value = []
  complianceTotal.value = 0
  try {
    const result = await portfolioAnalysisApi.pageComplianceAlerts({
      pageNum: complianceFilter.pageNum,
      pageSize: complianceFilter.pageSize,
      scopeType: complianceFilter.scopeType,
      alertStatus: complianceFilter.alertStatus,
    })
    if (currentToken !== complianceRequestToken.value) {
      return
    }
    complianceAlerts.value = result.list
    complianceTotal.value = result.total
  } catch (error) {
    if (currentToken !== complianceRequestToken.value) {
      return
    }
    complianceAlerts.value = []
    complianceTotal.value = 0
    complianceLoadFailed.value = true
    showUserError(error, '加载合规预警失败')
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
  complianceFilter.scopeType = undefined
  complianceFilter.alertStatus = PortfolioAlertStatusCode.OPEN
  void loadComplianceAlerts()
}

async function resolvePortraitAlert(
  row: PortfolioAnalysisAlertVO,
  alertStatus: PortfolioAlertStatusCode,
) {
  if (actionId.value) {
    return
  }
  if (alertStatus === PortfolioAlertStatusCode.RESOLVED) {
    const confirmed = await confirmAsync({
      title: '确认关闭画像预警',
      content: `确认关闭“${row.alertTitle}”？关闭表示该预警已完成处置。`,
      type: 'warning',
      okText: '确认关闭',
    })
    if (!confirmed || actionId.value) {
      return
    }
  }
  actionId.value = row.id
  try {
    await portfolioAnalysisApi.resolvePortraitAlert({
      alertId: row.id,
      alertStatus,
      resolveRemark:
        alertStatus === PortfolioAlertStatusCode.RESOLVED ? '管理端关闭预警' : '管理端已知晓',
    })
    void message.success('画像预警已处置')
    await loadPortraitAlerts()
  } catch (error) {
    showUserError(error, '画像预警处置失败')
  } finally {
    if (actionId.value === row.id) {
      actionId.value = ''
    }
  }
}

async function resolveComplianceAlert(
  row: PortfolioAnalysisComplianceAlertVO,
  alertStatus: PortfolioAlertStatusCode,
) {
  if (actionId.value) {
    return
  }
  if (alertStatus === PortfolioAlertStatusCode.RESOLVED) {
    const confirmed = await confirmAsync({
      title: '确认关闭合规预警',
      content: `确认关闭“${row.alertSummary}”？关闭表示该预警已完成处置。`,
      type: 'warning',
      okText: '确认关闭',
    })
    if (!confirmed || actionId.value) {
      return
    }
  }
  actionId.value = row.id
  try {
    await portfolioAnalysisApi.resolveComplianceAlert({
      alertId: row.id,
      alertStatus,
      resolveRemark:
        alertStatus === PortfolioAlertStatusCode.RESOLVED ? '管理端关闭预警' : '管理端已知晓',
    })
    void message.success('合规预警已处置')
    await loadComplianceAlerts()
  } catch (error) {
    showUserError(error, '合规预警处置失败')
  } finally {
    if (actionId.value === row.id) {
      actionId.value = ''
    }
  }
}

onMounted(() => {
  void loadPortraitAlerts()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="预警中心"
        subtitle="画像短板与结构合规预警"
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
          <UiButton size="sm" variant="primary" @click="loadPortraitAlerts">查询</UiButton>
          <UiButton size="sm" variant="ghost" @click="resetPortraitFilter">重置</UiButton>
        </div>
        <UiDataTable
          v-model:current="portraitFilter.pageNum"
          v-model:page-size="portraitFilter.pageSize"
          row-key="id"
          :columns="portraitColumns"
          :data-source="portraitAlerts"
          pagination-mode="server"
          :total="portraitTotal"
          :load-error="portraitLoadFailed"
          @page-change="onPortraitPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'teacher'">
              <div class="alert-center__teacher">
                <strong>{{ record.teacherName || `教师 ${record.teacherId}` }}</strong>
                <span class="alert-center__sub">
                  {{ record.teacherNumber || record.teacherId }}
                  <template v-if="record.departmentName"> · {{ record.departmentName }} </template>
                </span>
                <div
                  v-if="record.lifecycleStatus || record.ownerIdentityLayers?.length"
                  class="alert-center__identity"
                >
                  <UiTag
                    v-if="record.lifecycleStatus"
                    size="sm"
                    :tone="
                      record.lifecycleStatus === 'ACTIVE'
                        ? 'green'
                        : record.lifecycleStatus === 'TEMP_HOLD'
                          ? 'orange'
                          : record.lifecycleStatus === 'SEALED'
                            || record.lifecycleStatus === 'TRANSFERRED'
                            ? 'red'
                            : 'gray'
                    "
                  >
                    {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
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
              :description="portraitLoadFailed ? '画像预警加载失败' : '暂无画像预警'"
            />
          </template>
        </UiDataTable>
      </UiCard>
      <UiCard v-else title="结构合规预警">
        <div class="alert-center__filters">
          <UiSelect
            v-model="complianceFilter.scopeType"
            size="sm"
            allow-clear
            placeholder="范围类型"
            :options="scopeTypeOptions"
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
          <UiButton size="sm" variant="primary" @click="loadComplianceAlerts">查询</UiButton>
          <UiButton size="sm" variant="ghost" @click="resetComplianceFilter">重置</UiButton>
        </div>
        <UiDataTable
          v-model:current="complianceFilter.pageNum"
          v-model:page-size="complianceFilter.pageSize"
          row-key="id"
          :columns="complianceColumns"
          :data-source="complianceAlerts"
          pagination-mode="server"
          :total="complianceTotal"
          :load-error="complianceLoadFailed"
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
              :description="complianceLoadFailed ? '合规预警加载失败' : '暂无合规预警'"
            />
          </template>
        </UiDataTable>
      </UiCard>
    </UiSpin>
  </StageWorkbenchShell>
</template>

<style scoped>
.alert-center__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.alert-center__field {
  width: 160px;
}

.alert-center__teacher {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-center__sub {
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>
