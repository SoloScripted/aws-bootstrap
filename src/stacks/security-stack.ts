import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as kms from 'aws-cdk-lib/aws-kms';
import { SopsSecret } from 'cdk-sops-secrets';
import { Construct } from 'constructs';

export class SecurityStack extends cdk.Stack {
  public readonly sopsKey: kms.Key;
  public readonly googleUserPool: cognito.UserPool;
  public readonly googleUserPoolIdentityProvider: cognito.CfnUserPoolIdentityProvider;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.sopsKey = new kms.Key(this, 'SopsKey', {
      description: 'KMS key for SOPS to encrypt and decrypt secrets',
      alias: 'alias/sops-key',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const sops = new SopsSecret(this, 'SopsSecret', {
      secretName: 'google-idp-metadata',
      sopsFilePath: 'workspace.xml',
      sopsFileFormat: 'binary',
    });

    this.googleUserPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'GoogleSAMLUserPool',
    });

    this.googleUserPoolIdentityProvider = new cognito.CfnUserPoolIdentityProvider(
      this,
      'GoogleWorkspaceIdP',
      {
        providerName: 'GoogleWorkspace',
        providerType: 'SAML',
        userPoolId: this.googleUserPool.userPoolId,
        providerDetails: {
          MetadataFile: sops.secretValue.unsafeUnwrap(),
          IDPSignout: 'true',
        },
        attributeMapping: {
          email: 'email',
        },
      },
    );

    new cdk.CfnOutput(this, 'GoogleUserPoolId', {
      value: this.googleUserPool.userPoolId,
      description: 'The ID of the Google Workspace User Pool',
    });

    new cdk.CfnOutput(this, 'SopsKeyArn', {
      value: this.sopsKey.keyArn,
      description: 'The ARN of the KMS key for SOPS',
    });
  }
}
