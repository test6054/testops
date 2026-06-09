<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="scan-monitor__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            popup-class-name="ui-select-dropdown"
            :dropdown-match-select-width="false"
            :dropdown-style="scanMonitorSelectDropdownStyle"
            :get-popup-container="scanMonitorSelectPopupContainer"
            @change="onExamChange"
          />
          <UiTag :tone="connectionTone" size="sm">
            {{ connectionLabel }}
          </UiTag>
          <UiTag :tone="abnormalAttentionTotal > 0 ? 'red' : 'green'" size="sm">
            {{ abnormalAttentionTotal > 0 ? `${abnormalAttentionTotal} 条异常` : '无阻断异常' }}
          </UiTag>
          <UiTag :tone="duplicateAttentionTotal > 0 ? 'purple' : 'green'" size="sm">
            {{ duplicateAttentionTotal > 0 ? `${duplicateAttentionTotal} 条重复` : '无重复影像' }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" variant="outline" :disabled="!selectedExamId" @click="openLedger">
            影像账本
          </UiButton>
          <UiButton size="sm" :disabled="!selectedExamId" :loading="loading" @click="handleRefresh">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看扫描录入状态"
      class="scan-monitor__empty"
    />

    <template v-else>
      <div class="scan-monitor__overview">
        <UiStatPanel
          title="扫描监控中控台"
          :items="statPanelMetrics"
          :columns="4"
          variant="grid"
          compact
          class="scan-monitor__stats"
        />
        <a-card :bordered="false" size="small" class="scan-monitor__health-card">
          <UiRingProgress
            :percent="healthPercent"
            :color="healthColor"
            size="lg"
            :stroke-width="10"
            :label="healthRingLabel"
          />
          <div class="scan-monitor__health-meta">
            <span>实时事件 {{ liveEvents.length }} 条</span>
            <span>异常阻断 {{ abnormalAttentionTotal }} 条</span>
            <span>重复影像 {{ duplicateAttentionTotal }} 条</span>
          </div>
        </a-card>
      </div>

      <UiSectionTabs
        v-model="activeTab"
        :items="monitorTabs"
        compact
        class="scan-monitor__tabs"
      >
        <section v-if="activeTab === 'normal'" class="scan-monitor__normal-panel">
          <UiErrorRetryPanel
            v-if="scanLiveError"
            :error="scanLiveError"
            title="扫描实时事件连接异常"
            :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
            compact
            @retry="refreshScanLive"
          />
          <UiEmpty
            v-else-if="liveEvents.length === 0"
            description="当前考试还没有扫描事件，上传或一体机扫描后会在这里实时出现"
            class="scan-monitor__normal-empty"
          />
          <div v-else class="scan-monitor__event-groups">
            <section
              v-for="group in groupedByStation"
              :key="group.stationId"
              class="scan-monitor__event-group"
            >
              <div class="scan-monitor__event-group-header">
                <div>
                  <h3 class="scan-monitor__event-group-title">{{ group.stationName }}</h3>
                  <p class="scan-monitor__event-group-meta">
                    {{ group.events.length }} 条事件 · {{ group.pageCount }} 页
                  </p>
                </div>
                <UiTag tone="blue" size="sm">{{ group.deviceCount }} 台设备</UiTag>
              </div>
              <div class="scan-monitor__event-list">
                <button
                  v-for="event in group.events"
                  :key="event.eventId"
                  type="button"
                  class="scan-monitor__event-row"
                  @click="openScanEventDetail(event)"
                >
                  <span class="scan-monitor__event-main">
                    <b>{{ event.batchExternalNo || event.reportId || event.eventId }}</b>
                    <small>{{ event.sourceFileCount }} 个文件 · {{ event.pageCount }} 页</small>
                  </span>
                  <span class="scan-monitor__event-side">
                    <UiTag :tone="scanEventStatusTone(event.status)" size="sm">
                      {{ scanEventStatusLabel(event.status) }}
                    </UiTag>
                    <small>{{ formatTimeOfDay(event.scanEndTime || event.createTime) }}</small>
                  </span>
                </button>
              </div>
            </section>
          </div>
        </section>
        <a-card v-else :bordered="false" class="detail-table-card scan-monitor__list-card">
        <template #title>{{ activeTab === 'duplicate' ? '重复影像' : '异常阻断' }}</template>
        <div class="filter-card">
        <a-form
          layout="inline"
          :model="filterForm"
          class="scan-monitor__filter-form filter-form filter-form--toolbar"
          @submit.prevent="reloadAttentionsFromFirstPage"
        >
          <a-form-item v-if="activeTab === 'abnormal'" label="异常类型">
            <a-select
              v-model:value="filterForm.attentionType"
              placeholder="全部异常"
              :options="attentionTypeOptions"
              allow-clear
              class="scan-monitor__type-select"
              popup-class-name="ui-select-dropdown"
              :dropdown-match-select-width="false"
              :dropdown-style="scanMonitorSelectDropdownStyle"
              :get-popup-container="scanMonitorSelectPopupContainer"
              @change="onAttentionTypeChange"
            />
          </a-form-item>
          <a-form-item label="扫描批次">
            <a-select
              v-model:value="filterForm.scanBatchId"
              placeholder="选择扫描批次"
              :options="scanBatchOptions"
              :loading="scanBatchesLoading"
              show-search
              :filter-option="false"
              allow-clear
              class="scan-monitor__filter-select"
              popup-class-name="ui-select-dropdown"
              :dropdown-match-select-width="false"
              :dropdown-style="scanMonitorSelectDropdownStyle"
              :get-popup-container="scanMonitorSelectPopupContainer"
              @search="handleScanBatchSearch"
              @dropdown-visible-change="handleScanBatchDropdownVisibleChange"
              @change="handleScanBatchFilterChange"
            />
          </a-form-item>
          <a-form-item label="答题卡">
            <a-select
              v-model:value="filterForm.paperInstanceId"
              placeholder="选择答题卡"
              :options="paperCandidateOptions"
              :loading="paperCandidatesLoading"
              show-search
              :filter-option="false"
              allow-clear
              class="scan-monitor__filter-select"
              popup-class-name="ui-select-dropdown"
              :dropdown-match-select-width="false"
              :dropdown-style="scanMonitorSelectDropdownStyle"
              :get-popup-container="scanMonitorSelectPopupContainer"
              @search="handlePaperCandidateSearch"
              @dropdown-visible-change="handlePaperCandidateDropdownVisibleChange"
              @change="handlePaperCandidateFilterChange"
            />
          </a-form-item>
          <a-form-item class="filter-form__actions">
            <a-space class="filter-form__action-group">
              <UiButton size="sm" :loading="loading" @click="reloadAttentionsFromFirstPage">查询</UiButton>
              <span class="op-link" role="button" @click="resetFilter">重置</span>
            </a-space>
          </a-form-item>
        </a-form>
        </div>

        <!-- D-9 错误态：扫描异常列表加载失败时提供重试 + 上报入口 -->
        <UiErrorRetryPanel
          v-if="attentionsLoadError"
          :error="attentionsLoadError"
          title="扫描异常列表加载失败"
          :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
          compact
          @retry="loadAttentions"
        />
        <UiDataTable class="student-detail-table__data-table"
          v-else
          v-model:current="attentionPagination.current"
          v-model:page-size="attentionPagination.pageSize"
          :columns="columns"
          :data-source="activeAttentionRows"
          :loading="loading"
          :total="attentionPagination.total"
          row-key="id"
          :enable-selection="activeTab === 'abnormal'"
          :selected-row-keys="selectedRowKeys"
          flat
          :empty-title="activeTab === 'duplicate' ? '当前无重复影像' : '当前无异常阻断'"
          :empty-description="activeTab === 'duplicate' ? '当前筛选条件下没有重复影像' : '当前筛选条件下没有异常阻断待办'"
          v-bind="activeTab === 'abnormal' ? { rowSelection } : {}"
          @page-change="handleAttentionPageChange"
        >
          <template #toolbar-right>
            <UiButton
              v-if="activeTab === 'abnormal'"
              size="sm"
              :disabled="selectedRowKeys.length === 0"
              :loading="batchBinding"
              @click="handleBatchBind"
            >
              批量绑定 ({{ selectedRowKeys.length }})
            </UiButton>
          </template>

          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'attentionType'">
              <UiTag :tone="attentionTypeTone(record.attentionType)" size="sm">
                {{ attentionTypeLabel(record.attentionType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'sourceInfo'">
              <div class="scan-monitor__source-cell">
                <span>
                  <b>{{ sourceTypeLabel(record.sourceType) }}</b>
                </span>
                <span class="scan-monitor__hint">{{ record.sourceDisplayName }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'scanBatch'">
              <span>{{ record.scanBatchDisplayName }}</span>
            </template>
            <template v-else-if="column.key === 'paperDisplay'">
              <div class="scan-monitor__paper-cell">
                <span>{{ record.paperDisplay.primaryText }}</span>
                <span v-if="record.paperDisplay.secondaryText" class="scan-monitor__hint">
                  {{ record.paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="scanAttentionStatusTone(record)" size="sm">
                {{ scanAttentionStatusLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'diagnostic'">
              <a-typography-text
                :content="scanAttentionDiagnosticText(record.diagnostic)"
                :ellipsis="{ tooltip: true }"
              />
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ formatDateTimeWithSeconds(record.updateTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <span class="op-link" role="button" @click="openDetail(record)">详情</span>
                <span
                  v-if="record.attentionType === 'BINDING_CONFLICT'"
                  class="op-link primary"
                  :class="{ 'is-disabled': !record.paperInstanceId || !record.scanBatchId }"
                  role="button"
                  @click="
                    record.paperInstanceId && record.scanBatchId && openBindDrawer(record)
                  "
                >
                  身份绑定
                </span>
                <span
                  v-else
                  class="op-link primary"
                  role="button"
                  @click="openLedger"
                >
                  处置入口
                </span>
                <span
                  v-if="record.sourceType === 'SCANNED_PAGE' && record.pageId"
                  class="op-link danger"
                  :class="{ 'is-disabled': pageDiscarding === record.pageId }"
                  role="button"
                  title="将该扫描页标记为废弃，不影响所属批次"
                  @click="pageDiscarding !== record.pageId && onDiscardPage(record)"
                >
                  废弃此页
                </span>
              </div>
            </template>
          </template>
        </UiDataTable>
        </a-card>
      </UiSectionTabs>
    </template>

    <UiDrawer
      :open="liveDrawerOpen"
      title="扫描事件详情"
      :width="520"
      hide-footer
      @update:open="(v: boolean) => (liveDrawerOpen = v)"
      @close="liveDrawerOpen = false"
    >
      <a-descriptions v-if="currentEvent" :column="1" size="small" bordered>
        <a-descriptions-item label="事件ID">{{ currentEvent.eventId }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          {{ scanEventStatusLabel(currentEvent.status) }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描站点">
          {{ currentEvent.scannerStationId }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描设备">
          {{ currentEvent.scannerDeviceId }}
        </a-descriptions-item>
        <a-descriptions-item label="批次号">
          {{ currentEvent.batchExternalNo || currentEvent.reportId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="页数">{{ currentEvent.pageCount }}</a-descriptions-item>
        <a-descriptions-item label="文件数">{{ currentEvent.sourceFileCount }}</a-descriptions-item>
        <a-descriptions-item label="入库时间">
          {{ formatDateTimeWithSeconds(currentEvent.createTime) }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>

    <!-- 身份绑定抽屉 -->
    <UiDrawer
      :open="bindDrawerOpen"
      title="试卷身份绑定"
      :width="560"
      :confirm-loading="binding"
      @update:open="(v: boolean) => (bindDrawerOpen = v)"
      @close="bindDrawerOpen = false"
      @confirm="handleBind"
    >
      <a-form ref="bindFormRef" :model="bindForm" :rules="bindFormRules" layout="vertical">
        <UiErrorRetryPanel
          v-if="candidatesLoadError"
          :error="candidatesLoadError"
          title="考生名册加载失败"
          compact
          class="scan-monitor__bind-alert"
          @retry="retryLoadCandidates"
        />
        <UiAlertStrip
          v-if="bindSubmitError"
          tone="error"
          title="试卷身份绑定失败"
          :description="bindSubmitError"
          dense
          class="scan-monitor__bind-alert"
        />
        <UiAlertStrip
          v-if="bindIdentityEvidenceBlockReason"
          tone="warning"
          title="身份核验证据未就绪"
          :description="bindIdentityEvidenceBlockReason"
          dense
          class="scan-monitor__bind-alert"
        />
        <section class="scan-monitor__identity-evidence">
          <div class="scan-monitor__identity-evidence-header">
            <div>
              <h3 class="scan-monitor__identity-evidence-title">身份区证据对比</h3>
              <p class="scan-monitor__identity-evidence-subtitle">
                左侧为 OCR 自动裁切身份区，右侧为原始扫描页，用于人工核对姓名、学号与卷面来源
              </p>
            </div>
            <UiTag :tone="bindIdentitySliceFileId && bindSourcePageFileId ? 'blue' : 'orange'" size="sm">
              {{ bindIdentitySliceFileId && bindSourcePageFileId ? '双证据' : '证据缺失' }}
            </UiTag>
          </div>
          <div class="scan-monitor__identity-compare">
            <div class="scan-monitor__identity-pane">
              <div class="scan-monitor__identity-pane-title">手写身份区切片</div>
              <a-skeleton
                v-if="bindIdentitySliceLoading"
                active
                :paragraph="{ rows: 3 }"
                class="scan-monitor__identity-skeleton"
              />
              <UiErrorRetryPanel
                v-else-if="bindIdentitySliceError"
                :error="bindIdentitySliceError"
                title="手写身份切片加载失败"
                compact
                @retry="loadBindIdentitySliceImage"
              />
              <div v-else-if="bindIdentitySliceImageUrl" class="scan-monitor__identity-image-wrap">
                <img
                  :src="bindIdentitySliceImageUrl"
                  alt="手写身份区切片"
                  class="scan-monitor__identity-image"
                >
              </div>
              <UiEmpty
                v-else
                description="该异常没有手写身份区切片，请检查 OCR 身份区裁切链路"
                class="scan-monitor__identity-empty"
              />
            </div>
            <div class="scan-monitor__identity-pane">
              <div class="scan-monitor__identity-pane-title">原始扫描页</div>
              <a-skeleton
                v-if="bindSourcePageLoading"
                active
                :paragraph="{ rows: 3 }"
                class="scan-monitor__identity-skeleton"
              />
              <UiErrorRetryPanel
                v-else-if="bindSourcePageError"
                :error="bindSourcePageError"
                title="原始扫描页加载失败"
                compact
                @retry="loadBindSourcePageImage"
              />
              <div v-else-if="bindSourcePageImageUrl" class="scan-monitor__identity-image-wrap">
                <img
                  :src="bindSourcePageImageUrl"
                  alt="原始扫描页"
                  class="scan-monitor__identity-image"
                >
              </div>
              <UiEmpty
                v-else
                description="该异常缺少原始扫描页文件引用，请检查扫描页登记链路"
                class="scan-monitor__identity-empty"
              />
            </div>
          </div>
        </section>
        <a-form-item label="扫描批次">
          <a-input :value="bindForm.scanBatchDisplayName" disabled />
        </a-form-item>
        <a-form-item label="答卷">
          <a-input :value="bindForm.paperDisplayName" disabled />
        </a-form-item>
        <a-form-item label="识别学号（可选，留空表示未能识别）" name="recognizedStudentNo">
          <a-input
            v-model:value="bindForm.recognizedStudentNo"
            placeholder="OCR / 二维码识别到的学号线索，供后续审计使用"
            :maxlength="64"
          />
        </a-form-item>
        <a-form-item label="正确考生（从当前考试名册选择）" name="confirmedCandidateRosterId">
          <a-select
            v-model:value="bindForm.confirmedCandidateRosterId"
            placeholder="按姓名或学号搜索"
            show-search
            :options="candidateOptions"
            :filter-option="filterCandidate"
            :loading="candidatesLoading"
            allow-clear
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="答卷状态" name="attemptStatus">
              <a-select
                v-model:value="bindForm.attemptStatus"
                placeholder="选择答卷状态"
                :options="batchAttemptStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="答卷编号（可选）">
              <a-input
                v-model:value="bindForm.attemptNo"
                placeholder="多试卷时区分"
                :maxlength="32"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>

    <!-- 批量身份绑定抽屉 -->
    <UiDrawer
      :open="batchBindDrawerOpen"
      title="批量试卷身份绑定"
      :width="880"
      :confirm-loading="batchBinding"
      @update:open="(v: boolean) => (batchBindDrawerOpen = v)"
      @close="closeBatchBindDrawer"
      @confirm="submitBatchBind"
    >
      <UiErrorRetryPanel
        v-if="candidatesLoadError"
        :error="candidatesLoadError"
        title="考生名册加载失败"
        compact
        class="scan-monitor__bind-alert"
        @retry="retryLoadCandidates"
      />
      <UiAlertStrip
        v-if="batchBindError"
        tone="error"
        title="批量身份绑定失败"
        :description="batchBindError"
        dense
        class="scan-monitor__bind-alert"
      />
      <div v-if="batchBindResult" class="scan-monitor__batch-result">
        <UiAlertStrip
          :tone="batchBindResult.failureCount > 0 ? 'warning' : 'success'"
          title="批量绑定结果"
          :description="`成功 ${batchBindResult.successCount} 条，失败 ${batchBindResult.failureCount} 条`"
          dense
        />
        <div v-if="batchBindFailedItems.length > 0" class="scan-monitor__batch-failures">
          <div
            v-for="item in batchBindFailedItems"
            :key="item.paperInstanceId"
            class="scan-monitor__batch-failure"
          >
            <a-typography-text
              strong
              :content="batchBindRowDisplayNameMap.get(item.paperInstanceId)"
            />
            <span>{{ item.errorMessage }}</span>
          </div>
        </div>
      </div>
      <div class="scan-monitor__batch-list">
        <div v-for="row in batchBindRows" :key="row.attentionId" class="scan-monitor__batch-row">
          <div class="scan-monitor__batch-main">
            <a-typography-text strong :content="row.paperDisplayName" />
            <span class="scan-monitor__hint">{{ row.scanBatchDisplayName }}</span>
            <span v-if="row.diagnostic" class="scan-monitor__batch-diagnostic">
              {{ scanAttentionDiagnosticText(row.diagnostic) }}
            </span>
          </div>
          <div class="scan-monitor__batch-form">
            <a-input
              v-model:value="row.recognizedStudentNo"
              placeholder="识别学号"
              :maxlength="64"
              class="scan-monitor__batch-input"
            />
            <a-select
              v-model:value="row.confirmedCandidateRosterId"
              placeholder="选择正确考生"
              show-search
              :options="candidateOptions"
              :filter-option="filterCandidate"
              :loading="candidatesLoading"
              class="scan-monitor__batch-candidate"
              allow-clear
            />
            <a-select
              v-model:value="row.attemptStatus"
              placeholder="作答状态"
              :options="batchAttemptStatusOptions"
              class="scan-monitor__batch-attempt-status"
            />
            <a-input
              v-model:value="row.attemptNo"
              placeholder="答卷编号（可选）"
              :maxlength="32"
              class="scan-monitor__batch-attempt-no"
            />
          </div>
        </div>
      </div>
    </UiDrawer>

    <!-- 详情抽屉 -->
    <UiDrawer
      :open="detailDrawerOpen"
      title="异常详情"
      :width="560"
      hide-footer
      @update:open="(v: boolean) => (detailDrawerOpen = v)"
      @close="detailDrawerOpen = false"
    >
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="异常类型">
          {{ attentionTypeLabel(detailRecord.attentionType) }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          {{ scanAttentionStatusLabel(detailRecord) }}
        </a-descriptions-item>
        <a-descriptions-item label="来源">
          {{ sourceTypeLabel(detailRecord.sourceType) }}
        </a-descriptions-item>
        <a-descriptions-item label="来源说明">
          {{ detailRecord.sourceDisplayName }}
        </a-descriptions-item>
        <a-descriptions-item label="当前考试">{{ selectedExamLabel }}</a-descriptions-item>
        <a-descriptions-item label="扫描批次">
          {{ detailRecord.scanBatchDisplayName }}
        </a-descriptions-item>
        <a-descriptions-item label="答题卡">
          {{ detailRecord.paperDisplay.primaryText }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描页">{{ detailRecord.pageDisplayName }}</a-descriptions-item>
        <a-descriptions-item label="题目">
          {{ detailRecord.questionDisplayName }}
        </a-descriptions-item>
        <a-descriptions-item label="处理说明">
          <div class="scan-monitor__diagnostic-text">
            {{ scanAttentionDiagnosticText(detailRecord.diagnostic) }}
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">
          {{ formatDateTimeWithSeconds(detailRecord.updateTime) }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>

    <a-modal
      v-model:open="pageDiscardModalOpen"
      title="废弃扫描页"
      ok-text="废弃"
      ok-type="danger"
      cancel-text="取消"
      :confirm-loading="Boolean(pageDiscarding)"
      @ok="confirmDiscardPage"
      @cancel="closePageDiscardModal"
    >
      <a-form layout="vertical">
        <a-form-item
          label="废弃原因"
          required
          :validate-status="pageDiscardReasonError ? 'error' : undefined"
          :help="pageDiscardReasonError"
        >
          <a-textarea
            v-model:value="pageDiscardReason"
            placeholder="请输入废弃原因（必填，1-255 字）"
            :maxlength="255"
            show-count
            :rows="4"
          />
        </a-form-item>
      </a-form>
      <UiAlertStrip
        v-if="pageDiscardError"
        tone="error"
        title="扫描页废弃失败"
        :description="pageDiscardError"
        dense
      />
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
/**
 * 阅卷交付 - 扫描监控中控台
 *
 * 后端契约：
   * - listScanAttentions(examId, pageNum, pageSize, queryGroup?, attentionType?, scanBatchId?, paperInstanceId?)
 * - bindPaper(...)、batchBindPapers(...)、listExamCandidates(examId)
 *
 * attentionType 枚举：QUALITY_BLOCK / PROCESSING_BLOCK / DUPLICATE_PENDING / RECOGNITION_REVIEW / BINDING_CONFLICT
 */
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  CandidateStatusCode,
  DuplicateResolutionStatusCode,
  ExamCandidateVO,
  ExamScannerBatchVO,
  ExamScoreSummaryItemVO,
  QualityDecisionCode,
  ScanAttentionQueryGroupCode,
  ScanAttentionItemVO,
  ScanAttentionSourceTypeCode,
  ScanAttentionTypeCode,
  TaskStatusCode,
} from '@/apis/mark/exam'
import type { ExamPaperBatchBindResultVO } from '@/apis/mark/exam-mark-scanner'
import type { ScanEventStatusCode, ScanLiveEventVO } from '@/apis/mark/scan-live'
import type { GradeStatusCode } from '@/apis/mark/student-exam'
import type { BadgeTone, UiSectionTabItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import {
  bindPaper,
  CANDIDATE_STATUS_LABEL,
  FINAL_SCORE_STATUS_LABEL,
  listExamCandidates,
  listScanAttentions,
  pageExamScoreSummary,
  pageScannerBatches,
  SCAN_BATCH_STATUS_LABEL,
} from '@/apis/mark/exam'
import { batchBindPapers } from '@/apis/mark/exam-mark-scanner'
import { discardScannedPage } from '@/apis/mark/scanner-kiosk'
import {
  UiAlertStrip,
  UiButton,
  UiDataTable,
  UiDrawer,
  UiEmpty,
  UiErrorRetryPanel,
  UiRingProgress,
  UiSectionTabs,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useScanLiveStream } from '@/composables/useScanLiveStream'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds, formatTimeOfDay } from '@/utils/format'
import { readArrayResponse, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanLiveMonitor' })

const scanMonitorSelectDropdownStyle = {
  minWidth: '360px',
}

const SCAN_BATCH_FILTER_PAGE_SIZE = 50
const PAPER_CANDIDATE_FILTER_PAGE_SIZE = 50

function scanMonitorSelectPopupContainer(): HTMLElement {
  return document.body
}

const router = useRouter()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 列表筛选 + 数据 ─────────────────────────────
const filterForm = reactive<{
  attentionType?: ScanAttentionTypeCode | ''
  scanBatchId?: string
  paperInstanceId?: string
}>({
  attentionType: '',
  scanBatchId: '',
  paperInstanceId: '',
})

const attentions = ref<ScanAttentionItemVO[]>([])
const loading = ref(false)
const activeTab = ref<'normal' | 'abnormal' | 'duplicate'>('normal')
const attentionPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})
// D-9 错误态：扫描异常列表加载失败时 UiErrorRetryPanel 重试 + 上报
const attentionsLoadError = ref<Error | null>(null)
const scanBatches = ref<ExamScannerBatchVO[]>([])
const scanBatchesLoading = ref(false)
const scanBatchKeyword = ref('')
const paperCandidates = ref<ExamScoreSummaryItemVO[]>([])
const paperCandidatesLoading = ref(false)
const paperCandidateKeyword = ref('')
const scanBatchOptions = computed(() =>
  scanBatches.value.map((item) => ({
    value: item.scanBatchId,
    label: [
      item.batchNo || item.batchExternalNo || item.statusMessage,
      scanBatchStatusLabel(item),
      `${item.pageCount ?? 0} 页`,
    ].join(' · '),
  })),
)
const paperCandidateOptions = computed(() =>
  paperCandidates.value
    .filter((item) => item.paperInstanceId)
    .map((item) => ({
      value: item.paperInstanceId,
      label: [
        `${item.studentName}（${item.studentNo}）`,
        item.studentClassName,
        item.bindingStatus,
        finalScoreStatusLabel(item.finalScoreStatus),
      ]
        .filter(Boolean)
        .join(' · '),
    })),
)

const abnormalAttentionTotal = ref(0)
const duplicateAttentionTotal = ref(0)
const activeAttentionRows = computed(() => attentions.value)

const {
  events: liveEvents,
  ready: scanLiveReady,
  isStreaming: scanLiveStreaming,
  error: scanLiveError,
  start: startScanLive,
  stop: stopScanLive,
  refresh: refreshScanLive,
} = useScanLiveStream({
  filter: () => ({ examId: selectedExamId.value || undefined }),
  initialLimit: 50,
  maxEvents: 200,
})

const liveDrawerOpen = ref(false)
const currentEvent = ref<ScanLiveEventVO | null>(null)

const connectionTone = computed<BadgeTone>(() => {
  if (scanLiveError.value) return 'red'
  if (scanLiveReady.value) return 'green'
  if (scanLiveStreaming.value) return 'blue'
  return 'gray'
})

const connectionLabel = computed(() => {
  if (scanLiveError.value) return '实时连接异常'
  if (scanLiveReady.value) return '实时同步中'
  if (scanLiveStreaming.value) return '连接建立中'
  return '未连接'
})

const groupedByStation = computed(() => {
  const groups = new Map<
    string,
    {
      stationId: string
      stationName: string
      events: ScanLiveEventVO[]
      pageCount: number
      deviceIds: Set<string>
    }
  >()
  for (const event of liveEvents.value) {
    const stationId = event.scannerStationId || 'UNKNOWN'
    const group = groups.get(stationId) ?? {
      stationId,
      stationName: event.scannerStationId ? `扫描站点 ${event.scannerStationId}` : '未登记扫描站点',
      events: [],
      pageCount: 0,
      deviceIds: new Set<string>(),
    }
    group.events.push(event)
    group.pageCount += event.pageCount ?? 0
    if (event.scannerDeviceId) {
      group.deviceIds.add(event.scannerDeviceId)
    }
    groups.set(stationId, group)
  }
  return Array.from(groups.values()).map((group) => ({
    stationId: group.stationId,
    stationName: group.stationName,
    events: group.events,
    pageCount: group.pageCount,
    deviceCount: group.deviceIds.size,
  }))
})

const healthPercent = computed(() => {
  const total = liveEvents.value.length + abnormalAttentionTotal.value + duplicateAttentionTotal.value
  if (total === 0) return scanLiveReady.value ? 100 : 0
  return Math.round((liveEvents.value.length / total) * 100)
})

const healthColor = computed(() => {
  if (scanLiveError.value || abnormalAttentionTotal.value > 0) return 'red'
  if (duplicateAttentionTotal.value > 0) return 'orange'
  return 'green'
})

const healthRingLabel = computed(() => {
  if (scanLiveError.value) return '连接异常'
  if (abnormalAttentionTotal.value > 0) return '需处置'
  if (duplicateAttentionTotal.value > 0) return '需去重'
  if (liveEvents.value.length > 0) return '入账正常'
  return '待扫描'
})

const monitorTabs = computed<UiSectionTabItem[]>(() => [
  {
    key: 'normal',
    label: '正常',
    count: liveEvents.value.length,
    badgeTone: connectionTone.value,
    helper: '实时展示扫描事件入库、聚合和批次流转。',
  },
  {
    key: 'abnormal',
    label: '异常',
    count: abnormalAttentionTotal.value,
    badgeTone: abnormalAttentionTotal.value > 0 ? 'red' : 'green',
    helper: '处理质量阻断、处理阻断、识别复核和身份绑定冲突。',
  },
  {
    key: 'duplicate',
    label: '重复',
    count: duplicateAttentionTotal.value,
    badgeTone: duplicateAttentionTotal.value > 0 ? 'purple' : 'green',
    helper: '集中裁决重复扫描影像，避免重复卷面进入阅卷链路。',
  },
])

const SCAN_EVENT_STATUS_LABEL: Record<ScanEventStatusCode, string> = {
  PENDING: '待入账',
  BATCHED: '已入账',
  INVALID: '无效事件',
}

const SCAN_EVENT_STATUS_TONE: Record<ScanEventStatusCode, BadgeTone> = {
  PENDING: 'blue',
  BATCHED: 'green',
  INVALID: 'red',
}

function scanEventStatusLabel(status: ScanEventStatusCode): string {
  return strictEnumLabel(SCAN_EVENT_STATUS_LABEL, status, '扫描实时事件状态')
}

function scanEventStatusTone(status: ScanEventStatusCode): BadgeTone {
  return strictEnumTone(SCAN_EVENT_STATUS_TONE, status, '扫描实时事件状态')
}

function openScanEventDetail(event: ScanLiveEventVO): void {
  currentEvent.value = event
  liveDrawerOpen.value = true
}

async function handleRefresh(): Promise<void> {
  await Promise.all([
    loadAttentions(),
    loadScanBatches(),
    loadPaperCandidates(),
    selectedExamId.value ? refreshScanLive() : Promise.resolve(),
  ])
}

const attentionTypeOptions: { label: string, value: ScanAttentionTypeCode }[] = [
  { label: '质量阻断', value: 'QUALITY_BLOCK' },
  { label: '处理阻断', value: 'PROCESSING_BLOCK' },
  { label: '重复影像', value: 'DUPLICATE_PENDING' },
  { label: '识别复核', value: 'RECOGNITION_REVIEW' },
  { label: '身份绑定冲突', value: 'BINDING_CONFLICT' },
]

function scanBatchStatusLabel(batch: ExamScannerBatchVO): string {
  return strictEnumLabel(SCAN_BATCH_STATUS_LABEL, batch.status, '扫描批次状态')
}

function finalScoreStatusLabel(status: ExamScoreSummaryItemVO['finalScoreStatus']): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, status, '最终成绩状态')
}

const columns: ColumnType<ScanAttentionItemVO>[] = [
  { title: '异常类型', key: 'attentionType', width: 160 },
  { title: '来源', key: 'sourceInfo', width: 180 },
  { title: '扫描批次', key: 'scanBatch', width: 220, ellipsis: true },
  { title: '答卷', key: 'paperDisplay', width: 220 },
  { title: '状态', key: 'status', width: 120 },
  { title: '处理说明', key: 'diagnostic', ellipsis: true },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

async function loadAttentions(): Promise<void> {
  if (!selectedExamId.value) {
    attentions.value = []
    attentionPagination.total = 0
    abnormalAttentionTotal.value = 0
    duplicateAttentionTotal.value = 0
    return
  }
  loading.value = true
  attentionsLoadError.value = null
  try {
    await loadAttentionCounters()
    const queryGroup = currentAttentionQueryGroup()
    if (!queryGroup) {
      attentions.value = []
      attentionPagination.total = 0
      return
    }
    await loadAttentionPage(queryGroup)
  } catch (error) {
    attentionsLoadError.value = toUserError(error, '扫描异常列表加载失败')
    showUserError(error, '扫描异常列表加载失败')
  } finally {
    loading.value = false
  }
}

function onAttentionTypeChange(): void {
  reloadAttentionsFromFirstPage()
}

function currentAttentionQueryGroup(): ScanAttentionQueryGroupCode | undefined {
  if (activeTab.value === 'abnormal') return 'ABNORMAL'
  if (activeTab.value === 'duplicate') return 'DUPLICATE'
  return undefined
}

function currentAttentionType(): ScanAttentionTypeCode | undefined {
  if (activeTab.value !== 'abnormal') return undefined
  return filterForm.attentionType || undefined
}

async function loadAttentionCounters(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    abnormalAttentionTotal.value = 0
    duplicateAttentionTotal.value = 0
    return
  }
  const [abnormalResult, duplicateResult] = await Promise.all([
    listScanAttentions({
      examId,
      pageNum: 1,
      pageSize: 1,
      queryGroup: 'ABNORMAL',
    }),
    listScanAttentions({
      examId,
      pageNum: 1,
      pageSize: 1,
      queryGroup: 'DUPLICATE',
    }),
  ])
  abnormalAttentionTotal.value = readPageTotal(abnormalResult, '扫描异常总数加载失败')
  duplicateAttentionTotal.value = readPageTotal(duplicateResult, '重复影像总数加载失败')
}

async function loadAttentionPage(queryGroup: ScanAttentionQueryGroupCode): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    attentions.value = []
    attentionPagination.total = 0
    return
  }
  const result = await listScanAttentions({
    examId,
    pageNum: attentionPagination.current,
    pageSize: attentionPagination.pageSize,
    queryGroup,
    attentionType: currentAttentionType(),
    scanBatchId: filterForm.scanBatchId?.trim() || undefined,
    paperInstanceId: filterForm.paperInstanceId?.trim() || undefined,
  })
  const total = readPageTotal(result, '扫描异常列表加载失败')
  const rows = readPageList(result, '扫描异常列表加载失败')
  if (rows.length === 0 && total > 0 && attentionPagination.current > 1) {
    attentionPagination.current = Math.ceil(total / attentionPagination.pageSize)
    await loadAttentionPage(queryGroup)
    return
  }
  attentionPagination.total = total
  attentions.value = rows
}

function reloadAttentionsFromFirstPage(): void {
  attentionPagination.current = 1
  selectedRowKeys.value = []
  void loadAttentions()
}

function handleAttentionPageChange(pageEvent: { current: number, pageSize: number }): void {
  attentionPagination.current = pageEvent.current
  attentionPagination.pageSize = pageEvent.pageSize
  selectedRowKeys.value = []
  void loadAttentions()
}

async function loadScanBatches(keyword = scanBatchKeyword.value): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    scanBatches.value = []
    return
  }
  const normalizedKeyword = keyword.trim()
  scanBatchesLoading.value = true
  try {
    const result = await pageScannerBatches({
      examId,
      pageNum: 1,
      pageSize: SCAN_BATCH_FILTER_PAGE_SIZE,
      keyword: normalizedKeyword || undefined,
      includeDiscarded: false,
    })
    scanBatches.value = readPageList(result, '扫描批次加载失败，请稍后重试')
  } catch (error) {
    scanBatches.value = []
    showUserError(error, '扫描批次加载失败')
  } finally {
    scanBatchesLoading.value = false
  }
}

async function loadPaperCandidates(keyword = paperCandidateKeyword.value): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    paperCandidates.value = []
    return
  }
  const normalizedKeyword = keyword.trim()
  paperCandidatesLoading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId,
      pageNum: 1,
      pageSize: PAPER_CANDIDATE_FILTER_PAGE_SIZE,
      keyword: normalizedKeyword || undefined,
    })
    paperCandidates.value = readPageList(result, '答题卡名单加载失败，请稍后重试')
      .filter((item) => item.paperInstanceId)
  } catch (error) {
    paperCandidates.value = []
    showUserError(error, '答题卡列表加载失败')
  } finally {
    paperCandidatesLoading.value = false
  }
}

function handleScanBatchSearch(value: string): void {
  scanBatchKeyword.value = value
  void loadScanBatches(value)
}

function handleScanBatchDropdownVisibleChange(open: boolean): void {
  if (open) {
    void loadScanBatches()
  }
}

function handleScanBatchFilterChange(value: SelectValue): void {
  if (!value) {
    scanBatchKeyword.value = ''
    void loadScanBatches('')
  }
  reloadAttentionsFromFirstPage()
}

function handlePaperCandidateSearch(value: string): void {
  paperCandidateKeyword.value = value
  void loadPaperCandidates(value)
}

function handlePaperCandidateDropdownVisibleChange(open: boolean): void {
  if (open) {
    void loadPaperCandidates()
  }
}

function handlePaperCandidateFilterChange(value: SelectValue): void {
  if (!value) {
    paperCandidateKeyword.value = ''
    void loadPaperCandidates('')
  }
  reloadAttentionsFromFirstPage()
}

// ─── 类型色彩编码 ─────────────────────────────────
const ATTENTION_TYPE_TONE: Record<ScanAttentionTypeCode, 'red' | 'orange' | 'purple' | 'blue' | 'gray'> = {
  QUALITY_BLOCK: 'red',
  PROCESSING_BLOCK: 'orange',
  DUPLICATE_PENDING: 'purple',
  RECOGNITION_REVIEW: 'blue',
  BINDING_CONFLICT: 'gray',
}

const ATTENTION_TYPE_LABEL: Record<ScanAttentionTypeCode, string> = {
  QUALITY_BLOCK: '质量阻断',
  PROCESSING_BLOCK: '处理阻断',
  DUPLICATE_PENDING: '重复影像',
  RECOGNITION_REVIEW: '识别复核',
  BINDING_CONFLICT: '身份绑定冲突',
}

function attentionTypeTone(type: ScanAttentionTypeCode): 'red' | 'orange' | 'purple' | 'blue' | 'gray' {
  return strictEnumTone(ATTENTION_TYPE_TONE, type, '扫描异常类型')
}

function attentionTypeLabel(type: ScanAttentionTypeCode): string {
  return strictEnumLabel(ATTENTION_TYPE_LABEL, type, '扫描异常类型')
}

const SCAN_ATTENTION_SOURCE_TYPE_LABEL: Record<ScanAttentionSourceTypeCode, string> = {
  SCANNED_PAGE: '扫描页',
  PROCESSING_TASK: '处理任务',
  DUPLICATE_RESOLUTION: '重复扫描处置',
  GRADE_RESULT: '阅卷结果',
  PAPER_INSTANCE: '试卷实例',
}

function sourceTypeLabel(type: ScanAttentionSourceTypeCode): string {
  return strictEnumLabel(SCAN_ATTENTION_SOURCE_TYPE_LABEL, type, '扫描异常来源类型')
}

function assertNeverScanAttentionType(_type: never): never {
  throw toUserError(null, '扫描异常类型无法识别，请刷新后重试')
}

const QUALITY_DECISION_LABEL: Record<QualityDecisionCode, string> = {
  PASS: '质量通过',
  BLOCKED: '已阻断',
}

const QUALITY_DECISION_TONE: Record<QualityDecisionCode, BadgeTone> = {
  PASS: 'green',
  BLOCKED: 'red',
}

const TASK_STATUS_LABEL: Record<TaskStatusCode, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
  BLOCKED: '已阻断',
  FAILED: '处理失败',
}

const TASK_STATUS_TONE: Record<TaskStatusCode, BadgeTone> = {
  PENDING: 'orange',
  PROCESSING: 'blue',
  COMPLETED: 'green',
  BLOCKED: 'red',
  FAILED: 'red',
}

const DUPLICATE_RESOLUTION_STATUS_LABEL: Record<DuplicateResolutionStatusCode, string> = {
  PENDING: '待处置',
  RESOLVED: '已处置',
}

const DUPLICATE_RESOLUTION_STATUS_TONE: Record<DuplicateResolutionStatusCode, BadgeTone> = {
  PENDING: 'orange',
  RESOLVED: 'green',
}

const GRADE_STATUS_LABEL: Record<GradeStatusCode, string> = {
  PENDING: '待阅卷',
  NEED_REVIEW: '待复核',
  CONFIRMED: '已确认',
}

const GRADE_STATUS_TONE: Record<GradeStatusCode, BadgeTone> = {
  PENDING: 'orange',
  NEED_REVIEW: 'blue',
  CONFIRMED: 'green',
}

function scanAttentionStatusLabel(record: ScanAttentionItemVO): string {
  switch (record.attentionType) {
    case 'QUALITY_BLOCK':
      return strictEnumLabel(QUALITY_DECISION_LABEL, record.qualityDecision, '扫描页质量判定')
    case 'PROCESSING_BLOCK':
      return strictEnumLabel(TASK_STATUS_LABEL, record.processingStatus, '处理任务状态')
    case 'DUPLICATE_PENDING':
      return strictEnumLabel(
        DUPLICATE_RESOLUTION_STATUS_LABEL,
        record.duplicateResolutionStatus,
        '重复影像处置状态',
      )
    case 'RECOGNITION_REVIEW':
      return strictEnumLabel(GRADE_STATUS_LABEL, record.gradeStatus, '题目阅卷状态')
    case 'BINDING_CONFLICT':
      return '待人工绑定'
    default:
      return assertNeverScanAttentionType(record.attentionType)
  }
}

function scanAttentionStatusTone(record: ScanAttentionItemVO): BadgeTone {
  switch (record.attentionType) {
    case 'QUALITY_BLOCK':
      return strictEnumTone(QUALITY_DECISION_TONE, record.qualityDecision, '扫描页质量判定')
    case 'PROCESSING_BLOCK':
      return strictEnumTone(TASK_STATUS_TONE, record.processingStatus, '处理任务状态')
    case 'DUPLICATE_PENDING':
      return strictEnumTone(
        DUPLICATE_RESOLUTION_STATUS_TONE,
        record.duplicateResolutionStatus,
        '重复影像处置状态',
      )
    case 'RECOGNITION_REVIEW':
      return strictEnumTone(GRADE_STATUS_TONE, record.gradeStatus, '题目阅卷状态')
    case 'BINDING_CONFLICT':
      return 'orange'
    default:
      return assertNeverScanAttentionType(record.attentionType)
  }
}

const statPanelMetrics = computed(() => [
  {
    label: '正常入账',
    value: liveEvents.value.length,
    unit: '条',
    tone: liveEvents.value.length > 0 ? ('green' as const) : ('gray' as const),
  },
  {
    label: '异常阻断',
    value: abnormalAttentionTotal.value,
    unit: '条',
    tone: abnormalAttentionTotal.value > 0 ? ('red' as const) : ('green' as const),
  },
  {
    label: '重复影像',
    value: duplicateAttentionTotal.value,
    unit: '条',
    tone: duplicateAttentionTotal.value > 0 ? ('purple' as const) : ('green' as const),
  },
  {
    label: '连接状态',
    value: connectionLabel.value,
    tone: connectionTone.value,
  },
])

function resetFilter(): void {
  filterForm.attentionType = ''
  filterForm.scanBatchId = ''
  filterForm.paperInstanceId = ''
  reloadAttentionsFromFirstPage()
}

/**
 * 教师把扫描页（QUALITY_BLOCK / PROCESSING_BLOCK 等异常 SCANNED_PAGE）显式废弃。
 *
 * <p>仅对 sourceType === 'SCANNED_PAGE' 且持有 pageId 的记录可用；后端会校验：
 *   - SUPERSEDED 页拒绝再次废弃；DISCARDED 页幂等返回；
 *   - 所属批次已 sealed 时拒绝；
 *   - 影响仅限当前扫描页 effective_status，不联动批次状态。</p>
 */
const pageDiscarding = ref<string | null>(null)
const pageDiscardModalOpen = ref(false)
const pageDiscardTarget = ref<ScanAttentionItemVO | null>(null)
const pageDiscardReason = ref('')
const pageDiscardReasonError = ref('')
const pageDiscardError = ref('')
async function onDiscardPage(record: ScanAttentionItemVO): Promise<void> {
  if (record.sourceType !== 'SCANNED_PAGE' || !record.pageId) {
    message.warning('该异常不是扫描页来源，无法废弃')
    return
  }
  pageDiscardTarget.value = record
  pageDiscardReason.value = ''
  pageDiscardReasonError.value = ''
  pageDiscardError.value = ''
  pageDiscardModalOpen.value = true
}

function closePageDiscardModal(): void {
  if (pageDiscarding.value) return
  pageDiscardModalOpen.value = false
  pageDiscardTarget.value = null
  pageDiscardReason.value = ''
  pageDiscardReasonError.value = ''
  pageDiscardError.value = ''
}

async function confirmDiscardPage(): Promise<void> {
  const record = pageDiscardTarget.value
  if (!record?.pageId) {
    closePageDiscardModal()
    return
  }
  const trimmed = pageDiscardReason.value.trim()
  if (!trimmed) {
    pageDiscardReasonError.value = '废弃原因不能为空'
    return
  }
  if (trimmed.length > 255) {
    pageDiscardReasonError.value = '废弃原因长度不能超过 255 字'
    return
  }
  pageDiscardReasonError.value = ''
  pageDiscardError.value = ''
  pageDiscarding.value = record.pageId
  try {
    await discardScannedPage({ scannedPageId: record.pageId, discardReason: trimmed })
    message.success('扫描页已废弃')
    pageDiscardModalOpen.value = false
    pageDiscardTarget.value = null
    pageDiscardReason.value = ''
    await loadAttentions()
  } catch (error) {
    pageDiscardError.value = getUserErrorMessage(error, '扫描页废弃失败')
    showUserError(error, '扫描页废弃失败')
  } finally {
    pageDiscarding.value = null
  }
}

// ─── 身份绑定弹窗 ────────────────────────────────
const bindDrawerOpen = ref(false)
const binding = ref(false)
const bindFormRef = ref<FormInstance>()
const bindForm = reactive<{
  scanBatchId: string
  scanBatchDisplayName: string
  paperInstanceId: string
  paperDisplayName: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId?: string
  attemptStatus: string
  attemptNo?: string
}>({
  scanBatchId: '',
  scanBatchDisplayName: '',
  paperInstanceId: '',
  paperDisplayName: '',
  recognizedStudentNo: '',
  confirmedCandidateRosterId: undefined,
  attemptStatus: '',
  attemptNo: '',
})

const bindFormRules: Record<string, Rule[]> = {
  confirmedCandidateRosterId: [
    { required: true, message: '请从名册中选择正确考生', trigger: 'change' },
  ],
  attemptStatus: [{ required: true, message: '请选择答卷状态', trigger: 'change' }],
  recognizedStudentNo: [{ max: 64, message: '学号最多 64 个字符', trigger: 'blur' }],
}

// 考生名册缓存
const candidates = ref<ExamCandidateVO[]>([])
const candidatesLoading = ref(false)
const candidatesLoadError = ref<Error | null>(null)
const bindSubmitError = ref('')
const bindIdentitySliceFileId = ref('')
const bindIdentitySliceImageUrl = ref('')
const bindIdentitySliceLoading = ref(false)
const bindIdentitySliceError = ref<Error | null>(null)
const bindSourcePageFileId = ref('')
const bindSourcePageImageUrl = ref('')
const bindSourcePageLoading = ref(false)
const bindSourcePageError = ref<Error | null>(null)

const bindIdentityEvidenceBlockReason = computed(() => {
  if (!bindDrawerOpen.value) return ''
  if (!bindIdentitySliceFileId.value) return '当前异常没有身份切片文件，不能提交身份绑定；请先回到扫描识别链路补齐身份区证据。'
  if (bindIdentitySliceLoading.value) return '手写身份切片仍在加载，确认可见后才能提交身份绑定。'
  if (bindIdentitySliceError.value) return '手写身份切片加载失败，修复或重试成功后才能提交身份绑定。'
  if (!bindIdentitySliceImageUrl.value) return '手写身份切片尚未显示，不能提交身份绑定。'
  if (!bindSourcePageFileId.value) return '当前异常缺少原始扫描页文件引用，请检查扫描页登记链路后再绑定。'
  if (bindSourcePageLoading.value) return '原始扫描页仍在加载，确认可见后才能提交身份绑定。'
  if (bindSourcePageError.value) return '原始扫描页加载失败，修复或重试成功后才能提交身份绑定。'
  if (!bindSourcePageImageUrl.value) return '原始扫描页尚未显示，不能提交身份绑定。'
  return ''
})

const candidateOptions = computed(() =>
  candidates.value.map((item) => ({
    value: item.candidateRosterId,
    label: `${item.studentName}（${item.studentNo}）· ${candidateStatusLabel(item.status)}`,
    disabled: !isCandidateBindable(item),
  })),
)

/** 判断名册考生是否允许用于答卷身份绑定，缺考和状态异常必须在教师提交前阻断。 */
function isCandidateBindable(candidate: ExamCandidateVO): boolean {
  return candidate.status === 'ACTIVE'
}

/** 输出名册状态文案，状态缺失或未知时显式暴露合同异常而不是默认按正常处理。 */
function candidateStatusLabel(status: CandidateStatusCode | undefined): string {
  if (!status || !CANDIDATE_STATUS_LABEL[status]) {
    return '状态异常'
  }
  return CANDIDATE_STATUS_LABEL[status]
}

function filterCandidate(input: string, option?: DefaultOptionType): boolean {
  const kw = input.trim().toLowerCase()
  if (!kw || !option) return true
  const candidate = candidates.value.find((item) => item.candidateRosterId === option.value)
  if (!candidate) return false
  return (
    (candidate.studentName ?? '').toLowerCase().includes(kw)
    || (candidate.studentNo ?? '').toLowerCase().includes(kw)
  )
}

/** 按名册绑定规则解析被教师选中的考生，不存在、缺考或状态异常时返回可展示的阻断原因。 */
function candidateBindingBlockReason(candidateRosterId: string | undefined): string {
  if (!candidateRosterId) {
    return '请从名册中选择正确考生'
  }
  const candidate = candidates.value.find((item) => item.candidateRosterId === candidateRosterId)
  if (!candidate) {
    return '所选考生不在当前考试名册中，请刷新名册后重试'
  }
  if (!isCandidateBindable(candidate)) {
    return `${candidate.studentName}（${candidate.studentNo}）当前状态为${candidateStatusLabel(candidate.status)}，不能绑定试卷`
  }
  return ''
}

async function ensureCandidatesLoaded(): Promise<boolean> {
  if (!selectedExamId.value) return false
  if (candidates.value.length > 0) {
    candidatesLoadError.value = null
    return true
  }
  candidatesLoading.value = true
  candidatesLoadError.value = null
  try {
    const result = await listExamCandidates(selectedExamId.value)
    candidates.value = readArrayResponse(result, '考生名册加载失败')
    return true
  } catch (error) {
    candidatesLoadError.value = toUserError(error, '考生名册加载失败')
    showUserError(error, '考生名册加载失败')
    return false
  } finally {
    candidatesLoading.value = false
  }
}

async function retryLoadCandidates(): Promise<void> {
  await ensureCandidatesLoaded()
}

function releaseBindIdentitySliceImage(): void {
  if (bindIdentitySliceImageUrl.value) {
    URL.revokeObjectURL(bindIdentitySliceImageUrl.value)
    bindIdentitySliceImageUrl.value = ''
  }
}

function releaseBindSourcePageImage(): void {
  if (bindSourcePageImageUrl.value) {
    URL.revokeObjectURL(bindSourcePageImageUrl.value)
    bindSourcePageImageUrl.value = ''
  }
}

async function loadBindIdentitySliceImage(): Promise<void> {
  releaseBindIdentitySliceImage()
  bindIdentitySliceError.value = null
  if (!bindIdentitySliceFileId.value) {
    return
  }
  bindIdentitySliceLoading.value = true
  try {
    bindIdentitySliceImageUrl.value = await getImageBlobUrl(bindIdentitySliceFileId.value)
  } catch (error) {
    bindIdentitySliceError.value = toUserError(error, '手写身份切片加载失败')
  } finally {
    bindIdentitySliceLoading.value = false
  }
}

async function loadBindSourcePageImage(): Promise<void> {
  releaseBindSourcePageImage()
  bindSourcePageError.value = null
  if (!bindSourcePageFileId.value) {
    return
  }
  bindSourcePageLoading.value = true
  try {
    bindSourcePageImageUrl.value = await getImageBlobUrl(bindSourcePageFileId.value)
  } catch (error) {
    bindSourcePageError.value = toUserError(error, '原始扫描页加载失败')
  } finally {
    bindSourcePageLoading.value = false
  }
}

function openBindDrawer(record: ScanAttentionItemVO): void {
  if (!record.paperInstanceId || !record.scanBatchId) {
    message.warning('该异常缺少答题卡或扫描批次信息，无法进行身份绑定')
    return
  }
  bindForm.scanBatchId = record.scanBatchId
  bindForm.scanBatchDisplayName = record.scanBatchDisplayName
  bindForm.paperInstanceId = record.paperInstanceId
  bindForm.paperDisplayName = record.paperDisplay.primaryText
  bindForm.recognizedStudentNo = record.studentNo?.trim() || ''
  bindForm.confirmedCandidateRosterId = undefined
  bindForm.attemptStatus = 'NORMAL'
  bindForm.attemptNo = ''
  bindSubmitError.value = ''
  bindIdentitySliceFileId.value = record.identitySliceFileId || ''
  bindSourcePageFileId.value = record.sourceScanPage?.fileId || ''
  bindDrawerOpen.value = true
  void loadBindIdentitySliceImage()
  void loadBindSourcePageImage()
  void ensureCandidatesLoaded()
}

function openLedger(): void {
  if (!selectedExamId.value) return
  void router.push({
    path: '/teacher/image-ledger',
    query: {
      examId: selectedExamId.value,
    },
  })
}

async function handleBind(): Promise<void> {
  if (!selectedExamId.value) return
  if (!bindFormRef.value) return
  if (bindIdentityEvidenceBlockReason.value) {
    bindSubmitError.value = bindIdentityEvidenceBlockReason.value
    message.warning(bindIdentityEvidenceBlockReason.value)
    return
  }
  try {
    await bindFormRef.value.validate()
  } catch {
    return
  }
  const attemptStatus = bindForm.attemptStatus.trim()
  const validAttemptStatus = parseBindAttemptStatus(attemptStatus)
  if (!validAttemptStatus) {
    message.error('答卷状态只能选择普通答卷、补考答卷或重考答卷')
    return
  }
  const candidateBlockReason = candidateBindingBlockReason(bindForm.confirmedCandidateRosterId)
  if (candidateBlockReason) {
    bindSubmitError.value = candidateBlockReason
    message.error(candidateBlockReason)
    return
  }
  binding.value = true
  bindSubmitError.value = ''
  try {
    await bindPaper({
      examId: selectedExamId.value,
      scanBatchId: bindForm.scanBatchId,
      paperInstanceId: bindForm.paperInstanceId,
      recognizedStudentNo: bindForm.recognizedStudentNo?.trim() || undefined,
      confirmedCandidateRosterId: bindForm.confirmedCandidateRosterId,
      attemptStatus: validAttemptStatus,
      attemptNo: bindForm.attemptNo?.trim() || undefined,
    })
    message.success('试卷身份绑定成功')
    bindDrawerOpen.value = false
    releaseBindIdentitySliceImage()
    releaseBindSourcePageImage()
    await loadAttentions()
  } catch (error) {
    bindSubmitError.value = getUserErrorMessage(error, '试卷身份绑定失败')
    showUserError(error, '试卷身份绑定失败')
  } finally {
    binding.value = false
  }
}

// ─── 详情弹窗 ────────────────────────────────────
const detailDrawerOpen = ref(false)
const detailRecord = ref<ScanAttentionItemVO | null>(null)

function openDetail(record: ScanAttentionItemVO): void {
  detailRecord.value = record
  detailDrawerOpen.value = true
}

// ─── 行选择与批量绑定 ─────────────────────────────
const selectedRowKeys = ref<string[]>([])
const batchBinding = ref(false)
const batchBindDrawerOpen = ref(false)
const batchBindError = ref('')
const batchBindResult = ref<ExamPaperBatchBindResultVO | null>(null)
type BatchBindAttemptStatus = 'NORMAL' | 'MAKEUP' | 'RETAKE'

const batchAttemptStatusOptions: Array<{ label: string, value: BatchBindAttemptStatus }> = [
  { label: '普通答卷', value: 'NORMAL' },
  { label: '补考答卷', value: 'MAKEUP' },
  { label: '重考答卷', value: 'RETAKE' },
]

function parseBindAttemptStatus(value: string): BatchBindAttemptStatus | null {
  if (value === 'NORMAL' || value === 'MAKEUP' || value === 'RETAKE') {
    return value
  }
  return null
}

/** 将扫描异常诊断转为教师可执行的处置提示，避免展示接口、字段或识别链路内部细节。 */
function scanAttentionDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    '扫描异常需要人工核对，请根据异常类型补充绑定或重新扫描',
  )
}

const batchBindRows = ref<
  Array<{
    attentionId: string
    scanBatchId: string
    scanBatchDisplayName: string
    paperInstanceId: string
    paperDisplayName: string
    recognizedStudentNo?: string
    confirmedCandidateRosterId?: string
    attemptStatus: BatchBindAttemptStatus
    attemptNo?: string
    diagnostic?: string
  }>
>([])

const batchBindFailedItems = computed(() =>
  batchBindResult.value ? batchBindResult.value.items.filter((item) => !item.success) : [],
)

const batchBindRowDisplayNameMap = computed(
  () => new Map(batchBindRows.value.map((item) => [item.paperInstanceId, item.paperDisplayName])),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  },
  getCheckboxProps: (record: ScanAttentionItemVO) => ({
    disabled:
      record.attentionType !== 'BINDING_CONFLICT'
      || !record.paperInstanceId
      || !record.scanBatchId,
  }),
}))

