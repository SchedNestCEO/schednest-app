export type PlatformFileProduct =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

export type PlatformFileSensitivity =
  | "standard"
  | "personal"
  | "sensitive"
  | "restricted";

export type PlatformFileSharingScope =
  | "private"
  | "approved_people"
  | "workspace";

export function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function buildPlatformFilePath(
  ownerId: string,
  product: PlatformFileProduct,
  fileName: string
) {
  const safeName = sanitizeFileName(fileName);
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID()}`;

  return `${ownerId}/${product}/${uniquePrefix}-${safeName}`;
}
