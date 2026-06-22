<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <span class="paper-archive-detail-page__title">{{
            set?.archiveTitle ?? '纸质试卷档案集详情'
          }}</span>
          <UiTag v-if="set?.archiveStatus" :tone="setStatusTone(set.archiveStatus)" size="sm">
            {{ set.archiveStatusMessage }}
          </UiTag>
          <UiTag tone="blue" size="sm">{{ set?.paperCount ?? 0 }} 份试卷</UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goBack">
            <template #icon><ArrowLeftOutlined /></template>
            返回纸质试卷档案集列表
          </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton v-if="canUpload" size="sm" @click="openUploadModal">
            <template #icon><UploadOutlined /></template>
            上传试卷
          </UiButton>
        </template>
      </ContextBar>
    </template>



    <UiCard v-if="set" class="paper-archive-detail-page__overview">
      <template #title>
        <ProfileOutlined />
        <span>纸质试卷档案集信息</span>
      </template>
      <a-descriptions :column="3" size="small">
        <a-descriptions-item label="纸质试卷档案编号">{{ set.archiveNo }}</a-descriptions-item>
        <a-descriptions-item label="学年">{{ set.examYear || '未登记学年' }}</a-descriptions-item>
        <a-descriptions-item label="学期">{{ set.examTerm || '未登记学期' }}</a-descriptions-item>
        <a-descriptions-item label="考期">{{ set.examRound || '未登记考期' }}</a-descriptions-item>
        <a-descriptions-item label="保管期限">
          <span v-if="set.permanentRetention">永久保管</span>
          <span v-else>{{ retentionPeriodText(set) }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ formatDateTime(set.createTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="纸质试卷档案集标签" :span="3">
          <UiTag v-for="tag in set.tags ?? []" :key="tag" tone="purple" size="sm" class="tag-chip">
            {{ tag }}
          </UiTag>
          <UiTextAction @click="openSetTagModal">
            {{
              set.tags?.length ? '编辑标签' : '添加标签'
            }}
          </UiTextAction>
        </a-descriptions-item>
      </a-descriptions>
    </UiCard>

    <UiCard class="paper-archive-detail-page__items">
      <template #title>
        <FileSearchOutlined />
        <span>纸质试卷档案项检索</span>
      </template>

      <UiFilterBar
        :model-value="searchForm"
        :fields="archiveItemFilterFields"
        show-labels
        search-text="查询"
        @update:model-value="syncSearchForm"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #field-tagAny>
          <a-select
            v-model:value="searchForm.tagAny"
            mode="tags"
            placeholder="任一匹配"
            style="width: 100%"
          />
        </template>
      </UiFilterBar>



      <UiEmpty v-if="!loading && items.length === 0" description="暂无数据" />

      <UiDataTable
        pagination-mode="none"
        class="student-detail-table__data-table"
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
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sequenceNo'">
            <span class="seq">{{ record.sequenceNo ?? '未编序' }}</span>
            <div class="muted">{{ record.fileName || '未登记文件名' }}</div>
          </template>
          <template v-else-if="column.key === 'student'">
            <span>{{ archiveStudentNoText(record) }}</span>
            <div v-if="record.studentName" class="muted">
              {{ record.studentName }}
            </div>
          </template>
          <template v-else-if="column.key === 'finalScore'">
            <span v-if="record.finalScore !== undefined">
              {{ record.finalScore }}
            </span>
            <span v-else class="muted">未登记成绩</span>
          </template>
          <template v-else-if="column.key === 'ocrStatus'">
            <UiTag :tone="ocrStatusTone(record.ocrStatus)" size="sm">
              {{ ocrStatusMessage(record) }}
            </UiTag>
            <div
              v-if="record.ocrStatus === 'FAILED' && record.ocrFailureReason"
              class="muted ocr-failure"
            >
              {{ record.ocrFailureReason }}
            </div>
          </template>
          <template v-else-if="column.key === 'ocrText'">
            <div class="ocr-text-preview">
              {{ ocrTextPreview(record) }}
            </div>
          </template>
          <template v-else-if="column.key === 'tags'">
            <UiTag
              v-for="tag in record.tags ?? []"
              :key="tag"
              tone="purple"
              size="sm"
              class="tag-chip"
            >
              {{ tag }}
            </UiTag>
            <span v-if="!record.tags?.length" class="muted">未设置标签</span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction :disabled="!record.fileId" @click="handleDownloadItem(record)">
                <template #icon><DownloadOutlined /></template>
                原图
              </UiTextAction>
              <UiTextAction @click="openItemTagModal(record)">标签</UiTextAction>
              <UiTextAction
                v-if="canTriggerOcr(record)"
                tone="primary"
                @click="confirmTriggerOcr(record)"
              >
                {{ record.ocrStatus === 'FAILED' ? '重试 OCR' : '识别' }}
              </UiTextAction>
            </div>
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
          @change="handleItemPageChange"
          @show-size-change="handleItemPageChange"
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
          支持 PDF / PNG / JPG / TIFF；单文件控制在 100MB 以内；多页 PDF 推荐使用扫描仪输出。
        </div>
      </a-form-item>
      <a-form-item label="序号（不填自动 +1）">
        <a-input-number
          v-model:value="uploadForm.sequenceNo"
          :min="1"
          placeholder="不填则由系统自动分配"
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
      <a-form-item label="试卷标签">
        <a-select
          v-model:value="uploadForm.tags"
          mode="tags"
          placeholder="按回车添加标签"
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

  <!-- tag 编辑弹窗（纸质试卷档案集 / 试卷档案项共用） -->
  <a-modal
    v-model:open="tagModal.open"
    :title="tagModal.target === 'set' ? '编辑纸质试卷档案集标签' : '编辑试卷档案项标签'"
    :confirm-loading="tagSaving"
    ok-text="保存"
    cancel-text="取消"
    @ok="submitTagUpdate"
  >
    <a-form layout="vertical">
      <a-form-item label="标签列表（最多 32 个）">
        <a-select
          v-model:value="tagModal.tags"
          mode="tags"
          placeholder="按回车添加标签"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PaperArchiveItemVO,
  PaperArchiveOcrStatusCode,
  PaperArchiveSetStatusCode,
  PaperArchiveSetVO,
} from '@/apis/mark/paper-archive'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  ProfileOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile, uploadFile } from '@/apis/edu/file-management'
import {
  getPaperArchiveSetDetail,
  PAPER_ARCHIVE_OCR_STATUS_OPTIONS,
  PAPER_ARCHIVE_OCR_STATUS_TONE,
  PAPER_ARCHIVE_SET_STATUS_TONE,
  registerPaperArchiveItem,
  searchPaperArchiveItems,
  triggerPaperArchiveItemOcr,
  updatePaperArchiveItemTags,
  updatePaperArchiveSetTags,
} from '@/apis/mark/paper-archive'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherPaperArchiveDetail' })

