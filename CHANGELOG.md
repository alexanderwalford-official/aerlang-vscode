# Changelog

All notable changes to the AerLang extension. Versions follow [Semantic Versioning](https://semver.org/):
see [Versions and compatibility](README.md#versions-and-compatibility) in the README for what each
part of the number means here.

## [0.3.0] - 2026-11-20

Needs VS Code 1.75 or newer. Matches the AerLang of AerOS 0.01 ALPHA, as of aerOS commit
`4b9acdf`: 118 built-ins, 22 keywords and 39 constants. The keywords and constants haven't
changed since 0.2.0.

### Added
- 25 built-ins that AerOS gained since `70b4c3f`, coloured, suggested and described:
  - screen: `clip`, `setclip`
  - files: `mkd`, `deld`, `sync`
  - network: `httpget`
  - TCP: `tcplisten`, `tcpaccept`, `tcpconnect`, `tcprecv`, `tcpsend`, `tcpclose`, `tcpunlisten`
  - trust: `verify`, `packagekey`, `scan`
  - system: `disks`, `install`, `osbuild`, `osversion`, `osupdatable`, `osupdate`
  - logs: `logclear`, `setlogging`, `islogging`
- The description of a built-in says when a program started in the background (`BG`) can't use
  it: the 44 that read the keyboard or mouse, draw, make sound or ask a question.
- The tests check that list against AerOS too, and run over the programs in its `packages/`
  folder (where the games and apps moved).

### Changed
- `logadd` is now under "Logs", with the other log built-ins.
- Newer descriptions from AerOS's docs: `int()` reads text the way a number in a program is
  (`"0x1F"` is hex, `"08"` is 8), `wrf()` writes bytes as well as text, and `mouse()` says a
  program draws its own pointer.

## [0.2.0] - 2026-11-15

Needs VS Code 1.75 or newer. Matches the AerLang of AerOS 0.01 ALPHA, as of aerOS commit
`70b4c3f`, plus `logadd`.

### Added
- Suggestions as you type: the 22 keywords, the 93 built-in functions, the 39 constants and
  `args`, and the functions, variables and function arguments of the file you're in.
- Picking a function fills in its arguments as placeholders (`rect(x, y, w, h, colour)`), which
  Tab moves between. Arguments that can be left out are left out.
- Whole blocks with their `end`: `if`, `if ... else`, `for ... to`, `for ... in`, `while`,
  `func`, and a game loop after `gopen`.
- Argument help: inside a call, the function's arguments with the current one underlined. It
  copes with calls over several lines, commas in strings, lists inside the call and calls
  inside calls.
- Hover descriptions for built-ins, keywords, constants and the file's own functions (from the
  `#` comment lines straight above them).
- Colours for `logadd`, the new built-in that writes to the AerOS system log.
- `tools/package.py`, which builds a `.vsix` with nothing but Python.
- `test/run.js`, tests for the colours and the suggestions that run without opening VS Code,
  and can check the built-ins against an AerOS checkout.

### Changed
- The minimum VS Code version is now 1.75 (it was 1.60), for the labels of the suggestions.
- Licensed under Apache 2.0, like AerOS.

## 0.1.0 - 2026-11-15

Made inside the aerOS repository and never published on its own: 0.2.0 is the first version in
this repository. Needs VS Code 1.60 or newer. Matches the AerLang of AerOS 0.01 ALPHA, as of aerOS commit `70b4c3f`.

### Added
- The AerLang language for `.aer` files, and `.ren` (from when AerLang was called RenLang).
- Colours for comments, strings and their escapes (an unknown escape is marked as a mistake),
  whole, decimal and hex numbers, keywords, built-in functions (only when called), constants,
  `func` names and parameters, `let` names and calls to your own functions.
- `#` comments for Toggle Line Comment (Ctrl+/), matching brackets and quotes, indenting after
  a line that opens a block, `end` / `else` / `elif` moved back out, and folding.

[0.3.0]: https://github.com/alexanderwalford-official/aerlang-vscode/releases/tag/v0.3.0
[0.2.0]: https://github.com/alexanderwalford-official/aerlang-vscode/releases/tag/v0.2.0
