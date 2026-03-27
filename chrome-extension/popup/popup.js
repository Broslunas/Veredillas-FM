document.addEventListener("DOMContentLoaded", async () => {
    const listMain = document.getElementById("episode-list");
    const playerBar = document.getElementById("player-bar");
    const pbTitle = document.getElementById("pb-title");
    const pbImg = document.getElementById("pb-img");
    const pbPlay = document.getElementById("pb-play");
    const pbTime = document.getElementById("pb-time");
    const pbFill = document.getElementById("pb-progress-fill");
    
    const spotifyModal = document.getElementById("spotify-modal");
    const openSpotifyBtn = document.getElementById("open-spotify-btn");
    const closeModalBtn = document.getElementById("close-modal-btn");

    const detailView = document.getElementById("detail-view");
    const detailContentArea = document.getElementById("detail-content-area");
    const detailTitle = document.getElementById("detail-title");
    const backBtn = document.getElementById("back-btn");

    backBtn.addEventListener("click", () => {
        detailView.classList.add("hidden");
        detailContentArea.innerHTML = ""; // Stop playback cleanly
    });

    // Open Options Page
    document.getElementById("settings-btn").addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });

    let liveEpisodes = [];
    let isPlayingStatus = false;
    let currentEpisodeUrl = null;

    // Fetch episodes logic
    try {
        const data = await chrome.storage.sync.get(["useLocalhost"]);
        const baseUrl = data.useLocalhost ? "http://localhost:4321" : "https://veredillasfm.es";
        
        let fetchUrl = `${baseUrl}/rss.xml`;
        let usingApi = false;
        
        try { // Try the new API first
            const apiRes = await fetch(`${baseUrl}/api/episodes.json`);
            if (apiRes.ok) {
                liveEpisodes = await apiRes.json();
                usingApi = true;
            }
        } catch(e) {}

        if (!usingApi) {
            // Fallback to RSS parsing if API doesn't exist
            const rssRes = await fetch(fetchUrl);
            const text = await rssRes.text();
            
            // very simple XML parsing
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const items = xmlDoc.querySelectorAll("item");
            
            items.forEach(item => {
                const title = item.querySelector("title")?.textContent || 'Episodio';
                const description = item.querySelector("description")?.textContent || '';
                const link = item.querySelector("link")?.textContent || '';
                const pubDate = item.querySelector("pubDate")?.textContent || '';
                let image = 'icons/logo.png';
                
                // Usually <image> is a standalone tag or returned in customData
                const imgNode = item.getElementsByTagName("image")[0];
                if (imgNode) image = imgNode.textContent;
                else {
                    const match = item.innerHTML?.match(/<image>(.*?)<\/image>/);
                    if (match) image = match[1];
                }

                liveEpisodes.push({
                    title: title.replace('<![CDATA[', '').replace(']]>', ''),
                    description: description.replace('<![CDATA[', '').replace(']]>', ''),
                    image: image,
                    link: link,
                    pubDate: pubDate,
                    slug: link ? link.split('/').filter(Boolean).pop() : '',
                    spotifyUrl: null,
                    audioUrl: null
                });
            });
        }
        
        renderEpisodes(liveEpisodes, baseUrl);
    } catch (e) {
        listMain.innerHTML = `<div class="loader-state"><p style="color: #ef4444">Error al conectar con Veredillas FM</p></div>`;
    }

    // Ping background to see if something is already playing!
    chrome.runtime.sendMessage({ action: "STATUS" }, (res) => {
        if(res && res.episode) {
            updatePlayerState(res);
        }
    });

    // Listen for progress updates
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "TIME_UPDATE") {
            updatePlayerState(msg);
        } else if (msg.type === "ENDED") {
            pbPlay.textContent = "▶";
            isPlayingStatus = false;
        }
    });

    function updatePlayerState(res) {
        if (res.duration) {
            const perc = (res.currentTime / res.duration) * 100;
            pbFill.style.width = `${perc}%`;
            
            const m = Math.floor(res.currentTime / 60);
            const s = Math.floor(res.currentTime % 60);
            pbTime.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }
        if (res.episode) {
            playerBar.classList.remove("hidden");
            pbTitle.textContent = res.episode.title;
            pbImg.src = res.episode.image || "icons/logo.png";
            currentEpisodeUrl = res.episode.audioUrl || res.episode.spotifyUrl;
        }
        if (res.isPlaying !== undefined) {
            isPlayingStatus = res.isPlaying;
            pbPlay.textContent = isPlayingStatus ? "⏸️" : "▶";
        }
    }


    function renderEpisodes(eps, baseUrl) {
        listMain.innerHTML = "";
        if(eps.length === 0){
             listMain.innerHTML = `<div class="loader-state"><p>No se encontraron episodios.</p></div>`;
             return;
        }

        eps.forEach(ep => {
            // Determine nice date string format
            const d = new Date(ep.pubDate);
            const dateStr = d.toLocaleDateString("es-ES", { month: "short", day: "numeric", year: "numeric" });
            
            const card = document.createElement("div");
            card.className = "ep-card";
            card.innerHTML = `
                <img src="${ep.image?.startsWith('http') ? ep.image : baseUrl + ep.image}" class="ep-img" />
                <div class="ep-info">
                    <p class="ep-title" title="${ep.title}">${ep.title}</p>
                    <p class="ep-desc">${ep.description}</p>
                    <span class="ep-meta">${dateStr}</span>
                </div>
            `;
            
            card.addEventListener("click", () => {
                const imgParsed = ep.image?.startsWith('http') ? ep.image : baseUrl + ep.image;
                const episodeData = {
                    title: ep.title,
                    image: imgParsed,
                    audioUrl: ep.audioUrl,
                    spotifyUrl: ep.spotifyUrl,
                    link: ep.link // website url
                };

                if (ep.audioUrl) {
                    // YAY native background playback!
                    chrome.runtime.sendMessage({ action: "PLAY", url: ep.audioUrl, episode: episodeData }, (res) => {
                        updatePlayerState({ ...res, episode: episodeData, isPlaying: true, currentTime: 0, duration: 100 });
                    });
                } else if (ep.spotifyUrl) {
                    // Spotify embed inside the extension popup
                    let embedUrl = ep.spotifyUrl.replace("spotify.com/episode/", "spotify.com/embed/episode/");
                    embedUrl = embedUrl.replace("spotify.com/show/", "spotify.com/embed/show/");
                    
                    // Stop our native player if it's playing
                    if(isPlayingStatus) {
                         chrome.runtime.sendMessage({ action: "PAUSE" });
                    }
                    
                    detailTitle.textContent = ep.title;
                    detailContentArea.innerHTML = `<iframe src="${embedUrl}?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
                    detailView.classList.remove("hidden");
                } else {
                    // Usually this means it's coming from RSS with no MP3 or Spotify known,
                    // we incrust the website episode page directly in the extension!
                    // Stop our native player if it's playing
                    if(isPlayingStatus) {
                         chrome.runtime.sendMessage({ action: "PAUSE" });
                    }
                    
                    detailTitle.textContent = ep.title;
                    const pageUrl = ep.link || `${baseUrl}/ep/${ep.slug || ep.id}`;
                    detailContentArea.innerHTML = `<iframe src="${pageUrl}" width="100%" height="100%" style="min-height: 400px;" frameBorder="0"></iframe>`;
                    detailView.classList.remove("hidden");
                }
            });
            listMain.appendChild(card);
        });
    }

    pbPlay.addEventListener("click", () => {
        if (!currentEpisodeUrl) return;
        if (isPlayingStatus) {
            chrome.runtime.sendMessage({ action: "PAUSE" }, () => {
                isPlayingStatus = false;
                pbPlay.textContent = "▶";
            });
        } else {
            // Resume play
            chrome.runtime.sendMessage({ action: "PLAY", url: currentEpisodeUrl }, () => {
                isPlayingStatus = true;
                pbPlay.textContent = "⏸️";
            });
        }
    });

    closeModalBtn.addEventListener('click', () => spotifyModal.classList.add('hidden'));

});
