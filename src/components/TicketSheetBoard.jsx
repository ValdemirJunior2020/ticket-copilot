import React from "react";
import { fetchTicketsFromSheet } from "../lib/sheetTickets.js";

const STATUS_OPTIONS = [
  "Solved",
  "Receipt Needed",
  "Lucid Travel",
  "Rooming List",
  "Pending",
  "Refund missing - Slack",
  "Voucher missing - Slack",
  "Escalated to Karen",
  "Slacked",
  "Legal Letter",
  "Needs to Modify",
  "Access",
  "Premium Support",
  "BooknBlock",
];

function normalizeKey(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function guessField(row, cols, wanted) {
  // wanted examples: ["ticket", "ticketid"], ["priority"], ["subject"], ["assignee"], ["status"]
  const map = {};
  for (const c of cols) map[normalizeKey(c)] = c;

  for (const w of wanted) {
    const hit = map[normalizeKey(w)];
    if (hit && row[hit] !== undefined) return row[hit];
  }

  // fallback: scan for partial matches
  const keys = Object.keys(row || {});
  for (const k of keys) {
    const nk = normalizeKey(k);
    if (wanted.some((w) => nk.includes(normalizeKey(w)))) return row[k];
  }
  return "";
}

export default function TicketSheetBoard() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [cols, setCols] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");

  // local overrides (status edits) until Firebase later
  const [overrides, setOverrides] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ticket_overrides_v1") || "{}");
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await fetchTicketsFromSheet();
        setCols(data.cols);
        setRows(data.rows);
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function saveOverrides(next) {
    setOverrides(next);
    localStorage.setItem("ticket_overrides_v1", JSON.stringify(next));
  }

  function getTicketId(row) {
    // try to detect the Ticket ID column
    const id =
      guessField(row, cols, ["Ticket", "Ticket ID", "ticket_id", "id"]) ||
      row.__cells?.[0] ||
      "";
    return String(id || "").trim();
  }

  function getStatus(row) {
    // your sheet seems to have a status dropdown column
    const fromSheet = guessField(row, cols, ["Status", "Ticket Tagging", "tagging", "state"]) || row.__cells?.[5] || "";
    const id = getTicketId(row);
    const local = overrides[id];
    return local || fromSheet || "";
  }

  function setStatus(row, nextStatus) {
    const id = getTicketId(row);
    if (!id) return;
    saveOverrides({ ...overrides, [id]: nextStatus });
  }

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tickets from Google Sheet (Clean Up/TR)</h2>
          <p className="text-xs text-white/60">
            This is a read view + local status overrides. Later we’ll save edits to Firebase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search… (ticket, itin, name, subject)"
            className="w-72 max-w-full rounded-xl border border-white/10 bg-black/30 p-2 text-sm outline-none focus:border-white/20"
          />
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-white/70">Loading sheet…</div>
      ) : err ? (
        <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-200">
          <div className="font-semibold">Sheet fetch error</div>
          <div className="mt-1">{err}</div>
          <div className="mt-2 text-xs text-white/60">
            If the sheet is not public, GVIZ may fail in the browser. We can switch to a tiny server proxy (recommended).
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/70">
              <tr>
                <th className="p-3">Ticket</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Hotel/Guest</th>
                <th className="p-3">Assignee</th>
                <th className="p-3">Status</th>
                <th className="p-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const ticket = getTicketId(row);
                const priority = guessField(row, cols, ["Priority"]) || row.__cells?.[1] || "";
                const subject = guessField(row, cols, ["Subject", "Title"]) || row.__cells?.[2] || "";
                const hotelGuest = guessField(row, cols, ["Requester", "Client", "Hotel", "Guest"]) || row.__cells?.[3] || "";
                const assignee = guessField(row, cols, ["Assignee", "Assigned", "Agent"]) || row.__cells?.[4] || "";
                const owner = guessField(row, cols, ["Owner"]) || row.__cells?.[6] || "";
                const status = getStatus(row);

                return (
                  <tr key={`${ticket}-${idx}`} className="border-t border-white/10">
                    <td className="p-3 font-semibold">{ticket || "—"}</td>
                    <td className="p-3">{priority || "—"}</td>
                    <td className="p-3">{subject || "—"}</td>
                    <td className="p-3">{hotelGuest || "—"}</td>
                    <td className="p-3">{assignee || "—"}</td>
                    <td className="p-3">
                      <select
                        className="w-56 rounded-xl border border-white/10 bg-black/30 p-2 text-sm outline-none focus:border-white/20"
                        value={status || ""}
                        onChange={(e) => setStatus(row, e.target.value)}
                      >
                        <option value="">(blank)</option>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">{owner || "—"}</td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td className="p-6 text-white/50" colSpan={7}>
                    No rows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
