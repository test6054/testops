<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
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

    <!-- D-9 错误态：阅卷组织 / 会话列表加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="sessionsLoadError"
      :error="sessionsLoadError"
      title="阅卷会话加载失败"
      :helper="organizationExamLabel"
      @retry="reloadAll"
    />
    <UiEmpty
      v-else-if="!organization && !loading"
      description="未找到阅卷组织"
      class="org-sessions__empty"
    />

    <a-spin v-else :spinning="loading">
      <SignalBand :metrics="signalMetrics" compact class="org-sessions__signals" />

      <a-row :gutter="16">
        <a-col :xs="24" :lg="12">
          <TrialSessionPanel
            :organization-id="organizationId"
            :group-options="groupOptions"
            :sessions="trialSessions"
            :can-manage="canManageOrganization"
            @refresh="loadTrialSessions"
            @open-lifecycle="openLifecycleModal"
          />
        </a-col>
        <a-col :xs="24" :lg="12">
          <FormalSessionPanel
            :organization-id="organizationId"
            :group-options="groupOptions"
            :sessions="formalSessions"
            :can-manage="canManageOrganization"
            @refresh="loadFormalSessions"
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
  FormalSessionVO,
  MarkingOrganizationVO,
  TrialSessionVO,
} from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getExamDetail } from '@/apis/mark/exam'
import {
  getOrganizationById,
  listFormalSessions,
  listTrialSessions,
  MARKING_ORGANIZATION_STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE,
  validateFormalSessionContract,
  validateMarkingOrganizationContract,
  validateTrialSessionContract,
} from '@/apis/mark/marking-organization'
import { UiButton, UiEmpty, UiErrorRetryPanel, UiTag } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { useUserStore } from '@/stores/modules/user'
import { showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import FormalSessionPanel from './components/FormalSessionPanel.vue'
import SessionLifecycleReasonModal from './components/SessionLifecycleReasonModal.vue'
import TrialSessionPanel from './components/TrialSessionPanel.vue'

defineOptions({ name: 'AdminMarkingOrganizationSessions' })

const route = useRoute()
const userStore = useUserStore()

const organizationId = computed(() => String(route.params.organizationId || ''))

const organization = ref<MarkingOrganizationVO | null>(null)
const examDetail = ref<ExamDetailVO | null>(null)
const trialSessions = ref<TrialSessionVO[]>([])
const formalSessions = ref<FormalSessionVO[]>([])
const loading = ref(false)
// D-9 错误态：任一加载失败时 UiErrorRetryPanel 重试 + 上报
const sessionsLoadError = ref<Error | null>(null)
const filterGroupId = ref<string | undefined>(undefined)

const groupOptions = computed(() =>
  (organization.value?.groups ?? []).map((g) => ({
    value: g.id,
    label: g.groupName,
  })),
)

const organizationExamLabel = computed(() => {
  if (organization.value?.examName) {
    return organization.value.examNo
      ? `${organization.value.examName} (${organization.value.examNo})`
      : organization.value.examName
  }
  return '阅卷组织'
})

const canManageOrganization = computed(
  () => !!examDetail.value?.createUser && examDetail.value.createUser === userStore.userInfo.userId,
)

function guardOrganizationOwnerAction(): boolean {
  if (canManageOrganization.value) return true
  message.warning('仅考试创建人可分配批阅任务')
  return false
}

async function loadOrganization(): Promise<void> {
  if (!organizationId.value) return
  try {
    const nextOrganization = await getOrganizationById({ organizationId: organizationId.value })
    validateMarkingOrganizationContract(nextOrganization)
    organization.value = nextOrganization
    examDetail.value = await getExamDetail(nextOrganization.examId)
  } catch (error) {
    organization.value = null
    examDetail.value = null
    sessionsLoadError.value = toUserError(error, '阅卷组织加载失败')
    showUserError(error, '阅卷组织加载失败')
  }
}

async function loadTrialSessions(): Promise<void> {
  if (!organizationId.value) return
  try {
    sessionsLoadError.value = null
    const records = await listTrialSessions({
      organizationId: organizationId.value,
      groupId: filterGroupId.value,
    })
    records.forEach(validateTrialSessionContract)
    trialSessions.value = records
  } catch (error) {
    trialSessions.value = []
    sessionsLoadError.value = toUserError(error, '试评会话列表加载失败')
    showUserError(error, '试评会话列表加载失败')
  }
}

async function loadFormalSessions(): Promise<void> {
  if (!organizationId.value) return
  try {
    sessionsLoadError.value = null
    const records = await listFormalSessions({
      organizationId: organizationId.value,
      groupId: filterGroupId.value,
    })
    records.forEach(validateFormalSessionContract)
    formalSessions.value = records
  } catch (error) {
    formalSessions.value = []
    sessionsLoadError.value = toUserError(error, '正评会话列表加载失败')
    showUserError(error, '正评会话列表加载失败')
  }
}

async function reloadAll(): Promise<void> {
  loading.value = true
  // D-9：重试前清空错误态，让 UiErrorRetryPanel 在新失败时重新渲染
  sessionsLoadError.value = null
  try {
    await Promise.all([loadOrganization(), loadTrialSessions(), loadFormalSessions()])
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

async function onLifecycleSuccess(): Promise<void> {
  if (lifecycleAction.value === 'closeTrial') {
    await loadTrialSessions()
  } else {
    await loadFormalSessions()
  }
}

onMounted(reloadAll)
</script>

<style lang="scss" scoped>
.org-sessions {
  &__group-select {
    width: 240px;
  }

  &__signals {
    margin-bottom: 12px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__empty {
    padding: 48px 0;
  }
}
</style>
