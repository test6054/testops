<template>
  <a-card title="AI 经验案例有效性评估" :bordered="false" size="small">
    <div class="ai-form">
      <a-form layout="inline" :model="form" size="small">
        <a-form-item label="经验案例ID">
          <a-input
            v-model:value="form.experienceCaseId"
            placeholder="请输入经验案例ID"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item label="评估考试ID">
          <a-input
            v-model:value="form.evalExamId"
            placeholder="请输入评估考试ID"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button :loading="loading" :disabled="!form.experienceCaseId" @click="reload">
              <template #icon><ReloadOutlined /></template>查看历史
            </a-button>
            <a-button type="primary" :loading="generating" @click="handleGenerate">
              评估有效性
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <a-spin :spinning="loading || generating">
      <a-empty v-if="!record" description="暂无评估记录，请填写参数后评估。" />
      <div v-else class="ai-record">
        <a-row :gutter="12" class="metric-row">
          <a-col :span="8">
            <a-statistic
              title="一致性比率"
              :value="record.consistencyRate ?? 0"
              :precision="2"
              :value-style="rateStyle(record.consistencyRate)"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic title="复用次数" :value="record.reuseCount ?? 0" />
          </a-col>
          <a-col :span="8">
            <div class="drift-block">
              <div class="drift-label">模型漂移</div>
              <a-tag
                v-if="record.driftDetected != null"
                :color="record.driftDetected ? 'red' : 'green'"
              >
                {{ record.driftDetected ? '已检测到漂移' : '未检测到漂移' }}
              </a-tag>
              <span v-else class="text-muted">-</span>
            </div>
          </a-col>
        </a-row>

        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="状态">
            <a-tag :color="AI_ANALYSIS_STATUS_COLOR[record.analysisStatus || 'PENDING']">
              {{ AI_ANALYSIS_STATUS_LABEL[record.analysisStatus || 'PENDING'] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="经验案例ID">{{
            record.experienceCaseId ?? '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="评估考试ID">{{
            record.evalExamId ?? '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="耗时(ms)">{{ record.latencyMs ?? '-' }}</a-descriptions-item>
          <a-descriptions-item label="生成时间" :span="2">{{
            fmt(record.createTime)
          }}</a-descriptions-item>
          <a-descriptions-item label="trace ID">
            <a-typography-text v-if="record.aiTraceId" :content="record.aiTraceId" copyable />
            <span v-else class="text-muted">-</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="record.errorMessage" label="错误信息" :span="3">
            <a-typography-text type="danger">{{ record.errorMessage }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <a-typography-paragraph v-if="record.evalSummary" class="ai-summary">
          <strong>评估摘要：</strong>{{ record.evalSummary }}
        </a-typography-paragraph>

        <a-typography-paragraph v-if="record.driftDescription" class="ai-summary">
          <strong>漂移说明：</strong>{{ record.driftDescription }}
        </a-typography-paragraph>

        <a-typography-paragraph v-if="record.recommendation" class="ai-summary">
          <strong>建议：</strong>{{ record.recommendation }}
        </a-typography-paragraph>

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
import type { ExperienceEffectivenessEvalVO } from '@/apis/mark/school-quality'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { reactive, ref } from 'vue'
import { evaluateExperienceEffectiveness, listExperienceEvals } from '@/apis/mark/school-quality'
import { AI_ANALYSIS_STATUS_COLOR, AI_ANALYSIS_STATUS_LABEL } from '@/apis/mark/teaching-analysis'

defineOptions({ name: 'ExperienceEffectivenessCard' })

const form = reactive({
  experienceCaseId: '',
  evalExamId: '',
})

const record = ref<ExperienceEffectivenessEvalVO | null>(null)
const loading = ref(false)
const generating = ref(false)

async function reload(): Promise<void> {
  const experienceCaseId = form.experienceCaseId.trim()
  if (!experienceCaseId) {
    message.warning('请输入经验案例ID')
    return
  }
  loading.value = true
  try {
    const list = await listExperienceEvals(experienceCaseId)
    record.value = list[0] ?? null
    if (list.length === 0) message.info('暂无历史记录')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const experienceCaseId = form.experienceCaseId.trim()
  const evalExamId = form.evalExamId.trim()
  if (!experienceCaseId || !evalExamId) {
    message.warning('经验案例ID 和评估考试ID 都必填')
    return
  }
  generating.value = true
  try {
    record.value = await evaluateExperienceEffectiveness({ experienceCaseId, evalExamId })
    message.success('已完成有效性评估')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '评估失败')
  } finally {
    generating.value = false
  }
}

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

function rateStyle(rate?: number): Record<string, string> {
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
.metric-row {
  background: var(--gi-color-bg-2, #f5f5f5);
  padding: 12px 8px;
  border-radius: 4px;
}
.drift-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.drift-label {
  font-size: 12px;
  color: var(--gi-color-text-3, rgba(0, 0, 0, 0.45));
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
