// We can let the parent document know it's being displayed in the extension
if (window.top !== window.self) {
    document.documentElement.classList.add("is-chrome-extension");
}

console.log("📻 Veredillas FM Extension Activada en esta página.");
