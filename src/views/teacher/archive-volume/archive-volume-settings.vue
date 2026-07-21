<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="归档配置"
        subtitle="租户级模板母版、档案岗位与密级矩阵（任务级设置在详情「任务设置」）"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goArchiveList"> 返回归档列表 </UiButton>
          <UiButton variant="primary" size="sm" @click="goCreateArchiveTask">
            新建课程考核袋
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goCreateHistorySupplement">
            历史补录
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <div class="archive-volume-settings__signal-stack">
        <UiAlertStrip
          v-if="s1TipVisible"
          class="archive-volume-settings__s1-tip"
          :tone="s1TipTone"
          :title="s1TipTitle"
          :description="s1TipDescription"
          dense
        >
          <template #actions>
            <UiButton
              v-if="s1PrimaryActionLabel"
              size="sm"
              variant="primary"
              @click="goS1PrimaryAction"
            >
              {{ s1PrimaryActionLabel }}
            </UiButton>
            <UiButton
              v-if="s1ShowExamListSecondary"
              size="sm"
              variant="outline"
              @click="goExamListForArchive"
            >
              考试列表
            </UiButton>
            <UiButton
              v-if="s1AttentionLoadFailed"
              size="sm"
              variant="outline"
              :loading="s1AttentionLoading"
              @click="loadS1AutoCreateAttention"
            >
              重试
            </UiButton>
          </template>
        </UiAlertStrip>
        <SignalBand variant="panel" :metrics="settingsSignalMetrics" />
      </div>
    </template>

    <WorkbenchSurfaceCard flush class="archive-volume-settings__surface">
      <template #head>
        <UiSectionTabs v-model="settingsTab" :items="settingsTabs" compact />
      </template>

      <section v-if="settingsTab === 'templateSets'" class="archive-volume-settings__panel">
        <ArchiveVolumeTemplateSetsPanel />
      </section>

      <section v-else-if="settingsTab === 'duty'" class="archive-volume-settings__panel">
        <UiEmpty
          size="sm"
          v-if="dutyLoadFailed || departmentLoadFailed"
          description="职责授权配置加载失败"
        >
          <template #action>
            <UiButton
              size="sm"
              variant="outline"
              @click="
                () => {
                  loadDepartments()
                  loadDutyGrants()
                }
              "
            >
              重新加载
            </UiButton>
          </template>
        </UiEmpty>
        <UiForm v-else :disabled="dutyLoading || saving || !canManageArchiveConfig">
          <WorkbenchSurfaceCard flush>
            <template #head>
              <span>档案管理岗位</span>
            </template>
            <template #toolbar>
              <div class="archive-volume-settings__section-toolbar">
                <span class="archive-volume-settings__section-hint">
                  配置归档职责类型、院系范围与全校授权（含部门档案员）
                </span>
                <div class="archive-volume-settings__section-actions">
                  <UiButton
                    v-if="canManageArchiveConfig"
                    size="sm"
                    variant="outline"
                    @click="addDutyRow"
                  >
                    新增授权
                  </UiButton>
                  <UiButton size="sm" variant="primary" :loading="saving" @click="saveDutyGrants">
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
                    :options="ARCHIVE_DUTY_TYPE_OPTIONS"
                    :allow-clear="false"
                  />
                </template>
                <template v-else-if="column.key === 'scopeDepartmentId'">
                  <span
                    v-if="dutyRows[index].tenantWide"
                    class="archive-volume-settings__duty-wide"
                  >
                    —（全校）
                  </span>
                  <UiSelect
                    v-else
                    v-model="dutyRows[index].scopeDepartmentId"
                    :options="departmentOptions"
                    placeholder="院系（可选）"
                    allow-search
                  />
                </template>
                <template v-else-if="column.key === 'tenantWide'">
                  <UiCheckbox
                    v-model="dutyRows[index].tenantWide"
                    @change="handleTenantWideChange(index)"
                  >
                    全校
                  </UiCheckbox>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTableActions
                    v-if="canManageArchiveConfig"
                    :items="[{ key: 'delete', label: '删除', tone: 'danger' }]"
                    split
                    @action="() => removeDutyRow(index)"
                  />
                </template>
              </template>
            </UiDataTable>
            <div class="archive-volume-settings__duty-footer">
              共 {{ dutyRows.length }} 条职责授权
            </div>
          </WorkbenchSurfaceCard>
        </UiForm>
      </section>

      <section v-else-if="settingsTab === 'security'" class="archive-volume-settings__panel">
        <UiEmpty size="sm" v-if="policyLoadFailed" description="密级策略加载失败">
          <template #action>
            <UiButton size="sm" variant="outline" @click="loadPolicy">重新加载</UiButton>
          </template>
        </UiEmpty>
        <UiForm v-else :disabled="policyLoading || saving || !canManageArchiveConfig">
          <WorkbenchSurfaceCard flush>
            <template #head>
              <span>密级访问矩阵</span>
            </template>
            <template #toolbar>
              <div class="archive-volume-settings__section-toolbar">
                <span class="archive-volume-settings__section-hint">
                  按职责类型限制可访问的最高密级
                </span>
                <div class="archive-volume-settings__section-actions">
                  <UiButton
                    v-if="canManageArchiveConfig"
                    size="sm"
                    variant="outline"
                    @click="addPolicyRow"
                  >
                    新增策略
                  </UiButton>
                  <UiButton
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
                  <UiSelect
                    size="sm"
                    v-model="policyRows[index].dutyType"
                    :options="ARCHIVE_DUTY_TYPE_OPTIONS"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'maxSecurityLevel'">
                  <UiSelect
                    size="sm"
                    v-model="policyRows[index].maxSecurityLevel"
                    :options="ARCHIVE_SECURITY_LEVEL_OPTIONS"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTableActions
                    v-if="canManageArchiveConfig"
                    :items="[{ key: 'delete', label: '删除', tone: 'danger' }]"
                    split
                    @action="() => removePolicyRow(index)"
                  />
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
        </UiForm>
      </section>

      <section v-else-if="settingsTab === 'collaboration'" class="archive-volume-settings__panel">
        <UiEmpty size="sm" v-if="collaborationLoadFailed" description="协作策略加载失败">
          <template #action>
            <UiButton size="sm" variant="outline" @click="loadCollaborationPolicy">
              重新加载
            </UiButton>
          </template>
        </UiEmpty>
        <UiForm v-else :disabled="collaborationLoading || saving || !canManageArchiveConfig">
          <WorkbenchSurfaceCard flush>
            <template #head>
              <span>协作与提交策略</span>
            </template>
            <template #toolbar>
              <div class="archive-volume-settings__section-toolbar">
                <span class="archive-volume-settings__section-hint">
                  控制成员自动加入、提交权、扫描台派单中枢列表模式等租户级协作规则
                </span>
                <UiButton
                  size="sm"
                  variant="primary"
                  :loading="saving"
                  @click="saveCollaborationPolicyForm"
                >
                  保存协作策略
                </UiButton>
              </div>
            </template>
            <div class="archive-volume-settings__collaboration-form">
              <label class="archive-volume-settings__field">
                <span>提交权模式</span>
                <UiSelect
                  v-model="collaborationForm.submitMode"
                  :options="submitModeOptions"
                  :allow-clear="false"
                />
              </label>
              <label class="archive-volume-settings__field">
                <span>扫描台派单中枢列表</span>
                <UiSelect
                  v-model="collaborationForm.kioskHubListMode"
                  :options="kioskHubListModeOptions"
                  :allow-clear="false"
                />
              </label>
              <UiCheckbox v-model="collaborationForm.autoSeedExamReviewers">
                自动加入考试阅卷老师为协作成员
              </UiCheckbox>
              <UiCheckbox v-model="collaborationForm.autoSeedCourseTeachers">
                自动加入课程任课老师为协作成员
              </UiCheckbox>
              <UiCheckbox v-model="collaborationForm.coordinatorImplicitSubmit">
                学院协调员隐式具备提交权
              </UiCheckbox>
              <UiCheckbox v-model="collaborationForm.scanOperatorMayEditCatalog">
                扫描员可编辑编目与自查
              </UiCheckbox>
            </div>
          </WorkbenchSurfaceCard>
        </UiForm>
      </section>

      <section v-else-if="settingsTab === 'deadline'" class="archive-volume-settings__panel">
        <UiEmpty
          size="sm"
          v-if="deadlineLoadFailed || departmentLoadFailed"
          description="归档时限策略加载失败"
        >
          <template #action>
            <UiButton
              size="sm"
              variant="outline"
              @click="
                () => {
                  loadDepartments()
                  loadDeadlinePolicy()
                }
              "
            >
              重新加载
            </UiButton>
          </template>
        </UiEmpty>
        <UiForm v-else :disabled="deadlineLoading || saving || !canManageArchiveConfig">
          <WorkbenchSurfaceCard flush>
            <template #head>
              <span>归档时限策略</span>
            </template>
            <template #toolbar>
              <div class="archive-volume-settings__section-toolbar">
                <span class="archive-volume-settings__section-hint">
                  须保留一条租户默认；可按院系覆盖法规节点、临期提醒与院系审核门禁
                </span>
                <div class="archive-volume-settings__section-actions">
                  <UiButton
                    v-if="canManageArchiveConfig"
                    size="sm"
                    variant="outline"
                    @click="addDeadlineRow"
                  >
                    新增院系策略
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="primary"
                    :loading="saving"
                    @click="saveDeadlinePolicyRows"
                  >
                    保存时限策略
                  </UiButton>
                </div>
              </div>
            </template>
            <UiDataTable
              pagination-mode="none"
              :columns="deadlineColumns"
              :data-source="deadlineRows"
              :loading="deadlineLoading"
              :show-pagination="false"
              flat
              row-key="rowKey"
              size="middle"
              empty-description="暂无时限策略"
            >
              <template #bodyCell="{ column, index }">
                <template v-if="column.key === 'scope'">
                  {{ deadlineRows[index].isTenantDefault ? '租户默认' : '院系覆盖' }}
                </template>
                <template v-else-if="column.key === 'departmentId'">
                  <UiSelect
                    v-model="deadlineRows[index].departmentId"
                    :options="departmentOptions"
                    :disabled="deadlineRows[index].isTenantDefault"
                    placeholder="选择院系"
                    allow-search
                  />
                </template>
                <template v-else-if="column.key === 'deadlineTier'">
                  <UiSelect
                    v-model="deadlineRows[index].deadlineTier"
                    :options="ARCHIVE_DEADLINE_TIER_OPTIONS"
                    :allow-clear="false"
                  />
                </template>
                <template v-else-if="column.key === 'leadDays'">
                  <UiInputNumber
                    size="sm"
                    v-model="deadlineRows[index].leadDays"
                    :min="1"
                    :max="90"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'overdueSubmitBlock'">
                  <UiCheckbox v-model="deadlineRows[index].overdueSubmitBlock">
                    逾期硬阻断
                  </UiCheckbox>
                </template>
                <template v-else-if="column.key === 'departmentReviewEnabled'">
                  <UiCheckbox v-model="deadlineRows[index].departmentReviewEnabled">
                    启用院系审核
                  </UiCheckbox>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiTableActions
                    v-if="canManageArchiveConfig"
                    :items="[
                      {
                        key: 'delete',
                        label: '删除',
                        tone: 'danger',
                        disabled: deadlineRows[index].isTenantDefault,
                      },
                    ]"
                    split
                    @action="() => removeDeadlineRow(index)"
                  />
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
        </UiForm>
      </section>

      <section v-else-if="settingsTab === 'externalFonds'" class="archive-volume-settings__panel">
        <ArchiveExternalFondsRetryPanel />
      </section>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveDeadlinePolicyItemRequest,
  ArchiveDutyGrantItemRequest,
  ArchiveSecurityPolicyItemRequest,
  ArchiveTenantCollaborationPolicySaveRequest,
} from '@/apis/mark/archive-config'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ARCHIVE_DUTY_TYPE_OPTIONS,
  ArchiveDutyTypeCode,
  getArchiveCollaborationPolicy,
  listArchiveDeadlinePolicy,
  listArchiveDutyGrants,
  listArchiveSecurityPolicy,
  saveArchiveCollaborationPolicy,
  saveArchiveDeadlinePolicy,
  saveArchiveDutyGrants,
  saveArchiveSecurityPolicy,
} from '@/apis/mark/archive-config'
import { listArchiveTenantTemplateSets } from '@/apis/mark/archive-platform-template'
import { ARCHIVE_SECURITY_LEVEL_OPTIONS } from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveS1AutoCreateAttention } from '@/composables/useArchiveS1AutoCreateAttention'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import {
  ARCHIVE_DEADLINE_TIER_OPTIONS,
  ArchiveDeadlineTierCode,
} from '@/types/enums/archive-deadline-tier-enum'
import {
  ALL_ARCHIVE_KIOSK_HUB_LIST_MODE_CODES,
  ArchiveKioskHubListModeDescription,
} from '@/types/enums/archive-kiosk-hub-list-mode-enum'
import { ArchiveSecurityLevelCode } from '@/types/enums/archive-security-level-enum'
import {
  ALL_ARCHIVE_SUBMIT_MODE_CODES,
  ArchiveSubmitModeDescription,
} from '@/types/enums/archive-submit-mode-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveExternalFondsRetryPanel from './components/ArchiveExternalFondsRetryPanel.vue'
import ArchiveVolumeTemplateSetsPanel from './components/ArchiveVolumeTemplateSetsPanel.vue'

