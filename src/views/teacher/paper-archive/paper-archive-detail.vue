<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="paper-archive-detail-page__context">
        <div class="paper-archive-detail-page__context-left">
          <span class="paper-archive-detail-page__title">{{
            set?.archiveTitle ?? '档案集详情'
          }}</span>
          <UiTag v-if="set?.archiveStatus" :tone="setStatusTone(set.archiveStatus)" size="sm">
            {{ set.archiveStatusMessage || setStatusLabel(set.archiveStatus) }}
          </UiTag>
          <UiTag tone="blue" size="sm">{{ set?.paperCount ?? 0 }} 份试卷</UiTag>
        </div>
        <div class="paper-archive-detail-page__context-right">
          <UiButton variant="outline" size="sm" @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
            返回列表
          </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton v-if="canUpload" size="sm" @click="openUploadModal">
            <template #icon><UploadOutlined /></template>
            上传试卷
          </UiButton>
        </div>
      </div>
    </template>

    <UiCard v-if="set" class="paper-archive-detail-page__overview">
      <template #title>
        <ProfileOutlined />
        <span>档案集信息</span>
      </template>
      <a-descriptions :column="3" size="small">
        <a-descriptions-item label="档案编号">{{ set.archiveNo }}</a-descriptions-item>
        <a-descriptions-item label="学年">{{ set.examYear || '-' }}</a-descriptions-item>
        <a-descriptions-item label="学期">{{ set.examTerm || '-' }}</a-descriptions-item>
        <a-descriptions-item label="考期">{{ set.examRound || '-' }}</a-descriptions-item>
        <a-descriptions-item label="保管期限">
          <span v-if="set.permanentRetention">永久保管</span>
          <span v-else>{{ set.retentionYears ?? '-' }} 年（至 {{ set.retentionUntil || '-' }}）</span>
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ formatTime(set.createTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="档案 tag" :span="3">
          <UiTag v-for="tag in set.tags ?? []" :key="tag" tone="purple" size="sm" class="tag-chip">
            {{ tag }}
          </UiTag>
          <UiButton size="sm" variant="ghost" @click="openSetTagModal">
            {{ set.tags?.length ? '编辑 tag' : '添加 tag' }}
          </UiButton>
        </a-descriptions-item>
      </a-descriptions>
    </UiCard>

    <UiCard class="paper-archive-detail-page__items">
      <template #title>
        <FileSearchOutlined />
        <span>档案项检索</span>
        <UiBadge tone="blue">{{ pagination.total }} 条</UiBadge>
      </template>

      <a-form layout="inline" :model="searchForm" class="paper-archive-detail-page__filter">
        <a-form-item label="OCR 文本">
          <a-input
            v-model:value="searchForm.ocrTextKeyword"
            placeholder="按识别文本关键词过滤"
            allow-clear
            style="width: 220px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="学号">
          <a-input
            v-model:value="searchForm.studentNo"
            placeholder="精确学号"
            allow-clear
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input
            v-model:value="searchForm.studentNameKeyword"
            placeholder="姓名关键词"
            allow-clear
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="OCR 状态">
          <a-select
            v-model:value="searchForm.ocrStatus"
            placeholder="全部状态"
            allow-clear
            style="width: 140px"
            :options="ocrStatusOptions"
          />
        </a-form-item>
        <a-form-item label="tag">
          <a-select
            v-model:value="searchForm.tagAny"
            mode="tags"
            placeholder="任一匹配"
            style="width: 220px"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <UiButton size="sm" @click="handleSearch">查询</UiButton>
            <UiButton size="sm" variant="outline" @click="handleReset">重置</UiButton>
          </a-space>
        </a-form-item>
      </a-form>

      <UiEmpty v-if="!loading && items.length === 0" description="尚未上传任何试卷" />

      <UiDataTable
        v-else
        :columns="itemColumns"
        :data-source="items"
        :loading="loading"
        :show-pagination="false"
        flat
        :total="items.length"
        row-key="itemId"
        size="middle"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'sequenceNo'">
            <span class="seq">{{ items[index].sequenceNo ?? '-' }}</span>
            <div class="muted">{{ items[index].fileName || '-' }}</div>
          </template>
          <template v-else-if="column.key === 'student'">
            <span>{{ items[index].studentNo || '-' }}</span>
            <div v-if="items[index].studentName" class="muted">
              {{ items[index].studentName }}
            </div>
          </template>
          <template v-else-if="column.key === 'finalScore'">
            <span v-if="items[index].finalScore !== undefined">
              {{ items[index].finalScore }}
            </span>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'ocrStatus'">
            <UiTag :tone="ocrStatusTone(items[index].ocrStatus)" size="sm">
              {{ items[index].ocrStatusMessage || ocrStatusLabel(items[index].ocrStatus) }}
            </UiTag>
            <div
              v-if="items[index].ocrStatus === 'FAILED' && items[index].ocrFailureReason"
              class="muted ocr-failure"
            >
              {{ items[index].ocrFailureReason }}
            </div>
          </template>
          <template v-else-if="column.key === 'ocrText'">
            <div class="ocr-text-preview">
              {{ truncate(items[index].ocrText, 100) || '-' }}
            </div>
          </template>
          <template v-else-if="column.key === 'tags'">
            <UiTag
              v-for="tag in items[index].tags ?? []"
              :key="tag"
              tone="purple"
              size="sm"
              class="tag-chip"
            >
              {{ tag }}
            </UiTag>
            <span v-if="!items[index].tags?.length" class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatTime(items[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="!items[index].fileId"
                @click="handleDownloadItem(items[index])"
              >
                <template #icon><DownloadOutlined /></template>
                原图
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="openItemTagModal(items[index])">
                tag
              </UiButton>
              <UiButton
                v-if="canTriggerOcr(items[index])"
                size="sm"
                variant="outline"
                @click="confirmTriggerOcr(items[index])"
              >
                {{ items[index].ocrStatus === 'FAILED' ? '重试 OCR' : '识别' }}
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>

      <div class="paper-archive-detail-page__pagination">
        <a-pagination
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="true"
          :show-total="(total: number) => `共 ${total} 条`"
          @change="loadItems"
          @show-size-change="loadItems"
        />
      </div>
    </UiCard>
  </StageWorkbenchShell>

  <!-- 上传试卷弹窗 -->
  <a-modal
    v-model:open="uploadModalOpen"
    title="上传纸质试卷"
    :confirm-loading="uploading"
    :ok-button-props="{ disabled: !uploadForm.file }"
    ok-text="上传"
    cancel-text="取消"
    width="640px"
    @ok="submitUpload"
  >
    <a-form layout="vertical" :model="uploadForm" class="paper-archive-upload-form">
      <a-form-item label="扫描文件" required>
        <a-upload
          :file-list="uploadFileList"
          :before-upload="onBeforeUpload"
          :max-count="1"
          :show-upload-list="{ showRemoveIcon: true }"
          accept=".pdf,.png,.jpg,.jpeg,.tiff"
          @remove="onRemoveUpload"
        >
          <UiButton variant="outline" size="sm">
            <template #icon><UploadOutlined /></template>
            选择文件
          </UiButton>
        </a-upload>
        <div class="muted upload-hint">
          支持 PDF / PNG / JPG / TIFF；建议单文件 ≤ 100MB；多页 PDF 推荐使用扫描仪输出。
        </div>
      </a-form-item>
      <a-form-item label="序号（不填自动 +1）">
        <a-input-number
          v-model:value="uploadForm.sequenceNo"
          :min="1"
          placeholder="不填由后端自动分配"
          style="width: 200px"
        />
      </a-form-item>
      <a-form-item label="学号 / 姓名">
        <a-space>
          <a-input
            v-model:value="uploadForm.studentNo"
            placeholder="学号（可空）"
            style="width: 200px"
          />
          <a-input
            v-model:value="uploadForm.studentName"
            placeholder="姓名（可空）"
            style="width: 200px"
          />
        </a-space>
      </a-form-item>
      <a-form-item label="当年成绩 / 页数">
        <a-space>
          <a-input-number
            v-model:value="uploadForm.finalScore"
            :step="0.5"
            placeholder="成绩"
            style="width: 140px"
          />
          <a-input-number
            v-model:value="uploadForm.pageCount"
            :min="1"
            placeholder="页数"
            style="width: 120px"
          />
        </a-space>
      </a-form-item>
      <a-form-item label="试卷 tag">
        <a-select
          v-model:value="uploadForm.tags"
          mode="tags"
          placeholder="按回车添加 tag"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea
          v-model:value="uploadForm.remark"
          :rows="2"
          :maxlength="500"
          placeholder="可选"
        />
      </a-form-item>
      <a-form-item>
        <a-checkbox v-model:checked="uploadForm.triggerOcr">上传后立即触发 OCR 识别</a-checkbox>
      </a-form-item>
      <a-progress
        v-if="uploading && uploadProgress > 0"
        :percent="uploadProgress"
        status="active"
        size="small"
      />
    </a-form>
  </a-modal>

  <!-- tag 编辑弹窗（档案集 / 档案项共用） -->
  <a-modal
    v-model:open="tagModal.open"
    :title="tagModal.target === 'set' ? '编辑档案集 tag' : '编辑档案项 tag'"
    :confirm-loading="tagSaving"
    ok-text="保存"
    cancel-text="取消"
    @ok="submitTagUpdate"
  >
    <a-form layout="vertical">
      <a-form-item label="tag 列表（最多 32 个）">
        <a-select
          v-model:value="tagModal.tags"
          mode="tags"
          placeholder="按回车添加 tag"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue'
import type {
  PaperArchiveItemVO,
  PaperArchiveOcrStatusCode,
  PaperArchiveSetStatusCode,
  PaperArchiveSetVO,
} from '@/apis/mark/paper-archive'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  ProfileOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  downloadFile as downloadStorageFile,
  uploadFile as uploadStorageFile,
} from '@/apis/edu/file-management'
import {
  getPaperArchiveSetDetail,
  PAPER_ARCHIVE_OCR_STATUS_LABEL,
  PAPER_ARCHIVE_OCR_STATUS_TONE,
  PAPER_ARCHIVE_SET_STATUS_LABEL,
  PAPER_ARCHIVE_SET_STATUS_TONE,
  registerPaperArchiveItem,
  searchPaperArchiveItems,
  triggerPaperArchiveItemOcr,
  updatePaperArchiveItemTags,
  updatePaperArchiveSetTags,
} from '@/apis/mark/paper-archive'
import { UiBadge, UiButton, UiCard, UiDataTable, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useMarkStageStore } from '@/stores/modules/markStage'

defineOptions({ name: 'TeacherPaperArchiveDetail' })

const markStageStore = useMarkStageStore()
const examContextStore = useMarkExamContextStore()

const route = useRoute()
const router = useRouter()

const archiveSetId = computed(() => String(route.params.archiveSetId ?? ''))

const set = ref<PaperArchiveSetVO | null>(null)
const items = ref<PaperArchiveItemVO[]>([])
const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadModalOpen = ref(false)
const tagSaving = ref(false)

const pagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})

