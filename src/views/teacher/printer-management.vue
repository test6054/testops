<template>
  <StageWorkbenchShell class="printer-management-page">
    <template #context>
      <ContextBar layout="workbench" show-title title="扫描设备">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" variant="primary" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            新增设备
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand compact variant="panel" :metrics="deviceSignalMetrics" />
    </template>

    <ExamWorkspaceJourneySubNav />

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
        row-key="id"
        size="middle"
        flat
        :total="pagination.total"
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
            <span v-else class="text-muted">未激活</span>
          </template>
          <template v-else-if="column.key === 'lastSeenTime'">
            <span v-if="devices[index].lastSeenTime">{{ devices[index].lastSeenTime }}</span>
            <span v-else class="text-muted">从未通讯</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
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
      :confirm-loading="formSubmitting"
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
          <UiCol :span="12">
            <UiFormItem name="scannerDeviceId" label="扫描设备编号">
              <UiInput
                size="sm"
                v-model="formData.scannerDeviceId"
                placeholder="租户内唯一，例如厂商型号-编号"
                :disabled="formMode === 'edit'"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
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
          <UiCol :span="12">
            <UiFormItem name="deviceName" label="设备名称">
              <UiInput
                size="sm" v-model="formData.deviceName" placeholder="教师可读的设备名"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem name="status" label="设备状态">
              <UiSelect
                size="sm" v-model="formData.status" :options="SCANNER_DEVICE_STATUS_OPTIONS"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
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
          <UiCol :span="12">
            <UiFormItem name="kioskLockEnabled" label="Kiosk 防误触锁">
              <UiSwitch
                size="sm"
                v-model="formData.kioskLockEnabled"
                checked-children="启用"
                un-checked-children="关闭"
              />
            </UiFormItem>
          </UiCol>
          <UiCol v-if="formMode === 'edit'" :span="12">
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
          <UiCol :span="12">
            <UiFormItem name="manufacturer" label="厂商">
              <UiInput
                size="sm"
                v-model="formData.manufacturer"
                placeholder="如 EPSON / Canon / 富士通"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem name="model" label="型号">
              <UiInput
                size="sm" v-model="formData.model" placeholder="设备型号"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="16">
          <UiCol :span="12">
            <UiFormItem name="location" label="物理位置">
              <UiInput
                size="sm" v-model="formData.location" placeholder="如 教学楼A栋 301 教研室"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem name="remark" label="备注">
              <UiInput
                size="sm" v-model="formData.remark" placeholder="维护备注"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
    </UiDialog>

    <!-- 设备详情弹窗 -->
    <UiDialog v-model:open="showDetailModal" title="扫描设备详情" :width="720" hide-footer>
      <UiDescriptions v-if="detailInfo" bordered :column="2" size="small">
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
          <UiTag :tone="!detailInfo.kioskLockEnabled ? 'orange' : 'green'">
            {{ detailInfo.kioskLockEnabled === false ? '已关闭' : '已启用' }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="Web 补录工位">
          <UiTag :tone="detailInfo.webSupplementEnabled ? 'blue' : 'gray'">
            {{ detailInfo.webSupplementEnabled ? '已启用' : '未启用' }}
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
      <div v-if="activationCodeInfo" class="activation-code-modal">
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
          <UiButton size="sm" @click="copyText(activationCodeInfo.activationCode)"> 复制激活码 </UiButton>
          <UiButton size="sm" variant="outline" @click="showActivationCodeModal = false">关闭</UiButton>
        </div>
      </div>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
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
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PrinterManagement' })

const { refreshSnapshot } = useWorkspaceExamId()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('扫描设备')

/** 扫描设备写操作后刷新列表，并同步工作台 SCAN 段快照与 OCR 配置页。 */
async function syncAfterDeviceMutation(): Promise<void> {
  await Promise.all([loadLocationOptions(), loadDevices()])
  await refreshSnapshot()
  mittBus.emit('scan-workbench:refresh')
  if (showDetailModal.value && detailDeviceId.value) {
    await reloadDeviceDetail()
  }
}

// ─── 列表与筛选 ───────────────────────────────────────
const loading = ref(false)
const devices = ref<ExamScannerDeviceResponse[]>([])
const deviceSummary = ref<ExamScannerDeviceSummaryResponse | null>(null)
const searchForm = reactive<
  Pick<
    ExamScannerDeviceQueryRequest,
    'status' | 'scannerDeviceIdKeyword' | 'location' | 'interfaceMode'
  >
>({})
const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const deviceSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'total',
    label: '设备总数',
    value: deviceSummary.value?.totalCount ?? pagination.total,
    unit: '台',
    tone: 'blue',
  },
  {
    key: 'online',
    label: '在线',
    value: deviceSummary.value?.onlineCount ?? 0,
    unit: '台',
    tone: 'green',
  },
  {
    key: 'activated',
    label: '已激活扫描客户端',
    value: deviceSummary.value?.agentActivatedCount ?? 0,
    unit: '台',
    tone: 'green',
  },
])

