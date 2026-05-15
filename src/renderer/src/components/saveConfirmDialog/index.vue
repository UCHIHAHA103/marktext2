<template>
  <teleport to="body">
    <transition name="save-dialog-fade">
      <div
        v-if="visible"
        class="save-confirm-overlay"
        @click.self="handleCancel"
      >
        <div class="save-confirm-dialog">
          <div class="save-confirm-header">
            <span class="save-confirm-icon">💾</span>
            <span class="save-confirm-title">保存修改</span>
          </div>
          <div class="save-confirm-body">
            <p class="save-confirm-desc">更改将丢失</p>
            <p v-if="filenames.length" class="save-confirm-files">
              {{ filenames.join('，') }}
            </p>
          </div>
          <div class="save-confirm-actions">
            <button class="save-btn-secondary" @click="handleDiscard">放弃保存</button>
            <button class="save-btn-cancel" @click="handleCancel">取消</button>
            <button class="save-btn-primary" @click="handleSave">保存</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import bus from '@/bus'

const visible = ref(false)
const filenames = ref([])
let currentReqId = null

function handleSave() {
  respond(0)
}
function handleDiscard() {
  respond(1)
}
function handleCancel() {
  respond(2)
}

function respond(answer) {
  if (!currentReqId) return
  window.electron.ipcRenderer.send(`mt::save-dialog-response-${currentReqId}`, answer)
  currentReqId = null
  visible.value = false
}

function onShowDialog({ files, reqId }) {
  filenames.value = files || []
  currentReqId = reqId
  visible.value = true
}

onMounted(() => {
  bus.on('show-save-dialog', onShowDialog)
})

onBeforeUnmount(() => {
  bus.off('show-save-dialog', onShowDialog)
})
</script>

<style scoped>
.save-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-confirm-dialog {
  background: var(--floatBgColor, var(--editorBgColor, #fff));
  color: var(--editorColor, #333);
  border: 1px solid var(--editorBorderColor, #ddd);
  border-radius: 8px;
  padding: 24px 28px 20px;
  width: 340px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.save-confirm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.save-confirm-icon {
  font-size: 20px;
  line-height: 1;
}

.save-confirm-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--editorColor, #333);
}

.save-confirm-body {
  margin-bottom: 20px;
}

.save-confirm-desc {
  font-size: 13px;
  color: var(--editorColor60, var(--editorColor, #555));
  margin: 0 0 4px;
}

.save-confirm-files {
  font-size: 12px;
  color: var(--editorColor50, #888);
  margin: 4px 0 0;
  word-break: break-all;
}

.save-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.save-confirm-actions button {
  height: 30px;
  padding: 0 14px;
  border-radius: 5px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--editorBorderColor, #ddd);
  transition: opacity 0.15s, background 0.15s;
  outline: none;
}

.save-btn-secondary {
  background: transparent;
  color: var(--editorColor, #333);
}
.save-btn-secondary:hover {
  background: var(--floatHoverBg, rgba(0,0,0,0.06));
}

.save-btn-cancel {
  background: transparent;
  color: var(--editorColor, #333);
}
.save-btn-cancel:hover {
  background: var(--floatHoverBg, rgba(0,0,0,0.06));
}

.save-btn-primary {
  background: var(--themeColor, #4A90E2);
  color: #fff;
  border-color: var(--themeColor, #4A90E2);
  font-weight: 500;
}
.save-btn-primary:hover {
  opacity: 0.88;
}

.save-dialog-fade-enter-active,
.save-dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}
.save-dialog-fade-enter-from,
.save-dialog-fade-leave-to {
  opacity: 0;
}
</style>
