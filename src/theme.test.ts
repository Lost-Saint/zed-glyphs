import { expect, test } from "bun:test";
import { convertSymbolsTheme } from "./theme";
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
  const theme = convertSymbolsTheme(fixture(), "Maintainer").themes[0];
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
  const [dark, light] = convertSymbolsTheme(source, "Maintainer").themes;
  expect(dark?.file_icons.code?.path).toBe("./icons/files/code.svg");
  expect(light?.file_icons.code?.path).toBe("./icons/files/code-light.svg");
  expect(light?.file_stems["Cargo.toml"]).toBe("code");
});

test("repairs upstream LESS association from its language mapping", () => {
  const source = fixture();
  source.fileExtensions = { less: "less" };
  source.languageIds = { less: "code" };
  expect(
    convertSymbolsTheme(source, "Maintainer").themes[0]?.file_icons.less?.path,
  ).toBe("./icons/files/code.svg");
});

test("rejects missing definitions and paths outside bundled icons", () => {
  const source = fixture();
  source.fileExtensions = { broken: "missing" };
  expect(() => convertSymbolsTheme(source, "Maintainer")).toThrow(
    "Missing upstream icon definition",
  );
  source.fileExtensions = {};
  source.iconDefinitions.document = { iconPath: "../secret.svg" };
  expect(() => convertSymbolsTheme(source, "Maintainer")).toThrow(
    "Unsupported icon path",
  );
});

test("expanded-only folder mappings use the default collapsed icon", () => {
  const source = fixture();
  source.folderNamesExpanded = { special: "open" };
  const theme = convertSymbolsTheme(source, "Maintainer").themes[0];
  expect(theme?.named_directory_icons.special).toEqual({
    collapsed: "./icons/folders/folder.svg",
    expanded: "./icons/folders/folder-open.svg",
  });
});

test("light language overrides preserve the base LESS fallback", () => {
  const source = fixture();
  source.fileExtensions = { less: "less" };
  source.languageIds = { less: "code" };
  source.light = { languageIds: { javascript: "code" } };
  expect(
    convertSymbolsTheme(source, "Maintainer").themes[1]?.file_icons.less?.path,
  ).toBe("./icons/files/code.svg");
});

test("case aliases preserve explicit mappings and special object keys", () => {
  const source = fixture();
  source.fileNames = JSON.parse(
    '{"README":"code","readme":"git","constructor":"code","__proto__":"git"}',
  );
  const theme = convertSymbolsTheme(source, "Maintainer").themes[0];
  expect(theme?.file_stems.README).toBe("code");
  expect(theme?.file_stems.readme).toBe("git");
  const entries = new Map(Object.entries(theme?.file_stems ?? {}));
  expect(entries.get("constructor")).toBe("code");
  expect(entries.get("__proto__")).toBe("git");
});
