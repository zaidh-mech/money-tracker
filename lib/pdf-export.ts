import { registerPlugin } from "@capacitor/core";

type PdfExportPlugin = {
  savePdf(options: { fileName: string; base64Data: string }): Promise<{ saved: boolean }>;
};

export const PdfExport = registerPlugin<PdfExportPlugin>("PdfExport");
