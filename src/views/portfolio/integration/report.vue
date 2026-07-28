<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

/** 写操作 owner：异步加载，工作台实现按 owner 过滤分区与数据加载。 */
const IntegrationReportOwner = defineAsyncComponent(() => import('./owners/IntegrationReportOwner.vue'))
</script>

<template>
  <IntegrationReportOwner />
</template>
