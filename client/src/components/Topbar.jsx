
import { Bell, ChevronDown, MapPin, Menu, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import "./Topbar.css";

function Topbar() {
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const location = useLocation();

    const pageName =
        location.pathname === "/"
            ? "Explore"
            : location.pathname.split("/")[1]
                .replace(/-/g, " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="breadcrumb">
                    <span>Workspace</span>
                    <span className="breadcrumb-separator">/</span>
                    <strong>{pageName}</strong>
                </div>
                <div className="topbar-location">
                    <MapPin size={13} />
                    <span>Discover anywhere</span>
                </div>
            </div>

            <div className="topbar-actions">
                <div className="topbar-popover-wrap">
                    {showNotifications && (
                        <div className="topbar-popover notification-popover">
                            <strong>You're all caught up!</strong>
                            <p>Travel inspiration and trip updates will appear here.</p>
                        </div>
                    )}
                </div>

                <div className="topbar-popover-wrap">
                    {showProfile && (
                        <div className="topbar-popover profile-popover">
                            <strong>Roamwise Explorer</strong>
                            <span>Free account</span>
                            <button
                                onClick={() => setShowProfile(false)}
                                className="popover-action"
                            >
                                Close menu
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <button className="mobile-menu-button" aria-label="Open menu">
                <Menu size={21} />
            </button>
        </header>
    );
}

export default Topbar;
