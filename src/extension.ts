import { Mutex } from 'async-mutex'
import * as vscode from 'vscode'
import { jumpBackward, jumpForward } from './traversal'

const lock = new Mutex()

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Tab Traversal')

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

  let redents: Redent[] = []

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
      redents = redents.filter(
        reindent => reindent.textEditor.document !== document
      )
    }),
    vscode.window.onDidChangeTextEditorSelection(async event => {
      const unlock = await lock.acquire()
      try {
        const { selections, textEditor } = event
        const lineNumber = selections[0].active.line
        const lastRedent = redents[redents.length - 1]

        if (
          textEditor === vscode.window.activeTextEditor &&
          (!lastRedent ||
            lastRedent.textEditor !== textEditor ||
            lastRedent.lineNumber !== lineNumber)
        ) {
          const reverts = redents.filter(redent =>
            replaceLineIfOnlyWhitespace(
              redent.textEditor,
              redent.lineNumber,
              redent.oldText
            )
          )

          redents.length = 0

          for (const { lineNumber } of reverts) {
            output.appendLine(`Reverting line ${lineNumber}`)
          }

          await redentLineIfAllowed(textEditor, lineNumber, redents, output)
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

type Redent = {
  textEditor: vscode.TextEditor
  lineNumber: number
  oldText: string
}

async function redentLineIfAllowed(
  textEditor: vscode.TextEditor,
  lineNumber: number,
  redents: Redent[],
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
      const hasEmptyLineBefore = textEditor.document.lineAt(
        lineNumber - 1
      ).isEmptyOrWhitespace

      // If the line before this one is empty, we have to detect the
      // indentation manually, because of this bug:
      // https://github.com/microsoft/vscode/issues/121214
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

        while (++i <= lineNumber) {
          redents.push({
            textEditor,
            lineNumber: i,
            oldText: textEditor.document.lineAt(i).text,
          })
        }
      } else {
        redents.push({
          textEditor,
          lineNumber,
          oldText,
        })
      }

      await vscode.commands.executeCommand(
        'editor.action.reindentselectedlines'
      )
      // Extract the result of "Reindent selected lines" action.
      const newText = textEditor.document.lineAt(lineNumber).text
      if (oldText !== newText) {
        output.appendLine(`Redenting line ${lineNumber}`)
        output.appendLine(`${JSON.stringify({ newText, oldText })}`)
        await vscode.commands.executeCommand('undo')
        replaceLineIfOnlyWhitespace(textEditor, lineNumber, newText)
      }
      if (hasEmptyLineBefore) {
        // Restore cursor to the expected line, but move it to the end
        // of the new indentation.
        textEditor.selection = new vscode.Selection(
          lineNumber,
          newText.length,
          lineNumber,
          newText.length
        )
      }
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
