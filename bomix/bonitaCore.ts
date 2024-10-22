import * as XLSX from 'xlsx'; // sheetJS
//import Datastore from 'nedb-promises'; // NEDB

export class Bonita {
  //private db: Datastore;

  constructor() {
    //this.db = Datastore.create({ filename: 'C:/temp/test.db', autoload: true });
    //this.db = Datastore.create();
    //this.db = Datastore.create({ inMemoryOnly: true });
  }

  /**
   * @description 讀取 Excel 檔案，並列出檔案名稱與每個 Sheet 名稱
   * @param {File} file - 要讀取的 Excel 檔案
   * @returns {Promise<void>} - 當處理完成後返回的 Promise
   */
  async importBOMfromXLS(file: File): Promise<void> {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      console.log(`檔案名稱: ${file.name}`);
      workbook.SheetNames.forEach((sheetName: string) => {
        console.log(`包含的 Sheet: ${sheetName}`);
      });
    };

    reader.readAsArrayBuffer(file);
  }

  test(str: string) {
    console.log('test ', str);
  }
}
