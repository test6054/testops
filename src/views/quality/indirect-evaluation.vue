<script setup lang="ts">
/**
 * 间接评价管理 - 问卷 + 题项 + 答卷
 *
 * 后端：
 * - /api/quality/indirect-forms       问卷 CRUD
 * - /api/quality/indirect-items       题项 CRUD
 * - /api/quality/indirect-responses   答卷 CRUD + 批量
 *
 * 设计：先选问卷 → 显示题项 → 选题项查看答卷
 */
import type {
  AchievementTargetType,
  IndirectEvaluationFormQueryPayload,
  IndirectEvaluationFormSavePayload,
  IndirectEvaluationFormVO,
  IndirectEvaluationItemSavePayload,
  IndirectEvaluationItemVO,
  IndirectEvaluationResponseSavePayload,
  IndirectEvaluationResponseVO,
  RespondentType,
  ScaleConversionRuleVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import {
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  indirectFormApi,
  indirectItemApi,
  indirectResponseApi,
  RESPONDENT_TYPE_LABEL,
  scaleConversionRuleApi,
} from '@/apis/quality'

const formTypeOptions = [
  { value: 'STUDENT_SELF', label: '学生自评' },
  { value: 'PEER_EVALUATION', label: '同伴互评' },
  { value: 'TEACHER_EVALUATION', label: '教师评价' },
  { value: 'EMPLOYER_FEEDBACK', label: '用人单位反馈' },
  { value: 'GRADUATE_TRACING', label: '毕业生跟踪' },
  { value: 'EXPERT_REVIEW', label: '专家评审' },
  { value: 'INTERNSHIP_SUPERVISOR', label: '实习导师' },
]

const targetTypeOptions = Object.entries(ACHIEVEMENT_TARGET_TYPE_LABEL).map(([value, label]) => ({ value, label }))
const respondentTypeOptions = Object.entries(RESPONDENT_TYPE_LABEL).map(([value, label]) => ({ value, label }))

/* ========== 问卷分页 ========== */

const forms = ref<IndirectEvaluationFormVO[]>([])
const formsTotal = ref(0)
const formsLoading = ref(false)
const formQuery = reactive<IndirectEvaluationFormQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  formType: undefined,
  targetType: undefined,
  enabled: undefined,
})
const selectedForm = ref<IndirectEvaluationFormVO | null>(null)

async function loadForms() {
  formsLoading.value = true
  try {
    const page = await indirectFormApi.page({ ...formQuery })
    forms.value = page.list || []
    formsTotal.value = page.total
  } finally {
    formsLoading.value = false
  }
}

const formEditorVisible = ref(false)
const formEditorMode = ref<'create' | 'edit'>('create')
const formEditor = reactive<IndirectEvaluationFormSavePayload>({
  formCode: '',
  formName: '',
  formType: 'STUDENT_SELF',
  targetType: 'COURSE_GOAL',
  targetId: '',
  programId: '',
  description: '',
  expectedSample: 30,
  enabled: true,
})

function openFormCreate() {
  formEditorMode.value = 'create'
  Object.assign(formEditor, {
    id: undefined,
    formCode: '',
    formName: '',
    formType: 'STUDENT_SELF',
    targetType: 'COURSE_GOAL',
    targetId: '',
    programId: '',
    description: '',
    expectedSample: 30,
    enabled: true,
  })
  formEditorVisible.value = true
}

function openFormEdit(record: IndirectEvaluationFormVO) {
  formEditorMode.value = 'edit'
  Object.assign(formEditor, record)
  formEditorVisible.value = true
}

async function submitForm() {
  if (!formEditor.formCode.trim() || !formEditor.formName.trim() || !formEditor.targetId.trim()) {
    message.error('请填写编码、名称、目标 ID')
    return
  }
  if (formEditorMode.value === 'create') await indirectFormApi.create(formEditor)
  else await indirectFormApi.update(formEditor)
  message.success('已保存')
  formEditorVisible.value = false
  await loadForms()
}

async function handleFormDelete(record: IndirectEvaluationFormVO) {
  Modal.confirm({
    title: `删除问卷 ${record.formCode}？`,
    okType: 'danger',
    onOk: async () => {
      await indirectFormApi.delete(record.id)
      message.success('已删除')
      if (selectedForm.value?.id === record.id) selectedForm.value = null
      await loadForms()
    },
  })
}

