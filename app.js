const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let buckets = [];
let recentExpenses = [];
let editingId = null;
let bucketOptionsHtml = "";

function formatMoney(n) {
  return "€" + Number(n).toFixed(2);
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function startOfMonthStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
}

async function loadBuckets() {
  const { data, error } = await db.from("buckets").select("*").order("name");
  if (error) return console.error(error);
  buckets = data;

  bucketOptionsHtml = `<option value="" disabled selected>Select</option>` +
    buckets.map(b => `<option value="${b.id}">${b.name}</option>`).join("");

  document.getElementById("bucket").innerHTML = bucketOptionsHtml;

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
    .gte("expense_date", startOfMonthStr());
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
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);
  if (recentError) return console.error(recentError);
  recentExpenses = recentData;

  const recentList = document.getElementById("recentList");
  recentList.innerHTML = recentData.map(e => {
    const bucketName = e.buckets ? e.buckets.name : "Other";
    const title = e.item || bucketName;
    const meta = [e.expense_date, bucketName, e.place, e.notes].filter(Boolean).join(" · ");
    return `
    <li>
      <span>
        ${title}
        ${meta ? `<div class="meta">${meta}</div>` : ""}
      </span>
      <span>
        ${formatMoney(e.amount)}
        <button data-id="${e.id}" class="editExpense">edit</button>
        <button data-id="${e.id}" class="deleteExpense" title="Delete">🗑</button>
      </span>
    </li>
  `;
  }).join("") || "<li>No expenses yet</li>";

  recentList.querySelectorAll(".editExpense").forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });
  recentList.querySelectorAll(".deleteExpense").forEach(btn => {
    btn.addEventListener("click", () => deleteExpense(btn.dataset.id));
  });
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  const { error } = await db.from("expenses").delete().eq("id", id);
  if (error) return console.error(error);
  if (editingId === id) stopEditing();
  await loadExpenses();
}

function startEdit(id) {
  const expense = recentExpenses.find(e => e.id === id);
  if (!expense) return;

  editingId = id;
  setSplitMode(false);
  document.getElementById("amount").value = expense.amount;
  document.getElementById("date").value = expense.expense_date || todayStr();
  document.getElementById("item").value = expense.item || "";
  document.getElementById("bucket").value = expense.bucket_id || "";
  document.getElementById("place").value = expense.place || "";
  document.getElementById("notes").value = expense.notes || "";

  document.getElementById("submitBtn").textContent = "Save changes";
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  document.getElementById("amount").scrollIntoView({ behavior: "smooth" });
}

function setSplitMode(isSplit) {
  document.getElementById("splitToggle").checked = isSplit;
  document.getElementById("splitRows").style.display = isSplit ? "flex" : "none";
  document.getElementById("addSplitRowBtn").style.display = isSplit ? "inline-block" : "none";
  document.getElementById("splitRows").innerHTML = "";
}

function addSplitRow() {
  const row = document.createElement("div");
  row.className = "splitRow";
  row.innerHTML = `
    <input type="number" step="0.01" min="0" placeholder="Amount" class="splitAmount">
    <select class="splitBucket">${bucketOptionsHtml}</select>
    <button type="button" class="removeSplitRow">×</button>
  `;
  row.querySelector(".removeSplitRow").addEventListener("click", () => row.remove());
  document.getElementById("splitRows").appendChild(row);
}

document.getElementById("splitToggle").addEventListener("change", (e) => setSplitMode(e.target.checked));
document.getElementById("addSplitRowBtn").addEventListener("click", addSplitRow);

function stopEditing() {
  editingId = null;
  document.getElementById("expenseForm").reset();
  document.getElementById("date").value = todayStr();
  document.getElementById("submitBtn").textContent = "Add expense";
  document.getElementById("cancelEditBtn").style.display = "none";
  setSplitMode(false);
}

document.getElementById("cancelEditBtn").addEventListener("click", stopEditing);

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const item = document.getElementById("item").value.trim() || null;
  const place = document.getElementById("place").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const isSplit = document.getElementById("splitToggle").checked;

  const expenseDate = document.getElementById("date").value;

  const firstRow = {
    amount: document.getElementById("amount").value,
    item,
    bucket_id: document.getElementById("bucket").value,
    place: place || null,
    notes: notes || null,
    expense_date: expenseDate
  };

  let error;

  if (isSplit) {
    const extraRows = [...document.querySelectorAll(".splitRow")].map(row => ({
      amount: row.querySelector(".splitAmount").value,
      bucket_id: row.querySelector(".splitBucket").value,
      item, place: place || null, notes: notes || null,
      expense_date: expenseDate
    }));
    const allRows = [firstRow, ...extraRows];

    if (allRows.some(r => !r.amount || !r.bucket_id)) {
      alert("Fill in an amount and a bucket for each row.");
      return;
    }

    ({ error } = await db.from("expenses").insert(allRows));
  } else {
    ({ error } = editingId
      ? await db.from("expenses").update(firstRow).eq("id", editingId)
      : await db.from("expenses").insert(firstRow));
  }

  if (error) return console.error(error);

  stopEditing();
  await loadExpenses();
});

(async function init() {
  document.getElementById("date").value = todayStr();
  await loadBuckets();
  await loadExpenses();
})();
