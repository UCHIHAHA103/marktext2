import { isLinux } from './index'

// 读取剪贴板中的文件路径（用于粘贴图片文件）
// 使用 window.electron.clipboard.readFilePaths() 替代 @electron/remote，
// readFilePaths() 通过 CF_HDROP 格式正确处理 Unicode（含中文）路径
export const guessClipboardFilePath = () => {
  if (isLinux) return ''
  try {
    if (window.electron && window.electron.clipboard && window.electron.clipboard.readFilePaths) {
      const files = window.electron.clipboard.readFilePaths()
      if (files && files.length > 0) {
        console.log('[clipboard] 剪贴板文件路径:', files[0])
        return files[0]
      }
    }
  } catch (e) {
    console.error('[clipboard] 读取剪贴板文件路径失败:', e)
  }
  return ''
}
