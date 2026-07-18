<template>
  <StageWorkbenchShell class="score-publish-page">
    <template #context>
      <ContextBar layout="workbench" show-title title="成绩发布">
        <template #status>
          <UiTag v-if="scoresFullyPublished" tone="green" size="sm">已全部发布</UiTag>
          <UiTag v-else-if="hasPendingAbsence" tone="orange" size="sm">缺考待确认</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goExportTasks"> 导出任务 </UiButton>
          <UiButton variant="ghost" size="sm" @click="goScoreConfirm"> 返回成绩确认 </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!canBulkPublish"
            @click="openBulkPublishModal"
          >
            <template #icon><ThunderboltOutlined /></template>
            全场发布
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand :metrics="publishSignalMetrics" variant="panel" compact />
    </template>

    <ExamSelectGateStrip
      v-if="!selectedExamId"
      body="请从考试列表进入工作台后再发布成绩"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <ScoreReleaseStepPipeline
        :overview="effectiveFinalScoreOverview"
        :all-scores-published="scoresFullyPublished"
      />

      <ScoreAnalyticsStatusFlow
        v-if="scoreAnalyticsFlowSteps.length > 0"
        :steps="scoreAnalyticsFlowSteps"
      />

      <UiAlertStrip
        v-if="isPublishGateVisible('delayedAutoConfirm')"
        tone="error"
        title="延迟自动确认连续失败"
        :description="blockedDelayedAutoConfirmNotice"
        dense
        inline
        class="score-publish__alert"
      >
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goScoreConfirm"> 前往成绩确认 </UiButton>
          <UiButton variant="ghost" size="sm" @click="goDelayedConfirmTasks">
            查看处理任务
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="isPublishGateVisible('pendingAbsence')"
        tone="warning"
        title="仍有缺考记录待确认"
        :description="`当前还有 ${pendingAbsenceCountForDisplay} 条待确认缺考，发布前须完成核对。`"
        dense
        inline
        class="score-publish__alert"
      >
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goAbsenceConfirm"> 前往缺考确认 </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="isPublishGateVisible('scoreZero')"
        tone="warning"
        title="缺考计零终分待补齐"
        :description="`本场有 ${missingAbsenceScoreZeroFinalCount} 名已确认计零的缺考生尚未写入正式零分终分，全场发布前须先补齐。`"
        dense
        inline
        class="score-publish__alert"
      >
        <template #actions>
          <UiButton
            variant="primary"
            size="sm"
            :loading="repairingScoreZero"
            @click="handleRepairScoreZero"
          >
            一键补齐计零终分
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goAbsenceConfirm"> 前往缺考确认 </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="isPublishGateVisible('risk')"
        tone="warning"
        title="仍有成绩风险未复核"
        :description="`当前有 ${effectiveFinalScoreOverview?.blockedCount ?? 0} 项成绩风险未处置，须先在成绩确认页完成集中复核后再发布。`"
        dense
        inline
        class="score-publish__alert"
      >
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goScoreConfirm">
            前往成绩确认复核
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="isPublishGateVisible('corrected')"
        tone="warning"
        title="存在已更正未重发布成绩"
        :description="correctedRepublishNotice"
        dense
        inline
        class="score-publish__alert"
      >
        <template #actions>
          <UiButton variant="outline" size="sm" @click="filterCorrectedOnly"> 仅看已更正 </UiButton>
        </template>
      </UiAlertStrip>

      <div v-if="publishSecondaryGateKeys.length > 0" class="score-publish__more-gates">
        <button
          type="button"
          class="score-publish__more-gates-toggle"
          @click="publishSecondaryGatesExpanded = !publishSecondaryGatesExpanded"
        >
          {{
            publishSecondaryGatesExpanded
              ? '收起其余发布条件'
              : `还有 ${publishSecondaryGateKeys.length} 项发布条件`
          }}
        </button>
        <span v-if="!publishSecondaryGatesExpanded" class="score-publish__more-gates-summary">
          {{ publishSecondaryGateSummary }}
        </span>
      </div>

      <ExamArchiveGateBanner
        ref="gateBannerRef"
        :exam-id="selectedExamId"
        compact
        show-class-progress-table
        :scores-fully-published="scoresFullyPublished"
        @go-close-exam="goExamListForClose"
        @loaded="onExamArchiveGateLoaded"
      />

      <WorkbenchSurfaceCard flush class="score-publish__table-section">
        <div class="score-publish__table-shell">
          <h3 class="score-publish__table-title">考生成绩</h3>
          <UiSkeletonState v-if="finalScoreOverviewLoading" :rows="1" compact />
          <UiSectionTabs
            v-else
            v-model="statusTabKey"
            :items="statusTabItems"
            compact
            class="score-publish__status-tabs"
            @change="handleStatusTabChange"
          />
          <div class="score-publish__table-toolbar">
            <UiFilterBar
              v-model="scoreFilterModel"
              :fields="scoreFilterFields"
              search-text="查询"
              @search="handleSearch"
              @reset="handleReset"
            />
            <div v-if="showIncompleteClassChip" class="score-publish__filter-chips">
              <button
                type="button"
                class="score-publish__filter-chip"
                :class="{
                  'score-publish__filter-chip--active': scoreFilterForm.unpublishedBoundOnly,
                }"
                @click="toggleIncompleteClassFilter"
              >
                仅看未齐班级
              </button>
            </div>
          </div>

          <UiDataTable
            v-model:current="pagination.current"
            v-model:page-size="pagination.pageSize"
            pagination-mode="server"
            :columns="columns"
            :data-source="candidates"
            :loading="loading"
            :total="pagination.total"
            flat
            row-key="candidateRosterId"
            size="middle"
            @page-change="handlePageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'studentNo'">
                <span class="score-summary-table__mono">{{
                  candidates[index].studentNo || '—'
                }}</span>
              </template>
              <template v-else-if="column.key === 'studentName'">
                <span class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ candidates[index].studentName || '—' }}</span>
                  <UiTag
                    v-if="candidates[index].absenceScoreZero"
                    tone="orange"
                    size="sm"
                    title="缺考计零合成卷，无扫描影像"
                  >
                    缺考计零
                  </UiTag>
                </span>
              </template>
              <template v-else-if="column.key === 'examScore'">
                <span v-if="candidates[index].examScore != null" class="score-summary-table__score">
                  {{ candidates[index].examScore }}
                </span>
                <span
                  v-else-if="candidates[index].estimatedExamScore != null"
                  class="score-finalize__hint"
                >
                  预估 {{ candidates[index].estimatedExamScore }}
                </span>
                <span v-else class="score-finalize__hint">—</span>
              </template>
              <template v-else-if="column.key === 'dailyScore'">
                <span
                  v-if="candidates[index].dailyScore != null"
                  class="score-summary-table__score"
                >
                  {{ candidates[index].dailyScore }}
                </span>
                <span v-else class="score-publish__hint">—</span>
              </template>
              <template v-else-if="column.key === 'finalScore'">
                <span
                  v-if="candidates[index].finalScore != null"
                  class="score-summary-table__score score-summary-table__score--total"
                >
                  {{ candidates[index].finalScore }}
                </span>
                <span
                  v-else-if="candidates[index].estimatedTotalScore != null"
                  class="score-finalize__hint"
                >
                  预估 {{ candidates[index].estimatedTotalScore }}
                </span>
                <span v-else class="score-finalize__hint">—</span>
              </template>
              <template v-else-if="column.key === 'finalScoreStatus'">
                <UiTag :tone="finalScoreStatusTone(candidates[index].finalScoreStatus)" size="sm">
                  {{ finalScoreStatusLabel(candidates[index].finalScoreStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'confirmedTime'">
                {{ formatDateTime(candidates[index].confirmedTime) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  v-if="candidates[index].paperInstanceId"
                  :items="buildPublishActions(candidates[index])"
                  split
                  @action="(key) => handlePublishRowAction(key, candidates[index])"
                />
                <span v-else class="score-publish__hint">—</span>
              </template>
            </template>
          </UiDataTable>
        </div>
      </WorkbenchSurfaceCard>
    </template>

    <!-- 成绩明细 Drawer -->
    <UiDrawer
      :open="detailOpen"
      title="试卷成绩明细"
      :width="640"
      hide-footer
      @update:open="(v: boolean) => (detailOpen = v)"
      @close="detailOpen = false"
    >
      <UiSkeletonState v-if="detailLoading" variant="card" compact />
      <UiEmpty size="sm" v-else-if="!paperScore" description="暂无成绩明细" />
      <div v-else>
        <UiAlertStrip
          v-if="detailCandidate?.absenceScoreZero"
          tone="info"
          title="缺考计零合成卷"
          description="该生为缺考计零，本卷无扫描影像与题目批改明细，正式成绩为 0 分；确认后可直接发布。"
          dense
          inline
          style="margin-bottom: 12px"
        />
        <UiDescriptions :column="2" size="small" bordered class="score-publish__detail-summary">
          <UiDescriptionsItem label="答卷">
            {{ detailCandidate?.paperDisplay.primaryText }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="班级">
            {{ detailCandidate?.studentClassName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="hasDailyScoreConfig" label="考试分">
            <span class="score-summary-table__score">{{
              formatScorePoints(paperScore.examScore ?? paperScore.estimatedExamScore)
            }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="hasDailyScoreConfig" label="日常分">
            <span class="score-summary-table__score">{{
              formatScorePoints(paperScore.dailyScore)
            }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem :label="hasDailyScoreConfig ? '总成绩' : '总分'">
            <span class="score-summary-table__score score-summary-table__score--total">
              {{ formatScorePoints(paperScore.totalScore ?? paperScore.estimatedTotalScore) }}
            </span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="最终状态" :span="2">
            <UiTag :tone="finalScoreStatusTone(paperScore.finalScoreStatus)" size="sm">
              {{ finalScoreStatusLabel(paperScore.finalScoreStatus) }}
            </UiTag>
          </UiDescriptionsItem>
        </UiDescriptions>

        <UiAlertStrip
          v-if="paperTotalScoreCorrectionNotice"
          tone="warning"
          title="本卷已经总分更正"
          :description="paperTotalScoreCorrectionNotice"
          dense
          inline
          class="score-publish__detail-correction-alert"
          style="margin: 12px 0"
        />

        <h4 class="score-publish__detail-section-title">题目得分明细</h4>
        <UiDataTable
          pagination-mode="none"
          :columns="paperItemColumns"
          :data-source="paperQuestions"
          :show-pagination="false"
          :sticky-header="false"
          flat
          :total="paperQuestions.length"
          row-key="layoutQuestionId"
          size="small"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'questionNo'">
              <UiTag tone="blue" size="sm">{{ paperQuestions[index].questionNo }}</UiTag>
            </template>
            <template v-else-if="column.key === 'teacherReviewScore'">
              <span
                v-if="paperQuestions[index].teacherReviewScore != null"
                class="score-summary-table__score"
              >
                {{ paperQuestions[index].teacherReviewScore }}
              </span>
              <span v-else class="score-publish__hint">-</span>
            </template>
          </template>
        </UiDataTable>
      </div>
    </UiDrawer>

    <!-- 撤回成绩 Drawer -->
    <UiDrawer
      :open="withdrawOpen"
      :title="withdrawModalTitle"
      :width="520"
      :confirm-loading="withdrawing"
      :hide-footer="false"
      @update:open="(v: boolean) => (withdrawOpen = v)"
      @close="withdrawOpen = false"
      @confirm="handleWithdraw"
    >
      <UiForm layout="vertical">
        <UiFormItem label="考生">
          <UiInput
            size="sm"
            :value="withdrawCandidate ? withdrawCandidate.paperDisplay.primaryText : ''"
            disabled
          />
        </UiFormItem>
        <UiFormItem label="撤回原因" required>
          <UiTextarea
            size="sm"
            v-model="withdrawReason"
            placeholder="请输入撤回原因（必填）"
            :rows="3"
            :max-length="200"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <!-- 全场发布 Drawer：后端按考试全场口径筛选并逐卷发布 -->
    <UiDrawer
      :open="bulkOpen"
      title="全场发布成绩"
      :width="720"
      :mask-closable="!bulkRunning"
      :closable="!bulkRunning"
      :hide-footer="false"
      @update:open="
        (v: boolean) => {
          if (!bulkRunning) bulkOpen = v
        }
      "
      @close="bulkOpen = false"
    >
      <div v-if="finalScoreOverview" class="score-publish__bulk-stats analytics-stats">
        <div v-for="item in bulkModalStatItems" :key="item.key" class="analytics-stats__card">
          <div class="analytics-stats__value" :class="bulkModalValueClass(item.valClass)">
            {{ item.value }}
          </div>
          <div class="analytics-stats__label">{{ item.label }}</div>
        </div>
      </div>
      <div v-if="bulkResult" class="score-publish__bulk-result">
        <UiProgressBar
          :percent="bulkResultPercent"
          :color="
            bulkResult.failureCount > 0 || bulkResult.remainingCount > 0
              ? 'var(--dp-error)'
              : 'var(--dp-success)'
          "
        />
        <div class="score-publish__bulk-meta">
          本次成功 {{ bulkResult.successCount }} 条 · 失败 {{ bulkResult.failureCount }} 条 ·
          全场已发布 {{ bulkResult.alreadyPublishedCount }} / {{ bulkResult.totalCandidateCount }}
        </div>
      </div>
      <UiList v-if="bulkResult?.failures.length" size="small" class="score-publish__bulk-list">
        <UiListItem v-for="(item, index) in bulkResult.failures" :key="item.paperInstanceId">
          <UiListItemMeta>
            <template #title> 试卷实例 {{ item.paperInstanceId }} </template>
            <template #description>
              <UiTag tone="red" size="sm" class="score-publish__bulk-error-tag">
                {{ item.code }}
              </UiTag>
              {{ item.message }}
            </template>
          </UiListItemMeta>
          <UiTag tone="red" size="sm">失败 {{ index + 1 }}</UiTag>
        </UiListItem>
      </UiList>
      <template #footer>
        <UiButton variant="outline" size="md" :disabled="bulkRunning" @click="bulkOpen = false">
          取消
        </UiButton>
        <UiButton
          variant="primary"
          size="md"
          :loading="bulkRunning"
          :disabled="!canBulkPublish"
          @click="runBulkPublish"
        >
          确认全场发布
        </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamPaperScoreResponse, ExamQuestionScoreResponse } from '@/apis/mark/exam-grade'
import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type {
  ExamScoreSummaryItemResponse,
  FinalScoreBatchPublishResponse,
  FinalScoreRiskOverviewResponse,
} from '@/apis/mark/exam-score'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { ScoreStatusTabKey } from '@/utils/score-workbench-analytics'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { repairScoreZeroFinalScores } from '@/apis/mark/absence'
import { getExamDetail } from '@/apis/mark/exam'
import { getPaperScore } from '@/apis/mark/exam-grade'
import { getScorePanel } from '@/apis/mark/exam-progress'
import {
  batchPublishFinalScores,
  getFinalScoreRiskOverview,
  pageExamScoreSummary,
  publishFinalScore,
  withdrawFinalScore,
} from '@/apis/mark/exam-score'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import ExamArchiveGateBanner from '@/components/archive-volume/ExamArchiveGateBanner.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiListItem from '@/components/ui-guide/ui/UiListItem.vue'
import UiListItemMeta from '@/components/ui-guide/ui/UiListItemMeta.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import ScoreAnalyticsStatusFlow from '@/components/workbench/ScoreAnalyticsStatusFlow.vue'
import ScoreReleaseStepPipeline from '@/components/workbench/ScoreReleaseStepPipeline.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useScorePublishPreconditions } from '@/composables/useScorePublishPreconditions'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { buildExamScoreSummaryTableColumns } from '@/utils/exam-score-summary-table-columns'
import { formatDateTime } from '@/utils/format'
import { isExamScoresFullyPublished } from '@/utils/score-release-readiness'
import {
  buildScoreAnalyticsFlowSteps,
  buildScoreBulkPublishModalStatItems,
  buildScoreConfirmStatusTabItems,
  SCORE_STATUS_TAB_ALL,
} from '@/utils/score-workbench-analytics'
import { buildScorePublishSignalMetrics } from '@/utils/score-workbench-signal'
import { toSignalMetrics } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScorePublish' })

function finalScoreStatusTone(value: FinalScoreStatusCode) {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, value, '最终成绩状态')
}

function finalScoreStatusLabel(value: FinalScoreStatusCode): string {
  return strictEnumLabel(FinalScoreStatusDescription, value, '最终成绩状态')
}

const scoreFilterForm = reactive<{
  keyword: string
  classId?: string
  unpublishedBoundOnly: boolean
}>({
  keyword: '',
  classId: undefined,
  unpublishedBoundOnly: false,
})

const statusTabKey = ref<ScoreStatusTabKey>(SCORE_STATUS_TAB_ALL)

const examArchiveGate = ref<ArchiveVolumeExamGateResponse | null>(null)

const scoreFilterModel = computed<Record<string, unknown>>({
  get: () => scoreFilterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(scoreFilterForm, value)
  },
})

const scoreFilterFields = computed<FilterField[]>(() => {
  const classOptions = (examArchiveGate.value?.classPublishProgress ?? []).map((item) => ({
    label: item.className?.trim() || (item.classId ? `班级 ${item.classId}` : '未分班'),
    value: item.classId,
  }))
  const fields: FilterField[] = [
    {
      key: 'keyword',
      type: 'input',
      placeholder: '按学号 / 姓名搜索',
      allowClear: true,
      width: 240,
      inputPrefixIcon: 'search',
      triggerSearchOnChange: false,
    },
  ]
  if (classOptions.length > 0) {
    fields.push({
      key: 'classId',
      type: 'select',
      placeholder: '按班级过滤',
      allowClear: true,
      width: 200,
      options: classOptions,
    })
  }
  return fields
})

const showIncompleteClassChip = computed(
  () => (examArchiveGate.value?.unpublishedBoundPaperCount ?? 0) > 0,
)

const correctedRepublishNotice = computed(() => {
  const count = finalScoreOverview.value?.correctedCount ?? 0
  if (count <= 0) {
    return undefined
  }
  return `有 ${count} 名考生成绩处于「已更正」状态，学生端不可见。请筛选后逐份重新发布。`
})

const blockedDelayedAutoConfirmNotice = computed(() => {
  const panel = scorePanel.value
  if (!panel || panel.manualFinalScoreConfirmRequired) {
    return undefined
  }
  const blocked = panel.blockedDelayedFinalScoreConfirmCount
  if (blocked <= 0) {
    return undefined
  }
  return `有 ${blocked} 份答卷延迟自动确认连续失败。已确认卷仍可单卷发布；未确认卷请回成绩确认页逐份确认，或查看批改进度中的任务诊断。`
})

function filterCorrectedOnly(): void {
  statusTabKey.value = FinalScoreStatusCode.CORRECTED
  scoreFilterForm.unpublishedBoundOnly = false
  pagination.current = 1
  void loadCandidates()
}

const router = useRouter()
const { goScoreConfirm, goExportTasks } = useScoreReleaseNavigation()

function goDelayedConfirmTasks(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceMarkingReviewProgress',
    params: { examId: selectedExamId.value },
    query: { taskType: 'DELAYED_FINAL_SCORE_CONFIRM' },
  })
}

const gateBannerRef = ref<InstanceType<typeof ExamArchiveGateBanner> | null>(null)

async function refreshArchiveGate(): Promise<void> {
  await gateBannerRef.value?.refresh()
}

function onExamArchiveGateLoaded(gate: ArchiveVolumeExamGateResponse): void {
  examArchiveGate.value = gate
}

function toggleIncompleteClassFilter(): void {
  scoreFilterForm.unpublishedBoundOnly = !scoreFilterForm.unpublishedBoundOnly
  if (scoreFilterForm.unpublishedBoundOnly) {
    scoreFilterForm.classId = undefined
  }
  pagination.current = 1
  void loadCandidates()
}

function goExamListForClose(): void {
  void router.push({ name: 'TeacherExamList' })
}

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const examDetail = ref<ExamDetailResponse | null>(null)

async function loadExamDetail(): Promise<void> {
  if (!selectedExamId.value) {
    examDetail.value = null
    return
  }
  try {
    examDetail.value = await getExamDetail(selectedExamId.value)
  } catch {
    examDetail.value = null
  }
}

const hasDailyScoreConfig = computed(() => examDetail.value?.dailyScoreFull != null)

function formatScorePoints(score: number | null | undefined): string {
  return score != null ? `${score} 分` : '—'
}

const columns = computed(() =>
  buildExamScoreSummaryTableColumns('publish', hasDailyScoreConfig.value),
)

// ─── 数据加载（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemResponse[]>([])
const loading = ref(false)
let candidatesRequestSequence = 0
const finalScoreOverview = ref<FinalScoreRiskOverviewResponse | null>(null)
const scorePanel = ref<ExamWorkbenchScorePanelResponse | null>(null)
const finalScoreOverviewLoading = ref(false)

const effectiveFinalScoreOverview = computed(
  () => finalScoreOverview.value ?? scorePanel.value?.riskOverview ?? null,
)

const statusTabItems = computed(() =>
  buildScoreConfirmStatusTabItems(effectiveFinalScoreOverview.value),
)

const scoresFullyPublished = computed(() =>
  isExamScoresFullyPublished(effectiveFinalScoreOverview.value, examArchiveGate.value),
)

const {
  pendingAbsenceCount,
  refreshPendingAbsenceCount,
  ensureScorePublishPreconditions,
  ensureSinglePaperPublishPreconditions,
  goToAbsenceConfirm: goAbsenceConfirm,
} = useScorePublishPreconditions({
  examId: selectedExamId,
  riskOverview: effectiveFinalScoreOverview,
  scorePanel,
})

const pendingAbsenceCountForDisplay = computed(() => pendingAbsenceCount.value ?? 0)
const hasPendingAbsence = computed(() => pendingAbsenceCountForDisplay.value > 0)

const missingAbsenceScoreZeroFinalCount = computed(
  () => effectiveFinalScoreOverview.value?.missingAbsenceScoreZeroFinalCount ?? 0,
)

const repairingScoreZero = ref(false)

async function handleRepairScoreZero(): Promise<void> {
  if (!selectedExamId.value || repairingScoreZero.value) return
  repairingScoreZero.value = true
  try {
    const result = await repairScoreZeroFinalScores({ examId: selectedExamId.value })
    message.success(
      result.repairedCount > 0
        ? `已补齐 ${result.repairedCount} 条计零终分`
        : '本场无待补齐的计零缺考',
    )
    await Promise.all([loadCandidates(), loadFinalScoreOverview(), refreshPendingAbsenceCount()])
  } catch (error) {
    showUserError(error, '补齐计零终分失败')
  } finally {
    repairingScoreZero.value = false
  }
}

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

async function loadCandidates(): Promise<void> {
  if (!selectedExamId.value) return
  const requestSequence = ++candidatesRequestSequence
  loading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      keyword: scoreFilterForm.keyword.trim() || undefined,
      finalScoreStatus:
        statusTabKey.value === SCORE_STATUS_TAB_ALL ? undefined : statusTabKey.value,
      classId: scoreFilterForm.classId,
      unpublishedBoundOnly: scoreFilterForm.unpublishedBoundOnly || undefined,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
    })
    if (requestSequence !== candidatesRequestSequence) {
      return
    }
    candidates.value = result.list
    pagination.total = result.total
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
  } catch (error) {
    if (requestSequence !== candidatesRequestSequence) {
      return
    }
    showUserError(error, '成绩发布名单加载失败')
  } finally {
    if (requestSequence === candidatesRequestSequence) {
      loading.value = false
    }
  }
}

async function loadFinalScoreOverview(): Promise<void> {
  if (!selectedExamId.value) {
    finalScoreOverview.value = null
    scorePanel.value = null
    return
  }
  finalScoreOverviewLoading.value = true
  try {
    finalScoreOverview.value = await getFinalScoreRiskOverview({
      examId: selectedExamId.value,
    })
    try {
      scorePanel.value = await getScorePanel(selectedExamId.value)
    } catch (error) {
      scorePanel.value = null
      showUserError(error, '成绩面板加载失败')
    }
  } catch (error) {
    finalScoreOverview.value = null
    scorePanel.value = null
    showUserError(error, '全场成绩概览加载失败')
  } finally {
    finalScoreOverviewLoading.value = false
  }
}

function handleSearch(): void {
  pagination.current = 1
  void loadCandidates()
}

function handleReset(): void {
  scoreFilterForm.keyword = ''
  statusTabKey.value = SCORE_STATUS_TAB_ALL
  scoreFilterForm.classId = undefined
  scoreFilterForm.unpublishedBoundOnly = false
  pagination.current = 1
  void loadCandidates()
}

function handleStatusTabChange(tabKey: Key): void {
  switch (tabKey) {
    case SCORE_STATUS_TAB_ALL:
    case FinalScoreStatusCode.PENDING:
    case FinalScoreStatusCode.CALCULATED:
    case FinalScoreStatusCode.CONFIRMED:
    case FinalScoreStatusCode.CORRECTED:
    case FinalScoreStatusCode.PUBLISHED:
    case FinalScoreStatusCode.WITHDRAWN:
      statusTabKey.value = tabKey
      break
  }
  pagination.current = 1
  void loadCandidates()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadCandidates()
}
// ─── 全场发布 ─────────────────────────────
const publishableOverviewCount = computed(() => {
  const overview = effectiveFinalScoreOverview.value
  if (!overview) return 0
  return overview.confirmedCount + overview.withdrawnCount + overview.correctedCount
})

/** 成绩发布页：分数状态流转（人数 + 可发布阶段强调），UI 唯一真源 ScoreAnalyticsStatusFlow */
const scoreAnalyticsFlowSteps = computed(() => {
  const overview = effectiveFinalScoreOverview.value
  if (!overview) {
    return []
  }
  return buildScoreAnalyticsFlowSteps(overview, 'publish', publishableOverviewCount.value)
})

const publishRiskBlocked = computed(() => {
  const overview = effectiveFinalScoreOverview.value
  return Boolean(overview && !overview.readyToPublish)
})

/** 发布闸门：只置顶一条阻断，其余折叠，避免告警墙淹没「全场发布」。 */
type PublishGateKey = 'delayedAutoConfirm' | 'pendingAbsence' | 'scoreZero' | 'risk' | 'corrected'

const PUBLISH_GATE_LABEL: Record<PublishGateKey, string> = {
  delayedAutoConfirm: '延迟自动确认失败',
  pendingAbsence: '缺考待确认',
  scoreZero: '计零终分待补齐',
  risk: '成绩风险未复核',
  corrected: '已更正未重发布',
}

const publishGatePriorityKeys = computed((): PublishGateKey[] => {
  const keys: PublishGateKey[] = []
  if (blockedDelayedAutoConfirmNotice.value) keys.push('delayedAutoConfirm')
  if (hasPendingAbsence.value) keys.push('pendingAbsence')
  if (missingAbsenceScoreZeroFinalCount.value > 0) keys.push('scoreZero')
  if (publishRiskBlocked.value) keys.push('risk')
  if (correctedRepublishNotice.value) keys.push('corrected')
  return keys
})

const publishPrimaryGateKey = computed(() => publishGatePriorityKeys.value[0] ?? null)
const publishSecondaryGateKeys = computed(() => publishGatePriorityKeys.value.slice(1))
const publishSecondaryGatesExpanded = ref(false)
const publishSecondaryGateSummary = computed(() =>
  publishSecondaryGateKeys.value.map((key) => PUBLISH_GATE_LABEL[key]).join(' · '),
)

function isPublishGateVisible(key: PublishGateKey): boolean {
  if (publishPrimaryGateKey.value === key) return true
  return publishSecondaryGatesExpanded.value && publishSecondaryGateKeys.value.includes(key)
}

const bulkModalStatItems = computed(() => {
  const overview = effectiveFinalScoreOverview.value
  if (!overview) {
    return []
  }
  return buildScoreBulkPublishModalStatItems(overview, publishableOverviewCount.value)
})

function bulkModalValueClass(valClass?: string): string | undefined {
  if (valClass === 'stat-card__val--ok') {
    return 'analytics-stats__value--green'
  }
  if (valClass === 'stat-card__val--warn') {
    return 'analytics-stats__value--warn'
  }
  return undefined
}

const canBulkPublish = computed(
  () =>
    Boolean(selectedExamId.value)
    && publishableOverviewCount.value > 0
    && finalScoreOverview.value?.readyToPublish === true
    && (finalScoreOverview.value?.blockedCount ?? 0) === 0,
)

const bulkOpen = ref(false)
const bulkRunning = ref(false)
const bulkResult = ref<FinalScoreBatchPublishResponse | null>(null)
/** 单卷发布中的试卷实例 ID，防止列表行重复点击 */
const publishingPaperId = ref<string | null>(null)
const bulkResultPercent = computed(() => {
  const result = bulkResult.value
  if (!result || result.totalCandidateCount <= 0) return 0
  return Math.round((result.alreadyPublishedCount / result.totalCandidateCount) * 100)
})

function resetBulkState(): void {
  bulkResult.value = null
}

function openBulkPublishModal(): void {
  if (!canBulkPublish.value) {
    message.warning('当前考试没有可发布的最终成绩')
    return
  }
  void (async () => {
    await loadFinalScoreOverview()
    const canContinue = await ensureScorePublishPreconditions()
    if (!canContinue) {
      return
    }
    resetBulkState()
    bulkOpen.value = true
  })()
}

/** 调用后端全场发布入口，避免前端用当前分页候选误当全场候选。 */
async function runBulkPublish(): Promise<void> {
  if (!selectedExamId.value || bulkRunning.value) return
  const canContinue = await ensureScorePublishPreconditions()
  if (!canContinue) {
    bulkOpen.value = false
    return
  }
  bulkRunning.value = true
  try {
    bulkResult.value = await batchPublishFinalScores({ examId: selectedExamId.value })
    finalScoreOverview.value = bulkResult.value.afterOverview
    if (bulkResult.value.failureCount === 0 && bulkResult.value.remainingCount === 0) {
      message.success('全场成绩已发布，学生通知已下发')
      bulkOpen.value = false
    } else if (bulkResult.value.failureCount === 0) {
      message.warning(
        `全场发布完成：成功 ${bulkResult.value.successCount} 条，仍有 ${bulkResult.value.remainingCount} 条需处理`,
      )
    } else {
      message.warning(
        `全场发布完成：成功 ${bulkResult.value.successCount} 条，失败 ${bulkResult.value.failureCount} 条，请查看明细`,
      )
    }
    await Promise.all([loadCandidates(), loadFinalScoreOverview(), refreshArchiveGate()])
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '考试工作台状态刷新失败')
    }
  } catch (error) {
    showUserError(error, '全场成绩发布失败')
  } finally {
    bulkRunning.value = false
  }
}

