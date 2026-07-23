<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AccreditationCycleVO,
  AnnualReportMaterialSaveRequest,
  AnnualReportMaterialVO,
} from '@/apis/quality/accreditation'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  accreditationApi,
  ALL_ANNUAL_REPORT_MATERIAL_STATUS_CODES,
  ANNUAL_REPORT_MATERIAL_CATEGORY_OPTIONS,
  ANNUAL_REPORT_MATERIAL_STATUS_TONE,
  AnnualReportMaterialCategoryCode,
  AnnualReportMaterialCategoryDescription,
  AnnualReportMaterialStatusCode,
  AnnualReportMaterialStatusDescription,
} from '@/apis/quality/accreditation'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import { CourseSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import {
  annualReportMaterialPhaseHint,
  canMutateAnnualReportMaterial,
} from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  activeCycle?: AccreditationCycleVO
  activeCycleId?: string
}>()

const emit = defineEmits<{ refresh: [] }>()

const MATERIAL_STATUS_OPTIONS: { label: string, value: AnnualReportMaterialStatusCode }[]
  = ALL_ANNUAL_REPORT_MATERIAL_STATUS_CODES.map((value) => ({
    value,
    label: strictEnumLabel(AnnualReportMaterialStatusDescription, value, '年报材料状态'),
  }))

const COURSE_EVALUATION_MATERIAL = AnnualReportMaterialCategoryCode.COURSE_QUALITY_EVALUATION

const columns: ColumnsType<AnnualReportMaterialVO> = [
  { title: '年度', dataIndex: 'reportYear', key: 'reportYear', width: 88, fixed: 'left' },
  { title: '材料名称', dataIndex: 'materialName', key: 'materialName' },
  { title: '类别', dataIndex: 'materialCategory', key: 'materialCategory', width: 160 },
  { title: '关联课程', dataIndex: 'qualityCourseId', key: 'qualityCourseId', width: 150 },
  { title: '文件', dataIndex: 'storageFileId', key: 'storageFileId', width: 96 },
  { title: '状态', dataIndex: 'reportStatus', key: 'reportStatus', width: 96 },
  { title: '提交时间', dataIndex: 'submittedTime', key: 'submittedTime', width: 170 },
  { title: '审核时间', dataIndex: 'reviewedTime', key: 'reviewedTime', width: 170 },
  { title: '操作', key: 'actions', width: 330 },
]

const loading = ref(false)
const saving = ref(false)
const reviewSaving = ref(false)
const materials = ref<AnnualReportMaterialVO[]>([])
const total = ref(0)
const materialDrawerOpen = ref(false)
const reviewDrawerOpen = ref(false)
const materialDrawerTitle = ref('年度报备材料')
const reviewDrawerTitle = ref('审核年度报备材料')

const query = reactive<{
  pageNum: number
  pageSize: number
  reportYear: string
  materialCategory: AnnualReportMaterialCategoryCode | undefined
  reportStatus: AnnualReportMaterialStatusCode | undefined
  keyword: string
}>({
  pageNum: 1,
  pageSize: 10,
  reportYear: '',
  materialCategory: undefined,
  reportStatus: undefined,
  keyword: '',
})

const form = reactive<AnnualReportMaterialSaveRequest>({
  accreditationCycleId: '',
  trainingPlanId: '',
  reportYear: '',
  materialCategory: AnnualReportMaterialCategoryCode.CONTINUOUS_IMPROVEMENT_REPORT,
  materialName: '',
  materialDescription: '',
  storageFileId: undefined,
})

const reviewForm = reactive<{
  id: string
  reviewStatus: AnnualReportMaterialStatusCode
  reviewComment: string
}>({
  id: '',
  reviewStatus: AnnualReportMaterialStatusCode.APPROVED,
  reviewComment: '',
})

const annualMaterialPhaseHint = computed(() => annualReportMaterialPhaseHint(props.activeCycle))

const canMutateMaterial = computed(() => canMutateAnnualReportMaterial(props.activeCycle))

function canEdit(record: AnnualReportMaterialVO) {
  return (
    canMutateMaterial.value
    && (record.reportStatus === AnnualReportMaterialStatusCode.DRAFT
      || record.reportStatus === AnnualReportMaterialStatusCode.REJECTED)
  )
}

