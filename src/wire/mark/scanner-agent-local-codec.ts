import type {
  AgentHealthResponse,
  AgentSetupContextResponse,
  KioskBrowserAuthResponse,
  LocalAgentJsonValue,
  LocalApiResult,
  LocalScannerAgentActivateResponse,
  LocalScannerAgentInstallUpdateResponse,
  LocalScanPageSide,
  ScanJobListResponse,
  ScanJobResponse,
  ScannerDeviceInfo,
  ScannerListResponse,
  ScanPageInfo,
} from '@/apis/mark/scanner-agent-local'
import type { ExamScannerScanConfigVO } from '@/apis/mark/scanner-kiosk'
import type {
  ScannerKioskScanModeCode} from '@/types/enums/scanner-kiosk-scan-mode-enum';
import type { AgentWireJsonObject } from '@/wire/mark/scanner-agent-local-wire'
import {
  AgentDiagnosticStatusCode,
} from '@/types/enums/agent-diagnostic-status-enum'
import {
  AgentHealthStatusCode,
} from '@/types/enums/agent-health-status-enum'
import {
  AgentUpdateStatusCode,
} from '@/types/enums/agent-update-status-enum'
import {
  LocalScanJobStatusCode,
} from '@/types/enums/local-scan-job-status-enum'
import {
  LocalScanPageStatusCode,
} from '@/types/enums/local-scan-page-status-enum'
import {
  ALL_SCANNER_DUPLEX_MODE_CODES,
} from '@/types/enums/scanner-duplex-mode-enum'
import {
  ALL_SCANNER_KIOSK_SCAN_MODE_CODES
} from '@/types/enums/scanner-kiosk-scan-mode-enum'
import {
  LOCAL_AGENT_WIRE_ERROR,
  requireAgentWireBoolean,
  requireAgentWireInt32,
  requireAgentWireInt64,
  requireAgentWireNullableString,
  requireAgentWireObject,
  requireAgentWireString,
  requireAgentWireStringArray,
  requireOptionalAgentWireInt32,
  requireOptionalAgentWireString,
} from '@/wire/mark/scanner-agent-local-wire'

const LOCAL_AGENT_REQUEST_ERROR = '本地扫描服务处理失败，请检查扫描服务后重试'

function rejectLocalAgentResponse(): never {
  throw new Error(LOCAL_AGENT_WIRE_ERROR)
}

function rejectLocalAgentRequest(message?: string): never {
  throw new Error(message || LOCAL_AGENT_REQUEST_ERROR)
}

/**
 * 读取本机 Agent 统一响应 envelope；不变量：业务失败透出 Agent message，成功必须带 data。
 */
export async function readLocalAgentResponseData(
  response: Response,
  parseBusyError: (message: string) => Error | null,
): Promise<LocalAgentJsonValue> {
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    rejectLocalAgentResponse()
  }
  if (!isLocalAgentJsonValue(parsed)) {
    rejectLocalAgentResponse()
  }
  const envelope = readAgentPayload(() => validateLocalApiResult(parsed, response))
  if (!response.ok || !envelope.success) {
    const message = envelope.message
    const busyError = parseBusyError(message)
    if (busyError) {
      throw busyError
    }
    rejectLocalAgentRequest(message)
  }
  if (!Object.hasOwn(envelope, 'data')) {
    rejectLocalAgentResponse()
  }
  const data = envelope.data
  if (data === undefined) {
    rejectLocalAgentResponse()
  }
  return data
}

export function readAgentHealthResponse(value: LocalAgentJsonValue): AgentHealthResponse {
  return readAgentPayload(() => validateAgentHealthResponse(value))
}

export function readAgentSetupContextResponse(
  value: LocalAgentJsonValue,
): AgentSetupContextResponse {
  return readAgentPayload(() => validateAgentSetupContextResponse(value))
}

export function readKioskBrowserAuthResponse(value: LocalAgentJsonValue): KioskBrowserAuthResponse {
  return readAgentPayload(() => validateKioskBrowserAuthResponse(value))
}

