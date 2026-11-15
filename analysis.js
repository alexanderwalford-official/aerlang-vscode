/*
    analysis.js
    Reading an AerLang file the way the editor needs to: is the cursor in a string or a comment,
    which call is it inside, and which functions and variables does the file make.

    Nothing here uses VS Code, so it can be tried out on its own. Like the AerOS editor, it
    looks at the text rather than running the full lexer, so a half typed line never stops it.
    The rules it relies on are the lexer's (src/lang/aer_lexer.c): a comment runs from # to the
    end of the line, a string can't span lines, and a backslash escapes the next character.
*/

'use strict';

const NAME_START = /[A-Za-z_]/;
const NAME_PART = /[A-Za-z0-9_]/;

// Where does this line, up to the cursor, leave it: 'code', 'string' or 'comment'?
function contextAt (lineBeforeCursor) {
    const s = lineBeforeCursor;
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if (c === '#') {
            return 'comment';
        }
        if (c === '"') {
            i++;
            while (i < s.length && s[i] !== '"') {
                i += s[i] === '\\' ? 2 : 1;
            }
            if (i >= s.length) {
                return 'string'; // no closing quote yet
            }
        }
        i++;
    }
    return 'code';
}

// The line with its strings' insides and its comment blanked out with spaces, so a search for
// "let x" or "func f" can't find one inside "text" or after a #. Positions stay the same
function codeOf (line) {
    let out = '';
    let i = 0;
    while (i < line.length) {
        const c = line[i];
        if (c === '#') {
            return out + ' '.repeat(line.length - i);
        }
        if (c === '"') {
            out += '"';
            i++;
            while (i < line.length && line[i] !== '"') {
                const width = line[i] === '\\' && i + 1 < line.length ? 2 : 1;
                out += ' '.repeat(width);
                i += width;
            }
            if (i < line.length) {
                out += '"';
                i++;
            }
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

// The comment lines straight above line n (no blank line between), as the function's
// description: the way AerOS's own programs explain their functions
function commentAbove (lines, n) {
    const found = [];
    for (let k = n - 1; k >= 0; k--) {
        const m = /^\s*#\s?(.*)$/.exec(lines[k]);
        if (!m) {
            break;
        }
        found.unshift(m[1]);
    }
    return found.join('\n').trim();
}

// The functions and variables a file makes:
//   functions: [{ name, params: [names], line, doc }]
//   variables: [{ name, line, kind: 'let' | 'for' | 'param', func? }]
function scanDocument (text) {
    const lines = text.split(/\r?\n/);
    const functions = [];
    const variables = [];
    lines.forEach((raw, n) => {
        const line = codeOf(raw);
        const fn = /^\s*func\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)?/.exec(line);
        if (fn) {
            const params = fn[2].split(',').map((x) => x.trim()).filter((x) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(x));
            functions.push({ name: fn[1], params, line: n, doc: commentAbove(lines, n) });
            for (const name of params) {
                variables.push({ name, line: n, kind: 'param', func: fn[1] });
            }
        }
        for (const m of line.matchAll(/\blet\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
            variables.push({ name: m[1], line: n, kind: 'let' });
        }
        for (const m of line.matchAll(/\bfor\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|\bin\b)/g)) {
            variables.push({ name: m[1], line: n, kind: 'for' });
        }
    });
    return { functions, variables };
}

// Which call is the cursor inside, and on which argument? text is the code before the cursor
// (a few lines are plenty: a call's ( ) can carry on over several lines, but rarely many).
// Returns { name, argument } (argument counts from 0), or null when not inside a call's ( ).
// A list inside the call, dbrun(db, sql, [x, |, still counts as the call's argument it is in
function callAt (text) {
    const open = []; // one per ( or [ not yet closed: { name, commas, bracket }
    let lastName = null; // a name straight before this point (only spaces since), for name(
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === '#') {
            while (i < text.length && text[i] !== '\n') {
                i++;
            }
            lastName = null;
            continue;
        }
        if (c === '"') {
            i++;
            while (i < text.length && text[i] !== '"' && text[i] !== '\n') {
                i += text[i] === '\\' ? 2 : 1;
            }
            i++;
            lastName = null;
            continue;
        }
        if (NAME_START.test(c)) {
            const start = i;
            while (i < text.length && NAME_PART.test(text[i])) {
                i++;
            }
            lastName = text.slice(start, i);
            continue;
        }
        if (c === ' ' || c === '\t') {
            i++;
            continue; // a name followed by spaces then ( is still a call
        }
        if (c === '(' || c === '[') {
            open.push({ name: c === '(' ? lastName : null, commas: 0, bracket: c === '[' });
        } else if (c === ')' || c === ']') {
            open.pop();
        } else if (c === ',' && open.length) {
            open[open.length - 1].commas++;
        }
        lastName = null;
        i++;
    }
    // the innermost ( that isn't a list's [
    for (let k = open.length - 1; k >= 0; k--) {
        if (!open[k].bracket) {
            return open[k].name ? { name: open[k].name, argument: open[k].commas } : null;
        }
    }
    return null;
}

module.exports = { contextAt, codeOf, scanDocument, callAt, commentAbove };
