import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [sourcePath, outputPath] = process.argv.slice(2);
const input = sourcePath ? await readFile(sourcePath, "utf8") : process.env.RR_DASHBOARD_RESULTS;
if (!input) {
  throw new Error("Supply the report-level results JSON as a file or set RR_DASHBOARD_RESULTS for the build.");
}

const source = JSON.parse(input);
if (source.schema !== 1 || source.kind !== "submission") {
  throw new Error("Expected a SupeRR submission results export.");
}

const dataset = {};
for (const role of ["batting", "bowling"]) {
  const players = source[role];
  const ranks = players?.filter((player) => player.rank !== null).map((player) => player.rank);
  if (ranks?.join(",") !== "1,2,3,4,5,6,7,8,9,10" ||
      new Set(players.map((player) => player.name)).size !== players.length ||
      players.slice(0, 10).some((player, index) => player.rank !== index + 1)) {
    throw new Error(`Expected ten unique ${role} selections in submission order, followed by comparison players.`);
  }

  dataset[role] = players.map((player) => {
    const { name, rank, historyRank, score, events, matches, pressure, ordinary,
      interval, gridTop, gridEligible, looTop, looTotal, scenarios } = player;
    if (typeof name !== "string" || !name.trim() ||
        ![historyRank, score, events, matches, pressure, ordinary].every(Number.isFinite) ||
        !Array.isArray(interval) || interval.length !== 2 || !interval.every(Number.isFinite) ||
        ![gridTop, gridEligible, looTop, looTotal].every((value) => value === null || Number.isInteger(value))) {
      throw new Error(`Invalid ${role} player summary.`);
    }
    const validScenarios = Object.fromEntries(Object.entries(scenarios).filter(([key, value]) =>
      /^grid_(primary|narrow|finish)_w(5|10|15)_p(50|100|200)$/.test(key) &&
      Number.isInteger(value) && value > 0
    ));
    return { name, rank, historyRank, score, events, matches, pressure, ordinary,
      interval, gridTop, gridEligible, looTop, looTotal, scenarios: validScenarios };
  });
}

const [template, css, js] = await Promise.all(
  ["index.html", "styles.css", "dashboard.js"].map((name) => readFile(new URL(`public/${name}`, root), "utf8")),
);
const script = `const dataset = ${JSON.stringify(dataset).replaceAll("<", "\\u003c")};\n${js}`;
const digest = (content) => `'sha256-${createHash("sha256").update(content).digest("base64")}'`;
const policy = `default-src 'none'; script-src ${digest(script)}; style-src ${digest(css)}; base-uri 'none'; form-action 'none'`;
const html = template
  .replace("<!-- DASHBOARD_STYLES -->", () =>
    `<meta http-equiv="Content-Security-Policy" content="${policy}">\n  <style>${css}</style>`)
  .replace("<!-- DASHBOARD_SCRIPT -->", () => `<script>${script}</script>`);

if (!outputPath) await mkdir(new URL("dist/", root), { recursive: true });
await writeFile(outputPath || new URL("dist/index.html", root), html);
