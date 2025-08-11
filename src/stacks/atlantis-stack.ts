import * as cdk from 'aws-cdk-lib';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { SopsSecret } from 'cdk-sops-secrets';
import { Construct } from 'constructs';

export interface AtlantisStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  userPool: cognito.UserPool;
  userPoolClientIdentityProvider: cognito.UserPoolClientIdentityProvider;
}

export class AtlantisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtlantisStackProps) {
    super(scope, id, props);

    const domainName = 'atlantis.soloscripted.com';
    const domainZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'soloscripted.com',
    });
    const certificate = new certificatemanager.Certificate(this, 'Certificate', {
      domainName: domainName,
      validation: certificatemanager.CertificateValidation.fromDns(domainZone),
    });

    const cluster = new ecs.Cluster(this, 'AtlantisCluster', {
      clusterName: 'atlantis-cluster',
      vpc: props.vpc,
      enableFargateCapacityProviders: true,
    });

    const atlantisTaskRole = new iam.Role(this, 'AtlantisTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    });

    const sopsSecrets = new SopsSecret(this, 'SopsSecrets', {
      secretName: 'sops-secrets',
      sopsFilePath: 'sops.yaml',
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'AtlantisTaskDef', {
      cpu: 1024,
      memoryLimitMiB: 2048,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
      taskRole: atlantisTaskRole,
    });

    taskDefinition.addContainer('AtlantisContainer', {
      containerName: 'atlantis',
      image: ecs.ContainerImage.fromRegistry('ghcr.io/runatlantis/atlantis:v0.35.1'),
      portMappings: [{ containerPort: 4141 }],
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'atlantis',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        ATLANTIS_ALLOW_COMMANDS: 'plan,apply,approve_policies,unlock',
        ATLANTIS_ATLANTIS_URL: `https://${domainName}`,
        ATLANTIS_AUTODISCOVER_MODE: 'disabled',
        ATLANTIS_AUTOMERGE: 'true',
        ATLANTIS_DEFAULT_TF_DISTRIBUTION: 'terraform',
        ATLANTIS_DEFAULT_TF_VERSION: 'v0.12.31',
        ATLANTIS_DISABLE_AUTOPLAN_LABEL: 'no-autoplan',
        ATLANTIS_DISABLE_GLOBAL_APPLY_LOCK: 'true',
        ATLANTIS_EMOJI_REACTION: 'eyes',
        ATLANTIS_GH_ORG: 'SoloScripted',
        ATLANTIS_REPO_ALLOWLIST: 'github.com/SoloScripted/*',
        ATLANTIS_WRITE_GIT_CREDS: 'true',
      },
      secrets: {
        ATLANTIS_GH_APP_ID: ecs.Secret.fromSecretsManager(sopsSecrets, 'github-app-id'),
        ATLANTIS_GH_APP_KEY: ecs.Secret.fromSecretsManager(sopsSecrets, 'github-app-key'),
        ATLANTIS_GH_WEBHOOK_SECRET: ecs.Secret.fromSecretsManager(
          sopsSecrets,
          'github-webhook-secret',
        ),
        GITHUB_TOKEN: ecs.Secret.fromSecretsManager(sopsSecrets, 'github-token'),
      },
    });

    const atlantisSg = new ec2.SecurityGroup(this, 'AtlantisSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: 'Security group for Atlantis',
    });

    atlantisSg.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(4141),
      'Allow incoming traffic to Atlantis container',
    );

    const fargateService = new ecs.FargateService(this, 'AtlantisService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [atlantisSg],
      enableExecuteCommand: true,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
      ],
      minHealthyPercent: 100,
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true,
      crossZoneEnabled: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targetGroupName: 'atlantis-target-group',
      vpc: props.vpc,
      port: 4141,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    targetGroup.configureHealthCheck({
      enabled: true,
      path: '/healthz',
      interval: cdk.Duration.seconds(60),
      healthyThresholdCount: 3,
      unhealthyThresholdCount: 2,
      timeout: cdk.Duration.seconds(5),
    });

    targetGroup.addTarget(fargateService);

    const listener = alb.addListener('Listener', {
      protocol: elbv2.ApplicationProtocol.HTTPS,
      port: 443,
      certificates: [certificate],
      sslPolicy: elbv2.SslPolicy.RECOMMENDED,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    listener.addAction('EventsTargetGroupIPv4', {
      action: elbv2.ListenerAction.forward([targetGroup]),
      priority: 1,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/events']),
        elbv2.ListenerCondition.sourceIps([
          '192.30.252.0/22',
          '185.199.108.0/22',
          '140.82.112.0/20',
          '143.55.64.0/20',
        ]),
      ],
    });

    listener.addAction('EventsTargetGroupIPv6', {
      action: elbv2.ListenerAction.forward([targetGroup]),
      priority: 2,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/events']),
        elbv2.ListenerCondition.sourceIps(['2a0a:a440::/29', '2600:1f18::/32']),
      ],
    });

    listener.addAction('DenyEvents', {
      action: elbv2.ListenerAction.fixedResponse(403, {
        contentType: 'text/plain',
        messageBody: 'Forbidden',
      }),
      priority: 3,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/events'])],
    });

    new route53.ARecord(this, 'AliasRecord', {
      zone: domainZone,
      recordName: 'atlantis',
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
    });

    new cdk.CfnOutput(this, 'AtlantisUrl', {
      value: `https://${domainName}`,
      description: 'The URL for the Atlantis UI. Use this for your repository webhooks.',
    });
  }
}
