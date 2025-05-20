import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { SplunkClient } from './SplunkClient.js';
import { storage } from './chrome.js';

// Setup express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create a single instance of SplunkClient
const splunkObj = new SplunkClient();

// Handle JSON body parsing
app.use(express.json());

// Convert __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints
app.post('/api/getData', async (req, res) => {
  try {
    const { query } = req.body;
    splunkObj.cancelLoad = false;

    const cData = await storage.get("cookieData");
    let sessionKey = cData?.cookieData?.sessionKey;
    let valid = sessionKey?.length > 10;

    if (!valid) {
      return res.json({ status: false, msg: "No sessionKey stored" });
    }

    const result = await splunkObj.getData(query, sessionKey);
    
    if (result?.result?.results) {
      await storage.set({ splunkData: { splunkData: result?.result?.results } });
      console.log("Updated splunk data.....");
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
});

app.post('/api/getDataByLogin', async (req, res) => {
  try {
    const { cred, query } = req.body;
    splunkObj.cancelLoad = false;

    const sessionResult = await splunkObj.getSessionKey(cred.username, cred.password);
    
    if (!sessionResult.status) {
      return res.json({ status: false, msg: "Issue while getDataByLogin" });
    }
    
    await storage.set({ cookieData: { sessionKey: sessionResult.sessionKey } });
    console.log("Updated session.....");
    
    const result = await splunkObj.getData(query, sessionResult.sessionKey);
    
    if (result?.result?.results) {
      await storage.set({ splunkData: { splunkData: result?.result?.results } });
      console.log("Updated splunk data.....");
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
});

app.post('/api/cancelLoad', (req, res) => {
  splunkObj.cancelLoad = true;
  res.json({ status: true, msg: "" });
});

// Default route serves the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} in your browser`);
});
