<template>
  <StageWorkbenchShell class="printer-management-page">
    <template #context>
      <ContextBar layout="workbench" show-title title="扫描设备" :subtitle="deviceContextSubtitle">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="canManageScannerDeviceWrites === true"
            size="sm"
            variant="primary"
            :disabled="formSubmitting || deviceActionLoading"
            @click="handleCreate"
          >
            <template #icon><PlusOutlined /></template>
            新增设备
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand layout="spotlight" compact variant="panel" :metrics="deviceSignalMetrics" />
    </template>

    <ExamWorkspaceJourneySubNav />

    <UiAlertStrip
      v-if="deviceDataIssueDescription"
      tone="error"
      title="扫描设备数据未完整加载"
      :description="deviceDataIssueDescription"
      :closable="false"
      dense
    />

    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <UiFilterBar
          variant="plain"
          :model-value="searchForm"
          :fields="deviceFilterFields"
          search-text="查询"
          @update:model-value="syncSearchForm"
          @search="handleSearch"
          @reset="handleResetSearch"
        />
      </template>

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="devices"
        :loading="loading"
        :load-error="listLoadFailed"
        row-key="id"
        size="middle"
        flat
        :total="pagination.total"
        :empty-description="appliedFilterActive ? '没有符合当前筛选的扫描设备' : '当前租户尚未登记扫描设备'"
        @page-change="handleUiPageChange"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'status'">
            <UiTag :tone="statusColorOf(devices[index].status)">
              {{ statusLabelOf(devices[index].status) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'endpointOnlineStatus'">
            <UiTag :tone="endpointOnlineStatusDisplayColorOf(devices[index])">
              {{ endpointOnlineStatusDisplayLabelOf(devices[index]) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'agentVersion'">
            <span v-if="devices[index].agentVersion">{{ devices[index].agentVersion }}</span>
            <span v-else class="dp-text-muted">未激活</span>
          </template>
          <template v-else-if="column.key === 'lastSeenTime'">
            <span v-if="devices[index].lastSeenTime">{{ devices[index].lastSeenTime }}</span>
            <span v-else class="dp-text-muted">从未通讯</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :max-visible="2"
              :items="buildDeviceActions(devices[index])"
              split
              @action="(key) => handleDeviceAction(key, devices[index])"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <!-- 新增/编辑设备弹窗 -->
    <UiDialog
      v-model:open="showFormModal"
      :title="formMode === 'create' ? '新增扫描设备' : '编辑扫描设备'"
      :width="720"
      :confirm-loading="formSubmitting === true"
      @ok="handleFormSubmit"
      @cancel="showFormModal = false"
    >
      <UiForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :label-col="{ span: 7 }"
        :wrapper-col="{ span: 16 }"
      >
        <UiRow :gutter="16">
          <UiCol :span="12" :xs="24">
            <UiFormItem name="scannerDeviceId" label="扫描设备编号">
              <UiInput
                size="sm"
                v-model="formData.scannerDeviceId"
                placeholder="租户内唯一，例如厂商型号-编号"
                :disabled="formMode === 'edit'"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12" :xs="24">
            <UiFormItem name="scannerStationId" label="扫描站点编号">
              <UiInput
                size="sm"
                v-model="formData.scannerStationId"
                placeholder="同一物理位置可有多台设备"
                :disabled="formMode === 'edit'"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="16">
          <UiCol :span="12" :xs="24">
            <UiFormItem name="deviceName" label="设备名称">
              <UiInput size="sm" v-model="formData.deviceName" placeholder="教师可读的设备名" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12" :xs="24">
            <UiFormItem name="status" label="设备状态">
              <UiSelect
                size="sm"
                v-model="formData.status"
                :options="SCANNER_DEVICE_STATUS_OPTIONS"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12" :xs="24">
            <UiFormItem name="scannerIp" label="设备地址">
              <UiInput
                size="sm"
                v-model="formData.scannerIp"
                placeholder="可选，一体机扫描客户端心跳会自动刷新"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="16">
          <UiCol :span="12" :xs="24">
            <UiFormItem name="kioskLockEnabled" label="Kiosk 防误触锁">
              <UiSwitch
                size="sm"
                v-model="formData.kioskLockEnabled"
                checked-children="启用"
                un-checked-children="关闭"
              />
            </UiFormItem>
          </UiCol>
          <UiCol v-if="formMode === 'edit'" :span="12" :xs="24">
            <UiFormItem name="webSupplementEnabled" label="Web 补录工位">
              <UiSwitch
                size="sm"
                v-model="formData.webSupplementEnabled"
                checked-children="启用"
                un-checked-children="关闭"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>

        <UiDivider orientation="left">运维信息（可选）</UiDivider>
        <UiRow :gutter="16">
          <UiCol :span="12" :xs="24">
            <UiFormItem name="manufacturer" label="厂商">
              <UiInput
                size="sm"
                v-model="formData.manufacturer"
                placeholder="如 EPSON / Canon / 富士通"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12" :xs="24">
            <UiFormItem name="model" label="型号">
              <UiInput size="sm" v-model="formData.model" placeholder="设备型号" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="16">
          <UiCol :span="12" :xs="24">
            <UiFormItem name="location" label="物理位置">
              <UiInput
                size="sm"
                v-model="formData.location"
                placeholder="如 教学楼A栋 301 教研室"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12" :xs="24">
            <UiFormItem name="remark" label="备注">
              <UiInput size="sm" v-model="formData.remark" placeholder="维护备注" />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
    </UiDialog>

    <!-- 设备详情弹窗 -->
    <UiDialog v-model:open="showDetailModal" title="扫描设备详情" :width="720" hide-footer>
      <UiSkeletonState v-if="detailLoading" variant="card" compact />
      <UiStateBlock
        v-else-if="detailLoadFailed"
        state="error"
        size="sm"
        title="扫描设备详情加载失败"
        description="请关闭详情后重新进入，当前不展示不完整设备状态。"
      />
      <UiDescriptions v-else-if="detailInfo" bordered :column="{ xs: 1, sm: 2 }" size="small">
        <UiDescriptionsItem label="设备名称">{{ detailInfo.deviceName }}</UiDescriptionsItem>
        <UiDescriptionsItem label="扫描设备编号">
          {{ detailInfo.scannerDeviceId }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="扫描站点编号">
          {{ detailInfo.scannerStationId }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="设备状态">
          <UiTag :tone="statusColorOf(detailInfo.status)">
            {{ statusLabelOf(detailInfo.status) }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="设备地址">
          {{ detailInfo.scannerIp || '—' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="Kiosk 防误触锁">
          <UiTag :tone="detailInfo.kioskLockEnabled !== true ? 'orange' : 'green'">
            {{ detailInfo.kioskLockEnabled !== true ? '已关闭' : '已启用' }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="Web 补录工位">
          <UiTag :tone="detailInfo.webSupplementEnabled === true ? 'blue' : 'gray'">
            {{ detailInfo.webSupplementEnabled === true ? '已启用' : '未启用' }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="扫描组件在线状态">
          <UiTag :tone="endpointOnlineStatusDisplayColorOf(detailInfo)">
            {{ endpointOnlineStatusDisplayLabelOf(detailInfo) }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="扫描组件版本">
          {{ detailInfo.agentVersion || '未激活' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="客户端版本">
          {{ detailInfo.clientVersion || '—' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="端点名称">
          {{ detailInfo.endpointName || '—' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="扫描仪连接">
          {{ detailInfo.scannerConnected === true ? '已连接' : '未连接或未上报' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="本地队列">
          任务 {{ detailInfo.pendingJobCount ?? '未上报' }} / 待上传页
          {{ detailInfo.pendingUploadPageCount ?? '未上报' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="最近心跳">
          {{ detailInfo.lastHeartbeatTime || '从未心跳' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="扫描组件维护说明">
          {{
            scannerDeviceDiagnosticText(detailInfo.diagnosticMessage, detailInfo.diagnosticStatus)
          }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="厂商">{{ detailInfo.manufacturer || '—' }}</UiDescriptionsItem>
        <UiDescriptionsItem label="型号">{{ detailInfo.model || '—' }}</UiDescriptionsItem>
        <UiDescriptionsItem label="物理位置" :span="2">
          {{ detailInfo.location || '—' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="最近通讯时间">
          {{ detailInfo.lastSeenTime || '从未通讯' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="创建时间">
          {{ detailInfo.createTime || '—' }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="备注" :span="2">
          {{ detailInfo.remark || '—' }}
        </UiDescriptionsItem>
      </UiDescriptions>
    </UiDialog>

    <UiDialog v-model:open="showActivationCodeModal" title="一体机激活码" :width="520" hide-footer>
      <UiSkeletonState v-if="activationCodeLoading" variant="card" compact />
      <UiStateBlock
        v-else-if="activationCodeLoadFailed"
        state="error"
        size="sm"
        title="激活码生成失败"
        description="请关闭窗口后从目标设备重新发起，当前没有可交付的激活码。"
      />
      <div v-else-if="activationCodeInfo" class="activation-code-modal">
        <p class="activation-code-modal__hint">
          请在一体机 Kiosk 页面输入 8
          位数字激活码与端点名称完成绑定。激活码一次性有效，过期后需重新生成。
        </p>
        <div class="activation-code-modal__device">
          {{ activationCodeDeviceName }}
        </div>
        <AQrcode
          v-if="activationCodeInfo.activationCode"
          :value="activationCodeInfo.activationCode"
          :size="220"
          error-level="M"
        />
        <div class="activation-code-modal__code">
          {{ activationCodeInfo.activationCode }}
        </div>
        <div class="activation-code-modal__meta">
          <span>扫描设备编号：{{ activationCodeInfo.scannerDeviceId }}</span>
          <span>扫描站点：{{ activationCodeInfo.scannerStationId }}</span>
          <span>有效期至：{{ activationCodeInfo.expireTime }}</span>
        </div>
        <div class="activation-code-modal__actions">
          <UiButton size="sm" @click="copyText(activationCodeInfo.activationCode)">
            复制激活码
          </UiButton>
          <UiButton size="sm" variant="outline" @click="showActivationCodeModal = false">
            关闭
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ExamScannerActivationCodeResponse,
  ExamScannerDeviceActivationHandoffResponse,
  ExamScannerDeviceCreateRequest,
  ExamScannerDeviceDetailResponse,
  ExamScannerDeviceQueryRequest,
  ExamScannerDeviceResponse,
  ExamScannerDeviceSummaryResponse,
  ExamScannerDeviceUpdateRequest,
  ScannerAgentDiagnosticStatusCode,
  ScannerEndpointOnlineStatusCode,
} from '@/apis/mark/exam-mark-scanner'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import AQrcode from 'ant-design-vue/es/qrcode'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  createScannerActivationCode,
  createScannerDevice,
  deleteScannerDevice,
  getScannerDeviceDetail,
  listScannerDeviceLocations,
  pageScannerDevices,
  resetScannerDevicePushToken,
  SCANNER_DEVICE_STATUS_OPTIONS,
  SCANNER_DEVICE_STATUS_TONE,
  SCANNER_ENDPOINT_ONLINE_STATUS_TONE,
  ScannerActivationCodeStatusCode,
  ScannerDeviceStatusCode,
  ScannerDeviceStatusDescription,
  ScannerEndpointOnlineStatusDescription,
  summarizeScannerDevices,
  unbindScannerDeviceAgent,
  updateScannerDevice,
} from '@/apis/mark/exam-mark-scanner'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PrinterManagement' })

const authStore = useAuthStore()
const userStore = useUserStore()
/** 对齐 BE requireTeacherMarkOpsPermission：SCH_TECH / 企业管理员；平台超管不可运维租户设备 */
const canManageScannerDeviceWrites = computed(
  () =>
    authStore.userRole === RoleEnum.SCH_TECH
    || userStore.isEnterpriseTenantAdmin === true,
)

const { refreshSnapshot } = useWorkspaceExamId()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('扫描设备')

/** 扫描设备写操作后刷新列表，并同步工作台 SCAN 段快照与 OCR 配置页。 */
async function syncAfterDeviceMutation(): Promise<void> {
  await Promise.all([loadLocationOptions(), loadDevices()])
  try {
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '扫描设备写入已完成，但阶段快照同步失败')
  }
  mittBus.emit('scan-workbench:refresh')
  if (showDetailModal.value && detailDeviceId.value) {
    await reloadDeviceDetail()
  }
}

// ─── 列表与筛选 ───────────────────────────────────────
const loading = ref(false)
const devices = ref<ExamScannerDeviceResponse[]>([])
const deviceSummary = ref<ExamScannerDeviceSummaryResponse | null>(null)
type DeviceFilterState = Pick<
  ExamScannerDeviceQueryRequest,
  'status' | 'scannerDeviceIdKeyword' | 'location' | 'interfaceMode'
>
const searchForm = reactive<DeviceFilterState>({})
const appliedSearchForm = reactive<DeviceFilterState>({})
const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})
const listLoaded = ref(false)
const listLoadFailed = ref(false)
const summaryLoadFailed = ref(false)
const locationLoadFailed = ref(false)
let deviceRequestGeneration = 0
let locationRequestGeneration = 0

const deviceContextSubtitle = computed(() => {
  if (loading.value && listLoaded.value !== true) return '设备加载中'
  if (listLoadFailed.value) return '列表数据不可用'
  if (listLoaded.value !== true) return '设备尚未加载'
  return `${pagination.total} 台`
})

const deviceDataIssueDescription = computed(() => {
  const issues: string[] = []
  if (listLoadFailed.value) issues.push('设备列表不可用')
  if (summaryLoadFailed.value) issues.push('在线与激活汇总不可用')
  if (locationLoadFailed.value) issues.push('物理位置选项不可用')
  return issues.length > 0
    ? `${issues.join('；')}。请切换筛选或离开页面后重新进入。`
    : ''
})

const appliedFilterActive = computed(() =>
  Object.values(appliedSearchForm).some((value) => value != null && value !== ''),
)

const deviceSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'total',
    label: '设备总数',
    value: deviceSummary.value?.totalCount ?? (listLoaded.value ? pagination.total : '—'),
    unit: '台',
    tone: deviceSummary.value || listLoaded.value ? 'blue' : 'gray',
  },
  {
    key: 'online',
    label: '在线',
    value: deviceSummary.value?.onlineCount ?? '—',
    unit: '台',
    tone: deviceSummary.value ? 'green' : 'gray',
  },
  {
    key: 'activated',
    label: '已激活扫描客户端',
    value: deviceSummary.value?.agentActivatedCount ?? '—',
    unit: '台',
    tone: deviceSummary.value ? 'green' : 'gray',
  },
])

const locationOptions = ref<Array<{ label: string, value: string }>>([])

/** 用 FilterBar 当前完整模型替换筛选编辑值，确保重置不会残留旧字段。 */
function syncSearchForm(next: Record<string, unknown>): void {
  for (const key of Object.keys(searchForm) as Array<keyof DeviceFilterState>) {
    delete searchForm[key]
  }
  Object.assign(searchForm, next)
}
const showActivationCodeModal = ref(false)
const activationCodeInfo = ref<ExamScannerActivationCodeResponse | null>(null)
const activationCodeDeviceName = ref('')
const activationCodeLoading = ref(false)
const activationCodeLoadFailed = ref(false)
let activationCodeRequestGeneration = 0

const deviceFilterFields = computed<FilterField[]>(() => [
  {
    key: 'scannerDeviceIdKeyword',
    type: 'input',
    placeholder: '按扫描设备编号搜索',
    allowClear: true,
    width: 240,
    triggerSearchOnChange: false,
  },
  {
    key: 'location',
    type: 'select',
    placeholder: '物理位置',
    allowClear: true,
    width: 200,
    options: locationOptions.value,
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '设备状态',
    allowClear: true,
    width: 160,
    options: SCANNER_DEVICE_STATUS_OPTIONS.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  },
])

const columns: ColumnsType<ExamScannerDeviceResponse> = [
  {
    title: '设备名称',
    dataIndex: 'deviceName',
    key: 'deviceName',
    width: 160,
    fixed: 'left',
    ellipsis: true,
  },
  { title: '扫描设备编号', dataIndex: 'scannerDeviceId', key: 'scannerDeviceId', width: 160 },
  { title: '站点', dataIndex: 'scannerStationId', key: 'scannerStationId', width: 120 },
  { title: '设备地址', dataIndex: 'scannerIp', key: 'scannerIp', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '扫描组件', dataIndex: 'endpointOnlineStatus', key: 'endpointOnlineStatus', width: 100 },
  { title: '组件版本', dataIndex: 'agentVersion', key: 'agentVersion', width: 120 },
  { title: '最近通讯', dataIndex: 'lastSeenTime', key: 'lastSeenTime', width: 170 },
  { title: '位置', dataIndex: 'location', key: 'location', width: 160, ellipsis: true },
  { title: '主行动', key: 'actions', width: 200 },
]

function buildDeviceActions(record: ExamScannerDeviceResponse): UiTableRowActionItem[] {
  // MVR-316：无运维写权仅保留详情，避免行内假可写
  if (canManageScannerDeviceWrites.value !== true) {
    return [{ key: 'detail', label: '详情', tone: 'primary' }]
  }
  const actions: UiTableRowActionItem[] = [
    { key: 'edit', label: '编辑', tone: 'primary' },
    { key: 'detail', label: '详情' },
    { key: 'rebind', label: '重新绑定', disabled: deviceActionLoading.value },
    { key: 'activation', label: '激活码', disabled: deviceActionLoading.value },
  ]
  if (record.endpointMachineCode) {
    actions.push({
      key: 'unbind',
      label: '解绑扫描组件',
      tone: 'danger',
      disabled: deviceActionLoading.value,
    })
  }
  actions.push({
    key: 'delete',
    label: '删除',
    tone: 'danger',
    disabled: deviceActionLoading.value,
  })
  return actions
}

function handleDeviceAction(key: string, record: ExamScannerDeviceResponse): void {
  switch (key) {
    case 'detail':
      void handleViewDetail(record)
      break
    case 'edit':
      handleEdit(record)
      break
    case 'rebind':
      void handleRebindAgent(record)
      break
    case 'activation':
      void handleCreateActivationCode(record)
      break
    case 'unbind':
      handleUnbindAgent(record)
      break
    case 'delete':
      handleDelete(record)
      break
  }
}

// helper 严格只接受后端枚举类型，零 as 断言。
function statusLabelOf(status: ScannerDeviceStatusCode): string {
  return strictEnumLabel(ScannerDeviceStatusDescription, status, '扫描设备状态')
}
function statusColorOf(status: ScannerDeviceStatusCode): BadgeTone {
  return strictEnumTone(SCANNER_DEVICE_STATUS_TONE, status, '扫描设备状态')
}
function endpointOnlineStatusLabelOf(status: ScannerEndpointOnlineStatusCode): string {
  return strictEnumLabel(ScannerEndpointOnlineStatusDescription, status, '扫描端点在线状态')
}
function endpointOnlineStatusColorOf(status: ScannerEndpointOnlineStatusCode): BadgeTone {
  return strictEnumTone(SCANNER_ENDPOINT_ONLINE_STATUS_TONE, status, '扫描端点在线状态')
}
function endpointOnlineStatusDisplayLabelOf(device: ExamScannerDeviceResponse): string {
  if (device.endpointOnlineStatus) {
    return endpointOnlineStatusLabelOf(device.endpointOnlineStatus)
  }
  return device.endpointMachineCode || device.agentVersion ? '状态不可用' : '未激活'
}
function endpointOnlineStatusDisplayColorOf(device: ExamScannerDeviceResponse): BadgeTone {
  return device.endpointOnlineStatus
    ? endpointOnlineStatusColorOf(device.endpointOnlineStatus)
    : 'gray'
}

/** 读取租户设备位置选项，并拒绝过期请求清空新选项。 */
async function loadLocationOptions(): Promise<void> {
  const requestGeneration = ++locationRequestGeneration
  locationLoadFailed.value = false
  try {
    const options = await listScannerDeviceLocations()
    if (requestGeneration !== locationRequestGeneration) return
    locationOptions.value = options.map((item) => ({
      label: item.location,
      value: item.location,
    }))
  } catch (error) {
    if (requestGeneration !== locationRequestGeneration) return
    locationLoadFailed.value = true
    showUserError(error, '扫描设备位置选项加载失败')
  }
}

/** 按已提交筛选并行读取设备分页与汇总，只允许最后一次查询写回。 */
async function loadDevices(): Promise<void> {
  const requestGeneration = ++deviceRequestGeneration
  loading.value = true
  listLoadFailed.value = false
  summaryLoadFailed.value = false
  const query: ExamScannerDeviceQueryRequest = {
    pageNum: pagination.current,
    pageSize: pagination.pageSize,
    status: appliedSearchForm.status,
    scannerDeviceIdKeyword: appliedSearchForm.scannerDeviceIdKeyword,
    location: appliedSearchForm.location,
    interfaceMode: appliedSearchForm.interfaceMode,
  }
  const [pageResult, summaryResult] = await Promise.allSettled([
    pageScannerDevices(query),
    summarizeScannerDevices({
      status: appliedSearchForm.status,
      scannerDeviceIdKeyword: appliedSearchForm.scannerDeviceIdKeyword,
      location: appliedSearchForm.location,
      interfaceMode: appliedSearchForm.interfaceMode,
    }),
  ])
  if (requestGeneration !== deviceRequestGeneration) return
  if (pageResult.status === 'fulfilled') {
    devices.value = pageResult.value.list
    pagination.total = pageResult.value.total
    pagination.current = pageResult.value.pageNum
    pagination.pageSize = pageResult.value.pageSize
    listLoaded.value = true
  } else {
    devices.value = []
    pagination.total = 0
    listLoaded.value = false
    listLoadFailed.value = true
    showUserError(pageResult.reason, '扫描设备列表加载失败')
  }
  if (summaryResult.status === 'fulfilled') {
    deviceSummary.value = summaryResult.value
  } else {
    deviceSummary.value = null
    summaryLoadFailed.value = true
    showUserError(summaryResult.reason, '扫描设备汇总加载失败')
  }
  loading.value = false
}

/** 提交当前筛选编辑值并从第 1 页查询。 */
function handleSearch(): void {
  for (const key of Object.keys(appliedSearchForm) as Array<keyof DeviceFilterState>) {
    delete appliedSearchForm[key]
  }
  Object.assign(appliedSearchForm, searchForm)
  pagination.current = 1
  void loadDevices()
}

/** 清空筛选编辑值与已提交值并恢复全量设备。 */
function handleResetSearch(): void {
  for (const key of Object.keys(searchForm) as Array<keyof DeviceFilterState>) {
    delete searchForm[key]
  }
  for (const key of Object.keys(appliedSearchForm) as Array<keyof DeviceFilterState>) {
    delete appliedSearchForm[key]
  }
  pagination.current = 1
  void loadDevices()
}

function handleUiPageChange(page: { current: number, pageSize: number }): void {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  void loadDevices()
}

// ─── 新建/编辑弹窗 ────────────────────────────────────
const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formSubmitting = ref(false)
const deviceActionLoading = ref(false)
const formRef = ref<FormInstance | null>(null)
let formGeneration = 0

interface FormState {
  id?: string
  scannerDeviceId: string
  scannerStationId: string
  deviceName: string
  scannerIp?: string
  status: ScannerDeviceStatusCode
  manufacturer?: string
  model?: string
  location?: string
  kioskLockEnabled: boolean
  webSupplementEnabled: boolean
  remark?: string
}

function defaultFormState(): FormState {
  return {
    id: undefined,
    scannerDeviceId: '',
    scannerStationId: '',
    deviceName: '',
    scannerIp: '',
    status: ScannerDeviceStatusCode.ACTIVE,
    manufacturer: '',
    model: '',
    location: '',
    kioskLockEnabled: true,
    webSupplementEnabled: false,
    remark: '',
  }
}

const formData = reactive<FormState>(defaultFormState())

const formRules: Record<string, Rule[]> = {
  scannerDeviceId: [{ required: true, message: '请输入扫描设备编号' }],
  scannerStationId: [{ required: true, message: '请输入扫描站点编号' }],
  deviceName: [{ required: true, message: '请输入设备名称' }],
  status: [{ required: true, message: '请选择设备状态' }],
}

function resetForm(): void {
  Object.assign(formData, defaultFormState())
}

function handleCreate(): void {
  // MVR-316：与 BE requireTeacherMarkOpsPermission 二次拦截
  if (canManageScannerDeviceWrites.value !== true) {
    void message.warning('当前账号无扫描设备运维权限')
    return
  }
  formGeneration += 1
  formMode.value = 'create'
  resetForm()
  showFormModal.value = true
}

function handleEdit(record: ExamScannerDeviceResponse): void {
  // MVR-316：编辑设备与教师运维写闸同源
  if (canManageScannerDeviceWrites.value !== true) {
    void message.warning('当前账号无扫描设备运维权限')
    return
  }
  formGeneration += 1
  formMode.value = 'edit'
  resetForm()
  Object.assign(formData, {
    id: record.id,
    scannerDeviceId: record.scannerDeviceId,
    scannerStationId: record.scannerStationId,
    deviceName: record.deviceName,
    scannerIp: record.scannerIp ?? '',
    status: record.status,
    manufacturer: record.manufacturer ?? '',
    model: record.model ?? '',
    location: record.location ?? '',
    kioskLockEnabled: record.kioskLockEnabled,
    webSupplementEnabled: record.webSupplementEnabled === true,
    remark: record.remark ?? '',
  })
  showFormModal.value = true
}

/** 提交当前表单对象，并拒绝关闭或切换设备后的过期写回改动新表单。 */
async function handleFormSubmit(): Promise<void> {
  // MVR-316：保存设备与 BE requireTeacherMarkOpsPermission 二次拦截
  if (canManageScannerDeviceWrites.value !== true) {
    void message.warning('当前账号无扫描设备运维权限')
    return
  }
  if (formSubmitting.value) {
    return
  }
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (formSubmitting.value) {
    return
  }
  const submitGeneration = formGeneration
  const submitMode = formMode.value
  const submittedDeviceId = formData.id
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      const request: ExamScannerDeviceCreateRequest = {
        scannerDeviceId: formData.scannerDeviceId.trim(),
        scannerStationId: formData.scannerStationId.trim(),
        deviceName: formData.deviceName.trim(),
        scannerIp: emptyToUndefined(formData.scannerIp),
        status: formData.status,
        manufacturer: emptyToUndefined(formData.manufacturer),
        model: emptyToUndefined(formData.model),
        location: emptyToUndefined(formData.location),
        kioskLockEnabled: formData.kioskLockEnabled,
        remark: emptyToUndefined(formData.remark),
      }
      const handoff = await createScannerDevice(request)
      if (
        submitGeneration !== formGeneration
        || submitMode !== formMode.value
        || showFormModal.value !== true
      ) {
        void message.success('上一台扫描设备已创建')
        await syncAfterDeviceMutation()
        return
      }
      void message.success('扫描设备创建成功')
      showFormModal.value = false
      if (handoff.activationCode) {
        openActivationHandoff(handoff)
      } else {
        void message.warning('设备未启用，未生成激活码；启用后可点击「激活码」重新生成')
      }
      await syncAfterDeviceMutation()
    } else {
      const request: ExamScannerDeviceUpdateRequest = {
        id: formData.id!,
        deviceName: formData.deviceName.trim(),
        scannerIp: emptyToUndefined(formData.scannerIp),
        status: formData.status,
        manufacturer: emptyToUndefined(formData.manufacturer),
        model: emptyToUndefined(formData.model),
        location: emptyToUndefined(formData.location),
        kioskLockEnabled: formData.kioskLockEnabled,
        webSupplementEnabled: formData.webSupplementEnabled,
        remark: emptyToUndefined(formData.remark),
      }
      const handoff = await updateScannerDevice(request)
      if (
        submitGeneration !== formGeneration
        || submitMode !== formMode.value
        || submittedDeviceId !== formData.id
        || showFormModal.value !== true
      ) {
        void message.success('上一台扫描设备已更新')
        await syncAfterDeviceMutation()
        return
      }
      void message.success('扫描设备已更新')
      showFormModal.value = false
      if (handoff.activationCode) {
        openActivationHandoff(handoff)
      }
      await syncAfterDeviceMutation()
    }
  } catch (error) {
    const isCurrentForm
      = submitGeneration === formGeneration
        && submitMode === formMode.value
        && (submitMode === 'create' || submittedDeviceId === formData.id)
    showUserError(error, isCurrentForm ? '扫描设备保存失败' : '上一台扫描设备保存失败')
  } finally {
    formSubmitting.value = false
  }
}

function emptyToUndefined(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function openActivationHandoff(handoff: ExamScannerDeviceActivationHandoffResponse): void {
  if (!handoff.activationCode || !handoff.expireTime) {
    throw new Error('扫描设备激活交接合同异常：激活码或有效期缺失')
  }
  activationCodeRequestGeneration += 1
  activationCodeLoading.value = false
  activationCodeLoadFailed.value = false
  activationCodeDeviceName.value = handoff.deviceName || handoff.scannerDeviceId
  activationCodeInfo.value = {
    id: handoff.id,
    scannerDeviceId: handoff.scannerDeviceId,
    scannerStationId: handoff.scannerStationId,
    activationCode: handoff.activationCode,
    status: ScannerActivationCodeStatusCode.UNUSED,
    expireTime: handoff.expireTime,
  }
  showActivationCodeModal.value = true
}

/** 将扫描设备本地诊断转为管理员可处置的维护提示，避免展示接口或驱动调试口径。 */
function scannerDeviceDiagnosticText(
  message?: string,
  status?: ScannerAgentDiagnosticStatusCode,
): string {
  const fallback = status ? `扫描组件状态：${status}` : '暂无扫描组件维护提示'
  return getUserErrorMessage({ message }, fallback)
}

async function handleRebindAgent(record: ExamScannerDeviceResponse): Promise<void> {
  // MVR-316：重新绑定与教师运维写闸同源
  if (canManageScannerDeviceWrites.value !== true) {
    void message.warning('当前账号无扫描设备运维权限')
    return
  }
  void confirmAsync({
    title: '重新绑定',
    content: `将重置服务端接入密钥并生成新激活码。原一体机需使用新激活码重新绑定。设备：${record.deviceName}`,
    type: 'warning',
    onOk: async () => {
      // MVR-938：onOk 再认 canManageScannerDeviceWrites，防确认等待期间运维权漂移
      if (canManageScannerDeviceWrites.value !== true) {
        void message.warning('当前账号无扫描设备运维权限')
        return
      }
      if (deviceActionLoading.value === true) {
        return
      }
      deviceActionLoading.value = true
      try {
        const handoff = await resetScannerDevicePushToken(record.id)
        void message.success('已生成新的绑定激活码')
        openActivationHandoff(handoff)
        await syncAfterDeviceMutation()
      } catch (error) {
        showUserError(error, '重新绑定准备失败')
      } finally {
        deviceActionLoading.value = false
      }
    },
  })
}

async function handleCreateActivationCode(record: ExamScannerDeviceResponse): Promise<void> {
  // MVR-316：激活码与 BE requireTeacherMarkOpsPermission 二次拦截
  if (canManageScannerDeviceWrites.value !== true) {
    void message.warning('当前账号无扫描设备运维权限')
    return
  }
  if (deviceActionLoading.value === true) {
    return
  }
  activationCodeDeviceName.value = record.deviceName || record.scannerDeviceId || '扫描设备'
  activationCodeInfo.value = null
  activationCodeLoadFailed.value = false
  activationCodeLoading.value = true
  showActivationCodeModal.value = true
  const requestGeneration = ++activationCodeRequestGeneration
  deviceActionLoading.value = true
  try {
    const response = await createScannerActivationCode({ deviceId: record.id })
    if (
      response.scannerDeviceId !== record.scannerDeviceId
      || response.scannerStationId !== record.scannerStationId
    ) {
      throw new Error('扫描组件激活码合同异常：返回设备与当前操作对象不一致')
    }
    if (
      requestGeneration !== activationCodeRequestGeneration
      || showActivationCodeModal.value !== true
    ) {
      return
    }
    activationCodeInfo.value = response
  } catch (error) {
    if (requestGeneration !== activationCodeRequestGeneration) return
    activationCodeLoadFailed.value = true
    showUserError(error, '扫描组件激活码生成失败')
  } finally {
    if (requestGeneration === activationCodeRequestGeneration) {
      activationCodeLoading.value = false
    }
    deviceActionLoading.value = false
  }
}

function handleUnbindAgent(record: ExamScannerDeviceResponse): void {
  // MVR-316：解绑与教师运维写闸同源
  if (canManageScannerDeviceWrites.value !== true) {
    void message.warning('当前账号无扫描设备运维权限')
    return
  }
  void confirmAsync({
    title: '解绑扫描组件',
    content: `确定解绑设备"${record.deviceName}"当前扫描组件吗？解绑后原一体机需要重新使用激活码绑定。`,
    type: 'warning',
    onOk: async () => {
      // MVR-932：确认后再次认 canManageScannerDeviceWrites
      if (canManageScannerDeviceWrites.value !== true) {
        void message.warning('当前账号无扫描设备运维权限')
        return
      }
      if (deviceActionLoading.value === true) {
        return
      }
      deviceActionLoading.value = true
      try {
        const handoff = await unbindScannerDeviceAgent(record.id)
        openActivationHandoff(handoff)
        void message.success('扫描组件已解绑，已生成新的激活码')
        await syncAfterDeviceMutation()
      } catch (error) {
        showUserError(error, '扫描组件解绑失败')
      } finally {
        deviceActionLoading.value = false
      }
    },
  })
}

function copyText(value?: string | null): void {
  if (!value) return
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(
      () => void message.success('已复制到剪贴板'),
      () => void message.error('复制失败，请手动选择文本'),
    )
    return
  }
  void message.warning('当前浏览器不支持剪贴板接口，请手动复制')
}

// ─── 详情弹窗 ────────────────────────────────────────
const showDetailModal = ref(false)
const detailInfo = ref<ExamScannerDeviceDetailResponse | null>(null)
const detailDeviceId = ref<string | null>(null)
const detailLoading = ref(false)
const detailLoadFailed = ref(false)
let detailRequestGeneration = 0

/** 读取当前详情设备并拒绝关闭或切换设备后的过期响应。 */
async function reloadDeviceDetail(): Promise<void> {
  const deviceId = detailDeviceId.value
  if (!deviceId) return
  const requestGeneration = ++detailRequestGeneration
  detailLoading.value = true
  detailLoadFailed.value = false
  try {
    const response = await getScannerDeviceDetail(deviceId)
    if (
      requestGeneration !== detailRequestGeneration
      || detailDeviceId.value !== deviceId
      || showDetailModal.value !== true
    ) {
      return
    }
    detailInfo.value = response
  } catch (error) {
    if (
      requestGeneration !== detailRequestGeneration
      || detailDeviceId.value !== deviceId
      || showDetailModal.value !== true
    ) {
      return
    }
    detailInfo.value = null
    detailLoadFailed.value = true
    showUserError(error, '扫描设备详情加载失败')
  } finally {
    if (requestGeneration === detailRequestGeneration) {
      detailLoading.value = false
    }
  }
}

/** 打开指定设备详情并重置上一对象的加载状态。 */
async function handleViewDetail(record: ExamScannerDeviceResponse): Promise<void> {
  detailInfo.value = null
  detailDeviceId.value = record.id
  showDetailModal.value = true
  await reloadDeviceDetail()
}

// ─── 删除 ────────────────────────────────────────────
function handleDelete(record: ExamScannerDeviceResponse): void {
  // MVR-316：删除与教师运维写闸同源
  if (canManageScannerDeviceWrites.value !== true) {
    void message.warning('当前账号无扫描设备运维权限')
    return
  }
  void confirmAsync({
    title: '删除扫描设备',
    content: `确定删除设备"${record.deviceName}"吗？历史扫描事件保持引用，仅当前设备记录被逻辑删除。`,
    type: 'error',
    onOk: async () => {
      // MVR-932：确认后再次认 canManageScannerDeviceWrites
      if (canManageScannerDeviceWrites.value !== true) {
        void message.warning('当前账号无扫描设备运维权限')
        return
      }
      if (deviceActionLoading.value === true) {
        return
      }
      deviceActionLoading.value = true
      try {
        await deleteScannerDevice(record.id)
        void message.success('扫描设备已删除')
        await syncAfterDeviceMutation()
      } catch (error) {
        showUserError(error, '扫描设备删除失败')
      } finally {
        deviceActionLoading.value = false
      }
    },
  })
}

async function reloadDeviceWorkbench(): Promise<void> {
  await Promise.all([loadLocationOptions(), loadDevices()])
}

watch(showDetailModal, (open) => {
  if (open) return
  detailRequestGeneration += 1
  detailDeviceId.value = null
  detailInfo.value = null
  detailLoading.value = false
  detailLoadFailed.value = false
})

watch(showFormModal, (open) => {
  if (open) return
  formGeneration += 1
})

watch(showActivationCodeModal, (open) => {
  if (open) return
  activationCodeRequestGeneration += 1
  activationCodeInfo.value = null
  activationCodeDeviceName.value = ''
  activationCodeLoading.value = false
  activationCodeLoadFailed.value = false
})

onMounted(() => {
  void reloadDeviceWorkbench()
  mittBus.on('scan-workbench:refresh', reloadDeviceWorkbench)
})

onBeforeUnmount(() => {
  deviceRequestGeneration += 1
  locationRequestGeneration += 1
  detailRequestGeneration += 1
  activationCodeRequestGeneration += 1
  mittBus.off('scan-workbench:refresh', reloadDeviceWorkbench)
})
</script>

<style scoped lang="scss">
.printer-management-page {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);

  &__filter {
    margin-bottom: var(--dp-space-component-tight);
  }
}

.printer-management {
  &__workspace {
    padding: 0;
  }
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--dp-space-component);

  .toolbar-actions {
    display: flex;
    gap: var(--dp-space-component-tight);
  }
}

.token-row {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  flex-wrap: wrap;
}

.token-text {
  word-break: break-all;
  font-family: inherit;
}

.activation-code-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dp-space-component);

  &__hint {
    width: 100%;
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-sm);
    line-height: 1.5;
    text-align: left;
  }

  &__device {
    color: var(--dp-text-secondary);
    font-weight: 600;
  }

  &__code {
    padding: var(--dp-space-component) var(--dp-space-block);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-gray-50);
    color: var(--dp-gray-900);
    font-size: var(--dp-font-size-2xl);
    font-weight: 600;
    letter-spacing: 0;
    word-break: break-all;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
    width: 100%;
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-sm);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
    justify-content: center;
  }
}
</style>
