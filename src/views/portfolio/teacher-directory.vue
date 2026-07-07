<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherIdentityVO,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { UserStatusEnum } from '@/types/enums/user-status'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS,
  PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS,
  PortfolioTeacherIdentityStatusCode,
  PortfolioTeacherIdentityStatusDescription,
  PortfolioTeacherIdentityTypeCode,
  PortfolioTeacherIdentityTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  portfolioTeacherLibraryApi,
  portfolioTeacherSalaryApi,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { getUserStatusLabel, USER_STATUS_FILTER_OPTIONS } from '@/types/enums/user-status'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'


const listColumns: ColumnsType = [
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 120 },
  { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 120 },
  { title: '账号', dataIndex: 'userName', key: 'userName', width: 140 },
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '职称', dataIndex: 'title', key: 'title', width: 100 },
  { title: '身份标签', key: 'identityTags', width: 160 },
  { title: '账号状态', key: 'userStatus', width: 100 },
  { title: '主身份', key: 'primaryIdentityType', width: 120 },
  { title: '操作', key: 'actions', width: 240, fixed: 'right' },
]

const identityColumns: ColumnsType = [
  { title: '身份类型', key: 'identityType', width: 120 },
  { title: '状态', key: 'identityStatus', width: 80 },
  { title: '聘任编号', dataIndex: 'appointmentNo', key: 'appointmentNo', width: 120 },
  { title: '展示名称', dataIndex: 'displayName', key: 'displayName' },
  { title: '企业/单位', dataIndex: 'enterpriseName', key: 'enterpriseName' },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

interface TeacherFilterModel extends Record<string, unknown> {
  searchText?: string
  title?: string
  identityType?: PortfolioTeacherPageRequest['identityType']
  departmentId?: string
  portfolioOrgId?: string
  status?: UserStatusEnum
}

const { loadTree, departmentOptions, portfolioOrgOptions } = usePortfolioOrgTree()
const { canManageTeacherAi } = usePortfolioTeacherAccess()

const filterForm = reactive<TeacherFilterModel>({
  searchText: '',
  title: '',
  identityType: undefined,
  departmentId: undefined,
  portfolioOrgId: undefined,
  status: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'searchText', type: 'input', label: '关键词', placeholder: '姓名/工号', width: 180 },
  {
    key: 'departmentId',
    type: 'select',
    label: '院系',
    allowClear: true,
    width: 200,
    options: departmentOptions(),
  },
  {
    key: 'portfolioOrgId',
    type: 'select',
    label: '归属扩展组织',
    allowClear: true,
    width: 220,
    options: portfolioOrgOptions(),
  },
  { key: 'title', type: 'input', label: '职称', width: 120 },
  {
    key: 'identityType',
    type: 'select',
    label: '身份类型',
    allowClear: true,
    width: 150,
    options: PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS,
  },
  {
    key: 'status',
    type: 'select',
    label: '账号状态',
    allowClear: true,
    width: 120,
    options: USER_STATUS_FILTER_OPTIONS,
  },
])

const query = reactive<PortfolioTeacherPageRequest>({
  pageNum: 1,
  pageSize: 10,
  searchText: '',
  title: '',
  identityType: undefined,
  departmentId: undefined,
  portfolioOrgId: undefined,
  status: undefined,
})

const list = ref<PortfolioTeacherSummaryVO[]>([])
const total = ref(0)
const loading = ref(false)

const detailVisible = ref(false)
const detail = ref<PortfolioTeacherDetailVO | null>(null)
const salarySummary = ref('')
const librarySummary = ref('')

const identityVisible = ref(false)
const identityMode = ref<'create' | 'edit'>('create')
const identityEditor = reactive<PortfolioTeacherIdentitySaveRequest>({
  teacherUserId: undefined,
  identityType: PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR,
  identityStatus: PortfolioTeacherIdentityStatusCode.ACTIVE,
  appointmentNo: '',
  displayName: '',
  enterpriseName: '',
})

function identityTypeLabel(type?: PortfolioTeacherIdentityVO['identityType']) {
  if (!type) {
    return '—'
  }
  return PortfolioTeacherIdentityTypeDescription[type]
}

