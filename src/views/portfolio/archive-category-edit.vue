<script setup lang="ts">
import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioArchiveRecordStatus,
  PortfolioTargetFieldDefinition,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import {
  PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL,
  PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const categoryName = ref('')
const recordId = ref<string>()
const recordStatus = ref<PortfolioArchiveRecordStatus>()
const latestRejectReason = ref<string>()
const fieldDefs = ref<PortfolioTargetFieldDefinition[]>([])
const fieldValues = reactive<Record<string, string>>({})
const evidenceRefs = reactive<Record<string, string>>({})

const categoryId = computed(() => route.params.categoryId as string)
const queryRecordId = computed(() =>
  typeof route.query.recordId === 'string' ? route.query.recordId : '',
)
const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

const editableFields = computed(() => fieldDefs.value.filter((item) => !item.readonly))

const statusHint = computed(() => {
  if (recordStatus.value === 'RETURNED') {
    return latestRejectReason.value
      ? `审核退回：${latestRejectReason.value}`
      : '审核退回，请修改后重新提交'
  }
  if (recordStatus.value === 'DRAFT') {
    return '草稿待提交'
  }
  return ''
})

async function applyRecordDetail(id: string) {
  recordId.value = id
  const detail = await portfolioArchiveApi.getRecord(id)
  recordStatus.value = detail.recordStatus
  latestRejectReason.value = detail.latestRejectReason
  for (const field of detail.fields) {
    fieldValues[field.fieldCode] = field.fieldValue ?? ''
    evidenceRefs[field.fieldCode] = field.evidenceRef ?? ''
  }
}

function resetFormState() {
  recordId.value = undefined
  for (const key of Object.keys(fieldValues)) {
    delete fieldValues[key]
  }
  for (const key of Object.keys(evidenceRefs)) {
    delete evidenceRefs[key]
  }
}

async function loadPage() {
  if (!categoryId.value || (canPickTeachers.value && !targetTeacherId.value)) {
    return
  }
  loading.value = true
  recordStatus.value = undefined
  latestRejectReason.value = undefined
  resetFormState()
  try {
    const published = await portfolioArchiveTemplateApi.listPublishedFields({
      categoryId: categoryId.value,
    })
    categoryName.value = published.templateCode
    fieldDefs.value = published.targetFields
    const oneTable = await portfolioArchiveApi.getOneTable(teacherRequest.value)
    const categoryRow = oneTable.categories.find((item) => item.categoryId === categoryId.value)
    if (categoryRow?.categoryName) {
      categoryName.value = categoryRow.categoryName
    }
    for (const field of published.targetFields) {
      fieldValues[field.fieldCode] = ''
      evidenceRefs[field.fieldCode] = ''
    }
    if (queryRecordId.value) {
      await applyRecordDetail(queryRecordId.value)
      return
    }
    const draftPage = await portfolioArchiveApi.pageRecords({
      ...teacherRequest.value,
      categoryId: categoryId.value,
      recordStatus: 'DRAFT',
      pageNum: 1,
      pageSize: 1,
    })
    const draft = readPageList(draftPage, '加载草稿记录失败')[0]
    if (draft) {
      await applyRecordDetail(draft.id)
      return
    }
    const returnedPage = await portfolioArchiveApi.pageRecords({
      ...teacherRequest.value,
      categoryId: categoryId.value,
      recordStatus: 'RETURNED',
      pageNum: 1,
      pageSize: 1,
    })
    const returned = readPageList(returnedPage, '加载退回记录失败')[0]
    if (returned) {
      await applyRecordDetail(returned.id)
    }
  } catch (error) {
    showUserError(error, '加载分类填报页失败')
  } finally {
    loading.value = false
  }
}

function buildFieldInputs(): PortfolioArchiveRecordFieldInput[] {
  return editableFields.value.map((field) => ({
    fieldCode: field.fieldCode,
    fieldValue: fieldValues[field.fieldCode] ?? '',
    evidenceRef: evidenceRefs[field.fieldCode] || undefined,
  }))
}

async function handleSaveDraft() {
  saving.value = true
  try {
    const result = await portfolioArchiveApi.saveDraft({
      ...teacherRequest.value,
      recordId: recordId.value,
      categoryId: categoryId.value,
      fields: buildFieldInputs(),
    })
    recordId.value = result.recordId
    recordStatus.value = result.recordStatus
    message.success('草稿已保存')
  } catch (error) {
    showUserError(error, '保存草稿失败')
  } finally {
    saving.value = false
  }
}

async function handleSubmit() {
  submitting.value = true
  try {
    const result = await portfolioArchiveApi.submitRecord({
      ...teacherRequest.value,
      recordId: recordId.value,
      categoryId: categoryId.value,
      fields: buildFieldInputs(),
    })
    recordId.value = result.recordId
    recordStatus.value = result.recordStatus
    message.success('已提交审核')
    void router.push({
      path: '/portfolio/teacher/archive',
      query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
    })
  } catch (error) {
    showUserError(error, '提交审核失败')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  void router.push({
    path: '/portfolio/teacher/archive',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

usePortfolioScopedLoader(
  () => {
    void loadPage()
  },
  () => `${targetTeacherId.value}:${categoryId.value}:${queryRecordId.value}`,
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        layout="workbench"
        :title="categoryName ? `${categoryName} · 分类填报` : '分类填报'"
      >
        <template #actions>
          <UiButton @click="goBack"> 返回档案 </UiButton>
          <UiButton :loading="saving" :disabled="loading" @click="handleSaveDraft">
            保存草稿
          </UiButton>
          <UiButton :loading="submitting" :disabled="loading" @click="handleSubmit">
            提交审核
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <div v-if="canPickTeachers && !targetTeacherId" class="archive-category-edit__hint">
      <UiEmpty description="请从教师名册选择目标教师" />
    </div>

    <a-spin v-else :spinning="loading">
      <p v-if="recordStatus" class="archive-category-edit__status">
        <UiTag
          :tone="strictEnumTone(PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE, recordStatus, '档案记录状态')"
        >
          {{ strictEnumLabel(PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL, recordStatus, '档案记录状态') }}
        </UiTag>
        <span v-if="statusHint" class="archive-category-edit__status-hint">{{ statusHint }}</span>
      </p>
      <UiCard v-if="editableFields.length" title="可编辑字段">
        <a-form layout="vertical">
          <a-form-item
            v-for="field in editableFields"
            :key="field.fieldCode"
            :label="field.fieldLabel"
            :required="field.required"
          >
            <a-input
              v-model:value="fieldValues[field.fieldCode]"
              :placeholder="field.required ? '必填' : '选填'"
            />
            <a-input
              v-model:value="evidenceRefs[field.fieldCode]"
              class="archive-category-edit__evidence"
              placeholder="证据引用（可选）"
            />
          </a-form-item>
        </a-form>
      </UiCard>
      <UiEmpty v-else description="该分类暂无可手工编辑字段" />
    </a-spin>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.archive-category-edit__status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin: 0 0 var(--dp-space-4, 16px);
}

.archive-category-edit__status-hint {
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.archive-category-edit__evidence {
  margin-top: var(--dp-space-2, 8px);
}

.archive-category-edit__hint {
  padding: var(--dp-space-6, 24px) 0;
}
</style>
