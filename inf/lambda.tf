locals {
  api_id            = aws_apigatewayv2_api.library_of_leng.id
  api_execution_arn = aws_apigatewayv2_api.library_of_leng.execution_arn
  filename          = data.archive_file.lambda_archive.output_path
  source_code_hash  = data.archive_file.lambda_archive.output_base64sha256

  endpoints = {
    create_shop = {
      handler   = "index.createShop"
      route_key = "POST /shops"

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

    get_shop = {
      handler   = "index.getShop"
      route_key = "GET /shops/{identifier}"

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

    get_shops = {
      handler   = "index.getShops"
      route_key = "GET /shops"

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

    add_inventory = {
      handler   = "index.addInventory"
      route_key = "POST /shops/{identifier}/inventory"

      dynamodb_tables = {
        SHOPS_TABLE = {
          name = aws_dynamodb_table.shops.name
          arn  = aws_dynamodb_table.shops.arn
          actions = [
            "dynamodb:GetItem",
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

    add_batch_inventory = {
      handler   = "index.addBatchInventory"
      route_key = "POST /shops/{identifier}/inventory/batch"

      dynamodb_tables = {
        SHOPS_TABLE = {
          name = aws_dynamodb_table.shops.name
          arn  = aws_dynamodb_table.shops.arn
          actions = [
            "dynamodb:GetItem",
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

    get_inventory = {
      handler   = "index.getInventory"
      route_key = "GET /shops/{identifier}/inventory"

      dynamodb_tables = {
        SHOPS_TABLE = {
          name = aws_dynamodb_table.shops.name
          arn  = aws_dynamodb_table.shops.arn
          actions = [
            "dynamodb:GetItem",
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

    get_inventory_item = {
      handler   = "index.getInventoryItem"
      route_key = "GET /shops/{identifier}/inventory/{inventoryId}"

      dynamodb_tables = {
        SHOPS_TABLE = {
          name = aws_dynamodb_table.shops.name
          arn  = aws_dynamodb_table.shops.arn
          actions = [
            "dynamodb:GetItem",
            "dynamodb:Query"
          ]
        }

        INVENTORY_TABLE = {
          name = aws_dynamodb_table.inventory.name
          arn  = aws_dynamodb_table.inventory.arn
          actions = [
            "dynamodb:GetItem",
          ]
        }
      }
    }

    get_cart = {
      handler   = "index.getCart"
      route_key = "GET /shops/{identifier}/carts/{cartSlug}"

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
            "dynamodb:GetItem",
            "dynamodb:Query"
          ]
        }
      }
    }

    add_to_cart = {
      handler   = "index.addToCart"
      route_key = "POST /shops/{identifier}/carts/{cartSlug}/items"

      dynamodb_tables = {
        CARTS_TABLE = {
          name = aws_dynamodb_table.carts.name
          arn  = aws_dynamodb_table.carts.arn
          actions = [
            "dynamodb:Query",
            "dynamodb:UpdateItem"
          ]
        }

        SHOPS_TABLE = {
          name = aws_dynamodb_table.shops.name
          arn  = aws_dynamodb_table.shops.arn
          actions = [
            "dynamodb:GetItem",
            "dynamodb:Query"
          ]
        }

        INVENTORY_TABLE = {
          name = aws_dynamodb_table.inventory.name
          arn  = aws_dynamodb_table.inventory.arn
          actions = [
            "dynamodb:GetItem"
          ]
        }
      }
    }

    create_cart = {
      handler   = "index.createCart"
      route_key = "POST /shops/{identifier}/carts"

      dynamodb_tables = {
        CARTS_TABLE = {
          name = aws_dynamodb_table.carts.name
          arn  = aws_dynamodb_table.carts.arn
          actions = [
            "dynamodb:Query",
            "dynamodb:PutItem"
          ]
        }

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
  }
}

data "archive_file" "lambda_archive" { 
    type = "zip" 
    source_dir = "${path.module}/../src/lambdas" 
    output_path = "${path.module}/../build/lambda.zip" 
}

module "lambdas" {
  source = "./modules/http-lambda"

  for_each = local.endpoints

  api_id            = local.api_id
  api_execution_arn = local.api_execution_arn

  filename         = local.filename
  source_code_hash = local.source_code_hash

  function_name = each.key
  handler       = each.value.handler
  route_key     = each.value.route_key

  dynamodb_tables = each.value.dynamodb_tables
}