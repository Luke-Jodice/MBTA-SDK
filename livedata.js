import 'dotenv/config'
const API_KEY = process.env.MBTA_API_KEY;
//const STOP_ID = "place-sstat"; // Example: South Station
const BASE_URL = "https://api-v3.mbta.com/predictions";

async function getNextThree(stopId, directionId, nextnum) {
  if (!API_KEY) {
    throw new Error('MBTA API key is not configured');
  }
  
  if (!stopId) {
    throw new Error('Stop ID is required');
  }
  
  if (nextnum >= 5 || nextnum <= 0) {
    nextnum = 3; // Default to 3 if invalid
  }
  
  const url = new URL(BASE_URL);
  url.searchParams.set("filter[stop]", stopId);
  url.searchParams.set("filter[direction_id]", directionId); // 0 = inbound, 1 = outbound
  url.searchParams.set("sort", "arrival_time");
  url.searchParams.set("include", "trip,stop,schedule,route");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  let resp;
  try {
    resp = await fetch(url, { headers: { "x-api-key": API_KEY }, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    throw new Error(`MBTA API error: ${resp.status} ${resp.statusText}`);
  }
  
  const data = await resp.json();
  // console.log(data);

  const now = new Date();
  
  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }
  
  const upcoming = data.data
    .map(p => {
      try {
        const arrival = p.attributes?.arrival_time || p.attributes?.departure_time;
        const arrivalTime = arrival ? new Date(arrival) : null;
        
        // Get trip information to find the end stop
        const trip = data.included?.find(inc => inc.type === 'trip' && inc.id === p.relationships?.trip?.data?.id);
        const route = data.included?.find(inc => inc.type === 'route' && inc.id === trip?.relationships?.route?.data?.id);
        
        // Try to get end stop name from trip attributes or route information
        let endStopName = null;
        if (trip?.attributes?.headsign) {
          endStopName = trip.attributes.headsign;
        } else if (route?.attributes?.long_name) {
          // Fallback to route name if headsign is not available
          endStopName = route.attributes.long_name;
        }


        return {
          time: arrivalTime ? arrivalTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
          endStop: endStopName,
          arrivalTime: arrivalTime
        };
      } catch (error) {
        console.error('Error processing prediction:', error);
        return null;
      }
    })
    .filter(item => item && item.arrivalTime && item.arrivalTime > now)
    .slice(0, nextnum);

  return upcoming;
}

export {getNextThree};


//usage example
    // (async () => {
    //   const inbound = await getNextThree(STOP_ID, 0);
    //   const outbound = await getNextThree(STOP_ID, 1);

    //   console.log("Inbound:", inbound);
    //   console.log("Outbound:", outbound);

    //   // Example of how to access end stop names
    //   console.log("\nInbound end stops:");
    //   inbound.forEach(item => {
    //     console.log(`${item.time} → ${item.endStop}`);
    //   });

    //   console.log("\nOutbound end stops:");
    //   outbound.forEach(item => {
    //     console.log(`${item.time} → ${item.endStop}`);
    //   });
    // })();