<script setup lang="ts">
/**
 * 毕业要求观测点维护 + 观测点 ↔ 认证标准条款映射
 *
 * 上下文：当前培养方案 → 选毕业要求 → 列出观测点
 * 后端：
 * - /api/quality/requirement-indicators       观测点 CRUD + validate-weights
 * - /api/quality/requirement-standard-mappings 观测点 ↔ 标准条款
 *
 * 强约束：同一毕业要求下所有观测点 requirementWeight 之和必须为 1。
 */
import type {
  AccreditationStandardVO,
  GraduationRequirementVO,
  RequirementIndicatorSavePayload,
  RequirementIndicatorVO,
  RequirementStandardMappingSavePayload,
  RequirementStandardMappingVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  accreditationStandardApi,
  graduationRequirementApi,
  requirementIndicatorApi,
  requirementStandardMappingApi,
} from '@/apis/quality'
import GraduationRequirementSelector from '@/components/quality/selectors/GraduationRequirementSelector.vue'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

const currentRequirementId = ref<string | null>(null)
const currentRequirement = ref<GraduationRequirementVO | null>(null)

/* ========== 观测点列表 ========== */

const list = ref<RequirementIndicatorVO[]>([])
const loading = ref(false)
const selectedIndicator = ref<RequirementIndicatorVO | null>(null)

const weightSum = computed(() =>
  list.value.reduce((acc, item) => acc + (Number(item.requirementWeight) || 0), 0),
)

const weightValid = computed(() => Math.abs(weightSum.value - 1) < 1e-6)

async function loadList() {
  if (!currentRequirementId.value) {
    list.value = []
    return
  }
  loading.value = true
  try {
    list.value = await requirementIndicatorApi.listByRequirement(currentRequirementId.value) || []
  } finally {
    loading.value = false
  }
}

/* ========== 观测点编辑 ========== */

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<RequirementIndicatorSavePayload>({
  requirementId: '',
  indicatorCode: '',
  indicatorName: '',
  description: '',
  requirementWeight: 0.5,
  thresholdValue: 0.7,
  civicDimensions: '',
  sortOrder: 0,
})
const submitting = ref(false)

function openCreate() {
  if (!currentRequirementId.value) {
    message.warning('请先选择毕业要求')
    return
  }
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    requirementId: currentRequirementId.value,
    indicatorCode: '',
    indicatorName: '',
    description: '',
    requirementWeight: Math.max(0, 1 - weightSum.value),
    thresholdValue: currentRequirement.value?.thresholdValue ?? 0.7,
    civicDimensions: '',
    sortOrder: (list.value.length + 1) * 10,
  })
  editorVisible.value = true
}

function openEdit(record: RequirementIndicatorVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.requirementId || !editor.indicatorCode.trim() || !editor.indicatorName.trim()) {
    message.error('请填写编码和名称')
    return
  }
  if (editor.requirementWeight == null || editor.requirementWeight < 0 || editor.requirementWeight > 1) {
    message.error('权重必须在 0~1 之间')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await requirementIndicatorApi.create(editor)
    else await requirementIndicatorApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: RequirementIndicatorVO) {
  Modal.confirm({
    title: `删除观测点 ${record.indicatorCode}？`,
    content: '删除后该观测点与其标准映射、课程目标支撑关系一同失效。',
    okType: 'danger',
    onOk: async () => {
      await requirementIndicatorApi.delete(record.id)
      message.success('已删除')
      if (selectedIndicator.value?.id === record.id) selectedIndicator.value = null
      await loadList()
    },
  })
}

async function validateWeights() {
  if (!currentRequirementId.value) return
  try {
    await requirementIndicatorApi.validateWeights(currentRequirementId.value)
    message.success('权重之和校验通过（=1）')
  } catch {
    // 后端 BizException 已通过 axios 拦截器提示
  }
}

/* ========== 标准映射 ========== */

