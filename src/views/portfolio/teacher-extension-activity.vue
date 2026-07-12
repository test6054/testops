<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeachingExtensionActivityVO,
  PortfolioTeachingExtensionCategoryVO,
} from '@/apis/portfolio/teaching-extension'
import { portfolioTeachingExtensionApi } from '@/apis/portfolio/teaching-extension'
import { DatePicker, Form, Input, InputNumber, message, Modal } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE } from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import {
  PortfolioArchiveRecordStatusCode,
  PortfolioArchiveRecordStatusDescription,
} from '@/types/enums/portfolio-archive-record-status-enum'
import {
  PortfolioTeachingExtensionKindCode,
  PortfolioTeachingExtensionKindDescription,
  PortfolioTeachingExtensionKindOptions,
} from '@/types/enums/portfolio-teaching-extension-kind-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
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
const deletingCategoryId = ref('')
const uploadingFile = ref(false)
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const kindFilter = ref<PortfolioTeachingExtensionKindCode | ''>('')
const requestToken = ref(0)
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

const readonlyMode = computed(() => canPickTeachers.value && !!targetTeacherId.value)

const isTraining = computed(() => form.activityKind === PortfolioTeachingExtensionKindCode.TRAINING)

function canEditActivity(row: PortfolioTeachingExtensionActivityVO) {
  return (
    !row.archiveRecordId ||
    row.archiveRecordStatus === PortfolioArchiveRecordStatusCode.DRAFT ||
    row.archiveRecordStatus === PortfolioArchiveRecordStatusCode.RETURNED
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

function resetForm() {
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
    rows.value = []
    categories.value = []
    return
  }
  loading.value = true
  categoryLoading.value = true
  loadFailed.value = false
  try {
    const [activityRows, categoryRows] = await Promise.all([
      portfolioTeachingExtensionApi.list({ teacherId: scopeTeacherId() }),
      portfolioTeachingExtensionApi.listCategories({ teacherId: scopeTeacherId() }),
    ])
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = activityRows
    categories.value = categoryRows
    if (
      typeof route.query.recommendationId === 'string' &&
      !recommendationIntentConsumed.value &&
      !readonlyMode.value &&
      !modalOpen.value
    ) {
      openModal()
    }
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    loadFailed.value = true
    showUserError(error)
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
      categoryLoading.value = false
    }
  }
}

function openModal(row?: PortfolioTeachingExtensionActivityVO) {
  if (row?.archiveRecordId && !canEditActivity(row)) {
    message.info('该培训活动的档案正在审核或已正式归档，不可修改')
    return
  }
  if (readonlyMode.value && !row) {
    message.warning('管理员查看模式下不可新增活动')
    return
  }
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
    form.trainingRecommendationId =
      typeof route.query.recommendationId === 'string' ? route.query.recommendationId : ''
    form.activityName =
      typeof route.query.activityName === 'string' ? route.query.activityName : form.activityName
    recommendationIntentConsumed.value = true
  }
  modalOpen.value = true
}

async function saveActivity() {
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
    message.success('拓展活动已保存')
    modalOpen.value = false
    resetForm()
    await loadData()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function removeActivity(row: PortfolioTeachingExtensionActivityVO) {
  if (readonlyMode.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '删除活动',
    content: `确认删除「${row.activityName}」？`,
  })
  if (!confirmed) {
    return
  }
  try {
    await portfolioTeachingExtensionApi.delete({ id: row.id, teacherId: scopeTeacherId() })
    message.success('已删除')
    await loadData()
  } catch (error) {
    showUserError(error)
  }
}