const route = useRoute()
const router = useRouter()

const archiveSetId = computed(() => String(route.params.archiveSetId ?? ''))

const set = ref<PaperArchiveSetVO | null>(null)
const items = ref<PaperArchiveItemVO[]>([])
const loading = ref(false)
const uploading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳
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

function syncSearchForm(next: Record<string, unknown>): void {
  Object.assign(searchForm, next)
}

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

const archiveItemFilterFields: FilterField[] = [
  {
    key: 'ocrTextKeyword',
    type: 'input',
    label: 'OCR 文本',
    placeholder: '按识别文本关键词过滤',
    allowClear: true,
    width: 220,
    triggerSearchOnChange: false,
  },
  {
    key: 'studentNo',
    type: 'input',
    label: '学号',
    placeholder: '精确学号',
    allowClear: true,
    width: 160,
    triggerSearchOnChange: false,
  },
  {
    key: 'studentNameKeyword',
    type: 'input',
    label: '姓名',
    placeholder: '姓名关键词',
    allowClear: true,
    width: 160,
    triggerSearchOnChange: false,
  },
  {
    key: 'ocrStatus',
    type: 'select',
    label: 'OCR 状态',
    placeholder: '全部状态',
    allowClear: true,
    width: 140,
    options: PAPER_ARCHIVE_OCR_STATUS_OPTIONS,
  },
  { key: 'tagAny', label: '标签', width: 220 },
]

const itemColumns: ColumnsType<PaperArchiveItemVO> = [
  { title: '序号 / 文件', key: 'sequenceNo', dataIndex: 'sequenceNo', width: 200 },
  { title: '学号 / 姓名', key: 'student', width: 160 },
  { title: '当年成绩', key: 'finalScore', dataIndex: 'finalScore', width: 100 },
  { title: 'OCR 状态', key: 'ocrStatus', dataIndex: 'ocrStatus', width: 140 },
  { title: 'OCR 文本预览', key: 'ocrText', dataIndex: 'ocrText', width: 280 },
  { title: 'tag', key: 'tags', dataIndex: 'tags', width: 200 },
  { title: '上传时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 180, align: 'right' },
]

const canUpload = computed(() => {
  return set.value?.archiveStatus === 'DRAFT' || set.value?.archiveStatus === 'ACTIVE'
})

async function loadSet(): Promise<void> {
  if (!archiveSetId.value) return
  try {
    set.value = await getPaperArchiveSetDetail(archiveSetId.value)
  } catch (error) {
    set.value = null
    showUserError(error, '纸质试卷档案集详情加载失败')
  }
}

async function loadItems(options?: { quiet?: boolean }): Promise<void> {
  if (!archiveSetId.value) return
  if (!options?.quiet) {
    loading.value = true
  }
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
    items.value = readPageList(result, '纸质试卷档案集明细加载失败，请稍后重试')
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
    pagination.total = readPageTotal(result, '纸质试卷档案集明细加载失败，请稍后重试')
    syncOcrPolling()
  } catch (error) {
    items.value = []
    pagination.total = 0
    showUserError(error, '纸质试卷档案集明细加载失败')
    if (!options?.quiet) {
      showUserError(error, '纸质试卷档案集明细加载失败')
    }
  } finally {
    if (!options?.quiet) {
      loading.value = false
    }
  }
}

