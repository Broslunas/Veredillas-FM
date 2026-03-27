document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("env-toggle");
    const saveBtn = document.getElementById("save-btn");
    
    // Load current setting
    chrome.storage.sync.get(["useLocalhost"], (data) => {
        toggle.checked = data.useLocalhost || false;
    });

    // Save changes
    saveBtn.addEventListener("click", () => {
        chrome.storage.sync.set({ useLocalhost: toggle.checked }, () => {
            const originalText = saveBtn.textContent;
            const originalBg = saveBtn.style.background;
            
            saveBtn.textContent = "¡Guardado con éxito!";
            saveBtn.style.background = "#10b981"; // Success Green
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = "";
            }, 2000);
        });
    });
});
