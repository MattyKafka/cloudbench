#!/usr/bin/env python3
"""Build a clean publish folder for CloudBench using Python's standard library.

Usage: python scripts/build.py
This copies only public web assets and omits development files, docs and Git data.
"""
from pathlib import Path
import shutil
import hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
INCLUDE = ["index.html", "styles.css", "app.js", "assets", "data", "tests"]
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for relative in INCLUDE:
    src = ROOT / relative
    target = OUT / relative
    if not src.exists():
        raise SystemExit(f"Build file is missing: {src}")
    if src.is_dir():
        shutil.copytree(src, target)
    else:
        shutil.copy2(src, target)
files = sorted(p for p in OUT.rglob("*") if p.is_file())
digest = hashlib.sha256()
for file in files:
    digest.update(file.relative_to(OUT).as_posix().encode())
    digest.update(file.read_bytes())
print(f"Created {OUT} ({len(files)} published files)")
print("Combined build content hash:", digest.hexdigest())
