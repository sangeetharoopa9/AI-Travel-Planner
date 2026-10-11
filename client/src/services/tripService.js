import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export async function getTrips() {
    const res = await api.get("/trips");
    return res.data.data.trips; 
}

export async function deleteTrip(id) {
    const res = await api.delete(`/trips/${id}`);
    return res.data;
}