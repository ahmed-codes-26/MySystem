const aliases = [
  [/^e[\s-]?mail(?:\s+address)?$/i, 'Email'],
  [/^(?:password|pass|pwd)$/i, 'Password'],
  [/^(?:phone|mobile|telephone)(?:\s+(?:number|no\.?))?$/i, 'Phone'],
  [/^(?:username|user\s+name|login)$/i, 'Username'],
  [/^(?:url|website|site)$/i, 'Website'],
];
export function parseVaultDetails(text) {
  if (!text.trim() || text.length > 20000) throw new Error('Enter details up to 20,000 characters.');
  const fields = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = /^([^:：]{1,80})[:：](.*)$/.exec(line);
    if (!match || !match[1].trim() || !match[2].trim()) throw new Error(`Line ${index + 1}: use Label: value, with one field per line.`);
    const label = match[1].trim();
    fields.push({ label: aliases.find(([pattern]) => pattern.test(label))?.[1] || label, value: match[2].replace(/^ /, '') });
  }
  if (fields.length > 100) throw new Error('Use no more than 100 fields per app.');
  return fields;
}
export const isSecretField = label => /password|passphrase|pin|secret|token|key|code/i.test(label);
