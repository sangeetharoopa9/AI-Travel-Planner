
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Explore from "./pages/Explore";
import Planner from "./pages/Planner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyTrips from "./pages/MyTrips";
import TripDetails from "./pages/TripDetails";
import MapsWeather from "./pages/MapsWeather";
import Admin from "./pages/Admin";
import SavedPlaces from "./pages/SavedPlaces";
import Deals from "./pages/Deals";
import Settings from "./pages/Settings";
import DealManagement from "./pages/DealManagement";
import "./App.css";

function SessionControl() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="session-control">
      <span title={user?.name}>{user?.name || "Traveler"}</span>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <SessionControl />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<MainLayout />}>
          <Route index element={<Explore />} />
          <Route path="explore" element={<Explore />} />

          <Route
            path="planner"
            element={
              <ProtectedRoute>
                <Planner />
              </ProtectedRoute>
            }
          />

          <Route
            path="trips"
            element={
              <ProtectedRoute>
                <MyTrips />
              </ProtectedRoute>
            }
          />

          <Route
            path="trips/:id"
            element={
              <ProtectedRoute>
                <TripDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="maps-weather"
            element={
              <ProtectedRoute>
                <MapsWeather />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin/deals"
            element={
              <ProtectedRoute>
                <DealManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="saved"
            element={
              <ProtectedRoute>
                <SavedPlaces />
              </ProtectedRoute>
            }
          />

          <Route path="deals" element={<Deals />} />

          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/explore" replace />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
