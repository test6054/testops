<template>
  <StageWorkbenchShell class="score-finalize-page">
    <template v-if="selectedExamId" #context>
      <ContextBar layout="workbench" show-title title="成绩确认与发布">
        <template #status>
          <UiTag v-if="scoresFullyPublished" tone="green" size="sm">已全部发布</UiTag>
          <UiTag v-else-if="blockingRiskReasons.length > 0" tone="orange" size="sm">
            存在阻塞风险
          </UiTag>
          <UiTag
            v-else-if="effectiveRiskOverview?.readyToPublish || canBulkPublish"
            tone="green"
            size="sm"
          >
            可全场发布
          </UiTag>
          <UiTag v-else-if="hasPendingAbsence" tone="orange" size="sm">缺考待确认</UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="unconfirmedQuestionGradeCount > 0"
            size="sm"
            variant="outline"
            @click="goQuestionReviewBatch"
          >
            题目分待确认 {{ unconfirmedQuestionGradeCount }}
          </UiButton>
          <UiButton
            v-if="canBatchConfirmSafe"
            variant="outline"
            size="sm"
            :loading="batchConfirming"
            @click="handleBatchConfirmSafe"
          >
            批量确认无风险成绩
          </UiButton>
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
      <SignalBand :metrics="statMetrics" variant="panel" compact />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" body="请从考试列表进入工作台后再确认成绩" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchNoticeBanner
        v-if="panelNotice"
        :title="panelNotice.title"
        :description="panelNotice.description"
        :tone="panelNotice.tone"
        class="score-finalize__notice-banner"
      >
        <UiButton
          v-if="panelNotice.action === 'layout'"
          variant="outline"
          size="sm"
          @click="goLayoutDesigner"
        >
          前往制卷设计
        </UiButton>
      </WorkbenchNoticeBanner>

      <UiAlertStrip
        v-if="dailyScoreManualConfirmNotice"
        tone="warning"
        title="日常分须手工确认"
        :description="dailyScoreManualConfirmNotice"
        dense
        inline
        class="score-finalize__alert"
      />

      <ScoreConfirmReadinessPanel
        :overview="effectiveRiskOverview"
        :score-panel="scorePanel"
        :action-loading-code="readinessActionLoading"
        :exam-title="examDetail?.examName || ''"
        :candidate-count="effectiveRiskOverview?.totalCandidateCount ?? 0"
        :can-bulk-publish="canBulkPublish"
        :can-batch-confirm-safe="canBatchConfirmSafe"
        :batch-confirming="batchConfirming"
        :bulk-publishing="bulkRunning"
        @action="handleReadinessAction"
        @bulk-publish="openBulkPublishModal"
        @safe-confirm="handleBatchConfirmSafe"
      />
      <ExamArchiveGateBanner
        ref="gateBannerRef"
        :exam-id="selectedExamId"
        compact
        show-class-progress-table
        :scores-fully-published="scoresFullyPublished"
        @go-close-exam="goExamListForClose"
        @loaded="onExamArchiveGateLoaded"
      />

      <WorkbenchSurfaceCard flush class="score-finalize__table-section">
        <div class="score-finalize__table-shell">
          <h3 class="score-finalize__table-title">考生成绩</h3>
          <UiSkeletonState v-if="riskOverviewLoading" :rows="1" compact />
          <UiSectionTabs
            v-else
            v-model="statusTabKey"
            :items="statusTabItems"
            compact
            class="score-finalize__status-tabs"
            @change="handleStatusTabChange"
          />
          <div class="score-finalize__table-toolbar">
            <UiButton
              size="sm"
              v-if="blockingRiskReasons.length > 0"
              variant="outline"
              @click="openRiskReviewDrawer"
            >
              集中复核异常成绩
            </UiButton>
            <div class="score-finalize__table-toolbar-main">
              <UiFilterBar
                v-model="scoreFilterModel"
                :fields="scoreFilterFields"
                variant="plain"
                show-labels
                search-text="查询"
                @search="handleSearch"
                @reset="handleReset"
              />
              <div v-if="showIncompleteClassChip" class="score-finalize__filter-chips">
                <button
                  type="button"
                  class="score-finalize__filter-chip"
                  :class="{
                    'score-finalize__filter-chip--active': scoreFilterForm.unpublishedBoundOnly,
                  }"
                  @click="toggleIncompleteClassFilter"
                >
                  仅看未齐班级
                </button>
              </div>
              <UiButton variant="outline" size="sm" @click="goExportTasks"> 导出任务 </UiButton>
            </div>
          </div>

          <UiAlertStrip
            v-if="candidatesLoadFailed"
            tone="error"
            dense
            title="成绩确认名单加载失败"
            class="score-finalize__alert"
          />
          <UiAlertStrip
            v-if="riskOverviewLoadFailed"
            tone="error"
            dense
            title="成绩风险概览刷新失败"
            class="score-finalize__alert"
          />

          <UiAlertStrip
            v-if="continueConfirmHint"
            tone="info"
            dense
            title="继续核对下一份"
            :description="continueConfirmHint.description"
            class="score-finalize__alert"
          >
            <template #actions>
              <UiButton variant="primary" size="sm" @click="handleContinueConfirmHint">
                确认下一份
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="closeContinueConfirmHint">
                稍后
              </UiButton>
            </template>
          </UiAlertStrip>

          <UiDataTable
            v-model:current="pagination.current"
            v-model:page-size="pagination.pageSize"
            pagination-mode="server"
            :columns="columns"
            :data-source="candidates"
            :loading="loading"
            :total="pagination.total"
            :empty-description="candidatesLoadFailed ? '成绩确认名单加载失败' : undefined"
            row-key="candidateRosterId"
            size="middle"
            flat
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
                  :title="`AI预估卷面分 ${candidates[index].estimatedExamScore}，非正式成绩`"
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
                <span v-else class="score-finalize__hint">—</span>
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
                  :title="`AI预估总分 ${candidates[index].estimatedTotalScore}，非正式成绩`"
                >
                  预估 {{ candidates[index].estimatedTotalScore }}
                </span>
                <span v-else class="score-finalize__hint">—</span>
              </template>
              <template v-else-if="column.key === 'bias'">
                <div class="score-finalize__bias-cell">
                  <UiTag
                    :tone="
                      biasLevelTone(classifyScoreBias(candidates[index].finalScore, pageScoreStats))
                    "
                    size="sm"
                  >
                    {{
                      biasLevelLabel(
                        classifyScoreBias(candidates[index].finalScore, pageScoreStats),
                      )
                    }}
                  </UiTag>
                  <span
                    v-if="formatScoreBiasDelta(candidates[index].finalScore, pageScoreStats)"
                    class="score-finalize__bias-delta"
                  >
                    {{ formatScoreBiasDelta(candidates[index].finalScore, pageScoreStats) }}
                  </span>
                </div>
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
                  :items="buildFinalizeActions(candidates[index])"
                  split
                  @action="(key) => handleFinalizeRowAction(key, candidates[index])"
                />
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
          description="该生为缺考计零，本卷无扫描影像与题目批改明细，正式成绩为 0 分；请在确认后直接发布，不必打开影像阅卷。"
          dense
          inline
          class="score-finalize__detail-absence-alert"
          style="margin-bottom: var(--dp-space-component)"
        />
        <UiDescriptions :column="2" size="small" bordered class="score-finalize__detail-summary">
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
          <UiDescriptionsItem
            v-if="paperScore.finalScoreStatus === FinalScoreStatusCode.CALCULATED"
            label="预估说明"
            :span="2"
          >
            当前为智能预估分（非正式），须题目全部教师确认或正评提交后，方可确认最终成绩。
          </UiDescriptionsItem>
        </UiDescriptions>

        <UiAlertStrip
          v-if="paperTotalScoreCorrectionNotice"
          tone="warning"
          title="本卷已经总分更正"
          :description="paperTotalScoreCorrectionNotice"
          dense
          inline
          class="score-finalize__detail-correction-alert"
          style="margin: var(--dp-space-component) 0"
        />

        <h4 class="score-finalize__detail-section-title">题目得分明细</h4>
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
              <span v-else class="score-finalize__hint">-</span>
            </template>
          </template>
        </UiDataTable>

        <h4 class="score-finalize__detail-section-title">
          本课程历次成绩趋势
          <span v-if="historicalSummary" class="score-finalize__detail-section-helper">
            共 {{ historicalSummary.count }} 场考试
            <span v-if="historicalSummary.deltaText"> · {{ historicalSummary.deltaText }}</span>
          </span>
        </h4>
        <UiSkeletonState v-if="historicalLoading" variant="card" compact />
        <MarkTrendSection
          v-else
          title=""
          :hint="historicalTrendHint"
          :point-count="historicalTrendPoints.length"
          :option="historicalTrendChartOption"
          height="220px"
          :last-value="historicalTrendLastValue"
          value-unit=" 分"
          :single-point-description="MARK_CHART_EMPTY.trendSingleExam"
          :empty-description="MARK_CHART_EMPTY.trendNoHistory"
          :aria-label="historicalTrendAriaLabel"
        />

        <h4 class="score-finalize__detail-section-title">操作记录</h4>
        <UiSkeletonState v-if="auditLoading" variant="card" compact />
        <UiActivityTimeline
          v-else-if="auditTimelineGroups.length > 0"
          :groups="auditTimelineGroups"
          compact
        />
        <UiPagination
          v-if="auditPagination.total > 0"
          v-model:current="auditPagination.pageNum"
          v-model:page-size="auditPagination.pageSize"
          class="score-finalize__audit-pagination"
          :total="auditPagination.total"
          @change="handleAuditPageChange"
        />
        <UiEmpty size="sm" v-else-if="!auditLoading" description="暂无操作记录" />
      </div>
    </UiDrawer>

    <!-- 确认成绩 Drawer -->
    <UiDrawer
      :open="confirmOpen"
      title="确认最终成绩"
      :width="520"
      :confirm-loading="confirming"
      :hide-footer="false"
      @update:open="(v: boolean) => (confirmOpen = v)"
      @close="confirmOpen = false"
      @confirm="handleConfirm"
    >
      <UiForm layout="vertical">
        <UiFormItem label="考生">
          <UiInput
            size="sm"
            :value="confirmCandidate ? confirmCandidate.paperDisplay.primaryText : ''"
            disabled
          />
        </UiFormItem>
        <UiFormItem
          :label="
            hasDailyScoreConfig
              ? '考试分（各题教师复核评分之和）'
              : '考试分（仅各题教师复核评分之和）'
          "
        >
          <UiInput
            size="sm"
            :value="
              confirmComputedExamScore != null
                ? `${confirmComputedExamScore} 分`
                : '各题教师复核评分尚未齐全'
            "
            disabled
          />
        </UiFormItem>
        <UiFormItem v-if="hasDailyScoreConfig" label="日常成绩" :required="true">
          <UiInputNumber
            size="sm"
            v-model="confirmDailyScore"
            :min="0"
            :max="dailyScoreFull ?? undefined"
            :precision="2"
            style="width: 100%"
            placeholder="请输入日常成绩"
          />
          <div v-if="dailyScoreFull != null" class="score-finalize__hint">
            日常满分 {{ dailyScoreFull }} 分
          </div>
        </UiFormItem>
        <UiFormItem v-if="hasDailyScoreConfig" label="总成绩预览">
          <UiInput size="sm" :value="formatScorePoints(confirmTotalScorePreview)" disabled />
        </UiFormItem>
        <UiFormItem>
          <UiCheckbox v-model="confirmAndPublish" :disabled="hasUnreviewedBlockingRisks">
            确认后立即发布并通知学生
          </UiCheckbox>
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      :open="riskReviewDrawerOpen"
      title="异常成绩集中复核"
      :width="620"
      hide-footer
      @update:open="(v: boolean) => (riskReviewDrawerOpen = v)"
      @close="riskReviewDrawerOpen = false"
    >
      <UiEmpty size="sm" v-if="blockingRiskReasons.length === 0" description="当前无发布阻断风险" />
      <div v-else class="score-finalize__risk-review-list">
        <div
          v-for="reason in blockingRiskReasons"
          :key="reason.reasonCode"
          class="score-finalize__risk-review-item"
        >
          <div class="score-finalize__risk-review-main">
            <UiTag :tone="riskReasonStatusTone(reason.reasonCode)" size="sm">
              {{ riskReasonStatusLabel(reason.reasonCode) }}
            </UiTag>
            <div>
              <div class="score-finalize__risk-review-title">
                {{ reason.reasonName }}
              </div>
              <div class="score-finalize__risk-review-desc">
                原因编码 {{ reason.reasonCode }} · 涉及 {{ reason.count }} 项
              </div>
            </div>
          </div>
          <UiButton
            v-if="isHardBlockingRiskReason(reason.reasonCode)"
            size="sm"
            variant="outline"
            @click="goAbsenceConfirm"
          >
            前往缺考核对
          </UiButton>
          <UiButton
            v-else-if="reason.reasonCode === FinalScoreRiskReasonCode.ABNORMAL_PAPER"
            size="sm"
            variant="outline"
            @click="goScanBindingAttention"
          >
            去扫描处置绑定
          </UiButton>
          <UiButton
            v-else-if="isQuestionConfirmRiskReason(reason.reasonCode)"
            size="sm"
            variant="primary"
            @click="goQuestionReviewBatch"
          >
            去题目复核确认
          </UiButton>
          <UiButton
            v-else-if="
              canRepairAbsenceScoreZeroFinal
                && reason.reasonCode === FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL
            "
            size="sm"
            variant="primary"
            :loading="repairingScoreZero"
            @click="handleRepairScoreZero"
          >
            一键补齐计零终分
          </UiButton>
          <UiButton
            v-if="
              canManageReviewerWrites
                && !isHardBlockingRiskReason(reason.reasonCode)
                && !isQuestionConfirmRiskReason(reason.reasonCode)
                && reason.reasonCode !== FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL
            "
            size="sm"
            variant="outline"
            :loading="riskReviewSavingReasonCode === reason.reasonCode"
            :disabled="
              riskReviewSavingReasonCode !== null
                && riskReviewSavingReasonCode !== reason.reasonCode
            "
            @click="toggleRiskReasonReviewed(reason.reasonCode)"
          >
            {{ isRiskReasonReviewed(reason.reasonCode) ? '取消复核标记' : '标记已复核' }}
          </UiButton>
        </div>
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

    <!-- 仅全场具备发布条件时升级为抽屉；单卷确认后用列表上方就地提示承接下一份 -->
    <UiDrawer
      :open="publishReadyStep.visible"
      :title="publishReadyStep.title"
      :width="480"
      :mask-closable="false"
      hide-footer
      @update:open="
        (v: boolean) => {
          if (!v) closePublishReadyStep()
        }
      "
      @close="closePublishReadyStep"
    >
      <div class="score-finalize__next-step">
        <UiTypographyParagraph class="score-finalize__next-step-desc">
          {{ publishReadyStep.description }}
        </UiTypographyParagraph>
        <div class="score-finalize__next-step-actions">
          <UiButton
            variant="primary"
            size="md"
            :disabled="!canBulkPublish"
            @click="handlePublishReadyGoPublish"
          >
            全场发布
          </UiButton>
          <UiButton variant="outline" size="md" @click="closePublishReadyStep"> 稍后处理 </UiButton>
        </div>
      </div>
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
      <div v-if="riskOverview" class="score-finalize__bulk-stats analytics-stats">
        <div v-for="item in bulkModalStatItems" :key="item.key" class="analytics-stats__card">
          <div class="analytics-stats__value" :class="bulkModalValueClass(item.valClass)">
            {{ item.value }}
          </div>
          <div class="analytics-stats__label">{{ item.label }}</div>
        </div>
      </div>
      <div v-if="bulkResult" class="score-finalize__bulk-result">
        <UiProgressBar
          :percent="bulkResultPercent"
          :color="
            bulkResult.failureCount > 0 || bulkResult.remainingCount > 0
              ? 'var(--dp-error)'
              : 'var(--dp-success)'
          "
        />
        <div class="score-finalize__bulk-meta">
          本次成功 {{ bulkResult.successCount }} 条 · 失败 {{ bulkResult.failureCount }} 条 ·
          全场已发布 {{ bulkResult.alreadyPublishedCount }} / {{ bulkResult.totalCandidateCount }}
        </div>
      </div>
      <div
        v-if="bulkResult?.failureGroups?.length"
        class="score-finalize__bulk-fail-groups"
        role="list"
        aria-label="发布失败分组"
      >
        <p class="score-finalize__bulk-fail-intro">
          按原因汇总 {{ bulkResult.failureGroups.length }} 类失败（禁止逐卷罗列）：
        </p>
        <div
          v-for="(group, index) in bulkResult.failureGroups"
          :key="`${group.code}-${group.message}-${index}`"
          class="score-finalize__bulk-fail-group"
          role="listitem"
        >
          <div class="score-finalize__bulk-fail-main">
            <span class="score-finalize__bulk-fail-title">
              {{ index + 1 }}. {{ group.message || '发布失败' }}
            </span>
            <span class="score-finalize__bulk-group-count">{{ group.count }} 份</span>
          </div>
          <div class="score-finalize__bulk-fail-meta">
            <UiTag tone="red" size="sm">{{ group.code }}</UiTag>
            <span v-if="group.sampleLabels?.length" class="score-finalize__bulk-fail-hint">
              样例：{{ group.sampleLabels.join('、') }}
              <template v-if="group.count > group.sampleLabels.length"> 等</template>
            </span>
            <span v-else class="score-finalize__bulk-fail-hint">
              请在列表中按状态筛选后逐份处理
            </span>
          </div>
        </div>
      </div>
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
import type { OperationLogResponse } from '@/apis/mark/admin-audit'
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamPaperScoreResponse, ExamQuestionScoreResponse } from '@/apis/mark/exam-grade'
import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type {
  ExamScoreSummaryItemResponse,
  FinalScoreBatchPublishResponse,
  FinalScoreReadinessActionCode,
  FinalScoreReadinessItemResponse,
  FinalScoreRiskOverviewResponse,
} from '@/apis/mark/exam-score'
import type { ScoreBiasLevelCode } from '@/apis/mark/score-bias'
import type {
  BadgeTone,
  FilterField,
  UiTableRowActionItem,
  UiTrendPoint,
} from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import type { ScoreStatusTabKey } from '@/utils/score-workbench-analytics'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { repairScoreZeroFinalScores } from '@/apis/mark/absence'
import {
  AuditTargetTypeCode,
  listOperationLogs,
  OPERATION_TYPE_TONE,
  OperationTypeDescription,
} from '@/apis/mark/admin-audit'
import { getExamDetail, pageExams } from '@/apis/mark/exam'
import { getPaperScore } from '@/apis/mark/exam-grade'
import { getScorePanel } from '@/apis/mark/exam-progress'
import {
  batchConfirmSafeFinalScores,
  batchPublishFinalScores,
  confirmFinalScore,
  FinalScoreRiskReasonCode,
  getFinalScoreRiskOverview,
  pageExamScoreSummary,
  publishFinalScore,
  saveFinalScoreRiskReview,
  withdrawFinalScore,
} from '@/apis/mark/exam-score'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import { GradeStatusCode } from '@/apis/mark/grade-status'
import {
  classifyScoreBias,
  computeScoreBiasStats,
  formatScoreBiasDelta,
  SCORE_BIAS_LEVEL_TONE,
  ScoreBiasLevelDescription,
} from '@/apis/mark/score-bias'
import ExamArchiveGateBanner from '@/components/archive-volume/ExamArchiveGateBanner.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiActivityTimeline from '@/components/ui-guide/ui/UiActivityTimeline.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import ScoreConfirmReadinessPanel from '@/components/workbench/ScoreConfirmReadinessPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchNoticeBanner from '@/components/workbench/WorkbenchNoticeBanner.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useScorePublishPreconditions } from '@/composables/useScorePublishPreconditions'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useChartOption } from '@/hooks/modules/useChartOption'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { buildExamScoreSummaryTableColumns } from '@/utils/exam-score-summary-table-columns'
import { formatDateTime, formatDateTimeWithSeconds } from '@/utils/format'
import { formatTrendAriaLabel, MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'
import { buildTrendChartInsight } from '@/utils/mark-chart-insights'
import { buildTrendLineChartOption } from '@/utils/mark-echarts-options'
import { formatFinalScoreFailureGroups } from '@/utils/score-confirm-readiness'
import { isExamScoresFullyPublished } from '@/utils/score-release-readiness'
import {
  buildScoreBulkPublishModalStatItems,
  buildScoreConfirmStatusTabItems,
  SCORE_STATUS_TAB_ALL,
} from '@/utils/score-workbench-analytics'
import { buildScoreFinalizeSignalMetrics } from '@/utils/score-workbench-signal'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScoreFinalize' })

/** 历次成绩趋势仅明细抽屉需要，延迟加载避免成绩页首包带入 ECharts */
const MarkTrendSection = defineAsyncComponent(
  () => import('@/components/chart/MarkTrendSection.vue'),
)

function finalScoreStatusTone(value: FinalScoreStatusCode) {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, value, '最终成绩状态')
}

