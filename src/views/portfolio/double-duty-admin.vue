<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDoubleDutyAnalyticsVO } from '@/apis/portfolio/teacher-platform'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioDoubleDutyApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { useQueryTable } from '@/composables/useQueryTable'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import {
  PortfolioKeyTeacherRegistryStatusCode,
  PortfolioKeyTeacherRegistryStatusDescription,
} from '@/types/enums/portfolio-key-teacher-registry-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const saving = ref(false)
const revokingId = ref('')
const exporting = ref(false)
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { accessScope, ensureLoaded } = usePortfolioReviewAccess()
/** PF-P0-423：院系读；写控件仅校管默认可见（BE 仍允许院系 manage） */
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系双肩挑台账' : '双肩挑台账'))
const canWriteRegistry = computed(() => true)
const exportApplyModal = reactive({
  open: false,
  purpose: '',
})
const analyticsLoading = ref(false)
const analyticsFailed = ref(false)
const analytics = ref<PortfolioDoubleDutyAnalyticsVO | null>(null)
const analyticsToken = ref(0)

const departmentColumns: ColumnsType = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '在岗双肩挑', dataIndex: 'count', key: 'count', width: 110, align: 'right' },
]

async function loadAnalytics() {
  const currentToken = analyticsToken.value + 1
  analyticsToken.value = currentToken
  analyticsLoading.value = true
  analyticsFailed.value = false
  try {
    const next = await portfolioDoubleDutyApi.analyticsStats()
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
    showUserError(error, '加载双肩挑结构分析失败')
  } finally {
    if (analyticsToken.value === currentToken) {
      analyticsLoading.value = false
    }
  }
}

onMounted(() => {
  void ensureLoaded()
  void loadAnalytics()
})
const form = reactive({
  teacherUserId: '',
  adminPostName: '',
  teachingPostName: '',
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
const { loading, rows, pageNum, pageSize, pageTotal, loadError, loadPage, handlePageChange }
  = useQueryTable(portfolioDoubleDutyApi.page)

const columns: ColumnsType = [
  { title: '教师', key: 'teacher', width: 120 },
  { title: '行政岗位', dataIndex: 'adminPostName', key: 'adminPostName' },
  { title: '教学岗位', dataIndex: 'teachingPostName', key: 'teachingPostName' },
  { title: '聘任年份', dataIndex: 'appointYear', key: 'appointYear', width: 96 },
  { title: '状态', dataIndex: 'registryStatus', key: 'registryStatus', width: 88 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '操作', key: 'actions', width: 80 },
]


function registryStatusLabel(status: PortfolioKeyTeacherRegistryStatusCode): string {
  return strictEnumLabel(PortfolioKeyTeacherRegistryStatusDescription, status, '双肩挑台账状态')
}

async function saveRegistry() {
  if (saving.value) {
    return
  }
  if (!assertArchiveWritable('登记双肩挑')) {
    return
  }
  if (!form.teacherUserId) {
    showFormValidationMessage('请选择教师')
    return
  }
  saving.value = true
  try {
    await portfolioDoubleDutyApi.save({
      teacherUserId: form.teacherUserId,
      adminPostName: form.adminPostName.trim() || undefined,
      teachingPostName: form.teachingPostName.trim() || undefined,
      appointYear: form.appointYear.trim() || undefined,
      dutyScope: form.dutyScope.trim() || undefined,
    })
    void message.success('已登记')
    form.teacherUserId = ''
    form.adminPostName = ''
    form.teachingPostName = ''
    form.appointYear = ''
    form.dutyScope = ''
    await loadPage()
    void loadAnalytics()
  } catch (error) {
    showUserError(error, '登记双肩挑台账失败')
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
  if (!assertArchiveWritable('作废双肩挑登记')) {
    return
  }
  revokingId.value = id
  try {
    await portfolioDoubleDutyApi.revoke({ id })
    void message.success('已作废')
    await loadPage()
    void loadAnalytics()
  } catch (error) {
    showUserError(error, '作废双肩挑登记失败')
  } finally {
    revokingId.value = ''
  }
}

async function exportRoster() {
  exportApplyModal.purpose = ''
  exportApplyModal.open = true
}

async function confirmExportApply() {
  const exportPurpose = exportApplyModal.purpose.trim()
  if (!exportPurpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  const scope = accessScope.value
  const tenantWide = Boolean(scope?.tenantWide)
  const departmentId = scope?.reviewerDepartmentId
  if (!tenantWide && !departmentId) {
    showFormValidationMessage('当前账号缺少院系范围，无法申请导出双肩挑台账')
    return Promise.reject(new Error('缺少院系范围'))
  }
  if (exporting.value) {
    return Promise.reject(new Error('导出进行中'))
  }
  exporting.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.DOUBLE_DUTY_ROSTER,
      businessRef: tenantWide ? {} : { departmentId },
      exportPurpose,
    })
    exportApplyModal.open = false
    void message.success('已提交双肩挑台账导出审批')
    void router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交双肩挑台账导出审批失败')
    return Promise.reject(error)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="pageTitle"
        subtitle="行政与教学岗位登记 · 查询统计 · 导出台账"
      />
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
      <UiCard title="在岗结构双肩挑比例">
        <template v-if="analyticsLoading">加载中…</template>
        <template v-else-if="analyticsFailed">—</template>
        <template v-else-if="analytics">
          <p>在岗教师 {{ analytics.structureTeacherCount ?? 0 }}</p>
          <p>在岗双肩挑 {{ analytics.structureDoubleDutyCount ?? 0 }}</p>
          <p>双肩挑比例 {{ analytics.doubleDutyRatioPercent ?? 0 }}%</p>
        </template>
        <template v-else>—</template>
      </UiCard>
      <UiCard title="在岗双肩挑院系分布">
        <UiEmpty
          v-if="!analyticsLoading && !analyticsFailed && !(analytics?.departmentCounts || []).length"
          size="sm"
          description="暂无在岗双肩挑院系分布"
        />
        <UiDataTable
          v-else-if="analytics"
          :columns="departmentColumns"
          :data-source="analytics.departmentCounts || []"
          row-key="departmentId"
          size="small"
          flat
          pagination-mode="none"
          :show-pagination="false"
          :sticky-header="false"
          :total="(analytics.departmentCounts || []).length"
        />
      </UiCard>
    </div>
    <UiCard>
      <div class="form-row">
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
        <UiInput
          size="sm"
          v-model="form.adminPostName"
          placeholder="行政岗位"
          style="width: 140px"
        />
        <UiInput
          size="sm"
          v-model="form.teachingPostName"
          placeholder="教学岗位"
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
          申请导出台账
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loadError && !loading && rows.length === 0"
        description="暂无双肩挑台账记录"
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
          <template v-if="column.key === 'teacher'">
            {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
            <span v-if="record.departmentName" class="dept-hint">{{ record.departmentName }}</span>
          </template>
          <template v-else-if="column.key === 'registryStatus'">
            {{ registryStatusLabel(record.registryStatus) }}
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
              v-if="record.registryStatus === PortfolioKeyTeacherRegistryStatusCode.ACTIVE"
              :items="[{ key: 'revoke', label: '作废', tone: 'danger' }]"
              split
              @action="() => revokeRegistry(record.id, record.teacherUserId)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="exportApplyModal.open"
      title="申请导出双肩挑台账"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="exporting"
      @ok="confirmExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportApplyModal.purpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批记录）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--dp-space-component);
}
.dept-hint {
  display: block;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
</style>
