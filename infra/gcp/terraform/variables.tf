variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "europe-west1"
}

variable "domain" {
  type = string
}

variable "service_name" {
  type    = string
  default = "gymflow-web-app"
}

variable "web_image" {
  type = string
}

variable "db_tier" {
  type    = string
  default = "db-custom-1-3840"
}

variable "db_password" {
  type      = string
  sensitive = true
}
