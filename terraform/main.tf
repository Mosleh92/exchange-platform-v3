# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "exchange_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "exchange-vpc"
  }
}

# Database Subnet Group
resource "aws_db_subnet_group" "exchange_db_subnet_group" {
  name       = "exchange-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "Exchange DB subnet group"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "exchange_db" {
  identifier = "exchange-db"
  
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type         = "gp2"
  storage_encrypted    = true
  
  db_name  = "exchange_db"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.exchange_db_subnet_group.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "exchange-db-final-snapshot"
  
  tags = {
    Name = "Exchange Database"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "exchange_cache_subnet" {
  name       = "exchange-cache-subnet"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]
}

resource "aws_elasticache_replication_group" "exchange_redis" {
  replication_group_id         = "exchange-redis"
  description                  = "Redis cluster for Exchange system"
  
  node_type                    = "cache.t3.micro"
  port                         = 6379
  parameter_group_name         = "default.redis7"
  
  num_cache_clusters           = 2
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  
  subnet_group_name           = aws_elasticache_subnet_group.exchange_cache_subnet.name
  security_group_ids          = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  
  tags = {
    Name = "Exchange Redis"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "exchange_cluster" {
  name = "exchange-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "Exchange Cluster"
  }
}

# Application Load Balancer
resource "aws_lb" "exchange_alb" {
  name               = "exchange-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false

  tags = {
    Name = "Exchange ALB"
  }
}
