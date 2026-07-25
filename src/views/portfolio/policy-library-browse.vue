<script setup lang="ts">
import type {
  PortfolioPolicyDocumentPreviewVO,
  PortfolioPolicyDocumentSearchVO,
} from '@/apis/portfolio/policy'
import type { PortfolioPolicyDocumentStatusCode } from '@/types/enums/portfolio-policy-document-status-enum'
import type { PortfolioPolicyLevelCode } from '@/types/enums/portfolio-policy-level-enum'
import message from 'ant-design-vue/es/message'
import { reactive, ref } from 'vue'
import { portfolioPolicyApi } from '@/apis/portfolio/policy'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioPolicyDocumentStatusDescription } from '@/types/enums/portfolio-policy-document-status-enum'
import { PortfolioPolicyLevelDescription } from '@/types/enums/portfolio-policy-level-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const loadFailed = ref(false)
const lastSuccessAt = ref<string | null>(null)
const keyword = ref('')
const appliedKeyword = ref('')
const includeHistory = ref(false)
const appliedIncludeHistory = ref(false)
const rows = ref<PortfolioPolicyDocumentSearchVO[]>([])
const previewOpen = ref(false)
const previewLoading = ref(false)
const downloading = ref(false)
const previewTargetId = ref('')
const preview = ref<PortfolioPolicyDocumentPreviewVO | null>(null)
const searchRequestToken = ref(0)
const previewRequestToken = ref(0)

const query = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })

function levelLabel(code: string) {
  return strictEnumLabel(
    PortfolioPolicyLevelDescription,
    code as PortfolioPolicyLevelCode,
    '政策层级',
  )
}

function statusLabel(code: string) {
  return strictEnumLabel(
    PortfolioPolicyDocumentStatusDescription,
    code as PortfolioPolicyDocumentStatusCode,
    '政策状态',
  )
}

