<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="org-sessions__context">
        <div class="org-sessions__context-info">
          <h2 class="org-sessions__title">阅卷交付 - 试评 / 正评会话</h2>
          <a-select
            v-model:value="filterGroupId"
            class="org-sessions__group-select"
            placeholder="按题组过滤（留空显示全部）"
            :options="groupOptions"
            allow-clear
            @change="reloadAll"
          />
        </div>
        <div class="org-sessions__context-actions">
          <UiTag
            v-if="organization?.organizationStatus"
            :tone="ORG_STATUS_TONE[organization.organizationStatus]"
            size="sm"
          >
            {{ ORG_STATUS_LABEL[organization.organizationStatus] }}
          </UiTag>
          <UiButton variant="outline" size="sm" :loading="loading" @click="reloadAll">
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!organization && !loading"
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
            @refresh="loadTrialSessions"
            @open-lifecycle="openLifecycleModal"
          />
        </a-col>
        <a-col :xs="24" :lg="12">
          <FormalSessionPanel
            :organization-id="organizationId"
            :group-options="groupOptions"
            :sessions="formalSessions"
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
      @success="onLifecycleSuccess"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { LifecycleAction } from './components/SessionLifecycleReasonModal.vue'
import SessionLifecycleReasonModal from './components/SessionLifecycleReasonModal.vue'
import type {
  FormalSessionVO,
  MarkingOrganizationVO,
  TrialSessionVO,
} from '@/apis/mark/marking-organization'
import {
  getOrganizationById,
  listFormalSessions,
  listTrialSessions,
  MARKING_ORGANIZATION_STATUS_LABEL as ORG_STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE as ORG_STATUS_TONE,
} from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UiButton, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import FormalSessionPanel from './components/FormalSessionPanel.vue'
import TrialSessionPanel from './components/TrialSessionPanel.vue'

defineOptions({ name: 'AdminMarkingOrganizationSessions' })

const route = useRoute()

const organizationId = computed(() => String(route.params.organizationId || ''))

const organization = ref<MarkingOrganizationVO | null>(null)
const trialSessions = ref<TrialSessionVO[]>([])
const formalSessions = ref<FormalSessionVO[]>([])
const loading = ref(false)
const filterGroupId = ref<string | undefined>(undefined)

const groupOptions = computed(() =>
  (organization.value?.groups ?? []).map((g) => ({
    value: g.id,
    label: g.groupName || `题组 #${g.id}`,
  })),
)

async function loadOrganization(): Promise<void> {
  if (!organizationId.value) return
  try {
    organization.value = await getOrganizationById({ organizationId: organizationId.value })
  } catch (error) {
    organization.value = null
    const errMsg = error instanceof Error ? error.message : '阅卷组织加载失败'
    message.error(errMsg)
  }
}

async function loadTrialSessions(): Promise<void> {
  if (!organizationId.value) return
  try {
    trialSessions.value = await listTrialSessions({
      organizationId: organizationId.value,
      groupId: filterGroupId.value,
    })
  } catch (error) {
    trialSessions.value = []
    const errMsg = error instanceof Error ? error.message : '试评会话列表加载失败'
    message.error(errMsg)
  }
}

async function loadFormalSessions(): Promise<void> {
  if (!organizationId.value) return
  try {
    formalSessions.value = await listFormalSessions({
      organizationId: organizationId.value,
      groupId: filterGroupId.value,
    })
  } catch (error) {
    formalSessions.value = []
    const errMsg = error instanceof Error ? error.message : '正评会话列表加载失败'
    message.error(errMsg)
  }
}

async function reloadAll(): Promise<void> {
  loading.value = true
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
      ? ORG_STATUS_LABEL[organization.value.organizationStatus]
      : '-',
    tone: organization.value?.organizationStatus
      ? ORG_STATUS_TONE[organization.value.organizationStatus]
      : 'gray',
  },
])

const lifecycleModalOpen = ref(false)
const lifecycleAction = ref<LifecycleAction | null>(null)
const lifecycleSessionId = ref('')

function openLifecycleModal(action: LifecycleAction, sessionId: string): void {
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
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 280px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

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
