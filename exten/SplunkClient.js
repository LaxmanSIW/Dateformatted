import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Chrome Storage API replacement
class StorageAPI {
  constructor(storagePath = './storage.json') {
    this.storagePath = storagePath;
    this.cache = {};
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      this.cache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, create empty storage
      this.cache = {};
      await this.save();
    }
    this.initialized = true;
    return true;
  }

  async save() {
    await fs.writeFile(this.storagePath, JSON.stringify(this.cache, null, 2));
  }

  // Chrome compatible storage.local.get API
  get(keys, callback = null) {
    const getAsync = async () => {
      if (!this.initialized) await this.initPromise;
      
      let result = {};
      
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = this.cache[key] || null;
        });
      } else if (typeof keys === 'string') {
        result[keys] = this.cache[keys] || null;
      } else if (keys === null || keys === undefined) {
        result = { ...this.cache };
      } else if (typeof keys === 'object') {
        // Handle chrome.storage.local.get({key: defaultValue})
        Object.keys(keys).forEach(key => {
          result[key] = this.cache[key] !== undefined ? this.cache[key] : keys[key];
        });
      }
      
      return result;
    };

    if (callback) {
      getAsync().then(callback);
      return;
    }
    
    return getAsync();
  }

  // Chrome compatible storage.local.set API
  set(items, callback = null) {
    const setAsync = async () => {
      if (!this.initialized) await this.initPromise;
      
      Object.assign(this.cache, items);
      await this.save();
      return true;
    };

    if (callback) {
      setAsync().then(callback);
      return;
    }
    
    return setAsync();
  }
}

// Chrome Message API replacement
class MessageAPI extends EventEmitter {
  constructor() {
    super();
    this.listeners = [];
  }

  // Chrome compatible runtime.onMessage.addListener
  addListener(callback) {
    this.listeners.push(callback);
    return callback;
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Chrome compatible runtime.sendMessage
  sendMessage(message, responseCallback = null) {
    const sendMessageAsync = async () => {
      let responseReceived = false;
      let finalResponse;
      
      const sendResponse = (response) => {
        if (!responseReceived) {
          responseReceived = true;
          finalResponse = response;
          return true;
        }
      };
      
      // Process through all listeners
      for (const listener of this.listeners) {
        // Check if listener wants to keep channel open for async response
        const keepChannelOpen = listener(message, {}, sendResponse);
        
        // If listener doesn't keep channel open and no response yet, continue to next listener
        if (!keepChannelOpen && !responseReceived) {
          continue;
        }
        
        // If keeping channel open, wait a bit for potential async response
        if (keepChannelOpen) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (responseReceived) break;
        }
      }
      
      return finalResponse;
    };

    if (responseCallback) {
      sendMessageAsync().then(responseCallback);
      return;
    }
    
    return sendMessageAsync();
  }
}

// SplunkClient class (modified from your code)
class SplunkClient {
  constructor() {
    this.cancelLoad = false;
    this.searchQueryPaceEventData = 'search index=wpc sourcetype=paceEvent_data_common_prod earliest=-5h | table EVENT SOURCE FEED';
  }

  // starting point
  async getData(searchQuery = this.searchQueryPaceEventData, session_key) {
    try {
      if (!session_key) return { status: false, msg: `Issue in session key ${session_key}` };

      const validSession = await this.ensureSessionKey(session_key);
      if (!validSession.status) return { status: false, msg: `Session key is expired ${validSession.status}` };

      const sid = await this.createSearch(searchQuery, session_key);
      if (!sid) return { status: false, msg: `Issue to get sid ${sid}` };

      const gonext = await this.waitForSearchToFinish(sid, session_key);
      if (!gonext.status) return { status: false, msg: `Issue with query finish status ${gonext.status}` };

      const result = await this.getSearchResult(sid, session_key);
      return { status: true, result: result };
    } catch (error) {
      return { status: false, msg: error };
    }
  }

