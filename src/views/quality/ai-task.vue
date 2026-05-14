<script setup lang="ts">
/**
 * AI 任务中心
 *
 * 列表：按 能力 / 状态 / 业务类型 / 业务 ID / 操作人 筛选（严格对齐后端 AiTaskQueryRequest）
 * 提交：7 类能力，支持挂业务锚点（专业 / 培养方案 / 课程 / 达成度 / 报告 / 文件节点 / 用户提问）
 * 详情抽屉：
 *  - 任务字段：状态机 / 失败阶段 / 失败原因 / 业务锚点 / 提示词快照 ID / 脱敏映射 ID / 结果 ID
 *  - AI 结果：诊断摘要 / 报告正文 / 校验状态 / 敏感检测 / Token 用量；可对结果『接受 / 退回 / 警告』
 *  - 提示词快照：从 /api/quality/ai-prompt-snapshots/detail 拉取分段提示词
 *  - 脱敏映射：跳转脱敏映射审计页面（明文反脱敏受权限控制）
 * 失败任务可立即同步重跑（运维场景 /run-now）
 */
import type {
  AiOutputValidation,
  AiPromptSnapshotVO,
  AiResultVO,
  AiTaskQueryPayload,
  AiTaskStatus,
  AiTaskSubmitPayload,
  AiTaskType,
  AiTaskVO,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AI_OUTPUT_VALIDATION_COLOR,
  AI_OUTPUT_VALIDATION_LABEL,
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
  AI_TASK_TYPE_LABEL,
  aiPromptSnapshotApi,
  aiResultApi,
  aiTaskApi,
} from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()
const router = useRouter()

const list = ref<AiTaskVO[]>([])
const total = ref(0)
const loading = ref(false)

const query = reactive<AiTaskQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  taskType: undefined,
  status: undefined,
  businessType: '',
  businessId: '',
  operatorUserId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
})