const searchForm = reactive<{
  ocrTextKeyword?: string
  studentNo?: string
  studentNameKeyword?: string
  ocrStatus?: PaperArchiveOcrStatusCode
  tagAny?: string[]
}>({
  ocrTextKeyword: undefined,
  studentNo: undefined,
  studentNameKeyword: undefined,
  ocrStatus: undefined,
  tagAny: [],
})

/**
 * 上传表单。
 *
 * 文件字段严格使用原生 File（ant-design-vue 的 RcFile 继承自 File），
 * 避免以前 “originFileObj 空时调回原出集” 的跨类型兜底。
 */
const uploadForm = reactive<{
  file: File | null
  sequenceNo?: number
  studentNo?: string
  studentName?: string
  finalScore?: number
  pageCount?: number
  tags: string[]
  remark?: string
  triggerOcr: boolean
}>({
  file: null,
  sequenceNo: undefined,
  studentNo: undefined,
  studentName: undefined,
  finalScore: undefined,
  pageCount: undefined,
  tags: [],
  remark: undefined,
  triggerOcr: true,
})

/**
 * a-upload 需要 UploadFile 的数组渲染列表，这里把 uploadForm.file
 * 投影为 UploadFile（仅用于列表展示，不作为上传数据源）。
 */
const uploadFileList = computed<UploadFile[]>(() => {
  if (!uploadForm.file) return []
  return [
    {
      uid: 'paper-archive-upload',
      name: uploadForm.file.name,
      status: 'done',
      size: uploadForm.file.size,
      type: uploadForm.file.type,
    },
  ]
})

