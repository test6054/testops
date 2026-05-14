<script setup lang="ts">
/**
 * 考核环节维护 + 考核 ↔ 课程目标权重 + Rubric 评分明细
 *
 * 上下文：当前培养方案 → 当前质量评价课程 → 列出该课程的考核环节
 * 后端：
 * - /api/quality/assessment-items           考核环节 CRUD + list-by-course
 * - /api/quality/assessment-goal-weights    考核 ↔ 课程目标权重 + validate-weights
 * - /api/quality/rubric-items               Rubric 明细 + validate-full-score
 *
 * 强约束：
 * - 同一考核环节对各课程目标的 weight 之和 = 1
 * - 同一 (item, goal) 下 rubric 满分之和 = 该 (item, goal) 的 fullScore
 */
import type {
  AssessmentGoalWeightSavePayload,
  AssessmentGoalWeightVO,
  AssessmentItemSavePayload,
  AssessmentItemVO,
  CourseGoalVO,
  RubricItemSavePayload,
  RubricItemVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  assessmentGoalWeightApi,
  assessmentItemApi,
  courseGoalApi,
  rubricItemApi,
} from '@/apis/quality'
import CourseSelector from '@/components/quality/selectors/CourseSelector.vue'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

/* ========== 考核环节列表 ========== */

const list = ref<AssessmentItemVO[]>([])
const loading = ref(false)
const selectedItem = ref<AssessmentItemVO | null>(null)

async function loadList() {
  if (!qualityStore.currentQualityCourseId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    list.value = await assessmentItemApi.listByCourse(qualityStore.currentQualityCourseId) || []
  } finally {
    loading.value = false
  }
}

/* ========== 考核环节编辑 ========== */

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AssessmentItemSavePayload>({
  qualityCourseId: '',
  itemCode: '',
  itemName: '',
  itemType: 'EXAM',
  fullScore: 100,
  passScore: 60,
  weightInCourse: 0.3,
  isProcessOriented: false,
  description: '',
  sortOrder: 0,
})
const submitting = ref(false)

const itemTypeOptions = [
  { value: 'EXAM', label: '考试' },
  { value: 'HOMEWORK', label: '作业' },
  { value: 'PROJECT', label: '项目' },
  { value: 'EXPERIMENT', label: '实验 / 实训' },
  { value: 'PRESENTATION', label: '答辩 / 汇报' },
  { value: 'ATTENDANCE', label: '考勤 / 课堂表现' },
  { value: 'OTHER', label: '其他' },
]

function openCreate() {
  if (!qualityStore.currentQualityCourseId) {
    message.warning('请先选择质量评价课程')
    return
  }
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    qualityCourseId: qualityStore.currentQualityCourseId,
    itemCode: '',
    itemName: '',
    itemType: 'EXAM',
    fullScore: 100,
    passScore: 60,
    weightInCourse: 0.3,
    isProcessOriented: false,
    description: '',
    sortOrder: (list.value.length + 1) * 10,
  })
  editorVisible.value = true
}

function openEdit(record: AssessmentItemVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.itemCode.trim() || !editor.itemName.trim()) {
    message.error('请填写编码和名称')
    return
  }
  if (editor.fullScore == null || editor.fullScore <= 0) {
    message.error('满分必须大于 0')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await assessmentItemApi.create(editor)
    else await assessmentItemApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: AssessmentItemVO) {
  Modal.confirm({
    title: `删除考核环节 ${record.itemCode}？`,
    okType: 'danger',
    onOk: async () => {
      await assessmentItemApi.delete(record.id)
      message.success('已删除')
      if (selectedItem.value?.id === record.id) selectedItem.value = null
      await loadList()
    },
  })
}

/* ========== 课程目标权重 ========== */

const weights = ref<AssessmentGoalWeightVO[]>([])
const weightsLoading = ref(false)
const courseGoals = ref<CourseGoalVO[]>([])

const courseGoalMap = computed(() => {
  const map = new Map<string, CourseGoalVO>()
  courseGoals.value.forEach(g => map.set(g.id, g))
  return map
})

const weightSum = computed(() =>
  weights.value.reduce((acc, w) => acc + (Number(w.weight) || 0), 0),
)
const weightValid = computed(() => Math.abs(weightSum.value - 1) < 1e-6)

