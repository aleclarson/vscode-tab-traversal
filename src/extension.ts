import * as vscode from 'vscode'
import { jumpBackward, jumpForward } from './traversal'

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Tab Traversal')

  let lastIndent = { line: -1, document: null as vscode.TextDocument | null }

  const move = (
    from: vscode.Position,
    to: typeof jumpBackward | typeof jumpForward
  ) => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      throw new Error('No active editor')
    }

    const jump = () => {
      const [line, column] = to(editor.document, from.line, from.character)
      editor.selection = new vscode.Selection(line, column, line, column)
      lastIndent.line = -1
    }

    if (to === jumpBackward) {
      // Nothing special for jumping backward.
      return jump()
    }

    const currentLine = editor.document.lineAt(from.line)
    if (!currentLine.isEmptyOrWhitespace) {
      output.appendLine('Current line is not empty. Jumping forward.')
      // Always jump on non-empty lines.
      return jump()
    }

    if (
      lastIndent.line === from.line &&
      lastIndent.document === editor.document
    ) {
      output.appendLine('Current line is empty, but indented. Jumping forward.')
      // Already indented this empty line. Time to jump forward.
      return jump()
    }

    lastIndent.line = from.line
    lastIndent.document = editor.document

    output.appendLine('Indenting current line.')
    const oldText = currentLine.text

    return vscode.commands
      .executeCommand('lineBreakInsert')
      .then(() =>
        editor.edit(
          edit => edit.delete(new vscode.Range(from.line, 0, from.line + 1, 0)),
          { undoStopBefore: false, undoStopAfter: false }
        )
      )
      .then(() => {
        const newText = editor.document.lineAt(from.line).text
        if (newText === oldText) {
          output.appendLine('Indent command did nothing. Jumping forward.')
          return jump()
        }
        const cursor = [from.line, newText.length] as const
        editor.selection = new vscode.Selection(...cursor, ...cursor)
      })
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('jumpForward', () => {
      const selections = getSelections()
      if (selections.length > 1) {
        vscode.commands.executeCommand('editor.action.indentLines')
      } else {
        move(selections[0].end, jumpForward)
      }
    }),
    vscode.commands.registerCommand('jumpBackward', () => {
      const selections = getSelections()

      if (selections.length > 1) {
        vscode.commands.executeCommand('editor.action.outdentLines')
      } else {
        move(selections[0].start, jumpBackward)
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(e => {
      lastIndent.line = -1
    }),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (lastIndent.line >= 0 && lastIndent.document === e.document) {
        const changed = e.contentChanges.some(
          change =>
            change.range.start.line <= lastIndent.line &&
            change.range.end.line >= lastIndent.line
        )
        if (changed) {
          lastIndent.line = -1
        }
      }
    })
  )

  output.appendLine('Waiting for commands...')
}

export function deactivate() {}

function getSelections() {
  return vscode.window.activeTextEditor?.selections || []
}
