<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherHonorCategoryVO,
  PortfolioTeacherHonorVO,
} from '@/apis/portfolio/teacher-honor'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { portfolioTeacherHonorApi } from '@/apis/portfolio/teacher-honor'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
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
  PortfolioHonorLevelCode,
  PortfolioHonorLevelDescription,
  PortfolioHonorLevelOptions,
} from '@/types/enums/portfolio-honor-level-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()
const router = useRouter()

const loading = ref(false)
const categoryLoading = ref(false)
const saving = ref(false)
const creatingCategory = ref(false)
const loadFailed = ref(false)
const listSyncFailed = ref(false)
const rows = ref<PortfolioTeacherHonorVO[]>([])
const categories = ref<PortfolioTeacherHonorCategoryVO[]>([])
const modalOpen = ref(false)
const categoryModalOpen = ref(false)
const editing = ref<PortfolioTeacherHonorVO | null>(null)
const deletingHonorId = ref('')
const deletingCategoryId = ref('')
const uploadingFile = ref(false)
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const requestToken = ref(0)
const preparingArchiveId = ref('')

const form = reactive({
  recordTitle: '',
  categoryCode: '',
  levelCode: PortfolioHonorLevelCode.SCHOOL as PortfolioHonorLevelCode,
  awardUnit: '',
  recordDate: '',
  descriptionText: '',
  fileId: '',
  attachmentName: '',
})

const categoryForm = reactive({ categoryName: '' })

const readonlyMode = computed(
  () => (canPickTeachers.value && !!targetTeacherId.value) || archiveWriteForbidden.value,
)

const categoryOptions = computed(() =>
  categories.value.map((item) => ({
    value: item.categoryCode,
    label: item.categoryName,
  })),
)

const honorColumns: ColumnsType = [
  { title: '荣誉名称', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
  { title: '等级', key: 'levelCode', width: 88 },
  { title: '授予单位', dataIndex: 'awardUnit', key: 'awardUnit', width: 140 },
  { title: '获得日期', dataIndex: 'recordDate', key: 'recordDate', width: 110 },
  { title: '业务日工号', dataIndex: 'affiliationStaffNo', key: 'affiliationStaffNo', width: 120 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '主行动', key: 'actions', width: 210 },
]

const categoryColumns: ColumnsType = [
  { title: '分类名称', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 200 },
  { title: '类型', key: 'preset', width: 88 },
  { title: '主行动', key: 'actions', width: 88 },
]

function scopeTeacherId() {
  return targetTeacherId.value || undefined
}

function resetForm() {
  editing.value = null
  form.recordTitle = ''
  form.categoryCode = ''
  form.levelCode = PortfolioHonorLevelCode.SCHOOL
  form.awardUnit = ''
  form.recordDate = ''
  form.descriptionText = ''
  form.fileId = ''
  form.attachmentName = ''
}

function honorLevelLabel(code: PortfolioHonorLevelCode) {
  return strictEnumLabel(PortfolioHonorLevelDescription, code, '荣誉等级')
}

async function loadData(): Promise<boolean> {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  if (canPickTeachers.value && !targetTeacherId.value) {
    loading.value = false
    categoryLoading.value = false
    saving.value = false
    creatingCategory.value = false
    uploadingFile.value = false
    loadFailed.value = false
    listSyncFailed.value = false
    rows.value = []
    categories.value = []
    return true
  }
  loading.value = true
  categoryLoading.value = true
  loadFailed.value = false
  try {
    const honorRows = await portfolioTeacherHonorApi.list({ teacherId: scopeTeacherId() })
    if (requestToken.value !== currentToken) {
      return false
    }
    rows.value = honorRows
    try {
      const categoryRows = await portfolioTeacherHonorApi.listCategories({
        teacherId: scopeTeacherId(),
      })
      if (requestToken.value === currentToken) {
        categories.value = categoryRows
      }
    } catch (error) {
      if (requestToken.value === currentToken) {
        showUserError(error, '荣誉分类加载失败')
      }
    }
    listSyncFailed.value = false
    return true
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return false
    }
    if (rows.value.length === 0) {
      loadFailed.value = true
    } else {
      listSyncFailed.value = true
    }
    showUserError(error, '加载荣誉记录失败')
    return false
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
      categoryLoading.value = false
    }
  }
}