async function loadCourseGoals() {
  if (!qualityStore.currentQualityCourseId) {
    courseGoals.value = []
    return
  }
  courseGoals.value = await courseGoalApi.listByCourse(qualityStore.currentQualityCourseId) || []
}

async function loadWeights() {
  if (!selectedItem.value) {
    weights.value = []
    return
  }
  weightsLoading.value = true
  try {
    weights.value = await assessmentGoalWeightApi.listByItem(selectedItem.value.id) || []
  } finally {
    weightsLoading.value = false
  }
}

const weightEditorVisible = ref(false)
const weightEditorMode = ref<'create' | 'edit'>('create')
const weightEditor = reactive<AssessmentGoalWeightSavePayload>({
  assessmentItemId: '',
  courseGoalId: '',
  weight: 0.5,
  fullScore: 100,
})

function openWeightCreate() {
  if (!selectedItem.value) return
  weightEditorMode.value = 'create'
  Object.assign(weightEditor, {
    id: undefined,
    assessmentItemId: selectedItem.value.id,
    courseGoalId: '',
    weight: Math.max(0, 1 - weightSum.value),
    fullScore: selectedItem.value.fullScore,
  })
  weightEditorVisible.value = true
}

function openWeightEdit(record: AssessmentGoalWeightVO) {
  weightEditorMode.value = 'edit'
  Object.assign(weightEditor, record)
  weightEditorVisible.value = true
}

async function submitWeight() {
  if (!weightEditor.courseGoalId) {
    message.error('请选择课程目标')
    return
  }
  if (weightEditor.weight == null || weightEditor.weight < 0 || weightEditor.weight > 1) {
    message.error('权重必须在 0~1 之间')
    return
  }
  if (weightEditorMode.value === 'create') await assessmentGoalWeightApi.create(weightEditor)
  else await assessmentGoalWeightApi.update(weightEditor)
  message.success('已保存')
  weightEditorVisible.value = false
  await loadWeights()
}

async function deleteWeight(record: AssessmentGoalWeightVO) {
  Modal.confirm({
    title: '删除该权重？',
    okType: 'danger',
    onOk: async () => {
      await assessmentGoalWeightApi.delete(record.id)
      message.success('已删除')
      await loadWeights()
    },
  })
}

async function validateWeights() {
  if (!selectedItem.value) return
  try {
    await assessmentGoalWeightApi.validateWeights(selectedItem.value.id)
    message.success('考核环节权重和校验通过（=1）')
  } catch {
    // 后端 BizException 由 axios 拦截器提示
  }
}

/* ========== Rubric 评分明细 ========== */

const rubrics = ref<RubricItemVO[]>([])
const rubricsLoading = ref(false)

async function loadRubrics() {
  if (!selectedItem.value) {
    rubrics.value = []
    return
  }
  rubricsLoading.value = true
  try {
    rubrics.value = await rubricItemApi.listByItem(selectedItem.value.id) || []
  } finally {
    rubricsLoading.value = false
  }
}

const rubricEditorVisible = ref(false)
const rubricEditorMode = ref<'create' | 'edit'>('create')
const rubricEditor = reactive<RubricItemSavePayload>({
  assessmentItemId: '',
  courseGoalId: undefined,
  rubricCode: '',
  rubricName: '',
  description: '',
  fullScore: 10,
  sortOrder: 0,
})

function openRubricCreate() {
  if (!selectedItem.value) return
  rubricEditorMode.value = 'create'
  Object.assign(rubricEditor, {
    id: undefined,
    assessmentItemId: selectedItem.value.id,
    courseGoalId: undefined,
    rubricCode: '',
    rubricName: '',
    description: '',
    fullScore: 10,
    sortOrder: (rubrics.value.length + 1) * 10,
  })
  rubricEditorVisible.value = true
}

function openRubricEdit(record: RubricItemVO) {
  rubricEditorMode.value = 'edit'
  Object.assign(rubricEditor, record)
  rubricEditorVisible.value = true
}

async function submitRubric() {
  if (!rubricEditor.rubricName.trim()) {
    message.error('请填写 Rubric 名称')
    return
  }
  if (rubricEditor.fullScore == null || rubricEditor.fullScore <= 0) {
    message.error('Rubric 满分必须大于 0')
    return
  }
  if (rubricEditorMode.value === 'create') await rubricItemApi.create(rubricEditor)
  else await rubricItemApi.update(rubricEditor)
  message.success('已保存')
  rubricEditorVisible.value = false
  await loadRubrics()
}

