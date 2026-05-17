<script setup lang="ts">
/**
 * 成绩明细管理
 *
 * 上下文：先选成绩批次 (ScoreBatchVO)，再列出该批次下所有明细。
 * 后端：/api/quality/score-records  + /api/quality/score-batches
 *
 * 用途：人工核对 Excel 异步导入或外部 AI 解析草稿的明细数据，
 *      标记 validFlag、补救/排除无效成绩，确认后供达成度计算使用。
 */
import type {
  AssessmentItemVO,
  ScoreBatchVO,
  ScoreRecordSavePayload,
  ScoreRecordVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  assessmentItemApi,
  SCORE_BATCH_STATUS_COLOR,
  SCORE_BATCH_STATUS_LABEL,
  scoreBatchApi,
  scoreRecordApi,
} from '@/apis/quality'
import CourseSelector from '@/components/quality/selectors/CourseSelector.vue'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

/* ========== 成绩批次选择 ========== */

const batches = ref<ScoreBatchVO[]>([])
const batchesLoading = ref(false)
const selectedBatch = ref<ScoreBatchVO | null>(null)

async function loadBatches() {
  if (!qualityStore.currentQualityCourseId) {
    batches.value = []
    return
  }
  batchesLoading.value = true
  try {
    const page = await scoreBatchApi.page({
      pageNum: 1,
      pageSize: 100,
      qualityCourseId: qualityStore.currentQualityCourseId,
    })
    batches.value = page.list || []
  } finally {
    batchesLoading.value = false
  }
}

/* ========== 明细列表 ========== */

const records = ref<ScoreRecordVO[]>([])
const recordsLoading = ref(false)
const validFilter = ref<boolean | undefined>(undefined)
const assessmentItems = ref<AssessmentItemVO[]>([])

const assessmentItemMap = computed(() => new Map(assessmentItems.value.map((a) => [a.id, a])))
const validFilterSelect = computed({
  get(): string | undefined {
    return validFilter.value === undefined ? undefined : String(validFilter.value)
  },
  set(v: string | undefined): void {
    validFilter.value = v === undefined ? undefined : v === 'true'
  },
})

const filteredRecords = computed(() => {
  if (validFilter.value === undefined) return records.value
  return records.value.filter((r) => Boolean(r.validFlag) === validFilter.value)
})

async function loadRecords() {
  if (!selectedBatch.value) {
    records.value = []
    return
  }
  recordsLoading.value = true
  try {
    records.value = (await scoreRecordApi.listByBatch(selectedBatch.value.id)) || []
  } finally {
    recordsLoading.value = false
  }
}

async function loadAssessmentItems() {
  if (!qualityStore.currentQualityCourseId) {
    assessmentItems.value = []
    return
  }
  assessmentItems.value
    = (await assessmentItemApi.listByCourse(qualityStore.currentQualityCourseId)) || []
}

/* ========== 明细编辑 ========== */

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = ref<ScoreRecordSavePayload>({
  batchId: '',
  assessmentItemId: '',
  qualityCourseId: '',
  studentUserId: '',
  studentNumber: '',
  studentName: '',
  classId: '',
  rawScore: 0,
  fullScore: 100,
  rubricBreakdown: '',
  validFlag: true,
  invalidReason: '',
  errorCodes: '',
})

function openCreate() {
  if (!selectedBatch.value) return
  editorMode.value = 'create'
  editor.value = {
    batchId: selectedBatch.value.id,
    assessmentItemId: '',
    qualityCourseId: qualityStore.currentQualityCourseId,
    studentUserId: '',
    studentNumber: '',
    studentName: '',
    classId: '',
    rawScore: 0,
    fullScore: 100,
    rubricBreakdown: '',
    validFlag: true,
    invalidReason: '',
    errorCodes: '',
  }
  editorVisible.value = true
}

function openEdit(record: ScoreRecordVO) {
  editorMode.value = 'edit'
  editor.value = { ...record }
  editorVisible.value = true
}

async function submitEditor() {
  const v = editor.value
  if (!v.assessmentItemId || v.rawScore == null || v.fullScore == null) {
    message.error('请填写考核环节、原始分、满分')
    return
  }
  if (editorMode.value === 'create') await scoreRecordApi.create(v)
  else await scoreRecordApi.update(v)
  message.success('已保存')
  editorVisible.value = false
  await loadRecords()
}

