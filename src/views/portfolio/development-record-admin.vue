<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentRecordStatusCode } from '@/apis/portfolio/enums'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioDevelopmentRecordStatusDescription,
  PortfolioDevelopmentRecordTypeCode,
  PortfolioDevelopmentRecordTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import PortfolioArchiveWriteGuardStrip from '@/components/portfolio/PortfolioArchiveWriteGuardStrip.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
/** 院系路由或非租户管理员：本院系发展档案库口径（PF-P0-420） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageScopeTitle = computed(() => (isDepartmentScoped.value ? '院系发展档案' : '发展档案库'))


const {
  archiveWriteForbidden,
  archiveWriteCapabilityUnknown,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  loading: archiveWriteGuardLoading,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard()

const RECORD_TAB_KEYS: PortfolioDevelopmentRecordTypeCode[] = [
  PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
  PortfolioDevelopmentRecordTypeCode.POLICY,
]
const RECORD_TABS = RECORD_TAB_KEYS.map((key) => ({
  key,
  label: strictEnumLabel(PortfolioDevelopmentRecordTypeDescription, key, '发展档案记录类型'),
}))

type RecordType = (typeof RECORD_TAB_KEYS)[number]

const activeType = ref<RecordType>(PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT)
const importModalOpen = ref(false)
const saving = ref(false)
const removingId = ref('')
const exportApplyOpen = ref(false)
const exportPurpose = ref('')
const applyingExport = ref(false)
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  loadError,
  loadPage,
  search,
  handlePageChange,
} = useQueryTable((params) =>
  portfolioDevelopmentRecordApi.page({
    ...params,
    recordType: activeType.value,
  }),
)
interface DevelopmentRecordForm {
  recordTitle: string
  descriptionText: string
  teacherUserId: string
}

const form = reactive<DevelopmentRecordForm>({
  recordTitle: '',
  descriptionText: '',
  teacherUserId: '',
})

const requiresTeacher = computed(
  () => activeType.value === PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
)

const columns = computed<ColumnsType>(() => {
  const base: ColumnsType = [{ title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' }]
  if (requiresTeacher.value) {
    base.push({ title: '所属教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 })
    base.push({
      title: '业务日工号',
      dataIndex: 'affiliationStaffNo',
      key: 'affiliationStaffNo',
      width: 120,
    })
  }
  base.push(
    { title: '分类', dataIndex: 'categoryCode', key: 'categoryCode', width: 120 },
    { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
    { title: '生命周期', key: 'lifecycleStatus', width: 100 },
    { title: '身份层', key: 'identityLayers', width: 160 },
    { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
    { title: '操作', key: 'actions', width: 120 },
  )
  return base
})

const tabLabel = computed(
  () => RECORD_TABS.find((item) => item.key === activeType.value)?.label ?? '',
)

const importContext = computed(() => ({ defaultRecordType: activeType.value }))


function recordStatusLabel(status: PortfolioDevelopmentRecordStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentRecordStatusDescription, status, '发展档案条目状态')
}

function resetForm() {
  form.recordTitle = ''
  form.descriptionText = ''
  form.teacherUserId = ''
}

async function refreshListAfterWrite(settledLabel: string) {
  await loadPage({ errorMessage: `${settledLabel}，列表刷新失败` })
}

async function saveRecord() {
  if (!assertArchiveWritable()) {
    return
  }
  if (saving.value) {
    return
  }
  if (!form.recordTitle.trim()) {
    showFormValidationMessage('请填写标题')
    return
  }
  if (requiresTeacher.value && !form.teacherUserId) {
    showFormValidationMessage('成果条目须选择所属教师')
    return
  }
  saving.value = true
  try {
    await portfolioDevelopmentRecordApi.save({
      recordType: activeType.value,
      recordTitle: form.recordTitle.trim(),
      descriptionText: form.descriptionText.trim() || undefined,
      teacherUserId: requiresTeacher.value ? form.teacherUserId : undefined,
    })
    void message.success('已保存')
    resetForm()
  } catch (error) {
    showUserError(error, '保存发展记录失败')
    return
  } finally {
    saving.value = false
  }
  await refreshListAfterWrite('已保存')
}

async function removeRecord(id: string) {
  if (!assertArchiveWritable()) {
    return
  }
  if (removingId.value || saving.value) {
    return
  }
  removingId.value = id
  try {
    await portfolioDevelopmentRecordApi.delete({ id })
    void message.success('已删除')
  } catch (error) {
    showUserError(error, '删除发展记录失败')
    return
  } finally {
    removingId.value = ''
  }
  await refreshListAfterWrite('已删除')
}

async function onImportSuccess() {
  await refreshListAfterWrite('导入已完成')
}

function openExportApply() {
  exportPurpose.value = ''
  exportApplyOpen.value = true
}

async function submitExportApply() {
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  if (applyingExport.value) {
    return Promise.reject(new Error('导出申请进行中'))
  }
  applyingExport.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.DEVELOPMENT_RECORD,
      businessRef: {
        developmentRecordType: activeType.value,
      },
      exportPurpose: purpose,
    })
    exportApplyOpen.value = false
    void message.success('已提交发展档案导出审批')
    await router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交发展档案导出审批失败')
    return Promise.reject(error)
  } finally {
    applyingExport.value = false
  }
}

function switchTab(type: RecordType) {
  activeType.value = type
  resetForm()
  search()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="`${pageScopeTitle} · ${tabLabel}`" />
    </template>
    <PortfolioArchiveWriteGuardStrip
      :blocked="archiveWriteForbidden"
      :capability-unknown="archiveWriteCapabilityUnknown"
      :message="archiveWriteBlockMessage"
      :loading="archiveWriteGuardLoading"
      @confirm="() => void reloadLifecycleState()"
    />
    <div class="tabs">
      <UiButton
        size="sm"
        v-for="tab in RECORD_TABS"
        :key="tab.key"
        :variant="activeType === tab.key ? 'primary' : 'outline'"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </UiButton>
    </div>
    <UiCard v-if="!isDepartmentScoped" title="新增条目">
      <div class="form-row">
        <input v-model="form.recordTitle" class="input input--wide" placeholder="标题" />
        <UiSelect
          size="sm"
          v-if="requiresTeacher"
          v-model="form.teacherUserId"
          allow-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          class="input input--teacher"
          :filter-option="false"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="saving"
          :disabled="saving"
          @click="saveRecord"
        >
          保存
        </UiButton>
      </div>
    </UiCard>
    <UiCard>
      <div class="toolbar">
        <UiButton size="sm" @click="() => void loadPage()"> 刷新 </UiButton>
        <UiButton
          v-if="!isDepartmentScoped"
          size="sm"
          variant="primary"
          @click="importModalOpen = true"
        >
          批量导入
        </UiButton>
        <UiButton
          v-if="!isDepartmentScoped"
          size="sm"
          :loading="applyingExport"
          :disabled="applyingExport"
          @click="openExportApply"
        >
          申请导出
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loadError && !loading && rows.length === 0"
        description="当前筛选无发展记录"
      />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        row-key="id"
        style="margin-top: var(--dp-space-block)"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherUserId'">
            {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
          </template>
          <template v-else-if="column.key === 'affiliationStaffNo'">
            {{ record.affiliationStaffNo || '—' }}
          </template>
          <template v-else-if="column.key === 'recordStatus'">
            {{ recordStatusLabel(record.recordStatus) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record.lifecycleStatus)">
              {{ portfolioLifecycleStatusDisplay(record.lifecycleStatus) }}
            </UiTag>

            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else class="text-neutral-400">—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
            />
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            <span>
              {{
                record.countsInCurrentFacultyStructure === true
                  ? '是'
                  : record.countsInCurrentFacultyStructure === false
                    ? '否'
                    : '—'
              }}
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="!isDepartmentScoped"
              :items="[{ key: 'delete', label: '删除', tone: 'danger', disabled: Boolean(removingId || saving) }]"
              split
              @action="() => removeRecord(record.id)"
            />
            <span v-else class="text-neutral-400">—</span>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      entity-label="发展档案"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DEVELOPMENT_RECORD"
      :context="importContext"
      @success="onImportSuccess"
    />
    <UiDialog
      v-model:open="exportApplyOpen"
      title="申请导出发展档案台账"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="applyingExport"
      @ok="submitExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportPurpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批记录）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
}
.form-row,
.toolbar {
  display: flex;
  gap: var(--dp-space-component-tight);
  align-items: center;
}
.input {
  padding: var(--dp-space-component-tight);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
.input--teacher {
  width: 240px;
  min-width: 200px;
}
</style>
