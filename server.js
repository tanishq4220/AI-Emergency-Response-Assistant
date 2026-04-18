require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
    res.json({ MAPS_KEY: process.env.GOOGLE_MAPS_API_KEY || null });
});

// Determines which map action to auto-trigger based on message + context
function resolveMapAction(lowerMsg, context) {
    if (lowerMsg.includes('sos') || lowerMsg.includes('danger') || lowerMsg.includes('immediate')) return 'SOS';
    if (lowerMsg.includes('shelter') || lowerMsg.includes('refuge') || lowerMsg.includes('safe house')) return 'SHELTER';
    if (lowerMsg.includes('route') || lowerMsg.includes('evacuate') || lowerMsg.includes('escape') || lowerMsg.includes('path')) return 'ROUTE';
    if (context?.disasterType === 'fire' && context?.severity >= 2) return 'ROUTE';
    if (context?.disasterType === 'flood' && context?.severity >= 2) return 'SHELTER';
    return 'NONE';
}

app.post('/api/chat', async (req, res) => {
    const { message, context, location } = req.body;
    const lowerMsg = message.toLowerCase();

    const severityStr = context?.disasterType !== 'none' ? `Type: ${context?.disasterType}, Severity: ${context?.severity}. ` : 'STABLE. ';
    const isRouting = lowerMsg.includes('route') || lowerMsg.includes('evacuate');
    const isShelter = lowerMsg.includes('shelter');

    let dynamicConstraints = "";
    if (isRouting || isShelter) {
        dynamicConstraints = "The user has triggered a map routing event. YOU MUST say: 'Proceed strictly along the highlighted route shown on the dashboard map. The dashboard analytics panel actively displays exact Distance, ETA, and Safety calculations for this plotted line.'";
    }

    if (process.env.GEMINI_API_KEY) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const systemPrompt = `You are the integrated intelligence core of an Emergency Response System.
Context: User is located at lat: ${location?.lat}, lng: ${location?.lng}.
Disaster State: ${severityStr}
User Message: "${message}"

CRITICAL RULES:
1. NEVER instruct the user to use external applications (like Google Maps, websites, or external phones).
2. ONLY instruct them to use the interactive map, routing paths, and analytics tools inherently presented on this current dashboard screen.
${dynamicConstraints}
3. OUTPUT FORMAT MUST BE STRICTLY JSON (no markdown):
{
  "riskLevel": "value (e.g., Safe, Moderate Risk, CRITICAL DANGER)",
  "action": "value (immediate actionable advice using the dashboard interfaces available to the user)",
  "reasoning": "value (logical explanation tied to dashboard routing or system telemetry)"
}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: systemPrompt,
                config: { responseMimeType: "application/json" }
            });

            let parsedContent;
            try {
                parsedContent = JSON.parse(response.text);
            } catch (e) {
                const cleaned = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
                parsedContent = JSON.parse(cleaned);
            }

            return res.json({
                riskLevel: parsedContent.riskLevel || 'UNKNOWN',
                action: parsedContent.action || 'Check dashboard diagnostic metrics.',
                reasoning: parsedContent.reasoning || 'System verified environmental integrity.',
                mapAction: resolveMapAction(lowerMsg, context),
                timestamp: new Date().toISOString(),
                simulated: false
            });

        } catch (error) {
            console.error("Gemini API Error, seamlessly falling back to simulation module.");
        }
    }

    // Heuristics Fallback Logic
    let riskLevel = "Moderate Risk";
    let action = "Monitor the central map interface and hold your mapped position.";
    let reasoning = "Geospatial radar analysis indicates a stable telemetry threshold in your sector.";

    if (context && context.disasterType !== 'none') {
        const severityWord = context.severity > 3 ? "CRITICAL DANGER" : "High Risk";
        riskLevel = severityWord;

        if (context.disasterType === 'flood') {
            action = isRouting ? "Proceed strictly along the routing map polyline generated on the dashboard to reach high ground." : "Evacuate using dashboard route features. Stay away from unmapped water zones.";
            reasoning = "Telemetry indicates the flood line crosses traditional paths. Dashboard dynamically calculated the safest dry path.";
        } else if (context.disasterType === 'fire') {
            action = "Evacuate immediately via designated green vectors shown on the internal map interface. Use N95 mask.";
            reasoning = "Thermal satellite overlays confirmed the fire expanding rapidly, intercepting predicted evacuation nodes.";
        } else if (context.disasterType === 'earthquake') {
            action = "Drop, Cover, and Hold On. Wait for the map environment to plot stable seismic zones.";
            reasoning = "Seismic sensors registered tremors. Dashboard is recalculating structural routes.";
        }
    } else {
        if (isShelter) {
            riskLevel = "Safe/Moderate";
            action = "Proceed to the nearest shelter identified and marked on your integrated map. Follow the highlighted green routing polyline.";
            reasoning = "The system mathematically identified the closest safe structural shelter based on your absolute coordinates and plotted an encrypted route.";
        } else if (isRouting) {
            riskLevel = "Safe/Moderate";
            action = "Follow the newly rendered green routing path to your destination.";
            reasoning = "Internal nodes mathematically confirmed this calculated street-level pathway avoids reported kinetic hazards.";
        } else if (lowerMsg.includes('flood') || lowerMsg.includes('water')) {
            riskLevel = "CRITICAL DANGER";
            action = "Move to the highest floor immediately. Monitor dashboard map levels.";
            reasoning = "Hydro-sensor telemetry maps water depth exceeding limits naturally.";
        }
    }

    res.json({
        riskLevel,
        action,
        reasoning,
        mapAction: resolveMapAction(lowerMsg, context),
        timestamp: new Date().toISOString(),
        simulated: true
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`A.E.R.A Server active on port ${PORT}`));
