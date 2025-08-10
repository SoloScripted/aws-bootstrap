import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StorageBucket } from './storage/storage-bucket';

export class StorageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const terraformState = new StorageBucket(this, 'TerraformStateBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
    });

    new cdk.CfnOutput(this, 'TerraformStateBucketName', {
      value: terraformState.bucket.bucketName,
    });
  }
}
