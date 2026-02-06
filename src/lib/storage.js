const KEY = "ticket_copilot_saved_v1";

export function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
export function saveAll(list) {
  localStorage.setItem(KEY, JSON.stringify(Array.isArray(list) ? list : []));
}
export function addSaved(entry) {
  const list = loadSaved();
  list.unshift(entry);
  saveAll(list);
  return list;
}
export function removeSaved(id) {
  const list = loadSaved().filter((x) => x.id !== id);
  saveAll(list);
  return list;
}
export function clearSaved() {
  saveAll([]);
  return [];
}
