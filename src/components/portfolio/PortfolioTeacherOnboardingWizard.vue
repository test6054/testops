<template>
  <div class="portfolio-onboarding-wizard">
    <UiAlertStrip
      v-if="blockedByTemplate"
      tone="error"
      :closable="false"
      size="sm"
      dense
      inline
      :show-icon="false"
      class="portfolio-onboarding-wizard__gate"
    >
      <template #default>
        <span class="portfolio-onboarding-wizard__gate-row">
          <UiTag tone="red" size="sm">未启用</UiTag>
          <span>
            {{
              readiness?.blockingReason
                || '本校档案模板尚未发布，请联系管理员发布后再启用我的教学档案袋'
            }}
          </span>
        </span>
      </template>
    </UiAlertStrip>
    <UiAlertStrip
      v-else-if="blockedByReadiness"
      tone="error"
      :closable="false"
      size="sm"
      dense
      inline
      :show-icon="false"
      class="portfolio-onboarding-wizard__gate"
    >
      <template #default>
        <span class="portfolio-onboarding-wizard__gate-row">
          <UiTag tone="red" size="sm">状态不可用</UiTag>
          <span>无法确认模板与引导状态，请联系管理员后再启用我的教学档案袋</span>
        </span>
      </template>
    </UiAlertStrip>

    <div
      v-if="onboardingState?.ownerIdentityLayers?.length"
      class="portfolio-onboarding-wizard__identity"
      role="status"
    >
      <span class="portfolio-onboarding-wizard__identity-label">当前身份层</span>
      <PortfolioOwnerIdentityLayersCell
        :layers="onboardingState.ownerIdentityLayers"
        :note="onboardingState.ownerMultiIdentityNote"
        show-note
      />
    </div>

    <template v-if="effectiveReadonly">
      <UiCard title="档案分类树" class="portfolio-onboarding-wizard__card">
        <UiTree
          v-if="reviewContent?.categoryTree?.length"
          :tree-data="reviewTreeData"
          default-expand-all
          block-node
        />
        <UiEmpty size="sm" v-else description="暂无分类树数据" />
      </UiCard>
      <UiCard title="字段规格摘要" class="portfolio-onboarding-wizard__card">
        <div
          v-for="item in reviewContent?.fieldSpecSummaries ?? []"
          :key="item.categoryId"
          class="portfolio-onboarding-wizard__spec-row"
        >
          <strong>{{ item.categoryName }}</strong>
          <span>{{ item.fieldLabels.join('、') }}</span>
        </div>
        <UiEmpty size="sm" v-if="!reviewContent?.fieldSpecSummaries?.length" description="暂无字段规格" />
      </UiCard>
    </template>

    <template v-else-if="!blockedByTemplate && !blockedByReadiness">
      <UiCard :title="stepTitle" class="portfolio-onboarding-wizard__card">
        <p v-if="currentStep === 1" class="portfolio-onboarding-wizard__copy">
          启用我的教学档案袋：按分类树组织材料与档案记录，经审核后进入画像与发展评价。
        </p>
        <p v-else-if="currentStep === 2" class="portfolio-onboarding-wizard__copy">
          浏览本校档案分类树，了解必填分类与层级结构。
        </p>
        <p v-else-if="currentStep === 3" class="portfolio-onboarding-wizard__copy">
          选择叶子分类查看已发布字段规格，确认填报要求。
        </p>
        <p v-else-if="currentStep === 4" class="portfolio-onboarding-wizard__copy">
          可进入采集工作台上传示范材料（不入审核链）。
        </p>
        <p v-else class="portfolio-onboarding-wizard__copy">
          引导完成后进入工作台，开始日常材料采集与档案维护。
        </p>

        <UiTree
          v-if="currentStep === 2 && categoryTree.length"
          :tree-data="interactiveTreeData"
          default-expand-all
          block-node
        />
        <div v-if="currentStep === 3" class="portfolio-onboarding-wizard__picker">
          <PortfolioCategoryTreePicker
            v-model:model-value="previewCategoryId"
            :teacher-id="targetTeacherId ?? undefined"
          />
          <UiDataTable
            v-if="previewFields.length"
            row-key="fieldCode"
            pagination-mode="none"
            :columns="fieldPreviewColumns"
            :data-source="previewFields"
            :show-pagination="false"
            :sticky-header="false"
            flat
          />
        </div>
        <UiAlertStrip
          v-if="currentStep === 4 && !templateReady"
          tone="warning"
          title="模板尚未就绪，请联系管理员发布档案模板"
        />
      </UiCard>

      <div class="portfolio-onboarding-wizard__actions">
        <UiButton size="sm" variant="ghost" @click="handleDismiss"> 稍后继续 </UiButton>
        <UiButton size="sm" v-if="currentStep > 1" variant="outline" @click="prevStep"> 上一步 </UiButton>
        <UiButton variant="primary" size="sm" v-if="currentStep < totalSteps" @click="nextStep"> 下一步 </UiButton>
        <UiButton variant="primary" size="sm" v-else :loading="completing" @click="handleComplete">
          启用我的教学档案袋
        </UiButton>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioArchiveTeacherReadinessVO,
  PortfolioTargetFieldDefinition,
  PortfolioTeacherOnboardingReviewContentVO,
  PortfolioTeacherOnboardingStateVO,
} from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioOnboardingApi } from '@/apis/portfolio/onboarding'
import PortfolioCategoryTreePicker from '@/components/portfolio/PortfolioCategoryTreePicker.vue'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTree from '@/components/ui-guide/ui/UiTree.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'PortfolioTeacherOnboardingWizard' })

