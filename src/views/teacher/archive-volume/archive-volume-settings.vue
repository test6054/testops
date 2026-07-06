<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="归档配置"
        subtitle="维护模板套、职责授权、密级策略与材料目录模板"
      />
    </template>

    <template #signal>
      <SignalBand variant="tiles" compact :metrics="settingsSignalMetrics" />
    </template>

    <WorkbenchSurfaceCard flush class="archive-volume-settings__surface">
      <template #head>
        <UiSectionTabs v-model="settingsTab" :items="settingsTabs" compact />
      </template>

      <section v-if="settingsTab === 'templateSets'" class="archive-volume-settings__panel">
        <ArchiveVolumeTemplateSetsPanel />
      </section>

      <section v-else-if="settingsTab === 'duty'" class="archive-volume-settings__panel">
        <UiAlertStrip
          v-if="!canManageConfig"
          tone="warning"
          title="当前账号仅可查看"
          description="职责授权维护须租户管理员权限。"
          dense
        />
        <UiForm :disabled="dutyLoading || saving || !canManageConfig">
          <WorkbenchSurfaceCard flush>
            <template #head>
              <span>职责授权</span>
            </template>
            <template #toolbar>
              <div class="archive-volume-settings__section-toolbar">
                <span class="archive-volume-settings__section-hint">
                  配置归档职责类型、院系范围与全校授权
                </span>
                <div class="archive-volume-settings__section-actions">
                  <UiButton v-if="canManageConfig" size="sm" variant="outline" @click="addDutyRow">新增授权</UiButton>
                  <UiButton
                    v-if="canManageConfig"
                    size="sm"
                    variant="primary"
                    :loading="saving"
                    @click="saveDutyGrants"
                  >
                    保存职责授权
                  </UiButton>
                </div>
              </div>
            </template>
            <UiDataTable
              pagination-mode="none"
              :columns="dutyColumns"
              :data-source="dutyRows"
              :loading="dutyLoading"
              :show-pagination="false"
              flat
              row-key="rowKey"
              size="middle"
              empty-description="暂无职责授权，请新增"
            >
              <template #bodyCell="{ column, index }">
                <template v-if="column.key === 'userId'">
                  <ArchiveDutyUserSelect v-model:value="dutyRows[index].userId" />
                </template>
                <template v-else-if="column.key === 'dutyType'">
                  <UiSelect
                    v-model="dutyRows[index].dutyType"
                    :options="dutyTypeOptions"
                    :allow-clear="false"
                  />
                </template>
                <template v-else-if="column.key === 'scopeDepartmentId'">
                  <UiSelect
                    v-model="dutyRows[index].scopeDepartmentId"
                    :options="departmentOptions"
                    :disabled="dutyRows[index].tenantWide"
                    placeholder="院系（可选）"
                    allow-search
                  />
                </template>
                <template v-else-if="column.key === 'tenantWide'">
                  <a-checkbox
                    v-model:checked="dutyRows[index].tenantWide"
                    @change="handleTenantWideChange(index)"
                  >
                    全校
                  </a-checkbox>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTextAction tone="danger" @click="removeDutyRow(index)">删除</UiTextAction>
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
        </UiForm>
      </section>

      <section v-else-if="settingsTab === 'security'" class="archive-volume-settings__panel">
        <UiAlertStrip
          v-if="!canManageConfig"
          tone="warning"
          title="当前账号仅可查看"
          description="密级策略维护须租户管理员权限。"
          dense
        />
        <UiForm :disabled="policyLoading || saving || !canManageConfig">
          <WorkbenchSurfaceCard flush>
            <template #head>
              <span>密级策略</span>
            </template>
            <template #toolbar>
              <div class="archive-volume-settings__section-toolbar">
                <span class="archive-volume-settings__section-hint">
                  按职责类型限制可访问的最高密级
                </span>
                <div class="archive-volume-settings__section-actions">
                  <UiButton v-if="canManageConfig" size="sm" variant="outline" @click="addPolicyRow">新增策略</UiButton>
                  <UiButton
                    v-if="canManageConfig"
                    size="sm"
                    variant="primary"
                    :loading="saving"
                    @click="saveSecurityPolicyRows"
                  >
                    保存密级策略
                  </UiButton>
                </div>
              </div>
            </template>
            <UiDataTable
              pagination-mode="none"
              :columns="policyColumns"
              :data-source="policyRows"
              :loading="policyLoading"
              :show-pagination="false"
              flat
              row-key="rowKey"
              size="middle"
              empty-description="暂无密级策略"
            >
              <template #bodyCell="{ column, index }">
                <template v-if="column.key === 'dutyType'">
                  <a-select
                    v-model:value="policyRows[index].dutyType"
                    :options="dutyTypeOptions"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'maxSecurityLevel'">
                  <a-select
                    v-model:value="policyRows[index].maxSecurityLevel"
                    :options="securityLevelOptions"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTextAction tone="danger" @click="removePolicyRow(index)">删除</UiTextAction>
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
        </UiForm>
      </section>

      <section v-else class="archive-volume-settings__panel">
        <UiAlertStrip
          v-if="!canManageConfig"
          tone="warning"
          title="当前账号仅可查看"
          description="目录模板维护须租户管理员权限。"
          dense
        />
        <UiForm :disabled="catalogLoading || saving || !canManageConfig">
          <WorkbenchSurfaceCard flush>
            <template #head>
              <span>目录模板</span>
            </template>
            <template #toolbar>
              <div class="archive-volume-settings__section-toolbar">
                <span class="archive-volume-settings__section-hint">
                  维护租户材料目录项、必交规则与排序
                </span>
                <div class="archive-volume-settings__section-actions">
                  <UiButton v-if="canManageConfig" size="sm" variant="outline" @click="addCatalogRow">新增目录项</UiButton>
                  <UiButton
                    v-if="canManageConfig"
                    size="sm"
                    variant="primary"
                    :loading="saving"
                    @click="saveCatalogRows"
                  >
                    保存目录模板
                  </UiButton>
                </div>
              </div>
            </template>
            <UiDataTable
              pagination-mode="none"
              :columns="catalogColumns"
              :data-source="catalogRows"
              :loading="catalogLoading"
              :show-pagination="false"
              flat
              row-key="rowKey"
              size="middle"
              empty-description="暂无目录模板项"
            >
              <template #bodyCell="{ column, index }">
                <template v-if="column.key === 'examForm'">
                  <a-select
                    v-model:value="catalogRows[index].examForm"
                    :options="examFormOptions"
                    allow-clear
                    placeholder="全部形式"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'materialType'">
                  <a-select
                    v-model:value="catalogRows[index].materialType"
                    :options="materialTypeOptions"
                    show-search
                    option-filter-prop="label"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'catalogName'">
                  <a-input v-model:value="catalogRows[index].catalogName" />
                </template>
                <template v-else-if="column.key === 'catalogCode'">
                  <a-input v-model:value="catalogRows[index].catalogCode" />
                </template>
                <template v-else-if="column.key === 'requiredFlag'">
                  <a-checkbox v-model:checked="catalogRows[index].requiredFlag">必交</a-checkbox>
                </template>
                <template v-else-if="column.key === 'delayAllowedFlag'">
                  <a-checkbox v-model:checked="catalogRows[index].delayAllowedFlag">
                    允许延迟
                  </a-checkbox>
                </template>
                <template v-else-if="column.key === 'sortOrder'">
                  <a-input-number
                    v-model:value="catalogRows[index].sortOrder"
                    :min="0"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTextAction tone="danger" @click="removeCatalogRow(index)">删除</UiTextAction>
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
        </UiForm>
      </section>
    </WorkbenchSurfaceCard>

    <ArchiveVolumeListNextStepsPanel variant="settings" />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveDutyGrantItemRequest,
  ArchiveSecurityPolicyItemRequest,
} from '@/apis/mark/archive-config'
import type {
  ArchiveCatalogTemplateSaveItemRequest,
} from '@/apis/mark/archive-volume'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ARCHIVE_DUTY_TYPE_OPTIONS,
  ArchiveDutyTypeCode,
  listArchiveDutyGrants,
  listArchiveSecurityPolicy,
  saveArchiveDutyGrants,
  saveArchiveSecurityPolicy,
} from '@/apis/mark/archive-config'
import { listArchiveTenantTemplateSets } from '@/apis/mark/archive-platform-template'
import {
  ARCHIVE_EXAM_FORM_OPTIONS,
  ARCHIVE_MATERIAL_TYPE_OPTIONS,
  ARCHIVE_SECURITY_LEVEL_OPTIONS,
  listArchiveCatalogTemplate,
  saveArchiveCatalogTemplate,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { ArchiveMaterialTypeCode } from '@/types/enums/archive-material-type-enum'
import { ArchiveSecurityLevelCode } from '@/types/enums/archive-security-level-enum'
import { showUserError } from '@/utils/error-handler'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'
import ArchiveVolumeTemplateSetsPanel from './components/ArchiveVolumeTemplateSetsPanel.vue'

defineOptions({ name: 'ArchiveVolumeSettings' })

const props = defineProps<{
  initialTab?: string
}>()

type DutyRow = ArchiveDutyGrantItemRequest & { rowKey: string }
interface PolicyRow {
  rowKey: string
  dutyType: ArchiveDutyTypeCode
  maxSecurityLevel: ArchiveSecurityLevelCode
}
type CatalogRow = ArchiveCatalogTemplateSaveItemRequest & { rowKey: string }

const settingsTab = ref('templateSets')
const saving = ref(false)
const dutyLoading = ref(false)
const policyLoading = ref(false)
const catalogLoading = ref(false)
const dutyRows = ref<DutyRow[]>([])
const policyRows = ref<PolicyRow[]>([])
const catalogRows = ref<CatalogRow[]>([])
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const tenantTemplateSetCount = ref(0)

const { canManageConfig, loadGrants } = useArchiveDutyAccess()

const settingsSignalMetrics = computed((): SignalMetric[] => [
  { key: 'templateSets', label: '本校模板套', value: tenantTemplateSetCount.value, unit: '套' },
  { key: 'duty', label: '职责授权', value: dutyRows.value.length, unit: '条' },
  { key: 'policy', label: '密级策略', value: policyRows.value.length, unit: '条' },
  { key: 'catalog', label: '目录模板', value: catalogRows.value.length, unit: '项' },
])

function dutyRowKey(row: DutyRow) {
  const scope = row.tenantWide ? 'tenant' : (row.scopeDepartmentId ?? 'none')
  return `${row.userId}:${row.dutyType}:${scope}`
}

function validateDutyRows(): boolean {
  for (const row of dutyRows.value) {
    if (!row.userId?.trim()) {
      message.warning('职责授权需选择用户')
      return false
    }
    if (row.tenantWide && row.scopeDepartmentId) {
      message.warning('全校授权不可同时选择院系')
      return false
    }
    if (!row.tenantWide && !row.scopeDepartmentId && row.dutyType !== ArchiveDutyTypeCode.VOLUME_OWNER) {
      message.warning('非全校授权须选择院系')
      return false
    }
  }
  const keys = dutyRows.value.map(dutyRowKey)
  if (new Set(keys).size !== keys.length) {
    message.warning('存在重复的职责授权行')
    return false
  }
  return true
}

const settingsTabs = [
  { key: 'templateSets', label: '模板套' },
  { key: 'duty', label: '职责授权' },
  { key: 'security', label: '密级策略' },
  { key: 'catalog', label: '目录模板' },
]

function resolveSettingsTab(raw?: string) {
  if (!raw) return 'templateSets'
  if (raw === 'duties') return 'duty'
  const allowed = settingsTabs.map((item) => item.key)
  return allowed.includes(raw) ? raw : 'duty'
}

const dutyTypeOptions = ARCHIVE_DUTY_TYPE_OPTIONS
const securityLevelOptions = ARCHIVE_SECURITY_LEVEL_OPTIONS
const materialTypeOptions = ARCHIVE_MATERIAL_TYPE_OPTIONS
const examFormOptions = ARCHIVE_EXAM_FORM_OPTIONS

const dutyColumns: ColumnsType<DutyRow> = [
  { title: '用户', key: 'userId', width: 220 },
  { title: '职责类型', key: 'dutyType', width: 160 },
  { title: '院系', key: 'scopeDepartmentId', width: 180 },
  { title: '全校', key: 'tenantWide', width: 80 },
  { title: '操作', key: 'actions', width: 80 },
]

const policyColumns: ColumnsType<PolicyRow> = [
  { title: '职责类型', key: 'dutyType', width: 180 },
  { title: '最高密级', key: 'maxSecurityLevel', width: 160 },
  { title: '操作', key: 'actions', width: 80 },
]

const catalogColumns: ColumnsType<CatalogRow> = [
  { title: '考核形式', key: 'examForm', width: 140 },
  { title: '材料类型', key: 'materialType', width: 180 },
  { title: '目录名称', key: 'catalogName', width: 160 },
  { title: '目录编码', key: 'catalogCode', width: 120 },
  { title: '必交', key: 'requiredFlag', width: 80 },
  { title: '延迟', key: 'delayAllowedFlag', width: 80 },
  { title: '排序', key: 'sortOrder', width: 80 },
  { title: '操作', key: 'actions', width: 80 },
]

function newRowKey() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function addDutyRow() {
  dutyRows.value.push({
    rowKey: newRowKey(),
    userId: '',
    dutyType: ArchiveDutyTypeCode.VOLUME_OWNER,
    scopeDepartmentId: undefined,
    tenantWide: false,
  })
}

function removeDutyRow(index: number) {
  dutyRows.value.splice(index, 1)
}

function handleTenantWideChange(index: number) {
  if (dutyRows.value[index]?.tenantWide) {
    dutyRows.value[index].scopeDepartmentId = undefined
  }
}

async function loadTemplateSetStats() {
  try {
    const sets = await listArchiveTenantTemplateSets()
    tenantTemplateSetCount.value = sets.filter((item) => item.templateScope === 'TENANT').length
  } catch (error) {
    showUserError(error, '加载模板套统计失败')
    tenantTemplateSetCount.value = 0
  }
}

async function loadDepartments() {
  try {
    const departments = await departmentCatalogApi.list()
    departmentOptions.value = departments.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
  } catch (error) {
    showUserError(error)
  }
}

function addPolicyRow() {
  policyRows.value.push({
    rowKey: newRowKey(),
    dutyType: ArchiveDutyTypeCode.ARCHIVE_ADMIN,
    maxSecurityLevel: ArchiveSecurityLevelCode.INTERNAL,
  })
}

function removePolicyRow(index: number) {
  policyRows.value.splice(index, 1)
}

function addCatalogRow() {
  catalogRows.value.push({
    rowKey: newRowKey(),
    materialType: ArchiveMaterialTypeCode.VOLUME_CATALOG,
    catalogName: '',
    catalogCode: '',
    requiredFlag: true,
    delayAllowedFlag: false,
    sortOrder: catalogRows.value.length + 1,
  })
}

function removeCatalogRow(index: number) {
  catalogRows.value.splice(index, 1)
}

async function loadDutyGrants() {
  dutyLoading.value = true
  try {
    const grants = await listArchiveDutyGrants()
    dutyRows.value = grants.map((item) => ({
      rowKey: item.grantId,
      userId: item.userId,
      dutyType: item.dutyType,
      scopeDepartmentId: item.scopeDepartmentId,
      tenantWide: item.tenantWide,
    }))
  } catch (error) {
    showUserError(error, '加载职责授权失败')
    dutyRows.value = []
  } finally {
    dutyLoading.value = false
  }
}

async function loadPolicy() {
  policyLoading.value = true
  try {
    const policies = await listArchiveSecurityPolicy()
    policyRows.value = policies.map((item) => ({
      rowKey: item.policyId,
      dutyType: item.dutyType,
      maxSecurityLevel: item.maxSecurityLevel,
    }))
  } catch (error) {
    showUserError(error, '加载密级策略失败')
    policyRows.value = []
  } finally {
    policyLoading.value = false
  }
}

async function loadCatalog() {
  catalogLoading.value = true
  try {
    const templates = await listArchiveCatalogTemplate()
    catalogRows.value = templates.map((item) => ({
      rowKey: item.templateItemId,
      examForm: item.examForm,
      materialType: item.materialType,
      catalogCode: item.catalogCode,
      catalogName: item.catalogName ?? '',
      requiredFlag: item.requiredFlag ?? false,
      delayAllowedFlag: item.delayAllowedFlag,
      sortOrder: item.sortOrder ?? 0,
    }))
  } catch (error) {
    showUserError(error, '加载目录模板失败')
    catalogRows.value = []
  } finally {
    catalogLoading.value = false
  }
}

async function saveDutyGrants() {
  if (!validateDutyRows()) return
  saving.value = true
  try {
    await saveArchiveDutyGrants(dutyRows.value.map((item): ArchiveDutyGrantItemRequest => ({
      userId: item.userId,
      dutyType: item.dutyType,
      scopeDepartmentId: item.scopeDepartmentId,
      tenantWide: item.tenantWide,
    })))
    message.success('职责授权已保存')
    await loadDutyGrants()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function saveSecurityPolicyRows() {
  if (policyRows.value.length === 0) {
    message.warning('至少保留一条密级策略')
    return
  }
  for (const row of policyRows.value) {
    if (!row.dutyType || !row.maxSecurityLevel) {
      message.warning('密级策略须完整填写职责类型与最高密级')
      return
    }
  }
  saving.value = true
  try {
    await saveArchiveSecurityPolicy(policyRows.value.map((item): ArchiveSecurityPolicyItemRequest => ({
      dutyType: item.dutyType,
      maxSecurityLevel: item.maxSecurityLevel,
    })))
    message.success('密级策略已保存')
    await loadPolicy()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function saveCatalogRows() {
  if (catalogRows.value.length === 0) {
    message.warning('至少保留一条目录模板项')
    return
  }
  for (const row of catalogRows.value) {
    if (!row.materialType || !row.catalogCode?.trim()) {
      message.warning('目录模板须填写材料类型与目录编码')
      return
    }
    if (!row.catalogName?.trim()) {
      message.warning('目录模板须填写目录名称')
      return
    }
  }
  saving.value = true
  try {
    await saveArchiveCatalogTemplate({
      items: catalogRows.value.map((item): ArchiveCatalogTemplateSaveItemRequest => ({
        examForm: item.examForm,
        materialType: item.materialType,
        catalogCode: item.catalogCode?.trim() || undefined,
        catalogName: item.catalogName.trim(),
        requiredFlag: item.requiredFlag,
        delayAllowedFlag: item.delayAllowedFlag,
        sortOrder: item.sortOrder,
      })),
    })
    message.success('目录模板已保存')
    await loadCatalog()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

watch(
  () => props.initialTab,
  (tab) => {
    settingsTab.value = resolveSettingsTab(tab)
  },
  { immediate: true },
)

onMounted(() => {
  settingsTab.value = resolveSettingsTab(props.initialTab)
  void loadGrants()
  void loadDepartments()
  void loadTemplateSetStats()
  void loadDutyGrants()
  void loadPolicy()
  void loadCatalog()
})
</script>

<style scoped lang="scss">
.archive-volume-settings__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-settings__section-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  width: 100%;
}

.archive-volume-settings__section-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-muted);
}

.archive-volume-settings__section-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
</style>
