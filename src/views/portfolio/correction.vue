<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioCorrectionRequestStatusCode } from '@/apis/portfolio/enums'
import type {
  PortfolioCorrectionDetailVO,
  PortfolioCorrectionSummaryVO,
  PortfolioTargetFieldDefinition,
  PortfolioTeacherOneTableCategoryVO,
} from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioCorrectionApi } from '@/apis/portfolio/correction'
import { PortfolioCorrectionRequestStatusDescription } from '@/apis/portfolio/enums'
import { PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE } from '@/apis/portfolio/types'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function resolveSelectStringValue(value: SelectValue): string {
  if (value == null || Array.isArray(value)) {
    return ''
  }
  return typeof value === 'object' ? String(value.value) : String(value)
}

function correctionRequestStatusLabel(status: PortfolioCorrectionRequestStatusCode): string {
  return strictEnumLabel(PortfolioCorrectionRequestStatusDescription, status, '纠错工单状态')
}

function correctionRequestStatusTone(status: PortfolioCorrectionRequestStatusCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE, status, '纠错工单状态')
}

const columns: ColumnsType = [
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120, fixed: 'left' },
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 120 },
  { title: '状态', key: 'requestStatus', width: 100 },
  { title: '原因', dataIndex: 'reason', key: 'reason' },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 72 },
]

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()

const loading = ref(false)
const submitting = ref(false)
const rows = ref<PortfolioCorrectionSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const categoryRequestToken = ref(0)
const fieldRequestToken = ref(0)
const correctionListRequestToken = ref(0)
const detailRequestToken = ref(0)
const scopeRequestToken = ref(0)
const formEpoch = ref(0)
const categories = ref<PortfolioTeacherOneTableCategoryVO[]>([])
const publishedFields = ref<PortfolioTargetFieldDefinition[]>([])
const drawerOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<PortfolioCorrectionDetailVO | null>(null)

const form = reactive({
  categoryId: '',
  archiveRecordId: '',
  fieldCode: '',
  fieldLabel: '',
  wrongValue: '',
  expectedValue: '',
  reason: '',
  evidenceRef: '',
})

const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

const categoryOptions = computed(() =>
  categories.value.map((item) => ({
    label: item.categoryName,
    value: item.categoryId,
  })),
)

const fieldOptions = computed(() =>
  publishedFields.value.map((item) => ({
    label: item.fieldLabel,
    value: item.fieldCode,
  })),
)

const archiveReturnQuery = computed(() => {
  const query: Record<string, string> = {}
  if (targetTeacherId.value) {
    query.teacherId = targetTeacherId.value
  }
  if (form.categoryId) {
    query.categoryId = form.categoryId
  }
  if (form.archiveRecordId) {
    query.recordId = form.archiveRecordId
  }
  return query
})

/** 教师或路由上下文切换后必须清空旧纠错详情，避免继续查看上一位教师或上一条工单。 */
function resetDetailContext() {
  detailRequestToken.value += 1
  drawerOpen.value = false
  detailLoading.value = false
  detail.value = null
}

/** 路由深链是纠错上下文真源；切换记录时必须清空旧表单，避免误提到上一条档案。 */
function applyRoutePrefill() {
  formEpoch.value += 1
  form.categoryId = typeof route.query.categoryId === 'string' ? route.query.categoryId : ''
  form.archiveRecordId
    = typeof route.query.archiveRecordId === 'string' ? route.query.archiveRecordId : ''
  form.fieldCode = typeof route.query.fieldCode === 'string' ? route.query.fieldCode : ''
  form.fieldLabel = typeof route.query.fieldLabel === 'string' ? route.query.fieldLabel : ''
  form.wrongValue = typeof route.query.wrongValue === 'string' ? route.query.wrongValue : ''
  form.expectedValue = ''
  form.reason = ''
  form.evidenceRef = ''
}

async function loadPublishedFields(categoryId: string, archiveRecordId?: string) {
  const currentScopeToken = scopeRequestToken.value
  const currentToken = ++fieldRequestToken.value
  if (!categoryId) {
    publishedFields.value = []
    return
  }
  try {
    const published = await portfolioArchiveTemplateApi.listPublishedFields({
      categoryId,
      archiveRecordId,
    })
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== fieldRequestToken.value
      || form.categoryId !== categoryId
    ) {
      return
    }
    publishedFields.value = published.targetFields
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== fieldRequestToken.value
      || form.categoryId !== categoryId
    ) {
      return
    }
    publishedFields.value = []
    showUserError(error, '加载字段规格失败')
  }
}

