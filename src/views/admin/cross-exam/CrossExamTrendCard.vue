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

        <div v-if="trendItems.length > 0" class="ai-items">
          <strong>结构化趋势条目：</strong>
          <a-list size="small" :data-source="trendItems" bordered>
            <template #renderItem="{ item, index }">
              <a-list-item>
                <div class="analysis-item">
                  <div class="analysis-item__header">
                    <a-typography-text strong>#{{ index + 1 }}</a-typography-text>
                    <span class="analysis-item__title">
                      {{ item.title || item.metricName || item.examName || '趋势条目' }}
                    </span>
                    <a-tag v-if="item.trend">{{ item.trend }}</a-tag>
                  </div>
                  <div v-if="item.examName" class="analysis-item__meta">
                    考试：{{ item.examName }}
                  </div>
                  <a-typography-paragraph v-if="item.summary" class="analysis-item__text">
                    {{ item.summary }}
                  </a-typography-paragraph>
                  <a-typography-paragraph v-if="item.suggestion" class="analysis-item__text">
                    <strong>建议：</strong>{{ item.suggestion }}
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
import type { CrossExamTrendAnalysisVO } from '@/apis/mark/cross-exam-analysis'
import {
  generateClassTrend,
  generateCourseTrend,
  listTrends,
} from '@/apis/mark/cross-exam-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { aiAnalysisStatusColor, aiAnalysisStatusLabel } from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { formatDateTime } from '@/utils/format'

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

const trendItems = computed(() => record.value?.trendItems ?? [])

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
    record.value =
      scopeMode.value === 'COURSE'
        ? await generateCourseTrend({ courseId, examIds })
        : await generateClassTrend({ courseId, classId: form.classId.trim(), examIds })
    message.success('已生成趋势分析')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
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
.analysis-item__meta,
.analysis-item__text {
  margin: 0;
  color: var(--gi-color-text-2, rgba(0, 0, 0, 0.75));
  line-height: 1.6;
}
.text-muted {
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
}
</style>
