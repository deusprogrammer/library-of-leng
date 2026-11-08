terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket       = "library-of-leng-tfstate-309903600513"
    key          = "library-of-leng/inf/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}