/** 荣誉行：编辑/查看为主行动 */
function buildHonorRowActions(record: PortfolioTeacherHonorVO): UiTableRowActionItem[] {
  return [
    {
      key: 'edit',
      label: readonlyMode.value ? '查看' : '编辑',
      tone: 'primary',
    },
    {
      key: 'archive',
      label: '归入档案',
      hidden: readonlyMode.value,
      disabled: Boolean(preparingArchiveId.value),
    },
    {
      key: 'delete',
      label: '删除',
      tone: 'danger',
      hidden: readonlyMode.value,
      disabled: Boolean(deletingHonorId.value) || Boolean(preparingArchiveId.value),
    },
  ]
}

function handleHonorRowAction(key: string, record: PortfolioTeacherHonorVO): void {
  if (key === 'edit') {
    openModal(record)
    return
  }
  if (key === 'archive') {
    void prepareArchiveDraft(record)
    return
  }
  if (key === 'delete') {
    void removeHonor(record)
  }
}

function buildHonorCategoryRowActions(record: PortfolioTeacherHonorCategoryVO): UiTableRowActionItem[] {
  return [
    {
      key: 'delete',
      label: '删除',
      tone: 'danger',
      hidden: readonlyMode.value || Boolean(record.preset) || !record.id,
    },
  ]
}

function handleHonorCategoryRowAction(key: string, record: PortfolioTeacherHonorCategoryVO): void {
  if (key === 'delete') {
    void confirmDeleteCategory(record)
  }
}
function openModal(row?: PortfolioTeacherHonorVO) {
  if (readonlyMode.value && !row) {
    showFormValidationMessage('管理员查看模式下不可新增荣誉')
    return
  }
  editing.value = row || null
  form.recordTitle = row?.recordTitle || ''
  form.categoryCode = row?.categoryCode || ''
  form.levelCode = row?.levelCode || PortfolioHonorLevelCode.SCHOOL
  form.awardUnit = row?.awardUnit || ''
  form.recordDate = row?.recordDate || ''
  form.descriptionText = row?.descriptionText || ''
  form.fileId = row?.fileId || ''
  form.attachmentName = row?.fileId ? `附件 ${row.fileId}` : ''
  modalOpen.value = true
}

async function saveHonor() {
  if (readonlyMode.value) {
    return
  }
  if (saving.value || Boolean(deletingHonorId.value) || Boolean(deletingCategoryId.value)) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('保存荣誉档案'))) {
    return
  }

  const scopeToken = requestToken.value
  saving.value = true
  try {
    await portfolioTeacherHonorApi.save({
      id: editing.value?.id,
      teacherId: scopeTeacherId(),
      recordTitle: form.recordTitle.trim(),
      categoryCode: form.categoryCode,
      levelCode: form.levelCode,
      awardUnit: form.awardUnit.trim() || undefined,
      recordDate: form.recordDate || undefined,
      descriptionText: form.descriptionText.trim() || undefined,
      fileId: form.fileId || undefined,
    })
    if (requestToken.value !== scopeToken) return
    void message.success('荣誉记录已保存')
    modalOpen.value = false
    resetForm()
    const synced = await loadData()
    if (!synced && requestToken.value === scopeToken) {
      listSyncFailed.value = true
      showUserError(new Error('列表同步失败'), '荣誉已保存，列表同步失败')
    }
  } catch (error) {
    if (requestToken.value !== scopeToken) return
    showUserError(error, '保存荣誉记录失败')
  } finally {
    saving.value = false
  }
}

