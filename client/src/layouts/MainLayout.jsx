import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./MainLayout.css";

function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        if (window.matchMedia("(max-width: 760px)").matches) {
            setMobileSidebarOpen((open) => !open);
        } else {
            setSidebarCollapsed((collapsed) => !collapsed);
        }
    };

    const closeMobileSidebar = () => setMobileSidebarOpen(false);

    return (
        <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileSidebarOpen ? "mobile-sidebar-open" : ""}`}>
            {mobileSidebarOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    aria-label="Close navigation menu"
                    onClick={closeMobileSidebar}
                />
            )}
            <Sidebar
                collapsed={sidebarCollapsed}
                mobileOpen={mobileSidebarOpen}
                onNavigate={closeMobileSidebar}
            />
            <div className="app-main">
                <Topbar onMenuClick={toggleSidebar} sidebarCollapsed={sidebarCollapsed} mobileSidebarOpen={mobileSidebarOpen} />
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default MainLayout;
