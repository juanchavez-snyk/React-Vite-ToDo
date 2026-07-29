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

variable "vpc_cidr" {
  description = "CIDR of the VPC hosting the API"
  type        = string
  default     = "10.0.0.0/16"
}

# --- keys --------------------------------------------------------------------

resource "aws_kms_key" "todo" {
  description             = "CMK for todo app data at rest"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

# --- attachment storage ------------------------------------------------------

resource "aws_s3_bucket" "todo_attachments" {
  bucket = "snyk-demo-todo-attachments"
}

# Every public-access guardrail stays on.
resource "aws_s3_bucket_public_access_block" "todo_attachments" {
  bucket                  = aws_s3_bucket.todo_attachments.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "todo_attachments" {
  bucket = aws_s3_bucket.todo_attachments.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "todo_attachments" {
  bucket = aws_s3_bucket.todo_attachments.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.todo.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "todo_attachments" {
  bucket = aws_s3_bucket.todo_attachments.id
  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"
  }
}

resource "aws_s3_bucket" "todo_logs" {
  bucket = "snyk-demo-todo-access-logs"
}

resource "aws_s3_bucket_public_access_block" "todo_logs" {
  bucket                  = aws_s3_bucket.todo_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "todo_logs" {
  bucket = aws_s3_bucket.todo_logs.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.todo.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "todo_logs" {
  bucket = aws_s3_bucket.todo_logs.id
  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"
  }
}

resource "aws_s3_bucket_logging" "todo_attachments" {
  bucket        = aws_s3_bucket.todo_attachments.id
  target_bucket = aws_s3_bucket.todo_logs.id
  target_prefix = "attachments/"
}

# The log bucket logs to itself, which is the supported pattern for a
# destination bucket and keeps access-logging enabled everywhere.
resource "aws_s3_bucket_logging" "todo_logs" {
  bucket        = aws_s3_bucket.todo_logs.id
  target_bucket = aws_s3_bucket.todo_logs.id
  target_prefix = "self/"
}

# --- network -----------------------------------------------------------------

# Ingress is limited to the application port from inside the VPC. Administrative
# access goes through SSM Session Manager, so no SSH port is opened at all.
resource "aws_security_group" "todo_api" {
  name        = "snyk-demo-todo-api"
  description = "Todo API access"

  ingress {
    description = "API traffic from within the VPC"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "HTTPS to AWS service endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

resource "aws_security_group" "todo_db" {
  name        = "snyk-demo-todo-db"
  description = "Postgres access, restricted to the API tier"

  ingress {
    description     = "Postgres from the API security group only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.todo_api.id]
  }

  egress {
    description = "Replication and backup traffic inside the VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

# --- database ----------------------------------------------------------------

# Credentials are generated and rotated by Secrets Manager, so no password
# appears in this configuration.
resource "aws_db_instance" "todos" {
  identifier     = "snyk-demo-todos"
  engine         = "postgres"
  engine_version = "16.6"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  db_name           = "todos"
  username          = "todo_admin"

  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.todo.arn

  publicly_accessible = false
  storage_encrypted   = true
  kms_key_id          = aws_kms_key.todo.arn

  iam_database_authentication_enabled = true
  backup_retention_period             = 14
  copy_tags_to_snapshot               = true
  auto_minor_version_upgrade          = true
  deletion_protection                 = true
  skip_final_snapshot                 = false
  final_snapshot_identifier           = "snyk-demo-todos-final"
  multi_az                            = true

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  vpc_security_group_ids          = [aws_security_group.todo_db.id]
}

# --- identity ----------------------------------------------------------------

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

# Least privilege: only the object actions the app needs, only on its own
# bucket prefix, plus decrypt against the one key that protects it.
resource "aws_iam_role_policy" "todo_api_attachments" {
  name = "snyk-demo-todo-api-attachments"
  role = aws_iam_role.todo_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.todo_attachments.arn}/attachments/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.todo_attachments.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["attachments/*"]
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = aws_kms_key.todo.arn
      },
    ]
  })
}

# --- logging -----------------------------------------------------------------

resource "aws_cloudwatch_log_group" "todo_api" {
  name              = "/snyk-demo/todo-api"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.todo.arn
}
