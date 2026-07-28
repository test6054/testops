const DB_NAME = 'nybc-quality-long-form-drafts'
const STORE_NAME = 'drafts'
const DB_VERSION = 1
let qualityDraftEpoch = 0

export interface QualityLongFormDraft {
  payloadJson: string
  updatedAt: number
}

/** 当前草稿库代次；登出清库后，旧编辑会话必须停止继续写入。 */
export function getQualityLongFormDraftEpoch(): number {
  return qualityDraftEpoch
}

function openQualityDraftDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('当前浏览器不支持 IndexedDB，无法暂存质量表单草稿'))
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('质量表单草稿数据库打开失败'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

/** 质量长表单草稿键：租户、业务种类、实体会话三层隔离。 */
export function buildQualityLongFormDraftKey(
  tenantId: string,
  kind: string,
  entityKey: string,
): string {
  const normalizedTenantId = tenantId.trim()
  const normalizedKind = kind.trim()
  const normalizedEntityKey = entityKey.trim()
  if (!normalizedTenantId || !normalizedKind || !normalizedEntityKey) {
    throw new Error('质量表单草稿缺少租户、业务种类或实体键')
  }
  return `${normalizedTenantId}:${normalizedKind}:${normalizedEntityKey}`
}

/** 读取尚未同步服务端的质量长表单本机草稿。 */
export async function loadQualityLongFormDraft(
  key: string,
): Promise<QualityLongFormDraft | undefined> {
  const db = await openQualityDraftDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    let result: QualityLongFormDraft | undefined
    request.onsuccess = () => {
      result = request.result as QualityLongFormDraft | undefined
    }
    request.onerror = () => reject(request.error ?? new Error('质量表单草稿读取失败'))
    tx.oncomplete = () => {
      db.close()
      resolve(result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿读取事务失败'))
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿读取事务已中止'))
    }
  })
}

/** 持久化质量长表单本机草稿，事务完成后才视为保存成功。 */
export async function saveQualityLongFormDraft(
  key: string,
  draft: QualityLongFormDraft,
): Promise<void> {
  const db = await openQualityDraftDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(draft, key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿保存失败'))
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿保存事务已中止'))
    }
  })
}

/** 删除指定实体的本机草稿；正式保存成功后调用。 */
export async function clearQualityLongFormDraft(key: string): Promise<void> {
  const db = await openQualityDraftDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿删除失败'))
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿删除事务已中止'))
    }
  })
}

/** 退出登录时清除当前浏览器中的全部质量长表单草稿。 */
export async function clearAllQualityLongFormDrafts(): Promise<void> {
  qualityDraftEpoch++
  const db = await openQualityDraftDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿清库失败'))
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('质量表单草稿清库事务已中止'))
    }
  })
}
