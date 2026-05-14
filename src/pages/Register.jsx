import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Store, ShoppingBag, Upload, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';

const Register = () => {
  const { register } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState('buyer');
  const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '', idDocument: '' });
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (role === 'seller' && (!form.businessName || !form.idDocument)) {
      toast({ title: 'Verification required', description: 'Sellers must provide business name and a legal document filename.' });
      return;
    }
    const r = await register({ ...form, role });
    if (!r.ok) { toast({ title: 'Registration failed', description: r.msg }); return; }
    toast({
      title: `Welcome, ${r.user.name}!`,
      description: role === 'seller' ? 'Your seller account is pending admin verification before you can list products.' : 'Account created successfully.',
    });
    if (role === 'seller') navigate('/seller/dashboard');
    else navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <span className="laz-logo text-3xl">Lazada</span>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Create your account</h1>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button onClick={() => setRole('buyer')} className={`p-3 rounded border-2 flex flex-col items-center gap-1 transition-colors ${role === 'buyer' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <ShoppingBag className={`w-5 h-5 ${role === 'buyer' ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-semibold ${role === 'buyer' ? 'text-orange-600' : 'text-gray-600'}`}>Buyer</span>
          </button>
          <button onClick={() => setRole('seller')} className={`p-3 rounded border-2 flex flex-col items-center gap-1 transition-colors ${role === 'seller' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <Store className={`w-5 h-5 ${role === 'seller' ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-semibold ${role === 'seller' ? 'text-orange-600' : 'text-gray-600'}`}>Seller</span>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Full name" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required type="email" placeholder="Email" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} type={show ? 'text' : 'password'} placeholder="Password (min 6 chars)" className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-gray-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>

          {role === 'seller' && (
            <>
              <div className="relative">
                <Store className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} required placeholder="Business/Store name" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div className="relative">
                <Upload className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input value={form.idDocument} onChange={e => setForm({ ...form, idDocument: e.target.value })} required placeholder="Legal document ID/filename (e.g., DTI-12345)" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 p-3 rounded">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Seller accounts require identity verification. You can browse but cannot list products until an admin approves your account.</span>
              </div>
            </>
          )}

          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded transition-colors">Sign Up</button>
        </form>

        <div className="mt-4 text-sm text-center text-gray-600">
          Already have an account? <Link to="/login" className="text-orange-600 font-semibold hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
