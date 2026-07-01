import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import pdf from "pdf-parse";

export interface ParsedPage {
  page: number;
  text: string;
}

export function parseProtocolText(content: string): ParsedPage[] {
  const pages: ParsedPage[] = [];
  const parts = content.split(/--- PAGE (\d+) ---/);

  for (let i = 1; i < parts.length; i += 2) {
    const page = parseInt(parts[i], 10);
    const text = parts[i + 1]?.trim() ?? "";
    if (text) pages.push({ page, text });
  }

  return pages;
}

export async function parseProtocolPdf(filePath: string): Promise<ParsedPage[]> {
  const buffer = readFileSync(filePath);
  const pages: ParsedPage[] = [];
  let pageNum = 0;

  await pdf(buffer, {
    pagerender: async (pageData) => {
      pageNum += 1;
      const textContent = await pageData.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (text) {
        pages.push({ page: pageNum, text });
      }
      return text;
    },
  });

  return pages;
}

export async function loadProtocolPages(
  pdfsDir: string,
  protocolsDir: string,
  protocolFile: string,
): Promise<ParsedPage[]> {
  const ext = extname(protocolFile).toLowerCase();
  const pdfPath = join(pdfsDir, protocolFile);
  const txtPath = join(protocolsDir, protocolFile);

  if (ext === ".pdf") {
    if (!existsSync(pdfPath)) {
      throw new Error(`PDF not found: ${pdfPath}`);
    }
    return parseProtocolPdf(pdfPath);
  }

  if (existsSync(txtPath)) {
    return parseProtocolText(readFileSync(txtPath, "utf-8"));
  }

  if (existsSync(pdfPath)) {
    return parseProtocolPdf(pdfPath);
  }

  throw new Error(`Protocol file not found: ${protocolFile} (looked in data/pdfs/ and data/protocols/)`);
}

export function detectSection(text: string): string {
  const numbered = text.match(
    /(?:^|\n)\d+(?:\.\d+)*\.?\s+([A-Z][A-Za-z0-9\s\-–—/]+(?:criteria|endpoints|design|treatment|monitoring|therapies|population|synopsis|intervention|objectives|methods)[A-Za-z0-9\s\-–—]*)/i,
  );
  if (numbered) return numbered[1].trim().slice(0, 80);

  const heading = text.match(
    /(?:^|\n)((?:INCLUSION|EXCLUSION|PRIMARY|SECONDARY)\s+[A-Z\s]+)/i,
  );
  if (heading) return heading[1].trim().slice(0, 80);

  return "Protocol section";
}

export const CHUNK_SIZE = 900;
export const CHUNK_OVERLAP = 120;

export function chunkPage(
  page: ParsedPage,
  trialId: string,
  startIndex: number,
): Array<{ id: string; text: string; page: number; section: string }> {
  const section = detectSection(page.text);
  const chunks: Array<{ id: string; text: string; page: number; section: string }> = [];

  if (page.text.length <= CHUNK_SIZE) {
    chunks.push({
      id: `${trialId}-c${String(startIndex).padStart(3, "0")}`,
      text: page.text,
      page: page.page,
      section,
    });
    return chunks;
  }

  let offset = 0;
  let index = startIndex;
  while (offset < page.text.length) {
    const end = Math.min(offset + CHUNK_SIZE, page.text.length);
    chunks.push({
      id: `${trialId}-c${String(index).padStart(3, "0")}`,
      text: page.text.slice(offset, end),
      page: page.page,
      section,
    });
    if (end >= page.text.length) break;
    offset = end - CHUNK_OVERLAP;
    index++;
  }

  return chunks;
}
