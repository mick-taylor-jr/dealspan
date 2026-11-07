import Anthropic from '@anthropic-ai/sdk';
import { connection, NextResponse, type NextRequest } from 'next/server';
import { EXTRACT_TOOL_NAME, extractionSystemPrompt, extractionTool, sanitizeExtraction } from '@/lib/extract';

/**
 * Reads one document about the target and returns the intake fields it states, each with a quote.
 *
 * Env vars (server only, never NEXT_PUBLIC_):
 *   ANTHROPIC_API_KEY          required; without it the feature is hidden
 *   DEALSPAN_AI_MODEL          optional, default claude-haiku-5-5
 *   DEALSPAN_AI_ACCESS_CODE    optional; when set, callers must send it (keeps strangers off your key)
 *
 * Nothing is stored. The document goes to Anthropic for this one request and the cleaned fields come back.
 */

export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 150_000;
const DEFAULT_MODEL = 'claude-haiku-5-5';

// Best-effort limit per server instance. Your Anthropic spend limit is the real backstop.
const WINDOW_MS = 60 * 60 * 1000;
const PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > PER_WINDOW;
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Lets the intake page know whether to show the import box and whether to ask for a code. */
export async function GET() {
  await connection();
  return NextResponse.json({
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
    needsCode: Boolean(process.env.DEALSPAN_AI_ACCESS_CODE),
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(503, 'Document import is not set up on this site.');

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(ip)) return fail(429, 'Too many imports in the last hour. Try again later.');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'Send a file or pasted text.');
  }

  const required = process.env.DEALSPAN_AI_ACCESS_CODE;
  if (required && form.get('code') !== required) return fail(401, 'That access code is not right.');

  const file = form.get('file');
  const pasted = typeof form.get('text') === 'string' ? (form.get('text') as string).trim() : '';

  let documentBlock: Anthropic.DocumentBlockParam;
  let source: string;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return fail(413, 'That file is over 10 MB.');
    const name = file.name || 'document';
    const lower = name.toLowerCase();
    source = name;
    if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
      const data = Buffer.from(await file.arrayBuffer()).toString('base64');
      documentBlock = {
        type: 'document',
        title: name,
        source: { type: 'base64', media_type: 'application/pdf', data },
      };
    } else if (/\.(txt|csv|md|tsv)$/.test(lower) || file.type.startsWith('text/')) {
      const text = (await file.text()).slice(0, MAX_TEXT_CHARS);
      if (!text.trim()) return fail(400, 'That file is empty.');
      documentBlock = {
        type: 'document',
        title: name,
        source: { type: 'text', media_type: 'text/plain', data: text },
      };
    } else {
      return fail(
        415,
        'Use a PDF, a .txt or .csv file, or paste the text. For Excel, save the sheet as CSV.',
      );
    }
  } else if (pasted) {
    source = 'Pasted text';
    documentBlock = {
      type: 'document',
      title: 'Pasted text',
      source: { type: 'text', media_type: 'text/plain', data: pasted.slice(0, MAX_TEXT_CHARS) },
    };
  } else {
    return fail(400, 'Send a file or pasted text.');
  }

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: process.env.DEALSPAN_AI_MODEL || DEFAULT_MODEL,
      max_tokens: 4000,
      system: extractionSystemPrompt(),
      tools: [extractionTool()],
      tool_choice: { type: 'tool', name: EXTRACT_TOOL_NAME },
      messages: [
        {
          role: 'user',
          content: [
            documentBlock,
            { type: 'text', text: 'Fill in the target company fields this document states.' },
          ],
        },
      ],
    });

    if (message.stop_reason === 'max_tokens') {
      return fail(502, 'The document was too long to read in one pass. Try the financial pages only.');
    }
    const call = message.content.find(
      (block) => block.type === 'tool_use' && block.name === EXTRACT_TOOL_NAME,
    );
    if (!call || call.type !== 'tool_use') return fail(502, 'Could not read that document. Try again.');

    return NextResponse.json({ source, ...sanitizeExtraction(call.input) });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('extract: Anthropic error', error.status, error.message);
      if (error.status === 429) return fail(503, 'The AI service is busy. Try again in a minute.');
      if (error.status === 400)
        return fail(400, 'The AI service could not open that file. Is it a readable PDF?');
      return fail(502, 'The AI service had a problem. Try again.');
    }
    console.error('extract: unexpected error', error);
    return fail(500, 'Something went wrong reading that document.');
  }
}
