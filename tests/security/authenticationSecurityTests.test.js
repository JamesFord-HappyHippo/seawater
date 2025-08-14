/**
 * Authentication and Security Tests
 * JWT token security, API key validation, and access control testing
 */

const { jest } = require('@jest/globals');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock security functions
const generateJWT = (payload, secret, options = {}) => {
  return jwt.sign(payload, secret, {
    expiresIn: options.expiresIn || '1h',
    issuer: options.issuer || 'seawater.io',
    audience: options.audience || 'seawater-api'
  });
};

const verifyJWT = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

const validateApiKey = (apiKey, userTier) => {
  const keyPatterns = {
    free: /^free-[a-f0-9]{32}$/,
    basic: /^basic-[a-f0-9]{32}$/,
    premium: /^premium-[a-f0-9]{32}$/,
    professional: /^professional-[a-f0-9]{32}$/
  };

  return keyPatterns[userTier]?.test(apiKey) || false;
};

const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Rate limiting simulation
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const requestTimes = this.requests.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => time > windowStart);
    this.requests.set(identifier, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }

  getRemainingRequests(identifier) {
    const requestTimes = this.requests.get(identifier) || [];
    return Math.max(0, this.maxRequests - requestTimes.length);
  }
}

describe('JWT Token Security', () => {
  const JWT_SECRET = 'test-secret-key-for-seawater-platform-testing';
  const INVALID_SECRET = 'wrong-secret-key';

  test('should generate valid JWT tokens with proper claims', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      tier: 'premium'
    };

    const token = generateJWT(payload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'seawater.io',
      audience: 'seawater-api'
    });

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    
    // Verify token contains expected claims
    const decoded = jwt.decode(token);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.tier).toBe('premium');
    expect(decoded.iss).toBe('seawater.io');
    expect(decoded.aud).toBe('seawater-api');
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('should verify valid JWT tokens successfully', () => {
    const payload = {
      userId: 'user-456',
      tier: 'basic'
    };

    const token = generateJWT(payload, JWT_SECRET);
    const verified = verifyJWT(token, JWT_SECRET);

    expect(verified.userId).toBe('user-456');
    expect(verified.tier).toBe('basic');
    expect(verified.iss).toBe('seawater.io');
  });

  test('should reject tokens with invalid signatures', () => {
    const payload = { userId: 'user-789' };
    const token = generateJWT(payload, JWT_SECRET);

    expect(() => {
      verifyJWT(token, INVALID_SECRET);
    }).toThrow('Invalid token');
  });

  test('should reject expired tokens', () => {
    const payload = { userId: 'user-expired' };
    const expiredToken = generateJWT(payload, JWT_SECRET, { expiresIn: '1ms' });

    // Wait for token to expire
    setTimeout(() => {
      expect(() => {
        verifyJWT(expiredToken, JWT_SECRET);
      }).toThrow('Invalid token');
    }, 10);
  });

  test('should reject malformed tokens', () => {
    const malformedTokens = [
      'invalid.token',
      'not.a.jwt.token',
      'header.payload', // Missing signature
      '', // Empty token
      null,
      undefined
    ];

    malformedTokens.forEach(token => {
      expect(() => {
        verifyJWT(token, JWT_SECRET);
      }).toThrow();
    });
  });

  test('should handle token tampering attempts', () => {
    const payload = { userId: 'user-123', tier: 'basic' };
    const validToken = generateJWT(payload, JWT_SECRET);
    
    // Attempt to modify the payload
    const parts = validToken.split('.');
    const modifiedPayload = Buffer.from(JSON.stringify({
      userId: 'user-123',
      tier: 'professional' // Escalated privileges
    })).toString('base64url');
    
    const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

    expect(() => {
      verifyJWT(tamperedToken, JWT_SECRET);
    }).toThrow('Invalid token');
  });
});

describe('API Key Security', () => {
  test('should validate API keys against correct patterns', () => {
    const validKeys = {
      free: 'free-a1b2c3d4e5f67890123456789abcdef0',
      basic: 'basic-fedcba0987654321abcdef1234567890',
      premium: 'premium-1234567890abcdef0123456789abcdef',
      professional: 'professional-abcdef1234567890fedcba0987654321'
    };

    Object.entries(validKeys).forEach(([tier, key]) => {
      expect(validateApiKey(key, tier)).toBe(true);
    });
  });

  test('should reject invalid API key formats', () => {
    const invalidKeys = [
      { key: 'invalid-format', tier: 'basic' },
      { key: 'basic-shortkey', tier: 'basic' },
      { key: 'basic-toolongkey1234567890abcdef', tier: 'basic' },
      { key: 'basic-invalidchars!@#$%^&*()', tier: 'basic' },
      { key: 'premium-a1b2c3d4e5f67890123456789abcdef0', tier: 'basic' }, // Wrong tier
      { key: '', tier: 'basic' },
      { key: null, tier: 'basic' }
    ];

    invalidKeys.forEach(({ key, tier }) => {
      expect(validateApiKey(key, tier)).toBe(false);
    });
  });

  test('should enforce tier-specific permissions', () => {
    const tierPermissions = {
      free: ['basic_risk_lookup'],
      basic: ['basic_risk_lookup', 'geocoding'],
      premium: ['basic_risk_lookup', 'geocoding', 'projections', 'detailed_reports'],
      professional: ['basic_risk_lookup', 'geocoding', 'projections', 'detailed_reports', 'bulk_processing', 'api_management']
    };

    const checkPermission = (userTier, requestedFeature) => {
      return tierPermissions[userTier]?.includes(requestedFeature) || false;
    };

    // Test valid permissions
    expect(checkPermission('free', 'basic_risk_lookup')).toBe(true);
    expect(checkPermission('premium', 'projections')).toBe(true);
    expect(checkPermission('professional', 'bulk_processing')).toBe(true);

    // Test invalid permissions
    expect(checkPermission('free', 'projections')).toBe(false);
    expect(checkPermission('basic', 'bulk_processing')).toBe(false);
    expect(checkPermission('premium', 'api_management')).toBe(false);
  });
});

