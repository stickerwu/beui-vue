// Extracts the API reference beui.dev shows for every registry file (react-docgen
// through upstream lib/props-extractor.ts) into vue/upstream-props.json, so the Vue
// docs can show the same prop descriptions and defaults. Run from the repo root:
//   bun vue/scripts/upstream-props.ts
import { writeFileSync } from "node:fs";
import { getComponentProps } from "@/lib/props-extractor";
import { registry } from "@/lib/registry";

const files = new Set<string>();
for (const category of registry) {
  for (const comp of category.components) {
    files.add(comp.file);
    for (const example of comp.examples ?? []) files.add(example.file);
  }
}

const out: Record<string, ReturnType<typeof getComponentProps>> = {};
for (const file of [...files].sort()) out[file] = getComponentProps(file);
writeFileSync("vue/upstream-props.json", `${JSON.stringify(out, null, 1)}\n`);
console.log(`${files.size} files, ${Object.values(out).flat().reduce((n, doc) => n + doc.props.length, 0)} props`);