const submitVisible = ref(false)
const submitting = ref(false)
const submitForm = reactive<AiTaskSubmitPayload>({
  taskType: 'ACHIEVEMENT_DIAGNOSIS',
  businessType: '',
  businessId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  reportId: '',
  fileNodeId: '',
  question: '',
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRecord = ref<AiTaskVO | null>(null)
const detailResult = ref<AiResultVO | null>(null)
const promptSnapshot = ref<AiPromptSnapshotVO | null>(null)
const validationUpdating = ref(false)

const taskTypeOptions = Object.entries(AI_TASK_TYPE_LABEL).map(([value, label]) => ({ value, label }))
const statusOptions = Object.entries(AI_TASK_STATUS_LABEL).map(([value, label]) => ({ value, label }))
const validationOptions: { value: AiOutputValidation, label: string, color: string }[] = [
  { value: 'PASSED', label: '通过（接受）', color: 'green' },
  { value: 'WARN', label: '警告（需人工审核）', color: 'orange' },
  { value: 'REJECTED', label: '退回（拒绝）', color: 'red' },
]

const submitDisabled = computed(() => !submitForm.taskType)

async function loadList() {
  loading.value = true
  try {
    const page = await aiTaskApi.page({
      ...query,
      taskType: query.taskType || undefined,
      status: query.status || undefined,
      businessType: query.businessType?.trim() || undefined,
      businessId: query.businessId?.trim() || undefined,
      operatorUserId: query.operatorUserId?.trim() || undefined,
      programId: query.programId?.trim() || undefined,
      trainingPlanId: query.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: query.qualityCourseId?.trim() || undefined,
      achievementResultId: query.achievementResultId?.trim() || undefined,
      reportId: query.reportId?.trim() || undefined,
    })
    list.value = page.list
    total.value = page.total
  }
  finally {
    loading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.taskType = undefined
  query.status = undefined
  query.businessType = ''
  query.businessId = ''
  query.operatorUserId = ''
  query.programId = ''
  query.trainingPlanId = ''
  query.qualityCourseId = ''
  query.achievementResultId = ''
  query.reportId = ''
  loadList()
}

function openSubmit() {
  Object.assign(submitForm, {
    taskType: 'ACHIEVEMENT_DIAGNOSIS',
    businessType: '',
    businessId: '',
    programId: '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    reportId: '',
    fileNodeId: '',
    question: '',
  })
  submitVisible.value = true
}

async function submitTask() {
  submitting.value = true
  try {
    const result = await aiTaskApi.submit({
      taskType: submitForm.taskType,
      businessType: submitForm.businessType?.trim() || undefined,
      businessId: submitForm.businessId?.trim() || undefined,
      programId: submitForm.programId?.trim() || undefined,
      trainingPlanId: submitForm.trainingPlanId?.trim() || qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: submitForm.qualityCourseId?.trim() || undefined,
      achievementResultId: submitForm.achievementResultId?.trim() || undefined,
      reportId: submitForm.reportId?.trim() || undefined,
      fileNodeId: submitForm.fileNodeId?.trim() || undefined,
      question: submitForm.question?.trim() || undefined,
    })
    message.success(`已提交 AI 任务 ${result.aiTaskId}`)
    submitVisible.value = false
    await loadList()
  }
  finally {
    submitting.value = false
  }
}

async function runNow(record: AiTaskVO) {
  Modal.confirm({
    title: `立即同步执行任务 ${record.id}？`,
    content: '仅 PENDING 状态可立即执行，常用于演示 / 运维场景。',
    onOk: async () => {
      await aiTaskApi.runNow(record.id)
      message.success('已触发同步执行')
      await loadList()
    },
  })
}

async function cancelTask(record: AiTaskVO) {
  Modal.confirm({
    title: `取消任务 ${record.id}？`,
    content: '只有 PENDING / PROCESSING 状态可取消，已成功或已失败的任务不可取消。',
    onOk: async () => {
      await aiTaskApi.cancel(record.id)
      message.success('已取消任务')
      await loadList()
    },
  })
}

async function openDetail(record: AiTaskVO) {
  detailVisible.value = true
  detailLoading.value = true
  detailRecord.value = record
  detailResult.value = null
  promptSnapshot.value = null
  try {
    const [resultVo, snapshotVo] = await Promise.all([
      aiResultApi.getByTask(record.id),
      record.promptSnapshotId ? aiPromptSnapshotApi.detail(record.promptSnapshotId) : Promise.resolve(null),
    ])
    detailResult.value = resultVo
    promptSnapshot.value = snapshotVo
  }
  finally {
    detailLoading.value = false
  }
}

async function updateValidation(validation: AiOutputValidation) {
  if (!detailResult.value)
    return
  validationUpdating.value = true
  try {
    await aiResultApi.updateValidation({
      id: detailResult.value.id,
      outputValidation: validation,
      sensitiveCheckStatus: detailResult.value.sensitiveCheckStatus,
      sensitiveCheckDetail: detailResult.value.sensitiveCheckDetail,
    })
    detailResult.value.outputValidation = validation
    message.success(`已更新校验状态为 ${AI_OUTPUT_VALIDATION_LABEL[validation]}`)
  }
  finally {
    validationUpdating.value = false
  }
}

function gotoMaskAudit(taskId: string) {
  router.push({ name: 'QualityAiMaskMapping', query: { aiTaskId: taskId } })
}

watch(() => qualityStore.currentTrainingPlanId, () => loadList())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length)
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
  }
  await loadList()
})
</script>

