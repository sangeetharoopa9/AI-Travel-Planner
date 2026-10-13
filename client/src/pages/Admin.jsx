import { useCallback, useEffect, useState } from "react";
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    ChevronDown,
    CircleUserRound,
    Compass,
    Edit3,
    Hotel,
    LoaderCircle,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Users,
    Bus,
    X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Admin.css";

const CATALOG_TYPES = [
    { value: "destination", label: "Destinations", icon: MapPin },
    { value: "hotel", label: "Hotels", icon: Hotel },
    { value: "attraction", label: "Attractions", icon: Compass },
    { value: "transportation", label: "Transportation", icon: Bus },
];

const EMPTY_FORM = {
    type: "destination",
    name: "",
    country: "",
    city: "",
    category: "",
    image: "",
    rating: "0",
    price: "0",
    duration: "",
    description: "",
    tag: "",
    address: "",
    contact: "",
    website: "",
    amenities: "",
    transportType: "",
    isActive: true,
};

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again."
    );
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function StatCard({ icon: Icon, label, value, description }) {
    return (
        <article className="admin-stat-card">
            <div className="admin-stat-top">
                <span className="admin-stat-icon">
                    <Icon size={20} />
                </span>
                <ArrowUpRight size={17} className="admin-stat-arrow" />
            </div>

            <p>{label}</p>
            <strong>{value ?? "—"}</strong>
            <span className="admin-stat-description">{description}</span>
        </article>
    );
}

