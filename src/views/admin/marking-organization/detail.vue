<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag
            v-if="organization"
            :tone="
              strictEnumTone(
                MARKING_ORGANIZATION_STATUS_TONE,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                MARKING_ORGANIZATION_STATUS_LABEL,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            }}
          </UiTag>
          <UiTag v-if="organization" tone="blue" size="sm">
            题组 {{ organization.groups.length }}
          </UiTag>
          <UiTag v-if="organization?.anonymousMode" tone="green" size="sm">匿名阅卷</UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadOrganization">
            刷新
          </UiButton>
          <UiButton
            v-if="organization && canManageOrganization"
            variant="outline"
            size="sm"
            @click="openEditDrawer"
          >
            编辑组织
          </UiButton>
          <a-popconfirm
            v-if="organization && canManageOrganization"
            title="确认删除该阅卷组织？"
            ok-text="删除"
            cancel-text="取消"
            :ok-button-props="{ danger: true, loading: deleting }"
            @confirm="submitDelete"
          >
            <UiButton variant="outline" size="sm" status="danger" :loading="deleting">
              删除组织
            </UiButton>
          </a-popconfirm>
          <UiButton size="sm" @click="goSessions">试评 / 正评</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!loading && organizationLoadError"
      description="暂无数据"
      class="org-detail__empty"
    />
    <UiEmpty
      v-else-if="!organization && !loading"
      description="暂无数据"
      class="org-detail__empty"
    />

    <a-spin v-else :spinning="loading">
      <UiAlertStrip
        v-if="organization && !canManageOrganization"
        tone="info"
        title="协作查看模式"
        dense
        class="org-detail__collab-alert"
      />
      <!-- P1-3 阅卷组织步骤引导 -->
      <UiAlertStrip
        v-if="organization && canManageOrganization"
        :tone="organizationStepAlertTone"
        :title="organizationStepAlertTitle"
        :description="organizationStepAlertDescription"
        dense
        class="org-detail__step-guide"
      />
      <section v-if="organization" class="org-detail__panel">
        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="info" tab="基本信息 + 题组">
            <a-descriptions
              :column="{ xs: 1, sm: 2, lg: 3 }"
              size="middle"
              bordered
              class="info-descriptions"
            >
              <a-descriptions-item label="当前考试">
                {{ organizationExamLabel }}
              </a-descriptions-item>
              <a-descriptions-item label="阅卷组长">
                {{ organization.leaderUserName }}（{{ organization.leaderTeacherNo }}）
              </a-descriptions-item>
              <a-descriptions-item label="组织状态">
                <UiTag
                  :tone="
                    strictEnumTone(
                      MARKING_ORGANIZATION_STATUS_TONE,
                      organization.organizationStatus,
                      '阅卷组织状态',
                    )
                  "
                  size="sm"
                >
                  {{
                    strictEnumLabel(
                      MARKING_ORGANIZATION_STATUS_LABEL,
                      organization.organizationStatus,
                      '阅卷组织状态',
                    )
                  }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="匿名阅卷">
                <UiTag :tone="organization.anonymousMode ? 'green' : 'gray'" size="sm">
                  {{ organization.anonymousMode ? '启用' : '关闭' }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="题组数量">
                {{ organization.groups.length }} 组
              </a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">
                {{ organization.remark || '未填写组织备注' }}
              </a-descriptions-item>
            </a-descriptions>

            <div class="section-header">
              <h3>题组列表</h3>
              <UiButton v-if="canManageOrganization" size="sm" @click="openGroupModal">
                <template #icon><PlusOutlined /></template>
                新建题组
              </UiButton>
            </div>

            <UiEmpty v-if="!groups.length" description="暂无数据" />
            <UiDataTable
              pagination-mode="none"
              v-else
              :columns="groupColumns"
              :data-source="groups"
              row-key="id"
              size="middle"
              :show-pagination="false"
              flat
              :total="groups.length"
              class="group-table student-detail-table__data-table"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'groupName'">
                  <a-typography-text strong>
                    {{ record.groupName }}
                  </a-typography-text>
                </template>
                <template v-else-if="column.key === 'questions'">
                  <div class="group-table__stack">
                    <UiTag tone="blue" size="sm"> {{ record.questions.length }} 题 </UiTag>
                    <span
                      v-for="question in record.questions.slice(0, 3)"
                      :key="question.questionTemplateId"
                      class="group-table__item"
                    >
                      第 {{ question.questionNo }} 题 · {{ question.questionTypeMessage }} ·
                      {{ question.fullScore }} 分
                    </span>
                    <span v-if="record.questions.length > 3" class="group-table__more">
                      另 {{ record.questions.length - 3 }} 题
                    </span>
                  </div>
                </template>
                <template v-else-if="column.key === 'reviewers'">
                  <div class="group-table__stack">
                    <UiTag tone="purple" size="sm"> {{ record.reviewers.length }} 人 </UiTag>
                    <span
                      v-for="reviewer in record.reviewers.slice(0, 3)"
                      :key="reviewer.reviewerUserId"
                      class="group-table__item"
                    >
                      {{ reviewer.reviewerUserName }}（{{ reviewer.reviewerTeacherNo }}）
                    </span>
                    <span v-if="record.reviewers.length > 3" class="group-table__more">
                      另 {{ record.reviewers.length - 3 }} 人
                    </span>
                  </div>
                </template>
                <template v-else-if="column.key === 'leaderUser'">
                  {{ record.leaderUserName }}（{{ record.leaderTeacherNo }}）
                </template>
                <template v-else-if="column.key === 'groupStatus'">
                  <UiTag :tone="groupStatusTone(record.groupStatus)" size="sm">
                    {{ groupStatusLabel(record.groupStatus) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'createTime'">
                  {{ formatDateTime(record.createTime) }}
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space size="small">
                    <UiButton
                      v-if="canEditGroup(record)"
                      variant="outline"
                      size="sm"
                      @click="openGroupEdit(record)"
                    >
                      编辑
                    </UiButton>
                    <a-popconfirm
                      v-if="canDeleteGroup(record)"
                      title="确认删除该题组？"
                      ok-text="删除"
                      cancel-text="取消"
                      :ok-button-props="{
                        danger: true,
                        loading: groupActionLoadingId === record.id,
                      }"
                      @confirm="submitGroupDelete(record)"
                    >
                      <UiButton
                        variant="outline"
                        size="sm"
                        status="danger"
                        :loading="groupActionLoadingId === record.id"
                      >
                        删除
                      </UiButton>
                    </a-popconfirm>
                    <a-popconfirm
                      v-if="canCloseGroup(record)"
                      title="确认关闭该题组？"
                      ok-text="关闭"
                      cancel-text="取消"
                      :ok-button-props="{ loading: groupActionLoadingId === record.id }"
                      @confirm="submitGroupClose(record)"
                    >
                      <UiButton
                        variant="outline"
                        size="sm"
                        :loading="groupActionLoadingId === record.id"
                      >
                        关闭
                      </UiButton>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </UiDataTable>
          </a-tab-pane>

          <a-tab-pane key="policy" tab="任务策略">
            <a-form :model="policyForm" layout="vertical" class="policy-form">
              <a-row :gutter="16">
                <a-col :xs="24" :lg="12">
                  <h4 class="subsection-title">任务分配策略</h4>
                  <a-form-item label="策略适用范围">
                    <a-select
                      v-model:value="policyForm.allocationGroupId"
                      placeholder="选择题组（留空表示组织级默认）"
                      :options="groupSelectOptions"
                      allow-clear
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="分配模式" required>
                    <a-select
                      v-model:value="policyForm.allocationMode"
                      :options="ALLOCATION_MODE_OPTIONS"
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="批阅任务单元" required>
                    <a-select
                      v-model:value="policyForm.allocationUnit"
                      :options="ALLOCATION_UNIT_OPTIONS"
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="匿名模式" required>
                    <a-select
                      v-model:value="policyForm.anonymityMode"
                      :options="ANONYMITY_MODE_OPTIONS"
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item
                    v-if="policyForm.allocationUnit === 'RANDOM_QUESTIONS'"
                    label="随机题目抽样数量"
                    required
                  >
                    <a-input-number
                      v-model:value="policyForm.randomQuestionSampleSize"
                      :min="1"
                      :max="100"
                      style="width: 100%"
                      :disabled="!canManageOrganization"
                    />
                    <div class="policy-hint">
                      抽样题池来自当前题组题目范围；正评启动后会固化本次随机抽题结果，后续可在正评会话列表审计复盘。
                    </div>
                  </a-form-item>
                  <a-form-item label="每批分配任务数">
                    <a-input-number
                      v-model:value="policyForm.batchSize"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="教师最大待处理任务数">
                    <a-input-number
                      v-model:value="policyForm.loadLimit"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="匿名令牌策略">
                    <a-select
                      v-model:value="policyForm.anonymousTokenPolicy"
                      :options="ANONYMOUS_TOKEN_OPTIONS"
                      allow-clear
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <UiButton
                    v-if="canManageOrganization"
                    :loading="savingAllocation"
                    @click="submitAllocation"
                  >
                    <template #icon><SaveOutlined /></template>
                    保存分配策略
                  </UiButton>
                </a-col>

                <a-col :xs="24" :lg="12">
                  <h4 class="subsection-title">任务回收策略</h4>
                  <a-form-item label="策略适用范围">
                    <a-select
                      v-model:value="policyForm.recycleGroupId"
                      placeholder="选择题组（留空表示组织级默认）"
                      :options="groupSelectOptions"
                      allow-clear
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="超时时间（分钟）">
                    <a-input-number
                      v-model:value="policyForm.timeoutMinutes"
                      :min="1"
                      :max="1440"
                      style="width: 100%"
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="教师最大待处理任务数">
                    <a-input-number
                      v-model:value="policyForm.maxPendingCount"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <a-form-item label="再分配模式">
                    <a-select
                      v-model:value="policyForm.reassignMode"
                      :options="REASSIGN_MODE_OPTIONS"
                      allow-clear
                      :disabled="!canManageOrganization"
                    />
                  </a-form-item>
                  <UiButton
                    v-if="canManageOrganization"
                    :loading="savingRecycle"
                    @click="submitRecycle"
                  >
                    <template #icon><SaveOutlined /></template>
                    保存回收策略
                  </UiButton>
                </a-col>
              </a-row>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="status" tab="状态推进">
            <a-form layout="vertical" class="status-form">
              <a-form-item label="当前状态">
                <UiTag
                  :tone="
                    strictEnumTone(
                      MARKING_ORGANIZATION_STATUS_TONE,
                      organization.organizationStatus,
                      '阅卷组织状态',
                    )
                  "
                  size="md"
                >
                  {{
                    strictEnumLabel(
                      MARKING_ORGANIZATION_STATUS_LABEL,
                      organization.organizationStatus,
                      '阅卷组织状态',
                    )
                  }}
                </UiTag>
              </a-form-item>
              <a-form-item label="目标状态" required>
                <a-select
                  v-model:value="targetStatus"
                  placeholder="选择目标状态"
                  style="width: 320px"
                  :options="statusTransitionOptions"
                  :disabled="!canManageOrganization"
                />
              </a-form-item>
              <UiButton
                v-if="canManageOrganization"
                :disabled="!targetStatus"
                :loading="updatingStatus"
                @click="submitStatusUpdate"
              >
                <template #icon><ArrowRightOutlined /></template>
                推进到目标状态
              </UiButton>
            </a-form>
          </a-tab-pane>
        </a-tabs>
      </section>
    </a-spin>

    <a-modal
      v-model:open="groupModalOpen"
      :title="groupModalTitle"
      :confirm-loading="savingGroup"
      ok-text="提交"
      cancel-text="取消"
      :width="640"
      @ok="submitGroup"
    >
      <a-form ref="groupFormRef" :model="groupForm" :rules="groupRules" layout="vertical">
        <a-form-item label="题组名称" name="groupName" required>
          <a-input
            v-model:value="groupForm.groupName"
            placeholder="例如：第一题组（选择题）"
            :maxlength="50"
          />
        </a-form-item>
        <a-form-item label="题组组长" name="leaderUserId" required>
          <a-select
            v-model:value="groupForm.leaderUserId"
            show-search
            option-filter-prop="label"
            :options="teacherOptions"
            :loading="teacherLoading"
            placeholder="从教师中选择"
          />
        </a-form-item>
        <a-form-item
          v-if="!groupForm.wholePaperGroup"
          label="负责题目"
          name="questionTemplateIds"
          required
        >
          <a-select
            v-model:value="groupForm.questionTemplateIds"
            mode="multiple"
            :options="questionOptions"
            :loading="templateLoading"
            placeholder="选择该题组负责的题目"
            option-filter-prop="label"
            show-search
          />
        </a-form-item>
        <a-form-item label="阅卷教师" name="reviewerUserIds" required>
          <a-select
            v-model:value="groupForm.reviewerUserIds"
            mode="multiple"
            :options="teacherOptions"
            :loading="teacherLoading"
            placeholder="选择阅卷教师（多选）"
            option-filter-prop="label"
            show-search
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <UiDrawer
      :open="editDrawerOpen"
      title="编辑阅卷组织"
      :width="520"
      :confirm-loading="updating"
      @update:open="(v: boolean) => (editDrawerOpen = v)"
      @close="editDrawerOpen = false"
      @ok="submitUpdate"
    >
      <a-form ref="editFormRef" :model="editForm" :rules="editRules" layout="vertical">
        <a-form-item label="关联考试">
          <a-input :value="organizationExamLabel" disabled />
        </a-form-item>
        <a-form-item label="阅卷组长" name="leaderUserId" required>
          <a-select
            v-model:value="editForm.leaderUserId"
            placeholder="选择组长（仅教师）"
            show-search
            option-filter-prop="label"
            :options="teacherOptions"
            :loading="teacherLoading"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="是否启用匿名阅卷" name="anonymousMode">
          <a-switch v-model:checked="editForm.anonymousMode" />
          <span class="org-detail__switch-hint">启用后阅卷教师不可见考生身份</span>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea
            v-model:value="editForm.remark"
            :rows="3"
            :maxlength="200"
            placeholder="可选，记录组织目的 / 范围"
            show-count
          />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { UserListItemDto } from '@/apis/edu/admin-user'
import type { ExamDetailVO } from '@/apis/mark/exam'
import type {
  AllocationPolicySaveRequest,
  AllocationUnitCode,
  AnonymityModeCode,
  AnonymousTokenPolicyCode,
  MarkingAllocationModeCode,
  MarkingOrganizationStatusCode,
  MarkingOrganizationVO,
  MarkingReassignModeCode,
  OrganizationUpdateRequest,
  QuestionGroupSaveRequest,
  QuestionMarkingGroupStatusCode,
  QuestionMarkingGroupVO,
  RecyclePolicySaveRequest,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ArrowRightOutlined from '@ant-design/icons-vue/ArrowRightOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminGetUserPage } from '@/apis/edu/admin-user'
import { getExamDetail, getExamTemplate } from '@/apis/mark/exam'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/grading-experience'
import {
  ALLOCATION_UNIT_LABEL,
  ANONYMITY_MODE_LABEL,
  ANONYMOUS_TOKEN_POLICY_LABEL,
  closeQuestionGroup,
  deleteOrganization,
  deleteQuestionGroup,
  getOrganizationById,
  isMarkingOrgNotCreatedError,
  MARKING_ALLOCATION_MODE_LABEL,
  MARKING_ORGANIZATION_STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE,
  MARKING_REASSIGN_MODE_LABEL,
  QUESTION_GROUP_STATUS_LABEL,
  QUESTION_GROUP_STATUS_TONE,
  saveAllocationPolicy,
  saveQuestionGroup,
  saveRecyclePolicy,
  updateOrganization,
  updateOrganizationStatus,
  validateMarkingOrganizationContract,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { StageWorkbenchShell } from '@/components/workbench'
import { useUserStore } from '@/stores/modules/user'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminMarkingOrganizationDetail' })

const MARKING_TEACHER_OPTION_PAGE_SIZE = 100

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const organizationId = computed(() => String(route.params.organizationId || ''))

const organization = ref<MarkingOrganizationVO | null>(null)
const examDetail = ref<ExamDetailVO | null>(null)
const examId = computed(() => String(organization.value?.examId || ''))
const loading = ref(false)
// D-9 错误态：仅当后端返回非“未创建组织”业务码时才上报
const organizationLoadError = ref<Error | null>(null)
const activeTab = ref<'info' | 'policy' | 'status'>('info')

const groups = computed<QuestionMarkingGroupVO[]>(() => organization.value?.groups ?? [])
const organizationExamLabel = computed(() => {
  if (!organization.value) return '请重新进入阅卷组织详情'
  return organization.value.examNo
    ? `${organization.value.examName}（${organization.value.examNo}）`
    : organization.value.examName
})
const canManageOrganization = computed(
  () => !!examDetail.value?.createUser && examDetail.value.createUser === userStore.userInfo.userId,
)

/** P1-3: 阅卷组织步骤引导 — 根据当前状态给出下一步建议 */
const organizationStepAlertTone = computed(() => {
  if (!organization.value) return 'info'
  const status = organization.value.organizationStatus
  if (status === 'ORG_DRAFT' || status === 'ORG_CONFIGURED') return 'warning'
  if (status === 'TRIAL_MARKING') return 'info'
  if (status === 'FORMAL_MARKING') return 'success'
  return 'info'
})

const organizationStepAlertTitle = computed(() => {
  if (!organization.value) return ''
  const status = organization.value.organizationStatus
  if (status === 'ORG_DRAFT') return '第1步：配置题组与分配策略'
  if (status === 'ORG_CONFIGURED') return '第2步：开始试评校准'
  if (status === 'TRIAL_MARKING') return '第3步：试评完成后启动正评'
  if (status === 'FORMAL_MARKING') return '第4步：正评进行中，前往阅卷任务池'
  if (status === 'QUALITY_REVIEW') return '第5步：质量抽检与仲裁'
  return ''
})

const organizationStepAlertDescription = computed(() => {
  if (!organization.value) return ''
  const status = organization.value.organizationStatus
  if (status === 'ORG_DRAFT') return '先配置题组（分配要批阅的题目），再保存分配策略（设置分配模式、匿名模式）'
  if (status === 'ORG_CONFIGURED') return '题组和策略已就绪，请创建试评会话，组织阅卷教师校准评分标准'
  if (status === 'TRIAL_MARKING') return '试评校准完成后，请进入「试评 / 正评」页面启动正式阅卷会话'
  if (status === 'FORMAL_MARKING') return '正评已启动，阅卷教师可在任务池中 claim 并批阅。请持续关注进度看板'
  if (status === 'QUALITY_REVIEW') return '可对已批阅答卷进行抽检，如有评分差异提交仲裁处理'
  return ''
})

function guardOrganizationOwnerAction(): boolean {
  if (canManageOrganization.value) return true
  message.warning('仅考试创建人可修改阅卷安排')
  return false
}

const editDrawerOpen = ref(false)
const updating = ref(false)
const deleting = ref(false)
const editFormRef = ref<FormInstance>()

interface EditForm {
  leaderUserId?: string
  anonymousMode: boolean
  remark?: string
}

const editForm = reactive<EditForm>({
  leaderUserId: undefined,
  anonymousMode: true,
  remark: '',
})

const editRules: Record<string, Rule[]> = {
  leaderUserId: [{ required: true, message: '请选择阅卷组长', trigger: 'change' }],
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

async function loadOrganization(): Promise<void> {
  if (!organizationId.value) {
    organization.value = null
    return
  }
  loading.value = true
  organizationLoadError.value = null
  try {
    const nextOrganization = await getOrganizationById({ organizationId: organizationId.value })
    validateMarkingOrganizationContract(nextOrganization)
    organization.value = nextOrganization
    examDetail.value = await getExamDetail(nextOrganization.examId)
  } catch (error) {
    organization.value = null
    examDetail.value = null
    if (!(error instanceof Error && isMarkingOrgNotCreatedError(error))) {
      organizationLoadError.value = toUserError(error, '阅卷组织详情加载失败')
    }
  } finally {
    loading.value = false
  }
}

const groupColumns: ColumnType<QuestionMarkingGroupVO>[] = [
  { title: '题组名称', key: 'groupName', dataIndex: 'groupName', width: 220 },
  { title: '负责题目', key: 'questions', width: 280 },
  { title: '阅卷教师', key: 'reviewers', width: 240 },
  { title: '题组组长', key: 'leaderUser', width: 160 },
  { title: '状态', key: 'groupStatus', width: 100 },
  { title: '创建时间', key: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 220 },
]

const teacherList = ref<UserListItemDto[]>([])
const teacherLoading = ref(false)

const teacherOptions = computed(() =>
  teacherList.value.map((item) => ({
    value: item.id,
    label: item.identifierNumber ? `${item.nickName} (${item.identifierNumber})` : item.nickName,
  })),
)

async function loadTeachers(): Promise<void> {
  if (teacherList.value.length > 0) return
  teacherLoading.value = true
  try {
    teacherList.value = await readAllPages(
      (pageNum) => adminGetUserPage({
        pageNum,
        pageSize: MARKING_TEACHER_OPTION_PAGE_SIZE,
        roleKey: 'SCH_TECH',
      }),
      '阅卷教师列表加载失败，请稍后重试',
    )
  } catch (error) {
    showUserError(error, '阅卷教师列表加载失败')
  } finally {
    teacherLoading.value = false
  }
}

interface QuestionOption {
  value: string
  label: string
}

const questionOptions = ref<QuestionOption[]>([])
const loadedQuestionTemplateExamId = ref<string | null>(null)
const templateLoading = ref(false)

async function loadQuestionTemplates(): Promise<void> {
  const currentExamId = examId.value
  if (!currentExamId) return
  if (loadedQuestionTemplateExamId.value === currentExamId && questionOptions.value.length > 0)
    return
  templateLoading.value = true
  try {
    const tpl = await getExamTemplate(currentExamId)
    questionOptions.value = (tpl.questions ?? []).map((q) => ({
      value: q.questionTemplateId,
      label: `第 ${q.questionNo} 题（${strictEnumLabel(QUESTION_TYPE_LABEL, q.questionType, '题型')}，满分 ${q.fullScore}）`,
    }))
    loadedQuestionTemplateExamId.value = currentExamId
  } catch (error) {
    showUserError(error, '考试题目模板加载失败')
  } finally {
    templateLoading.value = false
  }
}

const groupModalOpen = ref(false)
const savingGroup = ref(false)
const groupFormRef = ref<FormInstance>()

interface GroupForm {
  groupId?: string
  groupName: string
  leaderUserId?: string
  questionTemplateIds: string[]
  reviewerUserIds: string[]
  wholePaperGroup: boolean
}

const groupForm = reactive<GroupForm>({
  groupId: undefined,
  groupName: '',
  leaderUserId: undefined,
  questionTemplateIds: [],
  reviewerUserIds: [],
  wholePaperGroup: false,
})
const groupModalTitle = computed(() => (groupForm.groupId ? '编辑题组' : '新建题组'))
const groupActionLoadingId = ref<string>()

const groupRules: Record<string, Rule[]> = {
  groupName: [
    { required: true, message: '请输入题组名称', trigger: 'blur' },
    { max: 50, message: '题组名称最多 50 字', trigger: 'blur' },
  ],
  leaderUserId: [{ required: true, message: '请选择题组组长', trigger: 'change' }],
  questionTemplateIds: [
    {
      validator: (_rule, value: string[]) => {
        if (groupForm.wholePaperGroup) {
          return Promise.resolve()
        }
        if (!value || value.length === 0) {
          return Promise.reject(new Error('请至少选择 1 道题目'))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
  reviewerUserIds: [
    {
      required: true,
      type: 'array',
      min: 1,
      message: '请至少选择 1 名阅卷教师',
      trigger: 'change',
    },
  ],
}

function openGroupModal(): void {
  if (!guardOrganizationOwnerAction()) return
  groupForm.groupId = undefined
  groupForm.groupName = ''
  groupForm.leaderUserId = undefined
  groupForm.questionTemplateIds = []
  groupForm.reviewerUserIds = []
  groupForm.wholePaperGroup = false
  groupModalOpen.value = true
  void loadTeachers()
  void loadQuestionTemplates()
}

function openGroupEdit(record: QuestionMarkingGroupVO): void {
  if (!guardOrganizationOwnerAction()) return
  groupForm.groupId = record.id
  groupForm.groupName = record.groupName
  groupForm.leaderUserId = record.leaderUserId
  groupForm.questionTemplateIds = record.questions.map((question) => question.questionTemplateId)
  groupForm.reviewerUserIds = record.reviewers.map((reviewer) => reviewer.reviewerUserId)
  groupForm.wholePaperGroup = record.questions.length === 0 && record.groupName.includes('整卷')
  groupModalOpen.value = true
  void loadTeachers()
  void loadQuestionTemplates()
}

async function submitGroup(): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  if (!organizationId.value || !groupFormRef.value) return
  try {
    await groupFormRef.value.validate()
  } catch {
    return
  }
  savingGroup.value = true
  try {
    const request: QuestionGroupSaveRequest = {
      organizationId: organizationId.value,
      groupId: groupForm.groupId,
      groupName: groupForm.groupName,
      leaderUserId: groupForm.leaderUserId!,
      questionTemplateIds: groupForm.wholePaperGroup ? [] : groupForm.questionTemplateIds,
      wholePaperGroup: groupForm.wholePaperGroup || undefined,
      reviewerUserIds: groupForm.reviewerUserIds,
    }
    await saveQuestionGroup(request)
    message.success(groupForm.groupId ? '题组已更新' : '题组已创建')
    groupModalOpen.value = false
    await loadOrganization()
  } catch (error) {
    const fallback = groupForm.groupId ? '更新题组失败' : '创建题组失败'
    showUserError(error, fallback)
  } finally {
    savingGroup.value = false
  }
}

function canEditGroup(record: QuestionMarkingGroupVO): boolean {
  return canManageOrganization.value && record.groupStatus !== 'GROUP_CLOSED'
}

function canDeleteGroup(record: QuestionMarkingGroupVO): boolean {
  return canManageOrganization.value && record.groupStatus === 'GROUP_DRAFT'
}

function canCloseGroup(record: QuestionMarkingGroupVO): boolean {
  return (
    canManageOrganization.value
    && (record.groupStatus === 'GROUP_ACTIVE' || record.groupStatus === 'GROUP_CONFIGURED')
  )
}

async function submitGroupDelete(record: QuestionMarkingGroupVO): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  groupActionLoadingId.value = record.id
  try {
    await deleteQuestionGroup({ groupId: record.id })
    message.success('题组已删除')
    await loadOrganization()
  } catch (error) {
    showUserError(error, '题组删除失败')
  } finally {
    groupActionLoadingId.value = undefined
  }
}

async function submitGroupClose(record: QuestionMarkingGroupVO): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  groupActionLoadingId.value = record.id
  try {
    await closeQuestionGroup({ groupId: record.id })
    message.success('题组已关闭')
    await loadOrganization()
  } catch (error) {
    showUserError(error, '题组关闭失败')
  } finally {
    groupActionLoadingId.value = undefined
  }
}

function openEditDrawer(): void {
  if (!guardOrganizationOwnerAction()) return
  if (!organization.value) return
  editForm.leaderUserId = organization.value.leaderUserId
  editForm.anonymousMode = Boolean(organization.value.anonymousMode)
  editForm.remark = organization.value.remark || ''
  editDrawerOpen.value = true
  void loadTeachers()
}

async function submitUpdate(): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  if (!organization.value || !editFormRef.value) return
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }
  updating.value = true
  try {
    const request: OrganizationUpdateRequest = {
      organizationId: organization.value.id,
      leaderUserId: editForm.leaderUserId!,
      anonymousMode: editForm.anonymousMode,
      remark: editForm.remark?.trim() || undefined,
    }
    const nextOrganization = await updateOrganization(request)
    validateMarkingOrganizationContract(nextOrganization)
    organization.value = nextOrganization
    message.success('阅卷组织已更新')
    editDrawerOpen.value = false
  } catch (error) {
    showUserError(error, '阅卷组织更新失败')
  } finally {
    updating.value = false
  }
}

async function submitDelete(): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  if (!organization.value) return
  deleting.value = true
  try {
    await deleteOrganization({ organizationId: organization.value.id })
    message.success('阅卷组织已删除')
    await router.push({
      name: route.path.startsWith('/teacher')
        ? 'TeacherMarkingOrganizationIndex'
        : 'AdminMarkingOrganizationIndex',
    })
  } catch (error) {
    showUserError(error, '阅卷组织删除失败')
  } finally {
    deleting.value = false
  }
}

interface PolicyForm {
  allocationGroupId?: string
  allocationMode: MarkingAllocationModeCode
  allocationUnit: AllocationUnitCode
  anonymityMode: AnonymityModeCode
  randomQuestionSampleSize?: number
  batchSize: number
  loadLimit: number
  anonymousTokenPolicy: AnonymousTokenPolicyCode
  recycleGroupId?: string
  timeoutMinutes?: number
  maxPendingCount?: number
  reassignMode?: MarkingReassignModeCode
}

const policyForm = reactive<PolicyForm>({
  allocationGroupId: undefined,
  allocationMode: 'BY_QUESTION',
  allocationUnit: 'SELECTED_QUESTIONS',
  anonymityMode: 'ANONYMOUS',
  randomQuestionSampleSize: undefined,
  batchSize: 20,
  loadLimit: 50,
  anonymousTokenPolicy: 'PER_EXAM',
  recycleGroupId: undefined,
  timeoutMinutes: 60,
  maxPendingCount: 30,
  reassignMode: 'AUTO',
})

const groupSelectOptions = computed(() => [
  ...groups.value.map((g) => ({ value: g.id, label: g.groupName })),
])

// 从后端枚举 LABEL 对象直接派生 select options。
const ALLOCATION_MODE_OPTIONS = Object.entries(MARKING_ALLOCATION_MODE_LABEL).map(
  ([value, label]) => ({ value, label }),
)

const ALLOCATION_UNIT_OPTIONS = Object.entries(ALLOCATION_UNIT_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const ANONYMITY_MODE_OPTIONS = Object.entries(ANONYMITY_MODE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const REASSIGN_MODE_OPTIONS = Object.entries(MARKING_REASSIGN_MODE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const ANONYMOUS_TOKEN_OPTIONS = Object.entries(ANONYMOUS_TOKEN_POLICY_LABEL).map(
  ([value, label]) => ({ value, label }),
)

const savingAllocation = ref(false)
async function submitAllocation(): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  if (!organizationId.value) return
  savingAllocation.value = true
  try {
    const request: AllocationPolicySaveRequest = {
      organizationId: organizationId.value,
      groupId: policyForm.allocationGroupId,
      allocationMode: policyForm.allocationMode,
      allocationUnit: policyForm.allocationUnit,
      anonymityMode: policyForm.anonymityMode,
      randomQuestionSampleSize: policyForm.randomQuestionSampleSize,
      batchSize: policyForm.batchSize,
      loadLimit: policyForm.loadLimit,
      anonymousTokenPolicy: policyForm.anonymousTokenPolicy,
      dualReviewEnabled: false,
    }
    await saveAllocationPolicy(request)
    message.success('分配策略已保存')
  } catch (error) {
    showUserError(error, '阅卷任务分配策略保存失败')
  } finally {
    savingAllocation.value = false
  }
}

const savingRecycle = ref(false)
async function submitRecycle(): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  if (!organizationId.value) return
  savingRecycle.value = true
  try {
    const request: RecyclePolicySaveRequest = {
      organizationId: organizationId.value,
      groupId: policyForm.recycleGroupId,
      timeoutMinutes: policyForm.timeoutMinutes,
      maxPendingCount: policyForm.maxPendingCount,
      reassignMode: policyForm.reassignMode,
    }
    await saveRecyclePolicy(request)
    message.success('回收策略已保存')
  } catch (error) {
    showUserError(error, '阅卷任务回收策略保存失败')
  } finally {
    savingRecycle.value = false
  }
}

const targetStatus = ref<MarkingOrganizationStatusCode | undefined>(undefined)
const updatingStatus = ref(false)

/**
 * 阅卷组织状态推进流转，与后端 OrganizationStatus 业务状态机保持一致。
 */
const STATUS_TRANSITIONS: Record<MarkingOrganizationStatusCode, MarkingOrganizationStatusCode[]> = {
  ORG_DRAFT: ['ORG_CONFIGURED'],
  ORG_CONFIGURED: ['TRIAL_MARKING'],
  TRIAL_MARKING: ['FORMAL_MARKING'],
  FORMAL_MARKING: ['QUALITY_REVIEW'],
  QUALITY_REVIEW: ['CLOSED'],
  CLOSED: [],
}

const statusTransitionOptions = computed(() => {
  const current = organization.value?.organizationStatus
  if (!current) return []
  return STATUS_TRANSITIONS[current].map((code) => ({
    value: code,
    label: strictEnumLabel(MARKING_ORGANIZATION_STATUS_LABEL, code, '阅卷组织状态'),
  }))
})

async function submitStatusUpdate(): Promise<void> {
  if (!guardOrganizationOwnerAction()) return
  if (!organizationId.value || !targetStatus.value) return
  updatingStatus.value = true
  try {
    await updateOrganizationStatus({
      organizationId: organizationId.value,
      targetStatus: targetStatus.value,
    })
    message.success('组织状态已推进')
    targetStatus.value = undefined
    await loadOrganization()
  } catch (error) {
    showUserError(error, '阅卷组织状态推进失败')
  } finally {
    updatingStatus.value = false
  }
}

function goSessions(): void {
  void router.push({
    name: route.path.startsWith('/teacher')
      ? 'TeacherMarkingOrganizationSessions'
      : 'AdminMarkingOrganizationSessions',
    params: { organizationId: organizationId.value },
  })
}

// 严格 typed helper：题组 groupStatus 是后端合同必返枚举。
function groupStatusTone(status: QuestionMarkingGroupStatusCode): BadgeTone {
  return strictEnumTone(QUESTION_GROUP_STATUS_TONE, status, '题组状态')
}

function groupStatusLabel(status: QuestionMarkingGroupStatusCode): string {
  return strictEnumLabel(QUESTION_GROUP_STATUS_LABEL, status, '题组状态')
}

onMounted(loadOrganization)
</script>

<style lang="scss" scoped>
.org-detail {
  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__empty {
    padding: 48px 0;
  }

  &__switch-hint {
    margin-left: 8px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }
}

.detail-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 16px;
  }
}

.info-descriptions {
  :deep(.ant-descriptions-item-label) {
    width: 140px;
    color: var(--dp-text-secondary, #475569);
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 12px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }
}

.policy-form {
  .subsection-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--dp-text-primary, #0f172a);
  }

  .policy-hint {
    margin-top: 6px;
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
    line-height: 1.5;
  }
}

.status-form {
  max-width: 480px;
}
</style>
