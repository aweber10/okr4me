import { writeFileSync } from "node:fs";

const now = "2026-07-09T10:00:00.000Z";

const doc = {
  participants: {},
  orgUnits: {},
  objectives: {},
  keyResults: {},
  timeEvents: {},
  comments: {},
  changeLog: {},
  coordinatorIds: ["p-andreas"]
};

function addOrgUnit(id, name, description, color, parentId) {
  doc.orgUnits[id] = { id, name, description, color, ...(parentId ? { parentId } : {}) };
}

function addParticipant(id, displayName, orgUnitId, isCoordinator = false) {
  doc.participants[id] = {
    id,
    displayName,
    language: "de",
    roleDescription: "",
    about: "",
    orgUnitId,
    isCoordinator
  };
}

function owner(kind, id) {
  return { kind, id };
}

function addObjective(id, description, ownerRef, type = "quarterly") {
  doc.objectives[id] = {
    id,
    description,
    createdAt: now,
    startDate: "2026-07-01",
    endDate: type === "quarterly" ? "2026-09-30" : "2027-06-30",
    quarter: 3,
    year: 2026,
    owner: ownerRef,
    type,
    keyResultIds: [],
    crossLinkedKeyResultIds: [],
    commentIds: []
  };
}

function addKeyResult(id, objectiveId, description, currentValue, targetValue = 100, resultType = "%", weight = 1) {
  doc.keyResults[id] = {
    id,
    objectiveId,
    description,
    startValue: 0,
    targetValue,
    currentValue,
    stepSize: 5,
    weight,
    resultType,
    timeEventIds: [`te-${id}`],
    commentIds: [],
    crossLinkedObjectiveIds: []
  };
  doc.objectives[objectiveId].keyResultIds.push(id);
  doc.timeEvents[`te-${id}`] = {
    id: `te-${id}`,
    keyResultId: id,
    value: currentValue,
    participantId: doc.objectives[objectiveId].owner.kind === "participant" ? doc.objectives[objectiveId].owner.id : "p-andreas",
    createdAt: now
  };
}

function link(objectiveId, keyResultId) {
  const objective = doc.objectives[objectiveId];
  const keyResult = doc.keyResults[keyResultId];
  if (!objective || !keyResult || keyResult.objectiveId === objectiveId) return;
  if (!objective.crossLinkedKeyResultIds.includes(keyResultId)) objective.crossLinkedKeyResultIds.push(keyResultId);
  if (!keyResult.crossLinkedObjectiveIds.includes(objectiveId)) keyResult.crossLinkedObjectiveIds.push(objectiveId);
}

function addLog(id, entityKind, entityId, participantId, summary) {
  doc.changeLog[id] = {
    id,
    entityKind,
    entityId,
    action: "create",
    participantId,
    summary,
    createdAt: now
  };
}

addOrgUnit("ou-onsite", "onsite", "Gesamtbereich", "#0f6cbd");
addOrgUnit("ou-platform", "Platform", "Entwicklungsplattform", "#7c3aed", "ou-onsite");
addOrgUnit("ou-delivery", "Delivery", "Produktlieferung", "#107c10", "ou-onsite");
addOrgUnit("ou-customer", "Customer Success", "Kundennahe Arbeit", "#c19c00", "ou-onsite");
addOrgUnit("ou-enablement", "Enablement", "Wissen und Methoden", "#d13438", "ou-onsite");

addParticipant("p-andreas", "AndreasW", "ou-onsite", true);
addParticipant("p-mira", "Mira K.", "ou-platform");
addParticipant("p-jonas", "Jonas R.", "ou-platform");
addParticipant("p-samira", "Samira L.", "ou-delivery");
addParticipant("p-tom", "Tom B.", "ou-delivery");
addParticipant("p-lena", "Lena S.", "ou-customer");
addParticipant("p-nora", "Nora H.", "ou-enablement");
addParticipant("p-ivan", "Ivan P.", "ou-enablement");

