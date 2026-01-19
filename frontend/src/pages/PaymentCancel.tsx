import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-300 text-lg">
            Your payment was not completed.
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <p className="text-gray-200">
            Don't worry! Your payment was not processed. You can try again whenever you're ready.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-white/10 text-white font-semibold py-3 px-6 rounded-lg hover:bg-white/20 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
