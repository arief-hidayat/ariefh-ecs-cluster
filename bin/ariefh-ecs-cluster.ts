#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AriefhEcsClusterStack } from '../lib/ariefh-ecs-cluster-stack';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Duration } from 'aws-cdk-lib';

const app = new cdk.App();
new AriefhEcsClusterStack(app, 'AriefhEcsClusterStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  vpcName: 'AriefhInfraStack/dev-vpc',
  svcConnect: {
    dnsNamespace: 'dev.ariefh.internal',
    proxyCpu: 256,
    proxyMemoryLimit: 64,
  },
  asg: {
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.M6A, ec2.InstanceSize.XLARGE),
    machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
    minCapacity: 2,
    maxCapacity: 5,
    desiredCapacity: 2,
    cooldown: Duration.minutes(5)
  }
});