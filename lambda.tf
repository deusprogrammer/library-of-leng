data "archive_file" "lambda_archive" {
  type        = "zip"
  source_dir  = "src"
  output_path = "build/lambda.zip"
}

module "create_shop" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "create_shop"
  route_key     = "POST /shops"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.createShop"

  dynamodb_tables = {
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:PutItem"
      ]
    }
  }
}

module "get_shop" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "get_shop"
  route_key     = "GET /shops/{identifier}"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.getShop"

  dynamodb_tables = {
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ]
    }
  }
}

module "get_shops" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "get_shops"
  route_key     = "GET /shops"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.getShops"

  dynamodb_tables = {
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:Scan"
      ]
    }
  }
}

module "add_inventory" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "add_inventory"
  route_key     = "POST /shops/{identifier}/inventory"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.addInventory"

  dynamodb_tables = {
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:Query"
      ]
    }
    INVENTORY_TABLE = {
      name = aws_dynamodb_table.inventory.name
      arn  = aws_dynamodb_table.inventory.arn
      actions = [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ]
    }
  }
}

module "add_batch_inventory" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "add_batch_inventory"
  route_key     = "POST /shops/{identifier}/inventory/batch"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.addBatchInventory"

  dynamodb_tables = {
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:Query"
      ]
    }
    INVENTORY_TABLE = {
      name = aws_dynamodb_table.inventory.name
      arn  = aws_dynamodb_table.inventory.arn
      actions = [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ]
    }
  }
}

module "get_inventory" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "get_inventory"
  route_key     = "GET /shops/{identifier}/inventory"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.getInventory"

  dynamodb_tables = {
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:Query"
      ]
    }
    INVENTORY_TABLE = {
      name = aws_dynamodb_table.inventory.name
      arn  = aws_dynamodb_table.inventory.arn
      actions = [
        "dynamodb:Query"
      ]
    }
  }
}

module "get_cart" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "get_cart"
  route_key     = "GET /shops/{identifier}/carts/{cartSlug}"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.getCart"

  dynamodb_tables = {
    CARTS_TABLE = {
      name = aws_dynamodb_table.carts.name
      arn  = aws_dynamodb_table.carts.arn
      actions = [
        "dynamodb:Query"
      ]
    }
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:Query"
      ]
    }
  }
}

module "add_to_cart" {
  source = "./modules/http-lambda"

  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn

  function_name = "add_to_cart"
  route_key     = "POST /shops/{identifier}/carts/{cartSlug}/items"

  filename         = data.archive_file.lambda_archive.output_path
  source_code_hash = data.archive_file.lambda_archive.output_base64sha256
  handler          = "index.addToCart"

  dynamodb_tables = {
    CARTS_TABLE = {
      name = aws_dynamodb_table.carts.name
      arn  = aws_dynamodb_table.carts.arn
      actions = [
        "dynamodb:Query"
      ]
    }
    SHOPS_TABLE = {
      name = aws_dynamodb_table.shops.name
      arn  = aws_dynamodb_table.shops.arn
      actions = [
        "dynamodb:Query"
      ]
    }
  }
}