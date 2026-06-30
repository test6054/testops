<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ScannerOperatorGrantItemResponse } from '@/apis/mark/scanner-operator-grant'
import type { TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  deleteScannerOperatorGrant,
  pageScannerOperatorGrants,
  saveScannerOperatorGrant,
} from '@/apis/mark/scanner-operator-grant'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import { requireArrayResult } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiLoadFailure from '@/components/ui-guide/ui/UiLoadFailure.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePageLoadFailure } from '@/composables/usePageLoadFailure'
import { useAuthStore } from '@/stores/modules/auth'
import { RoleEnum } from '@/types/enums'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'

defineOptions({ name: 'ScannerOperatorGrantsPage' })

const { loadError, captureLoadFailure, clearLoadFailure } = usePageLoadFailure()

interface CampusOption {
  campusId: string
  campusName: string
}

const authStore = useAuthStore()
const canManage = computed(() =>
  authStore.userRole === RoleEnum.CROP_ADMIN || authStore.userRole === RoleEnum.SUPER_ADMIN,
)

const loading = ref(false)
const saving = ref(false)
const modalOpen = ref(false)
const departments = ref<TenantSchoolDepartmentDto[]>([])
const grants = ref<ScannerOperatorGrantItemResponse[]>([])
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const filters = reactive({
  userId: undefined as string | undefined,
  campusId: undefined as string | undefined,
  departmentId: undefined as string | undefined,
})
const form = reactive({
  grantId: undefined as string | undefined,
  userId: undefined as string | undefined,
  campusId: undefined as string | undefined,
  departmentId: undefined as string | undefined,
})

const campusOptions = computed<CampusOption[]>(() => {
  const map = new Map<string, string>()
  for (const item of departments.value) {
    if (!item.schoolId) {
      continue
    }
    map.set(item.schoolId, item.schoolName || item.schoolId)
  }
  return Array.from(map.entries()).map(([campusId, campusName]) => ({ campusId, campusName }))
})

const departmentOptions = computed(() => {
  const list = form.campusId
    ? departments.value.filter(item => item.schoolId === form.campusId)
    : departments.value
  return list.map(item => ({ value: item.id, label: item.deptName }))
})

const filterFields = computed(() => [
  {
    key: 'userId',
    label: '扫描员',
    type: 'custom' as const,
  },
  {
    key: 'campusId',
    label: '校区',
    type: 'select' as const,
    options: campusOptions.value.map(item => ({ value: item.campusId, label: item.campusName })),
  },
  {
    key: 'departmentId',
    label: '院系',
    type: 'select' as const,
    options: departments.value.map(item => ({ value: item.id, label: item.deptName })),
  },
])

const columns: ColumnsType<ScannerOperatorGrantItemResponse> = [
  { title: '扫描员', key: 'userId', dataIndex: 'userId', width: 120 },
  { title: '校区 ID', key: 'campusId', dataIndex: 'campusId', width: 120 },
  { title: '院系 ID', key: 'departmentId', dataIndex: 'departmentId', width: 120 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 180 },
  { title: '操作', key: 'actions', width: 120 },
]

function campusLabel(campusId?: string) {
  if (!campusId) {
    return '—'
  }
  return campusOptions.value.find(item => item.campusId === campusId)?.campusName || campusId
}

function departmentLabel(departmentId?: string) {
  if (!departmentId) {
    return '—'
  }
  return departments.value.find(item => item.id === departmentId)?.deptName || departmentId
}

async function loadDepartments() {
  departments.value = requireArrayResult<TenantSchoolDepartmentDto>(
    await departmentCatalogApi.list(),
    '院系',
  )
}

async function loadGrants() {
  if (!canManage.value) {
    return
  }
  loading.value = true
  try {
    const page = await pageScannerOperatorGrants({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      userId: filters.userId,
      campusId: filters.campusId,
      departmentId: filters.departmentId,
    })
    grants.value = readPageList(page, '扫描员授权列表加载失败')
    pagination.total = readPageTotal(page, '扫描员授权总数加载失败')
    clearLoadFailure()
  }
  catch (error) {
    captureLoadFailure(error, '扫描员授权列表加载失败')
    grants.value = []
    pagination.total = 0
  }
  finally {
    loading.value = false
  }
}

