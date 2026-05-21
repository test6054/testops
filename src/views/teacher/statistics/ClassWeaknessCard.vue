<template>
  <a-card title="AI 班级薄弱题型分析" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-input
          v-model:value="classIdInput"
          placeholder="请输入班级ID"
          style="width: 180px"
          allow-clear
        />
        <a-button :loading="loading" :disabled="!classIdInput" @click="reload">
          <template #icon><ReloadOutlined /></template>查看最新
        </a-button>
        <a-button
          type="primary"
          :loading="generating"
          :disabled="!classIdInput"
          @click="handleGenerate"
        >
          重新生成
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <!-- D-9 错误态：AI 班级薄弱题型加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 班级薄弱题型加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!hasQueried" description="请输入班级ID后查看或生成。" />
      <a-empty v-else-if="!record" description="该班级暂无 AI 薄弱题型分析。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="AI_ANALYSIS_STATUS_COLOR[record.analysisStatus || 'PENDING']">
              {{ AI_ANALYSIS_STATUS_LABEL[record.analysisStatus || 'PENDING'] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="班级ID">{{ record.scopeId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">{{ fmt(record.createTime) }}</a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ record.latencyMs ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="trace ID" :span="2">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="错误信息" :span="3">
            <a-typography-text type="danger">{{ record.errorMessage }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.overallSummary" class="ai-summary">
          <strong>总体摘要：</strong>{{ record.overallSummary }}
        </a-typography-paragraph>

        <div v-if="parsedItems.length > 0" class="ai-items">
          <strong>薄弱题型：</strong>
          <a-list size="small" :data-source="parsedItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <a-typography-text strong>#{{ index + 1 }}</a-typography-text>
                <a-typography-paragraph
                  :content="formatItem(item)"
                  :copyable="true"
                  style="margin: 0 0 0 8px; flex: 1"
                />
              </a-list-item>
            </template>
          </a-list>
        </div>

        <a-collapse v-if="record.evidenceSnapshot || record.aiRawResponse" :bordered="false">
          <a-collapse-panel v-if="record.evidenceSnapshot" key="evidence" header="证据快照 JSON">
            <pre class="raw-json">{{ record.evidenceSnapshot }}</pre>
          </a-collapse-panel>
          <a-collapse-panel v-if="record.aiRawResponse" key="raw" header="AI 原始响应">
            <pre class="raw-json">{{ record.aiRawResponse }}</pre>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </a-spin>
  </a-card>
</template>

<script lang="ts" setup>
import type { ExamTeachingAnalysisRecordVO } from '@/apis/mark/teaching-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import {
  AI_ANALYSIS_STATUS_COLOR,
  AI_ANALYSIS_STATUS_LABEL,
  generateClassWeaknessAnalysis,
  getLatestClassWeaknessAnalysis,
} from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'

defineOptions({ name: 'ClassWeaknessCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

/**
 * B-12 联动：本卡每次成功查询/生成后，把当前 classId 上抛给父级 statistics.vue，
 * 由父级统一展示「联动上下文」并把同一 classId 提示到学生学情卡，避免子卡片成为孤岛。
 */
const emit = defineEmits<{ (e: 'class-change', classId: string): void }>()

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
// D-9 错误态：AI 班级薄弱题型加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
const generating = ref(false)
const classIdInput = ref('')
const hasQueried = ref(false)

const parsedItems = computed(() => {
  if (!record.value?.improvementItems) return []
  try {
    const parsed = JSON.parse(record.value.improvementItems)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

async function reload(): Promise<void> {
  const classId = classIdInput.value.trim()
  if (!props.examId || !classId) return
  hasQueried.value = true
  loadError.value = null
  loading.value = true
  try {
    record.value = await getLatestClassWeaknessAnalysis({ examId: props.examId, classId })
    // B-12 联动：广播当前班级，便于学生学情卡显示同班级上下文
    emit('class-change', classId)
  } catch (e) {
    record.value = null
    loadError.value = e
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const classId = classIdInput.value.trim()
  if (!classId) {
    message.warning('请输入班级ID')
    return
  }
  hasQueried.value = true
  generating.value = true
  try {
    record.value = await generateClassWeaknessAnalysis({ examId: props.examId, classId })
    message.success('已生成最新分析')
    emit('class-change', classId)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

function formatItem(item: unknown): string {
  if (typeof item === 'string') return item
  return JSON.stringify(item, null, 2)
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    // 切换考试或外部刷新时清空当前结果，等待用户重新指定班级
    hasQueried.value = false
    record.value = null
  },
)
</script>

<style lang="scss" scoped>
.ai-record {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-summary {
  margin: 0;
}
.ai-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.raw-json {
  margin: 0;
  padding: 8px;
  font-family: var(--gi-font-family-mono, monospace);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--gi-color-bg-2, #f5f5f5);
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
