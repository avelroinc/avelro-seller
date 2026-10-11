// theme.css üretir: src/ altındaki stil dosyaları ad sırasıyla birleştirilir, yorumlar ve boş satırlar atılır, çıktı
// sistemin tema doğrulamasıyla aynı kurallardan geçirilir (ters bölü kaçışı, @import, betik ifadeleri ve data: dışı url() yasak).
import {readdirSync,readFileSync,writeFileSync} from "node:fs";

const files=readdirSync("src").filter(f=>f.endsWith(".css")).sort();
const css=files.map(f=>readFileSync(`src/${f}`,"utf8")).join("\n")
 .replace(/\/\*[\s\S]*?\*\//g,"").split(/\r?\n/).map(l=>l.trimEnd()).filter(Boolean).join("\n")+"\n";

const errors=[];
if(css.includes("\\"))errors.push("ters bölü (\\) kaçışı");
if(/@import/i.test(css))errors.push("@import");
if(/image-set\s*\([^)]*["']|@namespace|@document|expression\s*\(|javascript:|(?<![\w-])behavior\s*:|-moz-binding|<\/?\s*(script|style)/i.test(css))errors.push("izin verilmeyen ifade (image-set adresi, @namespace, @document, expression, javascript:, behavior, -moz-binding, script / style etiketi)");
for(const m of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi))if(!/^data:(image\/(png|jpeg|gif|webp|avif|svg\+xml)|font\/)/i.test(m[2].trim()))errors.push(`dış adres: ${m[2].slice(0,60)}`);
const bytes=Buffer.byteLength(css);
if(bytes>1_500_000)errors.push(`boyut ${bytes} bayt (sınır 1.500.000)`);
if(errors.length){console.error("theme.css üretilmedi:\n- "+errors.join("\n- "));process.exit(1)}

writeFileSync("theme.css",css);
console.log(`theme.css: ${files.length} dosya, ${(bytes/1024).toFixed(1)} KB`);
