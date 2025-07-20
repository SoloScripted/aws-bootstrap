#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { IamStack } from './stacks/iam-stack';
import { StorageStack } from './stacks/storage-stack';

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

new IamStack(app, 'IamStack', { env });
new StorageStack(app, 'StorageStack', { env });

app.synth();
