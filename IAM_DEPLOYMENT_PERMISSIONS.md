# IAM Permissions Required for Quiz Tuition Deployment

This document outlines the IAM permissions needed for a user to deploy the entire Quiz Tuition application based on `deployment.md`.

## Summary

The deployment user needs permissions for:

- **VPC & Networking** (VPC, Subnets, Route Tables, Internet Gateway, NAT Gateway, Security Groups)
- **EC2** (Instances, Elastic IPs, Key Pairs)
- **RDS** (PostgreSQL Database)
- **S3** (Bucket creation and configuration)
- **AWS Amplify** (Frontend deployment)
- **IAM** (Creating IAM user for application)
- **CloudWatch** (Log groups and optional monitoring)
- **Tagging** (For resource organization)

## Recommended Approach

**Option 1: Admin Access (Simplest - for initial deployment)**

- Attach `AdministratorAccess` policy to the deployment user
- ⚠️ **Warning**: Use only for deployment, then switch to least-privilege approach

**Option 2: Custom Policy (Recommended - least privilege)**

Create a custom IAM policy with the permissions below.

## Custom IAM Policy JSON

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VPCPermissions",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc",
        "ec2:CreateSubnet",
        "ec2:CreateInternetGateway",
        "ec2:AttachInternetGateway",
        "ec2:DetachInternetGateway",
        "ec2:DeleteInternetGateway",
        "ec2:CreateNatGateway",
        "ec2:DeleteNatGateway",
        "ec2:CreateRouteTable",
        "ec2:CreateRoute",
        "ec2:AssociateRouteTable",
        "ec2:DisassociateRouteTable",
        "ec2:ModifyVpcAttribute",
        "ec2:ModifySubnetAttribute",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeInternetGateways",
        "ec2:DescribeNatGateways",
        "ec2:DescribeRouteTables",
        "ec2:DescribeVpcAttribute",
        "ec2:DescribeSubnets",
        "ec2:DescribeAvailabilityZones",
        "ec2:AllocateAddress",
        "ec2:ReleaseAddress",
        "ec2:AssociateAddress",
        "ec2:DisassociateAddress",
        "ec2:DescribeAddresses"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SecurityGroupPermissions",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupEgress",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSecurityGroupRules"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EC2InstancePermissions",
      "Effect": "Allow",
      "Action": [
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeImages",
        "ec2:ModifyInstanceAttribute",
        "ec2:CreateKeyPair",
        "ec2:DeleteKeyPair",
        "ec2:DescribeKeyPairs",
        "ec2:ImportKeyPair"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ElasticIPPermissions",
      "Effect": "Allow",
      "Action": [
        "ec2:AllocateAddress",
        "ec2:ReleaseAddress",
        "ec2:AssociateAddress",
        "ec2:DisassociateAddress",
        "ec2:DescribeAddresses"
      ],
      "Resource": "*"
    },
    {
      "Sid": "RDSPermissions",
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance",
        "rds:ModifyDBInstance",
        "rds:DescribeDBInstances",
        "rds:DescribeDBEngineVersions",
        "rds:DescribeDBSubnetGroups",
        "rds:DescribeDBSnapshots",
        "rds:CreateDBSnapshot",
        "rds:RestoreDBInstanceFromDBSnapshot",
        "rds:AddTagsToResource",
        "rds:ListTagsForResource",
        "rds:CreateDBSubnetGroup",
        "rds:DeleteDBSubnetGroup",
        "rds:DescribeDBSubnetGroups"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3Permissions",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:PutBucketVersioning",
        "s3:PutBucketEncryption",
        "s3:PutBucketCors",
        "s3:PutBucketPolicy",
        "s3:GetBucketPolicy",
        "s3:GetBucketVersioning",
        "s3:GetBucketEncryption",
        "s3:GetBucketCors",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:ListAllMyBuckets",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion",
        "s3:ListBucketVersions",
        "s3:PutObjectAcl",
        "s3:GetObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::quiz-tuition-uploads-prod",
        "arn:aws:s3:::quiz-tuition-uploads-prod/*"
      ]
    },
    {
      "Sid": "AmplifyPermissions",
      "Effect": "Allow",
      "Action": [
        "amplify:CreateApp",
        "amplify:DeleteApp",
        "amplify:GetApp",
        "amplify:ListApps",
        "amplify:UpdateApp",
        "amplify:CreateBranch",
        "amplify:DeleteBranch",
        "amplify:GetBranch",
        "amplify:ListBranches",
        "amplify:UpdateBranch",
        "amplify:CreateDeployment",
        "amplify:GetDeployment",
        "amplify:ListDeployments",
        "amplify:StartDeployment",
        "amplify:StopDeployment",
        "amplify:UpdateApp",
        "amplify:TagResource",
        "amplify:UntagResource",
        "amplify:ListTagsForResource"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogsPermissions",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:DeleteLogGroup",
        "logs:DescribeLogGroups",
        "logs:PutRetentionPolicy",
        "logs:CreateLogStream",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:TagLogGroup",
        "logs:ListTagsLogGroup"
      ],
      "Resource": ["arn:aws:logs:ap-south-1:*:log-group:/quiz-tuition/*"]
    },
    {
      "Sid": "CloudWatchMetricsPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DeleteAlarms",
        "cloudwatch:TagResource"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMPermissions",
      "Effect": "Allow",
      "Action": [
        "iam:CreateUser",
        "iam:DeleteUser",
        "iam:GetUser",
        "iam:ListUsers",
        "iam:CreateAccessKey",
        "iam:DeleteAccessKey",
        "iam:ListAccessKeys",
        "iam:CreatePolicy",
        "iam:DeletePolicy",
        "iam:GetPolicy",
        "iam:GetPolicyVersion",
        "iam:ListPolicies",
        "iam:ListPolicyVersions",
        "iam:AttachUserPolicy",
        "iam:DetachUserPolicy",
        "iam:ListAttachedUserPolicies",
        "iam:ListUserPolicies",
        "iam:TagUser",
        "iam:TagPolicy",
        "iam:ListPolicyTags",
        "iam:ListUserTags"
      ],
      "Resource": [
        "arn:aws:iam::*:user/quiz-tuition-ec2-user",
        "arn:aws:iam::*:policy/quiz-tuition-s3-access",
        "arn:aws:iam::*:policy/quiz-tuition-*"
      ]
    },
    {
      "Sid": "TaggingPermissions",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateTags",
        "ec2:DeleteTags",
        "ec2:DescribeTags",
        "rds:AddTagsToResource",
        "rds:ListTagsForResource",
        "s3:PutBucketTagging",
        "s3:GetBucketTagging"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ReadOnlyPermissions",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "rds:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "iam:GetAccountSummary",
        "iam:ListAccountAliases",
        "cloudwatch:Describe*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step-by-Step: Creating the IAM User with Permissions

### 1. Create IAM User for Deployment

1. Navigate to **IAM Dashboard** → **Users**
2. Click **"Create user"**
3. **Username**: `quiz-tuition-deployment-user`
4. Click **"Next"**

### 2. Attach Permissions

**Option A: Attach Custom Policy (Recommended)**

1. Click **"Attach policies directly"**
2. Click **"Create policy"**
3. Select **"JSON"** tab
4. Paste the custom policy JSON above
5. Click **"Next"**
6. **Policy name**: `quiz-tuition-deployment-policy`
7. **Description**: `Full permissions for deploying Quiz Tuition application`
8. Click **"Create policy"**
9. Go back to user creation, refresh policies
10. Search for `quiz-tuition-deployment-policy` and select it
11. Click **"Next" → "Create user"**

**Option B: Attach AdministratorAccess (Quick Start)**

1. Select **"Attach policies directly"**
2. Search for `AdministratorAccess`
3. Select it
4. Click **"Next" → "Create user"**
5. ⚠️ **Note**: Switch to custom policy after deployment for security

### 3. Create Access Keys (Optional)

If deployment will be done via CLI/SDK:

1. Click on the created user
2. Go to **"Security credentials"** tab
3. Click **"Create access key"**
4. Select **"Command Line Interface (CLI)"**
5. Click **"Next" → **"Create access key"\*\*
6. **IMPORTANT**: Save Access Key ID and Secret Access Key securely

### 4. Grant Additional Permissions (If Needed)

If the user needs to:

- **Access GitHub via Amplify**: Grant Amplify permission to access GitHub repositories
- **Send email notifications**: Add SES permissions (if using SES later)
- **Access Secrets Manager**: Add secretsmanager permissions (if storing secrets there)

## Permissions Breakdown by Phase

### Phase 1: AWS Infrastructure Setup

- **VPC**: Create/Describe VPC, Subnets, Route Tables, Internet Gateway, NAT Gateway
- **Security Groups**: Create/Modify/Describe Security Groups
- **Elastic IPs**: Allocate/Associate Elastic IPs

### Phase 2: EC2 Server Setup

- **EC2**: Launch instances, manage key pairs, describe instances
- **Tagging**: Tag resources for organization

### Phase 3: Backend Configuration

- **IAM**: Create IAM user for application (quiz-tuition-ec2-user)
- **IAM Policy**: Create policy for S3 access

### Phase 4: Nginx & SSL Configuration

- No additional AWS permissions needed (done on EC2 instance)

### Phase 5: Frontend AWS Amplify Setup

- **Amplify**: Create app, create branch, create deployment, manage app

### Phase 6: DNS Configuration

- Done in Hostinger (not AWS), no IAM permissions needed

### Phase 7: Database & Application Verification

- **RDS**: Already covered in Phase 1 (DescribeDBInstances)

### Phase 8: Worker Verification

- No additional permissions needed (verification only)

### Phase 9: Monitoring Setup

- **CloudWatch Logs**: Create log groups, put retention policies
- **CloudWatch Metrics**: Put metrics, create alarms (optional)

### Phase 10: Post-Deployment Verification

- Read-only permissions (covered by Describe\* actions)

### Phase 11: Security & Optimization

- **Security Groups**: Modify rules (already covered)
- **IAM**: Review permissions (read-only, covered)

### Phase 12: Documentation & Handoff

- Read-only permissions (already covered)

## Security Best Practices

1. **Use Custom Policy**: Avoid AdministratorAccess when possible
2. **Time-Limited Access**: Consider using temporary credentials for deployment
3. **Least Privilege**: Only grant permissions needed for deployment
4. **Review Regularly**: Audit IAM permissions periodically
5. **Separate Users**: Use different users for deployment vs. operations
6. **Enable MFA**: Require MFA for IAM users with elevated permissions

## Testing Permissions

After creating the user and policy, test permissions:

```bash
# Configure AWS CLI with deployment user credentials
aws configure --profile quiz-tuition-deploy

# Test VPC permissions
aws ec2 describe-vpcs --profile quiz-tuition-deploy

# Test RDS permissions
aws rds describe-db-instances --profile quiz-tuition-deploy

# Test S3 permissions
aws s3 ls --profile quiz-tuition-deploy

# Test Amplify permissions
aws amplify list-apps --profile quiz-tuition-deploy

# Test IAM permissions (limited to specific resources)
aws iam list-users --profile quiz-tuition-deploy
```

## Troubleshooting

**Error: "Access Denied"**

1. Verify policy is attached to user
2. Check resource ARNs match exactly
3. Ensure region is correct (ap-south-1)
4. Verify policy JSON syntax is valid

**Error: "Insufficient Permissions"**

1. Check if action requires additional resource-level permissions
2. Some services require additional service-specific permissions
3. Check for service-linked roles that may be needed

## Post-Deployment

After successful deployment:

1. **Create Operational User**: Separate user with read-only + specific operational permissions
2. **Remove Deployment User Access**: Or restrict to read-only
3. **Document**: Keep track of who has what permissions
4. **Rotate Keys**: Regularly rotate access keys if using programmatic access

## Additional Notes

- **Region**: All permissions assume `ap-south-1` region (Mumbai)
- **Resource Names**: Policy uses specific resource names (quiz-tuition-\*)
- **S3 Bucket**: Policy is scoped to specific bucket (`quiz-tuition-uploads-prod`)
- **IAM User**: IAM permissions scoped to `quiz-tuition-ec2-user` and related policies
- **CloudWatch**: Log groups scoped to `/quiz-tuition/*` path

## Minimal Permissions Alternative

If you want even more restrictive permissions, you can:

1. Create resources manually in AWS Console (with admin access temporarily)
2. Grant deployment user only read/update permissions for existing resources
3. Remove create/delete permissions after initial setup

However, the policy above allows for complete automated deployment from scratch.

---

**Last Updated**: Based on deployment.md version
**Recommended Policy**: Use custom policy (Option 2) for production deployments
