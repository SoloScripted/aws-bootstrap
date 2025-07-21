import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { KmsKeyResource } from './security/kms-key-resource';

export class KmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const terraformSopsKey = new KmsKeyResource(this, 'SopsKey', {
      alias: 'SopsKey',
      description: 'KMS key for SOPS encryption',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'SopsKeyArn', {      
      value: terraformSopsKey.key.keyArn,
      description: 'ARN of the KMS key for Terraform SOPS encryption',
    });

    new cdk.CfnOutput(this, 'SopsKeyId', {
      value: terraformSopsKey.key.keyId,
      description: 'ID of the KMS key for Terraform SOPS encryption',
    });
  }
}
