<script setup lang="ts">
import { PortfolioDevelopmentRecordTypeCode } from '@/apis/portfolio/enums'
import DevelopmentRecordLibraryView from '@/views/portfolio/development-record-library-view.vue'
</script>

<template>
  <DevelopmentRecordLibraryView
    title="实践资源库"
    subtitle="成果库 · 企业实践分类 ENTERPRISE_PRACTICE"
    :record-type="PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT"
    category-code="ENTERPRISE_PRACTICE"
  />
</template>
