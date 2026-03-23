import fs from 'fs';

const mainData = JSON.parse(fs.readFileSync('obj/maindata.json', 'utf8'));
const orgStopsData = JSON.parse(fs.readFileSync('obj/orgstops-e.json', 'utf8'));
const orgStops = orgStopsData.stops;

const stationsMap = new Map();

mainData.forEach(item => {
    if (!item.line_short) return;
    
    if (!stationsMap.has(item.line_short)) {
        stationsMap.set(item.line_short, {
            name: item.name,
            line_short: item.line_short,
            train_line: item.train_line,
            municipality: item.municipality
        });
    }
});

const result = Array.from(stationsMap.values()).map(station => {
    // Try to find a match in orgStops
    // Matching by name and potentially train_line
    // Some train_line values in maindata.json have extra info like "Green Line - Park Street & North"
    // So let's try a partial match or a flexible name match.
    
    let match = orgStops.find(s => s.name === station.name && station.train_line.includes(s.train_line));
    
    if (!match) {
        match = orgStops.find(s => s.name === station.name);
    }
    
    if (match) {
        station.id = match.id;
    } else {
        station.id = null;
    }
    
    return station;
});

fs.writeFileSync('public/stations.json', JSON.stringify(result, null, 2));
console.log(`Successfully created public/stations.json with ${result.length} stations.`);