const props = defineProps<{
  blockedByTemplate?: boolean
  blockedByReadiness?: boolean
  readonlyMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'completed'): void
}>()

const router = useRouter()
const { targetTeacherId } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()

const loading = ref(false)
const completing = ref(false)
const currentStep = ref(1)
const totalSteps = ref(5)
const templateReady = ref(false)
const onboardingState = ref<PortfolioTeacherOnboardingStateVO | null>(null)
const reviewContent = ref<PortfolioTeacherOnboardingReviewContentVO | null>(null)
const readiness = ref<PortfolioArchiveTeacherReadinessVO | null>(null)
const categoryTree = ref<PortfolioArchiveCategoryTreeNodeVO[]>([])
const previewCategoryId = ref('')
const previewFields = ref<PortfolioTargetFieldDefinition[]>([])
const completedReadonly = ref(false)
const onboardingRequestToken = ref(0)
const previewFieldRequestToken = ref(0)

const effectiveReadonly = computed(() => props.readonlyMode || completedReadonly.value)

const fieldPreviewColumns: ColumnsType = [
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel' },
  { title: '编码', dataIndex: 'fieldCode', key: 'fieldCode', width: 140 },
  { title: '必填', key: 'required', width: 72 },
]

const stepTitle = computed(() => {
  const titles = ['欢迎', '浏览分类', '认识规格', '材料采集', '完成引导']
  return `步骤 ${currentStep.value} · ${titles[currentStep.value - 1]}`
})

function mapTreeNodes(
  nodes: PortfolioArchiveCategoryTreeNodeVO[],
): Array<{ key: string, title: string, children?: ReturnType<typeof mapTreeNodes> }> {
  return nodes.map((node) => ({
    key: node.id,
    title: node.categoryName,
    children: node.children?.length ? mapTreeNodes(node.children) : undefined,
  }))
}

const interactiveTreeData = computed(() => mapTreeNodes(categoryTree.value))
const reviewTreeData = computed(() => mapTreeNodes(reviewContent.value?.categoryTree ?? []))

const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

function resetInteractiveState() {
  onboardingRequestToken.value += 1
  previewFieldRequestToken.value += 1
  currentStep.value = 1
  templateReady.value = false
  categoryTree.value = []
  previewCategoryId.value = ''
  previewFields.value = []
  onboardingState.value = null
}

function resetReadonlyState() {
  completedReadonly.value = false
  reviewContent.value = null
  readiness.value = null
}