function handleFormPageChange(p: number, ps: number) {
  formQuery.pageNum = p
  formQuery.pageSize = ps
  loadForms()
}

/* ========== 题项 ========== */

const items = ref<IndirectEvaluationItemVO[]>([])
const itemsLoading = ref(false)
const selectedItem = ref<IndirectEvaluationItemVO | null>(null)
const scaleRules = ref<ScaleConversionRuleVO[]>([])

async function loadItems() {
  if (!selectedForm.value) {
    items.value = []
    return
  }
  itemsLoading.value = true
  try {
    items.value = await indirectItemApi.listByForm(selectedForm.value.id) || []
  } finally {
    itemsLoading.value = false
  }
}

async function loadScaleRules() {
  const page = await scaleConversionRuleApi.page({ pageNum: 1, pageSize: 200, enabled: true })
  scaleRules.value = page.list || []
}

const itemEditorVisible = ref(false)
const itemEditorMode = ref<'create' | 'edit'>('create')
const itemEditor = ref<IndirectEvaluationItemSavePayload>({
  formId: '',
  itemCode: '',
  itemText: '',
  targetType: 'COURSE_GOAL',
  targetId: '',
  scaleRuleId: undefined,
  weight: 1,
  sortOrder: 0,
})

function openItemCreate() {
  if (!selectedForm.value) return
  itemEditorMode.value = 'create'
  itemEditor.value = {
    formId: selectedForm.value.id,
    itemCode: '',
    itemText: '',
    targetType: selectedForm.value.targetType,
    targetId: selectedForm.value.targetId,
    scaleRuleId: undefined,
    weight: 1,
    sortOrder: (items.value.length + 1) * 10,
  }
  itemEditorVisible.value = true
}

function openItemEdit(record: IndirectEvaluationItemVO) {
  itemEditorMode.value = 'edit'
  itemEditor.value = { ...record }
  itemEditorVisible.value = true
}

async function submitItem() {
  const v = itemEditor.value
  if (!v.itemCode.trim() || !v.itemText.trim()) {
    message.error('请填写编码和题面')
    return
  }
  if (itemEditorMode.value === 'create') await indirectItemApi.create(v)
  else await indirectItemApi.update(v)
  message.success('已保存')
  itemEditorVisible.value = false
  await loadItems()
}

async function deleteItem(record: IndirectEvaluationItemVO) {
  Modal.confirm({
    title: `删除题项 ${record.itemCode}？`,
    okType: 'danger',
    onOk: async () => {
      await indirectItemApi.delete(record.id)
      message.success('已删除')
      if (selectedItem.value?.id === record.id) selectedItem.value = null
      await loadItems()
    },
  })
}

/* ========== 答卷 ========== */

const responses = ref<IndirectEvaluationResponseVO[]>([])
const responsesLoading = ref(false)

async function loadResponses() {
  if (!selectedItem.value) {
    responses.value = []
    return
  }
  responsesLoading.value = true
  try {
    responses.value = await indirectResponseApi.listByItem(selectedItem.value.id) || []
  } finally {
    responsesLoading.value = false
  }
}

const responseEditorVisible = ref(false)
const responseEditorMode = ref<'create' | 'edit'>('create')
const responseEditor = ref<IndirectEvaluationResponseSavePayload>({
  formId: '',
  itemId: '',
  respondentType: 'STUDENT',
  respondentId: '',
  rawValue: '',
  convertedScore: undefined,
  openText: '',
  validFlag: true,
  invalidReason: '',
})

function openResponseCreate() {
  if (!selectedItem.value || !selectedForm.value) return
  responseEditorMode.value = 'create'
  responseEditor.value = {
    formId: selectedForm.value.id,
    itemId: selectedItem.value.id,
    respondentType: 'STUDENT',
    respondentId: '',
    rawValue: '',
    convertedScore: undefined,
    openText: '',
    validFlag: true,
    invalidReason: '',
  }
  responseEditorVisible.value = true
}

