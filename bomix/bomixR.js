import * as XLSX from "xlsx"; // sheetJS
import { ipc } from "app/bomix/ipc/ipc-api";

export class BoMixR {
  //private db: Datastore;

  constructor() {
    //this.db = Datastore.create({ filename: 'C:/temp/test.db', autoload: true });
    //this.db = Datastore.create();
    //this.db = Datastore.create({ inMemoryOnly: true });
    // const version = ipc.send("get-app-version", undefined);
    // console.log(version);
  }

  /**
   * @description 讀取 Excel 檔案，並列出檔案名稱與每個 Sheet 名稱
   * @param {File} file - 要讀取的 Excel 檔案
   * @returns {Promise<void>} - 當處理完成後返回的 Promise
   */
  async importBOMfromXLS(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result);
      const workbook = XLSX.read(data, { type: "array" });

      console.log(`檔案名稱: ${file.name}`);
      workbook.SheetNames.forEach((sheetName) => {
        console.log(`包含的 Sheet: ${sheetName}`);
      });
    };

    reader.readAsArrayBuffer(file);
  }

  test(str) {
    console.log("test ", str);
  }
}
