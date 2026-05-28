<script setup lang="ts">
/**
 * 质量评价 / AI 能力 - AI 脱敏映射审计台
 *
 * 后端契约（AiMaskMappingController）：
 * - POST /quality/ai-mask-mapping/get-by-task  映射记录查询
 *
 * 入口：
 *  - 直接打开页面后输入 AI 任务 ID 查询
 *  - 从 AI 任务详情抽屉点击「查看脱敏审计」跳转，自动加载（query.aiTaskId）
 */
import type { AiMaskMappingVO, AiTaskVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AI_TASK_BUSINESS_TYPE_LABEL,
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiMaskMappingApi,
  aiTaskApi,
  isAiTaskBusinessType,
  isAiTaskStatus,
  isAiTaskType,
} from '@/apis/quality'
import { UiButton, UiEmpty } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'

function aiTaskTypeLabel(value: unknown): string {
  if (isAiTaskType(value)) return AI_TASK_TYPE_LABEL[value]
  throw new Error('AI 任务类型不符合前后端契约')
}

function aiTaskStatusLabel(value: unknown): string {
  if (isAiTaskStatus(value)) return AI_TASK_STATUS_LABEL[value]
  throw new Error('AI 任务状态不符合前后端契约')
}

function aiTaskStatusColor(value: unknown): string {
  if (isAiTaskStatus(value)) return AI_TASK_STATUS_COLOR[value]
  throw new Error('AI 任务状态不符合前后端契约')
}

function aiTaskBusinessTypeLabel(value: unknown): string {
  if (isAiTaskBusinessType(value)) return AI_TASK_BUSINESS_TYPE_LABEL[value]
  if (value === null || value === undefined || value === '') return '-'
  throw new Error('AI 任务业务类型不符合前后端契约')
}

const route = useRoute()
const router = useRouter()

const aiTaskIdInput = ref<string>(String(route.query.aiTaskId ?? ''))
const loading = ref(false)

const taskVO = ref<AiTaskVO | null>(null)
const mappingVO = ref<AiMaskMappingVO | null>(null)

async function loadMapping() {
  const id = aiTaskIdInput.value?.trim()
  if (!id) {
    message.warning('请输入 AI 任务 ID')
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
    if (!mapping) message.info('该 AI 任务尚未生成脱敏映射')
    if (route.query.aiTaskId !== id)
      void router.replace({ query: { ...route.query, aiTaskId: id } })
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.aiTaskId,
  (val) => {
    const next = String(val ?? '')
    if (next && next !== aiTaskIdInput.value) {
      aiTaskIdInput.value = next
      loadMapping()
    }
  },
)

onMounted(() => {
  if (aiTaskIdInput.value) loadMapping()
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
          <a-input
            v-model:value="aiTaskIdInput"
            placeholder="输入 AI 任务 ID"
            class="ai-mask__input"
            @press-enter="loadMapping"
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
        <a-descriptions-item label="任务 ID">
          {{ taskVO.id }}
        </a-descriptions-item>
        <a-descriptions-item label="能力">
          {{ aiTaskTypeLabel(taskVO.taskType) }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="aiTaskStatusColor(taskVO.status)">
            {{ aiTaskStatusLabel(taskVO.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作人">
          {{ taskVO.operatorUserId ? '已记录操作人' : '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型">
          {{ aiTaskBusinessTypeLabel(taskVO.businessType) }}
          <span v-if="taskVO.businessId"> / 已关联业务对象</span>
        </a-descriptions-item>
        <a-descriptions-item label="脱敏映射 ID">
          {{ taskVO.maskMappingId || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </section>

    <section v-if="!loading && !mappingVO" class="ai-mask__panel">
      <UiEmpty
        description="尚未查询到脱敏映射记录，请输入 AI 任务 ID 后点击「查询映射记录」"
        size="sm"
      />
    </section>

    <section v-else-if="mappingVO" class="ai-mask__panel">
      <header class="ai-mask__panel-header">
        <h3 class="ai-mask__panel-title">脱敏映射记录</h3>
      </header>
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="映射 ID">
          {{ mappingVO.id }}
        </a-descriptions-item>
        <a-descriptions-item label="AI 任务 ID">
          {{ mappingVO.aiTaskId }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型">
          {{ aiTaskBusinessTypeLabel(mappingVO.businessType) }}
          <span v-if="mappingVO.businessId"> / 已关联业务对象</span>
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ mappingVO.createTime || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="记录说明" :span="2">
          当前页面只展示脱敏映射的审计摘要，不展示明文、密文载荷或加密参数。
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

  &__input {
    width: 240px;
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