function finalScoreStatusLabel(value: FinalScoreStatusCode): string {
  return strictEnumLabel(FinalScoreStatusDescription, value, '最终成绩状态')
}

interface ScoreFilterForm {
  [key: string]: unknown
  keyword: string
  classId?: string
  unpublishedBoundOnly: boolean
}

const scoreFilterForm = reactive<ScoreFilterForm>({
  keyword: '',
  classId: undefined,
  unpublishedBoundOnly: false,
})

const statusTabKey = ref<ScoreStatusTabKey>(SCORE_STATUS_TAB_ALL)

const examArchiveGate = ref<ArchiveVolumeExamGateResponse | null>(null)

const scoreFilterModel = computed<Record<string, unknown>>({
  get: () => scoreFilterForm,
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

const router = useRouter()
const { goExportTasks } = useScoreReleaseNavigation()

function goLayoutDesigner(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceLayoutDesigner',
    params: { examId: selectedExamId.value },
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
/** 成绩页考试代际：详情/风险/面板/名单/抽屉共享，切考试时失效旧响应 */
let scorePageGeneration = 0

async function loadExamDetail(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    examDetail.value = null
    return
  }
  const loadGeneration = scorePageGeneration
  try {
    const detail = await getExamDetail(examId)
    if (loadGeneration !== scorePageGeneration || selectedExamId.value !== examId) {
      return
    }
    examDetail.value = detail
  } catch (error) {
    if (loadGeneration !== scorePageGeneration || selectedExamId.value !== examId) {
      return
    }
    examDetail.value = null
    showUserError(error, '考试详情加载失败')
  }
}

// ─── 考生名单（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemResponse[]>([])
const loading = ref(false)
const candidatesLoadFailed = ref(false)
let candidatesRequestSequence = 0
const riskOverview = ref<FinalScoreRiskOverviewResponse | null>(null)
const riskOverviewLoadFailed = ref(false)
/** MVR-278：确认/发布写动作；与 BE requireExamReviewerPermission 对齐；风险概览失败 fail-closed */
const canManageReviewerWrites = computed(
  () => !riskOverviewLoadFailed.value && riskOverview.value?.canManageReviewerWrites === true,
)

/**
 * MVR-368：补齐缺考计零终分不叠 ACTIVE；仅认 riskOverview.canRepairAbsenceScoreZeroFinal===true。
 * 与 BE repairScoreZeroFinalScores / Absence 页 stats.canManageReviewerWrites 同源。
 */
const canRepairAbsenceScoreZeroFinal = computed(
  () =>
    !riskOverviewLoadFailed.value && riskOverview.value?.canRepairAbsenceScoreZeroFinal === true,
)
const scorePanel = ref<ExamWorkbenchScorePanelResponse | null>(null)
const riskOverviewLoading = ref(false)
const panelLoadError = ref('')

const statusTabItems = computed(() => buildScoreConfirmStatusTabItems(effectiveRiskOverview.value))

const effectiveRiskOverview = computed(
  () => riskOverview.value ?? scorePanel.value?.riskOverview ?? null,
)

const panelNotice = computed(() => {
  if (scorePanel.value?.panelBlockedReason) {
    return {
      title: '制卷前置条件未满足',
      description: scorePanel.value.panelBlockedReason,
      tone: 'warning' as const,
      action: 'layout' as const,
    }
  }
  if (panelLoadError.value && !effectiveRiskOverview.value) {
    return {
      title: '成绩风险概览暂不可用',
      description: panelLoadError.value,
      tone: 'info' as const,
      action: null,
    }
  }
  return null
})

const {
  pendingAbsenceCount,
  refreshPendingAbsenceCount,
  hasFieldWideHardBlockForWrite,
  ensureScorePublishPreconditions,
  ensureSinglePaperPublishPreconditions,
  ensureScoreConfirmPreconditions,
} = useScorePublishPreconditions({
  examId: selectedExamId,
  riskOverview: effectiveRiskOverview,
  scorePanel,
})

const pendingAbsenceCountForDisplay = computed(() => effectiveRiskOverview.value?.pendingAbsenceCount ?? pendingAbsenceCount.value ?? 0)
const hasPendingAbsence = computed(() => pendingAbsenceCountForDisplay.value > 0)

const scoresFullyPublished = computed(() =>
  isExamScoresFullyPublished(effectiveRiskOverview.value, examArchiveGate.value),
)

/** 全场可发布人数：已确认 + 已撤回 + 已更正（与 BE 全场发布筛选口径对齐） */
const publishableOverviewCount = computed(() => {
  const overview = effectiveRiskOverview.value
  if (!overview) return 0
  return overview.confirmedCount + overview.withdrawnCount + overview.correctedCount
})

function filterCorrectedOnly(): void {
  statusTabKey.value = FinalScoreStatusCode.CORRECTED
  scoreFilterForm.unpublishedBoundOnly = false
  pagination.current = 1
  void loadCandidates()
}

const batchConfirming = ref(false)
const riskReviewDrawerOpen = ref(false)
const riskReviewSavingReasonCode = ref<FinalScoreRiskReasonCode | null>(null)
const reviewedRiskReasonCodes = ref<Set<FinalScoreRiskReasonCode>>(new Set())

// MVR-204：与 BE ensureFinalScoreSourceFactsReady 场级硬拦同源（缺考 + 阻塞事件 + 重复影像）
const HARD_BLOCKING_RISK_REASON_CODES = new Set<FinalScoreRiskReasonCode>([
  FinalScoreRiskReasonCode.UNRECONCILED_ABSENCE,
  FinalScoreRiskReasonCode.BLOCKING_INCIDENT,
  FinalScoreRiskReasonCode.PENDING_DUPLICATE_IMAGE,
])

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns = computed(() =>
  buildExamScoreSummaryTableColumns('finalize', hasDailyScoreConfig.value),
)

const hasDailyScoreConfig = computed(() => examDetail.value?.dailyScoreFull != null)
const dailyScoreFull = computed(() => examDetail.value?.dailyScoreFull ?? null)

async function loadCandidates(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) return
  const requestSequence = ++candidatesRequestSequence
  const loadGeneration = scorePageGeneration
  loading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId,
      keyword: scoreFilterForm.keyword.trim() || undefined,
      finalScoreStatus:
        statusTabKey.value === SCORE_STATUS_TAB_ALL ? undefined : statusTabKey.value,
      classId: scoreFilterForm.classId,
      unpublishedBoundOnly: scoreFilterForm.unpublishedBoundOnly || undefined,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
    })
    if (
      requestSequence !== candidatesRequestSequence
      || loadGeneration !== scorePageGeneration
      || selectedExamId.value !== examId
    ) {
      return
    }
    candidates.value = result.list
    pagination.total = result.total
    candidatesLoadFailed.value = false
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
  } catch (error) {
    if (
      requestSequence !== candidatesRequestSequence
      || loadGeneration !== scorePageGeneration
      || selectedExamId.value !== examId
    ) {
      return
    }
    candidatesLoadFailed.value = true
    showUserError(error, '成绩确认名单加载失败')
  } finally {
    if (
      requestSequence === candidatesRequestSequence
      && loadGeneration === scorePageGeneration
    ) {
      loading.value = false
    }
  }
}

