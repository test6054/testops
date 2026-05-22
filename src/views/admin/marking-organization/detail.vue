<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="org-detail__context">
        <div class="org-detail__context-info">
          <h2 class="org-detail__title">阅卷交付 - 阅卷组织详情</h2>
          <UiTag
            v-if="organization?.organizationStatus"
            :tone="MARKING_ORGANIZATION_STATUS_TONE[organization.organizationStatus]"
            size="sm"
          >
            {{ MARKING_ORGANIZATION_STATUS_LABEL[organization.organizationStatus] }}
          </UiTag>
          <UiTag v-if="organization" tone="blue" size="sm">
            题组 {{ organization.groups?.length ?? 0 }}
          </UiTag>
          <UiTag v-if="organization?.anonymousMode" tone="green" size="sm"> 匿名阅卷 </UiTag>
        </div>
        <div class="org-detail__context-actions">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadOrganization">
            刷新
          </UiButton>
          <UiButton v-if="organization" variant="outline" size="sm" @click="openEditDrawer">
            编辑组织
          </UiButton>
          <a-popconfirm
            v-if="organization"
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
          <UiButton variant="primary" size="sm" @click="goSessions"> 试评 / 正评 </UiButton>
        </div>
      </div>
    </template>

    <!-- D-9 错误态：阅卷组织详情加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="organizationLoadError"
      :error="organizationLoadError"
      title="阅卷组织加载失败"
      :helper="`组织 ID：${organizationId}`"
      @retry="loadOrganization"
    />
    <UiEmpty
      v-else-if="!organization && !loading"
      description="未找到阅卷组织"
      class="org-detail__empty"
    />

    <a-spin v-else :spinning="loading">
      <section v-if="organization" class="org-detail__panel">
        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="info" tab="基本信息 + 题组">
            <a-descriptions
              :column="{ xs: 1, sm: 2, lg: 3 }"
              size="middle"
              bordered
              class="info-descriptions"
            >
              <a-descriptions-item label="组织ID">
                <a-typography-text copyable>{{ organization.id }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="考试ID">
                <a-typography-text copyable>{{ organization.examId }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="组长用户ID">
                {{ organization.leaderUserId || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="组织状态">
                <UiTag
                  v-if="organization.organizationStatus"
                  :tone="MARKING_ORGANIZATION_STATUS_TONE[organization.organizationStatus]"
                  size="sm"
                >
                  {{ MARKING_ORGANIZATION_STATUS_LABEL[organization.organizationStatus] }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="匿名阅卷">
                <UiTag :tone="organization.anonymousMode ? 'green' : 'gray'" size="sm">
                  {{ organization.anonymousMode ? '启用' : '关闭' }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="题组数量">
                {{ organization.groups?.length ?? 0 }} 组
              </a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">
                {{ organization.remark || '-' }}
              </a-descriptions-item>
            </a-descriptions>

            <div class="section-header">
              <h3>题组列表</h3>
              <UiButton size="sm" @click="openGroupModal">
                <template #icon><PlusOutlined /></template>
                新建题组
              </UiButton>
            </div>

            <UiEmpty v-if="!groups.length" description="尚未建立题组" />
            <UiDataTable
              v-else
              :columns="groupColumns"
              :data-source="groups"
              row-key="id"
              size="middle"
              :show-pagination="false"
              flat
              :total="groups.length"
              class="group-table"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'groupName'">
                  <a-typography-text strong>
                    {{ record.groupName || '-' }}
                  </a-typography-text>
                </template>
                <template v-else-if="column.key === 'questionTemplateIds'">
                  <UiTag tone="blue" size="sm">
                    {{ record.questionTemplateIds?.length ?? 0 }} 题
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'reviewerUserIds'">
                  <UiTag tone="purple" size="sm">
                    {{ record.reviewerUserIds?.length ?? 0 }} 人
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'groupStatus'">
                  <UiTag :tone="groupStatusTone(record.groupStatus)" size="sm">
                    {{ groupStatusLabel(record.groupStatus) }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'createTime'">
                  {{ formatTime(record.createTime) }}
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
                      :ok-button-props="{ danger: true, loading: groupActionLoadingId === record.id }"
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
                    />
                  </a-form-item>
                  <a-form-item label="分配模式" required>
                    <a-select
                      v-model:value="policyForm.allocationMode"
                      :options="ALLOCATION_MODE_OPTIONS"
                    />
                  </a-form-item>
                  <a-form-item label="每批分配任务数">
                    <a-input-number
                      v-model:value="policyForm.batchSize"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                    />
                  </a-form-item>
                  <a-form-item label="教师最大待处理任务数">
                    <a-input-number
                      v-model:value="policyForm.loadLimit"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                    />
                  </a-form-item>
                  <a-form-item label="匿名令牌策略">
                    <a-select
                      v-model:value="policyForm.anonymousTokenPolicy"
                      :options="ANONYMOUS_TOKEN_OPTIONS"
                      allow-clear
                    />
                  </a-form-item>
                  <a-form-item label="优先级规则（JSON / DSL）">
                    <a-textarea
                      v-model:value="policyForm.priorityRule"
                      :rows="2"
                      placeholder="可选，由后端策略层解析"
                    />
                  </a-form-item>
                  <UiButton :loading="savingAllocation" @click="submitAllocation">
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
                    />
                  </a-form-item>
                  <a-form-item label="超时时间（分钟）">
                    <a-input-number
                      v-model:value="policyForm.timeoutMinutes"
                      :min="1"
                      :max="1440"
                      style="width: 100%"
                    />
                  </a-form-item>
                  <a-form-item label="教师最大待处理任务数">
                    <a-input-number
                      v-model:value="policyForm.maxPendingCount"
                      :min="1"
                      :max="500"
                      style="width: 100%"
                    />
                  </a-form-item>
                  <a-form-item label="再分配模式">
                    <a-select
                      v-model:value="policyForm.reassignMode"
                      :options="REASSIGN_MODE_OPTIONS"
                      allow-clear
                    />
                  </a-form-item>
                  <UiButton :loading="savingRecycle" @click="submitRecycle">
                    <template #icon><SaveOutlined /></template>
                    保存回收策略
                  </UiButton>
                </a-col>
              </a-row>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="status" tab="状态推进">
            <a-alert
              type="info"
              show-icon
              message="阅卷组织按业务阶段推进；每次只能推进到允许的下一状态。"
              style="margin-bottom: 16px"
            />
            <a-form layout="vertical" class="status-form">
              <a-form-item label="当前状态">
                <UiTag
                  v-if="organization.organizationStatus"
                  :tone="MARKING_ORGANIZATION_STATUS_TONE[organization.organizationStatus]"
                  size="md"
                >
                  {{ MARKING_ORGANIZATION_STATUS_LABEL[organization.organizationStatus] }}
                </UiTag>
              </a-form-item>
              <a-form-item label="目标状态" required>
                <a-select
                  v-model:value="targetStatus"
                  placeholder="选择目标状态"
                  style="width: 320px"
                  :options="statusTransitionOptions"
                />
              </a-form-item>
              <UiButton
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
        <a-form-item label="关联题目" name="questionTemplateIds" required>
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
        <a-form-item label="组织ID">
          <a-input :value="organization?.id" disabled />
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
import type {
  AllocationPolicySavePayload,
  AnonymousTokenPolicyCode,
  MarkingAllocationModeCode,
  MarkingOrganizationStatusCode,
  MarkingOrganizationVO,
  MarkingReassignModeCode,
  OrganizationUpdatePayload,
  QuestionGroupSavePayload,
  QuestionMarkingGroupStatusCode,
  QuestionMarkingGroupVO,
  RecyclePolicySavePayload,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ArrowRightOutlined from '@ant-design/icons-vue/ArrowRightOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminGetUserPage } from '@/apis/edu/admin-user'
import { getExamTemplate } from '@/apis/mark/exam'
import {
  ANONYMOUS_TOKEN_POLICY_LABEL,
  closeQuestionGroup,
  deleteQuestionGroup,
  deleteOrganization,
  getOrganizationById,
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
} from '@/apis/mark/marking-organization'
import { UiButton, UiDataTable, UiDrawer, UiEmpty, UiErrorRetryPanel, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'

defineOptions({ name: 'AdminMarkingOrganizationDetail' })

const route = useRoute()
const router = useRouter()

const organizationId = computed(() => String(route.params.organizationId || ''))

const organization = ref<MarkingOrganizationVO | null>(null)
const examId = computed(() => String(organization.value?.examId || ''))
const loading = ref(false)
// D-9 错误态：仅当后端返回非“未找到”类错误时才上报
const organizationLoadError = ref<unknown>(null)
const activeTab = ref<'info' | 'policy' | 'status'>('info')

const groups = computed<QuestionMarkingGroupVO[]>(() => organization.value?.groups ?? [])

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
    organization.value = await getOrganizationById({ organizationId: organizationId.value })
  } catch (error) {
    organization.value = null
    const errMsg = error instanceof Error ? error.message : ''
    const isNotFound = errMsg.includes('未找到') || errMsg.includes('不存在')
    if (errMsg && !isNotFound) {
      organizationLoadError.value = error
    }
  } finally {
    loading.value = false
  }
}

const groupColumns: ColumnType<QuestionMarkingGroupVO>[] = [
  { title: '题组名称', key: 'groupName', dataIndex: 'groupName', width: 220 },
  { title: '题目数', key: 'questionTemplateIds', width: 100 },
  { title: '阅卷教师', key: 'reviewerUserIds', width: 100 },
  { title: '组长ID', key: 'leaderUserId', dataIndex: 'leaderUserId', width: 140 },
  { title: '状态', key: 'groupStatus', width: 100 },
  { title: '创建时间', key: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 220 },
]

const teacherList = ref<UserListItemDto[]>([])
const teacherLoading = ref(false)

const teacherOptions = computed(() =>
  teacherList.value.map((item) => ({
    value: item.id,
    label: item.identifierNumber
      ? `${item.nickName || item.userName} (${item.identifierNumber})`
      : item.nickName || item.userName,
  })),
)

async function loadTeachers(): Promise<void> {
  if (teacherList.value.length > 0) return
  teacherLoading.value = true
  try {
    const result = await adminGetUserPage({ pageNum: 1, pageSize: 200, roleKey: 'SCH_TECH' })
    teacherList.value = result.list ?? []
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '教师列表加载失败'
    message.error(errMsg)
  } finally {
    teacherLoading.value = false
  }
}

interface QuestionOption {
  value: string
  label: string
}

const questionOptions = ref<QuestionOption[]>([])
const templateLoading = ref(false)

async function loadQuestionTemplates(): Promise<void> {
  if (questionOptions.value.length > 0 || !examId.value) return
  templateLoading.value = true
  try {
    const tpl = await getExamTemplate(examId.value)
    questionOptions.value = (tpl.questions ?? []).map((q) => ({
      value: q.questionTemplateId,
      label: `第 ${q.questionNo} 题（${q.questionType}，满分 ${q.fullScore}）`,
    }))
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '题目模板加载失败'
    message.error(errMsg)
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
}

const groupForm = reactive<GroupForm>({
  groupId: undefined,
  groupName: '',
  leaderUserId: undefined,
  questionTemplateIds: [],
  reviewerUserIds: [],
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
    { required: true, type: 'array', min: 1, message: '请至少选择 1 道题目', trigger: 'change' },
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
  groupForm.groupId = undefined
  groupForm.groupName = ''
  groupForm.leaderUserId = undefined
  groupForm.questionTemplateIds = []
  groupForm.reviewerUserIds = []
  groupModalOpen.value = true
  void loadTeachers()
  void loadQuestionTemplates()
}

function openGroupEdit(record: QuestionMarkingGroupVO): void {
  groupForm.groupId = record.id
  groupForm.groupName = record.groupName || ''
  groupForm.leaderUserId = record.leaderUserId
  groupForm.questionTemplateIds = [...(record.questionTemplateIds ?? [])]
  groupForm.reviewerUserIds = [...(record.reviewerUserIds ?? [])]
  groupModalOpen.value = true
  void loadTeachers()
  void loadQuestionTemplates()
}

async function submitGroup(): Promise<void> {
  if (!organizationId.value || !groupFormRef.value) return
  try {
    await groupFormRef.value.validate()
  } catch {
    return
  }
  savingGroup.value = true
  try {
    const payload: QuestionGroupSavePayload = {
      organizationId: organizationId.value,
      groupId: groupForm.groupId,
      groupName: groupForm.groupName,
      leaderUserId: groupForm.leaderUserId!,
      questionTemplateIds: groupForm.questionTemplateIds,
      reviewerUserIds: groupForm.reviewerUserIds,
    }
    await saveQuestionGroup(payload)
    message.success(groupForm.groupId ? '题组已更新' : '题组已创建')
    groupModalOpen.value = false
    await loadOrganization()
  } catch (error) {
    const fallback = groupForm.groupId ? '更新题组失败' : '创建题组失败'
    const errMsg = error instanceof Error ? error.message : fallback
    message.error(errMsg)
  } finally {
    savingGroup.value = false
  }
}

function canEditGroup(record: QuestionMarkingGroupVO): boolean {
  return record.groupStatus !== 'GROUP_CLOSED'
}

function canDeleteGroup(record: QuestionMarkingGroupVO): boolean {
  return record.groupStatus === 'GROUP_DRAFT'
}

function canCloseGroup(record: QuestionMarkingGroupVO): boolean {
  return record.groupStatus === 'GROUP_ACTIVE' || record.groupStatus === 'GROUP_CONFIGURED'
}

async function submitGroupDelete(record: QuestionMarkingGroupVO): Promise<void> {
  groupActionLoadingId.value = record.id
  try {
    await deleteQuestionGroup({ groupId: record.id })
    message.success('题组已删除')
    await loadOrganization()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '删除题组失败'
    message.error(errMsg)
  } finally {
    groupActionLoadingId.value = undefined
  }
}

async function submitGroupClose(record: QuestionMarkingGroupVO): Promise<void> {
  groupActionLoadingId.value = record.id
  try {
    await closeQuestionGroup({ groupId: record.id })
    message.success('题组已关闭')
    await loadOrganization()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '关闭题组失败'
    message.error(errMsg)
  } finally {
    groupActionLoadingId.value = undefined
  }
}

function openEditDrawer(): void {
  if (!organization.value) return
  editForm.leaderUserId = organization.value.leaderUserId
  editForm.anonymousMode = Boolean(organization.value.anonymousMode)
  editForm.remark = organization.value.remark || ''
  editDrawerOpen.value = true
  void loadTeachers()
}

async function submitUpdate(): Promise<void> {
  if (!organization.value || !editFormRef.value) return
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }
  updating.value = true
  try {
    const payload: OrganizationUpdatePayload = {
      organizationId: organization.value.id,
      leaderUserId: editForm.leaderUserId!,
      anonymousMode: editForm.anonymousMode,
      remark: editForm.remark?.trim() || undefined,
    }
    organization.value = await updateOrganization(payload)
    message.success('阅卷组织已更新')
    editDrawerOpen.value = false
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '更新阅卷组织失败'
    message.error(errMsg)
  } finally {
    updating.value = false
  }
}

async function submitDelete(): Promise<void> {
  if (!organization.value) return
  deleting.value = true
  try {
    await deleteOrganization({ organizationId: organization.value.id })
    message.success('阅卷组织已删除')
    await router.push({ name: 'AdminMarkingOrganizationIndex' })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '删除阅卷组织失败'
    message.error(errMsg)
  } finally {
    deleting.value = false
  }
}

interface PolicyForm {
  allocationGroupId?: string
  allocationMode: MarkingAllocationModeCode
  batchSize?: number
  loadLimit?: number
  anonymousTokenPolicy?: AnonymousTokenPolicyCode
  priorityRule?: string
  recycleGroupId?: string
  timeoutMinutes?: number
  maxPendingCount?: number
  reassignMode?: MarkingReassignModeCode
}

const policyForm = reactive<PolicyForm>({
  allocationGroupId: undefined,
  allocationMode: 'BY_QUESTION',
  batchSize: 20,
  loadLimit: 50,
  anonymousTokenPolicy: 'PER_EXAM',
  priorityRule: '',
  recycleGroupId: undefined,
  timeoutMinutes: 60,
  maxPendingCount: 30,
  reassignMode: 'AUTO',
})

const groupSelectOptions = computed(() => [
  ...groups.value.map((g) => ({ value: g.id, label: g.groupName || `题组 #${g.id}` })),
])

// 从后端枚举 LABEL 对象直接派生 select options。
const ALLOCATION_MODE_OPTIONS = Object.entries(MARKING_ALLOCATION_MODE_LABEL).map(
  ([value, label]) => ({ value, label }),
)

const REASSIGN_MODE_OPTIONS = Object.entries(MARKING_REASSIGN_MODE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const ANONYMOUS_TOKEN_OPTIONS = Object.entries(ANONYMOUS_TOKEN_POLICY_LABEL).map(
  ([value, label]) => ({ value, label }),
)

const savingAllocation = ref(false)
async function submitAllocation(): Promise<void> {
  if (!organizationId.value) return
  savingAllocation.value = true
  try {
    const payload: AllocationPolicySavePayload = {
      organizationId: organizationId.value,
      groupId: policyForm.allocationGroupId,
      allocationMode: policyForm.allocationMode,
      batchSize: policyForm.batchSize,
      loadLimit: policyForm.loadLimit,
      anonymousTokenPolicy: policyForm.anonymousTokenPolicy,
      priorityRule: policyForm.priorityRule?.trim() || undefined,
    }
    await saveAllocationPolicy(payload)
    message.success('分配策略已保存')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '分配策略保存失败'
    message.error(errMsg)
  } finally {
    savingAllocation.value = false
  }
}

const savingRecycle = ref(false)
async function submitRecycle(): Promise<void> {
  if (!organizationId.value) return
  savingRecycle.value = true
  try {
    const payload: RecyclePolicySavePayload = {
      organizationId: organizationId.value,
      groupId: policyForm.recycleGroupId,
      timeoutMinutes: policyForm.timeoutMinutes,
      maxPendingCount: policyForm.maxPendingCount,
      reassignMode: policyForm.reassignMode,
    }
    await saveRecyclePolicy(payload)
    message.success('回收策略已保存')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '回收策略保存失败'
    message.error(errMsg)
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
    label: MARKING_ORGANIZATION_STATUS_LABEL[code],
  }))
})

async function submitStatusUpdate(): Promise<void> {
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
    const errMsg = error instanceof Error ? error.message : '状态推进失败'
    message.error(errMsg)
  } finally {
    updatingStatus.value = false
  }
}

function goSessions(): void {
  void router.push({
    name: 'AdminMarkingOrganizationSessions',
    params: { organizationId: organizationId.value },
  })
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

// 严格 typed helper：题组 groupStatus 是 QuestionMarkingGroupStatusCode | undefined。
function groupStatusTone(status?: QuestionMarkingGroupStatusCode): BadgeTone {
  if (!status) return 'gray'
  return QUESTION_GROUP_STATUS_TONE[status] ?? 'gray'
}

function groupStatusLabel(status?: QuestionMarkingGroupStatusCode): string {
  if (!status) return '-'
  return QUESTION_GROUP_STATUS_LABEL[status] ?? status
}

onMounted(loadOrganization)
</script>

<style lang="scss" scoped>
.org-detail {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 280px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
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
}

.status-form {
  max-width: 480px;
}
</style>