function openResponseEdit(record: IndirectEvaluationResponseVO) {
  responseEditorMode.value = 'edit'
  responseEditor.value = { ...record }
  responseEditorVisible.value = true
}

async function submitResponse() {
  const v = responseEditor.value
  if (!v.respondentType) {
    message.error('请选择应答人类型')
    return
  }
  if (responseEditorMode.value === 'create')
    await indirectResponseApi.create(v)
  else
    await indirectResponseApi.update(v)
  message.success('已保存')
  responseEditorVisible.value = false
  await loadResponses()
}

async function deleteResponse(record: IndirectEvaluationResponseVO) {
  Modal.confirm({
    title: '删除该答卷？',
    okType: 'danger',
    onOk: async () => {
      await indirectResponseApi.delete(record.id)
      message.success('已删除')
      await loadResponses()
    },
  })
}

/* ========== 按问卷批量录入答卷 ========== */

const batchResponseVisible = ref(false)
const batchResponseSubmitting = ref(false)
const batchResponseText = ref('')
const BATCH_RESPONSE_PLACEHOLDER = `[
  {
    "itemId": "1",
    "respondentType": "STUDENT",
    "respondentId": "1001",
    "rawValue": "4",
    "convertedScore": 0.75,
    "validFlag": true
  },
  {
    "itemId": "2",
    "respondentType": "STUDENT",
    "respondentId": "1001",
    "rawValue": "5",
    "convertedScore": 1.0
  }
]`

function openBatchResponse() {
  if (!selectedForm.value) return
  batchResponseText.value = ''
  batchResponseVisible.value = true
}

async function submitBatchResponse() {
  if (!selectedForm.value) return
  const text = batchResponseText.value.trim()
  if (!text) {
    message.error('请粘贴答卷 JSON 数组')
    return
  }
  let parsed: IndirectEvaluationResponseSavePayload[]
  try {
    const raw = JSON.parse(text)
    if (!Array.isArray(raw))
      throw new Error('根节点必须是数组')
    parsed = raw.map((item, idx) => {
      if (!item.itemId)
        throw new Error(`第 ${idx + 1} 行缺少 itemId`)
      if (!item.respondentType)
        throw new Error(`第 ${idx + 1} 行缺少 respondentType`)
      return {
        formId: selectedForm.value!.id,
        ...item,
      } as IndirectEvaluationResponseSavePayload
    })
  }
  catch (err) {
    message.error(`JSON 解析失败：${(err as Error).message}`)
    return
  }
  batchResponseSubmitting.value = true
  try {
    await indirectResponseApi.batchCreate(selectedForm.value.id, parsed)
    message.success(`已批量录入 ${parsed.length} 条答卷`)
    batchResponseVisible.value = false
    await loadResponses()
  }
  finally {
    batchResponseSubmitting.value = false
  }
}

/* ========== 题项有效样本统计 ========== */

const validCountMap = ref<Map<string, number>>(new Map())
const validCountLoading = ref(false)

async function refreshValidCounts() {
  if (!items.value.length)
    return
  validCountLoading.value = true
  try {
    const results = await Promise.all(
      items.value.map(item =>
        indirectResponseApi.countValidByItem(item.id)
          .then(count => [item.id, count] as const)
          .catch(() => [item.id, 0] as const),
      ),
    )
    validCountMap.value = new Map(results)
  }
  finally {
    validCountLoading.value = false
  }
}

/* ========== 联动 ========== */

watch(selectedForm, async () => {
  selectedItem.value = null
  responses.value = []
  await loadItems()
})

watch(selectedItem, () => loadResponses())

onMounted(async () => {
  await Promise.all([loadForms(), loadScaleRules()])
})
</script>

