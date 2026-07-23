<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioIndustryEducationProjectVO,
  PortfolioPolicyLedgerReviewRequest,
  PortfolioVirtualTeachingRoomActivityVO,
} from '@/apis/portfolio/policy-ledger'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { onMounted, reactive, ref } from 'vue'
import {
  portfolioIndustryEducationProjectApi,
  portfolioVirtualTeachingRoomActivityApi,
} from '@/apis/portfolio/policy-ledger'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import {
  ALL_PORTFOLIO_INDUSTRY_EDUCATION_PROJECT_STAGE_CODES,
  PortfolioIndustryEducationProjectStageCode,
  PortfolioIndustryEducationProjectStageDescription,
} from '@/types/enums/portfolio-industry-education-project-stage-enum'
import {
  ALL_PORTFOLIO_INDUSTRY_EDUCATION_PROJECT_TYPE_CODES,
  PortfolioIndustryEducationProjectTypeCode,
  PortfolioIndustryEducationProjectTypeDescription,
} from '@/types/enums/portfolio-industry-education-project-type-enum'
import {
  PortfolioPolicyLedgerReviewStatusCode,
  PortfolioPolicyLedgerReviewStatusDescription,
} from '@/types/enums/portfolio-policy-ledger-review-status-enum'
import { PortfolioVirtualTeachingRoomActivityTypeCode } from '@/types/enums/portfolio-virtual-teaching-room-activity-type-enum'
import { PortfolioVirtualTeachingRoomRoleCode } from '@/types/enums/portfolio-virtual-teaching-room-role-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()
const tab = ref<'virtual' | 'industry'>('virtual')
const loading = ref(false)
const virtualRows = ref<PortfolioVirtualTeachingRoomActivityVO[]>([])
const industryRows = ref<PortfolioIndustryEducationProjectVO[]>([])
const virtualTotal = ref(0)
const industryTotal = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const pageRequestToken = ref(0)
const formEpoch = ref(0)
const operationKey = ref('')

const reviewStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: PortfolioPolicyLedgerReviewStatusCode.DRAFT },
  { label: '待审核', value: PortfolioPolicyLedgerReviewStatusCode.PENDING_REVIEW },
  { label: '已通过', value: PortfolioPolicyLedgerReviewStatusCode.APPROVED },
  { label: '已退回', value: PortfolioPolicyLedgerReviewStatusCode.REJECTED },
]
const reviewFilter = ref<PortfolioPolicyLedgerReviewStatusCode | ''>('')

const virtualForm = reactive({
  roomName: '',
  activityTitle: '',
  activityType: PortfolioVirtualTeachingRoomActivityTypeCode.JOINT_PREP,
  roleCode: PortfolioVirtualTeachingRoomRoleCode.MEMBER,
  partnerEnterprise: '',
  leadUnit: '',
})
const industryForm = reactive({
  projectName: '',
  projectType: PortfolioIndustryEducationProjectTypeCode.INDUSTRY_COLLEGE,
  stageCode: PortfolioIndustryEducationProjectStageCode.ACCEPT,
  roleCode: PortfolioVirtualTeachingRoomRoleCode.LEADER,
  enterpriseName: '',
})
const saving = ref(false)

