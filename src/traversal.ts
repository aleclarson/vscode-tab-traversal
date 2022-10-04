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
  let pos: CursorPosition = [lineNumber, cursorIndex]
  while (true) {
    if (cursorIndex === 0) {
      lineNumber--
      cursorIndex = getLineLength(text, lineNumber)
    }

    let prevPos = findPrevWord(text, lineNumber, cursorIndex)
    if (isEmptyBetween(text, prevPos, pos)) {
      pos = prevPos
      continue
    }

    // Skip past any stops where whitespace between it and the stop
    // before it is all that exists.
    while (true) {
      pos = prevPos
      prevPos = findPrevWord(text, ...pos)
      if (!isEmptyBetween(text, prevPos, pos)) {
        break
      }
    }

    return pos
  }
}

function isEmptyBetween(
  text: TextDocument,
  [prevLineNumber, prevCursorIndex]: CursorPosition,
  [lineNumber, cursorIndex]: CursorPosition
) {
  if (prevLineNumber === lineNumber && prevCursorIndex === cursorIndex) {
    // Invalid comparison: Same position.
    return false
  }
  if (prevCursorIndex < 0) {
    return cursorIndex === 0
  }
  let textBetween = ''
  for (let i = prevLineNumber; i <= lineNumber; i++) {
    const line = getLine(text, i).text
    textBetween += line.slice(
      i === prevLineNumber ? prevCursorIndex : 0,
      i === lineNumber ? cursorIndex : undefined
    )
    if (i !== lineNumber) {
      textBetween += '\n'
    }
  }
  return !!textBetween.length && !textBetween.trim().length
}

export function jumpForward(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number
): CursorPosition {
  while (true) {
    if (isEndOfLine(lineNumber, cursorIndex, text)) {
      lineNumber++
      cursorIndex = -1
    }
    const nextPos = findNextWord(text, lineNumber, cursorIndex + 1)
    if (isEmptyBetween(text, [lineNumber, cursorIndex], nextPos)) {
      cursorIndex = nextPos[1]
      continue
    }
    return nextPos
  }
}

const boundaryPattern = /[\)\]}]/
const wordPattern = /^[a-z0-9]+$/i

function isBoundary(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number
) {
  let character = getCharacter(text, lineNumber, cursorIndex)
  if (boundaryPattern.test(character)) {
    return true
  }
  // Avoid stopping before the angle bracket in the symbol representing
  // an arrow function.
  if (character == '>') {
    let prevCharacter = getCharacter(text, lineNumber, cursorIndex - 1)
    return prevCharacter !== '='
  }
  // Stop before a closing quote mark.
  return (
    /['"`]/.test(character) &&
    hasOpeningQuote(text, lineNumber, cursorIndex, character)
  )
}

function hasOpeningQuote(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number,
  quote: string
) {
  let line = getLine(text, lineNumber).text
  let quoteCount = 0
  for (let i = 0; i < cursorIndex; i++) {
    if (line[i] === quote) {
      quoteCount++
    }
  }
  return quoteCount % 2 === 1
}

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
  if (wordPattern.test(character)) {
    return findNextWord(text, lineNumber, cursorIndex + 1, true)
  }

  if (stopFlag || isBoundary(text, lineNumber, cursorIndex)) {
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

  cursorIndex -= 1
  if (cursorIndex <= 0) {
    if (lineNumber > 0) {
      return [lineNumber - 1, getLineLength(text, lineNumber - 1)]
    }
    return [lineNumber, 0]
  }

  if (isBoundary(text, lineNumber, cursorIndex)) {
    return [lineNumber, cursorIndex]
  }

  let character = getCharacter(text, lineNumber, cursorIndex)
  if (!wordPattern.test(character)) {
    return findPrevWord(text, lineNumber, cursorIndex, true)
  }

  if (stopFlag) {
    return [lineNumber, cursorIndex + 1]
  }

  return findPrevWord(text, lineNumber, cursorIndex)
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
