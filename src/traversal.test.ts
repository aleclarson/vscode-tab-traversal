import endent from 'endent'
import {
  CursorPosition,
  jumpBackward,
  jumpForward,
  TextDocument,
} from './traversal'

test('arrow function syntax', () => {
  const text = makeTextDocument`
    const foo = (bar: string) => {}
  `
  expect(render(text, jumpForward, [0, 0])).toMatchInlineSnapshot(
    '"⎮const⎮ foo⎮ = (bar⎮: string⎮) =⎮> {⎮}⎮"'
  )
  expect(render(text, jumpBackward, [-1, -1])).toMatchInlineSnapshot(
    '"⎮const⎮ foo⎮ = (bar⎮: string⎮) =⎮> {⎮}⎮"'
  )
})

test('template literal – interpolation syntax', () => {
  const text = makeTextDocument`
    foo(\`bar\${baz}\`)
  `
  expect(render(text, jumpForward, [0, 0])).toMatchInlineSnapshot(
    '"⎮foo⎮(`bar⎮${baz⎮}`⎮)⎮"'
  )
  expect(render(text, jumpBackward, [-1, -1])).toMatchInlineSnapshot(
    '"⎮foo⎮(`bar⎮${baz⎮}`⎮)⎮"'
  )
})

type TestDocument = TextDocument & {
  render: (positions: CursorPosition[]) => string
}

function makeTextDocument(
  strings: TemplateStringsArray,
  ...values: any[]
): TestDocument {
  const text = endent(strings, ...values)
  const lines = text.split('\n')
  return {
    lineAt: lineNumber => ({
      text: lines[lineNumber] || '',
    }),
    lineCount: lines.length,
    render(positions) {
      let result = ''

      positions.sort((a, b) => a[0] - b[0] || a[1] - b[1])
      positions.forEach(([lineNumber, cursorIndex], i) => {
        let [prevLineNumber = 0, prevCursorIndex = 0] = positions[i - 1] || []
        if (lineNumber > prevLineNumber) {
          const prevLine = this.lineAt(prevLineNumber) || { text: '' }
          result += prevLine.text.slice(prevCursorIndex) + '\n'
          if (lineNumber - prevLineNumber > 1) {
            result +=
              lines.slice(prevLineNumber + 1, lineNumber).join('\n') + '\n'
          }
          prevCursorIndex = 0
        }
        const line = this.lineAt(lineNumber)
        result += line.text.slice(prevCursorIndex, cursorIndex)
        result += '⎮'
      })

      const [lastLineNumber, lastCursorIndex] = positions.at(-1)!
      const lastLine = this.lineAt(lastLineNumber)
      result +=
        lastLine.text.slice(lastCursorIndex) +
        lines.slice(lastLineNumber + 1).join('\n')

      return result
    },
  }
}

function move(
  text: TestDocument,
  start: CursorPosition,
  getPosition: typeof jumpForward
) {
  while (start[0] < 0) {
    start[0] += text.lineCount
  }
  if (start[1] < 0) {
    while (start[1] < 0) {
      start[1] += text.lineAt(start[0]).text.length
    }
    start[1]++
  }
  console.log({ start })
  const cursors: CursorPosition[] = [start]
  while (true) {
    const prevCursor = cursors.at(-1)!
    const cursor = getPosition(text, ...prevCursor)
    if (cursor[0] !== prevCursor[0] || cursor[1] !== prevCursor[1]) {
      cursors.push(cursor)
    } else break
  }
  console.log({ cursors })
  return cursors
}

function render(
  text: TestDocument,
  getPosition: typeof jumpForward,
  start: CursorPosition
) {
  const cursors = move(text, start, getPosition)
  return text.render(cursors)
}
