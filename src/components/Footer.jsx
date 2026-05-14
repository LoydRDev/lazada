import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaMobileScreen } from 'react-icons/fa6';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-10">
      <div className="max-w-[1400px] mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Customer Care</h4>
          <ul className="space-y-2 text-gray-600">
            <li>Help Center</li><li>How to Buy</li><li>Returns &amp; Refunds</li><li>Contact Us</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Make Money With Us</h4>
          <ul className="space-y-2 text-gray-600">
            <li>Sell on Lazada</li><li>Join Affiliate Program</li><li>Lazada Global</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Payment Methods</h4>
          <div className="flex flex-wrap gap-2">
            {['Visa','Master','GCash','Maya','COD','BPI'].map(p => (
              <span key={p} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600">{p}</span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Delivery Services</h4>
          <div className="flex flex-wrap gap-2">
            {['LEX','J&T','LBC','Flash','Ninja Van'].map(d => (
              <span key={d} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600">{d}</span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Keep in Touch</h4>
          <div className="flex gap-3 text-gray-500">
            <FaFacebook className="w-5 h-5 hover:text-blue-600 cursor-pointer" />
            <FaTwitter className="w-5 h-5 hover:text-sky-500 cursor-pointer" />
            <FaInstagram className="w-5 h-5 hover:text-pink-600 cursor-pointer" />
            <FaYoutube className="w-5 h-5 hover:text-red-600 cursor-pointer" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-gray-600">
            <FaMobileScreen className="w-4 h-4" />
            <span>Download Lazada App</span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Lazada Philippines Clone · Built for educational purposes
      </div>
    </footer>
  );
};

export default Footer;
