// Utility functions to easily reference stops
class StopManager {
    constructor(stopsData) {
        this.stops = stopsData;
        this.stopsByName = new Map();
        this.stopsByLine = new Map();
        this.stopsById = new Map();

        this.buildIndexes();
    }

    buildIndexes() {
        this.stops.forEach(stop => {

            // Index by name (can have multiple stops with same name on different lines)
            if (!this.stopsByName.has(stop.name)) {
                this.stopsByName.set(stop.name, []);
            }
            this.stopsByName.get(stop.name).push(stop);

            // Index by train line
            if (!this.stopsByLine.has(stop.train_line)) {
                this.stopsByLine.set(stop.train_line, []);
            }
            this.stopsByLine.get(stop.train_line).push(stop);

            // Index by id
            if (stop.id) this.stopsById.set(stop.id, stop);
        });
    }
    
    getById(id) {
        return this.stopsById.get(id) || null;
    }

    // Get all stops with a specific name
    getByName(name) {
        return this.stopsByName.get(name);
    }
    
    // Get all stops on a specific line
    getByLine(lineName) {
        return this.stopsByLine.get(lineName) || [];
    }
    
    // Get a specific stop by name and line
    getByNameAndLine(name, lineName) {
        const stopsWithName = this.getByName(name);
        return stopsWithName.find(stop => stop.train_line === lineName);
    }
    
    // Get all stops
    getAllStops() {
        return this.stops;
    }
    
    // Search stops by partial name
    searchByName(partialName) {
        const results = [];
        const searchTerm = partialName.toLowerCase();
        
        this.stops.forEach(stop => {
            if (stop.name.toLowerCase().includes(searchTerm)) {
                results.push(stop);
            }
        });
        
        return results;
    }
    
    // // Get transfer stations (stops that connect to other lines)
    // getTransferStations() {
    //     return this.stops.filter(stop => stop.is_transfer_station);
    // }
    
    // // Get stops with wheelchair access
    // getWheelchairAccessible() {
    //     return this.stops.filter(stop => stop.wheelchair_boarding === 1);
    // }

    //returns true if has multiple stops before and after
    getTrainHubs()
    {
        return this.stops.filter(stop => stop.isHub);
    }

}
export { StopManager };