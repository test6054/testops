<script setup lang="ts">
import type { PortfolioPolicyDocumentSearchVO } from '@/apis/portfolio/policy'
import type { PortfolioPolicyDocumentStatusCode } from '@/types/enums/portfolio-policy-document-status-enum'
import type { PortfolioPolicyLevelCode } from '@/types/enums/portfolio-policy-level-enum'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { portfolioPolicyApi } from '@/apis/portfolio/policy'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
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
const keyword = ref('')
const appliedKeyword = ref('')
const rows = ref<PortfolioPolicyDocumentSearchVO[]>([])
const previewOpen = ref(false)
const previewLoading = ref(false)
const downloading = ref(false)
const previewTargetId = ref('')
const previewDocumentId = ref('')
const previewAttachmentFileId = ref('')
const previewText = ref('')
const previewTitle = ref('')
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
    rows.value = []
    query.total = 0
    return
  }
  if (resetPage) {
    query.pageNum = 1
    appliedKeyword.value = kw
  }
  const requestToken = searchRequestToken.value + 1
  searchRequestToken.value = requestToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    keyword: kw,
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
  } catch (error) {
    if (searchRequestToken.value !== requestToken) {
      return
    }
    rows.value = []
    query.total = 0
    loadFailed.value = true
    showUserError(error, '检索政策失败')
  } finally {
    if (searchRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function preview(id: string, title: string) {
  const requestToken = previewRequestToken.value + 1
  previewRequestToken.value = requestToken
  previewLoading.value = true
  previewTargetId.value = id
  previewOpen.value = false
  previewDocumentId.value = ''
  previewAttachmentFileId.value = ''
  previewText.value = ''
  try {
    const result = await portfolioPolicyApi.preview({ id })
    if (previewRequestToken.value !== requestToken) {
      return
    }
    previewDocumentId.value = result.id
    previewAttachmentFileId.value = result.attachmentFileId ?? ''
    previewTitle.value = title
    previewText.value = result.fullTextContent
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
  const documentId = previewDocumentId.value
  const expectedFileId = previewAttachmentFileId.value
  const title = previewTitle.value
  if (!documentId || !expectedFileId) {
    showFormValidationMessage('该政策未上传附件')
    return
  }
  downloading.value = true
  try {
    const result = await portfolioPolicyApi.download({ id: documentId })
    if (!result.attachmentFileId || result.attachmentFileId !== expectedFileId) {
      message.error('政策附件已变更，请重新预览后下载')
      return
    }
    await handleDownloadFile({ fileId: result.attachmentFileId, fileName: title })
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
        subtitle="全文检索现行与历史政策"
      />
    </template>
    <UiCard>
      <div class="policy-browse__search">
        <a-input
          v-model:value="keyword"
          placeholder="输入关键词检索正文"
          @press-enter="() => void search(true)"
        />
        <UiButton :loading="loading" @click="() => void search(true)"> 检索 </UiButton>
      </div>
      <a-spin :spinning="loading">
        <UiEmpty
          v-if="!loading && !rows.length"
          :description="
            loadFailed
              ? '政策检索失败，请重试'
              : appliedKeyword
                ? '未检索到匹配政策'
                : '输入关键词开始检索'
          "
        />
        <ul v-else class="policy-browse__list">
          <li v-for="item in rows" :key="item.id" class="policy-browse__item">
            <div class="policy-browse__head">
              <strong>{{ item.documentTitle }}</strong>
              <UiTag>{{ statusLabel(item.documentStatus) }}</UiTag>
            </div>
            <p class="policy-browse__meta">
              {{ levelLabel(item.policyLevel) }} · {{ item.topicCategory }} ·
              {{ item.documentCode }}
            </p>
            <p class="policy-browse__snippet">
              {{ item.snippet }}
            </p>
            <UiButton
              size="sm"
              :loading="previewLoading && previewTargetId === item.id"
              @click="preview(item.id, item.documentTitle)"
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
      </a-spin>
    </UiCard>
    <a-modal v-model:open="previewOpen" :title="previewTitle">
      <pre class="policy-browse__preview">{{ previewText }}</pre>
      <template #footer>
        <UiButton @click="previewOpen = false"> 关闭 </UiButton>
        <UiButton
          v-if="previewAttachmentFileId"
          variant="primary"
          :loading="downloading"
          @click="downloadPreviewAttachment"
        >
          下载附件
        </UiButton>
      </template>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped>
.policy-browse__search {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.policy-browse__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.policy-browse__item {
  padding: 12px 0;
  border-bottom: 1px solid var(--nybc-border-subtle, #f0f0f0);
}
.policy-browse__head {
  display: flex;
  gap: 8px;
  align-items: center;
}
.policy-browse__meta {
  margin: 4px 0;
  color: var(--nybc-text-secondary, #666);
  font-size: 12px;
}
.policy-browse__snippet {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.5;
}
.policy-browse__preview {
  white-space: pre-wrap;
  max-height: 420px;
  overflow: auto;
  font-size: 13px;
}
.policy-browse__pagination {
  margin-top: var(--dp-space-4);
}
</style>
