<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  TrainingPlanChecklistVO,
  TrainingPlanDiagnosisVO,
  TrainingPlanStatusAuditVO,
  TrainingPlanVO,
} from '@/apis/quality/training-plan'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { trainingPlanApi } from '@/apis/quality/training-plan'
import { ConfirmationStatusCode, ConfirmationStatusDescription } from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import UiTimeline from '@/components/ui-guide/ui/UiTimeline.vue'
import UiTimelineItem from '@/components/ui-guide/ui/UiTimelineItem.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useAuthStore } from '@/stores/modules/auth'
import { TrainingPlanStatusActionDescription } from '@/types/enums/training-plan-status-action-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TrainingPlanReviewQueue' })

type ReviewTab = 'pending' | 'published'

const activeTab = ref<ReviewTab>('pending')
const records = ref<TrainingPlanVO[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const drawerOpen = ref(false)
const detailLoading = ref(false)
const selectedPlan = ref<TrainingPlanVO | null>(null)
const checklist = ref<TrainingPlanChecklistVO | null>(null)
const diagnosis = ref<TrainingPlanDiagnosisVO | null>(null)
const audits = ref<TrainingPlanStatusAuditVO[]>([])
const reviewComment = ref('')
const submitting = ref(false)
/** 列表查询代际：Tab/分页切换后丢弃旧响应 */
let pageLoadGeneration = 0
/** 院审抽屉代际：planId + openGeneration，旧详情不得落地 */
let reviewOpenGeneration = 0
const checklistLoadError = ref(false)
const diagnosisLoadError = ref(false)
const auditsLoadError = ref(false)

const authStore = useAuthStore()
const hasConfirmPermission = computed(() => authStore.hasPermission('quality:plan:confirm'))
const hasSubmitPermission = computed(() => authStore.hasPermission('quality:plan:submit'))

const reviewStatus = computed(() =>
  activeTab.value === 'pending'
    ? ConfirmationStatusCode.SUBMITTED
    : ConfirmationStatusCode.CONFIRMED,
)

const columns: ColumnsType = [
  { title: '方案编码', dataIndex: 'planCode', key: 'planCode', width: 145, fixed: 'left' },
  { title: '培养方案', dataIndex: 'planName', key: 'planName', width: 220 },
  { title: '专业', dataIndex: 'programName', key: 'programName', width: 160 },
  { title: '学年', dataIndex: 'schoolYear', key: 'schoolYear', width: 110 },
  { title: '状态', key: 'status', width: 115 },
  { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 170 },
  { title: '滞留', key: 'overdueDays', width: 100 },
  { title: '确认时间', dataIndex: 'confirmedTime', key: 'confirmedTime', width: 170 },
  { title: '操作', key: 'actions', width: 96, fixed: 'right' },
]

const auditActionLabel = TrainingPlanStatusActionDescription

const drawerTitle = computed(() =>
  selectedPlan.value ? `院审：${selectedPlan.value.planName}` : '院审详情',
)
const canConfirm = computed(
  () =>
    hasConfirmPermission.value
    && selectedPlan.value?.confirmationStatus === ConfirmationStatusCode.SUBMITTED,
)
const canRevoke = computed(
  () =>
    hasConfirmPermission.value
    && selectedPlan.value?.confirmationStatus === ConfirmationStatusCode.CONFIRMED,
)
const canRemind = computed(
  () =>
    hasSubmitPermission.value
    && selectedPlan.value?.confirmationStatus === ConfirmationStatusCode.SUBMITTED,
)
const failedChecklistDescription = computed(() => {
  const items = checklist.value?.failedItems ?? []
  if (!items.length) {
    return ''
  }
  return items.map((item) => `${item.code}：${item.message}`).join('；')
})

/** 计算待审方案滞留天数；无提交时间时返回 null。 */
function resolveOverdueDays(submittedAt?: string): number | null {
  if (!submittedAt) return null
  const submittedMs = Date.parse(submittedAt.replace(' ', 'T'))
  if (Number.isNaN(submittedMs)) return null
  const days = Math.floor((Date.now() - submittedMs) / (24 * 60 * 60 * 1000))
  return days < 0 ? 0 : days
}

/** 确认状态展示文案；未设置时返回占位。 */
function confirmationStatusLabel(status?: ConfirmationStatusCode): string {
  if (!status) {
    return '未设置'
  }
  return strictEnumLabel(ConfirmationStatusDescription, status, '培养方案确认状态')
}

async function loadPage(): Promise<void> {
  const generation = ++pageLoadGeneration
  const tab = activeTab.value
  const currentPageNum = pageNum.value
  const currentPageSize = pageSize.value
  loading.value = true
  beginLoad()
  try {
    const page = await trainingPlanApi.page({
      pageNum: currentPageNum,
      pageSize: currentPageSize,
      confirmationStatus: reviewStatus.value,
    })
    if (
      generation !== pageLoadGeneration
      || activeTab.value !== tab
      || pageNum.value !== currentPageNum
      || pageSize.value !== currentPageSize
    ) {
      return
    }
    records.value = page.list
    total.value = page.total
    okLoad()
  } catch (error) {
    if (generation !== pageLoadGeneration) {
      return
    }
    // 失败可见：保留上次成功队列，禁止把失败伪装成空队列
    failLoad()
    showUserError(error, '院审队列加载失败')
  } finally {
    if (generation === pageLoadGeneration) {
      loading.value = false
    }
  }
}

function switchTab(tab: ReviewTab): void {
  if (activeTab.value === tab) return
  activeTab.value = tab
  pageNum.value = 1
  void loadPage()
}

function handlePageChange(page: { current: number, pageSize: number }): void {
  pageNum.value = page.current
  pageSize.value = page.pageSize
  void loadPage()
}

async function openReview(plan: TrainingPlanVO): Promise<void> {
  const openGeneration = ++reviewOpenGeneration
  const planId = plan.id
  selectedPlan.value = plan
  reviewComment.value = ''
  checklist.value = null
  diagnosis.value = null
  audits.value = []
  checklistLoadError.value = false
  diagnosisLoadError.value = false
  auditsLoadError.value = false
  drawerOpen.value = true
  detailLoading.value = true
  try {
    const detail = await trainingPlanApi.detail(planId)
    if (openGeneration !== reviewOpenGeneration) {
      return
    }
    selectedPlan.value = detail
    try {
      const nextChecklist = await trainingPlanApi.checklist(planId)
      if (openGeneration !== reviewOpenGeneration) {
        return
      }
      checklist.value = nextChecklist
      checklistLoadError.value = false
    } catch (error) {
      if (openGeneration !== reviewOpenGeneration) {
        return
      }
      checklist.value = null
      checklistLoadError.value = true
      showUserError(error, '院审检查清单加载失败')
    }
    try {
      const nextDiagnosis = await trainingPlanApi.diagnose(planId)
      if (openGeneration !== reviewOpenGeneration) {
        return
      }
      diagnosis.value = nextDiagnosis
      diagnosisLoadError.value = false
    } catch (error) {
      if (openGeneration !== reviewOpenGeneration) {
        return
      }
      diagnosis.value = null
      diagnosisLoadError.value = true
      showUserError(error, '院审诊断加载失败')
    }
    try {
      const nextAudits = await trainingPlanApi.statusAudits(planId)
      if (openGeneration !== reviewOpenGeneration) {
        return
      }
      audits.value = nextAudits
      auditsLoadError.value = false
    } catch (error) {
      if (openGeneration !== reviewOpenGeneration) {
        return
      }
      audits.value = []
      auditsLoadError.value = true
      showUserError(error, '院审状态审计加载失败')
    }
  } catch (error) {
    if (openGeneration !== reviewOpenGeneration) {
      return
    }
    selectedPlan.value = null
    checklist.value = null
    diagnosis.value = null
    audits.value = []
    checklistLoadError.value = true
    diagnosisLoadError.value = true
    auditsLoadError.value = true
    showUserError(error, '院审详情加载失败')
  } finally {
    if (openGeneration === reviewOpenGeneration) {
      detailLoading.value = false
    }
  }
}

async function confirmPlan(): Promise<void> {
  if (!selectedPlan.value || !canConfirm.value) return
  const planId = selectedPlan.value.id
  const statusVersion = selectedPlan.value.statusVersion
  submitting.value = true
  try {
    const result = await trainingPlanApi.confirm({
      id: planId,
      statusVersion,
    })
    if (selectedPlan.value?.id === planId) {
      selectedPlan.value = {
        ...selectedPlan.value,
        confirmationStatus: result.confirmationStatus,
        statusVersion: result.statusVersion,
      }
    }
    drawerOpen.value = false
    await loadPage()
    if (loadError.value) {
      void message.warning('方案已确认，队列刷新失败；请使用「刷新队列」同步')
    }
  } catch (error) {
    showUserError(error, '培养方案确认发布失败')
  } finally {
    submitting.value = false
  }
}

async function returnPlan(): Promise<void> {
  if (!selectedPlan.value || !canConfirm.value) return
  if (reviewComment.value.trim().length < 10) return
  const planId = selectedPlan.value.id
  const statusVersion = selectedPlan.value.statusVersion
  const comment = reviewComment.value.trim()
  submitting.value = true
  try {
    await trainingPlanApi.returnForRevision({
      id: planId,
      statusVersion,
      comment,
    })
    drawerOpen.value = false
    await loadPage()
    if (loadError.value) {
      void message.warning('方案已退回，队列刷新失败；请使用「刷新队列」同步')
    }
  } catch (error) {
    showUserError(error, '培养方案退回失败')
  } finally {
    submitting.value = false
  }
}

async function revokePlan(): Promise<void> {
  if (!selectedPlan.value || !canRevoke.value) return
  if (reviewComment.value.trim().length < 10) return
  const planId = selectedPlan.value.id
  const statusVersion = selectedPlan.value.statusVersion
  const comment = reviewComment.value.trim()
  submitting.value = true
  try {
    await trainingPlanApi.revoke({
      id: planId,
      statusVersion,
      comment,
    })
    drawerOpen.value = false
    await loadPage()
    if (loadError.value) {
      void message.warning('方案已撤回，队列刷新失败；请使用「刷新队列」同步')
    }
  } catch (error) {
    showUserError(error, '培养方案撤回失败')
  } finally {
    submitting.value = false
  }
}

async function remindPlan(): Promise<void> {
  if (!selectedPlan.value || !canRemind.value) return
  const planId = selectedPlan.value.id
  submitting.value = true
  try {
    const count = await trainingPlanApi.remindReview(planId)
    void message.success(`已向 ${count} 名确认人发送院审催办`)
  } catch (error) {
    showUserError(error, '培养方案院审催办失败')
  } finally {
    submitting.value = false
  }
}

useQualityScopedLoader(loadPage, {
  watchScope: false,
  immediate: true,
  reloadOnActivated: true,
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadPage">
            刷新队列
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <div class="training-plan-review-queue">
      <div class="training-plan-review-queue__tabs">
        <UiButton
          size="sm"
          :variant="activeTab === 'pending' ? 'primary' : 'ghost'"
          @click="switchTab('pending')"
        >
          待院审
        </UiButton>
        <UiButton
          size="sm"
          :variant="activeTab === 'published' ? 'primary' : 'ghost'"
          @click="switchTab('published')"
        >
          已发布方案
        </UiButton>
      </div>

      <UiAlertStrip v-if="activeTab === 'pending'" tone="info" title="待院审方案已锁定结构" />

      <UiAlertStrip v-if="!hasConfirmPermission" tone="error" title="当前账号无培养方案院审权限" />

      <UiDataTable
        pagination-mode="server"
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :total="total"
        :current="pageNum"
        :page-size="pageSize"
        row-key="id"
        flat
        sticky-header
        :load-error="loadError"
        :has-active-filters="activeTab !== 'pending'"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <UiTag
              :tone="
                record.confirmationStatus === ConfirmationStatusCode.CONFIRMED ? 'green' : 'orange'
              "
            >
              {{ confirmationStatusLabel(record.confirmationStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'overdueDays'">
            <template v-if="record.confirmationStatus === ConfirmationStatusCode.SUBMITTED">
              <UiTag :tone="(resolveOverdueDays(record.submittedAt) ?? 0) >= 7 ? 'red' : 'orange'">
                {{ resolveOverdueDays(record.submittedAt) ?? 0 }} 天
              </UiTag>
            </template>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton variant="ghost" size="sm" @click="openReview(record)">审阅</UiButton>
          </template>
        </template>
        <template #empty>
          <UiEmpty
            size="sm"
            :title="activeTab === 'pending' ? '暂无待院审培养方案' : '暂无已发布培养方案'"
          />
        </template>
      </UiDataTable>
    </div>
  </StageWorkbenchShell>

  <UiDrawer
    v-model:open="drawerOpen"
    :title="drawerTitle"
    :width="760"
    :hide-footer="true"
    :closable="true"
  >
    <UiSpin :spinning="detailLoading">
      <template v-if="selectedPlan">
        <div class="training-plan-review-queue__drawer-meta">
          <span>{{ selectedPlan.planCode }}</span>
          <span>{{ selectedPlan.programName }}</span>
          <span>{{ selectedPlan.schoolYear }}</span>
          <UiTag
            :tone="
              selectedPlan.confirmationStatus === ConfirmationStatusCode.CONFIRMED
                ? 'green'
                : 'orange'
            "
          >
            {{ confirmationStatusLabel(selectedPlan.confirmationStatus) }}
          </UiTag>
        </div>

        <UiAlertStrip
          v-if="checklistLoadError"
          tone="error"
          title="发布 Checklist 加载失败"
          description="切换方案或关闭抽屉后重新打开；禁止把失败显示为尚无清单"
        />
        <UiAlertStrip
          v-else-if="checklist && !checklist.passed"
          tone="error"
          :inline="false"
          title="发布 Checklist 未通过"
          :description="failedChecklistDescription"
        />
        <UiAlertStrip v-else-if="checklist?.passed" tone="success" title="发布 Checklist 已通过" />

        <UiAlertStrip
          v-if="diagnosisLoadError"
          tone="error"
          title="院审诊断加载失败"
          description="切换方案或关闭抽屉后重新打开"
        />
        <UiAlertStrip
          v-else-if="diagnosis"
          :tone="diagnosis.checklistPassed ? 'info' : 'warning'"
          :inline="false"
          title="确认风险摘要"
          :description="diagnosis.riskSummary"
        />

        <section class="training-plan-review-queue__section">
          <h4>院审操作</h4>
          <UiTextarea
            v-if="canConfirm || canRevoke"
            v-model="reviewComment"
            :rows="3"
            :placeholder="
              canRevoke ? '撤回原因不少于 10 个字符' : '退回意见不少于 10 个字符；确认发布无需填写'
            "
          />
          <div class="training-plan-review-queue__actions">
            <UiButton
              size="sm"
              v-if="canConfirm"
              variant="primary"
              :loading="submitting"
              @click="confirmPlan"
            >
              确认发布
            </UiButton>
            <UiButton
              size="sm"
              v-if="canConfirm"
              variant="outline"
              status="danger"
              :disabled="reviewComment.trim().length < 10"
              :loading="submitting"
              @click="returnPlan"
            >
              退回整改
            </UiButton>
            <UiButton
              size="sm"
              v-if="canRemind"
              variant="outline"
              :loading="submitting"
              @click="remindPlan"
            >
              催办确认人
            </UiButton>
            <UiButton
              size="sm"
              v-if="canRevoke"
              variant="outline"
              status="danger"
              :disabled="reviewComment.trim().length < 10"
              :loading="submitting"
              @click="revokePlan"
            >
              撤回发布
            </UiButton>
          </div>
        </section>

        <section class="training-plan-review-queue__section">
          <h4>院审审计</h4>
          <UiAlertStrip
            v-if="auditsLoadError"
            tone="error"
            title="院审状态审计加载失败"
            description="切换方案或关闭抽屉后重新打开；禁止把失败显示为尚无审计"
          />
          <UiTimeline v-else-if="audits.length">
            <UiTimelineItem v-for="audit in audits" :key="audit.id">
              <div class="training-plan-review-queue__audit-title">
                {{ auditActionLabel[audit.actionCode] }} · {{ audit.createTime }}
              </div>
              <div class="training-plan-review-queue__audit-meta">
                {{ audit.previousStatus }} → {{ audit.currentStatus }} · 操作人
                {{ audit.operatorUserId }}
              </div>
              <div v-if="audit.comment" class="training-plan-review-queue__audit-comment">
                {{ audit.comment }}
              </div>
            </UiTimelineItem>
          </UiTimeline>
          <UiEmpty v-else size="sm" title="尚无院审审计记录" />
        </section>
      </template>
    </UiSpin>
  </UiDrawer>
</template>

<style scoped lang="scss">
.training-plan-review-queue {
  display: grid;
  gap: var(--dp-space-block);

  &__tabs,
  &__actions,
  &__drawer-meta {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__drawer-meta {
    margin-bottom: var(--dp-space-block);
    color: var(--dp-text-secondary);
  }

  &__section {
    display: grid;
    gap: var(--dp-space-component);
    margin-top: var(--dp-space-component);
    padding-top: var(--dp-space-block);
    border-top: 1px solid var(--dp-border);

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: var(--dp-font-weight-title);
      color: var(--dp-text-primary);
    }
  }

  &__audit-title {
    color: var(--dp-text-primary);
    font-weight: var(--dp-font-weight-emphasis);
  }

  &__audit-meta,
  &__audit-comment {
    margin-top: var(--dp-space-component-xs);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
  }
}
</style>
