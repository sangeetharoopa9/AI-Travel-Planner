
import { useEffect, useState } from "react";
import {
    Bell,
    CheckCircle2,
    CircleUserRound,
    Compass,
    Eye,
    EyeOff,
    LockKeyhole,
    Save,
    ShieldCheck,
    Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Settings.css";

const DEFAULT_PREFERENCES = {
    budget: "moderate",
    travelStyle: "mixed",
    currency: "USD",
    notifications: {
        dealAlerts: true,
        tripReminders: true,
        productUpdates: false,
    },
};

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again."
    );
}

export default function Settings() {
    const { user, updateUser } = useAuth();

    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;

        async function loadSettings() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/settings");
                const currentUser = response.data?.data?.user;

                if (!currentUser) {
                    throw new Error("The Settings API returned an unexpected response.");
                }

                if (!active) return;

                setName(currentUser.name || "");
                setEmail(currentUser.email || "");

                const savedPreferences = currentUser.preferences || {};

                setPreferences({
                    ...DEFAULT_PREFERENCES,
                    ...savedPreferences,
                    notifications: {
                        ...DEFAULT_PREFERENCES.notifications,
                        ...(savedPreferences.notifications || {}),
                    },
                });
            } catch (requestError) {
                if (active) setError(getErrorMessage(requestError));
            } finally {
                if (active) setLoading(false);
            }
        }

        loadSettings();

        return () => {
            active = false;
        };
    }, []);

    function updatePreference(field, value) {
        setPreferences((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function updateNotification(field, value) {
        setPreferences((current) => ({
            ...current,
            notifications: {
                ...current.notifications,
                [field]: value,
            },
        }));
    }

    async function saveSettings(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");

        try {
            const response = await api.patch("/settings", {
                name,
                preferences,
            });

            const updatedUser = response.data?.data?.user;

            if (updatedUser) {
                updateUser(updatedUser);
                setName(updatedUser.name || "");
                setEmail(updatedUser.email || "");
                setPreferences({
                    ...DEFAULT_PREFERENCES,
                    ...(updatedUser.preferences || {}),
                    notifications: {
                        ...DEFAULT_PREFERENCES.notifications,
                        ...(updatedUser.preferences?.notifications || {}),
                    },
                });
            }

            setNotice(response.data?.message || "Settings saved successfully.");
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function savePassword(event) {
        event.preventDefault();
        setError("");
        setNotice("");

        if (newPassword !== confirmPassword) {
            setError("The new password and confirmation do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Your new password must contain at least 8 characters.");
            return;
        }

        setChangingPassword(true);

        try {
            const response = await api.patch("/settings/password", {
                currentPassword,
                newPassword,
            });

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            setNotice(response.data?.message || "Password changed successfully.");
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setChangingPassword(false);
        }
    }

    if (loading) {
        return (
            <div className="settings-page">
                <div className="settings-loading">
                    <span className="settings-spinner" />
                    <p>Loading your settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <header className="settings-page-header">
                <div>
                    <span className="settings-eyebrow">YOUR ACCOUNT</span>
                    <h1>Settings</h1>
                    <p>
                        Manage your profile, travel preferences, and account security.
                    </p>
                </div>

                <span className="settings-account-badge">
                    <ShieldCheck size={15} />
                    {user?.role === "admin" ? "Administrator" : "Traveler account"}
                </span>
            </header>

            {error && (
                <div className="settings-message settings-error" role="alert">
                    {error}
                    <button type="button" onClick={() => setError("")}>
                        Dismiss
                    </button>
                </div>
            )}

            {notice && (
                <div className="settings-message settings-success" role="status">
                    <CheckCircle2 size={16} />
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice("")}>
                        Dismiss
                    </button>
                </div>
            )}

            <form className="settings-form" onSubmit={saveSettings}>
                <section className="settings-panel">
                    <div className="settings-panel-heading">
                        <span className="settings-panel-icon">
                            <CircleUserRound size={20} />
                        </span>
                        <div>
                            <h2>Profile information</h2>
                            <p>Update the name associated with your account.</p>
                        </div>
                    </div>

                    <div className="settings-fields">
                        <label className="settings-field">
                            <span>Full name</span>
                            <input
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                minLength={2}
                                maxLength={60}
                                required
                                autoComplete="name"
                            />
                        </label>

                        <label className="settings-field">
                            <span>Email address</span>
                            <input
                                type="email"
                                value={email}
                                readOnly
                                aria-describedby="settings-email-note"
                            />
                            <small id="settings-email-note">
                                Your login email cannot be changed here.
                            </small>
                        </label>
                    </div>
                </section>

                <section className="settings-panel">
                    <div className="settings-panel-heading">
                        <span className="settings-panel-icon">
                            <Compass size={20} />
                        </span>
                        <div>
                            <h2>Travel preferences</h2>
                            <p>Help Roamwise tailor your travel recommendations.</p>
                        </div>
                    </div>

                    <div className="settings-fields settings-fields-three">
                        <label className="settings-field">
                            <span>Travel budget</span>
                            <select
                                value={preferences.budget}
                                onChange={(event) =>
                                    updatePreference("budget", event.target.value)
                                }
                            >
                                <option value="budget">Budget-friendly</option>
                                <option value="moderate">Moderate</option>
                                <option value="luxury">Luxury</option>
                                <option value="flexible">Flexible</option>
                            </select>
                        </label>

                        <label className="settings-field">
                            <span>Travel style</span>
                            <select
                                value={preferences.travelStyle}
                                onChange={(event) =>
                                    updatePreference("travelStyle", event.target.value)
                                }
                            >
                                <option value="mixed">A bit of everything</option>
                                <option value="adventure">Adventure</option>
                                <option value="relaxation">Relaxation</option>
                                <option value="culture">Culture and history</option>
                                <option value="nature">Nature and outdoors</option>
                                <option value="food">Food and local cuisine</option>
                            </select>
                        </label>

                        <label className="settings-field">
                            <span>Preferred currency</span>
                            <select
                                value={preferences.currency}
                                onChange={(event) =>
                                    updatePreference("currency", event.target.value)
                                }
                            >
                                <option value="USD">USD — US Dollar</option>
                                <option value="INR">INR — Indian Rupee</option>
                                <option value="EUR">EUR — Euro</option>
                                <option value="GBP">GBP — British Pound</option>
                            </select>
                        </label>
                    </div>
                </section>

                <section className="settings-panel">
                    <div className="settings-panel-heading">
                        <span className="settings-panel-icon">
                            <Bell size={20} />
                        </span>
                        <div>
                            <h2>Notifications</h2>
                            <p>Choose the updates you want to receive.</p>
                        </div>
                    </div>

                    <div className="settings-toggle-list">
                        <label className="settings-toggle-row">
                            <span>
                                <strong>Travel deals</strong>
                                <small>Receive information about available offers.</small>
                            </span>
                            <input
                                type="checkbox"
                                checked={preferences.notifications.dealAlerts}
                                onChange={(event) =>
                                    updateNotification("dealAlerts", event.target.checked)
                                }
                            />
                        </label>

                        <label className="settings-toggle-row">
                            <span>
                                <strong>Trip reminders</strong>
                                <small>Receive reminders related to your trips.</small>
                            </span>
                            <input
                                type="checkbox"
                                checked={preferences.notifications.tripReminders}
                                onChange={(event) =>
                                    updateNotification("tripReminders", event.target.checked)
                                }
                            />
                        </label>

                        <label className="settings-toggle-row">
                            <span>
                                <strong>Product updates</strong>
                                <small>Receive news about Roamwise features.</small>
                            </span>
                            <input
                                type="checkbox"
                                checked={preferences.notifications.productUpdates}
                                onChange={(event) =>
                                    updateNotification("productUpdates", event.target.checked)
                                }
                            />
                        </label>
                    </div>
                </section>

                <div className="settings-form-actions">
                    <button
                        type="submit"
                        className="settings-save-button"
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? "Saving..." : "Save settings"}
                    </button>
                </div>
            </form>

            <section className="settings-panel settings-security-panel">
                <div className="settings-panel-heading">
                    <span className="settings-panel-icon">
                        <LockKeyhole size={20} />
                    </span>
                    <div>
                        <h2>Account security</h2>
                        <p>Change your account password.</p>
                    </div>
                </div>

                <form className="settings-password-form" onSubmit={savePassword}>
                    <label className="settings-field">
                        <span>Current password</span>
                        <div className="settings-password-input">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(event) => setCurrentPassword(event.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                aria-label={
                                    showCurrentPassword ? "Hide password" : "Show password"
                                }
                                onClick={() =>
                                    setShowCurrentPassword((current) => !current)
                                }
                            >
                                {showCurrentPassword ? (
                                    <EyeOff size={17} />
                                ) : (
                                    <Eye size={17} />
                                )}
                            </button>
                        </div>
                    </label>

                    <label className="settings-field">
                        <span>New password</span>
                        <div className="settings-password-input">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                minLength={8}
                                maxLength={72}
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowNewPassword((current) => !current)}
                            >
                                {showNewPassword ? (
                                    <EyeOff size={17} />
                                ) : (
                                    <Eye size={17} />
                                )}
                            </button>
                        </div>
                        <small>Use at least 8 characters.</small>
                    </label>

                    <label className="settings-field">
                        <span>Confirm new password</span>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            minLength={8}
                            maxLength={72}
                            required
                            autoComplete="new-password"
                        />
                    </label>

                    <div className="settings-password-actions">
                        <button
                            type="submit"
                            className="settings-secondary-button"
                            disabled={changingPassword}
                        >
                            <Wallet size={15} />
                            {changingPassword ? "Updating..." : "Change password"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
