<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioKeyTeacherAnalyticsVO } from '@/apis/portfolio/teacher-platform'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_OPTIONS,
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryStatusDescription,
  PortfolioKeyTeacherRegistryTypeCode,
} from '@/apis/portfolio/enums'
import { portfolioKeyTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { useUserStore } from '@/stores/modules/user'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const REGISTRY_TABS = PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_OPTIONS.map((item) => ({
  key: item.value,
  label: item.label,
}))

const route = useRoute()
const userStore = useUserStore()
/** PF-P0-423：院系读台账；登记/作废仅校管 */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系骨干/带头人' : '骨干/带头人'))
const canWriteRegistry = computed(() => !isDepartmentScoped.value)

const activeType = ref<PortfolioKeyTeacherRegistryTypeCode>(
  PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER,
)
const saving = ref(false)
const revokingId = ref('')
const exporting = ref(false)
const analyticsLoading = ref(false)
const analyticsFailed = ref(false)
const analytics = ref<PortfolioKeyTeacherAnalyticsVO | null>(null)
const analyticsToken = ref(0)

const departmentColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '在岗骨干', dataIndex: 'count', key: 'count', width: 100, align: 'right' },
]

async function loadAnalytics() {
  const currentToken = analyticsToken.value + 1
  analyticsToken.value = currentToken
  analyticsLoading.value = true
  analyticsFailed.value = false
  try {
    const next = await portfolioKeyTeacherApi.analyticsStats()
    if (analyticsToken.value !== currentToken) {
      return
    }
    analytics.value = next
  } catch (error) {
    if (analyticsToken.value !== currentToken) {
      return
    }
    analyticsFailed.value = true
    analytics.value = null
    showUserError(error, '加载骨干结构分析失败')
  } finally {
    if (analyticsToken.value === currentToken) {
      analyticsLoading.value = false
    }
  }
}

onMounted(() => {
  void loadAnalytics()
})
const form = reactive({
  teacherUserId: '',
  specialtyName: '',
  majorGroupName: '',
  appointYear: '',
  dutyScope: '',
})
const formTeacherId = computed(() => form.teacherUserId || undefined)
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })
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
  portfolioKeyTeacherApi.page({
    ...params,
    registryType: activeType.value,
  }),
)

const columns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
  { title: '专业', dataIndex: 'specialtyName', key: 'specialtyName' },
  { title: '专业群', dataIndex: 'majorGroupName', key: 'majorGroupName', width: 120 },
  { title: '聘任年份', dataIndex: 'appointYear', key: 'appointYear', width: 96 },
  { title: '状态', dataIndex: 'registryStatus', key: 'registryStatus', width: 88 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '操作', key: 'actions', width: 80 },
]


function registryStatusLabel(status: PortfolioKeyTeacherRegistryStatusCode): string {
  return strictEnumLabel(PortfolioKeyTeacherRegistryStatusDescription, status, '重点教师名录状态')
}

async function saveRegistry() {
  if (saving.value) {
    return
  }
  if (!assertArchiveWritable('登记重点教师')) {
    return
  }
  if (!form.teacherUserId) {
    showFormValidationMessage('请选择教师')
    return
  }
  saving.value = true
  try {
    await portfolioKeyTeacherApi.save({
      teacherUserId: form.teacherUserId,
      registryType: activeType.value,
      specialtyName: form.specialtyName.trim() || undefined,
      majorGroupName: form.majorGroupName.trim() || undefined,
      appointYear: form.appointYear.trim() || undefined,
      dutyScope: form.dutyScope.trim() || undefined,
    })
    void message.success('已登记')
    form.teacherUserId = ''
    form.specialtyName = ''
    form.majorGroupName = ''
    form.appointYear = ''
    form.dutyScope = ''
    await loadPage()
    void loadAnalytics()
  } catch (error) {
    showUserError(error, '登记重点教师失败')
  } finally {
    saving.value = false
  }
}

async function revokeRegistry(id: string, teacherUserId?: string) {
  if (revokingId.value || saving.value) {
    return
  }
  if (teacherUserId) {
    form.teacherUserId = teacherUserId
    await reloadLifecycleState()
  }
  if (!assertArchiveWritable('作废重点教师登记')) {
    return
  }
  revokingId.value = id
  try {
    await portfolioKeyTeacherApi.revoke({ id })
    void message.success('已作废')
    await loadPage()
    void loadAnalytics()
  } catch (error) {
    showUserError(error, '作废重点教师登记失败')
  } finally {
    revokingId.value = ''
  }
}

