<template>
  <StageWorkbenchShell class="score-finalize-page">
    <template v-if="selectedExamId" #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="scoreFinalizeWorkbenchTitle"
        :subtitle="scoreFinalizeWorkbenchSubtitle"
      >
        <template #status>
          <UiTag v-if="scoresFullyPublished === true" tone="green" size="sm">已全部发布</UiTag>
          <UiTag
            v-else-if="(effectiveRiskOverview?.pendingMyPublishReviewCount ?? 0) > 0"
            tone="orange"
            size="sm"
          >
            待我复核
          </UiTag>
          <UiTag v-else-if="blockingRiskReasons.length > 0" tone="orange" size="sm">
            有阻塞
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="canBatchConfirmSafe === true && scoreFinalizePrimaryAction?.key !== 'batch-confirm'"
            variant="outline"
            size="sm"
            :loading="batchConfirming === true"
            @click="handleBatchConfirmSafe"
          >
            批量确认无风险
          </UiButton>
          <UiButton
            v-if="scoreFinalizePrimaryAction"
            variant="outline"
            size="sm"
            :loading="scoreFinalizePrimaryAction.loading"
            :disabled="scoreFinalizePrimaryAction.disabled"
            @click="scoreFinalizePrimaryAction.run()"
          >
            <template v-if="scoreFinalizePrimaryAction.key === 'bulk-submit'" #icon>
              <ThunderboltOutlined />
            </template>
            {{ scoreFinalizePrimaryAction.label }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand
        :metrics="statMetrics"
        layout="spotlight"
        variant="panel"
        compact
        @metric-click="handleScoreFinalizeSignalClick"
      />
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
          v-if="panelNotice.action === 'scan'"
          variant="outline"
          size="sm"
          @click="goScanBatches"
        >
          前往扫描登记
        </UiButton>
        <UiButton
          v-else-if="panelNotice.action === 'layout'"
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
        class="score-finalize__readiness"
        :overview="effectiveRiskOverview"
        :exam-title="selectedExamTitle"
        :candidate-count="effectiveRiskOverview?.totalCandidateCount ?? 0"
        :can-bulk-publish="canBulkSubmitPublishReview === true"
        :can-batch-confirm-safe="canBatchConfirmSafe === true"
        :batch-confirming="batchConfirming === true"
        :bulk-publishing="bulkSubmitRunning === true"
        :action-loading-code="readinessActionLoadingCode"
        @action="handleReadinessAction"
        @safe-confirm="handleBatchConfirmSafe"
        @bulk-publish="openBulkSubmitReviewModal"
      />

      <UiAlertStrip
        v-if="publishReviewerNotice"
        tone="warning"
        title="成绩发布签审"
        :description="publishReviewerNotice"
        dense
        inline
        class="score-finalize__alert"
      >
        <template #actions>
          <UiButton
            v-if="pendingMyReviewOnly !== true"
            size="sm"
            variant="outline"
            @click="filterPendingMyPublishReviewOnly"
          >
            仅看待我复核
          </UiButton>
        </template>
      </UiAlertStrip>

      <ExamArchiveGateBanner
        ref="gateBannerRef"
        :exam-id="selectedExamId"
        compact
        show-class-progress-table
        :scores-fully-published="scoresFullyPublished"
        @go-close-exam="goExamListForClose"
        @loaded="onExamArchiveGateLoaded"
      />

      <WorkbenchSurfaceCard flush>
        <template #head>
          <div class="score-finalize__table-head">
            <h3 class="score-finalize__table-title">发布队列</h3>
            <UiSkeletonState v-if="riskOverviewLoading" :rows="1" compact />
            <UiSectionTabs
              v-else
              v-model="statusTabKey"
              :items="statusTabItems"
              compact
              divided
              stretch
              @change="handleStatusTabChange"
            />
          </div>
        </template>

        <template #toolbar>
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
              <div
                v-if="showIncompleteClassChip || showPendingMyReviewChip"
                class="score-finalize__filter-chips"
              >
                <button
                  v-if="showIncompleteClassChip"
                  type="button"
                  class="score-finalize__filter-chip"
                  :class="{
                    'score-finalize__filter-chip--active': scoreFilterForm.unpublishedBoundOnly,
                  }"
                  @click="toggleIncompleteClassFilter"
                >
                  仅看未齐班级
                </button>
                <button
                  v-if="showPendingMyReviewChip"
                  type="button"
                  class="score-finalize__filter-chip"
                  :class="{
                    'score-finalize__filter-chip--active': pendingMyReviewOnly,
                  }"
                  title="服务端筛选：当前您可签审通过的待发布复核答卷"
                  @click="togglePendingMyReviewFilter"
                >
                  待我复核{{ pendingMyReviewCountLabel }}
                </button>
              </div>
              <UiButton variant="outline" size="sm" @click="goExportTasks"> 导出任务 </UiButton>
              <UiButton
                v-if="selectedSubmitReviewCount > 0"
                variant="outline"
                size="sm"
                :loading="batchSubmitRunning === true"
                @click="openBatchSubmitReviewModal"
              >
                批量提交发布复核（{{ selectedSubmitReviewCount }}）
              </UiButton>
              <UiButton
                v-if="selectedApproveReviewCount > 0"
                variant="outline"
                size="sm"
                :loading="batchApproveRunning === true"
                @click="handleBatchApprovePublishReview"
              >
                批量复核通过（{{ selectedApproveReviewCount }}）
              </UiButton>
            </div>
          </div>
        </template>

        <UiDataTable
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          pagination-mode="server"
          :columns="columns"
          :data-source="tableCandidates"
          :loading="loading === true"
          :total="pagination.total"
          row-key="candidateRosterId"
          :enable-selection="tableSelectionEnabled === true"
          :selected-row-keys="selectedCandidateRosterIds"
          size="middle"
          flat
          @selection-change="handleCandidateSelectionChange"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'studentNo'">
              <span class="score-summary-table__mono">{{
                tableCandidates[index].studentNo || '—'
              }}</span>
            </template>
            <template v-else-if="column.key === 'studentName'">
              <span class="score-summary-table__name">
                <span class="score-summary-table__name-text">{{ tableCandidates[index].studentName || '—' }}</span>
                <UiTag
                  v-if="tableCandidates[index].absenceScoreZero"
                  tone="orange"
                  size="sm"
                  title="缺考计零合成卷，无扫描影像"
                >
                  缺考计零
                </UiTag>
              </span>
            </template>
            <template v-else-if="column.key === 'examScore'">
              <span v-if="tableCandidates[index].examScore != null" class="score-summary-table__score">
                {{ tableCandidates[index].examScore }}
              </span>
              <span
                v-else-if="tableCandidates[index].estimatedExamScore != null"
                class="score-finalize__hint"
                :title="`AI预估卷面分 ${tableCandidates[index].estimatedExamScore}，非正式成绩`"
              >
                预估 {{ tableCandidates[index].estimatedExamScore }}
              </span>
              <span v-else class="score-finalize__hint">—</span>
            </template>
            <template v-else-if="column.key === 'dailyScore'">
              <span
                v-if="tableCandidates[index].dailyScore != null"
                class="score-summary-table__score"
              >
                {{ tableCandidates[index].dailyScore }}
              </span>
              <span v-else class="score-finalize__hint">—</span>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <span
                v-if="tableCandidates[index].finalScore != null"
                class="score-summary-table__score score-summary-table__score--total"
              >
                {{ tableCandidates[index].finalScore }}
              </span>
              <span
                v-else-if="tableCandidates[index].estimatedTotalScore != null"
                class="score-finalize__hint"
                :title="`AI预估总分 ${tableCandidates[index].estimatedTotalScore}，非正式成绩`"
              >
                预估 {{ tableCandidates[index].estimatedTotalScore }}
              </span>
              <span v-else class="score-finalize__hint">—</span>
            </template>
            <template v-else-if="column.key === 'bias'">
              <div class="score-finalize__bias-cell">
                <UiTag
                  :tone="
                    biasLevelTone(classifyScoreBias(tableCandidates[index].finalScore, pageScoreStats))
                  "
                  size="sm"
                >
                  {{
                    biasLevelLabel(
                      classifyScoreBias(tableCandidates[index].finalScore, pageScoreStats),
                    )
                  }}
                </UiTag>
                <span
                  v-if="formatScoreBiasDelta(tableCandidates[index].finalScore, pageScoreStats)"
                  class="score-finalize__bias-delta"
                >
                  {{ formatScoreBiasDelta(tableCandidates[index].finalScore, pageScoreStats) }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'finalScoreStatus'">
              <div class="score-finalize__status-cell">
                <UiTag :tone="finalScoreStatusTone(tableCandidates[index].finalScoreStatus)" size="sm">
                  {{ finalScoreStatusLabel(tableCandidates[index].finalScoreStatus) }}
                </UiTag>
                <span
                  v-if="
                    tableCandidates[index].finalScoreStatus === FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
                      && tableCandidates[index].publishReviewerNames?.length
                  "
                  class="score-finalize__hint"
                >
                  复核人：{{ tableCandidates[index].publishReviewerNames?.join('、') }}
                </span>
                <span
                  v-if="
                    tableCandidates[index].finalScoreStatus === FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
                      && tableCandidates[index].publishReviewSubmitUserName
                  "
                  class="score-finalize__hint"
                >
                  提交人：{{ tableCandidates[index].publishReviewSubmitUserName }}
                </span>
                <span
                  v-else-if="tableCandidates[index].publishReviewRejectReason"
                  class="score-finalize__hint"
                  :title="tableCandidates[index].publishReviewRejectReason"
                >
                  退回：{{ tableCandidates[index].publishReviewRejectReason }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'confirmedTime'">
              {{ formatDateTime(tableCandidates[index].confirmedTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildFinalizeActions(tableCandidates[index])"
                :max-visible="2"
                align="end"
                split
                @action="(key) => handleFinalizeRowAction(key, tableCandidates[index])"
              />
            </template>
          </template>
        </UiDataTable>
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
          description="该生为缺考计零，本卷无扫描影像与题目批改明细，正式成绩为 0 分；请在确认后提交发布复核，不必打开影像阅卷。"
          dense
          inline
          class="score-finalize__detail-absence-alert"
          style="margin-bottom: 12px"
        />
        <UiDescriptions :column="2" size="small" bordered class="score-finalize__detail-summary">
          <UiDescriptionsItem label="答卷">
            {{ detailCandidate?.paperDisplay.primaryText }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="班级">
            {{ detailCandidate?.studentClassName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="hasDailyScoreConfig === true" label="考试分">
            <span class="score-summary-table__score">{{
              formatScorePoints(paperScore.examScore ?? paperScore.estimatedExamScore)
            }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="hasDailyScoreConfig === true" label="日常分">
            <span class="score-summary-table__score">{{
              formatScorePoints(paperScore.dailyScore)
            }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem :label="hasDailyScoreConfig === true ? '总成绩' : '总分'">
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
            v-if="detailCandidate?.publishReviewSubmitUserName"
            label="发布复核提交人"
          >
            {{ detailCandidate.publishReviewSubmitUserName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem
            v-if="detailCandidate?.publishReviewerNames?.length"
            label="指定复核人"
          >
            {{ detailCandidate.publishReviewerNames.join('、') }}
          </UiDescriptionsItem>
          <UiDescriptionsItem
            v-if="detailCandidate?.publishReviewRejectReason"
            label="最近退回原因"
            :span="2"
          >
            {{ detailCandidate.publishReviewRejectReason }}
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
          style="margin: 12px 0"
        />

        <UiAlertStrip
          v-if="paperScore.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN"
          tone="warning"
          title="卷级成绩已撤回"
          description="可在题目明细中改题分并填写改分原因；系统会写入撤回后重新评分审计，再重新确认并提交发布复核。"
          dense
          inline
          class="score-finalize__detail-correction-alert"
          style="margin: 12px 0"
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
            <template v-else-if="column.key === 'withdrawnRescore'">
              <UiButton
                v-if="canRescoreWithdrawnQuestion(paperQuestions[index])"
                size="sm"
                variant="ghost"
                @click="openWithdrawnRescoreModal(paperQuestions[index])"
              >
                改题分
              </UiButton>
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
      :confirm-loading="confirming === true"
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
            hasDailyScoreConfig === true
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
        <UiFormItem v-if="hasDailyScoreConfig === true" label="日常成绩" :required="true">
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
        <UiFormItem v-if="hasDailyScoreConfig === true" label="总成绩预览">
          <UiInput size="sm" :value="formatScorePoints(confirmTotalScorePreview)" disabled />
        </UiFormItem>
        <UiFormItem>
          <UiCheckbox
            v-model="confirmAndSubmitReview"
            :disabled="hasUnreviewedBlockingRisks === true"
          >
            确认后立即提交发布复核
          </UiCheckbox>
        </UiFormItem>
        <UiFormItem
          v-if="confirmAndSubmitReview === true"
          label="指定发布复核人"
          :required="true"
        >
          <TeacherSelector
            v-model:value="confirmSubmitReviewerUserIds"
            mode="multiple"
            :department-id="referenceDepartmentId"
            :exclude-user-ids="excludeSelfReviewerIds"
            placeholder="选择 1～N 名本租户教师复核（不可选本人）"
          />
          <div class="score-finalize__hint">
            须指定其他教师复核，不可选择本人；学生通知仅在复核通过并发布后下发。
          </div>
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <!-- 日常分批量确认 Drawer -->
    <UiDrawer
      :open="batchDailyConfirmOpen"
      title="批量确认（录入日常分）"
      :width="720"
      :confirm-loading="batchConfirming === true"
      :hide-footer="false"
      ok-text="确认全部"
      @update:open="(v: boolean) => (batchDailyConfirmOpen = v)"
      @close="batchDailyConfirmOpen = false"
      @confirm="submitBatchDailyConfirm"
    >
      <p class="dp-text-muted-xs dp-mb-component">
        本场日常满分 {{ dailyScoreFull }} 分。请为下列已全题确认试卷录入日常分后批量确认总成绩。
      </p>
      <UiSkeletonState v-if="batchDailyCandidatesLoading" variant="table" compact />
      <UiEmpty
        v-else-if="batchDailyConfirmRows.length === 0"
        size="sm"
        description="当前没有可批量确认的成绩"
      />
      <UiDataTable
        v-else
        pagination-mode="none"
        size="small"
        flat
        :columns="batchDailyConfirmColumns"
        :data-source="batchDailyConfirmRows"
        :show-pagination="false"
        :sticky-header="false"
        :total="batchDailyConfirmRows.length"
        row-key="paperInstanceId"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'student'">
            <span class="score-summary-table__name-text">
              {{ batchDailyConfirmRows[index].studentName || '—' }}
              <span class="dp-text-muted-xs">
                {{ batchDailyConfirmRows[index].studentNo || '' }}
              </span>
            </span>
          </template>
          <template v-else-if="column.key === 'examScore'">
            <span class="score-summary-table__score">
              {{
                batchDailyConfirmRows[index].confirmedExamScore != null
                  ? batchDailyConfirmRows[index].confirmedExamScore
                  : '—'
              }}
            </span>
          </template>
          <template v-else-if="column.key === 'dailyScore'">
            <UiInputNumber
              size="sm"
              v-model="batchDailyConfirmRows[index].dailyScore"
              :min="0"
              :max="dailyScoreFull ?? undefined"
              :precision="2"
              style="width: 100%"
              placeholder="日常分"
            />
          </template>
          <template v-else-if="column.key === 'totalPreview'">
            <span class="score-summary-table__score">
              {{ formatBatchDailyTotalPreview(batchDailyConfirmRows[index]) }}
            </span>
          </template>
        </template>
      </UiDataTable>
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
            variant="outline"
            @click="goQuestionReviewBatch"
          >
            去题目复核确认
          </UiButton>
          <UiButton
            v-else-if="
              canRepairAbsenceScoreZeroFinal === true
                && reason.reasonCode === FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL
            "
            size="sm"
            variant="outline"
            :loading="repairingScoreZero === true"
            @click="handleRepairScoreZero"
          >
            一键补齐计零终分
          </UiButton>
          <UiButton
            v-if="
              canManageReviewerWrites === true
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
      :confirm-loading="withdrawing === true"
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
        <p
          v-if="
            withdrawCandidate?.finalScoreStatus === FinalScoreStatusCode.PUBLISHED
              || withdrawCandidate?.finalScoreStatus === FinalScoreStatusCode.CORRECTED
          "
          class="dp-text-muted-xs dp-mb-component"
        >
          撤回后该卷未结案的学生复核申请将同步作废，并向学生发送成绩撤回与复核上下文变更通知；成绩重发后学生可在复核窗口内再次申请。
        </p>
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

    <!-- 撤回后改题分 Drawer：强制改分原因，落入 SCORE_CHANGE 审计上下文 -->
    <UiDrawer
      :open="withdrawnRescoreOpen"
      title="撤回后重新评分"
      :width="520"
      :confirm-loading="withdrawnRescoring === true"
      :hide-footer="false"
      @update:open="(v: boolean) => (withdrawnRescoreOpen = v)"
      @close="withdrawnRescoreOpen = false"
      @confirm="handleWithdrawnRescore"
    >
      <UiForm layout="vertical">
        <UiFormItem label="题号">
          <UiInput
            size="sm"
            :value="withdrawnRescoreQuestion?.questionNo ?? ''"
            disabled
          />
        </UiFormItem>
        <UiFormItem label="教师复核评分" required>
          <UiInputNumber
            v-model="withdrawnRescoreScore"
            size="sm"
            :min="0"
            :max="withdrawnRescoreQuestion?.fullScore"
            :precision="2"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem label="改分原因" required>
          <UiTextarea
            size="sm"
            v-model="withdrawnRescoreReason"
            placeholder="请填写撤回后重新评分原因（必填，写入审计）"
            :rows="3"
            :max-length="200"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <!-- D-3 下一步动作：确认成功后引导继续核对或打开全场发布 -->
    <UiDrawer
      :open="nextStep.visible"
      :title="nextStep.title"
      :width="480"
      :mask-closable="false"
      hide-footer
      @update:open="
        (v: boolean) => {
          if (!v) closeNextStep()
        }
      "
      @close="closeNextStep"
    >
      <div class="score-finalize__next-step">
        <UiTypographyParagraph class="score-finalize__next-step-desc">
          {{ nextStep.description }}
        </UiTypographyParagraph>
        <div class="score-finalize__next-step-actions">
          <UiButton
            v-if="nextStep.kind === 'all-confirmed'"
            variant="outline"
            size="md"
            :disabled="canBulkSubmitPublishReview !== true"
            @click="handleNextStepGoSubmitReview"
          >
            全场提交发布复核
          </UiButton>
          <UiButton
            v-else-if="nextStep.kind === 'continue-next' && nextStep.nextCandidate"
            variant="outline"
            size="md"
            @click="handleNextStepConfirmContinue"
          >
            继续确认下一份
          </UiButton>
          <UiButton variant="outline" size="md" @click="closeNextStep"> 稍后处理 </UiButton>
        </div>
      </div>
    </UiDrawer>

    <!-- 全场提交发布复核 Drawer -->
    <UiDrawer
      :open="bulkSubmitOpen"
      title="全场提交发布复核"
      :width="720"
      :mask-closable="bulkSubmitRunning !== true"
      :closable="bulkSubmitRunning !== true"
      :hide-footer="false"
      @update:open="
        (v: boolean) => {
          if (!bulkSubmitRunning) bulkSubmitOpen = v
        }
      "
      @close="bulkSubmitOpen = false"
    >
      <div v-if="riskOverview" class="score-finalize__bulk-stats analytics-stats">
        <div v-for="item in bulkModalStatItems" :key="item.key" class="analytics-stats__card">
          <div class="analytics-stats__value" :class="bulkModalValueClass(item.valClass)">
            {{ item.value }}
          </div>
          <div class="analytics-stats__label">{{ item.label }}</div>
        </div>
      </div>
      <UiForm layout="vertical" class="score-finalize__bulk-form">
        <UiFormItem label="指定发布复核人" :required="true">
          <TeacherSelector
            v-model:value="bulkSubmitReviewerUserIds"
            mode="multiple"
            :department-id="referenceDepartmentId"
            :exclude-user-ids="excludeSelfReviewerIds"
            placeholder="选择 1～N 名本租户教师复核（不可选本人）"
          />
          <div class="score-finalize__hint">
            须指定其他教师复核，不可选择本人；提交后待复核人签审，学生方可可见。
          </div>
        </UiFormItem>
      </UiForm>
      <div v-if="bulkSubmitResult" class="score-finalize__bulk-result">
        <div class="score-finalize__bulk-meta">
          本次成功 {{ bulkSubmitResult.successCount }} 条 · 失败 {{ bulkSubmitResult.failureCount }} 条 ·
          请求 {{ bulkSubmitResult.requestedCount }} 条
        </div>
        <div
          v-if="bulkSubmitFailureGroupsSummary"
          class="score-finalize__bulk-meta score-finalize__bulk-meta--fail"
        >
          {{ bulkSubmitFailureGroupsSummary }}
        </div>
      </div>
      <UiList
        v-if="bulkSubmitResult?.failures?.length"
        size="small"
        class="score-finalize__bulk-list"
      >
        <UiListItem
          v-for="failure in bulkSubmitResult.failures"
          :key="failure.paperInstanceId"
        >
          <UiListItemMeta>
            <template #title>
              {{ formatBatchFailureTarget(failure) }}
            </template>
            <template #description>
              <UiTag tone="red" size="sm" class="score-finalize__bulk-error-tag">
                {{ failure.code }}
              </UiTag>
              {{ failure.message }}
            </template>
          </UiListItemMeta>
          <UiTag tone="red" size="sm">未完成</UiTag>
        </UiListItem>
      </UiList>
      <template #footer>
        <UiButton
          variant="outline"
          size="md"
          :disabled="bulkSubmitRunning === true"
          @click="bulkSubmitOpen = false"
        >
          取消
        </UiButton>
        <UiButton
          variant="outline"
          size="md"
          :loading="bulkSubmitRunning === true"
          :disabled="canBulkSubmitPublishReview !== true"
          @click="runBulkSubmitPublishReview"
        >
          确认全场提交
        </UiButton>
      </template>
    </UiDrawer>

    <!-- 单卷/批量提交发布复核 Drawer -->
    <UiDrawer
      :open="submitReviewOpen"
      :title="submitReviewBatchMode ? '批量提交发布复核' : '提交发布复核'"
      :width="520"
      :confirm-loading="submitReviewRunning === true"
      :hide-footer="false"
      @update:open="(v: boolean) => (submitReviewOpen = v)"
      @close="submitReviewOpen = false"
      @confirm="handleSubmitPublishReview"
    >
      <UiForm layout="vertical">
        <UiFormItem v-if="!submitReviewBatchMode" label="考生">
          <UiInput
            size="sm"
            :value="submitReviewCandidate ? submitReviewCandidate.paperDisplay.primaryText : ''"
            disabled
          />
        </UiFormItem>
        <UiFormItem v-else label="已选卷数">
          <UiInput size="sm" :value="`${submitReviewPaperInstanceIds.length} 份`" disabled />
        </UiFormItem>
        <UiFormItem label="指定发布复核人" :required="true">
          <TeacherSelector
            v-model:value="submitReviewReviewerUserIds"
            mode="multiple"
            :department-id="referenceDepartmentId"
            :exclude-user-ids="excludeSelfReviewerIds"
            placeholder="选择 1～N 名本租户教师复核（不可选本人）"
          />
          <div class="score-finalize__hint">
            须指定其他教师复核，不可选择本人；最终以后端校验为准。
          </div>
        </UiFormItem>
      </UiForm>
      <div v-if="selectionSubmitResult" class="score-finalize__bulk-result">
        <div class="score-finalize__bulk-meta">
          本次成功 {{ selectionSubmitResult.successCount }} 条 · 失败 {{ selectionSubmitResult.failureCount }} 条 ·
          请求 {{ selectionSubmitResult.requestedCount }} 条
        </div>
        <div
          v-if="selectionSubmitFailureGroupsSummary"
          class="score-finalize__bulk-meta score-finalize__bulk-meta--fail"
        >
          {{ selectionSubmitFailureGroupsSummary }}
        </div>
      </div>
      <UiList
        v-if="selectionSubmitResult?.failures?.length"
        size="small"
        class="score-finalize__bulk-list"
      >
        <UiListItem
          v-for="failure in selectionSubmitResult.failures"
          :key="failure.paperInstanceId"
        >
          <UiListItemMeta>
            <template #title>
              {{ formatBatchFailureTarget(failure) }}
            </template>
            <template #description>
              <UiTag tone="red" size="sm" class="score-finalize__bulk-error-tag">
                {{ failure.code }}
              </UiTag>
              {{ failure.message }}
            </template>
          </UiListItemMeta>
          <UiTag tone="red" size="sm">未完成</UiTag>
        </UiListItem>
      </UiList>
    </UiDrawer>

    <!-- 批量复核通过结果 Drawer -->
    <UiDrawer
      :open="batchApproveResultOpen"
      title="批量复核通过结果"
      :width="640"
      :hide-footer="true"
      @update:open="(v: boolean) => (batchApproveResultOpen = v)"
      @close="batchApproveResultOpen = false"
    >
      <div v-if="batchApproveResult" class="score-finalize__bulk-result">
        <div class="score-finalize__bulk-meta">
          本次成功 {{ batchApproveResult.successCount }} 条 · 失败 {{ batchApproveResult.failureCount }} 条 ·
          请求 {{ batchApproveResult.requestedCount }} 条
        </div>
        <div
          v-if="batchApproveFailureGroupsSummary"
          class="score-finalize__bulk-meta score-finalize__bulk-meta--fail"
        >
          {{ batchApproveFailureGroupsSummary }}
        </div>
      </div>
      <UiList
        v-if="batchApproveResult?.failures?.length"
        size="small"
        class="score-finalize__bulk-list"
      >
        <UiListItem
          v-for="failure in batchApproveResult.failures"
          :key="failure.paperInstanceId"
        >
          <UiListItemMeta>
            <template #title>
              {{ formatBatchFailureTarget(failure) }}
            </template>
            <template #description>
              <UiTag tone="red" size="sm" class="score-finalize__bulk-error-tag">
                {{ failure.code }}
              </UiTag>
              {{ failure.message }}
            </template>
          </UiListItemMeta>
          <UiTag tone="red" size="sm">未发布</UiTag>
        </UiListItem>
      </UiList>
    </UiDrawer>

    <!-- 退回发布复核 Drawer -->
    <UiDrawer
      :open="rejectReviewOpen"
      title="退回发布复核"
      :width="520"
      :confirm-loading="rejectReviewRunning === true"
      :hide-footer="false"
      @update:open="(v: boolean) => (rejectReviewOpen = v)"
      @close="rejectReviewOpen = false"
      @confirm="handleRejectPublishReview"
    >
      <UiForm layout="vertical">
        <UiFormItem label="考生">
          <UiInput
            size="sm"
            :value="rejectReviewCandidate ? rejectReviewCandidate.paperDisplay.primaryText : ''"
            disabled
          />
        </UiFormItem>
        <UiFormItem label="退回原因" required>
          <UiTextarea
            size="sm"
            v-model="rejectReviewReason"
            placeholder="请输入退回原因（必填）"
            :rows="3"
            :max-length="500"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
// MVR-951：函数式 can*(...) 写入口仅认 === true
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
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
  FinalScoreBatchPublishFailureResponse,
  FinalScoreBatchPublishReviewResponse,
  FinalScoreFailureGroupResponse,
  FinalScoreReadinessActionCode,
  FinalScoreReadinessItemResponse,
  FinalScoreRiskOverviewResponse, FinalScoreSafeConfirmableCandidateResponse
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
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { repairScoreZeroFinalScores } from '@/apis/mark/absence'
import {
  AuditTargetTypeCode,
  listOperationLogs,
  OPERATION_TYPE_TONE,
  OperationTypeDescription,
} from '@/apis/mark/admin-audit'
import { getExamDetail, pageExams } from '@/apis/mark/exam'
import { confirmQuestionGrade, getPaperScore } from '@/apis/mark/exam-grade'
import { getScorePanel } from '@/apis/mark/exam-progress'
import { approvePublishReview, batchApprovePublishReview, batchConfirmSafeFinalScores, batchSubmitPublishReview, cancelPublishReview, confirmAndSubmitPublishReview, confirmFinalScore, FinalScoreRiskReasonCode, getFinalScoreRiskOverview, listSafeConfirmableCandidates, pageExamScoreSummary, rejectPublishReview, saveFinalScoreRiskReview, submitPublishReview, withdrawFinalScore } from '@/apis/mark/exam-score'
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
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
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
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiListItem from '@/components/ui-guide/ui/UiListItem.vue'
import UiListItemMeta from '@/components/ui-guide/ui/UiListItemMeta.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import ScoreConfirmReadinessPanel from '@/components/workbench/ScoreConfirmReadinessPanel.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchNoticeBanner from '@/components/workbench/WorkbenchNoticeBanner.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useScorePublishPreconditions } from '@/composables/useScorePublishPreconditions'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { useUserStore } from '@/stores/modules/user'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { buildExamScoreSummaryTableColumns } from '@/utils/exam-score-summary-table-columns'
import { FINAL_SCORE_WRITE_HARD_BLOCK_REASON_CODES } from '@/utils/final-score-risk-gates'
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
/** 待我复核：服务端 pendingMyPublishReviewOnly，与 canApprovePublishReview 同源全量分页 */
const pendingMyReviewOnly = ref(false)

const userStore = useUserStore()
const currentUserId = computed(() => {
  const raw = userStore.userInfo.userId
  return raw != null && String(raw).trim() !== '' ? String(raw) : ''
})
const excludeSelfReviewerIds = computed(() => (currentUserId.value ? [currentUserId.value] : []))

function assertReviewersExcludeSelf(reviewerUserIds: string[]): boolean {
  const selfId = currentUserId.value
  if (!selfId) {
    return true
  }
  if (reviewerUserIds.includes(selfId)) {
    showFormValidationMessage('发布复核人不能选择本人，请指定其他教师')
    return false
  }
  return true
}

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

const showPendingMyReviewChip = computed(
  () =>
    pendingMyReviewOnly.value === true
    || (effectiveRiskOverview.value?.pendingMyPublishReviewCount ?? 0) > 0,
)

/** 列表展示源：待我复核由服务端过滤，前端不再二次截断 */
const tableCandidates = computed(() => {
  return candidates.value
})

const pendingMyReviewCountLabel = computed(() => {
  const count = effectiveRiskOverview.value?.pendingMyPublishReviewCount
  if (count == null) {
    return ''
  }
  return `（${count}）`
})

const router = useRouter()
const route = useRoute()
const { goExportTasks } = useScoreReleaseNavigation()
/** 通知深链 / 纯指定复核人落地后只自动应用一次「待我复核」筛选 */
const autoPendingMyReviewApplied = ref(false)

function goLayoutDesigner(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceLayoutDesigner',
    params: { examId: selectedExamId.value },
  })
}

function goScanBatches(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScanBatches',
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
    pendingMyReviewOnly.value = false
  }
  pagination.current = 1
  void loadCandidates()
}

function togglePendingMyReviewFilter(): void {
  pendingMyReviewOnly.value = !pendingMyReviewOnly.value
  if (pendingMyReviewOnly.value === true) {
    scoreFilterForm.unpublishedBoundOnly = false
    statusTabKey.value = FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
  }
  selectedCandidateRosterIds.value = []
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
  } catch (error) {
    examDetail.value = null
    showUserError(error, '考试详情加载失败')
  }
}

// ─── 考生名单（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemResponse[]>([])
const loading = ref(false)
let candidatesRequestSequence = 0
const riskOverview = ref<FinalScoreRiskOverviewResponse | null>(null)
const scorePanel = ref<ExamWorkbenchScorePanelResponse | null>(null)
const riskOverviewLoading = ref(false)
const panelLoadError = ref('')

const statusTabItems = computed(() => buildScoreConfirmStatusTabItems(effectiveRiskOverview.value))

const effectiveRiskOverview = computed(
  () => riskOverview.value ?? scorePanel.value?.riskOverview ?? null,
)

/** MVR-278：确认/发布写动作；与 BE requireExamReviewerPermission 对齐 */
const canManageReviewerWrites = computed(
  () => effectiveRiskOverview.value?.canManageReviewerWrites === true,
)

/** 指定复核人工作台提示：可不在阅卷组织，仅签审通过后学生可见 */
const publishReviewerNotice = computed(() => {
  const pendingMy = effectiveRiskOverview.value?.pendingMyPublishReviewCount ?? 0
  if (pendingMy <= 0) {
    return ''
  }
  if (canManageReviewerWrites.value === true) {
    return `您有 ${pendingMy} 份成绩待签审通过；通过后成绩对学生可见并下发通知。`
  }
  return `您被指定为 ${pendingMy} 份成绩的发布复核人（可不在本场阅卷组织内）。请完成「复核通过并发布」或退回；学生通知仅在通过后下发。`
})

/**
 * MVR-368：补齐缺考计零终分不叠 ACTIVE；仅认 overview.canRepairAbsenceScoreZeroFinal===true。
 * 与 BE repairScoreZeroFinalScores / Absence 页 stats.canManageReviewerWrites 同源。
 */
const canRepairAbsenceScoreZeroFinal = computed(
  () => effectiveRiskOverview.value?.canRepairAbsenceScoreZeroFinal === true,
)

const panelNotice = computed(() => {
  if (scorePanel.value?.panelBlockedReason) {
    return {
      title: '题目目录尚未形成',
      description: scorePanel.value.panelBlockedReason,
      tone: 'warning' as const,
      action: 'scan' as const,
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
  hasFieldWideHardBlockForWrite,
  ensureScorePublishPreconditions,
  ensureSinglePaperPublishPreconditions,
  ensureScoreConfirmPreconditions,
} = useScorePublishPreconditions({
  examId: selectedExamId,
  riskOverview: effectiveRiskOverview,
})

/** 概览未加载时为未知，不得把 null 当成 0 展示「无待确认缺考」 */
const hasPendingAbsence = computed(
  () => pendingAbsenceCount.value != null && pendingAbsenceCount.value > 0,
)

const scoresFullyPublished = computed(() =>
  isExamScoresFullyPublished(effectiveRiskOverview.value, examArchiveGate.value),
)

/** 全场可提交发布复核人数：只认 overview.publishableCount（BOUND 口径）；未加载为 undefined */
const publishableOverviewCount = computed((): number | undefined => {
  const overview = effectiveRiskOverview.value
  if (!overview) {
    return undefined
  }
  return overview.publishableCount
})

function filterCorrectedOnly(): void {
  statusTabKey.value = FinalScoreStatusCode.CORRECTED
  scoreFilterForm.unpublishedBoundOnly = false
  pendingMyReviewOnly.value = false
  pagination.current = 1
  void loadCandidates()
}

function filterPendingPublishReviewOnly(): void {
  statusTabKey.value = FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
  scoreFilterForm.unpublishedBoundOnly = false
  pendingMyReviewOnly.value = false
  pagination.current = 1
  void loadCandidates()
}

function filterPendingMyPublishReviewOnly(): void {
  pendingMyReviewOnly.value = true
  scoreFilterForm.unpublishedBoundOnly = false
  statusTabKey.value = FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
  selectedCandidateRosterIds.value = []
  pagination.current = 1
  void loadCandidates()
}

const referenceDepartmentId = computed(() => examDetail.value?.referenceDepartmentId ?? null)

const selectedCandidateRosterIds = ref<string[]>([])

const tableSelectionEnabled = computed(
  () =>
    // 提交人侧：评阅写权 + 可提交/全场待审
    (canManageReviewerWrites.value === true
      && (publishableOverviewCount.value ?? 0) + (effectiveRiskOverview.value?.pendingPublishReviewCount ?? 0) > 0)
    // 指定复核人侧：仅有待我签审时也可勾选批量通过（不必是本场写权教师）
    || (effectiveRiskOverview.value?.pendingMyPublishReviewCount ?? 0) > 0,
)

const selectedCandidates = computed(() =>
  candidates.value.filter((item) => selectedCandidateRosterIds.value.includes(item.candidateRosterId)),
)

const selectedSubmitReviewCount = computed(
  () => selectedCandidates.value.filter((item) => item.canSubmitPublishReview === true).length,
)

const selectedApproveReviewCount = computed(
  () => selectedCandidates.value.filter((item) => item.canApprovePublishReview === true).length,
)

function handleCandidateSelectionChange(keys: Array<string | number>): void {
  selectedCandidateRosterIds.value = keys.map((key) => String(key))
}

const batchConfirming = ref(false)
const riskReviewDrawerOpen = ref(false)
const riskReviewSavingReasonCode = ref<FinalScoreRiskReasonCode | null>(null)

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
  if (!selectedExamId.value) return
  const requestSequence = ++candidatesRequestSequence
  loading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      keyword: scoreFilterForm.keyword.trim() || undefined,
      finalScoreStatus: pendingMyReviewOnly.value
        ? FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
        : statusTabKey.value === SCORE_STATUS_TAB_ALL
          ? undefined
          : statusTabKey.value,
      classId: scoreFilterForm.classId,
      unpublishedBoundOnly: scoreFilterForm.unpublishedBoundOnly || undefined,
      pendingMyPublishReviewOnly: pendingMyReviewOnly.value === true ? true : undefined,
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
    showUserError(error, '成绩确认名单加载失败')
  } finally {
    if (requestSequence === candidatesRequestSequence) {
      loading.value = false
    }
  }
}

async function loadRiskOverview(): Promise<void> {
  if (!selectedExamId.value) {
    riskOverview.value = null
    panelLoadError.value = ''
    return
  }
  riskOverviewLoading.value = true
  panelLoadError.value = ''
  try {
    riskOverview.value = await getFinalScoreRiskOverview({ examId: selectedExamId.value })
  } catch (error) {
    riskOverview.value = null
    scorePanel.value = null
    panelLoadError.value = getUserErrorMessage(error, '成绩风险概览加载失败')
  } finally {
    riskOverviewLoading.value = false
  }
}

async function loadScorePanel(): Promise<void> {
  if (!selectedExamId.value) {
    scorePanel.value = null
    return
  }
  try {
    scorePanel.value = await getScorePanel(selectedExamId.value)
  } catch (error) {
    scorePanel.value = null
    showUserError(error, '成绩面板加载失败')
  }
}

async function refreshScoreFinalizeData(): Promise<void> {
  await loadScorePanel()
  await Promise.all([loadCandidates(), loadRiskOverview()])
  applyReviewerLandingDefaults()
}

/**
 * 高校签审落地：通知深链 pendingMyReview=1，或纯指定复核人进入时，自动切到「待我复核」服务端队列。
 */
function applyReviewerLandingDefaults(): void {
  if (autoPendingMyReviewApplied.value === true) {
    return
  }
  const pendingMy = effectiveRiskOverview.value?.pendingMyPublishReviewCount ?? 0
  if (pendingMy <= 0) {
    return
  }
  const queryFlag = route.query.pendingMyReview
  const fromNotification
    = queryFlag === '1' || queryFlag === 'true' || queryFlag === 'yes'
  const pureDesignatedReviewer
    = canManageReviewerWrites.value !== true && pendingMy > 0
  if (fromNotification !== true && pureDesignatedReviewer !== true) {
    return
  }
  pendingMyReviewOnly.value = true
  scoreFilterForm.unpublishedBoundOnly = false
  statusTabKey.value = FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
  selectedCandidateRosterIds.value = []
  pagination.current = 1
  autoPendingMyReviewApplied.value = true
  void loadCandidates()
}

async function refreshAfterScoreWrite(): Promise<void> {
  await refreshScoreFinalizeData()
  await refreshArchiveGate()
  try {
    await refreshSnapshot()
  } catch (error) {
    // 非工作台上下文也可能失败；不得静默
    showUserError(error, '成绩工作台快照刷新失败')
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
  pendingMyReviewOnly.value = false
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
    case FinalScoreStatusCode.PENDING_PUBLISH_REVIEW:
    case FinalScoreStatusCode.PUBLISHED:
    case FinalScoreStatusCode.WITHDRAWN:
      statusTabKey.value = tabKey
      break
  }
  pendingMyReviewOnly.value = false
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
  if (canManageReviewerWrites.value !== true) {
    return false
  }
  // MVR-207：场级硬拦（缺考待确认/未核对、阻塞事件、重复影像）禁用确认，与 BE confirm 硬拦同源
  if (hasFieldWideHardBlockForWrite.value) {
    return false
  }
  const s = record.finalScoreStatus
  if (s === FinalScoreStatusCode.PENDING_PUBLISH_REVIEW) {
    return false
  }
  // CORRECTED 官方更正分已落账，禁止再走 confirm 重算；只允许提交发布复核。
  if (s === FinalScoreStatusCode.WITHDRAWN) {
    // 列表合同：总分更正官方分与题分不一致时禁用「重新确认」，须「重新提交发布复核」保留更正分。
    return !(
      record.latestTotalScoreCorrectionApplied || record.questionScoreSumMatchesExamScore === false
    )
  }
  return s === FinalScoreStatusCode.PENDING || s === FinalScoreStatusCode.CALCULATED
}
function confirmButtonLabel(record: ExamScoreSummaryItemResponse): string {
  return record.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN ? '重新确认' : '确认'
}
function submitReviewButtonLabel(record: ExamScoreSummaryItemResponse): string {
  return record.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN
    || record.finalScoreStatus === FinalScoreStatusCode.CORRECTED
    ? '重新提交复核'
    : '提交发布复核'
}

function canSubmitPublishReview(record: ExamScoreSummaryItemResponse): boolean {
  return record.canSubmitPublishReview === true
}

function canApprovePublishReview(record: ExamScoreSummaryItemResponse): boolean {
  return record.canApprovePublishReview === true
}

function canRejectPublishReview(record: ExamScoreSummaryItemResponse): boolean {
  return record.canRejectPublishReview === true
}

function canCancelPublishReview(record: ExamScoreSummaryItemResponse): boolean {
  return record.canCancelPublishReview === true
}

const blockingRiskReasons = computed(() => {
  const reasons = effectiveRiskOverview.value?.riskReasons ?? []
  return reasons.filter(
    (reason) => reason.reasonCode !== FinalScoreRiskReasonCode.SAFE_CONFIRMABLE && reason.count > 0,
  )
})

const hardBlockingRiskReasons = computed(() => {
  return blockingRiskReasons.value.filter((reason) =>
    FINAL_SCORE_WRITE_HARD_BLOCK_REASON_CODES.has(reason.reasonCode),
  )
})

const hasHardBlockingRisks = computed(() => hardBlockingRiskReasons.value.length > 0)

/** 软复核状态唯一真源：overview.reviewedReasonCodes */
const reviewedRiskReasonCodes = computed(() => {
  const overview = effectiveRiskOverview.value
  if (!overview) {
    return new Set<FinalScoreRiskReasonCode>()
  }
  const validReasonCodes = new Set(blockingRiskReasons.value.map((reason) => reason.reasonCode))
  return new Set(
    (overview.reviewedReasonCodes ?? []).filter((reasonCode) => validReasonCodes.has(reasonCode)),
  )
})

const hasUnreviewedBlockingRisks = computed(() => {
  // 未确认题目分 / 缺批改 / 计零终分待补齐：硬引导处置，不走「标记已复核」软通过
  return blockingRiskReasons.value.some(
    (reason) =>
      !FINAL_SCORE_WRITE_HARD_BLOCK_REASON_CODES.has(reason.reasonCode)
      && !isQuestionConfirmRiskReason(reason.reasonCode)
      && reason.reasonCode !== FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL
      && !reviewedRiskReasonCodes.value.has(reason.reasonCode),
  )
})

function openRiskReviewDrawer(): void {
  riskReviewDrawerOpen.value = true
}

function isRiskReasonReviewed(reasonCode: FinalScoreRiskReasonCode): boolean {
  return reviewedRiskReasonCodes.value.has(reasonCode)
}

function isHardBlockingRiskReason(reasonCode: FinalScoreRiskReasonCode): boolean {
  return FINAL_SCORE_WRITE_HARD_BLOCK_REASON_CODES.has(reasonCode)
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
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无本场评阅写权限，无法标记风险复核')
    return
  }
  if (FINAL_SCORE_WRITE_HARD_BLOCK_REASON_CODES.has(reasonCode)) return
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
 * 单卷发布 / 确认后发布：场级写分硬拦 + 未复核软风险。
 * 计零终分待补齐不按全场误杀本卷（与 BE blocksConfirm=false / 单卷 publish 同源）。
 */
function warnUnreviewedBlockingRisks(): boolean {
  if (hasHardBlockingRisks.value) {
    riskReviewDrawerOpen.value = true
    void message.warning('存在场级硬拦（缺考核对 / 阻塞事件 / 重复影像），请先处置后再发布成绩')
    return true
  }
  if (hasUnreviewedBlockingRisks.value !== true) return false
  riskReviewDrawerOpen.value = true
  void message.warning('存在未复核的异常成绩，请先完成集中复核后再发布')
  return true
}

/** 安全批量确认仅检查全场级门禁（与后端 collectSafeBatchConfirmBlockingReasons 对齐） */
function warnFieldWideSafeBatchBlockers(): boolean {
  if (hasHardBlockingRisks.value || hasFieldWideHardBlockForWrite.value) {
    riskReviewDrawerOpen.value = true
    void message.warning('存在场级硬拦（缺考核对 / 阻塞事件 / 重复影像），暂不可安全批量确认最终成绩')
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
  if (canRepairAbsenceScoreZeroFinal.value !== true) {
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
    await Promise.all([
      loadCandidates(),
      loadRiskOverview(),
      refreshArchiveGate(),
      refreshSnapshot().catch((error) => {
        // 附属快照失败不阻断主流程，但不得静默；右上角 Message 告知教师
        showUserError(error, '成绩快照刷新失败')
      }),
    ])
  } catch (error) {
    showUserError(error, '补齐计零终分失败')
  } finally {
    repairingScoreZero.value = false
  }
}

/**
 * 安全批量确认卷级最终成绩：仅依赖 safeConfirmableCount + 全场级硬阻塞。
 * 未确认题目分由后端按卷过滤，不应因场内仍有待复核卷而禁用「已全题确认」卷的批量确认。
 * 配置日常分时打开逐卷录入抽屉，不再整场禁用。
 * MVR-292：必须叠 canManageReviewerWrites，避免非评阅写权用户顶栏假可点。
 */
const canBatchConfirmSafe = computed(() => {
  const overview = effectiveRiskOverview.value
  return Boolean(
    overview
    && canManageReviewerWrites.value === true
    && overview.safeConfirmableCount > 0
    && hasHardBlockingRisks.value !== true
    && hasFieldWideHardBlockForWrite.value !== true
    && batchConfirming.value !== true,
  )
})

interface BatchDailyConfirmRow {
  paperInstanceId: string
  studentNo?: string
  studentName?: string
  confirmedExamScore?: number
  dailyScore: number | undefined
}

const batchDailyConfirmOpen = ref(false)
const batchDailyCandidatesLoading = ref(false)
const batchDailyConfirmRows = ref<BatchDailyConfirmRow[]>([])
const batchDailyConfirmColumns = [
  { title: '考生', key: 'student', width: 160 },
  { title: '考试分', key: 'examScore', width: 88, align: 'right' as const },
  { title: '日常分', key: 'dailyScore', width: 120, align: 'right' as const },
  { title: '总成绩预览', key: 'totalPreview', width: 100, align: 'right' as const },
]

function formatBatchDailyTotalPreview(row: BatchDailyConfirmRow): string {
  if (row.confirmedExamScore == null || row.dailyScore == null) {
    return '—'
  }
  return String(Number((row.confirmedExamScore + row.dailyScore).toFixed(2)))
}

async function openBatchDailyConfirmDrawer(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  batchDailyConfirmOpen.value = true
  batchDailyCandidatesLoading.value = true
  batchDailyConfirmRows.value = []
  try {
    const candidates: FinalScoreSafeConfirmableCandidateResponse[]
      = await listSafeConfirmableCandidates({ examId: selectedExamId.value })
    batchDailyConfirmRows.value = candidates.map((item) => ({
      paperInstanceId: item.paperInstanceId,
      studentNo: item.studentNo,
      studentName: item.studentName,
      confirmedExamScore: item.confirmedExamScore,
      dailyScore: undefined,
    }))
  } catch (error) {
    batchDailyConfirmOpen.value = false
    showUserError(error, '加载可批量确认考生失败')
  } finally {
    batchDailyCandidatesLoading.value = false
  }
}

async function submitBatchDailyConfirm(): Promise<void> {
  if (batchConfirming.value === true || !selectedExamId.value) {
    return
  }
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无本场评阅写权限，无法批量确认成绩')
    return
  }
  const rows = batchDailyConfirmRows.value
  if (rows.length === 0) {
    void message.info('当前没有可批量确认的成绩')
    return
  }
  const incomplete = rows.find((row) => row.dailyScore == null)
  if (incomplete != null) {
    void message.warning('请为全部考生录入日常分后再确认')
    return
  }
  if (dailyScoreFull.value != null) {
    const overflow = rows.find(
      (row) => row.dailyScore != null && row.dailyScore > dailyScoreFull.value!,
    )
    if (overflow != null) {
      void message.warning(`日常分不能超过日常满分 ${dailyScoreFull.value}`)
      return
    }
  }
  batchConfirming.value = true
  try {
    const result = await batchConfirmSafeFinalScores({
      examId: selectedExamId.value,
      items: rows.map((row) => ({
        paperInstanceId: row.paperInstanceId,
        dailyScore: row.dailyScore as number,
      })),
    })
    batchDailyConfirmOpen.value = false
    await applyBatchConfirmResult(result)
  } catch (error) {
    showUserError(error, '批量确认无风险成绩失败')
  } finally {
    batchConfirming.value = false
  }
}

async function applyBatchConfirmResult(
  result: Awaited<ReturnType<typeof batchConfirmSafeFinalScores>>,
): Promise<void> {
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
    const groupSummary = formatFinalScoreFailureGroups(result.failureGroups)
    void message.warning(
      groupSummary
        ? `有 ${result.failureCount} 份成绩确认失败（${groupSummary}），请查看列表后逐份处理`
        : `有 ${result.failureCount} 份成绩确认失败，请查看列表后逐份处理`,
    )
  }
  await refreshAfterScoreWrite()
}

async function handleBatchConfirmSafe(): Promise<void> {
  if (batchConfirming.value === true) {
    return
  }
  // MVR-292：与 BE requireExamReviewerPermission / canManageReviewerWrites 二次拦截
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无本场评阅写权限，无法批量确认成绩')
    return
  }
  if (!selectedExamId.value || !effectiveRiskOverview.value) return
  if (warnFieldWideSafeBatchBlockers()) return
  const canContinue = ensureScoreConfirmPreconditions()
  if (canContinue !== true) {
    return
  }
  if (hasDailyScoreConfig.value === true) {
    await openBatchDailyConfirmDrawer()
    return
  }
  batchConfirming.value = true
  try {
    const result = await batchConfirmSafeFinalScores({ examId: selectedExamId.value })
    await applyBatchConfirmResult(result)
  } catch (error) {
    showUserError(error, '批量确认无风险成绩失败')
  } finally {
    batchConfirming.value = false
  }
}

const selectedExamTitle = computed(() => examDetail.value?.examName?.trim() || '')

/** 任务工作台标题：优先考试名。 */
const scoreFinalizeWorkbenchTitle = computed(
  () => selectedExamTitle.value || '成绩确认与发布',
)

/** 任务工作台副标题：发布流水线当前阻塞/阶段真数。 */
const scoreFinalizeWorkbenchSubtitle = computed(() => {
  if (unconfirmedQuestionGradeCount.value > 0) {
    return `${unconfirmedQuestionGradeCount.value} 题待确认`
  }
  if (scoresFullyPublished.value === true) {
    return '已全部发布'
  }
  const pendingMy = effectiveRiskOverview.value?.pendingMyPublishReviewCount ?? 0
  if (pendingMy > 0) {
    return `待我复核 ${pendingMy} 份`
  }
  if (blockingRiskReasons.value.length > 0) {
    return `${blockingRiskReasons.value.length} 项阻塞风险`
  }
  if (effectiveRiskOverview.value?.readyToSubmitPublishReview === true) {
    return '可提交发布复核'
  }
  if (hasPendingAbsence.value) {
    return '缺考待确认'
  }
  const total = effectiveRiskOverview.value?.totalCandidateCount
  return total != null ? `${total} 名考生` : '成绩确认工作台'
})

/**
 * 页级唯一实心主行动：题目确认 → 待我复核 → 全场提交复核 → 批量确认无风险。
 * 就绪面板/表工具条不再重复实心主按钮。
 */
const scoreFinalizePrimaryAction = computed(() => {
  if (unconfirmedQuestionGradeCount.value > 0) {
    return {
      key: 'question-review',
      label: `题目分待确认 ${unconfirmedQuestionGradeCount.value}`,
      loading: false,
      disabled: false,
      run: () => goQuestionReviewBatch(),
    }
  }
  const pendingMy = effectiveRiskOverview.value?.pendingMyPublishReviewCount ?? 0
  if (pendingMy > 0) {
    return {
      key: 'pending-my-review',
      label: `仅看待我复核 ${pendingMy}`,
      loading: false,
      disabled: false,
      run: () => filterPendingMyPublishReviewOnly(),
    }
  }
  if (canManageReviewerWrites.value === true) {
    return {
      key: 'bulk-submit',
      label: '全场提交发布复核',
      loading: bulkSubmitRunning.value === true,
      disabled: canBulkSubmitPublishReview.value !== true,
      run: () => openBulkSubmitReviewModal(),
    }
  }
  if (canBatchConfirmSafe.value === true) {
    return {
      key: 'batch-confirm',
      label: '批量确认无风险成绩',
      loading: batchConfirming.value === true,
      disabled: false,
      run: () => handleBatchConfirmSafe(),
    }
  }
  return null
})

/** SignalBand 主卡下钻到对应队列筛选/风险抽屉。 */
function handleScoreFinalizeSignalClick(key: string): void {
  if (key === 'pendingMyPublishReview') {
    filterPendingMyPublishReviewOnly()
    return
  }
  if (key === 'blocked' || key === 'pending') {
    openRiskReviewDrawer()
    return
  }
  // 规模/分布指标：滚到发布队列
  const el = document.querySelector('.score-finalize__table-title')
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const statMetrics = computed((): SignalMetric[] =>
  buildScoreFinalizeSignalMetrics(scorePanel.value, effectiveRiskOverview.value),
)

const readinessActionLoadingCode = ref<FinalScoreReadinessActionCode | null>(null)

/** 配置了日常分的考试：Worker 无法代填日常分；批量确认须在抽屉中逐卷录入日常分。 */
const dailyScoreManualConfirmNotice = computed(() => {
  if (hasDailyScoreConfig.value !== true) {
    return null
  }
  return '本场考试配置了日常分，系统不会延迟自动确认最终成绩。题目分全部教师确认后，可使用「批量确认无风险成绩」一次性录入日常分并确认，也可逐人确认。'
})

function handleReadinessAction(item: FinalScoreReadinessItemResponse): void {
  const code = item.actionCode
  if (code === 'GO_ABSENCE') {
    goAbsenceConfirm()
    return
  }
  if (code === 'REPAIR_SCORE_ZERO') {
    void handleRepairScoreZero()
    return
  }
  if (code === 'GO_QUESTION_REVIEW') {
    goQuestionReviewBatch()
    return
  }
  if (code === 'GO_SCAN_BATCHES') {
    goScanBindingAttention()
    return
  }
  if (code === 'OPEN_RISK_REVIEW') {
    openRiskReviewDrawer()
    return
  }
  if (code === 'BATCH_CONFIRM') {
    void handleBatchConfirmSafe()
    return
  }
  if (code === 'FILTER_CORRECTED') {
    filterCorrectedOnly()
    return
  }
  if (code === 'FILTER_PENDING_PUBLISH_REVIEW') {
    filterPendingPublishReviewOnly()
    return
  }
  if (code === 'FILTER_PENDING_MY_PUBLISH_REVIEW') {
    filterPendingMyPublishReviewOnly()
    return
  }
  if (code === 'GO_DELAYED_TASKS') {
    goDelayedConfirmTasks()
  }
}

// ─── 全场发布 ─────────────────────────────
const bulkModalStatItems = computed(() => {
  const overview = effectiveRiskOverview.value
  const publishableCount = publishableOverviewCount.value
  if (!overview || publishableCount == null) {
    return []
  }
  return buildScoreBulkPublishModalStatItems(overview, publishableCount)
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

const canBulkSubmitPublishReview = computed(
  () =>
    Boolean(selectedExamId.value)
    && canManageReviewerWrites.value === true
    && effectiveRiskOverview.value?.readyToSubmitPublishReview === true,
)

const bulkSubmitOpen = ref(false)
const bulkSubmitRunning = ref(false)
const bulkSubmitResult = ref<FinalScoreBatchPublishReviewResponse | null>(null)
const bulkSubmitReviewerUserIds = ref<string[]>([])
const bulkSubmitFailureGroupsSummary = computed(() =>
  formatFinalScoreFailureGroups(bulkSubmitResult.value?.failureGroups),
)

function formatFailureGroupSamples(group: FinalScoreFailureGroupResponse): string {
  const labels = (group.sampleLabels ?? []).filter((label) => label.trim().length > 0)
  if (labels.length > 0) {
    return `样例：${labels.join('、')}`
  }
  const ids = group.samplePaperInstanceIds ?? []
  if (ids.length > 0) {
    return `样例答卷：${ids.join('、')}`
  }
  return '详见成绩列表逐份处理'
}

/** 批量失败目标优先展示姓名(学号)，事实已失效时显式回退试卷实例 ID。 */
function formatBatchFailureTarget(failure: FinalScoreBatchPublishFailureResponse): string {
  const studentLabel = failure.studentLabel?.trim()
  return studentLabel || `试卷实例 ${failure.paperInstanceId}`
}

function resetBulkSubmitState(): void {
  bulkSubmitResult.value = null
  bulkSubmitReviewerUserIds.value = []
}

function openBulkSubmitReviewModal(): void {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无本场评阅写权限，无法提交发布复核')
    return
  }
  if (canBulkSubmitPublishReview.value !== true) {
    void message.warning('当前考试没有可提交发布复核的最终成绩')
    return
  }
  void (async () => {
    await Promise.all([loadRiskOverview(), loadScorePanel()])
    const canContinue = ensureScorePublishPreconditions()
    if (canContinue !== true) {
      return
    }
    resetBulkSubmitState()
    bulkSubmitOpen.value = true
  })()
}

async function collectSubmitPublishReviewPaperIds(examId: string): Promise<string[]> {
  const paperInstanceIds: string[] = []
  let pageNum = 1
  const pageSize = 200
  while (true) {
    const result = await pageExamScoreSummary({
      examId,
      pageNum,
      pageSize,
    })
    for (const item of result.list) {
      if (item.canSubmitPublishReview === true && item.paperInstanceId) {
        paperInstanceIds.push(item.paperInstanceId)
      }
    }
    if (result.list.length < pageSize || pageNum * pageSize >= result.total) {
      break
    }
    pageNum += 1
  }
  return paperInstanceIds
}

async function runBulkSubmitPublishReview(): Promise<void> {
  if (!selectedExamId.value || bulkSubmitRunning.value) return
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无本场评阅写权限，无法提交发布复核')
    return
  }
  const reviewerUserIds = bulkSubmitReviewerUserIds.value.filter((id) => id.trim().length > 0)
  if (reviewerUserIds.length === 0) {
    showFormValidationMessage('请选择至少一名发布复核人')
    return
  }
  if (assertReviewersExcludeSelf(reviewerUserIds) !== true) {
    return
  }
  const canContinue = ensureScorePublishPreconditions()
  if (canContinue !== true) {
    bulkSubmitOpen.value = false
    return
  }
  bulkSubmitRunning.value = true
  try {
    const paperInstanceIds = await collectSubmitPublishReviewPaperIds(selectedExamId.value)
    if (paperInstanceIds.length === 0) {
      void message.warning('当前没有可提交发布复核的答卷')
      return
    }
    bulkSubmitResult.value = await batchSubmitPublishReview({
      examId: selectedExamId.value,
      paperInstanceIds,
      reviewerUserIds,
    })
    riskOverview.value = bulkSubmitResult.value.afterOverview
    if (bulkSubmitResult.value.failureCount === 0) {
      void message.success('全场发布复核已提交，待指定复核人签审')
      bulkSubmitOpen.value = false
      pendingMyReviewOnly.value = false
      statusTabKey.value = FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
      pagination.current = 1
    } else {
      void message.warning(
        `提交完成：成功 ${bulkSubmitResult.value.successCount} 条，失败 ${bulkSubmitResult.value.failureCount} 条，请查看明细`,
      )
    }
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '全场提交发布复核失败')
  } finally {
    bulkSubmitRunning.value = false
  }
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

/** 当前页候选状态分桶，仅用于页内偏差提示与下一份核对引导。 */
const candidateBuckets = computed<Record<FinalScoreStatusCode, number>>(() => {
  const buckets: Record<FinalScoreStatusCode, number> = {
    [FinalScoreStatusCode.PENDING]: 0,
    [FinalScoreStatusCode.CALCULATED]: 0,
    [FinalScoreStatusCode.CONFIRMED]: 0,
    [FinalScoreStatusCode.PUBLISHED]: 0,
    [FinalScoreStatusCode.CORRECTED]: 0,
    [FinalScoreStatusCode.PENDING_PUBLISH_REVIEW]: 0,
    [FinalScoreStatusCode.WITHDRAWN]: 0,
  }
  for (const c of candidates.value) {
    const s = c.finalScoreStatus
    buckets[s] += 1
  }
  return buckets
})

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
  // 只渲染当前可用动作；行内唯一 primary 置顶（maxVisible=2 → 主行动 + ⋯）
  const confirmable = canConfirm(record)
  const submittable = canSubmitPublishReview(record)
  const approvable = canApprovePublishReview(record)
  const rejectable = canRejectPublishReview(record)
  const cancellable = canCancelPublishReview(record)
  const withdrawable = canWithdraw(record) === true
  const primaryKey = approvable
    ? 'approve-review'
    : submittable
      ? 'submit-review'
      : confirmable
        ? 'confirm'
        : undefined
  const actions: UiTableRowActionItem[] = []
  if (primaryKey === 'approve-review') {
    actions.push({
      key: 'approve-review',
      label: '复核通过并发布',
      tone: 'primary',
    })
  } else if (primaryKey === 'submit-review') {
    actions.push({
      key: 'submit-review',
      label: submitReviewButtonLabel(record),
      tone: 'primary',
    })
  } else if (primaryKey === 'confirm') {
    actions.push({
      key: 'confirm',
      label: confirmButtonLabel(record),
      tone: 'primary',
    })
  }
  actions.push({
    key: 'detail',
    label: record.absenceScoreZero ? '计零说明' : '明细',
    disabled: !record.paperInstanceId,
  })
  // 非主路径动作：不重复挂 primary tone
  if (confirmable && primaryKey !== 'confirm') {
    actions.push({
      key: 'confirm',
      label: confirmButtonLabel(record),
    })
  }
  if (submittable && primaryKey !== 'submit-review') {
    actions.push({
      key: 'submit-review',
      label: submitReviewButtonLabel(record),
    })
  }
  if (approvable && primaryKey !== 'approve-review') {
    actions.push({
      key: 'approve-review',
      label: '复核通过并发布',
    })
  }
  if (rejectable) {
    actions.push({
      key: 'reject-review',
      label: '退回复核',
    })
  }
  if (cancellable) {
    actions.push({
      key: 'cancel-review',
      label: '撤销提交',
    })
  }
  if (withdrawable) {
    actions.push({
      key: 'withdraw',
      label: withdrawButtonLabel(record),
    })
  }
  return actions
}

function handleFinalizeRowAction(key: string, record: ExamScoreSummaryItemResponse): void {
  switch (key) {
    case 'detail':
      void openDetailDrawer(record)
      break
    case 'confirm':
      void openConfirmModal(record)
      break
    case 'submit-review':
      openSubmitReviewModal(record)
      break
    case 'approve-review':
      void handleApprovePublishReview(record)
      break
    case 'reject-review':
      openRejectReviewModal(record)
      break
    case 'cancel-review':
      void handleCancelPublishReview(record)
      break
    case 'withdraw':
      openWithdrawModal(record)
      break
  }
}

function canWithdraw(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  // MVR-292：撤回/撤销确认须评阅写权，与 BE withdrawFinalScore 门禁对齐
  if (canManageReviewerWrites.value !== true) {
    return false
  }
  const s = record.finalScoreStatus
  if (s === FinalScoreStatusCode.PENDING_PUBLISH_REVIEW) {
    return false
  }
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

const paperItemColumns = computed<ColumnType<ExamQuestionScoreResponse>[]>(() => {
  const columns: ColumnType<ExamQuestionScoreResponse>[] = [
    { title: '题号', key: 'questionNo', width: 80, fixed: 'left' },
    { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
    { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
    { title: '题目得分', key: 'teacherReviewScore', width: 100 },
    { title: '状态', dataIndex: 'gradeStatus', key: 'gradeStatus', width: 110 },
  ]
  if (paperScore.value?.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN) {
    columns.push({ title: '主行动', key: 'withdrawnRescore', width: 96, fixed: 'right' })
  }
  return columns
})

const withdrawnRescoreOpen = ref(false)
const withdrawnRescoring = ref(false)
const withdrawnRescoreQuestion = ref<ExamQuestionScoreResponse | null>(null)
const withdrawnRescoreScore = ref<number | null>(null)
const withdrawnRescoreReason = ref('')

function canRescoreWithdrawnQuestion(question: ExamQuestionScoreResponse): boolean {
  return (
    canManageReviewerWrites.value === true
    && paperScore.value?.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN
    && question.gradeResultId != null
    && question.gradeResultId !== ''
    && question.gradeStatus === GradeStatusCode.CONFIRMED
  )
}

function openWithdrawnRescoreModal(question: ExamQuestionScoreResponse): void {
  if (canRescoreWithdrawnQuestion(question) !== true) {
    void message.warning(
      canManageReviewerWrites.value !== true
        ? '当前账号无本场评阅写权限，无法改题分'
        : '仅卷级成绩已撤回且题目已确认时可改题分',
    )
    return
  }
  withdrawnRescoreQuestion.value = question
  withdrawnRescoreScore.value = question.teacherReviewScore ?? null
  withdrawnRescoreReason.value = ''
  withdrawnRescoreOpen.value = true
}

async function handleWithdrawnRescore(): Promise<void> {
  if (withdrawnRescoring.value === true) {
    return
  }
  const question = withdrawnRescoreQuestion.value
  if (!selectedExamId.value || !question?.gradeResultId) {
    return
  }
  if (canRescoreWithdrawnQuestion(question) !== true) {
    void message.warning('当前题目不可撤回后重新评分')
    return
  }
  const score = withdrawnRescoreScore.value
  if (score == null || Number.isNaN(score) || score < 0) {
    void message.warning('请填写合法的教师复核评分')
    return
  }
  if (question.fullScore != null && score > question.fullScore) {
    void message.warning(`教师复核评分不能超过题目满分 ${question.fullScore}`)
    return
  }
  const reason = withdrawnRescoreReason.value.trim()
  if (!reason) {
    void message.warning('请填写改分原因')
    return
  }
  withdrawnRescoring.value = true
  try {
    await confirmQuestionGrade({
      examId: selectedExamId.value,
      gradeResultId: question.gradeResultId,
      teacherReviewScore: score,
      rescoreReason: reason,
    })
    void message.success('已更新题目得分，请重新确认卷级成绩')
    withdrawnRescoreOpen.value = false
    if (detailCandidate.value) {
      await openDetailDrawer(detailCandidate.value)
    }
  } catch (error) {
    showUserError(error, '撤回后重新评分失败')
  } finally {
    withdrawnRescoring.value = false
  }
}

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
  try {
    const page = await listOperationLogs({
      examId,
      targetType: AuditTargetTypeCode.EXAM_FINAL_SCORE,
      targetId: paperInstanceId,
      pageNum: auditPagination.pageNum,
      pageSize: auditPagination.pageSize,
    })
    auditLogs.value = page.list
    auditPagination.pageNum = page.pageNum
    auditPagination.pageSize = page.pageSize
    auditPagination.total = page.total
  } catch (error) {
    void message.warning(getUserErrorMessage(error, '操作记录加载失败'))
    auditLogs.value = []
    auditPagination.total = 0
  } finally {
    auditLoading.value = false
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
  historicalLoading.value = true
  try {
    const examsPage = await pageExams({
      pageNum: 1,
      pageSize: HISTORICAL_EXAMS_MAX,
      courseId,
    })
    const courseExams = examsPage.list
    const settled = await Promise.all(
      courseExams.map(async (exam) => {
        const result = await pageExamScoreSummary({
          examId: exam.examId,
          keyword: candidate.studentNo,
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
          isCurrent: exam.examId === selectedExamId.value,
        }
        return point
      }),
    )
    historicalScores.value = settled
      .filter((p): p is HistoricalScorePoint => p !== null)
      .sort((a: HistoricalScorePoint, b: HistoricalScorePoint) => {
        const ta = a.examEndTime ? dayjs(a.examEndTime).valueOf() : 0
        const tb = b.examEndTime ? dayjs(b.examEndTime).valueOf() : 0
        return ta - tb
      })
  } catch (error) {
    void message.warning(getUserErrorMessage(error, '历次成绩趋势加载失败'))
    historicalScores.value = []
  } finally {
    historicalLoading.value = false
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
  if (!selectedExamId.value || !record.paperInstanceId) return
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
  auditLogs.value = []
  auditPagination.pageNum = 1
  auditPagination.total = 0
  historicalScores.value = []
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
  // 操作记录、历次成绩趋势与成绩明细并行展示但顺序加载，避免单点失败阻断主明细
  void loadPaperAuditLogs()
  void loadHistoricalScores()
}

// ─── 确认成绩 Modal ─────────────────────────────
const confirmOpen = ref(false)
const confirming = ref(false)
const confirmCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const confirmComputedExamScore = ref<number | null>(null)
const confirmDailyScore = ref<number | undefined>(undefined)
const confirmAndSubmitReview = ref(false)
const confirmSubmitReviewerUserIds = ref<string[]>([])

const confirmTotalScorePreview = computed<number | null>(() => {
  const examScore = confirmComputedExamScore.value
  if (examScore == null) {
    return null
  }
  if (hasDailyScoreConfig.value === true) {
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
  if (!selectedExamId.value || !record.paperInstanceId) return
  // MVR-419：与 canConfirm(record) / 行内 disabled 同源二次闸（写权∧状态∧场级硬拦）
  if (canConfirm(record) !== true) {
    if (record.finalScoreStatus === FinalScoreStatusCode.CORRECTED) {
      void message.warning(
        '成绩已更正，请直接重新提交发布复核；禁止确认覆盖官方更正分。如需再改请走成绩更正流程。',
      )
      return
    }
    void message.warning(
      canManageReviewerWrites.value !== true
        ? '当前账号无本场评阅写权限，无法确认成绩'
        : '当前答卷不可确认（状态不允许或场级硬拦未解除）',
    )
    return
  }
  confirmCandidate.value = record
  confirmOpen.value = true
  confirmComputedExamScore.value = null
  confirmDailyScore.value = undefined
  confirmAndSubmitReview.value = false
  confirmSubmitReviewerUserIds.value = []
  try {
    const score = await getPaperScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    // 总分更正后 WITHDRAWN：官方分可与题分之和不一致；重新确认会覆盖官方更正分，须引导重发布。
    if (
      record.finalScoreStatus === FinalScoreStatusCode.WITHDRAWN
      && (score.latestTotalScoreCorrectionApplied || score.questionScoreSumMatchesExamScore === false)
    ) {
      confirmOpen.value = false
      confirmCandidate.value = null
      void message.warning(
        '本卷含官方更正分（与题分明细不一致）。请直接「重新提交发布复核」保留更正分；若需按题分重算，请先走成绩更正调整题目分。',
      )
      return
    }
    confirmComputedExamScore.value = resolveConfirmExamScorePreview(score)
    if (confirmComputedExamScore.value == null) {
      void message.warning(
        '题目分尚未全部教师确认，或当前仅为智能预估分。请先完成题目复核/正评后再确认最终成绩。',
      )
    }
    if (hasDailyScoreConfig.value === true) {
      confirmDailyScore.value = score.dailyScore ?? undefined
    }
  } catch (error) {
    void message.warning(getUserErrorMessage(error, '试卷总分加载失败'))
  }
}

// ─── D-3 下一步动作 ─────────────────────────────
type NextStepKind = 'all-confirmed' | 'continue-next' | 'none'

interface NextStepState {
  visible: boolean
  kind: NextStepKind
  /** 主标题文案 */
  title: string
  /** 描述详情 */
  description: string
  /** 下一份待确认学生（kind === 'continue-next' 时有效） */
  nextCandidate: ExamScoreSummaryItemResponse | null
}

const nextStep = ref<NextStepState>({
  visible: false,
  kind: 'none',
  title: '',
  description: '',
  nextCandidate: null,
})

function closeNextStep(): void {
  nextStep.value = { visible: false, kind: 'none', title: '', description: '', nextCandidate: null }
}

/**
 * 根据最新状态推导下一步：
 * - 全部已确认 → 引导全场提交发布复核
 * - 否则在当前页找下一份未确认（PENDING / CALCULATED）的学生，提示继续核对
 * - 若当前页无待确认但全场仍有 PENDING/CALCULATED → 提示翻页
 */
function deriveNextStepSuggestion(): void {
  const overview = effectiveRiskOverview.value
  const b = candidateBuckets.value
  if (overview?.readyToSubmitPublishReview === true) {
    nextStep.value = {
      visible: true,
      kind: 'all-confirmed',
      title: '全场成绩已具备提交发布复核条件',
      description: `共 ${overview.totalCandidateCount} 名考生：已确认 ${overview.confirmedCount} · 待发布复核 ${overview.pendingPublishReviewCount} · 已发布 ${overview.publishedCount} · 已撤回 ${overview.withdrawnCount} · 已更正 ${overview.correctedCount}。提交后须指定复核人签审，学生方可可见。`,
      nextCandidate: null,
    }
    return
  }
  // 当前页找下一份未确认
  const next
    = candidates.value.find(
      (c) =>
        c.finalScoreStatus === FinalScoreStatusCode.CALCULATED
        || c.finalScoreStatus === FinalScoreStatusCode.PENDING,
    ) ?? null
  if (next) {
    nextStep.value = {
      visible: true,
      kind: 'continue-next',
      title: '继续核对下一份',
      description: `当前页还有 ${b[FinalScoreStatusCode.CALCULATED] + b[FinalScoreStatusCode.PENDING]} 名考生待确认。下一份待确认：${next.paperDisplay.primaryText}。`,
      nextCandidate: next,
    }
    return
  }
  // 当前页已全部处理，但全场未完成 → 翻页提示
  nextStep.value = {
    visible: true,
    kind: 'continue-next',
    title: '当前页已全部核对',
    description:
      '当前页成绩已处理，全场仍有待确认或风险项，请切换筛选 / 翻页或处理风险概览中的问题。',
    nextCandidate: null,
  }
}

function handleNextStepConfirmContinue(): void {
  const next = nextStep.value.nextCandidate
  closeNextStep()
  if (next) {
    void openConfirmModal(next)
  }
}

function handleNextStepGoSubmitReview(): void {
  closeNextStep()
  if (canBulkSubmitPublishReview.value === true) {
    openBulkSubmitReviewModal()
    return
  }
  void message.info('请先完成提交条件，或使用顶栏「全场提交发布复核」')
}

async function handleConfirm(): Promise<void> {
  if (!confirmCandidate.value || canConfirm(confirmCandidate.value) !== true) {
    void message.warning(
      canManageReviewerWrites.value !== true
        ? '仅本场阅卷组织成员或主考可确认最终成绩'
        : '当前答卷不可确认（状态不允许或场级硬拦未解除）',
    )
    return
  }
  if (confirming.value === true) {
    return
  }
  if (!selectedExamId.value || !confirmCandidate.value?.paperInstanceId) return
  if (hasHardBlockingRisks.value) {
    riskReviewDrawerOpen.value = true
    void message.warning('存在未完成缺考核对学生，请先完成缺考核对后再确认成绩')
    return
  }
  if (confirmComputedExamScore.value == null) {
    void message.warning('题目分尚未全部教师确认，不能确认最终成绩。请先完成复核台确认或正评提交。')
    return
  }
  if (hasDailyScoreConfig.value === true && confirmDailyScore.value == null) {
    showFormValidationMessage('请录入日常成绩')
    return
  }
  if (confirmAndSubmitReview.value === true) {
    const reviewerUserIds = confirmSubmitReviewerUserIds.value.filter((id) => id.trim().length > 0)
    if (reviewerUserIds.length === 0) {
      showFormValidationMessage('请选择至少一名发布复核人')
      return
    }
    if (assertReviewersExcludeSelf(reviewerUserIds) !== true) {
      return
    }
    if (warnUnreviewedBlockingRisks()) {
      return
    }
    if (ensureSinglePaperPublishPreconditions() !== true) {
      return
    }
  }
  const examId = selectedExamId.value
  const paperInstanceId = confirmCandidate.value.paperInstanceId
  confirming.value = true
  try {
    if (confirmAndSubmitReview.value === true) {
      const reviewerUserIds = confirmSubmitReviewerUserIds.value.filter((id) => id.trim().length > 0)
      await confirmAndSubmitPublishReview({
        examId,
        paperInstanceId,
        dailyScore: hasDailyScoreConfig.value === true ? (confirmDailyScore.value ?? undefined) : undefined,
        reviewerUserIds,
      })
      void message.success('成绩已确认并提交发布复核')
    } else {
      await confirmFinalScore({
        examId,
        paperInstanceId,
        dailyScore: hasDailyScoreConfig.value === true ? (confirmDailyScore.value ?? undefined) : undefined,
      })
      void message.success('成绩已确认，可在列表点击「提交发布复核」')
    }
    confirmOpen.value = false
    await refreshAfterScoreWrite()
    deriveNextStepSuggestion()
  } catch (error) {
    showUserError(
      error,
      confirmAndSubmitReview.value === true ? '成绩确认并提交发布复核失败' : '成绩确认失败',
    )
  } finally {
    confirming.value = false
  }
}

const submitReviewOpen = ref(false)
const submitReviewRunning = ref(false)
const submitReviewBatchMode = ref(false)
const submitReviewCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const submitReviewReviewerUserIds = ref<string[]>([])
const submitReviewPaperInstanceIds = ref<string[]>([])
const selectionSubmitResult = ref<FinalScoreBatchPublishReviewResponse | null>(null)
const selectionSubmitFailureGroupsSummary = computed(() =>
  formatFinalScoreFailureGroups(selectionSubmitResult.value?.failureGroups),
)
const batchSubmitRunning = ref(false)
const batchApproveRunning = ref(false)
const batchApproveResult = ref<FinalScoreBatchPublishReviewResponse | null>(null)
const batchApproveResultOpen = ref(false)
const batchApproveFailureGroupsSummary = computed(() =>
  formatFinalScoreFailureGroups(batchApproveResult.value?.failureGroups),
)
const approvingReviewPaperId = ref<string | null>(null)

function openSubmitReviewModal(record: ExamScoreSummaryItemResponse): void {
  if (canSubmitPublishReview(record) !== true) {
    void message.warning('当前答卷不可提交发布复核')
    return
  }
  submitReviewBatchMode.value = false
  submitReviewCandidate.value = record
  submitReviewPaperInstanceIds.value = record.paperInstanceId ? [record.paperInstanceId] : []
  submitReviewReviewerUserIds.value = []
  selectionSubmitResult.value = null
  submitReviewOpen.value = true
}

function openBatchSubmitReviewModal(): void {
  const paperInstanceIds = selectedCandidates.value
    .filter((item) => item.canSubmitPublishReview === true && item.paperInstanceId)
    .map((item) => item.paperInstanceId as string)
  if (paperInstanceIds.length === 0) {
    void message.warning('所选答卷均不可提交发布复核')
    return
  }
  submitReviewBatchMode.value = true
  submitReviewCandidate.value = null
  submitReviewPaperInstanceIds.value = paperInstanceIds
  submitReviewReviewerUserIds.value = []
  selectionSubmitResult.value = null
  submitReviewOpen.value = true
}

async function handleSubmitPublishReview(): Promise<void> {
  if (submitReviewRunning.value || batchSubmitRunning.value) {
    return
  }
  if (!selectedExamId.value) return
  const reviewerUserIds = submitReviewReviewerUserIds.value.filter((id) => id.trim().length > 0)
  if (reviewerUserIds.length === 0) {
    showFormValidationMessage('请选择至少一名发布复核人')
    return
  }
  if (assertReviewersExcludeSelf(reviewerUserIds) !== true) {
    return
  }
  const paperInstanceIds = submitReviewPaperInstanceIds.value.filter((id) => id.trim().length > 0)
  if (paperInstanceIds.length === 0) {
    void message.warning('没有可提交的答卷')
    return
  }
  if (warnUnreviewedBlockingRisks()) {
    return
  }
  if (submitReviewBatchMode.value === true) {
    const canContinueBatch = ensureScorePublishPreconditions()
    if (canContinueBatch !== true) {
      return
    }
  } else {
    const canContinueSingle = ensureSinglePaperPublishPreconditions()
    if (canContinueSingle !== true) {
      return
    }
  }
  submitReviewRunning.value = true
  batchSubmitRunning.value = submitReviewBatchMode.value
  try {
    if (paperInstanceIds.length === 1) {
      await submitPublishReview({
        examId: selectedExamId.value,
        paperInstanceId: paperInstanceIds[0],
        reviewerUserIds,
      })
      void message.success('已提交发布复核，待指定复核人签审')
      pendingMyReviewOnly.value = false
      statusTabKey.value = FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
      pagination.current = 1
      submitReviewOpen.value = false
      selectedCandidateRosterIds.value = []
      selectionSubmitResult.value = null
    } else {
      selectionSubmitResult.value = await batchSubmitPublishReview({
        examId: selectedExamId.value,
        paperInstanceIds,
        reviewerUserIds,
      })
      riskOverview.value = selectionSubmitResult.value.afterOverview
      if (selectionSubmitResult.value.failureCount === 0) {
        void message.success(`已提交 ${selectionSubmitResult.value.successCount} 份发布复核`)
        pendingMyReviewOnly.value = false
        statusTabKey.value = FinalScoreStatusCode.PENDING_PUBLISH_REVIEW
        pagination.current = 1
        submitReviewOpen.value = false
        selectedCandidateRosterIds.value = []
        selectionSubmitResult.value = null
      } else {
        void message.warning(
          `提交完成：成功 ${selectionSubmitResult.value.successCount} 条，失败 ${selectionSubmitResult.value.failureCount} 条，请查看明细`,
        )
      }
    }
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '提交发布复核失败')
  } finally {
    submitReviewRunning.value = false
    batchSubmitRunning.value = false
  }
}

async function handleApprovePublishReview(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (canApprovePublishReview(record) !== true) {
    void message.warning('当前答卷不可复核通过并发布')
    return
  }
  if (approvingReviewPaperId.value || batchApproveRunning.value) {
    return
  }
  if (!selectedExamId.value || !record.paperInstanceId) return
  const studentLabel
    = [record.studentNo, record.studentName].filter((part) => part && String(part).trim()).join(' ')
      || record.paperDisplay?.primaryText
      || '该考生'
  const confirmed = await confirmAsync({
    title: '复核通过并发布？',
    content: `确认后将发布 ${studentLabel} 的最终成绩并对学生可见，同时下发学生通知。`,
    type: 'warning',
    okText: '确认发布',
    cancelText: '取消',
  })
  if (confirmed !== true) {
    return
  }
  approvingReviewPaperId.value = record.paperInstanceId
  try {
    await approvePublishReview({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    void message.success('复核通过，成绩已发布并通知学生')
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '复核通过并发布失败')
  } finally {
    approvingReviewPaperId.value = null
  }
}

async function handleBatchApprovePublishReview(): Promise<void> {
  if (batchApproveRunning.value) {
    return
  }
  if (!selectedExamId.value) return
  const paperInstanceIds = selectedCandidates.value
    .filter((item) => item.canApprovePublishReview === true && item.paperInstanceId)
    .map((item) => item.paperInstanceId as string)
  if (paperInstanceIds.length === 0) {
    void message.warning('所选答卷均不可复核通过')
    return
  }
  const confirmed = await confirmAsync({
    title: '批量复核通过并发布？',
    content: `将复核通过并发布 ${paperInstanceIds.length} 份成绩，发布后对学生可见并下发通知。`,
    type: 'warning',
    okText: `确认发布 ${paperInstanceIds.length} 份`,
    cancelText: '取消',
  })
  if (confirmed !== true) {
    return
  }
  batchApproveResult.value = null
  batchApproveResultOpen.value = false
  batchApproveRunning.value = true
  try {
    const result = await batchApprovePublishReview({
      examId: selectedExamId.value,
      paperInstanceIds,
    })
    batchApproveResult.value = result
    riskOverview.value = result.afterOverview
    if (result.failureCount === 0) {
      batchApproveResultOpen.value = false
      void message.success(`已复核通过并发布 ${result.successCount} 份成绩`)
      pendingMyReviewOnly.value = false
      statusTabKey.value = FinalScoreStatusCode.PUBLISHED
      pagination.current = 1
      selectedCandidateRosterIds.value = []
    } else {
      batchApproveResultOpen.value = true
      const groupSummary = formatFinalScoreFailureGroups(result.failureGroups)
      void message.warning(
        groupSummary
          ? `批量通过完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条（${groupSummary}），请查看列表后逐份处理`
          : `批量通过完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条，请查看列表后逐份处理`,
      )
    }
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '批量复核通过失败')
  } finally {
    batchApproveRunning.value = false
  }
}

const rejectReviewOpen = ref(false)
const rejectReviewRunning = ref(false)
const rejectReviewCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const rejectReviewReason = ref('')

function openRejectReviewModal(record: ExamScoreSummaryItemResponse): void {
  if (canRejectPublishReview(record) !== true) {
    void message.warning('当前答卷不可退回复核')
    return
  }
  rejectReviewCandidate.value = record
  rejectReviewReason.value = ''
  rejectReviewOpen.value = true
}

async function handleRejectPublishReview(): Promise<void> {
  if (rejectReviewRunning.value) {
    return
  }
  if (!selectedExamId.value || !rejectReviewCandidate.value?.paperInstanceId) return
  if (canRejectPublishReview(rejectReviewCandidate.value) !== true) {
    void message.warning('当前答卷不可退回复核')
    return
  }
  const reason = rejectReviewReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请填写退回原因')
    return
  }
  const studentLabel
    = [rejectReviewCandidate.value.studentNo, rejectReviewCandidate.value.studentName]
      .filter((part) => part && String(part).trim())
      .join(' ')
      || rejectReviewCandidate.value.paperDisplay?.primaryText
      || '该考生'
  const confirmed = await confirmAsync({
    title: '确认退回发布复核？',
    content: `退回后 ${studentLabel} 将恢复为提交前状态，提交人须修正后重新指定复核人。退回原因：${reason}`,
    type: 'warning',
    okText: '确认退回',
    cancelText: '取消',
  })
  if (confirmed !== true) {
    return
  }
  rejectReviewRunning.value = true
  try {
    await rejectPublishReview({
      examId: selectedExamId.value,
      paperInstanceId: rejectReviewCandidate.value.paperInstanceId,
      reason,
    })
    void message.success('已退回发布复核')
    rejectReviewOpen.value = false
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '退回复核失败')
  } finally {
    rejectReviewRunning.value = false
  }
}

async function handleCancelPublishReview(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (canCancelPublishReview(record) !== true) {
    void message.warning('当前答卷不可撤销提交')
    return
  }
  if (!selectedExamId.value || !record.paperInstanceId) return
  const studentLabel
    = [record.studentNo, record.studentName].filter((part) => part && String(part).trim()).join(' ')
      || record.paperDisplay?.primaryText
      || '该考生'
  const confirmed = await confirmAsync({
    title: '撤销发布复核提交？',
    content: `撤销后 ${studentLabel} 将退出「待发布复核」，可重新指定复核人再提交。`,
    type: 'warning',
    okText: '确认撤销',
    cancelText: '取消',
  })
  if (confirmed !== true) {
    return
  }
  try {
    await cancelPublishReview({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    void message.success('已撤销发布复核提交')
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '撤销提交失败')
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
  // MVR-419：与 canWithdraw(record) / 行内 disabled 同源二次闸
  if (canWithdraw(record) !== true) {
    void message.warning(
      canManageReviewerWrites.value !== true
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
  if (withdrawing.value === true) {
    return
  }
  // MVR-419：与 canWithdraw / openWithdrawModal 同源二次闸
  if (!withdrawCandidate.value || canWithdraw(withdrawCandidate.value) !== true) {
    void message.warning(
      canManageReviewerWrites.value !== true
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
  withdrawing.value = true
  try {
    const withdrawResult = await withdrawFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: withdrawCandidate.value.paperInstanceId,
      reason,
    })
    const invalidatedCount = withdrawResult.invalidatedReviewRequestCount ?? 0
    const confirmedWithdraw
      = withdrawCandidate.value?.finalScoreStatus === FinalScoreStatusCode.CONFIRMED
    void message.success(
      confirmedWithdraw
        ? '已撤销成绩确认'
        : invalidatedCount > 0
          ? `成绩已撤回，并作废 ${invalidatedCount} 条待处理复核申请（已通知学生）`
          : '成绩已撤回',
    )
    withdrawOpen.value = false
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '成绩撤回失败')
  } finally {
    withdrawing.value = false
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
    pendingMyReviewOnly.value = false
    autoPendingMyReviewApplied.value = false
    examArchiveGate.value = null
    riskReviewDrawerOpen.value = false
    bulkSubmitOpen.value = false
    bulkSubmitResult.value = null
    submitReviewOpen.value = false
    selectionSubmitResult.value = null
    batchApproveResult.value = null
    batchApproveResultOpen.value = false
    selectedCandidateRosterIds.value = []
    examDetail.value = null
    candidates.value = []
    riskOverview.value = null
    scorePanel.value = null
    panelLoadError.value = ''
    pagination.total = 0
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
    padding: var(--dp-space-component-xs) var(--dp-space-component);
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

  &__bulk-result {
    margin-top: var(--dp-space-component);
  }

  &__bulk-meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    margin-top: var(--dp-space-component-xs);
  }

  &__bulk-list {
    max-height: 320px;
    overflow-y: auto;
    margin-top: var(--dp-space-component-tight);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);
  }

  &__bulk-error-tag {
    margin-left: var(--dp-space-component-tight);
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

  &__table-head {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
    width: 100%;
    min-width: 0;
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
  }

  &__detail-summary {
    margin-bottom: var(--dp-space-block);
  }

  &__detail-section-title {
    margin: var(--dp-space-block) 0 var(--dp-space-component-tight) 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__status-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--dp-space-1);
    min-width: 0;
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
    color: var(--dp-text);
  }

  &__next-step-actions {
    display: flex;
    gap: var(--dp-space-component-tight);
    justify-content: flex-end;
  }
}
</style>
