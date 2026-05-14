<script setup lang="ts">
/**
 * 课程目标维护 + 支撑映射 + 达成度计算规则
 *
 * 上下文：当前培养方案 → 当前质量评价课程 → 列出该课程的课程目标
 * 后端：
 * - /api/quality/course-goals                   课程目标 CRUD
 * - /api/quality/course-goal-requirements       课程目标 ↔ 毕业要求/观测点支撑映射
 * - /api/quality/course-goal-assessment-rules   课程目标计算规则
 */
import type {
  CourseGoalAssessmentRuleSavePayload,
  CourseGoalAssessmentRuleVO,
  CourseGoalRequirementSavePayload,
  CourseGoalRequirementVO,
  CourseGoalSavePayload,
  CourseGoalVO,
  GraduationRequirementVO,
  RequirementIndicatorVO,
  SupportLevel,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  AGGREGATION_FUNCTION_LABEL,
  courseGoalApi,
  courseGoalAssessmentRuleApi,
  courseGoalRequirementApi,
  graduationRequirementApi,
  requirementIndicatorApi,
  SUPPORT_LEVEL_LABEL,
} from '@/apis/quality'
import CourseSelector from '@/components/quality/selectors/CourseSelector.vue'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

/* ========== 课程目标列表 ========== */

const list = ref<CourseGoalVO[]>([])
const loading = ref(false)
const selectedGoal = ref<CourseGoalVO | null>(null)

async function loadList() {
  if (!qualityStore.currentQualityCourseId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    list.value = await courseGoalApi.listByCourse(qualityStore.currentQualityCourseId) || []
  } finally {
    loading.value = false
  }
}

/* ========== 课程目标编辑 ========== */

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<CourseGoalSavePayload>({
  qualityCourseId: '',
  goalCode: '',
  goalName: '',
  description: '',
  thresholdValue: 0.7,
  directWeight: 0.7,
  indirectWeight: 0.3,
  aggregation: 'WEIGHTED_SUM',
  civicObjectiveFlag: false,
  aiLiteracyFlag: false,
  sortOrder: 0,
})
const submitting = ref(false)

function openCreate() {
  if (!qualityStore.currentQualityCourseId) {
    message.warning('请先选择质量评价课程')
    return
  }
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    qualityCourseId: qualityStore.currentQualityCourseId,
    goalCode: '',
    goalName: '',
    description: '',
    thresholdValue: 0.7,
    directWeight: 0.7,
    indirectWeight: 0.3,
    aggregation: 'WEIGHTED_SUM',
    civicObjectiveFlag: false,
    aiLiteracyFlag: false,
    sortOrder: (list.value.length + 1) * 10,
  })
  editorVisible.value = true
}

function openEdit(record: CourseGoalVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.qualityCourseId || !editor.goalCode.trim() || !editor.goalName.trim()) {
    message.error('请填写编码与名称')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await courseGoalApi.create(editor)
    else await courseGoalApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: CourseGoalVO) {
  Modal.confirm({
    title: `删除课程目标 ${record.goalCode}？`,
    okType: 'danger',
    onOk: async () => {
      await courseGoalApi.delete(record.id)
      message.success('已删除')
      if (selectedGoal.value?.id === record.id) selectedGoal.value = null
      await loadList()
    },
  })
}

/* ========== 支撑映射（课程目标 → 毕业要求/观测点） ========== */

const supports = ref<CourseGoalRequirementVO[]>([])
const requirementOptions = ref<GraduationRequirementVO[]>([])
const indicatorMap = ref<Map<string, RequirementIndicatorVO>>(new Map())
const supportLoading = ref(false)

const requirementMap = computed(() => {
  const map = new Map<string, GraduationRequirementVO>()
  requirementOptions.value.forEach(r => map.set(r.id, r))
  return map
})

async function loadRequirementOptions() {
  if (!qualityStore.currentTrainingPlanId) {
    requirementOptions.value = []
    indicatorMap.value = new Map()
    return
  }
  requirementOptions.value = await graduationRequirementApi.listByPlan(qualityStore.currentTrainingPlanId) || []
  // 预加载所有观测点 → 便于回显
  const allIndicators: RequirementIndicatorVO[] = []
  for (const r of requirementOptions.value) {
    const items = await requirementIndicatorApi.listByRequirement(r.id) || []
    allIndicators.push(...items)
  }
  const m = new Map<string, RequirementIndicatorVO>()
  allIndicators.forEach(i => m.set(i.id, i))
  indicatorMap.value = m
}

async function loadSupports() {
  if (!selectedGoal.value) {
    supports.value = []
    return
  }
  supportLoading.value = true
  try {
    supports.value = await courseGoalRequirementApi.listByCourseGoal(selectedGoal.value.id) || []
  } finally {
    supportLoading.value = false
  }
}

