/*
    test/run.js
    Tries the extension without opening VS Code: the colours (the grammar), and the
    suggestions, argument help and hover (extension.js, given a stand-in for the vscode module).

        node test/run.js                     the tests on their own
        node test/run.js ../aerOS            also checks the keywords and built-ins against an
                                             AerOS checkout, and runs over all of its programs

    No Node? VS Code has its own:  ELECTRON_RUN_AS_NODE=1 "<VS Code>/Code.exe" test/run.js
    (see the README). Exits with 1 if anything fails.
*/

'use strict';

const Module = require('module');
const fs = require('fs');
const path = require('path');

const EXT = path.resolve(__dirname, '..');
const AEROS = process.argv[2] ? path.resolve(process.argv[2]) : null;

let failures = 0;
function check (what, ok, got) {
    console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : '\n       got: ' + JSON.stringify(got)));
    if (!ok) {
        failures++;
    }
}
function section (name) {
    console.log('\n' + name);
}

// ---- a stand-in for the vscode module: just enough of it for extension.js ----------------------

class Position { constructor (line, character) { this.line = line; this.character = character; } }
class Range { constructor (start, end) { this.start = start; this.end = end; } }
const providers = {};
const vscode = {
    Position,
    Range,
    CompletionItem: class { constructor (label, kind) { this.label = label; this.kind = kind; } },
    CompletionItemKind: { Function: 'function', Variable: 'variable', Keyword: 'keyword', Snippet: 'snippet', Constant: 'constant' },
    SnippetString: class { constructor (value) { this.value = value; } },
    MarkdownString: class { constructor (value) { this.value = value; } },
    SignatureInformation: class { constructor (label, doc) { this.label = label; this.documentation = doc; } },
    ParameterInformation: class { constructor (label, doc) { this.label = label; this.documentation = doc; } },
    SignatureHelp: class {},
    Hover: class { constructor (contents, range) { this.contents = contents; this.range = range; } },
    languages: {
        registerCompletionItemProvider: (selector, p) => { providers.completion = p; return {}; },
        registerSignatureHelpProvider: (selector, p) => { providers.signature = p; return {}; },
        registerHoverProvider: (selector, p) => { providers.hover = p; return {}; },
    },
};
const realLoad = Module._load;
Module._load = function (request, ...rest) {
    return request === 'vscode' ? vscode : realLoad.call(this, request, ...rest);
};

// a document holding text
function makeDocument (text) {
    const lines = text.split('\n');
    const offset = (p) => lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
    return {
        lineAt: (n) => ({ text: lines[n] }),
        getText: (r) => (r ? text.slice(offset(r.start), offset(r.end)) : text),
        getWordRangeAtPosition: (p, re) => {
            const g = new RegExp(re.source, 'g');
            let m;
            while ((m = g.exec(lines[p.line]))) {
                if (m.index <= p.character && p.character <= m.index + m[0].length) {
                    return new Range(new Position(p.line, m.index), new Position(p.line, m.index + m[0].length));
                }
            }
            return undefined;
        },
    };
}
// a document and the cursor, from text with a | where the cursor is
function at (textWithCursor) {
    const i = textWithCursor.indexOf('|');
    const text = textWithCursor.slice(0, i) + textWithCursor.slice(i + 1);
    const before = text.slice(0, i).split('\n');
    return [makeDocument(text), new Position(before.length - 1, before[before.length - 1].length)];
}
const labelOf = (item) => (typeof item.label === 'string' ? item.label : item.label.label);

// ---- the grammar: a small TextMate-style tokenizer, enough for these patterns -------------------