async function loadRiskOverview(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    riskOverview.value = null
    riskOverviewLoadFailed.value = false
    panelLoadError.value = ''
    return
  }
  const loadGeneration = scorePageGeneration
  const hadOverviewForExam = riskOverview.value != null
  riskOverviewLoading.value = true
  try {
    const overview = await getFinalScoreRiskOverview({ examId })
    if (loadGeneration !== scorePageGeneration || selectedExamId.value !== examId) {
      return
    }
    riskOverview.value = overview
    riskOverviewLoadFailed.value = false
    panelLoadError.value = ''
    const validReasonCodes = new Set(blockingRiskReasons.value.map((reason) => reason.reasonCode))
    reviewedRiskReasonCodes.value = new Set(
      (riskOverview.value.reviewedReasonCodes ?? []).filter((reasonCode) =>
        validReasonCodes.has(reasonCode),
      ),
    )
  } catch (error) {
    if (loadGeneration !== scorePageGeneration || selectedExamId.value !== examId) {
      return
    }
    riskOverviewLoadFailed.value = true
    panelLoadError.value = getUserErrorMessage(error, '成绩风险概览加载失败')
    // 首次失败清空；刷新失败保留 stale 指标，写能力由 riskOverviewLoadFailed fail-closed
    if (!hadOverviewForExam) {
      riskOverview.value = null
    }
  } finally {
    if (loadGeneration === scorePageGeneration) {
      riskOverviewLoading.value = false
    }
  }
}

