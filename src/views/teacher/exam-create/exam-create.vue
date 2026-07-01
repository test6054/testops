<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="新建考试">
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="ec.handleGoBack">
            <template #icon><ArrowLeftOutlined /></template>
            返回
          </UiButton>
          <UiButton
            variant="primary"
            :loading="ec.submitting.value"
            :disabled="ec.submitting.value || ec.rosterPreviewSyncing.value"
            @click="handleSubmit"
          >
            <template v-if="!ec.submitting.value" #icon><SaveOutlined /></template>
            {{ ec.submitting.value ? '创建中…' : '创建考试' }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <div class="create-layout">
      <aside class="create-layout__aside">
        <div class="create-layout__aside-sticky">
          <UiSidebarNav
            :items="ec.navItems.value"
            :active-key="ec.activeSection.value"
            @select="(item) => void scrollToSection(String(item.key))"
          />
        </div>
      </aside>

      <div class="create-layout__main">
        <a-spin :spinning="ec.submitting.value" tip="正在创建…">
          <BasicSettingsStep
            :basic-rules="ec.basicRules"
            @course-change="ec.setCourseSelection"
            @update:basic-form-ref="ec.basicFormRef.value = $event"
          />
          <MarkingTeamStep
            :marking-team-rules="ec.markingTeamRules"
            @chief-change="ec.setChiefExaminer"
            @reviewers-change="ec.setReviewerNickNames"
            @update:marking-team-form-ref="ec.markingTeamFormRef.value = $event"
          />
          <CandidateScopeStep
            :roster-rules="ec.rosterRules"
            @change-scope-mode="ec.changeScopeMode"
            @sync-class-scope="ec.syncClassScopeCandidates"
            @roster-preview-syncing="ec.setRosterPreviewSyncing"
            @add-candidates="ec.addCandidates"
            @remove-candidate="ec.removeCandidate"
            @update:roster-form-ref="ec.rosterFormRef.value = $event"
          />
          <ConfirmStep
            :submitting="ec.submitting.value"
            :preview-syncing="ec.rosterPreviewSyncing.value"
            @submit="handleSubmit"
          />
        </a-spin>
      </div>
    </div>

    <UiConfirmModal
      v-model:open="ec.showSuccessModal.value"
      type="success"
      title="创建成功"
      content="考试、阅卷队伍与考生范围已创建，可进入工作台继续准备。"
      ok-text="进入工作台"
      cancel-text="返回列表"
      :closable="false"
      :mask-closable="false"
      @ok="ec.handleViewWorkspace"
      @cancel="ec.handleBackToList"
    />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {ExamCreateSectionKey} from './exam-create-context';
import ArrowLeftOutlined from '@ant-design/icons-vue/ArrowLeftOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import { nextTick, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import UiSidebarNav from '@/components/ui-guide/ui/UiSidebarNav.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import BasicSettingsStep from './BasicSettingsStep.vue'
import CandidateScopeStep from './CandidateScopeStep.vue'
import ConfirmStep from './ConfirmStep.vue'
import {
  examCreateBasicFormKey,
  examCreateMarkingTeamFormKey,
  examCreateRosterFormKey,
  
  isExamCreateSectionKey
} from './exam-create-context'
import MarkingTeamStep from './MarkingTeamStep.vue'
import { useExamCreate } from './useExamCreate'

const ec = useExamCreate()
provide(examCreateBasicFormKey, ec.examForm)
provide(examCreateMarkingTeamFormKey, ec.markingTeamForm)
provide(examCreateRosterFormKey, ec.rosterForm)
const scrollContainerRef = ref<HTMLElement | null>(null)

function findScrollContainer(): HTMLElement | null {
  return document.querySelector('.main-scroll-wrapper')
}

function scrollToSectionAnchor(sectionId: ExamCreateSectionKey): void {
  ec.activeSection.value = sectionId
  const el = document.getElementById(sectionId)
  const container = scrollContainerRef.value
  if (!el || !container) return
  const containerTop = container.getBoundingClientRect().top
  const elTop = el.getBoundingClientRect().top
  const offset = elTop - containerTop + container.scrollTop - 24
  container.scrollTo({ top: offset, behavior: 'smooth' })
}

async function scrollToSection(sectionId: string): Promise<void> {
  if (!isExamCreateSectionKey(sectionId)) return
  if (!(await ec.validateStepsBeforeSection(sectionId))) {
    if (isExamCreateSectionKey(ec.activeSection.value)) {
      scrollToSectionAnchor(ec.activeSection.value)
      await nextTick()
      ec.scrollToFirstInvalidField()
    }
    return
  }
  ec.activeSection.value = sectionId
  scrollToSectionAnchor(sectionId)
}

function handleScroll(): void {
  const container = scrollContainerRef.value
  if (!container) return
  const threshold = container.getBoundingClientRect().top + 80
  const sections = ec.navItems.value.map(item => String(item.key))
  for (let i = sections.length - 1; i >= 0; i--) {
    const el = document.getElementById(sections[i])
    if (el && el.getBoundingClientRect().top <= threshold) {
      const sectionKey = sections[i]
      if (isExamCreateSectionKey(sectionKey)) {
        ec.activeSection.value = sectionKey
      }
      return
    }
  }
  const firstSectionKey = sections[0]
  if (isExamCreateSectionKey(firstSectionKey)) {
    ec.activeSection.value = firstSectionKey
  }
}

async function handleSubmit(): Promise<void> {
  const failedSection = await ec.handleCreateExam()
  if (!failedSection) return
  scrollToSectionAnchor(failedSection)
  await nextTick()
  ec.scrollToFirstInvalidField()
}

onMounted(() => {
  scrollContainerRef.value = findScrollContainer()
  scrollContainerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  scrollContainerRef.value?.removeEventListener('scroll', handleScroll)
})
</script>

<style lang="scss" scoped>
.create-layout {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  padding: 0 0 60px;

  &__aside {
    position: relative;
    border-right: 1px solid var(--dp-border, #e5e7eb);
    padding-right: 16px;
  }

  &__aside-sticky {
    position: sticky;
    top: 16px;
  }

  &__main {
    min-width: 0;
    width: 100%;
    max-width: 920px;
    padding: 0 16px;
    background: transparent;

    :deep(.exam-create-form:first-of-type) {
      padding-bottom: 32px;
      border-bottom: 1px solid var(--dp-border, #e5e7eb);
    }
  }
}

:deep(.form-section) {
  padding: 40px 0 32px;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
  scroll-margin-top: 16px;

  &:last-child {
    border-bottom: none;
  }
}

:deep(.section-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
}

:deep(.section-desc) {
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}

:deep(.section-title) {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ant-color-text);
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 18px;
    background: var(--ant-color-primary, #1677ff);
    border-radius: 2px;
    flex-shrink: 0;
  }
}

:deep(.exam-create-form__body) {
  max-width: 880px;
}

:deep(.exam-create-form__grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
  row-gap: 0;
}

:deep(.exam-create-form__grid--single) {
  grid-template-columns: minmax(0, 1fr);
}

:deep(.exam-create-form__grid--triple) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

:deep(.exam-create-form__full) {
  grid-column: 1 / -1;
}

:deep(.exam-create-form__span-2) {
  grid-column: span 2;
}

@media (max-width: 767px) {
  .create-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;

    &__aside {
      border-right: none;
      border-bottom: 1px solid var(--dp-border, #e5e7eb);
      padding-right: 0;
      padding-bottom: 12px;
      margin-bottom: 8px;
    }

    &__aside-sticky {
      position: static;
    }

    &__main {
      max-width: none;
      padding: 0;
    }
  }

  :deep(.exam-create-form__grid) {
    grid-template-columns: minmax(0, 1fr);
  }

  :deep(.exam-create-form__grid--triple) {
    grid-template-columns: minmax(0, 1fr);
  }

  :deep(.exam-create-form__span-2) {
    grid-column: auto;
  }
}

:deep(.ui-sidebar-nav) {
  border: none;
  border-radius: 0;
  background: transparent;
}

:deep(.ui-sidebar-nav__item) {
  border-radius: 0;
  border-right: 2px solid transparent;
}

:deep(.ui-sidebar-nav__item--active) {
  background: transparent;
  border-right-color: var(--ant-color-primary, #1677ff);
  color: var(--ant-color-primary, #1677ff);
  font-weight: 600;
}
</style>
