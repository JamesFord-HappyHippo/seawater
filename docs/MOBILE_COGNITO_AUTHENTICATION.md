# 🔐 Seawater Mobile App - Cognito Authentication Integration

## 🎯 Overview

This guide provides comprehensive instructions for integrating AWS Cognito authentication into the Seawater Climate Risk Platform mobile application, based on proven patterns from the HoneyDo and Tim-Combo platforms.

### Authentication Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   AWS Cognito    │    │   API Gateway   │
│   (Flutter)     │◄──►│   User Pool      │◄──►│   Authorizer    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────────────┐               │
         └──────────────►│ Cognito        │◄──────────────┘
                         │ Identity Pool  │
                         └────────────────┘
                                  │
                         ┌────────────────┐
                         │  AWS Services  │
                         │  (S3, Lambda)  │
                         └────────────────┘
```

## 🔧 Cognito Configuration

### User Pool Setup

```yaml
# CloudFormation template for Cognito User Pool
CognitoUserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: !Sub "${Environment}-seawater-users"
    AliasAttributes:
      - email
    UsernameConfiguration:
      CaseSensitive: false
    Policies:
      PasswordPolicy:
        MinimumLength: 8
        RequireUppercase: true
        RequireLowercase: true
        RequireNumbers: true
        RequireSymbols: false
        TemporaryPasswordValidityDays: 7
    Schema:
      - Name: email
        AttributeDataType: String
        Required: true
        Mutable: true
      - Name: given_name
        AttributeDataType: String
        Required: true
        Mutable: true
      - Name: family_name
        AttributeDataType: String
        Required: true
        Mutable: true
      - Name: subscription_tier
        AttributeDataType: String
        Mutable: true
        DeveloperOnlyAttribute: false
      - Name: company_name
        AttributeDataType: String
        Mutable: true
        DeveloperOnlyAttribute: false
      - Name: professional_type
        AttributeDataType: String
        Mutable: true
        DeveloperOnlyAttribute: false
    AutoVerifiedAttributes:
      - email
    EmailConfiguration:
      EmailSendingAccount: COGNITO_DEFAULT
    VerificationMessageTemplate:
      DefaultEmailOption: CONFIRM_WITH_CODE
      EmailSubject: "Seawater - Verify your email"
      EmailMessage: "Welcome to Seawater! Your verification code is {####}"
    UserPoolTags:
      Environment: !Ref Environment
      Service: Seawater
      
CognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    UserPoolId: !Ref CognitoUserPool
    ClientName: !Sub "${Environment}-seawater-mobile"
    GenerateSecret: false # Mobile apps don't use secrets
    ExplicitAuthFlows:
      - ALLOW_USER_SRP_AUTH
      - ALLOW_REFRESH_TOKEN_AUTH
      - ALLOW_USER_PASSWORD_AUTH # For testing only
    TokenValidityUnits:
      AccessToken: hours
      IdToken: hours
      RefreshToken: days
    AccessTokenValidity: 1
    IdTokenValidity: 1
    RefreshTokenValidity: 30
    PreventUserExistenceErrors: ENABLED
    EnableTokenRevocation: true
    
CognitoIdentityPool:
  Type: AWS::Cognito::IdentityPool
  Properties:
    IdentityPoolName: !Sub "${Environment}-seawater-identity"
    AllowUnauthenticatedIdentities: true # For guest access to basic features
    CognitoIdentityProviders:
      - ClientId: !Ref CognitoUserPoolClient
        ProviderName: !GetAtt CognitoUserPool.ProviderName
        ServerSideTokenCheck: true
```

## 📱 Flutter Implementation

### Authentication Service

```dart
// lib/services/auth_service.dart
import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:flutter/foundation.dart';

class SeawaterAuthService extends ChangeNotifier {
  static const String userPoolId = 'us-east-2_SeawaterPool123';
  static const String clientId = 'your_client_id_here';
  static const String identityPoolId = 'us-east-2:identity-pool-id';
  