defineOptions({ name: 'ArchiveVolumeSettings' })

const props = defineProps<{
  initialTab?: string
}>()

const route = useRoute()
const authStore = useAuthStore()
const userStore = useUserStore()
/** MVR-314：与路由 requireTenantAdmin / BE requireTenantAdminForConfig 同源 */
const canManageArchiveConfig = computed(
  () => authStore.userRole === RoleEnum.SUPER_ADMIN || userStore.isTenantAdmin,
)

const router = useRouter()
const {
  loading: s1AttentionLoading,
  loadFailed: s1AttentionLoadFailed,
  tipVisible: s1TipVisible,
  tipTone: s1TipTone,
  tipTitle: s1TipTitle,
  tipDescription: s1TipDescription,
  primaryActionLabel: s1PrimaryActionLabel,
  showExamListSecondary: s1ShowExamListSecondary,
  load: loadS1AutoCreateAttention,
  goExamList: goExamListForArchive,
  goPrimaryAction: goS1PrimaryAction,
} = useArchiveS1AutoCreateAttention()

type DutyRow = ArchiveDutyGrantItemRequest & { rowKey: string }
interface PolicyRow {
  rowKey: string
  dutyType: ArchiveDutyTypeCode
  maxSecurityLevel: ArchiveSecurityLevelCode
}

