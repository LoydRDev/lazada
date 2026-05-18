import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, EyeOff, Lock, Mail, MapPin, MessageCircle, Phone, Search, User, X } from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const demoOtp = '123456';
const phPhoneDigits = 11;
const registerDraftKey = 'lazada_register_draft';
const defaultPin = { lat: 14.5995, lng: 120.9842 };
const markerIcon = L.divIcon({
  className: 'registration-map-marker',
  html: '<span></span>',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});
const authDelay = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));

const loadRegisterDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(registerDraftKey) || '{}');
  } catch {
    return {};
  }
};

const saveRegisterDraft = ({ form, agreed, step }) => {
  const safeForm = { ...form };
  delete safeForm.password;
  delete safeForm.rePassword;
  delete safeForm.identifier;
  localStorage.setItem(registerDraftKey, JSON.stringify({ form: safeForm, agreed, step }));
};

const MapClickHandler = ({ onChange }) => {
  useMapEvents({
    click(event) {
      onChange({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
        label: '',
      });
    },
  });
  return null;
};

const MapCenterHandler = ({ pin }) => {
  const map = useMap();

  useEffect(() => {
    if (pin) map.setView(pin, 16);
  }, [map, pin]);

  return null;
};

const RegistrationMapPicker = ({ pin, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const searchAddress = async () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      setSearchError('Type at least 3 characters to search.');
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const params = new URLSearchParams({
        format: 'json',
        addressdetails: '1',
        countrycodes: 'ph',
        limit: '5',
        q: trimmedQuery,
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);

      if (!response.ok) throw new Error('Address search failed');

      const data = await response.json();
      setResults(data);
      if (!data.length) setSearchError('No matching address found. Try a nearby landmark or city.');
    } catch {
      setSearchError('Could not search addresses right now. You can still click the map.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const submitSearchFromKeyboard = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchAddress();
    }
  };

  const chooseResult = (result) => {
    const address = result.address || {};
    const city = address.city || address.town || address.municipality || address.county || address.state || '';
    const municipality = address.municipality || address.town || address.suburb || address.city_district || address.county || city;

    const pinLocation = {
      lat: Number(Number(result.lat).toFixed(6)),
      lng: Number(Number(result.lon).toFixed(6)),
      label: result.display_name,
      city,
      municipality,
      postalCode: address.postcode || '',
    };

    onChange(pinLocation);
    setQuery(result.display_name);
    setResults([]);
    setSearchError('');
  };

  return (
    <div className="registration-map-panel">
      <div className="registration-map-search">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={submitSearchFromKeyboard}
          placeholder="Search your address or nearby landmark"
          autoComplete="street-address"
        />
        <button type="button" onClick={searchAddress} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      {(results.length > 0 || searchError) && (
        <div className="registration-map-results">
          {searchError && <p>{searchError}</p>}
          {results.map((result) => (
            <button type="button" key={result.place_id} onClick={() => chooseResult(result)}>
              {result.display_name}
            </button>
          ))}
        </div>
      )}
      <MapContainer center={pin || defaultPin} zoom={13} scrollWheelZoom={false} className="registration-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        <MapCenterHandler pin={pin} />
        {pin && (
          <Marker
            draggable
            icon={markerIcon}
            position={pin}
            eventHandlers={{
              dragend(event) {
                const nextPin = event.target.getLatLng();
                onChange({
                  lat: Number(nextPin.lat.toFixed(6)),
                  lng: Number(nextPin.lng.toFixed(6)),
                  label: '',
                });
              },
            }}
          />
        )}
      </MapContainer>
      <div className="registration-map-meta">
        <MapPin className="h-4 w-4" />
        <span>{pin ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}` : 'Click the map to pin your delivery location'}</span>
      </div>
    </div>
  );
};

const AuthModal = ({ mode }) => {
  const isRegister = mode === 'register';
  const { login, register } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [initialDraft] = useState(() => (isRegister ? loadRegisterDraft() : {}));
  const [loginMode, setLoginMode] = useState('password');
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(() => Boolean(initialDraft.agreed));
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(() => (initialDraft.step === 2 ? 2 : 1));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(() => {
    return {
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
      latitude: null,
      longitude: null,
      ...(initialDraft.form || {}),
    };
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

  useEffect(() => {
    if (!isRegister) return;
    saveRegisterDraft({ form, agreed, step });
  }, [agreed, form, isRegister, step]);

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

  const mapPin = form.latitude !== null && form.longitude !== null ? { lat: form.latitude, lng: form.longitude } : null;

  const updateMapPin = (pin) => {
    const addressLabel = pin.label || `Pinned location (${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)})`;

    setForm({
      ...form,
      latitude: pin.lat,
      longitude: pin.lng,
      mapPin: `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`,
      street: addressLabel,
      municipality: pin.municipality || 'Pinned on map',
      city: pin.city || 'Pinned on map',
      postalCode: pin.postalCode || '0000',
    });
    if (errors.mapPin) setErrors({ ...errors, mapPin: '' });
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
    if (form.latitude === null || form.longitude === null) nextErrors.mapPin = 'Please pin your delivery location on the map.';
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
        latitude: form.latitude,
        longitude: form.longitude,
        mapPin: form.mapPin.trim(),
      },
    });

    if (!result.ok) {
      toast({ title: 'Registration failed', description: result.msg });
      setIsSubmitting(false);
      return;
    }

    toast({ title: 'Account created', description: 'Your buyer account is ready.' });
    localStorage.removeItem(registerDraftKey);
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
                  <p className="auth-step-title">Step 2: Pin delivery location</p>
                  <RegistrationMapPicker pin={mapPin} onChange={updateMapPin} />
                  {errors.mapPin && <p className="auth-error">{errors.mapPin}</p>}

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