const tagModal = reactive<{
  open: boolean
  target: 'set' | 'item'
  targetId: string
  tags: string[]
}>({
  open: false,
  target: 'set',
  targetId: '',
  tags: [],
})

const ocrStatusOptions = Object.entries(PAPER_ARCHIVE_OCR_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const itemColumns = [
  { title: '序号 / 文件', key: 'sequenceNo', dataIndex: 'sequenceNo', width: 200 },
  { title: '学号 / 姓名', key: 'student', width: 160 },
  { title: '当年成绩', key: 'finalScore', dataIndex: 'finalScore', width: 100 },
  { title: 'OCR 状态', key: 'ocrStatus', dataIndex: 'ocrStatus', width: 140 },
  { title: 'OCR 文本预览', key: 'ocrText', dataIndex: 'ocrText', width: 280 },
  { title: 'tag', key: 'tags', dataIndex: 'tags', width: 200 },
  { title: '上传时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 180, align: 'right' as const },
]

const canUpload = computed(() => {
  return set.value?.archiveStatus === 'DRAFT' || set.value?.archiveStatus === 'ACTIVE'
})

/**
 * 将单个档案集状态映射为当前考试的 ARCHIVE 阶段状态。
 *
 * 档案集本身不持有 examId，只能基于 examContextStore.currentExamId 反映“用户视角”。
 * 无上下文时不写入。
 */
function syncArchiveSetStageToStore(set: PaperArchiveSetVO): void {
  const examId = examContextStore.currentExamId
  if (!examId) return
  let status: 'pending' | 'active' | 'completed' | 'blocked' = 'pending'
  let hint = ''
  switch (set.archiveStatus) {
    case 'DRAFT':
      status = 'blocked'
      hint = `档案集草稿 · ${set.archiveTitle}`
      break
    case 'ACTIVE':
      status = 'active'
      hint = `保管中 · ${set.paperCount ?? 0} 份试卷`
      break
    case 'APPRAISAL_PENDING':
      status = 'active'
      hint = `鉴定待办 · ${set.archiveTitle}`
      break
    case 'APPRAISAL_DECIDED':
    case 'DESTRUCTION_PENDING':
    case 'DESTRUCTION_APPROVED':
    case 'DESTRUCTION_REJECTED':
    case 'DESTROYED':
      status = 'completed'
      hint = set.archiveStatusMessage || '档案集生命周期完整'
      break
  }
  if (hint) {
    markStageStore.setStageStatus(examId, 'ARCHIVE', status, hint)
  }
}

async function loadSet(): Promise<void> {
  if (!archiveSetId.value) return
  try {
    set.value = await getPaperArchiveSetDetail(archiveSetId.value)
    if (set.value) syncArchiveSetStageToStore(set.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '档案集详情加载失败')
  }
}

async function loadItems(): Promise<void> {
  if (!archiveSetId.value) return
  loading.value = true
  try {
    const result = await searchPaperArchiveItems({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      archiveSetId: archiveSetId.value,
      ocrTextKeyword: searchForm.ocrTextKeyword?.trim() || undefined,
      studentNo: searchForm.studentNo?.trim() || undefined,
      studentNameKeyword: searchForm.studentNameKeyword?.trim() || undefined,
      ocrStatus: searchForm.ocrStatus,
      tagAny: searchForm.tagAny && searchForm.tagAny.length > 0 ? searchForm.tagAny : undefined,
    })
    items.value = result.list ?? []
    pagination.total = Number(result.total ?? 0)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '档案项加载失败')
  } finally {
    loading.value = false
  }
}

async function reload(): Promise<void> {
  await Promise.all([loadSet(), loadItems()])
}

function handleSearch(): void {
  pagination.pageNum = 1
  void loadItems()
}

function handleReset(): void {
  searchForm.ocrTextKeyword = undefined
  searchForm.studentNo = undefined
  searchForm.studentNameKeyword = undefined
  searchForm.ocrStatus = undefined
  searchForm.tagAny = []
  pagination.pageNum = 1
  void loadItems()
}

function openUploadModal(): void {
  uploadForm.file = null
  uploadForm.sequenceNo = undefined
  uploadForm.studentNo = undefined
  uploadForm.studentName = undefined
  uploadForm.finalScore = undefined
  uploadForm.pageCount = undefined
  uploadForm.tags = []
  uploadForm.remark = undefined
  uploadForm.triggerOcr = true
  uploadProgress.value = 0
  uploadModalOpen.value = true
}

/**
 * a-upload 的 before-upload 回调接收原生 File（RcFile 继承自 File），
 * 返回 false 以阻止 ant-design-vue 默认上传行为，改由 submitUpload 接管两步上传。
 */
function onBeforeUpload(file: File): boolean {
  uploadForm.file = file
  return false
}

function onRemoveUpload(): boolean {
  uploadForm.file = null
  return true
}

/**
 * 两步上传：
 *   1. 调 edu-storage uploadFile() 直传扫描影像，拿到 fileNode.id；
 *   2. 调 mark 服务 registerPaperArchiveItem() 以 fileId 注册档案项，
 *      服务内部负责 confirmFiles 把节点状态由 TEMP 切为 CONFIRMED。
 *
 * 不再在业务服务里维护 multipart，也消除了原先 originFileObj ?? raw 的兜底。
 */
async function submitUpload(): Promise<void> {
  if (!uploadForm.file) {
    message.warning('请先选择扫描文件')
    return
  }
  uploading.value = true
  uploadProgress.value = 0
  try {
    // Step 1：直传 edu-storage
    const node = await uploadStorageFile(uploadForm.file, {
      businessType: 'paper-archive-scan',
    })
    if (!node?.id) {
      message.error('edu-storage 返回的文件节点为空，无法注册档案项')
      return
    }
    uploadProgress.value = 50

    // Step 2：注册档案项
    await registerPaperArchiveItem({
      archiveSetId: archiveSetId.value,
      fileId: String(node.id),
      sequenceNo: uploadForm.sequenceNo ?? undefined,
      studentNo: uploadForm.studentNo?.trim() || undefined,
      studentName: uploadForm.studentName?.trim() || undefined,
      finalScore: uploadForm.finalScore ?? undefined,
      pageCount: uploadForm.pageCount ?? undefined,
      tags: uploadForm.tags.length > 0 ? uploadForm.tags : undefined,
      remark: uploadForm.remark?.trim() || undefined,
      triggerOcr: uploadForm.triggerOcr,
    })
    uploadProgress.value = 100

    message.success('上传成功')
    uploadModalOpen.value = false
    pagination.pageNum = 1
    await reload()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '上传失败')
  } finally {
    uploading.value = false
  }
}

