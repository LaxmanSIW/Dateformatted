import { StorageAPI, MessageAPI } from './SplunkClient.js';

// Create singleton instances
const storage = new StorageAPI('./storage.json');
const messaging = new MessageAPI();

// Create a chrome API object that mimics Chrome's API structure
const chrome = {
  storage: {
    local: storage
  },
  runtime: {
    onMessage: {
      addListener: (callback) => messaging.addListener(callback),
      removeListener: (callback) => messaging.removeListener(callback)
    },
    sendMessage: (message, responseCallback) => messaging.sendMessage(message, responseCallback)
  }
};

// Make chrome globally available
global.chrome = chrome;

export { chrome, storage, messaging };