<template>
  <!-- 悬浮模式：占位 0 宽，胶囊+浮层 absolute 浮在编辑区上 -->
  <!-- 固定模式：占位 = 面板宽度，整列固定布局 -->
  <div
    v-show="showSideBar"
    class="mt-sidebar-host"
    :class="{ pinned: sideBarPinned, floating: !sideBarPinned }"
    :style="sideBarPinned ? { width: panelWidth + 'px' } : null"
  >
    <!-- 固定模式：顶部水平按钮组 + 下方面板 -->
    <div
      v-if="sideBarPinned"
      class="fixed-shell"
    >
      <div class="fixed-tabbar">
        <div
          v-for="c of sideBarIcons"
          :key="c.id"
          class="fixed-tab"
          :class="{ active: c.id === rightColumn }"
          :title="c.name()"
          @click="handleIconClick(c.id)"
        >
          <component :is="c.icon" />
          <span class="fixed-tab-label">{{ c.name() }}</span>
        </div>
        <div
          class="fixed-tab fixed-unlock"
          :title="t('sideBar.icons.unpin')"
          @click="togglePinned"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="5"
              y="11"
              width="14"
              height="10"
              rx="2"
            />
            <path d="M8 11V7a4 4 0 0 1 7.9-1" />
          </svg>
        </div>
      </div>
      <div class="fixed-body">
        <tree
          v-if="rightColumn === 'files'"
          :project-tree="projectTree"
          :opened-files="openedFiles"
          :tabs="tabs"
        />
        <side-bar-search v-else-if="rightColumn === 'search'" />
        <toc v-else-if="rightColumn === 'toc'" />
      </div>
      <div
        ref="dragBar"
        class="drag-bar"
      />
    </div>

    <!-- 悬浮模式：毛玻璃胶囊（始终可见）+ 浮层（按需展开） -->
    <template v-else>
      <div class="float-pills">
        <div
          v-for="c of sideBarIcons"
          :key="c.id"
          class="pill-btn"
          :class="{ active: c.id === rightColumn }"
          :title="c.name()"
          @click="handleIconClick(c.id)"
        >
          <component :is="c.icon" />
        </div>
        <div class="pill-divider" />
        <div
          class="pill-btn"
          :title="t('sideBar.icons.pin')"
          @click="togglePinned"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="5"
              y="11"
              width="14"
              height="10"
              rx="2"
            />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
      </div>

      <div
        class="float-layer"
        :class="{ show: !!rightColumn }"
        :style="{ width: panelWidth + 'px' }"
      >
        <tree
          v-if="rightColumn === 'files'"
          :project-tree="projectTree"
          :opened-files="openedFiles"
          :tabs="tabs"
        />
        <side-bar-search v-else-if="rightColumn === 'search'" />
        <toc v-else-if="rightColumn === 'toc'" />
        <div
          ref="dragBar"
          class="drag-bar"
        />
      </div>

      <!-- 点击编辑区关闭浮层（搜索时不关）-->
      <div
        v-if="rightColumn && rightColumn !== 'search'"
        class="float-overlay"
        @click="closePanelByOverlay"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useLayoutStore } from '@/store/layout'
import { useProjectStore } from '@/store/project'
import { useEditorStore } from '@/store/editor'
import { useI18n } from 'vue-i18n'

import { sideBarIcons } from './help'
import Tree from './tree.vue'
import SideBarSearch from './search.vue'
import Toc from './toc.vue'
import { storeToRefs } from 'pinia'

const { t } = useI18n()

const layoutStore = useLayoutStore()
const projectStore = useProjectStore()
const editorStore = useEditorStore()

const dragBar = ref(null)
const openedFiles = ref([])
const panelWidth = ref(280)

const { rightColumn, showSideBar, sideBarWidth, sideBarPinned } = storeToRefs(layoutStore)
const { projectTree } = storeToRefs(projectStore)
const { tabs } = storeToRefs(editorStore)

// 初始宽度从 store 取
panelWidth.value = +sideBarWidth.value || 280

onMounted(() => {
  nextTick(() => {
    bindDragBar()
  })
})

const bindDragBar = () => {
  const dragBarEl = dragBar.value
  if (!dragBarEl) return
  let startX = 0
  let startWidth = panelWidth.value

  const onMove = (event) => {
    const offset = event.clientX - startX
    panelWidth.value = Math.max(220, startWidth + offset)
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove, false)
    document.removeEventListener('mouseup', onUp, false)
    layoutStore.CHANGE_SIDE_BAR_WIDTH(panelWidth.value)
  }
  dragBarEl.addEventListener('mousedown', (event) => {
    startX = event.clientX
    startWidth = panelWidth.value
    document.addEventListener('mousemove', onMove, false)
    document.addEventListener('mouseup', onUp, false)
  }, false)
}