const virtualColumns: ColumnsType = [
  { title: '教研室', dataIndex: 'roomName', key: 'roomName' },
  { title: '活动', dataIndex: 'activityTitle', key: 'activityTitle' },
  { title: '类型', dataIndex: 'activityTypeLabel', key: 'activityTypeLabel', width: 160 },
  { title: '角色', dataIndex: 'roleLabel', key: 'roleLabel', width: 100 },
  { title: '多身份', key: 'ownerIdentityLayers', width: 220 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
  { title: '状态', key: 'reviewStatus', width: 100 },
  { title: '操作', key: 'actions', width: 200 },
]
const industryColumns: ColumnsType = [
  { title: '项目', dataIndex: 'projectName', key: 'projectName' },
  { title: '类型', dataIndex: 'projectTypeLabel', key: 'projectTypeLabel', width: 120 },
  { title: '阶段', dataIndex: 'stageCode', key: 'stageCode', width: 100 },
  { title: '角色', dataIndex: 'roleCode', key: 'roleCode', width: 100 },
  { title: '多身份', key: 'ownerIdentityLayers', width: 220 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
  { title: '状态', key: 'reviewStatus', width: 100 },
  { title: '操作', key: 'actions', width: 200 },
]

function statusTone(
  status?: PortfolioPolicyLedgerReviewStatusCode,
): 'blue' | 'orange' | 'green' | 'gray' | 'red' {
  if (status === PortfolioPolicyLedgerReviewStatusCode.APPROVED) return 'green'
  if (status === PortfolioPolicyLedgerReviewStatusCode.PENDING_REVIEW) return 'orange'
  if (status === PortfolioPolicyLedgerReviewStatusCode.REJECTED) return 'red'
  return 'gray'
}

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

async function loadPage() {
  if (canPickTeachers.value && !targetTeacherId.value) {
    virtualRows.value = []
    industryRows.value = []
    return
  }
  const currentToken = ++pageRequestToken.value
  const teacherId = targetTeacherId.value
  const ledgerType = tab.value
  const requestedPage = pageNum.value
  const requestedFilter = reviewFilter.value
  loading.value = true
  try {
    if (ledgerType === 'virtual') {
      const page = await portfolioVirtualTeachingRoomActivityApi.page({
        pageNum: requestedPage,
        pageSize: pageSize.value,
        teacherUserId: teacherId || undefined,
        reviewStatus: requestedFilter || undefined,
      })
      if (
        currentToken !== pageRequestToken.value
        || tab.value !== ledgerType
        || targetTeacherId.value !== teacherId
      ) {
        return
      }
      virtualRows.value = page.list ?? []
      virtualTotal.value = page.total ?? 0
    } else {
      const page = await portfolioIndustryEducationProjectApi.page({
        pageNum: requestedPage,
        pageSize: pageSize.value,
        teacherUserId: teacherId || undefined,
        reviewStatus: requestedFilter || undefined,
      })
      if (
        currentToken !== pageRequestToken.value
        || tab.value !== ledgerType
        || targetTeacherId.value !== teacherId
      ) {
        return
      }
      industryRows.value = page.list ?? []
      industryTotal.value = page.total ?? 0
    }
  } catch (error) {
    if (currentToken !== pageRequestToken.value) return
    showUserError(error, '加载政策专项台账失败')
  } finally {
    if (currentToken === pageRequestToken.value) loading.value = false
  }
}

/** 切换政策台账类型时重置分页并加载对应记录。 */
function switchLedgerTab(nextTab: 'virtual' | 'industry'): void {
  if (tab.value === nextTab) return
  tab.value = nextTab
  pageNum.value = 1
  void loadPage()
}

async function saveVirtual() {
  if (!targetTeacherId.value) {
    void message.warning('请先选择教师')
    return
  }
  if (!assertArchiveWritable('登记虚拟教研室活动')) {
    return
  }
  if (!virtualForm.roomName.trim() || !virtualForm.activityTitle.trim()) {
    void message.warning('请填写教研室名称与活动标题')
    return
  }
  const teacherId = targetTeacherId.value
  const currentFormEpoch = formEpoch.value
  saving.value = true
  try {
    await portfolioVirtualTeachingRoomActivityApi.save({
      teacherUserId: teacherId,
      roomName: virtualForm.roomName.trim(),
      activityTitle: virtualForm.activityTitle.trim(),
      activityType: virtualForm.activityType,
      roleCode: virtualForm.roleCode,
      partnerEnterprise: virtualForm.partnerEnterprise || undefined,
      leadUnit: virtualForm.leadUnit || undefined,
    })
    void message.success('虚拟教研室活动已保存')
    if (formEpoch.value === currentFormEpoch && targetTeacherId.value === teacherId) {
      virtualForm.roomName = ''
      virtualForm.activityTitle = ''
      void loadPage()
    }
  } catch (error) {
    showUserError(error, '保存虚拟教研室活动失败')
  } finally {
    saving.value = false
  }
}

async function saveIndustry() {
  if (!targetTeacherId.value) {
    void message.warning('请先选择教师')
    return
  }
  if (!assertArchiveWritable('登记产教项目')) {
    return
  }
  if (!industryForm.projectName.trim()) {
    void message.warning('请填写项目名称')
    return
  }
  const teacherId = targetTeacherId.value
  const currentFormEpoch = formEpoch.value
  saving.value = true
  try {
    await portfolioIndustryEducationProjectApi.save({
      teacherUserId: teacherId,
      projectName: industryForm.projectName.trim(),
      projectType: industryForm.projectType,
      stageCode: industryForm.stageCode,
      roleCode: industryForm.roleCode,
      enterpriseName: industryForm.enterpriseName || undefined,
    })
    void message.success('产教项目已保存')
    if (formEpoch.value === currentFormEpoch && targetTeacherId.value === teacherId) {
      industryForm.projectName = ''
      void loadPage()
    }
  } catch (error) {
    showUserError(error, '保存产教项目失败')
  } finally {
    saving.value = false
  }
}

type PolicyLedgerRecord
  = PortfolioVirtualTeachingRoomActivityVO | PortfolioIndustryEducationProjectVO

/** 提交当前状态版本对应的政策专项证据，服务端生成并冻结证据指纹。 */
async function submitLedgerReview(kind: 'virtual' | 'industry', record: PolicyLedgerRecord) {
  const key = `${kind}:submit:${record.id}`
  if (operationKey.value) return
  operationKey.value = key
  try {
    const api
      = kind === 'virtual'
        ? portfolioVirtualTeachingRoomActivityApi
        : portfolioIndustryEducationProjectApi
    await api.submitReview({ id: record.id, statusVersion: record.statusVersion })
    void message.success('已提交审核')
    void loadPage()
  } catch (error) {
    showUserError(error, '提交政策专项审核失败')
  } finally {
    if (operationKey.value === key) operationKey.value = ''
  }
}

/** 按冻结证据指纹和状态版本完成四眼审核，拒绝对陈旧对象写入。 */
async function reviewLedger(
  kind: 'virtual' | 'industry',
  record: PolicyLedgerRecord,
  approved: boolean,
) {
  if (!record.evidenceFingerprint) {
    showUserError(new Error('待审核对象缺少冻结证据指纹'))
    return
  }
  const reviewOpinion = await promptInputAsync({
    title: approved ? '审核通过' : '退回修改',
    placeholder: approved ? '请填写通过依据' : '请填写退回原因和修改要求',
    required: true,
    emptyErrorMessage: '审核意见不能为空',
    okText: approved ? '确认通过' : '确认退回',
    okType: approved ? 'primary' : 'danger',
    type: approved ? 'success' : 'error',
  })
  if (!reviewOpinion) return
  const key = `${kind}:review:${record.id}`
  if (operationKey.value) return
  const request: PortfolioPolicyLedgerReviewRequest = {
    id: record.id,
    statusVersion: record.statusVersion,
    evidenceFingerprint: record.evidenceFingerprint,
    approved,
    reviewOpinion,
  }
  operationKey.value = key
  try {
    const api
      = kind === 'virtual'
        ? portfolioVirtualTeachingRoomActivityApi
        : portfolioIndustryEducationProjectApi
    await api.review(request)
    void message.success(approved ? '审核已通过' : '已退回修改')
    void loadPage()
  } catch (error) {
    showUserError(error, approved ? '审核通过失败' : '退回审核失败')
  } finally {
    if (operationKey.value === key) operationKey.value = ''
  }
}

/** 按后端审核状态机投影当前行允许的唯一动作集合。 */
function ledgerActions(record: PolicyLedgerRecord): UiTableRowActionItem[] {
  const disabled = Boolean(operationKey.value)
  if (
    record.reviewStatus === PortfolioPolicyLedgerReviewStatusCode.DRAFT
    || record.reviewStatus === PortfolioPolicyLedgerReviewStatusCode.REJECTED
  ) {
    return [{ key: 'submit', label: '提交审核', disabled }]
  }
  if (
    record.reviewStatus === PortfolioPolicyLedgerReviewStatusCode.PENDING_REVIEW
    && canPickTeachers.value
  ) {
    return [
      { key: 'approve', label: '通过', disabled },
      { key: 'reject', label: '退回', tone: 'danger', disabled },
    ]
  }
  return []
}

/** 将表格动作映射到提交/审核状态机，不在页面拼装其他状态写入口。 */
function handleLedgerAction(
  kind: 'virtual' | 'industry',
  record: PolicyLedgerRecord,
  action: string,
) {
  if (action === 'submit') {
    void submitLedgerReview(kind, record)
  } else if (action === 'approve') {
    void reviewLedger(kind, record, true)
  } else if (action === 'reject') {
    void reviewLedger(kind, record, false)
  }
}

usePortfolioScopedLoader(
  () => {
    formEpoch.value += 1
    pageNum.value = 1
    void loadPage()
  },
  () => targetTeacherId.value,
)

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="政策专项台账">
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading" @click="loadPage">刷新</UiButton>
        </template>
      </ContextBar>
    </template>

    <PortfolioTeacherPickGate />

    <UiCard v-if="archiveWriteForbidden" class="policy-ledger__block" title="档案写禁">
      <p class="policy-ledger__hint">{{ archiveWriteBlockMessage }}</p>
    </UiCard>

    <UiCard class="policy-ledger__block">
      <div class="policy-ledger__toolbar">
        <UiButton
          size="sm"
          :variant="tab === 'virtual' ? 'primary' : 'outline'"
          @click="switchLedgerTab('virtual')"
        >
          §8.41 虚拟教研室
        </UiButton>
        <UiButton
          size="sm"
          :variant="tab === 'industry' ? 'primary' : 'outline'"
          @click="switchLedgerTab('industry')"
        >
          §8.46 产教项目
        </UiButton>
        <UiSelect
          size="sm"
          v-model="reviewFilter"
          style="width: 140px"
          :options="reviewStatusOptions"
          @update:model-value="
            () => {
              pageNum = 1
              loadPage()
            }
          "
        />
      </div>
      <p class="policy-ledger__hint">
        贡献度仅统计「已通过」台账；未审核不得进入画像贡献与双高材料。
      </p>
    </UiCard>

    <UiCard v-if="tab === 'virtual'" title="登记虚拟教研室活动" class="policy-ledger__block">
      <div class="policy-ledger__form">
        <input v-model="virtualForm.roomName" class="input" placeholder="教研室名称" />
        <input v-model="virtualForm.activityTitle" class="input" placeholder="活动标题" />
        <input v-model="virtualForm.leadUnit" class="input" placeholder="牵头单位" />
        <input v-model="virtualForm.partnerEnterprise" class="input" placeholder="合作企业" />
        <UiSelect
          size="sm"
          v-model="virtualForm.activityType"
          style="width: 200px"
          :options="[
            { label: '国/省级建设任务', value: 'NATIONAL_PROVINCIAL_TASK' },
            { label: '联合课程开发', value: 'JOINT_COURSE' },
            { label: '联合备课教研', value: 'JOINT_PREP' },
            { label: '资源库共建', value: 'RESOURCE_POOL' },
            { label: '教材/实训开发', value: 'TEXTBOOK_OR_TRAINING' },
            { label: '成果推广', value: 'PROMOTION' },
          ]"
        />
        <UiSelect
          size="sm"
          v-model="virtualForm.roleCode"
          style="width: 140px"
          :options="[
            { label: '负责人', value: 'LEADER' },
            { label: '核心成员', value: 'CORE' },
            { label: '参与成员', value: 'MEMBER' },
            { label: '外部导师', value: 'EXTERNAL_MENTOR' },
          ]"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="saving"
          :disabled="archiveWriteForbidden"
          @click="saveVirtual"
        >
          保存
        </UiButton>
      </div>
      <UiDataTable
        :loading="loading"
        :columns="virtualColumns"
        :data-source="virtualRows"
        :pagination="{
          current: pageNum,
          pageSize,
          total: virtualTotal,
          onChange: (p: number) => {
            pageNum = p
            loadPage()
          },
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ownerIdentityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              show-note
            />
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <UiTag v-if="record.archiveWriteForbidden" tone="red" class="ml-1">档案写禁</UiTag>
            <span
              v-if="
                !record.lifecycleStatus && !record.evaluationHeld && !record.archiveWriteForbidden
              "
            >—</span>
          </template>
          <template v-else-if="column.key === 'reviewStatus'">
            <UiTag :tone="statusTone(record.reviewStatus)">
              {{
                strictEnumLabel(
                  PortfolioPolicyLedgerReviewStatusDescription,
                  record.reviewStatus,
                  '政策专项审核状态',
                )
              }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="ledgerActions(record)"
              @action="(action) => handleLedgerAction('virtual', record, action)"
            />
          </template>
        </template>
        <template #emptyText>
          <UiEmpty size="sm" description="暂无虚拟教研室活动" />
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else title="登记产教项目" class="policy-ledger__block">
      <div class="policy-ledger__form">
        <input v-model="industryForm.projectName" class="input" placeholder="项目名称" />
        <input v-model="industryForm.enterpriseName" class="input" placeholder="合作企业" />
        <UiSelect
          size="sm"
          v-model="industryForm.projectType"
          style="width: 160px"
          :options="ALL_PORTFOLIO_INDUSTRY_EDUCATION_PROJECT_TYPE_CODES.map((code) => ({
            label: PortfolioIndustryEducationProjectTypeDescription[code],
            value: code,
          }))"
        />
        <UiSelect
          size="sm"
          v-model="industryForm.stageCode"
          style="width: 120px"
          :options="ALL_PORTFOLIO_INDUSTRY_EDUCATION_PROJECT_STAGE_CODES.map((code) => ({
            label: PortfolioIndustryEducationProjectStageDescription[code],
            value: code,
          }))"
        />
        <UiSelect
          size="sm"
          v-model="industryForm.roleCode"
          style="width: 120px"
          :options="[
            { label: '负责人', value: 'LEADER' },
            { label: '核心', value: 'CORE' },
            { label: '参与', value: 'MEMBER' },
          ]"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="saving"
          :disabled="archiveWriteForbidden"
          @click="saveIndustry"
        >
          保存
        </UiButton>
      </div>
      <UiDataTable
        :loading="loading"
        :columns="industryColumns"
        :data-source="industryRows"
        :pagination="{
          current: pageNum,
          pageSize,
          total: industryTotal,
          onChange: (p: number) => {
            pageNum = p
            loadPage()
          },
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ownerIdentityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              show-note
            />
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <UiTag v-if="record.archiveWriteForbidden" tone="red" class="ml-1">档案写禁</UiTag>
            <span
              v-if="
                !record.lifecycleStatus && !record.evaluationHeld && !record.archiveWriteForbidden
              "
            >—</span>
          </template>
          <template v-else-if="column.key === 'reviewStatus'">
            <UiTag :tone="statusTone(record.reviewStatus)">
              {{
                strictEnumLabel(
                  PortfolioPolicyLedgerReviewStatusDescription,
                  record.reviewStatus,
                  '政策专项审核状态',
                )
              }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="ledgerActions(record)"
              @action="(action) => handleLedgerAction('industry', record, action)"
            />
          </template>
        </template>
        <template #emptyText>
          <UiEmpty size="sm" description="暂无产教项目" />
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.policy-ledger__block {
  margin-top: var(--dp-space-4);
}
.policy-ledger__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.policy-ledger__hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.policy-ledger__form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
  min-width: 140px;
}
</style>
