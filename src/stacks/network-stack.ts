import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IpAddresses } from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'SoloScriptedVPC', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          cidrMask: 19,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 19,
          name: 'private-with-egress',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      natGateways: 1,
      maxAzs: 2,
    });

    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true,
    });

    const privateHostedZone = new route53.PrivateHostedZone(this, 'InternalHostedZone', {
      zoneName: 'soloscripted.internal',
      vpc: this.vpc,
    });

    Tags.of(this.vpc).add('Name', 'soloscripted-vpc');

    for (const subnet of this.vpc.publicSubnets) {
      Tags.of(subnet).add('Tier', 'public');
    }

    for (const subnet of this.vpc.privateSubnets) {
      Tags.of(subnet).add('Tier', 'private');
    }

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'The ID of the VPC',
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','),
      description: 'Comma-separated list of public subnet IDs',
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map((subnet) => subnet.subnetId).join(','),
      description: 'Comma-separated list of private subnet IDs',
    });

    new cdk.CfnOutput(this, 'PrivateHostedZoneId', {
      value: privateHostedZone.hostedZoneId,
      description: 'The ID of the private hosted zone',
    });

    new cdk.CfnOutput(this, 'PrivateHostedZoneName', {
      value: privateHostedZone.zoneName,
      description: 'The name of the private hosted zone',
    });
  }
}
