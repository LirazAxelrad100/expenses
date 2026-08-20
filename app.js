const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let buckets = [];
let recentExpenses = [];
let editingId = null;

function formatMoney(n) {
  return "€" + Number(n).toFixed(2);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

async function loadBuckets() {
  const { data, error } = await db.from("buckets").select("*").order("name");
  if (error) return console.error(error);
  buckets = data;

  const select = document.getElementById("bucket");
  select.innerHTML = `<option value="" disabled selected>Select</option>` +
    buckets.map(b => `<option value="${b.id}">${b.name}</option>`).join("");

  const bucketList = document.getElementById("bucketList");
  bucketList.innerHTML = buckets.map(b => `
    <li>
      ${b.name}
      <button data-id="${b.id}" class="deleteBucket">delete</button>
    </li>
  `).join("");

  bucketList.querySelectorAll(".deleteBucket").forEach(btn => {
    btn.addEventListener("click", () => deleteBucket(btn.dataset.id));
  });
}

async function deleteBucket(id) {
  if (!confirm("Delete this bucket? Expenses already logged under it will keep it as an unnamed bucket.")) return;
  const { error } = await db.from("buckets").delete().eq("id", id);
  if (error) return console.error(error);
  await loadBuckets();
}

document.getElementById("addBucketForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("newBucketName").value.trim();
  if (!name) return;
  const { error } = await db.from("buckets").insert({ name });
  if (error) return console.error(error);
  document.getElementById("newBucketName").value = "";
  await loadBuckets();
});

async function loadExpenses() {
  const { data: monthData, error: monthError } = await db
    .from("expenses")
    .select("*, buckets(name)")
    .gte("created_at", startOfMonth());
  if (monthError) return console.error(monthError);

  const total = monthData.reduce((sum, e) => sum + Number(e.amount), 0);
  document.getElementById("monthTotal").textContent = formatMoney(total);

  const byBucket = {};
  monthData.forEach(e => {
    const name = e.buckets ? e.buckets.name : "Other";
    byBucket[name] = (byBucket[name] || 0) + Number(e.amount);
  });
  const breakdownList = document.getElementById("breakdownList");
  breakdownList.innerHTML = Object.entries(byBucket)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => `<li><span>${name}</span><span>${formatMoney(amount)}</span></li>`)
    .join("") || "<li>No expenses yet this month</li>";

  const { data: recentData, error: recentError } = await db
    .from("expenses")
    .select("*, buckets(name)")
    .order("created_at", { ascending: false })
    .limit(10);
  if (recentError) return console.error(recentError);
  recentExpenses = recentData;

  const recentList = document.getElementById("recentList");
  recentList.innerHTML = recentData.map(e => `
    <li>
      <span>
        ${e.item}
        <div class="meta">${e.buckets ? e.buckets.name : "Other"}${e.place ? " · " + e.place : ""}${e.notes ? " · " + e.notes : ""}</div>
      </span>
      <span>
        ${formatMoney(e.amount)}
        <button data-id="${e.id}" class="editExpense">edit</button>
      </span>
    </li>
  `).join("") || "<li>No expenses yet</li>";

  recentList.querySelectorAll(".editExpense").forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });
}

function startEdit(id) {
  const expense = recentExpenses.find(e => e.id === id);
  if (!expense) return;

  editingId = id;
  document.getElementById("amount").value = expense.amount;
  document.getElementById("item").value = expense.item;
  document.getElementById("bucket").value = expense.bucket_id || "";
  document.getElementById("place").value = expense.place || "";
  document.getElementById("notes").value = expense.notes || "";

  document.getElementById("submitBtn").textContent = "Save changes";
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  document.getElementById("amount").scrollIntoView({ behavior: "smooth" });
}

function stopEditing() {
  editingId = null;
  document.getElementById("expenseForm").reset();
  document.getElementById("submitBtn").textContent = "Add expense";
  document.getElementById("cancelEditBtn").style.display = "none";
}

document.getElementById("cancelEditBtn").addEventListener("click", stopEditing);

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = document.getElementById("amount").value;
  const item = document.getElementById("item").value.trim();
  const bucket_id = document.getElementById("bucket").value;
  const place = document.getElementById("place").value.trim();
  const notes = document.getElementById("notes").value.trim();

  const values = { amount, item, bucket_id, place: place || null, notes: notes || null };

  const { error } = editingId
    ? await db.from("expenses").update(values).eq("id", editingId)
    : await db.from("expenses").insert(values);
  if (error) return console.error(error);

  stopEditing();
  await loadExpenses();
});

(async function init() {
  await loadBuckets();
  await loadExpenses();
})();