export function readScannerListResponse(value: LocalAgentJsonValue): ScannerListResponse {
  return readAgentPayload(() => validateScannerListResponse(value))
}

export function readScannerAgentActivateResponse(
  value: LocalAgentJsonValue,
): LocalScannerAgentActivateResponse {
  return readAgentPayload(() => validateScannerAgentActivateResponse(value))
}

export function readLocalScannerAgentInstallUpdateResponse(
  value: LocalAgentJsonValue,
): LocalScannerAgentInstallUpdateResponse {
  return readAgentPayload(() => validateLocalScannerAgentInstallUpdateResponse(value))
}

export function readScanJobResponse(value: LocalAgentJsonValue): ScanJobResponse {
  return readAgentPayload(() => validateScanJobResponse(value))
}

export function readScanJobListResponse(value: LocalAgentJsonValue): ScanJobListResponse {
  return readAgentPayload(() => validateScanJobListResponse(value))
}

export function readBooleanResult(value: LocalAgentJsonValue): boolean {
  return readAgentPayload(() => validateBooleanResult(value))
}

function readAgentPayload<T>(action: () => T): T {
  try {
    return action()
  } catch {
    rejectLocalAgentResponse()
  }
}

function requireObject(value: LocalAgentJsonValue): AgentWireJsonObject {
  return requireAgentWireObject(value)
}

function isLocalAgentJsonValue(value: unknown): value is LocalAgentJsonValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return true
  }
  if (Array.isArray(value)) {
    return value.every(isLocalAgentJsonValue)
  }
  if (typeof value !== 'object') {
    return false
  }
  return Object.values(value).every(isLocalAgentJsonValue)
}

function requireScanMode(value: AgentWireJsonObject, field: string): ScannerKioskScanModeCode {
  const raw = value[field]
  if (typeof raw !== 'string') {
    rejectLocalAgentResponse()
  }
  const scanMode = ALL_SCANNER_KIOSK_SCAN_MODE_CODES.find(code => code === raw)
  if (!scanMode) {
    rejectLocalAgentResponse()
  }
  return scanMode
}

function requireScannerDuplexMode(
  value: AgentWireJsonObject,
  field: string,
): ExamScannerScanConfigVO['duplexMode'] {
  const raw = value[field]
  if (typeof raw !== 'string') {
    rejectLocalAgentResponse()
  }
  const duplexMode = ALL_SCANNER_DUPLEX_MODE_CODES.find(code => code === raw)
  if (!duplexMode) {
    rejectLocalAgentResponse()
  }
  return duplexMode
}

function requireAgentHealthStatus(value: AgentWireJsonObject, field: string): AgentHealthStatusCode {
  const fieldValue = value[field]
  if (fieldValue !== AgentHealthStatusCode.RUNNING) {
    rejectLocalAgentResponse()
  }
  return AgentHealthStatusCode.RUNNING
}

function requireAgentDiagnosticStatus(
  value: AgentWireJsonObject,
  field: string,
): AgentDiagnosticStatusCode {
  const fieldValue = value[field]
  if (fieldValue === AgentDiagnosticStatusCode.OK) {
    return AgentDiagnosticStatusCode.OK
  }
  if (fieldValue === AgentDiagnosticStatusCode.WARNING) {
    return AgentDiagnosticStatusCode.WARNING
  }
  rejectLocalAgentResponse()
}

