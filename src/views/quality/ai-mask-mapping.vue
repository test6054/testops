<script setup lang="ts">
/**
 * 质量评价 / AI 能力 - AI 脱敏映射审计台
 *
 * 后端契约（AiMaskMappingController）：
 * - POST /quality/ai-mask-mapping/get-by-task  密文查询
 * - POST /quality/ai-mask-mapping/reveal       反脱敏拉取明文映射（受 RBAC 控制：仅 SUPER_ADMIN 或任务发起人）
 *
 * 入口：
 *  - 直接打开页面后输入 AI 任务 ID 查询
 *  - 从 AI 任务详情抽屉点击「查看脱敏审计」跳转，自动加载（query.aiTaskId）
 */
import type { AiMaskMappingRevealVO, AiMaskMappingVO, AiTaskVO } from '@/apis/quality'
import {
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiMaskMappingApi,
  aiTaskApi,
  isAiTaskStatus,
  isAiTaskType,
} from '@/apis/quality'
import { message } from 'ant-design-vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnsType } from 'ant-design-vue/es/table'
import { UiButton, UiDataTable, UiEmpty } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'

/* ========== 状态守卫 helper：禁用 as 类型断言 ========== */

function aiTaskTypeLabel(value: unknown): string {
  if (isAiTaskType(value)) return AI_TASK_TYPE_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
}

function aiTaskStatusLabel(value: unknown): string {
  if (isAiTaskStatus(value)) return AI_TASK_STATUS_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
}

function aiTaskStatusColor(value: unknown): string {
  if (isAiTaskStatus(value)) return AI_TASK_STATUS_COLOR[value]
  return 'default'
}

const route = useRoute()
const router = useRouter()

const aiTaskIdInput = ref<string>(String(route.query.aiTaskId ?? ''))
const loading = ref(false)
const revealLoading = ref(false)

const taskVO = ref<AiTaskVO | null>(null)
const mappingVO = ref<AiMaskMappingVO | null>(null)
const revealVO = ref<AiMaskMappingRevealVO | null>(null)

const revealEntries = computed(() =>
  revealVO.value?.mapping
    ? Object.entries(revealVO.value.mapping).map(([placeholder, plaintext]) => ({
        placeholder,
        plaintext,
      }))
    : [],
)

const revealColumns: ColumnsType = [
  { title: '占位符 (placeholder)', dataIndex: 'placeholder', key: 'placeholder', width: 240 },
  { title: '明文 (plaintext)', dataIndex: 'plaintext', key: 'plaintext' },
]

async function loadMapping() {
  const id = aiTaskIdInput.value?.trim()
  if (!id) {
    message.warning('请输入 AI 任务 ID')
    return
  }
  loading.value = true
  mappingVO.value = null
  revealVO.value = null
  taskVO.value = null
  try {
    const [task, mapping] = await Promise.all([
      aiTaskApi.detail(id).catch(() => null),
      aiMaskMappingApi.getByTask(id),
    ])
    taskVO.value = task
    mappingVO.value = mapping
    if (!mapping) message.info('该 AI 任务尚未生成脱敏映射')
    if (route.query.aiTaskId !== id) router.replace({ query: { ...route.query, aiTaskId: id } })
  } finally {
    loading.value = false
  }
}

function confirmReveal() {
  if (!mappingVO.value) {
    message.warning('请先查询到脱敏映射密文')
    return
  }
  void confirmAsync({
    title: '确认反脱敏？',
    content:
      '反脱敏后的明文映射包含个人信息 / 内部业务字段，仅授权角色可见，请确保仅在审计场景使用并严格保密。',
    okText: '我已知晓，确认反脱敏',
    cancelText: '取消',
    type: 'error',
    onOk: async () => {
      revealLoading.value = true
      try {
        revealVO.value = await aiMaskMappingApi.reveal(aiTaskIdInput.value.trim())
        message.success('反脱敏成功，明文已加载')
      } finally {
        revealLoading.value = false
      }
    },
  })
}

function clearReveal() {
  revealVO.value = null
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
            查询脱敏密文
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
        <a-descriptions-item label="操作人 ID">
          {{ taskVO.operatorUserId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型 / ID">
          {{ taskVO.businessType || '-' }} / {{ taskVO.businessId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="脱敏映射 ID">
          {{ taskVO.maskMappingId || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </section>

    <section v-if="!loading && !mappingVO" class="ai-mask__panel">
      <UiEmpty
        description="尚未查询到脱敏映射密文，请输入 AI 任务 ID 后点击「查询脱敏密文」"
        size="sm"
      />
    </section>

    <section v-else-if="mappingVO" class="ai-mask__panel">
      <header class="ai-mask__panel-header">
        <h3 class="ai-mask__panel-title">脱敏映射密文</h3>
        <div class="ai-mask__panel-actions">
          <UiButton
            v-if="!revealVO"
            variant="danger"
            size="sm"
            :loading="revealLoading"
            @click="confirmReveal"
          >
            反脱敏（拉取明文映射）
          </UiButton>
          <UiButton v-else variant="ghost" size="sm" @click="clearReveal"> 清除明文显示 </UiButton>
        </div>
      </header>
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="映射 ID">
          {{ mappingVO.id }}
        </a-descriptions-item>
        <a-descriptions-item label="AI 任务 ID">
          {{ mappingVO.aiTaskId }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型 / ID">
          {{ mappingVO.businessType }} / {{ mappingVO.businessId }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ mappingVO.createTime || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="AES-256 初始向量 (IV)" :span="2">
          <pre class="ai-mask__cipher-pre">{{ mappingVO.cipherIv }}</pre>
        </a-descriptions-item>
        <a-descriptions-item label="AES-256 密文负载 (cipherPayload)" :span="2">
          <pre class="ai-mask__cipher-pre">{{ mappingVO.cipherPayload }}</pre>
        </a-descriptions-item>
      </a-descriptions>
    </section>

    <section v-if="revealVO" class="ai-mask__panel ai-mask__panel--danger">
      <header class="ai-mask__panel-header">
        <h3 class="ai-mask__panel-title">反脱敏明文映射</h3>
      </header>

      <a-alert
        type="error"
        show-icon
        message="明文敏感信息"
        description="以下内容包含原始个人信息 / 业务字段，调用方需对其做严格访问控制，禁止截图、外发或存档至非安全环境。"
        class="ai-mask__alert"
      />

      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="AI 任务 ID">
          {{ revealVO.aiTaskId }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型 / ID">
          {{ revealVO.businessType }} / {{ revealVO.businessId }}
        </a-descriptions-item>
      </a-descriptions>

      <h4 class="ai-mask__section-title">占位符 -> 明文映射</h4>
      <UiDataTable
        :columns="revealColumns"
        :data-source="revealEntries"
        row-key="placeholder"
        size="middle"
        :show-pagination="false"
        flat
        :total="revealEntries.length"
      />

      <h4 class="ai-mask__section-title">原始 JSON 明文（解密结果）</h4>
      <pre class="ai-mask__cipher-pre">{{ revealVO.plaintextJson }}</pre>
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

    &--danger {
      border-color: var(--ant-color-error, #fda4af);
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

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__section-title {
    margin: 16px 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__cipher-pre {
    margin: 0;
    padding: 8px;
    background: var(--dp-gray-50, #f6f8fa);
    border: 1px solid var(--dp-border, #e1e4e8);
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 320px;
    overflow: auto;
  }
}
</style>
