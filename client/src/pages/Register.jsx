import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Compass, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

export default function Register() {
    const { register, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (loading) return null;
    if (isAuthenticated) return <Navigate to="/explore" replace />;

    function handleChange(event) {
        setForm((previous) => ({
            ...previous,
            [event.target.name]: event.target.value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (form.name.trim().length < 2) {
            setError("Your name must contain at least 2 characters.");
            return;
        }

        if (form.password.length < 8) {
            setError("Your password must contain at least 8 characters.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        try {
            setSubmitting(true);

            await register({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
            });

            navigate("/explore", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to create your account. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-visual register-visual">
                <Link to="/explore" className="auth-brand">
                    <span className="auth-brand-icon"><Compass size={24} /></span>
                    Roamwise
                </Link>

                <div className="auth-visual-copy">
                    <span className="auth-eyebrow">A WORLD OF POSSIBILITIES</span>
                    <h1>Collect moments, not just miles.</h1>
                    <p>
                        Create your account and start turning the places
                        you've dreamed of into journeys you can take.
                    </p>
                </div>

                <div className="auth-visual-footer">
                    Your journey. Your way.
                </div>
            </section>

            <section className="auth-form-section">
                <div className="auth-form-wrap">
                    <Link to="/explore" className="auth-mobile-brand">
                        <Compass size={23} /> Roamwise
                    </Link>

                    <span className="auth-eyebrow">GET STARTED</span>
                    <h2>Create your account</h2>
                    <p className="auth-subtitle">
                        Join Roamwise and plan your next adventure.
                    </p>

                    {error && <div className="auth-error" role="alert">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <label htmlFor="register-name">Full name</label>
                        <div className="auth-input-wrap">
                            <UserRound size={18} />
                            <input
                                id="register-name"
                                type="text"
                                name="name"
                                placeholder="Your name"
                                autoComplete="name"
                                value={form.name}
                                onChange={handleChange}
                                minLength={2}
                                maxLength={60}
                                required
                            />
                        </div>

                        <label htmlFor="register-email">Email address</label>
                        <div className="auth-input-wrap">
                            <Mail size={18} />
                            <input
                                id="register-email"
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

                        <label htmlFor="register-password">Password</label>
                        <div className="auth-input-wrap">
                            <LockKeyhole size={18} />
                            <input
                                id="register-password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                value={form.password}
                                onChange={handleChange}
                                minLength={8}
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

                        <label htmlFor="register-confirm-password">Confirm password</label>
                        <div className="auth-input-wrap">
                            <LockKeyhole size={18} />
                            <input
                                id="register-confirm-password"
                                type={showPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Re-enter your password"
                                autoComplete="new-password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <p className="auth-password-hint">
                            Use at least 8 characters. Avoid reusing another site's password.
                        </p>

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={submitting}
                        >
                            {submitting ? "Creating account..." : "Create account"}
                            {!submitting && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </section>
        </main>
    );
}