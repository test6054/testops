<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const IntegrationWriteWorkbench = defineAsyncComponent(
  () => import('./IntegrationWriteWorkbench.vue'),
)
</script>

<template>
  <IntegrationWriteWorkbench owner="dictionary" />
</template>