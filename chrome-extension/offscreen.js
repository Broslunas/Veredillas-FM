// offscreen.js: plays the audio silently in the background
let audio = new Audio();
let currentEpisode = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PLAY") {
    if (audio.src !== request.url) {
      audio.src = request.url;
      currentEpisode = request.episode;
    }
    audio.play().catch(console.error);
    sendResponse({ status: "playing" });
  } 
  else if (request.type === "PAUSE") {
    audio.pause();
    sendResponse({ status: "paused" });
  } 
  else if (request.type === "STATUS") {
    sendResponse({
      isPlaying: !audio.paused && audio.duration > 0,
      currentTime: audio.currentTime,
      duration: audio.duration,
      episode: currentEpisode
    });
  }
  else if (request.type === "SEEK") {
    audio.currentTime = request.time;
    sendResponse({ status: "seeked" });
  }
});

audio.addEventListener('timeupdate', () => {
    // We can broadcast the timeupdate just in case a popup is open
    chrome.runtime.sendMessage({
       type: "TIME_UPDATE",
       currentTime: audio.currentTime,
       duration: audio.duration,
       episode: currentEpisode
    });
});

audio.addEventListener('ended', () => {
    chrome.runtime.sendMessage({
       type: "ENDED",
       episode: currentEpisode
    });
});