/* ========== 信号指标：发布流程状态分布 ========== */

const publishSignalMetrics = computed(() =>
  toSignalMetrics(
    buildScorePublishSignalMetrics(
      scorePanel.value,
      effectiveFinalScoreOverview.value,
      examArchiveGate.value,
      publishableOverviewCount.value,
      pagination.total ?? 0,
    ),
  ),
)

// ─── 状态机按钮 ─────────────────────────────
function canPublish(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  // 单卷发布不要求全场 readyToPublish；缺考等场级阻断仍在 handlePublish 门禁校验。
  const s = record.finalScoreStatus
  return (
    s === FinalScoreStatusCode.CONFIRMED
    || s === FinalScoreStatusCode.WITHDRAWN
    || s === FinalScoreStatusCode.CORRECTED
  )
}
function publishButtonLabel(record: ExamScoreSummaryItemResponse): string {
  // WITHDRAWN / CORRECTED 均为学生端不可见后的再发；文案须引导「重新发布」。
  return record.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN
    || record.finalScoreStatus === FinalScoreStatusCode.CORRECTED
    ? '重新发布'
    : '发布'
}
function canWithdraw(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  // MVR-184：与 BE withdrawFinalScore 对齐，CONFIRMED 可直接撤销确认，无需先发布再撤回
  return (
    s === FinalScoreStatusCode.CONFIRMED
    || s === FinalScoreStatusCode.PUBLISHED
    || s === FinalScoreStatusCode.CORRECTED
  )
}
function withdrawButtonLabel(record: ExamScoreSummaryItemResponse): string {
  return record.finalScoreStatus === FinalScoreStatusCode.CONFIRMED ? '撤销确认' : '撤回'
}