async function removeHonor(row: PortfolioTeacherHonorVO) {
  if (readonlyMode.value || deletingHonorId.value || preparingArchiveId.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除荣誉档案'))) {
    return
  }

  const teacherId = scopeTeacherId()
  const operationToken = requestToken.value
  const confirmed = await confirmAsync({
    title: '删除荣誉',
    content: `确认删除「${row.recordTitle}」？`,
  })
  if (!confirmed || requestToken.value !== operationToken) {
    return
  }
  deletingHonorId.value = row.id
  try {
    await portfolioTeacherHonorApi.delete({ id: row.id, teacherId })
    if (requestToken.value !== operationToken) return
    void message.success('已删除')
    const synced = await loadData()
    if (!synced && requestToken.value === operationToken) {
      listSyncFailed.value = true
      showUserError(new Error('列表同步失败'), '荣誉已删除，列表同步失败')
    }
  } catch (error) {
    if (requestToken.value !== operationToken) return
    showUserError(error, '删除荣誉记录失败')
  } finally {
    if (deletingHonorId.value === row.id) deletingHonorId.value = ''
  }
}

async function prepareArchiveDraft(row: PortfolioTeacherHonorVO) {
  if (readonlyMode.value || preparingArchiveId.value) {
    return
  }
  if (!row.fileId) {
    showFormValidationMessage('请先编辑荣誉并上传证明材料')
    return
  }
  preparingArchiveId.value = row.id
  try {
    const result = await portfolioTeacherHonorApi.prepareArchiveDraft({ id: row.id })
    void message.success(
      result.missingRequiredFieldCodes.length
        ? `档案草稿已准备，尚有 ${result.missingRequiredFieldCodes.length} 个必填字段待完善`
        : '档案草稿已准备',
    )
    await router.push({
      path: `/portfolio/teacher/archive/${result.categoryId}`,
      query: { recordId: result.archiveRecordId },
    })
  } catch (error) {
    showUserError(error, '准备荣誉档案草稿失败')
  } finally {
    preparingArchiveId.value = ''
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
  if (!(await confirmProxyWrite('创建荣誉自建分类'))) {
    return
  }

  creatingCategory.value = true
  try {
    await portfolioTeacherHonorApi.createCategory({
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

async function confirmDeleteCategory(row: PortfolioTeacherHonorCategoryVO) {
  if (readonlyMode.value || row.preset || !row.id || deletingCategoryId.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('删除荣誉自建分类'))) {
    return
  }

  const categoryId = row.id
  const teacherId = scopeTeacherId()
  const operationToken = requestToken.value
  deletingCategoryId.value = categoryId
  const confirmed = await confirmAsync({
    title: '删除自建分类',
    content: `确认删除「${row.categoryName}」？分类仍被荣誉引用时无法删除。`,
    type: 'error',
    okText: '确认删除',
  })
  if (!confirmed || requestToken.value !== operationToken) {
    if (deletingCategoryId.value === categoryId) deletingCategoryId.value = ''
    return
  }
  try {
    await portfolioTeacherHonorApi.deleteCategory({ id: categoryId, teacherId })
    if (requestToken.value !== operationToken) return
    void message.success('自建分类已删除')
    await loadData()
  } catch (error) {
    if (requestToken.value !== operationToken) return
    showUserError(error, '删除荣誉记录失败')
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
    void message.success('证明材料已上传')
  } catch (error) {
    showUserError(error, '证明材料上传失败')
  } finally {
    uploadingFile.value = false
    event.target.value = ''
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
    deletingHonorId.value = ''
    deletingCategoryId.value = ''
    uploadingFile.value = false
    loadFailed.value = false
    listSyncFailed.value = false
    rows.value = []
    categories.value = []
    modalOpen.value = false
    categoryModalOpen.value = false
    resetForm()
  },
)
usePortfolioScopedLoader(loadData, () => targetTeacherId.value)

const TeacherHonorSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadFailed.value && rows.value.length === 0) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '获奖记录',
      value: rows.value.length,
      clickable: true,
      helper: '当前已加载',
    },
  ]
  if (categories.value.length > 0) {
    metrics.push({
      key: 'categories',
      label: '荣誉分类',
      value: categories.value.length,
      helper: '当前已加载',
    })
  }
  return applySpotlightEmphasis(metrics, { primaryKey: 'total', actionLabel: '刷新' })
})

