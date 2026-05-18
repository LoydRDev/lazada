import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, HelpCircle, LogOut, ShieldCheck, UploadCloud } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';
import { isGeneratedSellerBusiness, isGeneratedSellerPermit, isGeneratedSellerStore } from '../lib/sellerSetup';

const setupSteps = ['Seller Information', 'Valid ID', 'Store Review'];

const faqItems = [
  'What store name is accepted?',
  'How do I make sure my business name is accepted by Lazada?',
  'What valid IDs are accepted?',
  'How long does seller verification take?',
  'Can I update my seller details later?',
  'What proof of identity is needed for sellers?',
];

const validIdTypes = ['TIN ID', "Driver's License", 'National ID', 'SSS', 'Passport', 'Unified Multi-Purpose ID (UMID)', 'Others'];
const sampleValidId = '/id/O1CN010x4RW91dMjA5xK4rP_!!6000000003722-2-tps-525-336.webp';

const SellerSetup = () => {
  const { user, updateUser, logout } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedId, setUploadedId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({
    storeName: isGeneratedSellerStore(user) ? '' : user?.storeName || '',
    businessName: isGeneratedSellerBusiness(user) ? '' : user?.businessName || '',
    idType: 'TIN ID',
    idName: user?.name || '',
    permitNo: isGeneratedSellerPermit(user) ? '' : user?.idDocument || '',
  });

  const hasErrors = useMemo(() => ({
    storeName: !form.storeName.trim(),
    businessName: !form.businessName.trim(),
    idName: !form.idName.trim(),
    permitNo: !form.permitNo.trim(),
  }), [form]);
  const isValid = !Object.values(hasErrors).some(Boolean);
  const showError = (field) => hasErrors[field] && (submitted || touched[field]);
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const markTouched = (field) => setTouched((current) => ({ ...current, [field]: true }));

  if (!user) {
    return (
      <div className="seller-setup-page">
        <p className="seller-setup-empty">Please log in before completing your seller setup.</p>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    await updateUser({
      role: 'seller',
      verified: false,
      storeName: form.storeName.trim(),
      businessName: form.businessName.trim(),
      idDocument: `${form.idType}: ${form.permitNo.trim()}`,
    });

    toast({ title: 'Valid ID submitted', description: 'Your seller account is now pending admin verification.' });
    navigate('/seller/dashboard');
  };

  const signOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    navigate('/seller/login');
    setIsLoggingOut(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload a clear image of your valid ID.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Valid ID photo must be below 10MB.' });
      return;
    }

    setUploadedId({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    toast({ title: 'Valid ID photo selected', description: file.name });
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div className="seller-setup-page">
      <nav className="seller-setup-nav">
        <button type="button" className="seller-center-brand" onClick={() => navigate('/seller')}>
          <span className="seller-brand-mark">S</span>
          <strong>Lazada<br /><b>Seller Center</b></strong>
        </button>
        <div className="seller-setup-nav-actions">
          <button type="button"><HelpCircle className="h-5 w-5" /> Help</button>
          <button type="button">English <ChevronDown className="h-4 w-4" /></button>
          <button type="button" onClick={signOut} disabled={isLoggingOut}>
            <LogOut className="h-5 w-5" /> {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </nav>

      <main className="seller-setup-shell">
        <section className="seller-setup-main">
          <header className="seller-setup-title">
            <h1>Complete Your Seller Setup</h1>
            <span><ShieldCheck className="h-5 w-5" /> Your account information is secure.</span>
          </header>

          <section className="seller-setup-intro">
            <div className="seller-setup-mascot">S</div>
            <div>
              <h2>Let's start setting up your store!</h2>
              <p>Complete the required seller information from your Seller entity.</p>
            </div>
          </section>

          <form className="seller-setup-card" onSubmit={submit}>
            <h2>Seller Information</h2>
            <p className="seller-setup-muted">These fields map to your Seller record and will be reviewed before your store is activated.</p>

            <div className="seller-setup-grid">
              <label className={showError('storeName') ? 'invalid' : ''}>
                <span>* Store Name</span>
                <input
                  value={form.storeName}
                  onChange={(event) => updateField('storeName', event.target.value)}
                  onBlur={() => markTouched('storeName')}
                  placeholder="Example: Rey's Lazada Store"
                />
                {showError('storeName') && <small>Required Field</small>}
              </label>
              <label className={showError('businessName') ? 'invalid' : ''}>
                <span>* Business Name</span>
                <input
                  value={form.businessName}
                  onChange={(event) => updateField('businessName', event.target.value)}
                  onBlur={() => markTouched('businessName')}
                  placeholder="Registered business or owner name"
                />
                {showError('businessName') && <small>Required Field</small>}
              </label>
            </div>

            <section className="seller-valid-id-type">
              <h2>Submit a Valid ID</h2>
              <span>* Verify Valid ID (Must match uploaded photo)</span>
              <div>
                {validIdTypes.map((idType) => (
                  <label key={idType}>
                    <input
                      type="radio"
                      name="validIdType"
                      checked={form.idType === idType}
                      onChange={() => updateField('idType', idType)}
                    />
                    {idType}
                  </label>
                ))}
              </div>
            </section>

            <section className="seller-upload-sample">
              <div>
                <h3>Photo of Valid ID</h3>
                <button
                  type="button"
                  className={`seller-upload-box ${isDragging ? 'dragging' : ''} ${uploadedId ? 'has-file' : ''}`}
                  onClick={openFilePicker}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  {uploadedId ? (
                    <>
                      <img src={uploadedId.previewUrl} alt="Uploaded valid ID preview" />
                      <span>{uploadedId.file.name}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-12 w-12" />
                      <span>Drag or Click to Upload</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
              <div className="seller-document-preview">
                <img src={sampleValidId} alt="Sample valid ID" />
              </div>
              <p>Upload an official and valid ID photo. Must be clear, readable, and below 10MB.</p>
            </section>

            <section className="seller-valid-id-verify">
              <h2>Verify Valid ID (Must match uploaded photo)</h2>
              <label className={showError('idName') ? 'invalid' : ''}>
                <span>* Full Name on ID</span>
                <input
                  value={form.idName}
                  onChange={(event) => updateField('idName', event.target.value)}
                  onBlur={() => markTouched('idName')}
                  placeholder="Full Name"
                />
                {showError('idName') && <small>Required Field</small>}
              </label>
              <label className={showError('permitNo') ? 'invalid' : ''}>
                <span>* ID Number</span>
                <input
                  value={form.permitNo}
                  onChange={(event) => updateField('permitNo', event.target.value)}
                  onBlur={() => markTouched('permitNo')}
                  placeholder="ID Number"
                />
                {showError('permitNo') && <small>Required Field</small>}
              </label>
            </section>

            <div className="seller-setup-sticky">
              <p>By clicking "Submit", I authorize Lazada E-Services Philippines, Inc. to review the seller information provided under my account.</p>
              <div>
                <button type="button" onClick={() => toast({ title: 'Draft saved', description: 'Your setup details are kept on this page.' })}>Save Draft</button>
                <button type="submit" disabled={!isValid || isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          </form>
        </section>

        <aside className="seller-setup-side">
          <div className="seller-setup-progress">
            {setupSteps.map((step, index) => (
              <div key={step}>
                <span className={index === 0 ? 'active' : ''}>{index === 0 ? <Check className="h-4 w-4" /> : index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>

          <section className="seller-setup-faq">
            <h2>FAQ</h2>
            {faqItems.map((item, index) => <a href="#help" key={item}>{index + 1}. {item}</a>)}
            <p>For more information, please click <a href="#help">here</a>.</p>
          </section>
        </aside>
      </main>
    </div>
  );
};

export default SellerSetup;
