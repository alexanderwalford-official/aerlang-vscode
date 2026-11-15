/*
    language.js
    What the editor knows about AerLang: the keywords, the built-in functions with their
    arguments, and the constants, each with a short description taken from AerOS's
    docs/AERLANG.md.

    Keep it in step with AerOS (github.com/alexanderwalford-official/aerOS): keywords[] in
    src/lang/aer_lexer.c, the BUILTIN(...) list in src/lang/aer_builtins.c (the fewest / most
    arguments there decide which are "optional" here) and aer_define_constants() in the same
    file. test/run.js checks this when given an AerOS checkout.
*/

'use strict';

// keyword: what it does, shown beside the suggestion and on hover
const KEYWORDS = {
    let: 'Make a variable: `let name = value`. Inside a function it belongs to that function.',
    func: 'Make a function: `func name(a, b) ... end`. Only at the top level of a file; it can be called before the line that makes it.',
    return: 'Leave the function, giving back a value (`return x`). Without `return` a function gives back `nil`.',
    if: 'Run a block if something is true: `if x > 3 then ... end`, with optional `elif` and `else`.',
    then: 'Ends the condition of an `if` or `elif`.',
    elif: '"else if": `elif x == 3 then`, another condition tried when the ones before were false.',
    else: 'The block run when no condition of the `if` was true.',
    end: 'Closes an `if`, `while`, `for` or `func` block.',
    while: 'Repeat a block while something is true: `while n < 3 do ... end`.',
    do: 'Starts the body of a `while` or `for` loop.',
    for: 'Count (`for i = 1 to 10 do`) or go through a list (`for x in list do`).',
    to: 'The last number of a counting loop: `for i = 1 to 10 do` (10 included).',
    step: 'How much a counting loop goes up by: `for i = 10 to 0 step -2 do`.',
    in: 'Goes through each item of a list: `for colour in ["red", "green"] do`.',
    break: 'Leave the loop straight away.',
    continue: 'Skip to the next time round the loop.',
    and: 'True if both sides are. Gives back one of its values, not just true / false.',
    or: 'True if either side is. Gives back one of its values: `input("Name? ") or "friend"`.',
    not: 'The opposite: `not true` is false. `nil`, `false` and `0` count as false.',
    true: 'The bool true.',
    false: 'The bool false. `nil`, `false` and `0` all count as false.',
    nil: '"Nothing", e.g. what a function gives back without `return`, or `rdf` of a missing file.',
};

// p(name) is an argument that must be given, o(name) one that can be left out
const p = (name) => ({ name, optional: false });
const o = (name) => ({ name, optional: true });
const rest = (name) => ({ name, optional: true, rest: true });

