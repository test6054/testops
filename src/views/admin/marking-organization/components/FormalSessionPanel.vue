<template>
  <UiCard class="session-card">
    <template #title>
      <PlayCircleOutlined />
      <span>正评会话</span>
      <UiBadge tone="green">教师批阅生效</UiBadge>
    </template>

    <a-form v-if="canManage" layout="vertical" class="session-form">
      <a-form-item label="选择题组" required>
        <a-select
          v-model:value="formalGroupId"
          placeholder="选择参加正评的题组"
          :options="groupOptions"
        />
      </a-form-item>
      <a-form-item label="批阅任务单元" required>
        <a-select
          v-model:value="formalAllocationUnit"
          placeholder="选择正评任务拆分方式"
          :options="allocationUnitOptions"
        />
      </a-form-item>
      <UiButton
        :disabled="!formalGroupId || !formalAllocationUnit"
        :loading="creating"
        @click="submitCreate"
      >
        <template #icon><PlusOutlined /></template>
        创建正评会话
      </UiButton>
    </a-form>

    <a-divider v-if="canManage" class="section-divider" />

    <h4 v-if="canManage" class="subsection-title">会话推进</h4>
    <a-alert
      v-if="canManage"
      type="info"
      show-icon
      class="completion-semantics-alert"
      message="完成正评仅表示本场派发的阅卷任务已全部提交"
      description="不等于整张试卷全部题目成绩已确认。随机题目 / 指定题目模式下，以本会话题目范围与派发任务为准。"
    />
    <a-form v-if="canManage" layout="vertical" class="session-form">
      <a-form-item label="正评会话" required>
        <a-select
          v-model:value="actionSessionId"
          placeholder="选择需要启动 / 完成的正评会话"
          :options="formalSessionOptions"
          show-search
          option-filter-prop="label"
          allow-clear
        />
      </a-form-item>
      <a-space wrap>
        <UiButton :disabled="!actionSessionId" :loading="starting" @click="submitStart">
          <template #icon><PlayCircleOutlined /></template>
          启动正评
        </UiButton>
        <UiButton
          variant="outline"
          :disabled="!canCompleteSelectedSession"
          :loading="completing"
          @click="submitComplete"
        >
          <template #icon><CheckCircleOutlined /></template>
          完成正评
        </UiButton>
      </a-space>
      <div v-if="selectedSession && selectedSession.sessionStatus === 'SESSION_ACTIVE'" class="session-progress-hint">
        <span>{{ formatSessionTaskProgress(selectedSession) }}</span>
        <span>{{ formatSessionGradeClosureProgress(selectedSession) }}</span>
        <span v-if="selectedSession.sessionCompletionBlockedReason" class="session-blocked-reason">
          {{ selectedSession.sessionCompletionBlockedReason }}
        </span>
        <span v-else-if="selectedSession.sessionGradeClosureBlockedReason" class="session-blocked-reason">
          {{ selectedSession.sessionGradeClosureBlockedReason }}
        </span>
      </div>
    </a-form>

    <a-divider class="section-divider" />

    <h4 class="subsection-title">正评会话列表</h4>
    <UiEmpty v-if="!sessions.length" description="尚未创建正评会话" />
    <a-list v-else size="small" class="session-history">
      <a-list-item v-for="item in sessions" :key="item.id">
        <a-list-item-meta>
          <template #title>
            <a-typography-text strong>
              {{ item.groupName }}
            </a-typography-text>
            <UiTag
              :tone="strictEnumTone(FORMAL_STATUS_TONE, item.sessionStatus, '正评会话状态')"
              size="sm"
              class="status-tag"
            >
              {{ strictEnumLabel(FORMAL_STATUS_LABEL, item.sessionStatus, '正评会话状态') }}
            </UiTag>
          </template>
          <template #description>
            <span>
              正评会话 · 创建于 {{ formatDateTime(item.createTime) }} ·
              {{ strictEnumLabel(ALLOCATION_UNIT_LABEL, item.allocationUnit, '批阅任务单元') }}
              · {{ formatSessionQuestionScope(item) }}
              · {{ formatSessionTaskProgress(item) }}
              · {{ formatSessionGradeClosureProgress(item) }}
              <template v-if="item.startTime">· 开始 {{ formatDateTime(item.startTime) }}</template>
              <template v-if="item.endTime">· 结束 {{ formatDateTime(item.endTime) }}</template>
              <template v-if="item.pauseReason"> · 暂停原因：{{ item.pauseReason }} </template>
              <template v-if="item.closeReason"> · 关闭原因：{{ item.closeReason }} </template>
            </span>
            <div
              v-if="item.allocationUnit === 'RANDOM_QUESTIONS' && item.questionScopes.length > 0"
              class="session-scope-note"
            >
              随机抽题结果已在启动时固化；完成正评仅表示本场抽中题目的阅卷任务已交卷，不代表整卷批阅完成。
            </div>
          </template>
        </a-list-item-meta>
        <template #actions>
          <UiButton
            v-if="canPause(item.sessionStatus)"
            variant="outline"
            size="sm"
            @click="emit('open-lifecycle', 'pauseFormal', item.id)"
          >
            <template #icon><PauseCircleOutlined /></template>
            暂停
          </UiButton>
          <UiButton
            v-if="canResume(item.sessionStatus)"
            size="sm"
            :loading="resumingId === item.id"
            @click="submitResume(item.id)"
          >
            <template #icon><PlayCircleOutlined /></template>
            恢复
          </UiButton>
          <UiButton
            v-if="canClose(item.sessionStatus)"
            variant="outline"
            size="sm"
            @click="emit('open-lifecycle', 'closeFormal', item.id)"
          >
            <template #icon><StopOutlined /></template>
            关闭归档
          </UiButton>
          <a-popconfirm
            v-if="canDelete(item.sessionStatus)"
            title="确认删除该正评会话？正评草稿将被软删除，不可恢复。"
            ok-text="删除"
            cancel-text="取消"
            @confirm="submitDelete(item.id)"
          >
            <UiButton variant="outline" size="sm" :loading="deletingId === item.id">
              <template #icon><DeleteOutlined /></template>
              删除草稿
            </UiButton>
          </a-popconfirm>
        </template>
      </a-list-item>
    </a-list>
  </UiCard>
