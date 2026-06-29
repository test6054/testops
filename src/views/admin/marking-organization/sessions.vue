<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        title="阅卷会话"
        :subtitle="organizationExamLabel"
      >
        <template #status>
          <a-select
            v-model:value="filterGroupId"
            class="org-sessions__group-select"
            placeholder="按题组过滤（留空显示全部）"
            :options="groupOptions"
            allow-clear
            @change="reloadAll"
          />
          <UiTag
            v-if="organization?.organizationStatus"
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
                MARKING_ORGANIZATION_STATUS_LABEL,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="reloadAll">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 4 }" />

    <UiEmpty
      v-else-if="!organization"
      description="暂无数据"
      class="org-sessions__empty"
    />

    <a-spin v-else :spinning="loading">
      <SignalBand :metrics="signalMetrics" compact class="org-sessions__signals" />

      <a-row :gutter="16">
        <a-col :xs="24" :lg="12">
          <TrialSessionPanel
            :organization-id="organizationId"
            :group-options="groupOptions"
            :group-has-allocation-policy-map="groupHasAllocationPolicyMap"
            :sessions="trialSessions"
            :can-manage="canManageOrganization"
            @refresh="onTrialSessionsChanged"
            @open-lifecycle="openLifecycleModal"
          />
        </a-col>
        <a-col :xs="24" :lg="12">
          <FormalSessionPanel
            :organization-id="organizationId"
            :group-options="groupOptions"
            :group-allocation-units="groupAllocationUnitMap"
            :sessions="formalSessions"
            :can-manage="canManageOrganization"
            @refresh="onFormalSessionsChanged"
            @open-lifecycle="openLifecycleModal"
          />
        </a-col>
      </a-row>
    </a-spin>

    <SessionLifecycleReasonModal
      v-model:open="lifecycleModalOpen"
      :action="lifecycleAction"
      :session-id="lifecycleSessionId"
      :can-manage="canManageOrganization"
      @success="onLifecycleSuccess"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { LifecycleAction } from './components/SessionLifecycleReasonModal.vue'
import type { ExamDetailVO } from '@/apis/mark/exam'
import type {
  AllocationPolicyVO,
  AllocationUnitCode,
  FormalSessionVO,
  MarkingOrganizationVO,
  TrialSessionVO,
} from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamDetail } from '@/apis/mark/exam'
import {
  getOrganizationById,
  listFormalSessions,
  listMarkingPolicies,
  listTrialSessions,
  MARKING_ORGANIZATION_STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE,
  validateFormalSessionContract,
  validateMarkingOrganizationContract,
  validateTrialSessionContract,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkingOrgPermission } from '@/composables/useMarkingOrgPermission'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { resolveMarkingOrganizationSessionsRoute } from '@/utils/marking-organization-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import FormalSessionPanel from './components/FormalSessionPanel.vue'
import SessionLifecycleReasonModal from './components/SessionLifecycleReasonModal.vue'
import TrialSessionPanel from './components/TrialSessionPanel.vue'

defineOptions({ name: 'AdminMarkingOrganizationSessions' })

const route = useRoute()
const router = useRouter()
const { refreshSnapshot } = useWorkspaceExamId()

const organizationId = computed(() => String(route.params.organizationId || ''))
const routeExamId = computed(() => String(route.params.examId || ''))
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')

const organization = ref<MarkingOrganizationVO | null>(null)
const examDetail = ref<ExamDetailVO | null>(null)
const trialSessions = ref<TrialSessionVO[]>([])
const formalSessions = ref<FormalSessionVO[]>([])
const allocationPolicies = ref<AllocationPolicyVO[]>([])
const loading = ref(false)
const filterGroupId = ref<string | undefined>(undefined)

const groupOptions = computed(() =>
  (organization.value?.groups ?? []).map((g) => ({
    value: g.id,
    label: g.groupName,
  })),
)

const groupAllocationUnitMap = computed(() => {
  const map: Record<string, AllocationUnitCode> = {}
  const defaultAllocationUnit = allocationPolicies.value.find((policy) => policy.groupId == null)?.allocationUnit
  for (const group of organization.value?.groups ?? []) {
    const groupPolicy = allocationPolicies.value.find((policy) => policy.groupId === group.id)
    const allocationUnit = groupPolicy?.allocationUnit ?? defaultAllocationUnit
    if (allocationUnit) {
      map[group.id] = allocationUnit
    }
  }
  return map
})

const groupHasAllocationPolicyMap = computed(() => {
  const map: Record<string, boolean> = {}
  for (const group of organization.value?.groups ?? []) {
    map[group.id] = Boolean(groupAllocationUnitMap.value[group.id])
  }
  return map
})

const organizationExamLabel = computed(() => {
  if (organization.value?.examName) {
    return organization.value.examNo
      ? `${organization.value.examName} (${organization.value.examNo})`
      : organization.value.examName
  }
  return '阅卷组织'
})

const examCreateUserId = computed(() => examDetail.value?.createUser ?? organization.value?.examCreateUserId)
const { canManageExamOwner: canManageOrganization } = useMarkingOrgPermission(examCreateUserId, organization)

