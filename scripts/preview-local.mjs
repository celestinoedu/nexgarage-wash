// Servidor de teste que reproduz a publicação: versão legado na raiz e versão
// nova em /app, na mesma origem — é o que faz o alternador e a preferência
// compartilhada funcionarem igual ao ambiente publicado.
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = join(root, "out");
const basePath = "/app";
const port = Number(process.env.PORT || 4321);
const skipBuild = process.argv.includes("--no-build");

if (!skipBuild) {
  console.log("Construindo a versão nova em " + basePath + "...\n");
  const build = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath },
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
if (!existsSync(outDir)) {
  console.error("A pasta out/ não existe. Rode sem --no-build.");
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Resolve um caminho de URL dentro de uma pasta, aceitando index.html para
// rotas com barra final (o formato do export estático do Next).
function resolveFile(dir, urlPath) {
  // Segmentos "." e ".." são descartados: nenhum pedido sai da pasta servida.
  const relative = decodeURIComponent(urlPath)
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  const target = normalize(join(dir, relative));
  if (!target.startsWith(dir)) return null;
  for (const candidate of [target, join(target, "index.html"), `${target}.html`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

createServer((request, response) => {
  const urlPath = new URL(request.url, "http://localhost").pathname;
  const isApp = urlPath === basePath || urlPath.startsWith(`${basePath}/`);
  const dir = isApp ? outDir : root;
  const inner = isApp ? urlPath.slice(basePath.length) || "/" : urlPath;

  let file = resolveFile(dir, inner);
  if (!file && isApp) file = join(outDir, "404.html");
  if (!file || !existsSync(file)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Não encontrado");
    return;
  }
  response.writeHead(file.endsWith("404.html") ? 404 : 200, {
    "content-type": types[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`\nNexWash local em http://localhost:${port}`);
  console.log(`  versão legado (atual): http://localhost:${port}/`);
  console.log(`  versão nova:           http://localhost:${port}${basePath}/`);
  console.log(`  voltar ao legado:      http://localhost:${port}/?ui=legado\n`);
});
