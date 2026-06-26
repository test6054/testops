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
            v-if="organization && canManageExamOwner"
            variant="outline"
            size="sm"
            @click="openEditDrawer"
          >
            编辑组织
          </UiButton>
          <a-popconfirm
            v-if="organization && canManageExamOwner"
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

    <a-skeleton v-if="loading" active :paragraph="{ rows: 4 }" />

    <UiEmpty
      v-else-if="!organization"
      description="暂无数据"
      class="org-detail__empty"
    />

    <a-spin v-else :spinning="loading">
      <section v-if="organization" class="org-detail__panel">
        <a-alert
          v-if="!canManageExamOwner"
          type="info"
          show-icon
          class="org-detail__readonly-banner"
          message="当前为只读视图"
          description="题组、策略与正评启动由考试主考老师配置。"
        />
        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="info" tab="基本信息 + 题组">
            <section class="org-detail__info">
              <h4 class="org-detail__info-title">基本信息</h4>
              <UiInfoGrid :columns="3">
                <UiInfoGridItem label="当前考试">
                  {{ organizationExamLabel }}
                </UiInfoGridItem>
                <UiInfoGridItem label="主考老师">
                  {{ organization.leaderUserName }}（{{ organization.leaderTeacherNo }}）
                </UiInfoGridItem>
                <UiInfoGridItem label="题组数量">
                  {{ organization.groups.length }} 组
                </UiInfoGridItem>
                <UiInfoGridItem label="匿名阅卷">
                  <UiTag :tone="organization.anonymousMode ? 'green' : 'gray'" size="sm">
                    {{ organization.anonymousMode ? '启用' : '关闭' }}
                  </UiTag>
                </UiInfoGridItem>
                <UiInfoGridItem label="创建时间">
                  {{ formatDateTime(organization.createTime) }}
                </UiInfoGridItem>
                <UiInfoGridItem label="更新时间">
                  {{ formatDateTime(organization.updateTime) }}
                </UiInfoGridItem>
              </UiInfoGrid>
              <div class="org-detail__remark">
                <span class="org-detail__remark-label">备注</span>
                <span class="org-detail__remark-value">
                  {{ organization.remark || '未填写组织备注' }}
                </span>
              </div>
            </section>

            <UiDataTable
              title="题组列表"
              pagination-mode="none"
              :columns="groupColumns"
              :data-source="filteredGroups"
              row-key="id"
              size="middle"
              :show-pagination="false"
              flat
              :total="filteredGroups.length"
              :sorted-info="groupTableSortedInfo"
              :empty-description="groupTableEmptyDescription"
              class="group-table student-detail-table__data-table org-detail__group-table"
            >
              <template #toolbar-left>
                <UiSearchBox
                  v-model="groupSearchKeyword"
                  class="org-detail__group-search"
                  placeholder="搜索题组名称、组长、阅卷教师、题号"
                  size="small"
                />
              </template>
              <template v-if="canManageExamOwner" #toolbar-right>
                <UiButton size="sm" @click="openGroupModal">
                  <template #icon><PlusOutlined /></template>
                  新建题组
                </UiButton>
              </template>
              <template v-if="canManageExamOwner" #empty-action>
                <UiButton size="sm" @click="openGroupModal">
                  <template #icon><PlusOutlined /></template>
                  新建题组
                </UiButton>
              </template>
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
            <a-form v-if="canManageExamOwner" :model="policyForm" layout="vertical" class="policy-form">
              <a-row :gutter="16">
                <a-col :xs="24" :lg="12">
                  <h4 class="subsection-title">任务分配策略</h4>
                  <a-form-item label="策略适用范围">
                    <a-select
                      v-model:value="policyForm.allocationGroupId"
                      placeholder="选择题组（留空表示组织级默认）"
                      :options="groupSelectOptions"
                      allow-clear
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="分配模式" required>
                    <a-select
                      v-model:value="policyForm.allocationMode"
                      :options="ALLOCATION_MODE_OPTIONS"
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="批阅任务单元" required>
                    <a-select
                      v-model:value="policyForm.allocationUnit"
                      :options="ALLOCATION_UNIT_OPTIONS"
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="匿名模式" required>
                    <a-select
                      v-model:value="policyForm.anonymityMode"
                      :options="ANONYMITY_MODE_OPTIONS"
                      :disabled="!canManageExamOwner"
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
                      :disabled="!canManageExamOwner"
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
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="教师最大待处理任务数">
                    <a-input-number
                      v-model:value="policyForm.loadLimit"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="匿名令牌策略">
                    <a-select
                      v-model:value="policyForm.anonymousTokenPolicy"
                      :options="ANONYMOUS_TOKEN_OPTIONS"
                      allow-clear
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <UiButton
                    v-if="canManageExamOwner"
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
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="超时时间（分钟）">
                    <a-input-number
                      v-model:value="policyForm.timeoutMinutes"
                      :min="1"
                      :max="1440"
                      style="width: 100%"
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="教师最大待处理任务数">
                    <a-input-number
                      v-model:value="policyForm.maxPendingCount"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <a-form-item label="再分配模式">
                    <a-select
                      v-model:value="policyForm.reassignMode"
                      :options="REASSIGN_MODE_OPTIONS"
                      allow-clear
                      :disabled="!canManageExamOwner"
                    />
                  </a-form-item>
                  <UiButton
                    v-if="canManageExamOwner"
                    :loading="savingRecycle"
                    @click="submitRecycle"
                  >
                    <template #icon><SaveOutlined /></template>
                    保存回收策略
                  </UiButton>
                </a-col>
              </a-row>
            </a-form>
            <a-row v-else :gutter="16" class="policy-form">
              <a-col :xs="24" :lg="12">
                <h4 class="subsection-title">任务分配策略</h4>
                <a-descriptions bordered size="small" :column="1">
                  <a-descriptions-item label="策略适用范围">
                    {{ policyScopeLabel(policyForm.allocationGroupId) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="分配模式">
                    {{ policyOptionLabel(ALLOCATION_MODE_OPTIONS, policyForm.allocationMode) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="批阅任务单元">
                    {{ policyOptionLabel(ALLOCATION_UNIT_OPTIONS, policyForm.allocationUnit) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="匿名模式">
                    {{ policyOptionLabel(ANONYMITY_MODE_OPTIONS, policyForm.anonymityMode) }}
                  </a-descriptions-item>
                  <a-descriptions-item
                    v-if="policyForm.allocationUnit === 'RANDOM_QUESTIONS'"
                    label="随机题目抽样数量"
                  >
                    {{ policyForm.randomQuestionSampleSize ?? '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="每批分配任务数">
                    {{ policyForm.batchSize }}
                  </a-descriptions-item>
                  <a-descriptions-item label="教师最大待处理任务数">
                    {{ policyForm.loadLimit }}
                  </a-descriptions-item>
                  <a-descriptions-item label="匿名令牌策略">
                    {{ policyOptionLabel(ANONYMOUS_TOKEN_OPTIONS, policyForm.anonymousTokenPolicy) }}
                  </a-descriptions-item>
                </a-descriptions>
              </a-col>
              <a-col :xs="24" :lg="12">
                <h4 class="subsection-title">任务回收策略</h4>
                <a-descriptions bordered size="small" :column="1">
                  <a-descriptions-item label="策略适用范围">
                    {{ policyScopeLabel(policyForm.recycleGroupId) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="超时时间（分钟）">
                    {{ policyForm.timeoutMinutes ?? '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="教师最大待处理任务数">
                    {{ policyForm.maxPendingCount ?? '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="再分配模式">
                    {{ policyOptionLabel(REASSIGN_MODE_OPTIONS, policyForm.reassignMode) }}
                  </a-descriptions-item>
                </a-descriptions>
              </a-col>
            </a-row>
          </a-tab-pane>

          <a-tab-pane v-if="canReassignRecycledTasks" key="recycled" tab="回收待分配">
            <RecycledTaskReassignPanel
              :exam-id="examId"
              :groups="groups"
              :view-all-recycled="canViewAllRecycledTasks"
              :leader-group-ids="leaderGroupIds"
            />
          </a-tab-pane>

          <a-tab-pane v-if="canManageExamOwner" key="launch" tab="快速启动">
            <FormalSessionPanel
              :organization-id="organizationId"
              :group-options="groupSelectOptions"
              :group-allocation-units="groupAllocationUnitMap"
              :sessions="formalSessions"
              :can-manage="canManageExamOwner"
              @refresh="loadFormalSessions"
            />
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
import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import type {
  AllocationPolicySaveRequest,
  AllocationPolicyVO,
  AllocationUnitCode,
  AnonymousTokenPolicyCode,
  FormalSessionVO,
  MarkingAllocationModeCode,
  MarkingOrganizationVO,
  MarkingReassignModeCode,
  OrganizationUpdateRequest,
  QuestionGroupSaveRequest,
  QuestionMarkingGroupStatusCode,
  QuestionMarkingGroupVO,
  RecyclePolicySaveRequest, RecyclePolicyVO
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminGetUserPage } from '@/apis/edu/admin-user'
import { getExamDetail } from '@/apis/mark/exam'
import { getExamTemplate } from '@/apis/mark/exam-template'
import { QUESTION_TYPE_LABEL } from '@/apis/mark/question-type'
import { ANONYMITY_MODE_LABEL, ANONYMITY_MODE_OPTIONS } from '@/apis/mark/anonymity-mode'
import { ALLOCATION_UNIT_LABEL, ANONYMOUS_TOKEN_POLICY_LABEL, closeQuestionGroup, deleteOrganization, deleteQuestionGroup, getOrganizationById, isMarkingOrgNotCreatedError, listFormalSessions, listMarkingPolicies, MARKING_ALLOCATION_MODE_LABEL, MARKING_ORGANIZATION_STATUS_LABEL, MARKING_ORGANIZATION_STATUS_TONE, MARKING_REASSIGN_MODE_LABEL, QUESTION_GROUP_STATUS_LABEL, QUESTION_GROUP_STATUS_TONE, saveAllocationPolicy, saveQuestionGroup, saveRecyclePolicy, updateOrganization, validateFormalSessionContract, validateMarkingOrganizationContract, validateMarkingPolicyListContract } from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInfoGrid from '@/components/ui-guide/ui/InfoGrid.vue'
import UiInfoGridItem from '@/components/ui-guide/ui/InfoGridItem.vue'
import UiSearchBox from '@/components/ui-guide/ui/SearchBox.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkingOrgPermission } from '@/composables/useMarkingOrgPermission'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  resolveMarkingOrganizationDetailRoute,
  resolveMarkingOrganizationIndexRoute,
  resolveMarkingOrganizationSessionsRoute,
} from '@/utils/marking-organization-navigation'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import FormalSessionPanel from '@/views/admin/marking-organization/components/FormalSessionPanel.vue'
import RecycledTaskReassignPanel from '@/views/admin/marking-organization/components/RecycledTaskReassignPanel.vue'

defineOptions({ name: 'AdminMarkingOrganizationDetail' })

const MARKING_TEACHER_OPTION_PAGE_SIZE = 100

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { refreshSnapshot } = useWorkspaceExamId()

const organizationId = computed(() => String(route.params.organizationId || ''))
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')
const routeExamId = computed(() => String(route.params.examId || ''))

const organization = ref<MarkingOrganizationVO | null>(null)
const examDetail = ref<ExamDetailVO | null>(null)
const examId = computed(() => String(organization.value?.examId || ''))
const workspaceExamId = computed(() => {
  if (isExamWorkspaceRoute.value && routeExamId.value) {
    return routeExamId.value
  }
  return examId.value
})
const activeExamId = computed(() => examId.value || workspaceExamId.value)
const loading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
const activeTab = ref<'info' | 'policy' | 'recycled' | 'launch'>('info')

const groups = computed<QuestionMarkingGroupVO[]>(() => organization.value?.groups ?? [])
const groupSearchKeyword = ref('')
const normalizedGroupSearchKeyword = computed(() => groupSearchKeyword.value.trim().toLowerCase())

/** 题组列表前端筛选：匹配名称、组长、阅卷教师、题号与题型 */
function matchesGroupSearch(group: QuestionMarkingGroupVO, keyword: string): boolean {
  if (group.groupName?.toLowerCase().includes(keyword)) {
    return true
  }
  if (group.leaderUserName?.toLowerCase().includes(keyword)) {
    return true
  }
  if (group.leaderTeacherNo?.toLowerCase().includes(keyword)) {
    return true
  }
  if (
    strictEnumLabel(QUESTION_GROUP_STATUS_LABEL, group.groupStatus, '题组状态')
      .toLowerCase()
      .includes(keyword)
  ) {
    return true
  }
  if (
    group.reviewers.some(
      (reviewer) =>
        reviewer.reviewerUserName?.toLowerCase().includes(keyword)
        || reviewer.reviewerTeacherNo?.toLowerCase().includes(keyword),
    )
  ) {
    return true
  }
  return group.questions.some(
    (question) =>
      String(question.questionNo).includes(keyword)
      || question.questionTypeMessage?.toLowerCase().includes(keyword),
  );
}

const filteredGroups = computed(() => {
  const keyword = normalizedGroupSearchKeyword.value
  if (!keyword) {
    return groups.value
  }
  return groups.value.filter((group) => matchesGroupSearch(group, keyword))
})

const groupTableSortedInfo = computed(() => {
  if (!normalizedGroupSearchKeyword.value || groups.value.length === 0) {
    return ''
  }
  return `已筛选 ${filteredGroups.value.length} / ${groups.value.length} 个题组`
})

const groupTableEmptyDescription = computed(() => {
  if (groups.value.length === 0) {
    return '暂无题组，创建后可配置题目范围与阅卷教师'
  }
  if (normalizedGroupSearchKeyword.value) {
    return '未找到匹配题组，请调整搜索关键词'
  }
  return '暂无题组，创建后可配置题目范围与阅卷教师'
})
const organizationExamLabel = computed(() => {
  if (!organization.value) return '请重新进入阅卷组织详情'
  return organization.value.examNo
    ? `${organization.value.examName}（${organization.value.examNo}）`
    : organization.value.examName
})
const examCreateUserId = computed(() => examDetail.value?.createUser ?? organization.value?.examCreateUserId)
const { canManageExamOwner } = useMarkingOrgPermission(examCreateUserId, organization)

function guardExamOwnerAction(): boolean {
  if (canManageExamOwner.value) return true
  message.warning('仅考试主考老师可执行该操作')
  return false
}

const formalSessions = ref<FormalSessionVO[]>([])

async function loadFormalSessions(): Promise<void> {
  if (!organizationId.value) {
    formalSessions.value = []
    return
  }
  try {
    const sessions = await listFormalSessions({ organizationId: organizationId.value })
    sessions.forEach(validateFormalSessionContract)
    formalSessions.value = sessions
  } catch (error) {
    formalSessions.value = []
    showUserError(error, '正评会话加载失败')
  }
}

const canReassignRecycledTasks = computed(() => {
  if (!organization.value) {
    return false
  }
  const userId = userStore.userInfo.userId
  if (canManageExamOwner.value) {
    return true
  }
  return groups.value.some((group) => group.leaderUserId === userId)
})
const canViewAllRecycledTasks = computed(() => canManageExamOwner.value)
const leaderGroupIds = computed(() => {
  const userId = userStore.userInfo.userId
  return groups.value.filter((group) => group.leaderUserId === userId).map((group) => group.id)
})

const editDrawerOpen = ref(false)
const updating = ref(false)
const deleting = ref(false)
const editFormRef = ref<FormInstance>()

interface EditForm {
  anonymousMode: boolean
  remark?: string
}

const editForm = reactive<EditForm>({
  anonymousMode: true,
  remark: '',
})

const editRules: Record<string, Rule[]> = {
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

function resetPolicyState(): void {
  allocationPolicies.value = []
  recyclePolicies.value = []
  applyAllocationPolicyToForm()
  applyRecyclePolicyToForm()
}

/**
 * 工作台详情路由必须与组织真实 examId 对齐，否则阶段快照、回跳目标与当前操作对象会错位。
 */
async function alignWorkspaceRouteExamId(nextOrganization: MarkingOrganizationVO): Promise<boolean> {
  if (!isExamWorkspaceRoute.value) {
    return true
  }
  if (!nextOrganization.examId || routeExamId.value === nextOrganization.examId) {
    return true
  }
  await router.replace(
    resolveMarkingOrganizationDetailRoute(nextOrganization.id, nextOrganization.examId),
  )
  return false
}

async function loadOrganization(): Promise<void> {
  if (!organizationId.value) {
    organization.value = null
    examDetail.value = null
    groupSearchKeyword.value = ''
    resetPolicyState()
    return
  }
  loading.value = true
  try {
    const nextOrganization = await getOrganizationById({ organizationId: organizationId.value })
    validateMarkingOrganizationContract(nextOrganization)
    if (!(await alignWorkspaceRouteExamId(nextOrganization))) {
      return
    }
    organization.value = nextOrganization
    examDetail.value = await getExamDetail(nextOrganization.examId)
    await loadMarkingPolicies()
    await loadFormalSessions()
  } catch (error) {
    organization.value = null
    examDetail.value = null
    resetPolicyState()
    if (!(error instanceof Error && isMarkingOrgNotCreatedError(error))) {
      showUserError(error, '阅卷组织详情加载失败')
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
  if (!guardExamOwnerAction()) return
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
  if (!guardExamOwnerAction()) return
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
  if (!guardExamOwnerAction()) return
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
    await refreshSnapshot()
  } catch (error) {
    const fallback = groupForm.groupId ? '更新题组失败' : '创建题组失败'
    showUserError(error, fallback)
  } finally {
    savingGroup.value = false
  }
}

function canEditGroup(record: QuestionMarkingGroupVO): boolean {
  return canManageExamOwner.value && record.groupStatus !== 'GROUP_CLOSED'
}

function canDeleteGroup(record: QuestionMarkingGroupVO): boolean {
  return canManageExamOwner.value && record.groupStatus === 'GROUP_DRAFT'
}

function canCloseGroup(record: QuestionMarkingGroupVO): boolean {
  return (
    canManageExamOwner.value
    && (record.groupStatus === 'GROUP_ACTIVE' || record.groupStatus === 'GROUP_CONFIGURED')
  )
}

async function submitGroupDelete(record: QuestionMarkingGroupVO): Promise<void> {
  if (!guardExamOwnerAction()) return
  groupActionLoadingId.value = record.id
  try {
    await deleteQuestionGroup({ groupId: record.id })
    message.success('题组已删除')
    await loadOrganization()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '题组删除失败')
  } finally {
    groupActionLoadingId.value = undefined
  }
}

async function submitGroupClose(record: QuestionMarkingGroupVO): Promise<void> {
  if (!guardExamOwnerAction()) return
  groupActionLoadingId.value = record.id
  try {
    await closeQuestionGroup({ groupId: record.id })
    message.success('题组已关闭')
    await loadOrganization()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '题组关闭失败')
  } finally {
    groupActionLoadingId.value = undefined
  }
}

function openEditDrawer(): void {
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  editForm.anonymousMode = Boolean(organization.value.anonymousMode)
  editForm.remark = organization.value.remark || ''
  editDrawerOpen.value = true
  void loadTeachers()
}

async function submitUpdate(): Promise<void> {
  if (!guardExamOwnerAction()) return
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
      anonymousMode: editForm.anonymousMode,
      remark: editForm.remark?.trim() || undefined,
    }
    const nextOrganization = await updateOrganization(request)
    validateMarkingOrganizationContract(nextOrganization)
    organization.value = nextOrganization
    message.success('阅卷组织已更新')
    editDrawerOpen.value = false
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷组织更新失败')
  } finally {
    updating.value = false
  }
}

async function submitDelete(): Promise<void> {
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  deleting.value = true
  try {
    await deleteOrganization({ organizationId: organization.value.id })
    await refreshSnapshot()
    message.success('阅卷组织已删除')
    await router.push(resolveMarkingOrganizationIndexRoute(activeExamId.value || undefined))
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

const allocationPolicies = ref<AllocationPolicyVO[]>([])
const recyclePolicies = ref<RecyclePolicyVO[]>([])

const DEFAULT_ALLOCATION_POLICY_FIELDS = {
  allocationMode: 'BY_QUESTION' as MarkingAllocationModeCode,
  allocationUnit: 'SELECTED_QUESTIONS' as AllocationUnitCode,
  anonymityMode: 'ANONYMOUS' as AnonymityModeCode,
  randomQuestionSampleSize: undefined as number | undefined,
  batchSize: 20,
  loadLimit: 50,
  anonymousTokenPolicy: 'PER_EXAM' as AnonymousTokenPolicyCode,
}

const DEFAULT_RECYCLE_POLICY_FIELDS = {
  timeoutMinutes: 60,
  maxPendingCount: 30,
  reassignMode: 'AUTO' as MarkingReassignModeCode,
}

function findPolicyByGroup<T extends { groupId?: string | null }>(
  policies: T[],
  groupId?: string,
): T | undefined {
  if (groupId) {
    return policies.find((item) => item.groupId === groupId)
  }
  return policies.find((item) => item.groupId == null)
}

function applyAllocationPolicyToForm(): void {
  const saved = findPolicyByGroup(allocationPolicies.value, policyForm.allocationGroupId)
  if (saved) {
    policyForm.allocationMode = saved.allocationMode
    policyForm.allocationUnit = saved.allocationUnit
    policyForm.anonymityMode = saved.anonymityMode
    policyForm.randomQuestionSampleSize = saved.randomQuestionSampleSize
    policyForm.batchSize = saved.batchSize
    policyForm.loadLimit = saved.loadLimit
    policyForm.anonymousTokenPolicy = saved.anonymousTokenPolicy
    return
  }
  Object.assign(policyForm, DEFAULT_ALLOCATION_POLICY_FIELDS)
}

function applyRecyclePolicyToForm(): void {
  const saved = findPolicyByGroup(recyclePolicies.value, policyForm.recycleGroupId)
  if (saved) {
    policyForm.timeoutMinutes = saved.timeoutMinutes
    policyForm.maxPendingCount = saved.maxPendingCount
    policyForm.reassignMode = saved.reassignMode
    return
  }
  Object.assign(policyForm, DEFAULT_RECYCLE_POLICY_FIELDS)
}

async function loadMarkingPolicies(): Promise<void> {
  if (!organizationId.value) {
    allocationPolicies.value = []
    recyclePolicies.value = []
    applyAllocationPolicyToForm()
    applyRecyclePolicyToForm()
    return
  }
  try {
    const response = await listMarkingPolicies({ organizationId: organizationId.value })
    validateMarkingPolicyListContract(response)
    allocationPolicies.value = response.allocationPolicies ?? []
    recyclePolicies.value = response.recyclePolicies ?? []
    applyAllocationPolicyToForm()
    applyRecyclePolicyToForm()
  } catch (error) {
    showUserError(error, '阅卷任务策略加载失败')
    resetPolicyState()
  }
}

watch(() => policyForm.allocationGroupId, applyAllocationPolicyToForm)
watch(() => policyForm.recycleGroupId, applyRecyclePolicyToForm)

const groupSelectOptions = computed(() => [
  ...groups.value.map((g) => ({ value: g.id, label: g.groupName })),
])

const groupAllocationUnitMap = computed(() => {
  const map: Record<string, AllocationUnitCode> = {}
  const defaultAllocationUnit = allocationPolicies.value.find((policy) => policy.groupId == null)?.allocationUnit
  for (const group of groups.value) {
    const groupPolicy = allocationPolicies.value.find((policy) => policy.groupId === group.id)
    const allocationUnit = groupPolicy?.allocationUnit ?? defaultAllocationUnit
    if (allocationUnit) {
      map[group.id] = allocationUnit
    }
  }
  return map
})

// 从后端枚举 LABEL 对象直接派生 select options。
const ALLOCATION_MODE_OPTIONS = Object.entries(MARKING_ALLOCATION_MODE_LABEL).map(
  ([value, label]) => ({ value, label }),
)

const ALLOCATION_UNIT_OPTIONS = Object.entries(ALLOCATION_UNIT_LABEL).map(([value, label]) => ({
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

function policyOptionLabel(
  options: Array<{ value: string, label: string }>,
  value?: string | null,
): string {
  if (!value) {
    return '—'
  }
  return options.find((item) => item.value === value)?.label ?? value
}

function policyScopeLabel(groupId?: string): string {
  if (!groupId) {
    return '组织级默认'
  }
  return groupSelectOptions.value.find((item) => item.value === groupId)?.label ?? groupId
}

const savingAllocation = ref(false)
async function submitAllocation(): Promise<void> {
  if (!guardExamOwnerAction()) return
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
    await loadMarkingPolicies()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷任务分配策略保存失败')
  } finally {
    savingAllocation.value = false
  }
}

const savingRecycle = ref(false)
async function submitRecycle(): Promise<void> {
  if (!guardExamOwnerAction()) return
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
    await loadMarkingPolicies()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '阅卷任务回收策略保存失败')
  } finally {
    savingRecycle.value = false
  }
}

function goSessions(): void {
  void router.push(resolveMarkingOrganizationSessionsRoute(
    organizationId.value,
    activeExamId.value || undefined,
  ))
}

// 严格 typed helper：题组 groupStatus 是后端合同必返枚举。
function groupStatusTone(status: QuestionMarkingGroupStatusCode): BadgeTone {
  return strictEnumTone(QUESTION_GROUP_STATUS_TONE, status, '题组状态')
}

function groupStatusLabel(status: QuestionMarkingGroupStatusCode): string {
  return strictEnumLabel(QUESTION_GROUP_STATUS_LABEL, status, '题组状态')
}

watch(() => [organizationId.value, routeExamId.value] as const, () => {
  void loadOrganization()
}, { immediate: true })

watch(
  () => [route.query.tab, canManageExamOwner.value] as const,
  ([tab, canManage]) => {
    if (typeof tab !== 'string') {
      return
    }
    if (tab === 'launch' && !canManage) {
      activeTab.value = 'info'
      return
    }
    activeTab.value = tab === 'launch' || tab === 'policy' || tab === 'recycled' ? tab : 'info'
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.org-detail {
  &__readonly-banner {
    margin-bottom: 12px;
  }

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

.org-detail__info {
  margin-bottom: 16px;
}

.org-detail__info-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--dp-text-primary, #0f172a);
}

.org-detail__remark {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding: 12px 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-lg, 8px);
  background: var(--dp-surface, #fff);
}

.org-detail__remark-label {
  flex-shrink: 0;
  min-width: 70px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-secondary, #475569);
}

.org-detail__remark-value {
  font-size: 14px;
  line-height: 1.6;
  color: var(--dp-text-primary, #0f172a);
  word-break: break-word;
}

.org-detail__group-table {
  margin-top: 16px;
}

.org-detail__group-search {
  width: min(320px, 100%);
}

.group-table {
  &__stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__item {
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary, #475569);
  }

  &__more {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
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
