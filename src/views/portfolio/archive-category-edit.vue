<script setup lang="ts">
import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioTargetFieldDefinition,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import {
  PortfolioArchiveRecordStatusCode,
  PortfolioArchiveRecordStatusDescription,
} from '@/apis/portfolio/enums'
import { PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE } from '@/apis/portfolio/types'
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
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const categoryName = ref('')
const recordId = ref<string>()
const recordStatus = ref<PortfolioArchiveRecordStatusCode>()
const latestRejectReason = ref<string>()
const latestReturnDeadline = ref<string>()
const fieldDefs = ref<PortfolioTargetFieldDefinition[]>([])
const fieldValues = reactive<Record<string, string>>({})
const evidenceRefs = reactive<Record<string, string>>({})
const scopeRequestToken = ref(0)

const categoryId = computed(() => {
  const rawCategoryId = route.params.categoryId
  return typeof rawCategoryId === 'string' ? rawCategoryId : ''
})
const queryRecordId = computed(() =>
  typeof route.query.recordId === 'string' ? route.query.recordId : '',
)
const fromPage = computed(() =>
  typeof route.query.fromPage === 'string' ? route.query.fromPage : '',
)
const routeAcademicYear = computed(() =>
  typeof route.query.academicYear === 'string' ? route.query.academicYear.trim() : '',
)
const routeCourseCode = computed(() =>
  typeof route.query.courseCode === 'string' ? route.query.courseCode.trim() : '',
)
const routeSemester = computed(() =>
  typeof route.query.semester === 'string' ? route.query.semester.trim() : '',
)
const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

const editableFields = computed(() => fieldDefs.value.filter((item) => !item.readonly))
const recordEditable = computed(
  () =>
    !recordStatus.value
    || recordStatus.value === PortfolioArchiveRecordStatusCode.DRAFT
    || recordStatus.value === PortfolioArchiveRecordStatusCode.RETURNED,
)

const statusHint = computed(() => {
  if (recordStatus.value === PortfolioArchiveRecordStatusCode.RETURNED) {
    const reason = latestRejectReason.value
      ? `审核退回：${latestRejectReason.value}`
      : '审核退回，请修改后重新提交'
    return latestReturnDeadline.value
      ? `${reason}；重提期限：${latestReturnDeadline.value}`
      : reason
  }
  if (recordStatus.value === PortfolioArchiveRecordStatusCode.DRAFT) {
    return '草稿待提交'
  }
  if (recordStatus.value === PortfolioArchiveRecordStatusCode.PENDING_REVIEW) {
    return '审核处理中，档案内容已锁定'
  }
  if (recordStatus.value === PortfolioArchiveRecordStatusCode.OFFICIAL) {
    return '审核通过，正式档案不可直接修改'
  }
  return ''
})

async function applyRecordDetail(id: string) {
  recordId.value = id
  const detail = await portfolioArchiveApi.getRecord(id)
  recordStatus.value = detail.recordStatus
  latestRejectReason.value = detail.latestRejectReason
  latestReturnDeadline.value = detail.latestReturnDeadline
  for (const field of detail.fields) {
    fieldValues[field.fieldCode] = field.fieldValue ?? ''
    evidenceRefs[field.fieldCode] = field.evidenceRef ?? ''
  }
}

function resetFormState() {
  scopeRequestToken.value += 1
  recordId.value = undefined
  categoryName.value = ''
  recordStatus.value = undefined
  latestRejectReason.value = undefined
  latestReturnDeadline.value = undefined
  fieldDefs.value = []
  for (const key of Object.keys(fieldValues)) {
    delete fieldValues[key]
  }
  for (const key of Object.keys(evidenceRefs)) {
    delete evidenceRefs[key]
  }
}

function routeSemesterValue(): string {
  if (!routeSemester.value) {
    return ''
  }
  const matched = SemesterOptions.find((item) => item.value === routeSemester.value)
  return matched?.value ?? ''
}

function mergeCourseArchiveRouteDefaults() {
  const defaults = new Map<string, string>()
  if (routeAcademicYear.value) {
    defaults.set('academicYear', routeAcademicYear.value)
  }
  if (routeCourseCode.value) {
    defaults.set('courseCode', routeCourseCode.value)
  }
  const semesterValue = routeSemesterValue()
  if (semesterValue) {
    defaults.set('semester', semesterValue)
  }
  if (!defaults.size) {
    return
  }
  for (const [fieldCode, fieldValue] of defaults) {
    if (!(fieldCode in fieldValues)) {
      continue
    }
    if (fieldValues[fieldCode]?.trim()) {
      continue
    }
    fieldValues[fieldCode] = fieldValue
  }
}

function buildReturnQuery(): Record<string, string> {
  const query: Record<string, string> = {}
  if (targetTeacherId.value) {
    query.teacherId = targetTeacherId.value
  }
  if (fromPage.value === 'courseArchive') {
    if (routeAcademicYear.value) {
      query.academicYear = routeAcademicYear.value
    }
    if (routeCourseCode.value) {
      query.courseCode = routeCourseCode.value
    }
    if (routeSemester.value) {
      query.semester = routeSemester.value
    }
  }
  return query
}