async function loadScorePanel(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    scorePanel.value = null
    return
  }
  const loadGeneration = scorePageGeneration
  try {
    const panel = await getScorePanel(examId)
    if (loadGeneration !== scorePageGeneration || selectedExamId.value !== examId) {
      return
    }
    scorePanel.value = panel
  } catch (error) {
    if (loadGeneration !== scorePageGeneration || selectedExamId.value !== examId) {
      return
    }
    scorePanel.value = null
    showUserError(error, '成绩面板加载失败')
  }
}

async function refreshScoreFinalizeData(): Promise<void> {
  await loadScorePanel()
  await Promise.all([loadCandidates(), loadRiskOverview(), refreshPendingAbsenceCount()])
}

/**
 * 成绩写入成功后的页面同步：各分段独立 settled，不得把刷新失败冒充为写入失败。
 */
async function refreshAfterScoreWrite(): Promise<void> {
  const failedSurfaces: string[] = []
  try {
    await refreshScoreFinalizeData()
  } catch (error) {
    failedSurfaces.push('成绩列表/风险面板')
    showUserError(error, '成绩列表或风险面板刷新失败')
  }
  try {
    await refreshArchiveGate()
  } catch (error) {
    failedSurfaces.push('归档门禁')
    showUserError(error, '归档门禁刷新失败')
  }
  try {
    await refreshSnapshot()
  } catch (error) {
    failedSurfaces.push('工作台快照')
    showUserError(error, '成绩工作台快照刷新失败')
  }
  if (failedSurfaces.length > 0) {
    void message.warning(
      `成绩已写入成功，但${failedSurfaces.join('、')}刷新失败，请手动刷新后核对，勿重复提交`,
    )
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

// ─── 状态机按钮可用性 ─────────────────────────────
function canConfirm(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  if (!canManageReviewerWrites.value) {
    return false
  }
  // MVR-207：场级硬拦（缺考待确认/未核对、阻塞事件、重复影像）禁用确认，与 BE confirm 硬拦同源
  if (hasFieldWideHardBlockForWrite.value) {
    return false
  }
  const s = record.finalScoreStatus
  // CORRECTED 官方更正分已落账，禁止再走 confirm 重算；只允许发布页/本页「重新发布」。
  if (s === FinalScoreStatusCode.WITHDRAWN) {
    // 列表合同：总分更正官方分与题分不一致时禁用「重新确认」，须「重新发布」保留更正分。
    return !(
      record.latestTotalScoreCorrectionApplied || record.questionScoreSumMatchesExamScore === false
    )
  }
  return s === FinalScoreStatusCode.PENDING || s === FinalScoreStatusCode.CALCULATED
}
function confirmButtonLabel(record: ExamScoreSummaryItemResponse): string {
  return record.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN ? '重新确认' : '确认'
}
function canPublish(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  if (!canManageReviewerWrites.value) {
    return false
  }
  // MVR-207：缺考待确认/未核对 + 阻塞事件/重复影像；软风险仍在点击时集中复核。
  if (hasFieldWideHardBlockForWrite.value || hasHardBlockingRisks.value) {
    return false
  }
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

const blockingRiskReasons = computed(() => {
  const reasons = effectiveRiskOverview.value?.riskReasons ?? []
  return reasons.filter(
    (reason) => reason.reasonCode !== FinalScoreRiskReasonCode.SAFE_CONFIRMABLE && reason.count > 0,
  )
})

const hardBlockingRiskReasons = computed(() => {
  return blockingRiskReasons.value.filter((reason) =>
    HARD_BLOCKING_RISK_REASON_CODES.has(reason.reasonCode),
  )
})

const hasHardBlockingRisks = computed(() => hardBlockingRiskReasons.value.length > 0)

const hasUnreviewedBlockingRisks = computed(() => {
  // 未确认题目分 / 缺批改 / 计零终分待补齐：硬引导处置，不走「标记已复核」软通过
  return blockingRiskReasons.value.some(
    (reason) =>
      !HARD_BLOCKING_RISK_REASON_CODES.has(reason.reasonCode)
      && !isQuestionConfirmRiskReason(reason.reasonCode)
      && reason.reasonCode !== FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL
      && !reviewedRiskReasonCodes.value.has(reason.reasonCode),
  )
})

function openRiskReviewDrawer(): void {
  riskReviewDrawerOpen.value = true
}

const readinessActionLoading = ref<FinalScoreReadinessActionCode | null>(null)

/**
 * 就绪度面板动作：每组只走一个明确 CTA，禁止再弹批量错误列表。
 */
async function handleReadinessAction(item: FinalScoreReadinessItemResponse): Promise<void> {
  if (readinessActionLoading.value) return
  readinessActionLoading.value = item.actionCode
  try {
    if (item.code === 'DELAYED_AUTO_CONFIRM_BLOCKED') {
      goDelayedConfirmTasks()
      return
    }
    switch (item.actionCode) {
      case 'GO_DELAYED_TASKS':
        goDelayedConfirmTasks()
        break
      case 'GO_ABSENCE':
        goAbsenceConfirm()
        break
      case 'REPAIR_SCORE_ZERO':
        await handleRepairScoreZero()
        break
      case 'GO_QUESTION_REVIEW':
        goQuestionReviewBatch()
        break
      case 'GO_SCAN_BATCHES':
        goScanBindingAttention()
        break
      case 'OPEN_RISK_REVIEW':
        openRiskReviewDrawer()
        break
      case 'BATCH_CONFIRM':
        await handleBatchConfirmSafe()
        break
      case 'FILTER_CORRECTED':
        filterCorrectedOnly()
        break
      default:
        break
    }
  } finally {
    readinessActionLoading.value = null
  }
}

function isRiskReasonReviewed(reasonCode: FinalScoreRiskReasonCode): boolean {
  return reviewedRiskReasonCodes.value.has(reasonCode)
}

function isHardBlockingRiskReason(reasonCode: FinalScoreRiskReasonCode): boolean {
  return HARD_BLOCKING_RISK_REASON_CODES.has(reasonCode)
}

function isQuestionConfirmRiskReason(reasonCode: FinalScoreRiskReasonCode): boolean {
  return (
    reasonCode === FinalScoreRiskReasonCode.UNCONFIRMED_QUESTION_GRADE
    || reasonCode === FinalScoreRiskReasonCode.MISSING_QUESTION_GRADE
  )
}

function riskReasonStatusTone(reasonCode: FinalScoreRiskReasonCode): 'green' | 'red' {
  if (isHardBlockingRiskReason(reasonCode) || isQuestionConfirmRiskReason(reasonCode)) return 'red'
  return isRiskReasonReviewed(reasonCode) ? 'green' : 'red'
}

function riskReasonStatusLabel(reasonCode: FinalScoreRiskReasonCode): string {
  if (isHardBlockingRiskReason(reasonCode)) return '需处理'
  if (isQuestionConfirmRiskReason(reasonCode)) return '须题目确认'
  if (reasonCode === FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL) return '须补齐计零'
  if (reasonCode === FinalScoreRiskReasonCode.ABNORMAL_PAPER) return '须扫描处置'
  return isRiskReasonReviewed(reasonCode) ? '已复核' : '待复核'
}

function goAbsenceConfirm(): void {
  const examId = selectedExamId.value
  riskReviewDrawerOpen.value = false
  void router.push({
    name: 'TeacherExamWorkspaceScoreAbsence',
    params: examId ? { examId } : {},
  })
}

/** 绑定异常/未绑定卷走扫描批次与异常待办，不能当缺考销账。 */
function goScanBindingAttention(): void {
  const examId = selectedExamId.value
  riskReviewDrawerOpen.value = false
  void router.push({
    name: 'TeacherExamWorkspaceScanBatches',
    params: examId ? { examId } : {},
  })
}

async function toggleRiskReasonReviewed(reasonCode: FinalScoreRiskReasonCode): Promise<void> {
  // MVR-295/363：与 BE saveFinalScoreRiskReview / requireActiveExam + requireExamReviewerPermission 对齐
  if (!canManageReviewerWrites.value) {
    void message.warning('当前账号无本场评阅写权限，无法标记风险复核')
    return
  }
  if (HARD_BLOCKING_RISK_REASON_CODES.has(reasonCode)) return
  // ABNORMAL_PAPER 可标记已复核（允许先发其它已确认卷），但引导去扫描处置，不能当缺考。
  if (
    reasonCode === FinalScoreRiskReasonCode.UNCONFIRMED_QUESTION_GRADE
    || reasonCode === FinalScoreRiskReasonCode.MISSING_QUESTION_GRADE
  ) {
    void message.warning(
      reasonCode === FinalScoreRiskReasonCode.MISSING_QUESTION_GRADE
        ? '题目批改结果缺失须先完成识别与批改，不能仅标记风险已复核'
        : '未确认题目分须在复核台确认或正评提交，不能仅标记风险已复核',
    )
    goQuestionReviewBatch()
    return
  }
  if (reasonCode === FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL) {
    void message.warning('缺考计零终分待补齐须先执行补齐，不能仅标记风险已复核')
    void handleRepairScoreZero()
    return
  }
  if (!selectedExamId.value || riskReviewSavingReasonCode.value) return
  const next = new Set(reviewedRiskReasonCodes.value)
  if (next.has(reasonCode)) {
    next.delete(reasonCode)
  } else {
    next.add(reasonCode)
  }
  riskReviewSavingReasonCode.value = reasonCode
  try {
    riskOverview.value = await saveFinalScoreRiskReview({
      examId: selectedExamId.value,
      reviewedReasonCodes: [...next],
    })
    const validReasonCodes = new Set(blockingRiskReasons.value.map((reason) => reason.reasonCode))
    reviewedRiskReasonCodes.value = new Set(
      (riskOverview.value.reviewedReasonCodes ?? []).filter((code) => validReasonCodes.has(code)),
    )
    void message.success(
      next.has(reasonCode) ? '异常成绩风险已标记复核' : '异常成绩风险复核标记已取消',
    )
  } catch (error) {
    showUserError(error, '异常成绩复核状态保存失败')
  } finally {
    riskReviewSavingReasonCode.value = null
  }
}

/**
 * 全场硬阻塞（缺考等）与未标记的软风险。
 * 不把「未确认题目分」当作整场禁止：单卷确认/发布由后端卷级门禁校验；
 * 题目待确认由页面 Alert 引导去复核台。
 */
function warnUnreviewedBlockingRisks(): boolean {
  if (hasHardBlockingRisks.value) {
    riskReviewDrawerOpen.value = true
    void message.warning('存在未完成缺考核对学生，请先完成缺考核对后再确认或发布成绩')
    return true
  }
  if (missingAbsenceScoreZeroFinalCount.value > 0) {
    void message.warning('存在缺考计零终分待补齐，请先一键补齐后再确认或发布成绩')
    return true
  }
  if (!hasUnreviewedBlockingRisks.value) return false
  riskReviewDrawerOpen.value = true
  void message.warning('存在未复核的异常成绩，请先完成集中复核后再发布')
  return true
}

/** 安全批量确认仅检查全场级门禁（与后端 collectSafeBatchConfirmBlockingReasons 对齐） */
function warnFieldWideSafeBatchBlockers(): boolean {
  if (hasHardBlockingRisks.value || hasFieldWideSafeBatchBlockers.value) {
    if (hasHardBlockingRisks.value) {
      riskReviewDrawerOpen.value = true
      void message.warning('存在未完成缺考核对学生，请先完成缺考核对后再批量确认成绩')
    } else {
      void message.warning('存在全场阻塞事件或未处置重复影像，暂不可安全批量确认最终成绩')
    }
    return true
  }
  return false
}

/** 未确认题目得分的答卷数（产品门禁：硬判/AI 仍须教师确认） */
const unconfirmedQuestionGradeCount = computed(
  () => effectiveRiskOverview.value?.unconfirmedQuestionGradeCount ?? 0,
)

/** 已确认计零但尚未写入正式零分终分的人数（须一键补齐，不自动洗库） */
const missingAbsenceScoreZeroFinalCount = computed(
  () => effectiveRiskOverview.value?.missingAbsenceScoreZeroFinalCount ?? 0,
)

const repairingScoreZero = ref(false)

async function handleRepairScoreZero(): Promise<void> {
  if (!selectedExamId.value || repairingScoreZero.value) return
  // MVR-295/368：与 BE repairScoreZeroFinalScores（评阅写、不叠 ACTIVE）二次拦截
  if (!canRepairAbsenceScoreZeroFinal.value) {
    void message.warning('当前账号无本场评阅写权限，无法补齐计零终分')
    return
  }
  repairingScoreZero.value = true
  try {
    const result = await repairScoreZeroFinalScores({ examId: selectedExamId.value })
    void message.success(
      result.repairedCount > 0
        ? `已补齐 ${result.repairedCount} 条计零终分`
        : '本场无待补齐的计零缺考',
    )
  } catch (error) {
    showUserError(error, '补齐计零终分失败')
    return
  } finally {
    repairingScoreZero.value = false
  }
  await refreshAfterScoreWrite()
}

/**
 * 安全批量确认卷级最终成绩：仅依赖 safeConfirmableCount + 全场级硬阻塞。
 * 未确认题目分由后端按卷过滤，不应因场内仍有待复核卷而禁用「已全题确认」卷的批量确认。
 * MVR-292：必须叠 canManageReviewerWrites，避免非评阅写权用户顶栏假可点。
 */
const canBatchConfirmSafe = computed(() => {
  const overview = effectiveRiskOverview.value
  return Boolean(
    overview
    && canManageReviewerWrites.value
    && overview.safeConfirmableCount > 0
    && !hasHardBlockingRisks.value
    && !hasFieldWideSafeBatchBlockers.value
    && !hasFieldWideHardBlockForWrite.value
    && !hasDailyScoreConfig.value
    && !batchConfirming.value,
  )
})

/** 与后端 collectSafeBatchConfirmBlockingReasons 对齐的全场级阻断 */
const FIELD_WIDE_SAFE_BATCH_BLOCKERS = new Set<FinalScoreRiskReasonCode>([
  FinalScoreRiskReasonCode.UNRECONCILED_ABSENCE,
  FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL,
  FinalScoreRiskReasonCode.BLOCKING_INCIDENT,
  FinalScoreRiskReasonCode.PENDING_DUPLICATE_IMAGE,
])

const hasFieldWideSafeBatchBlockers = computed(() => {
  return (effectiveRiskOverview.value?.riskReasons ?? []).some(
    (reason) => reason.count > 0 && FIELD_WIDE_SAFE_BATCH_BLOCKERS.has(reason.reasonCode),
  )
})

async function handleBatchConfirmSafe(): Promise<void> {
  if (batchConfirming.value) {
    return
  }
  // MVR-292：与 BE requireExamReviewerPermission / canManageReviewerWrites 二次拦截
  if (!canManageReviewerWrites.value) {
    void message.warning('当前账号无本场评阅写权限，无法批量确认成绩')
    return
  }
  if (!selectedExamId.value || !effectiveRiskOverview.value) return
  if (warnFieldWideSafeBatchBlockers()) return
  const canContinue = await ensureScoreConfirmPreconditions()
  if (!canContinue) {
    return
  }
  batchConfirming.value = true
  try {
    const result = await batchConfirmSafeFinalScores({ examId: selectedExamId.value })
    if (result.successCount > 0) {
      void message.success(`已批量确认 ${result.successCount} 份无风险成绩`)
    } else if (result.skippedCount > 0) {
      const reasonText = result.skipReasons
        .map((reason) => `${reason.reasonName} ${reason.count}`)
        .join('，')
      void message.warning(
        reasonText ? `批量确认已跳过：${reasonText}` : '当前没有可批量确认的成绩',
      )
    } else {
      void message.info('当前没有可批量确认的成绩')
    }
    if (result.failureCount > 0) {
      const groupText = formatFinalScoreFailureGroups(result.failureGroups)
      void message.warning(
        groupText
          ? `有 ${result.failureCount} 份成绩确认失败：${groupText}`
          : `有 ${result.failureCount} 份成绩确认失败，请查看列表后逐份处理`,
      )
    }
  } catch (error) {
    showUserError(error, '批量确认无风险成绩失败')
    return
  } finally {
    batchConfirming.value = false
  }
  await refreshAfterScoreWrite()
}

const statMetrics = computed((): SignalMetric[] =>
  buildScoreFinalizeSignalMetrics(
    scorePanel.value,
    effectiveRiskOverview.value,
    hasDailyScoreConfig.value,
    publishableOverviewCount.value,
  ),
)


/** 配置了日常分的考试：Worker 无法代填日常分，须逐人录日常分后手工确认。 */
const dailyScoreManualConfirmNotice = computed(() => {
  if (!hasDailyScoreConfig.value) {
    return null
  }
  return '本场考试配置了日常分，系统不会延迟自动确认最终成绩。请在题目分全部教师确认后，逐人录入日常分并手工确认总成绩。'
})

// ─── 全场发布与发布门禁 ─────────────────────────────
const bulkModalStatItems = computed(() => {
  const overview = effectiveRiskOverview.value
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
    // MVR-293：须叠 canManageReviewerWrites，避免非评阅写权用户顶栏假可点全场发布
    && canManageReviewerWrites.value
    && publishableOverviewCount.value > 0
    && riskOverview.value?.readyToPublish === true
    && (riskOverview.value?.blockedCount ?? 0) === 0
    // 场级硬拦二次闸：pendingAbsence / 阻塞事件 / 重复影像（readyToPublish 已含 pendingAbsence）
    && !hasFieldWideHardBlockForWrite.value,
)

const bulkOpen = ref(false)
const bulkRunning = ref(false)
const bulkResult = ref<FinalScoreBatchPublishResponse | null>(null)
const bulkResultPercent = computed(() => {
  const result = bulkResult.value
  if (!result || result.totalCandidateCount <= 0) return 0
  return Math.round((result.alreadyPublishedCount / result.totalCandidateCount) * 100)
})

function resetBulkState(): void {
  bulkResult.value = null
}

function openBulkPublishModal(): void {
  // MVR-293：与 BE requireExamReviewerPermission / canManageReviewerWrites 二次拦截
  if (!canManageReviewerWrites.value) {
    void message.warning('当前账号无本场评阅写权限，无法全场发布成绩')
    return
  }
  if (!canBulkPublish.value) {
    void message.warning('当前考试没有可发布的最终成绩')
    return
  }
  void (async () => {
    await Promise.all([loadRiskOverview(), loadScorePanel()])
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
  // MVR-293：与 BE batchPublishFinalScores 评阅写门禁二次拦截
  if (!canManageReviewerWrites.value) {
    void message.warning('当前账号无本场评阅写权限，无法全场发布成绩')
    return
  }
  const canContinue = await ensureScorePublishPreconditions()
  if (!canContinue) {
    bulkOpen.value = false
    return
  }
  bulkRunning.value = true
  try {
    bulkResult.value = await batchPublishFinalScores({ examId: selectedExamId.value })
    // 保留后端 afterOverview，后续刷新失败不得清掉本次发布结果
    riskOverview.value = bulkResult.value.afterOverview
    if (bulkResult.value.failureCount === 0 && bulkResult.value.remainingCount === 0) {
      void message.success('全场成绩已发布，学生通知已下发')
      bulkOpen.value = false
    } else if (bulkResult.value.failureCount === 0) {
      void message.warning(
        `全场发布完成：成功 ${bulkResult.value.successCount} 条，仍有 ${bulkResult.value.remainingCount} 条需处理`,
      )
    } else {
      void message.warning(
        `全场发布完成：成功 ${bulkResult.value.successCount} 条，失败 ${bulkResult.value.failureCount} 条（${formatFinalScoreFailureGroups(bulkResult.value.failureGroups) || '按原因分组查看'}）`,
      )
    }
  } catch (error) {
    showUserError(error, '全场成绩发布失败')
    return
  } finally {
    bulkRunning.value = false
  }
  await refreshAfterScoreWrite()
}

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

function goQuestionReviewBatch(): void {
  const examId = selectedExamId.value
  if (!examId) return
  void router.push({
    name: 'TeacherExamWorkspaceReviewBatchConfirm',
    params: { examId },
  })
}

/**
 * D-3 当前页成绩偏差统计：
 * 仅基于当前页 finalScore 非空的候选计算均值与样本标准差，用于「偏差」列与顶部偏差提示。
 * 因后端为服务端分页，统计口径在视觉上限定为「当前页」，避免误导教师把页内异常当作整考试异常。
 * 当样本数 < 3 或方差为 0 时，stddev 返回 0，模板侧降级为「样本不足」展示。
 */
const pageScoreStats = computed(() =>
  computeScoreBiasStats(
    candidates.value
      .map((candidate) => candidate.finalScore)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
  ),
)

function biasLevelLabel(level: ScoreBiasLevelCode): string {
  return strictEnumLabel(ScoreBiasLevelDescription, level, '成绩偏差等级')
}

function biasLevelTone(level: ScoreBiasLevelCode): BadgeTone {
  return strictEnumTone(SCORE_BIAS_LEVEL_TONE, level, '成绩偏差等级')
}

function buildFinalizeActions(record: ExamScoreSummaryItemResponse): UiTableRowActionItem[] {
  // 行内仅 1 个 primary：可确认优先于可发布
  const confirmable = canConfirm(record)
  const publishable = canPublish(record)
  return [
    {
      key: 'detail',
      label: record.absenceScoreZero ? '计零说明' : '明细',
      disabled: !record.paperInstanceId,
    },
    {
      key: 'confirm',
      label: confirmButtonLabel(record),
      tone: confirmable ? 'primary' : undefined,
      disabled: !confirmable,
    },
    {
      key: 'publish',
      label: publishButtonLabel(record),
      tone: !confirmable && publishable ? 'primary' : undefined,
      disabled: !publishable,
    },
    { key: 'withdraw', label: withdrawButtonLabel(record), disabled: !canWithdraw(record) },
  ]
}

function handleFinalizeRowAction(key: string, record: ExamScoreSummaryItemResponse): void {
  switch (key) {
    case 'detail':
      void openDetailDrawer(record)
      break
    case 'confirm':
      void openConfirmModal(record)
      break
    case 'publish':
      void handlePublish(record)
      break
    case 'withdraw':
      openWithdrawModal(record)
      break
  }
}

function canWithdraw(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  // MVR-292：撤回/撤销确认须评阅写权，与 BE withdrawFinalScore 门禁对齐
  if (!canManageReviewerWrites.value) {
    return false
  }
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

// ─── B-6 操作记录（审计可追溯） ─────────────────────────────
const auditLogs = ref<OperationLogResponse[]>([])
const auditLoading = ref(false)
const auditPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const TRACE_TAG_TONE: BadgeTone = 'gray'

function scoreAuditTitle(log: OperationLogResponse): string {
  return strictEnumLabel(OperationTypeDescription, log.operationType, '审计操作类型')
}

function scoreAuditTone(log: OperationLogResponse): BadgeTone {
  return strictEnumTone(OPERATION_TYPE_TONE, log.operationType, '审计操作类型')
}

async function loadPaperAuditLogs(): Promise<void> {
  if (!selectedExamId.value || !detailCandidate.value?.paperInstanceId) {
    auditLogs.value = []
    auditPagination.total = 0
    return
  }
  auditLoading.value = true
  const examId = selectedExamId.value
  const paperInstanceId = detailCandidate.value.paperInstanceId
  const loadGeneration = scorePageGeneration
  try {
    const page = await listOperationLogs({
      examId,
      targetType: AuditTargetTypeCode.EXAM_FINAL_SCORE,
      targetId: paperInstanceId,
      pageNum: auditPagination.pageNum,
      pageSize: auditPagination.pageSize,
    })
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== examId
      || detailCandidate.value?.paperInstanceId !== paperInstanceId
    ) {
      return
    }
    auditLogs.value = page.list
    auditPagination.pageNum = page.pageNum
    auditPagination.pageSize = page.pageSize
    auditPagination.total = page.total
  } catch (error) {
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== examId
      || detailCandidate.value?.paperInstanceId !== paperInstanceId
    ) {
      return
    }
    void message.warning(getUserErrorMessage(error, '操作记录加载失败'))
  } finally {
    if (
      loadGeneration === scorePageGeneration
      && detailCandidate.value?.paperInstanceId === paperInstanceId
    ) {
      auditLoading.value = false
    }
  }
}

function handleAuditPageChange(pageNum: number, pageSize: number): void {
  auditPagination.pageNum = pageNum
  auditPagination.pageSize = pageSize
  void loadPaperAuditLogs()
}

/** 把审计日志聚合到一个时间分组，喂给 UiActivityTimeline */
const auditTimelineGroups = computed(() => {
  const items = auditLogs.value.map((log, idx) => {
    return {
      key: log.id ?? idx,
      title: scoreAuditTitle(log),
      content: log.reason || undefined,
      time: log.createTime ? formatDateTimeWithSeconds(log.createTime, '') : undefined,
      actor: log.operatorRole ? `操作角色：${log.operatorRole}` : undefined,
      tone: scoreAuditTone(log),
      tags: log.traceId
        ? [{ label: `处理追踪编号 ${log.traceId.slice(0, 8)}…`, tone: TRACE_TAG_TONE }]
        : undefined,
    }
  })
  if (items.length === 0) return []
  return [
    {
      key: 'final-score-audit',
      label: '成绩状态变更',
      countText: `${items.length} 条记录`,
      items,
    },
  ]
})

// ─── B-2 该学生本课程历次成绩趋势 ─────────────────────────────
interface HistoricalScorePoint {
  examId: string
  examName: string
  examEndTime?: string
  finalScore: number
  isCurrent: boolean
}

const historicalScores = ref<HistoricalScorePoint[]>([])
const historicalLoading = ref(false)
/** 同课程历次考试上限：超过 20 场不再回查（避免 N+1 雪崩；典型课程一学期 ≤ 10 场） */
const HISTORICAL_EXAMS_MAX = 20

/**
 * 加载该学生在「同 courseId」考试中的历次最终成绩。
 * 调用链：pageExams({ courseId }) → 对每场 pageExamScoreSummary({ examId, keyword: studentNo, pageSize: 1 })
 * 仅纳入 finalScore != null 的考试，按 examEndTime 升序绘制。
 */
async function loadHistoricalScores(): Promise<void> {
  const courseId = examDetail.value?.courseId
  const candidate = detailCandidate.value
  if (!courseId || !candidate?.studentNo) {
    historicalScores.value = []
    return
  }
  const frozenExamId = selectedExamId.value
  const frozenPaperInstanceId = candidate.paperInstanceId
  const frozenStudentNo = candidate.studentNo
  const loadGeneration = scorePageGeneration
  historicalLoading.value = true
  try {
    const examsPage = await pageExams({
      pageNum: 1,
      pageSize: HISTORICAL_EXAMS_MAX,
      courseId,
    })
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== frozenExamId
      || detailCandidate.value?.paperInstanceId !== frozenPaperInstanceId
    ) {
      return
    }
    const courseExams = examsPage.list
    const settled = await Promise.all(
      courseExams.map(async (exam) => {
        const result = await pageExamScoreSummary({
          examId: exam.examId,
          keyword: frozenStudentNo,
          pageNum: 1,
          pageSize: 1,
        })
        const item = result.list[0]
        if (!item || item.finalScore == null) return null
        const point: HistoricalScorePoint = {
          examId: exam.examId,
          examName: exam.examName,
          examEndTime: exam.examEndTime,
          finalScore: item.finalScore,
          isCurrent: exam.examId === frozenExamId,
        }
        return point
      }),
    )
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== frozenExamId
      || detailCandidate.value?.paperInstanceId !== frozenPaperInstanceId
    ) {
      return
    }
    historicalScores.value = settled
      .filter((p): p is HistoricalScorePoint => p !== null)
      .sort((a: HistoricalScorePoint, b: HistoricalScorePoint) => {
        const ta = a.examEndTime ? dayjs(a.examEndTime).valueOf() : 0
        const tb = b.examEndTime ? dayjs(b.examEndTime).valueOf() : 0
        return ta - tb
      })
  } catch (error) {
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== frozenExamId
      || detailCandidate.value?.paperInstanceId !== frozenPaperInstanceId
    ) {
      return
    }
    void message.warning(getUserErrorMessage(error, '历次成绩趋势加载失败'))
  } finally {
    if (
      loadGeneration === scorePageGeneration
      && detailCandidate.value?.paperInstanceId === frozenPaperInstanceId
    ) {
      historicalLoading.value = false
    }
  }
}

/** 历次成绩趋势图：考试名为 label，教师复核评分为 value，当前考试 key 高亮 */
const historicalTrendPoints = computed<UiTrendPoint[]>(() => {
  return historicalScores.value.map((p) => ({
    key: p.examId,
    label: p.examName.length > 8 ? `${p.examName.slice(0, 8)}…` : p.examName,
    value: p.finalScore,
  }))
})

const historicalTrendHint = computed(() =>
  buildTrendChartInsight(historicalTrendPoints.value, { valueUnit: ' 分' }),
)

const { chartOption: historicalTrendChartOption } = useChartOption(() =>
  buildTrendLineChartOption(historicalTrendPoints.value, {
    yAxisName: '教师复核分',
    area: true,
    highlightKey: selectedExamId.value ?? '',
    emptyText: MARK_CHART_EMPTY.trendNoHistory,
  }),
)

const historicalTrendLastValue = computed(() => {
  const points = historicalTrendPoints.value
  if (points.length === 0) {
    return null
  }
  return Number(points[points.length - 1]?.value)
})

const historicalTrendAriaLabel = computed(() =>
  formatTrendAriaLabel(
    '本课程历次成绩趋势',
    historicalTrendPoints.value.length,
    historicalTrendLastValue.value,
    ' 分',
  ),
)

/** 历次成绩派生的统计文本，避免模板里堆三元 */
const historicalSummary = computed(() => {
  const points = historicalScores.value
  if (points.length === 0) return null
  const current = points.find((p) => p.isCurrent)
  const others = points.filter((p) => !p.isCurrent)
  if (!current || others.length === 0) {
    return { count: points.length, currentScore: current?.finalScore ?? null, deltaText: '' }
  }
  const previous = others[others.length - 1]
  const delta = current.finalScore - previous.finalScore
  const deltaSign = delta > 0 ? '+' : ''
  return {
    count: points.length,
    currentScore: current.finalScore,
    deltaText: `较上次（${previous.examName}）${deltaSign}${delta.toFixed(1)} 分`,
  }
})

async function openDetailDrawer(record: ExamScoreSummaryItemResponse): Promise<void> {
  const examId = selectedExamId.value
  if (!examId || !record.paperInstanceId) return
  const frozenExamId = examId
  const frozenPaperInstanceId = record.paperInstanceId
  const loadGeneration = scorePageGeneration
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
  auditLogs.value = []
  auditPagination.pageNum = 1
  auditPagination.total = 0
  historicalScores.value = []
  try {
    const score = await getPaperScore({
      examId: frozenExamId,
      paperInstanceId: frozenPaperInstanceId,
    })
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== frozenExamId
      || detailCandidate.value?.paperInstanceId !== frozenPaperInstanceId
    ) {
      return
    }
    paperScore.value = score
  } catch (error) {
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== frozenExamId
      || detailCandidate.value?.paperInstanceId !== frozenPaperInstanceId
    ) {
      return
    }
    showUserError(error, '成绩明细加载失败')
  } finally {
    if (
      loadGeneration === scorePageGeneration
      && detailCandidate.value?.paperInstanceId === frozenPaperInstanceId
    ) {
      detailLoading.value = false
    }
  }
  // 操作记录、历次成绩趋势与成绩明细并行展示但顺序加载，避免单点失败阻断主明细
  void loadPaperAuditLogs()
  void loadHistoricalScores()
}

