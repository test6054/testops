<template>
  <a-card title="AI 跨考试趋势分析" :bordered="false" size="small">
    <template #extra>
      <a-radio-group v-model:value="scopeMode" size="small" button-style="solid">
        <a-radio-button value="COURSE">课程维度</a-radio-button>
        <a-radio-button value="CLASS">班级维度</a-radio-button>
      </a-radio-group>
    </template>

    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="课程ID">
          <a-input
            v-model:value="form.courseId"
            placeholder="请输入课程ID"
            allow-clear
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item v-if="scopeMode === 'CLASS'" label="班级ID">
          <a-input
            v-model:value="form.classId"
            placeholder="请输入班级ID"
            allow-clear
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="考试ID列表" style="flex: 1; min-width: 320px">
          <a-input
            v-model:value="form.examIdsText"
            placeholder="多个考试ID用英文逗号分隔，至少 2 个"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button :loading="loading" @click="reload">
              <template #icon><ReloadOutlined /></template>查看历史
            </a-button>
            <a-button type="primary" :loading="generating" @click="handleGenerate">
              生成分析
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <!-- D-9 错误态：AI 跨考试趋势加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 跨考试趋势加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无趋势分析记录，请填写参数后生成。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="aiAnalysisStatusColor(record.analysisStatus)">
              {{ aiAnalysisStatusLabel(record.analysisStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="维度">{{ record.scopeType ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="考试数">{{ record.examCount ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="课程ID">{{ record.courseId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="班级ID">{{ record.classId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ record.latencyMs ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间" :span="2">
            {{ formatDateTime(record.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="trace ID">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="错误信息" :span="3">
            <a-typography-text type="danger">{{ record.errorMessage }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.trendSummary" class="ai-summary">
          <strong>趋势摘要：</strong>{{ record.trendSummary }}
        </a-typography-paragraph>

        <div v-if="parsedItems.length > 0" class="ai-items">
          <strong>结构化趋势条目：</strong>
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
import type { CrossExamTrendAnalysisVO } from '@/apis/mark/cross-exam-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import {
  generateClassTrend,
  generateCourseTrend,
  listTrends,
} from '@/apis/mark/cross-exam-analysis'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { formatDateTime } from '@/utils/format'
import { strictJsonArray } from '@/utils/strict-enum'

defineOptions({ name: 'CrossExamTrendCard' })

const scopeMode = ref<'COURSE' | 'CLASS'>('COURSE')

const form = reactive({
  courseId: '',
  classId: '',
  examIdsText: '',
})

const record = ref<CrossExamTrendAnalysisVO | null>(null)
const loading = ref(false)
// D-9 错误态：AI 跨考试趋势加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
const generating = ref(false)

const parsedItems = computed(() => {
  return strictJsonArray(record.value?.trendItems, 'AI 跨考试趋势条目')
})

function parseExamIds(): string[] {
  return form.examIdsText
    .split(/[,，\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

async function reload(): Promise<void> {
  if (!form.courseId.trim()) {
    message.warning('请输入课程ID')
    return
  }
  loadError.value = null
  loading.value = true
  try {
    const list = await listTrends({ scopeType: scopeMode.value, courseId: form.courseId.trim() })
    record.value = list[0] ?? null
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    loadError.value = e
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const courseId = form.courseId.trim()
  const examIds = parseExamIds()
  if (!courseId) {
    message.warning('请输入课程ID')
    return
  }
  if (examIds.length < 2) {
    message.warning('至少需要 2 个考试ID')
    return
  }
  if (scopeMode.value === 'CLASS' && !form.classId.trim()) {
    message.warning('班级维度需要班级ID')
    return
  }
  generating.value = true
  try {
    record.value
      = scopeMode.value === 'COURSE'
        ? await generateCourseTrend({ courseId, examIds })
        : await generateClassTrend({ courseId, classId: form.classId.trim(), examIds })
    message.success('已生成趋势分析')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}


function formatItem(item: unknown): string {
  if (typeof item === 'string') return item
  return JSON.stringify(item, null, 2)
}
</script>

<style lang="scss" scoped>
.ai-form {
  margin-bottom: 16px;
}
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
