<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        title="督导抽查"
      >
        <template #status>
          <UiTag tone="gray" size="sm">督导抽查（只读）</UiTag>
        </template>
      </ContextBar>
    </template>
    <ArchiveVolumeSupervisionPanel />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import ArchiveVolumeSupervisionPanel from '@/views/teacher/archive-volume/archive-volume-supervision-panel.vue'

defineOptions({ name: 'TeacherArchiveSupervisionInspect' })
</script>
