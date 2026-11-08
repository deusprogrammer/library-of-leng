variable "aws_region" {
  default = "us-east-1"
}

resource "aws_cognito_user_pool" "inventory_users" {
    name="library-of-leng"
    username_attributes = ["email"]
    auto_verified_attributes = ["email"]
    password_policy {
      minimum_length = 12
      require_lowercase = true
      require_uppercase = true
      require_symbols = true
      require_numbers = true
    }
}

resource "aws_cognito_user_pool_client" "inventory_client" {
    name = "library-of-leng-client"

    user_pool_id = aws_cognito_user_pool.inventory_users.id

    generate_secret = false
    
    allowed_oauth_flows_user_pool_client = true
    allowed_oauth_flows = ["code"]

    allowed_oauth_scopes = [
        "openid",
        "email",
        "profile"
    ]

    callback_urls = [
        "http://localhost:5173/auth/callback"
    ]

    logout_urls = [
        "https://localhost:5173/"
    ]

    supported_identity_providers = [
        "COGNITO"
    ]
}

resource "aws_cognito_user_pool_domain" "inventory" {
    domain = "library-of-leng"
    user_pool_id = aws_cognito_user_pool.inventory_users.id
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.inventory_users.id
  description  = "Application administrators"
}

resource "aws_cognito_user_group" "shop_owner" {
  name         = "shop_owner"
  user_pool_id = aws_cognito_user_pool.inventory_users.id
  description  = "Shop owner"
}

resource "aws_cognito_user_group" "employee" {
  name         = "employee"
  user_pool_id = aws_cognito_user_pool.inventory_users.id
  description  = "Employee"
}

output "cognito_login_url" {
  value = "https://${aws_cognito_user_pool_domain.inventory.domain}.auth.${var.aws_region}.amazoncognito.com/oauth2/authorize?response_type=code&client_id=${aws_cognito_user_pool_client.inventory_client.id}&redirect_uri=${urlencode("http://localhost:5173/auth/callback")}&scope=openid+email+profile"
}