// ─── 确认成绩 Modal ─────────────────────────────
const confirmOpen = ref(false)
const confirming = ref(false)
/** 单卷发布中的试卷实例 ID，防止列表行重复点击 */
const publishingPaperId = ref<string | null>(null)
const confirmCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const confirmComputedExamScore = ref<number | null>(null)
const confirmDailyScore = ref<number | undefined>(undefined)
const confirmAndPublish = ref(false)

const confirmTotalScorePreview = computed<number | null>(() => {
  const examScore = confirmComputedExamScore.value
  if (examScore == null) {
    return null
  }
  if (hasDailyScoreConfig.value) {
    if (confirmDailyScore.value == null) {
      return null
    }
    return Number((examScore + confirmDailyScore.value).toFixed(2))
  }
  return Number(examScore.toFixed(2))
})

function formatScorePoints(score: number | null | undefined): string {
  return score != null ? `${score} 分` : '—'
}

/** 确认弹窗卷面分预览：只汇总已教师确认题分；不把 CALCULATED 的 AI 预估 examScore 当正式分。 */
function resolveConfirmExamScorePreview(score: ExamPaperScoreResponse): number | null {
  // 仅正式态（已确认/已发布/已更正/已撤回）才信任后端 formal examScore
  const formalStatuses = new Set([
    FinalScoreStatusCode.CONFIRMED,
    FinalScoreStatusCode.PUBLISHED,
    FinalScoreStatusCode.CORRECTED,
    FinalScoreStatusCode.WITHDRAWN,
  ])
  if (
    score.examScore != null
    && score.finalScoreStatus
    && formalStatuses.has(score.finalScoreStatus)
  ) {
    return score.examScore
  }
  const questions = score.questions ?? []
  if (questions.length === 0) {
    return null
  }
  if (
    questions.some(
      (question) =>
        question.gradeStatus !== GradeStatusCode.CONFIRMED || question.teacherReviewScore == null,
    )
  ) {
    // 题分未全部教师确认：不展示 0 分假预览，也不展示 AI 预估
    return null
  }
  return Number(
    questions
      .reduce((sum, question) => sum + Number(question.teacherReviewScore ?? 0), 0)
      .toFixed(2),
  )
}

