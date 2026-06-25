<script lang="ts" setup>
/**
 * 质量评价域 AI 任务运行条：仅在质量评价 /quality 路由下展示（不含教学档案袋 /portfolio）。
 */
import LoadingOutlined from '@ant-design/icons-vue/LoadingOutlined'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityTaskStore } from '@/stores/modules/qualityTask'
import { isQualityEvaluationRoute } from '@/utils/portfolio-route'

defineOptions({ name: 'AiTaskRunningBar' })

const route = useRoute()
const router = useRouter()
const qualityTaskStore = useQualityTaskStore()
const aiTaskStore = useAiTaskStore()
const { aiTasksInFlight, aiTasksProcessing } = storeToRefs(qualityTaskStore)

const isQualityRoute = computed(() => isQualityEvaluationRoute(route.path))

const runningCount = computed(
  () => aiTasksInFlight.value.length + aiTaskStore.activePollingCount,
)

const processingCount = computed(() => aiTasksProcessing.value.length)

const pendingCount = computed(
  () => runningCount.value - processingCount.value,
)

let pollTimer: ReturnType<typeof setInterval> | null = null

async function refreshInFlightTasks(): Promise<void> {
  await qualityTaskStore.refreshAll()
}

function goAiTaskCenter(): void {
  void router.push({ name: 'QualityAiTask' })
}

onMounted(() => {
  if (isQualityRoute.value) {
    void refreshInFlightTasks()
  }
  pollTimer = setInterval(() => {
    if (isQualityRoute.value && runningCount.value > 0) {
      void refreshInFlightTasks()
    }
  }, 15000)
})

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

watch(isQualityRoute, (active) => {
  if (active) {
    void refreshInFlightTasks()
  }
})
</script>

<template>
  <div
    v-if="isQualityRoute && runningCount > 0"
    class="ai-task-running-bar"
    role="status"
  >
    <LoadingOutlined spin class="ai-task-running-bar__icon" />
    <span class="ai-task-running-bar__text">
      AI 任务运行中 {{ runningCount }} 个
      <template v-if="processingCount > 0">（执行中 {{ processingCount }}</template>
      <template v-if="pendingCount > 0">
        <template v-if="processingCount > 0">，</template>
        排队 {{ pendingCount }}
      </template>
      <template v-if="processingCount > 0">）</template>
    </span>
    <button type="button" class="ai-task-running-bar__action" @click="goAiTaskCenter">
      查看 AI 任务
    </button>
  </div>
</template>

<style lang="scss" scoped>
.ai-task-running-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: var(--ant-color-primary-bg);
  border-bottom: 1px solid var(--ant-color-primary-border);
  color: var(--ant-color-primary);
  font-size: 13px;

  &__icon {
    font-size: 14px;
  }

  &__text {
    flex: 1;
    min-width: 0;
  }

  &__action {
    border: none;
    background: transparent;
    color: var(--ant-color-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
