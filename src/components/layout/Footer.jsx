// src/components/layout/Footer.jsx
import React from 'react';
import Logo from '../ui/Logo';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

const Footer = () => {
  useScrollAnimation();

  const footerSections = [
    {
      title: "Servizi",
      links: [
        { href: "#servizi", label: "Implementazione AI" },
        { href: "#servizi", label: "Sviluppo Webapp" },
        { href: "#servizi", label: "Modelli Personalizzati" },
        { href: "#processo", label: "Consulenza" }
      ]
    },
    {
      title: "Azienda",
      links: [
        { href: "#chi-siamo", label: "Chi Siamo" },
        { href: "#progetti", label: "Progetti" },
        { href: "#processo", label: "Processo" },
        { href: "#contatti", label: "Contatti" }
      ]
    }
  ];

  return (
    <footer className="bg-dark text-white py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="animate-on-scroll">
            <div className="flex items-center mb-4">
              <Logo variant="dark" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                MIP TECHNOLOGIES
              </h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Trasformiamo il futuro attraverso l'intelligenza artificiale, creando soluzioni innovative per il tuo business.
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
                      className="hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className="animate-on-scroll" style={{ animationDelay: '300ms' }}>
            <h4 className="text-lg font-semibold mb-4">Contatti</h4>
            <div className="space-y-2 text-gray-400">
              <p>📧 info@miptechnologies.com</p>
              <p>📞 +39 02 1234 5678</p>
              <p>📍 Via Innovation 123, Milano</p>
            </div>
          </div>
        </div>
        
        <div
          className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400 animate-on-scroll"
          style={{ animationDelay: '500ms' }}
        >
          <p>© {new Date().getFullYear()} MIP Technologies Ltd. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;