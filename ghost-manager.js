class GhostManager {
    constructor() {
        this.ghosts = this.loadGhosts();
    }

    loadGhosts() {
        const stored = localStorage.getItem('ghostVision_ghosts');
        return stored ? JSON.parse(stored) : [];
    }

    saveGhosts() {
        localStorage.setItem('ghostVision_ghosts', JSON.stringify(this.ghosts));
    }

    async addGhost(ghostData) {
        this.ghosts.push({
            ...ghostData,
            hasAppeared: false,
            createdAt: Date.now()
        });
        this.saveGhosts();
        console.log('Ghost added:', ghostData.description);
    }

    findNearbyGhosts(currentLocation, currentOrientation, radiusMeters = 5) {
        return this.ghosts.filter(ghost => {
            const distance = this.calculateDistance(
                currentLocation.lat, currentLocation.lng,
                ghost.location.lat, ghost.location.lng
            );
            
            const orientationDiff = this.calculateOrientationDifference(
                currentOrientation, ghost.orientation
            );
            
            // Ghost appears if within radius and similar orientation (±30 degrees)
            return distance <= radiusMeters && orientationDiff <= 30;
        });
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLng = this.degreesToRadians(lng2 - lng1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateOrientationDifference(current, stored) {
        const yDiff = Math.abs(current.y - stored.y);
        return Math.min(yDiff, 360 - yDiff); // Handle wrap-around
    }

    degreesToRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    markGhostAsAppeared(ghostId) {
        const ghost = this.ghosts.find(g => g.id === ghostId);
        if (ghost) {
            ghost.hasAppeared = true;
            ghost.lastAppeared = Date.now();
            this.saveGhosts();
        }
    }

    getTotalGhostCount() {
        return this.ghosts.length;
    }

    getAppearedGhostCount() {
        return this.ghosts.filter(g => g.hasAppeared).length;
    }

    // Clean up old ghosts (older than 24 hours)
    cleanupOldGhosts() {
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.ghosts = this.ghosts.filter(ghost => ghost.createdAt > dayAgo);
        this.saveGhosts();
    }
}

