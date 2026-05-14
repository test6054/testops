<script setup lang="ts">
/**
 * 专业算法实例
 *
 * 后端：/api/quality/profession-algorithm-profiles
 * 状态流转：DRAFT → CONFIRMED ⇄ REVOKED；只有 CONFIRMED + enabled 的实例进入达成度计算。
 */
import type {
  AccreditationStandardVO,
  ConfirmationStatus,
  ProfessionAlgorithmProfileQueryPayload,
  ProfessionAlgorithmProfileSavePayload,
  ProfessionAlgorithmProfileVO,
  ProfessionAlgorithmTemplateVO,
} from '@/apis/quality'
import type { MajorVO } from '@/apis/quality/user-catalog'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
  CONFIRMATION_STATUS_COLOR,
  CONFIRMATION_STATUS_LABEL,
  professionAlgorithmProfileApi,
  professionAlgorithmTemplateApi,
} from '@/apis/quality'
import { majorCatalogApi } from '@/apis/quality/user-catalog'
import { promptModal } from './_helpers'

const list = ref<ProfessionAlgorithmProfileVO[]>([])
const total = ref(0)
const loading = ref(false)
const templates = ref<ProfessionAlgorithmTemplateVO[]>([])
const standards = ref<AccreditationStandardVO[]>([])
const programs = ref<MajorVO[]>([])

const query = reactive<ProfessionAlgorithmProfileQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  accreditationType: undefined,
  confirmationStatus: undefined,
  enabled: undefined,
  keyword: '',
})

const accreditationOptions = Object.entries(ACCREDITATION_TYPE_LABEL).map(([value, label]) => ({ value, label }))
const aggregationOptions = [
  { value: 'WEIGHTED_SUM', label: '加权平均' },
  { value: 'MINIMUM', label: '取最小值' },
  { value: 'WEIGHTED_MINIMUM_MIXED', label: '加权与最小值混合' },
  { value: 'DIRECT_INDIRECT_WEIGHTED', label: '直接间接加权' },
]
const statusOptions: ConfirmationStatus[] = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'RETURNED']

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ProfessionAlgorithmProfileSavePayload>({
  profileCode: '',
  profileName: '',
  templateId: '',
  programId: '',
  accreditationType: 'ENGINEERING_ACCREDITATION',
  standardId: undefined,
  accreditationLevel: '',
  standardYear: '',
  courseGoalAggregation: 'WEIGHTED_SUM',
  indicatorAggregation: 'WEIGHTED_SUM',
  requirementAggregation: 'WEIGHTED_SUM',
  directWeight: 0.7,
  indirectWeight: 0.3,
  indirectMinValidSampleCount: 30,
  indirectCoverageThreshold: 0.5,
  courseGoalThreshold: 0.7,
  indicatorThreshold: 0.7,
  requirementThreshold: 0.7,
  inheritedFields: '',
  overriddenFields: '',
  overrideReason: '',
  enabled: true,
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await professionAlgorithmProfileApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  } finally {
    loading.value = false
  }
}

async function loadDicts() {
  const [tpl, std, majors] = await Promise.all([
    professionAlgorithmTemplateApi.page({ pageNum: 1, pageSize: 500, enabled: true }),
    accreditationStandardApi.page({ pageNum: 1, pageSize: 500, enabled: true }),
    majorCatalogApi.listAll(),
  ])
  templates.value = tpl.list || []
  standards.value = std.list || []
  programs.value = majors || []
}