function buildPublishActions(record: ExamScoreSummaryItemResponse): UiTableRowActionItem[] {
  return [
    { key: 'detail', label: record.absenceScoreZero ? '计零说明' : '明细' },
    {
      key: 'publish',
      label: publishButtonLabel(record),
      tone: 'primary',
      disabled: !canPublish(record),
    },
    { key: 'withdraw', label: withdrawButtonLabel(record), disabled: !canWithdraw(record) },
  ]
}

function handlePublishRowAction(key: string, record: ExamScoreSummaryItemResponse): void {
  switch (key) {
    case 'detail':
      void openDetailDrawer(record)
      break
    case 'publish':
      void handlePublish(record)
      break
    case 'withdraw':
      openWithdrawModal(record)
      break
  }
}

async function handlePublish(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (publishingPaperId.value) {
    return
  }
  if (!selectedExamId.value || !record.paperInstanceId) return
  const canContinue = await ensureSinglePaperPublishPreconditions()
  if (!canContinue) {
    return
  }
  publishingPaperId.value = record.paperInstanceId
  try {
    await publishFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    message.success('成绩已发布，学生通知已下发')
    await Promise.all([loadCandidates(), loadFinalScoreOverview(), refreshArchiveGate()])
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '考试工作台状态刷新失败')
    }
  } catch (error) {
    showUserError(error, '成绩发布失败')
  } finally {
    publishingPaperId.value = null
  }
}