async function search(resetPage = true) {
  const kw = resetPage ? keyword.value.trim() : appliedKeyword.value
  if (!kw) {
    searchRequestToken.value += 1
    loading.value = false
    loadFailed.value = false
    appliedKeyword.value = ''
    appliedIncludeHistory.value = false
    rows.value = []
    query.total = 0
    lastSuccessAt.value = null
    return
  }
  if (resetPage) {
    query.pageNum = 1
    appliedKeyword.value = kw
    appliedIncludeHistory.value = includeHistory.value
  }
  const requestToken = searchRequestToken.value + 1
  searchRequestToken.value = requestToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    keyword: kw,
    includeHistory: resetPage ? includeHistory.value : appliedIncludeHistory.value,
  }
  loading.value = true
  loadFailed.value = false
  try {
    const result = await portfolioPolicyApi.search(request)
    if (searchRequestToken.value !== requestToken) {
      return
    }
    rows.value = result.list ?? []
    query.total = result.total ?? 0
    query.pageNum = result.pageNum ?? request.pageNum
    query.pageSize = result.pageSize ?? request.pageSize
    lastSuccessAt.value = new Date().toISOString()
  } catch (error) {
    if (searchRequestToken.value !== requestToken) {
      return
    }
    loadFailed.value = true
    showUserError(error, '检索政策失败')
  } finally {
    if (searchRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function openPreview(id: string) {
  const requestToken = previewRequestToken.value + 1
  previewRequestToken.value = requestToken
  previewLoading.value = true
  previewTargetId.value = id
  previewOpen.value = false
  preview.value = null
  try {
    const result = await portfolioPolicyApi.preview({ id })
    if (previewRequestToken.value !== requestToken) {
      return
    }
    preview.value = result
    previewOpen.value = true
  } catch (error) {
    if (previewRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '预览政策失败')
  } finally {
    if (previewRequestToken.value === requestToken) {
      previewLoading.value = false
    }
  }
}

async function downloadPreviewAttachment() {
  const current = preview.value
  if (!current?.id || !current.attachmentFileId) {
    showFormValidationMessage('该政策未上传附件')
    return
  }
  downloading.value = true
  try {
    const result = await portfolioPolicyApi.download({ id: current.id })
    if (!result.attachmentFileId || result.attachmentFileId !== current.attachmentFileId) {
      void message.error('政策附件已变更，请重新预览后下载')
      return
    }
    const fileName = `${result.documentCode}-${result.documentTitle}`
    await handleDownloadFile({ fileId: result.attachmentFileId, fileName })
  } catch (error) {
    showUserError(error, '下载政策附件失败')
  } finally {
    downloading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  void search(false)
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="政策检索"
        subtitle="默认仅现行有效；勾选含历史可检索被替代与已废止版本"
      />
    </template>
    <UiCard>
      <div class="policy-browse__search">
        <UiInput
          size="sm"
          v-model="keyword"
          placeholder="输入关键词检索正文"
          @press-enter="() => void search(true)"
        />
        <UiCheckbox v-model="includeHistory">含历史版本</UiCheckbox>
        <UiButton size="sm" :loading="loading" @click="() => void search(true)"> 检索 </UiButton>
      </div>
      <UiAlertStrip
        v-if="loadFailed"
        tone="error"
        title="政策检索失败"
        class="mb-3"
      />
      <UiSpin :spinning="loading">
        <UiEmpty
          size="sm"
          v-if="!loading && !rows.length"
          :description="
            loadFailed
              ? '政策检索失败'
              : appliedKeyword
                ? '未检索到匹配政策'
                : '输入关键词开始检索'
          "
        />
        <ul v-else-if="rows.length" class="policy-browse__list">
          <li v-for="item in rows" :key="item.id" class="policy-browse__item">
            <div class="policy-browse__head">
              <strong>{{ item.documentTitle }}</strong>
              <UiTag>{{ statusLabel(item.documentStatus) }}</UiTag>
            </div>
            <p class="policy-browse__meta">
              {{ levelLabel(item.policyLevel) }} · {{ item.topicCategory }} ·
              {{ item.documentCode }}
              <template v-if="item.versionNo != null"> · v{{ item.versionNo }}</template>
              <template v-if="item.publishOrg"> · {{ item.publishOrg }}</template>
              <template v-if="item.publishDate"> · {{ item.publishDate }}</template>
            </p>
            <p class="policy-browse__snippet">
              {{ item.snippet }}
            </p>
            <UiButton
              size="sm"
              :loading="previewLoading && previewTargetId === item.id"
              @click="openPreview(item.id)"
            >
              预览
            </UiButton>
          </li>
        </ul>
        <UiPagination
          v-if="query.total > 0"
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :total="query.total"
          class="policy-browse__pagination"
          @change="handlePageChange"
        />
      </UiSpin>
    </UiCard>
    <UiDialog v-model:open="previewOpen" :title="preview?.documentTitle || '政策预览'">
      <div v-if="preview" class="policy-browse__source">
        <p>
          文号：{{ preview.documentCode }} · 状态：{{ statusLabel(preview.documentStatus) }}
          <template v-if="preview.versionNo != null"> · 版本：v{{ preview.versionNo }}</template>
        </p>
        <p>
          层级：{{ levelLabel(preview.policyLevel) }} · 主题：{{ preview.topicCategory }}
        </p>
        <p>
          发布机关：{{ preview.publishOrg || '—' }} · 发布日期：{{ preview.publishDate || '—' }}
        </p>
        <p v-if="preview.contentDigest">正文指纹：{{ preview.contentDigest }}</p>
      </div>
      <pre class="policy-browse__preview">{{ preview?.fullTextContent }}</pre>
      <template #footer>
        <UiButton size="sm" @click="previewOpen = false"> 关闭 </UiButton>
        <UiButton
          size="sm"
          v-if="preview?.attachmentFileId"
          variant="primary"
          :loading="downloading"
          @click="downloadPreviewAttachment"
        >
          下载附件
        </UiButton>
      </template>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.policy-browse__search {
  display: flex;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
}
.policy-browse__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.policy-browse__item {
  padding: var(--dp-space-component) 0;
  border-bottom: 1px solid var(--dp-border-subtle);
}
.policy-browse__head {
  display: flex;
  gap: var(--dp-space-component-tight);
  align-items: center;
}
.policy-browse__meta {
  margin: var(--dp-space-component-xs) 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
}
.policy-browse__snippet {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
}
.policy-browse__source {
  margin-bottom: var(--dp-space-component);
  padding: var(--dp-space-component-tight);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.policy-browse__source p {
  margin: 0;
}
.policy-browse__source p + p {
  margin-top: var(--dp-space-component-xs);
}
.policy-browse__preview {
  white-space: pre-wrap;
  max-height: 420px;
  overflow: auto;
  font-size: var(--dp-font-size-sm);
}
.policy-browse__pagination {
  margin-top: var(--dp-space-block);
}
</style>
