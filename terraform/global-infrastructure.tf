# Global Infrastructure Configuration
# Phase 3: Multi-Region Architecture & Global Deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Multi-region provider configuration
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap_southeast"
  region = "ap-southeast-1"
}

# Global variables
variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "exchange-platform-v3"
}

variable "regions" {
  description = "List of AWS regions for deployment"
  type = map(object({
    region      = string
    az_count    = number
    is_primary  = bool
  }))
  default = {
    us_east = {
      region     = "us-east-1"
      az_count   = 3
      is_primary = true
    }
    eu_west = {
      region     = "eu-west-1"
      az_count   = 3
      is_primary = false
    }
    ap_southeast = {
      region     = "ap-southeast-1"
      az_count   = 3
      is_primary = false
    }
  }
}

# Global infrastructure modules
module "global_networking" {
  source = "./modules/networking"
  
  for_each = var.regions
  
  region       = each.value.region
  az_count     = each.value.az_count
  is_primary   = each.value.is_primary
  project_name = var.project_name
  environment  = var.environment
  
  providers = {
    aws = aws.${each.key}
  }
}

module "global_database" {
  source = "./modules/database"
  
  for_each = var.regions
  
  region             = each.value.region
  is_primary         = each.value.is_primary
  vpc_id             = module.global_networking[each.key].vpc_id
  private_subnet_ids = module.global_networking[each.key].private_subnet_ids
  project_name       = var.project_name
  environment        = var.environment
  
  # Multi-region database configuration
  enable_global_cluster = true
  backup_retention     = 30
  deletion_protection  = true
  
  providers = {
    aws = aws.${each.key}
  }
}

module "global_kubernetes" {
  source = "./modules/kubernetes"
  
  for_each = var.regions
  
  region             = each.value.region
  vpc_id             = module.global_networking[each.key].vpc_id
  private_subnet_ids = module.global_networking[each.key].private_subnet_ids
  project_name       = var.project_name
  environment        = var.environment
  
  # EKS cluster configuration
  kubernetes_version = "1.28"
  node_groups = {
    general = {
      instance_types = ["t3.large", "t3.xlarge"]
      min_size      = 2
      max_size      = 10
      desired_size  = 3
    }
    compute_intensive = {
      instance_types = ["c5.2xlarge", "c5.4xlarge"]
      min_size      = 1
      max_size      = 5
      desired_size  = 2
    }
    memory_intensive = {
      instance_types = ["r5.xlarge", "r5.2xlarge"]
      min_size      = 1
      max_size      = 3
      desired_size  = 1
    }
  }
  
  providers = {
    aws = aws.${each.key}
  }
}

module "global_redis" {
  source = "./modules/redis"
  
  for_each = var.regions
  
  region             = each.value.region
  vpc_id             = module.global_networking[each.key].vpc_id
  private_subnet_ids = module.global_networking[each.key].private_subnet_ids
  project_name       = var.project_name
  environment        = var.environment
  
  # Redis cluster configuration
  node_type                = "cache.r6g.large"
  num_cache_clusters       = 3
  enable_global_replication = true
  automatic_failover       = true
  
  providers = {
    aws = aws.${each.key}
  }
}

module "load_balancer" {
  source = "./modules/load_balancer"
  
  for_each = var.regions
  
  region            = each.value.region
  vpc_id            = module.global_networking[each.key].vpc_id
  public_subnet_ids = module.global_networking[each.key].public_subnet_ids
  project_name      = var.project_name
  environment       = var.environment
  
  # Application Load Balancer configuration
  enable_waf        = true
  enable_shield     = true
  ssl_certificate   = module.ssl_certificates[each.key].certificate_arn
  
  providers = {
    aws = aws.${each.key}
  }
}

module "ssl_certificates" {
  source = "./modules/ssl"
  
  for_each = var.regions
  
  region       = each.value.region
  domain_name  = "${each.key}.exchange.com"
  project_name = var.project_name
  environment  = var.environment
  
  providers = {
    aws = aws.${each.key}
  }
}

module "cdn" {
  source = "./modules/cdn"
  
  # CloudFront is global, so we only need one instance
  count = 1
  
  origins = [
    for region_key, region in var.regions : {
      domain_name = module.load_balancer[region_key].dns_name
      origin_id   = "${region_key}-api"
      region      = region.region
    }
  ]
  
  project_name = var.project_name
  environment  = var.environment
}

module "monitoring" {
  source = "./modules/monitoring"
  
  for_each = var.regions
  
  region       = each.value.region
  project_name = var.project_name
  environment  = var.environment
  
  # Monitoring configuration
  enable_prometheus = true
  enable_grafana   = true
  enable_alerting  = true
  
  # Cross-region monitoring
  enable_global_dashboard = each.value.is_primary
  
  providers = {
    aws = aws.${each.key}
  }
}

module "secrets_management" {
  source = "./modules/secrets"
  
  for_each = var.regions
  
  region       = each.value.region
  project_name = var.project_name
  environment  = var.environment
  
  # AWS Secrets Manager configuration
  enable_cross_region_replication = true
  kms_key_id = module.kms[each.key].key_id
  
  providers = {
    aws = aws.${each.key}
  }
}

module "kms" {
  source = "./modules/kms"
  
  for_each = var.regions
  
  region       = each.value.region
  project_name = var.project_name
  environment  = var.environment
  
  # KMS key configuration
  enable_multi_region = true
  deletion_window     = 30
  
  providers = {
    aws = aws.${each.key}
  }
}

# Outputs
output "global_infrastructure" {
  description = "Global infrastructure information"
  value = {
    regions = {
      for region_key, region in var.regions : region_key => {
        region            = region.region
        vpc_id            = module.global_networking[region_key].vpc_id
        eks_cluster_name  = module.global_kubernetes[region_key].cluster_name
        rds_endpoint      = module.global_database[region_key].endpoint
        redis_endpoint    = module.global_redis[region_key].endpoint
        load_balancer_dns = module.load_balancer[region_key].dns_name
      }
    }
    cdn = {
      distribution_domain = module.cdn[0].distribution_domain
      distribution_id     = module.cdn[0].distribution_id
    }
    monitoring = {
      primary_grafana_url = module.monitoring["us_east"].grafana_url
    }
  }
}

# Data sources for existing resources
data "aws_availability_zones" "available" {
  for_each = var.regions
  
  state = "available"
  
  provider = aws.${each.key}
}

# Local values for resource naming
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "global-exchange-infrastructure"
  }
}