async function openConfirmModal(record: ExamScoreSummaryItemResponse): Promise<void> {
  const examId = selectedExamId.value
  if (!examId || !record.paperInstanceId) return
  // MVR-419：与 canConfirm(record) / 行内 disabled 同源二次闸（写权∧状态∧场级硬拦）
  if (!canConfirm(record)) {
    if (record.finalScoreStatus === FinalScoreStatusCode.CORRECTED) {
      void message.warning(
        '成绩已更正，请直接重新发布；禁止确认覆盖官方更正分。如需再改请走成绩更正流程。',
      )
      return
    }
    void message.warning(
      !canManageReviewerWrites.value
        ? '当前账号无本场评阅写权限，无法确认成绩'
        : '当前答卷不可确认（状态不允许或场级硬拦未解除）',
    )
    return
  }
  const frozenExamId = examId
  const frozenPaperInstanceId = record.paperInstanceId
  const loadGeneration = scorePageGeneration
  confirmCandidate.value = record
  confirmOpen.value = true
  confirmComputedExamScore.value = null
  confirmDailyScore.value = undefined
  confirmAndPublish.value = false
  try {
    const score = await getPaperScore({
      examId: frozenExamId,
      paperInstanceId: frozenPaperInstanceId,
    })
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== frozenExamId
      || confirmCandidate.value?.paperInstanceId !== frozenPaperInstanceId
      || !confirmOpen.value
    ) {
      return
    }
    // 总分更正后 WITHDRAWN：官方分可与题分之和不一致；重新确认会覆盖官方更正分，须引导重发布。
    if (
      record.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN
      && (score.latestTotalScoreCorrectionApplied || score.questionScoreSumMatchesExamScore === false)
    ) {
      confirmOpen.value = false
      confirmCandidate.value = null
      void message.warning(
        '本卷含官方更正分（与题分明细不一致）。请直接「重新发布」保留更正分；若需按题分重算，请先走成绩更正调整题目分。',
      )
      return
    }
    confirmComputedExamScore.value = resolveConfirmExamScorePreview(score)
    if (confirmComputedExamScore.value == null) {
      void message.warning(
        '题目分尚未全部教师确认，或当前仅为智能预估分。请先完成题目复核/正评后再确认最终成绩。',
      )
    }
    if (hasDailyScoreConfig.value) {
      confirmDailyScore.value = score.dailyScore ?? undefined
    }
  } catch (error) {
    if (
      loadGeneration !== scorePageGeneration
      || selectedExamId.value !== frozenExamId
      || confirmCandidate.value?.paperInstanceId !== frozenPaperInstanceId
    ) {
      return
    }
    void message.warning(getUserErrorMessage(error, '试卷总分加载失败'))
  }
}