async function loadCategories() {
  const currentScopeToken = scopeRequestToken.value
  const currentToken = ++categoryRequestToken.value
  if (canPickTeachers.value && !targetTeacherId.value) {
    categories.value = []
    publishedFields.value = []
    return
  }
  try {
    const vo = await portfolioArchiveApi.getOneTable(teacherRequest.value)
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== categoryRequestToken.value
    ) {
      return
    }
    categories.value = vo.categories
    applyRoutePrefill()
    const matchedCategory = form.categoryId
      ? categories.value.find((item) => item.categoryId === form.categoryId)
      : null
    if (matchedCategory) {
      if (!form.archiveRecordId) {
        form.archiveRecordId = matchedCategory.officialRecordId ?? ''
      }
      await loadPublishedFields(form.categoryId, form.archiveRecordId || undefined)
      return
    }
    form.categoryId = ''
    form.archiveRecordId = ''
    publishedFields.value = []
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== categoryRequestToken.value
    ) {
      return
    }
    categories.value = []
    publishedFields.value = []
    showUserError(error, '加载档案分类失败')
  }
}

async function loadCorrections() {
  const currentScopeToken = scopeRequestToken.value
  const currentToken = ++correctionListRequestToken.value
  if (canPickTeachers.value && !targetTeacherId.value) {
    rows.value = []
    pageTotal.value = 0
    return
  }
  loading.value = true
  try {
    const page = await portfolioCorrectionApi.pageCorrections({
      ...teacherRequest.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== correctionListRequestToken.value
    ) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== correctionListRequestToken.value
    ) {
      return
    }
    rows.value = []
    pageTotal.value = 0
    showUserError(error, '加载纠错列表失败')
  } finally {
    if (
      scopeRequestToken.value === currentScopeToken
      && currentToken === correctionListRequestToken.value
    ) {
      loading.value = false
    }
  }
}

async function openDetail(id: string) {
  const currentScopeToken = scopeRequestToken.value
  const currentToken = ++detailRequestToken.value
  drawerOpen.value = true
  detail.value = null
  detailLoading.value = true
  try {
    const nextDetail = await portfolioCorrectionApi.getCorrection(id)
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== detailRequestToken.value
    ) {
      return
    }
    detail.value = nextDetail
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken
      || currentToken !== detailRequestToken.value
    ) {
      return
    }
    showUserError(error, '加载纠错详情失败')
  } finally {
    if (
      scopeRequestToken.value === currentScopeToken
      && currentToken === detailRequestToken.value
    ) {
      detailLoading.value = false
    }
  }
}

async function handleSubmit() {
  if (submitting.value || (canPickTeachers.value && !targetTeacherId.value)) {
    return
  }
  if (!(await confirmProxyWrite('提交纠错申请'))) {
    return
  }

  if (
    !form.categoryId
    || !form.fieldCode.trim()
    || !form.expectedValue.trim()
    || !form.reason.trim()
  ) {
    showFormValidationMessage('请填写分类、字段、期望正确值与纠错原因')
    return
  }
  const currentScopeToken = scopeRequestToken.value
  const currentFormEpoch = formEpoch.value
  const request = {
    ...teacherRequest.value,
    categoryId: form.categoryId,
    archiveRecordId: form.archiveRecordId || undefined,
    fieldCode: form.fieldCode.trim(),
    fieldLabel: form.fieldLabel.trim() || undefined,
    wrongValue: form.wrongValue.trim() || undefined,
    expectedValue: form.expectedValue.trim(),
    reason: form.reason.trim(),
    evidenceRef: form.evidenceRef.trim() || undefined,
  }
  submitting.value = true
  try {
    await portfolioCorrectionApi.submit(request)
    if (scopeRequestToken.value !== currentScopeToken || formEpoch.value !== currentFormEpoch) {
      return
    }
    message.success('纠错申请已提交')
    form.fieldCode = ''
    form.fieldLabel = ''
    form.wrongValue = ''
    form.expectedValue = ''
    form.reason = ''
    form.evidenceRef = ''
    pageNum.value = 1
    await loadCorrections()
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken || formEpoch.value !== currentFormEpoch) {
      return
    }
    showUserError(error, '提交纠错失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
      submitting.value = false
    }
  }
}

function handlePageChange(page: { current: number, pageSize: number }) {
  pageNum.value = page.current
  pageSize.value = page.pageSize
  void loadCorrections()
}

async function applyCategoryChange(categoryId: string) {
  const row = categories.value.find((item) => item.categoryId === categoryId)
  form.archiveRecordId = row?.officialRecordId ?? ''
  form.fieldCode = ''
  form.fieldLabel = ''
  await loadPublishedFields(categoryId, form.archiveRecordId || undefined)
}

function onCategoryChange(value: SelectValue): void {
  void applyCategoryChange(resolveSelectStringValue(value))
}

