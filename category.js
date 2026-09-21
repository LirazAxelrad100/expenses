const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let bucketId = null;

function formatMoney(n) {
  return "€" + Number(n).toFixed(2);
}

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function currentMonthStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function nextMonthStr(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
}

async function getBucketName(id) {
  if (id === "null") return "Other";
  const { data, error } = await db.from("buckets").select("name").eq("id", id).single();
  if (error) return "Unknown bucket";
  return data.name;
}

async function loadMonth(ym) {
  history.replaceState(null, "", "?bucket=" + bucketId + "&month=" + ym);

  let query = db
    .from("expenses")
    .select("*, buckets(name)")
    .gte("expense_date", ym + "-01")
    .lt("expense_date", nextMonthStr(ym))
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  query = bucketId === "null" ? query.is("bucket_id", null) : query.eq("bucket_id", bucketId);

  const { data, error } = await query;
  if (error) return console.error(error);

  const total = data.reduce((sum, e) => sum + Number(e.amount), 0);
  document.getElementById("bucketTotal").textContent = formatMoney(total);

  document.getElementById("expenseList").innerHTML = data.map(e => {
    const title = e.item || "(no item)";
    const meta = [e.expense_date, e.place, e.notes].filter(Boolean).join(" · ");
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
  const params = new URLSearchParams(location.search);
  bucketId = params.get("bucket");
  if (!bucketId) {
    document.getElementById("bucketTitle").textContent = "No category selected";
    document.getElementById("monthSelect").style.display = "none";
    return;
  }

  document.getElementById("bucketTitle").textContent = await getBucketName(bucketId);

  const { data, error } = await db.from("expenses").select("expense_date");
  if (error) return console.error(error);

  const months = new Set(data.map(e => e.expense_date.slice(0, 7)));
  months.add(currentMonthStr());
  const sortedMonths = [...months].sort().reverse();

  const select = document.getElementById("monthSelect");
  select.innerHTML = sortedMonths.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join("");

  const requested = params.get("month");
  select.value = sortedMonths.includes(requested) ? requested : currentMonthStr();

  select.addEventListener("change", (e) => loadMonth(e.target.value));

  await loadMonth(select.value);
}

init();
