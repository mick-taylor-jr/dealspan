'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useWorkspace } from '@/components/workspace';
import {
  applyExtraction,
  clearField,
  currentValue,
  displayValue,
  type Extraction,
  type ImportRecord,
  type Role,
} from '@/lib/extract';
import type { Intake } from '@/lib/types';

type Status = { kind: 'idle' } | { kind: 'working'; label: string } | { kind: 'error'; message: string };
type Config = { enabled: boolean; needsCode: boolean };

const COPY: Record<Role, { title: string; body: string; paste: string; accent: string }> = {
  buyer: {
    title: 'Your company’s financial statements',
    body: 'Income statement, balance sheet and cash flow statement. Fills your company’s blank fields.',
    paste: 'Paste your financial statements here',
    accent: 'bg-buyer',
  },
  target: {
    title: 'The company you want to buy',
    body: 'Broker listing, teaser, CIM or P&L. Fills the target’s blank fields.',
    paste: 'Paste the listing or financials here',
    accent: 'bg-target',
  },
};

const recordKey = (role: Role): 'importedBuyer' | 'imported' =>
  role === 'buyer' ? 'importedBuyer' : 'imported';

/**
 * "Start from documents": one box for the buyer's own financial statements and one for the target's listing,
 * CIM or P&L. Claude fills each company's blank fields and shows the line each number came from.
 * Hidden unless the server has an Anthropic key.
 */
export function DocumentImport() {
  const [config, setConfig] = useState<Config | null>(null);
  const [code, setCode] = useState('');

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

  return (
    <section className="rounded-2xl border border-line bg-card p-6" aria-labelledby="import-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="import-title" className="text-xl font-semibold tracking-tight">
            Start from documents
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Skip the typing. Drop your company’s financial statements and the target’s CIM or P&amp;L. Claude
            fills each company’s blank fields and shows the line every number came from. You check each value
            before anything runs.
          </p>
        </div>
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

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <ImportPanel role="buyer" code={config.needsCode ? code : null} />
        <ImportPanel role="target" code={config.needsCode ? code : null} />
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        Documents are sent to Anthropic’s Claude to read them and are not stored by Dealspan. Don’t upload
        anything your NDA doesn’t allow you to share with a service provider.
      </p>
    </section>
  );
}

function ImportPanel({ role, code }: { role: Role; code: string | null }) {
  const { intake, setIntake } = useWorkspace();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const copy = COPY[role];
  const record = intake[recordKey(role)];

  async function send(body: FormData, label: string) {
    body.set('role', role);
    if (code != null) body.set('code', code);
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
        const { intake: next, record: rec } = applyExtraction(prev, data, data.source, role);
        return { ...next, [recordKey(role)]: rec } as Intake;
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

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className={`h-1 ${copy.accent}`} />
      <div className="p-4">
        <h3 className="text-base font-semibold">{copy.title}</h3>
        <p className="mt-0.5 text-sm leading-6 text-muted">{copy.body}</p>

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
              className={`mt-3 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
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

            <button
              type="button"
              disabled={working}
              onClick={() => setPasteOpen((v) => !v)}
              className="mt-2 text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
            >
              {pasteOpen ? 'Hide the text box' : 'Paste text instead'}
            </button>

            {pasteOpen ? (
              <div className="mt-2 flex flex-col gap-2">
                <label htmlFor={pasteId} className="sr-only">
                  {copy.paste}
                </label>
                <textarea
                  id={pasteId}
                  rows={5}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={copy.paste}
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
              <p className="mt-2 text-sm text-risk" role="alert">
                {status.message}
              </p>
            ) : null}
          </>
        ) : (
          <Review role={role} record={record} />
        )}
      </div>
    </div>
  );
}

function Review({ role, record }: { role: Role; record: ImportRecord }) {
  const { intake, setIntake } = useWorkspace();
  const setRecord = (next: ImportRecord | undefined) =>
    setIntake((prev) => ({ ...prev, [recordKey(role)]: next }) as Intake);

  if (record.checked) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-buyer-soft px-4 py-3 text-sm">
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
            Import another
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="rounded-xl bg-warn-soft px-3 py-2.5 text-sm leading-6 text-[#5c3d00]">
        <span className="font-semibold">
          Filled {record.filled.length} {record.filled.length === 1 ? 'field' : 'fields'} from {record.source}
          .
        </span>{' '}
        {role === 'target'
          ? 'Check each against its source line. The 2025 EBITDA you can back up with documents is still yours to confirm: the models price off it.'
          : 'Check each against its source line.'}
      </div>

      {record.filled.length ? (
        <ul className="divide-y divide-line border-y border-line text-sm">
          {record.filled.map((field) => {
            const now = currentValue(intake, field.key, role);
            const state = now === field.value ? 'extracted' : now === '' ? 'cleared' : 'edited';
            return (
              <li key={field.key} className="flex flex-col gap-1 py-2.5">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="min-w-0 font-medium">{field.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-right tabular-nums">
                    {state === 'cleared' ? null : displayValue({ key: field.key, value: now }, role)}
                    <span
                      className={`inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium ${
                        state === 'extracted' ? 'bg-warn-soft text-[#7a4f00]' : 'bg-[#eef1ee] text-muted'
                      }`}
                    >
                      {state === 'extracted' ? 'extracted' : state === 'edited' ? 'you edited' : 'cleared'}
                    </span>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-xs leading-5 text-muted">
                    “{field.quote}”
                    {field.page ? <span className="whitespace-nowrap">, p. {field.page}</span> : null}
                  </p>
                  {state !== 'cleared' ? (
                    <button
                      type="button"
                      className="text-xs text-muted underline underline-offset-4 hover:text-ink"
                      onClick={() => setIntake((prev) => clearField(prev, field.key, role))}
                      aria-label={`Clear ${field.label}`}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
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
          <h4 className="text-sm font-semibold">Kept your numbers</h4>
          <p className="mt-1 text-xs text-muted">
            The document says something different from what you typed.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {record.kept.map((field) => (
              <li key={field.key}>
                <span className="font-medium">{field.label}:</span> you have{' '}
                {displayValue({ key: field.key, value: field.yours }, role)}, the document says{' '}
                {displayValue(field, role)} (“
                {field.quote}”)
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {record.notes.length ? (
        <div>
          <h4 className="text-sm font-semibold">Worth knowing</h4>
          <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-muted">
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
          Import another
        </button>
      </div>
    </div>
  );
}
