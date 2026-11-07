'use client';

import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/components/workspace';
import {
  applyExtraction,
  clearField,
  currentValue,
  displayValue,
  type Extraction,
  type ImportRecord,
} from '@/lib/extract';

type Status = { kind: 'idle' } | { kind: 'working'; label: string } | { kind: 'error'; message: string };
type Config = { enabled: boolean; needsCode: boolean };

/**
 * "Start from a document": the user drops a listing, teaser, CIM or P&L and Claude fills the target's blank
 * fields. Hidden unless the server has an Anthropic key.
 */
export function DocumentImport() {
  const { intake, setIntake } = useWorkspace();
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [code, setCode] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/extract')
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Config | null) => live && setConfig(c))
      .catch(() => live && setConfig(null));
    return () => {
      live = false;
    };
  }, []);

  if (!config?.enabled) return null;

  async function send(body: FormData, label: string) {
    if (config?.needsCode) body.set('code', code);
    setStatus({ kind: 'working', label });
    try {
      const res = await fetch('/api/extract', { method: 'POST', body });
      const data = (await res.json().catch(() => null)) as
        (Extraction & { source: string; error?: string }) | null;
      if (!res.ok || !data) {
        setStatus({ kind: 'error', message: data?.error ?? 'Could not read that document. Try again.' });
        return;
      }
      setIntake((prev) => {
        const { intake: next, record } = applyExtraction(prev, data, data.source);
        return { ...next, imported: record };
      });
      setStatus({ kind: 'idle' });
      setPasteOpen(false);
      setPasted('');
    } catch {
      setStatus({
        kind: 'error',
        message: 'Could not reach the server. Check your connection and try again.',
      });
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const body = new FormData();
    body.set('file', file);
    void send(body, `Reading ${file.name}…`);
  }

  const working = status.kind === 'working';
  const record = intake.imported;

  return (
    <section className="rounded-2xl border border-line bg-card p-6" aria-labelledby="import-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="import-title" className="text-xl font-semibold tracking-tight">
            Start from a document
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Drop the broker listing, teaser, CIM or P&amp;L for the company you want to buy. Claude fills the
            target’s blank fields and shows the line each number came from. You check every value before
            anything runs.
          </p>
        </div>
      </div>

      {!record ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!working) onFile(e.dataTransfer.files[0]);
            }}
            className={`mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
              dragging ? 'border-pine bg-buyer-soft' : 'border-line bg-paper'
            }`}
          >
            {working ? (
              <p className="text-sm font-medium" role="status">
                {status.label} <span className="text-muted">This takes 10–30 seconds.</span>
              </p>
            ) : (
              <>
                <p className="text-sm">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="font-semibold text-pine underline underline-offset-4"
                  >
                    Choose a file
                  </button>{' '}
                  or drag it here
                </p>
                <p className="text-xs text-muted">
                  PDF, .txt or .csv, up to 10 MB. Save Excel sheets as CSV.
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.csv,.md,application/pdf,text/plain,text/csv"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              disabled={working}
              onClick={() => setPasteOpen((v) => !v)}
              className="text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
            >
              {pasteOpen ? 'Hide the text box' : 'Paste text instead'}
            </button>
            {config.needsCode ? (
              <label className="flex items-center gap-2 text-sm text-muted">
                Access code
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-8 w-36 rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-ink/40"
                />
              </label>
            ) : null}
          </div>

          {pasteOpen ? (
            <div className="mt-3 flex flex-col gap-2">
              <label htmlFor="import-paste" className="sr-only">
                Paste the listing or financials
              </label>
              <textarea
                id="import-paste"
                rows={6}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste the listing or financials here"
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
              />
              <div>
                <button
                  type="button"
                  disabled={working || !pasted.trim()}
                  onClick={() => {
                    const body = new FormData();
                    body.set('text', pasted);
                    void send(body, 'Reading your text…');
                  }}
                  className="h-10 rounded-full bg-pine px-5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Read this text
                </button>
              </div>
            </div>
          ) : null}

          {status.kind === 'error' ? (
            <p className="mt-3 text-sm text-risk" role="alert">
              {status.message}
            </p>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-muted">
            The document is sent to Anthropic’s Claude to read it and is not stored by Dealspan. Don’t upload
            anything your NDA doesn’t allow you to share with a service provider.
          </p>
        </>
      ) : (
        <Review record={record} />
      )}
    </section>
  );
}