addObjective("o-onsite-ai", "Bereich nutzt KI-gestützte Arbeitsweisen produktiv", owner("orgUnit", "ou-onsite"), "strategic");
addObjective("o-onsite-transparency", "OKR-Transparenz über Teamgrenzen hinweg erhöhen", owner("orgUnit", "ou-onsite"));
addObjective("o-platform-devex", "Entwicklungsumgebung ist reproduzierbar und schnell", owner("orgUnit", "ou-platform"));
addObjective("o-platform-quality", "Qualitätsrisiken früh im Entwicklungsprozess erkennen", owner("orgUnit", "ou-platform"));
addObjective("o-delivery-flow", "Durchlaufzeit für Lieferungen spürbar senken", owner("orgUnit", "ou-delivery"));
addObjective("o-delivery-release", "Releasefähigkeit ohne Sonderaktionen herstellen", owner("orgUnit", "ou-delivery"));
addObjective("o-customer-feedback", "Kundenfeedback systematisch in Planung überführen", owner("orgUnit", "ou-customer"));
addObjective("o-customer-adoption", "Nutzung der neuen OKR-App im Pilot stabilisieren", owner("orgUnit", "ou-customer"));
addObjective("o-enable-opencode", "Alle MA wissen wie man Opencode installiert und nutzt", owner("orgUnit", "ou-enablement"));
addObjective("o-enable-playbook", "Ein gemeinsames Arbeitsweisen-Playbook etablieren", owner("orgUnit", "ou-enablement"));
addObjective("o-mira-ci", "CI-Wartezeiten für Entwickler halbieren", owner("participant", "p-mira"));
addObjective("o-samira-incidents", "Wiederkehrende Lieferhindernisse sichtbar machen", owner("participant", "p-samira"));

addKeyResult("kr-ai-training", "o-onsite-ai", "60 Personen haben eine KI-Einführung absolviert", 35, 60, "Personen", 2);
addKeyResult("kr-ai-usecases", "o-onsite-ai", "12 produktive KI-Anwendungsfälle dokumentiert", 5, 12, "Use Cases");
addKeyResult("kr-ai-security", "o-onsite-ai", "Freigegebene Nutzungsleitlinie veröffentlicht", 80);
addKeyResult("kr-trans-map", "o-onsite-transparency", "Alle Team-Objectives sind im Graph sichtbar", 70);
addKeyResult("kr-trans-links", "o-onsite-transparency", "Mindestens 25 teamübergreifende Links gepflegt", 18, 25, "Links");
addKeyResult("kr-dev-env", "o-platform-devex", "Setup-Zeit neuer Rechner unter 30 Minuten", 45, 100, "%", 2);
addKeyResult("kr-dev-docs", "o-platform-devex", "Onboarding-Checkliste für Dev-Setup ist vollständig", 65);
addKeyResult("kr-quality-tests", "o-platform-quality", "Kritische Workflows haben UI-Regressionstests", 55);
addKeyResult("kr-quality-audit", "o-platform-quality", "Wöchentlicher Qualitätsbericht automatisiert", 30);
addKeyResult("kr-flow-cycle", "o-delivery-flow", "Median Cycle Time unter 5 Tage", 50);
addKeyResult("kr-flow-wip", "o-delivery-flow", "WIP-Limit in allen Teams sichtbar eingehalten", 40);
addKeyResult("kr-release-oneclick", "o-delivery-release", "Release-Checkliste ohne manuelle Nacharbeit erfüllt", 45);
addKeyResult("kr-release-smoke", "o-delivery-release", "Smoke Tests laufen vor jedem Release", 75);
addKeyResult("kr-feedback-cadence", "o-customer-feedback", "Zwei strukturierte Feedback-Termine pro Monat", 60);
addKeyResult("kr-feedback-backlog", "o-customer-feedback", "Top-10 Feedbackpunkte sind priorisiert", 50);
addKeyResult("kr-adoption-pilots", "o-customer-adoption", "Vier Pilotgruppen nutzen okr4me aktiv", 25, 4, "Gruppen", 2);
addKeyResult("kr-adoption-friction", "o-customer-adoption", "Häufigste Bedienhürden sind dokumentiert", 80);
addKeyResult("kr-opencode-install", "o-enable-opencode", "90 Prozent haben Opencode lokal installiert", 65);
addKeyResult("kr-opencode-session", "o-enable-opencode", "Drei Hands-on Sessions durchgeführt", 2, 3, "Sessions");
addKeyResult("kr-playbook-draft", "o-enable-playbook", "Playbook v1 ist reviewt", 40);
addKeyResult("kr-playbook-rituals", "o-enable-playbook", "Teamrituale sind einheitlich beschrieben", 55);
addKeyResult("kr-mira-cache", "o-mira-ci", "Dependency Cache reduziert Laufzeit um 40 Prozent", 20, 40, "%");
addKeyResult("kr-mira-flaky", "o-mira-ci", "Flaky Tests unter 2 Prozent", 35);
addKeyResult("kr-samira-board", "o-samira-incidents", "Hindernisboard wird wöchentlich aktualisiert", 70);
addKeyResult("kr-samira-causes", "o-samira-incidents", "Top-5 Ursachen sind mit Maßnahmen versehen", 45);

