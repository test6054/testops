<script setup lang="ts">
import type { PortfolioCockpitSummaryVO } from '@/apis/portfolio/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioCockpitApi } from '@/apis/portfolio/cockpit'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { showUserError } from '@/utils/error-handler'
import PortfolioCockpitAskPanel from '@/views/portfolio/components/PortfolioCockpitAskPanel.vue'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const { loadTree, departmentOptions: loadDepartmentOptions } = usePortfolioOrgTree()
const departmentOptions = computed(() => loadDepartmentOptions())
const loading = ref(false)
const departmentId = ref('')
const deepLinkTaskId = ref(readRouteStringParam(route.query.taskId))
const summary = ref<PortfolioCockpitSummaryVO | null>(null)

const signals = computed<SignalMetric[]>(() => {
  if (!summary.value) {
    return []
  }
  return [
    { key: 'teacher', label: '教师总数', value: summary.value.teacherCount ?? 0, tone: 'blue' },
    { key: 'dual', label: '双师认定', value: summary.value.dualTeacherCount ?? 0, tone: 'green' },
    { key: 'key', label: '骨干教师', value: summary.value.keyTeacherCount ?? 0, tone: 'purple' },
    {
      key: 'achievement',
      label: '成果合计',
      value: summary.value.achievementTotalCount ?? 0,
      tone: 'orange',
    },
    { key: 'honor', label: '荣誉合计', value: summary.value.honorTotalCount ?? 0, tone: 'gray' },
    {
      key: 'indicator',
      label: '启用指标',
      value: summary.value.tenantEnabledIndicatorCount ?? 0,
      tone: 'blue',
    },
  ]
})

async function loadSummary() {
  if (!departmentId.value) {
    summary.value = null
    return
  }
  loading.value = true
  try {
    summary.value = await portfolioCockpitApi.deptSummary({ departmentId: departmentId.value })
  } catch (error) {
    showUserError(error, '加载院系驾驶舱汇总失败')
  } finally {
    loading.value = false
  }
}

watch(departmentId, () => {
  void loadSummary()
})

onMounted(async () => {
  await loadTree()
  const queryDepartmentId = readRouteStringParam(route.query.departmentId)
  if (
    queryDepartmentId
    && departmentOptions.value.some((option) => option.value === queryDepartmentId)
  ) {
    departmentId.value = queryDepartmentId
    return
  }
  if (!departmentId.value && departmentOptions.value.length) {
    departmentId.value = departmentOptions.value[0].value
  }
})

watch(
  () => route.query.taskId,
  (value) => {
    deepLinkTaskId.value = readRouteStringParam(value)
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="院系驾驶舱"
        :subtitle="summary?.departmentName"
      />
    </template>
    <UiCard title="组织范围">
      <a-select
        v-model:value="departmentId"
        class="dept-cockpit__field"
        placeholder="选择院系"
        :options="departmentOptions"
      />
    </UiCard>
    <template #signal>
      <SignalBand v-if="summary" :metrics="signals" compact />
    </template>
    <a-spin :spinning="loading">
      <UiEmpty v-if="!loading && !departmentId" description="请选择院系" />
      <UiEmpty v-else-if="!loading && !summary" description="当前院系暂无驾驶舱数据" />
      <PortfolioCockpitAskPanel
        v-if="departmentId"
        :department-id="departmentId"
        :initial-task-id="deepLinkTaskId || undefined"
      />
    </a-spin>
  </StageWorkbenchShell>
</template>

<style scoped>
.dept-cockpit__field {
  width: 100%;
  max-width: 320px;
}
</style>
