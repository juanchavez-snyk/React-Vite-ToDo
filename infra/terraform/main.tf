# DEMO: intentionally insecure Terraform for `snyk iac test infra/terraform`.
# Do not apply this. It is scan material only.

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-1"
}

# DEMO VULN (Snyk IaC): S3 bucket is public, unencrypted, unversioned and has no logging.
resource "aws_s3_bucket" "todo_attachments" {
  bucket = "snyk-demo-todo-attachments"
}

resource "aws_s3_bucket_public_access_block" "todo_attachments" {
  bucket                  = aws_s3_bucket.todo_attachments.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_acl" "todo_attachments" {
  bucket = aws_s3_bucket.todo_attachments.id
  acl    = "public-read-write"
}

# DEMO VULN (Snyk IaC): security group exposes SSH and the database to the internet.
resource "aws_security_group" "todo_api" {
  name        = "snyk-demo-todo-api"
  description = "Todo API access"

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Postgres from anywhere"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# DEMO VULN (Snyk IaC): RDS instance is publicly accessible, unencrypted, has no
# backups, no deletion protection, and a hardcoded password.
resource "aws_db_instance" "todos" {
  identifier                = "snyk-demo-todos"
  engine                    = "postgres"
  engine_version            = "13.4"
  instance_class            = "db.t3.micro"
  allocated_storage         = 20
  db_name                   = "todos"
  username                  = "todo_admin"
  password                  = "S3cretP4ssw0rd"
  publicly_accessible       = true
  storage_encrypted         = false
  backup_retention_period   = 0
  skip_final_snapshot       = true
  deletion_protection       = false
  auto_minor_version_upgrade = false
  vpc_security_group_ids    = [aws_security_group.todo_api.id]
}

# DEMO VULN (Snyk IaC): IAM policy grants full administrative access on all resources.
resource "aws_iam_role" "todo_api" {
  name = "snyk-demo-todo-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "todo_api_admin" {
  name = "snyk-demo-todo-api-admin"
  role = aws_iam_role.todo_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "*"
      Resource = "*"
    }]
  })
}

# DEMO VULN (Snyk IaC): CloudWatch log group has no retention and no KMS encryption.
resource "aws_cloudwatch_log_group" "todo_api" {
  name = "/snyk-demo/todo-api"
}