const supportEditorVisible = ref(false)
const supportEditorMode = ref<'create' | 'edit'>('create')
const supportEditor = reactive<CourseGoalRequirementSavePayload>({
  courseGoalId: '',
  requirementId: undefined,
  indicatorId: undefined,
  supportLevel: 'MEDIUM',
  supportWeight: 0.5,
})

const indicatorsOfSelectedRequirement = computed(() => {
  if (!supportEditor.requirementId) return [] as RequirementIndicatorVO[]
  return Array.from(indicatorMap.value.values()).filter(
    i => i.requirementId === supportEditor.requirementId,
  )
})

function openSupportCreate() {
  if (!selectedGoal.value) return
  supportEditorMode.value = 'create'
  Object.assign(supportEditor, {
    id: undefined,
    courseGoalId: selectedGoal.value.id,
    requirementId: undefined,
    indicatorId: undefined,
    supportLevel: 'MEDIUM',
    supportWeight: 0.5,
  })
  supportEditorVisible.value = true
}

function openSupportEdit(record: CourseGoalRequirementVO) {
  supportEditorMode.value = 'edit'
  Object.assign(supportEditor, record)
  supportEditorVisible.value = true
}

async function submitSupport() {
  if (!supportEditor.requirementId && !supportEditor.indicatorId) {
    message.error('请选择毕业要求或观测点')
    return
  }
  if (supportEditor.supportWeight == null || supportEditor.supportWeight < 0 || supportEditor.supportWeight > 1) {
    message.error('支撑权重必须在 0~1 之间')
    return
  }
  if (supportEditorMode.value === 'create') await courseGoalRequirementApi.create(supportEditor)
  else await courseGoalRequirementApi.update(supportEditor)
  message.success('已保存')
  supportEditorVisible.value = false
  await loadSupports()
}

async function deleteSupport(record: CourseGoalRequirementVO) {
  Modal.confirm({
    title: '删除该支撑映射？',
    okType: 'danger',
    onOk: async () => {
      await courseGoalRequirementApi.delete(record.id)
      message.success('已删除')
      await loadSupports()
    },
  })
}

/* ========== 计算规则 ========== */

const rule = ref<CourseGoalAssessmentRuleVO | null>(null)
const ruleEditorVisible = ref(false)
const ruleEditor = reactive<CourseGoalAssessmentRuleSavePayload>({
  courseGoalId: '',
  aggregation: 'WEIGHTED_SUM',
  directWeight: 0.7,
  indirectWeight: 0.3,
  thresholdValue: 0.7,
  minimumValidSample: 1,
  indirectMinValidSample: 0,
  indirectCoverageThreshold: 0.5,
  notes: '',
})

async function loadRule() {
  if (!selectedGoal.value) {
    rule.value = null
    return
  }
  rule.value = await courseGoalAssessmentRuleApi.findByCourseGoal(selectedGoal.value.id)
}

function openRuleEditor() {
  if (!selectedGoal.value) return
  Object.assign(ruleEditor, {
    id: rule.value?.id,
    courseGoalId: selectedGoal.value.id,
    aggregation: rule.value?.aggregation || selectedGoal.value.aggregation || 'WEIGHTED_SUM',
    directWeight: rule.value?.directWeight ?? selectedGoal.value.directWeight ?? 0.7,
    indirectWeight: rule.value?.indirectWeight ?? selectedGoal.value.indirectWeight ?? 0.3,
    thresholdValue: rule.value?.thresholdValue ?? selectedGoal.value.thresholdValue ?? 0.7,
    minimumValidSample: rule.value?.minimumValidSample ?? 1,
    indirectMinValidSample: rule.value?.indirectMinValidSample ?? 0,
    indirectCoverageThreshold: rule.value?.indirectCoverageThreshold ?? 0.5,
    notes: rule.value?.notes || '',
  })
  ruleEditorVisible.value = true
}

async function submitRule() {
  if (rule.value?.id) {
    await courseGoalAssessmentRuleApi.update({ ...ruleEditor, id: rule.value.id })
  } else {
    await courseGoalAssessmentRuleApi.create(ruleEditor)
  }
  message.success('已保存')
  ruleEditorVisible.value = false
  await loadRule()
}

async function deleteRule() {
  if (!rule.value?.id) return
  const ruleId = rule.value.id
  Modal.confirm({
    title: '删除该课程目标的达成度计算规则？',
    content: '删除后将无法对本课程目标执行达成度计算，直到重新配置。',
    okType: 'danger',
    onOk: async () => {
      await courseGoalAssessmentRuleApi.delete(ruleId)
      message.success('已删除')
      await loadRule()
    },
  })
}

/* ========== 上下文联动 ========== */

watch(() => qualityStore.currentQualityCourseId, async () => {
  selectedGoal.value = null
  await loadList()
})

