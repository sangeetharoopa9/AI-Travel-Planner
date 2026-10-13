import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("roamwise_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export async function checkApiHealth() {
    const response = await api.get("/health");
    return response.data;
}

export default api;