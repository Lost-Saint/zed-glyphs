import { expect, test } from "bun:test";
import {
	assertUpstreamLicensePreserved,
	isSvgDocument,
	parseExtensionManifest,
	parseSymbolsTheme,
	parseUpstreamSource,
} from "./input-validation";

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

test("rejects unknown theme keys but keeps per-variant image definitions", () => {
	const symbolsTheme = {
		file: "file",
		folder: "folder",
		iconDefinitions: {
			file: { iconPath: "./icons/files/file.svg" },
			folder: { iconPath: "./icons/folders/folder.svg" },
		},
	};
	expect(() => parseSymbolsTheme({ ...symbolsTheme, fileExtenions: { md: "file" } })).toThrow(
		"Invalid Symbols theme",
	);
	expect(() =>
		parseSymbolsTheme({ ...symbolsTheme, light: { folderMapping: { src: "folder" } } }),
	).toThrow("Invalid Symbols theme");
	const withLightIcons = {
		...symbolsTheme,
		light: { iconDefinitions: { file: { iconPath: "./icons/files/file-light.svg" } } },
	};
	expect(parseSymbolsTheme(withLightIcons)).toEqual(withLightIcons);
});

test("detects SVG documents with or without an XML prolog", () => {
	const encode = (text: string) => new TextEncoder().encode(text);
	expect(isSvgDocument(encode('<svg width="24"></svg>'))).toBe(true);
	expect(isSvgDocument(encode('<?xml version="1.0"?>\n<svg></svg>'))).toBe(true);
	expect(isSvgDocument(encode(`${String.fromCharCode(0xfeff)}<svg></svg>`))).toBe(true);
	expect(isSvgDocument(encode("<html><svg></svg></html>"))).toBe(false);
	expect(isSvgDocument(encode("not an image <svg>"))).toBe(false);
	expect(isSvgDocument(encode("<svgfoo>"))).toBe(false);
});

test("requires every upstream license paragraph in the project license", () => {
	const upstreamLicense = "MIT License\n\nCopyright (c) Example\n\nPermission granted.";
	expect(() => assertUpstreamLicensePreserved(upstreamLicense, "A different license")).toThrow(
		"must preserve the upstream notice",
	);
	expect(
		assertUpstreamLicensePreserved(upstreamLicense, `My license\n\n${upstreamLicense}\n`),
	).toBeUndefined();
});
