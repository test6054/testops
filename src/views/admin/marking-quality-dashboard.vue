<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="isJourneyChrome ? contextBarTitle : '阅卷质量看板'"
        :subtitle="isJourneyChrome ? contextBarSubtitle : '阅卷质控'"
      >
        <template #status>
          <UiTag v-if="isJourneyChrome && examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <MarkExamSelect
            v-if="!isExamWorkspaceRoute"
            :selected-exam-id="selectedExamId"
            :exam-options="examOptions"
            :loading="examLoading"
            :searching="searching"
            :resolving-pinned="resolvingPinned"
            select-class="quality-dashboard__exam-select"
            placeholder="选择考试"
            @change="handleExamChange"
            @search="onExamSearch"
          />
          <template v-if="!isExamWorkspaceRoute">
            <a-select
              :value="selectedOrganizationId"
              class="quality-dashboard__org-select"
              placeholder="选择阅卷组织"
              :options="organizationOptions"
              :loading="organizationLoading"
              allow-clear
              @change="handleOrganizationChange"
            />
            <a-select
              :value="selectedGroupId"
              class="quality-dashboard__group-select"
              placeholder="选择题组"
              :options="groupOptions"
              allow-clear
              @change="handleGroupChange"
            />
          </template>
          <UiTag
            v-if="!isExamWorkspaceRoute && selectedExamId && progress?.riskLevel"
            :tone="riskTone(progress.riskLevel)"
            size="sm"
          >
            {{ riskLabel(progress.riskLevel) }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择考试" class="quality-dashboard__empty" />

    <template v-if="selectedExamId" #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <ExamWorkspaceJourneySubNav v-if="selectedExamId && isExamWorkspaceRoute" />

    <MarkQualityScopeBar
      v-if="selectedExamId && isExamWorkspaceRoute"
      mode="workbench"
      :organization-detail="organizationDetail"
      :selected-organization-id="selectedOrganizationId"
      :selected-group-id="selectedGroupId"
      :organization-loading="organizationLoading"
      :show-group-scope="showGroupScope"
      @group-change="handleScopeBarGroupChange"
    />

    <WorkbenchSurfaceCard v-if="selectedExamId" flush class="quality-dashboard__surface">
      <template #head>
        <UiSectionTabs v-model="activeTab" :items="qualityTabItems" compact divided />
      </template>

      <template v-if="activeTab === 'overview'">
        <div class="quality-dashboard__overview-grid">
          <WorkbenchSurfaceCard class="quality-dashboard__inner-panel">
            <template #head>
              <span class="quality-dashboard__panel-title">教师质量指标</span>
            </template>
            <template #toolbar>
              <UiButton
                size="sm"
                variant="outline"
                :loading="reviewerLoading"
                @click="loadReviewerMetrics"
              >
                <template #icon><ReloadOutlined /></template>
                刷新
              </UiButton>
            </template>
            <UiDataTable
              v-model:current="reviewerPageNum"
              v-model:page-size="reviewerPageSize"
              pagination-mode="server"
              :columns="reviewerColumns"
              :data-source="reviewerMetrics"
              :loading="reviewerLoading"
              :total="reviewerPageTotal"
              flat
              zebra
              sticky-header
              row-key="id"
              size="middle"
              @page-change="handleReviewerPageChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'reviewer'">
                  {{ record.reviewerUserName }} ·
                  {{ record.reviewerTeacherNo }}
                </template>
                <template v-else-if="column.key === 'organization'">
                  {{ record.organizationStatusMessage }}
                </template>
                <template v-else-if="column.key === 'group'">
                  {{
                    record.groupName
                      ? `${record.groupName} · ${record.groupStatusMessage}`
                      : '组织级'
                  }}
                </template>
                <template v-else-if="column.key === 'metricStatus'">
                  <UiTag :tone="metricStatusTone(record.metricStatus)" size="sm">
                    {{ metricStatusLabel(record.metricStatus) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'avgScore'">
                  {{ formatDecimal(record.avgScore) }}
                </template>
                <template v-else-if="column.key === 'scoreStddev'">
                  {{ formatDecimal(record.scoreStddev) }}
                </template>
                <template v-else-if="column.key === 'consistencyRate'">
                  {{ formatDecimal(record.consistencyRate) }}
                </template>
                <template v-else-if="column.key === 'scoreBias'">
                  {{ formatDecimal(record.scoreBias) }}
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>

          <WorkbenchSurfaceCard class="quality-dashboard__inner-panel">
            <template #head>
              <span class="quality-dashboard__panel-title">质量雷达图</span>
            </template>
            <UiEmpty v-if="!examQualityPanel" description="暂无质量概览数据" />
            <template v-else>
              <div class="quality-dashboard__consistency-summary">
                <span class="quality-dashboard__consistency-label">考试级一致性</span>
                <strong class="quality-dashboard__consistency-value">
                  {{
                    examQualityPanel.qualitySummary.examConsistencyRate != null
                      ? `${examQualityPanel.qualitySummary.examConsistencyRate}%`
                      : '—'
                  }}
                </strong>
                <span class="quality-dashboard__consistency-meta">
                  {{ examQualityPanel.qualitySummary.consistencyReviewerCount }} 名教师纳入统计
                </span>
              </div>
              <MarkChart
                v-if="qualityRadarHasData"
                :option="qualityRadarOption"
                height="280px"
                aria-label="考试质量雷达图"
                class="quality-dashboard__radar-chart"
              />
              <UiEmpty v-else description="暂无质量维度数据" />
              <ul
                v-if="examQualityPanel.qualityOverviewItems.length > 0"
                class="quality-dashboard__consistency-list"
              >
                <li
                  v-for="item in examQualityPanel.qualityOverviewItems"
                  :key="item.reviewerUserId"
                  class="quality-dashboard__consistency-row"
                >
                  <span class="quality-dashboard__consistency-name">{{
                    item.reviewerDisplayName
                  }}</span>
                  <div class="quality-dashboard__consistency-track">
                    <div
                      class="quality-dashboard__consistency-fill"
                      :style="{ width: `${Math.min(100, Math.max(0, item.consistencyRate))}%` }"
                    />
                  </div>
                  <span class="quality-dashboard__consistency-rate"
                    >{{ item.consistencyRate }}%</span
                  >
                </li>
              </ul>
              <UiEmpty v-else description="暂无评阅员一致性样本" />
            </template>
          </WorkbenchSurfaceCard>
        </div>

        <WorkbenchSurfaceCard v-if="selectedExamId" class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">全场抽检记录</span>
          </template>
          <template #toolbar>
            <UiButton
              size="sm"
              variant="outline"
              :loading="examSpotCheckLoading"
              @click="loadExamSpotCheckRecords"
            >
              <template #icon><ReloadOutlined /></template>
              刷新
            </UiButton>
          </template>
          <UiDataTable
            v-model:current="examSpotCheckPagination.pageNum"
            v-model:page-size="examSpotCheckPagination.pageSize"
            pagination-mode="server"
            :columns="examSpotCheckColumns"
            :data-source="examSpotCheckItems"
            :loading="examSpotCheckLoading"
            :total="examSpotCheckPagination.total"
            flat
            zebra
            sticky-header
            row-key="id"
            size="middle"
            empty-kind="first-run"
            empty-description="暂无抽检记录"
            @page-change="handleExamSpotCheckPageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'question'">
                第 {{ examSpotCheckItems[index].questionNo }} 题 ·
                {{ examSpotCheckItems[index].questionTypeMessage }}
              </template>
              <template v-else-if="column.key === 'originalScore'">
                {{ formatDecimal(examSpotCheckItems[index].originalScore) }}
              </template>
              <template v-else-if="column.key === 'reviewScore'">
                {{
                  examSpotCheckItems[index].reviewScore != null
                    ? formatDecimal(examSpotCheckItems[index].reviewScore)
                    : '—'
                }}
              </template>
              <template v-else-if="column.key === 'spotCheckStatus'">
                <UiTag
                  :tone="examSpotCheckStatusTone(examSpotCheckItems[index].spotCheckStatus)"
                  size="sm"
                >
                  {{ examSpotCheckItems[index].spotCheckStatusMessage }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'checkedTime'">
                {{ examSpotCheckItems[index].checkedTime ?? '—' }}
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard v-if="isExamWorkspaceRoute" class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">我的待处理抽检</span>
          </template>
          <template #toolbar>
            <UiButton
              size="sm"
              variant="outline"
              :loading="mySpotCheckLoading"
              @click="loadMyPendingSpotChecks"
            >
              <template #icon><ReloadOutlined /></template>
              刷新
            </UiButton>
          </template>
          <UiDataTable
            v-model:current="mySpotCheckPagination.pageNum"
            v-model:page-size="mySpotCheckPagination.pageSize"
            pagination-mode="server"
            :columns="mySpotCheckColumns"
            :data-source="mySpotCheckItems"
            :loading="mySpotCheckLoading"
            :total="mySpotCheckPagination.total"
            flat
            zebra
            sticky-header
            row-key="id"
            size="middle"
            empty-kind="first-run"
            empty-description="暂无待处理抽检"
            @page-change="handleMySpotCheckPageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'question'">
                第 {{ mySpotCheckItems[index].questionNo }} 题 ·
                {{ mySpotCheckItems[index].questionTypeMessage }}
              </template>
              <template v-else-if="column.key === 'paper'">
                {{ mySpotCheckItems[index].paperDisplay.primaryText }}
              </template>
              <template v-else-if="column.key === 'originalScore'">
                {{ formatDecimal(mySpotCheckItems[index].originalScore) }}
              </template>
              <template v-else-if="column.key === 'spotCheckStatus'">
                <UiTag
                  :tone="mySpotCheckStatusTone(mySpotCheckItems[index].spotCheckStatus)"
                  size="sm"
                >
                  {{ mySpotCheckStatusLabel(mySpotCheckItems[index].spotCheckStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ mySpotCheckItems[index].createTime }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="[{ key: 'handle', label: '去处理', tone: 'primary' }]"
                  split
                  @action="goSpotCheckWorkbench"
                />
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard
          v-if="isExamWorkspaceRoute && examQualityPanel"
          class="quality-dashboard__inner-panel quality-dashboard__todo-panel"
        >
          <template #head>
            <span class="quality-dashboard__panel-title">质控待办入口</span>
          </template>
          <div class="quality-dashboard__todo-grid">
            <button
              type="button"
              class="quality-dashboard__todo-card"
              @click="goSpotCheckWorkbench"
            >
              <span class="quality-dashboard__todo-label">待处理抽检</span>
              <strong class="quality-dashboard__todo-value">{{
                examQualityPanel.openSpotCheckCount
              }}</strong>
              <span class="quality-dashboard__todo-hint">进入抽检处理</span>
            </button>
            <button
              type="button"
              class="quality-dashboard__todo-card"
              @click="goArbitrationWorkbench"
            >
              <span class="quality-dashboard__todo-label">待仲裁</span>
              <strong class="quality-dashboard__todo-value">{{
                examQualityPanel.arbitrationPendingCount
              }}</strong>
              <span class="quality-dashboard__todo-hint">进入仲裁裁定</span>
            </button>
            <button type="button" class="quality-dashboard__todo-card" @click="openSpotCheckTab">
              <span class="quality-dashboard__todo-label">预警教师</span>
              <strong class="quality-dashboard__todo-value">{{
                examQualityPanel.reviewerWarningCount
              }}</strong>
              <span class="quality-dashboard__todo-hint">创建抽检任务</span>
            </button>
            <button type="button" class="quality-dashboard__todo-card" @click="switchToProgressTab">
              <span class="quality-dashboard__todo-label">暂停教师</span>
              <strong class="quality-dashboard__todo-value">{{
                examQualityPanel.reviewerSuspendedCount
              }}</strong>
              <span class="quality-dashboard__todo-hint">查看题组进度</span>
            </button>
          </div>
        </WorkbenchSurfaceCard>
      </template>

      <template v-else-if="activeTab === 'progress'">
        <WorkbenchSurfaceCard
          v-if="showProgressGroupSummary"
          class="quality-dashboard__inner-panel"
        >
          <template #head>
            <span class="quality-dashboard__panel-title">题组进度汇总</span>
          </template>
          <template #toolbar>
            <span class="quality-dashboard__panel-hint">点击题组查看进度快照与走势</span>
          </template>
          <UiEmpty v-if="!scopeValid" description="请先配置阅卷组织" />
          <UiDataTable
            v-else
            pagination-mode="none"
            :columns="groupSummaryColumns"
            :data-source="groupSummaryRows"
            :loading="groupSummaryLoading"
            :show-pagination="false"
            flat
            zebra
            sticky-header
            row-key="groupId"
            size="middle"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'groupStatus'">
                <UiTag :tone="groupSummaryRows[index].statusTone" size="sm">
                  {{ groupSummaryRows[index].statusLabel }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'completionRate'">
                {{ groupSummaryRows[index].completionRateText }}
              </template>
              <template v-else-if="column.key === 'riskLevel'">
                <UiTag
                  v-if="groupSummaryRows[index].riskTone"
                  :tone="groupSummaryRows[index].riskTone"
                  size="sm"
                >
                  {{ groupSummaryRows[index].riskLevelText }}
                </UiTag>
                <span v-else>{{ groupSummaryRows[index].riskLevelText }}</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="[{ key: 'progress', label: '查看进度' }]"
                  split
                  @action="() => openGroupProgress(groupSummaryRows[index].groupId)"
                />
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard v-else class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">进度快照</span>
          </template>
          <template #toolbar>
            <a-space>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!scopeValid"
                :loading="progressLoading"
                @click="loadProgress"
              >
                <template #icon><ReloadOutlined /></template>
                查询最新
              </UiButton>
              <UiButton
                size="sm"
                :disabled="!scopeValid"
                :loading="snapshotting"
                @click="handleSnapshot"
              >
                <template #icon><SyncOutlined /></template>
                立即快照
              </UiButton>
            </a-space>
          </template>

          <UiEmpty
            v-if="!scopeValid"
            description="请选择阅卷组织"
            class="quality-dashboard__alert"
          />
          <a-skeleton v-else-if="progressLoading" active :paragraph="{ rows: 3 }" />
          <a-descriptions v-else-if="progress" :column="3" bordered size="small">
            <a-descriptions-item label="总任务数">
              <b>{{ progress.totalTasks }}</b>
            </a-descriptions-item>
            <a-descriptions-item label="已分配">
              {{ progress.allocatedTasks }}
            </a-descriptions-item>
            <a-descriptions-item label="进行中">
              {{ progress.inProgressTasks }}
            </a-descriptions-item>
            <a-descriptions-item label="已提交">
              {{ progress.submittedTasks }}
            </a-descriptions-item>
            <a-descriptions-item label="已定稿">
              <b class="quality-dashboard__num-success">{{ progress.finalizedTasks }}</b>
            </a-descriptions-item>
            <a-descriptions-item label="已回收">
              <b class="quality-dashboard__num-warning">{{ progress.recycledTasks }}</b>
            </a-descriptions-item>
            <a-descriptions-item label="完成率">
              {{ progress.completionRate.toFixed(2) }}%
            </a-descriptions-item>
            <a-descriptions-item label="预估剩余">
              {{ estimatedRemainingText(progress.estimatedRemainingMinutes) }}
            </a-descriptions-item>
            <a-descriptions-item label="风险等级">
              <UiTag :tone="riskTone(progress.riskLevel)" size="sm">
                {{ riskLabel(progress.riskLevel) }}
              </UiTag>
            </a-descriptions-item>
            <a-descriptions-item label="快照时间" :span="2">
              {{ progress.snapshotTime }}
            </a-descriptions-item>
            <a-descriptions-item v-if="progressRiskItems.length > 0" label="风险详情" :span="3">
              <ul class="quality-dashboard__risk-list">
                <li
                  v-for="(riskItem, riskIndex) in progressRiskItems"
                  :key="`${riskItem.riskCode}-${riskIndex}`"
                  class="quality-dashboard__risk-item"
                >
                  <UiTag :tone="riskTone(riskItem.riskLevel)" size="sm">
                    {{ riskLabel(riskItem.riskLevel) }}
                  </UiTag>
                  <span class="quality-dashboard__risk-title">{{ riskItem.riskLabel }}</span>
                  <span class="quality-dashboard__risk-desc">{{ riskItem.riskDescription }}</span>
                </li>
              </ul>
            </a-descriptions-item>
          </a-descriptions>
          <UiEmpty
            v-else
            description="暂无进度快照，请点击「立即快照」生成"
            class="quality-dashboard__alert"
          />

          <div v-if="progress" class="quality-dashboard__charts">
            <MarkTrendSection
              title="完成率走势"
              :hint="progressTrendHint"
              :point-count="progressTrendPoints.length"
              :option="progressTrendOption"
              height="260px"
              value-unit="%"
              :last-value="progressTrendLastValue"
              :aria-label="progressTrendAriaLabel"
            />
            <MarkBarSection
              title="当前任务状态分布"
              :hint="progressTaskBarHint"
              :item-count="progressTaskBarItems.length"
              :option="progressTaskBarOption"
              height="260px"
              :aria-label="progressTaskBarAriaLabel"
            />
          </div>
        </WorkbenchSurfaceCard>
      </template>

      <template v-else-if="activeTab === 'reviewer'">
        <WorkbenchSurfaceCard class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">教师质量指标</span>
          </template>
          <template #toolbar>
            <UiButton
              size="sm"
              :disabled="!scopeValid"
              :loading="refreshing"
              @click="handleRefreshMetrics"
            >
              <template #icon><SyncOutlined /></template>
              立即重算
            </UiButton>
          </template>

          <UiFilterBar
            variant="plain"
            v-model="reviewerFilterForm"
            :fields="reviewerFilterFields"
            search-text="查询"
            @search="
              () => {
                reviewerPageNum = 1
                void loadReviewerMetrics()
              }
            "
            @reset="handleReviewerFilterReset"
          />

          <UiDataTable
            v-model:current="reviewerPageNum"
            v-model:page-size="reviewerPageSize"
            pagination-mode="server"
            :columns="reviewerColumns"
            :data-source="reviewerMetrics"
            :loading="reviewerLoading"
            :total="reviewerPageTotal"
            flat
            zebra
            sticky-header
            row-key="id"
            size="middle"
            @page-change="handleReviewerPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'reviewer'">
                {{ record.reviewerUserName }} ·
                {{ record.reviewerTeacherNo }}
              </template>
              <template v-else-if="column.key === 'organization'">
                {{ record.organizationStatusMessage }}
              </template>
              <template v-else-if="column.key === 'group'">
                {{
                  record.groupName ? `${record.groupName} · ${record.groupStatusMessage}` : '组织级'
                }}
              </template>
              <template v-else-if="column.key === 'metricStatus'">
                <UiTag :tone="metricStatusTone(record.metricStatus)" size="sm">
                  {{ metricStatusLabel(record.metricStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'avgScore'">
                {{ formatDecimal(record.avgScore) }}
              </template>
              <template v-else-if="column.key === 'scoreStddev'">
                {{ formatDecimal(record.scoreStddev) }}
              </template>
              <template v-else-if="column.key === 'consistencyRate'">
                {{ formatDecimal(record.consistencyRate) }}
              </template>
              <template v-else-if="column.key === 'scoreBias'">
                {{ formatDecimal(record.scoreBias) }}
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>
      </template>

      <template v-else-if="activeTab === 'spotcheck'">
        <WorkbenchSurfaceCard class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">创建抽检任务</span>
          </template>

          <a-form layout="vertical" class="quality-dashboard__form quality-dashboard__form--spot">
            <a-form-item v-if="!isExamWorkspaceRoute" label="阅卷组织" required>
              <a-select :value="selectedOrganizationId" :options="organizationOptions" disabled />
            </a-form-item>
            <a-form-item v-if="!isExamWorkspaceRoute" label="题组（可选）">
              <a-select
                :value="selectedGroupId"
                :options="groupOptions"
                disabled
                placeholder="组织级抽检"
              />
            </a-form-item>
            <a-form-item label="抽检比例（%）" required>
              <a-input-number
                v-model:value="spotForm.sampleRate"
                :min="1"
                :max="100"
                class="quality-dashboard__field-full"
                placeholder="请输入 1~100 之间的抽检比例"
              />
            </a-form-item>
            <a-form-item label="目标教师（可选）">
              <a-select
                v-model:value="spotForm.targetReviewerUserId"
                :options="reviewerOptions"
                placeholder="选择目标教师；留空对全组抽检"
                allow-clear
                show-search
                option-filter-prop="label"
              />
            </a-form-item>
            <a-form-item>
              <UiButton
                :loading="creatingSpot"
                :disabled="!scopeValid || !spotForm.sampleRate"
                @click="handleCreateSpotCheck"
              >
                <template #icon><PlusOutlined /></template>
                创建抽检任务
              </UiButton>
            </a-form-item>
          </a-form>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">我的待处理抽检</span>
          </template>
          <template #toolbar>
            <UiButton
              size="sm"
              variant="outline"
              :loading="mySpotCheckLoading"
              @click="loadMyPendingSpotChecks"
            >
              <template #icon><ReloadOutlined /></template>
              刷新
            </UiButton>
          </template>
          <UiDataTable
            v-model:current="mySpotCheckPagination.pageNum"
            v-model:page-size="mySpotCheckPagination.pageSize"
            pagination-mode="server"
            :columns="mySpotCheckColumns"
            :data-source="mySpotCheckItems"
            :loading="mySpotCheckLoading"
            :total="mySpotCheckPagination.total"
            flat
            zebra
            sticky-header
            row-key="id"
            size="middle"
            empty-kind="first-run"
            empty-description="暂无待处理抽检"
            @page-change="handleMySpotCheckPageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'question'">
                第 {{ mySpotCheckItems[index].questionNo }} 题 ·
                {{ mySpotCheckItems[index].questionTypeMessage }}
              </template>
              <template v-else-if="column.key === 'paper'">
                {{ mySpotCheckItems[index].paperDisplay.primaryText }}
              </template>
              <template v-else-if="column.key === 'originalScore'">
                {{ formatDecimal(mySpotCheckItems[index].originalScore) }}
              </template>
              <template v-else-if="column.key === 'spotCheckStatus'">
                <UiTag
                  :tone="mySpotCheckStatusTone(mySpotCheckItems[index].spotCheckStatus)"
                  size="sm"
                >
                  {{ mySpotCheckStatusLabel(mySpotCheckItems[index].spotCheckStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ mySpotCheckItems[index].createTime }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="[{ key: 'handle', label: '去处理', tone: 'primary' }]"
                  split
                  @action="goSpotCheckWorkbench"
                />
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">全场抽检记录</span>
          </template>
          <template #toolbar>
            <UiButton
              size="sm"
              variant="outline"
              :loading="examSpotCheckLoading"
              @click="loadExamSpotCheckRecords"
            >
              <template #icon><ReloadOutlined /></template>
              刷新
            </UiButton>
          </template>
          <UiDataTable
            v-model:current="examSpotCheckPagination.pageNum"
            v-model:page-size="examSpotCheckPagination.pageSize"
            pagination-mode="server"
            :columns="examSpotCheckColumns"
            :data-source="examSpotCheckItems"
            :loading="examSpotCheckLoading"
            :total="examSpotCheckPagination.total"
            flat
            zebra
            sticky-header
            row-key="id"
            size="middle"
            empty-kind="first-run"
            empty-description="暂无抽检记录"
            @page-change="handleExamSpotCheckPageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'question'">
                第 {{ examSpotCheckItems[index].questionNo }} 题 ·
                {{ examSpotCheckItems[index].questionTypeMessage }}
              </template>
              <template v-else-if="column.key === 'originalScore'">
                {{ formatDecimal(examSpotCheckItems[index].originalScore) }}
              </template>
              <template v-else-if="column.key === 'reviewScore'">
                {{
                  examSpotCheckItems[index].reviewScore != null
                    ? formatDecimal(examSpotCheckItems[index].reviewScore)
                    : '—'
                }}
              </template>
              <template v-else-if="column.key === 'spotCheckStatus'">
                <UiTag
                  :tone="examSpotCheckStatusTone(examSpotCheckItems[index].spotCheckStatus)"
                  size="sm"
                >
                  {{ examSpotCheckItems[index].spotCheckStatusMessage }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'checkedTime'">
                {{ examSpotCheckItems[index].checkedTime ?? '—' }}
              </template>
            </template>
          </UiDataTable>
        </WorkbenchSurfaceCard>
      </template>

      <template v-else-if="activeTab === 'reprocess'">
        <WorkbenchSurfaceCard class="quality-dashboard__inner-panel">
          <template #head>
            <span class="quality-dashboard__panel-title">触发异常批次重处理</span>
          </template>

          <a-form layout="vertical" class="quality-dashboard__form">
            <a-form-item label="扫描批次" required>
              <a-select
                v-model:value="reprocessForm.scanBatchId"
                :options="scannerBatchOptions"
                :loading="scannerBatchLoading"
                placeholder="选择扫描批次"
                show-search
                :filter-option="false"
                @search="onScannerBatchSearch"
              />
            </a-form-item>
            <a-form-item label="重处理范围" required>
              <a-radio-group v-model:value="reprocessForm.scope">
                <a-radio-button value="FAILED_ONLY">仅失败页</a-radio-button>
                <a-radio-button value="ALL">整批次</a-radio-button>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="重处理原因" required>
              <a-textarea
                v-model:value="reprocessForm.reason"
                :rows="3"
                placeholder="请描述重处理原因（必填，会进入审计日志）"
              />
            </a-form-item>
            <a-form-item>
              <a-popconfirm
                title="确认触发异常批次重处理？"
                ok-text="确认"
                cancel-text="取消"
                @confirm="handleReprocess"
              >
                <UiButton variant="destructive" :loading="reprocessing" :disabled="!reprocessValid">
                  <template #icon><WarningOutlined /></template>
                  触发重处理
                </UiButton>
              </a-popconfirm>
            </a-form-item>
          </a-form>
        </WorkbenchSurfaceCard>
      </template>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamWorkbenchQualityPanelResponse } from '@/apis/mark/exam-progress'
import { getQualityPanel } from '@/apis/mark/exam-progress'
import type { ExamScannerBatchResponse } from '@/apis/mark/exam-scan'
import { pageScannerBatches } from '@/apis/mark/exam-scan'
import type {
  MarkingOrganizationResponse,
  QuestionGroupReviewerResponse,
  QuestionMarkingGroupResponse,
} from '@/apis/mark/marking-organization'
import {
  getOrganization,
  MarkingOrganizationStatusDescription,
  QUESTION_GROUP_STATUS_TONE,
  QuestionMarkingGroupStatusDescription,
} from '@/apis/mark/marking-organization'
import type {
  ExamSpotCheckRecordItemResponse,
  MyPendingSpotCheckItemResponse,
  ProgressMonitorRecordResponse,
  ProgressRiskItemResponse,
  ProgressRiskLevelCode,
  ReviewerQualityMetricResponse,
  SpotCheckStatusCode,
} from '@/apis/mark/marking-quality'
import {
  BatchReprocessScopeCode,
  createSpotCheckTasks,
  getLatestProgress,
  listExamSpotCheckRecords,
  listMyPendingSpotChecks,
  listProgressSnapshots,
  listReviewerMetrics,
  PROGRESS_RISK_LEVEL_TONE,
  ProgressRiskLevelDescription,
  refreshReviewerMetrics,
  reprocessBatch,
  REVIEWER_METRIC_STATUS_OPTIONS,
  REVIEWER_METRIC_STATUS_TONE,
  ReviewerMetricStatusCode,
  ReviewerMetricStatusDescription,
  SPOT_CHECK_STATUS_TONE,
  SpotCheckStatusDescription,
  takeProgressSnapshot,
} from '@/apis/mark/marking-quality'
import type {
  BadgeTone,
  FilterField,
  UiBarChartItem,
  UiSectionTabItem,
} from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkChart from '@/components/chart/MarkChart.vue'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import MarkQualityScopeBar from '@/components/workbench/MarkQualityScopeBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useOptionalExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { showUserError } from '@/utils/error-handler'
import { buildExamQualityRadarChartOption } from '@/utils/exam-quality-charts'
import {
  buildBarChartInsight,
  buildTrendChartInsight,
  mergeChartHint,
} from '@/utils/mark-chart-insights'
import {
  buildCategoryBarChartOption,
  buildTrendLineChartOption,
} from '@/utils/mark-echarts-options'
import { progressSnapshotsToTrendPoints } from '@/utils/mark-statistics-chart'
import { computeTrendPointDelta } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminMarkingQualityDashboard' })

const REVIEWER_METRIC_PAGE_SIZE = 100
const SCANNER_BATCH_OPTION_PAGE_SIZE = 20
const SCANNER_BATCH_SEARCH_DEBOUNCE_MS = 300

const route = useRoute()
const router = useRouter()
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')

const { isJourneyChrome, contextBarTitle, contextBarSubtitle, examStatusLabel, examStatusTone } =
  useOptionalExamJourneyContextBar('阅卷质控')

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  onExamSearch,
  searching,
  resolvingPinned,
  init: initExamSelector,
} = useMarkExamContext()

type QualityTabKey = 'overview' | 'progress' | 'reviewer' | 'spotcheck' | 'reprocess'

function resolveInitialTab(): QualityTabKey {
  const queryTab = route.query.tab
  if (
    queryTab === 'overview' ||
    queryTab === 'progress' ||
    queryTab === 'reviewer' ||
    queryTab === 'spotcheck' ||
    queryTab === 'reprocess'
  ) {
    return queryTab
  }
  return route.meta.layout === 'ExamWorkspace' ? 'overview' : 'progress'
}

const activeTab = ref<QualityTabKey>(resolveInitialTab())

const qualityTabItems = computed((): UiSectionTabItem[] => {
  const items: UiSectionTabItem[] = []
  if (isExamWorkspaceRoute.value) {
    items.push({ key: 'overview', label: '质量概览' })
  }
  items.push(
    { key: 'progress', label: '进度监控' },
    { key: 'reviewer', label: '教师质量' },
    { key: 'spotcheck', label: '抽检' },
    { key: 'reprocess', label: '异常批次重处理' },
  )
  return items
})

const selectedOrganizationId = ref<string | undefined>(
  route.query.organizationId ? String(route.query.organizationId) : undefined,
)
const selectedGroupId = ref<string | undefined>(
  route.query.groupId ? String(route.query.groupId) : undefined,
)
const organizationDetail = ref<MarkingOrganizationResponse | null>(null)
const organizationLoading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const scannerBatches = ref<ExamScannerBatchResponse[]>([])
const scannerBatchLoading = ref(false)
const scannerBatchKeyword = ref('')
let scannerBatchSearchTimer: ReturnType<typeof setTimeout> | undefined
const examQualityPanel = ref<ExamWorkbenchQualityPanelResponse | null>(null)
// 加载失败：toast 提示，主区保持空态/列表壳

const scopeValid = computed(() => Boolean(selectedExamId.value && selectedOrganizationId.value))

const showGroupScope = computed(
  () =>
    isExamWorkspaceRoute.value &&
    (activeTab.value === 'progress' || activeTab.value === 'spotcheck'),
)

const showProgressGroupSummary = computed(
  () => isExamWorkspaceRoute.value && activeTab.value === 'progress' && !selectedGroupId.value,
)

interface GroupSummaryRow {
  groupId: string
  groupName: string
  leaderUserName: string
  reviewerCount: number
  statusLabel: string
  statusTone: BadgeTone
  completionRateText: string
  riskLevelText: string
  riskTone?: BadgeTone
}

const groupSummaryColumns: ColumnType<GroupSummaryRow>[] = [
  { title: '题组', dataIndex: 'groupName', key: 'groupName', width: 160, fixed: 'left' },
  { title: '组长', dataIndex: 'leaderUserName', key: 'leaderUserName', width: 100 },
  { title: '阅卷教师', dataIndex: 'reviewerCount', key: 'reviewerCount', width: 88 },
  { title: '完成率', key: 'completionRate', width: 88 },
  { title: '风险', key: 'riskLevel', width: 88 },
  { title: '状态', key: 'groupStatus', width: 100 },
  { title: '操作', key: 'actions', width: 100 },
]

const groupSummaryLoading = ref(false)
const groupProgressByGroupId = ref<Record<string, ProgressMonitorRecordResponse | null>>({})

const groupSummaryRows = computed((): GroupSummaryRow[] =>
  (organizationDetail.value?.groups ?? []).map((group) => {
    const progressRecord = groupProgressByGroupId.value[group.id] ?? null
    return {
      groupId: group.id,
      groupName: group.groupName,
      leaderUserName: group.leaderUserName,
      reviewerCount: group.reviewers.length,
      statusLabel: strictEnumLabel(
        QuestionMarkingGroupStatusDescription,
        group.groupStatus,
        '题组状态',
      ),
      statusTone: strictEnumTone(QUESTION_GROUP_STATUS_TONE, group.groupStatus, '题组状态'),
      completionRateText:
        progressRecord != null ? `${progressRecord.completionRate.toFixed(1)}%` : '—',
      riskLevelText: progressRecord != null ? riskLabel(progressRecord.riskLevel) : '暂无快照',
      riskTone: progressRecord != null ? riskTone(progressRecord.riskLevel) : undefined,
    }
  }),
)

const organizationOptions = computed<DefaultOptionType[]>(() => {
  if (!organizationDetail.value) {
    return []
  }
  return [
    {
      value: organizationDetail.value.id,
      label: `阅卷组织 · ${strictEnumLabel(MarkingOrganizationStatusDescription, organizationDetail.value.organizationStatus, '阅卷组织状态')} · 负责人 ${organizationDetail.value.leaderUserName}`,
    },
  ]
})

const groupOptions = computed<DefaultOptionType[]>(() =>
  (organizationDetail.value?.groups ?? []).map((group) => ({
    value: group.id,
    label: `${group.groupName} · ${strictEnumLabel(QuestionMarkingGroupStatusDescription, group.groupStatus, '题组状态')} · 组长 ${group.leaderUserName}`,
  })),
)

const selectedGroup = computed<QuestionMarkingGroupResponse | undefined>(() =>
  organizationDetail.value?.groups.find((group) => group.id === selectedGroupId.value),
)

const reviewerOptions = computed<DefaultOptionType[]>(() => {
  const reviewersByUserId = new Map<string, QuestionGroupReviewerResponse>()
  const groups = selectedGroup.value
    ? [selectedGroup.value]
    : (organizationDetail.value?.groups ?? [])
  groups.forEach((group) => {
    group.reviewers.forEach((reviewer) => {
      reviewersByUserId.set(reviewer.reviewerUserId, reviewer)
    })
  })
  return Array.from(reviewersByUserId.values()).map((reviewer) => ({
    value: reviewer.reviewerUserId,
    label: `${reviewer.reviewerUserName} · ${reviewer.reviewerTeacherNo}`,
  }))
})

const scannerBatchOptions = computed<DefaultOptionType[]>(() =>
  scannerBatches.value.map((batch) => ({
    value: batch.scanBatchId,
    label: [
      batch.batchNo,
      batch.batchExternalNo,
      batch.statusMessage,
      typeof batch.pageCount === 'number' ? `${batch.pageCount} 页` : undefined,
      batch.scanStartTime,
    ]
      .filter(Boolean)
      .join(' · '),
  })),
)

// ─── 进度监控 ─────────────────────────────────

const progress = ref<ProgressMonitorRecordResponse | null>(null)
const progressHistory = ref<ProgressMonitorRecordResponse[]>([])
const progressLoading = ref(false)
const snapshotting = ref(false)
const progressRiskItems = computed<ProgressRiskItemResponse[]>(
  () => progress.value?.riskItems ?? [],
)

const progressTrendPoints = computed(() => progressSnapshotsToTrendPoints(progressHistory.value))

const progressTrendHint = computed(() =>
  mergeChartHint(
    '基于历史进度快照，悬停查看各时点完成率',
    buildTrendChartInsight(progressTrendPoints.value),
  ),
)

const progressTrendLastValue = computed(() => {
  const points = progressTrendPoints.value
  if (points.length === 0) return null
  return points[points.length - 1]?.value ?? null
})

const { chartOption: progressTrendOption } = useChartOption(() =>
  buildTrendLineChartOption(progressTrendPoints.value, {
    yAxisName: '完成率 %',
    yMax: 100,
    area: true,
    emptyText: '暂无历史快照，请先立即快照',
  }),
)

const progressTrendAriaLabel = computed(() => {
  const count = progressTrendPoints.value.length
  if (count < 2) {
    return '完成率走势，至少需要两次快照'
  }
  return `完成率走势，共 ${count} 个快照点`
})

const progressTaskBarItems = computed((): UiBarChartItem[] => {
  if (!progress.value) return []
  const snapshot = progress.value
  const items: UiBarChartItem[] = [
    { key: 'allocated', label: '已分配', value: snapshot.allocatedTasks, tone: 'blue' },
    { key: 'inProgress', label: '进行中', value: snapshot.inProgressTasks, tone: 'orange' },
    { key: 'submitted', label: '已提交', value: snapshot.submittedTasks, tone: 'blue' },
    { key: 'finalized', label: '已定稿', value: snapshot.finalizedTasks, tone: 'green' },
    { key: 'recycled', label: '已回收', value: snapshot.recycledTasks, tone: 'red' },
  ]
  return items.filter((item) => item.value > 0)
})

const progressTaskBarHint = computed(() =>
  mergeChartHint(
    '最新快照各状态任务量',
    buildBarChartInsight(progressTaskBarItems.value, { valueUnit: ' 项' }),
  ),
)

const { chartOption: progressTaskBarOption } = useChartOption(() =>
  buildCategoryBarChartOption(progressTaskBarItems.value, {
    orientation: 'vertical',
    yAxisName: '任务数',
    emptyText: '暂无任务状态数据',
  }),
)

const progressTaskBarAriaLabel = computed(() => {
  const count = progressTaskBarItems.value.length
  if (count <= 0) {
    return '当前任务状态分布，当前没有可展示的内容'
  }
  return `当前任务状态分布，共 ${count} 种状态`
})

const qualityRadarHasData = computed(() =>
  (examQualityPanel.value?.qualityDimensionItems ?? []).some((item) => item.score != null),
)

const { chartOption: qualityRadarOption } = useChartOption(() =>
  buildExamQualityRadarChartOption(examQualityPanel.value?.qualityDimensionItems ?? []),
)

const examSpotCheckItems = ref<ExamSpotCheckRecordItemResponse[]>([])
const examSpotCheckLoading = ref(false)
const examSpotCheckPagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const examSpotCheckColumns: ColumnType<ExamSpotCheckRecordItemResponse>[] = [
  { title: 'ID', key: 'id', width: 88 },
  { title: '教师', key: 'reviewerDisplayName', width: 120, ellipsis: true },
  { title: '题号', key: 'question', width: 140 },
  { title: '原评分', key: 'originalScore', width: 88, align: 'right' },
  { title: '复核分', key: 'reviewScore', width: 88, align: 'right' },
  { title: '结论', key: 'spotCheckStatus', width: 100 },
  { title: '抽检人', key: 'checkerDisplayName', width: 120, ellipsis: true },
  { title: '时间', key: 'checkedTime', width: 168 },
]

function examSpotCheckStatusTone(status: SpotCheckStatusCode): BadgeTone {
  return strictEnumTone(SPOT_CHECK_STATUS_TONE, status, '抽检状态')
}

async function loadExamSpotCheckRecords(): Promise<void> {
  if (!selectedExamId.value) {
    examSpotCheckItems.value = []
    examSpotCheckPagination.total = 0
    return
  }
  examSpotCheckLoading.value = true
  try {
    const result = await listExamSpotCheckRecords({
      examId: selectedExamId.value,
      groupId: selectedGroupId.value || undefined,
      pageNum: examSpotCheckPagination.pageNum,
      pageSize: examSpotCheckPagination.pageSize,
    })
    examSpotCheckItems.value = result.list
    examSpotCheckPagination.total = result.total
  } catch (error) {
    examSpotCheckItems.value = []
    examSpotCheckPagination.total = 0
    showUserError(error, '抽检记录加载失败')
  } finally {
    examSpotCheckLoading.value = false
  }
}

function handleExamSpotCheckPageChange(pageEvent: { current: number; pageSize: number }): void {
  examSpotCheckPagination.pageNum = pageEvent.current
  examSpotCheckPagination.pageSize = pageEvent.pageSize
  void loadExamSpotCheckRecords()
}

const mySpotCheckItems = ref<MyPendingSpotCheckItemResponse[]>([])
const mySpotCheckLoading = ref(false)
const mySpotCheckPagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const mySpotCheckColumns: ColumnType<MyPendingSpotCheckItemResponse>[] = [
  { title: '题目', key: 'question', width: 160, fixed: 'left' },
  { title: '答卷', key: 'paper', ellipsis: true },
  { title: '原评分', key: 'originalScore', width: 88, align: 'right' },
  { title: '状态', key: 'spotCheckStatus', width: 100 },
  { title: '分派时间', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 88 },
]

function mySpotCheckStatusTone(status: SpotCheckStatusCode): BadgeTone {
  return strictEnumTone(SPOT_CHECK_STATUS_TONE, status, '抽检状态')
}

function mySpotCheckStatusLabel(status: SpotCheckStatusCode): string {
  return strictEnumLabel(SpotCheckStatusDescription, status, '抽检状态')
}

async function loadMyPendingSpotChecks(): Promise<void> {
  if (!selectedExamId.value) {
    mySpotCheckItems.value = []
    mySpotCheckPagination.total = 0
    return
  }
  mySpotCheckLoading.value = true
  try {
    const result = await listMyPendingSpotChecks({
      examId: selectedExamId.value,
      pageNum: mySpotCheckPagination.pageNum,
      pageSize: mySpotCheckPagination.pageSize,
    })
    mySpotCheckItems.value = result.list
    mySpotCheckPagination.total = result.total
  } catch (error) {
    mySpotCheckItems.value = []
    mySpotCheckPagination.total = 0
    showUserError(error, '待处理抽检加载失败')
  } finally {
    mySpotCheckLoading.value = false
  }
}

function handleMySpotCheckPageChange(pageEvent: { current: number; pageSize: number }): void {
  mySpotCheckPagination.pageNum = pageEvent.current
  mySpotCheckPagination.pageSize = pageEvent.pageSize
  void loadMyPendingSpotChecks()
}

async function loadGroupSummaryProgress(): Promise<void> {
  if (!showProgressGroupSummary.value || !scopeValid.value) {
    groupProgressByGroupId.value = {}
    return
  }
  const groups = organizationDetail.value?.groups ?? []
  if (groups.length === 0) {
    groupProgressByGroupId.value = {}
    return
  }
  groupSummaryLoading.value = true
  try {
    const entries: Array<[string, ProgressMonitorRecordResponse | null]> = await Promise.all(
      groups.map(async (group) => {
        const record = await getLatestProgress({
          examId: selectedExamId.value!,
          organizationId: selectedOrganizationId.value!,
          groupId: group.id,
        })
        return [group.id, record]
      }),
    )
    groupProgressByGroupId.value = Object.fromEntries(entries)
  } catch (error) {
    groupProgressByGroupId.value = {}
    showUserError(error, '题组进度汇总加载失败')
  } finally {
    groupSummaryLoading.value = false
  }
}

async function loadProgressHistory(): Promise<void> {
  if (!scopeValid.value) {
    progressHistory.value = []
    return
  }
  try {
    progressHistory.value = await listProgressSnapshots({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
      limit: 30,
    })
  } catch (error) {
    progressHistory.value = []
    showUserError(error, '阅卷进度历史加载失败')
  }
}

async function loadProgress(): Promise<void> {
  if (!scopeValid.value) return
  progressLoading.value = true
  try {
    progress.value = await getLatestProgress({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
    })
    await loadProgressHistory()
  } catch (error) {
    showUserError(error, '阅卷进度快照加载失败')
  } finally {
    progressLoading.value = false
  }
}

async function handleSnapshot(): Promise<void> {
  if (!scopeValid.value) return
  snapshotting.value = true
  try {
    progress.value = await takeProgressSnapshot({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
    })
    await loadProgressHistory()
    message.success('已生成进度快照')
  } catch (error) {
    showUserError(error, '阅卷进度快照生成失败')
  } finally {
    snapshotting.value = false
  }
}

// ─── 教师质量 ─────────────────────────────────

const reviewerMetrics = ref<ReviewerQualityMetricResponse[]>([])
const reviewerLoading = ref(false)
const reviewerPageNum = ref(1)
const reviewerPageSize = ref(20)
const reviewerPageTotal = ref(0)
const reviewerStatusStats = ref({ warning: 0, suspended: 0 })
const refreshing = ref(false)

const reviewerFilterForm = reactive<{ metricStatus?: ReviewerMetricStatusCode }>({})

const reviewerFilterFields: FilterField[] = [
  {
    key: 'metricStatus',
    type: 'select',
    placeholder: '状态过滤',
    allowClear: true,
    width: 160,
    options: REVIEWER_METRIC_STATUS_OPTIONS,
  },
]

const reviewerColumns: ColumnType<ReviewerQualityMetricResponse>[] = [
  { title: '教师', key: 'reviewer', width: 180 },
  { title: '阅卷组织', key: 'organization', width: 140 },
  { title: '题组', key: 'group', width: 180 },
  { title: '总任务', key: 'totalTasks', dataIndex: 'totalTasks', width: 90 },
  { title: '已提交', key: 'submittedTasks', dataIndex: 'submittedTasks', width: 90 },
  { title: '平均分', key: 'avgScore', width: 90 },
  { title: '标准差', key: 'scoreStddev', width: 90 },
  { title: '一致率(%)', key: 'consistencyRate', width: 100 },
  { title: '偏差', key: 'scoreBias', width: 80 },
  { title: '回收次数', key: 'returnCount', dataIndex: 'returnCount', width: 90 },
  { title: '状态', key: 'metricStatus', width: 100 },
  { title: '快照时间', key: 'snapshotTime', dataIndex: 'snapshotTime', width: 160 },
]

async function loadReviewerStatusStats(): Promise<void> {
  if (!selectedExamId.value) {
    reviewerStatusStats.value = { warning: 0, suspended: 0 }
    return
  }
  const base = {
    examId: selectedExamId.value,
    organizationId: selectedOrganizationId.value,
    groupId: selectedGroupId.value,
    pageNum: 1,
    pageSize: 1,
  }
  const [warningPage, suspendedPage] = await Promise.all([
    listReviewerMetrics({ ...base, metricStatus: ReviewerMetricStatusCode.WARNING }),
    listReviewerMetrics({ ...base, metricStatus: ReviewerMetricStatusCode.SUSPENDED }),
  ])
  reviewerStatusStats.value = {
    warning: warningPage.total,
    suspended: suspendedPage.total,
  }
}

async function loadReviewerMetrics(): Promise<void> {
  if (!selectedExamId.value) return
  reviewerLoading.value = true
  try {
    const page = await listReviewerMetrics({
      examId: selectedExamId.value,
      organizationId: selectedOrganizationId.value,
      groupId: selectedGroupId.value,
      metricStatus: reviewerFilterForm.metricStatus,
      pageNum: reviewerPageNum.value,
      pageSize: reviewerPageSize.value,
    })
    reviewerMetrics.value = page.list
    reviewerPageNum.value = page.pageNum
    reviewerPageSize.value = page.pageSize
    reviewerPageTotal.value = page.total
    await loadReviewerStatusStats()
  } catch (error) {
    reviewerMetrics.value = []
    reviewerPageTotal.value = 0
    showUserError(error, '阅卷教师质量指标加载失败')
  } finally {
    reviewerLoading.value = false
  }
}

function handleReviewerPageChange(event: { current: number; pageSize: number }): void {
  reviewerPageNum.value = event.current
  reviewerPageSize.value = event.pageSize
  void loadReviewerMetrics()
}

function handleReviewerFilterReset(): void {
  reviewerFilterForm.metricStatus = undefined
  reviewerPageNum.value = 1
  void loadReviewerMetrics()
}

async function handleRefreshMetrics(): Promise<void> {
  if (!scopeValid.value) return
  refreshing.value = true
  try {
    await refreshReviewerMetrics({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
    })
    message.success('已重算教师质量指标')
    await loadReviewerMetrics()
  } catch (error) {
    showUserError(error, '阅卷教师质量指标重算失败')
  } finally {
    refreshing.value = false
  }
}

// ─── 抽检 ─────────────────────────────────────

const creatingSpot = ref(false)
// a-input-number v-model:value 不接受 null，使用 number | undefined 描述未填状态。
const spotForm = reactive<{
  sampleRate: number | undefined
  targetReviewerUserId: string
}>({
  sampleRate: 10,
  targetReviewerUserId: '',
})

async function handleCreateSpotCheck(): Promise<void> {
  if (!scopeValid.value || !spotForm.sampleRate) return
  creatingSpot.value = true
  try {
    const created = await createSpotCheckTasks({
      examId: selectedExamId.value!,
      organizationId: selectedOrganizationId.value!,
      groupId: selectedGroupId.value,
      sampleRate: spotForm.sampleRate,
      targetReviewerUserId: spotForm.targetReviewerUserId || undefined,
    })
    message.success(`已创建 ${created} 条抽检任务`)
    void Promise.all([loadMyPendingSpotChecks(), loadExamSpotCheckRecords()])
  } catch (error) {
    showUserError(error, '阅卷质量抽检任务创建失败')
  } finally {
    creatingSpot.value = false
  }
}

// ─── 异常批次重处理 ─────────────────────────────

const reprocessing = ref(false)
const reprocessForm = reactive<{
  scanBatchId: string
  reason: string
  scope: BatchReprocessScopeCode
}>({
  scanBatchId: '',
  reason: '',
  scope: BatchReprocessScopeCode.FAILED_ONLY,
})

const reprocessValid = computed(() =>
  Boolean(selectedExamId.value && reprocessForm.scanBatchId && reprocessForm.reason.trim()),
)

async function handleReprocess(): Promise<void> {
  if (!reprocessValid.value) return
  reprocessing.value = true
  try {
    await reprocessBatch({
      examId: selectedExamId.value!,
      scanBatchId: reprocessForm.scanBatchId,
      reason: reprocessForm.reason.trim(),
      scope: reprocessForm.scope,
    })
    message.success('已触发异常批次重处理')
    reprocessForm.scanBatchId = ''
    reprocessForm.reason = ''
  } catch (error) {
    showUserError(error, '异常扫描批次重处理提交失败')
  } finally {
    reprocessing.value = false
  }
}

// ─── 共用工具 ─────────────────────────────
function metricStatusTone(status: ReviewerMetricStatusCode): BadgeTone {
  return strictEnumTone(REVIEWER_METRIC_STATUS_TONE, status, '阅卷员指标状态')
}

function metricStatusLabel(status: ReviewerMetricStatusCode): string {
  return strictEnumLabel(ReviewerMetricStatusDescription, status, '阅卷员指标状态')
}

function riskTone(level: ProgressRiskLevelCode): BadgeTone {
  return strictEnumTone(PROGRESS_RISK_LEVEL_TONE, level, '进度风险等级')
}

function riskLabel(level: ProgressRiskLevelCode): string {
  return strictEnumLabel(ProgressRiskLevelDescription, level, '进度风险等级')
}

function estimatedRemainingText(minutes?: number): string {
  if (minutes == null) return '暂未形成预估'
  return `${minutes} 分钟`
}

/* ========== 信号指标：阅卷质量全局风险面板 ========== */

async function loadExamQualityPanel(): Promise<void> {
  if (!selectedExamId.value) {
    examQualityPanel.value = null
    return
  }
  const shouldLoad =
    isExamWorkspaceRoute.value || activeTab.value === 'overview' || activeTab.value === 'spotcheck'
  if (!shouldLoad) {
    examQualityPanel.value = null
    return
  }
  try {
    examQualityPanel.value = await getQualityPanel(selectedExamId.value)
  } catch (error) {
    examQualityPanel.value = null
    showUserError(error, '考试质量看板加载失败')
  }
}

const signalMetrics = computed<SignalMetric[]>(() => {
  const useExamQualitySignals =
    examQualityPanel.value &&
    (isExamWorkspaceRoute.value ||
      activeTab.value === 'overview' ||
      activeTab.value === 'spotcheck')
  if (useExamQualitySignals) {
    const panel = examQualityPanel.value!
    const summary = panel.qualitySummary
    const consistency = summary.examConsistencyRate
    const passRate = summary.spotCheckPassRate
    return [
      {
        key: 'consistency',
        label: '平均一致性',
        value: consistency != null ? `${consistency}%` : '—',
        tone:
          consistency != null && consistency >= 90
            ? 'green'
            : consistency != null
              ? 'orange'
              : 'gray',
      },
      {
        key: 'spotcheck-done',
        label: '已抽检',
        value: summary.spotCheckCompletedCount ?? 0,
        tone: (summary.spotCheckCompletedCount ?? 0) > 0 ? 'blue' : 'gray',
      },
      {
        key: 'spotcheck-abnormal',
        label: '异常',
        value: summary.spotCheckAbnormalCount ?? 0,
        tone: (summary.spotCheckAbnormalCount ?? 0) > 0 ? 'red' : 'green',
      },
      {
        key: 'spotcheck-pass',
        label: '抽检通过率',
        value: passRate != null ? `${passRate}%` : '—',
        tone: passRate != null && passRate >= 80 ? 'green' : passRate != null ? 'orange' : 'gray',
      },
      {
        key: 'spotcheck-open',
        label: '待抽检',
        value: panel.openSpotCheckCount,
        tone: panel.openSpotCheckCount > 0 ? 'orange' : 'gray',
      },
    ]
  }

  const p = progress.value
  const reviewerWarning = reviewerStatusStats.value.warning
  const reviewerSuspended = reviewerStatusStats.value.suspended

  const completionRate =
    typeof p?.completionRate === 'number' ? `${p.completionRate.toFixed(1)}%` : '-'
  const recycledCount = p?.recycledTasks ?? 0
  const inProgressCount = p?.inProgressTasks ?? 0
  const finalizedCount = p?.finalizedTasks ?? 0

  const completionTrend = computeTrendPointDelta(progressTrendPoints.value)

  return [
    {
      key: 'completion',
      label: '完成率',
      value: completionRate,
      tone: p?.riskLevel ? riskTone(p.riskLevel) : 'gray',
      trend: completionTrend,
      trendPolarity: 'positive',
    },
    {
      key: 'inProgress',
      label: '进行中',
      value: inProgressCount,
      tone: inProgressCount > 0 ? 'blue' : 'gray',
      trendPolarity: 'neutral',
    },
    {
      key: 'finalized',
      label: '已定稿',
      value: finalizedCount,
      tone: finalizedCount > 0 ? 'green' : 'gray',
      trendPolarity: 'positive',
    },
    {
      key: 'recycled',
      label: '已回收',
      value: recycledCount,
      tone: recycledCount > 0 ? 'orange' : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'warning',
      label: '教师预警',
      value: reviewerWarning,
      tone: reviewerWarning > 0 ? 'orange' : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'suspended',
      label: '教师暂停',
      value: reviewerSuspended,
      tone: reviewerSuspended > 0 ? 'red' : 'gray',
      trendPolarity: 'negative',
    },
  ]
})

function formatDecimal(value: number | undefined): string {
  if (value === null || value === undefined) return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toFixed(2)
}

function syncRouteQuery(): void {
  void router.replace({
    query: {
      ...(selectedExamId.value ? { examId: selectedExamId.value } : {}),
      ...(selectedOrganizationId.value ? { organizationId: selectedOrganizationId.value } : {}),
      ...(selectedGroupId.value ? { groupId: selectedGroupId.value } : {}),
      ...(isExamWorkspaceRoute.value ? { tab: activeTab.value } : {}),
    },
  })
}

async function loadOrganizationDetail(): Promise<void> {
  organizationDetail.value = null
  selectedOrganizationId.value = undefined
  selectedGroupId.value = undefined
  spotForm.targetReviewerUserId = ''
  if (!selectedExamId.value) {
    return
  }
  organizationLoading.value = true
  try {
    const detail = await getOrganization({ examId: selectedExamId.value })
    organizationDetail.value = detail
    selectedOrganizationId.value = detail.id
    const queryGroupId = route.query.groupId ? String(route.query.groupId) : undefined
    selectedGroupId.value = detail.groups.some((group) => group.id === queryGroupId)
      ? queryGroupId
      : undefined
  } catch (error) {
    organizationDetail.value = null
    selectedOrganizationId.value = undefined
    selectedGroupId.value = undefined
    showUserError(error, '阅卷组织加载失败')
  } finally {
    organizationLoading.value = false
  }
}

async function loadScannerBatches(
  keyword = scannerBatchKeyword.value,
  resetSelection = false,
): Promise<void> {
  if (resetSelection) {
    scannerBatches.value = []
    reprocessForm.scanBatchId = ''
  }
  scannerBatchKeyword.value = keyword
  if (!selectedExamId.value) {
    return
  }
  scannerBatchLoading.value = true
  try {
    const normalizedKeyword = keyword.trim()
    const page = await pageScannerBatches({
      examId: selectedExamId.value,
      pageNum: 1,
      pageSize: SCANNER_BATCH_OPTION_PAGE_SIZE,
      keyword: normalizedKeyword || undefined,
      includeDiscarded: true,
    })
    scannerBatches.value = page.list
  } catch (error) {
    scannerBatches.value = []
    reprocessForm.scanBatchId = ''
    showUserError(error, '扫描批次加载失败')
  } finally {
    scannerBatchLoading.value = false
  }
}

function onScannerBatchSearch(keyword: string): void {
  if (scannerBatchSearchTimer) {
    clearTimeout(scannerBatchSearchTimer)
  }
  scannerBatchSearchTimer = setTimeout(() => {
    void loadScannerBatches(keyword)
  }, SCANNER_BATCH_SEARCH_DEBOUNCE_MS)
}

function handleExamChange(value: SelectValue): void {
  onExamChange(value)
}

function handleOrganizationChange(value: SelectValue): void {
  selectedOrganizationId.value = value != null ? String(value) : undefined
  if (!selectedOrganizationId.value) {
    selectedGroupId.value = undefined
  }
  spotForm.targetReviewerUserId = ''
  syncRouteQuery()
  reloadActiveTab()
}

function handleGroupChange(value: SelectValue): void {
  selectedGroupId.value = value != null ? String(value) : undefined
  spotForm.targetReviewerUserId = ''
  syncRouteQuery()
  reloadActiveTab()
}

function handleScopeBarGroupChange(groupId: string | undefined): void {
  selectedGroupId.value = groupId
  spotForm.targetReviewerUserId = ''
  syncRouteQuery()
  reloadActiveTab()
}

function openGroupProgress(groupId: string): void {
  selectedGroupId.value = groupId
  syncRouteQuery()
  void loadProgress()
}

function goSpotCheckWorkbench(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceMarkingQuality',
    params: { examId: selectedExamId.value },
  })
}

function goArbitrationWorkbench(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceMarkingArbitration',
    params: { examId: selectedExamId.value },
  })
}

function openSpotCheckTab(): void {
  activeTab.value = 'spotcheck'
}

function switchToProgressTab(): void {
  activeTab.value = 'progress'
}

function reloadActiveTab(): void {
  if (!selectedExamId.value) return
  if (activeTab.value === 'overview') {
    void Promise.all([
      loadExamQualityPanel(),
      loadReviewerMetrics(),
      loadMyPendingSpotChecks(),
      loadExamSpotCheckRecords(),
    ])
    return
  }
  if (activeTab.value === 'progress') {
    if (showProgressGroupSummary.value) {
      progress.value = null
      progressHistory.value = []
      void loadGroupSummaryProgress()
      return
    }
    void loadProgress()
    return
  }
  if (activeTab.value === 'reviewer') {
    void loadReviewerMetrics()
    return
  }
  if (activeTab.value === 'spotcheck') {
    void Promise.all([loadMyPendingSpotChecks(), loadExamSpotCheckRecords()])
  }
}

watch(activeTab, () => {
  void loadExamQualityPanel()
  syncRouteQuery()
  reloadActiveTab()
})

watch(
  selectedExamId,
  async () => {
    await Promise.all([
      loadOrganizationDetail(),
      loadScannerBatches('', true),
      loadExamQualityPanel(),
    ])
    syncRouteQuery()
    reloadActiveTab()
  },
  { immediate: true },
)

onMounted(async () => {
  await initExamSelector()
})

onActivated(() => {
  if (selectedExamId.value) {
    reloadActiveTab()
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.quality-dashboard {
  &__tabs {
    padding: 0 16px;
  }

  &__surface {
    margin-top: 0;
  }

  &__overview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dp-space-4);

    @media (min-width: bp.$ant-grid-lg) {
      grid-template-columns: 1.2fr 0.8fr;
    }
  }

  &__consistency-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--dp-space-2);
    margin-bottom: var(--dp-space-4);
  }

  &__consistency-label {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__consistency-value {
    font-size: var(--dp-type-title-size);
    color: var(--dp-text-primary);
  }

  &__consistency-meta {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__consistency-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__consistency-row {
    display: grid;
    grid-template-columns: 72px 1fr 48px;
    align-items: center;
    gap: var(--dp-space-3);
    padding: var(--dp-space-2) 0;
  }

  &__consistency-name {
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__consistency-track {
    height: 6px;
    border-radius: var(--dp-radius-full);
    background: var(--dp-surface-soft);
    overflow: hidden;
  }

  &__consistency-fill {
    height: 100%;
    border-radius: inherit;
    background: var(--dp-blue-500);
  }

  &__consistency-rate {
    font-size: 12px;
    font-weight: 600;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &__dimension-chart {
    margin-bottom: var(--dp-space-4);
  }

  &__form--spot {
    max-width: 480px;
  }

  &__panel-hint {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__todo-panel {
    margin-top: var(--dp-space-4);
  }

  &__todo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--dp-space-3);

    @media (min-width: bp.$ant-grid-lg) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__todo-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--dp-space-1);
    padding: var(--dp-space-3);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-soft);
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.2s ease,
      background 0.2s ease;

    &:hover {
      border-color: var(--dp-blue-300);
      background: var(--dp-surface);
    }
  }

  &__todo-label {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
  }

  &__todo-value {
    font-size: var(--dp-type-title-size);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--dp-text-primary);
  }

  &__todo-hint {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-blue-600);
  }

  &__panel-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  &__exam-select {
    width: 240px;
  }

  &__org-select {
    width: 280px;
  }

  &__group-select {
    width: 240px;
  }

  &__metric-filter {
    width: 140px;
  }

  &__form {
    max-width: 720px;
  }

  &__field-full {
    width: 100%;
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__empty {
    margin-top: 80px;
  }

  &__num-success {
    color: var(--ant-color-success, #16a34a);
  }

  &__num-warning {
    color: var(--ant-color-warning, #ea580c);
  }

  &__risk-list {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 8px;
  }

  &__risk-item {
    color: var(--dp-text-primary);
    line-height: 1.6;
  }
}

.quality-dashboard__inner-panel {
  margin-bottom: 16px;
}
</style>
