<template>
  <UiCard class="whole-paper-gallery-card info-card">
    <template #title>
      <FileImageOutlined />
      <span>原始扫描页</span>
    </template>
    <template #extra>
      <UiButton
        size="sm"
        variant="outline"
        :loading="loading"
        :disabled="!taskId || !examId"
        @click="emit('reload')"
      >
        <template #icon><ReloadOutlined /></template>
        刷新影像
      </UiButton>
    </template>
    <UiEmpty v-if="!loaded && !loading" description="正在加载扫描页…" />
    <UiEmpty v-else-if="error" description="暂无数据" />
    <a-spin v-else :spinning="loading" tip="加载扫描页中...">
      <UiEmpty v-if="loaded && pages.length === 0" description="暂无数据" />
      <div
        v-else
        ref="galleryViewportRef"
        class="whole-paper-gallery"
        :class="{ 'whole-paper-gallery--confidential': confidential }"
        @scroll="emit('scroll', $event)"
      >
        <div
          v-if="topSpacerHeight > 0"
          class="whole-paper-gallery__spacer"
          :style="{ height: `${topSpacerHeight}px` }"
        />
        <div
          v-for="item in visiblePages"
          :key="item.page.pageId"
          class="whole-paper-gallery__page"
          :class="{ 'whole-paper-gallery__page--active': item.pageIndex === currentPageIndex }"
        >
          <div class="whole-paper-gallery__page-header">
            <UiTag tone="blue" size="sm">第 {{ item.page.pageSeq }} 页</UiTag>
            <UiTag tone="gray" size="sm">模板页 {{ item.page.templatePageNo }}</UiTag>
            <UiTag :tone="qualityTone(item.page.qualityStatus)" size="sm">
              {{ qualityLabel(item.page.qualityStatus) }}
            </UiTag>
          </div>
          <a-image
            v-if="imageUrls[item.page.pageId]"
            :src="imageUrls[item.page.pageId]"
            :preview="{}"
            class="whole-paper-gallery__image"
            @contextmenu="onConfidentialContextMenu"
          >
            <template #previewMask>点击查看原始扫描页</template>
          </a-image>
          <UiEmpty
            v-else-if="imageErrors[item.page.pageId]"
            description="暂无数据"
          />
          <div v-else class="whole-paper-gallery__image-placeholder">
            <a-spin :spinning="Boolean(imageLoading[item.page.pageId])" />
            <span>扫描页图片加载中</span>
          </div>
          <a-textarea
            v-if="showPageAnnotations"
            :value="pageAnnotations[item.page.pageId]"
            :rows="3"
            :maxlength="1000"
            :disabled="readOnly"
            class="whole-paper-gallery__annotation"
            placeholder="页面级批注，可选"
            show-count
            @update:value="(value: string) => emit('update:pageAnnotation', item.page.pageId, value)"
          />
        </div>
        <div
          v-if="bottomSpacerHeight > 0"
          class="whole-paper-gallery__spacer"
          :style="{ height: `${bottomSpacerHeight}px` }"
        />
      </div>
    </a-spin>
  </UiCard>
</template>

<script lang="ts" setup>
import type { QualityDecisionCode } from '@/apis/mark/exam-scan'
import type { ScannedPageRef } from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { VisibleWholePage } from '@/composables/useWholePaperGallery'
import { FileImageOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'WholePaperGallery' })

const props = defineProps<{
  examId?: string
  taskId?: string
  pages: ScannedPageRef[]
  loaded: boolean
  loading: boolean
  error: Error | null
  visiblePages: VisibleWholePage[]
  topSpacerHeight: number
  bottomSpacerHeight: number
  currentPageIndex: number
  imageUrls: Record<string, string>
  imageLoading: Record<string, boolean>
  imageErrors: Record<string, Error | null>
  pageAnnotations: Record<string, string>
  showPageAnnotations: boolean
  readOnly: boolean
  qualityLabel: (status: QualityDecisionCode) => string
  qualityTone: (status: QualityDecisionCode) => BadgeTone
  confidential?: boolean
}>()

function onConfidentialContextMenu(event: MouseEvent): void {
  if (props.confidential) {
    event.preventDefault()
  }
}

const emit = defineEmits<{
  (e: 'reload'): void
  (e: 'scroll', event: Event): void
  (e: 'update:pageAnnotation', pageId: string, value: string): void
  (e: 'viewport-ready', element: HTMLElement | null): void
}>()

const galleryViewportRef = ref<HTMLElement | null>(null)

watch(galleryViewportRef, (element) => {
  emit('viewport-ready', element)
}, { immediate: true })
</script>

<style lang="scss" scoped>
.whole-paper-gallery {
  max-height: min(72vh, 960px);
  overflow-y: auto;

  &__spacer {
    width: 100%;
  }

  &__page {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--ant-color-border-secondary);

    &--active {
      outline: 2px solid var(--ant-color-primary-border);
      outline-offset: 4px;
      border-radius: var(--dp-radius-sm, 4px);
    }
  }

  &__page-header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__image {
    width: 100%;
    user-select: none;
  }

  &--confidential &__image {
    -webkit-user-drag: none;
  }

  &__image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 240px;
    background: var(--ant-color-fill-quaternary);
    border-radius: var(--dp-radius-sm, 4px);
  }

  &__annotation {
    margin-top: 8px;
  }
}
</style>