function Admin() {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState("overview");
    const [summary, setSummary] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [users, setUsers] = useState([]);

    const [catalogType, setCatalogType] = useState("destination");
    const [catalogSearch, setCatalogSearch] = useState("");
    const [userSearch, setUserSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const isAdmin = user?.role === "admin";

    const loadSummary = useCallback(async () => {
        setLoading(true);

        try {
            const response = await api.get("/admin/summary");
            setSummary(response.data.data);
            setError("");
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCatalog = useCallback(async () => {
        setCatalogLoading(true);

        try {
            const response = await api.get("/admin/catalog", {
                params: { type: catalogType },
            });

            setCatalog(response.data.data.items || []);
            setError("");
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setCatalogLoading(false);
        }
    }, [catalogType]);

    const loadUsers = useCallback(async () => {
        setUsersLoading(true);

        try {
            const response = await api.get("/admin/users");
            setUsers(response.data.data.users || []);
            setError("");
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setUsersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }

        loadSummary();
    }, [isAdmin, loadSummary]);

    useEffect(() => {
        if (!isAdmin) return;

        if (activeTab === "catalog") {
            loadCatalog();
        }

        if (activeTab === "users") {
            loadUsers();
        }
    }, [activeTab, catalogType, isAdmin, loadCatalog, loadUsers]);

    function openCreateEditor() {
        setEditingItem(null);
        setForm({ ...EMPTY_FORM, type: catalogType });
        setError("");
        setNotice("");
        setEditorOpen(true);
    }

    function openEditEditor(item) {
        setEditingItem(item);

        setForm({
            ...EMPTY_FORM,
            ...item,
            rating: String(item.rating ?? 0),
            price: String(item.price ?? 0),
            amenities: Array.isArray(item.amenities)
                ? item.amenities.join(", ")
                : "",
            isActive: item.isActive !== false,
        });

        setError("");
        setNotice("");
        setEditorOpen(true);
    }

    function closeEditor() {
        if (saving) return;

        setEditorOpen(false);
        setEditingItem(null);
        setForm(EMPTY_FORM);
    }

    function updateForm(event) {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    async function saveCatalogItem(event) {
        event.preventDefault();

        if (saving) return;

        setSaving(true);
        setError("");

        const payload = {
            ...form,
            type: editingItem ? editingItem.type : catalogType,
            name: form.name.trim(),
            rating: Number(form.rating || 0),
            price: Number(form.price || 0),
            amenities: form.amenities
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
        };

        try {
            if (editingItem) {
                await api.put(`/admin/catalog/${editingItem._id}`, payload);
                setNotice("Catalog item updated successfully.");
            } else {
                await api.post("/admin/catalog", payload);
                setNotice("Catalog item created successfully.");
            }

            setEditorOpen(false);
            setEditingItem(null);
            setForm(EMPTY_FORM);

            await Promise.all([loadCatalog(), loadSummary()]);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function deleteCatalogItem(item) {
        const confirmed = window.confirm(
            `Delete "${item.name}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        setError("");
        setNotice("");

        try {
            await api.delete(`/admin/catalog/${item._id}`);
            setNotice(`${item.name} was deleted.`);
            await Promise.all([loadCatalog(), loadSummary()]);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        }
    }

    async function updateUser(userId, changes) {
        setError("");
        setNotice("");

        try {
            const response = await api.patch(`/admin/users/${userId}`, changes);
            const updatedUser = response.data.data.user;

            setUsers((current) =>
                current.map((item) =>
                    item._id === updatedUser._id ? updatedUser : item
                )
            );

            setNotice("User account updated successfully.");
            await loadSummary();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
            await loadUsers();
        }
    }

    const filteredCatalog = catalog.filter((item) => {
        const query = catalogSearch.trim().toLowerCase();

        if (!query) return true;

        return [
            item.name,
            item.city,
            item.country,
            item.category,
            item.transportType,
        ].some((value) => String(value || "").toLowerCase().includes(query));
    });

    const filteredUsers = users.filter((item) => {
        const query = userSearch.trim().toLowerCase();

        if (!query) return true;

        return [item.name, item.email, item.role].some((value) =>
            String(value || "").toLowerCase().includes(query)
        );
    });

    if (!isAdmin) {
        return (
            <div className="admin-denied">
                <span className="admin-denied-icon">
                    <ShieldCheck size={28} />
                </span>
                <h1>Administrator access required</h1>
                <p>
                    Your account does not have permission to access the admin panel.
                </p>
                <Link to="/explore" className="admin-primary-button">
                    Return to Explore
                </Link>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-page-header">
                <div>
                    <p className="admin-eyebrow">ROAMWISE CONTROL CENTER</p>
                    <h1>Admin dashboard</h1>
                    <p className="admin-page-subtitle">
                        Manage travel content and keep your platform running smoothly.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-refresh-button"
                    onClick={() => {
                        setError("");
                        setNotice("");

                        if (activeTab === "catalog") loadCatalog();
                        else if (activeTab === "users") loadUsers();

                        loadSummary();
                    }}
                    disabled={loading || catalogLoading || usersLoading}
                >
                    <RefreshCw
                        size={16}
                        className={
                            loading || catalogLoading || usersLoading ? "admin-spin" : ""
                        }
                    />
                    Refresh
                </button>
            </header>

            <div className="admin-welcome">
                <div className="admin-welcome-mark">
                    <ShieldCheck size={23} />
                </div>

                <div>
                    <strong>Welcome back, {user?.name || "Administrator"}</strong>
                    <p>You're signed in with administrator permissions.</p>
                </div>

                <span className="admin-role-pill">Administrator</span>
            </div>

            {error && (
                <div className="admin-message admin-message-error" role="alert">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Dismiss error"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {notice && (
                <div className="admin-message admin-message-success" role="status">
                    <CheckCircle2 size={17} />
                    <span>{notice}</span>
                    <button
                        type="button"
                        onClick={() => setNotice("")}
                        aria-label="Dismiss notification"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <nav className="admin-tabs" aria-label="Admin sections">
                {[
                    { value: "overview", label: "Overview", icon: Activity },
                    { value: "catalog", label: "Travel catalog", icon: Compass },
                    { value: "users", label: "Users", icon: Users },
                ].map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        type="button"
                        className={`admin-tab ${activeTab === value ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab(value);
                            setError("");
                            setNotice("");
                        }}
                    >
                        <Icon size={17} />
                        {label}
                    </button>
                ))}
            </nav>

            {activeTab === "overview" && (
                <section className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Platform overview</h2>
                            <p>Current totals across your travel platform.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="admin-loading">
                            <LoaderCircle size={25} className="admin-spin" />
                            Loading dashboard statistics...
                        </div>
                    ) : (
                        <>
                            <div className="admin-stats-grid">
                                <StatCard
                                    icon={Users}
                                    label="Total users"
                                    value={summary?.users}
                                    description={`${summary?.activeUsers ?? 0} active accounts`}
                                />
                                <StatCard
                                    icon={ShieldCheck}
                                    label="Administrators"
                                    value={summary?.admins}
                                    description="Accounts with admin access"
                                />
                                <StatCard
                                    icon={MapPin}
                                    label="Destinations"
                                    value={summary?.destinations}
                                    description="Travel destinations"
                                />
                                <StatCard
                                    icon={Hotel}
                                    label="Hotels"
                                    value={summary?.hotels}
                                    description="Accommodation listings"
                                />
                                <StatCard
                                    icon={Compass}
                                    label="Attractions"
                                    value={summary?.attractions}
                                    description="Places and experiences"
                                />
                                <StatCard
                                    icon={Bus}
                                    label="Transportation"
                                    value={summary?.transportation}
                                    description="Transport options"
                                />
                            </div>

                            <div className="admin-overview-bottom">
                                <div className="admin-overview-card">
                                    <span className="admin-overview-card-icon">
                                        <Activity size={19} />
                                    </span>
                                    <div>
                                        <h3>Travel catalog</h3>
                                        <p>
                                            {summary?.catalogTotal ?? 0} catalog records are currently
                                            stored in your database.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-text-button"
                                        onClick={() => setActiveTab("catalog")}
                                    >
                                        Manage catalog
                                    </button>
                                </div>

                                <div className="admin-overview-card">
                                    <span className="admin-overview-card-icon">
                                        <CircleUserRound size={19} />
                                    </span>
                                    <div>
                                        <h3>User accounts</h3>
                                        <p>
                                            Review registered users, assign roles, and manage account
                                            access.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-text-button"
                                        onClick={() => setActiveTab("users")}
                                    >
                                        Manage users
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            )}

            {activeTab === "catalog" && (
                <section className="admin-section">
                    <div className="admin-section-heading admin-catalog-heading">
                        <div>
                            <h2>Travel catalog</h2>
                            <p>Create and maintain the content available on Roamwise.</p>
                        </div>

                        <button
                            type="button"
                            className="admin-primary-button"
                            onClick={openCreateEditor}
                        >
                            <Plus size={17} />
                            Add item
                        </button>
                    </div>

                    <div className="admin-catalog-toolbar">
                        <div className="admin-type-select">
                            <label htmlFor="admin-catalog-type">Catalog type</label>
                            <span>
                                <select
                                    id="admin-catalog-type"
                                    value={catalogType}
                                    onChange={(event) => {
                                        setCatalogType(event.target.value);
                                        setCatalogSearch("");
                                        setNotice("");
                                    }}
                                >
                                    {CATALOG_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={15} />
                            </span>
                        </div>

                        <div className="admin-table-search-wrapper">
                            <label htmlFor="catalog-search" className="admin-table-search-label">
                                Search
                            </label>

                            <div className="admin-table-search">
                                <Search size={17} />
                                <input
                                    id="catalog-search"
                                    value={catalogSearch}
                                    onChange={(event) => setCatalogSearch(event.target.value)}
                                    placeholder="Search catalog..."
                                />
                            </div>
                        </div>
                    </div>

                    {catalogLoading ? (
                        <div className="admin-loading">
                            <LoaderCircle size={25} className="admin-spin" />
                            Loading catalog...
                        </div>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Location / type</th>
                                        <th>Price</th>
                                        <th>Status</th>
                                        <th>Updated</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredCatalog.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <div className="admin-item-cell">
                                                    {item.image ? (
                                                        <img src={item.image} alt="" />
                                                    ) : (
                                                        <span className="admin-item-placeholder">
                                                            <MapPin size={17} />
                                                        </span>
                                                    )}
                                                    <div>
                                                        <strong>{item.name}</strong>
                                                        <span>{item.category || item.tag || item.type}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span>{[item.city, item.country].filter(Boolean).join(", ") || item.transportType || item.address || "—"}</span>
                                            </td>

                                            <td>
                                                {Number(item.price || 0).toLocaleString("en-IN", {
                                                    style: "currency",
                                                    currency: "USD",
                                                    maximumFractionDigits: 0,
                                                })}
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-status ${item.isActive === false ? "inactive" : "active"
                                                        }`}
                                                >
                                                    {item.isActive === false ? "Inactive" : "Active"}
                                                </span>
                                            </td>

                                            <td>{formatDate(item.updatedAt)}</td>

                                            <td>
                                                <div className="admin-row-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditEditor(item)}
                                                        aria-label={`Edit ${item.name}`}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="delete"
                                                        onClick={() => deleteCatalogItem(item)}
                                                        aria-label={`Delete ${item.name}`}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {!filteredCatalog.length && (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="admin-table-empty">
                                                    <Compass size={24} />
                                                    <strong>No catalog items found</strong>
                                                    <span>Add an item or change your search.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {activeTab === "users" && (
                <section className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>User management</h2>
                            <p>Manage account roles and access to Roamwise.</p>
                        </div>
                    </div>

                    <label className="admin-table-search admin-users-search">
                        <Search size={17} />
                        <input
                            value={userSearch}
                            onChange={(event) => setUserSearch(event.target.value)}
                            placeholder="Search by name, email, or role..."
                        />
                    </label>

                    {usersLoading ? (
                        <div className="admin-loading">
                            <LoaderCircle size={25} className="admin-spin" />
                            Loading users...
                        </div>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table admin-users-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Account status</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredUsers.map((item) => {
                                        const userId = item._id || item.id;
                                        const isCurrentUser = String(userId) === String(user?.id);

                                        return (
                                            <tr key={userId}>
                                                <td>
                                                    <div className="admin-user-cell">
                                                        <span className="admin-user-avatar">
                                                            {(item.name || "U").slice(0, 1).toUpperCase()}
                                                        </span>
                                                        <div>
                                                            <strong>{item.name}</strong>
                                                            <span>{item.email}</span>
                                                            {isCurrentUser && (
                                                                <small className="admin-you-label">You</small>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`admin-role-label ${item.role === "admin" ? "admin" : ""
                                                            }`}
                                                    >
                                                        {item.role === "admin" ? "Admin" : "User"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`admin-status ${item.isActive === false ? "inactive" : "active"
                                                            }`}
                                                    >
                                                        {item.isActive === false ? "Disabled" : "Active"}
                                                    </span>
                                                </td>

                                                <td>{formatDate(item.createdAt)}</td>

                                                <td>
                                                    <div className="admin-user-actions">
                                                        <select
                                                            value={item.role || "user"}
                                                            onChange={(event) =>
                                                                updateUser(userId, {
                                                                    role: event.target.value,
                                                                })
                                                            }
                                                            disabled={isCurrentUser}
                                                            aria-label={`Change role for ${item.name}`}
                                                            title={
                                                                isCurrentUser
                                                                    ? "You cannot change your own role here"
                                                                    : "Change user role"
                                                            }
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="admin">Admin</option>
                                                        </select>

                                                        <button
                                                            type="button"
                                                            className={
                                                                item.isActive === false
                                                                    ? "admin-enable-button"
                                                                    : "admin-disable-button"
                                                            }
                                                            onClick={() =>
                                                                updateUser(userId, {
                                                                    isActive: item.isActive === false,
                                                                })
                                                            }
                                                            disabled={isCurrentUser}
                                                        >
                                                            {item.isActive === false ? "Enable" : "Disable"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {!filteredUsers.length && (
                                        <tr>
                                            <td colSpan={5}>
                                                <div className="admin-table-empty">
                                                    <Users size={24} />
                                                    <strong>No users found</strong>
                                                    <span>Try a different search term.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {editorOpen && (
                <div
                    className="admin-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeEditor();
                    }}
                >
                    <section
                        className="admin-editor-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-editor-title"
                    >
                        <header className="admin-editor-header">
                            <div>
                                <p className="admin-eyebrow">
                                    {editingItem ? "UPDATE CATALOG" : "NEW CATALOG ITEM"}
                                </p>
                                <h2 id="admin-editor-title">
                                    {editingItem ? "Edit item" : "Add catalog item"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="admin-modal-close"
                                onClick={closeEditor}
                                disabled={saving}
                                aria-label="Close editor"
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <form className="admin-editor-form" onSubmit={saveCatalogItem}>
                            <div className="admin-form-grid">
                                <label className="admin-form-field admin-form-full">
                                    <span>Item name *</span>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={updateForm}
                                        maxLength={150}
                                        required
                                        placeholder="e.g. Bali"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>City</span>
                                    <input
                                        name="city"
                                        value={form.city}
                                        onChange={updateForm}
                                        maxLength={100}
                                        placeholder="City"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Country</span>
                                    <input
                                        name="country"
                                        value={form.country}
                                        onChange={updateForm}
                                        maxLength={100}
                                        placeholder="Country"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Category</span>
                                    <input
                                        name="category"
                                        value={form.category}
                                        onChange={updateForm}
                                        maxLength={80}
                                        placeholder="e.g. Beach"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Tag</span>
                                    <input
                                        name="tag"
                                        value={form.tag}
                                        onChange={updateForm}
                                        maxLength={50}
                                        placeholder="e.g. Popular"
                                    />
                                </label>

                                <label className="admin-form-field admin-form-full">
                                    <span>Image URL</span>
                                    <input
                                        type="url"
                                        name="image"
                                        value={form.image}
                                        onChange={updateForm}
                                        maxLength={2000}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Rating (0–5)</span>
                                    <input
                                        type="number"
                                        name="rating"
                                        value={form.rating}
                                        onChange={updateForm}
                                        min="0"
                                        max="5"
                                        step="0.1"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Price (USD)</span>
                                    <input
                                        type="number"
                                        name="price"
                                        value={form.price}
                                        onChange={updateForm}
                                        min="0"
                                        step="1"
                                    />
                                </label>

                                <label className="admin-form-field admin-form-full">
                                    <span>Duration</span>
                                    <input
                                        name="duration"
                                        value={form.duration}
                                        onChange={updateForm}
                                        maxLength={100}
                                        placeholder="e.g. 3–5 days"
                                    />
                                </label>

                                <label className="admin-form-field admin-form-full">
                                    <span>Description</span>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={updateForm}
                                        maxLength={2000}
                                        rows={3}
                                        placeholder="Describe this item..."
                                    />
                                </label>

                                <label className="admin-form-field admin-form-full">
                                    <span>Address</span>
                                    <input
                                        name="address"
                                        value={form.address}
                                        onChange={updateForm}
                                        maxLength={300}
                                        placeholder="Street address or location"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Contact</span>
                                    <input
                                        name="contact"
                                        value={form.contact}
                                        onChange={updateForm}
                                        maxLength={100}
                                        placeholder="Phone or email"
                                    />
                                </label>

                                <label className="admin-form-field">
                                    <span>Website</span>
                                    <input
                                        type="url"
                                        name="website"
                                        value={form.website}
                                        onChange={updateForm}
                                        maxLength={2000}
                                        placeholder="https://..."
                                    />
                                </label>

                                {catalogType === "transportation" && (
                                    <label className="admin-form-field admin-form-full">
                                        <span>Transportation type</span>
                                        <input
                                            name="transportType"
                                            value={form.transportType}
                                            onChange={updateForm}
                                            maxLength={80}
                                            placeholder="e.g. Train, Bus, Flight"
                                        />
                                    </label>
                                )}

                                {catalogType === "hotel" && (
                                    <label className="admin-form-field admin-form-full">
                                        <span>Amenities (comma-separated)</span>
                                        <input
                                            name="amenities"
                                            value={form.amenities}
                                            onChange={updateForm}
                                            placeholder="Wi-Fi, Pool, Breakfast"
                                        />
                                    </label>
                                )}

                                <label className="admin-active-toggle admin-form-full">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={form.isActive}
                                        onChange={updateForm}
                                    />
                                    <span>
                                        <strong>Active listing</strong>
                                        <small>
                                            Active listings can be displayed to travelers.
                                        </small>
                                    </span>
                                </label>
                            </div>

                            <footer className="admin-editor-footer">
                                <button
                                    type="button"
                                    className="admin-cancel-button"
                                    onClick={closeEditor}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="admin-primary-button"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <LoaderCircle size={17} className="admin-spin" />
                                    ) : (
                                        <CheckCircle2 size={17} />
                                    )}
                                    {saving
                                        ? "Saving..."
                                        : editingItem
                                            ? "Save changes"
                                            : "Create item"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

export default Admin;