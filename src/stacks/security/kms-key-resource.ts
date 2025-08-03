import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface KmsKeyProps {
  readonly alias?: string;
  readonly description?: string;
  readonly enableKeyRotation?: boolean;
  readonly removalPolicy?: cdk.RemovalPolicy;
}

export class KmsKeyResource extends Construct {
  public readonly key: kms.Key;

  constructor(scope: Construct, id: string, props: KmsKeyProps = {}) {
    super(scope, id);

    this.key = new kms.Key(this, 'Default', {
      alias: props.alias,
      description: props.description,
      enableKeyRotation: props.enableKeyRotation ?? true,
      removalPolicy: props.removalPolicy ?? cdk.RemovalPolicy.RETAIN,
    });
  }
}