// [group, name, arguments, description]
const BUILTIN_LIST = [
    // screen and keyboard
    ['Screen and keyboard', 'print', [rest('values')], 'Print the values, separated by spaces, then a new line.'],
    ['Screen and keyboard', 'write', [rest('values')], 'Print the values like `print`, without the new line.'],
    ['Screen and keyboard', 'input', [o('prompt')], 'Show the prompt and read a line typed at the keyboard, as text.'],
    ['Screen and keyboard', 'inpw', [o('prompt')], 'Read a line like `input`, showing `*` for each character (for passwords).'],
    ['Screen and keyboard', 'cls', [], 'Clear the screen.'],
    ['Screen and keyboard', 'color', [p('fg'), o('bg')], 'Set the text colours: `BLACK` ... `WHITE`, and `ORANGE`, the logo orange.'],
    ['Screen and keyboard', 'at', [p('x'), p('y')], 'Move the cursor to column x, row y.'],
    ['Screen and keyboard', 'key', [], 'Wait for a key and give back its code: a character code, or `KEY_UP`, `KEY_ENTER`, `KEY_ESCAPE`...'],
    ['Screen and keyboard', 'haskey', [], 'true if a key is waiting to be read with `key()`.'],

    // maths
    ['Maths', 'sqrt', [p('x')], 'The square root of x, as a decimal.'],
    ['Maths', 'sin', [p('angle')], 'The sine of an angle in radians (a whole turn is `2 * PI`).'],
    ['Maths', 'cos', [p('angle')], 'The cosine of an angle in radians (a whole turn is `2 * PI`).'],
    ['Maths', 'atan2', [p('y'), p('x')], 'The angle to the point (x, y), in radians.'],
    ['Maths', 'floor', [p('x')], 'Round down to a whole number.'],
    ['Maths', 'round', [p('x')], 'Round to the nearest whole number.'],
    ['Maths', 'abs', [p('x')], 'x without its minus sign.'],
    ['Maths', 'float', [p('x')], 'A number or text as a decimal: `float("2.5")` is `2.5`. nil if it isn\'t one.'],
    ['Maths', 'int', [p('x')], 'A decimal with its decimals cut off (`int(-2.7)` is `-2`), or text as a whole number (`int("42")`, nil if it isn\'t one).'],

    // text
    ['Text', 'len', [p('x')], 'How long a string, list or bytes is.'],
    ['Text', 'str', [p('x')], 'Any value as text.'],
    ['Text', 'chr', [p('code')], 'The character with this code: `chr(65)` is `"A"`.'],
    ['Text', 'ord', [p('char')], 'The code of a character: `ord("A")` is `65`.'],
    ['Text', 'sub', [p('s'), p('start'), o('count')], 'Part of a string: count characters from start (0 is the first). Without count, to the end.'],
    ['Text', 'find', [p('s'), p('part')], 'Where part first appears in s, or -1 if it isn\'t there.'],
    ['Text', 'upper', [p('s')], 'The string in capitals.'],
    ['Text', 'lower', [p('s')], 'The string in small letters.'],
    ['Text', 'split', [p('s'), o('sep')], 'Cut a string into a list at each sep (at spaces without one).'],
    ['Text', 'join', [p('list'), o('sep')], 'The items of a list as one string, with sep between them (nothing without it).'],

    // lists and bytes
    ['Lists and bytes', 'list', [p('n'), o('fill')], 'A new list of n items, each one fill (nil without it).'],
    ['Lists and bytes', 'push', [p('list'), p('x')], 'Add x to the end of a list.'],
    ['Lists and bytes', 'pop', [p('list')], 'Take the last item off a list and give it back (nil if the list is empty).'],
    ['Lists and bytes', 'insert', [p('list'), p('at'), p('x')], 'Put x into a list at position at, moving the items after it along one.'],
    ['Lists and bytes', 'remove', [p('list'), p('at')], 'Take the item at position at out of a list, and give it back.'],
    ['Lists and bytes', 'bytes', [p('n')], 'A block of n raw bytes (0 to 255), all 0.'],

    // files
    ['Files', 'rdf', [p('path')], 'Read a file as text (nil if it is missing). `rdf("notes.txt@2")` reads an old version.'],
    ['Files', 'rdb', [p('path')], 'Read a file as bytes, e.g. a picture for `image()`.'],
    ['Files', 'wrf', [p('path'), p('text')], 'Write a file, replacing what was in it.'],
    ['Files', 'apf', [p('path'), p('text')], 'Append text to the end of a file.'],
    ['Files', 'isf', [p('path')], 'Is there a file at path?'],
    ['Files', 'delf', [p('path')], 'Delete a file.'],
    ['Files', 'la', [o('dir')], 'List the names in a directory (directories end in `/`).'],
    ['Files', 'cwd', [], 'The current directory, e.g. `"/bin/"`.'],

    // a piece of a file at a time
    ['Files', 'rdat', [p('path'), p('offset'), p('count')], 'count bytes from byte offset of a file, as bytes (fewer at the end).'],
    ['Files', 'wrat', [p('path'), p('offset'), p('data')], 'Write bytes or text at offset, in place, making the file if need be. Keeps no old versions.'],
    ['Files', 'trunc', [p('path'), p('size')], 'Make a file size bytes long.'],

    // encrypted files
    ['Encrypted files', 'enc', [p('path'), p('password')], 'Encrypt a file with a password (AES-256, it keeps its name). true if it worked.'],
    ['Encrypted files', 'dec', [p('path'), p('password')], 'Decrypt a file encrypted with `enc`. true if it worked.'],
    ['Encrypted files', 'isenc', [p('path')], 'Is the file encrypted?'],
    ['Encrypted files', 'rdenc', [p('path'), p('password')], 'The contents of an encrypted file, without changing it (nil if the password is wrong).'],

    // databases
    ['Databases', 'dbopen', [p('path'), o('mode')], 'Open an AerDB database, making it if need be: a number for it, nil if it can\'t. `dbopen(path, "read")` only reads it.'],
    ['Databases', 'dbrun', [p('db'), p('sql'), o('values')], 'Run an SQL statement, giving back how many rows it changed. Each `?` takes the next of values, a list.'],
    ['Databases', 'dbquery', [p('db'), p('sql'), o('values')], 'Run a SELECT: a list of rows, each a list of its values. Each `?` takes the next of values, a list.'],
    ['Databases', 'dbclose', [p('db')], 'Close a database.'],

    // network
    ['Network', 'nsend', [p('host'), p('port'), p('text')], 'Send a sealed message to a computer the firewall allows. true if it was sent.'],
    ['Network', 'nrecv', [p('port'), p('ms')], 'Wait up to ms milliseconds for a message on port: the message, or nil.'],

    // system
    ['System', 'sleep', [p('ms')], 'Wait ms milliseconds.'],
    ['System', 'time', [], 'Milliseconds since AerOS started.'],
    ['System', 'random', [p('n')], 'A random whole number from 0 to n - 1.'],
    ['System', 'beep', [o('hz')], 'A beep on the PC speaker, at hz if given.'],
    ['System', 'play', [p('path')], 'Play a WAV or MP3 file and wait for it to finish (false if it can\'t be played).'],
    ['System', 'video', [p('path')], 'Play an .mpg video full screen with its sound, until it ends or Esc. Call `gopen()` again after it.'],
    ['System', 'exit', [], 'End the program.'],
    ['System', 'queue', [p('line')], 'Add a program to the queue the `GO` command runs, e.g. `queue("hello.aer a b")`. How many are queued (-1 if full).'],
    ['System', 'sysinfo', [], 'Everything AerOS knows about the computer, as `[group, name, value]` rows.'],
    ['System', 'appmode', [], 'Put away parts of AerOS the program doesn\'t use: `[parts used, KB put away, KB free]`.'],
    ['System', 'logadd', [p('message')], 'Add an entry to AerOS\'s log (`/sys/logs.db`), with the program\'s name as its source. Written when the program ends.'],
    ['System', 'cmd', [p('line')], 'Run a terminal command and give back what it printed, as a list of lines. Only at the prompt: programs can\'t use it.'],

    // animation
    ['Animation', 'progress', [p('x'), p('y'), p('width'), p('done'), p('total'), o('colour')], 'A bar like `[#####.....]  50%`: width cells, plus 8 for the brackets and percentage.'],
    ['Animation', 'spinner', [p('x'), p('y'), o('style'), o('colour')], 'The spinner\'s frame for this moment, style 0 to 4 (line, arrows, pulse, dots, bounce). How many cells it took.'],
    ['Animation', 'frame', [p('fps')], 'Wait until it\'s time for the next frame, so a loop runs at a steady fps.'],
    ['Animation', 'big', [p('x'), p('y'), p('text'), o('colour'), o('background')], 'Text in big letters, 8 columns by 7 rows each. How many columns wide it is.'],

    // graphics
    ['Graphics', 'gopen', [], 'Take over the screen for graphics (false if there is no graphics screen).'],
    ['Graphics', 'gclose', [], 'Give the screen back to the terminal (also happens when the program ends).'],
    ['Graphics', 'gw', [], 'The width of the graphics screen in pixels.'],
    ['Graphics', 'gh', [], 'The height of the graphics screen in pixels.'],
    ['Graphics', 'gclear', [o('colour')], 'Fill the whole screen with a colour (black without one).'],
    ['Graphics', 'rgb', [p('r'), p('g'), p('b')], 'A colour from red, green and blue, each 0 to 255: `rgb(255, 127, 0)` is `0xFF7F00`.'],
    ['Graphics', 'pixel', [p('x'), p('y'), p('colour')], 'Set one pixel.'],
    ['Graphics', 'rect', [p('x'), p('y'), p('w'), p('h'), p('colour')], 'A filled rectangle.'],
    ['Graphics', 'line', [p('x1'), p('y1'), p('x2'), p('y2'), p('colour')], 'A line from (x1, y1) to (x2, y2).'],
    ['Graphics', 'text', [p('x'), p('y'), p('text'), p('colour'), o('size')], 'Text on the graphics screen. Size 1 is 8 x 16 pixels per character.'],
    ['Graphics', 'image', [p('bytes'), p('x'), p('y'), o('w'), o('h')], 'Draw a BMP picture (8, 24 or 32 bit), scaled to fit w x h if given.'],
    ['Graphics', 'imgsz', [p('bytes')], 'A BMP picture\'s `[width, height]`, or nil if it isn\'t a BMP.'],

    // for games
    ['Games', 'gbuf', [p('on')], 'true draws into a back buffer until `gshow()`, so nothing flickers; false draws straight onto the screen.'],
    ['Games', 'gshow', [], 'Put the finished frame from the back buffer on the screen in one go.'],
    ['Games', 'keydown', [p('key')], 'Is the key held down right now? A character (`"a"`) or `KEY_LEFT`, `KEY_SPACE`... Doesn\'t wait.'],
    ['Games', 'sload', [p('path')], 'Load a WAV or MP3 into memory, ready for `splay` (nil if it can\'t).'],
    ['Games', 'splay', [p('sound'), o('loop'), o('volume')], 'Start a loaded sound and carry on straight away. volume is 0 to 100. A number for `sstop` / `isply`.'],
    ['Games', 'sstop', [o('n')], 'Stop a sound (every sound without n).'],
    ['Games', 'isply', [p('n')], 'Is the sound still playing?'],

    // the mouse
    ['Mouse', 'mouse', [], 'Where the pointer is and which buttons are held: `[x, y, buttons]`. nil if there is no mouse.'],
    ['Mouse', 'mousemove', [], 'How far the mouse moved since last asked: `[dx, dy]`. Good for turning a camera.'],
    ['Mouse', 'mousedown', [p('button')], 'Is that button held? `MOUSE_LEFT`, `MOUSE_RIGHT` or `MOUSE_MIDDLE`.'],
];

