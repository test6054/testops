<script setup lang="ts">
import DevelopmentRecordLibraryView from '@/views/portfolio/development-record-library-view.vue'
</script>

<template>
  <DevelopmentRecordLibraryView
    title="国家级成果"
    subtitle="成果库 · 级别 NATIONAL"
    record-type="ACHIEVEMENT"
    level-code="NATIONAL"
    :national-only="true"
    readonly
  />
</template>
