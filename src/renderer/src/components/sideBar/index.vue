<template>
  <div
    v-show="showSideBar"
    ref="sideBar"
    class="side-bar"
  >
    <!-- 图标条：始终可见，45px 宽 -->
    <div class="left-column">
      <ul>
        <li
          v-for="(c, index) of sideBarIcons"
          :key="index"
          :class="{ active: c.id === rightColumn }"
          @click="handleLeftIconClick(c.id)"
        >
          <component :is="c.icon" />
        </li>
      </ul>
      <ul class="bottom">
        <li
          v-for="(c, index) of sideBarBottomIcons"
          :key="index"
          @click="handleLeftBottomClick(c.id)"
        >
          <component :is="c.icon" />
        </li>
      </ul>
    </div>

    <!-- 浮动面板：叠加在编辑区上方 -->
    <div
      class="right-column"
      :class="{ open: !!rightColumn }"
      :style="rightColumn ? { width: `${sideBarViewWidth}px` } : {}"
    >
      <tree
        v-if="rightColumn === 'files'"
        :project-tree="projectTree"
        :opened-files="openedFiles"
        :tabs="tabs"
      />
      <side-bar-search v-else-if="rightColumn === 'search'" />
      <toc v-else-if="rightColumn === 'toc'" />
      <!-- 拖拽改宽（在面板内右边缘）-->
      <div
        v-show="rightColumn"
        ref="dragBar"
        class="drag-bar"
      />
    </div>

    <!-- 点击编辑区关闭面板（搜索时不关）-->
    <div
      v-if="rightColumn && rightColumn !== 'search'"
      class="panel-overlay"
      @click="closePanelByOverlay"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useLayoutStore } from '@/store/layout'
import { useProjectStore } from '@/store/project'
import { useEditorStore } from '@/store/editor'

import { sideBarIcons, sideBarBottomIcons } from './help'
import Tree from './tree.vue'
import SideBarSearch from './search.vue'
import Toc from './toc.vue'
import { storeToRefs } from 'pinia'

const layoutStore = useLayoutStore()
const projectStore = useProjectStore()
const editorStore = useEditorStore()

const sideBar = ref(null)
const dragBar = ref(null)

const openedFiles = ref([])
const sideBarViewWidth = ref(280)

const { rightColumn, showSideBar, sideBarWidth } = storeToRefs(layoutStore)

const { projectTree } = storeToRefs(projectStore)
const { tabs } = storeToRefs(editorStore)

// 浮动模式下侧边栏本体始终只占图标条宽度
const finalSideBarWidth = computed(() => {
  return showSideBar.value ? 45 : 0
})

onMounted(() => {
  nextTick(() => {
    const dragBarEl = dragBar.value
    let startX = 0
    let currentSideBarWidth = +sideBarWidth.value
    let startWidth = currentSideBarWidth

    sideBarViewWidth.value = currentSideBarWidth

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler, false)
      document.removeEventListener('mouseup', mouseUpHandler, false)
      layoutStore.CHANGE_SIDE_BAR_WIDTH(currentSideBarWidth < 220 ? 220 : currentSideBarWidth)
    }

    const mouseMoveHandler = (event) => {
      const offset = event.clientX - startX
      currentSideBarWidth = startWidth + offset
      sideBarViewWidth.value = currentSideBarWidth
    }

    const mouseDownHandler = (event) => {
      startX = event.clientX
      startWidth = +sideBarWidth.value
      document.addEventListener('mousemove', mouseMoveHandler, false)
      document.addEventListener('mouseup', mouseUpHandler, false)
    }

    dragBarEl.addEventListener('mousedown', mouseDownHandler, false)
  })
})

const handleLeftIconClick = (name) => {
  if (rightColumn.value === name) {
    layoutStore.SET_LAYOUT({ rightColumn: '' })
  } else {
    layoutStore.SET_LAYOUT({ rightColumn: name })
    sideBarViewWidth.value = +sideBarWidth.value || 280
  }
}

const closePanelByOverlay = () => {
  layoutStore.SET_LAYOUT({ rightColumn: '' })
}

const handleLeftBottomClick = (name) => {
  if (name === 'settings') {
    projectStore.OPEN_SETTING_WINDOW()
  }
}
</script>

<style scoped>
/* 侧边栏外壳：仅占图标条宽度，面板浮动叠加 */
.side-bar {
  display: flex;
  flex-shrink: 0;
  flex-grow: 0;
  width: 45px;
  height: 100%;
  position: relative;
  color: var(--sideBarColor);
  user-select: none;
  background: var(--sideBarBgColor);
  border-right: 1px solid var(--itemBgColor);
  z-index: 50;
}

.side-bar .left-column svg {
  fill: var(--iconColor);
}

/* 图标条：标题栏移到顶层后无需大 padding-top，8px 留点上边距即可 */
.left-column {
  height: 100%;
  width: 45px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-top: 8px;
  box-sizing: border-box;
}

.left-column > ul {
  opacity: 1;
}

.left-column ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

.left-column ul > li {
  width: 45px;
  height: 45px;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  cursor: pointer;
}

.left-column ul > li > svg {
  width: 18px;
  height: 18px;
  fill: var(--sideBarIconColor);
  opacity: 1;
  transition: transform 0.25s ease-in-out;
}

.left-column ul > li.active > svg {
  fill: var(--themeColor);
}

.side-bar:hover .left-column ul li svg {
  opacity: 1;
}

/* 浮动面板：绝对定位，从图标条右侧展开 */
.right-column {
  position: absolute;
  left: 45px;
  top: 0;
  bottom: 0;
  width: 0;
  overflow: hidden;
  background: var(--sideBarBgColor);
  border-right: 1px solid var(--itemBgColor);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.25);
  z-index: 100;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.right-column.open {
  /* width 由 style 绑定动态设置 */
  min-width: 220px;
}

/* 拖拽条（在浮动面板右边缘）*/
.drag-bar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 101;
}

.drag-bar:hover {
  background: var(--iconColor);
  opacity: 0.4;
}

/* 点击编辑区关闭浮动面板的透明遮罩 */
.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  cursor: default;
}
</style>
