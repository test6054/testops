<script setup lang="ts">
/**
 * 过程性评价节点配置 + 节点记录管理
 *
 * 上下文：当前培养方案 → 当前质量评价课程 → 列出该课程的过程性评价节点
 * 后端：
 * - /api/quality/process-nodes     节点 CRUD + 状态流转
 * - /api/quality/process-records   记录 CRUD + 批量 + 确认
 *
 * 规则：
 * - 节点必须 CONFIRMED 才允许录入记录
 * - 记录 CONFIRMED 后禁止修改/删除
 * - 已确认记录才进入达成度计算
 */
import type {
  AssessmentItemVO,
  ConfirmationStatus,
  CourseGoalVO,
  ProcessEvaluationNodeSavePayload,
  ProcessEvaluationNodeVO,
  ProcessEvaluationRecordSavePayload,
  ProcessEvaluationRecordVO,
  ProcessNodeType,
  RequirementIndicatorVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  assessmentItemApi,
  CONFIRMATION_STATUS_COLOR,
  CONFIRMATION_STATUS_LABEL,
  courseGoalApi,
  DATA_SOURCE_MODE_LABEL,
  graduationRequirementApi,
  PROCESS_NODE_TYPE_LABEL,
  processNodeApi,
  processRecordApi,
  requirementIndicatorApi,
} from '@/apis/quality'
import CourseSelector from '@/components/quality/selectors/CourseSelector.vue'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

/* ========== 节点列表 ========== */

const nodes = ref<ProcessEvaluationNodeVO[]>([])
const nodesLoading = ref(false)
const selectedNode = ref<ProcessEvaluationNodeVO | null>(null)

const courseGoals = ref<CourseGoalVO[]>([])
const assessmentItems = ref<AssessmentItemVO[]>([])
const indicators = ref<RequirementIndicatorVO[]>([])

const courseGoalMap = computed(() => new Map(courseGoals.value.map(g => [g.id, g])))
const assessmentItemMap = computed(() => new Map(assessmentItems.value.map(a => [a.id, a])))
const indicatorMap = computed(() => new Map(indicators.value.map(i => [i.id, i])))

const nodeTypeOptions = Object.entries(PROCESS_NODE_TYPE_LABEL).map(([value, label]) => ({ value, label }))

async function loadNodes() {
  if (!qualityStore.currentQualityCourseId) {
    nodes.value = []
    return
  }
  nodesLoading.value = true
  try {
    nodes.value = await processNodeApi.listByCourse(qualityStore.currentQualityCourseId) || []
  } finally {
    nodesLoading.value = false
  }
}

async function loadAuxDict() {
  if (!qualityStore.currentQualityCourseId) {
    courseGoals.value = []
    assessmentItems.value = []
    indicators.value = []
    return
  }
  const [g, a] = await Promise.all([
    courseGoalApi.listByCourse(qualityStore.currentQualityCourseId),
    assessmentItemApi.listByCourse(qualityStore.currentQualityCourseId),
  ])
  courseGoals.value = g || []
  assessmentItems.value = a || []
  // 加载该培养方案下所有毕业要求的观测点（用于节点挂靠观测点选择）
  if (qualityStore.currentTrainingPlanId) {
    const reqs = await graduationRequirementApi.listByPlan(qualityStore.currentTrainingPlanId) || []
    const all: RequirementIndicatorVO[] = []
    for (const r of reqs) {
      const items = await requirementIndicatorApi.listByRequirement(r.id) || []
      all.push(...items)
    }
    indicators.value = all
  }
}

/* ========== 节点编辑 ========== */

const nodeEditorVisible = ref(false)
const nodeEditorMode = ref<'create' | 'edit'>('create')
const nodeEditor = ref<ProcessEvaluationNodeSavePayload>({
  qualityCourseId: '',
  nodeCode: '',
  nodeName: '',
  nodeType: 'CLASS_INTERACTION',
  evidenceType: '',
  semester: '',
  weight: 0.2,
  fullScore: 100,
  coverageRequired: 0.8,
  description: '',
})

