variable "function_name" {
    type = string
}

variable "handler" {
    type = string
}

variable "runtime" {
    type = string
    default = "nodejs22.x"
}

variable "route_key" {
    type = string
}

variable "api_id" {
    type = string
}

variable "api_execution_arn" {
    type = string
}

variable "filename" {
    type = string
}

variable "source_code_hash" {
    type = string
}

variable "dynamodb_tables" {
    type    = map(object({
        name = string
        arn = string
        actions = list(string)
    }))
}