const mappings = ref<RequirementStandardMappingVO[]>([])
const standardOptions = ref<AccreditationStandardVO[]>([])
const mappingLoading = ref(false)

const standardMap = computed(() => {
  const map = new Map<string, AccreditationStandardVO>()
  standardOptions.value.forEach(s => map.set(s.id, s))
  return map
})

async function loadMappings() {
  if (!currentRequirementId.value) {
    mappings.value = []
    return
  }
  mappingLoading.value = true
  try {
    mappings.value = await requirementStandardMappingApi.listByRequirement(currentRequirementId.value) || []
  } finally {
    mappingLoading.value = false
  }
}

async function loadStandards() {
  const page = await accreditationStandardApi.page({ pageNum: 1, pageSize: 200, enabled: true })
  standardOptions.value = page.list || []
}

const mappingEditorVisible = ref(false)
const mappingEditorMode = ref<'create' | 'edit'>('create')
const mappingEditor = reactive<RequirementStandardMappingSavePayload>({
  requirementId: '',
  standardId: '',
  standardClause: '',
  coverageNote: '',
})

function openMappingCreate() {
  if (!currentRequirementId.value) return
  mappingEditorMode.value = 'create'
  Object.assign(mappingEditor, {
    id: undefined,
    requirementId: currentRequirementId.value,
    standardId: '',
    standardClause: '',
    coverageNote: '',
  })
  mappingEditorVisible.value = true
}

function openMappingEdit(record: RequirementStandardMappingVO) {
  mappingEditorMode.value = 'edit'
  Object.assign(mappingEditor, record)
  mappingEditorVisible.value = true
}

async function submitMapping() {
  if (!mappingEditor.standardId) {
    message.error('请选择认证标准')
    return
  }
  if (mappingEditorMode.value === 'create') await requirementStandardMappingApi.create(mappingEditor)
  else await requirementStandardMappingApi.update(mappingEditor)
  message.success('已保存')
  mappingEditorVisible.value = false
  await loadMappings()
}

async function deleteMapping(record: RequirementStandardMappingVO) {
  Modal.confirm({
    title: '删除该标准映射？',
    okType: 'danger',
    onOk: async () => {
      await requirementStandardMappingApi.delete(record.id)
      message.success('已删除')
      await loadMappings()
    },
  })
}

/* ========== 上下文联动 ========== */

async function handleRequirementChange(value: string | null) {
  currentRequirementId.value = value || null
  if (value) {
    try {
      currentRequirement.value = await graduationRequirementApi.detail(value)
    } catch {
      currentRequirement.value = null
    }
  } else {
    currentRequirement.value = null
  }
  selectedIndicator.value = null
  await Promise.all([loadList(), loadMappings()])
}

