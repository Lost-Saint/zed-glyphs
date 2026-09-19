import { Ajv, type Schema, type ValidateFunction } from "ajv";
import type { SymbolsTheme } from "./types/vscode-icon-theme";

interface UpstreamSource {
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

const ajv = new Ajv({ allErrors: true });
const nonEmptyString = { type: "string", minLength: 1 };
const associations = { type: "object", additionalProperties: nonEmptyString };
const iconDefinitions = {
  type: "object",
  additionalProperties: {
    type: "object",
    required: ["iconPath"],
    properties: { iconPath: nonEmptyString },
  },
};
const variantProperties = {
  ...Object.fromEntries(
    [
      "file",
      "folder",
      "folderExpanded",
      "rootFolder",
      "rootFolderExpanded",
    ].map((key) => [key, nonEmptyString]),
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
    ].map((key) => [key, associations]),
  ),
  iconDefinitions,
};

function parser<T>(label: string, schema: Schema): (input: unknown) => T {
  const validate: ValidateFunction<T> = ajv.compile<T>(schema);
  return (input) => {
    if (!validate(input)) {
      throw new Error(`Invalid ${label}: ${ajv.errorsText(validate.errors)}`);
    }
    return input;
  };
}

export const parseUpstreamSource = parser<UpstreamSource>("upstream.json", {
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

export const parseSymbolsTheme = parser<SymbolsTheme>("Symbols theme", {
  type: "object",
  required: ["iconDefinitions", "file", "folder"],
  properties: {
    ...variantProperties,
    light: { type: "object", properties: variantProperties },
    highContrast: { type: "object", properties: variantProperties },
  },
});

export const parseExtensionManifest = parser<ExtensionManifest>(
  "extension.toml",
  {
    type: "object",
    required: [
      "id",
      "name",
      "version",
      "schema_version",
      "authors",
      "description",
      "repository",
    ],
    properties: {
      id: {
        type: "string",
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*-(?:icons|icon-theme)$",
      },
      name: nonEmptyString,
      version: {
        type: "string",
        pattern: "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$",
      },
      schema_version: { const: 1 },
      authors: { type: "array", minItems: 1, items: nonEmptyString },
      description: nonEmptyString,
      repository: {
        type: "string",
        pattern: "^https://github\\.com/[^/\\s]+/[^/\\s]+$",
      },
    },
  },
);
