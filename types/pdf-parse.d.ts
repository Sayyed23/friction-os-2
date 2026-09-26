declare module "pdf-parse" {
  type PdfData = { text?: string; numpages?: number; info?: Record<string, unknown> };
  function parsePdf(buffer: Buffer): Promise<PdfData>;
  export default parsePdf;
}
