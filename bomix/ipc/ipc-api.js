// bonita/ipc/ipc-api.js

class IPC {
  async send(action, data) {
    if (!window.BoMixAPI || !window.BoMixAPI.sendAction) {
      throw new Error("BoMix API not available");
    }
    return window.BoMixAPI.sendAction(action, data);
  }
}

export const ipc = new IPC();