function canSubmit(record: AnnualReportMaterialVO) {
  return (
    canMutateMaterial.value
    && (record.reportStatus === AnnualReportMaterialStatusCode.DRAFT
      || record.reportStatus === AnnualReportMaterialStatusCode.REJECTED)
  )
}

function canReview(record: AnnualReportMaterialVO) {
  return canMutateMaterial.value && record.reportStatus === AnnualReportMaterialStatusCode.SUBMITTED
}

function isCourseEvaluationMaterial(category?: AnnualReportMaterialCategoryCode) {
  return category === COURSE_EVALUATION_MATERIAL
}

function formatQualityCourse(record: AnnualReportMaterialVO) {
  if (!record.qualityCourseId) {
    return ''
  }
  if (!record.qualityCourseCode || !record.qualityCourseName) {
    return ''
  }
  return `${record.qualityCourseCode} ${record.qualityCourseName}`
}

async function loadMaterials() {
  if (!props.trainingPlanId) {
    materials.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const page = await accreditationApi.annualReportMaterialPage({
      accreditationCycleId: props.activeCycleId || undefined,
      trainingPlanId: props.trainingPlanId,
      reportYear: query.reportYear || undefined,
      materialCategory: query.materialCategory || undefined,
      reportStatus: query.reportStatus,
      keyword: query.keyword || undefined,
      pageNum: query.pageNum,
      pageSize: query.pageSize,
    })
    materials.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (materials.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadMaterials()
    }
  } catch (e) {
    showUserError(e, '年度报备材料加载失败')
  } finally {
    loading.value = false
  }
}

function resetForm(accreditationCycleId: string) {
  form.id = undefined
  form.accreditationCycleId = accreditationCycleId
  form.trainingPlanId = props.trainingPlanId
  form.reportYear = String(new Date().getFullYear())
  form.materialCategory = AnnualReportMaterialCategoryCode.CONTINUOUS_IMPROVEMENT_REPORT
  form.qualityCourseId = undefined
  form.materialName = ''
  form.materialDescription = ''
  form.storageFileId = undefined
}

function openCreate() {
  const accreditationCycleId = props.activeCycleId
  if (!accreditationCycleId) {
    void message.error('请先创建认证周期')
    return
  }
  if (!canMutateMaterial.value) {
    void message.error(annualMaterialPhaseHint.value || '当前不可新增年度报备材料')
    return
  }
  materialDrawerTitle.value = '新增年度报备材料'
  resetForm(accreditationCycleId)
  materialDrawerOpen.value = true
}

function openEdit(record: AnnualReportMaterialVO) {
  if (!canEdit(record)) {
    void message.error('仅草稿或退回材料可编辑')
    return
  }
  materialDrawerTitle.value = '编辑年度报备材料'
  form.id = record.id
  form.accreditationCycleId = record.accreditationCycleId
  form.trainingPlanId = record.trainingPlanId
  form.reportYear = record.reportYear
  form.materialCategory = record.materialCategory
  form.qualityCourseId = record.qualityCourseId
  form.materialName = record.materialName
  form.materialDescription = record.materialDescription || ''
  form.storageFileId = record.storageFileId
  materialDrawerOpen.value = true
}

const materialFileName = ref<string>()

watch(materialFileName, (name) => {
  if (name && !form.materialName) {
    form.materialName = name
  }
})

