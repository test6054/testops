<template>
  <div class="printer-management-page">
    <a-card :bordered="false" class="detail-table-card printer-management">
      <template #title>扫描设备</template>
      <template #extra>
        <a-space>
          <UiTag tone="blue">共 {{ pagination.total }} 台设备</UiTag>
          <UiButton size="sm" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            新增设备
          </UiButton>
        </a-space>
      </template>

      <UiFilterBar
        :model-value="searchForm"
        :fields="deviceFilterFields"
        search-text="查询"
        @update:model-value="syncSearchForm"
        @search="handleSearch"
        @reset="handleResetSearch"
      />



      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        class="student-detail-table__data-table"
        :columns="columns"
        :data-source="devices"
        :loading="loading"
        row-key="id"
        size="middle"
        flat
        :total="pagination.total"
        bordered
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
          <template v-else-if="column.key === 'action'">
            <div class="operations-cell operations-cell--split" @click.stop>
              <button type="button" class="op-link" @click="handleViewDetail(devices[index])">详情</button>
              <span class="operations-cell__sep" aria-hidden="true" />
              <button type="button" class="op-link" @click="handleEdit(devices[index])">编辑</button>
              <span class="operations-cell__sep" aria-hidden="true" />
              <a-dropdown trigger="click">
                <button type="button" class="op-link" @click.stop.prevent>更多</button>
                <template #overlay>
                  <a-menu @click="(event) => handleDeviceMenuClick(devices[index], event)">
                    <a-menu-item
                      v-for="item in buildDeviceMenuItems(devices[index])"
                      :key="item.key"
                      :danger="item.danger"
                    >
                      {{ item.label }}
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>
        </template>
      </UiDataTable>
    </a-card>

    <!-- 新增/编辑设备弹窗 -->
    <a-modal
      v-model:open="showFormModal"
      :title="formMode === 'create' ? '新增扫描设备' : '编辑扫描设备'"
      width="720px"
      :confirm-loading="formSubmitting"
      destroy-on-close
      @ok="handleFormSubmit"
      @cancel="showFormModal = false"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :label-col="{ span: 7 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="scannerDeviceId" label="扫描设备编号">
              <a-input
                v-model:value="formData.scannerDeviceId"
                placeholder="租户内唯一，例如厂商型号-编号"
                :disabled="formMode === 'edit'"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="scannerStationId" label="扫描站点编号">
              <a-input
                v-model:value="formData.scannerStationId"
                placeholder="同一物理位置可有多台设备"
                :disabled="formMode === 'edit'"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="deviceName" label="设备名称">
              <a-input v-model:value="formData.deviceName" placeholder="教师可读的设备名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="status" label="设备状态">
              <a-select v-model:value="formData.status" :options="statusOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="scannerIp" label="设备地址">
              <a-input
                v-model:value="formData.scannerIp"
                placeholder="可选，一体机 Agent 心跳会自动刷新"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="kioskLockEnabled" label="Kiosk 防误触锁">
              <a-switch
                v-model:checked="formData.kioskLockEnabled"
                checked-children="启用"
                un-checked-children="关闭"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">运维信息（可选）</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="manufacturer" label="厂商">
              <a-input
                v-model:value="formData.manufacturer"
                placeholder="如 EPSON / Canon / 富士通"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="model" label="型号">
              <a-input v-model:value="formData.model" placeholder="设备型号" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item name="location" label="物理位置">
              <a-input v-model:value="formData.location" placeholder="如 教学楼A栋 301 教研室" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="remark" label="备注">
              <a-input v-model:value="formData.remark" placeholder="维护备注" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 设备详情弹窗 -->
    <a-modal
      v-model:open="showDetailModal"
      title="扫描设备详情"
      width="720px"
      :footer="null"
      destroy-on-close
    >
      <a-descriptions v-if="detailInfo" bordered :column="2" size="small">
        <a-descriptions-item label="设备名称">{{ detailInfo.deviceName }}</a-descriptions-item>
        <a-descriptions-item label="扫描设备编号">
          {{ detailInfo.scannerDeviceId }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描站点编号">
          {{ detailInfo.scannerStationId }}
        </a-descriptions-item>
        <a-descriptions-item label="设备状态">
          <UiTag :tone="statusColorOf(detailInfo.status)">
            {{ statusLabelOf(detailInfo.status) }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="设备地址">
          {{ detailInfo.scannerIp || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="Kiosk 防误触锁">
          <UiTag :tone="!detailInfo.kioskLockEnabled ? 'orange' : 'green'">
            {{ detailInfo.kioskLockEnabled === false ? '已关闭' : '已启用' }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="扫描组件在线状态">
          <UiTag :tone="endpointOnlineStatusDisplayColorOf(detailInfo)">
            {{ endpointOnlineStatusDisplayLabelOf(detailInfo) }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="扫描组件版本">
          {{ detailInfo.agentVersion || '未激活' }}
        </a-descriptions-item>
        <a-descriptions-item label="客户端版本">
          {{ detailInfo.clientVersion || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="端点名称">
          {{ detailInfo.endpointName || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描仪连接">
          {{ detailInfo.scannerConnected === true ? '已连接' : '未连接或未上报' }}
        </a-descriptions-item>
        <a-descriptions-item label="本地队列">
          任务 {{ detailInfo.pendingJobCount ?? '未上报' }} / 待上传页
          {{ detailInfo.pendingUploadPageCount ?? '未上报' }}
        </a-descriptions-item>
        <a-descriptions-item label="最近心跳">
          {{ detailInfo.lastHeartbeatTime || '从未心跳' }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描组件维护说明">
          {{
            scannerDeviceDiagnosticText(detailInfo.diagnosticMessage, detailInfo.diagnosticStatus)
          }}
        </a-descriptions-item>
        <a-descriptions-item label="厂商">{{ detailInfo.manufacturer || '—' }}</a-descriptions-item>
        <a-descriptions-item label="型号">{{ detailInfo.model || '—' }}</a-descriptions-item>
        <a-descriptions-item label="物理位置" :span="2">
          {{ detailInfo.location || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="最近通讯时间">
          {{ detailInfo.lastSeenTime || '从未通讯' }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ detailInfo.createTime || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">
          {{ detailInfo.remark || '—' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <a-modal
      v-model:open="showActivationCodeModal"
      title="一体机激活码"
      width="520px"
      :footer="null"
      destroy-on-close
    >
      <div v-if="activationCodeInfo" class="activation-code-modal">
        <p class="activation-code-modal__hint">
          请在一体机 Kiosk 页面输入 8 位数字激活码与端点名称完成绑定。激活码一次性有效，过期后需重新生成。
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
        <a-space>
          <a-button type="primary" @click="copyText(activationCodeInfo.activationCode)">
            复制激活码
          </a-button>
          <a-button @click="showActivationCodeModal = false"> 关闭 </a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ExamScannerActivationCodeVO,
  ExamScannerDeviceActivationHandoffVO,
  ExamScannerDeviceCreateRequest,
  ExamScannerDeviceDetailVO,
  ExamScannerDeviceQueryRequest,
  ExamScannerDeviceUpdateRequest,
  ExamScannerDeviceVO,
  ScannerAgentDiagnosticStatusCode,
  ScannerDeviceStatusCode,
  ScannerEndpointOnlineStatusCode,
} from '@/apis/mark/exam-mark-scanner'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
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
  SCANNER_DEVICE_STATUS_COLOR,
  SCANNER_DEVICE_STATUS_LABEL,
  SCANNER_ENDPOINT_ONLINE_STATUS_COLOR,
  SCANNER_ENDPOINT_ONLINE_STATUS_LABEL,
  unbindScannerDeviceAgent,
  updateScannerDevice,
} from '@/apis/mark/exam-mark-scanner'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import mittBus from '@/utils/mitt'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PrinterManagement' })

const { refreshSnapshot } = useWorkspaceExamId()

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
const devices = ref<ExamScannerDeviceVO[]>([])
const searchForm = reactive<Pick<ExamScannerDeviceQueryRequest, 'status' | 'scannerDeviceIdKeyword' | 'location' | 'interfaceMode'>>({})
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})
const locationOptions = ref<Array<{ label: string, value: string }>>([])

function syncSearchForm(next: Record<string, unknown>): void {
  Object.assign(searchForm, next)
}
const showActivationCodeModal = ref(false)
const activationCodeInfo = ref<ExamScannerActivationCodeVO | null>(null)
const activationCodeDeviceName = ref('')
const activationCodeError = ref<Error | null>(null)

const statusOptions = [
  { value: 'ACTIVE', label: SCANNER_DEVICE_STATUS_LABEL.ACTIVE },
  { value: 'INACTIVE', label: SCANNER_DEVICE_STATUS_LABEL.INACTIVE },
  { value: 'DISABLED', label: SCANNER_DEVICE_STATUS_LABEL.DISABLED },
]

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
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
])

const columns = [
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', width: 160 },
  { title: '扫描设备编号', dataIndex: 'scannerDeviceId', key: 'scannerDeviceId', width: 160 },
  { title: '站点', dataIndex: 'scannerStationId', key: 'scannerStationId', width: 120 },
  { title: '设备地址', dataIndex: 'scannerIp', key: 'scannerIp', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '扫描组件', dataIndex: 'endpointOnlineStatus', key: 'endpointOnlineStatus', width: 100 },
  { title: '组件版本', dataIndex: 'agentVersion', key: 'agentVersion', width: 120 },
  { title: '最近通讯', dataIndex: 'lastSeenTime', key: 'lastSeenTime', width: 170 },
  { title: '位置', dataIndex: 'location', key: 'location', width: 160, ellipsis: true },
  { title: '操作', dataIndex: 'action', key: 'action', width: 200, fixed: 'right' as const },
]

interface DeviceMenuItem {
  key: 'rebind' | 'activation' | 'unbind' | 'delete'
  label: string
  danger?: boolean
}

/** 扫描设备行内次要操作：收进「更多」下拉，避免操作列横向积压换行。 */
function buildDeviceMenuItems(record: ExamScannerDeviceVO): DeviceMenuItem[] {
  const items: DeviceMenuItem[] = [
    { key: 'rebind', label: '重新绑定' },
    { key: 'activation', label: '激活码' },
  ]
  if (record.endpointMachineCode) {
    items.push({ key: 'unbind', label: '解绑扫描组件', danger: true })
  }
  items.push({ key: 'delete', label: '删除', danger: true })
  return items
}

function handleDeviceMenuClick(record: ExamScannerDeviceVO, event: { key: string | number }): void {
  if (typeof event.key !== 'string') {
    return
  }
  const matchedItem = buildDeviceMenuItems(record).find((item) => item.key === event.key)
  if (!matchedItem) {
    return
  }
  if (matchedItem.key === 'rebind') {
    void handleRebindAgent(record)
    return
  }
  if (matchedItem.key === 'activation') {
    void handleCreateActivationCode(record)
    return
  }
  if (matchedItem.key === 'unbind') {
    handleUnbindAgent(record)
    return
  }
  handleDelete(record)
}

// helper 严格只接受后端枚举类型，零 as 断言。
function statusLabelOf(status: ScannerDeviceStatusCode): string {
  return strictEnumLabel(SCANNER_DEVICE_STATUS_LABEL, status, '扫描设备状态')
}
function statusColorOf(status: ScannerDeviceStatusCode): BadgeTone {
  return strictEnumTone(SCANNER_DEVICE_STATUS_COLOR, status, '扫描设备状态')
}
function endpointOnlineStatusLabelOf(status: ScannerEndpointOnlineStatusCode): string {
  return strictEnumLabel(SCANNER_ENDPOINT_ONLINE_STATUS_LABEL, status, '扫描端点在线状态')
}
function endpointOnlineStatusColorOf(status: ScannerEndpointOnlineStatusCode): BadgeTone {
  return strictEnumTone(SCANNER_ENDPOINT_ONLINE_STATUS_COLOR, status, '扫描端点在线状态')
}
function endpointOnlineStatusDisplayLabelOf(device: ExamScannerDeviceVO): string {
  return device.endpointOnlineStatus
    ? endpointOnlineStatusLabelOf(device.endpointOnlineStatus)
    : '未激活'
}
function endpointOnlineStatusDisplayColorOf(device: ExamScannerDeviceVO): BadgeTone {
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
  agentUnbindError.value = null
  deviceDeleteError.value = null
  try {
    const result = await pageScannerDevices({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      status: searchForm.status,
      scannerDeviceIdKeyword: searchForm.scannerDeviceIdKeyword,
      location: searchForm.location,
      interfaceMode: searchForm.interfaceMode,
    })
    devices.value = readPageList(result, '扫描设备列表加载失败')
    pagination.total = readPageTotal(result)
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
  } catch (error) {
    devices.value = []
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
const formSubmitError = ref<Error | null>(null)
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
  remark?: string
}

function defaultFormState(): FormState {
  return {
    scannerDeviceId: '',
    scannerStationId: '',
    deviceName: '',
    scannerIp: '',
    status: 'ACTIVE',
    kioskLockEnabled: true,
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
  formSubmitError.value = null
  resetForm()
  showFormModal.value = true
}

function handleEdit(record: ExamScannerDeviceVO): void {
  formMode.value = 'edit'
  formSubmitError.value = null
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
    remark: record.remark ?? '',
  })
  showFormModal.value = true
}

async function handleFormSubmit(): Promise<void> {
  await formRef.value?.validate()
  formSubmitError.value = null
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
    formSubmitError.value = toUserError(error, '扫描设备保存失败')
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

function openActivationHandoff(handoff: ExamScannerDeviceActivationHandoffVO): void {
  if (!handoff.activationCode || !handoff.expireTime) {
    return
  }
  activationCodeDeviceName.value = handoff.deviceName || handoff.scannerDeviceId
  activationCodeInfo.value = {
    id: handoff.id,
    scannerDeviceId: handoff.scannerDeviceId,
    scannerStationId: handoff.scannerStationId,
    activationCode: handoff.activationCode,
    status: 'UNUSED',
    expireTime: handoff.expireTime,
  }
  activationCodeError.value = null
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

async function handleRebindAgent(record: ExamScannerDeviceVO): Promise<void> {
  void confirmAsync({
    title: '重新绑定',
    content: `将重置服务端接入密钥并生成新激活码。原一体机需使用新激活码重新绑定。设备：${record.deviceName}`,
    type: 'warning',
    onOk: async () => {
      try {
        const handoff = await resetScannerDevicePushToken(record.id)
        message.success('已生成新的绑定激活码')
        openActivationHandoff(handoff)
        await syncAfterDeviceMutation()
      } catch (error) {
        showUserError(error, '重新绑定准备失败')
      }
    },
  })
}

async function handleCreateActivationCode(record: ExamScannerDeviceVO): Promise<void> {
  activationCodeDeviceName.value = record.deviceName || record.scannerDeviceId || '扫描设备'
  activationCodeInfo.value = null
  showActivationCodeModal.value = true
  activationCodeError.value = null
  try {
    activationCodeInfo.value = await createScannerActivationCode({ deviceId: record.id })
  } catch (error) {
    activationCodeError.value = toUserError(error, '扫描组件激活码生成失败')
    showUserError(error, '扫描组件激活码生成失败')
  }
}

const agentUnbindError = ref<Error | null>(null)

const deviceDeleteError = ref<Error | null>(null)

function handleUnbindAgent(record: ExamScannerDeviceVO): void {
  void confirmAsync({
    title: '解绑扫描组件',
    content: `确定解绑设备"${record.deviceName}"当前扫描组件吗？解绑后原一体机需要重新使用激活码绑定。`,
    type: 'warning',
    onOk: async () => {
      try {
        agentUnbindError.value = null
        await unbindScannerDeviceAgent(record.id)
        message.success('扫描组件已解绑')
        await syncAfterDeviceMutation()
      } catch (error) {
        agentUnbindError.value = toUserError(error, '扫描组件解绑失败')
        showUserError(error, '扫描组件解绑失败')
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
  message.warning('当前浏览器不支持剪贴板 API，请手动复制')
}

// ─── 详情弹窗 ────────────────────────────────────────
const showDetailModal = ref(false)
const detailInfo = ref<ExamScannerDeviceDetailVO | null>(null)
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

async function handleViewDetail(record: ExamScannerDeviceVO): Promise<void> {
  detailInfo.value = null
  detailDeviceId.value = record.id
  showDetailModal.value = true
  await reloadDeviceDetail()
}

// ─── 删除 ────────────────────────────────────────────
function handleDelete(record: ExamScannerDeviceVO): void {
  void confirmAsync({
    title: '删除扫描设备',
    content: `确定删除设备"${record.deviceName}"吗？历史扫描事件保持引用，仅当前设备记录被逻辑删除。`,
    type: 'error',
    onOk: async () => {
      try {
        deviceDeleteError.value = null
        await deleteScannerDevice(record.id)
        message.success('扫描设备已删除')
        await syncAfterDeviceMutation()
      } catch (error) {
        deviceDeleteError.value = toUserError(error, '扫描设备删除失败')
        showUserError(error, '扫描设备删除失败')
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
  gap: 12px;
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
  color: #94a3b8;
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
  gap: 16px;

  &__hint {
    width: 100%;
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
    text-align: left;
  }

  &__device {
    color: #334155;
    font-weight: 600;
  }

  &__code {
    padding: 10px 14px;
    border-radius: 10px;
    background: #f8fafc;
    color: #0f172a;
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
    color: #64748b;
    font-size: 13px;
  }
}
</style>