const BUILTINS = {};
for (const [group, name, params, doc] of BUILTIN_LIST) {
    BUILTINS[name] = { group, name, params, doc };
}

// name: description
const CONSTANTS = { PI: 'Pi, 3.14159... (half a turn, in radians).' };
for (const k of ['UP', 'DOWN', 'LEFT', 'RIGHT', 'HOME', 'END', 'PGUP', 'PGDN', 'DELETE', 'ENTER',
                 'BACKSPACE', 'TAB', 'ESCAPE', 'SPACE', 'SHIFT', 'CTRL', 'ALT']) {
    CONSTANTS['KEY_' + k] = 'A key code, for `key()` and `keydown()`.';
}
for (const b of ['LEFT', 'RIGHT', 'MIDDLE']) {
    CONSTANTS['MOUSE_' + b] = 'A mouse button, for `mousedown()` and the buttons of `mouse()`.';
}
for (const c of ['BLACK', 'DARK_BLUE', 'GREEN', 'CYAN', 'RED', 'PURPLE', 'ORANGE', 'BROWN', 'BRIGHT',
                 'DARK_GRAY', 'LIGHT_BLUE', 'LIGHT_GREEN', 'LIGHT_CYAN', 'LIGHT_RED', 'LIGHT_PURPLE',
                 'YELLOW', 'WHITE']) {
    CONSTANTS[c] = 'A text colour, for `color()`, `progress()`, `big()`...';
}
CONSTANTS.args = 'The list of words typed after the program\'s name.';

