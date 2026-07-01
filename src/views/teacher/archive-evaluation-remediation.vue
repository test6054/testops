<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title title="迎评整改">
        <template #status>
          <UiTag tone="blue" size="sm">迎评整改</UiTag>
        </template>
      </ContextBar>
    </template>
    <ArchiveVolumeRemediationPanel />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import ArchiveVolumeRemediationPanel from '@/views/teacher/archive-volume/archive-volume-remediation-panel.vue'

defineOptions({ name: 'TeacherArchiveEvaluationRemediation' })
</script>
