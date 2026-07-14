resource "aws_apigatewayv2_api" "library_of_leng" {
  name          = "library_of_leng_api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["http://localhost:5173"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

resource "aws_apigatewayv2_stage" "library_of_leng" {
  api_id      = aws_apigatewayv2_api.library_of_leng.id
  name        = "$default"
  auto_deploy = true
}

output "api_url" {
  value = aws_apigatewayv2_api.library_of_leng.api_endpoint
}