function Review({ record }: { record: ImportRecord }) {
  const { intake, setIntake } = useWorkspace();
  const setRecord = (next: ImportRecord | undefined) => setIntake((prev) => ({ ...prev, imported: next }));

  if (record.checked) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-buyer-soft px-4 py-3 text-sm">
        <span className="text-[#0e6145]">
          Checked {record.filled.length} values from <span className="font-medium">{record.source}</span>.
        </span>
        <span className="flex gap-4">
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setRecord({ ...record, checked: false })}
          >
            Show them
          </button>
          <button type="button" className="underline underline-offset-4" onClick={() => setRecord(undefined)}>
            Import another document
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="rounded-xl bg-warn-soft px-4 py-3 text-sm leading-6 text-[#5c3d00]">
        <span className="font-semibold">
          Filled {record.filled.length} {record.filled.length === 1 ? 'field' : 'fields'} from {record.source}
          .
        </span>{' '}
        Check each against its source line below. The 2025 EBITDA you can back up with documents is still
        yours to confirm: the models price off it.
      </div>

      {record.filled.length ? (
        <ul className="divide-y divide-line border-y border-line text-sm">
          {record.filled.map((field) => {
            const now = currentValue(intake, field.key);
            const state = now === field.value ? 'extracted' : now === '' ? 'cleared' : 'edited';
            return (
              <li key={field.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex min-w-0 items-baseline justify-between gap-3 sm:w-[22rem] sm:shrink-0">
                  <span className="min-w-0 font-medium">{field.label}</span>
                  <span className="flex max-w-[60%] shrink-0 items-center justify-end gap-2 text-right tabular-nums">
                    {state === 'cleared' ? null : displayValue({ key: field.key, value: now })}
                    <span
                      className={`inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium ${
                        state === 'extracted' ? 'bg-warn-soft text-[#7a4f00]' : 'bg-[#eef1ee] text-muted'
                      }`}
                    >
                      {state === 'extracted' ? 'extracted' : state === 'edited' ? 'you edited' : 'cleared'}
                    </span>
                  </span>
                </div>
                <p className="min-w-0 flex-1 leading-5 text-muted">
                  “{field.quote}”
                  {field.page ? <span className="whitespace-nowrap"> · p. {field.page}</span> : null}
                </p>
                {state !== 'cleared' ? (
                  <button
                    type="button"
                    className="self-start text-xs text-muted underline underline-offset-4 hover:text-ink"
                    onClick={() => setIntake((prev) => clearField(prev, field.key))}
                    aria-label={`Clear ${field.label}`}
                  >
                    Clear
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          The document didn’t clearly state any of the fields Dealspan needs.
        </p>
      )}

      {record.kept.length ? (
        <div>
          <h3 className="text-sm font-semibold">Kept your numbers</h3>
          <p className="mt-1 text-xs text-muted">
            The document says something different from what you typed.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {record.kept.map((field) => (
              <li key={field.key}>
                <span className="font-medium">{field.label}:</span> you have{' '}
                {displayValue({ key: field.key, value: field.yours })}, the document says{' '}
                {displayValue(field)} (“
                {field.quote}”)
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {record.notes.length ? (
        <div>
          <h3 className="text-sm font-semibold">Worth knowing</h3>
          <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-muted">
            {record.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setRecord({ ...record, checked: true })}
          className="h-10 rounded-full bg-pine px-5 text-sm font-semibold text-white"
        >
          I’ve checked these
        </button>
        <button
          type="button"
          onClick={() => setRecord(undefined)}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Import another document
        </button>
      </div>
    </div>
  );
}
