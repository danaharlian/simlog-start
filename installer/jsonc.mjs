// Pure text helpers for JSON with comments (tsconfig.json, components.json) and JS config arrays. No I/O.

/** Parses JSONC: comments and trailing commas allowed. Throws like JSON.parse on anything else. */
export function parseJsonc(text) {
  let out = ''
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '"') {
      let j = i + 1
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1
      out += text.slice(i, j + 1)
      i = j + 1
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 2
      if (i === 1) break
    } else {
      out += c
      i++
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

/**
 * The bracket that closes the one at `open`, skipping strings and comments. `lastCode` is the index of the last
 * real code character before it (so a comma goes there, never inside a trailing comment). Null when not found.
 */
export function matchBracket(text, open) {
  let depth = 0
  let lastCode = open
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++
      lastCode = i
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 1
      if (i === 0) return null
    } else if (c === '[' || c === '(' || c === '{') {
      depth++
      lastCode = i
    } else if (c === ']' || c === ')' || c === '}') {
      depth--
      if (depth === 0) return { close: i, lastCode }
      lastCode = i
    } else if (!/\s/.test(c)) {
      lastCode = i
    }
  }
  return null
}
