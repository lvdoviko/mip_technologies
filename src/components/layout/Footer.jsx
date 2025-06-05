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
        { href: "#solutions", label: "AI Transformation" },
        { href: "#solutions", label: "Intelligent Applications" },
        { href: "#solutions", label: "Custom AI Models" },
        { href: "#methodology", label: "Strategic Consulting" }
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
    <footer className="bg-black text-white py-12 border-t border-white/5">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="animate-on-scroll">
            {/* Updated logo layout similar to header */}
            <div className="flex items-center mb-4">
              <Logo variant="dark" />
              <div className="flex flex-col justify-center -ml-1">
                <span className="text-xl font-bold text-white leading-tight">
                  MIP
                </span>
                <span className="text-sm font-bold text-gradient bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent -mt-1">
                  TECHNOLOGIES
                </span>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Pioneering the future through artificial intelligence, creating breakthrough solutions that transform businesses and drive sustainable growth.
            </p>
          </div>
          
          {footerSections.map((section, index) => (
            <div
              key={index}
              className={`animate-on-scroll`}
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <h4 className="text-lg font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2 text-gray-400">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href} 
                      className="hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className="animate-on-scroll" style={{ animationDelay: '300ms' }}>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-gray-400">
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                hello@miptechnologies.com
              </p>
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +1 (555) 123-4567
              </p>
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                1000 Innovation Drive, San Francisco
              </p>
            </div>
          </div>
        </div>
        
        <div
          className="border-t border-gray-700/30 mt-12 pt-8 text-center text-gray-400 animate-on-scroll"
          style={{ animationDelay: '500ms' }}
        >
          <p>© {new Date().getFullYear()} MIP Technologies Ltd. All rights reserved. Transforming business through intelligent innovation.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;