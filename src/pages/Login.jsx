import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const Login = () => {
  const { login } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const r = await login(form.email.trim(), form.password);
    if (!r.ok) { toast({ title: 'Login failed', description: r.msg }); return; }
    toast({ title: `Welcome back, ${r.user.name}!`, description: `Logged in as ${r.user.role}` });
    if (r.user.role === 'admin') navigate('/admin');
    else if (r.user.role === 'seller') navigate('/seller/dashboard');
    else navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <span className="laz-logo text-3xl">Lazada</span>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500">Login to your account to continue</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required type="email" placeholder="Email" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required type={show ? 'text' : 'password'} placeholder="Password" className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-gray-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded transition-colors">Login</button>
        </form>

        <div className="mt-4 text-sm text-center text-gray-600">
          New to Lazada? <Link to="/register" className="text-orange-600 font-semibold hover:underline">Sign Up</Link>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <div className="font-semibold text-gray-600 mb-1">Demo accounts:</div>
          <div>Admin: admin@lazada.ph / admin123</div>
          <div>You can register Buyer or Seller accounts.</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
