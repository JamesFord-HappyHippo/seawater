// Seawater Cognito Authentication Service
// Adapted from HoneyDo patterns for climate risk platform
import { 
  CognitoUser, 
  AuthenticationDetails, 
  CognitoUserSession,
  CognitoUserAttribute 
} from 'amazon-cognito-identity-js';
import { seawaterUserPool } from './userPool';
import { seawaterApiClient, SubscriptionTier } from '../api/seawaterApiClient';

export interface SeawaterAuthResult {
  success: boolean;
  user?: CognitoUser;
  session?: CognitoUserSession;
  jwt?: string;
  username?: string;
  subscription_tier?: SubscriptionTier;
  usage_info?: {
    monthly_assessments_used: number;
    monthly_assessments_limit: number;
    api_calls_used: number;
    api_calls_limit: number;
  };
  error?: string;
}

export interface SeawaterRegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company?: string;
  phone?: string;
  intended_use: 'personal' | 'business' | 'research';
  referral_source?: string;
}

export class SeawaterCognitoAuth {
  // Register new user for Seawater platform
  static async register(data: SeawaterRegisterData): Promise<SeawaterAuthResult> {
    try {
      const { email, password } = data;
      
      // Store email in Cognito - other data goes to Seawater backend
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email })
      ];

      return new Promise((resolve) => {
        // Generate a unique username since email is used as alias
        const username = `seawater_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        seawaterUserPool.signUp(username, password, attributes, [], async (error, result) => {
          if (error) {
            console.error('Seawater registration failed:', error);
            resolve({ 
              success: false, 
              error: error.message || 'Registration failed' 
            });
            return;
          }

          if (result?.user) {
            // After successful Cognito registration, create user profile in Seawater backend
            try {
              await seawaterApiClient.updateUserProfile({
                first_name: data.first_name,
                last_name: data.last_name,
                company: data.company,
                phone: data.phone,
                preferences: {
                  intended_use: data.intended_use,
                  referral_source: data.referral_source,
                  email_notifications: true,
                  marketing_emails: false
                }
              });
            } catch (profileError) {
              console.warn('Failed to create Seawater user profile:', profileError);
              // Don't fail registration if profile creation fails
            }

            resolve({ 
              success: true, 
              user: result.user,
              username: username
            });
          } else {
            resolve({ 
              success: false, 
              error: 'Registration failed - no user returned' 
            });
          }
        });
      });
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  // Confirm registration with verification code
  static async confirmRegistration(username: string, code: string): Promise<SeawaterAuthResult> {
    try {
      const user = new CognitoUser({
        Username: username,
        Pool: seawaterUserPool
      });

      return new Promise((resolve) => {
        user.confirmRegistration(code, true, (error, result) => {
          if (error) {
            console.error('Seawater confirmation failed:', error);
            let errorMessage = 'Verification failed';
            
            switch (error?.code) {
              case 'ExpiredCodeException':
                errorMessage = 'Verification code has expired. Please request a new code.';
                break;
              case 'InvalidParameterException':
              case 'CodeMismatchException':
                errorMessage = 'Invalid verification code. Please check and try again.';
                break;
              case 'NotAuthorizedException':
                errorMessage = 'User is already confirmed or code is invalid.';
                break;
              default:
                errorMessage = error.message || 'Verification failed';
            }
            
            resolve({ 
              success: false, 
              error: errorMessage 
            });
            return;
          }

          resolve({ 
            success: true,
            user
          });
        });
      });
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Verification failed' 
      };
    }
  }

  // Resend verification code
  static async resendConfirmationCode(username: string): Promise<SeawaterAuthResult> {
    try {
      const user = new CognitoUser({
        Username: username,
        Pool: seawaterUserPool
      });

      return new Promise((resolve) => {
        user.resendConfirmationCode((error, result) => {
          if (error) {
            console.error('Seawater resend failed:', error);
            resolve({ 
              success: false, 
              error: error.message || 'Failed to resend code' 
            });
            return;
          }

          resolve({ 
            success: true
          });
        });
      });
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resend code' 
      };
    }
  }

  // Login user to Seawater platform
  static async login(email: string, password: string): Promise<SeawaterAuthResult> {
    try {
      const user = new CognitoUser({
        Username: email,
        Pool: seawaterUserPool
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      return new Promise((resolve) => {
        user.authenticateUser(authDetails, {
          onSuccess: async (session: CognitoUserSession) => {
            const jwt = session.getIdToken().getJwtToken();
            const userId = session.getIdToken().payload.sub;
            
            // Store tokens with Seawater prefix
            localStorage.setItem('seawater_token', jwt);
            localStorage.setItem('seawater_user_id', userId);
            localStorage.setItem('honeydo_token', jwt); // For API compatibility
            
            try {
              // Get user profile and subscription info from Seawater backend
              const [profileResponse, subscriptionResponse, usageResponse] = await Promise.all([
                seawaterApiClient.getUserProfile(),
                seawaterApiClient.getCurrentSubscription(),
                seawaterApiClient.getUsageStats()
              ]);

              let subscriptionTier: SubscriptionTier = 'free';
              let usageInfo = undefined;

              if (subscriptionResponse.success) {
                subscriptionTier = subscriptionResponse.data?.tier || 'free';
                localStorage.setItem('seawater_user_tier', subscriptionTier);
              }

              if (usageResponse.success) {
                usageInfo = usageResponse.data;
              }

              resolve({
                success: true,
                user,
                session,
                jwt,
                subscription_tier: subscriptionTier,
                usage_info: usageInfo
              });
            } catch (backendError) {
              console.warn('Failed to fetch user data from Seawater backend:', backendError);
              // Still return success for login, just without backend data
              resolve({
                success: true,
                user,
                session,
                jwt,
                subscription_tier: 'free'
              });
            }
          },
          onFailure: (error: any) => {
            console.error('Seawater login failed:', error);
            let errorMessage = 'Login failed';
            
            switch (error?.code) {
              case 'NotAuthorizedException':
                errorMessage = 'Incorrect email or password';
                break;
              case 'UserNotFoundException':
                errorMessage = 'User does not exist';
                break;
              case 'UserNotConfirmedException':
                errorMessage = 'Please confirm your email address first';
                break;
              default:
                errorMessage = error.message || 'Login failed';
            }
            
            resolve({ 
              success: false, 
              error: errorMessage 
            });
          }
        });
      });
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  // Get current session with Seawater user data
  static async getCurrentSession(): Promise<SeawaterAuthResult> {
    const currentUser = seawaterUserPool.getCurrentUser();
    
    if (!currentUser) {
      return { success: false, error: 'No current user' };
    }

    return new Promise((resolve) => {
      currentUser.getSession(async (error: any, session: CognitoUserSession) => {
        if (error || !session || !session.isValid()) {
          this.logout();
          resolve({ success: false, error: 'Invalid session' });
          return;
        }

        const jwt = session.getIdToken().getJwtToken();
        const userId = session.getIdToken().payload.sub;
        
        localStorage.setItem('seawater_token', jwt);
        localStorage.setItem('seawater_user_id', userId);
        localStorage.setItem('honeydo_token', jwt); // For API compatibility
        
        try {
          // Refresh user data from Seawater backend
          const [subscriptionResponse, usageResponse] = await Promise.all([
            seawaterApiClient.getCurrentSubscription(),
            seawaterApiClient.getUsageStats()
          ]);

          let subscriptionTier: SubscriptionTier = 'free';
          let usageInfo = undefined;

          if (subscriptionResponse.success) {
            subscriptionTier = subscriptionResponse.data?.tier || 'free';
            localStorage.setItem('seawater_user_tier', subscriptionTier);
          }

          if (usageResponse.success) {
            usageInfo = usageResponse.data;
          }

          resolve({
            success: true,
            user: currentUser,
            session,
            jwt,
            subscription_tier: subscriptionTier,
            usage_info: usageInfo
          });
        } catch (backendError) {
          console.warn('Failed to refresh Seawater user data:', backendError);
          // Still return success for session, just without backend data
          resolve({
            success: true,
            user: currentUser,
            session,
            jwt,
            subscription_tier: localStorage.getItem('seawater_user_tier') as SubscriptionTier || 'free'
          });
        }
      });
    });
  }

  // Logout from Seawater platform
  static logout(): void {
    const currentUser = seawaterUserPool.getCurrentUser();
    
    if (currentUser) {
      currentUser.signOut();
    }
    
    // Clear Seawater tokens
    localStorage.removeItem('seawater_token');
    localStorage.removeItem('seawater_user_id');
    localStorage.removeItem('seawater_user_tier');
    localStorage.removeItem('honeydo_token'); // Clear compatibility token
  }

  // Check if authenticated to Seawater platform
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('seawater_token');
  }

  // Get stored Seawater token
  static getToken(): string | null {
    return localStorage.getItem('seawater_token');
  }

  // Get current subscription tier
  static getSubscriptionTier(): SubscriptionTier {
    return localStorage.getItem('seawater_user_tier') as SubscriptionTier || 'free';
  }

  // Check if user can make more assessments
  static async canMakeAssessment(): Promise<{
    canMake: boolean;
    remaining: number;
    limit: number;
    resetDate?: Date;
  }> {
    try {
      const usageCheck = await seawaterApiClient.checkUsageLimits();
      const usageResponse = await seawaterApiClient.getUsageStats();
      
      let monthlyUsed = 0;
      if (usageResponse.success) {
        monthlyUsed = usageResponse.data?.monthly_assessments_used || 0;
      }
      
      return {
        canMake: usageCheck.canMakeRequest,
        remaining: usageCheck.remaining,
        limit: usageCheck.remaining + monthlyUsed,
        resetDate: usageCheck.resetDate
      };
    } catch (error) {
      console.error('Error checking assessment limits:', error);
      return { canMake: true, remaining: 0, limit: 0 };
    }
  }

  // Forgot password - initiate reset
  static async forgotPassword(email: string): Promise<SeawaterAuthResult> {
    try {
      const user = new CognitoUser({
        Username: email,
        Pool: seawaterUserPool
      });

      return new Promise((resolve) => {
        user.forgotPassword({
          onSuccess: () => {
            resolve({ 
              success: true 
            });
          },
          onFailure: (error: any) => {
            console.error('Seawater forgot password failed:', error);
            resolve({ 
              success: false, 
              error: error.message || 'Failed to initiate password reset' 
            });
          },
          inputVerificationCode: () => {
            // This callback is called when code needs to be entered
            resolve({ 
              success: true 
            });
          }
        });
      });
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initiate password reset' 
      };
    }
  }

  // Confirm new password with reset code
  static async confirmPassword(email: string, code: string, newPassword: string): Promise<SeawaterAuthResult> {
    try {
      const user = new CognitoUser({
        Username: email,
        Pool: seawaterUserPool
      });

      return new Promise((resolve) => {
        user.confirmPassword(code, newPassword, {
          onSuccess: () => {
            resolve({ 
              success: true 
            });
          },
          onFailure: (error: any) => {
            console.error('Seawater password reset failed:', error);
            let errorMessage = 'Password reset failed';
            
            switch (error?.code) {
              case 'ExpiredCodeException':
                errorMessage = 'Reset code has expired. Please request a new one.';
                break;
              case 'InvalidParameterException':
              case 'CodeMismatchException':
                errorMessage = 'Invalid reset code. Please check and try again.';
                break;
              case 'InvalidPasswordException':
                errorMessage = 'Password does not meet requirements. Must be at least 8 characters.';
                break;
              default:
                errorMessage = error.message || 'Password reset failed';
            }
            
            resolve({ 
              success: false, 
              error: errorMessage 
            });
          }
        });
      });
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password reset failed' 
      };
    }
  }

  // Upgrade subscription (redirect to backend)
  static async upgradeSubscription(tier: SubscriptionTier): Promise<SeawaterAuthResult> {
    try {
      const response = await seawaterApiClient.upgradeSubscription({
        tier,
        billing_cycle: 'monthly'
      });

      if (response.success) {
        localStorage.setItem('seawater_user_tier', tier);
        return {
          success: true,
          subscription_tier: tier
        };
      } else {
        return {
          success: false,
          error: response.error.message || 'Subscription upgrade failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription upgrade failed'
      };
    }
  }

  // Social authentication setup (Google/Facebook available in HoneyDo Cognito)
  static async signInWithGoogle(): Promise<SeawaterAuthResult> {
    // This would integrate with Cognito's federated identity
    // For now, return not implemented
    return {
      success: false,
      error: 'Social authentication not yet implemented'
    };
  }

  static async signInWithFacebook(): Promise<SeawaterAuthResult> {
    // This would integrate with Cognito's federated identity
    // For now, return not implemented
    return {
      success: false,
      error: 'Social authentication not yet implemented'
    };
  }
}