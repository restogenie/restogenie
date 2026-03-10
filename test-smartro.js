fetch("http://localhost:3000/api/v1/sync/smartro", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ store_id: 4, days_to_sync: 1 })
}).then(r => r.json()).then(console.log).catch(console.error);
