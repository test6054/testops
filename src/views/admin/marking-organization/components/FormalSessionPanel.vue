<template>
  <UiCard class="session-card">
    <template #title>
      <PlayCircleOutlined />
      <span>正评会话</span>
      <UiBadge tone="green">教师批阅生效</UiBadge>
    </template>

    <a-form layout="vertical" class="session-form">
      <a-form-item label="选择题组" required>
        <a-select
          v-model:value="formalGroupId"
          placeholder="选择参加正评的题组"
          :options="groupOptions"
        />
      </a-form-item>
      <a-form-item label="任务范围描述">
        <a-textarea
          v-model:value="formalScope"
          :rows="2"
          :maxlength="200"
          placeholder="可选，例如 '第一批 100 份'"
          show-count
        />
      </a-form-item>
      <UiButton :disabled="!formalGroupId" :loading="creating" @click="submitCreate">
        <template #icon><PlusOutlined /></template>
        创建正评会话
      </UiButton>
    </a-form>

    <a-divider class="section-divider" />

    <h4 class="subsection-title">会话推进</h4>
    <a-form layout="vertical" class="session-form">
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
        <UiButton variant="outline" :disabled="!actionSessionId" :loading="completing" @click="submitComplete">
          <template #icon><CheckCircleOutlined /></template>
          完成正评
        </UiButton>
      </a-space>
    </a-form>

    <a-divider class="section-divider" />

    <h4 class="subsection-title">正评会话列表</h4>
    <UiEmpty v-if="!sessions.length" description="尚未创建正评会话" />
    <a-list v-else :data-source="sessions" size="small" class="session-history">
      <template #renderItem="{ item }">
        <a-list-item>
          <a-list-item-meta>
            <template #title>
              <a-typography-text copyable>会话 #{{ (item as FormalSessionVO).id }}</a-typography-text>
              <UiTag
                v-if="(item as FormalSessionVO).sessionStatus"
                :tone="FORMAL_STATUS_TONE[(item as FormalSessionVO).sessionStatus!]"
                size="sm"
                class="status-tag"
              >
                {{ FORMAL_STATUS_LABEL[(item as FormalSessionVO).sessionStatus!] }}
              </UiTag>
            </template>
            <template #description>
              <span>
                题组 #{{ (item as FormalSessionVO).groupId }} · 创建于 {{ formatTime((item as FormalSessionVO).createTime) }}
                <template v-if="(item as FormalSessionVO).startTime">· 开始 {{ formatTime((item as FormalSessionVO).startTime) }}</template>
                <template v-if="(item as FormalSessionVO).endTime">· 结束 {{ formatTime((item as FormalSessionVO).endTime) }}</template>
                <template v-if="(item as FormalSessionVO).pauseReason">
                  · 暂停原因：{{ (item as FormalSessionVO).pauseReason }}
                </template>
                <template v-if="(item as FormalSessionVO).closeReason">
                  · 关闭原因：{{ (item as FormalSessionVO).closeReason }}
                </template>
              </span>
            </template>
          </a-list-item-meta>
          <template #actions>
            <UiButton
              v-if="canPause((item as FormalSessionVO).sessionStatus)"
              variant="outline"
              size="sm"
              @click="emit('open-lifecycle', 'pauseFormal', (item as FormalSessionVO).id)"
            >
              <template #icon><PauseCircleOutlined /></template>
              暂停
            </UiButton>
            <UiButton
              v-if="canResume((item as FormalSessionVO).sessionStatus)"
              size="sm"
              :loading="resumingId === (item as FormalSessionVO).id"
              @click="submitResume((item as FormalSessionVO).id)"
            >
              <template #icon><PlayCircleOutlined /></template>
              恢复
            </UiButton>
            <UiButton
              v-if="canClose((item as FormalSessionVO).sessionStatus)"
              variant="outline"
              size="sm"
              @click="emit('open-lifecycle', 'closeFormal', (item as FormalSessionVO).id)"
            >
              <template #icon><StopOutlined /></template>
              关闭归档
            </UiButton>
            <a-popconfirm
              v-if="canDelete((item as FormalSessionVO).sessionStatus)"
              title="确认删除该正评会话？正评草稿将被软删除，不可恢复。"
              ok-text="删除"
              cancel-text="取消"
              @confirm="submitDelete((item as FormalSessionVO).id)"
            >
              <UiButton
                variant="outline"
                size="sm"
                :loading="deletingId === (item as FormalSessionVO).id"
              >
                <template #icon><DeleteOutlined /></template>
                删除草稿
              </UiButton>
            </a-popconfirm>
          </template>
        </a-list-item>
      </template>
    </a-list>
  </UiCard>