async function submitMaterial() {
  if (!props.activeCycleId && !form.id) {
    void message.error('请先创建认证周期')
    return
  }
  if (!canMutateMaterial.value) {
    void message.error(annualMaterialPhaseHint.value || '当前不可维护年度报备材料')
    return
  }
  if (!form.reportYear.trim() || !form.materialCategory || !form.materialName.trim()) {
    void message.error('请填写年度、类别与材料名称')
    return
  }
  if (isCourseEvaluationMaterial(form.materialCategory) && !form.qualityCourseId) {
    void message.error('课程评价与达成度材料必须关联质量评价课程')
    return
  }
  if (!isCourseEvaluationMaterial(form.materialCategory) && form.qualityCourseId) {
    void message.error('仅课程评价与达成度材料允许关联质量评价课程')
    return
  }
  if (!form.storageFileId) {
    void message.error('请先上传年度报备材料文件')
    return
  }
  saving.value = true
  try {
    const request: AnnualReportMaterialSaveRequest = {
      id: form.id,
      accreditationCycleId: form.accreditationCycleId,
      trainingPlanId: form.trainingPlanId,
      reportYear: form.reportYear.trim(),
      materialCategory: form.materialCategory,
      qualityCourseId: form.qualityCourseId || undefined,
      materialName: form.materialName.trim(),
      materialDescription: form.materialDescription?.trim() || undefined,
      storageFileId: form.storageFileId || undefined,
    }
    if (form.id) {
      await accreditationApi.annualReportMaterialUpdate(request)
      void message.success('年度报备材料已更新')
    } else {
      form.id = await accreditationApi.annualReportMaterialCreate(request)
      void message.success('年度报备材料已创建')
    }
    materialDrawerOpen.value = false
    await loadMaterials()
    emit('refresh')
  } catch (e) {
    showUserError(e, '年度报备材料保存失败')
  } finally {
    saving.value = false
  }
}

async function submitForReview(record: AnnualReportMaterialVO) {
  if (!canSubmit(record)) {
    void message.error('仅草稿或退回材料可提交')
    return
  }
  if (!record.storageFileId) {
    void message.error('请先上传年度报备材料文件')
    return
  }
  const ok = await confirmAsync({ title: '确认提交该年度报备材料进入审核？' })
  if (!ok) return
  try {
    await accreditationApi.annualReportMaterialSubmit(record.id)
    void message.success('年度报备材料已提交审核')
    await loadMaterials()
    emit('refresh')
  } catch (e) {
    showUserError(e, '年度报备材料提交失败')
  }
}

function openReview(record: AnnualReportMaterialVO, status: AnnualReportMaterialStatusCode) {
  if (!canReview(record)) {
    void message.error('仅已提交材料可审核')
    return
  }
  reviewDrawerTitle.value
    = status === AnnualReportMaterialStatusCode.APPROVED
      ? '审核通过年度报备材料'
      : '退回年度报备材料'
  reviewForm.id = record.id
  reviewForm.reviewStatus = status
  reviewForm.reviewComment = record.reviewComment || ''
  reviewDrawerOpen.value = true
}

async function submitReview() {
  if (!canMutateMaterial.value) {
    void message.error(annualMaterialPhaseHint.value || '当前不可审核年度报备材料')
    return
  }
  if (!reviewForm.id) {
    void message.error('年度报备材料审核对象缺失，请关闭后重新打开')
    return
  }
  if (
    reviewForm.reviewStatus === AnnualReportMaterialStatusCode.REJECTED
    && !reviewForm.reviewComment.trim()
  ) {
    void message.error('退回材料必须填写审核意见')
    return
  }
  reviewSaving.value = true
  try {
    await accreditationApi.annualReportMaterialReview({
      id: reviewForm.id,
      reviewStatus: reviewForm.reviewStatus,
      reviewComment: reviewForm.reviewComment.trim() || undefined,
    })
    void message.success(
      reviewForm.reviewStatus === AnnualReportMaterialStatusCode.APPROVED
        ? '材料已审核通过'
        : '材料已退回',
    )
    reviewDrawerOpen.value = false
    await loadMaterials()
    emit('refresh')
  } catch (e) {
    showUserError(e, '年度报备材料审核失败')
  } finally {
    reviewSaving.value = false
  }
}

async function removeMaterial(record: AnnualReportMaterialVO) {
  if (!canEdit(record)) {
    void message.error('仅草稿或退回材料可删除')
    return
  }
  const ok = await confirmAsync({ title: '确认删除该年度报备材料？' })
  if (!ok) return
  try {
    await accreditationApi.annualReportMaterialDelete(record.id)
    void message.success('年度报备材料已删除')
    await loadMaterials()
    emit('refresh')
  } catch (e) {
    showUserError(e, '年度报备材料删除失败')
  }
}

