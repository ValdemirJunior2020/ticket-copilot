import React from "react";
import { MACROS } from "../data/macros.js";

export default function MacroPicker({ value, onChange }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold">Macro</h2>
      <div className="mt-3">
        <select
          className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-white/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {MACROS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-white/60">Pick the approved template that matches the case.</p>
      </div>
    </div>
  );
}
