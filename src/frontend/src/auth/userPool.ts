// AWS Cognito User Pool Configuration for Seawater Climate Risk Platform
// Using HoneyDo's existing Cognito infrastructure
import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  // Using HoneyDo's Cognito User Pool for authentication
  UserPoolId: 'us-east-2_dnQfP90vt',
  ClientId: '4o4g5q8cg35na7bvbsnilbk98u',
};

export const seawaterUserPool = new CognitoUserPool(poolData);

// Export the same pool with different name for backward compatibility
export const userPool = seawaterUserPool;