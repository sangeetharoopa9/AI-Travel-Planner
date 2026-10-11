
import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Edit3,
    Plus,
    RefreshCw,
    Search,
    Tag,
    Trash2,
    X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./DealManagement.css";

const EMPTY_FORM = {
    title: "",
    description: "",
    destinationName: "",
    country: "",
    category: "General",
    image: "",
    originalPrice: "",
    discountedPrice: "",
    validUntil: "",
    bookingUrl: "",
    isFeatured: false,
    isActive: true,
};

function toDateInput(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again."
    );
}

export default function DealManagement() {
    const { user } = useAuth();

    const [deals, setDeals] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const isAdmin = user?.role === "admin";

    const loadDeals = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/admin/deals");
            setDeals(response.data?.data?.deals || []);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) loadDeals();
        else setLoading(false);
    }, [isAdmin, loadDeals]);

    function openCreate() {
        setEditingDeal(null);
        setForm(EMPTY_FORM);
        setError("");
        setNotice("");
        setEditorOpen(true);
    }

    function openEdit(deal) {
        setEditingDeal(deal);
        setForm({
            title: deal.title || "",
            description: deal.description || "",
            destinationName: deal.destinationName || "",
            country: deal.country || "",
            category: deal.category || "General",
            image: deal.image || "",
            originalPrice: String(deal.originalPrice ?? ""),
            discountedPrice: String(deal.discountedPrice ?? ""),
            validUntil: toDateInput(deal.validUntil),
            bookingUrl: deal.bookingUrl || "",
            isFeatured: Boolean(deal.isFeatured),
            isActive: deal.isActive !== false,
        });
        setError("");
        setNotice("");
        setEditorOpen(true);
    }

    function updateForm(event) {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    async function saveDeal(event) {
        event.preventDefault();
        if (saving) return;

        setSaving(true);
        setError("");
        setNotice("");

        const payload = {
            ...form,
            title: form.title.trim(),
            description: form.description.trim(),
            destinationName: form.destinationName.trim(),
            country: form.country.trim(),
            category: form.category.trim() || "General",
            image: form.image.trim(),
            originalPrice: Number(form.originalPrice),
            discountedPrice: Number(form.discountedPrice),
            validUntil: form.validUntil,
            bookingUrl: form.bookingUrl.trim(),
        };

        if (payload.discountedPrice > payload.originalPrice) {
            setError("Discounted price cannot exceed the original price.");
            setSaving(false);
            return;
        }

        try {
            if (editingDeal) {
                await api.put(`/admin/deals/${editingDeal._id}`, payload);
                setNotice("Travel deal updated successfully.");
            } else {
                await api.post("/admin/deals", payload);
                setNotice("Travel deal created successfully.");
            }

            setEditorOpen(false);
            setEditingDeal(null);
            setForm(EMPTY_FORM);
            await loadDeals();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function deleteDeal(deal) {
        const confirmed = window.confirm(
            `Delete "${deal.title}"? This cannot be undone.`
        );

        if (!confirmed) return;

        setError("");
        setNotice("");

        try {
            await api.delete(`/admin/deals/${deal._id}`);
            setNotice("Travel deal deleted successfully.");
            await loadDeals();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        }
    }

    async function toggleActive(deal) {
        setError("");
        setNotice("");

        try {
            await api.put(`/admin/deals/${deal._id}`, {
                isActive: deal.isActive === false,
            });

            setNotice(
                deal.isActive === false
                    ? "Deal activated."
                    : "Deal deactivated."
            );

            await loadDeals();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        }
    }

    const filteredDeals = deals.filter((deal) => {
        const query = search.trim().toLowerCase();

        if (!query) return true;

        return [
            deal.title,
            deal.destinationName,
            deal.country,
            deal.category,
        ].some((value) => String(value || "").toLowerCase().includes(query));
    });

    if (!isAdmin) {
        return (
            <div className="deal-admin-denied">
                <h1>Administrator access required</h1>
                <p>You do not have permission to manage travel deals.</p>
                <Link to="/explore">Return to Explore</Link>
            </div>
        );
    }

    return (
        <div className="deal-admin-page">
            <header className="deal-admin-header">
                <div>
                    <span className="deal-admin-eyebrow">ROAMWISE ADMIN</span>
                    <h1>Travel deal management</h1>
                    <p>Create and manage offers shown on the Travel Deals page.</p>
                </div>

                <div className="deal-admin-header-actions">
                    <button
                        type="button"
                        className="deal-admin-secondary-button"
                        onClick={loadDeals}
                        disabled={loading}
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>

                    <button
                        type="button"
                        className="deal-admin-primary-button"
                        onClick={openCreate}
                    >
                        <Plus size={16} />
                        Add deal
                    </button>
                </div>
            </header>

            {error && (
                <div className="deal-admin-message error" role="alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")}>
                        <X size={15} />
                    </button>
                </div>
            )}

            {notice && (
                <div className="deal-admin-message success" role="status">
                    <CheckCircle2 size={16} />
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice("")}>
                        <X size={15} />
                    </button>
                </div>
            )}

            <section className="deal-admin-list-panel">
                <div className="deal-admin-list-heading">
                    <div>
                        <h2>All deals</h2>
                        <p>{deals.length} total records</p>
                    </div>

                    <label className="deal-admin-search">
                        <Search size={16} />
                        <input
                            type="search"
                            placeholder="Search deals..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                </div>

                {loading ? (
                    <div className="deal-admin-empty">Loading deals...</div>
                ) : filteredDeals.length === 0 ? (
                    <div className="deal-admin-empty">
                        <Tag size={27} />
                        <h3>No deals found</h3>
                        <p>Create a deal to make it available on the Travel Deals page.</p>
                        <button
                            type="button"
                            className="deal-admin-primary-button"
                            onClick={openCreate}
                        >
                            <Plus size={15} />
                            Add first deal
                        </button>
                    </div>
                ) : (
                    <div className="deal-admin-table-wrap">
                        <table className="deal-admin-table">
                            <thead>
                                <tr>
                                    <th>Deal</th>
                                    <th>Price</th>
                                    <th>Discount</th>
                                    <th>Valid until</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeals.map((deal) => (
                                    <tr key={deal._id}>
                                        <td>
                                            <div className="deal-admin-name">
                                                <strong>{deal.title}</strong>
                                                <span>
                                                    {deal.destinationName}
                                                    {deal.country ? `, ${deal.country}` : ""}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="deal-admin-price">
                                                <strong>
                                                    {Number(deal.discountedPrice).toLocaleString()}
                                                </strong>
                                                <span>
                                                    Was {Number(deal.originalPrice).toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="deal-admin-discount">
                                                {deal.discountPercentage || 0}% off
                                            </span>
                                        </td>
                                        <td>
                                            <span className="deal-admin-expiry">
                                                <CalendarDays size={13} />
                                                {toDateInput(deal.validUntil) || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={`deal-admin-status ${deal.isActive ? "active" : "inactive"
                                                    }`}
                                                onClick={() => toggleActive(deal)}
                                                title="Click to change status"
                                            >
                                                {deal.isActive ? "Active" : "Inactive"}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="deal-admin-actions">
                                                <button
                                                    type="button"
                                                    title="Edit deal"
                                                    aria-label={`Edit ${deal.title}`}
                                                    onClick={() => openEdit(deal)}
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Delete deal"
                                                    aria-label={`Delete ${deal.title}`}
                                                    className="delete"
                                                    onClick={() => deleteDeal(deal)}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {editorOpen && (
                <div
                    className="deal-admin-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !saving) {
                            setEditorOpen(false);
                        }
                    }}
                >
                    <section
                        className="deal-admin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deal-admin-modal-title"
                    >
                        <header className="deal-admin-modal-header">
                            <div>
                                <span className="deal-admin-eyebrow">DEAL DETAILS</span>
                                <h2 id="deal-admin-modal-title">
                                    {editingDeal ? "Edit travel deal" : "Create travel deal"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="deal-admin-close"
                                onClick={() => setEditorOpen(false)}
                                disabled={saving}
                                aria-label="Close form"
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <form className="deal-admin-form" onSubmit={saveDeal}>
                            <label>
                                Deal title *
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={updateForm}
                                    maxLength={150}
                                    required
                                />
                            </label>

                            <label>
                                Description *
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={updateForm}
                                    rows={3}
                                    maxLength={2000}
                                    required
                                />
                            </label>

                            <div className="deal-admin-form-grid">
                                <label>
                                    Destination name *
                                    <input
                                        name="destinationName"
                                        value={form.destinationName}
                                        onChange={updateForm}
                                        maxLength={150}
                                        required
                                    />
                                </label>

                                <label>
                                    Country
                                    <input
                                        name="country"
                                        value={form.country}
                                        onChange={updateForm}
                                        maxLength={100}
                                    />
                                </label>

                                <label>
                                    Category
                                    <input
                                        name="category"
                                        value={form.category}
                                        onChange={updateForm}
                                        maxLength={80}
                                        placeholder="Beach, Adventure, City..."
                                    />
                                </label>

                                <label>
                                    Image URL
                                    <input
                                        type="url"
                                        name="image"
                                        value={form.image}
                                        onChange={updateForm}
                                        maxLength={2000}
                                        placeholder="https://..."
                                    />
                                </label>

                                <label>
                                    Original price *
                                    <input
                                        type="number"
                                        name="originalPrice"
                                        value={form.originalPrice}
                                        onChange={updateForm}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </label>

                                <label>
                                    Discounted price *
                                    <input
                                        type="number"
                                        name="discountedPrice"
                                        value={form.discountedPrice}
                                        onChange={updateForm}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </label>

                                <label>
                                    Valid until *
                                    <input
                                        type="date"
                                        name="validUntil"
                                        value={form.validUntil}
                                        onChange={updateForm}
                                        required
                                    />
                                </label>

                                <label>
                                    Booking URL
                                    <input
                                        type="url"
                                        name="bookingUrl"
                                        value={form.bookingUrl}
                                        onChange={updateForm}
                                        maxLength={2000}
                                        placeholder="https://..."
                                    />
                                </label>
                            </div>

                            <div className="deal-admin-checkboxes">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isFeatured"
                                        checked={form.isFeatured}
                                        onChange={updateForm}
                                    />
                                    Featured deal
                                </label>

                                <label>
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={form.isActive}
                                        onChange={updateForm}
                                    />
                                    Active and visible
                                </label>
                            </div>

                            <footer className="deal-admin-form-footer">
                                <button
                                    type="button"
                                    className="deal-admin-secondary-button"
                                    onClick={() => setEditorOpen(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="deal-admin-primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingDeal
                                            ? "Save changes"
                                            : "Create deal"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