function requireScanJobStatus(value: AgentWireJsonObject, field: string): LocalScanJobStatusCode {
  const fieldValue = value[field]
  switch (fieldValue) {
    case LocalScanJobStatusCode.CREATED:
      return LocalScanJobStatusCode.CREATED
    case LocalScanJobStatusCode.SCANNING:
      return LocalScanJobStatusCode.SCANNING
    case LocalScanJobStatusCode.PAUSED:
      return LocalScanJobStatusCode.PAUSED
    case LocalScanJobStatusCode.READYTOUPLOAD:
      return LocalScanJobStatusCode.READYTOUPLOAD
    case LocalScanJobStatusCode.UPLOADING:
      return LocalScanJobStatusCode.UPLOADING
    case LocalScanJobStatusCode.REPORTED:
      return LocalScanJobStatusCode.REPORTED
    case LocalScanJobStatusCode.FAILED:
      return LocalScanJobStatusCode.FAILED
    case LocalScanJobStatusCode.RETRYING:
      return LocalScanJobStatusCode.RETRYING
    case LocalScanJobStatusCode.CANCELLED:
      return LocalScanJobStatusCode.CANCELLED
  }
  rejectLocalAgentResponse()
}

function requireScanPageStatus(value: AgentWireJsonObject, field: string): LocalScanPageStatusCode {
  const fieldValue = value[field]
  switch (fieldValue) {
    case LocalScanPageStatusCode.CAPTURED:
      return LocalScanPageStatusCode.CAPTURED
    case LocalScanPageStatusCode.PREPROCESSED:
      return LocalScanPageStatusCode.PREPROCESSED
    case LocalScanPageStatusCode.UPLOADING:
      return LocalScanPageStatusCode.UPLOADING
    case LocalScanPageStatusCode.UPLOADED:
      return LocalScanPageStatusCode.UPLOADED
    case LocalScanPageStatusCode.FAILED:
      return LocalScanPageStatusCode.FAILED
    case LocalScanPageStatusCode.DELETED:
      return LocalScanPageStatusCode.DELETED
  }
  rejectLocalAgentResponse()
}

function requireScanPageSide(value: AgentWireJsonObject, field: string): LocalScanPageSide {
  const fieldValue = value[field]
  if (fieldValue !== 'FRONT' && fieldValue !== 'BACK') {
    rejectLocalAgentResponse()
  }
  return fieldValue
}

function validateLocalApiResult(value: LocalAgentJsonValue, response: Response): LocalApiResult {
  const result = requireObject(value)
  const envelope: LocalApiResult = {
    success: requireAgentWireBoolean(result, 'success'),
    code: requireAgentWireString(result, 'code'),
    message: requireAgentWireString(result, 'message'),
    traceId: requireAgentWireString(result, 'traceId'),
  }
  if (Object.hasOwn(result, 'data')) {
    envelope.data = result.data
  }
  if (response.ok && envelope.success && !Object.hasOwn(result, 'data')) {
    rejectLocalAgentResponse()
  }
  return envelope
}

function requireAgentUpdateStatus(value: AgentWireJsonObject, field: string): AgentUpdateStatusCode {
  const fieldValue = value[field]
  if (
    fieldValue !== AgentUpdateStatusCode.NONE
    && fieldValue !== AgentUpdateStatusCode.AVAILABLE
    && fieldValue !== AgentUpdateStatusCode.DOWNLOADING
    && fieldValue !== AgentUpdateStatusCode.DOWNLOADED
    && fieldValue !== AgentUpdateStatusCode.INSTALLING
    && fieldValue !== AgentUpdateStatusCode.INSTALLED
    && fieldValue !== AgentUpdateStatusCode.FAILED
  ) {
    rejectLocalAgentResponse()
  }
  return fieldValue
}

function validateLocalScannerAgentInstallUpdateResponse(
  value: LocalAgentJsonValue,
): LocalScannerAgentInstallUpdateResponse {
  const result = requireObject(value)
  return {
    installing: requireAgentWireBoolean(result, 'installing'),
    packageVersion: requireAgentWireString(result, 'packageVersion'),
    packageFileName: requireAgentWireString(result, 'packageFileName'),
  }
}