// ─── 撤回成绩 Modal ─────────────────────────────
const withdrawOpen = ref(false)
const withdrawing = ref(false)
const withdrawCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const withdrawReason = ref('')
/** MVR-184：CONFIRMED 用「撤销确认」文案，避免教师误以为必须先发布 */
const withdrawModalTitle = computed(() =>
  withdrawCandidate.value?.finalScoreStatus === FinalScoreStatusCode.CONFIRMED
    ? '撤销成绩确认'
    : '撤回最终成绩',
)

function openWithdrawModal(record: ExamScoreSummaryItemResponse): void {
  withdrawCandidate.value = record
  withdrawReason.value = ''
  withdrawOpen.value = true
}

async function handleWithdraw(): Promise<void> {
  if (withdrawing.value) {
    return
  }
  if (!selectedExamId.value || !withdrawCandidate.value?.paperInstanceId) return
  const reason = withdrawReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请填写撤回原因')
    return
  }
  withdrawing.value = true
  try {
    await withdrawFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: withdrawCandidate.value.paperInstanceId,
      reason,
    })
    message.success(
      withdrawCandidate.value?.finalScoreStatus === FinalScoreStatusCode.CONFIRMED
        ? '已撤销成绩确认'
        : '成绩已撤回',
    )
    withdrawOpen.value = false
    await Promise.all([loadCandidates(), loadFinalScoreOverview(), refreshArchiveGate()])
    try {
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '考试工作台状态刷新失败')
    }
  } catch (error) {
    showUserError(error, '成绩撤回失败')
  } finally {
    withdrawing.value = false
  }
}

