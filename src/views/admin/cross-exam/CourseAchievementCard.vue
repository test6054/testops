<template>
  <a-card title="AI 课程目标达成度分析" :bordered="false" size="small">
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
        <a-form-item label="学期编码">
          <a-input
            v-model:value="form.semesterCode"
            placeholder="可选，例如 2026-S1"
            allow-clear
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="考试ID列表" style="flex: 1; min-width: 320px">
          <a-input
            v-model:value="form.examIdsText"
            placeholder="多个考试ID用英文逗号分隔，至少 1 个"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button :loading="loading" @click="reload">
              <template #icon><ReloadOutlined /></template>查看历史
            </a-button>
            <a-button type="primary" :loading="generating" @click="handleGenerate">
              生成达成度分析
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <!-- D-9 错误态：AI 课程达成度加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="loadError"
        :error="loadError"
        title="AI 课程达成度加载失败"
        compact
        @retry="reload"
      />
      <a-empty v-else-if="!record" description="暂无达成度分析，请填写参数后生成。" />
      <div v-else class="ai-record">
        <a-row :gutter="12" class="metric-row">
          <a-col :span="8">
            <a-statistic
              title="整体达成率"
              :value="record.overallAchievementRate ?? 0"
              :precision="2"
              suffix=""
              :value-style="achievementStyle(record.overallAchievementRate)"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic title="考试数" :value="record.examCount ?? 0" />
          </a-col>
          <a-col :span="8">
            <a-statistic title="耗时(ms)" :value="record.latencyMs ?? 0" />
          </a-col>
        </a-row>

        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="AI_ANALYSIS_STATUS_COLOR[record.analysisStatus || 'PENDING']">
              {{ AI_ANALYSIS_STATUS_LABEL[record.analysisStatus || 'PENDING'] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="课程ID">{{ record.courseId ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="学期">{{ record.semesterCode ?? '-' }}</a-descriptions-item>
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

        <a-typography-paragraph v-if="record.achievementSummary" class="ai-summary">
          <strong>达成度摘要：</strong>{{ record.achievementSummary }}
        </a-typography-paragraph>

        <div v-if="parsedItems.length > 0" class="ai-items">
          <strong>分目标达成情况：</strong>
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
import type { CourseObjectiveAchievementVO } from '@/apis/mark/cross-exam-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'
import { generateAchievement, listAchievements } from '@/apis/mark/cross-exam-analysis'
import { AI_ANALYSIS_STATUS_COLOR, AI_ANALYSIS_STATUS_LABEL } from '@/apis/mark/teaching-analysis'
import { UiErrorRetryPanel } from '@/components/ui-guide/ui'

defineOptions({ name: 'CourseAchievementCard' })

const form = reactive({
  courseId: '',
  semesterCode: '',
  examIdsText: '',
})

const record = ref<CourseObjectiveAchievementVO | null>(null)
const loading = ref(false)
// D-9 错误态：AI 课程达成度加载失败时 UiErrorRetryPanel 重试 + 上报
const loadError = ref<unknown>(null)
const generating = ref(false)

const parsedItems = computed(() => {
  if (!record.value?.achievementItems) return []
  try {
    const parsed = JSON.parse(record.value.achievementItems)
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
  const courseId = form.courseId.trim()
  if (!courseId) {
    message.warning('请输入课程ID')
    return
  }
  loadError.value = null
  loading.value = true
  try {
    const list = await listAchievements({ courseId })
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
  if (examIds.length === 0) {
    message.warning('至少需要 1 个考试ID')
    return
  }
  generating.value = true
  try {
    record.value = await generateAchievement({
      courseId,
      semesterCode: form.semesterCode.trim() || undefined,
      examIds,
    })
    message.success('已生成达成度分析')
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

function achievementStyle(rate?: number): Record<string, string> {
  if (rate == null) return { color: 'inherit' }
  if (rate >= 0.8) return { color: '#52c41a' }
  if (rate >= 0.6) return { color: '#1677ff' }
  if (rate >= 0.4) return { color: '#faad14' }
  return { color: '#f5222d' }
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
.metric-row {
  background: var(--gi-color-bg-2, #f5f5f5);
  padding: 12px 8px;
  border-radius: 4px;
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
