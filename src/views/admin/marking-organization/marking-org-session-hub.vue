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

    <UiEmpty
      v-else-if="selectedExamId"
      description="本考试尚未创建阅卷组织"
      class="org-session-hub__empty"
    >
      <p class="org-session-hub__hint">
        请先完成阅卷组织、题组与分配策略配置，再进入{{ phaseLabel }}。
      </p>
      <template #action>
        <UiButton variant="primary" size="sm" @click="goMarkingOrg"> 前往阅卷设置 </UiButton>
      </template>
    </UiEmpty>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { computed, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganization } from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { showUserError } from '@/utils/error-handler'
import {
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationIndexRoute,
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
      const target =
        phase.value === 'formal'
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

function goMarkingOrg(): void {
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  void router.push(resolveMarkingOrganizationIndexRoute(examId))
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
    padding: 48px 0;
  }

  &__hint {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--dp-text-secondary);
  }
}
</style>
