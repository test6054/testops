<template>
  <a-card title="题目质量分析" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-input-search
          v-model:value="qFilter"
          placeholder="输入题目模板ID查询"
          style="width: 220px"
          allow-clear
          @search="reload"
        />
        <a-button type="primary" :loading="generatingAll" @click="handleGenerateAll">
          全量生成
        </a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="small"
      :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }"
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'difficultyIndex'">
          {{ fmtNum(rows[index].difficultyIndex) }}
        </template>
        <template v-else-if="column.key === 'discriminationIndex'">
          {{ fmtNum(rows[index].discriminationIndex) }}
        </template>
        <template v-else-if="column.key === 'avgScore'">
          {{ fmtNum(rows[index].avgScore) }} / {{ fmtNum(rows[index].fullScore) }}
        </template>
        <template v-else-if="column.key === 'correctRatio'">
          <a-typography-text :type="getCorrectRatioType(rows[index])">
            {{ correctRatio(rows[index]) }}
          </a-typography-text>
        </template>
        <template v-else-if="column.key === 'snapshotTime'">
          {{ fmtTime(rows[index].snapshotTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button
            type="link"
            size="small"
            :loading="generatingId === rows[index].questionTemplateId"
            :disabled="!rows[index].questionTemplateId"
            @click="handleGenerateOne(rows[index].questionTemplateId)"
          >
            重新生成
          </a-button>
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamQuestionAnalysisRecordVO } from '@/apis/mark/question-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import {
  generateAllQuestionAnalysis,
  generateQuestionAnalysis,
  listQuestionAnalysis,
} from '@/apis/mark/question-analysis'

defineOptions({ name: 'QuestionAnalysisCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{ (e: 'generated'): void }>()

const rows = ref<ExamQuestionAnalysisRecordVO[]>([])
const loading = ref(false)
const generatingAll = ref(false)
const generatingId = ref<string>('')
const qFilter = ref('')

const columns: ColumnType<ExamQuestionAnalysisRecordVO>[] = [
  { title: '题目模板', dataIndex: 'questionTemplateId', key: 'questionTemplateId', width: 140 },
  { title: '总人数', dataIndex: 'totalCount', key: 'totalCount', width: 90 },
  { title: '正确率', key: 'correctRatio', width: 110 },
  { title: '需复核', dataIndex: 'needReviewCount', key: 'needReviewCount', width: 90 },
  { title: '难度系数', key: 'difficultyIndex', width: 110 },
  { title: '区分度', key: 'discriminationIndex', width: 100 },
  { title: '平均分/满分', key: 'avgScore', width: 140 },
  { title: '快照时间', key: 'snapshotTime', width: 160 },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    rows.value = await listQuestionAnalysis({
      examId: props.examId,
      questionTemplateId: qFilter.value.trim() || undefined,
    })
  } catch (e) {
    rows.value = []
    message.error(e instanceof Error ? e.message : '题目质量分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerateAll(): Promise<void> {
  generatingAll.value = true
  try {
    rows.value = await generateAllQuestionAnalysis(props.examId)
    message.success('已生成全部题目质量分析')
    emit('generated')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generatingAll.value = false
  }
}

async function handleGenerateOne(questionTemplateId?: string): Promise<void> {
  if (!questionTemplateId) return
  generatingId.value = questionTemplateId
  try {
    await generateQuestionAnalysis({ examId: props.examId, questionTemplateId })
    message.success('已重新生成')
    await reload()
    emit('generated')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generatingId.value = ''
  }
}

function fmtNum(v?: number): string {
  if (v == null) return '-'
  return Number(v).toFixed(2)
}

function fmtTime(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

function correctRatio(r: ExamQuestionAnalysisRecordVO): string {
  const total = r.totalCount ?? 0
  if (total <= 0) return '-'
  const ratio = ((r.correctCount ?? 0) / total) * 100
  return `${ratio.toFixed(1)}%`
}

function getCorrectRatioType(r: ExamQuestionAnalysisRecordVO): 'danger' | 'warning' | undefined {
  const total = r.totalCount ?? 0
  if (total <= 0) return undefined
  const ratio = (r.correctCount ?? 0) / total
  if (ratio < 0.4) return 'danger'
  if (ratio < 0.6) return 'warning'
  return undefined
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>