function openNodeCreate() {
  if (!qualityStore.currentQualityCourseId) {
    message.warning('请先选择质量评价课程')
    return
  }
  nodeEditorMode.value = 'create'
  nodeEditor.value = {
    qualityCourseId: qualityStore.currentQualityCourseId,
    nodeCode: '',
    nodeName: '',
    nodeType: 'CLASS_INTERACTION',
    evidenceType: '',
    semester: qualityStore.currentSemester || '',
    weight: 0.2,
    fullScore: 100,
    coverageRequired: 0.8,
    description: '',
  }
  nodeEditorVisible.value = true
}

function openNodeEdit(record: ProcessEvaluationNodeVO) {
  nodeEditorMode.value = 'edit'
  nodeEditor.value = { ...record }
  nodeEditorVisible.value = true
}

async function submitNode() {
  const v = nodeEditor.value
  if (!v.nodeCode.trim() || !v.nodeName.trim()) {
    message.error('请填写节点编码和名称')
    return
  }
  if (nodeEditorMode.value === 'create') await processNodeApi.create(v)
  else await processNodeApi.update(v)
  message.success('已保存')
  nodeEditorVisible.value = false
  await loadNodes()
}

async function handleNodeDelete(record: ProcessEvaluationNodeVO) {
  Modal.confirm({
    title: `删除节点 ${record.nodeCode}？`,
    okType: 'danger',
    onOk: async () => {
      await processNodeApi.delete(record.id)
      message.success('已删除')
      if (selectedNode.value?.id === record.id) selectedNode.value = null
      await loadNodes()
    },
  })
}

async function changeNodeStatus(record: ProcessEvaluationNodeVO, target: ConfirmationStatus) {
  await processNodeApi.updateConfirmationStatus(record.id, target)
  message.success(`已切换到 ${CONFIRMATION_STATUS_LABEL[target]}`)
  await loadNodes()
}

/* ========== 节点记录 ========== */

const records = ref<ProcessEvaluationRecordVO[]>([])
const recordsLoading = ref(false)
const recordStatusFilter = ref<ConfirmationStatus | undefined>(undefined)

async function loadRecords() {
  if (!selectedNode.value) {
    records.value = []
    return
  }
  recordsLoading.value = true
  try {
    records.value = await processRecordApi.listByNode(selectedNode.value.id, recordStatusFilter.value) || []
  } finally {
    recordsLoading.value = false
  }
}

const recordEditorVisible = ref(false)
const recordEditorMode = ref<'create' | 'edit'>('create')
const recordEditor = ref<ProcessEvaluationRecordSavePayload>({
  nodeId: '',
  qualityCourseId: '',
  studentUserId: '',
  studentNumber: '',
  rawScore: 0,
  convertedScore: undefined,
  evidenceFileId: '',
  sourceMode: 'MANUAL_CONFIRMATION',
  notes: '',
})

function openRecordCreate() {
  if (!selectedNode.value) return
  if (selectedNode.value.confirmationStatus !== 'CONFIRMED') {
    message.warning('节点未确认，无法录入记录')
    return
  }
  recordEditorMode.value = 'create'
  recordEditor.value = {
    nodeId: selectedNode.value.id,
    qualityCourseId: qualityStore.currentQualityCourseId,
    studentUserId: '',
    studentNumber: '',
    rawScore: 0,
    convertedScore: undefined,
    evidenceFileId: '',
    sourceMode: 'MANUAL_CONFIRMATION',
    notes: '',
  }
  recordEditorVisible.value = true
}

function openRecordEdit(record: ProcessEvaluationRecordVO) {
  if (record.confirmationStatus === 'CONFIRMED') {
    message.warning('已确认的记录不可修改')
    return
  }
  recordEditorMode.value = 'edit'
  recordEditor.value = { ...record }
  recordEditorVisible.value = true
}

