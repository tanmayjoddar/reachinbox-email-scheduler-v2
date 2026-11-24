const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseLeads(text: string): { valid: string[]; skipped: number } {
  const tokens = text.split(/[,;\s\n\r]+/).map((t) => t.trim().replace(/^["']|["']$/g, '').toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  let skipped = 0;

  for (const token of tokens) {
    if (!EMAIL_RE.test(token)) {
      skipped++;
    } else if (seen.has(token)) {
      skipped++;
    } else {
      seen.add(token);
    }
  }

  return { valid: [...seen], skipped };
}
