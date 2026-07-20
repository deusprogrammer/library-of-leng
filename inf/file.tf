resource "local_file" "frontend_env" {
  filename = "${path.module}/../src/ui/.env"

  content = <<EOF
VITE_LOL_API_URL=${aws_apigatewayv2_stage.library_of_leng.invoke_url}
EOF
}