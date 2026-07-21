<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeachingExtensionActivityVO,
  PortfolioTeachingExtensionCategoryVO,
} from '@/apis/portfolio/teaching-extension'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { portfolioTeachingExtensionApi } from '@/apis/portfolio/teaching-extension'
import { PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE } from '@/apis/portfolio/types'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import {
  PortfolioArchiveRecordStatusCode,
  PortfolioArchiveRecordStatusDescription,
} from '@/types/enums/portfolio-archive-record-status-enum'
import {
  PortfolioTeachingExtensionKindCode,
  PortfolioTeachingExtensionKindDescription,
  PortfolioTeachingExtensionKindOptions,
} from '@/types/enums/portfolio-teaching-extension-kind-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const categoryLoading = ref(false)
const saving = ref(false)
const creatingCategory = ref(false)
const submittingTrainingId = ref('')
const loadFailed = ref(false)
const rows = ref<PortfolioTeachingExtensionActivityVO[]>([])
const categories = ref<PortfolioTeachingExtensionCategoryVO[]>([])
const modalOpen = ref(false)
const categoryModalOpen = ref(false)
const editing = ref<PortfolioTeachingExtensionActivityVO | null>(null)
const deletingActivityId = ref('')
const deletingCategoryId = ref('')
const uploadingFile = ref(false)
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const kindFilter = ref<PortfolioTeachingExtensionKindCode | ''>('')
const requestToken = ref(0)
const formEpoch = ref(0)
const recommendationIntentConsumed = ref(false)

const form = reactive({
  activityKind: PortfolioTeachingExtensionKindCode.TRAINING as PortfolioTeachingExtensionKindCode,
  categoryCode: '',
  activityName: '',
  activityType: '',
  startDate: '',
  endDate: '',
  creditHours: undefined as number | undefined,
  reflectionText: '',
  descriptionText: '',
  fileId: '',
  attachmentName: '',
  trainingRecommendationId: '',
})

const categoryForm = reactive({ categoryName: '' })

const readonlyMode = computed(
  () => (canPickTeachers.value && !!targetTeacherId.value) || archiveWriteForbidden.value,
)

const isTraining = computed(() => form.activityKind === PortfolioTeachingExtensionKindCode.TRAINING)

function canEditActivity(row: PortfolioTeachingExtensionActivityVO) {
  return (
    !row.archiveRecordId
    || row.archiveRecordStatus === PortfolioArchiveRecordStatusCode.DRAFT
    || row.archiveRecordStatus === PortfolioArchiveRecordStatusCode.RETURNED
  )
}

const categoryOptions = computed(() =>
  categories.value.map((item) => ({
    value: item.categoryCode,
    label: item.categoryName,
  })),
)

const displayedRows = computed(() => {
  if (!kindFilter.value) {
    return rows.value
  }
  return rows.value.filter((item) => item.activityKind === kindFilter.value)
})

const activityColumns: ColumnsType = [
  { title: '大类', key: 'activityKind', width: 88 },
  { title: '活动名称', dataIndex: 'activityName', key: 'activityName' },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '时间', key: 'dateRange', width: 180 },
  { title: '学时/描述', key: 'summary', width: 140 },
  { title: '操作', key: 'actions', width: 120 },
]

const categoryColumns: ColumnsType = [
  { title: '分类名称', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 200 },
  { title: '类型', key: 'preset', width: 88 },
  { title: '操作', key: 'actions', width: 88 },
]

function scopeTeacherId() {
  return targetTeacherId.value || undefined
}

function kindLabel(kind: PortfolioTeachingExtensionKindCode) {
  return strictEnumLabel(PortfolioTeachingExtensionKindDescription, kind, '活动大类')
}

function resetForm(): void {
  formEpoch.value += 1
  uploadingFile.value = false
  editing.value = null
  form.activityKind = PortfolioTeachingExtensionKindCode.TRAINING
  form.categoryCode = ''
  form.activityName = ''
  form.activityType = ''
  form.startDate = ''
  form.endDate = ''
  form.creditHours = undefined
  form.reflectionText = ''
  form.descriptionText = ''
  form.fileId = ''
  form.attachmentName = ''
  form.trainingRecommendationId = ''
}

