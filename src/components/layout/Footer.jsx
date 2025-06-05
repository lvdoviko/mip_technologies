// src/components/layout/Footer.jsx
import React from 'react';
import Logo from '../ui/Logo';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

const Footer = () => {
  useScrollAnimation();

  const footerSections = [
    {
      title: "Solutions",
      links: [
        { href: "#solutions", label: "AI Integration" },
        { href: "#solutions", label: "Web Applications" },
        { href: "#solutions", label: "Custom AI Models" },
        { href: "#methodology", label: "Consulting" }
      ]
    },
    {
      title: "Company",
      links: [
        { href: "#company", label: "About Us" },
        { href: "#case-studies", label: "Case Studies" },
        { href: "#methodology", label: "Methodology" },
        { href: "#contact", label: "Get Started" }
      ]
    }
  ];

  return (
    <footer className="bg-black text-white py-16 border-t border-white/10">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          <div className="animate-on-scroll">
            {/* Professional brand layout matching navigation */}
            <div className="flex items-center gap-4 mb-6">
              <Logo variant="dark" size="lg" className="mr-0" />
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white tracking-tight">
                  MIP
                </span>
                <span className="text-base font-medium text-gray-400 tracking-wide uppercase">
                  Technologies
                </span>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed text-base max-w-sm">
              Building smarter web solutions through artificial intelligence. 
              We make intelligent technology accessible and practical for modern businesses.
            </p>
          </div>
          
          {footerSections.map((section, index) => (
            <div
              key={index}
              className={`animate-on-scroll`}
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <h4 className="text-lg font-bold mb-6 text-white">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href} 
                      className="text-gray-400 hover:text-white transition-colors duration-200 text-base"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className="animate-on-scroll" style={{ animationDelay: '300ms' }}>
            <h4 className="text-lg font-bold mb-6 text-white">Contact</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-white font-medium text-base">hello@miptechnologies.com</p>
                  <p className="text-gray-400 text-sm">General inquiries</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-white font-medium text-base">San Francisco, CA</p>
                  <p className="text-gray-400 text-sm">United States</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div
          className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 animate-on-scroll"
          style={{ animationDelay: '500ms' }}
        >
          <p className="text-gray-400 text-base">
            © {new Date().getFullYear()} MIP Technologies. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;