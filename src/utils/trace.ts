/**
 * 前端链路追踪工具。
 * 每个浏览器请求生成独立 traceId，后端缺失时仍会兜底生成。
 */

/** 链路追踪请求头 */
export const TRACE_ID_HEADER = 'X-Trace-Id'

/**
 * 生成前端请求 traceId。
 * 优先使用浏览器随机 UUID，降级时保留时间前缀便于排查请求发起时间。
 */
export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '')
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

/**
 * 获取请求链路追踪头。
 */
export function getTraceHeaders(): Record<string, string> {
  return {
    [TRACE_ID_HEADER]: generateTraceId(),
  }
}
