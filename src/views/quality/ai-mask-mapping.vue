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
import type { FilterField } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AI_TASK_BUSINESS_TYPE_LABEL,
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiMaskMappingApi,
  aiTaskApi,
} from '@/apis/quality'
import { UiEmpty, UiFilterBar } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { readPageList } from '@/utils/page-result'
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

const filterForm = reactive({ aiTaskId: '' })

const filterFields: FilterField[] = [
  {
    key: 'aiTaskId',
    type: 'custom',
    label: 'AI 任务',
    width: 360,
    minWidth: 280,
    maxWidth: 480,
  },
]

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
    taskOptions.value = readPageList(page, 'AI 任务列表加载失败，请稍后重试').map((task) => ({
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
    filterForm.aiTaskId = ''
    selectedAiTaskId.value = ''
    return
  }
  const next = typeof value === 'string' ? value : ''
  filterForm.aiTaskId = next
  selectedAiTaskId.value = next
}

function handleFilterSearch() {
  selectedAiTaskId.value = filterForm.aiTaskId.trim()
  void loadMapping()
}

function handleFilterReset() {
  filterForm.aiTaskId = ''
  selectedAiTaskId.value = ''
  mappingVO.value = null
  taskVO.value = null
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
  filterForm.aiTaskId = selectedAiTaskId.value
  await loadTaskOptions()
  if (selectedAiTaskId.value) await loadMapping()
})
</script>

<template>
  <StageWorkbenchShell>
    <UiCard class="detail-table-card ai-mask__main-card">
      <template #title>脱敏映射审计</template>

      <UiFilterBar
        v-model="filterForm"
        :fields="filterFields"
        show-labels
        search-text="查询"
        @search="handleFilterSearch"
        @reset="handleFilterReset"
      >
        <template #field-aiTaskId>
          <a-select
            :value="selectedTaskSelectValue"
            :options="taskOptions"
            :loading="taskLoading"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="选择 AI 任务"
            class="ai-mask__selector"
            style="width: 100%"
            @change="handleTaskChange"
          />
        </template>
      </UiFilterBar>

      <template v-if="taskVO">
        <h4 class="ai-mask__section-title">AI 任务概览</h4>
        <a-descriptions :column="2" size="small" bordered class="ai-mask__descriptions">
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
      </template>

      <UiEmpty
        v-if="!loading && selectedAiTaskId && !mappingVO"
        description="尚未查询到脱敏映射记录，请确认该任务已完成脱敏处理"
        size="sm"
        class="ai-mask__empty"
      />

      <template v-else-if="mappingVO">
        <h4 class="ai-mask__section-title">脱敏映射记录</h4>
        <a-descriptions :column="2" size="small" bordered class="ai-mask__descriptions">
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
      </template>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.ai-mask {
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
