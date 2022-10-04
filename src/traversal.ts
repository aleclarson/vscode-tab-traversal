export type CursorPosition = [number, number]
export type TextDocument = {
  lineCount: number
  lineAt(lineNumber: number): { text: string } | undefined
}

export function jumpBackward(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number
): CursorPosition {
  // nextWord is a recursive function and this is an edge case that it can't handle
  if (cursorIndex === 0) {
    const prevLineLength = getLineLength(text, lineNumber - 1) - 1
    return findPrevWord(text, lineNumber - 1, prevLineLength)
  }
  return findPrevWord(text, lineNumber, cursorIndex - 1)
}

export function jumpForward(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number
): CursorPosition {
  // nextWord is a recursive function and this is an edge case that it can't handle
  if (isEndOfLine(lineNumber, cursorIndex, text)) {
    return findNextWord(text, lineNumber + 1, 0)
  }
  return findNextWord(text, lineNumber, cursorIndex + 1)
}

const boundaryPattern = /[\)\]>}"']/
const wordPattern = /^[a-z0-9]+$/i

function findNextWord(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number,
  stopFlag?: boolean
): CursorPosition {
  let lastLine = text.lineCount - 1
  if (lineNumber > lastLine) {
    cursorIndex = getLineLength(text, lastLine)
    return [lastLine, cursorIndex]
  }

  if (isEndOfLine(lineNumber, cursorIndex, text)) {
    // stop at end of line
    return [lineNumber, cursorIndex]
  }

  let character = getCharacter(text, lineNumber, cursorIndex)

  if (character.match(wordPattern)) {
    return findNextWord(text, lineNumber, cursorIndex + 1, true)
  }

  if (stopFlag || character.match(boundaryPattern)) {
    return [lineNumber, cursorIndex]
  }

  return findNextWord(text, lineNumber, cursorIndex + 1)
}

function findPrevWord(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number,
  stopFlag?: boolean
): CursorPosition {
  if (lineNumber < 0) {
    return [0, 0]
  }

  if (cursorIndex === 0) {
    // stop at beginning
    return [lineNumber, cursorIndex]
  }

  let character = getCharacter(text, lineNumber, cursorIndex)

  if (character.match(boundaryPattern)) {
    return [lineNumber, cursorIndex]
  }
  if (!character.match(wordPattern)) {
    return findPrevWord(text, lineNumber, cursorIndex - 1, true)
  }

  if (stopFlag) {
    return [lineNumber, cursorIndex + 1]
  }

  return findPrevWord(text, lineNumber, cursorIndex - 1)
}

function getCharacter(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number
) {
  let line = getLine(text, lineNumber).text
  let character = line[cursorIndex]
  if (cursorIndex > line.length) {
    throw new Error('cursorIndex out of range: ' + cursorIndex)
  }
  return character
}

function getLine(text: TextDocument, lineNumber: number) {
  let line = text.lineAt(lineNumber)
  if (!line) {
    throw new Error('line not found')
  }
  return line
}

function getLineLength(text: TextDocument, lineNumber: number) {
  let line = getLine(text, lineNumber)
  return line.text.length
}

function isEndOfLine(
  lineNumber: number,
  cursorIndex: number,
  text: TextDocument
) {
  return cursorIndex === getLine(text, lineNumber).text.length
}
