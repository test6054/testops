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
import type { AiMaskMappingVO } from '@/apis/quality/ai-mask-mapping'
import type { AiTaskVO } from '@/apis/quality/ai-task'
import type { AiTaskBusinessTypeCode, AiTaskStatusCode, AiTaskTypeCode } from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { aiMaskMappingApi } from '@/apis/quality/ai-mask-mapping'
import { aiTaskApi } from '@/apis/quality/ai-task'
import {
  AI_TASK_STATUS_COLOR,
  AiTaskBusinessTypeDescription,
  AiTaskStatusDescription,
  AiTaskTypeDescription,
} from '@/apis/quality/types'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function aiTaskTypeLabel(value: AiTaskTypeCode): string {
  return strictEnumLabel(AiTaskTypeDescription, value, 'AI 任务类型')
}

function aiTaskStatusLabel(value: AiTaskStatusCode): string {
  return strictEnumLabel(AiTaskStatusDescription, value, 'AI 任务状态')
}

function aiTaskStatusColor(value: AiTaskStatusCode): BadgeTone {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, 'AI 任务状态')
}

function aiTaskBusinessTypeLabel(value: AiTaskBusinessTypeCode): string {
  return strictEnumLabel(AiTaskBusinessTypeDescription, value, 'AI 任务业务类型')
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

interface AiMaskMappingFilterModel {
  [key: string]: unknown
  aiTaskId: string
}

const filterForm = reactive<AiMaskMappingFilterModel>({ aiTaskId: '' })

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

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
    taskOptions.value = page.list.map((task) => ({
      value: task.id,
      label: `${aiTaskTypeLabel(task.taskType)} / ${aiTaskStatusLabel(task.status)} / ${task.businessLabel}`,
    }))
  } catch (error) {
    taskOptions.value = []
    showUserError(error, 'AI 任务选项加载失败')
  } finally {
    taskLoading.value = false
  }
}

function handleTaskChange(value: SelectValue): void {
  if (Array.isArray(value) || typeof value === 'number') {
    showFormValidationMessage('智能任务选择无效，请重新选择')
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
    const task = await aiTaskApi.detail(id)
    taskVO.value = task
    if (!taskOptions.value.some((option) => option.value === task.id)) {
      taskOptions.value = [
        {
          value: task.id,
          label: `${aiTaskTypeLabel(task.taskType)} / ${aiTaskStatusLabel(task.status)} / ${task.businessLabel}`,
        },
        ...taskOptions.value,
      ]
    }
    try {
      mappingVO.value = await aiMaskMappingApi.getByTask(id)
    } catch (error) {
      mappingVO.value = null
      showUserError(error, '脱敏映射记录加载失败')
    }
    if (route.query.aiTaskId !== id)
      void router.replace({ query: { ...route.query, aiTaskId: id } })
  } catch (error) {
    taskVO.value = null
    mappingVO.value = null
    showUserError(error, 'AI 任务详情加载失败')
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

async function handleScopeChange(): Promise<void> {
  await loadTaskOptions()
  if (selectedAiTaskId.value) {
    await loadMapping()
  }
}

onMounted(async () => {
  filterForm.aiTaskId = selectedAiTaskId.value
  await loadTaskOptions()
  if (selectedAiTaskId.value) await loadMapping()
})

onActivated(() => {
  void handleScopeChange()
})
</script>

<template>
  <StageWorkbenchShell>
    <UiCard class="detail-table-card ai-mask__main-card">
      <template #title>脱敏映射审计</template>

      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        show-labels
        search-text="查询"
        @search="handleFilterSearch"
        @reset="handleFilterReset"
      >
        <template #field-aiTaskId>
          <UiSelect
            size="sm"
            :model-value="selectedTaskSelectValue"
            :options="taskOptions"
            :loading="taskLoading"
            allow-clear
            allow-search
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
        <UiDescriptions :column="2" size="small" bordered class="ai-mask__descriptions">
          <UiDescriptionsItem label="能力">
            {{ aiTaskTypeLabel(taskVO.taskType) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="状态">
            <UiTag :tone="aiTaskStatusColor(taskVO.status)">
              {{ aiTaskStatusLabel(taskVO.status) }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="操作人">
            {{ taskVO.operatorUserName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="业务类型">
            {{ aiTaskBusinessTypeLabel(taskVO.businessType) }} / {{ taskVO.businessLabel }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="脱敏映射">
            {{ taskVO.maskMappingId ? '已完成脱敏处理' : '未完成脱敏处理' }}
          </UiDescriptionsItem>
        </UiDescriptions>
      </template>

      <UiEmpty
        v-if="!loading && selectedAiTaskId && !mappingVO"
        description="该任务尚未生成脱敏映射"
        size="sm"
        class="ai-mask__empty"
      />

      <template v-else-if="mappingVO">
        <h4 class="ai-mask__section-title">脱敏映射记录</h4>
        <UiDescriptions :column="2" size="small" bordered class="ai-mask__descriptions">
          <UiDescriptionsItem label="业务类型">
            {{ aiTaskBusinessTypeLabel(mappingVO.businessType) }} / {{ mappingVO.businessLabel }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="创建时间">
            {{ mappingVO.createTime }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="记录说明" :span="2">
            当前页面展示脱敏处理状态与审计时间，敏感内容不在页面侧呈现。
          </UiDescriptionsItem>
        </UiDescriptions>
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
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);

    & + & {
      margin-top: var(--dp-space-3, 12px);
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
    font-size: var(--dp-font-size-lg);
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}
</style>
