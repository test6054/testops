<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTeacherPkSessionVO } from '@/apis/portfolio/analysis'
import type {
  PortfolioTeacherPkCompareTeacherVO,
  PortfolioTeacherPkCompareVO,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS, PortfolioPortraitDimensionDescription } from '@/apis/portfolio/enums'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { message } from '@/utils/feedback'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import {
  formatPortfolioTeacherPkDisplay,
  portfolioTeacherSelectOptionsFromSummaries,
} from '@/utils/portfolio-teacher-display'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isDepartmentScoped = computed(
  () => route.path.includes('/department/') || !userStore.isTenantAdmin,
)
const pageTitle = computed(() => (isDepartmentScoped.value ? '院系教师对比' : '教师对比'))
const pageSubtitle = computed(() =>
  isDepartmentScoped.value
    ? '本院系多维画像横向对比；导出须审批；禁止用于未授权人事排名'
    : '多维画像横向对比；导出须审批；禁止用于未授权人事排名',
)

const operation = ref<'preview' | 'create' | 'detail' | 'export' | null>(null)
const exportApplyOpen = ref(false)
const exportPurpose = ref('')
const pendingExportSession = ref<PortfolioTeacherPkSessionVO | null>(null)
const historyLoading = ref(false)
const historyLoadFailed = ref(false)
const historyLastSuccessAt = ref<string | null>(null)
const historyRefreshError = ref<string | null>(null)
const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const selectedTeacherIds = ref<string[]>([])
const sessionPurpose = ref('')
const maskMode = ref(true)
const pkResult = ref<PortfolioTeacherPkCompareVO | null>(null)
const sessionRows = ref<PortfolioTeacherPkSessionVO[]>([])
const sessionTotal = ref(0)
const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null
let historyRequestToken = 0
let detailRequestToken = 0
let restoreSessionId: string | null = null

const teacherOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))
const operationPending = computed(() => operation.value !== null)
const historyPagination = computed(() => ({
  current: query.pageNum,
  pageSize: query.pageSize,
  total: sessionTotal.value,
  showSizeChanger: true,
}))
const historyColumns: ColumnsType = [
  { title: '对比用途', dataIndex: 'sessionPurpose', key: 'sessionPurpose', ellipsis: true },
  { title: '教师数', dataIndex: 'teacherCount', key: 'teacherCount', width: 90 },
  { title: '展示范围', key: 'maskMode', width: 110 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '主行动', key: 'actions', width: 130 },
]


function resolveTeacherTitle(teacher: PortfolioTeacherPkCompareTeacherVO): string {
  return formatPortfolioTeacherPkDisplay(teacher.displayName, teacher.teacherNumber)
}

function mergeTeacherOptions(rows: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teachers.value.map((item) => [item.userId, item]))
  for (const row of rows) {
    optionMap.set(row.userId, row)
  }
  teachers.value = Array.from(optionMap.values())
}

async function loadTeachers(keyword?: string) {
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: keyword || undefined,
    })
    mergeTeacherOptions(page.list)
  } catch (error) {
    showUserError(error, '加载教师名册失败')
  }
}

function handleTeacherSearch(value: string) {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function validateTeacherSelection(): boolean {
  if (selectedTeacherIds.value.length < 2 || selectedTeacherIds.value.length > 5) {
    showFormValidationMessage('请选择 2–5 名教师')
    return false
  }
  return true
}

async function previewPkCompare() {
  if (!validateTeacherSelection() || operationPending.value) {
    return
  }
  operation.value = 'preview'
  try {
    pkResult.value = await portfolioAnalysisApi.pkCompare({
      teacherUserIds: selectedTeacherIds.value,
      dimensionCodes: PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS,
      maskMode: maskMode.value,
    })
  } catch (error) {
    showUserError(error, '教师对比预览失败')
  } finally {
    operation.value = null
  }
}

async function createPkSession() {
  if (!validateTeacherSelection() || operationPending.value) {
    return
  }
  const purpose = sessionPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写对比用途')
    return
  }
  operation.value = 'create'
  historyRefreshError.value = null
  try {
    const compare = await portfolioAnalysisApi.createPkSession({
      teacherUserIds: selectedTeacherIds.value,
      dimensionCodes: PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS,
      sessionPurpose: purpose,
      maskMode: maskMode.value,
    })
    pkResult.value = compare
    void message.success('对比会话已保存')
    query.pageNum = 1
    if (compare.sessionId) {
      prependCreatedSession(compare, purpose)
    }
  } catch (error) {
    showUserError(error, '保存教师对比会话失败')
    return
  } finally {
    operation.value = null
  }
  try {
    await loadSessionPage()
    if (historyLoadFailed.value) {
      historyRefreshError.value
        = '对比会话已保存，但历史列表刷新失败；下方可能为陈旧数据。'
    }
  } catch (error) {
    historyRefreshError.value
      = '对比会话已保存，但历史列表刷新失败；下方可能为陈旧数据。'
    showUserError(error, '刷新对比会话历史失败')
  }
}

