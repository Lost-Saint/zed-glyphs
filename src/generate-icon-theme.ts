import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Ajv } from "ajv";
import { simpleGit } from "simple-git";
import { parseExtensionManifest, parseSymbolsTheme, parseUpstreamSource } from "./input-validation";
import { createZedIconThemeFamily } from "./symbols-theme-converter";

const projectRoot = path.resolve(import.meta.dirname, "..");
const cliArguments = process.argv.slice(2);
if (
	cliArguments.some((argument) => !["--check", "--update"].includes(argument)) ||
	cliArguments.length > 1
) {
	throw new Error("Usage: bun src/generate-icon-theme.ts [--check | --update]");
}
const isCheckMode = cliArguments.includes("--check");
const isUpdateMode = cliArguments.includes("--update");
const upstreamSource = parseUpstreamSource(
	await Bun.file(path.join(projectRoot, "upstream.json")).json(),
);
const symbolsCacheDirectory = path.join(projectRoot, ".cache", "symbols");
await mkdir(symbolsCacheDirectory, { recursive: true });
const symbolsRepository = simpleGit(symbolsCacheDirectory);
if (!(await Bun.file(path.join(symbolsCacheDirectory, ".git", "config")).exists()))
	await symbolsRepository.init();
let upstreamCommit: string = upstreamSource.commit;
if (isUpdateMode) {
	const remoteHead = await symbolsRepository.listRemote([upstreamSource.repository, "HEAD"]);
	upstreamCommit = remoteHead.split(/\s/)[0] ?? "";
	if (!/^[a-f0-9]{40}$/.test(upstreamCommit)) throw new Error("Could not resolve upstream HEAD");
}
try {
	await symbolsRepository.raw(["cat-file", "-e", `${upstreamCommit}^{commit}`]);
} catch {
	await symbolsRepository.fetch(upstreamSource.repository, upstreamCommit, ["--depth=1"]);
}
await symbolsRepository.checkout(["--detach", upstreamCommit]);
if (!(await symbolsRepository.status()).isClean()) {
	throw new Error(
		"Cached Symbols checkout has local changes; review .cache/symbols before rebuilding",
	);
}
const symbolsTheme = parseSymbolsTheme(
	await Bun.file(path.join(symbolsCacheDirectory, "src/symbol-icon-theme.json")).json(),
);
const extensionManifest = parseExtensionManifest(
	Bun.TOML.parse(await Bun.file(path.join(projectRoot, "extension.toml")).text()),
);
const packageManifest = await Bun.file(path.join(projectRoot, "package.json")).json();
if (packageManifest.version !== extensionManifest.version)
	throw new Error("package.json and extension.toml versions must match");
const zedIconThemeFamily = createZedIconThemeFamily(
	symbolsTheme,
	extensionManifest.authors.join(", "),
	extensionManifest.name,
);
const iconThemeSchema = await Bun.file(path.join(projectRoot, "schemas/icon-theme.json")).json();
const validateIconTheme = new Ajv({ strict: false }).compile(iconThemeSchema);
if (!validateIconTheme(zedIconThemeFamily))
	throw new Error(JSON.stringify(validateIconTheme.errors, null, 2));
const generatedFiles = new Map<string, Uint8Array>();
const encodeUtf8 = (text: string) => new TextEncoder().encode(text);
generatedFiles.set(
	"icon_themes/glyph.json",
	encodeUtf8(`${JSON.stringify(zedIconThemeFamily, null, 2)}\n`),
);
const upstreamLicense = await Bun.file(path.join(symbolsCacheDirectory, "LICENSE")).text();
const projectLicense = await Bun.file(path.join(projectRoot, "LICENSE")).text();
// Keep upstream's copyright and permission notice in the combined license.
for (const paragraph of upstreamLicense
	.trim()
	.split(/\r?\n\r?\n/)
	.slice(1)) {
	if (!projectLicense.replace(/\r\n/g, "\n").includes(paragraph.replace(/\r\n/g, "\n"))) {
		throw new Error(
			"LICENSE must preserve the upstream Symbols copyright and permission notice",
		);
	}
}
for (const zedTheme of zedIconThemeFamily.themes) {
	for (const { path: iconPath } of Object.values(zedTheme.file_icons)) {
		const relativePath = iconPath.replace(/^\.\//, "");
		if (generatedFiles.has(relativePath)) continue;
		const iconBytes = await readFile(path.join(symbolsCacheDirectory, "src", iconPath));
		if (!new TextDecoder().decode(iconBytes).includes("<svg"))
			throw new Error(`Invalid SVG: ${iconPath}`);
		generatedFiles.set(relativePath, iconBytes);
	}
}
if (isUpdateMode) {
	generatedFiles.set(
		"upstream.json",
		encodeUtf8(
			`${JSON.stringify({ repository: upstreamSource.repository, commit: upstreamCommit }, null, 2)}\n`,
		),
	);
}
// Validate and read all inputs before writing generated artifacts.
const mismatchedFiles: string[] = [];
for (const [relativePath, fileBytes] of generatedFiles) {
	const destinationPath = path.join(projectRoot, relativePath);
	if (isCheckMode) {
		const generatedFile = Bun.file(destinationPath);
		if (
			!(await generatedFile.exists()) ||
			!Buffer.from(await generatedFile.arrayBuffer()).equals(Buffer.from(fileBytes))
		)
			mismatchedFiles.push(relativePath);
	} else {
		await mkdir(path.dirname(destinationPath), { recursive: true });
		await Bun.write(destinationPath, fileBytes);
	}
}
if (mismatchedFiles.length)
	throw new Error(
		`Generated files are out of date. Run bun run build:\n${mismatchedFiles.join("\n")}`,
	);
console.log(
	`${isCheckMode ? "Verified" : "Built"} ${extensionManifest.name}: ${[...generatedFiles.keys()].filter((filePath) => filePath.startsWith("icons/")).length} icons, Symbols commit ${upstreamCommit.slice(0, 12)}.`,
);