  async ensureSessionKey(session_key) {
    if (session_key) {
      const isValid = await this.isSessionValid(session_key);
      // return if session key is valid
      if (isValid) return { status: true };
      console.warn('Session Key expired..');
    }
    return { status: false };
  }

  async isSessionValid(session_key) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Splunk ${session_key}`
      }
    };

    const res = await fetch('https://splunk-apps-api.example.net/services/authentication/users?output_mode=json', options);
    return res.ok;
  }

  async getSessionKey(username, password) {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ 
        username: username, 
        password: password, 
        output_mode: 'json' 
      })
    };

    const res = await fetch('https://splunk-apps-api.example.net/services/auth/login', options);
    const resJson = await res.json();
    const sessionKey = resJson?.sessionKey;
    
    console.log("getting session......");
    
    if (!sessionKey) {
      return { status: false };
      // throw new Error('Session key not found')
    }

    return { status: true, sessionKey: sessionKey };
  }

  async createSearch(searchQuery, session_key) {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${session_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        output_mode: 'json',
        search: searchQuery
      })
    };

    const res = await fetch('https://splunk-apps-api.example.net/services/search/jobs', options);
    const data = await res.json();
    return data?.sid;
  }

  async waitForSearchToFinish(sid, session_key) {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${session_key}`
      },
      body: new URLSearchParams({ output_mode: 'json' })
    };

    while (true) {
      console.log("try....");
      
      if (this.cancelLoad) return { status: false };
      
      const res = await fetch(`https://splunk-apps-api.example.net/services/search/jobs/${sid}`, options);
      const data = await res.json();
      
      if (data?.entry?.[0]?.content?.isDone) {
        return { status: true };
      }
      
      await new Promise(resolve => { setTimeout(resolve, 2000); });
    }
  }

  async getSearchResult(sid, session_key) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Splunk ${session_key}`
      }
    };

    const res = await fetch(`https://splunk-apps-api.example.net/services/search/jobs/${sid}/results?output_mode=json&count=1000`, options);
    const result = await res.json();
    return result;
  }
}

// Export the classes
export { SplunkClient, StorageAPI, MessageAPI };import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Chrome Storage API replacement
class StorageAPI {
  constructor(storagePath = './storage.json') {
    this.storagePath = storagePath;
    this.cache = {};
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      this.cache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, create empty storage
      this.cache = {};
      await this.save();
    }
    this.initialized = true;
    return true;
  }

  async save() {
    await fs.writeFile(this.storagePath, JSON.stringify(this.cache, null, 2));
  }

  // Chrome compatible storage.local.get API
  get(keys, callback = null) {
    const getAsync = async () => {
      if (!this.initialized) await this.initPromise;
      
      let result = {};
      
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = this.cache[key] || null;
        });
      } else if (typeof keys === 'string') {
        result[keys] = this.cache[keys] || null;
      } else if (keys === null || keys === undefined) {
        result = { ...this.cache };
      } else if (typeof keys === 'object') {
        // Handle chrome.storage.local.get({key: defaultValue})
        Object.keys(keys).forEach(key => {
          result[key] = this.cache[key] !== undefined ? this.cache[key] : keys[key];
        });
      }
      
      return result;
    };

    if (callback) {
      getAsync().then(callback);
      return;
    }
    
    return getAsync();
  }

  // Chrome compatible storage.local.set API
  set(items, callback = null) {
    const setAsync = async () => {
      if (!this.initialized) await this.initPromise;
      
      Object.assign(this.cache, items);
      await this.save();
      return true;
    };

    if (callback) {
      setAsync().then(callback);
      return;
    }
    
    return setAsync();
  }
}

// Chrome Message API replacement
class MessageAPI extends EventEmitter {
  constructor() {
    super();
    this.listeners = [];
  }

