<template>
  <a-card title="AI 错因聚类分析" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-button type="primary" :loading="generating" @click="handleGenerate"> 重新生成 </a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新最新
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <!-- D-9 错误态：AI 错因聚类加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 错因聚类加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无 AI 错因聚类，可点击重新生成。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="聚类数">{{ record.clusterCount ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">
            {{
              formatDateTime(record.createTime)
            }}
          </a-descriptions-item>
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

        <div v-if="clusterItems.length > 0" class="ai-items">
          <strong>错因聚类：</strong>
          <a-list size="small" :data-source="clusterItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>#{{ index + 1 }}</a-typography-text>
                    <span class="analysis-item__title">
                      {{ item.clusterName || item.questionType || '错因聚类' }}
                    </span>
                    <span v-if="item.studentCount != null" class="analysis-item__metric">
                      涉及学生 {{ item.studentCount }} 人
                    </span>
                  </div>
                  <a-typography-paragraph v-if="item.causeAnalysis" class="analysis-item__text">
                    <strong>原因分析：</strong>{{ item.causeAnalysis }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>改进建议：</strong>{{ item.suggestion }}
                  </a-typography-paragraph>
                  <div
                    v-if="item.affectedQuestionNos && item.affectedQuestionNos.length > 0"
                    class="analysis-item__text"
                  >
                    <strong>关联题号：</strong>{{ item.affectedQuestionNos.join(', ') }}
                  </div>
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
import type { ExamErrorCauseClusterVO } from '@/apis/mark/error-cause-cluster'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  generateErrorCauseCluster,
  getLatestErrorCauseCluster,
} from '@/apis/mark/error-cause-cluster'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'ErrorCauseClusterCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()

const record = ref<ExamErrorCauseClusterVO | null>(null)
const loading = ref(false)
const generating = ref(false)
// D-9 错误态：AI 错因聚类加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)

const clusterItems = computed(() => record.value?.clusterItems ?? [])

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  loadError.value = null
  try {
    record.value = await getLatestErrorCauseCluster(props.examId)
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
    record.value = await generateErrorCauseCluster(props.examId)
    message.success('已生成最新错因聚类')
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
.analysis-item__metric {
  margin-left: auto;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.65));
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
