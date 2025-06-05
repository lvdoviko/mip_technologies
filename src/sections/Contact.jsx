// src/sections/Contact.jsx
import React, { useState } from 'react';
import { contactInfo } from '../data/contactInfo';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import DescriptedText from '../components/ui/DescriptedText';

// Internal ContactForm component to avoid import issues
const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Invia il form a Formspree
      // Sostituisci "YOUR_FORMSPREE_ID" con il tuo ID Formspree
      const response = await fetch('https://formspree.io/f/mqabajwv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          message: formData.message,
          _subject: `New Contact from ${formData.name}` // Personalizza l'oggetto dell'email
        })
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', company: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
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
            Your Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all"
            placeholder="Your name"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all"
            placeholder="your@email.com"
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
          Company (Optional)
        </label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all"
          placeholder="Your company name"
          disabled={isSubmitting}
        />
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
          Tell Us About Your Project *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          value={formData.message}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-black border border-white/50 rounded-none focus:border-white text-white placeholder-gray-500 transition-all resize-none"
          placeholder="What kind of AI features or web application are you looking to build? Tell us about your goals and any specific requirements..."
          disabled={isSubmitting}
        />
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-4 px-6 rounded-none font-medium border transition-colors duration-300 ${
          isSubmitting 
            ? 'bg-gray-800 text-gray-400 border-gray-600 cursor-not-allowed' 
            : 'bg-black text-white border-white hover:bg-white hover:text-black'
        }`}
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
      
      {submitStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-500/50 text-green-400 rounded-none">
          Thank you for your message! We'll get back to you within 1-2 business days.
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-none">
          There was an error sending your message. Please try again or contact us directly at infomiptechnologies@gmail.com
        </div>
      )}
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Let's Build Something Great</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            <DescriptedText
              text="Have an idea for an AI-powered web application? Want to add intelligent features to your existing site?"
              className="text-gray-400"
              encryptedClassName="text-gray-600"
              animateOn="view"
              sequential={true}
              speed={20}
              maxIterations={15}
            />{' '}
            <span className="text-white font-semibold">Let's talk about what we can create together</span>.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="space-y-8 animate-on-scroll">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-white">Ready to Start Your Project?</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                <DescriptedText
                  text="We love working with businesses who want to explore what's possible with AI. Whether you have a clear vision or just an interesting problem to solve, we're here to help make it happen."
                  className="text-gray-400"
                  encryptedClassName="text-gray-600"
                  animateOn="view"
                  sequential={true}
                  speed={20}
                  maxIterations={15}
                />
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
              <h4 className="font-semibold text-white mb-2">What We Bring to Your Project</h4>
              <ul className="text-gray-400 space-y-2">
                <li>• <DescriptedText text="Fresh perspective on AI integration" className="text-gray-400" animateOn="view" sequential={true} speed={15} /></li>
                <li>• <DescriptedText text="Modern development practices and clean code" className="text-gray-400" animateOn="view" sequential={true} speed={15} /></li>
                <li>• <DescriptedText text="Direct communication throughout the project" className="text-gray-400" animateOn="view" sequential={true} speed={15} /></li>
                <li>• <DescriptedText text="Focus on practical, user-friendly solutions" className="text-gray-400" animateOn="view" sequential={true} speed={15} /></li>
              </ul>
            </div>
          </div>
          
          <div className="animate-on-scroll" style={{ animationDelay: '100ms' }}>
            <div className="bg-black border border-white/20 rounded-none p-8">
              <h3 className="text-xl font-bold mb-6 text-white">Tell Us About Your Project</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;