// ─── STEP 1: Global initMap callback (defined first, before everything else) ─
// Google Maps JS SDK calls window.initMap once it has fully loaded.
// This must be on window — not inside a class or DOMContentLoaded.
window.initMap = function () {
    const defaultLocation = { lat: 18.4523, lng: 73.8497 };

    // Hide the simulation overlay
    const fallback = document.getElementById('map-fallback');
    if (fallback) fallback.style.display = 'none';

    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: defaultLocation,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ],
        disableDefaultUI: false,
        zoomControl: true,
        gestureHandling: "greedy"
    });

    new google.maps.Marker({
        position: defaultLocation,
        map: map,
        title: "You are here",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#00f3ff",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff"
        }
    });

    // Pass the initialized map into the MapLogic instance for routing features
    if (window.MapApp) {
        window.MapApp._attachMap(map, defaultLocation);
    }

    if (window.sysLog) window.sysLog("Google Maps rendered successfully.", "info");
};


// ─── MapLogic Class ──────────────────────────────────────────────────────────
// Manages routing, shelter detection, and fallback UI state.

class MapLogic {
    constructor() {
        this.fallbackText = document.getElementById('map-sim-text');

        this.map = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.userMarker = null;
        this.targetMarker = null;

        this.userLocation = { lat: 18.4523, lng: 73.8497 };
        this.shelters = this._generateShelters(this.userLocation);
    }

    // Called by window.initMap after the Google Map object is created
    _attachMap(map, defaultLocation) {
        this.map = map;
        this.userLocation = defaultLocation;
        this.shelters = this._generateShelters(defaultLocation);

        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#00ff66', strokeOpacity: 0.8, strokeWeight: 5 }
        });

        // Refine location with real GPS after map is ready
        this._acquireGeolocation();
    }

    _generateShelters(origin) {
        return [
            { lat: origin.lat + 0.015, lng: origin.lng + 0.012, name: "City West Emergency Relief" },
            { lat: origin.lat - 0.020, lng: origin.lng + 0.030, name: "Central High School Gym" },
            { lat: origin.lat + 0.025, lng: origin.lng - 0.022, name: "North Sector Arena" }
        ];
    }

    _acquireGeolocation() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                this.shelters = this._generateShelters(this.userLocation);
                if (this.map) {
                    this.map.panTo(this.userLocation);
                    if (this.userMarker) this.userMarker.setMap(null);
                    this.userMarker = new google.maps.Marker({
                        position: this.userLocation, map: this.map, title: "Your Live Location",
                        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#00f3ff", fillOpacity: 1, strokeWeight: 2, strokeColor: "#ffffff" }
                    });
                }
                if (window.sysLog) window.sysLog("Live GPS coordinates acquired.", "info");
            },
            () => { if (window.sysLog) window.sysLog("Geolocation denied. Using default anchor.", "warn"); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    getUserLocation() { return this.userLocation; }

    updateFallbackText(text) {
        if (this.fallbackText) this.fallbackText.innerText = text;
    }

    findNearestShelter() {
        if (!this.shelters?.length) return { lat: this.userLocation.lat + 0.05, lng: this.userLocation.lng + 0.05, name: "Global Relief Point" };
        return this.shelters.reduce((best, s) => {
            const d = (s.lat - this.userLocation.lat) ** 2 + (s.lng - this.userLocation.lng) ** 2;
            const bd = (best.lat - this.userLocation.lat) ** 2 + (best.lng - this.userLocation.lng) ** 2;
            return d < bd ? s : best;
        });
    }

    renderSafeRoute() {
        const target = { lat: this.userLocation.lat + 0.03, lng: this.userLocation.lng + 0.03 };
        this._executeRouting(target, "Emergency Extraction Point");
    }

    renderNearestShelter() {
        this._executeRouting(this.findNearestShelter(), this.findNearestShelter().name);
    }

    _executeRouting(dest, name) {
        if (!this.map || !this.directionsService) {
            if (window.sysLog) window.sysLog("Map not ready for routing.", "warn");
            return;
        }
        this.directionsService.route({
            origin: this.userLocation, destination: dest, travelMode: google.maps.TravelMode.DRIVING
        }, (response, status) => {
            if (status !== 'OK') { if (window.sysLog) window.sysLog(`Routing failed: ${status}`, "warn"); return; }
            this.directionsRenderer.setDirections(response);
            if (this.targetMarker) this.targetMarker.setMap(null);
            this.targetMarker = new google.maps.Marker({
                position: dest, map: this.map, title: name,
                icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6, fillColor: "#00ff66", fillOpacity: 1, strokeWeight: 2, strokeColor: "#ffffff" }
            });
            const leg = response.routes[0].legs[0];
            const safety = Math.max(20, 95 - ((window.DashboardApp?.getCurrentState().severity || 0) * 15) - Math.floor(Math.random() * 5));
            if (window.DashboardApp) window.DashboardApp.displayRouteIntel(leg.distance.text, leg.duration.text, safety);
        });
    }
}