const handleIconClick = (name) => {
  if (rightColumn.value === name) {
    // 悬浮模式：再次点击关闭浮层；固定模式：保持打开（避免空白）
    if (!sideBarPinned.value) {
      layoutStore.SET_LAYOUT({ rightColumn: '' })
    }
  } else {
    layoutStore.SET_LAYOUT({ rightColumn: name })
  }
}

const closePanelByOverlay = () => {
  layoutStore.SET_LAYOUT({ rightColumn: '' })
}

const togglePinned = () => {
  layoutStore.TOGGLE_SIDE_BAR_PINNED()
  // 切到固定模式且无面板时，默认展开目录
  if (sideBarPinned.value && !rightColumn.value) {
    layoutStore.SET_LAYOUT({ rightColumn: 'toc' })
  }
}
</script>

<style scoped>
/* ════════════════════════════════════════════
   外壳：悬浮模式占位 0 宽（胶囊浮出），固定模式占位 = 面板宽
   ════════════════════════════════════════════ */
.mt-sidebar-host {
  height: 100%;
  flex-shrink: 0;
  user-select: none;
  position: relative;
}
.mt-sidebar-host.floating {
  width: 0;
  overflow: visible;
}

/* ════════════════════════════════════════════
   悬浮模式：胶囊 + 浮层（毛玻璃，浮在编辑区上）
   ════════════════════════════════════════════ */
.float-pills {
  position: absolute;
  top: 52px;
  left: 14px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: var(--sideBarBgColor);
  border: 1px solid var(--itemBgColor);
  border-radius: 11px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.06);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
}

.pill-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgb(100, 106, 115);
  transition: background 0.15s, color 0.15s, transform 0.1s;
}
.pill-btn :deep(svg) {
  width: 16px;
  height: 16px;
  fill: currentColor !important;
}
.pill-btn :deep(svg *) {
  fill: currentColor !important;
}
.pill-btn > svg { /* 内联锁 svg：描边式 */
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
}
.pill-btn:hover {
  background: var(--sideBarItemHoverBgColor);
  color: var(--editorColor);
}
.pill-btn:active {
  transform: scale(0.92);
}
.pill-btn.active {
  background: var(--themeColor);
  color: #fff;
}
.pill-btn.active :deep(svg),
.pill-btn.active :deep(svg *) {
  fill: #fff !important;
}

.pill-divider {
  width: 1px;
  height: 16px;
  background: var(--itemBgColor);
  margin: 0 3px;
}

/* 浮层：飞书风格毛玻璃，浮在编辑区上 */
.float-layer {
  position: absolute;
  top: 96px;
  left: 14px;
  height: calc(100% - 116px);
  z-index: 55;
  background: var(--sideBarBgColor);
  border: 1px solid var(--itemBgColor);
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transform-origin: top left;
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.float-layer.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* 透明遮罩：点击编辑区关闭浮层 */
.float-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 54;
  cursor: default;
}

/* ════════════════════════════════════════════
   固定模式：整栏占据布局宽度，顶部水平按钮 + 下方面板
   ════════════════════════════════════════════ */
.fixed-shell {
  width: 100%;
  height: 100%;
  background: var(--sideBarBgColor);
  border-right: 1px solid var(--itemBgColor);
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
}

.fixed-tabbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--itemBgColor);
  flex-shrink: 0;
}
.fixed-tab {
  flex: 1;
  height: 32px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  color: rgb(100, 106, 115);
  font-size: 12.5px;
  transition: background 0.15s, color 0.15s;
  overflow: hidden;
}
.fixed-tab :deep(svg) {
  width: 15px;
  height: 15px;
  fill: currentColor !important;
  flex-shrink: 0;
}
.fixed-tab :deep(svg *) {
  fill: currentColor !important;
}
.fixed-tab > svg { /* 锁 svg */
  width: 15px;
  height: 15px;
  stroke: currentColor;
  fill: none;
}
.fixed-tab-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fixed-tab:hover {
  background: var(--sideBarItemHoverBgColor);
  color: var(--editorColor);
}
.fixed-tab.active {
  background: var(--themeColor);
  color: #fff;
}
.fixed-tab.active :deep(svg),
.fixed-tab.active :deep(svg *) {
  fill: #fff !important;
}
.fixed-tab.fixed-unlock {
  flex: 0 0 32px;
}

.fixed-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 拖拽条 */
.drag-bar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 5;
}
.drag-bar:hover {
  background: var(--themeColor);
  opacity: 0.4;
}
</style>