const grammar = JSON.parse(fs.readFileSync(path.join(EXT, 'syntaxes/aerlang.tmLanguage.json'), 'utf8'));
function flatten (rule) {
    if (rule.include) {
        return flatten(grammar.repository[rule.include.slice(1)]);
    }
    if (rule.patterns && !rule.begin && !rule.match) {
        return rule.patterns.flatMap(flatten);
    }
    const r = { ...rule };
    if (r.match) r.re = new RegExp(r.match, 'g');
    if (r.begin) {
        r.beginRe = new RegExp(r.begin, 'g');
        r.endRe = new RegExp(r.end, 'g');
        r.inner = (r.patterns || []).flatMap(flatten);
    }
    return [r];
}
const topRules = grammar.patterns.flatMap(flatten);
function firstMatch (rules, line, pos) {
    let best = null;
    for (const r of rules) {
        const re = r.re || r.beginRe;
        re.lastIndex = pos;
        const m = re.exec(line);
        if (m && (!best || m.index < best.m.index)) best = { r, m };
    }
    return best;
}
// [text, scope] pairs for one line ('' is no scope)
function tokenize (line) {
    const out = [];
    let pos = 0;
    let open = null; // a begin / end rule we're inside
    while (pos <= line.length) {
        if (open) {
            open.endRe.lastIndex = pos;
            const end = open.endRe.exec(line);
            const inner = firstMatch(open.inner, line, pos);
            if (inner && (!end || inner.m.index < end.index)) {
                out.push([line.slice(pos, inner.m.index), open.name || ''], [inner.m[0], inner.r.name]);
                pos = Math.max(inner.m.index + inner.m[0].length, pos + 1);
                continue;
            }
            const stop = end ? end.index + end[0].length : line.length;
            out.push([line.slice(pos, stop), open.name || '']);
            open = null;
            if (stop >= line.length) break;
            pos = stop;
            continue;
        }
        const found = firstMatch(topRules, line, pos);
        if (!found) {
            out.push([line.slice(pos), '']);
            break;
        }
        const { r, m } = found;
        out.push([line.slice(pos, m.index), '']);
        if (r.re) {
            if (r.captures && !r.name) {
                for (const [k, v] of Object.entries(r.captures)) if (m[k]) out.push([m[k], v.name]);
            } else {
                out.push([m[0], r.name]);
            }
        } else {
            for (const [k, v] of Object.entries(r.beginCaptures || {})) if (m[k]) out.push([m[k], v.name]);
            open = r;
        }
        pos = Math.max(m.index + m[0].length, pos + 1);
    }
    return out.filter(([text]) => text.length);
}
const scopeOf = (line, word) => (tokenize(line).find(([text]) => text === word) || [null, null])[1];

section('Colours');
for (const file of ['package.json', 'language-configuration.json', 'syntaxes/aerlang.tmLanguage.json']) {
    let ok = true;
    try { JSON.parse(fs.readFileSync(path.join(EXT, file), 'utf8')); } catch (e) { ok = false; }
    check(file + ' is valid JSON', ok);
}
check('a keyword', scopeOf('if x then', 'if') === 'keyword.control.conditional.aerlang', tokenize('if x then'));
check('"end" inside a string stays string', !tokenize('print("the end")').some(([t, s]) => t.includes('end') && !s.startsWith('string')), tokenize('print("the end")'));
check('"endless" is not the keyword end', scopeOf('endless(1)', 'endless') === 'entity.name.function.call.aerlang', tokenize('endless(1)'));
check('hex number', scopeOf('let c = 0xFF', '0xFF') === 'constant.numeric.hex.aerlang');
check('decimal with exponent', scopeOf('let d = 2.5e3', '2.5e3') === 'constant.numeric.float.aerlang');
check('escape in a string', scopeOf('print("a\\tb")', '\\t') === 'constant.character.escape.aerlang', tokenize('print("a\\tb")'));
check('unknown escape marked', scopeOf('print("a\\qb")', '\\q') === 'invalid.illegal.unknown-escape.aerlang', tokenize('print("a\\qb")'));
check('a built-in when called', scopeOf('rect(1, 2, 3, 4, 5)', 'rect') === 'support.function.builtin.aerlang');
check('not a built-in when a variable', scopeOf('let line = 3', 'line') === 'variable.other.declaration.aerlang', tokenize('let line = 3'));
check('func name and parameters', scopeOf('func area(w, h)', 'area') === 'entity.name.function.aerlang' && scopeOf('func area(w, h)', 'h') === 'variable.parameter.aerlang', tokenize('func area(w, h)'));
check('a constant', scopeOf('key() == KEY_UP', 'KEY_UP') === 'support.constant.key.aerlang');
check('a comment after code', scopeOf('x = 1 # if end', '# if end') === 'comment.line.number-sign.aerlang', tokenize('x = 1 # if end'));

