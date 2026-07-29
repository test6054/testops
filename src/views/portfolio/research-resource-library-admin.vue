<script setup lang="ts">
import { PortfolioDevelopmentRecordTypeCode } from '@/apis/portfolio/enums'
import DevelopmentRecordLibraryView from '@/views/portfolio/development-record-library-view.vue'
</script>

<template>
  <DevelopmentRecordLibraryView
    title="科研资源库"
    subtitle="科研教研成果库"
    :record-type="PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT"
    category-code="RESEARCH"
  />
</template>
