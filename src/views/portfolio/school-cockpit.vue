<script setup lang="ts">
import type { PortfolioCockpitSummaryVO } from '@/apis/portfolio/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { portfolioCockpitApi } from '@/apis/portfolio/cockpit'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import PortfolioCockpitAskPanel from '@/views/portfolio/components/PortfolioCockpitAskPanel.vue'
import { showUserError } from '@/utils/error-handler'

const loading = ref(false)
const summary = ref<PortfolioCockpitSummaryVO | null>(null)

const signals = computed<SignalMetric[]>(() => {
  if (!summary.value) {
    return []
  }
  return [
    { key: 'teacher', label: '教师总数', value: summary.value.teacherCount ?? 0, tone: 'blue' },
    { key: 'dual', label: '双师认定', value: summary.value.dualTeacherCount ?? 0, tone: 'green' },
    { key: 'key', label: '骨干教师', value: summary.value.keyTeacherCount ?? 0, tone: 'purple' },
    { key: 'achievement', label: '成果合计', value: summary.value.achievementTotalCount ?? 0, tone: 'orange' },
    { key: 'honor', label: '荣誉合计', value: summary.value.honorTotalCount ?? 0, tone: 'gray' },
    { key: 'indicator', label: '启用指标', value: summary.value.tenantEnabledIndicatorCount ?? 0, tone: 'blue' },
  ]
})

async function loadSummary() {
  loading.value = true
  try {
    summary.value = await portfolioCockpitApi.schoolSummary()
  }
  catch (error) {
    showUserError(error, '加载学校驾驶舱汇总失败')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadSummary()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="学校驾驶舱" subtitle="全校师资与指标概览" />
    </template>
    <template #signal>
      <SignalBand v-if="summary" :metrics="signals" compact />
    </template>
    <a-spin :spinning="loading">
      <UiEmpty v-if="!loading && !summary" description="暂无学校驾驶舱数据" />
      <PortfolioCockpitAskPanel v-if="summary" />
    </a-spin>
  </StageWorkbenchShell>
</template>
