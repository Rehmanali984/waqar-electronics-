const DB_NAME = "waqar-electronics-admin";
const DB_VERSION = 1;
const seedProducts = [
  { id: "p-1", name: "SoundMax wireless headphones", category: "Audio", price: 7500, stock: 18, status: "Active" },
  { id: "p-2", name: "VoltPro 20W fast charger", category: "Accessories", price: 3200, stock: 6, status: "Active" },
  { id: "p-3", name: "Vision 43-inch smart TV", category: "Television", price: 98500, stock: 3, status: "Active" },
  { id: "p-4", name: "HomeLink Wi-Fi router", category: "Networking", price: 6900, stock: 0, status: "Draft" }
];
const seedOrders = [
  { id: "WE-1048", customer: "Ayesha Khan", item: "SoundMax wireless headphones", quantity: 1, total: 7500, status: "Processing", date: "Today" },
  { id: "WE-1047", customer: "Bilal Ahmed", item: "VoltPro 20W fast charger", quantity: 2, total: 6400, status: "Ready", date: "Today" },
  { id: "WE-1046", customer: "Hina Raza", item: "HomeLink Wi-Fi router", quantity: 1, total: 6900, status: "Delivered", date: "Yesterday" },
  { id: "WE-1045", customer: "Omar Farooq", item: "Vision 43-inch smart TV", quantity: 1, total: 98500, status: "Delivered", date: "Yesterday" }
];
let db;
let deferredInstall;
const $ = selector => document.querySelector(selector);
const money = value => `PKR ${Number(value).toLocaleString("en-PK")}`;
const request = (store, mode = "readonly") => db.transaction(store, mode).objectStore(store);
function openDb() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      db = open.result;
      ["products", "orders", "settings", "mutations"].forEach(store => {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id", autoIncrement: store === "mutations" });
      });
    };
    open.onsuccess = () => { db = open.result; resolve(db); };
    open.onerror = () => reject(open.error);
  });
}
function all(store) {
  return new Promise((resolve, reject) => { const r = request(store).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
function put(store, value) {
  return new Promise((resolve, reject) => { const r = request(store, "readwrite").put(value); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
function get(store, key) {
  return new Promise((resolve, reject) => { const r = request(store).get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
async function seed() {
  if (!(await all("products")).length) await Promise.all(seedProducts.map(item => put("products", item)));
  if (!(await all("orders")).length) await Promise.all(seedOrders.map(item => put("orders", item)));
  if (!(await get("settings", "store"))) await put("settings", { id: "store", name: "Waqar Electronics", phone: "+92 300 0000000", description: "Reliable electronics, accessories, and friendly service.", hours: "Mon–Sat · 9:00 AM – 8:00 PM", currency: "PKR · Pakistani Rupee" });
}
async function enqueue(type, payload) { await put("mutations", { type, payload, createdAt: new Date().toISOString() }); renderSync(); }
async function syncQueue() {
  if (!navigator.onLine) return;
  const queue = await all("mutations");
  if (!queue.length) return renderSync();
  for (const mutation of queue) {
    if (mutation.type === "github-feedback") {
      try {
        const response = await fetch("/api/github", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mutation.payload) });
        if (!response.ok) throw new Error("Feedback sync failed");
      } catch {
        continue;
      }
    }
    if (mutation.type === "order-status") await put("orders", mutation.payload);
    if (mutation.type === "settings") await put("settings", mutation.payload);
    if (mutation.type === "product") await put("products", mutation.payload);
    await new Promise((resolve, reject) => { const r = request("mutations", "readwrite").delete(mutation.id); r.onsuccess = resolve; r.onerror = () => reject(r.error); });
  }
  renderSync();
  toast("All pending changes synced");
}
async function renderSync() {
  const pending = (await all("mutations")).length;
  const offline = !navigator.onLine;
  $("#syncLabel").textContent = offline ? `${pending} change${pending === 1 ? "" : "s"} saved offline` : pending ? `${pending} pending sync` : "All changes synced";
  $("#syncPill .status-dot").className = `status-dot ${offline ? "offline" : pending ? "offline" : ""}`;
  $("#sideStatusDot").className = `status-dot ${offline ? "offline" : ""}`;
  $("#sideStatus").textContent = offline ? "Offline mode" : "Online";
  $("#sideStatusHint").textContent = offline ? "Changes wait to sync" : "Changes sync automatically";
  $("#offlineBanner").classList.toggle("visible", offline);
  $("#metricPending").textContent = pending;
  $("#metricPendingHint").textContent = pending ? "Will sync when online" : "Nothing waiting";
}
function showView(view) {
  document.querySelectorAll("[data-panel]").forEach(panel => panel.classList.toggle("hidden", panel.dataset.panel !== view));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  $("#pageTitle").textContent = view === "dashboard" ? "Good morning, Waqar" : `${view[0].toUpperCase()}${view.slice(1)}`;
  if (view === "dashboard") renderDashboard();
  if (view === "products") renderProducts();
  if (view === "orders") renderOrders();
  if (view === "settings") loadSettings();
}
async function renderDashboard() {
  const [products, orders] = await Promise.all([all("products"), all("orders")]);
  $("#metricProducts").textContent = products.filter(p => p.status === "Active").length;
  $("#metricOrders").textContent = orders.filter(o => o.date === "Today").length;
  $("#orderCount").textContent = orders.filter(o => o.status !== "Delivered").length;
  $("#recentOrders").innerHTML = orders.slice(0, 4).map(order => `<tr><td class="order-id">#${order.id}</td><td class="order-customer">${order.customer}</td><td class="subtle">${order.item}</td><td><span class="status ${order.status}">${order.status}</span></td><td class="price">${money(order.total)}</td></tr>`).join("");
  const checks = JSON.parse(localStorage.getItem("checklist") || "{}");
  document.querySelectorAll("[data-check]").forEach(input => { input.checked = Boolean(checks[input.dataset.check]); });
  $("#checklistProgress").textContent = `${Object.values(checks).filter(Boolean).length}/3`;
}
async function renderProducts() {
  const query = ($("#productSearch")?.value || "").toLowerCase();
  const filter = $("#productFilter")?.value || "all";
  let products = await all("products");
  products = products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query)).filter(p => filter === "all" || filter === "low" && p.stock < 7 || filter === p.status.toLowerCase());
  $("#productList").innerHTML = products.map(p => `<div class="product-card"><div class="product-image">▦</div><div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.category)} · <span class="status ${p.status}">${p.status}</span></p></div><div class="product-meta"><strong>${money(p.price)}</strong><small>${p.stock ? `${p.stock} in stock` : "Out of stock"}</small></div></div>`).join("") || `<p class="muted" style="padding:20px">No products match your search.</p>`;
}
async function renderOrders() {
  const query = ($("#orderSearch")?.value || "").toLowerCase();
  const filter = $("#orderFilter")?.value || "all";
  let orders = await all("orders");
  orders = orders.filter(o => `${o.id} ${o.customer} ${o.item}`.toLowerCase().includes(query)).filter(o => filter === "all" || o.status === filter);
  $("#ordersTable").innerHTML = orders.map(o => `<tr><td class="order-id">#${o.id}<div class="subtle">${o.date}</div></td><td class="order-customer">${escapeHtml(o.customer)}</td><td class="subtle">${escapeHtml(o.item)} × ${o.quantity}</td><td><select class="status-select" data-order="${o.id}" aria-label="Status for ${o.id}"><option ${o.status === "Processing" ? "selected" : ""}>Processing</option><option ${o.status === "Ready" ? "selected" : ""}>Ready</option><option ${o.status === "Delivered" ? "selected" : ""}>Delivered</option></select></td><td class="price">${money(o.total)}</td><td></td></tr>`).join("");
  document.querySelectorAll(".status-select").forEach(select => select.addEventListener("change", async event => { const order = orders.find(o => o.id === event.target.dataset.order); order.status = event.target.value; await put("orders", order); await enqueue("order-status", order); renderOrders(); renderDashboard(); toast(navigator.onLine ? "Order updated" : "Order saved offline"); }));
}
async function loadSettings() {
  const settings = await get("settings", "store");
  if (!settings) return;
  $("#settingName").value = settings.name; $("#settingPhone").value = settings.phone; $("#settingDescription").value = settings.description; $("#settingHours").value = settings.hours; $("#settingCurrency").value = settings.currency;
}
async function saveSettings() {
  const settings = { id: "store", name: $("#settingName").value.trim(), phone: $("#settingPhone").value.trim(), description: $("#settingDescription").value.trim(), hours: $("#settingHours").value.trim(), currency: $("#settingCurrency").value };
  if (!settings.name) return toast("Store name is required");
  await put("settings", settings); await enqueue("settings", settings); $("#savedNote").textContent = navigator.onLine ? "Saved just now" : "Saved offline"; toast("Store settings saved");
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
function toast(message) { const element = $("#toast"); element.textContent = message; element.classList.remove("hidden"); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.add("hidden"), 2800); }
async function addProduct(event) {
  event.preventDefault();
  const product = { id: `p-${Date.now()}`, name: $("#productName").value.trim(), category: $("#productCategory").value.trim(), price: Number($("#productPrice").value), stock: Number($("#productStock").value), status: $("#productStatus").value };
  await put("products", product); await enqueue("product", product); $("#productDialog").close(); event.target.reset(); toast(navigator.onLine ? "Product added" : "Product saved offline"); renderProducts(); renderDashboard();
}
async function sendFeedback() {
  const title = $("#issueTitle").value.trim(), body = $("#issueBody").value.trim();
  if (!title) return toast("Add a feedback title first");
  $("#feedbackMessage").textContent = "Sending…";
  try {
    const response = await fetch("/api/github", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to send feedback");
    $("#feedbackMessage").textContent = `Issue #${result.number} created`; $("#issueTitle").value = ""; $("#issueBody").value = ""; toast("Feedback sent to GitHub");
  } catch (error) { $("#feedbackMessage").textContent = "Could not send while offline"; await enqueue("github-feedback", { title, body }); toast(error.message); }
}
document.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "new-product") $("#productDialog").showModal();
  if (action === "retry") syncQueue();
  if (action === "save-settings") saveSettings();
  if (action === "send-feedback") sendFeedback();
});
window.addEventListener("hashchange", () => showView(location.hash.slice(1) || "dashboard"));
window.addEventListener("online", syncQueue);
window.addEventListener("offline", renderSync);
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstall = event; $("#installButton").classList.remove("hidden"); });
$("#installButton").addEventListener("click", async () => { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall = null; $("#installButton").classList.add("hidden"); });
$("#productForm").addEventListener("submit", addProduct);
["productSearch", "productFilter"].forEach(id => $(`#${id}`).addEventListener("input", renderProducts));
["orderSearch", "orderFilter"].forEach(id => $(`#${id}`).addEventListener("input", renderOrders));
document.querySelectorAll("[data-check]").forEach(input => input.addEventListener("change", event => { const checks = JSON.parse(localStorage.getItem("checklist") || "{}"); checks[event.target.dataset.check] = event.target.checked; localStorage.setItem("checklist", JSON.stringify(checks)); renderDashboard(); }));
openDb().then(seed).then(() => { showView(location.hash.slice(1) || "dashboard"); renderSync(); syncQueue(); }).catch(error => toast(`Storage unavailable: ${error.message}`));
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
