// Photo -> AI-read receipt items -> review screen -> saved as expense rows.
// Relies on globals from app.js: db, buckets, bucketOptionsHtml, formatMoney, todayStr, loadExpenses.

let scannedItems = [];

function setScanStatus(text) {
  const el = document.getElementById("scanStatus");
  el.textContent = text;
  el.style.display = text ? "block" : "none";
}

function fileToCompressedJpegBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function findBucketIdByName(name) {
  if (!name) return "";
  const match = buckets.find(b => b.name.toLowerCase() === String(name).toLowerCase());
  return match ? match.id : "";
}

function renderScanItems() {
  const list = document.getElementById("scanItems");
  list.innerHTML = scannedItems.map((it, i) => `
    <li class="splitRow">
      <input type="text" class="scanItemName" data-i="${i}" value="${it.name.replace(/"/g, "&quot;")}" placeholder="Item">
      <input type="number" step="0.01" min="0" class="scanItemPrice" data-i="${i}" value="${it.price}">
      <select class="scanItemBucket" data-i="${i}">${bucketOptionsHtml}</select>
      <button type="button" class="removeSplitRow" data-i="${i}">×</button>
    </li>
  `).join("");

  list.querySelectorAll(".scanItemBucket").forEach(sel => {
    sel.value = scannedItems[sel.dataset.i].bucketId || "";
  });
  list.querySelectorAll(".scanItemName").forEach(input => {
    input.addEventListener("input", () => { scannedItems[input.dataset.i].name = input.value; });
  });
  list.querySelectorAll(".scanItemPrice").forEach(input => {
    input.addEventListener("input", () => {
      scannedItems[input.dataset.i].price = input.value;
      updateScanSaveLabel();
    });
  });
  list.querySelectorAll(".scanItemBucket").forEach(sel => {
    sel.addEventListener("change", () => { scannedItems[sel.dataset.i].bucketId = sel.value; });
  });
  list.querySelectorAll(".removeSplitRow").forEach(btn => {
    btn.addEventListener("click", () => {
      scannedItems.splice(Number(btn.dataset.i), 1);
      renderScanItems();
      updateScanSaveLabel();
    });
  });

  updateScanSaveLabel();
}

function updateScanSaveLabel() {
  const total = scannedItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  document.getElementById("scanSaveBtn").textContent =
    scannedItems.length ? `Save ${scannedItems.length} items (${formatMoney(total)})` : "Save";
}

function openScanReview(parsed) {
  scannedItems = parsed.items.map(it => ({
    name: it.name || "",
    price: it.price != null ? Number(it.price) : 0,
    bucketId: findBucketIdByName(it.suggestedBucket)
  }));

  document.getElementById("scanDate").value = parsed.date || todayStr();
  document.getElementById("scanPlace").value = parsed.store || "";
  renderScanItems();
  document.getElementById("scanReview").style.display = "block";
}

function closeScanReview() {
  scannedItems = [];
  document.getElementById("scanReview").style.display = "none";
  document.getElementById("scanFileInput").value = "";
}

document.getElementById("scanReceiptBtn").addEventListener("click", () => {
  document.getElementById("scanFileInput").click();
});

document.getElementById("scanFileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  closeScanReview();
  setScanStatus("Reading receipt…");

  try {
    const base64 = await fileToCompressedJpegBase64(file);
    const response = await fetch("/api/scan-receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image: base64,
        mediaType: "image/jpeg",
        bucketNames: buckets.map(b => b.name)
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setScanStatus("");
      alert(data.error || "Couldn't read this receipt.");
      return;
    }

    setScanStatus("");
    openScanReview(data);
  } catch (err) {
    console.error(err);
    setScanStatus("");
    alert("Couldn't read this receipt. Check your connection and try again.");
  }
});

document.getElementById("scanCancelBtn").addEventListener("click", closeScanReview);

document.getElementById("scanSaveBtn").addEventListener("click", async () => {
  if (!scannedItems.length) return;

  if (scannedItems.some(it => !it.bucketId || !it.price)) {
    alert("Every item needs an amount and a bucket.");
    return;
  }

  const place = document.getElementById("scanPlace").value.trim() || null;
  const expenseDate = document.getElementById("scanDate").value || todayStr();

  const rows = scannedItems.map(it => ({
    amount: it.price,
    item: it.name.trim() || null,
    bucket_id: it.bucketId,
    place,
    notes: null,
    expense_date: expenseDate
  }));

  const { error } = await db.from("expenses").insert(rows);
  if (error) {
    console.error(error);
    alert("Couldn't save these expenses: " + error.message);
    return;
  }

  closeScanReview();
  await loadExpenses();
});
