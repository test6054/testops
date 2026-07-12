<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioCorrectionRequestStatusCode } from '@/apis/portfolio/enums'
import { PortfolioCorrectionRequestStatusDescription } from '@/apis/portfolio/enums'
import type {
  PortfolioCorrectionDetailVO,
  PortfolioCorrectionSummaryVO,
  PortfolioTargetFieldDefinition,
  PortfolioTeacherOneTableCategoryVO,
} from '@/apis/portfolio/types'
import { PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE } from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioCorrectionApi } from '@/apis/portfolio/correction'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'
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
  form.categoryId = typeof route.query.categoryId === 'string' ? route.query.categoryId : ''
  form.archiveRecordId =
    typeof route.query.archiveRecordId === 'string' ? route.query.archiveRecordId : ''
  form.fieldCode = typeof route.query.fieldCode === 'string' ? route.query.fieldCode : ''
  form.fieldLabel = typeof route.query.fieldLabel === 'string' ? route.query.fieldLabel : ''
  form.wrongValue = typeof route.query.wrongValue === 'string' ? route.query.wrongValue : ''
  form.expectedValue = ''
  form.reason = ''
  form.evidenceRef = ''
}

async function loadPublishedFields(categoryId: string) {
  const currentToken = ++fieldRequestToken.value
  if (!categoryId) {
    publishedFields.value = []
    return
  }
  try {
    const published = await portfolioArchiveTemplateApi.listPublishedFields({ categoryId })
    if (currentToken !== fieldRequestToken.value || form.categoryId !== categoryId) {
      return
    }
    publishedFields.value = published.targetFields
  } catch (error) {
    if (currentToken !== fieldRequestToken.value || form.categoryId !== categoryId) {
      return
    }
    publishedFields.value = []
    showUserError(error, '加载字段规格失败')
  }
}

async function loadCategories() {
  const currentToken = ++categoryRequestToken.value
  if (canPickTeachers.value && !targetTeacherId.value) {
    categories.value = []
    publishedFields.value = []
    return
  }
  try {
    const vo = await portfolioArchiveApi.getOneTable(teacherRequest.value)
    if (currentToken !== categoryRequestToken.value) {
      return
    }
    categories.value = vo.categories
    applyRoutePrefill()
    const matchedCategory = form.categoryId
      ? categories.value.find((item) => item.categoryId === form.categoryId)
      : null
    if (matchedCategory) {
      form.archiveRecordId = matchedCategory.officialRecordId ?? ''
      await loadPublishedFields(form.categoryId)
      return
    }
    form.categoryId = ''
    form.archiveRecordId = ''
    publishedFields.value = []
  } catch (error) {
    if (currentToken !== categoryRequestToken.value) {
      return
    }
    showUserError(error, '加载档案分类失败')
  }
}

async function loadCorrections() {
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
    if (currentToken !== correctionListRequestToken.value) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    if (currentToken !== correctionListRequestToken.value) {
      return
    }
    showUserError(error, '加载纠错列表失败')
  } finally {
    if (currentToken === correctionListRequestToken.value) {
      loading.value = false
    }
  }
}

async function openDetail(id: string) {
  const currentToken = ++detailRequestToken.value
  drawerOpen.value = true
  detail.value = null
  detailLoading.value = true
  try {
    const nextDetail = await portfolioCorrectionApi.getCorrection(id)
    if (currentToken !== detailRequestToken.value) {
      return
    }
    detail.value = nextDetail
  } catch (error) {
    if (currentToken !== detailRequestToken.value) {
      return
    }
    showUserError(error, '加载纠错详情失败')
  } finally {
    if (currentToken === detailRequestToken.value) {
      detailLoading.value = false
    }
  }
}

async function handleSubmit() {
  if (!form.categoryId || !form.fieldCode.trim() || !form.reason.trim()) {
    message.warning('请填写分类、字段与纠错原因')
    return
  }
  submitting.value = true
  try {
    await portfolioCorrectionApi.submit({
      ...teacherRequest.value,
      categoryId: form.categoryId,
      archiveRecordId: form.archiveRecordId || undefined,
      fieldCode: form.fieldCode.trim(),
      fieldLabel: form.fieldLabel.trim() || undefined,
      wrongValue: form.wrongValue.trim() || undefined,
      expectedValue: form.expectedValue.trim() || undefined,
      reason: form.reason.trim(),
      evidenceRef: form.evidenceRef.trim() || undefined,
    })
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
    showUserError(error, '提交纠错失败')
  } finally {
    submitting.value = false
  }
}

function handlePageChange(page: { current: number; pageSize: number }) {
  pageNum.value = page.current
  pageSize.value = page.pageSize
  void loadCorrections()
}

async function applyCategoryChange(categoryId: string) {
  const row = categories.value.find((item) => item.categoryId === categoryId)
  form.archiveRecordId = row?.officialRecordId ?? ''
  form.fieldCode = ''
  form.fieldLabel = ''
  await loadPublishedFields(categoryId)
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
    fieldRequestToken.value += 1
    correctionListRequestToken.value += 1
    pageNum.value = 1
    resetDetailContext()
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
      void loadPublishedFields(form.categoryId)
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
            @click="router.push({ path: '/portfolio/teacher/archive', query: archiveReturnQuery })"
          >
            返回档案
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <div v-if="canPickTeachers && !targetTeacherId" class="correction-page__hint">
      <UiEmpty description="请从教师名册选择目标教师" />
    </div>

    <template v-else>
      <UiCard title="发起纠错" class="correction-page__form">
        <a-form layout="vertical">
          <a-form-item label="档案分类" required>
            <a-select
              v-model:value="form.categoryId"
              :options="categoryOptions"
              placeholder="选择分类"
              @change="onCategoryChange"
            />
          </a-form-item>
          <a-form-item label="纠错字段" required>
            <a-select
              v-model:value="form.fieldCode"
              :options="fieldOptions"
              placeholder="选择已发布模板字段"
              show-search
              option-filter-prop="label"
              @change="onFieldChange"
            />
          </a-form-item>
          <a-form-item label="当前错误值">
            <a-input v-model:value="form.wrongValue" />
          </a-form-item>
          <a-form-item label="期望正确值">
            <a-input v-model:value="form.expectedValue" />
          </a-form-item>
          <a-form-item label="纠错原因" required>
            <a-textarea v-model:value="form.reason" :rows="3" />
          </a-form-item>
          <a-form-item label="佐证引用">
            <a-input v-model:value="form.evidenceRef" />
          </a-form-item>
          <UiButton :loading="submitting" @click="handleSubmit"> 提交纠错 </UiButton>
        </a-form>
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
      <a-spin :spinning="detailLoading">
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
      </a-spin>
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
  padding: var(--dp-space-6) 0;
}
</style>
