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
            v-if="organization"
            :tone="strictEnumTone(STATUS_TONE, organization.organizationStatus, '阅卷组织状态')"
            size="sm"
          >
            {{ strictEnumLabel(STATUS_LABEL, organization.organizationStatus, '阅卷组织状态') }}
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
            v-if="selectedExamId && !organization && !loading && canManageSelectedExam"
            variant="primary"
            size="sm"
            @click="openCreateDrawer"
          >
            新建组织
          </UiButton>
          <UiButton v-if="organization" variant="primary" size="sm" @click="goDetail">
            进入详情
          </UiButton>
          <UiButton
            v-if="organization && canManageSelectedExam"
            variant="outline"
            size="sm"
            @click="openEditDrawer"
          >
            编辑组织
          </UiButton>
          <a-popconfirm
            v-if="organization && canManageSelectedExam"
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
        </div>
      </div>
    </template>

    <!-- D-9 错误态：阅卷组织加载遇到非“未创建”错误时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="selectedExamId && organizationLoadError"
      :error="organizationLoadError"
      title="阅卷组织加载失败"
      :helper="`当前考试：${organizationExamLabel}`"
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
          <UiBadge tone="blue">{{ organizationExamLabel }}</UiBadge>
        </header>

        <a-descriptions
          :column="{ xs: 1, sm: 2, lg: 3 }"
          size="middle"
          bordered
          class="org-index__descriptions"
        >
          <a-descriptions-item label="阅卷组长">
            {{ organization.leaderUserName }}（{{ organization.leaderTeacherNo }}）
          </a-descriptions-item>
          <a-descriptions-item label="组织状态">
            <UiTag
              :tone="strictEnumTone(STATUS_TONE, organization.organizationStatus, '阅卷组织状态')"
              size="sm"
            >
              {{ strictEnumLabel(STATUS_LABEL, organization.organizationStatus, '阅卷组织状态') }}
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
          <a-descriptions-item label="创建时间">
            {{ formatDateTime(organization.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formatDateTime(organization.updateTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="备注" :span="3">
            <span v-if="organization.remark">
              {{ organization.remark }}
            </span>
            <span v-else class="org-index__hint">-</span>
          </a-descriptions-item>
        </a-descriptions>

        <div class="org-index__actions">
          <UiButton size="sm" @click="goDetail">
            {{ canManageSelectedExam ? '管理题组与策略' : '查看题组与策略' }}
          </UiButton>
          <UiButton
            v-if="canManageSelectedExam"
            size="sm"
            variant="outline"
            @click="openEditDrawer"
          >
            编辑组织
          </UiButton>
          <UiButton size="sm" variant="outline" @click="goSessions"> 试评 / 正评会话 </UiButton>
          <a-popconfirm
            v-if="canManageSelectedExam"
            title="确认删除该阅卷组织？"
            ok-text="删除"
            cancel-text="取消"
            :ok-button-props="{ danger: true, loading: deleting }"
            @confirm="submitDelete"
          >
            <UiButton size="sm" variant="outline" status="danger" :loading="deleting">
              删除组织
            </UiButton>
          </a-popconfirm>
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
        <UiButton
          v-if="canManageSelectedExam"
          variant="primary"
          size="md"
          @click="openCreateDrawer"
        >
          立即创建阅卷组织
        </UiButton>
        <p v-else class="org-index__empty-desc">该考试的阅卷组织由考试创建人创建和分配。</p>
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
      @ok="submitCreate"
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
          <a-input :value="selectedExamLabel" disabled />
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
          <span class="org-index__switch-hint">启用后阅卷教师不可见考生身份</span>
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
/**
 * 阅卷交付 - 阅卷组织详情入口
 *
 * 后端契约（MarkingOrganizationController）：
 * - getOrganization({ examId })  查询当前考试的阅卷组织
 * - createOrganization(request)  创建阅卷组织
 */
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { UserListItemDto } from '@/apis/edu/admin-user'
import { adminGetUserPage } from '@/apis/edu/admin-user'
import type {
  MarkingOrganizationVO,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
} from '@/apis/mark/marking-organization'
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  isMarkingOrgNotCreatedError,
  MARKING_ORGANIZATION_STATUS_LABEL as STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE as STATUS_TONE,
  updateOrganization,
  validateMarkingOrganizationContract,
} from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { useUserStore } from '@/stores/modules/user'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminMarkingOrganizationIndex' })

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExam,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const canManageSelectedExam = computed(
  () =>
    !!selectedExam.value?.createUser && selectedExam.value.createUser === userStore.userInfo.userId,
)

function guardExamOwnerAction(): boolean {
  if (canManageSelectedExam.value) return true
  message.warning('仅考试创建人可分配批阅任务')
  return false
}

const organization = ref<MarkingOrganizationVO | null>(null)
const loading = ref(false)
// D-9 错误态：仅当后端返回非“未创建组织”业务码时才上报
const organizationLoadError = ref<Error | null>(null)

const organizationExamLabel = computed(() => {
  if (organization.value?.examName) {
    return organization.value.examNo
      ? `${organization.value.examName} (${organization.value.examNo})`
      : organization.value.examName
  }
  return selectedExamLabel.value || '未选择考试'
})

async function loadOrganization(): Promise<void> {
  if (!selectedExamId.value) {
    organization.value = null
    return
  }
  loading.value = true
  organizationLoadError.value = null
  try {
    const nextOrganization = await getOrganization({ examId: selectedExamId.value })
    validateMarkingOrganizationContract(nextOrganization)
    organization.value = nextOrganization
  } catch (error) {
    organization.value = null
    if (!(error instanceof Error && isMarkingOrgNotCreatedError(error))) {
      organizationLoadError.value = toUserError(error, '阅卷组织加载失败')
    }
  } finally {
    loading.value = false
  }
}

const signalMetrics = computed<SignalMetric[]>(() => {
  const org = organization.value
  if (!org) return []
  const groupCount = org.groups.length
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
      value: strictEnumLabel(STATUS_LABEL, org.organizationStatus, '阅卷组织状态'),
      tone: strictEnumTone(STATUS_TONE, org.organizationStatus, '阅卷组织状态'),
    },
  ]
})

const teacherList = ref<UserListItemDto[]>([])
const teacherLoading = ref(false)

const teacherOptions = computed(() =>
  teacherList.value.map((item) => ({
    value: item.id,
    label: item.identifierNumber ? `${item.nickName} (${item.identifierNumber})` : item.nickName,
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
    teacherList.value = readPageList(result, '阅卷教师列表加载失败，请稍后重试')
  } catch (error) {
    showUserError(error, '阅卷教师列表加载失败')
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

function openCreateDrawer(): void {
  if (!guardExamOwnerAction()) return
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
  if (!guardExamOwnerAction()) return
  if (!selectedExamId.value || !createFormRef.value) return
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    const request: OrganizationCreateRequest = {
      examId: selectedExamId.value,
      leaderUserId: createForm.leaderUserId!,
      anonymousMode: createForm.anonymousMode,
      remark: createForm.remark?.trim() || undefined,
    }
    const nextOrganization = await createOrganization(request)
    validateMarkingOrganizationContract(nextOrganization)
    organization.value = nextOrganization
    message.success('阅卷组织已创建')
    createDrawerOpen.value = false
  } catch (error) {
    showUserError(error, '阅卷组织创建失败')
  } finally {
    creating.value = false
  }
}

function openEditDrawer(): void {
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  editForm.leaderUserId = organization.value.leaderUserId
  editForm.anonymousMode = Boolean(organization.value.anonymousMode)
  editForm.remark = organization.value.remark || ''
  editDrawerOpen.value = true
  if (teacherList.value.length === 0) {
    void loadTeachers()
  }
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
  if (!guardExamOwnerAction()) return
  if (!organization.value) return
  deleting.value = true
  try {
    await deleteOrganization({ organizationId: organization.value.id })
    organization.value = null
    message.success('阅卷组织已删除')
  } catch (error) {
    showUserError(error, '阅卷组织删除失败')
  } finally {
    deleting.value = false
  }
}

function goDetail(): void {
  if (!organization.value) return
  void router.push({
    name: route.path.startsWith('/teacher')
      ? 'TeacherMarkingOrganizationDetail'
      : 'AdminMarkingOrganizationDetail',
    params: { organizationId: organization.value.id },
  })
}

function goSessions(): void {
  if (!organization.value) return
  void router.push({
    name: route.path.startsWith('/teacher')
      ? 'TeacherMarkingOrganizationSessions'
      : 'AdminMarkingOrganizationSessions',
    params: { organizationId: organization.value.id },
  })
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
