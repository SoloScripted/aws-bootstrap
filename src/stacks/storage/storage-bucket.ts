import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StorageBucketProps {
  readonly versioned: boolean;
  readonly bucketName?: string;
  readonly removalPolicy?: cdk.RemovalPolicy;
}

export class StorageBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageBucketProps = { versioned: false }) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'Default', {
      bucketName: props.bucketName,
      versioned: props.versioned,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.removalPolicy ?? cdk.RemovalPolicy.RETAIN,
      enforceSSL: true,
      lifecycleRules: props.versioned
        ? [
            {
              noncurrentVersionTransitions: [
                {
                  storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                  transitionAfter: cdk.Duration.days(30),
                },
              ],
              noncurrentVersionExpiration: cdk.Duration.days(90),
            },
          ]
        : undefined,
    });
  }
}
