<script setup lang="ts">
/**
 * 培养目标维护 + 培养目标 ↔ 毕业要求权重映射
 *
 * 上下文：依赖当前培养方案 (qualityStore.currentTrainingPlanId)
 * 后端：
 * - /api/quality/training-objectives
 * - /api/quality/training-objective-requirements
 *
 * 数据约束（数据维护方负责）：同一培养目标下所有映射 weight 之和应 ≈ 1。
 */
import type {
  GraduationRequirementVO,
  TrainingObjectiveRequirementSavePayload,
  TrainingObjectiveRequirementVO,
  TrainingObjectiveSavePayload,
  TrainingObjectiveVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  graduationRequirementApi,
  trainingObjectiveApi,
  trainingObjectiveRequirementApi,
} from '@/apis/quality'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

/* ========== 培养目标主列表 ========== */

const list = ref<TrainingObjectiveVO[]>([])
const loading = ref(false)
const selectedObjective = ref<TrainingObjectiveVO | null>(null)

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) {
    list.value = []
    return
  }
  loading.value = true
  try {
    list.value = await trainingObjectiveApi.listByPlan(qualityStore.currentTrainingPlanId) || []
  } finally {
    loading.value = false
  }
}

/* ========== 培养目标编辑 ========== */

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<TrainingObjectiveSavePayload>({
  trainingPlanId: '',
  objectiveCode: '',
  objectiveName: '',
  description: '',
  sortOrder: 0,
})
const submitting = ref(false)

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    objectiveCode: '',
    objectiveName: '',
    description: '',
    sortOrder: (list.value.length + 1) * 10,
  })
  editorVisible.value = true
}

function openEdit(record: TrainingObjectiveVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.trainingPlanId || !editor.objectiveCode.trim() || !editor.objectiveName.trim()) {
    message.error('请填写编码和名称')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await trainingObjectiveApi.create(editor)
    else await trainingObjectiveApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: TrainingObjectiveVO) {
  Modal.confirm({
    title: `删除培养目标 ${record.objectiveCode}？`,
    content: '删除后该培养目标及其与毕业要求的映射将一同失效。',
    okType: 'danger',
    onOk: async () => {
      await trainingObjectiveApi.delete(record.id)
      message.success('已删除')
      if (selectedObjective.value?.id === record.id) selectedObjective.value = null
      await loadList()
    },
  })
}

/* ========== 映射矩阵 ========== */

const mappings = ref<TrainingObjectiveRequirementVO[]>([])
const requirementOptions = ref<GraduationRequirementVO[]>([])
const mappingLoading = ref(false)

const requirementMap = computed(() => {
  const map = new Map<string, GraduationRequirementVO>()
  requirementOptions.value.forEach(r => map.set(r.id, r))
  return map
})

const weightSum = computed(() =>
  mappings.value.reduce((acc, m) => acc + (Number(m.weight) || 0), 0),
)

const weightSumValid = computed(() => Math.abs(weightSum.value - 1) < 1e-6)

async function loadMappings() {
  if (!selectedObjective.value) {
    mappings.value = []
    return
  }
  mappingLoading.value = true
  try {
    mappings.value = await trainingObjectiveRequirementApi.listByObjective(selectedObjective.value.id) || []
  } finally {
    mappingLoading.value = false
  }
}

async function loadRequirementOptions() {
  if (!qualityStore.currentTrainingPlanId) {
    requirementOptions.value = []
    return
  }
  requirementOptions.value = await graduationRequirementApi.listByPlan(qualityStore.currentTrainingPlanId) || []
}

const mappingEditorVisible = ref(false)
const mappingEditorMode = ref<'create' | 'edit'>('create')
const mappingEditor = reactive<TrainingObjectiveRequirementSavePayload>({
  trainingObjectiveId: '',
  graduationRequirementId: '',
  weight: 0.5,
  sortOrder: 0,
  notes: '',
})

function openMappingCreate() {
  if (!selectedObjective.value) {
    message.warning('请先选择培养目标')
    return
  }
  mappingEditorMode.value = 'create'
  Object.assign(mappingEditor, {
    id: undefined,
    trainingObjectiveId: selectedObjective.value.id,
    graduationRequirementId: '',
    weight: Math.max(0, 1 - weightSum.value),
    sortOrder: (mappings.value.length + 1) * 10,
    notes: '',
  })
  mappingEditorVisible.value = true
}

function openMappingEdit(record: TrainingObjectiveRequirementVO) {
  mappingEditorMode.value = 'edit'
  Object.assign(mappingEditor, record)
  mappingEditorVisible.value = true
}

async function submitMapping() {
  if (!mappingEditor.graduationRequirementId) {
    message.error('请选择毕业要求')
    return
  }
  if (mappingEditor.weight == null || mappingEditor.weight < 0 || mappingEditor.weight > 1) {
    message.error('权重必须在 0~1 之间')
    return
  }
  if (mappingEditorMode.value === 'create') await trainingObjectiveRequirementApi.create(mappingEditor)
  else await trainingObjectiveRequirementApi.update(mappingEditor)
  message.success('已保存')
  mappingEditorVisible.value = false
  await loadMappings()
}