// whole blocks, offered beside the keyword that starts them. ${n} are the places Tab jumps to
const SNIPPETS = [
    ['if', 'if … then … end', 'if ${1:condition} then\n\t$0\nend'],
    ['if', 'if … else … end', 'if ${1:condition} then\n\t$2\nelse\n\t$0\nend'],
    ['for', 'for i = … to … do … end', 'for ${1:i} = ${2:1} to ${3:10} do\n\t$0\nend'],
    ['for', 'for … in … do … end', 'for ${1:item} in ${2:list} do\n\t$0\nend'],
    ['while', 'while … do … end', 'while ${1:condition} do\n\t$0\nend'],
    ['func', 'func …(…) … end', 'func ${1:name}(${2})\n\t$0\nend'],
    ['gopen', 'game loop', 'gopen()\ngbuf(true)\nwhile not keydown(KEY_ESCAPE) do\n\tgclear(0)\n\t$0\n\tgshow()\n\tframe(60)\nend'],
];

// "rect(x, y, w, h, colour)", with the optional arguments in [ ]
function signatureLabel (name, params) {
    return name + '(' + params.map((a) => (a.rest ? '...' + a.name : a.optional ? '[' + a.name + ']' : a.name)).join(', ') + ')';
}

module.exports = { KEYWORDS, BUILTINS, CONSTANTS, SNIPPETS, signatureLabel };
