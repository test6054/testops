import { computed, onScopeDispose, ref } from 'vue'
import {
  buildQualityLongFormDraftKey,
  clearQualityLongFormDraft,
  getQualityLongFormDraftEpoch,
  loadQualityLongFormDraft,
  saveQualityLongFormDraft,
} from '@/composables/useQualityLongFormDraftPersist'

const LOCAL_SAVE_DEBOUNCE_MS = 500
const SERVER_SAVE_DEBOUNCE_MS = 2500

export type QualityLongFormDraftStatus
  = | 'idle'
    | 'dirty'
    | 'saving_local'
    | 'local_saved'
    | 'saving_server'
    | 'server_saved'
    | 'error'

export interface QualityLongFormDraftSessionOptions<TSnapshot extends object> {
  kind: string
  kindLabel: string
  getTenantId: () => string
  getEntityKey: () => string | null
  getSnapshot: () => TSnapshot
  isEditable: () => boolean
  canServerAutosave: (snapshot: TSnapshot) => boolean
  serverAutosave: (snapshot: TSnapshot) => Promise<void>
}

export interface QualityLongFormDraftSessionStartResult {
  restored: boolean
  draft?: {
    payloadJson: string
    updatedAt: number
  }
}

/**
 * 管理质量长表单的本机防丢与服务端自动保存会话。
 * 本机保存和服务端保存分别做 revision 校验，旧请求不得覆盖或清除更新后的草稿。
 */
