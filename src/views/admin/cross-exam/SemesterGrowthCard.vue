<template>
  <a-card title="AI 学期能力成长曲线" :bordered="false" size="small">
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="学期编码">
          <a-input
            v-model:value="form.semesterCode"
            placeholder="例如 2026-S1"
            allow-clear
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="课程ID">
          <a-input
            v-model:value="form.courseId"
            placeholder="请输入课程ID"
            allow-clear
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="班级ID">
          <a-input
            v-model:value="form.classId"
            placeholder="请输入班级ID"
            allow-clear
            style="width: 140px"
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
              生成成长曲线
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <!-- D-9 错误态：AI 学期成长加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 学期成长加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无成长曲线，请填写参数后生成。" />
      <div v-else class="ai-record">
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="AI_ANALYSIS_STATUS_COLOR[record.analysisStatus || 'PENDING']">
              {{ AI_ANALYSIS_STATUS_LABEL[record.analysisStatus || 'PENDING'] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="学期">{{ record.semesterCode ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="范围">
            {{ record.scopeType ?? '-' }}/{{ record.scopeId ?? '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="考试数">{{ record.examCount ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="趋势">
            <a-tag :color="trendColor(record.growthTrend)">
              {{ trendLabel(record.growthTrend) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ record.latencyMs ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间" :span="2">
            {{ fmt(record.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="trace ID">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="错误信息" :span="3">
            <a-typography-text type="danger">{{ record.errorMessage }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.growthSummary" class="ai-summary">
          <strong>成长摘要：</strong>{{ record.growthSummary }}
        </a-typography-paragraph>

        <div v-if="parsedItems.length > 0" class="ai-items">
          <strong>各阶段能力点：</strong>
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
import type { SemesterAbilityGrowthVO } from '@/apis/mark/cross-exam-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'
import { generateClassGrowth, listGrowth } from '@/apis/mark/cross-exam-analysis'
import { AI_ANALYSIS_STATUS_COLOR, AI_ANALYSIS_STATUS_LABEL } from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'

defineOptions({ name: 'SemesterGrowthCard' })

const form = reactive({
  semesterCode: '',
  courseId: '',
  classId: '',
  examIdsText: '',
})

const record = ref<SemesterAbilityGrowthVO | null>(null)
const loading = ref(false)
// D-9 错误态：AI 学期成长加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
const generating = ref(false)

const parsedItems = computed(() => {
  if (!record.value?.growthItems) return []
  try {
    const parsed = JSON.parse(record.value.growthItems)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

function parseExamIds(): string[] {
  return form.examIdsText
    .split(/[,，\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

async function reload(): Promise<void> {
  if (!form.semesterCode.trim() || !form.classId.trim()) {
    message.warning('需要学期编码和班级ID')
    return
  }
  loadError.value = null
  loading.value = true
  try {
    const list = await listGrowth({
      semesterCode: form.semesterCode.trim(),
      scopeType: 'CLASS',
      scopeId: form.classId.trim(),
    })
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
  const semesterCode = form.semesterCode.trim()
  const courseId = form.courseId.trim()
  const classId = form.classId.trim()
  const examIds = parseExamIds()
  if (!semesterCode || !courseId || !classId) {
    message.warning('学期编码、课程ID、班级ID 必填')
    return
  }
  if (examIds.length < 2) {
    message.warning('至少需要 2 个考试ID')
    return
  }
  generating.value = true
  try {
    record.value = await generateClassGrowth({ semesterCode, courseId, classId, examIds })
    message.success('已生成成长曲线')
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

function trendLabel(trend?: string): string {
  switch (trend) {
    case 'IMPROVING':
      return '上升'
    case 'STABLE':
      return '稳定'
    case 'DECLINING':
      return '下降'
    case 'FLUCTUATING':
      return '波动'
    default:
      return trend ?? '-'
  }
}

function trendColor(trend?: string): string {
  switch (trend) {
    case 'IMPROVING':
      return 'green'
    case 'STABLE':
      return 'blue'
    case 'DECLINING':
      return 'red'
    case 'FLUCTUATING':
      return 'orange'
    default:
      return 'default'
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
