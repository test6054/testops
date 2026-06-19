<template>
  <UiCard class="session-card">
    <template #title>
      <ExperimentOutlined />
      <span>试评会话</span>
      <UiBadge tone="orange">校准评分尺度</UiBadge>
    </template>

    <a-form v-if="canManage" layout="vertical" class="session-form">
      <a-form-item label="选择题组" required>
        <a-select
          v-model:value="trialGroupId"
          placeholder="选择参加试评的题组"
          :options="groupOptions"
        />
      </a-form-item>
      <UiButton :disabled="!trialGroupId" :loading="creating" @click="submitCreate">
        <template #icon><PlusOutlined /></template>
        创建试评会话
      </UiButton>
    </a-form>

    <a-divider v-if="canManage" class="section-divider" />

    <h4 v-if="canManage" class="subsection-title">校准结论</h4>
    <a-form v-if="canManage" layout="vertical" class="session-form">
      <a-form-item label="试评会话" required>
        <a-select
          v-model:value="calibrateSessionId"
          placeholder="选择待校准的试评会话"
          :options="trialSessionOptions"
          show-search
          option-filter-prop="label"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="校准结论" required>
        <a-textarea
          v-model:value="calibrateForm.calibrationSummary"
          :rows="3"
          :maxlength="1000"
          placeholder="填写本次试评形成的评分尺度、扣分边界和执行口径"
          show-count
        />
      </a-form-item>
      <a-form-item label="讨论笔记">
        <a-textarea
          v-model:value="calibrateForm.discussionNotes"
          :rows="3"
          :maxlength="1000"
          placeholder="可选，团队讨论与共识"
          show-count
        />
      </a-form-item>
      <UiButton
        :disabled="!calibrateSessionId || !calibrateForm.calibrationSummary.trim()"
        :loading="calibrating"
        @click="submitCalibrate"
      >
        <template #icon><CheckCircleOutlined /></template>
        提交校准结论
      </UiButton>
    </a-form>

    <a-divider class="section-divider" />

    <h4 class="subsection-title">试评会话列表</h4>
    <UiEmpty v-if="!sessions.length" description="尚未创建试评会话" />
    <a-list v-else size="small" class="session-history">
      <a-list-item v-for="item in sessions" :key="item.id">
        <a-list-item-meta>
          <template #title>
            <a-typography-text strong>
              {{ item.groupName }}
            </a-typography-text>
            <UiTag
              :tone="strictEnumTone(TRIAL_STATUS_TONE, item.sessionStatus, '试评会话状态')"
              size="sm"
              class="status-tag"
            >
              {{ strictEnumLabel(TRIAL_STATUS_LABEL, item.sessionStatus, '试评会话状态') }}
            </UiTag>
          </template>
          <template #description>
            <span>
              试评会话 · 创建于 {{ formatDateTime(item.createTime) }}
              <template v-if="item.closeReason"> · 关闭原因：{{ item.closeReason }} </template>
            </span>
          </template>
        </a-list-item-meta>
        <template #actions>
          <UiButton
            v-if="canCloseTrial(item.sessionStatus)"
            variant="outline"
            size="sm"
            @click="emit('open-lifecycle', 'closeTrial', item.id)"
          >
            <template #icon><StopOutlined /></template>
            关闭试评
          </UiButton>
          <a-popconfirm
            v-if="canDeleteTrial(item.sessionStatus)"
            title="确认删除该试评会话？试评草稿将被软删除，不可恢复。"
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
  TrialSessionCalibrateRequest,
  TrialSessionStatusCode,
  TrialSessionVO,
} from '@/apis/mark/marking-organization'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import DeleteOutlined from '@ant-design/icons-vue/DeleteOutlined'
import ExperimentOutlined from '@ant-design/icons-vue/ExperimentOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import StopOutlined from '@ant-design/icons-vue/StopOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  calibrateTrialSession,
  createTrialSession,
  deleteTrialSession,
  TRIAL_SESSION_STATUS_LABEL as TRIAL_STATUS_LABEL,
  TRIAL_SESSION_STATUS_TONE as TRIAL_STATUS_TONE,
} from '@/apis/mark/marking-organization'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

interface GroupOption {
  value: string
  label: string
}

defineOptions({ name: 'TrialSessionPanel' })

const props = defineProps<{
  organizationId: string
  groupOptions: GroupOption[]
  sessions: TrialSessionVO[]
  canManage: boolean
}>()

const emit = defineEmits<{
  "refresh": []
  'open-lifecycle': [action: 'closeTrial', sessionId: string]
}>()

const trialGroupId = ref<string | undefined>(undefined)
const creating = ref(false)
const calibrateSessionId = ref<string | undefined>(undefined)
const calibrateForm = reactive<
  Pick<TrialSessionCalibrateRequest, 'calibrationSummary' | 'discussionNotes'>
>({
  calibrationSummary: '',
  discussionNotes: '',
})
const calibrating = ref(false)
const deletingId = ref<string | null>(null)

const trialSessionOptions = computed(() =>
  props.sessions.map((item) => ({
    value: item.id,
    label: `${item.groupName} · ${strictEnumLabel(TRIAL_STATUS_LABEL, item.sessionStatus, '试评会话状态')} · ${formatDateTime(item.createTime)}`,
  })),
)

watch(
  () => props.sessions,
  (next) => {
    if (calibrateSessionId.value && !next.some((s) => s.id === calibrateSessionId.value)) {
      calibrateSessionId.value = undefined
    }
  },
)

function canCloseTrial(status: TrialSessionStatusCode): boolean {
  return (
    props.canManage
    && (status === 'TRIAL_ASSIGNED' || status === 'TRIAL_SUBMITTED' || status === 'CALIBRATED')
  )
}

function canDeleteTrial(status: TrialSessionStatusCode): boolean {
  return props.canManage && status === 'TRIAL_CREATED'
}

function guardManageAction(): boolean {
  if (props.canManage) return true
  message.warning('仅考试创建人可分配批阅任务')
  return false
}

async function submitCreate(): Promise<void> {
  if (!guardManageAction()) return
  if (!props.organizationId || !trialGroupId.value) return
  creating.value = true
  try {
    const sessionId = await createTrialSession({
      organizationId: props.organizationId,
      groupId: trialGroupId.value,
    })
    message.success('试评会话已创建')
    calibrateSessionId.value = sessionId
    emit('refresh')
  } catch (error) {
    showUserError(error, '创建试评会话失败')
  } finally {
    creating.value = false
  }
}

async function submitCalibrate(): Promise<void> {
  if (!guardManageAction()) return
  if (!calibrateSessionId.value || !calibrateForm.calibrationSummary.trim()) return
  calibrating.value = true
  try {
    await calibrateTrialSession({
      sessionId: calibrateSessionId.value,
      calibrationSummary: calibrateForm.calibrationSummary.trim(),
      discussionNotes: calibrateForm.discussionNotes?.trim() || undefined,
    })
    message.success('试评校准结论已提交')
    calibrateForm.calibrationSummary = ''
    calibrateForm.discussionNotes = ''
    emit('refresh')
  } catch (error) {
    showUserError(error, '提交试评校准结论失败')
  } finally {
    calibrating.value = false
  }
}

async function submitDelete(sessionId: string): Promise<void> {
  if (!guardManageAction()) return
  deletingId.value = sessionId
  try {
    await deleteTrialSession(sessionId)
    message.success('试评草稿会话已删除')
    emit('refresh')
  } catch (error) {
    showUserError(error, '删除试评会话失败')
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
</style>
