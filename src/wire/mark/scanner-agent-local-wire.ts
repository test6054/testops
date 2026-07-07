/** 与 nybc-scanner-agent JsonDefaults.LongStringJsonConverter 一致的 wire 契约错误 */
export const LOCAL_AGENT_WIRE_ERROR = '本地扫描服务响应异常，请检查扫描服务后重试'

export type AgentWireJsonValue
  = | string
    | number
    | boolean
    | null
    | AgentWireJsonObject
    | AgentWireJsonValue[]

export interface AgentWireJsonObject {
  [key: string]: AgentWireJsonValue | undefined
}

function rejectAgentWire(): never {
  throw new Error(LOCAL_AGENT_WIRE_ERROR)
}

export function requireAgentWireObject(value: AgentWireJsonValue): AgentWireJsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    rejectAgentWire()
  }
  return value
}

/** Agent C# int 字段：HTTP JSON number。 */
export function requireAgentWireInt32(value: AgentWireJsonObject, field: string): number {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue) || !Number.isInteger(fieldValue)) {
    rejectAgentWire()
  }
  return fieldValue
}

/** Agent C# int? 字段：缺省 undefined，存在时必须为 JSON number。 */
export function requireOptionalAgentWireInt32(
  value: AgentWireJsonObject,
  field: string,
): number | undefined {
  const fieldValue = value[field]
  if (fieldValue === undefined) {
    return undefined
  }
  return requireAgentWireInt32(value, field)
}

/**
 * Agent C# long 字段：LongStringJsonConverter 在 HTTP 边界固定输出十进制字符串。
 * 真源：nybc-scanner-agent JsonDefaults.LongStringJsonConverter.Write。
 */
export function requireAgentWireInt64(value: AgentWireJsonObject, field: string): string {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
    rejectAgentWire()
  }
  if (!/^-?\d+$/.test(fieldValue.trim())) {
    rejectAgentWire()
  }
  return fieldValue.trim()
}

/** Agent C# long? 字段：缺省 undefined，存在时必须为十进制字符串。 */
export function requireOptionalAgentWireInt64(
  value: AgentWireJsonObject,
  field: string,
): string | undefined {
  if (value[field] === undefined || value[field] === null) {
    return undefined
  }
  return requireAgentWireInt64(value, field)
}

export function requireAgentWireString(value: AgentWireJsonObject, field: string): string {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'string') {
    rejectAgentWire()
  }
  return fieldValue
}

export function requireOptionalAgentWireString(
  value: AgentWireJsonObject,
  field: string,
): string | undefined {
  const fieldValue = value[field]
  if (fieldValue === undefined) {
    return undefined
  }
  return requireAgentWireString(value, field)
}

export function requireAgentWireBoolean(value: AgentWireJsonObject, field: string): boolean {
  const fieldValue = value[field]
  if (typeof fieldValue !== 'boolean') {
    rejectAgentWire()
  }
  return fieldValue
}

export function requireAgentWireStringArray(value: AgentWireJsonObject, field: string): string[] {
  const fieldValue = value[field]
  if (!Array.isArray(fieldValue) || fieldValue.some((item) => typeof item !== 'string')) {
    rejectAgentWire()
  }
  return fieldValue.map((item) => {
    if (typeof item !== 'string') {
      rejectAgentWire()
    }
    return item
  })
}

export function requireAgentWireNullableString(
  value: AgentWireJsonObject,
  field: string,
): string | null {
  const fieldValue = value[field]
  if (fieldValue === undefined || fieldValue === null) {
    return null
  }
  return requireAgentWireString(value, field)
}
