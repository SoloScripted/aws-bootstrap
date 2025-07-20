import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TerraformStateBucket } from './storage/terraform-state-bucket';

export class StorageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const terraformState = new TerraformStateBucket(this, 'TerraformStateBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'TerraformStateBucketName', {
      value: terraformState.bucket.bucketName,
    });
  }
}