async function prepareTrainingArchiveDraft(row: PortfolioTeachingExtensionActivityVO) {
  submittingTrainingId.value = row.id
  try {
    const prepared = await portfolioTeachingExtensionApi.prepareTrainingArchiveDraft(row.id)
    if (prepared.missingRequiredFieldCodes.length) {
      message.info('已生成档案草稿，请补齐模板必填字段后提交审核')
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
    message.warning('管理员查看模式下不可创建分类')
    return
  }
  categoryForm.categoryName = ''
  categoryModalOpen.value = true
}

async function createCategory() {
  creatingCategory.value = true
  try {
    await portfolioTeachingExtensionApi.createCategory({
      categoryName: categoryForm.categoryName.trim(),
      teacherId: scopeTeacherId(),
    })
    message.success('自建分类已创建')
    categoryModalOpen.value = false
    await loadData()
  } catch (error) {
    showUserError(error)
  } finally {
    creatingCategory.value = false
  }
}

function confirmDeleteCategory(row: PortfolioTeachingExtensionCategoryVO) {
  if (readonlyMode.value || row.preset || !row.id) {
    return
  }
  Modal.confirm({
    title: '删除自建分类',
    content: `确认删除「${row.categoryName}」？分类仍被活动引用时无法删除。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      deletingCategoryId.value = row.id!
      try {
        await portfolioTeachingExtensionApi.deleteCategory({
          id: row.id!,
          teacherId: scopeTeacherId(),
        })
        message.success('自建分类已删除')
        await loadData()
      } catch (error) {
        showUserError(error)
      } finally {
        deletingCategoryId.value = ''
      }
    },
  })
}

function openAttachmentPicker() {
  if (readonlyMode.value) {
    return
  }
  attachmentInputRef.value?.click()
}

async function onAttachmentPick(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const file = event.target.files?.[0]
  if (!file) {
    return
  }
  uploadingFile.value = true
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
    form.fileId = uploaded.id
    form.attachmentName = uploaded.nodeName
    message.success('证明材料已上传')
  } catch (error) {
    showUserError(error, '证明材料上传失败')
  } finally {
    uploadingFile.value = false
    event.target.value = ''
  }
}

usePortfolioScopedLoader(loadData, () => targetTeacherId.value)
watch(
  () => targetTeacherId.value,
  () => {
    requestToken.value += 1
    modalOpen.value = false
    categoryModalOpen.value = false
    resetForm()
    recommendationIntentConsumed.value = false
  },
)
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

    <UiCard v-if="loadFailed" title="加载失败">
      <UiEmpty description="拓展活动加载失败">
        <UiButton @click="loadData">重试</UiButton>
      </UiEmpty>
    </UiCard>

    <template v-else>
      <UiCard title="活动记录" :loading="loading">
        <template #extra>
          <a-select
            v-model:value="kindFilter"
            allow-clear
            placeholder="大类筛选"
            style="width: 120px; margin-right: 8px"
            :options="PortfolioTeachingExtensionKindOptions"
          />
          <UiButton v-if="!readonlyMode" @click="openModal()">新增活动</UiButton>
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
              <UiButton variant="ghost" @click="openModal(record)">
                {{ readonlyMode || !canEditActivity(record) ? '查看' : '编辑' }}
              </UiButton>
              <UiButton
                v-if="
                  !readonlyMode &&
                  record.activityKind === PortfolioTeachingExtensionKindCode.TRAINING &&
                  !record.archiveRecordId
                "
                variant="ghost"
                :loading="submittingTrainingId === record.id"
                @click="prepareTrainingArchiveDraft(record)"
              >
                填写档案
              </UiButton>
              <UiButton
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
                v-if="!readonlyMode && !record.archiveRecordId"
                variant="ghost"
                danger
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
          <UiButton v-if="!readonlyMode" @click="openCategoryModal">新建分类</UiButton>
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

  <a-modal
    v-model:open="modalOpen"
    :title="editing ? '编辑活动' : '新增活动'"
    :confirm-loading="saving"
    :ok-button-props="{ disabled: readonlyMode }"
    @ok="saveActivity"
    @cancel="resetForm"
  >
    <Form layout="vertical">
      <Form.Item label="活动大类" required>
        <a-select
          v-model:value="form.activityKind"
          :disabled="readonlyMode"
          :options="PortfolioTeachingExtensionKindOptions"
        />
      </Form.Item>
      <Form.Item label="分类" required>
        <a-select
          v-model:value="form.categoryCode"
          :disabled="readonlyMode"
          placeholder="选择分类"
          :options="categoryOptions"
        />
      </Form.Item>
      <Form.Item label="活动名称" required>
        <Input v-model:value="form.activityName" :disabled="readonlyMode" />
      </Form.Item>
      <Form.Item :label="isTraining ? '培训类型' : '活动类型'">
        <Input v-model:value="form.activityType" :disabled="readonlyMode" />
      </Form.Item>
      <Form.Item label="开始日期">
        <DatePicker
          v-model:value="form.startDate"
          value-format="YYYY-MM-DD"
          :disabled="readonlyMode"
          style="width: 100%"
        />
      </Form.Item>
      <Form.Item label="结束日期">
        <DatePicker
          v-model:value="form.endDate"
          value-format="YYYY-MM-DD"
          :disabled="readonlyMode"
          style="width: 100%"
        />
      </Form.Item>
      <Form.Item v-if="isTraining" label="学时">
        <InputNumber
          v-model:value="form.creditHours"
          :disabled="readonlyMode"
          :min="0"
          :precision="1"
          style="width: 100%"
        />
      </Form.Item>
      <Form.Item v-if="isTraining" label="培训感想">
        <Input.TextArea v-model:value="form.reflectionText" :disabled="readonlyMode" :rows="4" />
      </Form.Item>
      <Form.Item v-else label="活动描述">
        <Input.TextArea v-model:value="form.descriptionText" :disabled="readonlyMode" :rows="4" />
      </Form.Item>
      <Form.Item label="证明材料">
        <div class="teacher-extension__attachment">
          <span v-if="form.attachmentName">{{ form.attachmentName }}</span>
          <UiButton v-if="!readonlyMode" :loading="uploadingFile" @click="openAttachmentPicker">
            上传附件
          </UiButton>
        </div>
        <input ref="attachmentInputRef" type="file" hidden @change="onAttachmentPick" />
      </Form.Item>
    </Form>
  </a-modal>

  <a-modal
    v-model:open="categoryModalOpen"
    title="新建活动分类"
    :confirm-loading="creatingCategory"
    @ok="createCategory"
  >
    <Form layout="vertical">
      <Form.Item label="分类名称" required>
        <Input v-model:value="categoryForm.categoryName" placeholder="如 校级教研活动" />
      </Form.Item>
    </Form>
  </a-modal>
</template>

<style scoped lang="scss">
.teacher-extension__attachment {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}
</style>
