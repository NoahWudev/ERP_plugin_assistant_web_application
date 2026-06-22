/**
 * Excel 欄寬換算
 *
 * OOXML 的 <col width="..."> 是「外寬」（含左右 padding 5px）。
 * Excel 欄寬對話框顯示的是「字元寬度」(wch) ≈ (pixels - 5) / MDW。
 *
 * 公版使用 新細明體 11pt，MDW ≈ 8。
 * 要讓 Excel 顯示 11.88（約 100px），OOXML 需存 char2width(11.88) ≈ 12.504。
 */

/** 新細明體 11pt 在 Excel 的 Max Digit Width */
const PMINGLIU_11_MDW = 8;

/** D 欄在 Excel 介面應顯示的字元寬度 */
export const COLUMN_D_DISPLAY_WIDTH = 11.88;

/** D 欄欄位編號（第 4 欄） */
export const COLUMN_D_NUMBER = 4;

/** 寫入 xlsx 的 OOXML 欄寬 */
export const COLUMN_D_WIDTH = excelCharWidthToOoxmlWidth(COLUMN_D_DISPLAY_WIDTH, PMINGLIU_11_MDW);

export function excelCharWidthToOoxmlWidth(charWidth, mdw = PMINGLIU_11_MDW) {
  if (charWidth <= 0) return 0;
  return Math.round(((charWidth * mdw + 5) / mdw) * 256) / 256;
}

export function ooxmlWidthToExcelCharWidth(width, mdw = PMINGLIU_11_MDW) {
  const pixels = Math.floor(((Math.floor(width * 256 + Math.floor(128 / mdw)) / 256) * mdw));
  return (pixels - 5) / mdw;
}

function renderCol(col) {
  const widthAttr = col.width ? ` width="${col.width}"` : '';
  const customAttr = col.customWidth ? ' customWidth="1"' : '';
  return `<col min="${col.min}" max="${col.max}"${widthAttr}${col.style}${customAttr}/>`;
}

export function patchSheetXmlColumnWidth(xml, columnNumber, width) {
  const colRegex = /<col\b[^>]*\/>/g;
  const cols = [...xml.matchAll(colRegex)].map((match) => match[0]);

  const parsed = cols.map((colXml) => ({
    min: Number(colXml.match(/min="(\d+)"/)?.[1]),
    max: Number(colXml.match(/max="(\d+)"/)?.[1]),
    style: colXml.match(/\sstyle="[^"]*"/)?.[0] ?? '',
    width: colXml.match(/width="([^"]+)"/)?.[1],
    customWidth: colXml.includes('customWidth="1"'),
  }));

  const nextCols = [];
  let handled = false;
  const widthText = String(width);

  for (const col of parsed) {
    if (columnNumber < col.min || columnNumber > col.max) {
      nextCols.push(col);
      continue;
    }

    if (col.min === columnNumber && col.max === columnNumber) {
      nextCols.push({
        ...col,
        width: widthText,
        customWidth: true,
      });
      handled = true;
      continue;
    }

    if (col.min < columnNumber) {
      nextCols.push({
        ...col,
        max: columnNumber - 1,
      });
    }

    nextCols.push({
      min: columnNumber,
      max: columnNumber,
      style: col.style,
      width: widthText,
      customWidth: true,
    });

    if (col.max > columnNumber) {
      nextCols.push({
        ...col,
        min: columnNumber + 1,
      });
    }

    handled = true;
  }

  if (!handled) {
    nextCols.push({
      min: columnNumber,
      max: columnNumber,
      style: ' style="2"',
      width: widthText,
      customWidth: true,
    });
  }

  const rendered = nextCols
    .sort((a, b) => a.min - b.min)
    .map(renderCol)
    .join('');

  if (/<cols>[\s\S]*?<\/cols>/.test(xml)) {
    return xml.replace(/<cols>[\s\S]*?<\/cols>/, `<cols>${rendered}</cols>`);
  }

  return xml.replace(/<sheetFormatPr[^/]*\/>/, (match) => `${match}<cols>${rendered}</cols>`);
}

export async function patchColumnWidthInXlsx(
  buffer,
  columnNumber,
  width,
  sheetPath = 'xl/worksheets/sheet1.xml',
) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) return buffer;

  const xml = await sheetFile.async('string');
  zip.file(sheetPath, patchSheetXmlColumnWidth(xml, columnNumber, width));
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}
