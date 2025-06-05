// src/sections/Contact.jsx
import React from 'react';
import { contactInfo } from '../data/contactInfo';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

// Internal ContactForm component to avoid import issues
const ContactForm = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for your inquiry! Our AI strategy team will contact you within 24 hours to discuss your transformation goals.');
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
          <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            Business Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all"
            placeholder="your.email@company.com"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
          Company / Organization *
        </label>
        <input
          type="text"
          id="company"
          name="company"
          required
          value={formData.company}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all"
          placeholder="Your company name"
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
          Project Details & AI Goals *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          value={formData.message}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all resize-none"
          placeholder="Describe your AI transformation goals, current challenges, and how we can help accelerate your business growth..."
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-black text-white py-4 px-6 rounded-none font-medium border border-white hover:bg-white hover:text-black transition-colors duration-300"
      >
        Start Your AI Transformation
      </button>
    </form>
  );
};

// Icons for corresponding contact types
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
    <section id="contact" className="py-20 bg-black">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Ready to Transform Your Business?</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Join industry leaders who trust MIP Technologies to deliver{' '}
            <span className="text-white font-semibold">breakthrough AI solutions</span>.{' '}
            Let's discuss how we can accelerate your competitive advantage.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="space-y-8 animate-on-scroll">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-white">Let's Build the Future Together</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Our AI strategists are ready to explore your transformation opportunities. 
                From initial consultation to full-scale implementation, we're your partners in innovation.
              </p>
            </div>
            
            {contactInfo.map((info, index) => {
              const IconComponent = iconComponents[info.icon];
              
              return (
                <div
                  key={index}
                  className="flex items-start space-x-4 hover:translate-x-2 transition-transform duration-300"
                >
                  <div className="p-3 rounded-none border border-white/50 bg-black/30">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-white">{info.title}</h4>
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-gray-400">{detail}</p>
                    ))}
                  </div>
                </div>
              );
            })}
            
            <div className="bg-black border border-white/20 rounded-none p-6 mt-8">
              <h4 className="font-semibold text-white mb-2">Why Choose MIP Technologies?</h4>
              <ul className="text-gray-400 space-y-2">
                <li>• Proven track record with Fortune 500 companies</li>
                <li>• Average ROI improvement of 300%+ within 12 months</li>
                <li>• End-to-end AI implementation expertise</li>
                <li>• 24/7 enterprise support and monitoring</li>
              </ul>
            </div>
          </div>
          
          <div className="animate-on-scroll" style={{ animationDelay: '100ms' }}>
            <div className="bg-black border border-white/20 rounded-none p-8">
              <h3 className="text-xl font-bold mb-6 text-white">Get Your Free AI Strategy Session</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;