<script setup lang="ts">
/**
 * 培养方案主数据 CRUD
 */
import type { TrainingPlanQueryPayload, TrainingPlanSavePayload, TrainingPlanVO } from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { trainingPlanApi } from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

const list = ref<TrainingPlanVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<TrainingPlanQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: '',
  schoolYear: '',
  gradeLevel: '',
  confirmationStatus: undefined,
  enabled: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<TrainingPlanSavePayload>({
  programId: '',
  planCode: '',
  planName: '',
  schoolYear: '',
  gradeLevel: '',
  versionNo: '',
  durationYears: 4,
  accreditationProfileId: '',
  storageFileId: '',
  enabled: true,
  remark: '',
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await trainingPlanApi.page({
      ...query,
      programId: query.programId?.trim() || undefined,
      schoolYear: query.schoolYear?.trim() || undefined,
      gradeLevel: query.gradeLevel?.trim() || undefined,
      confirmationStatus: query.confirmationStatus || undefined,
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
  Object.assign(query, { programId: '', schoolYear: '', gradeLevel: '', confirmationStatus: undefined, enabled: undefined, keyword: '' })
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, { id: undefined, programId: '', planCode: '', planName: '', schoolYear: '', gradeLevel: '', versionNo: '', durationYears: 4, accreditationProfileId: '', storageFileId: '', enabled: true, remark: '' })
  editorVisible.value = true
}

function openEdit(record: TrainingPlanVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.programId.trim() || !editor.planCode.trim() || !editor.planName.trim() || !editor.schoolYear.trim()) {
    message.error('请填写专业 / 编码 / 名称 / 学年')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') {
      await trainingPlanApi.create(editor)
      message.success('已创建培养方案')
    }
    else {
      await trainingPlanApi.update(editor)
      message.success('已更新培养方案')
    }
    editorVisible.value = false
    await loadList()
    await qualityStore.loadTrainingPlanOptions()
  }
  finally {
    submitting.value = false
  }
}

async function handleDelete(record: TrainingPlanVO) {
  Modal.confirm({
    title: `删除培养方案 ${record.planCode}？`,
    okType: 'danger',
    onOk: async () => {
      await trainingPlanApi.delete(record.id)
      message.success('已删除')
      await loadList()
      await qualityStore.loadTrainingPlanOptions()
    },
  })
}

async function handleConfirm(record: TrainingPlanVO) {
  Modal.confirm({
    title: `确认培养方案 ${record.planCode}？`,
    content: '确认后该培养方案可以参与达成度计算',
    onOk: async () => {
      await trainingPlanApi.confirm(record.id)
      message.success('已确认')
      await loadList()
    },
  })
}

async function selectAsCurrent(record: TrainingPlanVO) {
  qualityStore.setCurrent({ trainingPlanId: record.id })
  message.success(`已切换工作上下文为 ${record.planCode}`)
}

onMounted(loadList)
</script>

<template>
  <div class="page">
    <a-card title="培养方案" :bordered="false">
      <template #extra>
        <a-space>
          <a-input v-model:value="query.programId" placeholder="专业 ID" style="width: 120px" />
          <a-input v-model:value="query.schoolYear" placeholder="学年" style="width: 110px" />
          <a-input v-model:value="query.gradeLevel" placeholder="年级" style="width: 100px" />
          <a-input v-model:value="query.keyword" placeholder="关键字" style="width: 160px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
          <a-button type="primary" @click="openCreate">
            新建
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
        <a-table-column title="编码" data-index="planCode" width="160" />
        <a-table-column title="名称" data-index="planName" />
        <a-table-column title="专业 ID" data-index="programId" width="100" />
        <a-table-column title="学年" data-index="schoolYear" width="110" />
        <a-table-column title="年级" data-index="gradeLevel" width="100" />
        <a-table-column title="版本" data-index="versionNo" width="100" />
        <a-table-column title="学制" data-index="durationYears" width="80">
          <template #default="{ text }">
            {{ text ? `${text} 年` : '-' }}
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="enabled" width="80">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="确认状态" data-index="confirmationStatus" width="120">
          <template #default="{ text }">
            <a-tag :color="text === 'CONFIRMED' ? 'green' : 'orange'">
              {{ text || '未确认' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="220" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="selectAsCurrent(record)">
                设为当前
              </a-button>
              <a-button type="link" size="small" @click="openEdit(record)">
                编辑
              </a-button>
              <a-button v-if="record.confirmationStatus !== 'CONFIRMED'" type="link" size="small" @click="handleConfirm(record)">
                确认
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
      :title="editorMode === 'create' ? '新建培养方案' : '编辑培养方案'"
      :confirm-loading="submitting"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="专业 ID" required>
              <a-input v-model:value="editor.programId" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学年" required>
              <a-input v-model:value="editor.schoolYear" placeholder="例：2024-2025" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="培养方案编码" required>
          <a-input v-model:value="editor.planCode" />
        </a-form-item>
        <a-form-item label="培养方案名称" required>
          <a-input v-model:value="editor.planName" />
        </a-form-item>
        <a-form-item label="年级">
          <a-input v-model:value="editor.gradeLevel" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="editor.description" :rows="2" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="认证口径 ID">
              <a-input v-model:value="editor.accreditationProfileId" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="原文存储文件 ID">
              <a-input v-model:value="editor.storageFileId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="是否启用">
          <a-switch v-model:checked="editor.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>
