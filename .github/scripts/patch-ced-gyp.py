"""
Patch ced/vendor/compact_enc_det/binding.gyp to add msvs_settings.

Background: ced's vendor binding.gyp has -Wno-narrowing in cflags_cc (Linux)
and xcode_settings (macOS), but no Windows/MSVC-equivalent. With Electron 42
requiring ClangCL on Windows, the missing flag breaks compilation with
-Wc++11-narrowing errors. Inject msvs_settings.VCCLCompilerTool.AdditionalOptions.
"""
import sys
from pathlib import Path

p = Path("node_modules/ced/vendor/compact_enc_det/binding.gyp")
if not p.exists():
    print(f"ERROR: {p} not found", file=sys.stderr)
    sys.exit(1)

content = p.read_text(encoding="utf-8")

if "msvs_settings" in content:
    print("already patched, skipping")
    sys.exit(0)

inj = (
    '"msvs_settings": {\n'
    '        "VCCLCompilerTool": {\n'
    '          "AdditionalOptions": [ "-Wno-c++11-narrowing", "-w" ]\n'
    '        }\n'
    '      },\n'
    '      '
)

needle = '"xcode_settings":'
if needle not in content:
    print("ERROR: xcode_settings anchor not found", file=sys.stderr)
    sys.exit(1)

patched = content.replace(needle, inj + needle, 1)
p.write_text(patched, encoding="utf-8")
print(f"patched {p}")
print("--- new content ---")
print(patched)
