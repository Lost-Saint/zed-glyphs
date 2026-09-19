import { Ajv, type Schema, type ValidateFunction } from "ajv";
import type { SymbolsTheme } from "./types/symbols-icon-theme";

interface UpstreamSourceConfig {
	repository: string;
	commit: string;
}

interface ExtensionManifest {
	id: string;
	name: string;
	version: string;
	schema_version: number;
	authors: string[];
	description: string;
	repository: string;
}

const inputValidator = new Ajv({ allErrors: true });
const nonEmptyStringSchema = { type: "string", minLength: 1 };
const associationMapSchema = {
	type: "object",
	additionalProperties: nonEmptyStringSchema,
};
const iconDefinitionsSchema = {
	type: "object",
	additionalProperties: {
		type: "object",
		required: ["iconPath"],
		properties: { iconPath: nonEmptyStringSchema },
	},
};
const themeVariantSchemaProperties = {
	...Object.fromEntries(
		["file", "folder", "folderExpanded", "rootFolder", "rootFolderExpanded"].map((key) => [
			key,
			nonEmptyStringSchema,
		]),
	),
	...Object.fromEntries(
		[
			"fileNames",
			"fileExtensions",
			"languageIds",
			"folderNames",
			"folderNamesExpanded",
			"rootFolderNames",
			"rootFolderNamesExpanded",
		].map((key) => [key, associationMapSchema]),
	),
	iconDefinitions: iconDefinitionsSchema,
};

function createSchemaParser<T>(inputName: string, schema: Schema): (input: unknown) => T {
	const validateInput: ValidateFunction<T> = inputValidator.compile<T>(schema);
	return (input) => {
		if (!validateInput(input)) {
			throw new Error(
				`Invalid ${inputName}: ${inputValidator.errorsText(validateInput.errors)}`,
			);
		}
		return input;
	};
}

const textDecoder = new TextDecoder();

// Upstream icons are plain SVG documents, with or without an XML prolog.
export function isSvgDocument(fileBytes: Uint8Array): boolean {
	const text = textDecoder
		.decode(fileBytes)
		.replace(/^\uFEFF/, "")
		.trimStart();
	const withoutProlog = text.startsWith("<?xml") ? text.replace(/^<\?xml[^>]*\?>\s*/, "") : text;
	return /^<svg[\s>]/.test(withoutProlog);
}

// The project license must reproduce every paragraph of the upstream license
// so its copyright and permission notice survive verbatim.
export function assertUpstreamLicensePreserved(
	upstreamLicense: string,
	projectLicense: string,
): void {
	const normalize = (text: string) => text.replace(/\r\n/g, "\n");
	const projectText = normalize(projectLicense);
	for (const paragraph of normalize(upstreamLicense)
		.trim()
		.split(/\n\s*\n/)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)) {
		if (!projectText.includes(paragraph)) {
			const excerpt = paragraph.slice(0, 120);
			throw new Error(
				`LICENSE.md must preserve the upstream notice; missing paragraph: ${excerpt}`,
			);
		}
	}
}

export const parseUpstreamSource = createSchemaParser<UpstreamSourceConfig>("upstream.json", {
	type: "object",
	required: ["repository", "commit"],
	additionalProperties: false,
	properties: {
		repository: {
			const: "https://github.com/miguelsolorio/vscode-symbols.git",
		},
		commit: { type: "string", pattern: "^[a-f0-9]{40}$" },
	},
});

export const parseSymbolsTheme = createSchemaParser<SymbolsTheme>("Symbols theme", {
	type: "object",
	required: ["iconDefinitions", "file", "folder"],
	additionalProperties: false,
	properties: {
		$schema: { type: "string" },
		fonts: { type: "array" },
		hidesExplorerArrows: { type: "boolean" },
		showLanguageModeIcons: { type: "boolean" },
		...themeVariantSchemaProperties,
		light: {
			type: "object",
			additionalProperties: false,
			properties: themeVariantSchemaProperties,
		},
		highContrast: {
			type: "object",
			additionalProperties: false,
			properties: themeVariantSchemaProperties,
		},
	},
});

export const parseExtensionManifest = createSchemaParser<ExtensionManifest>("extension.toml", {
	type: "object",
	required: ["id", "name", "version", "schema_version", "authors", "description", "repository"],
	properties: {
		id: {
			type: "string",
			pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*-(?:icons|icon-theme)$",
		},
		name: nonEmptyStringSchema,
		version: {
			type: "string",
			pattern: "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$",
		},
		schema_version: { const: 1 },
		authors: { type: "array", minItems: 1, items: nonEmptyStringSchema },
		description: nonEmptyStringSchema,
		repository: {
			type: "string",
			pattern: "^https://github\\.com/[^/\\s]+/[^/\\s]+$",
		},
	},
});
