/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.js you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */

// BoMix
import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("BoMixAPI", {
  sendAction: async (action, data) => {
    return ipcRenderer.invoke("BoMix-action", { action, data });
  },
  selectDirectory: async () => {
    return ipcRenderer.invoke("dialog:openDirectory");
  },
  getFilePath(file) {
    // It's best not to expose the full file path to the web content if
    // possible.
    const path = webUtils.getPathForFile(file);
    //alert(`Uploaded file path was: ${path}`);
    return path;
  },
});