const TeacherHonorWorkbenchSubtitle = computed(() => {
  if (loadFailed.value) return '加载失败'
  return `${rows.value.length} 条`
})

function onTeacherHonorSignalClick(_key: string) {
  void loadData()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="获奖情况" :subtitle="TeacherHonorWorkbenchSubtitle" />
    </template>
    <template v-if="TeacherHonorSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="TeacherHonorSignalMetrics"
        @metric-click="onTeacherHonorSignalClick"
      />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="dp-mb-component"
    />
    <UiAlertStrip
      v-if="listSyncFailed"
      tone="warning"
      title="荣誉列表同步失败"
      class="dp-mb-component"
    />

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />

    <UiCard v-else-if="loadFailed" title="加载失败">
      <UiEmpty
        size="sm"
        description="荣誉档案加载失败"
      />
    </UiCard>

    <template v-else>
      <UiCard title="荣誉记录" :loading="loading">
        <template #extra>
          <UiButton variant="primary" size="sm" v-if="!readonlyMode" @click="openModal()">
            新增荣誉
          </UiButton>
        </template>
        <UiDataTable :columns="honorColumns" :data-source="rows" row-key="id" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
              />
            </template>
            <template v-else-if="column.key === 'levelCode'">
              {{ honorLevelLabel(record.levelCode) }}
            </template>
            <template v-else-if="column.key === 'affiliationStaffNo'">
              {{ record.affiliationStaffNo || '—' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :max-visible="2"
                :items="buildHonorRowActions(record)"
                split
                @action="(key) => handleHonorRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiCard title="荣誉分类" :loading="categoryLoading" style="margin-top: var(--dp-space-block)">
        <template #extra>
          <UiButton size="sm" variant="outline" v-if="!readonlyMode" @click="openCategoryModal">
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
              <UiTableActions
                :max-visible="2"
                :items="buildHonorCategoryRowActions(record)"
                split
                @action="(key) => handleHonorCategoryRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
  </StageWorkbenchShell>

  <UiDialog
    v-model:open="modalOpen"
    :title="readonlyMode ? '查看荣誉' : editing ? '编辑荣誉' : '新增荣誉'"
    :confirm-loading="saving"
    :hide-ok="readonlyMode"
    :cancel-text="readonlyMode ? '关闭' : '取消'"
    @ok="saveHonor"
    @cancel="resetForm"
  >
    <UiForm layout="vertical">
      <UiFormItem label="荣誉名称" required compact>
        <UiInput v-model="form.recordTitle" size="sm" :disabled="readonlyMode" />
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
      <UiFormItem label="等级" required compact>
        <UiSelect
          size="sm"
          v-model="form.levelCode"
          :disabled="readonlyMode"
          :options="PortfolioHonorLevelOptions"
        />
      </UiFormItem>
      <UiFormItem label="授予单位" compact>
        <UiInput v-model="form.awardUnit" size="sm" :disabled="readonlyMode" />
      </UiFormItem>
      <UiFormItem label="获得日期" compact>
        <UiDatePicker
          v-model="form.recordDate"
          value-format="YYYY-MM-DD"
          size="sm"
          :disabled="readonlyMode"
        />
      </UiFormItem>
      <UiFormItem label="描述" compact>
        <UiTextarea v-model="form.descriptionText" size="sm" :disabled="readonlyMode" :rows="3" />
      </UiFormItem>
      <UiFormItem label="证明材料" compact>
        <div class="teacher-honor__attachment">
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
    title="新建荣誉分类"
    :confirm-loading="creatingCategory"
    @ok="createCategory"
  >
    <UiForm layout="vertical">
      <UiFormItem label="分类名称" required compact>
        <UiInput v-model="categoryForm.categoryName" size="sm" placeholder="如 校级专项荣誉" />
      </UiFormItem>
    </UiForm>
  </UiDialog>
</template>

<style scoped lang="scss">
.teacher-honor__attachment {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}
</style>
