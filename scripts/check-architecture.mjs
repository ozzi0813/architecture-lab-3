import fs from "node:fs";
import path from "node:path";

let hasErrors = false;

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".mjs")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allSrcFiles = scanDir("src");

console.log("🔍 Перевірка архітектурних фітнес-функцій...\n");

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, "utf8");
  const normalizedFile = file.replace(/\\/g, "/");
  const currentModule = normalizedFile.split("src/")[1].split("/")[0];

  const importRegex = /import\s+.*?\s+from\s+["'](.*?)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.includes("/internal/")) {
      const resolvedTarget = path
        .normalize(path.join(path.dirname(normalizedFile), importPath))
        .replace(/\\/g, "/");

      if (resolvedTarget.includes("src/")) {
        const targetModule = resolvedTarget.split("src/")[1].split("/")[0];
        if (targetModule !== currentModule) {
          console.error(
            `❌ Порушення архітектури: Модуль '${currentModule}' (${file}) імпортує внутрішні деталі модуля '${targetModule}' через '${importPath}'`
          );
          hasErrors = true;
        }
      }
    }
  }
}

for (const file of allSrcFiles) {
  const normalizedFile = file.replace(/\\/g, "/");
  if (normalizedFile.includes("src/orders/") || normalizedFile.includes("src/checkout/")) {
    const content = fs.readFileSync(file, "utf8");
    if (/database\.stock\s*\./.test(content) || /database\.stock\[/.test(content)) {
      console.error(
        `❌ Порушення архітектури: Файл '${file}' напряму модифікує 'database.stock'. Зміна залишків повинна належати виключно модулю 'inventory'.`
      );
      hasErrors = true;
    }
  }
}

function checkDependencyCycle() {
  const moduleDeps = {};
  for (const file of allSrcFiles) {
    const normalizedFile = file.replace(/\\/g, "/");
    const parts = normalizedFile.split("src/")[1].split("/");
    if (parts.length > 1) {
      const sourceModule = parts[0];
      moduleDeps[sourceModule] = moduleDeps[sourceModule] || new Set();

      const content = fs.readFileSync(file, "utf8");
      const importRegex = /import\s+.*?\s+from\s+["'](.*?)["']/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const resolved = path
          .normalize(path.join(path.dirname(normalizedFile), importPath))
          .replace(/\\/g, "/");
        if (resolved.includes("src/")) {
          const targetModule = resolved.split("src/")[1].split("/")[0];
          if (
            targetModule !== sourceModule &&
            !["config.ts", "database.ts", "demo.ts", "shared"].includes(targetModule)
          ) {
            moduleDeps[sourceModule].add(targetModule);
          }
        }
      }
    }
  }

  for (const [modA, deps] of Object.entries(moduleDeps)) {
    for (const modB of deps) {
      if (moduleDeps[modB]?.has(modA)) {
        console.error(`❌ Порушення архітектури: Виявлено циклічну залежність між модулями '${modA}' та '${modB}'`);
        hasErrors = true;
      }
    }
  }
}

checkDependencyCycle();

if (hasErrors) {
  console.error("\n💥 Архітектурні перевірки НЕ ПРОЙШЛИ.");
  process.exit(1);
} else {
  console.log("✅ Усі архітектурні фітнес-функції успішно виконано!");
  process.exit(0);
}