  final CognitoUserPool _userPool = CognitoUserPool(userPoolId, clientId);
  final CognitoMemoryStorage _storage = CognitoMemoryStorage();
  
  CognitoUser? _currentUser;
  CognitoUserSession? _currentSession;
  SeawaterUser? _user;
  
  // Getters
  bool get isAuthenticated => _currentSession?.isValid() ?? false;
  SeawaterUser? get currentUser => _user;
  String? get accessToken => _currentSession?.getAccessToken().jwtToken;
  String? get idToken => _currentSession?.getIdToken().jwtToken;
  String? get refreshToken => _currentSession?.getRefreshToken()?.token;
  
  /// Initialize authentication service and check for existing session
  Future<void> initialize() async {
    try {
      _currentUser = await _userPool.getCurrentUser();
      if (_currentUser != null) {
        _currentSession = await _currentUser!.getSession();
        if (_currentSession?.isValid() == true) {
          _user = await _buildUserFromSession(_currentSession!);
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Failed to initialize auth: $e');
    }
  }
  
  /// Sign in with email and password
  Future<AuthResult> signIn(String email, String password) async {
    try {
      final cognitoUser = CognitoUser(email, _userPool, storage: _storage);
      final authDetails = AuthenticationDetails(
        username: email,
        password: password,
      );
      
      final session = await cognitoUser.authenticateUser(authDetails);
      
      if (session == null) {
        return AuthResult.failure(AuthError.authenticationFailed);
      }
      
      _currentUser = cognitoUser;
      _currentSession = session;
      _user = await _buildUserFromSession(session);
      
      notifyListeners();
      
      return AuthResult.success(_user!);
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Sign up new user
  Future<AuthResult> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? companyName,
    String? professionalType,
  }) async {
    try {
      final userAttributes = <AttributeArg>[
        AttributeArg(name: 'email', value: email),
        AttributeArg(name: 'given_name', value: firstName),
        AttributeArg(name: 'family_name', value: lastName),
      ];
      
      if (companyName?.isNotEmpty == true) {
        userAttributes.add(
          AttributeArg(name: 'custom:company_name', value: companyName!),
        );
      }
      
      if (professionalType?.isNotEmpty == true) {
        userAttributes.add(
          AttributeArg(name: 'custom:professional_type', value: professionalType!),
        );
      }
      
      final result = await _userPool.signUp(
        email,
        password,
        userAttributes: userAttributes,
      );
      
      return AuthResult.pendingVerification(
        email: email,
        userSub: result?.userSub,
      );
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Confirm sign up with verification code
  Future<AuthResult> confirmSignUp(String email, String code) async {
    try {
      final cognitoUser = CognitoUser(email, _userPool, storage: _storage);
      final success = await cognitoUser.confirmRegistration(code);
      
      if (success) {
        return AuthResult.verificationSuccess();
      } else {
        return AuthResult.failure(AuthError.verificationFailed);
      }
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Resend verification code
  Future<AuthResult> resendConfirmationCode(String email) async {
    try {
      final cognitoUser = CognitoUser(email, _userPool, storage: _storage);
      await cognitoUser.resendConfirmationCode();
      return AuthResult.codeResent();
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Initiate password reset
  Future<AuthResult> forgotPassword(String email) async {
    try {
      final cognitoUser = CognitoUser(email, _userPool, storage: _storage);
      await cognitoUser.forgotPassword();
      return AuthResult.passwordResetInitiated();
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Confirm password reset
  Future<AuthResult> confirmPassword(
    String email,
    String code,
    String newPassword,
  ) async {
    try {
      final cognitoUser = CognitoUser(email, _userPool, storage: _storage);
      final success = await cognitoUser.confirmPassword(code, newPassword);
      
      if (success) {
        return AuthResult.passwordResetSuccess();
      } else {
        return AuthResult.failure(AuthError.passwordResetFailed);
      }
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Change password for authenticated user
  Future<AuthResult> changePassword(
    String oldPassword,
    String newPassword,
  ) async {
    try {
      if (_currentUser == null) {
        return AuthResult.failure(AuthError.notAuthenticated);
      }
      
      await _currentUser!.changePassword(oldPassword, newPassword);
      return AuthResult.passwordChangeSuccess();
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Update user attributes
  Future<AuthResult> updateUserAttributes(
    Map<String, String> attributes,
  ) async {
    try {
      if (_currentUser == null) {
        return AuthResult.failure(AuthError.notAuthenticated);
      }
      
      final cognitoAttributes = attributes.entries
          .map((e) => AttributeArg(name: e.key, value: e.value))
          .toList();
      
      await _currentUser!.updateAttributes(cognitoAttributes);
      
      // Refresh user data
      await _refreshSession();
      
      return AuthResult.updateSuccess();
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Refresh the current session
  Future<AuthResult> refreshSession() async {
    try {
      if (_currentUser == null) {
        return AuthResult.failure(AuthError.notAuthenticated);
      }
      
      _currentSession = await _currentUser!.getSession();
      if (_currentSession?.isValid() == true) {
        _user = await _buildUserFromSession(_currentSession!);
        notifyListeners();
        return AuthResult.sessionRefreshed();
      } else {
        return AuthResult.failure(AuthError.sessionExpired);
      }
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Sign out current user
  Future<void> signOut() async {
    try {
      await _currentUser?.signOut();
    } catch (e) {
      debugPrint('Error during sign out: $e');
    } finally {
      _currentUser = null;
      _currentSession = null;
      _user = null;
      notifyListeners();
    }
  }
  
  /// Global sign out (revoke all tokens)
  Future<void> globalSignOut() async {
    try {
      await _currentUser?.globalSignOut();
    } catch (e) {
      debugPrint('Error during global sign out: $e');
    } finally {
      _currentUser = null;
      _currentSession = null;
      _user = null;
      notifyListeners();
    }
  }
  
  /// Delete user account
  Future<AuthResult> deleteAccount() async {
    try {
      if (_currentUser == null) {
        return AuthResult.failure(AuthError.notAuthenticated);
      }
      
      await _currentUser!.deleteUser();
      
      _currentUser = null;
      _currentSession = null;
      _user = null;
      notifyListeners();
      
      return AuthResult.accountDeleted();
    } on CognitoClientException catch (e) {
      return AuthResult.failure(_mapCognitoError(e));
    } catch (e) {
      return AuthResult.failure(AuthError.unknown);
    }
  }
  
  /// Build user object from Cognito session
  Future<SeawaterUser> _buildUserFromSession(CognitoUserSession session) async {
    final payload = session.getIdToken().payload;
    
    return SeawaterUser(
      id: payload['sub'],
      email: payload['email'],
      emailVerified: payload['email_verified'] == true,
      firstName: payload['given_name'],
      lastName: payload['family_name'],
      companyName: payload['custom:company_name'],
      professionalType: payload['custom:professional_type'],
      subscriptionTier: payload['custom:subscription_tier'] ?? 'free',
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        (payload['iat'] as int) * 1000,
      ),
      lastSignIn: DateTime.now(),
    );
  }
  
  /// Map Cognito errors to app errors
  AuthError _mapCognitoError(CognitoClientException e) {
    switch (e.code) {
      case 'UserNotConfirmedException':
        return AuthError.userNotVerified;
      case 'NotAuthorizedException':
        return AuthError.invalidCredentials;
      case 'UserNotFoundException':
        return AuthError.userNotFound;
      case 'UsernameExistsException':
        return AuthError.userAlreadyExists;
      case 'InvalidPasswordException':
        return AuthError.weakPassword;
      case 'TooManyRequestsException':
        return AuthError.tooManyRequests;
      case 'LimitExceededException':
        return AuthError.limitExceeded;
      case 'ExpiredCodeException':
        return AuthError.codeExpired;
      case 'CodeMismatchException':
        return AuthError.invalidCode;
      case 'InvalidParameterException':
        return AuthError.invalidParameter;
      default:
        debugPrint('Unmapped Cognito error: ${e.code} - ${e.message}');
        return AuthError.unknown;
    }
  }
  
  /// Refresh session helper
  Future<void> _refreshSession() async {
    if (_currentUser != null) {
      _currentSession = await _currentUser!.getSession();
      if (_currentSession?.isValid() == true) {
        _user = await _buildUserFromSession(_currentSession!);
        notifyListeners();
      }
    }
  }
}
```

### User Model

```dart
// lib/models/user.dart
import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

@JsonSerializable()
class SeawaterUser {
  final String id;
  final String email;
  final bool emailVerified;
  final String? firstName;
  final String? lastName;
  final String? companyName;
  final String? professionalType;
  final String subscriptionTier;
  final DateTime createdAt;
  final DateTime? lastSignIn;
  
  const SeawaterUser({
    required this.id,
    required this.email,
    required this.emailVerified,
    this.firstName,
    this.lastName,
    this.companyName,
    this.professionalType,
    this.subscriptionTier = 'free',
    required this.createdAt,
    this.lastSignIn,
  });
  
  factory SeawaterUser.fromJson(Map<String, dynamic> json) =>
      _$SeawaterUserFromJson(json);
  
  Map<String, dynamic> toJson() => _$SeawaterUserToJson(this);
  
  String get fullName {
    if (firstName == null && lastName == null) return email;
    return '${firstName ?? ''} ${lastName ?? ''}'.trim();
  }
  
  String get displayName => fullName.isNotEmpty ? fullName : email;
  
  bool get isProfessional => professionalType?.isNotEmpty == true;
  
  bool get isPremiumUser => subscriptionTier != 'free';
  
  bool get isVerified => emailVerified;
  
  SeawaterUser copyWith({
    String? firstName,
    String? lastName,
    String? companyName,
    String? professionalType,
    String? subscriptionTier,
    DateTime? lastSignIn,
  }) {
    return SeawaterUser(
      id: id,
      email: email,
      emailVerified: emailVerified,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      companyName: companyName ?? this.companyName,
      professionalType: professionalType ?? this.professionalType,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      createdAt: createdAt,
      lastSignIn: lastSignIn ?? this.lastSignIn,
    );
  }
}
```

### Authentication Result Types

```dart
// lib/models/auth_result.dart
sealed class AuthResult {
  const AuthResult();
  
  // Success states
  static AuthResult success(SeawaterUser user) => AuthSuccess(user);
  static AuthResult pendingVerification({required String email, String? userSub}) =>
      AuthPendingVerification(email: email, userSub: userSub);
  static AuthResult verificationSuccess() => const AuthVerificationSuccess();
  static AuthResult codeResent() => const AuthCodeResent();
  static AuthResult passwordResetInitiated() => const AuthPasswordResetInitiated();
  static AuthResult passwordResetSuccess() => const AuthPasswordResetSuccess();
  static AuthResult passwordChangeSuccess() => const AuthPasswordChangeSuccess();
  static AuthResult updateSuccess() => const AuthUpdateSuccess();
  static AuthResult sessionRefreshed() => const AuthSessionRefreshed();
  static AuthResult accountDeleted() => const AuthAccountDeleted();
  
  // Failure state
  static AuthResult failure(AuthError error) => AuthFailure(error);
}

class AuthSuccess extends AuthResult {
  final SeawaterUser user;
  const AuthSuccess(this.user);
}

class AuthPendingVerification extends AuthResult {
  final String email;
  final String? userSub;
  const AuthPendingVerification({required this.email, this.userSub});
}

class AuthVerificationSuccess extends AuthResult {
  const AuthVerificationSuccess();
}

class AuthCodeResent extends AuthResult {
  const AuthCodeResent();
}

class AuthPasswordResetInitiated extends AuthResult {
  const AuthPasswordResetInitiated();
}

class AuthPasswordResetSuccess extends AuthResult {
  const AuthPasswordResetSuccess();
}

class AuthPasswordChangeSuccess extends AuthResult {
  const AuthPasswordChangeSuccess();
}

class AuthUpdateSuccess extends AuthResult {
  const AuthUpdateSuccess();
}

class AuthSessionRefreshed extends AuthResult {
  const AuthSessionRefreshed();
}

class AuthAccountDeleted extends AuthResult {
  const AuthAccountDeleted();
}

class AuthFailure extends AuthResult {
  final AuthError error;
  const AuthFailure(this.error);
}

enum AuthError {
  // Authentication errors
  authenticationFailed,
  invalidCredentials,
  userNotFound,
  userNotVerified,
  notAuthenticated,
  sessionExpired,
  
  // Registration errors
  userAlreadyExists,
  weakPassword,
  invalidParameter,
  
  // Verification errors
  verificationFailed,
  invalidCode,
  codeExpired,
  
  // Password errors
  passwordResetFailed,
  
  // Rate limiting
  tooManyRequests,
  limitExceeded,
  
  // Generic
  unknown,
}

extension AuthErrorExtension on AuthError {
  String get message {
    switch (this) {
      case AuthError.authenticationFailed:
        return 'Authentication failed. Please try again.';
      case AuthError.invalidCredentials:
        return 'Invalid email or password.';
      case AuthError.userNotFound:
        return 'No account found with this email.';
      case AuthError.userNotVerified:
        return 'Please verify your email before signing in.';
      case AuthError.notAuthenticated:
        return 'You must be signed in to perform this action.';
      case AuthError.sessionExpired:
        return 'Your session has expired. Please sign in again.';
      case AuthError.userAlreadyExists:
        return 'An account with this email already exists.';
      case AuthError.weakPassword:
        return 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';
      case AuthError.invalidParameter:
        return 'Invalid input. Please check your information.';
      case AuthError.verificationFailed:
        return 'Email verification failed. Please try again.';
      case AuthError.invalidCode:
        return 'Invalid verification code.';
      case AuthError.codeExpired:
        return 'Verification code has expired. Please request a new one.';
      case AuthError.passwordResetFailed:
        return 'Password reset failed. Please try again.';
      case AuthError.tooManyRequests:
        return 'Too many requests. Please wait a moment before trying again.';
      case AuthError.limitExceeded:
        return 'Request limit exceeded. Please try again later.';
      case AuthError.unknown:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  bool get isRetryable {
    switch (this) {
      case AuthError.tooManyRequests:
      case AuthError.limitExceeded:
      case AuthError.unknown:
        return true;
      default:
        return false;
    }
  }
}
```

## 🛡️ Security Features

### Biometric Authentication

```dart
// lib/services/biometric_auth_service.dart
import 'package:local_auth/local_auth.dart';

class BiometricAuthService {
  final LocalAuthentication _localAuth = LocalAuthentication();
  
  Future<bool> isBiometricAvailable() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      return false;
    }
  }
  
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }
  
  Future<bool> authenticateWithBiometrics({
    required String reason,
  }) async {
    try {
      final isAvailable = await isBiometricAvailable();
      if (!isAvailable) return false;
      
      return await _localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          sensitiveTransaction: true,
        ),
      );
    } catch (e) {
      debugPrint('Biometric authentication error: $e');
      return false;
    }
  }
  
  Future<bool> authenticateForLogin() async {
    return authenticateWithBiometrics(
      reason: 'Authenticate to access Seawater',
    );
  }
  
  Future<bool> authenticateForSensitiveAction() async {
    return authenticateWithBiometrics(
      reason: 'Confirm your identity for this action',
    );
  }
}
```

### Secure Storage

```dart
// lib/services/secure_storage_service.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
  
  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _rememberMeKey = 'remember_me';
  static const String _lastEmailKey = 'last_email';
  
  Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(key: _biometricEnabledKey, value: enabled.toString());
  }
  
  Future<bool> isBiometricEnabled() async {
    final value = await _storage.read(key: _biometricEnabledKey);
    return value == 'true';
  }
  
  Future<void> setRememberMe(bool remember) async {
    await _storage.write(key: _rememberMeKey, value: remember.toString());
  }
  
  Future<bool> shouldRememberMe() async {
    final value = await _storage.read(key: _rememberMeKey);
    return value == 'true';
  }
  
  Future<void> setLastEmail(String email) async {
    await _storage.write(key: _lastEmailKey, value: email);
  }
  
  Future<String?> getLastEmail() async {
    return await _storage.read(key: _lastEmailKey);
  }
  
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
```

## 🎨 UI Components

### Login Screen

```dart
// lib/screens/auth/login_screen.dart
class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = SeawaterAuthService();
  final _biometricService = BiometricAuthService();
  final _secureStorage = SecureStorageService();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _canUseBiometric = false;
  
  @override
  void initState() {
    super.initState();
    _initializeScreen();
  }
  
  Future<void> _initializeScreen() async {
    _canUseBiometric = await _biometricService.isBiometricAvailable();
    _rememberMe = await _secureStorage.shouldRememberMe();
    
    if (_rememberMe) {
      final lastEmail = await _secureStorage.getLastEmail();
      if (lastEmail != null) {
        _emailController.text = lastEmail;
      }
    }
    
    // Try biometric login if enabled
    if (_canUseBiometric && await _secureStorage.isBiometricEnabled()) {
      _attemptBiometricLogin();
    }
    
    setState(() {});
  }
  
  Future<void> _attemptBiometricLogin() async {
    try {
      final authenticated = await _biometricService.authenticateForLogin();
      if (authenticated && mounted) {
        // Try to refresh existing session
        final result = await _authService.refreshSession();
        if (result is AuthSuccess) {
          _navigateToHome();
        }
      }
    } catch (e) {
      // Fallback to manual login
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo and title
                const SeawaterLogo(size: 80),
                const SizedBox(height: 32),
                Text(
                  'Welcome to Seawater',
                  style: Theme.of(context).textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                Text(
                  'Climate risk assessment made simple',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                
                // Email field
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    if (value?.isEmpty ?? true) {
                      return 'Please enter your email';
                    }
                    if (!value!.contains('@')) {
                      return 'Please enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                // Password field
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword 
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                  ),
                  validator: (value) {
                    if (value?.isEmpty ?? true) {
                      return 'Please enter your password';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                // Remember me checkbox
                CheckboxListTile(
                  title: const Text('Remember me'),
                  value: _rememberMe,
                  onChanged: (value) {
                    setState(() {
                      _rememberMe = value ?? false;
                    });
                  },
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 24),
                
                // Sign in button
                ElevatedButton(
                  onPressed: _isLoading ? null : _signIn,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign In'),
                ),
                const SizedBox(height: 16),
                
                // Biometric login button
                if (_canUseBiometric)
                  OutlinedButton.icon(
                    onPressed: _isLoading ? null : _attemptBiometricLogin,
                    icon: const Icon(Icons.fingerprint),
                    label: const Text('Use Biometric'),
                  ),
                const SizedBox(height: 16),
                
                // Forgot password
                TextButton(
                  onPressed: () => _navigateToForgotPassword(),
                  child: const Text('Forgot Password?'),
                ),
                const SizedBox(height: 8),
                
                // Sign up
                TextButton(
                  onPressed: () => _navigateToSignUp(),
                  child: const Text('Don\'t have an account? Sign Up'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final result = await _authService.signIn(
        _emailController.text.trim(),
        _passwordController.text,
      );
      
      if (result is AuthSuccess) {
        // Save preferences
        await _secureStorage.setRememberMe(_rememberMe);
        if (_rememberMe) {
          await _secureStorage.setLastEmail(_emailController.text.trim());
        }
        
        _navigateToHome();
      } else if (result is AuthFailure) {
        _showError(result.error.message);
        
        if (result.error == AuthError.userNotVerified) {
          _navigateToVerification(_emailController.text.trim());
        }
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
  
  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }
  
  void _navigateToHome() {
    Navigator.of(context).pushReplacementNamed('/dashboard');
  }
  
  void _navigateToSignUp() {
    Navigator.of(context).pushNamed('/auth/signup');
  }
  
  void _navigateToForgotPassword() {
    Navigator.of(context).pushNamed('/auth/forgot-password');
  }
  
  void _navigateToVerification(String email) {
    Navigator.of(context).pushNamed(
      '/auth/verify',
      arguments: {'email': email},
    );
  }
  
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
```

## 🔒 API Integration

### Authenticated HTTP Client

```dart
// lib/services/authenticated_http_client.dart
import 'package:dio/dio.dart';

class AuthenticatedHttpClient {
  late final Dio _dio;
  final SeawaterAuthService _authService;
  
  AuthenticatedHttpClient(this._authService) {
    _dio = Dio();
    _dio.interceptors.add(AuthInterceptor(_authService));
    _dio.interceptors.add(ErrorInterceptor());
  }
  
  Dio get dio => _dio;
}

class AuthInterceptor extends Interceptor {
  final SeawaterAuthService _authService;
  
  AuthInterceptor(this._authService);
  
  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = _authService.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh token
      final result = await _authService.refreshSession();
      if (result is AuthSuccess) {
        // Retry the request with new token
        final options = err.requestOptions;
        options.headers['Authorization'] = 
            'Bearer ${_authService.accessToken}';
        
        try {
          final response = await Dio().fetch(options);
          handler.resolve(response);
          return;
        } catch (e) {
          // Fall through to original error
        }
      }
      
      // Token refresh failed, sign out user
      await _authService.signOut();
    }
    
    handler.next(err);
  }
}
```

## 📝 Testing

### Authentication Tests

```dart
// test/services/auth_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('SeawaterAuthService', () {
    late SeawaterAuthService authService;
    
    setUp(() {
      authService = SeawaterAuthService();
    });
    
    group('signIn', () {
      test('should return success for valid credentials', () async {
        // Arrange
        const email = 'test@example.com';
        const password = 'Password123';
        
        // Act
        final result = await authService.signIn(email, password);
        
        // Assert
        expect(result, isA<AuthSuccess>());
      });
      
      test('should return failure for invalid credentials', () async {
        // Arrange
        const email = 'test@example.com';
        const password = 'wrongpassword';
        
        // Act
        final result = await authService.signIn(email, password);
        
        // Assert
        expect(result, isA<AuthFailure>());
        expect((result as AuthFailure).error, AuthError.invalidCredentials);
      });
    });
    
    group('signUp', () {
      test('should return pending verification for valid registration', () async {
        // Arrange
        const email = 'newuser@example.com';
        const password = 'Password123';
        const firstName = 'John';
        const lastName = 'Doe';
        
        // Act
        final result = await authService.signUp(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        );
        
        // Assert
        expect(result, isA<AuthPendingVerification>());
      });
    });
  });
}
```

## 🚀 Production Considerations

### Session Management
- Implement automatic token refresh
- Handle network connectivity issues
- Provide offline authentication state

### Security Best Practices
- Use certificate pinning for API calls
- Implement app attestation
- Enable advanced security features in Cognito

### Monitoring and Analytics
- Track authentication events
- Monitor failed login attempts
- Log security-related actions

---

*This authentication integration guide provides a comprehensive foundation for implementing secure, scalable authentication in the Seawater mobile application using AWS Cognito and proven patterns from successful mobile applications.*