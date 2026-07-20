locals {
  pascal_name = replace(title(replace(var.function_name, "_", " ")), " ", "")
}

data "aws_iam_policy_document" "this" {
  dynamic "statement" {
    for_each = var.dynamodb_tables

    content {
      effect = "Allow"

      actions = statement.value.actions

      resources = [
        statement.value.arn,
        "${statement.value.arn}/index/*"
      ]
    }
  }
}

resource "aws_iam_role" "this" {
  name = "${var.function_name}_execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "lambda.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.this.arn
}

resource "aws_lambda_function" "this" {
  function_name    = var.function_name
  source_code_hash = var.source_code_hash
  filename         = var.filename
  role             = aws_iam_role.this.arn
  handler          = var.handler
  runtime          = var.runtime
  timeout          = 29

  environment {
    variables = {
      for key, table in var.dynamodb_tables :
      key => table.name
    }
  }
}

resource "aws_lambda_permission" "this" {
  statement_id  = "Allow${local.pascal_name}ApiInvoke"
  function_name = var.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.api_execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "this" {
  api_id                 = var.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.this.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "this" {
  api_id    = var.api_id
  route_key = var.route_key

  target = "integrations/${aws_apigatewayv2_integration.this.id}"
}

resource "aws_iam_policy" "this" {
  name   = "${var.function_name}-dynamodb-access"
  policy = data.aws_iam_policy_document.this.json
}