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

  let lastKnownTextEditor = null as vscode.TextEditor | null
  let lastKnownLineNumber = -1

  context.subscriptions.push(
    vscode.commands.registerCommand('jumpForward', () => {
      const selections = getSelections()
      if (selections.length > 1) {
        vscode.commands.executeCommand('editor.action.indentLines')
      } else {
        move(jumpForward)
      }
    }),
    vscode.commands.registerCommand('jumpBackward', () => {
      const selections = getSelections()
      if (selections.length > 1) {
        vscode.commands.executeCommand('editor.action.outdentLines')
      } else {
        move(jumpBackward)
      }
    }),
    vscode.window.onDidChangeTextEditorSelection(event => {
      const { selections, textEditor } = event
      const lineNumber = selections[0].start.line
      if (
        lastKnownLineNumber === lineNumber &&
        lastKnownTextEditor === textEditor
      ) {
        return
      }
      lastKnownLineNumber = lineNumber
      lastKnownTextEditor = textEditor
      if (
        selections.length == 1 &&
        selections[0].isEmpty &&
        textEditor === vscode.window.activeTextEditor
      ) {
        const line = textEditor.document.lineAt(lineNumber)
        if (line.firstNonWhitespaceCharacterIndex == line.text.length) {
          vscode.commands.executeCommand('editor.action.reindentselectedlines')
        }
      }
    })
  )
}

export function deactivate() {}

function getSelections() {
  return vscode.window.activeTextEditor?.selections || []
}
