
import React from 'react';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpsellModal: React.FC<UpsellModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-surface border border-white/10 rounded-lg shadow-2xl w-full max-w-md text-white text-center p-8">
        <h2 className="text-2xl font-bold font-oswald text-white mb-3">Unlock Unlimited Creativity</h2>
        <p className="text-white/70 mb-6">
          You've reached your free tier limit (1 Project and 8 Images). Subscribe today to unlock unlimited projects, unlimited image generations, and premium features.
        </p>
        <div className="space-y-3">
          <a
            href="https://buy.stripe.com/28EfZg0ZF7ms9HJ30qgMw07"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-6 py-3 bg-accent text-white font-bold rounded-md hover:bg-accent/90 transition-colors"
          >
            Go Premium Monthly ($9.99/mo)
          </a>
          <a
            href="https://billing.stripe.com/p/login/dRm14mcIneOUdXZasSgMw00"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-sm text-white/60 hover:text-white underline"
          >
            Manage My Subscription
          </a>
        </div>
        <button
          onClick={onClose}
          className="mt-6 text-sm text-white/50 hover:text-white/80"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default UpsellModal;
