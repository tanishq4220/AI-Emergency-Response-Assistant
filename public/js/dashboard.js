class Dashboard {
    constructor() {
        this.riskIndexEl = document.getElementById('risk-index');
        this.riskProgEl = document.getElementById('risk-progress');
        this.hazardLevelEl = document.getElementById('hazard-level');
        this.tickerMsg = document.querySelector('.ticker-text');
        this.lastUpdatedEl = document.getElementById('last-updated');
        this.statusBadgeEl = document.getElementById('system-badge');
        this.simLogEl = document.getElementById('sim-log');
        
        this.currentState = { disasterType: 'none', severity: 0 };

        this.setupControls();
        this.startLiveClock();
        this.startLiveLogs();
    }

    startLiveClock() {
        setInterval(() => {
            const now = new Date();
            if(this.lastUpdatedEl) this.lastUpdatedEl.innerText = `| Last Updated: ${now.toLocaleTimeString()}`;
        }, 1000);
    }

    startLiveLogs() {
        const dummyLogs = [
            "Telemetry sync verified.",
            "Analyzing surrounding geofences...",
            "Route vectors stable.",
            "Polling disaster APIs...",
            "Checking local shelter availability...",
            "No seismic aberrations detected."
        ];
        
        setInterval(() => {
            if (this.currentState.severity === 0) {
                const randomLog = dummyLogs[Math.floor(Math.random() * dummyLogs.length)];
                this.addSimLog(randomLog, "info");
            }
        }, 6000);
    }

    addSimLog(msg, type = "info") {
        if (!this.simLogEl) return;
        const now = new Date();
        const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.innerText = `${time} ${msg}`;
        this.simLogEl.appendChild(div);
        this.simLogEl.scrollTop = this.simLogEl.scrollHeight;
    }

    setLoadingTicker(msg) {
        this.tickerMsg.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${msg}`;
    }

    displayRouteIntel(dist, time, safety) {
        this.addSimLog(`Route calculated. Dest: ${dist}, Est: ${time}, Safety Index: ${safety}%`, "info");
        
        // Show route intel safely in the ticker temporarily
        this.tickerMsg.innerHTML = `<i class="fa-solid fa-route"></i> Route Active - Distance: ${dist} | ETA: ${time} | Safety: ${safety}%`;
    }

    setupControls() {
        const buttons = document.querySelectorAll('.sim-trigger');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.closest('button').dataset.type;
                this.triggerDisaster(type);
            });
        });

        document.getElementById('btn-route').addEventListener('click', () => {
            this.setLoadingTicker("Calculating safest integrated system route...");
            this.addSimLog("Route recalculation requested.", "warn");
            if (window.MapApp) window.MapApp.renderSafeRoute();
            
            setTimeout(() => {
                window.ChatApp.input.value = "Find safest evacuation route";
                window.ChatApp.sendMessage();
            }, 600);
        });
        
        document.getElementById('btn-shelter').addEventListener('click', () => {
            this.setLoadingTicker("Identifying secure locations on internal dashboard...");
            this.addSimLog("Shelter identification initialized.", "warn");
            if (window.MapApp) window.MapApp.renderNearestShelter();

            setTimeout(() => {
                window.ChatApp.input.value = "Where is the nearest shelter?";
                window.ChatApp.sendMessage();
            }, 600);
        });
        
        document.getElementById('btn-sos').addEventListener('click', () => {
             this.setLoadingTicker("Transmitting distress signal...");
             this.addSimLog("SOS Signal Broadcasted.", "crit");
             setTimeout(() => {
                window.ChatApp.input.value = "SOS! Danger is immediate!";
                window.ChatApp.sendMessage();
             }, 400);
        });
    }

    getCurrentState() { return this.currentState; }

    triggerDisaster(type) {
        this.currentState.disasterType = type;
        
        if (type === 'reset') {
            this.currentState.severity = 0;
            this.updateMetrics(12, "Stable Threshold", "safe", `<i class="fa-solid fa-satellite-dish"></i> SYNC ESTABLISHED. Monitoring local telemetry...`);
            window.MapApp.updateFallbackText("Awaiting Hazard Injection");
            this.updateSystemBadge("online");
            this.addSimLog("Environment stabilized system-wide.", "info");
            return;
        }

        this.currentState.severity += 1;
        
        if (type === 'flood') {
            const risk = 40 + (this.currentState.severity * 15);
            this.updateMetrics(Math.min(risk, 100), `Water Lvl +${this.currentState.severity * 1.5}m`, "warning", `<i class="fa-solid fa-water"></i> ⚠ Flood boundary expanding. Proceed to high visibility zones.`);
            window.MapApp.updateFallbackText("Rendering Flood Polygon Models...");
            this.updateSystemBadge(this.currentState.severity > 2 ? "critical" : "degraded");
            this.addSimLog(`Flood levels dynamically increased to severity ${this.currentState.severity}`, "warn");
        } else if (type === 'fire') {
            const risk = 60 + (this.currentState.severity * 20);
            this.updateMetrics(Math.min(risk, 100), `Thermal Expansion`, "danger", `<i class="fa-solid fa-fire"></i> ⚠ CRITICAL: Wildfire boundary moving rapidly.`);
            window.MapApp.updateFallbackText("Rendering Fire Thermal Maps...");
            this.updateSystemBadge("critical");
            this.addSimLog(`Wildfire thermal radius accelerated to severity ${this.currentState.severity}`, "crit");
        } else if (type === 'earthquake') {
            const risk = 50 + (this.currentState.severity * 10);
            this.updateMetrics(Math.min(risk, 100), `${(5.0 + this.currentState.severity * 0.4).toFixed(1)} Magnitude`, "danger", `<i class="fa-solid fa-house-crack"></i> ⚠ SEISMIC ALERT: Earthquake tremor detected locally.`);
            window.MapApp.updateFallbackText("Plotting Seismic Epicenters...");
            this.updateSystemBadge("critical");
            this.addSimLog(`Seismic event registered. Magnitude modeled at ${(5.0 + this.currentState.severity * 0.4).toFixed(1)}`, "crit");
        }
    }

    updateSystemBadge(state) {
        if (!this.statusBadgeEl) return;
        this.statusBadgeEl.className = `badge-status ${state}`;
        if (state === 'online') this.statusBadgeEl.innerHTML = `<i class="fa-solid fa-circle"></i> Systems Online`;
        else if (state === 'degraded') this.statusBadgeEl.innerHTML = `<i class="fa-solid fa-circle"></i> Degraded Mode`;
        else if (state === 'critical') this.statusBadgeEl.innerHTML = `<i class="fa-solid fa-circle"></i> Critical Condition`;
    }

    updateMetrics(risk, hazardObj, colorClass, tickerText) {
        this.riskIndexEl.innerText = risk;
        this.riskProgEl.style.width = `${risk}%`;
        this.riskProgEl.className = `progress ${colorClass}`;
        this.hazardLevelEl.innerText = hazardObj;
        
        if (colorClass === 'danger') this.hazardLevelEl.style.color = 'var(--neon-red)';
        else if (colorClass === 'warning') this.hazardLevelEl.style.color = 'var(--neon-yellow)';
        else this.hazardLevelEl.style.color = '#fff';

        this.tickerMsg.innerHTML = tickerText;
    }
}
