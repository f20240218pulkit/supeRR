const $ = (id) => document.getElementById(id);
const signed = (n, digits = 3) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
const node = (tag, value, className) => {
  const el = document.createElement(tag);
  if (value != null) el.textContent = value;
  if (className) el.className = className;
  return el;
};

function makeDemo() {
  const make = (names) => names.map((name, i) => {
    const scenarios = {};
    for (const win of ["primary", "narrow", "finish"]) {
      for (const w of [5, 10, 15]) {
        for (const p of [50, 100, 200]) {
          const offset = (win === "narrow" ? i : win === "finish" ? -i : 0) + (w-10)/5 + ([50,100,200].indexOf(p)-1);
          if (!(win === "narrow" && i === 2)) scenarios[`grid_${win}_w${w}_p${p}`] = Math.max(1, i+1+offset);
        }
      }
    }
    return {name, rank:i<3?i+1:null, historyRank:i+1, score:.51-i*.09, events:61-i*7, matches:11-i,
            pressure:.94-i*.2, ordinary:.17+i*.04, interval:[.08-i*.1,1.7-i*.11],
            gridTop:23-i*4, gridEligible:27, looTop:11-i*2, looTotal:11-i, scenarios};
  });
  return {schema:1,kind:"demo",batting:make(["Demo Batter A","Demo Batter B","Demo Batter C","Demo Reserve"]),
    bowling:make(["Demo Bowler A","Demo Bowler B","Demo Bowler C","Demo Reserve"])};
}

let dataset;
let role = "batting";
let requestVersion = 0;
const choices = ["player-a", "player-b"];
const alternate = (p) => p.rank ? `Submission #${p.rank}` : `Historical #${p.historyRank} · comparison`;
const metric = (value, label) => {
  const card = node("div", null, "metric");
  card.append(node("strong",value),node("span",label));
  return card;
};

function show(next) {
  dataset = next;
  role = "batting";
  $("gate").hidden = true;
  $("dashboard").hidden = false;
  $("mode").textContent = next.kind === "demo" ? "Fictional data" : "Judge view";
  $("rank-title").textContent = next.kind === "demo" ? "Fictional shortlist" : "Submitted order";
  renderRole();
  $("batting").focus();
}

function renderRole() {
  for (const kind of ["batting","bowling"]) $(kind).setAttribute("aria-pressed", String(kind===role));
  const players = dataset[role];
  const picked = players.filter((p) => p.rank != null);
  $("summary").replaceChildren(metric(picked.length, "Ranked players"), metric("27", "Historical sensitivity settings"), metric("1–30", "Legal balls left"));
  for (const id of choices) {
    $(id).replaceChildren(...players.map((p,i) => {
      const o = node("option", p.name);
      o.value = String(i);
      return o;
    }));
  }
  const nearCutoff = role === "bowling" && dataset.kind !== "demo";
  $(choices[0]).value = String(nearCutoff ? 8 : 0);
  $(choices[1]).value = String(nearCutoff ? 9 : 1);
  const rows = picked.map((p,i) => {
    const row = node("tr");
    const cell = node("td");
    const button = node("button",p.name);
    button.type = "button";
    button.dataset.index = String(i);
    button.addEventListener("click",() => {
      $(choices[0]).value = String(i);
      renderComparison();
    });
    cell.append(button);
    row.append(node("td",String(p.rank)),cell,node("td",signed(p.score,4)),node("td",String(p.events)));
    return row;
  });
  $("rows").replaceChildren(...rows);
  renderComparison();
}

function profile(p) {
  const card = node("article",null,"profile");
  card.append(node("h3",p.name),node("p",alternate(p),"badge"));
  const list = node("dl");
  const grid = p.gridEligible == null ? "—" : `${p.gridTop}/27 · ${p.gridEligible} eligible`;
  const loo = p.looTotal == null ? "—" : `${p.looTop}/${p.looTotal}`;
  for (const [label,value] of [
    ["Shrunk score",signed(p.score,4)],["Pressure events / matches",`${p.events} / ${p.matches}`],
    ["Pressure mean",signed(p.pressure)],["Ordinary mean",signed(p.ordinary)],
    ["Pressure interval",p.interval.map((n)=>signed(n,2)).join(" to ")],
    ["Grid top-ten settings",grid],["Top ten after match deletion",loo]
  ]) {
    const item = node("div");
    item.append(node("dt",label),node("dd",value));
    list.append(item);
  }
  card.append(list);
  return card;
}

const compared = () => choices.map((id) => dataset[role][Number($(id).value)]);
function renderComparison() {
  $("compare").replaceChildren(...compared().map(profile));
  for (const b of $("rows").querySelectorAll("button")) b.setAttribute("aria-pressed",String(b.dataset.index===$(choices[0]).value));
  renderScenario();
}
function renderScenario() {
  const key = `grid_${$("window").value}_w${$("wickets").value}_p${$("prior").value}`;
  const output = compared().map((p) => {
    const card = node("div",null,"scenario-card");
    const rank = p.scenarios[key];
    card.append(node("span",p.name),node("strong",rank == null ? "Ineligible" : `Historical #${rank}`));
    return card;
  });
  $("scenario-result").replaceChildren(...output);
}

$("access").addEventListener("submit",async (event) => {
  event.preventDefault();
  const button = $("access").querySelector("button");
  const id = ++requestVersion;
  const code = $("code").value;
  $("code").value = "";
  $("status").textContent = "Checking access…";
  button.disabled = true;
  try {
    const response = await fetch("/api/results",{
      method:"POST",headers:{Authorization:`Bearer ${code}`},cache:"no-store",redirect:"error"
    });
    const data = await response.json();
    if (id !== requestVersion) return;
    if (!response.ok) throw new Error(data.message || "Evidence could not be opened.");
    show(data);
    $("status").textContent = "";
  } catch (error) {
    if (id === requestVersion) $("status").textContent = error.message || "Evidence could not be opened.";
  } finally {
    if (id === requestVersion) button.disabled = false;
  }
});

$("demo").addEventListener("click",() => {
  requestVersion++;
  $("access").querySelector("button").disabled = false;
  $("status").textContent = "";
  $("code").value = "";
  show(makeDemo());
});
$("lock").addEventListener("click",() => {
  dataset = undefined;
  for (const id of ["summary","rows","compare","scenario-result",...choices]) $(id).replaceChildren();
  $("dashboard").hidden = true;
  $("gate").hidden = false;
  $("code").focus();
});
for (const kind of ["batting","bowling"]) $(kind).addEventListener("click",() => {
  if (role !== kind) { role = kind; renderRole(); }
});
for (const id of choices) $(id).addEventListener("change",renderComparison);
for (const id of ["window","wickets","prior"]) $(id).addEventListener("change",renderScenario);