describe('Password Security', () => {
  test('should hash passwords securely', async () => {
    const password = 'SecurePassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$12$')).toBe(true); // bcrypt format with salt rounds 12
    expect(hash.length).toBe(60); // Standard bcrypt hash length
  });

  test('should verify correct passwords', async () => {
    const password = 'TestPassword456!';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  test('should reject incorrect passwords', async () => {
    const correctPassword = 'CorrectPassword789!';
    const wrongPassword = 'WrongPassword000!';
    const hash = await hashPassword(correctPassword);
    const isValid = await verifyPassword(wrongPassword, hash);

    expect(isValid).toBe(false);
  });

  test('should generate unique hashes for same password', async () => {
    const password = 'SamePassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // Different salts should generate different hashes
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  test('should enforce password complexity requirements', () => {
    const validatePasswordStrength = (password) => {
      const requirements = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        noCommonWords: !['password', '123456', 'qwerty'].includes(password.toLowerCase())
      };

      const passedRequirements = Object.values(requirements).filter(Boolean).length;
      return {
        isValid: passedRequirements >= 5,
        requirements,
        strength: passedRequirements <= 3 ? 'weak' : passedRequirements <= 4 ? 'medium' : 'strong'
      };
    };

    // Test strong password
    const strongPassword = 'StrongPass123!';
    const strongResult = validatePasswordStrength(strongPassword);
    expect(strongResult.isValid).toBe(true);
    expect(strongResult.strength).toBe('strong');

    // Test weak password
    const weakPassword = 'password';
    const weakResult = validatePasswordStrength(weakPassword);
    expect(weakResult.isValid).toBe(false);
    expect(weakResult.strength).toBe('weak');
  });
});

describe('Rate Limiting Security', () => {
  test('should allow requests within rate limits', () => {
    const rateLimiter = new RateLimiter(60000, 5); // 5 requests per minute
    const clientId = 'client-123';

    // First 5 requests should be allowed
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }
  });

  test('should block requests exceeding rate limits', () => {
    const rateLimiter = new RateLimiter(60000, 3); // 3 requests per minute
    const clientId = 'client-456';

    // First 3 requests allowed
    for (let i = 0; i < 3; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }

    // 4th request should be blocked
    expect(rateLimiter.isAllowed(clientId)).toBe(false);
  });

  test('should track different clients separately', () => {
    const rateLimiter = new RateLimiter(60000, 2); // 2 requests per minute
    const client1 = 'client-aaa';
    const client2 = 'client-bbb';

    // Each client gets their own allowance
    expect(rateLimiter.isAllowed(client1)).toBe(true);
    expect(rateLimiter.isAllowed(client2)).toBe(true);
    expect(rateLimiter.isAllowed(client1)).toBe(true);
    expect(rateLimiter.isAllowed(client2)).toBe(true);

    // Both clients should now be rate limited
    expect(rateLimiter.isAllowed(client1)).toBe(false);
    expect(rateLimiter.isAllowed(client2)).toBe(false);
  });

  test('should reset rate limits after time window', (done) => {
    const rateLimiter = new RateLimiter(100, 1); // 1 request per 100ms
    const clientId = 'client-reset';

    // Use up the allowance
    expect(rateLimiter.isAllowed(clientId)).toBe(true);
    expect(rateLimiter.isAllowed(clientId)).toBe(false);

    // Wait for window to reset
    setTimeout(() => {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
      done();
    }, 150);
  });

  test('should provide accurate remaining request counts', () => {
    const rateLimiter = new RateLimiter(60000, 10);
    const clientId = 'client-count';

    expect(rateLimiter.getRemainingRequests(clientId)).toBe(10);

    rateLimiter.isAllowed(clientId);
    expect(rateLimiter.getRemainingRequests(clientId)).toBe(9);

    for (let i = 0; i < 5; i++) {
      rateLimiter.isAllowed(clientId);
    }
    expect(rateLimiter.getRemainingRequests(clientId)).toBe(4);
  });
});

