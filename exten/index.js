// Import our Chrome API replacement
import './chrome.js';
import { SplunkClient } from './SplunkClient.js';

// Create a single instance of SplunkClient
const splunkObj = new SplunkClient();

// Setup message listeners similar to Chrome extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    splunkObj.cancelLoad = false;

    chrome.storage.local.get(["cookieData"], (cData) => {
      let sessionKey = cData?.cookieData?.sessionKey;
      let valid = sessionKey?.length > 10;

      if (!valid) {
        sendResponse({ status: false, msg: "No sessionKey stored" });
      } else {
        splunkObj.getData(message.query, sessionKey).then(res => {
          if (res?.result?.results) {
            chrome.storage.local.set({ splunkData: { splunkData: res?.result?.results } }, () => {
              console.log("Updated splunk data.....");
              sendResponse(res);
            });
          } else {
            sendResponse(res);
          }
        });
      }
    });

    return true; // Keep message channel open for async response
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getDataByLogin') {
    splunkObj.cancelLoad = false;

    splunkObj.getSessionKey(message.cred.username, message.cred.password).then(res => {
      if (res.status) {
        chrome.storage.local.set({ cookieData: { sessionKey: res.sessionKey } }, () => {
          console.log("Updated session.....");
          
          splunkObj.getData(message.query, res.sessionKey).then(res => {
            if (res?.result?.results) {
              chrome.storage.local.set({ splunkData: { splunkData: res?.result?.results } }, () => {
                console.log("Updated splunk data.....");
                sendResponse(res);
              });
            } else {
              sendResponse(res);
            }
          });
        });
      } else {
        sendResponse({ status: false, msg: "Issue while getDataByLogin" });
      }
    });

    return true; // Keep message channel open for async response
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'cancelLoad') {
    splunkObj.cancelLoad = true;
    sendResponse({ status: true, msg: "" });
  }
  return true;
});

// Example usage
async function runExample() {
  try {
    console.log("Storage initialized...");
    
    // Example 1: Get data with existing session key
    console.log("\nTrying to get data with stored session key...");
    chrome.runtime.sendMessage({
      action: 'getData',
      query: 'search index=wpc sourcetype=paceEvent_data_common_prod earliest=-1h | table EVENT SOURCE FEED'
    }, (response) => {
      console.log("Response:", response);
      
      // Example 2: Login and get data
      console.log("\nTrying to login and get data...");
      chrome.runtime.sendMessage({
        action: 'getDataByLogin',
        cred: {
          username: 'your_username',
          password: 'your_password'
        },
        query: 'search index=wpc sourcetype=paceEvent_data_common_prod earliest=-1h | table EVENT SOURCE FEED'
      }, (response) => {
        console.log("Response:", response);
        
        // Example 3: Cancel a load
        console.log("\nSending cancel load command...");
        chrome.runtime.sendMessage({
          action: 'cancelLoad'
        }, (response) => {
          console.log("Response:", response);
        });
      });
    });
    
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Run the example
runExample();