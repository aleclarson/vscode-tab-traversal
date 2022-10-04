export type CursorPosition = [number, number]
export type TextDocument = {
  lineCount: number
  lineAt(lineNumber: number): { text: string }
}

export function jumpBackward(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number
): CursorPosition {
  let word
  // nextWord is a recursive function and this is an edge case that it can't handle
  if (cursorIndex === 0) {
    // console.log('started on start of line')
    let previousLineLength = getLineLength(lineNumber - 1, text) - 1
    word = previousWord(lineNumber - 1, previousLineLength, false, text)
  } else {
    word = previousWord(lineNumber, cursorIndex - 1, false, text)
  }
  return [word.lineNumber, word.cursorIndex]
}

export function jumpForward(
  text: TextDocument,
  lineNumber: number,
  cursorIndex: number
): CursorPosition {
  let word
  // nextWord is a recursive function and this is an edge case that it can't handle
  if (isEndOfLine(lineNumber, cursorIndex, text)) {
    // console.log('started on end of line')
    word = nextWord(lineNumber + 1, 0, false, text)
  } else {
    word = nextWord(lineNumber, cursorIndex + 1, false, text)
  }
  return [word.lineNumber, word.cursorIndex]
}

function getLine(lineNumber: number, text: TextDocument) {
  let line = text.lineAt(lineNumber)
  if (!line) {
    throw new Error('line not found')
  }
  return line
}

// Go to the next end of word:
function getCharacter(
  lineNumber: number,
  cursorIndex: number,
  text: TextDocument
) {
  let line = getLine(lineNumber, text).text
  let character = line[cursorIndex]
  if (cursorIndex > line.length) {
    throw new Error('cursorIndex out of range: ' + cursorIndex)
  }
  return character
}

function isEndOfLine(
  lineNumber: number,
  cursorIndex: number,
  text: TextDocument
) {
  return cursorIndex === getLine(lineNumber, text).text.length
}

function getLineLength(lineNumber: number, text: TextDocument) {
  let line = getLine(lineNumber, text)
  return line.text.length
}

function nextWord(
  lineNumber: number,
  cursorIndex: number,
  stopFlag: boolean,
  text: TextDocument
): { lineNumber: number; cursorIndex: number } {
  // console.log('lineNumber', lineNumber)
  // console.log('cursorIndex', cursorIndex)
  // console.log('lineLength', getLineLength(lineNumber, text))

  let lastLine = text.lineCount - 1
  if (lineNumber > lastLine) {
    cursorIndex = getLineLength(lastLine, text)
    return {
      lineNumber: lastLine,
      cursorIndex: cursorIndex,
    }
  }

  if (isEndOfLine(lineNumber, cursorIndex, text)) {
    // stop at end of line
    return { lineNumber: lineNumber, cursorIndex: cursorIndex }
  }

  let character = getCharacter(lineNumber, cursorIndex, text)
  // console.log('character', character)

  if (character.match(/^[a-z0-9]+$/i)) {
    return nextWord(lineNumber, cursorIndex + 1, true, text)
  }

  if (stopFlag || character.match(/[\)\]>}"']/)) {
    return { lineNumber, cursorIndex }
  }

  return nextWord(lineNumber, cursorIndex + 1, false, text)
}

function previousWord(
  lineNumber: number,
  cursorIndex: number,
  stopFlag: boolean,
  text: TextDocument
): { lineNumber: number; cursorIndex: number } {
  // console.log('lineNumber', lineNumber)
  // console.log('cursorIndex', cursorIndex)
  // console.log('lineLength', getLineLength(lineNumber, text))

  if (lineNumber < 0) {
    cursorIndex = getLineLength(0, text)
    return {
      lineNumber: 0,
      cursorIndex: 0,
    }
  }

  if (cursorIndex === 0) {
    // stop at beginning
    return { lineNumber: lineNumber, cursorIndex: cursorIndex }
  }

  let character = getCharacter(lineNumber, cursorIndex, text)
  // console.log('character', character)
  if (character.match(/[\)\]>}"']/)) {
    return { lineNumber, cursorIndex }
  }
  if (!character.match(/^[a-z0-9]+$/i)) {
    return previousWord(lineNumber, cursorIndex - 1, true, text)
  }

  if (stopFlag) {
    cursorIndex++
    return { lineNumber, cursorIndex }
  }

  return previousWord(lineNumber, cursorIndex - 1, false, text)
}
