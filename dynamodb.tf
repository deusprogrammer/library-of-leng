resource "aws_dynamodb_table" "shops" {
  name         = "shops"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "shopId"

  attribute {
    name = "shopId"
    type = "S"
  }

  attribute {
    name = "slug"
    type = "S"
  }

  global_secondary_index {
    name            = "slug"
    projection_type = "ALL"

    key_schema {
      attribute_name = "slug"
      key_type       = "HASH"
    }
  }
}

resource "aws_dynamodb_table" "carts" {
  name         = "carts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cartId"
  range_key    = "itemKey"

  attribute {
    name = "cartId"
    type = "S"
  }

  attribute {
    name = "itemKey"
    type = "S"
  }

  attribute {
    name = "shopId"
    type = "S"
  }

  attribute {
    name = "slug"
    type = "S"
  }

  global_secondary_index {
    name            = "cart-by-shop-and-slug"
    projection_type = "ALL"

    key_schema {
      attribute_name = "shopId"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "slug"
      key_type       = "RANGE"
    }
  }
}

resource "aws_dynamodb_table" "inventory" {
  name         = "inventory"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "shopId"
  range_key    = "inventoryId"

  attribute {
    name = "shopId"
    type = "S"
  }

  attribute {
    name = "inventoryId"
    type = "S"
  }

  attribute {
    name = "normalizedName"
    type = "S"
  }

  attribute {
    name = "browseCategory"
    type = "S"
  }

  attribute {
    name = "colorCategory"
    type = "S"
  }

  attribute {
    name = "rarity"
    type = "S"
  }

  attribute {
    name = "setCode"
    type = "S"
  }

  global_secondary_index {
    name            = "inventory-by-name"
    projection_type = "ALL"

    key_schema {
      attribute_name = "shopId"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "normalizedName"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "inventory-by-category"
    projection_type = "ALL"

    key_schema {
      attribute_name = "shopId"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "browseCategory"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "inventory-by-color"
    projection_type = "ALL"

    key_schema {
      attribute_name = "shopId"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "colorCategory"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "inventory-by-rarity"
    projection_type = "ALL"

    key_schema {
      attribute_name = "shopId"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "rarity"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "inventory-by-set"
    projection_type = "ALL"

    key_schema {
      attribute_name = "shopId"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "setCode"
      key_type       = "RANGE"
    }
  }
}