const locationOptions = ref<Array<{ label: string, value: string }>>([])

function syncSearchForm(next: Record<string, unknown>): void {
  Object.assign(searchForm, next)
}
const showActivationCodeModal = ref(false)
const activationCodeInfo = ref<ExamScannerActivationCodeResponse | null>(null)
const activationCodeDeviceName = ref('')

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
    options: SCANNER_DEVICE_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
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
  { title: '操作', key: 'actions', width: 200 },
]

function buildDeviceActions(record: ExamScannerDeviceResponse): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    { key: 'detail', label: '详情' },
    { key: 'edit', label: '编辑' },
    { key: 'rebind', label: '重新绑定' },
    { key: 'activation', label: '激活码' },
  ]
  if (record.endpointMachineCode) {
    actions.push({ key: 'unbind', label: '解绑扫描组件', tone: 'danger' })
  }
  actions.push({ key: 'delete', label: '删除', tone: 'danger' })
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
  return device.endpointOnlineStatus
    ? endpointOnlineStatusLabelOf(device.endpointOnlineStatus)
    : '未激活'
}
function endpointOnlineStatusDisplayColorOf(device: ExamScannerDeviceResponse): BadgeTone {
  return device.endpointOnlineStatus
    ? endpointOnlineStatusColorOf(device.endpointOnlineStatus)
    : 'gray'
}

async function loadLocationOptions(): Promise<void> {
  try {
    const options = await listScannerDeviceLocations()
    locationOptions.value = options.map((item) => ({
      label: item.location,
      value: item.location,
    }))
  } catch (error) {
    locationOptions.value = []
    showUserError(error, '扫描设备位置选项加载失败')
  }
}