// ─── 成绩明细 Drawer ─────────────────────────────
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const paperScore = ref<ExamPaperScoreResponse | null>(null)

// computed 派生强类型题目数组，模板侧用 paperQuestions[index] 取 VO，避免 a-table slot record 类型丢失。
const paperQuestions = computed<ExamQuestionScoreResponse[]>(
  () => paperScore.value?.questions ?? [],
)

/** 官方卷面分与题分明细可不一致（总分更正、或总分后再单题更正），确认/发布以官方 examScore/totalScore 为准。 */
const paperTotalScoreCorrectionNotice = computed(() => {
  const score = paperScore.value
  if (!score) return null
  // 题分之和与官方考试分不一致时始终提示；不依赖「最近一条更正是否为总分」。
  if (
    score.questionScoreSumMatchesExamScore !== false
    && !score.latestTotalScoreCorrectionApplied
  ) {
    return null
  }
  const examScore = score.examScore
  const questionSum = score.questionScoreSum
  if (examScore == null || questionSum == null) {
    return '本卷官方考试分与题分明细可不一致，题目列表展示原复核分；发布与学生可见分以官方 examScore/totalScore 为准。'
  }
  return `本卷官方考试分 ${examScore}，题分明细合计 ${questionSum}（可不一致）。题目列表展示原复核分，不以题分之和覆盖官方分。`
})