</template>

<script lang="ts" setup>
import type {
  AllocationUnitCode,
  FormalSessionStatusCode,
  FormalSessionVO,
} from '@/apis/mark/marking-organization'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import DeleteOutlined from '@ant-design/icons-vue/DeleteOutlined'
import PauseCircleOutlined from '@ant-design/icons-vue/PauseCircleOutlined'
import PlayCircleOutlined from '@ant-design/icons-vue/PlayCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import StopOutlined from '@ant-design/icons-vue/StopOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  ALLOCATION_UNIT_LABEL,
  completeFormalSession,
  createFormalSession,
  deleteFormalSession,
  FORMAL_SESSION_STATUS_LABEL as FORMAL_STATUS_LABEL,
  FORMAL_SESSION_STATUS_TONE as FORMAL_STATUS_TONE,
  resumeFormalSession,
  startFormalSession,
} from '@/apis/mark/marking-organization'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

interface GroupOption {
  value: string
  label: string
}

defineOptions({ name: 'FormalSessionPanel' })

const props = defineProps<{
  organizationId: string
  groupOptions: GroupOption[]
  sessions: FormalSessionVO[]
  canManage: boolean
}>()

const emit = defineEmits<{
  "refresh": []
  'open-lifecycle': [action: 'pauseFormal' | 'closeFormal', sessionId: string]
}>()

const formalGroupId = ref<string | undefined>(undefined)
const formalAllocationUnit = ref<AllocationUnitCode>('SELECTED_QUESTIONS')
const creating = ref(false)
const actionSessionId = ref<string | undefined>(undefined)
const starting = ref(false)
const completing = ref(false)
const resumingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const formalSessionOptions = computed(() =>
  props.sessions.map((item) => ({
    value: item.id,
    label: `${item.groupName} · ${strictEnumLabel(FORMAL_STATUS_LABEL, item.sessionStatus, '正评会话状态')} · ${formatDateTime(item.createTime)}`,
  })),
)

const selectedSession = computed(() =>
  props.sessions.find((item) => item.id === actionSessionId.value),
)

const canCompleteSelectedSession = computed(() => {
  const session = selectedSession.value
  if (!session || session.sessionStatus !== 'SESSION_ACTIVE') {
    return false
  }
  return session.sessionTaskCompletionReady
})

const allocationUnitOptions = Object.entries(ALLOCATION_UNIT_LABEL).map(([value, label]) => ({
  value,
  label,
}))

watch(
  () => props.sessions,
  (next) => {
    if (actionSessionId.value && !next.some((s) => s.id === actionSessionId.value)) {
      actionSessionId.value = undefined
    }
  },
)

function canPause(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === 'SESSION_ACTIVE'
}

function canResume(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === 'SESSION_PAUSED'
}

