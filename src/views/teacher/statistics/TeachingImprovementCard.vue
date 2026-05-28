<template>
  <a-card title="AI 教学改进建议" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-button type="primary" :loading="generating" @click="handleGenerate"> 重新生成 </a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新最新
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <!-- D-9 错误态：教学改进建议加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 教学改进建议加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无 AI 教学改进建议，可点击重新生成。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="生成时间">
            {{
              formatDateTime(record.createTime)
            }}
          </a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ record.latencyMs ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="trace ID" :span="3">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item label="错误信息" v-if="record.errorMessage" :span="3">
            <a-typography-text type="danger">{{ record.errorMessage }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.overallSummary" class="ai-summary">
          <strong>总体摘要：</strong>{{ record.overallSummary }}
        </a-typography-paragraph>

        <div v-if="improvementItems.length > 0" class="ai-items">
          <strong>结构化建议：</strong>
          <a-list size="small" :data-source="improvementItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>#{{ index + 1 }}</a-typography-text>
                    <span class="analysis-item__title">{{ item.title || '教学改进建议' }}</span>
                    <a-tag v-if="item.priority">{{ item.priority }}</a-tag>
                  </div>
                  <a-typography-paragraph v-if="item.problem" class="analysis-item__text">
                    <strong>问题：</strong>{{ item.problem }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>建议：</strong>{{ item.suggestion }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.action" class="analysis-item__text">
                    <strong>行动：</strong>{{ item.action }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.expectedOutcome" class="analysis-item__text">
                    <strong>预期成效：</strong>{{ item.expectedOutcome }}
                  </a-typography-paragraph>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </div>
    </a-spin>
  </a-card>
</template>

<script lang="ts" setup>
import type {
  ExamTeachingAnalysisRecordVO,
  TeachingImprovementItemVO,
} from '@/apis/mark/teaching-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  aiAnalysisStatusColor,
  aiAnalysisStatusLabel,
  generateTeachingImprovement,
  getLatestTeachingImprovement,
} from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeachingImprovementCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
const generating = ref(false)
// D-9 错误态：教学改进建议加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)

const improvementItems = computed<TeachingImprovementItemVO[]>(() => {
  return (record.value?.improvementItems ?? []) as TeachingImprovementItemVO[]
})

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    record.value = await getLatestTeachingImprovement(props.examId)
  } catch (e) {
    record.value = null
    loadError.value = e
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  generating.value = true
  try {
    record.value = await generateTeachingImprovement(props.examId)
    message.success('已生成最新建议')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
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
.analysis-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.analysis-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.analysis-item__title {
  font-weight: 600;
}
.analysis-item__text {
  margin: 0;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.75));
  line-height: 1.6;
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
