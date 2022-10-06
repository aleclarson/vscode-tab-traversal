import { Mutex } from 'async-mutex'
import * as vscode from 'vscode'
import { jumpBackward, jumpForward } from './traversal'

const lock = new Mutex()

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
  let lastKnownLineText = ''

  const output = vscode.window.createOutputChannel('Tab Traversal')

  context.subscriptions.push(
    output,
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
    vscode.workspace.onDidSaveTextDocument(document => {
      if (lastKnownTextEditor?.document === document) {
        lastKnownTextEditor = null
        lastKnownLineNumber = -1
        lastKnownLineText = ''
      }
    }),
    vscode.window.onDidChangeTextEditorSelection(async event => {
      const unlock = await lock.acquire()
      try {
        const { selections, textEditor } = event
        const lineNumber = selections[0].active.line

        if (textEditor === vscode.window.activeTextEditor)
          output.appendLine(
            `onDidChangeTextEditorSelection: ${JSON.stringify({
              lastKnownTextEditor: lastKnownTextEditor?.document.fileName,
              lastKnownLineNumber,
              textEditor: textEditor.document.fileName,
              lineNumber,
            })}`
          )

        if (
          textEditor === vscode.window.activeTextEditor &&
          (lastKnownTextEditor !== textEditor ||
            lastKnownLineNumber !== lineNumber)
        ) {
          const revertedLine =
            lastKnownTextEditor &&
            replaceLineIfOnlyWhitespace(
              lastKnownTextEditor,
              lastKnownLineNumber,
              lastKnownLineText
            )

          if (revertedLine) {
            output.appendLine(`Reverting line ${lastKnownLineNumber}`)
          }

          const line = await reindentLineIfAllowed(
            textEditor,
            lineNumber,
            output
          )

          lastKnownLineNumber = line ? lineNumber : -1
          lastKnownTextEditor = line ? textEditor : null
          lastKnownLineText = line ? line.text : ''
        }
      } finally {
        unlock()
      }
    })
  )
}

export function deactivate() {
  lock.cancel()
}

async function reindentLineIfAllowed(
  textEditor: vscode.TextEditor,
  lineNumber: number,
  output: vscode.OutputChannel
) {
  const { selections } = textEditor
  if (
    lineNumber > 0 &&
    selections.length === 1 &&
    selections[0].isEmpty &&
    !textEditor.document.fileName.includes('/node_modules/')
  ) {
    const line = textEditor.document.lineAt(lineNumber)
    if (line.isEmptyOrWhitespace) {
      const oldText = line.text

      // If the line before this one is empty, we have to detect the
      // indentation manually, because of this bug:
      // https://github.com/microsoft/vscode/issues/121214
      const hasEmptyLineBefore = textEditor.document.lineAt(
        lineNumber - 1
      ).isEmptyOrWhitespace

      if (hasEmptyLineBefore) {
        // Find the first non-empty line before this one.
        let i = lineNumber - 1
        while (--i >= 0) {
          const lineBefore = textEditor.document.lineAt(i)
          if (!lineBefore.isEmptyOrWhitespace) {
            break
          }
          if (i === 0) {
            return
          }
        }

        // Update the editor selection to include this non-empty line and the reindented line.
        textEditor.selection = new vscode.Selection(
          i + 1,
          0,
          lineNumber,
          line.text.length
        )
      }

      await vscode.commands.executeCommand(
        'editor.action.reindentselectedlines'
      )
      if (hasEmptyLineBefore) {
        // Restore the original selection.
        textEditor.selection = selections[0]
      }
      // Extract the result of "Reindent selected lines" action.
      const newText = textEditor.document.lineAt(lineNumber).text
      if (oldText !== newText) {
        output.appendLine(`Reindenting line ${lineNumber}`)
        output.appendLine(`${JSON.stringify({ newText, oldText })}`)
        await vscode.commands.executeCommand('undo')
        replaceLineIfOnlyWhitespace(textEditor, lineNumber, newText)
      }

      return line
    }
  }
}

function getSelections() {
  return vscode.window.activeTextEditor?.selections || []
}

function replaceLineIfOnlyWhitespace(
  textEditor: vscode.TextEditor,
  lineNumber: number,
  newText: string
) {
  const line = textEditor.document.lineAt(lineNumber)
  if (line.isEmptyOrWhitespace) {
    textEditor.edit(
      editor =>
        line.text.length > 0
          ? editor.replace(
              new vscode.Range(lineNumber, 0, lineNumber, line.text.length),
              newText
            )
          : editor.insert(new vscode.Position(lineNumber, 0), newText),
      {
        undoStopBefore: false,
        undoStopAfter: false,
      }
    )
    return line
  }
}
