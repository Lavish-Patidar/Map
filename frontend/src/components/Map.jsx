import React, { useState, useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    LayersControl,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const defaultIcon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconSize: [30, 45],
    iconAnchor: [15, 45],
});

const desIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [30, 45],
    iconAnchor: [15, 45],
});

// Component to Center Map on Route
const ChangeView = ({ initialCoords, destinationCoords }) => {
    const map = useMap();
    useEffect(() => {
        if (initialCoords && destinationCoords) {
            const bounds = L.latLngBounds([initialCoords, destinationCoords]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [initialCoords, destinationCoords, map]);
    return null;
};

const Map = () => {
    const [initialLocation, setInitialLocation] = useState(""); // Set to user's current location
    const [destinationLocation, setDestinationLocation] = useState(null); // Set to null
    const [initialCoords, setInitialCoords] = useState([0, 0]); // Default to [0, 0] initially
    const [destinationCoords, setDestinationCoords] = useState(null); // Set to null initially

    const [route, setRoute] = useState([]);
    const [distance, setDistance] = useState(null);
    const [duration, setDuration] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch coordinates from API
    const getCoordinates = async (location) => {
        try {
            setLoading(true);
            const response = await fetch(
                `https://map-api-beta.vercel.app/api/geocode?location=${location}`
            );
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            if (data.length > 0)
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            else return null;
        } catch (error) {
            console.error("Error:", error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Fetch shortest route using OSRM API
    const getShortestRoute = async (startCoords, endCoords) => {
        if (!startCoords || !endCoords) {
            alert("Please enter valid source and destination.");
            return;
        }
        setLoading(true);
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes.length > 0) {
                setRoute(
                    data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon])
                );
                setDistance((data.routes[0].distance / 1000).toFixed(2)); // km
                setDuration((data.routes[0].duration / 60).toFixed(2)); // minutes
            }
        } catch (error) {
            console.error("Error fetching route:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        let startCoords;
        if (initialLocation.trim() === "") {
            startCoords = initialCoords; // Use current location if initialLocation is empty
        } else {
            startCoords = await getCoordinates(initialLocation);
        }
        const endCoords = await getCoordinates(destinationLocation);

        if (startCoords && endCoords) {
            setInitialCoords(startCoords);
            setDestinationCoords(endCoords);
            getShortestRoute(startCoords, endCoords);
        } else {
            alert("Please enter valid source and destination.");
        }
    };

    const switchLocations = () => {
        setInitialLocation(destinationLocation);
        setDestinationLocation(initialLocation);
        setInitialCoords(destinationCoords);
        setDestinationCoords(initialCoords);
    };

    useEffect(() => {
        const fetchLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setInitialLocation(""); // Set to empty string to avoid showing coordinates
                        setInitialCoords([latitude, longitude]);
                    },
                    (error) => {
                        console.error("Error fetching location:", error);
                    }
                );
            }
        };
        fetchLocation();
    }, []);

    useEffect(() => {
        if (initialCoords && destinationCoords) {
            getShortestRoute(initialCoords, destinationCoords);
        }
    }, [initialCoords, destinationCoords]);

    return (
        <div className="p-4 w-full max-w-6xl mx-auto">
            {/* Search Box */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input
                    type="text"
                    value={initialLocation}
                    onChange={(e) => setInitialLocation(e.target.value)}
                    className="border p-2 w-full md:w-1/2 rounded-md shadow-sm"
                    placeholder="Enter Source Location"
                />
                <button
                    onClick={switchLocations}
                    className="bg-emerald-300 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-md"
                >
                    Swap
                </button>
                <input
                    type="text"
                    value={destinationLocation}
                    onChange={(e) => setDestinationLocation(e.target.value)}
                    className="border p-2 w-full md:w-1/2 rounded-md shadow-sm"
                    placeholder="Enter Destination Location"
                />
                <button
                    onClick={handleSearch}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md"
                >
                    Search
                </button>
            </div>

            {/* Route Info */}
            {distance && duration && (
                <div className="bg-white p-3 rounded-lg shadow-md text-center mb-3">
                    <h3 className="text-lg font-bold">Route Information</h3>
                    <div className=" flex flex-row gap-10 justify-center">
                        <p>
                            Distance: <span className="font-semibold">{distance} km</span>
                        </p>
                        <p>
                            Estimated Time:{" "}
                            <span className="font-semibold">{duration} minutes</span>
                        </p>
                    </div>

                </div>
            )
            }

            {/* Map */}
            <div className="w-full h-[500px] md:h-[600px]">
                <MapContainer
                    center={initialCoords}
                    zoom={5}
                    className="h-full w-full rounded-lg shadow-lg"
                >
                    <LayersControl position="topright" >
                        {/* Default Map */}
                        <LayersControl.BaseLayer checked name="Default">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        </LayersControl.BaseLayer>

                        {/* Satellite Map */}
                        <LayersControl.BaseLayer name="Satellite">
                            <TileLayer
                                url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                subdomains={["mt0", "mt1", "mt2", "mt3"]}
                            />
                        </LayersControl.BaseLayer>

                    </LayersControl>

                    <ChangeView
                        initialCoords={initialCoords}
                        destinationCoords={destinationCoords}
                    />
                    <Marker position={initialCoords} icon={defaultIcon}>
                        <Popup>📍 {initialLocation}</Popup>
                    </Marker>
                    {destinationCoords && (
                        <Marker position={destinationCoords} icon={desIcon}>
                            <Popup>📍 {destinationLocation}</Popup>
                        </Marker>
                    )}
                    {route.length > 0 && (
                        <Polyline
                            positions={route}
                            color="blue"
                            weight={6}
                            dashArray="10, 10"
                            opacity={0.8}
                        />
                    )}
                </MapContainer>
            </div>
        </div >
    );
};

export default Map;
