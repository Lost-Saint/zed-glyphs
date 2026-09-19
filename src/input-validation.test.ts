import { expect, test } from "bun:test";
import { parseExtensionManifest, parseSymbolsTheme, parseUpstreamSource } from "./input-validation";

test("rejects malformed upstream metadata before invoking Git", () => {
	const upstreamSource = {
		repository: "https://github.com/miguelsolorio/vscode-symbols.git",
		commit: "a".repeat(40),
	};
	expect(parseUpstreamSource(upstreamSource)).toEqual(upstreamSource);
	expect(() => parseUpstreamSource({ ...upstreamSource, commit: "main" })).toThrow(
		"Invalid upstream.json",
	);
	expect(() =>
		parseUpstreamSource({
			...upstreamSource,
			repository: "--upload-pack=example",
		}),
	).toThrow("Invalid upstream.json");
});

test("rejects non-image definitions and malformed light mappings", () => {
	const symbolsTheme = {
		file: "file",
		folder: "folder",
		iconDefinitions: {
			file: { iconPath: "./icons/files/file.svg" },
			folder: { iconPath: "./icons/folders/folder.svg" },
		},
	};
	expect(parseSymbolsTheme(symbolsTheme)).toEqual(symbolsTheme);
	expect(() =>
		parseSymbolsTheme({
			...symbolsTheme,
			iconDefinitions: { file: { fontCharacter: "x" } },
		}),
	).toThrow("iconPath");
	expect(() =>
		parseSymbolsTheme({
			...symbolsTheme,
			light: { folderNamesExpanded: { src: 42 } },
		}),
	).toThrow("Invalid Symbols theme");
});

test("validates the real extension manifest and rejects missing metadata", async () => {
	const manifest = Bun.TOML.parse(
		await Bun.file(new URL("../extension.toml", import.meta.url)).text(),
	);
	expect(parseExtensionManifest(manifest).id).toBe("glyph-icons");
	expect(() => parseExtensionManifest({ ...manifest, authors: [] })).toThrow(
		"Invalid extension.toml",
	);
	expect(() => parseExtensionManifest({ ...manifest, id: "glyph" })).toThrow(
		"Invalid extension.toml",
	);
});
