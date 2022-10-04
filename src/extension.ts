import * as vscode from 'vscode'
import { jumpBackward, jumpForward } from './traversal'

export function activate(context: vscode.ExtensionContext) {
  const move = (getPosition: typeof jumpBackward | typeof jumpForward) => {
    let editor = vscode.window.activeTextEditor
    if (!editor) {
      throw new Error('No active editor')
    }
    let text = editor.document
    if (!text) {
      throw new Error('No active document')
    }
    const [line, column] = getPosition(
      text,
      editor.selection.active.line,
      editor.selection.active.character
    )
    editor.selection = new vscode.Selection(line, column, line, column)
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('jumpForward', () => {
      move(jumpForward)
    }),
    vscode.commands.registerCommand('jumpBackward', () => {
      move(jumpBackward)
    })
  )
}

export function deactivate() {}