function onFieldChange(value: SelectValue): void {
  const fieldCode = resolveSelectStringValue(value)
  const field = publishedFields.value.find((item) => item.fieldCode === fieldCode)
  form.fieldLabel = field?.fieldLabel ?? ''
}

function openCorrectionDetail(row: PortfolioCorrectionSummaryVO): void {
  void openDetail(row.id)
}

usePortfolioScopedLoader(
  () => {
    scopeRequestToken.value += 1
    categoryRequestToken.value += 1
    fieldRequestToken.value += 1
    correctionListRequestToken.value += 1
    loading.value = false
    submitting.value = false
    categories.value = []
    publishedFields.value = []
    rows.value = []
    pageTotal.value = 0
    applyRoutePrefill()
    pageNum.value = 1
    resetDetailContext()
    if (canPickTeachers.value && !targetTeacherId.value) {
      return
    }
    void loadCategories()
    void loadCorrections()
  },
  () => targetTeacherId.value,
)

watch(
  () => route.query,
  () => {
    fieldRequestToken.value += 1
    applyRoutePrefill()
    if (form.categoryId) {
      void loadPublishedFields(form.categoryId, form.archiveRecordId || undefined)
      return
    }
    publishedFields.value = []
  },
  { deep: true },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="我的纠错">
        <template #actions>
          <UiButton
            size="sm"
            @click="router.push({ path: '/portfolio/teacher/archive', query: archiveReturnQuery })"
          >
            返回档案
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <template v-else>
      <UiCard title="发起纠错" class="correction-page__form">
        <UiForm layout="vertical">
          <UiFormItem label="档案分类" required>
            <UiSelect
              size="sm"
              v-model="form.categoryId"
              :options="categoryOptions"
              placeholder="选择分类"
              :disabled="submitting"
              @change="onCategoryChange"
            />
          </UiFormItem>
          <UiFormItem label="纠错字段" required>
            <UiSelect
              size="sm"
              v-model="form.fieldCode"
              :options="fieldOptions"
              placeholder="选择已发布模板字段"
              allow-search
              option-filter-prop="label"
              :disabled="submitting"
              @change="onFieldChange"
            />
          </UiFormItem>
          <UiFormItem label="当前错误值">
            <UiInput
              size="sm" v-model="form.wrongValue" :disabled="submitting"
            />
          </UiFormItem>
          <UiFormItem label="期望正确值" required>
            <UiInput
              size="sm" v-model="form.expectedValue" :disabled="submitting"
            />
          </UiFormItem>
          <UiFormItem label="纠错原因" required>
            <UiTextarea size="sm" v-model="form.reason" :rows="3" :disabled="submitting" />
          </UiFormItem>
          <UiFormItem label="佐证引用">
            <UiInput
              size="sm" v-model="form.evidenceRef" :disabled="submitting"
            />
          </UiFormItem>
          <UiButton size="sm" variant="primary" :loading="submitting" @click="handleSubmit"> 提交纠错 </UiButton>
        </UiForm>
      </UiCard>

      <UiCard title="纠错记录" class="correction-page__list">
        <UiDataTable
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          pagination-mode="server"
          row-key="id"
          size="small"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :total="pageTotal"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'requestStatus'">
              <UiTag :tone="correctionRequestStatusTone(record.requestStatus)">
                {{ correctionRequestStatusLabel(record.requestStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'detail', label: '详情' }]"
                split
                @action="() => openCorrectionDetail(record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>

    <UiDrawer v-model:open="drawerOpen" title="纠错详情" width="560" @close="resetDetailContext">
      <UiSpin :spinning="detailLoading">
        <template v-if="detail">
          <p class="correction-page__detail-line">
            {{ detail.categoryName }} · {{ detail.fieldLabel ?? detail.fieldCode }}
          </p>
          <p class="correction-page__detail-line">
            状态
            <UiTag :tone="correctionRequestStatusTone(detail.requestStatus)">
              {{ correctionRequestStatusLabel(detail.requestStatus) }}
            </UiTag>
          </p>
          <p v-if="detail.wrongValue" class="correction-page__detail-line">
            错误值：{{ detail.wrongValue }}
          </p>
          <p v-if="detail.expectedValue" class="correction-page__detail-line">
            期望值：{{ detail.expectedValue }}
          </p>
          <p class="correction-page__detail-line">原因：{{ detail.reason }}</p>
          <p v-if="detail.handleOpinion" class="correction-page__detail-line">
            处理意见：{{ detail.handleOpinion }}
          </p>
        </template>
      </UiSpin>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.correction-page__form,
.correction-page__list {
  margin-bottom: var(--dp-space-4);
}

.correction-page__detail-line {
  margin: 0 0 var(--dp-space-2);
  font-size: 14px;
}

.correction-page__hint {
  padding: var(--dp-space-3, 12px) 0;
}
</style>