function validateAgentHealthResponse(value: LocalAgentJsonValue): AgentHealthResponse {
  const result = requireObject(value)
  return {
    status: requireAgentHealthStatus(result, 'status'),
    agentVersion: requireAgentWireString(result, 'agentVersion'),
    machineCode: requireAgentWireString(result, 'machineCode'),
    bound: requireAgentWireBoolean(result, 'bound'),
    scannerConnected: requireAgentWireBoolean(result, 'scannerConnected'),
    pendingUploadJobs: requireAgentWireInt32(result, 'pendingUploadJobs'),
    diagnosticStatus: requireAgentDiagnosticStatus(result, 'diagnosticStatus'),
    diagnosticMessage: requireAgentWireString(result, 'diagnosticMessage'),
    upgradeRequired: requireAgentWireBoolean(result, 'upgradeRequired'),
    minimumAgentVersion: requireAgentWireString(result, 'minimumAgentVersion'),
    latestAgentVersion: requireAgentWireString(result, 'latestAgentVersion'),
    minimumClientVersion: requireAgentWireString(result, 'minimumClientVersion'),
    latestClientVersion: requireAgentWireString(result, 'latestClientVersion'),
    scanAllowed: requireAgentWireBoolean(result, 'scanAllowed'),
    tokenResetRequired: requireAgentWireBoolean(result, 'tokenResetRequired'),
    rebindRequired: requireAgentWireBoolean(result, 'rebindRequired'),
    lastHeartbeatAt: requireAgentWireNullableString(result, 'lastHeartbeatAt'),
    updateAvailable: requireAgentWireBoolean(result, 'updateAvailable'),
    updateStatus: requireAgentUpdateStatus(result, 'updateStatus'),
    updatePackageVersion: requireAgentWireString(result, 'updatePackageVersion'),
    updatePackageFileName: requireAgentWireString(result, 'updatePackageFileName'),
    updateDownloadedAt: requireAgentWireNullableString(result, 'updateDownloadedAt'),
    updateDiagnosticMessage: requireAgentWireString(result, 'updateDiagnosticMessage'),
    updateInstallable: requireAgentWireBoolean(result, 'updateInstallable'),
    workspaceBlocked: 'workspaceBlocked' in result && result.workspaceBlocked === true,
  }
}

function validateScannerListResponse(value: LocalAgentJsonValue): ScannerListResponse {
  const result = requireObject(value)
  const devices = result.devices
  if (!Array.isArray(devices)) {
    rejectLocalAgentResponse()
  }
  const payload: ScannerListResponse = {
    devices: devices.map((item) => validateScannerDeviceInfo(item)),
  }
  const catalogDiagnostic = requireOptionalAgentWireString(result, 'catalogDiagnostic')
  if (catalogDiagnostic !== undefined) {
    payload.catalogDiagnostic = catalogDiagnostic
  }
  return payload
}

function validateScannerDeviceInfo(value: LocalAgentJsonValue): ScannerDeviceInfo {
  const result = requireObject(value)
  const scanner: ScannerDeviceInfo = {
    localScannerId: requireAgentWireString(result, 'localScannerId'),
    displayName: requireAgentWireString(result, 'displayName'),
    driverType: requireAgentWireString(result, 'driverType'),
    supportsAdf: requireAgentWireBoolean(result, 'supportsAdf'),
    supportsDuplex: requireAgentWireBoolean(result, 'supportsDuplex'),
    available: requireAgentWireBoolean(result, 'available'),
  }
  const maxDpi = requireOptionalAgentWireInt32(result, 'maxDpi')
  if (maxDpi !== undefined) {
    scanner.maxDpi = maxDpi
  }
  const diagnostic = requireOptionalAgentWireString(result, 'diagnostic')
  if (diagnostic !== undefined) {
    scanner.diagnostic = diagnostic
  }
  return scanner
}