async function loadState() {
  const requestToken = onboardingRequestToken.value
  loading.value = true
  try {
    const nextState = await portfolioOnboardingApi.getState(teacherRequest.value)
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    onboardingState.value = nextState
    currentStep.value = onboardingState.value.currentStep || 1
    if (onboardingState.value.totalSteps) {
      totalSteps.value = onboardingState.value.totalSteps
    }
    templateReady.value = Boolean(onboardingState.value.templateReady)
    completedReadonly.value = Boolean(onboardingState.value.completed)
    if (completedReadonly.value) {
      await loadReviewContent()
    }
  } catch (error) {
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载引导状态失败')
  } finally {
    if (onboardingRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function loadReviewContent() {
  const requestToken = onboardingRequestToken.value
  try {
    const nextReviewContent = await portfolioOnboardingApi.getReviewContent(teacherRequest.value)
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    reviewContent.value = nextReviewContent
  } catch (error) {
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载引导回顾内容失败')
  }
}

async function loadCategoryTree() {
  const requestToken = onboardingRequestToken.value
  try {
    const nextCategoryTree
      = (await portfolioArchiveTemplateApi.listCategoryTree({
        teacherId: targetTeacherId.value || undefined,
      })) ?? []
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    categoryTree.value = nextCategoryTree
  } catch (error) {
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载档案分类树失败')
  }
}

async function loadReadiness() {
  const requestToken = onboardingRequestToken.value
  try {
    const nextReadiness = await portfolioArchiveTemplateApi.getTeacherReadiness()
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    readiness.value = nextReadiness
  } catch (error) {
    if (onboardingRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载模板就绪状态失败')
  }
}

async function loadPreviewFields(categoryId: string) {
  const requestToken = onboardingRequestToken.value
  const fieldRequestToken = ++previewFieldRequestToken.value
  if (!categoryId) {
    previewFields.value = []
    return
  }
  try {
    const published = await portfolioArchiveTemplateApi.listPublishedFields({ categoryId })
    if (
      onboardingRequestToken.value !== requestToken
      || previewFieldRequestToken.value !== fieldRequestToken
      || previewCategoryId.value !== categoryId
    ) {
      return
    }
    previewFields.value = published.targetFields
  } catch (error) {
    if (
      onboardingRequestToken.value !== requestToken
      || previewFieldRequestToken.value !== fieldRequestToken
      || previewCategoryId.value !== categoryId
    ) {
      return
    }
    previewFields.value = []
    showUserError(error, '加载字段规格失败')
  }
}

async function persistStep(step: number) {
  await portfolioOnboardingApi.saveProgress({
    ...teacherRequest.value,
    currentStep: step,
  })
}

async function nextStep() {
  const next = Math.min(currentStep.value + 1, totalSteps.value)
  await persistStep(next)
  currentStep.value = next
}

async function prevStep() {
  const prev = Math.max(currentStep.value - 1, 1)
  await persistStep(prev)
  currentStep.value = prev
}

async function handleDismiss() {
  if (!(await confirmProxyWrite('跳过建档引导'))) {
    return
  }

  try {
    await portfolioOnboardingApi.dismiss(teacherRequest.value)
    message.success('已设置 7 天后再提醒')
    void router.push({
      path: '/portfolio/teacher/home',
      query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
    })
  } catch (error) {
    showUserError(error, '保存稍后继续失败')
  }
}

async function handleComplete() {
  if (!(await confirmProxyWrite('完成建档引导'))) {
    return
  }

  completing.value = true
  try {
    await portfolioOnboardingApi.complete(teacherRequest.value)
    message.success('引导已完成')
    emit('completed')
    void router.push({
      path: '/portfolio/teacher/home',
      query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
    })
  } catch (error) {
    showUserError(error, '完成引导失败')
  } finally {
    completing.value = false
  }
}

watch(previewCategoryId, (value) => {
  void loadPreviewFields(value)
})

watch(
  () => [
    props.readonlyMode,
    props.blockedByTemplate,
    props.blockedByReadiness,
    targetTeacherId.value,
  ],
  () => {
    resetInteractiveState()
    resetReadonlyState()
    if (props.readonlyMode || props.blockedByTemplate || props.blockedByReadiness) {
      if (props.readonlyMode) {
        void loadReviewContent()
      }
      if (props.blockedByTemplate) {
        void loadReadiness()
      }
      return
    }
    void loadState()
    void loadCategoryTree()
  },
  { immediate: true },
)

onMounted(() => {
  if (props.blockedByTemplate) {
    void loadReadiness()
  }
})
</script>

<style scoped lang="scss">
.portfolio-onboarding-wizard__card {
  margin: var(--dp-space-4);
}

.portfolio-onboarding-wizard__gate {
  margin: var(--dp-space-3) var(--dp-space-4);
}

.portfolio-onboarding-wizard__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.portfolio-onboarding-wizard__copy {
  margin: 0 0 var(--dp-space-4);
  color: var(--dp-text-secondary);
  line-height: 1.6;
}

.portfolio-onboarding-wizard__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  padding: 0 var(--dp-space-4) var(--dp-space-4);
}

.portfolio-onboarding-wizard__picker {
  display: grid;
  gap: var(--dp-space-4);
}

.portfolio-onboarding-wizard__spec-row {
  display: grid;
  gap: var(--dp-space-1);
  padding: var(--dp-space-2) 0;
  border-bottom: 1px solid var(--dp-border);
}
</style>