function openCreateModal() {
  form.grantId = undefined
  form.userId = undefined
  form.campusId = undefined
  form.departmentId = undefined
  modalOpen.value = true
}

function openEditModal(row: ScannerOperatorGrantItemResponse) {
  form.grantId = row.grantId
  form.userId = row.userId
  form.campusId = row.campusId
  form.departmentId = row.departmentId
  modalOpen.value = true
}

async function submitGrant() {
  if (!form.userId || !form.campusId || !form.departmentId) {
    message.warning('请完整选择扫描员、校区与院系')
    return
  }
  saving.value = true
  try {
    await saveScannerOperatorGrant({
      grantId: form.grantId,
      userId: form.userId,
      campusId: form.campusId,
      departmentId: form.departmentId,
    })
    message.success(form.grantId ? '授权已更新' : '授权已创建')
    modalOpen.value = false
    await loadGrants()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    saving.value = false
  }
}

async function removeGrant(row: ScannerOperatorGrantItemResponse) {
  const confirmed = await confirmAsync({
    title: '删除扫描员授权？',
    content: '删除后该扫描员将无法看到对应校区院系范围内的工位待办。',
    type: 'warning',
    okText: '删除',
  })
  if (!confirmed) {
    return
  }
  try {
    await deleteScannerOperatorGrant(row.grantId)
    message.success('授权已删除')
    await loadGrants()
  }
  catch (error) {
    showUserError(error)
  }
}

function handleSearch() {
  pagination.current = 1
  void loadGrants()
}

function handleResetSearch() {
  filters.userId = undefined
  filters.campusId = undefined
  filters.departmentId = undefined
  pagination.current = 1
  void loadGrants()
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pagination.current = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  void loadGrants()
}

onMounted(async () => {
  await loadDepartments()
  await loadGrants()
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar
      title="扫描员数据范围授权"
      subtitle="按校区 + 院系配对控制工位可见归档卷与档案袋 gap 待办；仅租户管理员可维护"
    />
    <UiEmpty v-if="!canManage" description="当前账号无租户管理员权限，无法维护扫描员授权" />
    <UiLoadFailure
      v-else-if="loadError"
      title="扫描员授权列表加载失败"
      :description="loadError"
    />
    <template v-else>
      <UiFilterBar
        variant="plain"
        :model-value="filters"
        :fields="filterFields"
        search-text="查询"
        @update:model-value="Object.assign(filters, $event)"
        @search="handleSearch"
        @reset="handleResetSearch"
      >
        <template #field-userId>
          <ArchiveDutyUserSelect v-model:value="filters.userId" placeholder="扫描员" />
        </template>
      </UiFilterBar>
      <div class="scanner-operator-grants__toolbar">
        <UiButton size="sm" variant="primary" @click="openCreateModal">新增授权</UiButton>
      </div>
      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="grants"
        :loading="loading"
        :total="pagination.total"
        row-key="grantId"
        size="middle"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'campusId'">
            {{ campusLabel(record.campusId) }}
          </template>
          <template v-else-if="column.key === 'departmentId'">
            {{ departmentLabel(record.departmentId) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction tone="primary" @click="openEditModal(record)">编辑</UiTextAction>
            <UiTextAction tone="danger" @click="removeGrant(record)">删除</UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </template>

    <a-modal
      v-model:open="modalOpen"
      :title="form.grantId ? '编辑扫描员授权' : '新增扫描员授权'"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      destroy-on-close
      @ok="submitGrant"
    >
      <a-form layout="vertical">
        <a-form-item label="扫描员" required>
          <ArchiveDutyUserSelect v-model:value="form.userId" />
        </a-form-item>
        <a-form-item label="校区" required>
          <a-select
            v-model:value="form.campusId"
            :options="campusOptions.map(item => ({ value: item.campusId, label: item.campusName }))"
            placeholder="选择校区"
            show-search
            option-filter-prop="label"
            @change="form.departmentId = undefined"
          />
        </a-form-item>
        <a-form-item label="院系" required>
          <a-select
            v-model:value="form.departmentId"
            :options="departmentOptions"
            placeholder="选择院系"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped>
.scanner-operator-grants__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
</style>
