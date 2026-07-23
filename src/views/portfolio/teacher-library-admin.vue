<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherLibraryBorrowSaveRequest,
  PortfolioTeacherLibraryBorrowStatsVO,
} from '@/apis/portfolio/teacher-platform'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioTeacherLibraryApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioBusinessDataSourceTypeCode } from '@/types/enums/portfolio-business-data-source-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const userStore = useUserStore()
/** 院系路由或非租户管理员：本院系只读口径（PF-P0-421） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系图书借阅' : '图书借阅'))


const stats = ref<PortfolioTeacherLibraryBorrowStatsVO | null>(null)
const form = reactive({
  id: '',
  teacherUserId: '',
  bookTitle: '',
  bookIsbn: '',
  borrowTime: '',
  dueTime: '',
})

const formTeacherId = computed(() => form.teacherUserId || undefined)
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const { loading, rows, pageNum, pageSize, pageTotal, loadError, loadPage, handlePageChange }
  = useQueryTable(portfolioTeacherLibraryApi.page)
const statsLoading = ref(false)
const statsLoadError = ref(false)
const statsRequestToken = ref(0)
const operationKey = ref('')
const operating = computed(() => Boolean(operationKey.value))

function beginOperation(key: string): boolean {
  if (operating.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

async function loadStats() {
  const currentToken = ++statsRequestToken.value
  statsLoading.value = true
  statsLoadError.value = false
  try {
    const result = await portfolioTeacherLibraryApi.stats()
    if (statsRequestToken.value !== currentToken) return
    stats.value = result
  } catch (error) {
    if (statsRequestToken.value !== currentToken) return
    stats.value = null
    statsLoadError.value = true
    showUserError(error, '加载借阅统计失败')
  } finally {
    if (statsRequestToken.value === currentToken) statsLoading.value = false
  }
}

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
  { title: '书名', dataIndex: 'bookTitle', key: 'bookTitle' },
  { title: '书号', dataIndex: 'bookIsbn', key: 'bookIsbn', width: 120 },
  { title: '借阅时间', dataIndex: 'borrowTime', key: 'borrowTime', width: 160 },
  { title: '应还时间', dataIndex: 'dueTime', key: 'dueTime', width: 160 },
  { title: '归还时间', dataIndex: 'returnTime', key: 'returnTime', width: 160 },
  { title: '逾期天数', dataIndex: 'overdueDays', key: 'overdueDays', width: 88, align: 'right' },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '操作', key: 'actions', width: 130, fixed: 'right' },
]

function resetForm() {
  Object.assign(form, {
    id: '',
    teacherUserId: '',
    bookTitle: '',
    bookIsbn: '',
    borrowTime: '',
    dueTime: '',
  })
}

function editBorrow(row: (typeof rows.value)[number]) {
  if (operating.value) return
  if (row.returnTime) {
    showFormValidationMessage('已归还记录不可编辑')
    return
  }
  Object.assign(form, {
    id: row.id,
    teacherUserId: row.teacherUserId,
    bookTitle: row.bookTitle,
    bookIsbn: row.bookIsbn ?? '',
    borrowTime: row.borrowTime ?? '',
    dueTime: row.dueTime ?? '',
  })
}

async function saveBorrow() {
  if (!assertArchiveWritable('登记借阅')) {
    return
  }
  if (!form.teacherUserId || !form.bookTitle.trim()) {
    showFormValidationMessage('请选择教师并填写书名')
    return
  }
  if (!form.borrowTime || !form.dueTime) {
    showFormValidationMessage('请选择借阅时间和应还时间')
    return
  }
  if (
    !dayjs(form.borrowTime).isValid()
    || !dayjs(form.dueTime).isValid()
    || dayjs(form.dueTime).isBefore(dayjs(form.borrowTime))
  ) {
    showFormValidationMessage('应还时间不能早于借阅时间')
    return
  }
  const operation = `borrow:save:${form.id || 'new'}`
  if (!beginOperation(operation)) return
  const request: PortfolioTeacherLibraryBorrowSaveRequest = {
    id: form.id || undefined,
    teacherUserId: form.teacherUserId,
    bookTitle: form.bookTitle.trim(),
    bookIsbn: form.bookIsbn.trim() || undefined,
    borrowTime: form.borrowTime,
    dueTime: form.dueTime,
    dataSource: PortfolioBusinessDataSourceTypeCode.MANUAL,
  }
  try {
    await portfolioTeacherLibraryApi.save(request)
    void message.success('已保存')
    resetForm()
    await Promise.all([loadPage(), loadStats()])
  } catch (error) {
    showUserError(error, '保存借阅记录失败')
  } finally {
    endOperation(operation)
  }
}

async function returnBorrow(row: (typeof rows.value)[number]) {
  // 归还目标教师与表单可能不同：先切到该教师生命周期再预检
  form.teacherUserId = row.teacherUserId
  await reloadLifecycleState()
  if (!assertArchiveWritable('登记归还')) {
    return
  }
  if (row.returnTime) {
    showFormValidationMessage('该记录已归还，不可重复登记')
    return
  }
  if (!row.borrowTime || !row.dueTime) {
    showFormValidationMessage('该记录缺少借阅或应还时间，请先编辑补齐')
    return
  }
  const operation = `borrow:return:${row.id}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认登记归还？',
    content: `确认「${row.bookTitle}」已归还？提交后将退出在借与逾期统计。`,
    type: 'warning',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  const returnTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const overdueDays = Math.max(
    0,
    dayjs(returnTime).startOf('day').diff(dayjs(row.dueTime).startOf('day'), 'day'),
  )
  try {
    await portfolioTeacherLibraryApi.save({
      id: row.id,
      teacherUserId: row.teacherUserId,
      bookTitle: row.bookTitle,
      bookIsbn: row.bookIsbn,
      borrowTime: row.borrowTime,
      dueTime: row.dueTime,
      returnTime,
      overdueDays,
      dataSource: row.dataSource || PortfolioBusinessDataSourceTypeCode.MANUAL,
      remark: row.remark,
    })
    void message.success('已登记归还')
    await Promise.all([loadPage(), loadStats()])
  } catch (error) {
    showUserError(error, '登记归还失败')
  } finally {
    endOperation(operation)
  }
}

async function exportCsv() {
  const operation = 'borrow:export'
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioTeacherLibraryApi.export()
    await downloadPortfolioExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出借阅记录失败')
  } finally {
    endOperation(operation)
  }
}

void loadStats()
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" :title="pageTitle" />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />
    <UiCard>
      <div v-if="stats" class="stats">
        在借 {{ stats.activeBorrowCount }} 册 · 逾期 {{ stats.overdueCount }} 册
      </div>
      <div v-else-if="statsLoadError" class="stats stats--error">借阅统计加载失败</div>
      <div v-else-if="statsLoading" class="stats">借阅统计加载中</div>
      <div class="form-row">
        <template v-if="!isDepartmentScoped">
          <UiSelect
            size="sm"
            v-model="form.teacherUserId"
            allow-search
            allow-clear
            placeholder="搜索教师姓名或工号"
            style="width: 220px"
            :filter-option="false"
            :options="teacherOptions"
            :disabled="operating"
            @search="searchTeachers"
          />
          <UiInput
            size="sm"
            v-model="form.bookTitle"
            placeholder="书名"
            style="width: 200px"
            :disabled="operating"
          />
          <UiInput
            size="sm"
            v-model="form.bookIsbn"
            placeholder="书号"
            style="width: 140px"
            :disabled="operating"
          />
          <UiDatePicker
            size="sm"
            v-model="form.borrowTime"
            :show-time="true"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="借阅时间"
            :disabled="operating"
          />
          <UiDatePicker
            size="sm"
            v-model="form.dueTime"
            :show-time="true"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="应还时间"
            :disabled="operating"
          />
          <UiButton
            size="sm"
            variant="primary"
            :loading="operationKey.startsWith('borrow:save:')"
            :disabled="operating || archiveWriteForbidden"
            @click="saveBorrow"
          >
            {{ form.id ? '保存修改' : '登记借阅' }}
          </UiButton>
          <UiButton size="sm" v-if="form.id" :disabled="operating" @click="resetForm">
            取消编辑
          </UiButton>
        </template>
        <UiButton
          size="sm"
          :loading="operationKey === 'borrow:export'"
          :disabled="operating"
          @click="exportCsv"
        >
          导出
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loading && !loadError && rows.length === 0"
        description="暂无图书借阅记录"
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
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="!isDepartmentScoped"
              :items="[
                ...(!record.returnTime
                  ? [
                    { key: 'edit', label: '编辑', disabled: operating },
                    { key: 'return', label: '归还', disabled: operating },
                  ]
                  : []),
              ]"
              split
              @action="(key) => (key === 'return' ? returnBorrow(record) : editBorrow(record))"
            />
            <span v-else class="text-neutral-400">—</span>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row,
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.stats {
  font-size: 13px;
  color: var(--text-secondary);
}
.stats--error {
  color: var(--dp-error);
}
</style>
