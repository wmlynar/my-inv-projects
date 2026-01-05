const fs = require('fs');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

function stripJsonComments(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        output += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      output += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringChar = ch;
      output += ch;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    output += ch;
  }

  return output;
}

function stripTrailingCommas(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escape = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      output += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringChar = ch;
      output += ch;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) {
        j += 1;
      }
      if (input[j] === '}' || input[j] === ']') {
        continue;
      }
    }

    output += ch;
  }

  return output;
}

function readJson5(filePath) {
  const raw = readFileSafe(filePath);
  if (!raw) {
    throw new Error(`missing file: ${filePath}`);
  }
  const withoutComments = stripJsonComments(raw);
  const clean = stripTrailingCommas(withoutComments);
  return JSON.parse(clean);
}

module.exports = {
  readJson5,
  readFileSafe
};