function validateAgentSetupContextResponse(value: LocalAgentJsonValue): AgentSetupContextResponse {
  const result = requireObject(value)
  const payload: AgentSetupContextResponse = {
    defaultGatewayBaseUrl: requireAgentWireString(result, 'defaultGatewayBaseUrl'),
    bound: requireAgentWireBoolean(result, 'bound'),
  }
  const scannerDeviceId = requireOptionalAgentWireString(result, 'scannerDeviceId')
  if (scannerDeviceId !== undefined) {
    payload.scannerDeviceId = scannerDeviceId
  }
  const scannerStationId = requireOptionalAgentWireString(result, 'scannerStationId')
  if (scannerStationId !== undefined) {
    payload.scannerStationId = scannerStationId
  }
  const deviceName = requireOptionalAgentWireString(result, 'deviceName')
  if (deviceName !== undefined) {
    payload.deviceName = deviceName
  }
  const gatewayBaseUrl = requireOptionalAgentWireString(result, 'gatewayBaseUrl')
  if (gatewayBaseUrl !== undefined) {
    payload.gatewayBaseUrl = gatewayBaseUrl
  }
  const activatedAt = requireOptionalAgentWireString(result, 'activatedAt')
  if (activatedAt !== undefined) {
    payload.activatedAt = activatedAt
  }
  const preferredLocalScannerId = requireOptionalAgentWireString(result, 'preferredLocalScannerId')
  if (preferredLocalScannerId !== undefined) {
    payload.preferredLocalScannerId = preferredLocalScannerId
  }
  return payload
}

function validateKioskBrowserAuthResponse(value: LocalAgentJsonValue): KioskBrowserAuthResponse {
  const result = requireObject(value)
  const payload: KioskBrowserAuthResponse = {
    pushAuthorizationHeader: requireAgentWireString(result, 'pushAuthorizationHeader'),
    scannerDeviceId: requireAgentWireString(result, 'scannerDeviceId'),
    scannerStationId: requireAgentWireString(result, 'scannerStationId'),
    deviceName: requireAgentWireString(result, 'deviceName'),
    gatewayBaseUrl: requireAgentWireString(result, 'gatewayBaseUrl'),
  }
  const tenantId = requireOptionalAgentWireString(result, 'tenantId')
  if (tenantId !== undefined) {
    payload.tenantId = tenantId
  }
  return payload
}

function validateScannerAgentActivateResponse(
  value: LocalAgentJsonValue,
): LocalScannerAgentActivateResponse {
  const result = requireObject(value)
  const payload: LocalScannerAgentActivateResponse = {
    scannerDeviceId: requireAgentWireString(result, 'scannerDeviceId'),
    scannerStationId: requireAgentWireString(result, 'scannerStationId'),
    deviceName: requireAgentWireString(result, 'deviceName'),
    gatewayBaseUrl: requireAgentWireString(result, 'gatewayBaseUrl'),
    pushPageUrl: requireAgentWireString(result, 'pushPageUrl'),
    pushCommitUrl: requireAgentWireString(result, 'pushCommitUrl'),
    pushToken: requireAgentWireString(result, 'pushToken'),
    pushAuthorizationHeader: requireAgentWireString(result, 'pushAuthorizationHeader'),
    storageUploadUrl: requireAgentWireString(result, 'storageUploadUrl'),
    storageUploadToken: requireAgentWireString(result, 'storageUploadToken'),
    storageUploadAuthorizationHeader: requireAgentWireString(
      result,
      'storageUploadAuthorizationHeader',
    ),
    kioskLockEnabled: requireAgentWireBoolean(result, 'kioskLockEnabled'),
    activatedAt: requireAgentWireString(result, 'activatedAt'),
    minimumAgentVersion: requireAgentWireString(result, 'minimumAgentVersion'),
    latestAgentVersion: requireAgentWireString(result, 'latestAgentVersion'),
  }
  const tenantId = requireOptionalAgentWireString(result, 'tenantId')
  if (tenantId !== undefined) {
    payload.tenantId = tenantId
  }
  return payload
}

function validateScanJobResponse(value: LocalAgentJsonValue): ScanJobResponse {
  return validateScanJobResponsePayload(value)
}

