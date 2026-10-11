
import { NavLink } from "react-router-dom";
import {
  Bus,
  CloudSun,
  Compass,
  Globe2,
  Heart,
  Map,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const navigation = [
  { label: "Explore", path: "/explore", icon: Compass },
  { label: "AI Trip Planner", path: "/planner", icon: Sparkles },
  { label: "My Trips", path: "/trips", icon: Map },
  { label: "Saved Places", path: "/saved", icon: Heart },
  { label: "Maps & Weather", path: "/maps-weather", icon: CloudSun },
];

function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand">
        <span className="brand-mark">
          <Globe2 size={23} strokeWidth={2.2} />
        </span>

        <span className="brand-name">
          Roam<span>wise</span>
        </span>
      </NavLink>

      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={label}
              to={path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>

              {label === "AI Trip Planner" && (
                <span className="new-tag">AI</span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <ShieldCheck size={19} strokeWidth={1.8} />
                <span>Admin Panel</span>
              </NavLink>

              <NavLink
                to="/admin/deals"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <Ticket size={19} strokeWidth={1.8} />
                <span>Deal Management</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      <div className="sidebar-promo">
        <div className="promo-icon">
          <Sparkles size={20} />
        </div>

        <h3>Your next adventure starts here.</h3>

        <p>
          Let AI turn your travel dreams into a thoughtful itinerary.
        </p>

        <NavLink to="/planner" className="promo-link">
          Plan a trip <span>↗</span>
        </NavLink>
      </div>

      <div className="sidebar-bottom">
        <NavLink
          to="/deals"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <Ticket size={19} strokeWidth={1.8} />
          <span>Travel Deals</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <Settings2 size={19} strokeWidth={1.8} />
          <span>Settings</span>
        </NavLink>

        <div className="sidebar-footer">
          <div className="footer-avatar">
            {(user?.name || "R").slice(0, 1).toUpperCase()}
          </div>

          <div className="footer-user">
            <strong>{user?.name || "Roamwise Explorer"}</strong>
            <span>
              {isAdmin ? "Administrator" : "Traveler account"}
            </span>
          </div>

          <span className="footer-dots">•••</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
