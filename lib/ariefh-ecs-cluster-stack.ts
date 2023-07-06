import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

interface Asg {
  instanceType: ec2.InstanceType
  machineImage: ec2.IMachineImage
  desiredCapacity: number
  minCapacity?: number
  maxCapacity?: number
  cooldown: Duration
}
interface EcsSvcConnect {
  dnsNamespace: string,
  proxyCpu: number,
  proxyMemoryLimit: number,
}
interface AppsOnEcsStackProps extends cdk.StackProps {
  vpcName: string
  svcConnect?: EcsSvcConnect
  asg: Asg
}

export class AriefhEcsClusterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppsOnEcsStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'dev-vpc', {vpcName: props.vpcName});
    const svcConnect = props.svcConnect
    // ECS cluster on EC2 with cluster ASG capacity provider
    const ecsCluster = svcConnect ? 
                        new ecs.Cluster(this, 'ecs-cluster', {vpc: vpc, containerInsights: true, defaultCloudMapNamespace: {name: svcConnect.dnsNamespace, type: servicediscovery.NamespaceType.HTTP, useForServiceConnect: true}}) :
                        new ecs.Cluster(this, 'ecs-cluster', {vpc: vpc, containerInsights: true});
    const ecsforEC2Role = iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role')
    const ecsRole = new iam.Role(this, 'ecs-role', {
      assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal('ec2.amazonaws.com')), managedPolicies: [ecsforEC2Role]
    });
    const asg = new autoscaling.AutoScalingGroup(this, 'ecs-asg', {
      instanceType: props.asg.instanceType,
      machineImage: props.asg.machineImage,
      desiredCapacity: props.asg.desiredCapacity,
      minCapacity: props.asg.minCapacity,
      maxCapacity: props.asg.maxCapacity,
      cooldown: props.asg.cooldown,
      role: ecsRole,
      vpc: vpc,
    });
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'asg-cp', { capacityProviderName: `${this.stackName}-sg`, autoScalingGroup: asg, enableManagedTerminationProtection: false });
    ecsCluster.addAsgCapacityProvider(capacityProvider);

    new cdk.CfnOutput(this, `VPC`, {
      value: props.vpcName,
      description: `VPC Name`,
    });
    new cdk.CfnOutput(this, `ecsCluster`, {
      value: ecsCluster.clusterName,
      description: `ECS Cluster Name`,
    });
    asg.connections.securityGroups.forEach( (sg, i) => {
      new cdk.CfnOutput(this, `ecsClusterSg-${i}`, {
        value: sg.securityGroupId,
        description: `SG Id ${i}`,
      });
    })
  }
}
