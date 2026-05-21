<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="org-index__context">
        <div class="org-index__context-info">
          <h2 class="org-index__title">阅卷交付 - 阅卷组织</h2>
          <a-select
            :value="selectedExamId"
            class="org-index__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
        </div>
        <div class="org-index__context-actions">
          <UiTag
            v-if="organization?.organizationStatus"
            :tone="STATUS_TONE[organization.organizationStatus]"
            size="sm"
          >
            {{ STATUS_LABEL[organization.organizationStatus] }}
          </UiTag>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadOrganization"
          >
            刷新
          </UiButton>
          <UiButton
            v-if="selectedExamId && !organization && !loading"
            variant="primary"
            size="sm"
            @click="openCreateDrawer"
          >
            新建组织
          </UiButton>
          <UiButton v-if="organization" variant="primary" size="sm" @click="goDetail">
            进入详情
          </UiButton>
        </div>
      </div>
    </template>

    <!-- D-9 错误态：阅卷组织加载遇到非“未创建”错误时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="selectedExamId && organizationLoadError"
      :error="organizationLoadError"
      title="阅卷组织加载失败"
      :helper="`考试 ID：${selectedExamId}`"
      @retry="loadOrganization"
    />
    <UiEmpty
      v-else-if="!selectedExamId"
      description="请先选择考试以查看 / 创建阅卷组织"
      class="org-index__empty"
    />

    <a-spin v-else :spinning="loading" tip="加载组织中...">
      <SignalBand v-if="organization" :metrics="signalMetrics" compact class="org-index__signals" />

      <section v-if="organization" class="org-index__panel">
        <header class="org-index__panel-header">
          <h3 class="org-index__panel-title">
            <ProfileOutlined />
            组织全貌
          </h3>
          <UiBadge tone="blue"> EXAM #{{ organization.examId }} </UiBadge>
        </header>

        <a-descriptions
          :column="{ xs: 1, sm: 2, lg: 3 }"
          size="middle"
          bordered
          class="org-index__descriptions"
        >
          <a-descriptions-item label="组长用户 ID">
            <a-typography-text copyable>
              {{ organization.leaderUserId || '-' }}
            </a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="组织状态">
            <UiTag
              v-if="organization.organizationStatus"
              :tone="STATUS_TONE[organization.organizationStatus]"
              size="sm"
            >
              {{ STATUS_LABEL[organization.organizationStatus] }}
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
          <a-descriptions-item label="创建时间">
            {{ formatTime(organization.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formatTime(organization.updateTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="备注" :span="3">
            <span v-if="organization.remark">
              {{ organization.remark }}
            </span>
            <span v-else class="org-index__hint">-</span>
          </a-descriptions-item>
        </a-descriptions>

        <div class="org-index__actions">
          <UiButton size="sm" @click="goDetail"> 管理题组与策略 </UiButton>
          <UiButton size="sm" variant="outline" @click="goSessions"> 试评 / 正评会话 </UiButton>
        </div>
      </section>

      <section v-else-if="!loading" class="org-index__panel org-index__panel--empty">
        <h3 class="org-index__empty-title">
          <InfoCircleOutlined />
          本考试尚未创建阅卷组织
        </h3>
        <p class="org-index__empty-desc">
          阅卷组织是组织教师批改试卷的核心实体；创建后可继续编排题组、配置分配策略并启动试评 /
          正评。
        </p>
        <UiButton variant="primary" size="md" @click="openCreateDrawer">
          立即创建阅卷组织
        </UiButton>
      </section>
    </a-spin>

    <!-- 新建组织抽屉 -->
    <UiDrawer
      :open="createDrawerOpen"
      title="新建阅卷组织"
      :width="520"
      :confirm-loading="creating"
      @update:open="(v: boolean) => (createDrawerOpen = v)"
      @close="createDrawerOpen = false"
      @confirm="submitCreate"
    >
      <a-form ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical">
        <a-form-item label="关联考试">
          <a-input :value="selectedExamLabel" disabled />
        </a-form-item>
        <a-form-item label="阅卷组长" name="leaderUserId" required>
          <a-select
            v-model:value="createForm.leaderUserId"
            placeholder="选择组长（仅教师）"
            show-search
            option-filter-prop="label"
            :options="teacherOptions"
            :loading="teacherLoading"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="是否启用匿名阅卷" name="anonymousMode">
          <a-switch v-model:checked="createForm.anonymousMode" />
          <span class="org-index__switch-hint">启用后阅卷教师不可见考生身份</span>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea
            v-model:value="createForm.remark"
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
/**
 * 阅卷交付 - 阅卷组织详情入口
 *
 * 后端契约（MarkingOrganizationController）：
 * - getOrganization({ examId })  查询当前考试的阅卷组织
 * - createOrganization(payload)  创建阅卷组织
 */
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { UserListItemDto } from '@/apis/edu/admin-user'
import type {
  MarkingOrganizationVO,
  OrganizationCreatePayload,
} from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { adminGetUserPage } from '@/apis/edu/admin-user'
import {
  createOrganization,
  getOrganization,
  MARKING_ORGANIZATION_STATUS_LABEL as STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE as STATUS_TONE,
} from '@/apis/mark/marking-organization'
import {
  UiBadge,
  UiButton,
  UiDrawer,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'AdminMarkingOrganizationIndex' })

const router = useRouter()

const {
  exams,
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const selectedExamLabel = computed(() => {
  const exam = exams.value.find((item) => item.examId === selectedExamId.value)
  if (!exam) return ''
  return exam.examNo ? `${exam.examName} (${exam.examNo})` : exam.examName
})

const organization = ref<MarkingOrganizationVO | null>(null)
const loading = ref(false)
// D-9 错误态：仅当后端返回非“未创建”类错误时才上报
const organizationLoadError = ref<unknown>(null)

async function loadOrganization(): Promise<void> {
  if (!selectedExamId.value) {
    organization.value = null
    return
  }
  loading.value = true
  organizationLoadError.value = null
  try {
    organization.value = await getOrganization({ examId: selectedExamId.value })
  } catch (error) {
    organization.value = null
    const errMsg = error instanceof Error ? error.message : ''
    const isNotCreated
      = errMsg.includes('未找到') || errMsg.includes('不存在') || errMsg.includes('未创建')
    if (errMsg && !isNotCreated) {
      organizationLoadError.value = error
    }
  } finally {
    loading.value = false
  }
}

const signalMetrics = computed<SignalMetric[]>(() => {
  const org = organization.value
  if (!org) return []
  const groupCount = org.groups?.length ?? 0
  return [
    { key: 'groups', label: '题组数', value: groupCount, tone: groupCount > 0 ? 'blue' : 'orange' },
    {
      key: 'anonymous',
      label: '匿名阅卷',
      value: org.anonymousMode ? '已启用' : '关闭',
      tone: org.anonymousMode ? 'green' : 'gray',
    },
    {
      key: 'status',
      label: '组织状态',
      value: org.organizationStatus ? STATUS_LABEL[org.organizationStatus] : '-',
      tone: org.organizationStatus ? STATUS_TONE[org.organizationStatus] : 'gray',
    },
  ]
})

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
  teacherLoading.value = true
  try {
    const result = await adminGetUserPage({
      pageNum: 1,
      pageSize: 200,
      roleKey: 'SCH_TECH',
    })
    teacherList.value = result.list ?? []
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '教师列表加载失败'
    message.error(errMsg)
  } finally {
    teacherLoading.value = false
  }
}

const createDrawerOpen = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()

interface CreateForm {
  leaderUserId?: string
  anonymousMode: boolean
  remark?: string
}

const createForm = reactive<CreateForm>({
  leaderUserId: undefined,
  anonymousMode: true,
  remark: '',
})

const createRules: Record<string, Rule[]> = {
  leaderUserId: [{ required: true, message: '请选择阅卷组长', trigger: 'change' }],
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

function openCreateDrawer(): void {
  if (!selectedExamId.value) {
    message.warning('请先选择考试')
    return
  }
  createForm.leaderUserId = undefined
  createForm.anonymousMode = true
  createForm.remark = ''
  createDrawerOpen.value = true
  if (teacherList.value.length === 0) {
    void loadTeachers()
  }
}

async function submitCreate(): Promise<void> {
  if (!selectedExamId.value || !createFormRef.value) return
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    const payload: OrganizationCreatePayload = {
      examId: selectedExamId.value,
      leaderUserId: createForm.leaderUserId!,
      anonymousMode: createForm.anonymousMode,
      remark: createForm.remark?.trim() || undefined,
    }
    organization.value = await createOrganization(payload)
    message.success('阅卷组织已创建')
    createDrawerOpen.value = false
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '创建阅卷组织失败'
    message.error(errMsg)
  } finally {
    creating.value = false
  }
}

function goDetail(): void {
  if (!organization.value) return
  void router.push({
    name: 'AdminMarkingOrganizationDetail',
    params: { organizationId: organization.value.id },
  })
}

function goSessions(): void {
  if (!organization.value) return
  void router.push({
    name: 'AdminMarkingOrganizationSessions',
    params: { organizationId: organization.value.id },
  })
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

watch(selectedExamId, () => {
  void loadOrganization()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadOrganization()
  }
})
</script>

<style lang="scss" scoped>
.org-index {
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
    gap: 12px;
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

  &__exam-select {
    width: 280px;
  }

  &__signals {
    margin-bottom: 0;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;

    &--empty {
      text-align: center;
      padding: 40px 16px;
    }
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
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__empty {
    padding: 48px 0;
  }

  &__empty-title {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  &__empty-desc {
    margin: 8px 0 16px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--dp-text-secondary, #475569);
  }

  &__descriptions {
    margin-top: 8px;

    :deep(.ant-descriptions-item-label) {
      width: 140px;
      color: var(--dp-text-secondary, #475569);
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--dp-border-light, #f1f5f9);
  }

  &__hint {
    color: var(--dp-text-disabled, #94a3b8);
  }

  &__switch-hint {
    margin-left: 8px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }
}
</style>
