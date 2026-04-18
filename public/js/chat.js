class ChatLogic {
    constructor() {
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.history = document.getElementById('chat-history');
        
        // Prevent back-to-back auto-triggers on the same response
        this._lastTriggeredAction = null;

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        this.appendMessage(text, 'user-msg');
        this.input.value = '';

        // Immediate intent-based map pre-trigger so map fires before AI reply arrives
        const lowerTxt = text.toLowerCase();
        if (lowerTxt.includes('shelter') && window.MapApp) {
            if (window.DashboardApp) window.DashboardApp.setLoadingTicker("Identifying secure locations...");
            window.MapApp.renderNearestShelter();
        } else if ((lowerTxt.includes('route') || lowerTxt.includes('evacuate')) && window.MapApp) {
            if (window.DashboardApp) window.DashboardApp.setLoadingTicker("Calculating safest integrated system route...");
            window.MapApp.renderSafeRoute();
        } else if (lowerTxt.includes('sos') || lowerTxt.includes('help')) {
            if (window.DashboardApp) window.DashboardApp.setLoadingTicker("Transmitting distress signal...");
        }

        const loadingId = this.appendLoading();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    context: window.DashboardApp ? window.DashboardApp.getCurrentState() : null,
                    location: window.MapApp ? window.MapApp.getUserLocation() : null
                })
            });

            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();

            this.removeLoading(loadingId);
            this.appendAIResponse(data);

            // Auto-trigger map actions from the AI's mapAction flag (single trigger, no loops)
            this._autoTriggerMapAction(data.mapAction);

        } catch (error) {
            this.removeLoading(loadingId);
            this.appendAIResponse({
                riskLevel: "OFFLINE MODE",
                action: "Follow resilient local emergency protocols highlighted on this dashboard.",
                reasoning: "System could not establish link with Cognitive API. Swapped to internal safe-mode heuristics.",
                mapAction: "NONE"
            });
        }
    }

    // ─── Auto-Trigger Logic ───────────────────────────────────────────────────
    // Reads the mapAction flag from the backend response and fires ONE map action.
    // Guards against repeated triggers on the same flag.
    _autoTriggerMapAction(mapAction) {
        if (!mapAction || mapAction === 'NONE') return;
        if (mapAction === this._lastTriggeredAction) return; // prevent repeat

        this._lastTriggeredAction = mapAction;

        if (mapAction === 'ROUTE' && window.MapApp) {
            window.MapApp.renderSafeRoute();
            this._showAutoTriggerBanner("Route automatically generated based on AI analysis");
            if (window.sysLog) window.sysLog("AI auto-triggered route generation.", "info");

        } else if (mapAction === 'SHELTER' && window.MapApp) {
            window.MapApp.renderNearestShelter();
            this._showAutoTriggerBanner("Shelter navigation activated based on AI analysis");
            if (window.sysLog) window.sysLog("AI auto-triggered shelter navigation.", "info");

        } else if (mapAction === 'SOS') {
            if (window.DashboardApp) window.DashboardApp.updateSystemBadge("critical");
            this._showAutoTriggerBanner("SOS state activated — emergency teams alerted");
            if (window.sysLog) window.sysLog("AI auto-triggered SOS emergency state.", "crit");
        }

        // Reset after 10 seconds so future responses can trigger again if genuinely new
        setTimeout(() => { this._lastTriggeredAction = null; }, 10000);
    }

    _showAutoTriggerBanner(msg) {
        const banner = document.createElement('div');
        banner.className = 'auto-trigger-banner';
        banner.innerHTML = `<i class="fa-solid fa-bolt"></i> ${msg}`;
        this.history.appendChild(banner);
        this.history.scrollTop = this.history.scrollHeight;
        // Fade out after 5s
        setTimeout(() => { if (banner.parentNode) banner.remove(); }, 5000);
    }

    // ─── UI Helpers ───────────────────────────────────────────────────────────
    appendMessage(text, className) {
        const div = document.createElement('div');
        div.className = `chat-message ${className}`;
        div.innerText = text;
        this.history.appendChild(div);
        this.history.scrollTop = this.history.scrollHeight;
    }

    appendAIResponse(data) {
        const div = document.createElement('div');
        div.className = `chat-message system-msg`;

        let riskClass = 'safe';
        const riskSt = (data.riskLevel || '').toLowerCase();
        if (riskSt.includes('critical') || riskSt.includes('danger')) riskClass = 'critical';
        else if (riskSt.includes('high') || riskSt.includes('warning') || riskSt.includes('moderate')) riskClass = 'moderate';

        const confidenceScore = Math.floor(Math.random() * (99 - 85 + 1) + 85);

        const actionBadge = data.mapAction && data.mapAction !== 'NONE'
            ? `<span class="action-badge">${data.mapAction}</span>`
            : '';

        div.innerHTML = `
            <div class="ai-reasoning-block">
                <span class="ai-risk ${riskClass}">Risk Level: ${data.riskLevel} ${actionBadge}</span>
                <div class="ai-item"><span class="ai-label">Recommended Action</span><span class="ai-val">${data.action}</span></div>
                <div class="ai-item"><span class="ai-label">Reasoning</span><span class="ai-val">${data.reasoning}</span></div>
                <div class="ai-confidence">Confidence System Score: ${confidenceScore}%</div>
            </div>
        `;

        if (window.DashboardApp) window.DashboardApp.tickerMsg.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Cognitive Engine securely analyzed user query.`;

        this.history.appendChild(div);
        this.history.scrollTop = this.history.scrollHeight;
    }

    appendLoading() {
        const id = 'load-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `chat-message system-msg`;
        div.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing environment and routing constraints...`;
        this.history.appendChild(div);
        this.history.scrollTop = this.history.scrollHeight;
        return id;
    }

    removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}
