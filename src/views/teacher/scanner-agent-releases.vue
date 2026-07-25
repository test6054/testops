<script setup lang="ts">
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ScannerAgentReleaseResponse } from '@/apis/mark/scanner-agent-release'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  deleteScannerAgentRelease,
  pageScannerAgentReleases,
  publishScannerAgentRelease,
  registerScannerAgentRelease,
} from '@/apis/mark/scanner-agent-release'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useAuthStore } from '@/stores/modules/auth'
import { RoleEnum } from '@/types/enums'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime, formatFileSize } from '@/utils/format'

defineOptions({ name: 'ScannerAgentReleasesPage' })

const authStore = useAuthStore()
const canManage = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)

const loading = ref(false)
const saving = ref(false)
const publishing = ref(false)
const deleting = ref(false)
const releases = ref<ScannerAgentReleaseResponse[]>([])
const pagination = reactive({ current: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const filters = reactive({ keyword: '' })

const registerOpen = ref(false)
interface ScannerAgentReleaseRegisterForm {
  version: string
  fileNodeId: string | undefined
  fileName: string | undefined
  releaseNotes: string
}

const registerForm = reactive<ScannerAgentReleaseRegisterForm>({
  version: '',
  fileNodeId: undefined,
  fileName: undefined,
  releaseNotes: '',
})

const publishOpen = ref(false)
const publishTarget = ref<ScannerAgentReleaseResponse | null>(null)
const publishPushEnabled = ref(false)

const publishedReleaseSnapshot = ref<ScannerAgentReleaseResponse | null>(null)

const signalMetrics = computed<SignalMetric[]>(() => {
  const published = publishedReleaseSnapshot.value
  if (!published) {
    return []
  }
  return [
    {
      key: 'published-version',
      label: '当前发布版本',
      value: published.version,
      tone: 'green',
    },
    {
      key: 'push-enabled',
      label: '主动推送',
      value: published.pushEnabled === true ? '已启用' : '未启用',
      tone: published.pushEnabled === true ? 'blue' : 'gray',
      helper: published.pushScheduledTime
        ? `计划 ${formatDateTime(published.pushScheduledTime)}`
        : undefined,
    },
  ]
})

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'keyword',
    label: '关键字',
    type: 'input',
    placeholder: '版本号或文件名',
  },
])

