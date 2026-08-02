import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const canvasRef = useRef(null);

  // Particle animation background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', handleResize); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await api.login({ username, password });
      localStorage.setItem('wifi_token', result.token);
      localStorage.setItem('wifi_user', result.username);
      onLoginSuccess(result);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div style={styles.page}>
      {/* Particle Canvas */}
      <canvas ref={canvasRef} style={styles.canvas} />

      {/* Gradient orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />

      {/* Card */}
      <div style={{ ...styles.card, animation: shake ? 'shake 0.5s ease' : 'slideUp 0.5s ease-out' }}>
        {/* Logo / Icon */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>📡</div>
          <div style={styles.logoPulse} />
        </div>

        {/* Title */}
        <h1 style={styles.title}>WiFi Billing</h1>
        <p style={styles.subtitle}>Dashboard Laporan & Manajemen Tagihan</p>
        <p style={styles.subtitle2}>Masuk untuk mengakses sistem</p>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Username */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>👤 Username</label>
            <div style={styles.inputWrap}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                style={styles.input}
                autoComplete="username"
                autoFocus
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, styles.input)}
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>🔒 Password</label>
            <div style={{ ...styles.inputWrap, position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                style={{ ...styles.input, paddingRight: 48 }}
                autoComplete="current-password"
                onFocus={(e) => Object.assign(e.target.style, { ...styles.inputFocus, paddingRight: '48px' })}
                onBlur={(e) => Object.assign(e.target.style, { ...styles.input, paddingRight: '48px' })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span style={styles.loadingRow}>
                <span style={styles.spinner} />
                Memverifikasi...
              </span>
            ) : (
              '🚀 Masuk ke Dashboard'
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p style={styles.hint}>
          Sistem Manajemen WiFi Billing &copy; 2026
        </p>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-10px); }
          40%     { transform: translateX(10px); }
          60%     { transform: translateX(-6px); }
          80%     { transform: translateX(6px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50%     { transform: scale(1.4); opacity: 0.2; }
        }
        @keyframes orb {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(40px,-30px) scale(1.05); }
          66%     { transform: translate(-20px,20px) scale(0.97); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0b14',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '16px',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  canvas: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  orb1: {
    position: 'fixed',
    top: '-20%',
    left: '-10%',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)',
    animation: 'orb 12s ease-in-out infinite',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'fixed',
    bottom: '-15%',
    right: '-10%',
    width: 450,
    height: 450,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)',
    animation: 'orb 15s ease-in-out infinite reverse',
    pointerEvents: 'none',
  },
  orb3: {
    position: 'fixed',
    top: '40%',
    left: '40%',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(167,139,250,0.1), transparent 70%)',
    animation: 'orb 20s ease-in-out infinite',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: 440,
    background: 'rgba(22,24,40,0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: 24,
    padding: '48px 40px 36px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  logoIcon: {
    fontSize: '3rem',
    position: 'relative',
    zIndex: 1,
    filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.7))',
  },
  logoPulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(99,102,241,0.15)',
    animation: 'pulse 2.5s ease-in-out infinite',
  },
  title: {
    textAlign: 'center',
    fontSize: '1.75rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #f1f5f9 0%, #a5b4fc 50%, #c4b5fd 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 6,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.85rem',
    marginBottom: 2,
  },
  subtitle2: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.8rem',
    marginBottom: 0,
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)',
    margin: '24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#a5b4fc',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '13px 18px',
    background: 'rgba(30,33,55,0.8)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocus: {
    width: '100%',
    padding: '13px 18px',
    background: 'rgba(30,33,55,0.9)',
    border: '1px solid rgba(99,102,241,0.6)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: 4,
    color: '#64748b',
  },
  errorBox: {
    background: 'rgba(244,63,94,0.12)',
    border: '1px solid rgba(244,63,94,0.3)',
    color: '#fb7185',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: '0.82rem',
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: '0.01em',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  hint: {
    textAlign: 'center',
    color: '#334155',
    fontSize: '0.72rem',
    marginTop: 28,
    letterSpacing: '0.02em',
  },
};
