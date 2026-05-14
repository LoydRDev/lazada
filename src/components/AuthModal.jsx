import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, MapPin, MessageCircle, Phone, User, X } from 'lucide-react';
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    identifier: '',
    phone: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    email: '',
    password: '',
    rePassword: '',
    street: '',
    municipality: '',
    city: '',
    postalCode: '',
    mapPin: '',
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

  const update = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const updateName = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value.replace(/[0-9]/g, '') });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const updateMiddleInitial = (event) => {
    setForm({
      ...form,
      middleInitial: event.target.value.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase(),
    });
    if (errors.middleInitial) setErrors({ ...errors, middleInitial: '' });
  };

  const updatePhone = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, phPhoneDigits);
    setForm({ ...form, phone: digitsOnly });
    if (errors.phone) setErrors({ ...errors, phone: '' });
  };

  const normalizedPhone = () => form.phone.replace(/\D/g, '');
  const phoneEmail = () => `ph${normalizedPhone()}@phone.lazada.local`;
  const internationalPhone = () => {
    const phone = normalizedPhone();
    return phone.startsWith('0') ? `+63${phone.slice(1)}` : `+63${phone}`;
  };

  const addressText = () => [form.street, form.municipality, form.city, form.postalCode, 'Philippines']
    .filter(Boolean)
    .join(', ');

  const fillMapPin = () => {
    const query = encodeURIComponent(addressText());
    if (!query) return;
    setForm({ ...form, mapPin: `https://www.google.com/maps/search/?api=1&query=${query}` });
  };

  const validateStepOne = () => {
    const nextErrors = {};
    const namePattern = /^[A-Za-z][A-Za-z\s'.-]{1,49}$/;
    const middlePattern = /^[A-Za-z]?$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!namePattern.test(form.firstName.trim())) nextErrors.firstName = 'Enter a valid first name.';
    if (!middlePattern.test(form.middleInitial.trim())) nextErrors.middleInitial = 'Use one letter only.';
    if (!namePattern.test(form.lastName.trim())) nextErrors.lastName = 'Enter a valid last name.';
    if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (normalizedPhone().length !== phPhoneDigits || !normalizedPhone().startsWith('09')) {
      nextErrors.phone = 'Use an 11-digit PH mobile number starting with 09.';
    }
    if (!passwordPattern.test(form.password)) {
      nextErrors.password = 'Use at least 8 characters with uppercase, lowercase, and number.';
    }
    if (form.rePassword !== form.password) nextErrors.rePassword = 'Passwords do not match.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = () => {
    const nextErrors = {};
    if (form.street.trim().length < 8) nextErrors.street = 'Enter your house number, street, or building.';
    if (form.municipality.trim().length < 2) nextErrors.municipality = 'Enter your municipality.';
    if (form.city.trim().length < 2) nextErrors.city = 'Enter your city.';
    if (!/^\d{4}$/.test(form.postalCode.trim())) nextErrors.postalCode = 'Postal code must be 4 digits.';
    if (!agreed) nextErrors.agreed = 'Please agree to the Terms of Use and Privacy Policy.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToAddressStep = () => {
    if (validateStepOne()) setStep(2);
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

    if (!validateStepTwo()) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    const result = await register({
      email: form.email.trim(),
      password: form.password,
      name: [form.firstName, form.middleInitial, form.lastName].filter(Boolean).join(' '),
      role: 'buyer',
      phone: internationalPhone(),
      firstName: form.firstName.trim(),
      middleInitial: form.middleInitial.trim().toUpperCase(),
      lastName: form.lastName.trim(),
      address: {
        street: form.street.trim(),
        municipality: form.municipality.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: 'Philippines',
        mapPin: form.mapPin.trim() || null,
      },
    });

    if (!result.ok) {
      toast({ title: 'Registration failed', description: result.msg });
      setIsSubmitting(false);
      return;
    }

    toast({ title: 'Account created', description: 'Your buyer account is ready.' });
    await authDelay(1200);
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
              <div className="auth-stepper" aria-label="Registration steps">
                <span className={step === 1 ? 'active' : 'complete'}>1</span>
                <div />
                <span className={step === 2 ? 'active' : ''}>2</span>
              </div>

              {step === 1 ? (
                <>
                  <p className="auth-step-title">Step 1: Personal information</p>
                  <label className={`auth-field ${errors.firstName ? 'invalid' : ''}`}>
                    <User className="h-4 w-4" />
                    <input value={form.firstName} onChange={updateName('firstName')} required placeholder="First Name" autoComplete="given-name" />
                  </label>
                  {errors.firstName && <p className="auth-error">{errors.firstName}</p>}

                  <label className={`auth-field ${errors.middleInitial ? 'invalid' : ''}`}>
                    <User className="h-4 w-4" />
                    <input value={form.middleInitial} onChange={updateMiddleInitial} placeholder="Middle Initial (optional)" maxLength={1} />
                  </label>
                  {errors.middleInitial && <p className="auth-error">{errors.middleInitial}</p>}

                  <label className={`auth-field ${errors.lastName ? 'invalid' : ''}`}>
                    <User className="h-4 w-4" />
                    <input value={form.lastName} onChange={updateName('lastName')} required placeholder="Last Name" autoComplete="family-name" />
                  </label>
                  {errors.lastName && <p className="auth-error">{errors.lastName}</p>}

                  <label className={`auth-field ${errors.email ? 'invalid' : ''}`}>
                    <Mail className="h-4 w-4" />
                    <input value={form.email} onChange={update('email')} required type="email" placeholder="Email Address" autoComplete="email" />
                  </label>
                  {errors.email && <p className="auth-error">{errors.email}</p>}

                  <div className={`phone-row ${errors.phone ? 'invalid' : ''}`}>
                    <span>PH +63</span>
                    <label className="auth-field">
                      <input
                        value={form.phone}
                        onChange={updatePhone}
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={phPhoneDigits}
                        placeholder="Phone number, e.g. 09171234567"
                        autoComplete="tel"
                      />
                    </label>
                  </div>
                  {errors.phone && <p className="auth-error">{errors.phone}</p>}

                  <label className={`auth-field ${errors.password ? 'invalid' : ''}`}>
                    <Lock className="h-4 w-4" />
                    <input value={form.password} onChange={update('password')} required type={show ? 'text' : 'password'} placeholder="Password" autoComplete="new-password" />
                    <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </label>
                  {errors.password && <p className="auth-error">{errors.password}</p>}

                  <label className={`auth-field ${errors.rePassword ? 'invalid' : ''}`}>
                    <Lock className="h-4 w-4" />
                    <input value={form.rePassword} onChange={update('rePassword')} required type={showConfirm ? 'text' : 'password'} placeholder="Re-password" autoComplete="new-password" />
                    <button type="button" aria-label={showConfirm ? 'Hide re-password' : 'Show re-password'} onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </label>
                  {errors.rePassword && <p className="auth-error">{errors.rePassword}</p>}

                  <button type="button" className="auth-submit" onClick={goToAddressStep}>Continue</button>
                </>
              ) : (
                <>
                  <p className="auth-step-title">Step 2: Full address</p>
                  <label className={`auth-field tall ${errors.street ? 'invalid' : ''}`}>
                    <MapPin className="h-4 w-4" />
                    <input value={form.street} onChange={update('street')} required placeholder="House no., street, subdivision, building" autoComplete="street-address" />
                  </label>
                  {errors.street && <p className="auth-error">{errors.street}</p>}

                  <label className={`auth-field ${errors.municipality ? 'invalid' : ''}`}>
                    <MapPin className="h-4 w-4" />
                    <input value={form.municipality} onChange={update('municipality')} required placeholder="Municipality" />
                  </label>
                  {errors.municipality && <p className="auth-error">{errors.municipality}</p>}

                  <label className={`auth-field ${errors.city ? 'invalid' : ''}`}>
                    <MapPin className="h-4 w-4" />
                    <input value={form.city} onChange={update('city')} required placeholder="City" autoComplete="address-level2" />
                  </label>
                  {errors.city && <p className="auth-error">{errors.city}</p>}

                  <label className={`auth-field ${errors.postalCode ? 'invalid' : ''}`}>
                    <MapPin className="h-4 w-4" />
                    <input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value.replace(/\D/g, '').slice(0, 4) })} required inputMode="numeric" maxLength={4} placeholder="Postal code" autoComplete="postal-code" />
                  </label>
                  {errors.postalCode && <p className="auth-error">{errors.postalCode}</p>}

                  <label className="auth-field">
                    <MapPin className="h-4 w-4" />
                    <input value={form.mapPin} onChange={update('mapPin')} placeholder="Map pin link (optional)" />
                    <button type="button" aria-label="Generate map pin from address" onClick={fillMapPin}>
                      Pin
                    </button>
                  </label>

                  <label className="auth-check">
                    <input type="checkbox" checked={agreed} onChange={(event) => {
                      setAgreed(event.target.checked);
                      if (errors.agreed) setErrors({ ...errors, agreed: '' });
                    }} />
                    <span>By creating and/or using your account, you agree to our <a href="#terms">Terms of Use</a> and <a href="#privacy">Privacy Policy</a>.</span>
                  </label>
                  {errors.agreed && <p className="auth-error">{errors.agreed}</p>}

                  <div className="auth-actions-row">
                    <button type="button" className="auth-submit outline" onClick={() => setStep(1)}>Back</button>
                    <button type="submit" className="auth-submit" disabled={isSubmitting}>Create Account</button>
                  </div>
                </>
              )}
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