async function submitRecord() {
  const v = recordEditor.value
  if (!v.nodeId || v.rawScore == null) {
    message.error('请填写完整记录')
    return
  }
  if (recordEditorMode.value === 'create') await processRecordApi.create(v)
  else await processRecordApi.update(v)
  message.success('已保存')
  recordEditorVisible.value = false
  await loadRecords()
}

async function confirmRecord(record: ProcessEvaluationRecordVO) {
  await processRecordApi.confirm(record.id)
  message.success('记录已确认')
  await loadRecords()
}

async function deleteRecord(record: ProcessEvaluationRecordVO) {
  if (record.confirmationStatus === 'CONFIRMED') {
    message.warning('已确认的记录不可删除')
    return
  }
  Modal.confirm({
    title: '删除该记录？',
    okType: 'danger',
    onOk: async () => {
      await processRecordApi.delete(record.id)
      message.success('已删除')
      await loadRecords()
    },
  })
}

/* ========== 批量录入 ========== */

const batchRecordVisible = ref(false)
const batchRecordSubmitting = ref(false)
const batchRecordText = ref('')
const BATCH_RECORD_PLACEHOLDER = `[
  {
    "studentNumber": "2021001",
    "rawScore": 85,
    "convertedScore": 0.85,
    "sourceMode": "MANUAL_CONFIRMATION",
    "notes": "课堂汇报得分"
  },
  {
    "studentNumber": "2021002",
    "rawScore": 92,
    "convertedScore": 0.92
  }
]`

function openBatchRecord() {
  if (!selectedNode.value) return
  if (selectedNode.value.confirmationStatus !== 'CONFIRMED') {
    message.warning('节点未确认，无法批量录入')
    return
  }
  batchRecordText.value = ''
  batchRecordVisible.value = true
}

async function submitBatchRecord() {
  if (!selectedNode.value) return
  const text = batchRecordText.value.trim()
  if (!text) {
    message.error('请粘贴记录 JSON 数组')
    return
  }
  let parsed: ProcessEvaluationRecordSavePayload[]
  try {
    const raw = JSON.parse(text)
    if (!Array.isArray(raw))
      throw new Error('根节点必须是数组')
    parsed = raw.map((item, idx) => {
      if (item.rawScore == null)
        throw new Error(`第 ${idx + 1} 行缺少 rawScore`)
      return {
        nodeId: selectedNode.value!.id,
        qualityCourseId: qualityStore.currentQualityCourseId,
        ...item,
      } as ProcessEvaluationRecordSavePayload
    })
  }
  catch (err) {
    message.error(`JSON 解析失败：${(err as Error).message}`)
    return
  }
  batchRecordSubmitting.value = true
  try {
    await processRecordApi.batchCreate(selectedNode.value.id, parsed)
    message.success(`已批量录入 ${parsed.length} 条记录`)
    batchRecordVisible.value = false
    await loadRecords()
  }
  finally {
    batchRecordSubmitting.value = false
  }
}

/* ========== 按课程目标查已确认记录 ========== */

const confirmedByGoalVisible = ref(false)
const confirmedByGoalLoading = ref(false)
const confirmedByGoalId = ref<string>('')
const confirmedByGoalRecords = ref<ProcessEvaluationRecordVO[]>([])

function openConfirmedByGoal() {
  if (!qualityStore.currentQualityCourseId) return
  confirmedByGoalId.value = ''
  confirmedByGoalRecords.value = []
  confirmedByGoalVisible.value = true
}

async function queryConfirmedByGoal() {
  if (!confirmedByGoalId.value) {
    message.warning('请选择课程目标')
    return
  }
  confirmedByGoalLoading.value = true
  try {
    confirmedByGoalRecords.value = await processRecordApi.listConfirmedByCourseGoal(
      qualityStore.currentQualityCourseId,
      confirmedByGoalId.value,
    ) || []
  }
  finally {
    confirmedByGoalLoading.value = false
  }
}

/* ========== 上下文联动 ========== */

watch(() => qualityStore.currentQualityCourseId, async () => {
  selectedNode.value = null
  records.value = []
  await Promise.all([loadNodes(), loadAuxDict()])
})

