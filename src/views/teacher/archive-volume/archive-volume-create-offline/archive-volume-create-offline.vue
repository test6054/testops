<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="线下纯归档建卷"
        subtitle="历史纸质档案 · 基本信息 → 归档配置 → 确认建卷"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="ac.handleGoBack"> 返回列表 </UiButton>
          <UiButton
            variant="primary"
            :loading="ac.submitting.value"
            :disabled="ac.submitting.value"
            @click="handleSubmit"
          >
            {{ ac.submitting.value ? '创建中…' : '创建归档卷' }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <div class="create-layout">
      <aside class="create-layout__aside">
        <div class="create-layout__aside-sticky">
          <UiSidebarNav
            :items="ac.navItems.value"
            :active-key="ac.activeSection.value"
            @select="(item) => void scrollToSection(String(item.key))"
          />
        </div>
      </aside>

      <div class="create-layout__main">
        <ArchiveLifecyclePipe
          title="建卷步骤"
          :steps="createLifecycleSteps"
          clickable
          class="create-layout__pipe"
          @step-click="(key) => void scrollToSection(key)"
        />
        <UiAlertStrip
          v-if="ac.submitErrorMessage.value"
          tone="error"
          title="创建失败"
          :description="ac.submitErrorMessage.value"
          dense
          class="create-layout__submit-error"
        />
        <UiSkeletonState v-if="ac.submitting.value" variant="card" compact />
        <template v-else>
          <BasicInfoStep
            :basic-rules="ac.basicRules"
            @course-change="ac.setCourseSelection"
            @department-change="ac.setDepartmentSelection"
            @teaching-class-change="ac.setTeachingClassSelection"
            @update:basic-form-ref="ac.basicFormRef.value = $event"
          />
          <ArchiveConfigStep
            :config-rules="ac.configRules"
            :template-set-options="ac.templateSetOptions.value"
            :template-loading="ac.templateLoading.value"
            @template-change="ac.setTemplateSet"
            @responsible-change="ac.setResponsibleUser"
            @update:config-form-ref="ac.configFormRef.value = $event"
          />
          <ConfirmStep />
        </template>
      </div>
    </div>

    <ArchiveVolumeListNextStepsPanel variant="create-offline" />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import ArchiveLifecyclePipe from '@/components/archive-volume/ArchiveLifecyclePipe.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSidebarNav from '@/components/ui-guide/ui/UiSidebarNav.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { buildArchiveOfflineCreateLifecycleSteps } from '@/utils/archive-volume-lifecycle'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'
import {
  archiveVolumeCreateBasicFormKey,
  archiveVolumeCreateConfigFormKey,
  isArchiveVolumeCreateSectionKey,
} from './archive-volume-create-context'
import ArchiveConfigStep from './ArchiveConfigStep.vue'
import BasicInfoStep from './BasicInfoStep.vue'
import ConfirmStep from './ConfirmStep.vue'
import { useArchiveVolumeCreateOffline } from './useArchiveVolumeCreateOffline'

defineOptions({ name: 'TeacherArchiveVolumeCreateOffline' })

const ac = useArchiveVolumeCreateOffline()
const createLifecycleSteps = computed(() =>
  buildArchiveOfflineCreateLifecycleSteps(ac.activeSection.value),
)
provide(archiveVolumeCreateBasicFormKey, ac.basicForm)
provide(archiveVolumeCreateConfigFormKey, ac.configForm)
const scrollContainerRef = ref<HTMLElement | null>(null)

function findScrollContainer(): HTMLElement | null {
  return document.querySelector('.main-scroll-wrapper')
}

async function scrollToSection(sectionId: string): Promise<void> {
  if (!isArchiveVolumeCreateSectionKey(sectionId)) return
  if (!(await ac.validateStepsBeforeSection(sectionId))) return
  ac.activeSection.value = sectionId
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
  const sections = ac.navItems.value.map((item) => String(item.key))
  for (let i = sections.length - 1; i >= 0; i--) {
    const el = document.getElementById(sections[i])
    if (el && el.getBoundingClientRect().top <= threshold) {
      const sectionKey = sections[i]
      if (isArchiveVolumeCreateSectionKey(sectionKey)) {
        ac.activeSection.value = sectionKey
      }
      return
    }
  }
  const firstSectionKey = sections[0]
  if (isArchiveVolumeCreateSectionKey(firstSectionKey)) {
    ac.activeSection.value = firstSectionKey
  }
}

async function handleSubmit(): Promise<void> {
  await ac.handleCreateVolume()
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

  &__pipe {
    margin-bottom: 8px;

    :deep(.archive-lifecycle-pipe) {
      padding: 4px 0 0;
    }

    :deep(.archive-lifecycle-pipe__node) {
      min-width: 68px;
    }

    :deep(.archive-lifecycle-pipe__dot) {
      width: 28px;
      height: 28px;
      font-size: 10px;
    }

    :deep(.archive-lifecycle-pipe__connector) {
      width: 20px;
      margin-top: 13px;
    }
  }

  &__submit-error {
    margin-bottom: 12px;
  }

  &__main {
    min-width: 0;
    width: 100%;
    max-width: 920px;
    padding: 0 16px;
    background: transparent;

    :deep(.archive-create-form:first-of-type) {
      padding-bottom: 0;
      border-bottom: none;
    }
  }
}

:deep(.archive-create-step) {
  padding: 16px 0 20px;
  scroll-margin-top: 16px;

  &:not(:last-child) {
    margin-bottom: 4px;
  }
}

:deep(.archive-create-step__head) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.archive-create-step__title) {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text);
}

:deep(.archive-create-step__desc) {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}

:deep(.archive-create-form__body) {
  max-width: 880px;
  padding: 0 12px 4px;
}

:deep(.archive-create-form__body .ant-form-item) {
  margin-bottom: 12px;
}

:deep(.archive-create-form__grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
  row-gap: 0;
}

:deep(.archive-create-form__full) {
  grid-column: 1 / -1;
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

  :deep(.archive-create-form__grid) {
    grid-template-columns: minmax(0, 1fr);
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
