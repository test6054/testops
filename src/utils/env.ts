import XEUtils from 'xe-utils'

/** @desc 是否是h5环境 */
export const isMobile = () => {
  return XEUtils.browse().isMobile
}