async function handleBatchBind(): Promise<void> {
  if (!selectedExamId.value) {
    message.error('请先选择考试')
    return
  }
  const selected = attentions.value.filter(
    (item) =>
      selectedRowKeys.value.includes(item.id)
      && item.attentionType === 'BINDING_CONFLICT'
      && item.paperInstanceId
      && item.scanBatchId,
  )
  if (selected.length === 0) {
    message.error('请选择可身份绑定的绑定冲突异常项')
    return
  }
  const scanBatchIds = new Set(selected.map((item) => item.scanBatchId))
  if (scanBatchIds.size !== 1) {
    message.error('批量绑定必须选择同一扫描批次内的试卷')
    return
  }
  const candidatesReady = await ensureCandidatesLoaded()
  if (!candidatesReady) {
    return
  }
  if (candidates.value.length === 0) {
    message.error('当前考试无考生名册，无法绑定')
    return
  }
  batchBindError.value = ''
  batchBindResult.value = null
  batchBindRows.value = selected.map((item) => ({
    attentionId: item.id,
    scanBatchId: item.scanBatchId!,
    scanBatchDisplayName: item.scanBatchDisplayName,
    paperInstanceId: item.paperInstanceId!,
    paperDisplayName: item.paperDisplay.primaryText,
    recognizedStudentNo: item.studentNo?.trim() || '',
    confirmedCandidateRosterId: undefined,
    attemptStatus: 'NORMAL',
    attemptNo: '',
    diagnostic: item.diagnostic,
  }))
  batchBindDrawerOpen.value = true
}