<template>
  <div class="page">
    <a-card title="间接评价问卷" :bordered="false" style="margin-bottom: 12px">
      <template #extra>
        <a-space wrap>
          <a-select v-model:value="formQuery.formType" placeholder="问卷类型" allow-clear style="width: 160px" :options="formTypeOptions" />
          <a-select v-model:value="formQuery.targetType" placeholder="目标类型" allow-clear style="width: 180px" :options="targetTypeOptions" />
          <a-button type="primary" @click="loadForms">查询</a-button>
          <a-button type="primary" @click="openFormCreate">新建问卷</a-button>
        </a-space>
      </template>

      <a-table
        :data-source="forms"
        :loading="formsLoading"
        row-key="id"
        size="middle"
        :pagination="{
          current: formQuery.pageNum,
          pageSize: formQuery.pageSize,
          total: formsTotal,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handleFormPageChange,
        }"
        :row-class-name="(r: IndirectEvaluationFormVO) => (selectedForm?.id === r.id ? 'row-selected' : '')"
        :custom-row="(record: IndirectEvaluationFormVO) => ({
          onClick: () => (selectedForm = record),
          style: 'cursor: pointer',
        })"
      >
        <a-table-column title="编码" data-index="formCode" width="120" />
        <a-table-column title="名称" data-index="formName" />
        <a-table-column title="问卷类型" data-index="formType" width="140">
          <template #default="{ text }">
            {{ formTypeOptions.find(o => o.value === text)?.label || text }}
          </template>
        </a-table-column>
        <a-table-column title="目标" data-index="targetType" width="160">
          <template #default="{ record }">
            {{ ACHIEVEMENT_TARGET_TYPE_LABEL[record.targetType as AchievementTargetType] }}
            <span class="text-gray-500 text-xs">({{ record.targetId }})</span>
          </template>
        </a-table-column>
        <a-table-column title="期望样本" data-index="expectedSample" width="100" />
        <a-table-column title="操作" width="160" fixed="right">
          <template #default="{ record }">
            <a-space>
              <a-button type="link" size="small" @click.stop="openFormEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click.stop="handleFormDelete(record)">删除</a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-row v-if="selectedForm" :gutter="12">
      <a-col :span="12">
        <a-card title="题项" :bordered="false">
          <template #extra>
            <a-button type="primary" size="small" @click="openItemCreate">新建题项</a-button>
          </template>

          <a-table
            :data-source="items"
            :loading="itemsLoading"
            row-key="id"
            size="middle"
            :pagination="false"
            :row-class-name="(r: IndirectEvaluationItemVO) => (selectedItem?.id === r.id ? 'row-selected' : '')"
            :custom-row="(record: IndirectEvaluationItemVO) => ({
              onClick: () => (selectedItem = record),
              style: 'cursor: pointer',
            })"
          >
            <a-table-column title="编码" data-index="itemCode" width="100" />
            <a-table-column title="题面" data-index="itemText" />
            <a-table-column title="权重" data-index="weight" width="70">
              <template #default="{ text }">
                {{ text == null ? '-' : Number(text).toFixed(2) }}
              </template>
            </a-table-column>
            <a-table-column title="操作" width="120" fixed="right">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click.stop="openItemEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" danger @click.stop="deleteItem(record)">删除</a-button>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-empty v-if="!selectedItem" description="请在左侧选择题项查看答卷" />

        <a-card v-else :bordered="false">
          <template #title>
            <span>「{{ selectedItem.itemCode }} · {{ selectedItem.itemText.substring(0, 24) }}…」答卷</span>
          </template>
          <template #extra>
            <a-button type="primary" size="small" @click="openResponseCreate">新增答卷</a-button>
          </template>

          <a-table
            :data-source="responses"
            :loading="responsesLoading"
            row-key="id"
            size="middle"
            :pagination="{ pageSize: 10 }"
          >
            <a-table-column title="应答人" data-index="respondentType" width="100">
              <template #default="{ text }">
                {{ RESPONDENT_TYPE_LABEL[text as RespondentType] }}
              </template>
            </a-table-column>
            <a-table-column title="原始值" data-index="rawValue" width="80" />
            <a-table-column title="换算分" data-index="convertedScore" width="80">
              <template #default="{ text }">
                {{ text == null ? '-' : Number(text).toFixed(2) }}
              </template>
            </a-table-column>
            <a-table-column title="开放回答" data-index="openText">
              <template #default="{ text }">
                <span class="text-xs">{{ text || '-' }}</span>
              </template>
            </a-table-column>
            <a-table-column title="有效" data-index="validFlag" width="70">
              <template #default="{ text }">
                <a-tag :color="text ? 'green' : 'red'">{{ text ? '有效' : '无效' }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="操作" width="140" fixed="right">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click="openResponseEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" danger @click="deleteResponse(record)">删除</a-button>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 问卷编辑 -->
    <a-modal
      v-model:open="formEditorVisible"
      :title="formEditorMode === 'create' ? '新建问卷' : '编辑问卷'"
      width="720px"
      @ok="submitForm"
    >
      <a-form layout="vertical" :model="formEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="formEditor.formCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="问卷类型" required>
              <a-select v-model:value="formEditor.formType" :options="formTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="期望样本">
              <a-input-number v-model:value="formEditor.expectedSample" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="formEditor.formName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="目标类型" required>
              <a-select v-model:value="formEditor.targetType" :options="targetTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="目标 ID" required>
              <a-input v-model:value="formEditor.targetId" placeholder="对应业务对象的 ID" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="所属专业 ID">
              <a-input v-model:value="formEditor.programId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="说明">
          <a-textarea v-model:value="formEditor.description" :rows="3" />
        </a-form-item>
        <a-checkbox v-model:checked="formEditor.enabled">启用</a-checkbox>
      </a-form>
    </a-modal>

    <!-- 题项编辑 -->
    <a-modal
      v-model:open="itemEditorVisible"
      :title="itemEditorMode === 'create' ? '新建题项' : '编辑题项'"
      width="640px"
      @ok="submitItem"
    >
      <a-form layout="vertical" :model="itemEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="itemEditor.itemCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="权重">
              <a-input-number v-model:value="itemEditor.weight" :min="0" :step="0.1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number v-model:value="itemEditor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="题面" required>
          <a-textarea v-model:value="itemEditor.itemText" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="目标类型" required>
              <a-select v-model:value="itemEditor.targetType" :options="targetTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="目标 ID" required>
              <a-input v-model:value="itemEditor.targetId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="量表换算规则">
          <a-select v-model:value="itemEditor.scaleRuleId" allow-clear show-search option-filter-prop="label">
            <a-select-option
              v-for="r in scaleRules"
              :key="r.id"
              :value="r.id"
              :label="`${r.ruleCode} · ${r.ruleName}`"
            >
              {{ r.ruleCode }} · {{ r.ruleName }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 答卷新增 / 编辑 -->
    <a-modal
      v-model:open="responseEditorVisible"
      :title="responseEditorMode === 'create' ? '新增答卷' : '编辑答卷'"
      @ok="submitResponse"
    >
      <a-form layout="vertical" :model="responseEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="应答人类型" required>
              <a-select v-model:value="responseEditor.respondentType" :options="respondentTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="应答人 ID">
              <a-input v-model:value="responseEditor.respondentId" placeholder="可选" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="原始值">
              <a-input v-model:value="responseEditor.rawValue" placeholder="如 4" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="换算分（0~1）">
              <a-input-number v-model:value="responseEditor.convertedScore" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="开放回答">
          <a-textarea v-model:value="responseEditor.openText" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="有效">
              <a-switch v-model:checked="responseEditor.validFlag" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="无效原因">
              <a-input v-model:value="responseEditor.invalidReason" :disabled="responseEditor.validFlag" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 批量录入答卷 -->
    <a-modal
      v-model:open="batchResponseVisible"
      :title="`批量录入答卷（${selectedForm?.formName || ''}）`"
      :confirm-loading="batchResponseSubmitting"
      width="780px"
      ok-text="提交批量录入"
      @ok="submitBatchResponse"
    >
      <a-alert
        type="info"
        show-icon
        message="粘贴 JSON 数组，每条为一个答卷"
        description="必填：itemId、respondentType；可选：respondentId、rawValue、convertedScore、openText、validFlag、invalidReason。formId 由页面自动填入。"
        style="margin-bottom: 12px"
      />
      <a-textarea
        v-model:value="batchResponseText"
        :rows="14"
        :placeholder="BATCH_RESPONSE_PLACEHOLDER"
        :style="{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }"
      />
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
:deep(.row-selected) td { background-color: var(--ant-color-primary-bg) !important; }
.text-xs { font-size: 12px; }
.text-gray-500 { color: rgba(0, 0, 0, 0.45); }
</style>
