// ─── Google Maps Loader & Routing Engine ─────────────────────────────────────
// This file:
//   1. Fetches the API key from the backend
//   2. Dynamically injects the Google Maps SDK <script>
//   3. Defines the global initMap callback Google calls when loaded
//   4. Provides the MapLogic class for routing / shelter / fallback

/**
 * Global callback invoked by the Google Maps SDK once it finishes loading.
 * Hides the fallback overlay and creates the real map.
 */
window.initMap = function () {
    var defaultLocation = { lat: 18.4523, lng: 73.8497 };

    var fallback = document.getElementById('map-fallback');
    if (fallback) fallback.style.display = 'none';

    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: defaultLocation,
        styles: [
            { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
            { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f3461' }] },
            { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
            { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
            { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
            { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#384e7a' }] },
            { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
            { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
            { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
            { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
            { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a3a2a' }] },
            { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] }
        ],
        disableDefaultUI: false,
        zoomControl: true,
        gestureHandling: 'greedy'
    });

    new google.maps.Marker({
        position: defaultLocation,
        map: map,
        title: 'You are here',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#00f3ff',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
        }
    });

    if (window.MapApp) {
        window.MapApp._attachMap(map, defaultLocation);
    }

    if (window.sysLog) window.sysLog('Google Maps rendered successfully.', 'info');
};


/**
 * MapLogic — manages map state, routing, shelter detection, and fallback UI.
 */
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

        // Kick off the key fetch → script injection pipeline
        this._loadGoogleMaps();
    }

    /**
     * Fetches the Maps API key from the backend and injects the SDK script.
     * Falls back gracefully if the key is missing or the fetch fails.
     */
    _loadGoogleMaps() {
        fetch('/api/config')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.MAPS_KEY) {
                    var script = document.createElement('script');
                    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + data.MAPS_KEY + '&callback=initMap&v=weekly';
                    script.async = true;
                    script.defer = true;
                    script.onerror = function () {
                        if (window.sysLog) window.sysLog('Google Maps script failed to load.', 'warn');
                    };
                    document.head.appendChild(script);
                    if (window.sysLog) window.sysLog('Google Maps SDK injection initiated.', 'info');
                } else {
                    if (window.sysLog) window.sysLog('No Maps API key — running in simulation mode.', 'warn');
                }
            })
            .catch(function () {
                if (window.sysLog) window.sysLog('Could not reach /api/config — simulation mode active.', 'warn');
            });
    }

    /**
     * Called by window.initMap once the real Google Map object is created.
     * @param {google.maps.Map} map
     * @param {{ lat: number, lng: number }} defaultLocation
     */
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

        this._acquireGeolocation();
    }

    /**
     * Generates three pseudo-shelters near a given origin point.
     * @param {{ lat: number, lng: number }} origin
     * @returns {Array<{ lat: number, lng: number, name: string }>}
     */
    _generateShelters(origin) {
        return [
            { lat: origin.lat + 0.015, lng: origin.lng + 0.012, name: 'City West Emergency Relief' },
            { lat: origin.lat - 0.020, lng: origin.lng + 0.030, name: 'Central High School Gym' },
            { lat: origin.lat + 0.025, lng: origin.lng - 0.022, name: 'North Sector Arena' }
        ];
    }

    /**
     * Attempts to get real GPS coordinates and re-centers the map.
     */
    _acquireGeolocation() {
        if (!navigator.geolocation) return;
        var self = this;
        navigator.geolocation.getCurrentPosition(
            function (pos) {
                self.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                self.shelters = self._generateShelters(self.userLocation);
                if (self.map) {
                    self.map.panTo(self.userLocation);
                    if (self.userMarker) self.userMarker.setMap(null);
                    self.userMarker = new google.maps.Marker({
                        position: self.userLocation, map: self.map, title: 'Your Live Location',
                        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#00f3ff', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff' }
                    });
                }
                if (window.sysLog) window.sysLog('Live GPS coordinates acquired.', 'info');
            },
            function () { if (window.sysLog) window.sysLog('Geolocation denied. Using default anchor.', 'warn'); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    /** @returns {{ lat: number, lng: number }} */
    getUserLocation() { return this.userLocation; }

    /** @param {string} text */
    updateFallbackText(text) {
        if (this.fallbackText) this.fallbackText.innerText = text;
    }

    /**
     * Finds the nearest shelter to the current user location.
     * @returns {{ lat: number, lng: number, name: string }}
     */
    findNearestShelter() {
        if (!this.shelters || !this.shelters.length) {
            return { lat: this.userLocation.lat + 0.05, lng: this.userLocation.lng + 0.05, name: 'Global Relief Point' };
        }
        var ul = this.userLocation;
        return this.shelters.reduce(function (best, s) {
            var d = Math.pow(s.lat - ul.lat, 2) + Math.pow(s.lng - ul.lng, 2);
            var bd = Math.pow(best.lat - ul.lat, 2) + Math.pow(best.lng - ul.lng, 2);
            return d < bd ? s : best;
        });
    }

    /** Renders a safe evacuation route to a generic point NE of the user. */
    renderSafeRoute() {
        var target = { lat: this.userLocation.lat + 0.03, lng: this.userLocation.lng + 0.03 };
        this._executeRouting(target, 'Emergency Extraction Point');
    }

    /** Renders a route to the nearest shelter and marks it on the map. */
    renderNearestShelter() {
        var nearest = this.findNearestShelter();
        this._executeRouting(nearest, nearest.name);
    }

    /**
     * Requests a driving route from the user to the destination and draws it.
     * @param {{ lat: number, lng: number }} dest
     * @param {string} name
     */
    _executeRouting(dest, name) {
        if (!this.map || !this.directionsService) {
            if (window.sysLog) window.sysLog('Map not ready for routing.', 'warn');
            return;
        }
        var self = this;
        this.directionsService.route({
            origin: this.userLocation,
            destination: dest,
            travelMode: google.maps.TravelMode.DRIVING
        }, function (response, status) {
            if (status !== 'OK') {
                if (window.sysLog) window.sysLog('Routing failed: ' + status, 'warn');
                return;
            }
            self.directionsRenderer.setDirections(response);
            if (self.targetMarker) self.targetMarker.setMap(null);
            self.targetMarker = new google.maps.Marker({
                position: dest, map: self.map, title: name,
                icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6, fillColor: '#00ff66', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff' }
            });
            var leg = response.routes[0].legs[0];
            var severity = (window.DashboardApp && window.DashboardApp.getCurrentState) ? window.DashboardApp.getCurrentState().severity : 0;
            var safety = Math.max(20, 95 - (severity * 15) - Math.floor(Math.random() * 5));
            if (window.DashboardApp) window.DashboardApp.displayRouteIntel(leg.distance.text, leg.duration.text, safety);
        });
    }
}
