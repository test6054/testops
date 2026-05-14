<script setup lang="ts">
/**
 * AI 脱敏映射审计
 *
 * 通过 AI 任务 ID 查询脱敏映射密文（cipherPayload / cipherIv），并支持反脱敏拉取明文映射。
 * 反脱敏接口受后端 RBAC 控制，仅 SUPER_ADMIN 或任务发起人可调用。
 *
 * 入口：
 *  - 直接打开页面后输入 AI 任务 ID 查询
 *  - 从 AI 任务详情抽屉点击『查看脱敏审计』跳转，自动加载（query.aiTaskId）
 */
import type {
  AiMaskMappingRevealVO,
  AiMaskMappingVO,
  AiTaskVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiMaskMappingApi,
  aiTaskApi,
} from '@/apis/quality'

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
    ? Object.entries(revealVO.value.mapping).map(([placeholder, plaintext]) => ({ placeholder, plaintext }))
    : [],
)

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
    if (!mapping)
      message.info('该 AI 任务尚未生成脱敏映射')
    if (route.query.aiTaskId !== id)
      router.replace({ query: { ...route.query, aiTaskId: id } })
  }
  finally {
    loading.value = false
  }
}

function confirmReveal() {
  if (!mappingVO.value) {
    message.warning('请先查询到脱敏映射密文')
    return
  }
  Modal.confirm({
    title: '确认反脱敏？',
    content: '反脱敏后的明文映射包含个人信息 / 内部业务字段，仅授权角色可见，请确保仅在审计场景使用并严格保密。',
    okText: '我已知晓，确认反脱敏',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      revealLoading.value = true
      try {
        revealVO.value = await aiMaskMappingApi.reveal(aiTaskIdInput.value.trim())
        message.success('反脱敏成功，明文已加载')
      }
      finally {
        revealLoading.value = false
      }
    },
  })
}

function clearReveal() {
  revealVO.value = null
}

watch(() => route.query.aiTaskId, (val) => {
  const next = String(val ?? '')
  if (next && next !== aiTaskIdInput.value) {
    aiTaskIdInput.value = next
    loadMapping()
  }
})

onMounted(() => {
  if (aiTaskIdInput.value)
    loadMapping()
})
</script>

<template>
  <div class="ai-mask-mapping-page">
    <a-card title="AI 脱敏映射审计" :bordered="false">
      <template #extra>
        <a-space>
          <a-input
            v-model:value="aiTaskIdInput"
            placeholder="输入 AI 任务 ID"
            style="width: 220px"
            @press-enter="loadMapping"
          />
          <a-button type="primary" :loading="loading" @click="loadMapping">
            查询脱敏密文
          </a-button>
        </a-space>
      </template>

      <a-alert
        type="warning"
        show-icon
        message="提示词审计页面"
        description="本页面用于审计 AI 任务的脱敏映射密文，并可在授权下拉取明文映射。明文反脱敏接口受后端 RBAC 控制（仅 SUPER_ADMIN / 任务发起人 SCH_TECH 可调用），且调用记录会进入审计日志，请勿外泄。"
        style="margin-bottom: 16px"
      />

      <a-card v-if="taskVO" title="AI 任务概览" size="small" style="margin-bottom: 16px">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="任务 ID">
            {{ taskVO.id }}
          </a-descriptions-item>
          <a-descriptions-item label="能力">
            {{ AI_TASK_TYPE_LABEL[taskVO.taskType] || taskVO.taskType }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="AI_TASK_STATUS_COLOR[taskVO.status]">
              {{ AI_TASK_STATUS_LABEL[taskVO.status] }}
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
      </a-card>

      <a-empty
        v-if="!loading && !mappingVO"
        description="尚未查询到脱敏映射密文"
      />

      <a-card v-else-if="mappingVO" title="脱敏映射密文" size="small" style="margin-bottom: 16px">
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
            <pre class="cipher-pre">{{ mappingVO.cipherIv }}</pre>
          </a-descriptions-item>
          <a-descriptions-item label="AES-256 密文负载 (cipherPayload)" :span="2">
            <pre class="cipher-pre">{{ mappingVO.cipherPayload }}</pre>
          </a-descriptions-item>
        </a-descriptions>

        <a-divider style="margin: 12px 0" />

        <a-space>
          <a-button
            v-if="!revealVO"
            type="primary"
            danger
            :loading="revealLoading"
            @click="confirmReveal"
          >
            反脱敏（拉取明文映射）
          </a-button>
          <a-button v-else @click="clearReveal">
            清除明文显示
          </a-button>
        </a-space>
      </a-card>

      <a-card v-if="revealVO" title="反脱敏明文映射" size="small">
        <a-alert
          type="error"
          show-icon
          message="明文敏感信息"
          description="以下内容包含原始个人信息 / 业务字段，调用方需对其做严格访问控制，禁止截图、外发或存档至非安全环境。"
          style="margin-bottom: 12px"
        />

        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="AI 任务 ID">
            {{ revealVO.aiTaskId }}
          </a-descriptions-item>
          <a-descriptions-item label="业务类型 / ID">
            {{ revealVO.businessType }} / {{ revealVO.businessId }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider style="margin: 12px 0" />

        <h4>占位符 → 明文映射</h4>
        <a-table
          :data-source="revealEntries"
          :pagination="false"
          row-key="placeholder"
          size="middle"
          bordered
        >
          <a-table-column title="占位符 (placeholder)" data-index="placeholder" width="240" />
          <a-table-column title="明文 (plaintext)" data-index="plaintext" />
        </a-table>

        <a-divider style="margin: 12px 0" />

        <h4>原始 JSON 明文（解密结果）</h4>
        <pre class="cipher-pre">{{ revealVO.plaintextJson }}</pre>
      </a-card>
    </a-card>
  </div>
</template>

<style scoped lang="scss">
.ai-mask-mapping-page {
  padding: 16px;
}

.cipher-pre {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 320px;
  overflow: auto;
  margin: 0;
}
</style>