function dateRangeText(row: PortfolioTeachingExtensionActivityVO) {
  if (row.startDate && row.endDate) {
    return `${row.startDate} ~ ${row.endDate}`
  }
  return row.startDate || row.endDate || ''
}

function summaryText(row: PortfolioTeachingExtensionActivityVO) {
  if (row.activityKind === PortfolioTeachingExtensionKindCode.TRAINING) {
    return row.creditHours != null ? `${row.creditHours} 学时` : ''
  }
  return row.descriptionText || ''
}

function archiveStatusLabel(row: PortfolioTeachingExtensionActivityVO) {
  if (!row.archiveRecordStatus) {
    return ''
  }
  return strictEnumLabel(
    PortfolioArchiveRecordStatusDescription,
    row.archiveRecordStatus,
    '档案记录状态',
  )
}

async function loadData() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    loading.value = false
    categoryLoading.value = false
    saving.value = false
    creatingCategory.value = false
    uploadingFile.value = false
    submittingTrainingId.value = ''
    loadFailed.value = false
    rows.value = []
    categories.value = []
    return
  }
  loading.value = true
  categoryLoading.value = true
  loadFailed.value = false
  try {
    const activityRows = await portfolioTeachingExtensionApi.list({ teacherId: scopeTeacherId() })
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = activityRows
    try {
      const categoryRows = await portfolioTeachingExtensionApi.listCategories({
        teacherId: scopeTeacherId(),
      })
      if (requestToken.value === currentToken) {
        categories.value = categoryRows
      }
    } catch (error) {
      if (requestToken.value === currentToken) {
        categories.value = []
        showUserError(error, '拓展活动分类加载失败')
      }
    }
    if (
      typeof route.query.recommendationId === 'string'
      && !recommendationIntentConsumed.value
      && !readonlyMode.value
      && !modalOpen.value
    ) {
      openModal()
    }
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = []
    categories.value = []
    loadFailed.value = true
    showUserError(error, '加载拓展活动失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
      categoryLoading.value = false
    }
  }
}

function openModal(row?: PortfolioTeachingExtensionActivityVO): void {
  if (row?.archiveRecordId && !canEditActivity(row)) {
    void message.info('该培训活动的档案正在审核或已正式归档，不可修改')
    return
  }
  if (readonlyMode.value && !row) {
    showFormValidationMessage('管理员查看模式下不可新增活动')
    return
  }
  formEpoch.value += 1
  uploadingFile.value = false
  editing.value = row || null
  form.activityKind = row?.activityKind || PortfolioTeachingExtensionKindCode.TRAINING
  form.categoryCode = row?.categoryCode || ''
  form.activityName = row?.activityName || ''
  form.activityType = row?.activityType || ''
  form.startDate = row?.startDate || ''
  form.endDate = row?.endDate || ''
  form.creditHours = row?.creditHours
  form.reflectionText = row?.reflectionText || ''
  form.descriptionText = row?.descriptionText || ''
  form.fileId = row?.fileId || ''
  form.attachmentName = row?.fileId ? `附件 ${row.fileId}` : ''
  if (!row && !recommendationIntentConsumed.value) {
    form.trainingRecommendationId
      = typeof route.query.recommendationId === 'string' ? route.query.recommendationId : ''
    form.activityName
      = typeof route.query.activityName === 'string' ? route.query.activityName : form.activityName
    recommendationIntentConsumed.value = true
  }
  modalOpen.value = true
}

async function saveActivity() {
  if (
    saving.value
    || Boolean(deletingActivityId.value)
    || Boolean(deletingCategoryId.value)
    || Boolean(submittingTrainingId.value)
  ) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存教学拓展活动'))) {
    return
  }

  saving.value = true
  try {
    await portfolioTeachingExtensionApi.save({
      id: editing.value?.id,
      trainingRecommendationId: form.trainingRecommendationId || undefined,
      teacherId: scopeTeacherId(),
      activityKind: form.activityKind,
      categoryCode: form.categoryCode,
      activityName: form.activityName.trim(),
      activityType: form.activityType.trim() || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      creditHours: isTraining.value ? form.creditHours : undefined,
      reflectionText: isTraining.value ? form.reflectionText.trim() || undefined : undefined,
      descriptionText: !isTraining.value ? form.descriptionText.trim() || undefined : undefined,
      fileId: form.fileId || undefined,
    })
    void message.success('拓展活动已保存')
    modalOpen.value = false
    resetForm()
    await loadData()
  } catch (error) {
    showUserError(error, '保存拓展活动失败')
  } finally {
    saving.value = false
  }
}

