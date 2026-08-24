const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatMoney(n) {
  return "€" + Number(n).toFixed(2);
}

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function nextMonthStr(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
}

async function loadMonth(ym) {
  document.getElementById("monthTitle").textContent = monthLabel(ym);
  history.replaceState(null, "", "?month=" + ym);

  const { data, error } = await db
    .from("expenses")
    .select("*, buckets(name)")
    .gte("expense_date", ym + "-01")
    .lt("expense_date", nextMonthStr(ym))
    .order("expense_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return console.error(error);

  const total = data.reduce((sum, e) => sum + Number(e.amount), 0);
  document.getElementById("monthTotal").textContent = formatMoney(total);

  const byBucket = {};
  data.forEach(e => {
    const name = e.buckets ? e.buckets.name : "Other";
    byBucket[name] = (byBucket[name] || 0) + Number(e.amount);
  });
  document.getElementById("breakdownList").innerHTML = Object.entries(byBucket)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => `<li><span>${name}</span><span>${formatMoney(amount)}</span></li>`)
    .join("") || "<li>No expenses this month</li>";

  document.getElementById("expenseList").innerHTML = data.map(e => {
    const bucketName = e.buckets ? e.buckets.name : "Other";
    const title = e.item || bucketName;
    const meta = [e.expense_date, bucketName, e.place, e.notes].filter(Boolean).join(" · ");
    return `
    <li>
      <span>
        ${title}
        ${meta ? `<div class="meta">${meta}</div>` : ""}
      </span>
      <span>${formatMoney(e.amount)}</span>
    </li>
  `;
  }).join("") || "<li>No expenses this month</li>";
}

async function init() {
  const { data, error } = await db.from("expenses").select("expense_date");
  if (error) return console.error(error);

  const months = [...new Set(data.map(e => e.expense_date.slice(0, 7)))].sort().reverse();
  const select = document.getElementById("monthSelect");

  if (months.length === 0) {
    document.getElementById("monthTitle").textContent = "No expenses logged yet";
    select.style.display = "none";
    return;
  }

  select.innerHTML = months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join("");

  const requested = new URLSearchParams(location.search).get("month");
  select.value = months.includes(requested) ? requested : months[0];

  select.addEventListener("change", (e) => loadMonth(e.target.value));

  await loadMonth(select.value);
}

init();