function prependCreatedSession(compare: PortfolioTeacherPkCompareVO, purpose: string) {
  const sessionId = compare.sessionId
  if (!sessionId) {
    return
  }
  const row: PortfolioTeacherPkSessionVO = {
    id: String(sessionId),
    sessionPurpose: compare.sessionPurpose || purpose,
    teacherCount: compare.teachers?.length ?? selectedTeacherIds.value.length,
    maskMode: Boolean(compare.maskMode),
    createUser: String(userStore.userInfo?.userId ?? ''),
    createTime: compare.comparedTime || new Date().toISOString(),
  }
  const existed = sessionRows.value.some(item => item.id === row.id)
  sessionRows.value = [row, ...sessionRows.value.filter(item => item.id !== row.id)]
  if (!existed) {
    sessionTotal.value += 1
  }
}

async function loadSessionPage() {
  const token = ++historyRequestToken
  historyLoading.value = true
  historyLoadFailed.value = false
  try {
    const page = await portfolioAnalysisApi.pagePkSessions({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      mineOnly: true,
    })
    if (token !== historyRequestToken) {
      return
    }
    sessionRows.value = page.list ?? []
    sessionTotal.value = page.total ?? 0
    historyLastSuccessAt.value = new Date().toISOString()
    historyRefreshError.value = null
  } catch (error) {
    if (token === historyRequestToken) {
      historyLoadFailed.value = true
      showUserError(error, '加载对比会话历史失败')
    }
  } finally {
    if (token === historyRequestToken) {
      historyLoading.value = false
    }
  }
}

function handleHistoryTableChange(event: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(event, DEFAULT_LIST_PAGE_SIZE)
  query.pageNum = pageNum
  query.pageSize = pageSize
  void loadSessionPage()
}

async function restoreSession(row: PortfolioTeacherPkSessionVO) {
  if (operationPending.value) {
    return
  }
  const token = ++detailRequestToken
  restoreSessionId = row.id
  operation.value = 'detail'
  try {
    const detail = await portfolioAnalysisApi.getPkSession({ id: row.id })
    if (token !== detailRequestToken || restoreSessionId !== row.id) {
      return
    }
    pkResult.value = detail
    sessionPurpose.value = detail.sessionPurpose ?? row.sessionPurpose
    maskMode.value = detail.maskMode ?? row.maskMode
  } catch (error) {
    if (token === detailRequestToken && restoreSessionId === row.id) {
      showUserError(error, '恢复对比会话失败')
    }
  } finally {
    if (token === detailRequestToken) {
      operation.value = null
      if (restoreSessionId === row.id) {
        restoreSessionId = null
      }
    }
  }
}

function openPkExportApply(row: PortfolioTeacherPkSessionVO) {
  if (operationPending.value) {
    return
  }
  pendingExportSession.value = row
  exportPurpose.value = ''
  exportApplyOpen.value = true
}

async function submitPkExportApply() {
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  const row = pendingExportSession.value
  if (!row?.id) {
    showFormValidationMessage('缺少对比会话')
    return Promise.reject(new Error('缺少会话'))
  }
  if (operationPending.value) {
    return Promise.reject(new Error('导出申请进行中'))
  }
  operation.value = 'export'
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.TEACHER_PK_COMPARE,
      businessRef: {
        teacherPkSessionId: row.id,
        maskMode: row.maskMode,
      },
      exportPurpose: purpose,
    })
    exportApplyOpen.value = false
    pendingExportSession.value = null
    void message.success('已提交多教师对比分析导出审批，请在导出审批中心下载')
    await router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交多教师对比分析导出审批失败')
    return Promise.reject(error)
  } finally {
    operation.value = null
  }
}

function handleSessionAction(action: string, row: PortfolioTeacherPkSessionVO) {
  if (action === 'restore') {
    void restoreSession(row)
    return
  }
  if (action === 'export') {
    openPkExportApply(row)
  }
}

onMounted(() => {
  void Promise.all([loadTeachers(), loadSessionPage()])
})

onUnmounted(() => {
  historyRequestToken++
  detailRequestToken++
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
    teacherSearchTimer = null
  }
})

