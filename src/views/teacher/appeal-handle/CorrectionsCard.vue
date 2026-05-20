<template>
  <a-card title="成绩更正记录" :bordered="false" size="small">
    <template #extra>
      <a-space>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>新建更正
        </a-button>
        <a-button :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </a-button>
      </a-space>
    </template>

    <UiDataTable
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="small"
      :page-size="20"
      :total="rows.length"
      flat
    >
      <template #bodyCell="{ column, index }">
        <template v-if="column.key === 'correctionType'">
          {{ correctionTypeLabel(rows[index]) }}
        </template>
        <template v-else-if="column.key === 'correctionStatus'">
          <a-tag :color="correctionStatusColor(rows[index])">
            {{ correctionStatusLabel(rows[index]) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'effectiveTime'">
          {{
            fmt(rows[index].effectiveTime)
          }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{
            fmt(rows[index].createTime)
          }}
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="createOpen"
      title="新建成绩更正"
      :confirm-loading="submitting"
      :mask-closable="false"
      width="560px"
      @ok="submit"
    >
      <a-form layout="vertical" :model="form">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学生用户ID" required>
              <a-input v-model:value="form.studentUserId" placeholder="必填" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="试卷实例ID" required>
              <a-input v-model:value="form.paperInstanceId" placeholder="必填" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-alert
          type="info"
          show-icon
          message="填写题目模板ID时按单题更正执行，题目统计会在后端同步重算；不填写题目模板ID时仅更正总分。"
          style="margin-bottom: 12px"
        />
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="题目模板ID">
              <a-input v-model:value="form.questionTemplateId" placeholder="单题更正时填写" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="更正后分数" required>
              <a-input-number
                v-model:value="form.afterScore"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="关联复核申请ID">
          <a-input v-model:value="form.reviewRequestId" placeholder="选填" />
        </a-form-item>
        <a-form-item label="更正原因" required>
          <a-textarea v-model:value="form.reason" :rows="3" :max-length="200" show-count />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradeCorrectionRecordVO,
  GradeCorrectionStatusCode,
  GradeCorrectionTypeCode,
} from '@/apis/mark/grade-review'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { reactive, ref, watch } from 'vue'
import {
  createCorrection,
  GRADE_CORRECTION_STATUS_COLOR,
  GRADE_CORRECTION_STATUS_LABEL,
  GRADE_CORRECTION_TYPE_LABEL,
  listCorrections,
} from '@/apis/mark/grade-review'
import { UiDataTable } from '@/components/ui-guide/ui'

defineOptions({ name: 'CorrectionsCard' })

const props = defineProps<{ examId: string, reloadToken: number }>()
const emit = defineEmits<{ (e: 'created'): void }>()

const rows = ref<ExamGradeCorrectionRecordVO[]>([])
const loading = ref(false)

const columns: ColumnType<ExamGradeCorrectionRecordVO>[] = [
  { title: '更正ID', dataIndex: 'id', key: 'id', width: 140 },
  { title: '学生', dataIndex: 'studentUserId', key: 'studentUserId', width: 120 },
  { title: '试卷实例', dataIndex: 'paperInstanceId', key: 'paperInstanceId', width: 140 },
  { title: '题目', dataIndex: 'questionTemplateId', key: 'questionTemplateId', width: 120 },
  { title: '类型', key: 'correctionType', width: 110 },
  { title: '前分', dataIndex: 'beforeScore', key: 'beforeScore', width: 80 },
  { title: '后分', dataIndex: 'afterScore', key: 'afterScore', width: 80 },
  { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '状态', key: 'correctionStatus', width: 100 },
  { title: '生效时间', key: 'effectiveTime', width: 160 },
  { title: '创建时间', key: 'createTime', width: 160 },
]

const createOpen = ref(false)
const submitting = ref(false)
const form = reactive<{
  studentUserId: string
  paperInstanceId: string
  questionTemplateId: string
  afterScore: number
  reason: string
  reviewRequestId: string
}>({
  studentUserId: '',
  paperInstanceId: '',
  questionTemplateId: '',
  afterScore: 0,
  reason: '',
  reviewRequestId: '',
})

function openCreateModal(): void {
  form.studentUserId = ''
  form.paperInstanceId = ''
  form.questionTemplateId = ''
  form.afterScore = 0
  form.reason = ''
  form.reviewRequestId = ''
  createOpen.value = true
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    rows.value = await listCorrections({ examId: props.examId })
  } catch (e) {
    rows.value = []
    message.error(e instanceof Error ? e.message : '更正记录加载失败')
  } finally {
    loading.value = false
  }
}

async function submit(): Promise<void> {
  if (!form.studentUserId.trim()) {
    message.warning('学生用户ID必填')
    return
  }
  if (!form.paperInstanceId.trim()) {
    message.warning('试卷实例ID必填')
    return
  }
  if (!form.reason.trim()) {
    message.warning('更正原因必填')
    return
  }
  submitting.value = true
  try {
    await createCorrection({
      examId: props.examId,
      studentUserId: form.studentUserId.trim(),
      paperInstanceId: form.paperInstanceId.trim(),
      questionTemplateId: form.questionTemplateId.trim() || undefined,
      afterScore: form.afterScore,
      reason: form.reason.trim(),
      reviewRequestId: form.reviewRequestId.trim() || undefined,
    })
    const successMessage = form.questionTemplateId.trim()
      ? '单题更正已执行，题目统计已同步刷新'
      : '总分更正已执行'
    message.success(successMessage)
    createOpen.value = false
    await reload()
    emit('created')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

function correctionTypeLabel(row: ExamGradeCorrectionRecordVO): string {
  const code: GradeCorrectionTypeCode | undefined = row.correctionType
  return code ? (GRADE_CORRECTION_TYPE_LABEL[code] ?? code) : '-'
}

function correctionStatusLabel(row: ExamGradeCorrectionRecordVO): string {
  const code: GradeCorrectionStatusCode = row.correctionStatus || 'PENDING'
  return GRADE_CORRECTION_STATUS_LABEL[code] ?? code
}

function correctionStatusColor(row: ExamGradeCorrectionRecordVO): string {
  const code: GradeCorrectionStatusCode = row.correctionStatus || 'PENDING'
  return GRADE_CORRECTION_STATUS_COLOR[code] ?? 'default'
}

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

watch(
  () => [props.examId, props.reloadToken],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)
</script>