// ─── D-3 下一步：全场发布升级抽屉 + 单卷就地继续提示 ─────────────────────────────
interface PublishReadyStepState {
  visible: boolean
  title: string
  description: string
}

interface ContinueConfirmHintState {
  description: string
  nextCandidate: ExamScoreSummaryItemResponse
}

const publishReadyStep = ref<PublishReadyStepState>({
  visible: false,
  title: '',
  description: '',
})

const continueConfirmHint = ref<ContinueConfirmHintState | null>(null)

function closePublishReadyStep(): void {
  publishReadyStep.value = { visible: false, title: '', description: '' }
}

function closeContinueConfirmHint(): void {
  continueConfirmHint.value = null
}

/**
 * 确认成功后的下一步：
 * - 全场具备发布条件 → 唯一升级抽屉（全场发布）
 * - 当前页仍有待确认 → 列表上方就地提示，不另开 Drawer
 * - 当前页已处理完 → 仅 toast，引导筛选/翻页
 */
function deriveNextStepSuggestion(): void {
  closeContinueConfirmHint()
  closePublishReadyStep()
  const overview = effectiveRiskOverview.value
  if (overview?.readyToPublish) {
    publishReadyStep.value = {
      visible: true,
      title: '全场成绩已具备发布条件',
      description: `共 ${overview.totalCandidateCount} 名考生：已确认 ${overview.confirmedCount} · 已发布 ${overview.publishedCount} · 已撤回 ${overview.withdrawnCount} · 已更正 ${overview.correctedCount}。可在本页执行「全场发布」推送到学生侧。`,
    }
    return
  }
  const next
    = candidates.value.find(
      (c) =>
        c.finalScoreStatus === FinalScoreStatusCode.CALCULATED
        || c.finalScoreStatus === FinalScoreStatusCode.PENDING,
    ) ?? null
  if (next) {
    continueConfirmHint.value = {
      description: `下一份待确认：${next.paperDisplay.primaryText}。确认后继续就地处理，无需离开名单。`,
      nextCandidate: next,
    }
    return
  }
  void message.info('当前页成绩已处理；全场仍有待确认或风险项时，请切换筛选或翻页。')
}

function handleContinueConfirmHint(): void {
  const next = continueConfirmHint.value?.nextCandidate
  closeContinueConfirmHint()
  if (next) {
    void openConfirmModal(next)
  }
}

function handlePublishReadyGoPublish(): void {
  closePublishReadyStep()
  if (canBulkPublish.value) {
    openBulkPublishModal()
    return
  }
  void message.info('请先完成发布条件，或使用顶栏「全场发布」')
}

