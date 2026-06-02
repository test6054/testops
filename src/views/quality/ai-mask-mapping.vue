<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
/**
 * 质量评价 / AI 能力 - AI 脱敏映射审计台
 *
 * 后端契约（AiMaskMappingController）：
 * - POST /quality/ai-mask-mapping/get-by-task  映射记录查询
 *
 * 入口：
 *  - 直接打开页面后选择 AI 任务查询
 *  - 从 AI 任务详情抽屉点击「查看脱敏审计」跳转，自动加载（query.aiTaskId）
 */
import type {
  AiMaskMappingVO,
  AiTaskBusinessType,
  AiTaskStatus,
  AiTaskType,
  AiTaskVO,
} from '@/apis/quality'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AI_TASK_BUSINESS_TYPE_LABEL,
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiMaskMappingApi,
  aiTaskApi,
} from '@/apis/quality'
import { UiButton, UiEmpty } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function aiTaskTypeLabel(value: AiTaskType): string {
  return strictEnumLabel(AI_TASK_TYPE_LABEL, value, 'AI 任务类型')
}

function aiTaskStatusLabel(value: AiTaskStatus): string {
  return strictEnumLabel(AI_TASK_STATUS_LABEL, value, 'AI 任务状态')
}

function aiTaskStatusColor(value: AiTaskStatus): string {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, 'AI 任务状态')
}

function aiTaskBusinessTypeLabel(value: AiTaskBusinessType): string {
  return strictEnumLabel(AI_TASK_BUSINESS_TYPE_LABEL, value, 'AI 任务业务类型')
}

const route = useRoute()
const router = useRouter()

const selectedAiTaskId = ref<string>(
  typeof route.query.aiTaskId === 'string' ? route.query.aiTaskId : '',
)
const loading = ref(false)
const taskLoading = ref(false)
const taskOptions = ref<Array<{ value: string, label: string }>>([])

const taskVO = ref<AiTaskVO | null>(null)
const mappingVO = ref<AiMaskMappingVO | null>(null)

const selectedTaskSelectValue = computed(() =>
  taskOptions.value.some((option) => option.value === selectedAiTaskId.value)
    ? selectedAiTaskId.value
    : undefined,
)

async function loadTaskOptions() {
  taskLoading.value = true
  try {
    const page = await aiTaskApi.page({
      pageNum: 1,
      pageSize: 50,
    })
    taskOptions.value = page.list.map((task) => ({
      value: task.id,
      label: `${aiTaskTypeLabel(task.taskType)} / ${aiTaskStatusLabel(task.status)} / ${task.businessLabel}`,
    }))
  } finally {
    taskLoading.value = false
  }
}

function handleTaskChange(value: SelectValue): void {
  if (Array.isArray(value) || typeof value === 'number') {
    message.error('AI 任务选择无效，请重新选择')
    selectedAiTaskId.value = ''
    return
  }
  selectedAiTaskId.value = typeof value === 'string' ? value : ''
}

async function loadMapping() {
  const id = selectedAiTaskId.value.trim()
  if (!id) {
    return
  }
  loading.value = true
  mappingVO.value = null
  taskVO.value = null
  try {
    const [task, mapping] = await Promise.all([
      aiTaskApi.detail(id),
      aiMaskMappingApi.getByTask(id),
    ])
    taskVO.value = task
    mappingVO.value = mapping
    if (!taskOptions.value.some((option) => option.value === task.id)) {
      taskOptions.value = [
        {
          value: task.id,
          label: `${aiTaskTypeLabel(task.taskType)} / ${aiTaskStatusLabel(task.status)} / ${task.businessLabel}`,
        },
        ...taskOptions.value,
      ]
    }
    if (route.query.aiTaskId !== id)
      void router.replace({ query: { ...route.query, aiTaskId: id } })
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.aiTaskId,
  (val) => {
    const next = typeof val === 'string' ? val : ''
    if (next && next !== selectedAiTaskId.value) {
      selectedAiTaskId.value = next
      loadMapping()
    }
  },
)

onMounted(async () => {
  await loadTaskOptions()
  if (selectedAiTaskId.value) loadMapping()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="ai-mask__context">
        <div class="ai-mask__context-info">
          <h2 class="ai-mask__title">质量评价 - AI 脱敏映射审计</h2>
        </div>
        <div class="ai-mask__context-actions">
          <a-select
            :value="selectedTaskSelectValue"
            :options="taskOptions"
            :loading="taskLoading"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="选择 AI 任务"
            class="ai-mask__selector"
            @change="handleTaskChange"
          />
          <UiButton variant="primary" size="sm" :loading="loading" @click="loadMapping">
            查询映射记录
          </UiButton>
        </div>
      </div>
    </template>

    <section v-if="taskVO" class="ai-mask__panel">
      <header class="ai-mask__panel-header">
        <h3 class="ai-mask__panel-title">AI 任务概览</h3>
      </header>
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="能力">
          {{ aiTaskTypeLabel(taskVO.taskType) }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="aiTaskStatusColor(taskVO.status)">
            {{ aiTaskStatusLabel(taskVO.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作人">
          {{ taskVO.operatorUserName }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型">
          {{ aiTaskBusinessTypeLabel(taskVO.businessType) }} / {{ taskVO.businessLabel }}
        </a-descriptions-item>
        <a-descriptions-item label="脱敏映射">
          {{ taskVO.maskMappingId ? '已完成脱敏处理' : '未完成脱敏处理' }}
        </a-descriptions-item>
      </a-descriptions>
    </section>

    <section v-if="!loading && !mappingVO" class="ai-mask__panel">
      <UiEmpty
        description="尚未查询到脱敏映射记录，请选择 AI 任务后点击「查询映射记录」"
        size="sm"
      />
    </section>

    <section v-else-if="mappingVO" class="ai-mask__panel">
      <header class="ai-mask__panel-header">
        <h3 class="ai-mask__panel-title">脱敏映射记录</h3>
      </header>
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="业务类型">
          {{ aiTaskBusinessTypeLabel(mappingVO.businessType) }} / {{ mappingVO.businessLabel }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ mappingVO.createTime }}
        </a-descriptions-item>
        <a-descriptions-item label="记录说明" :span="2">
          当前页面展示脱敏处理状态与审计时间，敏感内容不在页面侧呈现。
        </a-descriptions-item>
      </a-descriptions>
    </section>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-mask {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__selector {
    width: 360px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;

    & + & {
      margin-top: 16px;
    }
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }
}
</style>