async function removeActivity(row: PortfolioTeachingExtensionActivityVO) {
  if (readonlyMode.value || deletingActivityId.value || submittingTrainingId.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除教学拓展活动'))) {
    return
  }

  const teacherId = scopeTeacherId()
  const operationToken = requestToken.value
  const confirmed = await confirmAsync({
    title: '删除活动',
    content: `确认删除「${row.activityName}」？`,
  })
  if (!confirmed || requestToken.value !== operationToken) {
    return
  }
  deletingActivityId.value = row.id
  try {
    await portfolioTeachingExtensionApi.delete({ id: row.id, teacherId })
    if (requestToken.value !== operationToken) return
    void message.success('已删除')
    await loadData()
  } catch (error) {
    if (requestToken.value !== operationToken) return
    showUserError(error, '删除拓展活动失败')
  } finally {
    if (deletingActivityId.value === row.id) deletingActivityId.value = ''
  }
}

async function prepareTrainingArchiveDraft(row: PortfolioTeachingExtensionActivityVO) {
  submittingTrainingId.value = row.id
  try {
    const prepared = await portfolioTeachingExtensionApi.prepareTrainingArchiveDraft(row.id)
    if (prepared.missingRequiredFieldCodes.length) {
      void message.info('已生成档案草稿，请补齐模板必填字段后提交审核')
    }
    await router.push({
      name: 'PortfolioArchiveCategoryEdit',
      params: { categoryId: prepared.categoryId },
      query: {
        recordId: prepared.archiveRecordId,
        teacherId: scopeTeacherId(),
        fromPage: 'trainingExtension',
      },
    })
  } catch (error) {
    showUserError(error, '准备培训档案失败')
  } finally {
    submittingTrainingId.value = ''
  }
}

function openCategoryModal() {
  if (readonlyMode.value) {
    showFormValidationMessage('管理员查看模式下不可创建分类')
    return
  }
  categoryForm.categoryName = ''
  categoryModalOpen.value = true
}

async function createCategory() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('创建拓展自建分类'))) {
    return
  }

  creatingCategory.value = true
  try {
    await portfolioTeachingExtensionApi.createCategory({
      categoryName: categoryForm.categoryName.trim(),
      teacherId: scopeTeacherId(),
    })
    void message.success('自建分类已创建')
    categoryModalOpen.value = false
    await loadData()
  } catch (error) {
    showUserError(error, '创建自建分类失败')
  } finally {
    creatingCategory.value = false
  }
}

async function confirmDeleteCategory(row: PortfolioTeachingExtensionCategoryVO) {
  if (readonlyMode.value || row.preset || !row.id || deletingCategoryId.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除拓展自建分类'))) {
    return
  }

  const categoryId = row.id
  const teacherId = scopeTeacherId()
  const operationToken = requestToken.value
  deletingCategoryId.value = categoryId
  const confirmed = await confirmAsync({
    title: '删除自建分类',
    content: `确认删除「${row.categoryName}」？分类仍被活动引用时无法删除。`,
    type: 'error',
    okText: '确认删除',
  })
  if (!confirmed || requestToken.value !== operationToken) {
    if (deletingCategoryId.value === categoryId) deletingCategoryId.value = ''
    return
  }
  try {
    await portfolioTeachingExtensionApi.deleteCategory({ id: categoryId, teacherId })
    if (requestToken.value !== operationToken) return
    void message.success('自建分类已删除')
    await loadData()
  } catch (error) {
    if (requestToken.value !== operationToken) return
    showUserError(error, '删除拓展活动失败')
  } finally {
    if (deletingCategoryId.value === categoryId) deletingCategoryId.value = ''
  }
}

function openAttachmentPicker() {
  if (readonlyMode.value) {
    return
  }
  attachmentInputRef.value?.click()
}