function canClose(status: FormalSessionStatusCode): boolean {
  return (
    props.canManage
    && (status === 'SESSION_ACTIVE' || status === 'SESSION_PAUSED' || status === 'SESSION_COMPLETED')
  )
}

function canDelete(status: FormalSessionStatusCode): boolean {
  return props.canManage && status === 'SESSION_CREATED'
}

function formatSessionQuestionScope(session: FormalSessionVO): string {
  if (session.allocationUnit === 'WHOLE_PAPER') {
    return '整卷批阅'
  }
  if (!session.questionScopes.length) {
    return '题目范围待启动固化'
  }
  const questionNos = session.questionScopes.map((scope) => {
    const progress = scope.scopedTaskCount > 0
      ? `（任务 ${scope.scopedFinalizedTaskCount}/${scope.scopedTaskCount}，成绩 ${scope.scopedConfirmedGradeCount}/${scope.scopedGradeItemCount}）`
      : ''
    return `题 ${scope.questionNo}${progress}`
  }).join('、')
  const prefix = session.allocationUnit === 'RANDOM_QUESTIONS' ? '随机抽题' : '指定题目'
  return `${prefix} ${session.questionScopeCount} 题：${questionNos}`
}

function formatSessionTaskProgress(session: FormalSessionVO): string {
  if (session.totalTaskCount <= 0) {
    return '阅卷任务待生成'
  }
  return `${session.completionScopeLabel} 已定稿 ${session.finalizedTaskCount}/${session.totalTaskCount}`
}

function formatSessionGradeClosureProgress(session: FormalSessionVO): string {
  if (session.sessionGradeItemCount <= 0) {
    return '会话成绩闭环待形成'
  }
  return `${session.sessionGradeClosureLabel} ${session.sessionConfirmedGradeCount}/${session.sessionGradeItemCount}`
}

function guardManageAction(): boolean {
  if (props.canManage) return true
  message.warning('仅考试创建人可分配批阅任务')
  return false
}

async function submitCreate(): Promise<void> {
  if (!guardManageAction()) return
  if (!props.organizationId || !formalGroupId.value || !formalAllocationUnit.value) return
  creating.value = true
  try {
    const sessionId = await createFormalSession({
      organizationId: props.organizationId,
      groupId: formalGroupId.value,
      allocationUnit: formalAllocationUnit.value,
    })
    message.success('正评会话已创建')
    actionSessionId.value = sessionId
    emit('refresh')
  } catch (error) {
    showUserError(error, '创建正评会话失败')
  } finally {
    creating.value = false
  }
}

async function submitStart(): Promise<void> {
  if (!guardManageAction()) return
  if (!actionSessionId.value) return
  starting.value = true
  try {
    await startFormalSession(actionSessionId.value)
    message.success('正评会话已启动')
    emit('refresh')
  } catch (error) {
    showUserError(error, '启动正评会话失败')
  } finally {
    starting.value = false
  }
}

async function submitComplete(): Promise<void> {
  if (!guardManageAction()) return
  if (!actionSessionId.value) return
  completing.value = true
  try {
    await completeFormalSession(actionSessionId.value)
    message.success('本场正评任务已标记完成')
    emit('refresh')
  } catch (error) {
    showUserError(error, '完成正评会话失败')
  } finally {
    completing.value = false
  }
}

async function submitResume(sessionId: string): Promise<void> {
  if (!guardManageAction()) return
  resumingId.value = sessionId
  try {
    await resumeFormalSession(sessionId)
    message.success('正评会话已恢复')
    emit('refresh')
  } catch (error) {
    showUserError(error, '恢复正评会话失败')
  } finally {
    resumingId.value = null
  }
}

async function submitDelete(sessionId: string): Promise<void> {
  if (!guardManageAction()) return
  deletingId.value = sessionId
  try {
    await deleteFormalSession(sessionId)
    message.success('正评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    showUserError(error, '删除正评会话失败')
  } finally {
    deletingId.value = null
  }
}
</script>

<style lang="scss" scoped>
.session-card {
  height: 100%;
}

.session-form {
  max-width: 100%;
}

.section-divider {
  margin: 16px 0;
}

.subsection-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ant-color-text);
}

.session-history {
  max-height: 240px;
  overflow-y: auto;
}

.status-tag {
  margin-left: 8px;
}

.session-scope-note {
  margin-top: 6px;
  color: var(--ant-color-warning);
  font-size: 12px;
}

.completion-semantics-alert {
  margin-bottom: 12px;
}

.session-progress-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
  line-height: 1.6;
}

.session-blocked-reason {
  display: block;
  margin-top: 4px;
  color: var(--ant-color-error);
}
</style>
