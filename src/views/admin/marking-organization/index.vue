<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="isJourneyChrome ? contextBarTitle : '阅卷组织'"
        :subtitle="isJourneyChrome ? contextBarSubtitle : '阅卷安排'"
      >
        <template #status>
          <UiTag v-if="isJourneyChrome && examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <MarkExamSelect
            v-if="!isExamWorkspaceRoute"
            :selected-exam-id="selectedExamId"
            :exam-options="examOptions"
            :loading="examLoading"
            :searching="searching"
            :resolving-pinned="resolvingPinned"
            select-class="org-index__exam-select"
            placeholder="选择考试"
            @change="onExamChange"
            @search="onExamSearch"
          />
          <UiTag
            v-if="organization"
            :tone="
              strictEnumTone(
                MARKING_ORGANIZATION_STATUS_TONE,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                MarkingOrganizationStatusDescription,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadOrganization"
          >
            刷新
          </UiButton>
          <UiButton
            v-if="selectedExamId && !organization && !loading && canManageExamOwner"
            variant="primary"
            size="sm"
            @click="openCreateDrawer"
          >
            新建组织
          </UiButton>
          <UiButton v-if="organization" variant="primary" size="sm" @click="goDetail">
            进入详情
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && signalMetrics.length > 0" #signal>
      <SignalBand
        :metrics="signalMetrics"
        variant="panel"
        compact
        @metric-click="handleOrgSignalClick"
      />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" class="org-index__empty" />

    <UiSkeletonState v-if="loading" variant="card" compact />

    <WorkbenchSurfaceCard v-else-if="organization" class="org-index__overview-card">
      <UiAlertStrip
        v-if="!canManageExamOwner"
        tone="info"
        class="org-index__readonly-banner"
        title="当前为只读视图"
        description="阅卷方案由考试主考老师配置；如需调整题组、策略或启动正评，请联系主考老师。"
        :inline="false"
      />
      <template #head>
        <div class="org-index__overview-title">
          <ProfileOutlined />
          <span>组织全貌</span>
        </div>
      </template>

      <UiDescriptions
        :column="{ xs: 1, sm: 2, lg: 3 }"
        size="middle"
        bordered
        class="org-index__descriptions"
      >
        <UiDescriptionsItem label="主考老师">
          {{ organization.leaderUserName }}（{{ organization.leaderTeacherNo }}）
        </UiDescriptionsItem>
        <UiDescriptionsItem label="组织状态">
          <UiTag
            :tone="
              strictEnumTone(
                MARKING_ORGANIZATION_STATUS_TONE,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                MarkingOrganizationStatusDescription,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="匿名阅卷">
          <UiTag :tone="organization.anonymousMode ? 'green' : 'gray'" size="sm">
            {{ organization.anonymousMode ? '启用' : '关闭' }}
          </UiTag>
        </UiDescriptionsItem>
        <UiDescriptionsItem label="题组数量">
          {{ organization.groups.length }} 组
        </UiDescriptionsItem>
        <UiDescriptionsItem label="创建时间">
          {{ formatDateTime(organization.createTime) }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="更新时间">
          {{ formatDateTime(organization.updateTime) }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="备注" :span="3">
          <span v-if="organization.remark">
            {{ organization.remark }}
          </span>
          <span v-else class="org-index__hint">-</span>
        </UiDescriptionsItem>
      </UiDescriptions>

      <div class="org-index__actions">
        <UiButton size="sm" @click="goDetail">
          {{ canManageExamOwner ? '管理题组与策略' : '查看题组与策略' }}
        </UiButton>
        <UiButton v-if="canManageExamOwner" size="sm" variant="outline" @click="openEditDrawer">
          编辑组织
        </UiButton>
        <UiButton size="sm" variant="outline" @click="goTrialSessions">试评定标</UiButton>
        <UiButton size="sm" variant="outline" @click="goFormalSessions">正评会话</UiButton>
        <UiButton
          v-if="canManageExamOwner"
          size="sm"
          variant="outline"
          status="danger"
          :loading="deleting"
          @click="requestDeleteOrganization"
        >
          删除组织
        </UiButton>
      </div>
    </WorkbenchSurfaceCard>

    <WorkbenchContextGateStrip
      v-else
      tag="未配置"
      :body="
        canManageExamOwner
          ? '本考试尚未创建阅卷组织；创建后可编排题组、配置分配策略并启动试评/正评'
          : '本考试尚未创建阅卷组织；由考试主考老师创建和分配'
      "
      :hide-cta="!canManageExamOwner"
      cta-label="立即创建阅卷组织"
      class="org-index__panel--empty"
      @cta="openCreateDrawer"
    />

    <!-- 新建组织抽屉 -->
    <UiDrawer
      :open="createDrawerOpen"
      title="新建阅卷组织"
      :width="520"
      :confirm-loading="creating"
      @update:open="(v: boolean) => (createDrawerOpen = v)"
      @close="createDrawerOpen = false"
      @ok="submitCreate"
    >
      <UiForm ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical">
        <UiFormItem label="关联考试">
          <UiInput
            size="sm" :value="organizationExamLabel" disabled
          />
        </UiFormItem>
        <UiFormItem label="是否启用匿名阅卷" name="anonymousMode">
          <UiSwitch size="sm" v-model="createForm.anonymousMode" />
          <span class="org-index__switch-hint">启用后阅卷教师不可见考生身份</span>
        </UiFormItem>
        <UiFormItem label="备注" name="remark">
          <UiTextarea
            size="sm"
            v-model="createForm.remark"
            :rows="3"
            :maxlength="200"
            placeholder="可选，记录组织目的 / 范围"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="editDrawerOpen"
      title="编辑阅卷组织"
      :width="520"
      :confirm-loading="updating"
      @update:open="(v: boolean) => (editDrawerOpen = v)"
      @close="editDrawerOpen = false"
      @ok="submitUpdate"
    >
      <UiForm ref="editFormRef" :model="editForm" :rules="editRules" layout="vertical">
        <UiFormItem label="关联考试">
          <UiInput
            size="sm" :value="organizationExamLabel" disabled
          />
        </UiFormItem>
        <UiFormItem label="是否启用匿名阅卷" name="anonymousMode">
          <UiSwitch size="sm" v-model="editForm.anonymousMode" />
          <span class="org-index__switch-hint">启用后阅卷教师不可见考生身份</span>
        </UiFormItem>
        <UiFormItem label="备注" name="remark">
          <UiTextarea
            size="sm"
            v-model="editForm.remark"
            :rows="3"
            :maxlength="200"
            placeholder="可选，记录组织目的 / 范围"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
/**
 * 阅卷交付 - 阅卷组织详情入口
 *
 * 后端契约（MarkingOrganizationController）：
 * - getOrganization({ examId })  查询当前考试的阅卷组织
 * - createOrganization(request)  创建阅卷组织
 */
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { RouteLocationRaw } from 'vue-router'
import type {
  MarkingOrganizationResponse,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
} from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  MARKING_ORGANIZATION_STATUS_TONE,
  MarkingOrganizationStatusDescription,
  requireMarkingOrganizationId,
  updateOrganization,
} from '@/apis/mark/marking-organization'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useOptionalExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkingOrgPermission } from '@/composables/useMarkingOrgPermission'
import {
  MARK_WORKBENCH_CONTEXT_KEY,
  useWorkspaceExamId,
} from '@/composables/useMarkWorkbenchContext'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  resolveMarkingOrganizationDetailRoute,
  resolveMarkingOrganizationFormalHubRoute,
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminMarkingOrganizationIndex' })

const router = useRouter()
const route = useRoute()

const { isJourneyChrome, contextBarTitle, contextBarSubtitle, examStatusLabel, examStatusTone }
  = useOptionalExamJourneyContextBar('阅卷安排')

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExam,
  selectedExamLabel,
  onExamChange,
  onExamSearch,
  searching,
  resolvingPinned,
  init: initExamSelector,
} = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

const organization = ref<MarkingOrganizationResponse | null>(null)
const examCreateUserId = computed(() => selectedExam.value?.createUser)
const { canManageExamOwner } = useMarkingOrgPermission(examCreateUserId, organization)
const loading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳

const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')

function guardExamOwnerAction(): boolean {
  if (canManageExamOwner.value) return true
  showFormValidationMessage('仅考试主考老师可执行该操作')
  return false
}

const organizationExamLabel = computed(() => {
  if (organization.value?.examName) {
    return organization.value.examNo
      ? `${organization.value.examName} (${organization.value.examNo})`
      : organization.value.examName
  }
  return selectedExamLabel.value || '未选择考试'
})

async function loadOrganization(): Promise<void> {
  if (!selectedExamId.value) {
    organization.value = null
    return
  }
  loading.value = true
  try {
    const nextOrganization = await getOrganization({ examId: selectedExamId.value })
    if (!nextOrganization.configured) {
      organization.value = null
      return
    }
    organization.value = nextOrganization
  } catch (error) {
    organization.value = null
    showUserError(error, '阅卷组织加载失败')
  } finally {
    loading.value = false
  }
}

const signalMetrics = computed<SignalMetric[]>(() => {
  const org = organization.value
  if (org) {
    const groupCount = org.groups.length
    return [
      {
        key: 'groups',
        label: '题组数',
        value: groupCount,
        tone: groupCount > 0 ? 'blue' : 'orange',
      },
      {
        key: 'anonymous',
        label: '匿名阅卷',
        value: org.anonymousMode ? '已启用' : '关闭',
        tone: org.anonymousMode ? 'green' : 'gray',
      },
      {
        key: 'status',
        label: '组织状态',
        value: strictEnumLabel(
          MarkingOrganizationStatusDescription,
          org.organizationStatus,
          '阅卷组织状态',
        ),
        tone: strictEnumTone(
          MARKING_ORGANIZATION_STATUS_TONE,
          org.organizationStatus,
          '阅卷组织状态',
        ),
      },
    ]
  }
  const snapshot = workbenchContext?.snapshot.value
  if (snapshot && !snapshot.markingOrgConfigured) {
    return [
      {
        key: 'org-pending',
        label: '阅卷设置',
        value: '待配置',
        tone: 'orange',
        clickable: canManageExamOwner.value,
      },
    ]
  }
  return []
})

function handleOrgSignalClick(key: string): void {
  if (key === 'org-pending' && canManageExamOwner.value) {
    openCreateDrawer()
  }
}

const createDrawerOpen = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()

interface CreateForm {
  anonymousMode: boolean
  remark?: string
}

const createForm = reactive<CreateForm>({
  anonymousMode: true,
  remark: '',
})

const createRules: Record<string, Rule[]> = {
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

const editDrawerOpen = ref(false)
const updating = ref(false)
const deleting = ref(false)
const editFormRef = ref<FormInstance>()

interface EditForm {
  anonymousMode: boolean
  remark?: string
}

const editForm = reactive<EditForm>({
  anonymousMode: true,
  remark: '',
})

const editRules: Record<string, Rule[]> = {
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

function openCreateDrawer(): void {
  if (!guardExamOwnerAction()) return
  if (!selectedExamId.value) {
    showFormValidationMessage('请先选择考试')
    return
  }
  createForm.anonymousMode = true
  createForm.remark = ''
  createDrawerOpen.value = true
}

async function submitCreate(): Promise<void> {
  if (creating.value) return
  if (!guardExamOwnerAction()) return
  if (!selectedExamId.value || !createFormRef.value) return
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    const request: OrganizationCreateRequest = {
      examId: selectedExamId.value,
      anonymousMode: createForm.anonymousMode,
      remark: createForm.remark?.trim() || undefined,
    }
    organization.value = await createOrganization(request)
    message.success('阅卷组织已创建')
    createDrawerOpen.value = false
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷组织创建失败')
  } finally {
    creating.value = false
  }
}

function openEditDrawer(): void {
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  editForm.anonymousMode = Boolean(organization.value.anonymousMode)
  editForm.remark = organization.value.remark || ''
  editDrawerOpen.value = true
}

async function submitUpdate(): Promise<void> {
  if (!guardExamOwnerAction()) return
  if (!organization.value || !editFormRef.value) return
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }
  updating.value = true
  try {
    const request: OrganizationUpdateRequest = {
      organizationId: requireMarkingOrganizationId(organization.value),
      anonymousMode: editForm.anonymousMode,
      remark: editForm.remark?.trim() || undefined,
    }
    organization.value = await updateOrganization(request)
    message.success('阅卷组织已更新')
    editDrawerOpen.value = false
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷组织更新失败')
  } finally {
    updating.value = false
  }
}

async function requestDeleteOrganization(): Promise<void> {
  const ok = await confirmAsync({
    title: '确认删除该阅卷组织？',
    content: '删除后不可恢复；请确认组织下无进行中的试评/正评会话。',
    type: 'error',
    okText: '删除',
  })
  if (!ok) {
    return
  }
  await submitDelete()
}

async function submitDelete(): Promise<void> {
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  if (deleting.value) return
  deleting.value = true
  try {
    await deleteOrganization({ organizationId: requireMarkingOrganizationId(organization.value) })
    organization.value = null
    message.success('阅卷组织已删除')
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷组织删除失败')
  } finally {
    deleting.value = false
  }
}

/**
 * 组装阅卷组织详情路由，隔离按钮点击事件和业务 tab 参数。
 */
function buildDetailRoute(tab?: string): RouteLocationRaw {
  const examId = organization.value?.examId ?? selectedExamId.value
  if (!examId || !organization.value) {
    return { name: 'TeacherExamList' }
  }
  const target: RouteLocationRaw = resolveMarkingOrganizationDetailRoute(
    requireMarkingOrganizationId(organization.value),
    examId,
  )
  if (typeof target === 'string') {
    return target
  }
  if (tab) {
    return { ...target, query: { tab } }
  }
  return target
}

function goDetail(): void {
  if (!organization.value) return
  void router.push(buildDetailRoute())
}

function goTrialSessions(): void {
  if (!organization.value) return
  const examId = organization.value.examId ?? selectedExamId.value
  if (!examId) {
    showUserError(new Error('缺少考试上下文'), '无法进入试评定标')
    return
  }
  void router.push(
    resolveMarkingOrganizationTrialSessionsRoute(
      requireMarkingOrganizationId(organization.value),
      examId,
    ),
  )
}

function goFormalSessions(): void {
  if (!organization.value) return
  const examId = organization.value.examId ?? selectedExamId.value
  if (!examId) {
    showUserError(new Error('缺少考试上下文'), '无法进入正评会话')
    return
  }
  void router.push(
    resolveMarkingOrganizationFormalSessionsRoute(
      requireMarkingOrganizationId(organization.value),
      examId,
    ),
  )
}

watch(
  selectedExamId,
  () => {
    void loadOrganization()
  },
  { immediate: true },
)

watch(
  () => ({
    organizationId: organization.value?.id,
    setupTab: route.query.setupTab,
  }),
  (routeState) => {
    if (routeState.setupTab === 'launch' && routeState.organizationId) {
      const examId = organization.value?.examId ?? selectedExamId.value
      if (examId) {
        void router.replace(resolveMarkingOrganizationFormalHubRoute(examId))
      }
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await initExamSelector()
})

onActivated(() => {
  void loadOrganization()
})
</script>

<style lang="scss" scoped>
.org-index {
  &__readonly-banner {
    margin-bottom: 12px;
  }

  &__overview-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__exam-select {
    width: 280px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);

    &--empty {
      text-align: center;
      padding: var(--dp-space-3, 12px) var(--dp-space-3, 12px);
    }
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  &__empty-title {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  &__empty-desc {
    margin: 8px 0 16px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__descriptions {
    margin-top: 8px;

    :deep(.ant-descriptions-item-label) {
      width: 140px;
      color: var(--dp-text-secondary);
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--dp-border-light);
  }

  &__hint {
    color: var(--dp-text-disabled);
  }

  &__switch-hint {
    margin-left: 8px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }
}
</style>
