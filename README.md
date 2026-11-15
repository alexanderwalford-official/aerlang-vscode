# AerLang for Visual Studio Code

Colours, suggestions, argument help and hover descriptions for **AerLang**, the programming
language built into [AerOS](https://github.com/alexanderwalford-official/aerOS). AerLang programs
are text files ending in `.aer`. They run inside the AerOS kernel, where they can use the
screen, keyboard, files, sound and network directly. The language itself is described in
[docs/AERLANG.md](https://github.com/alexanderwalford-official/aerOS/blob/main/docs/AERLANG.md)
in the AerOS repository.

```aerlang
# how many points a word is worth: its length, doubled for long words
func points(word)
    if len(word) > 6 then
        return len(word) * 2
    end
    return len(word)
end

let total = 0
for word in split("the quick brown fox") do
    total = total + points(word)
end
print("Score: " + total)
```

- [Features](#features)
- [Installing](#installing)
- [Versions and compatibility](#versions-and-compatibility)
- [Developing](#developing)
- [Licence](#licence)

## Features

### Colours

- comments, and strings with their escapes (`\n` `\t` `\0` `\\` `\"`). Any other escape is
  marked as a mistake, as AerOS would refuse it
- whole, decimal and hex numbers: `42`, `3.14`, `2.5e3`, `0xFF`
- all 22 keywords, coloured by kind: `if then elif else end`, `while do for to step in break continue`,
  `func return let`, `and or not`, `true false nil`
- the 93 built-in functions (`print`, `rdf`, `gopen`...), but only when they are called. A
  variable called `line` or `text` stays a plain name, while `line(0, 0, 9, 9, c)` is a built-in
- the constants (`KEY_UP`, `MOUSE_LEFT`, `ORANGE`, `PI`) and `args`
- the name and parameters of a `func`, the name a `let` makes, and calls to your own functions

The colours come from your colour theme, like any other language's.

### Suggestions

Suggestions come up as you type, the same as for any built-in language. Type `l` and `let` is
offered. You get the keywords, the built-in functions, the constants, and the functions,
variables and function arguments of the file you're in. Each one says what it is, with a
description taken from the AerLang documentation.

Picking a function fills in its arguments as placeholders, and **Tab** moves from one to the
next:

```aerlang
rect(x, y, w, h, colour)
```

Only the arguments that must be given are filled in. The ones that can be left out show in the
argument help. Nothing is suggested inside a string or a comment, or while you're typing a new
name after `let` or `func`.

### Whole blocks

`if`, `for`, `while` and `func` are offered twice: once as the keyword, and once as a whole
block with its `end`, marked with the block's shape:

| Pick | You get |
| --- | --- |
| `if … then … end` | `if condition then` ... `end` |
| `if … else … end` | `if condition then` ... `else` ... `end` |
| `for i = … to … do … end` | `for i = 1 to 10 do` ... `end` |
| `for … in … do … end` | `for item in list do` ... `end` |
| `while … do … end` | `while condition do` ... `end` |
| `func …(…) … end` | `func name()` ... `end` |
| `gopen` game loop | `gopen()`, `gbuf(true)` and a loop that draws a frame until Esc |

### Argument help

Inside a call, a box shows the function's arguments with the one you're on underlined, and what
the function does. Arguments that can be left out are shown in `[ ]`:

```aerlang
text(x, y, text, colour, [size])
```

It works for calls that carry on over several lines, commas inside strings, lists inside the
call (`dbrun(db, sql, [name, ` is still on `values`) and calls inside calls. It works for your
own functions too.

### Hover

Point at a built-in, keyword, constant or one of your functions to see what it is. Your own
functions are described by the `#` comment lines straight above them, the way the AerOS
programs explain theirs, along with the line they're on.

### Editing

- **Ctrl+/** comments lines out with `#`
- a new line is indented after `if`, `elif`, `else`, `while`, `for` and `func`, and `end`,
  `else` and `elif` move back out when you type them
- brackets and quotes are closed for you, and blocks can be folded
- `.ren` files (from when AerLang was called RenLang) are AerLang too

## Installing

The extension isn't on the Visual Studio Marketplace. Install it from a `.vsix` package, which
you build from this repository with Python (3.6 or newer). Node and npm aren't needed.

```bash
git clone https://github.com/alexanderwalford-official/aerlang-vscode.git
cd aerlang-vscode
python tools/package.py
code --install-extension aerlang-0.2.0.vsix
```

Then open any `.aer` file. If VS Code was already open, run **Developer: Reload Window** from the
Command Palette first. You can also install the `.vsix` from VS Code itself: in the Extensions view,
open the `...` menu and choose **Install from VSIX...**.

To update, pull the new version and run the same commands again. To remove it, uninstall
**AerLang** in the Extensions view, or run `code --uninstall-extension aeros.aerlang`.

**Without packaging:** copy the repository folder into VS Code's extensions folder under the
name `aeros.aerlang-0.2.0`, then restart VS Code. The folder is
`%USERPROFILE%\.vscode\extensions` on Windows and `~/.vscode/extensions` on macOS and Linux.

**To try it without installing:** open this folder in VS Code and press **F5**. A second VS Code
window opens with the extension loaded. Open `examples/demo.aer` there.

## Versions and compatibility

| Extension | VS Code | AerLang (AerOS) | What it does |
| --- | --- | --- | --- |
| **0.2.0** | 1.75 or newer | AerOS 0.01 ALPHA, as of aerOS commit [`70b4c3f`](https://github.com/alexanderwalford-official/aerOS/commit/70b4c3f), plus `logadd` | colours, suggestions, argument help, hover, blocks |
| 0.1.0 | 1.60 or newer | AerOS 0.01 ALPHA, as of aerOS commit `70b4c3f` | colours only (never published on its own) |

**VS Code.** The minimum version is the `engines.vscode` field of `package.json`. VS Code
refuses to install the extension on an older version. 0.2.0 was tested with VS Code 1.146.0 on
Windows 11. It is plain JavaScript with no native code and no dependencies, so it should work
the same on Windows, macOS and Linux. (VS Code for the Web gets the colours but not the
suggestions, which run as a desktop extension.) Editors built on VS Code, such
as VSCodium and Cursor, install `.vsix` files too and should work from the same versions, but
they haven't been tested.

**AerLang.** AerLang has no version number of its own, and AerOS has been "0.01 ALPHA" for
every version of the language so far. So each version of the extension records the aerOS commit
its lists of keywords, built-ins and constants were copied from. With a different AerOS:

- **newer:** everything here still works. Built-ins added since aren't coloured or suggested,
  but your programs can use them as usual
- **older:** a built-in AerOS doesn't have yet may still be suggested (in 0.2.0, `logadd` was
  added to AerOS just after `70b4c3f`). AerOS will say `unknown name` when the program runs

`node test/run.js <path to aerOS>` compares the lists with an AerOS checkout and names anything
that's different (see [Developing](#developing)).

**Version numbers** follow [Semantic Versioning](https://semver.org/):

- **patch** (0.2.**1**): fixes, and better descriptions
- **minor** (0.**3**.0): new built-ins or keywords from AerOS, and new editor features. While
  the version starts with 0, a minor version may also raise the minimum VS Code version. When
  it does, the table above and the [changelog](CHANGELOG.md) say so
- **major** (**1**.0.0): changes that need something from you, such as a new language id (which
  would affect `files.associations` settings) or a file extension no longer counted as AerLang

Every version is listed in [CHANGELOG.md](CHANGELOG.md), and tagged `v<version>` in git.

## Developing

### Layout

| File | Does |
| --- | --- |
| `package.json` | the extension's manifest: its name, version, minimum VS Code, and the language it adds |
| `syntaxes/aerlang.tmLanguage.json` | the colours: a TextMate grammar |
| `language-configuration.json` | comments, brackets, indenting and folding |
| `language.js` | what the extension knows about AerLang: keywords, built-ins with their arguments, constants, blocks, each with its description |
| `analysis.js` | reads a file: is the cursor in a string or comment, which call is it in, which functions and variables does the file make. Doesn't use VS Code, so it can be tested on its own |
| `extension.js` | gives VS Code the suggestions, argument help and hover |
| `examples/demo.aer` | a program to try the extension on |
| `test/run.js` | the tests |
| `tools/package.py` | builds the `.vsix` |

### Tests

```bash
node test/run.js
```

This runs the colours over sample lines and every program in `examples/`. It also tries the
suggestions, argument help and hover, using a small stand-in for VS Code. Give it an aerOS
checkout to compare the keywords, built-ins (with how many arguments each takes) and constants
with the interpreter, and to run over every AerOS program as well:

```bash
node test/run.js ../aerOS
```

No Node? VS Code has its own. Run the same file with that, on Windows from Git Bash:

```bash
ELECTRON_RUN_AS_NODE=1 "$LOCALAPPDATA/Programs/Microsoft VS Code/Code.exe" test/run.js ../aerOS
```

### When AerOS changes

The lists are copied from the AerLang interpreter in aerOS, so a new keyword, built-in or
constant needs adding here in two places:

| In aerOS | In the grammar (`syntaxes/aerlang.tmLanguage.json`) | In `language.js` |
| --- | --- | --- |
| `keywords[]` in `src/lang/aer_lexer.c` | the `keyword` patterns | `KEYWORDS` |
| the `BUILTIN(...)` list in `src/lang/aer_builtins.c` | `builtin-function` | `BUILTIN_LIST` |
| `aer_define_constants()` in `src/lang/aer_builtins.c` | `constant` | `CONSTANTS` |

In `BUILTIN_LIST`, write `p(name)` for each argument that must be given and `o(name)` for one
that can be left out. They have to match the fewest and most arguments in the `BUILTIN(...)`
line, and the tests check that they do. Take the description from `docs/AERLANG.md`.

### Making a release

1. Raise `version` in `package.json` (see [Versions and compatibility](#versions-and-compatibility)).
2. Add the version to `CHANGELOG.md`, and to the table above with the aerOS commit it matches.
3. `node test/run.js ../aerOS` and `python tools/package.py`.
4. Install the `.vsix` and try `examples/demo.aer`.
5. Commit, then `git tag v<version>` and push the commit and the tag.

## Licence

[Apache License 2.0](LICENSE), the same as AerOS.
