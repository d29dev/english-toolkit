/**
 * Loader cho node:test — resolve alias "@/..." , biên dịch JSX và bỏ qua CSS.
 * Dùng: node --import ./test/register.js test/*.test.js
 */
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { transformWithOxc } from "vite";

const srcDir = path.resolve(process.cwd(), "src");

export async function resolve(specifier, context, nextResolve) {
  const withFallback = async (href) => {
    try {
      return await nextResolve(href, context);
    } catch (error) {
      // Import không đuôi (bundler style) -> thử .jsx rồi .js
      for (const ext of [".jsx", ".js", "/index.jsx", "/index.js"]) {
        try {
          return await nextResolve(href + ext, context);
        } catch {
          /* thử tiếp */
        }
      }
      throw error;
    }
  };

  if (specifier.endsWith("?url")) {
    const bare = specifier.slice(0, -4);
    const target = bare.startsWith("@/")
      ? path.join(srcDir, bare.slice(2))
      : path.resolve(path.dirname(new URL(context.parentURL).pathname), bare);
    return { url: `${pathToFileURL(target).href}?url`, shortCircuit: true, format: "module" };
  }
  if (specifier.startsWith("@/")) {
    const target = path.join(srcDir, specifier.slice(2));
    return withFallback(pathToFileURL(target).href);
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parent = context.parentURL;
    // Chỉ can thiệp file trong src/ — để node tự xử lý loader/test của chính nó
    if (parent && parent.includes("/src/")) {
      const dir = path.dirname(new URL(parent).pathname);
      return withFallback(pathToFileURL(path.resolve(dir, specifier)).href);
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith("?url")) {
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(url.replace(/\?url$/, ""))};`,
    };
  }

  if (url.endsWith(".css")) {
    return { format: "module", shortCircuit: true, source: "export default {};" };
  }

  if (url.endsWith(".jsx")) {
    const file = url.startsWith("file:") ? new URL(url) : pathToFileURL(url);
    const source = await readFile(file, "utf8");
    const { code } = await transformWithOxc(source, file.pathname, { lang: "jsx" });
    return { format: "module", shortCircuit: true, source: code };
  }

  return nextLoad(url, context);
}