async function loadDevices(): Promise<void> {
  loading.value = true
  try {
    const query: ExamScannerDeviceQueryRequest = {
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      status: searchForm.status,
      scannerDeviceIdKeyword: searchForm.scannerDeviceIdKeyword,
      location: searchForm.location,
      interfaceMode: searchForm.interfaceMode,
    }
    const result = await pageScannerDevices(query)
    devices.value = result.list
    pagination.total = result.total
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
    try {
      deviceSummary.value = await summarizeScannerDevices({
        status: searchForm.status,
        scannerDeviceIdKeyword: searchForm.scannerDeviceIdKeyword,
        location: searchForm.location,
        interfaceMode: searchForm.interfaceMode,
      })
    } catch (error) {
      deviceSummary.value = null
      showUserError(error, '扫描设备汇总加载失败')
    }
  } catch (error) {
    devices.value = []
    deviceSummary.value = null
    pagination.total = 0
    showUserError(error, '扫描设备列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.current = 1
  void loadDevices()
}

function handleResetSearch(): void {
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
    scannerDeviceId: '',
    scannerStationId: '',
    deviceName: '',
    scannerIp: '',
    status: ScannerDeviceStatusCode.ACTIVE,
    kioskLockEnabled: true,
    webSupplementEnabled: false,
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
  formMode.value = 'create'
  resetForm()
  showFormModal.value = true
}

function handleEdit(record: ExamScannerDeviceResponse): void {
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

async function handleFormSubmit(): Promise<void> {
  if (formSubmitting.value) {
    return
  }
  await formRef.value?.validate()
  if (formSubmitting.value) {
    return
  }
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
      message.success('扫描设备创建成功')
      showFormModal.value = false
      if (handoff.activationCode) {
        openActivationHandoff(handoff)
      } else {
        message.warning('设备未启用，未生成激活码；启用后可点击「激活码」重新生成')
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
      message.success('扫描设备已更新')
      showFormModal.value = false
      if (handoff.activationCode) {
        openActivationHandoff(handoff)
      }
      await syncAfterDeviceMutation()
    }
  } catch (error) {
    showUserError(error, '扫描设备保存失败')
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
    return
  }
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
  void confirmAsync({
    title: '重新绑定',
    content: `将重置服务端接入密钥并生成新激活码。原一体机需使用新激活码重新绑定。设备：${record.deviceName}`,
    type: 'warning',
    onOk: async () => {
      if (deviceActionLoading.value) {
        return
      }
      deviceActionLoading.value = true
      try {
        const handoff = await resetScannerDevicePushToken(record.id)
        message.success('已生成新的绑定激活码')
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
  if (deviceActionLoading.value) {
    return
  }
  activationCodeDeviceName.value = record.deviceName || record.scannerDeviceId || '扫描设备'
  activationCodeInfo.value = null
  showActivationCodeModal.value = true
  deviceActionLoading.value = true
  try {
    activationCodeInfo.value = await createScannerActivationCode({ deviceId: record.id })
  } catch (error) {
    showUserError(error, '扫描组件激活码生成失败')
  } finally {
    deviceActionLoading.value = false
  }
}

function handleUnbindAgent(record: ExamScannerDeviceResponse): void {
  void confirmAsync({
    title: '解绑扫描组件',
    content: `确定解绑设备"${record.deviceName}"当前扫描组件吗？解绑后原一体机需要重新使用激活码绑定。`,
    type: 'warning',
    onOk: async () => {
      if (deviceActionLoading.value) {
        return
      }
      deviceActionLoading.value = true
      try {
        await unbindScannerDeviceAgent(record.id)
        message.success('扫描组件已解绑')
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
      () => message.success('已复制到剪贴板'),
      () => message.error('复制失败，请手动选择文本'),
    )
    return
  }
  message.warning('当前浏览器不支持剪贴板接口，请手动复制')
}

// ─── 详情弹窗 ────────────────────────────────────────
const showDetailModal = ref(false)
const detailInfo = ref<ExamScannerDeviceDetailResponse | null>(null)
const detailDeviceId = ref<string | null>(null)

async function reloadDeviceDetail(): Promise<void> {
  if (!detailDeviceId.value) return
  try {
    detailInfo.value = await getScannerDeviceDetail(detailDeviceId.value)
  } catch (error) {
    detailInfo.value = null
    showUserError(error, '扫描设备详情加载失败')
  }
}

async function handleViewDetail(record: ExamScannerDeviceResponse): Promise<void> {
  detailInfo.value = null
  detailDeviceId.value = record.id
  showDetailModal.value = true
  await reloadDeviceDetail()
}

// ─── 删除 ────────────────────────────────────────────
function handleDelete(record: ExamScannerDeviceResponse): void {
  void confirmAsync({
    title: '删除扫描设备',
    content: `确定删除设备"${record.deviceName}"吗？历史扫描事件保持引用，仅当前设备记录被逻辑删除。`,
    type: 'error',
    onOk: async () => {
      if (deviceActionLoading.value) {
        return
      }
      deviceActionLoading.value = true
      try {
        await deleteScannerDevice(record.id)
        message.success('扫描设备已删除')
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

onMounted(() => {
  void reloadDeviceWorkbench()
  mittBus.on('scan-workbench:refresh', reloadDeviceWorkbench)
})

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', reloadDeviceWorkbench)
})
</script>

<style scoped lang="scss">
.printer-management-page {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);

  &__filter {
    margin-bottom: var(--dp-space-2);
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
  gap: 8px;
  margin-bottom: 16px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .toolbar-actions {
    display: flex;
    gap: 8px;
  }
}

.text-muted {
  color: var(--dp-gray-400);
}

.token-row {
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: var(--dp-space-3, 12px);

  &__hint {
    width: 100%;
    color: var(--dp-text-muted);
    font-size: 13px;
    line-height: 1.5;
    text-align: left;
  }

  &__device {
    color: var(--dp-text-secondary);
    font-weight: 600;
  }

  &__code {
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--dp-gray-50);
    color: var(--dp-gray-900);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.08em;
    word-break: break-all;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    color: var(--dp-text-muted);
    font-size: 13px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
}
</style>