async function downloadMaterial(record: AnnualReportMaterialVO) {
  if (!record.storageFileId) {
    void message.error('年度报备材料文件缺失，无法下载')
    return
  }
  await handleDownloadFile({ fileId: record.storageFileId, fileName: record.materialName })
}

function handleMaterialRowAction(key: string, record: AnnualReportMaterialVO) {
  if (key === 'download') void downloadMaterial(record)
  else if (key === 'edit') openEdit(record)
  else if (key === 'submit') void submitForReview(record)
  else if (key === 'approve') openReview(record, AnnualReportMaterialStatusCode.APPROVED)
  else if (key === 'reject') openReview(record, AnnualReportMaterialStatusCode.REJECTED)
  else if (key === 'delete') void removeMaterial(record)
}

function searchMaterials() {
  query.pageNum = 1
  loadMaterials()
}

function resetFilters() {
  query.pageNum = 1
  query.reportYear = ''
  query.materialCategory = undefined
  query.reportStatus = undefined
  query.keyword = ''
  loadMaterials()
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  query.pageNum = pageEvent.current
  query.pageSize = pageEvent.pageSize
  loadMaterials()
}

watch(() => [props.trainingPlanId, props.activeCycleId], loadMaterials, { immediate: true })

watch(
  () => form.materialCategory,
  (category) => {
    if (!isCourseEvaluationMaterial(category)) {
      form.qualityCourseId = undefined
    }
  },
)

defineExpose({ loadMaterials, openCreate })
</script>