interface DeadlineRow {
  rowKey: string
  isTenantDefault: boolean
  departmentId?: string
  deadlineTier: ArchiveDeadlineTierCode
  leadDays: number
  overdueSubmitBlock: boolean
  departmentReviewEnabled: boolean
}

const settingsTab = ref('templateSets')
const saving = ref(false)
const dutyLoading = ref(false)
const policyLoading = ref(false)
const deadlineLoading = ref(false)
const collaborationLoading = ref(false)
const dutyLoadFailed = ref(false)
const policyLoadFailed = ref(false)
const deadlineLoadFailed = ref(false)
const collaborationLoadFailed = ref(false)
const departmentLoadFailed = ref(false)
const dutyRows = ref<DutyRow[]>([])
const policyRows = ref<PolicyRow[]>([])
const deadlineRows = ref<DeadlineRow[]>([])
const collaborationForm = ref<ArchiveTenantCollaborationPolicySaveRequest>({
  autoSeedExamReviewers: true,
  autoSeedCourseTeachers: true,
  coordinatorImplicitSubmit: false,
  scanOperatorMayEditCatalog: false,
  submitMode: ALL_ARCHIVE_SUBMIT_MODE_CODES[0],
  kioskHubListMode: ALL_ARCHIVE_KIOSK_HUB_LIST_MODE_CODES[0],
})
const submitModeOptions = ALL_ARCHIVE_SUBMIT_MODE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveSubmitModeDescription, value, '归档提交模式'),
}))
const kioskHubListModeOptions = ALL_ARCHIVE_KIOSK_HUB_LIST_MODE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ArchiveKioskHubListModeDescription, value, '一体机派单中枢列表模式'),
}))
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const tenantTemplateSetCount = ref(0)