function guardOrganizationOwnerAction(): boolean {
  if (canManageOrganization.value) return true
  message.warning('仅考试主考老师可管理试评 / 正评会话')
  return false
}

function resetSessionState(): void {
  organization.value = null
  examDetail.value = null
  trialSessions.value = []
  formalSessions.value = []
  allocationPolicies.value = []
}

/**
 * 会话页必须绑定到组织真实 examId，对齐后工作台阶段与会话操作才属于同一考试。
 */
async function alignWorkspaceRouteExamId(nextOrganization: MarkingOrganizationVO): Promise<boolean> {
  if (!isExamWorkspaceRoute.value) {
    return true
  }
  if (!nextOrganization.examId || routeExamId.value === nextOrganization.examId) {
    return true
  }
  await router.replace(
    resolveMarkingOrganizationSessionsRoute(nextOrganization.id, nextOrganization.examId),
  )
  return false
}

async function loadOrganization(): Promise<boolean> {
  if (!organizationId.value) {
    resetSessionState()
    return false
  }
  try {
    const nextOrganization = await getOrganizationById({ organizationId: organizationId.value })
    validateMarkingOrganizationContract(nextOrganization)
    if (!(await alignWorkspaceRouteExamId(nextOrganization))) {
      return false
    }
    organization.value = nextOrganization
    examDetail.value = await getExamDetail(nextOrganization.examId)
    return true
  } catch (error) {
    resetSessionState()
    showUserError(error, '阅卷组织加载失败')
    return false
  }
}

async function loadTrialSessions(): Promise<void> {
  if (!organizationId.value) return
  try {
    const records = await listTrialSessions({
      organizationId: organizationId.value,
      groupId: filterGroupId.value,
    })
    records.forEach(validateTrialSessionContract)
    trialSessions.value = records
  } catch (error) {
    trialSessions.value = []
    showUserError(error, '试评会话列表加载失败')
  }
}

async function loadFormalSessions(): Promise<void> {
  if (!organizationId.value) return
  try {
    const records = await listFormalSessions({
      organizationId: organizationId.value,
      groupId: filterGroupId.value,
    })
    records.forEach(validateFormalSessionContract)
    formalSessions.value = records
  } catch (error) {
    formalSessions.value = []
    showUserError(error, '正评会话列表加载失败')
  }
}

async function loadMarkingPolicies(): Promise<void> {
  if (!organizationId.value) {
    allocationPolicies.value = []
    return
  }
  try {
    const response = await listMarkingPolicies({ organizationId: organizationId.value })
    allocationPolicies.value = response.allocationPolicies ?? []
  } catch (error) {
    allocationPolicies.value = []
    showUserError(error, '分配策略加载失败')
  }
}

async function reloadAll(): Promise<void> {
  if (!organizationId.value) {
    resetSessionState()
    return
  }
  loading.value = true
  try {
    const loaded = await loadOrganization()
    if (!loaded) {
      return
    }
    await loadMarkingPolicies()
    await Promise.all([loadTrialSessions(), loadFormalSessions()])
  } finally {
    loading.value = false
  }
}

const signalMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'trial',
    label: '试评会话',
    value: trialSessions.value.length,
    tone: trialSessions.value.length > 0 ? 'orange' : 'gray',
  },
  {
    key: 'formal',
    label: '正评会话',
    value: formalSessions.value.length,
    tone: formalSessions.value.length > 0 ? 'green' : 'gray',
  },
  { key: 'groups', label: '题组数', value: groupOptions.value.length, tone: 'blue' },
  {
    key: 'status',
    label: '组织状态',
    value: organization.value?.organizationStatus
      ? strictEnumLabel(
          MARKING_ORGANIZATION_STATUS_LABEL,
          organization.value.organizationStatus,
          '阅卷组织状态',
        )
      : '-',
    tone: organization.value?.organizationStatus
      ? strictEnumTone(
          MARKING_ORGANIZATION_STATUS_TONE,
          organization.value.organizationStatus,
          '阅卷组织状态',
        )
      : 'gray',
  },
])

const lifecycleModalOpen = ref(false)
const lifecycleAction = ref<LifecycleAction | null>(null)
const lifecycleSessionId = ref('')

function openLifecycleModal(action: LifecycleAction, sessionId: string): void {
  if (!guardOrganizationOwnerAction()) return
  lifecycleAction.value = action
  lifecycleSessionId.value = sessionId
  lifecycleModalOpen.value = true
}

async function onTrialSessionsChanged(): Promise<void> {
  await loadTrialSessions()
  await refreshSnapshot()
}

async function onFormalSessionsChanged(): Promise<void> {
  await loadFormalSessions()
  await refreshSnapshot()
}

async function onLifecycleSuccess(): Promise<void> {
  if (lifecycleAction.value === 'closeTrial') {
    await loadTrialSessions()
  } else {
    await loadFormalSessions()
  }
  await refreshSnapshot()
}

watch(() => [organizationId.value, routeExamId.value] as const, () => {
  void reloadAll()
}, { immediate: true })
</script>

<style lang="scss" scoped>
.org-sessions {
  &__group-select {
    width: 240px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__empty {
    padding: 48px 0;
  }
}
</style>
