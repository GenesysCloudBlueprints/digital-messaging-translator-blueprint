
variable "prefix" {
  type        = string
  description = "A name that is to be used as the resource name prefix. Usually it's the project name."
}

variable "environment" {
  type        = string
  description = "Name of the environment, e.g., dev, test, stable, staging, uat, prod etc."
}

variable "flowId" {
  type        = string
  description = "Flow id to associate with widget"
}

variable "configId" {
  type        = string
  description = "Configuration id to associate with widget"
}

variable "configVer" {
  type        = string
  description = "Configuration version to associate with widget"
}