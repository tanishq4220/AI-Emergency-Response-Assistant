// Main Application Orchestrator
document.addEventListener('DOMContentLoaded', () => {
    console.log("A.E.R.A. System Component Initialized.");
    
    // Check network status to ensure robust experience as per requirements
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    function updateNetworkStatus() {
        const ind = document.querySelector('.status-indicator');
        const text = document.getElementById('status-text');
        if (navigator.onLine) {
            ind.className = "status-indicator online";
            text.innerText = "SYSTEM ONLINE & PREDICTING";
        } else {
            ind.className = "status-indicator offline";
            text.innerText = "OFFLINE FALLBACK ACTIVE";
        }
    }

    // Initialize global modules
    window.DashboardApp = new Dashboard();
    window.MapApp = new MapLogic();
    window.ChatApp = new ChatLogic();
});

// Polyfill/Utility for simple logging
window.sysLog = function(msg, type = 'info') {
    const logBox = document.getElementById('sim-log');
    if (!logBox) return;
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    div.innerText = `[${time}] ${msg}`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}
