<script setup lang="ts">
import { PortfolioDevelopmentRecordTypeCode } from '@/apis/portfolio/enums'
import DevelopmentRecordLibraryView from '@/views/portfolio/development-record-library-view.vue'
</script>

<template>
  <DevelopmentRecordLibraryView
    title="教学资源库"
    subtitle="教学成果库"
    :record-type="PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT"
    category-code="TEACHING"
  />
</template>
