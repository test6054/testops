<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ScanOpsWorkbench from '@/components/scanner-ops/ScanOpsWorkbench.vue'

defineOptions({ name: 'TeacherExamScanOps' })

const route = useRoute()
const examId = computed(() => String(route.params.examId ?? ''))
</script>

<template>
  <ScanOpsWorkbench domain="exam" title="考试扫描运营" :exam-id="examId" />
</template>