async function handleDelete(record: ScoreRecordVO) {
  Modal.confirm({
    title: `删除该明细？`,
    okType: 'danger',
    onOk: async () => {
      await scoreRecordApi.delete(record.id)
      message.success('已删除')
      await loadRecords()
    },
  })
}

/* ========== 批量录入 ========== */

const batchCreateVisible = ref(false)
const batchCreateSubmitting = ref(false)
const batchCreateText = ref('')
const BATCH_CREATE_PLACEHOLDER = `[
  {
    "assessmentItemId": "1",
    "studentNumber": "2021001",
    "studentName": "张三",
    "rawScore": 85,
    "fullScore": 100,
    "validFlag": true
  },
  {
    "assessmentItemId": "1",
    "studentNumber": "2021002",
    "studentName": "李四",
    "rawScore": 92,
    "fullScore": 100
  }
]`

function openBatchCreate() {
  if (!selectedBatch.value) return
  batchCreateText.value = ''
  batchCreateVisible.value = true
}

async function submitBatchCreate() {
  if (!selectedBatch.value) return
  const text = batchCreateText.value.trim()
  if (!text) {
    message.error('请粘贴明细 JSON 数组')
    return
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    message.error(`JSON 解析失败：${(err as Error).message}`)
    return
  }
  if (!Array.isArray(raw)) {
    message.error('JSON 解析失败：根节点必须是数组')
    return
  }
  const parsed: ScoreRecordSavePayload[] = []
  for (let idx = 0; idx < raw.length; idx++) {
    const item = raw[idx] as Partial<ScoreRecordSavePayload> | null
    if (!item || !item.assessmentItemId) {
      message.error(`JSON 解析失败：第 ${idx + 1} 行缺少 assessmentItemId`)
      return
    }
    if (item.rawScore == null || item.fullScore == null) {
      message.error(`JSON 解析失败：第 ${idx + 1} 行缺少 rawScore / fullScore`)
      return
    }
    parsed.push({
      batchId: selectedBatch.value.id,
      qualityCourseId: qualityStore.currentQualityCourseId,
      ...item,
    } as ScoreRecordSavePayload)
  }
  batchCreateSubmitting.value = true
  try {
    await scoreRecordApi.batchCreate(selectedBatch.value.id, parsed)
    message.success(`已批量创建 ${parsed.length} 条明细`)
    batchCreateVisible.value = false
    await loadRecords()
  } finally {
    batchCreateSubmitting.value = false
  }
}

/* ========== 按考核环节查已确认的有效明细 ========== */

const validByItemVisible = ref(false)
const validByItemLoading = ref(false)
const validByItemId = ref<string>('')
const validByItemRecords = ref<ScoreRecordVO[]>([])

function openValidByItem() {
  if (!qualityStore.currentQualityCourseId) return
  validByItemId.value = ''
  validByItemRecords.value = []
  validByItemVisible.value = true
}

async function queryValidByItem() {
  if (!validByItemId.value) {
    message.warning('请选择考核环节')
    return
  }
  validByItemLoading.value = true
  try {
    validByItemRecords.value
      = (await scoreRecordApi.listValidByItem(
        validByItemId.value,
        qualityStore.currentQualityCourseId,
      )) || []
  } finally {
    validByItemLoading.value = false
  }
}

/* ========== 上下文联动 ========== */

watch(
  () => qualityStore.currentQualityCourseId,
  async () => {
    selectedBatch.value = null
    records.value = []
    await Promise.all([loadBatches(), loadAssessmentItems()])
  },
)

watch(
  () => qualityStore.currentTrainingPlanId,
  () => {
    selectedBatch.value = null
    batches.value = []
    records.value = []
    assessmentItems.value = []
  },
)

watch(selectedBatch, () => loadRecords())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  if (qualityStore.currentQualityCourseId) {
    await Promise.all([loadBatches(), loadAssessmentItems()])
  }
})

function handlePlanChange(planId: string | null) {
  qualityStore.setCurrent({ trainingPlanId: planId || '', qualityCourseId: '' })
}

