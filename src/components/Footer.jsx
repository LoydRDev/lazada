import { Link } from 'react-router-dom';

const assetPath = (file) => `/footer;icon_logo/${file}`;

const customerCareLinks = [
  { label: 'Help Center', href: '#care' },
  { label: 'How to Buy', href: '#how-to-buy' },
  { label: 'Shipping & Delivery', href: '#shipping' },
  { label: 'International Product Policy', href: '#international-product-policy' },
  { label: 'How to Return', href: '#returns' },
  { label: 'Question?', href: '#questions' },
  { label: 'Contact Us', href: 'mailto:support@lazada.local' },
];

const lazadaLinks = [
  { label: 'About Lazada', href: '#about-lazada' },
  { label: 'Affiliate Program', href: '#affiliate' },
  { label: 'LAffiliate Academy', href: '#laffiliate-academy' },
  { label: 'Careers', href: '#careers' },
  { label: 'Terms & Conditions', href: '#terms' },
  { label: 'Privacy Policy', href: '#privacy' },
  { label: 'Press & Media', href: '#press' },
  { label: 'Intellectual Property Protection', href: '#ip-protection' },
];

const paymentLogos = [
  { name: 'Lazada Wallet', file: 'TB1a7taR.Y1gK0jSZFCXXcwqXXa-824-305.png', className: 'wallet' },
  { name: 'Visa', file: '92e4b5da-14a4-4f22-a72b-6334933196ff_PH-117-70.png' },
  { name: 'Mastercard', file: '2cd27cdf-a067-4ca6-a117-3a9232b058b3_PH-63-48.png' },
  { name: 'JCB', file: '862b3627-86a5-4d33-a548-2ad2feab3f35_PH-53-39.png' },
  { name: 'American Express', file: 'TB1uQjzOVzqK1RjSZFvXXcB7VXa-225-114.png' },
  { name: 'GCash', file: 'df528871-ca3b-49ae-8338-2f23fc7bdc60_PH-42-42.png' },
  { name: 'Maya', file: 'O1CN014bsNZO1tRKngJTXea_!!6000000005898-2-tps-600-338.png', className: 'maya' },
  { name: 'UnionPay', file: '4bee6c5bbaa934c4d331e500d804e432-89-59.png' },
];

const deliveryLogos = [
  { name: 'Lazada Logistics', file: 'O1CN01RNizk522j2cPtaRjc_!!6000000007155-2-tps-96-70.png' },
  { name: 'J&T Express', file: 'O1CN01md1Up71hMVCAxe2HZ_!!6000000004263-2-tps-96-70.png' },
  { name: 'Flash Express', file: 'O1CN013FblIV1u8qO5VGIBd_!!6000000005993-2-tps-96-70.png' },
  { name: 'XDE Logistics', file: 'O1CN01gH5UI724D6E6K9Pko_!!6000000007356-2-tps-96-70.png' },
  { name: 'J&T Cargo', file: '6105fe68-c6a5-4615-b588-effd8feee3c1_TH-96-70.png' },
  { name: 'Metro Courier Inc.', file: 'e4715f0c-f365-44aa-bdc9-08de28345c0f_PH-96-70.png' },
];

const appBadges = [
  { name: 'Download on the App Store', file: '392fe20d-96d5-4573-956d-396590336135_PH-126-42.png' },
  { name: 'Get it on Google Play', file: '53ad5c74-1b53-4e43-83ce-7ffc0c9ffa4b_PH-126-42.png' },
  { name: 'Explore it on AppGallery', file: 'O1CN01brmkRW21eAmpV4slQ_!!6000000007009-2-tps-126-42.png' },
];

const FooterList = ({ title, links }) => (
  <div>
    <h4>{title}</h4>
    <ul>
      {links.map((item) => (
        <li key={item.label}>
          <a href={item.href}>{item.label}</a>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => (
  <footer className="lazada-footer">
    <div className="lazada-footer-support">
      <div className="lazada-container lazada-footer-support-inner">
        <FooterList title="Customer Care" links={customerCareLinks} />
        <FooterList title="Lazada" links={lazadaLinks} />

        <div className="footer-app-download">
          <img src="/try_our_app/Laz.png" alt="" aria-hidden="true" />
          <div>
            <strong>Always Better</strong>
            <Link to="/#app">Download the App</Link>
          </div>
        </div>

        <div className="footer-app-badges">
          {appBadges.map((badge) => (
            <a href="#app" key={badge.name} aria-label={badge.name}>
              <img src={assetPath(badge.file)} alt={badge.name} />
            </a>
          ))}
        </div>
      </div>
    </div>

    <div className="lazada-footer-logos">
      <div className="lazada-container lazada-footer-logo-grid">
        <section>
          <h4>Payment Methods</h4>
          <div className="footer-image-grid payments">
            {paymentLogos.map((logo) => (
              <img key={logo.name} className={logo.className || ''} src={assetPath(logo.file)} alt={logo.name} />
            ))}
          </div>
        </section>

        <section>
          <h4>Delivery Services</h4>
          <div className="footer-image-grid delivery">
            {deliveryLogos.map((logo) => (
              <img key={logo.name} src={assetPath(logo.file)} alt={logo.name} />
            ))}
          </div>
        </section>
      </div>
    </div>
  </footer>
);

export default Footer;