function identityStatusLabel(status?: PortfolioTeacherIdentityVO['identityStatus']) {
  if (!status) {
    return '—'
  }
  return PortfolioTeacherIdentityStatusDescription[status]
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioTeacherApi.page({ ...query })
    list.value = page.list
    total.value = Number(page.total)
  } catch (error) {
    showUserError(error, '加载教师名册失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  query.searchText = filterForm.searchText
  query.title = filterForm.title
  query.identityType = filterForm.identityType
  query.departmentId = filterForm.departmentId
  query.portfolioOrgId = filterForm.portfolioOrgId
  query.status = filterForm.status
  loadPage()
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadPage()
}

async function openDetail(row: PortfolioTeacherSummaryVO) {
  try {
    detail.value = await portfolioTeacherApi.get(row.userId)
    detailVisible.value = true
    await loadTeacherExtensions(row.userId)
  } catch (error) {
    showUserError(error, '加载教师详情失败')
  }
}

async function loadTeacherExtensions(userId: string) {
  salarySummary.value = ''
  librarySummary.value = ''
  try {
    const salaryPage = await portfolioTeacherSalaryApi.page({
      teacherUserId: userId,
      pageNum: 1,
      pageSize: 1,
    })
    const latest = salaryPage.list?.[0]
    if (latest) {
      salarySummary.value = `${latest.salaryMonth} 基本 ${latest.baseAmountDisplay ?? '—'}`
    }
    const libStats = await portfolioTeacherLibraryApi.stats({ teacherUserId: userId })
    librarySummary.value = `在借 ${libStats.activeBorrowCount} · 逾期 ${libStats.overdueCount}`
  } catch {
    salarySummary.value = ''
    librarySummary.value = ''
  }
}

async function reloadDetail() {
  if (!detail.value?.userId) {
    return
  }
  detail.value = await portfolioTeacherApi.get(detail.value.userId)
  await loadTeacherExtensions(detail.value.userId)
}

function openIdentityCreate(context: { userId: string, nickName?: string, departmentId?: string }) {
  identityMode.value = 'create'
  identityEditor.teacherUserId = context.userId
  identityEditor.id = undefined
  identityEditor.identityType = PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR
  identityEditor.identityStatus = PortfolioTeacherIdentityStatusCode.ACTIVE
  identityEditor.appointmentNo = ''
  identityEditor.displayName = context.nickName!
  identityEditor.enterpriseName = ''
  identityEditor.anchorDepartmentId = context.departmentId
  identityEditor.anchorPortfolioOrgId = undefined
  identityEditor.titleAtIdentity = ''
  identityEditor.validFrom = undefined
  identityEditor.validTo = undefined
  identityVisible.value = true
}

function openIdentityEdit(identity: PortfolioTeacherIdentityVO) {
  if (!detail.value) {
    return
  }
  identityMode.value = 'edit'
  identityEditor.teacherUserId = detail.value.userId
  identityEditor.id = identity.id
  identityEditor.identityType = identity.identityType
  identityEditor.identityStatus = identity.identityStatus
  identityEditor.appointmentNo = identity.appointmentNo ?? ''
  identityEditor.displayName = identity.displayName ?? ''
  identityEditor.enterpriseName = identity.enterpriseName ?? ''
  identityEditor.anchorDepartmentId = identity.anchorDepartmentId
  identityEditor.anchorPortfolioOrgId = identity.anchorPortfolioOrgId
  identityEditor.titleAtIdentity = identity.titleAtIdentity ?? ''
  identityEditor.validFrom = identity.validFrom
  identityEditor.validTo = identity.validTo
  identityVisible.value = true
}

async function submitIdentity() {
  try {
    await portfolioTeacherApi.saveIdentity({
      id: identityEditor.id,
      teacherUserId: identityEditor.teacherUserId,
      identityType: identityEditor.identityType,
      identityStatus: identityEditor.identityStatus,
      appointmentNo: identityEditor.appointmentNo?.trim() || undefined,
      displayName: identityEditor.displayName?.trim() || undefined,
      enterpriseName: identityEditor.enterpriseName?.trim() || undefined,
      anchorDepartmentId: identityEditor.anchorDepartmentId,
      anchorPortfolioOrgId: identityEditor.anchorPortfolioOrgId,
      titleAtIdentity: identityEditor.titleAtIdentity?.trim() || undefined,
      validFrom: identityEditor.validFrom,
      validTo: identityEditor.validTo,
    })
    message.success(identityMode.value === 'edit' ? '身份已更新' : '身份已保存')
    identityVisible.value = false
    await loadPage()
    if (detailVisible.value && detail.value?.userId === identityEditor.teacherUserId) {
      await reloadDetail()
    }
  } catch (error) {
    showUserError(error, '保存身份失败')
  }
}

const router = useRouter()

function openAiCandidateConfirm(userId: string) {
  router.push({
    path: '/portfolio/ai-candidate-confirm',
    query: { teacherId: userId },
  })
}

function openTeacherHome(userId: string) {
  router.push({
    path: '/portfolio/teacher/home',
    query: { teacherId: userId },
  })
}

function openTeacherArchive(userId: string) {
  router.push({
    path: '/portfolio/teacher/archive',
    query: { teacherId: userId },
  })
}

function openOneTable(userId: string) {
  router.push({
    path: '/portfolio/teacher/one-table',
    query: { teacherId: userId },
  })
}

async function exportRoster() {
  try {
    const result = await portfolioTeacherApi.exportRoster({ ...query })
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error)
  }
}

