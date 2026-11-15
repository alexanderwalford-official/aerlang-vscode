"""
tools/package.py
Builds the extension into a .vsix file, the package VS Code installs from:

    python tools/package.py                  makes aerlang-<version>.vsix in the repo's top folder
    code --install-extension aerlang-<version>.vsix

It does what Microsoft's `vsce package` does for an extension like this one (no npm
dependencies, nothing to compile), with only Python's standard library, so neither Node nor
npm is needed. A .vsix is a zip: the extension's files under extension/, a manifest that
describes it (extension.vsixmanifest) and a list of the file types inside ([Content_Types].xml).
"""

import json
import os
import sys
import zipfile
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# the files that go into the package, as (path in the repo, path in the package). Tests,
# examples and tools stay out: VS Code only needs what runs, and the pages shown in its
# Extensions view (README, CHANGELOG, LICENSE)
FILES = [
    ("package.json", "extension/package.json"),
    ("extension.js", "extension/extension.js"),
    ("language.js", "extension/language.js"),
    ("analysis.js", "extension/analysis.js"),
    ("language-configuration.json", "extension/language-configuration.json"),
    ("syntaxes/aerlang.tmLanguage.json", "extension/syntaxes/aerlang.tmLanguage.json"),
    ("README.md", "extension/README.md"),
    ("CHANGELOG.md", "extension/CHANGELOG.md"),
    ("LICENSE", "extension/LICENSE.txt"),
]

CONTENT_TYPES = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".txt" ContentType="text/plain"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
"""


def manifest(pkg):
    """The extension.vsixmanifest for package.json's contents"""
    repo = pkg.get("repository", {}).get("url", "")
    return f"""<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{escape(pkg['name'])}" Version="{escape(pkg['version'])}" Publisher="{escape(pkg['publisher'])}"/>
    <DisplayName>{escape(pkg['displayName'])}</DisplayName>
    <Description xml:space="preserve">{escape(pkg['description'])}</Description>
    <Tags>{escape(','.join(pkg.get('keywords', [])))}</Tags>
    <Categories>{escape(','.join(pkg.get('categories', [])))}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{escape(pkg['engines']['vscode'])}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/>
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value=""/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="{escape(repo)}"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.GitHub" Value="{escape(repo)}"/>
    </Properties>
    <License>extension/LICENSE.txt</License>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/CHANGELOG.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE.txt" Addressable="true"/>
  </Assets>
</PackageManifest>
"""


def main():
    with open(os.path.join(ROOT, "package.json"), encoding="utf-8") as f:
        pkg = json.load(f)

    missing = [src for src, _ in FILES if not os.path.isfile(os.path.join(ROOT, src))]
    if missing:
        sys.exit("missing: " + ", ".join(missing))

    out = os.path.join(ROOT, f"{pkg['name']}-{pkg['version']}.vsix")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("extension.vsixmanifest", manifest(pkg))
        for src, dest in FILES:
            z.write(os.path.join(ROOT, src), dest)
    print(f"made {os.path.relpath(out, ROOT)} ({os.path.getsize(out) // 1024} KB, {len(FILES)} files)")
    print(f"install it with:  code --install-extension {os.path.basename(out)}")


if __name__ == "__main__":
    main()
