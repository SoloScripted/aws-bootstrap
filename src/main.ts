#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from './stacks/storage-stack';

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

new StorageStack(app, 'StorageStack', { env });

app.synth();