// ---- the language data ------------------------------------------------------------------------

section('Language data');
const { BUILTINS, KEYWORDS, CONSTANTS } = require(path.join(EXT, 'language.js'));
const grammarBuiltins = new Set(/\\b\(([^)]*)\)/.exec(grammar.repository['builtin-function'].match)[1].split('|'));
check('the grammar colours every built-in that is suggested', Object.keys(BUILTINS).every((n) => grammarBuiltins.has(n)), Object.keys(BUILTINS).filter((n) => !grammarBuiltins.has(n)));
check('every built-in the grammar colours is suggested', [...grammarBuiltins].every((n) => BUILTINS[n]), [...grammarBuiltins].filter((n) => !BUILTINS[n]));
check('every built-in has a description', Object.values(BUILTINS).every((b) => b.doc && b.group));
console.log(`     (${Object.keys(BUILTINS).length} built-ins, ${Object.keys(KEYWORDS).length} keywords, ${Object.keys(CONSTANTS).length} constants)`);

if (AEROS) {
    section('Against AerOS at ' + AEROS);
    const c = fs.readFileSync(path.join(AEROS, 'src/lang/aer_builtins.c'), 'utf8');
    const table = [...c.matchAll(/BUILTIN\("(\w+)",\s*\w+,\s*(\w+),\s*(\w+)\)/g)];
    const names = table.map((m) => m[1]);
    check(`every AerOS built-in is known (${names.length})`, names.every((n) => BUILTINS[n]), names.filter((n) => !BUILTINS[n]));
    check('no built-ins AerOS doesn\'t have', Object.keys(BUILTINS).every((n) => names.includes(n)), Object.keys(BUILTINS).filter((n) => !names.includes(n)));
    const wrong = [];
    for (const [, name, min, max] of table) {
        const b = BUILTINS[name];
        if (!b) continue;
        const needed = b.params.filter((a) => !a.optional).length;
        const rest = b.params.some((a) => a.rest);
        if (needed !== Number(min) || (rest ? max !== 'AER_MAX_ARGS' : b.params.length !== Number(max))) {
            wrong.push(`${name}: AerOS ${min} to ${max}, here ${needed} to ${rest ? 'any' : b.params.length}`);
        }
    }
    check('argument counts match', wrong.length === 0, wrong);
    const lexer = fs.readFileSync(path.join(AEROS, 'src/lang/aer_lexer.c'), 'utf8');
    const words = [...lexer.matchAll(/\{ "(\w+)", T_\w+ \}/g)].map((m) => m[1]);
    check(`keywords match the lexer (${words.length})`, words.length === Object.keys(KEYWORDS).length && words.every((k) => KEYWORDS[k]), words);
    const constants = [...c.matchAll(/\{ "([A-Z_]+)", [^}]+\}/g)].map((m) => m[1]).concat(['PI']);
    check(`constants match (${constants.length})`, constants.every((k) => CONSTANTS[k]), constants.filter((k) => !CONSTANTS[k]));

    // the built-ins a background program can't use: aer_front_only()'s list, and the graphics,
    // sound and video parts (older AerOS without background programs has neither)
    const frontList = /front_only\[\] = \{([^}]*)\}/.exec(c);
    if (frontList) {
        const front = new Set([...frontList[1].matchAll(/"(\w+)"/g)].map((m) => m[1]));
        for (const part of ['APP_GRAPHICS', 'APP_SOUND', 'APP_VIDEO']) {
            const names = new RegExp('\\{ ' + part + ',\\s*\\{([^}]*)\\}').exec(c);
            if (names) [...names[1].matchAll(/"(\w+)"/g)].forEach((m) => front.add(m[1]));
        }
        const here = Object.values(BUILTINS).filter((b) => b.frontOnly).map((b) => b.name);
        check(`the same built-ins are only for the program in front (${front.size})`,
              here.length === front.size && here.every((n) => front.has(n)),
              { missing: [...front].filter((n) => !here.includes(n)), extra: here.filter((n) => !front.has(n)) });
    }
}

