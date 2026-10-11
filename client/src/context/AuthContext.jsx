
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "roamwise_token";
const USER_KEY = "roamwise_user";

function readStoredUser() {
    try {
        const savedUser = localStorage.getItem(USER_KEY);
        return savedUser ? JSON.parse(savedUser) : null;
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readStoredUser);
    const [loading, setLoading] = useState(
        () => Boolean(localStorage.getItem(TOKEN_KEY))
    );

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setLoading(false);
    }, []);

    const saveSession = useCallback((data) => {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
    }, []);

    const updateUser = useCallback((updatedUser) => {
        setUser((current) => {
            const mergedUser = {
                ...(current || {}),
                ...updatedUser,
            };

            localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
            return mergedUser;
        });
    }, []);

    useEffect(() => {
        let active = true;

        async function restoreSession() {
            const token = localStorage.getItem(TOKEN_KEY);

            if (!token) {
                if (active) setLoading(false);
                return;
            }

            try {
                const response = await api.get("/auth/me");

                if (active) {
                    const currentUser = response.data.data.user;
                    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
                    setUser(currentUser);
                }
            } catch {
                if (active) {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    setUser(null);
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        restoreSession();

        return () => {
            active = false;
        };
    }, []);

    const register = useCallback(
        async (formData) => {
            const response = await api.post("/auth/register", formData);
            saveSession(response.data.data);
            return response.data;
        },
        [saveSession]
    );

    const login = useCallback(
        async (formData) => {
            const response = await api.post("/auth/login", formData);
            saveSession(response.data.data);
            return response.data;
        },
        [saveSession]
    );

    const value = {
        user,
        loading,
        isAuthenticated: Boolean(
            user && localStorage.getItem(TOKEN_KEY)
        ),
        register,
        login,
        logout,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider.");
    }

    return context;
}