<template>
  <div class="ai-task-page">
    <a-card title="AI 任务中心" :bordered="false">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="query.taskType"
            placeholder="能力"
            style="width: 180px"
            allow-clear
            :options="taskTypeOptions"
          />
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            style="width: 130px"
            allow-clear
            :options="statusOptions"
          />
          <a-input v-model:value="query.businessType" placeholder="业务类型" style="width: 140px" />
          <a-input v-model:value="query.businessId" placeholder="业务 ID" style="width: 110px" />
          <a-input v-model:value="query.operatorUserId" placeholder="操作人 ID" style="width: 110px" />
          <a-input
            v-model:value="query.trainingPlanId"
            :placeholder="qualityStore.currentTrainingPlanId ? `培养方案 ID（默认 ${qualityStore.currentTrainingPlanId}）` : '培养方案 ID'"
            style="width: 160px"
          />
          <a-input v-model:value="query.qualityCourseId" placeholder="课程 ID" style="width: 110px" />
          <a-input v-model:value="query.achievementResultId" placeholder="达成度 ID" style="width: 110px" />
          <a-input v-model:value="query.reportId" placeholder="报告 ID" style="width: 110px" />
          <a-button type="primary" @click="loadList">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
          <a-button type="primary" @click="openSubmit">
            提交任务
          </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handlePageChange,
        }"
      >
        <a-table-column title="ID" data-index="id" width="100" />
        <a-table-column title="能力" data-index="taskType" width="180">
          <template #default="{ text }">
            {{ AI_TASK_TYPE_LABEL[text as AiTaskType] || text }}
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" width="100">
          <template #default="{ text }">
            <a-tag :color="AI_TASK_STATUS_COLOR[text as AiTaskStatus]">
              {{ AI_TASK_STATUS_LABEL[text as AiTaskStatus] }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="业务类型" data-index="businessType" width="160">
          <template #default="{ text }">
            {{ text || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="业务锚点" width="240">
          <template #default="{ record }">
            <a-space direction="vertical" size="small">
              <a-tag v-if="record.qualityCourseId">
                课程 #{{ record.qualityCourseId }}
              </a-tag>
              <a-tag v-if="record.achievementResultId">
                达成度 #{{ record.achievementResultId }}
              </a-tag>
              <a-tag v-if="record.reportId">
                报告 #{{ record.reportId }}
              </a-tag>
              <a-tag v-if="record.trainingPlanId">
                培养方案 #{{ record.trainingPlanId }}
              </a-tag>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="失败阶段" data-index="failurePhase" width="160">
          <template #default="{ text }">
            <span v-if="text" style="color: #ff4d4f">{{ text }}</span>
            <span v-else>-</span>
          </template>
        </a-table-column>
        <a-table-column title="开始时间" data-index="startedAt" width="160" />
        <a-table-column title="操作" width="240" fixed="right">
          <template #default="{ record }">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">
                详情
              </a-button>
              <a-button
                v-if="record.status === 'PENDING'"
                type="link"
                size="small"
                @click="runNow(record)"
              >
                立即执行
              </a-button>
              <a-button
                v-if="record.status === 'PENDING' || record.status === 'PROCESSING'"
                type="link"
                size="small"
                danger
                @click="cancelTask(record)"
              >
                取消
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="submitVisible"
      title="提交 AI 任务"
      :confirm-loading="submitting"
      :ok-button-props="{ disabled: submitDisabled }"
      @ok="submitTask"
    >
      <a-form layout="vertical" :model="submitForm">
        <a-form-item label="能力" required>
          <a-select v-model:value="submitForm.taskType" :options="taskTypeOptions" />
        </a-form-item>
        <a-form-item label="业务类型">
          <a-input v-model:value="submitForm.businessType" placeholder="business_type（例如 ACHIEVEMENT_RESULT）" />
        </a-form-item>
        <a-form-item label="业务对象 ID">
          <a-input v-model:value="submitForm.businessId" placeholder="business_id（与业务类型对应）" />
        </a-form-item>
        <a-form-item label="培养方案 ID">
          <a-input
            v-model:value="submitForm.trainingPlanId"
            :placeholder="qualityStore.currentTrainingPlanId || '默认使用当前选中培养方案'"
          />
        </a-form-item>
        <a-form-item label="专业 ID">
          <a-input v-model:value="submitForm.programId" placeholder="program_id（可选）" />
        </a-form-item>
        <a-form-item label="质量评价课程 ID">
          <a-input v-model:value="submitForm.qualityCourseId" placeholder="quality_course_id（可选）" />
        </a-form-item>
        <a-form-item label="达成度结果 ID">
          <a-input v-model:value="submitForm.achievementResultId" placeholder="achievement_result_id（ACHIEVEMENT_DIAGNOSIS 必填）" />
        </a-form-item>
        <a-form-item label="报告 ID">
          <a-input v-model:value="submitForm.reportId" placeholder="report_id（XX_REPORT_GENERATE 可填）" />
        </a-form-item>
        <a-form-item label="文件节点 ID">
          <a-input v-model:value="submitForm.fileNodeId" placeholder="file_node_id（SYLLABUS_PARSE / TRAINING_PLAN_PARSE / MATERIAL_QA 必填）" />
        </a-form-item>
        <a-form-item label="用户提问">
          <a-textarea
            v-model:value="submitForm.question"
            :rows="3"
            placeholder="MATERIAL_QA 必填，最长 1000 字符"
            :maxlength="1000"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailVisible"
      title="AI 任务详情"
      width="800"
      :loading="detailLoading"
    >
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="任务 ID">
          {{ detailRecord.id }}
        </a-descriptions-item>
        <a-descriptions-item label="能力">
          {{ AI_TASK_TYPE_LABEL[detailRecord.taskType as AiTaskType] }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="AI_TASK_STATUS_COLOR[detailRecord.status as AiTaskStatus]">
            {{ AI_TASK_STATUS_LABEL[detailRecord.status as AiTaskStatus] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作人 ID">
          {{ detailRecord.operatorUserId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型 / ID">
          {{ detailRecord.businessType || '-' }} / {{ detailRecord.businessId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务锚点">
          <a-space wrap>
            <a-tag v-if="detailRecord.programId">
              专业 #{{ detailRecord.programId }}
            </a-tag>
            <a-tag v-if="detailRecord.trainingPlanId">
              培养方案 #{{ detailRecord.trainingPlanId }}
            </a-tag>
            <a-tag v-if="detailRecord.qualityCourseId">
              课程 #{{ detailRecord.qualityCourseId }}
            </a-tag>
            <a-tag v-if="detailRecord.achievementResultId">
              达成度 #{{ detailRecord.achievementResultId }}
            </a-tag>
            <a-tag v-if="detailRecord.reportId">
              报告 #{{ detailRecord.reportId }}
            </a-tag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="开始 / 结束">
          {{ detailRecord.startedAt || '-' }} ～ {{ detailRecord.finishedAt || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="失败阶段">
          <span v-if="detailRecord.failurePhase" style="color: #ff4d4f">
            {{ detailRecord.failurePhase }}
          </span>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="失败原因">
          <span v-if="detailRecord.failureReason" style="color: #ff4d4f; white-space: pre-wrap">
            {{ detailRecord.failureReason }}
          </span>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="运维干预状态 / 备注">
          {{ detailRecord.manualHandlingStatus || '-' }} / {{ detailRecord.manualHandlingRemark || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="提示词快照 ID">
          {{ detailRecord.promptSnapshotId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="脱敏映射 ID">
          <a-space>
            <span>{{ detailRecord.maskMappingId || '-' }}</span>
            <a-button
              v-if="detailRecord.maskMappingId"
              type="link"
              size="small"
              @click="gotoMaskAudit(detailRecord.id)"
            >
              查看脱敏审计
            </a-button>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="结果 ID">
          {{ detailRecord.resultId || '-' }}
        </a-descriptions-item>
      </a-descriptions>

      <a-divider />

      <a-tabs v-if="detailRecord" default-active-key="result">
        <a-tab-pane key="result" tab="AI 结果">
          <a-empty v-if="!detailResult" description="尚未生成结果" />
          <template v-else>
            <a-descriptions :column="2" size="small" bordered>
              <a-descriptions-item label="输出校验">
                <a-tag
                  v-if="detailResult.outputValidation"
                  :color="AI_OUTPUT_VALIDATION_COLOR[detailResult.outputValidation]"
                >
                  {{ AI_OUTPUT_VALIDATION_LABEL[detailResult.outputValidation] }}
                </a-tag>
                <span v-else>-</span>
              </a-descriptions-item>
              <a-descriptions-item label="敏感检测">
                <a-tag :color="detailResult.sensitiveCheckStatus === 'CLEAN' ? 'green' : 'red'">
                  {{ detailResult.sensitiveCheckStatus || '-' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="调用模型">
                {{ detailResult.modelName || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="生成时间">
                {{ detailResult.generatedAt || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="提示 token">
                {{ detailResult.promptTokenCount ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="完成 token">
                {{ detailResult.completionTokenCount ?? '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="敏感检测明细" :span="2">
                <pre v-if="detailResult.sensitiveCheckDetail" class="output-pre">{{ detailResult.sensitiveCheckDetail }}</pre>
                <span v-else>-</span>
              </a-descriptions-item>
            </a-descriptions>

            <a-divider style="margin: 12px 0" />

            <a-space>
              <span style="color: #595959">校验状态：</span>
              <a-button
                v-for="opt in validationOptions"
                :key="opt.value"
                size="small"
                :type="detailResult.outputValidation === opt.value ? 'primary' : 'default'"
                :loading="validationUpdating"
                :danger="opt.value === 'REJECTED'"
                @click="updateValidation(opt.value)"
              >
                {{ opt.label }}
              </a-button>
            </a-space>

            <a-divider style="margin: 12px 0" />

            <h4>诊断摘要</h4>
            <pre class="output-pre">{{ detailResult.summary || '-' }}</pre>

            <h4 style="margin-top: 12px">
              问题列表（JSON）
            </h4>
            <pre class="output-pre">{{ detailResult.issueList || '-' }}</pre>

            <h4 style="margin-top: 12px">
              证据引用（JSON）
            </h4>
            <pre class="output-pre">{{ detailResult.evidenceReferences || '-' }}</pre>

            <h4 style="margin-top: 12px">
              改进建议（JSON）
            </h4>
            <pre class="output-pre">{{ detailResult.improvementSuggestions || '-' }}</pre>

            <h4 style="margin-top: 12px">
              报告正文（Markdown）
            </h4>
            <pre class="output-pre">{{ detailResult.reportBody || '-' }}</pre>

            <h4 style="margin-top: 12px">
              原始模型输出（脱敏后）
            </h4>
            <pre class="output-pre">{{ detailResult.rawModelOutput || '-' }}</pre>
          </template>
        </a-tab-pane>
        <a-tab-pane key="prompt" tab="提示词快照">
          <a-empty v-if="!promptSnapshot" description="未读取到提示词快照" />
          <template v-else>
            <a-descriptions :column="2" size="small" bordered>
              <a-descriptions-item label="快照 ID">
                {{ promptSnapshot.id }}
              </a-descriptions-item>
              <a-descriptions-item label="提示词版本">
                {{ promptSnapshot.promptVersion }}
              </a-descriptions-item>
              <a-descriptions-item label="摘要" :span="2">
                {{ promptSnapshot.digest || '-' }}
              </a-descriptions-item>
            </a-descriptions>
            <a-collapse style="margin-top: 12px">
              <a-collapse-panel key="system" header="系统段（systemPrompt）">
                <pre class="output-pre">{{ promptSnapshot.systemPrompt || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="task" header="任务段（taskPrompt）">
                <pre class="output-pre">{{ promptSnapshot.taskPrompt || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="standard" header="标准段（standardSection）">
                <pre class="output-pre">{{ promptSnapshot.standardSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="profile" header="专业实例段（profileSection）">
                <pre class="output-pre">{{ promptSnapshot.profileSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="calculation" header="计算段（calculationSection）">
                <pre class="output-pre">{{ promptSnapshot.calculationSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="sample" header="样本段（sampleSection）">
                <pre class="output-pre">{{ promptSnapshot.sampleSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="audit" header="审核段（auditSection）">
                <pre class="output-pre">{{ promptSnapshot.auditSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="output" header="输出格式段（outputFormatSection）">
                <pre class="output-pre">{{ promptSnapshot.outputFormatSection || '-' }}</pre>
              </a-collapse-panel>
              <a-collapse-panel key="forbidden" header="禁止指令段（forbiddenSection）">
                <pre class="output-pre">{{ promptSnapshot.forbiddenSection || '-' }}</pre>
              </a-collapse-panel>
            </a-collapse>
          </template>
        </a-tab-pane>
      </a-tabs>
    </a-drawer>
  </div>
</template>

<style scoped lang="scss">
.ai-task-page {
  padding: 16px;
}

.output-pre {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
  margin: 0;
}
</style>
