<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
        <template v-if="canManageExamOwner === true && resolving !== true && resolveLoadFailed !== true && selectedExamId" #actions>
          <UiButton variant="primary" size="sm" @click="openCreateDrawer"> 创建阅卷组织 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && !resolving && !resolveLoadFailed" #signal>
      <SignalBand layout="spotlight" :metrics="entrySignalMetrics" variant="panel" compact />
    </template>

    <ExamWorkspaceJourneySubNav v-if="selectedExamId && !resolving && !resolveLoadFailed" />

    <UiSkeletonState v-if="resolving" variant="card" compact />

    <ExamSelectGateStrip
      v-else-if="!selectedExamId"
      body="请从考试列表进入工作台后再创建或查看阅卷组织"
    />

    <UiAlertStrip
      v-else-if="resolveLoadFailed"
      tone="error"
      title="阅卷组织加载失败"
      :description="`考试 ${selectedExamId} 的组织配置暂不可读取；不得按「尚未配置」处理。`"
      dense
      class="org-entry__alert"
    />

    <WorkbenchContextGateStrip
      v-else-if="selectedExamId && organizationConfigured === false"
      tag="未配置"
      :body="
        canManageExamOwner === true
          ? '本考试尚未创建阅卷组织；请用顶栏「创建阅卷组织」办理（创建后可编排题组与分配策略）'
          : '本考试尚未创建阅卷组织；由考试主考老师创建和分配'
      "
      hide-cta
      class="org-entry__panel--empty"
    />

    <UiAlertStrip
      v-if="createSettledMessage"
      :tone="createSettledTone"
      title="创建结果"
      :description="createSettledMessage"
      dense
      class="org-entry__alert"
    />

    <UiDrawer
      :open="createDrawerOpen"
      title="新建阅卷组织"
      :width="520"
      :confirm-loading="creating === true"
      @update:open="(v: boolean) => (createDrawerOpen = v)"
      @close="createDrawerOpen = false"
      @ok="submitCreate"
    >
      <UiForm ref="createFormRef" :model="createForm" :rules="createRules" layout="vertical">
        <UiFormItem label="关联考试">
          <UiInput
            size="sm" :value="examLabel" disabled
          />
        </UiFormItem>
        <UiFormItem label="是否启用匿名阅卷" name="anonymousMode">
          <UiSwitch size="sm" v-model="createForm.anonymousMode" />
          <span class="org-entry__switch-hint">启用后阅卷教师不可见考生身份</span>
        </UiFormItem>
        <UiFormItem label="备注" name="remark">
          <UiTextarea
            size="sm"
            v-model="createForm.remark"
            :rows="3"
            :maxlength="200"
            placeholder="可选，记录组织目的 / 范围"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
// MVR-945：canManage* 控制流仅认 === true
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { OrganizationCreateRequest } from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createOrganization, getOrganization } from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkingOrgPermission } from '@/composables/useMarkingOrgPermission'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  resolveMarkingOrganizationDetailRoute,
  resolveMarkingOrganizationFormalHubRoute,
} from '@/utils/marking-organization-navigation'

defineOptions({ name: 'MarkingOrgWorkspaceEntry' })

const { contextBarTitle, contextBarSubtitle, examStatusLabel, examStatusTone }
  = useExamJourneyContextBar('阅卷组织')

const route = useRoute()
const router = useRouter()
const { refreshSnapshot } = useWorkspaceExamId()
const { selectedExamId, selectedExamLabel, selectedExam } = useMarkExamContext()

const examCreateUserId = computed(() => selectedExam.value?.createUser)
/** MVR-324：用 getOrganization 空壳/详情下发的 canManageExamOwner，禁止 ref(null)+createUser 回退 */
const organizationGate = ref<Awaited<ReturnType<typeof getOrganization>> | null>(null)
const { canManageExamOwner } = useMarkingOrgPermission(examCreateUserId, organizationGate)

const resolving = ref(true)
const resolveLoadFailed = ref(false)
/** null=未知；true=已配置（通常已跳转）；false=明确未配置 */
const organizationConfigured = ref<boolean | null>(null)
const createSettledMessage = ref('')
const createSettledTone = ref<'success' | 'warning' | 'error'>('success')
let resolveGeneration = 0
const skipFirstActivatedResolve = ref(true)
const examLabel = computed(() => selectedExamLabel.value || '未选择考试')

const entrySignalMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'configured',
    label: '组织状态',
    value: '未创建',
    tone: 'orange',
  },
  {
    key: 'exam',
    label: '关联考试',
    value: examLabel.value,
    tone: 'blue',
  },
  {
    key: 'anonymous',
    label: '匿名阅卷',
    value: '创建时配置',
    tone: 'gray',
  },
])

function isSameDetailRoute(organizationId: string, examId: string): boolean {
  return (
    route.name === 'TeacherExamWorkspaceMarkingOrgDetail'
    && String(route.params.examId) === examId
    && String(route.params.organizationId) === organizationId
  )
}