const paperItemColumns: ColumnType<ExamQuestionScoreResponse>[] = [
  { title: '题号', key: 'questionNo', width: 80, fixed: 'left' },
  { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '题目得分', key: 'teacherReviewScore', width: 100 },
  { title: '状态', dataIndex: 'gradeStatus', key: 'gradeStatus', width: 110 },
]

async function openDetailDrawer(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
  try {
    paperScore.value = await getPaperScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
  } catch (error) {
    showUserError(error, '成绩明细加载失败')
  } finally {
    detailLoading.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────
watch(
  selectedExamId,
  (value) => {
    pagination.current = 1
    statusTabKey.value = SCORE_STATUS_TAB_ALL
    scoreFilterForm.keyword = ''
    scoreFilterForm.classId = undefined
    scoreFilterForm.unpublishedBoundOnly = false
    if (value) {
      void Promise.all([
        loadExamDetail(),
        loadCandidates(),
        refreshPendingAbsenceCount(),
        loadFinalScoreOverview(),
      ])
    } else {
      examDetail.value = null
      candidates.value = []
      pagination.total = 0
      pendingAbsenceCount.value = 0
      finalScoreOverview.value = null
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.score-publish-page {
  min-width: 0;
}

.score-publish {
  &__more-gates {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--dp-space-2) var(--dp-space-3);
    margin: 0 0 var(--dp-space-3);
  }

  &__more-gates-toggle {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-size: var(--dp-font-size-sm);
    font-weight: var(--dp-font-weight-emphasis);
    color: var(--dp-color-primary);
    cursor: pointer;
  }

  &__more-gates-summary {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__alert {
    margin-top: var(--dp-space-3);
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  &__table-section {
    margin-top: var(--dp-space-3);
  }

  &__table-shell {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-4);
    padding: var(--dp-space-3) var(--dp-space-4) var(--dp-space-4);
  }

  &__table-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--dp-text-primary);
  }

  &__status-tabs {
    :deep(.ui-section-tabs__nav) {
      align-self: stretch;
      width: 100%;
    }
  }

  &__table-toolbar {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-3);
    width: 100%;
  }

  &__table-card {
    margin-top: var(--dp-space-2);
  }

  &__filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-2);
  }

  &__filter-chip {
    padding: 2px 10px;
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface);
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background-color 0.2s ease;

    &:hover {
      border-color: var(--dp-primary-light);
      color: var(--dp-primary);
    }

    &--active {
      border-color: var(--dp-primary);
      background: color-mix(in srgb, var(--dp-primary) 8%, var(--dp-bg-container));
      color: var(--dp-primary);
      font-weight: 600;
    }
  }

  &__detail-summary {
    margin-bottom: var(--dp-space-4);
  }

  &__detail-section-title {
    margin: var(--dp-space-4) 0 var(--dp-space-2) 0;
    font-size: 14px;
    font-weight: 600;
  }

  &__hint {
    color: var(--dp-text-muted);
  }

  &__bulk-progress {
    margin: var(--dp-space-3) 0 var(--dp-space-1);
  }

  &__bulk-meta {
    font-size: 12px;
    color: var(--dp-text-secondary);
    margin-top: 4px;
  }

  &__bulk-list {
    max-height: 320px;
    overflow-y: auto;
    margin-top: var(--dp-space-2);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);
  }

  &__bulk-error-tag {
    margin-left: var(--dp-space-2);
  }
}
</style>