onMounted(async () => {
  await loadTree(false)
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="教师名册" />
    </template>
    <UiFilterBar
      variant="plain"
      v-model="filterModel"
      :fields="filterFields"
      @search="handleSearch"
    />
    <UiCard>
      <div class="list-toolbar">
        <UiButton @click="exportRoster"> 导出名册 </UiButton>
      </div>
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        pagination-mode="server"
        :columns="listColumns"
        :data-source="list"
        :loading="loading"
        :total="total"
        row-key="userId"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'primaryIdentityType'">
            <UiTag v-if="record.primaryIdentityType" tone="blue">
              {{ identityTypeLabel(record.primaryIdentityType) }}
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityTags'">
            <UiTag
              v-for="tag in record.identityTags ?? []"
              :key="tag"
              tone="gray"
              style="margin-right: 4px"
            >
              {{ identityTypeLabel(tag) }}
            </UiTag>
            <span v-if="!record.identityTags?.length">—</span>
          </template>
          <template v-else-if="column.key === 'userStatus'">
            <span v-if="record.status">
              {{ getUserStatusLabel(record.status) }}
            </span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction @click="openDetail(record)"> 详情 </UiTextAction>
            <UiTextAction @click="openTeacherHome(record.userId)"> 首页 </UiTextAction>
            <UiTextAction @click="openTeacherArchive(record.userId)"> 档案 </UiTextAction>
            <UiTextAction @click="openOneTable(record.userId)"> 一张表 </UiTextAction>
            <UiTextAction
              v-if="canManageTeacherAi(record.userId, true)"
              @click="openAiCandidateConfirm(record.userId)"
            >
              AI 确认
            </UiTextAction>
            <UiTextAction
              @click="
                openIdentityCreate({
                  userId: record.userId,
                  nickName: record.nickName,
                  departmentId: record.departmentId,
                })
              "
            >
              身份
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDrawer v-model:open="detailVisible" title="教师详情" width="640" hide-footer>
      <template v-if="detail">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="工号">
            {{ detail.teacherNumber ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="姓名">
            {{ detail.nickName }}
          </a-descriptions-item>
          <a-descriptions-item label="账号">
            {{ detail.userName ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="院系">
            {{ detail.departmentName ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="职称">
            {{ detail.title ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="手机">
            {{ detail.mobile ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="邮箱" :span="2">
            {{ detail.email ?? '—' }}
          </a-descriptions-item>
        </a-descriptions>
        <a-descriptions
          v-if="salarySummary || librarySummary"
          :column="1"
          size="small"
          bordered
          style="margin-top: 16px"
        >
          <a-descriptions-item v-if="salarySummary" label="工资摘要">
            {{ salarySummary }}
          </a-descriptions-item>
          <a-descriptions-item v-if="librarySummary" label="图书借阅">
            {{ librarySummary }}
          </a-descriptions-item>
        </a-descriptions>
        <div class="teacher-directory__identity-header">
          <h4>扩展身份</h4>
          <UiButton
            size="sm"
            @click="
              openIdentityCreate({
                userId: detail.userId,
                nickName: detail.nickName,
                departmentId: detail.departmentId,
              })
            "
          >
            新增身份
          </UiButton>
        </div>
        <UiDataTable
          :columns="identityColumns"
          :data-source="detail.identities"
          row-key="id"
          :pagination="false"
          flat
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'identityType'">
              {{ identityTypeLabel(record.identityType) }}
            </template>
            <template v-else-if="column.key === 'identityStatus'">
              <UiTag :tone="record.identityStatus === 'ACTIVE' ? 'green' : 'gray'">
                {{ identityStatusLabel(record.identityStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="openIdentityEdit(record)"> 编辑 </UiTextAction>
            </template>
          </template>
          <template #empty>
            <UiEmpty description="暂无扩展身份" />
          </template>
        </UiDataTable>
      </template>
    </UiDrawer>
    <a-modal
      v-model:open="identityVisible"
      :title="identityMode === 'edit' ? '编辑教师身份' : '新增教师身份'"
      @ok="submitIdentity"
    >
      <a-form layout="vertical">
        <a-form-item label="身份类型" required>
          <a-select
            v-model:value="identityEditor.identityType"
            :options="PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS"
          />
        </a-form-item>
        <a-form-item label="身份状态" required>
          <a-select
            v-model:value="identityEditor.identityStatus"
            :options="PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS"
          />
        </a-form-item>
        <a-form-item label="聘任编号">
          <a-input v-model:value="identityEditor.appointmentNo" />
        </a-form-item>
        <a-form-item label="展示名称">
          <a-input v-model:value="identityEditor.displayName" />
        </a-form-item>
        <a-form-item label="企业/单位">
          <a-input v-model:value="identityEditor.enterpriseName" />
        </a-form-item>
        <a-form-item label="归属院系">
          <a-select
            v-model:value="identityEditor.anchorDepartmentId"
            allow-clear
            :options="departmentOptions()"
          />
        </a-form-item>
        <a-form-item label="归属扩展组织 ID">
          <a-select
            v-model:value="identityEditor.anchorPortfolioOrgId"
            allow-clear
            :options="portfolioOrgOptions()"
          />
        </a-form-item>
        <a-form-item label="该身份下职称/职务">
          <a-input v-model:value="identityEditor.titleAtIdentity" />
        </a-form-item>
        <a-form-item label="有效起始">
          <a-input v-model:value="identityEditor.validFrom" placeholder="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="有效截止">
          <a-input v-model:value="identityEditor.validTo" placeholder="YYYY-MM-DD" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.list-toolbar {
  margin-bottom: 12px;
}
.teacher-directory__identity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 8px;

  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
