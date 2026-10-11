import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Compass, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const destination = location.state?.from?.pathname || "/explore";

    if (loading) return null;
    if (isAuthenticated) return <Navigate to={destination} replace />;

    function handleChange(event) {
        setForm((previous) => ({
            ...previous,
            [event.target.name]: event.target.value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!form.email.trim() || !form.password) {
            setError("Enter your email and password.");
            return;
        }

        try {
            setSubmitting(true);
            await login({
                email: form.email.trim(),
                password: form.password,
            });
            navigate(destination, { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to log in. Please check your connection and try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-visual">
                <Link to="/explore" className="auth-brand">
                    <span className="auth-brand-icon"><Compass size={24} /></span>
                    Roamwise
                </Link>

                <div className="auth-visual-copy">
                    <span className="auth-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
                    <h1>The world is waiting. Let's go.</h1>
                    <p>
                        Keep your travel ideas together, plan memorable journeys,
                        and make every trip count.
                    </p>
                </div>

                <div className="auth-visual-footer">
                    Discover more. Travel better.
                </div>
            </section>

            <section className="auth-form-section">
                <div className="auth-form-wrap">
                    <Link to="/explore" className="auth-mobile-brand">
                        <Compass size={23} /> Roamwise
                    </Link>

                    <span className="auth-eyebrow">WELCOME BACK</span>
                    <h2>Sign in to Roamwise</h2>
                    <p className="auth-subtitle">
                        Your next adventure is just around the corner.
                    </p>

                    {error && <div className="auth-error" role="alert">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <label htmlFor="login-email">Email address</label>
                        <div className="auth-input-wrap">
                            <Mail size={18} />
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                value={form.email}
                                onChange={handleChange}
                                maxLength={254}
                                required
                            />
                        </div>

                        <label htmlFor="login-password">Password</label>
                        <div className="auth-input-wrap">
                            <LockKeyhole size={18} />
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                className="auth-password-toggle"
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowPassword((value) => !value)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={submitting}
                        >
                            {submitting ? "Signing in..." : "Sign in"}
                            {!submitting && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Don't have an account? <Link to="/register">Create one</Link>
                    </p>

                    <Link to="/explore" className="auth-back-link">
                        Continue exploring without signing in
                    </Link>
                </div>
            </section>
        </main>
    );
}