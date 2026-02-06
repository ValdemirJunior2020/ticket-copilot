import React from "react";

export default function SavedTable({ rows, onRemove }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Saved</h2>
        <span className="text-xs text-white/60">{rows?.length || 0} rows</span>
      </div>

      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-white/5 text-xs text-white/70">
            <tr>
              <th className="p-3">Created</th>
              <th className="p-3">Category</th>
              <th className="p-3">Itinerary</th>
              <th className="p-3">Guest</th>
              <th className="p-3">Hotel</th>
              <th className="p-3">Macro</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="p-3 text-white/70">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3">{r.category}</td>
                <td className="p-3 font-semibold">{r.fields?.itinerary || "—"}</td>
                <td className="p-3">{r.fields?.guestName || "—"}</td>
                <td className="p-3">{r.fields?.hotelName || "—"}</td>
                <td className="p-3">{r.macroKey}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows?.length && (
              <tr>
                <td className="p-6 text-white/50" colSpan={7}>
                  Nothing saved yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
