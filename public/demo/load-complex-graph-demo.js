const response = await fetch("/demo/complex-graph-demo.json", { cache: "no-store" });
const documentData = await response.json();
localStorage.setItem("okr4me.identity", JSON.stringify({ localId: "p-andreas", displayName: "AndreasW" }));
localStorage.setItem("okr4me.document", JSON.stringify(documentData));
localStorage.removeItem("okr4me.syncConfig");
console.info("okr4me complex graph demo data installed. Reloading...");
location.reload();
