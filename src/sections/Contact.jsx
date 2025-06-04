// src/sections/Contact.jsx
import React from 'react';
import { contactInfo } from '../data/contactInfo';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

// Componente ContactForm interno per evitare problemi di importazione
const ContactForm = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Grazie per il tuo messaggio! Ti contatteremo presto.');
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Nome *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="Il tuo nome"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="La tua email"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
          Azienda
        </label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          placeholder="Nome della tua azienda"
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Messaggio *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          value={formData.message}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          placeholder="Descrivi il tuo progetto o le tue esigenze..."
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-primary text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 transform hover:-translate-y-1 hover:shadow-lg"
      >
        Invia Messaggio
      </button>
    </form>
  );
};

// Icone per i componenti corrispondenti ai tipi di contatto
const iconComponents = {
  mail: Mail,
  phone: Phone,
  'map-pin': MapPin,
  clock: Clock,
};

const Contact = () => {
  const useScrollAnimation = () => {
    React.useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );

      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }, []);
  };

  useScrollAnimation();
  
  return (
    <section id="contatti" className="py-20 bg-white">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Iniziamo Insieme</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Hai un progetto in mente? Contattaci per una consulenza gratuita e scopri come l'AI può trasformare il tuo business
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="space-y-8 animate-on-scroll">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-dark">Informazioni di Contatto</h3>
            </div>
            
            {contactInfo.map((info, index) => {
              const IconComponent = iconComponents[info.icon];
              
              return (
                <div
                  key={index}
                  className="flex items-start space-x-4 hover:translate-x-2 transition-transform duration-300"
                >
                  <div className="p-3 rounded-lg bg-primary/10">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-dark">{info.title}</h4>
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-gray-600">{detail}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="animate-on-scroll" style={{ animationDelay: '100ms' }}>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;