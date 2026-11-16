const $ = (id) => document.getElementById(id);
const signed = (n, digits = 3) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
const node = (tag, value, className) => {
  const el = document.createElement(tag);
  if (value != null) el.textContent = value;
  if (className) el.className = className;
  return el;
};

let role = "batting";
const choices = ["player-a", "player-b"];
const alternate = (p) => p.rank ? `Submission #${p.rank}` : `Historical #${p.historyRank} · comparison`;
const metric = (value, label) => {
  const card = node("div", null, "metric");
  card.append(node("strong",value),node("span",label));
  return card;
};

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
  const nearCutoff = role === "bowling";
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
  const [first, second] = compared();
  const gap = first.score - second.score;
  $("compare").replaceChildren(profile(first), profile(second));
  $("comparison-gap").textContent = first === second
    ? "Choose a second player to compare scores."
    : `Score difference (A − B): ${signed(gap, 4)}. This is a point estimate.`;
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

for (const kind of ["batting","bowling"]) $(kind).addEventListener("click",() => {
  if (role !== kind) { role = kind; renderRole(); }
});
for (const id of choices) $(id).addEventListener("change",renderComparison);
for (const id of ["window","wickets","prior"]) $(id).addEventListener("change",renderScenario);

renderRole();
