/** 文档材料绑定状态 */
export enum DocumentMaterialBindingStatusCode {
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
}

export const ALL_DOCUMENT_MATERIAL_BINDING_STATUS_CODES: readonly DocumentMaterialBindingStatusCode[] = [
  DocumentMaterialBindingStatusCode.ACTIVE,
  DocumentMaterialBindingStatusCode.SUPERSEDED,
]
export const DocumentMaterialBindingStatusDescription: Record<DocumentMaterialBindingStatusCode, string> = {
  [DocumentMaterialBindingStatusCode.ACTIVE]: '生效',
  [DocumentMaterialBindingStatusCode.SUPERSEDED]: '已替换',
}