function closeBatchBindDrawer(): void {
  if (batchBinding.value) return
  batchBindDrawerOpen.value = false
  batchBindRows.value = []
  batchBindError.value = ''
  batchBindResult.value = null
}

async function submitBatchBind(): Promise<void> {
  if (!selectedExamId.value) {
    message.error('请先选择考试')
    return
  }
  if (batchBindRows.value.length === 0) {
    message.error('没有可提交的批量绑定项')
    return
  }
  const missing = batchBindRows.value.find((item) => !item.confirmedCandidateRosterId)
  if (missing) {
    message.error(`${missing.paperDisplayName} 尚未选择考生`)
    return
  }
  const blockedCandidateRow = batchBindRows.value.find(
    (item) => candidateBindingBlockReason(item.confirmedCandidateRosterId),
  )
  if (blockedCandidateRow) {
    const blockReason = candidateBindingBlockReason(blockedCandidateRow.confirmedCandidateRosterId)
    batchBindError.value = `${blockedCandidateRow.paperDisplayName}：${blockReason}`
    message.error(batchBindError.value)
    return
  }
  const invalidAttemptStatus = batchBindRows.value.find(
    (item) => !parseBindAttemptStatus(item.attemptStatus),
  )
  if (invalidAttemptStatus) {
    message.error(`${invalidAttemptStatus.paperDisplayName} 的作答状态无效`)
    return
  }
  const scanBatchIds = new Set(batchBindRows.value.map((item) => item.scanBatchId))
  if (scanBatchIds.size !== 1) {
    message.error('批量绑定必须选择同一扫描批次内的试卷')
    return
  }
  batchBinding.value = true
  batchBindError.value = ''
  batchBindResult.value = null
  try {
    const result = await batchBindPapers({
      examId: selectedExamId.value,
      scanBatchId: batchBindRows.value[0].scanBatchId,
      items: batchBindRows.value.map((item) => ({
        paperInstanceId: item.paperInstanceId,
        recognizedStudentNo: item.recognizedStudentNo?.trim() || undefined,
        confirmedCandidateRosterId: item.confirmedCandidateRosterId!,
        attemptStatus: parseBindAttemptStatus(item.attemptStatus)!,
        attemptNo: item.attemptNo?.trim() || undefined,
      })),
    })
    batchBindResult.value = result
    message.success(`批量绑定：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`)
    await loadAttentions()
    if (result.failureCount === 0) {
      selectedRowKeys.value = []
      batchBindRows.value = []
      batchBindDrawerOpen.value = false
    }
  } catch (error) {
    batchBindError.value = getUserErrorMessage(error, '批量绑定失败')
    showUserError(error, '批量绑定失败')
  } finally {
    batchBinding.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────
watch(selectedExamId, (value) => {
  // 切换考试需要重置名册缓存
  candidates.value = []
  scanBatches.value = []
  scanBatchKeyword.value = ''
  paperCandidates.value = []
  paperCandidateKeyword.value = ''
  attentions.value = []
  selectedRowKeys.value = []
  attentionPagination.current = 1
  attentionPagination.total = 0
  abnormalAttentionTotal.value = 0
  duplicateAttentionTotal.value = 0
  filterForm.attentionType = ''
  filterForm.scanBatchId = ''
  filterForm.paperInstanceId = ''
  candidatesLoadError.value = null
  bindSubmitError.value = ''
  bindIdentitySliceFileId.value = ''
  bindSourcePageFileId.value = ''
  releaseBindIdentitySliceImage()
  releaseBindSourcePageImage()
  bindIdentitySliceError.value = null
  bindSourcePageError.value = null
  batchBindError.value = ''
  batchBindResult.value = null
  liveDrawerOpen.value = false
  currentEvent.value = null
  if (value) {
    void loadScanBatches()
    void loadPaperCandidates()
    void loadAttentions()
    void refreshScanLive()
  } else {
    stopScanLive()
    attentions.value = []
  }
})

watch(activeTab, (value) => {
  attentionPagination.current = 1
  attentionPagination.total = 0
  selectedRowKeys.value = []
  attentions.value = []
  if (value !== 'abnormal') {
    filterForm.attentionType = ''
  }
  void loadAttentions()
})

watch(bindDrawerOpen, (open) => {
  if (!open) {
    bindIdentitySliceFileId.value = ''
    bindSourcePageFileId.value = ''
    bindIdentitySliceError.value = null
    bindSourcePageError.value = null
    releaseBindIdentitySliceImage()
    releaseBindSourcePageImage()
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadScanBatches()
    await loadPaperCandidates()
    await loadAttentions()
    await startScanLive()
  }
})

onBeforeUnmount(() => {
  stopScanLive()
  releaseBindIdentitySliceImage()
  releaseBindSourcePageImage()
})
</script>

<style lang="scss" scoped>
.scan-monitor {
  &__exam-select {
    width: 280px;
  }

  &__overview {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 16px;
    align-items: start;
  }

  &__stats {
    min-width: 0;
  }

  &__chart-card {
    min-width: 0;
  }

  &__health-card {
    min-width: 0;
  }

  &__health-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
  }

  &__tabs {
    margin-top: 16px;
  }

  &__normal-panel {
    min-height: 280px;
  }

  &__normal-empty {
    padding: 48px 0;
  }

  &__event-groups {
    display: grid;
    gap: 12px;
  }

  &__event-group {
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface, #fff);
  }

  &__event-group-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--dp-border, #e2e8f0);
  }

  &__event-group-title {
    margin: 0;
    color: var(--dp-text-primary, #0f172a);
    font-size: 14px;
    font-weight: 700;
  }

  &__event-group-meta {
    margin: 4px 0 0;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
  }

  &__event-list {
    display: grid;
  }

  &__event-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding: 12px 16px;
    border: 0;
    border-bottom: 1px solid var(--dp-border, #e2e8f0);
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  &__event-row:last-child {
    border-bottom: 0;
  }

  &__event-row:hover {
    background: var(--dp-surface-subtle, #f8fafc);
  }

  &__event-main,
  &__event-side {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__event-main {
    min-width: 0;
  }

  &__event-main b {
    overflow: hidden;
    color: var(--dp-text-primary, #0f172a);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__event-main small,
  &__event-side small {
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
  }

  &__event-side {
    align-items: flex-end;
    flex-shrink: 0;
  }

  @media (max-width: 900px) {
    &__overview {
      grid-template-columns: 1fr;
    }
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__filter-form {
    margin: 0;

    :deep(.ant-form-item) {
      margin-inline-end: 16px;
      margin-bottom: 8px;
    }
  }

  &__type-select {
    width: 240px;
    min-width: 240px;
  }

  &__filter-select {
    width: 320px;
    min-width: 320px;
  }

  &__filter-input {
    width: 200px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__source-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__diagnostic-text {
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--dp-text-primary, #0f172a);
  }

  &__bind-alert {
    margin-bottom: 16px;
  }

  &__identity-evidence {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
    padding: 16px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface-subtle, #f8fafc);
  }

  &__identity-evidence-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__identity-evidence-title {
    margin: 0;
    color: var(--dp-text-primary, #0f172a);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }

  &__identity-evidence-subtitle {
    margin: 4px 0 0;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
    line-height: 1.5;
  }

  &__identity-skeleton {
    padding: 8px 0;
  }

  &__identity-compare {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }

  &__identity-pane {
    min-width: 0;
  }

  &__identity-pane-title {
    margin-bottom: 8px;
    color: var(--dp-text-primary, #0f172a);
    font-size: 13px;
    font-weight: 700;
  }

  &__identity-image-wrap {
    overflow: hidden;
    min-height: 120px;
    max-height: 220px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 6px;
    background: var(--dp-surface, #fff);
  }

  &__identity-image {
    display: block;
    width: 100%;
    height: auto;
    max-height: 220px;
    object-fit: contain;
  }

  &__identity-empty {
    padding: 16px 0;
    background: var(--dp-surface, #fff);
    border: 1px dashed var(--dp-border, #e2e8f0);
    border-radius: 6px;
  }

  &__batch-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__batch-row {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) minmax(360px, 1.4fr);
    gap: 16px;
    padding: 12px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface, #fff);
  }

  &__batch-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__batch-diagnostic {
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
    line-height: 1.5;
    word-break: break-all;
  }

  &__batch-form {
    display: grid;
    grid-template-columns: minmax(140px, 0.8fr) minmax(220px, 1.2fr);
    gap: 12px;
    align-items: start;
  }

  &__batch-input,
  &__batch-candidate,
  &__batch-attempt-status,
  &__batch-attempt-no {
    width: 100%;
  }

  @media (max-width: 900px) {
    &__batch-row,
    &__batch-form,
    &__identity-compare {
      grid-template-columns: 1fr;
    }
  }
}
</style>
