export function slugifyWorkspaceName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

export function buildWorkspaceName(params: { email: string; name?: string | null; userId: string }) {
  const trimmedName = params.name?.trim();
  if (trimmedName) {
    return `${trimmedName} Workspace`;
  }

  const emailLocalPart = params.email.split("@")[0]?.trim();
  if (emailLocalPart) {
    return `${emailLocalPart}'s Workspace`;
  }

  return `Workspace ${params.userId.slice(0, 8)}`;
}
