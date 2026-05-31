<template>
  <div
    v-if="currentNotification"
    class="editor-notifications"
    :class="currentNotification.style"
  >
    <div class="msg">
      {{ currentNotification.msg }}
    </div>
    <div class="controls">
      <div>
        <span
          v-if="currentNotification.showConfirm"
          class="inline-button action-button"
          @click.stop="handleClick(true)"
        >
          {{ currentNotification.confirmLabel || t('common.ok') }}
        </span>
        <span
          class="inline-button close-button"
          @click.stop="handleClick(false)"
        >
          <svg
            class="close-icon icon"
            aria-hidden="true"
          >
            <use
              id="default-close-icon"
              xlink:href="#icon-close-small"
            />
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/store/editor'
import { storeToRefs } from 'pinia'
import { t } from '../../i18n'

const editorStore = useEditorStore()

const { currentFile } = storeToRefs(editorStore)

const currentNotification = computed(() => {
  const notifications = currentFile.value.notifications
  if (!notifications || notifications.length === 0) {
    return null
  }
  return notifications[0]
})

const handleClick = (status) => {
  const notifications = currentFile.value.notifications
  if (!notifications || notifications.length === 0) {
    console.error(t('editor.notifications.notificationNotFound'))
    return
  }

  const item = notifications.shift()
  const action = item.action
  if (action) {
    action(status)
  }
}
</script>

<style scoped>
.editor-notifications {
  position: relative;
  display: flex;
  flex-direction: row;
  max-height: 100px;
  margin-top: 4px;
  background: var(--notificationPrimaryBg);
  color: var(--notificationPrimaryColor);
  padding: 8px 10px;
  user-select: none;
  overflow: hidden;
  &.warn {
    background: var(--notificationWarningBg);
    color: var(--notificationWarningColor);
  }
  &.crit {
    background: var(--notificationErrorBg);
    color: var(--notificationErrorColor);
  }
}
.msg {
  font-size: 13px;
  flex: 1;
  /* min-width:0 允许 flex 子项收缩到内容以下，否则长文字会撑爆容器把按钮挤出 overflow:hidden */
  min-width: 0;
}
.controls {
  /* flex-shrink:0 保证按钮区永远不被压缩 */
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  & > div {
    display: flex;
    flex-direction: row;
  }
  & .inline-button:not(:last-child) {
    margin-right: 3px;
  }
  & .inline-button {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 24px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  /* 关闭按钮保持方形 */
  & .close-button {
    width: 24px;
  }
  /* 操作按钮（重载等）自动宽度，有左右内边距 */
  & .action-button {
    padding: 0 10px;
    font-weight: 500;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.15);
  }
  & .inline-button:hover {
    background: rgba(255, 255, 255, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.6);
  }
}
</style>