export function useQualityLongFormDraftSession<TSnapshot extends object>(
  options: QualityLongFormDraftSessionOptions<TSnapshot>,
) {
  const status = ref<QualityLongFormDraftStatus>('idle')
  const localSavedAt = ref<number | null>(null)
  const serverSavedAt = ref<number | null>(null)
  const errorMessage = ref('')
  const dirty = ref(false)
  const statusVisible = computed(() => status.value !== 'idle')

  let active = false
  let activeKey = ''
  let baselineJson = ''
  let editRevision = 0
  let localSaveRevision = 0
  let serverSaveRevision = 0
  let localSaveTimer: ReturnType<typeof setTimeout> | undefined
  let serverSaveTimer: ReturnType<typeof setTimeout> | undefined
  let localWriteChain: Promise<void> = Promise.resolve()
  let serverSavePromise: Promise<boolean> | null = null
  let sessionDraftEpoch = getQualityLongFormDraftEpoch()

  function cancelTimers(): void {
    if (localSaveTimer !== undefined) {
      window.clearTimeout(localSaveTimer)
      localSaveTimer = undefined
    }
    if (serverSaveTimer !== undefined) {
      window.clearTimeout(serverSaveTimer)
      serverSaveTimer = undefined
    }
  }

  function resolveDraftKey(): string | null {
    const entityKey = options.getEntityKey()
    if (!entityKey) return null
    return buildQualityLongFormDraftKey(options.getTenantId(), options.kind, entityKey)
  }

  async function persistLocalSnapshot(
    snapshot: TSnapshot,
    revision: number,
    key: string,
  ): Promise<boolean> {
    if (sessionDraftEpoch !== getQualityLongFormDraftEpoch()) {
      active = false
      cancelTimers()
      return false
    }
    const requestRevision = ++localSaveRevision
    status.value = 'saving_local'
    errorMessage.value = ''
    try {
      const savedAt = Date.now()
      const writePromise = localWriteChain.then(() =>
        saveQualityLongFormDraft(key, {
          payloadJson: JSON.stringify(snapshot),
          updatedAt: savedAt,
        }),
      )
      localWriteChain = writePromise.catch(() => undefined)
      await writePromise
      if (
        requestRevision !== localSaveRevision
        || revision !== editRevision
        || key !== activeKey
      ) {
        return false
      }
      localSavedAt.value = savedAt
      status.value = 'local_saved'
      return true
    } catch (error) {
      if (
        requestRevision !== localSaveRevision
        || revision !== editRevision
        || key !== activeKey
      ) {
        return false
      }
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : '本机草稿保存失败'
      return false
    }
  }

  async function performServerSync(snapshot: TSnapshot, revision: number): Promise<boolean> {
    if (sessionDraftEpoch !== getQualityLongFormDraftEpoch()) {
      active = false
      cancelTimers()
      return false
    }
    if (!options.canServerAutosave(snapshot)) {
      status.value = 'local_saved'
      errorMessage.value = `已暂存在本机；补齐${options.kindLabel}必填项后可同步服务端`
      return false
    }
    const requestRevision = ++serverSaveRevision
    const requestKey = activeKey
    status.value = 'saving_server'
    errorMessage.value = ''
    try {
      await options.serverAutosave(snapshot)
      if (requestRevision !== serverSaveRevision || !active) {
        return false
      }
      const nextKey = resolveDraftKey()
      if (!nextKey) {
        throw new Error(`${options.kindLabel}服务端保存后缺少实体键`)
      }
      activeKey = nextKey
      serverSavedAt.value = Date.now()
      if (revision !== editRevision) {
        status.value = 'local_saved'
        errorMessage.value = '服务端已保存上一版，本机仍有更新内容待同步'
        return false
      }
      await localWriteChain
      if (requestKey) {
        await clearQualityLongFormDraft(requestKey)
      }
      if (nextKey !== requestKey) {
        await clearQualityLongFormDraft(nextKey)
      }
      baselineJson = JSON.stringify(options.getSnapshot())
      dirty.value = false
      localSavedAt.value = null
      status.value = 'server_saved'
      return true
    } catch (error) {
      if (requestRevision !== serverSaveRevision || !active) {
        return false
      }
      status.value = 'error'
      const failure = error instanceof Error ? error.message : `${options.kindLabel}同步服务端失败`
      errorMessage.value = `${failure}；本机草稿已保留`
      return false
    }
  }

  /** 服务端草稿保存单飞，避免自动保存与手动保存并发创建重复业务记录。 */
  async function syncServerSnapshot(snapshot: TSnapshot, revision: number): Promise<boolean> {
    if (serverSavePromise) {
      await serverSavePromise
      if (!active || revision !== editRevision) return false
      return syncServerSnapshot(options.getSnapshot(), revision)
    }
    const pending = performServerSync(snapshot, revision)
    serverSavePromise = pending
    try {
      return await pending
    } finally {
      if (serverSavePromise === pending) {
        serverSavePromise = null
      }
    }
  }

  function scheduleSaves(): void {
    cancelTimers()
    const revision = editRevision
    localSaveTimer = window.setTimeout(() => {
      localSaveTimer = undefined
      const key = activeKey
      if (!active || !key || revision !== editRevision) return
      void persistLocalSnapshot(options.getSnapshot(), revision, key)
    }, LOCAL_SAVE_DEBOUNCE_MS)
    serverSaveTimer = window.setTimeout(() => {
      serverSaveTimer = undefined
      if (!active || revision !== editRevision) return
      const snapshot = options.getSnapshot()
      void persistLocalSnapshot(snapshot, revision, activeKey).then((saved) => {
        if (saved && active && revision === editRevision) {
          void syncServerSnapshot(snapshot, revision)
        }
      })
    }, SERVER_SAVE_DEBOUNCE_MS)
  }

  async function beginSession(
    baseline: TSnapshot,
  ): Promise<QualityLongFormDraftSessionStartResult> {
    cancelTimers()
    if (serverSavePromise) {
      await serverSavePromise
    }
    localSaveRevision++
    serverSaveRevision++
    const key = resolveDraftKey()
    if (!key) {
      throw new Error(`${options.kindLabel}缺少草稿实体键`)
    }
    active = true
    sessionDraftEpoch = getQualityLongFormDraftEpoch()
    activeKey = key
    baselineJson = JSON.stringify(baseline)
    editRevision = 0
    dirty.value = false
    status.value = 'idle'
    localSavedAt.value = null
    serverSavedAt.value = null
    errorMessage.value = ''
    await localWriteChain
    const draft = await loadQualityLongFormDraft(key)
    if (!active || activeKey !== key || !draft) {
      return { restored: false }
    }
    JSON.parse(draft.payloadJson) as TSnapshot
    dirty.value = true
    localSavedAt.value = draft.updatedAt
    status.value = 'local_saved'
    return { restored: true, draft }
  }

  function notifyChanged(): void {
    if (!active || !options.isEditable()) return
    const nextKey = resolveDraftKey()
    if (!nextKey) {
      status.value = 'error'
      errorMessage.value = `${options.kindLabel}缺少草稿实体键`
      return
    }
    activeKey = nextKey
    const snapshotJson = JSON.stringify(options.getSnapshot())
    if (snapshotJson === baselineJson) {
      cancelTimers()
      editRevision++
      dirty.value = false
      status.value = 'idle'
      errorMessage.value = ''
      const cleanKey = activeKey
      void localWriteChain.then(() => clearQualityLongFormDraft(cleanKey))
      return
    }
    editRevision++
    dirty.value = true
    status.value = 'dirty'
    errorMessage.value = ''
    scheduleSaves()
  }

  async function saveNow(): Promise<boolean> {
    if (!active || !options.isEditable()) return false
    cancelTimers()
    const revision = editRevision
    const snapshot = options.getSnapshot()
    const savedLocally = await persistLocalSnapshot(snapshot, revision, activeKey)
    if (!savedLocally || revision !== editRevision) return false
    return syncServerSnapshot(snapshot, revision)
  }

  async function markCleanAfterServerSuccess(): Promise<void> {
    cancelTimers()
    localSaveRevision++
    serverSaveRevision++
    const previousKey = activeKey
    const nextKey = resolveDraftKey()
    await localWriteChain
    if (previousKey) await clearQualityLongFormDraft(previousKey)
    if (nextKey && nextKey !== previousKey) await clearQualityLongFormDraft(nextKey)
    if (nextKey) activeKey = nextKey
    baselineJson = JSON.stringify(options.getSnapshot())
    dirty.value = false
    localSavedAt.value = null
    serverSavedAt.value = Date.now()
    status.value = 'server_saved'
    errorMessage.value = ''
  }

  function needsLeaveConfirm(): boolean {
    return active && dirty.value
  }

  /** 正式提交前收敛自动保存，防止同一编辑器并发写入或重复创建。 */
  async function pauseForSubmit(): Promise<void> {
    if (!active) return
    cancelTimers()
    if (serverSavePromise) {
      await serverSavePromise
    }
    if (!active || !dirty.value || !activeKey) return
    const revision = editRevision
    await persistLocalSnapshot(options.getSnapshot(), revision, activeKey)
  }

  async function endSession(endOptions?: { discardLocal?: boolean }): Promise<void> {
    cancelTimers()
    if (serverSavePromise) {
      await serverSavePromise
    }
    localSaveRevision++
    serverSaveRevision++
    await localWriteChain
    if (activeKey) {
      if (endOptions?.discardLocal) {
        await clearQualityLongFormDraft(activeKey)
      } else if (dirty.value) {
        const snapshot = options.getSnapshot()
        await saveQualityLongFormDraft(activeKey, {
          payloadJson: JSON.stringify(snapshot),
          updatedAt: Date.now(),
        })
      }
    }
    active = false
    activeKey = ''
    dirty.value = false
    status.value = 'idle'
    errorMessage.value = ''
  }

  function persistBeforeDispose(): void {
    cancelTimers()
    if (
      !active
      || !dirty.value
      || !activeKey
      || sessionDraftEpoch !== getQualityLongFormDraftEpoch()
    ) {
      return
    }
    const disposeKey = activeKey
    const snapshot = options.getSnapshot()
    localWriteChain = localWriteChain
      .then(() =>
        saveQualityLongFormDraft(disposeKey, {
          payloadJson: JSON.stringify(snapshot),
          updatedAt: Date.now(),
        }),
      )
      .catch(() => undefined)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', persistBeforeDispose)
  }
  onScopeDispose(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', persistBeforeDispose)
    }
    persistBeforeDispose()
  })

  return {
    status,
    statusVisible,
    localSavedAt,
    serverSavedAt,
    errorMessage,
    beginSession,
    notifyChanged,
    saveNow,
    pauseForSubmit,
    markCleanAfterServerSuccess,
    needsLeaveConfirm,
    endSession,
  }
}
