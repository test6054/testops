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
        <template v-if="canManageExamOwner && !resolving" #actions>
          <UiButton variant="primary" size="sm" @click="openCreateDrawer">
            创建阅卷组织
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId && !resolving" #signal>
      <SignalBand variant="tiles" :metrics="entrySignalMetrics" compact />
    </template>

    <ExamWorkspaceJourneySubNav v-if="selectedExamId" />

    <UiSkeletonState v-if="resolving" variant="card" compact />

    <UiEmpty
      v-else
      description="本考试尚未创建阅卷组织"
      class="org-entry__panel--empty"
    >
      <p class="org-entry__empty-desc">
        阅卷组织是组织教师批改试卷的核心实体；创建后可编排题组、配置分配策略并启动试评 / 正评。
      </p>
      <template v-if="canManageExamOwner" #action>
        <UiButton variant="primary" size="md" @click="openCreateDrawer">
          立即创建阅卷组织
        </UiButton>
      </template>
      <p v-else class="org-entry__empty-desc">该考试的阅卷组织由考试主考老师创建和分配。</p>
    </UiEmpty>

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
          <a-input :value="examLabel" disabled />
        </a-form-item>
        <a-form-item label="是否启用匿名阅卷" name="anonymousMode">
          <a-switch v-model:checked="createForm.anonymousMode" />
          <span class="org-entry__switch-hint">启用后阅卷教师不可见考生身份</span>
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
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { OrganizationCreateRequest } from '@/apis/mark/marking-organization'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createOrganization,
  getOrganization,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkingOrgPermission } from '@/composables/useMarkingOrgPermission'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { resolveMarkingOrganizationDetailRoute } from '@/utils/marking-organization-navigation'

defineOptions({ name: 'MarkingOrgWorkspaceEntry' })

const {
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel,
  examStatusTone,
} = useExamJourneyContextBar('阅卷组织')

const route = useRoute()
const router = useRouter()
const { refreshSnapshot } = useWorkspaceExamId()
const { selectedExamId, selectedExamLabel, selectedExam } = useMarkExamContext()

const examCreateUserId = computed(() => selectedExam.value?.createUser)
const { canManageExamOwner } = useMarkingOrgPermission(examCreateUserId, ref(null))

const resolving = ref(true)
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

/** 已配置组织时跳转详情页，未配置时留在本页展示创建入口。 */
async function redirectToDetailIfConfigured(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    resolving.value = false
    return
  }
  resolving.value = true
  try {
    const org = await getOrganization({ examId })
    if (org.configured && org.id) {
      const target = resolveMarkingOrganizationDetailRoute(org.id, examId)
      const query = { ...route.query }
      if (query.setupTab === 'launch') {
        query.tab = 'launch'
        delete query.setupTab
      }
      await router.replace(typeof target === 'string' ? target : { ...target, query })
    }
  } catch (error) {
    showUserError(error, '阅卷组织加载失败')
  } finally {
    resolving.value = false
  }
}

function guardExamOwnerAction(): boolean {
  if (canManageExamOwner.value) return true
  message.warning('仅考试主考老师可执行该操作')
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
  if (!selectedExamId.value) {
    message.warning('请先选择考试')
    return
  }
  createForm.anonymousMode = true
  createForm.remark = ''
  createDrawerOpen.value = true
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
      anonymousMode: createForm.anonymousMode,
      remark: createForm.remark?.trim() || undefined,
    }
    const nextOrganization = await createOrganization(request)
    message.success('阅卷组织已创建')
    createDrawerOpen.value = false
    await refreshSnapshot()
    if (nextOrganization.id) {
      await router.replace(
        resolveMarkingOrganizationDetailRoute(nextOrganization.id, selectedExamId.value),
      )
    } else {
      await redirectToDetailIfConfigured()
    }
  } catch (error) {
    showUserError(error, '阅卷组织创建失败')
  } finally {
    creating.value = false
  }
}

watch(selectedExamId, () => {
  void redirectToDetailIfConfigured()
}, { immediate: true })

onActivated(() => {
  void redirectToDetailIfConfigured()
})
</script>

<style lang="scss" scoped>
.org-entry {
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
    color: var(--dp-text-secondary, #64748b);
  }

  &__switch-hint {
    margin-left: 8px;
    font-size: 13px;
    color: var(--dp-text-secondary, #64748b);
  }
}
</style>