async function handleConfirm(): Promise<void> {
  // MVR-419：与 canConfirm / openConfirmModal 同源二次闸
  if (!confirmCandidate.value || !canConfirm(confirmCandidate.value)) {
    void message.warning(
      !canManageReviewerWrites.value
        ? '仅本场阅卷组织成员或主考可确认最终成绩'
        : '当前答卷不可确认（状态不允许或场级硬拦未解除）',
    )
    return
  }
  if (confirming.value) {
    return
  }
  if (!selectedExamId.value || !confirmCandidate.value?.paperInstanceId) return
  // 单卷确认仅场级缺考硬阻断；软风险（绑定异常等）不阻止确认，发布时再集中复核。
  if (hasHardBlockingRisks.value) {
    riskReviewDrawerOpen.value = true
    void message.warning('存在未完成缺考核对学生，请先完成缺考核对后再确认成绩')
    return
  }
  if (confirmComputedExamScore.value == null) {
    void message.warning('题目分尚未全部教师确认，不能确认最终成绩。请先完成复核台确认或正评提交。')
    return
  }
  if (hasDailyScoreConfig.value && confirmDailyScore.value == null) {
    showFormValidationMessage('请录入日常成绩')
    return
  }
  const examId = selectedExamId.value
  const paperInstanceId = confirmCandidate.value.paperInstanceId
  const shouldPublish = confirmAndPublish.value
  confirming.value = true
  try {
    await confirmFinalScore({
      examId,
      paperInstanceId,
      dailyScore: hasDailyScoreConfig.value ? (confirmDailyScore.value ?? undefined) : undefined,
    })
    if (shouldPublish) {
      if (warnUnreviewedBlockingRisks()) {
        void message.success('成绩已确认，发布前请先完成异常风险集中复核')
        confirmOpen.value = false
        await refreshAfterScoreWrite()
        deriveNextStepSuggestion()
        return
      }
      const canContinue = await ensureSinglePaperPublishPreconditions()
      if (!canContinue) {
        void message.success('成绩已确认，发布前请先完成缺考核对或风险处置')
        confirmOpen.value = false
        await refreshAfterScoreWrite()
        deriveNextStepSuggestion()
        return
      }
      try {
        await publishFinalScore({ examId, paperInstanceId })
        void message.success('成绩已确认并发布，学生通知已下发')
      } catch (publishError) {
        void message.success('成绩已确认')
        showUserError(publishError, '成绩已确认，但发布失败')
        confirmOpen.value = false
        await refreshAfterScoreWrite()
        deriveNextStepSuggestion()
        return
      }
    } else {
      void message.success('成绩已确认，可在列表点击「发布」推送到学生侧')
    }
    confirmOpen.value = false
  } catch (error) {
    showUserError(error, '成绩确认失败')
    return
  } finally {
    confirming.value = false
  }
  await refreshAfterScoreWrite()
  deriveNextStepSuggestion()
}

// ─── 发布成绩 ─────────────────────────────
async function handlePublish(record: ExamScoreSummaryItemResponse): Promise<void> {
  // MVR-419：与 canPublish(record) / 行内 disabled 同源二次闸
  if (!canPublish(record)) {
    void message.warning(
      !canManageReviewerWrites.value
        ? '仅本场阅卷组织成员或主考可发布最终成绩'
        : '当前答卷不可发布（状态不允许或场级硬拦未解除）',
    )
    return
  }
  if (publishingPaperId.value) {
    return
  }
  if (!selectedExamId.value || !record.paperInstanceId) return
  if (warnUnreviewedBlockingRisks()) return
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
    void message.success('成绩已发布，学生通知已下发')
  } catch (error) {
    showUserError(error, '成绩发布失败')
    return
  } finally {
    publishingPaperId.value = null
  }
  await refreshAfterScoreWrite()
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
  // MVR-419：与 canWithdraw(record) / 行内 disabled 同源二次闸
  if (!canWithdraw(record)) {
    void message.warning(
      !canManageReviewerWrites.value
        ? '当前账号无本场评阅写权限，无法撤回成绩'
        : '当前答卷不可撤回（状态不允许）',
    )
    return
  }
  withdrawCandidate.value = record
  withdrawReason.value = ''
  withdrawOpen.value = true
}

async function handleWithdraw(): Promise<void> {
  if (withdrawing.value) {
    return
  }
  // MVR-419：与 canWithdraw / openWithdrawModal 同源二次闸
  if (!withdrawCandidate.value || !canWithdraw(withdrawCandidate.value)) {
    void message.warning(
      !canManageReviewerWrites.value
        ? '当前账号无本场评阅写权限，无法撤回成绩'
        : '当前答卷不可撤回（状态不允许）',
    )
    return
  }
  if (!selectedExamId.value || !withdrawCandidate.value?.paperInstanceId) return
  const reason = withdrawReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请填写撤回原因')
    return
  }
  const wasConfirmedOnly
    = withdrawCandidate.value.finalScoreStatus === FinalScoreStatusCode.CONFIRMED
  withdrawing.value = true
  try {
    await withdrawFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: withdrawCandidate.value.paperInstanceId,
      reason,
    })
    void message.success(wasConfirmedOnly ? '已撤销成绩确认' : '成绩已撤回')
    withdrawOpen.value = false
  } catch (error) {
    showUserError(error, '成绩撤回失败')
    return
  } finally {
    withdrawing.value = false
  }
  await refreshAfterScoreWrite()
}

// ─── 初始化 ─────────────────────────────────────
watch(
  selectedExamId,
  (value) => {
    scorePageGeneration += 1
    candidatesRequestSequence += 1
    pagination.current = 1
    statusTabKey.value = SCORE_STATUS_TAB_ALL
    scoreFilterForm.keyword = ''
    scoreFilterForm.classId = undefined
    scoreFilterForm.unpublishedBoundOnly = false
    examArchiveGate.value = null
    reviewedRiskReasonCodes.value = new Set()
    riskReviewDrawerOpen.value = false
    bulkOpen.value = false
    bulkResult.value = null
    examDetail.value = null
    candidates.value = []
    candidatesLoadFailed.value = false
    riskOverview.value = null
    riskOverviewLoadFailed.value = false
    scorePanel.value = null
    panelLoadError.value = ''
    pagination.total = 0
    confirmOpen.value = false
    confirmCandidate.value = null
    continueConfirmHint.value = null
    publishReadyStep.value = { visible: false, title: '', description: '' }
    detailOpen.value = false
    detailCandidate.value = null
    paperScore.value = null
    if (value) {
      void Promise.all([loadExamDetail(), refreshScoreFinalizeData()])
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.score-finalize-page {
  min-width: 0;
}

.score-finalize {
  &__notice-banner {
    margin-top: var(--dp-space-component);
  }

  &__alert {
    margin-top: var(--dp-space-component);
  }

  &__more-gates {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--dp-space-component-tight) var(--dp-space-component);
    margin: 0 0 var(--dp-space-component);
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

  &__filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
  }

  &__filter-chip {
    padding: 2px var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface);
    font-size: var(--dp-font-size-xs);
    line-height: 1.5;
    color: var(--dp-text-secondary);
    cursor: pointer;
    transition:
      border-color var(--dp-duration-normal) var(--dp-ease-default),
      color var(--dp-duration-normal) var(--dp-ease-default),
      background-color var(--dp-duration-normal) var(--dp-ease-default);

    &:hover {
      border-color: var(--dp-color-primary-border);
      color: var(--dp-color-primary);
    }

    &--active {
      border-color: var(--dp-color-primary);
      background: color-mix(in srgb, var(--dp-color-primary) 8%, var(--dp-surface));
      color: var(--dp-color-primary);
      font-weight: 600;
    }
  }

  &__bulk-result {
    margin-top: var(--dp-space-component);
  }

  &__bulk-meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    margin-top: var(--dp-space-component-xs);
  }

  &__bulk-group {
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border-bottom: 1px solid var(--dp-border-subtle);

    &:last-child {
      border-bottom: 0;
    }
  }

  &__bulk-group-head {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__bulk-group-title {
    font-size: var(--dp-font-size-sm);
    font-weight: 500;
    color: var(--dp-text-primary);
  }

  &__bulk-group-count {
    margin-left: var(--dp-space-component-xs);
    color: var(--dp-text-secondary);
    font-weight: 600;
  }

  &__bulk-group-samples {
    margin: var(--dp-space-component-xs) 0 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-quaternary);
  }
  &__bulk-fail-groups {
    margin-top: var(--dp-space-component);
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
    max-height: 320px;
    overflow-y: auto;
  }

  &__bulk-fail-intro {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__bulk-fail-group {
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-control);
    background: color-mix(in srgb, var(--dp-error) 4%, var(--dp-surface));
  }

  &__bulk-fail-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
  }

  &__bulk-fail-title {
    font-size: var(--dp-font-size-sm);
    font-weight: 500;
    color: var(--dp-text-primary);
  }

  &__bulk-fail-meta {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    margin-top: var(--dp-space-component-xs);
    flex-wrap: wrap;
  }

  &__bulk-fail-hint {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-quaternary);
  }

  &__bulk-group-count {
    margin-left: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    color: var(--dp-error);
  }

  &__guide {
    margin-bottom: var(--dp-space-component);
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: var(--dp-space-component) 0;
  }

  &__table-section {
    margin-top: var(--dp-space-component);
  }

  &__table-shell {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-block);
    padding: var(--dp-space-component) var(--dp-space-block);
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
    gap: var(--dp-space-component);
    width: 100%;
  }

  &__table-toolbar-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--dp-space-component);
    flex-wrap: wrap;
    width: 100%;
  }

  &__table-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--dp-text-primary);
  }

  &__detail-summary {
    margin-bottom: var(--dp-space-block);
  }

  &__detail-section-title {
    margin: var(--dp-space-block) 0 var(--dp-space-component-tight) 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__hint {
    color: var(--dp-text-muted);
  }

  &__table-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__risk-review-list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__risk-review-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);
  }

  &__risk-review-main {
    display: flex;
    align-items: flex-start;
    gap: var(--dp-space-component);
  }

  &__risk-review-title {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__risk-review-desc {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__bias-cell {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__bias-delta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__detail-section-helper {
    margin-left: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    font-weight: normal;
    color: var(--dp-text-muted);
  }

  &__history-chart {
    margin-top: var(--dp-space-component-tight);
  }

  &__audit-pagination {
    margin-top: var(--dp-space-component);
    display: flex;
    justify-content: flex-end;
  }

  &__next-step {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__next-step-desc {
    margin: 0;
    color: var(--dp-text-primary);
  }

  &__next-step-actions {
    display: flex;
    gap: var(--dp-space-component-tight);
    justify-content: flex-end;
  }
}
</style>
