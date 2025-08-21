import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SeawaterCognitoAuth } from '../auth/cognito';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'register' | 'verify' | 'success'>('register');
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Map userType to intended_use
      const intendedUseMap: { [key: string]: string } = {
        'homebuyer': 'personal',
        'agent': 'business',
        'insurance': 'business',
        'investor': 'business',
        'other': 'personal'
      };

      const result = await SeawaterCognitoAuth.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        intended_use: intendedUseMap[userType] || 'personal',
        referral_source: 'direct'
      });

      if (result.success && result.username) {
        setUsername(result.username);
        setStep('verify');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await SeawaterCognitoAuth.confirmRegistration(username, verificationCode);
      
      if (result.success) {
        setStep('success');
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await SeawaterCognitoAuth.resendConfirmationCode(username);
      
      if (result.success) {
        setError(''); // Clear any previous errors
        alert('Verification code sent! Please check your email.');
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Registration Step
  const renderRegistrationStep = () => (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Trial Benefits Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-center">
          <span className="text-blue-600 text-xl mr-3">🎯</span>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Get Your Free Climate Risk Report</h3>
            <p className="text-xs text-blue-700">Start with 1 free comprehensive property assessment</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first-name" className="sr-only">First name</label>
            <input
              id="first-name"
              name="firstName"
              type="text"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="last-name" className="sr-only">Last name</label>
            <input
              id="last-name"
              name="lastName"
              type="text"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="email-address" className="sr-only">Email address</label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div>
          <select
            id="user-type"
            name="userType"
            required
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
          >
            <option value="">I am a...</option>
            <option value="homebuyer">🏠 Home Buyer</option>
            <option value="agent">🏢 Real Estate Agent</option>
            <option value="insurance">🛡️ Insurance Professional</option>
            <option value="investor">💼 Real Estate Investor</option>
            <option value="other">👤 Other</option>
          </select>
        </div>

        {/* Marketing Consent */}
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-start">
            <input
              id="marketing-consent"
              name="marketingConsent"
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
            />
            <label htmlFor="marketing-consent" className="ml-3 text-sm text-gray-700">
              <span className="font-medium">Stay informed about climate risks</span>
              <br />
              <span className="text-xs text-gray-500">
                Receive helpful climate insights, platform updates, and tips for protecting your properties. 
                You can unsubscribe anytime.
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating your account...
            </span>
          ) : (
            'Get My Free Climate Risk Report'
          )}
        </button>
      </div>
      
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>
          By signing up, you agree to our{' '}
          <Link to="/terms" className="text-blue-600 hover:text-blue-500">Terms of Service</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-blue-600 hover:text-blue-500">Privacy Policy</Link>
        </p>
        <p className="text-gray-400">Free trial • No credit card required • Instant access</p>
      </div>
    </form>
  );

  // Email Verification Step
  const renderVerificationStep = () => (
    <form className="mt-8 space-y-6" onSubmit={handleVerification}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex items-center">
          <span className="text-green-600 text-xl mr-3">📧</span>
          <div>
            <h3 className="text-sm font-semibold text-green-900">Check Your Email</h3>
            <p className="text-xs text-green-700">
              We sent a verification code to <strong>{email}</strong>
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
          Enter verification code
        </label>
        <input
          id="verification-code"
          name="verificationCode"
          type="text"
          required
          className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-widest"
          placeholder="000000"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
        />
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading || verificationCode.length !== 6}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Email & Start Trial'}
        </button>

        <button
          type="button"
          onClick={handleResendCode}
          disabled={loading}
          className="w-full text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
        >
          Didn't receive the code? Resend
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        <p>Check your spam folder if you don't see the email</p>
      </div>
    </form>
  );

  // Success Step
  const renderSuccessStep = () => (
    <div className="mt-8 text-center space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-md p-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">🎉</span>
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">Welcome to Seawater!</h3>
        <p className="text-sm text-green-700">
          Your account has been verified successfully. You now have access to your free climate risk assessment.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">What's Next?</h4>
        <ul className="text-xs text-blue-700 space-y-1 text-left">
          <li>• Search for any US property address</li>
          <li>• Get comprehensive climate risk analysis</li>
          <li>• Explore flood, wildfire, and extreme weather risks</li>
          <li>• Upgrade for unlimited reports and premium data</li>
        </ul>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Sign In & Start Your Assessment
        </button>
        
        <p className="text-xs text-gray-500">
          Redirecting to login in a few seconds...
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <span className="text-4xl">🌊</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {step === 'register' && 'Join Seawater'}
            {step === 'verify' && 'Verify Your Email'}
            {step === 'success' && 'Account Created!'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'register' && (
              <>
                Or{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  sign in to your existing account
                </Link>
              </>
            )}
            {step === 'verify' && 'We need to verify your email address to activate your free trial'}
            {step === 'success' && 'Your free climate risk assessment is ready!'}
          </p>
        </div>

        {step === 'register' && renderRegistrationStep()}
        {step === 'verify' && renderVerificationStep()}
        {step === 'success' && renderSuccessStep()}
      </div>
    </div>
  );
};

export default Register;