function returnToArchiveSource() {
  const path
    = fromPage.value === 'courseArchive'
      ? '/portfolio/teacher/course-archive'
      : fromPage.value === 'trainingExtension'
        ? '/portfolio/teacher/extension-activity'
        : '/portfolio/teacher/archive'
  void router.push({
    path,
    query: buildReturnQuery(),
  })
}

async function loadPage() {
  const requestToken = scopeRequestToken.value + 1
  scopeRequestToken.value = requestToken
  if (!categoryId.value || (canPickTeachers.value && !targetTeacherId.value)) {
    resetFormState()
    return
  }
  loading.value = true
  resetFormState()
  try {
    const published = await portfolioArchiveTemplateApi.listPublishedFields({
      categoryId: categoryId.value,
    })
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    categoryName.value = published.templateCode
    fieldDefs.value = published.targetFields
    const oneTable = await portfolioArchiveApi.getOneTable(teacherRequest.value)
    if (scopeRequestToken.value !== requestToken) {
      return
    }
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
      if (scopeRequestToken.value !== requestToken) {
        return
      }
      mergeCourseArchiveRouteDefaults()
      return
    }
    const draftPage = await portfolioArchiveApi.pageRecords({
      ...teacherRequest.value,
      categoryId: categoryId.value,
      recordStatus: PortfolioArchiveRecordStatusCode.DRAFT,
      pageNum: 1,
      pageSize: 1,
    })
    const draft = draftPage.list[0]
    if (draft) {
      await applyRecordDetail(draft.id)
      if (scopeRequestToken.value !== requestToken) {
        return
      }
      mergeCourseArchiveRouteDefaults()
      return
    }
    const returnedPage = await portfolioArchiveApi.pageRecords({
      ...teacherRequest.value,
      categoryId: categoryId.value,
      recordStatus: PortfolioArchiveRecordStatusCode.RETURNED,
      pageNum: 1,
      pageSize: 1,
    })
    const returned = returnedPage.list[0]
    if (returned) {
      await applyRecordDetail(returned.id)
      if (scopeRequestToken.value !== requestToken) {
        return
      }
      mergeCourseArchiveRouteDefaults()
      return
    }
    mergeCourseArchiveRouteDefaults()
  } catch (error) {
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载分类填报页失败')
  } finally {
    if (scopeRequestToken.value === requestToken) {
      loading.value = false
    }
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
  const requestToken = scopeRequestToken.value
  saving.value = true
  try {
    const result = await portfolioArchiveApi.saveDraft({
      ...teacherRequest.value,
      recordId: recordId.value,
      categoryId: categoryId.value,
      fields: buildFieldInputs(),
    })
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    recordId.value = result.recordId
    recordStatus.value = result.recordStatus
    message.success('草稿已保存')
  } catch (error) {
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '保存草稿失败')
  } finally {
    if (scopeRequestToken.value === requestToken) {
      saving.value = false
    }
  }
}

async function handleSubmit() {
  const requestToken = scopeRequestToken.value
  submitting.value = true
  try {
    const result = await portfolioArchiveApi.submitRecord({
      ...teacherRequest.value,
      recordId: recordId.value,
      categoryId: categoryId.value,
      fields: buildFieldInputs(),
    })
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    recordId.value = result.recordId
    recordStatus.value = result.recordStatus
    message.success('已提交审核')
    returnToArchiveSource()
  } catch (error) {
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '提交审核失败')
  } finally {
    if (scopeRequestToken.value === requestToken) {
      submitting.value = false
    }
  }
}

function goBack() {
  returnToArchiveSource()
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
          <UiButton
            :loading="saving"
            :disabled="loading || !recordEditable"
            @click="handleSaveDraft"
          >
            保存草稿
          </UiButton>
          <UiButton
            :loading="submitting"
            :disabled="loading || !recordEditable"
            @click="handleSubmit"
          >
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
          {{
            strictEnumLabel(PortfolioArchiveRecordStatusDescription, recordStatus, '档案记录状态')
          }}
        </UiTag>
        <span v-if="statusHint" class="archive-category-edit__status-hint">{{ statusHint }}</span>
      </p>
      <UiCard v-if="editableFields.length" title="档案字段">
        <a-form layout="vertical">
          <a-form-item
            v-for="field in editableFields"
            :key="field.fieldCode"
            :label="field.fieldLabel"
            :required="field.required"
          >
            <a-input
              v-model:value="fieldValues[field.fieldCode]"
              :disabled="!recordEditable"
              :placeholder="field.required ? '必填' : '选填'"
            />
            <a-input
              v-model:value="evidenceRefs[field.fieldCode]"
              :disabled="!recordEditable"
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
  gap: var(--dp-space-2);
  margin: 0 0 var(--dp-space-4);
}

.archive-category-edit__status-hint {
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.archive-category-edit__evidence {
  margin-top: var(--dp-space-2);
}

.archive-category-edit__hint {
  padding: var(--dp-space-6) 0;
}
</style>
