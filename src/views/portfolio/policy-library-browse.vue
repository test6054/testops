<script setup lang="ts">
import type { PortfolioPolicyDocumentSearchVO } from '@/apis/portfolio/policy'
import { portfolioPolicyApi } from '@/apis/portfolio/policy'
import type { PortfolioPolicyDocumentStatusCode } from '@/types/enums/portfolio-policy-document-status-enum'
import { PortfolioPolicyDocumentStatusDescription } from '@/types/enums/portfolio-policy-document-status-enum'
import type { PortfolioPolicyLevelCode } from '@/types/enums/portfolio-policy-level-enum'
import { PortfolioPolicyLevelDescription } from '@/types/enums/portfolio-policy-level-enum'
import { reactive, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const keyword = ref('')
const rows = ref<PortfolioPolicyDocumentSearchVO[]>([])
const previewOpen = ref(false)
const previewText = ref('')
const previewTitle = ref('')

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

async function search() {
  const kw = keyword.value.trim()
  if (!kw) {
    return
  }
  loading.value = true
  try {
    const result = await portfolioPolicyApi.search({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: kw,
    })
    rows.value = result.list ?? []
    query.total = result.total ?? 0
  } catch (error) {
    rows.value = []
    showUserError(error, '检索政策失败')
  } finally {
    loading.value = false
  }
}

async function preview(id: string, title: string) {
  try {
    const result = await portfolioPolicyApi.preview({ id })
    previewTitle.value = title
    previewText.value = result.fullTextContent
    previewOpen.value = true
    await portfolioPolicyApi.download({ id })
  } catch (error) {
    showUserError(error, '预览政策失败')
  }
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
        <a-input v-model:value="keyword" placeholder="输入关键词检索正文" @press-enter="search" />
        <UiButton :loading="loading" @click="search"> 检索 </UiButton>
      </div>
      <a-spin :spinning="loading">
        <UiEmpty v-if="!loading && !rows.length" description="输入关键词开始检索" />
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
            <UiButton size="sm" @click="preview(item.id, item.documentTitle)"> 预览 </UiButton>
          </li>
        </ul>
      </a-spin>
    </UiCard>
    <a-modal v-model:open="previewOpen" :title="previewTitle" :footer="null">
      <pre class="policy-browse__preview">{{ previewText }}</pre>
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
</style>
