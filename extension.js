/*
    extension.js
    Suggestions for AerLang in VS Code, from what language.js knows about the language and what
    analysis.js finds in the file:

      - completion: keywords, whole blocks (if ... end), built-ins with their arguments filled
        in, the constants, and the file's own functions and variables
      - signature help: the arguments of the call the cursor is in, with the current one marked
      - hover: what a built-in, keyword, constant or function of the file does

    The colours come from syntaxes/aerlang.tmLanguage.json, not from here.
*/

'use strict';

const vscode = require('vscode');
const { KEYWORDS, BUILTINS, CONSTANTS, SNIPPETS, signatureLabel } = require('./language');
const { contextAt, scanDocument, callAt } = require('./analysis');

// how many lines above the cursor to read when working out which call it is in
const CALL_LOOKBACK_LINES = 30;

// sortText puts the file's own names first, then built-ins, then keywords and blocks, then the
// constants (VS Code still puts better matches for what was typed above all of these)
const ORDER = { variable: '1', function: '2', builtin: '3', keyword: '4', snippet: '5', constant: '6' };

function markdown (text) {
    const md = new vscode.MarkdownString(text);
    md.supportHtml = false;
    return md;
}

// "rect(x, y, w, h, colour)" as a snippet, so Tab moves from one argument to the next. Only the
// arguments that must be given are put in: the optional ones show in the signature help
function callSnippet (name, params) {
    const needed = params.filter((a) => !a.optional);
    if (needed.length === 0) {
        return new vscode.SnippetString(name + '($0)');
    }
    const parts = needed.map((a, k) => '${' + (k + 1) + ':' + a.name + '}');
    return new vscode.SnippetString(name + '(' + parts.join(', ') + ')$0');
}

// the file's own functions, with their arguments in the same shape as a built-in's
function ownFunctions (document) {
    return scanDocument(document.getText()).functions.map((f) => ({
        name: f.name,
        params: f.params.map((x) => ({ name: x, optional: false })),
        doc: f.doc,
        line: f.line,
    }));
}

// a function's description: its signature as code, then what it does. frontOnly adds that a
// program in the background can't use it (see FRONT_ONLY in language.js)
function describe (name, params, doc, group, frontOnly) {
    let text = '```aerlang\n' + signatureLabel(name, params) + '\n```\n';
    if (doc) {
        text += '\n' + doc;
    }
    if (frontOnly) {
        text += '\n\nOnly for the program in front: a program started in the background (`BG`) can\'t use it.';
    }
    if (group) {
        text += '\n\n*' + group + '*';
    }
    return markdown(text);
}

// is the cursor in code (not a string or comment)?
function inCode (document, position) {
    return contextAt(document.lineAt(position.line).text.slice(0, position.character)) === 'code';
}

const completionProvider = {
    provideCompletionItems (document, position) {
        if (!inCode(document, position)) {
            return undefined;
        }
        const lineText = document.lineAt(position.line).text;
        // already followed by "(": complete just the name, the arguments are being typed already
        const parenFollows = /^\s*\(/.test(lineText.slice(position.character));
        // the word being typed, so "func" after "end" etc. doesn't get in the way of a name
        const before = lineText.slice(0, position.character);
        const afterFunc = /\bfunc\s+[A-Za-z_0-9]*$/.test(before);
        const afterLet = /\blet\s+[A-Za-z_0-9]*$/.test(before);
        if (afterFunc || afterLet) {
            return undefined; // a new name is being made up: nothing to suggest
        }

        const items = [];
        const seen = new Set();
        const add = (item, key) => {
            if (!seen.has(key)) {
                seen.add(key);
                items.push(item);
            }
        };
        const Kind = vscode.CompletionItemKind;

        // the file's own functions and variables
        const scan = scanDocument(document.getText());
        for (const f of ownFunctions(document)) {
            const item = new vscode.CompletionItem({ label: f.name, detail: '(' + f.params.map((a) => a.name).join(', ') + ')', description: 'this file' }, Kind.Function);
            item.insertText = parenFollows ? f.name : callSnippet(f.name, f.params);
            item.documentation = describe(f.name, f.params, f.doc);
            item.sortText = ORDER.function + f.name;
            if (!parenFollows) {
                item.command = { command: 'editor.action.triggerParameterHints', title: 'arguments' };
            }
            add(item, f.name);
        }
        for (const v of scan.variables) {
            if (v.line === position.line && v.kind !== 'param') {
                continue; // the name being typed on this line, e.g. "let sco|"
            }
            if (BUILTINS[v.name] || KEYWORDS[v.name]) {
                continue;
            }
            const item = new vscode.CompletionItem({ label: v.name, description: v.kind === 'param' ? 'argument of ' + v.func : 'variable' }, Kind.Variable);
            item.sortText = ORDER.variable + v.name;
            add(item, v.name);
        }

        // built-in functions
        for (const b of Object.values(BUILTINS)) {
            const item = new vscode.CompletionItem({ label: b.name, detail: signatureLabel('', b.params), description: b.group }, Kind.Function);
            item.insertText = parenFollows ? b.name : callSnippet(b.name, b.params);
            item.documentation = describe(b.name, b.params, b.doc, b.group, b.frontOnly);
            item.sortText = ORDER.builtin + b.name;
            if (!parenFollows) {
                item.command = { command: 'editor.action.triggerParameterHints', title: 'arguments' };
            }
            add(item, b.name);
        }

        // keywords, then whole blocks
        for (const [word, doc] of Object.entries(KEYWORDS)) {
            const item = new vscode.CompletionItem(word, Kind.Keyword);
            item.documentation = markdown(doc);
            item.sortText = ORDER.keyword + word;
            add(item, 'keyword ' + word);
        }
        SNIPPETS.forEach(([prefix, description, body], k) => {
            const item = new vscode.CompletionItem({ label: prefix, description }, Kind.Snippet);
            item.insertText = new vscode.SnippetString(body);
            item.documentation = markdown('```aerlang\n' + body.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$\d/g, '') + '\n```');
            item.sortText = ORDER.snippet + prefix + k;
            add(item, 'snippet ' + k);
        });

        // constants
        for (const [name, doc] of Object.entries(CONSTANTS)) {
            const item = new vscode.CompletionItem(name, name === 'args' ? Kind.Variable : Kind.Constant);
            item.documentation = markdown(doc);
            item.sortText = ORDER.constant + name;
            add(item, name);
        }
        return items;
    },
};

