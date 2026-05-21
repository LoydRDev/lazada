import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const DriverLogin = () => {
  const { login } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const result = await login(form.identifier.trim(), form.password, { allowedRoles: ['driver'] });
    setIsSubmitting(false);
    if (!result.ok) {
      toast({ title: 'Driver login failed', description: result.msg });
      return;
    }
    toast({ title: 'Welcome to Driver Center', description: `Logged in as ${result.user.name}.` });
    navigate('/driver/dashboard');
  };

  return (
    <div className="admin-dashboard flex items-center justify-center p-6">
      <form className="bg-white rounded-lg p-6 shadow-sm w-full max-w-md" onSubmit={submit}>
        <div className="flex items-center gap-3 mb-5">
          <div className="admin-stat-icon blue"><Truck className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Driver Center Login</h1>
            <p className="text-sm text-gray-500">Use a driver account to manage assigned deliveries.</p>
          </div>
        </div>
        <label className="auth-field mb-3">
          <Mail className="h-4 w-4" />
          <input required value={form.identifier} onChange={event => setForm({ ...form, identifier: event.target.value })} placeholder="Driver email or phone" />
        </label>
        <label className="auth-field mb-4">
          <Lock className="h-4 w-4" />
          <input required type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Password" />
        </label>
        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login as Driver'}
        </button>
      </form>
    </div>
  );
};

export default DriverLogin;
