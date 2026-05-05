import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(
  __dirname,
  "../node_modules/@types/express-serve-static-core/index.d.ts"
);

try {
  let content = readFileSync(filePath, "utf-8");
  // Fix Express 5 ParamsDictionary: change `string | string[]` to `string`
  // so req.params.id resolves to string instead of string | string[]
  const old = "[key: string]: string | string[];";
  const replacement = "[key: string]: string;";
  if (content.includes(old)) {
    content = content.replace(old, replacement);
    writeFileSync(filePath, content, "utf-8");
    console.log("✔ Patched ParamsDictionary in @types/express-serve-static-core");
  } else if (content.includes(replacement)) {
    console.log("✔ ParamsDictionary already patched");
  } else {
    console.warn("⚠ Could not find ParamsDictionary to patch");
  }
} catch (err) {
  console.warn("⚠ Postinstall patch skipped:", err.message);
}
