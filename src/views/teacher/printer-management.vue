<template>
  <StageWorkbenchShell>
    <a-card :bordered="false" class="detail-table-card printer-management">
      <template #title>扫描设备</template>
      <template #extra>
        <a-space>
          <a-tag color="blue">共 {{ devices.length }} 台设备</a-tag>
          <UiButton size="sm" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            新增设备
          </UiButton>
        </a-space>
      </template>

      <UiFilterBar
        v-model="searchForm"
        :fields="deviceFilterFields"
        search-text="查询"
        @search="handleSearch"
        @reset="handleResetSearch"
      />

      <!-- D-9 错误态：设备列表加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="devicesLoadError"
        :error="devicesLoadError"
        title="扫描设备列表加载失败"
        compact
        @retry="loadDevices"
      />
      <UiErrorRetryPanel
        v-if="agentUnbindError"
        :error="agentUnbindError"
        title="扫描组件解绑失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <UiErrorRetryPanel
        v-if="deviceDeleteError"
        :error="deviceDeleteError"
        title="扫描设备删除失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />

      <!-- 设备表格 -->
      <UiDataTable
        class="student-detail-table__data-table"
        v-if="!devicesLoadError"
        :columns="columns"
        :data-source="devices"
        :loading="loading"
        :show-pagination="false"
        row-key="id"
        size="middle"
        flat
        :total="devices.length"
        bordered
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColorOf(devices[index].status)">
              {{ statusLabelOf(devices[index].status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'endpointOnlineStatus'">
            <a-tag :color="endpointOnlineStatusDisplayColorOf(devices[index])">
              {{ endpointOnlineStatusDisplayLabelOf(devices[index]) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'agentVersion'">
            <span v-if="devices[index].agentVersion">{{ devices[index].agentVersion }}</span>
            <span v-else class="text-muted">未激活</span>
          </template>
          <template v-else-if="column.key === 'pushTokenMasked'">
            <span v-if="devices[index].pushTokenMasked" class="token-text">
              {{ devices[index].pushTokenMasked }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
          <template v-else-if="column.key === 'lastSeenAt'">
            <span v-if="devices[index].lastSeenAt">{{ devices[index].lastSeenAt }}</span>
            <span v-else class="text-muted">从未通讯</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="operations-cell">
              <UiTextAction @click="handleViewDetail(devices[index])">详情</UiTextAction>
              <UiTextAction @click="handleEdit(devices[index])">编辑</UiTextAction>
              <UiTextAction @click="handleResetToken(devices[index])">重置设备接入密钥</UiTextAction>
              <UiTextAction @click="handleCreateActivationCode(devices[index])">激活码</UiTextAction>
              <UiTextAction
                v-if="devices[index].endpointMachineCode"
                tone="danger"
                @click="handleUnbindAgent(devices[index])"
              >
                解绑扫描组件
              </UiTextAction>
              <UiTextAction tone="danger" @click="handleDelete(devices[index])">删除</UiTextAction>
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
        <UiErrorRetryPanel
          v-if="formSubmitError"
          :error="formSubmitError"
          title="扫描设备保存失败"
          compact
          :show-retry="false"
          style="margin-bottom: 16px"
        />
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
                placeholder="可空，HTTP 推送时事件上报会刷新"
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

    <!-- 设备接入密钥弹窗（创建 / 重置 / 详情共用） -->
    <a-modal
      v-model:open="showTokenModal"
      title="HTTP 推送配置"
      width="700px"
      :footer="null"
      destroy-on-close
    >
      <a-alert
        type="warning"
        show-icon
        message="请妥善保管设备接入密钥，关闭对话框后将仅展示脱敏内容。"
        style="margin-bottom: 16px"
      />
      <UiErrorRetryPanel
        v-if="tokenActionError"
        :error="tokenActionError"
        title="HTTP 推送配置操作失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <a-descriptions v-if="tokenInfo" bordered :column="1" size="small">
        <a-descriptions-item label="设备记录编号">
          <span>{{ tokenInfo?.id }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="完整设备接入密钥">
          <div class="token-row">
            <span class="token-text">{{ tokenInfo?.pushToken }}</span>
            <a-button size="small" @click="copyText(tokenInfo?.pushToken)">复制</a-button>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="上报地址（当前站点）">
          <div class="token-row">
            <span class="token-text">{{ tokenInfo?.pushUrl }}</span>
            <a-button size="small" @click="copyText(absolutePushUrl)">复制完整上报地址</a-button>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="完整上报地址">
          <span class="token-text">{{ absolutePushUrl }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="设备接入授权">
          <div class="token-row">
            <span class="token-text">{{ tokenInfo?.authorizationHeader }}</span>
            <a-button size="small" @click="copyText(tokenInfo?.authorizationHeader)">复制</a-button>
          </div>
        </a-descriptions-item>
      </a-descriptions>
      <p style="margin-top: 12px" class="text-muted">
        在扫描仪或复合机后台填入上报地址和设备接入授权；考试、班级、扫描时间等内容按设备后台表单要求填写。
      </p>
    </a-modal>

    <!-- 设备详情弹窗 -->
    <a-modal
      v-model:open="showDetailModal"
      title="扫描设备详情"
      width="720px"
      :footer="null"
      destroy-on-close
    >
      <UiErrorRetryPanel
        v-if="detailLoadError"
        :error="detailLoadError"
        title="扫描设备详情加载失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <a-descriptions v-if="detailInfo" bordered :column="2" size="small">
        <a-descriptions-item label="设备名称">{{ detailInfo.deviceName }}</a-descriptions-item>
        <a-descriptions-item label="扫描设备编号">
          {{ detailInfo.scannerDeviceId }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描站点编号">
          {{ detailInfo.scannerStationId }}
        </a-descriptions-item>
        <a-descriptions-item label="设备状态">
          <a-tag :color="statusColorOf(detailInfo.status)">
            {{ statusLabelOf(detailInfo.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="设备地址">
          {{ detailInfo.scannerIp || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="Kiosk 防误触锁">
          <a-tag :color="detailInfo.kioskLockEnabled === false ? 'warning' : 'success'">
            {{ detailInfo.kioskLockEnabled === false ? '已关闭' : '已启用' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="扫描组件在线状态">
          <a-tag :color="endpointOnlineStatusDisplayColorOf(detailInfo)">
            {{ endpointOnlineStatusDisplayLabelOf(detailInfo) }}
          </a-tag>
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
          {{ detailInfo.lastHeartbeatAt || '从未心跳' }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描组件维护说明">
          {{
            scannerDeviceDiagnosticText(detailInfo.diagnosticMessage, detailInfo.diagnosticStatus)
          }}
        </a-descriptions-item>
        <a-descriptions-item label="完整设备接入密钥" :span="2">
          <div class="token-row">
            <span class="token-text">{{ detailInfo.pushToken || '—' }}</span>
            <a-button
              v-if="detailInfo.pushToken"
              size="small"
              @click="copyText(detailInfo.pushToken)"
            >
              复制
            </a-button>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="上报地址" :span="2">
          <span class="token-text">{{ buildAbsolutePushUrl(detailInfo.pushUrl) }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="设备接入授权" :span="2">
          <span class="token-text">{{ detailInfo.authorizationHeader || '—' }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="厂商">{{ detailInfo.manufacturer || '—' }}</a-descriptions-item>
        <a-descriptions-item label="型号">{{ detailInfo.model || '—' }}</a-descriptions-item>
        <a-descriptions-item label="物理位置" :span="2">
          {{ detailInfo.location || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="最近通讯时间">
          {{ detailInfo.lastSeenAt || '从未通讯' }}
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
      title="扫描组件激活码"
      width="520px"
      :footer="null"
      destroy-on-close
    >
      <UiErrorRetryPanel
        v-if="activationCodeError"
        :error="activationCodeError"
        title="扫描组件激活码生成失败"
        compact
        :show-retry="false"
        style="margin-bottom: 16px"
      />
      <div v-if="activationCodeInfo" class="activation-code-modal">
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
          <span>有效期至：{{ activationCodeInfo.expireAt }}</span>
        </div>
        <a-space>
          <a-button type="primary" @click="copyText(activationCodeInfo.activationCode)">
            复制激活码
          </a-button>
          <a-button @click="showActivationCodeModal = false"> 关闭 </a-button>
        </a-space>
      </div>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type {
  ExamScannerActivationCodeVO,
  ExamScannerDeviceCreateRequest,
  ExamScannerDeviceDetailVO,
  ExamScannerDeviceQueryRequest,
  ExamScannerDeviceTokenVO,
  ExamScannerDeviceUpdateRequest,
  ExamScannerDeviceVO,
  ScannerAgentDiagnosticStatusCode,
  ScannerDeviceStatusCode,
  ScannerEndpointOnlineStatusCode,
} from '@/apis/mark/exam-mark-scanner'
import type { FilterField } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import AQrcode from 'ant-design-vue/es/qrcode'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createScannerActivationCode,
  createScannerDevice,
  deleteScannerDevice,
  getScannerDeviceDetail,
  listScannerDevices,
  resetScannerDevicePushToken,
  SCANNER_DEVICE_STATUS_COLOR,
  SCANNER_DEVICE_STATUS_LABEL,
  SCANNER_ENDPOINT_ONLINE_STATUS_COLOR,
  SCANNER_ENDPOINT_ONLINE_STATUS_LABEL,
  unbindScannerDeviceAgent,
  updateScannerDevice,
} from '@/apis/mark/exam-mark-scanner'
import { UiButton, UiDataTable, UiErrorRetryPanel, UiFilterBar, UiTextAction } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { readArrayResponse } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PrinterManagement' })

// ─── 列表与筛选 ───────────────────────────────────────
const loading = ref(false)
const devicesLoadError = ref<Error | null>(null)
const devices = ref<ExamScannerDeviceVO[]>([])
const searchForm = reactive<ExamScannerDeviceQueryRequest>({})
const showActivationCodeModal = ref(false)
const activationCodeInfo = ref<ExamScannerActivationCodeVO | null>(null)
const activationCodeDeviceName = ref('')
const activationCodeError = ref<Error | null>(null)

const statusOptions = [
  { value: 'ACTIVE', label: SCANNER_DEVICE_STATUS_LABEL.ACTIVE },
  { value: 'INACTIVE', label: SCANNER_DEVICE_STATUS_LABEL.INACTIVE },
  { value: 'DISABLED', label: SCANNER_DEVICE_STATUS_LABEL.DISABLED },
]

const deviceFilterFields: FilterField[] = [
  {
    key: 'scannerDeviceIdKeyword',
    type: 'input',
    placeholder: '按扫描设备编号搜索',
    allowClear: true,
    width: 240,
    triggerSearchOnChange: false,
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '设备状态',
    allowClear: true,
    width: 160,
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
]

const columns = [
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', width: 160 },
  { title: '扫描设备编号', dataIndex: 'scannerDeviceId', key: 'scannerDeviceId', width: 160 },
  { title: '站点', dataIndex: 'scannerStationId', key: 'scannerStationId', width: 120 },
  { title: '设备地址', dataIndex: 'scannerIp', key: 'scannerIp', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '扫描组件', dataIndex: 'endpointOnlineStatus', key: 'endpointOnlineStatus', width: 100 },
  { title: '组件版本', dataIndex: 'agentVersion', key: 'agentVersion', width: 120 },
  { title: '设备接入密钥', dataIndex: 'pushTokenMasked', key: 'pushTokenMasked', width: 130 },
  { title: '最近通讯', dataIndex: 'lastSeenAt', key: 'lastSeenAt', width: 170 },
  { title: '位置', dataIndex: 'location', key: 'location', width: 160, ellipsis: true },
  { title: '操作', dataIndex: 'action', key: 'action', width: 260, fixed: 'right' as const },
]

// helper 严格只接受后端枚举类型，零 as 断言。
function statusLabelOf(status: ScannerDeviceStatusCode): string {
  return strictEnumLabel(SCANNER_DEVICE_STATUS_LABEL, status, '扫描设备状态')
}
function statusColorOf(status: ScannerDeviceStatusCode): string {
  return strictEnumTone(SCANNER_DEVICE_STATUS_COLOR, status, '扫描设备状态')
}
function endpointOnlineStatusLabelOf(status: ScannerEndpointOnlineStatusCode): string {
  return strictEnumLabel(SCANNER_ENDPOINT_ONLINE_STATUS_LABEL, status, '扫描端点在线状态')
}
function endpointOnlineStatusColorOf(status: ScannerEndpointOnlineStatusCode): string {
  return strictEnumTone(SCANNER_ENDPOINT_ONLINE_STATUS_COLOR, status, '扫描端点在线状态')
}
function endpointOnlineStatusDisplayLabelOf(device: ExamScannerDeviceVO): string {
  return device.endpointOnlineStatus
    ? endpointOnlineStatusLabelOf(device.endpointOnlineStatus)
    : '未激活'
}
function endpointOnlineStatusDisplayColorOf(device: ExamScannerDeviceVO): string {
  return device.endpointOnlineStatus
    ? endpointOnlineStatusColorOf(device.endpointOnlineStatus)
    : 'default'
}

async function loadDevices(): Promise<void> {
  loading.value = true
  devicesLoadError.value = null
  agentUnbindError.value = null
  deviceDeleteError.value = null
  try {
    const result = await listScannerDevices(searchForm)
    devices.value = readArrayResponse(result, '扫描设备列表加载失败')
  } catch (error) {
    devicesLoadError.value = toUserError(error, '扫描设备列表加载失败')
    showUserError(error, '扫描设备列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  loadDevices()
}

function handleResetSearch(): void {
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
  tokenInfo.value = null
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
      const createdToken = await createScannerDevice(request)
      message.success('扫描设备创建成功')
      showFormModal.value = false
      if (createdToken.pushToken) {
        openTokenModal(createdToken)
      }
      await loadDevices()
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
      await updateScannerDevice(request)
      message.success('扫描设备已更新')
      showFormModal.value = false
      await loadDevices()
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

// ─── 设备接入密钥弹窗 ───────────────────────────────────
const showTokenModal = ref(false)
const tokenInfo = ref<ExamScannerDeviceTokenVO | null>(null)
const tokenActionError = ref<Error | null>(null)

const absolutePushUrl = computed(() => buildAbsolutePushUrl(tokenInfo.value?.pushUrl))

function buildAbsolutePushUrl(relativeUrl?: string): string {
  if (!relativeUrl) return ''
  if (typeof window === 'undefined') return relativeUrl
  return window.location.origin + relativeUrl
}

function openTokenModal(info: ExamScannerDeviceTokenVO): void {
  tokenInfo.value = info
  tokenActionError.value = null
  showTokenModal.value = true
}

/** 将扫描设备本地诊断转为管理员可处置的维护提示，避免展示接口或驱动调试口径。 */
function scannerDeviceDiagnosticText(
  message?: string,
  status?: ScannerAgentDiagnosticStatusCode,
): string {
  const fallback = status ? `扫描组件状态：${status}` : '暂无扫描组件维护提示'
  return getUserErrorMessage({ message }, fallback)
}

async function handleResetToken(record: ExamScannerDeviceVO): Promise<void> {
  void confirmAsync({
    title: '重置设备接入密钥',
    content: `重置后旧设备接入密钥立即失效，扫描仪后台需要重新填入。是否继续？设备：${record.deviceName}`,
    type: 'warning',
    onOk: async () => {
      try {
        tokenActionError.value = null
        tokenInfo.value = null
        showTokenModal.value = true
        const result = await resetScannerDevicePushToken(record.id)
        message.success('设备接入密钥已重置')
        openTokenModal(result)
        await loadDevices()
      } catch (error) {
        tokenActionError.value = toUserError(error, '扫描设备接入密钥重置失败')
        showUserError(error, '扫描设备接入密钥重置失败')
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
        await loadDevices()
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
const detailLoadError = ref<Error | null>(null)

async function handleViewDetail(record: ExamScannerDeviceVO): Promise<void> {
  detailInfo.value = null
  showDetailModal.value = true
  detailLoadError.value = null
  try {
    detailInfo.value = await getScannerDeviceDetail(record.id)
  } catch (error) {
    detailLoadError.value = toUserError(error, '扫描设备详情加载失败')
    showUserError(error, '扫描设备详情加载失败')
  }
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
        await loadDevices()
      } catch (error) {
        deviceDeleteError.value = toUserError(error, '扫描设备删除失败')
        showUserError(error, '扫描设备删除失败')
      }
    },
  })
}

onMounted(() => {
  loadDevices()
})
</script>

<style scoped lang="scss">
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