/** 上传结果绑定教师、活动和表单代际，过期文件不得写入当前表单。 */
async function onAttachmentPick(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const file = input.files?.[0]
  if (!file) {
    return
  }
  const context = {
    teacherId: targetTeacherId.value,
    activityId: editing.value?.id,
    epoch: formEpoch.value,
  }
  uploadingFile.value = true
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
    if (
      formEpoch.value !== context.epoch
      || targetTeacherId.value !== context.teacherId
      || editing.value?.id !== context.activityId
    ) {
      return
    }
    form.fileId = uploaded.id
    form.attachmentName = uploaded.nodeName
    void message.success('证明材料已上传')
  } catch (error) {
    if (formEpoch.value !== context.epoch) {
      return
    }
    showUserError(error, '证明材料上传失败')
  } finally {
    if (formEpoch.value === context.epoch) {
      uploadingFile.value = false
    }
    input.value = ''
  }
}

watch(
  () => targetTeacherId.value,
  () => {
    requestToken.value += 1
    loading.value = false
    categoryLoading.value = false
    saving.value = false
    creatingCategory.value = false
    submittingTrainingId.value = ''
    deletingActivityId.value = ''
    deletingCategoryId.value = ''
    uploadingFile.value = false
    loadFailed.value = false
    rows.value = []
    categories.value = []
    modalOpen.value = false
    categoryModalOpen.value = false
    resetForm()
    recommendationIntentConsumed.value = false
  },
)
usePortfolioScopedLoader(loadData, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="教学拓展活动"
        subtitle="培训与其他专业实践"
      />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <UiCard v-else-if="loadFailed" title="加载失败">
      <UiEmpty size="sm" description="拓展活动加载失败">
        <UiButton size="sm" variant="primary" @click="loadData">重试</UiButton>
      </UiEmpty>
    </UiCard>

    <template v-else>
      <UiCard title="活动记录" :loading="loading">
        <template #extra>
          <UiSelect
            size="sm"
            v-model="kindFilter"
            allow-clear
            placeholder="大类筛选"
            style="width: 120px; margin-right: 8px"
            :options="PortfolioTeachingExtensionKindOptions"
          />
          <UiButton variant="primary" size="sm" v-if="!readonlyMode" @click="openModal()">
            新增活动
          </UiButton>
        </template>
        <UiDataTable
          :columns="activityColumns"
          :data-source="displayedRows"
          row-key="id"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'activityKind'">
              <UiTag tone="blue">{{ kindLabel(record.activityKind) }}</UiTag>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
              />
            </template>
            <template v-else-if="column.key === 'dateRange'">
              {{ dateRangeText(record) }}
            </template>
            <template v-else-if="column.key === 'summary'">
              {{ summaryText(record) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTag
                v-if="record.archiveRecordStatus"
                :tone="
                  strictEnumTone(
                    PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
                    record.archiveRecordStatus,
                    '档案记录状态',
                  )
                "
              >
                {{ archiveStatusLabel(record) }}
              </UiTag>
              <UiButton size="sm" variant="ghost" @click="openModal(record)">
                {{ readonlyMode || !canEditActivity(record) ? '查看' : '编辑' }}
              </UiButton>
              <UiButton
                size="sm"
                v-if="
                  !readonlyMode
                    && record.activityKind === PortfolioTeachingExtensionKindCode.TRAINING
                    && !record.archiveRecordId
                "
                variant="ghost"
                :loading="submittingTrainingId === record.id"
                @click="prepareTrainingArchiveDraft(record)"
              >
                填写档案
              </UiButton>
              <UiButton
                size="sm"
                v-if="record.archiveRecordId && record.archiveCategoryId"
                variant="ghost"
                @click="
                  router.push({
                    name: 'PortfolioArchiveCategoryEdit',
                    params: { categoryId: record.archiveCategoryId },
                    query: {
                      recordId: record.archiveRecordId,
                      teacherId: scopeTeacherId(),
                      fromPage: 'trainingExtension',
                    },
                  })
                "
              >
                进入档案
              </UiButton>
              <UiButton
                size="sm"
                v-if="!readonlyMode && !record.archiveRecordId"
                variant="ghost"
                danger
                :loading="deletingActivityId === record.id"
                :disabled="Boolean(deletingActivityId) || Boolean(submittingTrainingId)"
                @click="removeActivity(record)"
              >
                删除
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard title="活动分类" :loading="categoryLoading" style="margin-top: 16px">
        <template #extra>
          <UiButton size="sm" variant="primary" v-if="!readonlyMode" @click="openCategoryModal">
            新建分类
          </UiButton>
        </template>
        <UiDataTable
          :columns="categoryColumns"
          :data-source="categories"
          row-key="categoryCode"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'preset'">
              {{ record.preset ? '预设' : '自建' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                size="sm"
                v-if="!readonlyMode && !record.preset && record.id"
                variant="ghost"
                danger
                :loading="deletingCategoryId === record.id"
                @click="confirmDeleteCategory(record)"
              >
                删除
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>

  <UiDialog
    v-model:open="modalOpen"
    :title="editing ? '编辑活动' : '新增活动'"
    :confirm-loading="saving"
    @ok="saveActivity"
    @cancel="resetForm"
  >
    <UiForm layout="vertical">
      <UiFormItem label="活动大类" required compact>
        <UiSelect
          size="sm"
          v-model="form.activityKind"
          :disabled="readonlyMode"
          :options="PortfolioTeachingExtensionKindOptions"
        />
      </UiFormItem>
      <UiFormItem label="分类" required compact>
        <UiSelect
          size="sm"
          v-model="form.categoryCode"
          :disabled="readonlyMode"
          placeholder="选择分类"
          :options="categoryOptions"
        />
      </UiFormItem>
      <UiFormItem label="活动名称" required compact>
        <UiInput v-model="form.activityName" size="sm" :disabled="readonlyMode" />
      </UiFormItem>
      <UiFormItem :label="isTraining ? '培训类型' : '活动类型'" compact>
        <UiInput v-model="form.activityType" size="sm" :disabled="readonlyMode" />
      </UiFormItem>
      <UiFormItem label="开始日期" compact>
        <UiDatePicker
          v-model="form.startDate"
          value-format="YYYY-MM-DD"
          size="sm"
          :disabled="readonlyMode"
        />
      </UiFormItem>
      <UiFormItem label="结束日期" compact>
        <UiDatePicker
          v-model="form.endDate"
          value-format="YYYY-MM-DD"
          size="sm"
          :disabled="readonlyMode"
        />
      </UiFormItem>
      <UiFormItem v-if="isTraining" label="学时" compact>
        <UiInputNumber
          v-model="form.creditHours"
          size="sm"
          :disabled="readonlyMode"
          :min="0"
          :precision="1"
        />
      </UiFormItem>
      <UiFormItem v-if="isTraining" label="培训感想" compact>
        <UiTextarea v-model="form.reflectionText" size="sm" :disabled="readonlyMode" :rows="4" />
      </UiFormItem>
      <UiFormItem v-else label="活动描述" compact>
        <UiTextarea v-model="form.descriptionText" size="sm" :disabled="readonlyMode" :rows="4" />
      </UiFormItem>
      <UiFormItem label="证明材料" compact>
        <div class="teacher-extension__attachment">
          <span v-if="form.attachmentName">{{ form.attachmentName }}</span>
          <UiButton
            variant="primary"
            size="sm"
            v-if="!readonlyMode"
            :loading="uploadingFile"
            @click="openAttachmentPicker"
          >
            上传附件
          </UiButton>
        </div>
        <input ref="attachmentInputRef" type="file" hidden @change="onAttachmentPick" />
      </UiFormItem>
    </UiForm>
  </UiDialog>

  <UiDialog
    v-model:open="categoryModalOpen"
    title="新建活动分类"
    :confirm-loading="creatingCategory"
    @ok="createCategory"
  >
    <UiForm layout="vertical">
      <UiFormItem label="分类名称" required compact>
        <UiInput v-model="categoryForm.categoryName" size="sm" placeholder="如 校级教研活动" />
      </UiFormItem>
    </UiForm>
  </UiDialog>
</template>

<style scoped lang="scss">
.teacher-extension__attachment {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}
</style>