watch(() => qualityStore.currentTrainingPlanId, () => {
  selectedGoal.value = null
  list.value = []
  loadRequirementOptions()
})

watch(selectedGoal, async () => {
  await Promise.all([loadSupports(), loadRule()])
})

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await loadRequirementOptions()
  if (qualityStore.currentQualityCourseId) await loadList()
})

function handlePlanChange(planId: string | null) {
  qualityStore.setCurrent({ trainingPlanId: planId || '', qualityCourseId: '' })
}

function handleCourseChange(courseId: string | null) {
  qualityStore.setCurrent({ qualityCourseId: courseId || '' })
}

/* ========== 字典 ========== */
const supportLevelOptions: { value: SupportLevel, label: string }[] = [
  { value: 'HIGH', label: SUPPORT_LEVEL_LABEL.HIGH },
  { value: 'MEDIUM', label: SUPPORT_LEVEL_LABEL.MEDIUM },
  { value: 'LOW', label: SUPPORT_LEVEL_LABEL.LOW },
]
const aggregationOptions = [
  { value: 'WEIGHTED_SUM', label: AGGREGATION_FUNCTION_LABEL.WEIGHTED_SUM },
  { value: 'MINIMUM', label: AGGREGATION_FUNCTION_LABEL.MINIMUM },
  { value: 'WEIGHTED_MINIMUM_MIXED', label: AGGREGATION_FUNCTION_LABEL.WEIGHTED_MINIMUM_MIXED },
  { value: 'DIRECT_INDIRECT_WEIGHTED', label: AGGREGATION_FUNCTION_LABEL.DIRECT_INDIRECT_WEIGHTED },
]
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
        <a-card title="课程目标" :bordered="false">
          <template #extra>
            <a-button type="primary" size="small" @click="openCreate">
              新建课程目标
            </a-button>
          </template>

          <a-table
            :data-source="list"
            :loading="loading"
            row-key="id"
            size="middle"
            :pagination="false"
            :row-class-name="(r: CourseGoalVO) => (selectedGoal?.id === r.id ? 'row-selected' : '')"
            :custom-row="(record: CourseGoalVO) => ({
              onClick: () => (selectedGoal = record),
              style: 'cursor: pointer',
            })"
          >
            <a-table-column title="编码" data-index="goalCode" width="80" />
            <a-table-column title="名称">
              <template #default="{ record }">
                {{ record.goalName }}
                <a-tag v-if="record.civicObjectiveFlag" color="purple" size="small">思政</a-tag>
                <a-tag v-if="record.aiLiteracyFlag" color="blue" size="small">AI 素养</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="阈值" data-index="thresholdValue" width="80">
              <template #default="{ text }">
                {{ text == null ? '-' : Number(text).toFixed(2) }}
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
        <a-empty v-if="!selectedGoal" description="请在左侧选择课程目标查看支撑映射和计算规则" />

        <template v-else>
          <a-card :bordered="false" style="margin-bottom: 12px">
            <template #title>
              <span>「{{ selectedGoal.goalName }}」支撑毕业要求 / 观测点</span>
            </template>
            <template #extra>
              <a-button type="primary" size="small" @click="openSupportCreate">
                新增支撑
              </a-button>
            </template>

            <a-table
              :data-source="supports"
              :loading="supportLoading"
              row-key="id"
              size="middle"
              :pagination="false"
            >
              <a-table-column title="毕业要求 / 观测点">
                <template #default="{ record }">
                  <div v-if="record.indicatorId">
                    <span class="font-mono text-xs text-gray-500">观测点</span>
                    {{ indicatorMap.get(record.indicatorId)?.indicatorCode }}
                    {{ indicatorMap.get(record.indicatorId)?.indicatorName }}
                  </div>
                  <div v-else-if="record.requirementId">
                    <span class="font-mono text-xs text-gray-500">毕业要求</span>
                    {{ requirementMap.get(record.requirementId)?.requirementCode }}
                    {{ requirementMap.get(record.requirementId)?.requirementName }}
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="支撑度" data-index="supportLevel" width="80">
                <template #default="{ text }">
                  <a-tag>{{ SUPPORT_LEVEL_LABEL[text as SupportLevel] || text }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="权重" data-index="supportWeight" width="80">
                <template #default="{ text }">
                  {{ Number(text).toFixed(3) }}
                </template>
              </a-table-column>
              <a-table-column title="操作" width="120" fixed="right">
                <template #default="{ record }">
                  <a-space>
                    <a-button type="link" size="small" @click="openSupportEdit(record)">
                      编辑
                    </a-button>
                    <a-button type="link" size="small" danger @click="deleteSupport(record)">
                      删除
                    </a-button>
                  </a-space>
                </template>
              </a-table-column>
            </a-table>
          </a-card>

          <a-card title="达成度计算规则" :bordered="false">
            <template #extra>
              <a-space>
                <a-button type="primary" size="small" @click="openRuleEditor">
                  {{ rule ? '编辑规则' : '配置规则' }}
                </a-button>
                <a-button v-if="rule" size="small" danger @click="deleteRule">
                  删除规则
                </a-button>
              </a-space>
            </template>

            <a-descriptions v-if="rule" bordered :column="2" size="small">
              <a-descriptions-item label="聚合策略">
                {{ AGGREGATION_FUNCTION_LABEL[rule.aggregation] || rule.aggregation }}
              </a-descriptions-item>
              <a-descriptions-item label="阈值">
                {{ Number(rule.thresholdValue).toFixed(2) }}
              </a-descriptions-item>
              <a-descriptions-item label="直接评价权重">
                {{ rule.directWeight ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="间接评价权重">
                {{ rule.indirectWeight ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="最低有效样本（直接）">
                {{ rule.minimumValidSample ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="最低有效样本（间接）">
                {{ rule.indirectMinValidSample ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="间接覆盖率阈值">
                {{ rule.indirectCoverageThreshold ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="备注">
                {{ rule.notes || '-' }}
              </a-descriptions-item>
            </a-descriptions>
            <a-empty v-else description="尚未配置该课程目标的计算规则" />
          </a-card>
        </template>
      </a-col>
    </a-row>

    <!-- 课程目标编辑 -->
    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建课程目标' : '编辑课程目标'"
      :confirm-loading="submitting"
      width="640px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.goalCode" placeholder="如 CG1" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="阈值 (0~1)">
              <a-input-number v-model:value="editor.thresholdValue" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number v-model:value="editor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.goalName" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="editor.description" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="聚合策略">
              <a-select v-model:value="editor.aggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="直接评价权重">
              <a-input-number v-model:value="editor.directWeight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="间接评价权重">
              <a-input-number v-model:value="editor.indirectWeight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-space>
          <a-checkbox v-model:checked="editor.civicObjectiveFlag">思政目标</a-checkbox>
          <a-checkbox v-model:checked="editor.aiLiteracyFlag">数字 / AI 素养</a-checkbox>
        </a-space>
      </a-form>
    </a-modal>

    <!-- 支撑编辑 -->
    <a-modal
      v-model:open="supportEditorVisible"
      :title="supportEditorMode === 'create' ? '新增支撑映射' : '编辑支撑映射'"
      @ok="submitSupport"
    >
      <a-form layout="vertical" :model="supportEditor">
        <a-form-item label="毕业要求">
          <a-select
            v-model:value="supportEditor.requirementId"
            allow-clear
            placeholder="请选择毕业要求（与观测点二选一）"
            @change="supportEditor.indicatorId = undefined"
          >
            <a-select-option v-for="r in requirementOptions" :key="r.id" :value="r.id">
              <span class="font-mono text-xs text-gray-500 mr-1">{{ r.requirementCode }}</span>
              {{ r.requirementName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="观测点（粒度更细）">
          <a-select
            v-model:value="supportEditor.indicatorId"
            allow-clear
            placeholder="选择观测点后毕业要求字段忽略"
            :disabled="!supportEditor.requirementId"
          >
            <a-select-option
              v-for="i in indicatorsOfSelectedRequirement"
              :key="i.id"
              :value="i.id"
            >
              <span class="font-mono text-xs text-gray-500 mr-1">{{ i.indicatorCode }}</span>
              {{ i.indicatorName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="支撑度" required>
              <a-select v-model:value="supportEditor.supportLevel" :options="supportLevelOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="支撑权重" required>
              <a-input-number v-model:value="supportEditor.supportWeight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 计算规则编辑 -->
    <a-modal
      v-model:open="ruleEditorVisible"
      :title="rule ? '编辑计算规则' : '配置计算规则'"
      width="640px"
      @ok="submitRule"
    >
      <a-form layout="vertical" :model="ruleEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="聚合策略" required>
              <a-select v-model:value="ruleEditor.aggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="阈值 (0~1)" required>
              <a-input-number v-model:value="ruleEditor.thresholdValue" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="最低样本（直接）">
              <a-input-number v-model:value="ruleEditor.minimumValidSample" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="直接评价权重">
              <a-input-number v-model:value="ruleEditor.directWeight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="间接评价权重">
              <a-input-number v-model:value="ruleEditor.indirectWeight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="最低样本（间接）">
              <a-input-number v-model:value="ruleEditor.indirectMinValidSample" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="间接评价覆盖率阈值">
          <a-input-number v-model:value="ruleEditor.indirectCoverageThreshold" :min="0" :max="1" :step="0.01" style="width: 100%" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="ruleEditor.notes" :rows="3" />
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
.mr-1 { margin-right: 4px; }
</style>
