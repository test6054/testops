<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">{{ detail?.volume.archiveNo }}</UiTag>
          <UiTag
            v-if="detail"
            :tone="volumeStatusTone(detail.volume.volumeStatus)"
            size="sm"
          >
            {{ volumeStatusLabel(detail.volume.volumeStatus) }}
          </UiTag>
          <UiTag
            v-if="detail"
            :tone="integrityStatusTone(detail.volume.integrityStatus)"
            size="sm"
          >
            {{ integrityStatusLabel(detail.volume.integrityStatus) }}
          </UiTag>
          <UiTag
            v-if="detail"
            :tone="sourceTypeTone(detail.volume.sourceType)"
            size="sm"
          >
            {{ sourceTypeLabel(detail.volume.sourceType) }}
          </UiTag>
          <UiTag
            v-if="detail"
            :tone="transferStatusTone(detail.volume.transferStatus)"
            size="sm"
          >
            {{ transferStatusLabel(detail.volume.transferStatus) }}
          </UiTag>
          <UiTag
            v-if="detail?.volume.appraisalStatus"
            :tone="appraisalStatusTone(detail.volume.appraisalStatus)"
            size="sm"
          >
            {{ appraisalStatusLabel(detail.volume.appraisalStatus) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goBack">返回列表</UiButton>
          <UiButton variant="outline" size="sm" :loading="checkingIntegrity" @click="runIntegrityCheck">
            完整性自检
          </UiButton>
          <UiButton
            v-if="canSubmitVolume"
            variant="primary"
            size="sm"
            :loading="submitting"
            @click="handleSubmit"
          >
            提交归档
          </UiButton>
          <UiButton
            v-if="canExportManifest"
            variant="outline"
            size="sm"
            :loading="exporting"
            @click="handleExport"
          >
            导出 manifest
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" />

    <UiErrorRetryPanel
      v-else-if="loadError"
      :description="loadError"
      @retry="loadDetail"
    />

    <template v-else-if="detail">
      <UiAlertStrip
        v-if="detail.volume.integrityStatus === 'UNKNOWN' || detail.volume.integrityStatus === 'FAILED'"
        tone="warning"
        title="请先执行完整性自检"
        description="完整性未通过前无法提交归档"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="detail.fourPropertyStale"
        tone="warning"
        title="四性结论已失效"
        description="材料或 OCR 变更后须重新执行四性检测"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="detail.hasBlockingRemediationForSubmit"
        tone="warning"
        title="整改任务阻断提交"
        description="存在进行中的整改任务，须完成整改并关闭任务后再提交归档"
        dense
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="detail.hasOpenRemediationTask"
        tone="info"
        title="迎评整改进行中"
        description="当前卷存在未关闭整改任务，可登记补正材料"
        dense
        class="archive-volume-detail__alert"
      />

      <div class="archive-volume-detail__head">
        <h1 class="archive-volume-detail__title">{{ detail.volume.archiveTitle }}</h1>
        <p class="archive-volume-detail__meta">
          {{ sourceTypeLabel(detail.volume.sourceType) }}
          <span v-if="detail.volume.teachingClassName"> · {{ detail.volume.teachingClassName }}</span>
          <span v-if="detail.volume.departmentName"> · {{ detail.volume.departmentName }}</span>
        </p>
      </div>

      <UiSectionTabs v-model="activeTab" :items="sectionTabs" compact>
        <section v-if="activeTab === 'materials'" class="archive-volume-detail__panel">
          <div v-if="canRegisterMaterial" class="archive-volume-detail__toolbar">
            <UiButton size="sm" @click="openUploadModal">登记材料</UiButton>
            <UiButton size="sm" variant="outline" @click="batchRegisterOpen = true">批量登记</UiButton>
            <UiButton size="sm" variant="outline" @click="courseSyncOpen = true">课程平台同步</UiButton>
            <UiButton size="sm" variant="outline" @click="openSharedRefModal">引用合用材料</UiButton>
          </div>
          <UiDataTable
            pagination-mode="none"
            :columns="materialColumns"
            :data-source="detail.materials"
            :show-pagination="false"
            flat
            row-key="materialId"
            size="middle"
            empty-description="暂无材料，请登记或等待系统自动聚合"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'materialType'">
                {{ materialTypeLabel(record.materialType) }}
              </template>
              <template v-else-if="column.key === 'submissionStatus'">
                <UiTag
                  v-if="record.submissionStatus"
                  :tone="submissionStatusTone(record.submissionStatus)"
                  size="sm"
                >
                  {{ submissionStatusLabel(record.submissionStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'ocrStatus'">
                <UiTag
                  v-if="record.ocrStatus"
                  :tone="materialOcrStatusTone(record.ocrStatus)"
                  size="sm"
                >
                  {{ materialOcrStatusLabel(record.ocrStatus) }}
                </UiTag>
                <span
                  v-if="record.ocrStatus === 'FAILED' && record.ocrFailureReason"
                  class="archive-volume-detail__ocr-failure"
                >
                  {{ record.ocrFailureReason }}
                </span>
              </template>
              <template v-else-if="column.key === 'materialActions'">
                <UiTextAction
                  v-if="canRetryMaterialOcr(record)"
                  tone="primary"
                  @click="confirmRetryMaterialOcr(record)"
                >
                  重试 OCR
                </UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </section>

        <section v-else-if="activeTab === 'integrity'" class="archive-volume-detail__panel">
          <UiButton size="sm" :loading="checkingIntegrity" @click="runIntegrityCheck">
            完整性自检
          </UiButton>
          <UiButton size="sm" :loading="checkingFourProperty" @click="runFourPropertyCheck">
            四性检测
          </UiButton>
          <UiButton
            v-if="canWaiveIntegrity"
            size="sm"
            variant="outline"
            :loading="waivingIntegrity"
            @click="openWaiveIntegrityModal"
          >
            授权完整性豁免
          </UiButton>
          <div v-if="displayedIntegrityResult" class="archive-volume-detail__integrity">
            <UiTag
              :tone="integrityStatusTone(displayedIntegrityResult.integrityStatus ?? detail.volume.integrityStatus)"
              size="sm"
            >
              {{ integrityStatusLabel(displayedIntegrityResult.integrityStatus ?? detail.volume.integrityStatus) }}
            </UiTag>
            <UiDataTable
              v-if="displayedIntegrityResult.missingItems?.length"
              pagination-mode="none"
              :columns="missingColumns"
              :data-source="displayedIntegrityResult.missingItems"
              :show-pagination="false"
              flat
              row-key="materialType"
              size="small"
              class="archive-volume-detail__missing-table"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'materialType'">
                  {{ materialTypeLabel(record.materialType) }}
                </template>
              </template>
            </UiDataTable>
          </div>
          <div v-if="displayedFourProperty" class="archive-volume-detail__four-property">
            <p>真实性：{{ displayedFourProperty.authenticityPassed ? '通过' : '未通过' }}</p>
            <p>可靠性：{{ displayedFourProperty.reliabilityPassed ? '通过' : '未通过' }}</p>
            <p>完整性：{{ displayedFourProperty.integrityPassed ? '通过' : '未通过' }}</p>
            <p>可用性：{{ displayedFourProperty.usabilityPassed ? '通过' : '未通过' }}</p>
            <p v-if="detail.fourPropertyStale" class="archive-volume-detail__stale-hint">结论已失效，请重新检测</p>
          </div>
        </section>

        <section v-else-if="activeTab === 'transfer'" class="archive-volume-detail__panel">
          <UiAlertStrip
            v-if="detail.volume.transferStatus === 'REJECTED' && detail.volume.volumeStatus === 'COLLECTING'"
            tone="info"
            title="移交已退回"
            description="请补正材料、重新执行完整性/四性检测后再提交归档"
            dense
            class="archive-volume-detail__alert"
          />
          <a-descriptions bordered size="small" :column="1">
            <a-descriptions-item label="移交状态">
              {{ transferStatusLabel(detail.volume.transferStatus) }}
            </a-descriptions-item>
            <a-descriptions-item label="成绩完成">
              {{ scoreCompletionLabel(detail.volume.scoreCompletionStatus) }}
            </a-descriptions-item>
          </a-descriptions>
          <div v-if="canReviewTransfer && detail.volume.transferStatus === 'PENDING_REVIEW'" class="archive-volume-detail__actions">
            <UiButton size="sm" :loading="approvingTransfer" @click="handleApproveTransfer">
              验收通过
            </UiButton>
            <UiButton
              v-if="canRejectTransfer"
              size="sm"
              variant="outline"
              @click="openRejectTransfer"
            >
              退回补正
            </UiButton>
          </div>
        </section>

        <section v-else-if="activeTab === 'access'" class="archive-volume-detail__panel">
          <UiButton v-if="canRequestAccess" size="sm" @click="openAccessRequest">申请查阅</UiButton>
          <UiDataTable
            pagination-mode="none"
            :columns="accessColumns"
            :data-source="accessRecords"
            :loading="accessLoading"
            :show-pagination="false"
            flat
            row-key="accessRecordId"
            size="middle"
            empty-description="暂无查阅记录"
            class="archive-volume-detail__access-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'accessStatus'">
                <UiTag :tone="accessStatusTone(record.accessStatus)" size="sm">
                  {{ accessStatusLabel(record.accessStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'approvedTime'">
                {{ formatDateTime(record.approvedTime) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTextAction
                  v-if="record.accessStatus === 'PENDING' && canApproveAccessRecord(record)"
                  tone="primary"
                  @click="handleApproveAccess(record.accessRecordId)"
                >
                  批准
                </UiTextAction>
                <UiTextAction
                  v-if="record.accessStatus === 'PENDING' && canApproveAccessRecord(record)"
                  @click="handleRejectAccess(record.accessRecordId)"
                >
                  驳回
                </UiTextAction>
                <UiTextAction
                  v-if="record.accessStatus === 'ACTIVE' && record.applicantUserId === currentUserId"
                  tone="primary"
                  @click="handleAccessDownload(record)"
                >
                  下载材料
                </UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </section>

        <section v-else-if="activeTab === 'scores'" class="archive-volume-detail__panel">
          <a-descriptions bordered size="small" :column="2" class="archive-volume-detail__lifecycle">
            <a-descriptions-item label="成绩完成">
              {{ scoreCompletionLabel(detail.volume.scoreCompletionStatus) }}
            </a-descriptions-item>
          </a-descriptions>
          <div v-if="canConfirmScoreCompletion" class="archive-volume-detail__toolbar">
            <UiButton size="sm" :loading="scoreConfirmSubmitting" @click="handleConfirmScoreCompletion">
              确认成绩完成
            </UiButton>
          </div>
          <UiDataTable
            pagination-mode="none"
            :columns="scoreMaterialColumns"
            :data-source="scoreMaterials"
            :show-pagination="false"
            flat
            row-key="materialId"
            size="middle"
            empty-description="暂无成绩证明材料"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'materialType'">
                {{ materialTypeLabel(record.materialType) }}
              </template>
              <template v-else-if="column.key === 'missingActions'">
                <UiTextAction
                  v-if="canAllowMaterialDelay"
                  tone="primary"
                  @click="openDelayAllowModal(record)"
                >
                  延迟补交
                </UiTextAction>
                <UiTextAction
                  v-if="canWaiveMaterialMissing"
                  @click="openWaiveMissingModal(record)"
                >
                  缺失豁免
                </UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </section>

        <section v-else-if="activeTab === 'appraisal'" class="archive-volume-detail__panel">
          <a-descriptions bordered size="small" :column="2" class="archive-volume-detail__lifecycle">
            <a-descriptions-item label="鉴定状态">
              <UiTag
                v-if="detail.volume.appraisalStatus"
                :tone="appraisalStatusTone(detail.volume.appraisalStatus)"
                size="sm"
              >
                {{ appraisalStatusLabel(detail.volume.appraisalStatus) }}
              </UiTag>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="销毁状态">
              <UiTag
                v-if="detail.volume.destructionStatus"
                :tone="destructionStatusTone(detail.volume.destructionStatus)"
                size="sm"
              >
                {{ destructionStatusLabel(detail.volume.destructionStatus) }}
              </UiTag>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="密级">
              {{ securityLevelLabel(detail.volume.securityLevel) }}
            </a-descriptions-item>
            <a-descriptions-item label="保管期限">
              <span v-if="detail.volume.permanentRetention">永久保管</span>
              <span v-else-if="detail.volume.retentionUntil">至 {{ detail.volume.retentionUntil }}</span>
              <span v-else-if="detail.volume.retentionYears">{{ detail.volume.retentionYears }} 年</span>
              <span v-else>—</span>
            </a-descriptions-item>
          </a-descriptions>

          <ol class="archive-volume-detail__steps">
            <li :class="{ done: appraisalStepDone('request') }">申请鉴定</li>
            <li :class="{ done: appraisalStepDone('approve') }">鉴定审批</li>
            <li :class="{ done: appraisalStepDone('opinion') }">记录鉴定决议</li>
            <li :class="{ done: destructionStepDone('request') }">申请销毁</li>
            <li :class="{ done: destructionStepDone('approve') }">销毁审批</li>
            <li :class="{ done: destructionStepDone('execute') }">执行销毁</li>
            <li :class="{ done: destructionStepDone('supervise') }">监销确认</li>
          </ol>

          <div class="archive-volume-detail__actions">
            <UiButton
              v-if="canRequestAppraisal"
              size="sm"
              variant="primary"
              @click="handleRequestAppraisal"
            >
              申请鉴定
            </UiButton>
            <UiButton v-if="canApproveAppraisal" size="sm" @click="handleApproveAppraisal">
              鉴定审批通过
            </UiButton>
            <UiButton v-if="canRejectAppraisal" size="sm" variant="outline" @click="openRejectAppraisal">
              鉴定驳回
            </UiButton>
            <UiButton v-if="canRecordAppraisalOpinion" size="sm" variant="outline" @click="openAppraisalOpinion">
              提交鉴定决议
            </UiButton>
            <UiButton v-if="canRequestDestruction" size="sm" variant="outline" @click="openDestructionRequest">
              申请销毁
            </UiButton>
            <UiButton v-if="canApproveDestructionAction" size="sm" @click="openDestructionApproval('APPROVED')">
              批准销毁
            </UiButton>
            <UiButton v-if="canApproveDestructionAction" size="sm" variant="outline" @click="openDestructionApproval('REJECTED')">
              驳回销毁
            </UiButton>
            <UiButton v-if="canExecuteDestruction" size="sm" @click="handleExecuteDestruction">
              执行销毁
            </UiButton>
            <UiButton v-if="canSuperviseDestruction" size="sm" variant="outline" @click="openSuperviseModal">
              监销确认
            </UiButton>
          </div>
        </section>

        <section v-else class="archive-volume-detail__panel">
          <UiDataTable
            pagination-mode="none"
            :columns="eventColumns"
            :data-source="detail.events"
            :show-pagination="false"
            flat
            row-key="eventId"
            size="middle"
            empty-description="暂无事件流水"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'eventType'">
                {{ eventTypeLabel(record.eventType) }}
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ formatDateTime(record.createTime) }}
              </template>
            </template>
          </UiDataTable>
        </section>
      </UiSectionTabs>
    </template>

    <a-modal
      v-model:open="uploadModalOpen"
      title="登记归档材料"
      :confirm-loading="uploading"
      ok-text="登记"
      cancel-text="取消"
      @ok="submitMaterial"
    >
      <a-form layout="vertical">
        <a-form-item label="材料类型" required>
          <a-select
            v-model:value="uploadForm.materialType"
            :options="materialTypeOptions"
            placeholder="选择材料类型"
          />
        </a-form-item>
        <a-form-item label="学号">
          <a-input v-model:value="uploadForm.studentNo" placeholder="学生试卷可填学号" />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input v-model:value="uploadForm.studentName" placeholder="学生姓名" />
        </a-form-item>
        <a-form-item label="重修/补考">
          <a-checkbox v-model:checked="uploadForm.retakeFlag">标记为重修或补考答卷</a-checkbox>
        </a-form-item>
        <a-form-item v-if="uploadForm.retakeFlag" label="补考轮次">
          <a-input v-model:value="uploadForm.makeupRound" placeholder="如 补考1" />
        </a-form-item>
        <a-form-item label="扫描文件" required>
          <a-upload :before-upload="onBeforeUpload" :max-count="1" @remove="onRemoveUpload">
            <UiButton size="sm">选择文件</UiButton>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="accessModalOpen"
      title="申请查阅"
      :confirm-loading="accessSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitAccessRequest"
    >
      <a-form layout="vertical">
        <a-form-item label="查阅原因" required>
          <a-textarea v-model:value="accessReason" :rows="3" placeholder="说明查阅用途" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectTransferOpen"
      title="移交退回"
      :confirm-loading="rejectingTransfer"
      ok-text="确认退回"
      cancel-text="取消"
      @ok="submitRejectTransfer"
    >
      <a-form layout="vertical">
        <a-form-item label="退回原因" required>
          <a-textarea v-model:value="rejectTransferReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="appraisalModalOpen"
      title="鉴定决议"
      :confirm-loading="appraisalSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitAppraisalOpinion"
    >
      <a-form layout="vertical">
        <a-form-item label="决议" required>
          <a-radio-group v-model:value="appraisalForm.decision">
            <a-radio value="RETAIN">继续保留</a-radio>
            <a-radio value="DESTROY">可销毁</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="appraisalForm.decision === 'RETAIN'" label="延长保管（年）">
          <a-input-number
            v-model:value="appraisalForm.retentionExtensionYears"
            :min="1"
            :disabled="appraisalForm.permanentRetention"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item v-if="appraisalForm.decision === 'RETAIN'">
          <a-checkbox v-model:checked="appraisalForm.permanentRetention">永久保管</a-checkbox>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="appraisalForm.remark" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="destructionModalOpen"
      title="申请销毁"
      :confirm-loading="destructionSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitDestructionRequest"
    >
      <a-form layout="vertical">
        <a-form-item label="销毁原因" required>
          <a-textarea v-model:value="destructionReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectAppraisalOpen"
      title="鉴定驳回"
      :confirm-loading="rejectAppraisalSubmitting"
      ok-text="确认驳回"
      cancel-text="取消"
      @ok="submitRejectAppraisal"
    >
      <a-form layout="vertical">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model:value="rejectAppraisalReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="destructionApprovalOpen"
      title="销毁审批"
      :confirm-loading="destructionApprovalSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitDestructionApproval"
    >
      <a-form layout="vertical">
        <a-form-item label="审批备注">
          <a-textarea v-model:value="destructionApprovalRemark" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="superviseModalOpen"
      title="监销确认"
      :confirm-loading="superviseSubmitting"
      ok-text="确认"
      cancel-text="取消"
      @ok="submitSupervise"
    >
      <a-form layout="vertical">
        <a-form-item label="见证人" required>
          <ArchiveDutyUserSelect v-model:value="superviseForm.witnessUserId" />
        </a-form-item>
        <a-form-item label="监销登记文件">
          <a-upload :before-upload="onBeforeSuperviseUpload" :max-count="1" @remove="onRemoveSuperviseUpload">
            <UiButton size="sm">选择文件</UiButton>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="sharedRefModalOpen"
      title="引用合用材料"
      :confirm-loading="sharedRefSubmitting"
      ok-text="保存引用"
      cancel-text="取消"
      @ok="submitSharedRef"
    >
      <a-form layout="vertical">
        <a-form-item label="引用类型" required>
          <a-select
            v-model:value="sharedRefForm.refType"
            :options="sharedRefTypeOptions"
            placeholder="选择引用类型"
          />
        </a-form-item>
        <a-form-item label="目标卷 ID" required>
          <a-input v-model:value="sharedRefForm.targetVolumeId" placeholder="合用材料所在归档卷 ID" />
        </a-form-item>
        <a-form-item label="目标材料 ID" required>
          <a-input v-model:value="sharedRefForm.targetMaterialId" placeholder="目标材料 ID" />
        </a-form-item>
        <a-form-item label="目录备注">
          <a-input v-model:value="sharedRefForm.catalogNote" placeholder="如 合用材料见××班级卷" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectAccessOpen"
      title="驳回查阅"
      :confirm-loading="rejectAccessSubmitting"
      ok-text="确认驳回"
      cancel-text="取消"
      @ok="submitRejectAccess"
    >
      <a-form layout="vertical">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model:value="rejectAccessComment" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <ArchiveVolumeBatchRegisterModal
      v-model:open="batchRegisterOpen"
      :volume-id="volumeId"
      @success="loadDetail"
    />
    <ArchiveVolumeCourseSyncModal
      v-model:open="courseSyncOpen"
      :volume-id="volumeId"
      @success="loadDetail"
    />

    <a-modal
      v-model:open="delayAllowOpen"
      title="登记延迟补交"
      :confirm-loading="delayAllowSubmitting"
      ok-text="保存"
      cancel-text="取消"
      @ok="submitDelayAllow"
    >
      <a-form layout="vertical">
        <a-form-item label="材料类型">
          {{ delayAllowTarget ? materialTypeLabel(delayAllowTarget.materialType) : '—' }}
        </a-form-item>
        <a-form-item label="补交截止" required>
          <a-date-picker
            v-model:value="delayAllowForm.deadline"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="责任人" required>
          <ArchiveDutyUserSelect v-model:value="delayAllowForm.responsibleUserId" />
        </a-form-item>
        <a-form-item label="缺失说明">
          <a-textarea v-model:value="delayAllowForm.missingReason" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="waiveMissingOpen"
      title="材料缺失豁免"
      :confirm-loading="waiveMissingSubmitting"
      ok-text="授权豁免"
      cancel-text="取消"
      @ok="submitWaiveMissing"
    >
      <a-form layout="vertical">
        <a-form-item label="材料类型">
          {{ waiveMissingTarget ? materialTypeLabel(waiveMissingTarget.materialType) : '—' }}
        </a-form-item>
        <a-form-item label="豁免原因" required>
          <a-textarea v-model:value="waiveMissingReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="waiveIntegrityOpen"
      title="卷完整性豁免"
      :confirm-loading="waivingIntegrity"
      ok-text="授权豁免"
      cancel-text="取消"
      @ok="submitWaiveIntegrity"
    >
      <a-form layout="vertical">
        <a-form-item label="豁免原因" required>
          <a-textarea v-model:value="waiveIntegrityReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveAccessStatusCode,
  ArchiveAppraisalStatusCode,
  ArchiveDestructionStatusCode,
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialSubmissionStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveSecurityLevelCode,
  ArchiveVolumeAccessRecordVO,
  ArchiveVolumeDetailVO,
  ArchiveVolumeEventTypeCode,
  ArchiveVolumeMaterialVO,
  type ArchiveMaterialOcrStatusCode,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadFile, downloadFile } from '@/apis/edu/file-management'
import {
  approveArchiveVolumeAccess,
  approveArchiveVolumeAppraisal,
  approveArchiveVolumeDestruction,
  approveArchiveVolumeTransfer,
  ARCHIVE_ACCESS_STATUS_LABEL,
  ARCHIVE_ACCESS_STATUS_TONE,
  ARCHIVE_APPRAISAL_STATUS_LABEL,
  ARCHIVE_APPRAISAL_STATUS_TONE,
  ARCHIVE_DESTRUCTION_STATUS_LABEL,
  ARCHIVE_DESTRUCTION_STATUS_TONE,
  ARCHIVE_INTEGRITY_STATUS_LABEL,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ARCHIVE_MATERIAL_SUBMISSION_STATUS_LABEL,
  ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE,
  ARCHIVE_MATERIAL_TYPE_LABEL,
  ARCHIVE_MATERIAL_OCR_STATUS_LABEL,
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  ARCHIVE_SCORE_COMPLETION_STATUS_LABEL,
  ARCHIVE_SECURITY_LEVEL_LABEL,
  ARCHIVE_TRANSFER_STATUS_LABEL,
  ARCHIVE_TRANSFER_STATUS_TONE,
  ARCHIVE_VOLUME_EVENT_TYPE_LABEL,
  ARCHIVE_VOLUME_SOURCE_TYPE_LABEL,
  ARCHIVE_VOLUME_SOURCE_TYPE_TONE,
  ARCHIVE_VOLUME_STATUS_LABEL,
  ARCHIVE_VOLUME_STATUS_TONE,
  checkArchiveVolumeFourProperty,
  checkArchiveVolumeIntegrity,
  allowArchiveMaterialDelay,
  waiveArchiveMaterialMissing,
  waiveArchiveVolumeIntegrity,
  confirmArchiveVolumeDestructionSupervision,
  confirmArchiveVolumeScoreCompletion,
  executeArchiveVolumeDestruction,
  exportArchiveVolume,
  getArchiveVolumeDetail,
  downloadArchiveAccessMaterial,
  listArchiveVolumeAccessRecords,
  recordArchiveVolumeAppraisalOpinion,
  registerArchiveVolumeMaterial,
  registerArchiveSharedMaterialRef,
  rejectArchiveVolumeAccess,
  rejectArchiveVolumeAppraisal,
  rejectArchiveVolumeTransfer,
  requestArchiveVolumeAccess,
  requestArchiveVolumeAppraisal,
  requestArchiveVolumeDestruction,
  submitArchiveVolume,
  triggerArchiveVolumeMaterialOcr,
} from '@/apis/mark/archive-volume'
import ArchiveDutyUserSelect from '@/components/mark/ArchiveDutyUserSelect.vue'
import ArchiveVolumeBatchRegisterModal from '@/views/teacher/archive-volume/archive-volume-batch-register-modal.vue'
import ArchiveVolumeCourseSyncModal from '@/views/teacher/archive-volume/archive-volume-course-sync-modal.vue'
import UiAlertStrip from '@/components/ui-guide/ui/AlertStrip.vue'
import UiErrorRetryPanel from '@/components/ui-guide/ui/ErrorRetryPanel.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { canSubmitArchiveVolumeDetail } from '@/composables/useArchiveVolumeSubmitGate'
import { useUserStore } from '@/stores/modules/user'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { formatDateTime } from '@/utils/format'
import { showUserError } from '@/utils/error-handler'
import { handleBlobDownload } from '@/utils/file-download'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeDetail' })

const route = useRoute()
const router = useRouter()
const volumeId = computed(() => String(route.params.volumeId ?? ''))
const userStore = useUserStore()
const {
  hasDuty,
  canApproveDestruction,
  canApproveAccessForVolume,
  canManageRemediationAsCoordinator,
  hasDutyForDepartment,
  canReviewTransfer,
  canRejectTransfer,
  loadGrants,
} = useArchiveDutyAccess()
const currentUserId = computed(() => String(userStore.userInfo?.userId ?? ''))

const loading = ref(true)
const loadError = ref('')
const detail = ref<ArchiveVolumeDetailVO | null>(null)
const activeTab = ref('materials')
const checkingIntegrity = ref(false)
const checkingFourProperty = ref(false)
const waivingIntegrity = ref(false)
const batchRegisterOpen = ref(false)
const courseSyncOpen = ref(false)
const delayAllowOpen = ref(false)
const delayAllowSubmitting = ref(false)
const waiveMissingOpen = ref(false)
const waiveMissingSubmitting = ref(false)
const waiveIntegrityOpen = ref(false)
const waiveIntegrityReason = ref('')
const waiveMissingReason = ref('')
const delayAllowTarget = ref<ArchiveIntegrityMissingItemVO | null>(null)
const waiveMissingTarget = ref<ArchiveIntegrityMissingItemVO | null>(null)
const delayAllowForm = reactive({
  deadline: undefined as string | undefined,
  responsibleUserId: undefined as string | undefined,
  missingReason: '',
})
const submitting = ref(false)
const exporting = ref(false)
const approvingTransfer = ref(false)
const rejectingTransfer = ref(false)
const accessLoading = ref(false)
const accessSubmitting = ref(false)
const appraisalSubmitting = ref(false)
const destructionSubmitting = ref(false)
const rejectAppraisalSubmitting = ref(false)
const destructionApprovalSubmitting = ref(false)
const rejectAccessOpen = ref(false)
const rejectAccessSubmitting = ref(false)
const rejectAccessComment = ref('')
const rejectAccessRecordId = ref('')
const superviseRegisterFile = ref<File | null>(null)
const superviseSubmitting = ref(false)
const uploading = ref(false)

const SCORE_MATERIAL_TYPES = new Set<ArchiveMaterialTypeCode>([
  'TRANSCRIPT',
  'ITEMIZED_SCORE',
  'COURSE_GRADING_BASIS',
  'GRADING_INSTRUCTION',
])

const integrityResult = ref<Awaited<ReturnType<typeof checkArchiveVolumeIntegrity>> | null>(null)
const fourPropertyResult = ref<Awaited<ReturnType<typeof checkArchiveVolumeFourProperty>> | null>(null)
const scoreConfirmSubmitting = ref(false)
const accessRecords = ref<ArchiveVolumeAccessRecordVO[]>([])

const uploadModalOpen = ref(false)
const sharedRefModalOpen = ref(false)
const sharedRefSubmitting = ref(false)
const accessModalOpen = ref(false)
const rejectTransferOpen = ref(false)
const appraisalModalOpen = ref(false)
const destructionModalOpen = ref(false)
const rejectAppraisalOpen = ref(false)
const destructionApprovalOpen = ref(false)
const superviseModalOpen = ref(false)

const uploadForm = reactive({
  materialType: undefined as ArchiveMaterialTypeCode | undefined,
  file: null as File | null,
  studentNo: '',
  studentName: '',
  retakeFlag: false,
  makeupRound: '',
})
const sharedRefForm = reactive({
  refType: 'MERGED_CLASS_SHARED' as 'UNIFIED_EXAM_PUBLIC' | 'MERGED_CLASS_SHARED',
  targetVolumeId: '',
  targetMaterialId: '',
  catalogNote: '',
})
const sharedRefTypeOptions = [
  { value: 'UNIFIED_EXAM_PUBLIC', label: '统考公用' },
  { value: 'MERGED_CLASS_SHARED', label: '合班合用' },
]
const accessReason = ref('')
const rejectTransferReason = ref('')
const rejectAppraisalReason = ref('')
const destructionReason = ref('')
const destructionApprovalRemark = ref('')
const destructionApprovalDecision = ref<'APPROVED' | 'REJECTED'>('APPROVED')
const appraisalForm = reactive({
  decision: 'RETAIN' as 'RETAIN' | 'DESTROY',
  retentionExtensionYears: undefined as number | undefined,
  permanentRetention: false,
  remark: '',
})
const superviseForm = reactive({
  witnessUserId: '',
  registerFileId: '',
})

const sectionTabs = [
  { key: 'materials', label: '材料目录' },
  { key: 'scores', label: '成绩证明' },
  { key: 'integrity', label: '完整性/四性' },
  { key: 'transfer', label: '移交验收' },
  { key: 'access', label: '查阅' },
  { key: 'appraisal', label: '鉴定销毁' },
  { key: 'events', label: '事件流水' },
]

const scoreMaterials = computed(() =>
  (detail.value?.materials ?? []).filter(item => SCORE_MATERIAL_TYPES.has(item.materialType)),
)

const displayedIntegrityResult = computed(() =>
  integrityResult.value ?? detail.value?.latestIntegrityCheck ?? null,
)

const displayedFourProperty = computed(() =>
  fourPropertyResult.value ?? detail.value?.latestFourPropertyCheck ?? null,
)

const canConfirmScoreCompletion = computed(() => {
  const vol = detail.value?.volume
  if (!vol) return false
  if (vol.volumeStatus !== 'DRAFT' && vol.volumeStatus !== 'COLLECTING') return false
  if (vol.responsibleUserId !== currentUserId.value) return false
  if (vol.scoreSource !== 'TEACHING_AFFAIRS' && vol.scoreSource !== 'OFFLINE_CONFIRMED') return false
  return vol.scoreCompletionStatus === 'PENDING'
})

const scoreMaterialColumns: ColumnsType<ArchiveVolumeMaterialVO> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
]

const materialTypeOptions = Object.entries(ARCHIVE_MATERIAL_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const materialColumns: ColumnsType<ArchiveVolumeMaterialVO> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '目录编码', dataIndex: 'catalogCode', width: 120 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '提交状态', key: 'submissionStatus', width: 120 },
  { title: 'OCR 状态', key: 'ocrStatus', width: 160 },
  { title: '操作', key: 'materialActions', width: 100 },
]

const missingColumns: ColumnsType<ArchiveIntegrityMissingItemVO> = [
  { title: '缺项材料', key: 'materialType' },
  { title: '目录', dataIndex: 'catalogName' },
  { title: '操作', key: 'missingActions', width: 180 },
]

const accessColumns: ColumnsType<ArchiveVolumeAccessRecordVO> = [
  { title: '状态', key: 'accessStatus', width: 100 },
  { title: '原因', dataIndex: 'accessReason' },
  { title: '批准时间', key: 'approvedTime', width: 160 },
  { title: '操作', key: 'actions', width: 120 },
]

const eventColumns: ColumnsType<ArchiveVolumeDetailVO['events'][number]> = [
  { title: '事件', key: 'eventType', width: 160 },
  { title: '说明', dataIndex: 'reason' },
  { title: '时间', key: 'createTime', width: 160 },
]

function volumeStatusLabel(code: ArchiveVolumeDetailVO['volume']['volumeStatus']) {
  return strictEnumLabel(ARCHIVE_VOLUME_STATUS_LABEL, code, 'volumeStatus')
}

function volumeStatusTone(code: ArchiveVolumeDetailVO['volume']['volumeStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveVolumeDetailVO['volume']['integrityStatus']) {
  return strictEnumLabel(ARCHIVE_INTEGRITY_STATUS_LABEL, code, 'integrityStatus')
}

function integrityStatusTone(code: ArchiveVolumeDetailVO['volume']['integrityStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_INTEGRITY_STATUS_TONE, code, 'integrityStatus')
}

function sourceTypeLabel(code: ArchiveVolumeDetailVO['volume']['sourceType']) {
  return strictEnumLabel(ARCHIVE_VOLUME_SOURCE_TYPE_LABEL, code, 'sourceType')
}

function sourceTypeTone(code: ArchiveVolumeDetailVO['volume']['sourceType']): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_SOURCE_TYPE_TONE, code, 'sourceType')
}

function transferStatusLabel(code: ArchiveVolumeDetailVO['volume']['transferStatus']) {
  return strictEnumLabel(ARCHIVE_TRANSFER_STATUS_LABEL, code, 'transferStatus')
}

function transferStatusTone(code: ArchiveVolumeDetailVO['volume']['transferStatus']): BadgeTone {
  return strictEnumTone(ARCHIVE_TRANSFER_STATUS_TONE, code, 'transferStatus')
}

function scoreCompletionLabel(code: ArchiveVolumeDetailVO['volume']['scoreCompletionStatus']) {
  return strictEnumLabel(ARCHIVE_SCORE_COMPLETION_STATUS_LABEL, code, 'scoreCompletionStatus')
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

function submissionStatusLabel(code: ArchiveMaterialSubmissionStatusCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_SUBMISSION_STATUS_LABEL, code, 'submissionStatus')
}

function submissionStatusTone(code: ArchiveMaterialSubmissionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE, code, 'submissionStatus')
}

function materialOcrStatusLabel(code: ArchiveMaterialOcrStatusCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_OCR_STATUS_LABEL, code, 'ocrStatus')
}

function materialOcrStatusTone(code: ArchiveMaterialOcrStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_MATERIAL_OCR_STATUS_TONE, code, 'ocrStatus')
}

function canRetryMaterialOcr(material: ArchiveVolumeMaterialVO): boolean {
  return material.ocrStatus === 'FAILED' && Boolean(material.fileId)
}

function confirmRetryMaterialOcr(material: ArchiveVolumeMaterialVO): void {
  void confirmAsync({
    title: '重试 OCR 识别？',
    content: `材料「${material.fileName ?? material.materialId}」将重新进入 OCR 队列。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      try {
        await triggerArchiveVolumeMaterialOcr(material.materialId)
        message.success('已入队，等待识别')
        await loadDetail()
      }
      catch (error) {
        showUserError(error, 'OCR 重试提交失败')
      }
    },
  })
}

let materialOcrPollTimer: ReturnType<typeof setInterval> | null = null

const shouldPollMaterialOcr = computed(() =>
  (detail.value?.materials ?? []).some(
    item => item.ocrStatus === 'PENDING' || item.ocrStatus === 'RUNNING',
  ),
)

watch(shouldPollMaterialOcr, (shouldPoll, wasPolling) => {
  if (shouldPoll && !materialOcrPollTimer) {
    materialOcrPollTimer = setInterval(() => {
      void loadDetail({ silent: true })
    }, 5000)
  }
  else if (!shouldPoll && materialOcrPollTimer) {
    clearInterval(materialOcrPollTimer)
    materialOcrPollTimer = null
  }
  if (wasPolling && !shouldPoll) {
    void (async () => {
      await loadDetail({ silent: true })
      if (detail.value?.fourPropertyStale) {
        message.info('OCR 已完成，请重新执行完整性/四性检测')
      }
    })()
  }
}, { immediate: true })

function canApproveAccessRecord(_record: ArchiveVolumeAccessRecordVO) {
  if (!detail.value) return false
  return canApproveAccessForVolume(detail.value.volume)
}

function accessStatusLabel(code: ArchiveAccessStatusCode) {
  return strictEnumLabel(ARCHIVE_ACCESS_STATUS_LABEL, code, 'accessStatus')
}

function accessStatusTone(code: ArchiveAccessStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_ACCESS_STATUS_TONE, code, 'accessStatus')
}

function eventTypeLabel(code?: ArchiveVolumeEventTypeCode) {
  if (!code) return '—'
  return strictEnumLabel(ARCHIVE_VOLUME_EVENT_TYPE_LABEL, code, 'eventType')
}

function appraisalStatusLabel(code: ArchiveAppraisalStatusCode) {
  return strictEnumLabel(ARCHIVE_APPRAISAL_STATUS_LABEL, code, 'appraisalStatus')
}

function appraisalStatusTone(code: ArchiveAppraisalStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_APPRAISAL_STATUS_TONE, code, 'appraisalStatus')
}

function destructionStatusLabel(code: ArchiveDestructionStatusCode) {
  return strictEnumLabel(ARCHIVE_DESTRUCTION_STATUS_LABEL, code, 'destructionStatus')
}

function destructionStatusTone(code: ArchiveDestructionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_DESTRUCTION_STATUS_TONE, code, 'destructionStatus')
}

function securityLevelLabel(code?: ArchiveSecurityLevelCode) {
  if (!code) return '—'
  return strictEnumLabel(ARCHIVE_SECURITY_LEVEL_LABEL, code, 'securityLevel')
}

const canManageAppraisal = computed(() => detail.value?.canManageAppraisal === true)

const canSubmitVolume = computed(() =>
  detail.value ? canSubmitArchiveVolumeDetail(detail.value, currentUserId.value) : false,
)

const canExportManifest = computed(() => {
  const status = detail.value?.volume.volumeStatus
  return status === 'SUBMITTED' || status === 'STORED'
})

const canRegisterMaterial = computed(() => {
  const d = detail.value
  if (!d?.canManageMaterials) return false
  if (d.hasOpenRemediationTask) return true
  const status = d.volume.volumeStatus
  return status === 'DRAFT' || status === 'COLLECTING'
})

const canAllowMaterialDelay = computed(() => {
  const d = detail.value
  if (!d) return false
  return canManageRemediationAsCoordinator(d.volume)
})

const canWaiveMaterialMissing = computed(() => {
  const d = detail.value
  if (!d) return false
  return hasDutyForDepartment('ARCHIVE_ADMIN', d.volume.departmentId)
})

const canWaiveIntegrity = computed(() => {
  const d = detail.value
  if (!d) return false
  if (d.volume.integrityStatus === 'WAIVED') return false
  const status = d.volume.volumeStatus
  if (status !== 'DRAFT' && status !== 'COLLECTING') return false
  return hasDutyForDepartment('ARCHIVE_ADMIN', d.volume.departmentId)
})

const canRequestAccess = computed(() => detail.value?.volume.volumeStatus === 'STORED')

const canRequestAppraisal = computed(() => {
  const status = detail.value?.volume.appraisalStatus
  return canManageAppraisal.value && (
    status === 'NOT_DUE' || status === 'REMINDER_SENT' || status === 'REJECTED'
  )
})

const canApproveAppraisal = computed(() =>
  canManageAppraisal.value && detail.value?.volume.appraisalStatus === 'REQUESTED',
)

const canRejectAppraisal = computed(() => canApproveAppraisal.value)

const canRecordAppraisalOpinion = computed(() =>
  canManageAppraisal.value && detail.value?.volume.appraisalStatus === 'APPROVED',
)

const canRequestDestruction = computed(() =>
  canManageAppraisal.value
  && detail.value?.volume.appraisalStatus === 'OPINION_RECORDED'
  && (detail.value?.volume.destructionStatus === 'NONE'
    || detail.value?.volume.destructionStatus === 'FAILED'),
)

const canApproveDestructionAction = computed(() =>
  canApproveDestruction.value && detail.value?.volume.destructionStatus === 'REQUESTED',
)

const canExecuteDestruction = computed(() =>
  canApproveDestruction.value
  && detail.value?.volume.volumeStatus === 'STORED'
  && detail.value?.volume.destructionStatus === 'APPROVED',
)

const canSuperviseDestruction = computed(() =>
  canApproveDestruction.value && detail.value?.volume.destructionStatus === 'EXECUTED',
)

function appraisalStepDone(step: 'request' | 'approve' | 'opinion') {
  const status = detail.value?.volume.appraisalStatus
  if (!status) return false
  if (step === 'request') {
    return status !== 'NOT_DUE'
  }
  if (step === 'approve') {
    return status === 'APPROVED' || status === 'OPINION_RECORDED'
  }
  return status === 'OPINION_RECORDED'
}

function destructionStepDone(step: 'request' | 'approve' | 'execute' | 'supervise') {
  const status = detail.value?.volume.destructionStatus
  if (!status || status === 'NONE') return false
  if (step === 'request') {
    return status !== 'NONE'
  }
  if (step === 'approve') {
    return status === 'APPROVED' || status === 'EXECUTING' || status === 'EXECUTED'
      || status === 'SUPERVISED' || status === 'LEDGER_ARCHIVED' || status === 'FAILED'
  }
  if (step === 'execute') {
    return status === 'EXECUTING' || status === 'EXECUTED' || status === 'SUPERVISED'
      || status === 'LEDGER_ARCHIVED'
  }
  return status === 'LEDGER_ARCHIVED' || status === 'SUPERVISED'
}

async function loadDetail(options?: { silent?: boolean }) {
  if (!volumeId.value) {
    loadError.value = '缺少归档卷 ID'
    loading.value = false
    return
  }
  if (!options?.silent) {
    loading.value = true
  }
  loadError.value = ''
  try {
    detail.value = await getArchiveVolumeDetail(volumeId.value)
    fourPropertyResult.value = detail.value.latestFourPropertyCheck ?? null
    integrityResult.value = detail.value.latestIntegrityCheck ?? null
    await loadAccessRecords()
  }
  catch (error) {
    if (!options?.silent) {
      loadError.value = error instanceof Error ? error.message : '加载归档卷详情失败'
      detail.value = null
    }
  }
  finally {
    if (!options?.silent) {
      loading.value = false
    }
  }
}

async function handleConfirmScoreCompletion() {
  if (!volumeId.value) return
  scoreConfirmSubmitting.value = true
  try {
    await confirmArchiveVolumeScoreCompletion({
      volumeId: volumeId.value,
      scoreCompletionStatus: 'COMPLETED',
    })
    message.success('成绩完成状态已确认')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    scoreConfirmSubmitting.value = false
  }
}

async function loadAccessRecords() {
  if (!volumeId.value) return
  accessLoading.value = true
  try {
    accessRecords.value = await listArchiveVolumeAccessRecords(volumeId.value)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    accessLoading.value = false
  }
}

async function runIntegrityCheck() {
  checkingIntegrity.value = true
  try {
    integrityResult.value = await checkArchiveVolumeIntegrity(volumeId.value)
    message.success('完整性检查完成')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    checkingIntegrity.value = false
  }
}

async function runFourPropertyCheck() {
  checkingFourProperty.value = true
  try {
    fourPropertyResult.value = await checkArchiveVolumeFourProperty(volumeId.value)
    message.success('四性检测完成')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    checkingFourProperty.value = false
  }
}

function openDelayAllowModal(item: ArchiveIntegrityMissingItemVO) {
  delayAllowTarget.value = item
  delayAllowForm.deadline = undefined
  delayAllowForm.responsibleUserId = detail.value?.volume.responsibleUserId
  delayAllowForm.missingReason = ''
  delayAllowOpen.value = true
}

async function submitDelayAllow() {
  if (!delayAllowTarget.value || !volumeId.value) return
  if (!delayAllowForm.deadline) {
    message.warning('请选择补交截止时间')
    return
  }
  if (!delayAllowForm.responsibleUserId) {
    message.warning('请选择延迟补交责任人')
    return
  }
  delayAllowSubmitting.value = true
  try {
    await allowArchiveMaterialDelay({
      volumeId: volumeId.value,
      materialType: delayAllowTarget.value.materialType,
      catalogCode: delayAllowTarget.value.catalogCode,
      delayAllowedTime: delayAllowForm.deadline,
      delayResponsibleUserId: delayAllowForm.responsibleUserId,
      missingReason: delayAllowForm.missingReason.trim() || undefined,
    })
    message.success('已登记延迟补交')
    delayAllowOpen.value = false
    await loadDetail()
    integrityResult.value = await checkArchiveVolumeIntegrity(volumeId.value)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    delayAllowSubmitting.value = false
  }
}

function openWaiveMissingModal(item: ArchiveIntegrityMissingItemVO) {
  waiveMissingTarget.value = item
  waiveMissingReason.value = ''
  waiveMissingOpen.value = true
}

async function submitWaiveMissing() {
  if (!waiveMissingTarget.value || !volumeId.value) return
  if (!waiveMissingReason.value.trim()) {
    message.warning('请填写豁免原因')
    return
  }
  waiveMissingSubmitting.value = true
  try {
    await waiveArchiveMaterialMissing({
      volumeId: volumeId.value,
      materialType: waiveMissingTarget.value.materialType,
      catalogCode: waiveMissingTarget.value.catalogCode,
      reason: waiveMissingReason.value.trim(),
    })
    message.success('已授权材料缺失豁免')
    waiveMissingOpen.value = false
    await loadDetail()
    integrityResult.value = await checkArchiveVolumeIntegrity(volumeId.value)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    waiveMissingSubmitting.value = false
  }
}

function openWaiveIntegrityModal() {
  waiveIntegrityReason.value = ''
  waiveIntegrityOpen.value = true
}

async function submitWaiveIntegrity() {
  if (!volumeId.value) return
  if (!waiveIntegrityReason.value.trim()) {
    message.warning('请填写豁免原因')
    return
  }
  waivingIntegrity.value = true
  try {
    await waiveArchiveVolumeIntegrity({
      volumeId: volumeId.value,
      reason: waiveIntegrityReason.value.trim(),
    })
    message.success('已授权完整性豁免')
    waiveIntegrityOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    waivingIntegrity.value = false
  }
}

async function handleSubmit() {
  submitting.value = true
  try {
    await submitArchiveVolume({ volumeId: volumeId.value })
    message.success('已提交归档')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    submitting.value = false
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const result = await exportArchiveVolume(volumeId.value)
    if (!result.exportFileId) {
      message.error('导出未返回文件 ID')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    message.success(`导出完成，材料 ${result.materialCount ?? 0} 项`)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    exporting.value = false
  }
}

async function handleAccessDownload(record: ArchiveVolumeAccessRecordVO) {
  if (!record.materialId) {
    message.error('查阅记录未绑定材料，无法下载')
    return
  }
  if (!record.downloadToken) {
    message.error('查阅记录缺少下载令牌，请重新申请或联系审批人')
    return
  }
  await handleBlobDownload(
    () => downloadArchiveAccessMaterial({
      accessRecordId: record.accessRecordId,
      materialId: record.materialId,
      downloadToken: record.downloadToken,
    }),
    'archive-access-material',
    { showSuccessMessage: true, successMessage: '材料下载已开始' },
  )
}

async function handleApproveTransfer() {
  approvingTransfer.value = true
  try {
    await approveArchiveVolumeTransfer({ volumeId: volumeId.value })
    message.success('移交验收通过')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    approvingTransfer.value = false
  }
}

function openRejectTransfer() {
  rejectTransferReason.value = ''
  rejectTransferOpen.value = true
}

async function submitRejectTransfer() {
  if (!rejectTransferReason.value.trim()) {
    message.warning('请填写退回原因')
    return
  }
  rejectingTransfer.value = true
  try {
    await rejectArchiveVolumeTransfer({
      volumeId: volumeId.value,
      rejectReason: rejectTransferReason.value.trim(),
    })
    message.success('已退回补正')
    rejectTransferOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    rejectingTransfer.value = false
  }
}

function openUploadModal() {
  uploadForm.materialType = undefined
  uploadForm.file = null
  uploadForm.studentNo = ''
  uploadForm.studentName = ''
  uploadForm.retakeFlag = false
  uploadForm.makeupRound = ''
  uploadModalOpen.value = true
}

function openSharedRefModal() {
  sharedRefForm.refType = 'MERGED_CLASS_SHARED'
  sharedRefForm.targetVolumeId = ''
  sharedRefForm.targetMaterialId = ''
  sharedRefForm.catalogNote = ''
  sharedRefModalOpen.value = true
}

async function submitSharedRef() {
  if (!sharedRefForm.targetVolumeId.trim() || !sharedRefForm.targetMaterialId.trim()) {
    message.warning('请填写目标卷与材料 ID')
    return
  }
  sharedRefSubmitting.value = true
  try {
    await registerArchiveSharedMaterialRef({
      volumeId: volumeId.value,
      refType: sharedRefForm.refType,
      targetVolumeId: sharedRefForm.targetVolumeId.trim(),
      targetMaterialId: sharedRefForm.targetMaterialId.trim(),
      catalogNote: sharedRefForm.catalogNote.trim() || undefined,
    })
    message.success('合用材料引用已保存')
    sharedRefModalOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    sharedRefSubmitting.value = false
  }
}

function onBeforeUpload(file: File) {
  uploadForm.file = file
  return false
}

function onRemoveUpload() {
  uploadForm.file = null
  return true
}

async function submitMaterial() {
  if (!uploadForm.materialType || !uploadForm.file) {
    message.warning('请选择材料类型和文件')
    return
  }
  uploading.value = true
  try {
    const node = await uploadFile(uploadForm.file, { businessType: 'archive-volume-material' })
    if (!node?.id) {
      message.error('文件上传失败')
      return
    }
    const ext = uploadForm.file.name.includes('.')
      ? uploadForm.file.name.split('.').pop() ?? 'bin'
      : 'bin'
    await registerArchiveVolumeMaterial({
      volumeId: volumeId.value,
      materialType: uploadForm.materialType,
      fileId: String(node.id),
      mediaType: 'ELECTRONIC',
      fileFormat: ext,
      sortRule: uploadForm.retakeFlag ? 'STUDENT_NO' : 'CATALOG_ORDER',
      electronicOriginalStatus: 'SCANNED',
      studentNo: uploadForm.studentNo.trim() || undefined,
      studentName: uploadForm.studentName.trim() || undefined,
      retakeFlag: uploadForm.retakeFlag || undefined,
      makeupRound: uploadForm.makeupRound.trim() || undefined,
      triggerOcr: true,
    })
    message.success('材料登记成功')
    uploadModalOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    uploading.value = false
  }
}

function openAccessRequest() {
  accessReason.value = ''
  accessModalOpen.value = true
}

async function submitAccessRequest() {
  if (!accessReason.value.trim()) {
    message.warning('请填写查阅原因')
    return
  }
  accessSubmitting.value = true
  try {
    await requestArchiveVolumeAccess({
      volumeId: volumeId.value,
      accessReason: accessReason.value.trim(),
    })
    message.success('查阅申请已提交')
    accessModalOpen.value = false
    await loadAccessRecords()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    accessSubmitting.value = false
  }
}

async function handleApproveAccess(accessRecordId: string) {
  try {
    await approveArchiveVolumeAccess({ accessRecordId })
    message.success('已批准查阅')
    await loadAccessRecords()
  }
  catch (error) {
    showUserError(error)
  }
}

async function handleRejectAccess(accessRecordId: string) {
  rejectAccessRecordId.value = accessRecordId
  rejectAccessComment.value = ''
  rejectAccessOpen.value = true
}

async function submitRejectAccess() {
  if (!rejectAccessComment.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  rejectAccessSubmitting.value = true
  try {
    await rejectArchiveVolumeAccess({
      accessRecordId: rejectAccessRecordId.value,
      decisionComment: rejectAccessComment.value.trim(),
    })
    message.success('已驳回查阅')
    rejectAccessOpen.value = false
    await loadAccessRecords()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    rejectAccessSubmitting.value = false
  }
}

async function handleApproveAppraisal() {
  try {
    await approveArchiveVolumeAppraisal(volumeId.value)
    message.success('鉴定审批通过')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
}

function openRejectAppraisal() {
  rejectAppraisalReason.value = ''
  rejectAppraisalOpen.value = true
}

async function submitRejectAppraisal() {
  if (!rejectAppraisalReason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  rejectAppraisalSubmitting.value = true
  try {
    await rejectArchiveVolumeAppraisal({
      volumeId: volumeId.value,
      rejectReason: rejectAppraisalReason.value.trim(),
    })
    message.success('鉴定已驳回')
    rejectAppraisalOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    rejectAppraisalSubmitting.value = false
  }
}

function openDestructionApproval(decision: 'APPROVED' | 'REJECTED') {
  destructionApprovalDecision.value = decision
  destructionApprovalRemark.value = ''
  destructionApprovalOpen.value = true
}

async function submitDestructionApproval() {
  destructionApprovalSubmitting.value = true
  try {
    await approveArchiveVolumeDestruction({
      volumeId: volumeId.value,
      decision: destructionApprovalDecision.value,
      remark: destructionApprovalRemark.value.trim() || undefined,
    })
    message.success('销毁审批已提交')
    destructionApprovalOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    destructionApprovalSubmitting.value = false
  }
}

async function handleExecuteDestruction() {
  const confirmed = await confirmAsync({
    title: '确认执行销毁？',
    content: '销毁执行后不可撤销，请确认已完成审批与备份。',
    type: 'error',
    okText: '执行销毁',
  })
  if (!confirmed) return
  try {
    await executeArchiveVolumeDestruction(volumeId.value)
    message.success('销毁执行已发起')
    await loadDetail()
    startDestructionPollIfNeeded()
  }
  catch (error) {
    showUserError(error)
  }
}

let destructionPollTimer: ReturnType<typeof setInterval> | null = null

const shouldPollDestruction = computed(() =>
  detail.value?.volume.destructionStatus === 'EXECUTING',
)

watch(shouldPollDestruction, (shouldPoll) => {
  if (shouldPoll && !destructionPollTimer) {
    destructionPollTimer = setInterval(() => {
      void loadDetail({ silent: true })
    }, 5000)
  }
  else if (!shouldPoll && destructionPollTimer) {
    clearInterval(destructionPollTimer)
    destructionPollTimer = null
  }
}, { immediate: true })

function startDestructionPollIfNeeded() {
  if (shouldPollDestruction.value && !destructionPollTimer) {
    destructionPollTimer = setInterval(() => {
      void loadDetail({ silent: true })
    }, 5000)
  }
}

function openSuperviseModal() {
  superviseForm.witnessUserId = ''
  superviseForm.registerFileId = ''
  superviseRegisterFile.value = null
  superviseModalOpen.value = true
}

function onBeforeSuperviseUpload(file: File) {
  superviseRegisterFile.value = file
  return false
}

function onRemoveSuperviseUpload() {
  superviseRegisterFile.value = null
  superviseForm.registerFileId = ''
  return true
}

async function submitSupervise() {
  if (!superviseForm.witnessUserId.trim()) {
    message.warning('请选择见证人')
    return
  }
  superviseSubmitting.value = true
  try {
    let registerFileId = superviseForm.registerFileId.trim() || undefined
    if (superviseRegisterFile.value) {
      const node = await uploadFile(superviseRegisterFile.value, { businessType: 'archive-destruction-supervise' })
      if (!node?.id) {
        message.error('监销登记文件上传失败')
        return
      }
      registerFileId = String(node.id)
    }
    await confirmArchiveVolumeDestructionSupervision({
      volumeId: volumeId.value,
      witnessUserId: superviseForm.witnessUserId.trim(),
      registerFileId,
    })
    message.success('监销确认完成')
    superviseModalOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    superviseSubmitting.value = false
  }
}

async function handleRequestAppraisal() {
  try {
    await requestArchiveVolumeAppraisal(volumeId.value)
    message.success('鉴定申请已提交')
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
}

function openAppraisalOpinion() {
  appraisalForm.decision = 'RETAIN'
  appraisalForm.retentionExtensionYears = undefined
  appraisalForm.permanentRetention = false
  appraisalForm.remark = ''
  appraisalModalOpen.value = true
}

async function submitAppraisalOpinion() {
  if (appraisalForm.decision === 'RETAIN'
    && !appraisalForm.permanentRetention
    && !appraisalForm.retentionExtensionYears) {
    message.warning('请填写延长保管年限或勾选永久保管')
    return
  }
  appraisalSubmitting.value = true
  try {
    await recordArchiveVolumeAppraisalOpinion({
      volumeId: volumeId.value,
      decision: appraisalForm.decision,
      retentionExtensionYears: appraisalForm.decision === 'RETAIN' && !appraisalForm.permanentRetention
        ? appraisalForm.retentionExtensionYears
        : undefined,
      permanentRetention: appraisalForm.decision === 'RETAIN' ? appraisalForm.permanentRetention : undefined,
      remark: appraisalForm.remark.trim() || undefined,
    })
    message.success('鉴定决议已记录')
    appraisalModalOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    appraisalSubmitting.value = false
  }
}

function openDestructionRequest() {
  destructionReason.value = ''
  destructionModalOpen.value = true
}

async function submitDestructionRequest() {
  if (!destructionReason.value.trim()) {
    message.warning('请填写销毁原因')
    return
  }
  destructionSubmitting.value = true
  try {
    await requestArchiveVolumeDestruction({
      volumeId: volumeId.value,
      reason: destructionReason.value.trim(),
    })
    message.success('销毁申请已提交')
    destructionModalOpen.value = false
    await loadDetail()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    destructionSubmitting.value = false
  }
}

function goBack() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function resolveInitialTab() {
  const raw = route.query.tab
  if (typeof raw === 'string' && sectionTabs.some(item => item.key === raw)) {
    activeTab.value = raw
  }
}

onMounted(() => {
  void loadGrants()
  resolveInitialTab()
  void loadDetail()
})

onUnmounted(() => {
  if (materialOcrPollTimer) {
    clearInterval(materialOcrPollTimer)
    materialOcrPollTimer = null
  }
  if (destructionPollTimer) {
    clearInterval(destructionPollTimer)
    destructionPollTimer = null
  }
})
</script>

<style scoped>
.archive-volume-detail__ocr-failure {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.archive-volume-detail__stale-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--dp-warning, #b45309);
}

.archive-volume-detail__alert {
  margin-bottom: var(--dp-space-4, 16px);
}

.archive-volume-detail__head {
  margin-bottom: var(--dp-space-4, 16px);
}

.archive-volume-detail__title {
  margin: 0;
  font-size: var(--dp-font-size-xl, 18px);
  font-weight: 600;
}

.archive-volume-detail__meta {
  margin: 4px 0 0;
  color: var(--dp-text-secondary, #64748b);
  font-size: 14px;
}

.archive-volume-detail__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-detail__toolbar,
.archive-volume-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-detail__missing-table,
.archive-volume-detail__access-table {
  margin-top: var(--dp-space-3, 12px);
}

.archive-volume-detail__four-property p {
  margin: 4px 0;
  font-size: 14px;
}

.archive-volume-detail__lifecycle {
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-volume-detail__steps {
  margin: 0 0 var(--dp-space-4, 16px);
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--dp-space-2, 8px);
}

.archive-volume-detail__steps li {
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control, 8px);
  font-size: 13px;
  color: var(--dp-text-muted, #64748b);
}

.archive-volume-detail__steps li.done {
  border-color: var(--ant-color-primary-border, #91caff);
  color: var(--dp-text-primary, #1e293b);
  background: var(--dp-surface-subtle, #fafafa);
}
</style>