<template>
  <div class="annual-report-material-panel">
    <div class="material-toolbar">
      <UiInput
        size="sm"
        v-model="query.keyword"
        class="toolbar-input"
        clearable
        placeholder="搜索材料名称或说明"
        @press-enter="searchMaterials"
      />
      <UiInput
        size="sm"
        v-model="query.reportYear"
        class="year-input"
        clearable
        placeholder="年度"
        @press-enter="searchMaterials"
      />
      <UiSelect
        v-model="query.materialCategory"
        class="category-select"
        allow-clear
        placeholder="材料类别"
        size="sm"
        :options="ANNUAL_REPORT_MATERIAL_CATEGORY_OPTIONS"
      />
      <UiSelect
        v-model="query.reportStatus"
        class="status-select"
        allow-clear
        placeholder="状态"
        size="sm"
        :options="MATERIAL_STATUS_OPTIONS"
      />
      <UiButton size="sm" variant="outline" @click="searchMaterials">查询</UiButton>
      <UiButton size="sm" variant="ghost" @click="resetFilters">重置</UiButton>
      <UiButton size="sm" variant="primary" :disabled="!canMutateMaterial" @click="openCreate">
        新增材料
      </UiButton>
    </div>

    <UiDataTable
      v-model:current="query.pageNum"
      v-model:page-size="query.pageSize"
      :columns="columns"
      :data-source="materials"
      :loading="loading"
      :total="total"
      row-key="id"
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'qualityCourseId'">
          <span :class="{ muted: !record.qualityCourseId }">{{ formatQualityCourse(record) }}</span>
        </template>
        <template v-else-if="column.key === 'materialCategory'">
          {{
            strictEnumLabel(
              AnnualReportMaterialCategoryDescription,
              record.materialCategory,
              '年度报备材料类别',
            )
          }}
        </template>
        <template v-else-if="column.key === 'storageFileId'">
          <UiTag :tone="record.storageFileId ? 'green' : 'red'" size="sm">
            {{ record.storageFileId ? '已上传' : '缺少文件' }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'reportStatus'">
          <UiTag
            :tone="
              strictEnumTone(
                ANNUAL_REPORT_MATERIAL_STATUS_TONE,
                record.reportStatus,
                '年度报备材料状态',
              )
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                AnnualReportMaterialStatusDescription,
                record.reportStatus,
                '年度报备材料状态',
              )
            }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="[
              { key: 'download', label: '下载', disabled: !record.storageFileId },
              { key: 'edit', label: '编辑', hidden: !canEdit(record) },
              { key: 'submit', label: '提交', hidden: !canSubmit(record) },
              { key: 'approve', label: '通过', hidden: !canReview(record) },
              { key: 'reject', label: '退回', tone: 'danger', hidden: !canReview(record) },
              { key: 'delete', label: '删除', tone: 'danger', hidden: !canEdit(record) },
            ]"
            split
            @action="(key) => handleMaterialRowAction(key, record)"
          />
        </template>
      </template>
      <template #empty>
        <UiEmpty
          size="sm"
          description="暂无年度报备材料，请上传持续改进、达成度和支撑条件等原始材料"
        />
      </template>
    </UiDataTable>

    <UiDrawer
      v-model:open="materialDrawerOpen"
      :title="materialDrawerTitle"
      width="560"
      :hide-footer="false"
      :confirm-loading="saving"
      ok-text="保存"
      @ok="submitMaterial"
    >
      <UiForm layout="vertical">
        <UiFormItem label="年度" required>
          <UiInput
            size="sm"
            v-model="form.reportYear"
            placeholder="如 2025"
            :disabled="!!form.id"
          />
        </UiFormItem>
        <UiFormItem label="材料类别" required>
          <UiSelect
            v-model="form.materialCategory"
            :disabled="!!form.id"
            size="sm"
            :options="ANNUAL_REPORT_MATERIAL_CATEGORY_OPTIONS"
          />
        </UiFormItem>
        <UiFormItem
          label="关联课程"
          :required="isCourseEvaluationMaterial(form.materialCategory)"
          :extra="
            isCourseEvaluationMaterial(form.materialCategory)
              ? '用于证明认证周期内课程目标达成评价材料覆盖全部启用课程'
              : '仅课程评价与达成度材料需要关联课程'
          "
        >
          <CourseSelector
            v-model:value="form.qualityCourseId"
            :training-plan-id="trainingPlanId"
            :program-id="programId"
            :allow-clear="!isCourseEvaluationMaterial(form.materialCategory)"
            :disabled="!isCourseEvaluationMaterial(form.materialCategory) || !!form.id"
            :placeholder="
              isCourseEvaluationMaterial(form.materialCategory)
                ? '请选择本周期内启用的质量评价课程'
                : '当前材料类别无需关联课程'
            "
          />
        </UiFormItem>
        <UiFormItem label="材料名称" required>
          <UiInput size="sm" v-model="form.materialName" />
        </UiFormItem>
        <UiFormItem label="材料说明">
          <UiTextarea size="sm" v-model="form.materialDescription" :rows="3" />
        </UiFormItem>
        <UiFormItem label="材料文件" required>
          <UiPlatformFileField
            v-model:file-node-id="form.storageFileId"
            v-model:file-name="materialFileName"
            :scene-key="FileUploadSceneKey.QUALITY_ANNUAL_REPORT_MATERIAL"
            button-text="选择文件"
          />
          <p v-if="form.storageFileId" class="file-hint">当前 fileId：{{ form.storageFileId }}</p>
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="reviewDrawerOpen"
      :title="reviewDrawerTitle"
      width="480"
      :hide-footer="false"
      :confirm-loading="reviewSaving"
      ok-text="提交审核"
      @ok="submitReview"
    >
      <UiForm layout="vertical">
        <UiFormItem label="审核结论" required>
          <UiSelect
            v-model="reviewForm.reviewStatus"
            size="sm"
            :options="[
              { value: 'APPROVED', label: '通过' },
              { value: 'REJECTED', label: '退回' },
            ]"
          />
        </UiFormItem>
        <UiFormItem
          label="审核意见"
          :required="reviewForm.reviewStatus === AnnualReportMaterialStatusCode.REJECTED"
        >
          <UiTextarea
            size="sm"
            v-model="reviewForm.reviewComment"
            :rows="4"
            placeholder="退回时必须说明需补充或更正的材料问题"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </div>
</template>

<style scoped>
.annual-report-material-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.material-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar-input {
  width: 240px;
}

.year-input,
.status-select {
  width: 120px;
}

.category-select {
  width: 190px;
}

.muted,
.file-hint {
  color: var(--dp-text-tertiary);
  font-size: var(--dp-font-size-xs);
}

.file-hint {
  margin: 8px 0 0;
}
</style>
