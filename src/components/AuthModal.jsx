import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, MessageCircle, Phone, X } from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const demoOtp = '123456';
const phPhoneDigits = 11;
const authDelay = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));

const AuthModal = ({ mode }) => {
  const isRegister = mode === 'register';
  const { login, register } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('password');
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    identifier: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') navigate('/');
    };

    document.body.classList.add('modal-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate]);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const updatePhone = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, phPhoneDigits);
    setForm({ ...form, phone: digitsOnly });
  };

  const normalizedPhone = () => form.phone.replace(/\D/g, '');
  const phoneEmail = () => `ph${normalizedPhone()}@phone.lazada.local`;
  const internationalPhone = () => {
    const phone = normalizedPhone();
    return phone.startsWith('0') ? `+63${phone.slice(1)}` : `+63${phone}`;
  };

  const socialLogin = async (provider) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    await authDelay();

    const email = `${provider.toLowerCase()}_buyer@lazada.local`;
    const password = `${provider.toLowerCase()}_social_login`;
    let result = await login(email, password);

    if (!result.ok) {
      result = await register({
        email,
        password,
        name: `${provider} Buyer`,
        role: 'buyer',
      });
    }

    if (!result.ok) {
      toast({ title: `${provider} login failed`, description: result.msg });
      setIsSubmitting(false);
      return;
    }

    toast({ title: `Logged in with ${provider}`, description: `Welcome, ${result.user.name}!` });
    navigate('/');
  };

  const sendOtp = (channel, requiresAgreement = false) => {
    if (normalizedPhone().length !== phPhoneDigits) {
      toast({ title: 'Invalid phone number', description: 'Please enter an 11-digit Philippine mobile number.' });
      return;
    }

    if (requiresAgreement && !agreed) {
      toast({ title: 'Agreement required', description: 'Please agree to the Terms of Use and Privacy Policy.' });
      return;
    }

    setOtpSent(true);
    toast({ title: `${channel} code sent`, description: `Use demo OTP ${demoOtp}.` });
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!isRegister) {
      if (loginMode === 'phone') {
        if (!otpSent) {
          sendOtp('SMS');
          return;
        }

        if (otp !== demoOtp) {
          toast({ title: 'Invalid OTP', description: `Use demo OTP ${demoOtp}.` });
          return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);
        await authDelay();

        const result = await login(phoneEmail(), 'phone_otp_login');
        if (!result.ok) {
          toast({ title: 'Phone not registered', description: 'Please sign up with this phone number first.' });
          setIsSubmitting(false);
          navigate('/register');
          return;
        }

        toast({ title: 'Welcome back!', description: 'Logged in with phone OTP.' });
        navigate('/');
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);
      await authDelay();

      const result = await login(form.identifier.trim(), form.password);
      if (!result.ok) {
        toast({ title: 'Login failed', description: result.msg });
        setIsSubmitting(false);
        return;
      }

      toast({ title: `Welcome back, ${result.user.name}!`, description: `Logged in as ${result.user.role}` });
      if (result.user.role === 'admin') navigate('/admin');
      else if (result.user.role === 'seller') navigate('/seller/dashboard');
      else navigate('/');
      return;
    }

    if (!otpSent) {
      sendOtp('SMS', true);
      return;
    }

    if (otp !== demoOtp) {
      toast({ title: 'Invalid OTP', description: `Use demo OTP ${demoOtp}.` });
      return;
    }

    const result = await register({
      email: phoneEmail(),
      password: 'phone_otp_login',
      name: `Buyer ${form.phone.slice(-4)}`,
      role: 'buyer',
      phone: internationalPhone(),
    });

    if (!result.ok) {
      toast({ title: 'Registration failed', description: result.msg });
      return;
    }

    toast({ title: 'Account created', description: 'Your buyer account is ready.' });
    navigate('/');
  };

  return (
    <div className="auth-modal-layer" role="presentation" onMouseDown={() => navigate('/')}>
      <section
        className="auth-modal compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-modal-close" aria-label="Close" onClick={() => navigate('/')}>
          <X className="h-5 w-5" />
        </button>

        {!isRegister ? (
          <>
            <div className="auth-tabs" role="tablist" aria-label="Login method">
              <button type="button" className={loginMode === 'password' ? 'active' : ''} onClick={() => setLoginMode('password')}>
                Password
              </button>
              <button type="button" className={loginMode === 'phone' ? 'active' : ''} onClick={() => setLoginMode('phone')}>
                Phone Number
              </button>
            </div>

            <form onSubmit={submit} className="auth-form refined">
              {loginMode === 'password' ? (
                <>
                  <label className="auth-field">
                    <Mail className="h-4 w-4" />
                    <input value={form.identifier} onChange={update('identifier')} required placeholder="Please enter your Phone or Email" />
                  </label>
                  <label className="auth-field">
                    <Lock className="h-4 w-4" />
                    <input value={form.password} onChange={update('password')} required type={show ? 'text' : 'password'} placeholder="Please enter your password" />
                    <button type="button" aria-label="Toggle password visibility" onClick={() => setShow(!show)}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </label>
                  <button type="button" className="auth-forgot">Forgot password?</button>
                </>
              ) : (
                <>
                  <label className="auth-field">
                    <Phone className="h-4 w-4" />
                    <input
                      value={form.phone}
                      onChange={updatePhone}
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={phPhoneDigits}
                      placeholder="Please enter your phone number"
                    />
                  </label>
                  {otpSent && (
                    <label className="auth-field">
                      <MessageCircle className="h-4 w-4" />
                      <input value={otp} onChange={(event) => setOtp(event.target.value)} required placeholder="Enter OTP code" />
                    </label>
                  )}
                </>
              )}
              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Logging in...' : loginMode === 'phone' && !otpSent ? 'Send OTP' : 'Login'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 id="auth-modal-title" className="auth-title">Sign up</h2>
            <form onSubmit={submit} className="auth-form refined">
              <div className="phone-row">
                <span>PH +63</span>
                <label className="auth-field">
                  <input
                    value={form.phone}
                    onChange={updatePhone}
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={phPhoneDigits}
                    placeholder="Please enter your phone number"
                  />
                </label>
              </div>
              <label className="auth-check">
                <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                <span>By creating and/or using your account, you agree to our <a href="#terms">Terms of Use</a> and <a href="#privacy">Privacy Policy</a>.</span>
              </label>
              {otpSent && (
                <label className="auth-field">
                  <MessageCircle className="h-4 w-4" />
                  <input value={otp} onChange={(event) => setOtp(event.target.value)} required placeholder="Enter OTP code" />
                </label>
              )}
              <button type="button" className="auth-submit" onClick={() => sendOtp('SMS', true)}>Send code via SMS</button>
              <button type="button" className="auth-submit outline" onClick={() => sendOtp('WhatsApp', true)}>Send code via WhatsApp</button>
              {otpSent && <button type="submit" className="auth-submit" disabled={isSubmitting}>Create Buyer Account</button>}
            </form>
          </>
        )}

        <div className="auth-switch-copy">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button type="button" onClick={() => navigate(isRegister ? '/login' : '/register')}>
            {isRegister ? 'Log in Now' : 'Sign up'}
          </button>
        </div>

        <div className="auth-social">
          <span>{isRegister ? 'Or, sign up with' : 'Or, login with'}</span>
          <div>
            <button type="button" onClick={() => socialLogin('Google')} disabled={isSubmitting}>
              <FcGoogle className="social-logo" aria-hidden="true" />
              Google
            </button>
            <button type="button" onClick={() => socialLogin('Facebook')} disabled={isSubmitting}>
              <FaFacebook className="social-logo facebook-logo" aria-hidden="true" />
              Facebook
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthModal;