const columns: ColumnsType<ScannerAgentReleaseResponse> = [
  { title: '版本', dataIndex: 'version', key: 'version', width: 120, fixed: 'left' },
  { title: '安装包', dataIndex: 'fileName', key: 'fileName', ellipsis: true },
  { title: '大小', dataIndex: 'fileSize', key: 'fileSize', width: 100, align: 'right' },
  { title: '发布状态', dataIndex: 'published', key: 'published', width: 100, align: 'center' },
  { title: '推送', dataIndex: 'pushEnabled', key: 'pushEnabled', width: 120 },
  { title: '上传时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 140, align: 'center' },
]

function isMsiPackage(record: ScannerAgentReleaseResponse): boolean {
  return record.fileName?.toLowerCase().endsWith('.msi') ?? false
}

function resetRegisterForm() {
  registerForm.version = ''
  registerForm.fileNodeId = undefined
  registerForm.fileName = undefined
  registerForm.releaseNotes = ''
}

function openRegisterModal() {
  // MVR-316：注册入口与 canManage 同源
  if (canManage.value !== true) {
    void message.warning('仅平台超级管理员可维护扫描端发布包')
    return
  }
  resetRegisterForm()
  registerOpen.value = true
}

async function loadReleases() {
  if (canManage.value !== true) {
    return
  }
  loading.value = true
  try {
    const result = await pageScannerAgentReleases({
      keyword: filters.keyword.trim() || undefined,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    releases.value = result.list
    pagination.total = result.total
    const publishedInPage = releases.value.find((item) => item.published === true)
    if (publishedInPage) {
      publishedReleaseSnapshot.value = publishedInPage
    } else if (pagination.current === 1 && !filters.keyword.trim()) {
      publishedReleaseSnapshot.value = null
    }
  } catch (error) {
    releases.value = []
    pagination.total = 0
    showUserError(error, '扫描端安装包列表加载失败')
  } finally {
    loading.value = false
  }
}

async function submitRegister() {
  // MVR-316：与 BE 超管发布包门禁二次拦截
  if (canManage.value !== true) {
    void message.warning('仅平台超级管理员可维护扫描端发布包')
    return
  }
  if (saving.value === true) return
  const version = registerForm.version.trim()
  if (!version) {
    showFormValidationMessage('请填写版本号')
    return
  }
  if (!registerForm.fileNodeId) {
    showFormValidationMessage('请上传扫描端安装包')
    return
  }
  saving.value = true
  try {
    await registerScannerAgentRelease({
      version,
      fileId: registerForm.fileNodeId,
      releaseNotes: registerForm.releaseNotes.trim() || undefined,
    })
    void message.success('发布包已注册')
    registerOpen.value = false
    pagination.current = 1
    await loadReleases()
  } catch (error) {
    showUserError(error, '注册发布包失败')
  } finally {
    saving.value = false
  }
}

function buildReleaseRowActions(): UiTableRowActionItem[] {
  return [
    { key: 'publish', label: '发布' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleReleaseRowAction(key: string, record: ScannerAgentReleaseResponse): void {
  if (key === 'publish') {
    openPublishModal(record)
    return
  }
  if (key === 'delete') {
    void confirmDelete(record)
  }
}

function openPublishModal(record: ScannerAgentReleaseResponse) {
  // MVR-316：发布入口与 canManage 同源
  if (canManage.value !== true) {
    void message.warning('仅平台超级管理员可维护扫描端发布包')
    return
  }
  publishTarget.value = record
  publishPushEnabled.value = isMsiPackage(record)
  publishOpen.value = true
}

async function submitPublish() {
  // MVR-316：与 BE 超管发布包门禁二次拦截
  if (canManage.value !== true) {
    void message.warning('仅平台超级管理员可维护扫描端发布包')
    return
  }
  if (!publishTarget.value) {
    return
  }
  if (publishing.value === true) return
  publishing.value = true
  try {
    await publishScannerAgentRelease({
      releaseId: publishTarget.value.id,
      pushEnabled: publishPushEnabled.value,
    })
    void message.success('版本已发布')
    publishOpen.value = false
    publishTarget.value = null
    await loadReleases()
  } catch (error) {
    showUserError(error, '发布失败')
  } finally {
    publishing.value = false
  }
}

async function confirmDelete(record: ScannerAgentReleaseResponse) {
  // MVR-316：删除与 canManage 二次拦截
  if (canManage.value !== true) {
    void message.warning('仅平台超级管理员可维护扫描端发布包')
    return
  }
  if (record.published === true) {
    showFormValidationMessage('当前发布版本不能删除')
    return
  }
  if (deleting.value === true) return
  const confirmed = await confirmAsync({
    title: `删除版本 ${record.version}？`,
    content: '仅未发布包可删除；删除后需重新上传安装包才能再次注册。',
    type: 'warning',
    okText: '删除',
  })
  if (!confirmed) {
    return
  }
  // MVR-934：确认后再次认 canManage，并复检未发布
  if (canManage.value !== true) {
    void message.warning('仅平台超级管理员可维护扫描端发布包')
    return
  }
  if (record.published === true) {
    showFormValidationMessage('当前发布版本不能删除')
    return
  }
  deleting.value = true
  try {
    await deleteScannerAgentRelease({ releaseId: record.id })
    void message.success('发布包已删除')
    await loadReleases()
  } catch (error) {
    showUserError(error, '删除失败')
  } finally {
    deleting.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  void loadReleases()
}

function handleResetSearch() {
  filters.keyword = ''
  pagination.current = 1
  void loadReleases()
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pagination.current = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  void loadReleases()
}

onMounted(() => {
  void loadReleases()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="一体机扫描端版本发布"
        subtitle="注册安装包、切换当前发布版本，安装包格式可启用次日 01:00 主动推送"
      >
        <template #actions>
          <UiButton
            v-if="canManage === true"
            size="sm"
            variant="primary"
            :disabled="loading === true"
            @click="openRegisterModal"
          >
            注册新版本
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand v-if="signalMetrics.length" :metrics="signalMetrics" variant="panel" compact />
    </template>

    <UiEmpty size="sm" v-if="canManage !== true" description="仅平台超级管理员可维护扫描端发布包" />

    <WorkbenchSurfaceCard v-else flush>
      <template #toolbar>
        <UiFilterBar
          variant="plain"
          :model-value="filters"
          :fields="filterFields"
          search-text="查询"
          @update:model-value="Object.assign(filters, $event)"
          @search="handleSearch"
          @reset="handleResetSearch"
        />
      </template>

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="releases"
        :loading="loading"
        :total="pagination.total"
        row-key="id"
        flat
        empty-description="暂无扫描端发布包，请先注册安装包"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'fileSize'">
            <span v-if="record.fileSize != null">{{ formatFileSize(record.fileSize) }}</span>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'published'">
            <UiTag :tone="record.published === true ? 'green' : 'gray'" size="sm">
              {{ record.published === true ? '已发布' : '待发布' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'pushEnabled'">
            <template v-if="record.published === true">
              <UiTag :tone="record.pushEnabled === true ? 'blue' : 'gray'" size="sm">
                {{ record.pushEnabled === true ? '已启用' : '未启用' }}
              </UiTag>
              <div v-if="record.pushActivatedTime" class="scanner-agent-releases__sub">
                已激活 {{ formatDateTime(record.pushActivatedTime) }}
              </div>
              <div v-else-if="record.pushScheduledTime" class="scanner-agent-releases__sub">
                计划 {{ formatDateTime(record.pushScheduledTime) }}
              </div>
            </template>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ record.createTime ? formatDateTime(record.createTime) : '-' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="record.published !== true"
              :items="buildReleaseRowActions()"
              split
              @action="(key) => handleReleaseRowAction(key, record)"
            />
            <span v-else class="muted">-</span>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <UiDialog
      v-model:open="registerOpen"
      title="注册扫描端发布包"
      :width="520"
      :confirm-loading="saving === true"
      ok-text="注册"
      @ok="submitRegister"
    >
      <UiForm layout="vertical">
        <UiFormItem label="版本号" required>
          <UiInput
            size="sm"
            v-model="registerForm.version"
            placeholder="例如 1.2.0"
            :maxlength="32"
          />
        </UiFormItem>
        <UiFormItem label="安装包" required>
          <UiPlatformFileField
            v-model:file-node-id="registerForm.fileNodeId"
            v-model:file-name="registerForm.fileName"
            :scene-key="FileUploadSceneKey.MARK_SCANNER_AGENT_RELEASE"
            accept=".msi,.exe"
            button-text="选择安装包"
            tip="支持主流安装包格式；交互式引导包不支持服务端下发"
          />
        </UiFormItem>
        <UiFormItem label="发布说明">
          <UiTextarea
            size="sm"
            v-model="registerForm.releaseNotes"
            :rows="3"
            :maxlength="1000"
            placeholder="可选，记录本次更新要点"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <UiDialog
      v-model:open="publishOpen"
      title="发布扫描端版本"
      :width="520"
      :confirm-loading="publishing === true"
      ok-text="确认发布"
      @ok="submitPublish"
    >
      <p v-if="publishTarget">
        将 <strong>{{ publishTarget.version }}</strong>（{{ publishTarget.fileName }}）设为当前发布版本，其他已发布包会自动下线。
      </p>
      <UiFormItem v-if="publishTarget && isMsiPackage(publishTarget)" label="主动推送更新">
        <UiCheckbox v-model="publishPushEnabled">
          启用后将于发布次日 01:00 向在线一体机推送安装包更新
        </UiCheckbox>
      </UiFormItem>
      <p v-else-if="publishTarget" class="scanner-agent-releases__hint">
        可执行安装包不支持主动推送，一体机需通过扫描端自更新或人工安装。
      </p>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style lang="scss" scoped>
.scanner-agent-releases__sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-tertiary);
}

.scanner-agent-releases__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}

.muted {
  color: var(--dp-text-tertiary);
}
</style>
