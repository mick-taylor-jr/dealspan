/**
 * The Anthropic API key, read on the server only. ANTHROPIC_API_KEY is the standard name; DealSpan is also
 * accepted because that is what the key is saved as in the team's Vercel project.
 */
export function anthropicKey(): string | undefined {
  const key = (process.env.ANTHROPIC_API_KEY || process.env.DealSpan || process.env.DEALSPAN || '').trim();
  return key || undefined;
}