function goArchiveList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goCreateArchiveTask() {
  void router.push({
    name: 'TeacherCreateArchiveTask',
    query: { provenance: 'CURRENT_TERM_OFFLINE' },
  })
}

function goCreateHistorySupplement() {
  void router.push({
    name: 'TeacherCreateArchiveTask',
    query: { provenance: 'HISTORICAL_DIGITIZE' },
  })
}

const settingsSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'templateSets',
    label: '模板母版',
    value: tenantTemplateSetCount.value,
    unit: '套',
    iconTone: 'blue',
    helper: '平台母版 + 本校副本',
  },
  { key: 'duty', label: '档案岗位', value: dutyRows.value.length, unit: '条', helper: '职责授权' },
  {
    key: 'policy',
    label: '密级矩阵',
    value: policyRows.value.length,
    unit: '条',
    helper: '按职责限制最高密级',
  },
  {
    key: 'deadline',
    label: '时限策略',
    value: deadlineRows.value.length,
    unit: '条',
    helper: '租户默认 + 院系覆盖',
  },
])

function dutyRowKey(row: DutyRow) {
  const scope = row.tenantWide ? 'tenant' : (row.scopeDepartmentId ?? 'none')
  return `${row.userId}:${row.dutyType}:${scope}`
}

function validateDutyRows(): boolean {
  for (const row of dutyRows.value) {
    if (!row.userId?.trim()) {
      showFormValidationMessage('职责授权需选择用户')
      return false
    }
    if (row.tenantWide && row.scopeDepartmentId) {
      showFormValidationMessage('全校授权不可同时选择院系')
      return false
    }
    if (
      !row.tenantWide
      && !row.scopeDepartmentId
      && row.dutyType !== ArchiveDutyTypeCode.VOLUME_OWNER
    ) {
      showFormValidationMessage('非全校授权须选择院系')
      return false
    }
  }
  const keys = dutyRows.value.map(dutyRowKey)
  if (new Set(keys).size !== keys.length) {
    showFormValidationMessage('存在重复的职责授权行')
    return false
  }
  return true
}

