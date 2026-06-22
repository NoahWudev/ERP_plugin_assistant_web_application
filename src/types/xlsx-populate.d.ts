declare module 'xlsx-populate' {
  interface Row {
    height(height?: number | null): number | void | Row;
  }

  interface Cell {
    value(value?: unknown): unknown;
    clear(): Cell;
    formula(formula?: string): unknown;
    style(name: string): unknown;
    style(name: string, value: unknown): Cell;
  }

  interface Range {
    merged(merged?: boolean): boolean | Range;
    value(value?: unknown): unknown;
  }

  interface Sheet {
    cell(address: string): Cell;
    range(address: string): Range;
    row(rowNumber: number): Row;
    column(nameOrNumber: string | number): { width(width?: number): number | void };
  }

  interface Workbook {
    sheet(index: number): Sheet;
    outputAsync(): Promise<ArrayBuffer>;
  }

  interface XlsxPopulateStatic {
    fromDataAsync(data: ArrayBuffer | Uint8Array): Promise<Workbook>;
  }

  const XlsxPopulate: XlsxPopulateStatic;
  export default XlsxPopulate;
}
