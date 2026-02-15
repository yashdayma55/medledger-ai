import { extractText, getDocumentProxy } from "unpdf";

export class PDFParseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PDFParseError";
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    if (!buffer || buffer.length === 0) {
      throw new PDFParseError("PDF buffer is empty or invalid");
    }

    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });

    const trimmed = (text ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!trimmed) {
      throw new PDFParseError(
        "PDF contains no readable text. The file may be corrupted, password-protected, or contain only images."
      );
    }

    return trimmed;
  } catch (error) {
    if (error instanceof PDFParseError) throw error;
    throw new PDFParseError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error : undefined
    );
  }
}
