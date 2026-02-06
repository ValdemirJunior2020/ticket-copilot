import React from "react";

function CopyBtn({ text, label = "Copy" }) {
  const [ok, setOk] = React.useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text || "");
      setOk(true);
      setTimeout(() => setOk(false), 900);
    } catch {
      setOk(false);
    }
  }
  return (
    <button
      onClick={onCopy}
      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 active:scale-[0.99]"
      type="button"
    >
      {ok ? "Copied!" : label}
    </button>
  );
}

function Panel({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <CopyBtn text={text} />
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-relaxed">
{text || "—"}
      </pre>
    </div>
  );
}

export default function Outputs({ outputs }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Internal Note" text={outputs?.internalNote} />
      <Panel title="Email Reply" text={outputs?.emailReply} />
      <Panel title="Slack Draft" text={outputs?.slackDraft} />
    </div>
  );
}
