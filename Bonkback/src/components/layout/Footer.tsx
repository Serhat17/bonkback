import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Legal',
      links: [
        { name: 'Terms & Conditions', href: '/terms' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'Legal Notice', href: '/legal' }
      ]
    },
    {
      title: 'Support',
      links: [
        { name: 'Contact Us', href: '/contact' },
        { name: 'Help Center', href: '/help' },
        { name: 'FAQ', href: '/faq' }
      ]
    },
    {
      title: 'Platform',
      links: [
        { name: 'How it Works', href: '/how-it-works' },
        { name: 'Partners', href: '/partners' },
        { name: 'Blog', href: '/blog' }
      ]
    }
  ];

  return (
    <footer className="bg-card/50 backdrop-blur-xl border-t border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Logo src="/bonkback_images/a294119f-56b0-4f2c-a1dd-b87fbcab7e22.png" alt="BonkBack logo" size={10} variant="bonkback" />
              <span className="text-xl font-bold text-gradient">BonkBack</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              The future of Web3 cashback rewards. Earn BONK tokens with every purchase and convert them to gift cards.
            </p>
            <p className="text-xs text-muted-foreground">
              © {currentYear} BonkBack. All rights reserved.
            </p>
          </div>

          {/* Footer Links */}
          {footerLinks.map((section, index) => (
            <div key={index}>
              <h3 className="font-semibold text-foreground mb-4">{section.title}</h3>
              <ul className="space-y-0.5">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                     <Link
                       to={link.href}
                       className="text-muted-foreground hover:text-primary transition-colors text-sm leading-tight pt-0.5 pb-0 block"
                     >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-muted-foreground">
              Built with ❤️ for the Web3 community
            </div>
            <div className="flex space-x-6">
              <Link
                to="/terms"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/contact"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};