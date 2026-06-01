<template>
  <div class="about-dialog">
    <el-dialog
      v-model="showAboutDialog"
      :show-close="false"
      :modal="true"
      custom-class="ag-dialog-table"
      width="400px"
    >
      <img
        class="logo"
        :src="MarkTextLogo"
      >
      <el-row>
        <el-col :span="24">
          <h3 class="title">
            {{ name }}
          </h3>
        </el-col>
        <el-col :span="24">
          <div class="text">
            {{ store.appVersion }}
          </div>
        </el-col>
        <el-col :span="24">
          <div
            class="text"
            style="min-height: auto"
          >
            {{ copyright }}
          </div>
        </el-col>
        <el-col :span="24">
          <div class="text">
            {{ copyrightContributors }}
          </div>
        </el-col>
        <el-col :span="24">
          <div class="update-row">
            <button
              class="update-btn"
              :disabled="updateChecking"
              @click="checkUpdate"
            >
              {{ updateChecking ? t('about.checking') : t('about.checkUpdate') }}
            </button>
            <div
              v-if="updateMessage"
              class="update-message"
              :class="updateLevel"
            >
              <span>{{ updateMessage }}</span>
              <a
                v-if="updateUrl"
                href="javascript:;"
                class="update-link"
                @click="openUpdateUrl"
              >{{ t('about.viewRelease') }}</a>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useMainStore } from '@/store'
import bus from '../../bus'
import MarkTextLogo from '../../assets/images/logo.png'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const name = 'MarkText'
const copyright = t('about.copyright', { year: new Date().getFullYear() })
const copyrightContributors = t('about.copyrightContributors')
const showAboutDialog = ref(false)

const store = useMainStore()

// ─── 检查更新 ────────────────────────────────────────────
const RELEASES_API = 'https://api.github.com/repos/UCHIHAHA103/marktext2/releases/latest'
const RELEASES_API_FALLBACK = 'https://api.github.com/repos/UCHIHAHA103/marktext2/releases'

const updateChecking = ref(false)
const updateMessage = ref('')
const updateLevel = ref('') // 'success' | 'info' | 'error'
const updateUrl = ref('')

// 语义化版本比较：a > b 返回 1，a < b 返回 -1，相等 0
const compareVersion = (a, b) => {
  const norm = v => String(v).replace(/^v/i, '').split(/[-+]/)[0].split('.').map(n => parseInt(n, 10) || 0)
  const aa = norm(a)
  const bb = norm(b)
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i] || 0
    const y = bb[i] || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

const checkUpdate = async () => {
  updateChecking.value = true
  updateMessage.value = ''
  updateLevel.value = ''
  updateUrl.value = ''
  console.log('[checkUpdate] start, current=' + store.appVersion)
  // 走 main 进程 IPC 请求, 绕过 renderer 的 CSP / fetch UA 限制
  const httpGet = window.electron?.ipcRenderer?.invoke
  if (!httpGet) {
    updateLevel.value = 'error'
    updateMessage.value = t('about.checkFailed') + '：IPC 不可用'
    updateChecking.value = false
    return
  }
  try {
    let release = null
    let firstErr = null

    console.log('[checkUpdate] fetching /releases/latest via IPC...')
    const r1 = await window.electron.ipcRenderer.invoke('mt::http-get-json', RELEASES_API, { 'X-GitHub-Api-Version': '2022-11-28' })
    console.log(`[checkUpdate] /latest result: ok=${r1.ok}, status=${r1.status}, error=${r1.error || ''}`)
    if (r1.ok && r1.data && r1.data.tag_name) {
      release = r1.data
    } else {
      firstErr = r1.error ? r1.error : `HTTP ${r1.status}`
    }

    // /releases/latest 不返回 prerelease，回落到 /releases 取第一条
    if (!release || !release.tag_name) {
      console.log('[checkUpdate] fallback to /releases (含 prerelease)...')
      const r2 = await window.electron.ipcRenderer.invoke('mt::http-get-json', RELEASES_API_FALLBACK, { 'X-GitHub-Api-Version': '2022-11-28' })
      console.log(`[checkUpdate] /releases result: ok=${r2.ok}, status=${r2.status}, error=${r2.error || ''}`)
      if (!r2.ok) throw new Error(`GitHub API ${r2.status || 'NETWORK'} (latest err: ${firstErr || 'n/a'}; current err: ${r2.error || 'n/a'})`)
      const list = r2.data
      release = Array.isArray(list) && list.length ? list[0] : null
    }
    if (!release || !release.tag_name) throw new Error('no release found')

    const latest = release.tag_name
    const current = store.appVersion
    console.log(`[checkUpdate] latest=${latest}, current=${current}`)
    const cmp = compareVersion(latest, current)
    updateUrl.value = release.html_url || ''

    if (cmp > 0) {
      updateLevel.value = 'success'
      updateMessage.value = t('about.newVersion', { version: latest })
    } else {
      updateLevel.value = 'info'
      updateMessage.value = t('about.upToDate')
      updateUrl.value = ''
    }
  } catch (err) {
    console.error('[checkUpdate] failed:', err)
    updateLevel.value = 'error'
    // 把具体错误也展示出来便于排查
    const detail = (err && err.message) ? err.message : String(err)
    updateMessage.value = t('about.checkFailed') + '：' + detail
  } finally {
    updateChecking.value = false
  }
}

const openUpdateUrl = () => {
  if (updateUrl.value && window.electron && window.electron.shell) {
    window.electron.shell.openExternal(updateUrl.value)
  }
}

const showDialog = () => {
  showAboutDialog.value = true
  // 重置每次打开的检查状态
  updateMessage.value = ''
  updateUrl.value = ''
  updateLevel.value = ''
  bus.emit('editor-blur')
}

onMounted(() => {
  bus.on('aboutDialog', showDialog)
})

onBeforeUnmount(() => {
  bus.off('aboutDialog', showDialog)
})
</script>

<style>
.about-dialog el-row,
.about-dialog el-col {
  display: block;
}

.about-dialog img.logo {
  width: 80px;
  height: 80px;
  display: inherit;
  margin: 0 auto;
}

.about-dialog .title,
.about-dialog .text {
  min-height: 32px;
  text-align: center;
}

.about-dialog .title {
  color: var(--floatFontColor);
}

.about-dialog .text {
  color: var(--floatFontColor);
}

.about-dialog .update-row {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.about-dialog .update-btn {
  padding: 6px 18px;
  border: 1px solid var(--themeColor);
  border-radius: 6px;
  background: transparent;
  color: var(--themeColor);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.about-dialog .update-btn:hover:not(:disabled) {
  background: var(--themeColor);
  color: #fff;
}
.about-dialog .update-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.about-dialog .update-message {
  font-size: 12.5px;
  color: var(--floatFontColor);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.about-dialog .update-message.success {
  color: var(--themeColor);
  font-weight: 500;
}
.about-dialog .update-message.error {
  color: #e57373;
}
.about-dialog .update-link {
  color: var(--themeColor);
  text-decoration: underline;
  cursor: pointer;
}
</style>
