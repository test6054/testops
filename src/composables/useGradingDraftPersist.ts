/**
 * 阅卷给分 IndexedDB 草稿持久化：debounce 500ms + generation 单调写，submit 时 clearTimeout。
 * 生命周期：logout 清库；beforeunload 不清库。
 */
import { confirmAsync } from '@/composables/useConfirmDialog'

const DB_NAME = 'nybc-mark-grading'
const STORE_NAME = 'drafts'
const DB_VERSION = 1
const DEBOUNCE_MS = 500

export interface GradingDraftWholeQuestionForm {
  score?: number
  annotationText: string
  reviewSuggestion: string
}

export interface GradingDraftPayload {
  score?: number
  annotationNote?: string
  reviewSuggestion?: string
  wholeQuestionForms?: Record<string, GradingDraftWholeQuestionForm>
  wholePageAnnotationForms?: Record<string, string>
  updatedAt: number
  serverSyncedAt?: number
}

let draftSaveTimer: ReturnType<typeof setTimeout> | null = null
let draftGeneration = 0
let pendingSave: { key: string, payload: GradingDraftPayload } | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 打开失败'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function idbGet(key: string): Promise<GradingDraftPayload | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 读取失败'))
    request.onsuccess = () => resolve(request.result as GradingDraftPayload | undefined)
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}

async function idbPut(key: string, payload: GradingDraftPayload): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(payload, key)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 写入失败'))
    request.onsuccess = () => resolve()
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(key)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 删除失败'))
    request.onsuccess = () => resolve()
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}

/** 草稿键：tenantId:examId:taskId */
export function buildGradingDraftKey(tenantId: string, examId: string, taskId: string): string {
  return `${tenantId}:${examId}:${taskId}`
}

async function saveDraftIfFresh(key: string, payload: GradingDraftPayload, gen: number): Promise<void> {
  if (gen !== draftGeneration) return
  const existing = await idbGet(key)
  if (existing?.serverSyncedAt && payload.updatedAt <= existing.serverSyncedAt) return
  if (gen !== draftGeneration) return
  await idbPut(key, payload)
}

/** debounce 写入草稿 */
export function scheduleGradingDraftSave(key: string, payload: GradingDraftPayload): void {
  pendingSave = { key, payload: { ...payload, updatedAt: Date.now() } }
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
  }
  draftSaveTimer = setTimeout(() => {
    draftSaveTimer = null
    const pending = pendingSave
    pendingSave = null
    if (!pending) return
    const gen = draftGeneration
    void saveDraftIfFresh(pending.key, pending.payload, gen)
  }, DEBOUNCE_MS)
}

/** submit 第一行：bump generation + clearTimeout */
export function onGradingDraftSubmitStart(): void {
  draftGeneration++
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
    draftSaveTimer = null
  }
  pendingSave = null
}

/** submit 成功：tombstone + delete */
export async function onGradingDraftSubmitSuccess(key: string): Promise<void> {
  const tombstone: GradingDraftPayload = {
    updatedAt: Date.now(),
    serverSyncedAt: Date.now(),
  }
  await idbPut(key, tombstone)
  await idbDelete(key)
}

export async function loadGradingDraft(key: string): Promise<GradingDraftPayload | undefined> {
  const draft = await idbGet(key)
  if (!draft || draft.serverSyncedAt) return undefined
  if (
    draft.score === undefined
    && !draft.annotationNote
    && !draft.wholeQuestionForms
    && !draft.wholePageAnnotationForms
  ) {
    return undefined
  }
  return draft
}

/** global logout 时清库 */
export async function clearAllGradingDrafts(): Promise<void> {
  onGradingDraftSubmitStart()
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 清库失败'))
    request.onsuccess = () => resolve()
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}

/** loadTask 后若本地草稿比服务端新，提示恢复 */
export async function offerGradingDraftRestore(
  draft: GradingDraftPayload,
): Promise<boolean> {
  return confirmAsync({
    title: '恢复本地草稿？',
    content: '检测到未提交的本地给分草稿，是否恢复？',
    type: 'info',
    okText: '恢复草稿',
    cancelText: '使用服务端数据',
  })
}
