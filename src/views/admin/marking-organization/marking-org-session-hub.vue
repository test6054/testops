<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="phaseLabel">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <ExamWorkspaceJourneySubNav v-if="selectedExamId && !resolving && !resolveLoadFailed" />

    <UiSkeletonState v-if="resolving" variant="card" compact />

    <ExamSelectGateStrip
      v-else-if="!selectedExamId"
      body="请从考试列表进入工作台后再办理试评/正评会话"
    />

    <UiAlertStrip
      v-else-if="resolveLoadFailed"
      tone="error"
      title="阅卷组织加载失败"
      :description="`考试 ${selectedExamId} 的组织配置暂不可读取；不得按「尚未配置」处理。`"
      dense
      class="org-session-hub__alert"
    />

    <template v-else-if="selectedExamId">
      <WorkbenchContextGateStrip
        v-if="organizationConfigured === false"
        tag="未配置"
        :body="`本考试尚未创建阅卷组织，请先完成组织/题组配置后再办理${phaseLabel}`"
        cta-label="前往阅卷设置"
        list-route-name="TeacherExamWorkspaceMarkingOrg"
        class="org-session-hub__advisory"
      />
      <UiEmpty
        v-if="organizationConfigured === false"
        size="sm"
        :description="`暂无${phaseLabel}；创建阅卷组织并配置题组后可在此办理`"
        class="org-session-hub__empty"
      />
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { computed, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganization } from '@/apis/mark/marking-organization'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { showUserError } from '@/utils/error-handler'
import {
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'

defineOptions({ name: 'MarkingOrgSessionHub' })

const route = useRoute()
const router = useRouter()
const { selectedExamId } = useMarkExamContext()

const phase = computed(() => (route.meta.sessionPhase === 'formal' ? 'formal' : 'trial'))
const phaseLabel = computed(() => (phase.value === 'formal' ? '正评会话' : '试评定标'))

const { examStatusLabel, examStatusTone } = useExamJourneyContextBar(() => phaseLabel.value)

const resolving = ref(true)
const resolveLoadFailed = ref(false)
const organizationConfigured = ref<boolean | null>(null)
let resolveGeneration = 0
const skipFirstActivatedResolve = ref(true)

function isSameSessionsRoute(organizationId: string, examId: string): boolean {
  const expectedName
    = phase.value === 'formal'
      ? 'TeacherExamWorkspaceMarkingOrgFormalSessions'
      : 'TeacherExamWorkspaceMarkingOrgTrialSessions'
  return (
    route.name === expectedName
    && String(route.params.examId) === examId
    && String(route.params.organizationId) === organizationId
  )
}

async function redirectToSessionPage(): Promise<void> {
  const examId = selectedExamId.value
  const generation = ++resolveGeneration
  if (!examId) {
    resolving.value = false
    resolveLoadFailed.value = false
    organizationConfigured.value = null
    return
  }
  resolving.value = true
  resolveLoadFailed.value = false
  try {
    const org = await getOrganization({ examId })
    if (generation !== resolveGeneration || selectedExamId.value !== examId) {
      return
    }
    organizationConfigured.value = org.configured === true
    resolveLoadFailed.value = false
    if (org.configured && org.id) {
      if (isSameSessionsRoute(org.id, examId)) {
        return
      }
      const target
        = phase.value === 'formal'
          ? resolveMarkingOrganizationFormalSessionsRoute(org.id, examId)
          : resolveMarkingOrganizationTrialSessionsRoute(org.id, examId)
      await router.replace(target)
    }
  } catch (error) {
    if (generation !== resolveGeneration || selectedExamId.value !== examId) {
      return
    }
    organizationConfigured.value = null
    resolveLoadFailed.value = true
    showUserError(error, '阅卷组织加载失败')
  } finally {
    if (generation === resolveGeneration) {
      resolving.value = false
    }
  }
}

watch(
  () => [selectedExamId.value, phase.value] as const,
  () => {
    void redirectToSessionPage()
  },
  { immediate: true },
)

onActivated(() => {
  if (skipFirstActivatedResolve.value) {
    skipFirstActivatedResolve.value = false
    return
  }
  // 失败、未解析或未配置：激活时再拉一次，避免组织已创建后仍停在 Hub
  if (resolveLoadFailed.value || organizationConfigured.value !== true) {
    void redirectToSessionPage()
  }
})
</script>

<style scoped lang="scss">
.org-session-hub {
  &__advisory {
    margin-bottom: var(--dp-space-component);
  }

  &__empty {
    padding: var(--dp-space-component) 0;
  }

  &__alert {
    margin-bottom: var(--dp-space-component);
  }
}
</style>
