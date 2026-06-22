declare module '*/xlsxColumnWidth.mjs' {
  export const COLUMN_D_DISPLAY_WIDTH: 11.88;
  export const COLUMN_D_NUMBER: 4;
  export const COLUMN_D_WIDTH: number;

  export function excelCharWidthToOoxmlWidth(charWidth: number, mdw?: number): number;
  export function ooxmlWidthToExcelCharWidth(width: number, mdw?: number): number;

  export function patchSheetXmlColumnWidth(
    xml: string,
    columnNumber: number,
    width: number,
  ): string;

  export function patchColumnWidthInXlsx(
    buffer: ArrayBuffer,
    columnNumber: number,
    width: number,
    sheetPath?: string,
  ): Promise<ArrayBuffer>;
}

declare module './xlsxColumnWidth.mjs' {
  export const COLUMN_D_DISPLAY_WIDTH: 11.88;
  export const COLUMN_D_NUMBER: 4;
  export const COLUMN_D_WIDTH: number;

  export function excelCharWidthToOoxmlWidth(charWidth: number, mdw?: number): number;
  export function ooxmlWidthToExcelCharWidth(width: number, mdw?: number): number;

  export function patchSheetXmlColumnWidth(
    xml: string,
    columnNumber: number,
    width: number,
  ): string;

  export function patchColumnWidthInXlsx(
    buffer: ArrayBuffer,
    columnNumber: number,
    width: number,
    sheetPath?: string,
  ): Promise<ArrayBuffer>;
}