const settingsTabs = [
  { key: 'templateSets', label: '模板母版' },
  { key: 'duty', label: '档案管理岗位' },
  { key: 'security', label: '密级访问矩阵' },
  { key: 'collaboration', label: '协作策略' },
  { key: 'deadline', label: '归档时限' },
  { key: 'externalFonds', label: '外部全宗重试' },
]

function resolveSettingsTab(raw?: string) {
  if (!raw) return 'templateSets'
  if (raw === 'duties') return 'duty'
  if (raw === 'catalog') return 'templateSets'
  const allowed = settingsTabs.map((item) => item.key)
  return allowed.includes(raw) ? raw : 'templateSets'
}

function readTabFromRoute(): string {
  const queryTab = route.query.settingsTab ?? route.query.tab
  if (typeof queryTab === 'string') {
    return resolveSettingsTab(queryTab)
  }
  return resolveSettingsTab(props.initialTab)
}

function syncRouteQueryTab(tab: string) {
  if (route.query.settingsTab === tab) return
  void router.replace({
    query: {
      ...route.query,
      settingsTab: tab,
    },
  })
}

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

const deadlineColumns: ColumnsType<DeadlineRow> = [
  { title: '范围', key: 'scope', width: 96 },
  { title: '院系', key: 'departmentId', width: 180 },
  { title: '法规节点', key: 'deadlineTier', width: 200 },
  { title: '临期提醒(天)', key: 'leadDays', width: 120 },
  { title: '逾期阻断', key: 'overdueSubmitBlock', width: 110 },
  { title: '院系审核', key: 'departmentReviewEnabled', width: 110 },
  { title: '操作', key: 'actions', width: 80 },
]

function newRowKey() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function addDutyRow() {
  // MVR-391：与 canManageArchiveConfig / BE requireTenantAdminForConfig 二次拦截
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  dutyRows.value.push({
    rowKey: newRowKey(),
    userId: '',
    dutyType: ArchiveDutyTypeCode.VOLUME_OWNER,
    scopeDepartmentId: undefined,
    tenantWide: false,
  })
}

function removeDutyRow(index: number) {
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  dutyRows.value.splice(index, 1)
}

function handleTenantWideChange(index: number) {
  if (!canManageArchiveConfig.value) {
    return
  }
  if (dutyRows.value[index]?.tenantWide) {
    dutyRows.value[index].scopeDepartmentId = undefined
  }
}

async function loadTemplateSetStats() {
  try {
    const sets = await listArchiveTenantTemplateSets()
    tenantTemplateSetCount.value = sets.length
  } catch (error) {
    showUserError(error, '加载模板套统计失败')
    tenantTemplateSetCount.value = 0
  }
}

async function loadDepartments() {
  departmentLoadFailed.value = false
  try {
    const departments = await departmentCatalogApi.list()
    departmentOptions.value = departments.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
  } catch (error) {
    departmentLoadFailed.value = true
    showUserError(error, '院系列表加载失败')
  }
}

