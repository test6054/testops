export enum PaddleOcrDeviceKindCode {
  CPU = 'CPU',
  GPU = 'GPU',
}

export const PaddleOcrDeviceKindDescription: Record<PaddleOcrDeviceKindCode, string> = {
  [PaddleOcrDeviceKindCode.CPU]: 'CPU',
  [PaddleOcrDeviceKindCode.GPU]: 'GPU',
}