watch(() => qualityStore.currentTrainingPlanId, () => {
  selectedNode.value = null
  nodes.value = []
  courseGoals.value = []
  assessmentItems.value = []
  indicators.value = []
})

watch(selectedNode, () => loadRecords())
watch(recordStatusFilter, () => loadRecords())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  if (qualityStore.currentQualityCourseId) {
    await Promise.all([loadNodes(), loadAuxDict()])
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
      <a-col :span="10">
        <a-card title="过程性评价节点" :bordered="false">
          <template #extra>
            <a-button type="primary" size="small" @click="openNodeCreate">
              新建节点
            </a-button>
          </template>

          <a-table
            :data-source="nodes"
            :loading="nodesLoading"
            row-key="id"
            size="middle"
            :pagination="false"
            :row-class-name="(r: ProcessEvaluationNodeVO) => (selectedNode?.id === r.id ? 'row-selected' : '')"
            :custom-row="(record: ProcessEvaluationNodeVO) => ({
              onClick: () => (selectedNode = record),
              style: 'cursor: pointer',
            })"
          >
            <a-table-column title="编码" data-index="nodeCode" width="100" />
            <a-table-column title="名称">
              <template #default="{ record }">
                {{ record.nodeName }}
                <div class="text-xs text-gray-500">
                  {{ PROCESS_NODE_TYPE_LABEL[record.nodeType as ProcessNodeType] }}
                </div>
              </template>
            </a-table-column>
            <a-table-column title="权重" data-index="weight" width="80">
              <template #default="{ text }">
                {{ text == null ? '-' : Number(text).toFixed(2) }}
              </template>
            </a-table-column>
            <a-table-column title="状态" data-index="confirmationStatus" width="100">
              <template #default="{ text }">
                <a-tag :color="CONFIRMATION_STATUS_COLOR[text as ConfirmationStatus]">
                  {{ CONFIRMATION_STATUS_LABEL[text as ConfirmationStatus] || text }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="操作" width="200" fixed="right">
              <template #default="{ record }">
                <a-space wrap>
                  <a-button type="link" size="small" @click.stop="openNodeEdit(record)">编辑</a-button>
                  <a-dropdown>
                    <a-button type="link" size="small" @click.stop>
                      状态
                    </a-button>
                    <template #overlay>
                      <a-menu @click="(e: any) => changeNodeStatus(record, e.key as ConfirmationStatus)">
                        <a-menu-item key="DRAFT">起草</a-menu-item>
                        <a-menu-item key="SUBMITTED">提交</a-menu-item>
                        <a-menu-item key="CONFIRMED">确认</a-menu-item>
                        <a-menu-item key="RETURNED">退回</a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <a-button type="link" size="small" danger @click.stop="handleNodeDelete(record)">删除</a-button>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>

      <a-col :span="14">
        <a-empty v-if="!selectedNode" description="请在左侧选择节点查看记录" />

        <a-card v-else :bordered="false">
          <template #title>
            <span>「{{ selectedNode.nodeName }}」记录</span>
          </template>
          <template #extra>
            <a-space>
              <a-select v-model:value="recordStatusFilter" placeholder="状态筛选" allow-clear style="width: 140px">
                <a-select-option value="DRAFT">起草</a-select-option>
                <a-select-option value="SUBMITTED">已提交</a-select-option>
                <a-select-option value="CONFIRMED">已确认</a-select-option>
                <a-select-option value="RETURNED">已退回</a-select-option>
              </a-select>
              <a-button
                type="primary"
                size="small"
                :disabled="selectedNode.confirmationStatus !== 'CONFIRMED'"
                @click="openRecordCreate"
              >
                录入记录
              </a-button>
              <a-button
                size="small"
                :disabled="selectedNode.confirmationStatus !== 'CONFIRMED'"
                @click="openBatchRecord"
              >
                批量录入
              </a-button>
              <a-button size="small" @click="openConfirmedByGoal">
                按课程目标查有效
              </a-button>
            </a-space>
          </template>

          <a-alert
            v-if="selectedNode.confirmationStatus !== 'CONFIRMED'"
            type="info"
            show-icon
            message="节点尚未确认，无法录入记录。请先在左侧切换节点状态到「已确认」。"
            style="margin-bottom: 12px"
          />

          <a-table
            :data-source="records"
            :loading="recordsLoading"
            row-key="id"
            size="middle"
            :pagination="false"
          >
            <a-table-column title="学号" data-index="studentNumber" width="120" />
            <a-table-column title="学生" data-index="studentUserId" width="120" />
            <a-table-column title="原始分" data-index="rawScore" width="80">
              <template #default="{ text }">{{ Number(text).toFixed(2) }}</template>
            </a-table-column>
            <a-table-column title="换算分" data-index="convertedScore" width="80">
              <template #default="{ text }">
                {{ text == null ? '-' : Number(text).toFixed(2) }}
              </template>
            </a-table-column>
            <a-table-column title="来源" data-index="sourceMode" width="140">
              <template #default="{ text }">
                {{ DATA_SOURCE_MODE_LABEL[text as keyof typeof DATA_SOURCE_MODE_LABEL] || text || '-' }}
              </template>
            </a-table-column>
            <a-table-column title="状态" data-index="confirmationStatus" width="100">
              <template #default="{ text }">
                <a-tag :color="CONFIRMATION_STATUS_COLOR[text as ConfirmationStatus]">
                  {{ CONFIRMATION_STATUS_LABEL[text as ConfirmationStatus] || text }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="操作" width="200" fixed="right">
              <template #default="{ record }">
                <a-space wrap>
                  <a-button
                    v-if="record.confirmationStatus !== 'CONFIRMED'"
                    type="link"
                    size="small"
                    @click="openRecordEdit(record)"
                  >
                    编辑
                  </a-button>
                  <a-button
                    v-if="record.confirmationStatus !== 'CONFIRMED'"
                    type="link"
                    size="small"
                    @click="confirmRecord(record)"
                  >
                    确认
                  </a-button>
                  <a-button
                    v-if="record.confirmationStatus !== 'CONFIRMED'"
                    type="link"
                    size="small"
                    danger
                    @click="deleteRecord(record)"
                  >
                    删除
                  </a-button>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 节点编辑 -->
    <a-modal
      v-model:open="nodeEditorVisible"
      :title="nodeEditorMode === 'create' ? '新建过程性评价节点' : '编辑节点'"
      width="720px"
      @ok="submitNode"
    >
      <a-form layout="vertical" :model="nodeEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="节点编码" required>
              <a-input v-model:value="nodeEditor.nodeCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="节点类型" required>
              <a-select v-model:value="nodeEditor.nodeType" :options="nodeTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学期">
              <a-input v-model:value="nodeEditor.semester" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="nodeEditor.nodeName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="挂靠考核环节">
              <a-select v-model:value="nodeEditor.assessmentItemId" allow-clear placeholder="可选">
                <a-select-option v-for="a in assessmentItems" :key="a.id" :value="a.id">
                  {{ a.itemCode }} · {{ a.itemName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="挂靠课程目标">
              <a-select v-model:value="nodeEditor.courseGoalId" allow-clear placeholder="可选">
                <a-select-option v-for="g in courseGoals" :key="g.id" :value="g.id">
                  {{ g.goalCode }} · {{ g.goalName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="挂靠观测点">
              <a-select v-model:value="nodeEditor.indicatorId" allow-clear placeholder="可选" show-search option-filter-prop="label">
                <a-select-option
                  v-for="i in indicators"
                  :key="i.id"
                  :value="i.id"
                  :label="`${i.indicatorCode} · ${i.indicatorName}`"
                >
                  {{ i.indicatorCode }} · {{ i.indicatorName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="权重 (0~1)">
              <a-input-number v-model:value="nodeEditor.weight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="满分">
              <a-input-number v-model:value="nodeEditor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="覆盖率要求">
              <a-input-number v-model:value="nodeEditor.coverageRequired" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="证据类型">
          <a-input v-model:value="nodeEditor.evidenceType" placeholder="如 实验报告 / 项目文档 / 课堂答辩" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="nodeEditor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 记录编辑 -->
    <a-modal
      v-model:open="recordEditorVisible"
      :title="recordEditorMode === 'create' ? '录入节点记录' : '编辑节点记录'"
      width="640px"
      @ok="submitRecord"
    >
      <a-form layout="vertical" :model="recordEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学号">
              <a-input v-model:value="recordEditor.studentNumber" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学生用户 ID">
              <a-input v-model:value="recordEditor.studentUserId" placeholder="可与学号同时存在" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="原始分" required>
              <a-input-number v-model:value="recordEditor.rawScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="换算分">
              <a-input-number v-model:value="recordEditor.convertedScore" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据来源">
              <a-select v-model:value="recordEditor.sourceMode">
                <a-select-option
                  v-for="(v, k) in DATA_SOURCE_MODE_LABEL"
                  :key="k"
                  :value="k"
                >
                  {{ v }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="证据文件 ID">
          <a-input v-model:value="recordEditor.evidenceFileId" placeholder="edu-storage 文件 ID" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="recordEditor.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量录入 -->
    <a-modal
      v-model:open="batchRecordVisible"
      :title="`批量录入节点记录（${selectedNode?.nodeName || ''}）`"
      :confirm-loading="batchRecordSubmitting"
      width="780px"
      ok-text="提交批量录入"
      @ok="submitBatchRecord"
    >
      <a-alert
        type="info"
        show-icon
        message="粘贴 JSON 数组，每条为一个节点记录"
        description="必填：rawScore；可选：studentNumber、studentUserId、convertedScore、evidenceFileId、sourceMode、notes。nodeId 与 qualityCourseId 由页面自动填入。"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="batchRecordText"
        :rows="14"
        :placeholder="BATCH_RECORD_PLACEHOLDER"
        :style="{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }"
      />
    </a-modal>

    <!-- 按课程目标查已确认记录 -->
    <a-modal
      v-model:open="confirmedByGoalVisible"
      title="按课程目标查已确认记录"
      :footer="null"
      width="780px"
    >
      <a-space style="margin-bottom: 12px" wrap>
        <span>课程目标：</span>
        <a-select
          v-model:value="confirmedByGoalId"
          placeholder="选择课程目标"
          style="min-width: 320px"
          show-search
          option-filter-prop="label"
        >
          <a-select-option
            v-for="g in courseGoals"
            :key="g.id"
            :value="g.id"
            :label="`${g.goalCode} ${g.goalName}`"
          >
            {{ g.goalCode }} · {{ g.goalName }}
          </a-select-option>
        </a-select>
        <a-button type="primary" :loading="confirmedByGoalLoading" @click="queryConfirmedByGoal">
          查询
        </a-button>
      </a-space>
      <a-table
        :data-source="confirmedByGoalRecords"
        :loading="confirmedByGoalLoading"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
      >
        <a-table-column title="节点 ID" data-index="nodeId" width="100" />
        <a-table-column title="学号" data-index="studentNumber" width="120" />
        <a-table-column title="原始分 / 换算分" width="150">
          <template #default="{ record }">
            {{ Number(record.rawScore).toFixed(1) }}
            <span v-if="record.convertedScore != null" class="text-gray-500 text-xs">
              / {{ Number(record.convertedScore).toFixed(2) }}
            </span>
          </template>
        </a-table-column>
        <a-table-column title="证据文件" data-index="evidenceFileId" width="120">
          <template #default="{ text }">
            {{ text || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="确认时间" data-index="confirmedAt" width="160" />
      </a-table>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
.filter-label { color: var(--ant-color-text-secondary); }
:deep(.row-selected) td { background-color: var(--ant-color-primary-bg) !important; }
.text-xs { font-size: 12px; }
.text-gray-500 { color: rgba(0, 0, 0, 0.45); }
</style>