const TeacherPkSignalMetrics = computed<SignalMetric[]>(() => {
  const result = pkResult.value
  if (!result) {
    return applySpotlightEmphasis([
      {
        key: 'idle',
        label: 'PK 对比',
        value: '待生成',
        clickable: true,
      },
    ], { primaryKey: 'idle', actionLabel: '预览' })
  }
  return applySpotlightEmphasis([
    {
      key: 'session',
      label: '对比结果',
      value: result.sessionId ? '已生成' : '已预览',
      clickable: true,
    },
  ], { primaryKey: 'session', actionLabel: '刷新预览' })
})

function onTeacherPkSignalClick(_key: string) {
  void previewPkCompare()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="pageTitle"
        :subtitle="pageSubtitle"
      />
    </template>
    <template v-if="TeacherPkSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="TeacherPkSignalMetrics"
        @metric-click="onTeacherPkSignalClick"
      />
    </template>

    <div class="teacher-pk__stack">
      <UiAlertStrip
        dense
        tone="info"
        title="敏感导出须审批"
        description="多教师对比含横向画像，不可直连下载；申请通过后在导出审批中心按 ticket 取回，并受用途、脱敏与有效期约束。"
      />
      <UiCard title="新建对比会话">
        <div class="teacher-pk__form">
          <label class="teacher-pk__field teacher-pk__field--teachers">
            <span>对比教师</span>
            <UiSelect
              size="sm"
              v-model="selectedTeacherIds"
              mode="multiple"
              placeholder="选择 2–5 名教师"
              :options="teacherOptions"
              allow-search
              :filter-option="false"
              option-label-prop="label"
              :disabled="operationPending"
              @focus="
                () => {
                  void loadTeachers()
                }
              "
              @search="handleTeacherSearch"
            />
          </label>
          <label class="teacher-pk__field teacher-pk__field--purpose">
            <span>对比用途</span>
            <UiInput
              size="sm"
              v-model="sessionPurpose"
              :maxlength="200"
              placeholder="如：2026 年校级教学名师候选人评议"
              :disabled="operationPending"
            />
          </label>
          <label class="teacher-pk__mask">
            <UiSwitch size="sm" v-model="maskMode" :disabled="operationPending" />
            <span>脱敏展示</span>
          </label>
          <div class="teacher-pk__actions">
            <UiButton
              size="sm"
              variant="outline"
              :loading="operation === 'preview'"
              :disabled="operationPending"
              @click="
                () => {
                  void previewPkCompare()
                }
              "
            >
              仅预览
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :loading="operation === 'create'"
              :disabled="operationPending"
              @click="
                () => {
                  void createPkSession()
                }
              "
            >
              保存并生成对比
            </UiButton>
          </div>
        </div>
      </UiCard>

      <UiSpin
        :spinning="operation === 'preview' || operation === 'create' || operation === 'detail'"
      >
        <UiAlertStrip v-if="!pkResult" tone="info" size="sm" dense inline :show-icon="false">
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
              <UiTag tone="blue" size="sm">待生成</UiTag>
              <span>请选择 2–5 名教师后预览或保存对比结果</span>
            </span>
          </template>
        </UiAlertStrip>
        <section v-else class="teacher-pk__result" aria-label="教师对比结果">
          <div class="teacher-pk__result-head">
            <div>
              <strong>{{ pkResult.sessionPurpose || '即时对比预览' }}</strong>
              <span>{{ pkResult.comparedTime }}</span>
            </div>
            <UiTag :tone="pkResult.maskMode ? 'blue' : 'gray'">
              {{ pkResult.maskMode ? '已脱敏' : '实名结果' }}
            </UiTag>
          </div>
          <div class="teacher-pk__grid">
            <UiCard
              v-for="teacher in pkResult.teachers"
              :key="teacher.teacherUserId"
              :title="resolveTeacherTitle(teacher)"
            >
              <div
                v-if="
                  teacher.lifecycleStatus
                    || teacher.evaluationHeld
                    || teacher.ownerIdentityLayers?.length
                "
                class="teacher-pk__identity-bar"
              >
                <UiTag
                  v-if="teacher.lifecycleStatus"
                  :tone="portfolioLifecycleTagTone(teacher.lifecycleStatus)"
                  size="sm"
                >
                  {{ portfolioLifecycleStatusDisplay(teacher.lifecycleStatus) }}
                </UiTag>
                <UiTag v-if="teacher.evaluationHeld" tone="orange" size="sm">参评 hold</UiTag>
                <UiTag v-if="teacher.archiveWriteForbidden" tone="red" size="sm">写禁</UiTag>
                <PortfolioOwnerIdentityLayersCell
                  v-if="teacher.ownerIdentityLayers?.length"
                  :layers="teacher.ownerIdentityLayers"
                  :note="teacher.ownerMultiIdentityNote"
                  :row-key="teacher.teacherUserId"
                  show-note
                />
              </div>
              <div class="teacher-pk__archive-count">
                正式档案 {{ teacher.officialArchiveCount }} 份
              </div>
              <table class="teacher-pk__table">
                <thead>
                  <tr>
                    <th>维度</th>
                    <th>得分</th>
                    <th>依据</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="dimension in teacher.dimensionRows" :key="dimension.dimensionCode">
                    <td>
                      {{
                        strictEnumLabel(
                          PortfolioPortraitDimensionDescription,
                          dimension.dimensionCode,
                          '画像维度',
                        )
                      }}
                    </td>
                    <td>{{ dimension.dimensionScore }}</td>
                    <td>{{ dimension.evidenceSummary || '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="teacher.materialRefs?.length" class="teacher-pk__materials">
                <span>材料引用</span>
                <ul>
                  <li v-for="material in teacher.materialRefs" :key="material.recordId">
                    {{ material.categoryName }} · {{ material.updateTime }}
                  </li>
                </ul>
              </div>
            </UiCard>
          </div>
        </section>
      </UiSpin>

      <UiCard title="我的对比会话">
        <UiAlertStrip
          v-if="historyRefreshError"
          tone="warning"
          :message="historyRefreshError"
          class="dp-mb-component"
        />
        <UiAlertStrip
          v-if="historyLoadFailed"
          tone="error"
          class="dp-mb-component"
          title="对比会话历史加载失败"
        />
        <UiDataTable
          row-key="id"
          :columns="historyColumns"
          :data-source="sessionRows"
          :loading="historyLoading"
          :load-error="historyLoadFailed && sessionRows.length === 0"
          :pagination="historyPagination"
          @change="handleHistoryTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'maskMode'">
              <UiTag :tone="record.maskMode ? 'blue' : 'gray'">
                {{ record.maskMode ? '脱敏' : '实名' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :max-visible="2"
                :items="[
                  { key: 'restore', label: '查看', disabled: operationPending },
                  { key: 'export', label: '申请导出', disabled: operationPending },
                ]"
                @action="(action) => handleSessionAction(action, record)"
              />
            </template>
          </template>
          <template #emptyText>
            <UiEmpty size="sm" description="暂无已保存的对比会话" />
          </template>
        </UiDataTable>
      </UiCard>
    </div>
    <UiDialog
      v-model:open="exportApplyOpen"
      title="申请导出多教师对比分析"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="operation === 'export'"
      @ok="submitPkExportApply"
    >
      <UiAlertStrip
        dense
        tone="warning"
        title="导出范围说明"
        description="将导出本会话内 2–5 名教师的已选维度对比结果；须填写真实用途，审批通过后方可下载。"
        class="dp-mb-component"
      />
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
.teacher-pk__stack {
  display: grid;
  gap: var(--dp-space-component);
}

.teacher-pk__form {
  display: grid;
  grid-template-columns: minmax(320px, 1.4fr) minmax(260px, 1fr) auto auto;
  gap: var(--dp-space-component);
  align-items: end;
}

.teacher-pk__field {
  display: grid;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.teacher-pk__mask {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-height: 32px;
  white-space: nowrap;
}

.teacher-pk__actions {
  display: flex;
  gap: var(--dp-space-component-tight);
  justify-content: flex-end;
}

.teacher-pk__result {
  display: grid;
  gap: var(--dp-space-component);
}

.teacher-pk__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
}

.teacher-pk__result-head > div {
  display: grid;
  gap: var(--dp-space-component-xs);
}

.teacher-pk__result-head span {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.teacher-pk__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--dp-space-component);
}

.teacher-pk__identity-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
}

.teacher-pk__archive-count {
  margin-bottom: var(--dp-space-component-tight);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.teacher-pk__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: var(--dp-font-size-sm);
}

.teacher-pk__table th,
.teacher-pk__table td {
  padding: var(--dp-space-component-tight);
  border-bottom: 1px solid var(--dp-border);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.teacher-pk__table th:nth-child(1) {
  width: 26%;
}

.teacher-pk__table th:nth-child(2) {
  width: 18%;
}

.teacher-pk__materials {
  display: grid;
  gap: var(--dp-space-component-tight);
  margin-top: var(--dp-space-component);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
}

.teacher-pk__materials ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight) var(--dp-space-block);
  padding: 0;
  margin: 0;
  list-style: none;
}

@media (max-width: 1180px) {
  .teacher-pk__form {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .teacher-pk__form {
    grid-template-columns: 1fr;
  }

  .teacher-pk__actions {
    justify-content: stretch;
  }

  .teacher-pk__actions > * {
    flex: 1;
  }

  .teacher-pk__result-head {
    align-items: flex-start;
  }
}
</style>