watch(() => qualityStore.currentTrainingPlanId, () => {
  currentRequirementId.value = null
  currentRequirement.value = null
  list.value = []
  mappings.value = []
})

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await loadStandards()
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
        <span class="filter-label">毕业要求：</span>
        <GraduationRequirementSelector
          :value="currentRequirementId"
          :training-plan-id="qualityStore.currentTrainingPlanId || null"
          :width="360"
          @change="handleRequirementChange"
        />
      </a-space>
    </a-card>

    <a-alert
      v-if="!currentRequirementId"
      type="warning"
      show-icon
      message="尚未选择毕业要求，请先在上方选择"
      style="margin-bottom: 12px"
    />

    <a-row v-if="currentRequirementId" :gutter="12">
      <a-col :span="14">
        <a-card :bordered="false">
          <template #title>
            <span>「{{ currentRequirement?.requirementName }}」观测点</span>
          </template>
          <template #extra>
            <a-space>
              <a-tag :color="weightValid ? 'green' : 'orange'">
                权重和：{{ weightSum.toFixed(3) }}
              </a-tag>
              <a-button size="small" @click="validateWeights">
                校验权重
              </a-button>
              <a-button type="primary" size="small" @click="openCreate">
                新建观测点
              </a-button>
            </a-space>
          </template>

          <a-table
            :data-source="list"
            :loading="loading"
            row-key="id"
            size="middle"
            :pagination="false"
            :row-class-name="(r: RequirementIndicatorVO) => (selectedIndicator?.id === r.id ? 'row-selected' : '')"
            :custom-row="(record: RequirementIndicatorVO) => ({
              onClick: () => (selectedIndicator = record),
              style: 'cursor: pointer',
            })"
          >
            <a-table-column title="编码" data-index="indicatorCode" width="100" />
            <a-table-column title="名称" data-index="indicatorName" />
            <a-table-column title="权重" data-index="requirementWeight" width="80">
              <template #default="{ text }">
                {{ Number(text).toFixed(3) }}
              </template>
            </a-table-column>
            <a-table-column title="阈值" data-index="thresholdValue" width="80">
              <template #default="{ text }">
                {{ text == null ? '-' : Number(text).toFixed(2) }}
              </template>
            </a-table-column>
            <a-table-column title="五育维度" data-index="civicDimensions">
              <template #default="{ text }">
                <a-space wrap>
                  <a-tag
                    v-for="d in (text || '').split(',').filter(Boolean)"
                    :key="d"
                    color="purple"
                  >
                    {{ d }}
                  </a-tag>
                </a-space>
              </template>
            </a-table-column>
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

      <a-col :span="10">
        <a-card title="认证标准映射" :bordered="false">
          <template #extra>
            <a-button type="primary" size="small" @click="openMappingCreate">
              新增映射
            </a-button>
          </template>

          <a-table
            :data-source="mappings"
            :loading="mappingLoading"
            row-key="id"
            size="middle"
            :pagination="false"
          >
            <a-table-column title="标准">
              <template #default="{ record }">
                <div>
                  <span class="font-mono text-xs text-gray-500">
                    {{ standardMap.get(record.standardId)?.standardCode }}
                  </span>
                  {{ standardMap.get(record.standardId)?.standardName || record.standardId }}
                </div>
                <div class="text-xs text-gray-500">
                  条款：{{ record.standardClause || '-' }}
                </div>
              </template>
            </a-table-column>
            <a-table-column title="覆盖说明" data-index="coverageNote">
              <template #default="{ text }">
                {{ text || '-' }}
              </template>
            </a-table-column>
            <a-table-column title="操作" width="120">
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

    <!-- 观测点编辑 -->
    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建观测点' : '编辑观测点'"
      :confirm-loading="submitting"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.indicatorCode" placeholder="如 1-1" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序">
              <a-input-number v-model:value="editor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.indicatorName" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="editor.description" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="权重 (0~1)" required>
              <a-input-number
                v-model:value="editor.requirementWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="阈值 (0~1)">
              <a-input-number
                v-model:value="editor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="五育维度（逗号分隔）">
          <a-input v-model:value="editor.civicDimensions" placeholder="德,智,体,美,劳" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 标准映射编辑 -->
    <a-modal
      v-model:open="mappingEditorVisible"
      :title="mappingEditorMode === 'create' ? '新增标准映射' : '编辑标准映射'"
      @ok="submitMapping"
    >
      <a-form layout="vertical" :model="mappingEditor">
        <a-form-item label="认证标准" required>
          <a-select
            v-model:value="mappingEditor.standardId"
            placeholder="请选择认证标准"
            show-search
            option-filter-prop="label"
            :disabled="mappingEditorMode === 'edit'"
          >
            <a-select-option
              v-for="s in standardOptions"
              :key="s.id"
              :value="s.id"
              :label="`${s.standardCode} · ${s.standardName}`"
            >
              <span class="font-mono text-xs text-gray-500 mr-1">{{ s.standardCode }}</span>
              {{ s.standardName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="条款编号">
          <a-input v-model:value="mappingEditor.standardClause" placeholder="如 3.4" />
        </a-form-item>
        <a-form-item label="覆盖说明">
          <a-textarea v-model:value="mappingEditor.coverageNote" :rows="3" />
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