/**
 * 从 edu-storage 下载原始扫描影像。
 *
 * 走 file-management 的 downloadFile()（POST /api/storage/filesystem/download），
 * 依靠 axios http.download 拦截器带 token + 改为 GET 下载。
 */
async function handleDownloadItem(item: PaperArchiveItemVO): Promise<void> {
  if (!item.fileId) {
    message.warning('该档案项未关联文件')
    return
  }
  try {
    await downloadStorageFile({ nodeId: item.fileId })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下载失败')
  }
}

function openSetTagModal(): void {
  if (!set.value) return
  tagModal.open = true
  tagModal.target = 'set'
  tagModal.targetId = set.value.archiveSetId
  tagModal.tags = [...(set.value.tags ?? [])]
}

function openItemTagModal(item: PaperArchiveItemVO): void {
  tagModal.open = true
  tagModal.target = 'item'
  tagModal.targetId = item.itemId
  tagModal.tags = [...(item.tags ?? [])]
}

async function submitTagUpdate(): Promise<void> {
  tagSaving.value = true
  try {
    if (tagModal.target === 'set') {
      await updatePaperArchiveSetTags({
        targetId: tagModal.targetId,
        tags: tagModal.tags,
      })
    } else {
      await updatePaperArchiveItemTags({
        targetId: tagModal.targetId,
        tags: tagModal.tags,
      })
    }
    message.success('tag 已更新')
    tagModal.open = false
    await reload()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新 tag 失败')
  } finally {
    tagSaving.value = false
  }
}