[
  ["o-onsite-ai", "kr-opencode-install"],
  ["o-onsite-ai", "kr-opencode-session"],
  ["o-onsite-ai", "kr-playbook-draft"],
  ["o-onsite-transparency", "kr-trans-links"],
  ["o-onsite-transparency", "kr-adoption-friction"],
  ["o-platform-devex", "kr-opencode-install"],
  ["o-platform-devex", "kr-mira-cache"],
  ["o-platform-quality", "kr-release-smoke"],
  ["o-platform-quality", "kr-samira-causes"],
  ["o-delivery-flow", "kr-mira-cache"],
  ["o-delivery-flow", "kr-feedback-backlog"],
  ["o-delivery-release", "kr-quality-tests"],
  ["o-delivery-release", "kr-samira-board"],
  ["o-customer-feedback", "kr-trans-map"],
  ["o-customer-feedback", "kr-adoption-pilots"],
  ["o-customer-adoption", "kr-opencode-session"],
  ["o-customer-adoption", "kr-playbook-rituals"],
  ["o-enable-opencode", "kr-dev-docs"],
  ["o-enable-opencode", "kr-release-oneclick"],
  ["o-enable-playbook", "kr-feedback-cadence"],
  ["o-enable-playbook", "kr-quality-audit"],
  ["o-mira-ci", "kr-dev-env"],
  ["o-mira-ci", "kr-quality-tests"],
  ["o-samira-incidents", "kr-flow-wip"],
  ["o-samira-incidents", "kr-release-smoke"]
].forEach(([objectiveId, keyResultId]) => link(objectiveId, keyResultId));

Object.values(doc.objectives).forEach((objective, index) => {
  addLog(`log-objective-${index + 1}`, "objective", objective.id, "p-andreas", `Created Objective: ${objective.description}`);
});
Object.values(doc.keyResults).forEach((keyResult, index) => {
  addLog(`log-kr-${index + 1}`, "keyResult", keyResult.id, "p-andreas", `Created Key Result: ${keyResult.description}`);
});

const documentJson = `${JSON.stringify(doc, null, 2)}\n`;
writeFileSync("public/demo/complex-graph-demo.json", documentJson);
writeFileSync("public/demo/complex-graph-demo.zuechange", documentJson);
writeFileSync("public/demo/load-complex-graph-demo.js", `const response = await fetch("/demo/complex-graph-demo.json", { cache: "no-store" });
const documentData = await response.json();
localStorage.setItem("okr4me.identity", JSON.stringify({ localId: "p-andreas", displayName: "AndreasW" }));
localStorage.setItem("okr4me.document", JSON.stringify(documentData));
localStorage.removeItem("okr4me.syncConfig");
console.info("okr4me complex graph demo data installed. Reloading...");
location.reload();
`);

console.log("Generated public/demo/complex-graph-demo.json");
console.log("Generated public/demo/complex-graph-demo.zuechange");
console.log("Generated public/demo/load-complex-graph-demo.js");