async function deleteRubric(record: RubricItemVO) {
  Modal.confirm({
    title: '删除该 Rubric？',
    okType: 'danger',
    onOk: async () => {
      await rubricItemApi.delete(record.id)
      message.success('已删除')
      await loadRubrics()
    },
  })
}

async function validateRubricFullScore() {
  if (!selectedItem.value) return
  try {
    await rubricItemApi.validateFullScore(selectedItem.value.id)
    message.success('Rubric 满分加总校验通过')
  } catch {
    // 后端 BizException
  }
}

/* ========== 上下文联动 ========== */

watch(() => qualityStore.currentQualityCourseId, async () => {
  selectedItem.value = null
  await Promise.all([loadList(), loadCourseGoals()])
})

watch(() => qualityStore.currentTrainingPlanId, () => {
  selectedItem.value = null
  list.value = []
  courseGoals.value = []
})

watch(selectedItem, async () => {
  await Promise.all([loadWeights(), loadRubrics()])
})

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  if (qualityStore.currentQualityCourseId) {
    await Promise.all([loadList(), loadCourseGoals()])
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
        <a-card title="考核环节" :bordered="false">
          <template #extra>
            <a-button type="primary" size="small" @click="openCreate">
              新建考核环节
            </a-button>
          </template>

          <a-table
            :data-source="list"
            :loading="loading"
            row-key="id"
            size="middle"
            :pagination="false"
            :row-class-name="(r: AssessmentItemVO) => (selectedItem?.id === r.id ? 'row-selected' : '')"
            :custom-row="(record: AssessmentItemVO) => ({
              onClick: () => (selectedItem = record),
              style: 'cursor: pointer',
            })"
          >
            <a-table-column title="编码" data-index="itemCode" width="80" />
            <a-table-column title="名称">
              <template #default="{ record }">
                {{ record.itemName }}
                <a-tag v-if="record.isProcessOriented" color="green" size="small">过程</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="满分" data-index="fullScore" width="70" />
            <a-table-column title="占比" data-index="weightInCourse" width="80">
              <template #default="{ text }">
                {{ text == null ? '-' : `${(text * 100).toFixed(0)}%` }}
              </template>
            </a-table-column>
            <a-table-column title="操作" width="120" fixed="right">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click.stop="openEdit(record)">
                    编辑
                  </a-button>
                  <a-button type="link" size="small" danger @click.stop="handleDelete(record)">
                    删除
                  </a-button>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>

      <a-col :span="14">
        <a-empty v-if="!selectedItem" description="请在左侧选择考核环节查看权重和 Rubric" />

        <template v-else>
          <a-card :bordered="false" style="margin-bottom: 12px">
            <template #title>
              <span>「{{ selectedItem.itemName }}」对各课程目标权重</span>
            </template>
            <template #extra>
              <a-space>
                <a-tag :color="weightValid ? 'green' : 'orange'">
                  权重和：{{ weightSum.toFixed(3) }}
                </a-tag>
                <a-button size="small" @click="validateWeights">
                  校验权重
                </a-button>
                <a-button type="primary" size="small" @click="openWeightCreate">
                  新增权重
                </a-button>
              </a-space>
            </template>

            <a-table
              :data-source="weights"
              :loading="weightsLoading"
              row-key="id"
              size="middle"
              :pagination="false"
            >
              <a-table-column title="课程目标">
                <template #default="{ record }">
                  <span class="font-mono text-xs text-gray-500 mr-1">
                    {{ courseGoalMap.get(record.courseGoalId)?.goalCode }}
                  </span>
                  {{ courseGoalMap.get(record.courseGoalId)?.goalName || record.courseGoalId }}
                </template>
              </a-table-column>
              <a-table-column title="权重" data-index="weight" width="80">
                <template #default="{ text }">
                  {{ Number(text).toFixed(3) }}
                </template>
              </a-table-column>
              <a-table-column title="该目标满分" data-index="fullScore" width="100" />
              <a-table-column title="操作" width="120" fixed="right">
                <template #default="{ record }">
                  <a-space>
                    <a-button type="link" size="small" @click="openWeightEdit(record)">
                      编辑
                    </a-button>
                    <a-button type="link" size="small" danger @click="deleteWeight(record)">
                      删除
                    </a-button>
                  </a-space>
                </template>
              </a-table-column>
            </a-table>
          </a-card>

          <a-card title="Rubric 评分明细" :bordered="false">
            <template #extra>
              <a-space>
                <a-button size="small" @click="validateRubricFullScore">
                  校验满分加总
                </a-button>
                <a-button type="primary" size="small" @click="openRubricCreate">
                  新增 Rubric
                </a-button>
              </a-space>
            </template>

            <a-table
              :data-source="rubrics"
              :loading="rubricsLoading"
              row-key="id"
              size="middle"
              :pagination="false"
            >
              <a-table-column title="编码" data-index="rubricCode" width="100" />
              <a-table-column title="名称" data-index="rubricName" />
              <a-table-column title="挂靠课程目标" data-index="courseGoalId">
                <template #default="{ text }">
                  <span v-if="text">
                    <span class="font-mono text-xs text-gray-500 mr-1">{{ courseGoalMap.get(text)?.goalCode }}</span>
                    {{ courseGoalMap.get(text)?.goalName }}
                  </span>
                  <span v-else class="text-gray-400">未挂靠</span>
                </template>
              </a-table-column>
              <a-table-column title="满分" data-index="fullScore" width="70" />
              <a-table-column title="操作" width="120" fixed="right">
                <template #default="{ record }">
                  <a-space>
                    <a-button type="link" size="small" @click="openRubricEdit(record)">
                      编辑
                    </a-button>
                    <a-button type="link" size="small" danger @click="deleteRubric(record)">
                      删除
                    </a-button>
                  </a-space>
                </template>
              </a-table-column>
            </a-table>
          </a-card>
        </template>
      </a-col>
    </a-row>

    <!-- 考核环节编辑 -->
    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建考核环节' : '编辑考核环节'"
      :confirm-loading="submitting"
      width="640px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.itemCode" placeholder="如 A1" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="类型">
              <a-select v-model:value="editor.itemType" :options="itemTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number v-model:value="editor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.itemName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="editor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="及格分">
              <a-input-number v-model:value="editor.passScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="占课程比">
              <a-input-number
                v-model:value="editor.weightInCourse"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item>
          <a-checkbox v-model:checked="editor.isProcessOriented">
            过程性评价节点
          </a-checkbox>
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="editor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 权重编辑 -->
    <a-modal
      v-model:open="weightEditorVisible"
      :title="weightEditorMode === 'create' ? '新增课程目标权重' : '编辑课程目标权重'"
      @ok="submitWeight"
    >
      <a-form layout="vertical" :model="weightEditor">
        <a-form-item label="课程目标" required>
          <a-select
            v-model:value="weightEditor.courseGoalId"
            placeholder="请选择课程目标"
            :disabled="weightEditorMode === 'edit'"
          >
            <a-select-option v-for="g in courseGoals" :key="g.id" :value="g.id">
              <span class="font-mono text-xs text-gray-500 mr-1">{{ g.goalCode }}</span>
              {{ g.goalName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="权重 (0~1)" required>
              <a-input-number v-model:value="weightEditor.weight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="该目标满分" required>
              <a-input-number v-model:value="weightEditor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Rubric 编辑 -->
    <a-modal
      v-model:open="rubricEditorVisible"
      :title="rubricEditorMode === 'create' ? '新增 Rubric' : '编辑 Rubric'"
      @ok="submitRubric"
    >
      <a-form layout="vertical" :model="rubricEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="编码">
              <a-input v-model:value="rubricEditor.rubricCode" placeholder="如 R1" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="挂靠课程目标">
              <a-select v-model:value="rubricEditor.courseGoalId" allow-clear placeholder="可选">
                <a-select-option v-for="g in courseGoals" :key="g.id" :value="g.id">
                  <span class="font-mono text-xs text-gray-500 mr-1">{{ g.goalCode }}</span>
                  {{ g.goalName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="rubricEditor.rubricName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="rubricEditor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序">
              <a-input-number v-model:value="rubricEditor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="说明">
          <a-textarea v-model:value="rubricEditor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
.filter-label { color: var(--ant-color-text-secondary); }
:deep(.row-selected) td { background-color: var(--ant-color-primary-bg) !important; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.text-xs { font-size: 12px; }
.text-gray-500 { color: rgba(0, 0, 0, 0.45); }
.text-gray-400 { color: rgba(0, 0, 0, 0.35); }
.mr-1 { margin-right: 4px; }
</style>
