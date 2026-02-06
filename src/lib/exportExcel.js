// FILE: /src/lib/exportExcel.js
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportSavedToXlsx(rows) {
  const safeRows = (rows || []).map((r) => ({
    SavedAt: r.savedAt || "",
    Itinerary: r.itinerary || "",
    GuestName: r.guestName || "",
    HotelName: r.hotelName || "",
    Issue: r.issue || "",
    Flags: r.flags || "",
    MacroTitle: r.macroTitle || "",
    RawChars: r.rawChars ?? 0,
    DraftReply: r.draftReply || "",
  }));

  const ws = XLSX.utils.json_to_sheet(safeRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Saved");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const fileName = `ticket-copilot-saved-${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fileName);
}
