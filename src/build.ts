import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Ajv } from "ajv";
import { simpleGit } from "simple-git";
import { convertTheme } from "./theme";
import type { SymbolsTheme } from "./types/vscode-icon-theme";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
if (
  args.some((arg) => !["--check", "--update"].includes(arg)) ||
  args.length > 1
) {
  throw new Error("Usage: bun src/build.ts [--check | --update]");
}
const check = args.includes("--check");
const update = args.includes("--update");
const lock = await Bun.file(path.join(root, "upstream.json")).json();
if (!/^[a-f0-9]{40}$/.test(lock.commit))
  throw new Error("Upstream commit must be a full Git SHA");
const cache = path.join(root, ".cache", "symbols");
await mkdir(cache, { recursive: true });
const git = simpleGit(cache);
if (!(await Bun.file(path.join(cache, ".git", "config")).exists()))
  await git.init();
let commit: string = lock.commit;
if (update) {
  const remote = await git.listRemote([lock.repository, "HEAD"]);
  commit = remote.split(/\s/)[0] ?? "";
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw new Error("Could not resolve upstream HEAD");
}
try {
  await git.raw(["cat-file", "-e", `${commit}^{commit}`]);
} catch {
  await git.fetch(lock.repository, commit, ["--depth=1"]);
}
await git.checkout(["--detach", commit]);
const source: SymbolsTheme = await Bun.file(
  path.join(cache, "src/symbol-icon-theme.json"),
).json();
const manifest = Bun.TOML.parse(
  await Bun.file(path.join(root, "extension.toml")).text(),
) as { authors: string[] };
const family = convertTheme(source, manifest.authors.join(", "));
const schema = await Bun.file(
  path.join(root, "schemas/icon-theme.json"),
).json();
const validate = new Ajv({ strict: false }).compile(schema);
if (!validate(family))
  throw new Error(JSON.stringify(validate.errors, null, 2));
const outputs = new Map<string, Uint8Array>();
const encode = (text: string) => new TextEncoder().encode(text);
outputs.set(
  "icon_themes/glyph.json",
  encode(`${JSON.stringify(family, null, 2)}\n`),
);
outputs.set("LICENSE.symbols", await readFile(path.join(cache, "LICENSE")));
for (const theme of family.themes) {
  for (const { path: iconPath } of Object.values(theme.file_icons)) {
    const bytes = await readFile(path.join(cache, "src", iconPath));
    if (!new TextDecoder().decode(bytes).includes("<svg"))
      throw new Error(`Invalid SVG: ${iconPath}`);
    outputs.set(iconPath.replace(/^\.\//, ""), bytes);
  }
}
if (update) {
  outputs.set(
    "upstream.json",
    encode(
      `${JSON.stringify({ repository: lock.repository, commit }, null, 2)}\n`,
    ),
  );
}
// Validate and read all inputs before writing generated artifacts.
const mismatches: string[] = [];
for (const [relative, bytes] of outputs) {
  const destination = path.join(root, relative);
  if (check) {
    const file = Bun.file(destination);
    if (
      !(await file.exists()) ||
      !Buffer.from(await file.arrayBuffer()).equals(Buffer.from(bytes))
    )
      mismatches.push(relative);
  } else {
    await mkdir(path.dirname(destination), { recursive: true });
    await Bun.write(destination, bytes);
  }
}
if (mismatches.length)
  throw new Error(
    `Generated files are out of date. Run bun run build:\n${mismatches.join("\n")}`,
  );
console.log(
  `${check ? "Verified" : "Built"} Glyph: ${outputs.size - 2 - Number(update)} icons, Symbols commit ${commit.slice(0, 12)}.`,
);