async function deleteMapping(record: TrainingObjectiveRequirementVO) {
  Modal.confirm({
    title: '删除该映射？',
    okType: 'danger',
    onOk: async () => {
      await trainingObjectiveRequirementApi.delete(record.id)
      message.success('已删除')
      await loadMappings()
    },
  })
}

/* ========== 上下文联动 ========== */

watch(() => qualityStore.currentTrainingPlanId, async () => {
  selectedObjective.value = null
  mappings.value = []
  await Promise.all([loadList(), loadRequirementOptions()])
})

watch(selectedObjective, () => loadMappings())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await Promise.all([loadList(), loadRequirementOptions()])
})

function handlePlanChange(planId: string | null) {
  qualityStore.setCurrent({ trainingPlanId: planId || '' })
}
</script>

<template>
  <div class="page">
    <a-card :bordered="false" style="margin-bottom: 12px">
      <a-space wrap>
        <span class="filter-label">培养方案：</span>
        <TrainingPlanSelector
          :value="qualityStore.currentTrainingPlanId || null"
          :width="320"
          @change="handlePlanChange"
        />
      </a-space>
    </a-card>

    <a-alert
      v-if="!qualityStore.currentTrainingPlanId"
      type="warning"
      show-icon
      message="尚未选择培养方案"
      style="margin-bottom: 12px"
    />

    <a-row :gutter="12">
      <a-col :span="10">
        <a-card title="培养目标列表" :bordered="false">
          <template #extra>
            <a-button
              type="primary"
              size="small"
              :disabled="!qualityStore.currentTrainingPlanId"
              @click="openCreate"
            >
              新建培养目标
            </a-button>
          </template>

          <a-table
            :data-source="list"
            :loading="loading"
            row-key="id"
            size="middle"
            :pagination="false"
            :row-class-name="(r: TrainingObjectiveVO) => (selectedObjective?.id === r.id ? 'row-selected' : '')"
            :custom-row="(record: TrainingObjectiveVO) => ({
              onClick: () => (selectedObjective = record),
              style: 'cursor: pointer',
            })"
          >
            <a-table-column title="编码" data-index="objectiveCode" width="120" />
            <a-table-column title="名称" data-index="objectiveName" />
            <a-table-column title="操作" width="140" fixed="right">
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
        <a-card :bordered="false">
          <template #title>
            <span>{{ selectedObjective ? `「${selectedObjective.objectiveName}」毕业要求映射` : '请选择左侧培养目标' }}</span>
          </template>
          <template #extra>
            <a-space>
              <a-tag :color="weightSumValid ? 'green' : 'orange'">
                权重和：{{ weightSum.toFixed(3) }}
              </a-tag>
              <a-button
                type="primary"
                size="small"
                :disabled="!selectedObjective"
                @click="openMappingCreate"
              >
                新增映射
              </a-button>
            </a-space>
          </template>

          <a-empty v-if="!selectedObjective" description="请在左侧选择培养目标" />
          <a-table
            v-else
            :data-source="mappings"
            :loading="mappingLoading"
            row-key="id"
            size="middle"
            :pagination="false"
          >
            <a-table-column title="毕业要求" data-index="graduationRequirementId">
              <template #default="{ text }">
                <span class="font-mono text-xs text-gray-500 mr-1">
                  {{ requirementMap.get(text)?.requirementCode }}
                </span>
                {{ requirementMap.get(text)?.requirementName || text }}
              </template>
            </a-table-column>
            <a-table-column title="权重" data-index="weight" width="100">
              <template #default="{ text }">
                {{ Number(text).toFixed(3) }}
              </template>
            </a-table-column>
            <a-table-column title="说明" data-index="notes" />
            <a-table-column title="操作" width="140" fixed="right">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click="openMappingEdit(record)">
                    编辑
                  </a-button>
                  <a-button type="link" size="small" danger @click="deleteMapping(record)">
                    删除
                  </a-button>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 培养目标编辑 -->
    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建培养目标' : '编辑培养目标'"
      :confirm-loading="submitting"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.objectiveCode" placeholder="如 PO1" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序">
              <a-input-number v-model:value="editor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.objectiveName" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="editor.description" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 映射编辑 -->
    <a-modal
      v-model:open="mappingEditorVisible"
      :title="mappingEditorMode === 'create' ? '新增毕业要求映射' : '编辑映射'"
      @ok="submitMapping"
    >
      <a-form layout="vertical" :model="mappingEditor">
        <a-form-item label="毕业要求" required>
          <a-select
            v-model:value="mappingEditor.graduationRequirementId"
            placeholder="请选择毕业要求"
            :disabled="mappingEditorMode === 'edit'"
          >
            <a-select-option v-for="r in requirementOptions" :key="r.id" :value="r.id">
              <span class="font-mono text-xs text-gray-500 mr-1">{{ r.requirementCode }}</span>
              {{ r.requirementName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="权重 (0~1)" required>
              <a-input-number
                v-model:value="mappingEditor.weight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序">
              <a-input-number v-model:value="mappingEditor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="mappingEditor.notes" :rows="3" />
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
