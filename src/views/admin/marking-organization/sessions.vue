<template>
  <GiPageLayout>
    <div class="organization-sessions-page">
      <PageHeader title="试评 / 正评会话" back-route="/admin/marking-organization">
        <template #tags>
          <UiTag v-if="organization?.organizationStatus" :tone="ORG_STATUS_TONE[organization.organizationStatus]" size="md">
            {{ ORG_STATUS_LABEL[organization.organizationStatus] }}
          </UiTag>
          <UiTag tone="orange" size="md">试评 {{ trialSessions.length }}</UiTag>
          <UiTag tone="green" size="md">正评 {{ formalSessions.length }}</UiTag>
        </template>
        <template #actions>
          <a-select
            v-model:value="filterGroupId"
            style="width: 240px"
            placeholder="按题组过滤（留空显示全部）"
            :options="groupOptions"
            allow-clear
            @change="reloadAll"
          />
          <UiButton variant="outline" size="sm" :loading="loading" @click="reloadAll">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty v-if="!organization && !loading" description="未找到阅卷组织" class="empty-block" />

      <a-spin v-else :spinning="loading">
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
    </div>

    <SessionLifecycleReasonModal
      v-model:open="lifecycleModalOpen"
      :action="lifecycleAction"
      :session-id="lifecycleSessionId"
      @success="onLifecycleSuccess"
    />
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { LifecycleAction } from './components/SessionLifecycleReasonModal.vue'
import type {
  FormalSessionVO,
  MarkingOrganizationVO,
  TrialSessionVO,
} from '@/apis/mark/marking-organization'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  getOrganizationById,
  listFormalSessions,
  listTrialSessions,
  MARKING_ORGANIZATION_STATUS_LABEL as ORG_STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE as ORG_STATUS_TONE,
} from '@/apis/mark/marking-organization'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import FormalSessionPanel from './components/FormalSessionPanel.vue'
import SessionLifecycleReasonModal from './components/SessionLifecycleReasonModal.vue'
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
  (organization.value?.groups ?? []).map(g => ({ value: g.id, label: g.groupName || `题组 #${g.id}` })),
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
.organization-sessions-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-block {
  margin-top: 48px;
}
</style>
