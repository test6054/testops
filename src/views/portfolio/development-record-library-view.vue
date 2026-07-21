<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentRecordStatusCode } from '@/apis/portfolio/enums'
import {
  PortfolioDevelopmentRecordStatusDescription,
  PortfolioDevelopmentRecordTypeCode,
} from '@/apis/portfolio/enums'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const props = defineProps<{
  title: string
  subtitle: string
  recordType: PortfolioDevelopmentRecordTypeCode
  categoryCode?: string
  levelCode?: string
  nationalOnly?: boolean
  readonly?: boolean
}>()

const importModalOpen = ref(false)
const saving = ref(false)
const removingId = ref('')
const exporting = ref(false)
const form = reactive({ recordTitle: '', descriptionText: '', teacherUserId: '' })
const formTeacherId = computed(() => form.teacherUserId || undefined)
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable } =
  usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })
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
    recordType: props.recordType,
    categoryCode: props.categoryCode,
    levelCode: props.levelCode ?? (props.nationalOnly ? 'NATIONAL' : undefined),
  }),
)

const requiresTeacher = computed(
  () => props.recordType === PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
)
const showEditor = computed(() => !props.readonly)

const importContext = computed(() => ({
  defaultRecordType: props.recordType,
  ...(props.categoryCode ? { defaultCategoryCode: props.categoryCode } : {}),
  ...(props.levelCode ? { defaultLevelCode: props.levelCode } : {}),
  ...(props.nationalOnly ? { defaultLevelCode: 'NATIONAL' } : {}),
}))

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
    { title: '级别', dataIndex: 'levelCode', key: 'levelCode', width: 88 },
    { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
    { title: '身份层', key: 'identityLayers', width: 160 },
    { title: '操作', key: 'actions', width: 120 },
  )
  return base
})

function recordStatusLabel(status: PortfolioDevelopmentRecordStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentRecordStatusDescription, status, '发展档案条目状态')
}

function resetForm() {
  form.recordTitle = ''
  form.descriptionText = ''
  form.teacherUserId = ''
}

async function saveRecord() {
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
  if (requiresTeacher.value && !assertArchiveWritable('保存发展记录')) {
    return
  }
  saving.value = true
  try {
    await portfolioDevelopmentRecordApi.save({
      recordType: props.recordType,
      recordTitle: form.recordTitle.trim(),
      categoryCode: props.categoryCode,
      levelCode: props.levelCode,
      descriptionText: form.descriptionText.trim() || undefined,
      teacherUserId: requiresTeacher.value ? form.teacherUserId : undefined,
    })
    void message.success('已保存')
    resetForm()
    await loadPage()
  } catch (error) {
    showUserError(error, '保存发展记录失败')
  } finally {
    saving.value = false
  }
}

async function removeRecord(id: string) {
  if (removingId.value || saving.value) {
    return
  }
  removingId.value = id
  try {
    await portfolioDevelopmentRecordApi.delete({ id })
    void message.success('已删除')
    await loadPage()
  } catch (error) {
    showUserError(error, '删除发展记录失败')
  } finally {
    removingId.value = ''
  }
}

async function exportExcel() {
  if (exporting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioDevelopmentRecordApi.exportExcel({
      recordType: props.recordType,
      categoryCode: props.categoryCode,
      levelCode: props.levelCode ?? (props.nationalOnly ? 'NATIONAL' : undefined),
      nationalOnly: props.nationalOnly,
    })
    await downloadPortfolioExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出发展记录失败')
  } finally {
    exporting.value = false
  }
}

watch(
  () => [props.recordType, props.categoryCode, props.levelCode, props.nationalOnly] as const,
  () => {
    search()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="title" :subtitle="subtitle" />
    </template>
    <UiCard v-if="showEditor" title="新增条目">
      <UiAlertStrip
        v-if="requiresTeacher && archiveWriteForbidden"
        tone="warning"
        :message="archiveWriteBlockMessage || '该教师档案当前禁止写入'"
        class="mb-3"
      />
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
          :disabled="saving || (requiresTeacher && archiveWriteForbidden)"
          @click="saveRecord"
        >
          保存
        </UiButton>
      </div>
    </UiCard>
    <UiCard>
      <div class="toolbar">
        <UiButton size="sm" @click="loadPage"> 刷新 </UiButton>
        <UiButton size="sm" variant="primary" v-if="showEditor" @click="importModalOpen = true">
          批量导入
        </UiButton>
        <UiButton size="sm" :loading="exporting" :disabled="exporting" @click="exportExcel">
          导出表格文件
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
        style="margin-top: 16px"
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
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="
                record.id ||
                record.teacherId ||
                record.teacherUserId ||
                record.subjectTeacherUserId ||
                record.userId
              "
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="showEditor"
              :items="[{ key: 'delete', label: '删除', tone: 'danger' }]"
              split
              @action="() => removeRecord(record.id)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiPlatformExcelImportModal
      v-if="showEditor"
      v-model:open="importModalOpen"
      entity-label="发展档案"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DEVELOPMENT_RECORD"
      :context="importContext"
      @success="loadPage"
    />
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row,
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
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