describe('Input Validation Security', () => {
  test('should sanitize SQL injection attempts', () => {
    const sanitizeInput = (input) => {
      // Remove common SQL injection patterns
      const dangerous = [
        /('|(\\')|(;|(\s*;\s*))|(--)|(\s*--\s*)/g, // SQL injection
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
        /javascript:/gi, // JavaScript protocol
        /on\w+\s*=/gi // Event handlers
      ];

      let sanitized = input.toString();
      dangerous.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });

      return sanitized.trim();
    };

    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "<script>alert('xss')</script>",
      "javascript:alert('xss')",
      "' OR '1'='1",
      "<img src=x onerror=alert('xss')>",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ];

    maliciousInputs.forEach(input => {
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain("'='");
    });
  });

  test('should validate address input format', () => {
    const validateAddress = (address) => {
      if (!address || typeof address !== 'string') {
        return { valid: false, error: 'Address is required and must be a string' };
      }

      // Max length check
      if (address.length > 200) {
        return { valid: false, error: 'Address too long (max 200 characters)' };
      }

      // Basic format validation
      const addressPattern = /^[a-zA-Z0-9\s,.-]+$/;
      if (!addressPattern.test(address)) {
        return { valid: false, error: 'Address contains invalid characters' };
      }

      // Must contain some letters (not just numbers)
      if (!/[a-zA-Z]/.test(address)) {
        return { valid: false, error: 'Address must contain letters' };
      }

      return { valid: true };
    };

    // Valid addresses
    const validAddresses = [
      "123 Main St, Houston, TX 77002",
      "456 Oak Avenue, Apt 2B, Miami, FL 33101",
      "789 Pine Street",
      "1 Broadway, New York, NY 10004"
    ];

    validAddresses.forEach(address => {
      const result = validateAddress(address);
      expect(result.valid).toBe(true);
    });

    // Invalid addresses
    const invalidAddresses = [
      "", // Empty
      null, // Null
      123, // Number instead of string
      "A".repeat(201), // Too long
      "123 Main St <script>alert('xss')</script>", // XSS attempt
      "'; DROP TABLE addresses; --", // SQL injection
      "123456789", // Numbers only
      "Main St @ Special#Characters!" // Invalid characters
    ];

    invalidAddresses.forEach(address => {
      const result = validateAddress(address);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  test('should validate coordinate input ranges', () => {
    const validateCoordinates = (lat, lng) => {
      const errors = [];

      // Type validation
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        errors.push('Coordinates must be numbers');
      }

      // Range validation
      if (lat < -90 || lat > 90) {
        errors.push('Latitude must be between -90 and 90 degrees');
      }

      if (lng < -180 || lng > 180) {
        errors.push('Longitude must be between -180 and 180 degrees');
      }

      // Precision validation (reasonable precision for property locations)
      if (Math.abs(lat) > 0 && Math.abs(lat % 0.000001) !== lat % 0.000001) {
        // More than 6 decimal places
        errors.push('Latitude precision too high');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    };

    // Valid coordinates
    expect(validateCoordinates(40.7128, -74.0060)).toEqual({ valid: true, errors: [] }); // NYC
    expect(validateCoordinates(29.7604, -95.3698)).toEqual({ valid: true, errors: [] }); // Houston
    expect(validateCoordinates(0, 0)).toEqual({ valid: true, errors: [] }); // Null Island

    // Invalid coordinates
    expect(validateCoordinates(91, 0).valid).toBe(false); // Lat too high
    expect(validateCoordinates(-91, 0).valid).toBe(false); // Lat too low
    expect(validateCoordinates(0, 181).valid).toBe(false); // Lng too high
    expect(validateCoordinates(0, -181).valid).toBe(false); // Lng too low
    expect(validateCoordinates('40.7128', '-74.0060').valid).toBe(false); // String instead of number
  });
});

describe('Session Security', () => {
  test('should generate secure session tokens', () => {
    const generateSessionToken = () => {
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    };

    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    expect(token1).not.toBe(token2); // Should be unique
    expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
    expect(/^[a-f0-9]+$/.test(token1)).toBe(true); // Only hex characters
  });

  test('should implement secure session timeout', () => {
    class SessionManager {
      constructor(timeoutMs = 30 * 60 * 1000) { // 30 minutes default
        this.sessions = new Map();
        this.timeoutMs = timeoutMs;
      }

      createSession(userId) {
        const sessionId = require('crypto').randomBytes(32).toString('hex');
        const session = {
          userId,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          isActive: true
        };
        this.sessions.set(sessionId, session);
        return sessionId;
      }

      validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.isActive) {
          return null;
        }

        const now = Date.now();
        if (now - session.lastActivity > this.timeoutMs) {
          session.isActive = false;
          return null;
        }

        // Update last activity
        session.lastActivity = now;
        return session;
      }

      destroySession(sessionId) {
        this.sessions.delete(sessionId);
      }
    }

    const sessionManager = new SessionManager(1000); // 1 second timeout for testing
    const sessionId = sessionManager.createSession('user-123');

    // Session should be valid initially
    expect(sessionManager.validateSession(sessionId)).toBeTruthy();

    // Session should expire after timeout
    setTimeout(() => {
      expect(sessionManager.validateSession(sessionId)).toBeNull();
    }, 1100);
  });
});