function canTriggerOcr(item: PaperArchiveItemVO): boolean {
  return item.ocrStatus === 'NONE' || item.ocrStatus === 'FAILED' || item.ocrStatus === 'COMPLETED'
}

function confirmTriggerOcr(item: PaperArchiveItemVO): void {
  void confirmAsync({
    title: 'OCR 识别？',
    content: `档案项 #${item.sequenceNo ?? item.itemId} 将进入 OCR 队列等待识别。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      try {
        await triggerPaperArchiveItemOcr(item.itemId)
        message.success('已入队，等待识别')
        await loadItems()
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'OCR 入队失败')
      }
    },
  })
}

function goBack(): void {
  void router.push({ name: 'TeacherPaperArchiveList' })
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

function setStatusTone(status?: PaperArchiveSetStatusCode): BadgeTone {
  if (!status) return 'gray'
  return PAPER_ARCHIVE_SET_STATUS_TONE[status] ?? 'gray'
}

function setStatusLabel(status?: PaperArchiveSetStatusCode): string {
  if (!status) return '-'
  return PAPER_ARCHIVE_SET_STATUS_LABEL[status] ?? status
}

function ocrStatusTone(status?: PaperArchiveOcrStatusCode): BadgeTone {
  if (!status) return 'gray'
  return PAPER_ARCHIVE_OCR_STATUS_TONE[status] ?? 'gray'
}

function ocrStatusLabel(status?: PaperArchiveOcrStatusCode): string {
  if (!status) return '-'
  return PAPER_ARCHIVE_OCR_STATUS_LABEL[status] ?? status
}

function truncate(value: string | undefined, max: number): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

onMounted(() => {
  void reload()
})
</script>

<style lang="scss" scoped>
.paper-archive-detail-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paper-archive-detail-page__overview,
.paper-archive-detail-page__items {
  width: 100%;
}

.paper-archive-detail-page__filter {
  margin-bottom: 12px;
}

.paper-archive-detail-page__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.paper-archive-upload-form {
  padding: 8px 0;
}

.upload-hint {
  margin-top: 6px;
  font-size: 12px;
}

.muted {
  color: var(--ant-color-text-quaternary);
}

.tag-chip {
  margin-right: 4px;
  margin-bottom: 2px;
}

.seq {
  font-weight: 600;
}

.ocr-failure {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ant-color-error);
}

.ocr-text-preview {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