  // Chrome compatible runtime.onMessage.addListener
  addListener(callback) {
    this.listeners.push(callback);
    return callback;
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Chrome compatible runtime.sendMessage
  sendMessage(message, responseCallback = null) {
    const sendMessageAsync = async () => {
      let responseReceived = false;
      let finalResponse;
      
      const sendResponse = (response) => {
        if (!responseReceived) {
          responseReceived = true;
          finalResponse = response;
          return true;
        }
      };
      
      // Process through all listeners
      for (const listener of this.listeners) {
        // Check if listener wants to keep channel open for async response
        const keepChannelOpen = listener(message, {}, sendResponse);
        
        // If listener doesn't keep channel open and no response yet, continue to next listener
        if (!keepChannelOpen && !responseReceived) {
          continue;
        }
        
        // If keeping channel open, wait a bit for potential async response
        if (keepChannelOpen) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (responseReceived) break;
        }
      }
      
      return finalResponse;
    };

    if (responseCallback) {
      sendMessageAsync().then(responseCallback);
      return;
    }
    
    return sendMessageAsync();
  }
}

// SplunkClient class (modified from your code)
class SplunkClient {
  constructor() {
    this.cancelLoad = false;
    this.searchQueryPaceEventData = 'search index=wpc sourcetype=paceEvent_data_common_prod earliest=-5h | table EVENT SOURCE FEED';
  }

  // starting point
  async getData(searchQuery = this.searchQueryPaceEventData, session_key) {
    try {
      if (!session_key) return { status: false, msg: `Issue in session key ${session_key}` };

      const validSession = await this.ensureSessionKey(session_key);
      if (!validSession.status) return { status: false, msg: `Session key is expired ${validSession.status}` };

      const sid = await this.createSearch(searchQuery, session_key);
      if (!sid) return { status: false, msg: `Issue to get sid ${sid}` };

      const gonext = await this.waitForSearchToFinish(sid, session_key);
      if (!gonext.status) return { status: false, msg: `Issue with query finish status ${gonext.status}` };

      const result = await this.getSearchResult(sid, session_key);
      return { status: true, result: result };
    } catch (error) {
      return { status: false, msg: error };
    }
  }

  async ensureSessionKey(session_key) {
    if (session_key) {
      const isValid = await this.isSessionValid(session_key);
      // return if session key is valid
      if (isValid) return { status: true };
      console.warn('Session Key expired..');
    }
    return { status: false };
  }

  async isSessionValid(session_key) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Splunk ${session_key}`
      }
    };

    const res = await fetch('https://splunk-apps-api.example.net/services/authentication/users?output_mode=json', options);
    return res.ok;
  }

  async getSessionKey(username, password) {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ 
        username: username, 
        password: password, 
        output_mode: 'json' 
      })
    };

    const res = await fetch('https://splunk-apps-api.example.net/services/auth/login', options);
    const resJson = await res.json();
    const sessionKey = resJson?.sessionKey;
    
    console.log("getting session......");
    
    if (!sessionKey) {
      return { status: false };
      // throw new Error('Session key not found')
    }

    return { status: true, sessionKey: sessionKey };
  }

  async createSearch(searchQuery, session_key) {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${session_key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        output_mode: 'json',
        search: searchQuery
      })
    };

    const res = await fetch('https://splunk-apps-api.example.net/services/search/jobs', options);
    const data = await res.json();
    return data?.sid;
  }

  async waitForSearchToFinish(sid, session_key) {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${session_key}`
      },
      body: new URLSearchParams({ output_mode: 'json' })
    };

    while (true) {
      console.log("try....");
      
      if (this.cancelLoad) return { status: false };
      
      const res = await fetch(`https://splunk-apps-api.example.net/services/search/jobs/${sid}`, options);
      const data = await res.json();
      
      if (data?.entry?.[0]?.content?.isDone) {
        return { status: true };
      }
      
      await new Promise(resolve => { setTimeout(resolve, 2000); });
    }
  }

  async getSearchResult(sid, session_key) {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Splunk ${session_key}`
      }
    };

    const res = await fetch(`https://splunk-apps-api.example.net/services/search/jobs/${sid}/results?output_mode=json&count=1000`, options);
    const result = await res.json();
    return result;
  }
}

// Export the classes
export { SplunkClient, StorageAPI, MessageAPI };