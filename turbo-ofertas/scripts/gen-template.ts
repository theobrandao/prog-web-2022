import { writeFile } from "node:fs/promises";
import { buildTemplate } from "../src/services/importRunner.js";

const out = process.argv[2] ?? "template-entrada.xlsx";
const buf = await buildTemplate();
await writeFile(out, buf);
console.log(`Template gerado: ${out} (${buf.length} bytes)`);
