<template>
  <a-card title="AI 校级质量分析" :bordered="false" size="small">
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="分析维度">
          <a-select v-model:value="form.analysisDimension" style="width: 140px">
            <a-select-option
              v-for="(label, code) in SCHOOL_QUALITY_DIMENSION_LABEL"
              :key="code"
              :value="code"
            >
              {{ label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="维度ID">
          <a-input
            v-model:value="form.dimensionId"
            placeholder="可选"
            allow-clear
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="维度名称">
          <a-input
            v-model:value="form.dimensionName"
            placeholder="可选，例如 软件工程"
            allow-clear
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="学期">
          <a-input
            v-model:value="form.semesterCode"
            placeholder="可选"
            allow-clear
            style="width: 140px"
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
              生成分析
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <a-empty v-if="!record" description="暂无校级质量分析，请填写参数后生成。" />
      <div v-else class="ai-record">
        <a-row :gutter="12" class="metric-row">
          <a-col :span="8">
            <a-statistic
              title="教学质量"
              :value="record.teachingQualityScore ?? 0"
              :precision="2"
              :value-style="scoreStyle(record.teachingQualityScore)"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="命题质量"
              :value="record.questionQualityScore ?? 0"
              :precision="2"
              :value-style="scoreStyle(record.questionQualityScore)"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="阅卷质量"
              :value="record.markingQualityScore ?? 0"
              :precision="2"
              :value-style="scoreStyle(record.markingQualityScore)"
            />
          </a-col>
        </a-row>

        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="AI_ANALYSIS_STATUS_COLOR[record.analysisStatus || 'PENDING']">
              {{ AI_ANALYSIS_STATUS_LABEL[record.analysisStatus || 'PENDING'] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="维度">
            {{
              record.analysisDimension
                ? SCHOOL_QUALITY_DIMENSION_LABEL[record.analysisDimension]
                : '-'
            }}
            <span v-if="record.dimensionName"> / {{ record.dimensionName }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="学期">{{ record.semesterCode ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="考试数">{{ record.examCount ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ record.latencyMs ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">{{ fmt(record.createTime) }}</a-descriptions-item>
          <a-descriptions-item label="trace ID" :span="3">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="错误信息" :span="3">
            <a-typography-text type="danger">{{ record.errorMessage }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.qualitySummary" class="ai-summary">
          <strong>质量摘要：</strong>{{ record.qualitySummary }}
        </a-typography-paragraph>

        <div v-if="parsedItems.length > 0" class="ai-items">
          <strong>分项评估：</strong>
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
import type {
  SchoolQualityAnalysisVO,
  SchoolQualityDimensionCode,
} from '@/apis/mark/school-quality'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'
import {
  generateQualityAnalysis,
  listQualityAnalysis,
  SCHOOL_QUALITY_DIMENSION_LABEL,
} from '@/apis/mark/school-quality'
import { AI_ANALYSIS_STATUS_COLOR, AI_ANALYSIS_STATUS_LABEL } from '@/apis/mark/teaching-analysis'

defineOptions({ name: 'SchoolQualityCard' })

interface SchoolQualityForm {
  analysisDimension: SchoolQualityDimensionCode
  dimensionId: string
  dimensionName: string
  semesterCode: string
  examIdsText: string
}
const form = reactive<SchoolQualityForm>({
  analysisDimension: 'COURSE',
  dimensionId: '',
  dimensionName: '',
  semesterCode: '',
  examIdsText: '',
})

const record = ref<SchoolQualityAnalysisVO | null>(null)
const loading = ref(false)
const generating = ref(false)

const parsedItems = computed(() => {
  if (!record.value?.qualityItems) return []
  try {
    const parsed = JSON.parse(record.value.qualityItems)
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
  loading.value = true
  try {
    const list = await listQualityAnalysis({
      analysisDimension: form.analysisDimension,
      semesterCode: form.semesterCode.trim() || undefined,
    })
    record.value = list[0] ?? null
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const examIds = parseExamIds()
  if (examIds.length === 0) {
    message.warning('至少需要 1 个考试ID')
    return
  }
  generating.value = true
  try {
    record.value = await generateQualityAnalysis({
      analysisDimension: form.analysisDimension,
      dimensionId: form.dimensionId.trim() || undefined,
      dimensionName: form.dimensionName.trim() || undefined,
      semesterCode: form.semesterCode.trim() || undefined,
      examIds,
    })
    message.success('已生成校级质量分析')
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

function scoreStyle(score?: number): Record<string, string> {
  if (score == null) return { color: 'inherit' }
  if (score >= 80) return { color: '#52c41a' }
  if (score >= 60) return { color: '#1677ff' }
  if (score >= 40) return { color: '#faad14' }
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