function applyTemplateDefaults(templateId: string) {
  const tpl = templates.value.find(t => t.id === templateId)
  if (!tpl) return
  editor.accreditationType = tpl.accreditationType
  editor.standardId = tpl.standardId
  editor.standardYear = tpl.standardYear || ''
  editor.courseGoalAggregation = tpl.courseGoalAggregation || 'WEIGHTED_SUM'
  editor.indicatorAggregation = tpl.indicatorAggregation || 'WEIGHTED_SUM'
  editor.requirementAggregation = tpl.requirementAggregation || 'WEIGHTED_SUM'
  editor.directWeight = tpl.directWeightDefault ?? 0.7
  editor.indirectWeight = tpl.indirectWeightDefault ?? 0.3
  editor.indirectMinValidSampleCount = tpl.indirectMinValidSampleCount ?? 30
  editor.indirectCoverageThreshold = tpl.indirectCoverageThreshold ?? 0.5
  editor.courseGoalThreshold = tpl.courseGoalThresholdDefault ?? 0.7
  editor.indicatorThreshold = tpl.indicatorThresholdDefault ?? 0.7
  editor.requirementThreshold = tpl.requirementThresholdDefault ?? 0.7
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    profileCode: '',
    profileName: '',
    templateId: '',
    programId: '',
    accreditationType: 'ENGINEERING_ACCREDITATION',
    standardId: undefined,
    accreditationLevel: '',
    standardYear: '',
    courseGoalAggregation: 'WEIGHTED_SUM',
    indicatorAggregation: 'WEIGHTED_SUM',
    requirementAggregation: 'WEIGHTED_SUM',
    directWeight: 0.7,
    indirectWeight: 0.3,
    indirectMinValidSampleCount: 30,
    indirectCoverageThreshold: 0.5,
    courseGoalThreshold: 0.7,
    indicatorThreshold: 0.7,
    requirementThreshold: 0.7,
    inheritedFields: '',
    overriddenFields: '',
    overrideReason: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ProfessionAlgorithmProfileVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.profileCode.trim() || !editor.profileName.trim() || !editor.templateId || !editor.programId) {
    message.error('请填写编码、名称、模板、专业')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await professionAlgorithmProfileApi.create(editor)
    else await professionAlgorithmProfileApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleConfirm(record: ProfessionAlgorithmProfileVO) {
  Modal.confirm({
    title: `确认实例 ${record.profileCode}？`,
    content: '确认后实例将进入「已确认」状态，可被达成度计算引用。',
    onOk: async () => {
      await professionAlgorithmProfileApi.confirm(record.id)
      message.success('已确认')
      await loadList()
    },
  })
}

async function handleRevoke(record: ProfessionAlgorithmProfileVO) {
  const reason = await promptModal({
    title: `撤销实例 ${record.profileCode}`,
    placeholder: '请填写撤销原因（必填）',
    required: true,
    okType: 'danger',
    emptyErrorMessage: '撤销原因不能为空',
  })
  if (!reason) return
  await professionAlgorithmProfileApi.revoke(record.id, reason)
  message.success('已撤销')
  await loadList()
}

async function handleDelete(record: ProfessionAlgorithmProfileVO) {
  Modal.confirm({
    title: `删除实例 ${record.profileCode}？`,
    okType: 'danger',
    onOk: async () => {
      await professionAlgorithmProfileApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

function handlePageChange(p: number, ps: number) {
  query.pageNum = p
  query.pageSize = ps
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.programId = undefined
  query.accreditationType = undefined
  query.confirmationStatus = undefined
  query.enabled = undefined
  query.keyword = ''
  loadList()
}

onMounted(async () => {
  await Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <div class="page">
    <a-card title="专业算法实例" :bordered="false">
      <template #extra>
        <a-space wrap>
          <a-select v-model:value="query.programId" placeholder="专业" allow-clear style="width: 200px" show-search option-filter-prop="label">
            <a-select-option v-for="p in programs" :key="p.id" :value="p.id" :label="p.majorName">
              {{ p.majorName }}
            </a-select-option>
          </a-select>
          <a-select v-model:value="query.accreditationType" placeholder="认证类型" allow-clear style="width: 180px" :options="accreditationOptions" />
          <a-select v-model:value="query.confirmationStatus" placeholder="状态" allow-clear style="width: 120px">
            <a-select-option v-for="s in statusOptions" :key="s" :value="s">
              {{ CONFIRMATION_STATUS_LABEL[s] }}
            </a-select-option>
          </a-select>
          <a-input v-model:value="query.keyword" placeholder="编码/名称" style="width: 180px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">查询</a-button>
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="openCreate">新建实例</a-button>
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
        <a-table-column title="编码" data-index="profileCode" width="140" />
        <a-table-column title="名称" data-index="profileName" />
        <a-table-column title="专业" data-index="programId" width="160">
          <template #default="{ text }">
            {{ programs.find(p => p.id === text)?.majorName || text }}
          </template>
        </a-table-column>
        <a-table-column title="认证类型" data-index="accreditationType" width="180">
          <template #default="{ text }">
            {{ ACCREDITATION_TYPE_LABEL[text as keyof typeof ACCREDITATION_TYPE_LABEL] || text }}
          </template>
        </a-table-column>
        <a-table-column title="级别" data-index="accreditationLevel" width="100" />
        <a-table-column title="状态" data-index="confirmationStatus" width="100">
          <template #default="{ text }">
            <a-tag :color="CONFIRMATION_STATUS_COLOR[text as ConfirmationStatus]">
              {{ CONFIRMATION_STATUS_LABEL[text as ConfirmationStatus] || text }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="启用" data-index="enabled" width="80">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="240" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button
                v-if="record.confirmationStatus === 'DRAFT'"
                type="link"
                size="small"
                @click="handleConfirm(record)"
              >
                确认
              </a-button>
              <a-button
                v-if="record.confirmationStatus === 'CONFIRMED'"
                type="link"
                size="small"
                @click="handleRevoke(record)"
              >
                撤销
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建专业算法实例' : '编辑专业算法实例'"
      :confirm-loading="submitting"
      width="900px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.profileCode" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="名称" required>
              <a-input v-model:value="editor.profileName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="算法模板" required>
              <a-select
                v-model:value="editor.templateId"
                placeholder="选择模板会自动继承默认值"
                show-search
                option-filter-prop="label"
                @change="(v: string) => applyTemplateDefaults(v)"
              >
                <a-select-option
                  v-for="t in templates"
                  :key="t.id"
                  :value="t.id"
                  :label="`${t.templateCode} · ${t.templateName}`"
                >
                  {{ t.templateCode }} · {{ t.templateName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="专业" required>
              <a-select
                v-model:value="editor.programId"
                placeholder="选择本租户专业"
                show-search
                option-filter-prop="label"
              >
                <a-select-option v-for="p in programs" :key="p.id" :value="p.id" :label="p.majorName">
                  {{ p.majorName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="认证类型" required>
              <a-select v-model:value="editor.accreditationType" :options="accreditationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="认证级别">
              <a-input v-model:value="editor.accreditationLevel" placeholder="如 LEVEL_2 / LEVEL_3" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="标准年份">
              <a-input v-model:value="editor.standardYear" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="关联认证标准">
          <a-select v-model:value="editor.standardId" allow-clear show-search option-filter-prop="label">
            <a-select-option
              v-for="s in standards"
              :key="s.id"
              :value="s.id"
              :label="`${s.standardCode} · ${s.standardName}`"
            >
              {{ s.standardCode }} · {{ s.standardName }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-divider orientation="left">聚合策略</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="课程目标">
              <a-select v-model:value="editor.courseGoalAggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="观测点">
              <a-select v-model:value="editor.indicatorAggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="毕业要求">
              <a-select v-model:value="editor.requirementAggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">权重 / 样本 / 阈值</a-divider>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="直接评价权重" required>
              <a-input-number v-model:value="editor.directWeight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接评价权重" required>
              <a-input-number v-model:value="editor.indirectWeight" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接最低样本">
              <a-input-number v-model:value="editor.indirectMinValidSampleCount" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接覆盖率阈值">
              <a-input-number v-model:value="editor.indirectCoverageThreshold" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="课程目标阈值">
              <a-input-number v-model:value="editor.courseGoalThreshold" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="观测点阈值">
              <a-input-number v-model:value="editor.indicatorThreshold" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="毕业要求阈值">
              <a-input-number v-model:value="editor.requirementThreshold" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="继承字段（备注）">
          <a-textarea v-model:value="editor.inheritedFields" :rows="2" />
        </a-form-item>
        <a-form-item label="覆盖字段（备注）">
          <a-textarea v-model:value="editor.overriddenFields" :rows="2" />
        </a-form-item>
        <a-form-item label="覆盖原因">
          <a-textarea v-model:value="editor.overrideReason" :rows="2" />
        </a-form-item>

        <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
</style>
