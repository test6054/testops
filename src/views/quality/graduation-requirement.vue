<script setup lang="ts">
/**
 * 毕业要求主数据 CRUD
 */
import type { GraduationRequirementQueryPayload, GraduationRequirementSavePayload, GraduationRequirementVO } from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import { AGGREGATION_FUNCTION_LABEL, graduationRequirementApi } from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

const list = ref<GraduationRequirementVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<GraduationRequirementQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<GraduationRequirementSavePayload>({
  trainingPlanId: '',
  requirementCode: '',
  requirementName: '',
  description: '',
  thresholdValue: 0.7,
  civicDimensions: '',
  aggregation: 'WEIGHTED_SUM',
  sortOrder: 0,
})
const submitting = ref(false)

const civicOptions = [
  '政治认同',
  '家国情怀',
  '文化素养',
  '法治意识',
  '道德修养',
  '工匠精神',
  '科技创新',
  '生态文明',
]

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) return
  loading.value = true
  try {
    const page = await graduationRequirementApi.page({
      ...query,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  }
  finally {
    loading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    requirementCode: '',
    requirementName: '',
    description: '',
    thresholdValue: 0.7,
    civicDimensions: '',
    aggregation: 'WEIGHTED_SUM',
    sortOrder: 0,
  })
  editorVisible.value = true
}

function openEdit(record: GraduationRequirementVO) {
  editorMode.value = 'edit'
  Object.assign(editor, {
    id: record.id,
    trainingPlanId: record.trainingPlanId,
    requirementCode: record.requirementCode,
    requirementName: record.requirementName,
    description: record.description || '',
    thresholdValue: record.thresholdValue ?? 0.7,
    civicDimensions: record.civicDimensions || '',
    aggregation: record.aggregation || 'WEIGHTED_SUM',
    sortOrder: record.sortOrder ?? 0,
  })
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.trainingPlanId || !editor.requirementCode.trim() || !editor.requirementName.trim()) {
    message.error('请填写培养方案 / 编码 / 名称')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await graduationRequirementApi.create(editor)
    else await graduationRequirementApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  }
  finally {
    submitting.value = false
  }
}

async function handleDelete(record: GraduationRequirementVO) {
  Modal.confirm({
    title: `删除毕业要求 ${record.requirementCode}？`,
    okType: 'danger',
    onOk: async () => {
      await graduationRequirementApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

watch(() => qualityStore.currentTrainingPlanId, () => loadList())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await loadList()
})
</script>

<template>
  <div class="page">
    <a-alert
      v-if="!qualityStore.currentTrainingPlanId"
      type="warning"
      show-icon
      message="尚未选择培养方案"
      style="margin-bottom: 12px"
    />

    <a-card :title="`毕业要求（${qualityStore.currentPlan?.planName || '当前培养方案'}）`" :bordered="false">
      <template #extra>
        <a-space>
          <a-input v-model:value="query.keyword" placeholder="关键字" style="width: 200px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
          <a-button type="primary" :disabled="!qualityStore.currentTrainingPlanId" @click="openCreate">
            新建毕业要求
          </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handlePageChange,
        }"
      >
        <a-table-column title="编码" data-index="requirementCode" width="120" />
        <a-table-column title="名称" data-index="requirementName" />
        <a-table-column title="阈值" data-index="thresholdValue" width="90">
          <template #default="{ text }">
            {{ text ?? '-' }}
          </template>
        </a-table-column>
        <a-table-column title="思政维度" data-index="civicDimensions">
          <template #default="{ text }">
            <a-space wrap>
              <a-tag
                v-for="d in (text || '').split(',').map((s: string) => s.trim()).filter(Boolean)"
                :key="d"
                color="purple"
              >
                {{ d }}
              </a-tag>
              <span v-if="!text" style="color: #999">-</span>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="聚合" data-index="aggregation" width="100">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="顺序" data-index="sortOrder" width="80">
          <template #default="{ text }">{{ text ?? '-' }}</template>
        </a-table-column>
        <a-table-column title="操作" width="160" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openEdit(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建毕业要求' : '编辑毕业要求'"
      :confirm-loading="submitting"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.requirementCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="阈值">
              <a-input-number v-model:value="editor.thresholdValue" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.requirementName" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="editor.description" :rows="3" />
        </a-form-item>
        <a-form-item label="课程思政维度">
          <a-input v-model:value="editor.civicDimensions" placeholder="多个用逗号分隔" />
          <a-space wrap style="margin-top: 6px">
            <a-tag
              v-for="dim in civicOptions"
              :key="dim"
              style="cursor: pointer"
              @click="editor.civicDimensions = editor.civicDimensions ? `${editor.civicDimensions}, ${dim}` : dim"
            >
              {{ dim }}
            </a-tag>
          </a-space>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="聚合函数">
              <a-select v-model:value="editor.aggregation">
                <a-select-option value="WEIGHTED_SUM">{{ AGGREGATION_FUNCTION_LABEL.WEIGHTED_SUM }}</a-select-option>
                <a-select-option value="MINIMUM">{{ AGGREGATION_FUNCTION_LABEL.MINIMUM }}</a-select-option>
                <a-select-option value="WEIGHTED_MINIMUM_MIXED">{{ AGGREGATION_FUNCTION_LABEL.WEIGHTED_MINIMUM_MIXED }}</a-select-option>
                <a-select-option value="DIRECT_INDIRECT_WEIGHTED">{{ AGGREGATION_FUNCTION_LABEL.DIRECT_INDIRECT_WEIGHTED }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="顺序">
              <a-input-number v-model:value="editor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>
