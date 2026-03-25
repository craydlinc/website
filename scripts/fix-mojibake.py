"""Replace common UTF-8 mojibake / double-encoding in HTML files with named entities."""
from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Order: longer / more specific sequences first where relevant.
REPLACEMENTS: list[tuple[bytes, bytes]] = [
    (b"\xc3\xa2\xe2\x82\xac\xe2\x80\x9d", b"&mdash;"),
    (b"\xc3\xa2\xe2\x82\xac\xe2\x80\x9c", b"&ndash;"),
    (b"\xc3\xa2\xe2\x82\xac\xc2\xa6", b"&hellip;"),
    (b"\xc3\xa2\xe2\x80\xa0\xe2\x80\x99", b"&rarr;"),
    # UTF-8 U+2630 (hamburger) mis-decoded as Latin-1 and re-encoded
    (b"\xc3\xa2\xcb\x9c\xc2\xb0", b"&#9776;"),
    (b"\xc3\x82\xc2\xb0", b"&deg;"),
    (b"\xc3\x82\xc2\xbc", b"&frac14;"),
    (b"\xc3\x82\xc2\xb7", b"&middot;"),
    (b"\xc3\x82\xc2\xa9", b"&copy;"),
]


def main() -> None:
    for path in sorted(ROOT.rglob("*.html")):
        data = path.read_bytes()
        new = data
        for old, repl in REPLACEMENTS:
            new = new.replace(old, repl)
        if new != data:
            path.write_bytes(new)
            print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
