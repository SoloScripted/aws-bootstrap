import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GitHubOidcConstruct } from './identity-provider/github-identity-provider';

export class IamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubProvider = new GitHubOidcConstruct(this, 'GitHubIdentityProvider');

    new cdk.CfnOutput(this, 'ViewOnlyRoleArn', {
      value: githubProvider.viewOnlyRole.roleArn,
      description: 'ARN for the ViewOnly role for GitHub Actions',
    });

    new cdk.CfnOutput(this, 'AdminRoleArn', {
      value: githubProvider.adminRole.roleArn,
      description: 'ARN for the Admin role for GitHub Actions',
    });
  }
}
