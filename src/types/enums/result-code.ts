/**
 * 与后端 com.nybc.edu.common.enums.ResultCodeEnum 逐值对齐的业务码。
 * 前端分支判断必须使用本常量，禁止魔法数字或“未知错误码”推断。
 */
export enum ResultCode {
  SUCCESS = 200,
  PARAM_ERROR = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  SYSTEM_ERROR = 9999,
  DATA_NOT_FOUND = 9003,
  DATA_OPERATION_FAILED = 9004,
  CONCURRENT_UPDATE_CONFLICT = 9006,
}