function addPolicyRow() {
  // MVR-391：与 canManageArchiveConfig 二次拦截
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  policyRows.value.push({
    rowKey: newRowKey(),
    dutyType: ArchiveDutyTypeCode.ARCHIVE_ADMIN,
    maxSecurityLevel: ArchiveSecurityLevelCode.INTERNAL,
  })
}

function removePolicyRow(index: number) {
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  policyRows.value.splice(index, 1)
}

function buildDefaultDeadlineRow(isTenantDefault: boolean): DeadlineRow {
  return {
    rowKey: newRowKey(),
    isTenantDefault,
    departmentId: undefined,
    deadlineTier: ArchiveDeadlineTierCode.FACULTY_WINTER_BREAK,
    leadDays: 14,
    overdueSubmitBlock: false,
    departmentReviewEnabled: true,
  }
}

function addDeadlineRow() {
  // MVR-391：与 canManageArchiveConfig 二次拦截
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  deadlineRows.value.push(buildDefaultDeadlineRow(false))
}

function removeDeadlineRow(index: number) {
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  if (deadlineRows.value[index]?.isTenantDefault) return
  deadlineRows.value.splice(index, 1)
}

function deadlineRowKey(row: DeadlineRow) {
  return row.isTenantDefault ? 'tenant-default' : `dept:${row.departmentId ?? 'none'}`
}

function validateDeadlineRows(): boolean {
  const tenantDefaultCount = deadlineRows.value.filter((row) => row.isTenantDefault).length
  if (tenantDefaultCount !== 1) {
    showFormValidationMessage('须且仅须保留一条租户默认时限策略')
    return false
  }
  for (const row of deadlineRows.value) {
    if (!row.isTenantDefault && !row.departmentId) {
      showFormValidationMessage('院系覆盖策略须选择院系')
      return false
    }
    if (!row.deadlineTier || !row.leadDays) {
      showFormValidationMessage('时限策略须完整填写法规节点与临期提醒天数')
      return false
    }
  }
  const keys = deadlineRows.value.map(deadlineRowKey)
  if (new Set(keys).size !== keys.length) {
    showFormValidationMessage('存在重复的院系时限策略')
    return false
  }
  return true
}

async function loadCollaborationPolicy() {
  collaborationLoading.value = true
  collaborationLoadFailed.value = false
  try {
    collaborationForm.value = await getArchiveCollaborationPolicy()
  } catch (error) {
    collaborationLoadFailed.value = true
    showUserError(error, '加载协作策略失败')
  } finally {
    collaborationLoading.value = false
  }
}

async function saveCollaborationPolicyForm() {
  if (collaborationLoadFailed.value || saving.value) return
  // MVR-314：配置写二次拦截
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  saving.value = true
  try {
    await saveArchiveCollaborationPolicy({ ...collaborationForm.value })
    void message.success('协作策略已保存')
    await loadCollaborationPolicy()
  } catch (error) {
    showUserError(error, '保存协作策略失败')
  } finally {
    saving.value = false
  }
}

async function loadDeadlinePolicy() {
  deadlineLoading.value = true
  deadlineLoadFailed.value = false
  try {
    const policies = await listArchiveDeadlinePolicy()
    if (policies.length === 0) {
      deadlineRows.value = [buildDefaultDeadlineRow(true)]
      return
    }
    deadlineRows.value = policies.map((item) => ({
      rowKey: item.policyId,
      isTenantDefault: !item.departmentId,
      departmentId: item.departmentId,
      deadlineTier: item.deadlineTier,
      leadDays: item.leadDays,
      overdueSubmitBlock: item.overdueSubmitBlock,
      departmentReviewEnabled: item.departmentReviewEnabled,
    }))
    if (!deadlineRows.value.some((row) => row.isTenantDefault)) {
      deadlineRows.value.unshift(buildDefaultDeadlineRow(true))
    }
  } catch (error) {
    deadlineLoadFailed.value = true
    showUserError(error, '加载时限策略失败')
  } finally {
    deadlineLoading.value = false
  }
}

async function saveDeadlinePolicyRows() {
  if (deadlineLoadFailed.value || departmentLoadFailed.value || saving.value) return
  if (!validateDeadlineRows()) return
  // MVR-314：配置写二次拦截
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  saving.value = true
  try {
    await saveArchiveDeadlinePolicy(
      deadlineRows.value.map((item): ArchiveDeadlinePolicyItemRequest => ({
        departmentId: item.isTenantDefault ? undefined : item.departmentId,
        deadlineTier: item.deadlineTier,
        leadDays: item.leadDays,
        overdueSubmitBlock: item.overdueSubmitBlock,
        departmentReviewEnabled: item.departmentReviewEnabled,
      })),
    )
    void message.success('时限策略已保存')
    await loadDeadlinePolicy()
  } catch (error) {
    showUserError(error, '保存时限策略失败')
  } finally {
    saving.value = false
  }
}