function handleItemPageChange(page: number, pageSize: number): void {
  pagination.pageNum = page
  pagination.pageSize = pageSize
  void loadItems()
}

async function reload(): Promise<void> {
  await Promise.all([loadSet(), loadItems()])
}

let ocrPollTimer: ReturnType<typeof setInterval> | null = null

function syncOcrPolling(): void {
  const shouldPoll = items.value.some(
    (item) => item.ocrStatus === 'PENDING' || item.ocrStatus === 'RUNNING',
  )
  if (shouldPoll && !ocrPollTimer) {
    ocrPollTimer = setInterval(() => {
      void reloadQuietly()
    }, 3000)
  } else if (!shouldPoll && ocrPollTimer) {
    clearInterval(ocrPollTimer)
    ocrPollTimer = null
  }
}

async function reloadQuietly(): Promise<void> {
  if (loading.value || !archiveSetId.value) {
    return
  }
  try {
    await loadSet()
    await loadItems({ quiet: true })
  } catch {
    // 轮询刷新失败时不打断当前页面操作
  }
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
 * 不再在业务服务里维护 multipart，也由 beforeUpload 明确接管文件选择结果。
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
    const node = await uploadFile(uploadForm.file, {
      businessType: 'paper-archive-scan',
    })
    if (!node?.id) {
      message.error('扫描文件上传后未完成登记，请重新上传')
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
    showUserError(error, '扫描试卷上传失败')
  } finally {
    uploading.value = false
  }
}

/**
 * 从 edu-storage 下载扫描影像。
 *
 * 走 file-management 的 downloadFile()（POST /api/storage/filesystem/download），
 * 依靠 axios http.download 拦截器带 token + 改为 GET 下载。
 */
async function handleDownloadItem(item: PaperArchiveItemVO): Promise<void> {
  if (!item.fileId) {
    message.warning('该试卷档案项未关联扫描文件')
    return
  }
  try {
    await downloadFile({ nodeId: item.fileId })
  } catch (error) {
    showUserError(error, '扫描试卷下载失败')
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
    message.success(tagModal.target === 'set' ? '纸质试卷档案集标签已更新' : '试卷档案项标签已更新')
    tagModal.open = false
    await reload()
  } catch (error) {
    showUserError(
      error,
      tagModal.target === 'set' ? '纸质试卷档案集标签更新失败' : '试卷档案项标签更新失败',
    )
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
    content: `试卷档案项 #${item.sequenceNo ?? item.itemId} 将进入 OCR 队列等待识别。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      try {
        await triggerPaperArchiveItemOcr(item.itemId)
        message.success('已入队，等待识别')
        await reload()
      } catch (error) {
        showUserError(error, '试卷识别任务提交失败')
      }
    },
  })
}

function goBack(): void {
  void router.push({ name: 'TeacherPaperArchiveList' })
}

function setStatusTone(status: PaperArchiveSetStatusCode): BadgeTone {
  return strictEnumTone(PAPER_ARCHIVE_SET_STATUS_TONE, status, '纸质试卷档案集状态')
}

function ocrStatusTone(status: PaperArchiveOcrStatusCode): BadgeTone {
  return strictEnumTone(PAPER_ARCHIVE_OCR_STATUS_TONE, status, '试卷档案 OCR 状态')
}

function ocrStatusMessage(item: PaperArchiveItemVO): string {
  return item.ocrStatusMessage
}

function retentionPeriodText(set: PaperArchiveSetVO): string {
  if (set.retentionYears == null) return '未登记保管年限'
  if (!set.retentionUntil) return `${set.retentionYears} 年（未计算到期日期）`
  return `${set.retentionYears} 年（至 ${set.retentionUntil}）`
}

function archiveStudentNoText(item: PaperArchiveItemVO): string {
  if (item.studentNo) return item.studentNo
  if (item.studentName) return '未登记学号'
  return '未绑定学生'
}

function ocrTextPreview(item: PaperArchiveItemVO): string {
  const text = truncate(item.ocrText, 100)
  if (text) return text
  if (item.ocrStatus === 'COMPLETED') return 'OCR 未识别到可展示文本'
  if (item.ocrStatus === 'FAILED') return 'OCR 识别失败'
  if (item.ocrStatus === 'RUNNING') return 'OCR 识别中'
  return '尚未识别 OCR 文本'
}

function truncate(value: string | undefined, max: number): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

onMounted(() => {
  void reload()
})

onActivated(() => {
  void reload()
})

onBeforeUnmount(() => {
  if (ocrPollTimer) {
    clearInterval(ocrPollTimer)
    ocrPollTimer = null
  }
})
</script>

<style lang="scss" scoped>
.paper-archive-detail-page {
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
