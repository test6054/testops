<script setup lang="ts">
import { PortfolioDevelopmentRecordTypeCode } from '@/apis/portfolio/enums'
import DevelopmentRecordLibraryView from '@/views/portfolio/development-record-library-view.vue'
</script>

<template>
  <DevelopmentRecordLibraryView
    title="教学资源库"
    subtitle="成果库 · 教学类档案分类 TEACHING"
    :record-type="PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT"
    category-code="TEACHING"
  />
</template>