const signatureProvider = {
    provideSignatureHelp (document, position) {
        if (!inCode(document, position)) {
            return undefined;
        }
        const from = new vscode.Position(Math.max(0, position.line - CALL_LOOKBACK_LINES), 0);
        const call = callAt(document.getText(new vscode.Range(from, position)));
        if (!call) {
            return undefined;
        }
        let fn = BUILTINS[call.name];
        if (!fn) {
            fn = ownFunctions(document).find((f) => f.name === call.name);
        }
        if (!fn) {
            return undefined;
        }

        const label = signatureLabel(fn.name, fn.params);
        const signature = new vscode.SignatureInformation(label, fn.doc ? markdown(fn.doc) : undefined);
        // each argument by where it is in the label, so the right one is underlined
        let at = fn.name.length + 1;
        signature.parameters = fn.params.map((a) => {
            const text = a.rest ? '...' + a.name : a.optional ? '[' + a.name + ']' : a.name;
            const range = [at, at + text.length];
            at += text.length + 2;
            return new vscode.ParameterInformation(range, a.optional && !a.rest ? markdown('can be left out') : undefined);
        });

        const help = new vscode.SignatureHelp();
        help.signatures = [signature];
        help.activeSignature = 0;
        // past the last argument (print's ...values takes any number) stays on the last one
        help.activeParameter = Math.min(call.argument, Math.max(0, fn.params.length - 1));
        return help;
    },
};

const hoverProvider = {
    provideHover (document, position) {
        const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
        if (!range || !inCode(document, range.start)) {
            return undefined;
        }
        const word = document.getText(range);
        const lineText = document.lineAt(position.line).text;
        const called = /^\s*\(/.test(lineText.slice(range.end.character));

        // a built-in only when it is called, as a variable can have the same name (line, text)
        const b = BUILTINS[word];
        if (b && called) {
            return new vscode.Hover(describe(b.name, b.params, b.doc, b.group, b.frontOnly), range);
        }
        const own = ownFunctions(document).find((f) => f.name === word);
        if (own) {
            return new vscode.Hover(describe(own.name, own.params, own.doc, 'line ' + (own.line + 1) + ' of this file'), range);
        }
        if (KEYWORDS[word]) {
            return new vscode.Hover(markdown('**' + word + '** · ' + KEYWORDS[word]), range);
        }
        if (CONSTANTS[word]) {
            return new vscode.Hover(markdown('**' + word + '** · ' + CONSTANTS[word]), range);
        }
        return undefined;
    },
};

function activate (context) {
    const selector = { language: 'aerlang' };
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(selector, completionProvider),
        vscode.languages.registerSignatureHelpProvider(selector, signatureProvider, {
            triggerCharacters: ['(', ','],
            retriggerCharacters: [')', ']'],
        }),
        vscode.languages.registerHoverProvider(selector, hoverProvider),
    );
}

function deactivate () {}

module.exports = { activate, deactivate };
