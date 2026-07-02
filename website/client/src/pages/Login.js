import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const RESET_EMAIL_KEY = 'agritech_reset_email';
const RESET_OTP_KEY = 'agritech_reset_otp';
const emptyForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'farmer',
  farmName: '',
  newPassword: '',
  otp: '',
};

// mode: 'login' | 'register' | 'forgot' | 'verify-otp' | 'reset'
export default function Login() {
  const [mode, setMode]         = useState('login');
  const [form, setForm]         = useState(emptyForm);
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [otpVerified, setOTPVerified] = useState(false);

  const { login, register, resetPassword, verifyOTP, forgotPassword, continueAsGuest } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const guestChannelLabel = (process.env.REACT_APP_THINGSPEAK_CHANNEL || '').trim()
    ? `#${process.env.REACT_APP_THINGSPEAK_CHANNEL.trim()}`
    : '#your_channel_id';

  const guestBlocked  = location.state?.guestBlocked;
  const redirectTo    = location.state?.from?.pathname || '/';

  // If guest was blocked, start in login mode and show a friendly notice
  useEffect(() => {
    if (guestBlocked) setMode('login');
  }, [guestBlocked]);

  useEffect(() => {
    const savedResetEmail = localStorage.getItem(RESET_EMAIL_KEY);
    const savedResetOTP = localStorage.getItem(RESET_OTP_KEY);
    if (savedResetEmail) {
      setResetEmail(savedResetEmail);
      setForm(prev => ({ ...prev, email: savedResetEmail }));
      if (savedResetOTP) {
        setResetOTP(savedResetOTP);
        setOTPVerified(true);
        setMode('reset');
      }
    }
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const switchMode = (m) => {
    setMode(m); setError(''); setSuccess('');
    if (m !== 'verify-otp' && m !== 'reset') {
      localStorage.removeItem(RESET_EMAIL_KEY);
      localStorage.removeItem(RESET_OTP_KEY);
      setResetEmail('');
      setResetOTP('');
      setOTPVerified(false);
    }
    setForm(prev => ({
      ...emptyForm,
      email: m === 'forgot' ? prev.email : '',
    }));
  };

  // ── Submit handlers ──────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmit(true); setError('');
    try {
      const res = await login(form.email, form.password);
      console.log('LOGIN SUCCESS:', res);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.log('LOGIN ERROR:', err);
      setError(err.message);
    }
    setSubmit(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setSubmit(true); setError('');
    try {
      const res = await register(form);
      console.log('REGISTER SUCCESS:', res);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.log('REGISTER ERROR:', err);
      setError(err.message);
    }
    setSubmit(false);
  };

  // Step 1: Request OTP for password reset
  const handleForgotStep1 = async (e) => {
    e.preventDefault();
    setSubmit(true); setError(''); setSuccess('');
    try {
      const email = form.email.toLowerCase().trim();
      console.log('[FORGOT PASSWORD] Sending request for:', email);
      const message = await forgotPassword(email);
      console.log('FORGOT PASSWORD SUCCESS:', message);
      setSuccess(message.message || message);
      setResetEmail(email);
      localStorage.setItem(RESET_EMAIL_KEY, email);
      setForm(prev => ({
        ...prev,
        email,
        otp: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setMode('verify-otp');
    } catch (err) {
      console.error('FORGOT PASSWORD ERROR:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Network error. Check that server is running on http://localhost:5000';
      setError(errorMsg);
    }
    setSubmit(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!form.otp || form.otp.length !== 6) { setError('OTP must be 6 digits'); return; }
    setSubmit(true); setError('');
    try {
      const email = resetEmail || localStorage.getItem(RESET_EMAIL_KEY);
      if (!email) throw new Error('Email not found. Please restart the password reset process.');
      console.log('[VERIFY OTP] Verifying for:', email);
      const message = await verifyOTP(email, form.otp);
      console.log('OTP VERIFIED:', message);
      setSuccess(message);
      setResetOTP(form.otp);
      setOTPVerified(true);
      localStorage.setItem(RESET_OTP_KEY, form.otp);
      setForm(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: '',
      }));
      setMode('reset');
    } catch (err) {
      console.error('OTP VERIFICATION ERROR:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to verify OTP';
      setError(errorMsg);
    }
    setSubmit(false);
  };

  // Step 3: Set new password with verified OTP
  const handleReset = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setSubmit(true); setError('');
    try {
      const email = resetEmail || localStorage.getItem(RESET_EMAIL_KEY);
      const otp = resetOTP || localStorage.getItem(RESET_OTP_KEY);
      if (!email) {
        throw new Error('Please verify your email before resetting the password');
      }
      if (!otp) {
        throw new Error('Please verify your OTP before resetting the password');
      }
      console.log('[RESET PASSWORD] Resetting for:', email);
      const res = await resetPassword(email, form.newPassword, otp);
      console.log('RESET PASSWORD SUCCESS:', res);
      setSuccess('Password reset successfully! You can now sign in.');
      localStorage.removeItem(RESET_EMAIL_KEY);
      localStorage.removeItem(RESET_OTP_KEY);
      setResetEmail('');
      setResetOTP('');
      setOTPVerified(false);
      setMode('login');
      setForm(prev => ({
        ...prev,
        email,
        password: '',
        confirmPassword: '',
        newPassword: '',
        otp: '',
      }));
    } catch (err) {
      console.error('RESET PASSWORD ERROR:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to reset password';
      setError(errorMsg);
    }
    setSubmit(false);
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate('/', { replace: true });
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-circle c1" />
        <div className="bg-circle c2" />
        <div className="bg-grain" />
      </div>

      {/* ── Left branding panel ── */}
      <div className="login-left">
        <div className="brand">
          <span className="brand-icon">🌿</span>
          <span className="brand-name">AgriTech<em>Pro</em></span>
        </div>
        <h1 className="hero-title">Smart Farming<br />Intelligence Platform</h1>
        <p className="hero-desc">
          Monitor soil moisture, temperature, humidity,  and more — all in real-time from your IoT sensors via ThingSpeak.
        </p>
        <div className="feature-list">
          {[
            { icon: '📡', text: 'Real-time sensor monitoring' },
            { icon: '📊', text: 'Multi-channel analytics' },
            { icon: '🔔', text: 'Automated alerts & thresholds' },
            { icon: '💧', text: 'Irrigation zone control' },
          ].map(f => (
            <div key={f.text} className="feature-item">
              <span className="feature-check">✓</span>
              <span>{f.icon} {f.text}</span>
            </div>
          ))}
        </div>
        <div className="channel-badge">
          <span>📡 ThingSpeak Channel</span>
          <code>{guestChannelLabel}</code>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-right">
        <div className="login-card">

          {/* Guest blocked notice */}
          {guestBlocked && mode === 'login' && (
            <div className="guest-blocked-notice">
              🔒 This page requires a full account. Please sign in or register to continue.
            </div>
          )}

          {/* Success message */}
          {success && mode !== 'reset' && mode !== 'verify-otp' && <div className="login-success">✅ {success}</div>}

          {/* ════════════════ LOGIN ════════════════ */}
          {mode === 'login' && (
            <>
              <div className="login-tabs">
                <button className="ltab active">Sign In</button>
                <button className="ltab" onClick={() => switchMode('register')}>Register</button>
              </div>
              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label>Email Address</label>
                  <input name="email" type="email" placeholder="farmer@example.com"
                    value={form.email} onChange={handleChange} autoComplete="email" required />
                </div>
                <div className="form-group">
                  <div className="label-row">
                    <label>Password</label>
                    <button type="button" className="forgot-link" onClick={() => switchMode('forgot')}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="pw-wrap">
                    <input name="password" type={showPw ? 'text' : 'password'}
                      placeholder="••••••••" value={form.password} onChange={handleChange}
                      autoComplete="current-password" required />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                {error && <div className="login-error">⚠️ {error}</div>}
                <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
                  {submitting ? '⟳ Signing in…' : 'Sign In →'}
                </button>
              </form>
              <div className="login-divider"><span>or</span></div>
              <button className="btn btn-secondary guest-btn" onClick={handleGuest}>
                👁 Continue as Guest <span className="guest-scope">(Dashboard only)</span>
              </button>
              <p className="login-note">
                Guest access shows the live dashboard. Register for full analytics, sensors, and alerts.
              </p>
            </>
          )}

          {/* ════════════════ REGISTER ════════════════ */}
          {mode === 'register' && (
            <>
              <div className="login-tabs">
                <button className="ltab" onClick={() => switchMode('login')}>Sign In</button>
                <button className="ltab active">Register</button>
              </div>
              <form onSubmit={handleRegister} className="login-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input name="name" placeholder="John Farmer" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input name="email" type="email" placeholder="farmer@example.com"
                      value={form.email} onChange={handleChange} autoComplete="email" required />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select name="role" value={form.role} onChange={handleChange}>
                      <option value="farmer">🌾 Farmer</option>
                      <option value="agronomist">🔬 Agronomist</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Farm Name <span className="optional">(optional)</span></label>
                  <input name="farmName" placeholder="Green Valley Farm" value={form.farmName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="pw-wrap">
                    <input name="password" type={showPw ? 'text' : 'password'}
                      placeholder="Min 6 characters" value={form.password} onChange={handleChange}
                      autoComplete="new-password" required />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input name="confirmPassword" type={showPw ? 'text' : 'password'}
                    placeholder="Re-enter password" value={form.confirmPassword}
                    onChange={handleChange} autoComplete="new-password" required />
                </div>
                {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                  <div className="pw-mismatch">⚠️ Passwords do not match</div>
                )}
                {error && <div className="login-error">⚠️ {error}</div>}
                <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
                  {submitting ? '⟳ Creating account…' : 'Create Account →'}
                </button>
              </form>
            </>
          )}

          {/* ════════════════ FORGOT — Step 1: enter email ════════════════ */}
          {mode === 'forgot' && (
            <>
              <div className="forgot-header">
                <button className="back-btn" onClick={() => switchMode('login')}>← Back</button>
                <h2 className="forgot-title">Reset Password</h2>
                <p className="forgot-sub">Enter the email address linked to your account and we'll send you a verification code.</p>
              </div>
              <form onSubmit={handleForgotStep1} className="login-form">
                <div className="form-group">
                  <label>Email Address</label>
                  <input name="email" type="email" placeholder="farmer@example.com"
                    value={form.email} onChange={handleChange} autoComplete="email" required />
                </div>
                {error && <div className="login-error">⚠️ {error}</div>}
                <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
                  {submitting ? '⟳ Sending OTP…' : 'Send OTP →'}
                </button>
              </form>
              <div className="login-divider"><span>or</span></div>
              <button className="btn btn-secondary guest-btn" onClick={() => switchMode('login')}>
                ← Back to Sign In
              </button>
            </>
          )}

          {/* ════════════════ VERIFY-OTP — Step 2: enter OTP ════════════════ */}
          {mode === 'verify-otp' && (
            <>
              <div className="forgot-header">
                <button className="back-btn" onClick={() => switchMode('forgot')}>← Back</button>
                <h2 className="forgot-title">Verify OTP</h2>
                <p className="forgot-sub">
                  We sent a 6-digit code to <strong>{resetEmail}</strong>
                </p>
              </div>
              {success && <div className="login-success">✅ {success}</div>}
              <form onSubmit={handleVerifyOTP} className="login-form">
                <div className="form-group">
                  <label>One-Time Password (OTP)</label>
                  <input 
                    name="otp" 
                    type="text" 
                    placeholder="000000" 
                    value={form.otp} 
                    onChange={handleChange}
                    maxLength="6"
                    autoComplete="off"
                    inputMode="numeric"
                    required 
                  />
                  <small className="otp-info">⏰ Valid for 10 minutes</small>
                </div>
                {error && <div className="login-error">⚠️ {error}</div>}
                <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
                  {submitting ? '⟳ Verifying…' : 'Verify OTP →'}
                </button>
              </form>
              <div className="login-divider"><span>or</span></div>
              <button className="btn btn-secondary guest-btn" onClick={() => switchMode('forgot')}>
                ← Request New OTP
              </button>
            </>
          )}

          {/* ════════════════ RESET — Step 3: set new password ════════════════ */}
          {mode === 'reset' && (
            <>
              <div className="forgot-header">
                <h2 className="forgot-title">Set New Password</h2>
                <p className="forgot-sub">
                  Account: <strong>{resetEmail}</strong>
                </p>
              </div>
              {success && <div className="login-success">✅ {success}</div>}
              <form onSubmit={handleReset} className="login-form">
                <div className="form-group">
                  <label>New Password</label>
                  <div className="pw-wrap">
                    <input name="newPassword" type={showPw ? 'text' : 'password'}
                      placeholder="Min 6 characters" value={form.newPassword}
                      onChange={handleChange} autoComplete="new-password" required />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input name="confirmPassword" type={showPw ? 'text' : 'password'}
                    placeholder="Re-enter new password" value={form.confirmPassword}
                    onChange={handleChange} autoComplete="new-password" required />
                </div>
                {form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword && (
                  <div className="pw-mismatch">⚠️ Passwords do not match</div>
                )}

                {/* Password strength indicator */}
                {form.newPassword && (
                  <div className="pw-strength">
                    <div className="pw-strength-bar">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`pw-seg ${getPwStrength(form.newPassword) >= i ? `seg-${getPwStrength(form.newPassword)}` : ''}`} />
                      ))}
                    </div>
                    <span className={`pw-label pw-label-${getPwStrength(form.newPassword)}`}>
                      {['','Weak','Fair','Good','Strong'][getPwStrength(form.newPassword)]}
                    </span>
                  </div>
                )}

                {error && <div className="login-error">⚠️ {error}</div>}
                <button type="submit" className="btn btn-primary login-submit"
                  disabled={submitting || (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword)}>
                  {submitting ? '⟳ Resetting…' : '🔒 Reset Password'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// Password strength scorer
function getPwStrength(pw) {
  if (!pw || pw.length < 4) return 1;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, Math.max(1, score));
}