// ---- suggestions, argument help, hover --------------------------------------------------------

const ext = require(path.join(EXT, 'extension.js'));
ext.activate({ subscriptions: [] });

section('Suggestions');
check('all three providers registered', providers.completion && providers.signature && providers.hover, Object.keys(providers));
const program = `# how big a box is
func area(w, h)
    return w * h
end
let score = 0
for item in things do
`;
let [doc, pos] = at(program + 'l|');
let items = providers.completion.provideCompletionItems(doc, pos);
let labels = items.map(labelOf);
const find = (label) => items.find((i) => labelOf(i) === label);
check('"l" offers let', labels.includes('let'));
check('the file\'s own function', labels.includes('area'));
check('the file\'s variables', labels.includes('score') && labels.includes('item'));
check('function arguments', labels.includes('w') && labels.includes('h'));
check('constants', labels.includes('KEY_UP') && labels.includes('ORANGE') && labels.includes('PI'));
check('rect fills in its arguments', find('rect').insertText.value === 'rect(${1:x}, ${2:y}, ${3:w}, ${4:h}, ${5:colour})$0', find('rect').insertText.value);
check('sub leaves out the optional count', find('sub').insertText.value === 'sub(${1:s}, ${2:start})$0', find('sub').insertText.value);
check('cls() puts the cursor inside', find('cls').insertText.value === 'cls($0)', find('cls').insertText.value);
check('a function is described by the comment above it', find('area').documentation.value.includes('how big a box is'));
const ifBlocks = items.filter((i) => labelOf(i) === 'if' && i.kind === 'snippet');
check('two if blocks, ending in end', ifBlocks.length === 2 && ifBlocks.every((i) => i.insertText.value.endsWith('\nend')));
[doc, pos] = at('print("let |');
check('nothing inside a string', providers.completion.provideCompletionItems(doc, pos) === undefined);
[doc, pos] = at('x = 1 # l|');
check('nothing inside a comment', providers.completion.provideCompletionItems(doc, pos) === undefined);
[doc, pos] = at('print("# not a comment") + l|');
check('a # inside a string is not a comment', Array.isArray(providers.completion.provideCompletionItems(doc, pos)));
[doc, pos] = at('let sco|');
check('nothing while naming a new variable', providers.completion.provideCompletionItems(doc, pos) === undefined);
[doc, pos] = at('rec|(1, 2)');
items = providers.completion.provideCompletionItems(doc, pos);
check('just the name when ( follows already', find('rect').insertText === 'rect');

section('Argument help');
function signature (text) {
    const [d, p] = at(text);
    const help = providers.signature.provideSignatureHelp(d, p);
    return help ? { label: help.signatures[0].label, argument: help.activeParameter, parameters: help.signatures[0].parameters } : undefined;
}
let s = signature('rect(10, 20, |');
check('rect, on its third argument', s && s.label === 'rect(x, y, w, h, colour)' && s.argument === 2, s);
check('the third argument is "w"', s && s.label.slice(...s.parameters[2].label) === 'w');
s = signature('text(1, 2, "a, b", WHITE, |');
check('commas in strings don\'t count', s && s.argument === 4 && s.label === 'text(x, y, text, colour, [size])', s);
check('an optional argument is shown in [ ]', s && s.label.slice(...s.parameters[4].label) === '[size]');
s = signature('dbrun(db, "INSERT INTO t VALUES (?, ?)", ["tea", |');
check('inside a list it is still dbrun\'s values', s && s.argument === 2, s);
s = signature('rect(len(name|');
check('the innermost call', s && s.label === 'len(x)', s);
s = signature('rect(len(name), |');
check('back to rect after len()', s && s.label.startsWith('rect') && s.argument === 1, s);
s = signature('print(1, 2, 3, 4, |');
check('print takes any number', s && s.argument === 0, s);
s = signature(program + 'let a = area(3, |');
check('the file\'s own function', s && s.label === 'area(w, h)' && s.argument === 1, s);
s = signature('rect(1,\n     2,\n     |');
check('a call over several lines', s && s.argument === 2, s);
check('nothing after the call has closed', signature('rect(1, 2) + |') === undefined);
check('nothing for if (', signature('if (|') === undefined);

