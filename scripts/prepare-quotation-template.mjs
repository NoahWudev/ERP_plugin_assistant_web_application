/**
 * 從公司原始公版產生空白模板（保留圖片、排版、約定條款）。
 * 用法：node scripts/prepare-quotation-template.mjs [來源.xlsx] [輸出.xlsx]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XlsxPopulate from 'xlsx-populate';
import {
  COLUMN_D_NUMBER,
  COLUMN_D_WIDTH,
  patchColumnWidthInXlsx,
} from '../src/utils/xlsxColumnWidth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const sourcePath = process.argv[2] ?? path.join(root, '20260410-016報價單.xlsx');
const outputPath =
  process.argv[3] ?? path.join(root, 'public/templates/quotation-template.xlsx');

const ITEM_START_ROW = 11;
const ITEM_END_ROW = 27;

const ITEM_AREA_MERGES = [
  'B12:C20',
  'B23:C24',
  'F23:G23',
  'B11:C11',
  'F11:G11',
  'B21:C21',
  'F21:G21',
  'B22:C22',
  'F22:G22',
  'B25:C25',
  'F25:G25',
  'B26:C26',
  'F26:G26',
  'B27:C27',
  'F27:G27',
  'F24:G24',
];

const HEADER_DATA_CELLS = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'E4', 'E5', 'E7', 'E8', 'B28'];

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error(`找不到來源檔：${sourcePath}`);
    process.exit(1);
  }

  const workbook = await XlsxPopulate.fromDataAsync(fs.readFileSync(sourcePath));
  const sheet = workbook.sheet(0);

  for (const merge of ITEM_AREA_MERGES) {
    try {
      sheet.range(merge).merged(false);
    } catch {
      // 部分合併範圍可能已不存在，略過即可。
    }
  }

  for (let row = ITEM_START_ROW; row <= ITEM_END_ROW; row++) {
    for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      sheet.cell(`${col}${row}`).clear();
    }
    sheet.range(`B${row}:C${row}`).merged(true);
    sheet.range(`F${row}:G${row}`).merged(true);
  }

  for (const cell of HEADER_DATA_CELLS) {
    sheet.cell(cell).clear();
  }

  sheet.cell('E6').value('NT');
  sheet.cell('F28').clear();
  sheet.cell('F29').clear();
  sheet.cell('F30').clear();

  sheet.column(COLUMN_D_NUMBER).width(COLUMN_D_WIDTH);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  let output = await workbook.outputAsync();
  output = await patchColumnWidthInXlsx(output, COLUMN_D_NUMBER, COLUMN_D_WIDTH);
  fs.writeFileSync(outputPath, Buffer.from(output));
  console.log(`已產生空白公版：${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
