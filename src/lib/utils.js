import { v4 as uuidv4 } from "uuid";
export const genId = () => uuidv4();
export const nowIso = () => new Date().toISOString();
export const clampText = (s = "", max = 2000) => {
  const t = String(s ?? "");
  return t.length > max ? t.slice(0, max) : t;
};
