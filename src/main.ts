#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AtlantisStack } from './stacks/atlantis-stack';
import { NetworkStack } from './stacks/network-stack';
import { SecurityStack } from './stacks/security-stack';
import { StorageStack } from './stacks/storage-stack';

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

const security = new SecurityStack(app, 'SecurityStack', { env });
const network = new NetworkStack(app, 'NetworkStack', { env }, false);
new StorageStack(app, 'StorageStack', { env });
new AtlantisStack(
  app,
  'AtlantisStack',
  {
    env,
    vpc: network.vpc,
    userPool: security.googleUserPool,
    userPoolClientIdentityProvider: cognito.UserPoolClientIdentityProvider.custom(
      security.googleUserPoolIdentityProvider.providerName,
    ),
  },
  false,
);

app.synth();
