<template>
  <StageWorkbenchShell>
    <UiAlertStrip
      v-if="phaseError"
      tone="error"
      title="会话阶段参数无效"
      :description="phaseError"
      dense
    />
    <UiSkeletonState v-else variant="card" compact />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import {
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'

defineOptions({ name: 'AdminMarkingOrganizationSessionsRedirect' })

const route = useRoute()
const router = useRouter()
const phaseError = ref('')

onMounted(() => {
  const examId = String(route.params.examId || '')
  const organizationId = String(route.params.organizationId || '')
  const phaseQuery = route.query.phase
  if (phaseQuery !== 'formal' && phaseQuery !== 'trial') {
    phaseError.value
      = '须显式指定 query.phase=trial 或 formal；禁止默认跳转试评。请从试评/正评入口重新进入。'
    showUserError(null, '会话阶段参数无效')
    if (examId) {
      void router.replace({
        name: 'TeacherExamWorkspaceMarkingOrg',
        params: { examId },
      })
    }
    return
  }
  if (!examId || !organizationId) {
    phaseError.value = '缺少考试或阅卷组织上下文，无法进入会话列表'
    showUserError(null, '会话重定向缺少考试或组织参数')
    return
  }
  const target
    = phaseQuery === 'formal'
      ? resolveMarkingOrganizationFormalSessionsRoute(organizationId, examId)
      : resolveMarkingOrganizationTrialSessionsRoute(organizationId, examId)
  void router.replace(target)
})
</script>