</template>

<script lang="ts" setup>
import type {
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
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import {
  completeFormalSession,
  createFormalSession,
  deleteFormalSession,
  FORMAL_SESSION_STATUS_LABEL as FORMAL_STATUS_LABEL,
  FORMAL_SESSION_STATUS_TONE as FORMAL_STATUS_TONE,
  resumeFormalSession,
  startFormalSession,
} from '@/apis/mark/marking-organization'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'

interface GroupOption {
  value: string
  label: string
}

defineOptions({ name: 'FormalSessionPanel' })

const props = defineProps<{
  organizationId: string
  groupOptions: GroupOption[]
  sessions: FormalSessionVO[]
}>()

const emit = defineEmits<{
  'refresh': []
  'open-lifecycle': [action: 'pauseFormal' | 'closeFormal', sessionId: string]
}>()

const formalGroupId = ref<string | undefined>(undefined)
const formalScope = ref('')
const creating = ref(false)
const actionSessionId = ref<string | undefined>(undefined)
const starting = ref(false)
const completing = ref(false)
const resumingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const formalSessionOptions = computed(() =>
  props.sessions.map(item => ({
    value: item.id,
    label: `会话 #${item.id}（题组 #${item.groupId}）${item.sessionStatus ? ' · ' + FORMAL_STATUS_LABEL[item.sessionStatus] : ''}`,
  })),
)

watch(
  () => props.sessions,
  (next) => {
    if (actionSessionId.value && !next.some(s => s.id === actionSessionId.value)) {
      actionSessionId.value = undefined
    }
  },
)

function canPause(status?: FormalSessionStatusCode): boolean {
  return status === 'SESSION_ACTIVE'
}

function canResume(status?: FormalSessionStatusCode): boolean {
  return status === 'SESSION_PAUSED'
}

function canClose(status?: FormalSessionStatusCode): boolean {
  return status === 'SESSION_ACTIVE'
    || status === 'SESSION_PAUSED'
    || status === 'SESSION_COMPLETED'
}

function canDelete(status?: FormalSessionStatusCode): boolean {
  return status === 'SESSION_CREATED'
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function submitCreate(): Promise<void> {
  if (!props.organizationId || !formalGroupId.value) return
  creating.value = true
  try {
    const sessionId = await createFormalSession({
      organizationId: props.organizationId,
      groupId: formalGroupId.value,
      taskScope: formalScope.value?.trim() || undefined,
    })
    message.success(`正评会话 #${sessionId} 已创建`)
    actionSessionId.value = sessionId
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '创建正评会话失败'
    message.error(errMsg)
  } finally {
    creating.value = false
  }
}

async function submitStart(): Promise<void> {
  if (!actionSessionId.value) return
  starting.value = true
  try {
    await startFormalSession(actionSessionId.value)
    message.success('正评会话已启动')
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '启动正评失败'
    message.error(errMsg)
  } finally {
    starting.value = false
  }
}

async function submitComplete(): Promise<void> {
  if (!actionSessionId.value) return
  completing.value = true
  try {
    await completeFormalSession(actionSessionId.value)
    message.success('正评会话已完成')
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '完成正评失败'
    message.error(errMsg)
  } finally {
    completing.value = false
  }
}

async function submitResume(sessionId: string): Promise<void> {
  resumingId.value = sessionId
  try {
    await resumeFormalSession(sessionId)
    message.success('正评会话已恢复')
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '恢复正评失败'
    message.error(errMsg)
  } finally {
    resumingId.value = null
  }
}

async function submitDelete(sessionId: string): Promise<void> {
  deletingId.value = sessionId
  try {
    await deleteFormalSession(sessionId)
    message.success('正评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '删除正评会话失败'
    message.error(errMsg)
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
  color: #262626;
}

.session-history {
  max-height: 240px;
  overflow-y: auto;
}

.status-tag {
  margin-left: 8px;
}
</style>
