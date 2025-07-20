import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

interface GitHubRoleProps {
  readonly subConditions: string | string[];
  readonly roleDescription: string;
  readonly outputDescription: string;
  readonly policies: string[];
}

const ORG_NAME = 'SoloScripted';
const PIPELINE_REPOSITORIES = ['aws-bootstrap'];
const ADMIN_POLICIES = ['AdministratorAccess'];
const VIEW_ONLY_POLICIES = ['job-function/ViewOnlyAccess', 'AWSCloudFormationReadOnlyAccess']


export class GitHubOidcConstruct extends Construct {
  public readonly provider: iam.OpenIdConnectProvider;
  public readonly viewOnlyRole: iam.Role;
  public readonly adminRole: iam.Role;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.provider = new iam.OpenIdConnectProvider(this, 'Provider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    this.viewOnlyRole = this.createGithubRole('ViewOnlyRole', {
      subConditions: `repo:${ORG_NAME}/*:*`,
      roleDescription: 'Role assumed by GitHub Actions for read-only operations',
      outputDescription: 'The ARN of the IAM role for GitHub Actions',
      policies: VIEW_ONLY_POLICIES,
    });

    this.adminRole = this.createGithubRole('AdminRole', {
      subConditions: PIPELINE_REPOSITORIES.map((repo) => `repo:${ORG_NAME}/${repo}:environment:production`),
      roleDescription: 'Admin role assumed by GitHub Actions for main branch deployments',
      outputDescription: 'The ARN of the IAM admin role for GitHub Actions',
      policies: ADMIN_POLICIES,
    });
  }

  private createGithubRole(id: string, props: GitHubRoleProps): iam.Role {
    const role = new iam.Role(this, id, {
      assumedBy: new iam.FederatedPrincipal(
        this.provider.openIdConnectProviderArn,
        { StringLike: { 'token.actions.githubusercontent.com:sub': props.subConditions } },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: props.roleDescription,
      managedPolicies: props.policies.map(
        (policyName) => iam.ManagedPolicy.fromAwsManagedPolicyName(policyName)
      ),
    });

    return role;
  }
}