function isSameFormalHubRoute(examId: string): boolean {
  return (
    route.name === 'TeacherExamWorkspaceMarkingOrgFormalHub'
    && String(route.params.examId) === examId
  )
}

/** 已配置组织时跳转详情页，未配置时留在本页展示创建入口；失败不得伪装成未配置。 */
async function redirectToDetailIfConfigured(): Promise<void> {
  const examId = selectedExamId.value
  const generation = ++resolveGeneration
  if (!examId) {
    resolving.value = false
    resolveLoadFailed.value = false
    organizationConfigured.value = null
    organizationGate.value = null
    return
  }
  resolving.value = true
  resolveLoadFailed.value = false
  try {
    const org = await getOrganization({ examId })
    if (generation !== resolveGeneration || selectedExamId.value !== examId) {
      return
    }
    organizationGate.value = org
    organizationConfigured.value = org.configured === true
    resolveLoadFailed.value = false
    if (org.configured && org.id) {
      if (route.query.setupTab === 'launch') {
        if (!isSameFormalHubRoute(examId)) {
          await router.replace(resolveMarkingOrganizationFormalHubRoute(examId))
        }
        return
      }
      if (isSameDetailRoute(org.id, examId)) {
        return
      }
      const target = resolveMarkingOrganizationDetailRoute(org.id, examId)
      const query = { ...route.query }
      delete query.setupTab
      await router.replace(typeof target === 'string' ? target : { ...target, query })
    }
  } catch (error) {
    if (generation !== resolveGeneration || selectedExamId.value !== examId) {
      return
    }
    organizationGate.value = null
    organizationConfigured.value = null
    resolveLoadFailed.value = true
    showUserError(error, '阅卷组织加载失败')
  } finally {
    if (generation === resolveGeneration) {
      resolving.value = false
    }
  }
}

function guardExamOwnerAction(): boolean {
  if (canManageExamOwner.value === true) return true
  showFormValidationMessage('仅考试主考老师可执行该操作')
  return false
}

const createDrawerOpen = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()

interface CreateForm {
  anonymousMode: boolean
  remark?: string
}

const createForm = reactive<CreateForm>({
  anonymousMode: true,
  remark: '',
})

const createRules: Record<string, Rule[]> = {
  remark: [{ max: 200, message: '备注最多 200 字', trigger: 'blur' }],
}

function openCreateDrawer(): void {
  if (!guardExamOwnerAction()) return
  if (resolveLoadFailed.value) {
    void message.warning('组织加载失败，无法创建')
    return
  }
  if (!selectedExamId.value) {
    showFormValidationMessage('请先选择考试')
    return
  }
  createForm.anonymousMode = true
  createForm.remark = ''
  createSettledMessage.value = ''
  createDrawerOpen.value = true
}

async function submitCreate(): Promise<void> {
  if (creating.value === true) return
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
      anonymousMode: createForm.anonymousMode,
      remark: createForm.remark?.trim() || undefined,
    }
    const nextOrganization = await createOrganization(request)
    createDrawerOpen.value = false
    createSettledTone.value = 'success'
    createSettledMessage.value = '阅卷组织已创建'
    void message.success('阅卷组织已创建')
    try {
      await refreshSnapshot()
    } catch (error) {
      createSettledTone.value = 'warning'
      createSettledMessage.value = '阅卷组织已创建，但阶段快照刷新失败；页面将继续进入组织详情'
      showUserError(error, '阅卷组织已创建，但阶段快照刷新失败')
    }
    if (nextOrganization.id) {
      await router.replace(
        resolveMarkingOrganizationDetailRoute(nextOrganization.id, selectedExamId.value),
      )
    } else {
      await redirectToDetailIfConfigured()
    }
  } catch (error) {
    createSettledTone.value = 'error'
    createSettledMessage.value = '阅卷组织创建失败'
    showUserError(error, '阅卷组织创建失败')
  } finally {
    creating.value = false
  }
}

watch(
  selectedExamId,
  () => {
    createSettledMessage.value = ''
    void redirectToDetailIfConfigured()
  },
  { immediate: true },
)

onActivated(() => {
  if (skipFirstActivatedResolve.value) {
    skipFirstActivatedResolve.value = false
    return
  }
  // 失败、未解析或未配置：激活时再拉一次，避免他人已创建后仍卡在创建态
  if (resolveLoadFailed.value || organizationConfigured.value !== true) {
    void redirectToDetailIfConfigured()
  }
})
</script>

<style lang="scss" scoped>
.org-entry {
  &__alert {
    margin-bottom: var(--dp-space-component);
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);

    &--empty {
      text-align: center;
      padding: var(--dp-space-component);
    }
  }

  &__empty-title {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-type-panel-title-size);
    font-weight: 600;
    color: var(--dp-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--dp-space-component-tight);
  }

  &__empty-desc {
    margin: var(--dp-space-component-tight) 0 var(--dp-space-block);
    font-size: var(--dp-font-size-md);
    color: var(--dp-text-secondary);
  }

  &__switch-hint {
    margin-left: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }
}
</style>