function validateScanJobListResponse(value: LocalAgentJsonValue): ScanJobListResponse {
  const result = requireObject(value)
  const jobs = result.jobs
  if (!Array.isArray(jobs)) {
    rejectLocalAgentResponse()
  }
  return {
    jobs: jobs.map((item) => validateScanJobResponsePayload(item)),
  }
}

function validateScanJobResponsePayload(value: LocalAgentJsonValue): ScanJobResponse {
  const result = requireObject(value)
  const pages = result.pages
  if (!Array.isArray(pages)) {
    rejectLocalAgentResponse()
  }
  const payload: ScanJobResponse = {
    scanJobId: requireAgentWireString(result, 'scanJobId'),
    examId: requireAgentWireString(result, 'examId'),
    declaredClassIds: requireAgentWireStringArray(result, 'declaredClassIds'),
    scannerDeviceId: requireAgentWireString(result, 'scannerDeviceId'),
    scannerStationId: requireAgentWireString(result, 'scannerStationId'),
    batchExternalNo: requireAgentWireString(result, 'batchExternalNo'),
    scanMode: requireScanMode(result, 'scanMode'),
    status: requireScanJobStatus(result, 'status'),
    duplexMode: requireScannerDuplexMode(result, 'duplexMode'),
    scannedPages: requireAgentWireInt32(result, 'scannedPages'),
    uploadedPages: requireAgentWireInt32(result, 'uploadedPages'),
    reported: requireAgentWireBoolean(result, 'reported'),
    replaceTargetPage: requireAgentWireBoolean(result, 'replaceTargetPage'),
    message: requireAgentWireString(result, 'message'),
    pages: pages.map((item) => validateScanPageInfo(item)),
  }
  const scanBatchId = requireOptionalAgentWireString(result, 'scanBatchId')
  if (scanBatchId !== undefined) {
    payload.scanBatchId = scanBatchId
  }
  const targetPageNo = requireOptionalAgentWireInt32(result, 'targetPageNo')
  if (targetPageNo !== undefined) {
    payload.targetPageNo = targetPageNo
  }
  const supplementReason = requireOptionalAgentWireString(result, 'supplementReason')
  if (supplementReason !== undefined) {
    payload.supplementReason = supplementReason
  }
  if (result.pageRegisterBlocked === true) {
    payload.pageRegisterBlocked = true
    const pageRegisterDiagnostic = requireOptionalAgentWireString(result, 'pageRegisterDiagnostic')
    if (pageRegisterDiagnostic !== undefined) {
      payload.pageRegisterDiagnostic = pageRegisterDiagnostic
    }
  }
  return payload
}

function validateScanPageInfo(value: LocalAgentJsonValue): ScanPageInfo {
  const result = requireObject(value)
  const page: ScanPageInfo = {
    captureSeq: requireAgentWireInt32(result, 'captureSeq'),
    pageNo: requireAgentWireInt32(result, 'pageNo'),
    sheetNo: requireAgentWireInt32(result, 'sheetNo'),
    pageSide: requireScanPageSide(result, 'pageSide'),
    pageSideLabel: requireAgentWireString(result, 'pageSideLabel'),
    status: requireScanPageStatus(result, 'status'),
    sizeBytes: requireAgentWireInt64(result, 'sizeBytes'),
    capturedAt: requireAgentWireString(result, 'capturedAt'),
  }
  const diagnostic = requireOptionalAgentWireString(result, 'diagnostic')
  if (diagnostic !== undefined) {
    page.diagnostic = diagnostic
  }
  const uploadedAt = requireOptionalAgentWireString(result, 'uploadedAt')
  if (uploadedAt !== undefined) {
    page.uploadedAt = uploadedAt
  }
  const uploadedFileId = requireOptionalAgentWireString(result, 'uploadedFileId')
  if (uploadedFileId !== undefined) {
    page.uploadedFileId = uploadedFileId
  }
  return page
}

function validateBooleanResult(value: LocalAgentJsonValue): boolean {
  if (typeof value !== 'boolean') {
    rejectLocalAgentResponse()
  }
  return value
}
