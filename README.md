# AWS Bootstrap with CDK and GitHub Actions

This repository provides a foundational AWS environment setup using the AWS Cloud Development Kit (CDK) and TypeScript. It includes secure, reusable constructs and a robust CI/CD pipeline using GitHub Actions for automated validation and deployment.

## Features

- **Infrastructure as Code**: All resources are defined using AWS CDK in TypeScript, enabling repeatable and version-controlled infrastructure.
- **Secure CI/CD**: Automated workflows using GitHub Actions with OpenID Connect (OIDC) for secure, short-lived credentials, eliminating the need for long-lived IAM user secrets.
- **Pull Request Validation**: Automatically runs `cdk diff` on every pull request and posts the output as a comment, providing immediate feedback on infrastructure changes.
- **Manual Approval for Production**: Deployments to the `main` branch are gated by a manual approval step within GitHub Actions, ensuring a human review before production changes are applied.
- **Reusable Constructs**:
  - `TerraformStateBucket`: A secure, cost-optimized S3 bucket for managing Terraform state, featuring versioning, encryption, and lifecycle rules.
  - `GitHubOidcConstruct`: A construct to easily set up the GitHub OIDC provider and necessary IAM roles for CI/CD workflows.

## Project Structure

- `src/stacks/`: Contains the main CDK stack definitions.
  - `iam-stack.ts`: Provisions the GitHub OIDC provider and IAM roles (`ViewOnlyRole`, `AdminRole`) for CI/CD.
  - `storage-stack.ts`: Provisions storage resources, such as the S3 bucket for Terraform state.
- `src/constructs/`: Contains reusable, high-level CDK constructs.
  - `terraform-state-bucket.ts`: Defines a secure S3 bucket with versioning, encryption, and cost-optimizing lifecycle policies.
  - `github-identity-provider.ts`: Defines the OIDC provider and roles that trust GitHub Actions.
- `.github/workflows/`: Contains the GitHub Actions workflow definitions.
  - `pull-request.yml`: Workflow for running `cdk diff` on pull requests.
  - `deploy.yml`: Workflow for deploying stacks to production after a push to `main`.

## Prerequisites

- Node.js (v18 or later)
- Yarn
- AWS CLI
- AWS CDK CLI (`npm install -g aws-cdk`)
- An AWS account with credentials configured locally.

## Getting Started

1.  **Install Dependencies**:

    ```sh
    yarn install
    ```

2.  **Bootstrap AWS Environment**:
    The CDK needs to provision some initial resources in your AWS account to manage deployments. You only need to do this once per account/region combination.

    ```sh
    cdk bootstrap aws://<YOUR_ACCOUNT_ID>/<YOUR_REGION>
    ```

3.  **Deploy the IAM Stack**:
    The CI/CD workflows depend on the IAM roles created by the `IamStack`. Deploy it first to get the required role ARNs.

    ```sh
    cdk deploy IamStack
    ```

4.  **Configure GitHub Secrets and Variables**:
    - After deploying `IamStack`, copy the `AdminRoleArn` and `ViewOnlyRoleArn` from the CloudFormation outputs.
    - In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
    - Create two repository **secrets**:
      - `AWS_ADMIN_ROLE_ARN`: Paste the `AdminRoleArn`.
      - `AWS_VIEW_ONLY_ROLE_ARN`: Paste the `ViewOnlyRoleArn`.
    - Create one repository **variable**:
      - `AWS_REGION`: Set this to the AWS region you are deploying to (e.g., `eu-north-1`).

5.  **Configure GitHub Environment for Production**:
    To enable the manual approval gate, you must configure a "production" environment in your repository.
    - In your GitHub repository, go to **Settings > Environments**.
    - Click **New environment**, name it `production`, and click **Configure environment**.
    - Under "Environment protection rules", check **Required reviewers** and select the users or teams who can approve deployments.

## CI/CD Workflows

### Pull Request Workflow (`pull-request.yml`)

- **Trigger**: Runs on any pull request targeting the `main` branch.
- **Action**: Assumes the `ViewOnlyRole` to perform a `cdk diff`.
- **Feedback**: Posts the diff output as a comment on the PR. If there are no changes, it posts a confirmation message. It intelligently updates its own comment on subsequent pushes to avoid cluttering the PR.

### Deployment Workflow (`deploy.yml`)

- **Trigger**: Runs on a push to the `main` branch or can be triggered manually from the Actions tab (`workflow_dispatch`).
- **Approval Gate**: The deployment job is configured to use the `production` environment, which pauses the workflow until a designated reviewer approves it.
- **Action**: Once approved, it assumes the `AdminRole` and runs `cdk deploy --all --require-approval never` to deploy all stacks.

## Useful Commands

This project uses a `Makefile` to provide a simple and consistent interface for common development tasks.

- `make install`: Install all project dependencies.
- `make check`: Run all code quality checks (linting and formatting).
- `make test`: Run unit tests.
- `make build`: Compile TypeScript to JavaScript.
- `make diff STACK=MyStackName`: Compare a deployed stack with the current state.
- `make deploy STACK=MyStackName`: Deploy a specific stack.
- `make deploy STACK="*"`: Deploy all stacks.
- `make destroy STACK=MyStackName`: Destroy a specific stack.
- `make help`: Display a list of all available commands.

For more granular control, you can still use `yarn` and `npx cdk` commands directly.
