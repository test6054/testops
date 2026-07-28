<script lang="ts" setup>
/** 质量评价域 AI 任务运行条：由 quality-workspace-layout 挂载。 */
import LoadingOutlined from '@ant-design/icons-vue/LoadingOutlined'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAiTaskStore } from '@/stores/modules/aiTask'
import { useQualityTaskStore } from '@/stores/modules/qualityTask'

defineOptions({ name: 'AiTaskRunningBar' })

const router = useRouter()
const qualityTaskStore = useQualityTaskStore()
const aiTaskStore = useAiTaskStore()
const { aiTasksInFlight, aiTasksProcessing } = storeToRefs(qualityTaskStore)

const runningCount = computed(() => aiTasksInFlight.value.length + aiTaskStore.activePollingCount)

const processingCount = computed(() => aiTasksProcessing.value.length)

const pendingCount = computed(() => runningCount.value - processingCount.value)

let pollTimer: ReturnType<typeof setInterval> | null = null

async function refreshInFlightTasks(): Promise<void> {
  try {
    // 顶部条轮询：不重复刷 Message；失败时保留上次条数，不阻断页面
    await qualityTaskStore.refreshAll({}, { silent: true })
  } catch {
    // refreshAll 已内部吞掉并保留上次数据
  }
}

function goAiTaskCenter(): void {
  void router.push({ name: 'QualityAiTask' })
}

onMounted(() => {
  void refreshInFlightTasks()
  pollTimer = setInterval(() => {
    if (runningCount.value > 0) {
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
</script>

<template>
  <div v-if="runningCount > 0" class="ai-task-running-bar" role="status">
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
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  background: var(--dp-blue-50, var(--dp-color-primary-bg));
  border-bottom: 1px solid var(--dp-blue-200, var(--dp-color-primary-border));
  color: var(--dp-blue-600, var(--dp-color-primary));
  font-size: var(--dp-font-size-sm);

  &__icon {
    font-size: var(--dp-font-size-md);
  }

  &__text {
    flex: 1;
    min-width: 0;
  }

  &__action {
    border: none;
    background: transparent;
    color: var(--dp-blue-600, var(--dp-color-primary));
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    cursor: pointer;
    padding: 0;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
