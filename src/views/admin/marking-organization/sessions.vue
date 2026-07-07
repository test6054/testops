<template>
  <StageWorkbenchShell>
    <UiSkeletonState variant="card" compact />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  resolveMarkingOrganizationFormalSessionsRoute,
  resolveMarkingOrganizationTrialSessionsRoute,
} from '@/utils/marking-organization-navigation'

defineOptions({ name: 'AdminMarkingOrganizationSessionsRedirect' })

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const examId = String(route.params.examId || '')
  const organizationId = String(route.params.organizationId || '')
  const phase = route.query.phase === 'formal' ? 'formal' : 'trial'
  const target
    = phase === 'formal'
      ? resolveMarkingOrganizationFormalSessionsRoute(organizationId, examId)
      : resolveMarkingOrganizationTrialSessionsRoute(organizationId, examId)
  void router.replace(target)
})
</script>
