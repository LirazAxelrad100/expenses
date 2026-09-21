const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatMoney(n) {
  return "€" + Number(n).toFixed(2);
}

async function getBucketName(bucketId) {
  if (bucketId === "null") return "Other";
  const { data, error } = await db.from("buckets").select("name").eq("id", bucketId).single();
  if (error) return "Unknown bucket";
  return data.name;
}

async function init() {
  const bucketId = new URLSearchParams(location.search).get("bucket");
  if (!bucketId) {
    document.getElementById("bucketTitle").textContent = "No category selected";
    return;
  }

  document.getElementById("bucketTitle").textContent = await getBucketName(bucketId);

  let query = db
    .from("expenses")
    .select("*, buckets(name)")
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
  }).join("") || "<li>No expenses in this category</li>";
}

init();
