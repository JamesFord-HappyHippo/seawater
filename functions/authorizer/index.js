// JWT Authorizer Function for Seawater Climate Risk Platform
// Follows Tim-Combo security patterns with email-based user identification

const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
});

/**
 * JWT Authorizer Lambda Function
 * Validates JWT tokens and checks trial/subscription status
 */
exports.handler = async (event, context) => {
  console.log('Authorizer invoked:', {
    methodArn: event.methodArn,
    hasToken: !!event.authorizationToken,
    requestId: context.awsRequestId
  });

  try {
    // Extract token from Authorization header
    const token = extractToken(event.authorizationToken);
    if (!token) {
      throw new Error('No token provided');
    }

    // Verify JWT token - Tim-Combo uses email as primary identifier
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email || decoded['cognito:username'];
    const cognitoUserId = decoded.sub || decoded.user_id;
    
    if (!email) {
      throw new Error('Invalid token: missing email');
    }

    // Get user information and trial status from database using email
    const userInfo = await getUserInfo(email);
    if (!userInfo) {
      throw new Error('User not found');
    }

    // Check if user account is active (Tim-Combo pattern)
    if (userInfo.User_Status !== 'Active' || !userInfo.active) {
      throw new Error('User account not active');
    }

    // Generate IAM policy based on user subscription tier
    const policy = generatePolicy(email, userInfo, event.methodArn);
    
    console.log('Authorization successful:', {
      email,
      subscriptionTier: userInfo.subscription_tier,
      trialStatus: userInfo.trial_status,
      requestId: context.awsRequestId
    });

    return policy;

  } catch (error) {
    console.error('Authorization failed:', {
      error: error.message,
      token: event.authorizationToken ? 'present' : 'missing',
      requestId: context.awsRequestId
    });
    
    throw new Error('Unauthorized'); // This triggers a 401 response
  }
};

/**
 * Extract JWT token from Authorization header
 */
function extractToken(authorizationToken) {
  if (!authorizationToken) {
    return null;
  }

  // Support both "Bearer <token>" and raw token formats
  if (authorizationToken.startsWith('Bearer ')) {
    return authorizationToken.substring(7);
  }
  
  return authorizationToken;
}

/**
 * Get user information from database using email (Tim-Combo pattern)
 */
async function getUserInfo(email) {
  const query = `
    SELECT 
      "Email_Address",
      "Client_ID",
      "User_Status",
      "User_Display_Name",
      "Super_Admin",
      "active",
      "subscription_tier",
      "trial_status",
      "trial_reports_used",
      "trial_reports_limit",
      "trial_expires_at",
      "email_verified",
      "marketing_consent",
      "Create_Date"
    FROM "Users" 
    WHERE "Email_Address" = $1 
    AND "deleted_at" IS NULL
    LIMIT 1
  `;

  try {
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database error');
  }
}

/**
 * Generate IAM policy based on user subscription tier and trial status (Tim-Combo pattern)
 */
function generatePolicy(email, userInfo, methodArn) {
  const accountId = methodArn.split(':')[4];
  const apiGatewayArn = methodArn.split('/')[0];
  
  // Base policy structure
  const policy = {
    principalId: email, // Using email as principal ID (Tim-Combo pattern)
    policyDocument: {
      Version: '2012-10-17',
      Statement: []
    },
    context: {
      email_address: email,
      client_id: userInfo.Client_ID,
      user_status: userInfo.User_Status,
      subscription_tier: userInfo.subscription_tier || 'trial',
      trial_status: userInfo.trial_status,
      trial_reports_used: (userInfo.trial_reports_used || 0).toString(),
      trial_reports_limit: (userInfo.trial_reports_limit || 1).toString(),
      is_super_admin: userInfo.Super_Admin ? 'true' : 'false',
      active: userInfo.active ? 'true' : 'false',
      marketing_consent: userInfo.marketing_consent ? 'true' : 'false'
    }
  };

  // Determine permissions based on subscription tier and trial status
  const permissions = getPermissions(userInfo);
  
  // Allow basic user endpoints for all authenticated users
  policy.policyDocument.Statement.push({
    Action: 'execute-api:Invoke',
    Effect: 'Allow',
    Resource: [
      `${apiGatewayArn}/*/GET/user/profile`,
      `${apiGatewayArn}/*/PUT/user/profile`,
      `${apiGatewayArn}/*/POST/user/consent`,
      `${apiGatewayArn}/*/GET/health`
    ]
  });

  // Add subscription-specific permissions
  if (permissions.propertyRisk) {
    policy.policyDocument.Statement.push({
      Action: 'execute-api:Invoke',
      Effect: 'Allow',
      Resource: [
        `${apiGatewayArn}/*/GET/properties/risk`,
        `${apiGatewayArn}/*/POST/properties/compare`
      ]
    });
  }

  if (permissions.bulkAnalysis) {
    policy.policyDocument.Statement.push({
      Action: 'execute-api:Invoke',
      Effect: 'Allow',
      Resource: [
        `${apiGatewayArn}/*/POST/professional/bulk/risk-assessment`,
        `${apiGatewayArn}/*/GET/professional/bulk/jobs/*`,
        `${apiGatewayArn}/*/GET/professional/reports/*`
      ]
    });
  }

  if (permissions.premiumData) {
    policy.policyDocument.Statement.push({
      Action: 'execute-api:Invoke',
      Effect: 'Allow',
      Resource: [
        `${apiGatewayArn}/*/GET/data-sources/firststreet/*`,
        `${apiGatewayArn}/*/GET/data-sources/climatecheck/*`
      ]
    });
  }

  return policy;
}

/**
 * Determine user permissions based on subscription tier and trial status
 */
function getPermissions(userInfo) {
  const tier = userInfo.subscription_tier || 'trial';
  const trialReportsUsed = userInfo.trial_reports_used || 0;
  const trialReportsLimit = userInfo.trial_reports_limit || 1;
  const trialActive = userInfo.trial_status === 'active';

  const permissions = {
    propertyRisk: false,
    bulkAnalysis: false,
    premiumData: false,
    historicalData: false
  };

  switch (tier) {
    case 'trial':
      // Trial users get reports based on their limit
      permissions.propertyRisk = trialActive && (trialReportsUsed < trialReportsLimit);
      break;
      
    case 'individual':
      permissions.propertyRisk = true;
      permissions.premiumData = true;
      break;
      
    case 'professional':
      permissions.propertyRisk = true;
      permissions.bulkAnalysis = true;
      permissions.premiumData = true;
      permissions.historicalData = true;
      break;
      
    case 'enterprise':
      // Full access to all features
      permissions.propertyRisk = true;
      permissions.bulkAnalysis = true;
      permissions.premiumData = true;
      permissions.historicalData = true;
      break;
      
    default:
      // Default to no permissions for unknown tiers
      break;
  }

  return permissions;
}

/**
 * Health check for the authorizer function
 */
function isHealthy() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.LAMBDA_VERSION || 'unknown'
  };
}