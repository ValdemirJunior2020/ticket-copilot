import React from "react";

export default function Flags({ flags }) {
  if (!flags?.length) return null;
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
      <div className="text-sm font-semibold text-amber-200">Quick checks</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
        {flags.map((f, idx) => (
          <li key={idx}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