async function exportRoster() {
  if (exporting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioKeyTeacherApi.exportRoster({ registryType: activeType.value })
    await downloadPortfolioExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出重点教师名册失败')
  } finally {
    exporting.value = false
  }
}

function switchType(key: string | number) {
  switch (key) {
    case PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER:
      activeType.value = PortfolioKeyTeacherRegistryTypeCode.PROGRAM_LEADER
      break
    case PortfolioKeyTeacherRegistryTypeCode.KEY_TEACHER:
      activeType.value = PortfolioKeyTeacherRegistryTypeCode.KEY_TEACHER
      break
  }
  search()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="pageTitle" />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="mb-3"
    />
    <div class="analytics-grid mb-3">
      <UiCard title="台账概览">
        <template v-if="analyticsLoading">加载中…</template>
        <template v-else-if="analyticsFailed">结构分析加载失败</template>
        <template v-else-if="analytics">
          <p>台账总数 {{ analytics.totalCount }}</p>
          <p>在册数量 {{ analytics.activeCount }}</p>
        </template>
        <template v-else>暂无分析数据</template>
      </UiCard>
      <UiCard title="在岗结构骨干/带头人比例">
        <template v-if="analyticsLoading">加载中…</template>
        <template v-else-if="analyticsFailed">—</template>
        <template v-else-if="analytics">
          <p>在岗教师 {{ analytics.structureTeacherCount ?? 0 }}</p>
          <p>在岗骨干 {{ analytics.structureKeyTeacherCount ?? 0 }}（{{ analytics.keyTeacherRatioPercent ?? 0 }}%）</p>
          <p>在岗带头人 {{ analytics.structureProgramLeaderCount ?? 0 }}（{{ analytics.programLeaderRatioPercent ?? 0 }}%）</p>
        </template>
        <template v-else>—</template>
      </UiCard>
      <UiCard title="在岗骨干院系分布">
        <UiEmpty
          v-if="!analyticsLoading && !analyticsFailed && !(analytics?.keyTeacherDepartmentCounts || []).length"
          size="sm"
          description="暂无在岗骨干院系分布"
        />
        <UiDataTable
          v-else-if="analytics"
          :columns="departmentColumns"
          :data-source="analytics.keyTeacherDepartmentCounts || []"
          row-key="departmentId"
          size="small"
          flat
          pagination-mode="none"
          :show-pagination="false"
          :sticky-header="false"
          :total="(analytics.keyTeacherDepartmentCounts || []).length"
        />
      </UiCard>
    </div>
    <UiCard>
      <UiSectionTabs
        v-model="activeType"
        :items="REGISTRY_TABS"
        compact
        divided
        class="key-teacher-admin__tabs"
        @change="switchType"
      />
      <div v-if="canWriteRegistry" class="form-row">
        <UiSelect
          size="sm"
          v-model="form.teacherUserId"
          allow-search
          allow-clear
          placeholder="搜索教师姓名或工号"
          style="width: 220px"
          :filter-option="false"
          :options="teacherOptions"
          @search="searchTeachers"
        />
        <UiInput size="sm" v-model="form.specialtyName" placeholder="专业" style="width: 140px" />
        <UiInput
          size="sm"
          v-model="form.majorGroupName"
          placeholder="专业群"
          style="width: 140px"
        />
        <UiInput size="sm" v-model="form.appointYear" placeholder="聘任年份" style="width: 100px" />
        <UiInput size="sm" v-model="form.dutyScope" placeholder="职责范围" style="width: 180px" />
        <UiButton
          size="sm"
          variant="primary"
          :loading="saving"
          :disabled="saving || !!revokingId || archiveWriteForbidden"
          @click="saveRegistry"
        >
          登记
        </UiButton>
        <UiButton size="sm" :loading="exporting" :disabled="exporting" @click="exportRoster">
          导出台账
        </UiButton>
      </div>
      <div v-else class="form-row">
        <UiButton size="sm" :loading="exporting" :disabled="exporting" @click="exportRoster">
          导出台账
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loadError && !loading && rows.length === 0"
        description="当前筛选无骨干教师记录"
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
          <template v-else-if="column.key === 'registryStatus'">
            {{ registryStatusLabel(record.registryStatus) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record.lifecycleStatus)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>

            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
            />
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            <span>{{
              record.countsInCurrentFacultyStructure === true
                ? '是'
                : record.countsInCurrentFacultyStructure === false
                  ? '否'
                  : '—'
            }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="canWriteRegistry && record.registryStatus === PortfolioKeyTeacherRegistryStatusCode.ACTIVE"
              :items="[{ key: 'revoke', label: '作废', tone: 'danger' }]"
              split
              @action="() => revokeRegistry(record.id, record.teacherUserId)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
</style>