async function loadDutyGrants() {
  dutyLoading.value = true
  dutyLoadFailed.value = false
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
    dutyLoadFailed.value = true
    showUserError(error, '加载职责授权失败')
  } finally {
    dutyLoading.value = false
  }
}

async function loadPolicy() {
  policyLoading.value = true
  policyLoadFailed.value = false
  try {
    const policies = await listArchiveSecurityPolicy()
    policyRows.value = policies.map((item) => ({
      rowKey: item.policyId,
      dutyType: item.dutyType,
      maxSecurityLevel: item.maxSecurityLevel,
    }))
  } catch (error) {
    policyLoadFailed.value = true
    showUserError(error, '加载密级策略失败')
  } finally {
    policyLoading.value = false
  }
}

async function saveDutyGrants() {
  if (dutyLoadFailed.value || departmentLoadFailed.value || saving.value) return
  if (!validateDutyRows()) return
  // MVR-314：配置写二次拦截
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  saving.value = true
  try {
    await saveArchiveDutyGrants(
      dutyRows.value.map((item): ArchiveDutyGrantItemRequest => ({
        userId: item.userId,
        dutyType: item.dutyType,
        scopeDepartmentId: item.scopeDepartmentId,
        tenantWide: item.tenantWide,
      })),
    )
    void message.success('职责授权已保存')
    await loadDutyGrants()
  } catch (error) {
    showUserError(error, '保存职责授权失败')
  } finally {
    saving.value = false
  }
}

async function saveSecurityPolicyRows() {
  if (policyLoadFailed.value || saving.value) return
  // MVR-314：配置写二次拦截
  if (!canManageArchiveConfig.value) {
    void message.warning('仅超级管理员或租户管理员可维护归档配置')
    return
  }
  if (policyRows.value.length === 0) {
    showFormValidationMessage('至少保留一条密级策略')
    return
  }
  for (const row of policyRows.value) {
    if (!row.dutyType || !row.maxSecurityLevel) {
      showFormValidationMessage('密级策略须完整填写职责类型与最高密级')
      return
    }
  }
  const dutyTypes = policyRows.value.map((row) => row.dutyType)
  if (new Set(dutyTypes).size !== dutyTypes.length) {
    showFormValidationMessage('同一职责类型只能配置一条密级策略')
    return
  }
  saving.value = true
  try {
    await saveArchiveSecurityPolicy(
      policyRows.value.map((item): ArchiveSecurityPolicyItemRequest => ({
        dutyType: item.dutyType,
        maxSecurityLevel: item.maxSecurityLevel,
      })),
    )
    void message.success('密级策略已保存')
    await loadPolicy()
  } catch (error) {
    showUserError(error, '保存密级策略失败')
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.initialTab, route.query.settingsTab, route.query.tab] as const,
  () => {
    settingsTab.value = readTabFromRoute()
  },
  { immediate: true },
)

watch(settingsTab, (tab) => {
  syncRouteQueryTab(tab)
})

onActivated(() => {
  settingsTab.value = readTabFromRoute()
})

onMounted(() => {
  void loadS1AutoCreateAttention()
  settingsTab.value = readTabFromRoute()
  void loadDepartments()
  void loadTemplateSetStats()
  void loadDutyGrants()
  void loadPolicy()
  void loadCollaborationPolicy()
  void loadDeadlinePolicy()
})
</script>

<style scoped lang="scss">
.archive-volume-settings__s1-tip {
  margin-bottom: 0;
}

.archive-volume-settings__signal-stack {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-volume-settings__duty-wide {
  color: var(--dp-text-muted);
}

.archive-volume-settings__duty-footer {
  padding: var(--dp-space-2) var(--dp-space-4);
  border-top: 1px solid var(--dp-border-subtle);
  font-size: 12px;
  color: var(--dp-text-muted);
}
.archive-volume-settings__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-volume-settings__section-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
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

.archive-volume-settings__collaboration-form {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  padding: var(--dp-space-4);
}

.archive-volume-settings__field {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
  max-width: 420px;
}
</style>