function handleCourseChange(courseId: string | null) {
  qualityStore.setCurrent({ qualityCourseId: courseId || '' })
}
</script>

<template>
  <div class="page">
    <a-card :bordered="false" style="margin-bottom: 12px">
      <a-space wrap>
        <span class="filter-label">培养方案：</span>
        <TrainingPlanSelector
          :value="qualityStore.currentTrainingPlanId || null"
          :width="280"
          @change="handlePlanChange"
        />
        <span class="filter-label">质量评价课程：</span>
        <CourseSelector
          :value="qualityStore.currentQualityCourseId || null"
          :training-plan-id="qualityStore.currentTrainingPlanId || null"
          :width="340"
          @change="handleCourseChange"
        />
      </a-space>
    </a-card>

    <a-alert
      v-if="!qualityStore.currentQualityCourseId"
      type="warning"
      show-icon
      message="尚未选择质量评价课程"
      style="margin-bottom: 12px"
    />

    <a-row v-if="qualityStore.currentQualityCourseId" :gutter="12">
      <a-col :span="9">
        <a-card title="成绩批次" :bordered="false">
          <a-table
            :data-source="batches"
            :loading="batchesLoading"
            row-key="id"
            size="middle"
            :pagination="false"
            :row-class-name="
              (r: ScoreBatchVO) => (selectedBatch?.id === r.id ? 'row-selected' : '')
            "
            :custom-row="
              (record: ScoreBatchVO) => ({
                onClick: () => (selectedBatch = record),
                style: 'cursor: pointer',
              })
            "
          >
            <a-table-column title="编码" data-index="batchCode" width="120" />
            <a-table-column title="名称" data-index="batchName" />
            <a-table-column title="状态" data-index="status" width="100">
              <template #default="{ text }">
                <a-tag
                  :color="SCORE_BATCH_STATUS_COLOR[text as keyof typeof SCORE_BATCH_STATUS_COLOR]"
                >
                  {{
                    SCORE_BATCH_STATUS_LABEL[text as keyof typeof SCORE_BATCH_STATUS_LABEL] || text
                  }}
                </a-tag>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>

      <a-col :span="15">
        <a-empty v-if="!selectedBatch" description="请在左侧选择成绩批次查看明细" />

        <a-card v-else :bordered="false">
          <template #title>
            <span>「{{ selectedBatch.batchName }}」明细</span>
          </template>
          <template #extra>
            <a-space>
              <a-select
                v-model:value="validFilterSelect"
                placeholder="有效性筛选"
                allow-clear
                style="width: 140px"
              >
                <a-select-option value="true">仅有效</a-select-option>
                <a-select-option value="false">仅无效</a-select-option>
              </a-select>
              <a-button type="primary" size="small" @click="openCreate"> 新增明细 </a-button>
              <a-button size="small" @click="openBatchCreate"> 批量录入 </a-button>
              <a-button size="small" @click="openValidByItem"> 按考核环节查有效 </a-button>
            </a-space>
          </template>

          <a-table
            :data-source="filteredRecords"
            :loading="recordsLoading"
            row-key="id"
            size="middle"
            :pagination="{ pageSize: 20, showSizeChanger: true }"
          >
            <a-table-column title="学号" data-index="studentNumber" width="120" />
            <a-table-column title="姓名" data-index="studentName" width="100" />
            <a-table-column title="考核环节" data-index="assessmentItemId">
              <template #default="{ text }">
                <span class="font-mono text-xs text-gray-500 mr-1">
                  {{ assessmentItemMap.get(text)?.itemCode }}
                </span>
                {{ assessmentItemMap.get(text)?.itemName || text }}
              </template>
            </a-table-column>
            <a-table-column title="得分 / 满分" width="120">
              <template #default="{ record }">
                {{ Number(record.rawScore).toFixed(1) }} / {{ Number(record.fullScore).toFixed(0) }}
              </template>
            </a-table-column>
            <a-table-column title="状态" width="120">
              <template #default="{ record }">
                <a-tag :color="record.validFlag ? 'green' : 'red'">
                  {{ record.validFlag ? '有效' : '无效' }}
                </a-tag>
                <a-tooltip v-if="record.errorCodes" :title="record.errorCodes">
                  <a-tag color="orange">异常</a-tag>
                </a-tooltip>
              </template>
            </a-table-column>
            <a-table-column title="操作" width="120" fixed="right">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新增成绩明细' : '编辑成绩明细'"
      width="720px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-form-item label="考核环节" required>
          <a-select v-model:value="editor.assessmentItemId" placeholder="选择考核环节">
            <a-select-option v-for="a in assessmentItems" :key="a.id" :value="a.id">
              <span class="font-mono text-xs text-gray-500 mr-1">{{ a.itemCode }}</span>
              {{ a.itemName }}（满分 {{ a.fullScore }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="学号">
              <a-input v-model:value="editor.studentNumber" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="姓名">
              <a-input v-model:value="editor.studentName" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学生 ID">
              <a-input v-model:value="editor.studentUserId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="原始分" required>
              <a-input-number v-model:value="editor.rawScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="editor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="班级 ID">
              <a-input v-model:value="editor.classId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Rubric 拆分（JSON）">
          <a-textarea
            v-model:value="editor.rubricBreakdown"
            :rows="3"
            placeholder="{&quot;rubricItemId&quot;: score, ...}"
            :style="{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="有效">
              <a-switch v-model:checked="editor.validFlag" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="无效原因">
              <a-input v-model:value="editor.invalidReason" :disabled="editor.validFlag" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="异常码（逗号分隔）">
          <a-input v-model:value="editor.errorCodes" placeholder="如 SCORE_OVERFLOW, DUP_STUDENT" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="batchCreateVisible"
      :title="`批量录入成绩明细（${selectedBatch?.batchName || ''}）`"
      :confirm-loading="batchCreateSubmitting"
      width="780px"
      ok-text="提交批量录入"
      @ok="submitBatchCreate"
    >
      <a-alert
        type="info"
        show-icon
        message="粘贴 JSON 数组，每行一个明细对象"
        description="必填：assessmentItemId、rawScore、fullScore；可选：studentNumber、studentName、classId、studentUserId、rubricBreakdown、validFlag、invalidReason、errorCodes。batchId 与 qualityCourseId 由页面自动填入。"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="batchCreateText"
        :rows="14"
        :placeholder="BATCH_CREATE_PLACEHOLDER"
        :style="{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }"
      />
    </a-modal>

    <a-modal
      v-model:open="validByItemVisible"
      title="按考核环节查有效明细"
      :footer="null"
      width="780px"
    >
      <a-space style="margin-bottom: 12px" wrap>
        <span>考核环节：</span>
        <a-select
          v-model:value="validByItemId"
          placeholder="选择考核环节"
          style="min-width: 320px"
          show-search
          option-filter-prop="label"
        >
          <a-select-option
            v-for="a in assessmentItems"
            :key="a.id"
            :value="a.id"
            :label="`${a.itemCode} ${a.itemName}`"
          >
            <span class="font-mono text-xs text-gray-500 mr-1">{{ a.itemCode }}</span>
            {{ a.itemName }}
          </a-select-option>
        </a-select>
        <a-button type="primary" :loading="validByItemLoading" @click="queryValidByItem">
          查询
        </a-button>
      </a-space>
      <a-table
        :data-source="validByItemRecords"
        :loading="validByItemLoading"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
      >
        <a-table-column title="批次" data-index="batchId" width="120" />
        <a-table-column title="学号" data-index="studentNumber" width="120" />
        <a-table-column title="姓名" data-index="studentName" width="100" />
        <a-table-column title="得分 / 满分" width="120">
          <template #default="{ record }">
            {{ Number(record.rawScore).toFixed(1) }} / {{ Number(record.fullScore).toFixed(0) }}
          </template>
        </a-table-column>
      </a-table>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page {
  padding: 16px;
}
.filter-label {
  color: var(--ant-color-text-secondary);
}
:deep(.row-selected) td {
  background-color: var(--ant-color-primary-bg) !important;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.text-xs {
  font-size: 12px;
}
.text-gray-500 {
  color: rgba(0, 0, 0, 0.45);
}
.mr-1 {
  margin-right: 4px;
}
</style>
