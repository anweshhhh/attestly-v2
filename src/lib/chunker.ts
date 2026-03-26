export function chunkText(content: string, chunkSize = 1200) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  for (let index = 0; index < normalized.length; index += chunkSize) {
    chunks.push(normalized.slice(index, index + chunkSize).trim());
  }

  return chunks.filter(Boolean);
}
