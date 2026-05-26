import { isLinux } from './index'

// 通过主进程 IPC 读取剪贴板中的文件路径，避免 @electron/remote 对
// Windows UTF-16LE 路径（含中文）的解码错误
export const guessClipboardFilePath = async () => {
  if (isLinux) return ''
  try {
    if (window.electron && window.electron.ipcRenderer) {
      return await window.electron.ipcRenderer.invoke('mt::get-clipboard-filepath')
    }
  } catch (e) {
    console.error('[clipboard] 读取剪贴板文件路径失败:', e)
  }
  return ''
}
