<template>
  <div class="exam-create-page">
    <div class="page-header">
      <div class="page-header__left">
        <UiButton variant="ghost" size="sm" @click="ec.handleGoBack">
          <template #icon><ArrowLeftOutlined /></template>
          返回
        </UiButton>
        <h1 class="page-header__title">新建考试</h1>
      </div>
      <UiButton
        variant="primary"
        :loading="ec.submitting.value"
        :disabled="ec.submitting.value"
        @click="handleSubmit"
      >
        <template v-if="!ec.submitting.value" #icon><SaveOutlined /></template>
        {{ ec.submitting.value ? '创建中…' : '创建考试' }}
      </UiButton>
    </div>

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
            :exam-form="ec.examForm"
            :basic-rules="ec.basicRules"
            @course-change="ec.setCourseSelection"
            @update:basic-form-ref="ec.basicFormRef.value = $event"
          />
          <MarkingTeamStep
            :marking-team-form="ec.markingTeamForm"
            :marking-team-rules="ec.markingTeamRules"
            @chief-change="ec.setChiefExaminer"
            @reviewers-change="ec.setReviewerNickNames"
            @update:marking-team-form-ref="ec.markingTeamFormRef.value = $event"
          />
          <CandidateScopeStep
            :roster-form="ec.rosterForm"
            :roster-rules="ec.rosterRules"
            @change-scope-mode="ec.changeScopeMode"
            @sync-class-scope="ec.syncClassScopeCandidates"
            @add-candidates="ec.addCandidates"
            @remove-candidate="ec.removeCandidate"
            @update:roster-form-ref="ec.rosterFormRef.value = $event"
          />
          <ConfirmStep
            :exam-form="ec.examForm"
            :marking-team-form="ec.markingTeamForm"
            :roster-form="ec.rosterForm"
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
  </div>
</template>

<script setup lang="ts">
import ArrowLeftOutlined from '@ant-design/icons-vue/ArrowLeftOutlined'
import SaveOutlined from '@ant-design/icons-vue/SaveOutlined'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiConfirmModal from '@/components/ui-guide/ui/ConfirmModal.vue'
import UiSidebarNav from '@/components/ui-guide/ui/UiSidebarNav.vue'
import BasicSettingsStep from './BasicSettingsStep.vue'
import CandidateScopeStep from './CandidateScopeStep.vue'
import ConfirmStep from './ConfirmStep.vue'
import MarkingTeamStep from './MarkingTeamStep.vue'
import { useExamCreate } from './useExamCreate'

const ec = useExamCreate()
const scrollContainerRef = ref<HTMLElement | null>(null)

function findScrollContainer(): HTMLElement | null {
  return document.querySelector('.main-scroll-wrapper')
}

async function scrollToSection(sectionId: string): Promise<void> {
  const target = sectionId as typeof ec.activeSection.value
  if (!(await ec.validateStepsBeforeSection(target))) return
  ec.activeSection.value = target
  const el = document.getElementById(sectionId)
  const container = scrollContainerRef.value
  if (!el || !container) return
  const containerTop = container.getBoundingClientRect().top
  const elTop = el.getBoundingClientRect().top
  const offset = elTop - containerTop + container.scrollTop - 24
  container.scrollTo({ top: offset, behavior: 'smooth' })
}

function handleScroll(): void {
  const container = scrollContainerRef.value
  if (!container) return
  const threshold = container.getBoundingClientRect().top + 80
  const sections = ec.navItems.value.map(item => String(item.key))
  for (let i = sections.length - 1; i >= 0; i--) {
    const el = document.getElementById(sections[i])
    if (el && el.getBoundingClientRect().top <= threshold) {
      ec.activeSection.value = sections[i] as typeof ec.activeSection.value
      return
    }
  }
  ec.activeSection.value = sections[0] as typeof ec.activeSection.value
}

async function handleSubmit(): Promise<void> {
  await ec.handleCreateExam()
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
.exam-create-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 0;
  box-sizing: border-box;
  background: var(--ant-color-bg-container, #fff);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  background: var(--ant-color-bg-container, #fff);
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
  flex-shrink: 0;

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--dp-text-primary, #0f172a);
  }
}

.create-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  padding: 16px 24px 60px;

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
  margin-bottom: 20px;
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

:deep(.ui-sidebar-nav) {
  border: none;
  border-radius: 0;
  background: transparent;
}

:deep(.ui-sidebar-nav__item) {
  border-radius: 0;
  border-right: 2px solid transparent;

  &--active {
    background: transparent;
    border-right-color: var(--ant-color-primary, #1677ff);
    color: var(--ant-color-primary, #1677ff);
    font-weight: 600;
  }
}
</style>
