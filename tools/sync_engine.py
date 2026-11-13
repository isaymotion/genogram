#!/usr/bin/env python3
"""Keeps the genogram drawing code identical in the Genogram app and in PsychInterview.

The shared block lives in js/genogram-engine.js (this repo) between the BEGIN / END marks, and in
case-psychinterview/index.html between the same two marks. Edit it HERE, then run:

    python3 tools/sync_engine.py ../case-psychinterview          copy the block into PsychInterview
    python3 tools/sync_engine.py ../case-psychinterview --check   only compare (exit 1 if they differ)
"""
import pathlib, sys

BEGIN, END = '/* ===== BEGIN shared block ===== */', '/* ===== END shared block ===== */'
here = pathlib.Path(__file__).resolve().parent.parent

def block(text, name):
    if text.count(BEGIN) != 1 or text.count(END) != 1:
        sys.exit(f'{name}: expected exactly one BEGIN and one END mark')
    a, b = text.index(BEGIN) + len(BEGIN), text.index(END)
    return a, b, text[a:b]

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    # Use the checkout you are standing in (main), not this branch's older copy of the engine.
    local = pathlib.Path.cwd() / 'js' / 'genogram-engine.js'
    engine = (local if local.exists() else here / 'js' / 'genogram-engine.js').read_text(encoding='utf-8')
    target = pathlib.Path(args[0]) / 'index.html'
    page = target.read_text(encoding='utf-8')
    _, _, src = block(engine, 'genogram-engine.js')
    a, b, cur = block(page, str(target))
    if cur == src:
        print('In step: both apps have the same drawing code.')
        return
    if '--check' in sys.argv:
        sys.exit('DIFFERENT: run without --check to copy the block into PsychInterview.')
    target.write_text(page[:a] + src + page[b:], encoding='utf-8')
    print(f'Copied the shared block into {target} ({len(src)} characters). Bump its version and sw.js cache name.')

main()
