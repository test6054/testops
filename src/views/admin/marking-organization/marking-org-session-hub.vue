<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <UiSkeletonState v-if="resolving" variant="card" compact />

    <ExamSelectGateStrip
      v-else-if="!selectedExamId"
      body="请从考试列表进入工作台后再办理试评/正评会话"
    />

    <WorkbenchContextGateStrip
      v-else-if="selectedExamId"
      tag="未配置"
      :body="`本考试尚未创建阅卷组织，请先完成组织/题组配置后再进入${phaseLabel}`"
      cta-label="前往阅卷设置"
      list-route-name="TeacherExamWorkspaceMarkingOrg"
      class="org-session-hub__empty"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { computed, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganization } from '@/apis/mark/marking-organization'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
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

async function redirectToSessionPage(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    resolving.value = false
    return
  }
  resolving.value = true
  try {
    const org = await getOrganization({ examId })
    if (org.configured && org.id) {
      const target
        = phase.value === 'formal'
          ? resolveMarkingOrganizationFormalSessionsRoute(org.id, examId)
          : resolveMarkingOrganizationTrialSessionsRoute(org.id, examId)
      await router.replace(target)
    }
  } catch (error) {
    showUserError(error, '阅卷组织加载失败')
  } finally {
    resolving.value = false
  }
}

watch(
  selectedExamId,
  () => {
    void redirectToSessionPage()
  },
  { immediate: true },
)

onActivated(() => {
  void redirectToSessionPage()
})
</script>

<style scoped lang="scss">
.org-session-hub {
  &__empty {
    padding: var(--dp-space-2, 8px) 0;
  }
}
</style>
