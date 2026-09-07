export type FeedbackQuestion = { id: string; label: string; hint?: string };

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  { id: "attendance", label: "Pjesëmarrja & përpikëria", hint: "Erdhi rregullisht dhe në orar." },
  { id: "discipline", label: "Disiplina në vendin e punës", hint: "Respektoi rregullat dhe sigurinë." },
  { id: "communication", label: "Komunikimi", hint: "Komunikoi qartë me kolegët dhe eprorët." },
  { id: "teamwork", label: "Puna në grup", hint: "Bashkëpunoi mirë me ekipin." },
  { id: "technical", label: "Njohuritë teknike", hint: "Zotëroi njohuritë e nevojshme profesionale." },
  { id: "quality", label: "Cilësia e punës", hint: "Detyrat u kryen me saktësi." },
  { id: "initiative", label: "Iniciativa", hint: "Kërkoi detyra dhe zgjidhje vetë." },
  { id: "learning", label: "Aftësia për të mësuar", hint: "Përvetësoi shpejt udhëzimet e reja." },
  { id: "responsibility", label: "Përgjegjshmëria", hint: "Mori përsipër detyrat e caktuara." },
  { id: "recommend", label: "Do ta rekomandonit për punësim", hint: "Vlerësim i përgjithshëm." },
];

export const PASS_THRESHOLD = 7;
