import { expect, test } from "bun:test";
import { convertTheme } from "./theme";
import type { SymbolsTheme } from "./types/vscode-icon-theme";

function fixture(): SymbolsTheme {
  return {
    iconDefinitions: {
      document: { iconPath: "./icons/files/document.svg" },
      code: { iconPath: "./icons/files/code.svg" },
      git: { iconPath: "./icons/files/git.svg" },
      folder: { iconPath: "./icons/folders/folder.svg" },
      open: { iconPath: "./icons/folders/folder-open.svg" },
    },
    file: "document",
    folder: "folder",
    fileNames: { "Cargo.toml": "code", ".gitignore": "git" },
    fileExtensions: { "d.ts": "code" },
    folderNames: { src: "folder" },
    folderNamesExpanded: { src: "open" },
  };
}

test("preserves IDs, mixed-case filenames, compound suffixes and default", () => {
  const theme = convertTheme(fixture(), "Maintainer").themes[0];
  if (!theme) throw new Error("Expected a dark theme");
  expect(theme.file_stems["Cargo.toml"]).toBe("code");
  expect(theme.file_stems["cargo.toml"]).toBe("code");
  expect(theme.file_stems[".gitignore"]).toBe("git");
  expect(theme.file_icons.git?.path).toBe("./icons/files/git.svg");
  expect(theme.file_suffixes["d.ts"]).toBe("code");
  expect(theme.file_icons.default?.path).toBe("./icons/files/document.svg");
  expect(theme.named_directory_icons.src?.expanded).toBe(
    "./icons/folders/folder-open.svg",
  );
});

test("light overrides inherit other mappings without altering dark icons", () => {
  const source = fixture();
  source.light = {
    iconDefinitions: { code: { iconPath: "./icons/files/code-light.svg" } },
  };
  const [dark, light] = convertTheme(source, "Maintainer").themes;
  expect(dark?.file_icons.code?.path).toBe("./icons/files/code.svg");
  expect(light?.file_icons.code?.path).toBe("./icons/files/code-light.svg");
  expect(light?.file_stems["Cargo.toml"]).toBe("code");
});

test("repairs upstream LESS association from its language mapping", () => {
  const source = fixture();
  source.fileExtensions = { less: "less" };
  source.languageIds = { less: "code" };
  expect(
    convertTheme(source, "Maintainer").themes[0]?.file_icons.less?.path,
  ).toBe("./icons/files/code.svg");
});

test("rejects missing definitions and paths outside bundled icons", () => {
  const source = fixture();
  source.fileExtensions = { broken: "missing" };
  expect(() => convertTheme(source, "Maintainer")).toThrow(
    "Missing upstream icon definition",
  );
  source.fileExtensions = {};
  source.iconDefinitions.document = { iconPath: "../secret.svg" };
  expect(() => convertTheme(source, "Maintainer")).toThrow(
    "Unsupported icon path",
  );
});
