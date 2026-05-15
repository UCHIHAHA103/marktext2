import { loadEditCommands } from './edit'
import { loadFileCommands } from './file'
import { loadFormatCommands } from './format'
import { loadMarktextCommands } from './marktext'
import { loadParagraphCommands } from './paragraph'
import { loadViewCommands } from './view'
import { loadWindowCommands } from './window'

export const loadMenuCommands = (commandManager, preferences) => {
  loadEditCommands(commandManager)
  loadFileCommands(commandManager, preferences) // #3883: 传入 preferences 用于 confirmOnExit
  loadFormatCommands(commandManager)
  loadMarktextCommands(commandManager)
  loadParagraphCommands(commandManager)
  loadViewCommands(commandManager)
  loadWindowCommands(commandManager)
}
