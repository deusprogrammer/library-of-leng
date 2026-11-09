resource "local_file" "frontend_env" {
  filename = "${path.module}/../src/ui/.env"

  content = <<EOF
VITE_LOL_API_URL=${aws_apigatewayv2_stage.library_of_leng.invoke_url}
VITE_COGNITO_DOMAIN=https://${aws_cognito_user_pool_domain.inventory.domain}.auth.${var.aws_region}.amazoncognito.com
VITE_COGNITO_CLIENT_ID=${aws_cognito_user_pool_client.inventory_client.id}
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
EOF
}