section('Hover');
function hover (text) {
    const [d, p] = at(text);
    const h = providers.hover.provideHover(d, p);
    return h ? h.contents.value : undefined;
}
let h = hover('gop|en()');
check('a built-in', h && h.includes('gopen()') && h.includes('Take over the screen'), h);
check('says when a background program can\'t use it', h && h.includes('background'), h);
h = hover('tcpre|cv(c, 100)');
check('a TCP built-in', h && h.includes('tcprecv(c, ms)') && !h.includes('background'), h);
check('not a built-in when it is a variable', hover('let li|ne = 3') === undefined);
check('a keyword', (hover('wh|ile x do') || '').includes('Repeat'));
check('a constant', (hover('KEY_U|P') || '').includes('key code'));
h = hover(program + 'ar|ea(1, 2)');
check('the file\'s own function, with its line', h && h.includes('area(w, h)') && h.includes('line 2'), h);
check('nothing inside a string', hover('print("wh|ile")') === undefined);

// ---- whole programs: nothing throws, every func is found ---------------------------------------

section('Whole programs');
const files = [];
(function walk (dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(aer|ren)$/.test(p)) files.push(p);
    }
})(path.join(EXT, 'examples'));
if (AEROS) {
    for (const dir of ['src/disk', 'packages', 'tools/test/files']) {
        if (fs.existsSync(path.join(AEROS, dir))) {
            (function walk (d) {
                for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
                    const p = path.join(d, entry.name);
                    if (entry.isDirectory()) walk(p);
                    else if (p.endsWith('.aer')) files.push(p);
                }
            })(path.join(AEROS, dir));
        }
    }
}
const { scanDocument } = require(path.join(EXT, 'analysis.js'));
const KW = new Set(Object.keys(KEYWORDS));
let functions = 0;
const problems = [];
for (const file of files) {
    const text = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
    const expected = (text.match(/^\s*func\s+\w+/gm) || []).length;
    const found = scanDocument(text).functions.length;
    functions += found;
    if (found !== expected) problems.push(`${file}: found ${found} of ${expected} functions`);
    const d = makeDocument(text);
    text.split('\n').forEach((line, n) => {
        try {
            providers.completion.provideCompletionItems(d, new Position(n, line.length));
            providers.signature.provideSignatureHelp(d, new Position(n, line.length));
        } catch (e) {
            problems.push(`${file}:${n + 1}: ${e.message}`);
        }
        for (const [t, scope] of tokenize(line)) {
            if (!scope && (t.match(/[A-Za-z_]\w*/g) || []).some((w) => KW.has(w))) problems.push(`${file}:${n + 1}: keyword left uncoloured in ${JSON.stringify(t)}`);
            if (!scope && /\b\d/.test(t)) problems.push(`${file}:${n + 1}: number left uncoloured in ${JSON.stringify(t)}`);
            if (!scope && t.includes('"')) problems.push(`${file}:${n + 1}: stray quote in ${JSON.stringify(t)}`);
        }
    });
}
check(`${files.length} programs, ${functions} functions: coloured, scanned and suggested without a problem`, problems.length === 0, problems.slice(0, 10));

console.log('\n' + (failures ? failures + ' FAILED' : 'all passed'));
process.exit(failures ? 1 : 0);
