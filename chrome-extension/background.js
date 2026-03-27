// Initialize alarms for background checking
chrome.runtime.onInstalled.addListener(() => {
  console.log("Veredillas FM - Extensión instalada con Audio en Segundo Plano");
  chrome.alarms.create("checkRSS", { periodInMinutes: 60 });
  chrome.storage.local.set({ lastKnownEpisode: null });
});

// Listener for Alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkRSS") {
    checkForNewEpisodes();
  }
});

// Function to fetch and check RSS Feed
async function checkForNewEpisodes() {
  try {
    const data = await chrome.storage.sync.get(["useLocalhost"]);
    const baseUrl = data.useLocalhost ? "http://localhost:4321" : "https://veredillasfm.es";
    
    const response = await fetch(`${baseUrl}/rss.xml`);
    if (!response.ok) return;
    
    const text = await response.text();
    
    // Fast Regex to parse first title
    const itemMatch = text.match(/<item>([\s\S]*?)<\/item>/);
    if (!itemMatch) return;
    
    const titleMatch = itemMatch[1].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemMatch[1].match(/<title>(.*?)<\/title>/);
    
    if (titleMatch && titleMatch[1]) {
      const latestTitle = titleMatch[1].trim();
      
      const localData = await chrome.storage.local.get(["lastKnownEpisode"]);
      
      if (localData.lastKnownEpisode && localData.lastKnownEpisode !== latestTitle) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/logo.png",
          title: "Veredillas FM",
          message: `¡Nuevo contenido diponible!\n${latestTitle}`,
          priority: 2
        });
      }
      
      chrome.storage.local.set({ lastKnownEpisode: latestTitle });
    }
  } catch (error) {
    console.error("Veredillas FM - Error revisando contenido:", error);
  }
}

chrome.runtime.onStartup.addListener(checkForNewEpisodes);

// ------------- OFFSCREEN DOCUMENT AUDIO PLAYER -------------
let creatingDocument; // Track connection

async function setupOffscreenDocument(path) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) return; // Already exists

  if (creatingDocument) {
    await creatingDocument;
  } else {
    creatingDocument = chrome.offscreen.createDocument({
      url: path,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Veredillas FM Audio Playback en Segundo Plano'
    });
    await creatingDocument;
    creatingDocument = null;
  }
}

// Proxy messages to offscreen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If the message is a playback command, ensure audio document is active and let it answer
  if (["PLAY", "PAUSE", "STATUS", "SEEK"].includes(message.action)) {
    // Note: offscreen.js listens for object.type, let's normalize to action
    setupOffscreenDocument('offscreen.html').then(() => {
      // Send the request directly to offscreen context
      chrome.runtime.sendMessage({ ...message, type: message.action }, (response) => {
         sendResponse(response);
      });
    });
    return true; // Keep channel open for async
  }
});
